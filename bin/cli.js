#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INSTRUCTIONS_DIR = path.resolve(__dirname, "..", "instructions");

const START_MARKER = "<!-- see-my-clicks:start -->";
const END_MARKER = "<!-- see-my-clicks:end -->";
const ACTION_START = "<!-- action:start -->";
const ACTION_END = "<!-- action:end -->";

// ── Action presets ──────────────────────────────────────────────────

const ACTIONS = {
  "suggest-fixes": `4. If comments are present, suggest concrete fixes based on the component, selector, and comment. Group related clicks (same component, same page, same concern) together. Respect session boundaries — each session is a separate batch of feedback.

5. If no comments are present on any click, present the element info and ask the user what they'd like to do with it.`,

  taskmaster: `4. For each captured click that has a comment, create a Task Master task using the add_task MCP tool. Include in the task description:
   - The element selector and tag
   - The component name and source file (if detected)
   - The page URL
   - The user's comment verbatim
   Group related clicks (same component, same page, same concern) into a single task. Respect session boundaries — each session is a separate batch of feedback.

5. If no comments are present on any click, present the element info and ask the user what they'd like to do with it.`,

  "github-issues": `4. For each captured click that has a comment, create a GitHub issue using \`gh issue create\`. Set the title from the comment and include in the body:
   - The element selector and tag
   - The component name and source file (if detected)
   - The page URL
   - The user's comment verbatim
   Group related clicks into a single issue where it makes sense. Respect session boundaries — each session is a separate batch of feedback.

5. If no comments are present on any click, present the element info and ask the user what they'd like to do with it.`,

  "just-report": `4. Present all captured click information clearly, grouped by session. Do not take any action — just report what was clicked and any comments the user left.`,
};

// ── Tool definitions ────────────────────────────────────────────────

const TOOLS = {
  claude: {
    label: "Claude Code",
    src: "claude.md",
    dest: ".claude/commands/clicked.md",
    mode: "copy",
  },
  codex: {
    label: "Codex CLI",
    src: "codex.md",
    dest: "AGENTS.md",
    mode: "append",
  },
  cursor: {
    label: "Cursor",
    src: "cursor.md",
    dest: ".cursor/rules/see-my-clicks.mdc",
    mode: "copy",
  },
  windsurf: {
    label: "Windsurf",
    src: "windsurf.md",
    dest: ".windsurfrules",
    mode: "append",
  },
  copilot: {
    label: "GitHub Copilot",
    src: "copilot.md",
    dest: ".github/copilot-instructions.md",
    mode: "append",
  },
};

// ── Helpers ─────────────────────────────────────────────────────────

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readTemplate(tool, actionKey) {
  const src = path.join(INSTRUCTIONS_DIR, tool.src);
  let content = fs.readFileSync(src, "utf-8");

  if (actionKey && ACTIONS[actionKey]) {
    const re = new RegExp(
      `${escapeRegex(ACTION_START)}[\\s\\S]*?${escapeRegex(ACTION_END)}`,
    );
    content = content.replace(
      re,
      `${ACTION_START}\n${ACTIONS[actionKey]}\n${ACTION_END}`,
    );
  }

  return content;
}

function installCopy(tool, actionKey) {
  const dest = path.resolve(process.cwd(), tool.dest);
  const destDir = path.dirname(dest);

  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  if (fs.existsSync(dest)) {
    const existing = fs.readFileSync(dest, "utf-8");
    if (existing.includes(ACTION_START)) {
      // Update just the action section in an existing file
      const re = new RegExp(
        `${escapeRegex(ACTION_START)}[\\s\\S]*?${escapeRegex(ACTION_END)}`,
      );
      const content = readTemplate(tool, actionKey);
      const actionMatch = content.match(re);
      if (actionMatch) {
        fs.writeFileSync(dest, existing.replace(re, actionMatch[0]));
        console.log(`  Updated action in ${tool.dest}`);
        return;
      }
    }
    console.log(`  ${tool.dest} already exists, skipping.`);
    return;
  }

  fs.writeFileSync(dest, readTemplate(tool, actionKey));
  console.log(`  Created ${tool.dest}`);
}

function installAppend(tool, actionKey) {
  const content = readTemplate(tool, actionKey);
  const dest = path.resolve(process.cwd(), tool.dest);
  const destDir = path.dirname(dest);

  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  if (fs.existsSync(dest)) {
    const existing = fs.readFileSync(dest, "utf-8");
    if (existing.includes(START_MARKER)) {
      const re = new RegExp(
        `${escapeRegex(START_MARKER)}[\\s\\S]*?${escapeRegex(END_MARKER)}`,
      );
      fs.writeFileSync(dest, existing.replace(re, content.trim()));
      console.log(`  Updated see-my-clicks section in ${tool.dest}`);
      return;
    }
    fs.appendFileSync(dest, "\n\n" + content.trim() + "\n");
    console.log(`  Appended to ${tool.dest}`);
  } else {
    fs.writeFileSync(dest, content.trim() + "\n");
    console.log(`  Created ${tool.dest}`);
  }
}

function install(key, actionKey) {
  const tool = TOOLS[key];
  if (tool.mode === "copy") installCopy(tool, actionKey);
  else installAppend(tool, actionKey);
}

// ── SSR framework patching ──────────────────────────────────────────

