package com.commerceflow.backend.catalog;

import com.commerceflow.backend.catalog.CatalogModels.Category;
import com.commerceflow.backend.catalog.CatalogModels.Product;
import com.commerceflow.backend.catalog.CatalogModels.ProductPage;
import com.commerceflow.backend.catalog.CatalogModels.ProductQuery;
import com.commerceflow.backend.catalog.CatalogModels.Sort;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Web-layer contract of the public catalog; runs without Docker. Security is covered by the integration suite. */
@WebMvcTest(value = CatalogController.class, excludeAutoConfiguration = {
        org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration.class,
        org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration.class})
class CatalogControllerTest {
    static final UUID ID = UUID.fromString("aa6357c0-e6bc-5e13-86d9-d5326ecaf437");
    static final UUID CATEGORY = UUID.fromString("a97a7ff4-29e1-597a-a5fa-3430e170fdcb");
    static final Product MUG = new Product(ID, "Stoneware Mug", "stoneware-mug", "An everyday mug.", CATEGORY, "18.00", "USD",
            true, "/images/products/stoneware-mug", "White stoneware mug", List.of("Holds 350 ml"), null);

    @Autowired MockMvc mvc;
    @MockitoBean CatalogRepository catalog;

    @Test
    void listsProductsWithDefaultsAndTheDocumentedShape() throws Exception {
        when(catalog.products(any())).thenReturn(new ProductPage(List.of(MUG), 0, 20, 1));
        mvc.perform(get("/api/v1/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].slug").value("stoneware-mug"))
                .andExpect(jsonPath("$.items[0].price").value("18.00"))
                .andExpect(jsonPath("$.items[0].currency").value("USD"))
                .andExpect(jsonPath("$.items[0].imageUrl").value("/images/products/stoneware-mug"))
                .andExpect(jsonPath("$.items[0].details[0]").value("Holds 350 ml"))
                .andExpect(jsonPath("$.totalElements").value(1));
        var query = ArgumentCaptor.forClass(ProductQuery.class);
        verify(catalog).products(query.capture());
        assertThat(query.getValue()).isEqualTo(new ProductQuery(null, null, null, null, null, 0, 20, Sort.FEATURED));
    }

    @Test
    void passesValidatedFiltersToTheRepository() throws Exception {
        when(catalog.products(any())).thenReturn(new ProductPage(List.of(), 2, 9, 0));
        mvc.perform(get("/api/v1/products").param("q", "  mug  ").param("category", "kitchen-dining")
                        .param("minPrice", "10.00").param("maxPrice", "100.00").param("available", "true")
                        .param("page", "2").param("size", "9").param("sort", "price,desc"))
                .andExpect(status().isOk());
        var query = ArgumentCaptor.forClass(ProductQuery.class);
        verify(catalog).products(query.capture());
        assertThat(query.getValue()).isEqualTo(new ProductQuery("mug", "kitchen-dining", new BigDecimal("10.00"),
                new BigDecimal("100.00"), true, 2, 9, Sort.PRICE_DESC));
    }

    @ParameterizedTest
    @ValueSource(strings = {"page=-1", "page=abc", "size=0", "size=101", "sort=stock,asc", "minPrice=1", "maxPrice=1.5",
            "minPrice=50.00&maxPrice=10.00", "available=yes", "category=Kitchen Dining", "page=99999&size=100", "unknown=1"})
    void rejectsInvalidParametersWithASafeProblem(String query) throws Exception {
        mvc.perform(get("/api/v1/products?" + query))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(jsonPath("$.detail").value("Request body or parameters are invalid"));
        verify(catalog, never()).products(any());
    }

    @Test
    void rejectsOverlongSearchTerms() throws Exception {
        mvc.perform(get("/api/v1/products").param("q", "x".repeat(121))).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/products").param("q", "x".repeat(120)))
                .andExpect(status().isOk());
    }

    @Test
    void findsProductsBySlugOrId() throws Exception {
        when(catalog.productBySlug("stoneware-mug")).thenReturn(Optional.of(MUG));
        when(catalog.product(ID)).thenReturn(Optional.of(MUG));
        mvc.perform(get("/api/v1/products/stoneware-mug")).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(ID.toString()));
        mvc.perform(get("/api/v1/products/" + ID)).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Stoneware Mug"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"missing-product", "Not_A_Slug", "00000000-0000-0000-0000-000000000000"})
    void unknownOrMalformedProductsAreNotFound(String key) throws Exception {
        when(catalog.productBySlug(any())).thenReturn(Optional.empty());
        when(catalog.product(any())).thenReturn(Optional.empty());
        mvc.perform(get("/api/v1/products/" + key))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"))
                .andExpect(jsonPath("$.detail").value("The requested resource is unavailable"));
    }

    @Test
    void listsCategoriesWithCounts() throws Exception {
        when(catalog.categories()).thenReturn(List.of(new Category(CATEGORY, "Kitchen & Dining", "kitchen-dining", 5)));
        mvc.perform(get("/api/v1/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Kitchen & Dining"))
                .andExpect(jsonPath("$[0].productCount").value(5));
    }

    @Test
    void likeEscapingTreatsWildcardsLiterally() {
        assertThat(CatalogRepository.escapeLike("50%_off\\")).isEqualTo("50\\%\\_off\\\\");
    }
}
