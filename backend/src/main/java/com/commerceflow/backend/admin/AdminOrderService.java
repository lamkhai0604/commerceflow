package com.commerceflow.backend.admin;

import com.commerceflow.backend.admin.AdminModels.AdminOrder;
import com.commerceflow.backend.admin.AdminModels.OrderStatus;
import com.commerceflow.backend.commerce.CommerceModels.Order;
import com.commerceflow.backend.commerce.OrderQueries;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Order administration (S5-D03, FR-16A, ADR-006). A status change is one conditional UPDATE on the order row, so two
 * concurrent changes cannot both succeed: the second waits for the first, re-reads the status and affects no row.
 * Cancellation restores stock in the same transaction, and only when that UPDATE changed exactly one row.
 */
@Service
public class AdminOrderService {
    private final JdbcClient jdbc;
    private final OrderQueries orders;
    private final AuditLog audit;

    public AdminOrderService(JdbcClient jdbc, OrderQueries orders, AuditLog audit) {
        this.jdbc = jdbc;
        this.orders = orders;
        this.audit = audit;
    }

    public List<Order> list(OrderStatus status, String search, int limit) {
        return orders.adminList(status == null ? null : status.name(), search, limit);
    }

    @Transactional(readOnly = true)
    public AdminOrder detail(UUID orderId) {
        Order order = orders.find(orderId).orElseThrow(AdminException.NotFound::new);
        return new AdminOrder(order, audit.history("ORDER", orderId));
    }

    @Transactional
    public AdminOrder changeStatus(UUID actor, UUID orderId, OrderStatus target, String reason) {
        String current = jdbc.sql("SELECT order_status FROM commerceflow.orders WHERE id = :id").param("id", orderId)
                .query(String.class).optional().orElseThrow(AdminException.NotFound::new);
        OrderStatus from = switch (target) {
            case SHIPPED, CANCELLED -> OrderStatus.CONFIRMED;
            case DELIVERED -> OrderStatus.SHIPPED;
            case CONFIRMED -> throw new AdminException.InvalidTransition();
        };
        boolean cancel = target == OrderStatus.CANCELLED;
        int changed = jdbc.sql("""
                UPDATE commerceflow.orders
                SET order_status = :to, payment_status = CASE WHEN :cancel THEN 'REFUNDED' ELSE payment_status END
                WHERE id = :id AND order_status = :from""")
                .param("to", target.name()).param("cancel", cancel).param("id", orderId).param("from", from.name()).update();
        if (changed != 1) throw new AdminException.InvalidTransition();
        if (cancel) restoreStock(orderId);

        var details = new LinkedHashMap<String, Object>();
        details.put("from", current);
        details.put("to", target.name());
        audit.record(actor, cancel ? "ORDER_CANCELLED" : "ORDER_" + target.name(), "ORDER", orderId, reason, details);
        return detail(orderId);
    }

    /** Locks the order's products in ID order (like checkout) and gives the ordered units back. */
    private void restoreStock(UUID orderId) {
        jdbc.sql("""
                SELECT id FROM commerceflow.products
                WHERE id IN (SELECT product_id FROM commerceflow.order_items WHERE order_id = :id) ORDER BY id FOR UPDATE""")
                .param("id", orderId).query(UUID.class).list();
        jdbc.sql("""
                UPDATE commerceflow.products p
                SET stock_quantity = p.stock_quantity + i.quantity, version = p.version + 1, updated_at = now()
                FROM commerceflow.order_items i WHERE i.order_id = :id AND i.product_id = p.id""")
                .param("id", orderId).update();
    }
}
