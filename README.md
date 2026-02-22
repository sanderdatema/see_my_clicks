# see-my-clicks

**Alt+Click** any element in the browser to capture its info for your AI coding assistant.

Click elements, optionally add a comment describing what's wrong, then tell your AI to "check my clicks".

Works with **Claude Code**, **Codex CLI**, **Cursor**, **Windsurf**, and **GitHub Copilot**.

## Install

```bash
npm install -D see-my-clicks
```

## Setup

### Vite

**1. Add the plugin to your Vite config:**

```js
// vite.config.js
import { seeMyClicks } from 'see-my-clicks'

export default defineConfig({
  plugins: [seeMyClicks()]
})
```

### SvelteKit

SvelteKit bypasses Vite's `transformIndexHtml` hook, so the plugin can't inject the client script automatically. The CLI handles this — just run `npx see-my-clicks init` and it will patch `src/app.html` with the script tag.

If you prefer to do it manually, add to `src/app.html`:

```html
<script src="/__see-my-clicks/client.js"></script>
```

The Vite plugin is still needed for the middleware (`seeMyClicks()` in your Vite config).

### Universal (any dev server)

Works with Express, Webpack dev server, Next.js, or anything that supports connect-style middleware.

**1. Add the middleware to your dev server:**

```js
// Express
import express from 'express'
import { createMiddleware } from 'see-my-clicks'

const app = express()
app.use(createMiddleware())
```

```js
// Webpack devServer (webpack.config.js)
const { createMiddleware } = require('see-my-clicks')

module.exports = {
  devServer: {
    setupMiddlewares(middlewares, devServer) {
      devServer.app.use(createMiddleware())
      return middlewares
    }
  }
}
```

**2. Add the script tag to your HTML:**

```html
<script src="/__see-my-clicks/client.js"></script>
```

The middleware serves the client script automatically at this URL — no bundler plugin needed.

### AI tool instructions

**Install the instruction file for your AI tool:**

```bash
npx see-my-clicks init claude       # Claude Code
npx see-my-clicks init codex        # Codex CLI
npx see-my-clicks init cursor       # Cursor
npx see-my-clicks init windsurf     # Windsurf
npx see-my-clicks init copilot      # GitHub Copilot
npx see-my-clicks init all          # all of the above
```

You can also pass multiple: `npx see-my-clicks init claude cursor`

| Tool | What gets created |
|---|---|
| Claude Code | `.claude/commands/clicked.md` (slash command) |
| Codex CLI | Section appended to `AGENTS.md` |
| Cursor | `.cursor/rules/see-my-clicks.mdc` |
| Windsurf | Section appended to `.windsurfrules` |
| GitHub Copilot | Section appended to `.github/copilot-instructions.md` |

### (Optional) Choose what happens with your clicks

By default, your AI suggests code fixes. You can change this with `--action`:

```bash
npx see-my-clicks init claude --action=taskmaster
npx see-my-clicks init all --action=github-issues
```

| Action | What it does |
|---|---|
| `suggest-fixes` | Suggest code fixes based on clicks and comments (default) |
| `taskmaster` | Create Task Master tasks via MCP |
| `github-issues` | Create GitHub issues via `gh` CLI |
| `just-report` | Just show what was clicked, take no action |

You can also edit the generated instruction file directly — the action is in a clearly marked `<!-- action:start/end -->` section.

## Use it

- Run your dev server
- **Alt+Click** any element in the browser — a comment modal appears showing which element you clicked
- Add an optional comment describing what should change, or press Esc to skip
- **Shift+Alt+Click** to start a new named session (you'll be prompted for a name)
- A purple badge in the corner shows your capture count — click it to review, manage, or delete captures
- Tell your AI to "check my clicks" (or run `/clicked` in Claude Code)

## How it works

- A small script is injected into your page during development (via Vite plugin or script tag)
- **Hover with Alt held** to see a highlight with a tooltip showing the element tag and component name
- Alt+Click captures the element's tag, selector, text, bounding box, attributes, and framework component info
- Captured elements get numbered purple markers so you can see what you've annotated
- Clicks are saved to `.see-my-clicks/clicked.json` via a local dev server endpoint, grouped into sessions
- Your AI reads that file from disk and clears it after processing

## Sessions

Clicks are organized into **sessions** — named groups of related captures.

- Your first Alt+Click auto-creates a default session
- **Shift+Alt+Click** prompts you for a session name and starts a new one (e.g. "Header fixes", "Mobile layout")
- You can also start a new session from the review panel
- When your AI processes clicks, it sees them grouped by session, making it easier to understand context

## Framework detection

The plugin automatically detects components from:

- **Svelte** — via `__svelte_meta` (dev mode) and `svelte-*` class hashes
- **React** — via `__reactFiber$` fiber tree walk (finds nearest named component)
- **Vue 2/3** — via `__vue__` / `__vueParentComponent`

Component name and source file are included in the capture when available.

## Options

```js
seeMyClicks({
  maxEntries: 10,                              // max clicks per session (default: 10)
  expiryMinutes: 60,                           // auto-expire after N minutes (default: 60)
  outputFile: '.see-my-clicks/clicked.json',   // output path relative to cwd
})
```

## Keyboard shortcuts

| Action | Shortcut |
|---|---|
| Capture element | **Alt+Click** |
| New session + capture | **Shift+Alt+Click** |
| Save comment | **Enter** |
| Skip comment | **Esc** |
| Multiline comment | **Shift+Enter** |
| Undo last click | **Ctrl+Alt+Z** (Cmd+Alt+Z on Mac) |

## UI features

- **Highlight tooltip** — when hovering with Alt held, shows the element tag and component name
- **Click counter badge** — persistent purple badge showing capture count; click to expand the review panel
- **Review panel** — lists all captures grouped by session, with delete buttons for each item
- **Element markers** — numbered purple dots on captured elements so you can see what's been annotated; click a marker to edit its comment
- **Element info in modal** — the comment modal shows which element you clicked (tag, text, component)

## License

MIT
