package com.commerceflow.backend.catalog;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

/** Catalog against real PostgreSQL with Flyway V1–V6. Requires Docker; CI fails if this suite is skipped. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class CatalogIntegrationTest {
    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17");

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired TestRestTemplate http;
    @Autowired ObjectMapper mapper;
    @Autowired JdbcTemplate jdbc;

    JsonNode get(String path, HttpStatus expected) throws Exception {
        var response = http.getForEntity(path, String.class);
        assertThat(response.getStatusCode()).as(path).isEqualTo(expected);
        return mapper.readTree(response.getBody());
    }

    List<String> slugs(JsonNode page) {
        var result = new ArrayList<String>();
        page.get("items").forEach(item -> result.add(item.get("slug").asText()));
        return result;
    }

    @Test
    void seedProvidesSixCategoriesAndTwentyOneProductsAnonymously() throws Exception {
        var categories = get("/api/v1/categories", HttpStatus.OK);
        assertThat(categories).hasSize(6);
        assertThat(categories.get(0).get("slug").asText()).isEqualTo("living");
        int total = 0;
        for (var category : categories) total += category.get("productCount").asInt();
        assertThat(total).isEqualTo(21);
        var page = get("/api/v1/products?size=9", HttpStatus.OK);
        assertThat(page.get("totalElements").asLong()).isEqualTo(21);
        assertThat(page.get("items")).hasSize(9);
        assertThat(slugs(page).get(0)).isEqualTo("velvet-sofa-forest");
        var first = page.get("items").get(0);
        assertThat(first.get("price").asText()).isEqualTo("1290.00");
        assertThat(first.get("imageUrl").asText()).isEqualTo("/images/products/velvet-sofa-forest");
        assertThat(first.get("details")).hasSize(3);
    }

    @Test
    void searchMatchesNameDescriptionAndCategoryCaseInsensitivelyAndTreatsWildcardsLiterally() throws Exception {
        assertThat(slugs(get("/api/v1/products?q=VASE&size=50", HttpStatus.OK)))
                .contains("stoneware-vase-cream", "concrete-bottle-vases-set-of-3");
        assertThat(slugs(get("/api/v1/products?q=bath&size=50", HttpStatus.OK))).contains("freestanding-soaking-tub");
        assertThat(get("/api/v1/products?q=%25", HttpStatus.OK).get("totalElements").asLong()).isZero();
    }

    @Test
    void filtersCombineAndSortingIsStable() throws Exception {
        var living = get("/api/v1/products?category=living&minPrice=500.00&available=true&size=50", HttpStatus.OK);
        assertThat(slugs(living)).isNotEmpty().doesNotContain("compact-sofa-rust", "shell-side-chair");
        assertThat(slugs(get("/api/v1/products?available=false&size=50", HttpStatus.OK)))
                .containsExactlyInAnyOrder("compact-sofa-rust", "oak-step-stool");
        var cheapest = get("/api/v1/products?sort=price,asc&size=3", HttpStatus.OK);
        assertThat(slugs(cheapest)).containsExactly("stoneware-mug", "striped-cushion-cover", "speckled-cups-set-of-4");
        var bounded = get("/api/v1/products?minPrice=18.00&maxPrice=18.00", HttpStatus.OK);
        assertThat(slugs(bounded)).containsExactly("stoneware-mug");
        assertThat(get("/api/v1/products?page=3&size=9", HttpStatus.OK).get("items")).isEmpty();
    }

    @Test
    void productLookupBySlugOrIdHidesInactiveProducts() throws Exception {
        var vase = get("/api/v1/products/stoneware-vase-cream", HttpStatus.OK);
        var byId = get("/api/v1/products/" + vase.get("id").asText(), HttpStatus.OK);
        assertThat(byId.get("slug").asText()).isEqualTo("stoneware-vase-cream");
        assertThat(get("/api/v1/products/no-such-product", HttpStatus.NOT_FOUND).get("code").asText()).isEqualTo("RESOURCE_NOT_FOUND");

        jdbc.update("UPDATE commerceflow.products SET active = false WHERE slug = 'stoneware-mug'");
        try {
            get("/api/v1/products/stoneware-mug", HttpStatus.NOT_FOUND);
            assertThat(slugs(get("/api/v1/products?size=50", HttpStatus.OK))).doesNotContain("stoneware-mug");
        } finally {
            jdbc.update("UPDATE commerceflow.products SET active = true WHERE slug = 'stoneware-mug'");
        }
    }

    @Test
    void catalogWritesAreNotPublic() throws Exception {
        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        var response = http.exchange("/api/v1/products", HttpMethod.POST, new HttpEntity<>("{}", headers), String.class);
        assertThat(response.getStatusCode().is4xxClientError()).isTrue();
        assertThat(response.getStatusCode()).isNotEqualTo(HttpStatus.OK);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM commerceflow.products", Long.class)).isEqualTo(21);
    }

    @Test
    void databaseRejectsInvalidCatalogData() {
        var category = jdbc.queryForObject("SELECT id FROM commerceflow.categories WHERE slug = 'decor'", java.util.UUID.class);
        org.junit.jupiter.api.Assertions.assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () ->
                jdbc.update("""
                        INSERT INTO commerceflow.products (id, category_id, name, slug, price, image_path, image_alt)
                        VALUES (gen_random_uuid(), ?, 'Bad', 'bad-price', -1.00, '/images/products/bad', 'x')""", category));
        org.junit.jupiter.api.Assertions.assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () ->
                jdbc.update("""
                        INSERT INTO commerceflow.products (id, category_id, name, slug, price, image_path, image_alt)
                        VALUES (gen_random_uuid(), ?, 'Bad', 'bad-image', 1.00, 'https://example.com/x.jpg', 'x')""", category));
    }
}
