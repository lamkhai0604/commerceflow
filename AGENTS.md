# CommerceFlow — Contributor Entry Point

Project: CommerceFlow, an e-commerce web application (React storefront, Spring Boot API, PostgreSQL).
Engineering guidelines: the project follows internal engineering guidelines for AI-assisted development. Contributors obtain them from the Product Owner; they are not stored in this repository.
Product Owner and decision authority: lamkhai0604.

## Read before work

1. [Current status](docs/STATUS.md): active sprint, source revision, blockers and next action.
2. [Workflow and engineering profile](docs/WORKFLOW.md): branching, permissions, conventions and verification commands.
3. The active sprint plan, linked from the status page.
4. [Decision log](docs/DECISIONS.md) and the [documentation index](docs/README.md) for requirements, architecture and API contracts.
5. [Backend setup](backend/README.md) when working on the API.

Verify the actual repository state (branch, revision, uncommitted changes, open pull requests) before changing anything. Do not rely on chat history as the only record of unfinished work.

## Permissions

| Action | Authorization |
| --- | --- |
| Implementation within an approved sprint task | Allowed |
| Feature branches, commits, pushes and pull requests into `develop` | Allowed |
| Merge into `develop` | Product Owner |
| Merge `develop` into `master`, deployment, release | Product Owner only |
| Material product, interface, data-model, architecture or dependency changes | Product Owner approval, recorded in the decision log |
| Paid services | Not authorized; free tiers only |
| Destructive operations, production data, access changes | Not authorized without explicit scope and a recovery plan |

## Project rules

- Records are written in English, in a neutral professional style, and summarize outcomes and evidence rather than conversations.
- User-facing changes follow the feedback rules in [WORKFLOW.md](docs/WORKFLOW.md#user-facing-feedback) and are verified at 375 px width.
- Placeholder or demonstration data is labelled as such in the UI and in records.
- Approved exceptions: none.
