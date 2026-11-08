-- Forward-only CR-05. PostgreSQL char_length counts Unicode code points in UTF-8.
-- Lock before definitive checks so concurrent writes cannot bypass the preflight.
LOCK TABLE commerceflow.users IN ACCESS EXCLUSIVE MODE;
DO $$
DECLARE
    names_over_limit BIGINT;
    emails_over_limit BIGINT;
BEGIN
    SELECT count(*) FILTER (WHERE char_length(full_name) > 50),
           count(*) FILTER (WHERE char_length(email) > 254)
    INTO names_over_limit, emails_over_limit
    FROM commerceflow.users;
    IF names_over_limit > 0 OR emails_over_limit > 0 THEN
        RAISE EXCEPTION 'CR-05 preflight failed: fullName_over_limit=%, email_over_limit=%. Explicit remediation approval required.',
            names_over_limit, emails_over_limit;
    END IF;
END $$;
-- No USING casts: never truncate, normalize, rewrite, delete, or remediate identities.
ALTER TABLE commerceflow.users ALTER COLUMN full_name TYPE VARCHAR(50);
ALTER TABLE commerceflow.users ALTER COLUMN email TYPE VARCHAR(254);
