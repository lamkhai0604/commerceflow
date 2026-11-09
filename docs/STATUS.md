# Current Status — CommerceFlow

Updated: 2026-11-09

| Field | Value |
| --- | --- |
| Production (`master`) | `2b93a26` — Sprint 3 complete: catalog API on Render and Neon, storefront on `https://khai-shop.vercel.app` |
| Integration (`develop`) | `c0c6d65` |
| Active sprint | none; Sprint 3 closed ([review](sprints/sprint-3.md#sprint-review-2026-11-09)) |

## Live system

Catalog, sign-up, log-in and log-out work on the production site; see [DEPLOYMENT.md](DEPLOYMENT.md) for services and operations.

## Known limitations

- Cart and checkout run in the browser; there is no server-side cart or order yet.
- Free-tier API cold starts take about two minutes after 15 minutes without traffic.
- SRS FR-09 (no guest cart) conflicts with the browser cart for signed-out visitors; to be decided in the cart sprint.

## Next action

Plan Sprint 4 (server-side cart and checkout per FR-09 to FR-13, ADR-006) with the Product Owner.
