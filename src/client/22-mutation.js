// ── MutationObserver ───────────────────────────────────────────────

var observer = new MutationObserver(function (mutations) {
  for (var i = 0; i < mutations.length; i++) {
    var target = mutations[i].target;
    if (!isSmcElement(target)) {
      scheduleSyncMarkers();
      return;
    }
  }
});
observer.observe(document.body, {
  childList: true,
  subtree: true,
});
