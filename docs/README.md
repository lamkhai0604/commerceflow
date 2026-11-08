# CommerceFlow Documentation

| Section | Contents |
| --- | --- |
| [Current status](STATUS.md) | Active sprint, revision, blockers and next action |
| [Workflow](WORKFLOW.md) | Branching, permissions, engineering profile and verification commands |
| [Decision log](DECISIONS.md) | Architecture decisions and change requests with status and links |
| [Requirements](requirements/) | SRS v1.1, the approved design addendum (checkout reliability, security) and the [storefront requirements](requirements/storefront-requirements.md) |
| [Architecture](architecture/) | [Design baseline](architecture/design-baseline.md), [ADR-006 checkout idempotency](architecture/adr/ADR-006-checkout-idempotency.md), [checkout reliability design](architecture/checkout-reliability-design.md), [diagrams](architecture/diagrams/) (use case, class, sequences, ERD) |
| [API](api/) | [OpenAPI v1.0 design baseline](api/openapi-v1.0-DESIGN-BASELINE.yaml), [OpenAPI v1.1 authentication (proposed)](api/openapi-v1.1-auth-PROPOSED.yaml), [OpenAPI v1.2 catalog (approved, CR-S3-01)](api/openapi-v1.2-catalog.yaml), [authentication contract review](api/auth-contract-v1.1-review.md), [checkout policy contract](api/checkout-policy-contract.md) |
| [Testing](testing/) | [Test strategy](testing/Test-Strategy-v1.0-DRAFT.docx), [traceability matrix](testing/Requirements-Traceability-Matrix-v1.0.xlsx), [checkout acceptance tests](testing/checkout-acceptance-tests.md), [HTTPS E2E runbook](testing/e2e-https-integration.md) |
| [Change requests](change-requests/) | [CR-04 error handling](change-requests/CR-04-standardized-error-handling.md), [CR-S1C-01 correlation header](change-requests/CR-S1C-01-correlation-header.md), [CR-S1C-03 environment files](change-requests/CR-S1C-03-environment-files.md) |
| Backend | [Setup](../backend/README.md), [authentication](../backend/AUTHENTICATION.md) |

## Sprints

| Sprint | Goal | Status |
| --- | --- | --- |
| [Sprint 0](../backend/README.md) | Java 21 / Spring Boot backend foundation, CI | Done |
| [Sprint 1A](sprints/sprint-1a.md) | System design baseline | Done (diagram PDF parity open) |
| [Sprint 1B](sprints/sprint-1b.md) | Session authentication, backend and frontend | Done |
| [Sprint 1C](sprints/sprint-1c.md) | HTTPS integration and real-browser E2E | Released to `master` |
| [Sprint 2](sprints/sprint-2.md) | Storefront cleanup and redesign | Merged into `develop`; release pending |

## Document status labels

File names keep the status they were issued with: `DRAFT` and `REVIEW` are working versions, `APPROVED`/`FINAL` are accepted, `PROPOSED` awaits a decision. The [decision log](DECISIONS.md) holds the current status of every decision.
