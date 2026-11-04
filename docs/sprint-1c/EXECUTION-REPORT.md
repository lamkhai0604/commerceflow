# Gate 1 local execution report

Overall: **BLOCKED for acceptance**, not production-ready.

Base develop: `b2b997b8d1f1634141f10092d3804bae328ac51d`.
Tested integration implementation: `25ffef3a747a2863beef665152241b1eabf6dfbe`.
The subsequent evidence/documentation commit does not change runnable code; its
SHA and hosted CI URL/conclusion are reported in the Draft PR/final handoff.

## Commands and actual outcomes

Environment: Linux Docker Engine 28.4.0, Compose v2, host Node 24.19.0, Maven
Wrapper 3.9.11 and temporary Temurin JDK 21.0.8. Browser: Chromium
156.0.8078.79 inside the disposable Node 24 test runner. Playwright 1.64.1.

```sh
NPM_CONFIG_CACHE=/workspace/work/npm-cache PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci
npm run typecheck
npm run typecheck:e2e
npm run lint:auth
npm run lint:e2e
npm run test:e2e:infra
CI=true npm test -- --watchAll=false --runInBand
REACT_APP_AUTH_API_BASE_URL=/api/v1 CI=true npm run build
```

PASS: clean installation, all type/lint checks, shell syntax checks, production
build; 90 frontend tests / 7 suites, 0 failures/skips; 5 lifecycle safety tests,
0 failures/skips (temporary files and fake Docker executable only).

Actual backend command (external proxy/cache settings only; no values exposed):

```sh
JAVA_HOME=/workspace/work/backend-tooling/jdk-21.0.8+9 \
MAVEN_OPTS=-Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts \
MAVEN_USER_HOME=/workspace/work/backend-tooling/.m2 \
./backend/mvnw -f backend/pom.xml \
-s /workspace/work/backend-tooling/settings.xml -B clean verify
```

```text
Tests run: 49, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

Includes 22 auth HTTP tests and 3 V4 migration tests on PostgreSQL Testcontainers.

```sh
npm run test:e2e -- --list
bash e2e/scripts/run.sh local-20261104-final
```

15 cases discovered/executed. Exit code **1**, correctly blocking acceptance:
**13 passed, 2 failed, 0 skipped**. Twelve genuine backend scenarios passed;
one passed case is explicitly controlled synthetic, not genuine backend E2E.

## Matrix

| ID | Result | Evidence |
| --- | --- | --- |
| E2E-01 | PASS | Actual /me 401; quiet anonymous UI |
| E2E-02 | PASS | Actual CSRF token/header bootstrap |
| E2E-03 | PASS | Registration 201, prefilled login, no auto-login |
| E2E-04 | PASS | Real login and authenticated profile/UI |
| E2E-05 | PASS | Browser reload restores session |
| E2E-06 | PASS | Logout 204; replay rejected |
| E2E-07 | PASS | INVALID_CREDENTIALS and safe UI |
| E2E-08 | FAIL | 409 EMAIL_CONFLICT correct; duplicate correlation header |
| E2E-09 | FAIL | 400 VALIDATION_ERROR correct; duplicate correlation header |
| E2E-10 | PASS | Missing/invalid/cross-session CSRF rejected; explicit retry only |
| E2E-11 | PASS | Own JDBC session expired; /me 401, quiet signed-out reload |
| E2E-12 | PASS | Real role-filter ACCESS_DENIED; valid session preserved |
| E2E-13 | PASS | Secure, HttpOnly, Lax, Path=/ cookie and HTTPS transport |
| E2E-14 | PASS | Session rotation; old identifier and stale token rejected |
| E2E-15 | PASS — SYNTHETIC | One controlled non-JSON response; safe fallback/no replay |

The expired-session fixture updates both last_access_time and expiry_time,
matching the existing backend integration test; no production timeout or schema
change. E2E-12 is a security-filter probe, not a claimed admin business endpoint.

## TLS, secrets and cleanup

Both required TLS gates passed: Chromium rejected the untrusted CA and verified
HTTPS after private-container NSS import. ignoreHTTPSErrors=false throughout.
No host/system trust modification. Same origin is https://localhost:8443 inside
the test runner's shared Caddy network namespace. No backend/database host ports.

No traces, HAR, screenshots, video, raw auth network bodies, credentials, cookies,
CSRF tokens or actual request-ID values were persisted in this report/artifacts.
Only approved sanitized files are copied under evidence/local. All other domains
are blocked; one offline font stylesheet fixture is disclosed in IMPLEMENTATION.md.
No production service or customer account was used.

Cleanup PASS: owned containers, networks/tmpfs, browser image, credentials and
CA/server private keys removed. Sanitized evidence retained. Shared base-image
and build caches may remain; no existing development resources were removed.

Early setup attempts identified read-only Buildx metadata, nested-host loopback
readiness and injected HTTP-proxy routing issues. These were resolved within
owned infrastructure; failed attempts were cleaned. The first expiry fixture
was incomplete and was corrected to match existing backend tests. These are not
claimed as production authentication defects.

## Remaining gates

- Confirmed backend correlation defect: see CORRELATION-CORRECTION-REQUEST.md.
  Production changes need separate authorization. Assertions remain strict.
- Hosted integration CI runs after Draft PR creation; do not infer green status
  from local frontend/backend checks. The known correlation failures should fail
  the integration job; cleanup/artifact stages run regardless.
- Gemini independent review, Tech Lead verification and Product Owner acceptance.
- Windows Docker Desktop/browser acceptance is not established by Linux results.
- Public assets/legacy commerce, deep-link coverage and broader ADR-04 policy are
  not acceptance claims; Gate 2 remains HOLD. Image tags/APT packages follow their
  supported versions; per-run digests record the actual environment, not a claim
  of byte-for-byte future builds.

No src/, backend source/config/migrations, OpenAPI/FINAL baseline, legacy commerce
client, existing CI workflows, develop/master, or production settings changed.
