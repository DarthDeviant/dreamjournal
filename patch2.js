/* ═══════════════════════════════════════════════════════════════
   patch2.js  —  Dream Journal extensions  (v2)
   • Dream Statistics panel
   • Proper-name frequency colouring in entry bodies
   • <cs>name</cs> censoring — encrypted at save time with AES-GCM,
     shows ████ in viewer, revealed only via /uncensor
   • Terminal overlay  (user: der_anfang / pass: anfangistende)
     commands: /help /list /edit /delete /stats /uncensor /clear /exit
   • Edited-at badge on entries
   • Encrypting flash + real lock on wrong passphrase or ESC
   • Close button (×) with fallback chain
═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => setTimeout(p2init, 400));

/* ════════════════════════════════════════════
   STYLES
════════════════════════════════════════════ */
const P2_CSS = `
.nh-high { color:#c9b8f0; border-bottom:1px dotted #c9b8f066; }
.nh-mid  { color:#7ecec4; border-bottom:1px dotted #7ecec466; }
.nh-low  { color:#e8d87a; border-bottom:1px dotted #e8d87a66; }

.cs-block {
  display:inline-block; background:var(--ink); color:var(--ink);
  letter-spacing:2px; padding:0 3px; user-select:none; cursor:default;
  font-size:.9em; vertical-align:baseline; transition:background .15s, color .15s;
}
.cs-block:hover { background:var(--mark-err); color:var(--mark-err); }

#stats-panel {
  position:fixed; inset:0; background:var(--paper); z-index:190;
  display:none; flex-direction:column; font-family:'IBM Plex Mono',monospace;
}
#stats-panel.show { display:flex; }
.sp-titlebar {
  background:var(--ink); color:var(--paper);
  padding:5px 12px; font-size:11px; letter-spacing:1px;
  display:flex; align-items:center; justify-content:space-between;
}
.sp-close {
  background:none; border:1px solid rgba(255,255,255,.2); cursor:pointer;
  font-family:'IBM Plex Mono',monospace; font-size:11px;
  color:var(--paper-dim); letter-spacing:1px; padding:1px 6px;
}
.sp-close:hover { background:var(--mark-err); color:#fff; border-color:var(--mark-err); }
.sp-body {
  flex:1; overflow-y:auto; padding:28px 32px;
  display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:20px;
  align-content:start;
}
.sp-card { border:1px solid var(--rule-dark); background:var(--paper-dim); padding:16px 18px; }
.sp-card-title {
  font-size:9px; letter-spacing:2px; color:var(--ink-faint);
  text-transform:uppercase; margin-bottom:12px;
}
.sp-card-title::before { content:'// '; color:var(--ink-ghost); }
.sp-big { font-family:'VT323',monospace; font-size:52px; color:var(--ink); line-height:1; }
.sp-sub { font-size:10px; color:var(--ink-soft); margin-top:4px; letter-spacing:1px; }
.sp-bar-row { display:flex; align-items:center; gap:8px; margin-bottom:7px; font-size:10px; }
.sp-bar-lbl { width:72px; flex-shrink:0; color:var(--ink-soft); text-transform:capitalize; }
.sp-bar-track { flex:1; background:var(--paper-mid); height:6px; }
.sp-bar-fill  { height:6px; background:var(--ink-soft); transition:width .4s; }
.sp-bar-n { width:22px; text-align:right; flex-shrink:0; color:var(--ink-faint); }
.sp-name-row { display:flex; justify-content:space-between; margin-bottom:6px; font-size:11px; }
.sp-name-count { color:var(--ink-faint); }

#p2-terminal {
  position:fixed; inset:0; background:rgba(0,0,0,.88);
  z-index:300; display:none; align-items:center; justify-content:center;
}
#p2-terminal.show { display:flex; }
.trm-box {
  background:#0a0a08; border:1px solid #3a3630;
  width:min(680px,97vw); height:min(500px,88vh);
  display:flex; flex-direction:column;
  font-family:'IBM Plex Mono',monospace; font-size:13px;
  box-shadow:0 0 60px rgba(0,0,0,.8);
}
.trm-titlebar {
  background:#1e1c17; padding:5px 12px; font-size:10px;
  letter-spacing:1.5px; color:#4e4840;
  display:flex; align-items:center; justify-content:space-between;
  flex-shrink:0;
}
.trm-titlebar span:first-child::before { content:'> '; color:#2e2b25; }
.trm-close-btn {
  background:none; border:1px solid #3a3630; cursor:pointer;
  font-family:'IBM Plex Mono',monospace; font-size:10px;
  color:#4e4840; padding:1px 5px; letter-spacing:1px;
}
.trm-close-btn:hover { background:#2a1010; color:#c85050; border-color:#c85050; }
#trm-output {
  flex:1; overflow-y:auto; padding:14px 16px;
  color:#b0a99e; line-height:1.9; white-space:pre-wrap; word-break:break-word;
}
#trm-output .trm-err  { color:#c85050; }
#trm-output .trm-ok   { color:#7ab87a; }
#trm-output .trm-warn { color:#c8a040; }
#trm-output .trm-dim  { color:#4e4840; }
#trm-output .trm-head { color:#d4cfc6; letter-spacing:1px; }
#trm-output .trm-bar  { color:#7ecec4; font-size:12px; letter-spacing:.5px; }
.trm-input-row {
  display:flex; align-items:center;
  border-top:1px solid #252219; padding:8px 16px; flex-shrink:0;
}
.trm-prompt { color:#7a7268; margin-right:8px; flex-shrink:0; }
#trm-input {
  flex:1; background:transparent; border:none; outline:none;
  color:#d4cfc6; font-family:'IBM Plex Mono',monospace; font-size:13px;
  caret-color:#d4cfc6;
}
#trm-trigger {
  background:transparent; border:1px solid var(--ink-ghost);
  color:var(--ink-faint); font-family:'IBM Plex Mono',monospace;
  font-size:10px; letter-spacing:.5px; cursor:pointer;
  padding:1px 6px; flex-shrink:0; transition:all .15s;
  -webkit-tap-highlight-color:transparent; line-height:1.6;
}
#trm-trigger:hover, #trm-trigger:active { background:var(--ink-ghost); color:var(--ink); }

.edited-badge {
  font-size:9px; color:var(--ink-faint); letter-spacing:1px;
  border:1px solid var(--ink-ghost); padding:1px 5px;
  margin-left:8px; vertical-align:middle; text-transform:uppercase;
}

#enc-flash-ov {
  position:fixed; inset:0; z-index:9999; background:var(--paper);
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:18px; pointer-events:none; font-family:'IBM Plex Mono',monospace;
}
#enc-flash-ov .ef-glyph { font-family:'VT323',monospace; font-size:80px; line-height:1; color:var(--ink-ghost); letter-spacing:4px; }
#enc-flash-ov .ef-label { font-size:11px; letter-spacing:4px; text-transform:uppercase; color:var(--ink-soft); }
#enc-flash-ov .ef-bar   { font-size:11px; color:var(--ink-faint); letter-spacing:1px; width:200px; text-align:center; }

/* ── edit modal ── */
#p2-edit-modal {
  position:fixed; inset:0; background:rgba(0,0,0,.85);
  z-index:350; display:none; align-items:center; justify-content:center;
}
#p2-edit-modal.show { display:flex; }
.p2em-box {
  background:var(--paper); border:1px solid var(--rule-dark);
  width:min(720px,97vw); height:min(560px,90vh);
  display:flex; flex-direction:column;
  font-family:'IBM Plex Mono',monospace;
  box-shadow:0 0 60px rgba(0,0,0,.7);
}
.p2em-titlebar {
  background:var(--ink); color:var(--paper);
  padding:5px 12px; font-size:11px; letter-spacing:1px;
  display:flex; align-items:center; justify-content:space-between; flex-shrink:0;
}
.p2em-close {
  background:none; border:1px solid rgba(255,255,255,.2); cursor:pointer;
  font-family:'IBM Plex Mono',monospace; font-size:11px;
  color:var(--paper-dim); letter-spacing:1px; padding:1px 6px;
}
.p2em-close:hover { background:var(--mark-err); color:#fff; border-color:var(--mark-err); }
.p2em-meta {
  padding:10px 16px; border-bottom:1px solid var(--rule-dark);
  background:var(--paper-dim); display:flex; gap:12px; flex-wrap:wrap;
  align-items:center; flex-shrink:0;
}
.p2em-field { display:flex; flex-direction:column; gap:4px; }
.p2em-label { font-size:9px; letter-spacing:2px; color:var(--ink-faint); text-transform:uppercase; }
.p2em-label::before { content:'// '; color:var(--ink-ghost); }
.p2em-input {
  background:var(--paper); border:1px solid var(--rule-dark);
  border-bottom:2px solid var(--ink-soft); color:var(--ink);
  font-family:'IBM Plex Mono',monospace; font-size:12px;
  padding:5px 8px; outline:none; border-radius:0; -webkit-appearance:none;
}
.p2em-input:focus { border-bottom-color:var(--ink); }
.p2em-flair-row { display:flex; gap:5px; flex-wrap:wrap; }
.p2em-fr { display:none; }
.p2em-fr + label {
  display:inline-flex; align-items:center; padding:3px 8px;
  border:1px solid var(--rule-dark); font-size:9px; letter-spacing:1px;
  cursor:pointer; font-family:'IBM Plex Mono',monospace;
  color:var(--ink-soft); text-transform:uppercase;
  background:var(--paper-dim); transition:all .12s;
}
.p2em-fr:checked + label { background:var(--ink); color:var(--paper); border-color:var(--ink); }
.p2em-hint {
  font-size:9px; color:var(--ink-ghost); letter-spacing:1px;
  padding:5px 16px; border-bottom:1px solid var(--rule);
  background:var(--paper-dim); flex-shrink:0;
}
.p2em-hint code { color:var(--ink-faint); }
#p2em-content {
  flex:1; resize:none; background:var(--paper);
  border:none; border-left:3px solid var(--rule-dark); color:var(--ink);
  font-family:'IBM Plex Mono',monospace; font-size:13px;
  line-height:1.75; padding:20px 24px; outline:none;
  font-style:italic; tab-size:2;
}
#p2em-content:focus { border-left-color:var(--ink-soft); font-style:normal; }
.p2em-loading {
  flex:1; display:flex; align-items:center; justify-content:center;
  font-size:11px; letter-spacing:2px; color:var(--ink-faint);
  text-transform:uppercase;
}
.p2em-footer {
  padding:8px 16px; border-top:1px solid var(--rule-dark);
  background:var(--paper-dim); display:flex; gap:8px;
  justify-content:flex-end; flex-shrink:0;
}
.p2em-btn {
  font-family:'IBM Plex Mono',monospace; font-size:11px;
  letter-spacing:1px; padding:6px 14px; cursor:pointer;
  border:1px solid var(--rule-dark); text-transform:uppercase; transition:all .15s;
}
.p2em-btn-cancel { background:transparent; color:var(--ink-soft); }
.p2em-btn-cancel:hover { background:var(--paper-mid); }
.p2em-btn-save { background:var(--ink); color:var(--paper); border-color:var(--ink); }
.p2em-btn-save:hover { opacity:.8; }

@media (max-width:640px) {
  .sp-body { padding:14px 14px; }
  .p2em-meta { flex-direction:column; align-items:stretch; }
  .p2em-input { font-size:16px; }
  #p2em-content { font-size:16px; padding:14px; }
}
`;

