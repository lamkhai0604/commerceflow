# Current Status — CommerceFlow

Updated: 2026-11-09

| Field | Value |
| --- | --- |
| Production (`master`) | `ab99c61` — Sprint 4 released: guest and member cart, checkout, orders and tracking on `https://khai-shop.vercel.app` |
| Integration (`develop`) | `bfa2598` plus the release-candidate review fixes (branch `review/sprint-4-release-candidate`) |
| Active sprint | [Sprint 4](sprints/sprint-4.md): all tasks done; release candidate with review fixes awaiting release, then the Product Owner's hands-on trial |

## Live system

Catalog, cart, guest and member checkout, order history, order tracking, sign-up, log-in and log-out work on the production site; see [DEPLOYMENT.md](DEPLOYMENT.md) for services and operations.

## Known limitations

- Demo stock cannot be edited until administration (Sprint 5); see the [product review](reviews/sprint-4-product-review.md) backlog B-01 to B-09.
- Free-tier API cold starts take about two minutes after 15 minutes without traffic.
- Order administration (status changes, cancellation, inventory) is planned for Sprint 5.

## Sprint 4 verification (2026-11-09, branch `feature/sprint-4-checkout`)

- Backend: unit and MVC tests 51/51; `CommerceIntegrationTest` 10/10 against local PostgreSQL 16 (CI runs it on Testcontainers); local API smoke 28/28; concurrency checks (8 buyers for the last unit: one order; same-key requests: one order).
- Frontend: typecheck, lint, 147/147 tests, production build.
- Real browser (Chromium, local API and Vite): guest checkout through the choice dialog, declined and unavailable payments, confirmation, order tracking; member log-in at checkout with cart merge, server cart kept across reload, member checkout, order history and detail; no horizontal scroll at 375 px.

## Release candidate verification (2026-11-09, branch `review/sprint-4-release-candidate`)

- Live checks on `master` `ab99c61` passed (S4-T08); see the [product review](reviews/sprint-4-product-review.md).
- Review fixes R-01 to R-09: frontend typecheck, lint, 149/149 tests and build; backend unit and MVC tests 51/51; migration V8 applied on a fresh PostgreSQL 16 database; Chromium against the local API: insufficient stock (409), buying the last 3 units, sold-out afterwards, log-in notice at the bottom of the screen, and the full guest and member flows (19/19 checks).

## Next action

Merge the review fixes into `develop` after CI, release to `master` (Product Owner), then the Product Owner follows the [demonstration guide](DEMO-GUIDE.md); findings go to the backlog for Sprint 5 planning.
