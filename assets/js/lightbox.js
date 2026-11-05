// Lightbox per le immagini delle guide: click su una foto => modale con titolo,
// frecce, contatore e striscia di miniature. Tastiera: Esc, freccia sinistra/destra.
(() => {
  const imgs = Array.from(document.querySelectorAll('.evidence-figure img'));
  if (!imgs.length) return;

  const items = imgs.map((img) => {
    const fig = img.closest('figure');
    const cap = fig && fig.querySelector('figcaption');
    const link = img.closest('a[href]');
    const title = (cap ? cap.textContent : '').replace(/\s+/g, ' ').trim();
    return {
      img,
      src: link ? link.getAttribute('href') : img.getAttribute('src'),
      thumb: img.getAttribute('src'),
      title: title || img.alt,
      alt: img.alt,
    };
  });

  const box = document.createElement('div');
  box.className = 'lb';
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-labelledby', 'lb-title');
  box.innerHTML = `
    <div class="lb-backdrop" data-close></div>
    <div class="lb-panel">
      <header class="lb-head">
        <div class="lb-meta">
          <h2 id="lb-title" class="lb-title"></h2>
          <p class="lb-alt"></p>
        </div>
        <a class="lb-full" target="_blank" rel="noopener">Immagine originale</a>
        <button type="button" class="lb-close" data-close aria-label="Chiudi">&times;</button>
      </header>
      <div class="lb-stage">
        <button type="button" class="lb-nav lb-prev" aria-label="Immagine precedente">&#8249;</button>
        <img class="lb-img" alt="" />
        <button type="button" class="lb-nav lb-next" aria-label="Immagine successiva">&#8250;</button>
      </div>
      <footer class="lb-foot">
        <p class="lb-count" aria-live="polite"></p>
        <div class="lb-thumbs"></div>
      </footer>
    </div>`;
  document.body.appendChild(box);

  const $ = (s) => box.querySelector(s);
  const big = $('.lb-img');
  const thumbs = $('.lb-thumbs');
  const panel = $('.lb-panel');
  let index = 0;
  let opener = null;

  const thumbBtns = items.map((it, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lb-thumb';
    b.setAttribute('aria-label', `Apri immagine ${i + 1}: ${it.title}`);
    b.innerHTML = `<img src="${it.thumb}" alt="" loading="lazy" />`;
    b.addEventListener('click', () => show(i));
    thumbs.appendChild(b);
    return b;
  });

  const multi = items.length > 1;
  $('.lb-prev').hidden = !multi;
  $('.lb-next').hidden = !multi;
  $('.lb-foot').hidden = !multi;

  function show(i) {
    index = (i + items.length) % items.length;
    const it = items[index];
    big.src = it.src;
    big.alt = it.alt;
    $('.lb-title').textContent = it.title;
    const alt = $('.lb-alt');
    alt.textContent = it.alt;
    alt.hidden = !it.alt || it.alt === it.title;
    $('.lb-full').href = it.src;
    $('.lb-count').textContent = `${index + 1} di ${items.length}`;
    thumbBtns.forEach((b, j) => b.classList.toggle('is-active', j === index));
    thumbBtns[index].scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }

  function open(i) {
    opener = document.activeElement;
    box.hidden = false;
    document.documentElement.classList.add('lb-lock');
    show(i);
    $('.lb-close').focus();
  }

  function close() {
    box.hidden = true;
    document.documentElement.classList.remove('lb-lock');
    if (opener && opener.focus) opener.focus();
  }

  items.forEach((it, i) => {
    const target = it.img.closest('a[href]') || it.img;
    it.img.classList.add('lb-trigger');
    if (target === it.img) {
      it.img.tabIndex = 0;
      it.img.setAttribute('role', 'button');
      it.img.setAttribute('aria-label', `Ingrandisci: ${it.title}`);
    }
    target.addEventListener('click', (e) => { e.preventDefault(); open(i); });
    target.addEventListener('keydown', (e) => {
      if (target === it.img && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(i); }
    });
  });

  $('.lb-prev').addEventListener('click', () => show(index - 1));
  $('.lb-next').addEventListener('click', () => show(index + 1));
  box.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', close));
  // click sullo sfondo del palco (fuori dall'immagine) chiude
  $('.lb-stage').addEventListener('click', (e) => { if (e.target.classList.contains('lb-stage')) close(); });

  document.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft' && multi) show(index - 1);
    else if (e.key === 'ArrowRight' && multi) show(index + 1);
    else if (e.key === 'Tab') {
      const f = Array.from(panel.querySelectorAll('a[href], button:not([hidden])')).filter((el) => el.offsetParent !== null);
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // swipe su mobile
  let x0 = null;
  big.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  big.addEventListener('touchend', (e) => {
    if (x0 === null || !multi) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
    x0 = null;
  });
})();
