/* ═══════════════════════════════════════════════════════════════
   patch8.js  —  Dream Journal stats improvements (v8)
   • "Recurring Names" card: strips contractions (I'd, I've, I'll,
     wasn't, etc.) and common false-positives so only real names show
   • Replaces/augments common-word noise with a "Recurring Verbs"
     card showing only meaningful verbs that appear across 2+ entries
   • Both fixes are applied by wrapping patch2's openStats()
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     WORD LISTS
  ══════════════════════════════════════════════════════════ */

  /* Words that look like proper names but aren't dream-relevant names.
     All lowercase — matched against the lowercased extracted key. */
  const NAME_BLOCKLIST = new Set([
    // English contractions / clitics that can appear mid-sentence capitalised
    "i'd","i've","i'll","i'm","i'd","i've","i'll","i'm",
    "he'd","he's","he'll","she'd","she's","she'll",
    "we'd","we've","we'll","we're",
    "they'd","they've","they'll","they're",
    "you'd","you've","you'll","you're",
    "it's","that's","there's","here's","what's","who's",
    "wasn't","isn't","aren't","weren't","doesn't","don't","didn't",
    "couldn't","wouldn't","shouldn't","hadn't","hasn't","haven't",
    "can't","won't","shan't",
    // Common title-case sentence starters / filler that sneak through
    "the","a","an","and","but","or","so","yet","nor","for",
    "in","on","at","to","of","by","as","if","up","down","out",
    "then","than","when","where","while","after","before","since",
    "just","also","still","even","only","once","again","always",
    "never","maybe","perhaps","somehow","something","someone",
    "everyone","everything","nothing","nobody","somebody","anybody",
    "monday","tuesday","wednesday","thursday","friday","saturday","sunday",
    "january","february","march","april","may","june",
    "july","august","september","october","november","december",
    // Pronoun remnants
    "him","her","his","hers","its","our","their","my","your",
    "me","us","them","we","they","you","he","she","it",
  ]);

  /* Verbs worth surfacing — lemma list covering common dream-narrative verbs.
     We match conjugated forms via the VERB_PATTERNS map below. */
  const TRACKED_VERBS = [
    'run','running','ran',
    'fly','flying','flew','flown',
    'fall','falling','fell','fallen',
    'chase','chasing','chased',
    'hide','hiding','hid','hidden',
    'fight','fighting','fought',
    'escape','escaping','escaped',
    'walk','walking','walked',
    'talk','talking','talked',
    'scream','screaming','screamed',
    'dream','dreaming','dreamed','dreamt',
    'see','seeing','saw','seen',
    'hear','hearing','heard',
    'feel','feeling','felt',
    'find','finding','found',
    'lose','losing','lost',
    'know','knowing','knew','known',
    'remember','remembering','remembered',
    'forget','forgetting','forgot','forgotten',
    'appear','appearing','appeared',
    'disappear','disappearing','disappeared',
    'transform','transforming','transformed',
    'follow','following','followed',
    'call','calling','called',
    'meet','meeting','met',
    'leave','leaving','left',
    'arrive','arriving','arrived',
    'enter','entering','entered',
    'open','opening','opened',
    'close','closing','closed',
    'wake','waking','woke','woken',
    'sleep','sleeping','slept',
    'die','dying','died',
    'kill','killing','killed',
    'attack','attacking','attacked',
    'swim','swimming','swam','swum',
    'climb','climbing','climbed',
    'jump','jumping','jumped',
    'fall','falling','fell',
    'pull','pulling','pulled',
    'push','pushing','pushed',
    'drive','driving','drove','driven',
    'ride','riding','rode','ridden',
    'throw','throwing','threw','thrown',
    'catch','catching','caught',
    'hold','holding','held',
    'carry','carrying','carried',
    'break','breaking','broke','broken',
    'build','building','built',
    'destroy','destroying','destroyed',
    'create','creating','created',
    'wait','waiting','waited',
    'watch','watching','watched',
    'look','looking','looked',
    'search','searching','searched',
    'return','returning','returned',
    'try','trying','tried',
    'want','wanting','wanted',
    'need','needing','needed',
    'help','helping','helped',
    'show','showing','showed','shown',
    'tell','telling','told',
    'ask','asking','asked',
    'answer','answering','answered',
    'cry','crying','cried',
    'laugh','laughing','laughed',
    'smile','smiling','smiled',
    'touch','touching','touched',
    'grab','grabbing','grabbed',
    'turn','turning','turned',
    'move','moving','moved',
    'stand','standing','stood',
    'sit','sitting','sat',
    'lie','lying','lay','lain',
    'rise','rising','rose','risen',
    'fall','falling','fell','fallen',
    'start','starting','started',
    'stop','stopping','stopped',
    'begin','beginning','began','begun',
    'end','ending','ended',
    'become','becoming','became','become',
    'happen','happening','happened',
    'change','changing','changed',
  ];

  /* Map each conjugated/inflected form → canonical lemma */
  const VERB_LEMMA = {};
  // Pairs: [form, lemma] — built from TRACKED_VERBS groups above
  const VERB_GROUPS = [
    ['run','running','ran'],
    ['fly','flying','flew','flown'],
    ['fall','falling','fell','fallen'],
    ['chase','chasing','chased'],
    ['hide','hiding','hid','hidden'],
    ['fight','fighting','fought'],
    ['escape','escaping','escaped'],
    ['walk','walking','walked'],
    ['talk','talking','talked'],
    ['scream','screaming','screamed'],
    ['dream','dreaming','dreamed','dreamt'],
    ['see','seeing','saw','seen'],
    ['hear','hearing','heard'],
    ['feel','feeling','felt'],
    ['find','finding','found'],
    ['lose','losing','lost'],
    ['know','knowing','knew','known'],
    ['remember','remembering','remembered'],
    ['forget','forgetting','forgot','forgotten'],
    ['appear','appearing','appeared'],
    ['disappear','disappearing','disappeared'],
    ['transform','transforming','transformed'],
    ['follow','following','followed'],
    ['call','calling','called'],
    ['meet','meeting','met'],
    ['leave','leaving','left'],
    ['arrive','arriving','arrived'],
    ['enter','entering','entered'],
    ['open','opening','opened'],
    ['close','closing','closed'],
    ['wake','waking','woke','woken'],
    ['sleep','sleeping','slept'],
    ['die','dying','died'],
    ['kill','killing','killed'],
    ['attack','attacking','attacked'],
    ['swim','swimming','swam','swum'],
    ['climb','climbing','climbed'],
    ['jump','jumping','jumped'],
    ['pull','pulling','pulled'],
    ['push','pushing','pushed'],
    ['drive','driving','drove','driven'],
    ['ride','riding','rode','ridden'],
    ['throw','throwing','threw','thrown'],
    ['catch','catching','caught'],
    ['hold','holding','held'],
    ['carry','carrying','carried'],
    ['break','breaking','broke','broken'],
    ['build','building','built'],
    ['destroy','destroying','destroyed'],
    ['create','creating','created'],
    ['wait','waiting','waited'],
    ['watch','watching','watched'],
    ['look','looking','looked'],
    ['search','searching','searched'],
    ['return','returning','returned'],
    ['try','trying','tried'],
    ['want','wanting','wanted'],
    ['need','needing','needed'],
    ['help','helping','helped'],
    ['show','showing','showed','shown'],
    ['tell','telling','told'],
    ['ask','asking','asked'],
    ['answer','answering','answered'],
    ['cry','crying','cried'],
    ['laugh','laughing','laughed'],
    ['smile','smiling','smiled'],
    ['touch','touching','touched'],
    ['grab','grabbing','grabbed'],
    ['turn','turning','turned'],
    ['move','moving','moved'],
    ['stand','standing','stood'],
    ['sit','sitting','sat'],
    ['lie','lying','lay','lain'],
    ['rise','rising','rose','risen'],
    ['start','starting','started'],
    ['stop','stopping','stopped'],
    ['begin','beginning','began','begun'],
    ['end','ending','ended'],
    ['become','becoming','became'],
    ['happen','happening','happened'],
    ['change','changing','changed'],
  ];

  VERB_GROUPS.forEach(group => {
    const lemma = group[0];
    group.forEach(form => { VERB_LEMMA[form] = lemma; });
    // Also handle simple -s suffix (runs, flies→fly handled via lemma already)
    if (!VERB_LEMMA[lemma + 's']) VERB_LEMMA[lemma + 's'] = lemma;
    if (!VERB_LEMMA[lemma + 'es']) VERB_LEMMA[lemma + 'es'] = lemma;
  });

  /* ══════════════════════════════════════════════════════════
     ANALYSIS FUNCTIONS
  ══════════════════════════════════════════════════════════ */

  /**
   * Extract proper names from all entry text, filtering contractions/noise.
   * Returns { name → total_count } only for names found in 2+ entries.
   */
  function extractCleanNames(cachedEntries) {
    // Per-entry name counts so we can require multi-entry presence
    const perEntry = cachedEntries.map(c => {
      const freq = {};
      const sentences = c.content.split(/(?<=[.!?])\s+/);
      for (const sent of sentences) {
        const tokens = sent.trim().split(/\s+/);
        for (let i = 1; i < tokens.length; i++) {
          // Strip punctuation but allow hyphens
          const raw = tokens[i].replace(/[^a-zA-Z'-]/g, '');
          if (raw.length < 2) continue;
          // Must start uppercase
          if (!/^[A-Z]/.test(raw)) continue;
          const key = raw.toLowerCase();
          // Filter blocklist
          if (NAME_BLOCKLIST.has(key)) continue;
          // Filter contractions: anything containing apostrophe
          if (key.includes("'") || key.includes('\u2019')) continue;
          // Filter words that are just 1-2 chars after stripping
          if (key.replace(/[^a-z]/g, '').length < 3) continue;
          freq[key] = (freq[key] || 0) + 1;
        }
      }
      return freq;
    });

    // Merge: only keep names appearing in 2+ entries
    const totalFreq = {};
    const entryPresence = {};
    perEntry.forEach(freq => {
      Object.entries(freq).forEach(([name, count]) => {
        totalFreq[name] = (totalFreq[name] || 0) + count;
        entryPresence[name] = (entryPresence[name] || 0) + 1;
      });
    });

    const result = {};
    Object.entries(totalFreq).forEach(([name, count]) => {
      if (entryPresence[name] >= 2) result[name] = count;
    });
    return result;
  }

  /**
   * Extract verbs from all entries.
   * Returns { lemma → { total, entryCount } } only for lemmas in 2+ entries.
   */
  function extractVerbs(cachedEntries) {
    const perEntry = cachedEntries.map(c => {
      const counts = {};
      // Tokenise — strip punctuation, lowercase
      const words = c.content
        .replace(/<[^>]+>/g, ' ')       // strip any html tags
        .replace(/[^a-zA-Z\s]/g, ' ')  // strip punctuation
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);

      words.forEach(w => {
        const lemma = VERB_LEMMA[w];
        if (lemma) counts[lemma] = (counts[lemma] || 0) + 1;
      });
      return counts;
    });

    const total = {};
    const presence = {};
    perEntry.forEach(counts => {
      Object.entries(counts).forEach(([lemma, n]) => {
        total[lemma] = (total[lemma] || 0) + n;
        presence[lemma] = (presence[lemma] || 0) + 1;
      });
    });

    const result = {};
    Object.entries(total).forEach(([lemma, n]) => {
      if (presence[lemma] >= 2) result[lemma] = { total: n, entryCount: presence[lemma] };
    });
    return result;
  }

  /* ══════════════════════════════════════════════════════════
     PATCH openStats — wrap after patch2 defines it
  ══════════════════════════════════════════════════════════ */
  function applyPatch() {
    const orig = window.openStats;
    if (typeof orig !== 'function' || orig.__p8wrapped) return false;

    window.openStats = function p8_openStats(...args) {
      // Call the original to render the panel as usual
      orig.apply(this, args);

      // Give the DOM a tick to render, then replace the names card + inject verbs
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const S = window.S;
        if (!S?.unlocked) return;
        const cached = [...S.cache.values()];
        if (!cached.length) return;

        p8PatchNamesCard(cached);
        p8InjectVerbsCard(cached);
      }));
    };

    window.openStats.__p8wrapped = true;
    return true;
  }

  /* ── Replace content of the "Recurring Names" card ── */
  function p8PatchNamesCard(cached) {
    // Find the names card by its title text
    const allCards = document.querySelectorAll('.sp-card');
    let namesCard = null;
    for (const card of allCards) {
      const title = card.querySelector('.sp-card-title');
      if (title && title.textContent.toLowerCase().includes('name')) {
        namesCard = card; break;
      }
    }
    if (!namesCard) return;

    const nameFreq = extractCleanNames(cached);
    const topNames = Object.entries(nameFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Clear existing rows (keep the title)
    const title = namesCard.querySelector('.sp-card-title');
    namesCard.innerHTML = '';
    namesCard.appendChild(title);

    if (!topNames.length) {
      const empty = document.createElement('span');
      empty.style.cssText = 'color:var(--ink-ghost);font-size:11px';
      empty.textContent = 'No recurring names across multiple entries';
      namesCard.appendChild(empty);
      return;
    }

    topNames.forEach(([name, count]) => {
      const cls = count >= 6 ? 'nh-high' : count >= 3 ? 'nh-mid' : 'nh-low';
      const row = document.createElement('div');
      row.className = 'sp-name-row';
      row.innerHTML = `<span class="sp-name-word ${cls}">${name[0].toUpperCase() + name.slice(1)}</span>`
        + `<span class="sp-name-count">${count}×</span>`;
      namesCard.appendChild(row);
    });
  }

  /* ── Inject the "Recurring Verbs" card after the names card ── */
  function p8InjectVerbsCard(cached) {
    // Remove any previously injected card to avoid duplication on re-open
    const existing = document.getElementById('p8-verbs-card');
    if (existing) existing.remove();

    const verbData = extractVerbs(cached);
    const topVerbs = Object.entries(verbData)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);

    const body = document.getElementById('sp-body');
    if (!body) return;

    const card = document.createElement('div');
    card.className = 'sp-card';
    card.id = 'p8-verbs-card';

    const titleDiv = document.createElement('div');
    titleDiv.className = 'sp-card-title';
    titleDiv.textContent = 'Recurring Verbs';
    card.appendChild(titleDiv);

    if (!topVerbs.length) {
      const empty = document.createElement('span');
      empty.style.cssText = 'color:var(--ink-ghost);font-size:11px';
      empty.textContent = 'No recurring verbs across multiple entries';
      card.appendChild(empty);
    } else {
      const maxCount = topVerbs[0][1].total;
      topVerbs.forEach(([lemma, { total, entryCount }]) => {
        const row = document.createElement('div');
        row.className = 'sp-bar-row';
        row.innerHTML = `
          <span class="sp-bar-lbl" style="width:80px">${lemma}</span>
          <div class="sp-bar-track">
            <div class="sp-bar-fill" style="width:${Math.round(total / maxCount * 100)}%"></div>
          </div>
          <span class="sp-bar-n" style="width:auto;min-width:28px">${total}</span>
          <span style="font-size:9px;color:var(--ink-ghost);margin-left:4px">${entryCount}e</span>`;
        card.appendChild(row);
      });

      // Legend
      const legend = document.createElement('div');
      legend.style.cssText = 'margin-top:10px;font-size:9px;color:var(--ink-ghost);letter-spacing:1px';
      legend.textContent = '// count × entries (e) containing verb';
      card.appendChild(legend);
    }

    // Insert after the names card if possible, otherwise just append
    const allCards = body.querySelectorAll('.sp-card');
    let namesCard = null;
    for (const c of allCards) {
      const t = c.querySelector('.sp-card-title');
      if (t && t.textContent.toLowerCase().includes('name')) { namesCard = c; break; }
    }

    if (namesCard && namesCard.nextSibling) {
      body.insertBefore(card, namesCard.nextSibling);
    } else {
      body.appendChild(card);
    }
  }

  /* ══════════════════════════════════════════════════════════
     INIT — retry until patch2 has loaded openStats
  ══════════════════════════════════════════════════════════ */
  let attempts = 0;
  const initTimer = setInterval(() => {
    if (applyPatch() || ++attempts > 40) clearInterval(initTimer);
  }, 200);

  console.log('[patch8] v8 ✓  — clean names + recurring verbs stats active');
})();
