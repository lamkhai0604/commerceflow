# CR-01 — CSRF Route Standardization

- **Decision:** `GET /api/v1/auth/csrf` is the authoritative CommerceFlow CSRF bootstrap endpoint.
- **Approval:** Tech Lead approved documentation changes only on 2026-10-29.
- **Reason:** The Sprint 1A baseline contained an unversioned route that conflicted with the versioned route already specified in both Sprint 1B handoff briefs. This correction makes the documentation consistent with the approved endpoint.
- **Scope:** Correct the Sprint 1A route and record the decision. Endpoint implementation remains separate Sprint 1B work; this record does not authorize application or migration changes.
- **Preserved decisions:** All previously approved D1–D3 security and architecture decisions remain in force. Session authentication, same-origin routing, cookie requirements, CSRF token handling, authorization rules, and checkout guarantees are unchanged.

## Affected files

- `docs/sprint-1a/README.md`: corrected the CSRF bootstrap route only.
- `docs/decisions/CR-01-csrf-route-standardization.md`: added this decision record.

## Consistency review

Reviewed `docs/sprint-1a/implementation-gates.md` and all three documents under `docs/sprint-1b/`. Both `CODEX-TASK.md` and `GEMINI-TASK.md` already specify the approved route; the implementation gates and review/change-control document contain no conflicting endpoint path and need no edits.

All explicit CSRF route references in the repository documentation now use `GET /api/v1/auth/csrf`. No endpoint, application code, database migration, or unrelated design change is included.

## Remaining verification

The separately delivered Sprint 1A Final Design package, including canonical SRS/OpenAPI/UML and diagram exports, is not present in this repository and was not verified by this change. Its owners must check those artifacts against CR-01 without altering the approved D1–D3 decisions. PR merge remains subject to Tech Lead review and explicit merge approval.
