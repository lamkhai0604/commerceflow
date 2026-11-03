# CommerceFlow — Sprint 1A Design Baseline

**Status:** Tech Lead-approved design baseline (2026-10-29); **not implemented**.

## Architecture
- React/TypeScript frontend; Java 21 / Spring Boot modular-monolith backend.
- PostgreSQL + Flyway; 10 business tables, with Spring Session and checkout idempotency as separate infrastructure tables.
- Session-based authentication via Spring Security and Spring Session JDBC.
- Same-origin frontend and API behind a reverse proxy in production.
- Product-level inventory, USD prices as NUMERIC(12,2), immutable order line/address snapshots.
- Mock payments only; never process real payment credentials.

## Approved checkout behavior
- Customer-scoped idempotency key, retained at least 24 hours after completion.
- First accepted checkout captures a canonical explicit request and cart snapshot; retries refer to that snapshot, not the subsequently cleared cart.
- Same key and matching request replay the stored HTTP status/body. Different explicit request fields return 409.
- Concurrent same-key requests: only one active worker; the other receives retriable 409 with Retry-After.
- Reserve key durably; lease/fencing generation guards recovery and stale-worker commits.
- Conditional stock updates, order creation, immutable snapshots, cart cleanup, and successful idempotency outcome commit atomically.
- Terminal mock-payment decline: replayable 402, no stock/order/cart changes. Temporary mock-payment outage: retryable 503, no business changes.
- Cancellation allowed only from CONFIRMED; restore inventory exactly once in the same transaction.
- Completed results may be cleaned up after retention; the guarantee does not extend beyond expiration.

## Session security
- HttpOnly/Secure production session cookie, appropriate SameSite and expiration.
- Rotate session ID on login, invalidate on logout.
- GET /api/v1/auth/csrf returns a token in JSON; X-CSRF-TOKEN required for state-changing endpoints, including login/logout.
- 401 unauthenticated; 403 insufficient permissions/CSRF; 404 for another customer's order.

## Quality gates
- Tests accompany every feature PR: JUnit 5, Mockito, Spring Boot integration tests, PostgreSQL Testcontainers, and security/concurrency scenarios.
- Playwright E2E for critical flows; k6 for defined performance scenarios.
- develop = integration; master = protected production. No direct master changes.

## Scope and caveats
This is a design baseline, **not evidence of implemented features or passing tests**. The complete editable SRS, diagrams, traceability matrix, OpenAPI contract, and sign-off are in the separately delivered Sprint 1A Final Design package. Diagram PDF/draw.io export parity remains open for visual QA.

Next: review this documentation PR, verify canonical diagram exports, and prepare a separate Sprint 1B authentication implementation PR.
