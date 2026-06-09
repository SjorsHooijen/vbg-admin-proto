/* ============================================================
   VBG — reusable billing & licensing table web component
   Usage:  <vbg-billing-table></vbg-billing-table>
   Columns: avatar tile · subscription (company + tenant id + domain) ·
            plan · subscription status · licenses (used / total + bar) ·
            billing (cycle + contract value) · renewal (date + countdown) ·
            payment status · actions (kebab)

   Each row is a tenant's subscription on the VBG platform. This is an
   admin billing & licensing surface: the kebab carries every
   subscription / license action; a row click opens the detail drawer.

   Renders into LIGHT DOM so screenshots / PDF / PPTX capture it.
   Styles scoped under `vbg-billing-table`, injected once.
   Relies on the global design tokens (styles/tokens.css).

   Data + facet helpers are exposed on window.VBG_BILLING so the page
   can build the filter sidebar, stats and modals from one source.
   The component reads `this.filters` (set via setFilters) and
   dispatches `billingrender` { visible, total } after every render,
   plus `billingopen` { id, tab } on a row click.
   ============================================================ */
(function () {
  /* "today" — keep in sync with project date */
  const NOW = new Date('2026-06-09T00:00:00');

  /* ---- plan tiers ---- */
  const PLAN_LABEL = { enterprise: 'Enterprise', professional: 'Professional', team: 'Team', trial: 'Trial' };
  const PLAN_RANK  = { trial: 0, team: 1, professional: 2, enterprise: 3 };
  const PRICE_SEAT = { enterprise: 1200, professional: 960, team: 720, trial: 0 }; /* €/seat/yr */

  const STATUS_LABEL = {
    active: 'Active', trial: 'Trial', pending: 'Pending', past_due: 'Past due',
    suspended: 'Suspended', canceled: 'Canceled'
  };
  const PAY_LABEL = { paid: 'Paid', pending: 'Pending', overdue: 'Overdue', failed: 'Failed', none: 'No charge' };
  const CYCLE_LABEL = { annual: 'Annual', monthly: 'Monthly' };

  /* ---- platform modules (feature entitlements) ---- */
  const MODULES = {
    intent:     { label: 'Intent authoring',          glyph: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M8 7h6"/><path d="M8 11h8"/>' },
    structural: { label: 'Structural analysis',        glyph: '<path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01"/><path d="M9 12v.01"/><path d="M9 15v.01"/>' },
    mep:        { label: 'MEP systems',                glyph: '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>' },
    facade:     { label: 'Façade engineering',         glyph: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/>' },
    production: { label: 'Production & fabrication',    glyph: '<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/>' },
    viz:        { label: 'Generated reality (3D)',     glyph: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>' },
    rules:      { label: 'Rules & constraints engine', glyph: '<path d="M16 16.5 21 19l-2 2-2.5-5"/><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>' },
    trace:      { label: 'Traceability & explainability', glyph: '<circle cx="12" cy="12" r="3"/><path d="M3 12h6"/><path d="M15 12h6"/>' },
    api:        { label: 'API & webhooks',             glyph: '<path d="M18 16.98h-5.99c-1.66 0-3.01-1.34-3.01-3s1.35-3 3.01-3H18"/><path d="m21 12-3-3v6z" fill="currentColor" stroke="none"/><circle cx="6" cy="14" r="3"/>' },
    advanced:   { label: 'Advanced generation compute', glyph: '<path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/>' }
  };
  /* modules included per plan tier */
  const PLAN_MODULES = {
    enterprise:   ['intent','structural','mep','facade','production','viz','rules','trace','api','advanced'],
    professional: ['intent','structural','mep','viz','rules','trace','api'],
    team:         ['intent','structural','viz','rules'],
    trial:        ['intent','structural','viz']
  };
  /* monthly quotas per plan tier */
  const PLAN_QUOTAS = {
    enterprise:   { generation: 5000, compute: 2000, storage: 2000, api: 1000000 },
    professional: { generation: 1500, compute: 600,  storage: 500,  api: 250000 },
    team:         { generation: 500,  compute: 200,  storage: 150,  api: 50000 },
    trial:        { generation: 50,   compute: 20,   storage: 10,   api: 5000 }
  };

  /* ---- subscriptions (one per tenant; roster mirrors the Companies page) ---- */
  const SUBS = [
    /* ── Enterprise ── */
    { tid: 'TEN-0142', name: 'Heijmans Vastgoed',          domain: 'heijmans.nl',       plan: 'enterprise',   status: 'active',    cycle: 'annual',  seatsUsed: 138, seatsTotal: 150, addOn: 10, contractStart: '2024-02-18', contractEnd: '2027-02-18', renewal: '2027-02-18', paymentStatus: 'paid',    autoRenew: true,  contact: 'Mark Heijmans',     email: 'm.heijmans@heijmans.nl' },
    { tid: 'TEN-0118', name: 'BAM Wonen',                  domain: 'bam.com',           plan: 'enterprise',   status: 'active',    cycle: 'annual',  seatsUsed: 96,  seatsTotal: 120, addOn: 0,  contractStart: '2023-11-04', contractEnd: '2026-11-04', renewal: '2026-11-04', paymentStatus: 'paid',    autoRenew: true,  contact: 'Petra de Vries',    email: 'p.devries@bam.com' },
    { tid: 'TEN-0207', name: 'VolkerWessels',              domain: 'volkerwessels.com', plan: 'enterprise',   status: 'active',    cycle: 'annual',  seatsUsed: 142, seatsTotal: 150, addOn: 20, contractStart: '2024-01-22', contractEnd: '2026-07-01', renewal: '2026-07-01', paymentStatus: 'pending', autoRenew: true,  contact: 'Joost Wessels',     email: 'j.wessels@volkerwessels.com' },
    { tid: 'TEN-0131', name: 'Arcadis',                    domain: 'arcadis.com',       plan: 'enterprise',   status: 'active',    cycle: 'annual',  seatsUsed: 118, seatsTotal: 150, addOn: 0,  contractStart: '2023-10-17', contractEnd: '2026-10-17', renewal: '2026-10-17', paymentStatus: 'paid',    autoRenew: true,  contact: 'Fleur Hendriks',    email: 'f.hendriks@arcadis.com' },
    { tid: 'TEN-0149', name: 'Royal HaskoningDHV',         domain: 'rhdhv.com',         plan: 'enterprise',   status: 'active',    cycle: 'annual',  seatsUsed: 89,  seatsTotal: 100, addOn: 0,  contractStart: '2024-01-09', contractEnd: '2026-06-25', renewal: '2026-06-25', paymentStatus: 'paid',    autoRenew: true,  contact: 'Wouter Dijkstra',   email: 'w.dijkstra@rhdhv.com' },
    { tid: 'TEN-0156', name: 'Ballast Nedam',              domain: 'ballast-nedam.nl',  plan: 'enterprise',   status: 'active',    cycle: 'annual',  seatsUsed: 74,  seatsTotal: 100, addOn: 0,  contractStart: '2023-12-11', contractEnd: '2026-12-11', renewal: '2026-12-11', paymentStatus: 'paid',    autoRenew: true,  contact: 'Daan Mulder',       email: 'd.mulder@ballast-nedam.nl' },
    { tid: 'TEN-0174', name: 'TBI Bouw',                   domain: 'tbi.nl',            plan: 'enterprise',   status: 'past_due',  cycle: 'annual',  seatsUsed: 61,  seatsTotal: 80,  addOn: 0,  contractStart: '2024-03-06', contractEnd: '2026-06-30', renewal: '2026-06-30', paymentStatus: 'overdue', autoRenew: true,  contact: 'Karin Brouwer',     email: 'k.brouwer@tbi.nl' },

    /* ── Professional ── */
    { tid: 'TEN-0233', name: 'Dura Vermeer',               domain: 'duravermeer.nl',    plan: 'professional', status: 'active',    cycle: 'annual',  seatsUsed: 34,  seatsTotal: 40,  addOn: 0,  contractStart: '2024-05-09', contractEnd: '2027-05-09', renewal: '2027-05-09', paymentStatus: 'paid',    autoRenew: true,  contact: 'Anouk Vermeer',     email: 'a.vermeer@duravermeer.nl' },
    { tid: 'TEN-0288', name: 'AM Real Estate',             domain: 'am.nl',             plan: 'professional', status: 'active',    cycle: 'monthly', seatsUsed: 22,  seatsTotal: 40,  addOn: 0,  contractStart: '2024-09-15', contractEnd: '2026-09-15', renewal: '2026-07-15', paymentStatus: 'paid',    autoRenew: true,  contact: 'Sander Bakker',     email: 's.bakker@am.nl' },
    { tid: 'TEN-0259', name: 'Strukton',                   domain: 'strukton.com',      plan: 'professional', status: 'active',    cycle: 'annual',  seatsUsed: 28,  seatsTotal: 40,  addOn: 0,  contractStart: '2024-07-19', contractEnd: '2026-07-19', renewal: '2026-07-19', paymentStatus: 'paid',    autoRenew: true,  contact: 'Bram Kok',          email: 'b.kok@strukton.com' },
    { tid: 'TEN-0276', name: 'Witteveen+Bos',             domain: 'witteveenbos.com',  plan: 'professional', status: 'active',    cycle: 'annual',  seatsUsed: 31,  seatsTotal: 40,  addOn: 0,  contractStart: '2024-06-25', contractEnd: '2026-12-25', renewal: '2026-12-25', paymentStatus: 'paid',    autoRenew: true,  contact: 'Maaike Bos',        email: 'm.bos@witteveenbos.com' },
    { tid: 'TEN-0387', name: 'Pieters Bouwtechniek',       domain: 'pieters.net',       plan: 'professional', status: 'active',    cycle: 'monthly', seatsUsed: 19,  seatsTotal: 25,  addOn: 0,  contractStart: '2024-11-12', contractEnd: '2026-11-12', renewal: '2026-08-12', paymentStatus: 'paid',    autoRenew: false, contact: 'Sophie Pieters',    email: 's.pieters@pieters.net' },
    { tid: 'TEN-0211', name: 'Betonson',                   domain: 'betonson.com',      plan: 'professional', status: 'active',    cycle: 'annual',  seatsUsed: 24,  seatsTotal: 25,  addOn: 5,  contractStart: '2024-04-15', contractEnd: '2027-04-15', renewal: '2027-04-15', paymentStatus: 'paid',    autoRenew: true,  contact: 'Hans Aalbers',      email: 'h.aalbers@betonson.com' },
    { tid: 'TEN-0245', name: 'VBI',                        domain: 'vbi.nl',            plan: 'professional', status: 'active',    cycle: 'annual',  seatsUsed: 17,  seatsTotal: 25,  addOn: 0,  contractStart: '2024-08-08', contractEnd: '2026-08-08', renewal: '2026-08-08', paymentStatus: 'paid',    autoRenew: true,  contact: 'Iris van Dijk',     email: 'i.vandijk@vbi.nl' },
    { tid: 'TEN-0312', name: 'Reynaers Aluminium',         domain: 'reynaers.com',      plan: 'professional', status: 'active',    cycle: 'monthly', seatsUsed: 21,  seatsTotal: 40,  addOn: 0,  contractStart: '2025-01-15', contractEnd: '2026-07-15', renewal: '2026-06-22', paymentStatus: 'pending', autoRenew: true,  contact: 'Lucas Maes',        email: 'l.maes@reynaers.com' },
    { tid: 'TEN-0371', name: 'MVRDV',                      domain: 'mvrdv.com',         plan: 'professional', status: 'active',    cycle: 'annual',  seatsUsed: 23,  seatsTotal: 25,  addOn: 0,  contractStart: '2024-12-01', contractEnd: '2026-12-01', renewal: '2026-12-01', paymentStatus: 'paid',    autoRenew: true,  contact: 'Winy Maas',         email: 'w.maas@mvrdv.com' },
    { tid: 'TEN-0398', name: 'Janssen de Jong',            domain: 'jajo.com',          plan: 'professional', status: 'suspended', cycle: 'annual',  seatsUsed: 16,  seatsTotal: 40,  addOn: 0,  contractStart: '2024-10-30', contractEnd: '2026-10-30', renewal: '2026-10-30', paymentStatus: 'overdue', autoRenew: false, contact: 'Niels de Jong',     email: 'n.dejong@jajo.com' },
    { tid: 'TEN-0290', name: 'Wienerberger',               domain: 'wienerberger.com',  plan: 'professional', status: 'canceled',  cycle: 'annual',  seatsUsed: 0,   seatsTotal: 25,  addOn: 0,  contractStart: '2024-09-03', contractEnd: '2025-12-19', renewal: null,        paymentStatus: 'none',    autoRenew: false, contact: 'Stefan Peeters',    email: 's.peeters@wienerberger.com' },

    /* ── Team ── */
    { tid: 'TEN-0344', name: 'Synchroon',                  domain: 'synchroon.nl',      plan: 'team',         status: 'active',    cycle: 'monthly', seatsUsed: 11,  seatsTotal: 15,  addOn: 0,  contractStart: '2025-03-12', contractEnd: '2026-09-12', renewal: '2026-07-12', paymentStatus: 'paid',    autoRenew: true,  contact: 'Tom Visser',        email: 't.visser@synchroon.nl' },
    { tid: 'TEN-0362', name: 'G&S Vastgoed',               domain: 'gs-vastgoed.nl',    plan: 'team',         status: 'active',    cycle: 'monthly', seatsUsed: 9,   seatsTotal: 15,  addOn: 0,  contractStart: '2025-04-02', contractEnd: '2026-10-02', renewal: '2026-08-02', paymentStatus: 'paid',    autoRenew: true,  contact: 'Ruben Smit',        email: 'r.smit@gs-vastgoed.nl' },
    { tid: 'TEN-0355', name: 'IMd Raadgevende Ingenieurs', domain: 'imdbv.nl',          plan: 'team',         status: 'active',    cycle: 'annual',  seatsUsed: 12,  seatsTotal: 15,  addOn: 0,  contractStart: '2025-02-20', contractEnd: '2027-02-20', renewal: '2027-02-20', paymentStatus: 'paid',    autoRenew: true,  contact: 'Joris Meijer',      email: 'j.meijer@imdbv.nl' },
    { tid: 'TEN-0338', name: 'Mecanoo',                    domain: 'mecanoo.nl',        plan: 'team',         status: 'active',    cycle: 'monthly', seatsUsed: 13,  seatsTotal: 15,  addOn: 0,  contractStart: '2025-02-04', contractEnd: '2026-08-04', renewal: '2026-07-04', paymentStatus: 'failed',  autoRenew: true,  contact: 'Francine Houben',   email: 'f.houben@mecanoo.nl' },

    /* ── Trial / pending ── */
    { tid: 'TEN-0419', name: 'Steck',                      domain: 'steck.nl',          plan: 'trial',        status: 'trial',     cycle: 'monthly', seatsUsed: 3,   seatsTotal: 5,   addOn: 0,  contractStart: '2026-05-21', contractEnd: '2026-06-20', renewal: '2026-06-20', paymentStatus: 'none',    autoRenew: false, contact: 'Emma Hofman',       email: 'e.hofman@steck.nl' },
    { tid: 'TEN-0421', name: 'Stora Enso',                 domain: 'storaenso.com',     plan: 'trial',        status: 'trial',     cycle: 'monthly', seatsUsed: 4,   seatsTotal: 10,  addOn: 0,  contractStart: '2026-05-26', contractEnd: '2026-06-25', renewal: '2026-06-25', paymentStatus: 'none',    autoRenew: false, contact: 'Elin Johansson',    email: 'e.johansson@storaenso.com' },
    { tid: 'TEN-0433', name: 'KCAP',                       domain: 'kcap.eu',           plan: 'trial',        status: 'pending',   cycle: 'monthly', seatsUsed: 0,   seatsTotal: 5,   addOn: 0,  contractStart: '2026-06-04', contractEnd: '2026-07-04', renewal: '2026-07-04', paymentStatus: 'none',    autoRenew: false, contact: 'Ruurd Gietema',     email: 'r.gietema@kcap.eu' }
  ];

  /* ---- helpers ---- */
  function daysBetween(iso) { if (!iso) return null; return Math.round((new Date(iso + 'T00:00:00') - NOW) / 86400000); }
  function daysAgo(iso) { if (!iso) return Infinity; return Math.round((NOW - new Date(iso + 'T00:00:00')) / 86400000); }
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear();
  }
  function fmtMoney(n) {
    if (!n) return '€0';
    return '€' + Math.round(n).toLocaleString('en-US').replace(/,/g, ' ');
  }
  function acvOf(s) { return s.seatsTotal * PRICE_SEAT[s.plan]; }
  function mrrOf(s) { /* recognised monthly recurring revenue */
    if (s.status === 'canceled' || s.status === 'trial' || s.status === 'pending') return 0;
    return acvOf(s) / 12;
  }
  function renewLabel(iso) {
    const d = daysBetween(iso);
    if (d == null) return { txt: 'No renewal', tone: 'none' };
    if (d < 0) return { txt: Math.abs(d) + ' days overdue', tone: 'over' };
    if (d === 0) return { txt: 'due today', tone: 'soon' };
    if (d <= 30) return { txt: 'in ' + d + ' days', tone: 'soon' };
    if (d <= 90) return { txt: 'in ' + d + ' days', tone: 'near' };
    const mo = Math.round(d / 30);
    return { txt: 'in ' + mo + ' months', tone: 'far' };
  }

  /* ---- expose data + facet helpers ---- */
  window.VBG_BILLING = {
    DATA: SUBS,
    PLAN_LABEL: PLAN_LABEL, PLAN_RANK: PLAN_RANK, PRICE_SEAT: PRICE_SEAT,
    STATUS_LABEL: STATUS_LABEL, PAY_LABEL: PAY_LABEL, CYCLE_LABEL: CYCLE_LABEL,
    MODULES: MODULES, PLAN_MODULES: PLAN_MODULES, PLAN_QUOTAS: PLAN_QUOTAS,
    fmtDate: fmtDate, fmtMoney: fmtMoney, acvOf: acvOf, mrrOf: mrrOf,
    daysBetween: daysBetween, daysAgo: daysAgo, renewLabel: renewLabel,
    nowISO: function () { return '2026-06-09'; },
    count: function (pred) { return SUBS.filter(pred).length; }
  };

  const STYLE = `
    vbg-billing-table { display: block; }
    vbg-billing-table .btable { width: 100%; border-collapse: collapse; table-layout: fixed; }
    vbg-billing-table thead th {
      text-align: left; font: var(--text-label); text-transform: uppercase;
      letter-spacing: var(--tracking-overline); color: var(--fg3);
      border-bottom: 1px solid var(--border-subtle);
      padding: 12px 20px; white-space: nowrap; user-select: none;
      position: sticky; top: 0; z-index: 2; background: var(--bg-surface);
    }
    vbg-billing-table thead th.th-tile { width: 60px; }
    vbg-billing-table thead th.th-plan { width: 132px; }
    vbg-billing-table thead th.th-status { width: 128px; }
    vbg-billing-table thead th.th-lic { width: 158px; }
    vbg-billing-table thead th.th-billing { width: 158px; text-align: right; }
    vbg-billing-table thead th.th-renewal { width: 150px; }
    vbg-billing-table thead th.th-pay { width: 118px; }
    vbg-billing-table thead th.th-actions { width: 56px; text-align: right; }

    vbg-billing-table tbody tr {
      border-bottom: 1px solid var(--border-subtle);
      transition: background var(--dur-fast) var(--ease-out);
      cursor: pointer;
    }
    vbg-billing-table tbody tr:last-child { border-bottom: 0; }
    vbg-billing-table tbody tr:hover { background: var(--vbg-amber-50); }
    vbg-billing-table tbody tr.menu-open { background: var(--vbg-amber-50); }
    vbg-billing-table tbody tr.flash { animation: vbgBRowFlash 1.4s var(--ease-out); }
    @keyframes vbgBRowFlash { 0% { background: var(--vbg-amber-100); } 100% { background: transparent; } }
    vbg-billing-table td { padding: 13px 20px; vertical-align: middle; }
    vbg-billing-table td:first-child { padding: 13px 6px 13px 20px; }
    vbg-billing-table td.actions-cell { padding: 13px 16px 13px 8px; }

    vbg-billing-table .avatar-tile {
      width: 38px; height: 38px; border-radius: var(--r-sm);
      background: var(--bg-sunken); border: 1px solid var(--border-subtle);
      display: grid; place-items: center; font: var(--text-label); font-weight: 600; color: var(--fg2);
    }
    vbg-billing-table tr.is-off .avatar-tile { color: var(--fg4); background: var(--bg-app); }

    vbg-billing-table .cname { font: var(--text-body-strong); color: var(--fg1); line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    vbg-billing-table tr.is-off .cname { color: var(--fg3); }
    vbg-billing-table .cmeta { font: var(--text-mono-sm); color: var(--fg4); margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    vbg-billing-table .cmeta .dom { color: var(--fg3); font-family: var(--font-sans); }
    vbg-billing-table .cmeta .sep { color: var(--border-strong); margin: 0 6px; }

    /* plan pill */
    vbg-billing-table .plan { display: inline-flex; align-items: center; font: var(--text-label); padding: 4px 10px; border-radius: var(--r-full); white-space: nowrap; border: 1px solid transparent; }
    vbg-billing-table .plan.enterprise { background: var(--vbg-amber-100); color: var(--fg-accent); }
    vbg-billing-table .plan.professional { background: var(--slate-100); color: var(--fg2); }
    vbg-billing-table .plan.team { background: transparent; border-color: var(--border); color: var(--fg2); }
    vbg-billing-table .plan.trial { background: transparent; border: 1px dashed var(--border-strong); color: var(--fg3); }

    /* status badge */
    vbg-billing-table .badge { display: inline-flex; align-items: center; gap: 6px; font: var(--text-label); padding: 4px 10px; border-radius: var(--r-full); white-space: nowrap; }
    vbg-billing-table .badge .dot { width: 7px; height: 7px; border-radius: var(--r-full); }
    vbg-billing-table .badge.active { background: var(--status-success-bg); color: var(--status-success-fg); }
    vbg-billing-table .badge.active .dot { background: var(--status-success); }
    vbg-billing-table .badge.trial { background: var(--status-info-bg); color: var(--status-info-fg); }
    vbg-billing-table .badge.trial .dot { background: var(--status-info); }
    vbg-billing-table .badge.pending { background: var(--status-pending-bg); color: var(--status-pending-fg); }
    vbg-billing-table .badge.pending .dot { background: var(--status-pending); }
    vbg-billing-table .badge.past_due { background: var(--status-warning-bg); color: var(--status-warning-fg); }
    vbg-billing-table .badge.past_due .dot { background: var(--status-warning); }
    vbg-billing-table .badge.suspended { background: var(--status-error-bg); color: var(--status-error-fg); }
    vbg-billing-table .badge.suspended .dot { background: var(--status-error); }
    vbg-billing-table .badge.canceled { background: var(--slate-100); color: var(--fg4); }
    vbg-billing-table .badge.canceled .dot { background: var(--slate-300); }

    /* licenses */
    vbg-billing-table .lic { display: flex; flex-direction: column; gap: 5px; max-width: 132px; }
    vbg-billing-table .lic .lline { display: flex; align-items: baseline; gap: 5px; }
    vbg-billing-table .lic .lused { font: var(--text-mono); color: var(--fg1); }
    vbg-billing-table .lic .ltotal { font: var(--text-mono-sm); color: var(--fg4); }
    vbg-billing-table .lic .ltrack { height: 5px; border-radius: var(--r-full); background: var(--slate-150); overflow: hidden; }
    vbg-billing-table .lic .lfill { height: 100%; border-radius: var(--r-full); background: var(--vbg-amber); }
    vbg-billing-table .lic.near .lfill { background: var(--status-warning); }
    vbg-billing-table .lic.full .lfill { background: var(--status-error); }
    vbg-billing-table .lic.empty .lused { color: var(--fg4); }
    vbg-billing-table .lic.empty .lfill { background: var(--slate-300); }

    /* billing (cycle + value) */
    vbg-billing-table .bill { text-align: right; }
    vbg-billing-table .bill .bval { font: var(--text-mono); color: var(--fg1); white-space: nowrap; }
    vbg-billing-table .bill .bcyc { display: block; font: var(--text-caption); color: var(--fg4); margin-top: 1px; }
    vbg-billing-table .bill.zero .bval { color: var(--fg4); }

    /* renewal */
    vbg-billing-table .renew { display: flex; flex-direction: column; gap: 1px; white-space: nowrap; }
    vbg-billing-table .renew .rdate { font: var(--text-sm); color: var(--fg2); }
    vbg-billing-table .renew .rin { font: var(--text-caption); color: var(--fg4); }
    vbg-billing-table .renew.soon .rin { color: var(--status-warning-fg); font-weight: 500; }
    vbg-billing-table .renew.over .rdate { color: var(--status-error-fg); }
    vbg-billing-table .renew.over .rin { color: var(--status-error-fg); font-weight: 500; }
    vbg-billing-table .renew.none .rdate { color: var(--fg4); }

    /* payment chip */
    vbg-billing-table .pay { display: inline-flex; align-items: center; gap: 6px; font: var(--text-label); white-space: nowrap; }
    vbg-billing-table .pay .pdot { width: 7px; height: 7px; border-radius: var(--r-full); flex: 0 0 auto; }
    vbg-billing-table .pay.paid { color: var(--status-success-fg); } vbg-billing-table .pay.paid .pdot { background: var(--status-success); }
    vbg-billing-table .pay.pending { color: var(--fg3); } vbg-billing-table .pay.pending .pdot { background: var(--status-pending); }
    vbg-billing-table .pay.overdue { color: var(--status-warning-fg); } vbg-billing-table .pay.overdue .pdot { background: var(--status-warning); }
    vbg-billing-table .pay.failed { color: var(--status-error-fg); } vbg-billing-table .pay.failed .pdot { background: var(--status-error); }
    vbg-billing-table .pay.none { color: var(--fg4); } vbg-billing-table .pay.none .pdot { background: var(--slate-300); }

    vbg-billing-table .actions-cell { text-align: right; position: relative; }
    vbg-billing-table .kebab {
      width: 32px; height: 32px; border-radius: var(--r-sm); border: 1px solid transparent; background: transparent;
      display: inline-grid; place-items: center; color: var(--fg3); cursor: pointer;
      transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
    }
    vbg-billing-table .kebab:hover { background: var(--bg-surface); border-color: var(--border); color: var(--fg1); }
    vbg-billing-table tr:hover .kebab { color: var(--fg2); }
    vbg-billing-table .kebab.active { background: var(--bg-surface); border-color: var(--border); color: var(--fg1); }
    vbg-billing-table .menu {
      position: absolute; top: calc(100% - 4px); right: 20px; z-index: 40;
      min-width: 220px; background: var(--bg-raised); border: 1px solid var(--border);
      border-radius: var(--r-md); box-shadow: var(--shadow-pop); padding: 5px;
      display: none; flex-direction: column; gap: 1px;
    }
    vbg-billing-table .menu.open { display: flex; animation: vbgBMenuIn var(--dur-fast) var(--ease-out); }
    vbg-billing-table .menu.up { top: auto; bottom: calc(100% - 4px); }
    @keyframes vbgBMenuIn { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: none; } }
    vbg-billing-table .menu button {
      display: flex; align-items: center; gap: 10px; width: 100%; border: 0; background: transparent;
      cursor: pointer; text-align: left; font: var(--text-body); color: var(--fg1);
      padding: 8px 10px; border-radius: var(--r-sm); transition: background var(--dur-fast) var(--ease-out);
    }
    vbg-billing-table .menu button .ico { display: inline-flex; color: var(--fg3); flex: 0 0 auto; }
    vbg-billing-table .menu button .ico svg { display: block; }
    vbg-billing-table .menu button:hover { background: var(--bg-hover); }
    vbg-billing-table .menu button:disabled { opacity: .4; cursor: default; }
    vbg-billing-table .menu button:disabled:hover { background: transparent; }
    vbg-billing-table .menu button.danger { color: var(--status-error-fg); }
    vbg-billing-table .menu button.danger .ico { color: var(--status-error); }
    vbg-billing-table .menu button.danger:hover { background: var(--status-error-bg); }
    vbg-billing-table .menu .sep { height: 1px; background: var(--border-subtle); margin: 4px 2px; }

    vbg-billing-table .empty { padding: 64px 20px; text-align: center; color: var(--fg3); }
    vbg-billing-table .empty .et { font: var(--text-h3); color: var(--fg2); margin-bottom: 6px; }
    vbg-billing-table .empty .es { font: var(--text-sm); }
  `;

  function injectStyle() {
    if (document.getElementById('vbg-billing-table-style')) return;
    const s = document.createElement('style'); s.id = 'vbg-billing-table-style'; s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ico(path, size, sw) { size = size || 16; sw = sw || 1.7; return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>'; }
  function initials(name) {
    const c = name.replace(/[^A-Za-z0-9 &+]/g, '').trim().split(/[ &+]+/).filter(Boolean);
    return (c.length === 1 ? c[0].slice(0, 2) : (c[0][0] + c[1][0])).toUpperCase();
  }

  /* menu action icons */
  const I_OPEN    = '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>';
  const I_PLAN    = '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>';
  const I_LIC     = '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>';
  const I_INVOICE = '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>';
  const I_ENT     = '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>';
  const I_BILLINFO= '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>';
  const I_RENEW   = '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/>';
  const I_HISTORY = '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>';
  const I_SUSPEND = '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>';
  const I_RESTORE = '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>';

  function planPill(p) { return '<span class="plan ' + p + '">' + (PLAN_LABEL[p] || p) + '</span>'; }
  function statusBadge(s) { return '<span class="badge ' + s.status + '"><span class="dot"></span>' + STATUS_LABEL[s.status] + '</span>'; }

  function licCell(s) {
    if (s.status === 'canceled' || !s.seatsTotal) {
      return '<div class="lic empty"><div class="lline"><span class="lused">—</span><span class="ltotal">of ' + s.seatsTotal + '</span></div><div class="ltrack"><span class="lfill" style="width:0%"></span></div></div>';
    }
    const ratio = s.seatsUsed / s.seatsTotal;
    const cls = ratio >= 1 ? ' full' : (ratio >= 0.9 ? ' near' : '');
    const pct = Math.min(100, Math.round(ratio * 100));
    return '<div class="lic' + cls + (s.seatsUsed === 0 ? ' empty' : '') + '"><div class="lline"><span class="lused">' + s.seatsUsed + '</span><span class="ltotal">/ ' + s.seatsTotal + ' seats</span></div><div class="ltrack"><span class="lfill" style="width:' + pct + '%"></span></div></div>';
  }
  function billCell(s) {
    const acv = acvOf(s);
    if (s.status === 'trial' || s.status === 'pending') {
      return '<div class="bill zero"><span class="bval">Trial · €0</span><span class="bcyc">no charge</span></div>';
    }
    if (s.status === 'canceled') {
      return '<div class="bill zero"><span class="bval">' + fmtMoney(acv) + '</span><span class="bcyc">ended</span></div>';
    }
    const val = s.cycle === 'monthly' ? fmtMoney(acv / 12) + '/mo' : fmtMoney(acv) + '/yr';
    return '<div class="bill"><span class="bval">' + val + '</span><span class="bcyc">' + CYCLE_LABEL[s.cycle] + ' · ' + fmtMoney(acv) + ' ACV</span></div>';
  }
  function renewCell(s) {
    if (!s.renewal) return '<div class="renew none"><span class="rdate">—</span><span class="rin">canceled</span></div>';
    const r = renewLabel(s.renewal);
    const cls = r.tone === 'over' ? ' over' : (r.tone === 'soon' ? ' soon' : '');
    return '<div class="renew' + cls + '"><span class="rdate">' + fmtDate(s.renewal) + '</span><span class="rin">' + r.txt + '</span></div>';
  }
  function payCell(s) { return '<span class="pay ' + s.paymentStatus + '"><span class="pdot"></span>' + PAY_LABEL[s.paymentStatus] + '</span>'; }

  function menuHtml(s) {
    const canSuspend = s.status === 'active' || s.status === 'past_due' || s.status === 'trial';
    const suspended = s.status === 'suspended';
    return '<div class="menu" data-menu="' + s.tid + '">'
      + '<button data-act="open" data-id="' + s.tid + '"><span class="ico">' + ico(I_OPEN) + '</span>View subscription</button>'
      + '<button data-act="plan" data-id="' + s.tid + '"><span class="ico">' + ico(I_PLAN) + '</span>Change plan</button>'
      + '<button data-act="licenses" data-id="' + s.tid + '"><span class="ico">' + ico(I_LIC) + '</span>Manage licenses</button>'
      + '<button data-act="entitlements" data-id="' + s.tid + '"><span class="ico">' + ico(I_ENT) + '</span>Feature entitlements</button>'
      + '<div class="sep"></div>'
      + '<button data-act="invoices" data-id="' + s.tid + '"><span class="ico">' + ico(I_INVOICE) + '</span>View invoices</button>'
      + '<button data-act="billing" data-id="' + s.tid + '"><span class="ico">' + ico(I_BILLINFO) + '</span>Update billing info</button>'
      + '<button data-act="renewal" data-id="' + s.tid + '"' + (s.status === 'canceled' ? ' disabled' : '') + '><span class="ico">' + ico(I_RENEW) + '</span>Manage renewal</button>'
      + '<button data-act="history" data-id="' + s.tid + '"><span class="ico">' + ico(I_HISTORY) + '</span>Billing history</button>'
      + '<div class="sep"></div>'
      + (suspended
        ? '<button data-act="reactivate" data-id="' + s.tid + '"><span class="ico">' + ico(I_RESTORE) + '</span>Reactivate subscription</button>'
        : (canSuspend ? '<button class="danger" data-act="suspend" data-id="' + s.tid + '"><span class="ico">' + ico(I_SUSPEND) + '</span>Suspend subscription</button>' : ''))
      + '</div>';
  }

  function rowHtml(s) {
    const off = (s.status === 'suspended' || s.status === 'canceled');
    return ''
      + '<tr data-id="' + s.tid + '" class="' + (off ? 'is-off' : '') + '">'
      +   '<td><span class="avatar-tile">' + esc(initials(s.name)) + '</span></td>'
      +   '<td><div class="cname">' + esc(s.name) + '</div><div class="cmeta">' + esc(s.tid) + '<span class="sep">·</span><span class="dom">' + esc(s.domain) + '</span></div></td>'
      +   '<td>' + planPill(s.plan) + '</td>'
      +   '<td>' + statusBadge(s) + '</td>'
      +   '<td>' + licCell(s) + '</td>'
      +   '<td>' + billCell(s) + '</td>'
      +   '<td>' + renewCell(s) + '</td>'
      +   '<td>' + payCell(s) + '</td>'
      +   '<td class="actions-cell">'
      +     '<button class="kebab" aria-label="Subscription actions" data-id="' + s.tid + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg></button>'
      +     menuHtml(s)
      +   '</td>'
      + '</tr>';
  }

  function headHtml() {
    return '<thead><tr>'
      + '<th class="th-tile"></th>'
      + '<th>Subscription</th>'
      + '<th class="th-plan">Plan</th>'
      + '<th class="th-status">Status</th>'
      + '<th class="th-lic">Licenses</th>'
      + '<th class="th-billing">Contract value</th>'
      + '<th class="th-renewal">Renewal</th>'
      + '<th class="th-pay">Payment</th>'
      + '<th class="th-actions"></th>'
      + '</tr></thead>';
  }

  function matches(s, f) {
    if (!f) return true;
    if (f.search) {
      const q = f.search.toLowerCase();
      const hay = (s.name + ' ' + s.tid + ' ' + s.domain + ' ' + s.contact + ' ' + (PLAN_LABEL[s.plan] || '')).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    if (f.plan && f.plan.size && !f.plan.has(s.plan)) return false;
    if (f.status && f.status.size && !f.status.has(s.status)) return false;
    if (f.cycle && f.cycle.size && !f.cycle.has(s.cycle)) return false;
    if (f.payment && f.payment.size && !f.payment.has(s.paymentStatus)) return false;
    if (f.renewal && f.renewal !== 'any') {
      const d = daysBetween(s.renewal);
      if (d == null) return false;
      if (d > parseInt(f.renewal, 10) || d < 0) {
        if (!(f.renewal === 'overdue' && d < 0)) return false;
      }
    }
    if (f.usage && f.usage !== 'any') {
      const ratio = s.seatsTotal ? s.seatsUsed / s.seatsTotal : 0;
      if (f.usage === 'capacity' && !(ratio < 0.75)) return false;
      if (f.usage === 'near' && !(ratio >= 0.9)) return false;
      if (f.usage === 'unused' && s.seatsUsed !== 0) return false;
    }
    return true;
  }

  class VbgBillingTable extends HTMLElement {
    connectedCallback() {
      injectStyle();
      this.data = SUBS.map(function (s) { return Object.assign({}, s); });
      window.VBG_BILLING.LIVE = this.data;
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
    getById(id) { return this.data.filter(function (x) { return x.tid === id; })[0]; }

    render() {
      const self = this;
      const visible = this.data.filter(function (s) { return matches(s, self.filters); });
      let body;
      if (visible.length === 0) {
        body = '<tbody><tr><td colspan="9"><div class="empty"><div class="et">No subscriptions match the current filters</div>'
          + '<div class="es">Adjust plan, status, billing cycle, payment or renewal window to widen the results.</div></div></td></tr></tbody>';
      } else {
        body = '<tbody>' + visible.map(function (s) { return rowHtml(s); }).join('') + '</tbody>';
      }
      this.innerHTML = '<table class="btable">' + headHtml() + body + '</table>';
      this.openMenu = null;
      this.dispatchEvent(new CustomEvent('billingrender', { bubbles: true, detail: { visible: visible.length, total: this.data.length } }));
    }

    closeMenu() {
      if (!this.openMenu) return;
      this.openMenu.classList.remove('open', 'up');
      const tr = this.openMenu.closest('tr'); if (tr) tr.classList.remove('menu-open');
      const k = this.openMenu.parentElement.querySelector('.kebab'); if (k) k.classList.remove('active');
      this.openMenu = null;
    }
    onDocClick(e) { if (this.openMenu && !e.target.closest('.actions-cell')) this.closeMenu(); }

    onClick(e) {
      const kebab = e.target.closest('.kebab');
      if (kebab) {
        e.stopPropagation();
        const menu = kebab.parentElement.querySelector('.menu');
        if (menu === this.openMenu) { this.closeMenu(); return; }
        this.closeMenu();
        const tr = kebab.closest('tr');
        const host = this.getBoundingClientRect(), rr = tr.getBoundingClientRect();
        if (rr.bottom > host.bottom - 260) menu.classList.add('up');
        menu.classList.add('open'); this.openMenu = menu;
        kebab.classList.add('active'); tr.classList.add('menu-open');
        return;
      }
      const item = e.target.closest('.menu button');
      if (item) {
        e.stopPropagation();
        if (item.disabled) return;
        const act = item.getAttribute('data-act'), id = item.getAttribute('data-id');
        this.closeMenu();
        this.dispatchEvent(new CustomEvent('billingaction', { bubbles: true, detail: { act: act, id: id } }));
        return;
      }
      const tr = e.target.closest('tbody tr[data-id]');
      if (tr) this.dispatchEvent(new CustomEvent('billingopen', { bubbles: true, detail: { id: tr.getAttribute('data-id'), tab: 'overview' } }));
    }

    /* ---- live mutations ---- */
    setStatus(id, status) {
      const s = this.getById(id); if (!s) return;
      s.status = status;
      if (status === 'active' && s.paymentStatus === 'overdue') s.paymentStatus = 'paid';
      this.render();
    }
    setPlan(id, plan) {
      const s = this.getById(id); if (!s) return;
      s.plan = plan;
      this.render();
    }
    setSeats(id, total) {
      const s = this.getById(id); if (!s) return;
      s.seatsTotal = Math.max(s.seatsUsed, total);
      this.render();
    }
    setRenewal(id, auto) {
      const s = this.getById(id); if (!s) return;
      s.autoRenew = auto;
      this.render();
    }
    markPaid(id) {
      const s = this.getById(id); if (!s) return;
      s.paymentStatus = 'paid';
      if (s.status === 'past_due') s.status = 'active';
      this.render();
    }
    cancelSub(id) {
      const s = this.getById(id); if (!s) return;
      s.status = 'canceled'; s.paymentStatus = 'none'; s.renewal = null; s.autoRenew = false;
      this.render();
    }
    add(s) {
      this.data.unshift(s);
      this.render();
      const self = this;
      requestAnimationFrame(function () {
        const tr = self.querySelector('tr[data-id="' + s.tid + '"]');
        if (tr) { tr.classList.add('flash'); self.scrollTop = 0; }
      });
    }
  }

  if (!customElements.get('vbg-billing-table')) {
    customElements.define('vbg-billing-table', VbgBillingTable);
  }
})();
