# CommerceFlow backend

Independent Java 21 / Spring Boot 3.5.16 service. The existing React frontend
continues to run separately and is not wired to this service in Sprint 0.
Dependencies include Web, Data JPA, Validation, PostgreSQL, Flyway, and Actuator.
Authentication uses Spring Security and PostgreSQL-backed Spring Session JDBC.
See [Authentication](AUTHENTICATION.md) for the contract, security settings,
admin provisioning procedure, migrations, and requirement-to-test mapping.

## Prerequisites

- JDK 21 (`java -version`)
- Docker with Compose v2 for local PostgreSQL and container integration tests
- Internet access on the first Maven Wrapper run to download Maven/dependencies

Run all commands below from `backend/`. On Windows, use `mvnw.cmd` in place of
`./mvnw` and set environment variables using your shell's equivalent commands.

## Local database and configuration

```sh
cp .env.example .env
# Edit .env and replace POSTGRES_PASSWORD with your own local development value.
docker compose --env-file .env config --quiet
docker compose --env-file .env up -d --wait
```

Compose binds PostgreSQL 17 to loopback only and persists it in the
`postgres-data` named volume. `POSTGRES_DB`, `POSTGRES_USER`, and
`POSTGRES_PASSWORD` are required, with no application credential defaults.
`DB_HOST`, `DB_PORT`, and `SERVER_PORT` default to localhost, 5432, and 8080.
If port 5432 is occupied, change `DB_PORT` in `.env`.
For local HTTP, `.env.example` sets `SESSION_COOKIE_SECURE=false`; production
HTTPS must use `true` (the application default). Cookies are HttpOnly,
SameSite=Lax, Path=/; sessions expire after 30 minutes of inactivity.

Compose loads the file for interpolation, but Java does **not** automatically
load `.env`. Export the same values before starting the backend (POSIX shell):

```sh
set -a
. ./.env
set +a
```

Only source a local file you trust; quote values containing shell special
characters. Never commit `.env` or real credentials. `.env.example` contains
placeholders only. Keep backend values in `backend/.env`, separate from the
existing frontend environment file.

PostgreSQL initialization variables apply only to a new database volume.
Changing `.env` will not change credentials in an already initialized volume;
update that database explicitly rather than deleting data to change credentials.

## Build, test, and start

```sh
./mvnw clean verify
./mvnw spring-boot:run
```

Or start the packaged application after building:

```sh
java -jar target/backend-0.0.1-SNAPSHOT.jar
```

```sh
curl --fail http://localhost:8080/api/v1/health
# {"status":"UP"}
curl --fail http://localhost:8080/actuator/health
# {"status":"UP"} when the application and database are healthy
```

`/api/v1/health` is a basic application availability endpoint, not a database
probe. `/actuator/health` includes database health but exposes no component
details. Only Actuator health is exposed over HTTP. Full application startup
requires PostgreSQL: Flyway runs migrations first, then Hibernate validates the
schema (`ddl-auto=validate`); Hibernate does not create/update domain tables.
The initial migration reserves the `commerceflow` schema. V2/V3 add authentication
and session tables; V4 enforces CR-05 registration lengths with fail-closed
aggregate preflight checks and no data remediation. See AUTHENTICATION.md before
upgrading an existing local database. Flyway history lives
in PostgreSQL's default `public` schema. Add future domain changes as versioned
SQL files under `src/main/resources/db/migration/`.

## Test coverage

```sh
./mvnw test
./mvnw -Dtest=HealthControllerTest test
```

The MVC test checks status, JSON media type, and response without a database.
`ApplicationIntegrationTest` starts an isolated PostgreSQL 17 container and the
real application, verifies both HTTP health endpoints, and checks Flyway's
schema/history. It uses disposable test credentials, not `.env`. The foundation
suite skips without Docker, but the authentication, migration, and production-cookie suites
require Docker and fail if it is unavailable. No locally running database is
needed for tests. For unit/MVC tests without Docker, use
`./mvnw -Dtest=AuthServiceTest,HealthControllerTest test`.

## GitHub Actions CI

`.github/workflows/backend-ci.yml` runs on pull requests targeting `develop` or
`master` when `backend/**` or the workflow itself changes. The Ubuntu runner
uses Temurin Java 21 and the checked-in Maven Wrapper to run `./mvnw clean verify`
from `backend/`. Maven dependencies are cached using the POM and wrapper
configuration as cache inputs.

CI requires a working Docker daemon before Maven runs. Testcontainers starts
its own isolated PostgreSQL 17 database; no GitHub database secrets, `.env`,
Compose service, or shared database is needed. After Maven succeeds, CI checks
the Surefire XML report for all three named PostgreSQL integration tests and
rejects missing reports, missing tests, skips, errors, or failures. Thus the
local Docker-unavailable skip behavior cannot silently pass CI.

To reproduce the CI build locally with JDK 21 and Docker running:

```sh
docker info > /dev/null
./mvnw clean verify
```

Check `target/surefire-reports/TEST-com.commerceflow.backend.ApplicationIntegrationTest.xml`
for three executed tests with zero skips, failures, and errors. In the PR's
Checks tab, `Backend CI / Java 21 build and PostgreSQL tests` must pass,
including the final integration-test report check. This workflow performs
validation only; it does not publish artifacts or deploy the application.

Stop local PostgreSQL while preserving data:

```sh
docker compose --env-file .env stop
```

Frontend authentication/API wiring, catalog/checkout implementation, and
production deployment remain outside this backend authentication change.
