/* ═══════════════════════════════════════════════════════════════
   patch2.js  —  Dream Journal extensions  (fixed)
   • Dream Statistics panel
   • Proper-name frequency colouring in entry bodies
   • Terminal overlay  (user: der_anfang / pass: anfangistende)
     commands: /help /list /edit /delete /stats /clear /exit
   • Edited-at badge on entries

   ── REQUIRED HTML CHANGE ────────────────────────────────────────
   In the main inline <script>, just before the closing </script>,
   add these lines so patch2 can reach the app's state:

     window.S          = S;
     window.encStr     = encStr;
     window.saveEntry  = saveEntry;
     window.renderList = renderList;
     window.notify     = notify;

   (window.removeEntry is already exposed there — keep it.)
═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => setTimeout(p2init, 400));

/* ════════════════════════════════════════════
   STYLES
════════════════════════════════════════════ */
const P2_CSS = `
.nh-high { color:#c9b8f0; border-bottom:1px dotted #c9b8f066; }
.nh-mid  { color:#7ecec4; border-bottom:1px dotted #7ecec466; }
.nh-low  { color:#e8d87a; border-bottom:1px dotted #e8d87a66; }

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
.sp-card {
  border:1px solid var(--rule-dark); background:var(--paper-dim);
  padding:16px 18px;
}
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

function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escReg(s)  { return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }

/* ════════════════════════════════════════════
   NAME HIGHLIGHTING
════════════════════════════════════════════ */
function extractProperNames(text) {
  const freq = {};
  const sentences = text.split(/(?<=[.!?])\s+/);
  for (const sent of sentences) {
    const tokens = sent.trim().split(/\s+/);
    for (let i = 1; i < tokens.length; i++) {
      const raw = tokens[i].replace(/[^a-zA-Z'-]/g, '');
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
  const names = Object.keys(freq).sort((a, b) => b.length - a.length);
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
   WATCH entry-display with MutationObserver
   (replaces the broken window.renderDecrypted
    monkey-patch — the main script calls that
    function from its own closure, so wrapping
    window.renderDecrypted never fires)
════════════════════════════════════════════ */
function watchForDecryptedContent() {
  const display = document.getElementById('entry-display');
  if (!display) return;

  let _timer = null;

  const obs = new MutationObserver(() => {
    clearTimeout(_timer);
    _timer = setTimeout(() => {
      // Only act when there's a fully-decrypted body (no enc, no decrypting class)
      const cEl = display.querySelector('.ed-body:not(.enc):not(.decrypting)');
      if (!cEl) return;

      // Get entry id from the title element
      const tEl = display.querySelector('[id^="edt-"]:not(.enc)');
      const id = tEl ? tEl.id.replace('edt-', '') : null;

      const S = window.S;
      if (!S || !id) return;

      const c = S.cache.get(id);
      if (!c) return;

      // Apply name colorization (guard with flag to avoid re-runs on same entry)
      if (cEl.dataset.p2id === id) return;
      cEl.dataset.p2id = id;

      const freq = extractProperNames(c.content);
      cEl.innerHTML = colorizeNames(c.content, freq);

      // Edited-at badge
      const entry = S.entries.find(e => e.id === id);
      if (entry?.edited_at && tEl && !tEl.querySelector('.edited-badge')) {
        const badge = document.createElement('span');
        badge.className = 'edited-badge';
        badge.title = 'Last edited: ' + new Date(entry.edited_at).toLocaleString();
        badge.textContent = 'edited';
        tEl.appendChild(badge);
      }
    }, 350); // debounce — waits for decryption animation to settle
  });

  obs.observe(display, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
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
  if (!S) { console.warn('[patch2] window.S not available — did you add the window exports to the HTML?'); return; }
  if (!S.unlocked) { window.notify('Unlock journal first.', 'err'); return; }
  const body = $p('sp-body');
  const entries = S.entries;
  const total = entries.length;
  const cached = [...S.cache.values()];

  const flairCounts = { no_record:0, vague:0, vivid:0, lucid:0, astral:0 };
  entries.forEach(e => { if (flairCounts[e.flair] !== undefined) flairCounts[e.flair]++; });
  const maxFlair = Math.max(...Object.values(flairCounts), 1);

  const totalWords = cached.reduce((s, c) => s + (c.content.split(/\s+/).filter(Boolean).length), 0);
  const avgWords = total ? Math.round(totalWords / total) : 0;

  const monthMap = {};
  entries.forEach(e => { const m = e.date.slice(0,7); monthMap[m] = (monthMap[m]||0)+1; });
  const months = Object.keys(monthMap).sort().slice(-6);

  const days = new Set(entries.map(e => e.date));
  let streak = 0, d = new Date();
  while (true) { const ds = d.toISOString().split('T')[0]; if (days.has(ds)) { streak++; d.setDate(d.getDate()-1); } else break; }

  const allText = cached.map(c => c.content).join(' ');
  const nameFreq = extractProperNames(allText);
  const topNames = Object.entries(nameFreq).sort((a,b) => b[1]-a[1]).slice(0,8);

  const hours = Array(24).fill(0);
  entries.forEach(e => { if (e.time) { const h = parseInt(e.time.split(':')[0]); if (!isNaN(h)) hours[h]++; } });
  const peakHour = hours.indexOf(Math.max(...hours));
  const peakLabel = peakHour === 0 ? '12 AM' : peakHour < 12 ? `${peakHour} AM` : peakHour === 12 ? '12 PM' : `${peakHour-12} PM`;

  body.innerHTML = `
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
        const maxM = Math.max(...months.map(mm => monthMap[mm]), 1);
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
      }).join('') : '<span style="color:var(--ink-ghost);font-size:11px">Unlock entries to scan names</span>'}
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
        <span>DREAM_TERMINAL v1.0</span>
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
  // reset input handlers cleanly
  const inp = $p('trm-input');
  inp.onkeydown = null;
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
    case '/help':   cmdHelp(); break;
    case '/list':   cmdList(); break;
    case '/edit':   cmdEdit(args); break;
    case '/delete': cmdDelete(args); break;
    case '/stats':  cmdStatsTrm(); break;
    case '/clear':  trmClear(); break;
    case '/exit':   closeTerminal(); break;
    case '':        break;
    default: trmPrint(`Unknown command: ${cmd}  —  type /help`, 'trm-err');
  }
}

