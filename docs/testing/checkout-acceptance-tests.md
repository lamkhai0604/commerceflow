# CommerceFlow — Checkout Policy Acceptance Tests

**Status:** Planned, not executed.

| ID | Given / When | Expected result |
|---|---|---|
| TC-IDEMP-001 | Completed checkout, retry same customer/key/payload | Original order returned; no additional order or stock change |
| TC-IDEMP-002 | Same customer/key, different payload or cart fingerprint | 409 IDEMPOTENCY_PAYLOAD_MISMATCH |
| TC-IDEMP-003 | Two concurrent requests with same customer/key | One processed; other 409 IDEMPOTENCY_IN_PROGRESS |
| TC-IDEMP-004 | Completed key younger than 24 hours | Replay record still available |
| TC-CONC-001 | Two customers purchase final unit concurrently | Exactly one order; stock never negative |
| TC-ORDER-003 | Mock payment fails | No order, inventory decrement, or cart clearing |
| TC-CANCEL-001 | Admin cancels CONFIRMED order | Status CANCELLED; stock restored once atomically |
| TC-CANCEL-002 | Admin repeats cancellation | 409; no additional stock restoration |
| TC-CANCEL-003 | Admin cancels SHIPPED/DELIVERED order | 409; no stock change |
| TC-ORDER-005 | Failure after stock decrement before commit | All transactional changes rolled back |

Tests must be automated when the corresponding feature is implemented and linked to CI evidence.

## Design review scenarios (REV-01 to REV-12)

Required by the [approved SRS addendum](../requirements/SRS-Approved-Design-Addendum-v1.0-FINAL.md). Planned; executed when checkout is implemented.

| ID | Scenario | Acceptance criterion |
|---|---|---|
| REV-01 | Retry completed checkout after cart cleared | Original order/status/body; stock decremented once |
| REV-02 | Same key, different shipping fields | 409 mismatch; no side effects |
| REV-03 | Same key concurrent requests | Exactly one owner; other 409; no duplicate |
| REV-04 | Crash before atomic commit | No partial order/stock mutation; safe recovery |
| REV-05 | Crash after commit, before HTTP reply | Replay committed order |
| REV-06 | Lease takeover with stale worker | Fencing prevents stale worker commit |
| REV-07 | Mock decline and replay | Same terminal failure; no order/stock change |
| REV-08 | Transient mock service failure | Controlled retry; no duplicate |
| REV-09 | Two buyers for stock=1 | Exactly one confirmed order |
| REV-10 | Concurrent cancellation | CONFIRMED -> CANCELLED once; stock restored once |
| REV-11 | Admin stock edit during checkout | No lost update or negative stock |
| REV-12 | CSRF/session security | Missing token 403; unauthenticated 401; admin role 403; logout invalidates session |
