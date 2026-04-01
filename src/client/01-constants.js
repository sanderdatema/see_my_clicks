// ── Theme colors (Catppuccin Mocha) ─────────────────────────────
// Named references for the color palette used throughout the overlay UI.
// Most colors are embedded in cssText strings and cannot reference vars
// in ES5, so these serve as the canonical palette declaration and are
// used in standalone style assignments where possible.
var SMC_PURPLE = "#8b5cf6";
var SMC_BG = "#1e1e2e";
var SMC_TEXT = "#cdd6f4";
var SMC_SUBTEXT = "#6c7086";
var SMC_SURFACE = "#313244";
var SMC_BORDER = "#45475a";
var SMC_RED = "#f38ba8";

// ── Modifier key ─────────────────────────────────────────────────

var MODIFIER = window.__smcModifier || "alt";
var MODIFIER_LABEL =
  MODIFIER === "alt"
    ? "Alt"
    : MODIFIER === "ctrl"
      ? "Ctrl"
      : MODIFIER === "meta"
        ? "Cmd"
        : "Alt";

function isModifierHeld(e) {
  if (MODIFIER === "ctrl") return e.ctrlKey;
  if (MODIFIER === "meta") return e.metaKey;
  return e.altKey;
}

function isModifierKey(key) {
  if (MODIFIER === "ctrl") return key === "Control";
  if (MODIFIER === "meta") return key === "Meta";
  return key === "Alt";
}

// ── Z-index stacking order ──────────────────────────────────────
var Z_MARKERS = 999997;
var Z_HIGHLIGHT = 999998;
var Z_BASE = 999999;
var Z_MODAL = 1000000;
var Z_PICKER = 1000001;

// Keep in sync with COLOR_PALETTE in src/server.js
// Enforced by tests/static/color-palette-sync.spec.mjs
var SESSION_COLORS = [
  "#8b5cf6",
  "#f38ba8",
  "#fab387",
  "#f9e2af",
  "#a6e3a1",
  "#89dceb",
  "#74c7ec",
  "#cba6f7",
];
