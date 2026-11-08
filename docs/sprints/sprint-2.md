# Sprint 2 — Storefront Cleanup and Redesign

| Field | Value |
| --- | --- |
| Goal | Replace the theme-derived storefront with an original, responsive, accessible CommerceFlow design in English with USD prices, using demonstration data, while keeping authentication behavior and its tests intact |
| Requirements | [SF-01 to SF-12](../requirements/storefront-requirements.md); FR-01 to FR-05 unchanged |
| Decisions | S2-D01 to S2-D07 in the [decision log](../DECISIONS.md) |
| Base | `develop` at `bcf140c` |
| Estimated duration | About two weeks (forecast, not a commitment) |

## Tasks

| ID | Task | Requirements | Status |
| --- | --- | --- | --- |
| S2-T01 | Remove theme-derived code, assets and the legacy demo-service client; restructure `src/` by feature | SF-01, SF-10 | Done (pending review) |
| S2-T02 | Migrate the build from Create React App to Vite 8 and React 18; Jest to Vitest; ESLint 10 flat config; CI and Vercel configuration | — | Done (pending review) |
| S2-T03 | Quiet startup: any session-restore failure leaves a silent signed-out state (UI-02, S1C-ADR-04 startup part) | SF-05 | Done (pending review) |
| S2-T04 | Design system: tokens, typography, colour, spacing; design review of home, listing and product pages at desktop and mobile | SF-02 to SF-05 | Ready |
| S2-T05 | Shared UI components: Button and LoadingButton, inputs, select, card, badge, dialog and drawer, toast, status alert, skeleton, pagination, empty state, price | SF-04, SF-05 | Proposed |
| S2-T06 | Demonstration catalog: typed data set and API-shaped module; licensed images | SF-06, SF-10, SF-01 | Proposed |
| S2-T07 | Layout: header with navigation, search, account and cart; mobile navigation; footer | SF-03, SF-04 | Proposed |
| S2-T08 | Home, product listing and product detail pages | SF-06 | Proposed |
| S2-T09 | Cart: mini-cart panel and cart page with browser-local state | SF-07 | Proposed |
| S2-T10 | Checkout presentation page | SF-08 | Proposed |
| S2-T11 | Authentication dialog and account menu rebuilt on the design system (accessible names used by the E2E suite unchanged); MUI removed | SF-09 | Proposed |
| S2-T12 | Accessibility and performance pass; Playwright flow browse → cart → checkout; screenshots at 1280 px and 375 px | SF-04, SF-05, SF-11 | Proposed |

## Acceptance

- All SF requirements marked Must are met, with evidence recorded per task.
- Frontend CI and the HTTPS integration workflow pass on the integrated revision; the 15 authentication E2E scenarios still pass.
- No third-party theme material remains (checked by a repository search for the former theme hosts and assets).

## Verification approach

Unit and component tests (Vitest, Testing Library) for components and state; Playwright for the storefront flow; manual and automated checks at 1280 px and 375 px; Lighthouse on the production build.

## Progress notes

- S2-T01 to S2-T03 are delivered on `feature/sprint-2-foundation`. The interim home page states that the storefront is being redesigned.
