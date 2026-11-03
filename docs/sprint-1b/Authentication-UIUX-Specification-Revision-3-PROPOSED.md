> **2026-11-02 contract-alignment addendum (documentation-only).** This Revision 3 proposal remains Draft and is not FINAL. Backend [PR #10](https://github.com/lamkhai0604/ecommerce-project/pull/10) and proposed OpenAPI [PR #13](https://github.com/lamkhai0604/ecommerce-project/pull/13) supersede earlier authentication error-code assumptions. The following addendum clarifies CR-04/CR-05 without authorizing Frontend work (CR-03 remains ON HOLD). Existing UI-01, UI-02 and UX-01 decisions are preserved.

CommerceFlow — Sprint 1B Authentication UI/UX Specification, Revision 3 (Unified UX-01 Integration)
Document Version: 3.1.0-PROPOSED-REVISION
Author: Gemini (UI/UX Design Specialist)
Status: SUBMITTED FOR TECH LEAD REVIEW (Design Specification Only — No Code/Repository Changes)
Repository: https://github.com/lamkhai0604/ecommerce-project (Base branch: develop)
Backend Reference: Draft PR #10 (https://github.com/lamkhai0604/ecommerce-project/pull/10)
Authoritative Baselines:
docs/sprint-1a/final-baseline/05-API/openapi-v1.0-DESIGN-BASELINE.yaml
docs/sprint-1a/final-baseline/04-Architecture/Accepted-Design-Baseline-v1.0-FINAL.md
docs/sprint-1a/final-baseline/01-SRS/SRS-Approved-Design-Addendum-v1.0-FINAL.md
docs/sprint-1a/FINAL-BASELINE-HANDOFF-REVIEW.md
1. Executive Summary & Baseline References
This document represents the unified Revision 3 of the Sprint 1B Authentication UI/UX Design Specification for CommerceFlow. It integrates all mandatory corrections from the architectural review, incorporates approved decisions UI-01 (Post-Registration Flow) and UI-02 (Passive Session Management), and introduces UX-01: User Action Status & Feedback as a mandatory cross-cutting UI standard.
Authoritative Architecture Foundations
Decision D3 (Security Architecture): Enforces Spring Security with Spring Session JDBC backing. User sessions rely strictly on server-managed, HttpOnly, SameSite=Lax, Path=/ cookies named SESSION. Browser storage (localStorage / sessionStorage) must never store authentication credentials or synthetic tokens.
Reverse Proxy & Origin: Single-origin deployment where the React SPA and /api/v1/* endpoints share the same host through an approved reverse proxy. Credentialed cross-origin CORS is disabled.
Draft PR #10 Verification: Confirms backend implementations for CSRF token rotation, PBKDF2 credential hashing, Spring Session persistence, RFC 7807 ProblemDetail structures, and strict RegisterRequest / LoginRequest records.
2. Approved Architectural Decisions UI-01 and UI-02
UI-01 — Post-Registration Flow (APPROVED)
Backend Contract Reality: In AuthController.java (PR #10), POST /api/v1/auth/register creates the user account and returns 201 Created with the registered UserProfile. The backend does not authenticate the customer, does not invoke session authentication strategies, and does not emit an authenticated SESSION cookie.
UI/UX Flow:
On receiving 201 Created, the registration modal does not assume an authenticated session.
The UI immediately displays a prominent success banner:
"Account created successfully. Please log in."
The interface transitions from RegisterModal to LoginModal.
The email field in LoginModal is pre-populated with the newly registered address, with focus programmatically set to the password field.
The client does not attempt to access protected endpoints until explicit login occurs.
UI-02 — Passive Session Validation (APPROVED)
Bootstrap Validation: On application initialization, the frontend issues a single passive call: GET /api/v1/auth/me.
200 OK: Client populates user state (id, email, fullName, roles) from the returned UserProfile and renders authenticated UI elements (e.g., account menu, order history).
401 Unauthorized (UNAUTHENTICATED): Client sets unauthenticated UI state silently. Anonymous browsing continues with no error dialogs.
Passive Interception on Protected Calls:
When an authenticated user triggers a protected action (e.g., viewing orders, accessing checkout) and the backend returns 401 Unauthorized (UNAUTHENTICATED), the client invalidates its local session state and presents the LoginModal.
Form Data Preservation: Where safe and non-sensitive (e.g., delivery address fields, filtering preferences), user-entered unsent form data is retained in component state so the user does not lose progress upon re-authenticating. Sensitive fields (passwords, payment inputs) are immediately wiped.
No Polling / No Heartbeat: Periodic background heartbeats or polling loops against /api/v1/auth/me are strictly prohibited.
Cart Scope Clarification: The application does not guarantee that an expired authenticated cart remains accessible if the server-side session has expired or been purged.
3. UX-01: User Action Status & Feedback System
Whenever a user initiates an asynchronous operation, the interface must provide continuous, unambiguous feedback across four standard states: Loading, Success, Error, and Recovery. The application must never appear frozen or unresponsive.
code
Code
+------------------+
       |   User Action    |
       +------------------+
                 |
                 v
       +------------------+
       |   1. LOADING     | ---> Contextual spinner / Skeleton
       |  (In Progress)   | ---> Disable duplicate submissions
       +------------------+ ---> aria-busy="true"
                 |
        +--------+--------+
        |                 |
 [200 / 201 / 204]  [4xx / 5xx / Net]
        v                 v
+---------------+ +------------------+
|  2. SUCCESS   | |    3. ERROR      | ---> Clear, non-technical explanation
| (Confirmed)   | | (Action Failed)  | ---> Inline validation vs Banner
+---------------+ +------------------+ ---> Preserve safe user draft inputs
                          |
                          v
                  +------------------+
                  |   4. RECOVERY    | ---> Refresh CSRF / Prompt Login
                  |  (Action Path)   | ---> User-initiated safe retry
                  +------------------+
3.1 Mandatory Loading State Principles
Prompt Display: Display loading indicators immediately upon dispatch of an asynchronous action.
Contextual Indicators: Tailor the indicator to the component (button spinner for actions, skeleton cards for data fetching). Never use full-screen blocking overlays for localized form actions.
Duplicate Submission Lockout: Disable the submit button and input fields while an operation is pending to prevent duplicate submissions or race conditions.
Independent Viewport Responsiveness: Keep unrelated parts of the UI (such as global search, navigation menus, or footer links) functional while a localized form is submitting.
Extended Operations: If an operation takes longer than 3 seconds (e.g., cold start latency), append informative copy such as "Still working..." inside the feedback container.
Deterministic Removal: Loading indicators must always terminate on HTTP response, error, timeout, or user cancellation. Indefinite loading states are strictly prohibited.
Contextual Loading Pattern Reference (CommerceFlow Standards)
Operation	Recommended Loading Pattern	Sprint Scope
Login / Register	LoadingButton spinner with descriptive label	Sprint 1B Scope
Session Initialization (/auth/me)	SkeletonLoader in header account zone	Sprint 1B Scope
Logout	Button / Menu item spinner with "Logging out..."	Sprint 1B Scope
Product Catalog Loading	Grid of skeleton cards matching card aspect ratios	Future Sprint Guidance
Search & Filtering	Inline progress indicator or skeleton result rows	Future Sprint Guidance
Add to Cart	Localized button micro-spinner; keeps screen active	Future Sprint Guidance
Profile / Address Updates	Button spinner and disabled duplicate submission	Future Sprint Guidance
Checkout & Payment	Structured progress overlay with idempotency lock	Future Sprint Guidance
Admin Dashboard Analytics	Skeleton chart and table placeholders	Future Sprint Guidance
Note: Patterns marked as Future Sprint Guidance define architectural standards; only Authentication is in Sprint 1B scope.
3.2 Success Feedback Principles
Server Confirmation Required: Display affirmative confirmation only after the server returns a successful HTTP response (200 OK, 201 Created, 204 No Content). Never show success based solely on button clicks.
User-Friendly Copy: Use natural, accessible language.
Actionable Next Steps: Direct the user to the logical next step (e.g., transitioning to login after account creation).
Non-Disruptive Notifications: Use auto-dismissing toasts for minor actions; avoid intrusive popups for standard background updates.
3.3 Error Feedback Principles
Actionable & Plain Language: Translate technical errors into safe, human-readable explanations.
No Information Leaks: Never disclose raw stack traces, database schema details, SQL exceptions, or submitted passwords.
Granular Error Placement:
Field Validation Failures: Rendered inline directly beneath the affected input field.
Operation / Authentication Failures: Rendered in a high-visibility StatusAlert banner at the top of the dialog.
Network Uncertainty: If a network timeout or connection reset occurs, state clearly: "We couldn't confirm the result. Please check your connection." (Do not falsely claim credentials were invalid).
3.4 Recovery & Retry Principles
Safe User Retry: Allow user-initiated retry for safe or failed operations.
No Automatic State-Changing Replays: Never silently auto-replay POST, PUT, or DELETE requests.
Session Expiry Recovery: On 401 UNAUTHENTICATED, explain that the session expired, preserve safe draft input, and present the LoginModal.
CSRF Recovery: On a confirmed CSRF failure, refresh the token via GET /api/v1/auth/csrf and prompt the user to click submit again.
Disambiguate 403 Errors: Distinguish CSRF failures from role authorization failures; do not assume every HTTP 403 represents an expired CSRF token.
4. Reusable Feedback Component Design Specifications
These specifications define the standardized presentation, placement, and accessibility behavior for feedback components across CommerceFlow. (Design patterns only — no implementation code is added in Sprint 1B).
code
Code
+-----------------------------------------------------------------------------------------+
|                              REUSABLE FEEDBACK COMPONENTS                               |
+-----------------------------------------------------------------------------------------+

[ LoadingButton ]
+--------------------------------------------------+
|  ( o ) Logging in...                             |  <- MUI CircularProgress (size 20)
+--------------------------------------------------+  <- Disabled during in-flight request

[ StatusAlert ]
+--------------------------------------------------+
| [!] Invalid email or password. Please try again. |  <- role="alert" / aria-live="assertive"
+--------------------------------------------------+  <- severity: error | warning | success

[ Toast / Snackbar ]
+--------------------------------------------------+
| (v) You have successfully logged in.         [X] |  <- Bottom-right / role="status"
+--------------------------------------------------+  <- Auto-dismisses after 4000ms

[ SkeletonLoader ]
+--------------------------------------------------+
| [//////////////////////////////////////////////] |  <- Pulsing placeholder for headers,
| [///////////////////////]                        |     cards, and avatar icons
+--------------------------------------------------+
4.1 Component Details Table
Component Pattern	Recommended Placement	Visibility & Trigger	Dismissal Behavior	Accessibility Specifications	Usage Context in CommerceFlow
LoadingButton	Bottom of active form; primary action spot	Visible during all form submissions	Reverts to default state upon HTTP resolution	aria-busy="true" when active; disabled attribute set; recommended minimum height 44 CSS pixels
Submit buttons for Login, Register, Logout
StatusAlert	Top of modal dialog or top of view container	Rendered upon server error, validation failure, or conflict	Persistent until corrected or manually dismissed via [X]	role="alert" (aria-live="assertive") for error; role="status" for info/success; contrast at least 4.5:1 for normal text and 3:1 for relevant UI components
Invalid credentials, duplicate email, CSRF warnings
Toast / Snackbar	Bottom-right viewport (desktop); bottom-center (mobile)	Rendered upon successful non-disruptive operations	Auto-dismisses after 4000ms; close button available	role="status", aria-live="polite"; dismissible via Escape key	Successful login toast, logout confirmation
SkeletonLoader	Within content zone (navbar account, product grids)	Rendered during initial asynchronous data fetching	Replaced by concrete UI upon receipt of data	Placeholder animation does not convey information by color alone; hidden from assistive tech via aria-hidden="true"	Session verification on mount (/auth/me)
SessionExpiredDialog	Centered modal overlay	Triggered by 401 UNAUTHENTICATED on protected action	Dismissed on clicking "Log In" or modal close	role="dialog", aria-modal="true"; focus trapped inside dialog	Active user session timeout during checkout/orders
RetryState	Within form or inline error container	Displayed when network fails or CSRF token expires	Replaced when user clicks retry and operation begins	Retry button has clear label; keyboard accessible; contrast at least 4.5:1 for normal text and 3:1 for relevant UI components
Network connection failure, expired CSRF retry
5. Sprint 1B Authentication Application & Interaction Matrix
5.1 Registration UX (RegisterModal)
Loading: Submit button transitions to LoadingButton displaying a spinner and "Creating Account...". Form fields are set to disabled.
Success (UI-01): Displays StatusAlert (success): "Account created successfully. Please log in." Form smoothly transitions to LoginModal with pre-filled email and focused password input.
Error:
Field validation failures (VALIDATION_ERROR): Mapped directly to inline helper text under fullName, email, or password.
Duplicate registration (EMAIL_CONFLICT): Displays top StatusAlert (error): "An account with this email already exists. Please log in instead." with a button to switch to login.
Malformed payload (INVALID_REQUEST): Top StatusAlert (error): "The submitted request is invalid. Please refresh the page and try again."
Network error: Top StatusAlert (warning): "We couldn't confirm your registration. Please check your connection and try again."
5.2 Login UX (LoginModal)
Loading: Submit button transitions to LoadingButton displaying a spinner and "Logging in...". Inputs disabled.
Success: Closes modal, refreshes authenticated state in navbar, displays brief toast: "You have successfully logged in." Triggers background CSRF refresh (GET /api/v1/auth/csrf).
Error:
Bad credentials (INVALID_CREDENTIALS): Top StatusAlert (error): "Invalid email or password." (Safe generic message).
CSRF failure (403 CSRF_INVALID on login): Top StatusAlert (warning): "Security validation expired. Refreshing token..." Client refreshes token and prompts user to retry.
5.3 Logout UX
Loading: User dropdown menu displays spinner and label "Logging out...". Menu clicks disabled.
Success: Receives 204 No Content. Client resets Redux user state, discards stored CSRF token, fetches fresh anonymous CSRF token, and displays toast: "You have successfully logged out."
Error: If logout encounters a network error, informs user: "Could not confirm logout with the server. Please check your connection." Client state is not falsely marked as securely terminated until server response or explicit user reset.
5.4 Session Initialization UX (GET /api/v1/auth/me)
Loading: On application mount, render subtle SkeletonLoader in header account zone (avoiding false flash of "Sign In" or unverified user name).
Success (200 OK): Header renders customer name and account dropdown.
Anonymous (401 UNAUTHENTICATED): Header renders default "Sign In" and "Register" buttons. No error alert shown.
5.5 Authentication Interaction-State Matrix
Feature / Action	1. Idle State	2. Loading State (aria-busy="true")	3. Success State (Server Confirmed)	4. Error State (role="alert")	5. Recovery Path
App Mount (/auth/me)	Initial DOM load	Navbar user badge renders pulsing SkeletonLoader	User profile loaded; renders authenticated menu	401 UNAUTHENTICATED: Silent transition to anonymous navbar	None needed; normal unauthenticated browsing
Registration (/auth/register)	Form fields blank; Submit enabled	Submit button shows spinner + "Creating Account..."; inputs disabled	201 Created: Shows "Account created successfully. Please log in."; opens LoginModal	400 VALIDATION_ERROR: Inline field errors.
409 EMAIL_CONFLICT: Alert banner	User corrects fields or switches to LoginModal
Login (/auth/login)	Form active; pre-filled email if redirected	Submit button shows spinner + "Logging in..."; inputs disabled	200 OK: Sets session; rotates CSRF; closes modal; shows success toast	401 INVALID_CREDENTIALS: Alert banner: "Invalid email or password."	Re-enter credentials; password field focused
Logout (/auth/logout)	"Log Out" menu item available	"Logging out..." indicator in menu; menu clicks blocked	204 No Content: Session purged; navbar updates to anonymous; toast shown	Network failure: Alert banner: "Unable to confirm logout."	User retry button provided; session state guarded
Protected Action on Expired Session	User triggers cart or order action	Action indicator spins	N/A (Session expired)	401 UNAUTHENTICATED: SessionExpiredDialog launches	Informs user draft data is saved; launches LoginModal
CSRF Stale (403 CSRF_INVALID on write)	User submits form	Spinner active	N/A (Rejected)	403 CSRF_INVALID: Alert banner: "Security token expired."	Client refreshes token (/auth/csrf); user clicks submit
6. Revised Form Specifications & Field Validation
6.1 Customer Registration Form (RegisterModal)
Conforms strictly to backend RegisterRequest record:
code
JSON
{
  "fullName": "Jane Doe",
  "email": "jane.doe@example.com",
  "password": "Password1234!"
}
code
Code
+-----------------------------------------------------------------------+
|  Create Your CommerceFlow Account                                 [X] |
+-----------------------------------------------------------------------+
|                                                                       |
|  [StatusAlert: Renders on duplicate email or server error]            |
|                                                                       |
|  Full Name *                                                          |
|  [ Jane Doe                                                         ] |
|  Helper: Enter your full name (1–50 Unicode code points)                      |
|                                                                       |
|  Email Address *                                                      |
|  [ jane.doe@example.com                                             ] |
|  Helper: Enter a valid email address                                  |
|                                                                       |
|  Password *                                                           |
|  [ ************                                                 (eye)]|
|  Helper: Must be between 12 and 128 Unicode code points                        |
|                                                                       |
|  Confirm Password *                                                   |
|  [ ************                                                 (eye)]|
|  Helper: Re-enter your password                                       |
|                                                                       |
|  [ LoadingButton: "Create Account" / "Creating Account..." ]          |
|                                                                       |
|  Already have an account? Log In                                      |
+-----------------------------------------------------------------------+
Detailed Field Rules
Field Name	Target DTO Field	Input Attributes	Validation Criteria	User Error Copy (aria-describedby)
Full Name	fullName	type="text"
autocomplete="name"	- Required
- Trimmed length: 1–50 Unicode code points
- Any valid non-empty string	- "Full name is required."
- "Full name cannot exceed 50 Unicode code points."
Email Address	email	type="email"
autocomplete="email"	- Required
- Normalize whitespace/lowercase before validation; valid email, max 254 Unicode code points	- "Email address is required."
- "Please enter a valid email address."
- "Email cannot exceed 254 Unicode code points."
Password	password	type="password"
autocomplete="new-password"	- Required
- Length: 12 to 128 Unicode code points (@CodePointLength(min=12, max=128)); do not trim or normalize password	- "Password is required."
- "Password must contain at least 12 Unicode code points."
- "Password cannot exceed 128 Unicode code points."
Confirm Password	Client-only (Never sent to API)	type="password"
autocomplete="new-password"	- Required
- Must match password exactly	- "Please confirm your password."
- "Passwords do not match."
6.2 Customer Login Form (LoginModal)
Matches backend LoginRequest record (email, password).
code
Code
+-----------------------------------------------------------------------+
|  Log In to CommerceFlow                                           [X] |
+-----------------------------------------------------------------------+
|                                                                       |
|  [StatusAlert (Success): "Account created successfully. Please log in"]|
|  [StatusAlert (Error): "Invalid email or password. Please try again"] |
|                                                                       |
|  Email Address *                                                      |
|  [ jane.doe@example.com                                             ] |
|                                                                       |
|  Password *                                                           |
|  [ ************                                                 (eye)]|
|                                                                       |
|  [ LoadingButton: "Log In" / "Logging in..." ]                        |
|                                                                       |
|  Don't have an account? Create an account                             |
+-----------------------------------------------------------------------+
Per approved Change Request CR-02, the non-functional "Forgotten Password" link is completely removed.
7. Session Architecture & Cookie Behavior
7.1 Authoritative Cookie: SESSION
Cookie Name: SESSION (Spring Session JDBC standard). References to JSESSIONID are obsolete.
Attributes:
HttpOnly: Enforced. JavaScript cannot read or modify the session cookie.
SameSite=Lax: Enforced. Mitigates CSRF risks on cross-site navigations while supporting standard entry links.
Path=/: Enforced for full root-domain scope.
Max-Age / Inactivity Timeout: 30-minute server-side rolling expiration.
Environment Handling:
Local Development: SESSION_COOKIE_SECURE=false over plain HTTP localhost.
Production: Secure=true over HTTPS behind reverse proxy.
8. CSRF Token Lifecycle Management
code
Code
+---------------------------------------------------------------------------------------------------------+
|                                        CSRF TOKEN LIFECYCLE                                             |
+---------------------------------------------------------------------------------------------------------+

1. BOOTSTRAP:
   On application mount or opening auth modal:
   --> GET /api/v1/auth/csrf
   <-- 200 OK { "headerName": "X-CSRF-TOKEN", "token": "token-value-a" }
   * Action: Retain in Redux memory state. Never persist in localStorage.

2. STATE-CHANGING SUBMISSION:
   User submits POST /api/v1/auth/login or POST /api/v1/auth/register:
   --> POST /api/v1/auth/login
       Header: "X-CSRF-TOKEN: token-value-a"
       Cookie: SESSION=initial-session-id

3. POST-LOGIN ROTATION (MANDATORY):
   Spring Security rotates session ID and invalidates old CSRF token upon successful authentication:
   <-- 200 OK (Set-Cookie: SESSION=authenticated-session-id)
   --> GET /api/v1/auth/csrf
   <-- 200 OK { "headerName": "X-CSRF-TOKEN", "token": "token-value-b" }
   * Action: Update in-memory state with token-value-b for all subsequent authenticated writes.

4. LOGOUT INVALIDATION:
   User logs out:
   --> POST /api/v1/auth/logout (Header: "X-CSRF-TOKEN: token-value-b")
   <-- 204 No Content
   * Action: Discard token-value-b. Fetch new anonymous token prior to any further write actions.
+---------------------------------------------------------------------------------------------------------+
9. HTTP Error & Problem Details Handling Matrix
All backend error payloads strictly implement RFC 7807 (application/problem+json).
code
JSON
{
  "type": "about:blank",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Invalid email or password",
  "instance": "/api/v1/auth/login",
  "code": "INVALID_CREDENTIALS"
}
Complete Error Handling Matrix
HTTP Status	Backend code	Backend detail	UI Feedback Pattern	Displayed User-Facing Message	Recovery Action
400 Bad Request	VALIDATION_ERROR	"Request validation failed"	Field helper errors	Inline errors mapped from errors map under corresponding inputs	Correct field errors and submit
400 Bad Request	INVALID_REQUEST	"Request body is invalid"	StatusAlert (error)	"The submitted request is invalid. Please refresh the page and try again."	Re-initialize form
401 Unauthorized	INVALID_CREDENTIALS	"Invalid email or password"	StatusAlert (error)	"Invalid email or password. Please try again." (Generic safe message)	Re-enter password; focus password field
401 Unauthorized	UNAUTHENTICATED	"Authentication required"	SessionExpiredDialog	"Your session has timed out. Please log in to continue."	Launch LoginModal; preserve non-sensitive draft input
403 Forbidden	CSRF_INVALID	"CSRF validation failed"	StatusAlert (warning)	"Security validation expired. Refreshing token..."	Fetch GET /api/v1/auth/csrf; prompt user-initiated retry (no automatic replay)
403 Forbidden	ACCESS_DENIED	"Access denied"	StatusAlert (error)	"You do not have permission to perform this action."	Do not refresh CSRF automatically; offer safe navigation
403 Forbidden	FORBIDDEN (legacy/unknown)	"Unspecified denial"	StatusAlert (error)	"Unable to complete this request."	Safe generic handling; do not classify as CSRF based on route or message
409 Conflict	EMAIL_CONFLICT	"An account with this email already exists"	StatusAlert (error) + Inline error	"An account with this email already exists. Please log in instead."	Switch to LoginModal with pre-filled email
500 Internal Error	INTERNAL_ERROR	Internal server error	StatusAlert (error)	"A server error occurred. Please try again in a few moments."	User retry button
10. Design-to-API Mapping
User Operation	Method & Endpoint	Headers	Request Body	Success Outcome	Error Codes Handled
CSRF Bootstrap	GET /api/v1/auth/csrf	Accept: application/json	None	200 OK
CsrfResponse	None (Public)
Customer Register	POST /api/v1/auth/register	Content-Type: application/json
X-CSRF-TOKEN: <token>	RegisterRequest:
{ fullName, email, password }	201 Created
UserProfile DTO	400 VALIDATION_ERROR
400 INVALID_REQUEST
403 CSRF_INVALID
409 EMAIL_CONFLICT
Customer Login	POST /api/v1/auth/login	Content-Type: application/json
X-CSRF-TOKEN: <token>	LoginRequest:
{ email, password }	200 OK
UserProfile DTO
Set-Cookie: SESSION=...	400 INVALID_REQUEST
401 INVALID_CREDENTIALS
403 CSRF_INVALID
Active Session Check	GET /api/v1/auth/me	Accept: application/json	None (Browser transports SESSION)	200 OK
UserProfile DTO	401 UNAUTHENTICATED
Customer Logout	POST /api/v1/auth/logout	X-CSRF-TOKEN: <token>	None	204 No Content
(Session purged)	401 UNAUTHENTICATED
403 CSRF_INVALID
11. Accessibility (WCAG 2.1 AA) Compliance Checklist

Color Contrast Compliance:
Normal Text (< 18pt / < 14pt bold): Contrast ratio at least 4.5:1 against background (WCAG 2.1 SC 1.4.3). Example #1F2937 on #FFFFFF exceeds 4.5:1.
Large Text (at least 18pt or 14pt bold): text contrast at least 3:1; interactive component boundaries and states at least 3:1 against adjacent colors (SC 1.4.11). Example #4B5563 on #FFFFFF exceeds 3:1.
Status Indicators: Never communicate status by color alone; all alerts combine color with distinct iconography and descriptive text labels.

Focus Management & Keyboard Navigation:
Active interactive elements feature a visible high-contrast focus ring: 2px solid #2563EB with 2px offset.
Modal dialogs employ focus trapping via MUI TrapFocus.
On modal launch, focus lands automatically on the first relevant interactive element (fullName on register; password if email pre-filled on login).
Pressing Escape closes the modal dialog and returns focus to the triggering element in the header.

Dynamic Screen Reader Feedback (aria-*):
Processing states set aria-busy="true" on the form container.
Critical error alerts utilize role="alert" and aria-live="assertive".
Non-critical success notifications utilize role="status" and aria-live="polite".
Field errors are explicitly linked to input elements using aria-invalid="true" and aria-describedby="[field-id]-helper".
Screen reader announcements are throttled to prevent spamming when users type.

Password Visibility Toggle:
Toggles use explicit <button type="button"> with dynamic labels:
Masked: aria-label="Show password" and aria-pressed="false".
Revealed: aria-label="Hide password" and aria-pressed="true".

Touch Target Dimensions:
WCAG 2.1 AA does not prescribe a universal minimum target size; ensure keyboard accessibility and usable spacing. Recommended usability target: at least 44 × 44 CSS pixels for primary touch controls (recommendation, not a WCAG 2.1 AA requirement).
12. Acceptance Criteria (UX-01 & Sprint 1B Auth)
The implementation of Sprint 1B Authentication will satisfy design acceptance criteria when:
Deterministic Loading Feedback:
Every asynchronous operation (register, login, logout, /auth/me) displays an immediate, contextual loading state (LoadingButton spinner or skeleton placeholder).
Duplicate clicks during in-flight requests are physically prevented via input and button disabling.
Clear Success Confirmation:
Successful registration displays "Account created successfully. Please log in." and transitions to LoginModal per UI-01.
Successful login updates UI authenticated state after a successful 200 response and server-confirmed profile; JavaScript cannot read or validate the HttpOnly SESSION cookie. Confirm session continuity via a subsequent GET /api/v1/auth/me where needed.
Successful logout updates the UI to anonymous state only after receiving 204 No Content.
Structured & Safe Error Feedback:
Form validation errors appear inline under the specific offending fields using server-supplied errors map.
Invalid credentials render a generic, safe alert banner preventing user enumeration.
No stack traces, server internals, or plain-text passwords appear in any error message or log.
Actionable Recovery:
On expired sessions, the SessionExpiredDialog preserves non-sensitive draft form data and opens the login dialog.
On CSRF rejection, the client refreshes the CSRF token and invites user-initiated resubmission without automatic blind replay.
Accessibility Compliance:
All interactive controls adhere to WCAG 2.1 AA contrast ratios (4.5:1 normal text, 3:1 large text and relevant non-text UI components).
Dynamic announcements use role="alert" for errors and role="status" for non-disruptive feedback.
Focus is properly managed and trapped within modals, with full keyboard navigability.
13. Scope and Restrictions
Current Design Scope: Sprint 1B Authentication UI/UX specification (RegisterModal, LoginModal, Logout, Session Bootstrap). Frontend implementation is not authorized under CR-03.
Future Applicability: The UX-01 User Action Status & Feedback standard applies across all upcoming CommerceFlow domains (Catalog, Cart, Checkout, Orders, Admin Dashboard).
No Code Implementation Authorized: Design document revision only. Do not edit source code files (authSlice.ts, authSaga.tsx, LoginModal.tsx, etc.).
CR-03 Status: ON HOLD. Legacy localStorage.setItem('access_token', ...) in authSaga.tsx is documented as technical/security debt, but no code changes are authorized until Tech Lead approval.
Finality: This document remains a proposed revision awaiting official Tech Lead sign-off.
14. Revision 2 → Revision 3 Change Log
Revision 2 Baseline	Revision 3 Specification (Current)	Change Driver & Authority
Post-Registration Flow
Proposed automatic login after registration	UI-01 Approved: Displays "Account created successfully. Please log in.", transitions to LoginModal with pre-filled email. No auto-session.	Tech Lead Decision UI-01 & PR #10 AuthController.java
Session Validation
Suggested periodic polling / heartbeat	UI-02 Approved: Passive validation on mount (/auth/me) and passive 401 interception on protected calls. No polling.	Tech Lead Decision UI-02
Session Cookie Name
Cited legacy JSESSIONID	Corrected to SESSION	Correction A & PR #10 Spring Session JDBC
CSRF Lifecycle
Basic bootstrap only	Complete lifecycle: Bootstrap 
 Send X-CSRF-TOKEN 
 Mandatory post-login refresh 
 Logout discard 
 In-memory only.	Correction B & PR #10 loginRotatesSessionRefreshesCsrf
HTTP 403 Disambiguation
Assumed 403 always meant CSRF expiry	Disambiguated: 403 can be authorization OR CSRF. No auto-replay. Added integration question for discrete backend codes.	Correction C
Problem Details Codes
Included unsupported AUTH_INVALID_CREDENTIALS	Replaced with verified PR #10 codes: INVALID_CREDENTIALS, UNAUTHENTICATED, VALIDATION_ERROR, EMAIL_CONFLICT.	Correction D & PR #10 ApiErrors.java
Registration Form Fields
Suggested first/last split and strict RFC 5322 regex	Standardized: fullName (1–50 Unicode code points), normalized email (max 254 Unicode code points), password (12–128 Unicode code points). confirmPassword is client-only.	Correction E & PR #10 RegisterRequest.java
Accessibility Specs
General statements without metrics	Defined numeric contrast (4.5:1 normal text, 3:1 large text and relevant UI), focus management, and recommended 44 × 44 CSS pixel touch targets.	Correction F
User Action Status & Feedback
Ad-hoc spinner mentions	UX-01 Integration: Comprehensive 4-state lifecycle (Loading, Success, Error, Recovery), reusable component patterns, and interaction matrix.	Tech Lead UX-01 Unified UX Requirement
15. Remaining Integration Questions and Change Requests
15.1 Integration Questions for Backend Team
Discrete Problem Codes for 403 Failures:
Historical question (superseded by CR-04 implementation in PR #10): earlier revisions used a combined FORBIDDEN response. Current backend distinguishes CSRF_INVALID and ACCESS_DENIED; see the 2026-11-02 addendum.
Resolved for backend PR #10: use CSRF_INVALID for CSRF rejection and ACCESS_DENIED for authorization. Frontend implementation remains on hold per CR-03.
15.2 Status of Change Requests
CR-01 (CSRF Route Standardization to /api/v1/auth/csrf): APPROVED & INTEGRATED.
CR-02 (Removal of Forgotten Password Link): APPROVED DESIGN; frontend removal NOT IMPLEMENTED (CR-03 hold).
CR-03 (Frontend Legacy Storage Migration): ON HOLD.
Reminder: Legacy frontend src/redux/sagas/authSaga.tsx still stores localStorage.setItem('access_token', user.id). Revision 3 defines the target session-cookie architecture in Section 7, but per strict instructions, no frontend source code has been altered. Implementation of CR-03 remains pending Tech Lead authorization.

## 2026-11-02 — CR-04 / CR-05 UX contract-alignment addendum

This addendum is a documentation proposal for Tech Lead review, not permission to merge, mark FINAL, or implement frontend integration.

**Error mapping and recovery.** The backend's CSRF rejection code is `CSRF_INVALID` (HTTP 403), not the earlier `CSRF_TOKEN_INVALID`. A separate authorization denial is `ACCESS_DENIED` (HTTP 403). Missing/expired authentication is `UNAUTHENTICATED` (401); invalid credentials are `INVALID_CREDENTIALS` (401). Invalid login JSON/schema is 400 `INVALID_REQUEST` or `VALIDATION_ERROR`, not a credential failure. A verified duplicate registration email is 409 `EMAIL_CONFLICT`; unrelated database errors must not be displayed as duplicate-email errors. Use generic safe feedback for legacy `FORBIDDEN`, unknown codes, non-JSON bodies, and network errors; never infer CSRF from response text or automatically replay state-changing requests. After login rotates session/CSRF, bootstrap a new CSRF token before subsequent writes. Preserve UI-01 post-registration login modal, UI-02 passive session check and UX-01 loading/success/error feedback.

**CR-05 client-side registration rules.** Require a nonblank `fullName` of 1–50 Unicode code points, a nonblank password of 12–128 Unicode code points (do not trim, normalize or truncate password), and a valid normalized email of at most 254 Unicode code points. Normalize email by stripping leading/trailing whitespace and applying `Locale.ROOT`-equivalent lowercase **before** email format and length validation and before sending the request. JSON Schema `format` and `maxLength` alone do not implement preprocessing. For login, apply normalized-email validation, but preserve the supplied non-null string password exactly and do not reapply registration password length constraints. Client counters must count Unicode code points, not UTF-16 units or bytes.

**Scope and compatibility.** Existing React authentication still uses legacy client-side/localStorage behavior and an external `/users` API; it is not yet an adopted consumer of the new backend auth endpoints. Do not migrate it under this PR. CR-02 removes the inactive Forgotten Password link **when separately authorized frontend implementation occurs**; no link removal is claimed here. No production code, FINAL baseline, OpenAPI or Backend file is changed by this UX addendum. Real browser HTTPS/proxy/cookie/CSRF verification and consumer acceptance remain separate gates.
