# CR-04 / CR-05 authentication contract revision — PROPOSED

This is a separate contract review for the implementation authorized on
[PR #10](https://github.com/lamkhai0604/ecommerce-project/pull/10#issuecomment-6529350343).
It is not FINAL, not a deployment, and not permission to merge PR #10.
The Sprint 1A FINAL artifact is unchanged. `1.1.0-auth-PROPOSED` denotes a
contract-document revision, not a promise of backward-compatible semantics;
runtime URLs remain `/api/v1`.

Review `openapi-v1.1-auth-PROPOSED.yaml` alongside PR #10 corrections.

- CR-04: exact duplicate-email classification; CSRF_INVALID versus ACCESS_DENIED;
  safe INTERNAL_ERROR/SERVICE_UNAVAILABLE; login schema 400 versus credential 401;
  required code; retained errors map; optional fieldErrors/requestId and header.
- CR-05: registration fullName 1–50 Unicode code points, normalized email max 254
  code points, password 12–128 code points. Counting is after existing email
  strip/lowercase normalization; no new fullName/password normalization.
- Login email normalization/format/254 bound align with registration; required
  password is a non-null string, not a reapplication of creation-length rules.
- Independent CUSTOMER/ADMIN roles; deliberate dual-role assignment only.
- Occurrence URNs/request IDs are opaque; no sensitive path/query reflection.
- Existing invalid Conflict Response Object keys are removed in the proposed
  copy only; the INSUFFICIENT_INVENTORY example is reconciled to D2's
  INSUFFICIENT_STOCK. No future commerce code is implemented by this revision.

## Compatibility and adoption gate

Inventory actual consumers and generated clients before merge/release. Specific
403 codes replace legacy FORBIDDEN; consumers must retain a generic safe denial
fallback for that legacy code, never guess CSRF from text or routes. Unknown codes,
non-JSON responses, and transport failures require a safe fallback. No runtime
compatibility switch, legacy alias, automatic mutation retry or frontend source
change is introduced. If an actual consumer requires exact old behavior, obtain
an explicit transition/versioning decision before cutover.

Missing/null login fields now produce 400 instead of PR #10's former 401. Unknown
integrity failures no longer masquerade as email 409. Required code/new outcomes
and metadata require regenerated clients/fixtures and explicit acceptance.
Optional extension fields do not guarantee compatibility with strict validators.

Gemini owns PR #12 UI/UX document alignment (including field counters, error
names, feedback and recovery). CR-03 remains on hold; CR-02 link removal is not
performed here. No consumer/staging/browser sign-off is claimed.

## Review checklist

- [ ] Tech Lead/architecture approve this revision as the next authoritative contract.
- [ ] Consumer inventory and legacy/unknown-code fallback verified.
- [ ] Gemini documentation and CR-05 Unicode counting aligned.
- [ ] Backend outputs, schemas and code/status mapping match test evidence.
- [ ] Controlled publication/authority links approved; FINAL source not silently replaced.
- [ ] Actual HTTPS/proxy and browser integration gates separately satisfied.

## Approved documentation clarification (2026-11-02)

Tech Lead approved these **documentation-only** clarifications for this Draft proposal, not final publication or PR merges:

- Each of the five auth operations now has a route-specific description rather than repeated login-specific wording.
- The configured cookie is `SESSION`, with HttpOnly, SameSite=Lax, Path=/ and Secure by default; actual HTTPS/proxy/browser behavior remains an unverified release gate.
- `additionalProperties: false` is retained. Backend `spring.jackson.deserialization.fail-on-unknown-properties: true` and two HTTP tests demonstrate rejection of unknown registration/login JSON properties with 400 INVALID_REQUEST. GitHub CI run 41584455578: 49 tests passed.
- **Email preprocessing decision:** preserve backend behavior. Before email format/length validation, strip leading/trailing whitespace and lowercase using `Locale.ROOT` semantics; the 254 Unicode-code-point maximum applies **after** normalization. Future clients should normalize equivalently **before** validating or sending email. OpenAPI `format: email` and `maxLength: 254` operate on supplied wire values in ordinary generators; schema descriptions alone do not implement normalization. Frontend implementation remains on CR-03 hold.
- Registration password must be nonblank and 12–128 Unicode code points. Login password is a non-null string; registration-length rules are not reapplied on login.

### Endpoint-specific status and application codes

| Route | Success | Expected application errors (subject to security-filter ordering) |
| --- | --- | --- |
| GET /auth/csrf | 200 token and header name | 500 INTERNAL_ERROR; 503 SERVICE_UNAVAILABLE (fallbacks, not route fault-tested) |
| POST /auth/register | 201 UserProfile; does not log in | 400 VALIDATION_ERROR / INVALID_REQUEST; 403 CSRF_INVALID; 409 EMAIL_CONFLICT; 500 INTERNAL_ERROR; 503 SERVICE_UNAVAILABLE; 405 METHOD_NOT_ALLOWED; 415 UNSUPPORTED_MEDIA_TYPE |
| POST /auth/login | 200 UserProfile; rotates session | 400 VALIDATION_ERROR / INVALID_REQUEST; 401 INVALID_CREDENTIALS; 403 CSRF_INVALID; 500 INTERNAL_ERROR; 503 SERVICE_UNAVAILABLE; 405 METHOD_NOT_ALLOWED; 415 UNSUPPORTED_MEDIA_TYPE |
| POST /auth/logout | 204 empty body | 401 UNAUTHENTICATED; 403 CSRF_INVALID; 500 INTERNAL_ERROR; 503 SERVICE_UNAVAILABLE; 405 METHOD_NOT_ALLOWED |
| GET /auth/me | 200 UserProfile | 401 UNAUTHENTICATED; 500 INTERNAL_ERROR; 503 SERVICE_UNAVAILABLE |

For corrected application errors, `Problem.code` is required; `requestId`, `fieldErrors` and `errors` are not universally required. Normal responses include a server-generated `X-Request-ID` header; error `requestId` matches it and `instance` is opaque. Framework/transport failures cannot be assumed to always provide the same application Problem body. The shared Forbidden response also documents ACCESS_DENIED for role-protected routes; it is **not** a role requirement for public register/login or role-neutral logout.

### Observed consumer inventory and compatibility

- Existing React `src/controllers/feature/auth/authSaga.tsx` uses legacy client-side credential matching and localStorage, not these backend auth endpoints; `axiosClient.ts` and `userApi.ts` target a legacy external API and `/users`.
- Backend Java HTTP tests consume these endpoints and assert current error codes.
- No checked-in generated client was identified in the reviewed repository; external consumers are **unknown**, not assumed absent.
- Before consumer cutover, support safe generic fallback for legacy FORBIDDEN, unknown error codes, non-JSON responses and transport failures; do not parse error text or automatically retry mutations. CR-03 frontend work remains on hold.

### Remaining independent release gates

Full automated request/response OpenAPI validation, per-route 500/503 fault behavior, method/media/content-negotiation edge cases, duplicate JSON keys, whitespace boundaries, authenticated re-registration/re-login, concurrent session/logout access, and real HTTPS/proxy/browser CSRF/cookie verification are **not** claimed complete. Gemini PR #12 alignment, consumer adoption and controlled FINAL publication require separate review. Neither PR #10 nor #13 is authorized to merge or deploy.
