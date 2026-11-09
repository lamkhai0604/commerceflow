# Decision Log — CommerceFlow

Status values: **Approved**, **Proposed** (awaiting decision), **On hold**, **Implemented**.
Decision authority: Tech Lead / Product Owner (lamkhai0604).

## Architecture decisions

| ID | Decision | Status | Date | Record |
| --- | --- | --- | --- | --- |
| D1 | Crash-safe idempotent checkout: customer-scoped keys, first cart snapshot, lease and fencing, one atomic business transaction, replay retained at least 24 h | Approved | 2026-10-29 | [Design baseline](architecture/design-baseline.md) |
| D2 | Mock payment outcomes: decline is terminal and replayable (402); outage is retryable (503); neither changes stock or orders | Approved | 2026-10-29 | [Design baseline](architecture/design-baseline.md) |
| D3 | Spring Security with Spring Session JDBC, same-origin deployment, CSRF token bootstrap, secure session cookie, 401/403/404 semantics | Approved | 2026-10-29 | [Design baseline](architecture/design-baseline.md) |
| D4 | Canonical documents: SRS v1.1 with the approved addendum, OpenAPI v1.0 design baseline, checkout sequence v1.4; diagram PDF parity still to be verified | Approved (verification open) | 2026-10-29 | [Design baseline](architecture/design-baseline.md) |
| ADR-006 | Checkout idempotency and cancellation | Approved (design) | 2026-10-29 | [ADR-006](architecture/adr/ADR-006-checkout-idempotency.md) |
| S1C-ADR-01 | Isolated HTTPS integration environment (Caddy, same origin, PostgreSQL 17) | Approved | 2026-11-04 | [Sprint 1C](sprints/sprint-1c.md) |
| S1C-ADR-02 | Real-browser E2E with Playwright Chromium, no mocked API for acceptance | Approved | 2026-11-04 | [Sprint 1C](sprints/sprint-1c.md) |
| S1C-ADR-03 | Dedicated integration CI workflow, read-only permissions, no deployment | Approved | 2026-11-04 | [Sprint 1C](sprints/sprint-1c.md) |
| S1C-ADR-04 | Context-aware HTTP 401 handling in the frontend | Architecture approved; quiet startup implemented in Sprint 2 (S2-T03), remaining behavior pending | 2026-11-04 | [Sprint 1C](sprints/sprint-1c.md) |
| S1C-ADR-05 | Evidence, secrets and data isolation for tests | Approved | 2026-11-04 | [Sprint 1C](sprints/sprint-1c.md) |
| S2-D01 | Replace the theme-derived storefront with an original design; remove third-party theme code, imagery and copy | Approved — Product Owner | 2026-11-08 | [Sprint 2](sprints/sprint-2.md) |
| S2-D02 | Complete the storefront redesign with demonstration data before implementing the catalog, cart and checkout APIs | Approved — Product Owner | 2026-11-08 | [Sprint 2](sprints/sprint-2.md) |
| S2-D03 | Frontend build on Vite with React 18 (from Create React App and React 17); Vitest replaces Jest | Approved — Product Owner | 2026-11-08 | [Sprint 2](sprints/sprint-2.md) |
| S2-D04 | Tailwind CSS with project-owned components as the single styling system; Bootstrap, styled-components and, after the redesign, MUI are removed | Approved — Product Owner | 2026-11-08 | [Sprint 2](sprints/sprint-2.md) |
| S2-D05 | Product name CommerceFlow; English interface; prices in US dollars | Approved — Product Owner | 2026-11-08 | [Storefront requirements](requirements/storefront-requirements.md) |
| S2-D06 | Demonstration catalog domain: home and lifestyle goods | Approved — Product Owner | 2026-11-08 | [Storefront requirements](requirements/storefront-requirements.md) |
| S2-D07 | Free services and free-tier hosting only; no paid services | Approved — Product Owner | 2026-11-08 | [AGENTS.md](../AGENTS.md) |
| S2-D08 | Storefront imagery from Unsplash under the Unsplash License, self-hosted and listed with source links in `frontend/public/images/SOURCES.md`; photographs showing people are not used | Approved — Product Owner | 2026-11-08 | [Storefront requirements](requirements/storefront-requirements.md) |
| S2-D09 | Storefront design (layout, colour, typography and components) as reviewed in the Sprint 2 design canvas | Approved — Product Owner | 2026-11-08 | [Sprint 2](sprints/sprint-2.md) |
| S2-D10 | Contributors may merge pull requests into `develop` after required CI checks pass; `develop` to `master` remains with the Product Owner | Approved — Product Owner | 2026-11-08 | [AGENTS.md](../AGENTS.md) |
| S3-D01 | Host the Spring Boot API on a Render free web service (Docker) and PostgreSQL on a Neon free project; no paid tiers. The free web service sleeps after 15 minutes without traffic, and the storefront tells visitors while it wakes | Approved — Product Owner | 2026-11-08 | [Deployment](DEPLOYMENT.md) |
| S3-D02 | Keep one origin in production: Vercel rewrites `/api/v1/*` to the Render service, so session cookies stay first-party and the existing CSRF design (D3) applies unchanged | Approved — Product Owner | 2026-11-08 | [Deployment](DEPLOYMENT.md) |
| S3-D03 | Repository layout: the storefront moves to `frontend/`, the browser E2E suite becomes its own npm package in `e2e/`, and the root keeps only records and hosting configuration | Approved — Product Owner | 2026-11-08 | [WORKFLOW.md](WORKFLOW.md) |
| S4-D01 | Checkout runs in one PostgreSQL transaction guarded by a transaction-scoped advisory lock per idempotency key. Payment is an in-process simulation with no external side effect, so a crash before commit leaves nothing behind and a crash after commit is replayed from the stored outcome; the lease, fencing and recovery-worker proposal of the checkout reliability supplement is not needed for this scope | Accepted — implementing contributor, within the approved policy (D1, D2, ADR-006); for Product Owner review at the Sprint 4 review | 2026-11-09 | [Sprint 4](sprints/sprint-4.md) |
| S4-D02 | Demonstration payment outcomes are chosen on the checkout page (approved, declined, temporarily unavailable) so each D2 path can be shown. Declined and insufficient-stock results are terminal and replayable for the key; temporarily unavailable is not stored, so the same key can be retried | Accepted — implementing contributor, within the approved policy (D1, D2, ADR-006); for Product Owner review at the Sprint 4 review | 2026-11-09 | [Sprint 4](sprints/sprint-4.md) |
| S4-D03 | Frontend cart handling: a signed-in customer's cart lives only on the server (the browser keeps no copy, so a reload never merges it twice); log-out removes it from the browser; changes are saved one at a time in the order made, and a rejected change reloads the server cart. Cart and order writes that the server rejects for CSRF are sent once more with a fresh token, because a CSRF rejection happens before any processing (the token changes at log-in). A checkout keeps its idempotency key only while the outcome is not final (no answer, payment service unavailable, still processing) | Accepted — implementing contributor; for Product Owner review at the Sprint 4 review | 2026-11-09 | [Sprint 4](sprints/sprint-4.md) |
| S5-D01 | Administration follows the approved OpenAPI v1.0 baseline (D4). Additions that do not change existing behaviour: `GET /admin/products` and `GET /admin/orders/{orderId}` (the console needs them), list filters, an optional `reason` on status changes, an optional `expectedStockQuantity` for compare-and-set stock edits, and an audit log | Accepted — implementing contributor, within the approved baseline; for Product Owner review at the Sprint 5 review | 2026-11-09 | [Sprint 5](sprints/sprint-5.md) |
| S5-D02 | Administrator accounts are made by the Product Owner granting the ADMIN role to an account that already exists, with one SQL statement in the Neon console. No administrator credential lives in code, configuration or chat, and there is no way to become an administrator through the application. An administrator keeps the CUSTOMER role and can still shop | Proposed — needs Product Owner confirmation before the first administrator account is created | 2026-11-09 | [Deployment guide](DEPLOYMENT.md#administrator-accounts) |
| S5-D03 | Cancelling an order moves it CONFIRMED → CANCELLED with a conditional update, sets payment to REFUNDED (demonstration payment, nothing is returned) and restores stock in the same transaction only if exactly one row changed; stock rows are locked in product-ID order like checkout. Shipped, delivered and cancelled orders cannot be cancelled | Accepted — implementing contributor, within ADR-006 and FR-16A; for Product Owner review at the Sprint 5 review | 2026-11-09 | [Sprint 5](sprints/sprint-5.md) |
| S5-D04 | Stock visibility (backlog B-01): catalog products carry an optional `stockLeft` when 5 or fewer units remain, and the insufficient-stock problem lists `shortages` (product, requested, available). Both are additive fields | Accepted — implementing contributor, backward-compatible; for Product Owner review at the Sprint 5 review | 2026-11-09 | [Sprint 5](sprints/sprint-5.md) |

## Change requests

| ID | Change | Status | Date | Record |
| --- | --- | --- | --- | --- |
| CR-01 | `GET /api/v1/auth/csrf` is the CSRF bootstrap route (the baseline's relative `/auth/csrf` resolves to it under the `/api/v1` server prefix) | Implemented | 2026-10-29 | See below |
| CR-02 | Remove the inactive Forgotten Password link from the login dialog | Implemented (PR #15) | 2026-10-29 | [Frontend authentication](sprints/sprint-1b/frontend-authentication.md) |
| CR-03 | Replace the legacy client-side login (user list fetched and compared in the browser, `access_token` in `localStorage`) with server sessions | Implemented (PR #15, issue #14) | 2026-11-04 | [Frontend authentication](sprints/sprint-1b/frontend-authentication.md) |
| CR-04 | Standardized error handling: required application `code`, CSRF versus access-denied codes, safe 500/503 responses, request IDs | Approved; implemented in the backend (PR #10) | 2026-11-02 | [CR-04](change-requests/CR-04-standardized-error-handling.md) |
| CR-05 | Registration limits in Unicode code points: `fullName` 1–50, normalized email up to 254, password 12–128 | Approved; implemented (PR #10, PR #15) | 2026-11-02 | [Contract review](api/auth-contract-v1.1-review.md) |
| CR-06 | Documentation consistency between the UI/UX specification and the backend contract | Approved (documentation) | 2026-11-03 | [UI/UX specification](sprints/sprint-1b/authentication-uiux-specification.md) |
| CR-S1C-01 | Remove the duplicate `X-Request-ID` header on MVC error responses | Implemented | 2026-11-04 | [CR-S1C-01](change-requests/CR-S1C-01-correlation-header.md) |
| CR-S1C-02 | Fail-closed cleanup for the E2E environment | Implemented | 2026-11-04 | [Verification](sprints/sprint-1c/cr-s1c-02-verification.md) |
| CR-S1C-03 | Stop tracking the root `.env`; move public metadata to the README | Implemented | 2026-11-05 | [CR-S1C-03](change-requests/CR-S1C-03-environment-files.md) |
| CR-S3-01 | Catalog fields and filters for the storefront: product `slug`, image, details; category product count; price and availability filters; lookup by slug | Approved — Product Owner | 2026-11-08 | [CR-S3-01](change-requests/CR-S3-01-catalog-storefront-fields.md) |
| CR-S4-01 | Guest cart and guest checkout; choice of guest or member at checkout; cart merge on log-in; guest order lookup; guest orders not attached to later accounts | Approved — Product Owner | 2026-11-09 | [CR-S4-01](change-requests/CR-S4-01-guest-cart-and-checkout.md) |

### CR-01 — CSRF route

The Sprint 1A baseline listed an unversioned `/auth/csrf` route, while the Sprint 1B plans used `/api/v1/auth/csrf`. Because the OpenAPI document declares the server prefix `/api/v1`, both describe the same endpoint; the documentation now uses the full route everywhere. Approved D1–D3 decisions are unchanged. Implementation followed in Sprint 1B.
