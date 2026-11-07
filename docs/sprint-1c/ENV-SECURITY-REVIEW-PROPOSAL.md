# Tracked environment/configuration review — proposal only

Scope addition status: REVIEWED, MODIFICATION NOT AUTHORIZED. No environment file,
ignore rule or root README was modified by this review. No history rewrite,
credential rotation, local-file deletion or repository-visibility change.

Reviewed baseline: 7d678e97137ed567bd54261f059fef82fe2abbb7, 301 tracked files.
This is a current tracked-tree review, not a complete historical or hosted-secret
audit and not a guarantee that every possible secret format is detectable.
No secret values are reproduced here.

## Findings

- Root .env: exactly three entries, author, shopname and github. Values were
  inspected in memory: plain public attribution/store metadata and a public
  github.com repository URL with no embedded credentials. No credential or token.
- backend/.env.example: local DB/user/host/port and server settings, explicit
  replace-with-local-password placeholder, local HTTP cookie override clearly
  documented. The production cookie default remains true in application.yml.
- .gitignore already ignores .env and .env.* and allows .env.example. Git ignore
  cannot protect the already tracked root .env. Its comment acknowledges this.
  Risk: future local credentials could accidentally be committed there.
- backend/src/main/resources/application.yml and backend/compose.yaml source DB
  credentials from required environment variables; no concrete credential found.
- e2e/infra/compose.yaml reads generated disposable credentials; start.sh generates
  them privately. No real credentials/private TLS keys are tracked. Owned cleanup
  preserves private recovery state if resource removal cannot be verified.
- Reviewed tracked workflows, Dockerfile/Compose, browser/build/TypeScript/IDE
  configuration and auth security configuration. CI refers to environment or
  generated test values; no confirmed production secret found.
- Pattern scan of text-decodable files in the 301-file tracked inventory checked
  private-key markers, common
  GitHub/AWS/Slack token signatures, URLs embedding credentials and quoted
  password/token/key assignments. Candidate hits were reviewed: synthetic test
  passwords/tokens and validation/UI strings (backend auth tests, authApi tests,
  userApi tests, authSaga tests, lifecycle fixtures, authApi/authValidation).
  None established a live credential. No values were printed. Lockfile integrity
  hashes and public service/repository URLs are not credentials.
- No tracked .npmrc, .netrc, private-key/certificate-store file or credential file
  was found. Local ignored files and platform secret values were deliberately
  not dumped. Git history, binary-asset contents and third-party credential validity were not
  tested.

## Exact proposed file-change plan — separate Product Owner approval required

1. README.md: add a short public project-metadata/attribution section preserving
   the existing three metadata facts. Prefer README over .env.example because
   these are documentation, not runtime settings. A safe metadata example file
   is an alternative if the owner prefers machine-readable attribution.
2. .env (index only): after approval use git rm --cached -- .env, never rm .env.
   Verify the local file exists and a privately computed before/after checksum
   matches; do not print its contents. This stages untracking while preserving
   this developer's local file. Do not rewrite Git history.
3. .gitignore: update only the obsolete comment about the existing tracked
   frontend .env. Keep the current .env/.env.* exclusions and .env.example
   exception. No broad configuration or application changes.
4. docs/sprint-1c/ENV-SECURITY-REVIEW-PROPOSAL.md: record the approval, exact commit
   and validation if implementation is subsequently authorized.

Before/after checks: git ls-files --error-unmatch .env should change from tracked
to untracked; git check-ignore .env should succeed afterward; local file and
checksum unchanged; the example file remains tracked; git diff --cached is only
approved files. Run relevant frontend checks/build and confirm no metadata
runtime dependency was introduced. Search found no direct process.env access to
these three metadata keys. Removal is expected to be behavior-neutral; this is
not proof of every external developer tool's usage.

Compatibility caveat: git rm --cached preserves the executing developer's local
file, but when other clones pull a commit removing a tracked file, Git can remove
their unchanged tracked copy. Notify collaborators to retain a private local
backup before updating. Do not promise that a repository commit can preserve
all other worktrees automatically. Public metadata remains in prior history;
there is no evidence here requiring rotation or history rewriting.

Decision requested: approve only the README metadata move, index-only untracking,
ignore-comment correction and verification described above, or keep the current
configuration. No part has been executed.
