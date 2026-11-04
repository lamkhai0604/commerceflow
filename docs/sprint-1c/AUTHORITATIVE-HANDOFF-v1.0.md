# CommerceFlow — Sprint 1C Authoritative Implementation Handoff v1.0

**Status:** Gate 1 APPROVED — Execution Authorized
**Product Owner:** Approved in ChatGPT conversation
**Repository:** `lamkhai0604/ecommerce-project`
**Baseline branch:** `develop`
**Verified baseline SHA:** `b2b997b8d1f1634141f10092d3804bae328ac51d`
**Target branch:** `feature/sprint-1c-https-integration-e2e`

## 1. Document Authority

This document consolidates the previously approved Sprint 1C architecture decisions, Implementation Specification v1.0, and Gate 1 execution authorization.

These decisions were approved in the Product Owner's ChatGPT conversation and were not previously committed to GitHub.

Use the existing repository documents and approved Sprint 1B API contract as technical references.

If a conflict is found between this handoff and the approved authentication contract, do not silently override the contract. Report the conflict and request clarification.

## 2. Approved Architecture Decisions

### ADR-01 — Isolated HTTPS Integration Environment

**APPROVED**

- Use an isolated, reproducible integration environment.
- Prefer Caddy as the same-origin HTTPS reverse proxy.
- Serve the React production build and Spring Boot `/api/v1` API from the same HTTPS origin.
- Use PostgreSQL 17 with isolated test data.
- Do not use production databases, customer accounts, paid cloud services or public staging.
- Bind local services to loopback where practical.
- Preserve secure session cookies and the existing authentication architecture.

### ADR-02 — Real-Browser E2E Testing

**APPROVED**

- Use Playwright with Chromium.
- Test the actual React frontend against the actual Spring Boot backend and PostgreSQL.
- Do not substitute mocked API responses for real-backend E2E acceptance.
- Validate registration, login, session restoration, logout, CSRF, session rotation, cookie security and negative scenarios.
- Do not bypass TLS verification.

### ADR-03 — Dedicated Integration CI

**APPROVED**

- Add a dedicated GitHub Actions workflow for integration E2E.
- Use GitHub-hosted Ubuntu runners, Java 21, Node 24, Docker and Chromium.
- Run isolated infrastructure and deterministic tests.
- Restrict workflow permissions to the minimum necessary.
- Do not deploy.
- Preserve existing frontend and backend CI workflows unless a separately approved change is necessary.

### ADR-04 — Context-Aware HTTP 401 Policy

**ARCHITECTURE APPROVED — IMPLEMENTATION ON HOLD**

- Startup `/auth/me` returning 401 should produce quiet signed-out UI.
- Login `INVALID_CREDENTIALS` must not be treated as session expiry.
- Logout 401 should clear local identity without claiming successful logout.
- Protected authentication requests returning `UNAUTHENTICATED` should trigger session-expiry recovery.
- Unknown 401 responses must not automatically trigger global logout.
- `CSRF_INVALID` must be distinguished from `ACCESS_DENIED`.
- Do not introduce a global HTTP interceptor or modify existing authentication behavior under Gate 1.

### ADR-05 — Evidence, Secrets and Data Isolation

**APPROVED**

- Use disposable test accounts and isolated PostgreSQL.
- Never use production credentials or customer data.
- Never expose passwords, session IDs, cookies, CSRF tokens or sensitive payloads in logs or artifacts.
- Do not automatically replay state-changing requests.
- Prefer sanitized PASS/FAIL/SKIPPED reports.
- Disable or carefully control traces, HAR files, screenshots and video.
- Cleanup must only affect resources created by the test run.

## 3. Gate 1 Scope — AUTHORIZED

You may:

1. Create the feature branch from the latest `develop`.
2. Add isolated PostgreSQL 17 test infrastructure.
3. Add a Caddy HTTPS reverse proxy and trusted test certificate configuration.
4. Serve the existing React production build through the proxy.
5. Run the existing Spring Boot backend in the isolated environment.
6. Add Playwright Chromium E2E tests.
7. Add readiness checks, safe cleanup and test documentation.
8. Add a dedicated GitHub Actions integration workflow.
9. Run tests and collect sanitized evidence.
10. Open a Draft PR targeting `develop`.

## 4. Gate 2 — HOLD

The following are NOT authorized:

- Modifying authentication business logic or state behavior.
- Changing authentication endpoints or OpenAPI contracts.
- Changing Flyway migrations or database schemas.
- Modifying the legacy commerce client.
- Introducing JWT, OAuth providers or a new authentication framework.
- Deploying to production or public staging.
- Merging into `develop` or `master`.
- Modifying `master`.
- Changing production secrets or infrastructure.

If a test identifies a defect requiring any of these changes, document the finding and request separate authorization.

## 5. Proposed Environment Topology

Browser: Playwright Chromium
Origin: `https://localhost:8443`
Reverse proxy: Caddy
Frontend: Existing React production build
Backend: Existing Spring Boot application on local HTTP behind Caddy
Database: Isolated PostgreSQL 17 container

Routing:

- `/api/v1/*` → Spring Boot, preserving the API prefix.
- All frontend routes and assets → React production build with SPA fallback.

Use a trusted local test CA and verify HTTPS without `ignoreHTTPSErrors`.

Do not expose backend or database publicly.

## 6. Proposed File-Change Manifest

The following paths are proposals, not pre-existing authoritative files:

