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
    '<span style="color:#6c7086;font-size:11px;flex-shrink:0;">Esc = cancel</span>' +
    "</div>" +
    '<textarea id="__smc-input" rows="3" placeholder="What\'s wrong? What should change?"' +
    ' style="width:100%;box-sizing:border-box;background:#313244;border:1px solid #45475a;' +
    "border-radius:6px;color:#cdd6f4;font-family:system-ui,-apple-system,sans-serif;" +
    'font-size:13px;padding:8px;resize:vertical;outline:none;"></textarea>' +
    '<div style="display:flex;gap:6px;margin-top:8px;align-items:center;">' +
    '<button id="__smc-delete" style="background:none;border:1px solid #f38ba8;' +
    'border-radius:6px;color:#f38ba8;font-size:12px;padding:4px 12px;cursor:pointer;display:none;" title="Delete capture">Delete</button>' +
    '<span style="flex:1;"></span>' +
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
  m.querySelector("#__smc-delete").addEventListener("click", function () {
    if (editingClickId) {
      var id = editingClickId;
      cancelModal();
      deleteClick(id);
      flash("Capture deleted");
    }
  });
  m.querySelector("#__smc-input").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitComment(false);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelModal();
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

function setModalHeader(data) {
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
}

function positionModal(x, y) {
  modal.style.left = "-9999px";
  modal.style.top = "-9999px";
  modal.style.display = "block";
  var rect = modal.getBoundingClientRect();
  var left = Math.min(x + 12, window.innerWidth - rect.width - 16);
  var top = Math.min(y + 12, window.innerHeight - rect.height - 16);
  modal.style.left = Math.max(16, left) + "px";
  modal.style.top = Math.max(16, top) + "px";
}

function showModal(data, x, y) {
  if (!modal) modal = createModal();
  pendingClick = data;
  previousFocus = document.activeElement;

  modal.querySelector("#__smc-delete").style.display = "none";
  var inp = modal.querySelector("#__smc-input");
  inp.value = "";

  setModalHeader(data);
  positionModal(x, y);

  setTimeout(function () {
    inp.focus();
  }, 50);
}

var editingClickId = null;
var openedFromPanel = false;

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
        action: "update-comment",
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
  openedFromPanel = false;
  pendingClick = null;
  pendingNewSession = false;
  pendingSessionName = null;
  if (previousFocus && previousFocus.focus) previousFocus.focus();
  previousFocus = null;
}

function cancelModal() {
  if (!modal) return;
  modal.style.display = "none";
  var wasFromPanel = openedFromPanel;
  editingClickId = null;
  openedFromPanel = false;
  pendingClick = null;
  pendingNewSession = false;
  pendingSessionName = null;
  if (previousFocus && previousFocus.focus) previousFocus.focus();
  previousFocus = null;
  if (wasFromPanel) {
    panelOpen = true;
    refreshPanel();
    panel.style.display = "block";
  }
}

function showEditModal(data, x, y) {
  if (!modal) modal = createModal();
  editingClickId = data.clickId;
  pendingClick = data;
  previousFocus = document.activeElement;

  modal.querySelector("#__smc-delete").style.display = "inline-block";

  var inp = modal.querySelector("#__smc-input");
  inp.value = data.comment || "";

  setModalHeader(data);
  positionModal(x, y);

  setTimeout(function () {
    inp.focus();
  }, 50);
}

function isModalOpen() {
  return modal && modal.style.display !== "none";
}
