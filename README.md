# CommerceFlow

An e-commerce web application: a React storefront and a Java Spring Boot backend with PostgreSQL, built sprint by sprint with a written design baseline, change control and automated tests.

**Status:** Sprint 1C released. Session authentication (register, log in, log out, roles) works end to end behind HTTPS and is covered by unit, integration and real-browser tests. Sprint 2 replaced the original storefront, which reproduced a third-party theme, with an original responsive design on demonstration data; see the [current status](docs/STATUS.md).

## Features

| Area | Status |
| --- | --- |
| Storefront UI: home, catalog with filters, product, cart and demo checkout, on demonstration data | Done (Sprint 2) |
| Registration, login, logout, session restoration | Done (Sprint 1B) |
| Role-based access (CUSTOMER, ADMIN) | Done (Sprint 1B) |
| CSRF protection, secure session cookie, session rotation | Done (Sprint 1B) |
| HTTPS same-origin integration and E2E tests | Done (Sprint 1C) |
| Product catalog API, cart, idempotent checkout, mock payment, order cancellation | Designed (Sprint 1A), not implemented |

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router, Redux Toolkit, Redux-Saga, Axios |
| Backend | Java 21, Spring Boot 3.5, Spring Security, Spring Session JDBC, Spring Data JPA |
| Database | PostgreSQL 17, Flyway migrations |
| Testing | Vitest and React Testing Library; JUnit 5 with Testcontainers; Playwright with Chromium over HTTPS |
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

Requires Node 22.12 or later (CI uses Node 24).

```sh
npm ci
npm run dev               # development server on http://localhost:3000; /api/v1 is proxied to :8080
npm run typecheck
npm run lint
npm test
npm run build             # output in build/
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
| `frontend-ci.yml` | Type check, lint, Vitest tests and production build |
| `backend-ci.yml` | `mvn clean verify` with PostgreSQL Testcontainers; fails if integration suites are skipped |
| `integration-e2e.yml` | Full HTTPS stack with Playwright Chromium (16 scenarios: authentication and the storefront flow) and guaranteed cleanup |

## Documentation

Contributors start at [AGENTS.md](AGENTS.md). Project documentation starts at [docs/README.md](docs/README.md): requirements, architecture, API contracts, test plans, sprint reports and the decision log.

## Branches

`develop` is the integration branch; `master` is protected and receives reviewed releases only. Work happens on `feature/*`, `fix/*` and `docs/*` branches through pull requests into `develop`.

## Local environment files

`.env` files are ignored and must never be committed; `.env.example` files hold placeholders only.

## Project information

- **Author:** Lam Khai
- **Repository:** https://github.com/lamkhai0604/ecommerce-project
