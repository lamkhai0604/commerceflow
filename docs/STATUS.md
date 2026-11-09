# Current Status — CommerceFlow

Updated: 2026-11-09

| Field | Value |
| --- | --- |
| Production (`master`) | `ab99c61` — Sprint 4 released: guest and member cart, checkout, orders and tracking on `https://khai-shop.vercel.app` |
| Integration (`develop`) | `bfa2598` plus the release-candidate review fixes (branch `review/sprint-4-release-candidate`) |
| Active sprint | [Sprint 5](sprints/sprint-5.md): administration and stock visibility, branch `feature/sprint-5-administration` (all tasks implemented, awaiting CI and release) |

## Live system

Catalog, cart, guest and member checkout, order history, order tracking, sign-up, log-in and log-out work on the production site; see [DEPLOYMENT.md](DEPLOYMENT.md) for services and operations.

## Known limitations

- Administrator accounts are made by the Product Owner in the Neon console ([Administrator accounts](DEPLOYMENT.md#administrator-accounts), decision S5-D02, awaiting confirmation).
- Product creation, customer self-cancellation, emails and real payments are not implemented.
- Free-tier API cold starts take about two minutes after 15 minutes without traffic.
- Backlog B-03 to B-08 of the [Sprint 4 review](reviews/sprint-4-product-review.md) remain open.

## Sprint 4 verification (2026-11-09, branch `feature/sprint-4-checkout`)

- Backend: unit and MVC tests 51/51; `CommerceIntegrationTest` 10/10 against local PostgreSQL 16 (CI runs it on Testcontainers); local API smoke 28/28; concurrency checks (8 buyers for the last unit: one order; same-key requests: one order).
- Frontend: typecheck, lint, 147/147 tests, production build.
- Real browser (Chromium, local API and Vite): guest checkout through the choice dialog, declined and unavailable payments, confirmation, order tracking; member log-in at checkout with cart merge, server cart kept across reload, member checkout, order history and detail; no horizontal scroll at 375 px.

## Sprint 5 verification (2026-11-09, branch `feature/sprint-5-administration`)

- Backend: unit and MVC tests 51/51; `AdminIntegrationTest` 11/11 against local PostgreSQL 16, run twice on fresh databases (CI runs it on Testcontainers); `CommerceIntegrationTest` 10/10 and `CatalogIntegrationTest` 6/6 still pass with the shortage and `stockLeft` changes.
- Frontend: typecheck, lint, 162/162 tests, production build.
- Real browser (Chromium, local API and Vite): the E2E-18 steps pass (ship and deliver one order, cancel another with a reason and stock restored once, stock edit, customer sees the status, logged-out access closed); no horizontal scroll at 375 px; no page errors.
- The Docker-based HTTPS E2E (including E2E-18) was not run locally; CI runs it.

## Next action

Open the Sprint 5 pull request into `develop`; after CI passes, merge, open the release pull request for the Product Owner, then live checks, the review and the Product Owner's trial (grant the administrator role first).
