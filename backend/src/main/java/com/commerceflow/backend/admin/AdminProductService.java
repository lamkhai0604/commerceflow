package com.commerceflow.backend.admin;

import com.commerceflow.backend.admin.AdminModels.AdminProduct;
import com.commerceflow.backend.admin.AdminModels.InventoryRequest;
import com.commerceflow.backend.admin.AdminModels.ProductPatchRequest;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Product and stock administration (S5-D01). Every change locks the product row first, the same row checkout locks,
 * so a stock edit and a purchase are applied one after the other and neither update is lost (REV-11). The stock
 * edit sets an absolute value; with `expectedStockQuantity` it is rejected if sales changed the stock since it was read.
 */
@Service
public class AdminProductService {
    private static final String SELECT = """
            SELECT p.id, p.name, p.slug, p.description, p.category_id, c.name AS category_name, p.price, p.stock_quantity,
                   p.active, p.image_path
            FROM commerceflow.products p JOIN commerceflow.categories c ON c.id = p.category_id""";

    private final JdbcClient jdbc;
    private final AuditLog audit;

    public AdminProductService(JdbcClient jdbc, AuditLog audit) {
        this.jdbc = jdbc;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<AdminProduct> list(String search, int limit) {
        var sql = SELECT + (search == null ? "" : " WHERE p.name ILIKE :q ESCAPE '\\'") + " ORDER BY p.display_order, p.id LIMIT :limit";
        var statement = jdbc.sql(sql).param("limit", limit);
        if (search != null) statement = statement.param("q", "%" + search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%");
        return statement.query(this::map).list();
    }

    @Transactional
    public AdminProduct patch(UUID actor, UUID productId, ProductPatchRequest request) {
        if (request.empty()) throw new AdminException.InvalidRequest();
        var before = jdbc.sql("SELECT name, description, price, active FROM commerceflow.products WHERE id = :id FOR UPDATE")
                .param("id", productId)
                .query((rs, row) -> new Object[] {rs.getString(1), rs.getString(2), rs.getBigDecimal(3), rs.getBoolean(4)})
                .optional().orElseThrow(AdminException.NotFound::new);
        var changes = new LinkedHashMap<String, Object>();
        if (request.name() != null && !request.name().equals(before[0])) changes.put("name", Map.of("from", before[0], "to", request.name()));
        if (request.description() != null && !request.description().equals(before[1])) changes.put("description", "changed");
        if (request.price() != null && request.price().compareTo((BigDecimal) before[2]) != 0) {
            changes.put("price", Map.of("from", ((BigDecimal) before[2]).toPlainString(), "to", request.price().setScale(2).toPlainString()));
        }
        if (request.active() != null && request.active() != (Boolean) before[3]) changes.put("active", Map.of("from", before[3], "to", request.active()));
        if (!changes.isEmpty()) {
            jdbc.sql("""
                    UPDATE commerceflow.products
                    SET name = COALESCE(:name, name), description = COALESCE(:description, description),
                        price = COALESCE(:price, price), active = COALESCE(:active, active), version = version + 1, updated_at = now()
                    WHERE id = :id""")
                    .param("name", request.name(), java.sql.Types.VARCHAR).param("description", request.description(), java.sql.Types.VARCHAR)
                    .param("price", request.price(), java.sql.Types.NUMERIC).param("active", request.active(), java.sql.Types.BOOLEAN)
                    .param("id", productId).update();
            audit.record(actor, "PRODUCT_UPDATED", "PRODUCT", productId, null, changes);
        }
        return get(productId);
    }

    @Transactional
    public AdminProduct setStock(UUID actor, UUID productId, InventoryRequest request) {
        int current = jdbc.sql("SELECT stock_quantity FROM commerceflow.products WHERE id = :id FOR UPDATE").param("id", productId)
                .query(Integer.class).optional().orElseThrow(AdminException.NotFound::new);
        if (request.expectedStockQuantity() != null && request.expectedStockQuantity() != current) throw new AdminException.StockChanged();
        jdbc.sql("UPDATE commerceflow.products SET stock_quantity = :stock, version = version + 1, updated_at = now() WHERE id = :id")
                .param("stock", request.stockQuantity()).param("id", productId).update();
        var details = new LinkedHashMap<String, Object>();
        details.put("from", current);
        details.put("to", request.stockQuantity());
        audit.record(actor, "STOCK_SET", "PRODUCT", productId, null, details);
        return get(productId);
    }

    private AdminProduct get(UUID id) {
        return jdbc.sql(SELECT + " WHERE p.id = :id").param("id", id).query(this::map).single();
    }

    private AdminProduct map(java.sql.ResultSet rs, int row) throws java.sql.SQLException {
        return new AdminProduct(rs.getObject("id", UUID.class), rs.getString("name"), rs.getString("slug"), rs.getString("description"),
                rs.getObject("category_id", UUID.class), rs.getString("category_name"),
                rs.getBigDecimal("price").setScale(2).toPlainString(), "USD", rs.getInt("stock_quantity"), rs.getBoolean("active"),
                rs.getString("image_path"));
    }
}
