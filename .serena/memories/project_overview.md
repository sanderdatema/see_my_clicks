# See My Clicks

## Purpose
A developer tool that lets you Alt+Click any element in the browser during development to capture its info (selector, component, text, bounding box) for AI coding assistants. Supports Vite plugin, Express middleware, and standalone proxy modes.

## Tech Stack
- **Language**: JavaScript (ES modules, no TypeScript)
- **Runtime**: Node.js
- **Build**: None — plain JS, no compilation step
- **Package manager**: npm
- **Target**: Browser (client-source.js injected as IIFE) + Node.js (server, plugin)
- **Frameworks supported**: Svelte, React, Vue (detection only — the tool itself is framework-agnostic)
- **CI/CD**: GitHub Actions (`.github/workflows/publish.yml`) with npm OIDC trusted publishing

## Codebase Structure
```
src/
  client-source.js  — Browser IIFE injected into pages (markers, capture, modal, navigation detection)
  client.js         — Loader that fetches and evals client-source.js
  server.js         — Express middleware for the /__see-my-clicks API endpoint
  plugin.js         — Vite plugin that injects the client script
  index.js          — Main entry point, exports plugin + middleware
bin/
  cli.js            — Standalone CLI proxy mode
instructions/       — AI assistant instructions (claude, cursor, copilot, windsurf, codex)
.github/workflows/  — CI/CD for npm publishing
```

## Key Architecture
- `client-source.js` is a self-contained IIFE with no dependencies
- Uses hybrid URL + DOM approach for SPA marker sync (pathname+hash matching as primary gate, MutationObserver for same-URL sub-view changes)
- Navigation detection intercepts pushState, replaceState, popstate, hashchange
- Data stored in `.see-my-clicks/clicked.json` via the server endpoint
