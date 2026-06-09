/* ============================================================
   VBG — reusable documents table web component
   Usage:  <vbg-documents-table></vbg-documents-table>
           <vbg-documents-table header="true"></vbg-documents-table>
   Columns: icon (file type) · name · project (link) · client ·
            file type · revisions · last updated · actions

   Built to match <vbg-projects-table>: light DOM, scoped styles
   injected once, global design tokens (styles/tokens.css).
   ============================================================ */
(function () {
  /* file-type metadata — glyph + tint reuse the on-palette status hues */
  const FILE_TEXT = '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>';
  const FILE_SHEET = '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/>';
  const FILE_BOX = '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>';
  const FILE_LAYERS = '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>';
  const FILE_PKG = '<path d="M16.5 9.4 7.5 4.21"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>';

  const TYPE = {
    PDF:  { kind: 'pdf',   glyph: FILE_TEXT },
    DOCX: { kind: 'doc',   glyph: FILE_TEXT },
    XLSX: { kind: 'sheet', glyph: FILE_SHEET },
    IFC:  { kind: 'model', glyph: FILE_BOX },
    DWG:  { kind: 'cad',   glyph: FILE_LAYERS },
    ZIP:  { kind: 'pkg',   glyph: FILE_PKG }
  };

  const PROJECT_HREF = '#';

  const DOCS = [
    { name: 'North Core — structural analysis report', code: 'DOC-1042', project: 'Project Alpha',         client: 'Heijmans Vastgoed', type: 'PDF',  revs: 7,  rel: '2 hours ago',  date: '2026-06-05' },
    { name: 'Column fabrication package',              code: 'DOC-1041', project: 'Project Alpha',         client: 'Heijmans Vastgoed', type: 'ZIP',  revs: 3,  rel: 'Yesterday',    date: '2026-06-04' },
    { name: 'Bill of materials — full building',       code: 'DOC-0987', project: 'Westkade Towers',       client: 'BAM Wonen',         type: 'XLSX', revs: 12, rel: 'Yesterday',    date: '2026-06-04' },
    { name: 'IFC model export',                        code: 'DOC-0964', project: 'Havenkwartier Block C', client: 'Dura Vermeer',      type: 'IFC',  revs: 2,  rel: '3 days ago',   date: '2026-06-02' },
    { name: 'Façade panel schedule',                   code: 'DOC-0951', project: 'Zuidas Tower E',        client: 'G&S Vastgoed',      type: 'XLSX', revs: 5,  rel: '3 days ago',   date: '2026-06-02' },
    { name: 'MEP clash detection report',              code: 'DOC-0938', project: 'Binckhorst Mixed-Use',  client: 'AM Real Estate',    type: 'PDF',  revs: 4,  rel: '4 days ago',   date: '2026-06-01' },
    { name: 'Engineering intent specification',        code: 'DOC-0925', project: 'Spoorzone Residences',  client: 'VolkerWessels',     type: 'DOCX', revs: 9,  rel: '5 days ago',   date: '2026-05-31' },
    { name: 'Reinforcement drawing set',               code: 'DOC-0912', project: 'Maaspoort North Core',  client: 'Heijmans Vastgoed', type: 'DWG',  revs: 6,  rel: '1 week ago',   date: '2026-05-29' },
    { name: 'Validation summary',                      code: 'DOC-0903', project: 'Stadshaven Lofts',      client: 'Synchroon',         type: 'PDF',  revs: 1,  rel: '1 week ago',   date: '2026-05-28' },
    { name: 'Load path & stability report',            code: 'DOC-0891', project: 'Oostpoort Plaza',       client: 'Amvest',            type: 'PDF',  revs: 3,  rel: '2 weeks ago',  date: '2026-05-22' },
    { name: 'Quantity take-off',                       code: 'DOC-0884', project: 'Merwede Kanaalzone',     client: 'Janssen de Jong',   type: 'XLSX', revs: 8,  rel: '2 weeks ago',  date: '2026-05-21' },
    { name: 'Façade fabrication package',              code: 'DOC-0870', project: 'Cruquius Werf',         client: 'Steck',             type: 'ZIP',  revs: 2,  rel: '3 weeks ago',  date: '2026-05-15' },
    { name: 'Wind load analysis',                      code: 'DOC-0862', project: 'Westkade Towers',       client: 'BAM Wonen',         type: 'PDF',  revs: 4,  rel: '3 weeks ago',  date: '2026-05-14' },
    { name: 'Building systems specification',          code: 'DOC-0855', project: 'Kop van Zuid Block B',   client: 'BAM Wonen',         type: 'DOCX', revs: 2,  rel: '4 weeks ago',  date: '2026-05-08' }
  ];

  const STYLE = `
    vbg-documents-table { display: block; }
    vbg-documents-table .dtable { width: 100%; border-collapse: collapse; }
    vbg-documents-table thead th {
      text-align: left; font: var(--text-label); text-transform: uppercase;
      letter-spacing: var(--tracking-overline); color: var(--fg3);
      border-bottom: 1px solid var(--border-subtle);
      padding: 12px 20px; white-space: nowrap; user-select: none;
      position: sticky; top: 0; z-index: 2; background: var(--bg-surface);
    }
    vbg-documents-table thead th.th-icon { width: 60px; }
    vbg-documents-table thead th.th-type { width: 104px; }
    vbg-documents-table thead th.th-revs { width: 110px; }
    vbg-documents-table thead th.th-updated { width: 168px; }
    vbg-documents-table thead th.th-actions { width: 64px; text-align: right; }
    vbg-documents-table tbody tr {
      border-bottom: 1px solid var(--border-subtle);
      transition: background var(--dur-fast) var(--ease-out);
      cursor: pointer;
    }
    vbg-documents-table tbody tr:last-child { border-bottom: 0; }
    vbg-documents-table tbody tr:hover { background: var(--vbg-amber-50); }
    vbg-documents-table tbody tr.menu-open { background: var(--vbg-amber-50); }
    vbg-documents-table td { padding: 14px 20px; vertical-align: middle; }

    /* file-type icon tile */
    vbg-documents-table .ftile {
      width: 36px; height: 36px; border-radius: var(--r-sm);
      display: grid; place-items: center; flex: 0 0 36px;
      border: 1px solid transparent;
    }
    vbg-documents-table .ftile svg { display: block; }
    vbg-documents-table .ftile.pdf   { background: var(--status-error-bg);     color: var(--status-error-fg); }
    vbg-documents-table .ftile.doc   { background: var(--status-info-bg);      color: var(--status-info-fg); }
    vbg-documents-table .ftile.sheet { background: var(--status-success-bg);   color: var(--status-success-fg); }
    vbg-documents-table .ftile.model { background: var(--status-generated-bg); color: var(--status-generated-fg); }
    vbg-documents-table .ftile.cad   { background: var(--status-validated-bg); color: var(--status-validated-fg); }
    vbg-documents-table .ftile.pkg   { background: var(--status-pending-bg);   color: var(--status-pending-fg); }

    vbg-documents-table .dname { font: var(--text-body-strong); color: var(--fg1); line-height: 1.3; }
    vbg-documents-table .dcode { font: var(--text-mono-sm); color: var(--fg3); margin-top: 3px; }

    vbg-documents-table .plink {
      font: var(--text-body-strong); color: var(--fg-accent); text-decoration: none;
      border-bottom: 1px solid transparent; transition: color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
    }
    vbg-documents-table .plink:hover { color: var(--vbg-amber); }

    vbg-documents-table .cell-text { font: var(--text-body); color: var(--fg2); }

    /* file-type chip (mono, uppercase) */
    vbg-documents-table .ftype {
      display: inline-flex; align-items: center;
      font: var(--text-mono-sm); text-transform: uppercase; letter-spacing: 0.04em;
      color: var(--fg2); background: var(--bg-sunken);
      border: 1px solid var(--border-subtle); border-radius: var(--r-xs);
      padding: 2px 8px;
    }

    /* revisions */
    vbg-documents-table .revs { display: inline-flex; align-items: center; gap: 7px; color: var(--fg2); }
    vbg-documents-table .revs .ico { display: inline-flex; color: var(--fg4); }
    vbg-documents-table .revs .ico svg { display: block; }
    vbg-documents-table .revs .n { font: var(--text-mono); }

    /* last updated */
    vbg-documents-table .when { line-height: 1.3; }
    vbg-documents-table .when .rel { font: var(--text-body); color: var(--fg2); }
    vbg-documents-table .when .abs { font: var(--text-mono-sm); color: var(--fg4); margin-top: 3px; }

    vbg-documents-table .actions-cell { text-align: right; position: relative; }
    vbg-documents-table .kebab {
      width: 32px; height: 32px; border-radius: var(--r-sm);
      border: 1px solid transparent; background: transparent;
      display: inline-grid; place-items: center; color: var(--fg3); cursor: pointer;
      transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
    }
    vbg-documents-table .kebab:hover { background: var(--bg-surface); border-color: var(--border); color: var(--fg1); }
    vbg-documents-table tr:hover .kebab { color: var(--fg2); }
    vbg-documents-table .kebab.active { background: var(--bg-surface); border-color: var(--border); color: var(--fg1); }
    vbg-documents-table .menu {
      position: absolute; top: calc(100% - 4px); right: 20px; z-index: 40;
      min-width: 180px; background: var(--bg-raised);
      border: 1px solid var(--border); border-radius: var(--r-md);
      box-shadow: var(--shadow-pop); padding: 5px;
      display: none; flex-direction: column; gap: 1px;
    }
    vbg-documents-table .menu.open { display: flex; animation: vbgMenuIn var(--dur-fast) var(--ease-out); }
    @keyframes vbgMenuIn { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: none; } }
    vbg-documents-table .menu button {
      display: flex; align-items: center; gap: 10px; width: 100%;
      border: 0; background: transparent; cursor: pointer; text-align: left;
      font: var(--text-body); color: var(--fg1);
      padding: 8px 10px; border-radius: var(--r-sm);
      transition: background var(--dur-fast) var(--ease-out);
    }
    vbg-documents-table .menu button .ico { display: inline-flex; color: var(--fg3); }
    vbg-documents-table .menu button .ico svg { display: block; }
    vbg-documents-table .menu button:hover { background: var(--bg-hover); }
    vbg-documents-table .menu button.danger { color: var(--status-error-fg); }
    vbg-documents-table .menu button.danger .ico { color: var(--status-error); }
    vbg-documents-table .menu button.danger:hover { background: var(--status-error-bg); }
    vbg-documents-table .menu .sep { height: 1px; background: var(--border-subtle); margin: 4px 2px; }
  `;

  function injectStyle() {
    if (document.getElementById('vbg-documents-table-style')) return;
    const s = document.createElement('style');
    s.id = 'vbg-documents-table-style';
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  const HIST_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>';
  const DL_ICON  = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>';
  const OPEN_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';
  const REN_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
  const DEL_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';

  function rowHtml(d, i) {
    const t = TYPE[d.type] || TYPE.PDF;
    return ''
      + '<tr data-i="' + i + '">'
      +   '<td><span class="ftile ' + t.kind + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + t.glyph + '</svg></span></td>'
      +   '<td><div class="dname">' + esc(d.name) + '</div><div class="dcode">' + esc(d.code) + '</div></td>'
      +   '<td><a class="plink" href="' + PROJECT_HREF + '">' + esc(d.project) + '</a></td>'
      +   '<td><span class="cell-text">' + esc(d.client) + '</span></td>'
      +   '<td><span class="ftype">' + esc(d.type) + '</span></td>'
      +   '<td><span class="revs"><span class="ico">' + HIST_ICON + '</span><span class="n">' + d.revs + '</span></span></td>'
      +   '<td><div class="when"><div class="rel">' + esc(d.rel) + '</div><div class="abs">' + esc(d.date) + '</div></div></td>'
      +   '<td class="actions-cell">'
      +     '<button class="kebab" aria-label="Document actions" data-i="' + i + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg></button>'
      +     '<div class="menu" data-menu="' + i + '">'
      +       '<button data-act="download" data-i="' + i + '"><span class="ico">' + DL_ICON + '</span>Download</button>'
      +       '<button data-act="open" data-i="' + i + '"><span class="ico">' + OPEN_ICON + '</span>Open in viewer</button>'
      +       '<button data-act="rename" data-i="' + i + '"><span class="ico">' + REN_ICON + '</span>Rename</button>'
      +       '<div class="sep"></div>'
      +       '<button class="danger" data-act="delete" data-i="' + i + '"><span class="ico">' + DEL_ICON + '</span>Delete</button>'
      +     '</div>'
      +   '</td>'
      + '</tr>';
  }

  function headHtml(showHeader) {
    if (showHeader === 'false') return '';
    return '<thead><tr>'
      + '<th class="th-icon"></th>'
      + '<th>Name</th>'
      + '<th>Project</th>'
      + '<th>Client</th>'
      + '<th class="th-type">File type</th>'
      + '<th class="th-revs">Revisions</th>'
      + '<th class="th-updated">Last updated</th>'
      + '<th class="th-actions"></th>'
      + '</tr></thead>';
  }

  class VbgDocumentsTable extends HTMLElement {
    static get observedAttributes() { return ['limit', 'header']; }
    connectedCallback() {
      injectStyle();
      this.data = DOCS.map(function (d) { return Object.assign({}, d); });
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
      this.innerHTML = '<table class="dtable">'
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
        const d = this.data[i];
        if (act === 'delete') this.removeRow(i);
        else if (act === 'download' && window.VBGDocViewer) window.VBGDocViewer.download(d);
        else if (act === 'open' && window.VBGDocViewer) window.VBGDocViewer.open(d);
        return;
      }
      // project link navigates on its own — don't open the viewer
      if (e.target.closest('.plink')) return;
      const tr = e.target.closest('tr[data-i]');
      if (tr && window.VBGDocViewer) {
        window.VBGDocViewer.open(this.data[+tr.getAttribute('data-i')]);
      }
    }

    removeRow(i) {
      this.data.splice(i, 1);
      this.render();
    }
  }

  if (!customElements.get('vbg-documents-table')) {
    customElements.define('vbg-documents-table', VbgDocumentsTable);
  }
})();