(function injectStyles(){
  const s = document.createElement('style');
  s.textContent = P2_CSS;
  document.head.appendChild(s);
})();

/* ════════════════════════════════════════════
   LOCAL CRYPTO HELPERS
════════════════════════════════════════════ */
const _enc = new TextEncoder();
const _dec = new TextDecoder();
const _b64   = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const _unb64 = s   => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function _p2DeriveKey(pw, salt) {
  const km = await crypto.subtle.importKey('raw', _enc.encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name:'PBKDF2', salt, iterations:100000, hash:'SHA-256' },
    km,
    { name:'AES-GCM', length:256 },
    false,
    ['encrypt','decrypt']
  );
}

async function _p2EncStr(text, pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const key  = await _p2DeriveKey(pw, salt);
  const ct   = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, key, _enc.encode(text));
  return { salt: _b64(salt), iv: _b64(iv), data: _b64(ct) };
}

async function _p2DecStr(obj, pw) {
  const key = await _p2DeriveKey(pw, _unb64(obj.salt));
  const pt  = await crypto.subtle.decrypt(
    { name:'AES-GCM', iv: _unb64(obj.iv) },
    key,
    _unb64(obj.data)
  );
  return _dec.decode(pt);
}

/* ════════════════════════════════════════════
   CS ENCRYPTION LAYER
════════════════════════════════════════════ */
const CS_ENC_PREFIX = 'ENC:';

async function encryptCSName(name, pw) {
  const obj     = await _p2EncStr(name, pw);
  const payload = btoa(JSON.stringify(obj));
  return CS_ENC_PREFIX + payload;
}

async function decryptCSName(encoded, pw) {
  if (!encoded.startsWith(CS_ENC_PREFIX)) return encoded;
  const obj = JSON.parse(atob(encoded.slice(CS_ENC_PREFIX.length)));
  return _p2DecStr(obj, pw);
}

async function processCSForSave(content, pw) {
  if (!content.includes('<cs>')) return content;
  const parts = content.split(/(<cs>[\s\S]*?<\/cs>)/gi);
  const out   = await Promise.all(parts.map(async part => {
    const m = part.match(/^<cs>([\s\S]*?)<\/cs>$/i);
    if (!m) return part;
    const inner = m[1];
    if (inner.startsWith(CS_ENC_PREFIX)) return part;
    const enc = await encryptCSName(inner, pw);
    return `<cs>${enc}</cs>`;
  }));
  return out.join('');
}

