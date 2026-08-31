(async function () {
  const metaEl = document.getElementById('stygian-meta');
  const difficultyEl = document.getElementById('stygian-difficulty-switch');
  const bossesEl = document.getElementById('stygian-bosses');
  const summaryEl = document.getElementById('stygian-summary');
  const toggleEl = document.querySelector('.stygian-toggle');

  if (!metaEl || !difficultyEl || !bossesEl || !summaryEl || !toggleEl) return;

  let enemyList;
  let stygianIndex;
  try {
    [enemyList, stygianIndex] = await Promise.all([
      fetch('assets/data/enemies.json').then((r) => r.json()),
      fetch('assets/data/stygian/index.json').then((r) => r.json()),
    ]);
  } catch {
    const msg = '<p class="stygian-empty">Impossibile caricare i dati di Stygian Onslaught. Usa GitHub Pages o Live Server.</p>';
    metaEl.innerHTML = msg;
    bossesEl.innerHTML = msg;
    summaryEl.innerHTML = '';
    return;
  }

  const stygianData = await Promise.all(
    stygianIndex.map((entry) => fetch(`assets/data/stygian/${entry.file}`).then((r) => r.json()))
  );

  const enemyLookup = {};
  for (const enemy of enemyList) {
    const filename = enemy.image_path.split('/').pop();
    const id = filename.replace('UI_MonsterIcon_', '').replace(/\.\w+$/, '');
    enemyLookup[id] = {
      name: enemy.name,
      imagePath: enemy.image_path,
      info: Array.isArray(enemy.info)
        ? enemy.info.filter((line) => String(line || '').trim().length > 0)
        : [],
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const matchingIndexes = stygianIndex
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

  let currentPeriodIdx = activeIdx;
  let currentDifficultyKey = '';
  let countdownInterval = null;

  function escapeHtml(value) {
    return String(value ?? '')
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
    return formatted.replace(/\b\p{L}/u, (char) => char.toUpperCase());
  }

  function startCountdown(entry, isActive) {
    clearInterval(countdownInterval);
    const el = document.getElementById('stygian-countdown');
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

  function renderMeta(data, entry) {
    const periodLabel = entry?.from && entry?.to
      ? `Periodo live: ${formatDateLongIt(entry.from)} ~ ${formatDateLongIt(entry.to)}`
      : (data.period ?? '');

    metaEl.innerHTML = `
      <div class="stygian-meta-card">
        <div class="stygian-meta-row">
          <div>
            <div class="stygian-title-wrap">
              <h2>Stygian Onslaught</h2>
              <span class="stygian-version-pill">${escapeHtml(data.version ?? entry?.label ?? '')}</span>
            </div>
          </div>
          <span class="stygian-period-pill">${escapeHtml(periodLabel)}</span>
        </div>
        <div id="stygian-countdown" class="stygian-countdown"></div>
      </div>`;
  }

  function renderDifficultySwitch(data) {
    const difficulties = data?.difficulties ?? {};
    const keys = Object.keys(difficulties).sort((a, b) => Number(a) - Number(b));

    if (!keys.length) {
      difficultyEl.innerHTML = '';
      return;
    }

    difficultyEl.innerHTML = keys.map((key) => {
      const difficulty = difficulties[key] ?? {};
      const label = difficulty.label || `Difficolta ${key}`;
      return `<button class="outline" data-difficulty="${escapeHtml(key)}" ${key === currentDifficultyKey ? 'aria-current="true"' : ''}>${escapeHtml(label)}</button>`;
    }).join('');

    difficultyEl.querySelectorAll('button[data-difficulty]').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentDifficultyKey = btn.dataset.difficulty || currentDifficultyKey;
        renderDifficulty(data, currentDifficultyKey);
      });
    });
  }

  function renderBossCard(boss, difficulty) {
    const enemy = enemyLookup[boss.enemy_id] ?? {
      name: boss.name || boss.enemy_id || 'Boss sconosciuto',
      imagePath: 'assets/img/hero.png',
      info: [],
    };
    const title = boss.display_name || enemy.name;
    const advantages = Array.isArray(boss.advantages) ? boss.advantages : [];
    const disadvantages = Array.isArray(boss.disadvantages) ? boss.disadvantages : [];
    const mechanics = Array.isArray(boss.mechanics) ? boss.mechanics : [];
    const resistances = boss.resistances ?? {};
    const resistanceOrder = [
      ['Pyro', 'assets/img/elements/Pyro.webp', resistances.pyro],
      ['Hydro', 'assets/img/elements/Hydro.webp', resistances.hydro],
      ['Dendro', 'assets/img/elements/Dendro.webp', resistances.dendro],
      ['Electro', 'assets/img/elements/Electro.webp', resistances.electro],
      ['Anemo', 'assets/img/elements/Anemo.webp', resistances.anemo],
      ['Cryo', 'assets/img/elements/Cryo.webp', resistances.cryo],
      ['Geo', 'assets/img/elements/Geo.webp', resistances.geo],
      ['Fisica', 'assets/img/elements/physical_converted.webp', resistances.physical],
    ];
    const enemyInfo = Array.isArray(enemy.info) ? enemy.info : [];
    const infoTooltip = enemyInfo.length
      ? `<span class="stygian-info">ⓘ<span class="stygian-info-tooltip enemy-tooltip-box"><strong class="enemy-tooltip-title">Info Nemico</strong><ul>${enemyInfo.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></span></span>`
      : '';
    const hpTooltip = `
      <div class="stygian-hp-tooltip">
        <div class="stygian-hp-tooltip-title">Resistenze base</div>
        <div class="stygian-hp-tooltip-grid">
          ${resistanceOrder.map(([label, iconPath, value]) => `
            <div class="stygian-hp-res-item">
              <img src="${escapeHtml(iconPath)}" alt="${escapeHtml(label)}" loading="lazy" class="${label === 'Fisica' ? 'is-physical' : ''}" />
              <span>${escapeHtml(value ?? '-')}</span>
            </div>`).join('')}
        </div>
      </div>`;

    return `
      <article class="stygian-boss-card">
        <div class="stygian-boss-figure">
          <img src="${escapeHtml(enemy.imagePath)}" alt="${escapeHtml(title)}" loading="lazy" />
        </div>
        <div class="stygian-boss-body">
          <p class="stygian-boss-level">${escapeHtml(difficulty.label || '')}${boss.level ? ` · Lv.${escapeHtml(boss.level)}` : ''}</p>
          <div class="stygian-boss-title-row">
            <h3 class="stygian-boss-title">${escapeHtml(title)}</h3>
            ${infoTooltip}
          </div>
          <span class="stygian-boss-hp-label">HP</span>
          <div class="stygian-boss-hp-wrap">
            <strong class="stygian-boss-hp">${Number(boss.hp || 0).toLocaleString('it-IT')}</strong>
            ${hpTooltip}
          </div>

          ${(advantages.length || disadvantages.length) ? `
            <div class="stygian-tag-list">
              ${advantages.map((item) => `<span class="stygian-tag is-good">✓ ${escapeHtml(item)}</span>`).join('')}
              ${disadvantages.map((item) => `<span class="stygian-tag is-bad">✕ ${escapeHtml(item)}</span>`).join('')}
            </div>` : ''}

          ${mechanics.length ? `
            <div class="stygian-mechanics">
              ${mechanics.map((item) => `
                <div class="stygian-mechanic">
                  <h4>${escapeHtml(item.title || 'Meccanica')}</h4>
                  <p>${escapeHtml(item.description || '')}</p>
                </div>`).join('')}
            </div>` : ''}
        </div>
      </article>`;
  }

  function renderSummary(data, difficulty) {
    const overview = data?.overview ?? {};
    const points = Array.isArray(overview.points) ? overview.points : [];
    summaryEl.innerHTML = `
      <h3>${escapeHtml(overview.title || 'Panoramica rotazione')}</h3>
      ${difficulty?.notes ? `<p class="stygian-description"><strong>Focus difficolta:</strong> ${escapeHtml(difficulty.notes)}</p>` : ''}
      ${points.length ? `<ul>${points.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}`;
  }

  function renderDifficulty(data, difficultyKey) {
    const difficulties = data?.difficulties ?? {};
    const sortedKeys = Object.keys(difficulties).sort((a, b) => Number(a) - Number(b));
    const resolvedKey = difficulties[difficultyKey] ? difficultyKey : sortedKeys[0];
    const difficulty = difficulties[resolvedKey] ?? { bosses: [] };
    currentDifficultyKey = resolvedKey;

    renderDifficultySwitch(data);
    bossesEl.innerHTML = `<div class="stygian-boss-grid">${(difficulty.bosses ?? []).map((boss) => renderBossCard(boss, difficulty)).join('')}</div>`;
    renderSummary(data, difficulty);
  }

  function render(indexPos) {
    const data = stygianData[indexPos];
    const entry = stygianIndex[indexPos];
    currentPeriodIdx = indexPos;
    currentDifficultyKey = data?.selected_difficulty || Object.keys(data?.difficulties ?? {})[0] || '';

    renderMeta(data, entry);
    renderDifficulty(data, currentDifficultyKey);
  }

  stygianIndex.forEach((entry, idx) => {
    const btn = document.createElement('button');
    btn.className = 'outline';
    btn.dataset.idx = String(idx);
    btn.textContent = entry.label;
    if (idx === activeIdx) btn.setAttribute('aria-current', 'true');
    btn.addEventListener('click', () => {
      toggleEl.querySelectorAll('button[data-idx]').forEach((button) => button.removeAttribute('aria-current'));
      btn.setAttribute('aria-current', 'true');
      render(idx);
      startCountdown(stygianIndex[idx], idx === activeIdx);
    });
    toggleEl.insertBefore(btn, document.getElementById('btn-download'));
  });

  render(activeIdx);
  startCountdown(stygianIndex[activeIdx], true);

  document.getElementById('btn-download')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-download');
    const stars = document.getElementById('stars');
    const toggle = document.querySelector('.stygian-toggle');
    const difficultySwitch = document.getElementById('stygian-difficulty-switch');
    const target = document.querySelector('main.container');

    if (!btn || !stars || !toggle || !difficultySwitch || !target) return;

    btn.disabled = true;
    btn.textContent = 'Generazione...';
    stars.style.display = 'none';
    toggle.style.display = 'none';
    difficultySwitch.style.display = 'none';
    target.style.padding = '2rem 3rem';

    try {
      const canvas = await html2canvas(target, {
        backgroundColor: '#060810',
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: (clonedDocument) => {
          clonedDocument.querySelectorAll('.stygian-boss-figure img').forEach((img) => {
            img.style.width = 'auto';
            img.style.height = 'auto';
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            img.style.objectFit = 'contain';
            img.style.transform = 'none';
          });
        },
      });
      const link = document.createElement('a');
      link.download = 'stygian-onslaught.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Download fallito:', error);
      alert('Download non riuscito. Apri la pagina via Live Server o GitHub Pages.');
    } finally {
      stars.style.display = '';
      toggle.style.display = '';
      difficultySwitch.style.display = '';
      target.style.padding = '';
      btn.disabled = false;
      btn.textContent = '\u2193 Scarica immagine';
    }
  });
}());