# CommerceFlow Engineering Profile

Status: Proposed for integration  
Decision authority: Product Owner  
Engineering standard: v1.5, pinned at `lamkhai0604/engineering-standard@ec037a4b1f2b252d5c9f141a7eca873caf66bdb2`  
Scope: Contributor practices and verification; no application behavior change.

## Technology and boundaries

- Frontend: React 17, TypeScript, Create React App 5; React Router 6, Redux Toolkit, Redux Saga, Axios, Material UI and Bootstrap.
- Frontend responsibility areas: `src/view/` (presentation), `src/controllers/` (orchestration and state), `src/models/` (models). Verify existing boundaries before refactoring.
- Backend: Java 21, Spring Boot 3.5.x, Maven wrapper; Spring Web, Data JPA, Validation, Actuator.
- Persistence: PostgreSQL 17, Flyway migrations and Docker Compose for local services.
- Authentication design: server-side sessions, CSRF enforcement and CUSTOMER/ADMIN role boundaries. The final approved contract and actual implementation must be reconciled before release.
- Deployment: Vercel frontend, production branch `master`. Backend production hosting and end-to-end integration readiness must be independently verified.

These describe the intended or reported project stack; they are not proof that all components are deployed or functioning.

## Source control and decision process

- Integration target: `develop`; production branch: `master`.
- Use task-scoped branches and Draft PRs when authorized. Keep unrelated changes separate.
- Implementation, review, merge, deployment and release are distinct states.
- The Product Owner must authorize material architecture, contract, dependency and data changes, and must separately authorize merges and releases.
- Independent reviews should assess all changed files, surrounding behavior, and blocker/major findings. CI success does not replace review.
- Do not silently replace approved requirements with draft or proposed documents.

## Code and security conventions

- Preserve established TypeScript and Java style, module boundaries, validation and error contracts; avoid unrelated refactors.
- Never commit secrets or real user data. Inspect tracked files in addition to ignore rules.
- Preserve Flyway migration history; schema/data changes require compatibility, preflight and recovery review.
- Keep auth, CSRF, session cookies, access control and error sanitization within their approved contract.
- Prefer deterministic tests, synthetic fixtures and isolated integration environments.
- Dependency upgrades and externally visible behavior changes require task scope and applicable approval.

## Verification commands and environments

Frontend commands (repository root; verify `package.json` before execution):

```bash
npm ci
CI=true npm test -- --watch=false
npx tsc --noEmit
npm run build
```

Backend commands (backend directory; verify Maven wrapper location and Docker availability):

```bash
./mvnw clean verify
```

On Windows, use the appropriate wrapper script. Backend integration tests may require Docker/Testcontainers and PostgreSQL. Browser HTTPS E2E tests require their declared browser, containers, certificates and service dependencies. Do not infer an E2E PASS from unit tests or mocked browser evidence.

Required CI workflows are defined in `.github/workflows/frontend-ci.yml` and `.github/workflows/backend-ci.yml`; confirm their current behavior and branch-protection enforcement rather than assuming configured required checks. Report each actual command, environment, source revision, outcome and gaps. Test thresholds, if any, must be supported by project evidence rather than invented here.

## Release and deployment

Before integration, confirm the candidate revision, relevant CI, independent review, outstanding defects and approvals. Before production release, additionally verify frontend/backend configuration, session/CSRF behavior, migration safety, HTTPS E2E, domain assignment, rollout checks and rollback plan.

The Vercel ignored-build step is configured to skip non-`master` builds according to the Product Owner; a dedicated preview-skip test is authorized separately and remains evidence-dependent. Skipped deployment records are acceptable. Neither a GitHub status nor an unchanged `master` SHA alone proves that production assignment is unchanged.

## Exceptions and technical debt

No new exception is approved by this documentation change. Existing CRs, review findings, and unresolved release gates remain in force. Record any future MUST-level exception with scope, authority, owner and review condition.

## Record style

Use neutral professional English in committed engineering records. Document decisions, rationale, facts, evidence, and explicit uncertainty; do not preserve chat transcripts or personal communication preferences. Keep one authoritative location for each fact and link rather than duplicating long specifications.
