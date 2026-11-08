# CommerceFlow — Claude Code notes

Start with [AGENTS.md](AGENTS.md); it is the authoritative entry point for reading order, permissions and project rules. Do not duplicate its content here.

Frequently used commands (full list in [docs/WORKFLOW.md](docs/WORKFLOW.md#verification-commands)):

```bash
npm run dev          # Vite dev server on :3000, proxies /api/v1 to :8080
npm run typecheck && npm run lint && npm test && npm run build
```

Before ending substantial work, update [docs/STATUS.md](docs/STATUS.md) with the branch, revision, verification evidence, blockers and next action.
