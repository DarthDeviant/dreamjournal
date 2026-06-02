/* ═══════════════════════════════════════════════════════════════
   patch9.js  —  Dream Journal extension (v9)
   • Adds "Lucid List" menu item
   • Opens a notebook-style panel with 20 lucid dream goals
   • Top 3 are starred / marked as priority
   • Handwritten cursive heading, ruled notebook paper aesthetic
   • Integrates with existing patch4 lock/unlock encryption
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     DATA — 20 lucid dream goals, first 3 are "starred"
  ══════════════════════════════════════════════════════════ */
  const LUCID_LIST = [
    { text: 'Fly above the clouds and dive through them at full speed',        starred: true  },
    { text: 'Ask my dream self: "What do I need to know right now?"',          starred: true  },
    { text: 'Visit a version of childhood home exactly as I remember it',      starred: true  },
    { text: 'Breathe underwater in a deep bioluminescent ocean',               starred: false },
    { text: 'Conjure a door and walk into a completely unknown world',         starred: false },
    { text: 'Slow down time until everything is frozen still',                 starred: false },
    { text: 'Speak to a deceased person I miss',                               starred: false },
    { text: 'Taste the most delicious meal imaginable',                        starred: false },
    { text: 'Shapeshift into an animal and feel what it perceives',            starred: false },
    { text: 'Stand at the edge of space and look back at Earth',               starred: false },
    { text: 'Play an instrument I have never learned in waking life',          starred: false },
    { text: 'Walk through a mirror to see what is on the other side',         starred: false },
    { text: 'Summon a spirit guide and ask it three questions',                starred: false },
    { text: 'Shrink to the size of an ant and explore the grass',             starred: false },
    { text: 'Watch the Big Bang happen from the outside',                      starred: false },
    { text: 'Build an entire city from nothing using only thought',            starred: false },
    { text: 'Ride a giant creature through an ancient landscape',              starred: false },
    { text: 'Find a library that contains every book ever written',            starred: false },
    { text: 'Experience a full year inside the dream in one night',            starred: false },
    { text: 'Dissolve into pure light and feel what nothing feels like',       starred: false },
  ];

  /* ══════════════════════════════════════════════════════════
     STYLES
  ══════════════════════════════════════════════════════════ */
  const P9_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Caveat+Brush&display=swap');

#p9-panel {
  position: fixed; inset: 0;
  background: var(--paper, #0e0d0b);
  z-index: 191;
  display: none;
  flex-direction: column;
  font-family: 'IBM Plex Mono', monospace;
  overflow: hidden;
}
#p9-panel.show { display: flex; }

