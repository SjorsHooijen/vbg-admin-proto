/* ============================================================
   VBG — reusable recipes table web component
   Usage:  <vbg-recipes-table></vbg-recipes-table>
   Columns: icon · recipe (name + desc) · category · version ·
            status · last updated · usage · actions (open / duplicate)

   Renders into LIGHT DOM so screenshots / PDF / PPTX capture it.
   Styles scoped under `vbg-recipes-table`, injected once.
   Relies on the global design tokens (styles/tokens.css).

   Data + facet helpers are exposed on window.VBG_RECIPES so the
   page can build the filter sidebar and counts from one source.

   The component reads `this.filters` (set via setFilters({...})) and
   dispatches a `recipesrender` CustomEvent { visible, total } after
   every render so the page can update its footer / result count.
   ============================================================ */
(function () {
  /* "today" for relative date filtering — keep in sync with project date */
  const TODAY = new Date('2026-06-05T00:00:00');

  const CATEGORIES = {
    structural: { label: 'Structural', glyph: '<path d="M4 22V4a1 1 0 0 1 1-1h6v19"/><path d="M11 7h8a1 1 0 0 1 1 1v14"/><path d="M11 11h9"/><path d="M11 15h9"/><path d="M11 19h9"/>' },
    facade:     { label: 'Façade',     glyph: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 9v12"/>' },
    mep:        { label: 'MEP',        glyph: '<circle cx="6" cy="19" r="2.5"/><path d="M8.5 19h8a3.5 3.5 0 0 0 0-7h-9a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="2.5"/>' },
    production: { label: 'Production', glyph: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>' },
    geometry:   { label: 'Geometry',   glyph: '<path d="M8.5 9 12 3l3.5 6Z"/><rect x="3" y="14" width="7" height="7" rx="1"/><circle cx="17.5" cy="17.5" r="3.5"/>' }
  };

  const STATUS_LABEL = { published: 'Published', draft: 'Draft', archived: 'Archived' };

  /* usage = number of projects currently referencing the recipe */
  const RECIPES = [
    { code: 'RCP-031', name: 'Orthogonal column grid',        desc: 'Generates a load-balanced column grid from bay spans and core lines.', category: 'structural', version: 'v3.2.0', major: 3, status: 'published', owner: 'vbg',     updated: '2026-05-28', usage: 9,  tags: ['concrete', 'high-rise', 'NEN-EN'] },
    { code: 'RCP-018', name: 'Stair & core topology',         desc: 'Places vertical circulation cores and derives stair geometry per level.', category: 'structural', version: 'v2.3.1', major: 2, status: 'published', owner: 'vbg',     updated: '2026-05-30', usage: 8,  tags: ['circulation', 'NEN-EN'] },
    { code: 'RCP-044', name: 'Precast façade panelization',    desc: 'Subdivides envelope into fabricable precast panels with joint rules.',   category: 'facade',     version: 'v2.1.0', major: 2, status: 'published', owner: 'vbg',     updated: '2026-05-12', usage: 7,  tags: ['prefab', 'envelope'] },
    { code: 'RCP-009', name: 'Hollow-core slab spans',         desc: 'Selects slab depth and span direction from load and fire constraints.',  category: 'production', version: 'v3.0.0', major: 3, status: 'published', owner: 'vbg',     updated: '2026-03-15', usage: 11, tags: ['prefab', 'concrete'] },
    { code: 'RCP-052', name: 'Load-bearing wall layout',       desc: 'Derives shear-wall positions from stability and opening constraints.',   category: 'structural', version: 'v2.2.0', major: 2, status: 'published', owner: 'company', updated: '2026-05-22', usage: 6,  tags: ['concrete', 'stability'] },
    { code: 'RCP-027', name: 'MEP riser zoning',               desc: 'Allocates shafts and riser zones balanced against floor demand.',        category: 'mep',        version: 'v2.0.1', major: 2, status: 'published', owner: 'vbg',     updated: '2026-04-20', usage: 5,  tags: ['services', 'zoning'] },
    { code: 'RCP-061', name: 'Foundation pile pattern',        desc: 'Lays out pile groups under column loads with spacing minimums.',          category: 'structural', version: 'v2.0.0', major: 2, status: 'published', owner: 'vbg',     updated: '2026-04-30', usage: 5,  tags: ['geotech', 'concrete'] },
    { code: 'RCP-038', name: 'Cantilever balcony framing',     desc: 'Frames cantilevered balconies with thermal-break detailing rules.',       category: 'structural', version: 'v1.4.0', major: 1, status: 'published', owner: 'company', updated: '2026-04-08', usage: 4,  tags: ['steel', 'thermal'] },
    { code: 'RCP-046', name: 'Ventilation duct sizing',        desc: 'Sizes supply and return ducts from zone airflow targets.',                category: 'mep',        version: 'v1.3.0', major: 1, status: 'published', owner: 'vbg',     updated: '2026-02-27', usage: 3,  tags: ['services', 'airflow'] },
    { code: 'RCP-070', name: 'Parking grid optimization',      desc: 'Packs parking bays and ramps within the substructure footprint.',         category: 'geometry',   version: 'v1.1.0', major: 1, status: 'archived',  owner: 'vbg',     updated: '2025-11-08', usage: 2,  tags: ['substructure'] },
    { code: 'RCP-055', name: 'Sprinkler branch routing',       desc: 'Routes sprinkler branch lines against coverage and clash rules.',         category: 'mep',        version: 'v1.2.0', major: 1, status: 'draft',     owner: 'company', updated: '2026-06-01', usage: 1,  tags: ['services', 'fire'] },
    { code: 'RCP-063', name: 'Brick veneer coursing',          desc: 'Sets brick coursing and movement joints across façade openings.',         category: 'facade',     version: 'v0.9.0', major: 0, status: 'archived',  owner: 'company', updated: '2025-09-14', usage: 1,  tags: ['envelope', 'masonry'] },
    { code: 'RCP-072', name: 'Curtain-wall mullion layout',    desc: 'Spaces mullions and transoms from panel module and wind load.',           category: 'facade',     version: 'v1.0.0', major: 1, status: 'draft',     owner: 'company', updated: '2026-06-04', usage: 0,  tags: ['envelope', 'glazing'] },
    { code: 'RCP-074', name: 'Modular bathroom pods',          desc: 'Places prefab bathroom pods and resolves service connections.',           category: 'production', version: 'v1.0.0', major: 1, status: 'draft',     owner: 'company', updated: '2026-06-03', usage: 0,  tags: ['prefab', 'services'] }
  ];

  /* ---- expose data + facet helpers for the filter sidebar ---- */
  function daysAgo(iso) { return Math.round((TODAY - new Date(iso + 'T00:00:00')) / 86400000); }
  function fmtDate(iso) {
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const d = new Date(iso + 'T00:00:00');
    return d.getDate() + ' ' + M[d.getMonth()] + ' ' + d.getFullYear();
  }
  window.VBG_RECIPES = {
    DATA: RECIPES,
    CATEGORIES: CATEGORIES,
    STATUS_LABEL: STATUS_LABEL,
    daysAgo: daysAgo,
    fmtDate: fmtDate,
    allTags: function () {
      const set = {};
      RECIPES.forEach(function (r) { r.tags.forEach(function (t) { set[t] = (set[t] || 0) + 1; }); });
      return Object.keys(set).sort().map(function (t) { return { tag: t, n: set[t] }; });
    },
    count: function (pred) { return RECIPES.filter(pred).length; }
  };

  const STYLE = `
    vbg-recipes-table { display: block; }
    vbg-recipes-table .rtable { width: 100%; border-collapse: collapse; table-layout: fixed; }
    vbg-recipes-table thead th {
      text-align: left; font: var(--text-label); text-transform: uppercase;
      letter-spacing: var(--tracking-overline); color: var(--fg3);
      border-bottom: 1px solid var(--border-subtle);
      padding: 12px 20px; white-space: nowrap; user-select: none;
      position: sticky; top: 0; z-index: 2; background: var(--bg-surface);
    }
    vbg-recipes-table thead th.th-icon { width: 64px; }
    vbg-recipes-table thead th.th-cat { width: 132px; }
    vbg-recipes-table thead th.th-ver { width: 96px; }
    vbg-recipes-table thead th.th-status { width: 132px; }
    vbg-recipes-table thead th.th-upd { width: 132px; }
    vbg-recipes-table thead th.th-usage { width: 128px; }
    vbg-recipes-table thead th.th-actions { width: 56px; text-align: right; }
    vbg-recipes-table tbody tr {
      border-bottom: 1px solid var(--border-subtle);
      transition: background var(--dur-fast) var(--ease-out);
      cursor: pointer;
    }
    vbg-recipes-table tbody tr:last-child { border-bottom: 0; }
    vbg-recipes-table tbody tr:hover { background: var(--vbg-amber-50); }
    vbg-recipes-table tbody tr.menu-open { background: var(--vbg-amber-50); }
    vbg-recipes-table td { padding: 13px 20px; vertical-align: middle; }
    vbg-recipes-table td:first-child { padding: 13px 6px 13px 20px; }
    vbg-recipes-table td.actions-cell { padding: 13px 16px 13px 8px; }

    vbg-recipes-table .icon-tile {
      width: 38px; height: 38px; border-radius: var(--r-sm);
      background: var(--bg-sunken); border: 1px solid var(--border-subtle);
      display: grid; place-items: center; color: var(--fg2);
    }
    vbg-recipes-table .icon-tile svg { display: block; }

    vbg-recipes-table .rname { font: var(--text-body-strong); color: var(--fg1); line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    vbg-recipes-table .rname .rcode { font: var(--text-mono-sm); color: var(--fg4); margin-left: 8px; }
    vbg-recipes-table .rdesc {
      font: var(--text-caption); color: var(--fg3); margin-top: 3px; max-width: 460px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    vbg-recipes-table .cat-badge {
      display: inline-flex; align-items: center;
      font: var(--text-label); padding: 4px 10px; border-radius: var(--r-full);
      background: var(--slate-100); color: var(--fg2); white-space: nowrap;
    }
    vbg-recipes-table .cell-ver { font: var(--text-mono-sm); color: var(--fg2); }
    vbg-recipes-table .cell-upd { font: var(--text-sm); color: var(--fg2); white-space: nowrap; }
    vbg-recipes-table .cell-upd .ago { font: var(--text-caption); color: var(--fg4); display: block; margin-top: 1px; }

    vbg-recipes-table .badge {
      display: inline-flex; align-items: center; gap: 6px;
      font: var(--text-label); padding: 4px 10px; border-radius: var(--r-full);
      white-space: nowrap;
    }
    vbg-recipes-table .badge .dot { width: 7px; height: 7px; border-radius: var(--r-full); }
    vbg-recipes-table .badge.published { background: var(--status-success-bg); color: var(--status-success-fg); }
    vbg-recipes-table .badge.published .dot { background: var(--status-success); }
    vbg-recipes-table .badge.draft { background: var(--status-pending-bg); color: var(--status-pending-fg); }
    vbg-recipes-table .badge.draft .dot { background: var(--status-pending); }
    vbg-recipes-table .badge.archived { background: var(--slate-100); color: var(--fg3); }
    vbg-recipes-table .badge.archived .dot { background: var(--slate-400); }

    vbg-recipes-table .usage { display: flex; flex-direction: column; gap: 4px; }
    vbg-recipes-table .usage .uline { display: flex; align-items: baseline; gap: 6px; }
    vbg-recipes-table .usage .ucount { font: var(--text-mono); color: var(--fg1); }
    vbg-recipes-table .usage .ulabel { font: var(--text-caption); color: var(--fg4); }
    vbg-recipes-table .usage .utrack { height: 4px; width: 64px; border-radius: var(--r-full); background: var(--bg-sunken); overflow: hidden; }
    vbg-recipes-table .usage .ufill { height: 100%; border-radius: var(--r-full); background: var(--vbg-amber-300); }
    vbg-recipes-table .usage.unused .ucount { color: var(--fg4); }

    vbg-recipes-table .actions-cell { text-align: right; position: relative; }
    vbg-recipes-table .kebab {
      width: 32px; height: 32px; border-radius: var(--r-sm);
      border: 1px solid transparent; background: transparent;
      display: inline-grid; place-items: center; color: var(--fg3); cursor: pointer;
      transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
    }
    vbg-recipes-table .kebab:hover { background: var(--bg-surface); border-color: var(--border); color: var(--fg1); }
    vbg-recipes-table tr:hover .kebab { color: var(--fg2); }
    vbg-recipes-table .kebab.active { background: var(--bg-surface); border-color: var(--border); color: var(--fg1); }
    vbg-recipes-table .menu {
      position: absolute; top: calc(100% - 4px); right: 20px; z-index: 40;
      min-width: 176px; background: var(--bg-raised);
      border: 1px solid var(--border); border-radius: var(--r-md);
      box-shadow: var(--shadow-pop); padding: 5px;
      display: none; flex-direction: column; gap: 1px;
    }
    vbg-recipes-table .menu.open { display: flex; animation: vbgRMenuIn var(--dur-fast) var(--ease-out); }
    @keyframes vbgRMenuIn { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: none; } }
    vbg-recipes-table .menu button {
      display: flex; align-items: center; gap: 10px; width: 100%;
      border: 0; background: transparent; cursor: pointer; text-align: left;
      font: var(--text-body); color: var(--fg1);
      padding: 8px 10px; border-radius: var(--r-sm);
      transition: background var(--dur-fast) var(--ease-out);
    }
    vbg-recipes-table .menu button .ico { display: inline-flex; color: var(--fg3); }
    vbg-recipes-table .menu button .ico svg { display: block; }
    vbg-recipes-table .menu button:hover { background: var(--bg-hover); }
    vbg-recipes-table .menu .sep { height: 1px; background: var(--border-subtle); margin: 4px 2px; }
    vbg-recipes-table .menu .mkey { margin-left: auto; font: var(--text-mono-sm); color: var(--fg4); }

    vbg-recipes-table .empty {
      padding: 64px 20px; text-align: center; color: var(--fg3);
    }
    vbg-recipes-table .empty .et { font: var(--text-h3); color: var(--fg2); margin-bottom: 6px; }
    vbg-recipes-table .empty .es { font: var(--text-sm); }
  `;

  function injectStyle() {
    if (document.getElementById('vbg-recipes-table-style')) return;
    const s = document.createElement('style');
    s.id = 'vbg-recipes-table-style';
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  const OPEN_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';
  const DUP_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
  const ARCH_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/></svg>';

  function iconTile(cat) {
    const g = (CATEGORIES[cat] || {}).glyph || '';
    return '<span class="icon-tile"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + g + '</svg></span>';
  }

  const MAX_USAGE = RECIPES.reduce(function (m, r) { return Math.max(m, r.usage); }, 1);

  function usageCell(n) {
    if (!n) {
      return '<div class="usage unused"><div class="uline"><span class="ucount">—</span><span class="ulabel">Unused</span></div></div>';
    }
    return '<div class="usage"><div class="uline"><span class="ucount">' + n + '</span><span class="ulabel">project' + (n === 1 ? '' : 's') + '</span></div></div>';
  }

  function rowHtml(r, i) {
    const cat = CATEGORIES[r.category] || { label: r.category };
    return ''
      + '<tr data-i="' + i + '">'
      +   '<td>' + iconTile(r.category) + '</td>'
      +   '<td><div class="rname">' + esc(r.name) + '<span class="rcode">' + esc(r.code) + '</span></div>'
      +     '<div class="rdesc">' + esc(r.desc) + '</div></td>'
      +   '<td><span class="cat-badge">' + esc(cat.label) + '</span></td>'
      +   '<td><span class="cell-ver">' + esc(r.version) + '</span></td>'
      +   '<td><span class="badge ' + r.status + '"><span class="dot"></span>' + STATUS_LABEL[r.status] + '</span></td>'
      +   '<td><span class="cell-upd">' + fmtDate(r.updated) + '<span class="ago">' + relLabel(r.updated) + '</span></span></td>'
      +   '<td>' + usageCell(r.usage) + '</td>'
      +   '<td class="actions-cell">'
      +     '<button class="kebab" aria-label="Recipe actions" data-i="' + i + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg></button>'
      +     '<div class="menu" data-menu="' + i + '">'
      +       '<button data-act="open" data-i="' + i + '"><span class="ico">' + OPEN_ICON + '</span>Open</button>'
      +       '<button data-act="duplicate" data-i="' + i + '"><span class="ico">' + DUP_ICON + '</span>Duplicate</button>'
      +       '<div class="sep"></div>'
      +       '<button data-act="archive" data-i="' + i + '"><span class="ico">' + ARCH_ICON + '</span>' + (r.status === 'archived' ? 'Restore' : 'Archive') + '</button>'
      +     '</div>'
      +   '</td>'
      + '</tr>';
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

  function headHtml() {
    return '<thead><tr>'
      + '<th class="th-icon">Recipe</th>'
      + '<th></th>'
      + '<th class="th-cat">Category</th>'
      + '<th class="th-ver">Version</th>'
      + '<th class="th-status">Status</th>'
      + '<th class="th-upd">Last updated</th>'
      + '<th class="th-usage">Usage</th>'
      + '<th class="th-actions"></th>'
      + '</tr></thead>';
  }

  function matches(r, f) {
    if (!f) return true;
    if (f.search) {
      const q = f.search.toLowerCase();
      const hay = (r.name + ' ' + r.desc + ' ' + r.code + ' ' + r.tags.join(' ')).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    if (f.owner && f.owner.size && !f.owner.has(r.owner)) return false;
    if (f.category && f.category.size && !f.category.has(r.category)) return false;
    if (f.status && f.status.size && !f.status.has(r.status)) return false;
    if (f.major && f.major.size && !f.major.has(String(r.major))) return false;
    if (f.tags && f.tags.size) {
      const ok = r.tags.some(function (t) { return f.tags.has(t); });
      if (!ok) return false;
    }
    if (f.updated && f.updated !== 'any') {
      if (daysAgo(r.updated) > parseInt(f.updated, 10)) return false;
    }
    if (f.usage && f.usage !== 'any') {
      const u = r.usage;
      if (f.usage === 'unused' && u !== 0) return false;
      if (f.usage === 'low' && !(u >= 1 && u <= 5)) return false;
      if (f.usage === 'mid' && !(u >= 6 && u <= 10)) return false;
      if (f.usage === 'high' && !(u > 10)) return false;
    }
    return true;
  }

  class VbgRecipesTable extends HTMLElement {
    connectedCallback() {
      injectStyle();
      this.data = RECIPES.map(function (r) { return Object.assign({}, r); });
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
      const visible = this.data.filter(function (r) { return matches(r, self.filters); });
      let body;
      if (visible.length === 0) {
        body = '<tbody><tr><td colspan="8"><div class="empty"><div class="et">No recipes match the current filters</div>'
          + '<div class="es">Adjust ownership, category, status or tags to widen the results.</div></div></td></tr></tbody>';
      } else {
        body = '<tbody>' + visible.map(function (r) {
          return rowHtml(r, self.data.indexOf(r));
        }).join('') + '</tbody>';
      }
      this.innerHTML = '<table class="rtable">' + headHtml() + body + '</table>';
      this.openMenu = null;
      this.dispatchEvent(new CustomEvent('recipesrender', {
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
        if (act === 'duplicate') this.duplicate(i);
        else if (act === 'archive') this.toggleArchive(i);
        else if (act === 'open') this.open(i);
        return;
      }
      const tr = e.target.closest('tr[data-i]');
      if (tr) this.open(+tr.getAttribute('data-i'));
    }

    open(i) {
      const r = this.data[i];
      if (r) this.dispatchEvent(new CustomEvent('recipeopen', { bubbles: true, detail: { recipe: r } }));
    }

    duplicate(i) {
      const src = this.data[i];
      const copy = Object.assign({}, src);
      copy.tags = src.tags.slice();
      copy.name = src.name + ' (copy)';
      copy.code = 'RCP-' + String(80 + this.data.length).padStart(3, '0');
      copy.status = 'draft';
      copy.owner = 'company';
      copy.version = 'v0.1.0';
      copy.major = 0;
      copy.usage = 0;
      copy.updated = '2026-06-05';
      this.data.splice(i + 1, 0, copy);
      this.render();
    }

    toggleArchive(i) {
      const r = this.data[i];
      r.status = r.status === 'archived' ? 'published' : 'archived';
      this.render();
    }
  }

  if (!customElements.get('vbg-recipes-table')) {
    customElements.define('vbg-recipes-table', VbgRecipesTable);
  }
})();
