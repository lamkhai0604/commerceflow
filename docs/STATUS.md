# Current Status — CommerceFlow

Updated: 2026-11-09

| Field | Value |
| --- | --- |
| Production (`master`) | Sprint 6 released (`f936258`): product creation, account page, security headers, on top of administration and checkout, at `https://khai-shop.vercel.app` |
| Integration (`develop`) | `f936258` plus the review fixes (branch `review/sprint-5-6-release-candidate`) |
| Active sprint | none; Sprint 6 closed ([review](sprints/sprint-6.md#sprint-review-2026-11-11)); release candidate with review fixes R-10 to R-12 awaiting CI and release |

## Live system

Catalog, cart, guest and member checkout, order history, order tracking, sign-up, log-in and log-out work on the production site; see [DEPLOYMENT.md](DEPLOYMENT.md) for services and operations.

## Known limitations

- Administrator accounts are made by the Product Owner in the Neon console ([Administrator accounts](DEPLOYMENT.md#administrator-accounts), decision S5-D02, applied once, explicit confirmation pending).
- Product photos cannot be uploaded; image upload, customer self-cancellation, emails and real payments are not implemented.
- Free-tier API cold starts take about two minutes after 15 minutes without traffic.
- Backlog B-10 to B-16 of the [Sprint 5 and 6 review](reviews/sprint-5-6-product-review.md) and B-03, B-04, B-06 to B-08 of the [Sprint 4 review](reviews/sprint-4-product-review.md) remain open.

## Sprint 4 verification (2026-11-09, branch `feature/sprint-4-checkout`)

- Backend: unit and MVC tests 51/51; `CommerceIntegrationTest` 10/10 against local PostgreSQL 16 (CI runs it on Testcontainers); local API smoke 28/28; concurrency checks (8 buyers for the last unit: one order; same-key requests: one order).
- Frontend: typecheck, lint, 147/147 tests, production build.
- Real browser (Chromium, local API and Vite): guest checkout through the choice dialog, declined and unavailable payments, confirmation, order tracking; member log-in at checkout with cart merge, server cart kept across reload, member checkout, order history and detail; no horizontal scroll at 375 px.

## Release candidate verification (2026-11-11, branch `review/sprint-5-6-release-candidate`)

- Live checks on the Sprint 6 release passed (headers, purchase flows with no policy violations, pointer cursor, account profile API and page, customer access to administration refused); see the [review](reviews/sprint-5-6-product-review.md).
- Accessibility scan of 13 screens at 1280 px and 375 px: no violations; focus checks pass.
- Review fixes R-10 to R-12: frontend typecheck, lint and tests, verified in a real browser.

## Next action

Merge the review fixes into `develop` after CI, release to `master` (Product Owner), then the Product Owner follows the [demonstration guide](DEMO-GUIDE.md) (section 8 for administration). Decisions needed from the Product Owner: S5-D02 confirmation, B-10 (photo upload), B-11 (customer cancellation) and B-12 (keep-warm request).
