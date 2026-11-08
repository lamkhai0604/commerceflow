# Current Status — CommerceFlow

Updated: 2026-11-08

| Field | Value |
| --- | --- |
| Production (`master`) | `a02d7c5` — Sprint 1C release (authentication foundation); Vercel production deployment succeeded |
| Integration (`develop`) | `bcf140c` |
| Active sprint | [Sprint 2 — Storefront cleanup and redesign](sprints/sprint-2.md) |
| Active branch | `feature/sprint-2-foundation` (tasks S2-T01 to S2-T03) |

## Completed in the active branch

- Theme-derived storefront code, assets and the legacy demo-service client removed; `src/` restructured by feature.
- Build migrated to Vite 8, React 18, Vitest and ESLint 10; CI workflows and `vercel.json` updated.
- Session restore at startup is silent on any failure.
- Verification (local, Node 22): type check, lint, 89 unit and component tests, production build, 26 lifecycle tests; browser check at 1280 px and 375 px with no startup alert.

## Known limitations

- The home page is an interim page until the redesign tasks land; it states that the redesign is in progress.
- No backend is hosted for the Vercel deployment, so sign-in on Vercel cannot complete. Backend hosting is planned after the redesign.
- The authentication dialog still uses MUI until S2-T11.

## Next action

Open the S2-T01 to S2-T03 pull request into `develop`, then start S2-T04 (design system and design review).
