// ── Panel ────────────────────────────────────────────────────────

var panelClickData = {};

function refreshPanel() {
  fetch("/__see-my-clicks?source=browser")
    .then(function (r) {
      return r.json();
    })
    .then(function (store) {
      var sessions = (store && store.sessions) || [];
      panelClickData = {};
      var html = '<div style="padding:12px;">';
      html +=
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
      html +=
        '<span style="color:#cdd6f4;font-size:13px;font-weight:600;">Captures</span>';
      html += '<div style="display:flex;gap:6px;">';
      html +=
        '<button id="__smc-purge-btn" style="background:none;border:1px solid #f38ba8;border-radius:6px;' +
        'color:#f38ba8;font-size:11px;padding:3px 8px;cursor:pointer;" title="Purge all clicks">' +
        "\uD83D\uDDD1 Purge</button>";
      if (store.lastRetrievedAt) {
        html +=
          '<button id="__smc-unread-btn" style="background:none;border:1px solid #6c7086;border-radius:6px;' +
          'color:#6c7086;font-size:11px;padding:3px 8px;cursor:pointer;" title="Mark all as unread">' +
          "↺ Unread</button>";
      }
      html +=
        '<button id="__smc-new-session-btn" style="background:#8b5cf6;border:none;border-radius:6px;' +
        'color:#fff;font-size:11px;padding:3px 10px;cursor:pointer;">+ New Session</button>';
      html += "</div>";
      html += "</div>";

      if (sessions.length === 0) {
        html +=
          '<div style="color:#6c7086;font-size:12px;padding:8px 0;">No captures yet. ' +
          MODIFIER_LABEL +
          "+Click an element.</div>";
      }

      // Build global click numbering (oldest session first)
      var globalNumber = 0;
      var clickNumbers = {};
      for (var i = 0; i < sessions.length; i++) {
        var clicks = sessions[i].clicks || [];
        for (var j = 0; j < clicks.length; j++) {
          globalNumber++;
          clickNumbers[clicks[j].clickId] = globalNumber;
        }
      }

      for (var i = sessions.length - 1; i >= 0; i--) {
        html += renderSessionHtml(sessions[i], clickNumbers);
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

      // Attach edit and hover handlers
      var editRows = panel.querySelectorAll("[data-smc-edit]");
      for (var j = 0; j < editRows.length; j++) {
        (function (row) {
          var clickId = row.getAttribute("data-smc-edit");
          row.addEventListener("click", function (e) {
            e.stopPropagation();
            var data = panelClickData[clickId];
            if (data) {
              panel.style.display = "none";
              panelOpen = false;
              openedFromPanel = true;
              showEditModal(data, e.clientX, e.clientY);
            }
          });
          row.addEventListener("mouseenter", function () {
            row.style.background = SMC_SURFACE;
            var m = markers[clickId];
            if (m) {
              m.el.style.opacity = "1";
              m.el.style.transform = "scale(1.5)";
              m.el.style.boxShadow = "0 0 12px " + hexToRgba(m.color, 0.8);
            }
          });
          row.addEventListener("mouseleave", function () {
            row.style.background = "none";
            var m = markers[clickId];
            if (m) {
              m.el.style.opacity = "0.7";
              m.el.style.transform = "";
              m.el.style.boxShadow = "0 2px 6px rgba(0,0,0,.3)";
            }
          });
        })(editRows[j]);
      }

      // Attach color dot handlers
      var colorDots = panel.querySelectorAll("[data-smc-color]");
      for (var j = 0; j < colorDots.length; j++) {
        (function (dot) {
          dot.addEventListener("click", function (e) {
            e.stopPropagation();
            showColorPicker(
              dot.getAttribute("data-smc-color"),
              dot.getAttribute("data-smc-current-color") || SMC_PURPLE,
              dot
            );
          });
        })(colorDots[j]);
      }

      // Attach visibility toggle handlers
      var toggleBtns = panel.querySelectorAll("[data-smc-toggle]");
      for (var j = 0; j < toggleBtns.length; j++) {
        (function (btn) {
          btn.addEventListener("click", function (e) {
            e.stopPropagation();
            toggleSessionVisibility(btn.getAttribute("data-smc-toggle"));
          });
        })(toggleBtns[j]);
      }

      // Attach purge handler
      var purgeBtn = panel.querySelector("#__smc-purge-btn");
      if (purgeBtn) {
        purgeBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          if (!confirm("Purge all click data? This cannot be undone.")) return;
          fetch("/__see-my-clicks", { method: "DELETE" })
            .then(function (r) {
              return r.json();
            })
            .then(function () {
              allClickData = [];
              var ids = Object.keys(markers);
              for (var k = 0; k < ids.length; k++) removeMarker(ids[k]);
              updateBadge();
              refreshPanel();
            })
            .catch(function (err) {
              console.warn("[see-my-clicks] purge error:", err.message);
            });
        });
      }

      // Attach unread handler
      var unreadBtn = panel.querySelector("#__smc-unread-btn");
      if (unreadBtn) {
        unreadBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          fetch("/__see-my-clicks", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "reset-read", resetRead: true }),
          })
            .then(function (r) {
              return r.json();
            })
            .then(function () {
              loadAndSync();
              refreshPanel();
            })
            .catch(function (err) {
              console.warn("[see-my-clicks] unread reset error:", err.message);
            });
        });
      }

      // Attach new session handler
      var nsBtn = panel.querySelector("#__smc-new-session-btn");
      if (nsBtn) {
        nsBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          panel.style.display = "none";
          panelOpen = false;
          showSessionPrompt(sessions.length, function (name) {
            forceNewSession = true;
            forceSessionName = name;
            for (var si = 0; si < sessions.length; si++) {
              hiddenSessions[sessions[si].id] = true;
            }
            syncMarkersForCurrentRoute();
            flash(
              "New session: " +
                (name || "Unnamed") +
                " \u2014 " +
                MODIFIER_LABEL +
                "+Click to capture"
            );
          });
        });
      }
    })
    .catch(function (err) {
      console.warn("[see-my-clicks] panel refresh error:", err.message);
    });
}