async function processCSForEdit(content, pw) {
  if (!content.includes('<cs>')) return content;
  const parts = content.split(/(<cs>[\s\S]*?<\/cs>)/gi);
  const out   = await Promise.all(parts.map(async part => {
    const m = part.match(/^<cs>([\s\S]*?)<\/cs>$/i);
    if (!m) return part;
    const inner = m[1];
    if (!inner.startsWith(CS_ENC_PREFIX)) return part;
    try {
      const name = await decryptCSName(inner, pw);
      return `<cs>${name}</cs>`;
    } catch {
      return part;
    }
  }));
  return out.join('');
}

/* ════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════ */
const $p = id => document.getElementById(id);

function waitFor(fn, ms = 60, limit = 60) {
  return new Promise((res, rej) => {
    let i = 0;
    const t = setInterval(() => {
      const v = fn();
      if (v) { clearInterval(t); res(v); }
      else if (++i > limit) { clearInterval(t); rej(); }
    }, ms);
  });
}

function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escReg(s) { return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }

/* ════════════════════════════════════════════
   NAME HIGHLIGHTING
════════════════════════════════════════════ */
function extractProperNames(text) {
  const freq = {};
  const sentences = text.split(/(?<=[.!?])\s+/);
  for (const sent of sentences) {
    const tokens = sent.trim().split(/\s+/);
    for (let i = 1; i < tokens.length; i++) {
      const raw = tokens[i].replace(/[^a-zA-Z'-]/g,'');
      if (raw.length >= 3 && /^[A-Z]/.test(raw)) {
        const key = raw.toLowerCase();
        freq[key] = (freq[key] || 0) + 1;
      }
    }
  }
  return freq;
}

function colorizeNames(text, freq) {
  if (!text || !Object.keys(freq).length) return escHtml(text);
  const names = Object.keys(freq).sort((a,b) => b.length - a.length);
  let result = escHtml(text);
  for (const name of names) {
    const count = freq[name];
    let cls;
    if      (count >= 6) cls = 'nh-high';
    else if (count >= 3) cls = 'nh-mid';
    else if (count >= 2) cls = 'nh-low';
    else continue;
    const cap = name[0].toUpperCase() + name.slice(1);
    const re  = new RegExp(`(?<![a-zA-Z])(${escReg(cap)})(?![a-zA-Z])`, 'g');
    result = result.replace(re, `<span class="${cls}" title="${count}×">$1</span>`);
  }
  return result;
}

/* ════════════════════════════════════════════
   CENSORING SYSTEM
════════════════════════════════════════════ */
const censorMap = new Map();
const CS_RE = /(<cs>[\s\S]*?<\/cs>)/gi;

function splitCensored(content) {
  return content.split(CS_RE).map(part => {
    const m = part.match(/^<cs>([\s\S]*?)<\/cs>$/i);
    if (!m) return { type:'plain', text: part };
    const inner = m[1];
    return { type:'censored', raw: inner, isEncrypted: inner.startsWith(CS_ENC_PREFIX) };
  });
}

function renderContentHTML(content, entryId) {
  const parts    = splitCensored(content);
  const plainOnly = parts.filter(p => p.type === 'plain').map(p => p.text).join(' ');
  const freq      = extractProperNames(plainOnly);

  const html = parts.map(p => {
    if (p.type === 'censored') {
      const tip = p.isEncrypted
        ? '[encrypted name — use /uncensor in terminal]'
        : '[censored — use /uncensor in terminal]';
      return `<span class="cs-block" title="${tip}" data-cs-enc="${p.isEncrypted ? '1':'0'}">████</span>`;
    }
    return colorizeNames(p.text, freq);
  }).join('');

  const hasCensored = parts.some(p => p.type === 'censored');
  if (hasCensored) censorMap.set(entryId, true);
  else censorMap.delete(entryId);

  return html;
}

/* ════════════════════════════════════════════
   SAFE CONTENT — strips <cs> for animation
   Replaces any <cs>…</cs> span with ████ so
   the glitch animation never reveals names.
════════════════════════════════════════════ */
function safeContentForAnimation(content) {
  return content.replace(/<cs>[\s\S]*?<\/cs>/gi, '████');
}

/* ════════════════════════════════════════════
   HOOK renderDecrypted
   ─ Intercepts BEFORE textContent / animDecrypt
     gets the raw content string.
   ─ Passes cs-scrubbed text to animation,
     then immediately replaces body innerHTML
     with proper renderContentHTML output.
════════════════════════════════════════════ */
function hookRenderDecrypted() {
  const orig = window.renderDecrypted;
  if (typeof orig !== 'function') {
    console.warn('[patch2] renderDecrypted not found on window — cs hook skipped');
    return;
  }

  window.renderDecrypted = function p2_renderDecrypted(entry, animate) {
    const S      = window.S;
    const cached = S?.cache.get(entry.id);

    // No cached content — fall through to original (shows encrypted state anyway)
    if (!cached || !cached.content.includes('<cs>')) {
      orig(entry, animate);
      return;
    }

    // Build a version of the cache with cs-scrubbed content for animation/textContent
    const safeContent = safeContentForAnimation(cached.content);

    // Temporarily swap content in cache so orig() never sees raw <cs> data
    const realContent  = cached.content;
    cached.content     = safeContent;
    orig(entry, animate);
    cached.content     = realContent; // restore immediately

    // Now apply proper censored HTML rendering.
    // For animated entries the animation is running concurrently; we schedule
    // the innerHTML swap just after the animation would finish on the body element.
    // animDecrypt speed is ~10ms/tick for body; worst-case ~300 chars → ~600ms.
    // We poll until the .decrypting class is gone, then apply, capped at 1.5s.
    const applyRendered = () => {
      const cEl = document.getElementById(`edc-${entry.id}`);
      if (!cEl || cEl.classList.contains('enc')) return; // wrong state
      if (cEl.dataset.p2id === entry.id) return;         // already applied
      cEl.dataset.p2id = entry.id;
      cEl.innerHTML    = renderContentHTML(realContent, entry.id);

      // Edited badge
      const tEl = document.getElementById(`edt-${entry.id}`);
      if (entry.edited_at && tEl && !tEl.querySelector('.edited-badge')) {
        const badge       = document.createElement('span');
        badge.className   = 'edited-badge';
        badge.title       = 'Last edited: ' + new Date(entry.edited_at).toLocaleString();
        badge.textContent = 'edited';
        tEl.appendChild(badge);
      }
    };

    if (!animate) {
      // Non-animated (entry switching): apply on next microtask — element exists already
      Promise.resolve().then(applyRendered);
    } else {
      // Animated: poll until decrypting class is removed (animation done), max 1.8s
      let elapsed = 0;
      const POLL  = 80;
      const MAX   = 1800;
      const poll  = setInterval(() => {
        elapsed += POLL;
        const cEl = document.getElementById(`edc-${entry.id}`);
        const done = !cEl || !cEl.classList.contains('decrypting');
        if (done || elapsed >= MAX) {
          clearInterval(poll);
          applyRendered();
        }
      }, POLL);
    }
  };
}

/* ════════════════════════════════════════════
   WATCH entry-display — MutationObserver
   Kept as a safety net for any other render
   paths, but the primary fix is hookRenderDecrypted.
════════════════════════════════════════════ */
function watchForDecryptedContent() {
  const display = $p('entry-display');
  if (!display) return;

  const apply = () => {
    const cEl = display.querySelector('.ed-body:not(.enc):not(.decrypting)');
    if (!cEl) return;
    const tEl = display.querySelector('[id^="edt-"]:not(.enc)');
    const id  = tEl ? tEl.id.replace('edt-','') : null;
    const S   = window.S;
    if (!S || !id) return;
    const c = S.cache.get(id);
    if (!c) return;
    if (cEl.dataset.p2id === id) return; // already handled by hookRenderDecrypted
    cEl.dataset.p2id = id;
    cEl.innerHTML    = renderContentHTML(c.content, id);

    if (tEl && !tEl.querySelector('.edited-badge')) {
      const entry = S.entries.find(e => e.id === id);
      if (entry?.edited_at) {
        const badge       = document.createElement('span');
        badge.className   = 'edited-badge';
        badge.title       = 'Last edited: ' + new Date(entry.edited_at).toLocaleString();
        badge.textContent = 'edited';
        tEl.appendChild(badge);
      }
    }
  };

  let _timer = null;
  const obs = new MutationObserver(() => {
    // Immediate pass for non-animated renders; short delay as fallback
    apply();
    clearTimeout(_timer);
    _timer = setTimeout(apply, 120);
  });
  obs.observe(display, { childList:true, subtree:true, attributes:true, attributeFilter:['class','style'] });
}

/* ════════════════════════════════════════════
   ENCRYPTING FLASH + REAL LOCK
════════════════════════════════════════════ */
const GC_CHARS = '░▒▓▄▀■□-~*+=#@&%?!./|:;ABCDEFGHJKMNPQRSTUVXYZabcdefghjkmnpqrstuvxyz0123456789';
function randGC() { return GC_CHARS[Math.floor(Math.random() * GC_CHARS.length)]; }

function showEncryptingFlash(thenLock = false) {
  const display = $p('entry-display');
  if (display && display.style.display !== 'none') {
    const titleEl = display.querySelector('.ed-title:not(.enc)');
    const bodyEl  = display.querySelector('.ed-body:not(.enc)');
    [titleEl, bodyEl].filter(Boolean).forEach(el => {
      const len = Math.min(el.textContent.length, 300);
      el.textContent = Array.from({length: len}, randGC).join('');
    });
  }
  document.querySelectorAll('#entry-list .ec-title:not(.enc)').forEach(el => {
    el.textContent = Array.from({length: el.textContent.length}, randGC).join('');
  });

  $p('enc-flash-ov')?.remove();
  const ov    = document.createElement('div'); ov.id = 'enc-flash-ov';
  const glyph = document.createElement('div'); glyph.className = 'ef-glyph'; glyph.textContent = '▓';
  const label = document.createElement('div'); label.className = 'ef-label'; label.textContent = 'ENCRYPTING...';
  const bar   = document.createElement('div'); bar.className = 'ef-bar';
  ov.append(glyph, label, bar);
  document.body.appendChild(ov);

  let frame = 0, step = 0;
  const LABEL = 'ENCRYPTING...', STEPS = 20;
  const iv = setInterval(() => {
    label.textContent = frame % 4 < 2 ? LABEL : Array.from(LABEL, ch => ch === '.' ? '.' : randGC()).join('');
    step = Math.min(step + 1, STEPS);
    const filled = Math.round((step / STEPS) * 16);
    bar.textContent = '[' + '█'.repeat(filled) + '░'.repeat(16 - filled) + ']';
    frame++;
  }, 45);

  setTimeout(() => {
    clearInterval(iv);
    label.textContent = 'ENCRYPTED';
    bar.textContent = '[████████████████]';
    ov.style.transition = 'opacity 0.35s ease';
    ov.style.opacity = '0';
    setTimeout(() => {
      ov.remove();
      if (thenLock && window.S?.unlocked) window.lock?.();
    }, 350);
  }, 750);
}

function hookWrongPassword() {
  const pwInp = $p('pw-input');
  if (!pwInp) return;
  new MutationObserver(() => {
    if (pwInp.classList.contains('shake')) showEncryptingFlash(true);
  }).observe(pwInp, { attributes:true, attributeFilter:['class'] });
}

function hookEscLock() {
  document.addEventListener('keydown', e => {
    if (e.target.id === 'pw-input' && e.key === 'Escape' && window.S?.unlocked) {
      showEncryptingFlash(false);
    }
  }, true);
}

/* ════════════════════════════════════════════
   CLOSE BUTTON
════════════════════════════════════════════ */
function hookCloseButton() {
  const closeBtn = document.querySelector('.tb-btn[title="close"]');
  if (!closeBtn) return;
  closeBtn.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    window.close();
    setTimeout(() => {
      if (!window.closed) {
        if (window.history.length > 1) window.history.back();
        else window.location.replace('about:blank');
      }
    }, 100);
  });
}

