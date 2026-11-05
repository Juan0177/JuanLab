// Grafici della pagina anastasya-impressions.html (SVG inline, nessuna libreria).
// Dati: danni Stellar-Conduct (Cryo su Electro) della Tsaritsa letti dai video (vedi la tabella completa nella pagina).
(function () {
  const TEAMS = [
    { key: 'aly', name: 'Alyosha C6 + Danica', color: 'var(--series-4)', burst: [880067, 885145, 885145], leap: [184729, 185845, 185845], arrow: [238716, 238716] },
    { key: 'yae', name: 'Yae Miko C1 + Danica', color: 'var(--series-1)', burst: [751542, 731765, 731765], leap: [226027, 226027, 214726], arrow: [282534, 282534, 282534] },
    { key: 'mitya', name: 'Mitya C0 + Danica', color: 'var(--series-2)', burst: [586574, 652340], leap: [176760, 213009], arrow: [259941, 266261] },
    { key: 'nicole', name: 'Yae Miko C1 + Nicole C2', color: 'var(--series-3)', burst: [577349, 611311, 611311], leap: [179512, 174650, 179512], arrow: [224390, 230454, 230454] },
  ];
  const HITS = [
    { key: 'burst', label: 'Burst (lancia)' },
    { key: 'leap', label: 'Doom 2 (balzo)' },
    { key: 'arrow', label: 'Doom 3 (arco)' },
  ];
  const NS = 'http://www.w3.org/2000/svg';
  const fmt = (n) => Math.round(n).toLocaleString('it-IT');
  const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;

  function el(name, attrs, parent) {
    const node = document.createElementNS(NS, name);
    Object.entries(attrs || {}).forEach(([k, v]) => node.setAttribute(k, v));
    if (parent) parent.appendChild(node);
    return node;
  }

  // Tooltip condiviso
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
    x = Math.max(8, Math.min(x, window.innerWidth - r.width - 8));
    y = Math.max(8, y);
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
  }
  function hideTip() { tip.hidden = true; }

  function legend(container) {
    const box = document.createElement('div');
    box.className = 'viz-legend';
    TEAMS.forEach((t) => {
      const item = document.createElement('span');
      item.innerHTML = `<i style="background:${t.color}"></i>${t.name}`;
      box.appendChild(item);
    });
    container.appendChild(box);
  }

  // 1) Small multiples: media per colpo, barre orizzontali
  function barsChart(root) {
    legend(root);
    const grid = document.createElement('div');
    grid.className = 'viz-multiples';
    root.appendChild(grid);
    const best = Object.fromEntries(HITS.map((h) => [h.key, avg(TEAMS[1][h.key])]));

    HITS.forEach((hit) => {
      const cell = document.createElement('figure');
      cell.className = 'viz-cell';
      cell.innerHTML = `<figcaption>${hit.label}</figcaption>`;
      grid.appendChild(cell);

      const W = 320, rowH = 30, gap = 10, left = 6, right = 92, top = 6;
      const H = top + TEAMS.length * (rowH + gap);
      const max = Math.max(...TEAMS.map((t) => avg(t[hit.key])));
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${hit.label}: media per team` }, cell);
      const scale = (v) => (v / max) * (W - left - right);

      TEAMS.forEach((t, i) => {
        const v = avg(t[hit.key]);
        const y = top + i * (rowH + gap);
        const w = scale(v);
        el('rect', { x: left, y, width: W - left - right, height: rowH, rx: 4, class: 'viz-track' }, svg);
        el('rect', { x: left, y, width: Math.max(w, 4), height: rowH, rx: 4, fill: t.color }, svg);
        const label = el('text', { x: left + w + 8, y: y + rowH / 2 + 4, class: 'viz-value' }, svg);
        label.textContent = fmt(v);
        const delta = (v / best[hit.key] - 1) * 100;
        const hitbox = el('rect', { x: 0, y: y - gap / 2, width: W, height: rowH + gap, fill: 'transparent', class: 'viz-hit' }, svg);
        const note = t.key === 'aly' && hit.key === 'arrow' ? '<br><em>Rotazione 1 non critica (75.028) esclusa</em>' : '';
        const html = `<strong>${t.name}</strong><br>${hit.label}<br>Media: <b>${fmt(v)}</b><br>Rotazioni: ${t[hit.key].map(fmt).join(' · ')}${note}` +
          (i === 1 ? '<br><em>Riferimento</em>' : `<br>${delta > 0 ? '+' : ''}${delta.toFixed(1).replace('.', ',')}% rispetto a Yae + Danica`);
        hitbox.addEventListener('mousemove', (e) => showTip(e, html));
        hitbox.addEventListener('mouseleave', hideTip);
      });
    });
  }

  // 2) Linee: Burst per rotazione (costanza)
  function lineChart(root) {
    legend(root);
    const holder = document.createElement('div');
    root.appendChild(holder);
    const draw = () => {
      holder.textContent = '';
      drawLines(holder, Math.max(300, Math.round(holder.clientWidth || root.clientWidth)));
    };
    draw();
    let raf = 0;
    window.addEventListener('resize', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); });
  }

  function drawLines(root, W) {
    const narrow = W < 560;
    const H = narrow ? 260 : 300;
    const m = { l: 52, r: narrow ? 18 : 160, t: 16, b: 40 };
    const yMin = 550000, yMax = 900000;
    const x = (i) => m.l + (i / 2) * (W - m.l - m.r);
    const y = (v) => m.t + (1 - (v - yMin) / (yMax - yMin)) * (H - m.t - m.b);
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Danno del Burst per rotazione, per team' }, root);

    for (let v = 550000; v <= 900000; v += 50000) {
      el('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: 'viz-grid' }, svg);
      const t = el('text', { x: m.l - 10, y: y(v) + 4, class: 'viz-axis', 'text-anchor': 'end' }, svg);
      t.textContent = `${v / 1000}k`;
    }
    [0, 1, 2].forEach((i) => {
      const t = el('text', { x: x(i), y: H - 14, class: 'viz-axis', 'text-anchor': 'middle' }, svg);
      t.textContent = narrow ? `R${i + 1}` : `Rotazione ${i + 1}`;
    });

    const labelY = [];
    TEAMS.forEach((t) => {
      const pts = t.burst.map((v, i) => [x(i), y(v)]);
      el('polyline', { points: pts.map((p) => p.join(',')).join(' '), fill: 'none', stroke: t.color, 'stroke-width': 2, 'stroke-linejoin': 'round' }, svg);
      pts.forEach(([px, py], i) => {
        el('circle', { cx: px, cy: py, r: 5, fill: t.color, class: 'viz-dot' }, svg);
        const hit = el('circle', { cx: px, cy: py, r: 14, fill: 'transparent', class: 'viz-hit' }, svg);
        const html = `<strong>${t.name}</strong><br>Rotazione ${i + 1}<br>Burst: <b>${fmt(t.burst[i])}</b>`;
        hit.addEventListener('mousemove', (e) => showTip(e, html));
        hit.addEventListener('mouseleave', hideTip);
      });
      // Etichetta diretta all'ultimo punto (evita sovrapposizioni); su schermi stretti basta la legenda
      if (narrow) return;
      const [lx, ly0] = pts[pts.length - 1];
      let ly = ly0;
      labelY.forEach((u) => { if (Math.abs(u - ly) < 16) ly = u + 16; });
      labelY.push(ly);
      const lab = el('text', { x: lx + 12, y: ly + 4, class: 'viz-direct' }, svg);
      lab.textContent = t.name.replace(' + ', ' · ');
    });
  }


  const bars = document.getElementById('viz-bars');
  const lines = document.getElementById('viz-lines');
  if (bars) barsChart(bars);
  if (lines) lineChart(lines);
})();
