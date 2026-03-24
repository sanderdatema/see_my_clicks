// ── Flash messages ───────────────────────────────────────────────

function flash(msg, ms) {
  ms = ms || 2000;
  if (flashTimer) clearTimeout(flashTimer);
  status.textContent = msg;
  status.style.bottom = "68px";
  status.style.right = "20px";
  status.style.display = "block";
  flashTimer = setTimeout(function () {
    status.style.display = "none";
  }, ms);
}
