# Sprint 1B frontend authentication — Issue #14

Implementation authorization: https://github.com/lamkhai0604/ecommerce-project/issues/14.
The issue explicitly authorizes frontend implementation despite the historical
CR-03 hold labels in the merged design documents. This document does not mark
any contract FINAL or authorize deployment.

## Client and configuration

`src/controllers/api/authApi.ts` uses a separate Axios instance, defaulting to
same-origin `/api/v1`, with browser-managed credentials and a 15-second timeout.
`REACT_APP_AUTH_API_BASE_URL` may configure the approved API prefix at build time.
Prefer `/api/v1`; a production reverse proxy must serve the SPA and backend on
the same origin. Changing this value is not authorization for cross-origin CORS,
authentication architecture changes, or Vercel settings changes. React environment
variables are public: never put credentials in them.

The existing external commerce Axios client and `/users` API remain available to
unrelated features. Authentication no longer fetches that users list, compares
passwords in JavaScript, or trusts localStorage `access_token`. The old key is
neither read nor written. Existing local browser data is not evidence of a session.

The server is the source of truth. Profiles contain only id/email/fullName/roles.
Passwords exist only in transient form/action/request memory and are not placed
in auth state; credential action payloads are redacted from Redux DevTools.
CSRF stays in the dedicated client's memory. SESSION stays HttpOnly/browser-managed.
Neither CSRF nor credentials/session IDs are stored in localStorage/sessionStorage.

## Flows and recovery

- Startup performs one passive `/auth/me` request, without polling. Initial 401
  produces signed-out UI quietly. Startup controls remain disabled until initial
  security bootstrap completes; non-401 uncertainty receives safe feedback.
- Mutations obtain `/auth/csrf` when necessary and send `X-CSRF-TOKEN`.
  Duplicate form submission is blocked; mutations are serialized by Saga and
  never automatically replayed after an HTTP or transport failure.
- Register sends only fullName/email/password, displays confirmation, and opens
  login with normalized email and password focus. It does not auto-login.
- Login confirms the returned profile, then separately refreshes CSRF after
  session rotation. A refresh failure does not turn confirmed login into a
  credential failure or replay login. The next explicit write can bootstrap again.
- Logout keeps signed-in state on an uncertain/network failure. Confirmed 204
  clears auth state, discards old CSRF and separately bootstraps anonymous CSRF.
  A 401 expires local session state; it does not claim a confirmed successful logout.
- Protected responses through the auth client with 401 UNAUTHENTICATED expire
  existing session state and open login. Future backend commerce clients must use
  the same approved expiry behavior when those features are implemented; the
  unrelated legacy commerce transport has not been redirected to the backend.
- Only a matching 403 CSRF_INVALID invalidates cached verification. Recovery is
  explicit: refresh verification, then submit again. ACCESS_DENIED and legacy
  FORBIDDEN never trigger guessed CSRF recovery. Unknown codes, non-JSON responses
  and network failures receive generic safe feedback without raw backend text.
- Backend validation fields are allowlisted; safe generic field messages replace
  server messages/rejected values. Email/fullName drafts survive errors; passwords
  are cleared after server errors and when dialogs unmount.

Registration counts Unicode code points with Array.from, not UTF-16 units:
fullName nonblank 1–50; normalized email nonblank, valid format, max 254;
password nonblank 12–128, preserved exactly. Confirm password is client-only.
Email is trimmed/lowercased before validation and sending. FullName/password are
not silently trimmed, normalized, truncated or clipped with HTML maxLength.
Login does not apply registration password-length rules. The backend remains
validation authority; client email validation is a basic shape check, not a new
RFC/international-email policy.

## Verification

From repository root using Node 24:

```sh
npx tsc --noEmit
CI=true npm test -- --watchAll=false --runInBand
CI=true npm run build
```

Focused ESLint command:

```sh
npx eslint src/controllers/api/authApi.ts src/controllers/api/authApi.test.ts src/controllers/feature/auth src/controllers/app/store.ts src/view/components/layout/AuthDialog src/view/components/layout/LoginModal src/view/components/layout/RegisterModal src/view/components/layout/Header/Dropdown --max-warnings=0
```

Tests cover client request sequencing/cookies/CSRF, no replay, structured-code
feedback and safe fallbacks, login/registration/logout/session restoration Saga
behavior, Unicode validation, loading/duplicate prevention, field errors,
post-registration focus and explicit recovery. Existing legacy userApi tests remain.

Screenshots in `frontend-auth-evidence/` are visual checks with synthetic mocked
API responses over local HTTP. They are not backend/HTTPS end-to-end evidence.
Real staging/browser HTTPS, Secure cookie transport, proxy routing, SameSite
behavior, session rotation/invalidation and CSRF integration remain pending.
No production-readiness or deployment claim is made.

## Gemini independent review checklist

- [ ] UI-01 success opens prefilled login without automatic authentication.
- [ ] UI-02 passive restoration, silent initial 401 and session expiry recovery.
- [ ] UX-01 loading, success, uncertainty and deliberate retry copy.
- [ ] CR-04 status/code handling, generic legacy/unknown fallbacks, no text guessing.
- [ ] CR-05 Unicode counters, exact password/fullName preservation and client-only confirmation.
- [ ] Dialog names, focus/keyboard/Escape restoration, inline error associations,
      password visibility labels, screen-reader announcements and responsive layout.
- [ ] CR-02 Forgotten Password removed; no unrelated commerce changes.
- [ ] Actual HTTPS/browser acceptance and consumer sign-off before release.

## Recorded implementation validation

Base develop: `efd1890d8d869db1333f74e2b995c29382767e7a`.
Node 24.19.0. Application TypeScript and a supplemental TypeScript check including
all test files passed; focused ESLint passed with zero warnings. Jest: **43 tests
passed across 6 suites**. `CI=true npm run build` compiled successfully.
Tooling notices: existing outdated Browserslist data and Node fs.F_OK deprecation.
No dependency/lockfile change was needed.

Mocked Linux Chromium smoke verified one startup me request, one registration,
no auto-login, one explicit login, CSRF refresh after login/logout, one logout,
and empty browser local/session storage. The mock preview replaces remote font
CSS with an empty stylesheet (system fallback fonts) and uses synthetic API data.
The existing public/index.html jQuery `$ is not defined` console error and blocked
external CDN assets are unrelated baseline issues and were not edited. These
visual checks do not validate external asset availability or real cookies/TLS.

- [Desktop registration validation](frontend-auth-evidence/registration-validation.png)
- [Mobile post-registration login](frontend-auth-evidence/post-registration-login-mobile.png)
