/* ═══════════════════════════════════════════════════════════════
   patch2.js  —  Dream Journal extensions  (v2)
   • Dream Statistics panel
   • Proper-name frequency colouring in entry bodies
   • <cs>name</cs> censoring — shows ████ in viewer,
     revealed only via terminal /uncensor command
   • Terminal overlay  (user: der_anfang / pass: anfangistende)
     commands: /help /list /edit /delete /stats /uncensor /clear /exit
   • Edited-at badge on entries
   • Encrypting flash animation on wrong passphrase or ESC
   • Close button (×) closes the page

   ── REQUIRED HTML CHANGE ────────────────────────────────────────
   In the main inline <script>, just before the line
       window.removeEntry = removeEntry;
   add:
       window.S          = S;
       window.encStr     = encStr;
       window.saveEntry  = saveEntry;
       window.renderList = renderList;
       window.notify     = notify;
       window.lock       = lock;
═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => setTimeout(p2init, 400));

/* ════════════════════════════════════════════
   STYLES
════════════════════════════════════════════ */
const P2_CSS = `
/* ── name highlights ── */
.nh-high { color:#c9b8f0; border-bottom:1px dotted #c9b8f066; }
.nh-mid  { color:#7ecec4; border-bottom:1px dotted #7ecec466; }
.nh-low  { color:#e8d87a; border-bottom:1px dotted #e8d87a66; }

/* ── censored blocks ── */
.cs-block {
  display:inline-block;
  background:var(--ink);
  color:var(--ink);
  letter-spacing:2px;
  padding:0 3px;
  border-radius:0;
  user-select:none;
  cursor:default;
  font-size:.9em;
  vertical-align:baseline;
  transition:background .15s, color .15s;
}
.cs-block:hover {
  background:var(--mark-err);
  color:var(--mark-err);
}

/* ── stats panel ── */
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

/* ── terminal ── */
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

/* ── edited badge ── */
.edited-badge {
  font-size:9px; color:var(--ink-faint); letter-spacing:1px;
  border:1px solid var(--ink-ghost); padding:1px 5px;
  margin-left:8px; vertical-align:middle; text-transform:uppercase;
}

/* ── encrypting flash overlay ── */
#enc-flash-ov {
  position:fixed; inset:0; z-index:9999;
  background:var(--paper);
  display:flex; flex-direction:column;
  align-items:center; justify-content:center;
  gap:18px; pointer-events:none;
  font-family:'IBM Plex Mono',monospace;
}
#enc-flash-ov .ef-glyph {
  font-family:'VT323',monospace;
  font-size:80px; line-height:1;
  color:var(--ink-ghost); letter-spacing:4px;
}
#enc-flash-ov .ef-label {
  font-size:11px; letter-spacing:4px;
  text-transform:uppercase; color:var(--ink-soft);
}
#enc-flash-ov .ef-bar {
  font-size:11px; color:var(--ink-faint); letter-spacing:1px;
  width:200px; text-align:center;
}

@media (max-width:640px) {
  .sp-body { padding:14px 14px; }
}
`;

(function injectStyles(){
  const s = document.createElement('style');
  s.textContent = P2_CSS;
  document.head.appendChild(s);
})();

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
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
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
    const re = new RegExp(`(?<![a-zA-Z])(${escReg(cap)})(?![a-zA-Z])`, 'g');
    result = result.replace(re, `<span class="${cls}" title="${count}×">$1</span>`);
  }
  return result;
}

/* ════════════════════════════════════════════
   CENSORING SYSTEM
   Usage in entry: wrap any name/text in <cs>name</cs>
   Displays as ████ in viewer; /uncensor in terminal reveals
════════════════════════════════════════════ */
const censorMap = new Map(); // entryId → string[] of censored names

const CS_RE = /(<cs>[\s\S]*?<\/cs>)/gi;

/** Split content into plain/censored parts */
function splitCensored(content) {
  return content.split(CS_RE).map(part => {
    const m = part.match(/^<cs>([\s\S]*?)<\/cs>$/i);
    return m ? { type:'censored', name: m[1] } : { type:'plain', text: part };
  });
}

