# Product Review — Sprint 4 Release Candidate (S4-T09)

| Field | Value |
| --- | --- |
| Date | 2026-11-09 |
| Scope | Design, user flows, business rules, repository files and code of the storefront and API after Sprint 4 |
| Reviewed revision | `master` at `ab99c61` (Sprint 4 release), live on `https://khai-shop.vercel.app` |
| Method | Live end-to-end runs in Chromium at 1280 px and 375 px; automated accessibility scan (axe-core 4.10) of 18 screens per viewport; API checks against production; code and repository read-through |
| Outcome | No blocking defect. One functional bug and eight minor findings fixed in the release candidate; nine items proposed for the backlog |

## Live verification (S4-T08)

All checks passed on production after the Sprint 4 release:

| Check | Result |
| --- | --- |
| Guest purchase through the checkout choice dialog; declined (402) and unavailable (503) payments create no order; approved payment (201) shows the real order | Pass |
| Guest order tracking by order number and email (email in any letter case) | Pass |
| Member log-in at checkout merges the browser cart (`POST /cart/merge` 200, notice shown); server cart kept across reload; member order (201); order history and detail; cart emptied | Pass |
| Log-out leaves no member cart in browser storage | Pass |
| Same `Idempotency-Key` replays the identical body with `Idempotent-Replayed: true`; changed payload with the same key is rejected (409 `IDEMPOTENCY_PAYLOAD_MISMATCH`) | Pass |
| Write without CSRF token rejected (403 `CSRF_INVALID`); anonymous `GET /orders` rejected (401) | Pass |
| `SESSION` cookie: Secure, HttpOnly, SameSite=Lax | Pass |
| No page errors; no horizontal scroll at 375 px | Pass |

## Findings fixed in the release candidate

| ID | Area | Finding | Severity | Fix |
| --- | --- | --- | --- | --- |
| R-01 | Design / bug | The log-in and log-out notice was meant to float at the bottom of the screen but was drawn over the header controls (menu, cart), because the header's backdrop blur makes it the containing block of fixed elements | Medium | The notice is rendered on the document body |
| R-02 | Accessibility | Signed-out order history, an empty checkout and the "No recent order" page had no level-1 heading | Low | Empty states on these pages use a level-1 heading |
| R-03 | Accessibility | The demo banner was outside any landmark | Low | Banner is an `aside` labelled "Demo notice" |
| R-04 | Business copy | Product page promised "ships in 2–3 business days" while checkout offers Standard delivery in 3–5 business days | Low | Product page states "Standard delivery in 3–5 business days" |
| R-05 | Flow | Room counts in the filter panel showed catalog totals while a search or filter narrowed the list (for example "Living 6" when searching "lamp" with 2 results) | Low | Counts are shown only when no search, price or stock filter is active |
| R-06 | Design | The footer listed 4 of the 6 rooms | Low | All rooms are listed |
| R-07 | Flow | After a failed submission, focus could place the first invalid field under the sticky header | Low | Form fields keep a top scroll margin |
| R-08 | Business demo | Every product had 25 or 0 units, so the insufficient-stock rule could not be tried on the live site | Low | Migration V8 sets Oak Nightstand to 3 units (demonstration data) |
| R-09 | Files | Unused code and configuration: unused selectors, an unused thunk type (thunks are disabled), the unused `@testing-library/user-event` dependency, and a `.prettierrc` that no script enforced | Low | Removed |

## Backlog proposals (not changed in this release)

| ID | Finding | Severity | Proposal |
| --- | --- | --- | --- |
| B-01 | An insufficient-stock result does not name the product or the units left, and the product page lets customers choose up to 10 even when fewer are in stock (the catalog exposes only `available`) | Medium | Change request: low-stock indicator in the catalog ("Only 3 left") and affected product IDs in the problem response; Sprint 5 |
| B-02 | Live demo stock decreases as people test and cannot be restocked | Medium | Inventory editing in administration (REV-11), Sprint 5 |
| B-03 | Order lookup is limited per session; a new session starts a new count. Guessing still needs an 8-character order number (32 symbols) and the matching email | Low | Add a per-client limit at the edge when traffic justifies it |
| B-04 | Each full page load of a signed-out visitor makes `GET /auth/me`, which answers 401 and appears as a console error in browser tools | Low | Accepted by design (UI-02); revisit only if it causes confusion |
| B-05 | The home page ("30-day returns") and product page ("Shipping and returns") describe a returns policy that has no feature behind it | Low | Label as demonstration policy, or plan returns after the MVP |
| B-06 | Accounts and orders created by live verification remain in the production database; there is no account or order deletion | Low | Administration sprint; synthetic accounts use `@example.com` addresses |
| B-07 | A member's carts from several browsers are added together on log-in (capped at 10 per product) | Info | Behaviour agreed in CR-S4-01; the notice explains it |
| B-08 | Free-tier API cold start takes about two minutes after 15 minutes without traffic | Info | Known hosting limit (S3-D01); the wake notice explains it |
| B-09 | Order status stays "Confirmed": shipping, delivery and cancellation need administration | Info | REV-10, Sprint 5 ([plan](../sprints/sprint-5.md)) |

## Flows reviewed

| Flow | Result |
| --- | --- |
| Browse: home, rooms, search, filters, sort, paging, product, sold-out product | Pass |
| Cart: add, quantity, remove and undo, drawer, free-shipping progress | Pass |
| Guest checkout: choice dialog, validation with focus on the first problem, payment outcomes, confirmation, tracking | Pass |
| Account: register, log in, reload keeps the session, log out | Pass |
| Member checkout: log-in from checkout continues to checkout, cart merge, member order, history, detail | Pass |
| Session expiry and CSRF recovery (Sprint 1C behaviour) | Covered by E2E-10, E2E-11 and E2E-14 in CI |

## Business rules reviewed

| Rule | Enforced by | Verified by |
| --- | --- | --- |
| At most 10 units per product, at most 30 lines | Database checks, request validation, client clamps | Integration tests, unit tests |
| Prices, shipping and totals are computed by the server; client totals are estimates | `CheckoutService`, `Money` | Integration tests; live order totals |
| Standard shipping free from $75.00, otherwise $9.00; Express $19.00 | `Money.shipping` and the client summary use the same rule | Unit and integration tests; live orders |
| No order, stock change or charge on a declined or unavailable payment | Payment outcome evaluated before inventory | Integration tests; live 402 and 503 |
| No partial order and no negative stock under concurrency | Row locks in product order and conditional decrement | 8 concurrent buyers for 1 unit: exactly one order |
| One order per idempotency key; replay is byte-identical; a changed payload is rejected | Advisory lock and stored outcome (S4-D01) | Integration tests; live replay and mismatch |
| Members see only their own orders; guests need number and email | Query scoped by user; lookup by both values; 404 does not reveal which was wrong | Integration tests; E2E-17 |
| Guest orders are not attached to accounts registered later | Orders keep `user_id` null | CR-S4-01; integration tests |

## Repository and code

- The layout (`frontend/`, `backend/`, `e2e/`, `docs/`) is consistent; every package has its own lint, type check and tests, and each runs in CI.
- Frontend features are grouped by domain (`auth`, `cart`, `catalog`, `checkout`, `commerce`, `orders`); pages stay thin; API clients keep the CSRF token in memory only and expose only status, documented code and `Retry-After` to the UI.
- Backend packages follow the same domains (`auth`, `catalog`, `commerce`, `error`); SQL uses bound parameters throughout; error responses follow CR-04.
- `docs/api` keeps earlier contract versions (design baseline, proposed authentication contract) as history; the current contracts are listed in `docs/README.md`.
