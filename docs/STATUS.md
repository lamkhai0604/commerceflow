# Current Status — CommerceFlow

Updated: 2026-11-08

| Field | Value |
| --- | --- |
| Production (`master`) | `16794a3` — Sprint 2 release (redesigned storefront on demonstration data) |
| Integration (`develop`) | `a86460e` |
| Active sprint | [Sprint 3 — Catalog API and hosted backend](sprints/sprint-3.md) |
| Active branch | `feature/sprint-3-catalog-api` (S3-T01 to S3-T06) |

## Completed in the active branch

- Catalog schema and seed migrations, public catalog endpoints, frontend catalog over HTTP with wake-up handling, deployment assets and guide.
- Verification is listed in the sprint plan's progress notes.

## Known limitations

- Until the Product Owner creates the Render and Neon services (S3-T07), the production site has no API: the catalog shows its load-error state and sign-in cannot complete.
- Cart and checkout still run in the browser (server-side cart and orders are the next sprint).

## Next action

Merge the Sprint 3 pull request into `develop` after CI passes and open the release pull request. After the Product Owner merges it, create the Neon and Render services following [DEPLOYMENT.md](DEPLOYMENT.md) and verify the live site.
