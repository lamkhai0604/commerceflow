-- Catalog tables from the physical ERD, with the storefront columns approved in CR-S3-01.
CREATE TABLE commerceflow.categories (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT categories_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE TABLE commerceflow.products (
    id UUID PRIMARY KEY,
    category_id UUID NOT NULL REFERENCES commerceflow.categories(id),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    price NUMERIC(12, 2) NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    image_path VARCHAR(200) NOT NULL,
    image_alt VARCHAR(200) NOT NULL,
    details TEXT[] NOT NULL DEFAULT '{}',
    display_order INTEGER NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT products_price_nonnegative CHECK (price >= 0),
    CONSTRAINT products_stock_nonnegative CHECK (stock_quantity >= 0),
    CONSTRAINT products_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    -- Images are served by the storefront from a fixed public folder; no external URLs.
    CONSTRAINT products_image_path_format CHECK (image_path ~ '^/images/products/[a-z0-9-]+$')
);

CREATE INDEX products_category_order ON commerceflow.products (category_id, display_order) WHERE active;
CREATE INDEX products_active_order ON commerceflow.products (display_order, id) WHERE active;
