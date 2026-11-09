package com.commerceflow.backend.commerce;

import com.commerceflow.backend.commerce.CommerceModels.Cart;
import com.commerceflow.backend.commerce.CommerceModels.CartItem;
import com.commerceflow.backend.commerce.CommerceModels.LineRequest;
import com.commerceflow.backend.commerce.CommerceModels.MergeCartResponse;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Member cart on the server (FR-09 as amended by CR-S4-01). Every query is scoped to the authenticated customer's
 * cart, so a cart item ID from another customer behaves exactly like a missing one.
 */
@Service
@Transactional
public class CartService {
    private final JdbcClient jdbc;

    public CartService(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public Cart cart(UUID userId) {
        var items = jdbc.sql("""
                SELECT ci.id, ci.product_id, ci.quantity, p.slug, p.name, p.image_path, p.price,
                       (p.active AND p.stock_quantity > 0) AS available
                FROM commerceflow.carts c
                JOIN commerceflow.cart_items ci ON ci.cart_id = c.id
                JOIN commerceflow.products p ON p.id = ci.product_id
                WHERE c.user_id = :user
                ORDER BY ci.created_at, ci.id""")
                .param("user", userId)
                .query((rs, row) -> {
                    BigDecimal price = rs.getBigDecimal("price");
                    int quantity = rs.getInt("quantity");
                    return new CartItem(rs.getObject("id", UUID.class), rs.getObject("product_id", UUID.class),
                            rs.getString("slug"), rs.getString("name"), rs.getString("image_path"), Money.format(price),
                            quantity, Money.format(price.multiply(BigDecimal.valueOf(quantity))), rs.getBoolean("available"));
                })
                .list();
        BigDecimal total = items.stream().filter(CartItem::available)
                .map(i -> new BigDecimal(i.lineTotal())).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new Cart(items, "USD", Money.format(total));
    }

    public Cart add(UUID userId, UUID productId, int quantity) {
        requireBuyable(productId);
        upsert(cartId(userId), productId, quantity);
        return cart(userId);
    }

    public Cart setQuantity(UUID userId, UUID itemId, int quantity) {
        int updated = jdbc.sql("""
                UPDATE commerceflow.cart_items ci SET quantity = :quantity
                FROM commerceflow.carts c
                WHERE ci.cart_id = c.id AND c.user_id = :user AND ci.id = :item""")
                .param("quantity", quantity).param("user", userId).param("item", itemId).update();
        if (updated == 0) throw new CommerceException.NotFound();
        return cart(userId);
    }

    public Cart remove(UUID userId, UUID itemId) {
        int deleted = jdbc.sql("""
                DELETE FROM commerceflow.cart_items ci USING commerceflow.carts c
                WHERE ci.cart_id = c.id AND c.user_id = :user AND ci.id = :item""")
                .param("user", userId).param("item", itemId).update();
        if (deleted == 0) throw new CommerceException.NotFound();
        return cart(userId);
    }

    /** Adds a guest's browser cart to the member cart; quantities add up and are capped at the per-product maximum. */
    public MergeCartResponse merge(UUID userId, List<LineRequest> lines) {
        var combined = new LinkedHashMap<UUID, Integer>();
        for (var line : lines) combined.merge(line.productId(), line.quantity(), Integer::sum);
        UUID cart = cartId(userId);
        var skipped = new ArrayList<UUID>();
        for (Map.Entry<UUID, Integer> entry : combined.entrySet()) {
            if (!buyable(entry.getKey())) { skipped.add(entry.getKey()); continue; }
            upsert(cart, entry.getKey(), entry.getValue());
        }
        return new MergeCartResponse(cart(userId), skipped);
    }

    /** Removes the given products from the member's cart after a successful order (same transaction as the order). */
    void removePurchased(UUID userId, List<UUID> productIds) {
        if (productIds.isEmpty()) return;
        jdbc.sql("""
                DELETE FROM commerceflow.cart_items ci USING commerceflow.carts c
                WHERE ci.cart_id = c.id AND c.user_id = :user AND ci.product_id IN (:products)""")
                .param("user", userId).param("products", productIds).update();
    }

    /** Lines of the member's cart that checkout will try to buy. */
    @Transactional(readOnly = true)
    List<LineRequest> checkoutLines(UUID userId) {
        return jdbc.sql("""
                SELECT ci.product_id, ci.quantity FROM commerceflow.carts c
                JOIN commerceflow.cart_items ci ON ci.cart_id = c.id
                WHERE c.user_id = :user ORDER BY ci.product_id""")
                .param("user", userId)
                .query((rs, row) -> new LineRequest(rs.getObject("product_id", UUID.class), rs.getInt("quantity")))
                .list();
    }

    private void upsert(UUID cartId, UUID productId, int quantity) {
        jdbc.sql("""
                INSERT INTO commerceflow.cart_items (id, cart_id, product_id, quantity)
                VALUES (:id, :cart, :product, LEAST(:quantity, :max))
                ON CONFLICT (cart_id, product_id)
                DO UPDATE SET quantity = LEAST(commerceflow.cart_items.quantity + EXCLUDED.quantity, :max)""")
                .param("id", UUID.randomUUID()).param("cart", cartId).param("product", productId)
                .param("quantity", quantity).param("max", CommerceModels.MAX_QUANTITY).update();
        jdbc.sql("UPDATE commerceflow.carts SET updated_at = now() WHERE id = :cart").param("cart", cartId).update();
    }

    private UUID cartId(UUID userId) {
        jdbc.sql("INSERT INTO commerceflow.carts (id, user_id) VALUES (:id, :user) ON CONFLICT (user_id) DO NOTHING")
                .param("id", UUID.randomUUID()).param("user", userId).update();
        return jdbc.sql("SELECT id FROM commerceflow.carts WHERE user_id = :user").param("user", userId)
                .query(UUID.class).single();
    }

    private boolean buyable(UUID productId) {
        return jdbc.sql("SELECT count(*) FROM commerceflow.products WHERE id = :id AND active AND stock_quantity > 0")
                .param("id", productId).query(Long.class).single() > 0;
    }

    private void requireBuyable(UUID productId) {
        if (!buyable(productId)) throw new CommerceException.ProductUnavailable();
    }
}
