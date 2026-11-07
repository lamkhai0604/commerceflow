# Sprint 1B — Authentication

| Field | Value |
| --- | --- |
| Goal | Registration, login, password hashing, role-based authorization and logout (FR-01 to FR-05) on the Sprint 1A baseline |
| Result | Backend and frontend session authentication merged into `develop` |
| Pull requests | #10 backend, #15 frontend, #11 and #13 error and contract revisions (CR-04, CR-05), #12 UI/UX specification |

## 1. Scope

**In scope:** FR-01 to FR-05. **Out of scope:** checkout, product administration, payments, social login, password recovery, guest cart.

### Backend (`feature/sprint-1b-auth-backend`)

- Spring Security with Spring Session JDBC: server-side sessions, no JWT or `localStorage` tokens.
- CSRF bootstrap through `GET /api/v1/auth/csrf`; the token is sent as `X-CSRF-TOKEN` on every state-changing request, including login and logout.
- `SESSION` cookie: HttpOnly, Secure on HTTPS, SameSite=Lax; session rotation on login and invalidation on logout.
- Normalized unique email, adaptive password hashing; public registration creates CUSTOMER accounts only. ADMIN accounts are provisioned through a controlled procedure, never through a public endpoint or hard-coded credentials.
- Flyway migrations for users, roles and the Spring Session schema.
- Consistent Problem Details errors and sanitized logging.
- Tests: JUnit 5, Spring Boot integration tests on PostgreSQL Testcontainers, security and authorization cases.

Details: [backend authentication](../../backend/AUTHENTICATION.md).

### Frontend (`feature/sprint-1b-auth-frontend`)

- Login, registration, session restoration, session expiry, unauthorized access, validation, loading and error states, on desktop and mobile.
- Accessible labels, keyboard focus, status messages, password visibility toggle, generic authentication errors; no raw backend errors shown.
- Replaces the legacy client-side login (CR-03) and removes the inactive Forgotten Password link (CR-02).

Details: [UI/UX specification](sprint-1b/authentication-uiux-specification.md) and [frontend authentication](sprint-1b/frontend-authentication.md).

## 2. Acceptance criteria

| Area | Criterion |
| --- | --- |
| Registration | Valid customer succeeds; duplicate normalized email and invalid email or password are rejected |
| Login | Correct password creates a session and rotates its identifier; wrong credentials are rejected without revealing whether the account exists |
| Session | Authenticated requests work; logout invalidates the session; the old session cannot be reused |
| CSRF | Token bootstrap works; a missing or invalid token on a state-changing request returns 403 |
| Roles | Anonymous request to a protected route returns 401; customer on an admin route returns 403; admin provisioning is not publicly reachable |
| Security | No plaintext passwords; no authentication tokens in `localStorage`; no secrets in logs |
| CI | Relevant suites green, with run links as evidence |

## 3. Review gates before merging into `develop`

1. Scope traces to FR-01 to FR-05 and the approved SRS, UML and API.
2. Architecture and migration review; no unapproved design change.
3. Unit, integration, security and E2E tests with verifiable results.
4. CI green; no open blocker or critical defect.
5. Documentation, contract and implementation agree.
6. Diff reviewed for secrets, insecure cookie or session settings, and scope creep.

Only the Tech Lead merges `develop` into `master`, after manually checking the running `develop` build.

## 4. Change control

Any deviation from the approved SRS, UML, API, database schema, security model or user flow is raised as a change request **before** implementation, using this template:

| Field | Content |
| --- | --- |
| Baseline | Current design |
| Proposed change | What changes |
| Reason and alternatives | Why, and what else was considered |
| Benefits / risks | Trade-offs |
| Impact | SRS, UML, API, database, security, UI, tests |
| Recommendation | Proposed option |
| Decision | Pending / Approved / Rejected / Revise (Tech Lead) |

Change requests raised in this sprint: CR-01 to CR-06, listed in the [decision log](../DECISIONS.md).

## 5. Results

| Item | Evidence |
| --- | --- |
| Backend | 49 tests passed, including 22 authentication HTTP tests and 3 migration tests on PostgreSQL (CI run 41584455578) |
| Frontend | 90 tests in 7 suites passed; type check, lint and production build pass (PR #15) |
| Contract | [Authentication contract v1.1 review](../api/auth-contract-v1.1-review.md) and [OpenAPI v1.1 (proposed)](../api/openapi-v1.1-auth-PROPOSED.yaml) |

Real HTTPS, cookie and browser verification were carried into Sprint 1C.
