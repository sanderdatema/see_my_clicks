// ── Parent chain & attributes ────────────────────────────────────

function getParentChain(el, maxDepth) {
  maxDepth = maxDepth || 5;
  var chain = [];
  var cur = el.parentElement;
  var d = 0;
  while (cur && cur !== document.body && d < maxDepth) {
    chain.push({
      tagName: cur.tagName.toLowerCase(),
      id: cur.id || null,
      classList: Array.from(cur.classList),
      component: getFrameworkComponent(cur),
    });
    cur = cur.parentElement;
    d++;
  }
  return chain;
}

function getAttributes(el) {
  var attrs = {};
  for (var i = 0; i < el.attributes.length; i++) {
    var a = el.attributes[i];
    if (a.name.startsWith("data-v-")) continue;
    attrs[a.name] = a.value;
  }
  return attrs;
}
