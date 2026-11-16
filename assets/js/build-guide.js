// build-guide.html: calcolatore della build (CV e Roll Value dei 5 manufatti)
// e righe singole che scorrono se il testo non ci sta.
(function () {
  const fmt = (n, d = 1) => n.toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d });

  // Righe singole: se il testo non ci sta, scorre invece di andare a capo (cosi le colonne restano allineate).
  const FIT_SEL = '.bg-page .section-head h2, .bg-page .section-head > span, .bg-pair figcaption, .bg-compare figcaption';
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
      el.classList.toggle('is-scrolling', over > 1);
      el.style.setProperty('--shift', `${-(over + 14)}px`);
      el.style.setProperty('--dur', `${Math.max(4, (over + 14) / 18)}s`);
    });
  }

  // ---- Calcolatore della build ----
  // Roll massimi 5★ (KeqingMains)
  const MAX = { cr: 3.89, cd: 7.77, atk: 5.83, hp: 5.83, def: 7.29, em: 23.31 };
  // Icone delle statistiche (lunaris.moe) come maschera: prendono il colore del testo.
  // Indirizzo completo perche' le url() nelle variabili CSS si risolvono rispetto al foglio di stile.
  const STAT_BASE = new URL('assets/img/calc/stats/', document.baseURI).href;
  const sIcon = (n) => `<i class="bg-ico bg-sico" style="--src:url('${STAT_BASE}${n}.webp')" aria-hidden="true"></i>`;
  const PROFILE_ICON = { atk: 'atk', hp: 'hp', def: 'def', em: 'em' };
  const PROFILE_LABEL = { atk: 'ATT%', hp: 'PS%', def: 'DIF%', em: 'Maestria' };
  const SLOTS = [
    { name: 'Fiore', icon: 'flower', main: 'PS 4.780 (fissa)' },
    { name: 'Piuma', icon: 'plume', main: 'ATT 311 (fissa)' },
    { name: 'Sabbie', icon: 'sands', main: 'ATT%, PS%, Maestria&hellip;' },
    { name: 'Calice', icon: 'goblet', main: 'Bonus DAN, ATT%&hellip;' },
    { name: 'Corona', icon: 'circlet', main: null },
  ];
  // Build reali della vetrina (Enka.network, 16/11/2026): [Tasso, DAN, statistica del profilo] per pezzo
  const PRESETS = {
    mavuika: { profile: 'atk', corona: 'cd', pieces: [[13.6, 21.8, 4.7], [3.9, 20.2, 8.7], [2.7, 34.2, 0], [6.2, 27.2, 0], [13.6, 0, 4.1]] },
    nefer: { profile: 'em', corona: 'cd', pieces: [[10.1, 28, 0], [6.6, 0, 84], [6.2, 26.4, 0], [10.5, 21, 0], [10.1, 0, 42]] },
    neuvillette: { profile: 'hp', corona: 'cd', pieces: [[3.9, 34.2, 0], [0, 30.3, 4.1], [3.5, 26.4, 0], [10.1, 12.4, 9.9], [3.9, 0, 20.4]] },
    vuoto: { profile: 'none', corona: 'cr', pieces: [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]] },
  };
  const PIECE_TIERS = [[40, 't5'], [35, 't4'], [25, 't3'], [15, 't2'], [0, 't1']];
  const BUILD_TIERS = [
    [210, 'end game', 't5'], [180, 'ottima', 't4'], [150, 'buona', 't3'], [120, 'discreta', 't2'], [0, 'da migliorare', 't1'],
  ];

  const form = document.getElementById('build-calc');
  const out = document.getElementById('build-out');
  if (form && out) {
    let profile = 'none';
    let corona = 'cr';

    form.innerHTML = SLOTS.map((s, i) => `
      <fieldset class="bg-slot" data-i="${i}">
        <legend><img src="assets/img/guides/build/slot-${s.icon}.webp" alt="" width="96" height="96" />${s.name}</legend>
        <div class="bg-slot-main">${s.main ? `<small>${s.main}</small>` : `
          <div class="bg-seg" role="radiogroup" aria-label="Statistica principale della Corona">
            <button type="button" role="radio" data-corona="cr">Tasso</button>
            <button type="button" role="radio" data-corona="cd">DAN</button>
            <button type="button" role="radio" data-corona="altro">Altro</button>
          </div>`}
        </div>
        <label><span>${sIcon('critrate')}Tasso di CRIT</span><input type="text" name="cr" placeholder="0" inputmode="decimal" autocomplete="off" /></label>
        <label><span>${sIcon('critdmg')}DAN da CRIT</span><input type="text" name="cd" placeholder="0" inputmode="decimal" autocomplete="off" /></label>
        <label class="bg-extra"><span class="bg-extra-name">ATT %</span><input type="text" name="x" placeholder="0" inputmode="decimal" autocomplete="off" /></label>
        <div class="bg-slot-cv"><b>0,0</b><small>CV</small><i class="bg-meter" aria-hidden="true"><i></i></i></div>
      </fieldset>`).join('');

    const slots = Array.from(form.querySelectorAll('.bg-slot'));
    const num = (input) => Math.max(0, parseFloat(String(input.value).replace(',', '.')) || 0);

    function setProfile(p) {
      profile = p;
      document.querySelectorAll('[data-profile]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.profile === p)));
      form.classList.toggle('has-extra', p !== 'none');
      form.querySelectorAll('.bg-extra-name').forEach((el) => { el.innerHTML = PROFILE_LABEL[p] ? `${sIcon(PROFILE_ICON[p])}${PROFILE_LABEL[p]}` : ''; });
    }
    function setCorona(c) {
      corona = c;
      form.querySelectorAll('[data-corona]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.corona === c)));
      // Una secondaria non puo essere uguale alla principale
      ['cr', 'cd'].forEach((k) => {
        const input = slots[4].querySelector(`input[name="${k}"]`);
        const blocked = c === k;
        input.disabled = blocked;
        if (blocked) input.value = '';
        input.closest('label').classList.toggle('is-off', blocked);
      });
    }

    function update() {
      const rows = slots.map((el) => {
        const cr = num(el.querySelector('[name="cr"]'));
        const cd = num(el.querySelector('[name="cd"]'));
        const x = profile === 'none' ? 0 : num(el.querySelector('[name="x"]'));
        const cv = 2 * cr + cd;
        const rv = (cr / MAX.cr + cd / MAX.cd + (profile === 'none' ? 0 : x / MAX[profile])) * 100;
        return { el, cr, cd, cv, rv };
      });
      const total = rows.reduce((t, r) => t + r.cv, 0);
      const totalRv = rows.reduce((t, r) => t + r.rv, 0);
      const filled = rows.filter((r) => r.rv > 0).length;
      const score = (r) => (profile === 'none' ? r.cv : r.rv);
      const weakest = filled === 5 ? rows.reduce((a, b) => (score(b) < score(a) ? b : a)) : null;

      rows.forEach((r) => {
        const cls = PIECE_TIERS.find(([min]) => r.cv >= min)[1];
        r.el.className = `bg-slot ${cls}${r === weakest ? ' is-weakest' : ''}`;
        r.el.querySelector('.bg-slot-cv b').textContent = fmt(r.cv);
        r.el.querySelector('.bg-slot-cv small').textContent = profile === 'none' ? 'CV' : `CV · ${fmt(r.rv, 0)}% RV`;
        r.el.querySelector('.bg-meter > i').style.width = `${Math.min(r.cv / 54.4, 1) * 100}%`;
      });

      const [, label, cls] = BUILD_TIERS.find(([min]) => total >= min);
      const crTot = rows.reduce((t, r) => t + r.cr, 0) + (corona === 'cr' ? 31.1 : 0);
      const cdTot = rows.reduce((t, r) => t + r.cd, 0) + (corona === 'cd' ? 62.2 : 0);
      const withCorona = total + (corona === 'altro' ? 0 : 62.2);
      const weakName = weakest ? SLOTS[rows.indexOf(weakest)].name : null;

      const crSubs = rows.reduce((t, r) => t + r.cr, 0);
      const cdSubs = rows.reduce((t, r) => t + r.cd, 0);
      const weakSlot = weakest ? SLOTS[rows.indexOf(weakest)] : null;
      const rvTiers = [[30, 'top', 't5'], [25, 'ottimo', 't4'], [20, 'buono', 't3'], [15, 'discreto', 't2'], [0, 'basso', 't1']];
      const rolls = profile === 'none' ? total / 7.77 : totalRv / 100;
      const [, rvLabel, rvCls] = rvTiers.find(([min]) => rolls >= min);
      out.className = `bg-quick-out ${filled ? cls : 't1'}`;
      out.innerHTML = `
        <div class="bg-kpis">
          <div class="bg-kpi ${filled ? cls : 't1'}">
            <span>CV della build</span>
            <b>${fmt(total)}</b>
            <strong>${filled ? label : 'scrivi i CRIT dei pezzi'}</strong>
            <i class="bg-meter" aria-hidden="true"><i style="width:${Math.min(total / 250, 1) * 100}%"></i>${[120, 150, 180, 210].map((t) => `<em style="left:${t / 2.5}%"></em>`).join('')}</i>
            <small>${sIcon('critrate')}+${fmt(crSubs)}% &middot; ${sIcon('critdmg')}+${fmt(cdSubs)}% dalle secondarie</small>
          </div>
          <div class="bg-kpi ${filled ? cls : 't1'}">
            <span>CV con la Corona</span>
            <b>${fmt(withCorona)}</b>
            <strong>come lo conta Akasha</strong>
            <i class="bg-meter" aria-hidden="true"><i style="width:${Math.min(withCorona / 312, 1) * 100}%"></i></i>
            <small>${corona === 'altro' ? 'Corona senza CRIT: non cambia' : `+62,2 della Corona ${corona === 'cr' ? 'Tasso' : 'DAN'}`}</small>
          </div>
          <div class="bg-kpi ${filled ? rvCls : 't1'}">
            <span>${profile === 'none' ? 'Roll CRIT' : 'Roll Value'}</span>
            <b>${profile === 'none' ? `&asymp; ${fmt(rolls)}` : `${fmt(totalRv, 0)}%`}</b>
            <strong>${rvLabel} &middot; ${fmt(rolls)} roll su 45</strong>
            <i class="bg-meter" aria-hidden="true"><i style="width:${Math.min(rolls / 45, 1) * 100}%"></i></i>
            <small>${profile === 'none' ? 'solo CRIT: scegli una statistica sopra per il Roll Value' : `CRIT + ${PROFILE_LABEL[profile]}`}</small>
          </div>
          <div class="bg-kpi t3">
            <span>CRIT dai manufatti</span>
            <b class="bg-kpi-pair">${sIcon('critrate')}${fmt(crTot)}% <i>/</i> ${sIcon('critdmg')}${fmt(cdTot)}%</b>
            <strong>Tasso / DAN</strong>
            <i class="bg-meter" aria-hidden="true"><i style="width:${Math.min(cdTot / Math.max(crTot, 1) / 4, 1) * 100}%"></i></i>
            <small>Corona compresa, senza base, arma e set</small>
          </div>
        </div>
        ${weakSlot ? `<div class="bg-corona-rec is-change"><img src="assets/img/guides/build/slot-${weakSlot.icon}.webp" alt="" width="96" height="96" /><span><small>Da cambiare per primo</small><strong>${weakSlot.name}</strong><em>&Egrave; il pezzo pi&ugrave; debole: ${fmt(weakest.cv)} CV${profile === 'none' ? '' : ` &middot; ${fmt(weakest.rv, 0)}% di Roll Value`}.</em></span></div>` : `<p class="bg-out-foot">Compila tutti e 5 i pezzi per sapere quale cambiare per primo.</p>`}`;
    }

    function load(name) {
      const p = PRESETS[name];
      setProfile(p.profile);
      slots.forEach((el, i) => {
        const [cr, cd, x] = p.pieces[i];
        el.querySelector('[name="cr"]').value = cr || '';
        el.querySelector('[name="cd"]').value = cd || '';
        el.querySelector('[name="x"]').value = x || '';
      });
      setCorona(p.corona);
      update();
    }

    document.querySelectorAll('[data-sicon]').forEach((el) => el.insertAdjacentHTML('afterbegin', sIcon(el.dataset.sicon)));
    document.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => load(b.dataset.preset)));
    document.querySelectorAll('[data-profile]').forEach((b) => b.addEventListener('click', () => { setProfile(b.dataset.profile); update(); }));
    form.querySelectorAll('[data-corona]').forEach((b) => b.addEventListener('click', () => { setCorona(b.dataset.corona); update(); }));
    form.addEventListener('input', update);
    form.addEventListener('submit', (e) => e.preventDefault());
    load('mavuika');
  }

  fit();
  let timer;
  window.addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(() => fit(), 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fit());
  document.querySelectorAll('details').forEach((d) => d.addEventListener('toggle', () => fit(d)));
})();
