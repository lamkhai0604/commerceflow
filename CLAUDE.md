# CommerceFlow — Claude Code notes

Start with [AGENTS.md](AGENTS.md); it is the authoritative entry point for reading order, permissions and project rules. Do not duplicate its content here.

Frequently used commands (full list in [docs/WORKFLOW.md](docs/WORKFLOW.md#verification-commands)):

```bash
cd frontend && npm run dev            # Vite dev server on :3000, proxies /api/v1 to :8080
cd frontend && npm run typecheck && npm run lint && npm test && npm run build
cd backend && ./mvnw verify           # PostgreSQL suites need Docker
cd e2e && npm run typecheck && npm run lint && npm run test:infra
```

Before ending substantial work, update [docs/STATUS.md](docs/STATUS.md) with the branch, revision, verification evidence, blockers and next action.
