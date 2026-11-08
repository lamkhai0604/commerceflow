# Workflow and Engineering Profile — CommerceFlow

## Branching and integration

| Branch | Purpose |
| --- | --- |
| `master` | Production. Vercel deploys the storefront and Render deploys the API from it ([deployment](DEPLOYMENT.md)). Changes arrive only through a `develop → master` release pull request merged by the Product Owner |
| `develop` | Integration. Every feature pull request targets it |
| `feature/<sprint>-<topic>`, `fix/<topic>`, `docs/<topic>` | One coherent change per branch and pull request |

Pull request descriptions state the problem, resulting behavior, verification (command, environment, revision, result), and any compatibility, security or data implications. Authors inspect their own diff first; self-review is disclosed as such and is not presented as independent review. Completion, merge and release are reported separately.

## Engineering profile

| Topic | Convention |
| --- | --- |
| Frontend | TypeScript 5 (strict), React 18, Vite 8, Tailwind CSS 4, React Router 6, Redux Toolkit with Redux-Saga for authentication state. Node.js 22.12 or later (CI uses Node 24) |
| Backend | Java 21, Spring Boot 3.5, Spring Security with Spring Session JDBC, Flyway, PostgreSQL 17. See [backend/README.md](../backend/README.md) |
| Frontend layout | `src/app` (bootstrap, store, routes), `src/features/<feature>` (state, API client, feature components), `src/components` (shared UI primitives), `src/layouts`, `src/pages`. Feature modules depend on shared components, never the reverse |
| Imports | `@/` resolves to `src/` |
| Styling | Tailwind utility classes and design tokens in `src/styles/index.css`. Shared components live in `src/components/ui`; no additional CSS or component frameworks. Modals use the native `<dialog>` element |
| API access | Same-origin `/api/v1` (`VITE_API_BASE_URL` overrides it for builds). Credentials stay in HTTP-only session cookies; CSRF tokens stay in memory; nothing authentication-related is written to browser storage |
| Errors | User-facing messages are fixed, safe strings mapped from documented error codes. Raw server detail, stack traces and identifiers are never shown |
| Lint and format | ESLint 10 flat config (`eslint.config.js`) with typescript-eslint and React Hooks rules; zero warnings allowed |
| Dependencies | npm with a committed `package-lock.json`. New runtime dependencies need a stated reason (necessity, maintenance, licence, size). Free and open-source only |
| Language and currency | English user interface; prices in US dollars |
| Assets | Only original work or assets whose licence permits commercial use without attribution requirements we cannot meet. Source and licence are recorded next to the asset list. No assets copied from third-party themes or templates |

## User-facing feedback

Every change a person can see follows these rules and is checked at 375 px width:

1. A state-changing action confirms success in plain words that say what happened.
2. A failure explains what went wrong and what to do next, next to the affected field or action. No raw codes or internal details.
3. Any noticeable wait shows progress, and a started action cannot be triggered twice.
4. One concept keeps one name everywhere it appears.
5. Irreversible or shared-impact actions ask for confirmation and state the consequence; reversible actions prefer undo.
6. Text meets WCAG 2.1 AA contrast on every background; status messages use `role="status"` or `role="alert"`; nothing relies on colour alone.
7. Feedback is fully visible on a narrow screen and causes no horizontal scrolling.
8. Transient confirmations can be read and dismissed; anything that needs action stays until handled.
9. Empty states explain why nothing is shown and offer the next useful action.

Tests assert the message text, and screenshots at desktop and 375 px width show it rendered. The authentication-specific patterns (loading button, status alert, toast, skeleton, retry) are defined in the [authentication UI/UX specification](sprints/sprint-1b/authentication-uiux-specification.md).

## Verification commands

| Check | Command | Where it runs |
| --- | --- | --- |
| Type check | `npm run typecheck` | Local, Frontend CI, Integration CI |
| Lint | `npm run lint` and `npm run lint:e2e` | Local, Frontend CI, Integration CI |
| Unit and component tests | `npm test` (Vitest, jsdom) | Local, Frontend CI, Integration CI |
| Production build | `npm run build` (output in `build/`) | Local, Frontend CI, Integration CI, Vercel |
| E2E lifecycle tests | `npm run test:e2e:infra` | Local (Node 24), Integration CI |
| Backend tests | `./mvnw clean verify` in `backend/` (requires Docker for PostgreSQL) | Backend CI |
| HTTPS browser E2E | `bash e2e/scripts/run.sh <run-id>` (requires Docker); see the [runbook](testing/e2e-https-integration.md) | Integration CI |

Frontend CI runs on pull requests into `develop` and `master`. The HTTPS integration workflow runs on pull requests into `develop` and on manual dispatch. Branch protection on `master` restricts merge methods; merges use merge commits.
