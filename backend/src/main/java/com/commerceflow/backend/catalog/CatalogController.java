package com.commerceflow.backend.catalog;

import com.commerceflow.backend.catalog.CatalogModels.Category;
import com.commerceflow.backend.catalog.CatalogModels.Product;
import com.commerceflow.backend.catalog.CatalogModels.ProductPage;
import com.commerceflow.backend.catalog.CatalogModels.ProductQuery;
import com.commerceflow.backend.catalog.CatalogModels.Sort;
import com.commerceflow.backend.error.ApiProblemFactory;
import com.commerceflow.backend.error.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public catalog (FR-06 to FR-08, OpenAPI v1.2 catalog). Parameters are read as strings and validated here so that
 * every malformed value yields the documented 400 INVALID_REQUEST problem instead of a framework error.
 */
@RestController
@RequestMapping("/api/v1")
public class CatalogController {
    static final int DEFAULT_SIZE = 20;
    static final int MAX_SIZE = 100;
    static final int MAX_QUERY_LENGTH = 120;
    private static final Pattern MONEY = Pattern.compile("^[0-9]{1,10}\\.[0-9]{2}$");
    private static final Pattern SLUG = Pattern.compile("^[a-z0-9]+(-[a-z0-9]+)*$");
    private static final Pattern NUMBER = Pattern.compile("^[0-9]{1,9}$");
    private static final Map<String, Sort> SORTS = Map.of(
            "name,asc", Sort.NAME_ASC, "name,desc", Sort.NAME_DESC, "price,asc", Sort.PRICE_ASC, "price,desc", Sort.PRICE_DESC);

    private final CatalogRepository catalog;

    public CatalogController(CatalogRepository catalog) {
        this.catalog = catalog;
    }

    @GetMapping("/categories")
    public List<Category> categories() {
        return catalog.categories();
    }

    @GetMapping("/products")
    public ProductPage products(@RequestParam Map<String, String> params) {
        return catalog.products(parse(params));
    }

    @GetMapping("/products/{productIdOrSlug}")
    public Product product(@PathVariable String productIdOrSlug) {
        var found = isUuid(productIdOrSlug) ? catalog.product(UUID.fromString(productIdOrSlug))
                : SLUG.matcher(productIdOrSlug).matches() && productIdOrSlug.length() <= 200
                        ? catalog.productBySlug(productIdOrSlug) : java.util.Optional.<Product>empty();
        return found.orElseThrow(ProductNotFoundException::new);
    }

    static ProductQuery parse(Map<String, String> params) {
        var known = java.util.Set.of("q", "category", "minPrice", "maxPrice", "available", "page", "size", "sort");
        if (!known.containsAll(params.keySet())) throw new InvalidQueryException();
        String q = blankToNull(params.get("q"));
        if (q != null && q.codePointCount(0, q.length()) > MAX_QUERY_LENGTH) throw new InvalidQueryException();
        String category = blankToNull(params.get("category"));
        if (category != null && (!SLUG.matcher(category).matches() || category.length() > 100)) throw new InvalidQueryException();
        BigDecimal min = money(params.get("minPrice")), max = money(params.get("maxPrice"));
        if (min != null && max != null && min.compareTo(max) > 0) throw new InvalidQueryException();
        Boolean available = switch (params.getOrDefault("available", "")) {
            case "" -> null;
            case "true" -> true;
            case "false" -> false;
            default -> throw new InvalidQueryException();
        };
        int page = integer(params.get("page"), 0);
        int size = integer(params.get("size"), DEFAULT_SIZE);
        if (size < 1 || size > MAX_SIZE) throw new InvalidQueryException();
        // Bound the offset so a hostile page number cannot request an absurd scan.
        if ((long) page * size > 100_000) throw new InvalidQueryException();
        String sortValue = params.get("sort");
        Sort sort = sortValue == null || sortValue.isEmpty() ? Sort.FEATURED : SORTS.get(sortValue);
        if (sort == null) throw new InvalidQueryException();
        return new ProductQuery(q, category, min, max, available, page, size, sort);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }

    private static BigDecimal money(String value) {
        if (value == null || value.isEmpty()) return null;
        if (!MONEY.matcher(value).matches()) throw new InvalidQueryException();
        return new BigDecimal(value);
    }

    private static int integer(String value, int fallback) {
        if (value == null || value.isEmpty()) return fallback;
        if (!NUMBER.matcher(value).matches()) throw new InvalidQueryException();
        return Integer.parseInt(value);
    }

    private static boolean isUuid(String value) {
        return value.length() == 36 && value.matches("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");
    }

    static final class InvalidQueryException extends RuntimeException {
        InvalidQueryException() { super(null, null, false, false); }
    }

    static final class ProductNotFoundException extends RuntimeException {
        ProductNotFoundException() { super(null, null, false, false); }
    }

    @ExceptionHandler(InvalidQueryException.class)
    ResponseEntity<ProblemDetail> invalid(HttpServletRequest request) {
        return ApiProblemFactory.response(ErrorCode.INVALID_REQUEST, request);
    }

    @ExceptionHandler(ProductNotFoundException.class)
    ResponseEntity<ProblemDetail> notFound(HttpServletRequest request) {
        return ApiProblemFactory.response(ErrorCode.RESOURCE_NOT_FOUND, request);
    }
}
