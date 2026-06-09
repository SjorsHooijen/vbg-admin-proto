/* ============================================================
   VBG — reusable projects table web component
   Usage:  <vbg-projects-table></vbg-projects-table>
           <vbg-projects-table limit="4"></vbg-projects-table>
   Columns: model (thumbnail) · name · customer · city ·
            status · progress · actions (duplicate / delete)

   Renders into LIGHT DOM so screenshots / PDF / PPTX capture it.
   Styles scoped under `vbg-projects-table`, injected once.
   Relies on the global design tokens (styles/tokens.css).
   ============================================================ */
(function () {
  const THUMBS = [
    'assets/vbg-viewport-3d.png',
    'assets/vbg-viewport-3d-select-second-floor.png',
    'assets/vbg-viewport-2d.png',
    'assets/vbg-viewport-1d.png',
    'assets/vbg-viewport-3d-select-second-floor-wall.png'
  ];
  const PROJECTS = [
    { name: 'Project Alpha',          code: 'VBG-04-NC', customer: 'Heijmans Vastgoed',   city: 'Amsterdam',  status: 'generated', pct: 72,  thumb: 0, href: '#' },
    { name: 'Westkade Towers',        code: 'VBG-11-WK', customer: 'BAM Wonen',           city: 'Rotterdam',  status: 'validated', pct: 100, thumb: 1 },
    { name: 'Havenkwartier Block C',  code: 'VBG-07-HK', customer: 'Dura Vermeer',        city: 'Utrecht',    status: 'computing', pct: 41,  thumb: 2 },
    { name: 'Spoorzone Residences',   code: 'VBG-02-SZ', customer: 'VolkerWessels',       city: 'Tilburg',    status: 'draft',     pct: 12,  thumb: 3 },
    { name: 'Maaspoort North Core',   code: 'VBG-09-MP', customer: 'Heijmans Vastgoed',   city: 'Den Bosch',  status: 'generated', pct: 64,  thumb: 4 },
    { name: 'Stadshaven Lofts',       code: 'VBG-13-SH', customer: 'Synchroon',           city: 'Rotterdam',  status: 'validated', pct: 100, thumb: 0 },
    { name: 'Binckhorst Mixed-Use',   code: 'VBG-15-BH', customer: 'AM Real Estate',      city: 'Den Haag',   status: 'review',    pct: 88,  thumb: 1 },
    { name: 'Kop van Zuid Block B',   code: 'VBG-06-KZ', customer: 'BAM Wonen',           city: 'Rotterdam',  status: 'draft',     pct: 8,   thumb: 2 },
    { name: 'Oostpoort Plaza',        code: 'VBG-18-OP', customer: 'Amvest',              city: 'Amsterdam',  status: 'generated', pct: 57,  thumb: 3 },
    { name: 'Zuidas Tower E',         code: 'VBG-21-ZA', customer: 'G&S Vastgoed',        city: 'Amsterdam',  status: 'validated', pct: 100, thumb: 4 },
    { name: 'Merwede Kanaalzone',     code: 'VBG-17-MK', customer: 'Janssen de Jong',     city: 'Utrecht',    status: 'computing', pct: 33,  thumb: 0 },
    { name: 'Cruquius Werf',          code: 'VBG-20-CW', customer: 'Steck',               city: 'Haarlem',    status: 'draft',     pct: 19,  thumb: 1 }
  ];
  const STATUS_LABEL = {
    generated: 'Generated', validated: 'Validated', computing: 'Computing',
    draft: 'Draft', review: 'Review'
  };

  const STYLE = `
    vbg-projects-table { display: block; }
    vbg-projects-table .ptable { width: 100%; border-collapse: collapse; }
    vbg-projects-table thead th {
      text-align: left; font: var(--text-label); text-transform: uppercase;
      letter-spacing: var(--tracking-overline); color: var(--fg3);
      border-bottom: 1px solid var(--border-subtle);
      padding: 12px 20px; white-space: nowrap; user-select: none;
      position: sticky; top: 0; z-index: 2; background: var(--bg-surface);
    }
    vbg-projects-table thead th.th-thumb { width: 76px; }
    vbg-projects-table thead th.th-status { width: 150px; }
    vbg-projects-table thead th.th-progress { width: 220px; }
    vbg-projects-table thead th.th-actions { width: 64px; text-align: right; }
    vbg-projects-table tbody tr {
      border-bottom: 1px solid var(--border-subtle);
      transition: background var(--dur-fast) var(--ease-out);
      cursor: pointer;
    }
    vbg-projects-table tbody tr:last-child { border-bottom: 0; }
    vbg-projects-table tbody tr:hover { background: var(--vbg-amber-50); }
    vbg-projects-table tbody tr.menu-open { background: var(--vbg-amber-50); }
    vbg-projects-table td { padding: 14px 20px; vertical-align: middle; }
    vbg-projects-table .thumb {
      width: 56px; height: 40px; border-radius: var(--r-sm);
      background: var(--bg-surface); border: 1px solid var(--border-subtle);
      overflow: hidden; display: block;
    }
    vbg-projects-table .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    vbg-projects-table .pname { font: var(--text-body-strong); color: var(--fg1); line-height: 1.3; }
    vbg-projects-table .pcode { font: var(--text-mono-sm); color: var(--fg3); margin-top: 3px; }
    vbg-projects-table .cell-text { font: var(--text-body); color: var(--fg2); }
    vbg-projects-table .cell-city { display: flex; align-items: center; gap: 8px; font: var(--text-body); color: var(--fg2); }
    vbg-projects-table .cell-city .ico { display: inline-flex; color: var(--fg4); }
    vbg-projects-table .cell-city .ico svg { display: block; }
    vbg-projects-table .badge {
      display: inline-flex; align-items: center; gap: 6px;
      font: var(--text-label); padding: 4px 10px; border-radius: var(--r-full);
      white-space: nowrap;
    }
    vbg-projects-table .badge .dot { width: 7px; height: 7px; border-radius: var(--r-full); }
    vbg-projects-table .badge.generated { background: var(--status-generated-bg); color: var(--status-generated-fg); }
    vbg-projects-table .badge.generated .dot { background: var(--status-generated); }
    vbg-projects-table .badge.validated { background: var(--status-validated-bg); color: var(--status-validated-fg); }
    vbg-projects-table .badge.validated .dot { background: var(--status-validated); }
    vbg-projects-table .badge.draft { background: var(--status-pending-bg); color: var(--status-pending-fg); }
    vbg-projects-table .badge.draft .dot { background: var(--status-pending); }
    vbg-projects-table .badge.computing { background: var(--status-info-bg); color: var(--status-info-fg); }
    vbg-projects-table .badge.computing .dot { background: var(--status-info); }
    vbg-projects-table .badge.review { background: var(--status-warning-bg); color: var(--status-warning-fg); }
    vbg-projects-table .badge.review .dot { background: var(--status-warning); }
    vbg-projects-table .prog { display: flex; align-items: center; gap: 12px; }
    vbg-projects-table .prog .track {
      flex: 1 1 auto; height: 6px; border-radius: var(--r-full);
      background: var(--bg-sunken); overflow: hidden;
    }
    vbg-projects-table .prog .fill { height: 100%; border-radius: var(--r-full); background: var(--vbg-amber); }
    vbg-projects-table .prog .fill.done { background: var(--status-validated); }
    vbg-projects-table .prog .pct { font: var(--text-mono-sm); color: var(--fg2); width: 38px; text-align: right; flex: 0 0 auto; }
    vbg-projects-table .actions-cell { text-align: right; position: relative; }
    vbg-projects-table .kebab {
      width: 32px; height: 32px; border-radius: var(--r-sm);
      border: 1px solid transparent; background: transparent;
      display: inline-grid; place-items: center; color: var(--fg3); cursor: pointer;
      transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
    }
    vbg-projects-table .kebab:hover { background: var(--bg-surface); border-color: var(--border); color: var(--fg1); }
    vbg-projects-table tr:hover .kebab { color: var(--fg2); }
    vbg-projects-table .kebab.active { background: var(--bg-surface); border-color: var(--border); color: var(--fg1); }
    vbg-projects-table .menu {
      position: absolute; top: calc(100% - 4px); right: 20px; z-index: 40;
      min-width: 168px; background: var(--bg-raised);
      border: 1px solid var(--border); border-radius: var(--r-md);
      box-shadow: var(--shadow-pop); padding: 5px;
      display: none; flex-direction: column; gap: 1px;
    }
    vbg-projects-table .menu.open { display: flex; animation: vbgMenuIn var(--dur-fast) var(--ease-out); }
    @keyframes vbgMenuIn { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: none; } }
    vbg-projects-table .menu button {
      display: flex; align-items: center; gap: 10px; width: 100%;
      border: 0; background: transparent; cursor: pointer; text-align: left;
      font: var(--text-body); color: var(--fg1);
      padding: 8px 10px; border-radius: var(--r-sm);
      transition: background var(--dur-fast) var(--ease-out);
    }
    vbg-projects-table .menu button .ico { display: inline-flex; color: var(--fg3); }
    vbg-projects-table .menu button .ico svg { display: block; }
    vbg-projects-table .menu button:hover { background: var(--bg-hover); }
    vbg-projects-table .menu button.danger { color: var(--status-error-fg); }
    vbg-projects-table .menu button.danger .ico { color: var(--status-error); }
    vbg-projects-table .menu button.danger:hover { background: var(--status-error-bg); }
    vbg-projects-table .menu .sep { height: 1px; background: var(--border-subtle); margin: 4px 2px; }
  `;

  function injectStyle() {
    if (document.getElementById('vbg-projects-table-style')) return;
    const s = document.createElement('style');
    s.id = 'vbg-projects-table-style';
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  const PIN_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
  const DUP_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
  const DEL_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';

  function rowHtml(p, i) {
    const done = p.pct >= 100;
    return ''
      + '<tr data-i="' + i + '">'
      +   '<td><span class="thumb"><img src="' + THUMBS[p.thumb] + '" alt=""></span></td>'
      +   '<td><div class="pname">' + esc(p.name) + '</div><div class="pcode">' + esc(p.code) + '</div></td>'
      +   '<td><span class="cell-text">' + esc(p.customer) + '</span></td>'
      +   '<td><span class="cell-city"><span class="ico">' + PIN_ICON + '</span>' + esc(p.city) + '</span></td>'
      +   '<td><span class="badge ' + p.status + '"><span class="dot"></span>' + STATUS_LABEL[p.status] + '</span></td>'
      +   '<td><div class="prog"><div class="track"><div class="fill' + (done ? ' done' : '') + '" style="width:' + p.pct + '%"></div></div><span class="pct">' + p.pct + '%</span></div></td>'
      +   '<td class="actions-cell">'
      +     '<button class="kebab" aria-label="Project actions" data-i="' + i + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg></button>'
      +     '<div class="menu" data-menu="' + i + '">'
      +       '<button data-act="duplicate" data-i="' + i + '"><span class="ico">' + DUP_ICON + '</span>Duplicate</button>'
      +       '<div class="sep"></div>'
      +       '<button class="danger" data-act="delete" data-i="' + i + '"><span class="ico">' + DEL_ICON + '</span>Delete</button>'
      +     '</div>'
      +   '</td>'
      + '</tr>';
  }

  function headHtml(showHeader) {
    if (showHeader === 'false') return '';
    return '<thead><tr>'
      + '<th class="th-thumb">Model</th>'
      + '<th>Name</th>'
      + '<th>Customer</th>'
      + '<th>City</th>'
      + '<th class="th-status">Status</th>'
      + '<th class="th-progress">Progress</th>'
      + '<th class="th-actions"></th>'
      + '</tr></thead>';
  }

  class VbgProjectsTable extends HTMLElement {
    static get observedAttributes() { return ['limit', 'header']; }
    connectedCallback() {
      injectStyle();
      this.data = PROJECTS.map(function (p) { return Object.assign({}, p); });
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
    attributeChangedCallback() { if (this.isConnected && this.data) this.render(); }

    render() {
      const limit = parseInt(this.getAttribute('limit'), 10);
      const list = isNaN(limit) ? this.data : this.data.slice(0, limit);
      this.innerHTML = '<table class="ptable">'
        + headHtml(this.getAttribute('header'))
        + '<tbody>' + list.map(rowHtml).join('') + '</tbody>'
        + '</table>';
      this.openMenu = null;
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
        else if (act === 'delete') this.remove(i);
        return;
      }
      const tr = e.target.closest('tr[data-i]');
      if (tr) {
        const p = this.data[+tr.getAttribute('data-i')];
        if (p && p.href) window.location.href = p.href;
      }
    }

    duplicate(i) {
      const src = this.data[i];
      const copy = Object.assign({}, src);
      copy.name = src.name + ' (copy)';
      copy.code = src.code + 'b';
      copy.status = 'draft';
      copy.pct = 0;
      delete copy.href;
      this.data.splice(i + 1, 0, copy);
      this.render();
    }
    remove(i) {
      this.data.splice(i, 1);
      this.render();
    }
  }

  if (!customElements.get('vbg-projects-table')) {
    customElements.define('vbg-projects-table', VbgProjectsTable);
  }
})();
