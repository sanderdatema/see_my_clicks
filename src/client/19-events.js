// ── Event listeners ──────────────────────────────────────────────

document.addEventListener(
  "mousedown",
  function (e) {
    // Prevent browser-native modifier+Click behaviors (Firefox Alt+Click download, Linux WM drag)
    if (
      isModifierHeld(e) &&
      !isSmcElement(e.target) &&
      !isModalOpen() &&
      !isSessionPromptOpen()
    ) {
      e.preventDefault();
    }
    if (!isModalOpen() || !modal) return;
    modal.__smcMouseDownInside = modal.contains(e.target);
  },
  true
);

document.addEventListener(
  "click",
  function (e) {
    // Handle clicks while modal is open
    var startedInsideModal = modal && modal.__smcMouseDownInside;
    if (modal) modal.__smcMouseDownInside = false;

    if (isModalOpen()) {
      if (modal && !modal.contains(e.target)) {
        // Ignore outside clicks created by drags/resizes that started inside.
        if (startedInsideModal) return;
        cancelModal();
        if (!isModifierHeld(e)) return;
      } else {
        return;
      }
    }

    // Ignore clicks while session prompt is open
    if (isSessionPromptOpen()) return;

    if (!isModifierHeld(e)) return;
    if (isSmcElement(e.target)) return;

    e.preventDefault();
    e.stopPropagation();

    var data = captureElement(e.target);

    // Check if "New Session" was triggered from the panel
    if (forceNewSession) {
      pendingNewSession = true;
      pendingSessionName = forceSessionName;
      forceNewSession = false;
      forceSessionName = null;
    } else {
      pendingNewSession = false;
      pendingSessionName = null;
    }

    showModal(data, e.clientX, e.clientY);
  },
  true
);

// Mousemove with RAF throttle — store latest event to avoid stale closure
document.addEventListener("mousemove", function (e) {
  latestMouseEvent = e;
  if (rafId) return;
  rafId = requestAnimationFrame(function () {
    rafId = null;
    var ev = latestMouseEvent;
    if (!ev || !isModifierHeld(ev) || isModalOpen() || isSessionPromptOpen()) {
      highlight.style.display = "none";
      tooltip.style.display = "none";
      return;
    }
    var t = document.elementFromPoint(ev.clientX, ev.clientY);
    if (t && !isSmcElement(t)) {
      var r = t.getBoundingClientRect();
      highlight.style.display = "block";
      highlight.style.left = r.left + "px";
      highlight.style.top = r.top + "px";
      highlight.style.width = r.width + "px";
      highlight.style.height = r.height + "px";

      // Tooltip with tag name + component
      var tagLabel = "<" + t.tagName.toLowerCase() + ">";
      var comp = getFrameworkComponentFromChain(t);
      tooltip.textContent = comp ? tagLabel + " " + comp.name : tagLabel;
      tooltip.style.display = "block";
      tooltip.style.left = r.left + "px";
      tooltip.style.top = Math.max(0, r.top - 22) + "px";
    } else {
      highlight.style.display = "none";
      tooltip.style.display = "none";
    }
  });
});

document.addEventListener("keyup", function (e) {
  if (isModifierKey(e.key)) {
    highlight.style.display = "none";
    tooltip.style.display = "none";
  }
});

// Undo: Ctrl+Alt+Z / Cmd+Alt+Z (uses Alt regardless of modifier setting)
document.addEventListener("keydown", function (e) {
  if (
    e.altKey &&
    (e.ctrlKey || e.metaKey) &&
    (e.key === "z" || e.key === "Z")
  ) {
    e.preventDefault();
    if (!lastClickId) {
      flash("Nothing to undo");
      return;
    }
    var id = lastClickId;
    lastClickId = null;
    deleteClick(id);
    flash("Undid last click");
  }
});
