/* ============================================================
   VBG — Product detail page controller
   - reads ?p=<product code> (falls back to first product)
   - builds detail via window.VBG_PRODUCT_DETAIL
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

  var CATS = { structural: 'Structural', facade: 'Façade', mep: 'MEP', production: 'Production' };
  var STATUS_LABEL = { active: 'Active', draft: 'Draft', deprecated: 'Deprecated' };
  function catGlyph(cat) {
    return {
      structural: '<path d="M4 22V4a1 1 0 0 1 1-1h6v19"/><path d="M11 7h8a1 1 0 0 1 1 1v14"/><path d="M11 11h9"/><path d="M11 15h9"/><path d="M11 19h9"/>',
      facade: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 9v12"/>',
      mep: '<circle cx="6" cy="19" r="2.5"/><path d="M8.5 19h8a3.5 3.5 0 0 0 0-7h-9a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="2.5"/>',
      production: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>'
    }[cat] || '';
  }

  var NAV = [
    { id: 'overview',     label: 'Overview',     icon: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4"/><path d="M12 8h.01"/>' },
    { id: 'usage',        label: 'Usage',        icon: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>' },
    { id: 'versions',     label: 'Versions',     icon: '<path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/>' },
    { id: 'availability', label: 'Availability', icon: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>' },
    { id: 'governance',   label: 'Governance',   icon: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>' },
    { id: 'audit',        label: 'Audit',        icon: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>' }
  ];

  ready(function () {
    var P = window.VBG_PRODUCTS, DB = window.VBG_PRODUCT_DETAIL, T = window.ProductDetailTabs;
    if (!P || !DB || !T) return;

    var params = new URLSearchParams(location.search);
    var code = params.get('p');
    var product = (code && P.DATA.filter(function (x) { return x.code === code; })[0]) || P.DATA[0];
    var detail = DB.build(product);

    document.title = 'VBG — ' + product.name;

    /* ---------- header ---------- */
    var statusLabel = STATUS_LABEL[product.status] || product.status;
    document.getElementById('rd-header').innerHTML =
      '<div class="rd-crumbs">'
      +  '<a href="Products.html">' + ico('<path d="m15 18-6-6 6-6"/>', 14) + 'Products</a>'
      +  '<span class="sep">/</span>'
      +  '<span class="cur">' + esc(product.name) + '</span>'
      + '</div>'
      + '<div class="rd-htop">'
      +  '<span class="rd-tile">' + ico(catGlyph(product.category), 26) + '</span>'
      +  '<div class="rd-htext">'
      +    '<div class="rd-title-row"><h1>' + esc(product.name) + '</h1><span class="rd-code">' + esc(product.code) + '</span>'
      +      '<span class="badge ' + product.status + '"><span class="dot"></span>' + statusLabel + '</span></div>'
      +    '<div class="rd-meta">'
      +      '<span class="mi">' + ico(catGlyph(product.category), 14) + '<b>' + esc(CATS[product.category] || product.category) + '</b></span>'
      +      '<span class="mdot"></span>'
      +      '<span class="mi"><span class="ico">' + ico('<path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/>', 14) + '</span>Version <b style="font-family:var(--font-mono)">' + esc(product.version) + '</b></span>'
      +      '<span class="mdot"></span>'
      +      '<span class="mi"><span class="ico">' + ico('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>', 14) + '</span>' + esc(product.manufacturer) + '</span>'
      +      '<span class="mdot"></span>'
      +      '<span class="mi"><span class="ico">' + ico('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>', 14) + '</span>' + esc(detail.identity.owner) + '</span>'
      +      '<span class="mdot"></span>'
      +      '<span class="mi"><span class="ico">' + ico('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>', 14) + '</span>Updated <b>' + DB.fmtDate(product.updated) + '</b></span>'
      +    '</div>'
      +  '</div>'
      +  '<div class="rd-actions">'
      +    '<button class="rd-btn" id="pd-dup"><span class="ico">' + ico('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>', 15) + '</span>Duplicate</button>'
      +    '<button class="rd-btn primary" id="pd-edit"><span class="ico">' + ico('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>', 15) + '</span>Edit product</button>'
      +  '</div>'
      + '</div>';

    document.getElementById('pd-dup').addEventListener('click', function () { location.href = 'Products.html'; });
    document.getElementById('pd-edit').addEventListener('click', function () { /* edit flow not in scope */ });

    /* ---------- nav counts ---------- */
    var counts = {
      usage: detail.counts.recipes + detail.counts.buildingBlocks + detail.counts.projects,
      versions: detail.versions.length,
      availability: detail.availability.tenants.length,
      audit: detail.audit.length
    };

    var navEl = document.getElementById('rd-nav');
    navEl.innerHTML = '<div class="nlabel">Product</div>' + NAV.map(function (n) {
      var c = counts[n.id] != null ? '<span class="ncount">' + counts[n.id] + '</span>' : '';
      return '<button class="rd-nav-item" data-tab="' + n.id + '"><span class="ico">' + ico(n.icon, 18) + '</span>' + n.label + c + '</button>';
    }).join('');

    /* ---------- routing ---------- */
    var contentEl = document.getElementById('rd-content');
    var STORE = 'vbg-product-tab';
    var valid = NAV.map(function (n) { return n.id; });
    var ctx = { product: product, detail: detail, goTab: function (id) { renderTab(id); } };

    function currentTab() {
      var h = (location.hash || '').replace('#', '');
      if (valid.indexOf(h) >= 0) return h;
      var s = localStorage.getItem(STORE);
      return valid.indexOf(s) >= 0 ? s : 'overview';
    }

    function renderTab(id) {
      var tab = T[id]; if (!tab) return;
      navEl.querySelectorAll('.rd-nav-item').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tab') === id); });
      contentEl.innerHTML = tab.render(detail);
      contentEl.scrollTop = 0;
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
