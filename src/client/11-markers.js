// ── Markers ──────────────────────────────────────────────────────

function verifyElement(el, data) {
  // If we have stored textContent, verify the candidate matches.
  // This prevents false positives when a selector matches a different
  // element on a different sub-view (same URL, different DOM content).
  if (!data.textContent) return true;
  var current = truncateText(el.innerText || el.textContent || "", 100);
  if (!current) return true;
  return current === data.textContent;
}

function findElement(data) {
  // Try full selector first
  try {
    var el = document.querySelector(data.selector);
    if (el && verifyElement(el, data)) return el;
  } catch (_e) {}

  // Fallback: selector without framework hash classes (Svelte/SvelteKit)
  if (data.selector) {
    try {
      var loose = stripHashClasses(data.selector);
      if (loose !== data.selector) {
        var looseEl = document.querySelector(loose);
        if (looseEl && verifyElement(looseEl, data)) return looseEl;
      }
    } catch (_e) {}
  }

  // Fallback: match by data-* attributes
  if (data.attributes) {
    var dataAttrs = Object.keys(data.attributes).filter(function (k) {
      return k.startsWith("data-") && k !== "data-component";
    });
    for (var i = 0; i < dataAttrs.length; i++) {
      var attr = dataAttrs[i];
      var val = data.attributes[attr];
      try {
        var found = document.querySelector(
          data.tagName + "[" + attr + "=" + JSON.stringify(val) + "]"
        );
        if (found && verifyElement(found, data)) return found;
      } catch (_e) {}
    }
  }

  // Fallback: match by ID
  if (data.elementId) {
    try {
      var byId = document.getElementById(data.elementId);
      if (byId && verifyElement(byId, data)) return byId;
    } catch (_e) {}
  }

  // Fallback: match by component file + tag name + text content
  if (
    data.component &&
    data.component.file &&
    data.component.file !== "Unknown"
  ) {
    var candidates = document.querySelectorAll(data.tagName);
    for (var i = 0; i < candidates.length; i++) {
      var comp = getFrameworkComponentFromChain(candidates[i]);
      if (
        comp &&
        comp.file === data.component.file &&
        verifyElement(candidates[i], data)
      ) {
        return candidates[i];
      }
    }
  }

  return null;
}

function addMarker(data, color, number, seen) {
  var markerColor = color || SMC_PURPLE;
  var displayNumber = number || ++markerNumber;
  var target = findElement(data);
  if (!target) return false;

  var rect = target.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  var dot = document.createElement("div");
  dot.className = "__smc-marker";
  dot.setAttribute("data-click-id", data.clickId);
  dot.setAttribute("role", "button");
  dot.setAttribute("tabindex", "0");
  dot.setAttribute(
    "aria-label",
    "Capture " +
      displayNumber +
      ": <" +
      data.tagName +
      ">" +
      (data.comment ? " — " + data.comment : "") +
      " — click to edit"
  );
  var baseOpacity = seen ? "0.4" : "0.7";
  var hoverOpacity = seen ? "0.7" : "1";
  dot.style.cssText =
    "position:fixed;width:20px;height:20px;border-radius:50%;background:" +
    markerColor +
    ";color:#fff;" +
    "font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;" +
    "font-family:system-ui,sans-serif;box-shadow:0 2px 6px rgba(0,0,0,.3);" +
    "outline:2px solid rgba(255,255,255,0.5);outline-offset:-2px;" +
    "pointer-events:auto;cursor:pointer;opacity:" +
    baseOpacity +
    ";transition:opacity .15s ease;" +
    (seen ? "filter:grayscale(0.4);" : "");
  dot.textContent = String(displayNumber);
  dot.style.left = Math.round(rect.right - 10) + "px";
  dot.style.top = Math.round(rect.top - 10) + "px";

  dot.addEventListener(
    "click",
    function (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      showEditModal(data, e.clientX, e.clientY);
    },
    true
  );
  dot.addEventListener(
    "keydown",
    function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        var r = dot.getBoundingClientRect();
        showEditModal(data, r.left, r.bottom);
      }
    },
    true
  );
  dot.addEventListener("mouseenter", function () {
    dot.style.opacity = hoverOpacity;
  });
  dot.addEventListener("mouseleave", function () {
    dot.style.opacity = baseOpacity;
  });

  markerContainer.appendChild(dot);
  markers[data.clickId] = {
    el: dot,
    target: target,
    number: displayNumber,
    data: data,
    color: markerColor,
  };
  return true;
}

function removeMarker(clickId) {
  var m = markers[clickId];
  if (m) {
    m.el.remove();
    delete markers[clickId];
  }
}

function removeAllMarkers() {
  var ids = Object.keys(markers);
  for (var i = 0; i < ids.length; i++) {
    markers[ids[i]].el.remove();
    delete markers[ids[i]];
  }
}

function updateMarkerPositions() {
  if (updateMarkersRaf) return;
  updateMarkersRaf = requestAnimationFrame(function () {
    updateMarkersRaf = null;
    var ids = Object.keys(markers);
    for (var i = 0; i < ids.length; i++) {
      var m = markers[ids[i]];
      if (!document.body.contains(m.target)) {
        m.el.remove();
        delete markers[ids[i]];
        continue;
      }
      var rect = m.target.getBoundingClientRect();
      m.el.style.left = Math.round(rect.right - 10) + "px";
      m.el.style.top = Math.round(rect.top - 10) + "px";
    }
  });
}

window.addEventListener("scroll", updateMarkerPositions, true);
window.addEventListener("resize", updateMarkerPositions);
