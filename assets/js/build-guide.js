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
  const PROFILE_LABEL = { atk: 'ATT %', hp: 'PS %', def: 'DIF %', em: 'Maestria' };
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
        <label><span>Tasso di CRIT</span><input type="text" name="cr" placeholder="0" inputmode="decimal" autocomplete="off" /></label>
        <label><span>DAN da CRIT</span><input type="text" name="cd" placeholder="0" inputmode="decimal" autocomplete="off" /></label>
        <label class="bg-extra"><span class="bg-extra-name">ATT %</span><input type="text" name="x" placeholder="0" inputmode="decimal" autocomplete="off" /></label>
        <div class="bg-slot-cv"><b>0,0</b><small>CV</small><i class="bg-meter" aria-hidden="true"><i></i></i></div>
      </fieldset>`).join('');

    const slots = Array.from(form.querySelectorAll('.bg-slot'));
    const num = (input) => Math.max(0, parseFloat(String(input.value).replace(',', '.')) || 0);

    function setProfile(p) {
      profile = p;
      document.querySelectorAll('[data-profile]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.profile === p)));
      form.classList.toggle('has-extra', p !== 'none');
      form.querySelectorAll('.bg-extra-name').forEach((el) => { el.textContent = PROFILE_LABEL[p] || ''; });
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

      out.className = `bg-build-out ${cls}`;
      out.innerHTML = `
        <div class="bg-out-main">
          <b>${fmt(total)}</b>
          <span>CV della build<strong>${filled ? label : 'scrivi i CRIT dei pezzi'}</strong></span>
          <i class="bg-meter bg-meter-big" aria-hidden="true"><i style="width:${Math.min(total / 250, 1) * 100}%"></i>${[120, 150, 180, 210].map((t) => `<em style="left:${t / 2.5}%"></em>`).join('')}</i>
        </div>
        <ul class="bg-out-list">
          <li><span>Con la Corona</span><strong>${fmt(withCorona)} CV</strong><small>come lo conta Akasha</small></li>
          <li><span>CRIT dai manufatti</span><strong>+${fmt(crTot)}% / +${fmt(cdTot)}%</strong><small>Tasso / DAN, Corona compresa</small></li>
          ${profile === 'none'
            ? `<li><span>Roll CRIT</span><strong>&asymp; ${fmt(total / 7.77)}</strong><small>su 45 roll totali</small></li>`
            : `<li><span>Roll Value</span><strong>${fmt(totalRv, 0)}%</strong><small>&asymp; ${fmt(totalRv / 100)} roll utili su 45</small></li>`}
          <li class="${weakest ? 'is-hint' : ''}"><span>Da cambiare per primo</span><strong>${weakName || '&ndash;'}</strong><small>${weakest ? `${fmt(weakest.cv)} CV${profile === 'none' ? '' : ` · ${fmt(weakest.rv, 0)}% RV`}` : 'compila tutti e 5 i pezzi'}</small></li>
        </ul>`;
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
