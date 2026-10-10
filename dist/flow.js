'use strict';

const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const icon=name=>`<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const has=value=>value!==null&&value!==undefined&&String(value).trim()!=='';
const materialWord=value=>value===1?'materiał':(value%10>=2&&value%10<=4&&(value%100<12||value%100>14)?'materiały':'materiałów');

const pickup={company:'Cardo Roma Hotel',country:'IT',countryName:'Włochy',map:'https://maps.app.goo.gl/VHKsFNUHtNADEfki6'};
const delivery={company:'One World Rental Europe B.V.',country:'NL',countryName:'Holandia',map:'https://maps.app.goo.gl/yeTaQnNQw4w2F6YN6'};
const assignment={
  id:'SS/26/105/H',
  pickup,
  delivery,
  cargo:{name:'Sprzęt w skrzyniach transportowych',quantity:2,unit:'skrzynie',mass:240,dimensions:'120 × 80 × 100 cm / szt.',demo:true}
};
const scenarios={
  basic:{ref:null,contact:null,instructions:null,notes:[],photos:[],gate:null,parking:null,warehouse:null,ramp:null},
  contact:{ref:null,contact:{name:'oanne Herman',phone:'+44 7779651471'},instructions:'Towar jest przechowywany w „Sferze nr 1”.',notes:['Osoba kontaktowa będzie na miejscu jutro rano w celu załadunku.'],photos:[],gate:null,parking:null,warehouse:null,ramp:null},
  materials:{ref:'REF-DEMO-0814',refDemo:true,contact:{name:'oanne Herman',phone:'+44 7779651471'},instructions:'Towar jest przechowywany w „Sferze nr 1”.',notes:['Osoba kontaktowa będzie na miejscu jutro rano w celu załadunku.'],photos:[{name:'Zdjęcie miejsca odbioru',url:demoPhoto(1),demo:true},{name:'Zdjęcie przygotowanego ładunku',url:demoPhoto(0),demo:true}],gate:null,parking:null,warehouse:null,ramp:null}
};

const makePiece=(number,values={})=>({
  id:values.id||`piece-${number}-${Math.random().toString(36).slice(2,8)}`,
  name:values.name||`Skrzynia transportowa ${number}`,
  description:values.description||'Sprzęt eventowy w opakowaniu transportowym',
  mass:values.mass??120,
  dimensions:values.dimensions||'120 × 80 × 100 cm',
  label:Boolean(values.label),
  seal:values.seal||null,
  photos:{near:values.photos?.near||null,far:values.photos?.far||null}
});
const defaultPieces=()=>Array.from({length:assignment.cargo.quantity},(_,index)=>makePiece(index+1));
const fresh=(pieces=defaultPieces())=>({
  arrived:true,
  physicalConfirmed:false,
  started:false,
  items:pieces,
  cmrLabel:false,
  cmrSeal:null,
  documents:[],
  documentsComplete:false,
  finished:false,
  step:'info'
});
const state={operation:'load',screen:'info',returnScreen:'info',scenario:'basic',language:'it',manualLanguage:false,operations:{load:fresh(),unload:fresh()},modal:null};
const dictionary={pl:{pickup:'ZAŁADUNEK',delivery:'ROZŁADUNEK',flag:'🇵🇱'},en:{pickup:'PICKUP',delivery:'DELIVERY',flag:'🇬🇧'},de:{pickup:'BELADUNG',delivery:'ENTLADUNG',flag:'🇩🇪'},it:{pickup:'CARICO',delivery:'SCARICO',flag:'🇮🇹'}};
const flow=['info','photos','seals','documents','review'];

const current=()=>state.operations[state.operation];
const isLoad=()=>state.operation==='load';
const operationName=()=>isLoad()?'Załadunek':'Rozładunek';
const operationGenitive=()=>isLoad()?'załadunku':'rozładunku';
const currentPlace=()=>isLoad()?assignment.pickup:assignment.delivery;
const optional=()=>isLoad()?scenarios[state.scenario]:scenarios.basic;
const count=()=>current().items.length;
const photoRecords=operation=>operation.items.flatMap(item=>[item.photos.near,item.photos.far].filter(Boolean));
const pieceReady=item=>Boolean(item.label&&item.seal&&item.photos.near&&item.photos.far);
const cargoReady=()=>count()>0&&current().items.every(pieceReady);
const cmrSealReady=()=>Boolean(current().cmrLabel&&current().cmrSeal);
const documentReady=()=>current().documents.length>0&&current().documentsComplete;
const allReady=()=>current().started&&current().physicalConfirmed&&cargoReady()&&cmrSealReady()&&documentReady();
const progress=()=>[cargoReady(),cmrSealReady(),documentReady()];
const completedPieces=()=>current().items.filter(pieceReady).length;

let toastTimer,uploadTarget,focusBeforeModal,uploadBusy=false;

function toast(message){
  $('#toast').textContent=message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3800);
}
function revoke(record){if(record?.url?.startsWith('blob:'))URL.revokeObjectURL(record.url);}
function revokePiece(piece){revoke(piece.photos.near);revoke(piece.photos.far);}

function go(screen){
  if(['photos','seals','documents','review'].includes(screen)&&(!current().started||!current().physicalConfirmed)){
    toast(`Najpierw potwierdź wykonanie ${operationGenitive()}.`);
    return;
  }
  if(screen==='seals'&&!cargoReady()){
    toast('Najpierw przy każdej sztuce naklej i zeskanuj plombę oraz dodaj dwa zdjęcia.');
    return;
  }
  if(screen==='documents'&&(!cargoReady()||!cmrSealReady())){
    toast('Najpierw zeskanuj plombę z tyłu ostatniej pustej strony CMR.');
    return;
  }
  if(screen==='review'&&!allReady()){
    toast('Do zakończenia potrzebne są kompletne sztuki ładunku, plomba CMR i pełny skan CMR.');
    return;
  }
  if(screen==='chat'&&state.screen!=='chat')state.returnScreen=state.screen;
  closeModal(false);
  state.screen=screen;
  if(flow.includes(screen))current().step=screen;
  if(screen==='travel')current().arrived=false;
  if(screen==='info')current().arrived=true;
  render();
  $('#app-scroll').scrollTop=0;
}
function switchOperation(operation,screen='info'){
  state.operation=operation;
  if(!state.manualLanguage)state.language=operation==='load'?'it':'en';
  go(screen);
}
function switchScenario(value){
  state.scenario=value;
  state.screen=current().arrived?'info':'travel';
  render();
  $('#app-scroll').scrollTop=0;
}
function languageControl(){
  return `<label class="language-control"><span aria-hidden="true">${dictionary[state.language].flag}</span><select id="language-select" aria-label="Język nazw operacji">${Object.keys(dictionary).map(language=>`<option value="${language}" ${language===state.language?'selected':''}>${language.toUpperCase()}</option>`).join('')}</select></label>`;
}
function pageHeading(travel=false){
  const place=currentPlace();
  return `<div class="operation-heading"><div><div class="overline">${esc(assignment.id)} · PUNKT ${isLoad()?'1':'2'}/2</div><h2>${operationName()}</h2></div><div class="header-tools"><a class="tool-button" href="${place.map}" target="_blank" rel="noopener" title="Mapa" aria-label="Otwórz przekazaną lokalizację na mapie">${icon('pin')}</a><a class="tool-button" href="${place.map}" target="_blank" rel="noopener" title="Nawigacja" aria-label="Otwórz punkt w Google Maps i rozpocznij nawigację">${icon('nav')}</a>${languageControl()}</div></div><div class="heading-status"><span class="badge ${travel?'orange':'green'}">${icon(travel?'route':'check')}${travel?'W drodze':'Jesteś na miejscu'}</span><span class="arrival-time">${place.country} · ${place.countryName}</span></div>`;
}
function placeView(){
  const place=currentPlace(),data=optional();
  const fields=[['Brama',data.gate],['Parking',data.parking],['Magazyn',data.warehouse],['Rampa',data.ramp]].filter(([,value])=>has(value));
  return `<section class="panel place-panel"><div class="section-kicker">${icon('pin')} FIRMA ${isLoad()?'ZAŁADOWCY':'ODBIORCY'}</div><h3>${esc(place.company)}</h3>${has(place.address)?`<p class="address">${esc(place.address)}</p>`:''}<p class="location-caption">${esc(place.countryName)} · lokalizacja przekazana przez spedytora</p><a class="location-link" href="${place.map}" target="_blank" rel="noopener">${icon('pin')} Otwórz pinezkę Google Maps ${icon('arrow')}</a>${fields.length?`<div class="gate-chips optional-place-fields">${fields.map(([label,value])=>`<div class="gate-chip"><small>${label}</small><b>${esc(value)}</b></div>`).join('')}</div>`:''}</section>`;
}
function destinationView(){
  const place=isLoad()?assignment.delivery:assignment.pickup;
  return `<section class="panel destination-panel"><div class="section-kicker">${icon('route')} ${isLoad()?'DOKĄD JEDZIE ŁADUNEK':'SKĄD PRZYJECHAŁ ŁADUNEK'} / ${dictionary[state.language][isLoad()?'delivery':'pickup']}</div><h4>${esc(place.company)}</h4><p>${esc(place.countryName)}${has(place.address)?`<br>${esc(place.address)}`:''}</p><a href="${place.map}" target="_blank" rel="noopener">Otwórz lokalizację ${icon('arrow')}</a></section>`;
}
function cargoView(){
  const planned=assignment.cargo.quantity,actual=count(),different=actual!==planned;
  const metrics=[['W zleceniu',`${planned} · ${assignment.cargo.unit}`],['Faktycznie',different?`${actual} · ${actual===1?'sztuka':actual<5?'sztuki':'sztuk'}`:null],['Masa zlecenia',`${assignment.cargo.mass} kg`]].filter(([,value])=>has(value));
  return `<section class="panel cargo-panel"><div class="cargo-primary"><span class="cargo-symbol">${icon('box')}</span><div><h4>${esc(assignment.cargo.name)}</h4><p class="demo-data-label">Każda sztuka będzie dokumentowana osobno</p></div></div><dl class="compact-metrics">${metrics.map(([label,value])=>`<div class="${label==='Faktycznie'?'actual-cargo-count':''}"><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl></section>`;
}
function optionalView(){
  const data=optional(),contact=data.contact&&(has(data.contact.name)||has(data.contact.phone)),notes=data.notes?.filter(has)||[],photos=data.photos||[];
  const visible=has(data.ref)||contact||has(data.instructions)||notes.length||photos.length;
  if(!visible)return '';
  return `<div class="section-heading additional-info-heading"><h3>Dodatkowe informacje</h3><span>Tylko dla tego zlecenia</span></div><section class="panel additional-info-panel">${has(data.ref)?`<div class="additional-info-row reference-row"><span class="additional-info-icon">${icon('doc')}</span><div><small>REF ${data.refDemo?'· przykład':'załadunku'}</small><strong>${esc(data.ref)}</strong></div><button class="copy-button" id="copy-reference" aria-label="Kopiuj numer referencyjny">${icon('doc')}</button></div>`:''}${contact?`<div class="additional-info-row"><span class="additional-info-icon">${icon('phone')}</span><div class="contact-info"><small>Osoba kontaktowa</small>${has(data.contact.name)?`<strong>${esc(data.contact.name)}</strong>`:''}${has(data.contact.phone)?`<span>${esc(data.contact.phone)}</span>`:''}</div>${has(data.contact.phone)?`<a class="contact-button" href="tel:${data.contact.phone.replace(/[^+0-9]/g,'')}" aria-label="Zadzwoń do podanej osoby kontaktowej">${icon('phone')}</a>`:''}</div>`:''}${has(data.instructions)?`<div class="additional-info-row"><span class="additional-info-icon">${icon('info')}</span><div><small>Instrukcje</small><p>${esc(data.instructions)}</p></div></div>`:''}${notes.map(note=>`<div class="additional-info-row"><span class="additional-info-icon">${icon('edit')}</span><div><small>Notatka od spedytora</small><p>${esc(note)}</p></div></div>`).join('')}${photos.length?`<div class="additional-attachments"><div class="additional-attachments-title">${icon('clip')}<span><strong>Załączniki</strong><small>${photos.length} ${photos.length===1?'materiał':'materiały'}</small></span></div>${photos.map((photo,index)=>`<button data-supplied-photo="${index}" class="supplied-photo"><img src="${photo.url}" alt="${esc(photo.name)} — przykład demonstracyjny"><span><strong>${esc(photo.name)}</strong><small>${photo.demo?'Materiał demonstracyjny':'Od zleceniodawcy'}</small></span>${icon('arrow')}</button>`).join('')}</div>`:''}</section>`;
}
function pieceSummary(piece,index,editable=true){
  const details=[has(piece.description)?piece.description:null,has(piece.mass)?`${piece.mass} kg`:null,piece.dimensions].filter(has);
  return `<div class="cargo-piece-summary"><span class="piece-index">${index+1}</span><div><strong>${esc(piece.name)}</strong><small>${details.map(esc).join(' · ')}</small></div>${editable?`<div class="piece-summary-actions"><button data-edit-piece="${index}" aria-label="Edytuj szczegóły sztuki ${index+1}">${icon('edit')}</button><button data-remove-piece="${index}" aria-label="Usuń sztukę ${index+1}" ${count()===1?'disabled':''}>${icon('close')}</button></div>`:''}</div>`;
}
function piecesManager(){
  const editable=!current().started;
  return `<div class="cargo-items-manager"><div class="cargo-items-title"><span>Faktyczne sztuki ładunku</span><b>${count()}</b></div>${current().items.map((piece,index)=>pieceSummary(piece,index,editable)).join('')}${editable?`<div class="cargo-count-actions"><button id="add-cargo-piece">${icon('plus')}<span><strong>Towaru jest więcej?</strong><small>Dodaj sztukę i jej szczegóły</small></span></button><button id="remove-last-piece" ${count()===1?'disabled':''}>${icon('close')}<span><strong>Towaru jest mniej?</strong><small>Usuń ostatnią sztukę</small></span></button></div>`:''}</div>`;
}
function infoView(travel=false){
  return `<div class="app-content">${pageHeading(travel)}${placeView()}<div class="section-heading"><h3>Co odbierasz</h3></div>${cargoView()}${destinationView()}${optionalView()}${travel?`<p class="travel-info">Po przyjeździe potwierdź dotarcie. Każdą sztukę udokumentujesz osobno po wykonaniu ${operationGenitive()}.</p>`:`<section class="panel loading-confirmation"><div class="section-kicker">PO FIZYCZNYM ${isLoad()?'ZAŁADUNKU':'ROZŁADUNKU'}</div>${piecesManager()}<label class="check-row"><input id="physical-confirm" type="checkbox" ${current().physicalConfirmed?'checked':''}><span>Potwierdzam, że ${isLoad()?'załadowałem':'rozładowałem'} ${count()} ${count()===1?'sztukę':count()<5?'sztuki':'sztuk'} ładunku.</span></label><p>Po potwierdzeniu przejdziesz przez każdą sztukę: plomba, QR, zdjęcie z bliska i zdjęcie z daleka.</p></section>`}</div>`;
}
function stepHeader(screen,title,description){
  const steps=['photos','seals','documents'],index=steps.indexOf(screen);
  return `<div class="stage-header"><button id="stage-back" aria-label="Wróć do poprzedniego ekranu">${icon('back')}</button><div><span>${operationName()} · ${assignment.id}</span><b>KROK ${index+1} Z 3</b></div><button class="stage-chat" data-open-chat aria-label="Otwórz czat i dokumentację">${icon('chat')}</button></div><div class="stage-progress" aria-label="Postęp dokumentacji">${steps.map((step,stepIndex)=>`<span class="${stepIndex===index?'current':progress()[stepIndex]?'done':''}"></span>`).join('')}</div><h2 class="stage-title">${title}</h2><p class="stage-description">${description}</p>`;
}
function sourceLabel(record){return record.source==='chat'?'Dodano z czatu':record.chatSynced?'Automatycznie w czacie':record.demo?'Dodano przykład':'Dodano z tego ekranu';}

function piecePhotoButton(piece,index,side){
  const photo=piece.photos[side],near=side==='near',title=near?'Zdjęcie z bliska':'Zdjęcie z daleka',enabled=Boolean(piece.seal);
  return `<button class="piece-photo-button ${photo?'done':''}" data-piece-photo="${index}" data-photo-side="${side}" ${enabled?'':'disabled'}>${photo?`<img src="${photo.url}" alt="${title} · ${esc(piece.name)}">`:`<span class="piece-photo-icon">${icon('camera')}</span>`}<span><strong>${title}</strong><small>${photo?sourceLabel(photo):enabled?'Zrób lub dodaj zdjęcie':'Najpierw zeskanuj plombę'}</small></span>${photo?icon('check'):icon('arrow')}</button>`;
}
function pieceTaskCard(piece,index){
  const taskCount=[piece.label,piece.seal,piece.photos.near,piece.photos.far].filter(Boolean).length;
  return `<section class="panel piece-task-card ${pieceReady(piece)?'complete':''}"><div class="piece-task-heading"><span class="piece-index">${index+1}</span><div><h3>${esc(piece.name)}</h3><p>${[piece.description,has(piece.mass)?`${piece.mass} kg`:null,piece.dimensions].filter(has).map(esc).join(' · ')}</p></div><span class="piece-task-progress">${taskCount}/4</span></div><div class="piece-seal-line"><label class="check-row"><input type="checkbox" data-piece-label="${index}" ${piece.label?'checked':''}><span>${isLoad()?'Plomba jest naklejona na opakowaniu':'Plomba na opakowaniu została sprawdzona'}</span></label><div class="seal-code-row">${piece.seal?`<strong>${esc(piece.seal)}</strong>`:'<span>Kod jeszcze nieodczytany</span>'}<button class="scan-button ${piece.seal?'scanned':''}" data-piece-scan="${index}" ${piece.label?'':'disabled'}>${icon(piece.seal?'check':'qr')}${piece.seal?'Zmień':'Skanuj QR'}</button></div></div><div class="piece-photo-grid">${piecePhotoButton(piece,index,'near')}${piecePhotoButton(piece,index,'far')}</div>${pieceReady(piece)?`<div class="piece-complete-note">${icon('check')} Sztuka ${index+1} ma komplet dokumentacji</div>`:''}</section>`;
}
function piecesView(){
  return `<div class="app-content">${stepHeader('photos','Każda sztuka osobno','Dla każdej sztuki zachowaj kolejność: naklej plombę, zeskanuj QR, zrób zdjęcie z bliska i zdjęcie z daleka.')}<div class="piece-sequence-note"><span>1</span> Plomba <b>→</b><span>2</span> QR <b>→</b><span>3</span> Zdjęcie z bliska <b>→</b><span>4</span> Zdjęcie z daleka</div>${current().items.map(pieceTaskCard).join('')}<div class="auto-chat-hint">${icon('chat')}<span><strong>Automatycznie w czacie</strong>Zdjęcia każdej sztuki od razu pojawią się w czacie zlecenia.</span></div></div>`;
}
function cmrSealView(){
  return `<div class="app-content">${stepHeader('seals','Plomba ostatniej strony CMR','Po udokumentowaniu wszystkich sztuk przygotuj ostatnią pustą stronę CMR, naklej plombę na jej tyle i zeskanuj QR.')}<div class="evidence-status">${icon('check')} Wszystkie sztuki ładunku są gotowe · ${count()}/${count()}</div><section class="panel cmr-seal-card"><div class="cmr-seal-illustration"><span>${icon('doc')}</span><span class="cmr-sticker">QR</span></div><div class="section-kicker">TYŁ OSTATNIEJ PUSTEJ STRONY CMR</div><h3>Naklej osobną plombę na dokument</h3><p>To nie jest skan treści CMR. Najpierw naklej etykietę na tył ostatniej pustej strony i zapisz jej kod QR.</p><label class="check-row"><input id="cmr-label" type="checkbox" ${current().cmrLabel?'checked':''}><span>${isLoad()?'Plomba jest naklejona na tylnej stronie CMR':'Plomba na tylnej stronie CMR została sprawdzona'}</span></label><div class="seal-code-row">${current().cmrSeal?`<strong>${esc(current().cmrSeal)}</strong>`:'<span>Kod plomby CMR nieodczytany</span>'}<button class="scan-button ${current().cmrSeal?'scanned':''}" id="scan-cmr-seal" ${current().cmrLabel?'':'disabled'}>${icon(current().cmrSeal?'check':'qr')}${current().cmrSeal?'Zmień':'Skanuj QR'}</button></div></section><div class="shared-hint">${icon('info')} Dopiero po zapisaniu QR przejdziesz do skanu wypełnionego dokumentu CMR.</div></div>`;
}
function demoDocument(page=1){
  return `<div class="demo-document"><div class="document-paper"><h4>CMR</h4><p>MIĘDZYNARODOWY SAMOCHODOWY LIST PRZEWOZOWY</p><p>Cardo Roma Hotel → One World Rental Europe B.V.</p><p>Zlecenie ${assignment.id}</p><div class="paper-grid"></div><div class="paper-signature">${isLoad()?'Nadawca':'Odbiorca'} · ${page}</div></div><div class="demo-label">DOKUMENT DEMONSTRACYJNY</div></div>`;
}
function documentRecordView(record,index,removable=true){
  return `<div class="document-page"><h4>${record.mime==='application/pdf'?'Plik PDF':`Strona ${index+1}`} ${removable?`<button data-remove-document="${index}" aria-label="Usuń ten skan">${icon('close')}</button>`:''}</h4>${record.demo?demoDocument(index+1):record.mime==='application/pdf'?`<a href="${record.url}" target="_blank" rel="noopener" class="pdf-preview">${icon('doc')}<strong>${esc(record.name)}</strong><span>Otwórz podgląd PDF ${icon('arrow')}</span></a>`:`<img class="document-image" src="${record.url}" alt="Podgląd skanu dokumentu CMR">`}<div class="document-source">${sourceLabel(record)}</div></div>`;
}
function documentConfirmation(){
  return `<label class="check-row document-confirmation ${current().documents.length?'':'disabled'}"><input id="documents-confirm" type="checkbox" ${current().documentsComplete?'checked':''} ${current().documents.length?'':'disabled'}><span>Potwierdzam, że skan CMR jest czytelny i zawiera wszystkie strony.</span></label>`;
}
function documentsView(){
  const records=current().documents;
  return `<div class="app-content">${stepHeader('documents','Skan dokumentu CMR','Plomba dokumentu jest już zapisana. Teraz dołącz pełny, czytelny skan wypełnionego CMR.')}<div class="evidence-status">${icon('check')} Plomba ostatniej strony CMR · ${esc(current().cmrSeal)}</div>${records.length?`<div class="evidence-status ${documentReady()?'ready':'pending'}">${icon(documentReady()?'check':'info')}${records.some(record=>record.source==='chat')?'CMR dodany z czatu — jest również tutaj.':'CMR dodany do zlecenia i automatycznie do czatu.'}</div>`:''}<section class="panel document-panel">${records.length?records.map((record,index)=>documentRecordView(record,index)).join(''):`<button class="document-placeholder" id="add-document">${icon('camera')}<strong>Zeskanuj dokument CMR</strong><small>Wszystkie strony, czytelny tekst i podpisy</small></button>`}${records.length?`<button class="secondary-button" id="add-document">${icon('plus')} Dodaj stronę lub plik</button>`:''}<p class="document-hints">Sprawdź cały dokument: krawędzie stron, numery, ostrość tekstu i podpisy.</p></section><div class="document-assertion">${documentConfirmation()}</div><button class="chat-attachment-link" data-open-chat>${icon('chat')} Możesz też załączyć CMR w czacie ${icon('arrow')}</button><div class="auto-chat-hint">${icon('chat')}<span><strong>Automatycznie w czacie</strong>Każda strona CMR lub plik PDF od razu pojawi się w czacie zlecenia.</span></div></div>`;
}
function reviewView(){
  const photoTotal=count()*2;
  return `<div class="app-content"><button class="subpage-back" id="review-back">${icon('back')} Wróć do skanu CMR</button><div class="overline">SPRAWDŹ PRZED ZAKOŃCZENIEM</div><h2 class="stage-title">Dokumentacja gotowa</h2><p class="stage-description">Wymagana kolejność została wykonana dla zlecenia ${assignment.id}.</p><section class="panel review-checklist"><div>${icon('check')}<span>Sztuki ładunku<small>Każda ma plombę, QR oraz zdjęcie z bliska i z daleka</small></span><b>${count()}/${count()}</b></div><div>${icon('check')}<span>Zdjęcia sztuk ładunku<small>Dwa osobne ujęcia każdej pozycji</small></span><b>${photoTotal}/${photoTotal}</b></div><div>${icon('check')}<span>Plomba ostatniej strony CMR<small>Odrębny kod dokumentu · ${esc(current().cmrSeal)}</small></span><b>1/1</b></div><div>${icon('check')}<span>Pełny skan dokumentu CMR<small>${current().documents.length} ${current().documents.length===1?'plik':'pliki'} · kompletność potwierdzona</small></span><b>OK</b></div></section><p class="small-note">Zakończenie jest dostępne dopiero po wykonaniu całej sekwencji: sztuki ładunku → plomba CMR → skan CMR.</p></div>`;
}
function chatView(){
  const record=current(),photos=photoRecords(record),autoCount=[...photos,...record.documents].filter(item=>item.chatSynced).length;
  return `<div class="app-content"><div class="chat-header"><button id="chat-back" aria-label="Wróć do operacji">${icon('back')}</button><span><strong>Czat zlecenia</strong><small>${assignment.id} · spedytor</small></span><span class="badge orange">Podgląd</span></div><div class="chat-bubble"><span>Spedytor</span><p>${allReady()?'Dokumentacja wszystkich sztuk, plomba CMR i skan CMR są kompletne.':'Najpierw udokumentuj każdą sztukę, następnie plombę CMR, a na końcu dołącz skan CMR.'}</p></div>${autoCount?`<div class="chat-system-note">${icon('check')} Aplikacja automatycznie dodała ${autoCount} ${materialWord(autoCount)} do czatu.</div>`:''}<div class="chat-evidence-summary"><div>${icon('camera')} Zdjęcia sztuk <b>${photos.length}/${count()*2}</b></div><div>${icon('doc')} Dokument CMR <b>${record.documents.length?`${record.documents.length} plik${record.documents.length===1?'':'i'}`:'Do dodania'}</b></div></div>${record.items.flatMap((piece,pieceIndex)=>['near','far'].map(side=>({piece,pieceIndex,side,photo:piece.photos[side]})).filter(item=>item.photo)).map(({piece,pieceIndex,side,photo})=>`<div class="chat-file">${icon('camera')}<div><strong>Sztuka ${pieceIndex+1} · ${side==='near'?'z bliska':'z daleka'}</strong><small>${esc(piece.name)} · ${photo.source==='chat'?'dodano w czacie':'automatycznie z operacji'}</small></div>${icon('check')}</div>`).join('')}${record.documents.map((document,index)=>`<div class="chat-file">${icon('doc')}<div><strong>CMR · ${document.mime==='application/pdf'?esc(document.name):`strona ${index+1}`}</strong><small>${document.source==='chat'?'Dodano w czacie':'Automatycznie z ekranu CMR'} · w dokumentacji</small></div>${icon('check')}</div>`).join('')}${record.documents.length?`<section class="panel chat-document-confirmation">${documentConfirmation()}</section>`:''}<div class="shared-hint">${icon('info')} Zdjęcia poszczególnych sztuk i skany CMR trafiają automatycznie tutaj.</div>${!record.started?`<p class="small-note">Załączniki dodasz po potwierdzeniu wykonania ${operationGenitive()}.</p>`:''}</div>`;
}
function successView(){
  return `<div class="app-content"><section class="panel completion-panel"><span class="success-icon">${icon('check')}</span><h2>${operationName()} zakończony</h2><p>${esc(currentPlace().company)}<br>Dokumentacja jest kompletna w tym podglądzie.</p><div class="summary-line">${icon('check')} Sztuki ładunku <b>${count()}/${count()}</b></div><div class="summary-line">${icon('check')} Zdjęcia każdej sztuki <b>${count()*2}/${count()*2}</b></div><div class="summary-line">${icon('check')} Plomba tylnej strony CMR <b>OK</b></div><div class="summary-line">${icon('check')} Pełny skan CMR <b>OK</b></div></section><p class="small-note">To demonstracja. Żadne pliki ani wiadomości nie zostały wysłane do rzeczywistego systemu.</p></div>`;
}
function actionView(){
  const screen=state.screen;
  let text='',action='',disabled=false,back=null,caption='';
  if(screen==='travel'){text=`Dotarłem na ${isLoad()?'załadunek':'rozładunek'}`;action='arrive';}
  if(screen==='info'){text=current().started?'Przejdź do dokumentacji':`${operationName()} wykonany · dalej`;action='start';disabled=!current().physicalConfirmed||!count();caption=current().started?'Dodane materiały pozostają w dokumentacji.':'Sprawdź liczbę i szczegóły każdej sztuki.';}
  if(screen==='photos'){text='Dalej: plomba CMR';action='seals';disabled=!cargoReady();back='info';caption=cargoReady()?'Każda sztuka ma pełny komplet.':`Gotowe sztuki · ${completedPieces()}/${count()}`;}
  if(screen==='seals'){text='Dalej: skan CMR';action='documents';disabled=!cmrSealReady();back='photos';caption=cmrSealReady()?'Plomba CMR jest zapisana.':'Naklej i zeskanuj plombę ostatniej pustej strony CMR.';}
  if(screen==='documents'){text='Dalej: sprawdź i zakończ';action='review';disabled=!documentReady();back='seals';caption=documentReady()?'Pełny CMR jest gotowy.':'Dodaj pełny CMR i potwierdź jego czytelność.';}
  if(screen==='review'){text=`Zakończ ${isLoad()?'załadunek':'rozładunek'}`;action='finish';disabled=!allReady();back='documents';}
  if(screen==='chat'){text='Załącz dokumenty';action='chat-attach';disabled=!current().started||!current().physicalConfirmed;caption='Zdjęcia są przypisane do konkretnych sztuk; CMR pozostaje osobnym dokumentem.';}
  if(screen==='success'){text=isLoad()?'Przejdź do rozładunku':'Wróć do podglądu';action='next-point';}
  return `<div class="flow-actions">${back?`<button class="flow-back" data-back="${back}" aria-label="Wróć do poprzedniego kroku">${icon('back')}</button>`:''}<button class="primary-button" id="main-action" data-action="${action}" ${disabled?'disabled':''}>${icon(action==='chat-attach'?'clip':action==='finish'?'check':'arrow')}${text}</button></div>${caption?`<p class="action-caption">${caption}</p>`:''}`;
}

function designNotes(){
  const done=progress(),names=['Każda sztuka: plomba, QR i dwa zdjęcia','Plomba tylnej strony ostatniej CMR','Pełny skan dokumentu CMR'],screens=['photos','seals','documents'];
  return `<h2>Najpierw plomba.<br>Potem CMR.</h2><p class="note-description">Każda sztuka przechodzi własną sekwencję. Dopiero po niej kierowca zabezpiecza ostatnią stronę CMR i dosyła skan dokumentu.</p><div class="design-progress"><div class="design-progress-title">DOKUMENTACJA<span>${done.filter(Boolean).length}/3</span></div>${names.map((name,index)=>`<div class="design-step ${done[index]?'done':state.screen===screens[index]?'current':''}"><span class="design-step-num">${done[index]?icon('check'):String(index+1).padStart(2,'0')}</span><span>${name}</span></div>`).join('')}</div><div class="design-shared"><strong>Zdjęcia przypisane do sztuk</strong><p>Każda pozycja ma własną plombę, QR oraz ujęcie z bliska i z daleka.</p></div>`;
}

function render(){
  const scroll=$('#app-scroll').scrollTop;
  const views={info:()=>infoView(),travel:()=>infoView(true),photos:piecesView,seals:cmrSealView,documents:documentsView,review:reviewView,chat:chatView,success:successView};
  $('#app').innerHTML=views[state.screen]();
  $('#app-action').innerHTML=actionView();
  $('#design-context').innerHTML=designNotes();
  $('#preview-label').textContent=`${operationName().toUpperCase()} / ${{info:'INFORMACJE',travel:'W DRODZE',photos:'SZTUKI ŁADUNKU',seals:'PLOMBA CMR',documents:'SKAN CMR',review:'ZAKOŃCZENIE',chat:'CZAT',success:'GOTOWE'}[state.screen]}`;
  $$('[data-operation]').forEach(button=>{button.classList.toggle('active',button.dataset.operation===state.operation);button.setAttribute('aria-pressed',String(button.dataset.operation===state.operation));});
  $$('.screen-list [data-screen]').forEach(button=>button.classList.toggle('active',button.dataset.screen===state.screen));
  $('#scenario-select').value=state.scenario;
  $('#mobile-scenario').value=state.scenario;
  $$('[data-nav]').forEach(button=>button.classList.toggle('active',button.dataset.nav===(state.screen==='chat'?'chat':'now')));
  bindView();
  $('#app-scroll').scrollTop=scroll;
}

function removePiece(index){
  if(current().started||count()===1)return;
  const [piece]=current().items.splice(index,1);
  revokePiece(piece);
  current().physicalConfirmed=false;
  render();
  toast(`Usunięto sztukę. Pozostało: ${count()}.`);
}

function bindView(){
  if($('#language-select'))$('#language-select').onchange=event=>{state.language=event.target.value;state.manualLanguage=true;render();};
  if($('#physical-confirm'))$('#physical-confirm').onchange=event=>{current().physicalConfirmed=event.target.checked;render();};
  if($('#add-cargo-piece'))$('#add-cargo-piece').onclick=()=>openModal('piece-form',{index:null});
  if($('#remove-last-piece'))$('#remove-last-piece').onclick=()=>removePiece(count()-1);
  $$('[data-edit-piece]').forEach(button=>button.onclick=()=>openModal('piece-form',{index:Number(button.dataset.editPiece)}));
  $$('[data-remove-piece]').forEach(button=>button.onclick=()=>removePiece(Number(button.dataset.removePiece)));
  $$('[data-piece-label]').forEach(input=>input.onchange=()=>{
    const piece=current().items[Number(input.dataset.pieceLabel)];
    if(!input.checked&&(piece.seal||piece.photos.near||piece.photos.far)){
      input.checked=true;
      toast('Plomba ma już dokumentację. Możesz ponownie zeskanować jej QR.');
      return;
    }
    piece.label=input.checked;
    render();
  });
  $$('[data-piece-scan]').forEach(button=>button.onclick=()=>openModal('scan',{kind:'piece',index:Number(button.dataset.pieceScan)}));
  $$('[data-piece-photo]').forEach(button=>button.onclick=()=>{
    const pieceIndex=Number(button.dataset.piecePhoto),side=button.dataset.photoSide;
    openModal('attachment',{kind:side==='near'?'photo-near':'photo-far',pieceIndex,source:'step'});
  });
  if($('#cmr-label'))$('#cmr-label').onchange=event=>{
    if(!event.target.checked&&current().cmrSeal){event.target.checked=true;toast('Kod plomby CMR jest już zapisany. Możesz zeskanować go ponownie.');return;}
    current().cmrLabel=event.target.checked;
    render();
  };
  if($('#scan-cmr-seal'))$('#scan-cmr-seal').onclick=()=>openModal('scan',{kind:'cmr'});
  if($('#add-document'))$('#add-document').onclick=()=>openModal('attachment',{kind:'cmr',source:'step'});
  if($('#documents-confirm'))$('#documents-confirm').onchange=event=>{current().documentsComplete=event.target.checked;render();};
  $$('[data-remove-document]').forEach(button=>button.onclick=()=>{const record=current().documents.splice(Number(button.dataset.removeDocument),1)[0];revoke(record);current().documentsComplete=false;render();});
  $$('[data-supplied-photo]').forEach(button=>button.onclick=()=>openModal('supplied',Number(button.dataset.suppliedPhoto)));
  $$('[data-open-chat]').forEach(button=>button.onclick=()=>go('chat'));
  $$('[data-back]').forEach(button=>button.onclick=()=>go(button.dataset.back));
  if($('#stage-back'))$('#stage-back').onclick=()=>go(flow[Math.max(0,flow.indexOf(state.screen)-1)]);
  if($('#review-back'))$('#review-back').onclick=()=>go('documents');
  if($('#chat-back'))$('#chat-back').onclick=()=>go(state.returnScreen);
  if($('#copy-reference'))$('#copy-reference').onclick=async()=>{try{await navigator.clipboard.writeText(optional().ref);toast('REF został skopiowany.');}catch{openModal('copy');}};
  $('#main-action').onclick=()=>{
    const action=$('#main-action').dataset.action;
    if(action==='arrive')go('info');
    if(action==='start'){
      if(!current().physicalConfirmed||!count())return;
      current().started=true;
      go('photos');
    }
    if(['photos','seals','documents','review'].includes(action))go(action);
    if(action==='chat-attach'&&current().started&&current().physicalConfirmed)openModal('chat-attach');
    if(action==='finish'&&allReady())openModal('finish');
    if(action==='next-point'){
      if(isLoad()){
        state.operations.unload=fresh(state.operations.load.items.map((piece,index)=>makePiece(index+1,{name:piece.name,description:piece.description,mass:piece.mass,dimensions:piece.dimensions})));
        switchOperation('unload','travel');
      }else go('info');
    }
  };
}

function closeModal(restore=true){
  $('#modal-root').innerHTML='';
  state.modal=null;
  if(restore&&focusBeforeModal?.isConnected)focusBeforeModal.focus();
}
function attachmentDescription(kind,piece){
  if(kind==='cmr')return 'Dodaj wszystkie strony wypełnionego CMR. Zdjęcia dokumentu lub jeden plik PDF powinny zawierać czytelny tekst i podpisy.';
  return kind==='photo-near'?`Pokaż z bliska całą sztukę „${piece.name}”, jej opakowanie i naklejoną plombę.`:`Pokaż z daleka całą sztukę „${piece.name}” oraz jej ustawienie w przestrzeni ładunkowej.`;
}

function attachmentChoices(){
  const pieceChoices=current().items.flatMap((piece,index)=>[
    {kind:'photo-near',icon:'camera',label:`Sztuka ${index+1} · z bliska`,hint:piece.photos.near?'Już dodane — możesz zmienić':piece.seal?'Dodaj zdjęcie':'Najpierw zeskanuj plombę',pieceIndex:index,disabled:!piece.seal},
    {kind:'photo-far',icon:'camera',label:`Sztuka ${index+1} · z daleka`,hint:piece.photos.far?'Już dodane — możesz zmienić':piece.seal?'Dodaj zdjęcie':'Najpierw zeskanuj plombę',pieceIndex:index,disabled:!piece.seal}
  ]);
  const choices=[...pieceChoices,{kind:'cmr',icon:'doc',label:'Dokument CMR',hint:current().documents.length?'Już dodany — możesz dołączyć kolejną stronę':cmrSealReady()?'Wszystkie strony lub plik PDF':'Najpierw zeskanuj plombę CMR',disabled:!cmrSealReady()}];
  return choices.map(choice=>`<button data-attachment-kind="${choice.kind}" ${choice.pieceIndex!==undefined?`data-attachment-piece="${choice.pieceIndex}"`:''} ${choice.disabled?'disabled':''}>${icon(choice.icon)}<span><strong>${esc(choice.label)}</strong><small>${esc(choice.hint)}</small></span>${icon('arrow')}</button>`).join('');
}

function openModal(type,target){
  if(type==='piece-form'&&current().started)return;
  if(type==='attachment'){
    if(!current().started||!current().physicalConfirmed){toast('Załączniki dodasz po potwierdzeniu wykonania operacji.');return;}
    if(target.kind==='cmr'&&!cmrSealReady()){toast('Najpierw naklej i zeskanuj plombę ostatniej strony CMR.');return;}
    if(target.kind!=='cmr'&&!current().items[target.pieceIndex]?.seal){toast('Najpierw naklej i zeskanuj plombę tej sztuki.');return;}
  }
  if(type==='chat-attach'&&(!current().started||!current().physicalConfirmed)){toast('Załączniki dodasz po potwierdzeniu wykonania operacji.');return;}
  if(type==='scan'){
    const allowed=target.kind==='cmr'?current().cmrLabel:current().items[target.index]?.label;
    if(!allowed)return;
  }
  if(type==='finish'&&!allReady())return;
  if(!state.modal)focusBeforeModal=document.activeElement;
  state.modal={type,target};
  let title='',body='';

  if(type==='piece-form'){
    const editing=target.index!==null,item=editing?current().items[target.index]:null;
    title=editing?'Edytuj szczegóły sztuki':'Dodaj sztukę ładunku';
    body=`<p>Każda sztuka otrzyma własną plombę, QR i dwa zdjęcia.</p><label class="field-label" for="piece-name">Nazwa lub rodzaj sztuki *</label><input id="piece-name" class="text-input" maxlength="80" value="${esc(item?.name||'')}" placeholder="np. Skrzynia transportowa 3"><label class="field-label" for="piece-description">Opis zawartości</label><textarea id="piece-description" class="text-input piece-textarea" maxlength="180" placeholder="np. Sprzęt eventowy w opakowaniu">${esc(item?.description||'')}</textarea><div class="piece-form-grid"><label><span class="field-label">Waga w kg</span><input id="piece-mass" class="text-input" type="number" min="0" step="0.1" value="${has(item?.mass)?esc(item.mass):''}" placeholder="120"></label><label><span class="field-label">Wymiary</span><input id="piece-dimensions" class="text-input" maxlength="60" value="${esc(item?.dimensions||'')}" placeholder="120 × 80 × 100 cm"></label></div><p id="piece-error" class="field-error" role="alert"></p><button class="primary-button" id="save-piece">${icon(editing?'check':'plus')}${editing?'Zapisz szczegóły':'Dodaj sztukę'}</button>`;
  }
  if(type==='attachment'){
    const piece=target.kind==='cmr'?null:current().items[target.pieceIndex];
    title=target.kind==='cmr'?'Dodaj skan CMR':target.kind==='photo-near'?`Sztuka ${target.pieceIndex+1} · z bliska`:`Sztuka ${target.pieceIndex+1} · z daleka`;
    body=`<p>${esc(attachmentDescription(target.kind,piece))}</p>${target.kind==='cmr'?demoDocument():`<img class="photo-preview" src="${demoPhoto(target.kind==='photo-near'?0:1)}" alt="Przykładowe ujęcie ładunku — ilustracja">`}<button class="primary-button" id="choose-file">${icon('camera')}${target.kind==='cmr'?'Aparat, zdjęcia lub PDF':'Aparat lub zdjęcie z urządzenia'}</button><button class="secondary-button" id="use-demo">${target.kind==='cmr'?'Dodaj przykładową stronę':'Wypróbuj na zdjęciu przykładowym'}</button><p class="small-note">${target.source==='chat'?'Załącznik z czatu uzupełni również ekran operacji. ':''}Prototyp: wybrane pliki pozostają w tej karcie i nie są wysyłane do systemu.</p>`;
  }
  if(type==='chat-attach'){
    title='Załącz dokumenty';
    body=`<p>Wybierz konkretną sztukę i ujęcie albo dokument CMR. Kolejność procesu nadal obowiązuje.</p><div class="attachment-kind-list">${attachmentChoices()}</div>`;
  }
  if(type==='scan'){
    const cmr=target.kind==='cmr',piece=cmr?null:current().items[target.index];
    title=cmr?'Plomba ostatniej strony CMR':`Plomba · sztuka ${target.index+1}`;
    body=`<p>${cmr?'Zeskanuj kod QR z etykiety naklejonej na tyle ostatniej pustej strony CMR.':`Skieruj aparat na etykietę fizycznie przyklejoną do opakowania sztuki „${esc(piece.name)}”.`}</p><div class="scan-camera"><span class="scan-guide">${icon('qr')}</span><span class="demo-watermark">Podgląd skanera — odczyt symulowany</span></div><button class="primary-button" id="simulate-scan">${icon('qr')}Symuluj odczyt QR</button><label for="qr-code" class="field-label">Lub wpisz kod z etykiety</label><input id="qr-code" class="text-input" autocomplete="off" maxlength="64" placeholder="${cmr?'SS-260814-CMR':`SS-260814-${String(target.index+1).padStart(2,'0')}`}"><p id="qr-error" class="field-error" role="alert"></p><button class="secondary-button" id="manual-scan">Zatwierdź kod</button>`;
  }
  if(type==='supplied'){
    const photo=optional().photos[target];
    title=photo.name;
    body=`<img class="supplied-full-photo" src="${photo.url}" alt="${esc(photo.name)}"><p>Materiał pomocniczy od zleceniodawcy. Nie zastępuje zdjęć wykonywanych przez kierowcę dla każdej sztuki.</p>${photo.demo?'<p class="small-note">Zdjęcie demonstracyjne do podglądu opcjonalnej sekcji.</p>':''}`;
  }
  if(type==='copy'){title='Numer referencyjny';body=`<input class="text-input" value="${esc(optional().ref)}" readonly aria-label="Numer referencyjny">`;}
  if(type==='help'){
    title='Pomoc przy zleceniu';
    body=`<p>${assignment.id} · ${esc(currentPlace().company)}</p><div class="help-options"><button id="help-chat">${icon('chat')}Otwórz czat ze spedytorem</button>${optional().contact?.phone?`<a class="help-contact-link" href="tel:${optional().contact.phone.replace(/[^+0-9]/g,'')}">${icon('phone')}Kontakt na miejscu: ${esc(optional().contact.name)}</a>`:''}</div>`;
  }
  if(type==='finish'){
    title=`Zakończyć ${isLoad()?'załadunek':'rozładunek'}?`;
    body=`<p>Każda sztuka ma plombę, QR i dwa zdjęcia. Plomba ostatniej strony CMR oraz pełny skan dokumentu są gotowe.</p><div class="summary-line">${icon('check')}Sztuki ładunku <b>${count()}/${count()}</b></div><div class="summary-line">${icon('check')}Zdjęcia każdej sztuki <b>${count()*2}/${count()*2}</b></div><div class="summary-line">${icon('check')}Plomba ostatniej strony CMR <b>OK</b></div><div class="summary-line">${icon('check')}Pełny skan CMR <b>OK</b></div><button class="primary-button" id="confirm-finish">${icon('check')}Potwierdź zakończenie</button><p class="small-note">Demonstracja: nie zmieniamy statusu rzeczywistego zlecenia.</p>`;
  }
  if(type==='reset'){title='Zresetować podgląd?';body='<p>Usuniesz postęp i wybrane pliki z tej demonstracji.</p><button class="primary-button" id="confirm-reset">Zresetuj podgląd</button>';}

  $('#modal-root').innerHTML=`<div class="modal-overlay"><section class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1"><div class="modal-handle"></div><div class="modal-title"><h3 id="modal-title">${title}</h3><button class="icon-button" id="close-modal" aria-label="Zamknij">${icon('close')}</button></div>${body}</section></div>`;
  $('#close-modal').onclick=()=>closeModal();
  $('.modal-overlay').onclick=event=>{if(event.target.classList.contains('modal-overlay'))closeModal();};
  $$('[data-attachment-kind]').forEach(button=>button.onclick=()=>openModal('attachment',{kind:button.dataset.attachmentKind,pieceIndex:button.dataset.attachmentPiece!==undefined?Number(button.dataset.attachmentPiece):undefined,source:'chat'}));
  if($('#save-piece'))$('#save-piece').onclick=()=>savePiece(target.index);
  if($('#choose-file'))$('#choose-file').onclick=()=>{
    uploadTarget={operation:state.operation,...target};
    const input=$('#file-input');
    input.value='';
    input.multiple=target.kind==='cmr';
    input.accept=target.kind==='cmr'?'image/*,application/pdf':'image/*';
    if(target.kind==='cmr')input.removeAttribute('capture');else input.setAttribute('capture','environment');
    input.click();
  };
  if($('#use-demo'))$('#use-demo').onclick=()=>{
    let record;
    if(target.kind==='cmr'){
      let page=1;
      while(current().documents.some(item=>item.hash===`demo-cmr-${page}`))page++;
      record={hash:`demo-cmr-${page}`,demo:true,kind:'cmr',mime:'image/svg+xml',name:`CMR-strona-${page}`,source:target.source};
    }else{
      const piece=current().items[target.pieceIndex];
      record={hash:`demo-${target.kind}-${piece.id}`,demo:true,kind:target.kind,pieceIndex:target.pieceIndex,mime:'image/svg+xml',url:demoPhoto(target.kind==='photo-near'?0:1),source:target.source};
    }
    const added=addEvidence(state.operation,record);
    closeModal(false);
    render();
    if(added)toast(target.kind==='cmr'?'CMR uzupełniony w dokumentacji i czacie.':'Zdjęcie sztuki uzupełnione w dokumentacji i czacie.');
  };
  if($('#simulate-scan'))$('#simulate-scan').onclick=()=>{
    const fallback=target.kind==='cmr'?'SS-260814-CMR':`SS-260814-${String(target.index+1).padStart(2,'0')}`;
    const loadCode=target.kind==='cmr'?state.operations.load.cmrSeal:state.operations.load.items[target.index]?.seal;
    saveQR(target,(!isLoad()&&loadCode)||fallback);
  };
  if($('#manual-scan'))$('#manual-scan').onclick=()=>saveQR(target,$('#qr-code').value);
  if($('#qr-code'))$('#qr-code').onkeydown=event=>{if(event.key==='Enter')saveQR(target,event.target.value);};
  if($('#help-chat'))$('#help-chat').onclick=()=>go('chat');
  if($('#confirm-finish'))$('#confirm-finish').onclick=()=>{if(!allReady())return;current().finished=true;go('success');};
  if($('#confirm-reset'))$('#confirm-reset').onclick=()=>reset();
  $('.modal-sheet').focus();
}

function savePiece(index){
  const name=$('#piece-name').value.trim(),description=$('#piece-description').value.trim(),massRaw=$('#piece-mass').value.trim(),dimensions=$('#piece-dimensions').value.trim();
  if(!name){$('#piece-error').textContent='Podaj nazwę lub rodzaj sztuki ładunku.';return;}
  const mass=massRaw===''?null:Number(massRaw);
  if(mass!==null&&(!Number.isFinite(mass)||mass<0)){$('#piece-error').textContent='Waga musi być liczbą równą lub większą od zera.';return;}
  if(index===null){
    current().items.push(makePiece(count()+1,{name,description,mass,dimensions}));
    toast(`Dodano sztukę. Łącznie: ${count()}.`);
  }else{
    Object.assign(current().items[index],{name,description,mass,dimensions});
    toast('Zapisano szczegóły sztuki.');
  }
  current().physicalConfirmed=false;
  closeModal(false);
  render();
}

function allEvidence(operation){return [...photoRecords(operation),...operation.documents];}
function addEvidence(operationNameValue,record){
  const operation=state.operations[operationNameValue],existing=allEvidence(operation).find(item=>item.hash===record.hash);
  if(existing){
    revoke(record);
    toast(existing.kind===record.kind?'Ten plik jest już w dokumentacji. Nie dodajemy go ponownie.':'Ten plik jest już przypisany do innego materiału. Wybierz właściwy plik.');
    return false;
  }
  record.chatSynced=record.source!=='chat';
  if(record.kind==='cmr'){
    operation.documents.push(record);
    operation.documentsComplete=false;
  }else{
    const piece=operation.items[record.pieceIndex],side=record.kind==='photo-near'?'near':'far';
    revoke(piece.photos[side]);
    piece.photos[side]=record;
  }
  return true;
}

function saveQR(target,raw){
  const code=raw.trim().toUpperCase();
  if(!/^[A-Z0-9][A-Z0-9._/-]{3,63}$/.test(code)){$('#qr-error').textContent='Wpisz kod z etykiety: minimum 4 znaki, bez spacji.';return;}
  const used=[...current().items.map(item=>item.seal),current().cmrSeal];
  const ownIndex=target.kind==='cmr'?count():target.index;
  if(used.some((value,index)=>index!==ownIndex&&value===code)){$('#qr-error').textContent='Ten kod przypisano już do innej sztuki lub dokumentu. Każda plomba musi mieć unikalny QR.';return;}
  if(!isLoad()){
    const expected=target.kind==='cmr'?state.operations.load.cmrSeal:state.operations.load.items[target.index]?.seal;
    if(expected&&code!==expected){$('#qr-error').textContent=`Kod nie pasuje do tej pozycji. W przykładzie oczekujemy: ${expected}.`;return;}
  }
  if(target.kind==='cmr')current().cmrSeal=code;else current().items[target.index].seal=code;
  closeModal(false);
  render();
  toast(target.kind==='cmr'?'Plomba ostatniej strony CMR została odczytana.':'Plomba została przypisana do tej sztuki ładunku.');
}

function reset(){
  Object.values(state.operations).forEach(operation=>{operation.items.forEach(revokePiece);operation.documents.forEach(revoke);});
  state.operations={load:fresh(),unload:fresh()};
  state.operation='load';
  state.scenario='basic';
  state.language='it';
  state.manualLanguage=false;
  go('info');
  toast('Podgląd został zresetowany.');
}

async function readImage(url){return new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(true);image.onerror=()=>resolve(false);image.src=url;});}