function cmdHelp() {
  trmPrint('');
  trmPrint('Available commands', 'trm-head');
  trmPrint('──────────────────────────────────────────', 'trm-dim');
  [
    ['/list',            '           list all entries'],
    ['/edit YYYY-MM-DD', ' edit an entry by date'],
    ['/delete YYYY-MM-DD','delete an entry by date'],
    ['/stats',           '          quick stats summary'],
    ['/clear',           '          clear terminal screen'],
    ['/exit',            '           close terminal'],
  ].forEach(([c,d]) => trmPrintHTML(`<span style="color:var(--ink-mid)">${c}</span><span style="color:var(--ink-faint)">${d}</span>`));
  trmPrint('');
}

function cmdList() {
  const S = window.S;
  if (!S) { trmPrint('window.S not available — see HTML setup note.', 'trm-err'); return; }
  if (!S.entries.length) { trmPrint('No entries found.', 'trm-warn'); return; }
  trmPrint('');
  trmPrint('DATE        TIME   FLAIR        TITLE', 'trm-head');
  trmPrint('─────────────────────────────────────────────', 'trm-dim');
  S.entries.forEach(e => {
    const title = S.cache.get(e.id)?.title || '[encrypted]';
    trmPrint(`${e.date}  ${(e.time||'--:--').padEnd(7)}${e.flair.padEnd(13)}${title}`);
  });
  trmPrint('');
}

function cmdStatsTrm() {
  const S = window.S;
  if (!S) { trmPrint('window.S not available — see HTML setup note.', 'trm-err'); return; }
  const total = S.entries.length;
  const flairCounts = {};
  S.entries.forEach(e => { flairCounts[e.flair] = (flairCounts[e.flair]||0)+1; });
  trmPrint(''); trmPrint(`Total entries : ${total}`, 'trm-ok');
  Object.entries(flairCounts).forEach(([k,v]) => trmPrint(`  ${k.padEnd(14)}: ${v}`));
  trmPrint('');
}

/* ── /edit ── */
function cmdEdit(args) {
  const S = window.S;
  if (!S) { trmPrint('window.S not available — see HTML setup note.', 'trm-err'); return; }
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
  trmPrint('  [2] Content');
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
    else if (val === '2') { ctx.step = 'content'; trmPrint('New content (single line):'); }
    else if (val === '3') { ctx.step = 'flair';   trmPrint('Flair (no_record/vague/vivid/lucid/astral):'); }
    else { trmPrint('Cancelled.', 'trm-dim'); _editCtx = null; restoreInputHandler(); }
    return;
  }
  if      (ctx.step === 'title')   { if (!val) { trmPrint('Cannot be empty.','trm-err'); return; } commitEdit(ctx,{title:val}); }
  else if (ctx.step === 'content') { if (!val) { trmPrint('Cannot be empty.','trm-err'); return; } commitEdit(ctx,{content:val}); }
  else if (ctx.step === 'flair') {
    if (!['no_record','vague','vivid','lucid','astral'].includes(val)) { trmPrint('Invalid flair.','trm-err'); return; }
    commitEdit(ctx, {flair:val});
  }
}

async function commitEdit(ctx, changes) {
  const { entry, cached } = ctx;
  const S = window.S;
  _editCtx = null; restoreInputHandler();

  if (!S || !window.encStr || !window.saveEntry) {
    trmPrint('window globals not available — add window exports to HTML (see top of patch2.js).', 'trm-err');
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
    window.renderList();
    if (S.selId === entry.id) {
      // Re-select to force a re-render (renderDecrypted isn't on window — use selectEntry via DOM)
      const cards = document.querySelectorAll('#entry-list .ec');
      const activeCard = [...cards].find(c => c.classList.contains('active'));
      if (activeCard) activeCard.click();
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
  if (!S) { trmPrint('window.S not available — see HTML setup note.', 'trm-err'); return; }
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
  if (val === 'yes' || val === 'y') { window.removeEntry(_deleteCtx.id); trmPrint('Deleted.','trm-ok'); }
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
  // Wait for window.S — set by window exports added to the HTML (see top of file).
  // Falls back gracefully if not found (UI still renders, terminal shows helpful error).
  try {
    await waitFor(() => window.S && window.removeEntry, 60, 60);
  } catch (e) {
    console.warn(
      '[patch2] window.S not found after 3.6s.\n' +
      'Add these lines to the main <script> just before </script>:\n' +
      '  window.S          = S;\n' +
      '  window.encStr     = encStr;\n' +
      '  window.saveEntry  = saveEntry;\n' +
      '  window.renderList = renderList;\n' +
      '  window.notify     = notify;'
    );
    // Still boot UI — terminal will show per-command errors rather than silently dying
  }

  injectStatsButton();
  buildStatsPanel();
  injectTerminalButton();
  watchForDecryptedContent(); // replaces the broken patchRenderDecrypted()

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === '`') { e.preventDefault(); openTerminal(); }
  });

  console.log('[patch2] loaded ✓');
}
