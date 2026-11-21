# Quality Audit — Dependencies, Lighthouse and Accessibility (November 2026)

| Field | Value |
| --- | --- |
| Date | 2026-11-21 |
| Code | `develop` after Sprint 7 (`0b292d9`) plus the fixes below |
| Scope | Known vulnerabilities in dependencies; Lighthouse (performance, accessibility, best practices, SEO) on five storefront pages |

## Dependencies

| Package | Finding | Action |
| --- | --- | --- |
| `react-router-dom` 6.30 (runtime) | Two moderate advisories: an open redirect through a backslash path passed to `<Link>` or `useNavigate` ([GHSA-wrjc-x8rr-h8h6](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6)) and a server-rendering issue that does not apply to this client-only app. The storefront only navigates to fixed paths and API slugs, so the practical risk was low | Upgraded to 7.18.6 (decision S7-D02). The APIs used (`Routes`, `Route`, `Link`, `NavLink`, `Navigate`, `Outlet`, `useNavigate`, `useParams`, `useSearchParams`, `useLocation`) are unchanged |
| `minimatch` (development tools only) | Moderate denial-of-service advisory ([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)); not shipped to the browser | Updated by `npm audit fix` in `frontend/` and `e2e/` |
| Spring Boot | 3.5.16 is the latest 3.5 patch release | None |

After the changes `npm audit` reports 0 vulnerabilities in `frontend/` and `e2e/`. The upgrade was verified with typecheck, lint, 170 component tests, the production build, and in Chromium on the production build served with the exact `vercel.json` headers: guest and member checkout (19/19 checks), administration (orders, cancellation, stock, 375 px) and product creation and editing (11/11 checks), with no page errors and no Content-Security-Policy violation.

## Lighthouse

Lighthouse 12.8, mobile emulation with simulated slow 4G (its default).

### Production (`https://khai-shop.vercel.app`, Sprint 6 release, API warmed first)

| Page | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Home | 95 | 100 | 96 | 100 | 1.6 s | 2.5 s | 140 ms | 0.001 |
| Shop all | 98 | 100 | 96 | 100 | 1.6 s | 1.8 s | 140 ms | 0.001 |
| Product | 95 | 100 | 96 | 100 | 1.6 s | 1.8 s | 220 ms | 0.001 |

### Findings and fixes

| ID | Finding | Fix |
| --- | --- | --- |
| Q-01 | "Add to cart" on product cards showed those words but was named "Add Velvet Sofa, Forest to cart" for assistive technology, so voice control ("click Add to cart") could not find it (WCAG 2.5.3 Label in Name) | The accessible name now starts with the visible words: "Add to cart: Velvet Sofa, Forest" |
| Q-02 | On Shop all, the largest image on screen (the first product) was lazily loaded, which delays the largest contentful paint | The first row of products loads eagerly with high priority |
| Q-03 | Best practices 96: the browser console logs the 401 of the anonymous session check on every first load | By design (backlog B-04); unchanged |
| Q-04 | Lighthouse on the local test server reported missing text compression and short cache lifetimes | Not real on production: Vercel serves the bundle with Brotli and `Cache-Control: public, max-age=31536000, immutable`, and images with a 7-day cache |

Possible later improvement: load the checkout and account pages on demand, as administration already is, to reduce the JavaScript of the first visit (Lighthouse "unused JavaScript"). Production performance is already 95 or higher, so this is not scheduled.
