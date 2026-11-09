package com.commerceflow.backend.commerce;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** API representations for cart, checkout and orders (OpenAPI v1.3 orders, CR-S4-01). Money is a USD string. */
public final class CommerceModels {
    private CommerceModels() {}

    public static final int MAX_QUANTITY = 10;
    public static final int MAX_LINES = 30;

    // Cart

    public record CartItem(UUID id, UUID productId, String slug, String name, String imageUrl, String unitPrice,
            int quantity, String lineTotal, boolean available) {}

    public record Cart(List<CartItem> items, String currency, String estimatedTotal) {}

    public record AddCartItemRequest(@NotNull UUID productId, @NotNull @Min(1) @Max(MAX_QUANTITY) Integer quantity) {}

    public record UpdateCartItemRequest(@NotNull @Min(1) @Max(MAX_QUANTITY) Integer quantity) {}

    public record LineRequest(@NotNull UUID productId, @NotNull @Min(1) @Max(MAX_QUANTITY) Integer quantity) {}

    public record MergeCartRequest(@NotNull @Size(max = MAX_LINES) List<@Valid @NotNull LineRequest> items) {}

    /** The merged cart and the products that could not be added (inactive or out of stock). */
    public record MergeCartResponse(Cart cart, List<UUID> skippedProductIds) {}

    // Checkout

    public enum DeliveryMethod { STANDARD, EXPRESS }

    /** Demonstration payment outcome chosen on the checkout page (S4-D02). No card data exists anywhere. */
    public enum PaymentScenario { APPROVE, DECLINE, UNAVAILABLE }

    public record ShippingAddress(
            @NotBlank @Size(max = 150) String recipientName,
            @NotBlank @Size(max = 200) String addressLine1,
            @Size(max = 200) String addressLine2,
            @NotBlank @Size(max = 100) String city,
            @NotBlank @Pattern(regexp = "^(AL|AK|AZ|AR|CA|CO|CT|DE|DC|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)$") String state,
            @NotBlank @Pattern(regexp = "^[0-9]{5}(-[0-9]{4})?$") String postalCode,
            @Pattern(regexp = "^US$") String countryCode) {
        public ShippingAddress {
            recipientName = strip(recipientName);
            addressLine1 = strip(addressLine1);
            addressLine2 = addressLine2 == null || addressLine2.isBlank() ? null : addressLine2.strip();
            city = strip(city);
            postalCode = strip(postalCode);
            countryCode = countryCode == null ? "US" : countryCode;
        }
    }

    public record MemberCheckoutRequest(@NotNull @Valid ShippingAddress shippingAddress,
            @NotNull DeliveryMethod deliveryMethod, @NotNull PaymentScenario paymentScenario) {}

    public record GuestCheckoutRequest(
            @NotBlank @Email @Size(max = 254) String email,
            @NotNull @Valid ShippingAddress shippingAddress,
            @NotNull DeliveryMethod deliveryMethod,
            @NotNull PaymentScenario paymentScenario,
            @NotEmpty @Size(max = MAX_LINES) List<@Valid @NotNull LineRequest> items) {
        public GuestCheckoutRequest { email = email == null ? null : email.strip().toLowerCase(java.util.Locale.ROOT); }
        @Override public String toString() { return "GuestCheckoutRequest[REDACTED]"; }
    }

    // Orders

    public record OrderItem(UUID productId, String productName, String productSlug, String imageUrl, String unitPrice,
            int quantity, String lineTotal) {}

    public record OrderAddress(String recipientName, String addressLine1, String addressLine2, String city, String state,
            String postalCode, String countryCode) {}

    public record Order(UUID id, String orderNumber, String orderStatus, String paymentStatus, String deliveryMethod,
            String contactEmail, String subtotalAmount, String shippingAmount, String totalAmount, String currency,
            List<OrderItem> items, OrderAddress shippingAddress, Instant createdAt, boolean guest) {}

    public record OrderLookupRequest(@NotBlank @Pattern(regexp = "^CF-[A-Za-z0-9]{8}$") String orderNumber,
            @NotBlank @Email @Size(max = 254) String email) {
        public OrderLookupRequest {
            orderNumber = orderNumber == null ? null : orderNumber.strip().toUpperCase(java.util.Locale.ROOT);
            email = email == null ? null : email.strip().toLowerCase(java.util.Locale.ROOT);
        }
    }

    private static String strip(String value) {
        return value == null ? null : value.strip();
    }
}
