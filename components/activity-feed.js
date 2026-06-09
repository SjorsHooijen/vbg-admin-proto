/* ============================================================
   VBG — reusable activity feed web component
   Usage:  <vbg-activity-feed></vbg-activity-feed>
           <vbg-activity-feed limit="6"></vbg-activity-feed>

   Shows recent activity from members of the user's tenant —
   who did what, on which project / rule, and when.
   Renders into LIGHT DOM so screenshots / PDF / PPTX capture it.
   Styles scoped under `vbg-activity-feed`, injected once.
   ============================================================ */
(function () {
  // type → colour of the verb + timeline node
  const TYPE = {
    generated: { color: 'var(--status-generated)', fg: 'var(--status-generated-fg)' },
    analysis:  { color: 'var(--status-info)',      fg: 'var(--status-info-fg)' },
    clash:     { color: 'var(--status-success)',   fg: 'var(--status-success-fg)' },
    validated: { color: 'var(--status-validated)', fg: 'var(--status-validated-fg)' },
    rule:      { color: 'var(--status-warning)',   fg: 'var(--status-warning-fg)' },
    created:   { color: 'var(--status-pending)',   fg: 'var(--status-pending-fg)' }
  };

  // tenant members + their actions, newest first
  const ACTIVITY = [
    { who: 'Sanne Koenders', me: true, type: 'generated', verb: 'generated 48 columns in', target: 'Project Alpha',         ref: 'VBG-04-NC', time: '2 min ago' },
    { who: 'Mees Jansen',    type: 'analysis',  verb: 'ran structural analysis on', target: 'Havenkwartier Block C', ref: 'VBG-07-HK', time: '12 min ago' },
    { who: 'Lotte de Boer',  type: 'clash',     verb: 'resolved a clash in',        target: 'Maaspoort North Core',  ref: 'VBG-09-MP', time: '38 min ago' },
    { who: 'Daan Visser',    type: 'validated', verb: 'validated',                  target: 'Westkade Towers',       ref: 'VBG-11-WK', time: '1 h ago' },
    { who: 'Femke Bakker',   type: 'rule',      verb: 'updated rule',               target: null,                    ref: 'R-217.b',   time: '3 h ago' },
    { who: 'Sanne Koenders', me: true, type: 'created', verb: 'created project',     target: 'Binckhorst Mixed-Use',  ref: 'VBG-15-BH', time: 'Yesterday' }
  ];

  const STYLE = `
    vbg-activity-feed { display: block; padding: 8px 0; }
    vbg-activity-feed .feed { position: relative; padding: 0 20px; }
    vbg-activity-feed .item {
      position: relative; display: flex; gap: 14px;
      padding: 14px 0;
    }
    vbg-activity-feed .item:not(:last-child)::before {
      content: ""; position: absolute; left: 16px; top: 46px; bottom: -14px;
      width: 1px; background: var(--border-subtle);
    }
    vbg-activity-feed .av {
      width: 33px; height: 33px; flex: 0 0 33px; border-radius: var(--r-full);
      display: grid; place-items: center; z-index: 1;
      font: var(--text-label); font-weight: 600; letter-spacing: 0.01em;
      background: var(--slate-150); color: var(--slate-600);
      border: 2px solid var(--bg-surface);
    }
    vbg-activity-feed .av.me { background: var(--vbg-amber); color: var(--fg-inverse); }
    vbg-activity-feed .body { min-width: 0; padding-top: 1px; }
    vbg-activity-feed .text { font: var(--text-sm); color: var(--fg2); text-wrap: pretty; }
    vbg-activity-feed .text b { font-weight: 600; color: var(--fg1); }
    vbg-activity-feed .text .verb { color: var(--fg2); }
    vbg-activity-feed .text .target { color: var(--fg1); font-weight: 500; }
    vbg-activity-feed .text .ref {
      font: var(--text-mono-sm); color: var(--fg3);
      background: var(--bg-sunken); border: 1px solid var(--border-subtle);
      border-radius: var(--r-xs); padding: 0 5px; white-space: nowrap;
    }
    vbg-activity-feed .meta {
      display: flex; align-items: center; gap: 7px; margin-top: 5px;
      font: var(--text-caption); color: var(--fg4);
    }
    vbg-activity-feed .meta .dot { width: 6px; height: 6px; border-radius: var(--r-full); }
    vbg-activity-feed .meta .kind { color: var(--fg3); }
  `;

  function injectStyle() {
    if (document.getElementById('vbg-activity-feed-style')) return;
    const s = document.createElement('style');
    s.id = 'vbg-activity-feed-style';
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  const KIND_LABEL = {
    generated: 'Generated', analysis: 'Analysis', clash: 'Clash resolved',
    validated: 'Validated', rule: 'Rule', created: 'Created'
  };

  function initials(name) {
    return name.split(' ').map(function (p) { return p[0]; }).join('').slice(0, 2).toUpperCase();
  }

  function itemHtml(a) {
    const t = TYPE[a.type] || TYPE.created;
    const targetPart = a.target
      ? ' <span class="target">' + a.target + '</span> <span class="ref">' + a.ref + '</span>'
      : ' <span class="ref">' + a.ref + '</span>';
    return ''
      + '<div class="item">'
      +   '<div class="av' + (a.me ? ' me' : '') + '">' + initials(a.who) + '</div>'
      +   '<div class="body">'
      +     '<div class="text"><b>' + a.who + '</b> <span class="verb">' + a.verb + '</span>' + targetPart + '</div>'
      +     '<div class="meta">'
      +       '<span class="dot" style="background:' + t.color + '"></span>'
      +       '<span class="kind">' + (KIND_LABEL[a.type] || '') + '</span>'
      +       '<span>·</span>'
      +       '<span>' + a.time + '</span>'
      +     '</div>'
      +   '</div>'
      + '</div>';
  }

  class VbgActivityFeed extends HTMLElement {
    static get observedAttributes() { return ['limit']; }
    connectedCallback() { injectStyle(); this.render(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }
    render() {
      const limit = parseInt(this.getAttribute('limit'), 10);
      const list = isNaN(limit) ? ACTIVITY : ACTIVITY.slice(0, limit);
      this.innerHTML = '<div class="feed">' + list.map(itemHtml).join('') + '</div>';
    }
  }

  if (!customElements.get('vbg-activity-feed')) {
    customElements.define('vbg-activity-feed', VbgActivityFeed);
  }
})();
