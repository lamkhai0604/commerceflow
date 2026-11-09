-- Demonstration data (Sprint 4 review): one product with little stock, so the insufficient-stock outcome of
-- checkout can be tried on the live site (order more than 3 Oak Nightstands). Stock is managed by administration
-- from Sprint 5; until then this is the only way to show the rule without waiting for stock to run out.
UPDATE commerceflow.products SET stock_quantity = 3, version = version + 1, updated_at = now()
WHERE slug = 'oak-nightstand';
