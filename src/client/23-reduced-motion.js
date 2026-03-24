// ── Reduced motion ───────────────────────────────────────────────

var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
function applyReducedMotion() {
  if (reducedMotion.matches) {
    highlight.style.transition = "none";
  } else {
    highlight.style.transition = "all .05s ease";
  }
}
applyReducedMotion();
if (reducedMotion.addEventListener) {
  reducedMotion.addEventListener("change", applyReducedMotion);
}