/** Render content as HTML with ████ blocks and name highlighting */
function renderContentHTML(content, entryId) {
  const parts = splitCensored(content);
  const names = [];

  // Collect censored names for the map
  parts.forEach(p => { if (p.type === 'censored' && !names.includes(p.name)) names.push(p.name); });

  // Build plain text without cs tags for frequency analysis
  const plainOnly = parts.filter(p => p.type === 'plain').map(p => p.text).join(' ');
  const freq = extractProperNames(plainOnly);

  // Build HTML
  const html = parts.map(p => {
    if (p.type === 'censored') {
      return `<span class="cs-block" title="[censored — use /uncensor in terminal]" data-cs="${escHtml(p.name)}">████</span>`;
    }
    return colorizeNames(p.text, freq);
  }).join('');

  // Update censor map
  if (names.length) censorMap.set(entryId, names);
  else censorMap.delete(entryId);

  return html;
}

/** Build terminal-safe HTML showing uncensored names highlighted */
function uncensoredContentHTML(content) {
  return splitCensored(content).map(p => {
    if (p.type === 'censored') {
      return `<span style="background:#c9b8f022;color:#c9b8f0;padding:0 2px;border-bottom:1px solid #c9b8f088">${escHtml(p.name)}</span>`;
    }
    return escHtml(p.text);
  }).join('');
}

/* ════════════════════════════════════════════
   WATCH entry-display — MutationObserver
   Replaces patchRenderDecrypted (which can't
   intercept the main script's closure calls)
════════════════════════════════════════════ */
function watchForDecryptedContent() {
  const display = $p('entry-display');
  if (!display) return;

  let _timer = null;

  const obs = new MutationObserver(() => {
    clearTimeout(_timer);
    _timer = setTimeout(() => {
      const cEl = display.querySelector('.ed-body:not(.enc):not(.decrypting)');
      if (!cEl) return;

      const tEl = display.querySelector('[id^="edt-"]:not(.enc)');
      const id  = tEl ? tEl.id.replace('edt-','') : null;
      const S   = window.S;
      if (!S || !id) return;

      const c = S.cache.get(id);
      if (!c) return;

      // Guard: don't re-process same entry twice
      if (cEl.dataset.p2id === id) return;
      cEl.dataset.p2id = id;

      // Render with censoring blocks + name highlights
      cEl.innerHTML = renderContentHTML(c.content, id);

      // Edited-at badge
      const entry = S.entries.find(e => e.id === id);
      if (entry?.edited_at && tEl && !tEl.querySelector('.edited-badge')) {
        const badge = document.createElement('span');
        badge.className = 'edited-badge';
        badge.title = 'Last edited: ' + new Date(entry.edited_at).toLocaleString();
        badge.textContent = 'edited';
        tEl.appendChild(badge);
      }
    }, 350); // debounce: waits for decrypt animation to settle
  });

  obs.observe(display, {
    childList: true, subtree: true,
    attributes: true, attributeFilter: ['class','style']
  });
}

/* ════════════════════════════════════════════
   ENCRYPTING FLASH ANIMATION
   Shown on: wrong passphrase, ESC while unlocked
════════════════════════════════════════════ */
const GC_CHARS = '░▒▓▄▀■□-~*+=#@&%?!./|:;ABCDEFGHJKMNPQRSTUVXYZabcdefghjkmnpqrstuvxyz0123456789';

function randGC() { return GC_CHARS[Math.floor(Math.random() * GC_CHARS.length)]; }

