/* ============================================================
   VBG — System administration · data + panel renderers
   Exposes window.VBG_SYS: data arrays (mutable state for toggles)
   and render functions returning panel HTML strings.
   Light DOM, vanilla. Relies on design tokens (styles/tokens.css).
   ============================================================ */
(function () {
  'use strict';

  function ico(path, size, sw) { size = size || 16; sw = sw || 1.7; return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---- shared glyphs ---- */
  var I = {
    gateway: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/><rect x="2" y="4" width="3" height="16" rx="1"/>',
    workers: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    validate: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>',
    render: '<path d="M12 2 2 7l10 5 10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
    db: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
    storage: '<path d="M22 12H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><path d="M6 16h.01"/><path d="M10 16h.01"/>',
    auth: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    queue: '<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>',
    analytics: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
    cpu: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/>',
    mem: '<path d="M6 19v-3"/><path d="M10 19v-3"/><path d="M14 19v-3"/><path d="M18 19v-3"/><path d="M8 11V9"/><path d="M16 11V9"/><path d="M12 11V9"/><path d="M2 15h20"/><path d="M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1.1a2 2 0 0 0 0 3.837V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5.1a2 2 0 0 0 0-3.837Z"/>',
    bolt: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    building: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/>',
    key: '<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/>',
    fingerprint: '<path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    timer: '<path d="M10 2h4"/><path d="M12 14v-4"/><circle cx="12" cy="14" r="8"/>',
    layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
    box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    columns: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/>',
    facade: '<path d="M3 21V8l9-5 9 5v13"/><path d="M3 21h18"/><path d="M9 21V12h6v9"/>',
    pipe: '<path d="M3 12h4l3-9 4 18 3-9h4"/>',
    report: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5Z"/><path d="M14 2v6h6"/><path d="M9 13h6"/><path d="M9 17h3"/>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    backup: '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M12 7v5l3 2"/>',
    shieldAlert: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    webhook: '<path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2"/><path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06"/><path d="m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8"/>',
    plug: '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
    flask: '<path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.52 16h12.96"/>'
  };

  /* ============================================================
     STATE (mutable — toggles flip these; controller marks dirty)
     ============================================================ */
  var SERVICES = [
    { name: 'API gateway',          id: 'svc-gateway',  ic: I.gateway,   status: 'operational', latency: '42 ms',  load: '1.2k rps', check: '8s ago',  restart: true },
    { name: 'Generation workers',   id: 'svc-gen',      ic: I.workers,   status: 'operational', latency: '—',      load: '7 active', check: '6s ago',  restart: true },
    { name: 'Validation engine',    id: 'svc-validate', ic: I.validate,  status: 'operational', latency: '88 ms',  load: '210 /min', check: '6s ago',  restart: true },
    { name: '3D render service',    id: 'svc-render',   ic: I.render,    status: 'degraded',    latency: '640 ms', load: '34 active', check: '4s ago', restart: true },
    { name: 'PostgreSQL primary',   id: 'svc-db',       ic: I.db,        status: 'operational', latency: '3 ms',   load: '118 conn',  check: '9s ago', restart: false },
    { name: 'Object storage',       id: 'svc-storage',  ic: I.storage,   status: 'operational', latency: '21 ms',  load: '64% used',  check: '11s ago', restart: false },
    { name: 'Auth / SSO service',   id: 'svc-auth',     ic: I.auth,      status: 'operational', latency: '54 ms',  load: '320 /min',  check: '7s ago', restart: true },
    { name: 'Email / SMTP relay',   id: 'svc-mail',     ic: I.mail,      status: 'operational', latency: '120 ms', load: '94% sent',  check: '20s ago', restart: true },
    { name: 'Message queue',        id: 'svc-queue',    ic: I.queue,     status: 'operational', latency: '12 ms',  load: '12 queued', check: '5s ago',  restart: true },
    { name: 'Analytics pipeline',   id: 'svc-analytics',ic: I.analytics, status: 'idle',        latency: '—',      load: 'batch 04:00', check: '1m ago', restart: true }
  ];

  var METRICS = [
    { label: 'CPU utilisation',   ic: I.cpu,  pct: 38, val: '38%',     sub: '12 vCPU · cluster avg', tone: 'ok' },
    { label: 'Memory',            ic: I.mem,  pct: 61, val: '61%',     sub: '39.2 / 64 GB',          tone: 'ok' },
    { label: 'Generation queue',  ic: I.bolt, pct: 30, val: '12 jobs', sub: 'depth · 7 running',     tone: 'teal' },
    { label: 'Database load',     ic: I.db,   pct: 47, val: '47%',     sub: '118 / 250 connections', tone: 'ok' },
    { label: 'Object storage',    ic: I.storage, pct: 64, val: '64%',  sub: '5.1 / 8 TB allocated',  tone: 'warn' }
  ];

  var ISSUES = [
    { sev: 'error', src: 'svc-render',   msg: 'WebGPU device lost on render node rn-03 — job re-queued', t: '14:22' },
    { sev: 'error', src: 'svc-mail',     msg: 'SMTP timeout to relay (2 retries) — recovered',           t: '11:08' },
    { sev: 'error', src: 'svc-gen',      msg: 'Generation VBG-04-NC exceeded memory budget — retried',    t: '09:41' },
    { sev: 'warn',  src: 'svc-storage',  msg: 'Object storage at 64% of allocated quota',                 t: '08:30' },
    { sev: 'warn',  src: 'svc-validate', msg: 'Rule R-217.b validation latency above 500 ms threshold',   t: '07:55' },
    { sev: 'warn',  src: 'svc-db',       msg: 'Slow query detected on audit_events (1.8 s)',              t: '02:14' }
  ];

  var PROVIDERS = [
    { id: 'pw',    name: 'Email & password', ic: I.auth, on: true,  cfg: 'Built-in', sub: 'Local credential store with password policy enforcement.', meta: '38 active accounts' },
    { id: 'saml',  name: 'SAML 2.0 SSO',     ic: I.fingerprint, on: true, cfg: 'Configured', sub: 'Single sign-on via enterprise identity provider.', meta: 'IdP · login.vbg-corp.io', badge: 'teal', badgeLabel: 'Connected' },
    { id: 'oidc',  name: 'Microsoft Entra ID', ic: I.key, on: true,  cfg: 'Configured', sub: 'OpenID Connect for tenant directory federation.', meta: 'Tenant · vbg.onmicrosoft.com', badge: 'teal', badgeLabel: 'Connected' },
    { id: 'google',name: 'Google Workspace',  ic: I.globe, on: false, cfg: 'Not configured', sub: 'OAuth 2.0 sign-in for Google Workspace domains.', meta: 'Disabled' },
    { id: 'scim',  name: 'SCIM provisioning', ic: I.users, on: true,  cfg: 'Configured', sub: 'Automated user and group sync from the directory.', meta: 'Last sync 12 min ago', badge: 'teal', badgeLabel: 'Active' }
  ];

  var POLICIES = [
    { id: 'mfa',    ic: I.shieldAlert, on: true,  title: 'Require multi-factor authentication', sub: 'Enforce MFA for all administrator and engineer accounts.' },
    { id: 'iplist', ic: I.globe,       on: false, title: 'IP allowlist',                         sub: 'Restrict platform access to approved network ranges.' },
    { id: 'forcesso', ic: I.fingerprint, on: true, title: 'Force SSO for federated tenants',     sub: 'Disable password login where an identity provider is linked.' },
    { id: 'devicetrust', ic: I.lock,   on: false, title: 'Trusted device enrollment',           sub: 'Require device registration before granting access.' }
  ];

  var PWREQS = [
    { id: 'pw-upper',  on: true,  label: 'Require uppercase & lowercase' },
    { id: 'pw-number', on: true,  label: 'Require at least one number' },
    { id: 'pw-symbol', on: true,  label: 'Require a special character' },
    { id: 'pw-reuse',  on: true,  label: 'Prevent reuse of last 5 passwords' },
    { id: 'pw-breach', on: true,  label: 'Block known breached passwords' }
  ];

  var FLAGS = [
    { key: 'facade_gen_v2',   name: 'Façade generation v2',      on: true,  rollout: 100, env: 'All environments', desc: 'Panelised façade generation engine.' },
    { key: 'webgpu_renderer', name: 'WebGPU renderer',           on: true,  rollout: 80,  env: 'Production', desc: 'Hardware-accelerated 3D viewport.' },
    { key: 'ai_rule_assist',  name: 'AI rule suggestions',       on: true,  rollout: 25,  env: 'Beta tenants', desc: 'Suggested constraints from intent.' },
    { key: 'realtime_collab', name: 'Real-time collaboration',   on: false, rollout: 0,   env: 'Internal only', desc: 'Multi-user concurrent authoring.' },
    { key: 'clash_v3',        name: 'Advanced clash detection',  on: true,  rollout: 60,  env: 'Production', desc: 'MEP / structural clash analysis.' },
    { key: 'ifc_43_export',   name: 'Export to IFC 4.3',         on: true,  rollout: 100, env: 'All environments', desc: 'Native IFC 4.3 fabrication export.' },
    { key: 'new_audit_ui',    name: 'Audit explorer (new UI)',   on: false, rollout: 0,   env: 'Staging', desc: 'Redesigned audit trace viewer.' }
  ];

  var MODULES = [
    { id: 'm-structural', ic: I.columns,  on: true,  title: 'Structural', sub: 'Frames, cores, load paths and structural validation.', meta: '38 tenants' },
    { id: 'm-production', ic: I.box,      on: true,  title: 'Production & precast', sub: 'Element breakdown, casting and fabrication packages.', meta: '31 tenants' },
    { id: 'm-facade',     ic: I.facade,   on: true,  title: 'Façade', sub: 'Cladding systems, panel topology and openings.', meta: '24 tenants' },
    { id: 'm-mep',        ic: I.pipe,     on: true,  title: 'MEP', sub: 'Mechanical, electrical and plumbing routing.', meta: '19 tenants' },
    { id: 'm-viz',        ic: I.layers,   on: true,  title: 'Visualization', sub: 'Generated-reality 3D viewport and walkthroughs.', meta: '38 tenants' },
    { id: 'm-reporting',  ic: I.report,   on: false, title: 'Reporting', sub: 'Compliance reports and evidence export.', meta: 'Add-on · disabled' }
  ];

  var JOBS = [
    { name: 'Nightly backup',          desc: 'Full platform snapshot', cron: '0 2 * * *',   last: 'Today 02:00', next: 'Tomorrow 02:00', status: 'operational', sl: 'Success', dur: '14m 02s' },
    { name: 'Audit log archival',      desc: 'Cold-store events > 90d', cron: '0 3 * * 0',  last: 'Sun 03:00',  next: 'In 4 days',      status: 'operational', sl: 'Success', dur: '6m 18s' },
    { name: 'Usage metering rollup',   desc: 'Per-tenant usage totals', cron: '*/15 * * * *', last: '8 min ago', next: 'In 7 min',     status: 'operational', sl: 'Success', dur: '0m 41s' },
    { name: 'Analytics batch',         desc: 'Aggregate platform stats', cron: '0 4 * * *',  last: 'Today 04:00', next: 'Tomorrow 04:00', status: 'operational', sl: 'Success', dur: '22m 50s' },
    { name: 'License reconciliation',  desc: 'Seat & entitlement sync', cron: '0 1 * * *',   last: 'Today 01:00', next: 'Tomorrow 01:00', status: 'degraded',    sl: 'Warnings', dur: '3m 09s' },
    { name: 'Stale session sweep',     desc: 'Expire idle sessions',    cron: '*/30 * * * *', last: '12 min ago', next: 'In 18 min',    status: 'operational', sl: 'Success', dur: '0m 12s' },
    { name: 'Search index rebuild',    desc: 'Reindex projects & rules', cron: '0 5 * * 1',  last: 'Mon 05:00',  next: 'In 6 days',      status: 'idle',        sl: 'Scheduled', dur: '—' }
  ];

  var NOTIFS = [
    { id: 'n-down',   title: 'Service outage',          desc: 'A platform service becomes unavailable.', sev: 'error', inapp: true,  email: true,  hook: true },
    { id: 'n-degrade',title: 'Degraded performance',    desc: 'Latency or error rate crosses threshold.', sev: 'warn',  inapp: true,  email: true,  hook: false },
    { id: 'n-job',    title: 'Scheduled job failure',   desc: 'A background job fails or reports warnings.', sev: 'warn', inapp: true, email: true,  hook: true },
    { id: 'n-backup', title: 'Backup completed',        desc: 'Nightly backup finishes successfully.',  sev: 'ok',    inapp: false, email: true,  hook: false },
    { id: 'n-quota',  title: 'Quota threshold reached',  desc: 'A tenant nears a usage or storage limit.', sev: 'warn', inapp: true,  email: false, hook: false },
    { id: 'n-sec',    title: 'Security event',          desc: 'Failed logins, policy change, or new admin.', sev: 'error', inapp: true, email: true,  hook: true }
  ];

  /* ---- demo log buffer ---- */
  var LOGS = [
    { t: '14:22:09', lvl: 'error', m: 'svc-render: WebGPU device lost on rn-03 — job re-queued (1 affected)' },
    { t: '14:21:54', lvl: 'info',  m: 'svc-gateway: 1,204 rps · p95 42 ms · 0 5xx' },
    { t: '14:20:30', lvl: 'ok',    m: 'svc-gen: generation VBG-07-EC completed in 3m 12s (48 columns)' },
    { t: '14:18:02', lvl: 'info',  m: 'auth: SSO login s.koenders@vbg.io via SAML (login.vbg-corp.io)' },
    { t: '14:15:44', lvl: 'warn',  m: 'svc-validate: rule R-217.b latency 540 ms > 500 ms threshold' },
    { t: '14:12:19', lvl: 'info',  m: 'jobs: usage metering rollup completed in 41s' },
    { t: '14:09:01', lvl: 'ok',    m: 'svc-queue: drained 312 messages · depth 12' },
    { t: '14:05:37', lvl: 'warn',  m: 'svc-storage: object storage at 64% of allocated quota' },
    { t: '14:01:10', lvl: 'info',  m: 'admin: feature flag webgpu_renderer rollout 70% → 80%' },
    { t: '13:58:42', lvl: 'error', m: 'svc-mail: SMTP timeout to relay — retry 1/3' },
    { t: '13:58:55', lvl: 'ok',    m: 'svc-mail: SMTP delivery recovered after retry' },
    { t: '13:50:00', lvl: 'info',  m: 'scheduler: stale session sweep expired 7 sessions' },
    { t: '13:44:21', lvl: 'info',  m: 'svc-db: 118 active connections · replication lag 0.2 s' },
    { t: '13:40:08', lvl: 'warn',  m: 'svc-gen: VBG-04-NC exceeded memory budget — retried on larger node' },
    { t: '13:31:55', lvl: 'ok',    m: 'admin: security policy "Require MFA" confirmed enabled' }
  ];

  /* ============================================================
     RENDER HELPERS
     ============================================================ */
  function badge(status, label) {
    var L = { operational: 'Operational', degraded: 'Degraded', down: 'Down', idle: 'Idle' };
    return '<span class="badge ' + status + '"><span class="dot"></span>' + (label || L[status] || status) + '</span>';
  }
  function chIc(p) { return '<span class="ch-ic">' + ico(p, 17, 1.8) + '</span>'; }
  function cardHead(p, title, sub, act) {
    return '<div class="card-head">' + chIc(p) + '<div class="ttl"><h2>' + title + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (act ? '<div class="head-act">' + act + '</div>' : '') + '</div>';
  }
  function switchHtml(id, on, label) {
    return '<button class="switch' + (on ? ' on' : '') + '" role="switch" aria-checked="' + on + '" data-switch="' + id + '" aria-label="' + esc(label || id) + '"></button>';
  }
  function meter(m) {
    return '<div class="meter"><div class="m-top"><span class="m-label"><span class="ico" style="color:var(--fg3)">' + ico(m.ic, 16, 1.7) + '</span>' + m.label + '</span><span class="m-val"><b>' + m.val + '</b> · ' + m.sub + '</span></div>'
      + '<div class="track"><span class="fill ' + m.tone + '" style="width:' + m.pct + '%"></span></div></div>';
  }

  /* ============================================================
     PANEL: OVERVIEW
     ============================================================ */
  function pOverview() {
    var ok = SERVICES.filter(function (s) { return s.status === 'operational'; }).length;
    var tiles = ''
      + tile('ok', I.activity, 'System status', '<span class="st-num" style="font-size:24px">Operational</span>', 'All core services responding')
      + tile('amber', I.report, 'Application version', '<span class="st-num mono">v3.8.2</span>', 'Released 2 Jun 2026 · <b>build #a3f9c1</b>')
      + tile('teal', I.layers, 'Active services', '<span class="st-num">' + ok + '</span><span class="st-unit">/ ' + SERVICES.length + ' healthy</span>', '1 degraded · 0 down')
      + tile('info', I.clock, 'Uptime · 30 days', '<span class="st-num">99.98<span class="st-unit" style="font-size:18px">%</span></span>', 'No incidents this week');

    var srvRows = '<div class="drow srv-head srv-grid"><span class="h">Service</span><span class="h">Status</span><span class="h cell-r">Latency</span><span class="h cell-r">Load</span><span class="h cell-r">Action</span></div>';
    srvRows += SERVICES.map(function (s) {
      return '<div class="drow srv-grid">'
        + '<div class="srv-name"><span class="si">' + ico(s.ic, 17, 1.7) + '</span><div class="sn"><div class="t">' + s.name + '</div><div class="s">' + s.id + '</div></div></div>'
        + '<div>' + badge(s.status) + '</div>'
        + '<div class="cell-mono cell-r">' + s.latency + '</div>'
        + '<div class="cell-muted cell-r">' + s.load + '</div>'
        + '<div class="cell-r">' + (s.restart
            ? '<button class="row-btn" data-restart="' + s.id + '" data-name="' + esc(s.name) + '"><span class="ico">' + ico(I.backup, 13, 1.8) + '</span>Restart</button>'
            : '<button class="row-btn" disabled title="Managed service">Managed</button>') + '</div>'
        + '</div>';
    }).join('');
    var serviceCard = '<div class="card span2">' + cardHead(I.layers, 'Service health', '10 services · checked continuously', badge('operational', '9 healthy') ) + '<div class="card-body pad0">' + srvRows + '</div></div>';

    var metricsCard = '<div class="card">' + cardHead(I.activity, 'System health', 'Cluster utilisation') + '<div class="card-body"><div class="meter-list">' + METRICS.map(meter).join('') + '</div></div></div>';

    var errCounts = { error: ISSUES.filter(function (i) { return i.sev === 'error'; }).length, warn: ISSUES.filter(function (i) { return i.sev === 'warn'; }).length };
    var issueRows = ISSUES.map(function (i) {
      var cls = i.sev === 'error' ? 'down' : 'degraded';
      return '<div class="drow" style="grid-template-columns: 84px 1fr 64px;">'
        + '<div>' + badge(cls, i.sev === 'error' ? 'Error' : 'Warning') + '</div>'
        + '<div style="min-width:0"><div style="font:var(--text-sm); color:var(--fg1)">' + esc(i.msg) + '</div><div class="cell-muted" style="margin-top:2px">' + i.src + '</div></div>'
        + '<div class="cell-muted cell-r mono">' + i.t + '</div></div>';
    }).join('');
    var errAct = '<button class="btn-ghost btn-sm" id="ov-logs">View all logs</button>';
    var errCard = '<div class="card span2">'
      + cardHead(I.shieldAlert, 'Errors & warnings', 'Last 24 hours', '<span class="badge down" style="margin-right:6px"><span class="dot"></span>' + errCounts.error + ' errors</span><span class="badge degraded">' + errCounts.warn + ' warnings</span>' + errAct)
      + '<div class="card-body pad0">' + issueRows + '</div></div>';

    var backupCard = '<div class="card">' + cardHead(I.backup, 'Backup status', 'Automated recovery points')
      + '<div class="card-body"><div class="kv">'
      + kv('Last backup', '<span class="badge operational" style="margin-right:6px"><span class="dot"></span>Success</span> Today 02:00')
      + kv('Snapshot size', '4.82 TB')
      + kv('Next scheduled', 'Tomorrow 02:00')
      + kv('Destination', 'eu-west-3 · encrypted')
      + kv('Retention', '30 daily · 12 monthly')
      + kv('Last restore test', '4 Jun 2026 · passed')
      + '</div></div></div>';

    return panelWrap('overview',
      '<div class="stiles">' + tiles + '</div>'
      + '<div class="grid cols-3" style="margin-bottom:20px">' + serviceCard + metricsCard + '</div>'
      + '<div class="grid cols-3">' + errCard + backupCard + '</div>'
    );
  }
  function tile(tone, ic, label, val, sub) {
    return '<div class="stile ' + tone + '"><div class="st-top"><span class="st-label">' + label + '</span><span class="st-ic">' + ico(ic, 17, 1.8) + '</span></div>'
      + '<div class="st-val">' + val + '</div><div class="st-sub">' + sub + '</div></div>';
  }
  function kv(k, v, sans) { return '<div class="kv-row"><span class="k">' + k + '</span><span class="v' + (sans ? ' sans' : '') + '">' + v + '</span></div>'; }

  /* ============================================================
     PANEL: PLATFORM
     ============================================================ */
  function pPlatform() {
    var identity = '<div class="card span3">' + cardHead(I.building, 'Platform identity', 'Global identification and defaults applied to every tenant.')
      + '<div class="card-body"><div class="grid-3f">'
      + field('Platform name', '<input class="input" data-dirty value="VBG — Virtual Building Generator">')
      + field('Environment', selectHtml('plat-env', ['Production', 'Staging', 'Development'], 'Production'))
      + field('Primary region', selectHtml('plat-region', ['EU West (Amsterdam)', 'EU Central (Frankfurt)', 'US East (Virginia)'], 'EU West (Amsterdam)'))
      + field('Default units', '<div class="input-unit"><input class="input mono" value="SI (metric)" disabled><span class="u">locked</span></div>', 'International SI units only.')
      + field('Default timezone', selectHtml('plat-tz', ['Europe/Amsterdam (CET)', 'UTC', 'Europe/London'], 'Europe/Amsterdam (CET)'))
      + field('Default language', selectHtml('plat-lang', ['English (International)', 'Nederlands', 'Deutsch'], 'English (International)'))
      + field('Support email', '<input class="input mono" data-dirty value="support@vbg.io">')
      + field('Platform URL', '<input class="input mono" data-dirty value="app.vbg.io">')
      + '</div>'
      + '<div class="trow" style="border-top:1px solid var(--border-subtle); padding-top:16px; margin-top:4px"><span class="tr-ic">' + ico(I.users, 18, 1.8) + '</span>'
      + '<div class="tr-main"><div class="tr-title">Open tenant registration</div><div class="tr-sub">Allow new organisations to self-register without an invitation.</div></div>'
      + '<div class="tr-aside">' + switchHtml('plat-register', false, 'Open registration') + '</div></div>'
      + '</div></div>';

    var limits = '<div class="card">' + cardHead(I.timer, 'System limits & quotas', 'Platform-wide ceilings.')
      + '<div class="card-body"><div class="grid-2f">'
      + field('Max tenants', '<input class="input mono" data-dirty value="50">', '<b>38</b> provisioned')
      + field('Max users / tenant', '<input class="input mono" data-dirty value="250">', 'Peak tenant: 184')
      + field('Max projects / tenant', '<input class="input mono" data-dirty value="500">', 'Peak tenant: 312')
      + field('Concurrent generations', '<input class="input mono" data-dirty value="16">', '<b>7</b> running now')
      + field('Max upload size', '<div class="input-unit"><input class="input mono" data-dirty value="512"><span class="u">MB</span></div>')
      + field('API rate limit', '<div class="input-unit"><input class="input mono" data-dirty value="2000"><span class="u">/min</span></div>')
      + '</div></div></div>';

    var storage = '<div class="card">' + cardHead(I.storage, 'Storage usage', '5.1 TB of 8 TB allocated')
      + '<div class="card-body"><div class="meter-list">'
      + meter({ label: 'Generated models', ic: I.box, pct: 52, val: '2.6 TB', sub: 'geometry & analysis', tone: 'teal' })
      + meter({ label: 'Documents & exports', ic: I.report, pct: 24, val: '1.2 TB', sub: 'drawing sets, IFC', tone: 'info' })
      + meter({ label: 'Backups', ic: I.backup, pct: 18, val: '0.9 TB', sub: 'recovery snapshots', tone: 'ok' })
      + meter({ label: 'Logs & telemetry', ic: I.activity, pct: 8, val: '0.4 TB', sub: 'audit & metrics', tone: 'warn' })
      + '</div></div></div>';

    var apiTiles = ''
      + tile('info', I.activity, 'Requests today', '<span class="st-num">1.84<span class="st-unit" style="font-size:18px">M</span></span>', '<b>+12%</b> vs. yesterday')
      + tile('ok', I.bolt, 'Avg response', '<span class="st-num">42<span class="st-unit" style="font-size:18px">ms</span></span>', 'p95 · 188 ms')
      + tile('amber', I.shieldAlert, 'Error rate', '<span class="st-num">0.04<span class="st-unit" style="font-size:18px">%</span></span>', '742 of 1.84M · 4xx/5xx')
      + tile('teal', I.key, 'Active API keys', '<span class="st-num">126</span>', 'across 38 tenants');
    var consumers = [
      { n: 'Janssen Bouwgroep', tid: 'VBG-JB-04', req: '412k', pct: 22 },
      { n: 'Heijmans Precast', tid: 'VBG-HP-11', req: '318k', pct: 17 },
      { n: 'BAM Infra Digital', tid: 'VBG-BAM-02', req: '276k', pct: 15 },
      { n: 'Internal automation', tid: 'svc-bot', req: '198k', pct: 11 }
    ];
    var consumerRows = consumers.map(function (c) {
      return '<div class="drow" style="grid-template-columns: 1.4fr 130px 1fr 80px">'
        + '<div style="font:var(--text-body-strong); color:var(--fg1)">' + c.n + '</div>'
        + '<div class="cell-muted mono">' + c.tid + '</div>'
        + '<div class="rollout"><span class="rt"><span class="rf" style="width:' + c.pct + '%"></span></span><span class="rn">' + c.pct + '%</span></div>'
        + '<div class="cell-mono cell-r">' + c.req + '</div></div>';
    }).join('');
    var apiCard = '<div class="card span3">' + cardHead(I.activity, 'API usage', 'Rolling 24-hour platform traffic.', '<button class="btn-ghost btn-sm">Export report</button>')
      + '<div class="card-body"><div class="stiles" style="margin:0">' + apiTiles + '</div></div>'
      + '<div class="card-body pad0" style="border-top:1px solid var(--border-subtle)"><div class="drow srv-head" style="grid-template-columns: 1.4fr 130px 1fr 80px"><span class="h">Top consumer</span><span class="h">Tenant</span><span class="h">Share</span><span class="h cell-r">Requests</span></div>' + consumerRows + '</div></div>';

    return panelWrap('platform',
      '<div class="grid cols-2" style="margin-bottom:20px">' + identity + '</div>'
      + '<div class="grid cols-2" style="margin-bottom:20px">' + limits + storage + '</div>'
      + '<div class="grid cols-2">' + apiCard + '</div>'
    );
  }
  function field(label, control, hint) {
    return '<div class="field"><label>' + label + '</label>' + control + (hint ? '<span class="hint">' + hint + '</span>' : '') + '</div>';
  }
  function selectHtml(id, opts, sel) {
    return '<select class="select" data-dirty id="' + id + '">' + opts.map(function (o) { return '<option' + (o === sel ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select>';
  }

  /* ============================================================
     PANEL: SECURITY
     ============================================================ */
  function pSecurity() {
    var provRows = PROVIDERS.map(function (p) {
      var rb = p.badge ? '<span class="badge ' + p.badge + '">' + p.badgeLabel + '</span>' : '';
      var cfgBtn = '<button class="row-btn" data-cfg="' + p.id + '"><span class="ico">' + ico(I.gateway.replace('<rect x="2" y="4" width="3" height="16" rx="1"/>',''), 13, 1.8) + '</span>Configure</button>';
      return '<div class="trow"><span class="tr-ic">' + ico(p.ic, 18, 1.7) + '</span>'
        + '<div class="tr-main"><div class="tr-title">' + p.name + ' ' + rb + '</div><div class="tr-sub">' + p.sub + '</div><div style="font:var(--text-mono-sm); color:var(--fg4); margin-top:5px">' + p.meta + '</div></div>'
        + '<div class="tr-aside"><button class="row-btn" data-cfg="' + p.id + '">Configure</button>' + switchHtml('prov-' + p.id, p.on, p.name) + '</div></div>';
    }).join('');
    var providers = '<div class="card span3">' + cardHead(I.fingerprint, 'Authentication providers', 'Configure how users sign in to the platform.')
      + '<div class="card-body" style="padding-top:8px; padding-bottom:8px">' + provRows + '</div></div>';

    var polRows = POLICIES.map(function (p) {
      return '<div class="trow"><span class="tr-ic">' + ico(p.ic, 18, 1.7) + '</span>'
        + '<div class="tr-main"><div class="tr-title">' + p.title + '</div><div class="tr-sub">' + p.sub + '</div></div>'
        + '<div class="tr-aside">' + switchHtml('pol-' + p.id, p.on, p.title) + '</div></div>';
    }).join('');
    var policies = '<div class="card">' + cardHead(I.shieldAlert, 'Security policies', 'Access and authentication controls.')
      + '<div class="card-body" style="padding-top:8px; padding-bottom:8px">' + polRows + '</div></div>';

    var pwTop = '<div class="field" style="max-width:200px"><label>Minimum length</label><div class="input-unit"><input class="input mono" data-dirty value="12"><span class="u">chars</span></div></div>';
    var pwToggles = PWREQS.map(function (r) {
      return '<div class="trow" style="padding:11px 0"><div class="tr-main"><div class="tr-title" style="font:var(--text-sm); color:var(--fg1)">' + r.label + '</div></div><div class="tr-aside">' + switchHtml(r.id, r.on, r.label) + '</div></div>';
    }).join('');
    var pwExpiry = '<div class="field" style="max-width:280px; margin-top:4px"><label>Password expiry</label>' + selectHtml('pw-expiry', ['Never', 'Every 90 days', 'Every 180 days', 'Every 365 days'], 'Every 180 days') + '</div>';
    var pwReq = '<div class="card">' + cardHead(I.key, 'Password requirements', 'Complexity rules for local accounts.')
      + '<div class="card-body" style="gap:12px">' + pwTop + '<div style="border-top:1px solid var(--border-subtle); padding-top:4px">' + pwToggles + '</div>' + pwExpiry + '</div></div>';

    var session = '<div class="card span3">' + cardHead(I.timer, 'Session management', 'Control how long sessions stay active.')
      + '<div class="card-body"><div class="grid-3f">'
      + field('Session timeout', selectHtml('ses-timeout', ['4 hours', '8 hours', '12 hours', '24 hours'], '8 hours'), 'Maximum lifetime of a session.')
      + field('Idle lock', selectHtml('ses-idle', ['15 minutes', '30 minutes', '1 hour', 'Never'], '30 minutes'), 'Auto-lock after inactivity.')
      + field('Remember-me duration', selectHtml('ses-remember', ['Disabled', '7 days', '14 days', '30 days'], '14 days'))
      + field('Max concurrent sessions', '<input class="input mono" data-dirty value="5">', 'Per user account.')
      + field('Re-auth for sensitive actions', selectHtml('ses-reauth', ['Always', 'Every 1 hour', 'Every 4 hours'], 'Every 1 hour'))
      + field('Single session enforcement', '<div style="display:flex; align-items:center; gap:12px; height:42px">' + switchHtml('ses-single', false, 'Single session') + '<span class="hint">Sign out other devices on login.</span></div>')
      + '</div></div></div>';

    return panelWrap('security',
      '<div class="grid cols-2" style="margin-bottom:20px">' + providers + '</div>'
      + '<div class="grid cols-2" style="margin-bottom:20px">' + policies + pwReq + '</div>'
      + '<div class="grid cols-2">' + session + '</div>'
    );
  }

  /* ============================================================
     PANEL: FEATURES
     ============================================================ */
  function pFeatures() {
    var head = '<div class="drow flag-head flag-grid"><span class="h">Flag</span><span class="h">Environment</span><span class="h">Rollout</span><span class="h cell-r">On</span></div>';
    var rows = FLAGS.map(function (f) {
      return '<div class="drow flag-grid">'
        + '<div class="flag-name"><div class="t">' + f.name + '</div><div class="k">' + f.key + '</div></div>'
        + '<div><span class="badge ' + (f.env === 'Production' || f.env === 'All environments' ? 'operational' : f.env.indexOf('Beta') > -1 ? 'amber' : 'idle') + '">' + f.env + '</span></div>'
        + '<div class="rollout"><span class="rt"><span class="rf" style="width:' + f.rollout + '%"></span></span><span class="rn">' + f.rollout + '%</span></div>'
        + '<div class="cell-r">' + switchHtml('flag-' + f.key, f.on, f.name) + '</div></div>';
    }).join('');
    var flags = '<div class="card span3">' + cardHead(I.bolt, 'Feature flags', FLAGS.filter(function(f){return f.on;}).length + ' of ' + FLAGS.length + ' enabled · scoped per environment', '<button class="btn-ghost btn-sm"><span class="ico">' + ico('<path d="M5 12h14"/><path d="M12 5v14"/>', 15, 1.9) + '</span>New flag</button>')
      + '<div class="card-body pad0">' + head + rows + '</div></div>';

    var mods = MODULES.map(function (m) {
      return '<div class="mod' + (m.on ? ' on' : '') + '" data-mod="' + m.id + '"><span class="md-ic">' + ico(m.ic, 19, 1.7) + '</span>'
        + '<div class="md-main"><div class="md-title">' + m.title + '</div><div class="md-sub">' + m.sub + '</div><div class="md-meta">' + m.meta + '</div></div>'
        + '<div style="flex:0 0 auto">' + switchHtml('mod-' + m.id, m.on, m.title) + '</div></div>';
    }).join('');
    var modules = '<div class="card span3">' + cardHead(I.layers, 'Enabled modules', 'Engineering disciplines available across the platform.')
      + '<div class="card-body"><div class="mod-grid">' + mods + '</div></div></div>';

    return panelWrap('features',
      '<div class="grid cols-2" style="margin-bottom:20px">' + flags + '</div>'
      + '<div class="grid cols-2">' + modules + '</div>'
    );
  }

  /* ============================================================
     PANEL: OPERATIONS
     ============================================================ */
  function pOperations() {
    var head = '<div class="drow job-head job-grid"><span class="h">Job</span><span class="h">Schedule</span><span class="h">Last run</span><span class="h">Next run</span><span class="h">Duration</span><span class="h cell-r">Run</span></div>';
    var rows = JOBS.map(function (j) {
      return '<div class="drow job-grid">'
        + '<div class="job-name"><div class="t">' + j.name + '</div><div class="d">' + j.desc + '</div></div>'
        + '<div class="cell-mono">' + j.cron + '</div>'
        + '<div style="min-width:0"><div style="font:var(--text-sm); color:var(--fg1)">' + j.last + '</div><div style="margin-top:2px">' + badge(j.status, j.sl) + '</div></div>'
        + '<div class="cell-muted">' + j.next + '</div>'
        + '<div class="cell-mono">' + j.dur + '</div>'
        + '<div class="cell-r"><button class="row-btn" data-run="' + esc(j.name) + '"><span class="ico">' + ico('<polygon points="6 3 20 12 6 21 6 3"/>', 12, 1.8) + '</span>Run</button></div></div>';
    }).join('');
    var jobs = '<div class="card span3">' + cardHead(I.clock, 'Scheduled jobs & background tasks', JOBS.length + ' jobs · all times Europe/Amsterdam', '<button class="btn-ghost btn-sm">Job history</button>')
      + '<div class="card-body pad0">' + head + rows + '</div></div>';

    var backup = '<div class="card">' + cardHead(I.backup, 'Backup & recovery', 'Automated snapshots and restore policy.')
      + '<div class="card-body"><div class="grid-2f">'
      + field('Backup frequency', selectHtml('bk-freq', ['Hourly', 'Every 6 hours', 'Daily', 'Weekly'], 'Daily'))
      + field('Backup window', selectHtml('bk-window', ['00:00–04:00', '02:00–06:00', '22:00–02:00'], '02:00–06:00'))
      + field('Retention — daily', '<div class="input-unit"><input class="input mono" data-dirty value="30"><span class="u">days</span></div>')
      + field('Retention — monthly', '<div class="input-unit"><input class="input mono" data-dirty value="12"><span class="u">mo</span></div>')
      + '</div>'
      + '<div class="trow" style="border-top:1px solid var(--border-subtle); padding-top:14px"><span class="tr-ic">' + ico(I.lock, 18, 1.8) + '</span><div class="tr-main"><div class="tr-title">Encrypt backups at rest</div><div class="tr-sub">AES-256 with platform-managed keys.</div></div><div class="tr-aside">' + switchHtml('bk-encrypt', true, 'Encrypt backups') + '</div></div>'
      + '<div class="trow"><span class="tr-ic">' + ico(I.globe, 18, 1.8) + '</span><div class="tr-main"><div class="tr-title">Cross-region replication</div><div class="tr-sub">Copy snapshots to a secondary region.</div></div><div class="tr-aside">' + switchHtml('bk-replica', true, 'Cross-region replication') + '</div></div>'
      + '<div style="display:flex; gap:10px; margin-top:4px"><button class="btn-ghost btn-sm"><span class="ico">' + ico(I.backup, 14, 1.8) + '</span>Back up now</button><button class="btn-ghost btn-sm">Restore from snapshot…</button></div>'
      + '</div></div>';

    var retention = '<div class="card">' + cardHead(I.report, 'Data & audit retention', 'How long records are kept before archival.')
      + '<div class="card-body"><div class="grid-2f">'
      + field('Audit log retention', selectHtml('rt-audit', ['90 days', '1 year', '3 years', '7 years'], '3 years'), 'Active store before cold archive.')
      + field('Audit cold archive', selectHtml('rt-archive', ['1 year', '3 years', '7 years', 'Indefinite'], '7 years'))
      + field('System log retention', selectHtml('rt-syslog', ['14 days', '30 days', '90 days'], '30 days'))
      + field('Deleted project recovery', selectHtml('rt-deleted', ['7 days', '30 days', '90 days'], '30 days'))
      + '</div>'
      + '<div class="trow" style="border-top:1px solid var(--border-subtle); padding-top:14px"><span class="tr-ic">' + ico(I.lock, 18, 1.8) + '</span><div class="tr-main"><div class="tr-title">Immutable audit trail</div><div class="tr-sub">Prevent deletion or edit of audit events (WORM).</div></div><div class="tr-aside">' + switchHtml('rt-immutable', true, 'Immutable audit trail') + '</div></div>'
      + '<div class="trow"><span class="tr-ic">' + ico(I.report, 18, 1.8) + '</span><div class="tr-main"><div class="tr-title">Auto-export to evidence store</div><div class="tr-sub">Nightly signed export for compliance.</div></div><div class="tr-aside">' + switchHtml('rt-export', false, 'Auto-export evidence') + '</div></div>'
      + '</div></div>';

    return panelWrap('operations',
      '<div class="grid cols-2" style="margin-bottom:20px">' + jobs + '</div>'
      + '<div class="grid cols-2">' + backup + retention + '</div>'
    );
  }

  /* ============================================================
     PANEL: NOTIFICATIONS
     ============================================================ */
  function pNotifications() {
    var sevDot = { error: 'var(--status-error)', warn: 'var(--status-warning)', ok: 'var(--status-success)' };
    var sevLbl = { error: 'Critical', warn: 'Warning', ok: 'Info' };
    var head = '<div class="nm-head"><span class="c">Event</span><span class="c">In-app</span><span class="c">Email</span><span class="c">Webhook</span></div>';
    var rows = NOTIFS.map(function (n) {
      return '<div class="nm-row"><div class="nm-main"><div class="nm-title">' + n.title + ' <span class="sev" style="margin-left:6px"><span class="dot" style="background:' + sevDot[n.sev] + '"></span><span style="color:var(--fg3)">' + sevLbl[n.sev] + '</span></span></div><div class="nm-desc">' + n.desc + '</div></div>'
        + '<div class="nm-cell">' + switchHtml('nt-' + n.id + '-inapp', n.inapp, n.title + ' in-app') + '</div>'
        + '<div class="nm-cell">' + switchHtml('nt-' + n.id + '-email', n.email, n.title + ' email') + '</div>'
        + '<div class="nm-cell">' + switchHtml('nt-' + n.id + '-hook', n.hook, n.title + ' webhook') + '</div></div>';
    }).join('');
    var routing = '<div class="card span3">' + cardHead(I.activity, 'System alert routing', 'Choose how administrators are notified of platform events.')
      + '<div class="card-body"><div class="nmatrix">' + head + rows + '</div></div></div>';

    var email = '<div class="card">' + cardHead(I.mail, 'Email configuration', 'SMTP relay for platform mail.', badge('operational', 'Connected'))
      + '<div class="card-body"><div class="grid-2f">'
      + field('SMTP host', '<input class="input mono" data-dirty value="smtp.eu.vbg.io">')
      + field('Port', '<input class="input mono" data-dirty value="587">')
      + field('Encryption', selectHtml('em-enc', ['STARTTLS', 'TLS/SSL', 'None'], 'STARTTLS'))
      + field('Auth', selectHtml('em-auth', ['Login', 'OAuth 2.0', 'API key'], 'Login'))
      + '</div>'
      + field('Sender address', '<input class="input mono" data-dirty value="no-reply@vbg.io">')
      + '<div style="display:flex; align-items:center; gap:12px"><button class="btn-ghost btn-sm" id="email-test"><span class="ico">' + ico(I.mail, 14, 1.8) + '</span>Send test email</button><span class="hint" id="email-test-note">Last test delivered 1 hour ago · 120 ms</span></div>'
      + '</div></div>';

    var integ = [
      { n: 'Datadog', sub: 'Metrics & traces', status: 'operational', meta: 'synced 2 min ago' },
      { n: 'PagerDuty', sub: 'On-call paging', status: 'operational', meta: 'connected' },
      { n: 'Slack', sub: 'Alert channel #ops', status: 'operational', meta: 'connected' },
      { n: 'Webhook · evidence', sub: 'Compliance export', status: 'degraded', meta: '2 retries' },
      { n: 'Speckle', sub: 'BIM exchange', status: 'idle', meta: 'paused by tenant' }
    ];
    var integRows = integ.map(function (s) {
      return '<div class="trow" style="padding:13px 0"><span class="tr-ic">' + ico(I.plug, 18, 1.7) + '</span>'
        + '<div class="tr-main"><div class="tr-title" style="font:var(--text-body-strong)">' + s.n + '</div><div class="tr-sub">' + s.sub + ' · ' + s.meta + '</div></div>'
        + '<div class="tr-aside">' + badge(s.status) + '</div></div>';
    }).join('');
    var integration = '<div class="card">' + cardHead(I.plug, 'Integration service status', 'Health of connected external services.', '<a class="btn-ghost btn-sm" href="Integrations.html" style="text-decoration:none">Manage</a>')
      + '<div class="card-body" style="padding-top:6px; padding-bottom:6px">' + integRows + '</div></div>';

    return panelWrap('notifications',
      '<div class="grid cols-2" style="margin-bottom:20px">' + routing + '</div>'
      + '<div class="grid cols-2">' + email + integration + '</div>'
    );
  }

  function panelWrap(id, inner) { return '<section class="panel" data-panel="' + id + '">' + inner + '</section>'; }

  /* ============================================================
     EXPORT
     ============================================================ */
  window.VBG_SYS = {
    ico: ico, esc: esc, I: I,
    FLAGS: FLAGS, MODULES: MODULES, LOGS: LOGS,
    panels: function () {
      return pOverview() + pPlatform() + pSecurity() + pFeatures() + pOperations() + pNotifications();
    }
  };
})();
