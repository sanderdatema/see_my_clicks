# see-my-clicks

Vanilla JS Vite plugin (no TypeScript, no bundler, no linter). Alt+Click captures element info and writes it to a JSON file for AI coding assistants.

**Architecture**: `plugin.js` registers the Vite plugin → injects `client.js` which loads `client-source.js` (51KB overlay UI with badge, panel, modal, markers, tooltip) → captured clicks POST to `server.js` → atomic writes to `.see-my-clicks/clicked.json`. The `instructions/` directory contains AI-tool-specific prompt templates.

**Stack**: npm, Playwright for tests (`npm test`), GitHub Actions for CI/publish.

# Publishing

Use `/release` for the full publishing workflow. Key rules:

- **Do not push or publish unless the user explicitly asks.**
- Alpha versioning during development: `-alpha.N` suffix, increment on each push.
- Semver: patch = bug fixes, minor = new features/UI, major = breaking API changes.
- GitHub Actions handles publish (`.github/workflows/publish.yml`): push to `main` = alpha, `v*` tag = stable.
- npm Trusted Publishing (OIDC) — no secrets needed.
