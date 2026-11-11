# Product Review — Sprints 5 and 6 Release Candidate

| Field | Value |
| --- | --- |
| Date | 2026-11-11 |
| Scope | Administration (orders, stock, products), product creation, the account page, security headers and the screens changed since the [Sprint 4 review](sprint-4-product-review.md) |
| Reviewed revision | `master` at the Sprint 6 release (`f936258`), live on `https://khai-shop.vercel.app` |
| Method | Live checks on production; automated accessibility scan (axe-core 4.10) of 13 screens at 1280 px and at 375 px; keyboard focus checks; read-through of the new code and tests |
| Outcome | No blocking defect. Three minor findings fixed in the release candidate; seven backlog items proposed |

## Live verification of the Sprint 6 release

| Check | Result |
| --- | --- |
| Storefront sends the Content-Security-Policy, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` and `Cross-Origin-Opener-Policy` headers | Pass |
| Guest purchase (declined, unavailable, approved), tracking, member log-in with cart merge, member purchase, order history, 375 px layout, all with no Content-Security-Policy violation and no page error | Pass |
| Buttons show a pointer cursor; a disabled button shows `not-allowed` | Pass |
| `GET /account/profile` returns the signed-in customer's profile; the account page shows the details and no administrator label for a customer | Pass |
| A customer gets 403 from `/admin/products`, no Administration menu item, and "You do not have access" on `/admin` | Pass |
| The returns text is labelled as a demonstration policy | Pass |
| Administrator screens on production | Not run by the contributor: no administrator account is available to the contributor by design (S5-D02). They are covered by `AdminIntegrationTest` (15 tests), E2E-18 and E2E-19 in CI, and the Product Owner's trial |

## Findings fixed in the release candidate

| ID | Area | Finding | Severity | Fix |
| --- | --- | --- | --- | --- |
| R-10 | Accessibility / flow | After a failed submission, the New product and Edit product forms did not move focus to the first field that needs attention, so on a phone the error could be scrolled out of sight (the checkout and sign-in forms already do this) | Low | Focus moves to the first invalid field, including a duplicate address; covered by a test |
| R-11 | Code | React reported an unknown `fetchPriority` prop on images (React 18 knows only the lowercase attribute), so the hint was never applied | Low | Lowercase attribute on the home hero and product images |
| R-12 | Design | In the New product form the photo choice "Placeholder (no photo yet)" was cut off on a 375 px screen | Low | Shortened to "Placeholder"; the note below the field explains it |

## Backlog proposals

| ID | Finding | Severity | Proposal |
| --- | --- | --- | --- |
| B-10 | Product photos cannot be uploaded; new products use a photo already in the store or a placeholder (S6-D01) | Medium | Decision needed: free object storage and content checks, or keep the library approach |
| B-11 | Customers cannot cancel their own orders (the approved design allows administrators only) | Medium | Product Owner decision; a change request if wanted |
| B-12 | The first visit after 15 idle minutes waits up to two minutes for the free API instance (S3-D01) | Medium | Optional: a scheduled free keep-warm request from CI; needs the Product Owner's approval because it changes how the free allowance is used |
| B-13 | E2E-17 failed once in CI (Sprint 5 run on `bedf979`) and passed on the next run; the cause was not identified | Low | The reporter now names the failing step (Sprint 6), so a repeat will be diagnosable |
| B-14 | Administration lists show the newest 100 orders and up to 200 products without paging | Low | Add paging when the data grows |
| B-15 | The category, address (slug) and photo of an existing product cannot be edited, and categories cannot be managed | Low | Plan with the next administration work |
| B-16 | Product changes are audited, but only order history shows its audit entries in the console | Low | Show product history in the console |

Carried over from the Sprint 4 review and unchanged: B-03 (lookup limit per session), B-04 (console 401 on startup, by design), B-06 (test data stays in the database), B-07, B-08.

## Business rules reviewed

| Rule | Enforced by | Verified by |
| --- | --- | --- |
| Only administrators reach `/admin/**`; every write needs the CSRF token | Security configuration | Integration tests (401, 403, CSRF 403); production checks above |
| Cancelling restores stock exactly once and marks payment refunded; shipped and delivered orders cannot be cancelled | Conditional update plus stock restore in one transaction | 8 concurrent cancellations: one 200, seven 409; E2E-18 |
| A stock edit never loses a concurrent sale and never goes negative | Same row lock as checkout; optional compare-and-set | Race test with ten purchases |
| A hidden product leaves the catalog and cannot be carted or bought; existing orders keep their snapshot | Catalog filter, cart and checkout checks | Integration test |
| A duplicate product address creates nothing, even when requests race | Unique constraint mapped to 409 | Six concurrent creations: one 201, five 409 |
| Every administrative change leaves an audit entry with actor and time | `admin_audit_log`, written in the same transaction | Integration tests |

## Performance (NFR-02)

Measured locally with 1,000 products at 20 concurrent users: p97.5 at most 158 ms against a 500 ms p95 target ([report](../testing/performance-nfr-02.md)). Not measured on production (free hosting, cold starts).