/* ════════════════════════════════════════════
   STATISTICS PANEL
════════════════════════════════════════════ */
function buildStatsPanel() {
  const panel = document.createElement('div');
  panel.id = 'stats-panel';
  panel.innerHTML = `
    <div class="sp-titlebar">
      <span>DREAM_JOURNAL.EXE — Statistics</span>
      <button class="sp-close" id="sp-close">[ close ]</button>
    </div>
    <div class="sp-body" id="sp-body"></div>`;
  document.body.appendChild(panel);
  $p('sp-close').onclick = () => panel.classList.remove('show');
}

function openStats() {
  const S = window.S;
  if (!S) return;
  if (!S.unlocked) { window.notify?.('Unlock journal first.', 'err'); return; }

  const entries = S.entries, total = entries.length;
  const cached  = [...S.cache.values()];
  const flairCounts = { no_record:0, vague:0, vivid:0, lucid:0, astral:0 };
  entries.forEach(e => { if (flairCounts[e.flair] !== undefined) flairCounts[e.flair]++; });
  const maxFlair = Math.max(...Object.values(flairCounts), 1);

  const totalWords = cached.reduce((s,c) => s + c.content.replace(/<cs>[\s\S]*?<\/cs>/gi,'').split(/\s+/).filter(Boolean).length, 0);
  const avgWords   = total ? Math.round(totalWords / total) : 0;

  const monthMap = {};
  entries.forEach(e => { const m = e.date.slice(0,7); monthMap[m] = (monthMap[m]||0)+1; });
  const months = Object.keys(monthMap).sort().slice(-6);

  const days = new Set(entries.map(e => e.date));
  let streak = 0, d = new Date();
  while (true) { const ds = d.toISOString().split('T')[0]; if (days.has(ds)) { streak++; d.setDate(d.getDate()-1); } else break; }

  const allText  = cached.map(c => c.content.replace(/<cs>[\s\S]*?<\/cs>/gi,'')).join(' ');
  const nameFreq = extractProperNames(allText);
  const topNames = Object.entries(nameFreq).sort((a,b) => b[1]-a[1]).slice(0,8);

  const hours = Array(24).fill(0);
  entries.forEach(e => { if (e.time) { const h = parseInt(e.time.split(':')[0]); if (!isNaN(h)) hours[h]++; } });
  const peakHour  = hours.indexOf(Math.max(...hours));
  const peakLabel = peakHour===0?'12 AM':peakHour<12?`${peakHour} AM`:peakHour===12?'12 PM':`${peakHour-12} PM`;

  const CS_RE2 = /<cs>[\s\S]*?<\/cs>/gi;
  const censoredCount = entries.filter(e => { const c = S.cache.get(e.id); return c && CS_RE2.test(c.content); }).length;

  $p('sp-body').innerHTML = `
    <div class="sp-card">
      <div class="sp-card-title">Total Entries</div>
      <div class="sp-big">${total}</div>
      <div class="sp-sub">${totalWords.toLocaleString()} words &nbsp;·&nbsp; ~${avgWords} avg/entry</div>
    </div>
    <div class="sp-card">
      <div class="sp-card-title">Current Streak</div>
      <div class="sp-big">${streak}</div>
      <div class="sp-sub">consecutive day${streak===1?'':'s'}</div>
    </div>
    <div class="sp-card">
      <div class="sp-card-title">Peak Log Time</div>
      <div class="sp-big" style="font-size:38px;padding-top:6px">${hours.some(h=>h>0)?peakLabel:'—'}</div>
      <div class="sp-sub">most entries logged at this hour</div>
    </div>
    <div class="sp-card">
      <div class="sp-card-title">Redacted Entries</div>
      <div class="sp-big">${censoredCount}</div>
      <div class="sp-sub">entr${censoredCount===1?'y':'ies'} with &lt;cs&gt; censoring &nbsp;·&nbsp; /uncensor to view</div>
    </div>
    <div class="sp-card">
      <div class="sp-card-title">Classification Breakdown</div>
      ${Object.entries(flairCounts).map(([k,v]) => `
        <div class="sp-bar-row">
          <span class="sp-bar-lbl">${k.replace('_',' ')}</span>
          <div class="sp-bar-track"><div class="sp-bar-fill" style="width:${Math.round(v/maxFlair*100)}%"></div></div>
          <span class="sp-bar-n">${v}</span>
        </div>`).join('')}
    </div>
    <div class="sp-card">
      <div class="sp-card-title">Entries / Month</div>
      ${months.length ? months.map(m => {
        const maxM = Math.max(...months.map(mm=>monthMap[mm]),1);
        return `<div class="sp-bar-row">
          <span class="sp-bar-lbl" style="width:56px">${m.slice(5)}</span>
          <div class="sp-bar-track"><div class="sp-bar-fill" style="width:${Math.round(monthMap[m]/maxM*100)}%"></div></div>
          <span class="sp-bar-n">${monthMap[m]}</span>
        </div>`;}).join('') : '<span style="color:var(--ink-ghost);font-size:11px">No data yet</span>'}
    </div>
    <div class="sp-card">
      <div class="sp-card-title">Recurring Names</div>
      ${topNames.length ? topNames.map(([n,c]) => {
        const cls = c>=6?'nh-high':c>=3?'nh-mid':'nh-low';
        return `<div class="sp-name-row"><span class="${cls}">${n[0].toUpperCase()+n.slice(1)}</span><span class="sp-name-count">${c}×</span></div>`;
      }).join('') : '<span style="color:var(--ink-ghost);font-size:11px">Unlock entries to scan</span>'}
    </div>`;

  $p('stats-panel').classList.add('show');
}

