# Current Status — CommerceFlow

Updated: 2026-11-08

| Field | Value |
| --- | --- |
| Production (`master`) | `a02d7c5` — Sprint 1C release (authentication foundation) |
| Integration (`develop`) | `0d836f2` — Sprint 2 storefront (PRs #21 and #22) |
| Active sprint | [Sprint 2 — Storefront cleanup and redesign](sprints/sprint-2.md) |
| Active branch | none; Sprint 2 awaits release into `master` |

## Completed in Sprint 2

- Design system components, demonstration catalog with licensed images, redesigned home, listing and product pages, cart drawer and page, demo checkout with confirmation, authentication UI without MUI, error boundary, E2E-16 storefront flow.
- Verification (local, Node 22.23): typecheck, ESLint, 121 Vitest tests, production build, browser checks at 1280 px and 375 px, Lighthouse mobile (performance 93, accessibility 100), E2E-16 against the local production build. The HTTPS E2E suite runs in CI.

## Known limitations

- Catalog, cart and checkout use demonstration data in the browser; no order is created on a server.
- No backend is hosted for the Vercel deployment, so sign-in on Vercel cannot complete. Backend hosting is the first item of the next sprint.
- Product variants shown in the design review are not implemented (not in the API baseline).

## Next action

The Product Owner reviews and merges the Sprint 2 release pull request (`develop` → `master`). Next sprint: host the backend and database on free tiers, route `/api/v1` from Vercel, and replace the demonstration catalog with the catalog API.
