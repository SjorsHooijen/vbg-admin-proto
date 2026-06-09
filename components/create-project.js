/* ============================================================
   VBG — Create Project page logic
   Live summary, validation gating, client/address search,
   create-client modal, create flow (loading → success).
   ============================================================ */
(function () {
  'use strict';

  // ---- mock data -------------------------------------------------------
  var CLIENTS = [
    { name: 'Heijmans Vastgoed', ref: 'CLT-0042' },
    { name: 'BAM Wonen', ref: 'CLT-0108' },
    { name: 'Dura Vermeer', ref: 'CLT-0071' },
    { name: 'VolkerWessels', ref: 'CLT-0019' },
    { name: 'Synchroon', ref: 'CLT-0224' },
    { name: 'AM Real Estate', ref: 'CLT-0156' },
    { name: 'Amvest', ref: 'CLT-0188' },
    { name: 'G&S Vastgoed', ref: 'CLT-0203' }
  ];

  var ADDRESSES = [
    { line1: 'Damrak 1', line2: '1012 LG Amsterdam', country: 'Netherlands' },
    { line1: 'Coolsingel 40', line2: '3011 AD Rotterdam', country: 'Netherlands' },
    { line1: 'Stationsplein 1', line2: '3013 AJ Utrecht', country: 'Netherlands' },
    { line1: 'Spui 70', line2: '2511 BT Den Haag', country: 'Netherlands' },
    { line1: 'Markt 1', line2: '5211 JX Den Bosch', country: 'Netherlands' },
    { line1: 'Grote Markt 2', line2: '2011 RD Haarlem', country: 'Netherlands' },
    { line1: 'Heuvelstraat 12', line2: '5038 AA Tilburg', country: 'Netherlands' }
  ];

  var TYPE_ICONS = {
    'Residential': '<path d="M3 9.5 12 3l9 6.5"/><path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"/><path d="M9 21v-7h6v7"/>',
    'Commercial': '<path d="M3 21h18"/><path d="M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16"/><path d="M19 21V9a1 1 0 0 0-1-1h-3"/><path d="M9 7h2"/><path d="M9 11h2"/><path d="M9 15h2"/>',
    'Infrastructure': '<path d="M2 20h20"/><path d="M4 20V8l8-4 8 4v12"/><path d="M4 12h16"/><path d="M9 20v-5"/><path d="M15 20v-5"/>',
    'Renovation': '<path d="m15 5 4 4"/><path d="M13.4 6.6 4 16v4h4l9.4-9.4"/><path d="m18 3 3 3-2.5 2.5L15.5 5.5 18 3Z"/>',
    'Mixed-use': '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="5" rx="1"/><rect x="3" y="14" width="8" height="7" rx="1"/><rect x="13" y="11" width="8" height="10" rx="1"/>'
  };
  var TYPES = [
    { id: 'Residential',    sub: 'Housing & apartments' },
    { id: 'Commercial',     sub: 'Offices & retail' },
    { id: 'Infrastructure', sub: 'Civil & linear works' },
    { id: 'Mixed-use',      sub: 'Combined programmes' }
  ];

  var PRESETS = [
    { id: 'standard',   name: 'VBG Standard',          supplier: 'VBG', desc: 'Standard project configuration suitable for most projects.', tags: ['NEN standards', '12 templates', 'RD coord. system'] },
    { id: 'highrise',   name: 'Residential high-rise',  supplier: 'VBG', desc: 'Tuned for towers — extended level ranges and wind-load checks.', tags: ['Wind load', '18 templates', 'Extended ranges'] },
    { id: 'renovation', name: 'Renovation lite',        supplier: 'VBG', desc: 'Lightweight setup for retrofits and partial scope projects.', tags: ['Survey-first', '6 templates', 'As-built'] },
    { id: 'infra',      name: 'Infrastructure',         supplier: 'VBG', desc: 'Linear structures, ground works and civil coordinate systems.', tags: ['Civil', '9 templates', 'Geodetic'] }
  ];

  // importable sources (existing projects + org templates)
  var IMPORTS = [
    { kind: 'Project',  name: 'Westkaai Tower B',      code: 'VBG-22-WK', type: 'Residential',    client: 'BAM Wonen',     loc: 'Coolsingel 40',   preset: 'highrise' },
    { kind: 'Project',  name: 'Stationsplein Offices', code: 'VBG-23-SP', type: 'Commercial',     client: 'VolkerWessels', loc: 'Stationsplein 1', preset: 'standard' },
    { kind: 'Project',  name: 'Ring A10 Underpass',    code: 'VBG-21-RA', type: 'Infrastructure', client: 'Dura Vermeer',  loc: 'Spui 70',         preset: 'infra' },
    { kind: 'Template', name: 'Residential block',     code: '',          type: 'Residential',    client: '',              loc: '',                preset: 'standard' },
    { kind: 'Template', name: 'Mixed-use quarter',     code: '',          type: 'Mixed-use',      client: '',              loc: '',                preset: 'standard' }
  ];

  // ---- state -----------------------------------------------------------
  var state = {
    name: '', code: '', codeTaken: false, type: '',
    client: null, location: null,
    preset: ''
  };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function highlight(text, q) {
    if (!q) return esc(text);
    var i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }

  // =====================================================================
  // TYPE CARDS (advanced selectable)
  // =====================================================================
  function renderTypes() {
    var wrap = $('#type-group');
    if (!wrap) return;
    wrap.innerHTML = TYPES.map(function (t) {
      var sel = state.type === t.id ? ' sel' : '';
      return ''
        + '<button type="button" class="scard type-card' + sel + '" role="radio" aria-checked="' + (state.type === t.id) + '" data-type="' + esc(t.id) + '">'
        +   '<span class="s-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>'
        +   '<span class="t-ic"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + TYPE_ICONS[t.id] + '</svg></span>'
        +   '<span class="t-body"><span class="t-name">' + esc(t.id) + '</span><span class="t-sub">' + esc(t.sub) + '</span></span>'
        + '</button>';
    }).join('');
    wrap.querySelectorAll('.type-card').forEach(function (el) {
      el.addEventListener('click', function () {
        state.type = el.getAttribute('data-type');
        $('#f-type').classList.remove('invalid');
        renderTypes();
        update();
      });
    });
  }

  // =====================================================================
  // PRESET CARDS
  // =====================================================================
  function renderPresets() {
    var wrap = $('#preset-group');
    wrap.innerHTML = PRESETS.map(function (p) {
      var sel = state.preset === p.id ? ' sel' : '';
      var tags = (p.tags || []).map(function (t) {
        return '<span class="p-tag"><span class="ico"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>' + esc(t) + '</span>';
      }).join('');
      return ''
        + '<button type="button" class="scard preset' + sel + '" data-preset="' + p.id + '" aria-pressed="' + (state.preset === p.id) + '">'
        +   '<span class="s-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>'
        +   '<span class="p-top">'
        +     '<span class="p-mark"><img src="assets/vbg-logo-mark-filled.png" alt=""></span>'
        +     '<span class="p-main">'
        +       '<span class="p-name">' + esc(p.name) + '</span>'
        +       '<span class="p-supplier">Supplier · ' + esc(p.supplier) + '</span>'
        +     '</span>'
        +   '</span>'
        +   '<span class="p-desc">' + esc(p.desc) + '</span>'
        +   '<span class="p-meta">' + tags + '</span>'
        + '</button>';
    }).join('');
    wrap.querySelectorAll('.preset').forEach(function (el) {
      el.addEventListener('click', function () {
        state.preset = el.getAttribute('data-preset');
        renderPresets();
        update();
      });
    });
  }

  // =====================================================================
  // COMBO BOXES (client + address)
  // =====================================================================
  function setupCombo(opts) {
    var combo = $(opts.combo);
    var input = $(opts.input);
    var menu = $(opts.menu);
    var activeIdx = -1;
    var results = [];

    function close() { combo.classList.remove('open'); activeIdx = -1; }
    function open() { combo.classList.add('open'); }

    function build() {
      var q = input.value.trim();
      results = opts.filter(q);
      var html = results.map(function (item, i) {
        return opts.renderOption(item, q, i);
      }).join('');
      if (!results.length) {
        html = '<div class="opt-empty">No matches for "' + esc(q) + '"</div>';
      }
      if (opts.footer) html += opts.footer();
      menu.innerHTML = html;
      activeIdx = -1;
      menu.querySelectorAll('[data-i]').forEach(function (el) {
        el.addEventListener('mousedown', function (e) {
          e.preventDefault();
          opts.choose(results[+el.getAttribute('data-i')]);
          close();
        });
      });
      if (opts.bindFooter) opts.bindFooter(menu, close);
    }

    input.addEventListener('focus', function () { build(); open(); });
    input.addEventListener('input', function () { build(); open(); });
    input.addEventListener('keydown', function (e) {
      var items = menu.querySelectorAll('.opt');
      if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(activeIdx + 1, items.length - 1); paint(items); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = Math.max(activeIdx - 1, 0); paint(items); }
      else if (e.key === 'Enter') {
        if (activeIdx >= 0 && results[activeIdx]) { e.preventDefault(); opts.choose(results[activeIdx]); close(); }
      } else if (e.key === 'Escape') { close(); input.blur(); }
    });
    function paint(items) {
      items.forEach(function (it, i) { it.classList.toggle('active', i === activeIdx); });
    }
    document.addEventListener('mousedown', function (e) {
      if (!combo.contains(e.target)) close();
    });
    return { close: close, input: input, reset: function () { input.value = ''; } };
  }

  // ---- client combo ----
  var clientCombo = setupCombo({
    combo: '#client-combo', input: '#client-search', menu: '#client-menu',
    filter: function (q) {
      var ql = q.toLowerCase();
      return CLIENTS.filter(function (c) { return !q || c.name.toLowerCase().indexOf(ql) >= 0 || c.ref.toLowerCase().indexOf(ql) >= 0; });
    },
    renderOption: function (c, q, i) {
      return ''
        + '<button type="button" class="opt" data-i="' + i + '">'
        +   '<span class="opt-ic"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V7l9-4 9 4v14"/><path d="M3 21h18"/><path d="M9 21v-6h6v6"/><path d="M9 11h.01"/><path d="M15 11h.01"/></svg></span>'
        +   '<span class="opt-main"><span class="opt-name">' + highlight(c.name, q) + '</span><span class="opt-sub">' + highlight(c.ref, q) + '</span></span>'
        + '</button>';
    },
    footer: function () {
      return '<div class="combo-foot"><button type="button" class="inline-action" data-create-client><span class="ico"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg></span>Create client</button></div>';
    },
    bindFooter: function (menu, close) {
      var b = menu.querySelector('[data-create-client]');
      if (b) b.addEventListener('mousedown', function (e) { e.preventDefault(); close(); openClientModal(); });
    },
    choose: function (c) { state.client = c; renderClientSelected(); update(); }
  });

  function renderClientSelected() {
    var box = $('#client-selected');
    var combo = $('#client-combo');
    if (!state.client) { box.innerHTML = ''; combo.style.display = ''; return; }
    combo.style.display = 'none';
    box.innerHTML = ''
      + '<div class="selected-card">'
      +   '<span class="sc-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V7l9-4 9 4v14"/><path d="M3 21h18"/><path d="M9 21v-6h6v6"/></svg></span>'
      +   '<span class="sc-main"><span class="sc-name">' + esc(state.client.name) + '</span><span class="sc-sub">' + esc(state.client.ref) + '</span></span>'
      +   '<button class="sc-clear" id="client-clear" aria-label="Clear client"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>'
      + '</div>';
    $('#client-clear').addEventListener('click', function () {
      state.client = null; clientCombo.reset(); renderClientSelected(); update();
    });
  }

  // ---- location combo ----
  var locCombo = setupCombo({
    combo: '#loc-combo', input: '#loc-search', menu: '#loc-menu',
    filter: function (q) {
      var ql = q.toLowerCase();
      return ADDRESSES.filter(function (a) { return !q || (a.line1 + ' ' + a.line2).toLowerCase().indexOf(ql) >= 0; });
    },
    renderOption: function (a, q, i) {
      return ''
        + '<button type="button" class="opt" data-i="' + i + '">'
        +   '<span class="opt-ic"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></span>'
        +   '<span class="opt-main"><span class="opt-name">' + highlight(a.line1, q) + '</span><span class="opt-sub">' + highlight(a.line2, q) + '</span></span>'
        + '</button>';
    },
    choose: function (a) { state.location = a; renderLocSelected(); update(); }
  });

  function renderLocSelected() {
    var box = $('#loc-selected');
    var combo = $('#loc-combo');
    if (!state.location) { box.innerHTML = ''; combo.style.display = ''; return; }
    combo.style.display = 'none';
    var a = state.location;
    box.innerHTML = ''
      + '<div class="selected-card">'
      +   '<span class="sc-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></span>'
      +   '<span class="sc-main"><span class="sc-name">' + esc(a.line1) + '</span><span class="sc-sub">' + esc(a.line2) + '\n' + esc(a.country) + '</span></span>'
      +   '<button class="sc-clear" id="loc-clear" aria-label="Clear location"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>'
      + '</div>';
    $('#loc-clear').addEventListener('click', function () {
      state.location = null; locCombo.reset(); renderLocSelected(); update();
    });
  }

  // =====================================================================
  // BASIC FIELDS
  // =====================================================================
  var nameEl = $('#i-name');
  var TAKEN = ['VBG-04-NC', 'VBG-11-WK', 'VBG-07-HK', 'VBG-02-SZ', 'VBG-09-MP', 'VBG-13-SH'];

  function generateCode(name) {
    if (!name || !name.trim()) return '';
    var words = name.trim().split(/\s+/).filter(function (w) { return w.length > 0; });
    var initials = words.map(function (w) { return w[0].toUpperCase(); }).slice(0, 3).join('');
    if (!initials) return '';
    var base = 'VBG-26-' + initials;
    var code = base;
    var n = 1;
    while (TAKEN.indexOf(code.toUpperCase()) >= 0) { code = base + n; n++; }
    return code;
  }

  function updateCodeDisplay() {
    var code = generateCode(state.name);
    state.code = code;
    state.codeTaken = false;
    var el = $('#code-display');
    if (el) {
      el.textContent = code || '\u2014';
      el.classList.toggle('empty', !code);
    }
  }

  nameEl.addEventListener('input', function () {
    state.name = nameEl.value.trim();
    $('#namecount').textContent = nameEl.value.length;
    if (state.name) $('#f-name').classList.remove('invalid');
    updateCodeDisplay();
    update();
  });
  nameEl.addEventListener('blur', function () {
    $('#f-name').classList.toggle('invalid', !state.name);
  });

  // =====================================================================
  // SUMMARY + VALIDATION
  // =====================================================================
  function presetName() {
    var p = PRESETS.filter(function (x) { return x.id === state.preset; })[0];
    return p ? p.name : '—';
  }
  function setSum(key, value, filled) {
    var el = $('[data-sum="' + key + '"]');
    if (!el) return;
    el.textContent = value;
    el.classList.toggle('empty', !filled);
  }
  function isValid() {
    return !!(state.name && state.code && state.type && state.client && state.location && state.preset);
  }
  function update() {
    setSum('name', state.name || 'Not set', !!state.name);
    setSum('code', state.code || 'Not set', !!state.code);
    setSum('type', state.type || 'Not set', !!state.type);
    setSum('client', state.client ? state.client.name : 'None selected', !!state.client);
    setSum('location', state.location ? (state.location.line1 + '\n' + state.location.line2) : 'None selected', !!state.location);
    setSum('preset', state.preset ? presetName() : 'None selected', !!state.preset);

    var ok = isValid();
    $('#btn-create').disabled = !ok;
    var pill = $('#ready-pill');
    pill.classList.toggle('go', ok);
    pill.querySelector('.rtxt').textContent = ok ? 'Ready' : 'Incomplete';

    var st = $('#status-text'), lbl = $('#status-label');
    st.classList.toggle('go', ok);
    if (ok) {
      lbl.textContent = 'Project ready to create.';
      st.querySelector('.ico').innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.8 10A10 10 0 1 1 17 3.3"/><path d="m9 11 3 3L22 4"/></svg>';
    } else {
      lbl.textContent = 'Complete required information to create project.';
      st.querySelector('.ico').innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';
    }

    updateGenerated(ok);
  }

  // ---- progressive outcomes (summary row checks + step badges) ----
  function updateGenerated(ok) {
    // embedded summary row checkmarks
    var rowDone = {
      name: !!state.name,
      code: !!state.code,
      type: !!state.type,
      client: !!state.client,
      location: !!state.location,
      preset: !!state.preset
    };
    Object.keys(rowDone).forEach(function (k) {
      var row = document.querySelector('.srow[data-check="' + k + '"]');
      if (row) row.classList.toggle('done', rowDone[k]);
    });

    // step-number badges → checkmark when their section is complete
    var sectionDone = [
      !!(state.name && state.code && state.type),
      !!state.client,
      !!state.location,
      !!state.preset
    ];
    var nums = document.querySelectorAll('.card-num');
    nums.forEach(function (n, i) {
      if (i >= sectionDone.length) return;
      var complete = sectionDone[i];
      if (complete && !n.classList.contains('done')) {
        n.classList.add('done');
        n.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
      } else if (!complete && n.classList.contains('done')) {
        n.classList.remove('done');
        n.textContent = String(i + 1);
      }
    });
  }

  // =====================================================================
  // CREATE CLIENT MODAL
  // =====================================================================
  var ccCompany = $('#cc-company'), ccContact = $('#cc-contact'), ccEmail = $('#cc-email'), ccSave = $('#cc-save');
  function openClientModal() { $('#client-scrim').classList.add('open'); setTimeout(function () { ccCompany.focus(); }, 60); }
  function closeClientModal() {
    $('#client-scrim').classList.remove('open');
    ccCompany.value = ccContact.value = ccEmail.value = '';
    ccSave.disabled = true;
  }
  function ccValid() {
    return ccCompany.value.trim() && ccContact.value.trim() && /\S+@\S+\.\S+/.test(ccEmail.value.trim());
  }
  [ccCompany, ccContact, ccEmail].forEach(function (el) {
    el.addEventListener('input', function () { ccSave.disabled = !ccValid(); });
  });
  $('#cc-close').addEventListener('click', closeClientModal);
  $('#cc-cancel').addEventListener('click', closeClientModal);
  $('#client-scrim').addEventListener('mousedown', function (e) { if (e.target === this) closeClientModal(); });
  ccSave.addEventListener('click', function () {
    if (!ccValid()) return;
    var ref = 'CLT-' + String(Math.floor(300 + Math.random() * 600)).padStart(4, '0');
    var c = { name: ccCompany.value.trim(), ref: ref };
    CLIENTS.unshift(c);
    state.client = c;
    closeClientModal();
    renderClientSelected();
    update();
  });

  // =====================================================================
  // CREATE FLOW (animated progress → auto-navigate to project)
  // =====================================================================
  var STEPS = [
    'Creating project…',
    'Linking client…',
    'Configuring location…',
    'Applying preset…',
    'Finalising workspace…'
  ];
  var DETAILS_URL = '#';
  var createRAF = null, createTimers = [], creating = false;

  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function stopCreate() {
    creating = false;
    if (createRAF) { cancelAnimationFrame(createRAF); createRAF = null; }
    createTimers.forEach(function (id) { clearTimeout(id); });
    createTimers = [];
  }

  function runCreate() {
    var scrim = $('#creating-scrim');
    var ringWrap = $('#cring-wrap');
    var ring = $('#cring');
    var fill = $('#cring-fill');
    var pctEl = $('#cring-pct');
    var stepEl = $('#cr-step');
    var titleEl = $('#cr-title');

    // reset visual state
    ringWrap.classList.remove('done');
    ring.classList.remove('done');
    titleEl.textContent = 'Creating project';
    stepEl.textContent = STEPS[0];
    pctEl.textContent = '0%';

    var C = 2 * Math.PI * 64; // ring radius 64
    fill.style.transition = 'none';
    fill.style.strokeDasharray = C;
    fill.style.strokeDashoffset = C;

    scrim.classList.add('open');
    creating = true;

    var FILL_MS = 2500;   // ring fills over 2.5s
    var HOLD_MS = 500;    // success state shown for 0.5s → 3s total
    var start = null;
    var lastStep = -1;
    var finished = false;

    // rAF drives the smooth ring fill + percentage when the page is visible
    function frame(ts) {
      if (!creating || finished) return;
      if (start === null) start = ts;
      var raw = Math.min((ts - start) / FILL_MS, 1);
      var eased = easeInOut(raw);
      fill.style.strokeDashoffset = C * (1 - eased);
      pctEl.textContent = Math.round(eased * 100) + '%';

      var si = Math.min(Math.floor(raw * STEPS.length), STEPS.length - 1);
      if (si !== lastStep) {
        lastStep = si;
        stepEl.classList.add('swap');
        var t = setTimeout(function () {
          stepEl.textContent = STEPS[si];
          stepEl.classList.remove('swap');
        }, 120);
        createTimers.push(t);
        $('#cr-live').textContent = STEPS[si];
      }

      if (raw < 1) createRAF = requestAnimationFrame(frame);
    }

    function completeCreate() {
      if (!creating || finished) return;
      finished = true;
      if (createRAF) { cancelAnimationFrame(createRAF); createRAF = null; }
      // snap the ring closed in case rAF was throttled
      fill.style.transition = 'stroke-dashoffset 240ms var(--ease-out), stroke 240ms var(--ease-out)';
      fill.style.strokeDashoffset = 0;
      pctEl.textContent = '100%';
      ringWrap.classList.add('done');
      ring.classList.add('done');
      titleEl.textContent = 'Project ready';
      stepEl.classList.add('swap');
      var t1 = setTimeout(function () {
        stepEl.textContent = 'Opening ' + (state.name || 'project') + '…';
        stepEl.classList.remove('swap');
      }, 120);
      createTimers.push(t1);
      $('#cr-live').textContent = 'Project ready. Opening project.';

      var t2 = setTimeout(function () {
        if (!creating) return;
        window.location.href = DETAILS_URL;
      }, HOLD_MS);
      createTimers.push(t2);
    }

    // Timer-based guarantees — fire even if rAF is throttled (hidden tab):
    // ring completion at FILL_MS, navigation at FILL_MS + HOLD_MS (= 3s total).
    createTimers.push(setTimeout(completeCreate, FILL_MS));
    createRAF = requestAnimationFrame(frame);
  }

  function cancelCreate() {
    stopCreate();
    $('#creating-scrim').classList.remove('open');
    $('#cr-live').textContent = 'Project creation cancelled.';
  }

  // =====================================================================
  // IMPORT PROJECT INFORMATION
  // =====================================================================
  var imSelected = null;
  function openImport() {
    imSelected = null;
    $('#im-search').value = '';
    $('#im-apply').disabled = true;
    renderImportList('');
    $('#import-scrim').classList.add('open');
    setTimeout(function () { $('#im-search').focus(); }, 60);
  }
  function closeImport() { $('#import-scrim').classList.remove('open'); }

  function renderImportList(q) {
    var ql = (q || '').toLowerCase();
    var list = IMPORTS.filter(function (s) {
      return !ql || s.name.toLowerCase().indexOf(ql) >= 0 || (s.code && s.code.toLowerCase().indexOf(ql) >= 0) || s.type.toLowerCase().indexOf(ql) >= 0;
    });
    var box = $('#im-list');
    if (!list.length) { box.innerHTML = '<div class="im-empty">No projects or templates match “' + esc(q) + '”.</div>'; return; }
    box.innerHTML = list.map(function (s) {
      var idx = IMPORTS.indexOf(s);
      var meta = [s.code || 'No code', s.type].concat(s.client ? [s.client] : []).map(esc);
      var sel = imSelected === idx ? ' sel' : '';
      var glyph = s.kind === 'Template'
        ? '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'
        : '<path d="M4 20V8.5a1 1 0 0 1 .4-.8l6-4.5a1 1 0 0 1 1.2 0l6 4.5a1 1 0 0 1 .4.8V20"/><path d="M3 20h18"/>';
      return ''
        + '<button type="button" class="im-opt' + sel + '" data-idx="' + idx + '">'
        +   '<span class="im-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + glyph + '</svg></span>'
        +   '<span class="im-main"><span class="im-name">' + esc(s.name) + '</span>'
        +     '<span class="im-meta">' + meta.map(function (m, i) { return (i ? '<span class="im-dot"></span>' : '') + '<span>' + m + '</span>'; }).join('') + '</span></span>'
        +   '<span class="im-kind">' + esc(s.kind) + '</span>'
        +   '<span class="im-rad"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>'
        + '</button>';
    }).join('');
    box.querySelectorAll('.im-opt').forEach(function (el) {
      el.addEventListener('click', function () {
        imSelected = +el.getAttribute('data-idx');
        renderImportList($('#im-search').value.trim());
        $('#im-apply').disabled = false;
      });
    });
  }

  function applyImport() {
    if (imSelected == null) return;
    var s = IMPORTS[imSelected];
    // name + code: append a fresh suffix for templates / give code a unique-ish bump
    state.name = s.name + (s.kind === 'Template' ? ' (copy)' : '');
    nameEl.value = state.name;
    $('#namecount').textContent = state.name.length;
    updateCodeDisplay();
    state.type = s.type;
    state.preset = s.preset || state.preset;
    state.client = s.client ? (CLIENTS.filter(function (c) { return c.name === s.client; })[0] || null) : null;
    state.location = s.loc ? (ADDRESSES.filter(function (a) { return a.line1 === s.loc; })[0] || null) : null;
    if (s.client) clientCombo.input.value = '';
    if (s.loc) locCombo.input.value = '';
    $('#f-name').classList.remove('invalid');
    $('#f-type').classList.remove('invalid');
    renderTypes();
    renderPresets();
    renderClientSelected();
    renderLocSelected();
    closeImport();
    update();
  }
  function bumpCode(code) {
    // VBG-22-WK → VBG-26-WK (next available-ish); just ensure not in TAKEN
    var out = code;
    var m = code.match(/^(VBG-)(\d{2})(-.+)$/);
    if (m) {
      var yr = 26;
      out = m[1] + yr + m[3];
      while (TAKEN.indexOf(out.toUpperCase()) >= 0) { yr++; out = m[1] + yr + m[3]; }
    }
    return out;
  }

  $('#btn-import').addEventListener('click', openImport);
  $('#im-close').addEventListener('click', closeImport);
  $('#im-cancel').addEventListener('click', closeImport);
  $('#im-apply').addEventListener('click', applyImport);
  $('#im-search').addEventListener('input', function () { renderImportList(this.value.trim()); });
  $('#import-scrim').addEventListener('mousedown', function (e) { if (e.target === this) closeImport(); });

  $('#btn-create').addEventListener('click', function () {
    if (isValid()) runCreate();
  });
  $('#cr-cancel').addEventListener('click', cancelCreate);
  $('#btn-cancel').addEventListener('click', function () { window.location.href = 'Projects.html'; });
  $('#su-open').addEventListener('click', function () { window.location.href = '#'; });
  $('#su-back').addEventListener('click', function () { window.location.href = 'Projects.html'; });
  $('#su-another').addEventListener('click', function () { window.location.reload(); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if ($('#creating-scrim').classList.contains('open')) cancelCreate();
      else if ($('#import-scrim').classList.contains('open')) closeImport();
      else if ($('#client-scrim').classList.contains('open')) closeClientModal();
    }
  });

  // ---- init ----
  renderTypes();
  renderPresets();
  renderClientSelected();
  renderLocSelected();
  update();
})();
