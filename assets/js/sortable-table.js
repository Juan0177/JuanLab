// Tabelle ordinabili: <table class="sortable">. Click (o Invio) su un'intestazione
// ordina la colonna; un secondo click inverte l'ordine. Le celle possono avere
// data-sort con il valore grezzo; le colonne numeriche hanno data-type="num" sul <th>.
(() => {
  document.querySelectorAll('table.sortable').forEach((table) => {
    const heads = Array.from(table.tHead.rows[0].cells);
    const body = table.tBodies[0];

    heads.forEach((th, col) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sort-btn';
      btn.innerHTML = `${th.innerHTML}<span class="sort-ind" aria-hidden="true"></span>`;
      th.textContent = '';
      th.appendChild(btn);
      if (!th.hasAttribute('aria-sort')) th.setAttribute('aria-sort', 'none');

      btn.addEventListener('click', () => {
        const num = th.dataset.type === 'num';
        const current = th.getAttribute('aria-sort');
        const dir = current === 'descending' || (current === 'none' && !num) ? 'ascending' : 'descending';
        const value = (row) => {
          const cell = row.cells[col];
          const raw = cell.dataset.sort ?? cell.textContent.trim();
          return num ? parseFloat(raw) : raw.toLowerCase();
        };
        const rows = Array.from(body.rows);
        rows.sort((a, b) => {
          const x = value(a);
          const y = value(b);
          const cmp = num ? x - y : x.localeCompare(y, 'it');
          return dir === 'ascending' ? cmp : -cmp;
        });
        rows.forEach((r) => body.appendChild(r));
        heads.forEach((h) => h.setAttribute('aria-sort', 'none'));
        th.setAttribute('aria-sort', dir);
      });
    });
  });
})();
