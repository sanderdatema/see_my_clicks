// ── Session visibility ──────────────────────────────────────────

function toggleSessionVisibility(sessionId) {
  if (hiddenSessions[sessionId]) {
    delete hiddenSessions[sessionId];
  } else {
    hiddenSessions[sessionId] = true;
  }
  syncMarkersForCurrentRoute();
  if (panelOpen) refreshPanel();
}
