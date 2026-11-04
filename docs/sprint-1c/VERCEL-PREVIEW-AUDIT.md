# Read-only Vercel preview audit — PARTIALLY BLOCKED

Baseline PR #16 head: 7d678e97137ed567bd54261f059fef82fe2abbb7.
No deployment, project setting, environment variable, domain, protection bypass
or production setting was changed. No platform secret values were requested.

## Verified evidence

The Vercel bot's PR conversation comment reports Ready for project
ecommerce-project-1qx9 and links this preview:
https://ecommerce-project-1qx9-git-feature-e213d0-lamkhai0604s-projects.vercel.app
Source: https://github.com/lamkhai0604/ecommerce-project/pull/16#issuecomment-6636523599
This is the bot's last recorded observation, not current routing/security proof.

Read-only Vercel get_project and list_deployments for the exact known project/team
both returned 403 forbidden: this connection lacks the project's team grant.
Team discovery returned no authorized teams. A temporary consent link was
provided to the owner; authorization is pending. No alternate identity was used.
Public HTTPS GET attempts for / and /api/v1/health could not establish an HTTP
response through this environment's allowed network path (URLError/OSError,
not a TLS-verification bypass). No response body, cookie or credential retained.
Do not infer that the preview is unavailable globally from this environment.

## Repository-only observations

- Frontend authApi.ts defaults to /api/v1 unless REACT_APP_AUTH_API_BASE_URL is
  supplied. The isolated test build explicitly uses /api/v1 through Caddy.
- No tracked vercel.json or repository Vercel rewrite configuration was found.
- PostgreSQL, Java backend and Caddy in e2e/infra are isolated test infrastructure,
  not a backend deployed into this Vercel preview.
- Therefore a Ready static frontend alone does not establish working same-origin
  auth routing, valid problem responses, CSRF/session persistence or cookie flags.
  Platform rewrites and build-time variables remain unverified, not assumed absent.

## Remaining read-only checks once access is granted

Confirm exact preview deployment SHA/state and project build settings; inspect
preview-only routing and public auth base URL metadata without retrieving secret
values. Verify read-only /api/v1/health and /api/v1/auth/csrf return expected API
content rather than HTML/static fallback and confirm actual backend origin/proxy
without sending credentials or running account/session mutation tests. Do not
access production, create accounts, bypass protection or change platform settings.
If a correct preview auth route requires changes, propose those separately;
Gate 2 and deployment restrictions remain HOLD.

This audit is BLOCKED for current platform configuration and live routing claims;
it is not a failed authentication/security acceptance test. Linux local/CI HTTPS
results are separate evidence and do not resolve this access limitation.
