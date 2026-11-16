// build-guide.html: schede del calcolatore e modalita "Semplice" (dalla schermata del personaggio).
// Dati di personaggi, armi e set in assets/data/build-calc.json (genshin-db, testi italiani, livello 90).
(function () {
  // ---- Schede Semplice / Avanzato ----
  const tabs = Array.from(document.querySelectorAll('.bg-tabs [role="tab"]'));
  function selectTab(tab) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      selectTab(next);
    });
  });

  const form = document.getElementById('quick-calc');
  const out = document.getElementById('quick-out');
  if (!form || !out) return;

  const fmt = (n, d = 1) => n.toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d });
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  // Accetta "1.618", "1618", "56,1" e "56.1"
  const num = (v) => {
    let s = String(v || '').trim().replace(/\s|%/g, '');
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '');
    return Math.max(0, parseFloat(s.replace(',', '.')) || 0);
  };

  // Icone delle statistiche (SVG in linea, colore del testo)
  const SVG = (p) => `<svg viewBox="0 0 24 24" aria-hidden="true" class="bg-ico">${p}</svg>`;
  const ICON = {
    cr: SVG('<path d="M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z" fill="currentColor"/>'),
    cd: SVG('<path d="M12 4l1.8 5.2L19 11l-5.2 1.8L12 18l-1.8-5.2L5 11l5.2-1.8z" fill="currentColor"/><circle cx="12" cy="11" r="9.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 3"/>'),
    atk: SVG('<path d="M19 3l2 2-9.5 9.5-2-2zM8.5 13.5l2 2-2.8 2.8 1.4 1.4-1.4 1.4-1.4-1.4L3.5 21.5 2.5 20.5l2.8-2.8-1.4-1.4 1.4-1.4 1.4 1.4z" fill="currentColor"/>'),
    hp: SVG('<path d="M12 2.5S5 10.2 5 14.5a7 7 0 0014 0C19 10.2 12 2.5 12 2.5z" fill="currentColor"/>'),
    def: SVG('<path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5z" fill="currentColor"/>'),
    em: SVG('<circle cx="8" cy="9" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="9" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="16" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/>'),
    er: SVG('<path d="M12 4a8 8 0 107.4 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M20 3v6h-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'),
    heal: SVG('<path d="M9.5 3h5v6.5H21v5h-6.5V21h-5v-6.5H3v-5h6.5z" fill="currentColor"/>'),
    char: SVG('<circle cx="12" cy="8" r="4.5" fill="currentColor"/><path d="M3.5 21c.8-4.6 4.2-7 8.5-7s7.7 2.4 8.5 7z" fill="currentColor"/>'),
    weapon: SVG('<path d="M20.5 2.5l1 1-11 11-1-1zM6.5 12.5l5 5-1.5 1.5-1.8-1.8L4.5 21 3 19.5l3.8-3.7-1.8-1.8z" fill="currentColor"/>'),
    set: SVG('<path d="M12 2c2.5 3 2.5 5.5 0 8-2.5-2.5-2.5-5 0-8zM4 9c3.8-.3 6 1 7 4-3.8.6-6-.8-7-4zm16 0c-1 3.2-3.2 4.6-7 4 1-3 3.2-4.3 7-4zM11 14h2v8h-2z" fill="currentColor"/>'),
    style: SVG('<path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="currentColor"/>'),
    moon: SVG('<path d="M15.5 3.5A9 9 0 1020.5 15 7 7 0 0115.5 3.5z" fill="currentColor"/>'),
    star: SVG('<path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z" fill="currentColor"/>'),
    sword: SVG('<path d="M19 3h2v2L9 17l-2-2zM5.5 14.5l4 4-1.4 1.4-1.3-1.3L4 21.4 2.6 20l2.8-2.8-1.3-1.3z" fill="currentColor"/>'),
    pcs: SVG('<rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor"/><rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor"/><rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor"/><rect x="13" y="13" width="8" height="8" rx="2" fill="currentColor" opacity=".45"/>'),
    screen: SVG('<rect x="2.5" y="4" width="19" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 21h8M12 17v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
    plus: SVG('<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'),
    chevron: SVG('<path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
    circlet: '<img src="assets/img/guides/build/slot-circlet.webp" alt="" width="96" height="96" class="bg-ico-img" />',
  };
  const elImg = (el) => (el ? `<img src="assets/img/elements/${el}.webp" alt="" width="64" height="64" class="bg-ico-img" />` : '');

  const STAT_NAME = {
    cr: 'Tasso di CRIT', cd: 'DAN da CRIT', atkp: 'ATT', hpp: 'PS', defp: 'DIF', em: 'Maestria elementale', er: 'Ricarica di energia',
    heal: 'Bonus di guarigione', phys: 'Bonus DAN fisici', pyro: 'Bonus DAN da Pyro', hydro: 'Bonus DAN da Hydro', dendro: 'Bonus DAN da Dendro',
    electro: 'Bonus DAN da Electro', anemo: 'Bonus DAN da Anemo', cryo: 'Bonus DAN da Cryo', geo: 'Bonus DAN da Geo',
  };
  const STAT_ICON = { cr: 'cr', cd: 'cd', atkp: 'atk', hpp: 'hp', defp: 'def', em: 'em', er: 'er', heal: 'heal' };
  const statText = (s) => (s ? `${STAT_NAME[s[0]] || s[0]} ${s[0] === 'em' ? fmt(s[1], 0) : `${fmt(s[1])}%`}` : 'nessuna');

  const STYLES = [
    { k: 'diretto', n: 'Danno diretto', icon: ICON.sword, em: false },
    { k: 'stellar', n: 'Stellare', sub: 'Astroconduzione', icon: ICON.star, em: true },
    { k: 'lunar', n: 'Lunare', sub: 'reazioni lunari', icon: ICON.moon, em: true },
    { k: 'amp', n: 'Vaporizzazione / Fusione', icon: elImg('Pyro') + elImg('Hydro'), em: true },
    { k: 'freeze', n: 'Congelamento', icon: elImg('Cryo') + elImg('Hydro'), em: false },
  ];
  const SCALES = { atk: ['ATT', 'atk'], hp: ['PS', 'hp'], def: ['DIF', 'def'], em: ['Maestria', 'em'] };
  const BUILD_TIERS = [[210, 'end game', 't5'], [180, 'ottima', 't4'], [150, 'buona', 't3'], [120, 'discreta', 't2'], [0, 'da migliorare', 't1']];

  // ---- Selettore con icone e ricerca ----
  const openPickers = new Set();
  document.addEventListener('click', (e) => {
    openPickers.forEach((p) => { if (!p.root.contains(e.target)) p.close(); });
  });
  function Picker(root, { placeholder, render, onPick, rarity }) {
    root.innerHTML = `
      <button type="button" class="bg-pick-btn" aria-haspopup="listbox" aria-expanded="false"></button>
      <div class="bg-pick-pop" hidden>
        <input type="search" placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}" />
        ${rarity ? '<div class="bg-pick-rar" role="radiogroup" aria-label="Filtra per rarit&agrave;"></div>' : ''}
        <ul role="listbox"></ul>
      </div>`;
    const btn = root.querySelector('.bg-pick-btn');
    const pop = root.querySelector('.bg-pick-pop');
    const search = pop.querySelector('input');
    const list = pop.querySelector('ul');
    const rarBox = pop.querySelector('.bg-pick-rar');
    const api = { root, items: [], value: null, rar: 0 };
    function drawRarity() {
      if (!rarBox) return;
      const levels = [...new Set(api.items.map((it) => it.r).filter(Boolean))].sort((a, b) => b - a);
      if (api.rar && !levels.includes(api.rar)) api.rar = 0;
      rarBox.innerHTML = [0].concat(levels).map((r) => `<button type="button" role="radio" data-r="${r}" aria-checked="${api.rar === r}">${r ? `${r}&#9733;` : 'Tutte'}</button>`).join('');
    }
    function draw() {
      const q = search.value.trim().toLowerCase();
      const items = api.items.filter((it) => (!q || it.n.toLowerCase().includes(q)) && (!api.rar || !it.r || it.r === api.rar));
      let last = null;
      list.innerHTML = items.slice(0, 160).map((it) => {
        const r = render(it);
        const head = rarity && it.r && it.r !== last ? `<li class="bg-pick-group" role="presentation">${'&#9733;'.repeat(it.r)}</li>` : '';
        if (it.r) last = it.r;
        return `${head}<li><button type="button" role="option" data-i="${api.items.indexOf(it)}" aria-selected="${it === api.value}">${r.icon}<span>${esc(r.name)}${r.meta ? `<small>${r.meta}</small>` : ''}</span></button></li>`;
      }).join('') || '<li class="bg-pick-empty">Nessun risultato</li>';
    }
    function paint() {
      const r = api.value ? render(api.value) : { icon: '', name: '—', meta: '' };
      btn.innerHTML = `${r.icon}<span>${esc(r.name)}${r.meta ? `<small>${r.meta}</small>` : ''}</span>${ICON.chevron}`;
    }
    api.open = () => {
      if (btn.disabled) return;
      openPickers.forEach((p) => p !== api && p.close());
      pop.hidden = false; btn.setAttribute('aria-expanded', 'true'); openPickers.add(api);
      search.value = ''; drawRarity(); draw(); search.focus();
    };
    api.close = () => { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); openPickers.delete(api); };
    api.set = (it, silent) => { api.value = it; paint(); if (!silent) onPick(it); };
    api.setItems = (items) => { api.items = items; if (!items.includes(api.value)) api.value = items[0] || null; paint(); };
    api.disable = (off) => { btn.disabled = off; root.classList.toggle('is-off', off); if (off) api.close(); };
    btn.addEventListener('click', () => (pop.hidden ? api.open() : api.close()));
    if (rarBox) rarBox.addEventListener('click', (e) => {
      e.stopPropagation(); // i pulsanti vengono ridisegnati: il clic non deve chiudere il menu
      const b = e.target.closest('button[data-r]');
      if (!b) return;
      api.rar = +b.dataset.r; drawRarity(); draw(); search.focus();
    });
    search.addEventListener('input', draw);
    search.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); const f = list.querySelector('button'); if (f) f.focus(); }
      if (e.key === 'Escape') { api.close(); btn.focus(); }
      if (e.key === 'Enter') { e.preventDefault(); const f = list.querySelector('button'); if (f) f.click(); }
    });
    list.addEventListener('keydown', (e) => {
      const opts = Array.from(list.querySelectorAll('button'));
      const i = opts.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' && i < opts.length - 1) { e.preventDefault(); opts[i + 1].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); (i > 0 ? opts[i - 1] : search).focus(); }
      if (e.key === 'Escape') { api.close(); btn.focus(); }
    });
    list.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-i]');
      if (!b) return;
      api.set(api.items[+b.dataset.i]);
      api.close(); btn.focus();
    });
    return api;
  }

  Promise.all([
    fetch('assets/data/build-calc.json').then((r) => r.json()),
    fetch('assets/data/character-builds.json').then((r) => (r.ok ? r.json() : { personaggi: [] })).catch(() => ({ personaggi: [] })),
  ])
    .then(([data, builds]) => init(data, builds))
    .catch(() => { form.innerHTML = '<p class="bg-warn">Non riesco a caricare i dati del calcolatore. Ricarica la pagina.</p>'; });

  // Codici delle statistiche usati nelle schede dei personaggi
  const CODE = {
    atkp: ['ATT%', 'atk'], hpp: ['PS%', 'hp'], defp: ['DIF%', 'def'], em: ['Maestria', 'em'], er: ['Ricarica', 'er'],
    cr: ['Tasso di CRIT', 'cr'], cd: ['DAN da CRIT', 'cd'], heal: ['Bonus di guarigione', 'heal'], dmg: ['Bonus DAN elementale', null], phys: ['Bonus DAN fisici', null],
  };
  const ROLE = { dps: 'DPS', subdps: 'Sub-DPS', support: 'Supporto', healer: 'Guaritore', shield: 'Scudo' };

  function init(DATA, BUILDS) {
    const GUIDE = {};
    (BUILDS.personaggi || []).forEach((b) => { GUIDE[b.id] = b; });
    const NONE_SET = { n: 'Nessun set', i: null };
    const SETS = [NONE_SET].concat(DATA.sets);
    const byName = (list, n) => list.find((x) => x.n === n);
    const state = {
      char: byName(DATA.chars, 'Mavuika') || DATA.chars[0],
      weapon: null, set1: byName(SETS, 'Codice d’ossidiana') || byName(SETS, "Codice d'ossidiana") || SETS[1], pcs: 4, set2: NONE_SET,
      style: 'amp', corona: 'cd', sands: 'em', goblet: 'dmg', scale: null, reso: true,
    };

    form.innerHTML = `
      <div class="bg-q-row bg-q-2">
        <div class="bg-field"><span class="bg-label">${ICON.char}Personaggio</span><div class="bg-pick" id="pick-char"></div></div>
        <div class="bg-field"><span class="bg-label">${ICON.weapon}Arma</span><div class="bg-pick" id="pick-weapon"></div></div>
      </div>
      <div class="bg-q-row bg-q-3" id="q-mains"></div>
      <div class="bg-q-row bg-q-set">
        <div class="bg-field"><span class="bg-label">${ICON.set}Set</span><div class="bg-pick" id="pick-set1"></div></div>
        <div class="bg-field bg-field-pcs"><span class="bg-label">${ICON.pcs}Pezzi</span>
          <div class="bg-seg bg-seg-lg" role="radiogroup" aria-label="Pezzi del primo set">
            <button type="button" role="radio" data-q-pcs="2">2pz</button>
            <button type="button" role="radio" data-q-pcs="4">4pz</button>
          </div>
        </div>
        <div class="bg-field"><span class="bg-label">${ICON.set}Secondo set <small class="bg-set2-note"></small></span><div class="bg-pick" id="pick-set2"></div></div>
      </div>
      <div class="bg-field">
        <span class="bg-label">${ICON.style}Stile di gioco</span>
        <div class="bg-styles" role="radiogroup" aria-label="Stile di gioco">
          ${STYLES.map((s) => `<button type="button" role="radio" data-q-style="${s.k}"><span class="bg-style-ico">${s.icon}</span><span>${s.n}${s.sub ? `<small>${s.sub}</small>` : ''}</span></button>`).join('')}
        </div>
        <label class="bg-check" id="q-reso"><input type="checkbox" checked /> ${elImg('Cryo')} Risonanza Cryo in squadra (+15% Tasso di CRIT contro nemici congelati o con Cryo)</label>
      </div>
      <div class="bg-field">
        <span class="bg-label">${ICON.screen}Statistiche dalla schermata <small class="bg-scale-pick"></small></span>
        <div class="bg-q-stats" id="q-stats"></div>
      </div>
      <details class="bg-q-more">
        <summary>${ICON.plus}Altri bonus fissi <small>passive dell&rsquo;arma, costellazioni, talenti</small></summary>
        <div class="bg-q-stats">
          <label class="bg-stat"><span>${ICON.cr}Tasso di CRIT extra</span><input type="text" name="xcr" inputmode="decimal" placeholder="0" /></label>
          <label class="bg-stat"><span>${ICON.cd}DAN da CRIT extra</span><input type="text" name="xcd" inputmode="decimal" placeholder="0" /></label>
          <label class="bg-stat"><span>${ICON.atk}Statistica di danno extra <small>% o Maestria</small></span><input type="text" name="xsc" inputmode="decimal" placeholder="0" /></label>
        </div>
      </details>`;

    const values = { cr: '56,1', cd: '253,9', atk: '1618', hp: '', def: '', em: '237', er: '100', xcr: '', xcd: '', xsc: '' };

    const pChar = Picker(form.querySelector('#pick-char'), {
      placeholder: 'Cerca un personaggio',
      render: (c) => ({ icon: `<img src="assets/img/characters/${c.i}.webp" alt="" width="256" height="256" class="bg-ava" />${elImg(c.el)}`, name: c.n, meta: `${STAT_ICON[c.asc[0]] ? ICON[STAT_ICON[c.asc[0]]] : ''}${statText(c.asc)}` }),
      onPick: (c) => { state.char = c; state.scale = null; syncWeapons(); drawStats(); drawMains(); update(); },
    });
    const pWeapon = Picker(form.querySelector('#pick-weapon'), {
      placeholder: 'Cerca un’arma', rarity: true,
      render: (w) => ({ icon: `<img src="assets/img/calc/weapons/${w.i}.webp" alt="" width="64" height="64" class="bg-ava bg-r${w.r}" />`, name: w.n, meta: `${'★'.repeat(w.r)} · ATT ${w.atk} · ${w.sub && STAT_ICON[w.sub[0]] ? ICON[STAT_ICON[w.sub[0]]] : ''}${statText(w.sub)}` }),
      onPick: (w) => { state.weapon = w; update(); },
    });
    const setRender = (s) => ({
      icon: s.i ? `<img src="assets/img/calc/sets/${s.i}.webp" alt="" width="64" height="64" class="bg-ava" />` : '<i class="bg-ava bg-ava-none"></i>',
      name: s.n,
      meta: (s.r ? `${'&#9733;'.repeat(s.r)} · ` : '') + (s.s2 ? `${ICON.cr}2pz +${s.s2}%${s.c4 ? ` · 4pz +${s.c4}%` : ''}` : s.c4 ? `${ICON.cr}4pz fino a +${s.freeze4 || s.c4}%` : ''),
    });
    const pSet1 = Picker(form.querySelector('#pick-set1'), {
      placeholder: 'Cerca un set', rarity: true, render: setRender,
      onPick: (s) => { state.set1 = s; if (state.set2 === s) state.set2 = NONE_SET; syncSets(); update(); },
    });
    const pSet2 = Picker(form.querySelector('#pick-set2'), {
      placeholder: 'Cerca un set', rarity: true, render: setRender,
      onPick: (s) => { state.set2 = s; update(); },
    });

    function syncWeapons() {
      const list = DATA.weapons.filter((w) => w.t === state.char.w);
      pWeapon.setItems(list);
      if (!list.includes(state.weapon)) state.weapon = list[0];
      pWeapon.set(state.weapon, true);
    }
    function syncSets() {
      pSet1.setItems(SETS); pSet1.set(state.set1, true);
      pSet2.setItems(SETS.filter((s) => s === NONE_SET || s !== state.set1));
      const locked = state.pcs === 4 || state.set1 === NONE_SET;
      if (locked) state.set2 = NONE_SET;
      pSet2.set(state.set2, true);
      pSet2.disable(locked);
      form.querySelector('.bg-set2-note').textContent = state.pcs === 4 ? 'bloccato dal 4pz' : '';
      form.querySelectorAll('[data-q-pcs]').forEach((b) => b.setAttribute('aria-checked', String(+b.dataset.qPcs === state.pcs)));
    }
    function scale() {
      const g = GUIDE[state.char.i];
      return state.scale || (g && SCALES[g.scala] ? g.scala : state.char.s);
    }
    const SCALE_PCT = { atk: 'ATT%', hp: 'PS%', def: 'DIF%', em: 'Maestria' };
    function drawMains() {
      const sc = scale();
      const pct = sc === 'em' ? null : ['scale', `${ICON[SCALES[sc][1]]}${SCALE_PCT[sc]}`];
      const groups = [
        ['sands', 'Sabbie', 'sands', [pct, ['em', `${ICON.em}Maestria`], ['er', `${ICON.er}Ricarica`], ['altro', 'Altro']]],
        ['goblet', 'Calice', 'goblet', [['dmg', 'Bonus DAN'], pct, ['em', `${ICON.em}Maestria`], ['altro', 'Altro']]],
        ['corona', 'Corona', 'circlet', [['cr', `${ICON.cr}Tasso`], ['cd', `${ICON.cd}DAN`], ['em', `${ICON.em}Maestria`], ['altro', 'Altro']]],
      ];
      groups.forEach(([key, , , opts]) => { if (!opts.some((o) => o && o[0] === state[key])) state[key] = opts.find(Boolean)[0]; });
      form.querySelector('#q-mains').innerHTML = groups.map(([key, name, icon, opts]) => `
        <div class="bg-field"><span class="bg-label"><img src="assets/img/guides/build/slot-${icon}.webp" alt="" width="96" height="96" class="bg-ico-img" />Principale ${name === 'Sabbie' ? 'delle' : 'del' + (name === 'Corona' ? 'la' : '')} ${name}</span>
          <div class="bg-seg bg-seg-lg" role="radiogroup" aria-label="Statistica principale: ${name}">
            ${opts.filter(Boolean).map(([v, label]) => `<button type="button" role="radio" data-q-main="${key}" data-v="${v}" aria-checked="${state[key] === v}">${label}</button>`).join('')}
          </div>
        </div>`).join('');
      form.querySelectorAll('[data-q-main]').forEach((b) => b.addEventListener('click', () => { state[b.dataset.qMain] = b.dataset.v; drawMains(); update(); }));
    }
    function drawStats() {
      const sc = scale();
      const style = STYLES.find((s) => s.k === state.style);
      const fields = [['cr', 'Tasso di CRIT', '%'], ['cd', 'DAN da CRIT', '%'], [SCALES[sc][1], { atk: 'ATT', hp: 'PS max', def: 'DIF', em: 'Maestria elementale' }[sc], '']];
      if (style.em && sc !== 'em') fields.push(['em', 'Maestria elementale', '']);
      fields.push(['er', 'Ricarica di energia', '%']);
      const box = form.querySelector('#q-stats');
      box.innerHTML = fields.map(([k, label, unit]) => `
        <label class="bg-stat"><span>${ICON[k]}${label}${unit ? ' %' : ''} <small>totale</small></span>
          <input type="text" name="${k}" inputmode="decimal" placeholder="0" value="${esc(values[k] || '')}" /></label>`).join('');
      form.querySelector('.bg-scale-pick').innerHTML = `scala su ${Object.entries(SCALES).map(([k, [n]]) => `<button type="button" data-q-scale="${k}" aria-pressed="${k === sc}">${ICON[SCALES[k][1]]}${n}</button>`).join('')}`;
      form.querySelectorAll('[data-q-scale]').forEach((b) => b.addEventListener('click', () => { state.scale = b.dataset.qScale; drawStats(); drawMains(); update(); }));
    }

    // ---- Calcolo ----
    function setBonuses() {
      const s1 = state.set1; const s2 = state.set2;
      const fixed = []; const combat = []; const notes = [];
      const two = [s1, state.pcs === 2 ? s2 : null].filter((s) => s && s !== NONE_SET);
      two.forEach((s) => { if (s.s2) fixed.push([s.n, s.s2]); });
      if (state.pcs === 4 && s1.s2) { /* gia contato sopra */ }
      if (state.pcs === 4 && s1.c4) {
        let v = s1.c4;
        if (s1.freeze4) v = state.style === 'freeze' ? s1.freeze4 : state.char.el === 'Cryo' ? s1.c4 : 0;
        if (s1.style4 && s1.style4 !== state.style) {
          notes.push(`Il 4pz di <b>${esc(s1.n)}</b> si attiva solo con lo stile ${s1.style4 === 'lunar' ? 'Lunare' : 'Stellare'}.`);
          v = 0;
        }
        if (v) combat.push([`${s1.n} 4pz`, v, s1.w4]);
      }
      if (state.style === 'freeze' && state.reso) combat.push(['Risonanza Cryo', 15, 'contro nemici congelati o con Cryo']);
      return { fixed, combat, notes };
    }

    function multiplier(cr, cd) { return 1 + Math.min(Math.max(cr, 0), 100) / 100 * cd / 100; }

    function update() {
      form.querySelectorAll('[data-q-style]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.qStyle === state.style)));
      form.querySelector('#q-reso').hidden = state.style !== 'freeze';

      const c = state.char; const w = state.weapon;
      const CR = num(values.cr); const CD = num(values.cd);
      const asc = (k) => (c.asc[0] === k ? c.asc[1] : 0);
      const wsub = (k) => (w && w.sub && w.sub[0] === k ? w.sub[1] : 0);
      const { fixed, combat, notes } = setBonuses();
      const fixedCr = fixed.reduce((t, f) => t + f[1], 0);
      const xcr = num(values.xcr); const xcd = num(values.xcd);
      const artCr = CR - 5 - asc('cr') - wsub('cr') - fixedCr - xcr - (state.corona === 'cr' ? 31.1 : 0);
      const artCd = CD - 50 - asc('cd') - wsub('cd') - xcd - (state.corona === 'cd' ? 62.2 : 0);
      const cv = 2 * artCr + artCd;
      const combatCr = CR + combat.reduce((t, f) => t + f[1], 0);
      const ratio = CD / Math.max(Math.min(combatCr, 100), 1);
      const [, tier, cls] = BUILD_TIERS.find(([min]) => cv >= min);
      const bad = !CR || !CD || artCr < -0.5 || artCd < -0.5;

      // Corona consigliata: Tasso o DAN da CRIT come principale, a parita di secondarie
      const crBase = combatCr - (state.corona === 'cr' ? 31.1 : 0);
      const cdBase = CD - (state.corona === 'cd' ? 62.2 : 0);
      const mWithCr = multiplier(crBase + 31.1, cdBase);
      const mWithCd = multiplier(crBase, cdBase + 62.2);
      const best = mWithCr >= mWithCd ? 'cr' : 'cd';
      const diff = (Math.max(mWithCr, mWithCd) / Math.min(mWithCr, mWithCd) - 1) * 100;
      const BEST_NAME = { cr: 'Tasso di CRIT', cd: 'DAN da CRIT' };
      let coronaRec;
      if (diff < 1) coronaRec = { k: 'pari', title: 'Tasso o DAN da CRIT', text: `Quasi uguali (${fmt(diff)}% di differenza): tieni la Corona con le secondarie migliori.` };
      else if (state.corona === best) coronaRec = { k: best, title: BEST_NAME[best], text: `&Egrave; gi&agrave; la scelta giusta: con ${best === 'cr' ? 'DAN da CRIT' : 'Tasso di CRIT'} faresti circa il <b>${fmt((1 - Math.min(mWithCr, mWithCd) / Math.max(mWithCr, mWithCd)) * 100)}%</b> di danno medio in meno.` };
      else if (state.corona === 'altro' || state.corona === 'em') coronaRec = { k: best, title: BEST_NAME[best], text: `Tra le due Corone CRIT &egrave; la migliore: <b>+${fmt(diff)}%</b> di danno medio rispetto all&rsquo;altra. Tieni la Corona attuale solo se il personaggio non fa danno con i CRIT (supporto, guaritore, reazioni senza CRIT).` };
      else coronaRec = { k: best, title: BEST_NAME[best], text: `Cambiala: con ${BEST_NAME[best]} il danno medio sale di circa il <b>${fmt(diff)}%</b>.`, change: true };
      if (combatCr - (state.corona === 'cr' ? 31.1 : 0) + 31.1 > 100 && best === 'cd' && diff >= 1) coronaRec.text += ' Con il Tasso andresti oltre il 100% in combattimento.';

      const tips = [];
      if (bad) tips.push('I valori non tornano: controlla Tasso e DAN da CRIT della schermata, la Corona e gli eventuali bonus fissi.');
      if (combatCr > 100) tips.push(`In combattimento il Tasso di CRIT arriva a <b>${fmt(combatCr)}%</b>: il <b>${fmt(combatCr - 100)}%</b> oltre il 100% &egrave; sprecato. Punta ai DAN da CRIT.`);
      else if (combatCr >= 85) tips.push(`In combattimento il Tasso di CRIT &egrave; gi&agrave; al <b>${fmt(combatCr)}%</b>: i prossimi roll mettili nei <b>DAN da CRIT</b>.`);
      else if (ratio > 2.6) tips.push(`Rapporto in combattimento 1 : ${fmt(ratio)}: ti serve pi&ugrave; <b>Tasso di CRIT</b>.`);
      else if (ratio < 1.6) tips.push(`Rapporto in combattimento 1 : ${fmt(ratio)}: ti servono pi&ugrave; <b>DAN da CRIT</b>.`);
      else tips.push(`Rapporto in combattimento 1 : ${fmt(ratio)}: vicino all&rsquo;1:2, bene.`);
      notes.forEach((n) => tips.push(n));

      // Roll Value della build: roll pieni nelle statistiche utili, ricavati dalla schermata
      const sc = scale();
      const twoSets = [state.set1, state.pcs === 2 ? state.set2 : null].filter((x) => x && x !== NONE_SET);
      const setSum = (key) => twoSets.reduce((t, x) => t + (x[key] || 0), 0);
      const MAIN_PCT = { atk: 46.6, hp: 46.6, def: 58.3 };
      const ROLL = { atk: 5.83, hp: 5.83, def: 7.29, em: 23.31 };
      const ASC = { atk: 'atkp', hp: 'hpp', def: 'defp', em: 'em' };
      const xsc = num(values.xsc);
      function subsRolls(key) {
        const total = num(values[key]);
        if (!total) return null;
        if (key === 'em') {
          const fixedEm = asc('em') + wsub('em') + setSum('em2') + ['sands', 'goblet', 'corona'].filter((g) => state[g] === 'em').length * 186.5 + (sc === 'em' ? xsc : 0);
          return (total - fixedEm) / ROLL.em;
        }
        const base = { atk: c.atk + (w ? w.atk : 0), hp: c.hp, def: c.def }[key];
        const pct = asc(ASC[key]) + wsub(ASC[key]) + setSum(`${key}2`) + (state.sands === 'scale' ? MAIN_PCT[key] : 0) + (state.goblet === 'scale' ? MAIN_PCT[key] : 0) + xsc;
        const flat = { atk: 311, hp: 4780, def: 0 }[key];
        return ((total - base * (1 + pct / 100) - flat) / base * 100) / ROLL[key];
      }
      const rollParts = [['CRIT', Math.max(artCr, 0) / 3.89 + Math.max(artCd, 0) / 7.77]];
      const scRolls = subsRolls(SCALES[sc][1]);
      if (scRolls !== null) rollParts.push([SCALE_PCT[sc], scRolls]);
      const style = STYLES.find((x) => x.k === state.style);
      if (style.em && sc !== 'em') { const e = subsRolls('em'); if (e !== null) rollParts.push(['Maestria', e]); }
      const rvBad = rollParts.some(([, r]) => r < -0.6);
      const rolls = rollParts.reduce((t, [, r]) => t + Math.max(r, 0), 0);
      const RV_TIERS = [[30, 'top', 't5'], [25, 'ottimo', 't4'], [20, 'buono', 't3'], [15, 'discreto', 't2'], [0, 'basso', 't1']];
      const [, rvTier, rvCls] = RV_TIERS.find(([min]) => rolls >= min);

      out.className = `bg-quick-out ${bad ? 't1' : cls}`;
      out.innerHTML = `
        <div class="bg-out-main">
          <b>${bad ? '&ndash;' : fmt(cv)}</b>
          <span>CV dei manufatti<strong>${bad ? 'controlla i valori' : tier}</strong></span>
          <i class="bg-meter bg-meter-big" aria-hidden="true"><i style="width:${bad ? 0 : Math.min(Math.max(cv, 0) / 250, 1) * 100}%"></i>${[120, 150, 180, 210].map((t) => `<em style="left:${t / 2.5}%"></em>`).join('')}</i>
          <small class="bg-out-sub">${ICON.cr}+${fmt(Math.max(artCr, 0))}% ${ICON.cd}+${fmt(Math.max(artCd, 0))}% dalle secondarie</small>
          <div class="bg-out-rv ${bad || rvBad ? 't1' : rvCls}">
            <b>${bad || rvBad ? '&ndash;' : `${fmt(rolls * 100, 0)}%`}</b>
            <span>Roll Value della build<strong>${bad || rvBad ? 'controlla le principali' : `${rvTier} &middot; &asymp; ${fmt(rolls)} roll utili su 45`}</strong></span>
            <small>${rollParts.map(([n, r]) => `${n} ${fmt(Math.max(r, 0))}`).join(' &middot; ')}</small>
          </div>
        </div>
        <ul class="bg-out-list bg-out-list-2">
          <li><span>${ICON.cr}Tasso in combattimento</span><strong>${fmt(combatCr)}%</strong><small>${combat.length ? combat.map((f) => `+${f[1]}% ${esc(f[0])}`).join(', ') : 'nessun bonus in combattimento'}</small></li>
          <li><span>${ICON.cd}DAN da CRIT</span><strong>${fmt(CD)}%</strong><small>rapporto 1 : ${fmt(ratio)}</small></li>
        </ul>
        ${bad ? '' : `<div class="bg-corona-rec${coronaRec.change ? ' is-change' : ''}"><img src="assets/img/guides/build/slot-circlet.webp" alt="" width="96" height="96" /><span><small>Corona consigliata</small><strong>${coronaRec.k === 'pari' ? '' : ICON[coronaRec.k]}${coronaRec.title}</strong><em>${coronaRec.text}</em></span></div>`}
        ${guideHtml({ sc, combatCr, bad })}
        <ul class="bg-tips">${tips.map((t) => `<li>${t}</li>`).join('')}</ul>
        ${combat.length ? `<p class="bg-out-foot">Bonus in combattimento contati: ${combat.map((f) => `${esc(f[0])} +${f[1]}%${f[2] ? ` (${f[2]})` : ''}`).join('; ')}.</p>` : ''}`;
    }

    // ---- Scheda del personaggio: cosa vuole e cosa manca ----
    const codeChip = (code) => {
      const [label, ic] = CODE[code] || [code, null];
      return `<span class="bg-code">${ic && ICON[ic] ? ICON[ic] : ''}${label}</span>`;
    };
    function guideHtml({ sc, combatCr, bad }) {
      const g = GUIDE[state.char.i];
      if (!g) return `<div class="bg-guide is-empty"><p>Per <b>${esc(state.char.n)}</b> non c&rsquo;&egrave; ancora una scheda con le statistiche consigliate.</p></div>`;
      const pctCode = { atk: 'atkp', hp: 'hpp', def: 'defp', em: 'em' }[sc];
      const mine = {
        sabbie: { scale: pctCode, em: 'em', er: 'er' }[state.sands] || null,
        calice: { dmg: 'dmg', scale: pctCode, em: 'em' }[state.goblet] || null,
        corona: { cr: 'cr', cd: 'cd', em: 'em' }[state.corona] || null,
      };
      const checks = [];
      [['sabbie', 'Sabbie', 'sands'], ['calice', 'Calice', 'goblet'], ['corona', 'Corona', 'circlet']].forEach(([k, name, icon]) => {
        const rec = g[k] || [];
        if (!rec.length) return;
        const img = `<img src="assets/img/guides/build/slot-${icon}.webp" alt="" width="96" height="96" class="bg-ico-img" />`;
        if (!mine[k]) checks.push(['info', `${img}${name}: controlla che sia ${rec.map((c) => CODE[c] ? CODE[c][0] : c).join(' o ')}.`]);
        else if (rec.includes(mine[k])) checks.push(['ok', `${img}${name} ${CODE[mine[k]][0]}: giusta.`]);
        else checks.push(['miss', `${img}${name}: meglio ${rec.slice(0, 2).map((c) => `<b>${CODE[c] ? CODE[c][0] : c}</b>`).join(' o ')} invece di ${CODE[mine[k]][0]}.`]);
      });
      const er = num(values.er);
      if (g.ricarica && er) {
        const [min, max] = g.ricarica;
        if (er < min - 0.5) checks.push(['miss', `${ICON.er}Ricarica ${fmt(er)}%: te ne manca circa il <b>${fmt(min - er)}%</b> (consigliata ${min}&ndash;${max}%).`]);
        else if (er > max + 15) checks.push(['info', `${ICON.er}Ricarica ${fmt(er)}%: oltre il necessario (${min}&ndash;${max}%), puoi spostare roll nel danno.`]);
        else checks.push(['ok', `${ICON.er}Ricarica ${fmt(er)}%: nell&rsquo;intervallo consigliato (${min}&ndash;${max}%).`]);
      }
      const em = num(values.em);
      if (g.maestria && em) {
        if (em < g.maestria - 10) checks.push(['miss', `${ICON.em}Maestria ${fmt(em, 0)}: te ne mancano circa <b>${fmt(g.maestria - em, 0)}</b> (obiettivo in schermata ${g.maestria}).`]);
        else checks.push(['ok', `${ICON.em}Maestria ${fmt(em, 0)}: obiettivo in schermata ${g.maestria} raggiunto.`]);
      }
      if (g.crit === false) checks.push(['info', `${ICON.cr}Per questo personaggio i CRIT non sono la priorit&agrave;: CV e consigli sui CRIT contano poco.`]);
      // Prossimi roll: priorita della scheda, tolte le statistiche gia a posto
      const done = new Set();
      if (g.ricarica && er >= g.ricarica[0]) done.add('er');
      if (g.maestria && em >= g.maestria - 10) done.add('em');
      if (!bad && combatCr >= 95) done.add('cr');
      const next = (g.secondarie || []).filter((c) => !done.has(c)).slice(0, 3);
      const hosts = (g.fonti || []).map((u) => { try { return [u, new URL(u).hostname.replace(/^www\./, '')]; } catch (e) { return null; } }).filter(Boolean);
      const ICONS = { ok: '&#10003;', miss: '&#10007;', info: 'i' };
      return `
        <div class="bg-guide">
          <div class="bg-guide-card">
            <div class="bg-guide-head"><img src="assets/img/characters/${state.char.i}.webp" alt="" width="256" height="256" /><span><small>Cosa vuole</small><strong>${esc(state.char.n)}</strong><em>${(g.ruoli || []).map((r) => ROLE[r] || r).join(' &middot; ')}</em></span><b class="bg-trust is-${esc(g.affidabilita || 'media')}">affidabilit&agrave; ${esc(g.affidabilita || 'media')}</b></div>
            <dl class="bg-guide-list">
              <dt><img src="assets/img/guides/build/slot-sands.webp" alt="" width="96" height="96" class="bg-ico-img" />Sabbie</dt><dd>${(g.sabbie || []).map(codeChip).join('') || '&ndash;'}</dd>
              <dt><img src="assets/img/guides/build/slot-goblet.webp" alt="" width="96" height="96" class="bg-ico-img" />Calice</dt><dd>${(g.calice || []).map(codeChip).join('') || '&ndash;'}</dd>
              <dt><img src="assets/img/guides/build/slot-circlet.webp" alt="" width="96" height="96" class="bg-ico-img" />Corona</dt><dd>${(g.corona || []).map(codeChip).join('') || '&ndash;'}</dd>
              <dt>${ICON.star}Secondarie</dt><dd>${(g.secondarie || []).map(codeChip).join('<i>&rsaquo;</i>') || '&ndash;'}</dd>
              ${g.ricarica ? `<dt>${ICON.er}Ricarica</dt><dd>${g.ricarica[0]}&ndash;${g.ricarica[1]}%</dd>` : ''}
              ${g.maestria || g.maestria_team ? `<dt>${ICON.em}Maestria</dt><dd>${g.maestria ? `${g.maestria} <small>in schermata</small>` : ''}${g.maestria && g.maestria_team ? '<i>&middot;</i>' : ''}${g.maestria_team ? `${[].concat(g.maestria_team).filter((v, i, a) => a.indexOf(v) === i).join('&ndash;')} <small>obiettivo delle guide, in combattimento con i buff</small>` : ''}</dd>` : ''}
            </dl>
            ${g.note ? `<p class="bg-guide-note">${esc(g.note)}</p>` : ''}
            ${hosts.length ? `<p class="bg-guide-src">Fonti: ${hosts.map(([u, h]) => `<a href="${esc(u)}" rel="noopener" target="_blank">${esc(h)}</a>`).join(', ')}</p>` : ''}
          </div>
          <div class="bg-guide-card">
            <div class="bg-guide-head"><span><small>La tua build</small><strong>Cosa manca e cosa migliorare</strong></span></div>
            <ul class="bg-checks-list">${checks.map(([k, t]) => `<li class="is-${k}"><span>${ICONS[k]}</span><div>${t}</div></li>`).join('')}</ul>
            ${next.length ? `<p class="bg-next"><small>Prossimi roll da cercare</small>${next.map(codeChip).join('')}</p>` : ''}
          </div>
        </div>`;
    }

    // ---- Eventi ----
    form.addEventListener('input', (e) => {
      if (e.target.name && e.target.name in values) { values[e.target.name] = e.target.value; update(); }
    });
    form.addEventListener('change', (e) => { if (e.target.closest('#q-reso')) { state.reso = e.target.checked; update(); } });
    form.addEventListener('submit', (e) => e.preventDefault());
    form.querySelectorAll('[data-q-pcs]').forEach((b) => b.addEventListener('click', () => { state.pcs = +b.dataset.qPcs; syncSets(); update(); }));
    form.querySelectorAll('[data-q-style]').forEach((b) => b.addEventListener('click', () => { state.style = b.dataset.qStyle; drawStats(); update(); }));

    pChar.setItems(DATA.chars); pChar.set(state.char, true);
    syncWeapons();
    state.weapon = byName(DATA.weapons, 'Mille soli ardenti') || state.weapon;
    pWeapon.set(state.weapon, true);
    syncSets();
    drawStats();
    drawMains();
    update();
  }
})();
