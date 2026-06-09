/* ============================================================
   VBG — User profile page logic
   Profile edit · avatar upload · theme · language · notification
   toggles · change-password modal · session revoke · sign out.
   Light DOM, vanilla. Relies on design tokens (styles/tokens.css).
   ============================================================ */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function initials(name) {
    var parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  // =====================================================================
  // PROFILE INFORMATION — edit + live sync to identity panel
  // =====================================================================
  var fields = {
    name: $('#i-name'), email: $('#i-email'), title: $('#i-title'), company: $('#i-company')
  };
  var saved = { name: fields.name.value, email: fields.email.value, title: fields.title.value, company: fields.company.value };
  var saveBtn = $('#profile-save'), resetBtn = $('#profile-reset'), note = $('#profile-note');
  var noteTimer = null;

  function dirty() {
    return fields.name.value !== saved.name || fields.email.value !== saved.email ||
           fields.title.value !== saved.title || fields.company.value !== saved.company;
  }
  function syncButtons() {
    var d = dirty();
    saveBtn.disabled = !d;
    resetBtn.style.display = d ? '' : 'none';
    if (d && note.classList.contains('saved')) { note.classList.remove('saved'); note.innerHTML = ''; }
  }
  function syncIdentity() {
    var av = $('#avatar-lg');
    if (av && !av.style.backgroundImage) av.textContent = initials(saved.name);
  }
  Object.keys(fields).forEach(function (k) { fields[k].addEventListener('input', syncButtons); });

  saveBtn.addEventListener('click', function () {
    if (saveBtn.disabled) return;
    saved = { name: fields.name.value, email: fields.email.value, title: fields.title.value, company: fields.company.value };
    syncIdentity();
    syncButtons();
    note.classList.add('saved');
    note.innerHTML = '<span class="ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>Profile updated';
    clearTimeout(noteTimer);
    noteTimer = setTimeout(function () { note.classList.remove('saved'); note.innerHTML = ''; }, 3200);
  });
  resetBtn.addEventListener('click', function () {
    fields.name.value = saved.name; fields.email.value = saved.email;
    fields.title.value = saved.title; fields.company.value = saved.company;
    syncButtons();
  });
  syncButtons();

  // =====================================================================
  // AVATAR UPLOAD
  // =====================================================================
  var avFile = $('#avatar-file'), avEl = $('#avatar-lg');
  $('#avatar-cam').addEventListener('click', function () { avFile.click(); });
  avFile.addEventListener('change', function () {
    var f = avFile.files && avFile.files[0];
    if (!f) return;
    var url = URL.createObjectURL(f);
    avEl.style.backgroundImage = 'url("' + url + '")';
    avEl.textContent = '';
  });

  // =====================================================================
  // THEME SEGMENTED CONTROL
  // =====================================================================
  var THEME_HINT = {
    light: 'Light theme is used across the workspace. The 3D viewport always renders on a dark canvas.',
    dark: 'Dark theme dims the workspace chrome. Inspectors and tables stay high-contrast for legibility.',
    system: 'Follows your operating system appearance setting automatically.'
  };
  $$('#theme-seg .seg').forEach(function (seg) {
    seg.addEventListener('click', function () {
      $$('#theme-seg .seg').forEach(function (s) { s.classList.remove('sel'); s.setAttribute('aria-checked', 'false'); });
      seg.classList.add('sel'); seg.setAttribute('aria-checked', 'true');
      $('#theme-hint').textContent = THEME_HINT[seg.getAttribute('data-theme')] || '';
    });
  });

  // =====================================================================
  // NOTIFICATION PREFERENCES
  // =====================================================================
  var NOTIFS = [
    { id: 'gen',     title: 'Generation complete',     desc: 'When a building generation run finishes.', inapp: true,  email: true },
    { id: 'valid',   title: 'Validation & clashes',    desc: 'Failed constraints, clashes, or validation errors.', inapp: true,  email: true },
    { id: 'activity',title: 'Project activity',        desc: 'Comments, mentions, and projects shared with you.', inapp: true,  email: false },
    { id: 'recipe',  title: 'Recipe updates',          desc: 'When a recipe you use is updated or published.', inapp: true,  email: false },
    { id: 'digest',  title: 'Weekly summary',          desc: 'A digest of project activity every Monday.', inapp: false, email: true },
    { id: 'product', title: 'Product announcements',   desc: 'New VBG features and release notes.', inapp: false, email: false }
  ];

  function switchHtml(on, label) {
    return '<button class="switch' + (on ? ' on' : '') + '" role="switch" aria-checked="' + on + '" aria-label="' + label + '"></button>';
  }
  function renderNotifs() {
    var table = $('#notif-table');
    // keep header (first child), replace the rest
    var head = table.querySelector('.notif-head');
    table.innerHTML = '';
    table.appendChild(head);
    NOTIFS.forEach(function (n) {
      var row = document.createElement('div');
      row.className = 'notif-row';
      row.innerHTML =
        '<div class="nr-main"><div class="nr-title">' + n.title + '</div><div class="nr-desc">' + n.desc + '</div></div>' +
        '<div class="nr-cell">' + switchHtml(n.inapp, n.title + ' — in-app') + '</div>' +
        '<div class="nr-cell">' + switchHtml(n.email, n.title + ' — email') + '</div>';
      var sw = row.querySelectorAll('.switch');
      sw[0].addEventListener('click', function () { n.inapp = !n.inapp; toggleSwitch(sw[0], n.inapp); });
      sw[1].addEventListener('click', function () { n.email = !n.email; toggleSwitch(sw[1], n.email); });
      table.appendChild(row);
    });
  }
  function toggleSwitch(el, on) { el.classList.toggle('on', on); el.setAttribute('aria-checked', String(on)); }
  renderNotifs();

  // =====================================================================
  // ACTIVE SESSIONS
  // =====================================================================
  var DEVICE_ICON = {
    laptop: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/>',
    desktop: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    tablet: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M12 18h.01"/>'
  };
  var SESSIONS = [
    { id: 's1', icon: 'laptop',  device: 'MacBook Pro',         browser: 'Chrome 126', loc: 'Amsterdam, NL', activity: 'Active now', current: true },
    { id: 's2', icon: 'desktop', device: 'Windows workstation', browser: 'Edge 125',   loc: 'Rotterdam, NL', activity: '2 days ago', current: false },
    { id: 's3', icon: 'phone',   device: 'iPhone 15',           browser: 'Safari',     loc: 'Utrecht, NL',   activity: '5 days ago', current: false },
    { id: 's4', icon: 'tablet',  device: 'iPad Pro',            browser: 'Safari',     loc: 'Amsterdam, NL', activity: '12 days ago', current: false }
  ];

  function renderSessions() {
    var wrap = $('#sessions');
    wrap.innerHTML = SESSIONS.map(function (s) {
      var right = s.current
        ? '<span class="badge-current"><span class="dot"></span>This device</span>'
        : '<button class="se-revoke" data-revoke="' + s.id + '"><span class="ico"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></span>Revoke</button>';
      return '' +
        '<div class="session' + (s.current ? ' current' : '') + '" data-id="' + s.id + '">' +
          '<span class="se-ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + DEVICE_ICON[s.icon] + '</svg></span>' +
          '<div class="se-main">' +
            '<div class="se-device"><span class="se-name">' + s.device + '</span></div>' +
            '<div class="se-meta"><span>' + s.browser + '</span><span class="se-dot"></span><span>' + s.loc + '</span><span class="se-dot"></span><span>' + s.activity + '</span></div>' +
          '</div>' +
          right +
        '</div>';
    }).join('');
    $$('#sessions [data-revoke]').forEach(function (b) {
      b.addEventListener('click', function () { revokeSession(b.getAttribute('data-revoke')); });
    });
    updateRevokeAll();
  }
  function updateRevokeAll() {
    var others = SESSIONS.filter(function (s) { return !s.current; }).length;
    $('#btn-revoke-all').style.display = others ? '' : 'none';
  }
  function revokeSession(id) {
    var row = $('#sessions .session[data-id="' + id + '"]');
    if (row) row.classList.add('removing');
    setTimeout(function () {
      SESSIONS = SESSIONS.filter(function (s) { return s.id !== id; });
      renderSessions();
    }, 220);
  }
  renderSessions();

  // ---- revoke all (confirm modal) ----
  var rvScrim = $('#revoke-scrim');
  function openRevoke() { rvScrim.classList.add('open'); }
  function closeRevoke() { rvScrim.classList.remove('open'); }
  $('#btn-revoke-all').addEventListener('click', openRevoke);
  $('#rv-close').addEventListener('click', closeRevoke);
  $('#rv-cancel').addEventListener('click', closeRevoke);
  $('#rv-confirm').addEventListener('click', function () {
    SESSIONS = SESSIONS.filter(function (s) { return s.current; });
    renderSessions();
    closeRevoke();
  });
  rvScrim.addEventListener('mousedown', function (e) { if (e.target === rvScrim) closeRevoke(); });

  // =====================================================================
  // CHANGE PASSWORD MODAL
  // =====================================================================
  var pwScrim = $('#pw-scrim');
  var pwCur = $('#pw-current'), pwNew = $('#pw-new'), pwConf = $('#pw-confirm');
  var pwSubmit = $('#pw-submit'), pwStrength = $('#pw-strength'), pwConfHint = $('#pw-confirm-hint');

  function scorePassword(p) {
    var s = 0;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  }
  var STRENGTH_COLOR = ['var(--slate-200)', 'var(--status-error)', 'var(--status-warning)', 'var(--status-warning)', 'var(--status-success)'];
  function paintStrength() {
    var sc = scorePassword(pwNew.value);
    $$('.bar', pwStrength).forEach(function (bar, i) {
      bar.style.background = (i < sc && pwNew.value) ? STRENGTH_COLOR[sc] : 'var(--slate-200)';
    });
  }
  function pwValid() {
    var matchOk = pwConf.value && pwConf.value === pwNew.value;
    pwConfHint.style.display = (pwConf.value && !matchOk) ? 'flex' : 'none';
    pwConfHint.classList.toggle('err', !!(pwConf.value && !matchOk));
    return pwCur.value.length > 0 && pwNew.value.length >= 10 && matchOk;
  }
  function pwUpdate() { paintStrength(); pwSubmit.disabled = !pwValid(); }
  [pwCur, pwNew, pwConf].forEach(function (el) { el.addEventListener('input', pwUpdate); });

  function openPw() {
    pwCur.value = pwNew.value = pwConf.value = '';
    $('#pw-form-body').style.display = '';
    $('#pw-success-body').style.display = 'none';
    $('#pw-foot').style.display = '';
    $('#pw-submit').textContent = 'Update password';
    pwConfHint.style.display = 'none';
    pwUpdate();
    pwScrim.classList.add('open');
    setTimeout(function () { pwCur.focus(); }, 60);
  }
  function closePw() { pwScrim.classList.remove('open'); }
  $('#btn-changepw').addEventListener('click', openPw);
  $('#pw-close').addEventListener('click', closePw);
  $('#pw-cancel').addEventListener('click', closePw);
  pwScrim.addEventListener('mousedown', function (e) { if (e.target === pwScrim) closePw(); });
  pwSubmit.addEventListener('click', function () {
    if (pwSubmit.disabled) return;
    $('#pw-form-body').style.display = 'none';
    $('#pw-success-body').style.display = 'flex';
    $('#pw-foot').style.display = 'none';
    $('#pw-live').textContent = 'Password updated.';
    setTimeout(closePw, 1900);
  });

  // =====================================================================
  // SIGN OUT (confirm modal)
  // =====================================================================
  var soScrim = $('#signout-scrim');
  function openSignout() { soScrim.classList.add('open'); }
  function closeSignout() { soScrim.classList.remove('open'); }
  $$('#btn-signout, #btn-signout-2').forEach(function (b) { b.addEventListener('click', openSignout); });
  $('#so-close').addEventListener('click', closeSignout);
  $('#so-cancel').addEventListener('click', closeSignout);
  $('#so-confirm').addEventListener('click', function () { window.location.href = 'index.html'; });
  soScrim.addEventListener('mousedown', function (e) { if (e.target === soScrim) closeSignout(); });

  // =====================================================================
  // GLOBAL ESC
  // =====================================================================
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (pwScrim.classList.contains('open')) closePw();
    else if (rvScrim.classList.contains('open')) closeRevoke();
    else if (soScrim.classList.contains('open')) closeSignout();
  });
})();
