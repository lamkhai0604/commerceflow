package com.commerceflow.backend.commerce;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** USD amounts as two-decimal strings, the API's Money format. */
final class Money {
    private Money() {}

    static final BigDecimal FREE_SHIPPING_THRESHOLD = new BigDecimal("75.00");
    static final BigDecimal STANDARD_SHIPPING = new BigDecimal("9.00");
    static final BigDecimal EXPRESS_SHIPPING = new BigDecimal("19.00");

    static String format(BigDecimal value) {
        return value.setScale(2, RoundingMode.UNNECESSARY).toPlainString();
    }

    /** Shipping rules shown on the storefront: standard is free from $75.00, express is always $19.00. */
    static BigDecimal shipping(CommerceModels.DeliveryMethod method, BigDecimal subtotal) {
        return switch (method) {
            case EXPRESS -> EXPRESS_SHIPPING;
            case STANDARD -> subtotal.compareTo(FREE_SHIPPING_THRESHOLD) >= 0 ? BigDecimal.ZERO.setScale(2) : STANDARD_SHIPPING;
        };
    }
}
