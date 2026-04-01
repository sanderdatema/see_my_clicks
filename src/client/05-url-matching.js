// ── URL matching ─────────────────────────────────────────────────

function getRoute() {
  return window.location.pathname + window.location.hash;
}

function routeMatches(storedUrl) {
  try {
    var parsed = new URL(storedUrl);
    return parsed.pathname + parsed.hash === getRoute();
  } catch (_e) {
    return false;
  }
}
