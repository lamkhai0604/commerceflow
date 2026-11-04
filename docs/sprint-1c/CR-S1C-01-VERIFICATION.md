# CR-S1C-01 correction and verification

Product Owner authorized this minimal exception to the Gate 1 backend restriction.
Gate 2 otherwise remains HOLD. PR #16 remains Draft; no merge or deployment.

## Cause and correction

Baseline head: `1c30c092c5239cd0f785f40f661ed5a99063ae93`.
Correction: `dd1fba1865784e20e276a56eceaaa3b8763c7ac6`.

RequestCorrelationFilter sets X-Request-ID before the chain. MVC ResponseEntity
processing adds the header supplied again by ApiProblemFactory.headers(). The
real baseline browser evidence records two values for 400 and 409, versus one
for security-filter responses. The fix removes only that MVC header assignment.
Content type, no-store, status/code, body UUID and urn:uuid instance are unchanged.
The direct security/filter writer still uses setHeader, preserving its existing
replacement semantics and fallback behavior. No new correlation scheme.

Changed production file: backend/src/main/java/com/commerceflow/backend/error/ApiProblemFactory.java.
Changed tests:
- backend/src/test/java/com/commerceflow/backend/auth/AuthenticationIntegrationTest.java:
  shared real-HTTP helper requires allValues(X-Request-ID).containsExactly(body.requestId),
  retaining UUID parsing and exact instance parity. Existing cases exercise
  400 VALIDATION_ERROR, 409 EMAIL_CONFLICT (including concurrent registration),
  401 UNAUTHENTICATED, 403 CSRF_INVALID and ACCESS_DENIED, MVC 500 INTERNAL_ERROR
  from an unrelated PostgreSQL check failure, provider 500 and temporary 503.
- backend/src/test/java/com/commerceflow/backend/error/RequestCorrelationFilterTest.java:
  existing unexpected-filter-failure case also asserts one header, UUID and
  matching instance on safe 500. Its mapper uses Spring's ProblemDetail mixin
  to match runtime extension-field serialization.

No authentication logic, sessions, OpenAPI, migrations, legacy commerce,
frontend source, Vercel settings or existing workflows changed by this correction.
No header normalization, relaxed assertions, skips, retries or expected failures.

## Commands and completed local checks

```sh
npm run typecheck
npm run typecheck:e2e
npm run lint:auth
npm run lint:e2e
npm run test:e2e:infra
CI=true npm test -- --watchAll=false --runInBand
REACT_APP_AUTH_API_BASE_URL=/api/v1 CI=true npm run build
JAVA_HOME=/workspace/work/backend-tooling/jdk-21.0.8+9 \
MAVEN_OPTS=-Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts \
MAVEN_USER_HOME=/workspace/work/backend-tooling/.m2 \
./backend/mvnw -f backend/pom.xml \
-s /workspace/work/backend-tooling/settings.xml -B clean verify
bash e2e/scripts/run.sh local-cr01-20261104
```

Frontend types/lint/build PASS; Jest 90/90 across seven suites, zero skips.
Lifecycle safety tests 5/5, zero skips. Java 21 Maven: 49 tests, zero failures,
errors or skips; BUILD SUCCESS. Includes PostgreSQL auth 22 and V4 migrations 3.
Existing Browserslist age/Node deprecation notices remain; no warning suppression.

An initial Maven attempt was blocked by sandbox socket access. After authorized
Docker access, the new standalone filter assertion exposed a missing ProblemDetail
mixin in its test mapper; corrected before the final passing full run. No app fix
was needed beyond removal of the redundant header assignment. Prior failed runs
are not counted as passing verification.

## HTTPS revalidation — completed PASS

Run local-cr01-20261104 at correction commit dd1fba1 exited 0. All 15 cases
executed: 15 PASS, 0 FAIL, 0 SKIP. E2E-01–14 use the real backend; E2E-15 is
controlled synthetic. The E2E assertions and test definitions were unchanged.

| Cases | Verified result |
| --- | --- |
| 01–06 | Anonymous startup, CSRF bootstrap, registration/no auto-login, login, restoration and logout/replay PASS |
| 07 | Safe invalid credentials PASS |
| 08 | 409 EMAIL_CONFLICT; exactly one matching correlation header PASS |
| 09 | 400 VALIDATION_ERROR; exactly one matching correlation header PASS |
| 10 | CSRF missing/invalid/cross-session and explicit recovery/no replay PASS |
| 11–12 | Actual session expiry and role-filter denial/session preservation PASS |
| 13–14 | Secure/HttpOnly/Lax/Path cookie, HTTPS, ID rotation and stale CSRF rejection PASS |
| 15 | Synthetic non-JSON safe fallback PASS |

Both untrusted rejection and trusted private-NSS certificate verification PASS;
TLS validation remained enabled. All retained correlation entries have one
header and allMatchBody=true. No raw UUIDs, auth bodies, credentials, tokens or
cookies are stored. See evidence/cr-s1c-01 for the updated sanitized evidence;
evidence/local retains the original failure evidence for auditability.

Cleanup PASS: owned containers/networks/tmpfs, credentials/private keys and owned
browser image removed. Existing Docker resources and host/system trust untouched.
Base-image/build caches may remain, as documented in the runbook.

## Hosted CI and remaining limitations

Completed hosted CI for final baseline head
`7d678e97137ed567bd54261f059fef82fe2abbb7`:
- [Backend CI](https://github.com/lamkhai0604/ecommerce-project/actions/runs/41887324664): SUCCESS.
- [Frontend CI](https://github.com/lamkhai0604/ecommerce-project/actions/runs/41887324715): SUCCESS.
- [HTTPS integration CI](https://github.com/lamkhai0604/ecommerce-project/actions/runs/41887324656): SUCCESS, including all 15 browser cases, cleanup and artifact upload.

The separate corrective commit dd1fba1 also passed all three workflows. These
conclusions supersede the formerly pending status recorded during evidence
preparation. CR-S1C-02 revalidation is recorded separately with its own SHA.

No remaining local test failure. Gemini/Tech Lead review and Product Owner
acceptance remain required; Gate 2 stays HOLD. Linux is not Windows Docker Desktop
acceptance. Offline font fixture, blocked external/legacy commerce domains,
root-container browser no-sandbox isolation limitations and per-run image/APT
version reproducibility limitations remain as documented in IMPLEMENTATION.md.
No merge, deployment, FINAL sign-off or Vercel modification is authorized.
