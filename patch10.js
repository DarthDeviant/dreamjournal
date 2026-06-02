/* ═══════════════════════════════════════════════════════════════
   patch10.js  —  Dream Journal menu system (v10)
   • File  → dropdown: New Entry, Export, Lucid List, ─, Lock
   • Edit  → dropdown: list of all entries (lock-gated labels)
             selecting one opens a full Edit Entry panel
   • Edit Entry panel: pre-filled form, re-encrypts on save,
     updates Supabase via existing saveEntry API
   • Dropdowns close on outside click / Escape
   • Integrates with patch4 lock/unlock state
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     CSS
  ══════════════════════════════════════════════════════════ */
  const P10_CSS = `

/* ── Dropdown container ── */
.p10-dropdown {
  position: fixed;
  z-index: 500;
  background: var(--paper-dim);
  border: 1px solid var(--rule-dark);
  border-top: none;
  min-width: 200px;
  box-shadow: 3px 4px 0 var(--ink-ghost);
  display: none;
  flex-direction: column;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
}
.p10-dropdown.open { display: flex; }

/* ── Dropdown rows ── */
.p10-dd-item {
  padding: 7px 14px;
  color: var(--ink-mid);
  cursor: pointer;
  letter-spacing: 0.5px;
  white-space: nowrap;
  border-bottom: 1px solid var(--rule);
  transition: background 0.08s, color 0.08s;
  display: flex;
  align-items: center;
  gap: 8px;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}
.p10-dd-item:last-child { border-bottom: none; }
.p10-dd-item:hover, .p10-dd-item:active {
  background: var(--ink);
  color: var(--paper);
}
.p10-dd-item.locked {
  color: var(--ink-ghost);
  cursor: default;
  pointer-events: none;
}
.p10-dd-item .p10-glyph {
  color: var(--ink-faint);
  font-size: 10px;
  flex-shrink: 0;
  width: 14px;
  text-align: center;
}
.p10-dd-item:hover .p10-glyph { color: var(--ink-ghost); }

.p10-dd-sep {
  border: none;
  border-top: 1px solid var(--rule-dark);
  margin: 2px 0;
  flex-shrink: 0;
}

.p10-dd-header {
  padding: 4px 14px 3px;
  font-size: 9px;
  letter-spacing: 2px;
  color: var(--ink-faint);
  text-transform: uppercase;
  border-bottom: 1px solid var(--rule-dark);
  background: var(--paper-mid);
  flex-shrink: 0;
}
.p10-dd-header::before { content: '// '; color: var(--ink-ghost); }

/* Edit entries list inside Edit dropdown */
.p10-dd-entries {
  max-height: 320px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: var(--rule-dark) transparent;
}
.p10-dd-entries::-webkit-scrollbar { width: 3px; }
.p10-dd-entries::-webkit-scrollbar-thumb { background: var(--rule-dark); }

/* Active menu-item highlight */
.menu-item.p10-active {
  background: var(--ink) !important;
  color: var(--paper) !important;
}

/* ═══════════════════════════════════════════════════
   EDIT ENTRY PANEL  — fullscreen split, mirrors modal
═══════════════════════════════════════════════════ */
#p10-edit-panel {
  position: fixed; inset: 0;
  background: var(--paper);
  z-index: 300;
  display: none;
  flex-direction: column;
  font-family: 'IBM Plex Mono', monospace;
}
#p10-edit-panel.show { display: flex; }

.p10-ep-titlebar {
  background: var(--ink);
  color: var(--paper);
  padding: 5px 12px;
  font-size: 11px;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  font-weight: 500;
}
.p10-ep-close {
  background: none;
  border: 1px solid var(--ink-mid);
  cursor: pointer;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: var(--paper-dim);
  letter-spacing: 1px;
  padding: 1px 6px;
  -webkit-tap-highlight-color: transparent;
}
.p10-ep-close:hover, .p10-ep-close:active {
  background: var(--mark-err);
  color: var(--paper);
  border-color: var(--mark-err);
}

.p10-ep-box {
  flex: 1;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  min-height: 0;
}

/* Left: metadata */
.p10-ep-left {
  width: 300px;
  min-width: 260px;
  max-width: 340px;
  flex-shrink: 0;
  border-right: 2px solid var(--rule-dark);
  background: var(--paper-dim);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.p10-ep-left-hdr {
  padding: 10px 16px 8px;
  font-size: 9px;
  letter-spacing: 2px;
  color: var(--ink-faint);
  text-transform: uppercase;
  border-bottom: 1px solid var(--rule-dark);
  flex-shrink: 0;
  background: var(--paper-mid);
}
.p10-ep-left-hdr::before { content: '> '; color: var(--ink-ghost); }
.p10-ep-left-body {
  padding: 20px 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* Right: content textarea */
.p10-ep-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  background: var(--paper);
}
.p10-ep-right-hdr {
  padding: 10px 16px 8px;
  font-size: 9px;
  letter-spacing: 2px;
  color: var(--ink-faint);
  text-transform: uppercase;
  border-bottom: 1px solid var(--rule-dark);
  flex-shrink: 0;
  background: var(--paper-dim);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.p10-ep-right-hdr span::before { content: '> '; color: var(--ink-ghost); }

/* Status bar inside the edit panel */
.p10-ep-status {
  padding: 5px 16px;
  font-size: 9px;
  letter-spacing: 1px;
  color: var(--ink-ghost);
  border-top: 1px solid var(--rule);
  background: var(--paper-dim);
  flex-shrink: 0;
  display: flex;
  gap: 10px;
}
.p10-ep-status .p10-st-ok   { color: var(--mark-ok); }
.p10-ep-status .p10-st-warn { color: var(--mark-warn); }
.p10-ep-status .p10-st-err  { color: var(--mark-err); }

/* Save button */
#p10-save-btn {
  width: 100%;
  padding: 10px 12px;
  background: var(--ink);
  border: none;
  color: var(--paper);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  letter-spacing: 1px;
  cursor: pointer;
  text-align: left;
  margin-top: auto;
  padding-top: 12px;
  -webkit-tap-highlight-color: transparent;
  text-transform: uppercase;
  flex-shrink: 0;
  transition: opacity 0.15s;
}
#p10-save-btn::before { content: '~ '; }
#p10-save-btn:hover, #p10-save-btn:active { opacity: 0.75; }
#p10-save-btn:disabled { opacity: 0.4; cursor: default; }

/* Content editor textarea */
#p10-eco {
  flex: 1;
  width: 100%;
  resize: none;
  background: var(--paper);
  border: none;
  border-left: 3px solid var(--rule-dark);
  color: var(--ink);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 13px;
  line-height: 1.75;
  padding: 20px 24px;
  outline: none;
  letter-spacing: 0.2px;
  tab-size: 2;
  font-style: italic;
  transition: border-left-color 0.15s;
}
#p10-eco:focus {
  border-left-color: var(--ink-soft);
  font-style: normal;
}

/* Form fields reuse .fi / .fl-lbl / .fg / .fg-row / .fsel / .fr from main styles */
/* Mobile */
@media (max-width: 640px) {
  .p10-ep-box    { flex-direction: column; }
  .p10-ep-left   { width: 100%; max-width: 100%; min-width: unset; border-right: none; border-bottom: 2px solid var(--rule-dark); overflow-y: visible; }
  #p10-eco       { min-height: 260px; font-size: 16px; padding: 14px; }
  .p10-ep-right  { flex: 1; min-height: 0; }
  #p10-save-btn  { font-size: 14px; padding: 14px 16px; }
  .p10-ep-left-body { padding: 14px; }
  .p10-dropdown  { min-width: 170px; font-size: 10px; }
}
`;

  /* ── inject styles ── */
  const sEl = document.createElement('style');
  sEl.id = 'p10-styles';
  sEl.textContent = P10_CSS;
  document.head.appendChild(sEl);

  /* ══════════════════════════════════════════════════════════
     DROPDOWN STATE
  ══════════════════════════════════════════════════════════ */
  let openDropdown = null;   // currently visible dropdown element
  let activeTrigger = null;  // the menu-item that triggered it

  function closeAllDropdowns() {
    if (openDropdown) {
      openDropdown.classList.remove('open');
      openDropdown = null;
    }
    if (activeTrigger) {
      activeTrigger.classList.remove('p10-active');
      activeTrigger = null;
    }
  }

  function toggleDropdown(trigger, dropdown) {
    const isOpen = dropdown.classList.contains('open');
    closeAllDropdowns();
    if (isOpen) return; // was already open — just close it

    // Position below the trigger
    const rect = trigger.getBoundingClientRect();
    dropdown.style.top  = rect.bottom + 'px';
    dropdown.style.left = rect.left + 'px';

    dropdown.classList.add('open');
    openDropdown  = dropdown;
    activeTrigger = trigger;
    trigger.classList.add('p10-active');
  }

  /* Close on outside click */
  document.addEventListener('click', e => {
    if (!openDropdown) return;
    if (!openDropdown.contains(e.target) && e.target !== activeTrigger && !activeTrigger?.contains(e.target)) {
      closeAllDropdowns();
    }
  }, true);

  /* Close on Escape (but don't fight the main Escape handler) */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && openDropdown) {
      closeAllDropdowns();
      e.stopImmediatePropagation();
    }
  }, true);

  /* ══════════════════════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════════════════════ */
  function $id(id) { return document.getElementById(id); }
  const FL_LABELS = { no_record:'No Record', vague:'Vague', vivid:'Vivid', lucid:'Lucid', astral:'Astral' };
  const GC = '░▒▓▄▀■□~*+=#@&?!./|:ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz0123456789';

  function seededFakeTitle(id) {
    let h = 2166136261 >>> 0;
    for (const ch of id + '_t') h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    let s = h || 1337;
    const r = () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 4294967295; };
    const n = 10 + Math.floor(r() * 14);
    return Array.from({ length: n }, () => GC[Math.floor(r() * GC.length)]).join('');
  }

  function fmtShortDate(d) {
    try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month:'short', day:'2-digit', year:'numeric' }); }
    catch { return d; }
  }

  function isUnlocked() { return !!window.S?.unlocked; }

  /* ══════════════════════════════════════════════════════════
     FILE DROPDOWN
  ══════════════════════════════════════════════════════════ */
  function buildFileDropdown() {
    const dd = document.createElement('div');
    dd.className = 'p10-dropdown';
    dd.id = 'p10-file-dd';
    dd.innerHTML = `
      <div class="p10-dd-header">File</div>
      <div class="p10-dd-item" id="p10-f-new">
        <span class="p10-glyph">+</span>New Entry
      </div>
      <hr class="p10-dd-sep">
      <div class="p10-dd-item" id="p10-f-export">
        <span class="p10-glyph">↓</span>Export JSON
      </div>
      <div class="p10-dd-item" id="p10-f-lucid">
        <span class="p10-glyph">★</span>Lucid List
      </div>
      <hr class="p10-dd-sep">
      <div class="p10-dd-item" id="p10-f-lock">
        <span class="p10-glyph">⊠</span>Lock Journal
      </div>`;
    document.body.appendChild(dd);

    $id('p10-f-new').addEventListener('click', () => {
      closeAllDropdowns();
      // Call the existing openModal if available
      if (typeof window.openModal === 'function') {
        window.openModal();
      } else {
        $id('menu-new')?.click();
      }
    });

    $id('p10-f-export').addEventListener('click', () => {
      closeAllDropdowns();
      if (typeof window.exportJSON === 'function') {
        window.exportJSON();
      } else {
        $id('menu-export')?.click();
      }
    });

    $id('p10-f-lucid').addEventListener('click', () => {
      closeAllDropdowns();
      const lucidBtn = $id('menu-lucid');
      if (lucidBtn) {
        lucidBtn.click();
      } else if (typeof window.notify === 'function') {
        window.notify('Lucid List not available (patch9 required).', 'inf');
      }
    });

    $id('p10-f-lock').addEventListener('click', () => {
      closeAllDropdowns();
      if (!isUnlocked()) {
        window.notify?.('Journal is already locked.', 'inf');
        return;
      }
      // Call main lock() if exposed, else simulate Escape on pw-input
      if (typeof window.lock === 'function') {
        window.lock();
      } else {
        const pwi = $id('pw-input');
        if (pwi) {
          pwi.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
        }
      }
    });

    return dd;
  }

  /* ══════════════════════════════════════════════════════════
     EDIT DROPDOWN
  ══════════════════════════════════════════════════════════ */
  function buildEditDropdown() {
    const dd = document.createElement('div');
    dd.className = 'p10-dropdown';
    dd.id = 'p10-edit-dd';
    dd.style.minWidth = '260px';
    dd.innerHTML = `
      <div class="p10-dd-header">Edit Entry</div>
      <div class="p10-dd-entries" id="p10-edit-list"></div>`;
    document.body.appendChild(dd);
    return dd;
  }

  /* Populate the Edit dropdown with current entries */
  function populateEditDropdown() {
    const list = $id('p10-edit-list');
    if (!list) return;
    list.innerHTML = '';

    const entries = window.S?.entries || [];
    if (!entries.length) {
      const empty = document.createElement('div');
      empty.className = 'p10-dd-item locked';
      empty.style.fontStyle = 'italic';
      empty.textContent = 'No entries yet.';
      list.appendChild(empty);
      return;
    }

    const unlocked = isUnlocked();
    if (!unlocked) {
      const msg = document.createElement('div');
      msg.className = 'p10-dd-item locked';
      msg.innerHTML = '<span class="p10-glyph">⊠</span>Unlock journal to edit entries';
      list.appendChild(msg);
      return;
    }

    entries.forEach(entry => {
      const cached = window.S.cache.get(entry.id);
      const titleText = cached?.title || '[encrypted]';

      const row = document.createElement('div');
      row.className = 'p10-dd-item';
      row.innerHTML = `
        <span class="p10-glyph" style="font-size:8px;letter-spacing:0">${fmtShortDate(entry.date)}</span>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">${titleText}</span>`;
      row.title = `${fmtShortDate(entry.date)} — ${titleText}`;
      row.addEventListener('click', () => {
        closeAllDropdowns();
        openEditPanel(entry);
      });
      list.appendChild(row);
    });
  }

  /* ══════════════════════════════════════════════════════════
     EDIT ENTRY PANEL
  ══════════════════════════════════════════════════════════ */
  let currentEditId = null;

  function buildEditPanel() {
    if ($id('p10-edit-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'p10-edit-panel';
    panel.innerHTML = `
      <div class="p10-ep-titlebar">
        <span id="p10-ep-title">dream journal — Edit Entry</span>
        <button class="p10-ep-close" id="p10-ep-close">[ close ]</button>
      </div>
      <div class="p10-ep-box">

        <!-- LEFT: metadata -->
        <div class="p10-ep-left">
          <div class="p10-ep-left-hdr">edit metadata</div>
          <div class="p10-ep-left-body">

            <div class="fg">
              <label class="fl-lbl" for="p10-ei">Dream Title</label>
              <input type="text" class="fi" id="p10-ei" placeholder="dream title..." autocomplete="off">
            </div>

            <div class="fg-row">
              <div class="fg">
                <label class="fl-lbl" for="p10-edt">Date</label>
                <input type="date" class="fi" id="p10-edt">
              </div>
              <div class="fg" style="max-width:120px">
                <label class="fl-lbl" for="p10-etm">Time</label>
                <input type="time" class="fi" id="p10-etm">
              </div>
            </div>

            <div class="fg">
              <label class="fl-lbl">Classification</label>
              <div class="fsel">
                <input type="radio" class="fr" name="p10fl" id="p10-fr-nr" value="no_record"><label for="p10-fr-nr">No Record</label>
                <input type="radio" class="fr" name="p10fl" id="p10-fr-vg" value="vague"><label for="p10-fr-vg">Vague</label>
                <input type="radio" class="fr" name="p10fl" id="p10-fr-vv" value="vivid"><label for="p10-fr-vv">Vivid</label>
                <input type="radio" class="fr" name="p10fl" id="p10-fr-lc" value="lucid"><label for="p10-fr-lc">Lucid</label>
                <input type="radio" class="fr" name="p10fl" id="p10-fr-as" value="astral"><label for="p10-fr-as">Astral</label>
              </div>
            </div>

            <div id="p10-ep-status-area" style="margin-top:auto;padding-top:12px;font-size:10px;letter-spacing:1px;color:var(--ink-ghost);min-height:18px;"></div>
            <button class="bsub" id="p10-save-btn">Re-encrypt &amp; Save</button>

          </div>
        </div>

        <!-- RIGHT: content -->
        <div class="p10-ep-right">
          <div class="p10-ep-right-hdr">
            <span>dream log</span>
            <span style="font-size:9px;color:var(--ink-ghost);letter-spacing:1px">edit mode · utf-8</span>
          </div>
          <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative;">
            <textarea id="p10-eco" placeholder="edit your dream log..."></textarea>
          </div>
        </div>

      </div>`;

    document.body.appendChild(panel);

    $id('p10-ep-close').addEventListener('click', closeEditPanel);
    $id('p10-save-btn').addEventListener('click', saveEditedEntry);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && panel.classList.contains('show')) {
        closeEditPanel();
      }
    });
  }

  function openEditPanel(entry) {
    buildEditPanel();
    if (!isUnlocked()) {
      window.notify?.('Unlock journal before editing.', 'err');
      $id('pw-input')?.focus();
      return;
    }

    const cached = window.S.cache.get(entry.id);
    if (!cached) {
      window.notify?.('Entry not in cache — re-unlock to decrypt.', 'err');
      return;
    }

    currentEditId = entry.id;

    // Pre-fill title
    $id('p10-ei').value = cached.title;

    // Pre-fill date / time
    $id('p10-edt').value = entry.date || '';
    $id('p10-etm').value = entry.time || '';

    // Pre-fill flair
    const flairVal = entry.flair || 'vivid';
    const radio = document.querySelector(`input.fr[name="p10fl"][value="${flairVal}"]`);
    if (radio) radio.checked = true;

    // Pre-fill content — strip any <cs>…</cs> tags patch2/3 may embed
    const rawContent = cached.content.replace(/<cs>[\s\S]*?<\/cs>/gi, '');
    $id('p10-eco').value = rawContent;

    // Update titlebar hint
    $id('p10-ep-title').textContent = `dream journal — Editing: ${cached.title}`;

    // Clear status
    setEditStatus('', '');

    // Show panel
    $id('p10-edit-panel').classList.add('show');
    setTimeout(() => $id('p10-ei')?.focus(), 80);
  }

  function closeEditPanel() {
    $id('p10-edit-panel')?.classList.remove('show');
    currentEditId = null;
  }

  function setEditStatus(msg, type) {
    const el = $id('p10-ep-status-area');
    if (!el) return;
    el.textContent = msg;
    el.style.color = type === 'ok'  ? 'var(--mark-ok)'
                   : type === 'err' ? 'var(--mark-err)'
                   : type === 'inf' ? 'var(--mark-warn)'
                   : 'var(--ink-ghost)';
  }

  async function saveEditedEntry() {
    if (!isUnlocked() || !window.S?.pw) {
      window.notify?.('Journal is locked — cannot save.', 'err');
      return;
    }
    if (!currentEditId) return;

    const title   = $id('p10-ei').value.trim();
    const date    = $id('p10-edt').value;
    const time    = $id('p10-etm').value || '';
    const flair   = document.querySelector('input.fr[name="p10fl"]:checked')?.value || 'vivid';
    const content = $id('p10-eco').value.trim();

    if (!title)   { window.notify?.('Title required.', 'err');   setEditStatus('Title required.', 'err');   return; }
    if (!date)    { window.notify?.('Date required.', 'err');    setEditStatus('Date required.',  'err');   return; }
    if (!content) { window.notify?.('Content required.', 'err'); setEditStatus('Content required.', 'err'); return; }

    const btn = $id('p10-save-btn');
    btn.textContent = 'Encrypting...';
    btn.disabled = true;
    setEditStatus('encrypting…', 'inf');

    try {
      /* Re-encrypt with the currently active passphrase */
      const enc_title   = await window.encStr(title,   window.S.pw);
      const enc_content = await window.encStr(content, window.S.pw);

      /* Find and mutate the entry in S.entries */
      const idx = window.S.entries.findIndex(e => e.id === currentEditId);
      if (idx === -1) throw new Error('Entry not found in S.entries');

      const updated = {
        ...window.S.entries[idx],
        date,
        time,
        flair,
        enc_title,
        enc_content,
        edited_at: new Date().toISOString(),
      };

      window.S.entries[idx] = updated;

      /* Update the in-memory cache with plain text */
      window.S.cache.set(currentEditId, { title, content });

      /* Persist to Supabase */
      await window.saveEntry(updated);

      /* Re-sort entries by date (mirrors main app) */
      window.S.entries.sort((a, b) => new Date(b.date) - new Date(a.date));

      /* Refresh sidebar list */
      if (typeof window.renderList === 'function') window.renderList();

      /* If this entry is currently selected in the main view, refresh it */
      if (window.S.selId === currentEditId) {
        if (typeof window.renderDecrypted === 'function') {
          window.renderDecrypted(updated, false);
        }
        /* Update content-path */
        const cp = $id('content-path');
        if (cp) {
          const dt = typeof fmtDateTime === 'function'
            ? fmtDateTime(date, time)
            : fmtShortDate(date);
          cp.textContent = `${dt} / ${title}`;
        }
      }

      setEditStatus('Saved successfully.', 'ok');
      window.notify?.('Entry updated & re-encrypted.', 'ok');

      /* Update panel titlebar */
      $id('p10-ep-title').textContent = `dream journal — Editing: ${title}`;

      /* Short delay, then close */
      setTimeout(closeEditPanel, 900);

    } catch (err) {
      console.error('[patch10] save error:', err);
      setEditStatus('Save failed: ' + err.message, 'err');
      window.notify?.('Save failed — see console.', 'err');
    } finally {
      btn.textContent = 'Re-encrypt & Save';
      btn.disabled = false;
    }
  }

  /* ══════════════════════════════════════════════════════════
     MENU WIRING  — replace File / Edit items with triggers
  ══════════════════════════════════════════════════════════ */
  function wireMenuBar() {
    const menubar = $id('menubar');
    if (!menubar) return;

    const items = menubar.querySelectorAll('.menu-item');
    let fileItem = null, editItem = null;

    items.forEach(item => {
      const txt = item.textContent.trim().toLowerCase().replace(/\s+/g, '');
      if (!fileItem && txt.startsWith('f') && txt.includes('ile')) fileItem = item;
      if (!editItem && txt.startsWith('e') && txt.includes('dit') && !txt.includes('new') && !txt.includes('export')) editItem = item;
    });

    // Fallback: first two items are File, Edit
    if (!fileItem) fileItem = items[0];
    if (!editItem) editItem = items[1];

    const fileDd = buildFileDropdown();
    const editDd = buildEditDropdown();

    if (fileItem && !fileItem.__p10wired) {
      fileItem.__p10wired = true;
      // Rebuild label to match style
      fileItem.innerHTML = '<span class="ul">F</span>ile ▾';
      fileItem.addEventListener('click', e => {
        e.stopPropagation();
        toggleDropdown(fileItem, fileDd);
      });
    }

    if (editItem && !editItem.__p10wired) {
      editItem.__p10wired = true;
      editItem.innerHTML = '<span class="ul">E</span>dit ▾';
      editItem.addEventListener('click', e => {
        e.stopPropagation();
        // Populate entries fresh each time
        populateEditDropdown();
        toggleDropdown(editItem, editDd);
      });
    }
  }

  /* ══════════════════════════════════════════════════════════
     LOCK-DOT OBSERVER
     • Close edit panel when journal locks
     • Refresh edit dropdown lock label on state change
  ══════════════════════════════════════════════════════════ */
  function hookLockDot() {
    const dot = $id('lock-dot');
    if (!dot || dot.__p10hooked) return;
    dot.__p10hooked = true;

    new MutationObserver(() => {
      if (!dot.classList.contains('on')) {
        // Locked — close edit panel if open
        if ($id('p10-edit-panel')?.classList.contains('show')) {
          closeEditPanel();
        }
      }
    }).observe(dot, { attributes: true, attributeFilter: ['class'] });
  }

  /* ══════════════════════════════════════════════════════════
     EXPOSE openModal / exportJSON / lock if not already global
     (These are defined inside the main IIFE but window-exposed
      at the bottom of index.html — we guard so we don't shadow.)
  ══════════════════════════════════════════════════════════ */
  function exposeGlobals() {
    // The main script already does window.S, window.encStr, etc.
    // We just need lock() and openModal() for the File dropdown.
    // If they aren't exposed, provide thin wrappers.
    if (typeof window.lock !== 'function') {
      window.lock = function () {
        const pwi = $id('pw-input');
        if (pwi) pwi.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
      };
    }
    if (typeof window.openModal !== 'function') {
      window.openModal = function () { $id('menu-new')?.click(); };
    }
    if (typeof window.exportJSON !== 'function') {
      window.exportJSON = function () { $id('menu-export')?.click(); };
    }
  }

  /* ══════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', () => {
    exposeGlobals();
    hookLockDot();

    // Wire immediately, then retry in case menubar items are still being
    // mutated by patch4's encryption pass
    wireMenuBar();
    [200, 500, 1000, 2000].forEach(ms => setTimeout(() => {
      wireMenuBar();
      hookLockDot();
      exposeGlobals();
    }, ms));
  });

  console.log('[patch10] v10 ✓  — File & Edit dropdown menus + entry editor active');
})();