function showEncryptingFlash() {
  // Immediately scramble visible decrypted text in place
  const display = $p('entry-display');
  if (display && display.style.display !== 'none') {
    const titleEl = display.querySelector('.ed-title:not(.enc)');
    const bodyEl  = display.querySelector('.ed-body:not(.enc)');
    [titleEl, bodyEl].filter(Boolean).forEach(el => {
      const len = Math.min(el.textContent.length, 300);
      el.textContent = Array.from({length: len}, randGC).join('');
    });
  }
  // Also scramble sidebar titles
  document.querySelectorAll('#entry-list .ec-title:not(.enc)').forEach(el => {
    const len = el.textContent.length;
    el.textContent = Array.from({length: len}, randGC).join('');
  });

  // Remove existing overlay if any
  $p('enc-flash-ov')?.remove();

  const ov = document.createElement('div');
  ov.id = 'enc-flash-ov';

  const glyph = document.createElement('div');
  glyph.className = 'ef-glyph';
  glyph.textContent = '▓';

  const label = document.createElement('div');
  label.className = 'ef-label';
  label.textContent = 'ENCRYPTING...';

  const bar = document.createElement('div');
  bar.className = 'ef-bar';

  ov.append(glyph, label, bar);
  document.body.appendChild(ov);

  // Animate label scramble + progress bar
  let frame = 0;
  const LABEL = 'ENCRYPTING...';
  const STEPS = 20;
  let step = 0;

  const iv = setInterval(() => {
    // Scramble label every other frame
    label.textContent = frame % 4 < 2
      ? LABEL
      : Array.from(LABEL, (ch) => ch === '.' ? '.' : randGC()).join('');

    // Progress bar
    step = Math.min(step + 1, STEPS);
    const filled = Math.round((step / STEPS) * 16);
    bar.textContent = '[' + '█'.repeat(filled) + '░'.repeat(16 - filled) + ']';

    frame++;
  }, 45);

  // Fade out after 750ms
  setTimeout(() => {
    clearInterval(iv);
    label.textContent = 'ENCRYPTED';
    bar.textContent = '[████████████████]';
    ov.style.transition = 'opacity 0.35s ease';
    ov.style.opacity = '0';
    setTimeout(() => ov.remove(), 350);
  }, 750);
}

/** Hook: wrong passphrase → watch for shake class on pw-input */
function hookWrongPassword() {
  const pwInp = $p('pw-input');
  if (!pwInp) return;
  new MutationObserver(() => {
    if (pwInp.classList.contains('shake')) showEncryptingFlash();
  }).observe(pwInp, { attributes: true, attributeFilter: ['class'] });
}

/** Hook: ESC while unlocked → encrypting flash (main script handles actual lock) */
function hookEscLock() {
  document.addEventListener('keydown', e => {
    if (e.target.id === 'pw-input' && e.key === 'Escape' && window.S?.unlocked) {
      showEncryptingFlash();
      // Main script's ESC handler fires after (same capture phase order or bubble)
      // and calls lock() — we just provide the visual
    }
  }, true); // capture phase — runs before main script's bubble listener
}

