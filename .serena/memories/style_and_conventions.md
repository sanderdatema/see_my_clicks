# Style and Conventions

## Language
- Plain JavaScript (ES modules for Node.js, IIFE for browser)
- No TypeScript
- No build step or transpilation

## Code Style
- Uses Prettier (auto-formats on save/edit)
- 2-space indentation
- Trailing commas
- Double quotes for strings (Prettier default)
- `var` declarations in client-source.js (browser IIFE, avoiding let/const for broad compat)
- `const`/`let` in Node.js files (src/server.js, src/plugin.js, etc.)

## Naming
- camelCase for functions and variables
- Section headers in client-source.js: `// ── Section Name ──────`
- SMC prefix for DOM element IDs: `__smc-*`
- CSS class for markers: `__smc-marker`

## Patterns
- client-source.js is one large IIFE with clearly labeled sections
- No external dependencies in the browser client
- Express-style middleware pattern for server.js
- Vite plugin pattern for plugin.js

## Package
- `"type": "module"` in package.json
- Exports via `"exports"` and `"main"` fields
- Binary via `"bin"` field for CLI mode
