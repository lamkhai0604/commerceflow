# CommerceFlow - Sprint 1A Design Baseline (FINAL)

**Status:** ACCEPTED DESIGN BASELINE (Tech Lead approval: 2026-10-29). **Implementation:** NOT STARTED. **Verification:** design-document checks only; runtime/security/concurrency claims remain untested.

## Approved decisions

### D1 - Crash-safe idempotent checkout
- `checkout_idempotency` is an infrastructure table with unique `(user_id, idempotency_key)` and durable `IN_PROGRESS`, `COMPLETED`, `RETRYABLE_FAILURE` states; terminal declined outcomes are stored as `COMPLETED` with an error response.
- Reserve the customer-scoped key in a short transaction; save canonical explicit request fields and the **first accepted cart snapshot**. Key semantics: a retry means replay or resume that first snapshot, never a request to purchase the current cart again.
- Completed success or terminal decline: return the exact stored HTTP status and response body. Changed explicit request fields: 409 `IDEMPOTENCY_PAYLOAD_MISMATCH`. Active concurrent same-key processing: 409 `IDEMPOTENCY_IN_PROGRESS` with Retry-After.
- Lease ownership is acquired by a database compare-and-swap; each takeover increments a fencing generation. Before any final business commit, the transaction verifies current lease owner/generation under a row lock. Stale workers cannot commit.
- The **one atomic business transaction** conditionally decrements stock, creates the order and immutable item/address snapshots, clears purchased cart lines, and records the successful replay outcome. Failed transaction rolls back all effects. Before recovery, check durable outcome and order association; after-commit lost HTTP response is replayed.
- Retain completed outcomes **at least 24 hours**; expiration may allow a later request with the same key to be treated as new. Cleanup must never delete an active lease. Define bounded retry policy and monitoring in implementation.
- Deterministic product ordering, conditional stock updates, and compatible admin stock SQL are mandatory; avoid mixing native stock writes with stale ORM-managed inventory state.

### D2 - Mock payment outcomes
- Only a deterministic mock payment simulator is allowed; never accept real card data. Mock outcome is stable for the accepted key and scenario.
- Simulated decline is terminal: store and replay a `402 PAYMENT_DECLINED` Problem Details response; no order, stock decrement, or cart clearing. A new payment attempt needs a new key.
- Temporary simulator outage is retryable: `503 PAYMENT_TEMPORARILY_UNAVAILABLE` with `Retry-After`, no business mutation. Persist a retryable state; takeover after lease expiration uses fencing and does not duplicate side effects.
- Stock contention returns `409 INSUFFICIENT_STOCK` and is terminal for the accepted snapshot; use a new key for a changed cart.

### D3 - Session / CSRF / deployment
- Spring Security + Spring Session JDBC (PostgreSQL); server-side session cookies: HttpOnly, Secure in production, SameSite=Lax when applicable, Path=/, appropriate expiry. Rotate session ID on login; invalidate session on logout.
- Same-origin production frontend and `/api` through a reverse proxy; local dev frontend proxy. Avoid credentialed cross-origin CORS in MVP.
- `GET /auth/csrf` returns the token in JSON. Send `X-CSRF-TOKEN` for state-changing endpoints including login and logout; refresh after auth transitions. Never treat SameSite as CSRF replacement. Confirm exact Spring Security matcher behavior with integration tests.
- Missing authentication: 401; authenticated but unauthorized: 403; invalid/missing CSRF: 403; other users' order details: 404. Validate HTTPS/cookies in staging before security release.

### D4 - Canonical diagram/document policy
- Canonical SRS: `requirements/CommerceFlow-SRS-v1.1-REVIEW.docx` plus `requirements/SRS-Approved-Design-Addendum-v1.0-FINAL.docx` (both together are the accepted SRS baseline).
- Canonical API: `api/openapi-v1.0-DESIGN-BASELINE.yaml`. Canonical checkout sequence source: `architecture/diagrams/Checkout-Sequence-v1.4-REVIEW.drawio` plus this baseline's recovery/cancel rules.
- Ten business tables remain unchanged; session and idempotency tables are **separate infrastructure**. Existing illustrative diagram PDFs must not be described as exact exports from draw.io. Re-export/visually approve all canonical diagrams before declaring diagram-render parity.
- Legacy DRAFT/REVIEW files remain historical source assets; this accepted design baseline does **not** assert every legacy artifact is individually final or fully semantically audited.

## Delivery and acceptance gates
- No feature without unit/integration/security tests in the same implementation PR; PostgreSQL Testcontainers for transaction/concurrency behavior, Playwright for user paths, k6 for performance targets.
- Required scenarios REV-01 through REV-12 from the signed review remain mandatory and **not yet executed**.
- `develop` is integration; `master` protected production. Docs PR from `docs/sprint-1a-system-design` into `develop` only after code/diff review. Sprint 1B implementation requires its own plan and PR.

## Residual risks and explicit nonclaims
- No runtime validation of fencing, crash recovery, security, deployment, performance, or integration tests has occurred.
- Diagram PDF/source parity is an open **presentation QA** task. These are design sign-off conditions for future implementation and release, not a claim of production readiness.
