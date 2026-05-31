/* ═══════════════════════════════════════════════════════════════
   patch5.js  —  Dream Journal hot-fix bundle
   Fixes:
     1. TypeError: entry-count null → null-safe updateCounts
        (patch4 sets .textContent on the sidebar header span,
         destroying the child <span id="entry-count"> element,
         crashing init() before any event listeners are attached)
     2. Passphrase unresponsive  — caused by #1 (init never completes)
     3. Light mode non-functional — caused by #1
     4. Calendar / terminal overlays not encrypted — generic overlay
        encryption wired to the same lock-dot observer as patch4
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════
     FIX 1  —  Null-safe updateCounts
     Override the function at the module level so it is
     already replaced by the time DOMContentLoaded fires
     and init() runs (deferred scripts execute before the
     DOMContentLoaded event).
  ══════════════════════════════════════════════════════ */
  function safeUpdateCounts() {
    const n  = window.S?.entries?.length ?? 0;
    const ec = document.getElementById('entry-count');
    if (ec) ec.textContent = n;
    const sb = document.getElementById('sb-entries');
    if (sb) sb.textContent = 'entries: ' + n;
  }

  // Override immediately (before DOMContentLoaded)
  window.updateCounts = safeUpdateCounts;

  /* ══════════════════════════════════════════════════════
     RESTORE  —  Keep #entry-count alive after patch4 clobbers it
     patch4's p4ApplyEncrypted() does  el.textContent = scramble
     on the sidebar header span, which vaporises the inner
     <span id="entry-count"> child node.
     We use a MutationObserver to re-inject a phantom span
     whenever it disappears, so $id('entry-count') is never null.
  ══════════════════════════════════════════════════════ */
  function ensureEntryCount() {
    if (document.getElementById('entry-count')) return; // already exists
    const sh = document.getElementById('sidebar-header');
    if (!sh) return;
    const ph = document.createElement('span');
    ph.id             = 'entry-count';
    ph.textContent    = window.S?.entries?.length ?? 0;
    ph.style.cssText  = 'display:none'; // invisible — only used as a value holder
    sh.appendChild(ph);
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Ensure safeUpdateCounts is still the active version
    window.updateCounts = safeUpdateCounts;

    // Run once after all DOMContentLoaded handlers (including patch4's) fire.
    // setTimeout(fn, 0) queues a macrotask, so it runs after the current
    // event-dispatch loop — i.e. after patch4 has already scrambled things.
    setTimeout(ensureEntryCount, 0);

    // Observe the sidebar header for future destructions
    // (e.g. every subsequent call to lock())
    const sh = document.getElementById('sidebar-header');
    if (sh) {
      new MutationObserver(ensureEntryCount)
        .observe(sh, { childList: true, subtree: true });
    }

    /* ══════════════════════════════════════════════════════
       FIX 4  —  Encrypt calendar / terminal overlay screens
       patch2 / patch3 inject modals that patch4 never captured.
       We watch for them, snapshot their content, and encrypt /
       decrypt them in sync with the main lock-dot signal.
    ══════════════════════════════════════════════════════ */
    const GL = '░▒▓▄▀■□~*+=#@&?!./|:ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz0123456789';

    function seededScramble(text) {
      let h = 2166136261 >>> 0;
      for (const ch of String(text))
        h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
      let s = h || 1337;
      const rand = () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 4294967295; };
      return [...text].map(ch =>
        (ch === ' ' || ch === '\n') ? ch : GL[Math.floor(rand() * GL.length)]
      ).join('');
    }

    // Common IDs / selectors that patch2 / patch3 are likely to use.
    // Add more here if needed.
    const OVERLAY_SELECTORS = [
      '#stats-modal',   '#stats-panel',
      '#calendar-modal','#cal-modal',
      '#terminal-modal','#trm-modal',
      '#patch2-modal',  '#patch3-modal',
      '.p2-modal',      '.p3-modal',
      '[data-patch-modal]',
    ];

    // Map<HTMLElement, { origHTML: string }>
    const overlaySnaps = new Map();

    function captureOverlays() {
      for (const sel of OVERLAY_SELECTORS) {
        try {
          document.querySelectorAll(sel).forEach(el => {
            if (!overlaySnaps.has(el) && el.innerHTML.trim()) {
              overlaySnaps.set(el, { origHTML: el.innerHTML });
            }
          });
        } catch (_) { /* ignore bad selectors */ }
      }
    }

    function encryptOverlays() {
      captureOverlays();
      for (const [el, { origHTML }] of overlaySnaps) {
        // Scramble all visible text nodes inside the overlay
        scrambleTextNodes(el, true);
      }
    }

    function decryptOverlays() {
      for (const [el, { origHTML }] of overlaySnaps) {
        el.innerHTML = origHTML;
      }
    }

    // Walk every text node under `root`, replacing (or restoring) its data
    const textNodeCache = new WeakMap();
    function scrambleTextNodes(root, encrypt) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const t = node.textContent;
        if (!t.trim()) continue;
        if (encrypt) {
          if (!textNodeCache.has(node)) textNodeCache.set(node, t);
          node.textContent = seededScramble(t);
        }
      }
    }

    // Wire to the same lock-dot observer used by patch4
    const dot = document.getElementById('lock-dot');
    if (dot) {
      let prevOn = dot.classList.contains('on');
      new MutationObserver(() => {
        const isOn = dot.classList.contains('on');
        if (isOn && !prevOn) {
          // Just unlocked — reveal overlays
          decryptOverlays();
        } else if (!isOn && prevOn) {
          // Just locked — re-encrypt overlays
          encryptOverlays();
        }
        prevOn = isOn;
      }).observe(dot, { attributes: true, attributeFilter: ['class'] });
    }

    // Initial sweep: patch2/patch3 inject their elements slightly after
    // DOMContentLoaded, so we poll briefly to catch them.
    [200, 600, 1200, 2500].forEach(ms =>
      setTimeout(() => {
        captureOverlays();
        if (dot && !dot.classList.contains('on')) encryptOverlays();
      }, ms)
    );
  });

})();
