package com.commerceflow.backend.commerce;

import com.commerceflow.backend.error.ErrorCode;

/** Expected business outcomes of cart, checkout and order operations; mapped to Problem Details responses. */
public class CommerceException extends RuntimeException {
    private final ErrorCode code;

    CommerceException(ErrorCode code) {
        super(code.name(), null, false, false);
        this.code = code;
    }

    public ErrorCode code() {
        return code;
    }

    static final class NotFound extends CommerceException { NotFound() { super(ErrorCode.RESOURCE_NOT_FOUND); } }
    static final class ProductUnavailable extends CommerceException { ProductUnavailable() { super(ErrorCode.PRODUCT_UNAVAILABLE); } }
    static final class CartEmpty extends CommerceException { CartEmpty() { super(ErrorCode.CART_EMPTY); } }
    static final class InvalidKey extends CommerceException { InvalidKey() { super(ErrorCode.INVALID_REQUEST); } }
    static final class InProgress extends CommerceException { InProgress() { super(ErrorCode.IDEMPOTENCY_IN_PROGRESS); } }
    static final class PayloadMismatch extends CommerceException { PayloadMismatch() { super(ErrorCode.IDEMPOTENCY_PAYLOAD_MISMATCH); } }
    static final class PaymentUnavailable extends CommerceException { PaymentUnavailable() { super(ErrorCode.PAYMENT_TEMPORARILY_UNAVAILABLE); } }
    static final class TooManyRequests extends CommerceException { TooManyRequests() { super(ErrorCode.TOO_MANY_REQUESTS); } }
    static final class GuestOnly extends CommerceException { GuestOnly() { super(ErrorCode.ACCESS_DENIED); } }
}
