package com.commerceflow.backend.catalog;

import com.commerceflow.backend.catalog.CatalogModels.Category;
import com.commerceflow.backend.catalog.CatalogModels.Product;
import com.commerceflow.backend.catalog.CatalogModels.ProductPage;
import com.commerceflow.backend.catalog.CatalogModels.ProductQuery;
import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

/**
 * Read-only catalog queries. Plain SQL through JdbcClient keeps the dynamic filters explicit and avoids mapping
 * the TEXT[] column through JPA; all values are bound parameters, and ORDER BY comes from a fixed allowlist.
 */
@Repository
@Transactional(readOnly = true)
public class CatalogRepository {
    private static final String PRODUCT_COLUMNS = """
            p.id, p.name, p.slug, p.description, p.category_id, p.price, p.stock_quantity,
            p.image_path, p.image_alt, p.details""";

    private static final Map<CatalogModels.Sort, String> ORDER = Map.of(
            CatalogModels.Sort.FEATURED, "p.display_order, p.id",
            CatalogModels.Sort.NAME_ASC, "lower(p.name), p.id",
            CatalogModels.Sort.NAME_DESC, "lower(p.name) DESC, p.id",
            CatalogModels.Sort.PRICE_ASC, "p.price, p.display_order, p.id",
            CatalogModels.Sort.PRICE_DESC, "p.price DESC, p.display_order, p.id");

    private final JdbcClient jdbc;

    public CatalogRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<Category> categories() {
        return jdbc.sql("""
                SELECT c.id, c.name, c.slug, count(p.id) AS product_count
                FROM commerceflow.categories c
                LEFT JOIN commerceflow.products p ON p.category_id = c.id AND p.active
                GROUP BY c.id, c.name, c.slug, c.display_order
                ORDER BY c.display_order, c.name""")
                .query((rs, row) -> new Category(rs.getObject("id", UUID.class), rs.getString("name"),
                        rs.getString("slug"), rs.getInt("product_count")))
                .list();
    }

    public ProductPage products(ProductQuery query) {
        var where = new StringBuilder(" WHERE p.active");
        var params = new HashMap<String, Object>();
        if (query.q() != null) {
            where.append(" AND (p.name ILIKE :q ESCAPE '\\' OR p.description ILIKE :q ESCAPE '\\' OR c.name ILIKE :q ESCAPE '\\')");
            params.put("q", "%" + escapeLike(query.q()) + "%");
        }
        if (query.category() != null) { where.append(" AND c.slug = :category"); params.put("category", query.category()); }
        if (query.minPrice() != null) { where.append(" AND p.price >= :minPrice"); params.put("minPrice", query.minPrice()); }
        if (query.maxPrice() != null) { where.append(" AND p.price <= :maxPrice"); params.put("maxPrice", query.maxPrice()); }
        if (Boolean.TRUE.equals(query.available())) where.append(" AND p.stock_quantity > 0");
        if (Boolean.FALSE.equals(query.available())) where.append(" AND p.stock_quantity = 0");
        String from = " FROM commerceflow.products p JOIN commerceflow.categories c ON c.id = p.category_id" + where;

        long total = jdbc.sql("SELECT count(*)" + from).params(params).query(Long.class).single();
        params.put("limit", query.size());
        params.put("offset", (long) query.page() * query.size());
        List<Product> items = jdbc.sql("SELECT " + PRODUCT_COLUMNS + from
                        + " ORDER BY " + ORDER.get(query.sort()) + " LIMIT :limit OFFSET :offset")
                .params(params).query(this::mapProduct).list();
        return new ProductPage(items, query.page(), query.size(), total);
    }

    public Optional<Product> product(UUID id) {
        return jdbc.sql("SELECT " + PRODUCT_COLUMNS + " FROM commerceflow.products p WHERE p.active AND p.id = :id")
                .param("id", id).query(this::mapProduct).optional();
    }

    public Optional<Product> productBySlug(String slug) {
        return jdbc.sql("SELECT " + PRODUCT_COLUMNS + " FROM commerceflow.products p WHERE p.active AND p.slug = :slug")
                .param("slug", slug).query(this::mapProduct).optional();
    }

    private Product mapProduct(ResultSet rs, int row) throws SQLException {
        return new Product(rs.getObject("id", UUID.class), rs.getString("name"), rs.getString("slug"),
                rs.getString("description"), rs.getObject("category_id", UUID.class),
                CatalogModels.money(rs.getBigDecimal("price")), "USD", rs.getInt("stock_quantity") > 0,
                rs.getString("image_path"), rs.getString("image_alt"), textArray(rs.getArray("details")));
    }

    private static List<String> textArray(Array array) throws SQLException {
        if (array == null) return List.of();
        try {
            return List.copyOf(new ArrayList<>(List.of((String[]) array.getArray())));
        } finally {
            array.free();
        }
    }

    /** Treats %, _ and \ in the search term as literal characters. */
    static String escapeLike(String term) {
        return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
