# Current Status — CommerceFlow

Updated: 2026-11-09

| Field | Value |
| --- | --- |
| Production (`master`) | Sprint 5 released (administration and stock visibility) on `https://khai-shop.vercel.app` |
| Integration (`develop`) | `29b31f6` (Sprint 5) |
| Active sprint | [Sprint 6](sprints/sprint-6.md): MVP completion and hardening, branch `feature/sprint-6-mvp-completion` (all tasks implemented, awaiting CI and release) |

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

## Sprint 6 verification (2026-11-10, branch `feature/sprint-6-mvp-completion`)

- Backend: `AdminIntegrationTest` 15/15 against local PostgreSQL 16, run twice on fresh databases (CI runs it on Testcontainers).
- Frontend: typecheck, lint, 165/165 tests, production build; E2E package typecheck and lint.
- Real browser (Chromium) on the production build served with the exact `vercel.json` headers: checkout, member, administration and product-creation flows pass with no Content-Security-Policy violations; pointer cursor verified on buttons, links, menu items, radios, checkboxes and selects.
- NFR-02 measured locally with 1,000 products at 20 users: p97.5 at most 158 ms ([report](testing/performance-nfr-02.md)).
- The Docker-based HTTPS E2E (including E2E-19) was not run locally; CI runs it.

## Next action

Open the Sprint 6 pull request into `develop`; after CI passes, merge, open the release pull request for the Product Owner, then live checks, the review and the Product Owner's trial.
