/* ═══════════════════════════════════════════════════════════════
   patch3.js  —  Dream Journal extensions  (v3)
   • Fixes censored-name leakage during the decryption animation.

   Root cause (patch2):
     safeContentForAnimation() swaps <cs>…</cs> with ████ before
     handing text to animDecrypt — those block chars then glitch
     on-screen char-by-char, revealing the redaction pattern.

   Fix:
     Strip <cs>…</cs> regions to '' for the animation pass so
     they are completely invisible while the glitch runs.
     The moment animDecrypt resolves, inject the final
     renderContentHTML output — ████ blocks appear all at once.
═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => setTimeout(p3init, 700));

/* ── wait for patch2 globals, then replace the render hook ── */
function p3init() {
  const POLL = 80, MAX = 3000;
  let elapsed = 0;

  const t = setInterval(() => {
    elapsed += POLL;

    const ready =
      window.S &&
      window.animDecrypt &&
      window.renderDecrypted &&
      window.removeEntry &&
      typeof renderContentHTML === 'function' &&
      typeof fmtDateTime      === 'function' &&
      typeof badge            === 'function';

    if (ready) {
      clearInterval(t);
      _p3_hookRender();
      console.log('[patch3] v3 ✓  — animation-censor fix active');
      return;
    }

    if (elapsed >= MAX) {
      clearInterval(t);
      console.warn('[patch3] timed out waiting for globals — fix not applied');
    }
  }, POLL);
}

/* ════════════════════════════════════════════
   CORE HOOK — replaces window.renderDecrypted
════════════════════════════════════════════ */
function _p3_hookRender() {

  window.renderDecrypted = function p3_renderDecrypted(entry, animate) {
    const S = window.S;
    const c = S?.cache.get(entry.id);
    if (!c) return;

    const display = document.getElementById('entry-display');
    if (!display) return;

    /* ── Build the entry shell ── */
    display.innerHTML = `
      <div class="ed-meta">
        <span>${fmtDateTime(entry.date, entry.time || '')}</span>
        ${badge(entry.flair)}
      </div>
      <div class="ed-title" id="edt-${entry.id}"></div>
      <hr class="ed-hr">
      <div class="ed-body"  id="edc-${entry.id}"></div>
      <div class="ed-actions">
        <button class="btn-del" onclick="removeEntry('${entry.id}')">Delete entry</button>
      </div>`;

    const tEl = document.getElementById(`edt-${entry.id}`);
    const cEl = document.getElementById(`edc-${entry.id}`);

    /* ── Animation-safe content ──────────────────────────────────
       Strip every <cs>…</cs> block entirely so nothing leaks
       during the glitch — not even ████ characters.
    ─────────────────────────────────────────────────────────── */
    const animContent = c.content.replace(/<cs>[\s\S]*?<\/cs>/gi, '');

    /* ── Final rendering ─────────────────────────────────────────
       Called once the animation (or immediate path) is done.
       Swaps raw/stripped text for proper name-highlighted HTML
       with ████ censor blocks — all appearing simultaneously.
    ─────────────────────────────────────────────────────────── */
    const applyFinal = () => {
      /* Name-highlighting + ████ blocks (patch2 helper) */
      if (typeof renderContentHTML === 'function') {
        cEl.innerHTML = renderContentHTML(c.content, entry.id);
      } else {
        /* Graceful fallback if patch2 isn't loaded */
        const safe = c.content.replace(/<cs>[\s\S]*?<\/cs>/gi, '████');
        cEl.textContent = safe;
      }

      cEl.classList.remove('decrypting');

      /* Edited-at badge */
      _p3_applyEditedBadge(entry, tEl);
    };

    /* ── Animated path (first unlock) ── */
    if (animate) {
      tEl.classList.add('decrypting');
      cEl.classList.add('decrypting');

      /* Title glitch */
      window.animDecrypt(tEl, c.title, 7)
        .then(() => tEl.classList.remove('decrypting'));

      /* Body glitch — animContent has no <cs> fragments, so nothing leaks.
         applyFinal() fires the moment the Promise resolves, replacing the
         now-settled plaintext with full HTML including ████ blocks. */
      setTimeout(
        () => window.animDecrypt(cEl, animContent, 10).then(applyFinal),
        220
      );

    /* ── Non-animated path (entry switching while unlocked) ── */
    } else {
      tEl.textContent = c.title;
      applyFinal();
    }
  };
}

/* ── Edited-at badge helper (mirrors patch2 logic) ── */
function _p3_applyEditedBadge(entry, tEl) {
  if (!entry.edited_at || !tEl || tEl.querySelector('.edited-badge')) return;
  const b = document.createElement('span');
  b.className   = 'edited-badge';
  b.title       = 'Last edited: ' + new Date(entry.edited_at).toLocaleString();
  b.textContent = 'edited';
  tEl.appendChild(b);
}