const SCRIPT_TAG = '<script src="/__see-my-clicks/client.js"></script>';
const SCRIPT_MARKER = "see-my-clicks/client.js";

function detectSSRFramework() {
  // Check cwd and common subdirectories for SvelteKit
  const candidates = [
    "package.json",
    "frontend/package.json",
    "client/package.json",
    "web/package.json",
    "app/package.json",
  ];
  for (const rel of candidates) {
    const pkgPath = path.resolve(process.cwd(), rel);
    if (!fs.existsSync(pkgPath)) continue;
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (allDeps["@sveltejs/kit"]) return "sveltekit";
    } catch (e) {}
  }
  return null;
}

function findAppHtml() {
  // Check cwd first, then common subdirectories
  const candidates = [
    "src/app.html",
    "frontend/src/app.html",
    "client/src/app.html",
    "web/src/app.html",
    "app/src/app.html",
  ];
  for (const rel of candidates) {
    const abs = path.resolve(process.cwd(), rel);
    if (fs.existsSync(abs)) return { abs, rel };
  }
  return null;
}

function patchSvelteKit() {
  const found = findAppHtml();
  if (!found) {
    console.warn(
      "  \u26a0 SvelteKit detected but src/app.html not found.\n" +
        "  Add this to your app.html manually:\n" +
        `  ${SCRIPT_TAG}`,
    );
    return;
  }
  const { abs, rel } = found;
  const html = fs.readFileSync(abs, "utf-8");
  if (html.includes(SCRIPT_MARKER)) {
    console.log(`  ${rel} already has the client script, skipping.`);
    return;
  }
  if (!html.includes("</body>")) {
    console.warn(
      `  \u26a0 ${rel} has no </body> tag — add the script tag manually:\n` +
        `  ${SCRIPT_TAG}`,
    );
    return;
  }
  const patched = html.replace("</body>", `  ${SCRIPT_TAG}\n</body>`);
  fs.writeFileSync(abs, patched);

  // Verify the write succeeded
  const verify = fs.readFileSync(abs, "utf-8");
  if (verify.includes(SCRIPT_MARKER)) {
    console.log(`  Patched ${rel} with client script tag (SvelteKit).`);
  } else {
    console.warn(
      `  \u26a0 Wrote to ${rel} but the script tag was not found after writing.\n` +
        `  Add it manually:\n` +
        `  ${SCRIPT_TAG}`,
    );
  }
}

// ── Main ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args[0] !== "init") {
  console.log(`see-my-clicks — Alt+Click elements to capture info for AI coding assistants

Usage:
  npx see-my-clicks init [tools...] [--action=<preset>]

Tools:
  claude      Claude Code (.claude/commands/clicked.md)
  codex       Codex CLI (appends to AGENTS.md)
  cursor      Cursor (.cursor/rules/see-my-clicks.mdc)
  windsurf    Windsurf (appends to .windsurfrules)
  copilot     GitHub Copilot (appends to .github/copilot-instructions.md)
  all         All of the above

Actions:
  --action=suggest-fixes    Suggest code fixes (default)
  --action=taskmaster       Create Task Master tasks
  --action=github-issues    Create GitHub issues
  --action=just-report      Just report clicks, no action

Examples:
  npx see-my-clicks init claude
  npx see-my-clicks init claude cursor --action=taskmaster
  npx see-my-clicks init all --action=github-issues

Setup:
  1. npm install -D see-my-clicks
  2. Add to vite.config:
     import { seeMyClicks } from 'see-my-clicks'
     export default defineConfig({ plugins: [seeMyClicks()] })
  3. npx see-my-clicks init claude   (or whichever tool you use)
  4. Alt+Click elements in the browser, then say "check my clicks"
`);
  process.exit(0);
}

// Parse --action flag
const actionArg = args.find((a) => a.startsWith("--action="));
const actionKey = actionArg ? actionArg.split("=")[1] : "suggest-fixes";
const toolArgs = args.slice(1).filter((a) => !a.startsWith("--"));

if (toolArgs.length === 0) {
  console.error(
    "Specify which tools to install for, e.g.: npx see-my-clicks init claude\n" +
      "Run `npx see-my-clicks` for the full list.",
  );
  process.exit(1);
}

if (!ACTIONS[actionKey]) {
  console.error(
    `Unknown action: ${actionKey}\n` +
      "Available: " +
      Object.keys(ACTIONS).join(", "),
  );
  process.exit(1);
}

const invalid = toolArgs.filter((t) => t !== "all" && !TOOLS[t]);
if (invalid.length) {
  console.error(`Unknown tool(s): ${invalid.join(", ")}\n`);
  console.error("Available: " + Object.keys(TOOLS).join(", ") + ", all");
  process.exit(1);
}

const keys = toolArgs.includes("all")
  ? Object.keys(TOOLS)
  : toolArgs.filter((t) => TOOLS[t]);

console.log(`Installing see-my-clicks instructions (action: ${actionKey}):\n`);
for (const key of keys) {
  install(key, actionKey);
}

// Auto-patch SSR frameworks that bypass transformIndexHtml
const framework = detectSSRFramework();
if (framework === "sveltekit") {
  console.log();
  patchSvelteKit();
}

console.log(
  '\nDone! Alt+Click elements in the browser, then say "check my clicks".',
);
