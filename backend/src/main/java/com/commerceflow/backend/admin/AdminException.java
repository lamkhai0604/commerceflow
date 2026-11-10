package com.commerceflow.backend.admin;

import com.commerceflow.backend.error.ErrorCode;

/** Expected outcomes of administration operations; mapped to Problem Details responses. */
public class AdminException extends RuntimeException {
    private final ErrorCode code;

    AdminException(ErrorCode code) {
        super(code.name(), null, false, false);
        this.code = code;
    }

    public ErrorCode code() {
        return code;
    }

    static final class NotFound extends AdminException { NotFound() { super(ErrorCode.RESOURCE_NOT_FOUND); } }
    static final class InvalidRequest extends AdminException { InvalidRequest() { super(ErrorCode.INVALID_REQUEST); } }
    static final class InvalidTransition extends AdminException { InvalidTransition() { super(ErrorCode.INVALID_STATE_TRANSITION); } }
    static final class SlugConflict extends AdminException { SlugConflict() { super(ErrorCode.PRODUCT_SLUG_CONFLICT); } }
    static final class StockChanged extends AdminException { StockChanged() { super(ErrorCode.STOCK_CHANGED); } }
}
