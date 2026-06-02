/* ═══════════════════════════════════════════════════════════════
   patch10.js  —  File menu → fullscreen chooser panel
   • Clicking "File" opens a fullscreen panel with two options:
     Export  and  Lucid List
   • Selecting either closes the chooser and opens that thing
   • Replaces all dropdown attempts from patch9
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── fonts ── */
  if (!document.getElementById('p10-fonts')) {
    const l = document.createElement('link');
    l.id   = 'p10-fonts';
    l.rel  = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Caveat+Brush&display=swap';
    document.head.appendChild(l);
  }

  /* ══════════════════════════════════════════════════════════
     STYLES
  ══════════════════════════════════════════════════════════ */
  if (!document.getElementById('p10-css')) {
    const s = document.createElement('style');
    s.id = 'p10-css';
    s.textContent = `
/* ── File chooser overlay ── */
#p10-chooser {
  position: fixed; inset: 0;
  background: var(--paper);
  z-index: 300;
  display: none;
  flex-direction: column;
  font-family: 'IBM Plex Mono', monospace;
}
#p10-chooser.show { display: flex; }

.p10-titlebar {
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
.p10-close {
  background: none;
  border: 1px solid rgba(0,0,0,.3);
  cursor: pointer;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: var(--paper-dim);
  letter-spacing: 1px;
  padding: 1px 6px;
}
.p10-close:hover { background: #c84040; color: #fff; border-color: #c84040; }

.p10-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: 40px 20px;
}

.p10-heading {
  font-size: 9px;
  letter-spacing: 3px;
  color: var(--ink-faint);
  text-transform: uppercase;
  margin-bottom: 32px;
}
.p10-heading::before { content: '// '; color: var(--ink-ghost); }

.p10-options {
  display: flex;
  flex-direction: row;
  gap: 2px;
  width: 100%;
  max-width: 800px;
}

.p10-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 36px 32px 32px;
  background: var(--paper-dim);
  border: 1px solid var(--rule-dark);
  cursor: pointer;
  transition: background .15s, border-color .15s;
  gap: 10px;
  min-height: 220px;
  position: relative;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}
.p10-option:hover {
  background: var(--paper-mid);
  border-color: var(--ink-soft);
}
.p10-option:active {
  background: var(--ink);
}
.p10-option:active .p10-opt-title,
.p10-option:active .p10-opt-desc,
.p10-option:active .p10-opt-key { color: var(--paper) !important; }

.p10-opt-glyph {
  font-family: 'VT323', monospace;
  font-size: 72px;
  color: var(--ink-ghost);
  line-height: 1;
  position: absolute;
  top: 20px; right: 20px;
  transition: color .15s;
  pointer-events: none;
  user-select: none;
}
.p10-option:hover .p10-opt-glyph { color: var(--rule-dark); }

.p10-opt-key {
  font-size: 9px;
  letter-spacing: 2px;
  color: var(--ink-ghost);
  text-transform: uppercase;
}

.p10-opt-title {
  font-family: 'VT323', monospace;
  font-size: 38px;
  color: var(--ink);
  line-height: 1;
  letter-spacing: 2px;
}

.p10-opt-desc {
  font-size: 10px;
  color: var(--ink-soft);
  letter-spacing: 1px;
  line-height: 1.8;
  max-width: 260px;
}

.p10-hint {
  margin-top: 28px;
  font-size: 9px;
  letter-spacing: 2px;
  color: var(--ink-ghost);
}

/* ── Mobile ── */
@media (max-width: 600px) {
  .p10-options {
    flex-direction: column;
    max-width: 100%;
  }
  .p10-option {
    min-height: 140px;
    padding: 24px 20px 20px;
  }
  .p10-opt-glyph { font-size: 52px; top: 14px; right: 14px; }
  .p10-opt-title { font-size: 30px; }
}

/* ── Lucid panel (full rewrite, self-contained) ── */
#p10-lucid-panel {
  position: fixed; inset: 0;
  background: var(--paper);
  z-index: 191;
  display: none;
  flex-direction: column;
  overflow: hidden;
}
#p10-lucid-panel.show { display: flex; }
.p10-nb-titlebar {
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
.p10-nb-close {
  background: none;
  border: 1px solid rgba(0,0,0,.3);
  cursor: pointer;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: var(--paper-dim);
  letter-spacing: 1px;
  padding: 1px 6px;
}
.p10-nb-close:hover { background:#c84040;color:#fff;border-color:#c84040; }
.p10-nb-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 24px;
  background: var(--paper);
}
.p10-notebook {
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
.p10-spine {
  grid-column: 1; grid-row: 1/-1;
  background: linear-gradient(to right, #bfae90, #d4c8a8 60%, #e4dcc8);
  border-right: 1px solid #b8a880;
  display: flex; flex-direction: column;
  justify-content: space-around; align-items: center;
  padding: 28px 0;
}
.p10-ring {
  width: 14px; height: 14px; border-radius: 50%;
  background: #0e0d0b;
  border: 2px solid #807060;
  box-shadow: inset 0 1px 3px rgba(0,0,0,.6);
  flex-shrink: 0;
}
.p10-nb-header {
  grid-column: 2; grid-row: 1;
  padding: 26px 40px 14px 28px;
  border-bottom: 2px solid #c0a870;
  display: flex; align-items: flex-end;
  justify-content: space-between; gap: 20px; flex-wrap: wrap;
}
.p10-cursive-title {
  font-family: 'Caveat Brush', 'Caveat', cursive;
  font-size: 52px; color: #1e1508; line-height: 1;
  display: block; margin-bottom: 4px;
}
.p10-cursive-sub {
  font-family: 'Caveat', cursive;
  font-size: 21px; color: #7a6848; display: block;
}
.p10-nb-legend {
  font-family: 'Caveat', cursive;
  font-size: 16px; color: #8a7850;
  display: flex; align-items: center; gap: 5px;
  white-space: nowrap; padding-bottom: 4px;
}
.p10-nb-legend-star { color: #c07010; font-size: 18px; }
.p10-lines {
  grid-column: 2; grid-row: 2;
  padding: 0 40px 20px 28px;
  background-image: repeating-linear-gradient(
    to bottom, transparent, transparent 31px, #ccc4a8 31px, #ccc4a8 32px
  );
  background-position: 0 38px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 40px;
  align-content: start;
}
.p10-watermark {
  grid-column: 2; grid-row: 3;
  font-family: 'Caveat', cursive;
  font-size: 12px; color: #c0b490;
  text-align: right; padding: 6px 40px 18px 0;
  letter-spacing: 1px; border-top: 1px dashed #ccc4a8;
}
.p10-item {
  display: flex; align-items: flex-start;
  gap: 7px; min-height: 32px; padding: 5px 0;
  animation: p10-in .32s ease both;
}
${Array.from({length:20},(_,i)=>`.p10-item:nth-child(${i+1}){animation-delay:${(.05+i*.04).toFixed(2)}s}`).join('\n')}
@keyframes p10-in {
  from { opacity:0; transform:translateX(-6px); }
  to   { opacity:1; transform:none; }
}
.p10-num {
  font-family:'Caveat',cursive; font-size:14px; color:#a88848;
  flex-shrink:0; width:22px; text-align:right; padding-top:3px; user-select:none;
}
.p10-star { flex-shrink:0; width:16px; font-size:14px; user-select:none; line-height:1.65; }
.p10-star.on  { color:#c07010; filter:drop-shadow(0 0 3px #c0701055); }
.p10-star.off { color:#d8d0b8; }
.p10-itext {
  font-family:'Caveat',cursive; font-size:19px;
  color:#1a1208; line-height:1.65; flex:1;
}
.p10-item.pri { background:linear-gradient(to right,#f0e4b855,transparent 92%); border-radius:2px; }
.p10-item.pri .p10-itext { font-weight:600; color:#0e0804; }

@media (max-width:700px) {
  .p10-nb-body { padding:0; align-items:flex-start; }
  .p10-notebook {
    max-width:100%; border-radius:0; box-shadow:none;
    grid-template-columns:30px 1fr; min-height:100%;
  }
  .p10-spine { padding:20px 0; }
  .p10-ring { width:11px; height:11px; }
  .p10-nb-header { flex-direction:column; align-items:flex-start; gap:6px; padding:18px 16px 12px; }
  .p10-cursive-title { font-size:38px; }
  .p10-cursive-sub   { font-size:18px; }
  .p10-lines { grid-template-columns:1fr; padding:0 16px 20px 14px; gap:0; }
  .p10-watermark { padding:6px 16px 16px 0; }
  .p10-itext { font-size:17px; }
}
    `;
    document.head.appendChild(s);
  }

  /* ══════════════════════════════════════════════════════════
     LUCID LIST DATA
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
     BUILD CHOOSER PANEL
  ══════════════════════════════════════════════════════════ */
  function buildChooser() {
    if (document.getElementById('p10-chooser')) return;
    const el = document.createElement('div');
    el.id = 'p10-chooser';
    el.innerHTML = `
      <div class="p10-titlebar">
        <span>DREAM_JOURNAL.EXE — File</span>
        <button class="p10-close" id="p10-chooser-close">[ close ]</button>
      </div>
      <div class="p10-body">
        <div class="p10-heading">select an option</div>
        <div class="p10-options">
          <div class="p10-option" id="p10-opt-export">
            <span class="p10-opt-glyph">↓</span>
            <span class="p10-opt-key">// option A</span>
            <span class="p10-opt-title">Export</span>
            <span class="p10-opt-desc">Download all entries as an encrypted JSON archive.</span>
          </div>
          <div class="p10-option" id="p10-opt-lucid">
            <span class="p10-opt-glyph">✦</span>
            <span class="p10-opt-key">// option B</span>
            <span class="p10-opt-title">Lucid List</span>
            <span class="p10-opt-desc">20 things to do in a lucid dream. The most important ones are marked.</span>
          </div>
        </div>
        <div class="p10-hint">[ esc ] close</div>
      </div>`;
    document.body.appendChild(el);

    document.getElementById('p10-chooser-close').addEventListener('click', closeChooser);
    document.getElementById('p10-opt-export').addEventListener('click', () => {
      closeChooser();
      if (typeof window.exportJSON === 'function') window.exportJSON();
    });
    document.getElementById('p10-opt-lucid').addEventListener('click', () => {
      closeChooser();
      openLucidPanel();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeChooser(); closeLucidPanel(); }
    });
  }

  function openChooser()  {
    if (!document.getElementById('p10-chooser')) buildChooser();
    document.getElementById('p10-chooser').classList.add('show');
  }
  function closeChooser() {
    document.getElementById('p10-chooser')?.classList.remove('show');
  }

  /* ══════════════════════════════════════════════════════════
     BUILD LUCID PANEL
  ══════════════════════════════════════════════════════════ */
  function buildLucidPanel() {
    if (document.getElementById('p10-lucid-panel')) return;
    const rings = Array(9).fill('<div class="p10-ring"></div>').join('');
    const rows  = LUCID_LIST.map((item, i) =>
      `<div class="p10-item${item.starred?' pri':''}">
        <span class="p10-num">${i+1}.</span>
        <span class="p10-star ${item.starred?'on':'off'}">${item.starred?'★':'☆'}</span>
        <span class="p10-itext">${item.text}</span>
      </div>`
    ).join('');

    const el = document.createElement('div');
    el.id = 'p10-lucid-panel';
    el.innerHTML = `
      <div class="p10-nb-titlebar">
        <span>DREAM_JOURNAL.EXE — Lucid Bucket List</span>
        <button class="p10-nb-close" id="p10-lucid-close">[ close ]</button>
      </div>
      <div class="p10-nb-body">
        <div class="p10-notebook">
          <div class="p10-spine">${rings}</div>
          <div class="p10-nb-header">
            <div>
              <span class="p10-cursive-title">things to do lucid</span>
              <span class="p10-cursive-sub">if I ever get the chance ✦</span>
            </div>
            <div class="p10-nb-legend">
              <span class="p10-nb-legend-star">★</span>
              <span>= most important</span>
            </div>
          </div>
          <div class="p10-lines">${rows}</div>
          <div class="p10-watermark">consciousness archive · lucid log</div>
        </div>
      </div>`;
    document.body.appendChild(el);
    document.getElementById('p10-lucid-close').addEventListener('click', closeLucidPanel);
  }

  function openLucidPanel() {
    if (!document.getElementById('p10-lucid-panel')) buildLucidPanel();
    document.getElementById('p10-lucid-panel').classList.add('show');
  }
  function closeLucidPanel() {
    document.getElementById('p10-lucid-panel')?.classList.remove('show');
  }

  /* ══════════════════════════════════════════════════════════
     WIRE "File" MENU ITEM
     Finds the File span in the menubar and attaches our opener.
     Uses replaceChild so patch4 scrambling doesn't interfere.
  ══════════════════════════════════════════════════════════ */
  function wireFileItem() {
    if (document.getElementById('p10-file-item')) return;
    const menubar = document.getElementById('menubar');
    if (!menubar) return;

    // Find File item — first .menu-item with no id
    const fileItem = Array.from(menubar.querySelectorAll('.menu-item'))
      .find(el => !el.id && /^f\s*i\s*l\s*e$/i.test(el.textContent.replace(/\s/g,'')));
    if (!fileItem) return;

    // Give it an id and attach listener directly — no wrapping needed
    fileItem.id = 'p10-file-item';
    fileItem.addEventListener('click', e => {
      e.stopPropagation();
      openChooser();
    });

    // Also hide standalone Export since it's now inside the chooser
    const menuExport = document.getElementById('menu-export');
    if (menuExport) menuExport.style.display = 'none';
  }

  /* ══════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════ */
  function init() {
    buildChooser();
    buildLucidPanel();
    wireFileItem();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      [0, 200, 500, 1000].forEach(ms => setTimeout(init, ms));
    });
  } else {
    [0, 200, 500, 1000].forEach(ms => setTimeout(init, ms));
  }

  console.log('[patch10] v10 ✓  — file chooser panel active');
})();
