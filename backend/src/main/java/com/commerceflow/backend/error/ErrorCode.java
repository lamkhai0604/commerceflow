package com.commerceflow.backend.error;

public enum ErrorCode {
    EMAIL_CONFLICT(409, "Email unavailable", "An account with this email already exists"),
    INVALID_CREDENTIALS(401, "Authentication failed", "Invalid email or password"),
    UNAUTHENTICATED(401, "Authentication required", "Sign in to continue"),
    CSRF_INVALID(403, "Request verification failed", "Refresh request verification and try again"),
    ACCESS_DENIED(403, "Access denied", "You do not have permission to perform this action"),
    VALIDATION_ERROR(400, "Invalid input", "Request validation failed"),
    INVALID_REQUEST(400, "Invalid request", "Request body or parameters are invalid"),
    RESOURCE_NOT_FOUND(404, "Resource not found", "The requested resource is unavailable"),
    PRODUCT_UNAVAILABLE(409, "Product unavailable", "This product is not available to buy right now"),
    CART_EMPTY(409, "Cart is empty", "Add a product before checking out"),
    INSUFFICIENT_STOCK(409, "Not enough stock", "One or more products do not have enough stock for this order"),
    IDEMPOTENCY_IN_PROGRESS(409, "Checkout in progress", "This checkout is already being processed; try again shortly"),
    IDEMPOTENCY_PAYLOAD_MISMATCH(409, "Checkout request changed", "This checkout key was already used with different details; start a new checkout"),
    PAYMENT_DECLINED(402, "Payment declined", "The demonstration payment was declined; no order was created"),
    PAYMENT_TEMPORARILY_UNAVAILABLE(503, "Payment temporarily unavailable", "The demonstration payment service is unavailable; no order was created"),
    TOO_MANY_REQUESTS(429, "Too many requests", "Too many attempts; wait a few minutes and try again"),
    INTERNAL_ERROR(500, "Internal server error", "The request could not be completed"),
    SERVICE_UNAVAILABLE(503, "Service unavailable", "The service is temporarily unavailable"),
    METHOD_NOT_ALLOWED(405, "Method not allowed", "This operation does not support that request method"),
    UNSUPPORTED_MEDIA_TYPE(415, "Unsupported content type", "Send the documented request content type");

    public final int status;
    public final String title;
    public final String detail;

    ErrorCode(int status, String title, String detail) {
        this.status = status;
        this.title = title;
        this.detail = detail;
    }
}
