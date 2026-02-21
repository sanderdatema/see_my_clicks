# see-my-clicks

Vite plugin that lets you **Alt+Click** any element in the browser to capture its info for your AI coding assistant.

Click elements, optionally add a comment describing what's wrong, then tell your AI to "check my clicks".

Works with **Claude Code**, **Codex CLI**, **Cursor**, **Windsurf**, and **GitHub Copilot**.

## Install

```bash
npm install -D see-my-clicks
```

## Setup

**1. Add the plugin to your Vite config:**

```js
// vite.config.js
import { seeMyClicks } from 'see-my-clicks'

export default defineConfig({
  plugins: [seeMyClicks()]
})
```

**2. Install the instruction file for your AI tool:**

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

**3. (Optional) Choose what happens with your clicks:**

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

**4. Use it:**

- Run your dev server
- **Alt+Click** any element in the browser — a comment modal appears
- Add an optional comment describing what should change, or press Esc to skip
- **Shift+Alt+Click** to clear previous clicks and start fresh
- Tell your AI to "check my clicks" (or run `/clicked` in Claude Code)

## How it works

- The plugin injects a small script into your page during development (`apply: "serve"`)
- Alt+Click captures the element's tag, selector, text, bounding box, attributes, and framework component info
- Clicks are saved to `.see-my-clicks/clicked.json` via a local dev server endpoint
- Your AI reads that file from disk and clears it after processing

## Framework detection

The plugin automatically detects components from:

- **Svelte** — via `__svelte_meta` (dev mode) and `svelte-*` class hashes
- **React** — via `__reactFiber$` fiber tree walk (finds nearest named component)
- **Vue 2/3** — via `__vue__` / `__vueParentComponent`

Component name and source file are included in the capture when available.

## Options

```js
seeMyClicks({
  maxEntries: 10,                              // max clicks kept (default: 10)
  expiryMinutes: 60,                           // auto-expire after N minutes (default: 60)
  outputFile: '.see-my-clicks/clicked.json',   // output path relative to cwd
})
```

## Keyboard shortcuts

| Action | Shortcut |
|---|---|
| Capture element | **Alt+Click** |
| Clear previous & capture | **Shift+Alt+Click** |
| Save comment | **Enter** |
| Skip comment | **Esc** |
| Multiline comment | **Shift+Enter** |

## License

MIT
