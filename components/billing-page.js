/* ============================================================
   VBG — Billing & Licensing page controller
   - Builds the filter sidebar from window.VBG_BILLING facets
   - Computes the summary stat strip (ARR, licenses, attention)
   - Central handler for every subscription / license action
   - Owns the change-plan modal, create-subscription modal,
     suspend/cancel confirms and the toast
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
    .vbg-mfoot { display: flex; justify-content: flex-end; gap: 10px; padding: 18px 26px 22px; border-top: 1px solid var(--border-subtle); }
    .vbg-mbtn { height: 40px; padding: 0 16px; border-radius: var(--r-sm); font: var(--text-body-strong); cursor: pointer; border: 1px solid var(--border); background: var(--bg-surface); color: var(--fg1); transition: background var(--dur-fast) var(--ease-out); display: inline-flex; align-items: center; gap: 8px; }
    .vbg-mbtn:hover { background: var(--bg-hover); }
    .vbg-mbtn.primary { background: var(--vbg-amber); border-color: transparent; color: var(--fg-inverse); box-shadow: 0 1px 2px rgba(184,111,0,.35); }
    .vbg-mbtn.primary:hover { background: var(--vbg-amber-600); }
    .vbg-mbtn.primary:disabled { opacity: .5; cursor: default; }
    .vbg-mbtn.danger { background: var(--status-error); border-color: transparent; color: #fff; }
    .vbg-mbtn.danger:hover { background: #C13A3A; }

    /* change-plan */
    #plan-modal .dialog { width: 720px; max-width: 92%; }
    #plan-modal .plans { padding: 20px 26px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    #plan-modal .pcard { text-align: left; border: 1px solid var(--border-subtle); border-radius: var(--r-md); background: var(--bg-surface); padding: 16px; cursor: pointer; transition: border-color var(--dur-fast), box-shadow var(--dur-fast), background var(--dur-fast); position: relative; }
    #plan-modal .pcard:hover { border-color: var(--border-strong); }
    #plan-modal .pcard.sel { border-color: var(--vbg-amber); background: var(--vbg-amber-50); box-shadow: var(--ring-focus); }
    #plan-modal .pcard .ph { display: flex; align-items: center; justify-content: space-between; }
    #plan-modal .pcard .pn { font: var(--text-h3); color: var(--fg1); }
    #plan-modal .pcard .pcur { font: var(--text-label); color: var(--fg-accent); background: var(--vbg-amber-100); padding: 2px 8px; border-radius: var(--r-full); }
    #plan-modal .pcard .pprice { font: var(--text-mono); color: var(--fg2); margin-top: 8px; }
    #plan-modal .pcard .pprice b { font-family: var(--font-sans); font-weight: 600; color: var(--fg1); }
    #plan-modal .pcard .pfeat { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
    #plan-modal .pcard .pf { display: flex; align-items: center; gap: 8px; font: var(--text-caption); color: var(--fg2); }
    #plan-modal .pcard .pf .ico { color: var(--status-success); display: inline-flex; }
    #plan-modal .pcard .pcheck { position: absolute; top: 14px; right: 14px; width: 20px; height: 20px; border-radius: 999px; border: 1px solid var(--border-strong); display: grid; place-items: center; color: #fff; }
    #plan-modal .pcard.sel .pcheck { background: var(--vbg-amber); border-color: var(--vbg-amber); }
    #plan-modal .pcard .pcheck svg { opacity: 0; }
    #plan-modal .pcard.sel .pcheck svg { opacity: 1; }

    /* create / form */
    #create-modal .dialog { width: 540px; max-width: 92%; }
    .vbg-form { padding: 20px 26px; display: flex; flex-direction: column; gap: 16px; }
    .vbg-field .fl { font: var(--text-label); color: var(--fg2); margin-bottom: 7px; display: block; }
    .vbg-field input { width: 100%; height: 40px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--r-sm); background: var(--bg-surface); font: var(--text-body); color: var(--fg1); outline: none; }
    .vbg-field input:focus { border-color: var(--border-focus); box-shadow: var(--ring-focus); }
    .vbg-field .frow { display: flex; gap: 12px; }
    .vbg-seg { display: inline-flex; border: 1px solid var(--border); border-radius: var(--r-sm); overflow: hidden; }
    .vbg-seg button { border: 0; background: var(--bg-surface); cursor: pointer; font: var(--text-label); color: var(--fg2); padding: 9px 14px; border-right: 1px solid var(--border); }
    .vbg-seg button:last-child { border-right: 0; }
    .vbg-seg button.on { background: var(--bg-selected); color: var(--fg-accent); }

    /* confirm */
    #confirm-modal .dialog { width: 440px; max-width: 92%; padding: 24px; }
    #confirm-modal .cseal { width: 46px; height: 46px; border-radius: var(--r-md); display: grid; place-items: center; margin-bottom: 16px; }
    #confirm-modal .cseal.warn { background: var(--status-warning-bg); color: var(--status-warning); }
    #confirm-modal .cseal.err { background: var(--status-error-bg); color: var(--status-error); }
    #confirm-modal h2 { font: var(--text-h2); color: var(--fg1); }
    #confirm-modal p { margin: 10px 0 0; font: var(--text-body); color: var(--fg2); line-height: 1.55; }
    #confirm-modal p b { color: var(--fg1); font-weight: 600; }
    #confirm-modal .cactions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }

    #vbg-toast { position: absolute; left: 50%; bottom: 28px; transform: translateX(-50%) translateY(20px); z-index: 95; opacity: 0; pointer-events: none; transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out); }
    #vbg-toast[data-show] { opacity: 1; transform: translateX(-50%); }
    #vbg-toast .t { display: flex; align-items: center; gap: 10px; background: var(--slate-900); color: #fff; border-radius: var(--r-sm); padding: 11px 16px; font: var(--text-body-strong); font-size: 13px; box-shadow: var(--shadow-lg); }
    #vbg-toast .t .ico.ok { color: #6FE0A0; }
    #vbg-toast .t .ico.warn { color: var(--vbg-amber-300); }
  `;

  ready(function () {
    var V = window.VBG_BILLING;
    var table = document.getElementById('btable');
    var drawer = document.querySelector('vbg-billing-drawer');
    var stage = document.getElementById('stage');
    if (!V || !table) return;

    var st = document.createElement('style'); st.textContent = MODAL_STYLE; document.head.appendChild(st);

    /* ---------------- filter state ---------------- */
    var state = { plan: new Set(), status: new Set(), cycle: new Set(), payment: new Set(), renewal: 'any', usage: 'any', search: '' };
    function count(pred) { return table.data.filter(pred).length; }

    function buildSections() {
      return [
        { id: 'plan', title: 'Plan', type: 'check', key: 'plan',
          opts: ['enterprise', 'professional', 'team', 'trial'].map(function (k) { return { val: k, label: V.PLAN_LABEL[k], n: count(function (s) { return s.plan === k; }) }; }).filter(function (o) { return o.n > 0; }) },
        { id: 'status', title: 'Status', type: 'check', key: 'status',
          opts: ['active', 'trial', 'pending', 'past_due', 'suspended', 'canceled'].map(function (k) { return { val: k, label: V.STATUS_LABEL[k], n: count(function (s) { return s.status === k; }) }; }).filter(function (o) { return o.n > 0; }) },
        { id: 'cycle', title: 'Billing cycle', type: 'check', key: 'cycle',
          opts: [{ val: 'annual', label: 'Annual', n: count(function (s) { return s.cycle === 'annual'; }) }, { val: 'monthly', label: 'Monthly', n: count(function (s) { return s.cycle === 'monthly'; }) }] },
        { id: 'payment', title: 'Payment', type: 'check', key: 'payment',
          opts: ['paid', 'pending', 'overdue', 'failed', 'none'].map(function (k) { return { val: k, label: V.PAY_LABEL[k], n: count(function (s) { return s.paymentStatus === k; }) }; }).filter(function (o) { return o.n > 0; }) },
        { id: 'renewal', title: 'Renewal due', type: 'radio', key: 'renewal',
          opts: [{ val: 'any', label: 'Any time' }, { val: 'overdue', label: 'Overdue' }, { val: '30', label: 'Next 30 days' }, { val: '60', label: 'Next 60 days' }, { val: '90', label: 'Next 90 days' }] },
        { id: 'usage', title: 'License usage', type: 'radio', key: 'usage',
          opts: [{ val: 'any', label: 'Any' }, { val: 'near', label: 'Near limit (≥90%)' }, { val: 'capacity', label: 'Has capacity (<75%)' }, { val: 'unused', label: 'No seats used' }] }
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
      state.plan.clear(); state.status.clear(); state.cycle.clear(); state.payment.clear();
      state.renewal = 'any'; state.usage = 'any'; state.search = ''; search.value = '';
      buildSidebar(); apply();
    }

    function apply() { table.setFilters(state); syncActiveChips(); }

    var LABELS = {
      renewal: { overdue: 'Renewal overdue', '30': 'Renews ≤30 days', '60': 'Renews ≤60 days', '90': 'Renews ≤90 days' },
      usage: { near: 'Near seat limit', capacity: 'Has seat capacity', unused: 'No seats used' }
    };
    var chipsWrap = document.getElementById('activechips');
    function syncActiveChips() {
      var chips = [];
      state.plan.forEach(function (v) { chips.push({ k: 'plan', v: v, t: V.PLAN_LABEL[v] }); });
      state.status.forEach(function (v) { chips.push({ k: 'status', v: v, t: V.STATUS_LABEL[v] }); });
      state.cycle.forEach(function (v) { chips.push({ k: 'cycle', v: v, t: V.CYCLE_LABEL[v] }); });
      state.payment.forEach(function (v) { chips.push({ k: 'payment', v: v, t: V.PAY_LABEL[v] }); });
      if (state.renewal !== 'any') chips.push({ k: 'renewal', v: state.renewal, t: LABELS.renewal[state.renewal], single: true });
      if (state.usage !== 'any') chips.push({ k: 'usage', v: state.usage, t: LABELS.usage[state.usage], single: true });
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
      var active = d.filter(function (x) { return x.status === 'active'; }).length;
      var trial = d.filter(function (x) { return x.status === 'trial' || x.status === 'pending'; }).length;
      var pastDue = d.filter(function (x) { return x.status === 'past_due'; }).length;
      var suspended = d.filter(function (x) { return x.status === 'suspended'; }).length;
      var arr = d.reduce(function (a, x) { return a + V.mrrOf(x) * 12; }, 0);
      var mrr = arr / 12;
      var seatsUsed = d.reduce(function (a, x) { return a + (x.status === 'canceled' ? 0 : x.seatsUsed); }, 0);
      var seatsTotal = d.reduce(function (a, x) { return a + (x.status === 'canceled' ? 0 : x.seatsTotal); }, 0);
      var util = seatsTotal ? Math.round(seatsUsed / seatsTotal * 100) : 0;
      var overdue = d.filter(function (x) { return x.paymentStatus === 'overdue' || x.paymentStatus === 'failed'; }).length;
      var renewSoon = d.filter(function (x) { var dd = V.daysBetween(x.renewal); return dd != null && dd >= 0 && dd <= 30; }).length;
      var attention = overdue + suspended;

      var cards = [
        { ico: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
          label: 'Active subscriptions', num: active, delta: trial ? trial + ' on trial' : '', deltaFlat: true,
          sub: '<b>' + total + '</b> total · <b>' + pastDue + '</b> past due · <b>' + suspended + '</b> suspended' },
        { ico: '<path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
          label: 'Annual recurring revenue', num: V.fmtMoney(arr), delta: V.fmtMoney(mrr) + ' MRR',
          sub: 'Across <b>' + (active + pastDue) + '</b> billed subscriptions' },
        { ico: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
          label: 'License utilization', num: util + '%', delta: seatsUsed + ' / ' + seatsTotal + ' seats',
          sub: '<b>' + (seatsTotal - seatsUsed) + '</b> seats available across all tenants' },
        { ico: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.42 0z"/>',
          label: 'Needs attention', num: attention, delta: renewSoon ? renewSoon + ' renew ≤30d' : 'no renewals due', deltaFlat: true,
          sub: '<b>' + overdue + '</b> payment issues · <b>' + suspended + '</b> suspended', attn: attention > 0 }
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
    table.addEventListener('billingrender', function (e) {
      var d = e.detail;
      if (rcount) rcount.innerHTML = '<b>' + d.visible + '</b> subscription' + (d.visible === 1 ? '' : 's') + (d.visible !== d.total ? ' <span style="color:var(--fg4)">of ' + d.total + '</span>' : '');
      if (footnote) footnote.textContent = 'Showing ' + d.visible + ' of ' + d.total + ' subscriptions';
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

    /* ---------------- change-plan modal ---------------- */
    var planModal = document.createElement('div'); planModal.id = 'plan-modal'; planModal.className = 'vbg-overlay'; stage.appendChild(planModal);
    var planTarget = null, planPick = null;
    var PLAN_FEATURES = {
      enterprise:   ['All 10 modules', 'Unlimited generation runs', 'SSO & SCIM', 'Dedicated support'],
      professional: ['7 modules incl. MEP & API', '1 500 runs / month', 'Priority support', 'Advanced quotas'],
      team:         ['4 core modules', '500 runs / month', 'Standard support', 'Shared workspace'],
      trial:        ['3 modules', '50 runs / month', 'Evaluation only', 'No charge']
    };
    function openPlan(id) {
      var s = table.getById(id); if (!s) return;
      planTarget = id; planPick = s.plan;
      var cards = ['enterprise', 'professional', 'team', 'trial'].map(function (p) {
        var price = V.PRICE_SEAT[p];
        var priceTxt = price ? V.fmtMoney(price) + ' <b>/ seat / yr</b>' : 'Free <b>· evaluation</b>';
        var cur = p === s.plan ? '<span class="pcur">Current</span>' : '';
        var feats = PLAN_FEATURES[p].map(function (f) { return '<div class="pf"><span class="ico">' + ico('<path d="M20 6 9 17l-5-5"/>', 12, 2.4) + '</span>' + f + '</div>'; }).join('');
        return '<button class="pcard' + (p === planPick ? ' sel' : '') + '" data-plan="' + p + '"><span class="pcheck">' + ico('<path d="M20 6 9 17l-5-5"/>', 12, 3) + '</span><div class="ph"><span class="pn">' + V.PLAN_LABEL[p] + '</span>' + cur + '</div><div class="pprice">' + priceTxt + '</div><div class="pfeat">' + feats + '</div></button>';
      }).join('');
      planModal.innerHTML = '<div class="scrim" data-close></div><div class="dialog">'
        + '<div class="vbg-mh"><div class="mt"><h2>Change plan</h2><p>' + esc(s.name) + ' · ' + esc(s.tid) + ' — upgrade or downgrade the subscription tier.</p></div>'
        + '<button class="vbg-mclose" data-close>' + ico('<path d="M18 6 6 18"/><path d="M6 6l12 12"/>', 18, 2) + '</button></div>'
        + '<div class="plans" id="plan-grid">' + cards + '</div>'
        + '<div class="vbg-mfoot"><button class="vbg-mbtn" data-close>Cancel</button><button class="vbg-mbtn primary" id="plan-apply"' + (planPick === s.plan ? ' disabled' : '') + '>Apply plan change</button></div></div>';
      openOverlay(planModal);
    }
    planModal.addEventListener('click', function (e) {
      var card = e.target.closest('[data-plan]');
      if (card) {
        planPick = card.getAttribute('data-plan');
        planModal.querySelectorAll('.pcard').forEach(function (c) { c.classList.remove('sel'); });
        card.classList.add('sel');
        var apply = planModal.querySelector('#plan-apply');
        apply.disabled = (planPick === table.getById(planTarget).plan);
        return;
      }
      if (e.target.closest('#plan-apply')) {
        var s = table.getById(planTarget);
        var from = V.PLAN_LABEL[s.plan], to = V.PLAN_LABEL[planPick];
        var up = V.PLAN_RANK[planPick] > V.PLAN_RANK[s.plan];
        table.setPlan(planTarget, planPick);
        if (drawer.hasAttribute('open')) drawer.refresh();
        closeOverlay(planModal);
        showToast(s.name + ' ' + (up ? 'upgraded' : 'changed') + ' to ' + to, 'ok');
      }
    });

    /* ---------------- create-subscription modal ---------------- */
    var createModal = document.createElement('div'); createModal.id = 'create-modal'; createModal.className = 'vbg-overlay'; stage.appendChild(createModal);
    var cPlan = 'professional', cCycle = 'annual';
    function renderCreate() {
      createModal.innerHTML = '<div class="scrim" data-close></div><div class="dialog">'
        + '<div class="vbg-mh"><div class="mt"><h2>Create subscription</h2><p>Provision a new tenant subscription and license allocation.</p></div>'
        + '<button class="vbg-mclose" data-close>' + ico('<path d="M18 6 6 18"/><path d="M6 6l12 12"/>', 18, 2) + '</button></div>'
        + '<div class="vbg-form">'
        +   '<div class="vbg-field"><label class="fl">Company name</label><input type="text" id="c-name" placeholder="e.g. Mostert De Winter"></div>'
        +   '<div class="vbg-field"><label class="fl">Primary domain</label><input type="text" id="c-domain" placeholder="e.g. mdw.nl"></div>'
        +   '<div class="vbg-field"><label class="fl">Plan</label><div class="vbg-seg" id="c-plan">'
        +     ['trial', 'team', 'professional', 'enterprise'].map(function (p) { return '<button data-v="' + p + '"' + (p === cPlan ? ' class="on"' : '') + '>' + V.PLAN_LABEL[p] + '</button>'; }).join('') + '</div></div>'
        +   '<div class="vbg-field"><div class="frow"><div style="flex:1"><label class="fl">License seats</label><input type="number" id="c-seats" value="25" min="1"></div>'
        +     '<div><label class="fl">Billing cycle</label><div class="vbg-seg" id="c-cycle"><button data-v="annual"' + (cCycle === 'annual' ? ' class="on"' : '') + '>Annual</button><button data-v="monthly"' + (cCycle === 'monthly' ? ' class="on"' : '') + '>Monthly</button></div></div></div></div>'
        + '</div>'
        + '<div class="vbg-mfoot"><button class="vbg-mbtn" data-close>Cancel</button><button class="vbg-mbtn primary" id="c-create"><span class="ico">' + ico('<path d="M12 5v14"/><path d="M5 12h14"/>', 15, 2) + '</span>Create subscription</button></div></div>';
    }
    createModal.addEventListener('click', function (e) {
      var seg = e.target.closest('#c-plan button, #c-cycle button');
      if (seg) {
        var v = seg.getAttribute('data-v');
        if (seg.closest('#c-plan')) cPlan = v; else cCycle = v;
        seg.parentElement.querySelectorAll('button').forEach(function (b) { b.classList.remove('on'); });
        seg.classList.add('on');
        return;
      }
      if (e.target.closest('#c-create')) {
        var name = (createModal.querySelector('#c-name').value || '').trim() || 'New tenant';
        var domain = (createModal.querySelector('#c-domain').value || '').trim() || (name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 10) + '.nl');
        var seats = Math.max(1, parseInt(createModal.querySelector('#c-seats').value, 10) || 25);
        var seq = 440 + Math.floor(Math.random() * 540);
        var isTrial = cPlan === 'trial';
        var start = V.nowISO();
        var end = new Date('2026-06-09'); end.setFullYear(end.getFullYear() + (cCycle === 'annual' ? 1 : 0)); if (cCycle === 'monthly' && !isTrial) end.setMonth(end.getMonth() + 12); if (isTrial) { end = new Date('2026-06-09'); end.setDate(end.getDate() + 30); }
        var endISO = end.toISOString().slice(0, 10);
        var sub = { tid: 'TEN-0' + seq, name: name, domain: domain, plan: cPlan, status: isTrial ? 'trial' : 'active', cycle: cCycle, seatsUsed: 0, seatsTotal: seats, addOn: 0, contractStart: start, contractEnd: endISO, renewal: endISO, paymentStatus: isTrial ? 'none' : 'pending', autoRenew: !isTrial, contact: 'New admin', email: 'admin@' + domain };
        table.add(sub);
        closeOverlay(createModal);
        showToast(name + ' subscription created — ' + V.PLAN_LABEL[cPlan] + ' plan', 'ok');
      }
    });
    document.getElementById('create-btn').addEventListener('click', function () { renderCreate(); openOverlay(createModal); setTimeout(function () { var n = createModal.querySelector('#c-name'); if (n) n.focus(); }, 80); });

    /* ---------------- confirm modal (suspend / cancel / reactivate) ---------------- */
    var confirmModal = document.createElement('div'); confirmModal.id = 'confirm-modal'; confirmModal.className = 'vbg-overlay'; stage.appendChild(confirmModal);
    var pendingConfirm = null;
    function openConfirm(kind, id) {
      var s = table.getById(id); if (!s) return;
      pendingConfirm = { kind: kind, id: id };
      var cfg;
      if (kind === 'suspend') cfg = { seal: 'err', glyph: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>', h: 'Suspend subscription?', p: '<b>' + esc(s.name) + '</b> (' + esc(s.tid) + ') will lose platform access immediately. Billing continues but all <b>' + s.seatsUsed + '</b> active seats are locked. You can reactivate at any time.', btn: 'Suspend', danger: true };
      else if (kind === 'cancel') cfg = { seal: 'err', glyph: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>', h: 'Cancel subscription?', p: 'This ends <b>' + esc(s.name) + "</b>'s contract and revokes all licenses at the end of the term. This cannot be undone.", btn: 'Cancel subscription', danger: true };
      else cfg = { seal: 'warn', glyph: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>', h: 'Reactivate subscription?', p: '<b>' + esc(s.name) + '</b> will regain platform access and all <b>' + s.seatsUsed + '</b> seats will be restored. Billing resumes on the current cycle.', btn: 'Reactivate', danger: false };
      confirmModal.innerHTML = '<div class="scrim" data-close></div><div class="dialog">'
        + '<div class="cseal ' + cfg.seal + '">' + ico(cfg.glyph, 22, 1.8) + '</div>'
        + '<h2>' + cfg.h + '</h2><p>' + cfg.p + '</p>'
        + '<div class="cactions"><button class="vbg-mbtn" data-close>Dismiss</button><button class="vbg-mbtn ' + (cfg.danger ? 'danger' : 'primary') + '" data-confirm>' + cfg.btn + '</button></div></div>';
      openOverlay(confirmModal);
    }
    confirmModal.addEventListener('click', function (e) {
      if (!e.target.closest('[data-confirm]')) return;
      var s = table.getById(pendingConfirm.id);
      if (pendingConfirm.kind === 'suspend') { table.setStatus(pendingConfirm.id, 'suspended'); showToast(s.name + ' suspended', 'warn'); }
      else if (pendingConfirm.kind === 'cancel') { table.cancelSub(pendingConfirm.id); showToast(s.name + ' subscription canceled', 'warn'); }
      else { table.setStatus(pendingConfirm.id, 'active'); showToast(s.name + ' reactivated', 'ok'); }
      if (drawer.hasAttribute('open')) drawer.refresh();
      closeOverlay(confirmModal);
      pendingConfirm = null;
    });

    /* ---------------- central action handler ---------------- */
    function openDrawer(id, tab) { var s = table.getById(id); if (!s) return; drawer.open(s, tab); }
    function handleAction(act, id, value) {
      var s = table.getById(id);
      if (act === 'open')         return openDrawer(id, 'overview');
      if (act === 'licenses')     return openDrawer(id, 'licenses');
      if (act === 'invoices')     return openDrawer(id, 'invoices');
      if (act === 'entitlements') return openDrawer(id, 'entitlements');
      if (act === 'history')      return openDrawer(id, 'history');
      if (act === 'billing')      { openDrawer(id, 'overview'); showToast('Billing details — edit contact and payment method', null); return; }
      if (act === 'plan')         return openPlan(id);
      if (act === 'suspend')      return openConfirm('suspend', id);
      if (act === 'reactivate')   return openConfirm('reactivate', id);
      if (act === 'cancel')       return openConfirm('cancel', id);
      if (act === 'set-seats')    { table.setSeats(id, value); if (drawer.hasAttribute('open')) drawer.refresh(); showToast('License quantity updated to ' + value + ' seats for ' + s.name, 'ok'); return; }
      if (act === 'renewal')      { table.setRenewal(id, !s.autoRenew); if (drawer.hasAttribute('open')) drawer.refresh(); showToast('Auto-renew ' + (s.autoRenew ? 'enabled' : 'disabled') + ' for ' + s.name, 'ok'); return; }
      if (act === 'export')       { showToast('Exporting billing data for ' + s.name + '…', null); return; }
      if (act === 'toast-invoice'){ showToast('Invoice downloaded (PDF)', 'ok'); return; }
    }
    document.addEventListener('billingaction', function (e) { handleAction(e.detail.act, e.detail.id, e.detail.value); });
    table.addEventListener('billingopen', function (e) { openDrawer(e.detail.id, e.detail.tab); });

    /* header export-all button */
    var exportBtn = document.getElementById('export-btn');
    if (exportBtn) exportBtn.addEventListener('click', function () { showToast('Exporting billing data for all subscriptions (CSV)…', null); });

    /* initial paint */
    apply();
  });
})();
