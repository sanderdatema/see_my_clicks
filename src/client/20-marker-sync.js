// ── Marker sync ────────────────────────────────────────────────────

function isTargetVisible(el) {
  if (!document.body.contains(el)) return false;
  var rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  var style = window.getComputedStyle(el);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0"
  )
    return false;
  return true;
}

function syncMarkersForCurrentRoute() {
  for (var i = 0; i < allClickData.length; i++) {
    var cd = allClickData[i];
    var existing = markers[cd.clickId];
    var onThisRoute = routeMatches(cd.data.url);
    var isHidden = cd.sessionId && hiddenSessions[cd.sessionId];

    if (existing) {
      if (
        isHidden ||
        !onThisRoute ||
        !isTargetVisible(existing.target) ||
        !verifyElement(existing.target, cd.data)
      ) {
        existing.el.remove();
        delete markers[cd.clickId];
      }
    } else if (onThisRoute && !isHidden) {
      addMarker(cd.data, cd.sessionColor, cd.index, cd.seen);
    }
  }
}

function scheduleSyncMarkers() {
  if (syncScheduled) return;
  syncScheduled = true;
  setTimeout(function () {
    syncScheduled = false;
    syncMarkersForCurrentRoute();
  }, 200);
}
