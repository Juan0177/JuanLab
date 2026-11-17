// Tema di JuanLab (Notte JuanLab, Genshin Optimizer, Stellar): applicato subito, prima che la pagina si disegni,
// e scelto col selettore in basso a sinistra. La scelta resta nel browser (localStorage).
(function () {
  var KEY = 'juanlab-palette';
  var THEMES = [
    ['juanlab', 'Notte JuanLab'],
    ['go', 'Genshin Optimizer'],
    ['stellar', 'Stellar']
  ];
  var valid = function (value) {
    return THEMES.some(function (theme) { return theme[0] === value; });
  };
  var current = 'juanlab';
  try {
    var saved = localStorage.getItem(KEY);
    if (valid(saved)) current = saved;
  } catch (e) { /* senza localStorage resta Notte JuanLab */ }
  document.documentElement.setAttribute('data-palette', current);

  function addPicker() {
    if (document.querySelector('.jl-palette')) return;
    var label = document.createElement('label');
    label.className = 'jl-palette';
    var text = document.createElement('span');
    text.textContent = 'Tema';
    var select = document.createElement('select');
    select.setAttribute('aria-label', 'Tema del sito');
    THEMES.forEach(function (theme) {
      var option = document.createElement('option');
      option.value = theme[0];
      option.textContent = theme[1];
      if (theme[0] === current) option.selected = true;
      select.appendChild(option);
    });
    select.addEventListener('change', function () {
      current = select.value;
      document.documentElement.setAttribute('data-palette', current);
      try { localStorage.setItem(KEY, current); } catch (e) { /* vale fino al ricaricamento */ }
    });
    label.appendChild(text);
    label.appendChild(select);
    document.body.appendChild(label);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addPicker);
  else addPicker();
})();
