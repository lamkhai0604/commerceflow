# CommerceFlow Contributor Entry Point

Project: CommerceFlow  
Engineering standard: AI-Assisted Software Engineering Standard v1.5  
Standard source: private repository `lamkhai0604/engineering-standard`, `AI-ENGINEERING-STANDARD-v1.5.md`  
Pinned standard revision: `ec037a4b1f2b252d5c9f141a7eca873caf66bdb2` (`main`, 2026-11-06)  
Adoption decision: Approved — Product Owner, 2026-11-06; integration pending review and merge of this change.

## Required reading order

1. This entry point and `docs/engineering/ENGINEERING-PROFILE.md`.
2. The pinned standard and, for Claude Code, `CLAUDE-CODE-OPERATING-GUIDE.md` at the pinned standard repository revision.
3. Applicable product requirements and design baseline in `docs/sprint-1a/final-baseline/`.
4. Relevant change requests, sprint records, and API contracts under `docs/`.
5. The assigned task, its approval, and the latest verified branch, commit, PR and checkpoint evidence.

The standard repository is private. A contributor without access to the exact pinned content must request authorized access or a verified copy; it must not infer missing rules from this entry point. A newer standard revision does not automatically update this project's pin.

## Decision authority and permissions

- Product Owner: product scope, material changes, cost commitments, integration and production release decisions.
- Technical coordinator: task planning, consistency, dependency and evidence tracking; no implicit merge or release authority.
- Implementer: changes and verification within the specifically approved task.
- Independent reviewer: risk-based assessment; approval is not authorization to merge.

This adoption task authorizes documentation changes on a separate branch and a Draft PR into `develop`. It does not authorize merges, production changes, dependency changes, business-logic changes, or publication of other pending work. Future branch, commit, push and PR actions require the relevant task authorization. Merges and deployments require separate explicit authorization.

## Project records and workflow

- Engineering profile and project-specific verification: `docs/engineering/ENGINEERING-PROFILE.md`.
- Current integration checkpoint: `docs/engineering/STATUS.md` (verify against live GitHub before relying on it).
- Requirements and architecture: `docs/sprint-1a/final-baseline/`; proposed or review artifacts are not automatically approved.
- Authentication implementation and review: `docs/sprint-1b/`, `docs/sprint-1c/` where present.
- API contracts: `docs/api/` and the applicable final baseline.
- CI: `.github/workflows/frontend-ci.yml` and `.github/workflows/backend-ci.yml`.
- Decisions and change requests: `docs/decisions/`, `docs/change-requests/` and task-specific records.

Before editing, verify the actual repository state, affected requirements, approval boundaries and available execution environment. Record verification with commands, source revision, environment and results; distinguish reported results from independently reproduced evidence. Do not copy conversation transcripts, personal communication preferences, credentials or private chat links into repository records.

## Release safeguards

The Vercel production branch is `master`. A custom ignored-build configuration for non-`master` branches was reported saved by the Product Owner; its effectiveness remains subject to an evidence-backed verification. Skipped preview deployment records are permitted; successful suppression of preview application builds is not yet independently established. Do not treat this statement as authorization to deploy.

Active PRs, worktrees, branches and deployment assignments must be rechecked before changes. Unresolved blocker/major review findings, unverified integration behavior and incomplete release evidence prevent a release absent an explicit documented exception.