function injectStatsButton() {
  if ($p('menu-stats')) return;
  const exportItem = $p('menu-export');
  if (!exportItem) return;
  const si = document.createElement('span');
  si.className = 'menu-item'; si.id = 'menu-stats';
  si.innerHTML = '<span class="ul">S</span>tats';
  si.addEventListener('click', openStats);
  exportItem.parentNode.insertBefore(si, exportItem.nextSibling);
}

/* ════════════════════════════════════════════
   TERMINAL — LOADING BAR
════════════════════════════════════════════ */
async function trmProgressBar(label, total, msPerStep = 38) {
  const BARS = 18, out = $p('trm-output');
  const line = document.createElement('div');
  line.className = 'trm-bar';
  out.appendChild(line);
  for (let i = 0; i <= total; i++) {
    const filled = Math.round((i/total)*BARS);
    line.textContent = `${label}: [${'█'.repeat(filled)}${'░'.repeat(BARS-filled)}] ${Math.round((i/total)*100)}%`;
    out.scrollTop = out.scrollHeight;
    if (i < total) await new Promise(r => setTimeout(r, msPerStep));
  }
}

/* ════════════════════════════════════════════
   TERMINAL
════════════════════════════════════════════ */
const TRM_USER = 'der_anfang';
const TRM_PASS = 'anfangistende';
let trmState     = { authed:false, history:[], histIdx:-1 };
let trmLoginStep = 0;
let _pendingUser = '';
let _deleteCtx   = null;

function buildTerminal() {
  if ($p('p2-terminal')) return;
  const trm = document.createElement('div');
  trm.id = 'p2-terminal';
  trm.innerHTML = `
    <div class="trm-box">
      <div class="trm-titlebar">
        <span>DREAM_TERMINAL v2.0</span>
        <button class="trm-close-btn" id="trm-close-btn">[ × ]</button>
      </div>
      <div id="trm-output"></div>
      <div class="trm-input-row">
        <span class="trm-prompt" id="trm-prompt">login:~$</span>
        <input id="trm-input" type="text" autocomplete="off" spellcheck="false" autocorrect="off">
      </div>
    </div>`;
  document.body.appendChild(trm);
  $p('trm-close-btn').onclick = closeTerminal;
  trm.addEventListener('click', e => { if (e.target === trm) closeTerminal(); });
  $p('trm-input').addEventListener('keydown', onTrmKey);
}

function trmPrint(text = '', cls = '') {
  const out = $p('trm-output'), line = document.createElement('div');
  if (cls) line.className = cls;
  line.textContent = text;
  out.appendChild(line); out.scrollTop = out.scrollHeight;
}
function trmPrintHTML(html, cls = '') {
  const out = $p('trm-output'), line = document.createElement('div');
  if (cls) line.className = cls;
  line.innerHTML = html;
  out.appendChild(line); out.scrollTop = out.scrollHeight;
}
function trmClear() { if ($p('trm-output')) $p('trm-output').innerHTML = ''; }

