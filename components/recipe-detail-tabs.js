/* ============================================================
   VBG — Recipe detail · tab renderers
   Exposes window.RecipeDetailTabs[tabId] = { render(detail), wire(root, detail, ctx) }
   ctx = { rerenderTab(), recipe, detail }
   ============================================================ */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function ico(path, size) {
    size = size || 16;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }
  function initials(name) {
    var p = String(name).trim().split(/\s+/);
    return ((p[0] || '')[0] || '') + ((p[1] || '')[0] || '');
  }

  var I = {
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    up: '<path d="m18 15-6-6-6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    chev: '<path d="m9 6 6 6-6 6"/>',
    grip: '<circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/>',
    expand: '<path d="m21 21-6-6"/><path d="M3 3l6 6"/><path d="M3 9V3h6"/><path d="M21 15v6h-6"/>',
    collapse: '<path d="M9 9 3 3"/><path d="M15 15l6 6"/><path d="M9 3v6H3"/><path d="M21 15h-6v6"/>',
    arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/>'
  };
  // node type glyphs
  var TYPE_GLYPH = {
    'Building': '<path d="M4 20V8.5a1 1 0 0 1 .4-.8l6-4.5a1 1 0 0 1 1.2 0l6 4.5a1 1 0 0 1 .4.8V20"/><path d="M3 20h18"/>',
    'Building part': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/>',
    'Level range': '<path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/>',
    'Zone': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
    'System': '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
    'Building block': '<rect x="4" y="4" width="16" height="16" rx="1"/>'
  };
  function typeGlyph(t) { return TYPE_GLYPH[t] || TYPE_GLYPH['Building block']; }

  /* ============================================================
     GENERAL
     ============================================================ */
  function field(k, body, opts) {
    opts = opts || {};
    return '<div class="field-row"><div class="fk">' + esc(k) + (opts.req ? '<span class="req">*</span>' : '') + '</div>'
      + '<div class="fv">' + body + (opts.help ? '<div class="fhelp">' + esc(opts.help) + '</div>' : '') + '</div></div>';
  }
  var LIFECYCLE = [
    { v: 'draft', t: 'Draft', d: 'Editable, not available to projects.' },
    { v: 'active', t: 'Active', d: 'Published and usable in generation.' },
    { v: 'deprecated', t: 'Deprecated', d: 'Still resolvable, discouraged for new use.' },
    { v: 'archived', t: 'Archived', d: 'Retired from the library.' }
  ];

  window.RecipeDetailTabs = {};

  window.RecipeDetailTabs.general = {
    render: function (d) {
      var r = d.recipe, g = d.general, CATS = window.VBG_RECIPES.CATEGORIES;
      var catOpts = Object.keys(CATS).map(function (k) {
        return '<option value="' + k + '"' + (k === r.category ? ' selected' : '') + '>' + esc(CATS[k].label) + '</option>';
      }).join('');
      var tags = r.tags.map(function (t) {
        return '<span class="tg" data-tag="' + esc(t) + '">' + esc(t) + '<button aria-label="Remove tag">' + ico('<path d="M18 6 6 18M6 6l12 12"/>', 11) + '</button></span>';
      }).join('');
      var lc = LIFECYCLE.map(function (o) {
        return '<button class="lc-opt' + (o.v === g.lifecycle ? ' on' : '') + '" data-lc="' + o.v + '">'
          + '<span class="lc-radio"></span><span class="lc-txt"><span class="lt">' + o.t + '</span><span class="ld">' + o.d + '</span></span></button>';
      }).join('');

      return '<div class="rd-pane">'
        + '<div class="rd-pane-head"><div><h2>General</h2><p>Recipe metadata — identity, classification, ownership and lifecycle state.</p></div></div>'
        + '<div class="gform">'
        // Identity
        + '<div class="card span2"><div class="card-hd"><span class="ovl">Identity</span></div>'
        +   field('Name', '<input class="inp" value="' + esc(r.name) + '">', { req: true })
        +   field('Code', '<input class="inp" value="' + esc(r.code) + '" style="font-family:var(--font-mono)" readonly>', { help: 'System identifier — assigned on creation and immutable.' })
        +   field('Description', '<textarea class="inp">' + esc(r.desc) + '</textarea>')
        + '</div>'
        // Classification
        + '<div class="card"><div class="card-hd"><span class="ovl">Classification</span></div>'
        +   field('Category', '<select class="inp">' + catOpts + '</select>', { req: true })
        +   field('Discipline', '<input class="inp" value="' + esc(g.discipline) + '">')
        +   field('Tags', '<div class="tag-edit" id="tag-edit">' + tags + '<button class="tg-add" id="tag-add">+ Add tag</button></div>')
        + '</div>'
        // Ownership
        + '<div class="card"><div class="card-hd"><span class="ovl">Ownership</span></div>'
        +   field('Created by', '<input class="inp" value="' + esc(g.createdBy) + '">')
        +   field('Owner', '<select class="inp"><option' + (g.owner.indexOf('VBG') === 0 ? ' selected' : '') + '>VBG (platform)</option><option' + (g.owner === 'Company' ? ' selected' : '') + '>Company</option></select>')
        +   field('Team', '<input class="inp" value="' + esc(g.team) + '">')
        + '</div>'
        // Lifecycle
        + '<div class="card span2"><div class="card-hd"><span class="ovl">Lifecycle</span><span class="hint">Controls availability to projects</span></div>'
        +   '<div class="lifecycle" id="lifecycle">' + lc + '</div>'
        + '</div>'
        + '</div></div>';
    },
    wire: function (root, d) {
      var lc = root.querySelector('#lifecycle');
      if (lc) lc.addEventListener('click', function (e) {
        var b = e.target.closest('.lc-opt'); if (!b) return;
        lc.querySelectorAll('.lc-opt').forEach(function (o) { o.classList.remove('on'); });
        b.classList.add('on');
        d.general.lifecycle = b.getAttribute('data-lc');
      });
      var te = root.querySelector('#tag-edit');
      if (te) te.addEventListener('click', function (e) {
        var add = e.target.closest('#tag-add');
        if (add) {
          var name = prompt('New tag');
          if (name) { var s = document.createElement('span'); s.className = 'tg'; s.setAttribute('data-tag', name);
            s.innerHTML = esc(name) + '<button aria-label="Remove tag">' + ico('<path d="M18 6 6 18M6 6l12 12"/>', 11) + '</button>';
            te.insertBefore(s, add); }
          return;
        }
        var rm = e.target.closest('.tg button');
        if (rm) rm.closest('.tg').remove();
      });
    }
  };

  /* ============================================================
     STRUCTURE — tree + properties
     ============================================================ */
  function cloneTree(n) {
    return { id: n.id, name: n.name, type: n.type, open: n.open !== false,
      configRefs: (n.configRefs || []).slice(), params: (n.params || []).slice(),
      children: (n.children || []).map(cloneTree) };
  }
  function findNode(n, id) {
    if (n.id === id) return n;
    for (var i = 0; i < n.children.length; i++) { var f = findNode(n.children[i], id); if (f) return f; }
    return null;
  }
  function findParent(n, id, parent) {
    if (n.id === id) return parent;
    for (var i = 0; i < n.children.length; i++) { var f = findParent(n.children[i], id, n); if (f !== undefined) return f; }
    return undefined;
  }

  window.RecipeDetailTabs.structure = {
    render: function (d) {
      return '<div class="rd-pane full">'
        + '<div class="rd-pane-head"><div><h2>Structure</h2><p>Building-block composition — the topology this recipe generates. Expand, reorder, or edit nodes.</p></div></div>'
        + '<div class="struct">'
        + '<div class="card"><div class="tree-toolbar" id="tree-tb">'
        +   '<button class="tb-btn" data-act="add"><span class="ico">' + ico(I.plus, 14) + '</span>Add component</button>'
        +   '<button class="tb-btn" data-act="dup" disabled><span class="ico">' + ico(I.copy, 14) + '</span>Duplicate</button>'
        +   '<button class="tb-btn" data-act="remove" disabled><span class="ico">' + ico(I.trash, 14) + '</span>Remove</button>'
        +   '<span class="tb-sep"></span>'
        +   '<button class="tb-btn" data-act="moveup" disabled><span class="ico">' + ico(I.up, 14) + '</span>Up</button>'
        +   '<button class="tb-btn" data-act="movedown" disabled><span class="ico">' + ico(I.down, 14) + '</span>Down</button>'
        +   '<span class="tb-spacer"></span>'
        +   '<button class="tb-btn" data-act="expand"><span class="ico">' + ico(I.expand, 14) + '</span>Expand all</button>'
        +   '<button class="tb-btn" data-act="collapse"><span class="ico">' + ico(I.collapse, 14) + '</span>Collapse all</button>'
        + '</div><div class="tree" id="tree"></div></div>'
        + '<div class="card props" id="props"></div>'
        + '</div></div>';
    },
    wire: function (root, d, ctx) {
      if (!ctx._tree) ctx._tree = cloneTree(d.tree);
      var tree = ctx._tree;
      var selId = ctx._selId || null;
      var treeEl = root.querySelector('#tree');
      var propsEl = root.querySelector('#props');
      var tb = root.querySelector('#tree-tb');
      var dragId = null;

      function nodeHtml(n, depth) {
        var hasKids = n.children.length > 0;
        var rowCls = 'trow' + (n.id === selId ? ' sel' : '');
        var html = '<div class="tnode' + (n.open ? '' : ' collapsed') + '" data-id="' + n.id + '">'
          + '<div class="' + rowCls + '" data-id="' + n.id + '" draggable="true">'
          +   '<span class="tchev' + (hasKids ? '' : ' leaf') + '" data-chev>' + ico(I.chev, 13) + '</span>'
          +   '<span class="tgrip">' + ico(I.grip, 14) + '</span>'
          +   '<span class="tglyph">' + ico(typeGlyph(n.type), 15) + '</span>'
          +   '<span class="tname">' + esc(n.name) + '</span>'
          +   '<span class="ttype">' + esc(n.type) + '</span>'
          + '</div>';
        if (hasKids) html += '<div class="tchildren">' + n.children.map(function (c) { return nodeHtml(c, depth + 1); }).join('') + '</div>';
        return html + '</div>';
      }
      function renderTree() { treeEl.innerHTML = nodeHtml(tree, 0); }
      function renderProps() {
        var n = selId ? findNode(tree, selId) : null;
        if (!n) {
          propsEl.innerHTML = '<div class="card-hd"><span class="ovl">Component properties</span></div>'
            + '<div class="prop-empty"><div class="pe-ico">' + ico(TYPE_GLYPH['System'], 18) + '</div>'
            + '<div class="pet">No component selected</div><div class="pes">Select a node in the tree to inspect it.</div></div>';
          return;
        }
        var refs = n.configRefs.length ? '<div class="chip-wrap">' + n.configRefs.map(function (c) { return '<span class="ref-chip">' + ico('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>', 12) + esc(c) + '</span>'; }).join('') + '</div>' : '<span style="color:var(--fg4);font:var(--text-sm)">None</span>';
        var prm = n.params.length ? '<div class="chip-wrap">' + n.params.map(function (p) { return '<span class="param-chip">' + esc(p) + '</span>'; }).join('') + '</div>' : '<span style="color:var(--fg4);font:var(--text-sm)">None linked</span>';
        propsEl.innerHTML = '<div class="card-hd"><span class="ovl">Component properties</span></div>'
          + '<div class="prop-field"><div class="pk">Name</div><div class="pv"><input class="inp" id="pf-name" value="' + esc(n.name) + '"></div></div>'
          + '<div class="prop-field"><div class="pk">Type</div><div class="pv"><select class="inp" id="pf-type">'
          + Object.keys(TYPE_GLYPH).map(function (t) { return '<option' + (t === n.type ? ' selected' : '') + '>' + t + '</option>'; }).join('')
          + '</select></div></div>'
          + '<div class="prop-field"><div class="pk">Configuration references</div><div class="pv">' + refs + '</div></div>'
          + '<div class="prop-field"><div class="pk">Linked parameters</div><div class="pv">' + prm + '</div></div>';
        var nm = propsEl.querySelector('#pf-name');
        if (nm) nm.addEventListener('input', function () { n.name = nm.value; var row = treeEl.querySelector('.trow[data-id="' + n.id + '"] .tname'); if (row) row.textContent = nm.value; });
        var ty = propsEl.querySelector('#pf-type');
        if (ty) ty.addEventListener('change', function () { n.type = ty.value; renderTree(); });
      }
      function updateToolbar() {
        var on = !!selId && selId !== tree.id;
        ['dup', 'remove', 'moveup', 'movedown'].forEach(function (a) {
          var b = tb.querySelector('[data-act="' + a + '"]'); if (b) b.disabled = !on;
        });
      }
      function select(id) { selId = id; ctx._selId = id; treeEl.querySelectorAll('.trow').forEach(function (r) { r.classList.toggle('sel', r.getAttribute('data-id') === id); }); renderProps(); updateToolbar(); }

      function uid() { return 'n' + Math.random().toString(36).slice(2, 7); }

      renderTree(); renderProps(); updateToolbar();

      treeEl.addEventListener('click', function (e) {
        var chev = e.target.closest('[data-chev]');
        var row = e.target.closest('.trow'); if (!row) return;
        var node = findNode(tree, row.getAttribute('data-id'));
        if (chev && node.children.length) { node.open = !node.open; row.parentElement.classList.toggle('collapsed', !node.open); return; }
        select(row.getAttribute('data-id'));
      });

      tb.addEventListener('click', function (e) {
        var b = e.target.closest('.tb-btn'); if (!b) return;
        var act = b.getAttribute('data-act');
        if (act === 'expand') { (function open(n) { n.open = true; n.children.forEach(open); })(tree); renderTree(); }
        else if (act === 'collapse') { (function close(n) { if (n !== tree) n.open = false; n.children.forEach(close); })(tree); renderTree(); }
        else if (act === 'add') {
          var target = selId ? findNode(tree, selId) : tree;
          var nn = { id: uid(), name: 'New component', type: 'Building block', open: true, configRefs: [], params: [], children: [] };
          target.children.push(nn); target.open = true; renderTree(); select(nn.id);
        } else if (selId && selId !== tree.id) {
          var n = findNode(tree, selId), par = findParent(tree, selId), idx = par.children.indexOf(n);
          if (act === 'dup') { var c = cloneTree(n); c.id = uid(); c.name = n.name + ' (copy)'; par.children.splice(idx + 1, 0, c); renderTree(); select(c.id); }
          else if (act === 'remove') { par.children.splice(idx, 1); renderTree(); select(null); }
          else if (act === 'moveup' && idx > 0) { par.children.splice(idx, 1); par.children.splice(idx - 1, 0, n); renderTree(); select(n.id); }
          else if (act === 'movedown' && idx < par.children.length - 1) { par.children.splice(idx, 1); par.children.splice(idx + 1, 0, n); renderTree(); select(n.id); }
        }
      });

      // drag & drop reparent / reorder
      treeEl.addEventListener('dragstart', function (e) {
        var row = e.target.closest('.trow'); if (!row) return;
        dragId = row.getAttribute('data-id');
        if (dragId === tree.id) { e.preventDefault(); return; }
        row.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      treeEl.addEventListener('dragend', function () { dragId = null; treeEl.querySelectorAll('.dragging,.drop-into').forEach(function (el) { el.classList.remove('dragging', 'drop-into'); }); });
      treeEl.addEventListener('dragover', function (e) {
        var row = e.target.closest('.trow'); if (!row || !dragId) return;
        e.preventDefault();
        treeEl.querySelectorAll('.drop-into').forEach(function (el) { el.classList.remove('drop-into'); });
        if (row.getAttribute('data-id') !== dragId) row.classList.add('drop-into');
      });
      treeEl.addEventListener('drop', function (e) {
        var row = e.target.closest('.trow'); if (!row || !dragId) return;
        e.preventDefault();
        var targetId = row.getAttribute('data-id');
        if (targetId === dragId) return;
        var dn = findNode(tree, dragId);
        // prevent dropping into own descendant
        if (findNode(dn, targetId)) return;
        var par = findParent(tree, dragId); par.children.splice(par.children.indexOf(dn), 1);
        var target = findNode(tree, targetId); target.children.push(dn); target.open = true;
        renderTree(); select(dragId);
      });
    }
  };

  /* ============================================================
     RULES — list + builder
     ============================================================ */
  var OPMAP = { '>': '>', '<': '<', '=': '=', 'between': 'is between', 'mod': 'tiles by', 'changes': 'changes', 'spans': 'spans', 'crosses': 'crosses' };
  window.RecipeDetailTabs.rules = {
    render: function (d) {
      var rows = d.rules.map(function (rule, i) {
        return '<tr data-i="' + i + '"' + (i === 0 ? ' class="sel"' : '') + '>'
          + '<td><div class="rn">' + esc(rule.name) + '</div></td>'
          + '<td><span class="type-pill ' + rule.type + '"><span class="tdot"></span>' + rule.type + '</span></td>'
          + '<td><span class="rprio">P' + rule.priority + '</span></td>'
          + '<td><span class="badge ' + rule.status + '"><span class="dot"></span>' + rule.status.charAt(0).toUpperCase() + rule.status.slice(1) + '</span></td>'
          + '</tr>';
      }).join('');
      return '<div class="rd-pane full">'
        + '<div class="rd-pane-head"><div><h2>Rules</h2><p>Logic controlling generation. Select a rule to inspect its IF / THEN structure.</p></div>'
        +   '<div class="he-actions"><button class="rd-btn"><span class="ico">' + ico(I.plus, 15) + '</span>New rule</button></div></div>'
        + '<div class="rules-layout">'
        + '<div class="card"><div class="card-hd"><span class="ovl">Rule list</span><span class="hint">' + d.rules.length + ' rules</span></div>'
        +   '<table class="rtab"><thead><tr><th>Rule name</th><th>Type</th><th>Priority</th><th>Status</th></tr></thead><tbody id="rule-rows">' + rows + '</tbody></table></div>'
        + '<div class="card" id="builder-card"></div>'
        + '</div></div>';
    },
    wire: function (root, d, ctx) {
      var sel = ctx._ruleSel || 0;
      var card = root.querySelector('#builder-card');
      var rows = root.querySelector('#rule-rows');

      function bchip(cls, txt) { return '<span class="bchip ' + cls + '">' + esc(txt) + '</span>'; }
      function renderBuilder() {
        var rule = d.rules[sel];
        var ifClause = rule.if.map(function (c) {
          return '<div class="bclause">' + bchip('key', c.k) + bchip('op', OPMAP[c.op] || c.op) + (c.v ? bchip('val', c.v) : '') + '</div>';
        }).join('');
        var thenClause = rule.then.map(function (a) {
          return '<div class="bclause">' + bchip('act', a.a) + bchip('val', a.t) + '</div>';
        }).join('');
        card.innerHTML = '<div class="card-hd"><span class="ovl">Rule builder</span><span class="hint">' + esc(rule.ref) + '</span></div>'
          + '<div class="builder">'
          +   '<div class="bblock if-block"><div class="bhd"><span class="bw">If</span></div>' + ifClause
          +     '<div class="bclause"><button class="b-add">' + ico(I.plus, 13) + ' Add condition</button></div></div>'
          +   '<div class="bconn"><span class="bword">Then</span></div>'
          +   '<div class="bblock then-block"><div class="bhd"><span class="bw">Then</span></div>' + thenClause
          +     '<div class="bclause"><button class="b-add">' + ico(I.plus, 13) + ' Add action</button></div></div>'
          + '</div>'
          + '<div class="builder-foot"><button class="rd-btn"><span class="ico">' + ico(I.play, 14) + '</span>Test rule</button>'
          +   '<span class="test-result" id="test-out" style="display:none"><span class="ico">' + ico(I.checkCircle, 16) + '</span>Passed — 14 of 14 sample inputs satisfied</span></div>';
        var testBtn = card.querySelector('.builder-foot .rd-btn');
        testBtn.addEventListener('click', function () { card.querySelector('#test-out').style.display = 'flex'; });
      }
      function select(i) { sel = i; ctx._ruleSel = i; rows.querySelectorAll('tr').forEach(function (tr) { tr.classList.toggle('sel', +tr.getAttribute('data-i') === i); }); renderBuilder(); }
      rows.addEventListener('click', function (e) { var tr = e.target.closest('tr[data-i]'); if (tr) select(+tr.getAttribute('data-i')); });
      renderBuilder();
    }
  };

  /* ============================================================
     PARAMETERS — table grouped by group + config panel
     ============================================================ */
  var TYPE_LABEL = { text: 'Text', number: 'Number', boolean: 'Boolean', dropdown: 'Dropdown', multiselect: 'Multi-select', reference: 'Reference', formula: 'Formula' };
  window.RecipeDetailTabs.parameters = {
    render: function (d) {
      var byGroup = {};
      d.params.forEach(function (p, i) { (byGroup[p.group] = byGroup[p.group] || []).push(Object.assign({ _i: i }, p)); });
      var first = true, body = '';
      Object.keys(byGroup).forEach(function (g) {
        body += '<tr class="grp-row"><td colspan="5">' + esc(g) + '</td></tr>';
        byGroup[g].forEach(function (p) {
          body += '<tr data-i="' + p._i + '"' + (first ? ' class="sel"' : '') + '>'
            + '<td><span class="pname">' + esc(p.name) + '</span></td>'
            + '<td><span class="tcat">' + TYPE_LABEL[p.type] + '</span></td>'
            + '<td><span class="pdef">' + esc(p.def) + (p.unit && p.unit !== '—' ? ' ' + esc(p.unit) : '') + '</span></td>'
            + '<td>' + (p.required ? '<span class="req-yes">Required</span>' : '<span class="req-no">Optional</span>') + '</td>'
            + '<td><span class="badge ' + (p.status === 'active' ? 'active' : 'draft') + '"><span class="dot"></span>' + (p.status === 'active' ? 'Active' : 'Draft') + '</span></td>'
            + '</tr>';
          first = false;
        });
      });
      return '<div class="rd-pane full">'
        + '<div class="rd-pane-head"><div><h2>Parameters</h2><p>Configurable inputs exposed by this recipe. Select a row to edit its configuration.</p></div>'
        +   '<div class="he-actions"><button class="rd-btn"><span class="ico">' + ico(I.plus, 15) + '</span>Add parameter</button></div></div>'
        + '<div class="params-layout">'
        + '<div class="card"><div class="card-hd"><span class="ovl">Parameter table</span><span class="hint">' + d.params.length + ' parameters</span></div>'
        +   '<table class="ptab"><thead><tr><th>Name</th><th>Type</th><th>Default</th><th>Required</th><th>Status</th></tr></thead><tbody id="param-rows">' + body + '</tbody></table></div>'
        + '<div class="card pconfig" id="pconfig"></div>'
        + '</div></div>';
    },
    wire: function (root, d, ctx) {
      var sel = ctx._paramSel != null ? ctx._paramSel : 0;
      var rows = root.querySelector('#param-rows');
      var panel = root.querySelector('#pconfig');
      function cfg(k, body) { return '<div class="field-row" style="padding:11px 18px"><div class="fk" style="flex-basis:110px;width:110px">' + esc(k) + '</div><div class="fv">' + body + '</div></div>'; }
      function renderConfig() {
        var p = d.params[sel];
        panel.innerHTML = '<div class="card-hd"><span class="ovl">Parameter configuration</span></div>'
          + '<div class="pc-name"><div class="lb">' + esc(p.label) + '</div><div class="nm">' + esc(p.name) + '</div></div>'
          + cfg('Label', '<input class="inp" value="' + esc(p.label) + '">')
          + cfg('Description', '<textarea class="inp" style="min-height:62px">' + esc(p.desc) + '</textarea>')
          + cfg('Type', '<select class="inp">' + Object.keys(TYPE_LABEL).map(function (t) { return '<option' + (t === p.type ? ' selected' : '') + '>' + TYPE_LABEL[t] + '</option>'; }).join('') + '</select>')
          + cfg('Default', '<input class="inp" value="' + esc(p.def) + '" style="font-family:var(--font-mono)">')
          + cfg('Unit', '<input class="inp" value="' + esc(p.unit) + '">')
          + cfg('Validation', '<input class="inp" value="' + esc(p.validation) + '" style="font-family:var(--font-mono)">')
          + cfg('Allowed', '<input class="inp" value="' + esc(p.allowed) + '">')
          + cfg('Required', '<select class="inp"><option' + (p.required ? ' selected' : '') + '>Required</option><option' + (!p.required ? ' selected' : '') + '>Optional</option></select>');
      }
      function select(i) { sel = i; ctx._paramSel = i; rows.querySelectorAll('tr[data-i]').forEach(function (tr) { tr.classList.toggle('sel', +tr.getAttribute('data-i') === i); }); renderConfig(); }
      rows.addEventListener('click', function (e) { var tr = e.target.closest('tr[data-i]'); if (tr) select(+tr.getAttribute('data-i')); });
      renderConfig();
    }
  };

  /* ============================================================
     OUTPUTS — type toggles + mapping
     ============================================================ */
  window.RecipeDetailTabs.outputs = {
    render: function (d) {
      var on = d.outputs.on;
      var cards = d.allOutputs.map(function (o) {
        var active = on.indexOf(o.key) >= 0;
        return '<div class="out-card' + (active ? ' on' : '') + '" data-key="' + o.key + '">'
          + '<span class="oc-ico">' + ico(o.glyph, 19) + '</span>'
          + '<span class="oc-txt"><span class="oc-lb">' + esc(o.label) + '</span><span class="oc-st">' + (active ? 'Generated' : 'Not generated') + '</span></span>'
          + '<span class="oc-toggle"></span></div>';
      }).join('');
      var maps = d.outputs.map.map(function (m) {
        return '<div class="map-row"><div class="map-in"><span class="mtag">In</span><span class="mlabel">' + esc(m[0]) + '</span></div>'
          + '<span class="map-arrow">' + ico(I.arrow, 18) + '</span>'
          + '<div class="map-out"><span class="mtag">Out</span><span class="mlabel">' + esc(m[1]) + '</span></div></div>';
      }).join('');
      return '<div class="rd-pane">'
        + '<div class="rd-pane-head"><div><h2>Outputs</h2><p>What the recipe generates, and how authored parameters map to generated artefacts.</p></div></div>'
        + '<div class="card"><div class="card-hd"><span class="ovl">Output types</span><span class="hint">Toggle artefacts produced on generation</span></div>'
        +   '<div class="out-grid" id="out-grid">' + cards + '</div></div>'
        + '<div class="card"><div class="card-hd"><span class="ovl">Output mapping</span><span class="hint">Input parameter → generated output</span></div>'
        +   '<div class="map-list">' + maps + '</div></div>'
        + '</div>';
    },
    wire: function (root, d) {
      var grid = root.querySelector('#out-grid');
      grid.addEventListener('click', function (e) {
        var c = e.target.closest('.out-card'); if (!c) return;
        var key = c.getAttribute('data-key');
        var on = c.classList.toggle('on');
        c.querySelector('.oc-st').textContent = on ? 'Generated' : 'Not generated';
        var idx = d.outputs.on.indexOf(key);
        if (on && idx < 0) d.outputs.on.push(key);
        else if (!on && idx >= 0) d.outputs.on.splice(idx, 1);
      });
    }
  };

  /* ============================================================
     PROJECTS — table of projects referencing this recipe
     ============================================================ */
  var PRJ_STATUS_LABEL = { generated: 'Generated', validated: 'Validated', computing: 'Computing', draft: 'Draft', review: 'Review' };
  window.RecipeDetailTabs.projects = {
    render: function (d) {
      var fmt = window.VBG_RECIPE_DETAIL.fmtDate;
      var r = d.recipe;
      if (!d.projects.length) {
        return '<div class="rd-pane full">'
          + '<div class="rd-pane-head"><div><h2>Projects</h2><p>Projects that reference this recipe in their generation logic.</p></div></div>'
          + '<div class="card"><div class="prj-empty">'
          +   '<div class="pe-ico">' + ico('<path d="M4 20V8.5a1 1 0 0 1 .4-.8l6-4.5a1 1 0 0 1 1.2 0l6 4.5a1 1 0 0 1 .4.8V20"/><path d="M3 20h18"/><path d="M9 20v-5h6v5"/>', 20) + '</div>'
          +   '<div class="pet">Not used in any project</div>'
          +   '<div class="pes">This recipe has not been referenced by a project yet. Once a project adopts it, the projects appear here.</div>'
          + '</div></div></div>';
      }
      var behind = d.projects.filter(function (p) { return !p.current; }).length;
      var rows = d.projects.map(function (p) {
        return '<tr>'
          + '<td class="prj-model"><span class="prj-thumb"><img src="' + esc(p.thumb) + '" alt=""></span></td>'
          + '<td><div class="prj-name">' + esc(p.name) + '</div><div class="prj-code">' + esc(p.code) + '</div></td>'
          + '<td><span class="prj-cell">' + esc(p.customer) + '</span></td>'
          + '<td><span class="prj-city"><span class="ico">' + ico('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>', 13) + '</span>' + esc(p.city) + '</span></td>'
          + '<td><span class="badge ' + p.status + '"><span class="dot"></span>' + (PRJ_STATUS_LABEL[p.status] || p.status) + '</span></td>'
          + '<td><span class="prj-ver">' + esc(p.usedVersion) + '</span>' + (p.current ? '<span class="prj-tag current">Current</span>' : '<span class="prj-tag behind">Behind</span>') + '</td>'
          + '<td><span class="prj-date">' + fmt(p.lastGenerated) + '</span></td>'
          + '<td class="prj-acts"><button class="vact">Open</button></td>'
          + '</tr>';
      }).join('');
      var hint = d.projects.length + ' project' + (d.projects.length === 1 ? '' : 's')
        + (behind ? ' · ' + behind + ' behind current version' : '');
      return '<div class="rd-pane full">'
        + '<div class="rd-pane-head"><div><h2>Projects</h2><p>Projects that reference this recipe in their generation logic. ' + (behind ? 'Some are pinned to an older version.' : 'All are on the current version.') + '</p></div>'
        +   '<div class="he-actions"><button class="rd-btn"><span class="ico">' + ico('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>', 15) + '</span>Export list</button></div></div>'
        + '<div class="card"><div class="card-hd"><span class="ovl">Used in</span><span class="hint">' + hint + '</span></div>'
        +   '<table class="prj-table"><thead><tr><th class="th-model">Model</th><th>Project</th><th>Customer</th><th>City</th><th>Status</th><th>Recipe version</th><th>Last generated</th><th></th></tr></thead>'
        +   '<tbody>' + rows + '</tbody></table></div>'
        + '</div>';
    },
    wire: function (root) {
      root.querySelectorAll('.prj-table tbody tr, .prj-acts .vact').forEach(function (el) {
        el.addEventListener('click', function (e) {
          e.stopPropagation();
          window.location.href = '#';
        });
      });
    }
  };

  /* ============================================================
     VERSIONS
     ============================================================ */
  window.RecipeDetailTabs.versions = {
    render: function (d) {
      var fmt = window.VBG_RECIPE_DETAIL.fmtDate;
      var rows = d.versions.map(function (v) {
        var acts = v.current
          ? '<button class="vact">Compare</button>' + (v.status === 'draft' ? '<button class="vact primary">Publish</button>' : '<button class="vact">View</button>')
          : '<button class="vact">View</button><button class="vact">Compare</button><button class="vact">Restore</button>';
        return '<tr' + (v.current ? ' class="current"' : '') + '>'
          + '<td><span class="vver">' + esc(v.version) + (v.current ? '<span class="vcur">Current</span>' : '') + '</span></td>'
          + '<td><span class="badge ' + v.status + '"><span class="dot"></span>' + v.status.charAt(0).toUpperCase() + v.status.slice(1) + '</span></td>'
          + '<td><span class="vby">' + esc(v.by) + '</span></td>'
          + '<td><span class="vdate">' + fmt(v.date) + '</span></td>'
          + '<td><span class="vnotes">' + esc(v.notes) + '</span></td>'
          + '<td class="vacts">' + acts + '</td>'
          + '</tr>';
      }).join('');
      return '<div class="rd-pane full">'
        + '<div class="rd-pane-head"><div><h2>Versions</h2><p>Recipe evolution. View, compare, restore, or publish a version.</p></div></div>'
        + '<div class="card"><div class="card-hd"><span class="ovl">Version history</span><span class="hint">' + d.versions.length + ' versions</span></div>'
        +   '<table class="vtab"><thead><tr><th>Version</th><th>Status</th><th>Created by</th><th>Date</th><th>Notes</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        + '</div>';
    },
    wire: function () {}
  };

  /* ============================================================
     ACTIVITY — timeline
     ============================================================ */
  var ACT_VERB = { created: 'created', edited: 'edited', published: 'published', archived: 'archived', restored: 'restored', reviewed: 'reviewed' };
  var ACT_ICON = { created: I.plus, edited: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>', published: '<path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4Z"/>', archived: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/>', reviewed: I.check, restored: '<path d="M3 12a9 9 0 1 0 9-9 9.7 9.7 0 0 0-6.7 2.8L3 8"/><path d="M3 3v5h5"/>' };
  window.RecipeDetailTabs.activity = {
    render: function (d) {
      var fmt = window.VBG_RECIPE_DETAIL.fmtDate;
      var items = d.activity.map(function (e) {
        return '<div class="tl-item"><div class="tl-rail"><div class="tl-node ' + e.action + '">' + ico(ACT_ICON[e.action] || I.check, 15) + '</div><div class="tl-line"></div></div>'
          + '<div class="tl-body"><div class="tl-top"><span class="tl-action">Recipe <span class="verb">' + (ACT_VERB[e.action] || e.action) + '</span></span><span class="tl-date">' + fmt(e.date) + '</span></div>'
          + '<div class="tl-details">' + esc(e.details) + '</div>'
          + '<div class="tl-user"><span class="tl-avatar">' + esc(initials(e.user)) + '</span><span class="tl-uname">' + esc(e.user) + '</span></div>'
          + '</div></div>';
      }).join('');
      return '<div class="rd-pane">'
        + '<div class="rd-pane-head"><div><h2>Activity</h2><p>Audit trail — every change to this recipe, most recent first.</p></div></div>'
        + '<div class="card"><div class="card-hd"><span class="ovl">Timeline</span></div><div class="timeline">' + items + '</div></div>'
        + '</div>';
    },
    wire: function () {}
  };
})();
