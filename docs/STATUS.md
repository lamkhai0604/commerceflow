# Current Status — CommerceFlow

Updated: 2026-11-09

| Field | Value |
| --- | --- |
| Production (`master`) | `46a0b5a`+: Sprint 6 and its review fixes released (`https://khai-shop.vercel.app`) |
| Integration (`develop`) | `0b292d9` (Sprint 7) plus dependency and Lighthouse fixes (branch `maintenance/dependency-security`) |
| Active sprint | none; Sprint 7 merged into `develop` and its release pull request awaits the Product Owner; maintenance: dependency security and Lighthouse fixes ([audit](testing/quality-audit-2026-11.md)) |

## Live system

Catalog, cart, guest and member checkout, order history, order tracking, sign-up, log-in and log-out work on the production site; see [DEPLOYMENT.md](DEPLOYMENT.md) for services and operations.

## Known limitations

- Administrator accounts are made by the Product Owner in the Neon console ([Administrator accounts](DEPLOYMENT.md#administrator-accounts), decision S5-D02, applied once, explicit confirmation pending).
- Product photos cannot be uploaded; image upload, customer self-cancellation, emails and real payments are not implemented.
- Free-tier API cold starts take about two minutes after 15 minutes without traffic.
- Backlog B-10 to B-13 of the [Sprint 5 and 6 review](reviews/sprint-5-6-product-review.md) (B-14 to B-16 are done in Sprint 7, except editing a product's address and managing categories) and B-03, B-04, B-06 to B-08 of the [Sprint 4 review](reviews/sprint-4-product-review.md) remain open.

## Sprint 4 verification (2026-11-09, branch `feature/sprint-4-checkout`)

- Backend: unit and MVC tests 51/51; `CommerceIntegrationTest` 10/10 against local PostgreSQL 16 (CI runs it on Testcontainers); local API smoke 28/28; concurrency checks (8 buyers for the last unit: one order; same-key requests: one order).
- Frontend: typecheck, lint, 147/147 tests, production build.
- Real browser (Chromium, local API and Vite): guest checkout through the choice dialog, declined and unavailable payments, confirmation, order tracking; member log-in at checkout with cart merge, server cart kept across reload, member checkout, order history and detail; no horizontal scroll at 375 px.

## Sprint 7 verification (2026-11-21, branch `feature/sprint-7-admin-completeness`)

- Backend: `AdminIntegrationTest` 18/18 against local PostgreSQL 16, run twice on fresh databases (CI runs it on Testcontainers).
- Frontend: typecheck, lint, 170/170 tests, production build; E2E package typecheck and lint.
- Real browser (Chromium, local API and Vite): the extended E2E-19 steps pass (create a product, move it to another category with another photo, the store shows the new category, the history lists the changes, a duplicate address is refused); no page errors.
- The Docker-based HTTPS E2E was not run locally; CI runs it.
- Live production on 2026-11-21: storefront and API healthy (the first request after idle waits for the free instance to wake).

## Next action

Open the Sprint 7 pull request into `develop`; after CI passes, merge and open the release pull request for the Product Owner. Decisions still needed from the Product Owner: S5-D02 confirmation, B-10 (photo upload), B-11 (customer cancellation) and B-12 (keep-warm request).
