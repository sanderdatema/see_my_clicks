// ── Color picker ─────────────────────────────────────────────────

function closeColorPicker() {
  if (colorPickerEl) {
    colorPickerEl.remove();
    colorPickerEl = null;
    colorPickerSessionId = null;
    document.removeEventListener("click", closeColorPickerOutside);
  }
}

function closeColorPickerOutside(e) {
  if (colorPickerEl && !colorPickerEl.contains(e.target)) {
    closeColorPicker();
  }
}

function showColorPicker(sessionId, currentColor, anchorEl) {
  closeColorPicker();
  colorPickerSessionId = sessionId;

  var picker = document.createElement("div");
  picker.id = "__smc-color-picker";
  picker.style.cssText =
    "position:fixed;background:#1e1e2e;border:1px solid #45475a;border-radius:8px;" +
    "padding:6px;z-index:1000001;display:flex;gap:4px;" +
    "box-shadow:0 4px 12px rgba(0,0,0,.4);";

  for (var i = 0; i < SESSION_COLORS.length; i++) {
    (function (color) {
      var isActive = color === currentColor;
      var swatch = document.createElement("div");
      swatch.style.cssText =
        "width:18px;height:18px;border-radius:50%;cursor:pointer;" +
        "border:2px solid " +
        (isActive ? "#fff" : "transparent") +
        ";transition:transform .1s ease;";
      swatch.style.background = color;
      swatch.addEventListener("click", function (e) {
        e.stopPropagation();
        updateSessionColor(colorPickerSessionId, color);
        closeColorPicker();
      });
      swatch.addEventListener("mouseenter", function () {
        swatch.style.transform = "scale(1.2)";
      });
      swatch.addEventListener("mouseleave", function () {
        swatch.style.transform = "";
      });
      picker.appendChild(swatch);
    })(SESSION_COLORS[i]);
  }

  var rect = anchorEl.getBoundingClientRect();
  picker.style.left = rect.left + "px";
  picker.style.top = rect.bottom + 4 + "px";

  document.body.appendChild(picker);
  colorPickerEl = picker;

  setTimeout(function () {
    document.addEventListener("click", closeColorPickerOutside);
  }, 0);
}

function updateSessionColor(sessionId, color) {
  // Optimistic: update local state and DOM immediately
  for (var i = 0; i < allClickData.length; i++) {
    if (allClickData[i].sessionId === sessionId) {
      allClickData[i].sessionColor = color;
    }
  }
  var ids = Object.keys(markers);
  for (var i = 0; i < ids.length; i++) {
    var m = markers[ids[i]];
    if (m.data && m.data.sessionId === sessionId) {
      m.el.style.background = color;
      m.color = color;
    }
  }
  if (panelOpen) refreshPanel();

  // Persist to server
  fetch("/__see-my-clicks", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "update-color",
      sessionId: sessionId,
      color: color,
    }),
  }).catch(function (err) {
    console.error("[see-my-clicks] color update error:", err);
  });
}
