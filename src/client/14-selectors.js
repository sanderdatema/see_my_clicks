// ── Selector helpers ─────────────────────────────────────────────

function getSelector(el) {
  if (el.id) return "#" + CSS.escape(el.id);
  var sel = el.tagName.toLowerCase();
  if (el.classList.length)
    sel +=
      "." +
      Array.from(el.classList)
        .map(function (c) {
          return CSS.escape(c);
        })
        .join(".");
  var parent = el.parentElement;
  if (parent) {
    var sibs = Array.from(parent.children).filter(function (c) {
      return c.tagName === el.tagName;
    });
    if (sibs.length > 1)
      sel += ":nth-of-type(" + (sibs.indexOf(el) + 1) + ")";
  }
  return sel;
}

function getFullSelector(el) {
  var parts = [];
  var cur = el;
  while (cur && cur !== document.body) {
    parts.unshift(getSelector(cur));
    cur = cur.parentElement;
  }
  return parts.join(" > ");
}

function stripHashClasses(selector) {
  // Remove Svelte scoped class hashes (.s-XXXX, .svelte-XXXX) from selectors
  return selector.replace(/\.(?:s-|svelte-)[A-Za-z0-9_-]+/g, "");
}
