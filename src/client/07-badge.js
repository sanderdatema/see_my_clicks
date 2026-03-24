// ── Badge ────────────────────────────────────────────────────────

function updateBadge() {
  var count = countUnread();
  badge.style.display = "flex";
  badge.setAttribute(
    "aria-label",
    "See my clicks: " + count + " unread capture" + (count !== 1 ? "s" : "")
  );
  if (count > 0) {
    badge.textContent = count > 99 ? "99+" : String(count);
  } else {
    badge.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">' +
      '<path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 4.702z"/>' +
      "</svg>";
  }
}

function togglePanel(e) {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  panelOpen = !panelOpen;
  if (panelOpen) {
    refreshPanel();
    panel.style.display = "block";
  } else {
    panel.style.display = "none";
  }
}

badge.addEventListener("click", togglePanel, true);
badge.addEventListener(
  "keydown",
  function (e) {
    if (e.key === "Enter" || e.key === " ") togglePanel(e);
  },
  true
);

document.addEventListener("click", function (e) {
  if (panelOpen && !panel.contains(e.target) && e.target !== badge) {
    panelOpen = false;
    panel.style.display = "none";
  }
});
