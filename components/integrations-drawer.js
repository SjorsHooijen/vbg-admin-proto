/* ============================================================
   VBG — integration detail / configuration drawer
   Usage:  <vbg-integration-drawer></vbg-integration-drawer>
           drawer.open(integration, tabId); drawer.close();
           drawer.refresh();  // re-render after a live state change

   A right-hand slide-over that consolidates every per-integration
   action listed for the admin surface:
     · Overview   — properties + sync settings (configure)
     · Credentials— auth material, rotate (manage credentials)
     · Sync history — recent runs (view history / trigger sync)
     · Logs       — events & errors (view logs and errors)
     · Tenants    — assignment toggles (assign to tenants)

   Light DOM; styles scoped under `vbg-integration-drawer`.
   Re-emits `integrationaction` { act, id } so the page controller
   stays the single place that mutates table state.
   ============================================================ */
(function () {
  const VI = function () { return window.VBG_INTEGRATIONS || {}; };

  /* deterministic seeded RNG so synthetic history/logs are stable per id */
  function seed(str) { let h = 1779033703; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return function () { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; }; }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ico(path, size, sw) { size = size || 16; sw = sw || 1.7; return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>'; }

  /* known tenant pool for assignment (mirrors the Companies tenants) */
  const TENANTS = [
    { tid: 'TEN-0142', name: 'Heijmans Vastgoed' }, { tid: 'TEN-0118', name: 'BAM Wonen' },
    { tid: 'TEN-0207', name: 'VolkerWessels' }, { tid: 'TEN-0131', name: 'Arcadis' },
    { tid: 'TEN-0149', name: 'Royal HaskoningDHV' }, { tid: 'TEN-0156', name: 'Ballast Nedam' },
    { tid: 'TEN-0174', name: 'TBI Bouw' }, { tid: 'TEN-0211', name: 'Betonson' },
    { tid: 'TEN-0245', name: 'VBI' }, { tid: 'TEN-0276', name: 'Witteveen+Bos' },
    { tid: 'TEN-0312', name: 'Reynaers Aluminium' }, { tid: 'TEN-0338', name: 'Mecanoo' },
    { tid: 'TEN-0371', name: 'MVRDV' }, { tid: 'TEN-0233', name: 'Dura Vermeer' },
    { tid: 'TEN-0259', name: 'Strukton' }, { tid: 'TEN-0387', name: 'Pieters Bouwtechniek' },
    { tid: 'TEN-0288', name: 'AM Real Estate' }, { tid: 'TEN-0301', name: 'Amvest' },
    { tid: 'TEN-0355', name: 'IMd Raadgevende Ingenieurs' }, { tid: 'TEN-0344', name: 'Synchroon' },
    { tid: 'TEN-0179', name: 'Heembouw' }
  ];

  const I_CLOSE = '<path d="M18 6 6 18"/><path d="M6 6l12 12"/>';
  const I_SYNC  = '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/>';
  const I_PLUG  = '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>';
  const I_UNPLUG= '<path d="m19 5 3-3"/><path d="m2 22 3-3"/><path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z"/><path d="M7.5 13.5 10 11"/><path d="M10.5 16.5 13 14"/><path d="m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z"/>';
  const I_COPY  = '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>';
  const I_EYE   = '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>';
  const I_EYEOFF= '<path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-2.16 2.92"/><path d="M6.6 6.6A13.3 13.3 0 0 0 2 11s3.5 7 10 7a9 9 0 0 0 3.4-.66"/><path d="m2 2 20 20"/><path d="M9.5 9.5a3 3 0 0 0 4.2 4.2"/>';

  const TABS = [
    { id: 'overview',    label: 'Overview' },
    { id: 'credentials', label: 'Credentials' },
    { id: 'history',     label: 'Sync history' },
    { id: 'logs',        label: 'Logs' },
    { id: 'tenants',     label: 'Tenants' }
  ];

  const STYLE = `
    vbg-integration-drawer { position: absolute; inset: 0; z-index: 80; display: none; }
    vbg-integration-drawer[open] { display: block; }
    vbg-integration-drawer .scrim {
      position: absolute; inset: 0; background: rgba(14,17,22,.38);
      opacity: 0; transition: opacity var(--dur-base) var(--ease-out);
    }
    vbg-integration-drawer[open] .scrim { opacity: 1; }
    vbg-integration-drawer .panel {
      position: absolute; top: 0; right: 0; bottom: 0; width: 588px; max-width: 92%;
      background: var(--bg-surface); border-left: 1px solid var(--border);
      box-shadow: var(--shadow-lg); display: flex; flex-direction: column;
      transform: translateX(100%); transition: transform var(--dur-slow) var(--ease-out);
    }
    vbg-integration-drawer[open] .panel { transform: none; }

    /* header */
    vbg-integration-drawer .dh { flex: 0 0 auto; padding: 20px 24px 0; border-bottom: 1px solid var(--border-subtle); }
    vbg-integration-drawer .dh-top { display: flex; align-items: flex-start; gap: 14px; }
    vbg-integration-drawer .dh-tile {
      width: 46px; height: 46px; flex: 0 0 46px; border-radius: var(--r-md);
      background: var(--bg-sunken); border: 1px solid var(--border-subtle);
      display: grid; place-items: center; color: var(--fg2);
    }
    vbg-integration-drawer .dh-tile.error { color: var(--status-error); border-color: #F2C9C9; background: var(--status-error-bg); }
    vbg-integration-drawer .dh-mid { flex: 1 1 auto; min-width: 0; }
    vbg-integration-drawer .dh-title { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    vbg-integration-drawer .dh-title h2 { font: var(--text-h2); color: var(--fg1); letter-spacing: -0.01em; }
    vbg-integration-drawer .dh-id { font: var(--text-mono-sm); color: var(--fg4); }
    vbg-integration-drawer .dh-sub { margin-top: 5px; font: var(--text-sm); color: var(--fg3); display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
    vbg-integration-drawer .dh-sub .prov { color: var(--fg2); font-weight: 500; }
    vbg-integration-drawer .dh-sub .mdot { width: 3px; height: 3px; border-radius: 999px; background: var(--border-strong); }
    vbg-integration-drawer .dh-close {
      flex: 0 0 auto; width: 34px; height: 34px; border-radius: var(--r-sm);
      border: 1px solid transparent; background: transparent; color: var(--fg3); cursor: pointer;
      display: grid; place-items: center; transition: background var(--dur-fast), color var(--dur-fast), border-color var(--dur-fast);
    }
    vbg-integration-drawer .dh-close:hover { background: var(--bg-hover); color: var(--fg1); border-color: var(--border); }

    vbg-integration-drawer .badge {
      display: inline-flex; align-items: center; gap: 6px;
      font: var(--text-label); padding: 3px 9px; border-radius: var(--r-full); white-space: nowrap;
    }
    vbg-integration-drawer .badge .dot { width: 7px; height: 7px; border-radius: var(--r-full); }
    vbg-integration-drawer .badge.connected { background: var(--status-success-bg); color: var(--status-success-fg); }
    vbg-integration-drawer .badge.connected .dot { background: var(--status-success); }
    vbg-integration-drawer .badge.disconnected { background: var(--status-pending-bg); color: var(--status-pending-fg); }
    vbg-integration-drawer .badge.disconnected .dot { background: var(--status-pending); }
    vbg-integration-drawer .badge.error { background: var(--status-error-bg); color: var(--status-error-fg); }
    vbg-integration-drawer .badge.error .dot { background: var(--status-error); }
    vbg-integration-drawer .badge.disabled { background: var(--slate-100); color: var(--fg4); }
    vbg-integration-drawer .badge.disabled .dot { background: var(--slate-300); }

    /* header actions */
    vbg-integration-drawer .dh-actions { display: flex; gap: 10px; padding: 16px 0 16px; }
    vbg-integration-drawer .dbtn {
      display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 14px;
      border-radius: var(--r-sm); border: 1px solid var(--border); background: var(--bg-surface);
      font: var(--text-body-strong); font-size: 13px; color: var(--fg1); cursor: pointer; white-space: nowrap;
      transition: background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
    }
    vbg-integration-drawer .dbtn:hover { background: var(--bg-hover); }
    vbg-integration-drawer .dbtn .ico { color: var(--fg3); display: inline-flex; }
    vbg-integration-drawer .dbtn.primary { background: var(--vbg-amber); border-color: transparent; color: var(--fg-inverse); box-shadow: 0 1px 2px rgba(184,111,0,.35); }
    vbg-integration-drawer .dbtn.primary:hover { background: var(--vbg-amber-600); }
    vbg-integration-drawer .dbtn.primary .ico { color: var(--fg-inverse); }
    vbg-integration-drawer .dbtn:disabled { opacity: .5; cursor: default; }
    vbg-integration-drawer .dbtn.syncing .ico svg { animation: vbgSpin 1s linear infinite; }
    @keyframes vbgSpin { to { transform: rotate(360deg); } }

    /* tabs */
    vbg-integration-drawer .dtabs { display: flex; gap: 2px; }
    vbg-integration-drawer .dtab {
      position: relative; border: 0; background: transparent; cursor: pointer;
      padding: 10px 12px 13px; font: var(--text-body-strong); font-size: 13px; color: var(--fg3);
      transition: color var(--dur-fast) var(--ease-out);
    }
    vbg-integration-drawer .dtab:hover { color: var(--fg1); }
    vbg-integration-drawer .dtab.active { color: var(--fg-accent); }
    vbg-integration-drawer .dtab.active::after { content: ''; position: absolute; left: 8px; right: 8px; bottom: -1px; height: 2px; background: var(--vbg-amber); border-radius: 2px 2px 0 0; }
    vbg-integration-drawer .dtab .n { margin-left: 7px; font: var(--text-mono-sm); color: var(--fg4); }
    vbg-integration-drawer .dtab.active .n { color: var(--vbg-amber-700); }

    /* body */
    vbg-integration-drawer .db { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 22px 24px 28px; }
    vbg-integration-drawer .sec { margin-bottom: 26px; }
    vbg-integration-drawer .sec:last-child { margin-bottom: 0; }
    vbg-integration-drawer .ol {
      font: var(--text-label); text-transform: uppercase; letter-spacing: var(--tracking-overline);
      color: var(--fg3); margin-bottom: 12px;
    }
    vbg-integration-drawer .desc { font: var(--text-body); color: var(--fg2); line-height: 1.6; margin-bottom: 22px; text-wrap: pretty; }

    /* property grid */
    vbg-integration-drawer .props { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--border-subtle); border: 1px solid var(--border-subtle); border-radius: var(--r-md); overflow: hidden; }
    vbg-integration-drawer .prop { background: var(--bg-surface); padding: 12px 14px; }
    vbg-integration-drawer .prop .k { font: var(--text-caption); color: var(--fg3); margin-bottom: 4px; }
    vbg-integration-drawer .prop .v { font: var(--text-body-strong); color: var(--fg1); display: flex; align-items: center; gap: 7px; }
    vbg-integration-drawer .prop .v.mono { font: var(--text-mono); }
    vbg-integration-drawer .prop .v .mini { display: inline-flex; color: var(--fg3); }

    /* settings rows */
    vbg-integration-drawer .srow {
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      padding: 13px 14px; border: 1px solid var(--border-subtle); border-radius: var(--r-md);
      background: var(--bg-surface); margin-bottom: 8px;
    }
    vbg-integration-drawer .srow .lab { min-width: 0; }
    vbg-integration-drawer .srow .lab .t { font: var(--text-body-strong); color: var(--fg1); }
    vbg-integration-drawer .srow .lab .d { font: var(--text-caption); color: var(--fg3); margin-top: 2px; }
    vbg-integration-drawer .sw { width: 38px; height: 22px; border-radius: 999px; background: var(--slate-300); position: relative; cursor: pointer; flex: 0 0 auto; transition: background var(--dur-fast) var(--ease-out); border: 0; padding: 0; }
    vbg-integration-drawer .sw::after { content: ''; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 999px; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.2); transition: transform var(--dur-fast) var(--ease-out); }
    vbg-integration-drawer .sw.on { background: var(--vbg-amber); }
    vbg-integration-drawer .sw.on::after { transform: translateX(16px); }
    vbg-integration-drawer .seg { display: inline-flex; border: 1px solid var(--border); border-radius: var(--r-sm); overflow: hidden; flex: 0 0 auto; }
    vbg-integration-drawer .seg button { border: 0; background: var(--bg-surface); cursor: pointer; font: var(--text-label); color: var(--fg2); padding: 6px 11px; border-right: 1px solid var(--border); }
    vbg-integration-drawer .seg button:last-child { border-right: 0; }
    vbg-integration-drawer .seg button.on { background: var(--bg-selected); color: var(--fg-accent); }

    /* credential field */
    vbg-integration-drawer .cred { margin-bottom: 12px; }
    vbg-integration-drawer .cred .k { font: var(--text-caption); color: var(--fg3); margin-bottom: 6px; }
    vbg-integration-drawer .cred .ctl {
      display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 6px 0 12px;
      background: var(--bg-sunken); border: 1px solid var(--border); border-radius: var(--r-sm);
    }
    vbg-integration-drawer .cred .ctl .val { flex: 1 1 auto; min-width: 0; font: var(--text-mono-sm); color: var(--fg1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; letter-spacing: .02em; }
    vbg-integration-drawer .cred .ctl button { width: 30px; height: 30px; border: 0; background: transparent; color: var(--fg4); cursor: pointer; border-radius: var(--r-xs); display: grid; place-items: center; flex: 0 0 auto; }
    vbg-integration-drawer .cred .ctl button:hover { color: var(--fg2); background: var(--bg-hover); }
    vbg-integration-drawer .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    vbg-integration-drawer .chip { font: var(--text-mono-sm); color: var(--fg2); background: var(--bg-sunken); border: 1px solid var(--border-subtle); border-radius: var(--r-xs); padding: 3px 8px; }
    vbg-integration-drawer .note {
      display: flex; gap: 10px; align-items: flex-start; padding: 11px 13px; border-radius: var(--r-sm);
      background: var(--bg-sunken); border: 1px solid var(--border-subtle); font: var(--text-sm); color: var(--fg2); margin-top: 6px;
    }
    vbg-integration-drawer .note.warn { background: var(--status-warning-bg); border-color: #ECDCA8; color: var(--status-warning-fg); }
    vbg-integration-drawer .note.err { background: var(--status-error-bg); border-color: #F2C9C9; color: var(--status-error-fg); }
    vbg-integration-drawer .note .ico { flex: 0 0 auto; margin-top: 1px; }

    /* history timeline */
    vbg-integration-drawer .runs { display: flex; flex-direction: column; }
    vbg-integration-drawer .run { display: flex; gap: 12px; padding: 12px 2px; border-bottom: 1px solid var(--border-subtle); }
    vbg-integration-drawer .run:last-child { border-bottom: 0; }
    vbg-integration-drawer .run .rdot { flex: 0 0 auto; width: 9px; height: 9px; border-radius: 999px; margin-top: 5px; }
    vbg-integration-drawer .run.ok .rdot { background: var(--status-success); }
    vbg-integration-drawer .run.fail .rdot { background: var(--status-error); }
    vbg-integration-drawer .run.part .rdot { background: var(--status-warning); }
    vbg-integration-drawer .run .rmain { flex: 1 1 auto; min-width: 0; }
    vbg-integration-drawer .run .rtop { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
    vbg-integration-drawer .run .rtime { font: var(--text-body-strong); color: var(--fg1); }
    vbg-integration-drawer .run .rwhen { font: var(--text-mono-sm); color: var(--fg4); }
    vbg-integration-drawer .run .rdetail { font: var(--text-sm); color: var(--fg3); margin-top: 3px; }
    vbg-integration-drawer .run .rdetail b { color: var(--fg2); font-weight: 500; font-family: var(--font-mono); }

    /* logs */
    vbg-integration-drawer .logs { border: 1px solid var(--border-subtle); border-radius: var(--r-md); overflow: hidden; }
    vbg-integration-drawer .lrow { display: flex; gap: 12px; padding: 9px 13px; border-bottom: 1px solid var(--border-subtle); align-items: baseline; }
    vbg-integration-drawer .lrow:last-child { border-bottom: 0; }
    vbg-integration-drawer .lrow:nth-child(even) { background: var(--slate-50); }
    vbg-integration-drawer .lrow .lt { font: var(--text-mono-sm); color: var(--fg4); flex: 0 0 112px; white-space: nowrap; }
    vbg-integration-drawer .lrow .ll { flex: 0 0 56px; font: var(--text-label); font-size: 10px; letter-spacing: .04em; text-transform: uppercase; padding: 2px 0; }
    vbg-integration-drawer .lrow .ll.info { color: var(--status-info-fg); }
    vbg-integration-drawer .lrow .ll.warn { color: var(--status-warning-fg); }
    vbg-integration-drawer .lrow .ll.err { color: var(--status-error-fg); }
    vbg-integration-drawer .lrow .lm { flex: 1 1 auto; font: var(--text-mono-sm); color: var(--fg2); line-height: 1.5; }
    vbg-integration-drawer .lrow.err .lm { color: var(--status-error-fg); }

    /* tenants */
    vbg-integration-drawer .trow { display: flex; align-items: center; gap: 12px; padding: 11px 4px; border-bottom: 1px solid var(--border-subtle); }
    vbg-integration-drawer .trow:last-child { border-bottom: 0; }
    vbg-integration-drawer .trow .ttile { width: 32px; height: 32px; flex: 0 0 32px; border-radius: var(--r-sm); background: var(--bg-sunken); border: 1px solid var(--border-subtle); display: grid; place-items: center; font: var(--text-label); font-weight: 600; color: var(--fg2); }
    vbg-integration-drawer .trow .tmid { flex: 1 1 auto; min-width: 0; }
    vbg-integration-drawer .trow .tn { font: var(--text-body-strong); color: var(--fg1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    vbg-integration-drawer .trow .tid { font: var(--text-mono-sm); color: var(--fg4); margin-top: 1px; }
    vbg-integration-drawer .tsearch { display: flex; align-items: center; gap: 9px; height: 38px; padding: 0 12px; background: var(--bg-sunken); border: 1px solid var(--border); border-radius: var(--r-sm); margin-bottom: 14px; }
    vbg-integration-drawer .tsearch:focus-within { border-color: var(--border-focus); box-shadow: var(--ring-focus); }
    vbg-integration-drawer .tsearch input { flex: 1 1 auto; border: 0; background: transparent; outline: none; font: var(--text-body); color: var(--fg1); }
    vbg-integration-drawer .tsearch .ico { color: var(--fg4); }
    vbg-integration-drawer .global-note { margin-bottom: 14px; }
  `;

  function injectStyle() {
    if (document.getElementById('vbg-integration-drawer-style')) return;
    const s = document.createElement('style'); s.id = 'vbg-integration-drawer-style'; s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function maskKey(rand, len, prefix) {
    const hex = '0123456789abcdef';
    let s = ''; for (let i = 0; i < len; i++) s += hex[Math.floor(rand() * 16)];
    return (prefix || '') + s;
  }

  class VbgIntegrationDrawer extends HTMLElement {
    connectedCallback() {
      injectStyle();
      this.it = null; this.tab = 'overview'; this.reveal = {};
      this.assigned = null; this.tquery = '';
      this.innerHTML = '<div class="scrim"></div><div class="panel"><div class="dh"></div><div class="db"></div></div>';
      this.scrim = this.querySelector('.scrim');
      this.dh = this.querySelector('.dh');
      this.db = this.querySelector('.db');
      this._click = this.onClick.bind(this);
      this.addEventListener('click', this._click);
      this._key = function (e) { if (e.key === 'Escape' && this.hasAttribute('open')) this.close(); }.bind(this);
      document.addEventListener('keydown', this._key);
    }
    disconnectedCallback() { document.removeEventListener('keydown', this._key); }

    open(it, tab) {
      this.it = it; this.tab = tab || 'overview'; this.reveal = {};
      this.tquery = '';
      this.buildAssigned(it);
      this.setAttribute('open', '');
      this.render();
    }
    close() { this.removeAttribute('open'); }
    refresh() { if (this.it && this.hasAttribute('open')) { const live = (VI().LIVE || []).filter(function(x){return x.id===this.it.id;}.bind(this))[0]; if (live) this.it = live; this.render(); } }

    buildAssigned(it) {
      const rand = seed(it.id + 'tenants');
      this.assigned = {};
      if (it.scope === 'global') { TENANTS.forEach(function (t) { this.assigned[t.tid] = true; }.bind(this)); }
      else {
        let n = it.tenants, picks = TENANTS.slice().sort(function(){ return rand() - 0.5; }).slice(0, Math.max(0, n));
        TENANTS.forEach(function (t) { this.assigned[t.tid] = false; }.bind(this));
        picks.forEach(function (t) { this.assigned[t.tid] = true; }.bind(this));
      }
    }

    render() {
      if (!this.it) return;
      const it = this.it, V = VI();
      const TY = (V.TYPES || {})[it.type] || { label: it.type, glyph: '' };
      const err = it.status === 'error';
      const connected = it.status === 'connected' || it.status === 'error';
      /* header */
      this.dh.innerHTML = ''
        + '<div class="dh-top">'
        +   '<span class="dh-tile' + (err ? ' error' : '') + '">' + ico(TY.glyph, 23, 1.7) + '</span>'
        +   '<div class="dh-mid">'
        +     '<div class="dh-title"><h2>' + esc(it.name) + '</h2><span class="dh-id">' + esc(it.id) + '</span></div>'
        +     '<div class="dh-sub"><span class="prov">' + esc(it.provider) + '</span><span class="mdot"></span>' + esc(TY.label)
        +       '<span class="mdot"></span>' + esc((V.AUTH || {})[it.auth] || it.auth)
        +       '<span class="mdot"></span><span class="badge ' + it.status + '"><span class="dot"></span>' + (V.STATUS_LABEL || {})[it.status] + '</span></div>'
        +   '</div>'
        +   '<button class="dh-close" aria-label="Close" data-x>' + ico(I_CLOSE, 18, 2) + '</button>'
        + '</div>'
        + '<div class="dh-actions">'
        +   '<button class="dbtn primary" data-do="sync"' + (connected ? '' : ' disabled') + '><span class="ico">' + ico(I_SYNC, 15) + '</span>Sync now</button>'
        +   (connected
            ? '<button class="dbtn" data-do="disconnect"><span class="ico">' + ico(I_UNPLUG, 15) + '</span>Disconnect</button>'
            : (it.status === 'disconnected'
              ? '<button class="dbtn" data-do="connect"><span class="ico">' + ico(I_PLUG, 15) + '</span>Connect</button>'
              : '<button class="dbtn" data-do="enable"><span class="ico">' + ico(I_PLUG, 15) + '</span>Enable</button>'))
        + '</div>'
        + '<div class="dtabs">' + TABS.map(function (t) {
            let n = '';
            if (t.id === 'tenants') n = '<span class="n">' + it.tenants + '</span>';
            return '<button class="dtab' + (t.id === this.tab ? ' active' : '') + '" data-tab="' + t.id + '">' + t.label + n + '</button>';
          }.bind(this)).join('') + '</div>';

      /* body */
      this.db.innerHTML = this['tab_' + this.tab] ? this['tab_' + this.tab](it) : '';
      this.db.scrollTop = 0;
    }

    /* ---------------- OVERVIEW ---------------- */
    tab_overview(it) {
      const V = VI();
      const TY = (V.TYPES || {})[it.type] || { label: it.type };
      const rand = seed(it.id + 'ep');
      const host = it.provider.toLowerCase().replace(/[^a-z]/g, '').slice(0, 10) || 'service';
      const endpoint = 'https://api.' + host + '.com/v2/vbg';
      function row(k, v, mono) { return '<div class="prop"><div class="k">' + k + '</div><div class="v' + (mono ? ' mono' : '') + '">' + v + '</div></div>'; }
      const synced = '<span class="badge ' + (it.syncStatus === 'failed' ? 'error' : (it.syncStatus === 'synced' ? 'connected' : 'disabled')) + '"><span class="dot"></span>' + (V.SYNC_LABEL || {})[it.syncStatus] + '</span>';
      const props = '<div class="props">'
        + row('Provider', esc(it.provider))
        + row('Category', esc(TY.label))
        + row('Authentication', esc((V.AUTH || {})[it.auth] || it.auth))
        + row('Assignment scope', it.scope === 'global' ? 'All tenants' : 'Selected tenants')
        + row('Connected tenants', it.tenants, true)
        + row('Last sync', it.lastSync ? (V.fmtDate(it.lastSync) + ' ' + V.fmtTime(it.lastSync)) : '—', true)
        + row('Created', V.fmtDate(it.created), true)
        + row('Last modified', V.fmtDate(it.modified), true)
        + '</div>';
      const freq = (['15m', 'hourly', 'daily'])[Math.floor(rand() * 3)];
      const settings = '<div class="sec"><div class="ol">Sync settings</div>'
        + this.srow('Automatic sync', 'Run scheduled syncs without manual triggers', 'sw', it.status === 'connected')
        + this.srowSeg('Sync frequency', 'How often a scheduled sync runs', [['15m', 'Every 15 min'], ['hourly', 'Hourly'], ['daily', 'Daily']], freq)
        + this.srow('Notify on failure', 'Post an alert to the operations channel if a sync fails', 'sw', true)
        + this.srow('Read-only mode', 'Pull from the provider but never write back', 'sw', it.type === 'gis' || it.type === 'analytics')
        + '</div>';
      const endpointSec = '<div class="sec"><div class="ol">Connection</div>'
        + '<div class="cred"><div class="k">Base endpoint</div><div class="ctl"><span class="val">' + endpoint + '</span>'
        + '<button data-copy="' + endpoint + '" title="Copy">' + ico(I_COPY, 15) + '</button></div></div></div>';
      return '<div class="sec"><p class="desc">' + esc(it.desc) + '</p>' + props + '</div>' + settings + endpointSec;
    }
    srow(t, d, kind, on) {
      return '<div class="srow"><div class="lab"><div class="t">' + t + '</div><div class="d">' + d + '</div></div>'
        + '<button class="sw' + (on ? ' on' : '') + '" data-toggle aria-label="' + t + '"></button></div>';
    }
    srowSeg(t, d, opts, cur) {
      return '<div class="srow"><div class="lab"><div class="t">' + t + '</div><div class="d">' + d + '</div></div>'
        + '<div class="seg" data-seg>' + opts.map(function (o) { return '<button data-v="' + o[0] + '"' + (o[0] === cur ? ' class="on"' : '') + '>' + o[1] + '</button>'; }).join('') + '</div></div>';
    }

    /* ---------------- CREDENTIALS ---------------- */
    tab_credentials(it) {
      const rand = seed(it.id + 'cred');
      const self = this;
      function field(key, label, value, secret) {
        const shown = (!secret || self.reveal[key]);
        const disp = shown ? value : '•'.repeat(Math.min(28, value.length));
        let btns = '';
        if (secret) btns += '<button data-reveal="' + key + '" title="Reveal">' + ico(self.reveal[key] ? I_EYEOFF : I_EYE, 15) + '</button>';
        btns += '<button data-copy="' + esc(value) + '" title="Copy">' + ico(I_COPY, 15) + '</button>';
        return '<div class="cred"><div class="k">' + label + '</div><div class="ctl"><span class="val">' + esc(disp) + '</span>' + btns + '</div></div>';
      }
      let body = '';
      const auth = it.auth;
      if (auth === 'oauth') {
        body += field('cid', 'Client ID', maskKey(rand, 24, ''))
          + field('sec', 'Client secret', maskKey(rand, 40, 'cs_'), true)
          + field('redir', 'Redirect URI', 'https://app.vbg.io/oauth/callback')
          + '<div class="sec"><div class="ol" style="margin-top:18px;">Granted scopes</div><div class="chips">'
          + ['data.read', 'data.write', 'models.read', 'projects.read', 'offline_access'].map(function (s) { return '<span class="chip">' + s + '</span>'; }).join('') + '</div></div>';
      } else if (auth === 'apikey') {
        body += field('key', 'API key', maskKey(rand, 40, 'vbg_live_'), true)
          + field('secret', 'Signing secret', maskKey(rand, 32, 'whsec_'), true);
      } else if (auth === 'saml') {
        body += field('eid', 'Identity provider entity ID', 'https://idp.' + it.provider.toLowerCase().replace(/[^a-z]/g, '') + '.com/saml')
          + field('acs', 'ACS (reply) URL', 'https://app.vbg.io/saml/acs')
          + field('fp', 'Signing certificate fingerprint', maskKey(rand, 40, 'SHA256:'), true)
          + '<div class="note"><span class="ico">' + ico('<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', 16) + '</span>Certificate valid until <b style="font-family:var(--font-mono)">14 Mar 2027</b>.</div>';
      } else if (auth === 'scim') {
        body += field('base', 'SCIM base URL', 'https://app.vbg.io/scim/v2')
          + field('token', 'Bearer token', maskKey(rand, 44, 'scim_'), true);
      } else if (auth === 'service') {
        body += field('acct', 'Service account', 'svc-vbg@' + it.provider.toLowerCase().replace(/[^a-z]/g, '') + '.iam')
          + field('kid', 'Key ID', maskKey(rand, 24, ''))
          + field('pk', 'Private key', maskKey(rand, 48, '-----BEGIN '), true);
      } else if (auth === 'webhook') {
        body += field('url', 'Delivery URL', 'https://hooks.vbg.io/relay/' + it.id.toLowerCase())
          + field('sig', 'Signing secret', maskKey(rand, 36, 'whsec_'), true);
      } else {
        body += field('pat', 'Personal access token', maskKey(rand, 40, 'pat_'), true);
      }
      const rotated = '<div class="note"><span class="ico">' + ico('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>', 16) + '</span>Last rotated <b style="font-family:var(--font-mono)">' + VI().fmtDate(it.modified) + '</b> · auto-rotation off.</div>';
      const actions = '<div class="dh-actions" style="padding:18px 0 0;"><button class="dbtn" data-do="rotate"><span class="ico">' + ico(I_SYNC, 15) + '</span>Rotate credentials</button><button class="dbtn" data-do="test"><span class="ico">' + ico('<path d="M20 6 9 17l-5-5"/>', 15) + '</span>Test connection</button></div>';
      return '<div class="sec"><div class="ol">' + esc((VI().AUTH || {})[it.auth] || it.auth) + ' credentials</div>' + body + rotated + actions + '</div>';
    }

    /* ---------------- SYNC HISTORY ---------------- */
    tab_history(it) {
      const V = VI();
      const rand = seed(it.id + 'hist');
      const trigger = '<div class="dh-actions" style="padding:0 0 16px;"><button class="dbtn primary" data-do="sync"' + ((it.status === 'connected' || it.status === 'error') ? '' : ' disabled') + '><span class="ico">' + ico(I_SYNC, 15) + '</span>Trigger manual sync</button></div>';
      if (!it.lastSync) return trigger + '<div class="note">No sync has run for this integration yet.</div>';
      let runs = [];
      let base = new Date(it.lastSync);
      const failFirst = it.syncStatus === 'failed';
      for (let i = 0; i < 8; i++) {
        const t = new Date(base.getTime() - i * (1000 * 60 * 60 * (3 + Math.floor(rand() * 9))));
        let result = 'ok';
        if (i === 0 && failFirst) result = 'fail';
        else { const r = rand(); result = r < 0.08 ? 'fail' : (r < 0.18 ? 'part' : 'ok'); }
        const dur = (0.4 + rand() * 9).toFixed(1);
        const recs = Math.floor(40 + rand() * 1800);
        runs.push({ t: t, result: result, dur: dur, recs: recs });
      }
      function fmtRel(d) {
        const m = Math.round((new Date(V.nowISO()) - d) / 60000);
        if (m < 60) return m + ' min ago';
        const h = Math.round(m / 60); if (h < 24) return h + 'h ago';
        return Math.round(h / 24) + ' days ago';
      }
      function pad(n){ return ('0'+n).slice(-2); }
      const list = runs.map(function (r) {
        const cls = r.result === 'ok' ? 'ok' : (r.result === 'fail' ? 'fail' : 'part');
        const when = V.fmtDate(r.t.toISOString().slice(0,16)) + ' ' + pad(r.t.getHours()) + ':' + pad(r.t.getMinutes());
        let detail;
        if (r.result === 'fail') detail = 'Failed — <b>' + (rand() < 0.5 ? '401 auth rejected' : 'connection timeout') + '</b> after <b>' + r.dur + 's</b>';
        else if (r.result === 'part') detail = 'Completed with warnings · <b>' + r.recs + '</b> records · <b>' + Math.floor(r.recs * 0.04) + '</b> skipped · <b>' + r.dur + 's</b>';
        else detail = 'Completed · <b>' + r.recs + '</b> records synced · <b>' + r.dur + 's</b>';
        return '<div class="run ' + cls + '"><span class="rdot"></span><div class="rmain"><div class="rtop"><span class="rtime">' + (r.result === 'fail' ? 'Sync failed' : (r.result === 'part' ? 'Partial sync' : 'Sync completed')) + '</span><span class="rwhen">' + fmtRel(r.t) + '</span></div><div class="rdetail">' + when + ' · ' + detail + '</div></div></div>';
      }).join('');
      return trigger + '<div class="sec"><div class="ol">Recent runs</div><div class="runs">' + list + '</div></div>';
    }

    /* ---------------- LOGS ---------------- */
    tab_logs(it) {
      const V = VI();
      const rand = seed(it.id + 'logs');
      const base = it.lastSync ? new Date(it.lastSync) : new Date(V.nowISO());
      function pad(n){ return ('0'+n).slice(-2); }
      const okMsgs = [
        'Scheduled sync started', 'Authenticated with provider', 'Fetched delta cursor',
        'Upserted {n} model records', 'Mapped {n} entities to schema', 'Committed transaction batch',
        'Sync completed in {d}s', 'Heartbeat acknowledged', 'Cleared {n} stale references'
      ];
      const warnMsgs = ['Rate limit approaching (82% of window)', 'Skipped {n} records failing validation', 'Retrying request (attempt 2/3)'];
      const errMsgs = ['401 Unauthorized — token rejected by provider', 'Connection timed out after 30000ms', 'Schema mismatch on field "elementId"'];
      let lines = []; let t = base.getTime();
      const broken = it.status === 'error' || it.syncStatus === 'failed';
      for (let i = 0; i < 14; i++) {
        t -= Math.floor(20000 + rand() * 600000);
        let lvl = 'info', msg = okMsgs[Math.floor(rand() * okMsgs.length)];
        const r = rand();
        if (broken && i < 2) { lvl = 'err'; msg = errMsgs[Math.floor(rand() * errMsgs.length)]; }
        else if (r < 0.12) { lvl = 'warn'; msg = warnMsgs[Math.floor(rand() * warnMsgs.length)]; }
        else if (r < 0.16 && broken) { lvl = 'err'; msg = errMsgs[Math.floor(rand() * errMsgs.length)]; }
        msg = msg.replace('{n}', Math.floor(20 + rand() * 1500)).replace('{d}', (0.5 + rand() * 8).toFixed(1));
        const d = new Date(t);
        lines.push({ ts: pad(d.getDate()) + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()] + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()), lvl: lvl, msg: msg });
      }
      const rows = lines.map(function (l) {
        const lab = l.lvl === 'info' ? 'INFO' : (l.lvl === 'warn' ? 'WARN' : 'ERROR');
        return '<div class="lrow ' + (l.lvl === 'err' ? 'err' : '') + '"><span class="lt">' + l.ts + '</span><span class="ll ' + l.lvl + '">' + lab + '</span><span class="lm">' + esc(l.msg) + '</span></div>';
      }).join('');
      const head = broken
        ? '<div class="note err"><span class="ico">' + ico('<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>', 16) + '</span>Most recent sync failed. Review the error lines below or rotate credentials.</div>'
        : '';
      return '<div class="sec">' + head + '<div class="ol" style="margin-top:' + (broken ? '14px' : '0') + ';">Event log</div><div class="logs">' + rows + '</div></div>';
    }

    /* ---------------- TENANTS ---------------- */
    tab_tenants(it) {
      const self = this;
      const note = it.scope === 'global'
        ? '<div class="note global-note"><span class="ico">' + ico('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>', 16) + '</span>This is a <b>global</b> integration — available to every tenant. Toggle individual tenants to switch to scoped assignment.</div>'
        : '<div class="note global-note"><span class="ico">' + ico('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>', 16) + '</span>Scoped integration — enabled only for the selected tenants below.</div>';
      const search = '<div class="tsearch"><span class="ico">' + ico('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>', 16) + '</span><input type="text" placeholder="Filter tenants…" data-tsearch value="' + esc(this.tquery) + '"></div>';
      const q = this.tquery.toLowerCase();
      const rows = TENANTS.filter(function (t) { return !q || t.name.toLowerCase().indexOf(q) >= 0 || t.tid.toLowerCase().indexOf(q) >= 0; }).map(function (t) {
        const on = self.assigned[t.tid];
        const init = t.name.replace(/[^A-Za-z0-9 &+]/g, '').trim().split(/[ &+]+/).filter(Boolean);
        const tile = (init.length === 1 ? init[0].slice(0, 2) : (init[0][0] + init[1][0])).toUpperCase();
        return '<div class="trow"><span class="ttile">' + tile + '</span><div class="tmid"><div class="tn">' + esc(t.name) + '</div><div class="tid">' + t.tid + '</div></div>'
          + '<button class="sw' + (on ? ' on' : '') + '" data-tenant="' + t.tid + '" aria-label="Toggle ' + esc(t.name) + '"></button></div>';
      }).join('');
      const n = Object.keys(this.assigned).filter(function (k) { return self.assigned[k]; }).length;
      return '<div class="sec">' + note + search + '<div class="ol">' + n + ' of ' + TENANTS.length + ' tenants assigned</div>' + rows + '</div>';
    }

    /* ---------------- interactions ---------------- */
    onClick(e) {
      if (e.target === this.scrim) { this.close(); return; }
      if (e.target.closest('[data-x]')) { this.close(); return; }

      const tab = e.target.closest('.dtab');
      if (tab) { this.tab = tab.getAttribute('data-tab'); this.render(); return; }

      const doBtn = e.target.closest('[data-do]');
      if (doBtn && !doBtn.disabled) {
        const act = doBtn.getAttribute('do') || doBtn.getAttribute('data-do');
        if (act === 'rotate' || act === 'test') {
          /* lightweight visual confirmation, no table mutation */
          doBtn.classList.add('syncing'); const old = doBtn.innerHTML;
          setTimeout(function () { doBtn.classList.remove('syncing'); }, 1400);
          return;
        }
        this.dispatchEvent(new CustomEvent('integrationaction', { bubbles: true, detail: { act: act, id: this.it.id } }));
        return;
      }

      const copy = e.target.closest('[data-copy]');
      if (copy) {
        const v = copy.getAttribute('data-copy');
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).catch(function () {});
        const old = copy.innerHTML; copy.innerHTML = ico('<path d="M20 6 9 17l-5-5"/>', 15);
        setTimeout(function () { copy.innerHTML = old; }, 1100);
        return;
      }
      const rev = e.target.closest('[data-reveal]');
      if (rev) { const k = rev.getAttribute('data-reveal'); this.reveal[k] = !this.reveal[k]; this.render(); return; }

      const tog = e.target.closest('[data-toggle]');
      if (tog) { tog.classList.toggle('on'); return; }

      const seg = e.target.closest('[data-seg] button');
      if (seg) { seg.parentElement.querySelectorAll('button').forEach(function (b) { b.classList.remove('on'); }); seg.classList.add('on'); return; }

      const ten = e.target.closest('[data-tenant]');
      if (ten) {
        const id = ten.getAttribute('data-tenant');
        this.assigned[id] = !this.assigned[id];
        ten.classList.toggle('on');
        /* update the count line + tab badge live */
        const self = this;
        const n = Object.keys(this.assigned).filter(function (k) { return self.assigned[k]; }).length;
        const ol = this.db.querySelector('.ol'); if (ol) ol.textContent = n + ' of ' + TENANTS.length + ' tenants assigned';
        const badge = this.dh.querySelector('.dtab[data-tab="tenants"] .n'); if (badge) badge.textContent = n;
        return;
      }
    }

    onTSearch(v) { this.tquery = v; }
  }

  /* keep tenant search responsive without full re-render losing focus */
  document.addEventListener('input', function (e) {
    const inp = e.target.closest('vbg-integration-drawer [data-tsearch]');
    if (!inp) return;
    const drawer = inp.closest('vbg-integration-drawer');
    drawer.tquery = inp.value;
    const list = drawer.db;
    const scroll = list.scrollTop;
    list.innerHTML = drawer.tab_tenants(drawer.it);
    const ni = list.querySelector('[data-tsearch]'); if (ni) { ni.focus(); ni.setSelectionRange(ni.value.length, ni.value.length); }
    list.scrollTop = scroll;
  });

  if (!customElements.get('vbg-integration-drawer')) {
    customElements.define('vbg-integration-drawer', VbgIntegrationDrawer);
  }
})();
