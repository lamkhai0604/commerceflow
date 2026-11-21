# Sprint 7 — Administration Completeness

| Field | Value |
| --- | --- |
| Goal | Finish the product editing part of FR-14 and make administration scale: administrators can change a product's category and photo, read the history of changes to a product, and page through orders |
| Requirements | SRS FR-14 (admin edits products), FR-16; backlog B-14, B-15 (category and photo) and B-16 of the [Sprint 5 and 6 review](../reviews/sprint-5-6-product-review.md) |
| Decisions | S7-D01 in the [decision log](../DECISIONS.md) |
| Base | `develop` at `4947be5` |

No new Product Owner decision is needed: the work stays inside the approved baseline and adds optional fields and read-only endpoints. The open decisions (photo upload, customer cancellation, keep-warm request) are not part of this sprint.

## Tasks

| ID | Task | Status |
| --- | --- | --- |
| S7-T01 | Records: sprint plan, decision S7-D01, OpenAPI v1.6, demonstration guide | Done |
| S7-T02 | `PATCH /admin/products/{id}` accepts `categoryId` and `imagePath`; the new photo brings its own description | Done |
| S7-T03 | `GET /admin/products/{id}/history` lists the audited changes of a product | Done |
| S7-T04 | `GET /admin/orders` pages with `offset` | Done |
| S7-T05 | Console: category and photo in the Edit product dialog, a History dialog per product, "Show more orders" | Done |
| S7-T06 | Tests: three more integration tests (18 in total, required in CI), component tests, E2E-19 extended | Done; E2E-19 runs in CI |
| S7-T07 | Release and live verification | In progress: merged into `develop` (lamkhai0604/commerceflow#45; the merge happened before CI finished, and all three checks then passed on the same commit); release pull request lamkhai0604/commerceflow#46 awaits the Product Owner |

## Acceptance

- An administrator moves a product to another category and gives it another photo of the store; the store shows the new category and photo at once, and the photo's description is the one already used for that picture. An unknown category or a photo path outside the store's folder is refused and changes nothing.
- Saving the same values again changes nothing and adds no history entry.
- Each product shows its administrative changes, oldest first, in words (no ids or file paths); the history is administrators-only.
- The order list loads 50 orders and offers "Show more orders" until the end; there are no repeats or gaps between pages; a failure keeps the orders already shown.
- Backend CI, Frontend CI and the HTTPS integration workflow pass.

## Out of scope

Editing a product's address (slug), which is its public link; category management; photo upload; paging of the product list (it holds up to 200 products and has a name filter).
