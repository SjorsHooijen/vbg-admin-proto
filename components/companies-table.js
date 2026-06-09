/* ============================================================
   VBG — reusable companies (tenants) table web component
   Usage:  <vbg-companies-table></vbg-companies-table>
   Columns: avatar · company (name + tenant id + domain) · plan ·
            industry · status · seats (used / total + bar) ·
            projects · last active · actions (kebab)

   Companies are the tenant organisations provisioned on the VBG
   platform — developers, contractors, engineering consultancies,
   manufacturers and architects. This is an admin overview /
   management surface: rows do NOT navigate to a detail page; the
   kebab carries the tenant-maintenance actions.

   Renders into LIGHT DOM so screenshots / PDF / PPTX capture it.
   Styles scoped under `vbg-companies-table`, injected once.
   Relies on the global design tokens (styles/tokens.css).

   Data + facet helpers are exposed on window.VBG_COMPANIES so the
   page can build the filter sidebar and counts from one source.

   The component reads `this.filters` (set via setFilters({...})) and
   dispatches a `companiesrender` CustomEvent { visible, total } after
   every render so the page can update its footer / result count.
   ============================================================ */
(function () {
  /* "today" for relative date filtering — keep in sync with project date */
  const TODAY = new Date('2026-06-09T00:00:00');

  /* industry / sector glyphs (Lucide-style line icons) */
  const INDUSTRIES = {
    developer:    { label: 'Developer',    glyph: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>' },
    contractor:   { label: 'Contractor',   glyph: '<path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><path d="M14 6a6 6 0 0 1 6 6v3"/>' },
    engineering:  { label: 'Engineering',  glyph: '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/>' },
    manufacturer: { label: 'Manufacturer', glyph: '<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/>' },
    architect:    { label: 'Architect',    glyph: '<path d="m12.99 6.74 1.93 3.44"/><path d="M19.136 12a10 10 0 0 1-14.271 0"/><path d="m21 21-2.16-3.84"/><path d="m3 21 8.02-14.26"/><circle cx="12" cy="5" r="2"/>' }
  };

  const STATUS_LABEL = {
    active: 'Active', trial: 'Trial', invited: 'Invited',
    suspended: 'Suspended', churned: 'Churned'
  };

  const PLAN_LABEL = {
    enterprise: 'Enterprise', professional: 'Professional',
    team: 'Team', trial: 'Trial'
  };

  const REGION_LABEL = {
    nl: 'Netherlands', be: 'Belgium', de: 'Germany',
    nordics: 'Nordics', uk: 'United Kingdom'
  };
  const REGION_SHORT = { nl: 'NL', be: 'BE', de: 'DE', nordics: 'SE', uk: 'UK' };

  /* tenants provisioned on the platform — developers, contractors,
     engineering consultancies, manufacturers, architects */
  const COMPANIES = [
    /* ── Developers ── */
    { tid: 'TEN-0142', name: 'Heijmans Vastgoed',        domain: 'heijmans.nl',      plan: 'enterprise',   industry: 'developer',    status: 'active',    region: 'nl',      owner: 'Mark Heijmans',       seatsUsed: 138, seatsTotal: 150, projects: 24, onboarded: '2024-02-18', lastActive: '2026-06-09' },
    { tid: 'TEN-0118', name: 'BAM Wonen',                domain: 'bam.com',          plan: 'enterprise',   industry: 'developer',    status: 'active',    region: 'nl',      owner: 'Petra de Vries',      seatsUsed: 96,  seatsTotal: 120, projects: 31, onboarded: '2023-11-04', lastActive: '2026-06-08' },
    { tid: 'TEN-0207', name: 'VolkerWessels',            domain: 'volkerwessels.com',plan: 'enterprise',   industry: 'developer',    status: 'active',    region: 'nl',      owner: 'Joost Wessels',       seatsUsed: 142, seatsTotal: 150, projects: 28, onboarded: '2024-01-22', lastActive: '2026-06-09' },
    { tid: 'TEN-0233', name: 'Dura Vermeer',             domain: 'duravermeer.nl',   plan: 'professional', industry: 'developer',    status: 'active',    region: 'nl',      owner: 'Anouk Vermeer',       seatsUsed: 34,  seatsTotal: 40,  projects: 17, onboarded: '2024-05-09', lastActive: '2026-06-07' },
    { tid: 'TEN-0288', name: 'AM Real Estate',           domain: 'am.nl',            plan: 'professional', industry: 'developer',    status: 'active',    region: 'nl',      owner: 'Sander Bakker',       seatsUsed: 22,  seatsTotal: 40,  projects: 11, onboarded: '2024-09-15', lastActive: '2026-06-05' },
    { tid: 'TEN-0301', name: 'Amvest',                   domain: 'amvest.nl',        plan: 'professional', industry: 'developer',    status: 'active',    region: 'nl',      owner: 'Lieke Jansen',        seatsUsed: 18,  seatsTotal: 25,  projects: 8,  onboarded: '2025-01-28', lastActive: '2026-06-04' },
    { tid: 'TEN-0344', name: 'Synchroon',                domain: 'synchroon.nl',     plan: 'team',         industry: 'developer',    status: 'active',    region: 'nl',      owner: 'Tom Visser',          seatsUsed: 11,  seatsTotal: 15,  projects: 6,  onboarded: '2025-03-12', lastActive: '2026-05-30' },
    { tid: 'TEN-0362', name: 'G&S Vastgoed',             domain: 'gs-vastgoed.nl',   plan: 'team',         industry: 'developer',    status: 'active',    region: 'nl',      owner: 'Ruben Smit',          seatsUsed: 9,   seatsTotal: 15,  projects: 5,  onboarded: '2025-04-02', lastActive: '2026-05-27' },
    { tid: 'TEN-0419', name: 'Steck',                    domain: 'steck.nl',         plan: 'trial',        industry: 'developer',    status: 'trial',     region: 'nl',      owner: 'Emma Hofman',         seatsUsed: 3,   seatsTotal: 5,   projects: 1,  onboarded: '2026-05-21', lastActive: '2026-06-06' },

    /* ── Contractors ── */
    { tid: 'TEN-0156', name: 'Ballast Nedam',            domain: 'ballast-nedam.nl', plan: 'enterprise',   industry: 'contractor',   status: 'active',    region: 'nl',      owner: 'Daan Mulder',         seatsUsed: 74,  seatsTotal: 100, projects: 19, onboarded: '2023-12-11', lastActive: '2026-06-08' },
    { tid: 'TEN-0174', name: 'TBI Bouw',                 domain: 'tbi.nl',           plan: 'enterprise',   industry: 'contractor',   status: 'active',    region: 'nl',      owner: 'Karin Brouwer',       seatsUsed: 61,  seatsTotal: 80,  projects: 22, onboarded: '2024-03-06', lastActive: '2026-06-09' },
    { tid: 'TEN-0259', name: 'Strukton',                 domain: 'strukton.com',     plan: 'professional', industry: 'contractor',   status: 'active',    region: 'nl',      owner: 'Bram Kok',            seatsUsed: 28,  seatsTotal: 40,  projects: 13, onboarded: '2024-07-19', lastActive: '2026-06-02' },
    { tid: 'TEN-0398', name: 'Janssen de Jong',          domain: 'jajo.com',         plan: 'professional', industry: 'contractor',   status: 'suspended', region: 'nl',      owner: 'Niels de Jong',       seatsUsed: 16,  seatsTotal: 40,  projects: 7,  onboarded: '2024-10-30', lastActive: '2026-04-14' },

    /* ── Engineering consultancies ── */
    { tid: 'TEN-0131', name: 'Arcadis',                  domain: 'arcadis.com',      plan: 'enterprise',   industry: 'engineering',  status: 'active',    region: 'nl',      owner: 'Fleur Hendriks',      seatsUsed: 118, seatsTotal: 150, projects: 26, onboarded: '2023-10-17', lastActive: '2026-06-09' },
    { tid: 'TEN-0149', name: 'Royal HaskoningDHV',       domain: 'rhdhv.com',        plan: 'enterprise',   industry: 'engineering',  status: 'active',    region: 'nl',      owner: 'Wouter Dijkstra',     seatsUsed: 89,  seatsTotal: 100, projects: 21, onboarded: '2024-01-09', lastActive: '2026-06-07' },
    { tid: 'TEN-0276', name: 'Witteveen+Bos',            domain: 'witteveenbos.com', plan: 'professional', industry: 'engineering',  status: 'active',    region: 'nl',      owner: 'Maaike Bos',          seatsUsed: 31,  seatsTotal: 40,  projects: 14, onboarded: '2024-06-25', lastActive: '2026-06-06' },
    { tid: 'TEN-0355', name: 'IMd Raadgevende Ingenieurs',domain: 'imdbv.nl',        plan: 'team',         industry: 'engineering',  status: 'active',    region: 'nl',      owner: 'Joris Meijer',        seatsUsed: 12,  seatsTotal: 15,  projects: 9,  onboarded: '2025-02-20', lastActive: '2026-06-03' },
    { tid: 'TEN-0387', name: 'Pieters Bouwtechniek',     domain: 'pieters.net',      plan: 'professional', industry: 'engineering',  status: 'active',    region: 'nl',      owner: 'Sophie Pieters',      seatsUsed: 19,  seatsTotal: 25,  projects: 10, onboarded: '2024-11-12', lastActive: '2026-05-29' },

    /* ── Manufacturers ── */
    { tid: 'TEN-0211', name: 'Betonson',                 domain: 'betonson.com',     plan: 'professional', industry: 'manufacturer', status: 'active',    region: 'nl',      owner: 'Hans Aalbers',        seatsUsed: 24,  seatsTotal: 25,  projects: 12, onboarded: '2024-04-15', lastActive: '2026-06-08' },
    { tid: 'TEN-0245', name: 'VBI',                      domain: 'vbi.nl',           plan: 'professional', industry: 'manufacturer', status: 'active',    region: 'nl',      owner: 'Iris van Dijk',       seatsUsed: 17,  seatsTotal: 25,  projects: 15, onboarded: '2024-08-08', lastActive: '2026-06-05' },
    { tid: 'TEN-0312', name: 'Reynaers Aluminium',       domain: 'reynaers.com',     plan: 'professional', industry: 'manufacturer', status: 'active',    region: 'be',      owner: 'Lucas Maes',          seatsUsed: 21,  seatsTotal: 40,  projects: 9,  onboarded: '2025-01-15', lastActive: '2026-06-01' },
    { tid: 'TEN-0421', name: 'Stora Enso',               domain: 'storaenso.com',    plan: 'team',         industry: 'manufacturer', status: 'trial',     region: 'nordics', owner: 'Elin Johansson',      seatsUsed: 4,   seatsTotal: 10,  projects: 2,  onboarded: '2026-05-26', lastActive: '2026-06-08' },
    { tid: 'TEN-0290', name: 'Wienerberger',             domain: 'wienerberger.com', plan: 'professional', industry: 'manufacturer', status: 'churned',   region: 'be',      owner: 'Stefan Peeters',      seatsUsed: 0,   seatsTotal: 25,  projects: 4,  onboarded: '2024-09-03', lastActive: '2025-12-19' },

    /* ── Architects ── */
    { tid: 'TEN-0338', name: 'Mecanoo',                  domain: 'mecanoo.nl',       plan: 'team',         industry: 'architect',    status: 'active',    region: 'nl',      owner: 'Francine Houben',     seatsUsed: 13,  seatsTotal: 15,  projects: 7,  onboarded: '2025-02-04', lastActive: '2026-06-04' },
    { tid: 'TEN-0371', name: 'MVRDV',                    domain: 'mvrdv.com',        plan: 'professional', industry: 'architect',    status: 'active',    region: 'nl',      owner: 'Winy Maas',           seatsUsed: 23,  seatsTotal: 25,  projects: 6,  onboarded: '2024-12-01', lastActive: '2026-05-31' },
    { tid: 'TEN-0433', name: 'KCAP',                     domain: 'kcap.eu',          plan: 'trial',        industry: 'architect',    status: 'invited',   region: 'nl',      owner: 'Ruurd Gietema',       seatsUsed: 0,   seatsTotal: 5,   projects: 0,  onboarded: '2026-06-04', lastActive: null }
  ];

  /* ---- helpers ---- */
  function daysAgo(iso) { if (!iso) return Infinity; return Math.round((TODAY - new Date(iso + 'T00:00:00')) / 86400000); }
  function fmtDate(iso) {
    if (!iso) return '—';
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const d = new Date(iso + 'T00:00:00');
    return d.getDate() + ' ' + M[d.getMonth()] + ' ' + d.getFullYear();
  }
  function initials(name) {
    const clean = name.replace(/[^A-Za-z0-9 &+]/g, '').trim().split(/[ &+]+/).filter(Boolean);
    if (clean.length === 1) return clean[0].slice(0, 2).toUpperCase();
    return (clean[0][0] + clean[1][0]).toUpperCase();
  }

  /* ---- expose data + facet helpers for the filter sidebar ---- */
  window.VBG_COMPANIES = {
    DATA: COMPANIES,
    INDUSTRIES: INDUSTRIES,
    STATUS_LABEL: STATUS_LABEL,
    PLAN_LABEL: PLAN_LABEL,
    REGION_LABEL: REGION_LABEL,
    daysAgo: daysAgo,
    fmtDate: fmtDate,
    count: function (pred) { return COMPANIES.filter(pred).length; }
  };

  const STYLE = `
    vbg-companies-table { display: block; }
    vbg-companies-table .ctable { width: 100%; border-collapse: collapse; table-layout: fixed; }
    vbg-companies-table thead th {
      text-align: left; font: var(--text-label); text-transform: uppercase;
      letter-spacing: var(--tracking-overline); color: var(--fg3);
      border-bottom: 1px solid var(--border-subtle);
      padding: 12px 20px; white-space: nowrap; user-select: none;
      position: sticky; top: 0; z-index: 2; background: var(--bg-surface);
    }
    vbg-companies-table thead th.th-avatar { width: 64px; }
    vbg-companies-table thead th.th-plan { width: 132px; }
    vbg-companies-table thead th.th-industry { width: 150px; }
    vbg-companies-table thead th.th-status { width: 124px; }
    vbg-companies-table thead th.th-seats { width: 168px; }
    vbg-companies-table thead th.th-projects { width: 96px; text-align: right; }
    vbg-companies-table thead th.th-active { width: 132px; }
    vbg-companies-table thead th.th-actions { width: 56px; text-align: right; }
    vbg-companies-table tbody tr {
      border-bottom: 1px solid var(--border-subtle);
      transition: background var(--dur-fast) var(--ease-out);
      cursor: pointer;
    }
    vbg-companies-table tbody tr:last-child { border-bottom: 0; }
    vbg-companies-table tbody tr:hover { background: var(--vbg-amber-50); }
    vbg-companies-table tbody tr.menu-open { background: var(--vbg-amber-50); }
    vbg-companies-table td { padding: 13px 20px; vertical-align: middle; }
    vbg-companies-table td:first-child { padding: 13px 6px 13px 20px; }
    vbg-companies-table td.actions-cell { padding: 13px 16px 13px 8px; }

    vbg-companies-table .avatar-tile {
      width: 38px; height: 38px; border-radius: var(--r-sm);
      background: var(--bg-sunken); border: 1px solid var(--border-subtle);
      display: grid; place-items: center;
      font: var(--text-label); font-weight: 600; color: var(--fg2);
      letter-spacing: 0.01em;
    }
    vbg-companies-table tr.is-inactive .avatar-tile { color: var(--fg4); }

    vbg-companies-table .cname { font: var(--text-body-strong); color: var(--fg1); line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    vbg-companies-table .cmeta {
      font: var(--text-mono-sm); color: var(--fg4); margin-top: 3px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    vbg-companies-table .cmeta .dom { color: var(--fg3); }
    vbg-companies-table .cmeta .sep { color: var(--border-strong); margin: 0 6px; }

    /* plan pill */
    vbg-companies-table .plan {
      display: inline-flex; align-items: center;
      font: var(--text-label); padding: 4px 10px; border-radius: var(--r-full);
      white-space: nowrap; border: 1px solid transparent;
    }
    vbg-companies-table .plan.enterprise { background: var(--vbg-amber-100); color: var(--fg-accent); }
    vbg-companies-table .plan.professional { background: var(--slate-100); color: var(--fg2); }
    vbg-companies-table .plan.team { background: transparent; border-color: var(--border); color: var(--fg2); }
    vbg-companies-table .plan.trial { background: transparent; border: 1px dashed var(--border-strong); color: var(--fg3); }

    /* industry badge */
    vbg-companies-table .ind-badge {
      display: inline-flex; align-items: center; gap: 7px;
      font: var(--text-label); padding: 4px 10px 4px 9px; border-radius: var(--r-full);
      background: var(--slate-100); color: var(--fg2); white-space: nowrap;
    }
    vbg-companies-table .ind-badge svg { display: block; color: var(--fg3); }

    /* status badge */
    vbg-companies-table .badge {
      display: inline-flex; align-items: center; gap: 6px;
      font: var(--text-label); padding: 4px 10px; border-radius: var(--r-full);
      white-space: nowrap;
    }
    vbg-companies-table .badge .dot { width: 7px; height: 7px; border-radius: var(--r-full); }
    vbg-companies-table .badge.active { background: var(--status-success-bg); color: var(--status-success-fg); }
    vbg-companies-table .badge.active .dot { background: var(--status-success); }
    vbg-companies-table .badge.trial { background: var(--status-info-bg); color: var(--status-info-fg); }
    vbg-companies-table .badge.trial .dot { background: var(--status-info); }
    vbg-companies-table .badge.invited { background: var(--status-pending-bg); color: var(--status-pending-fg); }
    vbg-companies-table .badge.invited .dot { background: var(--status-pending); }
    vbg-companies-table .badge.suspended { background: var(--status-warning-bg); color: var(--status-warning-fg); }
    vbg-companies-table .badge.suspended .dot { background: var(--status-warning); }
    vbg-companies-table .badge.churned { background: var(--status-error-bg); color: var(--status-error-fg); }
    vbg-companies-table .badge.churned .dot { background: var(--status-error); }

    /* seats */
    vbg-companies-table .seats { display: flex; flex-direction: column; gap: 5px; max-width: 130px; }
    vbg-companies-table .seats .sline { display: flex; align-items: baseline; gap: 5px; }
    vbg-companies-table .seats .sused { font: var(--text-mono); color: var(--fg1); }
    vbg-companies-table .seats .stotal { font: var(--text-mono-sm); color: var(--fg4); }
    vbg-companies-table .seats .strack { height: 5px; border-radius: var(--r-full); background: var(--slate-150); overflow: hidden; }
    vbg-companies-table .seats .sfill { height: 100%; border-radius: var(--r-full); background: var(--vbg-amber); }
    vbg-companies-table .seats.near .sfill { background: var(--status-warning); }
    vbg-companies-table .seats.empty .sused { color: var(--fg4); }
    vbg-companies-table .seats.empty .sfill { background: var(--slate-300); }

    /* projects */
    vbg-companies-table .proj { font: var(--text-mono); color: var(--fg1); text-align: right; display: block; }
    vbg-companies-table .proj.zero { color: var(--fg4); }

    /* last active */
    vbg-companies-table .cell-act { font: var(--text-sm); color: var(--fg2); white-space: nowrap; }
    vbg-companies-table .cell-act .ago { font: var(--text-caption); color: var(--fg4); display: block; margin-top: 1px; }
    vbg-companies-table .cell-act.never { color: var(--fg4); }

    vbg-companies-table .actions-cell { text-align: right; position: relative; }
    vbg-companies-table .kebab {
      width: 32px; height: 32px; border-radius: var(--r-sm);
      border: 1px solid transparent; background: transparent;
      display: inline-grid; place-items: center; color: var(--fg3); cursor: pointer;
      transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
    }
    vbg-companies-table .kebab:hover { background: var(--bg-surface); border-color: var(--border); color: var(--fg1); }
    vbg-companies-table tr:hover .kebab { color: var(--fg2); }
    vbg-companies-table .kebab.active { background: var(--bg-surface); border-color: var(--border); color: var(--fg1); }
    vbg-companies-table .menu {
      position: absolute; top: calc(100% - 4px); right: 20px; z-index: 40;
      min-width: 198px; background: var(--bg-raised);
      border: 1px solid var(--border); border-radius: var(--r-md);
      box-shadow: var(--shadow-pop); padding: 5px;
      display: none; flex-direction: column; gap: 1px;
    }
    vbg-companies-table .menu.open { display: flex; animation: vbgCMenuIn var(--dur-fast) var(--ease-out); }
    @keyframes vbgCMenuIn { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: none; } }
    vbg-companies-table .menu button {
      display: flex; align-items: center; gap: 10px; width: 100%;
      border: 0; background: transparent; cursor: pointer; text-align: left;
      font: var(--text-body); color: var(--fg1);
      padding: 8px 10px; border-radius: var(--r-sm);
      transition: background var(--dur-fast) var(--ease-out);
    }
    vbg-companies-table .menu button .ico { display: inline-flex; color: var(--fg3); }
    vbg-companies-table .menu button .ico svg { display: block; }
    vbg-companies-table .menu button:hover { background: var(--bg-hover); }
    vbg-companies-table .menu button.danger { color: var(--status-error-fg); }
    vbg-companies-table .menu button.danger .ico { color: var(--status-error); }
    vbg-companies-table .menu button.danger:hover { background: var(--status-error-bg); }
    vbg-companies-table .menu .sep { height: 1px; background: var(--border-subtle); margin: 4px 2px; }

    vbg-companies-table .empty { padding: 64px 20px; text-align: center; color: var(--fg3); }
    vbg-companies-table .empty .et { font: var(--text-h3); color: var(--fg2); margin-bottom: 6px; }
    vbg-companies-table .empty .es { font: var(--text-sm); }

    /* compact mode for dashboard embed */
    vbg-companies-table .ctable-compact { table-layout: auto; }
    vbg-companies-table .ctable-compact td { padding: 10px 16px; }
    vbg-companies-table .ctable-compact .avatar { width: 28px; height: 28px; font-size: 11px; }
  `;

  function injectStyle() {
    if (document.getElementById('vbg-companies-table-style')) return;
    const s = document.createElement('style');
    s.id = 'vbg-companies-table-style';
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  const OPEN_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';
  const SEATS_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
  const COPY_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
  const SUSPEND_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>';
  const RESTORE_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';

  function avatarTile(c) {
    return '<span class="avatar-tile">' + esc(initials(c.name)) + '</span>';
  }

  function indBadge(ind) {
    const i = INDUSTRIES[ind] || { label: ind, glyph: '' };
    return '<span class="ind-badge"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + i.glyph + '</svg>' + esc(i.label) + '</span>';
  }

  function planPill(plan) {
    return '<span class="plan ' + plan + '">' + (PLAN_LABEL[plan] || plan) + '</span>';
  }

  function seatsCell(c) {
    if (!c.seatsUsed) {
      return '<div class="seats empty"><div class="sline"><span class="sused">—</span><span class="stotal">of ' + c.seatsTotal + '</span></div>'
        + '<div class="strack"><span class="sfill" style="width:0%"></span></div></div>';
    }
    const ratio = c.seatsUsed / c.seatsTotal;
    const near = ratio >= 0.9 ? ' near' : '';
    const pct = Math.min(100, Math.round(ratio * 100));
    return '<div class="seats' + near + '"><div class="sline"><span class="sused">' + c.seatsUsed + '</span><span class="stotal">/ ' + c.seatsTotal + ' seats</span></div>'
      + '<div class="strack"><span class="sfill" style="width:' + pct + '%"></span></div></div>';
  }

  function relLabel(iso) {
    if (!iso) return 'never';
    const d = daysAgo(iso);
    if (d <= 0) return 'today';
    if (d === 1) return 'yesterday';
    if (d < 30) return d + ' days ago';
    if (d < 60) return 'last month';
    const mo = Math.round(d / 30);
    if (mo < 12) return mo + ' months ago';
    return 'over a year ago';
  }

  function rowHtml(c, i) {
    const inactive = (c.status === 'suspended' || c.status === 'churned' || c.status === 'invited');
    const projZero = c.projects === 0 ? ' zero' : '';
    const actNever = !c.lastActive ? ' never' : '';
    const suspended = c.status === 'suspended';
    return ''
      + '<tr data-i="' + i + '"' + (inactive ? ' class="is-inactive"' : '') + '>'
      +   '<td>' + avatarTile(c) + '</td>'
      +   '<td><div class="cname">' + esc(c.name) + '</div>'
      +     '<div class="cmeta">' + esc(c.tid) + '<span class="sep">·</span><span class="dom">' + esc(c.domain) + '</span></div></td>'
      +   '<td>' + planPill(c.plan) + '</td>'
      +   '<td>' + indBadge(c.industry) + '</td>'
      +   '<td><span class="badge ' + c.status + '"><span class="dot"></span>' + STATUS_LABEL[c.status] + '</span></td>'
      +   '<td>' + seatsCell(c) + '</td>'
      +   '<td><span class="proj' + projZero + '">' + c.projects + '</span></td>'
      +   '<td><span class="cell-act' + actNever + '">' + fmtDate(c.lastActive) + '<span class="ago">' + relLabel(c.lastActive) + '</span></span></td>'
      +   '<td class="actions-cell">'
      +     '<button class="kebab" aria-label="Company actions" data-i="' + i + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg></button>'
      +     '<div class="menu" data-menu="' + i + '">'
      +       '<button data-act="detail" data-i="' + i + '"><span class="ico">' + OPEN_ICON + '</span>Open company</button>'
      +       '<button data-act="seats" data-i="' + i + '"><span class="ico">' + SEATS_ICON + '</span>Manage seats</button>'
      +       '<button data-act="copyid" data-i="' + i + '"><span class="ico">' + COPY_ICON + '</span>Copy tenant ID</button>'
      +       '<div class="sep"></div>'
      +       (suspended
        ? '<button data-act="restore" data-i="' + i + '"><span class="ico">' + RESTORE_ICON + '</span>Restore access</button>'
        : '<button class="danger" data-act="suspend" data-i="' + i + '"><span class="ico">' + SUSPEND_ICON + '</span>Suspend access</button>')
      +     '</div>'
      +   '</td>'
      + '</tr>';
  }

  function compactRowHtml(c, i) {
    return ''
      + '<tr data-i="' + i + '">'
      +   '<td>' + avatarTile(c) + '</td>'
      +   '<td><div class="cname">' + esc(c.name) + '</div>'
      +     '<div class="cmeta">' + esc(c.domain) + '</div></td>'
      +   '<td>' + planPill(c.plan) + '</td>'
      +   '<td><span class="badge ' + c.status + '"><span class="dot"></span>' + STATUS_LABEL[c.status] + '</span></td>'
      +   '<td><span class="cell-act">' + fmtDate(c.lastActive) + '</span></td>'
      + '</tr>';
  }

  function headHtml() {
    return '<thead><tr>'
      + '<th class="th-avatar"></th>'
      + '<th>Company</th>'
      + '<th class="th-plan">Plan</th>'
      + '<th class="th-industry">Industry</th>'
      + '<th class="th-status">Status</th>'
      + '<th class="th-seats">Seats</th>'
      + '<th class="th-projects">Projects</th>'
      + '<th class="th-active">Last active</th>'
      + '<th class="th-actions"></th>'
      + '</tr></thead>';
  }

  function matches(c, f) {
    if (!f) return true;
    if (f.search) {
      const q = f.search.toLowerCase();
      const hay = (c.name + ' ' + c.tid + ' ' + c.domain + ' ' + c.owner + ' ' + (REGION_LABEL[c.region] || '')).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    if (f.plan && f.plan.size && !f.plan.has(c.plan)) return false;
    if (f.industry && f.industry.size && !f.industry.has(c.industry)) return false;
    if (f.status && f.status.size && !f.status.has(c.status)) return false;
    if (f.region && f.region.size && !f.region.has(c.region)) return false;
    if (f.onboarded && f.onboarded !== 'any') {
      if (daysAgo(c.onboarded) > parseInt(f.onboarded, 10)) return false;
    }
    if (f.seats && f.seats !== 'any') {
      const ratio = c.seatsTotal ? c.seatsUsed / c.seatsTotal : 0;
      if (f.seats === 'capacity' && !(ratio < 0.75)) return false;
      if (f.seats === 'near' && !(ratio >= 0.9)) return false;
      if (f.seats === 'unused' && c.seatsUsed !== 0) return false;
    }
    return true;
  }

  class VbgCompaniesTable extends HTMLElement {
    connectedCallback() {
      injectStyle();
      this.data = COMPANIES.map(function (c) { return Object.assign({}, c); });
      this.filters = null;
      this.render();
      this._onClick = this.onClick.bind(this);
      this._onDocClick = this.onDocClick.bind(this);
      this._onKey = function (e) { if (e.key === 'Escape') this.closeMenu(); }.bind(this);
      this.addEventListener('click', this._onClick);
      document.addEventListener('click', this._onDocClick);
      document.addEventListener('keydown', this._onKey);
    }
    disconnectedCallback() {
      document.removeEventListener('click', this._onDocClick);
      document.removeEventListener('keydown', this._onKey);
    }

    setFilters(f) { this.filters = f; this.render(); }

    render() {
      const self = this;
      const compact = this.hasAttribute('compact');
      const limit = parseInt(this.getAttribute('limit'), 10);
      let visible = this.data.filter(function (c) { return matches(c, self.filters); });
      if (!isNaN(limit)) visible = visible.slice(0, limit);
      let body;
      if (visible.length === 0) {
        body = '<tbody><tr><td colspan="9"><div class="empty"><div class="et">No companies match the current filters</div>'
          + '<div class="es">Adjust plan, industry, status, region or seat usage to widen the results.</div></div></td></tr></tbody>';
      } else {
        body = '<tbody>' + visible.map(function (c) {
          return compact ? compactRowHtml(c, self.data.indexOf(c)) : rowHtml(c, self.data.indexOf(c));
        }).join('') + '</tbody>';
      }
      this.innerHTML = '<table class="ctable' + (compact ? ' ctable-compact' : '') + '">' + (compact ? '' : headHtml()) + body + '</table>';
      this.openMenu = null;
      this.dispatchEvent(new CustomEvent('companiesrender', {
        bubbles: true, detail: { visible: visible.length, total: this.data.length }
      }));
    }

    closeMenu() {
      if (!this.openMenu) return;
      this.openMenu.classList.remove('open');
      const tr = this.openMenu.closest('tr'); if (tr) tr.classList.remove('menu-open');
      const k = this.openMenu.parentElement.querySelector('.kebab'); if (k) k.classList.remove('active');
      this.openMenu = null;
    }

    onDocClick(e) {
      if (this.openMenu && !e.target.closest('.actions-cell')) this.closeMenu();
    }

    onClick(e) {
      const kebab = e.target.closest('.kebab');
      if (kebab) {
        e.stopPropagation();
        const menu = kebab.parentElement.querySelector('.menu');
        if (menu === this.openMenu) { this.closeMenu(); return; }
        this.closeMenu();
        menu.classList.add('open'); this.openMenu = menu;
        kebab.classList.add('active');
        kebab.closest('tr').classList.add('menu-open');
        return;
      }
      const item = e.target.closest('.menu button');
      if (item) {
        e.stopPropagation();
        const act = item.getAttribute('data-act');
        const i = +item.getAttribute('data-i');
        this.closeMenu();
        if (act === 'suspend') this.setStatus(i, 'suspended');
        else if (act === 'restore') this.setStatus(i, 'active');
        else if (act === 'copyid') this.copyId(i);
        else if (act === 'detail') this.goDetail(i, '');
        else if (act === 'seats') this.goDetail(i, 'members');
        return;
      }
      /* row click opens the company detail page */
      const tr = e.target.closest('tbody tr[data-i]');
      if (tr) { this.goDetail(+tr.getAttribute('data-i'), ''); }
    }

    goDetail(i, tab) {
      const c = this.data[i];
      if (!c) return;
      location.href = 'CompanyDetail.html?c=' + encodeURIComponent(c.tid) + (tab ? '#' + tab : '');
    }

    setStatus(i, status) {
      this.data[i].status = status;
      if (status === 'suspended') this.data[i].lastActive = this.data[i].lastActive;
      this.render();
    }

    copyId(i) {
      const id = this.data[i].tid;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(id).catch(function () {});
      }
    }
  }

  if (!customElements.get('vbg-companies-table')) {
    customElements.define('vbg-companies-table', VbgCompaniesTable);
  }
})();
