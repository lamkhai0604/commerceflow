package com.commerceflow.backend.commerce;

import com.commerceflow.backend.commerce.CommerceModels.DeliveryMethod;
import com.commerceflow.backend.commerce.CommerceModels.LineRequest;
import com.commerceflow.backend.commerce.CommerceModels.PaymentScenario;
import com.commerceflow.backend.commerce.CommerceModels.ShippingAddress;
import com.commerceflow.backend.error.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import java.math.BigDecimal;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Idempotent checkout (ADR-006, D1, D2; implementation decision S4-D01).
 *
 * <p>Everything happens in one PostgreSQL transaction guarded by a transaction-scoped advisory lock on
 * (scope, key): a second request with the same key while the first is running gets IDEMPOTENCY_IN_PROGRESS; a crash
 * before commit leaves no trace; after commit the stored outcome is replayed. Stock rows are locked in product-ID
 * order and decremented only when every line can be fulfilled, so there is no partial order and stock never goes
 * negative.
 */
@Service
public class CheckoutService {
    static final Duration RETENTION = Duration.ofHours(24);
    private static final Pattern KEY = Pattern.compile("^[A-Za-z0-9_-]{8,128}$");
    private static final char[] ORDER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
    private static final SecureRandom RANDOM = new SecureRandom();

    private final JdbcClient jdbc;
    private final CartService carts;
    private final OrderQueries orders;
    private final ObjectMapper json;
    private final ObjectMapper canonical;

