/* ═══════════════════════════════════════════════════════════════
   patch9.js  —  Dream Journal extension (v9)
   • Lucid Bucket List notebook panel (20 goals, top 3 starred)
   • File menu gets a dropdown: Export + Lucid List
   • Standalone #menu-export hidden (lives inside File dropdown now)
   • Desktop: notebook stretches full landscape
   • Mobile: notebook is portrait-scrollable
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

/* ── File dropdown menu ── */
#p9-file-menu {
  position: relative;
  display: inline-block;
}
#p9-file-menu .menu-item {
  cursor: pointer;
  user-select: none;
}
#p9-file-menu .menu-item.active {
  background: var(--ink, #d4cfc6);
  color: var(--paper, #0e0d0b);
}
#p9-dropdown {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 160px;
  background: var(--paper-dim, #161410);
  border: 1px solid var(--rule-dark, #3a3630);
  border-top: none;
  z-index: 999;
  box-shadow: 4px 4px 0 rgba(0,0,0,.4);
}
#p9-file-menu.open #p9-dropdown { display: block; }
.p9-dd-item {
  display: block;
  width: 100%;
  padding: 6px 14px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  letter-spacing: .5px;
  color: var(--ink-soft, #7a7268);
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  box-sizing: border-box;
}
.p9-dd-item:hover {
  background: var(--ink, #d4cfc6);
  color: var(--paper, #0e0d0b);
}
.p9-dd-sep {
  height: 1px;
  background: var(--rule-dark, #3a3630);
  margin: 2px 0;
}

/* ── Panel overlay ── */
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

/* ── Body: centres the notebook ── */
.p9-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  align-items: stretch;        /* stretch on desktop */
  justify-content: center;
  padding: 24px;
  background: var(--paper, #0e0d0b);
}

/* ── Desktop: full landscape stretch ── */
.p9-notebook {
  width: 100%;
  max-width: 1200px;
  background: #f5f0e8;
  border-radius: 2px;
  box-shadow:
    0 0 0 1px #c8bfa8,
    4px 4px 0 0 #b8ad96,
    8px 8px 0 0 #a89e88,
    0 20px 80px rgba(0,0,0,.6);
  position: relative;
  overflow: hidden;
  display: grid;
  /* spine | header+list */
  grid-template-columns: 48px 1fr;
  grid-template-rows: auto 1fr auto;
}

/* spine column */
.p9-spine {
  grid-column: 1;
  grid-row: 1 / -1;
  background: linear-gradient(to right, #c0b090 0%, #d8cdb0 65%, #e8e0cc 100%);
  border-right: 1px solid #b8a888;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  align-items: center;
  padding: 24px 0;
}
.p9-ring {
  width: 14px; height: 14px;
  border-radius: 50%;
  background: var(--paper, #0e0d0b);
  border: 2px solid #888070;
  box-shadow: inset 0 1px 3px rgba(0,0,0,.5), 0 1px 0 rgba(255,255,255,.1);
  flex-shrink: 0;
}

/* header */
.p9-header {
  grid-column: 2;
  grid-row: 1;
  padding: 28px 36px 14px 28px;
  border-bottom: 2px solid #c0a878;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
}
.p9-header-left {}
.p9-cursive-title {
  font-family: 'Caveat Brush', 'Caveat', cursive;
  font-size: 48px;
  color: #2a1f0e;
  line-height: 1;
  display: block;
  margin-bottom: 4px;
}
.p9-cursive-sub {
  font-family: 'Caveat', cursive;
  font-size: 20px;
  color: #7a6848;
  display: block;
  font-weight: 400;
}
.p9-legend {
  font-family: 'Caveat', cursive;
  font-size: 15px;
  color: #9a8860;
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  padding-bottom: 4px;
}
.p9-legend-star { color: #c87820; font-size: 17px; }

/* ruled list area */
.p9-lines {
  grid-column: 2;
  grid-row: 2;
  padding: 4px 36px 20px 28px;
  background-image: repeating-linear-gradient(
    to bottom,
    transparent,
    transparent 31px,
    #cfc6b0 31px,
    #cfc6b0 32px
  );
  background-position: 0 40px;

  /* desktop: two-column grid for landscape use */
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 32px;
  align-content: start;
}

/* watermark */
.p9-watermark {
  grid-column: 2;
  grid-row: 3;
  font-family: 'Caveat', cursive;
  font-size: 11px;
  color: #c8bc9a;
  text-align: right;
  padding: 6px 36px 18px 0;
  letter-spacing: 1px;
}

/* ── individual item ── */
.p9-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-height: 32px;
  padding: 5px 0;
  animation: p9-fadeIn .3s ease both;
}
${Array.from({length:20},(_,i)=>`.p9-item:nth-child(${i+1}){animation-delay:${(i*0.04+0.04).toFixed(2)}s}`).join('\n')}

@keyframes p9-fadeIn {
  from { opacity: 0; transform: translateX(-5px); }
  to   { opacity: 1; transform: translateX(0); }
}
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
.p9-star {
  flex-shrink: 0;
  width: 16px;
  font-size: 14px;
  user-select: none;
  line-height: 1.6;
}
.p9-star.starred   { color: #c87820; filter: drop-shadow(0 0 3px #c8782066); }
.p9-star.unstarred { color: #d8d0bc; }
.p9-text {
  font-family: 'Caveat', cursive;
  font-size: 18px;
  color: #1a1208;
  line-height: 1.65;
  flex: 1;
}
.p9-item.is-starred {
  background: linear-gradient(to right, #f5e8c870, transparent 95%);
  border-radius: 2px;
}
.p9-item.is-starred .p9-text {
  font-weight: 600;
  color: #0e0a04;
}

/* ══ MOBILE — portrait, single column ══ */
@media (max-width: 700px) {
  .p9-body {
    padding: 0;
    align-items: flex-start;
  }
  .p9-notebook {
    max-width: 100%;
    border-radius: 0;
    box-shadow: none;
    grid-template-columns: 32px 1fr;
    min-height: 100%;
  }
  .p9-ring { width: 11px; height: 11px; }
  .p9-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 20px 18px 12px 18px;
  }
  .p9-cursive-title { font-size: 36px; }
  .p9-cursive-sub   { font-size: 17px; }
  .p9-lines {
    grid-template-columns: 1fr;   /* single column on mobile */
    padding: 4px 18px 20px 16px;
    gap: 0;
  }
  .p9-watermark { padding: 6px 18px 16px 0; }
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

    const panel = document.createElement('div');
    panel.id = 'p9-panel';

    // 9 rings
    const rings = Array(9).fill('<div class="p9-ring"></div>').join('');

    // list rows
    const rows = LUCID_LIST.map((item, i) => `
      <div class="p9-item${item.starred ? ' is-starred' : ''}">
        <span class="p9-num">${i + 1}.</span>
        <span class="p9-star ${item.starred ? 'starred' : 'unstarred'}">${item.starred ? '★' : '☆'}</span>
        <span class="p9-text">${item.text}</span>
      </div>`).join('');

    panel.innerHTML = `
      <div class="p9-titlebar">
        <span>DREAM_JOURNAL.EXE — Lucid Bucket List</span>
        <button class="p9-close" id="p9-close">[ close ]</button>
      </div>
      <div class="p9-body">
        <div class="p9-notebook">
          <div class="p9-spine">${rings}</div>
          <div class="p9-header">
            <div class="p9-header-left">
              <span class="p9-cursive-title">things to do lucid</span>
              <span class="p9-cursive-sub">if I ever get the chance ✦</span>
            </div>
            <div class="p9-legend">
              <span class="p9-legend-star">★</span>
              <span>= most important</span>
            </div>
          </div>
          <div class="p9-lines" id="p9-lines">${rows}</div>
          <div class="p9-watermark">consciousness archive · lucid log</div>
        </div>
      </div>`;

    document.body.appendChild(panel);

    document.getElementById('p9-close').addEventListener('click', closePanel);
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
     FILE DROPDOWN — wraps existing "File" menu item
     Structure added:
       <span id="p9-file-menu" class="menu-item-wrapper">
         <span class="menu-item" id="menu-file-trigger">File</span>
         <div id="p9-dropdown">
           <button>Export</button>
           <div class="p9-dd-sep"></div>
           <button>Lucid List</button>
         </div>
       </span>
  ══════════════════════════════════════════════════════════ */
  function buildFileDropdown() {
    if (document.getElementById('p9-file-menu')) return;

    // Find the File menu item — it's the first .menu-item in #menubar
    const menubar = document.getElementById('menubar');
    if (!menubar) return;

    const fileItem = Array.from(menubar.querySelectorAll('.menu-item'))
      .find(el => el.textContent.trim().replace(/\s+/g,'').toLowerCase().startsWith('file'));
    if (!fileItem) return;

    const exportItem = document.getElementById('menu-export');

    // Wrap the File label in a dropdown container
    const wrapper = document.createElement('span');
    wrapper.id = 'p9-file-menu';
    wrapper.style.cssText = 'position:relative;display:inline-block;';

    fileItem.parentNode.insertBefore(wrapper, fileItem);
    wrapper.appendChild(fileItem);

    // Make it show active when open
    const trigger = fileItem;

    // Build dropdown
    const dropdown = document.createElement('div');
    dropdown.id = 'p9-dropdown';

    // Export button — calls the original export handler
    const exportBtn = document.createElement('button');
    exportBtn.className = 'p9-dd-item';
    exportBtn.textContent = 'Export';
    exportBtn.addEventListener('click', () => {
      closeDropdown();
      // Delegate to the real export: try clicking hidden #menu-export,
      // or call window.exportEntries if it exists
      if (exportItem) {
        exportItem.click();
      } else if (typeof window.exportEntries === 'function') {
        window.exportEntries();
      }
    });

    const sep = document.createElement('div');
    sep.className = 'p9-dd-sep';

    const lucidBtn = document.createElement('button');
    lucidBtn.className = 'p9-dd-item';
    lucidBtn.id = 'p9-lucid-btn';
    lucidBtn.textContent = 'Lucid List';
    lucidBtn.addEventListener('click', () => {
      closeDropdown();
      openPanel();
    });

    dropdown.appendChild(exportBtn);
    dropdown.appendChild(sep);
    dropdown.appendChild(lucidBtn);
    wrapper.appendChild(dropdown);

    // Toggle on File click
    trigger.addEventListener('click', e => {
      e.stopPropagation();
      wrapper.classList.toggle('open');
      trigger.classList.toggle('active', wrapper.classList.contains('open'));
    });

    // Close on outside click
    document.addEventListener('click', () => closeDropdown());

    // Hide the standalone export item (it lives in the dropdown now)
    if (exportItem) {
      exportItem.style.display = 'none';
      exportItem.dataset.p9hidden = '1';
    }
  }

  function closeDropdown() {
    const w = document.getElementById('p9-file-menu');
    if (!w) return;
    w.classList.remove('open');
    const trigger = w.querySelector('.menu-item');
    if (trigger) trigger.classList.remove('active');
  }

  /* ══════════════════════════════════════════════════════════
     PATCH4 INTEGRATION — encrypt dropdown labels when locked
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
      const lucidBtn = document.getElementById('p9-lucid-btn');
      if (!lucidBtn) return;
      lucidBtn.textContent = isOn ? 'Lucid List' : p9Scramble('Lucid List');
    }).observe(dot, { attributes: true, attributeFilter: ['class'] });
  }

  /* ══════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', () => {
    [0, 300, 700, 1400].forEach(ms => setTimeout(() => {
      buildFileDropdown();
      hookPatch4();
    }, ms));
  });

  console.log('[patch9] v9 ✓  — lucid list + file dropdown active');
})();