/* ════════════════════════════════════════════
   CLOSE BUTTON
════════════════════════════════════════════ */
function hookCloseButton() {
  // Target the titlebar × button specifically
  const closeBtn = document.querySelector('.tb-btn[title="close"]');
  if (!closeBtn) return;
  closeBtn.addEventListener('click', e => {
    e.preventDefault();
    // Standard close — works if page was opened via link navigation
    window.close();
    // Fallback: navigate to blank (some browsers block window.close on non-script-opened tabs)
    setTimeout(() => {
      try { window.open('','_self').close(); } catch {}
    }, 80);
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
  if (!S) { console.warn('[patch2] window.S missing — add exports to HTML'); return; }
  if (!S.unlocked) { window.notify?.('Unlock journal first.', 'err'); return; }

  const entries = S.entries;
  const total   = entries.length;
  const cached  = [...S.cache.values()];

  const flairCounts = { no_record:0, vague:0, vivid:0, lucid:0, astral:0 };
  entries.forEach(e => { if (flairCounts[e.flair] !== undefined) flairCounts[e.flair]++; });
  const maxFlair = Math.max(...Object.values(flairCounts), 1);

  const totalWords = cached.reduce((s,c) => s + c.content.replace(/<cs>[\s\S]*?<\/cs>/gi,'').split(/\s+/).filter(Boolean).length, 0);
  const avgWords = total ? Math.round(totalWords / total) : 0;

  const monthMap = {};
  entries.forEach(e => { const m = e.date.slice(0,7); monthMap[m] = (monthMap[m]||0)+1; });
  const months = Object.keys(monthMap).sort().slice(-6);

  const days = new Set(entries.map(e => e.date));
  let streak = 0, d = new Date();
  while (true) { const ds = d.toISOString().split('T')[0]; if (days.has(ds)) { streak++; d.setDate(d.getDate()-1); } else break; }

  const allText = cached.map(c => c.content.replace(/<cs>[\s\S]*?<\/cs>/gi, '')).join(' ');
  const nameFreq = extractProperNames(allText);
  const topNames = Object.entries(nameFreq).sort((a,b) => b[1]-a[1]).slice(0,8);

  const hours = Array(24).fill(0);
  entries.forEach(e => { if (e.time) { const h = parseInt(e.time.split(':')[0]); if (!isNaN(h)) hours[h]++; } });
  const peakHour = hours.indexOf(Math.max(...hours));
  const peakLabel = peakHour===0?'12 AM':peakHour<12?`${peakHour} AM`:peakHour===12?'12 PM':`${peakHour-12} PM`;

  // Censored entries count
  const censoredCount = entries.filter(e => {
    const c = S.cache.get(e.id);
    return c && CS_RE.test(c.content);
  }).length;
  CS_RE.lastIndex = 0;

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
        const maxM = Math.max(...months.map(mm => monthMap[mm]),1);
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
        return `<div class="sp-name-row"><span class="sp-name-word ${cls}">${n[0].toUpperCase()+n.slice(1)}</span><span class="sp-name-count">${c}×</span></div>`;
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
   TERMINAL — LOADING BAR HELPER
════════════════════════════════════════════ */
async function trmProgressBar(label, total, msPerStep = 38) {
  const BARS = 18;
  const out  = $p('trm-output');
  // Create a dedicated line we'll update in place
  const line = document.createElement('div');
  line.className = 'trm-bar';
  out.appendChild(line);

  for (let i = 0; i <= total; i++) {
    const pct    = Math.round((i / total) * 100);
    const filled = Math.round((i / total) * BARS);
    line.textContent = `${label}: [${'█'.repeat(filled)}${'░'.repeat(BARS - filled)}] ${pct}%`;
    out.scrollTop = out.scrollHeight;
    if (i < total) await new Promise(r => setTimeout(r, msPerStep));
  }
}

/* ════════════════════════════════════════════
   TERMINAL
════════════════════════════════════════════ */
const TRM_USER = 'der_anfang';
const TRM_PASS = 'anfangistende';
let trmState    = { authed:false, history:[], histIdx:-1 };
let trmLoginStep = 0;
let _pendingUser = '';
let _editCtx     = null;
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
  const out = $p('trm-output');
  const line = document.createElement('div');
  if (cls) line.className = cls;
  line.textContent = text;
  out.appendChild(line);
  out.scrollTop = out.scrollHeight;
}
function trmPrintHTML(html, cls = '') {
  const out = $p('trm-output');
  const line = document.createElement('div');
  if (cls) line.className = cls;
  line.innerHTML = html;
  out.appendChild(line);
  out.scrollTop = out.scrollHeight;
}
function trmClear() { if ($p('trm-output')) $p('trm-output').innerHTML = ''; }

function openTerminal() {
  if (!$p('p2-terminal')) buildTerminal();
  trmState.authed = false; trmState.history = []; trmState.histIdx = -1;
  trmLoginStep = 0; _pendingUser = ''; _editCtx = null; _deleteCtx = null;
  trmClear();
  $p('trm-prompt').textContent = 'login:~$';
  $p('trm-input').type = 'text';
  $p('trm-input').value = '';
  // Clone to wipe all stale listeners
  const inp = $p('trm-input');
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
    trmPrint('Password:');
    return;
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
    case '/help':     cmdHelp(); break;
    case '/list':     cmdList(); break;
    case '/edit':     cmdEdit(args); break;
    case '/delete':   cmdDelete(args); break;
    case '/stats':    cmdStatsTrm(); break;
    case '/uncensor': cmdUncensor(args); break;
    case '/clear':    trmClear(); break;
    case '/exit':     closeTerminal(); break;
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
    ['/edit YYYY-MM-DD',         '    edit an entry by date'],
    ['/delete YYYY-MM-DD',       '    delete an entry by date'],
    ['/stats',                   '    quick stats summary'],
    ['/uncensor YYYY-MM-DD|all', '    reveal censored <cs> names'],
    ['/clear',                   '    clear terminal screen'],
    ['/exit',                    '    close terminal'],
  ].forEach(([c,d]) =>
    trmPrintHTML(`<span style="color:var(--ink-mid)">${c}</span><span style="color:var(--ink-faint)">${d}</span>`)
  );
  trmPrint('');
  trmPrint('Censoring tip:', 'trm-dim');
  trmPrint('  Wrap names in <cs>name</cs> when writing — shows as ████ in viewer.', 'trm-dim');
  trmPrint('');
}

function cmdList() {
  const S = window.S;
  if (!S) { trmPrint('window.S not available — add exports to HTML.', 'trm-err'); return; }
  if (!S.entries.length) { trmPrint('No entries found.', 'trm-warn'); return; }
  trmPrint('');
  trmPrint('DATE        TIME   FLAIR        REDACTED  TITLE', 'trm-head');
  trmPrint('────────────────────────────────────────────────────', 'trm-dim');
  S.entries.forEach(e => {
    const cached  = S.cache.get(e.id);
    const title   = cached?.title || '[encrypted]';
    const hasCS   = cached?.content && CS_RE.test(cached.content) ? '  ██ ' : '      ';
    CS_RE.lastIndex = 0;
    trmPrint(`${e.date}  ${(e.time||'--:--').padEnd(7)}${e.flair.padEnd(13)}${hasCS}${title}`);
  });
  trmPrint('');
}

function cmdStatsTrm() {
  const S = window.S;
  if (!S) { trmPrint('window.S not available — add exports to HTML.', 'trm-err'); return; }
  const total = S.entries.length;
  const flairCounts = {};
  S.entries.forEach(e => { flairCounts[e.flair] = (flairCounts[e.flair]||0)+1; });
  const censored = S.entries.filter(e => {
    const c = S.cache.get(e.id);
    const has = c && CS_RE.test(c.content);
    CS_RE.lastIndex = 0;
    return has;
  }).length;
  trmPrint('');
  trmPrint(`Total entries : ${total}`, 'trm-ok');
  Object.entries(flairCounts).forEach(([k,v]) => trmPrint(`  ${k.padEnd(14)}: ${v}`));
  trmPrint(`  ${'redacted'.padEnd(14)}: ${censored} (use /uncensor to view)`, 'trm-warn');
  trmPrint('');
}

/* ── /uncensor ── */
async function cmdUncensor(args) {
  const S = window.S;
  if (!S) { trmPrint('window.S not available — add exports to HTML.', 'trm-err'); return; }
  if (!S.unlocked) { trmPrint('Journal must be unlocked to uncensor.', 'trm-err'); return; }

  const target = (args[0] || '').toLowerCase();
  if (!target) {
    trmPrint('Usage: /uncensor YYYY-MM-DD', 'trm-warn');
    trmPrint('       /uncensor all', 'trm-warn');
    return;
  }

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
    const has = c && CS_RE.test(c.content);
    CS_RE.lastIndex = 0;
    return has;
  });

  if (!censored.length) {
    trmPrint(`No censored content found${target === 'all' ? '' : ' for ' + target}.`, 'trm-warn');
    trmPrint('(Use <cs>name</cs> when writing entries to censor names.)', 'trm-dim');
    return;
  }

  trmPrint('');
  trmPrint(`Uncensoring ${censored.length} entr${censored.length > 1 ? 'ies' : 'y'}...`, 'trm-warn');

  // Loading bar — steps = entries × 6 for visible progress
  await trmProgressBar('Decrypting', censored.length * 6, 32);

  trmPrint('');
  trmPrint('─ UNCENSORED OUTPUT ─────────────────────────────', 'trm-head');
  trmPrint('  Revealed names shown in', 'trm-dim');
  trmPrintHTML(`  <span style="color:#c9b8f0">purple highlight</span>`, 'trm-dim');
  trmPrint('');

  for (const e of censored) {
    const c = S.cache.get(e.id);
    if (!c) continue;

    // Header row
    trmPrintHTML(
      `<span class="trm-head">── ${escHtml(e.date)}</span>` +
      `<span class="trm-dim">  ${escHtml(e.flair)}</span>`
    );
    trmPrint(`   ${c.title}`);
    trmPrint('');

    // Content with revealed names
    trmPrintHTML(
      `<div style="color:#7a7268;font-size:11px;line-height:1.9;padding-left:4px">${uncensoredContentHTML(c.content)}</div>`
    );

    // List the revealed names separately
    const names = [];
    let m;
    const re = /<cs>([\s\S]*?)<\/cs>/gi;
    while ((m = re.exec(c.content)) !== null) {
      if (!names.includes(m[1])) names.push(m[1]);
    }
    if (names.length) {
      trmPrint('');
      trmPrintHTML(
        `<span class="trm-dim">   censored names: </span>` +
        names.map(n => `<span style="color:#c9b8f0">${escHtml(n)}</span>`).join('<span class="trm-dim">, </span>')
      );
    }
    trmPrint('');
    trmPrint('─────────────────────────────────────────────────', 'trm-dim');
    trmPrint('');
  }

  trmPrint(`Done. ${censored.length} entr${censored.length > 1 ? 'ies' : 'y'} uncensored.`, 'trm-ok');
  trmPrint('(This output is terminal-only and not saved.)', 'trm-dim');
  trmPrint('');
}

