-- Cart, order and checkout idempotency tables (Sprint 4; physical ERD with CR-S4-01 guest checkout).

CREATE TABLE commerceflow.carts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES commerceflow.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE commerceflow.cart_items (
    id UUID PRIMARY KEY,
    cart_id UUID NOT NULL REFERENCES commerceflow.carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES commerceflow.products(id),
    quantity INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cart_items_quantity CHECK (quantity BETWEEN 1 AND 10),
    CONSTRAINT cart_items_unique_product UNIQUE (cart_id, product_id)
);

CREATE TABLE commerceflow.orders (
    id UUID PRIMARY KEY,
    -- Public identifier shown to customers; internal IDs are never needed for lookup.
    order_number VARCHAR(16) NOT NULL UNIQUE,
    -- Null for guest orders (CR-S4-01).
    user_id UUID REFERENCES commerceflow.users(id),
    contact_email VARCHAR(254) NOT NULL,
    order_status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PAID',
    delivery_method VARCHAR(20) NOT NULL,
    subtotal_amount NUMERIC(12, 2) NOT NULL,
    shipping_amount NUMERIC(12, 2) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT orders_number_format CHECK (order_number ~ '^CF-[A-Z0-9]{8}$'),
    CONSTRAINT orders_email_normalized CHECK (contact_email = lower(btrim(contact_email))),
    CONSTRAINT orders_status CHECK (order_status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
    CONSTRAINT orders_payment_status CHECK (payment_status IN ('PAID', 'REFUNDED')),
    CONSTRAINT orders_delivery_method CHECK (delivery_method IN ('STANDARD', 'EXPRESS')),
    CONSTRAINT orders_amounts CHECK (subtotal_amount >= 0 AND shipping_amount >= 0
        AND total_amount = subtotal_amount + shipping_amount)
);
CREATE INDEX orders_user_created ON commerceflow.orders (user_id, created_at DESC) WHERE user_id IS NOT NULL;

CREATE TABLE commerceflow.order_items (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES commerceflow.orders(id),
    -- Orders keep referencing products; products with orders cannot be hard-deleted (ERD integrity rule).
    product_id UUID NOT NULL REFERENCES commerceflow.products(id),
    product_name VARCHAR(200) NOT NULL,
    product_slug VARCHAR(200) NOT NULL,
    image_path VARCHAR(200) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    quantity INTEGER NOT NULL,
    line_total NUMERIC(12, 2) NOT NULL,
    CONSTRAINT order_items_quantity CHECK (quantity BETWEEN 1 AND 10),
    CONSTRAINT order_items_total CHECK (unit_price >= 0 AND line_total = unit_price * quantity)
);
CREATE INDEX order_items_order ON commerceflow.order_items (order_id);

CREATE TABLE commerceflow.order_addresses (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL UNIQUE REFERENCES commerceflow.orders(id),
    recipient_name VARCHAR(150) NOT NULL,
    address_line1 VARCHAR(200) NOT NULL,
    address_line2 VARCHAR(200),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    postal_code VARCHAR(10) NOT NULL,
    country_code CHAR(2) NOT NULL DEFAULT 'US',
    CONSTRAINT order_addresses_country CHECK (country_code = 'US')
);

-- Infrastructure table (not a business entity): stored checkout outcomes for idempotent replay (ADR-006, S4-D01).
CREATE TABLE commerceflow.checkout_idempotency (
    id UUID PRIMARY KEY,
    -- 'user:<uuid>' for members, 'guest:<sha-256 of the session id>' for guests.
    scope VARCHAR(80) NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    request_fingerprint CHAR(64) NOT NULL,
    response_status SMALLINT NOT NULL,
    -- Exact response body, replayed byte for byte.
    response_body TEXT NOT NULL,
    order_id UUID REFERENCES commerceflow.orders(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT checkout_idempotency_unique UNIQUE (scope, idempotency_key),
    CONSTRAINT checkout_idempotency_retention CHECK (expires_at >= created_at + INTERVAL '24 hours'),
    CONSTRAINT checkout_idempotency_status CHECK (response_status IN (201, 402, 409))
);
CREATE INDEX checkout_idempotency_expiry ON commerceflow.checkout_idempotency (expires_at);
