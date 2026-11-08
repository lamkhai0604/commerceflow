# Sprint 2 — Storefront Cleanup and Redesign

| Field | Value |
| --- | --- |
| Goal | Replace the theme-derived storefront with an original, responsive, accessible CommerceFlow design in English with USD prices, using demonstration data, while keeping authentication behavior and its tests intact |
| Requirements | [SF-01 to SF-12](../requirements/storefront-requirements.md); FR-01 to FR-05 unchanged |
| Decisions | S2-D01 to S2-D10 in the [decision log](../DECISIONS.md) |
| Base | `develop` at `bcf140c` |
| Estimated duration | About two weeks (forecast, not a commitment) |

## Tasks

| ID | Task | Requirements | Status |
| --- | --- | --- | --- |
| S2-T01 | Remove theme-derived code, assets and the legacy demo-service client; restructure `src/` by feature | SF-01, SF-10 | Done (PR #21, merged) |
| S2-T02 | Migrate the build from Create React App to Vite 8 and React 18; Jest to Vitest; ESLint 10 flat config; CI and Vercel configuration | — | Done (PR #21, merged) |
| S2-T03 | Quiet startup: any session-restore failure leaves a silent signed-out state (UI-02, S1C-ADR-04 startup part) | SF-05 | Done (PR #21, merged) |
| S2-T04 | Design system: tokens, typography, colour, spacing; design review of home, listing and product pages at desktop and mobile | SF-02 to SF-05 | Done (approved — Product Owner, 2026-11-08; S2-D09) |
| S2-T05 | Shared UI components: Button and LoadingButton, inputs, select, card, badge, dialog and drawer, toast, status alert, skeleton, pagination, empty state, price | SF-04, SF-05 | Done (PR #22, merged) |
| S2-T06 | Demonstration catalog: typed data set and API-shaped module; licensed images | SF-06, SF-10, SF-01 | Done (PR #22, merged) |
| S2-T07 | Layout: header with navigation, search, account and cart; mobile navigation; footer | SF-03, SF-04 | Done (PR #22, merged) |
| S2-T08 | Home, product listing and product detail pages | SF-06 | Done (PR #22, merged) |
| S2-T09 | Cart: mini-cart panel and cart page with browser-local state | SF-07 | Done (PR #22, merged) |
| S2-T10 | Checkout presentation page | SF-08 | Done (PR #22, merged) |
| S2-T11 | Authentication dialog and account menu rebuilt on the design system (accessible names used by the E2E suite unchanged); MUI removed | SF-09 | Done (PR #22, merged) |
| S2-T12 | Accessibility and performance pass; Playwright flow browse → cart → checkout; screenshots at 1280 px and 375 px | SF-04, SF-05, SF-11 | Done (PR #22, merged) |

## Acceptance

- All SF requirements marked Must are met, with evidence recorded per task.
- Frontend CI and the HTTPS integration workflow pass on the integrated revision; the 15 authentication E2E scenarios still pass.
- No third-party theme material remains (checked by a repository search for the former theme hosts and assets).

## Verification approach

Unit and component tests (Vitest, Testing Library) for components and state; Playwright for the storefront flow; manual and automated checks at 1280 px and 375 px; Lighthouse on the production build.

## Progress notes

- S2-T01 to S2-T03 merged into `develop` through PR #21 (`9d70ef2`) after Frontend CI, the HTTPS integration workflow (15 scenarios) and the Vercel preview passed.
- S2-T05 to S2-T12 merged into `develop` through PR #22 (`0d836f2`) after Frontend CI, the HTTPS integration workflow (16 scenarios, including E2E-16) and the Vercel preview passed:
  - Shared components in `src/components/ui` follow the authentication UI/UX specification's feedback patterns (loading button, status alert, toast, skeleton, retry, empty state).
  - Demonstration catalog: 21 products in 6 rooms, aligned with the OpenAPI `Product`, `Category` and `ProductPage` shapes; filters, sorting and pagination are kept in the URL.
  - Cart persisted in browser storage (authentication data never is); removal offers Undo, including for the last item.
  - Demo checkout validates inline, moves focus to the first invalid field and confirms with an order number; no payment data is collected.
  - Authentication dialog and account menu rebuilt without MUI; menu labels unified to "Log in" and "Create account" (one name per concept), with the two affected E2E steps updated.
  - E2E-16 added: browse, add to cart, check out, confirmation.
- Evidence (local, Node 22.23, revision recorded in the pull request): typecheck, ESLint, 120 Vitest tests, production build (JS 114 kB gzip); browser checks at 1280 px and 375 px with no horizontal scrolling, startup alerts or broken images; Lighthouse mobile on home and product pages: performance 93, accessibility 100, best practices 96 (console errors from the absent API in the local preview), SEO 100.
- S2-T04: design reviewed and approved. The approved design shows colour variants on the product page; the OpenAPI baseline has no product variants, so variants are not implemented and remain a backlog candidate.

## Sprint review

- Delivered: all tasks S2-T01 to S2-T12; every Must requirement SF-01 to SF-12 met with the evidence above. SF-11 (Should) met: Lighthouse mobile performance 93 and accessibility 100.
- Not delivered: product variants (not in the API baseline; backlog candidate).
- Reviewed: self-review only. Merged: `develop`. Released: pending the Sprint 2 release pull request into `master`, which the Product Owner merges.
