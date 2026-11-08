# Storefront Requirements — Redesign Baseline

Status: scope approved — Product Owner, 2026-11-08 (decisions S2-D01 to S2-D07). Visual design details are pending the design-system review in Sprint 2.
Relationship to the SRS: supplements the canonical SRS (v1.1 with the approved addendum) for the customer-facing storefront. Backend functional requirements (catalog, cart, checkout, orders, administration) remain defined by the SRS and the OpenAPI v1.0 design baseline.

## Context

The original storefront reproduced a third-party commercial theme, including hotlinked theme imagery, page structure and placeholder copy, and read its catalog from a public demo service that is no longer reliable. The storefront is replaced by an original design. Authentication behavior (FR-01 to FR-05) is unchanged.

## Requirements

| ID | Requirement | Acceptance criteria | Priority |
| --- | --- | --- | --- |
| SF-01 | Original visual identity | No code, imagery, copy or page structure derived from third-party themes. Every image has a recorded source and licence permitting this use | Must |
| SF-02 | Brand and locale | The product name is CommerceFlow everywhere. All interface text is English. Prices are shown in US dollars with the `en-US` format | Must |
| SF-03 | Responsive layout | Every page is usable from 360 px to 1440 px wide with no horizontal scrolling; navigation is available on narrow screens | Must |
| SF-04 | Accessible interface | WCAG 2.1 AA contrast; full keyboard operation with visible focus; form fields have labels; dialogs trap focus and restore it when closed | Must |
| SF-05 | Feedback states | Loading, success, error and empty states follow the project feedback rules for every data view and action | Must |
| SF-06 | Catalog browsing | Home page with featured categories and products; product listing with category filter, sort and pagination; product detail with images, description, price, availability and variants | Must |
| SF-07 | Cart | Add to cart from listing and detail pages, mini-cart panel, cart page with quantity changes, removal and totals | Must |
| SF-08 | Checkout presentation | Single-page checkout layout (contact, shipping address, delivery, payment method, review) that clearly states no payment is taken | Should |
| SF-09 | Account access | Sign-in, registration and account menu restyled to the design system while keeping the approved authentication behavior and accessible names | Must |
| SF-10 | Demonstration data | Until the catalog and cart APIs exist, the storefront uses a typed local demonstration data set behind an API-shaped module. The interface labels it as demonstration data | Must |
| SF-11 | Performance | Production build Lighthouse performance and accessibility scores of at least 90 on the home and product pages (mobile profile) | Should |
| SF-12 | Error pages | Not-found and unexpected-error pages explain the problem and offer a way back | Must |

## Out of scope for the redesign

Server-side catalog, cart persistence, order placement, payments and administration. These follow in later sprints against the SRS and OpenAPI baseline.

## Open questions

- Number of demonstration products and categories (proposed: 24 products in 6 categories).
- Whether a dark colour scheme is required (proposed: not in Sprint 2).
