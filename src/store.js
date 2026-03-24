import fs from "fs";
import path from "path";

// Keep in sync with SESSION_COLORS in src/client-source.js
// Enforced by tests/static/color-palette-sync.spec.mjs
export const COLOR_PALETTE = [
  "#8b5cf6",
  "#f38ba8",
  "#fab387",
  "#f9e2af",
  "#a6e3a1",
  "#89dceb",
  "#74c7ec",
  "#cba6f7",
];

export const DEFAULTS = {
  outputFile: ".see-my-clicks/clicked.json",
};

const MAX_TOTAL_CLICKS_SOFT = 500;

export function resolveOptions(opts = {}) {
  return { ...DEFAULTS, ...opts };
}

// Generates session IDs. Independent from click ID generation in src/client-source.js.
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function ensureOutputFile(outputFile) {
  const dir = path.dirname(outputFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(outputFile)) {
    fs.writeFileSync(outputFile, JSON.stringify({ sessions: [] }));
  }
}

export function writeData(outputFile, data) {
  const tmp = `${outputFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, outputFile);
}

export function readData(outputFile) {
  if (!fs.existsSync(outputFile)) return { sessions: [] };
  try {
    const raw = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
    // Migration: old flat array format → wrap in a session
    if (Array.isArray(raw)) {
      if (raw.length === 0) return { sessions: [] };
      return {
        sessions: [
          {
            id: generateId(),
            name: "Migrated Session",
            startedAt: raw[0]?.timestamp || new Date().toISOString(),
            clicks: raw,
          },
        ],
      };
    }
    const data = raw && raw.sessions ? raw : { sessions: [] };
    const total = countTotalClicks(data);
    if (total > MAX_TOTAL_CLICKS_SOFT) {
      console.warn(
        `[see-my-clicks] Store has ${total} clicks across ${data.sessions.length} sessions. ` +
          `Consider running "npx see-my-clicks purge" to reset.`
      );
    }
    return data;
  } catch (err) {
    console.warn(
      "[see-my-clicks] Failed to read data file:",
      err.message,
      "— starting fresh"
    );
    // Preserve corrupt file for manual recovery
    try {
      const backupPath = outputFile + ".corrupt." + Date.now();
      fs.copyFileSync(outputFile, backupPath);
      console.warn("[see-my-clicks] Corrupt file backed up to:", backupPath);
    } catch (_backupErr) {
      // Best-effort backup; if it fails, continue with fresh store
    }
    return { sessions: [] };
  }
}

export function countTotalClicks(store) {
  let total = 0;
  for (const session of store.sessions) {
    total += session.clicks.length;
  }
  return total;
}

export function validateClickData(data) {
  if (!data || typeof data !== "object") return false;
  if (!data.clickId || typeof data.clickId !== "string") return false;
  if (!data.tagName || typeof data.tagName !== "string") return false;
  return true;
}
