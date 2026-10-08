'use strict';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const escapeHtml = (text) => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const emptyOperation = () => ({photos:[null,null],extra:[],seals:[null,null,null],cmr:null,finished:false,arrived:true});
const state = {operation:'unload', screen:'arrival', operations:{unload:emptyOperation(),load:emptyOperation()}, modal:null};
let uploadTarget = null;
let toastTimer;
let focusBeforeModal;
const current = () => state.operations[state.operation];
const isLoad = () => state.operation === 'load';
const operationName = () => isLoad() ? 'Załadunek' : 'Rozładunek';
const operationGenitive = () => isLoad() ? 'załadunku' : 'rozładunku';
const company = () => isLoad() ? 'ID Logistics Tilburg BV' : 'LogiPark Poznań';
const street = () => isLoad() ? 'Hermesstraat 1' : 'ul. Magazynowa 18';
const locationLine = () => isLoad() ? '5047 TS Tilburg, Holandia' : '62-023 Gądki, Polska';
const contact = () => isLoad() ? 'Thomas de Vries' : 'Anna Kowalska';
const progress = () => {
  const s = current();
  return {photos:s.photos.filter(Boolean).length, seals:s.seals.filter(Boolean).length, cmr:s.cmr ? 1 : 0,
    steps:Number(s.photos.every(Boolean)) + Number(s.seals.every(Boolean)) + Number(Boolean(s.cmr))};
};
function toast(message){
  const el = $('#toast'); el.textContent = message; el.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 3200);
}
function go(screen){
  if (['photos','seals','cmr','documents'].includes(screen)) current().arrived = true;
  if (screen === 'travel') current().arrived = false;
  if (screen === 'arrival') current().arrived = true;
  state.screen = screen; closeModal(false); render(); $('#app-scroll').scrollTop = 0;
}
function taskTile(type, title, subtitle, count, total, symbol){
  const done = count === total;
  return `<button class="task-tile ${done?'completed':''}" data-go="${type}"><span class="task-symbol">${icon(done?'check':symbol)}</span><span><strong>${title}</strong><small>${subtitle}</small></span><span class="task-right"><b>${count}/${total}</b>${icon('arrow')}</span></button>`;
}
function tasks(){
  const p = progress();
  return `<div class="tasks">${taskTile('photos','Zdjęcia ładunku','Plomba z bliska i ujęcie całego ładunku',p.photos,2,'camera')}${taskTile('seals','Plomby QR',isLoad()?'Każda sztuka ładunku + ostatnia CMR-ka':'Odczyt QR ładunków i CMR-ki',p.seals,3,'qr')}${taskTile('cmr',isLoad()?'Skan dokumentu CMR':'Podpisany dokument CMR','Czytelna, pełna strona dokumentu',p.cmr,1,'doc')}</div>`;
}
function pointCard(travel = false){
  return `<div class="card point-card"><div class="point-title"><span class="point-icon">${icon('pin')}</span><div><div class="label">PUNKT ${isLoad()?'ZAŁADUNKU':'ROZŁADUNKU'}</div><h3>${company()}</h3></div></div><div class="point-address"><strong>${street()}</strong><br>${locationLine()}</div><div class="point-info">${icon('clock')} Dzisiaj, 10:00–12:00 <span>·</span> Rampa ${isLoad()?'04':'12'}</div>${travel?`<a class="nav-button" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(street()+', '+locationLine())}&travelmode=driving" target="_blank" rel="noopener">${icon('nav')} Otwórz nawigację</a>`:`<div class="divider"></div><div class="ref-row"><span class="label">Numer referencyjny</span><span class="ref-code">REF-2026-0814<button class="copy-button" data-copy="REF-2026-0814" aria-label="Kopiuj numer referencyjny">${icon('doc')}</button></span></div><div class="contact-row"><span class="avatar">${isLoad()?'TV':'AK'}</span><span class="contact-details">${contact()}<small>Osoba kontaktowa · magazyn</small></span><button class="contact-button" data-contact="point" aria-label="Kontakt z ${contact()}">${icon('phone')}</button></div>`}</div>`;
}
function cargoCard(){
  return `<div class="card cargo-card"><div class="cargo-top"><span class="cargo-icon">${icon('box')}</span><div><h3>2 palety · części maszyn</h3><p>120 × 80 × 100 cm / szt.</p></div><span class="cargo-weight">240 kg<small>łącznie</small></span></div><div class="destination-row">${icon('route')}<span>${isLoad()?'Miejsce rozładunku':'Miejsce docelowe ładunku'}<strong>LogiPark Poznań · Gądki, Polska${!isLoad()?' (ten punkt)':''}</strong></span></div></div>`;
}
function renderArrival(){
  const p = progress();
  return `<div class="app-content"><div class="page-heading"><div><div class="overline">ZLECENIE SS/26/105/H</div><h2>${operationName()} w toku</h2></div><div class="date-chip">Czwartek<br><strong>8 października</strong></div></div><div class="arrival-strip"><span class="badge green">${icon('check')} Jesteś na miejscu</span><span>${icon('clock')} Przyjazd o 10:42</span></div>${pointCard()}<div class="section-heading"><h3>Twój ładunek</h3><button data-modal="order">Szczegóły zlecenia ${icon('arrow')}</button></div>${cargoCard()}<div class="instruction">${icon('info')}<span><strong>${isLoad()?'Naklej QR na każdej sztuce ładunku.':'Zgłoś się na rampę 12.'}</strong><br>${isLoad()?'Plombę na dokument naklej z tyłu ostatniej CMR-ki.':'Rozładunek bokiem. Przed rozpoczęciem sprawdź stan ładunku.'}</span></div><div class="section-heading"><h3>Dokumentacja ${operationGenitive()}</h3><span>${p.steps} z 3 gotowe</span></div>${tasks()}<div class="saved-hint">${icon('info')} Możesz uzupełniać kroki w dowolnej kolejności.</div></div>`;
}
function routeMap(){
  return `<div class="map" aria-label="Poglądowa mapa dojazdu"><svg viewBox="0 0 390 190" role="img" aria-label="Schemat trasy do magazynu"><rect width="390" height="190" fill="#edf0e9"/><g fill="#e0e6d8"><path d="M0 0h95v65H0zM310 0h80v75h-80zM140 115h73v75h-73zM260 140h130v50H260z"/></g><g fill="#e4e8e0" stroke="#d7ddd3" stroke-width="1"><path d="M105 3h56v40h-56zM223 12h63v47h-63zM40 110h54v54H40zM280 91h60v25h-60zM158 66h31v24h-31z"/></g><g stroke="#fff" fill="none" stroke-width="12"><path d="M-10 94 119 88 194 111 310 94 403 95M116-10l-3 67 15 63-7 86M270-12l-36 73 0 94 6 50M-10 166l113-21 97 21 109-18 93 16"/></g><path d="M-4 94 114 88l78 23 44-6 0-30 45-13" stroke="#a7bade" stroke-width="11" fill="none" stroke-linejoin="round"/><path d="M80 90 114 88l78 23 44-6 0-30 45-13" stroke="#466ead" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><g font-family="Arial" font-size="8" fill="#8e9889"><text x="148" y="145">Gądki</text><text x="302" y="83">Magazynowa</text><text x="40" y="81">S11</text></g><circle cx="80" cy="90" r="10" fill="white"/><circle cx="80" cy="90" r="6" fill="#466ead"/><g transform="translate(267 29)"><path d="M14 0a14 14 0 0 1 14 14c0 10-14 21-14 21S0 24 0 14A14 14 0 0 1 14 0" fill="#f5ca32" stroke="white" stroke-width="3"/><circle cx="14" cy="13" r="4" fill="#69571b"/></g></svg><div class="map-floating">${icon('nav')}<strong>18 min</strong><span>· 12 km</span></div><div class="map-label">Mapa poglądowa</div></div>`;
}
function renderTravel(){
  return `<div class="app-content"><div class="page-heading"><div><div class="overline">ZLECENIE SS/26/105/H</div><h2>Jedziesz na ${isLoad()?'załadunek':'rozładunek'}</h2></div></div><div class="route-mini"><b>${isLoad()?'Start':'Tilburg'}</b><span class="route-connector"></span><b>${isLoad()?'Tilburg':'Gądki'}</b><span class="badge yellow">${isLoad()?'Punkt 1/2':'Punkt 2/2'}</span></div>${routeMap()}${pointCard(true)}<details class="details-toggle"><summary>${icon('box')} Ładunek i informacje o zleceniu ${icon('arrow')}</summary><div class="divider"></div>${cargoCard()}<dl class="order-detail"><dt>Numer referencyjny</dt><dd>REF-2026-0814</dd><dt>Osoba kontaktowa</dt><dd>${contact()} · magazyn</dd><dt>Instrukcja</dt><dd>${isLoad()?'Rampa 04. Przygotuj plomby QR na 2 palety.':'Rampa 12. Rozładunek bokiem. Sprawdź stan ładunku.'}</dd></dl><button class="secondary-button" data-contact="point">${icon('phone')} Kontakt z magazynem</button></details><div class="instruction">${icon('info')}<span>Po przyjeździe kliknij <strong>„Dojechałem”</strong>. Otworzysz widok operacji i dodasz dokumentację.</span></div></div>`;
}
function subpageTop(){return `<div class="subpage-top"><button data-go="arrival" aria-label="Wróć do operacji">${icon('back')}</button><span>${operationName()} · SS/26/105/H</span></div>`;}
function miniProgress(active){
  const p=progress();
  return `<div class="mini-progress" aria-label="Etapy dokumentacji">${['photos','seals','cmr'].map((s,i)=>`<button data-go="${s}" class="${s===active?'active':(i===0?p.photos===2:i===1?p.seals===3:p.cmr===1)?'done':''}" aria-label="${['Zdjęcia ładunku','Plomby QR','Dokument CMR'][i]}" ${s===active?'aria-current="step"':''}></button>`).join('')}</div>`;
}
function demoPhoto(index){
  const qr = `<g fill="#37414b"><path d="M3 3h7v7H3zM17 3h7v7h-7zM3 17h7v7H3z"/><path d="M13 3h2v4h-2zM12 10h7v3h-7zM18 15h6v3h-6zM13 17h3v7h-3zM19 20h5v4h-5z"/></g>`;
  const seal = `<g transform="translate(184 45)"><rect width="37" height="39" rx="2" fill="#fffefa"/><g transform="translate(5 3) scale(.9)">${qr}</g><text x="5" y="35" font-size="4" font-family="Arial" fill="#37414b">SS-260814-01</text></g>`;
  const svg = index===0?`<svg xmlns="http://www.w3.org/2000/svg" width="500" height="260" viewBox="0 0 500 260"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#c8cdce"/><stop offset="1" stop-color="#e3e7e5"/></linearGradient><linearGradient id="box" x2="1" y2="1"><stop stop-color="#d1b797"/><stop offset="1" stop-color="#b39977"/></linearGradient></defs><rect width="500" height="260" fill="url(#bg)"/><rect x="48" y="15" width="364" height="220" rx="3" fill="url(#box)"/><path d="M48 66h364M48 130h364M48 196h364M230 15v220" stroke="#ad9575" stroke-width="2"/><path d="M180 15h19v220M344 15h17v220" fill="#86948d" opacity=".7"/>${seal}<g stroke="#fff" stroke-opacity=".25" stroke-width="3"><path d="M48 36 412 50M48 86l364 19M48 156l364 17M48 209l364 14"/></g><rect y="227" width="500" height="33" fill="#59666c"/><rect x="149" y="237" width="203" height="16" rx="6" fill="#25354155"/><text x="250" y="248" text-anchor="middle" font-family="Arial" font-size="8" fill="white">ZDJĘCIE DEMONSTRACYJNE</text></svg>`:`<svg xmlns="http://www.w3.org/2000/svg" width="500" height="260" viewBox="0 0 500 260"><rect width="500" height="260" fill="#cdd4d4"/><path d="M0 0h500v160H0z" fill="#d9dddd"/><g stroke="#b1bbbb" stroke-width="5"><path d="M20 0v170M145 0v170M275 0v170M408 0v170M0 49h500M0 103h500"/></g><path d="m0 170 500-1v91H0" fill="#8e9b9e"/><path d="m30 260 83-90M275 260l-18-90M455 260l-71-90" stroke="#b2bbbc"/><g fill="#bfaa8e" stroke="#ad977c"><rect x="22" y="117" width="98" height="82"/><path d="M22 157h98M71 117v82"/><rect x="348" y="94" width="123" height="107"/><path d="M348 147h123M410 94v107"/></g><g transform="translate(30 -5)"><rect x="126" y="89" width="179" height="127" fill="#d0b698"/><path d="M126 151h179M215 89v127" stroke="#b99e7e"/><path d="M163 89v127M277 89v127" stroke="#8a9c92" stroke-width="9"/><g transform="translate(13 54) scale(.65)">${seal}</g><rect x="118" y="216" width="196" height="11" fill="#b69c77"/><path d="M128 227v9M213 227v9M302 227v9" stroke="#a18966" stroke-width="15"/></g><rect x="149" y="237" width="203" height="16" rx="6" fill="#25354155"/><text x="250" y="248" text-anchor="middle" font-family="Arial" font-size="8" fill="white">ZDJĘCIE DEMONSTRACYJNE</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function photoSlot(i){
  const photo=current().photos[i];
  const titles=['Ładunek z widoczną plombą','Ładunek wśród pozostałych ładunków'];
  const hints=['Podejdź bliżej. Pokaż ładunek i całą naklejkę QR.','Odsuń się. Pokaż położenie ładunku i jego otoczenie.'];
  return `<div class="photo-slot"><div class="photo-slot-heading"><span class="number-circle">${i+1}</span><strong>${titles[i]}</strong>${photo?`<span class="badge green">${icon('check')} Dodano</span>`:''}</div>${photo?`<img class="photo-preview" src="${photo.url}" alt="${escapeHtml(titles[i])}${photo.demo?' — ilustracja demonstracyjna':''}"><div class="photo-toolbar"><span>${photo.demo?'Przykład w prototypie':'Podgląd w tej sesji'}</span><button data-photo="${i}">${icon('edit')} Zmień zdjęcie</button></div>`:`<button class="photo-placeholder" data-photo="${i}">${icon('camera')}<b>Zrób lub dodaj zdjęcie</b><small>Dotknij, aby otworzyć aparat</small></button><p class="photo-hint">${hints[i]}</p>`}</div>`;
}
function renderPhotos(){
  const p=progress();
  return `<div class="app-content">${subpageTop()}<div class="subpage-heading"><h2>Zdjęcia ładunku</h2><span class="badge ${p.photos===2?'green':'yellow'}">${p.photos}/2</span></div><p class="subpage-intro">Dwa ujęcia, które pokazują stan i umiejscowienie ładunku. Zdjęcia możesz dodać przed odebraniem dokumentów.</p>${miniProgress('photos')}${photoSlot(0)}${photoSlot(1)}<button class="secondary-button" data-photo="extra">${icon('plus')} Dodaj kolejne zdjęcie</button>${current().extra.map((x,i)=>`<div class="photo-slot" style="margin-top:13px"><div class="photo-slot-heading"><strong>Dodatkowe zdjęcie ${i+1}</strong><button class="copy-button" data-remove-extra="${i}" aria-label="Usuń dodatkowe zdjęcie">${icon('close')}</button></div><img class="photo-preview" src="${x.url}" alt="Dodatkowe zdjęcie ładunku"></div>`).join('')}<div class="optional-label">Dodatkowe zdjęcia są opcjonalne.</div></div>`;
}
function renderSeals(){
  const p=progress();
  return `<div class="app-content">${subpageTop()}<div class="subpage-heading"><h2>Plomby QR</h2><span class="badge ${p.seals===3?'green':'yellow'}">${p.seals}/3</span></div><p class="subpage-intro">${isLoad()?'Naklej i zeskanuj osobną plombę na każdej sztuce ładunku. Dzięki niej połączymy ładunek ze zleceniem.':'Odczytaj plomby przypisane do tego zlecenia. Sprawdź każdą sztukę ładunku i powiązany dokument.'}</p>${miniProgress('seals')}<div class="seal-section-label">SZTUKI ŁADUNKU</div>${[0,1].map(i=>sealRow(i)).join('')}<div class="seal-section-label">DOKUMENT TRANSPORTOWY</div>${sealRow(2)}<div class="instruction">${icon('info')}<span><strong>Plomba na ostatniej CMR-ce</strong><br>${isLoad()?'Naklej kod QR z tyłu ostatniego egzemplarza CMR i zeskanuj go.':'Odczytaj kod QR z tyłu ostatniego egzemplarza CMR.'} Skan dokumentu dodasz w osobnym kafelku.</span></div><div class="saved-hint">${icon('check')} Każda plomba jest przypisana do konkretnej pozycji.</div></div>`;
}
function sealRow(i){
  const code=current().seals[i];
  return `<div class="seal-item ${code?'done':''}"><span class="cargo-icon">${icon(i===2?'doc':'box')}</span><div><strong>${i===2?'Ostatnia CMR-ka':`Paleta ${i+1}`}</strong><small>${code?escapeHtml(code):i===2?'Plomba z tyłu dokumentu':'120 kg · części maszyn'}</small></div><button class="scan-button" data-scan="${i}" aria-label="${code?'Zmień plombę':'Skanuj plombę'} ${i===2?'CMR':'palety '+(i+1)}">${icon(code?'check':'qr')}${code?'Zmień':'Skanuj'}</button></div>`;
}
function demoDocument(){
  return `<div class="document-preview" style="border-style:solid;height:275px"><div class="document-paper"><h4>CMR</h4><p>MIĘDZYNARODOWY SAMOCHODOWY LIST PRZEWOZOWY</p><div class="paper-line"></div><p>ID Logistics Tilburg BV → LogiPark Poznań</p><div class="paper-grid"></div><div class="paper-signature">${isLoad()?'Nadawca':'Odbiorca'}</div></div></div>`;
}
function renderCMR(){
  const cmr=current().cmr;
  return `<div class="app-content">${subpageTop()}<div class="subpage-heading"><h2>${isLoad()?'Dokument CMR':'Podpisany CMR'}</h2><span class="badge ${cmr?'green':'yellow'}">${cmr?'1':'0'}/1</span></div><p class="subpage-intro">${isLoad()?'Masz już dokumenty? Dodaj czytelny skan CMR.':'Po rozładunku dodaj czytelny skan CMR z potwierdzeniem odbiorcy.'} Plomba i skan dokumentu to dwa osobne kroki.</p>${miniProgress('cmr')}<div class="cmr-card">${cmr?(cmr.demo?demoDocument():`<img class="cmr-upload" src="${cmr.url}" alt="Podgląd dodanego dokumentu CMR">`):`<button class="document-preview" data-cmr="true">${icon('doc')}<strong>Zeskanuj dokument CMR</strong><small>Cała strona, w dobrym świetle</small></button>`}${cmr?`<div class="photo-toolbar"><span>${cmr.demo?'Dokument demonstracyjny':'Podgląd w tej sesji'}</span><button data-cmr="true">${icon('edit')} Zmień skan</button></div>`:''}<div class="cmr-checklist"><div>${icon('check')} Wszystkie cztery rogi w kadrze</div><div>${icon('check')} Czytelny tekst i numery</div><div>${icon('check')} ${isLoad()?'Widoczne podpisy na dokumencie':'Widoczny podpis i potwierdzenie odbiorcy'}</div><div>${icon('check')} Bez odblasków i rozmycia</div></div></div><div class="linked-seal">${icon('qr')}<span>${current().seals[2]?`QR dokumentu: <strong>${escapeHtml(current().seals[2])}</strong>`:'Plomba na CMR-ce nie została odczytana.'}</span><button data-scan="2">${current().seals[2]?'Zmień':'Skanuj'}</button></div><div class="instruction">${icon('info')}<span>Przed zakończeniem ${operationGenitive()} sprawdź podgląd dokumentu. Nieczytelne zdjęcie zrób ponownie.</span></div></div>`;
}
function renderDocuments(){
  const p=progress();
  return `<div class="app-content">${subpageTop()}<div class="subpage-heading"><h2>Dokumentacja</h2><span class="badge ${p.steps===3?'green':'yellow'}">${p.steps}/3</span></div><p class="subpage-intro">Uzupełnij wszystkie wymagane materiały. Możesz zacząć od dowolnego kafelka.</p>${tasks()}${!isLoad()?`<div class="section-heading"><h3>Materiały z załadunku</h3><span>Podgląd</span></div><button class="task-tile" data-modal="previous"><span class="task-symbol">${icon('camera')}</span><span><strong>Zdjęcia z Tilburg</strong><small>Ładunek i widoczna plomba QR</small></span><span class="task-right">${icon('arrow')}</span></button>`:''}<div class="saved-hint">${icon('info')} Zdjęcia nie wymagają wcześniejszego dodania CMR.</div></div>`;
}
function renderSuccess(){
  return `<div class="app-content"><div class="page-heading"><div><div class="overline">ZLECENIE SS/26/105/H</div><h2>Wszystko gotowe.</h2></div></div><div class="completed-banner"><span class="success-icon">${icon('check')}</span><h2>${operationName()} zakończony</h2><p>${company()}<br>Wszystkie materiały są uzupełnione w podglądzie.</p><div class="summary-line">${icon('check')} Zdjęcia ładunku <b>2/2</b></div><div class="summary-line">${icon('check')} Plomby QR <b>3/3</b></div><div class="summary-line">${icon('check')} ${isLoad()?'Dokument CMR':'Podpisany CMR'} <b>1/1</b></div></div><div class="instruction">${icon('info')}<span>${isLoad()?'Następny punkt: <strong>LogiPark Poznań, Gądki</strong>. Przejdź do widoku trasy.':'Dokumentacja tej operacji jest kompletna. Możesz wrócić do podglądu lub sprawdzić trasę.'}</span></div><button class="secondary-button" data-go="documents">${icon('doc')} Zobacz dokumentację</button><p class="small-note">To demonstracja zakończenia operacji.<br>Dane nie zostały przesłane do systemu.</p></div>`;
}
function renderRoute(){
  return `<div class="app-content">${subpageTop()}<div class="subpage-heading"><h2>Twoja trasa</h2><span class="badge">2 punkty</span></div><p class="subpage-intro">Zlecenie SS/26/105/H · 2 palety · 240 kg</p><div class="seal-item"><span class="cargo-icon">${icon('pin')}</span><div><strong>1. Załadunek · Tilburg</strong><small>ID Logistics Tilburg BV<br>Hermesstraat 1</small></div><button class="scan-button" data-route-operation="load">Otwórz</button></div><div class="seal-item"><span class="cargo-icon">${icon('pin')}</span><div><strong>2. Rozładunek · Gądki</strong><small>LogiPark Poznań<br>ul. Magazynowa 18</small></div><button class="scan-button" data-route-operation="unload">Otwórz</button></div><div class="instruction">${icon('info')}<span>Widok operacji otworzysz po przyjeździe na wybrany punkt. W drodze masz dostęp do nawigacji i szczegółów zlecenia.</span></div></div>`;
}
const notes={
  arrival:{title:'Na miejscu.<br>Liczy się operacja.',description:'Po kliknięciu „Dojechałem” mapa znika. Na pierwszy plan wychodzą informacje potrzebne przy rampie.',features:[['Firma i adres od razu','Jeden punkt, wyraźny status, numer referencyjny i kontakt w zasięgu kciuka.'],['Ładunek w kontekście','Co przewozisz, ile waży i gdzie ma trafić — w jednym czytelnym kafelku.'],['Dokumentacja bez szukania','Trzy osobne kafelki i konkretne liczniki pokazują, co zostało do zrobienia.']]},
  travel:{title:'Najpierw dojazd.<br>Potem dokumenty.',description:'W drodze kierowca widzi, gdzie i po co jedzie. Dodatkowe informacje otwiera wtedy, gdy ich potrzebuje.',features:[['Mapa tylko w drodze','Pogląd trasy i duży przycisk otwierający zewnętrzną nawigację.'],['Szczegóły na żądanie','Ładunek, kontakt i instrukcje nie konkurują z informacją o celu.'],['Jednoznaczny moment przyjazdu','„Dojechałem” przełącza ekran w tryb pracy na miejscu. Bez dodawania załączników przed przyjazdem.']]},
  photos:{title:'Dwa ujęcia.<br>Jasna instrukcja.',description:'Każde wymagane zdjęcie ma własne miejsce i krótką wskazówkę. Nie trzeba czekać na dokumenty.',features:[['Plomba widoczna z bliska','Ujęcie pozwala zobaczyć naklejkę QR i ładunek, na którym się znajduje.'],['Otoczenie ładunku','Szerszy kadr pokazuje pozycję wśród pozostałych ładunków.'],['Aparat lub własny plik','Przejdź przez przykład albo wybierz zdjęcie na swoim urządzeniu. Pliki pozostają w tej karcie przeglądarki.']]},
  seals:{title:'Każda plomba.<br>Właściwy ładunek.',description:'QR nie jest anonimowym załącznikiem. Każdy kod przypisujemy do konkretnej palety lub dokumentu.',features:[['Osobno dla każdej sztuki','Dwie palety to dwie osobne plomby. Widać, które zostały odczytane.'],['CMR ma własny kod','Plomba z tyłu ostatniej CMR-ki łączy dokument z tym samym zleceniem.'],['Czytelny postęp','Kod po odczycie pojawia się przy odpowiedniej pozycji. W prototypie odczyt jest symulowany.']]},
  cmr:{title:'Czytelny dokument.<br>Kompletne zlecenie.',description:'Skan CMR ma osobny widok, duży podgląd i prostą instrukcję. Można dodać go po zdjęciach i plombach.',features:[['Cały dokument w kadrze','Cztery rogi, czytelne numery i brak odblasków ułatwiają poprawne zdjęcie.'],['Powiązanie z plombą','Status QR dokumentu jest widoczny również na ekranie CMR.'],['Możliwość poprawki','Podgląd można sprawdzić i zastąpić przed zakończeniem operacji.']]},
  documents:{title:'Widać, co gotowe.<br>Widać, czego brakuje.',description:'Jeden przegląd wymaganych materiałów, bez narzucania kolejności.',features:[['Zdjęcia przed dokumentami','Kierowca wykorzystuje czas na miejscu i wraca do kolejnych kafelków, gdy może.'],['Pełna kontrola kompletności','Zakończenie operacji wymaga zdjęć, przypisanych QR i skanu CMR.'],['Materiały z wcześniejszego punktu','Przy rozładunku można podejrzeć zdjęcia z załadunku i porównać stan ładunku.']]},
  success:{title:'Gotowe.<br>Możesz jechać dalej.',description:'Wyraźne potwierdzenie kończy operację i pokazuje kompletność dokumentacji.',features:[['Czytelne potwierdzenie','Kierowca wie, że wszystkie wymagane kroki są uzupełnione.'],['Dostęp do materiałów','Dokumentacja pozostaje dostępna do wglądu w tym podglądzie.'],['Kolejny punkt','Po zakończeniu załadunku można przejść do następnego punktu trasy.']]}
};
function renderNotes(){
  const n=notes[state.screen]||notes.arrival;
  $('#design-context').innerHTML=`<h2>${n.title}</h2><p class="note-description">${n.description}</p>${n.features.map((f,i)=>`<div class="design-feature"><span class="feature-num">0${i+1}</span><div><h3>${f[0]}</h3><p>${f[1]}</p></div></div>`).join('')}`;
}
function renderAction(){
  const p=progress();
  let html='';
  if(state.screen==='travel') html=`<button class="primary-button" id="arrive">${icon('check')} Dojechałem na ${isLoad()?'załadunek':'rozładunek'}</button>`;
  else if(['arrival','documents'].includes(state.screen)) html=`<button class="primary-button" id="${p.steps===3?'finish':'complete-docs'}">${icon(p.steps===3?'check':'plus')} ${p.steps===3?`Zakończ ${isLoad()?'załadunek':'rozładunek'}`:'Uzupełnij dokumentację'}</button><p class="action-caption">${p.steps===3?'Wszystkie wymagane materiały są gotowe.':`${p.steps} z 3 kroków gotowe · zdjęcia, plomby i CMR`}</p>`;
  else if(['photos','seals','cmr'].includes(state.screen)){
    const count=state.screen==='photos'?p.photos:state.screen==='seals'?p.seals:p.cmr;
    const total=state.screen==='photos'?2:state.screen==='seals'?3:1;
    html=`<button class="primary-button" data-go="arrival">${icon(count===total?'check':'back')} ${count===total?'Zapisz i wróć do operacji':'Wróć do operacji'}</button><p class="action-caption">${count===total?'Ten krok jest gotowy.':`Dodano ${count} z ${total} · możesz wrócić tutaj później`}</p>`;
  }else if(state.screen==='success') html=`<button class="primary-button" id="next-point">${icon('route')} ${isLoad()?'Jedź na rozładunek':'Wróć do podglądu'}</button>`;
  else html=`<button class="primary-button" data-go="${current().arrived?'arrival':'travel'}">${icon('back')} Wróć do aktualnego punktu</button>`;
  $('#app-action').innerHTML=html;
}
function render(){
  const views={arrival:renderArrival,travel:renderTravel,photos:renderPhotos,seals:renderSeals,cmr:renderCMR,documents:renderDocuments,success:renderSuccess,route:renderRoute};
  $('#app').innerHTML=(views[state.screen]||renderArrival)();
  renderAction(); renderNotes();
  const labels={travel:'01 / W DRODZE',arrival:'02 / PO PRZYJEŹDZIE',photos:'03 / ZDJĘCIA ŁADUNKU',seals:'04 / PLOMBY QR',cmr:'05 / DOKUMENT CMR',documents:'DOKUMENTACJA',success:'OPERACJA ZAKOŃCZONA',route:'TWOJA TRASA'};
  $('#preview-label').textContent=labels[state.screen];
  $('#mobile-screen').value=['travel','arrival','photos','seals','cmr'].includes(state.screen)?state.screen:'arrival';
  $$('[data-screen]').forEach(b=>{b.classList.toggle('active',b.dataset.screen===state.screen);if(b.dataset.screen===state.screen)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  $$('[data-operation]').forEach(b=>{b.classList.toggle('active',b.dataset.operation===state.operation);b.setAttribute('aria-pressed',String(b.dataset.operation===state.operation));});
  $$('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===(state.screen==='route'?'route':['documents','photos','seals','cmr'].includes(state.screen)?'documents':'now')));
  bindView();
}
function bindView(){
  $$('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
  $$('[data-copy]').forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.copy);toast('Numer referencyjny skopiowany.');}catch{openModal('copy');}});
  $$('[data-contact]').forEach(b=>b.onclick=()=>openModal('contact'));
  $$('[data-modal]').forEach(b=>b.onclick=()=>openModal(b.dataset.modal));
  $$('[data-photo]').forEach(b=>b.onclick=()=>openModal('photo',b.dataset.photo));
  $$('[data-cmr]').forEach(b=>b.onclick=()=>openModal('cmr'));
  $$('[data-scan]').forEach(b=>b.onclick=()=>openModal('scan',Number(b.dataset.scan)));
  $$('[data-remove-extra]').forEach(b=>b.onclick=()=>{const removed=current().extra.splice(Number(b.dataset.removeExtra),1)[0];if(removed?.url?.startsWith('blob:'))URL.revokeObjectURL(removed.url);render();});
  $$('[data-route-operation]').forEach(b=>b.onclick=()=>{state.operation=b.dataset.routeOperation;go(current().arrived?'arrival':'travel');});
  if($('#arrive'))$('#arrive').onclick=()=>{current().arrived=true;go('arrival');toast('Jesteś na miejscu. Możesz rozpocząć operację.');};
  if($('#complete-docs'))$('#complete-docs').onclick=()=>go('documents');
  if($('#finish'))$('#finish').onclick=()=>openModal('finish');
  if($('#next-point'))$('#next-point').onclick=()=>{if(isLoad()){state.operation='unload';current().arrived=false;go('travel');}else{go('arrival');}};
}
function photoModalContent(target){
  const i=target==='extra'?1:Number(target);
  return `<p>${i===0?'Zrób zdjęcie ładunku z całą, widoczną plombą QR.':'Zrób szersze zdjęcie pokazujące umiejscowienie ładunku wśród pozostałych.'}</p><img class="photo-preview" src="${demoPhoto(i)}" alt="Przykładowy kadr zdjęcia — ilustracja"><p class="small-note">To interaktywny prototyp. Wybrany plik pozostanie w tej karcie przeglądarki i nie trafi do systemu.</p><button class="primary-button" id="choose-file">${icon('camera')} Aparat lub zdjęcie z urządzenia</button><button class="secondary-button" id="use-demo">Wypróbuj na zdjęciu przykładowym</button>`;
}
function openModal(type, target){
  focusBeforeModal=document.activeElement;
  state.modal={type,target};
  let title='',body='';
  if(type==='photo'){title=target==='extra'?'Dodatkowe zdjęcie':'Dodaj zdjęcie ładunku';body=photoModalContent(target);}
  if(type==='cmr'){title='Dodaj skan CMR';body=`<p>Sfotografuj całą stronę dokumentu. Sprawdź ostrość tekstu i widoczność podpisów.</p>${demoDocument()}<p class="small-note">Plik będzie widoczny tylko w tej karcie. Prototyp nie wykonuje automatycznego kadrowania ani OCR.</p><button class="primary-button" id="choose-file">${icon('camera')} Aparat lub skan z urządzenia</button><button class="secondary-button" id="use-demo">Wypróbuj na dokumencie przykładowym</button>`;}
  if(type==='scan'){
    title=target===2?'Plomba na CMR-ce':`Plomba · Paleta ${target+1}`;
    body=`<p>${isLoad()?(target===2?'Naklej plombę z tyłu ostatniej CMR-ki.':'Naklej osobną plombę na tej palecie.'):'Odczytaj istniejącą plombę przypisaną do tej pozycji.'} Skieruj aparat na kod QR.</p><div class="scan-camera"><div class="scan-guide">${icon('qr')}</div><div class="demo-watermark">Podgląd skanera · symulacja QR</div></div><button class="primary-button" id="simulate-scan">${icon('qr')} Symuluj odczyt QR</button><label for="qr-code" class="field-label">Lub wpisz kod z naklejki</label><input id="qr-code" class="text-input" type="text" autocomplete="off" placeholder="np. SS-260814-01" maxlength="64"><p id="qr-error" class="field-error" role="alert"></p><button class="secondary-button" id="manual-scan">Zatwierdź wpisany kod</button><p class="small-note">W tym prototypie odczyt QR jest symulowany.<br>Rzeczywisty skaner wymaga integracji w aplikacji Android.</p>`;
  }
  if(type==='order'){title='Szczegóły zlecenia';body=`<span class="badge yellow">SS/26/105/H</span><dl class="order-detail"><dt>Ładunek</dt><dd>Części maszyn · 2 palety · 240 kg<br>120 × 80 × 100 cm / szt.</dd><dt>Załadunek</dt><dd>ID Logistics Tilburg BV<br>Hermesstraat 1, 5047 TS Tilburg, Holandia</dd><dt>Rozładunek / miejsce docelowe</dt><dd>LogiPark Poznań<br>ul. Magazynowa 18, 62-023 Gądki, Polska</dd><dt>Numer referencyjny</dt><dd>REF-2026-0814</dd><dt>Kontakt w aktualnym punkcie</dt><dd>${contact()} · magazyn</dd><dt>Dodatkowe instrukcje</dt><dd>${isLoad()?'Rampa 04. Naklej osobną plombę QR na każdej palecie.':'Rampa 12. Rozładunek bokiem. Zgłoś uszkodzenia przed rozładunkiem.'}</dd></dl><button class="primary-button" id="modal-dismiss">Rozumiem</button><p class="small-note">Dane przykładowe do oceny projektu.</p>`;}
  if(type==='contact'){title='Kontakt w magazynie';body=`<div class="contact-row" style="border:0;margin-top:10px"><span class="avatar">${isLoad()?'TV':'AK'}</span><span class="contact-details">${contact()}<small>Osoba kontaktowa · ${company()}</small></span></div><dl class="order-detail"><dt>Telefon — pole przykładowe</dt><dd>+48 000 000 000</dd><dt>Numer referencyjny do rozmowy</dt><dd>REF-2026-0814</dd></dl><button class="primary-button" id="demo-call">${icon('phone')} Podgląd przycisku „Zadzwoń”</button><p class="small-note">W aplikacji przycisk otworzy telefon z numerem kontaktu.</p>`;}
  if(type==='copy'){title='Numer referencyjny';body=`<p>Zaznacz i skopiuj numer:</p><input class="text-input" value="REF-2026-0814" readonly aria-label="Numer referencyjny"><button class="primary-button" id="modal-dismiss">Gotowe</button>`;}
  if(type==='notifications'){title='Powiadomienia';body=`<span class="badge green">${icon('check')} Brak nowych powiadomień</span><p>Instrukcje dla aktualnego punktu znajdziesz w szczegółach zlecenia.</p><button class="primary-button" id="modal-dismiss">Wróć do operacji</button>`;}
  if(type==='previous'){title='Zdjęcia z załadunku';body=`<p>ID Logistics Tilburg BV · podgląd materiałów z poprzedniego punktu.</p><div class="photo-slot"><strong style="font-size:11px">Ładunek z widoczną plombą</strong><img class="photo-preview" style="margin-top:10px" src="${demoPhoto(0)}" alt="Demonstracyjne zdjęcie ładunku z plombą"></div><div class="photo-slot"><strong style="font-size:11px">Ładunek wśród pozostałych</strong><img class="photo-preview" style="margin-top:10px" src="${demoPhoto(1)}" alt="Demonstracyjne zdjęcie położenia ładunku"></div><p class="small-note">Przykładowe materiały do oceny widoku.</p>`;}
  if(type==='help'){title='Potrzebujesz pomocy?';body=`<p>Wybierz, z kim chcesz się skontaktować lub opisz problem w aktualnym punkcie.</p><div class="help-options"><button id="help-dispatch">${icon('help')} Kontakt ze spedytorem</button><button id="help-contact">${icon('phone')} Kontakt z magazynem</button><button id="help-problem">${icon('info')} Zgłoś problem z ładunkiem</button></div>`;}
  if(type==='problem'){title='Problem z ładunkiem';body=`<p>Opisz sytuację. W gotowej aplikacji zgłoszenie zostanie przypisane do tego punktu i zlecenia.</p><label class="field-label" for="problem-text">Co się stało?</label><textarea id="problem-text" class="text-input" style="height:105px;resize:vertical;padding-top:11px" placeholder="np. Uszkodzona folia na palecie 1"></textarea><button class="primary-button" id="demo-problem">Podgląd zgłoszenia</button><p class="small-note">Prototyp nie wysyła zgłoszeń do spedytora.</p>`;}
  if(type==='finish'){
    if(progress().steps!==3){toast('Uzupełnij zdjęcia, plomby i CMR.');state.modal=null;return;}
    title=`Zakończyć ${isLoad()?'załadunek':'rozładunek'}?`;
    body=`<p>Sprawdź, czy zdjęcia i dokument są czytelne, a wszystkie plomby przypisane do właściwych pozycji.</p><div class="summary-line">${icon('check')} Zdjęcia ładunku <b>2/2</b></div><div class="summary-line">${icon('check')} Plomby ładunków i CMR <b>3/3</b></div><div class="summary-line">${icon('check')} Skan CMR <b>1/1</b></div><button class="primary-button" id="confirm-finish">${icon('check')} Tak, zakończ ${isLoad()?'załadunek':'rozładunek'}</button><button class="secondary-button" id="modal-dismiss">Wróć i sprawdź materiały</button><p class="small-note">W prototypie nie zmieniamy statusu rzeczywistego zlecenia.</p>`;
  }
  if(type==='reset'){title='Zresetować podgląd?';body=`<p>Usuniesz postęp i wybrane pliki z tej demonstracji. Będzie można ponownie przejść przez wszystkie kroki.</p><button class="primary-button" id="confirm-reset">Zresetuj prototyp</button><button class="secondary-button" id="modal-dismiss">Zachowaj postęp</button>`;}
  $('#modal-root').innerHTML=`<div class="modal-overlay"><section class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1"><div class="modal-handle"></div><div class="modal-title"><h3 id="modal-title">${title}</h3><button class="icon-button" id="close-modal" aria-label="Zamknij">${icon('close')}</button></div>${body}</section></div>`;
  $('#close-modal').onclick=()=>closeModal();
  $('.modal-overlay').onclick=(e)=>{if(e.target.classList.contains('modal-overlay'))closeModal();};
  if($('#modal-dismiss'))$('#modal-dismiss').onclick=()=>closeModal();
  if($('#choose-file'))$('#choose-file').onclick=()=>{uploadTarget={operation:state.operation,kind:type==='cmr'?'cmr':'photo',target};$('#file-input').value='';$('#file-input').click();};
  if($('#use-demo'))$('#use-demo').onclick=()=>{
    if(type==='cmr')current().cmr={demo:true};
    else{const photo={url:demoPhoto(target==='extra'?1:Number(target)),demo:true};if(target==='extra')current().extra.push(photo);else current().photos[Number(target)]=photo;}
    closeModal(false); render();toast(type==='cmr'?'Dodano przykładowy dokument.':'Dodano przykładowe zdjęcie.');
  };
  if($('#simulate-scan'))$('#simulate-scan').onclick=()=>saveQR(target,(!isLoad()&&state.operations.load.seals[target])||`SS-260814-${String(target+1).padStart(2,'0')}`);
  if($('#manual-scan'))$('#manual-scan').onclick=()=>saveQR(target,$('#qr-code').value);
  if($('#qr-code'))$('#qr-code').onkeydown=e=>{if(e.key==='Enter')saveQR(target,e.target.value);};
  if($('#demo-call'))$('#demo-call').onclick=()=>{closeModal();toast('Podgląd: przycisk otworzy połączenie z kontaktem.');};
  if($('#help-contact'))$('#help-contact').onclick=()=>openModal('contact');
  if($('#help-dispatch'))$('#help-dispatch').onclick=()=>{closeModal();toast('Podgląd: kontakt ze spedytorem prowadzącym zlecenie.');};
  if($('#help-problem'))$('#help-problem').onclick=()=>openModal('problem');
  if($('#demo-problem'))$('#demo-problem').onclick=()=>{if(!$('#problem-text').value.trim()){toast('Wpisz krótki opis problemu.');return;}closeModal();toast('Podgląd zgłoszenia. Wiadomość nie została wysłana.');};
  if($('#confirm-finish'))$('#confirm-finish').onclick=()=>{current().finished=true;go('success');};
  if($('#confirm-reset'))$('#confirm-reset').onclick=()=>reset();
  $('.modal-sheet').focus();
}
function saveQR(index, raw){
  const code=raw.trim().toUpperCase();
  if(!/^[A-Z0-9][A-Z0-9._/-]{3,63}$/.test(code)){$('#qr-error').textContent='Wpisz kod z naklejki (min. 4 znaki, bez spacji).';return;}
  const duplicate=Object.values(state.operations).some(op=>op.seals.some((existing,i)=>existing===code && i!==index));
  if(duplicate){$('#qr-error').textContent='Ten kod przypisano już do innej pozycji. Każda plomba musi być unikalna.';return;}
  if(!isLoad()){
    const expected=state.operations.load.seals[index]||`SS-260814-${String(index+1).padStart(2,'0')}`;
    if(code!==expected){$('#qr-error').textContent=`Kod nie pasuje do tej pozycji. W przykładzie oczekujemy: ${expected}.`;return;}
  }
  current().seals[index]=code;closeModal(false);render();toast('Plomba przypisana do właściwej pozycji.');
}
function closeModal(restoreFocus=true){
  $('#modal-root').innerHTML='';state.modal=null;
  if(restoreFocus && focusBeforeModal?.isConnected)focusBeforeModal.focus();
}
function reset(){
  for(const op of Object.values(state.operations)){
    [...op.photos,...op.extra,op.cmr].filter(Boolean).forEach(p=>{if(p.url?.startsWith('blob:'))URL.revokeObjectURL(p.url);});
  }
  state.operations={unload:emptyOperation(),load:emptyOperation()};state.operation='unload';go('arrival');toast('Podgląd został zresetowany.');
}
$('#file-input').onchange=(e)=>{
  const file=e.target.files[0];if(!file||!uploadTarget)return;
  if(!file.type.startsWith('image/')){toast('Wybierz zdjęcie w formacie JPG, PNG lub WebP.');return;}
  if(file.size>20*1024*1024){toast('Zdjęcie jest za duże. Wybierz plik do 20 MB.');return;}
  const img=new Image();const url=URL.createObjectURL(file);
  const target={...uploadTarget};
  img.onload=()=>{
    const op=state.operations[target.operation];const data={url,demo:false,name:file.name};
    let old=null;
    if(target.kind==='cmr'){old=op.cmr;op.cmr=data;}
    else if(target.target==='extra')op.extra.push(data);
    else{old=op.photos[Number(target.target)];op.photos[Number(target.target)]=data;}
    if(old?.url?.startsWith('blob:'))URL.revokeObjectURL(old.url);
    closeModal(false);render();toast(target.kind==='cmr'?'Dodano podgląd dokumentu CMR.':'Dodano podgląd zdjęcia.');
  };
  img.onerror=()=>{URL.revokeObjectURL(url);toast('Nie udało się odczytać zdjęcia. Wybierz JPG, PNG lub WebP.');};
  img.src=url;
};
$$('[data-screen]').forEach(b=>b.onclick=()=>go(b.dataset.screen));
$$('[data-operation]').forEach(b=>b.onclick=()=>{state.operation=b.dataset.operation;current().arrived=true;go('arrival');});
$$('[data-nav]').forEach(b=>b.onclick=()=>{
  const nav=b.dataset.nav;
  if(nav==='now')go(current().arrived?(current().finished?'success':'arrival'):'travel');
  if(nav==='route')go('route');
  if(nav==='documents'){
    if(!current().arrived){toast('Dokumentację tego punktu dodasz po przyjeździe.');return;}
    go('documents');
  }
  if(nav==='help')openModal('help');
});
$('#reset').onclick=()=>openModal('reset');
$('#mobile-screen').onchange=e=>go(e.target.value);
$('#notifications').onclick=()=>openModal('notifications');
document.addEventListener('keydown',e=>{
  if(!state.modal)return;
  if(e.key==='Escape'){closeModal();return;}
  if(e.key==='Tab'){
    const focusable=$$('button:not([disabled]),a[href],input,textarea,[tabindex="0"]',$('.modal-sheet'));
    const first=focusable[0],last=focusable[focusable.length-1];
    if(e.shiftKey&&(document.activeElement===first||document.activeElement===$('.modal-sheet'))){e.preventDefault();last?.focus();}
    else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===$('.modal-sheet'))){e.preventDefault();first?.focus();}
  }
});
render();
