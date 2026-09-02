(async function () {
  const metaEl = document.getElementById('stygian-meta');
  const difficultyEl = document.getElementById('stygian-difficulty-switch');
  const bossesEl = document.getElementById('stygian-bosses');
  const teamBuilderEl = document.getElementById('stygian-team-builder');
  const summaryEl = document.getElementById('stygian-summary');
  const toggleEl = document.querySelector('.stygian-toggle');

  if (!metaEl || !difficultyEl || !bossesEl || !teamBuilderEl || !summaryEl || !toggleEl) return;

  const characters = `Aino Albedo Alhatham Aloy Alyosha Ambor Arlecchino Ayaka Ayato Baizhuer Barbara Beidou Bennett Candace Charlotte Chasca Chevreuse Chiori Chongyun Citlali Clorinde Collei Columbina Cyno Dahlia Dehya Diluc Diona Dori Durin Emilie Escoffier Eula Faruzan Feiyan Fischl Flins Freminet Furina Gaming Ganyu Gorou Heizo Hutao Iansan Ifa Illuga Ineffa Itto Jahoda Kachina Kaeya Kaveh Kazuha Keqing Kinich Klee Kokomi Lanyan Lauma Layla Linette Liney Linnea Lisa Liuyun Lohen Mavuika Mika Mizuki Momoka Mona Mualani Nahida Navia Nefer Neuvillette Nicole Nilou Ningguang Noel Odette Olorun Prune Qiqi Razor Rosaria Sara Sayu Sethos Shenhe Shinobu Shougun Sigewinne Sucrose Tartaglia Tighnari Tohma Varesa Varka Venti Vesna Vodyanitsa Wanderer Wriothesley Xiangling Xiao Xilonen Xingqiu Xinyan Yae Yaoyao Yelan Yoimiya Yunjin Zhongli Zibai`.split(' ');
  const elements = ['Anemo', 'Cryo', 'Dendro', 'Electro', 'Geo', 'Hydro', 'Pyro'];
  const weapons = [
    { id: 'Hunters_Bow', label: 'Arco' },
    { id: 'Apprentices_Notes', label: 'Catalizzatore' },
    { id: 'Waster_Greatsword', label: 'Claymore' },
    { id: 'Beginners_Protector', label: 'Lancia' },
    { id: 'Silver_Sword', label: 'Spada' },
  ];
  let teamSelections = [[], [], []];
  let confirmedTeams = [[], [], []];
  let teamPickerTypes = ['character', 'character', 'character'];

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

  function renderBossCard(boss, difficulty, bossIndex) {
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

          ${renderBossRecommendations(bossIndex)}

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

  function characterLabel(id) {
    return ({
      Alhatham: 'Alhaitham', Ambor: 'Amber', Baizhuer: 'Baizhu', Feiyan: 'Yanfei',
      Heizo: 'Heizou', Hutao: 'Hu Tao', Lanyan: 'Lan Yan', Liney: 'Lyney',
      Liuyun: 'Xianyun', Momoka: 'Kirara', Mualani: 'Mualani', Noel: 'Noelle',
      Qin: 'Jean', Shougun: 'Raiden Shogun', Tohma: 'Thoma',
      Yae: 'Yae Miko', Yunjin: 'Yun Jin',
    }[id] || id);
  }

  function normalizeSelection(selection) {
    return typeof selection === 'string' ? { type: 'character', id: selection, constellation: 0 } : selection;
  }

  function selectionItems(selection) {
    return selection.type === 'multi' ? selection.items : [selection];
  }

  function selectionLabel(selection) {
    if (selection.type === 'multi') return selection.items.map(selectionLabel).join(' / ');
    if (selection.type === 'character') return characterLabel(selection.id);
    if (selection.type === 'element') return selection.id;
    return selection.label;
  }

  function selectionImage(selection) {
    if (selection.type === 'character') return `assets/img/characters/UI_AvatarIcon_${selection.id}.webp`;
    if (selection.type === 'element') return `assets/img/elements/${selection.id}.webp`;
    return `assets/img/weapons/${selection.id}.png`;
  }

  function renderTeamPortrait(selection) {
    const items = selectionItems(selection);
    return `<span class="stygian-recommendation-slot ${selection.type === 'multi' ? `is-multi is-${items.length}-way` : ''}">
      ${selection.type === 'multi'
        ? `${items.length === 3 ? '<i class="stygian-recommendation-y-arm is-left"></i><i class="stygian-recommendation-y-arm is-right"></i>' : ''}${items.map((item) => `<img src="${escapeHtml(selectionImage(item))}" alt="${escapeHtml(selectionLabel(item))}" />`).join('')}`
        : `<img src="${escapeHtml(selectionImage(selection))}" alt="${escapeHtml(selectionLabel(selection))}" />`}
      ${selection.note ? `<em>${escapeHtml(selection.note)}</em>` : ''}
    </span>`;
  }

  function renderBossRecommendations(bossIndex) {
    const recommendations = confirmedTeams[bossIndex] ?? [];
    if (!recommendations.length) return '';
    return `<div class="stygian-recommendations">
      ${recommendations.map((team, index) => `<div class="stygian-recommendation">
        <h4>✓ Squadra consigliata ${index + 1}<button class="stygian-remove-recommendation" data-boss-index="${bossIndex}" data-recommendation-index="${index}" aria-label="Rimuovi squadra consigliata ${index + 1}" title="Rimuovi squadra">&times;</button></h4>
        <div class="stygian-recommendation-portraits">${Array.from({ length: 4 }, (_, slotIndex) => team[slotIndex] ? renderTeamPortrait(team[slotIndex]) : '<span class="stygian-recommendation-slot is-empty" aria-hidden="true"></span>').join('')}</div>
      </div>`).join('')}
    </div>`;
  }

  function renderTeamBuilder(difficulty) {
    const bosses = difficulty?.bosses ?? [];
    teamSelections = bosses.map((_, index) => (teamSelections[index] ?? []).map(normalizeSelection)).slice(0, 3);
    teamPickerTypes = bosses.map((_, index) => teamPickerTypes[index] ?? 'character').slice(0, 3);
    teamBuilderEl.innerHTML = `
      <div class="stygian-team-heading">
        <div>
          <p class="stygian-section-label">Composizioni</p>
          <h3>Squadre consigliate</h3>
        </div>
        <p>Combina personaggi, elementi e armi. Indica la costellazione minima quando necessaria. Le scelte non vengono salvate.</p>
      </div>
      <details class="stygian-team-instructions">
        <summary>Istruzioni</summary>
        <ul>
          <li>Scegli una categoria e clicca un'icona per aggiungerla al prossimo slot libero.</li>
          <li>Usa Alt + click su un'icona per aggiungere una nota, mostrata nell'angolo dello slot.</li>
          <li>Nel campo di ricerca, premi Shift + Invio per aggiungere l'icona come alternativa dell'ultimo slot; ogni slot supporta fino a quattro opzioni.</li>
          <li>Clicca un'icona gia inserita per rimuoverla dalla squadra.</li>
          <li>Usa il pulsante "Scarica immagine" per includere le squadre nell'esportazione.</li>
        </ul>
      </details>
      <div class="stygian-team-grid">
        ${bosses.slice(0, 3).map((boss, teamIndex) => {
          const bossName = boss.display_name || enemyLookup[boss.enemy_id]?.name || `Boss ${teamIndex + 1}`;
          const selected = teamSelections[teamIndex] ?? [];
          const recommendationCount = confirmedTeams[teamIndex]?.length ?? 0;
          return `<article class="stygian-team-card">
            <h4>${escapeHtml(bossName)}</h4>
            <div class="stygian-team-slots" aria-label="Squadra contro ${escapeHtml(bossName)}">
              ${Array.from({ length: 4 }, (_, slotIndex) => {
                const selection = selected[slotIndex];
                const label = selection ? selectionLabel(selection) : '';
                return `<div class="stygian-team-slot-wrap">${selection ? `<button class="stygian-team-slot is-filled is-${escapeHtml(selection.type)}" data-remove-team="${teamIndex}" data-slot="${slotIndex}" aria-label="Rimuovi ${escapeHtml(label)}">
                  ${selection.type === 'multi' ? `<span class="stygian-multi-content is-${selection.items.length}-way">${selection.items.length === 3 ? '<i class="stygian-y-arm is-left"></i><i class="stygian-y-arm is-right"></i>' : ''}${selection.items.map((item) => `<span class="stygian-multi-item"><img src="${escapeHtml(selectionImage(item))}" alt="${escapeHtml(selectionLabel(item))}" /></span>`).join('')}</span>` : `<img src="${escapeHtml(selectionImage(selection))}" alt="${escapeHtml(label)}" />`}
                  ${selection.note ? `<em class="stygian-slot-note">${escapeHtml(selection.note)}</em>` : ''}
                </button>` : `<button class="stygian-team-slot" data-team="${teamIndex}" data-slot="${slotIndex}" aria-label="Aggiungi personaggio allo slot ${slotIndex + 1}"><span>+</span></button>`}</div>`;
              }).join('')}
            </div>
            <div class="stygian-picker-tabs" role="group" aria-label="Tipo suggerimento">
              <button class="${teamPickerTypes[teamIndex] === 'character' ? 'is-active' : ''}" data-picker="character" data-team="${teamIndex}">Personaggi</button>
              <button class="${teamPickerTypes[teamIndex] === 'element' ? 'is-active' : ''}" data-picker="element" data-team="${teamIndex}">Elementi</button>
              <button class="${teamPickerTypes[teamIndex] === 'weapon' ? 'is-active' : ''}" data-picker="weapon" data-team="${teamIndex}">Armi</button>
            </div>
            <label class="stygian-character-search">Cerca qualsiasi icona
              <input type="search" data-search="${teamIndex}" placeholder="Personaggio, elemento o arma" autocomplete="off" />
            </label>
            <div class="stygian-character-list" data-results="${teamIndex}"></div>
            <button class="stygian-confirm-team" data-confirm-team="${teamIndex}" ${!selected.length || recommendationCount >= 3 ? 'disabled' : ''}>
              Conferma squadra (${recommendationCount}/3)
            </button>
          </article>`;
        }).join('')}
      </div>
      <dialog id="stygian-note-dialog" class="stygian-note-dialog">
        <form method="dialog">
          <label for="stygian-note-input">Nota nello slot</label>
          <input id="stygian-note-input" type="text" maxlength="18" placeholder="Es. C2+" autocomplete="off" />
          <div class="stygian-note-actions">
            <button type="button" class="secondary outline" value="cancel">Annulla</button>
            <button type="submit" value="confirm">Aggiungi</button>
          </div>
        </form>
      </dialog>`;

    teamBuilderEl.querySelectorAll('button[data-remove-team]').forEach((button) => {
      button.addEventListener('click', () => {
        const teamIndex = Number(button.dataset.removeTeam);
        const slotIndex = Number(button.dataset.slot);
        teamSelections[teamIndex].splice(slotIndex, 1);
        renderTeamBuilder(difficulty);
      });
    });

    teamBuilderEl.querySelectorAll('button[data-picker]').forEach((button) => {
      button.addEventListener('click', () => {
        teamPickerTypes[Number(button.dataset.team)] = button.dataset.picker;
        renderTeamBuilder(difficulty);
      });
    });

    teamBuilderEl.querySelectorAll('button[data-confirm-team]').forEach((button) => {
      button.addEventListener('click', () => {
        const teamIndex = Number(button.dataset.confirmTeam);
        if (!teamSelections[teamIndex].length || confirmedTeams[teamIndex].length >= 3) return;
        confirmedTeams[teamIndex].push(JSON.parse(JSON.stringify(teamSelections[teamIndex])));
        teamSelections[teamIndex] = [];
        renderDifficulty(stygianData[currentPeriodIdx], currentDifficultyKey);
      });
    });

    const noteDialog = teamBuilderEl.querySelector('#stygian-note-dialog');
    const noteInput = teamBuilderEl.querySelector('#stygian-note-input');
    const noteForm = noteDialog?.querySelector('form');
    let pendingNote;

    noteDialog?.querySelector('button[value="cancel"]')?.addEventListener('click', () => noteDialog.close());
    noteForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!pendingNote) return;
      const { teamIndex, option, asMulti } = pendingNote;
      const note = noteInput.value.trim();
      noteDialog.close();
      pendingNote = null;
      addSelection(teamIndex, option, asMulti, note);
    });

    teamBuilderEl.querySelectorAll('input[data-search]').forEach((input) => {
      const renderResults = () => {
        const teamIndex = Number(input.dataset.search);
        renderPickerResults(teamIndex, input.value);
      };
      input.addEventListener('input', renderResults);
      input.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        const teamIndex = Number(input.dataset.search);
        const option = getPickerOptions(teamIndex, input.value)[0];
        if (!option) return;
        addSelection(teamIndex, option, event.shiftKey);
      });
      renderResults();
    });

    bosses.slice(0, 3).forEach((_, teamIndex) => renderPickerResults(teamIndex));

    function renderPickerResults(teamIndex, searchTerm = '') {
      const resultsEl = teamBuilderEl.querySelector(`[data-results="${teamIndex}"]`);
      const options = getPickerOptions(teamIndex, searchTerm);
      resultsEl.innerHTML = options.map((option) => `<button class="stygian-character-choice is-${escapeHtml(option.type)}" data-team="${teamIndex}" data-type="${escapeHtml(option.type)}" data-id="${escapeHtml(option.id)}" data-label="${escapeHtml(option.label)}" title="Aggiungi ${escapeHtml(option.label)}">
        <img src="${escapeHtml(option.type === 'character' ? `assets/img/characters/UI_AvatarIcon_${option.id}.webp` : option.type === 'element' ? `assets/img/elements/${option.id}.webp` : `assets/img/weapons/${option.id}.png`)}" alt="${escapeHtml(option.label)}" /><span>${escapeHtml(option.label)}</span>
      </button>`).join('') || '<span class="stygian-no-results">Nessuna scelta disponibile</span>';
      resultsEl.querySelectorAll('button[data-type]').forEach((button) => {
        button.addEventListener('click', (event) => {
          const option = { type: button.dataset.type, id: button.dataset.id, label: button.dataset.label };
          const teamIndex = Number(button.dataset.team);
          if (event.altKey) {
            openNoteDialog(teamIndex, option, event.shiftKey);
            return;
          }
          addSelection(teamIndex, option, event.shiftKey);
        });
      });
    }

    function openNoteDialog(teamIndex, option, asMulti) {
      pendingNote = { teamIndex, option, asMulti };
      noteInput.value = '';
      noteDialog.showModal();
      noteInput.focus();
    }

    function getPickerOptions(teamIndex, searchTerm = '') {
      const type = teamPickerTypes[teamIndex];
      const selectedItems = teamSelections[teamIndex].flatMap(selectionItems);
      const query = searchTerm.trim().toLocaleLowerCase('it-IT');
      const matches = (label) => label.toLocaleLowerCase('it-IT').includes(query);
      const characterOptions = characters
        .filter((id) => !selectedItems.some((item) => item.type === 'character' && item.id === id) && matches(characterLabel(id)))
        .slice(0, query ? 8 : 12)
        .map((id) => ({ type: 'character', id, label: characterLabel(id) }));
      const elementOptions = elements
        .filter((id) => !selectedItems.some((item) => item.type === 'element' && item.id === id) && matches(id))
        .map((id) => ({ type: 'element', id, label: id }));
      const weaponOptions = weapons
        .filter((weapon) => !selectedItems.some((item) => item.type === 'weapon' && item.id === weapon.id) && matches(weapon.label))
        .map((weapon) => ({ type: 'weapon', ...weapon }));

      if (query) return [...characterOptions, ...elementOptions, ...weaponOptions];
      if (type === 'character') {
        return characterOptions;
      }
      if (type === 'element') {
        return elementOptions;
      }
      return weaponOptions;
    }

    function addSelection(teamIndex, option, asMulti, note = '') {
      const selection = { ...option, constellation: 0, note };
      const team = teamSelections[teamIndex];
      const lastSlot = team[team.length - 1];
      if (asMulti && lastSlot) {
        if (lastSlot.type === 'multi' && lastSlot.items.length < 4) {
          lastSlot.items.push(selection);
        } else if (lastSlot.type !== 'multi') {
          team[team.length - 1] = { type: 'multi', items: [lastSlot, selection] };
        } else {
          return;
        }
      } else if (team.length < 4) {
        team.push(selection);
      } else {
        return;
      }
      renderTeamBuilder(difficulty);
    }
  }

  function renderDifficulty(data, difficultyKey) {
    const difficulties = data?.difficulties ?? {};
    const sortedKeys = Object.keys(difficulties).sort((a, b) => Number(a) - Number(b));
    const resolvedKey = difficulties[difficultyKey] ? difficultyKey : sortedKeys[0];
    const difficulty = difficulties[resolvedKey] ?? { bosses: [] };
    currentDifficultyKey = resolvedKey;

    renderDifficultySwitch(data);
    bossesEl.innerHTML = `<div class="stygian-boss-grid">${(difficulty.bosses ?? []).map((boss, index) => renderBossCard(boss, difficulty, index)).join('')}</div>`;
    bossesEl.querySelectorAll('button[data-boss-index]').forEach((button) => {
      button.addEventListener('click', () => {
        const bossIndex = Number(button.dataset.bossIndex);
        const recommendationIndex = Number(button.dataset.recommendationIndex);
        confirmedTeams[bossIndex].splice(recommendationIndex, 1);
        renderDifficulty(data, currentDifficultyKey);
      });
    });
    renderTeamBuilder(difficulty);
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
    const teamBuilder = document.getElementById('stygian-team-builder');
    const target = document.querySelector('main.container');

    if (!btn || !stars || !toggle || !difficultySwitch || !teamBuilder || !target) return;

    btn.disabled = true;
    btn.textContent = 'Generazione...';
    stars.style.display = 'none';
    toggle.style.display = 'none';
    difficultySwitch.style.display = 'none';
    teamBuilder.style.display = 'none';
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
      teamBuilder.style.display = '';
      target.style.padding = '';
      btn.disabled = false;
      btn.textContent = '\u2193 Scarica immagine';
    }
  });
}());