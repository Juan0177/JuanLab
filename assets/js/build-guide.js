// build-guide.html: calcolatore del Crit Value e righe singole che scorrono se il testo non ci sta.
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
      const scrolling = over > 1;
      el.classList.toggle('is-scrolling', scrolling);
      el.style.setProperty('--shift', `${-(over + 14)}px`);
      el.style.setProperty('--dur', `${Math.max(4, (over + 14) / 18)}s`);
    });
  }

  // Calcolatore: CV di un artefatto da CRIT Rate e CRIT DMG
  const TIERS = [
    [40, 'top', 't5', 'Pezzo da tenere a vita.'],
    [35, 'ottimo', 't4', 'Difficile trovare di meglio.'],
    [25, 'buono', 't3', 'Va benissimo, cambialo solo con uno migliore.'],
    [15, 'medio', 't2', 'Ok se ha anche ATK%, HP% o EM utili.'],
    [0, 'scarso', 't1', 'Tienilo solo per la main stat o il set.'],
  ];
  const form = document.getElementById('calc');
  if (form) {
    const out = document.getElementById('calc-out');
    const update = () => {
      const cr = Math.max(0, parseFloat(form.elements.cr.value) || 0);
      const cd = Math.max(0, parseFloat(form.elements.cd.value) || 0);
      const cv = 2 * cr + cd;
      const [, label, cls, note] = TIERS.find(([min]) => cv >= min);
      const pct = Math.min(cv / 54.4, 1) * 100;
      out.className = `bg-calc-result ${cls}`;
      out.innerHTML = `<b>${fmt(cv)}</b><span>CV &middot; ${label}</span>`
        + `<i class="bg-meter" aria-hidden="true"><i style="width:${pct}%"></i></i>`
        + `<small>${note} Circa ${fmt(cv / 7.77)} roll crit pieni.</small>`;
    };
    form.addEventListener('input', update);
    form.addEventListener('submit', (e) => e.preventDefault());
    update();
  }

  fit();
  let timer;
  window.addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(() => fit(), 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fit());
  document.querySelectorAll('details').forEach((d) => d.addEventListener('toggle', () => fit(d)));
})();
