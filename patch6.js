/* ═══════════════════════════════════════════════════════════════
   patch6.js  —  Dream Journal extensions (v6)
   • Fixes stats modal close button not working
   • Adds terminal command: /unlock <passphrase>
   • Adds terminal command: /edit stats
   • Both commands are invisible — never appear in /help output
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════
     FIX — Stats close button
     patch2 likely creates a modal with a close button but
     never wires the click handler, or wires it to a stale
     reference.  We use event delegation on document so we
     catch any close button inside any stats overlay,
     regardless of when it was injected.
  ══════════════════════════════════════════════════════ */
  document.addEventListener('click', function (e) {
    const btn = e.target.closest(
      '#stats-modal [data-close], ' +
      '#stats-modal .modal-close, ' +
      '#stats-modal .btn-close, ' +
      '#stats-modal #stats-close, ' +
      '#stats-panel [data-close], ' +
      '#stats-panel .modal-close, ' +
      '#stats-panel .btn-close, ' +
      '.stats-close, ' +
      '[data-closes="stats"]'
    );
    if (!btn) return;
    // Hide every stats-related overlay we can find
    [
      document.getElementById('stats-modal'),
      document.getElementById('stats-panel'),
      document.getElementById('stats-overlay'),
      document.querySelector('.stats-modal'),
    ].forEach(el => {
      if (el) {
        el.style.display = 'none';
        el.classList.remove('show', 'open', 'active', 'visible');
      }
    });
  }, true /* capture so it fires even if a child calls stopPropagation */);

  /* Also close on Escape key when stats is open */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    [
      document.getElementById('stats-modal'),
      document.getElementById('stats-panel'),
      document.getElementById('stats-overlay'),
      document.querySelector('.stats-modal'),
    ].forEach(el => {
      if (!el) return;
      const vis = el.style.display;
      if (vis !== 'none' && el.classList.contains('show') || el.offsetParent !== null) {
        el.style.display = 'none';
        el.classList.remove('show', 'open', 'active', 'visible');
      }
    });
  });

  /* ══════════════════════════════════════════════════════
     HIDDEN TERMINAL COMMANDS
     Intercepts the terminal's command processor.  Works by:
       1. Wrapping window.processCommand if patch2/3 exposed it
       2. Capturing keydown on the terminal input as a capture
          listener (runs before patch2/3 handlers)
     Both strategies run in parallel so at least one works.
  ══════════════════════════════════════════════════════ */

  const HIDDEN_CMDS = ['/unlock', '/edit stats'];

  /* ── command handler ── */
  function p6HandleCommand(raw) {
    const line = (raw || '').trim();

    /* /unlock <passphrase> */
    if (/^\/unlock\s+/i.test(line)) {
      const pw = line.replace(/^\/unlock\s+/i, '').trim();
      if (!pw) {
        p6Print('Usage: /unlock <passphrase>');
        return true;
      }
      if (typeof window.attemptUnlock === 'function') {
        window.attemptUnlock(pw);
      } else {
        p6Print('Error: unlock API unavailable.');
      }
      return true;
    }

    /* /edit stats */
    if (/^\/edit\s+stats$/i.test(line)) {
      p6OpenStatsEditor();
      return true;
    }

    return false; // not our command — let patch2/3 handle it
  }

  /* ── print to terminal output (best-effort, common selectors) ── */
  function p6Print(text) {
    const out =
      document.getElementById('trm-output') ||
      document.getElementById('terminal-output') ||
      document.querySelector('.trm-out') ||
      document.querySelector('.terminal-output');
    if (!out) return;
    const line = document.createElement('div');
    line.style.cssText = 'color:var(--mark-warn,#c8a040);font-size:12px;letter-spacing:1px;padding:1px 0;';
    line.textContent = '> ' + text;
    out.appendChild(line);
    out.scrollTop = out.scrollHeight;
  }

  /* ── open stats editor overlay ── */
  function p6OpenStatsEditor() {
    // If patch2 already has a stats editor, try to show it
    const existing = document.getElementById('stats-editor') || document.getElementById('stats-edit-modal');
    if (existing) {
      existing.style.display = '';
      existing.classList.add('show');
      p6Print('Opening stats editor...');
      return;
    }

    // Build a minimal inline editor for the stats stored in supabase / window.S
    p6BuildStatsEditor();
    p6Print('Stats editor opened.');
  }

  /* ── minimal stats editor ── */
  function p6BuildStatsEditor() {
    if (document.getElementById('p6-stats-editor')) {
      document.getElementById('p6-stats-editor').style.display = 'flex';
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'p6-stats-editor';
    overlay.style.cssText = [
      'position:fixed;inset:0;z-index:9999',
      'background:var(--paper,#0e0d0b)',
      'display:flex;flex-direction:column',
      'font-family:"IBM Plex Mono",monospace',
    ].join(';');

    /* titlebar */
    const tb = document.createElement('div');
    tb.style.cssText = 'background:var(--ink,#d4cfc6);color:var(--paper,#0e0d0b);padding:5px 12px;font-size:11px;letter-spacing:1px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0';
    tb.innerHTML = '<span>DREAM_JOURNAL.EXE — Stats Editor</span>';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '[ close ]';
    closeBtn.style.cssText = 'background:none;border:1px solid var(--ink-mid,#b0a99e);cursor:pointer;font-family:"IBM Plex Mono",monospace;font-size:11px;color:var(--paper-dim,#161410);letter-spacing:1px;padding:1px 6px;';
    closeBtn.addEventListener('click', () => { overlay.style.display = 'none'; });
    tb.appendChild(closeBtn);
    overlay.appendChild(tb);

    /* header */
    const hdr = document.createElement('div');
    hdr.style.cssText = 'padding:8px 16px;font-size:9px;letter-spacing:2px;color:var(--ink-faint,#4e4840);border-bottom:1px solid var(--rule-dark,#3a3630);text-transform:uppercase;background:var(--paper-dim,#161410)';
    hdr.textContent = '> edit stats / metadata';
    overlay.appendChild(hdr);

    /* body */
    const body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow-y:auto;padding:24px 32px;display:flex;flex-direction:column;gap:18px;';

    /* pull current stats from S.entries */
    const entries = window.S?.entries || [];
    const flairCounts = {};
    entries.forEach(e => { flairCounts[e.flair] = (flairCounts[e.flair] || 0) + 1; });

    const fields = [
      { label: 'Display Name',   key: 'displayName',  val: localStorage.getItem('p6_displayName')  || 'DREAMER' },
      { label: 'Archive Label',  key: 'archiveLabel', val: localStorage.getItem('p6_archiveLabel') || 'Consciousness Archive v2.0' },
      { label: 'Notes',          key: 'notes',        val: localStorage.getItem('p6_notes')        || '' },
    ];

    fields.forEach(f => {
      const fg = document.createElement('div');
      fg.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
      const lbl = document.createElement('label');
      lbl.style.cssText = 'font-size:9px;letter-spacing:2px;color:var(--ink-soft,#7a7268);text-transform:uppercase;';
      lbl.textContent = '// ' + f.label;
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.value = f.val;
      inp.dataset.key = f.key;
      inp.style.cssText = 'background:var(--paper-dim,#161410);border:1px solid var(--rule-dark,#3a3630);border-bottom:2px solid var(--ink-soft,#7a7268);color:var(--ink,#d4cfc6);font-family:"IBM Plex Mono",monospace;font-size:13px;padding:8px 10px;outline:none;';
      fg.appendChild(lbl); fg.appendChild(inp);
      body.appendChild(fg);
    });

    /* read-only stats summary */
    const summ = document.createElement('div');
    summ.style.cssText = 'margin-top:8px;padding:14px;background:var(--paper-dim,#161410);border:1px solid var(--rule-dark,#3a3630);font-size:11px;color:var(--ink-soft,#7a7268);line-height:2;';
    summ.innerHTML = '<div style="font-size:9px;letter-spacing:2px;margin-bottom:8px;color:var(--ink-faint,#4e4840);text-transform:uppercase">// computed stats (read-only)</div>'
      + `<div>Total entries : ${entries.length}</div>`
      + Object.entries(flairCounts).map(([k,v]) => `<div>${k.padEnd(14,' ')} : ${v}</div>`).join('');
    body.appendChild(summ);

    overlay.appendChild(body);

    /* save button */
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '+ Save Changes';
    saveBtn.style.cssText = 'margin:0;padding:12px 16px;background:var(--ink,#d4cfc6);border:none;color:var(--paper,#0e0d0b);font-family:"IBM Plex Mono",monospace;font-size:12px;letter-spacing:1px;cursor:pointer;text-align:left;flex-shrink:0;';
    saveBtn.addEventListener('click', () => {
      overlay.querySelectorAll('input[data-key]').forEach(inp => {
        localStorage.setItem('p6_' + inp.dataset.key, inp.value.trim());
      });
      // Apply archive label to titlebar if it changed
      const newLabel = localStorage.getItem('p6_archiveLabel');
      if (newLabel) {
        const tb2 = document.getElementById('tb-title');
        if (tb2 && !window.S?.unlocked === false) {
          // only update visually when unlocked to avoid fighting patch4
        }
      }
      typeof window.notify === 'function' && window.notify('Stats saved.', 'ok');
      overlay.style.display = 'none';
    });
    overlay.appendChild(saveBtn);

    document.body.appendChild(overlay);
  }

  /* ══════════════════════════════════════════════════════
     INTERCEPT STRATEGY 1 — wrap window.processCommand
     patch2/3 may expose a global processCommand / handleCommand
  ══════════════════════════════════════════════════════ */
  const CMD_FN_NAMES = ['processCommand', 'handleCommand', 'runCommand', 'execCommand', 'trmCommand'];

  function wrapCommandFn(name) {
    const orig = window[name];
    if (typeof orig !== 'function' || orig.__p6wrapped) return;
    window[name] = function (input, ...rest) {
      if (p6HandleCommand(input)) return;
      return orig.call(this, input, ...rest);
    };
    window[name].__p6wrapped = true;
  }

  CMD_FN_NAMES.forEach(wrapCommandFn);

  /* Poll briefly in case patch2/3 define their fn after us */
  let wrapAttempts = 0;
  const wrapTimer = setInterval(() => {
    CMD_FN_NAMES.forEach(wrapCommandFn);
    if (++wrapAttempts >= 20) clearInterval(wrapTimer);
  }, 250);

  /* ══════════════════════════════════════════════════════
     INTERCEPT STRATEGY 2 — capture keydown on terminal input
     Fires before patch2/3 handlers so we can swallow hidden cmds.
  ══════════════════════════════════════════════════════ */
  function attachTerminalListener() {
    const inp =
      document.getElementById('trm-input') ||
      document.getElementById('terminal-input') ||
      document.querySelector('.trm-input') ||
      document.querySelector('.terminal-input');
    if (!inp || inp.__p6hooked) return;
    inp.__p6hooked = true;

    inp.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      const val = inp.value.trim();
      if (p6HandleCommand(val)) {
        e.stopImmediatePropagation(); // prevent patch2/3 from also processing it
        inp.value = '';
      }
    }, true /* capture */);
  }

  document.addEventListener('DOMContentLoaded', () => {
    attachTerminalListener();
    // Retry in case terminal is injected after DOMContentLoaded
    [300, 800, 1500].forEach(ms => setTimeout(attachTerminalListener, ms));
  });

  /* ══════════════════════════════════════════════════════
     HIDE HIDDEN COMMANDS from /help output
     patch2/3 likely build a help string and render it into
     the terminal output div.  We watch for it and strip lines
     containing our hidden commands.
  ══════════════════════════════════════════════════════ */
  const HIDDEN_FROM_HELP = ['/uncensor', '/edit stats', '/edit', 'edit stats', 'uncensor'];

  function scrubHelpLine(node) {
    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.TEXT_NODE) return;
    const txt = node.textContent || '';
    if (HIDDEN_FROM_HELP.some(h => txt.toLowerCase().includes(h.toLowerCase()))) {
      if (node.parentNode) node.parentNode.removeChild(node);
    }
  }

  function watchTerminalOutput() {
    const out =
      document.getElementById('trm-output') ||
      document.getElementById('terminal-output') ||
      document.querySelector('.trm-out') ||
      document.querySelector('.terminal-output');
    if (!out || out.__p6scrubbing) return;
    out.__p6scrubbing = true;

    new MutationObserver(mutations => {
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          // Give the node a tick to fully render before scrubbing
          setTimeout(() => scrubHelpLine(node), 0);
        });
      });
    }).observe(out, { childList: true });
  }

  document.addEventListener('DOMContentLoaded', () => {
    watchTerminalOutput();
    [400, 1000, 2000].forEach(ms => setTimeout(watchTerminalOutput, ms));
  });

  console.log('[patch6] v6 ✓  — stats close fix + hidden terminal commands active');
})();
