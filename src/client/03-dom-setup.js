// ── DOM elements ─────────────────────────────────────────────────

var overlay = document.createElement("div");
overlay.id = "__smc-overlay";
overlay.style.cssText =
  "position:fixed;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:" +
  Z_BASE +
  ";";
document.body.appendChild(overlay);

var highlight = document.createElement("div");
highlight.id = "__smc-highlight";
highlight.style.cssText =
  "position:fixed;border:2px solid " +
  SMC_PURPLE +
  ";background:rgba(139,92,246,0.1);" +
  "pointer-events:none;z-index:" +
  Z_HIGHLIGHT +
  ";transition:all .05s ease;display:none;";
document.body.appendChild(highlight);

var tooltip = document.createElement("div");
tooltip.id = "__smc-tooltip";
tooltip.style.cssText =
  "position:fixed;background:" +
  SMC_BG +
  ";color:" +
  SMC_TEXT +
  ";font-family:system-ui,sans-serif;" +
  "font-size:11px;padding:2px 6px;border-radius:4px;pointer-events:none;z-index:" +
  Z_BASE +
  ";" +
  "display:none;white-space:nowrap;border:1px solid " +
  SMC_PURPLE +
  ";";
document.body.appendChild(tooltip);

var status = document.createElement("div");
status.id = "__smc-status";
status.style.cssText =
  "position:fixed;bottom:68px;right:20px;background:" +
  SMC_PURPLE +
  ";color:#fff;" +
  "padding:8px 16px;border-radius:8px;font-family:system-ui,sans-serif;" +
  "font-size:14px;z-index:" +
  Z_BASE +
  ";box-shadow:0 4px 12px rgba(0,0,0,.2);display:none;" +
  "pointer-events:none;";
document.body.appendChild(status);

var badge = document.createElement("div");
badge.id = "__smc-badge";
badge.setAttribute("role", "button");
badge.setAttribute("tabindex", "0");
badge.setAttribute("aria-label", "See my clicks: 0 captures");
badge.style.cssText =
  "position:fixed;bottom:20px;right:20px;width:36px;height:36px;border-radius:50%;" +
  "background:" +
  SMC_PURPLE +
  ";color:#fff;font-family:system-ui,sans-serif;font-size:14px;" +
  "font-weight:700;display:none;align-items:center;justify-content:center;cursor:pointer;" +
  "z-index:" +
  Z_BASE +
  ";box-shadow:0 4px 12px rgba(0,0,0,.3);";
document.body.appendChild(badge);

var panel = document.createElement("div");
panel.id = "__smc-panel";
panel.style.cssText =
  "position:fixed;bottom:68px;right:20px;width:320px;max-height:400px;overflow-y:auto;" +
  "background:" +
  SMC_BG +
  ";border:1px solid " +
  SMC_PURPLE +
  ";border-radius:10px;" +
  "box-shadow:0 8px 32px rgba(0,0,0,.4);font-family:system-ui,-apple-system,sans-serif;" +
  "z-index:" +
  Z_BASE +
  ";display:none;";
document.body.appendChild(panel);

var markerContainer = document.createElement("div");
markerContainer.id = "__smc-markers";
markerContainer.style.cssText =
  "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:" +
  Z_MARKERS +
  ";";
document.body.appendChild(markerContainer);
