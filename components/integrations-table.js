/* ============================================================
   VBG — reusable integrations table web component
   Usage:  <vbg-integrations-table></vbg-integrations-table>
   Columns: glyph tile · integration (name + id + provider) ·
            type · auth method · status · connected tenants ·
            last sync (date + sync status) · actions (kebab)

   Integrations are the external systems, services and platform
   connections wired into the VBG ecosystem — BIM/CAD authorities,
   ERP systems, identity providers, file storage, analytics,
   fabrication endpoints, GIS and webhook relays. This is an admin
   management surface: the kebab carries every integration action;
   a row click opens the detail / configuration drawer.

   Renders into LIGHT DOM so screenshots / PDF / PPTX capture it.
   Styles scoped under `vbg-integrations-table`, injected once.
   Relies on the global design tokens (styles/tokens.css).

   Data + facet helpers are exposed on window.VBG_INTEGRATIONS so the
   page can build the filter sidebar, stats and add-catalog from one
   source. The component reads `this.filters` (set via setFilters)
   and dispatches `integrationsrender` { visible, total } after every
   render, plus `integrationopen` { id } on row / "configure" intent.
   ============================================================ */
(function () {
  /* "now" for relative sync timing — keep in sync with project date */
  const NOW = new Date('2026-06-09T09:30:00');

  /* ---- integration types (Lucide-style line glyphs) ---- */
  const TYPES = {
    bim:         { label: 'BIM / CAD',        glyph: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>' },
    erp:         { label: 'ERP',              glyph: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>' },
    identity:    { label: 'Identity / SSO',   glyph: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><circle cx="12" cy="10" r="2"/><path d="M12 12v4"/>' },
    storage:     { label: 'File storage',     glyph: '<path d="M22 12H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><path d="M6 16h.01"/><path d="M10 16h.01"/>' },
    analytics:   { label: 'Analytics & BI',   glyph: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>' },
    comms:       { label: 'Communication',    glyph: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>' },
    pm:          { label: 'Project mgmt',     glyph: '<rect width="8" height="8" x="3" y="3" rx="1"/><rect width="8" height="8" x="13" y="3" rx="1"/><rect width="8" height="8" x="3" y="13" rx="1"/><path d="M17 13v8"/><path d="M13 17h8"/>' },
    fabrication: { label: 'Fabrication / CAM',glyph: '<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/>' },
    gis:         { label: 'GIS / geospatial', glyph: '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M9 4v13"/><path d="M15 7v13"/>' },
    api:         { label: 'API / Webhook',    glyph: '<path d="M18 16.98h-5.99c-1.66 0-3.01-1.34-3.01-3s1.35-3 3.01-3H18"/><path d="m21 12-3-3v6z" fill="currentColor" stroke="none"/><circle cx="6" cy="14" r="3"/>' }
  };

  const AUTH = {
    oauth:   'OAuth 2.0',
    apikey:  'API key',
    saml:    'SAML 2.0',
    scim:    'SCIM',
    service: 'Service account',
    webhook: 'Webhook signature',
    pat:     'Personal token'
  };

  const STATUS_LABEL = {
    connected: 'Connected', disconnected: 'Disconnected',
    error: 'Error', disabled: 'Disabled'
  };

  const SYNC_LABEL = {
    synced: 'Synced', syncing: 'Syncing…', failed: 'Failed', idle: 'Idle', never: 'Never run'
  };

  /* ---- the integration catalog (provisioned connections) ---- */
  const INTEGRATIONS = [
    /* ── BIM / CAD ── */
    { id: 'INT-0142', name: 'Autodesk Construction Cloud', provider: 'Autodesk',        type: 'bim',         auth: 'oauth',   status: 'connected',    tenants: 14, scope: 'global', desc: 'Two-way sync of BIM models, sheets, RFIs and issues with ACC Build & Docs.',        lastSync: '2026-06-09T08:12', syncStatus: 'synced',  created: '2024-02-18', modified: '2026-06-08' },
    { id: 'INT-0147', name: 'Autodesk Revit',              provider: 'Autodesk',        type: 'bim',         auth: 'apikey',  status: 'connected',    tenants: 11, scope: 'global', desc: 'Round-trip generated structural models to native Revit families and shared parameters.', lastSync: '2026-06-09T07:40', syncStatus: 'synced',  created: '2024-02-18', modified: '2026-05-30' },
    { id: 'INT-0163', name: 'Tekla Structures',           provider: 'Trimble',         type: 'bim',         auth: 'service', status: 'connected',    tenants: 8,  scope: 'global', desc: 'Export detailed connection geometry and rebar to Tekla for fabrication detailing.',  lastSync: '2026-06-09T06:55', syncStatus: 'synced',  created: '2024-04-02', modified: '2026-06-01' },
    { id: 'INT-0178', name: 'Trimble Connect',            provider: 'Trimble',         type: 'bim',         auth: 'oauth',   status: 'connected',    tenants: 9,  scope: 'global', desc: 'Publish coordinated federated models and IFC packages to Trimble Connect projects.', lastSync: '2026-06-08T22:10', syncStatus: 'synced',  created: '2024-04-02', modified: '2026-05-22' },
    { id: 'INT-0205', name: 'Bentley iTwin',              provider: 'Bentley Systems', type: 'bim',         auth: 'oauth',   status: 'error',        tenants: 3,  scope: 'tenant', desc: 'Stream iModel changesets for infrastructure-grade coordination and clash review.',   lastSync: '2026-06-09T04:18', syncStatus: 'failed',  created: '2024-08-14', modified: '2026-06-09' },
    { id: 'INT-0231', name: 'Graphisoft Archicad',        provider: 'Graphisoft',      type: 'bim',         auth: 'apikey',  status: 'disconnected', tenants: 0,  scope: 'tenant', desc: 'IFC-based exchange of architectural intent with Archicad teamwork models.',           lastSync: '2026-05-28T11:02', syncStatus: 'idle',    created: '2025-01-20', modified: '2026-05-28' },

    /* ── ERP ── */
    { id: 'INT-0312', name: 'SAP S/4HANA',                provider: 'SAP',             type: 'erp',         auth: 'service', status: 'connected',    tenants: 6,  scope: 'global', desc: 'Post bills of materials and procurement requisitions from generated fabrication packages.', lastSync: '2026-06-09T05:30', syncStatus: 'synced', created: '2024-06-11', modified: '2026-05-19' },
    { id: 'INT-0327', name: 'Microsoft Dynamics 365',     provider: 'Microsoft',       type: 'erp',         auth: 'oauth',   status: 'connected',    tenants: 5,  scope: 'global', desc: 'Sync project cost centres, purchase orders and supplier records with Dynamics F&O.',  lastSync: '2026-06-09T03:05', syncStatus: 'synced',  created: '2024-07-03', modified: '2026-04-28' },
    { id: 'INT-0349', name: 'Exact Online',               provider: 'Exact',           type: 'erp',         auth: 'oauth',   status: 'disabled',     tenants: 2,  scope: 'tenant', desc: 'Push invoice and material-cost lines to Exact Online financial administration.',      lastSync: '2026-04-30T09:00', syncStatus: 'idle',    created: '2024-11-09', modified: '2026-04-30' },

    /* ── Identity / SSO ── */
    { id: 'INT-0401', name: 'Microsoft Entra ID',         provider: 'Microsoft',       type: 'identity',    auth: 'saml',    status: 'connected',    tenants: 21, scope: 'global', desc: 'Enterprise SSO and conditional access. SAML assertion with group-to-role mapping.',   lastSync: '2026-06-09T09:00', syncStatus: 'synced',  created: '2023-10-17', modified: '2026-06-02' },
    { id: 'INT-0408', name: 'Okta',                       provider: 'Okta',            type: 'identity',    auth: 'saml',    status: 'connected',    tenants: 7,  scope: 'global', desc: 'SSO federation for tenants standardised on the Okta identity cloud.',                 lastSync: '2026-06-09T08:45', syncStatus: 'synced',  created: '2024-01-22', modified: '2026-05-11' },
    { id: 'INT-0413', name: 'Okta SCIM provisioning',     provider: 'Okta',            type: 'identity',    auth: 'scim',    status: 'error',        tenants: 7,  scope: 'global', desc: 'Automated user lifecycle — provision, update and deprovision seats from the IdP.',     lastSync: '2026-06-09T08:46', syncStatus: 'failed',  created: '2024-01-22', modified: '2026-06-09' },
    { id: 'INT-0419', name: 'Google Workspace',           provider: 'Google',          type: 'identity',    auth: 'oauth',   status: 'connected',    tenants: 4,  scope: 'tenant', desc: 'OAuth sign-in and directory sync for tenants on Google Workspace.',                   lastSync: '2026-06-09T07:12', syncStatus: 'synced',  created: '2024-09-30', modified: '2026-03-14' },

    /* ── File storage ── */
    { id: 'INT-0502', name: 'SharePoint & OneDrive',      provider: 'Microsoft',       type: 'storage',     auth: 'oauth',   status: 'connected',    tenants: 12, scope: 'global', desc: 'Archive generated drawing sets, reports and fabrication exports to tenant SharePoint.', lastSync: '2026-06-09T06:20', syncStatus: 'synced', created: '2024-03-06', modified: '2026-05-25' },
    { id: 'INT-0517', name: 'Amazon S3',                  provider: 'Amazon Web Services', type: 'storage', auth: 'apikey',  status: 'connected',    tenants: 9,  scope: 'global', desc: 'Long-term object storage for model snapshots, analysis artefacts and audit bundles.', lastSync: '2026-06-09T01:00', syncStatus: 'synced',  created: '2023-12-01', modified: '2026-02-10' },
    { id: 'INT-0524', name: 'Google Drive',               provider: 'Google',          type: 'storage',     auth: 'oauth',   status: 'disconnected', tenants: 0,  scope: 'tenant', desc: 'Optional document export target for tenants on Google Drive.',                        lastSync: '2026-05-19T14:30', syncStatus: 'idle',    created: '2025-02-18', modified: '2026-05-19' },

    /* ── Analytics & BI ── */
    { id: 'INT-0601', name: 'Microsoft Power BI',         provider: 'Microsoft',       type: 'analytics',   auth: 'oauth',   status: 'connected',    tenants: 8,  scope: 'global', desc: 'Stream generation, validation and utilisation metrics to Power BI datasets.',         lastSync: '2026-06-09T02:00', syncStatus: 'synced',  created: '2024-05-09', modified: '2026-04-02' },
    { id: 'INT-0614', name: 'Snowflake',                  provider: 'Snowflake',       type: 'analytics',   auth: 'service', status: 'connected',    tenants: 3,  scope: 'global', desc: 'Warehouse export of platform telemetry and engineering KPIs for analytics teams.',    lastSync: '2026-06-09T00:30', syncStatus: 'synced',  created: '2024-10-15', modified: '2026-01-29' },
    { id: 'INT-0622', name: 'Grafana Cloud',              provider: 'Grafana Labs',    type: 'analytics',   auth: 'apikey',  status: 'disabled',     tenants: 1,  scope: 'global', desc: 'Operational dashboards for compute-worker throughput and sync latency.',              lastSync: '2026-03-22T18:40', syncStatus: 'idle',    created: '2024-12-04', modified: '2026-03-22' },

    /* ── Communication ── */
    { id: 'INT-0701', name: 'Slack',                      provider: 'Slack',           type: 'comms',       auth: 'oauth',   status: 'connected',    tenants: 15, scope: 'global', desc: 'Post validation failures, clash alerts and generation completions to Slack channels.', lastSync: '2026-06-09T09:14', syncStatus: 'synced', created: '2024-02-28', modified: '2026-05-30' },
    { id: 'INT-0708', name: 'Microsoft Teams',            provider: 'Microsoft',       type: 'comms',       auth: 'oauth',   status: 'connected',    tenants: 10, scope: 'global', desc: 'Channel notifications and adaptive cards for engineering review events.',             lastSync: '2026-06-09T09:08', syncStatus: 'synced',  created: '2024-03-06', modified: '2026-05-30' },

    /* ── Project management ── */
    { id: 'INT-0801', name: 'Atlassian Jira',             provider: 'Atlassian',       type: 'pm',          auth: 'oauth',   status: 'connected',    tenants: 6,  scope: 'tenant', desc: 'Raise and track engineering issues and rule exceptions as Jira tickets.',             lastSync: '2026-06-09T07:55', syncStatus: 'synced',  created: '2024-06-25', modified: '2026-04-18' },
    { id: 'INT-0809', name: 'Procore',                    provider: 'Procore',         type: 'pm',          auth: 'oauth',   status: 'error',        tenants: 2,  scope: 'tenant', desc: 'Sync drawings, submittals and observations with Procore construction projects.',      lastSync: '2026-06-09T05:42', syncStatus: 'failed',  created: '2024-09-12', modified: '2026-06-09' },
    { id: 'INT-0815', name: 'Asana',                      provider: 'Asana',           type: 'pm',          auth: 'pat',     status: 'disconnected', tenants: 0,  scope: 'tenant', desc: 'Task and milestone mirroring for tenants running delivery in Asana.',                 lastSync: '2026-05-12T10:20', syncStatus: 'idle',    created: '2025-03-04', modified: '2026-05-12' },

    /* ── Fabrication / CAM ── */
    { id: 'INT-0901', name: 'HOMAG tapio',                provider: 'HOMAG',           type: 'fabrication', auth: 'apikey',  status: 'connected',    tenants: 3,  scope: 'global', desc: 'Hand off CNC cutting lists and panel data to tapio-connected production machinery.',  lastSync: '2026-06-09T04:50', syncStatus: 'synced',  created: '2024-11-20', modified: '2026-05-08' },
    { id: 'INT-0908', name: 'Weinmann WUP',               provider: 'Weinmann',        type: 'fabrication', auth: 'service', status: 'disconnected', tenants: 0,  scope: 'tenant', desc: 'Frame-assembly work-unit programs for timber-frame production lines.',                lastSync: '2026-04-28T08:15', syncStatus: 'idle',    created: '2025-01-14', modified: '2026-04-28' },

    /* ── GIS / geospatial ── */
    { id: 'INT-1001', name: 'Esri ArcGIS',                provider: 'Esri',            type: 'gis',         auth: 'apikey',  status: 'connected',    tenants: 4,  scope: 'global', desc: 'Site context, parcels and terrain layers from ArcGIS for intent authoring.',          lastSync: '2026-06-08T20:00', syncStatus: 'synced',  created: '2024-07-19', modified: '2026-03-31' },
    { id: 'INT-1008', name: 'PDOK / Kadaster',            provider: 'PDOK',            type: 'gis',         auth: 'apikey',  status: 'connected',    tenants: 5,  scope: 'global', desc: 'Dutch cadastral parcels, BAG addresses and base maps for NL projects.',               lastSync: '2026-06-08T20:05', syncStatus: 'synced',  created: '2024-07-19', modified: '2026-03-31' },

    /* ── API / Webhook ── */
    { id: 'INT-1101', name: 'Webhook relay',              provider: 'VBG Platform',    type: 'api',         auth: 'webhook', status: 'connected',    tenants: 18, scope: 'global', desc: 'Signed outbound webhooks for generation, validation and fabrication lifecycle events.', lastSync: '2026-06-09T09:20', syncStatus: 'synced', created: '2023-11-04', modified: '2026-06-04' },
    { id: 'INT-1108', name: 'buildingSMART IFC',          provider: 'buildingSMART',   type: 'api',         auth: 'apikey',  status: 'connected',    tenants: 13, scope: 'global', desc: 'IFC 4.3 import/export validation against the buildingSMART data dictionary.',         lastSync: '2026-06-09T06:10', syncStatus: 'synced',  created: '2024-01-09', modified: '2026-05-16' },
    { id: 'INT-1115', name: 'Zapier',                     provider: 'Zapier',          type: 'api',         auth: 'apikey',  status: 'disabled',     tenants: 1,  scope: 'tenant', desc: 'No-code automation bridge for low-volume tenant workflows.',                          lastSync: '2026-02-11T13:00', syncStatus: 'idle',    created: '2025-04-22', modified: '2026-02-11' }
  ];

  /* ---- helpers ---- */
  function minsAgo(iso) { if (!iso) return Infinity; return Math.round((NOW - new Date(iso)) / 60000); }
  function daysAgo(iso) { if (!iso) return Infinity; return Math.floor(minsAgo(iso) / 1440); }
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
    return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear();
  }
  function fmtTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }
  function relSync(iso) {
    if (!iso) return 'never';
    const m = minsAgo(iso);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    const h = Math.round(m / 60);
    if (h < 24) return h + 'h ago';
    const d = Math.round(h / 24);
    if (d < 30) return d + ' days ago';
    const mo = Math.round(d / 30);
    if (mo < 12) return mo + ' months ago';
    return 'over a year ago';
  }

  /* ---- expose data + facet helpers ---- */
  window.VBG_INTEGRATIONS = {
    DATA: INTEGRATIONS,
    TYPES: TYPES,
    AUTH: AUTH,
    STATUS_LABEL: STATUS_LABEL,
    SYNC_LABEL: SYNC_LABEL,
    fmtDate: fmtDate,
    fmtTime: fmtTime,
    relSync: relSync,
    daysAgo: daysAgo,
    nowISO: function () {
      const d = NOW;
      return d.getFullYear() + '-' + ('0'+(d.getMonth()+1)).slice(-2) + '-' + ('0'+d.getDate()).slice(-2)
        + 'T' + ('0'+d.getHours()).slice(-2) + ':' + ('0'+d.getMinutes()).slice(-2);
    },
    count: function (pred) { return INTEGRATIONS.filter(pred).length; }
  };

  const STYLE = `
    vbg-integrations-table { display: block; }
    vbg-integrations-table .itable { width: 100%; border-collapse: collapse; table-layout: fixed; }
    vbg-integrations-table thead th {
      text-align: left; font: var(--text-label); text-transform: uppercase;
      letter-spacing: var(--tracking-overline); color: var(--fg3);
      border-bottom: 1px solid var(--border-subtle);
      padding: 12px 20px; white-space: nowrap; user-select: none;
      position: sticky; top: 0; z-index: 2; background: var(--bg-surface);
    }
    vbg-integrations-table thead th.th-tile { width: 60px; }
    vbg-integrations-table thead th.th-type { width: 168px; }
    vbg-integrations-table thead th.th-auth { width: 150px; }
    vbg-integrations-table thead th.th-status { width: 142px; }
    vbg-integrations-table thead th.th-tenants { width: 104px; text-align: right; }
    vbg-integrations-table thead th.th-sync { width: 158px; }
    vbg-integrations-table thead th.th-actions { width: 56px; text-align: right; }
    vbg-integrations-table tbody tr {
      border-bottom: 1px solid var(--border-subtle);
      transition: background var(--dur-fast) var(--ease-out);
      cursor: pointer;
    }
    vbg-integrations-table tbody tr:last-child { border-bottom: 0; }
    vbg-integrations-table tbody tr:hover { background: var(--vbg-amber-50); }
    vbg-integrations-table tbody tr.menu-open { background: var(--vbg-amber-50); }
    vbg-integrations-table tbody tr.flash { animation: vbgRowFlash 1.4s var(--ease-out); }
    @keyframes vbgRowFlash { 0% { background: var(--vbg-amber-100); } 100% { background: transparent; } }
    vbg-integrations-table td { padding: 13px 20px; vertical-align: middle; }
    vbg-integrations-table td:first-child { padding: 13px 6px 13px 20px; }
    vbg-integrations-table td.actions-cell { padding: 13px 16px 13px 8px; }

    vbg-integrations-table .glyph-tile {
      width: 38px; height: 38px; border-radius: var(--r-sm);
      background: var(--bg-sunken); border: 1px solid var(--border-subtle);
      display: grid; place-items: center; color: var(--fg2);
    }
    vbg-integrations-table .glyph-tile svg { display: block; }
    vbg-integrations-table tr.is-off .glyph-tile { color: var(--fg4); background: var(--bg-app); }
    vbg-integrations-table tr.is-error .glyph-tile { color: var(--status-error); border-color: #F2C9C9; background: var(--status-error-bg); }

    vbg-integrations-table .iname { font: var(--text-body-strong); color: var(--fg1); line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    vbg-integrations-table tr.is-off .iname { color: var(--fg3); }
    vbg-integrations-table .imeta {
      font: var(--text-mono-sm); color: var(--fg4); margin-top: 3px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    vbg-integrations-table .imeta .prov { color: var(--fg3); font-family: var(--font-sans); }
    vbg-integrations-table .imeta .sep { color: var(--border-strong); margin: 0 6px; }

    /* type badge */
    vbg-integrations-table .type-badge {
      display: inline-flex; align-items: center; gap: 7px;
      font: var(--text-label); padding: 4px 10px 4px 9px; border-radius: var(--r-full);
      background: var(--slate-100); color: var(--fg2); white-space: nowrap;
      max-width: 100%; overflow: hidden;
    }
    vbg-integrations-table .type-badge svg { display: block; color: var(--fg3); flex: 0 0 auto; }
    vbg-integrations-table .type-badge span { overflow: hidden; text-overflow: ellipsis; }

    /* auth method */
    vbg-integrations-table .auth { display: inline-flex; align-items: center; gap: 8px; font: var(--text-sm); color: var(--fg2); white-space: nowrap; }
    vbg-integrations-table .auth .ico { color: var(--fg4); display: inline-flex; }
    vbg-integrations-table .auth .ico svg { display: block; }

    /* status badge */
    vbg-integrations-table .badge {
      display: inline-flex; align-items: center; gap: 6px;
      font: var(--text-label); padding: 4px 10px; border-radius: var(--r-full);
      white-space: nowrap;
    }
    vbg-integrations-table .badge .dot { width: 7px; height: 7px; border-radius: var(--r-full); }
    vbg-integrations-table .badge.connected { background: var(--status-success-bg); color: var(--status-success-fg); }
    vbg-integrations-table .badge.connected .dot { background: var(--status-success); }
    vbg-integrations-table .badge.disconnected { background: var(--status-pending-bg); color: var(--status-pending-fg); }
    vbg-integrations-table .badge.disconnected .dot { background: var(--status-pending); }
    vbg-integrations-table .badge.error { background: var(--status-error-bg); color: var(--status-error-fg); }
    vbg-integrations-table .badge.error .dot { background: var(--status-error); }
    vbg-integrations-table .badge.disabled { background: var(--slate-100); color: var(--fg4); }
    vbg-integrations-table .badge.disabled .dot { background: var(--slate-300); }

    /* connected tenants */
    vbg-integrations-table .tenants { font: var(--text-mono); color: var(--fg1); text-align: right; display: block; }
    vbg-integrations-table .tenants .scope {
      display: block; font: var(--text-caption); color: var(--fg4); margin-top: 1px; font-family: var(--font-sans);
    }
    vbg-integrations-table .tenants.zero { color: var(--fg4); }

    /* last sync */
    vbg-integrations-table .sync { display: flex; flex-direction: column; gap: 2px; }
    vbg-integrations-table .sync .when { font: var(--text-sm); color: var(--fg2); white-space: nowrap; }
    vbg-integrations-table .sync .when .t { font-family: var(--font-mono); font-size: 12px; color: var(--fg3); }
    vbg-integrations-table .sync .when.never { color: var(--fg4); }
    vbg-integrations-table .sync .sstat {
      display: inline-flex; align-items: center; gap: 6px;
      font: var(--text-caption); white-space: nowrap;
    }
    vbg-integrations-table .sync .sstat .sd { width: 6px; height: 6px; border-radius: var(--r-full); flex: 0 0 auto; }
    vbg-integrations-table .sync .sstat.synced { color: var(--status-success-fg); }
    vbg-integrations-table .sync .sstat.synced .sd { background: var(--status-success); }
    vbg-integrations-table .sync .sstat.syncing { color: var(--vbg-amber-700); }
    vbg-integrations-table .sync .sstat.syncing .sd { background: var(--vbg-amber); animation: vbgSyncPulse 1s var(--ease-in-out) infinite; }
    vbg-integrations-table .sync .sstat.failed { color: var(--status-error-fg); }
    vbg-integrations-table .sync .sstat.failed .sd { background: var(--status-error); }
    vbg-integrations-table .sync .sstat.idle, vbg-integrations-table .sync .sstat.never { color: var(--fg4); }
    vbg-integrations-table .sync .sstat.idle .sd, vbg-integrations-table .sync .sstat.never .sd { background: var(--slate-300); }
    @keyframes vbgSyncPulse { 0%,100% { opacity: .35; } 50% { opacity: 1; } }

    vbg-integrations-table .actions-cell { text-align: right; position: relative; }
    vbg-integrations-table .kebab {
      width: 32px; height: 32px; border-radius: var(--r-sm);
      border: 1px solid transparent; background: transparent;
      display: inline-grid; place-items: center; color: var(--fg3); cursor: pointer;
      transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
    }
    vbg-integrations-table .kebab:hover { background: var(--bg-surface); border-color: var(--border); color: var(--fg1); }
    vbg-integrations-table tr:hover .kebab { color: var(--fg2); }
    vbg-integrations-table .kebab.active { background: var(--bg-surface); border-color: var(--border); color: var(--fg1); }
    vbg-integrations-table .menu {
      position: absolute; top: calc(100% - 4px); right: 20px; z-index: 40;
      min-width: 214px; background: var(--bg-raised);
      border: 1px solid var(--border); border-radius: var(--r-md);
      box-shadow: var(--shadow-pop); padding: 5px;
      display: none; flex-direction: column; gap: 1px;
    }
    vbg-integrations-table .menu.open { display: flex; animation: vbgIMenuIn var(--dur-fast) var(--ease-out); }
    vbg-integrations-table .menu.up { top: auto; bottom: calc(100% - 4px); }
    @keyframes vbgIMenuIn { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: none; } }
    vbg-integrations-table .menu button {
      display: flex; align-items: center; gap: 10px; width: 100%;
      border: 0; background: transparent; cursor: pointer; text-align: left;
      font: var(--text-body); color: var(--fg1);
      padding: 8px 10px; border-radius: var(--r-sm);
      transition: background var(--dur-fast) var(--ease-out);
    }
    vbg-integrations-table .menu button .ico { display: inline-flex; color: var(--fg3); flex: 0 0 auto; }
    vbg-integrations-table .menu button .ico svg { display: block; }
    vbg-integrations-table .menu button:hover { background: var(--bg-hover); }
    vbg-integrations-table .menu button:disabled { opacity: .4; cursor: default; }
    vbg-integrations-table .menu button:disabled:hover { background: transparent; }
    vbg-integrations-table .menu button.danger { color: var(--status-error-fg); }
    vbg-integrations-table .menu button.danger .ico { color: var(--status-error); }
    vbg-integrations-table .menu button.danger:hover { background: var(--status-error-bg); }
    vbg-integrations-table .menu .sep { height: 1px; background: var(--border-subtle); margin: 4px 2px; }

    vbg-integrations-table .empty { padding: 64px 20px; text-align: center; color: var(--fg3); }
    vbg-integrations-table .empty .et { font: var(--text-h3); color: var(--fg2); margin-bottom: 6px; }
    vbg-integrations-table .empty .es { font: var(--text-sm); }
  `;

  function injectStyle() {
    if (document.getElementById('vbg-integrations-table-style')) return;
    const s = document.createElement('style');
    s.id = 'vbg-integrations-table-style';
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function ico(path, size, sw) {
    size = size || 16; sw = sw || 1.7;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }

  /* menu action icons */
  const I_CONFIG  = '<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>';
  const I_SYNC    = '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/>';
  const I_HISTORY = '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>';
  const I_LOGS    = '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M9 13h6"/><path d="M9 17h3"/>';
  const I_KEY     = '<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/>';
  const I_TENANTS = '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>';
  const I_PLUG    = '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>';
  const I_UNPLUG  = '<path d="m19 5 3-3"/><path d="m2 22 3-3"/><path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z"/><path d="M7.5 13.5 10 11"/><path d="M10.5 16.5 13 14"/><path d="m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z"/>';
  const I_POWER   = '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/>';
  const I_TRASH   = '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>';

  function typeBadge(t) {
    const ty = TYPES[t] || { label: t, glyph: '' };
    return '<span class="type-badge">' + ico(ty.glyph, 13, 1.8) + '<span>' + esc(ty.label) + '</span></span>';
  }
  function syncCell(it) {
    const ss = it.syncStatus;
    let when;
    if (!it.lastSync) when = '<span class="when never">—</span>';
    else when = '<span class="when">' + fmtDate(it.lastSync) + ' <span class="t">' + fmtTime(it.lastSync) + '</span></span>';
    const stat = '<span class="sstat ' + ss + '"><span class="sd"></span>' + SYNC_LABEL[ss] + '</span>';
    return '<div class="sync">' + when + stat + '</div>';
  }
  function tenantsCell(it) {
    const zero = it.tenants === 0 ? ' zero' : '';
    const scope = it.scope === 'global' ? 'All tenants' : it.tenants + (it.tenants === 1 ? ' tenant' : ' tenants');
    const num = it.scope === 'global' ? it.tenants : it.tenants;
    return '<span class="tenants' + zero + '">' + it.tenants + '<span class="scope">' + (it.scope === 'global' ? 'global' : 'scoped') + '</span></span>';
  }

  function rowHtml(it) {
    const off = (it.status === 'disabled' || it.status === 'disconnected');
    const err = it.status === 'error';
    const connected = it.status === 'connected' || it.status === 'error';
    const cls = (off ? ' is-off' : '') + (err ? ' is-error' : '');
    const ty = TYPES[it.type] || { glyph: '' };
    return ''
      + '<tr data-id="' + it.id + '" class="' + cls.trim() + '">'
      +   '<td><span class="glyph-tile">' + ico(ty.glyph, 19, 1.7) + '</span></td>'
      +   '<td><div class="iname">' + esc(it.name) + '</div>'
      +     '<div class="imeta">' + esc(it.id) + '<span class="sep">·</span><span class="prov">' + esc(it.provider) + '</span></div></td>'
      +   '<td>' + typeBadge(it.type) + '</td>'
      +   '<td><span class="auth"><span class="ico">' + ico(I_KEY, 14) + '</span>' + esc(AUTH[it.auth] || it.auth) + '</span></td>'
      +   '<td><span class="badge ' + it.status + '"><span class="dot"></span>' + STATUS_LABEL[it.status] + '</span></td>'
      +   '<td>' + tenantsCell(it) + '</td>'
      +   '<td>' + syncCell(it) + '</td>'
      +   '<td class="actions-cell">'
      +     '<button class="kebab" aria-label="Integration actions" data-id="' + it.id + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg></button>'
      +     '<div class="menu" data-menu="' + it.id + '">'
      +       '<button data-act="configure" data-id="' + it.id + '"><span class="ico">' + ico(I_CONFIG) + '</span>Configure settings</button>'
      +       '<button data-act="sync" data-id="' + it.id + '"' + (connected ? '' : ' disabled') + '><span class="ico">' + ico(I_SYNC) + '</span>Sync now</button>'
      +       '<button data-act="history" data-id="' + it.id + '"><span class="ico">' + ico(I_HISTORY) + '</span>Sync history</button>'
      +       '<button data-act="logs" data-id="' + it.id + '"><span class="ico">' + ico(I_LOGS) + '</span>Logs &amp; errors</button>'
      +       '<button data-act="credentials" data-id="' + it.id + '"><span class="ico">' + ico(I_KEY) + '</span>Manage credentials</button>'
      +       '<button data-act="tenants" data-id="' + it.id + '"><span class="ico">' + ico(I_TENANTS) + '</span>Assign to tenants</button>'
      +       '<div class="sep"></div>'
      +       (it.status === 'connected' || it.status === 'error'
        ? '<button data-act="disconnect" data-id="' + it.id + '"><span class="ico">' + ico(I_UNPLUG) + '</span>Disconnect</button>'
        : (it.status === 'disconnected'
          ? '<button data-act="connect" data-id="' + it.id + '"><span class="ico">' + ico(I_PLUG) + '</span>Connect</button>'
          : ''))
      +       (it.status === 'disabled'
        ? '<button data-act="enable" data-id="' + it.id + '"><span class="ico">' + ico(I_POWER) + '</span>Enable integration</button>'
        : '<button data-act="disable" data-id="' + it.id + '"><span class="ico">' + ico(I_POWER) + '</span>Disable integration</button>')
      +       '<div class="sep"></div>'
      +       '<button class="danger" data-act="delete" data-id="' + it.id + '"><span class="ico">' + ico(I_TRASH) + '</span>Delete integration</button>'
      +     '</div>'
      +   '</td>'
      + '</tr>';
  }

  function headHtml() {
    return '<thead><tr>'
      + '<th class="th-tile"></th>'
      + '<th>Integration</th>'
      + '<th class="th-type">Type</th>'
      + '<th class="th-auth">Auth method</th>'
      + '<th class="th-status">Status</th>'
      + '<th class="th-tenants">Tenants</th>'
      + '<th class="th-sync">Last sync</th>'
      + '<th class="th-actions"></th>'
      + '</tr></thead>';
  }

  function matches(it, f) {
    if (!f) return true;
    if (f.search) {
      const q = f.search.toLowerCase();
      const hay = (it.name + ' ' + it.id + ' ' + it.provider + ' ' + (TYPES[it.type] || {}).label + ' ' + (AUTH[it.auth] || '')).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    if (f.type && f.type.size && !f.type.has(it.type)) return false;
    if (f.status && f.status.size && !f.status.has(it.status)) return false;
    if (f.auth && f.auth.size && !f.auth.has(it.auth)) return false;
    if (f.sync && f.sync.size) {
      const s = (it.syncStatus === 'never') ? 'idle' : it.syncStatus;
      if (!f.sync.has(s)) return false;
    }
    if (f.added && f.added !== 'any') {
      if (daysAgo(it.created) > parseInt(f.added, 10)) return false;
    }
    return true;
  }

  class VbgIntegrationsTable extends HTMLElement {
    connectedCallback() {
      injectStyle();
      this.data = INTEGRATIONS.map(function (it) { return Object.assign({}, it); });
      window.VBG_INTEGRATIONS.LIVE = this.data;
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
    getById(id) { return this.data.filter(function (x) { return x.id === id; })[0]; }

    render() {
      const self = this;
      let visible = this.data.filter(function (it) { return matches(it, self.filters); });
      let body;
      if (visible.length === 0) {
        body = '<tbody><tr><td colspan="8"><div class="empty"><div class="et">No integrations match the current filters</div>'
          + '<div class="es">Adjust type, status, auth method or sync status to widen the results.</div></div></td></tr></tbody>';
      } else {
        body = '<tbody>' + visible.map(function (it) { return rowHtml(it); }).join('') + '</tbody>';
      }
      this.innerHTML = '<table class="itable">' + headHtml() + body + '</table>';
      this.openMenu = null;
      this.dispatchEvent(new CustomEvent('integrationsrender', {
        bubbles: true, detail: { visible: visible.length, total: this.data.length }
      }));
    }

    closeMenu() {
      if (!this.openMenu) return;
      this.openMenu.classList.remove('open', 'up');
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
        /* flip up if near the bottom of the scroll viewport */
        const tr = kebab.closest('tr');
        const host = this.getBoundingClientRect();
        const rr = tr.getBoundingClientRect();
        if (rr.bottom > host.bottom - 220) menu.classList.add('up');
        menu.classList.add('open'); this.openMenu = menu;
        kebab.classList.add('active');
        tr.classList.add('menu-open');
        return;
      }
      const item = e.target.closest('.menu button');
      if (item) {
        e.stopPropagation();
        if (item.disabled) return;
        const act = item.getAttribute('data-act');
        const id = item.getAttribute('data-id');
        this.closeMenu();
        this.dispatchEvent(new CustomEvent('integrationaction', { bubbles: true, detail: { act: act, id: id } }));
        return;
      }
      const tr = e.target.closest('tbody tr[data-id]');
      if (tr) {
        this.dispatchEvent(new CustomEvent('integrationopen', { bubbles: true, detail: { id: tr.getAttribute('data-id'), tab: 'overview' } }));
      }
    }

    /* ---- live state mutations ---- */
    setStatus(id, status) {
      const it = this.getById(id); if (!it) return;
      it.status = status;
      if (status === 'connected') { if (it.syncStatus === 'idle' || it.syncStatus === 'never') it.syncStatus = 'synced'; }
      if (status === 'disconnected' || status === 'disabled') { it.syncStatus = 'idle'; }
      it.modified = window.VBG_INTEGRATIONS.nowISO().slice(0, 10);
      this.render();
    }
    startSync(id) {
      const it = this.getById(id); if (!it) return;
      it.syncStatus = 'syncing';
      this.render();
      const self = this;
      setTimeout(function () {
        const cur = self.getById(id); if (!cur) return;
        /* error integrations resolve to failed, others succeed */
        cur.syncStatus = (cur.status === 'error') ? 'failed' : 'synced';
        cur.lastSync = window.VBG_INTEGRATIONS.nowISO();
        cur.modified = cur.lastSync.slice(0, 10);
        self.render();
        self.dispatchEvent(new CustomEvent('integrationsynced', { bubbles: true, detail: { id: id, result: cur.syncStatus } }));
      }, 1700);
    }
    remove(id) {
      const i = this.data.findIndex(function (x) { return x.id === id; });
      if (i >= 0) this.data.splice(i, 1);
      this.render();
    }
    add(it) {
      this.data.unshift(it);
      this.render();
      const self = this;
      requestAnimationFrame(function () {
        const tr = self.querySelector('tr[data-id="' + it.id + '"]');
        if (tr) { tr.classList.add('flash'); self.scrollTop = 0; }
      });
    }
  }

  if (!customElements.get('vbg-integrations-table')) {
    customElements.define('vbg-integrations-table', VbgIntegrationsTable);
  }
})();
