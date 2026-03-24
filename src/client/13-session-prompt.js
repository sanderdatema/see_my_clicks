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

  // Focus trap
  p.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    var focusable = p.querySelectorAll("input, button");
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

  return p;
}

function showSessionPrompt(sessionCount, callback) {
  if (!sessionPrompt) sessionPrompt = createSessionPrompt();
  var input = sessionPrompt.querySelector("#__smc-session-name");
  var defaultName = "Session " + (sessionCount + 1);
  input.value = "";
  input.placeholder = defaultName;
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
    finish(input.value.trim() || defaultName);
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
