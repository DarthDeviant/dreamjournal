/* ═══════════════════════════════════════════════════════════════
   patch10.js  —  fixes patch9's File dropdown + open bugs
   • Kills patch9's broken dropdown attempt cleanly
   • Injects a reliable File dropdown (mousedown, not click)
   • Fixes the panel open button
   • Ensures Google Fonts load correctly
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Load Caveat fonts via <link> (more reliable than @import in injected style) ── */
  if (!document.getElementById('p10-fonts')) {
    const link = document.createElement('link');
    link.id   = 'p10-fonts';
    link.rel  = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Caveat+Brush&display=swap';
    document.head.appendChild(link);
  }

  /* ══════════════════════════════════════════════════════════
     STEP 1 — Undo patch9's broken wrapper if it exists
  ══════════════════════════════════════════════════════════ */
  function undoPatch9() {
    const wrap = document.getElementById('p9-file-wrap');
    if (!wrap) return;
    const menubar = document.getElementById('menubar');
    if (!menubar) return;

    // Restore the hidden original File item
    const original = menubar.querySelector('.menu-item[style*="display: none"]');
    if (original) original.style.display = '';

    // Restore the hidden Export item
    const exp = document.getElementById('menu-export');
    if (exp) exp.style.display = '';

    // Remove patch9 wrapper entirely
    wrap.remove();
  }

  /* ══════════════════════════════════════════════════════════
     STEP 2 — Build a clean File dropdown
  ══════════════════════════════════════════════════════════ */
  const DD_CSS = `
#p10-wrap {
  position: relative;
  display: inline-flex;
  align-items: stretch;
  flex-shrink: 0;
}
#p10-trigger {
  color: var(--ink-mid);
  cursor: pointer;
  padding: 4px 10px;
  letter-spacing: 0.5px;
  font-size: 11px;
  font-family: 'IBM Plex Mono', monospace;
  display: flex;
  align-items: center;
  border-right: 1px solid var(--rule);
  border-left: 1px solid var(--rule);
  white-space: nowrap;
  user-select: none;
  transition: background .1s, color .1s;
  -webkit-tap-highlight-color: transparent;
}
#p10-trigger:hover,
#p10-wrap.open #p10-trigger {
  background: var(--ink);
  color: var(--paper);
}
#p10-dd {
  display: none;
  position: absolute;
  top: 100%; left: 0;
  min-width: 160px;
  background: var(--paper-dim);
  border: 1px solid var(--rule-dark);
  border-top: 2px solid var(--ink);
  z-index: 9999;
  box-shadow: 4px 4px 0 rgba(0,0,0,.5);
}
#p10-wrap.open #p10-dd { display: block; }
.p10-dd-btn {
  display: block;
  width: 100%;
  padding: 7px 16px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  letter-spacing: .5px;
  color: var(--ink-soft);
  background: none;
  border: none;
  border-bottom: 1px solid var(--rule);
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}
.p10-dd-btn:last-child { border-bottom: none; }
.p10-dd-btn:hover { background: var(--ink); color: var(--paper); }
`;

  function injectDDStyles() {
    if (document.getElementById('p10-dd-css')) return;
    const s = document.createElement('style');
    s.id = 'p10-dd-css';
    s.textContent = DD_CSS;
    document.head.appendChild(s);
  }

  function buildDropdown() {
    if (document.getElementById('p10-wrap')) return;

    const menubar = document.getElementById('menubar');
    if (!menubar) return;

    // Find the original File menu item — first .menu-item, no id
    // After undoPatch9 it should be visible again
    const fileItem = Array.from(menubar.querySelectorAll('.menu-item'))
      .find(el => el.textContent.trim().replace(/\s/g,'').toLowerCase() === 'file');
    if (!fileItem) return;

    // Build wrapper
    const wrap = document.createElement('div');
    wrap.id = 'p10-wrap';

    const trigger = document.createElement('div');
    trigger.id = 'p10-trigger';
    trigger.innerHTML = '<span style="text-decoration:underline">F</span>ile ▾';

    const dd = document.createElement('div');
    dd.id = 'p10-dd';

    // Export button
    const btnExport = document.createElement('button');
    btnExport.className = 'p10-dd-btn';
    btnExport.innerHTML = 'E<span style="text-decoration:underline">x</span>port';
    btnExport.addEventListener('mousedown', e => {
      e.stopPropagation();
      closeDD();
      if (typeof window.exportJSON === 'function') window.exportJSON();
    });

    // Lucid List button
    const btnLucid = document.createElement('button');
    btnLucid.className = 'p10-dd-btn';
    btnLucid.id = 'p10-lucid-btn';
    btnLucid.innerHTML = '<span style="text-decoration:underline">L</span>ucid List';
    btnLucid.addEventListener('mousedown', e => {
      e.stopPropagation();
      closeDD();
      openPanel();
    });

    dd.appendChild(btnExport);
    dd.appendChild(btnLucid);
    wrap.appendChild(trigger);
    wrap.appendChild(dd);

    // Replace the original File item with our wrapper
    fileItem.parentNode.replaceChild(wrap, fileItem);

    // Hide standalone Export menu item
    const menuExport = document.getElementById('menu-export');
    if (menuExport) menuExport.style.display = 'none';

    // Toggle on mousedown (fires before blur, avoids click race)
    trigger.addEventListener('mousedown', e => {
      e.stopPropagation();
      wrap.classList.toggle('open');
    });
    // Touch support
    trigger.addEventListener('touchend', e => {
      e.preventDefault();
      wrap.classList.toggle('open');
    });

    // Close on outside click/touch
    document.addEventListener('mousedown', () => closeDD());
    document.addEventListener('touchstart', () => closeDD(), { passive: true });
  }

  function closeDD() {
    document.getElementById('p10-wrap')?.classList.remove('open');
  }

  /* ══════════════════════════════════════════════════════════
     STEP 3 — Panel open/close (reuses patch9's panel DOM,
     but ensures #p9-close and the open function work)
  ══════════════════════════════════════════════════════════ */
  function openPanel() {
    // Build panel if patch9 never did (or if it failed)
    if (!document.getElementById('p9-panel')) {
      buildFallbackPanel();
    }
    document.getElementById('p9-panel').classList.add('show');
  }

  // Minimal fallback panel builder in case patch9 didn't run at all
  function buildFallbackPanel() {
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

    // Inject panel CSS if patch9 styles are missing
    if (!document.getElementById('p9-styles')) {
      const s = document.createElement('style');
      s.id = 'p9-styles';
      s.textContent = `
#p9-panel{position:fixed;inset:0;background:var(--paper);z-index:191;display:none;flex-direction:column;overflow:hidden}
#p9-panel.show{display:flex}
.p9-titlebar{background:var(--ink);color:var(--paper);padding:5px 12px;font-size:11px;letter-spacing:1px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.p9-close{background:none;border:1px solid rgba(0,0,0,.3);cursor:pointer;font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--paper-dim);letter-spacing:1px;padding:1px 6px}
.p9-close:hover{background:#c84040;color:#fff;border-color:#c84040}
.p9-body{flex:1;overflow-y:auto;display:flex;align-items:stretch;justify-content:center;padding:24px;background:var(--paper)}
.p9-notebook{width:100%;max-width:1400px;background:#f5f0e8;border-radius:2px;box-shadow:0 0 0 1px #c8bfa8,4px 4px 0 #b8ad96,8px 8px 0 #a89e88,0 24px 80px rgba(0,0,0,.65);display:grid;grid-template-columns:44px 1fr;grid-template-rows:auto 1fr auto;overflow:hidden}
.p9-spine{grid-column:1;grid-row:1/-1;background:linear-gradient(to right,#bfae90,#d4c8a8 60%,#e4dcc8);border-right:1px solid #b8a880;display:flex;flex-direction:column;justify-content:space-around;align-items:center;padding:28px 0}
.p9-ring{width:14px;height:14px;border-radius:50%;background:var(--paper);border:2px solid #807060;box-shadow:inset 0 1px 3px rgba(0,0,0,.6)}
.p9-header{grid-column:2;grid-row:1;padding:26px 40px 14px 28px;border-bottom:2px solid #c0a870;display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap}
.p9-cursive-title{font-family:'Caveat Brush','Caveat',cursive;font-size:52px;color:#1e1508;line-height:1;display:block;margin-bottom:4px}
.p9-cursive-sub{font-family:'Caveat',cursive;font-size:21px;color:#7a6848;display:block}
.p9-legend{font-family:'Caveat',cursive;font-size:16px;color:#8a7850;display:flex;align-items:center;gap:5px;white-space:nowrap;padding-bottom:4px}
.p9-legend-star{color:#c07010;font-size:18px}
.p9-lines{grid-column:2;grid-row:2;padding:0 40px 20px 28px;background-image:repeating-linear-gradient(to bottom,transparent,transparent 31px,#ccc4a8 31px,#ccc4a8 32px);background-position:0 38px;display:grid;grid-template-columns:1fr 1fr;gap:0 40px;align-content:start}
.p9-watermark{grid-column:2;grid-row:3;font-family:'Caveat',cursive;font-size:12px;color:#c0b490;text-align:right;padding:6px 40px 18px 0;letter-spacing:1px;border-top:1px dashed #ccc4a8}
.p9-item{display:flex;align-items:flex-start;gap:7px;min-height:32px;padding:5px 0}
.p9-num{font-family:'Caveat',cursive;font-size:14px;color:#a88848;flex-shrink:0;width:22px;text-align:right;padding-top:3px;user-select:none}
.p9-star{flex-shrink:0;width:16px;font-size:14px;user-select:none;line-height:1.65}
.p9-star.on{color:#c07010}
.p9-star.off{color:#d8d0b8}
.p9-text{font-family:'Caveat',cursive;font-size:19px;color:#1a1208;line-height:1.65;flex:1}
.p9-item.pri{background:linear-gradient(to right,#f0e4b855,transparent 92%);border-radius:2px}
.p9-item.pri .p9-text{font-weight:600;color:#0e0804}
@media(max-width:700px){.p9-body{padding:0;align-items:flex-start}.p9-notebook{max-width:100%;border-radius:0;box-shadow:none;grid-template-columns:30px 1fr;min-height:100%}.p9-lines{grid-template-columns:1fr;padding:0 16px 20px 14px;gap:0}.p9-text{font-size:17px}.p9-header{flex-direction:column;align-items:flex-start;gap:6px;padding:18px 16px 12px}.p9-cursive-title{font-size:38px}}
      `;
      document.head.appendChild(s);
    }

    const rings = Array(9).fill('<div class="p9-ring"></div>').join('');
    const rows  = LUCID_LIST.map((item, i) =>
      `<div class="p9-item${item.starred?' pri':''}">
        <span class="p9-num">${i+1}.</span>
        <span class="p9-star ${item.starred?'on':'off'}">${item.starred?'★':'☆'}</span>
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

    document.getElementById('p9-close').addEventListener('click', () => {
      document.getElementById('p9-panel').classList.remove('show');
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') document.getElementById('p9-panel')?.classList.remove('show');
    });
  }

  /* Re-wire close button in case patch9 built the panel but close is broken */
  function rewireClose() {
    const btn = document.getElementById('p9-close');
    if (!btn || btn.__p10wired) return;
    btn.__p10wired = true;
    btn.addEventListener('click', () => {
      document.getElementById('p9-panel')?.classList.remove('show');
    });
  }

  /* ══════════════════════════════════════════════════════════
     INIT — runs after all other patches have had their time
  ══════════════════════════════════════════════════════════ */
  function init() {
    injectDDStyles();
    undoPatch9();
    buildDropdown();
    rewireClose();
  }

  // DOMContentLoaded + staggered retries to win the race against patch4 scrambling
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      [0, 100, 300, 600, 1200].forEach(ms => setTimeout(init, ms));
    });
  } else {
    [0, 100, 300, 600, 1200].forEach(ms => setTimeout(init, ms));
  }

  console.log('[patch10] v10 ✓  — file dropdown + panel fixes active');
})();
