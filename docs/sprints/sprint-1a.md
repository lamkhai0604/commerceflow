# Sprint 1A — System Design Baseline

| Field | Value |
| --- | --- |
| Goal | Agree the architecture, data model, API contract and checkout reliability rules before any feature work |
| Result | Design baseline accepted by the Tech Lead on 2026-10-29 (decisions D1–D3). No application code in this sprint |
| Pull requests | #4 (design baseline and Sprint 1B gates), #9 (baseline alignment notes), #8 (CR-01) |

## 1. Accepted architecture

- React/TypeScript frontend; Java 21 / Spring Boot modular-monolith backend.
- PostgreSQL with Flyway; 10 business tables, plus separate infrastructure tables for Spring Session and checkout idempotency.
- Session-based authentication with Spring Security and Spring Session JDBC.
- Frontend and API served from the same origin behind a reverse proxy in production.
- Product-level inventory; USD prices as `NUMERIC(12,2)`; immutable order line and address snapshots.
- Mock payments only; real payment credentials are never processed.
- Branches: `develop` for integration, `master` protected for releases.

Full decisions: [Design baseline](../architecture/design-baseline.md) and [Decision log](../DECISIONS.md).

## 2. Deliverables

| Area | Document |
| --- | --- |
| Requirements | [SRS v1.1](../requirements/CommerceFlow-SRS-v1.1-REVIEW.docx) with the [approved design addendum](../requirements/SRS-Approved-Design-Addendum-v1.0-FINAL.md) |
| Architecture | [Design baseline](../architecture/design-baseline.md), [ADR-006](../architecture/adr/ADR-006-checkout-idempotency.md), [checkout reliability design](../architecture/checkout-reliability-design.md), [sign-off](../architecture/Sprint1A-Design-Signoff-v1.0-FINAL.pdf) |
| Diagrams | [Use case, class, login and checkout sequence, physical ERD](../architecture/diagrams/), [system architecture](../architecture/System-Architecture.drawio) |
| API | [OpenAPI v1.0 design baseline](../api/openapi-v1.0-DESIGN-BASELINE.yaml), [checkout policy contract](../api/checkout-policy-contract.md) |
| Testing | [Test strategy](../testing/Test-Strategy-v1.0-DRAFT.docx), [traceability matrix](../testing/Requirements-Traceability-Matrix-v1.0.xlsx), [checkout acceptance tests](../testing/checkout-acceptance-tests.md) |

## 3. Design quality checks

| Check | Result |
| --- | --- |
| OpenAPI | 19 paths, 21 operations, no unresolved local `$ref` |
| draw.io sources | 7 files parse as valid XML |
| Diagram PDFs versus draw.io sources | **Open**: the PDFs are illustrative and have not been verified as exact exports |
| Checkout scenarios REV-01 to REV-12 | Specified; executed when checkout is implemented |

## 4. Alignment with the existing code

Comparing the baseline with the repository at the end of the sprint found:

- **CSRF route:** the OpenAPI server prefix `/api/v1` plus `/auth/csrf` gives `GET /api/v1/auth/csrf`; recorded as CR-01.
- **Registration fields:** the baseline uses `fullName` and a 12–128 character password. An earlier UI draft with first/last name, phone and an 8-character minimum was aligned to the baseline.
- **Legacy frontend login:** `authSaga.tsx` fetched a user list, compared passwords in the browser and stored `access_token` in `localStorage`. Recorded as CR-03 (security finding); replaced in Sprint 1B.
- **Forgotten Password link:** the link pointed to `/` and did nothing; removal approved as CR-02.
- **Database:** migration V1 only creates the `commerceflow` schema; authentication tables are added in Sprint 1B.

## 5. Gates for Sprint 1B (authentication)

Before implementation:

1. Same-origin routing plan for development and production.
2. Session JDBC schema ownership and local PostgreSQL configuration.
3. Session cookie flags for local HTTP versus production HTTPS.
4. Contract tests for CSRF bootstrap, login, session rotation, logout and role-based access.
5. Safe admin provisioning: no public admin registration, no hard-coded credentials.

Acceptance criteria:

- Registration normalizes email and enforces uniqueness; passwords use an adaptive hash.
- Login creates a server-side session and rotates the session identifier.
- CSRF is enforced on POST/PUT/PATCH/DELETE, including login and logout.
- Logout invalidates the session; the old session cannot reach protected routes.
- A customer gets 403 on admin APIs; anonymous requests to protected routes get 401.
- No authentication token is stored in `localStorage`; secrets and sensitive bodies are never logged.
- Session persistence is tested against real PostgreSQL (Testcontainers).

Deferred to the checkout sprint: idempotency reservation and replay, leases and fencing, atomic stock and order commit, mock payment outcomes, once-only cancellation restock, and the related concurrency and fault-injection tests.

## 6. Open items

- Verify diagram PDFs against their draw.io sources (presentation QA).
- Execute REV-01 to REV-12 when checkout is implemented.
