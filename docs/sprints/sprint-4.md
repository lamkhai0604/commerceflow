# Sprint 4 — Cart, Checkout and Orders

| Field | Value |
| --- | --- |
| Goal | Customers and guests can buy from the demonstration catalog: server-side cart for members, browser cart for guests, idempotent checkout with demonstration payment, order history and guest order lookup |
| Requirements | SRS FR-09 to FR-13 as amended by CR-S4-01; addendum FR-11A, FR-11C, FR-11D; checkout policy v1.0; design review scenarios REV-01 to REV-05, REV-07 to REV-09, REV-12 |
| Decisions | CR-S4-01 (approved), S4-D01 to S4-D03 (for review) in the [decision log](../DECISIONS.md) |
| Base | `develop` at `5f3e9a8` |
| Estimated duration | About two weeks (forecast) |

## Tasks

| ID | Task | Status |
| --- | --- | --- |
| S4-T01 | Records: CR-S4-01, decisions, OpenAPI v1.3 orders, sprint plan | Done |
| S4-T02 | Flyway V7: carts, cart items, orders, order items, order addresses, checkout idempotency | Done |
| S4-T03 | Member cart API: `GET /cart`, `POST /cart/items`, `PATCH`/`DELETE /cart/items/{itemId}`, `POST /cart/merge` | Done |
| S4-T04 | Checkout: `POST /orders` (member, server cart) and `POST /checkout/guest`; `Idempotency-Key`; demonstration payment outcomes; conditional stock decrement; replay, mismatch and in-progress handling | Done |
| S4-T05 | Orders: `GET /orders`, `GET /orders/{orderId}` (own orders only), `POST /orders/lookup` (order number and email, rate-limited) | Done |
| S4-T06 | Frontend: member cart on the server and merge on log-in; guest-or-member choice at checkout; checkout against the API with every outcome explained; confirmation, order history, order detail and order tracking pages | Done |
| S4-T07 | Tests: PostgreSQL integration suites for cart, checkout (including concurrent buyers and same-key requests) and orders; component tests; E2E for guest and member purchases | Done; HTTPS E2E (E2E-16 guest, E2E-17 member) runs in CI |
| S4-T08 | Release and live verification on `https://khai-shop.vercel.app` | Done: all live checks passed on `master` `ab99c61` ([review](../reviews/sprint-4-product-review.md#live-verification-s4-t08)) |
| S4-T09 | Product review: design, user flows, business rules, repository structure and code quality, with findings and proposed fixes | Done: [product review](../reviews/sprint-4-product-review.md); fixes R-01 to R-09 in the release candidate |
| S4-T10 | Demonstration guide: a step-by-step script covering every implemented feature for the Product Owner's hands-on trial; issues found go to the backlog | Done: [demonstration guide](../DEMO-GUIDE.md) |

## Acceptance

- A guest can add products, choose "Continue as guest", place a demonstration order, see its number and look it up later.
- A member's cart is kept on the server; a guest cart is merged into it on log-in with a visible confirmation.
- Retrying a completed checkout with the same key returns the same order without a second stock decrement; a changed request with the same key is rejected; two buyers for the last unit produce exactly one order.
- Declined and temporarily unavailable payments create no order and change no stock, and the page explains what to do next.
- Members see only their own orders.
- Backend CI, Frontend CI and the HTTPS integration workflow pass; the live site passes the S4-T08 checks.

## Out of scope

Administration (order status changes, cancellation, inventory editing: REV-10, REV-11) is Sprint 5 ([plan](sprint-5.md)). REV-06 (lease takeover) does not apply: S4-D01 replaced the lease with a transaction-scoped lock. Email delivery and email verification are not part of the MVP.

## Sprint review (2026-11-09)

- Delivered: S4-T01 to S4-T10. PR lamkhai0604/commerceflow#34 merged into `develop` (`bfa2598`) after Backend CI (including `CommerceIntegrationTest`), Frontend CI and the HTTPS integration workflow (17/17 scenarios, including E2E-16 guest and E2E-17 member) passed; released to `master` (`ab99c61`) by the Product Owner through lamkhai0604/commerceflow#35.
- Live verification passed: see the [product review](../reviews/sprint-4-product-review.md#live-verification-s4-t08).
- Product review (S4-T09): one functional bug (the log-in notice covered the header controls) and eight minor findings fixed in the release candidate; nine backlog proposals for Sprint 5 planning.
- Test data: live verification registered synthetic accounts (`live-s4-<timestamp>@example.com`) and placed demonstration orders.
- Decisions S4-D01 to S4-D03 await Product Owner review.
