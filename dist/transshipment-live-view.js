'use strict';
((root,factory)=>{const api=factory(typeof module==='object'&&module.exports?require('./transshipment-ui.js'):root.SuperSpedytorTransshipmentUI,typeof module==='object'&&module.exports?require('./transshipment-media.js'):root.SuperSpedytorTransshipmentMedia);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SuperSpedytorTransshipmentLiveView=api;})(typeof window==='undefined'?null:window,(ui,media)=>{
  const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const array=value=>Array.isArray(value)?value:[];
  const text=value=>typeof value==='string'?value.trim():'';
  const icon=name=>`<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const id=value=>/^[1-9]\d{0,11}$/.test(String(value??''))?String(value):'';
  const status=value=>({pending:'Do zrobienia',todo:'Do zrobienia',in_progress:'W trakcie',completed:'Zakończone',done:'Zakończone',cancelled:'Anulowane'})[value]||'Stan do sprawdzenia';
  const photoTypes={photo_transshipment:{key:'cargo',label:'Zdjęcie całego ładunku',instruction:'Pokaż cały przekazywany ładunek z tego zlecenia.'},photo_transshipment_label:{key:'label',label:'Zdjęcie plomby z bliska',instruction:'Pokaż czytelny numer plomby na ładunku.'},photo_transshipment_cmr:{key:'cmr',label:'Zdjęcie dokumentu CMR',instruction:'Pokaż cały dokument, tak aby można było odczytać jego treść.'}};
  function dateWindow(value={}){
    const valid=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v)&&Number.isFinite(Date.parse(v));
    const format=(v,short=false)=>new Intl.DateTimeFormat('pl-PL',short?{hour:'2-digit',minute:'2-digit'}:{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v));
    if(!valid(value.start))return valid(value.end)?'Do '+format(value.end):'Termin nie został podany';
    if(!valid(value.end))return format(value.start);
    return format(value.start)+' – '+format(value.end,new Date(value.start).toDateString()===new Date(value.end).toDateString());
  }
  function blockerMessages(blocker,outgoing=false){
    if(!blocker||typeof blocker!=='object')return ['Odśwież dane przeładunku i sprawdź brakujące kroki.'];
    const messages=[];
    for(const value of array(blocker.missing_confirmations)){
      if(value==='cmr')messages.push(outgoing?'Potwierdź przekazanie dokumentu CMR.':'Potwierdź odbiór dokumentu CMR.');
      else if(value==='cargo')messages.push(outgoing?'Sprawdź plomby i potwierdź wydanie ładunku.':'Sprawdź plomby i potwierdź odbiór ładunku.');
    }
    for(const photo of array(blocker.missing_photos)){const type=photoTypes[photo?.document_type];if(type)messages.push('Dodaj: '+type.label.toLocaleLowerCase('pl-PL')+'.');}
    // Unknown server fields must never become a raw JSON dump on the phone.
    return messages.length?messages:['Sprawdź brakujące potwierdzenia i zdjęcia tego zlecenia.'];
  }
  const steps=data=>array(data?.steps).filter(s=>['release','receive'].includes(s.kind));
  // The API's confirmed fields already enforce each record's required scans.
  // Keep backend scope (including CMR any_one) and require explicit empty blockers.
  function stepReady(step){
    return Array.isArray(step.blockers)&&!step.blockers.length&&step.confirmations?.cmr===true&&step.confirmations?.cargo===true&&array(step.offers).length>0;
  }
  function canFinish(data){
    const finish=array(data?.steps).find(s=>s.kind==='finish'),items=steps(data),pointIds=array(data?.point_ids).map(id);
    return data?.status!=='completed'&&array(data?.steps).some(s=>s.kind==='arrive'&&s.status==='done')&&pointIds.length>0&&pointIds.every(Boolean)&&items.length>0&&items.every(s=>id(s.point_id)&&pointIds.includes(id(s.point_id))&&stepReady(s))&&Array.isArray(finish?.blockers)&&finish.blockers.length===0;
  }
  function nextStep(step){
    if(step.status==='done'||step.status==='completed')return 'Pokaż potwierdzenia';
    if(step.confirmations?.cmr!==true)return 'Zacznij od dokumentu CMR';
    if(array(step.pieces).some(p=>p.label_code&&!p.scanned))return 'Dalej: zeskanuj plombę sztuki';
    if(step.confirmations?.cargo!==true)return 'Dalej: potwierdź ładunek';
    const missing=array(step.blockers).flatMap(b=>array(b.missing_photos));
    if(missing.length)return 'Dalej: '+(photoTypes[missing[0]?.document_type]?.label.toLocaleLowerCase('pl-PL')||'uzupełnij zdjęcia');
    return 'Sprawdź komplet';
  }
  const notice=message=>`<section class="panel"><p role="status">${e(message)}</p></section>`;
  function meeting(data,{writable=true}={}){
    const items=steps(data),arrived=array(data.steps).some(s=>s.kind==='arrive'&&s.status==='done'),complete=data.status==='completed';
    const header=`<details class="transshipment-current-context"><summary>${icon('pin')}<span><strong>${e(data.place?.name||'Miejsce przeładunku')}</strong></span><span class="transshipment-context-toggle">Miejsce ${icon('arrow')}</span></summary><div class="transshipment-context-details"><p>${e(data.place?.address||'Adres nie został podany')}<span>${e(dateWindow(data.window))}</span></p></div></details>`;
    const cards=items.map(step=>{
      const outgoing=step.kind==='release',party=step[outgoing?'to':'from']||{},ready=stepReady(step),problems=array(step.blockers).flatMap(b=>blockerMessages(b,outgoing));
      return `<section class="panel transfer-balance-group ${outgoing?'issue':'receive'}" data-trans-step="${e(id(step.point_id))}"><header><span>${icon(outgoing?'truck':'box')}</span><div><h3>${outgoing?'Wydajesz':'Odbierasz'}</h3><p>${e(array(step.offers).join(' · ')||'Zlecenie nie zostało podane')}</p></div><b>${array(step.pieces).length} szt.</b></header>${ui.context({outgoing,vehicle:text(party.vehicle),driver:text(party.driver)||text(party.driver_name)||text(party.name)})}<div class="transshipment-live-progress"><span>${e(status(step.status))}</span><span>CMR ${array(step.cmr).filter(c=>c.scanned).length}/${array(step.cmr).length} · sztuki ${array(step.pieces).filter(p=>p.scanned).length}/${array(step.pieces).length}</span></div>${problems.length?`<details class="transshipment-live-missing"><summary>Co zostało do zrobienia</summary><ul>${[...new Set(problems)].map(p=>`<li>${e(p)}</li>`).join('')}</ul></details>`:''}${arrived||complete?`<button class="${ready?'secondary':'primary'}-button" data-trans-detail="${e(id(step.point_id))}">${icon(ready?'check':'arrow')}${e(nextStep(step))}</button>`:''}</section>`;
    }).join('');
    const footer=complete?notice('Przeładunek zakończony — potwierdzenie zapisane w TMS.'):!items.length?notice('Brak zleceń przypisanych do tego spotkania. Odśwież dane lub skontaktuj się ze spedytorem.'):!arrived?`<button class="primary-button" data-trans-arrive ${writable?'':'disabled'}>Jestem na miejscu · rozpocznij</button>`:canFinish(data)?`<section class="panel transshipment-order-done"><h3>Wszystkie kroki gotowe</h3><p>Dokumenty, ładunki i wymagane zdjęcia są potwierdzone.</p><button class="primary-button" data-trans-finish ${writable?'':'disabled'}>${icon('check')}Zakończ przeładunek</button></section>`:notice('Wykonaj wskazane kroki. Zakończenie odblokuje się po uzupełnieniu potwierdzeń i zdjęć.');
    return `<div class="app-content transshipment-guided transshipment-live">${header}${!writable?notice('Podgląd tylko do odczytu. Potwierdzenia i zdjęcia nie są wysyłane.'):''}${cards}${footer}</div>`;
  }
  function offerState(point,offer){
    const pieces=array(offer.cargo_items),scanned=new Set([...array(point.transshipment_state?.scanned_item_ids),...array(offer.scanned_item_ids)].map(String));
    const documents=array(offer.cmr_documents),cmrScansReady=offer.cmr_any_one?documents.some(c=>c.scanned===true):documents.length>0&&documents.every(c=>c.scanned===true);
    const cmrCodes=documents.filter(c=>!c.scanned).map(c=>text(c.code)).filter(Boolean);
    if(!documents.length&&text(offer.cmr_label_code))cmrCodes.push(text(offer.cmr_label_code));
    const unscanned=pieces.filter(p=>p.label_code&&!scanned.has(String(p.id))),unsealed=pieces.filter(p=>!p.label_code),outgoing=point.operation_type==='transshipment_out';
    const required=['photo_transshipment',...(!outgoing?['photo_transshipment_label']:[]),...(offer.cmr_photo_required===true||!outgoing?['photo_transshipment_cmr']:[])];
    const missing=required.filter(type=>offer.photos?.[photoTypes[type].key]!==true);
    const blocked=array(point.transshipment_state?.blockers).filter(b=>String(b.offer_id)===String(offer.id));
    const phase=!offer.cmr_confirmed_at?'cmr':unscanned.length?'piece':!offer.cargo_confirmed_at?'cargo':missing.length?'photos':blocked.length?'blocked':'done';
    return {pieces,scanned,documents,cmrCodes,cmrScansReady,unscanned,unsealed,outgoing,required,missing,blocked,phase};
  }
  function pointView(point,meetingData,{offerId,writable=true,pendingPhotos=[],cmrReview=null,cmrFiles=[],cmrError='',native=null}={}){
    const offers=array(point.transshipment_offers).filter(o=>id(o.id));
    const active=offers.find(o=>String(o.id)===String(offerId))||offers.find(o=>offerState(point,o).phase!=='done')||offers[0];
    if(!active)return `<div class="app-content transshipment-guided transshipment-live">${ui.executionHeader({backAttribute:'data-trans-back',position:'Przeładunek'})}${notice('TMS nie zwrócił listy ładunków dla tego punktu. Odśwież dane lub skontaktuj się ze spedytorem.')}</div>`;
    const s=offerState(point,active),step=steps(meetingData).find(item=>String(item.point_id)===String(point.id)),party=step?.[s.outgoing?'to':'from']||{};
    const disabled=!writable||point.status==='completed',label=s.outgoing?'Wydanie':'Odbiór';
    const scan=(kind,expected)=>`<div class="transshipment-expected-seal"><small>${kind==='cmr'?'PLOMBA CMR / KOPERTY':'PLOMBA TEJ SZTUKI'}</small><strong>${e(expected)}</strong></div><button class="scan-button transshipment-scan-button" data-trans-scan="${kind}" ${disabled?'disabled':''}>${icon('qr')}${kind==='cmr'?'Skanuj plombę CMR':'Skanuj plombę sztuki'}</button><details class="transshipment-live-manual"><summary>Nie mogę zeskanować · wpisz kod</summary><label class="lw-field">Numer plomby<input id="lw-trans-code" data-draft-field="seal" autocomplete="off" maxlength="64" ${disabled?'disabled':''}></label><button class="secondary-button" data-trans-code="${kind}" ${disabled?'disabled':''}>Sprawdź wpisany kod</button></details>`;
    let task='';
    if(s.phase==='cmr'&&cmrReview){
      task=`<section class="panel transshipment-cmr-card preview"><div class="transshipment-task-label"><span>${icon('doc')}</span><div><small>KROK 1 · ${cmrReview.code?'PLOMBA ZGODNA':'DOKUMENT'}</small><h3>Sprawdź CMR przed ${s.outgoing?'wydaniem':'odbiorem'}</h3></div></div>${cmrReview.code?`<div class="transshipment-expected-seal matched"><small>SPRAWDZONA PLOMBA CMR</small><strong>${e(cmrReview.code)}</strong></div>`:''}<div class="transshipment-cmr-preview">${media.cmrMarkup(cmrFiles,{native,error:cmrError,orderNumber:active.order_number||String(active.id)})}</div><label class="check-row"><input type="checkbox" data-trans-cmr-reviewed ${disabled||!cmrFiles.length||cmrError?'disabled':''}><span>Porównałem cały papierowy CMR ze skanem — to właściwy dokument.</span></label><button class="primary-button" data-trans-cmr-accept disabled>${icon('check')}${s.outgoing?'To ten CMR · przekazałem dokument':'Dokument odebrany · to właściwy CMR'}</button><button class="secondary-button" data-trans-cmr-cancel>Wróć do sprawdzenia plomby</button><p class="small-note">Potwierdzenie zostanie wysłane dopiero po sprawdzeniu dokumentu.</p></section>`;
    }else if(s.phase==='cmr'){
      const expected=s.cmrCodes[0],canConfirm=active.cmr_scan_required===false||s.cmrScansReady;
      task=`<section class="panel transshipment-cmr-card"><div class="transshipment-task-label"><span>${icon('doc')}</span><div><small>KROK 1 · DOKUMENT</small><h3>${s.outgoing?'Przekaż dokument CMR':'Odbierz dokument CMR'}</h3></div></div><p class="transshipment-task-copy">Sprawdź papierowy CMR zlecenia <strong>${e(active.order_number||active.id)}</strong>. ${expected?'Zgodny skan otworzy podgląd CMR. Porównaj go z papierowym dokumentem.':'Potwierdź po sprawdzeniu dokumentu.'}</p>${expected?scan('cmr',expected):canConfirm?`<button class="primary-button" data-trans-cmr="${e(active.id)}" ${disabled?'disabled':''}>${icon('doc')}Pokaż CMR do sprawdzenia</button>`:notice('Brak numeru wymaganej plomby CMR. Odśwież dane lub zgłoś brak spedytorowi.')}<div class="transshipment-locked-next">${icon('lock')} Następnie: plomby sztuk i zdjęcia.</div></section>`;
    }else if(s.phase==='piece'){
      const piece=s.unscanned[0];
      task=`<section class="panel transshipment-piece-card"><div class="transshipment-task-label"><span>${icon('box')}</span><div><small>SZTUKA ${s.pieces.indexOf(piece)+1} Z ${s.pieces.length}</small><h3>${s.outgoing?'Wydaj tę sztukę':'Odbierz tę sztukę'}</h3></div></div>${media.cargoMarkup(active)}<div class="transshipment-piece-details"><h4>${e(piece.description||piece.name||'Sztuka ładunku')}</h4><p>${e([piece.weight?piece.weight+' kg':'',[piece.length,piece.width,piece.height].every(v=>v!=null)?[piece.length,piece.width,piece.height].join(' × ')+' cm':''].filter(Boolean).join(' · '))}</p></div><p class="transshipment-task-copy">Sprawdź fizycznie tę sztukę. Skanuj plombę dopiero podczas ${s.outgoing?'wydania':'odbioru'}. Komplet zgodnych skanów zapisuje potwierdzenie ładunku.</p>${scan('piece',piece.label_code)}</section>`;
    }else if(s.phase==='cargo'){
      task=`<section class="panel transshipment-piece-card"><div class="transshipment-task-label"><span>${icon('box')}</span><div><small>KROK 2 · ŁADUNEK</small><h3>Sprawdź fizycznie ładunek</h3></div></div>${media.cargoMarkup(active)}${s.unsealed.map(p=>`<label class="check-row"><input type="checkbox" data-unsealed-piece="${e(id(p.id))}" data-draft-field="piece:${e(id(p.id))}" ${disabled?'disabled':''}><span>Sprawdziłem: ${e(p.description||p.name||'Sztuka bez plomby')}</span></label>`).join('')}${!s.pieces.length?notice('Brak listy sztuk. Odśwież dane przed potwierdzeniem ładunku.'):''}<button class="primary-button" data-trans-confirm="${e(active.id)}" ${disabled||!s.pieces.length?'disabled':''}>${icon('check')}${s.outgoing?'Potwierdzam wydanie ładunku':'Potwierdzam odbiór ładunku'}</button></section>`;
    }else if(s.phase==='photos'){
      const type=s.missing[0],photo=photoTypes[type],pending=pendingPhotos.some(p=>p.type===type&&String(p.offerId)===String(active.id));
      task=`<section class="panel transshipment-piece-card"><div class="transshipment-task-label"><span>${icon('camera')}</span><div><small>KROK 3 · ZDJĘCIA ZLECENIA</small><h3>${e(photo.label)}</h3></div></div><p class="transshipment-task-copy">${e(photo.instruction)}</p><div class="piece-photo-grid">${s.required.map(t=>`<div class="piece-photo-button ${active.photos?.[photoTypes[t].key]?'done':''}"><span class="piece-photo-icon">${icon(active.photos?.[photoTypes[t].key]?'check':'camera')}</span><span><strong>${e(photoTypes[t].label)}</strong><small>${active.photos?.[photoTypes[t].key]?'Zapisane w TMS':'Do zrobienia'}</small></span></div>`).join('')}</div>${pending?`<p>Zdjęcie jest na telefonie. Wysyłka nie została jeszcze potwierdzona.</p><button class="primary-button" data-trans-photo-retry="${e(active.id)}" data-document-type="${type}" ${disabled?'disabled':''}>Wyślij zachowane zdjęcie ponownie</button>`:''}<button class="${pending?'secondary':'primary'}-button" data-trans-photo="${e(active.id)}" data-document-type="${type}" ${disabled?'disabled':''}>${icon('camera')}${pending?'Zrób inne zdjęcie':'Zrób zdjęcie'}</button></section>`;
    }else if(s.phase==='blocked')task=notice(s.blocked.flatMap(b=>blockerMessages(b,s.outgoing)).join(' '));
    else task=`<section class="panel transshipment-order-done"><span>${icon('check')}</span><h3>${label} tego zlecenia ${s.outgoing?'gotowe':'gotowy'}</h3><p>Dokument, ładunek i wymagane zdjęcia są potwierdzone w TMS.</p><button class="primary-button" data-trans-back>${icon('arrow')}Dalej: podsumowanie przeładunku</button></section>`;
    const progress=`CMR ${active.cmr_confirmed_at?'1':'0'}/1 · sztuki ${s.pieces.filter(p=>s.scanned.has(String(p.id))).length}/${s.pieces.length}`;
    const selection=offers.length>1?`<details class="transshipment-live-manual"><summary>Zlecenia w tym przeładunku · ${offers.length}</summary>${offers.map(o=>`<button class="secondary-button" data-trans-offer-select="${e(o.id)}" ${o===active?'aria-current="true"':''}>${e(o.order_number||o.id)} · ${offerState(point,o).phase==='done'?'Gotowe':'Do sprawdzenia'}</button>`).join('')}</details>`:'';
    return `<div class="app-content transshipment-guided transshipment-live">${ui.executionHeader({backAttribute:'data-trans-back',position:`Zlecenie ${offers.indexOf(active)+1}/${offers.length}`,progress})}${ui.context({outgoing:s.outgoing,vehicle:text(party.vehicle)||(!s.outgoing?text(active.source_vehicle):''),driver:text(party.driver)||text(party.driver_name)||text(party.name),order:active.order_number||String(active.id),goods:text(active.title),pieceCount:s.pieces.length})}${!writable?notice('Podgląd tylko do odczytu. Potwierdzenia i zdjęcia nie są wysyłane.'):''}${s.phase!=='cmr'?`<details class="panel transshipment-accepted-cmr"><summary>${icon('check')}<strong>CMR potwierdzony</strong><span>Pokaż skan</span></summary><p>Potwierdzenie odczytano z TMS.</p>${media.cmrMarkup(cmrFiles,{native,error:cmrError,orderNumber:active.order_number||String(active.id)})}</details>`:''}${task}${['photos','blocked','done'].includes(s.phase)?media.cargoMarkup(active,{compact:true}):''}${selection}</div>`;
  }
  function expectedCode(point,offer,kind){const s=offerState(point,offer);return kind==='cmr'&&s.phase==='cmr'?s.cmrCodes[0]:kind==='piece'&&s.phase==='piece'?s.unscanned[0]?.label_code:null;}
  function matchingCode(raw,expected){const normal=v=>{let s=String(v??'').trim().toUpperCase();if(/^\d{1,7}$/.test(s))s='AMG'+s.padStart(7,'0');return s;};return Boolean(expected)&&normal(raw)===normal(expected);}
  return Object.freeze({dateWindow,blockerMessages,canFinish,stepReady,nextStep,meeting,offerState,pointView,expectedCode,matchingCode});
});
