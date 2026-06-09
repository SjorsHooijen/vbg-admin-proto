/* ============================================================
   VBG — Integrations overview page controller
   - Builds the filter sidebar from window.VBG_INTEGRATIONS facets
   - Computes the summary stat strip from live table data
   - Central handler for every integration action (sync, connect,
     disconnect, enable, disable, delete, configure → drawer)
   - Owns the "Add integration" catalog modal + delete confirm
   ============================================================ */
(function () {
  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ico(path, size, sw) { size = size || 16; sw = sw || 1.7; return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>'; }

  /* ---- catalog of connectable integrations (not yet added) ---- */
  const CATALOG = [
    { name: 'Box',                provider: 'Box',          type: 'storage',   auth: 'oauth',  desc: 'Enterprise content storage for drawing sets and exports.' },
    { name: 'Dropbox',            provider: 'Dropbox',      type: 'storage',   auth: 'oauth',  desc: 'Document export target for tenants on Dropbox Business.' },
    { name: 'Salesforce',         provider: 'Salesforce',   type: 'erp',       auth: 'oauth',  desc: 'Sync opportunities and accounts with project records.' },
    { name: 'ServiceNow',         provider: 'ServiceNow',   type: 'pm',        auth: 'oauth',  desc: 'Raise change and incident tickets from platform events.' },
    { name: 'GitHub',             provider: 'GitHub',       type: 'api',       auth: 'oauth',  desc: 'Mirror rule definitions and recipe configs to repositories.' },
    { name: 'Speckle',            provider: 'Speckle',      type: 'bim',       auth: 'pat',    desc: 'Open-source data exchange for geometry and BIM streams.' },
    { name: 'Nemetschek Allplan', provider: 'Nemetschek',   type: 'bim',       auth: 'apikey', desc: 'Detailing exchange with Allplan precast workflows.' },
    { name: 'Datadog',            provider: 'Datadog',      type: 'analytics', auth: 'apikey', desc: 'Stream platform metrics and traces to Datadog.' },
    { name: 'PagerDuty',          provider: 'PagerDuty',    type: 'comms',     auth: 'apikey', desc: 'Page on-call engineers when critical syncs fail.' },
    { name: 'Notion',             provider: 'Notion',       type: 'pm',        auth: 'oauth',  desc: 'Publish engineering notes and trace logs to Notion.' },
    { name: 'HubSpot',            provider: 'HubSpot',      type: 'erp',       auth: 'oauth',  desc: 'Connect commercial pipeline to tenant provisioning.' },
    { name: 'Mailgun',            provider: 'Mailgun',      type: 'comms',     auth: 'apikey', desc: 'Transactional email delivery for report distribution.' }
  ];

  const MODAL_STYLE = `
    .vbg-overlay { position: absolute; inset: 0; z-index: 90; display: none; align-items: center; justify-content: center; }
    .vbg-overlay[data-open] { display: flex; }
    .vbg-overlay .scrim { position: absolute; inset: 0; background: rgba(14,17,22,.42); opacity: 0; transition: opacity var(--dur-base) var(--ease-out); }
    .vbg-overlay[data-open] .scrim { opacity: 1; }
    .vbg-overlay .dialog { position: relative; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--r-lg); box-shadow: var(--shadow-lg); transform: translateY(8px) scale(.985); opacity: 0; transition: transform var(--dur-base) var(--ease-out), opacity var(--dur-base) var(--ease-out); }
    .vbg-overlay[data-open] .dialog { transform: none; opacity: 1; }

    /* add-integration catalog */
    #add-modal .dialog { width: 760px; max-width: 92%; max-height: 80%; display: flex; flex-direction: column; }
    #add-modal .mh { padding: 22px 26px 18px; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: flex-start; gap: 16px; }
    #add-modal .mh .mt { flex: 1 1 auto; }
    #add-modal .mh h2 { font: var(--text-h2); color: var(--fg1); letter-spacing: -0.01em; }
    #add-modal .mh p { margin: 5px 0 0; font: var(--text-sm); color: var(--fg3); }
    #add-modal .mclose { width: 34px; height: 34px; border-radius: var(--r-sm); border: 1px solid transparent; background: transparent; color: var(--fg3); cursor: pointer; display: grid; place-items: center; transition: background var(--dur-fast), color var(--dur-fast), border-color var(--dur-fast); }
    #add-modal .mclose:hover { background: var(--bg-hover); color: var(--fg1); border-color: var(--border); }
    #add-modal .msearch { display: flex; align-items: center; gap: 9px; height: 40px; padding: 0 13px; background: var(--bg-sunken); border: 1px solid var(--border); border-radius: var(--r-sm); margin: 18px 26px 4px; }
    #add-modal .msearch:focus-within { border-color: var(--border-focus); box-shadow: var(--ring-focus); }
    #add-modal .msearch input { flex: 1 1 auto; border: 0; background: transparent; outline: none; font: var(--text-body); color: var(--fg1); }
    #add-modal .msearch .ico { color: var(--fg4); }
    #add-modal .grid { padding: 16px 26px 24px; overflow-y: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    #add-modal .cat {
      display: flex; align-items: flex-start; gap: 12px; padding: 14px;
      border: 1px solid var(--border-subtle); border-radius: var(--r-md); background: var(--bg-surface);
      transition: border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
    }
    #add-modal .cat:hover { border-color: var(--border-strong); box-shadow: var(--shadow-sm); }
    #add-modal .cat .ctile { width: 40px; height: 40px; flex: 0 0 40px; border-radius: var(--r-sm); background: var(--bg-sunken); border: 1px solid var(--border-subtle); display: grid; place-items: center; color: var(--fg2); }
    #add-modal .cat .cmid { flex: 1 1 auto; min-width: 0; }
    #add-modal .cat .cn { font: var(--text-body-strong); color: var(--fg1); }
    #add-modal .cat .cp { font: var(--text-caption); color: var(--fg3); margin-top: 1px; }
    #add-modal .cat .cd { font: var(--text-caption); color: var(--fg3); margin-top: 7px; line-height: 1.45; }
    #add-modal .cat .cbtn { flex: 0 0 auto; align-self: center; display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border-radius: var(--r-sm); border: 1px solid var(--border); background: var(--bg-surface); font: var(--text-label); color: var(--fg1); cursor: pointer; transition: background var(--dur-fast) var(--ease-out); }
    #add-modal .cat .cbtn:hover { background: var(--vbg-amber); border-color: transparent; color: var(--fg-inverse); }
    #add-modal .grid .none { grid-column: 1 / -1; text-align: center; color: var(--fg3); padding: 40px 0; font: var(--text-sm); }

    /* confirm delete */
    #confirm-modal .dialog { width: 440px; max-width: 92%; padding: 24px; }
    #confirm-modal .cseal { width: 46px; height: 46px; border-radius: var(--r-md); background: var(--status-error-bg); color: var(--status-error); display: grid; place-items: center; margin-bottom: 16px; }
    #confirm-modal h2 { font: var(--text-h2); color: var(--fg1); }
    #confirm-modal p { margin: 10px 0 0; font: var(--text-body); color: var(--fg2); line-height: 1.55; }
    #confirm-modal p b { color: var(--fg1); font-weight: 600; }
    #confirm-modal .cactions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }
    #confirm-modal .cbtn { height: 40px; padding: 0 16px; border-radius: var(--r-sm); font: var(--text-body-strong); cursor: pointer; border: 1px solid var(--border); background: var(--bg-surface); color: var(--fg1); transition: background var(--dur-fast) var(--ease-out); }
    #confirm-modal .cbtn:hover { background: var(--bg-hover); }
    #confirm-modal .cbtn.danger { background: var(--status-error); border-color: transparent; color: #fff; }
    #confirm-modal .cbtn.danger:hover { background: #C13A3A; }

    /* toast */
    #vbg-toast { position: absolute; left: 50%; bottom: 28px; transform: translateX(-50%) translateY(20px); z-index: 95; opacity: 0; pointer-events: none; transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out); }
    #vbg-toast[data-show] { opacity: 1; transform: translateX(-50%); }
    #vbg-toast .t { display: flex; align-items: center; gap: 10px; background: var(--slate-900); color: #fff; border-radius: var(--r-sm); padding: 11px 16px; font: var(--text-body-strong); font-size: 13px; box-shadow: var(--shadow-lg); }
    #vbg-toast .t .ico { display: inline-flex; }
    #vbg-toast .t .ico.ok { color: #6FE0A0; }
    #vbg-toast .t .ico.warn { color: var(--vbg-amber-300); }
  `;

  ready(function () {
    var V = window.VBG_INTEGRATIONS;
    var table = document.getElementById('itable');
    var drawer = document.querySelector('vbg-integration-drawer');
    var stage = document.getElementById('stage');
    if (!V || !table) return;

    var TYPES = V.TYPES, AUTH = V.AUTH, DATA = V.DATA;

    /* inject modal styles + scaffold */
    var st = document.createElement('style'); st.textContent = MODAL_STYLE; document.head.appendChild(st);

    /* ---------------- filter state ---------------- */
    var state = { type: new Set(), status: new Set(), auth: new Set(), sync: new Set(), added: 'any', search: '' };
    function count(pred) { return table.data.filter(pred).length; }

    /* ---------------- filter sidebar config ---------------- */
    function buildSections() {
      return [
        { id: 'type', title: 'Type', type: 'check', key: 'type', scroll: true,
          opts: Object.keys(TYPES).map(function (k) { return { val: k, label: TYPES[k].label, n: count(function (it) { return it.type === k; }) }; }).filter(function (o) { return o.n > 0; }) },
        { id: 'status', title: 'Status', type: 'check', key: 'status',
          opts: [
            { val: 'connected',    label: 'Connected',    n: count(function (it) { return it.status === 'connected'; }) },
            { val: 'disconnected', label: 'Disconnected', n: count(function (it) { return it.status === 'disconnected'; }) },
            { val: 'error',        label: 'Error',        n: count(function (it) { return it.status === 'error'; }) },
            { val: 'disabled',     label: 'Disabled',     n: count(function (it) { return it.status === 'disabled'; }) }
          ] },
        { id: 'auth', title: 'Auth method', type: 'check', key: 'auth', scroll: true,
          opts: Object.keys(AUTH).map(function (k) { return { val: k, label: AUTH[k], n: count(function (it) { return it.auth === k; }) }; }).filter(function (o) { return o.n > 0; }) },
        { id: 'sync', title: 'Sync status', type: 'check', key: 'sync',
          opts: [
            { val: 'synced', label: 'Synced', n: count(function (it) { return it.syncStatus === 'synced'; }) },
            { val: 'failed', label: 'Failed', n: count(function (it) { return it.syncStatus === 'failed'; }) },
            { val: 'idle',   label: 'Idle / never', n: count(function (it) { return it.syncStatus === 'idle' || it.syncStatus === 'never'; }) }
          ] },
        { id: 'added', title: 'Added', type: 'radio', key: 'added',
          opts: [
            { val: 'any', label: 'Any time' }, { val: '30', label: 'Last 30 days' },
            { val: '90', label: 'Last 90 days' }, { val: '365', label: 'Last year' }
          ] }
      ];
    }

    var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
    var CHEV = '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
    var fbody = document.getElementById('fbody');

    function buildSidebar() {
      var SECTIONS = buildSections();
      fbody.innerHTML = SECTIONS.map(function (s) {
        var body = '<div class="fsec-body' + (s.scroll ? ' scroll' : '') + '">' + s.opts.map(function (o) {
          var control = s.type === 'radio' ? '<span class="radio"></span>' : '<span class="box">' + CHECK + '</span>';
          var num = (o.n != null) ? '<span class="fn">' + o.n + '</span>' : '';
          var on = s.type === 'check' ? (state[s.key].has(o.val) ? ' on' : '') : (state[s.key] === o.val ? ' on' : '');
          return '<div class="fopt' + on + '" data-type="' + s.type + '" data-key="' + s.key + '" data-val="' + o.val + '">' + control + '<span class="flabel">' + o.label + '</span>' + num + '</div>';
        }).join('') + '</div>';
        return '<div class="fsection" data-sec="' + s.id + '"><div class="fsec-head"><span class="lbl">' + s.title + '</span>' + CHEV + '</div>' + body + '</div>';
      }).join('');
    }
    buildSidebar();

    fbody.addEventListener('click', function (e) {
      var head = e.target.closest('.fsec-head');
      if (head) { head.parentElement.classList.toggle('collapsed'); return; }
      var opt = e.target.closest('.fopt');
      if (!opt) return;
      var type = opt.getAttribute('data-type'), key = opt.getAttribute('data-key'), val = opt.getAttribute('data-val');
      if (type === 'radio') {
        state[key] = val;
        opt.parentElement.querySelectorAll('.fopt').forEach(function (o) { o.classList.remove('on'); });
        opt.classList.add('on');
      } else {
        if (state[key].has(val)) state[key].delete(val); else state[key].add(val);
        opt.classList.toggle('on');
      }
      apply();
    });

    var search = document.getElementById('search');
    search.addEventListener('input', function () { state.search = search.value.trim(); apply(); });

    var resetBtn = document.getElementById('reset-filters');
    resetBtn.addEventListener('click', function () { resetAll(); });
    function resetAll() {
      state.type.clear(); state.status.clear(); state.auth.clear(); state.sync.clear();
      state.added = 'any'; state.search = ''; search.value = '';
      buildSidebar(); apply();
    }

    function apply() { table.setFilters(state); syncActiveChips(); }

    var LABELS = {
      status: { connected: 'Connected', disconnected: 'Disconnected', error: 'Error', disabled: 'Disabled' },
      sync: { synced: 'Synced', failed: 'Failed', idle: 'Idle / never' },
      added: { '30': 'Last 30 days', '90': 'Last 90 days', '365': 'Last year' }
    };
    var chipsWrap = document.getElementById('activechips');
    function syncActiveChips() {
      var chips = [];
      state.type.forEach(function (v) { chips.push({ k: 'type', v: v, t: (TYPES[v] || {}).label || v }); });
      state.status.forEach(function (v) { chips.push({ k: 'status', v: v, t: LABELS.status[v] }); });
      state.auth.forEach(function (v) { chips.push({ k: 'auth', v: v, t: AUTH[v] || v }); });
      state.sync.forEach(function (v) { chips.push({ k: 'sync', v: v, t: LABELS.sync[v] }); });
      if (state.added !== 'any') chips.push({ k: 'added', v: state.added, t: LABELS.added[state.added], single: true });
      chipsWrap.innerHTML = chips.map(function (c) {
        return '<span class="achip" data-k="' + c.k + '" data-v="' + c.v + '"' + (c.single ? ' data-single="1"' : '') + '>' + c.t
          + '<button aria-label="Remove filter"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></span>';
      }).join('');
      resetBtn.classList.toggle('show', chips.length > 0 || state.search !== '');
    }
    chipsWrap.addEventListener('click', function (e) {
      var btn = e.target.closest('.achip button'); if (!btn) return;
      var chip = btn.closest('.achip'), k = chip.getAttribute('data-k'), v = chip.getAttribute('data-v');
      if (chip.getAttribute('data-single')) state[k] = 'any'; else state[k].delete(v);
      buildSidebar(); apply();
    });

    /* ---------------- stats strip ---------------- */
    var statsEl = document.getElementById('stats');
    function renderStats() {
      var d = table.data;
      var total = d.length;
      var connected = d.filter(function (x) { return x.status === 'connected'; }).length;
      var disconnected = d.filter(function (x) { return x.status === 'disconnected'; }).length;
      var disabled = d.filter(function (x) { return x.status === 'disabled'; }).length;
      var errored = d.filter(function (x) { return x.status === 'error'; }).length;
      var tenantLinks = d.filter(function (x) { return x.status === 'connected' || x.status === 'error'; }).reduce(function (a, x) { return a + x.tenants; }, 0);
      var synced = d.filter(function (x) { return x.syncStatus === 'synced'; }).length;
      var failed = d.filter(function (x) { return x.syncStatus === 'failed'; }).length;
      var idle = d.filter(function (x) { return x.syncStatus === 'idle' || x.syncStatus === 'never'; }).length;
      var attention = d.filter(function (x) { return x.status === 'error' || x.syncStatus === 'failed'; }).length;

      var cards = [
        { ico: '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
          label: 'Total integrations', num: total, delta: '', deltaFlat: true,
          sub: '<b>' + connected + '</b> connected · <b>' + disconnected + '</b> disconnected · <b>' + disabled + '</b> disabled' },
        { ico: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
          label: 'Connected', num: connected, delta: Math.round(connected / total * 100) + '% of total',
          sub: 'Across <b>' + tenantLinks + '</b> tenant connections' },
        { ico: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/>',
          label: 'Synced', num: synced, delta: 'last 24 h',
          sub: '<b>' + idle + '</b> idle · <b>' + failed + '</b> failed' },
        { ico: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.42 0z"/>',
          label: 'Needs attention', num: attention, delta: attention ? 'review queue' : 'all clear', deltaFlat: true,
          sub: '<b>' + errored + '</b> errors · <b>' + failed + '</b> failed syncs', attn: attention > 0 }
      ];
      statsEl.innerHTML = cards.map(function (c) {
        var delta = c.delta ? '<span class="delta' + (c.deltaFlat ? ' flat' : '') + '">' + c.delta + '</span>' : '';
        return '<div class="stat' + (c.attn ? ' attn' : '') + '">'
          + '<div class="slabel"><span class="ico">' + ico(c.ico, 14, 1.8) + '</span>' + c.label + '</div>'
          + '<div class="svalue"><span class="num mono">' + c.num + '</span>' + delta + '</div>'
          + '<div class="ssub">' + c.sub + '</div></div>';
      }).join('');
    }

    /* ---------------- footer / count ---------------- */
    var rcount = document.getElementById('rcount');
    var footnote = document.getElementById('footnote');
    table.addEventListener('integrationsrender', function (e) {
      var d = e.detail;
      if (rcount) rcount.innerHTML = '<b>' + d.visible + '</b> integration' + (d.visible === 1 ? '' : 's') + (d.visible !== d.total ? ' <span style="color:var(--fg4)">of ' + d.total + '</span>' : '');
      if (footnote) footnote.textContent = 'Showing ' + d.visible + ' of ' + d.total + ' integrations';
      renderStats();
    });

    /* ---------------- toast ---------------- */
    var toast = document.createElement('div'); toast.id = 'vbg-toast'; stage.appendChild(toast);
    var toastTimer = null;
    function showToast(msg, kind) {
      var i = kind === 'ok' ? '<span class="ico ok">' + ico('<path d="M20 6 9 17l-5-5"/>', 16, 2.2) + '</span>'
        : (kind === 'warn' ? '<span class="ico warn">' + ico('<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>', 16) + '</span>' : '');
      toast.innerHTML = '<div class="t">' + i + '<span>' + esc(msg) + '</span></div>';
      toast.setAttribute('data-show', '');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toast.removeAttribute('data-show'); }, 2600);
    }

    /* ---------------- central action handler ---------------- */
    function openDrawer(id, tab) {
      var it = table.getById(id); if (!it) return;
      drawer.open(it, tab);
    }
    function handleAction(act, id) {
      var it = table.getById(id);
      if (act === 'configure')      return openDrawer(id, 'overview');
      if (act === 'credentials')    return openDrawer(id, 'credentials');
      if (act === 'history')        return openDrawer(id, 'history');
      if (act === 'logs')           return openDrawer(id, 'logs');
      if (act === 'tenants')        return openDrawer(id, 'tenants');
      if (act === 'sync') {
        table.startSync(id);
        if (drawer.hasAttribute('open')) drawer.refresh();
        showToast('Syncing ' + (it ? it.name : 'integration') + '…');
        return;
      }
      if (act === 'connect')    { table.setStatus(id, 'connected');    drawer.refresh(); showToast((it ? it.name : 'Integration') + ' connected', 'ok'); return; }
      if (act === 'disconnect') { table.setStatus(id, 'disconnected'); drawer.refresh(); showToast((it ? it.name : 'Integration') + ' disconnected', 'warn'); return; }
      if (act === 'enable')     { table.setStatus(id, 'connected');    drawer.refresh(); showToast((it ? it.name : 'Integration') + ' enabled', 'ok'); return; }
      if (act === 'disable')    { table.setStatus(id, 'disabled');     drawer.refresh(); showToast((it ? it.name : 'Integration') + ' disabled', 'warn'); return; }
      if (act === 'delete')     { openConfirm(id); return; }
    }
    document.addEventListener('integrationaction', function (e) { handleAction(e.detail.act, e.detail.id); });
    table.addEventListener('integrationopen', function (e) { openDrawer(e.detail.id, e.detail.tab); });
    table.addEventListener('integrationsynced', function (e) {
      if (drawer.hasAttribute('open')) drawer.refresh();
      var it = table.getById(e.detail.id);
      if (e.detail.result === 'failed') showToast('Sync failed for ' + (it ? it.name : 'integration'), 'warn');
      else showToast('Synced ' + (it ? it.name : 'integration'), 'ok');
    });

    /* ---------------- add-integration modal ---------------- */
    var addModal = document.createElement('div'); addModal.id = 'add-modal'; addModal.className = 'vbg-overlay';
    addModal.innerHTML = '<div class="scrim" data-close></div><div class="dialog">'
      + '<div class="mh"><div class="mt"><h2>Add integration</h2><p>Connect an external system or service to the VBG platform.</p></div>'
      + '<button class="mclose" data-close aria-label="Close">' + ico('<path d="M18 6 6 18"/><path d="M6 6l12 12"/>', 18, 2) + '</button></div>'
      + '<div class="msearch"><span class="ico">' + ico('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>', 16) + '</span><input type="text" placeholder="Search the integration catalog…" id="cat-search"></div>'
      + '<div class="grid" id="cat-grid"></div></div>';
    stage.appendChild(addModal);

    var catGrid = addModal.querySelector('#cat-grid');
    var catSearch = addModal.querySelector('#cat-search');
    var catQuery = '';
    function renderCatalog() {
      var existing = {}; table.data.forEach(function (x) { existing[x.name.toLowerCase()] = true; });
      var q = catQuery.toLowerCase();
      var items = CATALOG.filter(function (c) {
        if (existing[c.name.toLowerCase()]) return false;
        if (q && (c.name + ' ' + c.provider + ' ' + (TYPES[c.type] || {}).label).toLowerCase().indexOf(q) === -1) return false;
        return true;
      });
      if (!items.length) { catGrid.innerHTML = '<div class="none">No catalog matches — every available integration is already connected.</div>'; return; }
      catGrid.innerHTML = items.map(function (c) {
        var ty = TYPES[c.type] || { label: c.type, glyph: '' };
        return '<div class="cat" data-add="' + esc(c.name) + '">'
          + '<span class="ctile">' + ico(ty.glyph, 20, 1.7) + '</span>'
          + '<div class="cmid"><div class="cn">' + esc(c.name) + '</div><div class="cp">' + esc(ty.label) + ' · ' + esc(AUTH[c.auth]) + '</div><div class="cd">' + esc(c.desc) + '</div></div>'
          + '<button class="cbtn">' + ico('<path d="M12 5v14"/><path d="M5 12h14"/>', 14, 2) + 'Add</button></div>';
      }).join('');
    }
    catSearch.addEventListener('input', function () { catQuery = catSearch.value.trim(); renderCatalog(); });

    var seq = 9000;
    catGrid.addEventListener('click', function (e) {
      var card = e.target.closest('[data-add]'); if (!card) return;
      var name = card.getAttribute('data-add');
      var c = CATALOG.filter(function (x) { return x.name === name; })[0]; if (!c) return;
      seq += 7;
      var nowDay = V.nowISO().slice(0, 10);
      var it = { id: 'INT-' + seq, name: c.name, provider: c.provider, type: c.type, auth: c.auth, status: 'connected',
        tenants: 1, scope: 'tenant', desc: c.desc, lastSync: null, syncStatus: 'idle', created: nowDay, modified: nowDay };
      table.add(it);
      table.startSync(it.id);
      closeOverlay(addModal);
      showToast(c.name + ' added — running first sync…');
    });

    document.getElementById('create-btn').addEventListener('click', function () { catQuery = ''; catSearch.value = ''; renderCatalog(); openOverlay(addModal); setTimeout(function () { catSearch.focus(); }, 80); });

    /* ---------------- delete confirm ---------------- */
    var confirmModal = document.createElement('div'); confirmModal.id = 'confirm-modal'; confirmModal.className = 'vbg-overlay';
    stage.appendChild(confirmModal);
    var pendingDelete = null;
    function openConfirm(id) {
      var it = table.getById(id); if (!it) return;
      pendingDelete = id;
      confirmModal.innerHTML = '<div class="scrim" data-close></div><div class="dialog">'
        + '<div class="cseal">' + ico('<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>', 22, 1.8) + '</div>'
        + '<h2>Delete integration?</h2>'
        + '<p><b>' + esc(it.name) + '</b> (' + esc(it.id) + ') will be removed. This revokes its credentials'
        + (it.tenants ? ' and disconnects <b>' + it.tenants + '</b> tenant connection' + (it.tenants === 1 ? '' : 's') : '') + '. This cannot be undone.</p>'
        + '<div class="cactions"><button class="cbtn" data-close>Cancel</button><button class="cbtn danger" data-confirm>Delete integration</button></div></div>';
      openOverlay(confirmModal);
    }
    confirmModal.addEventListener('click', function (e) {
      if (e.target.closest('[data-confirm]')) {
        var it = table.getById(pendingDelete);
        table.remove(pendingDelete);
        if (drawer.hasAttribute('open')) drawer.close();
        closeOverlay(confirmModal);
        showToast((it ? it.name : 'Integration') + ' deleted', 'warn');
        pendingDelete = null;
      }
    });

    /* ---------------- overlay helpers ---------------- */
    function openOverlay(el) { el.setAttribute('data-open', ''); }
    function closeOverlay(el) { el.removeAttribute('data-open'); }
    document.addEventListener('click', function (e) {
      var c = e.target.closest('.vbg-overlay [data-close]');
      if (c) { closeOverlay(c.closest('.vbg-overlay')); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeOverlay(addModal); closeOverlay(confirmModal); }
    });

    /* initial paint — re-run through the table so rcount/footnote/stats populate */
    apply();
  });
})();
