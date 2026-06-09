/* ============================================================
   VBG — reusable sidebar web component
   Usage:  <vbg-sidebar active="projects"></vbg-sidebar>
   active: "dashboard" | "projects" | "recipes"

   Renders into LIGHT DOM (not shadow) so it is captured by the
   screenshot / PDF / PPTX export pipeline. Styles are scoped
   under `vbg-sidebar` and injected once into <head>.
   Relies on the global design tokens (styles/tokens.css).
   ============================================================ */
(function () {
  function assetUrl(p) { return (window.__resources && window.__resources[p]) || p; }
  const NAV = [
    // ── Group 1 ──
    [
      {
        key: 'dashboard', label: 'Dashboard', href: 'Dashboard.html',
        icon: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>'
      }
    ],
    // ── Group 2: Tenant management ──
    [
      {
        key: 'companies', label: 'Companies', href: 'Companies.html',
        icon: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>'
      }
    ],
    // ── Group 3: Content & projects ──
    [
      {
        key: 'recipes', label: 'Recipes', href: 'Recipes.html',
        icon: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M8 7h6"/><path d="M8 11h8"/>'
      },
      {
        key: 'products', label: 'Products', href: 'Products.html',
        icon: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>'
      }
    ],
    // ── Group 4: Operations ──
    [
      {
        key: 'integrations', label: 'Integrations', href: 'Integrations.html',
        icon: '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/><path d="M12 17a9 9 0 0 0 9-3.6"/><path d="M12 17a9 9 0 0 1-9-3.6"/>'
      },
      {
        key: 'billing', label: 'Billing & Licensing', href: 'Billing.html',
        icon: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>'
      },
      {
        key: 'audit', label: 'Audit & Compliance', href: 'Audit.html',
        icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>'
      }
    ],
    // ── Group 5: System ──
    [
      {
        key: 'system', label: 'System', href: 'System.html',
        icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'
      },
    ]
  ];

  const STYLE = `
    vbg-sidebar {
      width: 252px; flex: 0 0 252px;
      background: var(--bg-app);
      display: flex; flex-direction: column; min-height: 0;
      font-family: var(--font-sans);
    }
    vbg-sidebar .sb-brand {
      display: flex; align-items: center; gap: 11px;
      padding: 0 20px 0 16px; height: 64px;
    }
    vbg-sidebar .sb-brand img { width: 34px; height: 34px; object-fit: contain; display: block; }
    vbg-sidebar .sb-brand .word {
      font: var(--text-label); font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.14em;
      color: var(--fg1); line-height: 1;
    }
    vbg-sidebar .sb-nav { padding: 16px 12px; display: flex; flex-direction: column; gap: 2px; }
    vbg-sidebar .nav-group { display: flex; flex-direction: column; gap: 2px; }
    vbg-sidebar .nav-divider { height: 8px; }
    vbg-sidebar .group-label {
      font: var(--text-label); text-transform: uppercase;
      letter-spacing: var(--tracking-overline); color: var(--fg4);
      padding: 4px 12px 8px;
    }
    vbg-sidebar .nav-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 12px; border-radius: var(--r-sm);
      font: var(--text-body-strong); color: var(--fg2);
      text-decoration: none; cursor: pointer;
      transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
    }
    vbg-sidebar .nav-item .ico { display: inline-flex; color: var(--fg3); transition: color var(--dur-fast) var(--ease-out); }
    vbg-sidebar .nav-item .ico svg { display: block; }
    vbg-sidebar .nav-item:hover { background: var(--bg-hover); color: var(--fg1); }
    vbg-sidebar .nav-item:hover .ico { color: var(--fg2); }
    vbg-sidebar .nav-item.active { background: var(--bg-selected); color: var(--fg-accent); }
    vbg-sidebar .nav-item.active .ico { color: var(--vbg-amber); }
    vbg-sidebar .count {
      margin-left: auto; font: var(--text-mono-sm); color: var(--fg4);
      background: var(--bg-sunken); border: 1px solid var(--border-subtle);
      border-radius: var(--r-xs); padding: 1px 6px;
    }
    vbg-sidebar .nav-item.active .count { color: var(--fg-accent); background: var(--vbg-amber-100); border-color: transparent; }
    vbg-sidebar .sb-profile {
      margin-top: auto;
      padding: 14px 16px;
      display: flex; align-items: center; gap: 12px;
      border-radius: var(--r-sm);
      transition: background var(--dur-fast) var(--ease-out);
    }
    vbg-sidebar .sb-profile:hover { background: var(--bg-hover); }
    vbg-sidebar .sb-profile.active { background: var(--bg-selected); }
    vbg-sidebar .sb-profile.active .avatar { box-shadow: 0 0 0 2px var(--vbg-amber), 0 1px 2px rgba(184,111,0,.30); }
    vbg-sidebar .sb-profile.active .name { color: var(--fg-accent); }
    vbg-sidebar .sb-profile.active .role { color: var(--vbg-amber-600); }
    vbg-sidebar .avatar {
      width: 40px; height: 40px; flex: 0 0 40px; border-radius: var(--r-full);
      background: var(--vbg-amber); color: var(--fg-inverse);
      display: grid; place-items: center;
      font: var(--text-body-strong); font-weight: 600; letter-spacing: 0.02em;
      box-shadow: 0 1px 2px rgba(184,111,0,.30);
    }
    vbg-sidebar .meta { min-width: 0; line-height: 1.3; }
    vbg-sidebar .name { font: var(--text-body-strong); color: var(--fg1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    vbg-sidebar .role { font: var(--text-caption); color: var(--fg3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  `;

  function injectStyle() {
    if (document.getElementById('vbg-sidebar-style')) return;
    const s = document.createElement('style');
    s.id = 'vbg-sidebar-style';
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function itemHtml(n, active) {
    var isActive = n.key === active ? ' active' : '';
    var count = n.count ? '<span class="count">' + n.count + '</span>' : '';
    return ''
      + '<a class="nav-item' + isActive + '" href="' + n.href + '">'
      +   '<span class="ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + n.icon + '</svg></span>'
      +   n.label
      +   count
      + '</a>';
  }

  function navHtml(active) {
    return NAV.map(function (group, i) {
      var items = group.map(function (n) { return itemHtml(n, active); }).join('');
      var divider = i > 0 ? '<div class="nav-divider" aria-hidden="true"></div>' : '';
      return divider + '<div class="nav-group">' + items + '</div>';
    }).join('');
  }

  class VbgSidebar extends HTMLElement {
    static get observedAttributes() { return ['active']; }
    connectedCallback() { injectStyle(); this.render(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }
    render() {
      const active = this.getAttribute('active') || '';
      this.innerHTML = ''
        + '<div class="sb-brand">'
        +   '<img src="' + assetUrl('assets/vbg-logo-mark-filled.png') + '" alt="VBG">'
        +   '<span class="word">Admin</span>'
        + '</div>'
        + '<nav class="sb-nav">'
        +   navHtml(active)
        + '</nav>'
        + '<a class="sb-profile' + (active === 'profile' ? ' active' : '') + '" href="User Profile.html" style="text-decoration:none;">'
        +   '<div class="avatar">SK</div>'
        +   '<div class="meta">'
        +     '<div class="name">Sanne Koenders</div>'
        +     '<div class="role">Structural engineer</div>'
        +   '</div>'
        + '</a>';
    }
  }

  if (!customElements.get('vbg-sidebar')) {
    customElements.define('vbg-sidebar', VbgSidebar);
  }
})();
