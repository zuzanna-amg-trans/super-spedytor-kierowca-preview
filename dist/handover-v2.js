'use strict';

// The inspection UI is shared by both workflows; only the context carries a recipient.
(function exposeInspectionUI(root){
  function create(options){
    const model=root.SuperSpedytorVehicleInspectionV2;
    const {snapshot,icon,esc,onChange,onExit,demoPhoto}=options;
    const protocol=model.createState();
    const mode=options.mode||'handover';
    const role=options.role||'issue';
    const actor=snapshot.actor||(role==='receive'?snapshot.receiver:snapshot.transferor);
    let viewingSignedVehicle=false;
    const custody=mode==='handover'?root.SuperSpedytorVehicleCustodyUI.create({
      ...options,role,snapshot,onChange,onExit,onVehicleReview:()=>{viewingSignedVehicle=true;redraw(true);}
    }):null;
    const steps=model.buildSteps(snapshot,{mode});
    const sections=[['cabin','Kabina'],['exterior','Obchód auta'],['cargo','Paka i schowki']];
    let capturePage=null;
    let catalogOpen=false;
    let captureTarget=null;
    let photoGeneration=0;
    const current=()=>steps[protocol.stepIndex];
    const photoRecord=photo=>protocol.photos[photo.id];
    const pct=()=>model.progress(steps,protocol);
    const sectionDone=id=>{const list=steps.filter(step=>step.section===id);return list.length>0&&list.every(step=>model.stepReady(step,protocol));};

    function redraw(scroll=false){
      onChange();
      if(scroll)document.querySelector('#app-scroll').scrollTop=0;
    }
    function edited(){if(custody?.state.signature)root.SuperSpedytorVehicleCustody.reopen(custody.state);protocol.confirmed=false;protocol.submitted=false;protocol.error=null;}
    function go(index){
      protocol.error=null;
      protocol.stepIndex=Math.max(0,Math.min(index,steps.length-1));
      redraw(true);
    }
    function release(record){if(record?.url?.startsWith('blob:'))URL.revokeObjectURL(record.url);}
    function report(problem){
      protocol.error=problem;
      redraw();
      requestAnimationFrame(()=>{
        const row=document.querySelector('[data-hv2-error-target]');
        row?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
        const focus=row?.querySelector('input,textarea,button,select');
        focus?.focus({preventScroll:true});
      });
    }
    function errorText(){return protocol.error?`<p class="hv2-error" role="alert">${esc(protocol.error.message)}</p>`:'';}
    function fieldAttributes(kinds,key){
      return protocol.error&&kinds.includes(protocol.error.kind)&&protocol.error.key===key?' hv2-invalid" data-hv2-error-target="true"':'"';
    }
    function header(){
      const step=current(),progress=pct(),stage=sections.findIndex(([id])=>id===step.section);
      return `<header class="hv2-header"><button class="hv2-back" data-hv2-back aria-label="${protocol.stepIndex?'Poprzedni krok':'Wróć do serwisu'}">${icon('back')}</button><span>${mode==='handover'?'Przekazanie auta':'Inwentaryzacja'}<small>${esc(snapshot.vehicle.registration)}${mode==='handover'?` · ${esc(snapshot.receiver.displayName)}`:''}</small></span><b class="hv2-version">V2</b></header><div class="hv2-progress"><div><span>${step.type==='intro'?'Zaczynamy spokojnie, krok po kroku':step.type==='review'?'Ostatnia kontrola':`${progress.completed} z ${progress.total} kroków gotowych`}</span><b>${progress.percentage}%</b></div><div class="hv2-progress-track"><span style="width:${progress.percentage}%"></span></div></div>${step.type!=='intro'?`<div class="hv2-section-tabs">${sections.map(([id,name],i)=>`<span class="${id===step.section?'active':sectionDone(id)?'done':''}">${sectionDone(id)?icon('check'):`<b>${i+1}</b>`}${name}</span>`).join('')}</div>`:''}`;
    }
    function intro(){
      const count=type=>steps.filter(step=>step.type===type).length;
      const receiving=mode==='handover'&&role==='receive';
      return `<span class="hv2-eyebrow">${mode==='handover'?(receiving?'ODBIERZ I SPRAWDŹ AUTO':'PRZYGOTUJ AUTO DO PRZEKAZANIA'):'SPORZĄDŹ INWENTARYZACJĘ'}</span><h2 class="hv2-title">Jedna sekcja.<br>Jeden krok na raz.</h2><p class="hv2-description">Zrób zdjęcia kabiny i sprawdź jej wyposażenie. Potem obejdź auto i przejdź do przestrzeni ładunkowej oraz schowków.</p><section class="hv2-identity"><span>${icon('truck')}</span><div><small>${mode==='handover'?(receiving?'ODBIERASZ':'PRZEKAZUJESZ'):'INWENTARYZOWANY POJAZD'}</small><strong>${esc(snapshot.vehicle.registration)}</strong><p>${esc(snapshot.vehicle.makeModel)}</p></div></section>${mode==='handover'?`<section class="hv2-intro-card"><span class="hv2-eyebrow">${receiving?'OD KOGO ODBIERASZ AUTO':'DLA KOGO PRZYGOTOWUJESZ AUTO'}</span><strong>${esc(receiving?snapshot.transferor.displayName:snapshot.receiver.displayName)}</strong><p>Przekazuje: ${esc(snapshot.transferor.displayName)} · odbiera: ${esc(snapshot.receiver.displayName)}</p></section>`:`<section class="hv2-intro-card" data-inventory-author><span class="hv2-eyebrow">KIEROWCA SPORZĄDZAJĄCY INWENTARYZACJĘ</span><strong>${esc(snapshot.author.displayName)}</strong><p>${esc(snapshot.author.code)}</p></section>`}<div class="hv2-plan">${[['signal','Kabina i wskazania','Przebieg, paliwo, DPF, AdBlue → zdjęcia kabiny → wyposażenie kabiny'],['route','Zdjęcia dookoła pojazdu','Przód → prawa strona → tył → lewa strona'],['box','Przestrzeń ładunkowa i schowki','Zdjęcia paki i windy → wyposażenie → schowki zewnętrzne']].map(([glyph,title,desc],i)=>`<div class="hv2-plan-item"><span>${icon(glyph)}</span><div><strong>${i+1}. ${title}</strong><small>${desc}</small></div></div>`).join('')}</div><p class="hv2-photo-tip">${icon('camera')}Każde zdjęcie na osobnym ekranie. Możesz wrócić i poprawić dowolny krok.</p><p class="small-note">Podgląd V2 · dane demonstracyjne · ${count('checklist')} list wyposażenia. Materiały pozostają w tej przeglądarce.</p>`;
    }
    function contentIntro(){
      if(!custody)return '';
      const counts=root.SuperSpedytorVehicleCustody.progress(custody.state);
      return `${options.onRole?`<div class="vc-role-switch" role="group" aria-label="Twoja rola w przekazaniu"><button data-hv2-role="issue" aria-pressed="${role==='issue'}">Wydaję auto</button><button data-hv2-role="receive" aria-pressed="${role==='receive'}">Odbieram auto</button></div>`:''}<section class="hv2-intro-card"><span class="hv2-eyebrow">${role==='issue'?'TWÓJ PROTOKÓŁ WYDANIA':'TWÓJ PROTOKÓŁ ODBIORU'}</span><strong>${esc(actor.displayName)} · ${esc(snapshot.vehicle.registration)}</strong><p>1. Stan auta i wyposażenia → 2. Podpis → 3. Sprawdzenie ${counts.cargo.total} szt. ładunku i ${counts.cmr.total} CMR-ów.</p><p>Ładunek może już znajdować się w aucie. Sprawdzisz go po podpisaniu części pojazdu.</p></section>${options.onSwap?'<button class="hv2-capture" data-hv2-swap>Zamieniamy się autami</button>':''}`;
    }
    function photoPanel(photo,record=photoRecord(photo)){
      return `<section class="hv2-photo-stage${fieldAttributes(['photo'],photo.id)}><div class="hv2-photo-frame">${record?`<img src="${esc(record.url)}" alt="${esc(photo.name)}">${record.demo?'<span class="hv2-demo-mark">Zdjęcie demonstracyjne</span>':''}`:`<div class="hv2-camera-visual">${icon(photo.icon||'camera')}<span>${esc(photo.name)}</span><small>Ustaw cały element w kadrze</small></div>`}</div><button class="hv2-capture ${record?'done':''}" data-hv2-capture="${esc(photo.id)}">${icon(record?'camera':'plus')}${record?'Powtórz zdjęcie':'Zrób zdjęcie'}</button>${options.demo?`<button class="hv2-demo-button" data-hv2-demo="${esc(photo.id)}">${record?'Podmień na zdjęcie demo':'Wstaw zdjęcie demo'}</button>`:''}</section>`;
    }
    function readingView(step){
      const reading=step.reading,value=protocol.values[reading.field]??'',unavailable=value==='unavailable';
      const isOdometer=reading.id==='odometer';
      return `<span class="hv2-eyebrow">KABINA · WSKAZANIA ${model.readings.findIndex(item=>item.id===reading.id)+1}/4</span><h2 class="hv2-title">${esc(reading.title)}</h2><p class="hv2-description">${isOdometer?'Wpisz aktualny przebieg i zrób czytelne zdjęcie licznika.':`Wpisz ${reading.id==='dpf'?'zapełnienie DPF':'poziom '+reading.title} ze wskazania i sfotografuj ten odczyt.`}</p><section class="hv2-reading-card${fieldAttributes(['value'],reading.field)}><label for="hv2-value">${isOdometer?'Aktualny przebieg':reading.id==='dpf'?'Zapełnienie DPF':'Aktualny poziom'}</label><div class="hv2-value-control"><input id="hv2-value" data-hv2-value="${reading.field}" type="number" inputmode="${isOdometer?'numeric':'decimal'}" min="0" ${isOdometer?'step="1"':'max="100" step="0.1"'} value="${unavailable?'':esc(value)}" placeholder="${isOdometer?'np. 245000':'0–100'}" ${unavailable?'disabled':''}><b>${esc(reading.unit)}</b></div>${reading.id==='dpf'?`<label class="hv2-unavailable"><input type="checkbox" id="hv2-unavailable" ${unavailable?'checked':''}><span>Pojazd nie pokazuje DPF w procentach<small>Dodaj zdjęcie dostępnego ekranu lub komunikatu.</small></span></label>`:''}</section>${photoPanel(step.photo)}${errorText()}<p class="hv2-photo-tip">${icon('info')}Wartość i zdjęcie dotyczą tego samego wskazania.</p>${nextPreview()}`;
    }
    function damagePhoto(item,kind){
      const record=protocol.issuePhotos[item.id]?.[kind];
      return `<button class="hv2-damage-photo ${record?'done':''}" data-hv2-issue="${esc(item.id)}" data-shot="${kind}">${record?`<img src="${esc(record.url)}" alt="${kind==='wide'?'Widok ogólny':'Zbliżenie'} uszkodzenia">`:icon('camera')}<span>${kind==='wide'?'Zdjęcie ogólne':'Zbliżenie'}${record?' ✓':''}</span></button>`;
    }
    const rowReady=item=>model.stepReady({type:'checklist',items:[item]},protocol);
    const rowCounts=item=>model.itemCounts(item,protocol);
    function catalogButton(){return snapshot.equipmentStages?`<button class="hv2-catalog-button" data-hv2-catalog>${icon('clipboard')}Pełna lista wyposażenia · ${snapshot.equipment.length} pozycji</button>`:'';}
    function catalogView(){
      return `<span class="hv2-eyebrow">CAŁE WYPOSAŻENIE</span><h2 class="hv2-title">Sprawdź, co jest na liście.</h2><p class="hv2-description">${snapshot.equipment.filter(x=>x.owner!=='driver').length} pozycje pojazdu i ${snapshot.equipment.filter(x=>x.owner==='driver').length} rzeczy w osobnym zestawie kierowcy. Każda pozycja ma własną ilość, miejsce i ocenę.</p><label class="hv2-field">Szukaj wyposażenia<input type="search" data-hv2-filter placeholder="Nazwa rzeczy lub miejsce" autocomplete="off"></label><div class="hv2-catalog">${steps.filter(x=>x.type==='checklist').map(step=>`<section data-hv2-catalog-group><h3>${esc(step.title)}</h3>${step.placeNote?`<p>${esc(step.placeNote)}</p>`:''}${step.items.map(item=>`<button data-hv2-open-group="${esc(step.id)}" data-hv2-catalog-row><strong>${esc(item.name)}</strong><small>${esc(item.expectedLabel)}${item.criticality==='extra'?' · według przydziału':''}</small><span>${esc(item.place||step.title)}</span></button>`).join('')}</section>`).join('')}</div>`;
    }
    function countText(item){
      const q=rowCounts(item),status=protocol.statuses[item.id];
      if(!status)return 'Wybierz ocenę i sprawdź ilość.';
      if(status==='not-applicable')return 'Nie należy do przydziału tego pojazdu lub kierowcy.';
      return `Jest: ${q.present} ${item.unit||'szt.'} · uszkodzone: ${q.bad}${q.missing===null?' · norma nieokreślona':` · brakuje: ${q.missing}`}`;
    }
    function checklistView(step){
      const answered=step.items.filter(rowReady).length;
      return `${catalogButton()}<span class="hv2-eyebrow">${step.section==='cabin'?'KABINA':step.section==='cargo'?'PAKA I ZESTAW KIEROWCY':'NA ZEWNĄTRZ'} · WYPOSAŻENIE</span><h2 class="hv2-title">${esc(step.title)}</h2><p class="hv2-description">${esc(step.placeNote||step.description)} Porównaj ilość, stan i miejsce.</p><div class="hv2-checklist-count"><span>Sprawdzone pozycje</span><b>${answered}/${step.items.length}</b></div><div class="hv2-checklist">${step.items.map(item=>{
        const status=protocol.statuses[item.id],invalid=protocol.error?.key===item.id,q=protocol.quantities?.[item.id]||{},damage=status==='damaged'||Number(q.bad)>0&&!['missing','not-applicable'].includes(status),full=item.countRequired;
        const choices=[['matching','Jest','check'],['missing','Brak','close'],['damaged','Uszkodzone','warning'],...(full?[['partial','Inna ilość','box'],['elsewhere','W innym miejscu','pin']]:[]),...(item.criticality==='extra'?[['not-applicable','Nie dotyczy','info']]:[])];
        return `<article class="hv2-item ${rowReady(item)?'complete':''} ${damage?'issue':''} ${invalid?'hv2-invalid':''}" data-hv2-item="${esc(item.id)}" ${invalid?'data-hv2-error-target="true"':''}><div class="hv2-item-heading"><span>${icon(item.icon||'clipboard')}</span><div><strong>${esc(item.name)}</strong><small>${esc(item.expectedLabel||'')}</small></div>${status?icon(rowCounts(item).issue?'warning':'check'):''}</div>${full?`<p class="hv2-place">${esc(item.place||step.title)}</p>${item.owner==='driver'?'<p>Osobny stan kierowcy — nie wyposażenie przypisane na stałe do auta.</p>':''}${item.storageNote?`<p>${esc(item.storageNote)}</p>`:''}${item.criticality==='extra'?'<p>Według przydziału. Wybierz „Nie dotyczy”, jeśli nie jest przypisane.</p>':''}`:''}<div class="hv2-status-options ${full?'hv2-full-status':''}" role="group" aria-label="Stan: ${esc(item.name)}">${choices.map(([value,label,glyph])=>`<button data-hv2-status="${esc(item.id)}" data-status="${value}" aria-pressed="${status===value}" class="${status===value?`active ${value}`:''}">${icon(glyph)}<span>${label}</span></button>`).join('')}</div>${full&&status&&!['missing','not-applicable'].includes(status)?`<div class="hv2-quantities">${[['good','Dobre'],['average','Zużyte'],['bad','Uszkodzone']].map(([key,label])=>`<label>${label}<input type="number" inputmode="numeric" min="0" max="9999" step="1" data-hv2-quantity="${esc(item.id)}" data-count="${key}" aria-label="${esc(item.name)} — ${label}" value="${esc(q[key]??'')}" placeholder="0"></label>`).join('')}</div>`:''}${full?`<p class="hv2-count-result" data-hv2-count-result>${esc(countText(item))}</p>`:''}${status==='elsewhere'?`<label class="hv2-field">Gdzie znaleziono?<select data-hv2-location="${esc(item.id)}"><option value="">Wybierz miejsce</option>${(snapshot.equipmentStages||[]).filter(group=>group.id!==item.groupId).map(group=>`<option value="${esc(group.id)}" ${protocol.locations[item.id]===group.id?'selected':''}>${esc(group.title)}</option>`).join('')}<option value="other" ${protocol.locations[item.id]==='other'?'selected':''}>Inne miejsce — dopisz w uwagach</option></select></label>`:''}${item.asksCardDigits&&status&&!['missing','not-applicable'].includes(status)?`<label class="hv2-field">4 ostatnie cyfry karty<input data-hv2-card="${esc(item.id)}" inputmode="numeric" type="text" maxlength="4" pattern="[0-9]{4}" autocomplete="off" value="${esc(protocol.cardDigits[item.id]||'')}" placeholder="0000"><small>Bez pełnego numeru i bez PIN-u.</small></label>`:''}${damage?`<div class="hv2-damage-details"><strong>Co jest uszkodzone?</strong><textarea data-hv2-note="${esc(item.id)}" placeholder="Krótko opisz uszkodzenie" maxlength="500">${esc(protocol.notes[item.id]||'')}</textarea><div class="hv2-damage-photo-grid">${damagePhoto(item,'wide')}${damagePhoto(item,'close')}</div></div>`:full&&['partial','elsewhere'].includes(status)?`<label class="hv2-field">Uwagi<textarea data-hv2-note="${esc(item.id)}" maxlength="500" placeholder="Uwagi do ilości lub miejsca">${esc(protocol.notes[item.id]||'')}</textarea></label>`:''}${invalid?errorText():''}</article>`;
      }).join('')}</div><p class="hv2-photo-tip">${icon('info')}Brak nie wymaga zdjęcia. Uszkodzenie wymaga opisu, ujęcia ogólnego i zbliżenia. Ilości dotyczą tej konkretnej pozycji i miejsca.</p>${nextPreview()}`;
    }
    function fullReport(){
      if(!snapshot.equipmentStages)return '';
      return `<details class="hv2-full-report"><summary>Cały wykaz i wyniki · ${snapshot.equipment.length} pozycji</summary>${steps.filter(s=>s.type==='checklist').map(step=>`<h3>${esc(step.title)}</h3>${step.items.map(item=>`<div><strong>${esc(item.name)}</strong><p>${esc(countText(item))}</p>${protocol.locations[item.id]?`<p>Znaleziono: ${esc(snapshot.equipmentStages.find(g=>g.id===protocol.locations[item.id])?.title||'inne miejsce')}</p>`:''}${protocol.cardDigits[item.id]?`<p>Karta ···· ${esc(protocol.cardDigits[item.id])}</p>`:''}${protocol.notes[item.id]?`<p>${esc(protocol.notes[item.id])}</p>`:''}</div>`).join('')}`).join('')}</details>`;
    }
    function routeView(step){
      if(step.section!=='exterior')return '';
      const id=step.photo?.id||'',side=/[Rr]ight/.test(id)?'right':/[Ll]eft/.test(id)?'left':id==='rear'?'rear':'front';
      return `<div class="hv2-route"><svg viewBox="0 0 180 104" aria-hidden="true"><rect x="62" y="13" width="56" height="78" rx="12" fill="#fff" stroke="#aeb8a7" stroke-width="2"/><path d="M67 36h46M72 20h36M76 85h28" stroke="#c6cec0" stroke-width="2"/><path d="M128 10h12v81h-12M52 91H40V10h12" fill="none" stroke="#e2e7dc" stroke-width="5" stroke-linecap="round"/>${side==='right'?'<path d="M140 20v56m-6-6 6 7 6-7" fill="none" stroke="#ff6a1a" stroke-width="4"/>':side==='left'?'<path d="M40 84V28m-6 6 6-7 6 7" fill="none" stroke="#ff6a1a" stroke-width="4"/>':`<path d="M76 ${side==='front'?5:99}h28" stroke="#ff6a1a" stroke-width="5" stroke-linecap="round"/>`}</svg><div><strong>${side==='right'?'Prawa strona':side==='left'?'Lewa strona':side==='rear'?'Tył pojazdu':'Zacznij od przodu'}</strong><small>${side==='right'?'Zostań po prawej stronie auta.':side==='left'?'Teraz wszystko po lewej stronie.':side==='rear'?'Następnie przejdziesz na lewą stronę.':'Potem przejdziesz na prawą stronę.'}</small></div></div>`;
    }
    function photoView(step){
      const list=steps.filter(candidate=>candidate.type==='photo'&&candidate.section===step.section);
      const index=list.findIndex(candidate=>candidate.id===step.id);
      return `<span class="hv2-eyebrow">${step.section==='cabin'?'KABINA':step.section==='cargo'?'PAKA I WINDA':'OBCHÓD AUTA'} · ZDJĘCIE ${index+1}/${list.length}</span><h2 class="hv2-title">${esc(step.photo.name)}</h2><p class="hv2-description">${esc(step.photo.description||step.description)}</p>${routeView(step)}${photoPanel(step.photo)}${errorText()}${nextPreview()}`;
    }
    function issueView(){
      const item=snapshot.equipment.find(item=>item.id===capturePage.key);
      const photo={id:`issue-${capturePage.key}-${capturePage.shot}`,name:capturePage.shot==='wide'?'Zdjęcie ogólne uszkodzenia':'Zbliżenie uszkodzenia',icon:'camera'};
      const record=protocol.issuePhotos[capturePage.key]?.[capturePage.shot];
      return `<span class="hv2-eyebrow">${esc(item.name)} · USZKODZENIE</span><h2 class="hv2-title">${photo.name}</h2><p class="hv2-description">${capturePage.shot==='wide'?'Pokaż cały element, żeby było widać, gdzie znajduje się uszkodzenie.':'Zrób wyraźne zbliżenie uszkodzonego miejsca.'}</p>${photoPanel(photo,record)}${errorText()}`;
    }
    function nextPreview(){
      const next=steps[protocol.stepIndex+1];
      if(!next)return '';
      return `<div class="hv2-next-preview"><small>NASTĘPNIE</small><span>${esc(next.photo?.name||next.title)}${icon('arrow')}</span></div>`;
    }
    function reviewView(){
      const issues=snapshot.equipment.filter(item=>rowCounts(item).issue).length;
      return `<span class="hv2-eyebrow">PODSUMOWANIE</span><h2 class="hv2-title">Auto sprawdzone.</h2><p class="hv2-description">Przejrzyj sekcje i potwierdź, że raport odpowiada stanowi auta.</p><section class="hv2-identity"><span>${icon('truck')}</span><div><strong>${esc(snapshot.vehicle.registration)}</strong><p>${mode==='handover'?`Przygotowane dla: ${esc(snapshot.receiver.displayName)}`:`Sporządza: ${esc(snapshot.author.displayName)}`}</p></div></section><div class="hv2-summary">${model.readings.map(reading=>`<div><span>${esc(reading.title)}</span><b>${protocol.values[reading.field]==='unavailable'?'Brak odczytu %':`${esc(protocol.values[reading.field]??'—')} ${reading.unit}`}</b></div>`).join('')}<div><span>Zastrzeżenia na liście</span><b>${issues}</b></div></div><div class="hv2-review-section">${sections.map(([id,name])=>{
        const sectionSteps=steps.filter(step=>step.section===id&&step.type!=='intro');
        const done=sectionSteps.filter(step=>model.stepReady(step,protocol)).length;
        return `<button data-hv2-review="${id}"><span>${icon(done===sectionSteps.length?'check':'warning')}<strong>${name}</strong></span><small>${done}/${sectionSteps.length} kroków${icon('arrow')}</small></button>`;
      }).join('')}</div>${fullReport()}<label class="hv2-confirm${fieldAttributes(['confirmation'],'confirmed')}><input id="hv2-confirm" type="checkbox" ${protocol.confirmed?'checked':''}><span>Potwierdzam stan auta i wyposażenia<small>${mode==='handover'?`Przygotowuję raport przekazania dla ${esc(snapshot.receiver.displayName)}.`:`Sporządzam inwentaryzację jako ${esc(snapshot.author.displayName)}.`}</small></span></label>${errorText()}<p class="small-note">Podgląd demonstracyjny · raport i zdjęcia pozostają lokalnie.</p>`;
    }
    function submittedView(){
      if(custody)return `<section class="hv2-saved"><span>${icon('check')}</span><h2>Część pojazdu podpisana</h2><p>${esc(snapshot.vehicle.registration)} · ${esc(actor.displayName)}</p><p>Stan auta i wyposażenia jest zapisany w podpisanej części. Ładunki oraz dokumenty CMR sprawdzasz w kolejnym etapie.</p><p class="small-note">Poprawa auta wycofa podpis i wymaga ponownej kontroli zawartości.</p></section>`;
      return `<section class="hv2-saved"><span>${icon('check')}</span><p class="hv2-eyebrow">KONTROLA ZAKOŃCZONA</p><h2 class="hv2-title">Raport przygotowany</h2><p>${esc(snapshot.vehicle.registration)}${mode==='handover'?`<br>Dla: ${esc(snapshot.receiver.displayName)}`:`<br>Sporządził: ${esc(snapshot.author.displayName)}`}</p><div class="hv2-summary"><div><span>Sprawdzone etapy</span><b>${pct().completed}/${pct().total}</b></div><div><span>Zdjęcia</span><b>${Object.keys(protocol.photos).length}</b></div></div><p class="small-note">${mode==='handover'?'Zapisano w podglądzie. Przekazanie pojazdu czeka na potwierdzenie w Super Spedytorze.':'Inwentaryzacja zapisana w podglądzie. Zapis w Super Spedytorze wymaga potwierdzenia przez system.'}</p></section>`;
    }
    function view(){
      const step=current();
      if(custody?.state.signature&&!viewingSignedVehicle)return `<div class="app-content service-screen hv2-screen" data-handover-v2 data-inspection-mode="handover" data-hv2-step="contents">${custody.view()}</div>`;
      return `<div class="app-content service-screen hv2-screen" data-handover-v2 data-protocol-report="${esc(snapshot.protocolId||snapshot.handoverId||snapshot.inventoryId)}" data-inspection-mode="${mode}" data-hv2-step="${capturePage?'issue-photo':esc(step.id)}">${header()}${catalogOpen?catalogView():capturePage?issueView():protocol.submitted?submittedView():step.type==='intro'?`${contentIntro()}${catalogButton()}${intro()}`:step.type==='reading'?readingView(step):step.type==='checklist'?checklistView(step):step.type==='photo'?photoView(step):`${reviewView()}${custody?`<div class="vc-signature-note"><strong>Podpisuje: ${esc(actor.displayName)}</strong><p>Podpis dotyczy stanu auta i wyposażenia. Następnie osobno sprawdzisz ładunki i CMR-y.</p></div>`:''}`}<input type="file" id="hv2-photo-input" accept="image/*" capture="environment" hidden></div>`;
    }
    function actions(){
      if(catalogOpen)return `<div class="hv2-actions"><button class="hv2-primary" data-hv2-catalog-close>Wróć do protokołu</button></div>`;
      if(custody?.state.signature){
        if(viewingSignedVehicle)return '<div class="hv2-actions"><button class="hv2-secondary" data-hv2-reopen-signed>Popraw auto</button><button class="hv2-primary" data-hv2-return-contents>Wróć do ładunków i CMR</button></div>';
        return custody.actions();
      }
      if(protocol.submitted)return `<div class="hv2-actions"><button class="hv2-secondary" data-hv2-correct>Popraw</button><button class="hv2-primary primary-button" data-hv2-close>${icon('check')}Zamknij raport</button></div>`;
      const step=current(),label=capturePage?'Zapisz zdjęcie i wróć':step.type==='intro'?'Zaczynam od kabiny':step.type==='review'?(custody?'Podpisz auto · sprawdź ładunki i CMR':'Zakończ raport'):step.type==='checklist'?'Miejsce sprawdzone — dalej':'Dalej';
      return `<div class="hv2-actions">${protocol.stepIndex?`<button class="hv2-secondary" data-hv2-back aria-label="Poprzedni krok">${icon('back')}</button>`:''}<button class="hv2-primary primary-button" data-hv2-next>${esc(label)}${icon(step.type==='review'?'check':'arrow')}</button></div>`;
    }
    function notes(){
      const step=current(),progress=pct();
      return `<h2>${mode==='handover'?'Przekazanie auta.':'Inwentaryzacja.'}<br>Wersja V2.</h2><p class="note-description">Najpierw lista wyposażenia w danej sekcji, potem zdjęcia — każde na osobnym ekranie. Wskazania mają własną wartość i własne zdjęcie.</p><div class="design-progress"><div class="design-progress-title">PROSTY OBCHÓD<span>${progress.completed}/${progress.total}</span></div>${[['01','Przebieg · paliwo · DPF · AdBlue','cabin'],['02','Kabina: lista, potem zdjęcia','cabin'],['03','Paka i winda: lista, potem zdjęcia','cargo'],['04','Dodatkowe wyposażenie i obchód','exterior']].map(([num,label,section])=>`<div class="design-step ${step.section===section?'current':''}"><span class="design-step-num">${num}</span><span>${label}</span></div>`).join('')}</div><div class="design-shared"><strong>Spokojnie, wokół auta</strong><p>Przód → prawy bok, lusterko, drzwi i nadkola → tył → lewy bok, lusterko, drzwi i nadkola.</p></div><div class="design-shared"><strong>Wspólny proces kontroli</strong><p>Te same zdjęcia, wskazania i wyposażenie w obu protokołach. ${mode==='handover'?'Przekazanie wskazuje przekazującego i odbiorcę.':'Inwentaryzację potwierdza jeden sporządzający.'}</p></div>`;
    }
    function next(){
      if(capturePage){
        if(!protocol.issuePhotos[capturePage.key]?.[capturePage.shot]){report({kind:'photo',key:`issue-${capturePage.key}-${capturePage.shot}`,message:'Musisz dodać zdjęcie uszkodzenia.'});return;}
        capturePage=null;go(protocol.stepIndex);return;
      }
      const step=current(),problem=model.firstProblem(step,protocol);
      if(problem){report(problem);return;}
      if(step.type==='review'){
        const first=model.firstIncompleteStepIndex(steps,protocol);
        if(first>=0&&first<steps.length-1){go(first);report(model.firstProblem(current(),protocol));return;}
        if(!model.allReady(steps,protocol)){report({kind:'confirmation',key:'confirmed',message:'Potwierdź stan auta przed zakończeniem raportu.'});return;}
        if(custody){const signed=custody.sign(protocol);if(!signed.ok){report({kind:'confirmation',key:'confirmed',message:signed.reason==='MANIFEST_UNAVAILABLE'?'Nie pobrano listy ładunków i dokumentów dla tego auta. Nie można zamknąć przekazania.':'Nie można podpisać protokołu.'});return;}viewingSignedVehicle=false;}
        protocol.submitted=true;
        redraw(true);
        return;
      }
      const previousIndex=protocol.stepIndex,nextIndex=model.nextStepIndex(steps,protocol,protocol.stepIndex);
      go(nextIndex);
      if(nextIndex<=previousIndex&&model.firstProblem(current(),protocol))report(model.firstProblem(current(),protocol));
    }
    function storePhoto(target,record){
      edited();
      if(target.kind==='issue'){
        protocol.issuePhotos[target.key]??={};
        release(protocol.issuePhotos[target.key][target.shot]);
        protocol.issuePhotos[target.key][target.shot]=record;
      }else{
        release(protocol.photos[target.key]);
        protocol.photos[target.key]=record;
      }
      redraw();
    }
    function choosePhoto(target){captureTarget=target;document.querySelector('#hv2-photo-input').click();}
    function samplePhoto(){return {url:demoPhoto(0),demo:true,mime:'image/svg+xml',name:'Zdjęcie demonstracyjne'};}
    function bind(){
      const all=(selector)=>[...document.querySelectorAll(selector)];
      all('[data-hv2-catalog]').forEach(button=>button.onclick=()=>{catalogOpen=true;redraw(true);});
      all('[data-hv2-catalog-close]').forEach(button=>button.onclick=()=>{catalogOpen=false;redraw(true);});
      all('[data-hv2-open-group]').forEach(button=>button.onclick=()=>{catalogOpen=false;go(steps.findIndex(step=>step.id===button.dataset.hv2OpenGroup));});
      const filter=document.querySelector('[data-hv2-filter]');
      if(filter)filter.oninput=()=>{const query=filter.value.toLocaleLowerCase('pl-PL');all('[data-hv2-catalog-row]').forEach(row=>row.hidden=!row.textContent.toLocaleLowerCase('pl-PL').includes(query));all('[data-hv2-catalog-group]').forEach(group=>group.hidden=![...group.querySelectorAll('[data-hv2-catalog-row]')].some(row=>!row.hidden));};
      all('[data-hv2-quantity]').forEach(input=>input.oninput=()=>{edited();const key=input.dataset.hv2Quantity;protocol.quantities[key]??={};protocol.quantities[key][input.dataset.count]=input.value;const item=snapshot.equipment.find(item=>item.id===key),row=input.closest('[data-hv2-item]');row.querySelector('[data-hv2-count-result]').textContent=countText(item);row.classList.toggle('complete',rowReady(item));});
      all('[data-hv2-quantity]').forEach(input=>input.onchange=()=>redraw());
      all('[data-hv2-location]').forEach(input=>input.onchange=()=>{edited();protocol.locations[input.dataset.hv2Location]=input.value;});
      all('[data-hv2-card]').forEach(input=>input.oninput=()=>{edited();protocol.cardDigits[input.dataset.hv2Card]=input.value;});
      all('[data-hv2-role]').forEach(button=>button.onclick=()=>options.onRole(button.dataset.hv2Role));
      all('[data-hv2-swap]').forEach(button=>button.onclick=options.onSwap);
      if(custody?.state.signature){
        if(!viewingSignedVehicle){custody.bind();return;}
        all('[data-hv2-return-contents]').forEach(button=>button.onclick=()=>{viewingSignedVehicle=false;redraw(true);});
        all('[data-hv2-reopen-signed]').forEach(button=>button.onclick=()=>{root.SuperSpedytorVehicleCustody.reopen(custody.state);viewingSignedVehicle=false;protocol.submitted=false;protocol.confirmed=false;redraw(true);});
        return;
      }
      all('[data-hv2-back]').forEach(button=>button.onclick=()=>{if(catalogOpen){catalogOpen=false;redraw(true);}else if(capturePage){capturePage=null;go(protocol.stepIndex);}else if(protocol.submitted){protocol.submitted=false;redraw(true);}else if(protocol.stepIndex)go(protocol.stepIndex-1);else onExit();});
      all('[data-hv2-next]').forEach(button=>button.onclick=next);
      all('[data-hv2-close]').forEach(button=>button.onclick=onExit);
      all('[data-hv2-correct]').forEach(button=>button.onclick=()=>{protocol.submitted=false;redraw(true);});
      all('[data-hv2-capture]').forEach(button=>button.onclick=()=>choosePhoto(capturePage||{kind:'vehicle',key:button.dataset.hv2Capture}));
      all('[data-hv2-demo]').forEach(button=>button.onclick=()=>storePhoto(capturePage||{kind:'vehicle',key:button.dataset.hv2Demo},samplePhoto()));
      all('[data-hv2-issue]').forEach(button=>button.onclick=()=>{capturePage={kind:'issue',key:button.dataset.hv2Issue,shot:button.dataset.shot};protocol.error=null;redraw(true);});
      all('[data-hv2-status]').forEach(button=>button.onclick=()=>{
        const key=button.dataset.hv2Status,status=button.dataset.status;
        if(protocol.statuses[key]===status)return;
        edited();protocol.statuses[key]=status;
        const item=snapshot.equipment.find(item=>item.id===key);
        if(item?.countRequired){const qty=item.expectedQuantity??'';protocol.quantities[key]=status==='damaged'?{good:0,average:0,bad:qty}:['missing','not-applicable'].includes(status)?{good:0,average:0,bad:0}:{good:qty,average:0,bad:0};if(status!=='elsewhere')delete protocol.locations[key];if(['missing','not-applicable'].includes(status))delete protocol.cardDigits[key];}
        if(status!=='damaged'){Object.values(protocol.issuePhotos[key]||{}).forEach(release);delete protocol.issuePhotos[key];delete protocol.notes[key];}
        redraw();
      });
      all('[data-hv2-note]').forEach(input=>input.oninput=()=>{edited();protocol.notes[input.dataset.hv2Note]=input.value;document.querySelector('.hv2-error')?.remove();input.closest('.hv2-item')?.classList.remove('hv2-invalid');});
      all('[data-hv2-value]').forEach(input=>input.oninput=()=>{edited();protocol.values[input.dataset.hv2Value]=input.value;document.querySelector('.hv2-error')?.remove();input.closest('.hv2-reading-card')?.classList.remove('hv2-invalid');});
      const unavailable=document.querySelector('#hv2-unavailable');
      if(unavailable)unavailable.onchange=()=>{edited();protocol.values.dpfLevel=unavailable.checked?'unavailable':'';redraw();};
      const confirm=document.querySelector('#hv2-confirm');
      if(confirm)confirm.onchange=()=>{protocol.confirmed=confirm.checked;protocol.error=null;document.querySelector('.hv2-error')?.remove();confirm.closest('.hv2-confirm')?.classList.remove('hv2-invalid');};
      all('[data-hv2-review]').forEach(button=>button.onclick=()=>{go(steps.findIndex(step=>step.section===button.dataset.hv2Review));});
      const fileInput=document.querySelector('#hv2-photo-input');
      if(fileInput)fileInput.onchange=()=>{
        const file=fileInput.files?.[0],target=captureTarget;
        fileInput.value='';
        if(!file||!target)return;
        if(!file.type.startsWith('image/')){report({kind:'photo',key:target.key,message:'Wybierz zdjęcie w formacie obrazu.'});return;}
        if(file.size>25*1024*1024){report({kind:'photo',key:target.key,message:'Zdjęcie jest zbyt duże. Wybierz plik do 25 MB.'});return;}
        const url=URL.createObjectURL(file),image=new Image(),generation=++photoGeneration,reportId=snapshot.protocolId||snapshot.handoverId||snapshot.inventoryId;
        image.onload=()=>{if(generation!==photoGeneration||document.querySelector('[data-protocol-report]')?.dataset.protocolReport!==reportId){URL.revokeObjectURL(url);return;}storePhoto(target,{url,blob:file,name:file.name,mime:file.type,demo:false});};
        image.onerror=()=>{URL.revokeObjectURL(url);if(generation===photoGeneration&&document.querySelector('[data-protocol-report]')?.dataset.protocolReport===reportId)report({kind:'photo',key:target.key,message:'Nie można odczytać tego zdjęcia. Zrób nowe lub wybierz JPG albo PNG.'});};
        image.src=url;
      };
    }
    function reset(){photoGeneration++;Object.values(protocol.photos).forEach(release);Object.values(protocol.issuePhotos).flatMap(Object.values).forEach(release);Object.assign(protocol,model.createState());custody?.reset();viewingSignedVehicle=false;capturePage=null;captureTarget=null;catalogOpen=false;}
    return {view,actions,notes,bind,reset,
      snapshot:()=>({catalogRevision:snapshot.catalogRevision,protocol,custody:custody?.snapshot(),viewingSignedVehicle,capturePage}),
      restore:saved=>{if(saved?.protocol){Object.assign(protocol,model.createState(),saved.protocol);protocol.error=null;const changed=snapshot.catalogRevision&&saved.catalogRevision!==snapshot.catalogRevision;if(changed){protocol.stepIndex=0;protocol.submitted=false;protocol.confirmed=false;custody?.reset();}else custody?.restore(saved.custody);viewingSignedVehicle=!changed&&Boolean(saved.viewingSignedVehicle);capturePage=changed?null:saved.capturePage||null;protocol.stepIndex=Math.min(protocol.stepIndex,steps.length-1);}},
      status:()=>({started:protocol.stepIndex>0,vehicleSigned:Boolean(custody?.state.signature),complete:mode==='inventory'?protocol.submitted:Boolean(custody?.state.completedAt),contents:custody?root.SuperSpedytorVehicleCustody.progress(custody.state):null})};
  }
  root.SuperSpedytorHandoverV2={create};
})(window);
