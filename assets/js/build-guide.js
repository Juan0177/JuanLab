// build-guide.html: tabella dei roll, card degli artefatti d'esempio e calcolatori di CV / RV.
// Valori dei roll 5★ (tier 70/80/90/100%) da KeqingMains.
(function () {
  const STATS = {
    cr:   { label: 'CRIT Rate', max: 3.89, pct: true },
    cd:   { label: 'CRIT DMG', max: 7.77, pct: true },
    atkp: { label: 'ATK%', max: 5.83, pct: true },
    hpp:  { label: 'HP%', max: 5.83, pct: true },
    defp: { label: 'DEF%', max: 7.29, pct: true },
    em:   { label: 'Elemental Mastery', max: 23.31, pct: false },
    er:   { label: 'Energy Recharge', max: 6.48, pct: true },
    atk:  { label: 'ATK', max: 19.45, pct: false },
    hp:   { label: 'HP', max: 298.75, pct: false },
    def:  { label: 'DEF', max: 23.15, pct: false },
  };
  const TIERS = [0.7, 0.8, 0.9, 1];

  const PROFILES = {
    atk:      { label: 'ATK + CRIT (DPS ad ATK)', stats: ['cr', 'cd', 'atkp'] },
    'atk-er': { label: 'ATK + CRIT + ER (Sub-DPS ad ATK)', stats: ['cr', 'cd', 'atkp', 'er'] },
    hp:       { label: 'HP + CRIT (DPS ad HP)', stats: ['cr', 'cd', 'hpp'] },
    'hp-er':  { label: 'HP + CRIT + ER (Sub-DPS ad HP)', stats: ['cr', 'cd', 'hpp', 'er'] },
    def:      { label: 'DEF + CRIT (DPS a DEF)', stats: ['cr', 'cd', 'defp'] },
    emcrit:   { label: 'EM + CRIT (Lunar, Stellar-Conduct)', stats: ['cr', 'cd', 'em'] },
    'sup-em': { label: 'Support EM (Swirl, Bloom&hellip;)', stats: ['em', 'er'] },
    'sup-hp': { label: 'Support HP / healer', stats: ['hpp', 'er'] },
    'sup-def':{ label: 'Support DEF', stats: ['defp', 'er'] },
  };

  const fmt = (n, d = 1) => n.toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d });

  // Righe singole: se il testo non ci sta, scorre (niente a capo che disallinea le card).
  const FIT_SEL = [
    '.bg-page .section-head h2', '.bg-page .section-head > span',
    '.art-slot', '.art-head > div > strong', '.art-head > div > small', '.art-prof',
    '.art-score > span > small', '.bg-calc label:not(.visually-hidden) > .lbl',
    '.bg-targets .kpi > span',
  ].join(',');
  function fit(root = document) {
    root.querySelectorAll(FIT_SEL).forEach((el) => {
      if (!el.classList.contains('bg-fit')) {
        const inner = document.createElement('span');
        inner.className = 'fit-in';
        while (el.firstChild) inner.appendChild(el.firstChild);
        el.appendChild(inner);
        el.classList.add('bg-fit');
      }
      const inner = el.firstElementChild;
      const over = inner.scrollWidth - el.clientWidth;
      const scrolling = over > 1;
      el.classList.toggle('is-scrolling', scrolling);
      el.style.setProperty('--shift', `${-(over + 14)}px`);
      el.style.setProperty('--dur', `${Math.max(4, (over + 14) / 18)}s`);
      if (scrolling) el.title = inner.textContent.trim(); else el.removeAttribute('title');
    });
  }

  function cvTier(cv) {
    if (cv >= 40) return ['eccezionale', 't5'];
    if (cv >= 35) return ['ottimo', 't4'];
    if (cv >= 25) return ['buono', 't3'];
    if (cv >= 15) return ['nella media', 't2'];
    return ['scarso', 't1'];
  }
  function rvTier(rv) {
    if (rv >= 600) return ['ottimo', 't5'];
    if (rv >= 450) return ['buono', 't3'];
    if (rv >= 300) return ['discreto', 't2'];
    return ['scarso', 't1'];
  }

  // subs: [{ stat, value }]
  function score(subs, profile) {
    const useful = PROFILES[profile].stats;
    let cv = 0;
    let rv = 0;
    subs.forEach(({ stat, value }) => {
      if (!STATS[stat] || !(value > 0)) return;
      if (stat === 'cr') cv += 2 * value;
      if (stat === 'cd') cv += value;
      if (useful.includes(stat)) rv += (value / STATS[stat].max) * 100;
    });
    return { cv, rv };
  }

  function scoreHtml({ cv, rv }) {
    const [cl, cc] = cvTier(cv);
    const [rl, rc] = rvTier(rv);
    return `<span class="${cc}"><b>${fmt(cv)}</b> CV<small>${cl}</small><small>&asymp; ${fmt(cv / 7.77)} roll crit</small></span>`
      + `<span class="${rc}"><b>${fmt(rv, 0)}%</b> RV<small>${rl}</small><small>&asymp; ${fmt(rv / 100)} roll</small></span>`;
  }

  // Tabella dei roll
  const rollBody = document.getElementById('bg-roll-table');
  if (rollBody) {
    rollBody.innerHTML = Object.entries(STATS).map(([key, s]) => {
      const cells = TIERS.map((t) => {
        const v = s.max * t;
        return `<td>${s.pct ? `${fmt(v, 2)}%` : fmt(v, 2)}</td>`;
      }).join('');
      const cv = key === 'cr' ? fmt(2 * s.max, 2) : key === 'cd' ? fmt(s.max, 2) : '&ndash;';
      return `<tr><th scope="row">${s.label}${s.pct ? '' : ' <small>flat</small>'}</th>${cells}<td>${cv}</td></tr>`;
    }).join('');
  }

  // Tabella dei profili
  const profBody = document.getElementById('bg-profile-table');
  if (profBody) {
    profBody.innerHTML = Object.values(PROFILES).map((p) => (
      `<tr><th scope="row">${p.label}</th><td>${p.stats.map((s) => STATS[s].label).join(', ')}</td></tr>`
    )).join('');
  }

  // Card degli artefatti d'esempio
  document.querySelectorAll('.art-card').forEach((card) => {
    const profile = card.dataset.profile || 'atk';
    const useful = PROFILES[profile].stats;
    const subs = [];
    card.querySelectorAll('.art-subs li').forEach((li) => {
      const stat = li.dataset.stat;
      const value = parseFloat(li.dataset.value);
      subs.push({ stat, value });
      const rolls = value / STATS[stat].max;
      li.className = useful.includes(stat) ? 'is-useful' : 'is-dead';
      li.innerHTML = `<span>${STATS[stat].label}</span><span>+${STATS[stat].pct ? `${fmt(value)}%` : fmt(value, 0)}</span>`
        + `<i class="art-bar" style="--w:${Math.min(rolls / 6, 1) * 100}%" aria-hidden="true"></i>`;
      li.title = `circa ${fmt(rolls)} roll pieni`;
    });
    const out = card.querySelector('.art-score');
    if (out) {
      out.innerHTML = `<p class="art-prof">Profilo: ${PROFILES[profile].label}</p>${scoreHtml(score(subs, profile))}`;
    }
  });

  // Calcolatore: un artefatto
  const pieceForm = document.getElementById('calc-piece');
  if (pieceForm) {
    const profSel = document.getElementById('calc-profile');
    profSel.innerHTML = Object.entries(PROFILES).map(([k, p]) => `<option value="${k}">${p.label}</option>`).join('');
    const rowsBox = document.getElementById('calc-rows');
    const defaults = [['cr', 7.0], ['cd', 14.0], ['atkp', 5.8], ['def', 23]];
    const statOptions = Object.entries(STATS).map(([k, s]) => `<option value="${k}">${s.label}${s.pct && !s.label.endsWith('%') ? ' (%)' : ''}</option>`).join('');
    rowsBox.innerHTML = defaults.map(([k, v], i) => `
      <div class="bg-calc-row">
        <label class="visually-hidden" for="calc-stat-${i}">Substat ${i + 1}</label>
        <select id="calc-stat-${i}" name="stat${i}">${statOptions}</select>
        <label class="visually-hidden" for="calc-val-${i}">Valore ${i + 1}</label>
        <input id="calc-val-${i}" name="val${i}" type="number" step="0.1" min="0" value="${v}" inputmode="decimal" />
      </div>`).join('');
    defaults.forEach(([k], i) => { pieceForm.elements[`stat${i}`].value = k; });

    const outPiece = document.getElementById('calc-piece-out');
    const updatePiece = () => {
      const subs = [0, 1, 2, 3].map((i) => ({
        stat: pieceForm.elements[`stat${i}`].value,
        value: parseFloat(pieceForm.elements[`val${i}`].value) || 0,
      }));
      const seen = new Set();
      const dup = subs.some((s) => s.value > 0 && (seen.has(s.stat) || !seen.add(s.stat)));
      outPiece.innerHTML = scoreHtml(score(subs, profSel.value))
        + (dup ? '<p class="bg-warn">Hai lo stesso substat due volte: un artefatto non pu&ograve; averlo.</p>' : '');
      fit(outPiece);
    };
    pieceForm.addEventListener('input', updatePiece);
    pieceForm.addEventListener('submit', (e) => e.preventDefault());
    updatePiece();
  }

  // Calcolatore: la build
  const buildForm = document.getElementById('calc-build');
  if (buildForm) {
    const outBuild = document.getElementById('calc-build-out');
    const num = (n) => parseFloat(buildForm.elements[n].value) || 0;
    const updateBuild = () => {
      const circ = buildForm.elements.circlet.value;
      const cr = num('cr') - 5 - num('crx') - (circ === 'cr' ? 31.1 : 0);
      const cd = num('cd') - 50 - num('cdx') - (circ === 'cd' ? 62.2 : 0);
      const cv = 2 * cr + cd;
      const total = cv + (circ === 'none' ? 0 : 62.2);
      let tier = 'da migliorare'; let cls = 't1';
      if (cv >= 210) { tier = 'end game'; cls = 't5'; } else if (cv >= 180) { tier = 'ottima'; cls = 't4'; } else if (cv >= 150) { tier = 'buona'; cls = 't3'; } else if (cv >= 120) { tier = 'discreta'; cls = 't2'; }
      const ratio = num('cr') > 0 ? num('cd') / num('cr') : 0;
      const bad = cr < 0 || cd < 0;
      outBuild.innerHTML = bad
        ? '<p class="bg-warn">I bonus tolti superano il totale: controlla i valori.</p>'
        : `<span class="${cls}"><b>${fmt(cv)}</b> CV dei substats<small>${tier} &middot; ${fmt(cr)}% CRIT Rate e ${fmt(cd)}% CRIT DMG dagli artefatti</small></span>`
          + `<span class="t2"><b>${fmt(total)}</b> CV con il Circlet<small>come lo contano Akasha e altri siti</small></span>`
          + `<span class="t2"><b>1 : ${fmt(ratio)}</b> rapporto in schermata<small>${ratio < 1.7 ? 'pi&ugrave; CRIT DMG ti farebbe comodo' : ratio > 2.5 ? 'spingi sul CRIT Rate (se il set o il team non lo danno gi&agrave;)' : 'vicino all&rsquo;1:2'}</small></span>`;
      fit(outBuild);
    };
    buildForm.addEventListener('input', updateBuild);
    buildForm.addEventListener('submit', (e) => e.preventDefault());
    updateBuild();
  }

  // Etichette del calcolatore: il testo in uno span, così resta su una riga
  document.querySelectorAll('.bg-calc label').forEach((label) => {
    const text = Array.from(label.childNodes).find((n) => n.nodeType === 3 && n.textContent.trim());
    if (!text) return;
    const span = document.createElement('span');
    span.className = 'lbl';
    span.textContent = text.textContent.trim();
    label.replaceChild(span, text);
  });

  fit();
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => fit(), 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fit());
})();