/* ── /edit ── */
function cmdEdit(args) {
  const S = window.S;
  if (!S) { trmPrint('window.S not available — add exports to HTML.', 'trm-err'); return; }
  if (!S.unlocked) { trmPrint('Journal is locked. Unlock it first.', 'trm-err'); return; }
  if (!args[0]) { trmPrint('Usage: /edit YYYY-MM-DD', 'trm-warn'); return; }
  const entry = S.entries.find(e => e.date === args[0]);
  if (!entry) { trmPrint(`No entry found for ${args[0]}.`, 'trm-err'); return; }
  const cached = S.cache.get(entry.id);
  if (!cached) { trmPrint('Entry not decrypted. Unlock first.', 'trm-err'); return; }
  trmPrint('');
  trmPrint(`Editing: ${args[0]} — ${cached.title}`, 'trm-warn');
  trmPrint('What to edit?', 'trm-head');
  trmPrint('  [1] Title');
  trmPrint('  [2] Content  (tip: use <cs>name</cs> to censor)');
  trmPrint('  [3] Flair  (current: ' + entry.flair + ')');
  trmPrint('  [4] Cancel');
  trmPrint('');
  _editCtx = { entry, cached, step:'choose' };
  swapInputHandler(onEditKey);
}

function onEditKey(e) {
  if (e.key !== 'Enter') return;
  const inp = $p('trm-input');
  const val = inp.value.trim(); inp.value = '';
  trmPrint('> ' + val, 'trm-dim');
  const ctx = _editCtx;
  if (!ctx) { restoreInputHandler(); return; }
  if (ctx.step === 'choose') {
    if      (val === '1') { ctx.step = 'title';   trmPrint('New title:'); }
    else if (val === '2') { ctx.step = 'content'; trmPrint('New content (use <cs>name</cs> to censor):'); }
    else if (val === '3') { ctx.step = 'flair';   trmPrint('Flair (no_record/vague/vivid/lucid/astral):'); }
    else { trmPrint('Cancelled.', 'trm-dim'); _editCtx = null; restoreInputHandler(); }
    return;
  }
  if (ctx.step === 'title') {
    if (!val) { trmPrint('Cannot be empty.', 'trm-err'); return; }
    commitEdit(ctx, { title:val });
  } else if (ctx.step === 'content') {
    if (!val) { trmPrint('Cannot be empty.', 'trm-err'); return; }
    commitEdit(ctx, { content:val });
  } else if (ctx.step === 'flair') {
    if (!['no_record','vague','vivid','lucid','astral'].includes(val)) { trmPrint('Invalid flair.', 'trm-err'); return; }
    commitEdit(ctx, { flair:val });
  }
}