    public CheckoutService(JdbcClient jdbc, CartService carts, OrderQueries orders, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.carts = carts;
        this.orders = orders;
        this.json = mapper;
        this.canonical = mapper.copy().configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);
    }

    /** A stored or fresh checkout outcome: HTTP status, JSON body and whether it was replayed. */
    public record Outcome(int status, String body, boolean replayed) {}

    /** Who is buying. Members check out their server cart; guests send their lines explicitly. */
    public record Buyer(UUID userId, String email, String guestSessionHash, List<LineRequest> guestLines) {
        String scope() { return userId != null ? "user:" + userId : "guest:" + guestSessionHash; }
    }

    @Transactional
    public Outcome checkout(Buyer buyer, String key, ShippingAddress address, DeliveryMethod delivery, PaymentScenario payment) {
        if (key == null || !KEY.matcher(key).matches()) throw new CommerceException.InvalidKey();
        String scope = buyer.scope();
        if (!Boolean.TRUE.equals(jdbc.sql("SELECT pg_try_advisory_xact_lock(:lock)").param("lock", lockId(scope, key))
                .query(Boolean.class).single())) {
            throw new CommerceException.InProgress();
        }

        String fingerprint = fingerprint(buyer, address, delivery, payment);
        var stored = jdbc.sql("""
                SELECT request_fingerprint, response_status, response_body AS body, expires_at < now() AS expired
                FROM commerceflow.checkout_idempotency WHERE scope = :scope AND idempotency_key = :key""")
                .param("scope", scope).param("key", key)
                .query((rs, row) -> new Object[] {rs.getString(1), rs.getInt(2), rs.getString(3), rs.getBoolean(4)})
                .optional();
        if (stored.isPresent()) {
            Object[] record = stored.get();
            if ((Boolean) record[3]) {
                // Retention elapsed (at least 24 h): the key no longer guarantees replay and starts a new checkout.
                jdbc.sql("DELETE FROM commerceflow.checkout_idempotency WHERE scope = :scope AND idempotency_key = :key")
                        .param("scope", scope).param("key", key).update();
            } else if (!record[0].equals(fingerprint)) {
                throw new CommerceException.PayloadMismatch();
            } else {
                return new Outcome((Integer) record[1], (String) record[2], true);
            }
        }

        List<LineRequest> lines = combine(buyer.userId() != null ? carts.checkoutLines(buyer.userId()) : buyer.guestLines());
        if (lines.isEmpty()) throw new CommerceException.CartEmpty();

        // Demonstration payment is simulated before any inventory change (D2).
        if (payment == PaymentScenario.UNAVAILABLE) throw new CommerceException.PaymentUnavailable();
        if (payment == PaymentScenario.DECLINE) return store(scope, key, fingerprint, 402, problem(ErrorCode.PAYMENT_DECLINED), null);

        var products = jdbc.sql("""
                SELECT id, name, slug, image_path, price, stock_quantity, active FROM commerceflow.products
                WHERE id IN (:ids) ORDER BY id FOR UPDATE""")
                .param("ids", lines.stream().map(LineRequest::productId).toList())
                .query((rs, row) -> new Product(rs.getObject("id", UUID.class), rs.getString("name"), rs.getString("slug"),
                        rs.getString("image_path"), rs.getBigDecimal("price"), rs.getInt("stock_quantity"), rs.getBoolean("active")))
                .list();
        Map<UUID, Product> byId = new LinkedHashMap<>();
        products.forEach(p -> byId.put(p.id(), p));
        // Products that cannot be fulfilled, with what is left (S5-D04). Nothing is changed unless every line fits.
        var shortages = new ArrayList<Map<String, Object>>();
        for (var line : lines) {
            Product product = byId.get(line.productId());
            int available = product != null && product.active() ? product.stock() : 0;
            if (available < line.quantity()) {
                var shortage = new LinkedHashMap<String, Object>();
                shortage.put("productId", line.productId());
                shortage.put("productName", product == null ? null : product.name());
                shortage.put("requested", line.quantity());
                shortage.put("available", available);
                shortages.add(shortage);
            }
        }
        if (!shortages.isEmpty()) {
            return store(scope, key, fingerprint, 409, problem(ErrorCode.INSUFFICIENT_STOCK, Map.of("shortages", shortages)), null);
        }

        BigDecimal subtotal = BigDecimal.ZERO.setScale(2);
        for (var line : lines) {
            Product product = byId.get(line.productId());
            int updated = jdbc.sql("""
                    UPDATE commerceflow.products SET stock_quantity = stock_quantity - :quantity, version = version + 1,
                           updated_at = now()
                    WHERE id = :id AND active AND stock_quantity >= :quantity""")
                    .param("quantity", line.quantity()).param("id", product.id()).update();
            if (updated != 1) throw new IllegalStateException("Stock changed while locked");
            subtotal = subtotal.add(product.price().multiply(BigDecimal.valueOf(line.quantity())));
        }
        BigDecimal shipping = Money.shipping(delivery, subtotal);

        UUID orderId = UUID.randomUUID();
        jdbc.sql("""
                INSERT INTO commerceflow.orders (id, order_number, user_id, contact_email, delivery_method,
                    subtotal_amount, shipping_amount, total_amount)
                VALUES (:id, :number, :user, :email, :delivery, :subtotal, :shipping, :total)""")
                .param("id", orderId).param("number", orderNumber()).param("user", buyer.userId(), java.sql.Types.OTHER)
                .param("email", buyer.email()).param("delivery", delivery.name()).param("subtotal", subtotal)
                .param("shipping", shipping).param("total", subtotal.add(shipping)).update();
        for (var line : lines) {
            Product product = byId.get(line.productId());
            jdbc.sql("""
                    INSERT INTO commerceflow.order_items (id, order_id, product_id, product_name, product_slug, image_path,
                        unit_price, quantity, line_total)
                    VALUES (:id, :order, :product, :name, :slug, :image, :price, :quantity, :total)""")
                    .param("id", UUID.randomUUID()).param("order", orderId).param("product", product.id())
                    .param("name", product.name()).param("slug", product.slug()).param("image", product.imagePath())
                    .param("price", product.price()).param("quantity", line.quantity())
                    .param("total", product.price().multiply(BigDecimal.valueOf(line.quantity()))).update();
        }
        jdbc.sql("""
                INSERT INTO commerceflow.order_addresses (id, order_id, recipient_name, address_line1, address_line2,
                    city, state, postal_code, country_code)
                VALUES (:id, :order, :name, :line1, :line2, :city, :state, :zip, 'US')""")
                .param("id", UUID.randomUUID()).param("order", orderId).param("name", address.recipientName())
                .param("line1", address.addressLine1()).param("line2", address.addressLine2(), java.sql.Types.VARCHAR).param("city", address.city())
                .param("state", address.state()).param("zip", address.postalCode()).update();
        if (buyer.userId() != null) carts.removePurchased(buyer.userId(), lines.stream().map(LineRequest::productId).toList());

        return store(scope, key, fingerprint, 201, write(orders.byId(orderId)), orderId);
    }

    private Outcome store(String scope, String key, String fingerprint, int status, String body, UUID orderId) {
        jdbc.sql("""
                INSERT INTO commerceflow.checkout_idempotency
                    (id, scope, idempotency_key, request_fingerprint, response_status, response_body, order_id, expires_at)
                VALUES (:id, :scope, :key, :fingerprint, :status, :body, :order, now() + CAST(:retention AS interval))""")
                .param("id", UUID.randomUUID()).param("scope", scope).param("key", key).param("fingerprint", fingerprint)
                .param("status", status).param("body", body).param("order", orderId, java.sql.Types.OTHER)
                .param("retention", RETENTION.toHours() + " hours").update();
        return new Outcome(status, body, false);
    }

    /** Sums duplicate products, sorts by product ID (stable lock order) and enforces the per-product limit. */
    static List<LineRequest> combine(List<LineRequest> lines) {
        var totals = new TreeMap<UUID, Integer>();
        for (var line : lines) totals.merge(line.productId(), line.quantity(), Integer::sum);
        var result = new ArrayList<LineRequest>();
        totals.forEach((product, quantity) -> result.add(new LineRequest(product, Math.min(quantity, CommerceModels.MAX_QUANTITY))));
        return result;
    }

    /**
     * Fingerprint of the explicit request: address, delivery, payment outcome and, for guests, the lines and email.
     * A member's cart is implicit; the stored outcome is authoritative for replay (checkout reliability supplement §3).
     */
    String fingerprint(Buyer buyer, ShippingAddress address, DeliveryMethod delivery, PaymentScenario payment) {
        var fields = new TreeMap<String, Object>();
        fields.put("v", 1);
        fields.put("address", address);
        fields.put("delivery", delivery.name());
        fields.put("payment", payment.name());
        if (buyer.userId() == null) {
            fields.put("email", buyer.email());
            fields.put("lines", combine(buyer.guestLines()));
        }
        try {
            return HexFormat.of().formatHex(sha256(canonical.writeValueAsBytes(fields)));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    private String problem(ErrorCode code) {
        return problem(code, Map.of());
    }

    private String problem(ErrorCode code, Map<String, Object> extra) {
        var body = new LinkedHashMap<String, Object>();
        body.put("type", "about:blank");
        body.put("title", code.title);
        body.put("status", code.status);
        body.put("detail", code.detail);
        body.put("code", code.name());
        body.putAll(extra);
        return write(body);
    }

    private String write(Object value) {
        try {
            return json.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    private static long lockId(String scope, String key) {
        return ByteBuffer.wrap(sha256((scope + "\n" + key).getBytes(StandardCharsets.UTF_8))).getLong();
    }

    static byte[] sha256(byte[] input) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(input);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    static String orderNumber() {
        var number = new StringBuilder("CF-");
        for (int i = 0; i < 8; i++) number.append(ORDER_ALPHABET[RANDOM.nextInt(ORDER_ALPHABET.length)]);
        return number.toString();
    }

    private record Product(UUID id, String name, String slug, String imagePath, BigDecimal price, int stock, boolean active) {}
}
