// ── Navigation detection ───────────────────────────────────────────

function onNavigate() {
  removeAllMarkers();
  setTimeout(syncMarkersForCurrentRoute, 100);
}

var origPushState = history.pushState;
history.pushState = function () {
  origPushState.apply(this, arguments);
  onNavigate();
};

var origReplaceState = history.replaceState;
history.replaceState = function () {
  origReplaceState.apply(this, arguments);
  onNavigate();
};

window.addEventListener("popstate", onNavigate);
window.addEventListener("hashchange", onNavigate);
