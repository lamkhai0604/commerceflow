# CommerceFlow SRS - Approved Design Addendum v1.0

Status: ACCEPTED design baseline; implementation and runtime verification pending.
FR-11A Idempotency: An authenticated checkout request shall bind a customer-scoped key to the first accepted cart snapshot and canonical explicit request fields. The system shall replay the stored status and body for identical completed retries and reject changed explicit fields with 409.
FR-11B Recovery: An active concurrent same-key checkout shall receive 409 with retry guidance. Lease expiry and fencing shall prevent stale workers from committing; a crash before commit shall leave no partial order or inventory changes; a crash after commit shall allow exact replay.
FR-11C Mock payment: A deterministic mock decline shall return terminal 402 PAYMENT_DECLINED and be replayable; a transient mock outage shall return retryable 503 PAYMENT_TEMPORARILY_UNAVAILABLE. Neither shall create an order or change stock.
FR-11D Atomicity: Conditional stock decrement, order creation, immutable snapshots, cart clearing and successful replay record shall commit atomically. Concurrent buyers for one unit shall yield at most one confirmed order.
FR-16A Cancellation: Only CONFIRMED orders may transition to CANCELLED, with inventory restored exactly once in the same transaction. Concurrent cancellation must not restore twice.
NFR-01A Security: Same-origin deployment, Spring Session JDBC, secure session cookies, CSRF token bootstrap, session rotation and invalidation, and 401/403/404 semantics shall be tested.
NFR-03A Reliability: Completed checkout outcomes shall be retained at least 24 hours; no deduplication guarantee is made after expiry.
Acceptance criteria: REV-01 through REV-12 in [checkout acceptance tests](../testing/checkout-acceptance-tests.md). All are planned, not executed.
