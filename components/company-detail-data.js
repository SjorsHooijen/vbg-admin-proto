/* ============================================================
   VBG — Company (tenant) detail data
   Builds a rich, plausible authoritative record for a single
   tenant organisation from the companies row, seeded
   deterministically by tenant ID so the page is stable across
   reloads.

   Exposes window.VBG_COMPANY_DETAIL.build(company) -> detail.
   Relies on window.VBG_COMPANIES (companies-table.js).
   ============================================================ */
(function () {
  'use strict';

  var TODAY = new Date('2026-06-09T00:00:00');

  var INDUSTRY_LABEL = {
    developer: 'Developer', contractor: 'Contractor', engineering: 'Engineering',
    manufacturer: 'Manufacturer', architect: 'Architect'
  };
  var INDUSTRY_DESC = {
    developer: 'Residential & mixed-use property development',
    contractor: 'Main contractor — construction & delivery',
    engineering: 'Engineering consultancy — structural & MEP',
    manufacturer: 'Component manufacturing & prefabrication',
    architect: 'Architecture & design practice'
  };
  var PLAN_LABEL = { enterprise: 'Enterprise', professional: 'Professional', team: 'Team', trial: 'Trial' };
  var PLAN_PRICE = { enterprise: 89, professional: 58, team: 39, trial: 0 };
  var PLAN_TERM = { enterprise: 'Annual', professional: 'Annual', team: 'Monthly', trial: '14-day trial' };
  var REGION_LABEL = { nl: 'Netherlands', be: 'Belgium', de: 'Germany', nordics: 'Nordics', uk: 'United Kingdom' };
  var REGION_TZ = { nl: 'Europe/Amsterdam (CET)', be: 'Europe/Brussels (CET)', de: 'Europe/Berlin (CET)', nordics: 'Europe/Stockholm (CET)', uk: 'Europe/London (GMT)' };
  var STATUS_LABEL = { active: 'Active', trial: 'Trial', invited: 'Invited', suspended: 'Suspended', churned: 'Churned' };

  /* internal VBG account stewards */
  var ACCOUNT_MGRS = ['Sanne Koenders', 'Daan Verhoeven', 'Mei Lin Tan', 'Joris Bakker', 'Ineke de Vries', 'Wouter Dijkstra'];

  /* member name pools per first/last, deterministic */
  var FIRST = ['Lars', 'Emma', 'Sven', 'Noa', 'Daan', 'Sara', 'Tijn', 'Lena', 'Bram', 'Fleur', 'Ruben', 'Iris', 'Joost', 'Maud', 'Niels', 'Roos', 'Stijn', 'Lotte', 'Koen', 'Eva', 'Pim', 'Anouk', 'Thijs', 'Sofie'];
  var LAST = ['de Wit', 'Jansen', 'Visser', 'Bakker', 'Meijer', 'Smit', 'de Boer', 'Mulder', 'Bos', 'Vos', 'Peters', 'Hendriks', 'van Dijk', 'Brouwer', 'Dekker', 'Kok', 'Vermeulen', 'van Leeuwen'];
  var ROLES = [
    ['owner', 'Account owner'], ['admin', 'Admin'], ['admin', 'Admin'],
    ['engineer', 'Engineer'], ['engineer', 'Engineer'], ['engineer', 'Engineer'],
    ['engineer', 'Engineer'], ['viewer', 'Viewer'], ['viewer', 'Viewer'], ['billing', 'Billing']
  ];

  /* real project pool keyed by customer (mirrors projects-table.js) */
  var PROJECT_POOL = [
    { name: 'Project Alpha',          code: 'VBG-04-NC', customer: 'Heijmans Vastgoed',   city: 'Amsterdam',  status: 'generated', pct: 72,  thumb: 0 },
    { name: 'Westkade Towers',        code: 'VBG-11-WK', customer: 'BAM Wonen',           city: 'Rotterdam',  status: 'validated', pct: 100, thumb: 1 },
    { name: 'Havenkwartier Block C',  code: 'VBG-07-HK', customer: 'Dura Vermeer',        city: 'Utrecht',    status: 'computing', pct: 41,  thumb: 2 },
    { name: 'Spoorzone Residences',   code: 'VBG-02-SZ', customer: 'VolkerWessels',       city: 'Tilburg',    status: 'draft',     pct: 12,  thumb: 3 },
    { name: 'Maaspoort North Core',   code: 'VBG-09-MP', customer: 'Heijmans Vastgoed',   city: 'Den Bosch',  status: 'generated', pct: 64,  thumb: 4 },
    { name: 'Stadshaven Lofts',       code: 'VBG-13-SH', customer: 'Synchroon',           city: 'Rotterdam',  status: 'validated', pct: 100, thumb: 0 },
    { name: 'Binckhorst Mixed-Use',   code: 'VBG-15-BH', customer: 'AM Real Estate',      city: 'Den Haag',   status: 'review',    pct: 88,  thumb: 1 },
    { name: 'Kop van Zuid Block B',   code: 'VBG-06-KZ', customer: 'BAM Wonen',           city: 'Rotterdam',  status: 'draft',     pct: 8,   thumb: 2 },
    { name: 'Oostpoort Plaza',        code: 'VBG-18-OP', customer: 'Amvest',              city: 'Amsterdam',  status: 'generated', pct: 57,  thumb: 3 },
    { name: 'Zuidas Tower E',         code: 'VBG-21-ZA', customer: 'G&S Vastgoed',        city: 'Amsterdam',  status: 'validated', pct: 100, thumb: 4 },
    { name: 'Merwede Kanaalzone',     code: 'VBG-17-MK', customer: 'Janssen de Jong',     city: 'Utrecht',    status: 'computing', pct: 33,  thumb: 0 },
    { name: 'Cruquius Werf',          code: 'VBG-20-CW', customer: 'Steck',               city: 'Haarlem',    status: 'draft',     pct: 19,  thumb: 1 }
  ];
  var CITY_POOL = ['Amsterdam', 'Rotterdam', 'Utrecht', 'Den Haag', 'Eindhoven', 'Groningen', 'Tilburg', 'Almere', 'Breda', 'Nijmegen'];
  var PROJECT_NAMES = ['Parkrand Quarter', 'Kavel 12 Towers', 'Rivierpark Block', 'Centrumeiland Lofts', 'Stationsgebied Fase 2', 'De Werf Residences', 'Groene Loper Mixed-Use', 'Kanaaloevers', 'Veldhuizen Court', 'Nieuwe Kade Block D'];
  var THUMBS = ['assets/vbg-viewport-3d.png', 'assets/vbg-viewport-3d-select-second-floor.png', 'assets/vbg-viewport-2d.png', 'assets/vbg-viewport-1d.png', 'assets/vbg-viewport-3d-select-second-floor-wall.png'];

  /* ---------- deterministic helpers ---------- */
  function seed(s) { var n = 0; for (var i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0; return n; }
  function pick(arr, s) { return arr[s % arr.length]; }
  function fmtDate(iso) {
    if (!iso) return '—';
    var M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var d = new Date(iso + 'T00:00:00');
    return d.getDate() + ' ' + M[d.getMonth()] + ' ' + d.getFullYear();
  }
  function shiftDate(iso, days) { var d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() - days); return d.toISOString().slice(0, 10); }
  function addDate(iso, days) { var d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }
  function daysAgo(iso) { if (!iso) return Infinity; return Math.round((TODAY - new Date(iso + 'T00:00:00')) / 86400000); }
  function relLabel(iso) {
    if (!iso) return 'never';
    var d = daysAgo(iso);
    if (d <= 0) return 'today'; if (d === 1) return 'yesterday';
    if (d < 30) return d + ' days ago';
    var mo = Math.round(d / 30); if (mo < 12) return mo + ' month' + (mo === 1 ? '' : 's') + ' ago';
    var yr = Math.round(d / 365); return yr + ' year' + (yr === 1 ? '' : 's') + ' ago';
  }
  function timeOf(s, i) { var h = 8 + ((s + i * 7) % 9); var m = (s + i * 13) % 60; return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; }
  function nameAt(s, i) { return pick(FIRST, s + i * 5) + ' ' + pick(LAST, s + i * 7 + 3); }
  function slug(name) { return name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, ''); }

  /* ---------- members roster ---------- */
  function buildMembers(c) {
    var s = seed(c.tid);
    var n = Math.max(c.seatsUsed, c.status === 'invited' ? 1 : 0);
    var members = [];
    /* primary contact / owner first */
    var ownerName = c.owner;
    members.push({
      name: ownerName, role: 'owner', roleLabel: 'Account owner',
      email: slug(ownerName).replace(/\s/g, '') + '@' + c.domain,
      status: c.status === 'invited' ? 'invited' : 'active',
      lastActive: c.lastActive
    });
    for (var i = 1; i < n; i++) {
      var rl = ROLES[(s + i) % ROLES.length];
      if (rl[0] === 'owner') rl = ['engineer', 'Engineer'];
      var nm = nameAt(s, i);
      var inactive = (i % 9 === 0);
      var pending = (c.status !== 'suspended' && c.status !== 'churned' && i % 11 === 0);
      members.push({
        name: nm, role: rl[0], roleLabel: rl[1],
        email: slug(nm).replace(/\s/g, '') + '@' + c.domain,
        status: pending ? 'invited' : (inactive ? 'inactive' : 'active'),
        lastActive: pending ? null : shiftDate(c.lastActive || TODAY.toISOString().slice(0, 10), (i * 3 + (s % 5)))
      });
    }
    return members;
  }

  /* ---------- projects belonging to the tenant ---------- */
  function buildProjects(c) {
    var s = seed(c.tid);
    var owned = PROJECT_POOL.filter(function (p) { return p.customer === c.name; });
    var out = owned.slice();
    var k = 0;
    while (out.length < c.projects && out.length < 12) {
      var st = pick(['generated', 'validated', 'computing', 'draft', 'review'], s + k);
      out.push({
        name: pick(PROJECT_NAMES, s + k * 3),
        code: 'VBG-' + (30 + ((s + k * 7) % 60)) + '-' + String.fromCharCode(65 + ((s + k) % 26)) + String.fromCharCode(65 + ((s + k * 2) % 26)),
        customer: c.name,
        city: pick(CITY_POOL, s + k * 5),
        status: st,
        pct: st === 'validated' ? 100 : (st === 'draft' ? 8 + (s + k) % 20 : 30 + ((s + k * 11) % 60)),
        thumb: (s + k) % THUMBS.length
      });
      k++;
    }
    /* attach a plausible updated date + lead engineer */
    return out.slice(0, Math.max(c.projects, owned.length)).map(function (p, i) {
      return Object.assign({}, p, {
        updated: shiftDate(c.lastActive || TODAY.toISOString().slice(0, 10), i * 4 + (s % 6)),
        lead: nameAt(s, i + 1)
      });
    });
  }

  /* ---------- billing & plan ---------- */
  function buildBilling(c) {
    var s = seed(c.tid);
    var price = PLAN_PRICE[c.plan];
    var mrr = price * c.seatsTotal;
    var billed = c.plan === 'team' ? 'Monthly' : (c.plan === 'trial' ? '—' : 'Annual');
    var contractStart = shiftDate(c.onboarded, -2);
    var contractEnd = c.plan === 'trial' ? addDate(c.onboarded, 14)
      : (c.plan === 'team' ? addDate(c.onboarded, 30) : addDate(contractStart, 365));
    var nextInvoice = c.status === 'churned' ? null : (c.plan === 'trial' ? null : addDate(TODAY.toISOString().slice(0, 10), 8 + (s % 22)));
    /* invoice history */
    var invoices = [];
    if (c.plan !== 'trial') {
      var count = c.plan === 'team' ? Math.min(6, 1 + daysAgo(c.onboarded) / 30 | 0) : Math.min(3, 1 + daysAgo(c.onboarded) / 365 | 0);
      count = Math.max(1, count);
      var d = TODAY.toISOString().slice(0, 10);
      var step = c.plan === 'team' ? 30 : 365;
      var amount = c.plan === 'team' ? mrr : mrr * 12;
      for (var i = 0; i < count; i++) {
        d = shiftDate(d, step * (i === 0 ? 1 : 1) + (i === 0 ? 0 : 0));
        var issued = shiftDate(TODAY.toISOString().slice(0, 10), step * (i + 1) - 4);
        var st = (c.status === 'churned' && i === 0) ? 'overdue' : 'paid';
        invoices.push({
          no: 'INV-' + (2026 - (i)) + '-' + String(1000 + ((s + i * 13) % 9000)),
          issued: issued,
          amount: amount,
          seats: c.seatsTotal,
          status: st
        });
      }
    }
    return {
      plan: c.plan, planLabel: PLAN_LABEL[c.plan], term: PLAN_TERM[c.plan],
      seatPrice: price, seatsTotal: c.seatsTotal, seatsUsed: c.seatsUsed,
      mrr: mrr, arr: mrr * 12, billed: billed,
      currency: '€',
      contractStart: contractStart, contractEnd: contractEnd,
      nextInvoice: nextInvoice,
      paymentMethod: c.plan === 'trial' ? 'No payment method on file' : (c.plan === 'team' ? 'Card · Visa ···· ' + (4000 + (s % 1000)) : 'Invoice · 30-day terms · PO ' + (s % 90000 + 10000)),
      invoices: invoices,
      autoRenew: c.status === 'active' && c.plan !== 'trial'
    };
  }

  /* ---------- activity / audit timeline ---------- */
  function buildActivity(c, members, projects) {
    var s = seed(c.tid);
    var mgr = pick(ACCOUNT_MGRS, s);
    var ev = [];
    var d = c.lastActive || c.onboarded;

    if (c.status === 'suspended') {
      ev.push({ kind: 'suspended', action: 'Access suspended', user: mgr, date: c.lastActive ? addDate(c.lastActive, 6) : c.onboarded, details: 'Tenant access suspended pending ' + pick(['overdue invoice resolution', 'contract renewal', 'security review'], s) + '. Existing data retained read-only.' });
    } else if (c.status === 'churned') {
      ev.push({ kind: 'churned', action: 'Subscription ended', user: mgr, date: c.lastActive ? addDate(c.lastActive, 3) : c.onboarded, details: 'Contract not renewed — subscription closed. Workspace archived; data retained for 90 days.' });
    } else if (c.status === 'invited') {
      ev.push({ kind: 'invited', action: 'Invitation sent', user: mgr, date: c.onboarded, details: 'Onboarding invitation sent to ' + c.owner + ' (' + c.domain + '). Awaiting first sign-in.' });
    } else {
      ev.push({ kind: 'login', action: 'Workspace activity', user: c.owner, date: c.lastActive, details: pick(['Generated a structural model', 'Opened the configurator', 'Validated a building', 'Published a project'], s) + ' in ' + (projects[0] ? projects[0].name : 'a project') + '.' });
    }

    if (c.seatsUsed > 1) {
      ev.push({ kind: 'member', action: 'Member added', user: c.owner, date: shiftDate(d, 9 + (s % 12)), details: 'Added ' + (members[1] ? members[1].name : 'a team member') + ' as ' + (members[1] ? members[1].roleLabel : 'Engineer') + '.' });
    }
    if (c.plan !== 'trial' && c.status !== 'churned') {
      ev.push({ kind: 'billing', action: 'Invoice paid', user: 'Billing system', date: shiftDate(d, 24 + (s % 20)), details: 'Payment received for ' + PLAN_LABEL[c.plan] + ' plan — ' + c.seatsTotal + ' seats.' });
    }
    ev.push({ kind: 'project', action: 'Project created', user: nameAt(s, 2), date: shiftDate(d, 38 + (s % 30)), details: 'Created ' + (projects[Math.min(1, projects.length - 1)] ? projects[Math.min(1, projects.length - 1)].name : 'a new project') + '.' });
    if (c.status === 'active' || c.status === 'trial') {
      ev.push({ kind: 'seats', action: 'Seats adjusted', user: mgr, date: shiftDate(d, 60 + (s % 40)), details: 'Seat allocation set to ' + c.seatsTotal + ' (' + PLAN_LABEL[c.plan] + ').' });
    }
    if (c.status === 'trial' || c.plan === 'trial') {
      ev.push({ kind: 'trial', action: 'Trial started', user: mgr, date: addDate(c.onboarded, 1), details: '14-day evaluation trial activated.' });
    } else {
      ev.push({ kind: 'plan', action: 'Plan activated', user: mgr, date: addDate(c.onboarded, 2), details: PLAN_LABEL[c.plan] + ' plan activated — ' + c.seatsTotal + ' seats, ' + PLAN_TERM[c.plan].toLowerCase() + ' term.' });
    }
    ev.push({ kind: 'created', action: 'Tenant provisioned', user: mgr, date: c.onboarded, details: 'Tenant ' + c.tid + ' provisioned for ' + c.name + '. Workspace and primary domain ' + c.domain + ' configured.' });

    ev.forEach(function (e, i) { e.time = timeOf(s, i); });
    /* sort newest first */
    ev.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    return ev;
  }

  /* ============================================================
     public build
     ============================================================ */
  function build(c) {
    var s = seed(c.tid);
    var members = buildMembers(c);
    var projects = buildProjects(c);
    var billing = buildBilling(c);
    var activity = buildActivity(c, members, projects);

    var adminCount = members.filter(function (m) { return m.role === 'owner' || m.role === 'admin'; }).length;
    var created = shiftDate(c.onboarded, 1);

    return {
      company: c,
      identity: {
        industryLabel: INDUSTRY_LABEL[c.industry] || c.industry,
        industryDesc: INDUSTRY_DESC[c.industry] || '',
        regionLabel: REGION_LABEL[c.region] || c.region,
        timezone: REGION_TZ[c.region] || '—',
        primaryContact: c.owner,
        contactEmail: slug(c.owner).replace(/\s/g, '') + '@' + c.domain,
        contactRole: pick(['Head of Engineering', 'BIM Manager', 'Director', 'Digital Lead', 'Technical Director'], s),
        accountManager: pick(ACCOUNT_MGRS, s),
        onboarded: c.onboarded,
        created: created,
        website: 'www.' + c.domain,
        notes: c.status === 'suspended'
          ? 'Access suspended — follow up on outstanding items before restoring. Primary contact notified.'
          : (c.status === 'churned'
            ? 'Subscription ended. Workspace archived; retained for traceability of past project usage. No active seats.'
            : (c.status === 'invited'
              ? 'Invitation sent — awaiting first sign-in. Seats provisioned but not yet activated.'
              : (c.status === 'trial'
                ? 'Evaluation trial in progress. Account manager to follow up before trial expiry.'
                : 'Active tenant in good standing. Verified primary domain and signed platform terms on file.')))
      },
      lifecycle: { state: c.status, onboarded: c.onboarded },
      counts: {
        members: members.length,
        admins: adminCount,
        projects: projects.length,
        seatsUsed: c.seatsUsed,
        seatsTotal: c.seatsTotal,
        invoices: billing.invoices.length
      },
      members: members,
      projects: projects,
      billing: billing,
      activity: activity
    };
  }

  window.VBG_COMPANY_DETAIL = {
    build: build, fmtDate: fmtDate, relLabel: relLabel,
    INDUSTRY_LABEL: INDUSTRY_LABEL, PLAN_LABEL: PLAN_LABEL,
    REGION_LABEL: REGION_LABEL, STATUS_LABEL: STATUS_LABEL,
    THUMBS: THUMBS
  };
})();
