# Sprint 1C Gate 1 — isolated HTTPS integration

Authority: [Product Owner's uploaded handoff v1.0](AUTHORITATIVE-HANDOFF-v1.0.md).
Baseline develop: `b2b997b8d1f1634141f10092d3804bae328ac51d`.
Gate 1 implementation is authorized; Gate 2 remains HOLD. This is not production,
Windows acceptance, contract FINAL publication or merge/deployment approval.

## File manifest and boundaries

- `e2e/infra/`: Caddy routing, isolated Compose, test-only Node/Chromium image.
- `e2e/scripts/`: unique ownership, localhost readiness, private CA trust and cleanup.
- `e2e/support/`: browser fetch helpers, disposable accounts/session fixture,
  offline public-asset isolation, certificate probes and sanitized reporter.
- `e2e/tests/`: lifecycle, real security/error cases and a separately identified
  synthetic non-JSON response case.
- `e2e/playwright.config.ts`, `tsconfig.json`, `.eslintrc.json`, `.gitignore`:
  independent test configuration; no production compiler or lint weakening.
- `package.json`/lock: pinned test dependencies and E2E commands only.
- `.github/workflows/integration-e2e.yml`: dedicated PR/optional manual CI.
- `docs/sprint-1c/`: authority, runbook and sanitized evidence/report.

No changes to src/, backend production source/configuration, Flyway, OpenAPI,
legacy commerce clients, or existing frontend/backend workflows. The test lint
configuration disables only RTL's screen-query rule, which misidentifies
Playwright page.getByRole as an RTL render query. All other checks remain active.

## Topology and trust

Only `127.0.0.1:8443` is published. Caddy serves the actual React production bundle
with SPA fallback and preserves `/api/v1` when proxying to the unmodified backend.
All test networks are internal. Backend and PostgreSQL 17 have no published ports. PostgreSQL uses tmpfs, never an
existing volume. App cookie Secure remains true. No global 401 policy changes. Caddy preserves inherited proxy settings and appends
only backend/localhost to NO_PROXY/no_proxy so private upstream traffic never
uses an outbound HTTP proxy. External destination policy is not bypassed.

The browser container shares Caddy's network namespace so its localhost resolves
to the same `https://localhost:8443` origin. A separate internal fixture network
allows the test runner to expire its own JDBC session via a parameterized query
against only this run's disposable database. It has no Docker socket. Read-only
mounts expose only test code, package/TS configuration and node_modules—not .git,
.env, backend local credentials, or the private CA key. Caddy receives only its
server certificate/key; Chromium receives only the public CA certificate.

A fresh CA/server certificate with localhost/IP SANs is generated for each run.
Chromium must reject the untrusted certificate before trust is installed. The CA
is then imported into private container NSS databases, and Chromium must verify
HTTPS successfully with ignoreHTTPSErrors=false. Curl uses --cacert explicitly.
No system/host trust changes, certificate bypass, SPKI exception or insecure-localhost
flag. Root-container Chromium uses --no-sandbox for process startup only; this is
not a TLS/security-check bypass. Containers and private profiles are disposable.

## Public assets versus genuine API evidence

Existing built CSS imports remote Google fonts. Tests fulfill **only** that public
font stylesheet with an empty offline fixture (system fallback fonts), avoiding
CSS-chunk failure without changing production code. All other non-localhost
requests, including the legacy commerce service, are blocked. No production/cloud
service is contacted. External font/CDN availability and unrelated catalog UI are
not acceptance claims.

E2E-01 through E2E-14 use the real backend, PostgreSQL and verified HTTPS.
E2E-10 alters a request header to exercise genuine backend CSRF rejection; it does
not fake a response. E2E-15 deliberately fulfills one malformed/non-JSON login
response and is reported CONTROLLED_SYNTHETIC, never genuine backend acceptance.

## Prerequisites and exact commands

Linux Docker Engine/Compose v2, Node 24, JDK 21, Python 3, OpenSSL and curl.
Port 8443 must be free; do not stop another service to obtain it. Required images:
postgres:17, caddy:2-alpine, eclipse-temurin:21-jre, and node:24-bookworm-slim as the
browser build base. Resolved digests and browser version are recorded per run.
The browser image installs Chromium and NSS tooling through Debian packages;
it does not download the previously blocked Playwright Docker image.

```sh
npm ci
npm run typecheck
npm run typecheck:e2e
npm run lint:auth
npm run lint:e2e
npm run test:e2e:infra
CI=true npm test -- --watchAll=false --runInBand
REACT_APP_AUTH_API_BASE_URL=/api/v1 CI=true npm run build
./backend/mvnw -f backend/pom.xml clean verify
npm run test:e2e -- --list
bash e2e/scripts/run.sh local-<unique-run-id>
```

`npm run test:e2e` is executed inside the isolated trusted browser container by
run.sh. Running it on an unprepared host will correctly fail TLS/fixture checks;
it does not install host trust automatically. The --list command needs no stack.
For managed environments, retain the platform proxy/CA settings; an optional
CODEX_PROXY_CERT is supplied as a BuildKit secret for apt TLS, not copied into an
image. Local npm cache/Maven proxy settings may live outside the repository.
Never print those settings or credentials. CI needs no secrets or personal PC.

## Readiness, evidence and failure handling

start.sh checks localhost port ownership and project/network collisions, creates
a fresh run directory and generated DB password, then starts the isolated stack.
HTTPS health readiness uses bounded retries (90 attempts, 3s request timeout),
not a fixed startup sleep. The readiness curl runs in the same network namespace
as Chromium with --cacert; nested Docker executors cannot necessarily reach the
daemon host loopback publication from their own localhost. Host bind preflight
and Docker port allocation both guard collisions; no binding is broadened. Browser TLS probes are mandatory gates before tests.

No trace, HAR, video or screenshots are captured. Browser output/error-context
files stay in container tmpfs. Custom reporting suppresses worker stdout/stderr,
raw assertion values, network bodies and stack/call logs. Only IDs, kind, status
and allowlisted diagnostic codes are reported. Retries are zero. Missing, failed
or skipped required tests force a failed run; no silent skip success.

Evidence under `e2e/.state/<id>/evidence` is limited to setup/cleanup, TLS probe
booleans, sanitized test summary, image digests and browser version. CI uploads
only these explicitly named files. Build/operational logs are private and removed
by cleanup. Do not manually upload them or enable unsafe diagnostics.

A failing scenario is evidence, not permission to modify production auth or
contracts. Record Gate 2 findings and request separate authorization. Do not
weaken expected results, TLS, CSRF or role checks to make CI green.

## Acceptance matrix interpretation

| IDs | Verification |
| --- | --- |
| 01–03 | Quiet startup, real CSRF bootstrap, registration 201 and no auto-login |
| 04–06 | UI login, reload continuity, logout 204 and old-session replay rejection |
| 07–09 | Wrong credentials, duplicate email and backend validation with safe codes |
| 10 | Missing/invalid/cross-session CSRF, no automatic replay and explicit recovery |
| 11 | Own JDBC session expired in fixture; /me 401, quiet signed-out reload |
| 12 | CUSTOMER gets ACCESS_DENIED at existing /admin security boundary; /me stays 200 |
| 13–14 | Browser-managed Secure/HttpOnly/Lax/Path cookie, rotation, stale token/ID rejection |
| 15 | Controlled synthetic non-JSON failure, safe UI and no replay |

No admin business endpoint exists for ID 12; the unmapped path intentionally
checks the real security filter, not catalog administration. ID 11 uses the
existing passive startup behavior; ADR-04's broader 401 changes remain HOLD.

## Safe cleanup / rollback

run.sh installs cleanup on exit after successful startup; start.sh cleans its own
partial setup on failure. CI also invokes cleanup unconditionally:

```sh
bash e2e/scripts/cleanup.sh <exact-run-id>
```

Cleanup validates the restricted run-ID syntax, exact owned directory and owner
marker and rejects linked state roots/secret files. Five isolated lifecycle tests
use a fake Docker executable and temporary directories; they never contact Docker
or development data. Host interpolation variables cannot override generated test
credentials or bind paths. It uses that project's generated Compose env, removes only its containers,
networks/tmpfs and labeled browser image, then deletes generated credentials and
private/public test certificates. Sanitized evidence/owner marker remain. No
Docker prune, existing-volume deletion, migration history rewrite or real-data
remediation. Cleanup is repeatable; review cleanup.json and absence of test-owned
resources. Base-image/build caches may remain; they contain no test secrets.

## CI and review

The dedicated workflow targets relevant develop PR changes and manual execution,
uses Java 21/Node 24 and permissions contents:read, runs frontend/backend checks,
requires PostgreSQL suites to execute without skips, runs the real HTTPS suite,
and always cleans up. It never deploys. Existing CI workflows are unchanged.

Open a Draft PR to develop with actual results and limitations; request Gemini
independent review. Stop implementation after opening it and await review/owner
merge authorization. Windows Docker Desktop/browser acceptance remains separate.

## Actual execution evidence

See [EXECUTION-REPORT.md](EXECUTION-REPORT.md): frontend 90 PASS, backend 49 PASS,
lifecycle safety 5 PASS; HTTPS matrix 13 PASS / 2 FAIL / 0 SKIPPED. Acceptance is
blocked by [duplicate backend correlation headers](CORRELATION-CORRECTION-REQUEST.md).
Both Chromium certificate gates passed; no backend fix is included.

## Approved correlation correction

CR-S1C-01 removes the redundant backend MVC correlation-header assignment and
adds strict singleton-header regression assertions. See
[CR-S1C-01-VERIFICATION.md](CR-S1C-01-VERIFICATION.md) for the current 15/15 local
HTTPS result, exact commands and preserved before/after evidence. Gate 2 remains
HOLD; this is only the explicitly authorized backend exception.
