# Sprint 1C — HTTPS Integration and End-to-End Tests

| Field | Value |
| --- | --- |
| Goal | Prove authentication end to end: real browser, real backend and PostgreSQL, behind HTTPS on one origin |
| Result | Gate 1 complete: 15/15 E2E scenarios pass locally and in CI. Merged into `develop` through PR #16 (with PR #17) |
| Baseline | `develop` at `b2b997b` |
| Branch | `feature/sprint-1c-https-integration-e2e` |

## 1. Architecture decisions

| ID | Decision | Status |
| --- | --- | --- |
| S1C-ADR-01 | Isolated, reproducible HTTPS environment: Caddy reverse proxy serves the React production build and the Spring Boot `/api/v1` API from one HTTPS origin; PostgreSQL 17 with isolated test data; no production data, paid services or public staging; services bound to loopback | Approved |
| S1C-ADR-02 | Real-browser E2E with Playwright and Chromium against the real backend and database; no mocked API responses for acceptance; TLS verification never bypassed | Approved |
| S1C-ADR-03 | Dedicated GitHub Actions integration workflow (Ubuntu, Java 21, Node 24, Docker, Chromium) with read-only permissions; no deployment; existing workflows unchanged | Approved |
| S1C-ADR-04 | Context-aware handling of HTTP 401 (quiet signed-out state on startup, credential errors distinct from session expiry, no global logout on unknown 401, `CSRF_INVALID` distinct from `ACCESS_DENIED`) | Architecture approved; implementation on hold (Gate 2) |
| S1C-ADR-05 | Evidence, secrets and data isolation: disposable accounts and database; no passwords, session IDs, cookies or CSRF tokens in logs or artifacts; no automatic replay of state-changing requests; cleanup touches only test-owned resources | Approved |

## 2. Scope

**Gate 1 (approved):** isolated PostgreSQL 17; Caddy HTTPS with a per-run test CA; React production build behind the proxy; existing Spring Boot backend; Playwright Chromium tests; readiness checks, safe cleanup and documentation; dedicated CI workflow; sanitized evidence.

**Gate 2 (on hold):** changes to authentication logic, endpoints, OpenAPI contracts, Flyway migrations or the legacy commerce client; JWT, OAuth or a new authentication framework; deployment; changes to production secrets or infrastructure. Defects that need these changes are recorded and raised as change requests. Exceptions approved during the sprint: CR-S1C-01 and CR-S1C-02.

## 3. Environment

| Part | Value |
| --- | --- |
| Origin | `https://localhost:8443` |
| Proxy | Caddy; `/api/v1/*` to Spring Boot, all other routes to the React build with SPA fallback |
| Backend | Existing Spring Boot application, HTTP behind Caddy, no published port |
| Database | PostgreSQL 17 in a disposable container on tmpfs |
| Browser | Playwright Chromium, trusting the per-run test CA; `ignoreHTTPSErrors=false` |

Runbook: [HTTPS integration tests](../testing/e2e-https-integration.md).

## 4. Acceptance matrix

| ID | Scenario | Expected outcome | Result |
| --- | --- | --- | --- |
| E2E-01 | Anonymous startup | `/auth/me` 401; quiet signed-out UI | Pass |
| E2E-02 | CSRF bootstrap | 200 with a valid token | Pass |
| E2E-03 | Registration | 201; login dialog opens; no auto-login | Pass |
| E2E-04 | Login | 200; authenticated UI; session rotated | Pass |
| E2E-05 | Browser reload | `/auth/me` 200; session restored | Pass |
| E2E-06 | Logout | 204; session invalidated | Pass |
| E2E-07 | Wrong credentials | 401 `INVALID_CREDENTIALS`; safe UI | Pass |
| E2E-08 | Duplicate email | 409 `EMAIL_CONFLICT`; safe UI | Pass (after CR-S1C-01) |
| E2E-09 | Invalid registration | 400 with documented validation errors | Pass (after CR-S1C-01) |
| E2E-10 | Missing or invalid CSRF | 403 `CSRF_INVALID`; no automatic replay | Pass |
| E2E-11 | Expired session | 401; appropriate recovery | Pass |
| E2E-12 | Access denied | 403 `ACCESS_DENIED`; valid session kept | Pass |
| E2E-13 | Cookie attributes | Secure, HttpOnly, SameSite=Lax, Path=/ | Pass |
| E2E-14 | Session rotation | Previous session identifier rejected | Pass |
| E2E-15 | Malformed or non-JSON response | Safe generic UI; no raw error | Pass (controlled synthetic response) |

## 5. Change requests in this sprint

| ID | Summary | Record |
| --- | --- | --- |
| CR-S1C-01 | Duplicate `X-Request-ID` header on MVC 400/409 responses; one redundant header write removed, regression assertions added | [Request](../change-requests/CR-S1C-01-correlation-header.md), [verification](sprint-1c/cr-s1c-01-verification.md) |
| CR-S1C-02 | Cleanup fails closed on Docker, Compose and inventory errors; 18 lifecycle tests | [Verification](sprint-1c/cr-s1c-02-verification.md) |
| CR-S1C-03 | Root `.env` untracked; public project metadata moved to the README | [Review](../change-requests/CR-S1C-03-environment-files.md) |

## 6. Reports and evidence

- [Gate 1 first execution report](sprint-1c/gate-1-execution-report.md): 13/15 before CR-S1C-01 (kept as history).
- [CR-S1C-01 verification](sprint-1c/cr-s1c-01-verification.md): frontend 90 pass, backend 49 pass, HTTPS 15/15.
- [CR-S1C-02 verification](sprint-1c/cr-s1c-02-verification.md).
- [Vercel preview audit](sprint-1c/vercel-preview-audit.md): partially blocked by missing project access.
- Sanitized evidence: [`sprint-1c/evidence/`](sprint-1c/evidence/).

## 7. Risks and remaining work

| Risk | Mitigation |
| --- | --- |
| Test CA trust failure | Chromium must reject the untrusted CA, then accept it after import; both are gates |
| Cookie misconfiguration behind the proxy | E2E-13 and E2E-14 |
| Flaky startup | Bounded readiness checks, no fixed sleeps |
| Reuse of development volumes | Unique run IDs, tmpfs database, owner markers |
| Sensitive data in artifacts | No traces, HAR, screenshots or video; allowlisted evidence files only |

Remaining: S1C-ADR-04 implementation (Gate 2); Windows Docker Desktop acceptance; Vercel preview routing once access is granted.