function renderSessionHtml(session, clickNumbers) {
  var clicks = session.clicks || [];
  var sessionColor = session.color || SMC_PURPLE;
  var isHidden = hiddenSessions[session.id];
  var rowOpacity = isHidden ? "opacity:0.4;" : "";
  var eyeSvg = isHidden
    ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#45475a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>' +
      '<line x1="1" y1="1" x2="23" y2="23"/></svg>'
    : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cdd6f4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>' +
      '<circle cx="12" cy="12" r="3"/></svg>';
  var html =
    '<div style="border-top:1px solid #313244;padding:8px 0;' +
    rowOpacity +
    '">';
  html +=
    '<div style="display:flex;align-items:center;gap:6px;">' +
    '<div data-smc-color="' +
    escapeHtml(session.id) +
    '" data-smc-current-color="' +
    escapeHtml(sessionColor) +
    '" style="width:14px;height:14px;border-radius:50%;background:' +
    escapeHtml(sessionColor) +
    ";cursor:pointer;flex-shrink:0;" +
    "border:2px solid rgba(255,255,255,.15);" +
    "display:flex;align-items:center;justify-content:center;" +
    'font-size:8px;font-weight:700;color:#fff;font-family:system-ui,sans-serif;" ' +
    'title="Change color">' +
    escapeHtml(session.name ? session.name.charAt(0).toUpperCase() : "S") +
    "</div>" +
    '<span style="color:' +
    escapeHtml(sessionColor) +
    ';font-size:11px;font-weight:600;flex:1;">' +
    escapeHtml(session.name || "Unnamed") +
    " (" +
    clicks.length +
    ")</span>" +
    '<button data-smc-toggle="' +
    escapeHtml(session.id) +
    '" style="background:none;border:none;cursor:pointer;padding:0 2px;' +
    'line-height:1;display:flex;align-items:center;" title="' +
    (isHidden ? "Show" : "Hide") +
    ' markers">' +
    eyeSvg +
    "</button>" +
    "</div>";
  for (var j = 0; j < clicks.length; j++) {
    var c = clicks[j];
    var label = "&lt;" + escapeHtml(c.tagName) + "&gt;";
    var comp =
      c.component && c.component.name ? " " + escapeHtml(c.component.name) : "";
    var comment = c.comment
      ? " \u2014 " +
        escapeHtml(
          c.comment.length > 40 ? c.comment.slice(0, 40) + "..." : c.comment
        )
      : "";
    panelClickData[c.clickId] = c;
    var num = clickNumbers[c.clickId] || j + 1;
    var onPage = routeMatches(c.url);
    var textColor = onPage ? "color:#cdd6f4;" : "color:#6c7086;";
    var numColor = onPage
      ? "color:" + escapeHtml(sessionColor) + ";"
      : "color:#45475a;";
    html +=
      '<div data-smc-edit="' +
      escapeHtml(c.clickId) +
      '" style="display:flex;align-items:center;gap:6px;padding:4px 0;' +
      textColor +
      "font-size:12px;" +
      'cursor:pointer;border-radius:4px;">';
    html +=
      '<span style="' +
      numColor +
      'font-size:11px;min-width:16px;">' +
      num +
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
    .then(function () {
      removeMarker(clickId);
      // Remove from allClickData so syncMarkers won't re-create it
      allClickData = allClickData.filter(function (cd) {
        return cd.clickId !== clickId;
      });
      updateBadge();
      if (panelOpen) refreshPanel();
    })
    .catch(function (err) {
      console.warn("[see-my-clicks] delete error:", err.message);
    });
}
