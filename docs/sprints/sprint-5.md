# Sprint 5 — Administration and Stock Visibility

| Field | Value |
| --- | --- |
| Goal | An administrator can manage orders (ship, deliver, cancel with exactly-once stock restore), edit stock and update or deactivate products; customers see low stock and are told exactly which product is short |
| Requirements | SRS FR-16A; addendum REV-10, REV-11 and the admin part of REV-12; OpenAPI v1.0 design baseline (`/admin/orders`, `/admin/orders/{orderId}/status`, `/admin/products/{productId}`, `/admin/products/{productId}/inventory`); backlog B-01, B-02 and B-09 of the [Sprint 4 review](../reviews/sprint-4-product-review.md) |
| Decisions | S5-D01 to S5-D04 in the [decision log](../DECISIONS.md) |
| Base | `develop` at `3b5591c` |

## Tasks

| ID | Task | Status |
| --- | --- | --- |
| S5-T01 | Records: sprint plan, decisions, OpenAPI v1.4 (administration and stock visibility), administrator setup guide | Done |
| S5-T02 | Flyway V9: administration audit log | Done |
| S5-T03 | Admin orders: `GET /admin/orders` (status filter, search by number or email), `GET /admin/orders/{orderId}`, `PATCH /admin/orders/{orderId}/status` (CONFIRMED → SHIPPED → DELIVERED, CONFIRMED → CANCELLED; cancel restores stock exactly once) | Done |
| S5-T04 | Admin products: `GET /admin/products`, `PATCH /admin/products/{productId}` (name, description, price, active), `PATCH /admin/products/{productId}/inventory` (set stock, optional compare-and-set) | Done |
| S5-T05 | Stock visibility (B-01): `stockLeft` on catalog products at 5 or fewer, and `shortages` in the insufficient-stock response | Done |
| S5-T06 | Tests: PostgreSQL integration suite for administration (REV-10 concurrent cancellation, REV-11 stock edit during checkout, role and CSRF checks, audit entries); required in CI | Done |
| S5-T07 | Frontend administration console: orders (list, detail, ship, deliver, cancel with reason), stock and product editing; administration link only for administrators | Done |
| S5-T08 | Frontend stock visibility: "Only N left" badge, quantity limit by stock, precise insufficient-stock message | Done |
| S5-T09 | HTTPS E2E for the administrator flow (E2E-18); component tests | Done (E2E-18 runs in CI) |
| S5-T10 | Release, live verification, product review and demonstration guide update | Proposed |

## Acceptance

- Only accounts with the ADMIN role reach `/api/v1/admin/**`: anonymous requests get 401, customers get 403, writes without the CSRF token get 403.
- Two concurrent cancellations of one CONFIRMED order produce exactly one success and one 409, and stock is restored once. Cancelling a shipped, delivered or cancelled order returns 409 and changes no stock.
- A stock edit that races with checkout never loses an update and never produces negative stock; an edit with a stale expected value returns 409.
- A deactivated product disappears from the catalog and cannot be added to a cart or bought.
- Every administrative change leaves an audit entry (actor, time, action, reason where given).
- The customer's order history shows the new status (Shipped, Delivered, Cancelled and Refunded).
- A product with 5 or fewer units shows "Only N left"; the insufficient-stock message names the product and the units available.
- Backend CI, Frontend CI and the HTTPS integration workflow pass; live checks pass after release.

## Out of scope

Product creation (needs image upload and storage), customer self-cancellation (the approved baseline allows administrators only), email notifications, and refunds through a real payment provider. REV-06 (lease takeover) does not apply: S4-D01 replaced the lease with a transaction-scoped lock, so there is no stale worker to fence.

## Backlog from the Sprint 4 review

| ID | Status |
| --- | --- |
| B-01 insufficient-stock message and low-stock indicator | Done (S5-D04, S5-T05, S5-T08) |
| B-02 live stock cannot be restocked | Done (stock editing, S5-T04, S5-T07) |
| B-09 order status stays "Confirmed" | Done (S5-T03, S5-T07) |
| B-03 to B-08 | Unchanged; see the [review](../reviews/sprint-4-product-review.md) |

## Implementation notes

- A status change is one conditional `UPDATE ... WHERE order_status = :from`; the second of two concurrent changes waits for the first and then matches no row, so it gets 409. Cancellation locks the order's products in ID order, the same order checkout uses, so the two cannot deadlock.
- A stock edit locks the product row that checkout locks. The integration test races ten purchases against an edit and checks the invariant `final stock = new value - units sold after the edit`.
- The administration screens are split into separate lazily loaded chunks (about 17 kB in total), so the storefront bundle is unchanged for customers.
