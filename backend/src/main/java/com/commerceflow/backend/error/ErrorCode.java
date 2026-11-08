package com.commerceflow.backend.error;

public enum ErrorCode {
    EMAIL_CONFLICT(409, "Email unavailable", "An account with this email already exists"),
    INVALID_CREDENTIALS(401, "Authentication failed", "Invalid email or password"),
    UNAUTHENTICATED(401, "Authentication required", "Sign in to continue"),
    CSRF_INVALID(403, "Request verification failed", "Refresh request verification and try again"),
    ACCESS_DENIED(403, "Access denied", "You do not have permission to perform this action"),
    VALIDATION_ERROR(400, "Invalid input", "Request validation failed"),
    INVALID_REQUEST(400, "Invalid request", "Request body or parameters are invalid"),
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
