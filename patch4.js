/* ═══════════════════════════════════════════════════════════════
   patch4.js  —  Dream Journal extensions  (v4)
   • All UI chrome text is scrambled while the journal is locked
   • "DREAM_JOURNAL.EXE" shows as "journal" in encrypted state
   • Staggered glitch-decrypt animation fires on unlock
   • Re-encrypts instantly when journal locks
   • Password bar is intentionally excluded
   • Entry list / entry display handled by existing app logic
═══════════════════════════════════════════════════════════════ */

/* ── Glyph pool (mirrors main app) ── */
const P4_GL = '░▒▓▄▀■□~*+=#@&?!./|:ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz0123456789';

/* ── Seeded RNG → stable, deterministic scramble per element ── */
function p4Rng(seed) {
  let h = 2166136261 >>> 0;
  for (const ch of String(seed || 'p4'))
    h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  let s = h || 1337;
  return () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 4294967295; };
}

function p4Scramble(text, seed) {
  const r = p4Rng(seed ?? text);
  return [...text].map(ch =>
    ch === ' ' || ch === '\n' ? ch
    : P4_GL[Math.floor(r() * P4_GL.length)]
  ).join('');
}

/* ── Module state ── */
let p4Targets  = null;   // array of captured target descriptors
let p4Unlocked = false;  // mirrors actual lock state

/* ════════════════════════════════════════════
   BOOT — run at DOMContentLoaded, BEFORE any
   patch2/patch3 timeouts, to kill plaintext flash
════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  p4Targets = p4BuildTargets();
  p4ApplyEncrypted();              // scramble immediately, synchronously
  setTimeout(p4SetupObserver, 150);  // wire lock/unlock detection
  setTimeout(p4CaptureLateItems, 650); // pick up patch2-injected elements
});

/* ════════════════════════════════════════════
   TARGET CAPTURE
   Records origHTML + origText for every chrome
   element we want to encrypt when locked.
════════════════════════════════════════════ */
function p4BuildTargets() {
  const targets = [];

  function capture(el, opts = {}) {
    if (!el || targets.some(t => t.el === el)) return;
    targets.push({
      el,
      origHTML:    el.innerHTML,
      origText:    el.textContent.trim(),
      encText:     opts.encText ?? null,  // null = scramble; string = fixed label
      hasChildren: el.children.length > 0,
    });
  }

  /* ── Titlebar ── */
  capture(document.getElementById('tb-title'), { encText: 'journal' });
  capture(document.getElementById('tb-pid'));

  /* ── Menubar items ──
     querySelectorAll returns them in DOM order:
     File, Edit, New Entry, Export  (Stats added later by patch2) */
  document.querySelectorAll('#menubar .menu-item').forEach(el => capture(el));

  /* ── Sidebar chrome ── */
  capture(document.querySelector('#sidebar-header > span')); // "Entries [N]"
  capture(document.getElementById('export-btn'));
  capture(document.getElementById('new-entry-btn'));

  /* ── Content pane ── */
  capture(document.getElementById('content-path'));
  document.querySelectorAll('#empty-state p').forEach(el => capture(el));

  /* ── Status bar ──
     .st-name = "DREAM_JOURNAL.EXE"  → show "journal" when locked
     .st-dim  = "AES-256-GCM", "supabase sync: on" */
  capture(document.querySelector('#statusbar .st-name'), { encText: 'journal' });
  document.querySelectorAll('#statusbar .st-dim').forEach(el => capture(el));
  capture(document.getElementById('sb-entries'));

  return targets;
}

/* Capture elements injected by patch2 (Stats button, terminal trigger) */
function p4CaptureLateItems() {
  if (!p4Targets) return;

  [
    document.getElementById('menu-stats'),
    document.getElementById('trm-trigger'),
  ].forEach(el => {
    if (!el || p4Targets.some(t => t.el === el)) return;
    const desc = {
      el,
      origHTML:    el.innerHTML,
      origText:    el.textContent.trim(),
      encText:     null,
      hasChildren: el.children.length > 0,
    };
    p4Targets.push(desc);
    /* If still locked, scramble the newly captured element right away */
    if (!p4Unlocked) el.textContent = p4EncFor(desc);
  });
}

/* Returns the string to show when the element is in encrypted state */
function p4EncFor(t) {
  return t.encText ?? p4Scramble(t.origText, t.origText);
}

/* ════════════════════════════════════════════
   APPLY ENCRYPTED  (instant, no animation)
   Called on boot and after lock()
════════════════════════════════════════════ */
function p4ApplyEncrypted() {
  for (const t of (p4Targets || [])) {
    t.el.textContent = p4EncFor(t);
  }
}

/* ════════════════════════════════════════════
   APPLY DECRYPTED  (staggered glitch animation)
   Called after successful unlock
════════════════════════════════════════════ */
async function p4ApplyDecrypted() {
  p4CaptureLateItems(); // absorb any not-yet-captured items

  const STAGGER_MS = 24; // gap between each element starting its animation
  const SPEED      = 3;  // animDecrypt speed (lower = faster settle)

  const work = (p4Targets || []).map((t, i) =>
    new Promise(res => {
      setTimeout(async () => {
        if (typeof window.animDecrypt === 'function') {
          await window.animDecrypt(t.el, t.origText, SPEED);
        } else {
          t.el.textContent = t.origText;
        }
        /* Restore full innerHTML for elements that had child nodes —
           e.g. menu items with underlined-letter spans, sidebar count. */
        if (t.hasChildren) {
          t.el.innerHTML = t.origHTML;
          p4RefreshDynamic(t.el);
        }
        res();
      }, i * STAGGER_MS);
    })
  );

  await Promise.all(work);
}

/* Re-apply runtime values that may have changed since origHTML was captured */
function p4RefreshDynamic(el) {
  /* Entry count inside sidebar header */
  const countEl =
    el.id === 'entry-count'
      ? el
      : el.querySelector('#entry-count') ?? document.getElementById('entry-count');
  if (countEl) countEl.textContent = window.S?.entries.length ?? 0;
}

/* ════════════════════════════════════════════
   LOCK / UNLOCK OBSERVER
   #lock-dot gains class "on" when journal unlocks,
   loses it when locked — use that as our signal.
════════════════════════════════════════════ */
function p4SetupObserver() {
  const dot = document.getElementById('lock-dot');
  if (!dot) { setTimeout(p4SetupObserver, 100); return; }

  new MutationObserver(() => {
    const isOn = dot.classList.contains('on');

    if (isOn && !p4Unlocked) {
      /* locked → unlocked */
      p4Unlocked = true;
      p4ApplyDecrypted();
    } else if (!isOn && p4Unlocked) {
      /* unlocked → locked */
      p4Unlocked = false;
      p4ApplyEncrypted();
    }
  }).observe(dot, { attributes: true, attributeFilter: ['class'] });

  console.log('[patch4] v4 ✓  — UI text encryption active');
}
