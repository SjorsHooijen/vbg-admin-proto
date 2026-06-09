/* ============================================================
   VBG — Recipe detail page controller
   - reads ?r=<recipe code> (falls back to first recipe)
   - builds detail via window.VBG_RECIPE_DETAIL
   - renders header + left navigation, routes to tab renderers
   - persists active tab in the URL hash + localStorage
   ============================================================ */
(function () {
  'use strict';
  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  function ico(path, size) {
    size = size || 18;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function countNodes(n) { var c = 0; (function walk(x) { x.children.forEach(function (k) { c++; walk(k); }); })(n); return c; }

  var NAV = [
    { id: 'general',    label: 'General',    icon: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4"/><path d="M12 8h.01"/>' },
    { id: 'structure',  label: 'Structure',  icon: '<path d="M5 3v16a2 2 0 0 0 2 2h12"/><rect x="9" y="3" width="11" height="5" rx="1"/><rect x="11" y="13" width="9" height="5" rx="1"/>' },
    { id: 'rules',      label: 'Rules',      icon: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>' },
    { id: 'parameters', label: 'Parameters', icon: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>' },
    { id: 'outputs',    label: 'Outputs',    icon: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>' },
    { id: 'projects',   label: 'Projects',   icon: '<path d="M4 20V8.5a1 1 0 0 1 .4-.8l6-4.5a1 1 0 0 1 1.2 0l6 4.5a1 1 0 0 1 .4.8V20"/><path d="M3 20h18"/><path d="M9 20v-5h6v5"/>' },
    { id: 'versions',   label: 'Versions',   icon: '<path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/>' },
    { id: 'activity',   label: 'Activity',   icon: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>' }
  ];

  ready(function () {
    var R = window.VBG_RECIPES, D = window.VBG_RECIPE_DETAIL, T = window.RecipeDetailTabs;
    if (!R || !D || !T) return;

    // resolve recipe from ?r=
    var params = new URLSearchParams(location.search);
    var code = params.get('r');
    var recipe = (code && R.DATA.filter(function (x) { return x.code === code; })[0]) || R.DATA[0];
    var detail = D.build(recipe);
    var CATS = R.CATEGORIES;

    document.title = 'VBG — ' + recipe.name;

    /* ---------- header ---------- */
    var cat = CATS[recipe.category] || { label: recipe.category, glyph: '' };
    var statusMap = { published: 'published', draft: 'draft', archived: 'archived' };
    var statusLabel = R.STATUS_LABEL[recipe.status] || recipe.status;
    var ownerLabel = recipe.owner === 'vbg' ? 'VBG platform' : 'Company';

    document.getElementById('rd-header').innerHTML =
      '<div class="rd-crumbs">'
      +  '<a href="Recipes.html">' + ico('<path d="m15 18-6-6 6-6"/>', 14) + 'Recipes</a>'
      +  '<span class="sep">/</span>'
      +  '<span class="cur">' + esc(recipe.name) + '</span>'
      + '</div>'
      + '<div class="rd-htop">'
      +  '<span class="rd-tile">' + ico(cat.glyph, 26) + '</span>'
      +  '<div class="rd-htext">'
      +    '<div class="rd-title-row"><h1>' + esc(recipe.name) + '</h1><span class="rd-code">' + esc(recipe.code) + '</span>'
      +      '<span class="badge ' + statusMap[recipe.status] + '"><span class="dot"></span>' + statusLabel + '</span></div>'
      +    '<div class="rd-meta">'
      +      '<span class="mi">' + ico('<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>', 14) + '<b>' + esc(cat.label) + '</b></span>'
      +      '<span class="mdot"></span>'
      +      '<span class="mi"><span class="ico">' + ico('<path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/>', 14) + '</span>Version <b style="font-family:var(--font-mono)">' + esc(recipe.version) + '</b></span>'
      +      '<span class="mdot"></span>'
      +      '<span class="mi"><span class="ico">' + ico('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>', 14) + '</span>' + esc(ownerLabel) + '</span>'
      +      '<span class="mdot"></span>'
      +      '<span class="mi"><span class="ico">' + ico('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>', 14) + '</span>Updated <b>' + R.fmtDate(recipe.updated) + '</b></span>'
      +      '<span class="mdot"></span>'
      +      '<span class="mi">' + (recipe.usage ? '<b>' + recipe.usage + '</b> project' + (recipe.usage === 1 ? '' : 's') : 'Unused') + '</span>'
      +    '</div>'
      +  '</div>'
      +  '<div class="rd-actions">'
      +    '<button class="rd-btn" id="rd-dup"><span class="ico">' + ico('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>', 15) + '</span>Duplicate</button>'
      +    '<button class="rd-btn primary" id="rd-open"><span class="ico">' + ico('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>', 15) + '</span>Open in editor</button>'
      +  '</div>'
      + '</div>';

    document.getElementById('rd-open').addEventListener('click', function () { location.href = '#'; });
    document.getElementById('rd-dup').addEventListener('click', function () { location.href = 'Recipes.html'; });

    /* ---------- counts for nav ---------- */
    var counts = {
      structure: countNodes(detail.tree),
      rules: detail.rules.length,
      parameters: detail.params.length,
      outputs: detail.outputs.on.length,
      projects: detail.projects.length,
      versions: detail.versions.length,
      activity: detail.activity.length
    };

    /* ---------- nav ---------- */
    var navEl = document.getElementById('rd-nav');
    navEl.innerHTML = '<div class="nlabel">Recipe</div>' + NAV.map(function (n) {
      var c = counts[n.id] != null ? '<span class="ncount">' + counts[n.id] + '</span>' : '';
      return '<button class="rd-nav-item" data-tab="' + n.id + '"><span class="ico">' + ico(n.icon, 18) + '</span>' + n.label + c + '</button>';
    }).join('');

    /* ---------- routing ---------- */
    var contentEl = document.getElementById('rd-content');
    var ctx = { recipe: recipe, detail: detail };
    var STORE = 'vbg-recipe-tab';
    var valid = NAV.map(function (n) { return n.id; });

    function currentTab() {
      var h = (location.hash || '').replace('#', '');
      if (valid.indexOf(h) >= 0) return h;
      var s = localStorage.getItem(STORE);
      return valid.indexOf(s) >= 0 ? s : 'general';
    }

    function renderTab(id) {
      var tab = T[id]; if (!tab) return;
      navEl.querySelectorAll('.rd-nav-item').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tab') === id); });
      contentEl.innerHTML = tab.render(detail);
      contentEl.scrollTop = 0;
      ctx.rerenderTab = function () { renderTab(id); };
      if (tab.wire) tab.wire(contentEl, detail, ctx);
      localStorage.setItem(STORE, id);
      if (location.hash.replace('#', '') !== id) history.replaceState(null, '', '#' + id);
    }

    navEl.addEventListener('click', function (e) {
      var b = e.target.closest('.rd-nav-item'); if (!b) return;
      renderTab(b.getAttribute('data-tab'));
    });
    window.addEventListener('hashchange', function () { renderTab(currentTab()); });

    renderTab(currentTab());
  });
})();
