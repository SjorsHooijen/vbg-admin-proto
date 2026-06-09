/* ============================================================
   VBG — Audit & Compliance page controller
   - Builds the filter sidebar from window.VBG_AUDIT facets
   - Computes the summary stat strip (volume, failures, security,
     compliance attention)
   - Central handler for every audit action (view, cross-filter,
     flag, export)
   - Owns the export-logs, generate-report and retention-policy
     modals and the toast
   ============================================================ */
(function () {
  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ico(path, size, sw) { size = size || 16; sw = sw || 1.7; return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>'; }

  const MODAL_STYLE = `
    .vbg-overlay { position: absolute; inset: 0; z-index: 90; display: none; align-items: center; justify-content: center; }
    .vbg-overlay[data-open] { display: flex; }
    .vbg-overlay .scrim { position: absolute; inset: 0; background: rgba(14,17,22,.42); opacity: 0; transition: opacity var(--dur-base) var(--ease-out); }
    .vbg-overlay[data-open] .scrim { opacity: 1; }
    .vbg-overlay .dialog { position: relative; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--r-lg); box-shadow: var(--shadow-lg); transform: translateY(8px) scale(.985); opacity: 0; transition: transform var(--dur-base) var(--ease-out), opacity var(--dur-base) var(--ease-out); }
    .vbg-overlay[data-open] .dialog { transform: none; opacity: 1; }

    .vbg-mh { padding: 22px 26px 18px; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: flex-start; gap: 16px; }
    .vbg-mh .mt { flex: 1 1 auto; }
    .vbg-mh h2 { font: var(--text-h2); color: var(--fg1); letter-spacing: -0.01em; }
    .vbg-mh p { margin: 5px 0 0; font: var(--text-sm); color: var(--fg3); }
    .vbg-mclose { width: 34px; height: 34px; border-radius: var(--r-sm); border: 1px solid transparent; background: transparent; color: var(--fg3); cursor: pointer; display: grid; place-items: center; transition: background var(--dur-fast), color var(--dur-fast), border-color var(--dur-fast); }
    .vbg-mclose:hover { background: var(--bg-hover); color: var(--fg1); border-color: var(--border); }
    .vbg-mfoot { display: flex; justify-content: flex-end; gap: 10px; padding: 18px 26px 22px; border-top: 1px solid var(--border-subtle); align-items: center; }
    .vbg-mfoot .fnote { margin-right: auto; font: var(--text-caption); color: var(--fg4); }
    .vbg-mbtn { height: 40px; padding: 0 16px; border-radius: var(--r-sm); font: var(--text-body-strong); cursor: pointer; border: 1px solid var(--border); background: var(--bg-surface); color: var(--fg1); transition: background var(--dur-fast) var(--ease-out); display: inline-flex; align-items: center; gap: 8px; }
    .vbg-mbtn:hover { background: var(--bg-hover); }
    .vbg-mbtn.primary { background: var(--vbg-amber); border-color: transparent; color: var(--fg-inverse); box-shadow: 0 1px 2px rgba(184,111,0,.35); }
    .vbg-mbtn.primary:hover { background: var(--vbg-amber-600); }
    .vbg-mbtn .ico { display: inline-flex; }

    .vbg-form { padding: 20px 26px; display: flex; flex-direction: column; gap: 18px; }
    #export-modal .dialog, #report-modal .dialog { width: 560px; max-width: 92%; }
    #retention-modal .dialog { width: 540px; max-width: 92%; }
    .vbg-field .fl { font: var(--text-label); color: var(--fg2); margin-bottom: 8px; display: block; }
    .vbg-field .fd { font: var(--text-caption); color: var(--fg4); margin-top: 7px; }
    .vbg-seg { display: flex; border: 1px solid var(--border); border-radius: var(--r-sm); overflow: hidden; }
    .vbg-seg button { flex: 1 1 0; border: 0; background: var(--bg-surface); cursor: pointer; font: var(--text-label); color: var(--fg2); padding: 10px 12px; border-right: 1px solid var(--border); transition: background var(--dur-fast); }
    .vbg-seg button:last-child { border-right: 0; }
    .vbg-seg button:hover { background: var(--bg-hover); }
    .vbg-seg button.on { background: var(--bg-selected); color: var(--fg-accent); }

    .vbg-srow { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 13px 14px; border: 1px solid var(--border-subtle); border-radius: var(--r-md); background: var(--bg-surface); }
    .vbg-srow .lab .t { font: var(--text-body-strong); color: var(--fg1); }
    .vbg-srow .lab .d { font: var(--text-caption); color: var(--fg3); margin-top: 2px; }
    .vbg-sw { width: 38px; height: 22px; border-radius: 999px; background: var(--slate-300); position: relative; cursor: pointer; flex: 0 0 auto; transition: background var(--dur-fast) var(--ease-out); border: 0; padding: 0; }
    .vbg-sw::after { content: ''; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 999px; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.2); transition: transform var(--dur-fast) var(--ease-out); }
    .vbg-sw.on { background: var(--vbg-amber); }
    .vbg-sw.on::after { transform: translateX(16px); }

    .vbg-scope { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: var(--r-sm); background: var(--bg-sunken); border: 1px solid var(--border-subtle); font: var(--text-sm); color: var(--fg2); }
    .vbg-scope .ico { color: var(--fg3); display: inline-flex; }
    .vbg-scope b { color: var(--fg1); font-weight: 600; }

    #vbg-toast { position: absolute; left: 50%; bottom: 28px; transform: translateX(-50%) translateY(20px); z-index: 95; opacity: 0; pointer-events: none; transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out); }
    #vbg-toast[data-show] { opacity: 1; transform: translateX(-50%); }
    #vbg-toast .t { display: flex; align-items: center; gap: 10px; background: var(--slate-900); color: #fff; border-radius: var(--r-sm); padding: 11px 16px; font: var(--text-body-strong); font-size: 13px; box-shadow: var(--shadow-lg); }
    #vbg-toast .t .ico.ok { color: #6FE0A0; }
    #vbg-toast .t .ico.warn { color: var(--vbg-amber-300); }
  `;

  ready(function () {
    var V = window.VBG_AUDIT;
    var table = document.getElementById('atable');
    var drawer = document.querySelector('vbg-audit-drawer');
    var stage = document.getElementById('stage');
    if (!V || !table) return;
    V.LIVEFLAG = {};

    var st = document.createElement('style'); st.textContent = MODAL_STYLE; document.head.appendChild(st);

    /* ---------------- filter state ---------------- */
    var state = { category: new Set(), outcome: new Set(), compliance: new Set(), severity: new Set(), company: new Set(), range: 'any', search: '' };
    function count(pred) { return table.data.filter(pred).length; }

    /* company facet: tenants present in the log */
    function companyFacet() {
      var seen = {}, list = [];
      table.data.forEach(function (e) { if (!seen[e.company.tid]) { seen[e.company.tid] = true; list.push({ tid: e.company.tid, name: e.company.name }); } });
      list.sort(function (a, b) { if (a.tid === 'INTERNAL') return -1; if (b.tid === 'INTERNAL') return 1; return a.name.localeCompare(b.name); });
      return list;
    }

    function buildSections() {
      var cats = Object.keys(V.CAT);
      var sev = ['critical', 'high', 'medium', 'low'];
      return [
        { id: 'category', title: 'Event type', type: 'check', key: 'category',
          opts: cats.map(function (k) { return { val: k, label: V.CAT[k].label, n: count(function (e) { return e.category === k; }) }; }).filter(function (o) { return o.n > 0; }) },
        { id: 'outcome', title: 'Outcome', type: 'check', key: 'outcome',
          opts: ['success', 'failure', 'blocked', 'warning'].map(function (k) { return { val: k, label: V.OUTCOME[k].label, n: count(function (e) { return e.outcome === k; }) }; }).filter(function (o) { return o.n > 0; }) },
        { id: 'compliance', title: 'Compliance', type: 'check', key: 'compliance',
          opts: ['compliant', 'review', 'flagged', 'na'].map(function (k) { return { val: k, label: V.COMPLIANCE[k].label, n: count(function (e) { return e.compliance === k; }) }; }).filter(function (o) { return o.n > 0; }) },
        { id: 'severity', title: 'Severity', type: 'check', key: 'severity',
          opts: sev.map(function (k) { return { val: k, label: V.SEV[k].label, n: count(function (e) { return e.severity === k; }) }; }).filter(function (o) { return o.n > 0; }) },
        { id: 'company', title: 'Company', type: 'check', key: 'company', scroll: true,
          opts: companyFacet().map(function (c) { return { val: c.tid, label: c.name, n: count(function (e) { return e.company.tid === c.tid; }) }; }) },
        { id: 'range', title: 'Time range', type: 'radio', key: 'range',
          opts: [{ val: 'any', label: 'All time' }, { val: '1', label: 'Last 24 hours' }, { val: '7', label: 'Last 7 days' }, { val: '30', label: 'Last 30 days' }, { val: '90', label: 'Last 90 days' }] }
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
          return '<div class="fopt' + on + '" data-type="' + s.type + '" data-key="' + s.key + '" data-val="' + o.val + '">' + control + '<span class="flabel">' + esc(o.label) + '</span>' + num + '</div>';
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
      state.category.clear(); state.outcome.clear(); state.compliance.clear(); state.severity.clear(); state.company.clear();
      state.range = 'any'; state.search = ''; search.value = '';
      buildSidebar(); apply();
    }

    function apply() { table.setFilters(state); syncActiveChips(); }

    var companyName = {};
    companyFacet().forEach(function (c) { companyName[c.tid] = c.name; });
    var LABELS = {
      range: { '1': 'Last 24 hours', '7': 'Last 7 days', '30': 'Last 30 days', '90': 'Last 90 days' }
    };
    var chipsWrap = document.getElementById('activechips');
    function syncActiveChips() {
      var chips = [];
      state.category.forEach(function (v) { chips.push({ k: 'category', v: v, t: V.CAT[v].label }); });
      state.outcome.forEach(function (v) { chips.push({ k: 'outcome', v: v, t: V.OUTCOME[v].label }); });
      state.compliance.forEach(function (v) { chips.push({ k: 'compliance', v: v, t: V.COMPLIANCE[v].label }); });
      state.severity.forEach(function (v) { chips.push({ k: 'severity', v: v, t: V.SEV[v].label }); });
      state.company.forEach(function (v) { chips.push({ k: 'company', v: v, t: companyName[v] || v }); });
      if (state.range !== 'any') chips.push({ k: 'range', v: state.range, t: LABELS.range[state.range], single: true });
      chipsWrap.innerHTML = chips.map(function (c) {
        return '<span class="achip" data-k="' + c.k + '" data-v="' + c.v + '"' + (c.single ? ' data-single="1"' : '') + '>' + esc(c.t)
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
      var last24 = d.filter(function (e) { return V.daysAgo(e.ts) < 1; }).length;
      var last7 = d.filter(function (e) { return V.daysAgo(e.ts) < 7; }).length;
      var failed = d.filter(function (e) { return e.outcome === 'failure' || e.outcome === 'blocked'; }).length;
      var blocked = d.filter(function (e) { return e.outcome === 'blocked'; }).length;
      var security = d.filter(function (e) { return e.category === 'security'; }).length;
      var critical = d.filter(function (e) { return e.severity === 'critical'; }).length;
      var flagged = d.filter(function (e) { return e.compliance === 'flagged' || V.LIVEFLAG[e.id]; }).length;
      var review = d.filter(function (e) { return e.compliance === 'review' && !V.LIVEFLAG[e.id]; }).length;
      var attention = flagged;

      var cards = [
        { ico: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5Z"/><path d="M14 2v6h6"/><path d="M9 13h6"/><path d="M9 17h3"/>',
          label: 'Audit records', num: total.toLocaleString('en-US').replace(/,/g, ' '), delta: last24 + ' in last 24 h', deltaFlat: true,
          sub: '<b>' + last7 + '</b> in last 7 days · across <b>' + companyFacet().length + '</b> tenants' },
        { ico: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
          label: 'Failed & blocked', num: failed, delta: blocked ? blocked + ' blocked' : '', deltaFlat: true,
          sub: '<b>' + blocked + '</b> blocked · authentication & access denials' },
        { ico: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z"/>',
          label: 'Security events', num: security, delta: critical ? critical + ' critical' : 'none critical', deltaFlat: true,
          sub: 'Threat detection, MFA & session activity' },
        { ico: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
          label: 'Needs attention', num: attention, delta: review ? review + ' under review' : 'no open reviews', deltaFlat: true,
          sub: '<b>' + flagged + '</b> flagged · <b>' + review + '</b> queued for review', attn: attention > 0 }
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
    table.addEventListener('auditrender', function (e) {
      var d = e.detail;
      if (rcount) rcount.innerHTML = '<b>' + d.visible + '</b> record' + (d.visible === 1 ? '' : 's') + (d.visible !== d.total ? ' <span style="color:var(--fg4)">of ' + d.total + '</span>' : '');
      if (footnote) footnote.textContent = 'Showing ' + d.visible + ' of ' + d.total + ' records';
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

    /* ---------------- overlay helpers ---------------- */
    function openOverlay(el) { el.setAttribute('data-open', ''); }
    function closeOverlay(el) { el.removeAttribute('data-open'); }
    document.addEventListener('click', function (e) {
      var c = e.target.closest('.vbg-overlay [data-close]');
      if (c) { closeOverlay(c.closest('.vbg-overlay')); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') document.querySelectorAll('.vbg-overlay[data-open]').forEach(function (o) { closeOverlay(o); });
    });
    function visibleCount() { return table.querySelectorAll('tbody tr[data-id]').length; }

    /* ---------------- export-logs modal ---------------- */
    var exportModal = document.createElement('div'); exportModal.id = 'export-modal'; exportModal.className = 'vbg-overlay'; stage.appendChild(exportModal);
    var xFormat = 'csv', xScope = 'filtered', xPII = false;
    function renderExport() {
      var vis = visibleCount(), total = table.data.length;
      exportModal.innerHTML = '<div class="scrim" data-close></div><div class="dialog">'
        + '<div class="vbg-mh"><div class="mt"><h2>Export audit logs</h2><p>Download an immutable copy of audit records for archival or external review.</p></div>'
        + '<button class="vbg-mclose" data-close>' + ico('<path d="M18 6 6 18"/><path d="M6 6l12 12"/>', 18, 2) + '</button></div>'
        + '<div class="vbg-form">'
        +   '<div class="vbg-field"><label class="fl">Format</label><div class="vbg-seg" id="x-format">'
        +     [['csv', 'CSV'], ['json', 'JSON'], ['pdf', 'PDF report']].map(function (o) { return '<button data-v="' + o[0] + '"' + (o[0] === xFormat ? ' class="on"' : '') + '>' + o[1] + '</button>'; }).join('') + '</div></div>'
        +   '<div class="vbg-field"><label class="fl">Scope</label><div class="vbg-seg" id="x-scope">'
        +     '<button data-v="filtered"' + (xScope === 'filtered' ? ' class="on"' : '') + '>Current view (' + vis + ')</button>'
        +     '<button data-v="all"' + (xScope === 'all' ? ' class="on"' : '') + '>All records (' + total + ')</button></div></div>'
        +   '<div class="vbg-srow"><div class="lab"><div class="t">Include personal data</div><div class="d">IP addresses and email — subject to GDPR handling</div></div><button class="vbg-sw' + (xPII ? ' on' : '') + '" id="x-pii"></button></div>'
        +   '<div class="vbg-scope"><span class="ico">' + ico('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>', 16) + '</span>Export is logged as an audit event and signed for tamper-evidence.</div>'
        + '</div>'
        + '<div class="vbg-mfoot"><span class="fnote">Retention: 730 days · immutable</span><button class="vbg-mbtn" data-close>Cancel</button><button class="vbg-mbtn primary" id="x-go"><span class="ico">' + ico('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>', 15) + '</span>Export logs</button></div></div>';
    }
    exportModal.addEventListener('click', function (e) {
      var seg = e.target.closest('#x-format button, #x-scope button');
      if (seg) {
        var v = seg.getAttribute('data-v');
        if (seg.closest('#x-format')) xFormat = v; else xScope = v;
        seg.parentElement.querySelectorAll('button').forEach(function (b) { b.classList.remove('on'); });
        seg.classList.add('on');
        return;
      }
      if (e.target.closest('#x-pii')) { xPII = !xPII; e.target.closest('#x-pii').classList.toggle('on', xPII); return; }
      if (e.target.closest('#x-go')) {
        var n = xScope === 'all' ? table.data.length : visibleCount();
        closeOverlay(exportModal);
        showToast('Exporting ' + n + ' records as ' + xFormat.toUpperCase() + (xPII ? ' (with personal data)' : '') + '…', 'ok');
      }
    });

    /* ---------------- generate-report modal ---------------- */
    var reportModal = document.createElement('div'); reportModal.id = 'report-modal'; reportModal.className = 'vbg-overlay'; stage.appendChild(reportModal);
    var rFramework = 'soc2', rPeriod = 'q', rFormat = 'pdf';
    function renderReport() {
      reportModal.innerHTML = '<div class="scrim" data-close></div><div class="dialog">'
        + '<div class="vbg-mh"><div class="mt"><h2>Generate compliance report</h2><p>Compile audit evidence into a control-mapped report for auditors and governance reviews.</p></div>'
        + '<button class="vbg-mclose" data-close>' + ico('<path d="M18 6 6 18"/><path d="M6 6l12 12"/>', 18, 2) + '</button></div>'
        + '<div class="vbg-form">'
        +   '<div class="vbg-field"><label class="fl">Framework</label><div class="vbg-seg" id="r-fw">'
        +     [['soc2', 'SOC 2'], ['iso', 'ISO 27001'], ['gdpr', 'GDPR Art. 30']].map(function (o) { return '<button data-v="' + o[0] + '"' + (o[0] === rFramework ? ' class="on"' : '') + '>' + o[1] + '</button>'; }).join('') + '</div>'
        +     '<div class="fd">Records are mapped to the selected control set with coverage and exceptions.</div></div>'
        +   '<div class="vbg-field"><label class="fl">Reporting period</label><div class="vbg-seg" id="r-period">'
        +     [['m', 'This month'], ['q', 'This quarter'], ['y', 'Year to date']].map(function (o) { return '<button data-v="' + o[0] + '"' + (o[0] === rPeriod ? ' class="on"' : '') + '>' + o[1] + '</button>'; }).join('') + '</div></div>'
        +   '<div class="vbg-field"><label class="fl">Output</label><div class="vbg-seg" id="r-format">'
        +     [['pdf', 'Signed PDF'], ['xlsx', 'Workbook'], ['json', 'Evidence bundle']].map(function (o) { return '<button data-v="' + o[0] + '"' + (o[0] === rFormat ? ' class="on"' : '') + '>' + o[1] + '</button>'; }).join('') + '</div></div>'
        + '</div>'
        + '<div class="vbg-mfoot"><button class="vbg-mbtn" data-close>Cancel</button><button class="vbg-mbtn primary" id="r-go"><span class="ico">' + ico('<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5Z"/><path d="M14 2v6h6"/>', 15) + '</span>Generate report</button></div></div>';
    }
    reportModal.addEventListener('click', function (e) {
      var seg = e.target.closest('#r-fw button, #r-period button, #r-format button');
      if (seg) {
        var v = seg.getAttribute('data-v'), p = seg.parentElement;
        if (p.id === 'r-fw') rFramework = v; else if (p.id === 'r-period') rPeriod = v; else rFormat = v;
        p.querySelectorAll('button').forEach(function (b) { b.classList.remove('on'); });
        seg.classList.add('on');
        return;
      }
      if (e.target.closest('#r-go')) {
        var fw = { soc2: 'SOC 2', iso: 'ISO 27001', gdpr: 'GDPR Art. 30' }[rFramework];
        closeOverlay(reportModal);
        showToast('Generating ' + fw + ' compliance report…', 'ok');
      }
    });

    /* ---------------- retention-policy modal ---------------- */
    var retentionModal = document.createElement('div'); retentionModal.id = 'retention-modal'; retentionModal.className = 'vbg-overlay'; stage.appendChild(retentionModal);
    var retDays = '730', retLock = true, retArchive = true;
    function renderRetention() {
      retentionModal.innerHTML = '<div class="scrim" data-close></div><div class="dialog">'
        + '<div class="vbg-mh"><div class="mt"><h2>Audit retention policy</h2><p>Control how long audit records are kept and whether they can be modified.</p></div>'
        + '<button class="vbg-mclose" data-close>' + ico('<path d="M18 6 6 18"/><path d="M6 6l12 12"/>', 18, 2) + '</button></div>'
        + '<div class="vbg-form">'
        +   '<div class="vbg-field"><label class="fl">Retention period</label><div class="vbg-seg" id="ret-days">'
        +     [['90', '90 days'], ['365', '1 year'], ['730', '2 years'], ['2555', '7 years']].map(function (o) { return '<button data-v="' + o[0] + '"' + (o[0] === retDays ? ' class="on"' : '') + '>' + o[1] + '</button>'; }).join('') + '</div>'
        +     '<div class="fd">Records older than the retention period are automatically purged.</div></div>'
        +   '<div class="vbg-srow"><div class="lab"><div class="t">Immutable (write-once) lock</div><div class="d">Records cannot be edited or deleted before retention elapses</div></div><button class="vbg-sw' + (retLock ? ' on' : '') + '" id="ret-lock"></button></div>'
        +   '<div class="vbg-srow"><div class="lab"><div class="t">Auto-archive to cold storage</div><div class="d">Move records older than 90 days to encrypted archive</div></div><button class="vbg-sw' + (retArchive ? ' on' : '') + '" id="ret-archive"></button></div>'
        + '</div>'
        + '<div class="vbg-mfoot"><span class="fnote">Applies platform-wide</span><button class="vbg-mbtn" data-close>Cancel</button><button class="vbg-mbtn primary" id="ret-go"><span class="ico">' + ico('<path d="M20 6 9 17l-5-5"/>', 15, 2) + '</span>Save policy</button></div></div>';
    }
    retentionModal.addEventListener('click', function (e) {
      var seg = e.target.closest('#ret-days button');
      if (seg) { retDays = seg.getAttribute('data-v'); seg.parentElement.querySelectorAll('button').forEach(function (b) { b.classList.remove('on'); }); seg.classList.add('on'); return; }
      if (e.target.closest('#ret-lock')) { retLock = !retLock; e.target.closest('#ret-lock').classList.toggle('on', retLock); return; }
      if (e.target.closest('#ret-archive')) { retArchive = !retArchive; e.target.closest('#ret-archive').classList.toggle('on', retArchive); return; }
      if (e.target.closest('#ret-go')) {
        var lbl = { '90': '90 days', '365': '1 year', '730': '2 years', '2555': '7 years' }[retDays];
        closeOverlay(retentionModal);
        showToast('Retention policy saved — ' + lbl + (retLock ? ' · immutable lock on' : '') , 'ok');
      }
    });

    /* ---------------- central action handler ---------------- */
    function openDrawer(id, tab) { var e = table.getById(id); if (!e) return; drawer.open(e, tab); }
    function handleAction(act, id, fromDrawer) {
      var e = table.getById(id);
      if (act === 'open')    return openDrawer(id, 'detail');
      if (act === 'changes') return openDrawer(id, 'changes');
      if (act === 'by-user')    { state.search = e.actor.email; search.value = e.actor.email; apply(); if (drawer.hasAttribute('open')) drawer.close(); showToast('Filtered to activity by ' + e.actor.name, null); return; }
      if (act === 'by-company') { state.search = ''; search.value = ''; state.company = new Set([e.company.tid]); buildSidebar(); apply(); if (drawer.hasAttribute('open')) drawer.close(); showToast('Filtered to ' + e.company.name, null); return; }
      if (act === 'by-entity')  { var q = (e.target.id && e.target.id !== '—') ? e.target.id : e.target.label; state.search = q; search.value = q; apply(); if (drawer.hasAttribute('open')) drawer.close(); showToast('Showing history for ' + e.target.label, null); return; }
      if (act === 'flag')    {
        V.LIVEFLAG[id] = !V.LIVEFLAG[id];
        renderStats();
        showToast(V.LIVEFLAG[id] || e.compliance === 'flagged' ? 'Event ' + id + ' flagged for compliance review' : 'Flag removed from ' + id, V.LIVEFLAG[id] ? 'warn' : 'ok');
        return;
      }
      if (act === 'copy')    { if (navigator.clipboard) navigator.clipboard.writeText(id).catch(function(){}); showToast('Event ID copied — ' + id, 'ok'); return; }
      if (act === 'export')  { showToast('Exporting record ' + id + '…', 'ok'); return; }
    }
    document.addEventListener('auditaction', function (e) { handleAction(e.detail.act, e.detail.id, e.detail.fromDrawer); });
    table.addEventListener('auditopen', function (e) { openDrawer(e.detail.id, 'detail'); });

    /* header buttons */
    document.getElementById('export-btn').addEventListener('click', function () { renderExport(); openOverlay(exportModal); });
    document.getElementById('report-btn').addEventListener('click', function () { renderReport(); openOverlay(reportModal); });
    var retBtn = document.getElementById('retention-btn');
    if (retBtn) retBtn.addEventListener('click', function () { renderRetention(); openOverlay(retentionModal); });

    /* initial paint */
    apply();
  });
})();