async function commitEdit(ctx, changes) {
  const { entry, cached } = ctx;
  const S = window.S;
  _editCtx = null; restoreInputHandler();

  if (!S || !window.encStr || !window.saveEntry) {
    trmPrint('window globals missing — add exports to HTML (see patch2.js header).', 'trm-err');
    return;
  }

  trmPrint('Encrypting...', 'trm-warn');
  try {
    const newTitle   = changes.title   ?? cached.title;
    const newContent = changes.content ?? cached.content;
    const newFlair   = changes.flair   ?? entry.flair;
    const enc_title   = await window.encStr(newTitle,   S.pw);
    const enc_content = await window.encStr(newContent, S.pw);
    const edited_at   = new Date().toISOString();
    const updated     = { ...entry, enc_title, enc_content, flair:newFlair, edited_at };
    await window.saveEntry(updated);
    const idx = S.entries.findIndex(e => e.id === entry.id);
    if (idx >= 0) S.entries[idx] = updated;
    S.cache.set(entry.id, { title:newTitle, content:newContent });
    window.renderList?.();
    // Re-click active entry card to trigger re-render and re-colorization
    if (S.selId === entry.id) {
      const active = document.querySelector('#entry-list .ec.active');
      active?.click();
    }
    trmPrint('Updated successfully.', 'trm-ok');
    trmPrint('Edited at: ' + new Date(edited_at).toLocaleString(), 'trm-dim');
    trmPrint('');
  } catch (err) {
    trmPrint('Encryption failed: ' + err.message, 'trm-err');
    console.error(err);
  }
}

