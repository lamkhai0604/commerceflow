# CR-S1C-02 — cleanup reliability, documentation and read-only audits

Product Owner authorized F-02, F-04, read-only preview audit and revalidation.
Base head: 7d678e97137ed567bd54261f059fef82fe2abbb7. PR #16 remains Draft.
The separate .env configuration addition is NOT implemented or authorized.

## Changes

- e2e/scripts/cleanup.sh: reject unsafe/linked state and evidence paths; fail
  closed on Docker access, Compose down, failed/nonempty container/network/image
  inventory, foreign image label, image removal and secret deletion. A failed
  inventory cannot be mistaken for no resources. On failure return nonzero,
  replace stale PASS evidence with a sanitized FAIL/stage and retain private
  recovery state until resource removal is verified. On successful retry remove
  only owned resources/secrets/logs; preserve sanitized evidence and idempotency.
- e2e/scripts/run.sh: preserve browser nonzero exit and fail an otherwise passing
  run if cleanup fails; explicit INT/TERM exit handling. No authentication/E2E
  expectations changed.
- e2e/support/lifecycle.test.cjs: 18 tests (five existing plus 13 new), using only
  temporary fixtures and a fake Docker executable, never actual external data.
  Fault injection covers daemon access, Compose, all inventories, image ownership
  and removal, residual resources, deletion failure, safe retries, idempotency,
  evidence symlinks and browser/cleanup exit propagation. No fault is injected
  into existing Docker services. Signal interruption itself is not claimed as a
  separately executed fault-injection test.
- IMPLEMENTATION.md, CR-S1C-01-VERIFICATION.md and the correlation correction
  record: remove stale current-state claims about the fixed correlation defect,
  unchanged backend source and pending baseline CI; preserve historical evidence
  and approval boundaries. Update cleanup runbook and test count.
- VERCEL-PREVIEW-AUDIT.md: read-only findings and access limitations.
- ENV-SECURITY-REVIEW-PROPOSAL.md: tracked-tree audit and exact unexecuted proposal.

## Completed local checks

```sh
npm run test:e2e:infra
for script in e2e/scripts/*.sh; do bash -n "$script"; done
npm run typecheck
npm run typecheck:e2e
npm run lint:auth
npm run lint:e2e
CI=true npm test -- --watchAll=false --runInBand
REACT_APP_AUTH_API_BASE_URL=/api/v1 CI=true npm run build
JAVA_HOME=/workspace/work/backend-tooling/jdk-21.0.8+9 \
MAVEN_OPTS=-Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts \
MAVEN_USER_HOME=/workspace/work/backend-tooling/.m2 \
./backend/mvnw -f backend/pom.xml \
-s /workspace/work/backend-tooling/settings.xml -B clean verify
```

All listed checks PASS. Lifecycle tests 18/18, Jest 90/90 across 7 suites,
Maven 49 tests / 0 failures / 0 errors / 0 skips, including PostgreSQL auth 22
and V4 migration 3. Existing Browserslist age/Node deprecation notices remain;
no lint warning suppression. The first lint attempt caught two literal-shell
string warnings in new test fixtures; corrected before the passing rerun.

HTTPS revalidation and hosted final-head CI conclusions are recorded below when
completed; this preparation record does not claim those unfinished steps passed.

## Audit boundaries and approval gates

No application/backend code, configuration, API, migration, legacy commerce,
Vercel setting, .env/.gitignore/root README or existing workflow changes.
No history rewrite, rotation, local-file deletion, merge, deployment or production
access. Root .env has only public metadata; proposed index-only removal and README
move await separate approval. No confirmed live secret in the 301-file tracked
baseline scan; not a complete history/hosted-secret audit.

Vercel API audit remains blocked by team access; public preview access was also
unavailable from this environment. The bot's Ready indication is historical,
not verified live auth routing. No bypass or alternate identity was attempted.
Gate 2 stays HOLD; Linux is not Windows acceptance. Independent review/owner
acceptance, external-asset and browser-container limitations still apply.
