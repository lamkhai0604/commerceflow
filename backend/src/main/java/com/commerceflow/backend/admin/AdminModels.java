package com.commerceflow.backend.admin;

import com.commerceflow.backend.commerce.CommerceModels.Order;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Administration representations and requests (OpenAPI v1.4 administration). */
public final class AdminModels {
    private AdminModels() {}

    public enum OrderStatus { CONFIRMED, SHIPPED, DELIVERED, CANCELLED }

    public record StatusChangeRequest(@NotNull OrderStatus status, @Size(max = 200) String reason) {
        public StatusChangeRequest {
            reason = reason == null || reason.isBlank() ? null : reason.strip();
        }
    }

    /** At least one field must be present. Category, slug and image are not editable. */
    public record ProductPatchRequest(@Size(min = 1, max = 200) String name, @Size(max = 4000) String description,
            @DecimalMin("0.01") @DecimalMax("99999.99") @Digits(integer = 5, fraction = 2) BigDecimal price, Boolean active) {
        public ProductPatchRequest {
            name = name == null ? null : name.strip();
        }
        boolean empty() { return name == null && description == null && price == null && active == null; }
    }

    /** Sets the stock level. With `expectedStockQuantity` the change only applies if stock is still that value. */
    public record InventoryRequest(@NotNull @Min(0) @Max(100000) Integer stockQuantity, @Min(0) @Max(100000) Integer expectedStockQuantity) {}

    public record AdminProduct(UUID id, String name, String slug, String description, UUID categoryId, String categoryName,
            String price, String currency, int stockQuantity, boolean active, String imageUrl) {}

    public record AuditEntry(UUID id, String actorEmail, String action, String reason, Map<String, Object> details, Instant createdAt) {}

    public record AdminOrder(Order order, List<AuditEntry> history) {}
}
