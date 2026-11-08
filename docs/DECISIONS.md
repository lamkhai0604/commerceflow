# Decision Log — CommerceFlow

Status values: **Approved**, **Proposed** (awaiting decision), **On hold**, **Implemented**.
Decision authority: Tech Lead / Product Owner (lamkhai0604).

## Architecture decisions

| ID | Decision | Status | Date | Record |
| --- | --- | --- | --- | --- |
| D1 | Crash-safe idempotent checkout: customer-scoped keys, first cart snapshot, lease and fencing, one atomic business transaction, replay retained at least 24 h | Approved | 2026-10-29 | [Design baseline](architecture/design-baseline.md) |
| D2 | Mock payment outcomes: decline is terminal and replayable (402); outage is retryable (503); neither changes stock or orders | Approved | 2026-10-29 | [Design baseline](architecture/design-baseline.md) |
| D3 | Spring Security with Spring Session JDBC, same-origin deployment, CSRF token bootstrap, secure session cookie, 401/403/404 semantics | Approved | 2026-10-29 | [Design baseline](architecture/design-baseline.md) |
| D4 | Canonical documents: SRS v1.1 with the approved addendum, OpenAPI v1.0 design baseline, checkout sequence v1.4; diagram PDF parity still to be verified | Approved (verification open) | 2026-10-29 | [Design baseline](architecture/design-baseline.md) |
| ADR-006 | Checkout idempotency and cancellation | Approved (design) | 2026-10-29 | [ADR-006](architecture/adr/ADR-006-checkout-idempotency.md) |
| S1C-ADR-01 | Isolated HTTPS integration environment (Caddy, same origin, PostgreSQL 17) | Approved | 2026-11-04 | [Sprint 1C](sprints/sprint-1c.md) |
| S1C-ADR-02 | Real-browser E2E with Playwright Chromium, no mocked API for acceptance | Approved | 2026-11-04 | [Sprint 1C](sprints/sprint-1c.md) |
| S1C-ADR-03 | Dedicated integration CI workflow, read-only permissions, no deployment | Approved | 2026-11-04 | [Sprint 1C](sprints/sprint-1c.md) |
| S1C-ADR-04 | Context-aware HTTP 401 handling in the frontend | Architecture approved; quiet startup implemented in Sprint 2 (S2-T03), remaining behavior pending | 2026-11-04 | [Sprint 1C](sprints/sprint-1c.md) |
| S1C-ADR-05 | Evidence, secrets and data isolation for tests | Approved | 2026-11-04 | [Sprint 1C](sprints/sprint-1c.md) |
| S2-D01 | Replace the theme-derived storefront with an original design; remove third-party theme code, imagery and copy | Approved — Product Owner | 2026-11-08 | [Sprint 2](sprints/sprint-2.md) |
| S2-D02 | Complete the storefront redesign with demonstration data before implementing the catalog, cart and checkout APIs | Approved — Product Owner | 2026-11-08 | [Sprint 2](sprints/sprint-2.md) |
| S2-D03 | Frontend build on Vite with React 18 (from Create React App and React 17); Vitest replaces Jest | Approved — Product Owner | 2026-11-08 | [Sprint 2](sprints/sprint-2.md) |
| S2-D04 | Tailwind CSS with project-owned components as the single styling system; Bootstrap, styled-components and, after the redesign, MUI are removed | Approved — Product Owner | 2026-11-08 | [Sprint 2](sprints/sprint-2.md) |
| S2-D05 | Product name CommerceFlow; English interface; prices in US dollars | Approved — Product Owner | 2026-11-08 | [Storefront requirements](requirements/storefront-requirements.md) |
| S2-D06 | Demonstration catalog domain: home and lifestyle goods | Approved — Product Owner | 2026-11-08 | [Storefront requirements](requirements/storefront-requirements.md) |
| S2-D07 | Free services and free-tier hosting only; no paid services | Approved — Product Owner | 2026-11-08 | [AGENTS.md](../AGENTS.md) |
| S2-D08 | Storefront imagery from Unsplash under the Unsplash License, self-hosted and listed with source links in `public/images/SOURCES.md`; photographs showing people are not used | Approved — Product Owner | 2026-11-08 | [Storefront requirements](requirements/storefront-requirements.md) |
| S2-D09 | Storefront design (layout, colour, typography and components) as reviewed in the Sprint 2 design canvas | Approved — Product Owner | 2026-11-08 | [Sprint 2](sprints/sprint-2.md) |
| S2-D10 | Contributors may merge pull requests into `develop` after required CI checks pass; `develop` to `master` remains with the Product Owner | Approved — Product Owner | 2026-11-08 | [AGENTS.md](../AGENTS.md) |

## Change requests

| ID | Change | Status | Date | Record |
| --- | --- | --- | --- | --- |
| CR-01 | `GET /api/v1/auth/csrf` is the CSRF bootstrap route (the baseline's relative `/auth/csrf` resolves to it under the `/api/v1` server prefix) | Implemented | 2026-10-29 | See below |
| CR-02 | Remove the inactive Forgotten Password link from the login dialog | Implemented (PR #15) | 2026-10-29 | [Frontend authentication](sprints/sprint-1b/frontend-authentication.md) |
| CR-03 | Replace the legacy client-side login (user list fetched and compared in the browser, `access_token` in `localStorage`) with server sessions | Implemented (PR #15, issue #14) | 2026-11-04 | [Frontend authentication](sprints/sprint-1b/frontend-authentication.md) |
| CR-04 | Standardized error handling: required application `code`, CSRF versus access-denied codes, safe 500/503 responses, request IDs | Approved; implemented in the backend (PR #10) | 2026-11-02 | [CR-04](change-requests/CR-04-standardized-error-handling.md) |
| CR-05 | Registration limits in Unicode code points: `fullName` 1–50, normalized email up to 254, password 12–128 | Approved; implemented (PR #10, PR #15) | 2026-11-02 | [Contract review](api/auth-contract-v1.1-review.md) |
| CR-06 | Documentation consistency between the UI/UX specification and the backend contract | Approved (documentation) | 2026-11-03 | [UI/UX specification](sprints/sprint-1b/authentication-uiux-specification.md) |
| CR-S1C-01 | Remove the duplicate `X-Request-ID` header on MVC error responses | Implemented | 2026-11-04 | [CR-S1C-01](change-requests/CR-S1C-01-correlation-header.md) |
| CR-S1C-02 | Fail-closed cleanup for the E2E environment | Implemented | 2026-11-04 | [Verification](sprints/sprint-1c/cr-s1c-02-verification.md) |
| CR-S1C-03 | Stop tracking the root `.env`; move public metadata to the README | Implemented | 2026-11-05 | [CR-S1C-03](change-requests/CR-S1C-03-environment-files.md) |

### CR-01 — CSRF route

The Sprint 1A baseline listed an unversioned `/auth/csrf` route, while the Sprint 1B plans used `/api/v1/auth/csrf`. Because the OpenAPI document declares the server prefix `/api/v1`, both describe the same endpoint; the documentation now uses the full route everywhere. Approved D1–D3 decisions are unchanged. Implementation followed in Sprint 1B.
