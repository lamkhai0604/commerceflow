package com.commerceflow.backend.commerce;

import com.commerceflow.backend.commerce.CommerceModels.Order;
import com.commerceflow.backend.commerce.CommerceModels.OrderAddress;
import com.commerceflow.backend.commerce.CommerceModels.OrderItem;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

/** Read side of orders. Members only ever see their own orders; guests look orders up by number and email. */
@Repository
@Transactional(readOnly = true)
public class OrderQueries {
    private static final String ORDER_COLUMNS = """
            o.id, o.order_number, o.order_status, o.payment_status, o.delivery_method, o.contact_email,
            o.subtotal_amount, o.shipping_amount, o.total_amount, o.created_at, o.user_id,
            a.recipient_name, a.address_line1, a.address_line2, a.city, a.state, a.postal_code, a.country_code""";
    private static final String FROM = " FROM commerceflow.orders o JOIN commerceflow.order_addresses a ON a.order_id = o.id";

    private final JdbcClient jdbc;

    public OrderQueries(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<Order> forUser(UUID userId) {
        return jdbc.sql("SELECT " + ORDER_COLUMNS + FROM + " WHERE o.user_id = :user ORDER BY o.created_at DESC, o.id LIMIT 100")
                .param("user", userId).query(this::order).list();
    }

    public Optional<Order> forUser(UUID userId, UUID orderId) {
        return jdbc.sql("SELECT " + ORDER_COLUMNS + FROM + " WHERE o.user_id = :user AND o.id = :id")
                .param("user", userId).param("id", orderId).query(this::order).optional();
    }

    /** Guest lookup. A wrong number and a wrong email are indistinguishable to the caller. */
    public Optional<Order> lookup(String orderNumber, String email) {
        return jdbc.sql("SELECT " + ORDER_COLUMNS + FROM + " WHERE o.order_number = :number AND o.contact_email = :email")
                .param("number", orderNumber).param("email", email).query(this::order).optional();
    }

    Order byId(UUID orderId) {
        return jdbc.sql("SELECT " + ORDER_COLUMNS + FROM + " WHERE o.id = :id").param("id", orderId).query(this::order).single();
    }

    private Order order(ResultSet rs, int row) throws SQLException {
        UUID id = rs.getObject("id", UUID.class);
        List<OrderItem> items = jdbc.sql("""
                SELECT product_id, product_name, product_slug, image_path, unit_price, quantity, line_total
                FROM commerceflow.order_items WHERE order_id = :order ORDER BY product_name, id""")
                .param("order", id)
                .query((r, n) -> new OrderItem(r.getObject("product_id", UUID.class), r.getString("product_name"),
                        r.getString("product_slug"), r.getString("image_path"), Money.format(r.getBigDecimal("unit_price")),
                        r.getInt("quantity"), Money.format(r.getBigDecimal("line_total"))))
                .list();
        var address = new OrderAddress(rs.getString("recipient_name"), rs.getString("address_line1"),
                rs.getString("address_line2"), rs.getString("city"), rs.getString("state"), rs.getString("postal_code"),
                rs.getString("country_code"));
        return new Order(id, rs.getString("order_number"), rs.getString("order_status"), rs.getString("payment_status"),
                rs.getString("delivery_method"), rs.getString("contact_email"), Money.format(rs.getBigDecimal("subtotal_amount")),
                Money.format(rs.getBigDecimal("shipping_amount")), Money.format(rs.getBigDecimal("total_amount")), "USD",
                items, address, rs.getTimestamp("created_at").toInstant(), rs.getObject("user_id") == null);
    }
}
