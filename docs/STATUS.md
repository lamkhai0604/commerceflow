# Current Status — CommerceFlow

Updated: 2026-11-08

| Field | Value |
| --- | --- |
| Production (`master`) | `19f13ec` — Sprint 3 release (catalog API); storefront `https://khai-shop.vercel.app`, API on Render |
| Integration (`develop`) | `7267f2f` — repository layout (PR #29) |
| Active sprint | [Sprint 3 — Catalog API and hosted backend](sprints/sprint-3.md) |
| Active branch | `fix/render-url`: storefront rewrite to the actual Render URL |

## Completed in Sprint 3 so far

- Catalog schema and seed migrations, public catalog endpoints, frontend catalog over HTTP with wake-up handling, deployment assets and guide.
- Verification is listed in the sprint plan's progress notes.

## Known limitations

- Production `/api/v1` points at the wrong Render host until the rewrite correction is released; the catalog shows its load-error state meanwhile.
- Cart and checkout still run in the browser (server-side cart and orders are the next sprint).

## Next action

Merge the rewrite correction into `develop`, release it to `master`, then verify catalog, sign-up, log-in and cookies on `https://khai-shop.vercel.app`.
