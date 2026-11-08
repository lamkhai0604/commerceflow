# CommerceFlow Checkout Policy — API Contract v1.0

**Status:** Approved business policy; implementation pending.

- `POST /api/v1/orders` requires authenticated CUSTOMER session, CSRF token and `Idempotency-Key`.
- Keys are scoped to the customer and canonical checkout request fingerprint, including the cart snapshot.
- Completed idempotency records are retained for **at least 24 hours**. Identical completed retries return the original outcome with no duplicate order.
- Same key with different request fingerprint returns `409 Conflict` (`IDEMPOTENCY_PAYLOAD_MISMATCH`).
- Concurrent in-progress requests for the same key: only one is processed; others receive `409 Conflict` (`IDEMPOTENCY_IN_PROGRESS`) and a `Retry-After` hint.
- Product stock decrements, order creation, address/item snapshots, cart clearing, and successful idempotency completion are transactionally consistent.
- Mock payment failure creates no order and changes no stock.
- Admin cancellation uses `PATCH /api/v1/admin/orders/{orderId}/status` with `{"status":"CANCELLED"}` and is allowed only from `CONFIRMED`.
- A successful cancellation restores inventory **exactly once**, atomically with status change. Invalid/repeated transitions return `409`.
- No replay guarantee applies after an idempotency record expires.

**Implementation design still to validate:** durable reservation and recovery for crashed in-progress keys; deterministic fingerprint from cart snapshot; precise HTTP replay semantics for failures; transactional boundary around mock-payment simulation; stock-adjustment concurrency with admin inventory updates.
