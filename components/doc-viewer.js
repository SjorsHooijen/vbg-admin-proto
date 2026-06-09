/* ============================================================
   VBG — reusable document viewer + download snackbar
   Extracted from VBG Configurator.html so any page can reuse
   the report PDF dialog and the download snackbar.

   API (global):
     VBGDocViewer.open(doc)      -> opens the report dialog
     VBGDocViewer.download(doc)  -> shows a download snackbar
   doc = { name, code, project, client, type, revs, date }

   Renders into LIGHT DOM, scoped global classes, styles injected
   once. Hosts (scrim + snackbar wrap) are appended into #stage so
   they sit inside the scaled canvas. Tokens: styles/tokens.css.
   ============================================================ */
(function () {
  /* per-type presentation: tile color kind, short ext label, sample size */
  const TYPE_META = {
    PDF:  { kind: 'pdf',   ext: 'PDF', kb: 248 },
    DOCX: { kind: 'doc',   ext: 'DOC', kb: 64 },
    XLSX: { kind: 'xls',   ext: 'XLS', kb: 86 },
    IFC:  { kind: 'model', ext: 'IFC', kb: 1240 },
    DWG:  { kind: 'cad',   ext: 'DWG', kb: 512 },
    ZIP:  { kind: 'pkg',   ext: 'ZIP', kb: 3400 }
  };

  const STYLE = `
  /* ============ DOCUMENT VIEWER DIALOG ============ */
  .vbg-scrim {
    position: absolute; inset: 0; z-index: 200;
    background: rgba(14,17,22,.55);
    display: none; align-items: center; justify-content: center; padding: 40px;
    backdrop-filter: blur(3px);
  }
  .vbg-scrim.open { display: flex; opacity: 1; }
  .pdfwin {
    width: 920px; max-width: 100%; height: 928px; max-height: 94%;
    background: var(--bg-surface); border: 1px solid var(--border);
    border-radius: var(--r-lg); box-shadow: var(--shadow-lg);
    display: flex; flex-direction: column; overflow: hidden;
    animation: winIn var(--dur-base) var(--ease-out);
  }
  @keyframes winIn { from { opacity: 0; transform: translateY(12px) scale(.99); } to { opacity: 1; transform: none; } }
  .pdfbar { flex: 0 0 auto; display: flex; align-items: center; gap: 13px; padding: 12px 14px 12px 16px; border-bottom: 1px solid var(--border); }
  .pdfbar .fic { width: 34px; height: 34px; flex: 0 0 34px; border-radius: var(--r-xs); background: var(--status-error); color: #fff; display: grid; place-items: center; position: relative; }
  .pdfbar .fic.xls { background: var(--status-success); }
  .pdfbar .fic.doc { background: var(--status-info); }
  .pdfbar .fic.model { background: var(--status-generated); }
  .pdfbar .fic.cad { background: var(--status-validated); }
  .pdfbar .fic.pkg { background: var(--slate-500); }
  .pdfbar .fic .ext { position: absolute; bottom: 5px; font-family: var(--font-mono); font-size: 7px; font-weight: 700; }
  .pdfbar .finfo { min-width: 0; }
  .pdfbar .ftitle { font: var(--text-body-strong); color: var(--fg1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pdfbar .fsub { font: var(--text-mono-sm); color: var(--fg3); margin-top: 1px; }
  .pdfbar .spacer { flex: 1 1 auto; }
  .pdfbar .pageind { font: var(--text-mono-sm); color: var(--fg3); padding: 7px 11px; background: var(--bg-sunken); border: 1px solid var(--border-subtle); border-radius: var(--r-xs); white-space: nowrap; }
  .pdfbar .pbtn { display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 15px; border-radius: var(--r-sm); border: 1px solid var(--vbg-amber); background: var(--vbg-amber); color: var(--fg-inverse); font: var(--text-body-strong); cursor: pointer; box-shadow: 0 1px 2px rgba(184,111,0,.3); transition: background var(--dur-fast) var(--ease-out); }
  .pdfbar .pbtn:hover { background: var(--vbg-amber-600); }
  .pdfbar .pdfx { width: 36px; height: 36px; flex: 0 0 36px; border-radius: var(--r-sm); border: 1px solid var(--border); background: var(--bg-surface); color: var(--fg3); display: grid; place-items: center; cursor: pointer; transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out); }
  .pdfbar .pdfx:hover { background: var(--bg-hover); color: var(--fg1); }

  .pdfview { flex: 1 1 auto; overflow-y: auto; background: var(--slate-200); padding: 30px 0 38px; display: flex; flex-direction: column; align-items: center; gap: 26px; }

  .rpage { width: 720px; min-height: 992px; background: #fff; color: var(--slate-900); box-shadow: 0 10px 34px rgba(14,17,22,.22); border: 1px solid var(--slate-300); padding: 54px 58px 44px; display: flex; flex-direction: column; }
  .rhead { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; padding-bottom: 17px; border-bottom: 2px solid var(--vbg-amber); }
  .rhead .rbrand { display: flex; align-items: center; gap: 12px; }
  .rhead .rbrand img { width: 38px; height: 38px; display: block; }
  .rhead .rbn { display: flex; flex-direction: column; }
  .rhead .rbn .b1 { font: var(--text-body-strong); color: var(--slate-900); letter-spacing: .04em; }
  .rhead .rbn .b2 { font: var(--text-caption); color: var(--slate-500); margin-top: 1px; }
  .rhead .rmeta { text-align: right; }
  .rhead .rmeta .rlabel { font: var(--text-label); text-transform: uppercase; letter-spacing: var(--tracking-overline); color: var(--slate-500); }
  .rhead .rmeta .rid { font-family: var(--font-mono); font-size: 12px; color: var(--slate-700); margin-top: 4px; }

  .rtitle { margin: 24px 0 4px; font-size: 25px; font-weight: 600; letter-spacing: -.01em; color: var(--slate-900); }
  .rsub2 { font: var(--text-sm); color: var(--slate-500); }

  .rgrid { display: grid; grid-template-columns: 1fr 1fr; margin: 24px 0 2px; border: 1px solid var(--slate-200); border-radius: 6px; overflow: hidden; }
  .rgrid .rg { display: flex; flex-direction: column; gap: 4px; padding: 11px 14px; border-bottom: 1px solid var(--slate-150); }
  .rgrid .rg:nth-child(odd) { border-right: 1px solid var(--slate-150); }
  .rgrid .rg:nth-last-child(-n+2) { border-bottom: 0; }
  .rgrid .rg .k { font: var(--text-caption); color: var(--slate-500); text-transform: uppercase; letter-spacing: var(--tracking-overline); }
  .rgrid .rg .v { font-family: var(--font-mono); font-size: 12.5px; color: var(--slate-900); font-weight: 500; }

  .rsec { margin-top: 28px; }
  .rsec-h { display: flex; align-items: baseline; gap: 11px; margin-bottom: 14px; }
  .rsec-h .num { font-family: var(--font-mono); font-size: 12px; font-weight: 600; color: var(--vbg-amber-700); }
  .rsec-h .t { font-size: 14px; font-weight: 600; color: var(--slate-900); letter-spacing: -.005em; white-space: nowrap; }
  .rsec-h .ln { flex: 1 1 auto; height: 1px; background: var(--slate-200); }

  .rstats { display: flex; align-items: stretch; gap: 10px; }
  .rstat { flex: 1 1 0; border: 1px solid var(--slate-200); border-radius: 6px; padding: 13px 13px; }
  .rstat .n { font-family: var(--font-mono); font-weight: 600; font-size: 23px; color: var(--slate-900); }
  .rstat .n.amber { color: var(--vbg-amber-700); }
  .rstat .l { font: var(--text-caption); color: var(--slate-500); margin-top: 3px; }
  .rstat-mini { display: flex; gap: 22px; margin-top: 14px; }
  .rstat-mini .m { display: flex; align-items: center; gap: 8px; font: var(--text-sm); color: var(--slate-700); }
  .rstat-mini .m b { font-family: var(--font-mono); color: var(--slate-900); }
  .rstat-mini .m .d { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 8px; }

  .rtable { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  .rtable th { text-align: left; font: var(--text-label); text-transform: uppercase; letter-spacing: var(--tracking-overline); color: var(--slate-500); padding: 8px 10px; background: var(--slate-100); border-top: 1px solid var(--slate-200); border-bottom: 1px solid var(--slate-200); }
  .rtable td { padding: 10px; border-bottom: 1px solid var(--slate-150); color: var(--slate-800); vertical-align: top; }
  .rtable tr:last-child td { border-bottom: 0; }
  .rtable .mono { font-family: var(--font-mono); color: var(--slate-900); white-space: nowrap; }
  .rtable .num { text-align: right; font-family: var(--font-mono); color: var(--slate-900); }
  .rtable .sev { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; white-space: nowrap; }
  .rtable .sev .d { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 8px; }
  .rtable .sev.err { color: var(--status-error-fg); } .rtable .sev.err .d { background: var(--status-error); }
  .rtable .sev.warn { color: var(--status-warning-fg); } .rtable .sev.warn .d { background: var(--status-warning); }
  .rtable .sev.info { color: var(--status-info-fg); } .rtable .sev.info .d { background: var(--status-info); }

  .rok { display: flex; align-items: center; gap: 13px; border: 1px solid var(--status-success); background: var(--status-success-bg); border-radius: 6px; padding: 14px 16px; }
  .rok .ic { color: var(--status-success); flex: 0 0 auto; }
  .rok .t { font-weight: 600; color: var(--status-success-fg); }
  .rok .s { font: var(--text-sm); color: var(--slate-600); margin-top: 2px; }

  .rfoot { margin-top: auto; padding-top: 16px; border-top: 1px solid var(--slate-200); display: flex; justify-content: space-between; align-items: baseline; font: var(--text-caption); color: var(--slate-400); }
  .rfoot .mono { font-family: var(--font-mono); }

  /* ============ DOWNLOAD SNACKBAR ============ */
  .snackwrap { position: absolute; left: 24px; bottom: 24px; z-index: 320; display: flex; flex-direction: column-reverse; gap: 10px; }
  .snack { width: 372px; background: var(--bg-raised); border: 1px solid var(--border); border-radius: var(--r-md); box-shadow: var(--shadow-pop); padding: 13px 13px 12px; display: flex; gap: 12px; transform: translateY(16px); opacity: 0; transition: transform var(--dur-base) var(--ease-out), opacity var(--dur-base) var(--ease-out); }
  .snack.show { transform: none; opacity: 1; }
  .snack.hide { transform: translateY(16px); opacity: 0; }
  .snack .sfic { width: 36px; height: 36px; flex: 0 0 36px; border-radius: var(--r-xs); display: grid; place-items: center; color: #fff; position: relative; }
  .snack .sfic.pdf { background: var(--status-error); }
  .snack .sfic.xls { background: var(--status-success); }
  .snack .sfic.doc { background: var(--status-info); }
  .snack .sfic.model { background: var(--status-generated); }
  .snack .sfic.cad { background: var(--status-validated); }
  .snack .sfic.pkg { background: var(--slate-500); }
  .snack .sfic .ext { position: absolute; bottom: 5px; font-family: var(--font-mono); font-size: 7px; font-weight: 700; }
  .snack .smain { flex: 1 1 auto; min-width: 0; }
  .snack .stop { display: flex; align-items: center; gap: 8px; }
  .snack .stitle { font: var(--text-body-strong); color: var(--fg1); flex: 1 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .snack .scheck { color: var(--status-success); display: none; flex: 0 0 auto; }
  .snack.done .scheck { display: inline-flex; }
  .snack .sx { width: 24px; height: 24px; flex: 0 0 24px; border-radius: var(--r-xs); border: 0; background: transparent; color: var(--fg4); cursor: pointer; display: grid; place-items: center; transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out); }
  .snack .sx:hover { background: var(--bg-hover); color: var(--fg1); }
  .snack .sbar { height: 5px; border-radius: var(--r-full); background: var(--bg-sunken); overflow: hidden; margin-top: 10px; }
  .snack .sbar > i { display: block; height: 100%; width: 0%; background: var(--vbg-amber); border-radius: var(--r-full); transition: width .25s linear; }
  .snack.done .sbar > i { background: var(--status-success); }
  .snack .smeta { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 8px; font: var(--text-mono-sm); color: var(--fg3); }
  .snack .smeta-l { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .snack .spct { color: var(--fg2); font-weight: 500; white-space: nowrap; flex: 0 0 auto; }
  .snack.done .spct { color: var(--status-success-fg); }
  `;

  const dlSVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m8 11 4 4 4-4"/><path d="M4 21h16"/></svg>';
  const fileSVG = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>';
  const checkSVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  const xSVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  const closeSVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  function injectStyle() {
    if (document.getElementById('vbg-doc-viewer-style')) return;
    const s = document.createElement('style');
    s.id = 'vbg-doc-viewer-style';
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function hashOf(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = (h * 31 + str.charCodeAt(i)) >>> 0; }
    return '#' + ('00000' + h.toString(16)).slice(-6);
  }

  function host() {
    return document.getElementById('stage') || document.body;
  }

  /* ---- report page markup (header dynamic, body = validation template) ---- */
  function reportPages(doc) {
    const meta = TYPE_META[doc.type] || TYPE_META.PDF;
    const hash = hashOf(doc.code + doc.name);
    const idline = esc(doc.code) + ' · ' + hash;
    const head = function () {
      return '<div class="rhead">'
        + '<div class="rbrand"><img src="assets/vbg-logo-mark-filled.png" alt="VBG"><div class="rbn"><span class="b1">VBG</span><span class="b2">Virtual Building Generator</span></div></div>'
        + '<div class="rmeta"><div class="rlabel">' + esc(doc.type) + ' document</div><div class="rid">' + idline + '</div></div>'
        + '</div>';
    };
    return ''
      // PAGE 1
      + '<article class="rpage">'
      +   head()
      +   '<h1 class="rtitle">' + esc(doc.name) + '</h1>'
      +   '<div class="rsub2">' + esc(doc.project) + ' · ' + esc(doc.client) + ' · Generated from engineering intent</div>'
      +   '<div class="rgrid">'
      +     '<div class="rg"><span class="k">Project</span><span class="v">' + esc(doc.project) + '</span></div>'
      +     '<div class="rg"><span class="k">Client</span><span class="v">' + esc(doc.client) + '</span></div>'
      +     '<div class="rg"><span class="k">Document ID</span><span class="v">' + esc(doc.code) + '</span></div>'
      +     '<div class="rg"><span class="k">File type</span><span class="v">' + esc(doc.type) + '</span></div>'
      +     '<div class="rg"><span class="k">Revision</span><span class="v">r' + doc.revs + '</span></div>'
      +     '<div class="rg"><span class="k">Last updated</span><span class="v">' + esc(doc.date) + '</span></div>'
      +   '</div>'
      +   '<section class="rsec">'
      +     '<div class="rsec-h"><span class="num">01</span><span class="t">Global validation status</span><span class="ln"></span></div>'
      +     '<div class="rstats">'
      +       '<div class="rstat"><div class="n amber">87%</div><div class="l">Generatable</div></div>'
      +       '<div class="rstat"><div class="n">23</div><div class="l">Total messages</div></div>'
      +       '<div class="rstat"><div class="n">100%</div><div class="l">Manufacturable</div></div>'
      +     '</div>'
      +     '<div class="rstat-mini">'
      +       '<span class="m"><span class="d" style="background:var(--status-error)"></span><b>2</b> Conflicts</span>'
      +       '<span class="m"><span class="d" style="background:var(--status-warning)"></span><b>8</b> Warnings</span>'
      +       '<span class="m"><span class="d" style="background:var(--status-info)"></span><b>13</b> Attention</span>'
      +     '</div>'
      +   '</section>'
      +   '<section class="rsec">'
      +     '<div class="rsec-h"><span class="num">02</span><span class="t">Status per recipe type</span><span class="ln"></span></div>'
      +     '<table class="rtable"><thead><tr><th>Recipe type</th><th>Dimension</th><th style="text-align:right">Messages</th><th>Status</th></tr></thead><tbody>'
      +       '<tr><td>Surfaces</td><td class="mono">1D</td><td class="num">8</td><td><span class="sev err"><span class="d"></span>Conflict</span></td></tr>'
      +       '<tr><td>Connections</td><td class="mono">2D</td><td class="num">12</td><td><span class="sev err"><span class="d"></span>Conflict</span></td></tr>'
      +       '<tr><td>Nodes</td><td class="mono">3D</td><td class="num">3</td><td><span class="sev warn"><span class="d"></span>Warning</span></td></tr>'
      +     '</tbody></table>'
      +   '</section>'
      +   '<div class="rfoot"><span>VBG — Virtual Building Generator · Confidential</span><span class="mono">Page 1 / 2</span></div>'
      + '</article>'
      // PAGE 2
      + '<article class="rpage">'
      +   head()
      +   '<section class="rsec" style="margin-top:24px">'
      +     '<div class="rsec-h"><span class="num">03</span><span class="t">Key messages</span><span class="ln"></span></div>'
      +     '<table class="rtable"><thead><tr><th>ID</th><th>Message</th><th>Severity</th><th>Location</th><th>Rule</th></tr></thead><tbody>'
      +       '<tr><td class="mono">M-001</td><td>Overlapping elements in node K-012</td><td><span class="sev err"><span class="d"></span>Blocking</span></td><td>Floor 2</td><td class="mono">R-204.a</td></tr>'
      +       '<tr><td class="mono">M-002</td><td>2D connection not defined at element A-024</td><td><span class="sev err"><span class="d"></span>Blocking</span></td><td>First floor</td><td class="mono">R-118.c</td></tr>'
      +       '<tr><td class="mono">M-003</td><td>1D surface has deviating dimensions</td><td><span class="sev warn"><span class="d"></span>Warning</span></td><td>Ground floor</td><td class="mono">R-217.b</td></tr>'
      +       '<tr><td class="mono">M-004</td><td>Material missing in insulation layer</td><td><span class="sev info"><span class="d"></span>Missing input</span></td><td>Wall surface A.03</td><td class="mono">R-301.a</td></tr>'
      +     '</tbody></table>'
      +   '</section>'
      +   '<section class="rsec">'
      +     '<div class="rsec-h"><span class="num">04</span><span class="t">Manufacturability</span><span class="ln"></span></div>'
      +     '<div class="rok"><span class="ic"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21.8 10A10 10 0 1 1 17 3.3"/><path d="m9 11 3 3L22 4"/></svg></span><div><div class="t">100% manufacturable — no issues</div><div class="s">All generated elements are production-ready against the active fabrication ruleset.</div></div></div>'
      +   '</section>'
      +   '<section class="rsec">'
      +     '<div class="rsec-h"><span class="num">05</span><span class="t">Sign-off</span><span class="ln"></span></div>'
      +     '<table class="rtable"><tbody>'
      +       '<tr><td style="width:40%">Validation engine</td><td class="mono">VBG core v2.4.1</td></tr>'
      +       '<tr><td>Ruleset</td><td class="mono">NL-resi-2026.1</td></tr>'
      +       '<tr><td>Author</td><td>Generated automatically</td></tr>'
      +       '<tr><td>Status</td><td><span class="sev warn"><span class="d"></span>Review required — 2 blocking</span></td></tr>'
      +     '</tbody></table>'
      +   '</section>'
      +   '<div class="rfoot"><span>VBG — Virtual Building Generator · Confidential</span><span class="mono">Page 2 / 2</span></div>'
      + '</article>';
  }

  /* ---- lazily build the dialog + snackbar host ---- */
  let scrim, win, view, pageInd, bar, finfo, snackWrap, curDoc;

  function build() {
    if (scrim) return;
    injectStyle();
    const h = host();

    snackWrap = document.createElement('div');
    snackWrap.className = 'snackwrap';
    snackWrap.id = 'vbg-snackwrap';
    snackWrap.setAttribute('aria-live', 'polite');
    h.appendChild(snackWrap);

    scrim = document.createElement('div');
    scrim.className = 'vbg-scrim';
    scrim.id = 'vbg-doc-scrim';
    scrim.innerHTML =
      '<div class="pdfwin" role="dialog" aria-modal="true" aria-label="Document preview">'
      + '<div class="pdfbar">'
      +   '<span class="fic" id="vbg-fic">' + fileSVG + '<span class="ext">PDF</span></span>'
      +   '<div class="finfo"><div class="ftitle" id="vbg-ftitle">Document</div><div class="fsub" id="vbg-fsub">PDF · 2 pages</div></div>'
      +   '<span class="spacer"></span>'
      +   '<span class="pageind" id="vbg-pageind">Page 1 of 2</span>'
      +   '<button class="pbtn" id="vbg-pdf-dl" type="button"><span class="ico">' + dlSVG + '</span>Download</button>'
      +   '<button class="pdfx" id="vbg-pdf-x" type="button" aria-label="Close preview">' + closeSVG + '</button>'
      + '</div>'
      + '<div class="pdfview" id="vbg-pdf-view"></div>'
      + '</div>';
    h.appendChild(scrim);

    win = scrim.querySelector('.pdfwin');
    view = scrim.querySelector('#vbg-pdf-view');
    pageInd = scrim.querySelector('#vbg-pageind');
    bar = scrim.querySelector('.pdfbar');
    finfo = { fic: scrim.querySelector('#vbg-fic'), title: scrim.querySelector('#vbg-ftitle'), sub: scrim.querySelector('#vbg-fsub') };

    scrim.querySelector('#vbg-pdf-x').addEventListener('click', close);
    scrim.querySelector('#vbg-pdf-dl').addEventListener('click', function () { if (curDoc) download(curDoc); });
    scrim.addEventListener('click', function (e) { if (e.target === scrim) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && scrim.classList.contains('open')) close(); });

    view.addEventListener('scroll', function () {
      const pages = view.querySelectorAll('.rpage');
      let cur = 1;
      pages.forEach(function (p, i) { if (p.offsetTop - view.offsetTop <= view.scrollTop + 90) cur = i + 1; });
      pageInd.textContent = 'Page ' + cur + ' of ' + pages.length;
    });
  }

  function open(doc) {
    build();
    curDoc = doc;
    const meta = TYPE_META[doc.type] || TYPE_META.PDF;
    finfo.fic.className = 'fic ' + meta.kind;
    finfo.fic.innerHTML = fileSVG + '<span class="ext">' + meta.ext + '</span>';
    finfo.title.textContent = doc.name + '.' + doc.type.toLowerCase();
    finfo.sub.textContent = doc.type + ' · 2 pages · ' + meta.kb + ' KB';
    view.innerHTML = reportPages(doc);
    view.scrollTop = 0;
    pageInd.textContent = 'Page 1 of 2';
    scrim.classList.add('open');
  }

  function close() { if (scrim) scrim.classList.remove('open'); }

  function dismiss(s) { s.classList.add('hide'); setTimeout(function () { s.remove(); }, 280); }

  function download(doc) {
    build();
    const meta = TYPE_META[doc.type] || TYPE_META.PDF;
    const name = doc.name;
    const totalKB = meta.kb;
    const s = document.createElement('div');
    s.className = 'snack';
    s.innerHTML =
      '<span class="sfic ' + meta.kind + '">' + fileSVG + '<span class="ext">' + meta.ext + '</span></span>' +
      '<div class="smain">' +
        '<div class="stop">' +
          '<span class="stitle">Downloading ' + esc(name) + '…</span>' +
          '<span class="scheck">' + checkSVG + '</span>' +
          '<button class="sx" type="button" aria-label="Dismiss">' + xSVG + '</button>' +
        '</div>' +
        '<div class="sbar"><i></i></div>' +
        '<div class="smeta"><span class="smeta-l">Preparing…</span><span class="spct">0%</span></div>' +
      '</div>';
    snackWrap.appendChild(s);
    requestAnimationFrame(function () { s.classList.add('show'); });

    const barI = s.querySelector('.sbar > i');
    const pctEl = s.querySelector('.spct');
    const metaEl = s.querySelector('.smeta-l');
    const titleEl = s.querySelector('.stitle');
    let pct = 0, done = false;

    const iv = setInterval(function () {
      pct += Math.random() * 13 + 7;
      if (pct >= 100) pct = 100;
      barI.style.width = pct + '%';
      pctEl.textContent = Math.round(pct) + '%';
      metaEl.textContent = Math.round(pct / 100 * totalKB) + ' KB of ' + totalKB + ' KB';
      if (pct >= 100 && !done) {
        done = true;
        clearInterval(iv);
        s.classList.add('done');
        titleEl.textContent = name + ' downloaded';
        metaEl.textContent = totalKB + ' KB · Complete';
        setTimeout(function () { dismiss(s); }, 3200);
      }
    }, 230);

    s.querySelector('.sx').addEventListener('click', function () { clearInterval(iv); dismiss(s); });
  }

  window.VBGDocViewer = { open: open, download: download };
})();
