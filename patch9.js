/* ═══════════════════════════════════════════════════════════════
   patch9.js  —  Dream Journal extension (v9)
   • Lucid Bucket List notebook panel (20 goals, top 3 starred)
   • File menu item gets a dropdown: Export + Lucid List
   • #menu-export hidden (proxied through File > Export)
   • Desktop: notebook stretches full landscape (2-col grid)
   • Mobile: single column portrait
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     DATA
  ══════════════════════════════════════════════════════════ */
  const LUCID_LIST = [
    { text: 'Fly above the clouds and dive through them at full speed',      starred: true  },
    { text: 'Ask my dream self: "What do I need to know right now?"',        starred: true  },
    { text: 'Visit a version of childhood home exactly as I remember it',    starred: true  },
    { text: 'Breathe underwater in a deep bioluminescent ocean',             starred: false },
    { text: 'Conjure a door and walk into a completely unknown world',       starred: false },
    { text: 'Slow down time until everything is frozen still',               starred: false },
    { text: 'Speak to a deceased person I miss',                             starred: false },
    { text: 'Taste the most delicious meal imaginable',                      starred: false },
    { text: 'Shapeshift into an animal and feel what it perceives',          starred: false },
    { text: 'Stand at the edge of space and look back at Earth',             starred: false },
    { text: 'Play an instrument I have never learned in waking life',        starred: false },
    { text: 'Walk through a mirror to see what is on the other side',       starred: false },
    { text: 'Summon a spirit guide and ask it three questions',              starred: false },
    { text: 'Shrink to the size of an ant and explore the grass',           starred: false },
    { text: 'Watch the Big Bang happen from the outside',                    starred: false },
    { text: 'Build an entire city from nothing using only thought',          starred: false },
    { text: 'Ride a giant creature through an ancient landscape',            starred: false },
    { text: 'Find a library that contains every book ever written',          starred: false },
    { text: 'Experience a full year inside the dream in one night',          starred: false },
    { text: 'Dissolve into pure light and feel what nothing feels like',     starred: false },
  ];

  /* ══════════════════════════════════════════════════════════
     STYLES
  ══════════════════════════════════════════════════════════ */
  const P9_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Caveat+Brush&display=swap');

/* ── File dropdown ── */
#p9-file-wrap {
  position: relative;
  display: inline-flex;
  align-items: stretch;
}
#p9-file-trigger {
  color: var(--ink-mid);
  cursor: pointer;
  padding: 4px 10px;
  letter-spacing: 0.5px;
  white-space: nowrap;
  flex-shrink: 0;
  font-size: 11px;
  display: flex;
  align-items: center;
  border-right: 1px solid var(--rule);
  border-left: 1px solid var(--rule);
  font-family: 'IBM Plex Mono', monospace;
  user-select: none;
  transition: background 0.1s, color 0.1s;
}
#p9-file-trigger:hover,
#p9-file-wrap.open #p9-file-trigger {
  background: var(--ink);
  color: var(--paper);
}
#p9-dropdown {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 170px;
  background: var(--paper-dim);
  border: 1px solid var(--rule-dark);
  border-top: 2px solid var(--ink);
  z-index: 500;
  box-shadow: 3px 3px 0 rgba(0,0,0,.5);
}
#p9-file-wrap.open #p9-dropdown { display: block; }
.p9-dd-item {
  display: block;
  width: 100%;
  padding: 7px 14px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.5px;
  color: var(--ink-soft);
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  box-sizing: border-box;
  border-bottom: 1px solid var(--rule);
}
.p9-dd-item:last-child { border-bottom: none; }
.p9-dd-item:hover {
  background: var(--ink);
  color: var(--paper);
}

/* ── Panel ── */
#p9-panel {
  position: fixed; inset: 0;
  background: var(--paper);
  z-index: 191;
  display: none;
  flex-direction: column;
  font-family: 'IBM Plex Mono', monospace;
  overflow: hidden;
}
#p9-panel.show { display: flex; }

.p9-titlebar {
  background: var(--ink);
  color: var(--paper);
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
  border: 1px solid rgba(0,0,0,.3);
  cursor: pointer;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: var(--paper-dim);
  letter-spacing: 1px;
  padding: 1px 6px;
}
.p9-close:hover { background: #c84040; color: #fff; border-color: #c84040; }

/* ── Body ── */
.p9-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 24px;
  background: var(--paper);
}

/* ── Notebook: desktop full landscape ── */
.p9-notebook {
  width: 100%;
  max-width: 1400px;
  background: #f5f0e8;
  border-radius: 2px;
  box-shadow:
    0 0 0 1px #c8bfa8,
    4px 4px 0 0 #b8ad96,
    8px 8px 0 0 #a89e88,
    0 24px 80px rgba(0,0,0,.65);
  display: grid;
  grid-template-columns: 44px 1fr;
  grid-template-rows: auto 1fr auto;
  overflow: hidden;
}

