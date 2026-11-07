# CR-S1C-01 — approved backend correlation correction

Status: CR-S1C-01 IMPLEMENTED under explicit Product Owner authorization.
Gate 2 remains HOLD except for this narrowly approved correction. Original
observation and proposal below are retained as historical evidence. Current
verification is recorded in [CR-S1C-01 verification](../sprints/sprint-1c/cr-s1c-01-verification.md).

## Confirmed observation

Real Chromium through Caddy reports two X-Request-ID values for:

- HTTP 409 EMAIL_CONFLICT (E2E-08).
- HTTP 400 VALIDATION_ERROR (E2E-09).

Both values equal the body's requestId. Browser Headers.get combines them into
a comma-separated string, which is not the contract's single UUID header and
is not identical to body requestId. Security-filter 403 responses have one value.
No header values, cookies or tokens are recorded in the evidence—only counts and
an allMatchBody boolean. See evidence/local/correlation.json and summary.json.

Severity: medium contract/diagnostics defect. Not an authentication bypass.
Primary HTTP statuses and application codes are correct. These two complete
E2E cases remain FAIL because correlation parity is part of the test assertion.
No expected-failure annotation, skip or header-normalizing workaround was added.

## Likely source and proposed minimal correction

Read-only inspection finds two header writers:

- backend/.../error/RequestCorrelationFilter.java:39 sets X-Request-ID early.
- backend/.../error/ApiProblemFactory.java:34–43 adds it to MVC ResponseEntity headers.

The observed MVC-versus-filter difference is consistent with duplicate writing;
a backend corrective review should confirm the exact Spring response path.

Request authorization to retain one authoritative correlation-header writer for
MVC responses while preserving exactly the same server UUID in body requestId,
instance and security/filter responses. Do not change endpoints, statuses, error
codes, authentication/session behavior, migrations or the global 401 policy.

Proposed tests: verify exactly one X-Request-ID and matching body requestId/instance
on MVC 400/409 (and mapped credential/internal errors), plus existing filter
401/403 paths; rerun the real HTTPS matrix and existing backend/frontend suites.

Alternative: allowing duplicate/comma-separated header values would require a
contract/consumer decision and weakens current parity; it is not recommended or
implemented here. The existing contract is unchanged.

## Original approval request (satisfied by CR-S1C-01 authorization)

Tech Lead and Product Owner must authorize any backend production correction
separately. Gate 1 currently changes only test infrastructure, tests and docs.
Independent review was requested in the Draft PR. No merge or deployment.

## Approved correction

Commit `dd1fba1865784e20e276a56eceaaa3b8763c7ac6` removes only the redundant
X-Request-ID assignment from ApiProblemFactory.headers(). RequestCorrelationFilter
remains authoritative for MVC headers. The existing direct security/filter writer
continues to use setHeader (replacement, not append); its behavior is unchanged.
The shared real-HTTP integration assertion now checks all header values with
containsExactly(body.requestId), preserving UUID and instance parity checks. This
covers MVC 400/409/500 and filter/security 401/403, including both CSRF_INVALID
and ACCESS_DENIED. The filter-failure unit test also verifies singleton UUID and
instance parity. No authentication, session, API or schema behavior changes.
