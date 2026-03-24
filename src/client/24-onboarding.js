// ── Onboarding ──────────────────────────────────────────────────

function showOnboarding() {
  if (localStorage.getItem("__smc-onboarded")) return;
  var tip = document.createElement("div");
  tip.id = "__smc-onboarding";
  tip.setAttribute("role", "alertdialog");
  tip.setAttribute("aria-label", "see-my-clicks onboarding tip");
  tip.style.cssText =
    "position:fixed;bottom:64px;right:16px;background:#1e1e2e;color:#cdd6f4;" +
    "border:1px solid #8b5cf6;border-radius:8px;padding:12px 16px;z-index:999999;" +
    "font-family:system-ui,-apple-system,sans-serif;font-size:13px;max-width:260px;" +
    "box-shadow:0 8px 24px rgba(0,0,0,.4);";
  tip.innerHTML =
    '<div style="font-weight:600;margin-bottom:4px;">see-my-clicks</div>' +
    '<div style="color:#a6adc8;font-size:12px;line-height:1.5;">' +
    "<strong>" +
    MODIFIER_LABEL +
    "+Click</strong> any element to capture it for your AI assistant.<br>" +
    'Then tell your AI to "check my clicks".</div>' +
    '<div style="display:flex;gap:6px;margin-top:8px;">' +
    '<button id="__smc-onboard-dismiss" style="background:#8b5cf6;border:none;border-radius:4px;' +
    'color:#fff;padding:4px 12px;cursor:pointer;font-size:12px;">Got it</button>' +
    '<button id="__smc-onboard-shortcuts" style="background:transparent;border:1px solid #45475a;' +
    'border-radius:4px;color:#6c7086;padding:4px 8px;cursor:pointer;font-size:11px;">Shortcuts</button>' +
    "</div>" +
    '<div id="__smc-shortcuts-detail" style="display:none;margin-top:8px;color:#6c7086;font-size:11px;line-height:1.6;">' +
    "<strong>Enter</strong> save comment<br>" +
    "<strong>Esc</strong> cancel<br>" +
    "<strong>Shift+Enter</strong> multiline<br>" +
    "<strong>Ctrl+Alt+Z</strong> undo last click</div>";
  document.body.appendChild(tip);

  tip
    .querySelector("#__smc-onboard-dismiss")
    .addEventListener("click", function () {
      tip.remove();
      localStorage.setItem("__smc-onboarded", "1");
    });
  tip
    .querySelector("#__smc-onboard-shortcuts")
    .addEventListener("click", function () {
      var detail = tip.querySelector("#__smc-shortcuts-detail");
      detail.style.display = detail.style.display === "none" ? "block" : "none";
    });
  document.addEventListener("keydown", function onEsc(e) {
    if (e.key === "Escape" && document.getElementById("__smc-onboarding")) {
      tip.remove();
      localStorage.setItem("__smc-onboarded", "1");
      document.removeEventListener("keydown", onEsc);
    }
  });
}
