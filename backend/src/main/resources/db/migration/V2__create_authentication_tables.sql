CREATE TABLE commerceflow.users (
    id UUID PRIMARY KEY,
    email VARCHAR(320) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_email_normalized CHECK (email = lower(btrim(email))),
    CONSTRAINT users_account_status CHECK (account_status IN ('ACTIVE', 'DISABLED'))
);
CREATE UNIQUE INDEX users_email_unique ON commerceflow.users (lower(email));

CREATE TABLE commerceflow.roles (
    id SMALLINT PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE CHECK (name IN ('CUSTOMER', 'ADMIN'))
);
CREATE TABLE commerceflow.user_roles (
    user_id UUID NOT NULL REFERENCES commerceflow.users(id),
    role_id SMALLINT NOT NULL REFERENCES commerceflow.roles(id),
    PRIMARY KEY (user_id, role_id)
);
INSERT INTO commerceflow.roles (id, name) VALUES (1, 'CUSTOMER'), (2, 'ADMIN');
