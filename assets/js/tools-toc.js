// tools.html: indice laterale. Nasconde le voci dei risultati che ora non ci sono ed evidenzia la sezione in vista.
(function () {
  const nav = document.querySelector('.tl-toc');
  if (!nav) return;
  const links = Array.from(nav.querySelectorAll('a[href^="#"]'));
  const target = (a) => document.getElementById(a.hash.slice(1));
  const narrow = () => window.matchMedia('(max-width: 1100px)').matches;

  function spy() {
    const line = (narrow() ? nav.offsetHeight : 0) + 90;
    let cur = null;
    links.forEach((a) => {
      if (a.parentElement.hidden) return;
      const t = target(a);
      if (t && t.getBoundingClientRect().top <= line) cur = a;
    });
    if (!cur) cur = links.find((a) => !a.parentElement.hidden) || null;
    links.forEach((a) => {
      const on = a === cur;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
    // in orizzontale la voce attiva resta visibile nella striscia
    if (cur && narrow()) {
      const list = nav.querySelector('ol');
      const l = cur.offsetLeft; const r = l + cur.offsetWidth;
      if (l < list.scrollLeft || r > list.scrollLeft + list.clientWidth) list.scrollLeft = l - 16;
    }
  }

  function refresh() {
    links.forEach((a) => {
      const t = target(a);
      a.parentElement.hidden = !t || t.closest('[hidden]') !== null;
    });
    // il titolo "Risultati" solo se c'e almeno un risultato
    const sep = nav.querySelector('.tl-toc-sep');
    if (sep) sep.hidden = !links.slice(5).some((a) => !a.parentElement.hidden);
    spy();
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; spy(); });
  }, { passive: true });
  window.addEventListener('resize', spy);
  const out = document.getElementById('quick-out');
  const form = document.getElementById('quick-calc');
  if (out) new MutationObserver(refresh).observe(out, { childList: true });
  if (form) new MutationObserver(refresh).observe(form, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  refresh();
})();