function openTerminal() {
  if (!$p('p2-terminal')) buildTerminal();
  trmState.authed = false; trmState.history = []; trmState.histIdx = -1;
  trmLoginStep = 0; _pendingUser = ''; _deleteCtx = null;
  trmClear();
  $p('trm-prompt').textContent = 'login:~$';
  $p('trm-input').type = 'text';
  $p('trm-input').value = '';
  const inp    = $p('trm-input');
  const newInp = inp.cloneNode(true);
  inp.parentNode.replaceChild(newInp, inp);
  newInp.addEventListener('keydown', onTrmKey);
  trmPrint('DREAM_TERMINAL  —  restricted access', 'trm-head');
  trmPrint('─────────────────────────────────────', 'trm-dim');
  trmPrint('Username:');
  $p('p2-terminal').classList.add('show');
  setTimeout(() => newInp.focus(), 80);
}
function closeTerminal() { $p('p2-terminal')?.classList.remove('show'); }

function onTrmKey(e) {
  const inp = $p('trm-input');
  if (e.key === 'ArrowUp') {
    if (trmState.histIdx < trmState.history.length-1) { trmState.histIdx++; inp.value = trmState.history[trmState.histIdx]; }
    e.preventDefault(); return;
  }
  if (e.key === 'ArrowDown') {
    if (trmState.histIdx > 0) { trmState.histIdx--; inp.value = trmState.history[trmState.histIdx]; }
    else { trmState.histIdx = -1; inp.value = ''; }
    e.preventDefault(); return;
  }
  if (e.key === 'Escape') { closeTerminal(); e.preventDefault(); return; }
  if (e.key !== 'Enter') return;
  const val = inp.value.trim(); inp.value = '';
  if (!trmState.authed) { handleLogin(val); return; }
  if (val) { trmState.history.unshift(val); trmState.histIdx = -1; }
  trmPrint('> ' + val, 'trm-dim');
  handleCommand(val);
}

function handleLogin(val) {
  if (trmLoginStep === 0) {
    trmPrint('Username: ' + val, 'trm-dim');
    _pendingUser = val; trmLoginStep = 1;
    $p('trm-input').type = 'password';
    trmPrint('Password:'); return;
  }
  trmPrint('Password: ••••••••', 'trm-dim');
  $p('trm-input').type = 'text';
  if (_pendingUser === TRM_USER && val === TRM_PASS) {
    trmState.authed = true; trmLoginStep = 0;
    $p('trm-prompt').textContent = 'dream:~$';
    trmPrint(''); trmPrint('Access granted. Welcome, ' + TRM_USER + '.', 'trm-ok');
    trmPrint('Type /help for available commands.', 'trm-dim'); trmPrint('');
  } else {
    trmLoginStep = 0;
    trmPrint(''); trmPrint('Access denied.', 'trm-err'); trmPrint('Username:');
  }
}

function handleCommand(raw) {
  const [cmd, ...args] = raw.trim().split(/\s+/);
  switch (cmd.toLowerCase()) {
    case '/help':     cmdHelp();        break;
    case '/list':     cmdList();        break;
    case '/edit':     cmdEdit(args);    break;
    case '/delete':   cmdDelete(args);  break;
    case '/stats':    cmdStatsTrm();    break;
    case '/uncensor': cmdUncensor(args);break;
    case '/clear':    trmClear();       break;
    case '/exit':     closeTerminal();  break;
    case '':          break;
    default: trmPrint(`Unknown command: ${cmd}  —  type /help`, 'trm-err');
  }
}

function cmdHelp() {
  trmPrint('');
  trmPrint('Available commands', 'trm-head');
  trmPrint('──────────────────────────────────────────────────', 'trm-dim');
  [
    ['/list',                    '    list all entries'],
    ['/edit YYYY-MM-DD',         '    edit an entry (opens full editor)'],
    ['/delete YYYY-MM-DD',       '    delete an entry by date'],
    ['/stats',                   '    quick stats summary'],
    ['/uncensor YYYY-MM-DD|all', '    decrypt and reveal <cs> names'],
    ['/clear',                   '    clear terminal screen'],
    ['/exit',                    '    close terminal'],
  ].forEach(([c,d]) =>
    trmPrintHTML(`<span style="color:var(--ink-mid)">${c}</span><span style="color:var(--ink-faint)">${d}</span>`)
  );
  trmPrint('');
  trmPrint('Censoring tip:', 'trm-dim');
  trmPrint('  Wrap names in <cs>name</cs> — saved as encrypted blob, shown as ████.', 'trm-dim');
  trmPrint('  Decrypted only with journal passphrase via /uncensor.', 'trm-dim');
  trmPrint('');
}

function cmdList() {
  const S = window.S;
  if (!S) { trmPrint('window.S not available.', 'trm-err'); return; }
  if (!S.entries.length) { trmPrint('No entries found.', 'trm-warn'); return; }
  trmPrint('');
  trmPrint('DATE        TIME   FLAIR        REDACTED  TITLE', 'trm-head');
  trmPrint('────────────────────────────────────────────────────', 'trm-dim');
  const CS_RE2 = /<cs>[\s\S]*?<\/cs>/gi;
  S.entries.forEach(e => {
    const cached = S.cache.get(e.id);
    const title  = cached?.title || '[encrypted]';
    const hasCS  = cached?.content && CS_RE2.test(cached.content) ? '  ██ ' : '      ';
    trmPrint(`${e.date}  ${(e.time||'--:--').padEnd(7)}${e.flair.padEnd(13)}${hasCS}${title}`);
  });
  trmPrint('');
}

function cmdStatsTrm() {
  const S = window.S;
  if (!S) { trmPrint('window.S not available.', 'trm-err'); return; }
  const total = S.entries.length;
  const fc    = {};
  S.entries.forEach(e => { fc[e.flair] = (fc[e.flair]||0)+1; });
  const CS_RE2 = /<cs>[\s\S]*?<\/cs>/gi;
  const cens   = S.entries.filter(e => { const c = S.cache.get(e.id); return c && CS_RE2.test(c.content); }).length;
  trmPrint('');
  trmPrint(`Total entries : ${total}`, 'trm-ok');
  Object.entries(fc).forEach(([k,v]) => trmPrint(`  ${k.padEnd(14)}: ${v}`));
  trmPrint(`  ${'redacted'.padEnd(14)}: ${cens} (use /uncensor to view)`, 'trm-warn');
  trmPrint('');
}

