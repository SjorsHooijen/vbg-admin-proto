/* ============================================================
   VBG — Create Recipe page logic
   Identity · classification · starting point · outputs.
   Live summary, validation gating, duplicate-recipe search,
   create flow (animated progress → success).
   Reads category + recipe data from window.VBG_RECIPES and
   output types from window.VBG_RECIPE_DETAIL.ALL_OUTPUTS.
   ============================================================ */
(function () {
  'use strict';
  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  ready(function () {
    var R = window.VBG_RECIPES;
    var RD = window.VBG_RECIPE_DETAIL;
    if (!R || !RD) return;

    var CATS = R.CATEGORIES;
    var ALL_OUTPUTS = RD.ALL_OUTPUTS;

    /* category → discipline + one-line subtitle */
    var DISCIPLINE = {
      structural: 'Structural engineering',
      facade:     'Façade engineering',
      mep:        'MEP engineering',
      production: 'Production engineering',
      geometry:  'Geometry & topology'
    };
    var CAT_SUB = {
      structural: 'Grids, members & cores',
      facade:     'Envelope & panels',
      mep:        'Services & risers',
      production: 'DfMA & modules',
      geometry:  'Topology & footprint'
    };
    /* sensible default output sets per category (mirrors recipe-detail) */
    var DEF_OUTPUTS = {
      structural: ['building', 'calcs', 'drawings', 'bom', 'metadata'],
      facade:     ['building', 'product', 'drawings', 'bom', 'metadata'],
      mep:        ['building', 'calcs', 'drawings', 'metadata'],
      production: ['module', 'product', 'drawings', 'bom', 'metadata'],
      geometry:   ['building', 'drawings', 'metadata']
    };
    var SUGGESTED_TAGS = ['concrete', 'prefab', 'NEN-EN', 'envelope', 'services', 'stability', 'steel', 'high-rise'];

    var START = [
      { id: 'blank',    name: 'Blank recipe', sub: 'blank template',
        desc: 'Start with an empty structure and build everything from scratch.',
        glyph: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 12v6"/><path d="M9 15h6"/>' },
      { id: 'baseline', name: 'Platform baseline', sub: 'platform baseline',
        desc: 'Begin from the VBG baseline structure for the chosen category.',
        glyph: '<path d="M4 20V8.5a1 1 0 0 1 .4-.8l6-4.5a1 1 0 0 1 1.2 0l6 4.5a1 1 0 0 1 .4.8V20"/><path d="M3 20h18"/><path d="M9 20v-5h6v5"/>' },
      { id: 'duplicate', name: 'Duplicate recipe', sub: 'duplicated recipe',
        desc: 'Copy an existing recipe’s structure, rules and parameters.',
        glyph: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>' }
    ];

    /* ---- state ---- */
    var state = {
      name: '', code: '', desc: '',
      category: '', owner: 'company', tags: [],
      start: '', dupRecipe: null,
      outputs: [], outputsTouched: false
    };

    var $ = function (s, r) { return (r || document).querySelector(s); };
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function ico(path, size) { size = size || 16; return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>'; }
    function highlight(text, q) {
      if (!q) return esc(text);
      var i = text.toLowerCase().indexOf(q.toLowerCase());
      if (i < 0) return esc(text);
      return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
    }

    /* =================================================================
       CATEGORY CARDS
       ================================================================= */
    function renderCats() {
      var wrap = $('#cat-group');
      wrap.innerHTML = Object.keys(CATS).map(function (k) {
        var c = CATS[k];
        var sel = state.category === k ? ' sel' : '';
        return '<button type="button" class="scard cat-card' + sel + '" role="radio" aria-checked="' + (state.category === k) + '" data-cat="' + k + '">'
          + '<span class="s-check">' + ico('<path d="M20 6 9 17l-5-5"/>', 12) + '</span>'
          + '<span class="c-ic">' + ico(c.glyph, 19) + '</span>'
          + '<span class="c-body"><span class="c-name">' + esc(c.label) + '</span><span class="c-sub">' + esc(CAT_SUB[k] || '') + '</span></span>'
          + '</button>';
      }).join('');
      wrap.querySelectorAll('.cat-card').forEach(function (el) {
        el.addEventListener('click', function () {
          state.category = el.getAttribute('data-cat');
          $('#f-cat').classList.remove('invalid');
          // suggest default outputs unless the user has manually edited them
          if (!state.outputsTouched) state.outputs = (DEF_OUTPUTS[state.category] || []).slice();
          renderCats();
          renderDiscipline();
          renderOutputs();
          update();
        });
      });
    }
    function renderDiscipline() {
      var val = $('#discipline-val');
      var d = DISCIPLINE[state.category];
      val.textContent = d || 'Set by category';
      val.classList.toggle('empty', !d);
    }

    /* =================================================================
       OWNER SEGMENTED CONTROL
       ================================================================= */
    var ownerSeg = $('#owner-seg');
    ownerSeg.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-owner]'); if (!b) return;
      state.owner = b.getAttribute('data-owner');
      ownerSeg.querySelectorAll('button').forEach(function (x) {
        var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on);
      });
      update();
    });

    /* =================================================================
       TAGS
       ================================================================= */
    var tagInput = $('#tag-input');
    var tagEdit = $('#tag-edit');
    function renderTags() {
      tagEdit.querySelectorAll('.tg').forEach(function (el) { el.remove(); });
      state.tags.forEach(function (t) {
        var s = document.createElement('span');
        s.className = 'tg';
        s.innerHTML = esc(t) + '<button type="button" aria-label="Remove tag">' + ico('<path d="M18 6 6 18M6 6l12 12"/>', 11) + '</button>';
        s.querySelector('button').addEventListener('click', function () {
          state.tags = state.tags.filter(function (x) { return x !== t; });
          renderTags(); renderTagSugs(); update();
        });
        tagEdit.insertBefore(s, tagInput);
      });
    }
    function addTag(raw) {
      var t = (raw || '').trim().replace(/^#/, '');
      if (!t) return;
      if (state.tags.indexOf(t) >= 0 || state.tags.length >= 8) return;
      state.tags.push(t);
      renderTags(); renderTagSugs(); update();
    }
    tagInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput.value); tagInput.value = ''; }
      else if (e.key === 'Backspace' && !tagInput.value && state.tags.length) {
        state.tags.pop(); renderTags(); renderTagSugs(); update();
      }
    });
    tagInput.addEventListener('blur', function () { if (tagInput.value.trim()) { addTag(tagInput.value); tagInput.value = ''; } });
    function renderTagSugs() {
      var wrap = $('#tag-sugs');
      wrap.innerHTML = SUGGESTED_TAGS.map(function (t) {
        var used = state.tags.indexOf(t) >= 0;
        return '<button type="button" class="tag-sug' + (used ? ' used' : '') + '" data-t="' + esc(t) + '">+ ' + esc(t) + '</button>';
      }).join('');
      wrap.querySelectorAll('.tag-sug').forEach(function (el) {
        el.addEventListener('click', function () { addTag(el.getAttribute('data-t')); });
      });
    }

    /* =================================================================
       STARTING POINT CARDS + DUPLICATE COMBO
       ================================================================= */
    function renderStart() {
      var wrap = $('#start-group');
      wrap.innerHTML = START.map(function (s) {
        var sel = state.start === s.id ? ' sel' : '';
        return '<button type="button" class="scard start-card' + sel + '" data-start="' + s.id + '" aria-pressed="' + (state.start === s.id) + '">'
          + '<span class="s-check">' + ico('<path d="M20 6 9 17l-5-5"/>', 12) + '</span>'
          + '<span class="sp-ic">' + ico(s.glyph, 20) + '</span>'
          + '<span class="sp-name">' + esc(s.name) + '</span>'
          + '<span class="sp-desc">' + esc(s.desc) + '</span>'
          + '</button>';
      }).join('');
      wrap.querySelectorAll('.start-card').forEach(function (el) {
        el.addEventListener('click', function () {
          state.start = el.getAttribute('data-start');
          $('#f-start').classList.remove('invalid');
          if (state.start !== 'duplicate') state.dupRecipe = null;
          renderStart();
          syncDupReveal();
          update();
        });
      });
    }
    function syncDupReveal() {
      var rev = $('#dup-reveal');
      rev.classList.toggle('show', state.start === 'duplicate');
      if (state.start === 'duplicate' && !state.dupRecipe) {
        setTimeout(function () { $('#dup-search').focus(); }, 80);
      }
    }

    /* duplicate combo */
    (function setupDupCombo() {
      var combo = $('#dup-combo'), input = $('#dup-search'), menu = $('#dup-menu');
      var activeIdx = -1, results = [];
      function close() { combo.classList.remove('open'); activeIdx = -1; }
      function open() { combo.classList.add('open'); }
      function build() {
        var q = input.value.trim(), ql = q.toLowerCase();
        results = R.DATA.filter(function (r) {
          if (r.status === 'archived') return false;
          if (!q) return true;
          return (r.name + ' ' + r.code + ' ' + r.tags.join(' ')).toLowerCase().indexOf(ql) >= 0;
        });
        var html = results.map(function (r, i) {
          var cat = CATS[r.category] || { label: r.category, glyph: '' };
          return '<button type="button" class="opt" data-i="' + i + '">'
            + '<span class="opt-ic">' + ico(cat.glyph, 17) + '</span>'
            + '<span class="opt-main"><span class="opt-name">' + highlight(r.name, q) + '</span>'
            + '<span class="opt-sub">' + highlight(r.code, q) + ' · ' + esc(r.version) + '</span></span>'
            + '<span class="opt-cat">' + esc(cat.label) + '</span>'
            + '</button>';
        }).join('');
        if (!results.length) html = '<div class="opt-empty">No recipes match “' + esc(q) + '”</div>';
        menu.innerHTML = html;
        activeIdx = -1;
        menu.querySelectorAll('[data-i]').forEach(function (el) {
          el.addEventListener('mousedown', function (e) { e.preventDefault(); choose(results[+el.getAttribute('data-i')]); close(); });
        });
      }
      function choose(r) {
        state.dupRecipe = r;
        // adopt category + outputs from the source recipe
        if (!state.category) { state.category = r.category; renderCats(); renderDiscipline(); }
        if (!state.outputsTouched) { state.outputs = (DEF_OUTPUTS[r.category] || []).slice(); renderOutputs(); }
        renderDupSelected();
        update();
      }
      input.addEventListener('focus', function () { build(); open(); });
      input.addEventListener('input', function () { build(); open(); });
      input.addEventListener('keydown', function (e) {
        var items = menu.querySelectorAll('.opt');
        if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(activeIdx + 1, items.length - 1); paint(items); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = Math.max(activeIdx - 1, 0); paint(items); }
        else if (e.key === 'Enter') { if (activeIdx >= 0 && results[activeIdx]) { e.preventDefault(); choose(results[activeIdx]); close(); } }
        else if (e.key === 'Escape') { close(); input.blur(); }
      });
      function paint(items) { items.forEach(function (it, i) { it.classList.toggle('active', i === activeIdx); }); }
      document.addEventListener('mousedown', function (e) { if (!combo.contains(e.target)) close(); });
      window._dupReset = function () { input.value = ''; };
    })();

    function renderDupSelected() {
      var box = $('#dup-selected'), combo = $('#dup-combo');
      if (!state.dupRecipe) { box.innerHTML = ''; combo.style.display = ''; return; }
      var r = state.dupRecipe, cat = CATS[r.category] || { label: r.category, glyph: '' };
      combo.style.display = 'none';
      box.innerHTML = '<div class="selected-card">'
        + '<span class="sc-ic">' + ico(cat.glyph, 18) + '</span>'
        + '<span class="sc-main"><span class="sc-name">' + esc(r.name) + '</span>'
        + '<span class="sc-sub">' + esc(r.code) + ' · ' + esc(cat.label) + ' · ' + esc(r.version) + '</span></span>'
        + '<button class="sc-clear" id="dup-clear" aria-label="Clear">' + ico('<path d="M18 6 6 18M6 6l12 12"/>', 16) + '</button>'
        + '</div>';
      $('#dup-clear').addEventListener('click', function () {
        state.dupRecipe = null; window._dupReset(); renderDupSelected(); update();
      });
    }

    /* =================================================================
       OUTPUTS GRID
       ================================================================= */
    function renderOutputs() {
      var grid = $('#out-grid');
      grid.innerHTML = ALL_OUTPUTS.map(function (o) {
        var on = state.outputs.indexOf(o.key) >= 0;
        return '<button type="button" class="out-card' + (on ? ' on' : '') + '" data-key="' + o.key + '">'
          + '<span class="oc-ico">' + ico(o.glyph, 18) + '</span>'
          + '<span class="oc-txt"><span class="oc-lb">' + esc(o.label) + '</span>'
          + '<span class="oc-st">' + (on ? 'Generated' : 'Not generated') + '</span></span>'
          + '<span class="oc-toggle"></span></button>';
      }).join('');
      grid.querySelectorAll('.out-card').forEach(function (el) {
        el.addEventListener('click', function () {
          state.outputsTouched = true;
          var key = el.getAttribute('data-key');
          var idx = state.outputs.indexOf(key);
          if (idx >= 0) state.outputs.splice(idx, 1); else state.outputs.push(key);
          renderOutputs(); update();
        });
      });
      var note = $('#out-note');
      if (!state.category) note.textContent = 'Select a category to suggest a default set.';
      else note.textContent = state.outputs.length + ' of ' + ALL_OUTPUTS.length + ' artefact types selected.';
    }

    /* =================================================================
       NAME + CODE + DESCRIPTION
       ================================================================= */
    var nameEl = $('#i-name'), descEl = $('#i-desc');
    var TAKEN = R.DATA.map(function (r) { return r.code; });
    var nextSeq = 75;
    function generateCode() {
      if (!state.name.trim()) return '';
      var code, n = nextSeq;
      do { code = 'RCP-' + String(n).padStart(3, '0'); n++; } while (TAKEN.indexOf(code) >= 0);
      return code;
    }
    function updateCode() {
      state.code = generateCode();
      var el = $('#code-display');
      $('.cd-val', el).textContent = state.code || '—';
      el.classList.toggle('empty', !state.code);
    }
    nameEl.addEventListener('input', function () {
      state.name = nameEl.value.trim();
      $('#namecount').textContent = nameEl.value.length;
      if (state.name) $('#f-name').classList.remove('invalid');
      updateCode(); update();
    });
    nameEl.addEventListener('blur', function () { $('#f-name').classList.toggle('invalid', !state.name); });
    descEl.addEventListener('input', function () {
      state.desc = descEl.value.trim();
      $('#desccount').textContent = descEl.value.length;
    });

    /* =================================================================
       SUMMARY + VALIDATION
       ================================================================= */
    function setSum(key, value, filled) {
      var el = $('[data-sum="' + key + '"]'); if (!el) return;
      el.textContent = value; el.classList.toggle('empty', !filled);
    }
    function startLabel() {
      if (!state.start) return null;
      var s = START.filter(function (x) { return x.id === state.start; })[0];
      if (state.start === 'duplicate') return state.dupRecipe ? 'Duplicate · ' + state.dupRecipe.name : 'Duplicate (pick recipe)';
      return s ? s.name : null;
    }
    function startDone() {
      if (state.start === 'duplicate') return !!state.dupRecipe;
      return !!state.start;
    }
    function isValid() {
      return !!(state.name && state.code && state.category && startDone() && state.outputs.length > 0);
    }

    function update() {
      setSum('name', state.name || 'Not set', !!state.name);
      setSum('code', state.code || 'Not set', !!state.code);
      setSum('category', state.category ? CATS[state.category].label : 'Not set', !!state.category);
      setSum('discipline', state.category ? DISCIPLINE[state.category] : '—', !!state.category);
      setSum('owner', state.owner === 'vbg' ? 'VBG platform' : 'Company', true);
      setSum('tags', state.tags.length ? state.tags.map(function (t) { return '#' + t; }).join('  ') : 'None', state.tags.length > 0);
      var sl = startLabel();
      setSum('start', sl || 'Not chosen', startDone());
      setSum('outputs', state.outputs.length ? (state.outputs.length + ' artefact' + (state.outputs.length === 1 ? '' : 's')) : 'None selected', state.outputs.length > 0);

      var ok = isValid();
      $('#btn-create').disabled = !ok;
      var pill = $('#ready-pill');
      pill.classList.toggle('go', ok);
      pill.querySelector('.rtxt').textContent = ok ? 'Ready' : 'Incomplete';

      var st = $('#status-text'), lbl = $('#status-label');
      st.classList.toggle('go', ok);
      if (ok) {
        lbl.textContent = 'Recipe ready to create.';
        st.querySelector('.ico').innerHTML = ico('<path d="M21.8 10A10 10 0 1 1 17 3.3"/><path d="m9 11 3 3L22 4"/>', 17);
      } else {
        lbl.textContent = 'Complete required fields to create the recipe.';
        st.querySelector('.ico').innerHTML = ico('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>', 17);
      }
      updateChecks();
    }

    function updateChecks() {
      var rowDone = {
        name: !!state.name, code: !!state.code,
        category: !!state.category, start: startDone(),
        outputs: state.outputs.length > 0
      };
      Object.keys(rowDone).forEach(function (k) {
        var row = document.querySelector('.srow[data-check="' + k + '"]');
        if (row) row.classList.toggle('done', rowDone[k]);
      });
      var sectionDone = [
        !!(state.name && state.code),
        !!state.category,
        startDone(),
        state.outputs.length > 0
      ];
      document.querySelectorAll('.card-num').forEach(function (n, i) {
        if (i >= sectionDone.length) return;
        var complete = sectionDone[i];
        if (complete && !n.classList.contains('done')) {
          n.classList.add('done');
          n.innerHTML = ico('<path d="M20 6 9 17l-5-5"/>', 13);
        } else if (!complete && n.classList.contains('done')) {
          n.classList.remove('done'); n.textContent = String(i + 1);
        }
      });
    }

    /* =================================================================
       CREATE FLOW (animated → success)
       ================================================================= */
    var STEPS = ['Registering recipe…', 'Assigning code…', 'Scaffolding structure…', 'Linking parameters…', 'Configuring outputs…'];
    var createRAF = null, createTimers = [], creating = false;
    function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
    function stopCreate() {
      creating = false;
      if (createRAF) { cancelAnimationFrame(createRAF); createRAF = null; }
      createTimers.forEach(function (id) { clearTimeout(id); }); createTimers = [];
    }
    function runCreate() {
      var scrim = $('#creating-scrim'), ringWrap = $('#cring-wrap'), ring = $('#cring'),
          fill = $('#cring-fill'), pctEl = $('#cring-pct'), stepEl = $('#cr-step'), titleEl = $('#cr-title');
      ringWrap.classList.remove('done'); ring.classList.remove('done');
      titleEl.textContent = 'Creating recipe'; stepEl.textContent = STEPS[0]; pctEl.textContent = '0%';
      var C = 2 * Math.PI * 64;
      fill.style.transition = 'none'; fill.style.strokeDasharray = C; fill.style.strokeDashoffset = C;
      scrim.classList.add('open'); creating = true;
      var FILL_MS = 2400, HOLD_MS = 480, start = null, lastStep = -1, finished = false;

      function frame(ts) {
        if (!creating || finished) return;
        if (start === null) start = ts;
        var raw = Math.min((ts - start) / FILL_MS, 1), eased = easeInOut(raw);
        fill.style.strokeDashoffset = C * (1 - eased);
        pctEl.textContent = Math.round(eased * 100) + '%';
        var si = Math.min(Math.floor(raw * STEPS.length), STEPS.length - 1);
        if (si !== lastStep) {
          lastStep = si; stepEl.classList.add('swap');
          createTimers.push(setTimeout(function () { stepEl.textContent = STEPS[si]; stepEl.classList.remove('swap'); }, 120));
          $('#cr-live').textContent = STEPS[si];
        }
        if (raw < 1) createRAF = requestAnimationFrame(frame);
      }
      function complete() {
        if (!creating || finished) return; finished = true;
        if (createRAF) { cancelAnimationFrame(createRAF); createRAF = null; }
        fill.style.transition = 'stroke-dashoffset 240ms var(--ease-out), stroke 240ms var(--ease-out)';
        fill.style.strokeDashoffset = 0; pctEl.textContent = '100%';
        ringWrap.classList.add('done'); ring.classList.add('done');
        titleEl.textContent = 'Recipe ready';
        stepEl.classList.add('swap');
        createTimers.push(setTimeout(function () { stepEl.textContent = 'Finalising…'; stepEl.classList.remove('swap'); }, 120));
        $('#cr-live').textContent = 'Recipe ready.';
        createTimers.push(setTimeout(function () { if (!creating) return; showSuccess(); }, HOLD_MS));
      }
      createTimers.push(setTimeout(complete, FILL_MS));
      createRAF = requestAnimationFrame(frame);
    }
    function cancelCreate() { stopCreate(); $('#creating-scrim').classList.remove('open'); $('#cr-live').textContent = 'Recipe creation cancelled.'; }

    function showSuccess() {
      $('#creating-scrim').classList.remove('open');
      $('[data-su="name"]').textContent = state.name || '—';
      $('[data-su="code"]').textContent = state.code || '—';
      $('[data-su="category"]').textContent = state.category ? CATS[state.category].label : '—';
      $('#success-scrim').classList.add('open');
    }

    /* recipe code to open in the detail editor: the duplicated recipe if any,
       else a representative recipe of the chosen category, else first recipe. */
    function openCode() {
      if (state.dupRecipe) return state.dupRecipe.code;
      var sameCat = R.DATA.filter(function (r) { return r.category === state.category; })[0];
      return (sameCat || R.DATA[0]).code;
    }

    /* ---- buttons ---- */
    $('#btn-create').addEventListener('click', function () { if (isValid()) runCreate(); });
    $('#cr-cancel').addEventListener('click', cancelCreate);
    $('#btn-cancel').addEventListener('click', function () { window.location.href = 'Recipes.html'; });
    $('#su-open').addEventListener('click', function () { window.location.href = 'RecipeDetail.html?r=' + encodeURIComponent(openCode()) + '#general'; });
    $('#su-back').addEventListener('click', function () { window.location.href = 'Recipes.html'; });
    $('#su-another').addEventListener('click', function () { window.location.reload(); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && $('#creating-scrim').classList.contains('open')) cancelCreate();
    });

    /* ---- init ---- */
    renderCats();
    renderDiscipline();
    renderTags();
    renderTagSugs();
    renderStart();
    syncDupReveal();
    renderOutputs();
    update();
  });
})();
