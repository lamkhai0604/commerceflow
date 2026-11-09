# Current Status — CommerceFlow

Updated: 2026-11-09

| Field | Value |
| --- | --- |
| Production (`master`) | `2b93a26` — Sprint 3 complete: catalog API on Render and Neon, storefront on `https://khai-shop.vercel.app` |
| Integration (`develop`) | `c0c6d65` |
| Active sprint | [Sprint 4](sprints/sprint-4.md): cart, checkout and orders, branch `feature/sprint-4-checkout` (S4-T01 to S4-T07 implemented) |

## Live system

Catalog, sign-up, log-in and log-out work on the production site; see [DEPLOYMENT.md](DEPLOYMENT.md) for services and operations.

## Known limitations

- Until Sprint 4 is released, production still runs the browser-only demo checkout.
- Free-tier API cold starts take about two minutes after 15 minutes without traffic.
- Order administration (status changes, cancellation, inventory) is planned for Sprint 5.

## Sprint 4 verification (2026-11-09, branch `feature/sprint-4-checkout`)

- Backend: unit and MVC tests 51/51; `CommerceIntegrationTest` 10/10 against local PostgreSQL 16 (CI runs it on Testcontainers); local API smoke 28/28; concurrency checks (8 buyers for the last unit: one order; same-key requests: one order).
- Frontend: typecheck, lint, 147/147 tests, production build.
- Real browser (Chromium, local API and Vite): guest checkout through the choice dialog, declined and unavailable payments, confirmation, order tracking; member log-in at checkout with cart merge, server cart kept across reload, member checkout, order history and detail; no horizontal scroll at 375 px.

## Next action

Open the Sprint 4 pull request into `develop`; after CI passes, merge, open the release pull request for the Product Owner, then run the live checks (S4-T08), the product review (S4-T09) and the demonstration guide (S4-T10).