async function cmdUncensor(args) {
  const S = window.S;
  if (!S) { trmPrint('window.S not available.', 'trm-err'); return; }
  if (!S.unlocked) { trmPrint('Journal must be unlocked to uncensor.', 'trm-err'); return; }

  const target = (args[0] || '').toLowerCase();
  if (!target) {
    trmPrint('Usage: /uncensor YYYY-MM-DD', 'trm-warn');
    trmPrint('       /uncensor all', 'trm-warn');
    return;
  }

  const CS_RE2 = /<cs>[\s\S]*?<\/cs>/gi;
  let pool;
  if (target === 'all') {
    pool = S.entries.filter(e => S.cache.has(e.id));
  } else {
    const e = S.entries.find(e => e.date === target);
    if (!e) { trmPrint(`No entry for ${target}.`, 'trm-err'); return; }
    pool = [e];
  }

  const censored = pool.filter(e => {
    const c = S.cache.get(e.id);
    return c && CS_RE2.test(c.content);
  });

  if (!censored.length) {
    trmPrint(`No censored content found${target==='all'?'':' for '+target}.`, 'trm-warn');
    return;
  }

  trmPrint('');
  trmPrint(`Decrypting ${censored.length} entr${censored.length>1?'ies':'y'}...`, 'trm-warn');
  await trmProgressBar('Decrypting', censored.length * 6, 32);
  trmPrint('');
  trmPrint('─ UNCENSORED OUTPUT ─────────────────────────────', 'trm-head');
  trmPrintHTML(`  <span style="color:#c9b8f0">purple</span> = decrypted name &nbsp;·&nbsp; terminal-only, not saved`);
  trmPrint('');

  for (const e of censored) {
    const c = S.cache.get(e.id);
    if (!c) continue;

    trmPrintHTML(`<span class="trm-head">── ${escHtml(e.date)}</span><span class="trm-dim">  ${escHtml(e.flair)}</span>`);
    trmPrint(`   ${c.title}`);
    trmPrint('');

    const parts  = splitCensored(c.content);
    const names  = [];
    const htmlParts = await Promise.all(parts.map(async p => {
      if (p.type !== 'censored') return escHtml(p.text);
      let name;
      try {
        name = await decryptCSName(p.raw, S.pw);
      } catch {
        name = '[decrypt failed]';
      }
      if (!names.includes(name)) names.push(name);
      return `<span style="background:#c9b8f022;color:#c9b8f0;padding:0 2px;border-bottom:1px solid #c9b8f088">${escHtml(name)}</span>`;
    }));

    trmPrintHTML(`<div style="color:#7a7268;font-size:11px;line-height:1.9;padding-left:4px">${htmlParts.join('')}</div>`);

    if (names.length) {
      trmPrint('');
      trmPrintHTML(
        `<span class="trm-dim">   revealed names: </span>` +
        names.map(n => `<span style="color:#c9b8f0">${escHtml(n)}</span>`).join('<span class="trm-dim">, </span>')
      );
    }
    trmPrint('');
    trmPrint('─────────────────────────────────────────────────', 'trm-dim');
    trmPrint('');
  }

  trmPrint(`Done. ${censored.length} entr${censored.length>1?'ies':'y'} decrypted.`, 'trm-ok');
  trmPrint('(Visible here only — names re-encrypt on any save.)', 'trm-dim');
  trmPrint('');
}

function cmdEdit(args) {
  const S = window.S;
  if (!S) { trmPrint('window.S not available.', 'trm-err'); return; }
  if (!S.unlocked) { trmPrint('Journal is locked. Unlock it first.', 'trm-err'); return; }
  if (!args[0]) { trmPrint('Usage: /edit YYYY-MM-DD', 'trm-warn'); return; }
  const entry = S.entries.find(e => e.date === args[0]);
  if (!entry) { trmPrint(`No entry found for ${args[0]}.`, 'trm-err'); return; }
  const cached = S.cache.get(entry.id);
  if (!cached) { trmPrint('Entry not decrypted. Unlock first.', 'trm-err'); return; }
  trmPrint('');
  trmPrint(`Opening editor for ${args[0]} — ${cached.title}`, 'trm-ok');
  trmPrint('(Editor opens above — <cs> names are decrypted for editing)', 'trm-dim');
  trmPrint('');
  openEditModal(entry, cached);
}

function cmdDelete(args) {
  const S = window.S;
  if (!S) { trmPrint('window.S not available.', 'trm-err'); return; }
  if (!args[0]) { trmPrint('Usage: /delete YYYY-MM-DD', 'trm-warn'); return; }
  const entry = S.entries.find(e => e.date === args[0]);
  if (!entry) { trmPrint(`No entry for ${args[0]}.`, 'trm-err'); return; }
  trmPrint(`Delete entry from ${args[0]}? (yes/no)`, 'trm-warn');
  _deleteCtx = entry;
  swapInputHandler(onDeleteKey);
}
function onDeleteKey(e) {
  if (e.key !== 'Enter') return;
  const inp = $p('trm-input'), val = inp.value.trim().toLowerCase(); inp.value = '';
  trmPrint('> ' + val, 'trm-dim'); restoreInputHandler();
  if (val === 'yes' || val === 'y') { window.removeEntry?.(_deleteCtx.id); trmPrint('Deleted.', 'trm-ok'); }
  else trmPrint('Cancelled.', 'trm-dim');
  _deleteCtx = null; trmPrint('');
}

function swapInputHandler(fn) {
  const inp = $p('trm-input');
  inp.removeEventListener('keydown', onTrmKey);
  inp.addEventListener('keydown', fn);
}
function restoreInputHandler() {
  const inp = $p('trm-input');
  if (!inp) return;
  inp.removeEventListener('keydown', onDeleteKey);
  inp.removeEventListener('keydown', onTrmKey);
  inp.addEventListener('keydown', onTrmKey);
}

function injectTerminalButton() {
  if ($p('trm-trigger')) return;
  const sb  = $p('statusbar'); if (!sb) return;
  const btn = document.createElement('button');
  btn.id = 'trm-trigger'; btn.title = 'Open Terminal (Ctrl+`)';
  btn.textContent = '>_';
  btn.addEventListener('click', openTerminal);
  const tt = $p('theme-toggle');
  tt ? sb.insertBefore(btn, tt) : sb.appendChild(btn);
}

