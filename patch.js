/* ═══════════════════════════════════════════════════════════════════
   DREAM_JOURNAL  —  PATCH v2.0
   Feature: ◫ Calendar

   Add before </body>:  <script src="patch.js"></script>
═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─── CONFIG ─────────────────────────────────────────────────── */
  const CFG = {
    SB_URL: 'https://szyyypsfsxkwgthsqsrb.supabase.co',
    SB_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6eXl5cHNmc3hrd2d0aHNxc3JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNTIyNzMsImV4cCI6MjA5NTcyODI3M30.xWWl5sdaGZjubnz_uZOQM5lNLle-sTe7IjWII8GhN9k'
  };
  const SB_HDR = {
    'Content-Type': 'application/json',
    'apikey':        CFG.SB_KEY,
    'Authorization': 'Bearer ' + CFG.SB_KEY
  };

  /* ─── STATE ──────────────────────────────────────────────────── */
  const P = {
    pw:        null,
    entries:   [],
    decrypted: new Map(),
    calDate:   new Date(),
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
      }
    }
    if (e.key === 'Escape') {
      P.pw = null; P.decrypted.clear();
    }
  }, true);

  /* ─── CSS ────────────────────────────────────────────────────── */
  const CSS = `
#patch-cal-overlay {
  position: fixed; inset: 0;
  background: var(--paper);
  z-index: 300;
  display: none;
  flex-direction: column;
  font-family: 'IBM Plex Mono', 'Courier New', monospace;
}
#patch-cal-overlay.show { display: flex; }

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

#patch-cal-btn {
  background: transparent; border: 1px solid var(--ink-ghost);
  color: var(--ink-faint); font-family: 'IBM Plex Mono', monospace;
  font-size: 10px; letter-spacing: 0.5px; cursor: pointer;
  padding: 1px 7px; flex-shrink: 0; line-height: 1.6; transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
}
#patch-cal-btn:hover, #patch-cal-btn:active { background: var(--ink-ghost); color: var(--ink); }

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

@media (max-width: 640px) {
  #patch-cal-body { padding: 14px 12px 48px; }
  .patch-cal-grid { max-width: 100%; }
  .patch-day { min-height: 42px; gap: 2px; padding: 4px 1px; }
  .patch-day-num { font-size: 11px; }
  .patch-mini-fl { font-size: 6px; padding: 0 3px; }
  .patch-cal-nav { gap: 10px; }
  #patch-cal-month-lbl { min-width: 120px; font-size: 10px; }
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
      themeBtn.before(calBtn);
    }

    const calEl = document.createElement('div');
    calEl.id = 'patch-cal-overlay';
    calEl.innerHTML = `
      <div class="patch-titlebar">
        <span>Calendar Archive</span>
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

    document.getElementById('patch-cal-close').addEventListener('click', closeCalendar);
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

  /* ─── INIT ───────────────────────────────────────────────────── */
  function boot() {
    injectCSS(); injectUI();
    pFetchEntries();
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else setTimeout(boot,80);

})();
