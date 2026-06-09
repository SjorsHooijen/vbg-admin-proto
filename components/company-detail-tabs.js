/* ============================================================
   VBG — Company (tenant) detail tab renderers
   Tabs: overview · members · projects · billing · activity
   Pure render(detail) -> HTML string. Reuses recipe-detail.css
   shell classes (card, field-row, badge, vtab, timeline) +
   product-detail.css (pd- value styling, lifecycle, stats,
   relationship lists) + company-detail.css for tenant blocks.
   Exposes window.CompanyDetailTabs.
   ============================================================ */
(function () {
  'use strict';

  var D = function () { return window.VBG_COMPANY_DETAIL; };
  function fmt(iso) { return D().fmtDate(iso); }

  function ico(path, size) {
    size = size || 16;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function money(n) { return '€' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

  var STATUS_LABEL = { active: 'Active', trial: 'Trial', invited: 'Invited', suspended: 'Suspended', churned: 'Churned' };
  /* map tenant status -> badge class in the shared badge stylesheet */
  var STATUS_BADGE = { active: 'active', trial: 'review', invited: 'draft', suspended: 'warning', churned: 'deprecated' };
  var PROJ_STATUS_LABEL = { generated: 'Generated', validated: 'Validated', computing: 'Computing', draft: 'Draft', review: 'Review' };

  function badge(status, label) {
    var cls = STATUS_BADGE[status] || status;
    return '<span class="badge ' + cls + '"><span class="dot"></span>' + (label || STATUS_LABEL[status] || status) + '</span>';
  }
  function row(k, vHtml, mono) {
    return '<div class="field-row"><div class="fk">' + esc(k) + '</div>'
      + '<div class="fv"><div class="pd-val' + (mono ? ' mono' : '') + '">' + vHtml + '</div></div></div>';
  }
  function cardHead(label, hint) {
    return '<div class="card-hd"><span class="ovl">' + esc(label) + '</span>' + (hint ? '<span class="hint">' + esc(hint) + '</span>' : '') + '</div>';
  }
  function pane(title, sub, body) {
    return '<div class="rd-pane"><div class="rd-pane-head"><div><h2>' + esc(title) + '</h2><p>' + esc(sub) + '</p></div></div>' + body + '</div>';
  }
  function initials(name) {
    var p = String(name).replace(/[^A-Za-z0-9 &+]/g, '').trim().split(/[ &+]+/).filter(Boolean);
    if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
    return (p[0][0] + p[1][0]).toUpperCase();
  }
  function personChip(name) {
    return '<span class="pd-person"><span class="pd-avatar">' + esc(initials(name)) + '</span>' + esc(name) + '</span>';
  }
  function dateWithRel(iso) { return '<span class="pd-date">' + fmt(iso) + '</span> <span class="pd-sub">· ' + D().relLabel(iso) + '</span>'; }

  /* ============================================================
     OVERVIEW
     ============================================================ */
  function overview(d) {
    var c = d.company, id = d.identity, b = d.billing;

    var identityCard = '<div class="card">' + cardHead('Identity')
      + row('Company name', '<span class="pd-strong">' + esc(c.name) + '</span>')
      + row('Tenant ID', esc(c.tid), true)
      + row('Primary domain', '<a class="cd-link" href="https://' + esc(c.domain) + '" target="_blank" rel="noopener">' + esc(c.domain) + ico('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>', 13) + '</a>')
      + row('Status', badge(c.status))
      + row('Industry', '<span class="cd-ind">' + ico(indGlyph(c.industry), 14) + (id.industryLabel) + '</span> <span class="pd-sub">· ' + esc(id.industryDesc) + '</span>')
      + row('Region', '<span class="cd-region">' + esc(id.regionLabel) + '</span> <span class="pd-sub">· ' + esc(id.timezone) + '</span>')
      + '</div>';

    var contactCard = '<div class="card">' + cardHead('Primary contact')
      + row('Contact', personChip(id.primaryContact))
      + row('Role', esc(id.contactRole))
      + row('Email', '<a class="cd-link" href="mailto:' + esc(id.contactEmail) + '">' + esc(id.contactEmail) + '</a>')
      + row('Account manager', personChip(id.accountManager) + ' <span class="pd-sub">· VBG</span>')
      + '</div>';

    var planCard = '<div class="card span2">' + cardHead('Account')
      + '<div class="cd-account">'
      +   acctCell('Plan', '<span class="cd-plan ' + c.plan + '">' + b.planLabel + '</span>', b.term + ' term')
      +   acctCell('Seats', '<span class="cd-acct-n">' + d.counts.seatsUsed + '</span><span class="cd-acct-sub">/ ' + d.counts.seatsTotal + '</span>', seatPct(d) + '% utilised')
      +   acctCell('Members', '<span class="cd-acct-n">' + d.counts.members + '</span>', d.counts.admins + ' admin' + (d.counts.admins === 1 ? '' : 's'))
      +   acctCell('Projects', '<span class="cd-acct-n">' + d.counts.projects + '</span>', 'on the platform')
      +   acctCell('Monthly value', '<span class="cd-acct-n">' + (b.mrr ? money(b.mrr) : '—') + '</span>', b.mrr ? 'MRR · ' + money(b.arr) + ' ARR' : 'No active contract')
      + '</div></div>';

    var lifecycleCard = '<div class="card span2">' + cardHead('Account lifecycle')
      + '<div class="pd-lifeline">' + lifeline(c.status) + '</div>'
      + '<div class="pd-life-grid">'
      +   lifeCell('Current state', badge(c.status))
      +   lifeCell('Onboarded', '<span class="pd-date">' + fmt(id.onboarded) + '</span>')
      +   lifeCell('Last active', c.lastActive ? '<span class="pd-date">' + fmt(c.lastActive) + '</span>' : '<span class="pd-dash">Never</span>')
      +   lifeCell('Contract renews', b.contractEnd && c.plan !== 'trial' ? '<span class="pd-date">' + fmt(b.contractEnd) + '</span>' : '<span class="pd-dash">—</span>')
      + '</div></div>';

    var recordCard = '<div class="card span2">' + cardHead('Record & access')
      + row('Tenant created', dateWithRel(id.created))
      + row('Onboarded by', personChip(id.accountManager))
      + row('Website', '<a class="cd-link" href="https://' + esc(id.website) + '" target="_blank" rel="noopener">' + esc(id.website) + '</a>')
      + row('Single sign-on', c.plan === 'enterprise' ? '<span class="cd-pill cd-on">' + ico('<path d="M20 6 9 17l-5-5"/>', 12) + 'SAML configured</span>' : '<span class="cd-pill cd-off">Not configured</span>')
      + row('Data region', esc(id.regionLabel) + ' <span class="pd-sub">· EU data residency</span>')
      + '</div>';

    var notesCard = '<div class="card span2">' + cardHead('Internal notes', 'Not visible to the tenant')
      + '<div class="pd-notes">' + ico('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>', 16) + '<p>' + esc(id.notes) + '</p></div>'
      + '</div>';

    return pane('Overview', 'Authoritative record — who this tenant is, who owns the account, and its lifecycle state.',
      '<div class="gform">' + identityCard + contactCard + planCard + lifecycleCard + recordCard + notesCard + '</div>');
  }

  function acctCell(k, v, sub) {
    return '<div class="cd-acct-cell"><div class="cd-acct-k">' + esc(k) + '</div><div class="cd-acct-v">' + v + '</div><div class="cd-acct-s">' + esc(sub) + '</div></div>';
  }
  function lifeCell(k, v) { return '<div class="pd-life-cell"><div class="lk">' + esc(k) + '</div><div class="lv">' + v + '</div></div>'; }
  function seatPct(d) { return d.counts.seatsTotal ? Math.round(d.counts.seatsUsed / d.counts.seatsTotal * 100) : 0; }

  function indGlyph(ind) {
    return {
      developer: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/>',
      contractor: '<path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><path d="M14 6a6 6 0 0 1 6 6v3"/>',
      engineering: '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/>',
      manufacturer: '<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/>',
      architect: '<path d="m12.99 6.74 1.93 3.44"/><path d="M19.136 12a10 10 0 0 1-14.271 0"/><path d="m21 21-2.16-3.84"/><path d="m3 21 8.02-14.26"/><circle cx="12" cy="5" r="2"/>'
    }[ind] || '';
  }

  function lifeline(state) {
    /* off-states render the linear path up to active, then a terminal marker */
    if (state === 'suspended' || state === 'churned') {
      var term = state === 'suspended' ? 'Suspended' : 'Churned';
      return '<span class="ll-step done"><span class="ll-dot"></span>Invited</span>'
        + '<span class="ll-conn done"></span><span class="ll-step done"><span class="ll-dot"></span>Trial</span>'
        + '<span class="ll-conn done"></span><span class="ll-step done"><span class="ll-dot"></span>Active</span>'
        + '<span class="ll-conn off"></span><span class="ll-step ' + state + '"><span class="ll-dot"></span>' + term + '</span>';
    }
    var steps = [['invited', 'Invited'], ['trial', 'Trial'], ['active', 'Active'], ['renewed', 'Renewed']];
    var order = { invited: 0, trial: 1, active: 2, renewed: 3 };
    var cur = order[state] != null ? order[state] : 0;
    return steps.map(function (st, i) {
      var cls = i < cur ? 'done' : (i === cur ? 'on' : 'todo');
      var conn = i > 0 ? '<span class="ll-conn ' + (i <= cur ? 'done' : '') + '"></span>' : '';
      return conn + '<span class="ll-step ' + cls + '"><span class="ll-dot"></span>' + st[1] + '</span>';
    }).join('');
  }

  /* ============================================================
     MEMBERS & SEATS
     ============================================================ */
  function members(d) {
    var c = d.company;
    var pct = seatPct(d);
    var near = pct >= 90;

    var seatCard = '<div class="card span2">' + cardHead('Seat allocation', d.billing.planLabel + ' plan')
      + '<div class="cd-seatbar-wrap">'
      +   '<div class="cd-seatbar-top"><div><span class="cd-seat-big">' + d.counts.seatsUsed + '</span><span class="cd-seat-of"> of ' + d.counts.seatsTotal + ' seats in use</span></div>'
      +     '<div class="cd-seat-meta">' + (d.counts.seatsTotal - d.counts.seatsUsed) + ' available' + (near ? ' · <span class="cd-warn">near limit</span>' : '') + '</div></div>'
      +   '<div class="cd-seatbar' + (near ? ' near' : '') + '"><span class="cd-seatfill" style="width:' + pct + '%"></span></div>'
      + '</div></div>';

    var roleClass = { owner: 'r-owner', admin: 'r-admin', engineer: 'r-eng', viewer: 'r-view', billing: 'r-bill' };
    var rows = d.members.map(function (m) {
      var st = m.status === 'active' ? 'active' : (m.status === 'invited' ? 'invited' : 'inactive');
      var stLabel = { active: 'Active', invited: 'Invited', inactive: 'Inactive' }[st];
      var stCls = { active: 'cd-on', invited: 'cd-pend', inactive: 'cd-off' }[st];
      return '<tr>'
        + '<td><div class="cd-member"><span class="cd-m-av">' + esc(initials(m.name)) + '</span>'
        +   '<div class="cd-m-txt"><div class="cd-m-name">' + esc(m.name) + (m.role === 'owner' ? '<span class="cd-m-you">Owner</span>' : '') + '</div><div class="cd-m-mail mono">' + esc(m.email) + '</div></div></div></td>'
        + '<td><span class="cd-role ' + (roleClass[m.role] || '') + '">' + esc(m.roleLabel) + '</span></td>'
        + '<td><span class="cd-pill ' + stCls + '">' + (st === 'active' ? '<span class="cd-dot"></span>' : '') + stLabel + '</span></td>'
        + '<td class="cd-m-last">' + (m.lastActive ? '<span class="pd-date">' + fmt(m.lastActive) + '</span><span class="cd-m-ago">' + D().relLabel(m.lastActive) + '</span>' : '<span class="pd-dash">—</span>') + '</td>'
        + '</tr>';
    }).join('');

    var memberCard = '<div class="card span2">' + cardHead('Members', d.counts.members + ' user' + (d.counts.members === 1 ? '' : 's'))
      + '<table class="cd-table"><thead><tr><th>Member</th><th class="th-role">Role</th><th class="th-status">Status</th><th class="th-last">Last active</th></tr></thead><tbody>'
      + (rows || '<tr><td colspan="4"><div class="rel-empty">No members have been provisioned yet.</div></td></tr>')
      + '</tbody></table></div>';

    return pane('Members & seats', 'Who has access to this tenant workspace, their roles and seat usage.',
      '<div class="gform">' + seatCard + memberCard + '</div>');
  }

  /* ============================================================
     PROJECTS
     ============================================================ */
  function projects(d) {
    var c = d.company;
    var THUMBS = D().THUMBS;
    if (!d.projects.length) {
      return pane('Projects', 'Projects created inside this tenant workspace.',
        '<div class="card"><div class="prj-empty"><div class="pe-ico">' + ico('<path d="M4 20V8.5a1 1 0 0 1 .4-.8l6-4.5a1 1 0 0 1 1.2 0l6 4.5a1 1 0 0 1 .4.8V20"/><path d="M3 20h18"/>', 22) + '</div>'
        + '<div class="pet">No projects yet</div><div class="pes">This tenant has not created any projects. Projects will appear here once the team starts modelling.</div></div></div>');
    }
    var rows = d.projects.map(function (p) {
      return '<tr>'
        + '<td class="prj-model"><span class="prj-thumb"><img src="' + THUMBS[p.thumb] + '" alt="" loading="lazy"></span></td>'
        + '<td><div class="prj-name">' + esc(p.name) + '</div><div class="prj-code mono">' + esc(p.code) + '</div></td>'
        + '<td><span class="prj-city">' + ico('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>', 14) + esc(p.city) + '</span></td>'
        + '<td>' + projBadge(p.status) + '</td>'
        + '<td><div class="cd-prog"><div class="cd-prog-track"><span class="cd-prog-fill" style="width:' + p.pct + '%"></span></div><span class="cd-prog-n mono">' + p.pct + '%</span></div></td>'
        + '<td class="prj-cell">' + esc(p.lead) + '</td>'
        + '<td><span class="prj-date">' + fmt(p.updated) + '</span></td>'
        + '</tr>';
    }).join('');

    return pane('Projects', d.projects.length + ' project' + (d.projects.length === 1 ? '' : 's') + ' created inside this tenant workspace.',
      '<div class="card"><table class="prj-table cd-prj"><thead><tr>'
      + '<th class="th-model"></th><th>Project</th><th>Location</th><th>Status</th><th class="th-prog">Progress</th><th>Lead engineer</th><th>Updated</th>'
      + '</tr></thead><tbody>' + rows + '</tbody></table></div>');
  }
  function projBadge(status) {
    return '<span class="badge ' + status + '"><span class="dot"></span>' + (PROJ_STATUS_LABEL[status] || status) + '</span>';
  }

  /* ============================================================
     BILLING & PLAN
     ============================================================ */
  function billing(d) {
    var c = d.company, b = d.billing;

    var planCard = '<div class="card">' + cardHead('Plan')
      + row('Current plan', '<span class="cd-plan ' + c.plan + '">' + b.planLabel + '</span>')
      + row('Billing term', esc(b.term))
      + row('Seat price', b.seatPrice ? money(b.seatPrice) + ' <span class="pd-sub">/ seat / month</span>' : '<span class="pd-dash">—</span>')
      + row('Contracted seats', '<span class="pd-strong">' + b.seatsTotal + '</span> <span class="pd-sub">· ' + b.seatsUsed + ' in use</span>')
      + row('Auto-renew', b.autoRenew ? '<span class="cd-pill cd-on">' + ico('<path d="M20 6 9 17l-5-5"/>', 12) + 'Enabled</span>' : '<span class="cd-pill cd-off">Off</span>')
      + '</div>';

    var billCard = '<div class="card">' + cardHead('Billing')
      + row('Monthly recurring', b.mrr ? '<span class="pd-strong">' + money(b.mrr) + '</span> <span class="pd-sub">MRR</span>' : '<span class="pd-dash">—</span>')
      + row('Annual value', b.arr ? money(b.arr) + ' <span class="pd-sub">ARR</span>' : '<span class="pd-dash">—</span>')
      + row('Contract period', '<span class="pd-date">' + fmt(b.contractStart) + '</span> <span class="pd-sub">→</span> <span class="pd-date">' + fmt(b.contractEnd) + '</span>')
      + row('Next invoice', b.nextInvoice ? '<span class="pd-date">' + fmt(b.nextInvoice) + '</span>' : '<span class="pd-dash">—</span>')
      + row('Payment method', '<span class="cd-pay">' + esc(b.paymentMethod) + '</span>')
      + '</div>';

    /* MRR / value highlight strip */
    var stat = '<div class="pd-stats cd-bill-stats">'
      + billStat(b.mrr ? money(b.mrr) : '—', 'Monthly recurring', 'MRR', '<path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>')
      + billStat(b.arr ? money(b.arr) : '—', 'Annual value', 'ARR', '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>')
      + billStat(b.seatsTotal + '', 'Contracted seats', b.seatsUsed + ' in use', '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>')
      + billStat(b.invoices.length + '', 'Invoices', 'on record', '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/>')
      + '</div>';

    var invRows = b.invoices.length
      ? b.invoices.map(function (inv) {
        var stCls = inv.status === 'paid' ? 'cd-on' : 'cd-warn2';
        var stLabel = inv.status === 'paid' ? 'Paid' : 'Overdue';
        return '<tr>'
          + '<td class="mono cd-inv-no">' + esc(inv.no) + '</td>'
          + '<td><span class="pd-date">' + fmt(inv.issued) + '</span></td>'
          + '<td class="cd-inv-seats">' + inv.seats + ' seats</td>'
          + '<td class="mono cd-inv-amt">' + money(inv.amount) + '</td>'
          + '<td><span class="cd-pill ' + stCls + '">' + stLabel + '</span></td>'
          + '<td class="cd-inv-act"><button class="vact" type="button">' + ico('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>', 13) + ' PDF</button></td>'
          + '</tr>';
      }).join('')
      : '<tr><td colspan="6"><div class="rel-empty">No invoices yet — this tenant is on a trial.</div></td></tr>';

    var invCard = '<div class="card span2">' + cardHead('Invoice history', b.invoices.length + ' invoice' + (b.invoices.length === 1 ? '' : 's'))
      + '<table class="cd-table cd-inv-table"><thead><tr><th>Invoice</th><th>Issued</th><th>Seats</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>'
      + invRows + '</tbody></table></div>';

    return pane('Plan & billing', 'Subscription plan, recurring value and invoice history for this tenant.',
      stat + '<div class="gform">' + planCard + billCard + invCard + '</div>');
  }
  function billStat(big, label, sub, glyph) {
    var unused = (big === '—' || big === '0');
    return '<div class="pd-stat' + (unused ? ' unused' : '') + '">'
      + '<span class="pd-stat-ico">' + ico(glyph, 18) + '</span>'
      + '<div class="pd-stat-n cd-stat-money">' + esc(big) + '</div>'
      + '<div class="pd-stat-l">' + esc(label) + '</div>'
      + '<div class="pd-stat-s">' + esc(sub) + '</div></div>';
  }

  /* ============================================================
     ACTIVITY
     ============================================================ */
  function activity(d) {
    var kindIcon = {
      created: '<path d="M5 12h14"/><path d="M12 5v14"/>',
      plan: '<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
      trial: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      seats: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
      member: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>',
      billing: '<rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/>',
      login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/>',
      project: '<path d="M4 20V8.5a1 1 0 0 1 .4-.8l6-4.5a1 1 0 0 1 1.2 0l6 4.5a1 1 0 0 1 .4.8V20"/><path d="M3 20h18"/>',
      invited: '<path d="M22 7 13.03 12.7a1.94 1.94 0 0 1-2.06 0L2 7"/><rect x="2" y="4" width="20" height="16" rx="2"/>',
      suspended: '<circle cx="12" cy="12" r="9"/><path d="m4.9 4.9 14.2 14.2"/>',
      churned: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>'
    };
    var nodeCls = { created: 'created', plan: 'published', trial: 'reviewed', member: 'created', billing: 'reviewed', login: 'published', project: 'reviewed', invited: 'reviewed', suspended: 'archived', churned: 'archived', seats: '' };
    var items = d.activity.map(function (e, i) {
      return '<div class="tl-item"><div class="tl-rail"><div class="tl-node ' + (nodeCls[e.kind] || '') + '">' + ico(kindIcon[e.kind] || kindIcon.created, 15) + '</div><div class="tl-line"></div></div>'
        + '<div class="tl-body"><div class="tl-top"><span class="tl-action">' + esc(e.action) + '</span>'
        + '<span class="tl-date">' + fmt(e.date) + ' · ' + esc(e.time) + '</span></div>'
        + '<div class="tl-details">' + esc(e.details) + '</div>'
        + '<div class="tl-user"><span class="tl-avatar">' + esc(initials(e.user)) + '</span><span class="tl-uname">' + esc(e.user) + '</span></div>'
        + '</div></div>';
    }).join('');
    return pane('Activity', 'Complete account history — provisioning, plan changes, members and billing, with timestamps.',
      '<div class="card"><div class="timeline">' + items + '</div></div>');
  }

  window.CompanyDetailTabs = {
    overview: { render: overview },
    members: { render: members },
    projects: { render: projects },
    billing: { render: billing },
    activity: { render: activity }
  };
})();
