# Current Status — CommerceFlow

Updated: 2026-11-08

| Field | Value |
| --- | --- |
| Production (`master`) | `16794a3` — Sprint 2 release (redesigned storefront on demonstration data) |
| Integration (`develop`) | `9f0971d` — Sprint 3 catalog API (PR #25) |
| Active sprint | [Sprint 3 — Catalog API and hosted backend](sprints/sprint-3.md) |
| Active branch | none; Sprint 3 release pending, then S3-T07 (service setup) |

## Completed in Sprint 3 so far

- Catalog schema and seed migrations, public catalog endpoints, frontend catalog over HTTP with wake-up handling, deployment assets and guide.
- Verification is listed in the sprint plan's progress notes.

## Known limitations

- Until the Product Owner creates the Render and Neon services (S3-T07), the production site has no API: the catalog shows its load-error state and sign-in cannot complete.
- Cart and checkout still run in the browser (server-side cart and orders are the next sprint).

## Next action

The Product Owner merges the Sprint 3 release pull request into `master`, then create the Neon and Render services following [DEPLOYMENT.md](DEPLOYMENT.md) and verify the live site.
