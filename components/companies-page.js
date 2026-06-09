/* ============================================================
   VBG — Companies (tenants) overview page controller
   - Builds the filter sidebar from window.VBG_COMPANIES facets
   - Wires every control to <vbg-companies-table>.setFilters(...)
   - Keeps result count / footer / active-filter chips in sync
   - Overview only: no detail-page navigation on row open
   ============================================================ */
(function () {
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var C = window.VBG_COMPANIES;
    var table = document.getElementById('ctable');
    if (!C || !table) return;

    var INDS = C.INDUSTRIES;
    var PLAN = C.PLAN_LABEL;
    var REG = C.REGION_LABEL;
    var DATA = C.DATA;

    /* ---------------- filter state ---------------- */
    var state = {
      plan: new Set(), industry: new Set(), status: new Set(), region: new Set(),
      onboarded: 'any', seats: 'any', search: ''
    };

    function count(pred) { return DATA.filter(pred).length; }

    /* ---------------- filter sidebar config ---------------- */
    var SECTIONS = [
      {
        id: 'plan', title: 'Plan', type: 'check', key: 'plan',
        opts: Object.keys(PLAN).map(function (k) {
          return { val: k, label: PLAN[k], n: count(function (c) { return c.plan === k; }) };
        })
      },
      {
        id: 'industry', title: 'Industry', type: 'check', key: 'industry',
        opts: Object.keys(INDS).map(function (k) {
          return { val: k, label: INDS[k].label, n: count(function (c) { return c.industry === k; }) };
        })
      },
      {
        id: 'status', title: 'Status', type: 'check', key: 'status',
        opts: [
          { val: 'active',    label: 'Active',    n: count(function (c) { return c.status === 'active'; }) },
          { val: 'trial',     label: 'Trial',     n: count(function (c) { return c.status === 'trial'; }) },
          { val: 'invited',   label: 'Invited',   n: count(function (c) { return c.status === 'invited'; }) },
          { val: 'suspended', label: 'Suspended', n: count(function (c) { return c.status === 'suspended'; }) },
          { val: 'churned',   label: 'Churned',   n: count(function (c) { return c.status === 'churned'; }) }
        ]
      },
      {
        id: 'region', title: 'Region', type: 'check', key: 'region',
        opts: Object.keys(REG).map(function (k) {
          return { val: k, label: REG[k], n: count(function (c) { return c.region === k; }) };
        }).filter(function (o) { return o.n > 0; })
      },
      {
        id: 'seats', title: 'Seat usage', type: 'radio', key: 'seats',
        opts: [
          { val: 'any',      label: 'Any usage' },
          { val: 'near',     label: 'Near seat limit' },
          { val: 'capacity', label: 'Has capacity' },
          { val: 'unused',   label: 'No active seats' }
        ]
      },
      {
        id: 'onboarded', title: 'Onboarded', type: 'radio', key: 'onboarded',
        opts: [
          { val: 'any', label: 'Any time' },
          { val: '7',   label: 'Last 7 days' },
          { val: '30',  label: 'Last 30 days' },
          { val: '90',  label: 'Last 90 days' }
        ]
      }
    ];

    var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
    var CHEV = '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';

    /* ---------------- render filter sidebar ---------------- */
    var fbody = document.getElementById('fbody');

    function buildSidebar() {
      fbody.innerHTML = SECTIONS.map(function (s) {
        var body = '<div class="fsec-body' + (s.scroll ? ' scroll' : '') + '">' + s.opts.map(function (o) {
          var control = s.type === 'radio'
            ? '<span class="radio"></span>'
            : '<span class="box">' + CHECK + '</span>';
          var num = (o.n != null) ? '<span class="fn">' + o.n + '</span>' : '';
          return '<div class="fopt" data-type="' + s.type + '" data-key="' + s.key + '" data-val="' + o.val + '">'
            + control + '<span class="flabel">' + o.label + '</span>' + num + '</div>';
        }).join('') + '</div>';
        return '<div class="fsection" data-sec="' + s.id + '">'
          + '<div class="fsec-head">' + '<span class="lbl">' + s.title + '</span>' + CHEV + '</div>'
          + body + '</div>';
      }).join('');

      // preset default selection for radios (Any)
      fbody.querySelectorAll('.fopt[data-type="radio"]').forEach(function (el) {
        var key = el.getAttribute('data-key');
        if (el.getAttribute('data-val') === state[key]) el.classList.add('on');
      });
    }

    buildSidebar();

    /* ---------------- interactions ---------------- */
    fbody.addEventListener('click', function (e) {
      var head = e.target.closest('.fsec-head');
      if (head) { head.parentElement.classList.toggle('collapsed'); return; }

      var opt = e.target.closest('.fopt');
      if (!opt) return;
      var type = opt.getAttribute('data-type');
      var key = opt.getAttribute('data-key');
      var val = opt.getAttribute('data-val');

      if (type === 'radio') {
        state[key] = val;
        opt.parentElement.querySelectorAll('.fopt').forEach(function (o) { o.classList.remove('on'); });
        opt.classList.add('on');
      } else {
        toggleSet(key, val);
        opt.classList.toggle('on');
      }
      apply();
    });

    function toggleSet(key, val) {
      var set = state[key];
      if (set.has(val)) set.delete(val); else set.add(val);
    }

    /* search */
    var search = document.getElementById('search');
    search.addEventListener('input', function () { state.search = search.value.trim(); apply(); });

    /* reset */
    var resetBtn = document.getElementById('reset-filters');
    resetBtn.addEventListener('click', function () { resetAll(); });

    function resetAll() {
      state.plan.clear(); state.industry.clear(); state.status.clear(); state.region.clear();
      state.onboarded = 'any'; state.seats = 'any'; state.search = '';
      search.value = '';
      buildSidebar();
      apply();
    }

    /* ---------------- apply + sync chrome ---------------- */
    function apply() { table.setFilters(state); syncActiveChips(); }

    var LABELS = {
      status: { active: 'Active', trial: 'Trial', invited: 'Invited', suspended: 'Suspended', churned: 'Churned' },
      seats: { near: 'Near seat limit', capacity: 'Has capacity', unused: 'No active seats' },
      onboarded: { '7': 'Last 7 days', '30': 'Last 30 days', '90': 'Last 90 days' }
    };
    function planLabel(k) { return PLAN[k] || k; }
    function indLabel(k) { return (INDS[k] || {}).label || k; }
    function regLabel(k) { return REG[k] || k; }

    var chipsWrap = document.getElementById('activechips');
    function syncActiveChips() {
      var chips = [];
      state.plan.forEach(function (v) { chips.push({ k: 'plan', v: v, t: planLabel(v) }); });
      state.industry.forEach(function (v) { chips.push({ k: 'industry', v: v, t: indLabel(v) }); });
      state.status.forEach(function (v) { chips.push({ k: 'status', v: v, t: LABELS.status[v] }); });
      state.region.forEach(function (v) { chips.push({ k: 'region', v: v, t: regLabel(v) }); });
      if (state.seats !== 'any') chips.push({ k: 'seats', v: state.seats, t: LABELS.seats[state.seats], single: true });
      if (state.onboarded !== 'any') chips.push({ k: 'onboarded', v: state.onboarded, t: LABELS.onboarded[state.onboarded], single: true });

      chipsWrap.innerHTML = chips.map(function (c) {
        return '<span class="achip" data-k="' + c.k + '" data-v="' + c.v + '"' + (c.single ? ' data-single="1"' : '') + '>' + c.t
          + '<button aria-label="Remove filter"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></span>';
      }).join('');

      resetBtn.classList.toggle('show', chips.length > 0 || state.search !== '');
    }

    chipsWrap.addEventListener('click', function (e) {
      var btn = e.target.closest('.achip button');
      if (!btn) return;
      var chip = btn.closest('.achip');
      var k = chip.getAttribute('data-k');
      var v = chip.getAttribute('data-v');
      if (chip.getAttribute('data-single')) state[k] = 'any';
      else state[k].delete(v);
      buildSidebar();
      apply();
    });

    /* ---------------- footer / count, driven by table render ---------------- */
    var rcount = document.getElementById('rcount');
    var footnote = document.getElementById('footnote');
    table.addEventListener('companiesrender', function (e) {
      var d = e.detail;
      if (rcount) {
        rcount.innerHTML = '<b>' + d.visible + '</b> compan' + (d.visible === 1 ? 'y' : 'ies')
          + (d.visible !== d.total ? ' <span style="color:var(--fg4)">of ' + d.total + '</span>' : '');
      }
      if (footnote) footnote.textContent = 'Showing ' + d.visible + ' of ' + d.total + ' companies';
    });
  });
})();
