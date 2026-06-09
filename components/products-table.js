/* ============================================================
   VBG — reusable products (catalog) table web component
   Usage:  <vbg-products-table></vbg-products-table>
   Columns: icon · product (name + code + spec) · category ·
            manufacturer (name + SKU) · status · usage · updated ·
            actions (kebab: duplicate / deprecate · restore)

   Products are manufacturable building components — the physical
   catalog items that recipes draw from. This is an overview /
   management surface: rows do NOT navigate to a detail page; the
   kebab carries the catalog-maintenance actions.

   Renders into LIGHT DOM so screenshots / PDF / PPTX capture it.
   Styles scoped under `vbg-products-table`, injected once.
   Relies on the global design tokens (styles/tokens.css).

   Data + facet helpers are exposed on window.VBG_PRODUCTS so the
   page can build the filter sidebar and counts from one source.

   The component reads `this.filters` (set via setFilters({...})) and
   dispatches a `productsrender` CustomEvent { visible, total } after
   every render so the page can update its footer / result count.
   ============================================================ */
(function () {
  /* "today" for relative date filtering — keep in sync with project date */
  const TODAY = new Date('2026-06-09T00:00:00');

  /* discipline / category glyphs (Lucide-style line icons) */
  const CATEGORIES = {
    structural: { label: 'Structural', glyph: '<path d="M4 22V4a1 1 0 0 1 1-1h6v19"/><path d="M11 7h8a1 1 0 0 1 1 1v14"/><path d="M11 11h9"/><path d="M11 15h9"/><path d="M11 19h9"/>' },
    facade:     { label: 'Façade',     glyph: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 9v12"/>' },
    mep:        { label: 'MEP',        glyph: '<circle cx="6" cy="19" r="2.5"/><path d="M8.5 19h8a3.5 3.5 0 0 0 0-7h-9a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="2.5"/>' },
    production: { label: 'Production', glyph: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>' }
  };

  const STATUS_LABEL = { active: 'Active', draft: 'Draft', deprecated: 'Deprecated' };
  const MATERIAL_LABEL = {
    concrete: 'Concrete', steel: 'Steel', timber: 'Timber',
    aluminium: 'Aluminium', masonry: 'Masonry', composite: 'Composite'
  };

  /* usage = number of recipes currently referencing the product */
  const PRODUCTS = [
    /* ── Structural ── */
    { code: 'PRD-101', name: 'Precast RC column 400',       desc: '400 × 400 mm square section · C45/55 · pinned or fixed base', category: 'structural', manufacturer: 'Betonson',       sku: 'BTS-C400',     material: 'concrete',  status: 'active',     version: 'v2.4', updated: '2026-05-28', usage: 12, tags: ['NEN-EN', 'KOMO', 'CE'] },
    { code: 'PRD-118', name: 'Hollow-core slab HC265',      desc: '265 mm prestressed · spans to 12.0 m · 1200 mm modules',      category: 'structural', manufacturer: 'VBI',            sku: 'VBI-HC265',    material: 'concrete',  status: 'active',     version: 'v3.1', updated: '2026-05-30', usage: 18, tags: ['NEN-EN', 'CE', 'KOMO'] },
    { code: 'PRD-122', name: 'Hollow-core slab HC320',      desc: '320 mm prestressed · spans to 16.2 m · acoustic rated',        category: 'structural', manufacturer: 'VBI',            sku: 'VBI-HC320',    material: 'concrete',  status: 'active',     version: 'v3.1', updated: '2026-05-12', usage: 9,  tags: ['NEN-EN', 'CE'] },
    { code: 'PRD-134', name: 'Precast inverted-T beam',     desc: 'Variable depth 400–800 mm · carries hollow-core slabs',        category: 'structural', manufacturer: 'Dycore',         sku: 'DYC-ITB',      material: 'concrete',  status: 'active',     version: 'v1.8', updated: '2026-04-22', usage: 7,  tags: ['NEN-EN', 'CE'] },
    { code: 'PRD-140', name: 'Foundation pile Ø450',        desc: 'Prefab driven pile · Ø450 mm · 8–20 m lengths',                category: 'structural', manufacturer: 'Betonson',       sku: 'BTS-FP450',    material: 'concrete',  status: 'active',     version: 'v2.0', updated: '2026-03-30', usage: 6,  tags: ['NEN-EN', 'KOMO'] },
    { code: 'PRD-147', name: 'Precast shear wall panel',    desc: '200 mm · storey-height · cast-in steel connections',           category: 'structural', manufacturer: 'Betonson',       sku: 'BTS-SW200',    material: 'concrete',  status: 'active',     version: 'v1.5', updated: '2026-04-08', usage: 5,  tags: ['NEN-EN', 'CE'] },
    { code: 'PRD-156', name: 'Steel transfer beam HEB400',  desc: 'Hot-rolled HEB400 · S355 · transfer-level spans',              category: 'structural', manufacturer: 'ArcelorMittal',  sku: 'AM-HEB400',    material: 'steel',     status: 'active',     version: 'v1.2', updated: '2026-02-27', usage: 3,  tags: ['NEN-EN', 'CE'] },
    { code: 'PRD-160', name: 'CLT floor panel 200',         desc: '5-layer cross-laminated timber · 200 mm · spans to 7.5 m',     category: 'structural', manufacturer: 'Stora Enso',     sku: 'SE-CLT200',    material: 'timber',    status: 'draft',      version: 'v0.9', updated: '2026-06-04', usage: 0,  tags: ['FSC', 'C2C'] },

    /* ── Façade ── */
    { code: 'PRD-204', name: 'Precast sandwich panel',      desc: 'Insulated 90/100/90 · brick-faced or exposed concrete',        category: 'facade',     manufacturer: 'Betonson',       sku: 'BTS-SFP',      material: 'concrete',  status: 'active',     version: 'v2.2', updated: '2026-05-22', usage: 11, tags: ['NEN-EN', 'KOMO', 'BREEAM'] },
    { code: 'PRD-210', name: 'Unitised curtain wall CW60',  desc: '60 mm sightline · storey-height units · factory glazed',       category: 'facade',     manufacturer: 'Reynaers',       sku: 'RY-CW60',      material: 'aluminium', status: 'active',     version: 'v2.0', updated: '2026-05-02', usage: 8,  tags: ['CE', 'BREEAM'] },
    { code: 'PRD-216', name: 'Triple-glazed window unit',   desc: 'Ug 0.6 · aluminium frame · tilt-turn · factory glazed',        category: 'facade',     manufacturer: 'Reynaers',       sku: 'RY-TGW',       material: 'aluminium', status: 'active',     version: 'v1.7', updated: '2026-04-18', usage: 14, tags: ['CE', 'BREEAM'] },
    { code: 'PRD-221', name: 'Brick veneer system',         desc: 'Anchored clay veneer · 100 mm · movement-joint rules',         category: 'facade',     manufacturer: 'Wienerberger',   sku: 'WB-BV100',     material: 'masonry',   status: 'active',     version: 'v1.3', updated: '2026-03-15', usage: 6,  tags: ['NEN-EN', 'KOMO'] },
    { code: 'PRD-228', name: 'Insulated render panel',      desc: 'EPS-backed render board · 140 mm · A2 fire option',            category: 'facade',     manufacturer: 'Wienerberger',   sku: 'WB-IRP',       material: 'composite', status: 'deprecated', version: 'v1.0', updated: '2025-11-08', usage: 1,  tags: ['CE'] },
    { code: 'PRD-233', name: 'Timber-frame infill panel',   desc: 'Prefab studwork · 200 mm · breathable build-up',               category: 'facade',     manufacturer: 'Stora Enso',     sku: 'SE-TFP',       material: 'timber',    status: 'draft',      version: 'v0.8', updated: '2026-06-03', usage: 0,  tags: ['FSC'] },

    /* ── MEP ── */
    { code: 'PRD-302', name: 'Riser shaft module',          desc: 'Prefab services riser · 1200 × 800 mm · stacked per floor',    category: 'mep',        manufacturer: 'Ubbink',         sku: 'UB-RSM',       material: 'composite', status: 'active',     version: 'v2.1', updated: '2026-04-30', usage: 7,  tags: ['NEN-EN', 'KOMO'] },
    { code: 'PRD-308', name: 'Air-handling unit AHU-2000',  desc: '2000 m³/h · 85% heat recovery · roof or plant-room',           category: 'mep',        manufacturer: 'Itho Daalderop', sku: 'ID-AHU2000',   material: 'steel',     status: 'active',     version: 'v1.4', updated: '2026-04-20', usage: 5,  tags: ['CE'] },
    { code: 'PRD-314', name: 'Underfloor heating manifold', desc: 'Up to 12 loops · pre-balanced · per-zone control',             category: 'mep',        manufacturer: 'Itho Daalderop', sku: 'ID-UFH12',     material: 'composite', status: 'active',     version: 'v1.6', updated: '2026-05-10', usage: 9,  tags: ['CE', 'KOMO'] },
    { code: 'PRD-319', name: 'Sprinkler branch assembly',   desc: 'Prefab branch · coverage to 12 m²/head · CPVC',                category: 'mep',        manufacturer: 'Ubbink',         sku: 'UB-SBA',       material: 'composite', status: 'active',     version: 'v1.1', updated: '2026-02-12', usage: 4,  tags: ['NEN-EN', 'CE'] },
    { code: 'PRD-325', name: 'MVHR ventilation unit',       desc: 'Balanced mechanical · 350 m³/h · per dwelling',                category: 'mep',        manufacturer: 'Itho Daalderop', sku: 'ID-MVHR350',   material: 'composite', status: 'draft',      version: 'v0.9', updated: '2026-06-02', usage: 0,  tags: ['CE'] },

    /* ── Production (modular / prefab) ── */
    { code: 'PRD-402', name: 'Modular bathroom pod B-Line', desc: 'Fully fitted GRP pod · 1900 × 1600 mm · plug-in MEP',          category: 'production', manufacturer: 'RAS bv',         sku: 'RAS-BL',       material: 'composite', status: 'active',     version: 'v2.3', updated: '2026-05-18', usage: 8,  tags: ['KOMO', 'C2C'] },
    { code: 'PRD-408', name: 'Prefab kitchen unit',         desc: 'Pre-plumbed kitchen module · 2400 mm run · service spine',     category: 'production', manufacturer: 'RAS bv',         sku: 'RAS-KIT',      material: 'composite', status: 'active',     version: 'v1.2', updated: '2026-03-28', usage: 4,  tags: ['KOMO'] },
    { code: 'PRD-414', name: 'Prefab stair unit',           desc: 'Precast scissor stair · storey-height · cast-in nosings',      category: 'production', manufacturer: 'De Meeuw',       sku: 'DM-STR',       material: 'concrete',  status: 'active',     version: 'v1.5', updated: '2026-04-05', usage: 6,  tags: ['NEN-EN', 'CE'] },
    { code: 'PRD-420', name: 'Volumetric studio module',    desc: 'Fully-finished 3D module · 3.6 × 7.2 m · craned in',           category: 'production', manufacturer: 'De Meeuw',       sku: 'DM-VSM',       material: 'steel',     status: 'deprecated', version: 'v1.0', updated: '2025-09-14', usage: 2,  tags: ['KOMO', 'BREEAM'] }
  ];

  /* ---- helpers ---- */
  function daysAgo(iso) { return Math.round((TODAY - new Date(iso + 'T00:00:00')) / 86400000); }
  function fmtDate(iso) {
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const d = new Date(iso + 'T00:00:00');
    return d.getDate() + ' ' + M[d.getMonth()] + ' ' + d.getFullYear();
  }

  /* ---- expose data + facet helpers for the filter sidebar ---- */
  window.VBG_PRODUCTS = {
    DATA: PRODUCTS,
    CATEGORIES: CATEGORIES,
    STATUS_LABEL: STATUS_LABEL,
    MATERIAL_LABEL: MATERIAL_LABEL,
    daysAgo: daysAgo,
    fmtDate: fmtDate,
    manufacturers: function () {
      const set = {};
      PRODUCTS.forEach(function (p) { set[p.manufacturer] = (set[p.manufacturer] || 0) + 1; });
      return Object.keys(set).sort(function (a, b) { return set[b] - set[a] || a.localeCompare(b); })
        .map(function (m) { return { val: m, label: m, n: set[m] }; });
    },
    allTags: function () {
      const set = {};
      PRODUCTS.forEach(function (p) { p.tags.forEach(function (t) { set[t] = (set[t] || 0) + 1; }); });
      return Object.keys(set).sort().map(function (t) { return { tag: t, n: set[t] }; });
    },
    count: function (pred) { return PRODUCTS.filter(pred).length; }
  };

  const STYLE = `
    vbg-products-table { display: block; }
    vbg-products-table .ptable { width: 100%; border-collapse: collapse; table-layout: fixed; }
    vbg-products-table thead th {
      text-align: left; font: var(--text-label); text-transform: uppercase;
      letter-spacing: var(--tracking-overline); color: var(--fg3);
      border-bottom: 1px solid var(--border-subtle);
      padding: 12px 20px; white-space: nowrap; user-select: none;
      position: sticky; top: 0; z-index: 2; background: var(--bg-surface);
    }
    vbg-products-table thead th.th-icon { width: 64px; }
    vbg-products-table thead th.th-cat { width: 138px; }
    vbg-products-table thead th.th-mfr { width: 196px; }
    vbg-products-table thead th.th-status { width: 124px; }
    vbg-products-table thead th.th-usage { width: 128px; }
    vbg-products-table thead th.th-upd { width: 130px; }
    vbg-products-table thead th.th-actions { width: 56px; text-align: right; }
    vbg-products-table tbody tr {
      border-bottom: 1px solid var(--border-subtle);
      transition: background var(--dur-fast) var(--ease-out);
      cursor: pointer;
    }
    vbg-products-table tbody tr:last-child { border-bottom: 0; }
    vbg-products-table tbody tr:hover { background: var(--vbg-amber-50); }
    vbg-products-table tbody tr.menu-open { background: var(--vbg-amber-50); }
    vbg-products-table td { padding: 13px 20px; vertical-align: middle; }
    vbg-products-table td:first-child { padding: 13px 6px 13px 20px; }
    vbg-products-table td.actions-cell { padding: 13px 16px 13px 8px; }

    vbg-products-table .icon-tile {
      width: 38px; height: 38px; border-radius: var(--r-sm);
      background: var(--bg-sunken); border: 1px solid var(--border-subtle);
      display: grid; place-items: center; color: var(--fg2);
    }
    vbg-products-table .icon-tile svg { display: block; }

    vbg-products-table .pname { font: var(--text-body-strong); color: var(--fg1); line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    vbg-products-table .pname .pcode { font: var(--text-mono-sm); color: var(--fg4); margin-left: 8px; }
    vbg-products-table .pdesc {
      font: var(--text-caption); color: var(--fg3); margin-top: 3px; max-width: 440px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    vbg-products-table .cat-badge {
      display: inline-flex; align-items: center; gap: 7px;
      font: var(--text-label); padding: 4px 10px 4px 9px; border-radius: var(--r-full);
      background: var(--slate-100); color: var(--fg2); white-space: nowrap;
    }
    vbg-products-table .cat-badge svg { display: block; color: var(--fg3); }

    vbg-products-table .mfr { line-height: 1.3; }
    vbg-products-table .mfr .mname { font: var(--text-sm); color: var(--fg1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    vbg-products-table .mfr .msku { font: var(--text-mono-sm); color: var(--fg4); margin-top: 1px; }

    vbg-products-table .badge {
      display: inline-flex; align-items: center; gap: 6px;
      font: var(--text-label); padding: 4px 10px; border-radius: var(--r-full);
      white-space: nowrap;
    }
    vbg-products-table .badge .dot { width: 7px; height: 7px; border-radius: var(--r-full); }
    vbg-products-table .badge.active { background: var(--status-success-bg); color: var(--status-success-fg); }
    vbg-products-table .badge.active .dot { background: var(--status-success); }
    vbg-products-table .badge.draft { background: var(--status-pending-bg); color: var(--status-pending-fg); }
    vbg-products-table .badge.draft .dot { background: var(--status-pending); }
    vbg-products-table .badge.deprecated { background: var(--status-warning-bg); color: var(--status-warning-fg); }
    vbg-products-table .badge.deprecated .dot { background: var(--status-warning); }

    vbg-products-table .usage { display: flex; flex-direction: column; gap: 4px; }
    vbg-products-table .usage .uline { display: flex; align-items: baseline; gap: 6px; }
    vbg-products-table .usage .ucount { font: var(--text-mono); color: var(--fg1); }
    vbg-products-table .usage .ulabel { font: var(--text-caption); color: var(--fg4); }
    vbg-products-table .usage.unused .ucount { color: var(--fg4); }

    vbg-products-table .cell-upd { font: var(--text-sm); color: var(--fg2); white-space: nowrap; }
    vbg-products-table .cell-upd .ago { font: var(--text-caption); color: var(--fg4); display: block; margin-top: 1px; }

    vbg-products-table .actions-cell { text-align: right; position: relative; }
    vbg-products-table .kebab {
      width: 32px; height: 32px; border-radius: var(--r-sm);
      border: 1px solid transparent; background: transparent;
      display: inline-grid; place-items: center; color: var(--fg3); cursor: pointer;
      transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
    }
    vbg-products-table .kebab:hover { background: var(--bg-surface); border-color: var(--border); color: var(--fg1); }
    vbg-products-table tr:hover .kebab { color: var(--fg2); }
    vbg-products-table .kebab.active { background: var(--bg-surface); border-color: var(--border); color: var(--fg1); }
    vbg-products-table .menu {
      position: absolute; top: calc(100% - 4px); right: 20px; z-index: 40;
      min-width: 184px; background: var(--bg-raised);
      border: 1px solid var(--border); border-radius: var(--r-md);
      box-shadow: var(--shadow-pop); padding: 5px;
      display: none; flex-direction: column; gap: 1px;
    }
    vbg-products-table .menu.open { display: flex; animation: vbgPMenuIn var(--dur-fast) var(--ease-out); }
    @keyframes vbgPMenuIn { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: none; } }
    vbg-products-table .menu button {
      display: flex; align-items: center; gap: 10px; width: 100%;
      border: 0; background: transparent; cursor: pointer; text-align: left;
      font: var(--text-body); color: var(--fg1);
      padding: 8px 10px; border-radius: var(--r-sm);
      transition: background var(--dur-fast) var(--ease-out);
    }
    vbg-products-table .menu button .ico { display: inline-flex; color: var(--fg3); }
    vbg-products-table .menu button .ico svg { display: block; }
    vbg-products-table .menu button:hover { background: var(--bg-hover); }
    vbg-products-table .menu .sep { height: 1px; background: var(--border-subtle); margin: 4px 2px; }

    vbg-products-table .empty {
      padding: 64px 20px; text-align: center; color: var(--fg3);
    }
    vbg-products-table .empty .et { font: var(--text-h3); color: var(--fg2); margin-bottom: 6px; }
    vbg-products-table .empty .es { font: var(--text-sm); }
  `;

  function injectStyle() {
    if (document.getElementById('vbg-products-table-style')) return;
    const s = document.createElement('style');
    s.id = 'vbg-products-table-style';
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  const DUP_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
  const DEP_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.42 0z"/></svg>';
  const RES_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';
  const COPY_LINK_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
  const OPEN_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';

  function iconTile(cat) {
    const g = (CATEGORIES[cat] || {}).glyph || '';
    return '<span class="icon-tile"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + g + '</svg></span>';
  }

  function catBadge(cat) {
    const c = CATEGORIES[cat] || { label: cat, glyph: '' };
    return '<span class="cat-badge"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + c.glyph + '</svg>' + esc(c.label) + '</span>';
  }

  function usageCell(n) {
    if (!n) {
      return '<div class="usage unused"><div class="uline"><span class="ucount">—</span><span class="ulabel">Unused</span></div></div>';
    }
    return '<div class="usage"><div class="uline"><span class="ucount">' + n + '</span><span class="ulabel">recipe' + (n === 1 ? '' : 's') + '</span></div></div>';
  }

  function relLabel(iso) {
    const d = daysAgo(iso);
    if (d <= 0) return 'today';
    if (d === 1) return 'yesterday';
    if (d < 30) return d + ' days ago';
    if (d < 60) return 'last month';
    const mo = Math.round(d / 30);
    if (mo < 12) return mo + ' months ago';
    return 'over a year ago';
  }

  function rowHtml(p, i) {
    return ''
      + '<tr data-i="' + i + '">'
      +   '<td>' + iconTile(p.category) + '</td>'
      +   '<td><div class="pname">' + esc(p.name) + '<span class="pcode">' + esc(p.code) + '</span></div>'
      +     '<div class="pdesc">' + esc(p.desc) + '</div></td>'
      +   '<td>' + catBadge(p.category) + '</td>'
      +   '<td><div class="mfr"><div class="mname">' + esc(p.manufacturer) + '</div><div class="msku">' + esc(p.sku) + '</div></div></td>'
      +   '<td><span class="badge ' + p.status + '"><span class="dot"></span>' + STATUS_LABEL[p.status] + '</span></td>'
      +   '<td>' + usageCell(p.usage) + '</td>'
      +   '<td><span class="cell-upd">' + fmtDate(p.updated) + '<span class="ago">' + relLabel(p.updated) + '</span></span></td>'
      +   '<td class="actions-cell">'
      +     '<button class="kebab" aria-label="Product actions" data-i="' + i + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg></button>'
      +     '<div class="menu" data-menu="' + i + '">'
      +       '<button data-act="open" data-i="' + i + '"><span class="ico">' + OPEN_ICON + '</span>View product details</button>'
      +       '<div class="sep"></div>'
      +       '<button data-act="duplicate" data-i="' + i + '"><span class="ico">' + DUP_ICON + '</span>Duplicate</button>'
      +       '<button data-act="copycode" data-i="' + i + '"><span class="ico">' + COPY_LINK_ICON + '</span>Copy product code</button>'
      +       '<div class="sep"></div>'
      +       (p.status === 'deprecated'
        ? '<button data-act="restore" data-i="' + i + '"><span class="ico">' + RES_ICON + '</span>Restore to active</button>'
        : '<button data-act="deprecate" data-i="' + i + '"><span class="ico">' + DEP_ICON + '</span>Deprecate</button>')
      +     '</div>'
      +   '</td>'
      + '</tr>';
  }

  function headHtml() {
    return '<thead><tr>'
      + '<th class="th-icon"></th>'
      + '<th>Product</th>'
      + '<th class="th-cat">Category</th>'
      + '<th class="th-mfr">Manufacturer</th>'
      + '<th class="th-status">Status</th>'
      + '<th class="th-usage">Usage</th>'
      + '<th class="th-upd">Last updated</th>'
      + '<th class="th-actions"></th>'
      + '</tr></thead>';
  }

  function matches(p, f) {
    if (!f) return true;
    if (f.search) {
      const q = f.search.toLowerCase();
      const hay = (p.name + ' ' + p.desc + ' ' + p.code + ' ' + p.manufacturer + ' ' + p.sku + ' ' + p.tags.join(' ')).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    if (f.category && f.category.size && !f.category.has(p.category)) return false;
    if (f.manufacturer && f.manufacturer.size && !f.manufacturer.has(p.manufacturer)) return false;
    if (f.status && f.status.size && !f.status.has(p.status)) return false;
    if (f.material && f.material.size && !f.material.has(p.material)) return false;
    if (f.tags && f.tags.size) {
      const ok = p.tags.some(function (t) { return f.tags.has(t); });
      if (!ok) return false;
    }
    if (f.updated && f.updated !== 'any') {
      if (daysAgo(p.updated) > parseInt(f.updated, 10)) return false;
    }
    if (f.usage && f.usage !== 'any') {
      const u = p.usage;
      if (f.usage === 'unused' && u !== 0) return false;
      if (f.usage === 'low' && !(u >= 1 && u <= 5)) return false;
      if (f.usage === 'mid' && !(u >= 6 && u <= 10)) return false;
      if (f.usage === 'high' && !(u > 10)) return false;
    }
    return true;
  }

  class VbgProductsTable extends HTMLElement {
    connectedCallback() {
      injectStyle();
      this.data = PRODUCTS.map(function (p) { return Object.assign({}, p); });
      this.filters = null;
      this.render();
      this._onClick = this.onClick.bind(this);
      this._onDocClick = this.onDocClick.bind(this);
      this._onKey = function (e) { if (e.key === 'Escape') this.closeMenu(); }.bind(this);
      this.addEventListener('click', this._onClick);
      document.addEventListener('click', this._onDocClick);
      document.addEventListener('keydown', this._onKey);
    }
    disconnectedCallback() {
      document.removeEventListener('click', this._onDocClick);
      document.removeEventListener('keydown', this._onKey);
    }

    setFilters(f) { this.filters = f; this.render(); }

    render() {
      const self = this;
      const visible = this.data.filter(function (p) { return matches(p, self.filters); });
      let body;
      if (visible.length === 0) {
        body = '<tbody><tr><td colspan="8"><div class="empty"><div class="et">No products match the current filters</div>'
          + '<div class="es">Adjust discipline, manufacturer, status, material or standards to widen the results.</div></div></td></tr></tbody>';
      } else {
        body = '<tbody>' + visible.map(function (p) {
          return rowHtml(p, self.data.indexOf(p));
        }).join('') + '</tbody>';
      }
      this.innerHTML = '<table class="ptable">' + headHtml() + body + '</table>';
      this.openMenu = null;
      this.dispatchEvent(new CustomEvent('productsrender', {
        bubbles: true, detail: { visible: visible.length, total: this.data.length }
      }));
    }

    closeMenu() {
      if (!this.openMenu) return;
      this.openMenu.classList.remove('open');
      const tr = this.openMenu.closest('tr'); if (tr) tr.classList.remove('menu-open');
      const k = this.openMenu.parentElement.querySelector('.kebab'); if (k) k.classList.remove('active');
      this.openMenu = null;
    }

    onDocClick(e) {
      if (this.openMenu && !e.target.closest('.actions-cell')) this.closeMenu();
    }

    onClick(e) {
      const kebab = e.target.closest('.kebab');
      if (kebab) {
        e.stopPropagation();
        const menu = kebab.parentElement.querySelector('.menu');
        if (menu === this.openMenu) { this.closeMenu(); return; }
        this.closeMenu();
        menu.classList.add('open'); this.openMenu = menu;
        kebab.classList.add('active');
        kebab.closest('tr').classList.add('menu-open');
        return;
      }
      const item = e.target.closest('.menu button');
      if (item) {
        e.stopPropagation();
        const act = item.getAttribute('data-act');
        const i = +item.getAttribute('data-i');
        this.closeMenu();
        if (act === 'open') this.openDetail(i);
        else if (act === 'duplicate') this.duplicate(i);
        else if (act === 'deprecate') this.setStatus(i, 'deprecated');
        else if (act === 'restore') this.setStatus(i, 'active');
        else if (act === 'copycode') this.copyCode(i);
        return;
      }
      /* row click → open the authoritative product record */
      const tr = e.target.closest('tr[data-i]');
      if (tr && !e.target.closest('.actions-cell')) {
        this.openDetail(+tr.getAttribute('data-i'));
      }
    }

    openDetail(i) {
      const p = this.data[i];
      if (p) location.href = 'ProductDetail.html?p=' + encodeURIComponent(p.code);
    }

    duplicate(i) {
      const src = this.data[i];
      const copy = Object.assign({}, src);
      copy.tags = src.tags.slice();
      copy.name = src.name + ' (copy)';
      copy.code = 'PRD-' + String(500 + this.data.length).padStart(3, '0');
      copy.sku = src.sku + '-CP';
      copy.status = 'draft';
      copy.version = 'v0.1';
      copy.usage = 0;
      copy.updated = '2026-06-09';
      this.data.splice(i + 1, 0, copy);
      this.render();
    }

    setStatus(i, status) {
      this.data[i].status = status;
      this.render();
    }

    copyCode(i) {
      const code = this.data[i].code;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).catch(function () {});
      }
    }
  }

  if (!customElements.get('vbg-products-table')) {
    customElements.define('vbg-products-table', VbgProductsTable);
  }
})();