/* ── /delete ── */
function cmdDelete(args) {
  const S = window.S;
  if (!S) { trmPrint('window.S not available — add exports to HTML.', 'trm-err'); return; }
  if (!args[0]) { trmPrint('Usage: /delete YYYY-MM-DD', 'trm-warn'); return; }
  const entry = S.entries.find(e => e.date === args[0]);
  if (!entry) { trmPrint(`No entry for ${args[0]}.`, 'trm-err'); return; }
  trmPrint(`Delete entry from ${args[0]}? (yes/no)`, 'trm-warn');
  _deleteCtx = entry;
  swapInputHandler(onDeleteKey);
}

function onDeleteKey(e) {
  if (e.key !== 'Enter') return;
  const inp = $p('trm-input');
  const val = inp.value.trim().toLowerCase(); inp.value = '';
  trmPrint('> ' + val, 'trm-dim');
  restoreInputHandler();
  if (val === 'yes' || val === 'y') {
    window.removeEntry?.(_deleteCtx.id);
    trmPrint('Deleted.', 'trm-ok');
  } else {
    trmPrint('Cancelled.', 'trm-dim');
  }
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
  inp.removeEventListener('keydown', onEditKey);
  inp.removeEventListener('keydown', onDeleteKey);
  inp.removeEventListener('keydown', onTrmKey);
  inp.addEventListener('keydown', onTrmKey);
}

function injectTerminalButton() {
  if ($p('trm-trigger')) return;
  const sb = $p('statusbar');
  if (!sb) return;
  const btn = document.createElement('button');
  btn.id = 'trm-trigger'; btn.title = 'Open Terminal (Ctrl+`)';
  btn.textContent = '>_';
  btn.addEventListener('click', openTerminal);
  const tt = $p('theme-toggle');
  tt ? sb.insertBefore(btn, tt) : sb.appendChild(btn);
}

/* ════════════════════════════════════════════
   INIT
════════════════════════════════════════════ */
async function p2init() {
  try {
    await waitFor(() => window.S && window.removeEntry, 60, 60);
  } catch {
    console.warn(
      '[patch2] window.S not found. Add to main <script> before </script>:\n' +
      '  window.S=S; window.encStr=encStr; window.saveEntry=saveEntry;\n' +
      '  window.renderList=renderList; window.notify=notify; window.lock=lock;'
    );
  }

  injectStatsButton();
  buildStatsPanel();
  injectTerminalButton();
  watchForDecryptedContent();
  hookWrongPassword();
  hookEscLock();
  hookCloseButton();

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === '`') { e.preventDefault(); openTerminal(); }
  });

  console.log('[patch2] v2 loaded ✓');
}