/* ── titlebar — matches sp-titlebar ── */
.p9-titlebar {
  background: var(--ink, #d4cfc6);
  color: var(--paper, #0e0d0b);
  padding: 5px 12px;
  font-size: 11px;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.p9-close {
  background: none;
  border: 1px solid rgba(0,0,0,.25);
  cursor: pointer;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: var(--paper-dim, #161410);
  letter-spacing: 1px;
  padding: 1px 6px;
}
.p9-close:hover { background: #c84040; color: #fff; border-color: #c84040; }

/* ── scrollable body ── */
.p9-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 32px 20px 48px;
  background: var(--paper, #0e0d0b);
}

/* ── the paper notebook itself ── */
.p9-notebook {
  width: min(640px, 100%);
  background: #f5f0e8;
  border-radius: 2px;
  box-shadow:
    0 0 0 1px #c8bfa8,
    4px 4px 0 0 #b8ad96,
    8px 8px 0 0 #a89e88,
    0 20px 60px rgba(0,0,0,.55);
  position: relative;
  overflow: hidden;
}

/* spine shadow on left */
.p9-notebook::before {
  content: '';
  position: absolute;
  top: 0; left: 0; bottom: 0;
  width: 38px;
  background: linear-gradient(to right, #c8baa0 0%, #ddd5c0 60%, transparent 100%);
  border-right: 1px solid #c0b49a;
  z-index: 2;
  pointer-events: none;
}

/* ring holes */
.p9-rings {
  position: absolute;
  top: 0; bottom: 0; left: 18px;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  padding: 28px 0;
  z-index: 3;
  pointer-events: none;
}
.p9-ring {
  width: 14px; height: 14px;
  border-radius: 50%;
  background: var(--paper, #0e0d0b);
  border: 2px solid #888070;
  box-shadow: inset 0 1px 3px rgba(0,0,0,.5), 0 1px 0 rgba(255,255,255,.1);
}

/* ── header area ── */
.p9-header {
  margin-left: 38px;
  padding: 28px 28px 12px 24px;
  border-bottom: 2px solid #c0a878;
  position: relative;
}

.p9-cursive-title {
  font-family: 'Caveat Brush', 'Caveat', cursive;
  font-size: 42px;
  color: #2a1f0e;
  line-height: 1;
  letter-spacing: -0.5px;
  display: block;
  margin-bottom: 6px;
}

.p9-cursive-sub {
  font-family: 'Caveat', cursive;
  font-size: 18px;
  color: #7a6848;
  display: block;
  font-weight: 400;
}

/* decorative ink smudge / underline */
.p9-header::after {
  content: '';
  position: absolute;
  bottom: -1px; left: 24px; right: 28px;
  height: 1px;
  background: linear-gradient(to right, #c0a878, transparent);
}

/* ── ruled lines container ── */
.p9-lines {
  margin-left: 38px;
  padding: 0 28px 28px 24px;
  background-image: repeating-linear-gradient(
    to bottom,
    transparent,
    transparent 31px,
    #cfc6b0 31px,
    #cfc6b0 32px
  );
  background-position: 0 43px;
}

/* ── individual item ── */
.p9-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-height: 32px;
  padding: 6px 0 6px 0;
  border-bottom: none;
  position: relative;
  animation: p9-fadeIn .35s ease both;
}

.p9-item:nth-child(1)  { animation-delay: .04s; }
.p9-item:nth-child(2)  { animation-delay: .08s; }
.p9-item:nth-child(3)  { animation-delay: .12s; }
.p9-item:nth-child(4)  { animation-delay: .15s; }
.p9-item:nth-child(5)  { animation-delay: .18s; }
.p9-item:nth-child(6)  { animation-delay: .21s; }
.p9-item:nth-child(7)  { animation-delay: .24s; }
.p9-item:nth-child(8)  { animation-delay: .27s; }
.p9-item:nth-child(9)  { animation-delay: .30s; }
.p9-item:nth-child(10) { animation-delay: .33s; }
.p9-item:nth-child(11) { animation-delay: .36s; }
.p9-item:nth-child(12) { animation-delay: .39s; }
.p9-item:nth-child(13) { animation-delay: .42s; }
.p9-item:nth-child(14) { animation-delay: .45s; }
.p9-item:nth-child(15) { animation-delay: .48s; }
.p9-item:nth-child(16) { animation-delay: .50s; }
.p9-item:nth-child(17) { animation-delay: .52s; }
.p9-item:nth-child(18) { animation-delay: .54s; }
.p9-item:nth-child(19) { animation-delay: .56s; }
.p9-item:nth-child(20) { animation-delay: .58s; }

@keyframes p9-fadeIn {
  from { opacity: 0; transform: translateX(-6px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* number */
.p9-num {
  font-family: 'Caveat', cursive;
  font-size: 15px;
  color: #a89060;
  flex-shrink: 0;
  width: 22px;
  text-align: right;
  padding-top: 2px;
  user-select: none;
}

/* star / priority marker */
.p9-star {
  flex-shrink: 0;
  width: 18px;
  text-align: center;
  padding-top: 1px;
  font-size: 14px;
  user-select: none;
  line-height: 1.5;
}
.p9-star.starred  { color: #c87820; filter: drop-shadow(0 0 3px #c8782055); }
.p9-star.unstarred { color: transparent; }

/* text */
.p9-text {
  font-family: 'Caveat', cursive;
  font-size: 19px;
  color: #1a1208;
  line-height: 1.65;
  flex: 1;
  letter-spacing: 0.2px;
}

/* starred items get an ink-highlight behind them */
.p9-item.is-starred .p9-text {
  color: #0e0a04;
  font-weight: 600;
}
.p9-item.is-starred {
  background: linear-gradient(to right, #f5e8c855, transparent 90%);
  border-radius: 2px;
}

/* faint watermark in bottom right */
.p9-watermark {
  font-family: 'Caveat', cursive;
  font-size: 11px;
  color: #c8bc9a;
  text-align: right;
  padding: 0 28px 16px;
  margin-left: 38px;
  letter-spacing: 1px;
}

/* legend */
.p9-legend {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 38px;
  padding: 10px 24px 0;
  font-family: 'Caveat', cursive;
  font-size: 14px;
  color: #9a8860;
  border-top: 1px dashed #cfc6b0;
}
`;

  (function injectStyles() {
    const s = document.createElement('style');
    s.id = 'p9-styles';
    s.textContent = P9_CSS;
    document.head.appendChild(s);
  })();

  /* ══════════════════════════════════════════════════════════
     BUILD PANEL
  ══════════════════════════════════════════════════════════ */
  function buildPanel() {
    if (document.getElementById('p9-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'p9-panel';

    /* titlebar */
    panel.innerHTML = `
      <div class="p9-titlebar">
        <span>DREAM_JOURNAL.EXE — Lucid Bucket List</span>
        <button class="p9-close" id="p9-close">[ close ]</button>
      </div>
      <div class="p9-body">
        <div class="p9-notebook">

          <!-- binding rings -->
          <div class="p9-rings">
            ${Array(9).fill('<div class="p9-ring"></div>').join('')}
          </div>

          <!-- header -->
          <div class="p9-header">
            <span class="p9-cursive-title">things to do lucid</span>
            <span class="p9-cursive-sub">if I ever get the chance ✦</span>
          </div>

          <!-- legend -->
          <div class="p9-legend">
            <span style="color:#c87820;font-size:16px">★</span>
            <span>= most important</span>
          </div>

          <!-- ruled list -->
          <div class="p9-lines" id="p9-lines"></div>

          <!-- watermark -->
          <div class="p9-watermark">consciousness archive · lucid log</div>
        </div>
      </div>`;

    document.body.appendChild(panel);

    /* populate list */
    const linesEl = document.getElementById('p9-lines');
    LUCID_LIST.forEach((item, i) => {
      const row = document.createElement('div');
      row.className = 'p9-item' + (item.starred ? ' is-starred' : '');

      row.innerHTML = `
        <span class="p9-num">${i + 1}.</span>
        <span class="p9-star ${item.starred ? 'starred' : 'unstarred'}">${item.starred ? '★' : '☆'}</span>
        <span class="p9-text">${item.text}</span>`;

      linesEl.appendChild(row);
    });

    /* close button */
    document.getElementById('p9-close').addEventListener('click', closePanel);

    /* ESC closes */
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && panel.classList.contains('show')) closePanel();
    });
  }

  function openPanel() {
    if (!document.getElementById('p9-panel')) buildPanel();
    document.getElementById('p9-panel').classList.add('show');
  }

  function closePanel() {
    document.getElementById('p9-panel')?.classList.remove('show');
  }

  /* ══════════════════════════════════════════════════════════
     INJECT MENU ITEM — "Lucid List" after Stats
  ══════════════════════════════════════════════════════════ */
  function injectMenuButton() {
    if (document.getElementById('menu-lucid')) return;

    /* Try to insert after #menu-stats, otherwise after #menu-export */
    const anchor =
      document.getElementById('menu-stats') ||
      document.getElementById('menu-export');
    if (!anchor) return;

    const btn = document.createElement('span');
    btn.className = 'menu-item';
    btn.id = 'menu-lucid';
    btn.innerHTML = '<span class="ul">L</span>ucid List';
    btn.addEventListener('click', openPanel);

    anchor.parentNode.insertBefore(btn, anchor.nextSibling);
  }

  /* ══════════════════════════════════════════════════════════
     PATCH4 INTEGRATION — encrypt "Lucid List" text when locked
  ══════════════════════════════════════════════════════════ */
  function hookPatch4() {
    const dot = document.getElementById('lock-dot');
    if (!dot || dot.__p9hooked) return;
    dot.__p9hooked = true;

    const btn = () => document.getElementById('menu-lucid');

    new MutationObserver(() => {
      const isOn = dot.classList.contains('on');
      const el = btn();
      if (!el) return;
      if (!isOn) {
        // locked — scramble the label the same simple way patch4 does
        el.textContent = p9Scramble('Lucid List');
      } else {
        el.innerHTML = '<span class="ul">L</span>ucid List';
      }
    }).observe(dot, { attributes: true, attributeFilter: ['class'] });
  }

  const P9_GL = '░▒▓▄▀■□~*+=#@&?!./|:ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz0123456789';
  function p9Scramble(text) {
    let h = 2166136261 >>> 0;
    for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    let s = h || 1337;
    const r = () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 4294967295; };
    return [...text].map(ch => ch === ' ' ? ch : P9_GL[Math.floor(r() * P9_GL.length)]).join('');
  }

  /* ══════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', () => {
    [0, 300, 700, 1400].forEach(ms => setTimeout(() => {
      injectMenuButton();
      hookPatch4();
    }, ms));
  });

  console.log('[patch9] v9 ✓  — lucid bucket list panel active');
})();
