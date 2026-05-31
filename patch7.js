/* ═══════════════════════════════════════════════════════════════
   patch7.js  —  Dream Journal hot-fix bundle (v7)
   • Stats close button — works; does NOT break reopen
   • /uncensor … stripped from /help output (aggressive)
   • sb-entries always shows correct entry count
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     HELPERS — stats overlay lookup
  ══════════════════════════════════════════════════════════ */
  function getStatsEls() {
    return [
      document.getElementById('stats-modal'),
      document.getElementById('stats-panel'),
      document.getElementById('stats-overlay'),
      document.querySelector('.stats-modal'),
      document.querySelector('.stats-overlay'),
    ].filter(Boolean);
  }

  function isStatsVisible() {
    return getStatsEls().some(el => {
      return el.classList.contains('show') ||
             el.classList.contains('open') ||
             el.classList.contains('active') ||
             el.classList.contains('visible') ||
             (el.style.display !== '' && el.style.display !== 'none');
    });
  }

  /* ── Close: only remove classes; never touch inline display ── */
  /* Inline display:none survives class re-adds and breaks re-open */
  function closeStats() {
    getStatsEls().forEach(el => {
      el.classList.remove('show', 'open', 'active', 'visible');
      // Clear any inline display override we (or patch6) may have set previously
      el.style.display = '';
    });
  }

  /* ══════════════════════════════════════════════════════════
     FIX — Stats close button (event delegation, capture phase)
     Matches by:
       • Known IDs / classes  (#stats-close, .btn-close, etc.)
       • Button text containing "close" or common close chars
       • [data-close] / [data-closes="stats"] attributes
  ══════════════════════════════════════════════════════════ */
  document.addEventListener('click', function (e) {
    // Walk up to find a button-like element
    let node = e.target;
    while (node && node !== document.body) {
      if (isCloseButton(node) && insideStats(node)) {
        closeStats();
        e.stopImmediatePropagation();
        return;
      }
      node = node.parentElement;
    }
  }, true);

  function insideStats(el) {
    return el.closest(
      '#stats-modal, #stats-panel, #stats-overlay, .stats-modal, .stats-overlay'
    ) !== null;
  }

  function isCloseButton(el) {
    if (!el) return false;
    const tag  = el.tagName;
    const id   = (el.id || '').toLowerCase();
    const cls  = (el.className || '').toLowerCase();
    const txt  = (el.textContent || '').trim().toLowerCase();
    const da   = el.getAttribute('data-close');
    const dac  = (el.getAttribute('data-closes') || '').toLowerCase();

    return (
      da !== null ||
      dac === 'stats' ||
      id.includes('close') ||
      cls.includes('close') ||
      cls.includes('modal-close') ||
      cls.includes('btn-close') ||
      (tag === 'BUTTON' && (txt === 'close' || txt === '×' || txt === 'x' || txt === '[ close ]' || txt.includes('close')))
    );
  }

  /* ── ESC closes stats but does NOT set inline style ── */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isStatsVisible()) {
      closeStats();
    }
  });

  /* ══════════════════════════════════════════════════════════
     FIX — /help output: strip /uncensor lines aggressively
     Strategy:
       1. MutationObserver on every known terminal output container
       2. Also wrap any global getHelpText / HELP_TEXT variable
       3. Pattern-match the full range of /uncensor variations
  ══════════════════════════════════════════════════════════ */

  /* Lines matching any of these patterns are removed from /help */
  const HELP_KILL = [
    /\/uncensor/i,
    /uncensor/i,
    /edit[\s_-]stats/i,
    /\/edit/i,
  ];

  function shouldKillLine(text) {
    return HELP_KILL.some(re => re.test(text));
  }

  function scrubNode(node) {
    if (!node || !node.parentNode) return;
    if (shouldKillLine(node.textContent || '')) {
      node.parentNode.removeChild(node);
    }
  }

  function scrubAllExisting(root) {
    if (!root) return;
    Array.from(root.childNodes).forEach(child => {
      if (shouldKillLine(child.textContent || '')) {
        root.removeChild(child);
      }
    });
  }

  function watchOutput(out) {
    if (!out || out.__p7watched) return;
    out.__p7watched = true;
    scrubAllExisting(out);  // clean anything already there

    new MutationObserver(mutations => {
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          // two-tick delay to let patch2/3 fully paint the node
          requestAnimationFrame(() => requestAnimationFrame(() => scrubNode(node)));
        });
      });
    }).observe(out, { childList: true });
  }

  /* Also intercept if patch2/3 build help as a string variable */
  function patchHelpString() {
    const candidates = ['HELP_TEXT', 'HELP_LINES', 'helpText', 'helpLines', 'CMD_HELP'];
    candidates.forEach(name => {
      const val = window[name];
      if (typeof val === 'string') {
        window[name] = val.split('\n').filter(l => !shouldKillLine(l)).join('\n');
      } else if (Array.isArray(val)) {
        window[name] = val.filter(l => !shouldKillLine(String(l)));
      }
    });
  }

  /* Intercept /help command output at the source */
  const HELP_FN_NAMES = ['showHelp', 'printHelp', 'cmdHelp', 'helpCommand'];
  function wrapHelpFn(name) {
    const orig = window[name];
    if (typeof orig !== 'function' || orig.__p7wrapped) return;
    window[name] = function (...args) {
      const ret = orig.apply(this, args);
      // Scrub output container after help renders
      setTimeout(() => {
        getAllOutputEls().forEach(scrubAllExisting);
      }, 50);
      return ret;
    };
    window[name].__p7wrapped = true;
  }

  function getAllOutputEls() {
    return [
      document.getElementById('trm-output'),
      document.getElementById('terminal-output'),
      document.querySelector('.trm-out'),
      document.querySelector('.terminal-output'),
    ].filter(Boolean);
  }

  /* ══════════════════════════════════════════════════════════
     FIX — sb-entries always shows real count
     Root cause: patch4 captures origText = "entries: 0" on boot,
     then on unlock restores that stale string via animDecrypt.
     Fix: watch sb-entries with a MutationObserver and correct it
     whenever it shows stale "entries: 0" (and entries exist).
     Also force-correct after unlock animation settles (~600 ms).
  ══════════════════════════════════════════════════════════ */
  function correctEntryCount() {
    const n  = window.S?.entries?.length ?? 0;
    const sb = document.getElementById('sb-entries');
    if (sb) sb.textContent = 'entries: ' + n;
    const ec = document.getElementById('entry-count');
    if (ec) ec.textContent = n;
  }

  function watchSbEntries() {
    const sb = document.getElementById('sb-entries');
    if (!sb || sb.__p7watched) return;
    sb.__p7watched = true;

    new MutationObserver(() => {
      const n = window.S?.entries?.length ?? 0;
      // If the text is wrong (stale "0" when entries exist, or wrong number), fix it
      if (sb.textContent.trim() !== 'entries: ' + n) {
        // Use a microtask so we don't fight patch4's animDecrypt mid-frame
        Promise.resolve().then(() => { sb.textContent = 'entries: ' + n; });
      }
    }).observe(sb, { childList: true, characterData: true, subtree: true });
  }

  /* Also hook the lock-dot to re-correct after unlock animation */
  function hookLockDot() {
    const dot = document.getElementById('lock-dot');
    if (!dot || dot.__p7hooked) return;
    dot.__p7hooked = true;

    new MutationObserver(() => {
      if (dot.classList.contains('on')) {
        // Unlock: patch4's stagger animation takes ~24ms × ~15 items = ~360ms
        // Wait for it to finish, then stamp the correct count
        setTimeout(correctEntryCount, 500);
        setTimeout(correctEntryCount, 900); // insurance
      }
    }).observe(dot, { attributes: true, attributeFilter: ['class'] });
  }

  /* Override loadEntries to stamp count after data arrives */
  function hookLoadEntries() {
    const orig = window.loadEntries;
    if (typeof orig !== 'function' || orig.__p7wrapped) return;
    window.loadEntries = async function (...args) {
      const ret = await orig.apply(this, args);
      correctEntryCount();
      return ret;
    };
    window.loadEntries.__p7wrapped = true;
  }

  /* ══════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', () => {
    hookLockDot();
    hookLoadEntries();
    watchSbEntries();
    patchHelpString();
    HELP_FN_NAMES.forEach(wrapHelpFn);
    getAllOutputEls().forEach(watchOutput);

    // Retry for late-injected elements
    [300, 700, 1500, 3000].forEach(ms => setTimeout(() => {
      hookLockDot();
      watchSbEntries();
      getAllOutputEls().forEach(watchOutput);
      patchHelpString();
      HELP_FN_NAMES.forEach(wrapHelpFn);
      correctEntryCount();
    }, ms));
  });

  console.log('[patch7] v7 ✓  — stats close / help scrub / entry count fixes active');
})();
