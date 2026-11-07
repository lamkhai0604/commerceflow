# CR-04 — Standardized Error Handling

> **Historical design proposal — superseded for Sprint 1B authentication implementation (2026-11-02).** This file preserves the 2026-10-29 proposal and its original review snapshot; statements below saying CR-04 is unapproved/unimplemented are **historical**, not the current project status. The Tech Lead subsequently approved CR-04/CR-05 corrective scope. Backend implementation and tests are in [Draft PR #10](https://github.com/lamkhai0604/ecommerce-project/pull/10) (head `2e611e82`; hosted Java 21 CI: 49 tests passed). The proposed versioned contract and route-specific status mapping are in [Draft PR #13](https://github.com/lamkhai0604/ecommerce-project/pull/13), especially `docs/api/CR04-CR05-CONTRACT-REVIEW.md`. Neither Draft PR is merged or FINAL. Future commerce error codes in this historical proposal are **design reservations**, not implemented endpoints. For current authentication behavior, consult PR #10 and PR #13 rather than treating this proposal as authority.

**Status: PROPOSAL — not approved, not FINAL, not implemented.**

Task: CF-CR04-01. Owner: Backend Architecture. Review date: 2026-10-29.
Target: `develop`. This PR adds this proposal only. It does not modify the
FINAL baseline, OpenAPI, PR #10, application code, tests, or migrations.

## 1. Authority, scope, and reviewed evidence (Part A)

Approved principles supplied by the Tech Lead for this task:

1. Backend owns HTTP statuses, application codes, and response schemas.
2. OpenAPI is the authoritative Backend/Frontend contract.
3. Frontend consumes documented codes, never infers classifications from messages.
4. UX-01 owns loading, success, error, and recovery presentation separately.
5. Design covers the whole system; implementation remains limited to developed features.
6. CUSTOMER and ADMIN are independent. Deliberately authorized dual-role accounts
   are permitted; ADMIN does not inherit CUSTOMER.

These principles are approved; the concrete catalog, response extensions,
implementation plan, and compatibility changes below still require approval.
No role hierarchy is proposed. D1/D2 checkout/payment guarantees are preserved.
The authoritative CSRF bootstrap is `GET /api/v1/auth/csrf`: the OpenAPI server
prefix `/api/v1` combines with its `/auth/csrf` path.

### 1.1 Snapshot and sources

- Latest inspected `origin/develop`: `71fe39d2f244fb80503a207dce205b0fb49f5f72`.
- [PR #10](https://github.com/lamkhai0604/ecommerce-project/pull/10) inspected at
  `e142e4d9b9fb9f0f1ec45640be5a2e3fbbc5cdc0`; open, not merged at review time.
  Auth implementation findings below refer to that PR, not implemented behavior
  already on `develop`.
- [Sprint 1A design baseline](../sprints/sprint-1a.md) and
  [accepted D1–D4 decisions](../architecture/design-baseline.md).
- [SRS v1.1](../requirements/CommerceFlow-SRS-v1.1-REVIEW.docx),
  especially FR-01, FR-04, FR-17/18, NFR-01/04/05, plus the
  [approved addendum](../requirements/SRS-Approved-Design-Addendum-v1.0-FINAL.md).
- [FINAL OpenAPI](../api/openapi-v1.0-DESIGN-BASELINE.yaml):
  auth operations, shared responses, `Problem`, role array, checkout responses.
- [Physical database specification](../architecture/diagrams/Physical-ERD-Spec-v1.0-DRAFT.docx),
  [design QA](../sprints/sprint-1a.md#3-design-quality-checks),
  [test strategy](../testing/Test-Strategy-v1.0-DRAFT.docx),
  and [checkout acceptance specifications](../testing/checkout-acceptance-tests.md).
- [Sprint 1B plan, review gates and change control](../sprints/sprint-1b.md).

Legacy REVIEW/DRAFT filenames are interpreted with the FINAL addendum and
accepted decisions, not independently treated as newer authority. Diagram
export parity remains unverified. No canonical UX-01 document was found in the
inspected repository: the supplied ownership principle is used, without
inventing approved UX timings, wording, components, or interaction details.

### 1.2 Current conventions and gaps

| Evidence | Current behavior / compatibility concern |
| --- | --- |
| OpenAPI `Problem`, lines 674–695 | Requires only `type`, `title`, `status`; `code` is an optional unconstrained string. `errors`, field codes, and request IDs are unspecified. |
| PR #10 `auth/ApiErrors.java:15–24` | Builds Problem Details with `code` and request-path `instance`; filter responses use `application/problem+json`. No correlation ID. |
| PR #10 `auth/AuthExceptionHandler.java:19–23` | Explicit email conflict and every caught `DataIntegrityViolationException` become 409 `EMAIL_CONFLICT`, including unrelated integrity failures. Fixed text is safe, classification is not. Advice is global. |
| PR #10 `auth/AuthService.java:27–33` | Precheck then `saveAndFlush`; the precheck cannot prevent a duplicate-email race. Missing CUSTOMER role throws a different internal exception. |
| PR #10 `auth/AuthExceptionHandler.java:25–43` | Any caught `AuthenticationException` becomes 401 `INVALID_CREDENTIALS`; validation is 400 `VALIDATION_ERROR` with `errors: {field: message}`; unreadable bodies are 400 `INVALID_REQUEST`. Internal authentication-service failures need separate classification. |
| PR #10 `auth/SecurityConfiguration.java:74–84` | Missing auth gives 401 `UNAUTHENTICATED`; CSRF and authorization denials both give 403 `FORBIDDEN`. Frontend cannot safely distinguish their recovery paths. |
| PR #10 `auth/AuthController.java:46–48` | Missing/null login fields become 401, while malformed/unknown-property JSON can become 400. OpenAPI login currently lists only 200/401/403. |
| OpenAPI auth/shared responses | Generic 500/default responses and common protocol errors are not enumerated. 503 is explicit for checkout, not auth availability failures. |
| Accepted D2 / OpenAPI checkout 409 | Approved code is `INSUFFICIENT_STOCK`; the shared Problem description instead gives `INSUFFICIENT_INVENTORY` as an example. No implemented stock endpoint or alias was found. |
| OpenAPI `components.responses.Conflict` | Contains nonstandard sibling keys `duplicate` and `or insufficient inventory`. Reference-resolution QA does not prove full OpenAPI schema validity; validate and propose cleanup separately within the approved contract revision. |
| PR #10 authorization test, lines 208–218 | The admin fixture starts as CUSTOMER and adds ADMIN. It does not establish ADMIN-only or no-role behavior. The additive provisioning runbook must make deliberate role selection explicit. |
| PR #10 duplicate race test, lines 230–239 | Starts HTTP requests together but does not force both prechecks to return false. Asserts status, not exact application code; it may miss the database-exception branch. |

PR source paths in this table are under `backend/src/main/java/com/commerceflow/backend/`
or `backend/src/test/java/com/commerceflow/backend/`, as appropriate. Review is
source-based. Prior [Backend CI](https://github.com/lamkhai0604/ecommerce-project/actions/runs/41003859401)
passed 24 tests at the inspected PR commit; that is historical evidence, not
execution of the proposed CR-04 tests. No runtime tests were run for this proposal.

## 2. Proposed centralized error taxonomy (Part B)

Each code has one canonical status and meaning. Do not repurpose a code or use
a business code as a generic database fallback. Human titles/details can be
localized or revised; codes drive client decisions. The safe-response column
provides the proposed **title / detail** text. These are not exception messages.

Status legend:

- **PR10**: emitted by the unmerged auth implementation; semantics noted below.
- **S1B proposed**: new classification or behavior for developed authentication
  and its protocol/infrastructure boundaries, after approval only.
- **Future baseline**: named in accepted design, not implemented.
- **Future proposed**: candidate for a later feature; requires endpoint-specific
  contract approval and tests before it can be emitted.

### 2.1 Authentication, security, and input handling

| Code | HTTP | Meaning / trigger | Safe response: title / detail | Frontend handling | Status |
| --- | --- | --- | --- | --- | --- |
| `UNAUTHENTICATED` | 401 | Authentication is absent, invalid, or expired on a protected request. Do not claim the server can distinguish expiry from every missing-session case. | Authentication required / Sign in to continue. | Offer sign-in; clear stale authenticated UI on confirmed 401; preserve non-secret context. | PR10 |
| `INVALID_CREDENTIALS` | 401 | Credential verification fails, including disabled-account login, without identifying which field/account failed. Excludes internal provider/database failures. | Authentication failed / Invalid email or password. | Generic login feedback; never identify account existence or disabled state. | PR10; internal-failure narrowing proposed |
| `EMAIL_CONFLICT` | 409 | Known existing normalized email, or verified violation of `users_email_unique` during registration. No other integrity failure qualifies. | Email unavailable / An account with this email already exists. | Mark email field; offer existing sign-in flow. Do not add a reset-password flow. | PR10; constraint-aware correction proposed |
| `FORBIDDEN` | 403 | Existing combined CSRF/role denial with no reliable recovery subtype. | Request denied / Permission denied or CSRF token invalid. | Legacy generic denial; no automatic refresh/retry based on message text. | PR10 legacy; proposed replacement below |
| `CSRF_INVALID` | 403 | Missing, invalid, cross-session, or stale required CSRF header, including anonymous login/register/logout. | Request verification failed / Refresh request verification and try again. | Refresh bootstrap once; retry only an eligible explicit-CSRF-rejected operation under section 5. Never interpret as bad credentials. | S1B proposed |
| `ACCESS_DENIED` | 403 | Valid authentication lacks the explicitly required role/permission. | Access denied / You do not have permission to perform this action. | Access-denied feedback; no CSRF refresh, automatic sign-in loop, or privilege inference. | S1B proposed |
| `VALIDATION_ERROR` | 400 | Well-formed JSON violates approved field/schema constraints. Proposed extension to login required fields/email format needs approval. | Invalid input / Request validation failed. | Map allowlisted field errors; preserve safe inputs, never persist passwords. | PR10 registration; login extension proposed |
| `INVALID_REQUEST` | 400 | Malformed JSON, incompatible types, unknown properties, or invalid request structure. | Invalid request / Request body or parameters are invalid. | Generic correction feedback; treat client serialization defects as contract incidents. | PR10 body handling; system-wide use proposed |
| `METHOD_NOT_ALLOWED` | 405 | A visible route is called with an unsupported method, after security policy permits dispatch. | Method not allowed / This operation does not support that request method. | Safe fallback and sanitized diagnostics; no automatic retry. | S1B proposed protocol mapping |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Unsupported Content-Type on an implemented operation. | Unsupported content type / Send the documented request content type. | Correct client request construction; no automatic retry. | S1B proposed protocol mapping |

For 405, preserve the framework's accurate `Allow` header. Unknown routes and
protocol failures must not bypass authentication, CSRF, or concealment rules.

### 2.2 Resources and future commerce domains

| Code | HTTP | Meaning / trigger | Safe response: title / detail | Frontend handling | Status |
| --- | --- | --- | --- | --- | --- |
| `RESOURCE_NOT_FOUND` | 404 | Public resource absent/inactive, or a resource is deliberately concealed from a nonowner. Identical public classification/text for nonexistent and concealed orders/cart items. | Resource not found / The requested resource is unavailable. | Generic not-found state; never infer ownership or existence. | Future proposed code for baseline 404 behavior |
| `RESOURCE_CONFLICT` | 409 | An explicitly documented typed business conflict without a more specific catalog code. Not a catch-all for unknown constraints. | State conflict / The requested change conflicts with the current resource state. | Refresh permitted state and let the user review; no blind mutation retry. | Future proposed |
| `PRODUCT_UNAVAILABLE` | 409 | A documented cart/checkout mutation cannot use the selected product. Public catalog GET still uses concealed/absent 404 where specified. | Product unavailable / The selected product cannot be used for this action. | Refresh item availability; ask the user to review the cart. | Future proposed; precise endpoint mapping pending |
| `PRODUCT_SLUG_CONFLICT` | 409 | Verified admin product-write slug uniqueness conflict. No SQL constraint names in the response. | Product identifier unavailable / Choose a different product slug. | Mark slug field in authorized admin UI. | Future proposed |
| `CART_EMPTY` | 409 | Checkout business precondition rejects an empty accepted cart. This status/code is a proposal, not an already approved checkout response. | Cart is empty / Add items before placing an order. | Show cart action; do not create a retry loop. | Future proposed |
| `INSUFFICIENT_STOCK` | 409 | Accepted D2 terminal stock contention for the accepted snapshot; no partial business effects. | Insufficient stock / Available stock cannot fulfill the requested quantities. | Refresh/review quantities; a changed checkout uses a new key. Never retry the terminal snapshot automatically. | Future baseline, D2 |
| `ORDER_STATE_CONFLICT` | 409 | Documented order transition is invalid, including repeated cancellation or cancellation after shipment; ownership/role checks precede this response. | Order state conflict / The order cannot make the requested transition. | Refresh authorized order details; no repeated cancellation or assumed stock restoration. | Future proposed code for baseline transition policy |
| `IDEMPOTENCY_PAYLOAD_MISMATCH` | 409 | Customer/key reused with changed canonical explicit request fields. | Checkout request conflict / This request key was used for a different checkout request. | Stop retries; user reviews a genuinely new logical request before a new key. | Future baseline, D1 |
| `IDEMPOTENCY_IN_PROGRESS` | 409 | Same customer/key has an active worker/lease. | Checkout in progress / This checkout is already being processed. | Honor `Retry-After`; bounded retry of the same key and frozen explicit payload only. Do not purchase the current cart again. | Future baseline, D1 |
| `PAYMENT_DECLINED` | 402 | Terminal deterministic mock decline, persisted/replayed without order, stock, or cart mutations. | Mock payment declined / The simulated payment was declined. | Terminal feedback; explicit new payment attempt uses a new key. No real payment-card UI. | Future baseline, D2 |
| `PAYMENT_TEMPORARILY_UNAVAILABLE` | 503 | Retryable deterministic mock-simulator outage with no business mutation; D1 lease/fencing recovery applies. | Mock payment unavailable / The simulated payment service is temporarily unavailable. | Honor `Retry-After`; retry the same logical checkout/key under the approved recovery protocol. | Future baseline, D2 |

Use `INSUFFICIENT_STOCK`, not the inconsistent illustrative
`INSUFFICIENT_INVENTORY` spelling, in the proposed revised contract. There is no
evidence that the latter is a deployed runtime code; do not invent an alias.
Future business codes do not authorize implementing Catalog, Cart, Orders,
Checkout, Admin, or changing their approved routes, ownership, or atomicity.

### 2.3 Infrastructure and safe fallback

| Code | HTTP | Meaning / trigger | Safe response: title / detail | Frontend handling | Status |
| --- | --- | --- | --- | --- | --- |
| `INTERNAL_ERROR` | 500 | Unexpected/unclassified exception, unknown integrity constraint/metadata, programming/configuration invariant failure, or unclassified authentication-provider failure. | Internal server error / The request could not be completed. | Generic failure with request ID if present; no automatic mutation retry or assumption of rollback. | S1B proposed |
| `SERVICE_UNAVAILABLE` | 503 | Positively classified temporary dependency/service unavailability, including confirmed database connectivity unavailability; not every DataAccessException. | Service unavailable / The service is temporarily unavailable. | Wait/retry eligible reads; honor valid `Retry-After`; mutation outcome may be unknown, so no blanket POST retry. | S1B proposed |

Never expose `DATABASE_ERROR`, a SQLSTATE, a constraint name, or a raw database
exception as a public error code/detail. A 503 is not a guarantee that a write
did not commit. Emit `Retry-After` only with justified server retry guidance;
D1/D2's explicit retry headers remain mandatory for their specified outcomes.

## 3. Proposed Problem Details contract (Part C)

Use `application/problem+json` and the existing Problem Details foundation.
The actual HTTP status must equal body `status`, and `code` must match that
status in the approved catalog. Never send an error envelope with HTTP 200.

| Field/header | Proposed rule | Relationship to current contract |
| --- | --- | --- |
| `type` | Required URI reference; retain `about:blank` for this revision. | Existing required field; no new documentation-host dependency. |
| `title` | Required safe human summary, not machine-readable routing data. | Existing required field. |
| `status` | Required integer, identical to HTTP status. | Existing required field. |
| `code` | Required stable catalog code for standardized application errors. One status per code. | Existing optional string becomes required; coordinated contract strengthening. |
| `detail` | Optional safe, curated human explanation, never `exception.getMessage()`. | Existing optional field. |
| `instance` | Optional opaque occurrence URI. Recommend `urn:uuid:<requestId>` when correlation is enabled, avoiding reflected paths/query values. Clients must not parse it. | Existing optional string; PR #10 currently emits request path. Value-policy change requires agreement. |
| `errors` | Optional legacy `map<string,string>` of allowlisted field names to safe validation messages. Never rejected values. | Exists in PR #10 but undocumented in OpenAPI; preserve shape for compatibility. |
| `fieldErrors` | Optional array of `{field, code}` for stable field-level classification. No rejected values; allowlisted DTO fields only. | Proposed additive extension; do not replace `errors` with a differently shaped object. |
| `requestId` | Optional server-generated UUID in the public schema; proposed server emits it for all application errors once enabled. | Proposed additive extension. |
| `X-Request-ID` | Same server-generated UUID on success and error responses, including filter errors. | Proposed additive response header, not an auth token or idempotency key. |

Proposed field subcodes, used only in `fieldErrors` under HTTP 400
`VALIDATION_ERROR` (all S1B proposed; not currently emitted):

| Field code | Trigger / safe meaning | UI action |
| --- | --- | --- |
| `REQUIRED` | Required value absent or blank. | Localized required-field feedback. |
| `INVALID_FORMAT` | Value does not meet documented format, such as email. | Localized format guidance. |
| `MIN_LENGTH` | Below documented character minimum. | Guidance from the versioned schema; do not infer limits from detail text. |
| `MAX_LENGTH` | Above documented character maximum. | Guidance from the versioned schema; preserve Unicode character semantics. |
| `INVALID_VALUE` | Other documented field constraint. | Generic field correction; unknown future subcodes use the same fallback. |

Example proposed response (illustrative, not emitted by this PR):

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json
Cache-Control: no-store
X-Request-ID: 8a91c37a-f1d8-4cc1-9486-9a1e630aa548
```

```json
{
  "type": "about:blank",
  "title": "Invalid input",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "detail": "Request validation failed.",
  "instance": "urn:uuid:8a91c37a-f1d8-4cc1-9486-9a1e630aa548",
  "errors": {"email": "Enter a valid email address."},
  "fieldErrors": [{"field": "email", "code": "INVALID_FORMAT"}],
  "requestId": "8a91c37a-f1d8-4cc1-9486-9a1e630aa548"
}
```

No password, hash, CSRF/session token, SQL, stack trace, raw exception, arbitrary
request data, or account-state disclosure is permitted. Generate field feedback
from constraint identifiers and allowlisted DTO fields, not exception-message
parsing. Use no-store for sensitive/error responses; never log full bodies.

This design cannot guarantee Problem Details from a reverse proxy, disconnected
transport, servlet-container rejection before application filters, or a response
already committed when an error occurs. Frontend fallback must handle those
cases. Coordinate proxy configuration separately if uniform edge errors are needed.

## 4. Recommended Spring Boot architecture (Part D)

### 4.1 Shared mapping boundaries

Propose a small `com.commerceflow.backend.error` package:

- `ErrorCode`: centralized code/status/title definitions plus documented safe
  defaults. It is not a list of exception class names.
- `ApiProblemFactory`: builds the approved envelope, headers and field details;
  no arbitrary exception text. Used by MVC **and** security-filter responders.
- Typed application exceptions carrying a catalog code and allowlisted safe
  parameters, not arbitrary status/message pairs. Existing email-conflict type
  may be retained/refined; no Java persistence/security exceptions in DTOs.
- `ApiExceptionHandler` (`@RestControllerAdvice`): specific mappings first,
  then sanitized unexpected fallback. Do not rely on MVC advice to catch filter
  or post-response session-persistence errors.
- `DatabaseConstraintClassifier`: narrow, context-aware structured metadata
  inspection. Do not expose it as a universal client-conflict converter.
- `RequestCorrelationFilter`: establish a server UUID before session/security
  processing, reuse it across supported error/async dispatch, return it in the
  header, and clear MDC in `finally`. Do not forge a new body after commitment.

Keep domain decisions in services; keep HTTP serialization in adapters. Do not
put Catalog/Cart/Orders implementation into the shared package. Future typed
business failures require their own reviewed mapping and tests.

### 4.2 Constraint-aware database handling

For registration only:

1. Existing normalized-email precheck may raise typed email conflict, but is
   advisory; the database unique index is authoritative under concurrency.
2. Inspect the exception chain for structured SQLSTATE **23505** **and** exact
   known constraint/index **`users_email_unique`**, associated with this
   registration write. Both conditions are required. Another unique constraint
   must not become `EMAIL_CONFLICT`.
3. Prefer Hibernate `org.hibernate.exception.ConstraintViolationException`
   metadata (`getConstraintName`, `getSQLState`) available with JPA. If direct
   PostgreSQL metadata is required, assess driver scope explicitly: PR #10's
   PostgreSQL dependency is runtime-scoped. Traverse wrappers/batch next
   exceptions carefully with bounds/cycle protection; never inspect message
   substrings or require raw SQL text.
4. Missing, unknown, contradictory metadata, foreign-key/check/not-null errors,
   unrelated unique violations, schema drift, and persistence bugs default to
   `INTERNAL_ERROR`, not email conflict or client validation.
5. Only positively recognized temporary unavailability becomes
   `SERVICE_UNAVAILABLE`. Do not treat all database or authentication-provider
   exceptions as transient. Serialization/deadlock retry policy is not invented
   here; future transactional features must define it separately.
6. Allow the failed transaction to roll back; translate and rethrow outside or
   through the transactional boundary. Never query `existsByEmail`, continue
   writes, or retry inside an aborted PostgreSQL transaction. Do not return a
   business-success result after a failed flush/commit.

Current classification flaw is confirmed by source. Normal validation makes
many non-email violations unlikely in ordinary registration; a production
non-email failure was not reproduced in this documentation task. Session writes
can also fail outside controller advice. On write/commit uncertainty, do not
claim no mutation occurred or offer an unsafe automatic client retry.

### 4.3 Authentication, CSRF, and role semantics

- `AuthenticationEntryPoint`: `UNAUTHENTICATED` 401 for protected requests without
  valid authentication. Do not introduce an unverified `SESSION_EXPIRED` subtype.
- Credential rejection: `INVALID_CREDENTIALS` 401 with the same public response
  for unknown user, wrong password, or disabled login. Internal provider errors
  such as `InternalAuthenticationServiceException` must be classified before
  the broad `AuthenticationException` mapping, rather than masquerading as bad
  credentials. Never expose which account condition occurred.
- Check `MissingCsrfTokenException` / `InvalidCsrfTokenException` before the
  generic access-denied branch: propose `CSRF_INVALID` 403 for both.
- Valid authentication without required authority: `ACCESS_DENIED` 403.
  Anonymous state-changing requests can receive CSRF 403 before an authentication
  401; preserve and document actual filter ordering. CSRF failures do not run
  the application handler; that fact must be verified before allowing recovery.
- Concealed other-user resources remain identical 404 responses after the
  applicable security checks. Do not add ownership metadata to denial details.
- Session rotation, logout invalidation, header-only CSRF, cookie security,
  same-origin deployment, and post-authentication token refresh remain D3 rules.

Approved independent-role matrix (authorization policy, not new feature code):

| Principal | CUSTOMER boundaries | ADMIN boundaries | `/auth/me` |
| --- | --- | --- | --- |
| Anonymous | 401 after applicable CSRF checks | 401 after applicable CSRF checks | 401 |
| CUSTOMER only | Allowed subject to ownership/business rules | 403 `ACCESS_DENIED` | Allowed |
| ADMIN only | 403 `ACCESS_DENIED` | Allowed subject to business rules | Allowed |
| Deliberately authorized dual-role | Allowed subject to ownership/business rules | Allowed subject to business rules | Allowed |
| Authenticated, no roles | 403 `ACCESS_DENIED` | 403 `ACCESS_DENIED` | Allowed as an authenticated profile |

No role inheritance, `hasAnyRole(CUSTOMER, ADMIN)` shortcut, automatic CUSTOMER
grant to every admin, public admin registration, or ownership bypass is proposed.
The no-role `/auth/me` row follows its authenticated-only contract; confirm this
edge case in acceptance review. Provisioning documentation must record deliberate
assignment of each role and immediate session revocation when rights change.

### 4.4 Safe fallback, correlation, and logs

Generate a UUID for every application request. Do not trust/echo an arbitrary
incoming `X-Request-ID`; ignore it unless a separately approved trusted-proxy
policy validates it. An ID is diagnostic only, never authorization or proof of
ownership. Reuse one value through filter/MVC/error handling and do not leak MDC
state across requests or async execution.

For unexpected errors, send only the fixed 500 envelope and correlation ID.
Log an ERROR event with ID, catalog code, status, operation template, and a safe
diagnostic category. Routine credential/conflict/denial events can use bounded
INFO events and metrics. Do not log request bodies, cookies, Authorization or
CSRF headers, SQL parameters, email values, raw Throwable messages, or full
database exception chains. Do not dump those values to logs merely because the
client response is sanitized. Retain PR #10's raw-SQL logger privacy protection
while adding a useful sanitized internal-failure event. Infrastructure telemetry
must observe session-write/filter failures even when a response is already sent.

## 5. Frontend integration guide (Part E)

Frontend consumes **the approved OpenAPI version**, not this unapproved catalog
as though deployed. No frontend implementation is authorized by this PR;
CR-03 remains on hold. The UX-01 source/version must be supplied by its owner
before claiming that detailed UI behavior has been validated against it.

Recommended adapter behavior after approval:

1. Distinguish an HTTP response from a transport failure first. A timeout,
   connection failure, offline state, abort, proxy HTML page, or empty body is
   not a fabricated `INTERNAL_ERROR` response. Do not infer that a mutation failed
   or did not commit merely from missing response data.
2. Safely parse the documented media type/envelope. Validate `code`, numeric
   `status` and the known code/status pair; mismatch is a contract incident.
   Unknown code/shape/non-JSON gets a generic localized fallback and safe
   request ID if available. Use HTTP status conservatively, not human text.
3. Map known codes using the catalog recovery actions. Keep existing known
   auth codes where semantics are unchanged. During an explicitly coordinated
   rollout accept legacy `FORBIDDEN` as generic denial only, never as a guessed
   CSRF subtype. It has no safe automatic recovery classification.
4. Field errors attach only to known form fields. Prefer `fieldErrors` machine
   subcodes for localization; unknown subcodes use generic field feedback.
   Legacy `errors` messages are plain text, never HTML and never parsed for logic.
5. Never branch on `title`, `detail`, validation message strings, SQL text,
   `instance`, or exception class names. Do not send entire error bodies or
   form values to frontend telemetry. Record only safe code/status/request ID.
6. `CSRF_INVALID`: bootstrap at the approved route using the same-origin session
   cookie. Permit at most one recovery attempt for a current, user-approved
   operation **only** once tests establish rejection occurred before mutation.
   Do not replay logout after apparent success, expired credentials, unrelated
   403, generic 500/503, timeout, or unknown transport outcome. Never persist a
   password to enable retry; a mounted login form may require a fresh submission.
7. For generic 401, offer authentication without redirect loops or inventing
   an expiry reason. A 403 role denial must not log out a valid session or imply
   that ADMIN inherits CUSTOMER. Do not clear a session just because a dependency
   returned 503.
8. Retry eligible reads with bounds/backoff. Mutations need explicit retry
   safety. In future checkout, preserve D1's same key, explicit payload and first
   snapshot; honor typed retryable versus terminal outcomes. A new random key
   must never be an automatic answer to an uncertain result.
9. UX-01 independently owns loading indicators, submit disabling, progress,
   accessible inline/global feedback, success states, focus and recovery UI.
   Backend classification does not prescribe timing, component design, toast
   behavior, or new account-recovery routes. The UI/UX design supplies that mapping.

## 6. Proposed QA and contract tests (Part F)

**Specifications only; none of the following new CR-04 tests were run.** Existing
PR #10 tests provide a starting point, not proof of these missing cases. All
future execution evidence must include commit, command, run URL, counts and skips.

| Test ID | Proposed verification | Earliest scope |
| --- | --- | --- |
| ERR-01 | Every emitted catalog code has exactly its documented HTTP status; valid Problem Details media type, required fields, no HTTP-200 error envelopes. | Sprint 1B correction |
| ERR-02 | Registration known duplicate and deterministic database race return 409 `EMAIL_CONFLICT`, one persisted account, no partial roles. Test-only synchronization must force both prechecks past the race window; no production test hooks. | Sprint 1B correction |
| ERR-03 | Actual PostgreSQL unique-email metadata classifies correctly through JPA/Spring wrappers. Other unique keys, FK, not-null, check, and length failures must not become email conflict. Isolated test fixtures only. | Sprint 1B correction |
| ERR-04 | Unknown/missing/contradictory constraint metadata, nested/batch wrappers and cycle bounds yield safe fallback; no SQL-message parsing. | Sprint 1B classifier unit + integration |
| ERR-05 | Valid failed/unknown/disabled credentials have generic 401; internal authentication-provider exceptions produce 500 or positively classified 503, not invalid credentials. | Sprint 1B correction |
| ERR-06 | Missing/invalid/cross-session/stale/query-only token gives `CSRF_INVALID` 403; authenticated insufficient role gives `ACCESS_DENIED` 403; CSRF-rejected requests cause no mutation. | Sprint 1B correction |
| ERR-07 | CUSTOMER-only, ADMIN-only, deliberate dual-role, and no-role persisted accounts tested with real JDBC sessions; GET and valid-CSRF write probes follow matrix. No production probe endpoints. | Sprint 1B correction |
| ERR-08 | Missing auth is 401; denied role is 403; anonymous unsafe request obeys documented CSRF precedence. Health remains public; no form-login redirects/HTML error page. | Sprint 1B correction |
| ERR-09 | Well-formed invalid registration/login fields, malformed JSON, scalar types, unknown properties, Unicode boundaries, method and media errors match revised contract and approved field-code shapes. | Sprint 1B correction, pending login/protocol approval |
| ERR-10 | Inject unexpected service/JPA failure; 500 is sanitized, transaction rolls back, logs contain safe event/ID but no email/password/hash/token/SQL/raw exception text. No generic assertion that all timeout failures mean rollback. | Sprint 1B correction |
| ERR-11 | Verified temporary database outage yields approved 503; unknown persistence failure stays 500; no unsafe automatic POST retry or false success. Include login and session-repository failure paths. | Sprint 1B correction |
| ERR-12 | Server UUID format, response header/body equality, untrusted inbound ID handling, concurrent request isolation, MDC cleanup, error dispatch, and filter-error correlation. | Sprint 1B correction |
| ERR-13 | OpenAPI schema/status examples validate; machine catalog and implementation are consistent; no accidental omission of shared error responses or invalid Response Object keys. | Sprint 1B contract CI after approval |
| ERR-14 | Frontend known/unknown code, status mismatch, legacy denial, malformed/HTML body, timeout/offline/abort, bounded CSRF recovery and no message parsing; accessible UX-01 states. | Separate approved frontend work, not backend-only Sprint 1B |
| ERR-15 | Catalog/cart not-found/ownership concealment, admin slug collision, typed product/cart/state conflicts; no-role/role enforcement on actual domain endpoints. | Future feature sprints |
| ERR-16 | D1/D2 exact status/body replay, key mismatch, active-worker 409 + Retry-After, terminal 402/stock 409, retryable mock 503, lease/fencing, rollback and once-only cancellation. | Future checkout/admin sprints |
| ERR-17 | Staging same-origin HTTPS cookies, reverse-proxy error boundaries, browser critical flows, defined performance targets and redaction under operational failures. | Integration/release gates; not claimed by local unit tests |

Use PostgreSQL Testcontainers and the real Flyway schema for database/session
semantics, not H2 substitutes. A unit test with a fabricated constraint name is
not sufficient proof of driver metadata extraction. Keep authentication tests
mandatory in Docker-enabled CI; inspect zero-skip evidence. The current CI
report guard checks foundation methods; any extension to explicitly assert the
new contract suites requires a reviewed backend-CI change.

## 7. Exact change impact and compatibility (Part G)

The following are **future changes requiring approval**, not files changed by
this proposal. PR #10-only paths must be updated on its authorized follow-up,
not copied into this documentation branch.

| Files / documents | Classification | Proposed impact |
| --- | --- | --- |
| `docs/api/openapi-v1.0-DESIGN-BASELINE.yaml` | Contract change | Define catalog/status pairs, required `code`, optional validation/correlation extensions and headers; split 403 semantics; enumerate common 500/default, selected 503/protocol and login-400 responses; reconcile stock example and invalid Conflict keys. No edit until approved. |
| `docs/architecture/design-baseline.md` | Documentation change | Approved error-contract reference and independent-role clarification only; preserve D1/D2/D3 architecture. Record via approved addendum/version process, not silent overwrite. |
| `docs/requirements/CommerceFlow-SRS-v1.1-REVIEW.docx` plus `SRS-Approved-Design-Addendum-v1.0-FINAL.docx` / `.md` | Documentation change | Align FR-17/18, safe errors, role policy and traceability through a controlled approved addendum. |
| `docs/testing/Requirements-Traceability-Matrix-v1.0.xlsx`, `Test-Strategy-v1.0-DRAFT.docx`, `docs/sprints/sprint-1a.md` | Documentation change | Record new contract tests and real future evidence without rewriting historical QA results as executed tests. |
| `docs/sprints/sprint-1a.md`, `docs/sprints/sprint-1b.md` | Documentation change | Link approved catalog, independent-role matrix and error/UX ownership; preserve existing implementation gates and hold scope. |
| PR #10 `backend/src/main/java/com/commerceflow/backend/auth/AuthExceptionHandler.java`, `ApiErrors.java` | Backend implementation change | Delegate to shared safe factory/mapper; narrow email conflict handling; no broad persistence-to-email translation. |
| PR #10 `backend/src/main/java/com/commerceflow/backend/auth/AuthService.java`, `AuthController.java`, `RegisterRequest.java` | Backend implementation change | Typed known-conflict translation and approved login validation; preserve endpoint URLs and success profiles. Add a login DTO only if approved validation needs it. |
| PR #10 `backend/src/main/java/com/commerceflow/backend/auth/SecurityConfiguration.java` | Backend implementation change | Separate CSRF/authentication/authorization error mapping while preserving independent role matchers, session/cookie behavior and CSRF enforcement. |
| Proposed `backend/src/main/java/com/commerceflow/backend/error/{ErrorCode,ApiProblemFactory,ApiExceptionHandler,DatabaseConstraintClassifier,RequestCorrelationFilter}.java` | Backend implementation change | Shared taxonomy/factory, typed mapping, safe fallback and correlation; exact class layout can remain small and reviewable. |
| PR #10 `backend/src/main/resources/application.yml`, `backend/README.md`, `backend/AUTHENTICATION.md` | Backend implementation + documentation changes | Document safe diagnostic behavior, request IDs, fallback semantics and deliberately authorized role provisioning; retain privacy protections. |
| PR #10 `backend/src/test/java/com/commerceflow/backend/auth/AuthServiceTest.java`, `AuthenticationIntegrationTest.java`, `ProductionCookieIntegrationTest.java`; proposed `backend/src/test/java/com/commerceflow/backend/error/*Test.java` | Test change | Add deterministic classification, safe fallback, schema, role-matrix and correlation coverage; retain authentication/cookie regression coverage. |
| `.github/workflows/backend-ci.yml` | Test/CI change | If needed, require executed contract suites and publish sanitized test evidence; no credentials or deployments. |
| `src/controllers/api/axiosClient.ts`, `src/controllers/api/userApi.ts` / `.test.ts`, `src/controllers/feature/auth/authSaga.tsx`, `authSlice.tsx`, `src/view/components/layout/LoginModal/index.tsx`, `RegisterModal/PersonalDetailsForm/index.tsx`, proposed frontend error adapter/tests | Frontend design + later implementation/test change | UI/UX design defines mapping/UX-01 behavior; any actual code work requires separate authorization and resolution of CR-03 hold. Do not implement here or silently remove the Forgotten Password link. |
| UX-01 source artifact (not found; owner/location required) | Frontend design change | Versioned loading/feedback/recovery mapping aligned to approved codes. Do not invent a canonical file path. |

No database schema/migration change is needed for error classification or role
independence. In particular, PR #10's V2 `users_email_unique` index and V3 session
schema should not be renamed/rewritten to implement this proposal.

### 7.1 Compatibility assessment

- Optional `requestId`, `fieldErrors`, documented existing `errors`, and headers
  are additive for tolerant consumers. Strict generated clients/validators may
  still need regeneration; verify rather than assume universal compatibility.
- Making `code` required strengthens a formerly optional contract. It can break
  old providers/mocks and requires coordinated version/sign-off. Prefer retaining
  a string code with a documented registry and unknown-code fallback, rather than
  a closed enum that breaks clients whenever a future code is introduced.
- Replacing `FORBIDDEN` with `CSRF_INVALID`/`ACCESS_DENIED` is an observable
  behavioral contract change. Keep the old code cataloged for an agreed
  transition window; do not return two conflicting canonical `code` values.
- Narrowing false `EMAIL_CONFLICT` outcomes to 500 corrects a defect but changes
  observed responses. OpenAPI must explicitly document the approved fallback.
- Login schema failures changing from 401 to 400 are a behavioral change; do not
  bundle them into implementation without explicit acceptance and tests.
- New 500/default, auth 503, 405/415 and future business-code mappings add possible
  outcomes and require client fallback review. A default response is not a way
  to excuse undocumented routine business errors.
- Keeping the existing `errors` map avoids a breaking shape replacement. Changing
  `instance` to an occurrence URN is schema-compatible but may break clients that
  incorrectly parse it; announce and test that policy.
- Reconciling the unused stock example and invalid Conflict keys is contract
  cleanup, not evidence of deployed aliases or checkout implementation. Preserve
  D1/D2's existing named outcomes, statuses, retry and replay semantics.

## 8. Decisions requiring Tech Lead approval

| ID | Decision requested / recommendation |
| --- | --- |
| CR04-D01 | Approve the catalog names, single-status mappings, and narrow `users_email_unique` correction. Unknown integrity failures should be safe 500, never a guessed client conflict. |
| CR04-D02 | Approve `INTERNAL_ERROR` 500 and positively classified `SERVICE_UNAVAILABLE` 503, safe logging boundaries, and explicit OpenAPI server-error responses/defaults. |
| CR04-D03 | Approve the 403 split and coordinated legacy `FORBIDDEN` rollout/deprecation plan. Backend/Frontend owners must agree adoption order/version before implementation. |
| CR04-D04 | Approve login invalid-schema 400 behavior and common protocol mappings (405/415), including the changed missing/null-field behavior. |
| CR04-D05 | Approve required top-level `code`, retained `errors`, optional `fieldErrors`/subcodes, request ID/header generation and occurrence-URI policy. |
| CR04-D06 | Confirm full independent-role matrix edge cases, especially authenticated no-role `/auth/me`, and deliberate provisioning/session-revocation acceptance tests. Independence/dual-role permission itself is already approved; no inheritance decision is reopened. |
| CR04-D07 | Approve catalog-wide future candidate names as design reservations only; defer endpoint-specific triggers/status additions to each future feature's reviewed contract. |
| CR04-D08 | Identify authoritative UX-01 artifact/version and UI/UX owner; approve bounded recovery rules without lifting CR-03 or authorizing new frontend/account-recovery flows. |
| CR04-D09 | Approve the contract revision/versioning process, stock-example/Conflict-object cleanup, and follow-up implementation/test scope. Decide whether to revise PR #10 or use a dependent corrective PR; this task modifies neither. |

Trade-offs: a shared factory/catalog adds a small common module but prevents MVC
and filter drift; narrow metadata classification ties known conflict mapping to
a stable schema identifier but avoids false success/conflict diagnoses; generic
500 protects internals but needs correlation for support; split 403 codes enable
safe recovery but require coordinated client adoption. Rich optional validation
metadata helps localization while retaining the current map, at the cost of a
slightly larger schema. No trade-off authorizes changing D1/D2/D3 guarantees.

## 9. Review and follow-up checklist

- [ ] Tech Lead approves concrete decisions CR04-D01 through D09 or records revisions.
- [ ] Architecture reviewer confirms approved independent roles and D1/D2/D3 preservation.
- [ ] Backend and UI/UX agree code/status catalog, fallback and rollout/version boundaries.
- [ ] UX-01 source is identified; frontend implementation remains separately authorized.
- [ ] OpenAPI revision is explicitly authorized, schema-validated, and examples/statuses checked.
- [ ] Corrective implementation scope and PR ownership are explicitly authorized.
- [ ] Classifier tests use actual PostgreSQL metadata and deterministic race conditions.
- [ ] Filter/MVC/error/session failure paths, role matrix, logs and correlation are verified.
- [ ] Future-domain tests remain labeled specifications until corresponding code exists and runs.
- [ ] Actual test/CI evidence is attached to the later implementation PR; no diagram or runtime sign-off is inferred from this document.

**Stop point:** This PR is a documentation proposal only. No proposed code is
implemented, no FINAL artifact is amended, and no new tests are claimed passed.
Await Tech Lead and architecture review before corrective implementation,
contract edits, merge, or deployment.
