# Sprint 6 — MVP Completion and Hardening

| Field | Value |
| --- | --- |
| Goal | Close the remaining gaps against the approved SRS: administrators can create products (FR-14), the account profile endpoint of the design baseline exists, and the unmeasured performance target (NFR-02) is measured; harden the storefront's response headers and make end-to-end failures diagnosable |
| Requirements | SRS FR-14, NFR-02, NFR-05; OpenAPI v1.0 baseline (`POST /admin/products`, `GET /account/profile`); review backlog B-05 of the [Sprint 4 review](../reviews/sprint-4-product-review.md) |
| Decisions | S6-D01 and S6-D02 in the [decision log](../DECISIONS.md) |
| Base | `develop` at `29b31f6` |

## Tasks

| ID | Task | Status |
| --- | --- | --- |
| S6-T01 | Records: sprint plan, decisions, OpenAPI v1.5 | In progress |
| S6-T02 | Product creation: `POST /admin/products` (baseline `ProductWriteRequest` plus optional `imagePath`), slug conflict, audit entry; administration screen with image choice | Proposed |
| S6-T03 | `GET /account/profile` and an Account page (profile, order history, administration link) | Proposed |
| S6-T04 | NFR-02: measure product listing latency with 1,000 seeded products at 20 concurrent users; add an index only if the target is missed | Proposed |
| S6-T05 | Security response headers for the storefront (Content-Security-Policy and others), verified against every screen | Proposed |
| S6-T06 | Diagnosable E2E: failures report the failing step by a fixed name (no data); E2E-19 for product creation | Proposed |
| S6-T07 | Copy: returns text is labelled as demonstration policy (backlog B-05) | Proposed |
| S6-T08 | Release, live verification, review and demonstration guide update | Proposed |

## Acceptance

- An administrator creates a product with name, slug, category, price, stock, description and an image from the library; it appears in the store when active, with a placeholder image if none is chosen. A duplicate slug returns 409 and creates nothing. Customers get 403; every creation is audited.
- `GET /account/profile` returns the signed-in customer's profile and 401 otherwise.
- The product listing measurement is recorded with its method, data size, concurrency and result against the NFR-02 target of p95 ≤ 500 ms.
- The storefront sends a Content-Security-Policy and related headers, and every screen still works with no policy violations in the browser console.
- A failed E2E scenario names the step that failed.
- Backend CI, Frontend CI and the HTTPS integration workflow pass; live checks pass after release.

## Out of scope

Image upload (needs object storage; see S6-D01), customer self-cancellation, emails, real payments, product category management, and per-client rate limiting at the network edge (backlog B-03).
