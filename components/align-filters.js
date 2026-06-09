/* ============================================================
   VBG — filter-sidebar alignment helper
   On workspace pages the table column carries a toolbar
   (record count + active-filter chips) above the table panel,
   while the filter sidebar starts at the top of the workspace.
   This offsets the filter sidebar by the toolbar's height so its
   top edge lines up with the top of the corresponding table.
   Re-syncs when the toolbar grows (e.g. active chips wrap).
   ============================================================ */
(function () {
  function run() {
    document.querySelectorAll('.workspace').forEach(function (ws) {
      var toolbar = ws.querySelector('.table-col > .toolbar');
      var filters = ws.querySelector('.filters');
      if (!toolbar || !filters) return;

      function sync() {
        var cs = getComputedStyle(toolbar);
        var h = toolbar.offsetHeight
          + (parseFloat(cs.marginTop) || 0)
          + (parseFloat(cs.marginBottom) || 0);
        filters.style.marginTop = h + 'px';
      }

      sync();
      // keep aligned through layout/zoom changes and chip updates
      if (window.ResizeObserver) {
        var ro = new ResizeObserver(sync);
        ro.observe(toolbar);
      }
      window.addEventListener('resize', sync);
      var chips = toolbar.querySelector('.activechips');
      if (chips && window.MutationObserver) {
        new MutationObserver(sync).observe(chips, { childList: true, subtree: true });
      }
      // settle after fonts/scale
      setTimeout(sync, 120);
      setTimeout(sync, 400);
    });
  }
  if (document.readyState !== 'loading') run();
  else document.addEventListener('DOMContentLoaded', run);
})();
