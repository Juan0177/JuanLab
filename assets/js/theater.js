(async function () {
  const metaEl = document.getElementById('theater-meta');
  const stageCardEl = document.getElementById('theater-stage-card');
  const rulesCardEl = document.getElementById('theater-rules-card');
  const strategiesCardEl = document.getElementById('theater-strategies-card');
  const toggleEl = document.querySelector('.theater-toggle');
  const modeTopEl = document.getElementById('theater-mode-top');

  if (!metaEl || !stageCardEl || !rulesCardEl || !strategiesCardEl || !toggleEl || !modeTopEl) return;

  let enemyList;
  let theaterIndex;
  try {
    [enemyList, theaterIndex] = await Promise.all([
      fetch('assets/data/enemies.json').then((r) => r.json()),
      fetch('assets/data/theater/index.json').then((r) => r.json()),
    ]);
  } catch {
    const msg = '<p class="theater-error">Impossibile caricare i dati del Theater. Usa GitHub Pages o Live Server.</p>';
    metaEl.innerHTML = msg;
    stageCardEl.innerHTML = msg;
    rulesCardEl.innerHTML = msg;
    strategiesCardEl.innerHTML = msg;
    return;
  }

  const theaterData = await Promise.all(
    theaterIndex.map((entry) => fetch(`assets/data/theater/${entry.file}`).then((r) => r.json()))
  );

  const enemyLookup = {};
  for (const e of enemyList) {
    const filename = e.image_path.split('/').pop();
    const id = filename.replace('UI_MonsterIcon_', '').replace(/\.\w+$/, '');
    enemyLookup[id] = {
      name: e.name,
      imagePath: e.image_path,
      info: Array.isArray(e.info) ? e.info.filter((line) => String(line || '').trim().length) : [],
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const matchingIndexes = theaterIndex
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => {
      const from = new Date(entry.from);
      const to = new Date(entry.to);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      return today >= from && today <= to;
    });
  let activeIdx = matchingIndexes.find(({ entry }) => entry.type !== 'test')?.index
    ?? matchingIndexes[0]?.index
    ?? -1;
  if (activeIdx < 0) activeIdx = 0;

  const modeConfig = {
    lunar: { title: 'Modalita Lunare', activeSlots: 6 },
    visionary: { title: 'Modalita Visionaria', activeSlots: 4 },
    hard: { title: 'Modalita Difficile', activeSlots: 3 },
    normal: { title: 'Modalita Normale', activeSlots: 2 },
    easy: { title: 'Modalita Facile', activeSlots: 1 },
  };

  let currentPeriodIdx = activeIdx;
  let currentModeKey = theaterData[activeIdx]?.selected_mode ?? 'easy';

  let countdownInterval = null;

  function startCountdown(entry, isActive) {
    clearInterval(countdownInterval);
    const el = document.getElementById('theater-countdown');
    if (!el || !entry) return;

    const target = new Date(isActive ? entry.to : entry.from);
    target.setHours(4, 0, 0, 0);
    if (isActive) target.setDate(target.getDate() + 1);

    countdownInterval = setInterval(() => {
      const diff = target - Date.now();
      if (diff <= 0) {
        el.textContent = isActive ? 'Rotazione scaduta' : 'Rotazione iniziata';
        clearInterval(countdownInterval);
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const label = isActive ? 'Finisce tra' : 'Inizia tra';
      el.textContent = `${label} ${d}g ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
    }, 1000);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;');
  }

  function formatDateLongIt(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value ?? '');
    const formatted = new Intl.DateTimeFormat('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
    return formatted.replace(/\b\p{L}/u, (c) => c.toUpperCase());
  }

  function buildStageNode(stage, active, fixedLevel, actLabel, noScroll = false) {
    const info = enemyLookup[stage.enemy_id] ?? {
      name: stage.name ?? stage.enemy_id ?? 'Boss',
      imagePath: 'assets/img/hero.png',
      info: [],
    };
    const hasEnemyTips = Array.isArray(info.info) && info.info.length > 0;
    const enemyTips = hasEnemyTips
      ? `<ul>${info.info.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`
      : '';
    const rawStageDescription = Array.isArray(stage.instructions) && stage.instructions.length
      ? stage.instructions
      : ['Descrizione stage non disponibile.'];
    const stageDescription = rawStageDescription.filter((line, idx) => {
      if (idx !== 0) return true;
      return !/^\s*(Act\s*\d+|Extra\s*Act\s*\d+)\b/i.test(String(line));
    });
    if (!stageDescription.length) {
      stageDescription.push('Descrizione stage non disponibile.');
    }

    return `
      <article class="theater-stage-node ${active ? '' : 'is-inactive'}">
        <div class="stage-meta-row">
          <span class="stage-level">Lv.${fixedLevel ?? '?'}</span>
          <span class="stage-act">${escapeHtml(actLabel || '')}</span>
        </div>
        <div class="stage-description-scroll${noScroll ? ' no-scroll' : ''}" aria-label="Descrizione stage">
          <div class="stage-thumb-wrap">
            <img class="stage-thumb" src="${info.imagePath || 'assets/img/hero.png'}" alt="${escapeHtml(info.name)}" loading="lazy" />
          </div>
          ${hasEnemyTips ? `
            <span class="stage-info">ⓘ
              <div class="stage-instructions enemy-tooltip-box">
                <strong class="enemy-tooltip-title">Info Nemico</strong>
                ${enemyTips}
              </div>
            </span>
          ` : ''}
          <div class="stage-heading-row">
            <strong class="stage-name">${escapeHtml(info.name)}</strong>
          </div>
          <p class="stage-description-label">Descrizione stage</p>
          <div class="stage-body-lines">
            ${stageDescription.map((line) => `<p>${escapeHtml(line)}</p>`).join('')}
          </div>
        </div>
      </article>`;
  }

  function padStages(stages, count) {
    const output = stages.slice(0, count);
    while (output.length < count) {
      output.push({ enemy_id: '', name: 'Stage non attivo', instructions: ['Disponibile a difficolta superiori.'] });
    }
    return output;
  }

  function renderMeta(data, entry) {
    const fromDate = formatDateLongIt(entry?.from);
    const toDate = formatDateLongIt(entry?.to);
    const periodLabel = entry?.from && entry?.to
      ? `Periodo live: ${fromDate} ~ ${toDate}`
      : (data.period ?? '');

    metaEl.innerHTML = `
      <div class="theater-period">${escapeHtml(periodLabel)}</div>
      <div class="theater-buff">
        <span class="theater-buff-label">Buff fisso</span>${escapeHtml(data.fixed_buff ?? '')}
      </div>
      <div id="theater-countdown" class="theater-countdown"></div>`;
  }

  function renderStageCard(data, modeKey, modeData) {
    const cfg = modeConfig[modeKey] ?? modeConfig.easy;
    const fixedLevel = modeData?.conditions?.level ?? '?';
    const conditions = modeData?.conditions ?? {};
    const stageList = Array.isArray(modeData?.stages) ? modeData.stages : [];
    const primaryStages = padStages(stageList.slice(0, 4), 4);
    const extraStages = cfg.activeSlots > 4 ? padStages(stageList.slice(4, 6), 2) : [];
    const primaryActs = ['Atto 3', 'Atto 6', 'Atto 8', 'Atto 10'];
    const extraActs = ['Atto Extra 1', 'Atto Extra 2'];

    stageCardEl.innerHTML = `
      <div class="card-head">
        <h3 class="card-title">Stage Boss</h3>
        <div class="card-mode-wrap">
          <span class="stage-mode-pill">${escapeHtml(cfg.title)}</span>
          <span class="card-sub">${cfg.activeSlots}/6 attivi</span>
        </div>
      </div>
      <div class="theater-stage-grid">
        ${primaryStages.map((stage, idx) => buildStageNode(stage, idx < cfg.activeSlots, fixedLevel, primaryActs[idx])).join('')}
      </div>
      ${extraStages.length ? `<div class="extra-divider"><span>Atti extra</span></div><div class="theater-stage-grid extra">${extraStages.map((stage, idx) => buildStageNode(stage, 4 + idx < cfg.activeSlots, fixedLevel, extraActs[idx], true)).join('')}</div>` : ''}
      <div class="stage-footer">
        <div class="stage-footer-grid">
          <ul>
            <li>Personaggi di apertura: <strong>${conditions.opening_characters ?? '?'}</strong></li>
            <li>Personaggi disponibili: <strong>${conditions.characters_available ?? '?'}</strong></li>
            <li>Personaggi disponibili (con bonus): <strong>${conditions.characters_with_bonus ?? '?'}</strong></li>
            <li>Livello minimo personaggio: <strong>${conditions.min_level ?? '?'}</strong></li>
            <li>Atti boss: <strong>${conditions.boss_acts ?? '?'}</strong></li>
          </ul>
          <ul>
            <li><strong>Buff fisso:</strong> ${escapeHtml(data.fixed_buff ?? '')}</li>
            <li><strong>Nota:</strong> in ogni periodo cambiano elementi consentiti, personaggi di apertura e invitati speciali.</li>
          </ul>
        </div>
      </div>
    `;
  }

  function renderCharacters(list, tileClass) {
    return list
      .filter((pg) => pg && typeof pg === 'object')
      .map((pg) => `
      <div class="${tileClass}">
        <img src="${pg.image || 'assets/img/hero.png'}" alt="${escapeHtml(pg.name || 'Personaggio')}" loading="lazy" />
        <span>${escapeHtml(pg.name || 'Sconosciuto')}</span>
      </div>
    `).join('');
  }

  function renderRulesCard(data, modeKey) {
    const cfg = modeConfig[modeKey] ?? modeConfig.easy;
    const mechanics = data?.mechanics ?? {};
    const recommendedElements = Array.isArray(mechanics.recommended_elements) ? mechanics.recommended_elements : [];
    const openingCharacters = Array.isArray(mechanics.opening_characters) ? mechanics.opening_characters : [];
    const guestStars = Array.isArray(mechanics.guest_stars) ? mechanics.guest_stars : [];
    rulesCardEl.innerHTML = `
      <div class="card-head">
        <h3 class="card-title">Setup Theater</h3>
        <span class="card-sub">${escapeHtml(cfg.title)}</span>
      </div>
      <div class="setup-block">
        <p class="setup-label">Elementi consigliati</p>
        <div class="elements-row">
          ${recommendedElements.map((el) => `
            <div class="element-pill">
              <img src="${el.icon || 'assets/img/elements/Hydro.webp'}" alt="${escapeHtml(el.name || 'Elemento')}" loading="lazy" />
              <span>${escapeHtml(el.name || 'Elemento')}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="setup-block">
        <p class="setup-label">Personaggi di apertura</p>
        <div class="character-row">
          ${renderCharacters(openingCharacters, 'char-pill')}
        </div>
        <p class="setup-note">I 6 personaggi di apertura sono sempre disponibili nel Theater e ricevono il buff fisso anche se non li possiedi.</p>
      </div>

      <div class="setup-block">
        <p class="setup-label">Invitati speciali</p>
        <div class="character-row guests">
          ${renderCharacters(guestStars, 'char-pill guest')}
        </div>
        <p class="setup-note">I 4 invitati speciali sono opzionali: puoi usarli solo se li possiedi nel tuo account.</p>
      </div>
    `;
  }

  function renderStrategiesCard(data) {
    const strategies = Array.isArray(data?.strategies) ? data.strategies : [];

    if (!strategies.length) {
      strategiesCardEl.innerHTML = `
        <div class="card-head">
          <h3 class="card-title">Strategie</h3>
          <span class="card-sub">Indicazioni rapide per il periodo corrente</span>
        </div>
        <p class="strategies-empty">Nessuna strategia configurata.</p>
      `;
      return;
    }

    strategiesCardEl.innerHTML = `
      <div class="card-head">
        <h3 class="card-title">Strategie</h3>
        <span class="card-sub">Indicazioni rapide per il periodo corrente</span>
      </div>
      <div class="strategies-grid">
        ${strategies.map((item) => {
          const title = escapeHtml(item?.title || 'Strategia');
          const points = Array.isArray(item?.points)
            ? item.points.filter((line) => String(line || '').trim().length > 0)
            : [];
          return `
            <article class="strategy-item">
              <h4>${title}</h4>
              ${points.length
                ? `<ul>${points.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`
                : '<p class="strategy-empty-item">Aggiungi i punti strategici nel JSON.</p>'}
            </article>`;
        }).join('')}
      </div>
    `;
  }

  function renderModeSwitch(modeKey) {
    const modeButtons = Object.entries(modeConfig)
      .map(([key, config]) => `<button class="outline" data-mode="${key}" ${key === modeKey ? 'aria-current="true"' : ''}>${config.title}</button>`)
      .join('');

    modeTopEl.innerHTML = modeButtons;

    modeTopEl.querySelectorAll('button[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentModeKey = btn.dataset.mode || currentModeKey;
        renderMode(currentPeriodIdx, currentModeKey);
      });
    });
  }

  function renderMode(indexPos, modeKey) {
    const data = theaterData[indexPos];
    const resolvedMode = modeConfig[modeKey] ? modeKey : 'easy';
    const modeData = data?.modes?.[resolvedMode] ?? {};

    renderModeSwitch(resolvedMode);
    renderStageCard(data, resolvedMode, modeData);
    renderRulesCard(data, resolvedMode);
    renderStrategiesCard(data);
  }

  function render(indexPos) {
    const data = theaterData[indexPos];
    const periodEntry = theaterIndex[indexPos];
    currentPeriodIdx = indexPos;
    currentModeKey = data?.selected_mode ?? 'easy';

    renderMeta(data, periodEntry);
    renderMode(indexPos, currentModeKey);
  }

  theaterIndex.forEach((entry, i) => {
    const btn = document.createElement('button');
    btn.className = 'outline';
    btn.dataset.idx = String(i);
    btn.textContent = entry.label;
    if (i === activeIdx) btn.setAttribute('aria-current', 'true');
    btn.addEventListener('click', () => {
      toggleEl.querySelectorAll('button[data-idx]').forEach((b) => b.removeAttribute('aria-current'));
      btn.setAttribute('aria-current', 'true');
      render(i);
      startCountdown(theaterIndex[i], i === activeIdx);
    });
    toggleEl.insertBefore(btn, document.getElementById('btn-download'));
  });

  render(activeIdx);
  startCountdown(theaterIndex[activeIdx], true);

  document.getElementById('btn-download')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-download');
    const stars = document.getElementById('stars');
    const toggle = document.querySelector('.theater-toggle');
    const target = document.querySelector('main.container');
    const modeTop = document.getElementById('theater-mode-top');

    if (!btn || !stars || !toggle || !target || !modeTop) return;

    btn.disabled = true;
    btn.textContent = 'Generazione...';
    stars.style.display = 'none';
    toggle.style.display = 'none';
    modeTop.style.display = 'none';
    target.style.padding = '2rem 3rem';

    try {
      const canvas = await html2canvas(target, {
        backgroundColor: '#060810',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = 'imaginarium-theater.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Download fallito:', err);
      alert('Download non riuscito. Apri la pagina via Live Server o GitHub Pages.');
    } finally {
      stars.style.display = '';
      toggle.style.display = '';
      modeTop.style.display = '';
      target.style.padding = '';
      btn.disabled = false;
      btn.textContent = '\u2193 Scarica immagine';
    }
  });
}());