/* ════════════════════════════════════════════
   EDIT MODAL
════════════════════════════════════════════ */
function buildEditModal() {
  if ($p('p2-edit-modal')) return;
  const el = document.createElement('div');
  el.id = 'p2-edit-modal';
  el.innerHTML = `
    <div class="p2em-box">
      <div class="p2em-titlebar">
        <span id="p2em-heading">EDIT ENTRY</span>
        <button class="p2em-close" id="p2em-close">[ × ]</button>
      </div>
      <div class="p2em-meta">
        <div class="p2em-field" style="flex:1;min-width:180px">
          <span class="p2em-label">Title</span>
          <input class="p2em-input" id="p2em-title" type="text" autocomplete="off">
        </div>
        <div class="p2em-field">
          <span class="p2em-label">Date</span>
          <input class="p2em-input" id="p2em-date" type="date" style="width:140px">
        </div>
        <div class="p2em-field">
          <span class="p2em-label">Time</span>
          <input class="p2em-input" id="p2em-time" type="time" style="width:110px">
        </div>
        <div class="p2em-field">
          <span class="p2em-label">Flair</span>
          <div class="p2em-flair-row">
            <input type="radio" class="p2em-fr" name="p2em-fl" id="p2em-nr" value="no_record"><label for="p2em-nr">No Record</label>
            <input type="radio" class="p2em-fr" name="p2em-fl" id="p2em-vg" value="vague"><label for="p2em-vg">Vague</label>
            <input type="radio" class="p2em-fr" name="p2em-fl" id="p2em-vv" value="vivid"><label for="p2em-vv">Vivid</label>
            <input type="radio" class="p2em-fr" name="p2em-fl" id="p2em-lc" value="lucid"><label for="p2em-lc">Lucid</label>
            <input type="radio" class="p2em-fr" name="p2em-fl" id="p2em-as" value="astral"><label for="p2em-as">Astral</label>
          </div>
        </div>
      </div>
      <div class="p2em-hint">
        Wrap names in <code>&lt;cs&gt;name&lt;/cs&gt;</code> to encrypt &amp; censor &nbsp;·&nbsp; <kbd>Ctrl+Enter</kbd> to save
      </div>
      <div id="p2em-body" style="flex:1;display:flex;flex-direction:column;overflow:hidden;min-height:0">
        <div class="p2em-loading" id="p2em-loading">decrypting censored names…</div>
        <textarea id="p2em-content" spellcheck="false" autocorrect="off" style="display:none"></textarea>
      </div>
      <div class="p2em-footer">
        <button class="p2em-btn p2em-btn-cancel" id="p2em-cancel">Cancel</button>
        <button class="p2em-btn p2em-btn-save" id="p2em-save">Encrypt &amp; Save</button>
      </div>
    </div>`;
  document.body.appendChild(el);
  $p('p2em-close').onclick  = closeEditModal;
  $p('p2em-cancel').onclick = closeEditModal;
  $p('p2em-save').onclick   = commitEditModal;
  el.addEventListener('click', e => { if (e.target === el) closeEditModal(); });
  $p('p2em-content').addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); commitEditModal(); }
  });
}

let _editModalCtx = null;

async function openEditModal(entry, cached) {
  buildEditModal();
  _editModalCtx = { entry, cached };

  $p('p2em-heading').textContent = `EDIT ENTRY — ${entry.date}`;
  $p('p2em-title').value = cached.title;
  $p('p2em-date').value  = entry.date;
  $p('p2em-time').value  = entry.time || '';

  const fr = document.querySelector(`.p2em-fr[value="${entry.flair}"]`);
  if (fr) fr.checked = true;
  else { const vv = document.querySelector('.p2em-fr[value="vivid"]'); if (vv) vv.checked = true; }

  $p('p2em-loading').style.display = 'flex';
  $p('p2em-content').style.display = 'none';
  $p('p2em-save').disabled = true;

  $p('p2-edit-modal').classList.add('show');

  const S = window.S;
  const editableContent = S?.pw
    ? await processCSForEdit(cached.content, S.pw)
    : cached.content;

  $p('p2em-content').value = editableContent;
  $p('p2em-loading').style.display  = 'none';
  $p('p2em-content').style.display  = 'block';
  $p('p2em-save').disabled = false;
  setTimeout(() => $p('p2em-content').focus(), 80);
}

function closeEditModal() {
  $p('p2-edit-modal')?.classList.remove('show');
  _editModalCtx = null;
}

async function commitEditModal() {
  const ctx = _editModalCtx; if (!ctx) return;
  const S   = window.S;
  if (!S || !window._origEncStr || !window.saveEntry) {
    window.notify?.('window globals missing — check patch2 header.', 'err');
    closeEditModal(); return;
  }

  const newTitle   = $p('p2em-title').value.trim();
  const newContent = $p('p2em-content').value.trim();
  const newDate    = $p('p2em-date').value;
  const newTime    = $p('p2em-time').value || '';
  const newFlair   = document.querySelector('.p2em-fr:checked')?.value || ctx.entry.flair;

  if (!newTitle)   { window.notify?.('Title cannot be empty.', 'err'); return; }
  if (!newContent) { window.notify?.('Content cannot be empty.', 'err'); return; }
  if (!newDate)    { window.notify?.('Date required.', 'err'); return; }

  const saveBtn = $p('p2em-save');
  saveBtn.textContent = 'Encrypting…'; saveBtn.disabled = true;

  try {
    const processedContent = await processCSForSave(newContent, S.pw);

    const enc_title   = await window._origEncStr(newTitle,          S.pw);
    const enc_content = await window._origEncStr(processedContent,  S.pw);
    const edited_at   = new Date().toISOString();
    const updated     = { ...ctx.entry, date:newDate, time:newTime, flair:newFlair, enc_title, enc_content, edited_at };

    await window.saveEntry(updated);
    const idx = S.entries.findIndex(e => e.id === ctx.entry.id);
    if (idx >= 0) S.entries[idx] = updated;
    S.entries.sort((a,b) => new Date(b.date) - new Date(a.date));
    S.cache.set(ctx.entry.id, { title: newTitle, content: processedContent });

    window.renderList?.();
    if (S.selId === ctx.entry.id) document.querySelector('#entry-list .ec.active')?.click();

    window.notify?.('Entry updated.', 'ok');
    closeEditModal();

    if ($p('p2-terminal')?.classList.contains('show')) {
      trmPrint('');
      trmPrint(`Updated: ${newDate} — ${newTitle}`, 'trm-ok');
      trmPrint(`Edited at: ${new Date(edited_at).toLocaleString()}`, 'trm-dim');
      trmPrint('');
    }
  } catch (err) {
    window.notify?.('Encryption failed.', 'err');
    console.error('[patch2] commitEditModal:', err);
    saveBtn.textContent = 'Encrypt & Save'; saveBtn.disabled = false;
  }
}

/* ════════════════════════════════════════════
   WRAP window.encStr
════════════════════════════════════════════ */
function wrapEncStr() {
  if (!window.encStr) return;
  window._origEncStr = window.encStr;

  window.encStr = async function(text, pw) {
    const processed = text.includes('<cs>') ? await processCSForSave(text, pw) : text;
    return window._origEncStr(processed, pw);
  };
}

/* ════════════════════════════════════════════
   INIT
════════════════════════════════════════════ */
async function p2init() {
  try {
    await waitFor(() => window.S && window.removeEntry && window.encStr && window.renderDecrypted, 60, 60);
  } catch {
    console.warn('[patch2] window globals not found. Ensure renderDecrypted is exported in HTML.');
  }

  wrapEncStr();
  hookRenderDecrypted(); // ← must run after wrapEncStr, before any interaction

  injectStatsButton();
  buildStatsPanel();
  buildEditModal();
  injectTerminalButton();
  watchForDecryptedContent();
  hookWrongPassword();
  hookEscLock();
  hookCloseButton();

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === '`') { e.preventDefault(); openTerminal(); }
  });

  console.log('[patch2] v2 loaded ✓  — cs encryption active, renderDecrypted hooked');
}
