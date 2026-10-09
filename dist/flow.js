'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const icon=name=>`<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const has=value=>value!==null&&value!==undefined&&String(value).trim()!=='';
const pickup={company:'Cardo Roma Hotel',country:'IT',countryName:'Włochy',map:'https://maps.app.goo.gl/VHKsFNUHtNADEfki6'};
const delivery={company:'One World Rental Europe B.V.',country:'NL',countryName:'Holandia',map:'https://maps.app.goo.gl/yeTaQnNQw4w2F6YN6'};
const assignment={id:'SS/26/105/H',pickup,delivery,cargo:{name:'Sprzęt w skrzyniach transportowych',quantity:2,unit:'skrzynie',mass:240,dimensions:'120 × 80 × 100 cm / szt.',demo:true}};
const scenarios={
  basic:{ref:null,contact:null,instructions:null,notes:[],photos:[],gate:null,parking:null,warehouse:null,ramp:null},
  contact:{ref:null,contact:{name:'oanne Herman',phone:'+44 7779651471'},instructions:'Towar jest przechowywany w „Sferze nr 1”.',notes:['Osoba kontaktowa będzie na miejscu jutro rano w celu załadunku.'],photos:[],gate:null,parking:null,warehouse:null,ramp:null},
  materials:{ref:'REF-DEMO-0814',refDemo:true,contact:{name:'oanne Herman',phone:'+44 7779651471'},instructions:'Towar jest przechowywany w „Sferze nr 1”.',notes:['Osoba kontaktowa będzie na miejscu jutro rano w celu załadunku.'],photos:[{name:'Zdjęcie miejsca odbioru',url:demoPhoto(1),demo:true},{name:'Zdjęcie przygotowanego ładunku',url:demoPhoto(0),demo:true}],gate:null,parking:null,warehouse:null,ramp:null}
};
const fresh=()=>({arrived:true,physicalConfirmed:false,started:false,actualCount:assignment.cargo.quantity,photos:[null,null],documents:[],documentsComplete:false,labels:[],seals:[],finished:false,step:'info',messages:[]});
const state={operation:'load',screen:'info',returnScreen:'info',scenario:'basic',language:'it',manualLanguage:false,operations:{load:fresh(),unload:fresh()},modal:null};
const dictionary={pl:{pickup:'ZAŁADUNEK',delivery:'ROZŁADUNEK',flag:'🇵🇱'},en:{pickup:'PICKUP',delivery:'DELIVERY',flag:'🇬🇧'},de:{pickup:'BELADUNG',delivery:'ENTLADUNG',flag:'🇩🇪'},it:{pickup:'CARICO',delivery:'SCARICO',flag:'🇮🇹'}};
const flow=['info','photos','documents','seals','review'];
const flowNames=['Zlecenie i załadunek','Zdjęcia ładunku','Skany dokumentów','Plomby ładunku i CMR','Sprawdzenie i zakończenie'];
const current=()=>state.operations[state.operation];
const isLoad=()=>state.operation==='load';
const operationName=()=>isLoad()?'Załadunek':'Rozładunek';
const operationGenitive=()=>isLoad()?'załadunku':'rozładunku';
const currentPlace=()=>isLoad()?assignment.pickup:assignment.delivery;
const optional=()=>isLoad()?scenarios[state.scenario]:scenarios.basic;
const count=()=>current().actualCount||assignment.cargo.quantity||0;
const photoReady=()=>current().photos.every(Boolean);
const documentReady=()=>current().documents.length>0&&current().documentsComplete;
const sealReady=()=>count()>0&&current().seals.length===count()+1&&current().labels.every(Boolean)&&current().seals.every(Boolean);
const allReady=()=>current().started&&current().physicalConfirmed&&photoReady()&&documentReady()&&sealReady();
const progress=()=>[photoReady(),documentReady(),sealReady()];
let toastTimer,uploadTarget,focusBeforeModal,uploadBusy=false;
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3800);}
function revoke(record){if(record?.url?.startsWith('blob:'))URL.revokeObjectURL(record.url);}
function ensureSeals(){const required=count()+1;while(current().labels.length<required)current().labels.push(false);while(current().seals.length<required)current().seals.push(null);current().labels.length=required;current().seals.length=required;}
function go(screen){
  if(['photos','documents','seals','review'].includes(screen)&&(!current().started||!current().physicalConfirmed)){toast(`Najpierw potwierdź wykonanie ${operationGenitive()}.`);return;}
  if(screen==='documents'&&!photoReady()){toast('Dodaj oba zdjęcia ładunku, aby przejść dalej.');return;}
  if(screen==='seals'&&(!photoReady()||!documentReady())){toast('Najpierw uzupełnij zdjęcia i kompletny skan CMR.');return;}
  if(screen==='review'&&!allReady()){toast('Do zakończenia potrzebne są zdjęcia, pełny CMR i wszystkie plomby.');return;}
  if(screen==='chat'&&state.screen!=='chat')state.returnScreen=state.screen;
  closeModal(false);state.screen=screen;
  if(flow.includes(screen))current().step=screen;
  if(screen==='travel')current().arrived=false;
  if(screen==='info')current().arrived=true;
  render();$('#app-scroll').scrollTop=0;
}
function switchOperation(operation,screen='info'){state.operation=operation;if(!state.manualLanguage)state.language=operation==='load'?'it':'en';go(screen);}
function switchScenario(value){state.scenario=value;state.screen=current().arrived?'info':'travel';render();$('#app-scroll').scrollTop=0;}
function languageControl(){return `<label class="language-control"><span aria-hidden="true">${dictionary[state.language].flag}</span><select id="language-select" aria-label="Język nazw operacji">${Object.keys(dictionary).map(l=>`<option value="${l}" ${l===state.language?'selected':''}>${l.toUpperCase()}</option>`).join('')}</select></label>`;}
function pageHeading(travel=false){const place=currentPlace();return `<div class="operation-heading"><div><div class="overline">${esc(assignment.id)} · PUNKT ${isLoad()?'1':'2'}/2</div><h2>${operationName()} <small>${dictionary[state.language][isLoad()?'pickup':'delivery']}</small></h2></div><div class="header-tools"><a class="tool-button" href="${place.map}" target="_blank" rel="noopener" title="Mapa" aria-label="Otwórz przekazaną lokalizację na mapie">${icon('pin')}</a><a class="tool-button" href="${place.map}" target="_blank" rel="noopener" title="Nawigacja" aria-label="Otwórz punkt w Google Maps i rozpocznij nawigację">${icon('nav')}</a>${languageControl()}</div></div><div class="heading-status"><span class="badge ${travel?'orange':'green'}">${icon(travel?'route':'check')}${travel?'W drodze':'Jesteś na miejscu'}</span><span class="arrival-time">${place.country} · ${place.countryName}</span></div>`;}
function placeView(){const place=currentPlace(),data=optional();const fields=[['Brama',data.gate],['Parking',data.parking],['Magazyn',data.warehouse],['Rampa',data.ramp]].filter(([,value])=>has(value));return `<section class="panel place-panel"><div class="section-kicker">${icon('pin')} FIRMA ${isLoad()?'ZAŁADOWCY':'ODBIORCY'}</div><h3>${esc(place.company)}</h3>${has(place.address)?`<p class="address">${esc(place.address)}</p>`:''}<p class="location-caption">${esc(place.countryName)} · lokalizacja przekazana przez spedytora</p><a class="location-link" href="${place.map}" target="_blank" rel="noopener">${icon('pin')} Otwórz pinezkę Google Maps ${icon('arrow')}</a>${fields.length?`<div class="gate-chips optional-place-fields">${fields.map(([label,value])=>`<div class="gate-chip"><small>${label}</small><b>${esc(value)}</b></div>`).join('')}</div>`:''}</section>`;}
function destinationView(){const place=isLoad()?assignment.delivery:assignment.pickup;return `<section class="panel destination-panel"><div class="section-kicker">${icon('route')} ${isLoad()?'DOKĄD JEDZIE ŁADUNEK':'SKĄD PRZYJECHAŁ ŁADUNEK'} / ${dictionary[state.language][isLoad()?'delivery':'pickup']}</div><h4>${esc(place.company)}</h4><p>${esc(place.countryName)}${has(place.address)?`<br>${esc(place.address)}`:''}</p><a href="${place.map}" target="_blank" rel="noopener">Otwórz lokalizację ${icon('arrow')}</a></section>`;}
function cargoView(){const cargo=assignment.cargo,actual=count(),extra=actual>(cargo.quantity||0);const metrics=[['Liczba sztuk',has(cargo.quantity)?`${cargo.quantity} · ${cargo.unit||'sztuki'}`:null],['Faktycznie',extra?`${actual} · pozycje`:null],['Masa',has(cargo.mass)?`${cargo.mass} kg`:null],['Wymiary',cargo.dimensions]].filter(([,value])=>has(value));return `<section class="panel cargo-panel"><div class="cargo-primary"><span class="cargo-symbol">${icon('box')}</span><div><h4>${has(cargo.name)?esc(cargo.name):'Rodzaj towaru do potwierdzenia'}</h4>${cargo.demo?'<p class="demo-data-label">Przykładowy ładunek do testu procesu</p>':''}</div></div>${metrics.length?`<dl class="compact-metrics">${metrics.map(([label,value])=>`<div class="${label==='Faktycznie'?'actual-cargo-count':''}"><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`:''}</section>`;}
function optionalView(){const data=optional(),contact=data.contact&&(has(data.contact.name)||has(data.contact.phone)),notes=data.notes?.filter(has)||[],photos=data.photos||[],visible=has(data.ref)||contact||has(data.instructions)||notes.length||photos.length;if(!visible)return '';return `<div class="section-heading additional-info-heading"><h3>Dodatkowe informacje</h3><span>Tylko dla tego zlecenia</span></div><section class="panel additional-info-panel">${has(data.ref)?`<div class="additional-info-row reference-row"><span class="additional-info-icon">${icon('doc')}</span><div><small>REF ${data.refDemo?'· przykład':'załadunku'}</small><strong>${esc(data.ref)}</strong></div><button class="copy-button" id="copy-reference" aria-label="Kopiuj numer referencyjny">${icon('doc')}</button></div>`:''}${contact?`<div class="additional-info-row"><span class="additional-info-icon">${icon('phone')}</span><div class="contact-info"><small>Osoba kontaktowa</small>${has(data.contact.name)?`<strong>${esc(data.contact.name)}</strong>`:''}${has(data.contact.phone)?`<span>${esc(data.contact.phone)}</span>`:''}</div>${has(data.contact.phone)?`<a class="contact-button" href="tel:${data.contact.phone.replace(/[^+0-9]/g,'')}" aria-label="Zadzwoń do podanej osoby kontaktowej">${icon('phone')}</a>`:''}</div>`:''}${has(data.instructions)?`<div class="additional-info-row"><span class="additional-info-icon">${icon('info')}</span><div><small>Instrukcje</small><p>${esc(data.instructions)}</p></div></div>`:''}${notes.map(note=>`<div class="additional-info-row"><span class="additional-info-icon">${icon('edit')}</span><div><small>Notatka od spedytora</small><p>${esc(note)}</p></div></div>`).join('')}${photos.length?`<div class="additional-attachments"><div class="additional-attachments-title">${icon('clip')}<span><strong>Załączniki</strong><small>${photos.length} ${photos.length===1?'materiał':'materiały'}</small></span></div>${photos.map((photo,i)=>`<button data-supplied-photo="${i}" class="supplied-photo"><img src="${photo.url}" alt="${esc(photo.name)} — przykład demonstracyjny"><span><strong>${esc(photo.name)}</strong><small>${photo.demo?'Materiał demonstracyjny':'Od zleceniodawcy'}</small></span>${icon('arrow')}</button>`).join('')}</div>`:''}</section>`;}
function infoView(travel=false){const qty=assignment.cargo.quantity,actual=count(),extra=actual>(qty||0);return `<div class="app-content">${pageHeading(travel)}${placeView()}<div class="section-heading"><h3>Co odbierasz</h3></div>${cargoView()}${destinationView()}${optionalView()}${travel?`<p class="travel-info">Po przyjeździe potwierdź dotarcie. Dokumentację uzupełnisz po wykonaniu ${operationGenitive()}.</p>`:`<section class="panel loading-confirmation"><div class="section-kicker">PO FIZYCZNYM ${isLoad()?'ZAŁADUNKU':'ROZŁADUNKU'}</div>${has(qty)?`<label class="check-row"><input id="physical-confirm" type="checkbox" ${current().physicalConfirmed?'checked':''}><span>Potwierdzam, że ${isLoad()?'załadowałem':'rozładowałem'} ${actual} ${actual===1?'sztukę':actual<5?'sztuki':'sztuk'} ładunku.</span></label>${isLoad()&&!current().started?`<button class="add-cargo-piece" id="add-cargo-piece">${icon('plus')}<span><strong>Towaru jest więcej?</strong><small>Dodaj kolejną sztukę ładunku${extra?` · teraz ${actual}`:''}</small></span></button>`:''}`:`<label class="field-label" for="actual-count">Ile sztuk ${isLoad()?'załadowano':'rozładowano'}?</label><input id="actual-count" class="text-input" type="number" min="1" step="1" value="${current().actualCount||''}"><label class="check-row"><input id="physical-confirm" type="checkbox" ${current().physicalConfirmed?'checked':''}><span>Potwierdzam wykonaną operację.</span></label>`}<p>Potem dodasz zdjęcia, CMR i odczytasz plomby. ${current().started?'Wcześniej dodane materiały pozostają zapisane w tym podglądzie.':''}</p></section>`}</div>`;}
function stepHeader(screen,title,description){const index=['photos','documents','seals'].indexOf(screen);return `<div class="stage-header"><button id="stage-back" aria-label="Wróć do poprzedniego ekranu">${icon('back')}</button><div><span>${operationName()} · ${assignment.id}</span><b>KROK ${index+1} Z 3</b></div><button class="stage-chat" data-open-chat aria-label="Otwórz czat i załącz dokumenty">${icon('chat')}</button></div><div class="stage-progress" aria-label="Postęp dokumentacji">${['photos','documents','seals'].map((step,i)=>`<span class="${i===index?'current':progress()[i]?'done':''}"></span>`).join('')}</div><h2 class="stage-title">${title}</h2><p class="stage-description">${description}</p>`;}
function sourceLabel(record){return record.source==='chat'?'Dodano z czatu':record.chatSynced?'Automatycznie w czacie':record.demo?'Dodano przykład':'Dodano z tego ekranu';}
function photoCard(index){const photo=current().photos[index],title=index===0?'Cały ładunek z bliska':'Ładunek z daleka';return `<section class="panel stage-photo-card"><div class="stage-photo-title"><span class="number-circle">${index+1}</span><h3>${title}</h3>${photo?`<span class="badge green">${icon('check')} Gotowe</span>`:''}</div>${photo?`<img class="photo-preview" src="${photo.url}" alt="${title}${photo.demo?' — ilustracja demonstracyjna':''}"><div class="photo-toolbar"><span>${sourceLabel(photo)}</span><button data-photo="${index}">${icon('edit')} Zmień</button></div>`:`<button class="photo-placeholder" data-photo="${index}">${icon('camera')}<strong>Zrób lub dodaj zdjęcie</strong><small>${index===0?'Wyraźny widok wszystkich sztuk':'Cały ładunek i jego otoczenie w pojeździe'}</small></button>`}<p class="photo-instruction">${index===0?'Pokaż wszystkie sztuki ładunku i ich opakowanie. Zdjęcie ma być ostre i dobrze oświetlone.':'Cofnij się, aby pokazać cały ładunek oraz jego ustawienie w przestrzeni ładunkowej.'}</p></section>`;}
function quickSealPanel(){if(!isLoad())return '';ensureSeals();return `<section class="panel quick-seal-panel"><div class="quick-seal-heading"><span>${icon('qr')}</span><div><h3>Nakleiłeś plombę?</h3><p>Zeskanuj jej QR od razu. Kod będzie już gotowy w kroku „Plomby”.</p></div></div><div class="quick-seal-list">${Array.from({length:count()},(_,index)=>{const code=current().seals[index];return `<button data-quick-scan="${index}" class="quick-seal-button ${code?'done':''}"><span>${icon(code?'check':'box')}</span><span><strong>Sztuka ${index+1}</strong><small>${code?esc(code):'Skanuj QR plomby'}</small></span>${icon(code?'check':'qr')}</button>`;}).join('')}</div></section>`;}
function photosView(){return `<div class="app-content">${stepHeader('photos','Zdjęcia ładunku','Po załadunku wykonaj dwa ujęcia. Jeśli plomby są już naklejone, możesz od razu zeskanować ich QR.')}${[0,1].map(photoCard).join('')}${quickSealPanel()}<div class="auto-chat-hint">${icon('chat')}<span><strong>Automatycznie w czacie</strong>Każde dodane zdjęcie od razu pojawi się w czacie tego zlecenia.</span></div></div>`;}
function demoDocument(page=1){return `<div class="demo-document"><div class="document-paper"><h4>CMR</h4><p>MIĘDZYNARODOWY SAMOCHODOWY LIST PRZEWOZOWY</p><p>Cardo Roma Hotel → One World Rental Europe B.V.</p><p>Zlecenie ${assignment.id}</p><div class="paper-grid"></div><div class="paper-signature">${isLoad()?'Nadawca':'Odbiorca'} · ${page}</div></div><div class="demo-label">DOKUMENT DEMONSTRACYJNY</div></div>`;}
function documentRecordView(record,index,removable=true){return `<div class="document-page"><h4>${record.mime==='application/pdf'?'Plik PDF':`Strona ${index+1}`} ${removable?`<button data-remove-document="${index}" aria-label="Usuń ten skan">${icon('close')}</button>`:''}</h4>${record.demo?demoDocument(index+1):record.mime==='application/pdf'?`<a href="${record.url}" target="_blank" rel="noopener" class="pdf-preview">${icon('doc')}<strong>${esc(record.name)}</strong><span>Otwórz podgląd PDF ${icon('arrow')}</span></a>`:`<img class="document-image" src="${record.url}" alt="Podgląd skanu dokumentu CMR">`}<div class="document-source">${sourceLabel(record)}</div></div>`;}
function documentConfirmation(){return `<label class="check-row document-confirmation ${current().documents.length?'':'disabled'}"><input id="documents-confirm" type="checkbox" ${current().documentsComplete?'checked':''} ${current().documents.length?'':'disabled'}><span>Potwierdzam, że skan CMR jest czytelny i zawiera wszystkie strony.</span></label>`;}
function documentsView(){const records=current().documents;return `<div class="app-content">${stepHeader('documents','Skany dokumentów','Dodaj pełny, czytelny skan CMR jak najszybciej. Możesz użyć aparatu, gotowych zdjęć lub pliku PDF.')}<div class="evidence-status">${icon('check')} Zdjęcia ładunku już dodane · 2/2</div>${records.length?`<div class="evidence-status ${documentReady()?'ready':'pending'}">${icon(documentReady()?'check':'info')}${records.some(r=>r.source==='chat')?'CMR dodany z czatu — jest również tutaj.':'CMR dodany do zlecenia i automatycznie do czatu.'}</div>`:''}<section class="panel document-panel">${records.length?records.map((r,i)=>documentRecordView(r,i)).join(''):`<button class="document-placeholder" id="add-document">${icon('camera')}<strong>Zeskanuj dokument CMR</strong><small>Wszystkie strony, czytelny tekst i podpisy</small></button>`}${records.length?`<button class="secondary-button" id="add-document">${icon('plus')} Dodaj stronę lub plik</button>`:''}<p class="document-hints">Sprawdź cały dokument: krawędzie stron, numery, ostrość tekstu i podpisy.</p></section><div class="document-assertion">${documentConfirmation()}</div><button class="chat-attachment-link" data-open-chat>${icon('chat')} Możesz też załączyć CMR w czacie ${icon('arrow')}</button><div class="auto-chat-hint">${icon('chat')}<span><strong>Automatycznie w czacie</strong>Każda strona CMR lub plik PDF od razu pojawi się w czacie zlecenia.</span></div></div>`;}
function sealRow(index){const record=current(),cmr=index===count(),code=record.seals[index];return `<section class="panel seal-stage-item"><div class="seal-stage-heading"><span class="scan-item-icon">${icon(cmr?'doc':'box')}</span><div><h3>${cmr?'Plomba na CMR':`Sztuka ładunku ${index+1}`}</h3><p>${cmr?'Odrębna etykieta na dokumencie':'Etykieta na opakowaniu towaru'}</p></div>${code?`<span class="badge green">${icon('check')} Gotowe</span>`:''}</div><label class="check-row"><input type="checkbox" data-seal-label="${index}" ${record.labels[index]?'checked':''}><span>${cmr?(isLoad()?'Etykieta jest z tyłu ostatniej CMR-ki':'Sprawdzono etykietę z tyłu ostatniej CMR-ki'):(isLoad()?'Etykieta jest naklejona na opakowaniu':'Sprawdzono etykietę na opakowaniu')}</span></label><div class="seal-code-row">${code?`<strong>${esc(code)}</strong>`:'<span>Kod jeszcze nieodczytany</span>'}<button class="scan-button ${code?'scanned':''}" data-scan="${index}" ${record.labels[index]?'':'disabled'}>${icon(code?'check':'qr')}${code?'Zmień':'Skanuj QR'}</button></div></section>`;}
function sealsView(){ensureSeals();return `<div class="app-content">${stepHeader('seals','Zeskanuj plomby','Odczytaj osobny QR z każdej sztuki ładunku, a następnie odrębny QR z tyłu ostatniej CMR-ki.')}<div class="evidence-status">${icon('check')} Zdjęcia i pełny skan CMR są już uzupełnione.</div><p class="seal-warning">${isLoad()?'Jeżeli etykieta nie jest jeszcze naklejona, umieść ją na opakowaniu w widocznym miejscu. Nie naklejaj jej bezpośrednio na produkcie.':'Sprawdź etykiety przypisane do dostarczanych sztuk ładunku.'}</p><div class="seal-section-label">A. KAŻDA SZTUKA ŁADUNKU · ${count()} QR</div>${Array.from({length:count()},(_,i)=>sealRow(i)).join('')}<div class="seal-section-label">B. TYŁ OSTATNIEJ CMR-KI · 1 QR</div>${sealRow(count())}<div class="shared-hint">${icon('doc')} To odczyt plomby dokumentu. Pełnego skanu CMR nie trzeba dodawać ponownie.</div></div>`;}
function reviewView(){return `<div class="app-content"><button class="subpage-back" id="review-back">${icon('back')} Wróć do plomb</button><div class="overline">SPRAWDŹ PRZED ZAKOŃCZENIEM</div><h2 class="stage-title">Dokumentacja gotowa</h2><p class="stage-description">Wszystkie wymagane materiały są przypisane do zlecenia ${assignment.id}.</p><section class="panel review-checklist"><div>${icon('check')}<span>Dwa zdjęcia całego ładunku<small>Z bliska i z daleka</small></span><b>2/2</b></div><div>${icon('check')}<span>Pełny skan dokumentu CMR<small>${current().documents.length} ${current().documents.length===1?'plik':'pliki'} · czytelność i kompletność potwierdzone</small></span><b>OK</b></div><div>${icon('check')}<span>Plomby na każdej sztuce<small>Osobny kod dla każdej pozycji</small></span><b>${count()}/${count()}</b></div><div>${icon('check')}<span>Plomba z tyłu ostatniej CMR-ki<small>Odrębny kod dokumentu</small></span><b>1/1</b></div></section><p class="small-note">Przycisk zakończenia jest dostępny dopiero po dodaniu zdjęć, pełnego CMR i odczycie wszystkich plomb.</p></div>`;}
function chatView(){const record=current(),autoCount=[...record.photos.filter(Boolean),...record.documents].filter(r=>r.chatSynced).length;return `<div class="app-content"><div class="chat-header"><button id="chat-back" aria-label="Wróć do operacji">${icon('back')}</button><span><strong>Czat zlecenia</strong><small>${assignment.id} · spedytor</small></span><span class="badge orange">Podgląd</span></div><div class="chat-bubble"><span>Spedytor</span><p>${documentReady()&&photoReady()?'Zdjęcia i komplet CMR są już w dokumentacji tego zlecenia.':'Po załadunku dołącz dwa zdjęcia ładunku i czytelny, kompletny skan CMR.'}</p></div>${autoCount?`<div class="chat-system-note">${icon('check')} Aplikacja automatycznie dodała ${autoCount} ${autoCount===1?'materiał':'materiały'} do czatu.</div>`:''}<div class="chat-evidence-summary"><div>${icon('camera')} Zdjęcia ładunku <b>${record.photos.filter(Boolean).length}/2</b></div><div>${icon('doc')} Dokument CMR <b>${record.documents.length?`${record.documents.length} plik${record.documents.length===1?'':'i'}`:'Do dodania'}</b></div></div>${record.photos.filter(Boolean).map((r)=>`<div class="chat-file">${icon('camera')}<div><strong>${r.kind==='photo-near'?'Zdjęcie z bliska':'Zdjęcie z daleka'}</strong><small>${r.source==='chat'?'Dodano w czacie':'Automatycznie z ekranu zdjęć'} · w dokumentacji</small></div>${icon('check')}</div>`).join('')}${record.documents.map((r,i)=>`<div class="chat-file">${icon('doc')}<div><strong>CMR · ${r.mime==='application/pdf'?esc(r.name):`strona ${i+1}`}</strong><small>${r.source==='chat'?'Dodano w czacie':'Automatycznie z ekranu CMR'} · w dokumentacji</small></div>${icon('check')}</div>`).join('')}${record.documents.length?`<section class="panel chat-document-confirmation">${documentConfirmation()}</section>`:''}<div class="shared-hint">${icon('info')} Zdjęcia i CMR dodane w operacji trafiają automatycznie tutaj. Pliki dodane w czacie uzupełniają tę samą dokumentację.</div>${!record.started?`<p class="small-note">Załączniki do dokumentacji dodasz po potwierdzeniu wykonania ${operationGenitive()}.</p>`:''}</div>`;}
function successView(){return `<div class="app-content"><section class="panel completion-panel"><span class="success-icon">${icon('check')}</span><h2>${operationName()} zakończony</h2><p>${esc(currentPlace().company)}<br>Dokumentacja jest kompletna w tym podglądzie.</p><div class="summary-line">${icon('check')} Zdjęcia ładunku <b>2/2</b></div><div class="summary-line">${icon('check')} Pełny skan CMR <b>OK</b></div><div class="summary-line">${icon('check')} Plomby ładunku i CMR <b>${count()+1}/${count()+1}</b></div></section><p class="small-note">To demonstracja. Żadne pliki ani wiadomości nie zostały wysłane do rzeczywistego systemu.</p></div>`;}
function actionView(){const screen=state.screen;let text='',action='',disabled=false,back=null,caption='';
  if(screen==='travel'){text=`Dotarłem na ${isLoad()?'załadunek':'rozładunek'}`;action='arrive';}
  if(screen==='info'){text=current().started?'Przejdź do dokumentacji':`${operationName()} wykonany · dalej`;action='start';disabled=!current().physicalConfirmed||!count();caption=current().started?'Dodane materiały pozostają w dokumentacji.':'Po wykonaniu operacji potwierdź liczbę sztuk.';}
  if(screen==='photos'){text='Dalej: skany dokumentów';action='documents';disabled=!photoReady();back='info';caption=photoReady()?'Oba zdjęcia są gotowe.':`Dodaj oba ujęcia · ${current().photos.filter(Boolean).length}/2`}
  if(screen==='documents'){text='Dalej: plomby';action='seals';disabled=!documentReady();back='photos';caption=documentReady()?'CMR jest gotowy. Odczytasz teraz kody plomb.':'Dodaj pełny CMR i potwierdź jego czytelność.';}
  if(screen==='seals'){text='Dalej: sprawdź i zakończ';action='review';disabled=!allReady();back='documents';caption=`Plomby odczytane · ${current().seals.filter(Boolean).length}/${count()+1}`;}
  if(screen==='review'){text=`Zakończ ${isLoad()?'załadunek':'rozładunek'}`;action='finish';disabled=!allReady();back='seals';}
  if(screen==='chat'){text='Załącz dokumenty';action='chat-attach';disabled=!current().started||!current().physicalConfirmed;caption='CMR, zdjęcia z bliska i z daleka — ten sam komplet plików.';}
  if(screen==='success'){text=isLoad()?'Przejdź do rozładunku':'Wróć do podglądu';action='next-point';}
  return `<div class="flow-actions">${back?`<button class="flow-back" data-back="${back}" aria-label="Wróć do poprzedniego kroku">${icon('back')}</button>`:''}<button class="primary-button" id="main-action" data-action="${action}" ${disabled?'disabled':''}>${icon(action==='chat-attach'?'clip':action==='finish'?'check':'arrow')}${text}</button></div>${caption?`<p class="action-caption">${caption}</p>`:''}`;
}
function designNotes(){const done=progress();return `<h2>Najpierw ładunek.<br>Potem dokumentacja.</h2><p class="note-description">Każdy krok ma osobny ekran. Zdjęcia i CMR trafiają do czatu automatycznie, a QR plomby możesz zeskanować od razu lub uzupełnić później.</p><div class="design-progress"><div class="design-progress-title">DOKUMENTACJA<span>${done.filter(Boolean).length}/3</span></div>${['Zdjęcia z bliska i z daleka','Pełny skan dokumentu CMR','QR ładunku i ostatniej CMR-ki'].map((name,i)=>`<div class="design-step ${done[i]?'done':state.screen===['photos','documents','seals'][i]?'current':''}"><span class="design-step-num">${done[i]?icon('check'):String(i+1).padStart(2,'0')}</span><span>${name}</span></div>`).join('')}</div><div class="design-shared"><strong>Jeden komplet załączników</strong><p>Dodane w czacie → widoczne w operacji.<br>Dodane w operacji → automatycznie w czacie.</p></div>`;}
function render(){const scroll=$('#app-scroll').scrollTop;const views={info:()=>infoView(),travel:()=>infoView(true),photos:photosView,documents:documentsView,seals:sealsView,review:reviewView,chat:chatView,success:successView};$('#app').innerHTML=views[state.screen]();$('#app-action').innerHTML=actionView();$('#design-context').innerHTML=designNotes();$('#preview-label').textContent=`${operationName().toUpperCase()} / ${{info:'INFORMACJE',travel:'W DRODZE',photos:'ZDJĘCIA',documents:'DOKUMENTY',seals:'PLOMBY',review:'ZAKOŃCZENIE',chat:'CZAT',success:'GOTOWE'}[state.screen]}`;$$('[data-operation]').forEach(b=>{b.classList.toggle('active',b.dataset.operation===state.operation);b.setAttribute('aria-pressed',String(b.dataset.operation===state.operation));});$$('.screen-list [data-screen]').forEach(b=>b.classList.toggle('active',b.dataset.screen===state.screen));$('#scenario-select').value=state.scenario;$('#mobile-scenario').value=state.scenario;$$('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===(state.screen==='chat'?'chat':'now')));bindView();$('#app-scroll').scrollTop=scroll;}

function bindView(){
  if($('#language-select'))$('#language-select').onchange=e=>{state.language=e.target.value;state.manualLanguage=true;render();};
  if($('#physical-confirm'))$('#physical-confirm').onchange=e=>{current().physicalConfirmed=e.target.checked;render();};
  if($('#add-cargo-piece'))$('#add-cargo-piece').onclick=()=>{if(current().started||count()>=999)return;current().actualCount=count()+1;current().physicalConfirmed=false;current().labels=[];current().seals=[];render();toast(`Dodano kolejną sztukę. Łącznie: ${count()}.`);};
  if($('#actual-count'))$('#actual-count').onchange=e=>{const value=Number(e.target.value);if(!Number.isInteger(value)||value<1||value>999){toast('Podaj liczbę sztuk od 1 do 999.');return;}current().actualCount=value;current().labels=[];current().seals=[];current().physicalConfirmed=false;render();};
  $$('[data-photo]').forEach(b=>b.onclick=()=>openModal('attachment',{kind:b.dataset.photo==='0'?'photo-near':'photo-far',source:'step'}));
  $$('[data-quick-scan]').forEach(b=>b.onclick=()=>{const index=Number(b.dataset.quickScan);ensureSeals();current().labels[index]=true;openModal('scan',{index,quick:true});});
  if($('#add-document'))$('#add-document').onclick=()=>openModal('attachment',{kind:'cmr',source:'step'});
  if($('#documents-confirm'))$('#documents-confirm').onchange=e=>{current().documentsComplete=e.target.checked;render();};
  $$('[data-remove-document]').forEach(b=>b.onclick=()=>{const record=current().documents.splice(Number(b.dataset.removeDocument),1)[0];revoke(record);current().documentsComplete=false;render();});
  $$('[data-seal-label]').forEach(input=>input.onchange=()=>{const index=Number(input.dataset.sealLabel);current().labels[index]=input.checked;if(!input.checked)current().seals[index]=null;render();});
  $$('[data-scan]').forEach(b=>b.onclick=()=>openModal('scan',Number(b.dataset.scan)));
  $$('[data-supplied-photo]').forEach(b=>b.onclick=()=>openModal('supplied',Number(b.dataset.suppliedPhoto)));
  $$('[data-open-chat]').forEach(b=>b.onclick=()=>go('chat'));
  $$('[data-back]').forEach(b=>b.onclick=()=>go(b.dataset.back));
  if($('#stage-back'))$('#stage-back').onclick=()=>go(flow[Math.max(0,flow.indexOf(state.screen)-1)]);
  if($('#review-back'))$('#review-back').onclick=()=>go('seals');
  if($('#chat-back'))$('#chat-back').onclick=()=>go(state.returnScreen);
  if($('#copy-reference'))$('#copy-reference').onclick=async()=>{try{await navigator.clipboard.writeText(optional().ref);toast('REF został skopiowany.');}catch{openModal('copy');}};
  $('#main-action').onclick=()=>{
    const action=$('#main-action').dataset.action;
    if(action==='arrive')go('info');
    if(action==='start'){
      if(!current().physicalConfirmed||!count())return;
      current().started=true;ensureSeals();go('photos');
    }
    if(['photos','documents','seals','review'].includes(action))go(action);
    if(action==='chat-attach'&&current().started&&current().physicalConfirmed)openModal('chat-attach');
    if(action==='finish'&&allReady())openModal('finish');
    if(action==='next-point'){if(isLoad())switchOperation('unload','travel');else go('info');}
  };
}
function closeModal(restore=true){$('#modal-root').innerHTML='';state.modal=null;if(restore&&focusBeforeModal?.isConnected)focusBeforeModal.focus();}
function attachmentDescription(kind){return kind==='cmr'?'Dodaj wszystkie strony CMR. Zdjęcia dokumentu lub jeden plik PDF powinny zawierać czytelny tekst i podpisy.':kind==='photo-near'?'Pokaż cały ładunek z bliska. Wszystkie sztuki i ich opakowania powinny być dobrze widoczne.':'Pokaż cały ładunek z daleka oraz jego ustawienie w przestrzeni ładunkowej.';}
function openModal(type,target){
  const scanTarget=type==='scan'&&typeof target==='object'?target.index:target;
  const quickScan=type==='scan'&&typeof target==='object'&&target.quick;
  if(['attachment','chat-attach'].includes(type)&&(!current().started||!current().physicalConfirmed)){toast('Załączniki dodasz po potwierdzeniu wykonania operacji.');return;}
  if(type==='scan'&&((!quickScan&&(!photoReady()||!documentReady()))||!current().labels[scanTarget]))return;
  if(type==='finish'&&!allReady())return;
  if(!state.modal)focusBeforeModal=document.activeElement;
  state.modal={type,target};let title='',body='';
  if(type==='attachment'){
    title=target.kind==='cmr'?'Dodaj skan CMR':target.kind==='photo-near'?'Zdjęcie z bliska':'Zdjęcie z daleka';
    body=`<p>${attachmentDescription(target.kind)}</p>${target.kind==='cmr'?demoDocument():`<img class="photo-preview" src="${demoPhoto(target.kind==='photo-near'?0:1)}" alt="Przykładowe ujęcie ładunku — ilustracja">`}<button class="primary-button" id="choose-file">${icon('camera')}${target.kind==='cmr'?'Aparat, zdjęcia lub PDF':'Aparat lub zdjęcie z urządzenia'}</button><button class="secondary-button" id="use-demo">${target.kind==='cmr'?'Dodaj przykładową stronę':'Wypróbuj na zdjęciu przykładowym'}</button><p class="small-note">${target.source==='chat'?'Załącznik z czatu uzupełni również ekran operacji. ':''}Prototyp: wybrane pliki pozostają w tej karcie i nie są wysyłane do systemu.</p>`;
  }
  if(type==='chat-attach'){
    title='Załącz dokumenty';
    body=`<p>Wybierz rodzaj materiału. Plik od razu uzupełni odpowiedni krok tego zlecenia.</p><div class="attachment-kind-list">${[['cmr','doc','Dokument CMR',current().documents.length?'Już dodany — możesz dołączyć kolejną stronę':'Wszystkie strony lub plik PDF'],['photo-near','camera','Zdjęcie z bliska',current().photos[0]?'Już dodane — możesz je zmienić':'Cały ładunek i opakowania'],['photo-far','camera','Zdjęcie z daleka',current().photos[1]?'Już dodane — możesz je zmienić':'Cały ładunek w przestrzeni pojazdu']].map(([kind,symbol,label,hint])=>`<button data-attachment-kind="${kind}">${icon(symbol)}<span><strong>${label}</strong><small>${hint}</small></span>${icon('arrow')}</button>`).join('')}</div>`;
  }
  if(type==='scan'){
    const cmr=scanTarget===count();title=cmr?'Plomba na ostatniej CMR-ce':`Plomba · sztuka ${scanTarget+1}`;
    body=`<p>${cmr?'Zeskanuj odrębny kod QR z etykiety naklejonej na tyle ostatniej CMR-ki. Skan treści dokumentu jest już w dokumentacji.':'Skieruj aparat na etykietę fizycznie przyklejoną do opakowania tej sztuki ładunku.'}${quickScan?' Kod zostanie zapisany teraz i nie trzeba będzie skanować go ponownie.':''}</p><div class="scan-camera"><span class="scan-guide">${icon('qr')}</span><span class="demo-watermark">Podgląd skanera — odczyt symulowany</span></div><button class="primary-button" id="simulate-scan">${icon('qr')}Symuluj odczyt QR</button><label for="qr-code" class="field-label">Lub wpisz kod z etykiety</label><input id="qr-code" class="text-input" autocomplete="off" maxlength="64" placeholder="${cmr?'SS-260814-CMR':`SS-260814-${String(scanTarget+1).padStart(2,'0')}`}"><p id="qr-error" class="field-error" role="alert"></p><button class="secondary-button" id="manual-scan">Zatwierdź kod</button>`;
  }
  if(type==='supplied'){const photo=optional().photos[target];title=photo.name;body=`<img class="supplied-full-photo" src="${photo.url}" alt="${esc(photo.name)}"><p>Materiał pomocniczy od zleceniodawcy. Nie zastępuje zdjęć, które kierowca wykonuje po załadunku.</p>${photo.demo?'<p class="small-note">Zdjęcie demonstracyjne do podglądu opcjonalnej sekcji.</p>':''}`;}
  if(type==='copy'){title='Numer referencyjny';body=`<input class="text-input" value="${esc(optional().ref)}" readonly aria-label="Numer referencyjny">`;}
  if(type==='help'){
    title='Pomoc przy zleceniu';body=`<p>${assignment.id} · ${esc(currentPlace().company)}</p><div class="help-options"><button id="help-chat">${icon('chat')}Otwórz czat ze spedytorem</button>${optional().contact?.phone?`<a class="help-contact-link" href="tel:${optional().contact.phone.replace(/[^+0-9]/g,'')}">${icon('phone')}Kontakt na miejscu: ${esc(optional().contact.name)}</a>`:''}</div>`;
  }
  if(type==='finish'){
    title=`Zakończyć ${isLoad()?'załadunek':'rozładunek'}?`;
    body=`<p>Dwa zdjęcia, pełny CMR i wszystkie plomby są uzupełnione. Potwierdź zakończenie operacji.</p><div class="summary-line">${icon('check')}Zdjęcia z bliska i z daleka <b>2/2</b></div><div class="summary-line">${icon('check')}Pełny, czytelny skan CMR <b>OK</b></div><div class="summary-line">${icon('check')}Plomby każdej sztuki i ostatniej CMR-ki <b>${count()+1}/${count()+1}</b></div><button class="primary-button" id="confirm-finish">${icon('check')}Potwierdź zakończenie</button><p class="small-note">Demonstracja: nie zmieniamy statusu rzeczywistego zlecenia.</p>`;
  }
  if(type==='reset'){title='Zresetować podgląd?';body='<p>Usuniesz postęp i wybrane pliki z tej demonstracji.</p><button class="primary-button" id="confirm-reset">Zresetuj podgląd</button>';}
  $('#modal-root').innerHTML=`<div class="modal-overlay"><section class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1"><div class="modal-handle"></div><div class="modal-title"><h3 id="modal-title">${title}</h3><button class="icon-button" id="close-modal" aria-label="Zamknij">${icon('close')}</button></div>${body}</section></div>`;
  $('#close-modal').onclick=()=>closeModal();$('.modal-overlay').onclick=e=>{if(e.target.classList.contains('modal-overlay'))closeModal();};
  $$('[data-attachment-kind]').forEach(b=>b.onclick=()=>openModal('attachment',{kind:b.dataset.attachmentKind,source:'chat'}));
  if($('#choose-file'))$('#choose-file').onclick=()=>{
    uploadTarget={operation:state.operation,...target};const input=$('#file-input');input.value='';input.multiple=target.kind==='cmr';input.accept=target.kind==='cmr'?'image/*,application/pdf': 'image/*';
    if(target.kind==='cmr')input.removeAttribute('capture');else input.setAttribute('capture','environment');input.click();
  };
  if($('#use-demo'))$('#use-demo').onclick=()=>{
    let record;
    if(target.kind==='cmr'){
      let page=1;while(current().documents.some(r=>r.hash===`demo-cmr-${page}`))page++;
      record={hash:`demo-cmr-${page}`,demo:true,kind:'cmr',mime:'image/svg+xml',name:`CMR-strona-${page}`,source:target.source};
    }else record={hash:`demo-${target.kind}`,demo:true,kind:target.kind,mime:'image/svg+xml',url:demoPhoto(target.kind==='photo-near'?0:1),source:target.source};
    const added=addEvidence(state.operation,record);closeModal(false);render();if(added)toast(target.kind==='cmr'?'CMR uzupełniony w dokumentacji i czacie.':'Zdjęcie uzupełnione w dokumentacji i czacie.');
  };
  if($('#simulate-scan'))$('#simulate-scan').onclick=()=>saveQR(scanTarget,(!isLoad()&&state.operations.load.seals[scanTarget])||(scanTarget===count()?'SS-260814-CMR':`SS-260814-${String(scanTarget+1).padStart(2,'0')}`));
  if($('#manual-scan'))$('#manual-scan').onclick=()=>saveQR(scanTarget,$('#qr-code').value);
  if($('#qr-code'))$('#qr-code').onkeydown=e=>{if(e.key==='Enter')saveQR(scanTarget,e.target.value);};
  if($('#help-chat'))$('#help-chat').onclick=()=>go('chat');
  if($('#confirm-finish'))$('#confirm-finish').onclick=()=>{if(!allReady())return;current().finished=true;go('success');};
  if($('#confirm-reset'))$('#confirm-reset').onclick=()=>reset();
  $('.modal-sheet').focus();
}
function addEvidence(operation,record){
  const op=state.operations[operation];const records=[...op.photos.filter(Boolean),...op.documents];const existing=records.find(r=>r.hash===record.hash);
  if(existing){revoke(record);toast(existing.kind===record.kind?'Ten plik jest już w dokumentacji. Nie dodajemy go ponownie.':'Ten plik jest już przypisany do innego rodzaju materiału. Wybierz właściwy plik.');return false;}
  record.chatSynced=record.source!=='chat';
  if(record.kind==='cmr'){op.documents.push(record);op.documentsComplete=false;}
  else{const index=record.kind==='photo-near'?0:1;revoke(op.photos[index]);op.photos[index]=record;}
  return true;
}
function saveQR(index,raw){
  const code=raw.trim().toUpperCase();
  if(!/^[A-Z0-9][A-Z0-9._/-]{3,63}$/.test(code)){$('#qr-error').textContent='Wpisz kod z etykiety: minimum 4 znaki, bez spacji.';return;}
  const duplicate=current().seals.some((c,i)=>i!==index&&c===code);
  if(duplicate){$('#qr-error').textContent='Ten kod przypisano już do innej sztuki lub dokumentu. Każda plomba musi mieć unikalny QR.';return;}
  if(!isLoad()){
    const expected=state.operations.load.seals[index]||(index===count()?'SS-260814-CMR':`SS-260814-${String(index+1).padStart(2,'0')}`);
    if(code!==expected){$('#qr-error').textContent=`Kod nie pasuje do tej pozycji. W przykładzie oczekujemy: ${expected}.`;return;}
  }
  current().seals[index]=code;closeModal(false);render();toast(index===count()?'Plomba CMR odczytana. Pełny skan pozostaje w dokumentacji.':'Plomba przypisana do właściwej sztuki ładunku.');
}
function reset(){Object.values(state.operations).forEach(op=>[...op.photos,...op.documents].forEach(revoke));state.operations={load:fresh(),unload:fresh()};state.operation='load';state.scenario='basic';state.language='it';state.manualLanguage=false;go('info');toast('Podgląd został zresetowany.');}
async function readImage(url){return new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(true);image.onerror=()=>resolve(false);image.src=url;});}
$('#file-input').onchange=async event=>{
  const files=[...event.target.files];if(!files.length||!uploadTarget||uploadBusy)return;
  uploadBusy=true;const target={...uploadTarget};let added=0;
  try{
    for(const file of files){
      const pdf=file.type==='application/pdf'||(/\.pdf$/i.test(file.name)&&!file.type);
      if((target.kind!=='cmr'&&pdf)||(!pdf&&!file.type.startsWith('image/'))){toast('Wybierz zdjęcie, a dla CMR także plik PDF.');continue;}
      if(file.size>20*1024*1024){toast('Wybierz plik do 20 MB.');continue;}
      const bytes=await file.arrayBuffer();
      if(pdf&&new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-'){toast('Plik PDF jest nieprawidłowy. Wybierz skan dokumentu.');continue;}
      const digest=await crypto.subtle.digest('SHA-256',bytes);const hash=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
      const url=URL.createObjectURL(file);
      if(!pdf&&!await readImage(url)){URL.revokeObjectURL(url);toast('Nie udało się odczytać zdjęcia. Wybierz JPG, PNG lub WebP.');continue;}
      const record={hash,url,name:file.name,mime:pdf?'application/pdf':file.type,demo:false,kind:target.kind,source:target.source};
      if(addEvidence(target.operation,record))added++;
    }
    closeModal(false);render();if(added)toast(`Dodano ${added} ${added===1?'plik':'pliki'} do dokumentacji i czatu.`);
  }catch(error){toast('Nie udało się dodać pliku. Spróbuj ponownie.');}
  finally{uploadBusy=false;}
};
$$('[data-operation]').forEach(b=>b.onclick=()=>switchOperation(b.dataset.operation));
$$('.screen-list [data-screen]').forEach(b=>b.onclick=()=>go(b.dataset.screen));
$('#scenario-select').onchange=e=>switchScenario(e.target.value);
$('#mobile-scenario').onchange=e=>switchScenario(e.target.value);
$$('[data-nav]').forEach(b=>b.onclick=()=>{if(b.dataset.nav==='now')go(current().arrived?(current().finished?'success':current().step):'travel');if(b.dataset.nav==='chat')go('chat');if(b.dataset.nav==='help')openModal('help');});
$('#reset').onclick=()=>openModal('reset');
document.addEventListener('keydown',event=>{
  if(!state.modal)return;
  if(event.key==='Escape'){closeModal();return;}
  if(event.key==='Tab'){
    const items=$$('button:not([disabled]),a[href],input:not([disabled]),select,textarea,[tabindex="0"]',$('.modal-sheet'));
    const first=items[0],last=items.at(-1),sheet=$('.modal-sheet');
    if(event.shiftKey&&(document.activeElement===first||document.activeElement===sheet)){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===sheet)){event.preventDefault();first?.focus();}
  }
});
render();
