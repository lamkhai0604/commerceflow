# CR-S3-01 — Catalog fields and filters for the storefront

Status: Approved — Product Owner, 2026-11-08. Implemented in Sprint 3.

## Baseline

The OpenAPI v1.0 design baseline defines a public `Product` with `id`, `name`, `description`, `categoryId`, `price`, `currency` and `available`, and `GET /products` with `q`, `category`, `page`, `size` and `sort`. The physical ERD defines `products(id, category_id, name, slug, description, price, stock_quantity, active, version, timestamps)` and `categories(id, name, slug)`.

## Change

| Area | Change |
| --- | --- |
| `Product` (public) | Adds `slug`, `imageUrl` (site-relative path of the 480 px variant's base name), `imageAlt` and `details` (list of short facts). |
| `Category` (public) | Adds `productCount`: number of active products in the category. |
| `GET /products` | Adds `minPrice` and `maxPrice` (inclusive, `Money` strings) and `available` (boolean). Default order (no `sort`) is the catalog display order. |
| `GET /products/{productIdOrSlug}` | The path parameter accepts the product UUID or its slug. |
| `products` table | Adds `image_path VARCHAR(200)`, `image_alt VARCHAR(200)`, `details TEXT[]` and `display_order INTEGER`. |

## Reason and alternatives

The approved storefront design (S2-D09) shows readable product URLs, product images with descriptions, a details list and price and stock filters. Without the change, these features would have to be removed or derived on the client from naming conventions, which couples the frontend to file layouts and cannot be filtered server-side.

## Impact

- API: additive only; existing fields and semantics are unchanged.
- Database: new nullable or defaulted columns; no data migration of existing rows (the catalog tables are new in Sprint 3).
- Security: catalog reads are public (`GET` only); writes remain under `/admin/**` for a later sprint.
- Tests: catalog integration tests against PostgreSQL; E2E-16 exercises the storefront against the real API.
