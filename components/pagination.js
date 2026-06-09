/* ============================================================
   VBG — generic table pagination
   Works on top of the existing table web components without
   touching their render logic. It pages the rendered rows by
   toggling row visibility, writes the "Showing a–b of N" footer
   text, and builds the pager control inside the footer's .pager.

   It re-pages automatically whenever the table re-renders
   (filter change, duplicate/delete, etc.) via a MutationObserver,
   resetting to page 1 on a fresh render. Pager navigation only
   toggles row display (no DOM re-render), so it never loops.

   Usage (after the table + page controller scripts have loaded):
     VBGPager({ table: '#atable', pageSize: 9, noun: 'records' });
   ============================================================ */
(function () {
  function VBGPager(opts) {
    var table = typeof opts.table === 'string' ? document.querySelector(opts.table) : opts.table;
    if (!table) return;

    var panel = table.closest('.panel') || table.parentElement;
    var foot = panel ? panel.querySelector('.tfoot') : null;
    if (!foot) return;

    var pager = foot.querySelector('.pager');
    if (!pager) { pager = document.createElement('div'); pager.className = 'pager'; foot.appendChild(pager); }
    var footnote = foot.querySelector('#footnote') || foot.querySelector('span');

    var pageSize = opts.pageSize || 10;
    var noun = opts.noun || 'items';
    var state = { page: 1 };

    function dataRows() {
      var trs = table.querySelectorAll('tbody > tr');
      var out = [];
      for (var i = 0; i < trs.length; i++) {
        var tr = trs[i];
        if (tr.querySelector('.empty') || tr.querySelector('td[colspan]')) continue;
        out.push(tr);
      }
      return out;
    }

    function btn(label, pg, o) {
      o = o || {};
      return '<button' + (o.on ? ' class="on"' : '') + (o.disabled ? ' disabled' : '')
        + (pg != null ? ' data-pg="' + pg + '"' : '') + '>' + label + '</button>';
    }

    function pagerHtml(page, pages) {
      var html = btn('\u2039', page - 1, { disabled: page <= 1 });
      var list = [];
      if (pages <= 7) {
        for (var i = 1; i <= pages; i++) list.push(i);
      } else {
        list.push(1);
        var s = Math.max(2, page - 1), e = Math.min(pages - 1, page + 1);
        if (s > 2) list.push('\u2026');
        for (var j = s; j <= e; j++) list.push(j);
        if (e < pages - 1) list.push('\u2026');
        list.push(pages);
      }
      list.forEach(function (p) {
        if (p === '\u2026') html += '<span class="ell">\u2026</span>';
        else html += btn(p, p, { on: p === page });
      });
      html += btn('\u203A', page + 1, { disabled: page >= pages });
      return html;
    }

    function renderPage() {
      var rows = dataRows();
      var total = rows.length;
      var pages = Math.max(1, Math.ceil(total / pageSize));
      if (state.page > pages) state.page = pages;
      if (state.page < 1) state.page = 1;
      var start = (state.page - 1) * pageSize, end = start + pageSize;
      for (var i = 0; i < rows.length; i++) {
        rows[i].style.display = (i >= start && i < end) ? '' : 'none';
      }
      if (footnote) {
        footnote.textContent = total === 0
          ? ('No ' + noun)
          : ('Showing ' + (start + 1) + '\u2013' + Math.min(end, total) + ' of ' + total + ' ' + noun);
      }
      pager.innerHTML = pagerHtml(state.page, pages);
    }

    pager.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-pg]');
      if (!b || b.disabled) return;
      state.page = parseInt(b.getAttribute('data-pg'), 10) || 1;
      renderPage();
    });

    // Re-page on any table re-render (filters, add/remove rows).
    if (window.MutationObserver) {
      new MutationObserver(function () { state.page = 1; renderPage(); })
        .observe(table, { childList: true, subtree: true });
    }

    renderPage();
  }

  window.VBGPager = VBGPager;
})();
