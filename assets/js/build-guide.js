// build-guide.html e tools.html: righe singole che scorrono se il testo non ci sta.
(function () {
  const fmt = (n, d = 1) => n.toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d });

  // Righe singole: se il testo non ci sta, scorre invece di andare a capo (cosi le colonne restano allineate).
  const FIT_SEL = '.bg-page .section-head h2, .bg-page .section-head > span, .bg-pair figcaption, .bg-compare figcaption, .bg-relic-name, .bg-relic-txt small, .bg-relic li span';
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

  window.bgFit = fit; // il calcolatore lo richiama quando ridisegna le card dei pezzi
  fit();
  let timer;
  window.addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(() => fit(), 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fit());
  document.querySelectorAll('details').forEach((d) => d.addEventListener('toggle', () => fit(d)));
})();
