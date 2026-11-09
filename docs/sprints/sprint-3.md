# Sprint 3 — Catalog API and Hosted Backend

| Field | Value |
| --- | --- |
| Goal | Serve the storefront catalog from the Spring Boot API and PostgreSQL, hosted on free tiers behind the Vercel origin, so that browsing and sign-in work on the public site |
| Requirements | SRS FR-06 (list active products with pagination), FR-07 (search and filter), FR-08 (product details), NFR-05, NFR-06; SF-06; CR-S3-01. SF-10 (demonstration data in the browser) is retired by this sprint |
| Decisions | S3-D01, S3-D02, CR-S3-01 in the [decision log](../DECISIONS.md) |
| Base | `develop` at `a86460e` |
| Estimated duration | About one week (forecast) |

## Tasks

| ID | Task | Status |
| --- | --- | --- |
| S3-T01 | Records: decisions, CR-S3-01, OpenAPI catalog changes, sprint plan | Done (PR #25, merged) |
| S3-T02 | Flyway V5 catalog schema and V6 demonstration catalog seed (same 21 products and images as Sprint 2) | Done (PR #25, merged) |
| S3-T03 | Public catalog endpoints: `GET /categories`, `GET /products` (search, category, price, availability, sort, paging), `GET /products/{idOrSlug}`; validated parameters and Problem Details errors | Done (PR #25, merged) |
| S3-T04 | Tests: web-layer tests runnable without Docker; PostgreSQL integration tests required in CI; E2E-16 against the real API | Done (PR #25, merged) |
| S3-T05 | Frontend: HTTP catalog client replaces the in-browser data set; loading feedback while a sleeping server wakes | Done (PR #25, merged) |
| S3-T06 | Deployment assets: backend Dockerfile, Render blueprint, production settings (proxy headers, memory), Vercel rewrite, step-by-step setup guide | Done (PR #25, merged) |
| S3-T07 | Product Owner creates the Render and Neon services from the guide; live verification of health, catalog, sign-up, sign-in and cookies on the Vercel origin | Done (2026-11-09) |

## Acceptance

- The public site lists, filters and shows products from PostgreSQL; the in-browser demonstration data set is removed from the runtime.
- Sign-up, sign-in and sign-out work on the Vercel production origin with Secure, HttpOnly, SameSite=Lax cookies and CSRF protection.
- Backend CI (including the catalog PostgreSQL suite), Frontend CI and the HTTPS integration workflow pass.
- A visitor who arrives while the API is asleep sees that the server is starting, and the page completes without manual retry.

## Out of scope

Server-side cart, orders, checkout and administration (next sprints).

## Open questions

- SRS FR-09 states there is no guest cart in the MVP, while the Sprint 2 storefront keeps a browser cart for visitors who are not signed in. The server-side cart sprint must decide whether to require sign-in before adding to cart or to record a guest-cart change request.

## Progress notes

- S3-T01 to S3-T06 merged into `develop` through PR #25 (`9f0971d`) after Backend CI (including the catalog PostgreSQL suite), Frontend CI, the HTTPS integration workflow (16 scenarios, E2E-16 against the real catalog API) and the Vercel preview passed. The first CI run failed because an existing migration test hard-coded four migrations; the test now checks that every migration applies:
  - Flyway V5 (catalog tables per the ERD plus CR-S3-01 columns and constraints) and V6 (6 rooms, 21 products, identical to the Sprint 2 storefront).
  - Read-only catalog endpoints with parameter validation; malformed parameters give `INVALID_REQUEST`, absent or inactive products `RESOURCE_NOT_FOUND` (CR-04 texts).
  - Frontend reads the catalog over HTTP; safe reads retry while the free API instance wakes, with a visible notice. The in-browser data set is now a test fixture only.
  - Dockerfile, Render Blueprint, `prod` profile and Vercel rewrite; [deployment guide](../DEPLOYMENT.md).
- Evidence (local, revision recorded in the pull request): 21 backend web-layer tests; backend `prod` profile against PostgreSQL 16 applied V1–V6 and served the catalog; 128 frontend tests; browser flow through the production build and the real API (catalog, filters, cart, sign-up, log-in with HttpOnly SameSite=Lax cookie, log-out). PostgreSQL integration suites (including the new catalog suite) run in CI.
- S3-T07 (2026-11-08/09): the Product Owner released Sprint 3 to `master` (PRs #28 and #27) and created the Neon project and the Render service. Render assigned `commerceflow-api-4cx8.onrender.com` because the plain name was taken; the API answered `GET /api/v1/health` and `GET /api/v1/products` directly after a 135 s cold start, while the storefront's rewrite still pointed at the unsuffixed name. Correction: rewrite destination and a three-minute wake-up retry budget (PR pending). The correction was merged in PR #31 and released in PR #32 (`master` @ `2b93a26`).
- S3-D03 repository layout delivered in PR #29.

## Sprint review (2026-11-09)

Live verification on `https://khai-shop.vercel.app` after release `2b93a26` (Playwright, Chromium, from the cloud development environment):

| Check | Result |
| --- | --- |
| `GET /api/v1/health` through the Vercel origin | `{"status":"UP"}`; the first request after idle waited for a cold start, the next answered in 18 s |
| Home shows featured products from the API; no alert on startup | Pass |
| Room filter (Decor: 3 products), search ("lamp"), product page by slug | Pass |
| Sign-up, log-in, reload keeps the session, log-out (`/auth/me` returns 401 afterwards) | Pass |
| `SESSION` cookie on `khai-shop.vercel.app`: Secure, HttpOnly, SameSite=Lax, Path=/ | Pass |
| No credential-like data in `localStorage` or `sessionStorage` | Pass |
| `POST /auth/logout` without a CSRF token | 403 `CSRF_INVALID` |

- Delivered: S3-T01 to S3-T07 and the repository layout (S3-D03). All acceptance criteria are met.
- Test data: the live check registered one synthetic account (`live-check-<timestamp>@example.com`).
- Observations: free-tier cold starts take about two minutes; Neon runs PostgreSQL 18.6, newer than the versions Flyway 11 lists as tested (it logs a warning; all migrations apply). Both are tracked as follow-ups rather than defects.
- Reviewed: self-review only. Merged and released: yes (`master` @ `2b93a26`).
