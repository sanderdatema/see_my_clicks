// ── Init ─────────────────────────────────────────────────────────

setTimeout(loadAndSync, 300);

flash("See My Clicks ready \u2014 " + MODIFIER_LABEL + "+Click to capture");
showOnboarding();
console.log(
  "[see-my-clicks] Initialized. " +
    MODIFIER_LABEL +
    "+Click any element to capture it."
);
