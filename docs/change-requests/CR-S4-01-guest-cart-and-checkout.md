# CR-S4-01 — Guest cart and guest checkout

Status: Approved — Product Owner, 2026-11-09. Implemented in Sprint 4.

## Baseline

SRS FR-09 states that customers create and update their own cart and that there is no guest cart in the MVP. The checkout policy (v1.0) and OpenAPI v1.0 allow checkout only for an authenticated customer, with idempotency keys scoped to that customer.

## Change

1. Visitors who are not signed in keep a cart in the browser.
2. Selecting **Check out** while signed out opens a choice: continue as a guest, log in, or create an account. Signed-in customers go straight to checkout.
3. Guests check out with an email address, a US shipping address, a delivery method and the demonstration payment. The server re-reads prices and stock; it never trusts amounts from the browser.
4. After logging in or creating an account from that choice, the browser cart is merged into the account's server cart (quantities add up, capped at 10 per product) and the customer is told that the carts were merged.
5. Guests can look up an order later with its order number and the email used at checkout ("Track your order").
6. Guest orders are not attached to an account that is later registered with the same email address, because the email address is not verified.

## Impact

| Area | Impact |
| --- | --- |
| SRS | FR-09 amended: guest cart in the browser, member cart on the server. FR-11 amended: guest checkout. FR-12 amended: guest order lookup |
| Data model | `orders.user_id` nullable with a required `contact_email`; order numbers are public identifiers distinct from internal IDs |
| Idempotency | Keys are scoped to the customer for members and to the session for guests |
| Security | Guest endpoints require the CSRF token; order lookup returns the same not-found response for any mismatch and is rate-limited per session |
| API | New `POST /cart/merge`, `POST /checkout/guest`, `POST /orders/lookup` (OpenAPI v1.3 orders) |
