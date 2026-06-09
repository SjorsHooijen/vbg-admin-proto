/* ============================================================
   VBG — Company (tenant) detail page controller
   - reads ?c=<tenant id> (falls back to first company)
   - builds detail via window.VBG_COMPANY_DETAIL
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
  function initials(name) {
    var p = String(name).replace(/[^A-Za-z0-9 &+]/g, '').trim().split(/[ &+]+/).filter(Boolean);
    if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
    return (p[0][0] + p[1][0]).toUpperCase();
  }

  var STATUS_BADGE = { active: 'active', trial: 'review', invited: 'draft', suspended: 'warning', churned: 'deprecated' };
  var STATUS_LABEL = { active: 'Active', trial: 'Trial', invited: 'Invited', suspended: 'Suspended', churned: 'Churned' };

  function indGlyph(ind) {
    return {
      developer: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/>',
      contractor: '<path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><path d="M14 6a6 6 0 0 1 6 6v3"/>',
      engineering: '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/>',
      manufacturer: '<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/>',
      architect: '<path d="m12.99 6.74 1.93 3.44"/><path d="M19.136 12a10 10 0 0 1-14.271 0"/><path d="m21 21-2.16-3.84"/><path d="m3 21 8.02-14.26"/><circle cx="12" cy="5" r="2"/>'
    }[ind] || '';
  }

  var NAV = [
    { id: 'overview', label: 'Overview', icon: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4"/><path d="M12 8h.01"/>' },
    { id: 'members',  label: 'Members & seats', icon: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
    { id: 'projects', label: 'Projects', icon: '<path d="M4 20V8.5a1 1 0 0 1 .4-.8l6-4.5a1 1 0 0 1 1.2 0l6 4.5a1 1 0 0 1 .4.8V20"/><path d="M3 20h18"/><path d="M9 20v-5h6v5"/>' },
    { id: 'billing',  label: 'Plan & billing', icon: '<rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/>' },
    { id: 'activity', label: 'Activity', icon: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>' }
  ];

  ready(function () {
    var C = window.VBG_COMPANIES, DB = window.VBG_COMPANY_DETAIL, T = window.CompanyDetailTabs;
    if (!C || !DB || !T) return;

    var params = new URLSearchParams(location.search);
    var tid = params.get('c') || params.get('t');
    var company = (tid && C.DATA.filter(function (x) { return x.tid === tid; })[0]) || C.DATA[0];
    var detail = DB.build(company);

    document.title = 'VBG — ' + company.name;

    /* ---------- header ---------- */
    var statusBadge = STATUS_BADGE[company.status] || company.status;
    var statusLabel = STATUS_LABEL[company.status] || company.status;
    var pct = detail.counts.seatsTotal ? Math.round(detail.counts.seatsUsed / detail.counts.seatsTotal * 100) : 0;

    document.getElementById('rd-header').innerHTML =
      '<div class="rd-crumbs">'
      +  '<a href="Companies.html">' + ico('<path d="m15 18-6-6 6-6"/>', 14) + 'Companies</a>'
      +  '<span class="sep">/</span>'
      +  '<span class="cur">' + esc(company.name) + '</span>'
      + '</div>'
      + '<div class="rd-htop">'
      +  '<span class="rd-tile cd-tile">' + esc(initials(company.name)) + '</span>'
      +  '<div class="rd-htext">'
      +    '<div class="rd-title-row"><h1>' + esc(company.name) + '</h1><span class="rd-code">' + esc(company.tid) + '</span>'
      +      '<span class="badge ' + statusBadge + '"><span class="dot"></span>' + statusLabel + '</span></div>'
      +    '<div class="rd-meta">'
      +      '<span class="mi">' + ico(indGlyph(company.industry), 14) + '<b>' + esc(DB.INDUSTRY_LABEL[company.industry] || company.industry) + '</b></span>'
      +      '<span class="mdot"></span>'
      +      '<span class="mi"><span class="ico">' + ico('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>', 14) + '</span><b style="font-family:var(--font-mono)">' + esc(company.domain) + '</b></span>'
      +      '<span class="mdot"></span>'
      +      '<span class="mi"><span class="ico">' + ico('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>', 14) + '</span>' + esc(detail.identity.regionLabel) + '</span>'
      +      '<span class="mdot"></span>'
      +      '<span class="mi"><span class="ico">' + ico('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>', 14) + '</span>' + detail.counts.seatsUsed + ' / ' + detail.counts.seatsTotal + ' seats</span>'
      +      '<span class="mdot"></span>'
      +      '<span class="mi"><span class="ico">' + ico('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>', 14) + '</span>Active <b>' + DB.relLabel(company.lastActive) + '</b></span>'
      +    '</div>'
      +  '</div>'
      +  '<div class="rd-actions">'
      +    '<button class="rd-btn" id="cd-msg"><span class="ico">' + ico('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>', 15) + '</span>Message owner</button>'
      +    (company.status === 'suspended'
        ? '<button class="rd-btn primary" id="cd-toggle"><span class="ico">' + ico('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>', 15) + '</span>Restore access</button>'
        : '<button class="rd-btn" id="cd-toggle"><span class="ico">' + ico('<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>', 15) + '</span>Suspend access</button>')
      +    '<button class="rd-btn primary" id="cd-open"><span class="ico">' + ico('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>', 15) + '</span>Open workspace</button>'
      +  '</div>'
      + '</div>';

    var msg = document.getElementById('cd-msg'); if (msg) msg.addEventListener('click', function () {});
    var open = document.getElementById('cd-open'); if (open) open.addEventListener('click', function () {});
    var tog = document.getElementById('cd-toggle'); if (tog) tog.addEventListener('click', function () {});

    /* ---------- nav counts ---------- */
    var counts = {
      members: detail.counts.members,
      projects: detail.counts.projects,
      billing: detail.counts.invoices,
      activity: detail.activity.length
    };

    var navEl = document.getElementById('rd-nav');
    navEl.innerHTML = '<div class="nlabel">Tenant</div>' + NAV.map(function (n) {
      var c = counts[n.id] != null ? '<span class="ncount">' + counts[n.id] + '</span>' : '';
      return '<button class="rd-nav-item" data-tab="' + n.id + '"><span class="ico">' + ico(n.icon, 18) + '</span>' + n.label + c + '</button>';
    }).join('');

    /* ---------- routing ---------- */
    var contentEl = document.getElementById('rd-content');
    var STORE = 'vbg-company-tab';
    var valid = NAV.map(function (n) { return n.id; });

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