$('#file-input').onchange=async event=>{
  const files=[...event.target.files];
  if(!files.length||!uploadTarget||uploadBusy)return;
  uploadBusy=true;
  const target={...uploadTarget};
  let added=0;
  try{
    for(const file of files){
      const pdf=file.type==='application/pdf'||(/\.pdf$/i.test(file.name)&&!file.type);
      if((target.kind!=='cmr'&&pdf)||(!pdf&&!file.type.startsWith('image/'))){toast('Wybierz zdjęcie, a dla CMR także plik PDF.');continue;}
      if(file.size>20*1024*1024){toast('Wybierz plik do 20 MB.');continue;}
      const bytes=await file.arrayBuffer();
      if(pdf&&new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-'){toast('Plik PDF jest nieprawidłowy. Wybierz skan dokumentu.');continue;}
      const digest=await crypto.subtle.digest('SHA-256',bytes),hash=[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
      const url=URL.createObjectURL(file);
      if(!pdf&&!await readImage(url)){URL.revokeObjectURL(url);toast('Nie udało się odczytać zdjęcia. Wybierz JPG, PNG lub WebP.');continue;}
      const record={hash,url,name:file.name,mime:pdf?'application/pdf':file.type,demo:false,kind:target.kind,pieceIndex:target.pieceIndex,source:target.source};
      if(addEvidence(target.operation,record))added++;
    }
    closeModal(false);
    render();
    if(added)toast(`Dodano ${added} ${added===1?'plik':'pliki'} do dokumentacji i czatu.`);
  }catch(error){toast('Nie udało się dodać pliku. Spróbuj ponownie.');}
  finally{uploadBusy=false;}
};

$$('[data-operation]').forEach(button=>button.onclick=()=>switchOperation(button.dataset.operation));
$$('.screen-list [data-screen]').forEach(button=>button.onclick=()=>go(button.dataset.screen));
$('#scenario-select').onchange=event=>switchScenario(event.target.value);
$('#mobile-scenario').onchange=event=>switchScenario(event.target.value);
$$('[data-nav]').forEach(button=>button.onclick=()=>{
  if(button.dataset.nav==='now')go(current().arrived?(current().finished?'success':current().step):'travel');
  if(button.dataset.nav==='chat')go('chat');
  if(button.dataset.nav==='help')openModal('help');
});
$('#reset').onclick=()=>openModal('reset');
document.addEventListener('keydown',event=>{
  if(!state.modal)return;
  if(event.key==='Escape'){closeModal();return;}
  if(event.key==='Tab'){
    const items=$$('button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select,[tabindex="0"]',$('.modal-sheet'));
    const first=items[0],last=items.at(-1),sheet=$('.modal-sheet');
    if(event.shiftKey&&(document.activeElement===first||document.activeElement===sheet)){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===sheet)){event.preventDefault();first?.focus();}
  }
});

render();
