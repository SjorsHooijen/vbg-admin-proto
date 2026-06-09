/* ============================================================
   VBG — Product detail data
   Builds a rich, plausible authoritative record for a single
   product (the manufacturable building component) from the
   catalog row, seeded deterministically by product code so the
   page is stable across reloads.

   Exposes window.VBG_PRODUCT_DETAIL.build(product) -> detail.
   Relies on window.VBG_PRODUCTS (products-table.js). Optionally
   uses window.VBG_RECIPES (recipes-table.js) for related recipes.
   ============================================================ */
(function () {
  'use strict';

  var TODAY = new Date('2026-06-09T00:00:00');

  /* ---- category → family / classification / responsible team ---- */
  var FAMILY = {
    structural: 'Structural systems',
    facade:     'Envelope & façade systems',
    mep:        'Building services systems',
    production: 'Modular & DfMA assemblies'
  };
  var CLASSIFICATION = {
    structural: 'Load-bearing component',
    facade:     'Cladding & envelope component',
    mep:        'Mechanical services component',
    production: 'Prefabricated volumetric unit'
  };
  var TEAM = {
    structural: 'Structures — Core systems',
    facade:     'Envelope & façade',
    mep:        'Building services',
    production: 'DfMA / production'
  };
  /* NL-CB-2023 style classification codes per discipline */
  var CB_CODE = {
    structural: 'NL/SfB 28 · NL-CB 21.21',
    facade:     'NL/SfB 21 · NL-CB 21.22',
    mep:        'NL/SfB 57 · NL-CB 56.11',
    production: 'NL/SfB 22 · NL-CB 21.24'
  };

  /* product owners (internal VBG catalog stewards) */
  var OWNERS = ['Sanne Koenders', 'Daan Verhoeven', 'Mei Lin Tan', 'Joris Bakker', 'Ineke de Vries', 'Wouter Dijkstra'];
  var REVIEWERS = ['Pieter Janssen', 'Fleur Hendriks', 'Maaike Bos', 'Rik van Leeuwen'];

  /* tenant pool (mirrors Companies.html) used for availability + counts */
  var TENANT_POOL = [
    { tid: 'TEN-0142', name: 'Heijmans Vastgoed', industry: 'Developer' },
    { tid: 'TEN-0118', name: 'BAM Wonen', industry: 'Developer' },
    { tid: 'TEN-0207', name: 'VolkerWessels', industry: 'Developer' },
    { tid: 'TEN-0233', name: 'Dura Vermeer', industry: 'Developer' },
    { tid: 'TEN-0288', name: 'AM Real Estate', industry: 'Developer' },
    { tid: 'TEN-0156', name: 'Ballast Nedam', industry: 'Contractor' },
    { tid: 'TEN-0174', name: 'TBI Bouw', industry: 'Contractor' },
    { tid: 'TEN-0259', name: 'Strukton', industry: 'Contractor' },
    { tid: 'TEN-0131', name: 'Arcadis', industry: 'Engineering' },
    { tid: 'TEN-0149', name: 'Royal HaskoningDHV', industry: 'Engineering' },
    { tid: 'TEN-0276', name: 'Witteveen+Bos', industry: 'Engineering' },
    { tid: 'TEN-0355', name: 'IMd Raadgevende Ingenieurs', industry: 'Engineering' }
  ];

  /* building-block templates referencing products, per discipline */
  var BLOCKS = {
    structural: ['Column-to-slab connection node', 'Stability core wall assembly', 'Transfer beam support', 'Foundation cap detail', 'Edge beam assembly', 'Moment frame joint'],
    facade:     ['Spandrel panel assembly', 'Window-to-panel interface', 'Corner return condition', 'Parapet capping detail', 'Slab-edge anchor bracket', 'Movement-joint module'],
    mep:        ['Riser tie-in node', 'Plant-room manifold set', 'Floor distribution branch', 'Compartment damper assembly', 'Service-spine connection', 'Roof plant interface'],
    production: ['Pod-to-corridor interface', 'Service-spine plug assembly', 'Module stacking connection', 'Craneage lifting frame', 'Floor cassette tie', 'Wet-zone waterproofing detail']
  };

  /* product variant naming per discipline */
  var VARIANTS = {
    structural: [['350', '350 × 350 mm section'], ['450', '450 × 450 mm section'], ['500', '500 × 500 mm section']],
    facade:     [['Acid-etched', 'Acid-etched finish'], ['Sandblasted', 'Sandblasted finish'], ['Brick-faced', 'Brick-faced variant']],
    mep:        [['Compact', 'Compact footprint variant'], ['High-capacity', 'High-capacity variant']],
    production: [['Left-hand', 'Left-hand layout'], ['Right-hand', 'Right-hand layout'], ['Accessible', 'Accessible-compliant layout']]
  };

  /* ---------- deterministic helpers ---------- */
  function seed(code) { var s = 0; for (var i = 0; i < code.length; i++) s = (s * 31 + code.charCodeAt(i)) >>> 0; return s; }
  function pick(arr, s) { return arr[s % arr.length]; }
  function fmtDate(iso) {
    if (!iso) return '—';
    var M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var d = new Date(iso + 'T00:00:00');
    return d.getDate() + ' ' + M[d.getMonth()] + ' ' + d.getFullYear();
  }
  function shiftDate(iso, days) { var d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() - days); return d.toISOString().slice(0, 10); }
  function addDate(iso, days) { var d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }
  function daysAgo(iso) { return Math.round((TODAY - new Date(iso + 'T00:00:00')) / 86400000); }
  function relLabel(iso) {
    var d = daysAgo(iso);
    if (d <= 0) return 'today'; if (d === 1) return 'yesterday';
    if (d < 30) return d + ' days ago';
    var mo = Math.round(d / 30); if (mo < 12) return mo + ' month' + (mo === 1 ? '' : 's') + ' ago';
    var yr = Math.round(d / 365); return yr + ' year' + (yr === 1 ? '' : 's') + ' ago';
  }
  function timeOf(s, i) { var h = 8 + ((s + i * 7) % 9); var m = (s + i * 13) % 60; return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; }

  /* ---------- usage counts ---------- */
  function buildCounts(p) {
    var s = seed(p.code);
    var recipes = p.usage || 0;
    var blocks = recipes === 0 ? (s % 2) : recipes + 2 + (s % 5);
    var projects = recipes === 0 ? 0 : Math.max(1, Math.round(recipes * 1.6) + (s % 4));
    var tenants = recipes === 0 ? 0 : Math.max(1, Math.min(TENANT_POOL.length, Math.round(recipes / 2) + 1 + (s % 3)));
    return { recipes: recipes, buildingBlocks: blocks, projects: projects, tenants: tenants };
  }

  /* ---------- related recipes (from real recipe data if present) ---------- */
  function buildRelatedRecipes(p, n) {
    if (n <= 0) return [];
    var out = [];
    if (window.VBG_RECIPES && window.VBG_RECIPES.DATA) {
      var R = window.VBG_RECIPES.DATA;
      var same = R.filter(function (r) { return r.category === p.category; });
      var pool = same.length ? same : R;
      var s = seed(p.code);
      for (var i = 0; i < Math.min(n, pool.length); i++) {
        var r = pool[(s + i * 3) % pool.length];
        if (out.some(function (x) { return x.code === r.code; })) { continue; }
        out.push({ code: r.code, name: r.name, version: r.version, status: r.status });
      }
    }
    // pad with synthetic entries if recipe data unavailable / too small
    var syn = ['Standard floor plate', 'Perimeter frame', 'Core & stability', 'Envelope wrap', 'Services distribution', 'Modular stack'];
    var k = 0;
    while (out.length < Math.min(n, 6)) {
      out.push({ code: 'RCP-' + (200 + ((seed(p.code) + k) % 700)), name: syn[k % syn.length] + ' — ' + (FAMILY[p.category] || 'system'), version: 'v' + (1 + (k % 3)) + '.' + (k % 5), status: 'published' });
      k++;
    }
    return out.slice(0, Math.min(n, 6));
  }

  function buildBlocks(p, n) {
    if (n <= 0) return [];
    var pool = BLOCKS[p.category] || BLOCKS.structural;
    var s = seed(p.code);
    var out = [];
    for (var i = 0; i < Math.min(n, pool.length); i++) {
      out.push({ code: 'BLK-' + (100 + ((s + i * 11) % 800)), name: pool[i], refs: 1 + ((s + i) % 3) });
    }
    return out;
  }

  function buildVariants(p) {
    var pool = VARIANTS[p.category] || VARIANTS.structural;
    var s = seed(p.code);
    return pool.map(function (v, i) {
      return {
        code: p.code + '-' + v[0].slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, ''),
        label: v[1],
        status: i === 0 ? 'active' : (i === pool.length - 1 && p.status !== 'active' ? 'draft' : 'active')
      };
    });
  }

  /* ---------- version history ---------- */
  function buildVersions(p) {
    var s = seed(p.code);
    var owner = pick(OWNERS, s);
    var parts = p.version.replace('v', '').split('.').map(Number);
    var major = parts[0], minor = parts[1] || 0;
    var rows = [];
    var lifecycleNow = p.status === 'active' ? 'active' : (p.status === 'draft' ? 'draft' : 'deprecated');
    var summaries = [
      'Updated dimensional tolerances and connection schedule.',
      'Revised material spec to current NEN-EN edition.',
      'Added certification references; corrected SKU mapping.',
      'Performance pass — refined load / capacity envelope.',
      'Aligned defaults with manufacturer datasheet revision.',
      'Initial production release.'
    ];
    var created = p.updated;
    var published = p.status === 'draft' ? null : p.updated;
    rows.push({
      version: p.version, status: lifecycleNow, by: owner,
      created: created, published: published, current: true,
      summary: p.status === 'draft' ? 'Working draft — pending approval and publication.' : 'Current published revision.'
    });
    var d = created;
    for (var m = minor - 1; m >= 0 && rows.length < 4; m--) {
      d = shiftDate(d, 40 + (s % 50));
      rows.push({ version: 'v' + major + '.' + m, status: 'deprecated', by: pick(OWNERS, s + m), created: shiftDate(d, 6), published: d, summary: pick(summaries, s + m) });
    }
    if (rows.length < 4 && major > 0) {
      d = shiftDate(d, 80);
      rows.push({ version: 'v' + (major - 1) + '.0', status: 'deprecated', by: pick(OWNERS, s + 5), created: shiftDate(d, 8), published: d, summary: summaries[5] });
    }
    return rows;
  }

  /* ---------- availability ---------- */
  function buildAvailability(p, counts) {
    var s = seed(p.code);
    var globalStatus = p.status === 'active' ? 'global' : (p.status === 'draft' ? 'internal' : 'restricted');
    var n = counts.tenants;
    var tenants = [];
    for (var i = 0; i < n; i++) {
      var t = TENANT_POOL[(s + i * 5) % TENANT_POOL.length];
      if (tenants.some(function (x) { return x.tid === t.tid; })) { continue; }
      var st = i % 7 === 0 ? 'pending' : (i % 5 === 0 ? 'pinned' : 'enabled');
      tenants.push({ tid: t.tid, name: t.name, industry: t.industry, access: st, version: i % 4 === 0 ? 'v' + (parseInt(p.version) ) + '.0 (pinned)' : 'latest' });
    }
    return {
      global: globalStatus,
      visibility: p.status === 'active' ? 'All disciplines' : (p.status === 'draft' ? 'Catalog editors only' : 'Hidden from catalog browse'),
      licenceTier: pick(['All tiers', 'Professional & Enterprise', 'Enterprise only'], s),
      restrictions: p.status === 'deprecated'
        ? ['No new project usage — existing references read-only', 'Hidden from product search']
        : (p.status === 'draft'
          ? ['Not available to tenants until published', 'Visible to catalog editors only']
          : ['Region: EU / NL', 'Requires accepted manufacturer terms']),
      tenants: tenants
    };
  }

  /* ---------- governance ---------- */
  function buildGovernance(p) {
    var s = seed(p.code);
    var owner = pick(OWNERS, s);
    var approvalStatus = p.status === 'active' ? 'approved' : (p.status === 'draft' ? 'pending' : 'approved');
    var compliance = p.status === 'draft' ? 'pending' : 'validated';
    var history = [];
    var d = p.updated;
    if (p.status === 'active') {
      history.push({ stage: 'Published to catalog', by: owner, date: d, result: 'approved' });
      history.push({ stage: 'Engineering sign-off', by: pick(REVIEWERS, s), date: shiftDate(d, 4), result: 'approved' });
      history.push({ stage: 'Compliance review (NEN-EN)', by: pick(REVIEWERS, s + 1), date: shiftDate(d, 9), result: 'approved' });
      history.push({ stage: 'Submitted for approval', by: owner, date: shiftDate(d, 14), result: 'submitted' });
    } else if (p.status === 'draft') {
      history.push({ stage: 'Submitted for approval', by: owner, date: d, result: 'submitted' });
      history.push({ stage: 'Internal technical check', by: pick(REVIEWERS, s), date: shiftDate(d, 3), result: 'in-review' });
    } else {
      history.push({ stage: 'Deprecated', by: owner, date: d, result: 'deprecated' });
      history.push({ stage: 'Last compliance review', by: pick(REVIEWERS, s), date: shiftDate(d, 220), result: 'approved' });
      history.push({ stage: 'Published to catalog', by: owner, date: shiftDate(d, 240), result: 'approved' });
    }
    return { owner: owner, team: TEAM[p.category] || 'Platform catalog', approvalStatus: approvalStatus, compliance: compliance, history: history };
  }

  /* ---------- audit timeline ---------- */
  function buildAudit(p, versions) {
    var s = seed(p.code);
    var owner = pick(OWNERS, s);
    var ev = [];
    var d = p.updated;
    if (p.status === 'deprecated') {
      ev.push({ kind: 'deprecated', action: 'Deprecated product', user: owner, date: d, details: 'Marked deprecated — superseded by a newer catalog entry. Existing references made read-only.' });
      d = shiftDate(d, 10);
    } else if (p.status === 'draft') {
      ev.push({ kind: 'edited', action: 'Saved draft', user: owner, date: d, details: 'Updated draft ' + p.version + ' — pending approval.' });
      d = shiftDate(d, 3);
    } else {
      ev.push({ kind: 'published', action: 'Published version', user: owner, date: d, details: 'Released ' + p.version + ' to the global catalog.' });
      d = shiftDate(d, 4);
    }
    ev.push({ kind: 'status', action: 'Status change', user: pick(REVIEWERS, s), date: shiftDate(d, 1), details: p.status === 'draft' ? 'Review → Draft (changes requested).' : 'Review → ' + (p.status === 'active' ? 'Active' : 'Deprecated') + '.' });
    ev.push({ kind: 'version', action: 'New version', user: owner, date: shiftDate(d, 6), details: 'Created ' + p.version + ' from ' + (versions[1] ? versions[1].version : 'baseline') + '.' });
    ev.push({ kind: 'edited', action: 'Attribute edit', user: pick(OWNERS, s + 2), date: shiftDate(d, 12), details: 'Updated ' + pick(['manufacturer SKU mapping', 'material specification', 'certification references', 'product description'], s) + '.' });
    ev.push({ kind: 'reviewed', action: 'Compliance review', user: pick(REVIEWERS, s + 1), date: shiftDate(d, 21), details: 'NEN-EN compliance check — ' + pick(['passed', 'passed with notes', 'signed off'], s) + '.' });
    ev.push({ kind: 'availability', action: 'Availability change', user: pick(OWNERS, s + 3), date: shiftDate(d, 34), details: 'Enabled for ' + pick(['Enterprise tenants', 'all disciplines', 'EU region'], s) + '.' });
    ev.push({ kind: 'created', action: 'Product created', user: pick(OWNERS, s + 4), date: shiftDate(d, 60 + (s % 90)), details: 'Catalog entry created from ' + pick(['blank template', 'manufacturer datasheet import', 'duplicated product'], s) + '.' });
    // attach a time to each
    ev.forEach(function (e, i) { e.time = timeOf(s, i); });
    return ev;
  }

  /* ============================================================
     public build
     ============================================================ */
  function build(p) {
    var s = seed(p.code);
    var owner = pick(OWNERS, s);
    var counts = buildCounts(p);
    var versions = buildVersions(p);
    var created = shiftDate(p.updated, 120 + (s % 240));
    var publication = p.status === 'draft' ? null : shiftDate(p.updated, 0);
    var firstPublished = p.status === 'draft' ? null : shiftDate(created, -(20 + (s % 30)) * -1);
    // publication = when first published; use created + small offset
    var pubDate = p.status === 'draft' ? null : addDate(created, 18 + (s % 20));
    var deprecationDate = p.status === 'deprecated' ? p.updated : null;
    var archiveDate = null;

    return {
      product: p,
      identity: {
        owner: owner,
        ownerTeam: TEAM[p.category] || 'Platform catalog',
        createdBy: pick(OWNERS, s + 4),
        created: created,
        modified: p.updated,
        modifiedBy: owner,
        classification: CLASSIFICATION[p.category] || 'Component',
        cbCode: CB_CODE[p.category] || '—',
        family: FAMILY[p.category] || 'Systems',
        notes: p.status === 'draft'
          ? 'Draft pending manufacturer datasheet confirmation. Do not reference in published recipes until approved.'
          : (p.status === 'deprecated'
            ? 'Superseded by a newer catalog entry. Kept for traceability of existing project references; no new usage permitted.'
            : 'Verified against the ' + p.manufacturer + ' datasheet (' + p.sku + '). Transport and craneage limits confirmed for standard logistics.')
      },
      lifecycle: {
        state: p.status,
        publicationDate: pubDate,
        deprecationDate: deprecationDate,
        archiveDate: archiveDate
      },
      counts: counts,
      relationships: {
        recipes: buildRelatedRecipes(p, counts.recipes),
        blocks: buildBlocks(p, Math.min(counts.buildingBlocks, 6)),
        variants: buildVariants(p),
        versionsCount: versions.length
      },
      versions: versions,
      availability: buildAvailability(p, counts),
      governance: buildGovernance(p),
      audit: buildAudit(p, versions)
    };
  }

  window.VBG_PRODUCT_DETAIL = { build: build, fmtDate: fmtDate, relLabel: relLabel };
})();
