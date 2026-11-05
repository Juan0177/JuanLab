// Tab "Guida attuale" / "Archivio" della pagina current-pg.html.
// L'hash #archivio apre direttamente l'archivio (linkabile).
(function () {
  const tabs = Array.from(document.querySelectorAll('.pg-tab'));
  if (!tabs.length) return;

  function select(tab, updateHash) {
    tabs.forEach((t) => {
      const active = t === tab;
      t.setAttribute('aria-selected', String(active));
      t.tabIndex = active ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !active;
    });
    if (updateHash) {
      const hash = tab.id === 'tab-archivio' ? '#archivio' : ' ';
      history.replaceState(null, '', hash === ' ' ? location.pathname + location.search : hash);
    }
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab, true));
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      select(next, true);
    });
  });

  if (location.hash === '#archivio') select(document.getElementById('tab-archivio'), false);
})();
