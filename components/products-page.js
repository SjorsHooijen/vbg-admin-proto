/* ============================================================
   VBG — Products (catalog) page controller
   - Builds the filter sidebar from window.VBG_PRODUCTS facets
   - Wires every control to <vbg-products-table>.setFilters(...)
   - Keeps result count / footer / active-filter chips in sync
   - Overview only: no detail-page navigation on row open
   ============================================================ */
(function () {
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var P = window.VBG_PRODUCTS;
    var table = document.getElementById('ptable');
    if (!P || !table) return;

    var CATS = P.CATEGORIES;
    var MAT = P.MATERIAL_LABEL;
    var DATA = P.DATA;

    /* ---------------- filter state ---------------- */
    var state = {
      category: new Set(), manufacturer: new Set(), status: new Set(),
      material: new Set(), tags: new Set(),
      updated: 'any', usage: 'any', search: ''
    };

    function count(pred) { return DATA.filter(pred).length; }

    /* ---------------- filter sidebar config ---------------- */
    var SECTIONS = [
      {
        id: 'category', title: 'Discipline', type: 'check', key: 'category',
        opts: Object.keys(CATS).map(function (k) {
          return { val: k, label: CATS[k].label, n: count(function (p) { return p.category === k; }) };
        })
      },
      {
        id: 'manufacturer', title: 'Manufacturer', type: 'check', key: 'manufacturer', scroll: true,
        opts: P.manufacturers()
      },
      {
        id: 'status', title: 'Status', type: 'check', key: 'status',
        opts: [
          { val: 'active',     label: 'Active',     n: count(function (p) { return p.status === 'active'; }) },
          { val: 'draft',      label: 'Draft',      n: count(function (p) { return p.status === 'draft'; }) },
          { val: 'deprecated', label: 'Deprecated', n: count(function (p) { return p.status === 'deprecated'; }) }
        ]
      },
      {
        id: 'material', title: 'Material', type: 'check', key: 'material',
        opts: Object.keys(MAT).map(function (m) {
          return { val: m, label: MAT[m], n: count(function (p) { return p.material === m; }) };
        }).filter(function (o) { return o.n > 0; })
      },
      {
        id: 'tags', title: 'Standards', type: 'chips', key: 'tags',
        opts: P.allTags().map(function (t) { return { val: t.tag, label: t.tag, n: t.n }; })
      },
      {
        id: 'updated', title: 'Last updated', type: 'radio', key: 'updated',
        opts: [
          { val: 'any', label: 'Any time' },
          { val: '7',   label: 'Last 7 days' },
          { val: '30',  label: 'Last 30 days' },
          { val: '90',  label: 'Last 90 days' }
        ]
      },
      {
        id: 'usage', title: 'Usage', type: 'radio', key: 'usage',
        opts: [
          { val: 'any',    label: 'Any usage' },
          { val: 'unused', label: 'Unused' },
          { val: 'low',    label: '1–5 recipes' },
          { val: 'mid',    label: '6–10 recipes' },
          { val: 'high',   label: '10+ recipes' }
        ]
      }
    ];

    var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
    var CHEV = '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';

    /* ---------------- render filter sidebar ---------------- */
    var fbody = document.getElementById('fbody');

    function buildSidebar() {
      fbody.innerHTML = SECTIONS.map(function (s) {
        var body;
        if (s.type === 'chips') {
          body = '<div class="ftags">' + s.opts.map(function (o) {
            return '<button class="chip" data-key="' + s.key + '" data-val="' + o.val + '">' + o.label + '</button>';
          }).join('') + '</div>';
        } else {
          body = '<div class="fsec-body' + (s.scroll ? ' scroll' : '') + '">' + s.opts.map(function (o) {
            var control = s.type === 'radio'
              ? '<span class="radio"></span>'
              : '<span class="box">' + CHECK + '</span>';
            var num = (o.n != null) ? '<span class="fn">' + o.n + '</span>' : '';
            return '<div class="fopt" data-type="' + s.type + '" data-key="' + s.key + '" data-val="' + o.val + '">'
              + control + '<span class="flabel">' + o.label + '</span>' + num + '</div>';
          }).join('') + '</div>';
        }
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

      var chip = e.target.closest('.chip');
      if (chip) {
        toggleSet(chip.getAttribute('data-key'), chip.getAttribute('data-val'));
        chip.classList.toggle('on');
        apply();
        return;
      }

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
      state.category.clear(); state.manufacturer.clear(); state.status.clear();
      state.material.clear(); state.tags.clear();
      state.updated = 'any'; state.usage = 'any'; state.search = '';
      search.value = '';
      buildSidebar();
      apply();
    }

    /* ---------------- apply + sync chrome ---------------- */
    function apply() { table.setFilters(state); syncActiveChips(); }

    var LABELS = {
      status: { active: 'Active', draft: 'Draft', deprecated: 'Deprecated' },
      updated: { '7': 'Last 7 days', '30': 'Last 30 days', '90': 'Last 90 days' },
      usage: { unused: 'Unused', low: '1–5 recipes', mid: '6–10 recipes', high: '10+ recipes' }
    };
    function catLabel(k) { return (CATS[k] || {}).label || k; }
    function matLabel(k) { return MAT[k] || k; }

    var chipsWrap = document.getElementById('activechips');
    function syncActiveChips() {
      var chips = [];
      state.category.forEach(function (v) { chips.push({ k: 'category', v: v, t: catLabel(v) }); });
      state.manufacturer.forEach(function (v) { chips.push({ k: 'manufacturer', v: v, t: v }); });
      state.status.forEach(function (v) { chips.push({ k: 'status', v: v, t: LABELS.status[v] }); });
      state.material.forEach(function (v) { chips.push({ k: 'material', v: v, t: matLabel(v) }); });
      state.tags.forEach(function (v) { chips.push({ k: 'tags', v: v, t: v }); });
      if (state.updated !== 'any') chips.push({ k: 'updated', v: state.updated, t: LABELS.updated[state.updated], single: true });
      if (state.usage !== 'any') chips.push({ k: 'usage', v: state.usage, t: LABELS.usage[state.usage], single: true });

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
    table.addEventListener('productsrender', function (e) {
      var d = e.detail;
      if (rcount) {
        rcount.innerHTML = '<b>' + d.visible + '</b> product' + (d.visible === 1 ? '' : 's')
          + (d.visible !== d.total ? ' <span style="color:var(--fg4)">of ' + d.total + '</span>' : '');
      }
      if (footnote) footnote.textContent = 'Showing ' + d.visible + ' of ' + d.total + ' products';
    });
  });
})();
