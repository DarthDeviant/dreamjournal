/* ═══════════════════════════════════════════════════════════════════
   DREAM_JOURNAL  —  PATCH v1.0  (local-proxy build)
   Features: ◫ Calendar · ∿ Dream Analyzer · 2-Line Summarizer

   Uses your local Claude proxy at localhost:8082 — no API key needed.

   HOW TO USE:
   1. Start your proxy:
        ANTHROPIC_AUTH_TOKEN="freecc" ANTHROPIC_BASE_URL="http://localhost:8082" claude
   2. Add before </body>:  <script src="patch.js"></script>
═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─── CONFIG ─────────────────────────────────────────────────── */
  const CFG = {
    CLAUDE_URL:   'http://localhost:8082/v1/messages',
    CLAUDE_TOKEN: 'freecc',
    SB_URL: 'https://szyyypsfsxkwgthsqsrb.supabase.co',
    SB_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6eXl5cHNmc3hrd2d0aHNxc3JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNTIyNzMsImV4cCI6MjA5NTcyODI3M30.xWWl5sdaGZjubnz_uZOQM5lNLle-sTe7IjWII8GhN9k'
  };
  const SB_HDR = {
    'Content-Type': 'application/json',
    'apikey': CFG.SB_KEY,
    'Authorization': 'Bearer ' + CFG.SB_KEY
  };

  /* ─── STATE ──────────────────────────────────────────────────── */
  const P = {
    pw:            null,
    entries:       [],
    decrypted:     new Map(),
    calDate:       new Date(),
    summaryCache:  new Map(),
    analysisCache: null,
  };

  /* ─── CRYPTO  (mirrors main script) ─────────────────────────── */
  const _enc = new TextEncoder(), _dec = new TextDecoder();
  const _unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

  async function pDeriveKey(pw, salt) {
    const km = await crypto.subtle.importKey('raw', _enc.encode(pw), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
      km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
    );
  }
  async function pDecStr(obj, pw) {
    const key = await pDeriveKey(pw, _unb64(obj.salt));
    const pt  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: _unb64(obj.iv) }, key, _unb64(obj.data));
    return _dec.decode(pt);
  }

  /* ─── SUPABASE ───────────────────────────────────────────────── */
  async function pFetchEntries() {
    try {
      const r = await fetch(
        `${CFG.SB_URL}/rest/v1/dream_entries?select=id,data&order=created_at.desc`,
        { headers: SB_HDR }
      );
      if (!r.ok) return;
      P.entries = (await r.json()).map(row => row.data);
    } catch (e) { console.warn('[patch] fetch:', e); }
  }

  async function pDecryptAll() {
    if (!P.pw || !P.entries.length) return;
    P.decrypted.clear();
    await Promise.all(P.entries.map(async e => {
      try {
        const title   = await pDecStr(e.enc_title,   P.pw);
        const content = await pDecStr(e.enc_content, P.pw);
        P.decrypted.set(e.id, { title, content, flair: e.flair, date: e.date, time: e.time || '' });
      } catch {}
    }));
  }

  /* ─── CAPTURE PASSPHRASE ─────────────────────────────────────── */
  document.addEventListener('keydown', async e => {
    if (e.target.id !== 'pw-input') return;
    if (e.key === 'Enter') {
      const pw = e.target.value.trim();
      if (pw) {
        P.pw = pw;
        await pFetchEntries();
        await pDecryptAll();
        P.analysisCache = null;
      }
    }
    if (e.key === 'Escape') {
      P.pw = null; P.decrypted.clear(); P.summaryCache.clear(); P.analysisCache = null;
    }
  }, true);

  /* ─── CSS ────────────────────────────────────────────────────── */
  const CSS = `
#patch-cal-overlay,
#patch-ana-overlay {
  position: fixed; inset: 0;
  background: var(--paper);
  z-index: 300;
  display: none;
  flex-direction: column;
  font-family: 'IBM Plex Mono', 'Courier New', monospace;
}
#patch-cal-overlay.show, #patch-ana-overlay.show { display: flex; }

.patch-titlebar {
  background: var(--ink); color: var(--paper);
  padding: 5px 12px; font-size: 11px; letter-spacing: 1px;
  display: flex; align-items: center; justify-content: space-between;
  font-weight: 500; flex-shrink: 0; border-bottom: 2px solid var(--ink-mid);
}
.patch-close-btn {
  background: none; border: 1px solid var(--ink-mid); cursor: pointer;
  font-family: 'IBM Plex Mono', monospace; font-size: 11px;
  color: var(--paper-dim); letter-spacing: 1px; padding: 1px 6px; transition: background 0.1s;
}
.patch-close-btn:hover { background: var(--mark-err); color: var(--paper); border-color: var(--mark-err); }

#patch-cal-btn, #patch-ana-btn {
  background: transparent; border: 1px solid var(--ink-ghost);
  color: var(--ink-faint); font-family: 'IBM Plex Mono', monospace;
  font-size: 10px; letter-spacing: 0.5px; cursor: pointer;
  padding: 1px 7px; flex-shrink: 0; line-height: 1.6; transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
}
#patch-cal-btn:hover, #patch-cal-btn:active,
#patch-ana-btn:hover, #patch-ana-btn:active { background: var(--ink-ghost); color: var(--ink); }

/* ── Calendar ── */
#patch-cal-body {
  flex: 1; overflow-y: auto; padding: 28px 24px 60px;
  display: flex; flex-direction: column; align-items: center;
  scrollbar-width: thin; scrollbar-color: var(--rule-dark) transparent;
}
.patch-cal-nav {
  display: flex; align-items: center; gap: 18px; margin-bottom: 20px;
  font-size: 11px; letter-spacing: 2px; color: var(--ink); text-transform: uppercase;
}
.patch-cal-nav button {
  background: transparent; border: 1px solid var(--rule-dark); color: var(--ink-soft);
  font-family: 'IBM Plex Mono', monospace; font-size: 10px; padding: 3px 10px;
  cursor: pointer; letter-spacing: 1px; transition: all 0.1s;
}
.patch-cal-nav button:hover { background: var(--ink); color: var(--paper); }
#patch-cal-month-lbl { min-width: 180px; text-align: center; }

.patch-cal-grid {
  display: grid; grid-template-columns: repeat(7, 1fr);
  gap: 3px; width: 100%; max-width: 580px;
}
.patch-dow {
  text-align: center; font-size: 9px; letter-spacing: 2px;
  color: var(--ink-ghost); padding: 4px 0 6px; text-transform: uppercase;
}
.patch-day {
  aspect-ratio: 1 / 1.1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 4px;
  font-size: 11px; color: var(--ink-faint); border: 1px solid transparent;
  transition: all 0.1s; padding: 6px 2px; min-height: 50px; user-select: none;
}
.patch-day.empty { pointer-events: none; }
.patch-day.today { border-color: var(--rule-dark); color: var(--ink-soft); }
.patch-day-num { font-size: 12px; font-weight: 500; position: relative; }
.patch-day.today .patch-day-num::after {
  content: '·'; position: absolute; bottom: -8px; left: 50%;
  transform: translateX(-50%); font-size: 14px; color: var(--ink-soft); line-height: 0;
}
.patch-day.has-entry {
  cursor: pointer; background: var(--paper-dim);
  border-color: var(--rule-dark); color: var(--ink);
}
.patch-day.has-entry:hover { background: var(--ink); color: var(--paper); }
.patch-day.has-entry:hover .patch-mini-fl {
  color: var(--paper-dim); border-color: var(--ink-faint); background: transparent;
}
.patch-mini-fl {
  font-size: 7px; letter-spacing: 1px; padding: 1px 4px;
  border: 1px solid var(--rule-dark); color: var(--ink-soft);
  background: var(--paper-mid); text-transform: uppercase; line-height: 1.5;
  max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.patch-mini-fl.fl-lucid    { border-color: var(--ink-mid); color: var(--ink); }
.patch-mini-fl.fl-astral   { background: var(--ink); color: var(--paper); border-color: var(--ink); }
.patch-mini-fl.fl-vivid    { font-weight: 500; }
.patch-mini-fl.fl-vague    { font-style: italic; }
.patch-mini-fl.fl-no_record { color: var(--ink-ghost); background: transparent; border-color: var(--rule); }

#patch-cal-list {
  width: 100%; max-width: 580px; margin-top: 24px;
  border-top: 1px solid var(--rule); padding-top: 16px;
}
.patch-cal-list-hdr {
  font-size: 9px; letter-spacing: 2px; color: var(--ink-ghost);
  text-transform: uppercase; margin-bottom: 8px;
}
.patch-cal-list-hdr::before { content: '// '; }
.patch-cal-row {
  display: flex; align-items: center; gap: 10px; padding: 7px 10px;
  border-bottom: 1px solid var(--rule); cursor: pointer; transition: background 0.1s;
  font-size: 11px; color: var(--ink-mid);
}
.patch-cal-row:hover { background: var(--paper-mid); }
.patch-cal-row-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
.patch-cal-row-locked { color: var(--ink-ghost); font-style: italic; font-weight: 400; }
.patch-cal-row-date { font-size: 9px; color: var(--ink-ghost); letter-spacing: 1px; flex-shrink: 0; text-transform: uppercase; }

/* ── Summary ── */
.patch-summary {
  margin-top: 22px; border: 1px solid var(--rule-dark);
  border-left: 3px solid var(--ink-soft); padding: 12px 16px; background: var(--paper-dim);
}
.patch-summary-hdr {
  font-size: 9px; letter-spacing: 2px; color: var(--ink-ghost);
  text-transform: uppercase; margin-bottom: 8px;
}
.patch-summary-hdr::before { content: '// '; }
.patch-summary-text { font-size: 12px; line-height: 1.85; color: var(--ink-mid); white-space: pre-wrap; font-style: italic; }
.patch-summary-pending { font-size: 10px; color: var(--mark-warn); letter-spacing: 1px; animation: blink 1.1s step-end infinite; }
.patch-summary-err { font-size: 10px; color: var(--ink-ghost); letter-spacing: 1px; }

/* ── Analyzer ── */
#patch-ana-body {
  flex: 1; overflow-y: auto; padding: 28px 32px 60px;
  scrollbar-width: thin; scrollbar-color: var(--rule-dark) transparent;
}
.patch-ana-gate {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; gap: 12px; color: var(--ink-ghost); font-size: 11px;
  letter-spacing: 2px; text-transform: uppercase; text-align: center; padding: 40px;
}
.patch-ana-gate .gate-icon { font-family: 'VT323', monospace; font-size: 64px; color: var(--ink-faint); line-height: 1; margin-bottom: 8px; }
.patch-ana-spinner {
  display: flex; flex-direction: column; align-items: center; gap: 14px;
  color: var(--ink-ghost); font-size: 10px; letter-spacing: 2px; text-transform: uppercase; padding: 60px 0;
}
.patch-ana-spinner-dot { width: 8px; height: 8px; background: var(--ink-soft); animation: blink 1.1s step-end infinite; }
.patch-section { margin-bottom: 30px; padding-bottom: 26px; border-bottom: 1px solid var(--rule); }
.patch-section:last-child { border-bottom: none; }
.patch-section-title { font-size: 9px; letter-spacing: 3px; color: var(--ink-ghost); text-transform: uppercase; margin-bottom: 12px; }
.patch-section-title::before { content: '» '; color: var(--ink-faint); }
.patch-section-body { font-size: 12px; line-height: 1.95; color: var(--ink-mid); white-space: pre-wrap; }
.patch-stat-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.patch-stat-chip {
  display: inline-flex; align-items: center; gap: 7px; padding: 3px 10px;
  border: 1px solid var(--rule-dark); font-size: 10px; letter-spacing: 1px;
  color: var(--ink-soft); background: var(--paper-dim); text-transform: uppercase;
}
.patch-bar-track { display: flex; height: 5px; width: 100%; max-width: 460px; gap: 1px; margin-top: 6px; }
.patch-ana-footer {
  font-size: 9px; color: var(--ink-ghost); letter-spacing: 1px;
  margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--rule);
}
.patch-ana-footer::before { content: '// '; }

@media (max-width: 640px) {
  #patch-cal-body { padding: 14px 12px 48px; }
  #patch-ana-body { padding: 14px 14px 48px; }
  .patch-cal-grid { max-width: 100%; }
  .patch-day { min-height: 42px; gap: 2px; padding: 4px 1px; }
  .patch-day-num { font-size: 11px; }
  .patch-mini-fl { font-size: 6px; padding: 0 3px; }
  .patch-cal-nav { gap: 10px; }
  #patch-cal-month-lbl { min-width: 120px; font-size: 10px; }
  .patch-section-body { font-size: 11px; }
}
`;

  /* ─── INJECT CSS ─────────────────────────────────────────────── */
  function injectCSS() {
    document.head.appendChild(Object.assign(document.createElement('style'), { textContent: CSS }));
  }

  /* ─── INJECT UI ──────────────────────────────────────────────── */
  function injectUI() {
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      const calBtn = Object.assign(document.createElement('button'), {
        id: 'patch-cal-btn', title: 'Calendar — browse by date', textContent: '◫ cal'
      });
      calBtn.addEventListener('click', openCalendar);

      const anaBtn = Object.assign(document.createElement('button'), {
        id: 'patch-ana-btn', title: 'Dream Analyzer — AI pattern analysis', textContent: '∿ analyze'
      });
      anaBtn.addEventListener('click', openAnalyzer);

      themeBtn.before(calBtn, anaBtn);
    }

    // Calendar overlay
    const calEl = document.createElement('div');
    calEl.id = 'patch-cal-overlay';
    calEl.innerHTML = `
      <div class="patch-titlebar">
        <span>DREAM_JOURNAL.EXE &mdash; Calendar Archive</span>
        <button class="patch-close-btn" id="patch-cal-close">[ close ]</button>
      </div>
      <div id="patch-cal-body">
        <div class="patch-cal-nav">
          <button id="patch-cal-prev">&#x25C0; prev</button>
          <span id="patch-cal-month-lbl"></span>
          <button id="patch-cal-next">next &#x25B6;</button>
        </div>
        <div class="patch-cal-grid" id="patch-cal-grid"></div>
        <div id="patch-cal-list"></div>
      </div>`;
    document.body.appendChild(calEl);

    // Analyzer overlay
    const anaEl = document.createElement('div');
    anaEl.id = 'patch-ana-overlay';
    anaEl.innerHTML = `
      <div class="patch-titlebar">
        <span>DREAM_JOURNAL.EXE &mdash; Dream Analyzer</span>
        <button class="patch-close-btn" id="patch-ana-close">[ close ]</button>
      </div>
      <div id="patch-ana-body">
        <div class="patch-ana-spinner" id="patch-ana-spin">
          <div class="patch-ana-spinner-dot"></div>
          <span>Scanning dream patterns...</span>
        </div>
        <div id="patch-ana-result"></div>
      </div>`;
    document.body.appendChild(anaEl);

    document.getElementById('patch-cal-close').addEventListener('click', closeCalendar);
    document.getElementById('patch-ana-close').addEventListener('click', closeAnalyzer);
    document.getElementById('patch-cal-prev').addEventListener('click', () => { P.calDate.setMonth(P.calDate.getMonth()-1); renderCal(); });
    document.getElementById('patch-cal-next').addEventListener('click', () => { P.calDate.setMonth(P.calDate.getMonth()+1); renderCal(); });
  }

  /* ─── CALENDAR ───────────────────────────────────────────────── */
  const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  const DOWS   = ['sun','mon','tue','wed','thu','fri','sat'];

  async function openCalendar() { await pFetchEntries(); renderCal(); document.getElementById('patch-cal-overlay').classList.add('show'); }
  function closeCalendar() { document.getElementById('patch-cal-overlay').classList.remove('show'); }

  function renderCal() {
    const yr = P.calDate.getFullYear(), mo = P.calDate.getMonth();
    document.getElementById('patch-cal-month-lbl').textContent = `${MONTHS[mo]}  ${yr}`;

    const byDate = {};
    for (const e of P.entries) { if (!byDate[e.date]) byDate[e.date]=[]; byDate[e.date].push(e); }

    const grid = document.getElementById('patch-cal-grid');
    grid.innerHTML = '';
    DOWS.forEach(d => grid.appendChild(Object.assign(document.createElement('div'), { className:'patch-dow', textContent:d })));

    const firstDow = new Date(yr,mo,1).getDay(), daysInMo = new Date(yr,mo+1,0).getDate();
    const today = new Date(), isThisMo = yr===today.getFullYear() && mo===today.getMonth();

    for (let i=0;i<firstDow;i++) grid.appendChild(Object.assign(document.createElement('div'),{className:'patch-day empty'}));

    for (let d=1;d<=daysInMo;d++) {
      const dateStr = `${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const hits = byDate[dateStr]||[], isToday = isThisMo && d===today.getDate();
      const cell = document.createElement('div');
      cell.className = 'patch-day'+(isToday?' today':'')+(hits.length?' has-entry':'');
      cell.appendChild(Object.assign(document.createElement('div'),{className:'patch-day-num',textContent:d}));
      if (hits.length) {
        const e=hits[0];
        cell.appendChild(Object.assign(document.createElement('span'),{
          className:`patch-mini-fl fl-${e.flair}`,textContent:e.flair==='no_record'?'no rec':e.flair
        }));
        cell.addEventListener('click',()=>{closeCalendar();jumpToEntry(e.id);});
      }
      grid.appendChild(cell);
    }
    renderCalList(byDate,yr,mo);
  }

  function renderCalList(byDate,yr,mo) {
    const container = document.getElementById('patch-cal-list');
    container.innerHTML='';
    const hits=[];
    for (const [date,entries] of Object.entries(byDate)) {
      const d=new Date(date+'T00:00:00');
      if (d.getFullYear()===yr&&d.getMonth()===mo) entries.forEach(e=>hits.push({...e,_d:d}));
    }
    hits.sort((a,b)=>b._d-a._d);
    if (!hits.length) return;
    container.appendChild(Object.assign(document.createElement('div'),{
      className:'patch-cal-list-hdr',textContent:`${hits.length} entr${hits.length>1?'ies':'y'} this month`
    }));
    for (const e of hits) {
      const dec=P.decrypted.get(e.id), row=document.createElement('div');
      row.className='patch-cal-row';
      row.appendChild(Object.assign(document.createElement('span'),{className:`patch-mini-fl fl-${e.flair}`,textContent:e.flair==='no_record'?'no rec':e.flair}));
      row.appendChild(Object.assign(document.createElement('div'),{className:'patch-cal-row-title'+(dec?'':' patch-cal-row-locked'),textContent:dec?dec.title:'[encrypted — unlock to reveal]'}));
      row.appendChild(Object.assign(document.createElement('span'),{className:'patch-cal-row-date',textContent:e.date}));
      row.addEventListener('click',()=>{closeCalendar();jumpToEntry(e.id);});
      container.appendChild(row);
    }
  }

  function jumpToEntry(id) {
    const idx=P.entries.findIndex(e=>e.id===id); if (idx<0) return;
    const sidebar=document.getElementById('sidebar');
    if (sidebar&&window.innerWidth<=640) sidebar.classList.add('open');
    requestAnimationFrame(()=>{ const c=document.querySelectorAll('#entry-list .ec'); if(c[idx]) c[idx].click(); });
  }

  /* ─── SUMMARIZER ─────────────────────────────────────────────── */
  let _sumTimer=null;
  const entryObs=new MutationObserver(()=>{ clearTimeout(_sumTimer); _sumTimer=setTimeout(trySummary,320); });

  function trySummary() {
    const display=document.getElementById('entry-display');
    if (!display||display.style.display==='none') return;
    const bodyEl=display.querySelector('.ed-body');
    if (!bodyEl||bodyEl.classList.contains('enc')||bodyEl.classList.contains('decrypting')) return;
    const content=bodyEl.textContent.trim(); if (!content) return;
    if (display.querySelector('.patch-summary')) return;
    const titleEl=display.querySelector('[id^="edt-"]');
    const id=titleEl?titleEl.id.replace('edt-',''):null;
    injectSummaryBlock(display,id,content);
  }

  function injectSummaryBlock(display,id,content) {
    const block=document.createElement('div'); block.className='patch-summary';
    if (id&&P.summaryCache.has(id)) {
      block.innerHTML=`<div class="patch-summary-hdr">2-line summary</div><div class="patch-summary-text">${xss(P.summaryCache.get(id))}</div>`;
    } else {
      block.innerHTML=`<div class="patch-summary-hdr">2-line summary</div><div class="patch-summary-pending">summarizing...</div>`;
      fetchSummary(block,id,content);
    }
    const actions=display.querySelector('.ed-actions');
    if (actions) actions.before(block); else display.appendChild(block);
  }

  async function fetchSummary(block,id,content) {
    const pendEl=block.querySelector('.patch-summary-pending');
    try {
      const result=await callClaude(
        `Summarize this dream journal entry in exactly 2 evocative but concise lines.\nNo preamble. Just the 2 lines.\n\nDream:\n${content.slice(0,2500)}`,
        160
      );
      if (id) P.summaryCache.set(id,result);
      if (pendEl) pendEl.replaceWith(Object.assign(document.createElement('div'),{className:'patch-summary-text',textContent:result}));
    } catch(e) {
      console.warn('[patch] summary:',e);
      if (pendEl) { pendEl.className='patch-summary-err'; pendEl.textContent='[proxy unreachable — is it running?]'; }
    }
  }

  /* ─── ANALYZER ───────────────────────────────────────────────── */
  function openAnalyzer() { document.getElementById('patch-ana-overlay').classList.add('show'); runAnalysis(); }
  function closeAnalyzer() { document.getElementById('patch-ana-overlay').classList.remove('show'); }

  async function runAnalysis() {
    const spinEl=document.getElementById('patch-ana-spin'), resultEl=document.getElementById('patch-ana-result');
    if (!P.pw||P.decrypted.size===0) {
      spinEl.style.display='none'; resultEl.style.display='block';
      resultEl.innerHTML=`<div class="patch-ana-gate"><div class="gate-icon">▓</div><div>journal is locked</div><div style="margin-top:8px;font-size:9px;color:var(--ink-ghost)">unlock your journal to analyze dreams</div></div>`;
      return;
    }
    if (P.analysisCache) { spinEl.style.display='none'; resultEl.style.display='block'; resultEl.innerHTML=P.analysisCache; return; }
    spinEl.style.display='flex'; resultEl.style.display='none'; resultEl.innerHTML='';
    try {
      const dreams=[...P.decrypted.values()];
      const corpus=dreams.map((d,i)=>`[DREAM ${i+1}] Date: ${d.date} | Type: ${d.flair}\nTitle: ${d.title}\n${d.content}`).join('\n\n---\n\n').slice(0,9000);
      const flairCounts={}; dreams.forEach(d=>{flairCounts[d.flair]=(flairCounts[d.flair]||0)+1;});

      const raw=await callClaude(
`You are a dream analyst. Analyze this dream journal (${dreams.length} entries). Use EXACTLY these section headers.
Be specific — reference actual details from the dreams.

RECURRING_THEMES
[3-5 recurring motifs or narrative structures]

COMMON_SYMBOLS
[specific objects, figures, colors, sensations that recur]

DREAM_LOCATIONS
[recurring settings and what they might represent]

PSYCHOLOGICAL_PATTERNS
[what the dreams reveal about the dreamer's inner world]

POSSIBLE_MEANINGS
[interpretations of the most prominent pattern clusters]

CLARITY_TRAJECTORY
[is recall/lucidity improving over time?]

SANITY_INDEX
[playful 0-100 score with a one-line interpretation]

Keep each section under 6 lines. Speak to the dreamer directly.

DREAMS:
${corpus}`, 1200);

      const html=buildAnalysisHTML(raw,flairCounts,dreams.length);
      P.analysisCache=html; spinEl.style.display='none'; resultEl.style.display='block'; resultEl.innerHTML=html;
    } catch(e) {
      console.error('[patch] analysis:',e);
      spinEl.style.display='none'; resultEl.style.display='block';
      resultEl.innerHTML=`<div class="patch-ana-gate"><div class="gate-icon">!</div><div>analysis failed</div><div style="margin-top:8px;font-size:9px;color:var(--ink-ghost)">${xss(e.message||'unknown')} — is your proxy running?</div></div>`;
    }
  }

  const ANA_SECTIONS=[
    ['RECURRING_THEMES','recurring themes'],['COMMON_SYMBOLS','common symbols & elements'],
    ['DREAM_LOCATIONS','locations & settings'],['PSYCHOLOGICAL_PATTERNS','psychological patterns'],
    ['POSSIBLE_MEANINGS','possible meanings'],['CLARITY_TRAJECTORY','clarity trajectory'],
    ['SANITY_INDEX','sanity index'],
  ];

  function buildAnalysisHTML(raw,flairCounts,total) {
    const flairOrder=['astral','lucid','vivid','vague','no_record'];
    const flairLabel={no_record:'no rec',vague:'vague',vivid:'vivid',lucid:'lucid',astral:'astral'};
    const flairAlpha={no_record:0.25,vague:0.35,vivid:0.55,lucid:0.75,astral:1};
    let html=`<div class="patch-section"><div class="patch-section-title">classification breakdown — ${total} entr${total>1?'ies':'y'}</div><div class="patch-stat-row">`;
    for (const f of flairOrder) {
      if (!flairCounts[f]) continue;
      const pct=Math.round((flairCounts[f]/total)*100);
      html+=`<span class="patch-stat-chip"><span class="patch-mini-fl fl-${f}">${flairLabel[f]}</span>${flairCounts[f]}&thinsp;·&thinsp;${pct}%</span>`;
    }
    html+=`</div><div class="patch-bar-track">`;
    for (const f of flairOrder) {
      if (!flairCounts[f]) continue;
      html+=`<div class="patch-bar-seg" style="flex:${(flairCounts[f]/total)*100};background:var(--ink-mid);opacity:${flairAlpha[f]}"></div>`;
    }
    html+=`</div></div>`;
    for (const [key,label] of ANA_SECTIONS) {
      const re=new RegExp(key+'\\s*\\n([\\s\\S]*?)(?='+ANA_SECTIONS.map(s=>s[0]).filter(k=>k!==key).join('|')+'|$)','i');
      const m=raw.match(re), body=m?m[1].trim():''; if (!body) continue;
      html+=`<div class="patch-section"><div class="patch-section-title">${label}</div><div class="patch-section-body">${xss(body)}</div></div>`;
    }
    html+=`<div class="patch-ana-footer">analysis via local claude proxy · ${new Date().toLocaleDateString('en-US',{month:'short',day:'2-digit',year:'numeric'})}</div>`;
    return html;
  }

  /* ─── CLAUDE API  →  local proxy ────────────────────────────── */
  async function callClaude(prompt, maxTokens=500) {
    const r=await fetch(CFG.CLAUDE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CFG.CLAUDE_TOKEN,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        messages: [{ role:'user', content:prompt }]
      })
    });
    if (!r.ok) { const t=await r.text(); throw new Error(`proxy ${r.status}: ${t.slice(0,120)}`); }
    const data=await r.json();
    return data.content.map(c=>c.text||'').filter(Boolean).join('');
  }

  function xss(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  /* ─── INIT ───────────────────────────────────────────────────── */
  function boot() {
    injectCSS(); injectUI();
    const display=document.getElementById('entry-display');
    if (display) entryObs.observe(display,{childList:true,subtree:true});
    pFetchEntries();
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else setTimeout(boot,80);

})();
