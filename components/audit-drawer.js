/* ============================================================
   VBG — audit event detail drawer
   Usage:  <vbg-audit-drawer></vbg-audit-drawer>
           drawer.open(event, tabId); drawer.close();

   A right-hand slide-over exposing the full immutable record:
     · Detail     — actor, affected entity, source, outcome, timestamps
     · Changes    — previous → new value diff
     · Compliance — status, applicable controls, retention, visibility
     · Raw        — the canonical JSON record

   Light DOM; styles scoped under `vbg-audit-drawer`.
   Re-emits `auditaction` { act, id } so the page controller stays the
   single place that handles flags / exports / cross-filters.
   ============================================================ */
(function () {
  const VA = function () { return window.VBG_AUDIT || {}; };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ico(path, size, sw) { size = size || 16; sw = sw || 1.7; return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>'; }

  const I_CLOSE  = '<path d="M18 6 6 18"/><path d="M6 6l12 12"/>';
  const I_FLAG   = '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>';
  const I_EXPORT = '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>';
  const I_COPY   = '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>';
  const I_ARROW  = '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>';

  const TABS = [
    { id: 'detail',     label: 'Detail' },
    { id: 'changes',    label: 'Changes' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'raw',        label: 'Raw' }
  ];

  const STYLE = `
    vbg-audit-drawer { position: absolute; inset: 0; z-index: 80; display: none; }
    vbg-audit-drawer[open] { display: block; }
    vbg-audit-drawer .scrim { position: absolute; inset: 0; background: rgba(14,17,22,.38); opacity: 0; transition: opacity var(--dur-base) var(--ease-out); }
    vbg-audit-drawer[open] .scrim { opacity: 1; }
    vbg-audit-drawer .panel {
      position: absolute; top: 0; right: 0; bottom: 0; width: 600px; max-width: 92%;
      background: var(--bg-surface); border-left: 1px solid var(--border); box-shadow: var(--shadow-lg);
      display: flex; flex-direction: column; transform: translateX(100%); transition: transform var(--dur-slow) var(--ease-out);
    }
    vbg-audit-drawer[open] .panel { transform: none; }

    vbg-audit-drawer .dh { flex: 0 0 auto; padding: 20px 24px 0; border-bottom: 1px solid var(--border-subtle); }
    vbg-audit-drawer .dh-top { display: flex; align-items: flex-start; gap: 14px; }
    vbg-audit-drawer .dh-tile { width: 46px; height: 46px; flex: 0 0 46px; border-radius: var(--r-md); display: grid; place-items: center; border: 1px solid transparent; }
    vbg-audit-drawer .dh-tile.info { background: var(--status-info-bg); color: var(--status-info); }
    vbg-audit-drawer .dh-tile.generated { background: var(--vbg-amber-100); color: var(--vbg-amber-700); }
    vbg-audit-drawer .dh-tile.validated { background: var(--status-validated-bg); color: var(--status-validated); }
    vbg-audit-drawer .dh-tile.pending { background: var(--bg-sunken); color: var(--fg3); border-color: var(--border-subtle); }
    vbg-audit-drawer .dh-tile.error { background: var(--status-error-bg); color: var(--status-error); }
    vbg-audit-drawer .dh-mid { flex: 1 1 auto; min-width: 0; }
    vbg-audit-drawer .dh-over { font: var(--text-label); text-transform: uppercase; letter-spacing: var(--tracking-overline); color: var(--fg3); margin-bottom: 4px; }
    vbg-audit-drawer .dh-title { font: var(--text-h2); color: var(--fg1); letter-spacing: -0.01em; }
    vbg-audit-drawer .dh-sub { margin-top: 7px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    vbg-audit-drawer .dh-id { font: var(--text-mono-sm); color: var(--fg4); }
    vbg-audit-drawer .dh-close { flex: 0 0 auto; width: 34px; height: 34px; border-radius: var(--r-sm); border: 1px solid transparent; background: transparent; color: var(--fg3); cursor: pointer; display: grid; place-items: center; transition: background var(--dur-fast), color var(--dur-fast), border-color var(--dur-fast); }
    vbg-audit-drawer .dh-close:hover { background: var(--bg-hover); color: var(--fg1); border-color: var(--border); }

    vbg-audit-drawer .out { display: inline-flex; align-items: center; gap: 6px; font: var(--text-label); padding: 3px 9px; border-radius: var(--r-full); white-space: nowrap; }
    vbg-audit-drawer .out .dot { width: 7px; height: 7px; border-radius: 999px; }
    vbg-audit-drawer .out.success { background: var(--status-success-bg); color: var(--status-success-fg); } vbg-audit-drawer .out.success .dot { background: var(--status-success); }
    vbg-audit-drawer .out.error { background: var(--status-error-bg); color: var(--status-error-fg); } vbg-audit-drawer .out.error .dot { background: var(--status-error); }
    vbg-audit-drawer .out.warning { background: var(--status-warning-bg); color: var(--status-warning-fg); } vbg-audit-drawer .out.warning .dot { background: var(--status-warning); }
    vbg-audit-drawer .sevp { display: inline-flex; align-items: center; gap: 6px; font: var(--text-label); padding: 3px 9px; border-radius: var(--r-full); border: 1px solid var(--border); color: var(--fg2); }
    vbg-audit-drawer .sevp .sdot { width: 6px; height: 6px; border-radius: 999px; }
    vbg-audit-drawer .sevp.error .sdot { background: var(--status-error); } vbg-audit-drawer .sevp.warning .sdot { background: var(--status-warning); }
    vbg-audit-drawer .sevp.info .sdot { background: var(--status-info); } vbg-audit-drawer .sevp.pending .sdot { background: var(--slate-300); }

    vbg-audit-drawer .dh-actions { display: flex; gap: 10px; padding: 16px 0 16px; }
    vbg-audit-drawer .dbtn { display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 14px; border-radius: var(--r-sm); border: 1px solid var(--border); background: var(--bg-surface); font: var(--text-body-strong); font-size: 13px; color: var(--fg1); cursor: pointer; white-space: nowrap; transition: background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out); }
    vbg-audit-drawer .dbtn:hover { background: var(--bg-hover); }
    vbg-audit-drawer .dbtn .ico { color: var(--fg3); display: inline-flex; }
    vbg-audit-drawer .dbtn.primary { background: var(--vbg-amber); border-color: transparent; color: var(--fg-inverse); box-shadow: 0 1px 2px rgba(184,111,0,.35); }
    vbg-audit-drawer .dbtn.primary:hover { background: var(--vbg-amber-600); }
    vbg-audit-drawer .dbtn.primary .ico { color: var(--fg-inverse); }
    vbg-audit-drawer .dbtn.on { background: var(--status-error-bg); border-color: #F2C9C9; color: var(--status-error-fg); }
    vbg-audit-drawer .dbtn.on .ico { color: var(--status-error); }

    vbg-audit-drawer .dtabs { display: flex; gap: 2px; }
    vbg-audit-drawer .dtab { position: relative; border: 0; background: transparent; cursor: pointer; padding: 10px 12px 13px; font: var(--text-body-strong); font-size: 13px; color: var(--fg3); transition: color var(--dur-fast) var(--ease-out); }
    vbg-audit-drawer .dtab:hover { color: var(--fg1); }
    vbg-audit-drawer .dtab.active { color: var(--fg-accent); }
    vbg-audit-drawer .dtab.active::after { content: ''; position: absolute; left: 8px; right: 8px; bottom: -1px; height: 2px; background: var(--vbg-amber); border-radius: 2px 2px 0 0; }
    vbg-audit-drawer .dtab .n { margin-left: 7px; font: var(--text-mono-sm); color: var(--fg4); }
    vbg-audit-drawer .dtab.active .n { color: var(--vbg-amber-700); }

    vbg-audit-drawer .db { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 22px 24px 28px; }
    vbg-audit-drawer .sec { margin-bottom: 24px; }
    vbg-audit-drawer .sec:last-child { margin-bottom: 0; }
    vbg-audit-drawer .ol { font: var(--text-label); text-transform: uppercase; letter-spacing: var(--tracking-overline); color: var(--fg3); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
    vbg-audit-drawer .ol .olr { text-transform: none; letter-spacing: 0; font: var(--text-caption); color: var(--fg4); }

    /* what-happened summary */
    vbg-audit-drawer .summary { font: var(--text-body); color: var(--fg2); line-height: 1.6; padding: 14px 16px; border: 1px solid var(--border-subtle); border-radius: var(--r-md); background: var(--bg-surface); }

    /* note banners */
    vbg-audit-drawer .note { display: flex; gap: 10px; align-items: flex-start; padding: 11px 13px; border-radius: var(--r-sm); background: var(--bg-sunken); border: 1px solid var(--border-subtle); font: var(--text-sm); color: var(--fg2); }
    vbg-audit-drawer .note.warn { background: var(--status-warning-bg); border-color: #ECDCA8; color: var(--status-warning-fg); }
    vbg-audit-drawer .note.err { background: var(--status-error-bg); border-color: #F2C9C9; color: var(--status-error-fg); }
    vbg-audit-drawer .note.ok { background: var(--status-success-bg); border-color: #BFE6CD; color: var(--status-success-fg); }
    vbg-audit-drawer .note .ico { flex: 0 0 auto; margin-top: 1px; }
    vbg-audit-drawer .note b { font-weight: 600; }

    /* property grid */
    vbg-audit-drawer .props { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--border-subtle); border: 1px solid var(--border-subtle); border-radius: var(--r-md); overflow: hidden; }
    vbg-audit-drawer .prop { background: var(--bg-surface); padding: 12px 14px; min-width: 0; }
    vbg-audit-drawer .prop.span2 { grid-column: 1 / -1; }
    vbg-audit-drawer .prop .k { font: var(--text-caption); color: var(--fg3); margin-bottom: 4px; }
    vbg-audit-drawer .prop .v { font: var(--text-body-strong); color: var(--fg1); display: flex; align-items: center; gap: 7px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    vbg-audit-drawer .prop .v.mono { font: var(--text-mono); }
    vbg-audit-drawer .prop .v .sub { font: var(--text-mono-sm); color: var(--fg4); font-weight: 400; }

    /* actor card */
    vbg-audit-drawer .actor-card { display: flex; align-items: center; gap: 12px; padding: 13px 14px; border: 1px solid var(--border-subtle); border-radius: var(--r-md); background: var(--bg-surface); }
    vbg-audit-drawer .actor-card .cav { width: 40px; height: 40px; flex: 0 0 40px; border-radius: var(--r-full); background: var(--vbg-amber); color: var(--fg-inverse); display: grid; place-items: center; font: var(--text-body-strong); font-weight: 600; }
    vbg-audit-drawer .actor-card .cav.sys { background: var(--slate-200); color: var(--fg2); }
    vbg-audit-drawer .actor-card .cmid { flex: 1 1 auto; min-width: 0; }
    vbg-audit-drawer .actor-card .cn { font: var(--text-body-strong); color: var(--fg1); }
    vbg-audit-drawer .actor-card .ce { font: var(--text-mono-sm); color: var(--fg3); margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    vbg-audit-drawer .actor-card .crole { font: var(--text-caption); color: var(--fg4); margin-top: 2px; }
    vbg-audit-drawer .actor-card .cbtn { flex: 0 0 auto; width: 32px; height: 32px; border: 1px solid var(--border); background: var(--bg-surface); border-radius: var(--r-sm); color: var(--fg3); cursor: pointer; display: grid; place-items: center; transition: background var(--dur-fast); }
    vbg-audit-drawer .actor-card .cbtn:hover { background: var(--bg-hover); color: var(--fg1); }

    /* changes diff */
    vbg-audit-drawer .diff { border: 1px solid var(--border-subtle); border-radius: var(--r-md); overflow: hidden; }
    vbg-audit-drawer .drow { padding: 13px 14px; border-bottom: 1px solid var(--border-subtle); }
    vbg-audit-drawer .drow:last-child { border-bottom: 0; }
    vbg-audit-drawer .drow .dfield { font: var(--text-label); text-transform: uppercase; letter-spacing: var(--tracking-overline); color: var(--fg3); margin-bottom: 9px; }
    vbg-audit-drawer .drow .dvals { display: flex; align-items: center; gap: 12px; }
    vbg-audit-drawer .dval { flex: 1 1 0; min-width: 0; padding: 9px 11px; border-radius: var(--r-sm); font: var(--text-mono-sm); border: 1px solid var(--border-subtle); }
    vbg-audit-drawer .dval .dvk { display: block; font: var(--text-caption); font-family: var(--font-sans); margin-bottom: 4px; }
    vbg-audit-drawer .dval.from { background: var(--status-error-bg); border-color: #F2C9C9; color: var(--status-error-fg); }
    vbg-audit-drawer .dval.from .dvk { color: var(--status-error-fg); opacity: .7; }
    vbg-audit-drawer .dval.to { background: var(--status-success-bg); border-color: #BFE6CD; color: var(--status-success-fg); }
    vbg-audit-drawer .dval.to .dvk { color: var(--status-success-fg); opacity: .7; }
    vbg-audit-drawer .darrow { flex: 0 0 auto; color: var(--fg4); display: inline-flex; }

    /* compliance controls */
    vbg-audit-drawer .ctrl { display: flex; align-items: flex-start; gap: 11px; padding: 12px 14px; border: 1px solid var(--border-subtle); border-radius: var(--r-md); background: var(--bg-surface); margin-bottom: 8px; }
    vbg-audit-drawer .ctrl .cico { flex: 0 0 auto; width: 30px; height: 30px; border-radius: var(--r-sm); background: var(--status-validated-bg); color: var(--status-validated); display: grid; place-items: center; }
    vbg-audit-drawer .ctrl .cmain { flex: 1 1 auto; min-width: 0; }
    vbg-audit-drawer .ctrl .cttl { font: var(--text-body-strong); color: var(--fg1); }
    vbg-audit-drawer .ctrl .cdesc { font: var(--text-caption); color: var(--fg3); margin-top: 2px; }
    vbg-audit-drawer .ctrl .ccode { flex: 0 0 auto; font: var(--text-mono-sm); color: var(--fg3); background: var(--bg-sunken); border: 1px solid var(--border-subtle); border-radius: var(--r-xs); padding: 2px 7px; align-self: center; }

    /* raw json */
    vbg-audit-drawer .raw { background: var(--slate-950); border-radius: var(--r-md); padding: 16px 18px; overflow-x: auto; }
    vbg-audit-drawer .raw pre { margin: 0; font: var(--text-mono-sm); line-height: 1.7; color: #C0C6D1; white-space: pre; }
    vbg-audit-drawer .raw .jk { color: #FBC367; }
    vbg-audit-drawer .raw .js { color: #9FD8C0; }
    vbg-audit-drawer .raw .jn { color: #8FB7F0; }
    vbg-audit-drawer .raw .jnull { color: var(--slate-500); }
  `;

  function injectStyle() {
    if (document.getElementById('vbg-audit-drawer-style')) return;
    const s = document.createElement('style'); s.id = 'vbg-audit-drawer-style'; s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function initials(name) {
    const c = name.replace(/[^A-Za-z0-9 &+]/g, '').trim().split(/[ &+]+/).filter(Boolean);
    if (!c.length) return '?';
    return (c.length === 1 ? c[0].slice(0, 2) : (c[0][0] + c[1][0])).toUpperCase();
  }
  function isSystemActor(e) { return /Automated service|Finance$|connector|Identity provider/.test(e.actor.role) || e.actor.email === 'system@vbg.io'; }

  class VbgAuditDrawer extends HTMLElement {
    connectedCallback() {
      injectStyle();
      this.it = null; this.tab = 'detail';
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

    open(it, tab) { this.it = it; this.tab = tab || 'detail'; this.setAttribute('open', ''); this.render(); }
    close() { this.removeAttribute('open'); }

    render() {
      if (!this.it) return;
      const it = this.it, V = VA();
      const cat = V.CAT[it.category], out = V.OUTCOME[it.outcome], sev = V.SEV[it.severity], comp = V.COMPLIANCE[it.compliance];
      const flagged = it.compliance === 'flagged' || (V.LIVEFLAG && V.LIVEFLAG[it.id]);
      const nChanges = it.changes ? it.changes.length : 0;
      this.dh.innerHTML = ''
        + '<div class="dh-top">'
        +   '<span class="dh-tile ' + cat.tone + '">' + ico(cat.glyph, 22, 1.7) + '</span>'
        +   '<div class="dh-mid">'
        +     '<div class="dh-over">' + esc(cat.label) + '</div>'
        +     '<div class="dh-title">' + esc(it.action) + '</div>'
        +     '<div class="dh-sub">'
        +       '<span class="out ' + out.tone + '"><span class="dot"></span>' + out.label + '</span>'
        +       '<span class="sevp ' + sev.tone + '"><span class="sdot"></span>' + sev.label + '</span>'
        +       '<span class="dh-id">' + esc(it.id) + '</span>'
        +     '</div>'
        +   '</div>'
        +   '<button class="dh-close" aria-label="Close" data-x>' + ico(I_CLOSE, 18, 2) + '</button>'
        + '</div>'
        + '<div class="dh-actions">'
        +   '<button class="dbtn' + (flagged ? ' on' : '') + '" data-do="flag"><span class="ico">' + ico(I_FLAG, 15) + '</span>' + (flagged ? 'Flagged for review' : 'Flag for review') + '</button>'
        +   '<button class="dbtn" data-do="export"><span class="ico">' + ico(I_EXPORT, 15) + '</span>Export record</button>'
        +   '<button class="dbtn" data-copy="' + esc(it.id) + '"><span class="ico">' + ico(I_COPY, 15) + '</span>Copy ID</button>'
        + '</div>'
        + '<div class="dtabs">' + TABS.map(function (t) {
            let n = '';
            if (t.id === 'changes') n = '<span class="n">' + nChanges + '</span>';
            return '<button class="dtab' + (t.id === this.tab ? ' active' : '') + '" data-tab="' + t.id + '">' + t.label + n + '</button>';
          }.bind(this)).join('') + '</div>';

      this.db.innerHTML = this['tab_' + this.tab] ? this['tab_' + this.tab](it) : '';
      this.db.scrollTop = 0;
    }

    /* ---------------- DETAIL ---------------- */
    tab_detail(it) {
      const V = VA();
      let banner = '';
      if (it.outcome === 'blocked' || it.outcome === 'failure') {
        banner = '<div class="sec"><div class="note ' + (it.outcome === 'blocked' ? 'err' : 'warn') + '"><span class="ico">' + ico('<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.42 0z"/>', 16) + '</span>This action <b>' + (it.outcome === 'blocked' ? 'was blocked' : 'failed') + '</b>. Review the source and context below to determine whether follow-up is required.</div></div>';
      } else if (it.compliance === 'compliant' && it.outcome === 'success') {
        banner = '<div class="sec"><div class="note ok"><span class="ico">' + ico('<path d="M20 6 9 17l-5-5"/>', 16, 2) + '</span>Completed successfully and recorded as <b>compliant</b>. No action required.</div></div>';
      }

      const summary = '<div class="sec"><div class="ol">What happened</div><div class="summary">' + esc(it.detail) + '</div></div>';

      const sys = isSystemActor(it);
      const actorCard = '<div class="sec"><div class="ol">Performed by</div><div class="actor-card">'
        + '<span class="cav' + (sys ? ' sys' : '') + '">' + esc(initials(it.actor.name)) + '</span>'
        + '<div class="cmid"><div class="cn">' + esc(it.actor.name) + '</div><div class="ce">' + esc(it.actor.email) + '</div><div class="crole">' + esc(it.actor.role) + ' · ' + esc(it.company.name) + '</div></div>'
        + '<button class="cbtn" data-do="by-user" title="See all activity by this user">' + ico('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>', 15) + '</button>'
        + '</div></div>';

      function row(k, v, mono, span) { return '<div class="prop' + (span ? ' span2' : '') + '"><div class="k">' + k + '</div><div class="v' + (mono ? ' mono' : '') + '">' + v + '</div></div>'; }
      const entity = '<div class="sec"><div class="ol">Affected entity</div><div class="props">'
        + row('Type', esc(it.target.type))
        + row('Identifier', esc(it.target.id), true)
        + row('Entity', esc(it.target.label), false, true)
        + '</div></div>';

      const when = '<div class="sec"><div class="ol">When</div><div class="props">'
        + row('Date', V.fmtDate(it.ts))
        + row('Time (local)', V.fmtTime(it.ts), true)
        + row('Relative', V.relTime(it.ts))
        + row('Day', it.ts.slice(0, 10), true)
        + '</div></div>';

      const source = '<div class="sec"><div class="ol">Source &amp; context</div><div class="props">'
        + row('IP address', esc(it.ip), true)
        + row('Location', esc(it.location))
        + row('Device', esc(it.device), false, true)
        + row('Session', esc(it.session), true)
        + row('Request ID', esc(it.request), true)
        + '</div></div>';

      return banner + summary + actorCard + entity + when + source;
    }

    /* ---------------- CHANGES ---------------- */
    tab_changes(it) {
      if (!it.changes || !it.changes.length) {
        return '<div class="sec"><div class="note"><span class="ico">' + ico('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>', 16) + '</span>This event did not modify any stored values — it records an action (such as a sign-in, access attempt or export) rather than a state change.</div></div>';
      }
      const rows = it.changes.map(function (c) {
        return '<div class="drow"><div class="dfield">' + esc(c.field) + '</div><div class="dvals">'
          + '<div class="dval from"><span class="dvk">Previous</span>' + esc(c.from) + '</div>'
          + '<span class="darrow">' + ico(I_ARROW, 16, 2) + '</span>'
          + '<div class="dval to"><span class="dvk">New</span>' + esc(c.to) + '</div>'
          + '</div></div>';
      }).join('');
      return '<div class="sec"><div class="ol">Value changes<span class="olr">' + it.changes.length + ' field' + (it.changes.length === 1 ? '' : 's') + ' modified</span></div><div class="diff">' + rows + '</div></div>';
    }

    /* ---------------- COMPLIANCE ---------------- */
    tab_compliance(it) {
      const V = VA();
      const comp = V.COMPLIANCE[it.compliance];
      const flagged = it.compliance === 'flagged' || (V.LIVEFLAG && V.LIVEFLAG[it.id]);
      let banner;
      if (it.compliance === 'flagged' || flagged) banner = '<div class="note err"><span class="ico">' + ico(I_FLAG, 16) + '</span>This record is <b>flagged</b> and requires attention from the security or compliance team.</div>';
      else if (it.compliance === 'review') banner = '<div class="note warn"><span class="ico">' + ico('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>', 16) + '</span>Queued for <b>compliance review</b> under standard governance policy. No issue confirmed.</div>';
      else if (it.compliance === 'compliant') banner = '<div class="note ok"><span class="ico">' + ico('<path d="M20 6 9 17l-5-5"/>', 16, 2) + '</span>Recorded as <b>compliant</b> against the applicable control set.</div>';
      else banner = '<div class="note"><span class="ico">' + ico('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>', 16) + '</span>No compliance control applies to this event type.</div>';

      /* applicable controls by category */
      const CTRL = {
        auth:         [['Access control', 'Authentication events captured for every session', 'SOC 2 · CC6.1'], ['Audit logging', 'Immutable record retained per policy', 'ISO 27001 · A.12.4']],
        permission:   [['Least privilege', 'Privilege changes recorded and reviewable', 'SOC 2 · CC6.3'], ['Change management', 'Authorisation change captured with before/after', 'ISO 27001 · A.9.2']],
        subscription: [['Financial controls', 'Billing and licensing changes are auditable', 'SOC 2 · CC1.4']],
        export:       [['Data governance', 'Export of personal data is logged and reviewable', 'GDPR · Art. 30'], ['Data minimisation', 'Export scope and volume recorded', 'GDPR · Art. 5']],
        admin:        [['Change management', 'Administrative configuration changes are tracked', 'SOC 2 · CC8.1']],
        security:     [['Security monitoring', 'Security events captured for incident response', 'SOC 2 · CC7.2'], ['Threat detection', 'Anomalous access detected and logged', 'ISO 27001 · A.16.1']],
        system:       [['System operations', 'Automated jobs recorded for traceability', 'SOC 2 · CC7.1']],
        config:       [['Configuration control', 'Policy changes captured with attribution', 'SOC 2 · CC8.1']]
      };
      const controls = (CTRL[it.category] || []).map(function (c) {
        return '<div class="ctrl"><span class="cico">' + ico('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z"/><path d="m9 12 2 2 4-4"/>', 16) + '</span><div class="cmain"><div class="cttl">' + esc(c[0]) + '</div><div class="cdesc">' + esc(c[1]) + '</div></div><span class="ccode">' + esc(c[2]) + '</span></div>';
      }).join('');

      function row(k, v, mono, span) { return '<div class="prop' + (span ? ' span2' : '') + '"><div class="k">' + k + '</div><div class="v' + (mono ? ' mono' : '') + '">' + v + '</div></div>'; }
      const meta = '<div class="props">'
        + row('Compliance status', '<span class="comp-inline">' + comp.label + '</span>')
        + row('Record class', it.company.tid === 'INTERNAL' ? 'Platform-internal' : 'Tenant-scoped')
        + row('Retention', '730 days · immutable', true)
        + row('Visibility', 'Platform admin, compliance')
        + '</div>';

      return '<div class="sec">' + banner + '</div>'
        + '<div class="sec"><div class="ol">Governance record</div>' + meta + '</div>'
        + '<div class="sec"><div class="ol">Applicable controls<span class="olr">' + (CTRL[it.category] || []).length + ' mapped</span></div>' + (controls || '<div class="note">No specific controls mapped.</div>') + '</div>';
    }

    /* ---------------- RAW ---------------- */
    tab_raw(it) {
      const obj = {
        event_id: it.id,
        timestamp: it.ts,
        category: it.category,
        action: it.action,
        severity: it.severity,
        outcome: it.outcome,
        compliance: it.compliance,
        actor: { name: it.actor.name, email: it.actor.email, role: it.actor.role },
        company: { name: it.company.name, tenant_id: it.company.tid },
        target: { type: it.target.type, id: it.target.id, label: it.target.label },
        source: { ip: it.ip, device: it.device, location: it.location },
        session_id: it.session,
        request_id: it.request,
        changes: it.changes
      };
      const json = JSON.stringify(obj, null, 2);
      const html = json
        .replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; })
        .replace(/"([^"]+)":/g, '<span class="jk">"$1"</span>:')
        .replace(/: "([^"]*)"/g, ': <span class="js">"$1"</span>')
        .replace(/: (-?\d+\.?\d*)(,?)$/gm, ': <span class="jn">$1</span>$2')
        .replace(/: null/g, ': <span class="jnull">null</span>');
      return '<div class="sec"><div class="ol">Canonical record (JSON)<span class="olr">read-only</span></div><div class="raw"><pre>' + html + '</pre></div></div>';
    }

    /* ---------------- interactions ---------------- */
    onClick(e) {
      if (e.target === this.scrim) { this.close(); return; }
      if (e.target.closest('[data-x]')) { this.close(); return; }

      const tab = e.target.closest('.dtab');
      if (tab) { this.tab = tab.getAttribute('data-tab'); this.render(); return; }

      const copy = e.target.closest('[data-copy]');
      if (copy) {
        const v = copy.getAttribute('data-copy');
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).catch(function () {});
        const old = copy.innerHTML; copy.innerHTML = '<span class="ico">' + ico('<path d="M20 6 9 17l-5-5"/>', 15) + '</span>Copied';
        setTimeout(function () { copy.innerHTML = old; }, 1100);
        return;
      }

      const doBtn = e.target.closest('[data-do]');
      if (doBtn) {
        const act = doBtn.getAttribute('data-do');
        this.dispatchEvent(new CustomEvent('auditaction', { bubbles: true, detail: { act: act, id: this.it.id, fromDrawer: true } }));
        if (act === 'flag') { /* re-render to reflect flag state after controller updates LIVEFLAG */ const self = this; setTimeout(function () { self.render(); }, 0); }
        return;
      }
    }
  }

  if (!customElements.get('vbg-audit-drawer')) {
    customElements.define('vbg-audit-drawer', VbgAuditDrawer);
  }
})();
