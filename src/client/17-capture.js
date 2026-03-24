// ── Capture element ──────────────────────────────────────────────

function captureElement(el) {
  var rect = el.getBoundingClientRect();
  return {
    // Generates click IDs. Independent from session ID generation in src/server.js.
    clickId: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    timestamp: new Date().toISOString(),
    tagName: el.tagName.toLowerCase(),
    elementId: el.id || null,
    classList: Array.from(el.classList),
    selector: getFullSelector(el),
    textContent: truncateText(el.innerText || el.textContent || "", 100),
    boundingBox: {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    },
    component: getFrameworkComponentFromChain(el),
    parentChain: getParentChain(el),
    attributes: getAttributes(el),
    url: window.location.href,
    viewportSize: { width: window.innerWidth, height: window.innerHeight },
  };
}
