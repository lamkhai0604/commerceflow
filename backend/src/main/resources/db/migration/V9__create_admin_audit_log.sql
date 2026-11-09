-- Administration audit log (Sprint 5, S5-D01): who changed what and when, with the reason where one was given.
-- Infrastructure table, not a business entity. Rows are only ever inserted.
CREATE TABLE commerceflow.admin_audit_log (
    id UUID PRIMARY KEY,
    actor_user_id UUID NOT NULL REFERENCES commerceflow.users(id),
    action VARCHAR(40) NOT NULL,
    entity_type VARCHAR(20) NOT NULL,
    entity_id UUID NOT NULL,
    reason VARCHAR(200),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT admin_audit_entity_type CHECK (entity_type IN ('ORDER', 'PRODUCT')),
    CONSTRAINT admin_audit_action CHECK (action ~ '^[A-Z_]+$')
);
CREATE INDEX admin_audit_entity ON commerceflow.admin_audit_log (entity_type, entity_id, created_at);
