'use strict';
(() => {
  const el = id => document.getElementById(id);
  const stops = [
    {name:'Magazyn A · Kraków', address:'ul. Przykładowa 10'},
    {name:'Magazyn B · Katowice', address:'ul. Demonstracyjna 20'},
    {name:'Magazyn C · Gliwice', address:'ul. Testowa 30'}
  ];
  let next = 0, pending = false;
  function showAlert() {
    el('new-destination').textContent = stops[next].name;
    el('new-address').textContent = stops[next].address;
    el('route-alert').hidden = false; el('pending').hidden = true;
    el('navigate').focus();
  }
  function reset() {
    next = 0; pending = false;
    el('route-alert').hidden = true; el('pending').hidden = true;
    el('map-destination').textContent = stops[0].name; el('map-address').textContent = stops[0].address;
    el('car-status').textContent = 'Nawigacja do pierwotnego punktu';
    el('event-status').textContent = 'Wybierz „Dodaj nowy punkt na trasie”, aby wywołać alert.';
  }
  for (const [id, title] of [['android','Android Auto'],['carplay','CarPlay']]) {
    el(id).onclick = () => {
      el('android').setAttribute('aria-pressed', String(id === 'android'));
      el('carplay').setAttribute('aria-pressed', String(id === 'carplay'));
      el('platform').textContent = title + ' · DEMO'; reset();
    };
  }
  el('change').onclick = () => {
    next = next === 1 ? 2 : 1; pending = true; showAlert();
    el('event-status').textContent = 'Dodano nowy najbliższy punkt. Kierowca otrzymuje jeden alert tej zmiany.';
    el('car-status').textContent = 'Trasa zmieniona · oczekuje na decyzję kierowcy';
  };
  el('refresh').onclick = () => {
    el('event-status').textContent = 'Ta sama trasa — bez kolejnego powiadomienia.';
  };
  el('navigate').onclick = () => {
    if (!pending) return;
    el('map-destination').textContent = stops[next].name; el('map-address').textContent = stops[next].address;
    pending = false; el('route-alert').hidden = true; el('pending').hidden = true;
    el('car-status').textContent = 'Nowy cel: ' + stops[next].name;
    el('event-status').textContent = 'DEMO: przekazano aktualny punkt do nawigacji.'; el('change').focus();
  };
  el('later').onclick = () => { el('route-alert').hidden = true; el('pending').hidden = !pending; el('pending').focus(); };
  el('pending').onclick = showAlert;
  el('reset').onclick = reset;
  el('route-alert').addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); el('later').click(); }
    if (event.key === 'Tab') {
      event.preventDefault(); (document.activeElement === el('navigate') ? el('later') : el('navigate')).focus();
    }
  });
})();
