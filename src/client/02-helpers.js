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

function hexToRgba(hex, alpha) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
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

function generateClickId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function countUnread() {
  var n = 0;
  for (var i = 0; i < allClickData.length; i++) {
    if (!allClickData[i].seen) n++;
  }
  return n;
}
