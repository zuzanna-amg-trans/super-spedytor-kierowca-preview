'use strict';

(function expose(root){
  function create(options){
    const model=root.SuperSpedytorVehicleCustody,{snapshot,icon,esc,onChange}=options;
    const state=model.create(snapshot,options.role||'issue');
    let screen='list',selectedId=null,page=0,zoom=false,error='',draftScan=null,pdfOpened=false,generation=0;
    let draft={kind:'cargo',orderId:'',name:'',expectedSeal:''};
    const current=()=>model.items(state).find(item=>item.id===selectedId);
    const active=()=>document.querySelector('[data-custody-protocol]')?.dataset.custodyProtocol===state.protocolId;
    function redraw(){onChange();const scroll=document.querySelector('#app-scroll');if(scroll)scroll.scrollTop=0;}
    function go(value,id=null){if(screen==='add'&&value!=='add'&&draftScan){root.SuperSpedytorScanner?.release(draftScan);draftScan=null;}if(value==='add')draft={kind:'cargo',orderId:'',name:'',expectedSeal:''};generation++;screen=value;selectedId=id;page=0;zoom=false;error='';pdfOpened=false;redraw();}
    const errors={SEAL_MISMATCH:'Ten QR nie pasuje do wskazanej pozycji. Sprawdź właściwy ładunek lub CMR.',CMR_PAGES_REQUIRED:'Obejrzyj wszystkie strony dokumentu przed potwierdzeniem.',DISCREPANCY_NOTE_REQUIRED:'Wpisz, czego brakuje i co ustalono przy aucie.',EXTRA_FIELDS_REQUIRED:'Podaj zlecenie, nazwę i numer plomby.',DUPLICATE_SEAL:'Ta plomba już jest na liście. Nie dopisuj tej samej pozycji ponownie.',CONTENT_NOT_CHECKED:'Sprawdź każdą sztukę i każdy CMR albo odnotuj brak.',EMPTY_NOT_CONFIRMED:'Potwierdź osobno brak ładunku i CMR-ów w aucie.',DISCREPANCIES_NOT_CONFIRMED:'Potwierdź zapis braków i dopisanych pozycji jako rozbieżności.',MANIFEST_UNAVAILABLE:'Brakuje listy zawartości przypisanej do tego auta.',VEHICLE_NOT_SIGNED:'Najpierw podpisz protokół stanu auta.'};
    function result(verdict){if(!verdict.ok){error=errors[verdict.reason]||'Nie można potwierdzić tej pozycji.';redraw();return false;}error='';return true;}
    function row(item){
      const check=state.checks[item.id];
      return `<article class="vc-item ${check?.status||''}"><div class="vc-item-heading">${icon(item.kind==='cmr'?'doc':'box')}<div><small>${esc(item.orderId)}${item.source==='driver-reported'?' · DOPISANE PRZEZ KIEROWCĘ':''}</small><strong>${esc(item.name)}</strong><p>${item.kind==='cmr'?`${item.pages} str. CMR`:'1 sztuka ładunku'} · ${esc(item.expectedSeal)}</p></div></div>${check?.status==='missing'?`<p class="vc-discrepancy">Brak: ${esc(check.note)}</p>`:check?.status==='confirmed'?'<p class="vc-matched">Sprawdzone przy aucie</p>':'<p class="vc-pending">Do sprawdzenia przy aucie</p>'}<div class="vc-row-actions"><button data-vc-scan="${esc(item.id)}">${icon(item.kind==='cmr'&&check?.status==='confirmed'?'doc':'qr')}${item.kind==='cmr'&&check?.status==='confirmed'?'Skan CMR':check?.status==='confirmed'?'Sprawdź ponownie':'Skanuj QR'}</button><button data-vc-missing="${esc(item.id)}">${check?.status==='missing'?'Popraw opis braku':'Brakuje'}</button></div></article>`;
    }
    function list(){
      const counts=model.progress(state),items=model.items(state);
      return `<div class="vc-signed">${icon('check')}<span>Protokół stanu auta podpisany<strong>${esc(state.actor.displayName)} · ${esc(snapshot.vehicle.registration)}</strong></span></div><span class="hv2-eyebrow">OSTATNI ETAP · ZAWARTOŚĆ AUTA</span><h2 class="hv2-title">Teraz ładunek i CMR-y</h2><p class="hv2-description">${state.role==='receive'?'Sprawdź, co faktycznie odbierasz razem z autem.':'Sprawdź, co zostawiasz w przekazywanym aucie.'} Każda sztuka i jej dokument należą do właściwego zlecenia.</p><div class="vc-counts"><span>Ładunki<strong>${counts.cargo.confirmed}/${counts.cargo.total} szt.</strong></span><span>CMR-y<strong>${counts.cmr.confirmed}/${counts.cmr.total}</strong></span></div>${['cargo','cmr'].map(kind=>`<section class="vc-group"><h3>${kind==='cargo'?'Ładunki na aucie':'Dokumenty CMR w aucie'}</h3>${items.filter(item=>item.kind===kind).map(row).join('')||'<p class="vc-empty">Brak pozycji na liście.</p>'}</section>`).join('')}<button class="hv2-capture vc-add" data-vc-add>${icon('plus')}Dodaj ładunek lub CMR</button>${!items.length?'<label class="hv2-confirm"><input type="checkbox" id="vc-empty"><span>Sprawdziłem auto: nie ma na nim ładunków ani dokumentów CMR.</span></label>':''}${counts.missing||counts.extra?`<section class="vc-exception"><h3>Rozbieżności w protokole</h3><p>Braki: ${counts.missing}. Dopisane pozycje: ${counts.extra}. Dodatkowy towar lub CMR nie zastępuje brakującej pozycji z planu.</p><label class="hv2-confirm"><input id="vc-discrepancies" type="checkbox" ${state.discrepanciesConfirmed?'checked':''}><span>Potwierdzam zapis tych rozbieżności. Wymagają wyjaśnienia z planem.</span></label></section>`:''}<p class="small-note">Ładunek zostaje w tym pojeździe. Ten etap nie jest fizycznym przeładunkiem do drugiego auta.</p>`;
    }
    function scanView(){
      const item=current();
      return `<span class="hv2-eyebrow">${item.kind==='cmr'?'SPRAWDŹ DOKUMENT':'SPRAWDŹ JEDNĄ SZTUKĘ'}</span><h2 class="hv2-title">${esc(item.name)}</h2><p class="hv2-description">${esc(item.orderId)} · auto ${esc(snapshot.vehicle.registration)}</p><div class="vc-expected"><small>OCZEKIWANA PLOMBA</small><strong>${esc(item.expectedSeal)}</strong></div><label class="vc-label" for="vc-code">Odczyt QR lub numer plomby</label><input id="vc-code" class="text-input" autocomplete="off" maxlength="64" placeholder="Zeskanuj lub wpisz numer">${options.nativeQr?'<button class="hv2-capture" data-vc-native-qr>Odczytaj QR aparatem</button>':''}${options.demo?'<button class="hv2-demo-button" data-vc-demo-code>Użyj zgodnego QR · demo</button>':''}<p class="hv2-photo-tip">${item.kind==='cmr'?'Po zgodnym QR pokażemy cały skan. Osobno potwierdzisz papierowy CMR.':'Porównaj sztukę i plombę przy aucie. Potwierdzenie dotyczy tylko tej sztuki.'}</p>`;
    }
    function documentView(){
      const item=current(),check=state.checks[item.id],scan=item.scan;
      const url=scan?scan.url:options.cmrPageUrl(item.order,page);
      return `<span class="hv2-eyebrow">CMR · ${esc(item.orderId)}</span><h2 class="hv2-title">Sprawdź cały dokument</h2><p class="hv2-description">Auto ${esc(snapshot.vehicle.registration)} · plomba ${esc(item.expectedSeal)}. Porównaj skan z oryginałem.</p>${scan?.mime==='application/pdf'?`<a class="hv2-capture" href="${esc(url)}" target="_blank" rel="noopener" data-vc-pdf>Otwórz cały PDF · ${item.pages} str.</a><label class="hv2-confirm"><input id="vc-pdf-reviewed" type="checkbox"><span>Obejrzałem wszystkie strony tego PDF i porównałem je z oryginałem.</span></label>`:`<div class="vc-pages"><button data-vc-page="${page-1}" ${page===0?'disabled':''} aria-label="Poprzednia strona CMR">${icon('back')}</button><b>Strona ${page+1} z ${item.pages}</b><button data-vc-page="${page+1}" ${page>=item.pages-1?'disabled':''} aria-label="Następna strona CMR">${icon('arrow')}</button><button data-vc-zoom>${zoom?'Dopasuj':'Powiększ'}</button></div><div class="vc-document ${zoom?'zoomed':''}" tabindex="0"><img data-vc-image src="${esc(url||'')}" alt="Cały CMR ${esc(item.orderId)}, strona ${page+1}"></div>`}<p class="vc-review-count" aria-live="polite">Obejrzane strony: ${check?.reviewedPages?.length||0}/${item.pages}</p><p class="small-note">Skan QR i podgląd nie potwierdzają przejęcia dokumentu.</p>`;
    }
    function addView(){return `<span class="hv2-eyebrow">POZYCJA DOPISANA PRZY AUCIE</span><h2 class="hv2-title">Dodaj do protokołu</h2><p class="hv2-description">Dopisana pozycja pozostanie oznaczona do wyjaśnienia. Nie zmieni automatycznie planu w systemie.</p><label class="vc-label" for="vc-kind">Rodzaj</label><select id="vc-kind" class="text-input"><option value="cargo">Jedna sztuka ładunku</option><option value="cmr">Dokument CMR</option></select><label class="vc-label" for="vc-order">Numer zlecenia</label><input id="vc-order" class="text-input" maxlength="80"><label class="vc-label" for="vc-name">Nazwa ładunku lub numer CMR</label><input id="vc-name" class="text-input" maxlength="100"><label class="vc-label" for="vc-seal">Numer plomby / QR</label><input id="vc-seal" class="text-input" maxlength="64"><p class="small-note">Dodaj osobno każdą sztukę i każdy dokument CMR — nawet gdy należą do tego samego zlecenia.</p><button class="hv2-capture" data-vc-add-scan>${icon('doc')}${draftScan?'Zmień dołączony skan CMR':'Dołącz skan CMR · opcjonalnie'}</button>${draftScan?'<p class="vc-matched">Pełny skan został dołączony do dopisywanego dokumentu.</p>':''}`;}
    function view(){
      if(state.completedAt){const p=model.progress(state);return `<section class="hv2-saved"><span>${icon('check')}</span><h2>Protokół ${p.missing||p.extra?'z rozbieżnościami':'gotowy'}</h2><p>${esc(snapshot.vehicle.registration)} · ${state.role==='receive'?'Odbiór':'Wydanie'}<br>${esc(state.actor.displayName)}</p><div class="vc-counts"><span>Sprawdzone ładunki<strong>${p.cargo.confirmed}/${p.cargo.total}</strong></span><span>Sprawdzone CMR-y<strong>${p.cmr.confirmed}/${p.cmr.total}</strong></span></div><p>Podpis stanu auta i kontrola zawartości zapisane osobno.</p>${p.missing||p.extra?`<p class="vc-discrepancy">Braki: ${p.missing} · dopisane: ${p.extra}. Pozostają do wyjaśnienia.</p>`:''}<p class="small-note">Zapis lokalny w DEMO · potwierdzenie TMS oczekuje.</p></section>`;}
      return `<div data-custody-protocol="${esc(state.protocolId)}">${screen==='list'?list():screen==='scan'?scanView():screen==='cmr'?documentView():screen==='add'?addView():`<h2 class="hv2-title">Odnotuj brak</h2><p>${esc(current()?.name)} · ${esc(current()?.orderId)}</p><label class="vc-label" for="vc-missing-note">Czego brakuje i co ustalono?</label><textarea id="vc-missing-note" maxlength="500">${esc(state.checks[selectedId]?.note||'')}</textarea>`}${error?`<p class="hv2-error" role="alert">${esc(error)}</p>`:''}</div>`;
    }
    function actions(){
      if(state.completedAt)return `<div class="hv2-actions"><button class="hv2-secondary" data-vc-reopen>Popraw zawartość</button><button class="hv2-primary" data-vc-close>Zamknij protokół</button></div>`;
      const label=screen==='list'?'Zakończ kontrolę zawartości':screen==='scan'?'Sprawdź numer plomby':screen==='cmr'?'Oryginał CMR zgodny · potwierdzam':screen==='add'?'Dopisz do protokołu':'Zapisz brak w protokole';
      return `<div class="hv2-actions"><button class="hv2-secondary" data-vc-back aria-label="Wróć do listy lub protokołu auta">${icon('back')}</button><button class="hv2-primary" data-vc-next>${label}</button></div>`;
    }
    function scanned(value){const verdict=model.scan(state,selectedId,value);if(!result(verdict))return;go(verdict.item.kind==='cmr'?'cmr':'list',verdict.item.kind==='cmr'?selectedId:null);}
    function bind(){
      const $=selector=>document.querySelector(selector),all=selector=>[...document.querySelectorAll(selector)];
      if(screen==='add'){
        for(const [selector,key] of [['#vc-kind','kind'],['#vc-order','orderId'],['#vc-name','name'],['#vc-seal','expectedSeal']]){
          const input=$(selector);if(input){input.value=draft[key];input.oninput=()=>{draft[key]=input.value;};input.onchange=input.oninput;}
        }
      }
      all('[data-vc-scan]').forEach(button=>button.onclick=()=>{const item=model.items(state).find(item=>item.id===button.dataset.vcScan);if(item.kind==='cmr'&&state.checks[item.id]?.status==='confirmed'){go('cmr',item.id);}else go('scan',item.id);});
      all('[data-vc-missing]').forEach(button=>button.onclick=()=>go('missing',button.dataset.vcMissing));
      if($('[data-vc-add]'))$('[data-vc-add]').onclick=()=>go('add');
      if($('[data-vc-close]'))$('[data-vc-close]').onclick=options.onExit;
      if($('[data-vc-reopen]'))$('[data-vc-reopen]').onclick=()=>{state.completedAt=null;go('list');};
      if($('[data-vc-back]'))$('[data-vc-back]').onclick=()=>screen==='list'?options.onVehicleReview():go('list');
      if($('[data-vc-demo-code]'))$('[data-vc-demo-code]').onclick=()=>scanned(current().expectedSeal);
      if($('[data-vc-native-qr]'))$('[data-vc-native-qr]').onclick=()=>{const token=generation,id=selectedId;root.SuperSpedytorScanner.scanQr(value=>{if(token===generation&&id===selectedId&&active())scanned(value);},message=>{if(token===generation&&active()){error=message;redraw();}});};
      all('[data-vc-page]').forEach(button=>button.onclick=()=>{page=Number(button.dataset.vcPage);error='';redraw();});
      if($('[data-vc-zoom]'))$('[data-vc-zoom]').onclick=()=>{zoom=!zoom;redraw();};
      if($('[data-vc-image]')){const image=$('[data-vc-image]'),id=selectedId,index=page;
        const loaded=()=>{if(!active()||selectedId!==id||!image.naturalWidth)return;model.reviewPage(state,id,index);$('.vc-review-count').textContent=`Obejrzane strony: ${state.checks[id]?.reviewedPages?.length||0}/${current().pages}`;};
        image.onload=loaded;image.onerror=()=>{if(!active()||selectedId!==id)return;state.checks[id].reviewedPages=state.checks[id].reviewedPages.filter(i=>i!==index);$('.vc-review-count').textContent='Nie można wczytać strony. Potwierdzenie zablokowane.';};if(image.complete){if(image.naturalWidth)loaded();else image.onerror();}}
      if($('[data-vc-pdf]'))$('[data-vc-pdf]').onclick=()=>{pdfOpened=true;};
      if($('#vc-pdf-reviewed'))$('#vc-pdf-reviewed').onchange=event=>{if(!pdfOpened){event.target.checked=false;error='Najpierw otwórz i sprawdź pełny PDF.';redraw();return;}if(event.target.checked)for(let p=0;p<current().pages;p++)model.reviewPage(state,selectedId,p);};
      if($('[data-vc-add-scan]'))$('[data-vc-add-scan]').onclick=()=>{const token=generation;root.SuperSpedytorScanner.open({onAccept:records=>{if(token!==generation||screen!=='add'||!active())return false;if(draftScan)root.SuperSpedytorScanner.release(draftScan);draftScan=records[0];draft.kind='cmr';$('#vc-kind').value='cmr';$('[data-vc-add-scan]').textContent='Pełny skan dołączony do CMR';return true;}});};
      if($('[data-vc-next]'))$('[data-vc-next]').onclick=()=>{
        if(screen==='scan'){scanned($('#vc-code').value);return;}
        if(screen==='cmr'){if(state.checks[selectedId]?.status==='confirmed'){go('list');return;}if(result(model.acceptDocument(state,selectedId)))go('list');return;}
        if(screen==='missing'){if(result(model.missing(state,selectedId,$('#vc-missing-note').value)))go('list');return;}
        if(screen==='add'){const verdict=model.add(state,{...draft,scan:draft.kind==='cmr'?draftScan:null});if(!result(verdict))return;if(draft.kind!=='cmr'&&draftScan)root.SuperSpedytorScanner.release(draftScan);draftScan=null;go('list');return;}
        state.emptyConfirmed=Boolean($('#vc-empty')?.checked);state.discrepanciesConfirmed=Boolean($('#vc-discrepancies')?.checked);
        if(result(model.finish(state)))redraw();
      };
    }
    return {state,view,actions,bind,
      snapshot:()=>({state,screen,selectedId,page,draft,draftScan,pdfOpened}),
      restore:saved=>{if(saved?.state){Object.assign(state,saved.state);screen=saved.screen||'list';selectedId=saved.selectedId||null;page=saved.page||0;draft=saved.draft||draft;draftScan=saved.draftScan||null;pdfOpened=Boolean(saved.pdfOpened);}},
      sign:inspection=>model.sign(state,inspection),reopen:()=>{model.reopen(state);go('list');},reset:()=>{generation++;if(draftScan)root.SuperSpedytorScanner?.release(draftScan);state.extras.forEach(item=>{if(item.scan)root.SuperSpedytorScanner?.release(item.scan);});Object.assign(state,model.create(snapshot,options.role||'issue'));screen='list';selectedId=null;error='';draftScan=null;}};
  }
  root.SuperSpedytorVehicleCustodyUI={create};
})(window);
