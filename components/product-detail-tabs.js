/* ============================================================
   VBG — Product detail tab renderers
   Tabs: overview · usage · versions · availability · governance · audit
   Pure render(detail) -> HTML string. Reuses recipe-detail.css
   shell classes (card, field-row, badge, vtab, timeline) plus
   product-detail.css for product-specific blocks.
   Exposes window.ProductDetailTabs.
   ============================================================ */
(function () {
  'use strict';

  var D = function () { return window.VBG_PRODUCT_DETAIL; };
  function fmt(iso) { return D().fmtDate(iso); }

  function ico(path, size) {
    size = size || 16;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var STATUS_LABEL = { active: 'Active', draft: 'Draft', deprecated: 'Deprecated' };
  var CATS = {
    structural: 'Structural', facade: 'Façade', mep: 'MEP', production: 'Production'
  };

  function badge(status, label) {
    return '<span class="badge ' + status + '"><span class="dot"></span>' + (label || STATUS_LABEL[status] || status) + '</span>';
  }

  /* a key/value row inside a .card */
  function row(k, vHtml, mono) {
    return '<div class="field-row"><div class="fk">' + esc(k) + '</div>'
      + '<div class="fv"><div class="pd-val' + (mono ? ' mono' : '') + '">' + vHtml + '</div></div></div>';
  }
  function cardHead(label, hint) {
    return '<div class="card-hd"><span class="ovl">' + esc(label) + '</span>' + (hint ? '<span class="hint">' + esc(hint) + '</span>' : '') + '</div>';
  }

  /* ============================================================
     OVERVIEW
     ============================================================ */
  function overview(d) {
    var p = d.product, id = d.identity, lc = d.lifecycle;
    var tags = (p.tags || []).map(function (t) { return '<span class="pd-tag">' + esc(t) + '</span>'; }).join('');

    var identityCard = '<div class="card">' + cardHead('Identity')
      + row('Product name', '<span class="pd-strong">' + esc(p.name) + '</span>')
      + row('Product code', esc(p.code), true)
      + row('Status', badge(p.status))
      + row('Current version', esc(p.version), true)
      + row('Product owner', personChip(id.owner))
      + row('Responsible team', esc(id.ownerTeam))
      + '</div>';

    var recordCard = '<div class="card">' + cardHead('Record')
      + row('Created', dateWithRel(id.created))
      + row('Created by', personChip(id.createdBy))
      + row('Last modified', dateWithRel(id.modified))
      + row('Last modified by', personChip(id.modifiedBy))
      + '</div>';

    var infoCard = '<div class="card span2">' + cardHead('Product information')
      + row('Description', '<span class="pd-desc">' + esc(p.desc) + '</span>')
      + row('Category', '<span class="pd-cat">' + ico(catGlyph(p.category), 13) + (CATS[p.category] || p.category) + '</span>')
      + row('Product family', esc(id.family))
      + row('Classification', esc(id.classification) + ' <span class="pd-sub mono">· ' + esc(id.cbCode) + '</span>')
      + row('Manufacturer', '<span class="pd-strong">' + esc(p.manufacturer) + '</span> <span class="pd-sub mono">' + esc(p.sku) + '</span>')
      + row('Material', esc(materialLabel(p.material)))
      + row('Tags & labels', '<div class="pd-tags">' + tags + '</div>')
      + '</div>';

    var lifecycleCard = '<div class="card span2">' + cardHead('Lifecycle')
      + '<div class="pd-lifeline">' + lifeline(lc.state) + '</div>'
      + '<div class="pd-life-grid">'
      +   lifeCell('Current state', badge(lc.state))
      +   lifeCell('Publication date', dateOrDash(lc.publicationDate))
      +   lifeCell('Deprecation date', dateOrDash(lc.deprecationDate))
      +   lifeCell('Archive date', dateOrDash(lc.archiveDate))
      + '</div>'
      + '</div>';

    var notesCard = '<div class="card span2">' + cardHead('Internal notes', 'Not visible to tenants')
      + '<div class="pd-notes">' + ico('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>', 16) + '<p>' + esc(id.notes) + '</p></div>'
      + '</div>';

    return pane('Overview', 'Authoritative record — what this product is, who owns it, and its lifecycle state.',
      '<div class="gform">' + identityCard + recordCard + infoCard + lifecycleCard + notesCard + '</div>');
  }

  function lifeCell(k, v) { return '<div class="pd-life-cell"><div class="lk">' + esc(k) + '</div><div class="lv">' + v + '</div></div>'; }
  function dateOrDash(iso) { return iso ? '<span class="pd-date">' + fmt(iso) + '</span>' : '<span class="pd-dash">—</span>'; }
  function dateWithRel(iso) { return '<span class="pd-date">' + fmt(iso) + '</span> <span class="pd-sub">· ' + D().relLabel(iso) + '</span>'; }
  function personChip(name) {
    var initials = name.split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('');
    return '<span class="pd-person"><span class="pd-avatar">' + esc(initials) + '</span>' + esc(name) + '</span>';
  }
  function materialLabel(m) {
    return { concrete: 'Concrete', steel: 'Steel', timber: 'Timber', aluminium: 'Aluminium', masonry: 'Masonry', composite: 'Composite' }[m] || m;
  }
  function catGlyph(cat) {
    return {
      structural: '<path d="M4 22V4a1 1 0 0 1 1-1h6v19"/><path d="M11 7h8a1 1 0 0 1 1 1v14"/><path d="M11 11h9"/><path d="M11 15h9"/>',
      facade: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 9v12"/>',
      mep: '<circle cx="6" cy="19" r="2.5"/><path d="M8.5 19h8a3.5 3.5 0 0 0 0-7h-9a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="2.5"/>',
      production: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>'
    }[cat] || '';
  }
  function lifeline(state) {
    var steps = [['draft', 'Draft'], ['active', 'Active'], ['deprecated', 'Deprecated'], ['archived', 'Archived']];
    var order = { draft: 0, active: 1, deprecated: 2, archived: 3 };
    var cur = order[state] != null ? order[state] : 0;
    return steps.map(function (st, i) {
      var cls = i < cur ? 'done' : (i === cur ? 'on' : 'todo');
      var conn = i > 0 ? '<span class="ll-conn ' + (i <= cur ? 'done' : '') + '"></span>' : '';
      return conn + '<span class="ll-step ' + cls + '"><span class="ll-dot"></span>' + st[1] + '</span>';
    }).join('');
  }

  /* ============================================================
     USAGE
     ============================================================ */
  function usage(d) {
    var c = d.counts, rel = d.relationships, p = d.product;
    var stats = '<div class="pd-stats">'
      + stat(c.recipes, 'Recipes', 'using this product', '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>')
      + stat(c.buildingBlocks, 'Building blocks', 'referencing it', '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>')
      + stat(c.projects, 'Active projects', 'with live usage', '<path d="M4 20V8.5a1 1 0 0 1 .4-.8l6-4.5a1 1 0 0 1 1.2 0l6 4.5a1 1 0 0 1 .4.8V20"/><path d="M3 20h18"/><path d="M9 20v-5h6v5"/>')
      + stat(c.tenants, 'Tenants', 'with access', '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>')
      + '</div>';

    var impact = '<div class="pd-impact">' + ico('<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.42 0z"/>', 16)
      + '<span>' + (c.recipes
        ? 'Changing or deprecating this product affects <b>' + c.recipes + ' recipe' + (c.recipes === 1 ? '' : 's') + '</b>, <b>' + c.buildingBlocks + ' building block' + (c.buildingBlocks === 1 ? '' : 's') + '</b> and <b>' + c.projects + ' active project' + (c.projects === 1 ? '' : 's') + '</b> across <b>' + c.tenants + ' tenant' + (c.tenants === 1 ? '' : 's') + '</b>. Review impact before changing the published version.'
        : 'This product is not yet referenced by any recipe, building block or project. It can be edited or deprecated with no downstream impact.')
      + '</span></div>';

    // related recipes
    var recipeRows = rel.recipes.length
      ? rel.recipes.map(function (r) {
        return '<div class="rel-row"><span class="rel-ico">' + ico(catGlyph(p.category), 15) + '</span>'
          + '<div class="rel-main"><div class="rel-name">' + esc(r.name) + '</div><div class="rel-code mono">' + esc(r.code) + '</div></div>'
          + '<span class="rel-ver mono">' + esc(r.version) + '</span>'
          + badge(r.status === 'published' ? 'active' : (r.status === 'archived' ? 'deprecated' : r.status), r.status === 'published' ? 'Published' : (r.status.charAt(0).toUpperCase() + r.status.slice(1)))
          + '</div>';
      }).join('')
      : emptyRel('No recipes reference this product yet.');
    var recipesCard = '<div class="card">' + cardHead('Related recipes', rel.recipes.length + ' total') + '<div class="rel-list">' + recipeRows + '</div></div>';

    // building blocks
    var blockRows = rel.blocks.length
      ? rel.blocks.map(function (b) {
        return '<div class="rel-row"><span class="rel-ico">' + ico('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>', 15) + '</span>'
          + '<div class="rel-main"><div class="rel-name">' + esc(b.name) + '</div><div class="rel-code mono">' + esc(b.code) + '</div></div>'
          + '<span class="rel-sub">' + b.refs + ' ref' + (b.refs === 1 ? '' : 's') + '</span></div>';
      }).join('')
      : emptyRel('No building blocks reference this product yet.');
    var blocksCard = '<div class="card">' + cardHead('Related building blocks', d.counts.buildingBlocks + ' total') + '<div class="rel-list">' + blockRows + '</div></div>';

    // variants
    var variantRows = rel.variants.map(function (v) {
      return '<div class="rel-row"><span class="rel-ico">' + ico('<path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M21 16v5h-5"/><path d="M3 16v5h5"/>', 15) + '</span>'
        + '<div class="rel-main"><div class="rel-name">' + esc(v.label) + '</div><div class="rel-code mono">' + esc(v.code) + '</div></div>'
        + badge(v.status, STATUS_LABEL[v.status]) + '</div>';
    }).join('');
    var variantsCard = '<div class="card">' + cardHead('Product variants', rel.variants.length + ' variants') + '<div class="rel-list">' + variantRows + '</div></div>';

    var versionsCard = '<div class="card">' + cardHead('Product versions', rel.versionsCount + ' versions')
      + '<div class="pd-xref"><div class="xref-txt"><div class="rel-name">' + esc(rel.versionsCount) + ' version' + (rel.versionsCount === 1 ? '' : 's') + ' on record</div>'
      + '<div class="rel-sub">Current ' + esc(p.version) + ' · full history and change summaries</div></div>'
      + '<button class="rd-btn pd-xref-btn" data-goto="versions">View versions' + ico('<path d="m9 18 6-6-6-6"/>', 15) + '</button></div></div>';

    return pane('Usage & relationships', 'Where this product is used across the platform and what it relates to.',
      stats + impact + '<div class="pd-rel-grid">' + recipesCard + blocksCard + variantsCard + versionsCard + '</div>');
  }

  function stat(n, label, sub, glyph) {
    var unused = !n;
    return '<div class="pd-stat' + (unused ? ' unused' : '') + '">'
      + '<span class="pd-stat-ico">' + ico(glyph, 18) + '</span>'
      + '<div class="pd-stat-n">' + (unused ? '0' : n) + '</div>'
      + '<div class="pd-stat-l">' + esc(label) + '</div>'
      + '<div class="pd-stat-s">' + esc(sub) + '</div>'
      + '</div>';
  }
  function emptyRel(msg) { return '<div class="rel-empty">' + esc(msg) + '</div>'; }

  /* ============================================================
     VERSIONS
     ============================================================ */
  function versions(d) {
    var rows = d.versions.map(function (v) {
      return '<tr' + (v.current ? ' class="current"' : '') + '>'
        + '<td><span class="vver">' + esc(v.version) + (v.current ? '<span class="vcur">Current</span>' : '') + '</span></td>'
        + '<td>' + badge(v.status, STATUS_LABEL[v.status]) + '</td>'
        + '<td><span class="vdate">' + fmt(v.created) + '</span></td>'
        + '<td><span class="vdate">' + (v.published ? fmt(v.published) : '<span class="pd-dash">— not published</span>') + '</span></td>'
        + '<td><span class="vnotes">' + esc(v.summary) + '</span></td>'
        + '<td class="vby">' + esc(v.by) + '</td>'
        + '</tr>';
    }).join('');
    var table = '<div class="card"><table class="vtab"><thead><tr>'
      + '<th>Version</th><th>Status</th><th>Created</th><th>Published</th><th>Change summary</th><th>Author</th>'
      + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    return pane('Versions', 'Every revision of this product, its publication state and what changed.', table);
  }

  /* ============================================================
     AVAILABILITY
     ============================================================ */
  function availability(d) {
    var a = d.availability;
    var globalMap = {
      global: ['Globally available', 'av-on'],
      internal: ['Internal — not published', 'av-warn'],
      restricted: ['Restricted', 'av-off']
    };
    var g = globalMap[a.global] || globalMap.internal;

    var globalCard = '<div class="card span2">' + cardHead('Availability')
      + row('Global availability', '<span class="av-pill ' + g[1] + '"><span class="dot"></span>' + g[0] + '</span>')
      + row('Visibility', esc(a.visibility))
      + row('Licence tier', esc(a.licenceTier))
      + '</div>';

    var restrictCard = '<div class="card span2">' + cardHead('Access restrictions')
      + '<div class="av-restrict">' + a.restrictions.map(function (r) {
        return '<div class="av-rule">' + ico('<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', 15) + '<span>' + esc(r) + '</span></div>';
      }).join('') + '</div></div>';

    var accessLabel = { enabled: ['Enabled', 'av-on'], pinned: ['Version-pinned', 'av-pin'], pending: ['Pending', 'av-warn'] };
    var tenantRows = a.tenants.length
      ? a.tenants.map(function (t) {
        var al = accessLabel[t.access] || accessLabel.enabled;
        return '<tr><td><div class="av-ten"><span class="av-ten-av">' + esc(t.name.slice(0, 1)) + '</span>'
          + '<div><div class="av-ten-n">' + esc(t.name) + '</div><div class="av-ten-id mono">' + esc(t.tid) + '</div></div></div></td>'
          + '<td><span class="av-ind">' + esc(t.industry) + '</span></td>'
          + '<td><span class="av-pill ' + al[1] + '"><span class="dot"></span>' + al[0] + '</span></td>'
          + '<td class="mono av-ver">' + esc(t.version) + '</td></tr>';
      }).join('')
      : '<tr><td colspan="4"><div class="rel-empty">No tenant-specific availability — product follows the global setting.</div></td></tr>';
    var tenantCard = '<div class="card span2">' + cardHead('Tenant-specific availability', a.tenants.length + ' tenants')
      + '<table class="av-table"><thead><tr><th>Tenant</th><th>Industry</th><th>Access</th><th>Version</th></tr></thead><tbody>'
      + tenantRows + '</tbody></table></div>';

    return pane('Availability', 'Who can see and use this product — globally and per tenant.',
      '<div class="gform">' + globalCard + restrictCard + tenantCard + '</div>');
  }

  /* ============================================================
     GOVERNANCE
     ============================================================ */
  function governance(d) {
    var g = d.governance;
    var apMap = { approved: ['Approved', 'active'], pending: ['Pending approval', 'draft'], rejected: ['Rejected', 'deprecated'] };
    var cmMap = { validated: ['Validated', 'active'], pending: ['Pending review', 'draft'] };
    var ap = apMap[g.approvalStatus] || apMap.pending;
    var cm = cmMap[g.compliance] || cmMap.pending;

    var ownerCard = '<div class="card">' + cardHead('Ownership')
      + row('Product owner', personChip(g.owner))
      + row('Responsible team', esc(g.team))
      + '</div>';

    var approvalCard = '<div class="card">' + cardHead('Status')
      + row('Approval status', badge(ap[1], ap[0]))
      + row('Compliance / validation', '<span class="badge ' + cm[1] + '"><span class="dot"></span>' + cm[0] + '</span> <span class="pd-sub">NEN-EN</span>')
      + '</div>';

    var resultMap = {
      approved: ['approved', '<path d="M20 6 9 17l-5-5"/>'],
      submitted: ['submitted', '<path d="m5 12 5 5 9-9"/>'],
      'in-review': ['in review', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'],
      deprecated: ['deprecated', '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>']
    };
    var histRows = g.history.map(function (h, i) {
      var r = resultMap[h.result] || resultMap.approved;
      return '<div class="gov-step">'
        + '<div class="gov-rail"><span class="gov-node ' + h.result + '">' + ico(r[1], 14) + '</span>' + (i < g.history.length - 1 ? '<span class="gov-line"></span>' : '') + '</div>'
        + '<div class="gov-body"><div class="gov-top"><span class="gov-stage">' + esc(h.stage) + '</span><span class="gov-date mono">' + fmt(h.date) + '</span></div>'
        + '<div class="gov-meta">' + personChip(h.by) + '<span class="gov-result ' + h.result + '">' + r[0] + '</span></div></div></div>';
    }).join('');
    var historyCard = '<div class="card span2">' + cardHead('Approval history') + '<div class="gov-hist">' + histRows + '</div></div>';

    return pane('Governance', 'Ownership, approval and compliance state for this product record.',
      '<div class="gform">' + ownerCard + approvalCard + historyCard + '</div>');
  }

  /* ============================================================
     AUDIT
     ============================================================ */
  function audit(d) {
    var kindIcon = {
      created: '<path d="M5 12h14"/><path d="M12 5v14"/>',
      published: '<path d="m5 12 5 5 9-9"/>',
      edited: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
      status: '<path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/>',
      version: '<path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/>',
      reviewed: '<path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/>',
      availability: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/>',
      deprecated: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>'
    };
    var verbColor = { published: 'published', created: 'created', reviewed: 'reviewed', deprecated: 'archived' };
    var items = d.audit.map(function (e, i) {
      var nodeCls = verbColor[e.kind] || '';
      return '<div class="tl-item"><div class="tl-rail"><span class="tl-node ' + nodeCls + '">' + ico(kindIcon[e.kind] || kindIcon.edited, 15) + '</span><span class="tl-line"></span></div>'
        + '<div class="tl-body"><div class="tl-top"><span class="tl-action"><span class="verb">' + esc(e.action) + '</span></span>'
        + '<span class="tl-date">' + fmt(e.date) + ' · ' + esc(e.time) + '</span></div>'
        + '<div class="tl-details">' + esc(e.details) + '</div>'
        + '<div class="tl-user"><span class="tl-avatar">' + esc(e.user.split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('')) + '</span><span class="tl-uname">' + esc(e.user) + '</span></div>'
        + '</div></div>';
    }).join('');
    return pane('Audit', 'Complete change history — status changes, version changes and user actions, with timestamps.',
      '<div class="card"><div class="timeline">' + items + '</div></div>');
  }

  /* ---------- pane wrapper ---------- */
  function pane(title, sub, body) {
    return '<div class="rd-pane"><div class="rd-pane-head"><div><h2>' + esc(title) + '</h2><p>' + esc(sub) + '</p></div></div>' + body + '</div>';
  }

  window.ProductDetailTabs = {
    overview: { render: overview, wire: wireGoto },
    usage: { render: usage, wire: wireGoto },
    versions: { render: versions },
    availability: { render: availability },
    governance: { render: governance },
    audit: { render: audit }
  };

  /* let [data-goto] buttons jump to another tab */
  function wireGoto(root, detail, ctx) {
    root.querySelectorAll('[data-goto]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (ctx && ctx.goTab) ctx.goTab(b.getAttribute('data-goto'));
      });
    });
  }
})();
