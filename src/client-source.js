(function () {
  if (window.__seeMyClicksInitialized) return;
  window.__seeMyClicksInitialized = true;

  // ── Helpers ──────────────────────────────────────────────────────

  function truncateText(text, max) {
    var t = (text || "").trim().replace(/\s+/g, " ");
    if (!t) return null;
    return t.length > max ? t.slice(0, max) + "..." : t;
  }

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function isSmcElement(el) {
    var cur = el;
    while (cur) {
      if (cur.id && cur.id.startsWith("__smc-")) return true;
      if (cur.classList && cur.classList.contains("__smc-marker")) return true;
      cur = cur.parentElement;
    }
    return false;
  }

  // ── DOM elements ─────────────────────────────────────────────────

  var overlay = document.createElement("div");
  overlay.id = "__smc-overlay";
  overlay.style.cssText =
    "position:fixed;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:999999;";
  document.body.appendChild(overlay);

  var highlight = document.createElement("div");
  highlight.id = "__smc-highlight";
  highlight.style.cssText =
    "position:fixed;border:2px solid #8b5cf6;background:rgba(139,92,246,0.1);" +
    "pointer-events:none;z-index:999998;transition:all .05s ease;display:none;";
  document.body.appendChild(highlight);

  var tooltip = document.createElement("div");
  tooltip.id = "__smc-tooltip";
  tooltip.style.cssText =
    "position:fixed;background:#1e1e2e;color:#cdd6f4;font-family:system-ui,sans-serif;" +
    "font-size:11px;padding:2px 6px;border-radius:4px;pointer-events:none;z-index:999999;" +
    "display:none;white-space:nowrap;border:1px solid #8b5cf6;";
  document.body.appendChild(tooltip);

  var status = document.createElement("div");
  status.id = "__smc-status";
  status.style.cssText =
    "position:fixed;bottom:68px;right:20px;background:#8b5cf6;color:#fff;" +
    "padding:8px 16px;border-radius:8px;font-family:system-ui,sans-serif;" +
    "font-size:14px;z-index:999999;box-shadow:0 4px 12px rgba(0,0,0,.2);display:none;" +
    "pointer-events:none;";
  document.body.appendChild(status);

  var badge = document.createElement("div");
  badge.id = "__smc-badge";
  badge.style.cssText =
    "position:fixed;bottom:20px;right:20px;width:36px;height:36px;border-radius:50%;" +
    "background:#8b5cf6;color:#fff;font-family:system-ui,sans-serif;font-size:14px;" +
    "font-weight:700;display:none;align-items:center;justify-content:center;cursor:pointer;" +
    "z-index:999999;box-shadow:0 4px 12px rgba(0,0,0,.3);";
  document.body.appendChild(badge);

  var panel = document.createElement("div");
  panel.id = "__smc-panel";
  panel.style.cssText =
    "position:fixed;bottom:68px;right:20px;width:320px;max-height:400px;overflow-y:auto;" +
    "background:#1e1e2e;border:1px solid #8b5cf6;border-radius:10px;" +
    "box-shadow:0 8px 32px rgba(0,0,0,.4);font-family:system-ui,-apple-system,sans-serif;" +
    "z-index:999999;display:none;";
  document.body.appendChild(panel);

  var markerContainer = document.createElement("div");
  markerContainer.id = "__smc-markers";
  markerContainer.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:999997;";
  document.body.appendChild(markerContainer);

  // ── State ────────────────────────────────────────────────────────

  var flashTimer = null;
  var panelOpen = false;
  var markers = {};
  var markerNumber = 0;
  var lastClickId = null;
  var forceNewSession = false;
  var forceSessionName = null;
  var modal = null;
  var pendingClick = null;
  var pendingNewSession = false;
  var pendingSessionName = null;
  var previousFocus = null;
  var sessionPrompt = null;
  var rafId = null;
  var latestMouseEvent = null;
  var updateMarkersRaf = null;

  // ── Flash messages ───────────────────────────────────────────────

  function flash(msg, ms) {
    ms = ms || 2000;
    if (flashTimer) clearTimeout(flashTimer);
    status.textContent = msg;
    status.style.bottom = badge.style.display === "flex" ? "68px" : "20px";
    status.style.display = "block";
    flashTimer = setTimeout(function () {
      status.style.display = "none";
    }, ms);
  }

  // ── Badge ────────────────────────────────────────────────────────

  function updateBadge(count) {
    if (count > 0) {
      badge.style.display = "flex";
      badge.textContent = count > 99 ? "99+" : String(count);
    } else {
      badge.style.display = "none";
      if (panelOpen) {
        panelOpen = false;
        panel.style.display = "none";
      }
    }
  }

  badge.addEventListener(
    "click",
    function (e) {
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
    },
    true,
  );

  // ── Panel ────────────────────────────────────────────────────────

  function refreshPanel() {
    fetch("/__see-my-clicks?keep=true")
      .then(function (r) {
        return r.json();
      })
      .then(function (store) {
        var sessions = (store && store.sessions) || [];
        var html = '<div style="padding:12px;">';
        html +=
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
        html +=
          '<span style="color:#cdd6f4;font-size:13px;font-weight:600;">Captures</span>';
        html +=
          '<button id="__smc-new-session-btn" style="background:#8b5cf6;border:none;border-radius:6px;' +
          'color:#fff;font-size:11px;padding:3px 10px;cursor:pointer;">+ New Session</button>';
        html += "</div>";

        if (sessions.length === 0) {
          html +=
            '<div style="color:#6c7086;font-size:12px;padding:8px 0;">No captures yet. Alt+Click an element.</div>';
        }

        for (var i = sessions.length - 1; i >= 0; i--) {
          var s = sessions[i];
          var isActive = i === sessions.length - 1;
          html += renderSessionHtml(s, isActive);
        }

        html += "</div>";
        panel.innerHTML = html;

        // Attach delete handlers
        var delBtns = panel.querySelectorAll("[data-smc-delete]");
        for (var j = 0; j < delBtns.length; j++) {
          (function (btn) {
            btn.addEventListener("click", function (e) {
              e.stopPropagation();
              deleteClick(btn.getAttribute("data-smc-delete"));
            });
          })(delBtns[j]);
        }

        // Attach new session handler
        var nsBtn = panel.querySelector("#__smc-new-session-btn");
        if (nsBtn) {
          nsBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            panel.style.display = "none";
            panelOpen = false;
            showSessionPrompt(function (name) {
              forceNewSession = true;
              forceSessionName = name;
              flash(
                "New session: " +
                  (name || "Unnamed") +
                  " \u2014 Alt+Click to capture",
              );
            });
          });
        }
      });
  }

  function renderSessionHtml(session, expanded) {
    var clicks = session.clicks || [];
    var html = '<div style="border-top:1px solid #313244;padding:8px 0;">';
    html +=
      '<div style="color:#8b5cf6;font-size:11px;font-weight:600;">' +
      escapeHtml(session.name || "Unnamed") +
      " (" +
      clicks.length +
      ")</div>";
    if (expanded) {
      for (var j = 0; j < clicks.length; j++) {
        var c = clicks[j];
        var label = "&lt;" + escapeHtml(c.tagName) + "&gt;";
        var comp =
          c.component && c.component.name
            ? " " + escapeHtml(c.component.name)
            : "";
        var comment = c.comment
          ? " \u2014 " +
            escapeHtml(
              c.comment.length > 40
                ? c.comment.slice(0, 40) + "..."
                : c.comment,
            )
          : "";
        html +=
          '<div style="display:flex;align-items:center;gap:6px;padding:4px 0;color:#cdd6f4;font-size:12px;">';
        html +=
          '<span style="color:#6c7086;font-size:11px;min-width:16px;">' +
          (j + 1) +
          "</span>";
        html +=
          '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' +
          label +
          comp +
          comment +
          "</span>";
        html +=
          '<button data-smc-delete="' +
          escapeHtml(c.clickId) +
          '" style="background:none;border:none;' +
          'color:#f38ba8;cursor:pointer;font-size:14px;padding:0 4px;line-height:1;" title="Delete">\u00d7</button>';
        html += "</div>";
      }
    }
    html += "</div>";
    return html;
  }

  function deleteClick(clickId) {
    fetch("/__see-my-clicks?clickId=" + encodeURIComponent(clickId), {
      method: "DELETE",
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (res) {
        removeMarker(clickId);
        updateBadge(res.totalClicks || 0);
        if (panelOpen) refreshPanel();
      });
  }

  // ── Markers ──────────────────────────────────────────────────────

  function addMarker(data) {
    markerNumber++;
    var target = null;
    try {
      target = document.querySelector(data.selector);
    } catch (e) {
      /* invalid selector */
    }
    if (!target) return;

    var rect = target.getBoundingClientRect();
    var dot = document.createElement("div");
    dot.className = "__smc-marker";
    dot.setAttribute("data-click-id", data.clickId);
    dot.style.cssText =
      "position:fixed;width:20px;height:20px;border-radius:50%;background:#8b5cf6;color:#fff;" +
      "font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;" +
      "font-family:system-ui,sans-serif;box-shadow:0 2px 6px rgba(0,0,0,.3);" +
      "pointer-events:auto;cursor:pointer;";
    dot.textContent = String(markerNumber);
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
      true,
    );

    markerContainer.appendChild(dot);
    markers[data.clickId] = {
      el: dot,
      target: target,
      number: markerNumber,
      data: data,
    };
  }

  function removeMarker(clickId) {
    var m = markers[clickId];
    if (m) {
      m.el.remove();
      delete markers[clickId];
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

  // ── Comment modal ────────────────────────────────────────────────

  function createModal() {
    var m = document.createElement("div");
    m.id = "__smc-modal";
    m.setAttribute("role", "dialog");
    m.setAttribute("aria-modal", "true");
    m.setAttribute("aria-label", "Add comment for captured element");
    m.style.cssText =
      "position:fixed;z-index:1000000;background:#1e1e2e;border:1px solid #8b5cf6;" +
      "border-radius:10px;padding:12px;box-shadow:0 8px 32px rgba(0,0,0,.4);" +
      "font-family:system-ui,-apple-system,sans-serif;display:none;width:360px;" +
      "max-height:calc(100vh - 32px);overflow-y:auto;";
    m.innerHTML =
      '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">' +
      '<div style="width:8px;height:8px;border-radius:50%;background:#8b5cf6;flex-shrink:0;"></div>' +
      '<span id="__smc-header-text" style="color:#cdd6f4;font-size:12px;font-weight:600;' +
      'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">Add a comment</span>' +
      '<span style="color:#6c7086;font-size:11px;flex-shrink:0;">Esc = skip</span>' +
      "</div>" +
      '<textarea id="__smc-input" rows="3" placeholder="What\'s wrong? What should change?"' +
      ' style="width:100%;box-sizing:border-box;background:#313244;border:1px solid #45475a;' +
      "border-radius:6px;color:#cdd6f4;font-family:system-ui,-apple-system,sans-serif;" +
      'font-size:13px;padding:8px;resize:vertical;outline:none;"></textarea>' +
      '<div style="display:flex;gap:6px;margin-top:8px;justify-content:flex-end;">' +
      '<button id="__smc-skip" style="background:transparent;border:1px solid #45475a;' +
      'border-radius:6px;color:#6c7086;font-size:12px;padding:4px 12px;cursor:pointer;">Skip</button>' +
      '<button id="__smc-save" style="background:#8b5cf6;border:none;border-radius:6px;' +
      'color:#fff;font-size:12px;font-weight:600;padding:4px 12px;cursor:pointer;">Save</button>' +
      "</div>";
    document.body.appendChild(m);

    m.querySelector("#__smc-save").addEventListener("click", function () {
      submitComment(false);
    });
    m.querySelector("#__smc-skip").addEventListener("click", function () {
      submitComment(true);
    });
    m.querySelector("#__smc-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submitComment(false);
      } else if (e.key === "Escape") {
        e.preventDefault();
        submitComment(true);
      }
    });

    // Focus trap
    m.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      var focusable = m.querySelectorAll("textarea, button");
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    return m;
  }

  function showModal(data, x, y) {
    if (!modal) modal = createModal();
    pendingClick = data;
    previousFocus = document.activeElement;

    var inp = modal.querySelector("#__smc-input");
    inp.value = "";

    // Update header with element info
    var headerText = modal.querySelector("#__smc-header-text");
    var label = "<" + data.tagName + ">";
    var dispText = data.textContent;
    if (dispText && dispText.length > 30)
      dispText = dispText.slice(0, 30) + "...";
    var comp =
      data.component && data.component.name
        ? " \u2014 " + data.component.name
        : "";
    headerText.textContent =
      label + (dispText ? ' "' + dispText + '"' : "") + comp;

    // Position off-screen to measure
    modal.style.left = "-9999px";
    modal.style.top = "-9999px";
    modal.style.display = "block";

    var rect = modal.getBoundingClientRect();
    var mw = rect.width;
    var mh = rect.height;

    var left = Math.min(x + 12, window.innerWidth - mw - 16);
    var top = Math.min(y + 12, window.innerHeight - mh - 16);
    modal.style.left = Math.max(16, left) + "px";
    modal.style.top = Math.max(16, top) + "px";

    setTimeout(function () {
      inp.focus();
    }, 50);
  }

  var editingClickId = null;

  function submitComment(skip) {
    if (!pendingClick || !modal) return;
    var inp = modal.querySelector("#__smc-input");
    var comment = skip ? "" : (inp.value || "").trim();

    if (editingClickId) {
      // Update existing click
      fetch("/__see-my-clicks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clickId: editingClickId,
          comment: comment || null,
        }),
      })
        .then(function (r) {
          return r.json();
        })
        .then(function () {
          // Update the stored data on the marker
          if (markers[editingClickId]) {
            markers[editingClickId].data.comment = comment || null;
          }
          flash(comment ? "Comment updated" : "Comment removed");
        })
        .catch(function (err) {
          flash("Error: " + err.message, 3000);
        });
      editingClickId = null;
    } else {
      // New click
      pendingClick.comment = comment || null;
      save(pendingClick, pendingNewSession, pendingSessionName);
    }

    modal.style.display = "none";
    pendingClick = null;
    pendingNewSession = false;
    pendingSessionName = null;
    if (previousFocus && previousFocus.focus) previousFocus.focus();
    previousFocus = null;
  }

  function showEditModal(data, x, y) {
    if (!modal) modal = createModal();
    editingClickId = data.clickId;
    pendingClick = data;
    previousFocus = document.activeElement;

    var inp = modal.querySelector("#__smc-input");
    inp.value = data.comment || "";

    var headerText = modal.querySelector("#__smc-header-text");
    var label = "<" + data.tagName + ">";
    var dispText = data.textContent;
    if (dispText && dispText.length > 30)
      dispText = dispText.slice(0, 30) + "...";
    var comp =
      data.component && data.component.name
        ? " \u2014 " + data.component.name
        : "";
    headerText.textContent =
      label + (dispText ? ' "' + dispText + '"' : "") + comp;

    modal.style.left = "-9999px";
    modal.style.top = "-9999px";
    modal.style.display = "block";

    var rect = modal.getBoundingClientRect();
    var left = Math.min(x + 12, window.innerWidth - rect.width - 16);
    var top = Math.min(y + 12, window.innerHeight - rect.height - 16);
    modal.style.left = Math.max(16, left) + "px";
    modal.style.top = Math.max(16, top) + "px";

    setTimeout(function () {
      inp.focus();
    }, 50);
  }

  function isModalOpen() {
    return modal && modal.style.display !== "none";
  }

  // ── Session prompt ───────────────────────────────────────────────

  function createSessionPrompt() {
    var p = document.createElement("div");
    p.id = "__smc-session-prompt";
    p.setAttribute("role", "dialog");
    p.setAttribute("aria-modal", "true");
    p.setAttribute("aria-label", "Name your new session");
    p.style.cssText =
      "position:fixed;z-index:1000001;background:#1e1e2e;border:1px solid #8b5cf6;" +
      "border-radius:10px;padding:12px;box-shadow:0 8px 32px rgba(0,0,0,.4);" +
      "font-family:system-ui,-apple-system,sans-serif;display:none;width:240px;" +
      "top:50%;left:50%;transform:translate(-50%,-50%);";
    p.innerHTML =
      '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">' +
      '<div style="width:8px;height:8px;border-radius:50%;background:#8b5cf6;"></div>' +
      '<span style="color:#cdd6f4;font-size:12px;font-weight:600;">New Session</span>' +
      '<span style="color:#6c7086;font-size:11px;margin-left:auto;">Esc = cancel</span>' +
      "</div>" +
      '<input id="__smc-session-name" type="text" placeholder="e.g. Header fixes"' +
      ' style="width:100%;box-sizing:border-box;background:#313244;border:1px solid #45475a;' +
      'border-radius:6px;color:#cdd6f4;font-family:system-ui;font-size:13px;padding:8px;outline:none;" />' +
      '<div style="display:flex;gap:6px;margin-top:8px;justify-content:flex-end;">' +
      '<button id="__smc-session-cancel" style="background:transparent;border:1px solid #45475a;' +
      'border-radius:6px;color:#6c7086;font-size:12px;padding:4px 12px;cursor:pointer;">Cancel</button>' +
      '<button id="__smc-session-ok" style="background:#8b5cf6;border:none;border-radius:6px;' +
      'color:#fff;font-size:12px;font-weight:600;padding:4px 12px;cursor:pointer;">Start</button>' +
      "</div>";
    document.body.appendChild(p);
    return p;
  }

  function showSessionPrompt(callback) {
    if (!sessionPrompt) sessionPrompt = createSessionPrompt();
    var input = sessionPrompt.querySelector("#__smc-session-name");
    input.value = "";
    sessionPrompt.style.display = "block";
    setTimeout(function () {
      input.focus();
    }, 50);

    var okBtn = sessionPrompt.querySelector("#__smc-session-ok");
    var cancelBtn = sessionPrompt.querySelector("#__smc-session-cancel");

    function finish(name) {
      sessionPrompt.style.display = "none";
      cleanup();
      if (name !== null) callback(name);
    }
    function cleanup() {
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
      input.removeEventListener("keydown", onKey);
    }
    function onOk() {
      finish(input.value.trim() || null);
    }
    function onCancel() {
      finish(null);
    }
    function onKey(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        finish(input.value.trim() || null);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        finish(null);
      }
    }
    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
    input.addEventListener("keydown", onKey);
  }

  function isSessionPromptOpen() {
    return sessionPrompt && sessionPrompt.style.display !== "none";
  }

  // ── Selector helpers ─────────────────────────────────────────────

  function getSelector(el) {
    if (el.id) return "#" + CSS.escape(el.id);
    var sel = el.tagName.toLowerCase();
    if (el.classList.length)
      sel +=
        "." +
        Array.from(el.classList)
          .map(function (c) {
            return CSS.escape(c);
          })
          .join(".");
    var parent = el.parentElement;
    if (parent) {
      var sibs = Array.from(parent.children).filter(function (c) {
        return c.tagName === el.tagName;
      });
      if (sibs.length > 1)
        sel += ":nth-of-type(" + (sibs.indexOf(el) + 1) + ")";
    }
    return sel;
  }

  function getFullSelector(el) {
    var parts = [];
    var cur = el;
    while (cur && cur !== document.body) {
      parts.unshift(getSelector(cur));
      cur = cur.parentElement;
    }
    return parts.join(" > ");
  }

  // ── Framework detection ──────────────────────────────────────────

  function getSvelteComponent(el) {
    if (el.__svelte_meta) {
      return {
        framework: "svelte",
        name:
          el.__svelte_meta.loc && el.__svelte_meta.loc.file
            ? el.__svelte_meta.loc.file.split("/").pop().replace(".svelte", "")
            : "Unknown",
        file: (el.__svelte_meta.loc && el.__svelte_meta.loc.file) || "Unknown",
      };
    }
    var dc = el.getAttribute("data-component");
    if (dc) return { framework: "svelte", name: dc, file: "Unknown" };
    var sc = Array.from(el.classList).find(function (c) {
      return c.startsWith("svelte-");
    });
    if (sc)
      return {
        framework: "svelte",
        name: "Unknown (" + sc + ")",
        file: "Unknown",
      };
    return null;
  }

  function getReactComponent(el) {
    var fiberKey = Object.keys(el).find(function (k) {
      return (
        k.startsWith("__reactFiber$") ||
        k.startsWith("__reactInternalInstance$")
      );
    });
    if (!fiberKey) return null;
    var fiber = el[fiberKey];
    var node = fiber;
    while (node) {
      if (typeof node.type === "function" || typeof node.type === "object") {
        var name =
          (node.type && (node.type.displayName || node.type.name)) || null;
        if (name) {
          var file =
            (node._debugSource && node._debugSource.fileName) || "Unknown";
          return { framework: "react", name: name, file: file };
        }
      }
      node = node.return;
    }
    return null;
  }

  function getVueComponent(el) {
    var vue3 = el.__vueParentComponent;
    if (vue3) {
      var name =
        (vue3.type && (vue3.type.name || vue3.type.__name)) || "Unknown";
      var file = (vue3.type && vue3.type.__file) || "Unknown";
      return { framework: "vue", name: name, file: file };
    }
    var vue2 = el.__vue__;
    if (vue2) {
      var n =
        (vue2.$options &&
          (vue2.$options.name || vue2.$options._componentTag)) ||
        "Unknown";
      var f = (vue2.$options && vue2.$options.__file) || "Unknown";
      return { framework: "vue", name: n, file: f };
    }
    return null;
  }

  function getFrameworkComponent(el) {
    return (
      getSvelteComponent(el) ||
      getReactComponent(el) ||
      getVueComponent(el) ||
      null
    );
  }

  function getFrameworkComponentFromChain(el) {
    var cur = el;
    while (cur && cur !== document.body) {
      var comp = getFrameworkComponent(cur);
      if (comp) return comp;
      cur = cur.parentElement;
    }
    return null;
  }

  // ── Parent chain & attributes ────────────────────────────────────

  function getParentChain(el, maxDepth) {
    maxDepth = maxDepth || 5;
    var chain = [];
    var cur = el.parentElement;
    var d = 0;
    while (cur && cur !== document.body && d < maxDepth) {
      chain.push({
        tagName: cur.tagName.toLowerCase(),
        id: cur.id || null,
        classList: Array.from(cur.classList),
        component: getFrameworkComponent(cur),
      });
      cur = cur.parentElement;
      d++;
    }
    return chain;
  }

  function getAttributes(el) {
    var attrs = {};
    for (var i = 0; i < el.attributes.length; i++) {
      var a = el.attributes[i];
      if (a.name.startsWith("data-v-")) continue;
      attrs[a.name] = a.value;
    }
    return attrs;
  }

  // ── Capture element ──────────────────────────────────────────────

  function captureElement(el) {
    var rect = el.getBoundingClientRect();
    return {
      clickId: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      timestamp: new Date().toISOString(),
      tagName: el.tagName.toLowerCase(),
      elementId: el.id || null,
      classList: Array.from(el.classList),
      selector: getFullSelector(el),
      textContent: truncateText(el.innerText || el.textContent || "", 100),
      boundingBox: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      component: getFrameworkComponentFromChain(el),
      parentChain: getParentChain(el),
      attributes: getAttributes(el),
      url: window.location.href,
      viewportSize: { width: window.innerWidth, height: window.innerHeight },
    };
  }

  // ── Save to server ───────────────────────────────────────────────

  function save(data, newSession, sessionName) {
    fetch("/__see-my-clicks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: data,
        newSession: !!newSession,
        sessionName: sessionName || null,
      }),
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (res) {
        var name = (data.component && data.component.name) || data.tagName;
        var sessionLabel = res.sessionName ? " [" + res.sessionName + "]" : "";
        flash("Clicked: " + name + sessionLabel);
        updateBadge(res.totalClicks || 0);
        addMarker(data);
        lastClickId = data.clickId;
      })
      .catch(function (err) {
        console.error("[see-my-clicks] error:", err);
        flash("Error: " + err.message, 3000);
      });
  }

  // ── Event listeners ──────────────────────────────────────────────

  document.addEventListener(
    "click",
    function (e) {
      // Handle clicks while modal is open
      if (isModalOpen()) {
        if (modal && !modal.contains(e.target)) {
          submitComment(true);
          if (!e.altKey) return;
        } else {
          return;
        }
      }

      // Ignore clicks while session prompt is open
      if (isSessionPromptOpen()) return;

      if (!e.altKey) return;
      if (isSmcElement(e.target)) return;

      e.preventDefault();
      e.stopPropagation();

      var data = captureElement(e.target);

      // Shift+Alt+Click: prompt for new session name
      if (e.shiftKey) {
        showSessionPrompt(function (name) {
          pendingNewSession = true;
          pendingSessionName = name;
          showModal(data, e.clientX, e.clientY);
        });
        return;
      }

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
    true,
  );

  // Mousemove with RAF throttle — store latest event to avoid stale closure
  document.addEventListener("mousemove", function (e) {
    latestMouseEvent = e;
    if (rafId) return;
    rafId = requestAnimationFrame(function () {
      rafId = null;
      var ev = latestMouseEvent;
      if (!ev || !ev.altKey || isModalOpen() || isSessionPromptOpen()) {
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
    if (e.key === "Alt") {
      highlight.style.display = "none";
      tooltip.style.display = "none";
    }
  });

  // Undo: Ctrl+Alt+Z / Cmd+Alt+Z
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

  // ── Init ─────────────────────────────────────────────────────────

  // ── Marker restoration ─────────────────────────────────────────────

  function clearAllMarkers() {
    var ids = Object.keys(markers);
    for (var i = 0; i < ids.length; i++) {
      removeMarker(ids[i]);
    }
  }

  function restoreMarkers() {
    clearAllMarkers();
    fetch("/__see-my-clicks?keep=true")
      .then(function (r) {
        return r.json();
      })
      .then(function (store) {
        var total = 0;
        var currentRoute = window.location.pathname + window.location.hash;
        if (store && store.sessions) {
          var clickIndex = 0;
          for (var i = 0; i < store.sessions.length; i++) {
            var clicks = store.sessions[i].clicks || [];
            total += clicks.length;
            for (var j = 0; j < clicks.length; j++) {
              clickIndex++;
              try {
                var parsed = new URL(clicks[j].url);
                var clickRoute = parsed.pathname + parsed.hash;
              } catch (e) {
                continue;
              }
              if (clickRoute === currentRoute) {
                markerNumber = clickIndex - 1;
                addMarker(clicks[j]);
              }
            }
          }
          markerNumber = total;
        }
        updateBadge(total);
      })
      .catch(function () {});
  }

  // Detect client-side navigation (SvelteKit, Next.js, hash-based routers, etc.)
  function currentRoute() {
    return window.location.pathname + window.location.hash;
  }
  var lastRoute = currentRoute();
  var origPushState = history.pushState;
  var origReplaceState = history.replaceState;

  function onNavigation() {
    var newRoute = currentRoute();
    if (newRoute !== lastRoute) {
      lastRoute = newRoute;
      setTimeout(restoreMarkers, 300);
    }
  }

  history.pushState = function () {
    origPushState.apply(this, arguments);
    onNavigation();
  };
  history.replaceState = function () {
    origReplaceState.apply(this, arguments);
    onNavigation();
  };
  window.addEventListener("popstate", onNavigation);
  window.addEventListener("hashchange", onNavigation);

  // Initial load
  setTimeout(restoreMarkers, 300);

  flash(
    "See My Clicks ready \u2014 Alt+Click to capture, Shift+Alt+Click for new session",
  );
  console.log(
    "[see-my-clicks] Initialized. Alt+Click any element to capture it.",
  );
})();
