// Grafico della pagina danica-dps.html (SVG inline, nessuna libreria).
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const fmt = (n) => Math.round(n).toLocaleString('it-IT');
  function el(name, attrs, parent) {
    const node = document.createElementNS(NS, name);
    Object.entries(attrs || {}).forEach(([k, v]) => node.setAttribute(k, v));
    if (parent) parent.appendChild(node);
    return node;
  }
  const tip = document.createElement('div');
  tip.className = 'viz-tip';
  tip.hidden = true;
  document.body.appendChild(tip);
  function showTip(evt, html) {
    tip.innerHTML = html;
    tip.hidden = false;
    const pad = 14;
    const r = tip.getBoundingClientRect();
    let x = evt.clientX + pad;
    let y = evt.clientY + pad;
    if (x + r.width > window.innerWidth - 8) x = evt.clientX - r.width - pad;
    if (y + r.height > window.innerHeight - 8) y = evt.clientY - r.height - pad;
    tip.style.left = `${Math.max(8, x)}px`;
    tip.style.top = `${Math.max(8, y)}px`;
  }
  function hideTip() { tip.hidden = true; }

  // 3) Barre impilate: danno di team per rotazione (calcoli Danica C0 DPS)
  const CALC = [
    { name: 'Danica · Yae · Odette · Qiqi', total: 2918528, dps: 162140, parts: [
      { who: 'Danica C0', v: 907915, c: 'var(--char-danica)' },
      { who: 'Yae Miko C1', v: 1160023, c: 'var(--char-yae)' },
      { who: 'Odette C0', v: 795174, c: 'var(--char-odette)' },
      { who: 'Qiqi C2', v: 55415, c: 'var(--char-qiqi)' },
    ] },
    { name: 'Danica · Yae · Tsaritsa · Qiqi', total: 3154111, dps: 175228, parts: [
      { who: 'Danica C0', v: 991787, c: 'var(--char-danica)' },
      { who: 'Yae Miko C1', v: 1252207, c: 'var(--char-yae)' },
      { who: 'Tsaritsa C0', v: 850749, c: 'var(--char-tsaritsa)' },
      { who: 'Qiqi C2', v: 59367, c: 'var(--char-qiqi)' },
    ] },
  ];

  function stackedChart(root) {
    const box = document.createElement('div');
    box.className = 'viz-legend';
    [['Danica C0', '--char-danica'], ['Yae Miko C1', '--char-yae'], ['Odette C0', '--char-odette'], ['Tsaritsa C0', '--char-tsaritsa'], ['Qiqi C2', '--char-qiqi']]
      .forEach(([n, v]) => { const i = document.createElement('span'); i.innerHTML = `<i style="background:var(${v})"></i>${n}`; box.appendChild(i); });
    root.appendChild(box);
    const holder = document.createElement('div');
    root.appendChild(holder);
    const draw = () => {
      holder.textContent = '';
      const W = Math.max(300, Math.round(holder.clientWidth || root.clientWidth));
      const narrow = W < 560;
      const rowH = 34, gap = 34, top = 22, left = 0, right = narrow ? 70 : 120;
      const H = top + CALC.length * (rowH + gap) - gap + 8;
      const max = Math.max(...CALC.map((t) => t.total));
      const sx = (v) => (v / max) * (W - left - right);
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Danno per rotazione del team e ripartizione per personaggio' }, holder);
      CALC.forEach((team, i) => {
        const y = top + i * (rowH + gap);
        const name = el('text', { x: left, y: y - 7, class: 'viz-axis' }, svg);
        name.textContent = team.name;
        let x = left;
        team.parts.forEach((p) => {
          const w = sx(p.v);
          el('rect', { x, y, width: Math.max(w - 2, 1), height: rowH, rx: 4, fill: p.c }, svg);
          const pct = (p.v / team.total) * 100;
          if (w > 90) {
            const t = el('text', { x: x + 8, y: y + rowH / 2 + 4, class: 'viz-inbar' }, svg);
            t.textContent = `${narrow ? p.who.split(' ')[0] : p.who} ${pct.toFixed(0)}%`;
          }
          const hit = el('rect', { x, y: y - 4, width: Math.max(w, 6), height: rowH + 8, fill: 'transparent', class: 'viz-hit' }, svg);
          const html = `<strong>${p.who}</strong><br>${team.name}<br>Danno: <b>${fmt(p.v)}</b> (${pct.toFixed(1).replace('.', ',')}%)`;
          hit.addEventListener('mousemove', (e) => showTip(e, html));
          hit.addEventListener('mouseleave', hideTip);
          x += w;
        });
        const tot = el('text', { x: x + 8, y: y + rowH / 2 + 4, class: 'viz-value' }, svg);
        tot.textContent = narrow ? `${(team.total / 1e6).toFixed(2).replace('.', ',')}M` : fmt(team.total);
      });
    };
    draw();
    let raf = 0;
    window.addEventListener('resize', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); });
  }

  const team = document.getElementById('viz-team');
  if (team) stackedChart(team);
})();
