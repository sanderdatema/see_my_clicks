// ── State: session ──────────────────────────────────────────────
var forceNewSession = false;
var forceSessionName = null;
var allClickData = [];
var hiddenSessions = {};
var lastRetrievedAt = null;

// ── State: markers ─────────────────────────────────────────────
var markers = {};
var markerNumber = 0;
var lastClickId = null;
var syncScheduled = false;
var updateMarkersRaf = null;

// ── State: UI ──────────────────────────────────────────────────
var flashTimer = null;
var panelOpen = false;
var rafId = null;
var latestMouseEvent = null;
var colorPickerEl = null;
var colorPickerSessionId = null;

// ── State: modal ───────────────────────────────────────────────
var modal = null;
var pendingClick = null;
var pendingNewSession = false;
var pendingSessionName = null;
var previousFocus = null;
var sessionPrompt = null;
