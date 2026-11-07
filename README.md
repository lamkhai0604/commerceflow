# CommerceFlow

An e-commerce web application: a React storefront and a Java Spring Boot backend with PostgreSQL, built sprint by sprint with a written design baseline, change control and automated tests.

**Status:** Sprint 1C complete. Session authentication (register, log in, log out, roles) works end to end behind HTTPS and is covered by unit, integration and real-browser tests. The storefront pages (catalog, cart, checkout) still use the legacy client and a mock data API; connecting them to the backend and implementing checkout come next.

## Features

| Area | Status |
| --- | --- |
| Storefront UI: home, featured and recommended products, cart, checkout pages | Built (legacy data source) |
| Registration, login, logout, session restoration | Done (Sprint 1B) |
| Role-based access (CUSTOMER, ADMIN) | Done (Sprint 1B) |
| CSRF protection, secure session cookie, session rotation | Done (Sprint 1B) |
| HTTPS same-origin integration and E2E tests | Done (Sprint 1C) |
| Product catalog API, cart, idempotent checkout, mock payment, order cancellation | Designed (Sprint 1A), not implemented |

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Redux Toolkit, Redux-Saga, MUI, Axios |
| Backend | Java 21, Spring Boot 3.5, Spring Security, Spring Session JDBC, Spring Data JPA |
| Database | PostgreSQL 17, Flyway migrations |
| Testing | Jest and React Testing Library; JUnit 5 with Testcontainers; Playwright with Chromium over HTTPS |
| Infrastructure | Docker Compose, Caddy (HTTPS reverse proxy for integration tests), GitHub Actions |

## Architecture

```mermaid
flowchart LR
  B[Browser] -->|HTTPS, same origin| P[Reverse proxy]
  P -->|static files| F[React build]
  P -->|/api/v1| S[Spring Boot API]
  S --> D[(PostgreSQL)]
  S -.->|sessions| D
```

Key decisions (session authentication, same-origin deployment, crash-safe idempotent checkout, mock payments) are listed in the [decision log](docs/DECISIONS.md).

## Getting started

### Frontend

Requires Node 24.

```sh
npm ci
npm start                 # development server on http://localhost:3000
npm run typecheck
npm run lint:auth
CI=true npm test -- --watchAll=false
CI=true npm run build
```

### Backend

Requires JDK 21 and Docker. See [backend/README.md](backend/README.md) for configuration.

```sh
cd backend
cp .env.example .env      # set a local database password
docker compose --env-file .env up -d --wait
./mvnw clean verify
./mvnw spring-boot:run    # API on http://localhost:8080/api/v1
```

### End-to-end tests (HTTPS)

Requires Linux Docker Engine with Compose v2. See the [runbook](docs/testing/e2e-https-integration.md).

```sh
npm run test:e2e:infra
bash e2e/scripts/run.sh local-<unique-run-id>
```

## Continuous integration

| Workflow | Runs |
| --- | --- |
| `frontend-ci.yml` | Type check, lint, Jest tests and production build |
| `backend-ci.yml` | `mvn clean verify` with PostgreSQL Testcontainers; fails if integration suites are skipped |
| `integration-e2e.yml` | Full HTTPS stack with Playwright Chromium (15 scenarios) and guaranteed cleanup |

## Documentation

Start at [docs/README.md](docs/README.md): requirements, architecture, API contracts, test plans, sprint reports and the decision log.

## Branches

`develop` is the integration branch; `master` is protected and receives reviewed releases only. Work happens on `feature/*`, `fix/*` and `docs/*` branches through pull requests into `develop`.

## Local environment files

`.env` files are ignored and must never be committed; `.env.example` files hold placeholders only.

## Project information

- **Author:** Lam Khai
- **Repository:** https://github.com/lamkhai0604/ecommerce-project
