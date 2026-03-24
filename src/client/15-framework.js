// ── Framework detection ──────────────────────────────────────────

function getSvelteComponent(el) {
  if (el.__svelte_meta) {
    return {
      framework: "svelte",
      name:
        el.__svelte_meta.loc && el.__svelte_meta.loc.file
          ? el.__svelte_meta.loc.file.split("/").pop().replace(".svelte", "")
          : "Unknown",
      file: (el.__svelte_meta.loc && el.__svelte_meta.loc.file) || "Unknown",
    };
  }
  var dc = el.getAttribute("data-component");
  if (dc) return { framework: "svelte", name: dc, file: "Unknown" };
  var sc = Array.from(el.classList).find(function (c) {
    return c.startsWith("svelte-");
  });
  if (sc)
    return {
      framework: "svelte",
      name: "Unknown (" + sc + ")",
      file: "Unknown",
    };
  return null;
}

function getReactComponent(el) {
  var fiberKey = Object.keys(el).find(function (k) {
    return (
      k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$")
    );
  });
  if (!fiberKey) return null;
  var fiber = el[fiberKey];
  var node = fiber;
  while (node) {
    if (typeof node.type === "function" || typeof node.type === "object") {
      var name =
        (node.type && (node.type.displayName || node.type.name)) || null;
      if (name) {
        var file =
          (node._debugSource && node._debugSource.fileName) || "Unknown";
        return { framework: "react", name: name, file: file };
      }
    }
    node = node.return;
  }
  return null;
}

function getVueComponent(el) {
  var vue3 = el.__vueParentComponent;
  if (vue3) {
    var name = (vue3.type && (vue3.type.name || vue3.type.__name)) || "Unknown";
    var file = (vue3.type && vue3.type.__file) || "Unknown";
    return { framework: "vue", name: name, file: file };
  }
  var vue2 = el.__vue__;
  if (vue2) {
    // Use n/f instead of name/file to avoid conflict with hoisted var
    // declarations from the Vue 3 branch (file avoids let/const for
    // transpilation-free delivery).
    var n =
      (vue2.$options && (vue2.$options.name || vue2.$options._componentTag)) ||
      "Unknown";
    var f = (vue2.$options && vue2.$options.__file) || "Unknown";
    return { framework: "vue", name: n, file: f };
  }
  return null;
}

function getFrameworkComponent(el) {
  return (
    getSvelteComponent(el) ||
    getReactComponent(el) ||
    getVueComponent(el) ||
    null
  );
}

function getFrameworkComponentFromChain(el) {
  var cur = el;
  while (cur && cur !== document.body) {
    var comp = getFrameworkComponent(cur);
    if (comp) return comp;
    cur = cur.parentElement;
  }
  return null;
}
