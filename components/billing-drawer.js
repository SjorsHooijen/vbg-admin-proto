/* ============================================================
   VBG — subscription detail / billing drawer
   Usage:  <vbg-billing-drawer></vbg-billing-drawer>
           drawer.open(sub, tabId); drawer.close(); drawer.refresh();

   A right-hand slide-over consolidating every per-subscription action:
     · Overview     — plan, contract timeline, billing contact, value
     · Licenses     — allocation / usage, add-ons, adjust quantity, assign
     · Invoices     — invoice history (view / download / export)
     · Entitlements — assigned modules (toggle) + usage limits / quotas
     · History      — billing & licensing event timeline

   Light DOM; styles scoped under `vbg-billing-drawer`.
   Re-emits `billingaction` { act, id } so the page controller stays the
   single place that mutates table state.
   ============================================================ */
(function () {
  const VB = function () { return window.VBG_BILLING || {}; };
  function seed(str) { let h = 1779033703; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return function () { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; }; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ico(path, size, sw) { size = size || 16; sw = sw || 1.7; return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>'; }
  function initials(name) { const c = name.replace(/[^A-Za-z0-9 &+]/g, '').trim().split(/[ &+]+/).filter(Boolean); return (c.length === 1 ? c[0].slice(0, 2) : (c[0][0] + c[1][0])).toUpperCase(); }
  function fmtQuota(n) { if (n >= 1000000) return (n / 1000000) + 'M'; if (n >= 1000) return (n / 1000) + 'k'; return '' + n; }

  const I_CLOSE = '<path d="M18 6 6 18"/><path d="M6 6l12 12"/>';
  const I_PLAN  = '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>';
  const I_SUSPEND = '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>';
  const I_RESTORE = '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>';
  const I_DOWN  = '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>';
  const I_PLUS  = '<path d="M12 5v14"/><path d="M5 12h14"/>';
  const I_MINUS = '<path d="M5 12h14"/>';
  const I_COPY  = '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>';

  const TABS = [
    { id: 'overview',     label: 'Overview' },
    { id: 'licenses',     label: 'Licenses' },
    { id: 'invoices',     label: 'Invoices' },
    { id: 'entitlements', label: 'Entitlements' },
    { id: 'history',      label: 'History' }
  ];

  const STYLE = `
    vbg-billing-drawer { position: absolute; inset: 0; z-index: 80; display: none; }
    vbg-billing-drawer[open] { display: block; }
    vbg-billing-drawer .scrim { position: absolute; inset: 0; background: rgba(14,17,22,.38); opacity: 0; transition: opacity var(--dur-base) var(--ease-out); }
    vbg-billing-drawer[open] .scrim { opacity: 1; }
    vbg-billing-drawer .panel {
      position: absolute; top: 0; right: 0; bottom: 0; width: 600px; max-width: 92%;
      background: var(--bg-surface); border-left: 1px solid var(--border); box-shadow: var(--shadow-lg);
      display: flex; flex-direction: column; transform: translateX(100%); transition: transform var(--dur-slow) var(--ease-out);
    }
    vbg-billing-drawer[open] .panel { transform: none; }

    vbg-billing-drawer .dh { flex: 0 0 auto; padding: 20px 24px 0; border-bottom: 1px solid var(--border-subtle); }
    vbg-billing-drawer .dh-top { display: flex; align-items: flex-start; gap: 14px; }
    vbg-billing-drawer .dh-tile { width: 46px; height: 46px; flex: 0 0 46px; border-radius: var(--r-md); background: var(--bg-sunken); border: 1px solid var(--border-subtle); display: grid; place-items: center; font: var(--text-h3); font-weight: 600; color: var(--fg2); }
    vbg-billing-drawer .dh-mid { flex: 1 1 auto; min-width: 0; }
    vbg-billing-drawer .dh-title { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    vbg-billing-drawer .dh-title h2 { font: var(--text-h2); color: var(--fg1); letter-spacing: -0.01em; }
    vbg-billing-drawer .dh-id { font: var(--text-mono-sm); color: var(--fg4); }
    vbg-billing-drawer .dh-sub { margin-top: 5px; font: var(--text-sm); color: var(--fg3); display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
    vbg-billing-drawer .dh-sub .dom { color: var(--fg2); font-weight: 500; }
    vbg-billing-drawer .dh-sub .mdot { width: 3px; height: 3px; border-radius: 999px; background: var(--border-strong); }
    vbg-billing-drawer .dh-close { flex: 0 0 auto; width: 34px; height: 34px; border-radius: var(--r-sm); border: 1px solid transparent; background: transparent; color: var(--fg3); cursor: pointer; display: grid; place-items: center; transition: background var(--dur-fast), color var(--dur-fast), border-color var(--dur-fast); }
    vbg-billing-drawer .dh-close:hover { background: var(--bg-hover); color: var(--fg1); border-color: var(--border); }

    vbg-billing-drawer .plan { display: inline-flex; align-items: center; font: var(--text-label); padding: 3px 9px; border-radius: var(--r-full); white-space: nowrap; border: 1px solid transparent; }
    vbg-billing-drawer .plan.enterprise { background: var(--vbg-amber-100); color: var(--fg-accent); }
    vbg-billing-drawer .plan.professional { background: var(--slate-100); color: var(--fg2); }
    vbg-billing-drawer .plan.team { background: transparent; border-color: var(--border); color: var(--fg2); }
    vbg-billing-drawer .plan.trial { background: transparent; border: 1px dashed var(--border-strong); color: var(--fg3); }
    vbg-billing-drawer .badge { display: inline-flex; align-items: center; gap: 6px; font: var(--text-label); padding: 3px 9px; border-radius: var(--r-full); white-space: nowrap; }
    vbg-billing-drawer .badge .dot { width: 7px; height: 7px; border-radius: var(--r-full); }
    vbg-billing-drawer .badge.active { background: var(--status-success-bg); color: var(--status-success-fg); } vbg-billing-drawer .badge.active .dot { background: var(--status-success); }
    vbg-billing-drawer .badge.trial { background: var(--status-info-bg); color: var(--status-info-fg); } vbg-billing-drawer .badge.trial .dot { background: var(--status-info); }
    vbg-billing-drawer .badge.pending { background: var(--status-pending-bg); color: var(--status-pending-fg); } vbg-billing-drawer .badge.pending .dot { background: var(--status-pending); }
    vbg-billing-drawer .badge.past_due { background: var(--status-warning-bg); color: var(--status-warning-fg); } vbg-billing-drawer .badge.past_due .dot { background: var(--status-warning); }
    vbg-billing-drawer .badge.suspended { background: var(--status-error-bg); color: var(--status-error-fg); } vbg-billing-drawer .badge.suspended .dot { background: var(--status-error); }
    vbg-billing-drawer .badge.canceled { background: var(--slate-100); color: var(--fg4); } vbg-billing-drawer .badge.canceled .dot { background: var(--slate-300); }

    vbg-billing-drawer .dh-actions { display: flex; gap: 10px; padding: 16px 0 16px; }
    vbg-billing-drawer .dbtn { display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 14px; border-radius: var(--r-sm); border: 1px solid var(--border); background: var(--bg-surface); font: var(--text-body-strong); font-size: 13px; color: var(--fg1); cursor: pointer; white-space: nowrap; transition: background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out); }
    vbg-billing-drawer .dbtn:hover { background: var(--bg-hover); }
    vbg-billing-drawer .dbtn .ico { color: var(--fg3); display: inline-flex; }
    vbg-billing-drawer .dbtn.primary { background: var(--vbg-amber); border-color: transparent; color: var(--fg-inverse); box-shadow: 0 1px 2px rgba(184,111,0,.35); }
    vbg-billing-drawer .dbtn.primary:hover { background: var(--vbg-amber-600); }
    vbg-billing-drawer .dbtn.primary .ico { color: var(--fg-inverse); }
    vbg-billing-drawer .dbtn.danger { color: var(--status-error-fg); } vbg-billing-drawer .dbtn.danger .ico { color: var(--status-error); }
    vbg-billing-drawer .dbtn.danger:hover { background: var(--status-error-bg); border-color: #F2C9C9; }
    vbg-billing-drawer .dbtn:disabled { opacity: .5; cursor: default; }

    vbg-billing-drawer .dtabs { display: flex; gap: 2px; }
    vbg-billing-drawer .dtab { position: relative; border: 0; background: transparent; cursor: pointer; padding: 10px 12px 13px; font: var(--text-body-strong); font-size: 13px; color: var(--fg3); transition: color var(--dur-fast) var(--ease-out); }
    vbg-billing-drawer .dtab:hover { color: var(--fg1); }
    vbg-billing-drawer .dtab.active { color: var(--fg-accent); }
    vbg-billing-drawer .dtab.active::after { content: ''; position: absolute; left: 8px; right: 8px; bottom: -1px; height: 2px; background: var(--vbg-amber); border-radius: 2px 2px 0 0; }
    vbg-billing-drawer .dtab .n { margin-left: 7px; font: var(--text-mono-sm); color: var(--fg4); }
    vbg-billing-drawer .dtab.active .n { color: var(--vbg-amber-700); }

    vbg-billing-drawer .db { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 22px 24px 28px; }
    vbg-billing-drawer .sec { margin-bottom: 26px; }
    vbg-billing-drawer .sec:last-child { margin-bottom: 0; }
    vbg-billing-drawer .ol { font: var(--text-label); text-transform: uppercase; letter-spacing: var(--tracking-overline); color: var(--fg3); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
    vbg-billing-drawer .ol .olr { text-transform: none; letter-spacing: 0; font: var(--text-caption); color: var(--fg4); }

    /* value banner */
    vbg-billing-drawer .vbanner { display: flex; gap: 1px; background: var(--border-subtle); border: 1px solid var(--border-subtle); border-radius: var(--r-md); overflow: hidden; margin-bottom: 22px; }
    vbg-billing-drawer .vcell { flex: 1 1 0; background: var(--bg-surface); padding: 14px 16px; }
    vbg-billing-drawer .vcell .vk { font: var(--text-caption); color: var(--fg3); margin-bottom: 5px; }
    vbg-billing-drawer .vcell .vv { font: var(--text-h3); font-family: var(--font-mono); color: var(--fg1); letter-spacing: -0.01em; }
    vbg-billing-drawer .vcell .vs { font: var(--text-caption); color: var(--fg4); margin-top: 2px; }

    /* property grid */
    vbg-billing-drawer .props { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--border-subtle); border: 1px solid var(--border-subtle); border-radius: var(--r-md); overflow: hidden; }
    vbg-billing-drawer .prop { background: var(--bg-surface); padding: 12px 14px; }
    vbg-billing-drawer .prop.span2 { grid-column: 1 / -1; }
    vbg-billing-drawer .prop .k { font: var(--text-caption); color: var(--fg3); margin-bottom: 4px; }
    vbg-billing-drawer .prop .v { font: var(--text-body-strong); color: var(--fg1); display: flex; align-items: center; gap: 7px; }
    vbg-billing-drawer .prop .v.mono { font: var(--text-mono); }

    /* contract timeline */
    vbg-billing-drawer .timeline { padding: 16px; border: 1px solid var(--border-subtle); border-radius: var(--r-md); background: var(--bg-surface); }
    vbg-billing-drawer .tl-bar { position: relative; height: 6px; border-radius: var(--r-full); background: var(--slate-150); margin: 26px 0 8px; }
    vbg-billing-drawer .tl-fill { position: absolute; top: 0; left: 0; bottom: 0; border-radius: var(--r-full); background: var(--vbg-amber); }
    vbg-billing-drawer .tl-knob { position: absolute; top: 50%; width: 12px; height: 12px; border-radius: 999px; background: var(--bg-surface); border: 2px solid var(--vbg-amber); transform: translate(-50%, -50%); }
    vbg-billing-drawer .tl-ends { display: flex; justify-content: space-between; font: var(--text-mono-sm); color: var(--fg3); }
    vbg-billing-drawer .tl-ends .te { display: flex; flex-direction: column; gap: 1px; }
    vbg-billing-drawer .tl-ends .te.r { text-align: right; }
    vbg-billing-drawer .tl-ends .tk { font: var(--text-caption); color: var(--fg4); font-family: var(--font-sans); text-transform: uppercase; letter-spacing: var(--tracking-overline); }
    vbg-billing-drawer .tl-note { margin-top: 14px; font: var(--text-sm); color: var(--fg2); display: flex; align-items: center; gap: 8px; }
    vbg-billing-drawer .tl-note .ico { color: var(--fg3); display: inline-flex; }
    vbg-billing-drawer .tl-note b { color: var(--fg1); font-weight: 600; }

    /* contact card */
    vbg-billing-drawer .contact { display: flex; align-items: center; gap: 12px; padding: 13px 14px; border: 1px solid var(--border-subtle); border-radius: var(--r-md); background: var(--bg-surface); }
    vbg-billing-drawer .contact .cav { width: 38px; height: 38px; flex: 0 0 38px; border-radius: var(--r-full); background: var(--vbg-amber); color: var(--fg-inverse); display: grid; place-items: center; font: var(--text-body-strong); font-weight: 600; }
    vbg-billing-drawer .contact .cmid { flex: 1 1 auto; min-width: 0; }
    vbg-billing-drawer .contact .cn { font: var(--text-body-strong); color: var(--fg1); }
    vbg-billing-drawer .contact .ce { font: var(--text-mono-sm); color: var(--fg3); margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    vbg-billing-drawer .contact .cbtn { flex: 0 0 auto; width: 32px; height: 32px; border: 1px solid var(--border); background: var(--bg-surface); border-radius: var(--r-sm); color: var(--fg3); cursor: pointer; display: grid; place-items: center; transition: background var(--dur-fast); }
    vbg-billing-drawer .contact .cbtn:hover { background: var(--bg-hover); color: var(--fg1); }

    /* license meter */
    vbg-billing-drawer .meter { padding: 16px; border: 1px solid var(--border-subtle); border-radius: var(--r-md); background: var(--bg-surface); margin-bottom: 16px; }
    vbg-billing-drawer .meter .mtop { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10px; }
    vbg-billing-drawer .meter .mbig { font: var(--text-display); font-size: 26px; font-family: var(--font-mono); color: var(--fg1); letter-spacing: -0.01em; }
    vbg-billing-drawer .meter .mbig .of { font: var(--text-body); color: var(--fg4); }
    vbg-billing-drawer .meter .mpct { font: var(--text-body-strong); color: var(--fg2); }
    vbg-billing-drawer .meter .mtrack { height: 9px; border-radius: var(--r-full); background: var(--slate-150); overflow: hidden; }
    vbg-billing-drawer .meter .mfill { height: 100%; border-radius: var(--r-full); background: var(--vbg-amber); transition: width var(--dur-base) var(--ease-out); }
    vbg-billing-drawer .meter.near .mfill { background: var(--status-warning); }
    vbg-billing-drawer .meter.full .mfill { background: var(--status-error); }
    vbg-billing-drawer .meter .mlegend { display: flex; gap: 18px; margin-top: 12px; }
    vbg-billing-drawer .meter .mleg { font: var(--text-caption); color: var(--fg3); }
    vbg-billing-drawer .meter .mleg b { display: block; font: var(--text-mono); color: var(--fg1); margin-top: 2px; }

    /* quantity stepper */
    vbg-billing-drawer .qrow { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 13px 14px; border: 1px solid var(--border-subtle); border-radius: var(--r-md); background: var(--bg-surface); margin-bottom: 8px; }
    vbg-billing-drawer .qrow .lab .t { font: var(--text-body-strong); color: var(--fg1); }
    vbg-billing-drawer .qrow .lab .d { font: var(--text-caption); color: var(--fg3); margin-top: 2px; }
    vbg-billing-drawer .stepper { display: inline-flex; align-items: center; border: 1px solid var(--border); border-radius: var(--r-sm); overflow: hidden; flex: 0 0 auto; }
    vbg-billing-drawer .stepper button { width: 34px; height: 34px; border: 0; background: var(--bg-surface); color: var(--fg2); cursor: pointer; display: grid; place-items: center; transition: background var(--dur-fast); }
    vbg-billing-drawer .stepper button:hover { background: var(--bg-hover); color: var(--fg1); }
    vbg-billing-drawer .stepper button:disabled { opacity: .35; cursor: default; }
    vbg-billing-drawer .stepper .qval { min-width: 52px; text-align: center; font: var(--text-mono); color: var(--fg1); border-left: 1px solid var(--border); border-right: 1px solid var(--border); height: 34px; line-height: 34px; }

    vbg-billing-drawer .srow { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 13px 14px; border: 1px solid var(--border-subtle); border-radius: var(--r-md); background: var(--bg-surface); margin-bottom: 8px; }
    vbg-billing-drawer .srow .lab { min-width: 0; }
    vbg-billing-drawer .srow .lab .t { font: var(--text-body-strong); color: var(--fg1); display: flex; align-items: center; gap: 8px; }
    vbg-billing-drawer .srow .lab .t .mico { color: var(--fg3); display: inline-flex; }
    vbg-billing-drawer .srow .lab .d { font: var(--text-caption); color: var(--fg3); margin-top: 2px; }
    vbg-billing-drawer .sw { width: 38px; height: 22px; border-radius: 999px; background: var(--slate-300); position: relative; cursor: pointer; flex: 0 0 auto; transition: background var(--dur-fast) var(--ease-out); border: 0; padding: 0; }
    vbg-billing-drawer .sw::after { content: ''; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 999px; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.2); transition: transform var(--dur-fast) var(--ease-out); }
    vbg-billing-drawer .sw.on { background: var(--vbg-amber); }
    vbg-billing-drawer .sw.on::after { transform: translateX(16px); }
    vbg-billing-drawer .sw.locked { opacity: .5; cursor: default; }

    /* invoices */
    vbg-billing-drawer .inv { display: flex; align-items: center; gap: 12px; padding: 12px 4px; border-bottom: 1px solid var(--border-subtle); }
    vbg-billing-drawer .inv:last-child { border-bottom: 0; }
    vbg-billing-drawer .inv .imid { flex: 1 1 auto; min-width: 0; }
    vbg-billing-drawer .inv .inum { font: var(--text-mono); color: var(--fg1); }
    vbg-billing-drawer .inv .idate { font: var(--text-caption); color: var(--fg3); margin-top: 2px; }
    vbg-billing-drawer .inv .iamt { font: var(--text-mono); color: var(--fg1); text-align: right; white-space: nowrap; }
    vbg-billing-drawer .inv .istat { font: var(--text-label); display: inline-flex; align-items: center; gap: 6px; width: 92px; }
    vbg-billing-drawer .inv .istat .pdot { width: 7px; height: 7px; border-radius: 999px; }
    vbg-billing-drawer .inv .istat.paid { color: var(--status-success-fg); } vbg-billing-drawer .inv .istat.paid .pdot { background: var(--status-success); }
    vbg-billing-drawer .inv .istat.pending { color: var(--fg3); } vbg-billing-drawer .inv .istat.pending .pdot { background: var(--status-pending); }
    vbg-billing-drawer .inv .istat.overdue { color: var(--status-warning-fg); } vbg-billing-drawer .inv .istat.overdue .pdot { background: var(--status-warning); }
    vbg-billing-drawer .inv .istat.failed { color: var(--status-error-fg); } vbg-billing-drawer .inv .istat.failed .pdot { background: var(--status-error); }
    vbg-billing-drawer .inv .idl { flex: 0 0 auto; width: 32px; height: 32px; border: 1px solid var(--border); background: var(--bg-surface); border-radius: var(--r-sm); color: var(--fg3); cursor: pointer; display: grid; place-items: center; transition: background var(--dur-fast); }
    vbg-billing-drawer .inv .idl:hover { background: var(--bg-hover); color: var(--fg1); }

    /* quota meters */
    vbg-billing-drawer .quota { margin-bottom: 14px; }
    vbg-billing-drawer .quota .qt { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 6px; }
    vbg-billing-drawer .quota .qname { font: var(--text-body-strong); color: var(--fg1); }
    vbg-billing-drawer .quota .qnum { font: var(--text-mono-sm); color: var(--fg3); }
    vbg-billing-drawer .quota .qtrack { height: 6px; border-radius: var(--r-full); background: var(--slate-150); overflow: hidden; }
    vbg-billing-drawer .quota .qfill { height: 100%; border-radius: var(--r-full); background: var(--vbg-amber); }
    vbg-billing-drawer .quota.near .qfill { background: var(--status-warning); }
    vbg-billing-drawer .quota.full .qfill { background: var(--status-error); }

    /* history timeline */
    vbg-billing-drawer .events { display: flex; flex-direction: column; }
    vbg-billing-drawer .ev { display: flex; gap: 12px; padding: 12px 2px; border-bottom: 1px solid var(--border-subtle); }
    vbg-billing-drawer .ev:last-child { border-bottom: 0; }
    vbg-billing-drawer .ev .edot { flex: 0 0 auto; width: 28px; height: 28px; border-radius: var(--r-sm); display: grid; place-items: center; background: var(--bg-sunken); border: 1px solid var(--border-subtle); color: var(--fg3); margin-top: 1px; }
    vbg-billing-drawer .ev.amber .edot { background: var(--vbg-amber-50); border-color: var(--vbg-amber-300); color: var(--vbg-amber-700); }
    vbg-billing-drawer .ev.err .edot { background: var(--status-error-bg); border-color: #F2C9C9; color: var(--status-error); }
    vbg-billing-drawer .ev .emain { flex: 1 1 auto; min-width: 0; }
    vbg-billing-drawer .ev .etop { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
    vbg-billing-drawer .ev .etitle { font: var(--text-body-strong); color: var(--fg1); }
    vbg-billing-drawer .ev .ewhen { font: var(--text-mono-sm); color: var(--fg4); white-space: nowrap; }
    vbg-billing-drawer .ev .edesc { font: var(--text-sm); color: var(--fg3); margin-top: 3px; }
    vbg-billing-drawer .ev .edesc b { color: var(--fg2); font-weight: 500; }
    vbg-billing-drawer .ev .eactor { font: var(--text-mono-sm); color: var(--fg4); margin-top: 3px; }

    vbg-billing-drawer .note { display: flex; gap: 10px; align-items: flex-start; padding: 11px 13px; border-radius: var(--r-sm); background: var(--bg-sunken); border: 1px solid var(--border-subtle); font: var(--text-sm); color: var(--fg2); }
    vbg-billing-drawer .note.warn { background: var(--status-warning-bg); border-color: #ECDCA8; color: var(--status-warning-fg); }
    vbg-billing-drawer .note.err { background: var(--status-error-bg); border-color: #F2C9C9; color: var(--status-error-fg); }
    vbg-billing-drawer .note .ico { flex: 0 0 auto; margin-top: 1px; }
    vbg-billing-drawer .note b { font-weight: 600; }
  `;

  function injectStyle() {
    if (document.getElementById('vbg-billing-drawer-style')) return;
    const s = document.createElement('style'); s.id = 'vbg-billing-drawer-style'; s.textContent = STYLE;
    document.head.appendChild(s);
  }

  class VbgBillingDrawer extends HTMLElement {
    connectedCallback() {
      injectStyle();
      this.it = null; this.tab = 'overview'; this.draftSeats = null;
      this.innerHTML = '<div class="scrim"></div><div class="panel"><div class="dh"></div><div class="db"></div></div>';
      this.scrim = this.querySelector('.scrim');
      this.dh = this.querySelector('.dh');
      this.db = this.querySelector('.db');
      this._click = this.onClick.bind(this);
      this.addEventListener('click', this._click);
      this._key = function (e) { if (e.key === 'Escape' && this.hasAttribute('open')) this.close(); }.bind(this);
      document.addEventListener('keydown', this._key);
    }
    disconnectedCallback() { document.removeEventListener('keydown', this._key); }

    open(it, tab) { this.it = it; this.tab = tab || 'overview'; this.draftSeats = it.seatsTotal; this.setAttribute('open', ''); this.render(); }
    close() { this.removeAttribute('open'); }
    refresh() {
      if (this.it && this.hasAttribute('open')) {
        const live = (VB().LIVE || []).filter(function (x) { return x.tid === this.it.tid; }.bind(this))[0];
        if (live) { this.it = live; this.draftSeats = live.seatsTotal; }
        this.render();
      }
    }

    render() {
      if (!this.it) return;
      const it = this.it, V = VB();
      const suspended = it.status === 'suspended';
      const canSuspend = it.status === 'active' || it.status === 'past_due' || it.status === 'trial';
      this.dh.innerHTML = ''
        + '<div class="dh-top">'
        +   '<span class="dh-tile">' + esc(initials(it.name)) + '</span>'
        +   '<div class="dh-mid">'
        +     '<div class="dh-title"><h2>' + esc(it.name) + '</h2><span class="dh-id">' + esc(it.tid) + '</span></div>'
        +     '<div class="dh-sub"><span class="dom">' + esc(it.domain) + '</span><span class="mdot"></span>'
        +       '<span class="plan ' + it.plan + '">' + (V.PLAN_LABEL || {})[it.plan] + '</span>'
        +       '<span class="badge ' + it.status + '"><span class="dot"></span>' + (V.STATUS_LABEL || {})[it.status] + '</span></div>'
        +   '</div>'
        +   '<button class="dh-close" aria-label="Close" data-x>' + ico(I_CLOSE, 18, 2) + '</button>'
        + '</div>'
        + '<div class="dh-actions">'
        +   '<button class="dbtn primary" data-do="plan"><span class="ico">' + ico(I_PLAN, 15) + '</span>Change plan</button>'
        +   (suspended
            ? '<button class="dbtn" data-do="reactivate"><span class="ico">' + ico(I_RESTORE, 15) + '</span>Reactivate</button>'
            : (canSuspend ? '<button class="dbtn danger" data-do="suspend"><span class="ico">' + ico(I_SUSPEND, 15) + '</span>Suspend</button>' : ''))
        +   '<button class="dbtn" data-do="export"><span class="ico">' + ico(I_DOWN, 15) + '</span>Export</button>'
        + '</div>'
        + '<div class="dtabs">' + TABS.map(function (t) {
            let n = '';
            if (t.id === 'invoices') n = '<span class="n">' + this.invoiceCount(it) + '</span>';
            if (t.id === 'entitlements') n = '<span class="n">' + ((V.PLAN_MODULES || {})[it.plan] || []).length + '</span>';
            return '<button class="dtab' + (t.id === this.tab ? ' active' : '') + '" data-tab="' + t.id + '">' + t.label + n + '</button>';
          }.bind(this)).join('') + '</div>';

      this.db.innerHTML = this['tab_' + this.tab] ? this['tab_' + this.tab](it) : '';
      this.db.scrollTop = 0;
    }

    invoiceCount(it) {
      if (it.status === 'trial' || it.status === 'pending') return 0;
      const start = new Date(it.contractStart + 'T00:00:00');
      const months = Math.max(1, Math.round((new Date('2026-06-09') - start) / 2629800000));
      return it.cycle === 'monthly' ? Math.min(18, months) : Math.max(1, Math.ceil(months / 12) + 1);
    }

    /* ---------------- OVERVIEW ---------------- */
    tab_overview(it) {
      const V = VB();
      const acv = V.acvOf(it), mrr = V.mrrOf(it);
      const valueRow = it.cycle === 'monthly' ? V.fmtMoney(acv / 12) + '/mo' : V.fmtMoney(acv) + '/yr';
      const isTrial = it.status === 'trial' || it.status === 'pending';
      const banner = '<div class="vbanner">'
        + '<div class="vcell"><div class="vk">Contract value</div><div class="vv">' + (isTrial ? '€0' : V.fmtMoney(acv)) + '</div><div class="vs">' + (isTrial ? 'trial — no charge' : 'per year') + '</div></div>'
        + '<div class="vcell"><div class="vk">Recurring revenue</div><div class="vv">' + V.fmtMoney(mrr) + '</div><div class="vs">monthly (MRR)</div></div>'
        + '<div class="vcell"><div class="vk">Billing</div><div class="vv" style="font-size:19px">' + (V.CYCLE_LABEL || {})[it.cycle] + '</div><div class="vs">' + valueRow + '</div></div>'
        + '</div>';

      function row(k, v, mono, span) { return '<div class="prop' + (span ? ' span2' : '') + '"><div class="k">' + k + '</div><div class="v' + (mono ? ' mono' : '') + '">' + v + '</div></div>'; }
      const props = '<div class="sec"><div class="ol">Subscription</div><div class="props">'
        + row('Plan', (V.PLAN_LABEL || {})[it.plan])
        + row('Status', '<span class="badge ' + it.status + '"><span class="dot"></span>' + (V.STATUS_LABEL || {})[it.status] + '</span>')
        + row('Price per seat', V.fmtMoney((V.PRICE_SEAT || {})[it.plan]) + ' / yr', true)
        + row('Add-on licenses', it.addOn ? '+' + it.addOn : '—', true)
        + row('Auto-renew', it.autoRenew ? 'Enabled' : 'Off')
        + row('Payment', '<span style="text-transform:capitalize">' + (V.PAY_LABEL || {})[it.paymentStatus] + '</span>')
        + '</div></div>';

      /* contract timeline */
      const start = new Date(it.contractStart + 'T00:00:00');
      const end = it.contractEnd ? new Date(it.contractEnd + 'T00:00:00') : null;
      const now = new Date('2026-06-09');
      let pct = 50;
      if (end) pct = Math.max(0, Math.min(100, Math.round((now - start) / (end - start) * 100)));
      const rl = it.renewal ? V.renewLabel(it.renewal) : { txt: 'no renewal', tone: 'none' };
      const timeline = '<div class="sec"><div class="ol">Contract term</div><div class="timeline">'
        + '<div class="tl-bar"><div class="tl-fill" style="width:' + pct + '%"></div><div class="tl-knob" style="left:' + pct + '%"></div></div>'
        + '<div class="tl-ends"><div class="te"><span class="tk">Start</span><span>' + V.fmtDate(it.contractStart) + '</span></div>'
        + '<div class="te r"><span class="tk">' + (it.renewal ? 'Renews' : 'Ended') + '</span><span>' + V.fmtDate(it.contractEnd) + '</span></div></div>'
        + '<div class="tl-note"><span class="ico">' + ico('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>', 15) + '</span>'
        + (it.renewal ? 'Renews <b>' + V.fmtDate(it.renewal) + '</b> · ' + rl.txt + (it.autoRenew ? ' · auto-renew on' : ' · manual renewal') : 'Subscription ended — no scheduled renewal')
        + '</div></div></div>';

      /* billing contact */
      const contact = '<div class="sec"><div class="ol">Billing contact</div><div class="contact">'
        + '<span class="cav">' + esc(initials(it.contact)) + '</span>'
        + '<div class="cmid"><div class="cn">' + esc(it.contact) + '</div><div class="ce">' + esc(it.email) + '</div></div>'
        + '<button class="cbtn" data-copy="' + esc(it.email) + '" title="Copy email">' + ico(I_COPY, 15) + '</button>'
        + '<button class="cbtn" data-do="billing" title="Edit billing info">' + ico('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>', 15) + '</button>'
        + '</div></div>';

      const head = it.paymentStatus === 'overdue'
        ? '<div class="sec"><div class="note warn"><span class="ico">' + ico('<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.42 0z"/>', 16) + '</span>Payment is <b>overdue</b>. The latest invoice has not been settled — collect payment or suspend the subscription.</div></div>'
        : (it.paymentStatus === 'failed' ? '<div class="sec"><div class="note err"><span class="ico">' + ico('<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>', 16) + '</span>Last charge <b>failed</b>. Update the payment method on file and retry the charge.</div></div>' : '');

      return head + banner + props + timeline + contact;
    }

    /* ---------------- LICENSES ---------------- */
    tab_licenses(it) {
      const V = VB();
      const ratio = it.seatsTotal ? it.seatsUsed / it.seatsTotal : 0;
      const cls = ratio >= 1 ? ' full' : (ratio >= 0.9 ? ' near' : '');
      const pct = Math.min(100, Math.round(ratio * 100));
      const available = Math.max(0, it.seatsTotal - it.seatsUsed);
      const base = it.seatsTotal - it.addOn;
      const meter = '<div class="meter' + cls + '"><div class="mtop"><div class="mbig">' + it.seatsUsed + ' <span class="of">/ ' + it.seatsTotal + '</span></div><div class="mpct">' + pct + '%</div></div>'
        + '<div class="mtrack"><span class="mfill" style="width:' + pct + '%"></span></div>'
        + '<div class="mlegend"><div class="mleg">Assigned<b>' + it.seatsUsed + '</b></div><div class="mleg">Available<b>' + available + '</b></div><div class="mleg">Base plan<b>' + base + '</b></div><div class="mleg">Add-on<b>' + (it.addOn ? '+' + it.addOn : '0') + '</b></div></div></div>';

      const draft = this.draftSeats == null ? it.seatsTotal : this.draftSeats;
      const delta = draft - it.seatsTotal;
      const stepper = '<div class="sec"><div class="ol">Adjust license quantity<span class="olr">' + V.fmtMoney((V.PRICE_SEAT || {})[it.plan]) + ' / seat / yr</span></div>'
        + '<div class="qrow"><div class="lab"><div class="t">Total licenses</div><div class="d">' + (delta === 0 ? 'No pending change' : (delta > 0 ? 'Adding ' + delta + ' license' + (delta === 1 ? '' : 's') + ' · +' + V.fmtMoney(delta * (V.PRICE_SEAT || {})[it.plan]) + '/yr' : 'Removing ' + Math.abs(delta) + ' · ' + V.fmtMoney(delta * (V.PRICE_SEAT || {})[it.plan]) + '/yr')) + '</div></div>'
        + '<div class="stepper"><button data-seat="-1"' + (draft <= it.seatsUsed ? ' disabled' : '') + '>' + ico(I_MINUS, 15, 2) + '</button><span class="qval">' + draft + '</span><button data-seat="1">' + ico(I_PLUS, 15, 2) + '</button></div></div>'
        + (delta !== 0 ? '<div class="dh-actions" style="padding:4px 0 0;"><button class="dbtn primary" data-do="save-seats"><span class="ico">' + ico('<path d="M20 6 9 17l-5-5"/>', 15) + '</span>Apply change</button><button class="dbtn" data-do="reset-seats">Cancel</button></div>' : '')
        + '</div>';

      const note = ratio >= 0.9 ? '<div class="sec"><div class="note warn"><span class="ico">' + ico('<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.42 0z"/>', 16) + '</span>License pool is <b>' + pct + '% consumed</b>. Add licenses before the tenant runs out of available seats.</div></div>' : '';

      const assign = '<div class="sec"><div class="ol">Seat assignment</div>'
        + '<div class="srow"><div class="lab"><div class="t">Allow self-service seat claims</div><div class="d">Members can claim an available seat without admin approval</div></div><button class="sw' + (it.plan === 'enterprise' ? ' on' : '') + '" data-toggle></button></div>'
        + '<div class="srow"><div class="lab"><div class="t">Auto-revoke inactive seats</div><div class="d">Reclaim a license after 60 days of inactivity</div></div><button class="sw" data-toggle></button></div>'
        + '<div class="srow"><div class="lab"><div class="t">Overage protection</div><div class="d">Block new assignments once the pool is exhausted</div></div><button class="sw on" data-toggle></button></div>'
        + '</div>';

      return '<div class="sec"><div class="ol">License usage</div>' + meter + '</div>' + note + stepper + assign;
    }

    /* ---------------- INVOICES ---------------- */
    tab_invoices(it) {
      const V = VB();
      if (it.status === 'trial' || it.status === 'pending') {
        return '<div class="sec"><div class="note"><span class="ico">' + ico('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>', 16) + '</span>No invoices yet — this tenant is on a trial with no billing activity.</div></div>';
      }
      const rand = seed(it.tid + 'inv');
      const n = this.invoiceCount(it);
      const acv = V.acvOf(it);
      const amount = it.cycle === 'monthly' ? acv / 12 : acv;
      const monthsStep = it.cycle === 'monthly' ? 1 : 12;
      let d = new Date('2026-06-09');
      d.setDate(1);
      let rows = [];
      for (let i = 0; i < n; i++) {
        const num = 'INV-' + it.tid.slice(4) + '-' + String(2026 * 100 + (12 - i)).slice(0, 4) + (1000 + Math.floor(rand() * 9000));
        let stat = 'paid';
        if (i === 0) stat = it.paymentStatus === 'paid' ? 'paid' : it.paymentStatus;
        else if (rand() < 0.05) stat = 'overdue';
        const dd = new Date(d.getTime());
        rows.push({ num: 'INV-' + d.getFullYear() + '-' + it.tid.slice(4) + '-' + (100 + i), date: V.fmtDate(dd.toISOString().slice(0, 10)), amt: amount, stat: stat });
        d.setMonth(d.getMonth() - monthsStep);
      }
      const total = rows.filter(function (r) { return r.stat === 'paid'; }).reduce(function (a, r) { return a + r.amt; }, 0);
      const list = rows.map(function (r) {
        return '<div class="inv"><div class="imid"><div class="inum">' + r.num + '</div><div class="idate">' + r.date + '</div></div>'
          + '<span class="istat ' + r.stat + '"><span class="pdot"></span>' + (V.PAY_LABEL || {})[r.stat] + '</span>'
          + '<span class="iamt">' + V.fmtMoney(r.amt) + '</span>'
          + '<button class="idl" data-do="download-invoice" title="Download PDF">' + ico(I_DOWN, 15) + '</button></div>';
      }).join('');
      const head = '<div class="dh-actions" style="padding:0 0 14px;"><button class="dbtn" data-do="export"><span class="ico">' + ico(I_DOWN, 15) + '</span>Export all (CSV)</button></div>';
      return head + '<div class="sec"><div class="ol">Invoice history<span class="olr">' + V.fmtMoney(total) + ' collected</span></div>' + list + '</div>';
    }

    /* ---------------- ENTITLEMENTS ---------------- */
    tab_entitlements(it) {
      const V = VB();
      const MODULES = V.MODULES || {};
      const included = (V.PLAN_MODULES || {})[it.plan] || [];
      const incSet = {}; included.forEach(function (m) { incSet[m] = true; });
      const modRows = Object.keys(MODULES).map(function (key) {
        const m = MODULES[key];
        const on = incSet[key];
        const core = (key === 'intent' || key === 'viz');
        return '<div class="srow"><div class="lab"><div class="t"><span class="mico">' + ico(m.glyph, 16) + '</span>' + esc(m.label) + '</div><div class="d">' + (on ? (core ? 'Core module · always included' : 'Included in ' + (V.PLAN_LABEL || {})[it.plan]) : 'Not in plan — available as an add-on') + '</div></div>'
          + '<button class="sw' + (on ? ' on' : '') + (core ? ' locked' : '') + '"' + (core ? '' : ' data-toggle') + '></button></div>';
      }).join('');

      /* usage limits / quotas */
      const q = (V.PLAN_QUOTAS || {})[it.plan] || {};
      const rand = seed(it.tid + 'quota');
      const util = it.seatsTotal ? it.seatsUsed / it.seatsTotal : 0.3;
      function quotaRow(name, used, limit, unit) {
        const ratio = limit ? used / limit : 0;
        const cls = ratio >= 1 ? ' full' : (ratio >= 0.85 ? ' near' : '');
        const pct = Math.min(100, Math.round(ratio * 100));
        return '<div class="quota' + cls + '"><div class="qt"><span class="qname">' + name + '</span><span class="qnum">' + used.toLocaleString('en-US').replace(/,/g, ' ') + ' / ' + limit.toLocaleString('en-US').replace(/,/g, ' ') + ' ' + unit + '</span></div><div class="qtrack"><span class="qfill" style="width:' + pct + '%"></span></div></div>';
      }
      const genUsed = Math.round(q.generation * (0.35 + util * 0.55 + rand() * 0.1));
      const compUsed = Math.round(q.compute * (0.3 + util * 0.5 + rand() * 0.12));
      const stoUsed = Math.round(q.storage * (0.25 + util * 0.6 + rand() * 0.1));
      const apiUsed = Math.round(q.api * (0.2 + util * 0.5 + rand() * 0.15));
      const quotas = '<div class="sec"><div class="ol">Usage limits &amp; quotas<span class="olr">this billing period</span></div>'
        + quotaRow('Generation runs', genUsed, q.generation, 'runs')
        + quotaRow('Compute hours', compUsed, q.compute, 'h')
        + quotaRow('Model storage', stoUsed, q.storage, 'GB')
        + quotaRow('API calls', apiUsed, q.api, '/day')
        + '</div>';

      return '<div class="sec"><div class="ol">Assigned modules &amp; features<span class="olr">' + included.length + ' of ' + Object.keys(MODULES).length + ' enabled</span></div>' + modRows + '</div>' + quotas;
    }

    /* ---------------- HISTORY ---------------- */
    tab_history(it) {
      const V = VB();
      const rand = seed(it.tid + 'hist');
      const A = ['S. Koenders', 'Billing system', 'M. Aerts', 'Finance ops', 'Auto-renewal'];
      let events = [];
      /* deterministic, status-aware billing & licensing log */
      if (it.paymentStatus === 'overdue') events.push({ ic: 'warn', t: 'Payment overdue', d: 'Invoice past due date — automatic reminder sent to <b>' + esc(it.email) + '</b>', w: '2 days ago', a: 'Billing system' });
      if (it.status === 'suspended') events.push({ ic: 'err', t: 'Subscription suspended', d: 'Access suspended for non-payment after <b>3</b> failed reminders', w: '5 days ago', a: 'Finance ops' });
      events.push({ ic: '', t: 'Invoice issued', d: it.cycle === 'monthly' ? 'Monthly invoice for <b>' + V.fmtMoney(V.acvOf(it) / 12) + '</b>' : 'Annual invoice for <b>' + V.fmtMoney(V.acvOf(it)) + '</b>', w: '14 days ago', a: 'Billing system' });
      if (it.addOn) events.push({ ic: 'amber', t: 'Licenses added', d: 'Purchased <b>+' + it.addOn + '</b> add-on license' + (it.addOn === 1 ? '' : 's') + ' · prorated to current term', w: '1 month ago', a: 'S. Koenders' });
      events.push({ ic: 'amber', t: 'Seats reallocated', d: 'Assigned <b>' + Math.max(1, Math.round(it.seatsUsed * 0.1)) + '</b> seats to new project members', w: '6 weeks ago', a: 'M. Aerts' });
      events.push({ ic: '', t: 'Payment received', d: 'Charge settled via <b>SEPA direct debit</b>', w: '2 months ago', a: 'Billing system' });
      if (it.plan === 'enterprise' || it.plan === 'professional') events.push({ ic: 'amber', t: 'Plan upgraded', d: 'Moved to <b>' + (V.PLAN_LABEL || {})[it.plan] + '</b> — entitlements expanded', w: '5 months ago', a: 'S. Koenders' });
      events.push({ ic: '', t: 'Subscription created', d: 'Initial <b>' + (V.PLAN_LABEL || {})[it.plan] + '</b> contract activated on ' + V.fmtDate(it.contractStart), w: V.fmtDate(it.contractStart), a: 'S. Koenders' });

      const list = events.map(function (e) {
        const glyph = e.ic === 'warn' ? '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.42 0z"/>'
          : e.ic === 'err' ? '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>'
          : e.ic === 'amber' ? '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'
          : '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>';
        return '<div class="ev ' + e.ic + '"><span class="edot">' + ico(glyph, 15) + '</span><div class="emain"><div class="etop"><span class="etitle">' + e.t + '</span><span class="ewhen">' + e.w + '</span></div><div class="edesc">' + e.d + '</div><div class="eactor">by ' + esc(e.a) + '</div></div></div>';
      }).join('');
      return '<div class="sec"><div class="ol">Billing &amp; licensing history</div><div class="events">' + list + '</div></div>';
    }

    /* ---------------- interactions ---------------- */
    onClick(e) {
      if (e.target === this.scrim) { this.close(); return; }
      if (e.target.closest('[data-x]')) { this.close(); return; }

      const tab = e.target.closest('.dtab');
      if (tab) { this.tab = tab.getAttribute('data-tab'); this.render(); return; }

      const seat = e.target.closest('[data-seat]');
      if (seat) {
        const dir = parseInt(seat.getAttribute('data-seat'), 10);
        let next = (this.draftSeats == null ? this.it.seatsTotal : this.draftSeats) + dir;
        next = Math.max(this.it.seatsUsed, next);
        this.draftSeats = next;
        this.render();
        return;
      }

      const doBtn = e.target.closest('[data-do]');
      if (doBtn && !doBtn.disabled) {
        const act = doBtn.getAttribute('data-do');
        if (act === 'save-seats') { this.dispatchEvent(new CustomEvent('billingaction', { bubbles: true, detail: { act: 'set-seats', id: this.it.tid, value: this.draftSeats } })); return; }
        if (act === 'reset-seats') { this.draftSeats = this.it.seatsTotal; this.render(); return; }
        if (act === 'download-invoice') {
          const old = doBtn.innerHTML; doBtn.innerHTML = ico('<path d="M20 6 9 17l-5-5"/>', 15);
          setTimeout(function () { doBtn.innerHTML = old; }, 1100);
          this.dispatchEvent(new CustomEvent('billingaction', { bubbles: true, detail: { act: 'toast-invoice', id: this.it.tid } }));
          return;
        }
        this.dispatchEvent(new CustomEvent('billingaction', { bubbles: true, detail: { act: act, id: this.it.tid } }));
        return;
      }

      const copy = e.target.closest('[data-copy]');
      if (copy) {
        const v = copy.getAttribute('data-copy');
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).catch(function () {});
        const old = copy.innerHTML; copy.innerHTML = ico('<path d="M20 6 9 17l-5-5"/>', 15);
        setTimeout(function () { copy.innerHTML = old; }, 1100);
        return;
      }
      const tog = e.target.closest('[data-toggle]');
      if (tog) { tog.classList.toggle('on'); return; }
    }
  }

  if (!customElements.get('vbg-billing-drawer')) {
    customElements.define('vbg-billing-drawer', VbgBillingDrawer);
  }
})();
