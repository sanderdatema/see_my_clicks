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
      // Track in allClickData so syncMarkers and updateBadge know about it
      var sColor = res.sessionColor || SMC_PURPLE;
      var clickNumber = allClickData.length + 1;
      allClickData.push({
        data: data,
        index: clickNumber,
        clickId: data.clickId,
        sessionId: res.sessionId,
        sessionColor: sColor,
      });
      updateBadge();
      addMarker(data, sColor, clickNumber);
      lastClickId = data.clickId;
    })
    .catch(function (err) {
      console.error("[see-my-clicks] error:", err);
      flash("Error: " + err.message, 3000);
    });
}

function loadAndSync() {
  fetch("/__see-my-clicks?source=browser")
    .then(function (r) {
      return r.json();
    })
    .then(function (store) {
      lastRetrievedAt = (store && store.lastRetrievedAt) || null;
      allClickData = [];
      var clickIndex = 0;
      if (store && store.sessions) {
        for (var i = 0; i < store.sessions.length; i++) {
          var session = store.sessions[i];
          var sessionColor = session.color || SMC_PURPLE;
          var clicks = session.clicks || [];
          for (var j = 0; j < clicks.length; j++) {
            clickIndex++;
            var click = clicks[j];
            var seen = !!(
              lastRetrievedAt &&
              click.timestamp &&
              click.timestamp <= lastRetrievedAt
            );
            allClickData.push({
              data: click,
              index: clickIndex,
              clickId: click.clickId,
              sessionId: session.id,
              sessionColor: sessionColor,
              seen: seen,
            });
          }
        }
      }
      updateBadge();
      syncMarkersForCurrentRoute();
    })
    .catch(function (err) {
      console.warn("[see-my-clicks] sync error:", err.message);
    });
}

var POLL_INTERVAL_MS = 4000;
var _pollLastRetrievedAt = lastRetrievedAt;
var _pollTimer = null;

function pollOnce() {
  fetch("/__see-my-clicks?source=browser")
    .then(function (r) {
      return r.json();
    })
    .then(function (store) {
      var retrieved = (store && store.lastRetrievedAt) || null;
      if (retrieved !== _pollLastRetrievedAt) {
        var wasNull = _pollLastRetrievedAt === null;
        _pollLastRetrievedAt = retrieved;
        loadAndSync();
        if (!wasNull && retrieved) {
          flash(
            "Your AI retrieved clicks \u2014 next " +
              MODIFIER_LABEL +
              "+Click starts a new session",
            4000
          );
          forceNewSession = true;
        }
      }
    })
    .catch(function () {});
}

function startPolling() {
  if (_pollTimer) return;
  _pollTimer = setInterval(pollOnce, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (_pollTimer) {
    clearInterval(_pollTimer);
    _pollTimer = null;
  }
}

startPolling();

document.addEventListener("visibilitychange", function () {
  if (document.hidden) {
    stopPolling();
  } else {
    startPolling();
    loadAndSync();
  }
});