/* spine */
.p9-spine {
  grid-column: 1;
  grid-row: 1 / -1;
  background: linear-gradient(to right, #bfae90 0%, #d4c8a8 60%, #e4dcc8 100%);
  border-right: 1px solid #b8a880;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  align-items: center;
  padding: 28px 0;
}
.p9-ring {
  width: 14px; height: 14px;
  border-radius: 50%;
  background: var(--paper, #0e0d0b);
  border: 2px solid #807060;
  box-shadow: inset 0 1px 3px rgba(0,0,0,.6), 0 1px 0 rgba(255,255,255,.15);
  flex-shrink: 0;
}

/* header */
.p9-header {
  grid-column: 2;
  grid-row: 1;
  padding: 26px 40px 14px 28px;
  border-bottom: 2px solid #c0a870;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}
.p9-cursive-title {
  font-family: 'Caveat Brush', 'Caveat', cursive;
  font-size: 52px;
  color: #1e1508;
  line-height: 1;
  display: block;
  margin-bottom: 4px;
}
.p9-cursive-sub {
  font-family: 'Caveat', cursive;
  font-size: 21px;
  color: #7a6848;
  display: block;
  font-weight: 400;
}
.p9-legend {
  font-family: 'Caveat', cursive;
  font-size: 16px;
  color: #8a7850;
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  padding-bottom: 4px;
}
.p9-legend-star { color: #c07010; font-size: 18px; }

/* ruled list — 2 col on desktop */
.p9-lines {
  grid-column: 2;
  grid-row: 2;
  padding: 0 40px 20px 28px;
  background-image: repeating-linear-gradient(
    to bottom,
    transparent,
    transparent 31px,
    #ccc4a8 31px,
    #ccc4a8 32px
  );
  background-position: 0 38px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 40px;
  align-content: start;
}

/* watermark */
.p9-watermark {
  grid-column: 2;
  grid-row: 3;
  font-family: 'Caveat', cursive;
  font-size: 12px;
  color: #c0b490;
  text-align: right;
  padding: 6px 40px 18px 0;
  letter-spacing: 1px;
  border-top: 1px dashed #ccc4a8;
}

/* items */
.p9-item {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  min-height: 32px;
  padding: 5px 0;
  animation: p9-in .32s ease both;
}
${Array.from({length:20},(_,i)=>`.p9-item:nth-child(${i+1}){animation-delay:${(.05+i*.04).toFixed(2)}s}`).join('\n')}
@keyframes p9-in {
  from { opacity:0; transform:translateX(-6px); }
  to   { opacity:1; transform:none; }
}
.p9-num {
  font-family: 'Caveat', cursive;
  font-size: 14px; color: #a88848;
  flex-shrink: 0; width: 22px;
  text-align: right; padding-top: 3px;
  user-select: none;
}
.p9-star {
  flex-shrink: 0; width: 16px;
  font-size: 14px; user-select: none;
  line-height: 1.65;
}
.p9-star.on  { color: #c07010; filter: drop-shadow(0 0 3px #c0701055); }
.p9-star.off { color: #d8d0b8; }
.p9-text {
  font-family: 'Caveat', cursive;
  font-size: 19px; color: #1a1208;
  line-height: 1.65; flex: 1;
}
.p9-item.pri { background: linear-gradient(to right, #f0e4b855, transparent 92%); border-radius: 2px; }
.p9-item.pri .p9-text { font-weight: 600; color: #0e0804; }

/* ── Mobile: portrait single col ── */
@media (max-width: 700px) {
  .p9-body { padding: 0; align-items: flex-start; }
  .p9-notebook {
    max-width: 100%; border-radius: 0;
    box-shadow: none;
    grid-template-columns: 30px 1fr;
    min-height: 100%;
  }
  .p9-spine { padding: 20px 0; }
  .p9-ring { width: 11px; height: 11px; }
  .p9-header {
    flex-direction: column; align-items: flex-start;
    gap: 6px; padding: 18px 16px 12px 16px;
  }
  .p9-cursive-title { font-size: 38px; }
  .p9-cursive-sub   { font-size: 18px; }
  .p9-lines {
    grid-template-columns: 1fr;
    padding: 0 16px 20px 14px;
    gap: 0;
  }
  .p9-watermark { padding: 6px 16px 16px 0; }
  .p9-text { font-size: 17px; }
}
`;

  (function injectStyles() {
    if (document.getElementById('p9-styles')) return;
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
    const rings = Array(9).fill('<div class="p9-ring"></div>').join('');
    const rows  = LUCID_LIST.map((item, i) =>
      `<div class="p9-item${item.starred ? ' pri' : ''}">
        <span class="p9-num">${i + 1}.</span>
        <span class="p9-star ${item.starred ? 'on' : 'off'}">${item.starred ? '★' : '☆'}</span>
        <span class="p9-text">${item.text}</span>
      </div>`
    ).join('');

    const panel = document.createElement('div');
    panel.id = 'p9-panel';
    panel.innerHTML = `
      <div class="p9-titlebar">
        <span>DREAM_JOURNAL.EXE — Lucid Bucket List</span>
        <button class="p9-close" id="p9-close">[ close ]</button>
      </div>
      <div class="p9-body">
        <div class="p9-notebook">
          <div class="p9-spine">${rings}</div>
          <div class="p9-header">
            <div>
              <span class="p9-cursive-title">things to do lucid</span>
              <span class="p9-cursive-sub">if I ever get the chance ✦</span>
            </div>
            <div class="p9-legend">
              <span class="p9-legend-star">★</span>
              <span>= most important</span>
            </div>
          </div>
          <div class="p9-lines">${rows}</div>
          <div class="p9-watermark">consciousness archive · lucid log</div>
        </div>
      </div>`;
    document.body.appendChild(panel);

    document.getElementById('p9-close').addEventListener('click', closePanel);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && panel.classList.contains('show')) closePanel();
    });
  }

  function openPanel()  {
    if (!document.getElementById('p9-panel')) buildPanel();
    document.getElementById('p9-panel').classList.add('show');
  }
  function closePanel() {
    document.getElementById('p9-panel')?.classList.remove('show');
  }

  /* ══════════════════════════════════════════════════════════
     FILE DROPDOWN
     The HTML has: <span class="menu-item"><span class="ul">F</span>ile</span>
     — first .menu-item in #menubar, no id.
     Strategy: replace it in-place with our wrapper div.
  ══════════════════════════════════════════════════════════ */
  function buildFileDropdown() {
    if (document.getElementById('p9-file-wrap')) return;

    const menubar = document.getElementById('menubar');
    if (!menubar) return;

    // The File item is the very first .menu-item child
    const fileItem = menubar.querySelector('.menu-item');
    if (!fileItem) return;

    // Build the wrapper
    const wrap = document.createElement('div');
    wrap.id = 'p9-file-wrap';

    // Trigger button — visually identical to a menu-item
    const trigger = document.createElement('div');
    trigger.id = 'p9-file-trigger';
    trigger.innerHTML = '<span style="text-decoration:underline">F</span>ile';

    // Dropdown
    const dropdown = document.createElement('div');
    dropdown.id = 'p9-dropdown';

    const exportBtn = document.createElement('button');
    exportBtn.className = 'p9-dd-item';
    exportBtn.innerHTML = 'E<span style="text-decoration:underline">x</span>port';
    exportBtn.addEventListener('click', () => {
      closeDropdown();
      // Call the app's own export function directly
      if (typeof window.exportJSON === 'function') {
        window.exportJSON();
      } else {
        // fallback: click the hidden original export item
        document.getElementById('menu-export')?.click();
      }
    });

    const lucidBtn = document.createElement('button');
    lucidBtn.className = 'p9-dd-item';
    lucidBtn.id = 'p9-lucid-btn';
    lucidBtn.innerHTML = '<span style="text-decoration:underline">L</span>ucid List';
    lucidBtn.addEventListener('click', () => {
      closeDropdown();
      openPanel();
    });

    dropdown.appendChild(exportBtn);
    dropdown.appendChild(lucidBtn);
    wrap.appendChild(trigger);
    wrap.appendChild(dropdown);

    // Swap: insert wrapper before the original File item, then hide original
    menubar.insertBefore(wrap, fileItem);
    fileItem.style.display = 'none';

    // Also hide the standalone Export menu item
    const menuExport = document.getElementById('menu-export');
    if (menuExport) menuExport.style.display = 'none';

    // Toggle dropdown on trigger click
    trigger.addEventListener('click', e => {
      e.stopPropagation();
      wrap.classList.toggle('open');
    });

    // Close on any outside click
    document.addEventListener('click', () => closeDropdown());
  }

  function closeDropdown() {
    document.getElementById('p9-file-wrap')?.classList.remove('open');
  }

  /* ══════════════════════════════════════════════════════════
     PATCH4 INTEGRATION
  ══════════════════════════════════════════════════════════ */
  const P9_GL = '░▒▓▄▀■□~*+=#@&?!./|:ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz0123456789';
  function p9Scramble(text) {
    let h = 2166136261 >>> 0;
    for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    let s = h || 1337;
    const r = () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 4294967295; };
    return [...text].map(ch => ch === ' ' ? ch : P9_GL[Math.floor(r() * P9_GL.length)]).join('');
  }

  function hookPatch4() {
    const dot = document.getElementById('lock-dot');
    if (!dot || dot.__p9hooked) return;
    dot.__p9hooked = true;
    new MutationObserver(() => {
      const isOn = dot.classList.contains('on');
      const btn = document.getElementById('p9-lucid-btn');
      if (btn) btn.textContent = isOn ? 'Lucid List' : p9Scramble('Lucid List');
      const trig = document.getElementById('p9-file-trigger');
      if (trig) trig.innerHTML = isOn
        ? '<span style="text-decoration:underline">F</span>ile'
        : p9Scramble('File');
    }).observe(dot, { attributes: true, attributeFilter: ['class'] });
  }

  /* ══════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', () => {
    // Run immediately and retry to handle patch ordering
    [0, 200, 500, 1000].forEach(ms => setTimeout(() => {
      buildFileDropdown();
      hookPatch4();
    }, ms));
  });

  console.log('[patch9] v9 ✓  — lucid list + file dropdown active');
})();
