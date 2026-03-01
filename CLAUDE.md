# see-my-clicks

Vanilla JS Vite plugin (no TypeScript, no bundler, no linter). Alt+Click captures element info and writes it to a JSON file for AI coding assistants.

**Architecture**: `plugin.js` registers the Vite plugin → injects `client.js` which loads `client-source.js` (51KB overlay UI with badge, panel, modal, markers, tooltip) → captured clicks POST to `server.js` → atomic writes to `.see-my-clicks/clicked.json`. The `instructions/` directory contains AI-tool-specific prompt templates.

**Stack**: npm, Playwright for tests (`npm test`), GitHub Actions for CI/publish.

## Plane Rules
- Taakbeheer gaat via Plane. Gebruik altijd de `mcp__plane__*` MCP tools.
- project_id: `08b0faf5-8100-4b7d-af90-202c03be24dc`
- State UUIDs — Todo: `33c80f13-a9f4-4894-99db-1a42182f616f` | In Progress: `e4173354-3d4e-44b4-ab13-1e02ff1533b6` | Done: `066938ef-b1e5-439f-ab9f-0cb4a9c333a8`
- Volgende taak: `mcp__plane__list_work_items` → filter op Todo/In Progress → sorteer op priority (urgent→high→medium→low).
- Taak starten: `mcp__plane__update_work_item(issue_id=..., state="e4173354-3d4e-44b4-ab13-1e02ff1533b6")`.
- Taak afronden: `mcp__plane__update_work_item(issue_id=..., state="066938ef-b1e5-439f-ab9f-0cb4a9c333a8")`.
- Nieuwe taak: `mcp__plane__create_work_item(project_id="08b0faf5-8100-4b7d-af90-202c03be24dc", name=..., priority=..., state="33c80f13-a9f4-4894-99db-1a42182f616f")`.
- Nooit `task-master` CLI aanroepen — dat is verwijderd.

# Publishing

Use `/release` for the full publishing workflow. Key rules:

- **Do not push or publish unless the user explicitly asks.**
- Alpha versioning during development: `-alpha.N` suffix, increment on each push.
- Semver: patch = bug fixes, minor = new features/UI, major = breaking API changes.
- GitHub Actions handles publish (`.github/workflows/publish.yml`): push to `main` = alpha, `v*` tag = stable.
- npm Trusted Publishing (OIDC) — no secrets needed.
