/* ============================================================
   VBG — System administration · controller
   Builds panels, tab switching, settings save bar, maintenance
   mode, service restart, scheduled-job run, system-logs drawer,
   toasts. Light DOM, vanilla. Relies on system-admin-data.js.
   ============================================================ */
(function () {
  'use strict';

  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  ready(function () {
    var SYS = window.VBG_SYS;
    if (!SYS) return;
    var ico = SYS.ico;

    /* ---------------- build panels ---------------- */
    $('#panels').innerHTML = SYS.panels();
    var enabled = SYS.FLAGS.filter(function (f) { return f.on; }).length;
    $('#tc-features').textContent = enabled + '/' + SYS.FLAGS.length;

    /* ---------------- toast ---------------- */
    var toast = $('#toast'), toastMsg = $('#toast-msg'), toastIc = $('#toast-ic'), toastTimer = null;
    var ICONS = {
      ok: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
      warn: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg>'
    };
    function showToast(msg, kind) {
      kind = kind || 'ok';
      toastIc.className = 'ico ' + kind;
      toastIc.innerHTML = ICONS[kind] || ICONS.ok;
      toastMsg.textContent = msg;
      toast.setAttribute('data-show', '');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toast.removeAttribute('data-show'); }, 2600);
    }

    /* ---------------- tab switching ---------------- */
    var tabs = $$('#tabbar .tab');
    function selectTab(name) {
      tabs.forEach(function (t) { t.classList.toggle('sel', t.getAttribute('data-tab') === name); });
      $$('#panels .panel').forEach(function (p) { p.classList.toggle('active', p.getAttribute('data-panel') === name); });
      $('#scroll').scrollTop = 0;
      if (history.replaceState) history.replaceState(null, '', '#' + name);
    }
    tabs.forEach(function (t) { t.addEventListener('click', function () { selectTab(t.getAttribute('data-tab')); }); });
    var initial = (location.hash || '').replace('#', '');
    selectTab(['overview', 'platform', 'security', 'features', 'operations', 'notifications'].indexOf(initial) > -1 ? initial : 'overview');

    /* ---------------- dirty / save bar ---------------- */
    var savebar = $('#savebar'), dirty = false;
    function markDirty() { if (!dirty) { dirty = true; savebar.classList.add('show'); } }
    function clearDirty() { dirty = false; savebar.classList.remove('show'); }

    function refreshFeatureCount() {
      var on = $$('#panels [data-switch^="flag-"]').filter(function (s) { return s.classList.contains('on'); }).length;
      $('#tc-features').textContent = on + '/' + SYS.FLAGS.length;
    }

    /* delegate: switches */
    $('#panels').addEventListener('click', function (e) {
      var sw = e.target.closest('[data-switch]');
      if (sw && !sw.hasAttribute('disabled')) {
        var on = !sw.classList.contains('on');
        sw.classList.toggle('on', on);
        sw.setAttribute('aria-checked', String(on));
        var key = sw.getAttribute('data-switch');
        if (key.indexOf('mod-') === 0) {
          var mod = sw.closest('.mod'); if (mod) mod.classList.toggle('on', on);
        }
        if (key.indexOf('flag-') === 0) refreshFeatureCount();
        markDirty();
        return;
      }
      /* provider configure */
      var cfg = e.target.closest('[data-cfg]');
      if (cfg) { showToast('Opening configuration for ' + cfg.closest('.trow').querySelector('.tr-title').textContent.trim()); return; }
      /* restart service */
      var rst = e.target.closest('[data-restart]');
      if (rst) { openRestart(rst.getAttribute('data-name')); return; }
      /* run job */
      var run = e.target.closest('[data-run]');
      if (run) { run.disabled = true; showToast('Queued “' + run.getAttribute('data-run') + '” to run now'); setTimeout(function () { run.disabled = false; }, 1400); return; }
      /* email test */
      if (e.target.closest('#email-test')) { showToast('Test email sent to support@vbg.io'); var n = $('#email-test-note'); if (n) n.textContent = 'Last test delivered just now · 118 ms'; return; }
      /* overview → logs */
      if (e.target.closest('#ov-logs')) { openLogs(); return; }
    });
    /* delegate: inputs / selects */
    $('#panels').addEventListener('input', function (e) { if (e.target.matches('[data-dirty]')) markDirty(); });
    $('#panels').addEventListener('change', function (e) { if (e.target.matches('[data-dirty]')) markDirty(); });

    $('#sb-save').addEventListener('click', function () { clearDirty(); showToast('Platform settings saved'); });
    $('#sb-discard').addEventListener('click', function () {
      $('#panels').innerHTML = SYS.panels();
      refreshFeatureCount();
      var active = $('#tabbar .tab.sel');
      $$('#panels .panel').forEach(function (p) { p.classList.toggle('active', active && p.getAttribute('data-panel') === active.getAttribute('data-tab')); });
      clearDirty();
      showToast('Changes discarded', 'warn');
    });

    /* ============================================================
       MAINTENANCE MODE
       ============================================================ */
    var state = { maint: false };
    var mScrim = $('#maint-scrim'), mPill = $('#maint-pill'), mLabel = $('#maint-label');
    function openMaint() {
      if (!state.maint) {
        $('#maint-title').textContent = 'Enter maintenance mode';
        $('#maint-sub').textContent = 'Tenants will see a maintenance screen. Background jobs and generation runs are paused.';
        $('#maint-body').style.display = '';
        $('#maint-footl').textContent = 'Affects all active sessions';
        $('#maint-confirm').textContent = 'Enter maintenance mode';
        $('#maint-confirm').className = 'btn-primary btn-sm';
        $('#maint-dh-ic').className = 'dh-ic warn';
      } else {
        $('#maint-title').textContent = 'Exit maintenance mode';
        $('#maint-sub').textContent = 'The platform will return to service and queued jobs will resume.';
        $('#maint-body').style.display = 'none';
        $('#maint-footl').textContent = 'Maintenance active since 14:30';
        $('#maint-confirm').textContent = 'Resume service';
        $('#maint-confirm').className = 'btn-primary btn-sm';
        $('#maint-dh-ic').className = 'dh-ic amber';
      }
      mScrim.classList.add('open');
    }
    function closeMaint() { mScrim.classList.remove('open'); }
    mPill.addEventListener('click', openMaint);
    $('#maint-close').addEventListener('click', closeMaint);
    $('#maint-cancel').addEventListener('click', closeMaint);
    mScrim.addEventListener('mousedown', function (e) { if (e.target === mScrim) closeMaint(); });
    $('#maint-confirm').addEventListener('click', function () {
      state.maint = !state.maint;
      mPill.classList.toggle('is-maint', state.maint);
      mLabel.textContent = state.maint ? 'Maintenance · paused' : 'Live · Operational';
      closeMaint();
      showToast(state.maint ? 'Maintenance mode enabled — tenants notified' : 'Maintenance mode disabled — service resumed', state.maint ? 'warn' : 'ok');
    });

    /* ============================================================
       RESTART SERVICE
       ============================================================ */
    var rScrim = $('#restart-scrim'), restartName = '';
    function openRestart(name) { restartName = name; $('#restart-name').textContent = name; rScrim.classList.add('open'); }
    function closeRestart() { rScrim.classList.remove('open'); }
    $('#restart-close').addEventListener('click', closeRestart);
    $('#restart-cancel').addEventListener('click', closeRestart);
    rScrim.addEventListener('mousedown', function (e) { if (e.target === rScrim) closeRestart(); });
    $('#restart-confirm').addEventListener('click', function () { closeRestart(); showToast(restartName + ' restarted successfully'); });

    /* ============================================================
       SYSTEM LOGS DRAWER
       ============================================================ */
    var lScrim = $('#logs-scrim'), drLog = $('#dr-log'), logLvl = 'all';
    function renderLogs() {
      var rows = SYS.LOGS.filter(function (l) { return logLvl === 'all' || l.lvl === logLvl; });
      drLog.innerHTML = rows.map(function (l) {
        var lbl = { info: 'INFO', warn: 'WARN', error: 'ERROR', ok: 'OK' }[l.lvl] || l.lvl.toUpperCase();
        var m = SYS.esc(l.m).replace(/^([a-z-]+):/, '<b>$1:</b>');
        return '<div class="log-line"><span class="lt">' + l.t + '</span><span class="ll ' + l.lvl + '">' + lbl + '</span><span class="lm">' + m + '</span></div>';
      }).join('');
      $('#log-count').textContent = rows.length + ' events';
    }
    function openLogs() { renderLogs(); lScrim.classList.add('open'); }
    function closeLogs() { lScrim.classList.remove('open'); }
    $('#logs-btn').addEventListener('click', openLogs);
    $('#logs-close').addEventListener('click', closeLogs);
    lScrim.addEventListener('mousedown', function (e) { if (e.target === lScrim) closeLogs(); });
    $$('#log-filter button').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('#log-filter button').forEach(function (x) { x.classList.remove('sel'); });
        b.classList.add('sel'); logLvl = b.getAttribute('data-lvl'); renderLogs();
      });
    });

    /* ---------------- global ESC ---------------- */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (mScrim.classList.contains('open')) closeMaint();
      else if (rScrim.classList.contains('open')) closeRestart();
      else if (lScrim.classList.contains('open')) closeLogs();
    });
  });
})();
