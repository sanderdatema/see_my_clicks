/**
 * Returns the client-side script string that gets injected into the page.
 * Handles Alt+Click capture, comment modal, highlight overlay, and
 * framework detection (Svelte, React, Vue).
 */
export function getClientScript() {
  return `
(function() {
  if (window.__seeMyClicksInitialized) return;
  window.__seeMyClicksInitialized = true;

  let overlay = null;

  // --- DOM helpers ---

  function createOverlay() {
    overlay = document.createElement('div');
    overlay.id = '__smc-overlay';
    overlay.style.cssText =
      'position:fixed;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:999999;';
    document.body.appendChild(overlay);
  }

  function createHighlight() {
    const h = document.createElement('div');
    h.id = '__smc-highlight';
    h.style.cssText =
      'position:fixed;border:2px solid #8b5cf6;background:rgba(139,92,246,0.1);' +
      'pointer-events:none;z-index:999998;transition:all .05s ease;display:none;';
    document.body.appendChild(h);
    return h;
  }

  function createStatusIndicator() {
    const s = document.createElement('div');
    s.id = '__smc-status';
    s.style.cssText =
      'position:fixed;bottom:20px;right:20px;background:#8b5cf6;color:#fff;' +
      'padding:8px 16px;border-radius:8px;font-family:system-ui,sans-serif;' +
      'font-size:14px;z-index:999999;box-shadow:0 4px 12px rgba(0,0,0,.2);display:none;';
    document.body.appendChild(s);
    return s;
  }

  const highlight = createHighlight();
  const status = createStatusIndicator();
  createOverlay();

  function flash(msg, ms) {
    ms = ms || 2000;
    status.textContent = msg;
    status.style.display = 'block';
    setTimeout(function() { status.style.display = 'none'; }, ms);
  }

  // --- Comment modal ---

  let modal = null;
  let pendingClick = null;
  let pendingClear = false;

  function createModal() {
    const m = document.createElement('div');
    m.id = '__smc-modal';
    m.style.cssText =
      'position:fixed;z-index:1000000;background:#1e1e2e;border:1px solid #8b5cf6;' +
      'border-radius:10px;padding:12px;box-shadow:0 8px 32px rgba(0,0,0,.4);' +
      'font-family:system-ui,-apple-system,sans-serif;display:none;width:280px;';
    m.innerHTML =
      '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">' +
        '<div style="width:8px;height:8px;border-radius:50%;background:#8b5cf6;"></div>' +
        '<span style="color:#cdd6f4;font-size:12px;font-weight:600;">Add a comment</span>' +
        '<span style="color:#6c7086;font-size:11px;margin-left:auto;">Esc = skip</span>' +
      '</div>' +
      '<textarea id="__smc-input" rows="3" placeholder="What\\'s wrong? What should change?"' +
        ' style="width:100%;box-sizing:border-box;background:#313244;border:1px solid #45475a;' +
        'border-radius:6px;color:#cdd6f4;font-family:system-ui,-apple-system,sans-serif;' +
        'font-size:13px;padding:8px;resize:vertical;outline:none;"></textarea>' +
      '<div style="display:flex;gap:6px;margin-top:8px;justify-content:flex-end;">' +
        '<button id="__smc-skip" style="background:transparent;border:1px solid #45475a;' +
          'border-radius:6px;color:#6c7086;font-size:12px;padding:4px 12px;cursor:pointer;">Skip</button>' +
        '<button id="__smc-save" style="background:#8b5cf6;border:none;border-radius:6px;' +
          'color:#fff;font-size:12px;font-weight:600;padding:4px 12px;cursor:pointer;">Save</button>' +
      '</div>';
    document.body.appendChild(m);

    m.querySelector('#__smc-save').addEventListener('click', function() { submitComment(false); });
    m.querySelector('#__smc-skip').addEventListener('click', function() { submitComment(true); });
    m.querySelector('#__smc-input').addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(false); }
      else if (e.key === 'Escape') { e.preventDefault(); submitComment(true); }
    });
    return m;
  }

  function showModal(data, clear, x, y) {
    if (!modal) modal = createModal();
    pendingClick = data;
    pendingClear = clear;
    var inp = modal.querySelector('#__smc-input');
    inp.value = '';
    var mw = 280, mh = 200;
    var left = Math.min(x + 12, window.innerWidth - mw - 16);
    var top = Math.min(y + 12, window.innerHeight - mh - 16);
    modal.style.left = Math.max(16, left) + 'px';
    modal.style.top = Math.max(16, top) + 'px';
    modal.style.display = 'block';
    setTimeout(function() { inp.focus(); }, 50);
  }

  function submitComment(skip) {
    if (!pendingClick || !modal) return;
    var inp = modal.querySelector('#__smc-input');
    var comment = skip ? '' : (inp.value || '').trim();
    pendingClick.comment = comment || null;
    save(pendingClick, pendingClear);
    modal.style.display = 'none';
    pendingClick = null;
    pendingClear = false;
  }

  function isModalOpen() {
    return modal && modal.style.display !== 'none';
  }

  // --- Selector helpers ---

  function getSelector(el) {
    if (el.id) return '#' + el.id;
    var sel = el.tagName.toLowerCase();
    if (el.classList.length) sel += '.' + Array.from(el.classList).join('.');
    var parent = el.parentElement;
    if (parent) {
      var sibs = Array.from(parent.children).filter(function(c) { return c.tagName === el.tagName; });
      if (sibs.length > 1) sel += ':nth-of-type(' + (sibs.indexOf(el) + 1) + ')';
    }
    return sel;
  }

  function getFullSelector(el) {
    var parts = [];
    var cur = el;
    while (cur && cur !== document.body) { parts.unshift(getSelector(cur)); cur = cur.parentElement; }
    return parts.join(' > ');
  }

  // --- Framework detection ---

  function getSvelteComponent(el) {
    if (el.__svelte_meta) {
      return {
        framework: 'svelte',
        name: (el.__svelte_meta.loc && el.__svelte_meta.loc.file)
          ? el.__svelte_meta.loc.file.split('/').pop().replace('.svelte', '') : 'Unknown',
        file: (el.__svelte_meta.loc && el.__svelte_meta.loc.file) || 'Unknown'
      };
    }
    var dc = el.getAttribute('data-component');
    if (dc) return { framework: 'svelte', name: dc, file: 'Unknown' };
    var sc = Array.from(el.classList).find(function(c) { return c.startsWith('svelte-'); });
    if (sc) return { framework: 'svelte', name: 'Unknown (' + sc + ')', file: 'Unknown' };
    return null;
  }

  function getReactComponent(el) {
    // React fibers are stored as __reactFiber$xxx or __reactInternalInstance$xxx
    var fiberKey = Object.keys(el).find(function(k) {
      return k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$');
    });
    if (!fiberKey) return null;
    var fiber = el[fiberKey];
    // Walk up the fiber tree to find the nearest user component (non-Host)
    var node = fiber;
    while (node) {
      if (typeof node.type === 'function' || typeof node.type === 'object') {
        var name = (node.type && (node.type.displayName || node.type.name)) || null;
        if (name) {
          // Try to get source from _debugSource
          var file = (node._debugSource && node._debugSource.fileName) || 'Unknown';
          return { framework: 'react', name: name, file: file };
        }
      }
      node = node.return;
    }
    return null;
  }

  function getVueComponent(el) {
    // Vue 3: __vueParentComponent
    var vue3 = el.__vueParentComponent;
    if (vue3) {
      var name = (vue3.type && (vue3.type.name || vue3.type.__name)) || 'Unknown';
      var file = (vue3.type && vue3.type.__file) || 'Unknown';
      return { framework: 'vue', name: name, file: file };
    }
    // Vue 2: __vue__
    var vue2 = el.__vue__;
    if (vue2) {
      var n = vue2.$options && (vue2.$options.name || vue2.$options._componentTag) || 'Unknown';
      var f = (vue2.$options && vue2.$options.__file) || 'Unknown';
      return { framework: 'vue', name: n, file: f };
    }
    return null;
  }

  function getFrameworkComponent(el) {
    return getSvelteComponent(el) || getReactComponent(el) || getVueComponent(el) || null;
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

  // --- Parent chain ---

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
        component: getFrameworkComponent(cur)
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
      if (a.name.startsWith('data-v-')) continue; // Vue scoped id noise
      attrs[a.name] = a.value;
    }
    return attrs;
  }

  // --- Capture ---

  function captureElement(el) {
    var rect = el.getBoundingClientRect();
    return {
      clickId: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      timestamp: new Date().toISOString(),
      tagName: el.tagName.toLowerCase(),
      elementId: el.id || null,
      classList: Array.from(el.classList),
      selector: getFullSelector(el),
      textContent: (el.textContent || '').slice(0, 500) || null,
      innerText: (el.innerText || '').slice(0, 500) || null,
      boundingBox: {
        x: Math.round(rect.x), y: Math.round(rect.y),
        width: Math.round(rect.width), height: Math.round(rect.height)
      },
      component: getFrameworkComponentFromChain(el),
      parentChain: getParentChain(el),
      attributes: getAttributes(el),
      url: window.location.href,
      viewportSize: { width: window.innerWidth, height: window.innerHeight }
    };
  }

  // --- Send to server ---

  function save(data, clear) {
    fetch('/__see-my-clicks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: data, clear: !!clear })
    }).then(function(r) { return r.json(); }).then(function(res) {
      var name = (data.component && data.component.name) || data.tagName;
      flash(res.count === 1 ? 'Clicked: ' + name : 'Clicked: ' + name + ' (' + res.count + ' items saved)');
    }).catch(function(err) {
      console.error('[see-my-clicks] error:', err);
      flash('Error: ' + err.message, 3000);
    });
  }

  // --- Event listeners ---

  document.addEventListener('click', function(e) {
    if (isModalOpen()) {
      if (modal && !modal.contains(e.target)) {
        submitComment(true);
        if (!e.altKey) return;
      } else {
        return;
      }
    }
    if (!e.altKey) return;
    e.preventDefault();
    e.stopPropagation();
    var data = captureElement(e.target);
    var clear = e.shiftKey;
    showModal(data, clear, e.clientX, e.clientY);
  }, true);

  document.addEventListener('mousemove', function(e) {
    if (!e.altKey) { highlight.style.display = 'none'; return; }
    var t = document.elementFromPoint(e.clientX, e.clientY);
    if (t && t !== highlight && t !== overlay && t !== status) {
      var r = t.getBoundingClientRect();
      highlight.style.display = 'block';
      highlight.style.left = r.left + 'px';
      highlight.style.top = r.top + 'px';
      highlight.style.width = r.width + 'px';
      highlight.style.height = r.height + 'px';
    }
  });

  document.addEventListener('keyup', function(e) {
    if (e.key === 'Alt') highlight.style.display = 'none';
  });

  flash('See My Clicks ready \\u2014 Alt+Click to add, Shift+Alt+Click to start fresh');
  console.log('[see-my-clicks] Initialized. Alt+Click any element to capture it.');
})();
`;
}
