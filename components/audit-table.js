/* ============================================================
   VBG — Audit & Compliance event table web component
   Usage:  <vbg-audit-table></vbg-audit-table>
   Columns: category tile · event (action + id + category) ·
            actor (user + company) · affected entity ·
            timestamp (date/time + relative) · source (IP + device) ·
            outcome (success / failure / blocked) · compliance · actions

   Each row is one immutable platform audit record. This is a read-only
   governance surface: the kebab carries view / trace / compliance
   actions; a row click opens the event detail drawer.

   Renders into LIGHT DOM so screenshots / PDF / PPTX capture it.
   Styles scoped under `vbg-audit-table`, injected once.

   Data + facet helpers are exposed on window.VBG_AUDIT so the page
   can build the filter sidebar, stats and modals from one source.
   The component reads `this.filters` (set via setFilters) and
   dispatches `auditrender` { visible, total } after every render,
   plus `auditopen` { id } on a row click.
   ============================================================ */
(function () {
  /* "now" — keep in sync with project date */
  const NOW = new Date('2026-06-09T15:10:00');

  /* ---- event categories ---- */
  const CAT = {
    auth:         { label: 'Authentication',          tone: 'info',      glyph: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/>' },
    permission:   { label: 'Permission change',       tone: 'generated', glyph: '<path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z"/><circle cx="16.5" cy="7.5" r="0.5" fill="currentColor"/>' },
    subscription: { label: 'Subscription & licensing', tone: 'validated', glyph: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>' },
    export:       { label: 'Data export',              tone: 'info',      glyph: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>' },
    admin:        { label: 'Administrative',           tone: 'pending',   glyph: '<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>' },
    security:     { label: 'Security',                 tone: 'error',     glyph: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z"/><path d="M12 8v4"/><path d="M12 16h.01"/>' },
    system:       { label: 'System',                   tone: 'pending',   glyph: '<rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><path d="M6 6h.01"/><path d="M6 18h.01"/>' },
    config:       { label: 'Configuration',            tone: 'pending',   glyph: '<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>' }
  };

  const SEV = {
    critical: { label: 'Critical', tone: 'error' },
    high:     { label: 'High',     tone: 'warning' },
    medium:   { label: 'Medium',   tone: 'info' },
    low:      { label: 'Low',      tone: 'pending' }
  };

  const OUTCOME = {
    success: { label: 'Success', tone: 'success' },
    failure: { label: 'Failure', tone: 'error' },
    blocked: { label: 'Blocked', tone: 'warning' },
    warning: { label: 'Warning', tone: 'warning' }
  };

  const COMPLIANCE = {
    compliant: { label: 'Compliant',    tone: 'success' },
    review:    { label: 'Under review', tone: 'warning' },
    flagged:   { label: 'Flagged',      tone: 'error' },
    na:        { label: 'N/A',          tone: 'pending' }
  };

  /* ---- raw audit records (newest first) ---- */
  /* ts = ISO local; actor/company mirror the platform tenant roster */
  const EVENTS = [
    { id: 'EVT-7F3A91C4', ts: '2026-06-09T14:46:12', category: 'security', action: 'Multiple failed sign-in attempts blocked', severity: 'critical',
      actor: { name: 'Unknown', email: 'n.dejong@jajo.com', role: 'Unauthenticated' }, company: { name: 'Janssen de Jong', tid: 'TEN-0398' },
      target: { type: 'User account', id: 'USR-3391', label: 'n.dejong@jajo.com' }, ip: '185.94.188.42', device: 'Windows 11 · Firefox 127', location: 'Tor exit node', outcome: 'blocked', compliance: 'flagged',
      changes: [{ field: 'Account lock state', from: 'Active', to: 'Locked (15 min)' }, { field: 'Failed attempts', from: '4', to: '5' }], session: 'anon', request: 'req_8d31f0a2', detail: 'Account temporarily locked after 5 consecutive failed password attempts within 2 minutes. Source IP matches a known anonymising network.' },

    { id: 'EVT-7F3A91B7', ts: '2026-06-09T14:32:08', category: 'permission', action: 'Role elevated to Tenant administrator', severity: 'high',
      actor: { name: 'Sanne Koenders', email: 's.koenders@vbg.io', role: 'Platform administrator' }, company: { name: 'Heijmans Vastgoed', tid: 'TEN-0142' },
      target: { type: 'User account', id: 'USR-1042', label: 'm.heijmans@heijmans.nl' }, ip: '84.105.22.7', device: 'macOS 14 · Chrome 126', location: 'Amsterdam, NL', outcome: 'success', compliance: 'review',
      changes: [{ field: 'Role', from: 'Member', to: 'Tenant administrator' }, { field: 'Permissions', from: '12 scopes', to: '34 scopes' }], session: 'ses_a91f', request: 'req_5b1102e9', detail: 'Privilege escalation performed by platform admin. Grants full tenant administration including billing and user management — queued for compliance review per policy R-AC-04.' },

    { id: 'EVT-7F3A91A2', ts: '2026-06-09T13:58:42', category: 'auth', action: 'Sign-in succeeded via SSO', severity: 'low',
      actor: { name: 'Sanne Koenders', email: 's.koenders@vbg.io', role: 'Platform administrator' }, company: { name: 'VBG Platform', tid: 'INTERNAL' },
      target: { type: 'Session', id: 'SES-A91F', label: 'Admin portal session' }, ip: '84.105.22.7', device: 'macOS 14 · Chrome 126', location: 'Amsterdam, NL', outcome: 'success', compliance: 'compliant',
      changes: null, session: 'ses_a91f', request: 'req_5a09c1d4', detail: 'Single sign-on authentication completed via SAML identity provider. MFA satisfied by hardware security key.' },

    { id: 'EVT-7F3A9188', ts: '2026-06-09T13:21:55', category: 'subscription', action: 'Plan upgraded: Professional → Enterprise', severity: 'medium',
      actor: { name: 'Sanne Koenders', email: 's.koenders@vbg.io', role: 'Platform administrator' }, company: { name: 'Dura Vermeer', tid: 'TEN-0233' },
      target: { type: 'Subscription', id: 'SUB-0233', label: 'Dura Vermeer subscription' }, ip: '84.105.22.7', device: 'macOS 14 · Chrome 126', location: 'Amsterdam, NL', outcome: 'success', compliance: 'compliant',
      changes: [{ field: 'Plan', from: 'Professional', to: 'Enterprise' }, { field: 'License seats', from: '40', to: '60' }, { field: 'Annual contract value', from: '€38 400', to: '€72 000' }], session: 'ses_a91f', request: 'req_4c77ba10', detail: 'Subscription tier changed. All 10 platform modules enabled and seat pool expanded. Proration applied to current term.' },

    { id: 'EVT-7F3A9171', ts: '2026-06-09T12:47:30', category: 'export', action: 'Audit log exported (CSV)', severity: 'medium',
      actor: { name: 'Sanne Koenders', email: 's.koenders@vbg.io', role: 'Platform administrator' }, company: { name: 'VBG Platform', tid: 'INTERNAL' },
      target: { type: 'Audit dataset', id: 'EXP-2291', label: '14 218 records · last 90 days' }, ip: '84.105.22.7', device: 'macOS 14 · Chrome 126', location: 'Amsterdam, NL', outcome: 'success', compliance: 'review',
      changes: null, session: 'ses_a91f', request: 'req_3f90aa21', detail: 'Bulk export of audit records. Export contains personal data (IP addresses, email) — flagged for review under GDPR Art. 30 record-keeping obligations.' },

    { id: 'EVT-7F3A915E', ts: '2026-06-09T11:33:09', category: 'security', action: 'MFA disabled for account', severity: 'high',
      actor: { name: 'Petra de Vries', email: 'p.devries@bam.com', role: 'Tenant administrator' }, company: { name: 'BAM Wonen', tid: 'TEN-0118' },
      target: { type: 'User account', id: 'USR-2208', label: 'j.bakker@bam.com' }, ip: '145.53.10.91', device: 'Windows 11 · Edge 125', location: 'Rotterdam, NL', outcome: 'success', compliance: 'flagged',
      changes: [{ field: 'Multi-factor authentication', from: 'Enabled (TOTP)', to: 'Disabled' }], session: 'ses_77ba', request: 'req_2e1190fc', detail: 'A tenant admin disabled MFA for another user. Weakens account security posture — flagged for security team follow-up.' },

    { id: 'EVT-7F3A9142', ts: '2026-06-09T10:58:21', category: 'auth', action: 'Sign-in failed — invalid credentials', severity: 'medium',
      actor: { name: 'Joost Wessels', email: 'j.wessels@volkerwessels.com', role: 'Engineer' }, company: { name: 'VolkerWessels', tid: 'TEN-0207' },
      target: { type: 'Session', id: '—', label: 'Sign-in attempt' }, ip: '92.66.4.118', device: 'iOS 17 · Safari', location: 'Utrecht, NL', outcome: 'failure', compliance: 'compliant',
      changes: null, session: 'anon', request: 'req_1ab33d70', detail: 'Password did not match. Attempt 1 of 5 before lockout. No anomaly detected — consistent device and location.' },

    { id: 'EVT-7F3A9130', ts: '2026-06-09T10:12:44', category: 'config', action: 'Audit retention policy changed', severity: 'high',
      actor: { name: 'Sanne Koenders', email: 's.koenders@vbg.io', role: 'Platform administrator' }, company: { name: 'VBG Platform', tid: 'INTERNAL' },
      target: { type: 'Policy', id: 'POL-RET-01', label: 'Audit retention' }, ip: '84.105.22.7', device: 'macOS 14 · Chrome 126', location: 'Amsterdam, NL', outcome: 'success', compliance: 'compliant',
      changes: [{ field: 'Retention period', from: '365 days', to: '730 days' }, { field: 'Immutable lock', from: 'Off', to: 'On' }], session: 'ses_a91f', request: 'req_0f23ce88', detail: 'Platform-wide audit retention extended and write-once lock enabled. Records can no longer be deleted before the retention window elapses.' },

    { id: 'EVT-7F3A911C', ts: '2026-06-09T09:40:02', category: 'admin', action: 'License seats increased: 40 → 60', severity: 'low',
      actor: { name: 'Sanne Koenders', email: 's.koenders@vbg.io', role: 'Platform administrator' }, company: { name: 'Dura Vermeer', tid: 'TEN-0233' },
      target: { type: 'License pool', id: 'LIC-0233', label: 'Dura Vermeer seats' }, ip: '84.105.22.7', device: 'macOS 14 · Chrome 126', location: 'Amsterdam, NL', outcome: 'success', compliance: 'compliant',
      changes: [{ field: 'Total seats', from: '40', to: '60' }], session: 'ses_a91f', request: 'req_4c77ba10', detail: 'License quantity adjusted as part of the Enterprise upgrade.' },

    { id: 'EVT-7F3A9108', ts: '2026-06-09T08:55:37', category: 'system', action: 'Automated compliance scan completed', severity: 'low',
      actor: { name: 'Compliance engine', email: 'system@vbg.io', role: 'Automated service' }, company: { name: 'VBG Platform', tid: 'INTERNAL' },
      target: { type: 'Platform', id: 'SCAN-0609', label: 'Daily compliance scan' }, ip: '10.0.4.12', device: 'Internal worker', location: 'eu-west-1', outcome: 'success', compliance: 'compliant',
      changes: null, session: 'system', request: 'job_scan_0609', detail: 'Scheduled scan checked access policies, data residency and retention against the SOC 2 control set. 0 critical findings, 2 advisories raised.' },

    { id: 'EVT-7F3A90F1', ts: '2026-06-09T08:14:50', category: 'export', action: 'Project model exported (IFC + fabrication package)', severity: 'high',
      actor: { name: 'Fleur Hendriks', email: 'f.hendriks@arcadis.com', role: 'Lead engineer' }, company: { name: 'Arcadis', tid: 'TEN-0131' },
      target: { type: 'Project', id: 'VBG-31-NC', label: 'Noordwijk Towers — North core' }, ip: '213.127.55.6', device: 'VBG Desktop 2.4 (WPF)', location: 'Den Haag, NL', outcome: 'success', compliance: 'review',
      changes: null, session: 'ses_c512', request: 'req_aa8821b0', detail: 'Large model export including production fabrication data (2.1 GB). Volume exceeds the daily soft limit — surfaced for data-governance review.' },

    { id: 'EVT-7F3A90DA', ts: '2026-06-08T17:22:18', category: 'permission', action: 'Permission revoked: Billing access', severity: 'medium',
      actor: { name: 'Petra de Vries', email: 'p.devries@bam.com', role: 'Tenant administrator' }, company: { name: 'BAM Wonen', tid: 'TEN-0118' },
      target: { type: 'User account', id: 'USR-2240', label: 'r.smit@bam.com' }, ip: '145.53.10.91', device: 'Windows 11 · Edge 125', location: 'Rotterdam, NL', outcome: 'success', compliance: 'compliant',
      changes: [{ field: 'Billing access', from: 'Granted', to: 'Revoked' }, { field: 'Role', from: 'Finance', to: 'Member' }], session: 'ses_77ba', request: 'req_99c0a1de', detail: 'Billing and invoice scopes removed following a role change within the tenant organisation.' },

    { id: 'EVT-7F3A90C3', ts: '2026-06-08T16:08:44', category: 'security', action: 'New device sign-in flagged for review', severity: 'medium',
      actor: { name: 'Wouter Dijkstra', email: 'w.dijkstra@rhdhv.com', role: 'Engineer' }, company: { name: 'Royal HaskoningDHV', tid: 'TEN-0149' },
      target: { type: 'Session', id: 'SES-D4C1', label: 'Unrecognised device' }, ip: '31.151.200.14', device: 'Android 14 · Chrome', location: 'Eindhoven, NL', outcome: 'warning', compliance: 'review',
      changes: null, session: 'ses_d4c1', request: 'req_7711aa02', detail: 'Sign-in succeeded from an unrecognised device. User notified by email; session allowed but tagged for review.' },

    { id: 'EVT-7F3A90AE', ts: '2026-06-08T14:51:09', category: 'subscription', action: 'Subscription suspended (non-payment)', severity: 'medium',
      actor: { name: 'Finance operations', email: 'finance@vbg.io', role: 'Automated service' }, company: { name: 'Janssen de Jong', tid: 'TEN-0398' },
      target: { type: 'Subscription', id: 'SUB-0398', label: 'Janssen de Jong subscription' }, ip: '10.0.4.12', device: 'Internal worker', location: 'eu-west-1', outcome: 'success', compliance: 'compliant',
      changes: [{ field: 'Status', from: 'Active', to: 'Suspended' }, { field: 'Seats locked', from: '0', to: '16' }], session: 'system', request: 'job_dunning_44', detail: 'Subscription suspended automatically after 3 failed payment reminders. All active seats locked; data retained per policy.' },

    { id: 'EVT-7F3A9097', ts: '2026-06-08T13:30:55', category: 'auth', action: 'API token created', severity: 'medium',
      actor: { name: 'Bram Kok', email: 'b.kok@strukton.com', role: 'Integration engineer' }, company: { name: 'Strukton', tid: 'TEN-0259' },
      target: { type: 'API credential', id: 'KEY-5F21', label: 'CI/CD pipeline token' }, ip: '92.66.4.51', device: 'API client', location: 'Utrecht, NL', outcome: 'success', compliance: 'compliant',
      changes: [{ field: 'Token scopes', from: '—', to: 'projects:read, models:write' }, { field: 'Expiry', from: '—', to: '2026-12-08' }], session: 'ses_5f21', request: 'req_55aa10cd', detail: 'A scoped API token was issued for an automation pipeline. Token secret shown once and stored client-side.' },

    { id: 'EVT-7F3A9080', ts: '2026-06-08T11:47:21', category: 'admin', action: 'Company settings updated', severity: 'low',
      actor: { name: 'Sanne Koenders', email: 's.koenders@vbg.io', role: 'Platform administrator' }, company: { name: 'Mecanoo', tid: 'TEN-0338' },
      target: { type: 'Company', id: 'TEN-0338', label: 'Mecanoo' }, ip: '84.105.22.7', device: 'macOS 14 · Chrome 126', location: 'Amsterdam, NL', outcome: 'success', compliance: 'compliant',
      changes: [{ field: 'Data residency', from: 'EU (Frankfurt)', to: 'EU (Amsterdam)' }, { field: 'Support tier', from: 'Standard', to: 'Standard' }], session: 'ses_a91f', request: 'req_88aa3310', detail: 'Tenant configuration changed. Data residency region updated; existing models migrated asynchronously.' },

    { id: 'EVT-7F3A9069', ts: '2026-06-08T10:09:33', category: 'security', action: 'Password reset completed', severity: 'low',
      actor: { name: 'Anouk Vermeer', email: 'a.vermeer@duravermeer.nl', role: 'Engineer' }, company: { name: 'Dura Vermeer', tid: 'TEN-0233' },
      target: { type: 'User account', id: 'USR-2901', label: 'a.vermeer@duravermeer.nl' }, ip: '84.105.99.2', device: 'macOS 14 · Safari', location: 'Rotterdam, NL', outcome: 'success', compliance: 'compliant',
      changes: [{ field: 'Password', from: '••••••••', to: '•••••••• (rotated)' }], session: 'ses_2901', request: 'req_44bc91aa', detail: 'Self-service password reset completed via verified email link. All other sessions revoked.' },

    { id: 'EVT-7F3A9052', ts: '2026-06-08T09:02:10', category: 'export', action: 'GDPR data subject access export', severity: 'high',
      actor: { name: 'Sanne Koenders', email: 's.koenders@vbg.io', role: 'Platform administrator' }, company: { name: 'Heijmans Vastgoed', tid: 'TEN-0142' },
      target: { type: 'User data', id: 'DSAR-0091', label: 'Subject access request' }, ip: '84.105.22.7', device: 'macOS 14 · Chrome 126', location: 'Amsterdam, NL', outcome: 'success', compliance: 'compliant',
      changes: null, session: 'ses_a91f', request: 'req_dsar_0091', detail: 'Personal data export fulfilling a GDPR Article 15 access request. Package encrypted and delivered to verified subject.' },

    { id: 'EVT-7F3A903B', ts: '2026-06-07T19:44:57', category: 'security', action: 'Suspicious data access blocked', severity: 'critical',
      actor: { name: 'Unknown', email: 'svc@external', role: 'Service account' }, company: { name: 'VolkerWessels', tid: 'TEN-0207' },
      target: { type: 'Project', id: 'VBG-07-EX', label: 'Restricted project dataset' }, ip: '203.0.113.77', device: 'API client', location: 'Unknown', outcome: 'blocked', compliance: 'flagged',
      changes: null, session: 'anon', request: 'req_block_77', detail: 'An API request attempted to read a restricted dataset outside the token scope. Request denied and source rate-limited; security alert raised.' },

    { id: 'EVT-7F3A9024', ts: '2026-06-07T16:18:02', category: 'permission', action: 'SSO enforcement enabled', severity: 'medium',
      actor: { name: 'Mark Heijmans', email: 'm.heijmans@heijmans.nl', role: 'Tenant administrator' }, company: { name: 'Heijmans Vastgoed', tid: 'TEN-0142' },
      target: { type: 'Company', id: 'TEN-0142', label: 'Heijmans Vastgoed' }, ip: '84.105.40.18', device: 'Windows 11 · Edge 125', location: 'Rosmalen, NL', outcome: 'success', compliance: 'compliant',
      changes: [{ field: 'SSO enforcement', from: 'Optional', to: 'Required' }, { field: 'Password login', from: 'Allowed', to: 'Disabled' }], session: 'ses_4018', request: 'req_sso_142', detail: 'All tenant members must now authenticate via the corporate identity provider. Local password sign-in disabled.' },

    { id: 'EVT-7F3A900D', ts: '2026-06-07T14:33:41', category: 'subscription', action: 'Auto-renewal disabled', severity: 'low',
      actor: { name: 'Sophie Pieters', email: 's.pieters@pieters.net', role: 'Tenant administrator' }, company: { name: 'Pieters Bouwtechniek', tid: 'TEN-0387' },
      target: { type: 'Subscription', id: 'SUB-0387', label: 'Pieters Bouwtechniek' }, ip: '92.66.18.4', device: 'macOS 13 · Chrome 125', location: 'Haarlem, NL', outcome: 'success', compliance: 'compliant',
      changes: [{ field: 'Auto-renew', from: 'Enabled', to: 'Disabled' }], session: 'ses_3870', request: 'req_ren_387', detail: 'Tenant disabled automatic renewal. Subscription will lapse at end of term unless renewed manually.' },

    { id: 'EVT-7F3A8FF6', ts: '2026-06-07T11:20:16', category: 'admin', action: 'Recipe published to production', severity: 'medium',
      actor: { name: 'Joris Meijer', email: 'j.meijer@imdbv.nl', role: 'Lead engineer' }, company: { name: 'IMd Raadgevende Ingenieurs', tid: 'TEN-0355' },
      target: { type: 'Recipe', id: 'RCP-0291', label: 'Timber frame — 4 storey' }, ip: '145.53.77.20', device: 'VBG Desktop 2.4 (WPF)', location: 'Rotterdam, NL', outcome: 'success', compliance: 'compliant',
      changes: [{ field: 'Recipe status', from: 'Draft', to: 'Published' }, { field: 'Version', from: 'v0.9', to: 'v1.0' }], session: 'ses_2910', request: 'req_rcp_291', detail: 'A generation recipe was promoted to the production channel and is now available to all tenant members.' },

    { id: 'EVT-7F3A8FDF', ts: '2026-06-07T09:51:08', category: 'auth', action: 'Sign-in failed — MFA challenge expired', severity: 'medium',
      actor: { name: 'Daan Mulder', email: 'd.mulder@ballast-nedam.nl', role: 'Engineer' }, company: { name: 'Ballast Nedam', tid: 'TEN-0156' },
      target: { type: 'Session', id: '—', label: 'Sign-in attempt' }, ip: '213.127.88.9', device: 'iOS 17 · Safari', location: 'Nieuwegein, NL', outcome: 'failure', compliance: 'compliant',
      changes: null, session: 'anon', request: 'req_mfa_156', detail: 'Authentication failed because the one-time MFA code expired before submission. User prompted to retry.' },

    { id: 'EVT-7F3A8FC8', ts: '2026-06-06T18:05:53', category: 'config', action: 'IP allow-list updated', severity: 'high',
      actor: { name: 'Sanne Koenders', email: 's.koenders@vbg.io', role: 'Platform administrator' }, company: { name: 'VolkerWessels', tid: 'TEN-0207' },
      target: { type: 'Policy', id: 'POL-NET-12', label: 'Network access policy' }, ip: '84.105.22.7', device: 'macOS 14 · Chrome 126', location: 'Amsterdam, NL', outcome: 'success', compliance: 'compliant',
      changes: [{ field: 'Allowed CIDR ranges', from: '2 ranges', to: '4 ranges' }, { field: 'Enforcement', from: 'Audit only', to: 'Enforced' }], session: 'ses_a91f', request: 'req_net_207', detail: 'Network access policy updated to restrict tenant access to corporate IP ranges. Enforcement enabled platform-side.' },

    { id: 'EVT-7F3A8FB1', ts: '2026-06-06T15:42:30', category: 'security', action: 'API token revoked', severity: 'medium',
      actor: { name: 'Sanne Koenders', email: 's.koenders@vbg.io', role: 'Platform administrator' }, company: { name: 'Strukton', tid: 'TEN-0259' },
      target: { type: 'API credential', id: 'KEY-4A09', label: 'Legacy integration token' }, ip: '84.105.22.7', device: 'macOS 14 · Chrome 126', location: 'Amsterdam, NL', outcome: 'success', compliance: 'compliant',
      changes: [{ field: 'Token status', from: 'Active', to: 'Revoked' }], session: 'ses_a91f', request: 'req_rev_259', detail: 'A long-lived API token was revoked as part of credential hygiene. Any dependent integrations will fail until re-issued.' },

    { id: 'EVT-7F3A8F9A', ts: '2026-06-06T13:11:47', category: 'subscription', action: 'Add-on licenses purchased: +5', severity: 'low',
      actor: { name: 'Hans Aalbers', email: 'h.aalbers@betonson.com', role: 'Tenant administrator' }, company: { name: 'Betonson', tid: 'TEN-0211' },
      target: { type: 'License pool', id: 'LIC-0211', label: 'Betonson seats' }, ip: '92.66.30.7', device: 'Windows 11 · Edge 125', location: 'Son, NL', outcome: 'success', compliance: 'compliant',
      changes: [{ field: 'Total seats', from: '25', to: '30' }, { field: 'Add-on charge', from: '€0', to: '€4 800 / yr' }], session: 'ses_2110', request: 'req_lic_211', detail: 'Five add-on licenses purchased and prorated to the current annual term.' },

    { id: 'EVT-7F3A8F83', ts: '2026-06-06T10:28:19', category: 'admin', action: 'Integration connected: Autodesk Construction Cloud', severity: 'low',
      actor: { name: 'Maaike Bos', email: 'm.bos@witteveenbos.com', role: 'Tenant administrator' }, company: { name: 'Witteveen+Bos', tid: 'TEN-0276' },
      target: { type: 'Integration', id: 'INT-ACC-09', label: 'Autodesk Construction Cloud' }, ip: '145.53.120.3', device: 'macOS 14 · Chrome 126', location: 'Deventer, NL', outcome: 'success', compliance: 'compliant',
      changes: [{ field: 'Connection', from: 'Not configured', to: 'Connected' }, { field: 'Scopes granted', from: '—', to: 'data:read, data:write' }], session: 'ses_2760', request: 'req_int_276', detail: 'A third-party integration was authorised via OAuth. Tokens stored encrypted at rest.' },

    { id: 'EVT-7F3A8F6C', ts: '2026-06-05T17:36:02', category: 'security', action: 'Brute-force pattern detected', severity: 'high',
      actor: { name: 'Unknown', email: 'multiple', role: 'Unauthenticated' }, company: { name: 'Reynaers Aluminium', tid: 'TEN-0312' },
      target: { type: 'Tenant', id: 'TEN-0312', label: 'Reynaers Aluminium' }, ip: '45.155.205.0/24', device: 'Distributed', location: 'Multiple', outcome: 'blocked', compliance: 'flagged',
      changes: null, session: 'anon', request: 'req_bf_312', detail: 'A distributed credential-stuffing pattern targeting multiple accounts was detected and throttled. No accounts compromised; affected users prompted to reset.' },

    { id: 'EVT-7F3A8F55', ts: '2026-06-05T14:09:38', category: 'export', action: 'Compliance report generated (SOC 2)', severity: 'low',
      actor: { name: 'Sanne Koenders', email: 's.koenders@vbg.io', role: 'Platform administrator' }, company: { name: 'VBG Platform', tid: 'INTERNAL' },
      target: { type: 'Report', id: 'RPT-SOC2-Q2', label: 'SOC 2 Q2 2026' }, ip: '84.105.22.7', device: 'macOS 14 · Chrome 126', location: 'Amsterdam, NL', outcome: 'success', compliance: 'compliant',
      changes: null, session: 'ses_a91f', request: 'req_rpt_soc2', detail: 'Quarterly SOC 2 control evidence report compiled from audit records and exported as a signed PDF.' },

    { id: 'EVT-7F3A8F3E', ts: '2026-06-05T11:55:14', category: 'permission', action: 'Tenant admin invited', severity: 'medium',
      actor: { name: 'Sanne Koenders', email: 's.koenders@vbg.io', role: 'Platform administrator' }, company: { name: 'VBI', tid: 'TEN-0245' },
      target: { type: 'Invitation', id: 'INV-0245', label: 'i.vandijk@vbi.nl' }, ip: '84.105.22.7', device: 'macOS 14 · Chrome 126', location: 'Amsterdam, NL', outcome: 'success', compliance: 'compliant',
      changes: [{ field: 'Invited role', from: '—', to: 'Tenant administrator' }], session: 'ses_a91f', request: 'req_inv_245', detail: 'An administrator invitation was issued. The invite expires in 7 days and requires MFA enrolment on acceptance.' },

    { id: 'EVT-7F3A8F27', ts: '2026-06-05T09:18:46', category: 'system', action: 'Scheduled data residency migration completed', severity: 'low',
      actor: { name: 'Migration service', email: 'system@vbg.io', role: 'Automated service' }, company: { name: 'Mecanoo', tid: 'TEN-0338' },
      target: { type: 'Platform', id: 'MIG-0338', label: 'Region migration' }, ip: '10.0.4.18', device: 'Internal worker', location: 'eu-west-1', outcome: 'success', compliance: 'compliant',
      changes: [{ field: 'Storage region', from: 'eu-central-1', to: 'eu-west-1' }], session: 'system', request: 'job_mig_338', detail: 'Tenant models migrated to the requested data residency region. Integrity checksums verified post-migration.' },

    { id: 'EVT-7F3A8F10', ts: '2026-06-04T16:47:25', category: 'auth', action: 'Sign-in succeeded', severity: 'low',
      actor: { name: 'Winy Maas', email: 'w.maas@mvrdv.com', role: 'Lead engineer' }, company: { name: 'MVRDV', tid: 'TEN-0371' },
      target: { type: 'Session', id: 'SES-3710', label: 'Workspace session' }, ip: '92.66.55.11', device: 'macOS 14 · Chrome 126', location: 'Rotterdam, NL', outcome: 'success', compliance: 'compliant',
      changes: null, session: 'ses_3710', request: 'req_login_371', detail: 'Standard sign-in with MFA satisfied via authenticator app.' },

    { id: 'EVT-7F3A8EF9', ts: '2026-06-04T13:22:51', category: 'admin', action: 'Bulk user import: 18 accounts', severity: 'medium',
      actor: { name: 'Mark Heijmans', email: 'm.heijmans@heijmans.nl', role: 'Tenant administrator' }, company: { name: 'Heijmans Vastgoed', tid: 'TEN-0142' },
      target: { type: 'User accounts', id: 'IMP-0142', label: '18 new members' }, ip: '84.105.40.18', device: 'Windows 11 · Edge 125', location: 'Rosmalen, NL', outcome: 'warning', compliance: 'review',
      changes: [{ field: 'Accounts created', from: '0', to: '16' }, { field: 'Accounts skipped', from: '0', to: '2 (duplicate email)' }], session: 'ses_4018', request: 'req_imp_142', detail: 'Bulk member provisioning from CSV. 16 of 18 succeeded; 2 skipped as duplicates. Partial success flagged for review.' },

    { id: 'EVT-7F3A8EE2', ts: '2026-06-04T10:40:33', category: 'security', action: 'Session forcibly terminated', severity: 'medium',
      actor: { name: 'Sanne Koenders', email: 's.koenders@vbg.io', role: 'Platform administrator' }, company: { name: 'Janssen de Jong', tid: 'TEN-0398' },
      target: { type: 'Session', id: 'SES-9981', label: 'n.dejong@jajo.com' }, ip: '84.105.22.7', device: 'macOS 14 · Chrome 126', location: 'Amsterdam, NL', outcome: 'success', compliance: 'compliant',
      changes: [{ field: 'Session state', from: 'Active', to: 'Terminated' }], session: 'ses_a91f', request: 'req_term_398', detail: 'An active user session was revoked by an administrator following the account lockout incident.' },

    { id: 'EVT-7F3A8ECB', ts: '2026-06-03T15:14:09', category: 'subscription', action: 'Trial converted to paid (Team)', severity: 'low',
      actor: { name: 'Emma Hofman', email: 'e.hofman@steck.nl', role: 'Tenant administrator' }, company: { name: 'Steck', tid: 'TEN-0419' },
      target: { type: 'Subscription', id: 'SUB-0419', label: 'Steck subscription' }, ip: '92.66.71.2', device: 'Windows 11 · Chrome 126', location: 'Amsterdam, NL', outcome: 'success', compliance: 'compliant',
      changes: [{ field: 'Plan', from: 'Trial', to: 'Team' }, { field: 'Payment method', from: 'None', to: 'SEPA direct debit' }], session: 'ses_4190', request: 'req_conv_419', detail: 'A trial subscription was converted to a paid Team plan with a verified payment method on file.' },

    { id: 'EVT-7F3A8EB4', ts: '2026-06-03T12:03:27', category: 'config', action: 'Webhook endpoint registered', severity: 'low',
      actor: { name: 'Bram Kok', email: 'b.kok@strukton.com', role: 'Integration engineer' }, company: { name: 'Strukton', tid: 'TEN-0259' },
      target: { type: 'Webhook', id: 'WHK-0259', label: 'generation.completed' }, ip: '92.66.4.51', device: 'API client', location: 'Utrecht, NL', outcome: 'success', compliance: 'compliant',
      changes: [{ field: 'Endpoint', from: '—', to: 'https://ci.strukton.com/hooks/vbg' }, { field: 'Events', from: '—', to: 'generation.completed' }], session: 'ses_5f21', request: 'req_whk_259', detail: 'A webhook subscription was registered. Delivery secret generated and signing enabled.' },

    { id: 'EVT-7F3A8E9D', ts: '2026-06-02T17:51:40', category: 'permission', action: 'Access request denied', severity: 'medium',
      actor: { name: 'Ruben Smit', email: 'r.smit@gs-vastgoed.nl', role: 'Member' }, company: { name: 'G&S Vastgoed', tid: 'TEN-0362' },
      target: { type: 'Project', id: 'VBG-62-A1', label: 'Restricted project' }, ip: '145.53.200.9', device: 'macOS 14 · Safari', location: 'Amsterdam, NL', outcome: 'failure', compliance: 'compliant',
      changes: null, session: 'ses_6200', request: 'req_acc_362', detail: 'A member requested access to a project outside their assigned scope. Request denied by policy; tenant admin notified.' },

    { id: 'EVT-7F3A8E86', ts: '2026-06-02T14:20:55', category: 'admin', action: 'Billing contact changed', severity: 'low',
      actor: { name: 'Sanne Koenders', email: 's.koenders@vbg.io', role: 'Platform administrator' }, company: { name: 'AM Real Estate', tid: 'TEN-0288' },
      target: { type: 'Subscription', id: 'SUB-0288', label: 'AM Real Estate' }, ip: '84.105.22.7', device: 'macOS 14 · Chrome 126', location: 'Amsterdam, NL', outcome: 'success', compliance: 'compliant',
      changes: [{ field: 'Billing contact', from: 's.bakker@am.nl', to: 'finance@am.nl' }], session: 'ses_a91f', request: 'req_bill_288', detail: 'The billing contact on the subscription was updated. Invoice notifications redirected.' },

    { id: 'EVT-7F3A8E6F', ts: '2026-06-02T09:37:12', category: 'export', action: 'Invoice batch exported (PDF)', severity: 'low',
      actor: { name: 'Finance operations', email: 'finance@vbg.io', role: 'Finance' }, company: { name: 'VBG Platform', tid: 'INTERNAL' },
      target: { type: 'Invoices', id: 'EXP-INV-06', label: 'May 2026 · 142 invoices' }, ip: '84.105.22.30', device: 'macOS 14 · Chrome 126', location: 'Amsterdam, NL', outcome: 'success', compliance: 'compliant',
      changes: null, session: 'ses_fin1', request: 'req_inv_exp', detail: 'Monthly invoice batch exported for accounting reconciliation.' },

    { id: 'EVT-7F3A8E58', ts: '2026-06-01T16:44:08', category: 'security', action: 'Encryption key rotated', severity: 'medium',
      actor: { name: 'Key management', email: 'system@vbg.io', role: 'Automated service' }, company: { name: 'VBG Platform', tid: 'INTERNAL' },
      target: { type: 'Platform', id: 'KMS-0601', label: 'Tenant data keys' }, ip: '10.0.4.5', device: 'Internal worker', location: 'eu-west-1', outcome: 'success', compliance: 'compliant',
      changes: [{ field: 'Key version', from: 'v7', to: 'v8' }], session: 'system', request: 'job_kms_0601', detail: 'Scheduled rotation of tenant data-encryption keys. Re-encryption performed transparently; no downtime.' },

    { id: 'EVT-7F3A8E41', ts: '2026-06-01T11:09:50', category: 'auth', action: 'SCIM user deprovisioned', severity: 'low',
      actor: { name: 'Identity provider', email: 'scim@vbg.io', role: 'Automated service' }, company: { name: 'Arcadis', tid: 'TEN-0131' },
      target: { type: 'User account', id: 'USR-3120', label: 'former.employee@arcadis.com' }, ip: '10.0.5.2', device: 'SCIM connector', location: 'eu-west-1', outcome: 'success', compliance: 'compliant',
      changes: [{ field: 'Account status', from: 'Active', to: 'Deactivated' }, { field: 'Seat', from: 'Assigned', to: 'Reclaimed' }], session: 'system', request: 'job_scim_131', detail: 'An account was automatically deactivated by the corporate identity provider via SCIM. Assigned license seat reclaimed.' },

    { id: 'EVT-7F3A8E2A', ts: '2026-05-31T15:28:33', category: 'config', action: 'Data export disabled for tenant', severity: 'high',
      actor: { name: 'Sanne Koenders', email: 's.koenders@vbg.io', role: 'Platform administrator' }, company: { name: 'Janssen de Jong', tid: 'TEN-0398' },
      target: { type: 'Policy', id: 'POL-EXP-398', label: 'Export policy' }, ip: '84.105.22.7', device: 'macOS 14 · Chrome 126', location: 'Amsterdam, NL', outcome: 'success', compliance: 'review',
      changes: [{ field: 'Bulk export', from: 'Allowed', to: 'Disabled' }], session: 'ses_a91f', request: 'req_exp_398', detail: 'Bulk data export disabled for a suspended tenant pending account resolution. Flagged for review.' },

    { id: 'EVT-7F3A8E13', ts: '2026-05-31T10:02:19', category: 'admin', action: 'Product catalog entry archived', severity: 'low',
      actor: { name: 'Sanne Koenders', email: 's.koenders@vbg.io', role: 'Platform administrator' }, company: { name: 'VBG Platform', tid: 'INTERNAL' },
      target: { type: 'Product', id: 'PRD-0144', label: 'Legacy façade panel' }, ip: '84.105.22.7', device: 'macOS 14 · Chrome 126', location: 'Amsterdam, NL', outcome: 'success', compliance: 'compliant',
      changes: [{ field: 'Catalog status', from: 'Active', to: 'Archived' }], session: 'ses_a91f', request: 'req_prd_144', detail: 'A product catalog entry was archived and removed from new project selection. Existing references retained.' }
  ];

  /* ---- helpers ---- */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function parse(ts) { return new Date(ts); }
  function fmtDate(ts) { const d = parse(ts); return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); }
  function fmtTime(ts) { const d = parse(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); }
  function fmtDateTime(ts) { return fmtDate(ts) + ' · ' + fmtTime(ts); }
  function relTime(ts) {
    const diff = NOW - parse(ts);
    const m = Math.round(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    const h = Math.round(m / 60);
    if (h < 24) return h + ' h ago';
    const d = Math.round(h / 24);
    if (d < 7) return d + ' day' + (d === 1 ? '' : 's') + ' ago';
    const w = Math.round(d / 7);
    return w + ' week' + (w === 1 ? '' : 's') + ' ago';
  }
  function daysAgo(ts) { return Math.floor((NOW - parse(ts)) / 86400000); }

  /* ---- expose data + facet helpers ---- */
  window.VBG_AUDIT = {
    DATA: EVENTS,
    CAT: CAT, SEV: SEV, OUTCOME: OUTCOME, COMPLIANCE: COMPLIANCE,
    fmtDate: fmtDate, fmtTime: fmtTime, fmtDateTime: fmtDateTime, relTime: relTime, daysAgo: daysAgo,
    NOW: NOW,
    count: function (pred) { return EVENTS.filter(pred).length; }
  };

  const STYLE = `
    vbg-audit-table { display: block; }
    vbg-audit-table .atable { width: 100%; border-collapse: collapse; table-layout: fixed; }
    vbg-audit-table thead th {
      text-align: left; font: var(--text-label); text-transform: uppercase;
      letter-spacing: var(--tracking-overline); color: var(--fg3);
      border-bottom: 1px solid var(--border-subtle);
      padding: 12px 18px; white-space: nowrap; user-select: none;
      position: sticky; top: 0; z-index: 2; background: var(--bg-surface);
    }
    vbg-audit-table thead th.th-tile { width: 54px; }
    vbg-audit-table thead th.th-actor { width: 208px; }
    vbg-audit-table thead th.th-target { width: 212px; }
    vbg-audit-table thead th.th-time { width: 142px; }
    vbg-audit-table thead th.th-outcome { width: 118px; }
    vbg-audit-table thead th.th-comp { width: 130px; }
    vbg-audit-table thead th.th-actions { width: 52px; text-align: right; }

    vbg-audit-table tbody tr {
      border-bottom: 1px solid var(--border-subtle);
      transition: background var(--dur-fast) var(--ease-out);
      cursor: pointer;
    }
    vbg-audit-table tbody tr:last-child { border-bottom: 0; }
    vbg-audit-table tbody tr:hover { background: var(--vbg-amber-50); }
    vbg-audit-table tbody tr.menu-open { background: var(--vbg-amber-50); }
    vbg-audit-table tbody tr.sev-critical { box-shadow: inset 3px 0 0 var(--status-error); }
    vbg-audit-table tbody tr.sev-high { box-shadow: inset 3px 0 0 var(--status-warning); }
    vbg-audit-table td { padding: 12px 18px; vertical-align: middle; }
    vbg-audit-table td:first-child { padding: 12px 4px 12px 18px; }
    vbg-audit-table td.actions-cell { padding: 12px 14px 12px 6px; }

    /* category tile */
    vbg-audit-table .cat-tile {
      width: 36px; height: 36px; border-radius: var(--r-sm);
      display: grid; place-items: center; border: 1px solid transparent;
    }
    vbg-audit-table .cat-tile svg { display: block; }
    vbg-audit-table .cat-tile.info      { background: var(--status-info-bg);      color: var(--status-info); }
    vbg-audit-table .cat-tile.generated { background: var(--vbg-amber-100);       color: var(--vbg-amber-700); }
    vbg-audit-table .cat-tile.validated { background: var(--status-validated-bg); color: var(--status-validated); }
    vbg-audit-table .cat-tile.pending   { background: var(--bg-sunken);           color: var(--fg3); border-color: var(--border-subtle); }
    vbg-audit-table .cat-tile.error     { background: var(--status-error-bg);     color: var(--status-error); }

    /* event cell */
    vbg-audit-table .ev-main { min-width: 0; }
    vbg-audit-table .ev-action { font: var(--text-body-strong); color: var(--fg1); line-height: 1.35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    vbg-audit-table .ev-meta { display: flex; align-items: center; gap: 8px; margin-top: 3px; }
    vbg-audit-table .ev-cat { font: var(--text-caption); color: var(--fg3); }
    vbg-audit-table .ev-meta .sep { width: 3px; height: 3px; border-radius: 999px; background: var(--border-strong); flex: 0 0 auto; }
    vbg-audit-table .ev-sev { display: inline-flex; align-items: center; gap: 5px; font: var(--text-label); }
    vbg-audit-table .ev-sev .sdot { width: 6px; height: 6px; border-radius: 999px; }
    vbg-audit-table .ev-sev.error .sdot { background: var(--status-error); } vbg-audit-table .ev-sev.error { color: var(--status-error-fg); }
    vbg-audit-table .ev-sev.warning .sdot { background: var(--status-warning); } vbg-audit-table .ev-sev.warning { color: var(--status-warning-fg); }
    vbg-audit-table .ev-sev.info .sdot { background: var(--status-info); } vbg-audit-table .ev-sev.info { color: var(--fg3); }
    vbg-audit-table .ev-sev.pending .sdot { background: var(--slate-300); } vbg-audit-table .ev-sev.pending { color: var(--fg4); }

    /* actor */
    vbg-audit-table .actor { min-width: 0; }
    vbg-audit-table .actor .an { font: var(--text-sm); color: var(--fg1); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    vbg-audit-table .actor .ac { font: var(--text-caption); color: var(--fg3); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    vbg-audit-table .actor .ac.internal { color: var(--vbg-amber-700); }

    /* target */
    vbg-audit-table .tgt { min-width: 0; }
    vbg-audit-table .tgt .tl { font: var(--text-sm); color: var(--fg2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    vbg-audit-table .tgt .ti { font: var(--text-caption); color: var(--fg4); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* time */
    vbg-audit-table .tm { white-space: nowrap; }
    vbg-audit-table .tm .td { font: var(--text-sm); color: var(--fg2); }
    vbg-audit-table .tm .tr { font: var(--text-caption); color: var(--fg4); margin-top: 2px; }

    /* outcome badge */
    vbg-audit-table .out { display: inline-flex; align-items: center; gap: 6px; font: var(--text-label); padding: 4px 10px; border-radius: var(--r-full); white-space: nowrap; }
    vbg-audit-table .out .dot { width: 7px; height: 7px; border-radius: 999px; }
    vbg-audit-table .out.success { background: var(--status-success-bg); color: var(--status-success-fg); } vbg-audit-table .out.success .dot { background: var(--status-success); }
    vbg-audit-table .out.error { background: var(--status-error-bg); color: var(--status-error-fg); } vbg-audit-table .out.error .dot { background: var(--status-error); }
    vbg-audit-table .out.warning { background: var(--status-warning-bg); color: var(--status-warning-fg); } vbg-audit-table .out.warning .dot { background: var(--status-warning); }

    /* compliance chip */
    vbg-audit-table .comp { display: inline-flex; align-items: center; gap: 6px; font: var(--text-label); white-space: nowrap; }
    vbg-audit-table .comp .cdot { width: 7px; height: 7px; border-radius: 999px; flex: 0 0 auto; }
    vbg-audit-table .comp.success { color: var(--fg3); } vbg-audit-table .comp.success .cdot { background: var(--status-success); }
    vbg-audit-table .comp.warning { color: var(--status-warning-fg); } vbg-audit-table .comp.warning .cdot { background: var(--status-warning); }
    vbg-audit-table .comp.error { color: var(--status-error-fg); } vbg-audit-table .comp.error .cdot { background: var(--status-error); }
    vbg-audit-table .comp.pending { color: var(--fg4); } vbg-audit-table .comp.pending .cdot { background: var(--slate-300); }

    vbg-audit-table .actions-cell { text-align: right; position: relative; }
    vbg-audit-table .kebab {
      width: 32px; height: 32px; border-radius: var(--r-sm); border: 1px solid transparent; background: transparent;
      display: inline-grid; place-items: center; color: var(--fg3); cursor: pointer;
      transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
    }
    vbg-audit-table .kebab:hover { background: var(--bg-surface); border-color: var(--border); color: var(--fg1); }
    vbg-audit-table tr:hover .kebab { color: var(--fg2); }
    vbg-audit-table .kebab.active { background: var(--bg-surface); border-color: var(--border); color: var(--fg1); }
    vbg-audit-table .menu {
      position: absolute; top: calc(100% - 4px); right: 18px; z-index: 40;
      min-width: 232px; background: var(--bg-raised); border: 1px solid var(--border);
      border-radius: var(--r-md); box-shadow: var(--shadow-pop); padding: 5px;
      display: none; flex-direction: column; gap: 1px;
    }
    vbg-audit-table .menu.open { display: flex; animation: vbgAMenuIn var(--dur-fast) var(--ease-out); }
    vbg-audit-table .menu.up { top: auto; bottom: calc(100% - 4px); }
    @keyframes vbgAMenuIn { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: none; } }
    vbg-audit-table .menu button {
      display: flex; align-items: center; gap: 10px; width: 100%; border: 0; background: transparent;
      cursor: pointer; text-align: left; font: var(--text-body); color: var(--fg1);
      padding: 8px 10px; border-radius: var(--r-sm); transition: background var(--dur-fast) var(--ease-out);
    }
    vbg-audit-table .menu button .ico { display: inline-flex; color: var(--fg3); flex: 0 0 auto; }
    vbg-audit-table .menu button .ico svg { display: block; }
    vbg-audit-table .menu button:hover { background: var(--bg-hover); }
    vbg-audit-table .menu .sep { height: 1px; background: var(--border-subtle); margin: 4px 2px; }

    vbg-audit-table .empty { padding: 64px 20px; text-align: center; color: var(--fg3); }
    vbg-audit-table .empty .et { font: var(--text-h3); color: var(--fg2); margin-bottom: 6px; }
    vbg-audit-table .empty .es { font: var(--text-sm); }
  `;

  function injectStyle() {
    if (document.getElementById('vbg-audit-table-style')) return;
    const s = document.createElement('style'); s.id = 'vbg-audit-table-style'; s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ico(path, size, sw) { size = size || 16; sw = sw || 1.7; return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>'; }

  /* menu action icons */
  const I_VIEW    = '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>';
  const I_CHANGES = '<path d="M21 4H8l-5 8 5 8h13a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1Z"/><path d="m14 9-4 4"/><path d="m10 9 4 4"/>';
  const I_USER    = '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>';
  const I_COMPANY = '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>';
  const I_ENTITY  = '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>';
  const I_FLAG    = '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>';
  const I_COPY    = '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>';
  const I_EXPORT  = '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>';

  function catTile(e) {
    const c = window.VBG_AUDIT.CAT[e.category];
    return '<span class="cat-tile ' + c.tone + '" title="' + esc(c.label) + '">' + ico(c.glyph, 18, 1.7) + '</span>';
  }
  function eventCell(e) {
    const c = window.VBG_AUDIT.CAT[e.category];
    const sv = window.VBG_AUDIT.SEV[e.severity];
    const showSev = (e.severity === 'critical' || e.severity === 'high');
    const sevTag = showSev ? '<span class="sep"></span><span class="ev-sev ' + sv.tone + '"><span class="sdot"></span>' + sv.label + '</span>' : '';
    return '<div class="ev-main"><div class="ev-action">' + esc(e.action) + '</div>'
      + '<div class="ev-meta"><span class="ev-cat">' + esc(c.label) + '</span>' + sevTag + '</div></div>';
  }
  function actorCell(e) {
    const internal = e.company.tid === 'INTERNAL';
    return '<div class="actor"><div class="an">' + esc(e.actor.name) + '</div>'
      + '<div class="ac' + (internal ? ' internal' : '') + '">' + esc(e.company.name) + '</div></div>';
  }
  function targetCell(e) {
    return '<div class="tgt"><div class="tl">' + esc(e.target.label) + '</div>'
      + '<div class="ti">' + esc(e.target.type) + '</div></div>';
  }
  function timeCell(e) {
    const V = window.VBG_AUDIT;
    const compact = V.fmtDate(e.ts).replace(/ \d{4}$/, '');
    return '<div class="tm"><div class="td">' + compact + ' · ' + V.fmtTime(e.ts) + '</div><div class="tr">' + V.relTime(e.ts) + '</div></div>';
  }
  function outcomeCell(e) {
    const o = window.VBG_AUDIT.OUTCOME[e.outcome];
    return '<span class="out ' + o.tone + '"><span class="dot"></span>' + o.label + '</span>';
  }
  function compCell(e) {
    const c = window.VBG_AUDIT.COMPLIANCE[e.compliance];
    return '<span class="comp ' + c.tone + '"><span class="cdot"></span>' + c.label + '</span>';
  }

  function menuHtml(e) {
    const hasChanges = e.changes && e.changes.length;
    const internal = e.company.tid === 'INTERNAL';
    return '<div class="menu" data-menu="' + e.id + '">'
      + '<button data-act="open" data-id="' + e.id + '"><span class="ico">' + ico(I_VIEW) + '</span>View event detail</button>'
      + '<button data-act="changes" data-id="' + e.id + '"' + (hasChanges ? '' : ' disabled') + '><span class="ico">' + ico(I_CHANGES) + '</span>View change details</button>'
      + '<div class="sep"></div>'
      + '<button data-act="by-user" data-id="' + e.id + '"><span class="ico">' + ico(I_USER) + '</span>Activity by this user</button>'
      + (internal ? '' : '<button data-act="by-company" data-id="' + e.id + '"><span class="ico">' + ico(I_COMPANY) + '</span>Activity by this company</button>')
      + '<button data-act="by-entity" data-id="' + e.id + '"><span class="ico">' + ico(I_ENTITY) + '</span>History for affected entity</button>'
      + '<div class="sep"></div>'
      + '<button data-act="flag" data-id="' + e.id + '"><span class="ico">' + ico(I_FLAG) + '</span>Flag for compliance review</button>'
      + '<button data-act="copy" data-id="' + e.id + '"><span class="ico">' + ico(I_COPY) + '</span>Copy event ID</button>'
      + '<button data-act="export" data-id="' + e.id + '"><span class="ico">' + ico(I_EXPORT) + '</span>Export this record</button>'
      + '</div>';
  }

  function rowHtml(e) {
    const sevCls = e.severity === 'critical' ? ' sev-critical' : (e.severity === 'high' ? ' sev-high' : '');
    return ''
      + '<tr data-id="' + e.id + '" class="' + sevCls.trim() + '">'
      +   '<td>' + catTile(e) + '</td>'
      +   '<td>' + eventCell(e) + '</td>'
      +   '<td>' + actorCell(e) + '</td>'
      +   '<td>' + targetCell(e) + '</td>'
      +   '<td>' + timeCell(e) + '</td>'
      +   '<td>' + outcomeCell(e) + '</td>'
      +   '<td>' + compCell(e) + '</td>'
      +   '<td class="actions-cell">'
      +     '<button class="kebab" aria-label="Event actions" data-id="' + e.id + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg></button>'
      +     menuHtml(e)
      +   '</td>'
      + '</tr>';
  }

  function headHtml() {
    return '<thead><tr>'
      + '<th class="th-tile"></th>'
      + '<th>Event</th>'
      + '<th class="th-actor">Actor</th>'
      + '<th class="th-target">Affected entity</th>'
      + '<th class="th-time">Timestamp</th>'
      + '<th class="th-outcome">Outcome</th>'
      + '<th class="th-comp">Compliance</th>'
      + '<th class="th-actions"></th>'
      + '</tr></thead>';
  }

  function matches(e, f) {
    if (!f) return true;
    if (f.search) {
      const q = f.search.toLowerCase();
      const hay = (e.action + ' ' + e.id + ' ' + e.actor.name + ' ' + e.actor.email + ' ' + e.company.name + ' ' + e.target.label + ' ' + e.target.id + ' ' + e.ip).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    if (f.category && f.category.size && !f.category.has(e.category)) return false;
    if (f.outcome && f.outcome.size && !f.outcome.has(e.outcome)) return false;
    if (f.compliance && f.compliance.size && !f.compliance.has(e.compliance)) return false;
    if (f.severity && f.severity.size && !f.severity.has(e.severity)) return false;
    if (f.company && f.company.size && !f.company.has(e.company.tid)) return false;
    if (f.range && f.range !== 'any') {
      const d = window.VBG_AUDIT.daysAgo(e.ts);
      if (d > parseInt(f.range, 10)) return false;
    }
    return true;
  }

  class VbgAuditTable extends HTMLElement {
    connectedCallback() {
      injectStyle();
      this.data = EVENTS.slice();
      this.filters = null;
      this.flagged = {};
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
      const visible = this.data.filter(function (e) { return matches(e, self.filters); });
      let body;
      if (visible.length === 0) {
        body = '<tbody><tr><td colspan="8"><div class="empty"><div class="et">No audit records match the current filters</div>'
          + '<div class="es">Adjust event type, outcome, compliance, severity, company or time range to widen the results.</div></div></td></tr></tbody>';
      } else {
        body = '<tbody>' + visible.map(function (e) { return rowHtml(e); }).join('') + '</tbody>';
      }
      this.innerHTML = '<table class="atable">' + headHtml() + body + '</table>';
      this.openMenu = null;
      this.dispatchEvent(new CustomEvent('auditrender', { bubbles: true, detail: { visible: visible.length, total: this.data.length } }));
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
        if (rr.bottom > host.bottom - 280) menu.classList.add('up');
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
        this.dispatchEvent(new CustomEvent('auditaction', { bubbles: true, detail: { act: act, id: id } }));
        return;
      }
      const tr = e.target.closest('tbody tr[data-id]');
      if (tr) this.dispatchEvent(new CustomEvent('auditopen', { bubbles: true, detail: { id: tr.getAttribute('data-id') } }));
    }
  }

  if (!customElements.get('vbg-audit-table')) {
    customElements.define('vbg-audit-table', VbgAuditTable);
  }
})();
