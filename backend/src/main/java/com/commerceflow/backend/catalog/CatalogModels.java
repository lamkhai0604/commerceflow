package com.commerceflow.backend.catalog;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** Public catalog representations (OpenAPI v1.2 catalog, CR-S3-01). Money is a two-decimal USD string. */
public final class CatalogModels {
    private CatalogModels() {}

    public record Category(UUID id, String name, String slug, int productCount) {}

    /** Products with at most this many units left report `stockLeft` (S5-D04). */
    public static final int LOW_STOCK_THRESHOLD = 5;

    public record Product(UUID id, String name, String slug, String description, UUID categoryId, String price,
            String currency, boolean available, String imageUrl, String imageAlt, List<String> details,
            @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL) Integer stockLeft) {}

    public record ProductPage(List<Product> items, int page, int size, long totalElements) {}

    public enum Sort { FEATURED, NAME_ASC, NAME_DESC, PRICE_ASC, PRICE_DESC }

    /** A validated `GET /products` query. Null filters are not applied. */
    public record ProductQuery(String q, String category, BigDecimal minPrice, BigDecimal maxPrice, Boolean available,
            int page, int size, Sort sort) {}

    static String money(BigDecimal value) {
        return value.setScale(2, java.math.RoundingMode.UNNECESSARY).toPlainString();
    }
}