- `e2e/playwright.config.ts`
- `e2e/tests/auth.spec.ts`
- `e2e/tests/auth-security.spec.ts`
- `e2e/tests/auth-errors.spec.ts`
- `e2e/support/testUsers.ts`
- `e2e/support/api.ts`
- `e2e/infra/Caddyfile`
- `e2e/infra/compose.yaml`
- `e2e/scripts/start.sh`
- `e2e/scripts/cleanup.sh`
- `.github/workflows/integration-e2e.yml`
- `docs/sprint-1c/IMPLEMENTATION.md`
- `package.json`
- `package-lock.json`

You may adjust the test-only file organization for technical reasons, but document the changes.

Production authentication files are out of scope.

## 7. E2E Acceptance Matrix

| ID | Scenario | Expected outcome |
|---|---|---|
| E2E-01 | Anonymous startup | `/auth/me` 401; quiet signed-out UI |
| E2E-02 | CSRF bootstrap | 200; valid CSRF token |
| E2E-03 | Registration | 201; opens LoginModal; no auto-login |
| E2E-04 | Login | 200; authenticated UI; session rotation |
| E2E-05 | Browser reload | `/auth/me` 200; session restored |
| E2E-06 | Logout | 204; session invalidated |
| E2E-07 | Wrong credentials | 401 `INVALID_CREDENTIALS`; safe UI |
| E2E-08 | Duplicate email | 409 `EMAIL_CONFLICT`; safe UI |
| E2E-09 | Invalid registration | 400; documented validation errors |
| E2E-10 | Invalid/missing CSRF | 403 `CSRF_INVALID`; no automatic replay |
| E2E-11 | Expired session | 401; context-appropriate recovery |
| E2E-12 | Access denied | 403 `ACCESS_DENIED`; preserve valid session |
| E2E-13 | Cookie attributes | Secure, HttpOnly, SameSite=Lax, Path=/ |
| E2E-14 | Session rotation | Previous session identifier is invalid |
| E2E-15 | Malformed/non-JSON response | Safe generic UI; no raw error leakage |

Use the actual approved OpenAPI contract as the authority for endpoint statuses and response codes. If an expected status differs, report the discrepancy instead of changing production code.

If a scenario requires an unavailable endpoint or a test-only fault, distinguish genuine backend E2E from controlled synthetic testing.

## 8. CI Execution Plan

Create a dedicated workflow triggered by relevant pull requests targeting `develop`, with optional manual execution.

Suggested stages:

1. Checkout repository.
2. Set up Node 24 and Java 21.
3. Install dependencies using `npm ci`.
4. Build React production bundle.
5. Run backend Maven verification.
6. Start isolated PostgreSQL.
7. Start Spring Boot and verify health.
8. Start Caddy HTTPS and verify certificate trust.
9. Install and run Playwright Chromium.
10. Collect sanitized test summaries.
11. Always cleanup test-owned infrastructure.

Use `permissions: contents: read`.

Never upload raw authentication network traces, cookies, credentials or CSRF tokens.

CI must not depend on the Product Owner's personal computer being online.

## 9. Validation Commands

Existing frontend commands:

```bash
npm ci
npm run typecheck
npm run lint:auth
CI=true npm test -- --watchAll=false --runInBand
CI=true npm run build
```

Existing backend commands, from `backend/`:

```bash
./mvnw clean verify
```

Proposed E2E commands after implementation:

```bash
npm run test:e2e -- --list
npm run test:e2e
```

Do not claim these proposed scripts exist before creating them.

Use health checks with bounded retries rather than arbitrary sleep delays.

## 10. Acceptance Criteria

Gate 1 implementation is acceptable only when:

- Frontend and backend builds pass.
- HTTPS is trusted by Chromium without bypassing verification.
- SPA and API use the same HTTPS origin.
- PostgreSQL test data is isolated.
- Real-browser registration, login, reload and logout pass.
- Cookie security and session rotation are verified.
- CSRF and negative scenarios are tested.
- Required tests are not silently skipped.
- Logs and artifacts contain no sensitive authentication data.
- Cleanup does not touch development or production resources.
- Existing MVC and API contracts remain unchanged.
- CI runs reproducibly.
- Remaining risks are documented.

## 11. Risk and Rollback Policy

Primary risks:

- Test CA trust failure.
- Cookie misconfiguration behind the reverse proxy.
- Flaky startup sequencing.
- Accidental reuse of development database volumes.
- Sensitive information in test artifacts.
- Scope creep into production authentication logic.

Mitigations:

- Verify TLS trust explicitly.
- Use uniquely named test resources.
- Use bounded readiness checks.
- Disable unsafe diagnostics.
- Maintain strict file-change scope.

Rollback:

- Stop test-owned processes.
- Remove only test-owned disposable containers and volumes.
- Preserve all existing development data.
- Never delete production data.
- Never rewrite Flyway migration history.

## 12. Implementation Order

Phase A: Baseline verification and exact file manifest.

Phase B: Isolated PostgreSQL, backend readiness, React build hosting, HTTPS proxy and TLS trust.

Phase C: Playwright authentication and security E2E.

Phase D: Dedicated CI workflow and documentation.

Phase E: Full validation, sanitized evidence and Draft PR.

Estimated effort: 16–25 engineering hours, subject to actual environment complexity.

## 13. Required Final Report

Provide:

1. Base and head commit SHAs.
2. Draft PR URL targeting `develop`.
3. Added/modified file manifest.
4. Frontend and backend test results.
5. E2E matrix marked PASS, FAIL or SKIPPED.
6. HTTPS, cookie, session and CSRF verification summary.
7. CI run URL and conclusion.
8. Risks, blockers and limitations.
9. Confirmation that no prohibited changes occurred.

## 14. Execution Instruction

Product Owner Gate 1 approval has already been granted.

**Proceed with Gate 1 implementation. No additional authorization is required for the approved scope.**

Do not merge or deploy.

Stop after opening the Draft PR and wait for independent Gemini review and Product Owner merge authorization.
