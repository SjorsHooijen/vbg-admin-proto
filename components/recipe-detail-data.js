/* ============================================================
   VBG — Recipe detail data
   Builds rich, plausible per-recipe content for the detail page
   (Structure / Rules / Parameters / Outputs / Versions / Activity)
   from category templates, seeded deterministically by recipe code.

   Exposes window.VBG_RECIPE_DETAIL.build(recipe) -> detail object.
   Relies on window.VBG_RECIPES (recipes-table.js) being loaded.
   ============================================================ */
(function () {
  'use strict';

  function assetUrl(p) { return (window.__resources && window.__resources[p]) || p; }

  /* ---- discipline + team mapping per category ---- */
  var DISCIPLINE = {
    structural: 'Structural engineering',
    facade:     'Façade engineering',
    mep:        'MEP engineering',
    production: 'Production engineering',
    geometry:   'Geometry & topology'
  };
  var TEAM = {
    structural: 'Structures — Core systems',
    facade:     'Envelope & façade',
    mep:        'Building services',
    production: 'DfMA / production',
    geometry:   'Platform geometry'
  };
  var AUTHORS = ['Sanne Koenders', 'Daan Verhoeven', 'Mei Lin Tan', 'Joris Bakker', 'Ineke de Vries'];

  /* ============================================================
     STRUCTURE TREES  (id, name, type, configRefs[], params[], children[])
     ============================================================ */
  var TREES = {
    structural: {
      id: 'bld', name: 'Building', type: 'Building', open: true,
      configRefs: ['CFG-grid-orthogonal', 'CFG-load-NEN-EN'],
      params: ['gridSpacingX', 'gridSpacingY', 'levelCount'],
      children: [
        { id: 'sub', name: 'Substructure', type: 'Building part', open: true,
          configRefs: ['CFG-found-pile'], params: ['pileSpacing'],
          children: [
            { id: 'fnd', name: 'Foundation grid', type: 'System', configRefs: ['CFG-found-pile'], params: ['pileSpacing', 'capDepth'], children: [] }
          ] },
        { id: 'sup', name: 'Superstructure', type: 'Building part', open: true,
          configRefs: ['CFG-load-NEN-EN'], params: ['levelCount'],
          children: [
            { id: 'lr', name: 'Level range · L01–L08', type: 'Level range', open: true,
              configRefs: ['CFG-grid-orthogonal'], params: ['gridSpacingX', 'gridSpacingY', 'storeyHeight'],
              children: [
                { id: 'col', name: 'Column grid', type: 'System', configRefs: ['CFG-grid-orthogonal'], params: ['gridSpacingX', 'gridSpacingY', 'columnSize'], children: [] },
                { id: 'slb', name: 'Floor plate', type: 'System', configRefs: ['CFG-slab-hollowcore'], params: ['slabDepth'], children: [] }
              ] },
            { id: 'core', name: 'Stability core', type: 'Zone', configRefs: ['CFG-core-shear'], params: ['coreWallThickness'],
              children: [
                { id: 'stair', name: 'Stair shaft', type: 'Building block', configRefs: [], params: ['riseRun'], children: [] },
                { id: 'lift', name: 'Lift shaft', type: 'Building block', configRefs: [], params: [], children: [] }
              ] }
          ] },
        { id: 'roof', name: 'Roof', type: 'Building part', configRefs: ['CFG-roof-flat'], params: ['parapetHeight'], children: [] }
      ]
    },
    facade: {
      id: 'env', name: 'Building envelope', type: 'Building part', open: true,
      configRefs: ['CFG-panel-precast', 'CFG-joint-rules'],
      params: ['panelModule', 'jointWidth'],
      children: [
        { id: 'nth', name: 'North elevation', type: 'Zone', open: true, configRefs: ['CFG-panel-precast'], params: ['panelModule'],
          children: [
            { id: 'nf', name: 'Panel field', type: 'System', configRefs: ['CFG-panel-precast'], params: ['panelModule', 'panelWidth'], children: [] },
            { id: 'nm', name: 'Opening map', type: 'System', configRefs: ['CFG-opening-rules'], params: ['openingInset'], children: [] }
          ] },
        { id: 'sth', name: 'South elevation', type: 'Zone', configRefs: ['CFG-panel-precast'], params: ['panelModule'], children: [] },
        { id: 'corner', name: 'Corner condition', type: 'Building block', configRefs: ['CFG-corner'], params: ['cornerReturn'], children: [] },
        { id: 'parapet', name: 'Parapet', type: 'Building block', configRefs: [], params: ['parapetHeight'], children: [] }
      ]
    },
    mep: {
      id: 'svc', name: 'Building services', type: 'Building part', open: true,
      configRefs: ['CFG-riser-zoning', 'CFG-duct-sizing'],
      params: ['demandPerFloor', 'maxVelocity'],
      children: [
        { id: 'rza', name: 'Riser zone A', type: 'Zone', open: true, configRefs: ['CFG-riser-zoning'], params: ['demandPerFloor'],
          children: [
            { id: 'sup', name: 'Supply shaft', type: 'System', configRefs: ['CFG-shaft'], params: ['shaftArea'], children: [] },
            { id: 'ret', name: 'Return shaft', type: 'System', configRefs: ['CFG-shaft'], params: ['shaftArea'], children: [] }
          ] },
        { id: 'plant', name: 'Plant level', type: 'Level range', configRefs: ['CFG-plant'], params: ['plantArea'], children: [] },
        { id: 'dist', name: 'Distribution', type: 'System', open: true, configRefs: ['CFG-duct-sizing'], params: ['maxVelocity'],
          children: [
            { id: 'duct', name: 'Duct network', type: 'System', configRefs: ['CFG-duct-sizing'], params: ['maxVelocity', 'ductSize'], children: [] },
            { id: 'branch', name: 'Branch lines', type: 'System', configRefs: ['CFG-branch'], params: ['coverageRadius'], children: [] }
          ] }
      ]
    },
    production: {
      id: 'mod', name: 'Module assembly', type: 'Building part', open: true,
      configRefs: ['CFG-cassette', 'CFG-connection'],
      params: ['moduleSpan', 'toppingDepth'],
      children: [
        { id: 'floor', name: 'Floor cassette', type: 'Building block', open: true, configRefs: ['CFG-cassette'], params: ['moduleSpan'],
          children: [
            { id: 'hc', name: 'Hollow-core unit', type: 'System', configRefs: ['CFG-hollowcore'], params: ['slabDepth', 'spanDirection'], children: [] },
            { id: 'top', name: 'Structural topping', type: 'System', configRefs: ['CFG-topping'], params: ['toppingDepth'], children: [] }
          ] },
        { id: 'wall', name: 'Wall panel', type: 'Building block', configRefs: ['CFG-wallpanel'], params: ['panelHeight'], children: [] },
        { id: 'conn', name: 'Connection set', type: 'System', configRefs: ['CFG-connection'], params: ['connectionType'], children: [] }
      ]
    },
    geometry: {
      id: 'fp', name: 'Footprint', type: 'Building part', open: true,
      configRefs: ['CFG-bay-packing', 'CFG-ramp'],
      params: ['bayWidth', 'rampGrade'],
      children: [
        { id: 'park', name: 'Parking field', type: 'Zone', open: true, configRefs: ['CFG-bay-packing'], params: ['bayWidth'],
          children: [
            { id: 'baygrid', name: 'Bay grid', type: 'System', configRefs: ['CFG-bay-packing'], params: ['bayWidth', 'aisleWidth'], children: [] },
            { id: 'ramp', name: 'Ramp', type: 'Building block', configRefs: ['CFG-ramp'], params: ['rampGrade'], children: [] }
          ] },
        { id: 'circ', name: 'Circulation core', type: 'Zone', configRefs: ['CFG-core'], params: [], children: [] }
      ]
    }
  };

  /* ============================================================
     RULES per category  (name, type, priority, status, if[], then[])
     types: visibility | validation | calculation | dependency | selection
     ============================================================ */
  var RULES = {
    structural: [
      { name: 'Subdivide oversized bays', type: 'calculation', priority: 1, status: 'active',
        if: [{ k: 'Bay span', op: '>', v: '6 000 mm' }], then: [{ a: 'Insert', t: 'intermediate column line' }], ref: 'R-217.b' },
      { name: 'Column capacity check', type: 'validation', priority: 2, status: 'active',
        if: [{ k: 'Axial load', op: '>', v: 'section capacity' }], then: [{ a: 'Flag', t: 'undersized column' }], ref: 'R-204' },
      { name: 'Reinforcement trigger', type: 'visibility', priority: 3, status: 'active',
        if: [{ k: 'Width', op: '>', v: '5 000 mm' }], then: [{ a: 'Enable', t: 'edge reinforcement option' }], ref: 'R-141' },
      { name: 'Core alignment dependency', type: 'dependency', priority: 4, status: 'active',
        if: [{ k: 'Core position', op: 'changes', v: '' }], then: [{ a: 'Recompute', t: 'stability bracing layout' }], ref: 'R-088' },
      { name: 'Slab system selection', type: 'selection', priority: 5, status: 'draft',
        if: [{ k: 'Span', op: 'between', v: '7.2–9.0 m' }], then: [{ a: 'Select', t: 'hollow-core 320 mm' }], ref: 'R-126' }
    ],
    facade: [
      { name: 'Panel within transport limit', type: 'validation', priority: 1, status: 'active',
        if: [{ k: 'Panel width', op: '>', v: '3 600 mm' }], then: [{ a: 'Flag', t: 'over transport gauge' }], ref: 'R-310' },
      { name: 'Module subdivision', type: 'calculation', priority: 2, status: 'active',
        if: [{ k: 'Elevation length', op: 'mod', v: 'panel module ≠ 0' }], then: [{ a: 'Insert', t: 'closer panel' }], ref: 'R-312' },
      { name: 'Movement joint placement', type: 'calculation', priority: 3, status: 'active',
        if: [{ k: 'Run length', op: '>', v: '12 000 mm' }], then: [{ a: 'Insert', t: 'movement joint' }], ref: 'R-318' },
      { name: 'Opening reinforcement', type: 'visibility', priority: 4, status: 'active',
        if: [{ k: 'Opening', op: 'spans', v: '> 1 panel' }], then: [{ a: 'Enable', t: 'lintel detail' }], ref: 'R-141' },
      { name: 'Corner return selection', type: 'selection', priority: 5, status: 'review',
        if: [{ k: 'Corner angle', op: '=', v: '90°' }], then: [{ a: 'Select', t: 'mitred return panel' }], ref: 'R-330' }
    ],
    mep: [
      { name: 'Duct velocity check', type: 'validation', priority: 1, status: 'active',
        if: [{ k: 'Air velocity', op: '>', v: '6.0 m/s' }], then: [{ a: 'Flag', t: 'increase duct size' }], ref: 'R-411' },
      { name: 'Shaft demand sizing', type: 'calculation', priority: 2, status: 'active',
        if: [{ k: 'Floor demand', op: '>', v: 'riser capacity' }], then: [{ a: 'Add', t: 'parallel riser' }], ref: 'R-405' },
      { name: 'Branch coverage', type: 'calculation', priority: 3, status: 'active',
        if: [{ k: 'Uncovered area', op: '>', v: '0 m²' }], then: [{ a: 'Route', t: 'additional branch' }], ref: 'R-420' },
      { name: 'Plant room dependency', type: 'dependency', priority: 4, status: 'active',
        if: [{ k: 'Total demand', op: 'changes', v: '' }], then: [{ a: 'Resize', t: 'plant footprint' }], ref: 'R-402' },
      { name: 'Fire damper rule', type: 'visibility', priority: 5, status: 'draft',
        if: [{ k: 'Duct crosses', op: '=', v: 'fire compartment' }], then: [{ a: 'Enable', t: 'fire damper' }], ref: 'R-126' }
    ],
    production: [
      { name: 'Slab depth selection', type: 'selection', priority: 1, status: 'active',
        if: [{ k: 'Span', op: 'between', v: '7.2–9.0 m' }], then: [{ a: 'Select', t: 'hollow-core 320 mm' }], ref: 'R-126' },
      { name: 'Topping deflection check', type: 'validation', priority: 2, status: 'active',
        if: [{ k: 'Deflection', op: '>', v: 'L/250' }], then: [{ a: 'Flag', t: 'increase topping' }], ref: 'R-128' },
      { name: 'Pod service tie-in', type: 'dependency', priority: 3, status: 'active',
        if: [{ k: 'Pod position', op: 'changes', v: '' }], then: [{ a: 'Reroute', t: 'riser connection' }], ref: 'R-430' },
      { name: 'Connection selection', type: 'selection', priority: 4, status: 'active',
        if: [{ k: 'Shear force', op: '>', v: '85 kN' }], then: [{ a: 'Select', t: 'welded plate connection' }], ref: 'R-216' },
      { name: 'Lifting weight limit', type: 'validation', priority: 5, status: 'review',
        if: [{ k: 'Unit weight', op: '>', v: '8 000 kg' }], then: [{ a: 'Flag', t: 'exceeds crane capacity' }], ref: 'R-350' }
    ],
    geometry: [
      { name: 'Bay packing optimisation', type: 'calculation', priority: 1, status: 'active',
        if: [{ k: 'Free footprint', op: '>', v: '1 bay' }], then: [{ a: 'Pack', t: 'additional bay row' }], ref: 'R-512' },
      { name: 'Ramp grade check', type: 'validation', priority: 2, status: 'active',
        if: [{ k: 'Ramp grade', op: '>', v: '1:12' }], then: [{ a: 'Flag', t: 'exceeds max grade' }], ref: 'R-520' },
      { name: 'Aisle width dependency', type: 'dependency', priority: 3, status: 'active',
        if: [{ k: 'Bay angle', op: 'changes', v: '' }], then: [{ a: 'Recompute', t: 'aisle width' }], ref: 'R-515' },
      { name: 'Accessible bay selection', type: 'selection', priority: 4, status: 'draft',
        if: [{ k: 'Total bays', op: '>', v: '50' }], then: [{ a: 'Reserve', t: 'accessible bays (4%)' }], ref: 'R-530' }
    ]
  };

  /* ============================================================
     PARAMETERS per category
     type: text | number | boolean | dropdown | multiselect | reference | formula
     ============================================================ */
  var PARAMS = {
    structural: [
      { name: 'gridSpacingX', label: 'Grid spacing — X', type: 'number', def: '7 200', unit: 'mm', required: true, group: 'Grid', status: 'active', desc: 'Primary bay spacing along the X axis.', validation: '3 600 ≤ x ≤ 9 000', allowed: '—' },
      { name: 'gridSpacingY', label: 'Grid spacing — Y', type: 'number', def: '7 200', unit: 'mm', required: true, group: 'Grid', status: 'active', desc: 'Primary bay spacing along the Y axis.', validation: '3 600 ≤ y ≤ 9 000', allowed: '—' },
      { name: 'levelCount', label: 'Level count', type: 'number', def: '8', unit: 'lv', required: true, group: 'Massing', status: 'active', desc: 'Number of generated levels in the range.', validation: '1 ≤ n ≤ 60', allowed: '—' },
      { name: 'storeyHeight', label: 'Storey height', type: 'number', def: '3 300', unit: 'mm', required: true, group: 'Massing', status: 'active', desc: 'Floor-to-floor height per level.', validation: '2 700 ≤ h ≤ 4 500', allowed: '—' },
      { name: 'columnSize', label: 'Column section', type: 'dropdown', def: '400 × 400', unit: 'mm', required: true, group: 'Members', status: 'active', desc: 'Default column cross-section.', validation: 'from catalogue', allowed: '300×300 · 400×400 · 500×500' },
      { name: 'concreteClass', label: 'Concrete class', type: 'dropdown', def: 'C30/37', unit: '—', required: true, group: 'Material', status: 'active', desc: 'Concrete strength class.', validation: 'NEN-EN 206', allowed: 'C25/30 · C30/37 · C35/45' },
      { name: 'edgeReinforcement', label: 'Edge reinforcement', type: 'boolean', def: 'false', unit: '—', required: false, group: 'Members', status: 'active', desc: 'Add reinforcement to perimeter bays.', validation: '—', allowed: 'true · false' },
      { name: 'loadCase', label: 'Governing load case', type: 'reference', def: 'LC-ULS-01', unit: '—', required: true, group: 'Loading', status: 'active', desc: 'Reference to the governing load combination.', validation: 'must resolve', allowed: '→ Load cases' },
      { name: 'utilisation', label: 'Target utilisation', type: 'formula', def: '= load / capacity', unit: '%', required: false, group: 'Loading', status: 'draft', desc: 'Computed member utilisation ratio.', validation: '≤ 0.95', allowed: 'formula' }
    ],
    facade: [
      { name: 'panelModule', label: 'Panel module', type: 'number', def: '1 200', unit: 'mm', required: true, group: 'Module', status: 'active', desc: 'Nominal horizontal panel module.', validation: '600 ≤ m ≤ 1 800', allowed: '—' },
      { name: 'panelWidth', label: 'Max panel width', type: 'number', def: '3 600', unit: 'mm', required: true, group: 'Module', status: 'active', desc: 'Transport-limited maximum panel width.', validation: '≤ 3 600', allowed: '—' },
      { name: 'jointWidth', label: 'Joint width', type: 'number', def: '20', unit: 'mm', required: true, group: 'Joints', status: 'active', desc: 'Nominal panel-to-panel joint.', validation: '15 ≤ j ≤ 30', allowed: '—' },
      { name: 'finish', label: 'Surface finish', type: 'dropdown', def: 'Acid-etched', unit: '—', required: true, group: 'Material', status: 'active', desc: 'Precast surface treatment.', validation: 'from catalogue', allowed: 'Smooth · Acid-etched · Sandblasted' },
      { name: 'openingInset', label: 'Opening inset', type: 'number', def: '120', unit: 'mm', required: false, group: 'Openings', status: 'active', desc: 'Reveal depth at openings.', validation: '0 ≤ i ≤ 300', allowed: '—' },
      { name: 'insulationClass', label: 'Insulation class', type: 'dropdown', def: 'Rc 4.5', unit: 'm²K/W', required: true, group: 'Performance', status: 'active', desc: 'Thermal resistance class.', validation: '≥ 4.5', allowed: 'Rc 4.5 · Rc 6.0' },
      { name: 'orientations', label: 'Applied elevations', type: 'multiselect', def: 'N, E, S, W', unit: '—', required: true, group: 'Module', status: 'active', desc: 'Elevations this recipe applies to.', validation: '≥ 1', allowed: 'N · E · S · W' }
    ],
    mep: [
      { name: 'demandPerFloor', label: 'Demand per floor', type: 'number', def: '2.4', unit: 'm³/s', required: true, group: 'Loads', status: 'active', desc: 'Aggregate air demand per floor.', validation: '> 0', allowed: '—' },
      { name: 'maxVelocity', label: 'Max air velocity', type: 'number', def: '6.0', unit: 'm/s', required: true, group: 'Sizing', status: 'active', desc: 'Velocity limit for duct sizing.', validation: '≤ 6.0', allowed: '—' },
      { name: 'shaftArea', label: 'Shaft area', type: 'number', def: '1.8', unit: 'm²', required: true, group: 'Risers', status: 'active', desc: 'Cross-sectional area per riser shaft.', validation: '≥ 0.8', allowed: '—' },
      { name: 'ductType', label: 'Duct type', type: 'dropdown', def: 'Rectangular', unit: '—', required: true, group: 'Sizing', status: 'active', desc: 'Default duct cross-section type.', validation: 'from catalogue', allowed: 'Round · Rectangular · Oval' },
      { name: 'coverageRadius', label: 'Coverage radius', type: 'number', def: '3 200', unit: 'mm', required: true, group: 'Distribution', status: 'active', desc: 'Branch coverage radius.', validation: '≤ 3 600', allowed: '—' },
      { name: 'fireDamper', label: 'Fire dampers', type: 'boolean', def: 'true', unit: '—', required: false, group: 'Compliance', status: 'active', desc: 'Insert dampers at compartment lines.', validation: '—', allowed: 'true · false' },
      { name: 'plantRef', label: 'Plant room', type: 'reference', def: 'PLT-L00', unit: '—', required: true, group: 'Loads', status: 'draft', desc: 'Reference to plant room object.', validation: 'must resolve', allowed: '→ Plant rooms' }
    ],
    production: [
      { name: 'moduleSpan', label: 'Module span', type: 'number', def: '8 400', unit: 'mm', required: true, group: 'Module', status: 'active', desc: 'Clear span of the floor cassette.', validation: '6 000 ≤ s ≤ 9 600', allowed: '—' },
      { name: 'slabDepth', label: 'Slab depth', type: 'dropdown', def: '320', unit: 'mm', required: true, group: 'Module', status: 'active', desc: 'Hollow-core unit depth.', validation: 'from catalogue', allowed: '200 · 260 · 320 · 400' },
      { name: 'toppingDepth', label: 'Topping depth', type: 'number', def: '70', unit: 'mm', required: true, group: 'Module', status: 'active', desc: 'Structural topping thickness.', validation: '50 ≤ t ≤ 120', allowed: '—' },
      { name: 'connectionType', label: 'Connection type', type: 'dropdown', def: 'Bolted', unit: '—', required: true, group: 'Connections', status: 'active', desc: 'Module-to-module connection.', validation: 'from catalogue', allowed: 'Bolted · Welded plate · Grouted' },
      { name: 'unitWeight', label: 'Max unit weight', type: 'number', def: '8 000', unit: 'kg', required: true, group: 'Logistics', status: 'active', desc: 'Crane-limited unit weight.', validation: '≤ 8 000', allowed: '—' },
      { name: 'spanDirection', label: 'Span direction', type: 'dropdown', def: 'Auto', unit: '—', required: false, group: 'Module', status: 'active', desc: 'Hollow-core span direction.', validation: '—', allowed: 'Auto · X · Y' },
      { name: 'tolerance', label: 'Assembly tolerance', type: 'number', def: '5', unit: 'mm', required: false, group: 'Connections', status: 'draft', desc: 'Allowable assembly tolerance.', validation: '≤ 10', allowed: '—' }
    ],
    geometry: [
      { name: 'bayWidth', label: 'Bay width', type: 'number', def: '2 500', unit: 'mm', required: true, group: 'Grid', status: 'active', desc: 'Standard parking bay width.', validation: '≥ 2 400', allowed: '—' },
      { name: 'aisleWidth', label: 'Aisle width', type: 'number', def: '6 000', unit: 'mm', required: true, group: 'Grid', status: 'active', desc: 'Two-way drive aisle width.', validation: '≥ 5 800', allowed: '—' },
      { name: 'rampGrade', label: 'Ramp grade', type: 'number', def: '1:12', unit: '—', required: true, group: 'Circulation', status: 'active', desc: 'Maximum ramp gradient.', validation: '≤ 1:12', allowed: '—' },
      { name: 'bayAngle', label: 'Bay angle', type: 'dropdown', def: '90°', unit: '—', required: true, group: 'Grid', status: 'active', desc: 'Parking bay angle.', validation: '—', allowed: '45° · 60° · 90°' },
      { name: 'accessibleRatio', label: 'Accessible ratio', type: 'number', def: '4', unit: '%', required: true, group: 'Compliance', status: 'active', desc: 'Proportion of accessible bays.', validation: '≥ 4', allowed: '—' },
      { name: 'footprintRef', label: 'Footprint outline', type: 'reference', def: 'GEO-FP-01', unit: '—', required: true, group: 'Grid', status: 'draft', desc: 'Reference to footprint boundary.', validation: 'must resolve', allowed: '→ Footprints' }
    ]
  };

  /* ============================================================
     OUTPUTS per category — which types are produced + parameter→output mapping
     ============================================================ */
  var ALL_OUTPUTS = [
    { key: 'building', label: 'Building model', glyph: '<path d="M4 20V8.5a1 1 0 0 1 .4-.8l6-4.5a1 1 0 0 1 1.2 0l6 4.5a1 1 0 0 1 .4.8V20"/><path d="M3 20h18"/>' },
    { key: 'module', label: 'Module structure', glyph: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>' },
    { key: 'product', label: 'Product configuration', glyph: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/>' },
    { key: 'drawings', label: 'Drawings', glyph: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6"/><path d="M9 17h3"/>' },
    { key: 'calcs', label: 'Calculations', glyph: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8"/><path d="M8 10h2"/><path d="M14 10h2"/><path d="M8 14h2"/><path d="M14 14h2"/><path d="M8 18h2"/>' },
    { key: 'bom', label: 'Bill of materials', glyph: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>' },
    { key: 'metadata', label: 'Metadata', glyph: '<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>' }
  ];
  var OUTPUTS = {
    structural: { on: ['building', 'calcs', 'drawings', 'bom', 'metadata'], map: [['gridSpacingX', 'Column grid X'], ['gridSpacingY', 'Column grid Y'], ['levelCount', 'Generated levels'], ['columnSize', 'Member schedule']] },
    facade:     { on: ['building', 'product', 'drawings', 'bom', 'metadata'], map: [['panelModule', 'Panel layout'], ['panelWidth', 'Panel width'], ['jointWidth', 'Joint schedule'], ['finish', 'Finish spec']] },
    mep:        { on: ['building', 'calcs', 'drawings', 'metadata'], map: [['demandPerFloor', 'Shaft sizing'], ['maxVelocity', 'Duct sizes'], ['coverageRadius', 'Branch network']] },
    production: { on: ['module', 'product', 'drawings', 'bom', 'metadata'], map: [['moduleSpan', 'Cassette span'], ['slabDepth', 'Unit schedule'], ['toppingDepth', 'Topping spec'], ['connectionType', 'Connection schedule']] },
    geometry:   { on: ['building', 'drawings', 'metadata'], map: [['bayWidth', 'Bay grid'], ['aisleWidth', 'Aisle layout'], ['rampGrade', 'Ramp geometry']] }
  };

  /* ============================================================
     PROJECTS POOL — projects that may reference a recipe.
     Mirrors components/projects-table.js so the detail page stays
     consistent with the Projects view (not loaded on this page).
     ============================================================ */
  var THUMBS = [
    'assets/vbg-viewport-3d.png',
    'assets/vbg-viewport-3d-select-second-floor.png',
    'assets/vbg-viewport-2d.png',
    'assets/vbg-viewport-1d.png',
    'assets/vbg-viewport-3d-select-second-floor-wall.png'
  ];
  var PROJECT_POOL = [
    { name: 'Project Alpha',          code: 'VBG-04-NC', customer: 'Heijmans Vastgoed', city: 'Amsterdam', status: 'generated', thumb: 0 },
    { name: 'Westkade Towers',        code: 'VBG-11-WK', customer: 'BAM Wonen',         city: 'Rotterdam', status: 'validated', thumb: 1 },
    { name: 'Havenkwartier Block C',  code: 'VBG-07-HK', customer: 'Dura Vermeer',      city: 'Utrecht',   status: 'computing', thumb: 2 },
    { name: 'Spoorzone Residences',   code: 'VBG-02-SZ', customer: 'VolkerWessels',     city: 'Tilburg',   status: 'draft',     thumb: 3 },
    { name: 'Maaspoort North Core',   code: 'VBG-09-MP', customer: 'Heijmans Vastgoed', city: 'Den Bosch', status: 'generated', thumb: 4 },
    { name: 'Stadshaven Lofts',       code: 'VBG-13-SH', customer: 'Synchroon',         city: 'Rotterdam', status: 'validated', thumb: 0 },
    { name: 'Binckhorst Mixed-Use',   code: 'VBG-15-BH', customer: 'AM Real Estate',    city: 'Den Haag',  status: 'review',    thumb: 1 },
    { name: 'Kop van Zuid Block B',   code: 'VBG-06-KZ', customer: 'BAM Wonen',         city: 'Rotterdam', status: 'draft',     thumb: 2 },
    { name: 'Oostpoort Plaza',        code: 'VBG-18-OP', customer: 'Amvest',            city: 'Amsterdam', status: 'generated', thumb: 3 },
    { name: 'Zuidas Tower E',         code: 'VBG-21-ZA', customer: 'G&S Vastgoed',      city: 'Amsterdam', status: 'validated', thumb: 4 },
    { name: 'Merwede Kanaalzone',     code: 'VBG-17-MK', customer: 'Janssen de Jong',   city: 'Utrecht',   status: 'computing', thumb: 0 },
    { name: 'Cruquius Werf',          code: 'VBG-20-CW', customer: 'Steck',             city: 'Haarlem',   status: 'draft',     thumb: 1 }
  ];

  /* ---- projects referencing this recipe, derived from r.usage ---- */
  function buildProjects(r) {
    var n = r.usage || 0;
    if (n <= 0) return [];
    n = Math.min(n, PROJECT_POOL.length);
    var s = seed(r.code);
    var start = s % PROJECT_POOL.length;
    var rows = [];
    // the current recipe version + the immediately prior minor (for "behind" projects)
    var parts = r.version.replace('v', '').split('.').map(Number);
    var prior = 'v' + parts[0] + '.' + Math.max(0, (parts[1] || 0) - 1) + '.0';
    for (var i = 0; i < n; i++) {
      var idx = (start + i * 5 + (i % 3)) % PROJECT_POOL.length;
      var guard = 0;
      // walk forward until we land on a project not already chosen
      while (rows.some(function (x) { return x.code === PROJECT_POOL[idx].code; }) && guard < PROJECT_POOL.length) {
        idx = (idx + 1) % PROJECT_POOL.length; guard++;
      }
      var p = PROJECT_POOL[idx];
      var behind = (parts[1] || 0) > 0 && (s + i) % 4 === 0;
      var used = behind ? prior : r.version;
      var lastGen = shiftDate(r.updated, ((s + i * 7) % 70) + (i === 0 ? 0 : 1));
      rows.push({
        name: p.name, code: p.code, customer: p.customer, city: p.city,
        status: p.status, thumb: assetUrl(THUMBS[p.thumb]),
        usedVersion: used, current: !behind, lastGenerated: lastGen
      });
    }
    return rows;
  }

  /* ============================================================
     deterministic helpers
     ============================================================ */
  function seed(code) {
    var s = 0;
    for (var i = 0; i < code.length; i++) s = (s * 31 + code.charCodeAt(i)) >>> 0;
    return s;
  }
  function pick(arr, s) { return arr[s % arr.length]; }

  function fmtDate(iso) {
    var M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var d = new Date(iso + 'T00:00:00');
    return d.getDate() + ' ' + M[d.getMonth()] + ' ' + d.getFullYear();
  }
  function shiftDate(iso, days) {
    var d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }

  /* ---- version history derived from the recipe's current version ---- */
  function buildVersions(r) {
    var s = seed(r.code);
    var owner = r.owner === 'vbg' ? 'VBG platform' : pick(AUTHORS, s);
    var parts = r.version.replace('v', '').split('.').map(Number);
    var major = parts[0], minor = parts[1] || 0;
    var rows = [];
    var lifecycleNow = r.status === 'published' ? 'published' : (r.status === 'draft' ? 'draft' : 'deprecated');

    // current
    rows.push({ version: r.version, status: lifecycleNow, by: owner, date: r.updated, current: true,
      notes: r.status === 'draft' ? 'Working draft — not yet published.' : 'Current published recipe.' });

    // prior minor releases
    var d = r.updated;
    var notesPool = [
      'Tightened validation thresholds.', 'Added parameter group reorganisation.',
      'Refined rule priorities.', 'Performance pass on generation.',
      'Updated default values per review.', 'Fixed mapping for edge condition.'
    ];
    for (var m = minor - 1; m >= 0 && rows.length < 4; m--) {
      d = shiftDate(d, 18 + (s % 25));
      rows.push({ version: 'v' + major + '.' + m + '.0', status: 'deprecated', by: pick(AUTHORS, s + m),
        date: d, notes: pick(notesPool, s + m) });
    }
    // an initial review/draft entry
    if (rows.length < 4 && major > 0) {
      d = shiftDate(d, 30);
      rows.push({ version: 'v' + (major - 1) + '.0.0', status: 'deprecated', by: pick(AUTHORS, s + 7), date: d, notes: 'First production release.' });
    }
    return rows;
  }

  /* ---- activity timeline derived from versions + status ---- */
  function buildActivity(r) {
    var s = seed(r.code);
    var owner = r.owner === 'vbg' ? 'VBG platform' : pick(AUTHORS, s);
    var events = [];
    var d = r.updated;

    if (r.status === 'archived') {
      events.push({ action: 'archived', user: pick(AUTHORS, s + 1), date: d, details: 'Superseded by a newer generation logic and retired from the library.' });
      d = shiftDate(d, 12);
    } else if (r.status === 'published') {
      events.push({ action: 'published', user: owner, date: d, details: 'Released ' + r.version + ' to the recipe library.' });
      d = shiftDate(d, 4);
    } else {
      events.push({ action: 'edited', user: owner, date: d, details: 'Saved working draft ' + r.version + '.' });
      d = shiftDate(d, 3);
    }
    events.push({ action: 'edited', user: pick(AUTHORS, s + 2), date: shiftDate(d, 2), details: 'Adjusted ' + pick(['validation thresholds', 'parameter defaults', 'rule priorities', 'structure composition'], s) + '.' });
    events.push({ action: 'reviewed', user: pick(AUTHORS, s + 3), date: shiftDate(d, 9), details: 'Engineering review — ' + pick(['approved', 'changes requested then resolved', 'signed off'], s + 1) + '.' });
    events.push({ action: 'edited', user: owner, date: shiftDate(d, 21), details: 'Added ' + pick(['edge-case rule', 'new parameter group', 'output mapping'], s + 2) + '.' });
    events.push({ action: 'created', user: pick(AUTHORS, s + 4), date: shiftDate(d, 40 + (s % 30)), details: 'Recipe created from ' + pick(['blank template', 'duplicated recipe', 'platform baseline'], s) + '.' });
    return events;
  }

  /* ============================================================
     public: build full detail object for a recipe
     ============================================================ */
  function build(r) {
    var cat = r.category;
    return {
      recipe: r,
      general: {
        discipline: DISCIPLINE[cat] || 'Engineering',
        team: TEAM[cat] || 'Platform',
        createdBy: r.owner === 'vbg' ? 'VBG platform' : pick(AUTHORS, seed(r.code)),
        owner: r.owner === 'vbg' ? 'VBG (platform)' : 'Company',
        lifecycle: r.status === 'published' ? 'active' : (r.status === 'draft' ? 'draft' : 'archived')
      },
      tree: TREES[cat] || TREES.structural,
      rules: RULES[cat] || RULES.structural,
      params: PARAMS[cat] || PARAMS.structural,
      outputs: OUTPUTS[cat] || OUTPUTS.structural,
      allOutputs: ALL_OUTPUTS,
      projects: buildProjects(r),
      versions: buildVersions(r),
      activity: buildActivity(r)
    };
  }

  window.VBG_RECIPE_DETAIL = { build: build, fmtDate: fmtDate, ALL_OUTPUTS: ALL_OUTPUTS };
})();
