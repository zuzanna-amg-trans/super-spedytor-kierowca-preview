(function(){
  'use strict';
  const enabled=()=>window.SuperSpedytorNative?.liveWorkflowsEnabled?.()===true;
  if(!enabled())return;
  const bridge=window.SuperSpedytorNative;
  const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const statusLabel=value=>({pending:'Do zrobienia',in_progress:'W trakcie',completed:'Wykonane',expired:'Termin minął',cancelled:'Anulowane',rejected:'Do poprawy',active:'Aktywne'})[value]||value||'—';
  const dateTime=value=>{const d=new Date(value);return value&&!Number.isNaN(d.valueOf())?d.toLocaleString('pl-PL',{dateStyle:'short',timeStyle:'short'}):String(value||'');};
  const list=value=>Array.isArray(value)?value:Array.isArray(value?.results)?value.results:[];
  const media=value=>{if(typeof value!=='string')return '';try{const u=new URL(value,'https://tms.amg.eco');return u.protocol==='https:'&&u.hostname==='tms.amg.eco'&&!u.username&&!u.password&&u.pathname.startsWith('/media/')?u.href.replace(/^https:/,'ssmedia:'):'';}catch{return '';}};
  const id=value=>{const n=String(value??'');if(!/^[1-9]\d{0,11}$/.test(n))throw Error('Brak prawidłowego identyfikatora rekordu.');return n;};
  let root=null,owner='',epoch=0,screen='',screenContext={},busy=false,tachoTimer=null;
  const localEvidence=new Map();let evidenceOwner="";
  // Drafts belong to the current authenticated account and live only in memory.
  // A readback for one field must not erase edits in the other fields.
  const formDrafts=new Map();
  const draftKey=scope=>owner+'|'+scope;
  function bindDraft(scope){
    const key=draftKey(scope),saved=formDrafts.get(key)||new Map();
    root?.querySelectorAll('[data-draft-field]').forEach(node=>{
      if(node.disabled||node.readOnly)return;
      const field=node.dataset.draftField;
      if(saved.has(field)){
        if(node.type==='checkbox')node.checked=saved.get(field);else node.value=saved.get(field);
        node.dispatchEvent(new Event('change',{bubbles:true}));
      }
      const remember=()=>{if(!current())return;saved.set(field,node.type==='checkbox'?node.checked:node.value);formDrafts.set(key,saved);};
      node.addEventListener('input',remember);node.addEventListener('change',remember);
    });
  }
  function clearDraft(scope,fields){
    const key=draftKey(scope);if(!fields){formDrafts.delete(key);return;}
    const saved=formDrafts.get(key);fields.forEach(field=>saved?.delete(field));if(!saved?.size)formDrafts.delete(key);
  }
  function confirmDraft(scope,values){
    const saved=formDrafts.get(draftKey(scope));
    clearDraft(scope,Object.keys(values).filter(field=>saved?.get(field)===values[field]));
  }
  function bindTaskDraft(taskId){
    root.querySelectorAll('[data-step-key]').forEach(step=>{
      step.querySelectorAll('[data-note],[data-status]').forEach(node=>node.dataset.draftField='step:'+step.dataset.stepKey+':'+(node.hasAttribute('data-note')?'note':'status_value'));
    });
    root.querySelectorAll('[data-inventory-key]').forEach(row=>row.querySelectorAll('[data-count]').forEach(node=>node.dataset.draftField='inventory:'+row.dataset.inventoryKey+':'+node.dataset.count));
    for(const attribute of ['ho','ho-card','ho-area','ho-item','ho-role'])root.querySelectorAll('[data-'+attribute+']').forEach(node=>node.dataset.draftField=attribute+':'+node.getAttribute('data-'+attribute));
    bindDraft('task:'+taskId);
  }
  function keepEvidence(file){if(file?.token&&current())localEvidence.set(file.token,file);}
  const recordVoice=()=>nativeCall(id=>bridge.recordAudio(id));
  const chooseFile=()=>nativeCall(id=>bridge.selectFile(id));
  const state=()=>{try{return JSON.parse(bridge.backendState());}catch{return {};}};
  const current=()=>state().status==='connected'&&String(state().profile?.id??'')===owner;
  const fail=message=>{throw Error(message);};
  const errorText=body=>typeof body?.detail==='string'?body.detail:typeof body?.error==='string'?body.error:typeof body?.message==='string'?body.message:Object.entries(body||{}).filter(([,v])=>typeof v==='string'||Array.isArray(v)).map(([k,v])=>`${k}: ${Array.isArray(v)?v.join(', '):v}`).join('; ').slice(0,500);
  async function request(method,path,body){
    if(!current())fail('Sesja kierowcy zmieniła się. Otwórz widok ponownie.');
    const generation=epoch;
    const response=await nativeRequest(method,path,body);
    if(!current()||generation!==epoch)fail('Zmieniono konto lub widok. Sprawdź stan rekordu po ponownym otwarciu.');
    if(!Number.isInteger(response?.status)||response.status<200||response.status>=300)fail(errorText(response?.body)||response?.message||'Nie potwierdzono operacji. Odśwież rekord przed powtórzeniem.');
    return response.body;
  }
  async function upload(path,file,fields){
    if(!file?.token||!current())fail('Brak zdjęcia lub bieżącej sesji.');
    const generation=epoch;
    const result=await nativeUpload(path,file.token,Object.fromEntries(Object.entries(fields||{}).map(([k,v])=>[k,String(v)])));
    if(!current()||generation!==epoch)fail('Zmieniono konto lub widok. Sprawdź wynik po ponownym otwarciu.');
    if(!Number.isInteger(result?.status)||result.status<200||result.status>=300)fail(errorText(result?.body)||'Nie potwierdzono przyjęcia pliku.');
    return result.body;
  }
  async function capture(scan=false){
    const result=await (scan?nativeScanDocument():nativeCapturePhoto());
    if(result?.status==='cancelled')return null;
    if(result?.status!=='ok'||!result.token)fail(result?.message||'Nie udało się przygotować dokumentu.');
    keepEvidence(result);return result;
  }
  function position(){
    if(!root)return;
    const header=document.querySelector('.app-header'),nav=document.querySelector('.bottom-nav'),device=document.querySelector('.device'),frame=device?.getBoundingClientRect();
    const vv=window.visualViewport,visibleBottom=vv?vv.offsetTop+vv.height:window.innerHeight;
    const keyboardGap=frame?Math.max(0,frame.bottom-visibleBottom):0;
    root.style.top=((header?.offsetTop||0)+(header?.offsetHeight||0))+'px';
    root.style.bottom=Math.max(nav?.offsetHeight||0,keyboardGap)+'px';
  }
  window.addEventListener('resize',position);
  window.visualViewport?.addEventListener('resize',position);
  window.visualViewport?.addEventListener('scroll',position);
  function close(){
    document.querySelectorAll('[data-nav]').forEach(n=>n.classList.toggle('active',n.dataset.nav==='now'));
    epoch++;clearInterval(tachoTimer);tachoTimer=null;root?.remove();root=null;screen='';busy=false;
    const action=document.getElementById('app-action');if(action)action.style.display='';
  }
  function mount(title,name){
    if(!current()&&root)close();
    if(!root){owner=String(state().profile?.id??'');if(!owner||state().status!=='connected')return false;
      root=document.createElement('section');root.className='live-workspace';root.setAttribute('aria-label',title);
      document.querySelector('.device').append(root);
    }
    screen=name;root.classList.remove('lw-chat-open');clearInterval(tachoTimer);tachoTimer=null;position();
    document.querySelectorAll('[data-nav]').forEach(n=>n.classList.toggle('active',n.dataset.nav===name));
    root.innerHTML=`<header class="lw-header"><button data-lw-close aria-label="Wróć do operacji">‹</button><div><small>SUPER SPEDYTOR</small><h2>${e(title)}</h2></div><button data-lw-refresh aria-label="Odśwież widok">↻</button></header><div class="lw-feedback" aria-live="polite"></div><div class="lw-body"><p class="lw-empty" role="status">Pobieram dane Twojego konta…</p></div>`;
    root.querySelector('[data-lw-close]').onclick=close;
    root.querySelector('[data-lw-refresh]').onclick=()=>open(screen,screenContext);
    document.getElementById('app-action').style.display='none';return true;
  }
  const body=()=>root?.querySelector('.lw-body');
  const feedback=(text,error=false)=>{const node=root?.querySelector('.lw-feedback');if(node){node.textContent=text;node.classList.toggle('error',error);}};
  const empty=text=>`<section class="panel lw-empty"><p>${e(text)}</p></section>`;
  const card=(title,description,action,attribute)=>`<button class="panel lw-row" ${attribute}><span><strong>${e(title)}</strong><small>${e(description)}</small></span><b>${e(action||'›')}</b></button>`;
  const button=(label,attr,secondary=false)=>`<button class="${secondary?'secondary-button':'primary-button'}" ${attr}>${e(label)}</button>`;
  let choiceSequence=0;
  function enhanceSelectors(){
    root?.querySelectorAll('select:not([data-designed-choice])').forEach(select=>{
      select.dataset.designedChoice='1';select.hidden=true;select.style.display='none';
      if(select.hasAttribute('data-status')){
        const group=document.createElement('div');group.className='lw-rating-options';group.setAttribute('role','radiogroup');group.setAttribute('aria-label','Ocena kroku');
        const options=[...select.options].filter(o=>o.value!=='');group.style.gridTemplateColumns=`repeat(${Math.min(3,options.length)},minmax(0,1fr))`;
        options.forEach(option=>{const card=document.createElement('button');card.type='button';card.setAttribute('role','radio');card.disabled=select.disabled||option.disabled;
          const tone=/^#[a-f0-9]{6}$/i.test(option.dataset.color||'')?option.dataset.color:'#ff6a1a';card.style.setProperty('--lw-choice-tone',tone);
          const mouth=tone.toLowerCase()==='#16a34a'?'M9 18q7 7 14 0':tone.toLowerCase()==='#dc2626'?'M9 23q7-7 14 0':'M10 20h12';
          card.innerHTML=`<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14"/><circle cx="11" cy="12" r="1"/><circle cx="21" cy="12" r="1"/><path d="${mouth}"/></svg><span>${e(option.textContent)}</span>`;
          const update=()=>{const active=select.value===option.value;card.setAttribute('aria-checked',String(active));card.classList.toggle('active',active);};update();select.addEventListener('change',update);
          card.onclick=()=>{if(busy)return;select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));};group.append(card);
        });select.after(group);return;
      }

      const trigger=document.createElement('button');trigger.type='button';trigger.className='lw-select-trigger';trigger.disabled=select.disabled;
      trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');
      const label=select.closest('label')?.childNodes[0]?.textContent?.trim()||'Wybierz opcję';
      const update=()=>{const option=select.options[select.selectedIndex];trigger.textContent=(option?.textContent||'Wybierz')+'  ⌄';};update();
      select.after(trigger);select.addEventListener('change',update);
      trigger.onclick=()=>{
        if(busy||select.disabled)return;
        const overlay=document.createElement('div');overlay.className='lw-choice-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',label);
        const titleId='lw-choice-'+(++choiceSequence);trigger.setAttribute('aria-expanded','true');
        overlay.innerHTML=`<section class="lw-choice-sheet"><header><div><small>WYBIERZ OPCJĘ</small><h3 id="${titleId}">${e(label)}</h3></div><button type="button" class="icon-button" data-choice-close aria-label="Zamknij wybór">×</button></header><div class="lw-choice-options" role="listbox" aria-labelledby="${titleId}">${[...select.options].filter(o=>o.value!=='').map(o=>`<button type="button" role="option" aria-selected="${o.selected}" data-choice-value="${e(o.value)}" ${o.disabled?'disabled':''}><span>${e(o.textContent)}</span><span class="lw-radio-mark" aria-hidden="true"></span></button>`).join('')}</div></section>`;
        const dismiss=()=>{overlay.remove();trigger.setAttribute('aria-expanded','false');trigger.focus();};
        overlay.querySelector('[data-choice-close]').onclick=dismiss;
        overlay.onclick=event=>{if(event.target===overlay)dismiss();};
        overlay.querySelectorAll('[data-choice-value]').forEach(option=>option.onclick=()=>{select.value=option.dataset.choiceValue;select.dispatchEvent(new Event('change',{bubbles:true}));update();dismiss();});
        overlay.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();dismiss();}if(event.key==='Tab'){const nodes=[...overlay.querySelectorAll('button:not([disabled])')],first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}};
        root.append(overlay);overlay.querySelector('[data-choice-close]').focus();
      };
    });
  }
  function bind(selector,handler){enhanceSelectors();root?.querySelectorAll(selector).forEach(node=>node.onclick=()=>run(()=>handler(node)));}
  async function run(work){
    if(busy)return;busy=true;feedback('');
    const buttons=[...(root?.querySelectorAll('button')||[])].map(node=>[node,node.disabled]);
    buttons.forEach(([node])=>node.disabled=true);
    try{await work();}catch(error){feedback(error.message||'Nie potwierdzono operacji.',true);}
    finally{busy=false;buttons.forEach(([node,disabled])=>{if(node.isConnected)node.disabled=disabled;});enhanceSelectors();}
  }
  async function open(name='menu',context={}){
    if(!enabled()||state().status!=='connected')return;
    const titles={menu:'Twoje sprawy',service:'Serwis i zadania',tacho:'Tacho',chat:'Czat',collection:'Dokumenty CMR',transshipment:'Przeładunki',fueling:'Tankowanie i parkingi',expenses:'Wydatki',files:'Pliki na telefonie',help:'Pomoc'};
    if(!mount(titles[name]||titles.menu,name))return;screenContext=context;
    const generation=++epoch;
    try{
      if(name==='tacho')await tacho();
      else if(name==='chat')context.offerId?await chat(context.offerId):await chats();
      else if(name==='service')context.taskId?await task(context.taskId):await tasks();
      else if(name==='collection')await collection();
      else if(name==='transshipment')await transshipments();
      else if(name==='expenses')await expenses(null,context.sourceRoutePoint);
      else if(name==='fueling')await routeStops();
      else if(name==='files')await files();
      else if(name==='help'){
        body().innerHTML=empty('W sprawach trasy i dokumentów wybierz Czat i właściwe zlecenie. O rezultacie operacji decyduje potwierdzenie TMS. W razie utraty połączenia odśwież rekord przed ponownym zapisem.')+button('Otwórz czat','data-lw-chat');bind('[data-lw-chat]',()=>open('chat'));
      }else{
        body().innerHTML=[['service','Serwis, ankiety i zadania','Przypisane zadania, wyposażenie i przekazanie auta'],['tacho','Tacho','Aktualny odczyt i zgłoszenie odpoczynku'],['chat','Czat','Zlecenia, wiadomości i załączniki'],['collection','Obieg dokumentów CMR','Własne koszulki i przekazania'],['transshipment','Przeładunki','Spotkania i kroki przypisane do Twojej trasy'],['fueling','Tankowanie i parkingi','Punkty trasy, zdjęcia i odpoczynek'],['expenses','Wydatki','Paragony, faktury i pozycje do poprawy'],['files','Pliki na telefonie','Zachowane zdjęcia, skany i nagrania tego konta'],['help','Pomoc','Kontakt w sprawie Twojej operacji']].map(([key,title,text])=>card(title,text,'›',`data-lw-open="${key}"`)).join('');bind('[data-lw-open]',n=>open(n.dataset.lwOpen));
      }
    }catch(error){if(generation===epoch&&root){body().innerHTML=empty('Nie udało się pobrać danych. Użyj odświeżenia, aby spróbować ponownie.');feedback(error.message,true);}}
  }
  async function tasks(){
    const [pending,history]=await Promise.all([request('GET','driver-tasks/pending/'),request('GET','driver-tasks/history/')]);
    const all=[...list(pending?.tasks),...list(pending?.all_tasks),...list(history)];
    const unique=[...new Map(all.filter(t=>t?.id).map(t=>[String(t.id),t])).values()];
    const todo=unique.filter(t=>['pending','in_progress'].includes(t.status));
    const completed=unique.filter(t=>!['pending','in_progress'].includes(t.status));
    body().innerHTML=`<div class="section-heading"><h3>Do zrobienia</h3><span>${todo.length}</span></div>`+(todo.map(t=>card(t.definition_name||t.definition?.name||'Zadanie',`${t.is_overdue?'Zaległe · ':''}${t.date||''} · ${t.status_display||statusLabel(t.status)}`,'Otwórz',`data-lw-task="${e(id(t.id))}"`)).join('')||empty('TMS nie zwrócił otwartych zadań dla tego konta.'))+`<div class="section-heading"><h3>Historia</h3><span>${completed.length}</span></div>`+completed.slice(0,30).map(t=>card(t.definition_name||t.definition?.name||'Wykonane zadanie',`${t.completed_at?dateTime(t.completed_at):t.date||''} · ${t.status_display||statusLabel(t.status)}`,'Podgląd',`data-lw-task="${e(id(t.id))}"`)).join('')+button('Rejestr wykonanych ankiet','data-lw-history',true);
    bind('[data-lw-task]',n=>task(n.dataset.lwTask));bind('[data-lw-history]',()=>{close();backendActiveNav='service';render();});
  }
  async function task(taskId){
    const data=await request('GET',`driver-tasks/${id(taskId)}/`);
    screenContext={taskId};
    const definition=data.definition||{},steps=definition.steps_config||[];
    body().innerHTML=`<section class="panel"><small>${e(data.date||'')}</small><h3>${e(definition.name||data.definition_name||'Zadanie')}</h3><p>${e(definition.description||'')}</p><p>Stan w TMS: <strong>${e(data.status_display||statusLabel(data.status))}</strong></p></section>`;
    const done=!['pending','in_progress'].includes(data.status);
    if(done)clearDraft('task:'+taskId);
    if(['vehicle-inventory','vehicle-handover'].includes(definition.slug)){
      await inventory(taskId,definition.slug==='vehicle-handover',done);if(!done)bindTaskDraft(taskId);return;
    }
    if(data.is_manual){
      body().insertAdjacentHTML('beforeend',`<section class="panel"><label class="lw-field">Informacja o wykonaniu<textarea id="lw-manual-note"></textarea></label>${done?'':button('Zakończ zadanie w TMS','data-lw-manual')}</section>`);
      bind('[data-lw-manual]',async()=>{if(!confirm('Potwierdzić wykonanie tego zadania w TMS?'))return;await request('POST',`driver-tasks/${id(taskId)}/complete-manual/`,{note:root.querySelector('#lw-manual-note').value});const read=await request('GET',`driver-tasks/${id(taskId)}/`);if(read.status!=='completed')fail('Wysłano żądanie, ale odczyt nie potwierdził zakończenia zadania.');await task(taskId);feedback('TMS potwierdził zakończenie zadania.');});return;
    }
    if(!steps.length){body().insertAdjacentHTML('beforeend',empty('To zadanie ma odrębny protokół. Otwórz właściwą sekcję dokumentów lub przeładunku.'));return;}
    steps.forEach((step,index)=>{
      const response=(data.step_responses||[]).find(r=>r.step_key===step.key)||{};
      const options=step.status_options||[];
      body().insertAdjacentHTML('beforeend',`<section class="panel lw-step" data-step-index="${index}"><div class="section-heading"><h3>${e(step.label||step.title||step.name||step.key)}</h3><span>${index+1}/${steps.length}</span></div>${step.description?`<p>${e(step.description)}</p>`:''}${options.length?`<label class="lw-field">Ocena<select data-status ${done?'disabled':''}><option value="">Wybierz ocenę</option>${options.map(o=>{const value=typeof o==='string'?o:o.value;return `<option value="${e(value)}" data-color="${e(typeof o==='string'?'':o.color||'')}" ${String(response.status_value)===String(value)?'selected':''}>${e(typeof o==='string'?o:o.label||o.value)}</option>`;}).join('')}</select></label>`:''}<label class="lw-field">${step.unit?'Wartość · '+e(step.unit):'Uwagi'}${step.note_required?' *':''}<textarea data-note ${done?'readonly':''}>${e(response.note||'')}</textarea></label><p>${response.photos?.length||0} zdjęć zapisanych w TMS${step.photo_required?' · zdjęcie wymagane':''}</p>${done?'':`<div class="lw-actions">${step.allow_photos||step.photo_required||step.photo_only?button('Zrób i dołącz zdjęcie',`data-task-photo="${index}"`,true):''}${button('Zapisz krok w TMS',`data-task-save="${index}"`)}</div>`}</section>`);
    });
    root.querySelectorAll('[data-step-index]').forEach(node=>node.dataset.stepKey=steps[Number(node.dataset.stepIndex)].key);
    if(!done)bindTaskDraft(taskId);
    const values=index=>{const node=root.querySelector(`[data-step-index="${index}"]`);return{step_key:steps[index].key,note:node.querySelector('[data-note]').value,...(node.querySelector('[data-status]')?{status_value:node.querySelector('[data-status]').value}:{})};};
    bind('[data-task-save]',async n=>{const v=values(Number(n.dataset.taskSave));await request('POST',`driver-tasks/${id(taskId)}/steps/`,v);const read=await request('GET',`driver-tasks/${id(taskId)}/`),saved=(read.step_responses||[]).find(r=>r.step_key===v.step_key);if(!saved||String(saved.note||'')!==v.note||v.status_value!==undefined&&String(saved.status_value||'')!==v.status_value)fail('Nie udało się potwierdzić wartości zapisanego kroku.');confirmDraft('task:'+taskId,Object.fromEntries(Object.entries(v).filter(([key])=>key!=='step_key').map(([key,value])=>['step:'+v.step_key+':'+key,value])));await task(taskId);feedback('Krok odczytany z TMS po zapisie.');});
    bind('[data-task-photo]',async n=>{const v=values(Number(n.dataset.taskPhoto)),before=(data.step_responses||[]).find(r=>r.step_key===v.step_key)?.photos||[],file=await capture();if(!file)return;try{await upload(`driver-tasks/${id(taskId)}/steps/`,file,v);const read=await request('GET',`driver-tasks/${id(taskId)}/`),photos=(read.step_responses||[]).find(r=>r.step_key===v.step_key)?.photos||[];if(photos.length<=before.length)fail('Nie potwierdzono nowego zdjęcia w zadaniu.');const saved=(read.step_responses||[]).find(r=>r.step_key===v.step_key);confirmDraft('task:'+taskId,Object.fromEntries(Object.entries(v).filter(([key,value])=>key!=='step_key'&&String(saved?.[key]??'')===value).map(([key,value])=>['step:'+v.step_key+':'+key,value])));await task(taskId);feedback('Zdjęcie odczytane z TMS.');}finally{keepEvidence(file);}});
  }
  async function inventory(taskId,handover=false,completed=false){
    const path=`inventory/driver/survey/${id(taskId)}/`,data=await request('GET',path);
    const stages=data.stages||[],rows=stages.flatMap(s=>s.products||[]),readOnly=completed||data.status==='completed';
    const hand=handover?await handoverDetails(taskId,readOnly):null;
    const sections=handover?(hand.photo_sections||[]):(data.shot_sections||[]),shotPhotos=handover?(hand.photos||[]):(data.shot_photos||[]);
    for(const section of sections){
      const shots=section.shots||[];
      body().insertAdjacentHTML('beforeend',`<section class="panel"><h3>${e(section.label||section.title||section.name||'Zdjęcia pojazdu')}</h3>${shots.map(shot=>{const key=typeof shot==='string'?shot:shot.code||shot.key||shot.id;const photos=shotPhotos.filter(p=>p.shot===key);const label=typeof shot==='string'?shot:shot.label||shot.title||key;return readOnly?`<div class="lw-row"><span><strong>${e(label)}</strong><small>${photos.length} zdjęć w TMS</small></span></div>`:card(label,`${photos.length} zdjęć w TMS`,'Dodaj',`data-inventory-shot="${e(key)}"`);}).join('')}</section>`);
    }
    stages.forEach((stage,si)=>{
      body().insertAdjacentHTML('beforeend',`<section class="panel"><h3>${e(stage.title||stage.name||stage.slot?.name||'Wyposażenie')}</h3>${(stage.products||[]).map((row,ri)=>`<div class="lw-inventory-row" data-inv="${si}:${ri}" data-inventory-key="${e(row.key)}"><strong>${e(row.product?.name||row.name||row.key)}</strong><p>Oczekiwane: ${e(row.expected)} · ${row.confirmed?'potwierdzone w TMS':'do sprawdzenia'}</p><div class="lw-counts">${[['good','Dobre'],['average','Zużyte'],['bad','Uszkodzone'],['recovered','Odzyskane']].map(([key,label])=>`<label>${label}<input type="number" min="0" max="9999" step="1" data-count="${key}" value="${Number(row[key]||0)}" ${readOnly?'disabled':''}></label>`).join('')}</div>${readOnly?'':button('Potwierdź tę pozycję',`data-inv-save="${si}:${ri}"`,true)}</div>`).join('')}</section>`);
    });
    if(!rows.length)body().insertAdjacentHTML('beforeend',empty('TMS nie zwrócił pozycji wyposażenia dla tego zadania.'));
    const answers=()=>Object.fromEntries(rows.map(row=>[row.key,Object.fromEntries(['good','average','bad','recovered','confirmed','found_at_slot'].map(k=>[k,row[k]??(k==='found_at_slot'?null:k==='confirmed'?false:0)]))]));
    bind('[data-inv-save]',async node=>{const [si,ri]=node.dataset.invSave.split(':').map(Number),row=stages[si].products[ri],values={},draftValues={};root.querySelectorAll(`[data-inv="${si}:${ri}"] [data-count]`).forEach(n=>{const value=Number(n.value);if(!Number.isInteger(value)||value<0||value>9999)fail('Podaj całkowite ilości od 0 do 9999.');values[n.dataset.count]=value;draftValues[n.dataset.draftField]=n.value;});const payload=answers();payload[row.key]={...payload[row.key],...values,confirmed:true};await request('PATCH',path+'draft/',{answers:payload});const read=await request('GET',path),saved=(read.stages||[]).flatMap(s=>s.products||[]).find(r=>r.key===row.key);if(!saved?.confirmed||Object.entries(values).some(([k,v])=>Number(saved[k])!==v))fail('Odczyt nie potwierdził zapisanych ilości.');confirmDraft('task:'+taskId,draftValues);await task(taskId);feedback('Pozycja potwierdzona w odczycie TMS.');});
    bind('[data-inventory-shot]',async n=>{if(readOnly)return;const file=await capture();if(!file)return;try{await upload(handover?`inventory/driver/handover/${id(taskId)}/photos/`:path+'shots/',file,{shot:n.dataset.inventoryShot});await task(taskId);feedback('TMS przyjął zdjęcie. Sprawdź liczbę w wymaganym ujęciu.');}finally{keepEvidence(file);}});
    if(!readOnly&&rows.length)body().insertAdjacentHTML('beforeend',button('Zakończ protokół w TMS','data-inv-finish'));
    bind('[data-inv-finish]',async()=>{if(formDrafts.get(draftKey('task:'+taskId))?.size)fail('Zapisz zmienione pola przed zakończeniem protokołu.');if(rows.some(r=>!r.confirmed))fail('Sprawdź i potwierdź każdą pozycję wyposażenia.');if(!confirm('Zakończyć i wysłać protokół w TMS?'))return;await request('POST',path+'submit/',{});const read=await request('GET',`driver-tasks/${id(taskId)}/`);if(read.status!=='completed')fail('Nie potwierdzono zakończenia protokołu w zadaniu. Sprawdź wymagane zdjęcia i potwierdzenia.');await task(taskId);feedback('TMS potwierdził zakończenie protokołu.');});
  }
  async function handoverDetails(taskId,readOnly){
    const path=`inventory/driver/handover/${id(taskId)}/`,hand=await request('GET',path),choices=hand.choices||{};
    const select=(key,label,value,options)=>`<label class="lw-field">${e(label)}<select data-ho="${e(key)}" ${readOnly?'disabled':''}><option value="">Wybierz</option>${options.map(o=>`<option value="${e(o.value)}" ${String(value)===String(o.value)?'selected':''}>${e(o.label)}</option>`).join('')}</select></label>`;
    body().insertAdjacentHTML('beforeend',`<section class="panel" id="lw-handover-header"><h3>Protokół przekazania pojazdu</h3><p>Przekazuje: ${e(hand.handing_label)}<br>Odbiera: ${e(hand.receiving_driver_name)}</p>${hand.missing?.length?`<p>Do uzupełnienia: ${e(hand.missing.join('; '))}</p>`:''}${[['place','Miejsce przekazania','text'],['odometer_km','Przebieg w km','number'],['km_to_service','Kilometry do przeglądu (ujemne = po terminie)','number']].map(([key,label,type])=>`<label class="lw-field">${label}<input type="${type}" data-ho="${key}" value="${e(hand[key]??'')}" ${readOnly?'readonly':''}></label>`).join('')}${select('no_fluids_in_cabin','Brak płynów eksploatacyjnych w kabinie',hand.no_fluids_in_cabin,[{value:true,label:'Potwierdzam brak płynów w kabinie'},{value:false,label:'Płyny są w kabinie'}])}${select('tail_lift_ok','Działanie windy',hand.tail_lift_ok,[{value:true,label:'Działa — stan OK'},{value:false,label:'Nie działa'}])}${select('cleanliness_rating','Czystość pojazdu',hand.cleanliness_rating,choices.cleanliness||[])}${(hand.card_rows||[]).map(row=>`<label class="lw-field">${e(row.name)} — 4 ostatnie cyfry lub BRAK<input data-ho-card="${e(row.key)}" maxlength="4" value="${e(hand.card_digits?.[row.key]||'')}" ${readOnly?'readonly':''}></label>`).join('')}${(choices.areas||[]).map(area=>`<label class="lw-field">Uwagi — ${e(area.label)}<textarea data-ho-area="${e(area.key)}" ${readOnly?'readonly':''}>${e(hand.area_notes?.[area.key]||'')}</textarea></label>`).join('')}<label class="lw-field">Dodatkowe ustalenia<textarea data-ho="notes" ${readOnly?'readonly':''}>${e(hand.notes||'')}</textarea></label>${readOnly?'':button('Zapisz dane i kontrole w TMS','data-ho-save')}</section>`);
    bind('[data-ho-save]',async()=>{
      const patch={card_digits:{},area_notes:{}};
      const draftValues=Object.fromEntries([...root.querySelectorAll('#lw-handover-header [data-draft-field]')].map(node=>[node.dataset.draftField,node.value]));
      root.querySelectorAll('#lw-handover-header [data-ho]').forEach(n=>{const key=n.dataset.ho;let value=n.value;if(['odometer_km','km_to_service'].includes(key)){if(value!==''&&!Number.isSafeInteger(Number(value)))fail('Podaj całkowite kilometry.');value=value===''?null:Number(value);}if(['no_fluids_in_cabin','tail_lift_ok'].includes(key))value=value===''?null:value==='true';patch[key]=value;});
      root.querySelectorAll('[data-ho-card]').forEach(n=>{const value=n.value.trim().toUpperCase();if(value&&!/^(\d{4}|BRAK)$/.test(value))fail('Wpisz dokładnie cztery cyfry karty lub BRAK.');patch.card_digits[n.dataset.hoCard]=value;});
      root.querySelectorAll('[data-ho-area]').forEach(n=>patch.area_notes[n.dataset.hoArea]=n.value);
      await request('PATCH',path,patch);const read=await request('GET',path);
      if(['place','odometer_km','km_to_service','no_fluids_in_cabin','tail_lift_ok','cleanliness_rating','notes'].some(key=>String(read[key]??'')!==String(patch[key]??'')))fail('Nie potwierdzono wszystkich wartości protokołu w odczycie TMS.');
      for(const group of ['card_digits','area_notes'])for(const [key,value]of Object.entries(patch[group])){if(String(read[group]?.[key]??'')!==value)fail('Odczyt nie potwierdził wszystkich pól protokołu.');}confirmDraft('task:'+taskId,draftValues);await task(taskId);feedback('Dane protokołu odczytane po zapisie w TMS.');
    });
    if(hand.driver_item_rows?.length){
      body().insertAdjacentHTML('beforeend',`<section class="panel"><h3>Rzeczy kierowcy przekazującego</h3>${hand.driver_item_rows.map(row=>`<label class="lw-field">${e(row.product)} × ${e(row.quantity)}<select data-ho-item="${e(id(row.item_id))}" ${readOnly?'disabled':''}><option value="">Wybierz</option>${(choices.driver_item||[]).map(c=>`<option value="${e(c.value)}" ${row.decision===c.value?'selected':''}>${e(c.label)}</option>`).join('')}</select></label>`).join('')}${readOnly?'':button('Zapisz ustalenia dotyczące rzeczy kierowcy','data-ho-items',true)}</section>`);
      bind('[data-ho-items]',async()=>{const values={};root.querySelectorAll('[data-ho-item]').forEach(n=>{if(n.value)values[n.dataset.hoItem]=n.value;});await request('PATCH',path,{driver_items:values});const read=await request('GET',path);if(Object.entries(values).some(([key,value])=>!read.driver_item_rows?.some(row=>String(row.item_id)===key&&row.decision===value)))fail('Odczyt nie potwierdził ustaleń dotyczących rzeczy kierowcy.');confirmDraft('task:'+taskId,Object.fromEntries(Object.entries(values).map(([key,value])=>['ho-item:'+key,value])));await task(taskId);feedback('Ustalenia odczytane po zapisie w TMS.');});
    }
    body().insertAdjacentHTML('beforeend',`<section class="panel"><h3>Potwierdzenia stron</h3><p>Potwierdź dopiero po wspólnym sprawdzeniu wyposażenia.</p>${[['handing','Przekazujący',hand.handing_label],['receiving','Odbierający',hand.receiving_driver_name]].map(([role,label,name])=>`<label class="lw-field">${label}: ${e(name)}<select data-ho-role="${role}" ${readOnly?'disabled':''}><option value="">Wybierz</option>${(choices.confirmation||[]).map(c=>`<option value="${e(c.value)}" ${hand.confirmations?.[role]?.decision===c.value?'selected':''}>${e(c.label)}</option>`).join('')}</select></label>${readOnly?'':button('Zapisz potwierdzenie: '+label,`data-ho-confirm="${role}"`,true)}`).join('')}</section>`);
    bind('[data-ho-confirm]',async n=>{const role=n.dataset.hoConfirm,value=root.querySelector(`[data-ho-role="${role}"]`).value;if(!value)fail('Wybierz wynik wspólnej kontroli.');if(!confirm('Zapisać wskazane potwierdzenie strony w protokole TMS?'))return;await request('PATCH',path,{confirmations:{[role]:value}});const read=await request('GET',path);if(read.confirmations?.[role]?.decision!==value)fail('TMS nie potwierdził wybranej decyzji.');confirmDraft('task:'+taskId,{['ho-role:'+role]:value});await task(taskId);feedback('Potwierdzenie odczytane z TMS.');});
    return hand;
  }
  async function tacho(){
    const generation=epoch;
    let data;
    try{data=await request('GET','vehicles/vehicles/tacho/me/');}catch(error){if(!current())throw error;if(generation!==epoch||screen!=='tacho')return;data={};feedback(error.message,true);}
    if(generation!==epoch||screen!=='tacho'||!root)return;
    body().innerHTML='<div data-live-tacho-panel></div>';
    let painted='';
    const render=(force=false)=>{
      if(!root||screen!=='tacho'||!current())return;
      const view=window.SuperSpedytorLiveTachoModel.build(data,Date.now());
      const key=JSON.stringify([view.ready,view.stale,view.mode?.key]),panel=root.querySelector('[data-live-tacho-panel]');
      if(!force&&key===painted){
        const set=(selector,text)=>{const node=panel.querySelector(selector);if(node)node.textContent=text;};
        const clock=view.stale?view.restSnapshot:view.rest;
        set('[data-rest-elapsed]',clock?.elapsedText||'—');
        set('[data-rest-remaining]',view.stale?'—':clock?.remainingText||'—');
        if(!view.stale)set('.tacho-driver-instruction .tacho-primary-time',view.hero?.text||'—');
        if(clock){const progress=panel.querySelector('.tacho-progress>span');if(progress)progress.style.setProperty('--progress',String(clock.progress*100)+'%');}
        return;
      }
      painted=key;panel.innerHTML=window.SuperSpedytorDesignedTacho.render(data,view);
      root.querySelectorAll('[data-live-open-rest]').forEach(node=>node.onclick=()=>{root.querySelector('[data-live-rest-picker]').hidden=false;root.querySelector('[data-rest-picker-close]').focus();});
    };
    render();
    const view=window.SuperSpedytorLiveTachoModel.build(data,Date.now());
      const choices=[
        {group:'Przerwa',value:'break_15',title:'Przerwa 15 min',hint:'Pierwsza część przerwy dzielonej 15 + 30',icon:'clock'},
        {group:'Przerwa',value:'break_30',title:'Przerwa 30 min',hint:'Druga część po wcześniej zaliczonych 15 minutach',icon:'clock'},
        {group:'Przerwa',value:'break_45',title:'Przerwa 45 min',hint:'Pełna przerwa w jeździe',icon:'clock'},
        {group:'Odpoczynek dobowy',value:'daily_rest_11',title:'Odpoczynek dobowy 11 h',hint:'Regularny odpoczynek dobowy',icon:'parking',rest:true},
        {group:'Odpoczynek dobowy',value:'daily_rest_9',title:'Odpoczynek dobowy 9 h',hint:'Skrócony odpoczynek — sprawdź dostępność na tachografie',icon:'parking',rest:true},
        {group:'Odpoczynek tygodniowy',value:'weekly_rest_45',title:'Odpoczynek tygodniowy 45 h',hint:'Regularny odpoczynek poza kabiną',icon:'home',rest:true},
        {group:'Odpoczynek tygodniowy',value:'weekly_rest_24',title:'Odpoczynek tygodniowy 24 h',hint:view.weeklyRestMustBeRegular?'TMS wymaga teraz regularnego odpoczynku 45 h':'Skrócony odpoczynek tygodniowy',icon:'home',rest:true,disabled:view.weeklyRestMustBeRegular}
      ];
      const groups=[...new Set(choices.map(c=>c.group))];
      const glyph=name=>`<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
      root.querySelector('[data-live-rest-picker]')?.remove();
      root.insertAdjacentHTML('beforeend',`<div class="lw-choice-overlay" data-live-rest-picker hidden><section class="lw-choice-sheet" role="dialog" aria-modal="true" aria-label="Wybierz odpoczynek"><header><h3>Zgłoś rozpoczęty odpoczynek</h3><button data-rest-picker-close aria-label="Zamknij wybór">×</button></header><section class="lw-choice-options lw-rest-choices"><p>Najpierw przełącz tachograf. Wybierz wymiar trwającej przerwy lub odpoczynku.</p>${groups.map(group=>`<section class="tacho-choice-group"><h4>${group}</h4><div class="tacho-choice-list" role="radiogroup" aria-label="${group}">${choices.filter(c=>c.group===group).map(c=>`<button class="tacho-choice ${c.rest?'rest':''}" role="radio" aria-checked="false" data-live-rest-type="${c.value}" ${c.disabled?'disabled':''}><span class="tacho-choice-icon">${glyph(c.icon)}</span><span><strong>${c.title}</strong><small>${e(c.hint)}</small></span><span class="lw-radio-mark" aria-hidden="true"></span></button>`).join('')}</div></section>`).join('')}</section><div class="lw-rest-submit"><button class="primary-button" data-tacho-declare disabled>Wybierz przerwę lub odpoczynek</button></div></section></div>`);
      root.querySelector('[data-rest-picker-close]').onclick=()=>{root.querySelector('[data-live-rest-picker]').hidden=true;root.querySelector('[data-live-open-rest]')?.focus();};
      let selectedType=null;
      root.querySelectorAll('[data-live-rest-type]').forEach(node=>node.onclick=()=>{
        if(busy||node.disabled)return;selectedType=node.dataset.liveRestType;
        root.querySelectorAll('[data-live-rest-type]').forEach(option=>{const active=option===node;option.setAttribute('aria-checked',String(active));option.classList.toggle('selected',active);});
        const send=root.querySelector('[data-tacho-declare]');send.disabled=false;send.textContent='Zgłoś: '+choices.find(c=>c.value===selectedType).title;
      });
      bind('[data-tacho-declare]',async()=>{const type=selectedType;if(!type)fail('Wybierz przerwę lub odpoczynek.');if(!confirm('Zapisać w TMS: '+choices.find(c=>c.value===type).title+'?'))return;await request('POST','vehicles/vehicles/tacho/driver-event/',{event_type:type});const read=await request('GET','vehicles/vehicles/tacho/me/');if(read.event?.event_type!==type)fail('Odczyt TMS nie potwierdził wybranego zgłoszenia.');await tacho();feedback('Zgłoszenie odczytane z TMS.');});

    let tick=0,refreshing=false;
    clearInterval(tachoTimer);
    tachoTimer=setInterval(async()=>{
      if(!root||generation!==epoch||screen!=='tacho')return;
      if(!current()){close();return;}
      if(document.hidden)return;
      render();
      if(++tick%60===0&&!busy&&!refreshing){
        refreshing=true;
        try{const fresh=await request('GET','vehicles/vehicles/tacho/me/');if(generation===epoch&&screen==='tacho'){data=fresh;render(true);}}
        catch(error){if(current())feedback(error.message,true);}
        finally{refreshing=false;}
      }
    },1000);
  }
  async function chats(){
    const data=await request('GET','chat/threads/?scope=mine&status=active'),threads=list(data);
    body().innerHTML=threads.map(t=>card(t.order_number||t.offer_number||t.title||`Zlecenie ${t.offer_id||t.id}`,t.last_message?.body||t.last_message_preview||t.status_display||'Czat zlecenia','Otwórz',`data-lw-thread="${e(id(t.offer_id||t.transport_offer||t.offer?.id||t.id))}"`)).join('')||empty('Brak dostępnych aktywnych czatów dla tego konta.');
    bind('[data-lw-thread]',n=>chat(n.dataset.lwThread));
  }
  async function chat(offerId){
    const path=`chat/threads/${id(offerId)}/messages/`,data=await request('GET',path),messages=window.SuperSpedytorLiveChatView.chronological(list(data));
    screenContext={offerId};root.classList.add('lw-chat-open');
    body().innerHTML=`<div class="lw-messages" role="log" aria-label="Rozmowa zlecenia">${messages.map(m=>window.SuperSpedytorLiveChatView.message(m,bridge)).join('')||empty('W tym wątku nie ma wiadomości.')}</div><section class="lw-chat-composer chat-composer"><label class="lw-field" for="lw-chat-message">Wiadomość<textarea id="lw-chat-message" data-draft-field="message" maxlength="10000" rows="1" placeholder="Napisz wiadomość…"></textarea></label>${button('Wyślij','data-chat-send')}<details class="lw-chat-tools"><summary>Dołącz zdjęcie, plik lub nagranie</summary><div class="lw-actions">${button('Zdjęcie','data-chat-photo',true)}${button('Plik PDF lub zdjęcie','data-chat-file',true)}${button('Nagraj wiadomość','data-chat-audio',true)}</div></details></section>`;
    root.querySelectorAll('[data-chat-inline-preview]').forEach(image=>image.onerror=()=>{image.hidden=true;image.closest('figure').querySelector('.lw-preview-error').hidden=false;});
    const conversation=root.querySelector('.lw-messages');conversation.scrollTop=conversation.scrollHeight;
    const input=root.querySelector('#lw-chat-message');
    input.addEventListener('focus',position);input.addEventListener('blur',position);
    input.addEventListener('input',()=>{input.style.height='auto';input.style.height=Math.min(100,input.scrollHeight)+'px';});
    bindDraft('chat:'+offerId);input.style.height=Math.min(100,input.scrollHeight)+'px';
    position();
    bind('[data-chat-send]',async()=>{const draft=root.querySelector('#lw-chat-message').value,text=draft.trim();if(!text)fail('Wpisz wiadomość.');if(!confirm('Wysłać tę wiadomość do czatu zlecenia?'))return;await request('POST',path,{body:text});const read=list(await request('GET',path));if(!read.some(m=>(m.body||m.text)===text&&!messages.some(old=>String(old.id)===String(m.id))))fail('Nie potwierdzono nowej wiadomości w odczycie czatu.');confirmDraft('chat:'+offerId,{message:draft});await chat(offerId);feedback('Wiadomość odczytana z czatu po wysłaniu.');});
    bind('[data-chat-photo]',async()=>{const file=await capture();if(!file)return;try{if(!confirm('Wysłać wybrane zdjęcie do tego czatu zlecenia?'))return;const draft=root.querySelector('#lw-chat-message').value;await upload(path,file,{body:draft.trim()});const read=list(await request('GET',path));if(!read.some(m=>!messages.some(old=>String(old.id)===String(m.id))))fail('Nie potwierdzono nowej wiadomości ze zdjęciem. Plik pozostaje na telefonie.');confirmDraft('chat:'+offerId,{message:draft});await chat(offerId);feedback('Nowa wiadomość ze zdjęciem odczytana z czatu.');}finally{keepEvidence(file);}});
    const sendFile=async audio=>{const file=await (audio?recordVoice():chooseFile());if(file?.status==='cancelled')return;if(file?.status!=='ok'||!file.token)fail(file?.message||'Nie udało się przygotować pliku.');keepEvidence(file);if(!confirm('Wysłać ten plik lub nagranie do czatu wskazanego zlecenia?'))return;const draft=root.querySelector('#lw-chat-message').value;await upload(path,file,{body:draft.trim()});const read=list(await request('GET',path));if(!read.some(m=>!messages.some(old=>String(old.id)===String(m.id))))fail('Nie potwierdzono nowej wiadomości z załącznikiem. Plik pozostaje na telefonie.');confirmDraft('chat:'+offerId,{message:draft});await chat(offerId);feedback('Nowa wiadomość odczytana z czatu po wysyłce.');};
    bind('[data-chat-file]',()=>sendFile(false));bind('[data-chat-audio]',()=>sendFile(true));

  }
  async function collection(){
    const [data,transfers]=await Promise.all([request('GET','documents/cmr-collection/?page_size=100'),request('GET','documents/cmr-transfers/pending/')]);
    const items=list(data),incoming=transfers?.incoming,outgoing=transfers?.outgoing;
    body().innerHTML=items.map(item=>`<section class="panel"><h3>${e(item.order_number||item.transport_offer_number||`CMR ${item.id}`)}</h3><p>${e(item.status_display||item.status||'')} · ${e(item.label_code||item.qr_code||'')}</p>${button('Zrób zdjęcie koszulki',`data-cmr-photo="${e(id(item.id))}"`,true)}</section>`).join('')||empty(data?.enabled===false?'Obieg CMR jest wyłączony dla tego konta.':'TMS nie zwrócił dokumentów do oddania.');
    body().insertAdjacentHTML('beforeend',`<section class="panel"><h3>Odbierz dokumenty od kierowcy</h3>${button('Pokaż mój jednorazowy kod','data-cmr-code',true)}<div id="lw-cmr-code"></div></section>`);
    if(incoming)body().insertAdjacentHTML('beforeend',`<section class="panel"><h3>Przychodzące przekazanie</h3><p>${e(incoming.from_driver_name||'')} · ${incoming.item_count??incoming.items?.length??'—'} dokumentów</p>${button('Przyjmij fizycznie odebrane dokumenty','data-cmr-accept')}</section>`);
    if(outgoing)body().insertAdjacentHTML('beforeend',empty(`Twoje przekazanie oczekuje na odbiorcę: ${outgoing.to_driver_name||outgoing.status||'oczekiwanie'}.`));
    if(items.length)body().insertAdjacentHTML('beforeend',`<section class="panel"><h3>Przekaż kierowcy</h3><label class="lw-field">Jednorazowy kod odbiorcy<input id="lw-transfer-code" autocomplete="off"></label>${button('Poproś o przyjęcie dokumentów','data-cmr-transfer')}</section>`);
    bind('[data-cmr-code]',async()=>{const code=await request('POST','documents/cmr-handover-code/mine/',{});const value=code.code||code.handover_code;if(!value)fail('TMS nie zwrócił kodu odbioru.');root.querySelector('#lw-cmr-code').textContent=value;});
    bind('[data-cmr-photo]',async n=>{const file=await capture();if(!file)return;try{await upload(`documents/cmr-collection/${id(n.dataset.cmrPhoto)}/photo/`,file,{});await collection();feedback('TMS przyjął zdjęcie koszulki.');}finally{keepEvidence(file);}});
    bind('[data-cmr-accept]',async()=>{if(!confirm('Czy fizycznie odebrano wskazane dokumenty? Zapis potwierdzi przejęcie w TMS.'))return;await request('POST',`documents/cmr-transfers/${id(incoming.id)}/accept/`,{});await collection();feedback('Odświeżono stan przekazania po odpowiedzi TMS.');});
    bind('[data-cmr-transfer]',async()=>{const code=root.querySelector('#lw-transfer-code').value.trim();if(!code)fail('Wpisz kod odbiorcy.');if(!confirm('Wysłać do wskazanego kodem kierowcy prośbę o przejęcie własnych dokumentów?'))return;await request('POST','documents/cmr-transfers/',{to_driver_code:code,item_ids:items.map(i=>i.id)});const read=await request('GET','documents/cmr-transfers/pending/');if(!read.outgoing)fail('Nie potwierdzono oczekującego przekazania.');await collection();feedback('Prośba oczekuje w TMS na przyjęcie przez odbiorcę.');});
  }
  async function files(){
    const response=await nativeCall(id=>bridge.localFiles(id));
    if(response?.status!==200)fail('Nie udało się odczytać plików tego konta.');
    const entries=list(response.body);entries.forEach(keepEvidence);
    body().innerHTML=empty('To lokalne kopie przypisane do Twojego konta. Pozostają dostępne po ponownym zalogowaniu. Sam plik nie potwierdza przyjęcia dokumentu w TMS.')+entries.map(file=>`<section class="panel"><h3>${e(file.name)}</h3><p>${e(file.mime)} · ${(Number(file.size)/1024/1024).toFixed(1)} MB</p><a href="ssfile://local/${e(file.token)}" target="_blank">Otwórz lub zachowaj w Plikach</a>${button('Usuń tę lokalną kopię',`data-local-remove="${e(file.token)}"`,true)}</section>`).join('');
    bind('[data-local-remove]',async n=>{if(!confirm('Usunąć tę lokalną kopię? Najpierw sprawdź zapis w TMS albo zachowaj plik poza aplikacją.'))return;bridge.releaseFile(n.dataset.localRemove);localEvidence.delete(n.dataset.localRemove);await files();});
  }
  async function expenses(entry=null,sourcePoint=null){
    const data=entry?null:await request('GET','stats/cost-entries/my-rejected/'),profile=state().profile||{},driverId=profile.driver_profile?.id||profile.driver?.id,vehicleId=state().vehicle?.id;
    if(!driverId||!vehicleId){body().innerHTML=empty('TMS nie potwierdził profilu kierowcy i bieżącego pojazdu. Odśwież dane przed dodaniem wydatku.');return;}
    const items=data?.entries||[],today=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Warsaw'});
    const select=(name,label,options,value='')=>`<label class="lw-field">${label}<select data-exp="${name}"><option value="">Wybierz</option>${options.map(([v,t])=>`<option value="${v}" ${String(value)===v?'selected':''}>${e(t)}</option>`).join('')}</select></label>`;
    const input=(name,label,type='text',value='')=>`<label class="lw-field">${label}<input data-exp="${name}" type="${type}" value="${e(value)}" ${type==='number'?'step="any" min="0"':''}></label>`;
    body().innerHTML=items.map(item=>card(item.cost_type_display||item.cost_type,`${item.date||''} · ${item.rejection_reason||item.reject_reason||'Do poprawy'}`,'Popraw',`data-exp-edit="${e(id(item.id))}"`)).join('')+`<section class="panel" id="lw-expense-form"><h3>${entry?'Popraw wydatek':'Dodaj wydatek'} · ${e(state().vehicle?.registration_number||'')}</h3>${input('date','Data dokumentu','date',entry?.date||today)}${select('cost_type','Rodzaj wydatku',[['fuel','Paliwo'],['adblue','AdBlue'],['highway','Opłata drogowa'],['parking','Parking'],['car_wash','Myjnia'],['consumables','Materiały eksploatacyjne'],['service','Serwis'],['accommodation','Nocleg'],['manual_loading','Ręczny załadunek / rozładunek']],entry?.cost_type)}${select('payment_method','Sposób zapłaty',[['cash','Gotówka'],['card','Karta płatnicza'],['revolut','Revolut'],['tankpool','Tankpool'],['e100','E100'],['dkv','DKV'],['uta','UTA'],['eni','ENI'],['bank_transfer','Przelew']],entry?.payment_method)}${select('accounting_type','Dokument',[['accounting','Księgowy — faktura'],['non_accounting','Nieksięgowy']],entry?.accounting_type)}${input('amount_net','Kwota netto według dokumentu','number',entry?.amount_net??'')}${input('amount_vat','Kwota VAT według dokumentu','number',entry?.amount_vat??'')}${select('currency','Waluta',[['PLN','PLN'],['EUR','EUR'],['CZK','CZK'],['GBP','GBP'],['CHF','CHF'],['HUF','HUF'],['SEK','SEK'],['DKK','DKK'],['NOK','NOK']],entry?.currency)}${input('country','Kod kraju, np. PL lub DE','text',entry?.country||'')}${input('invoice_number','Numer faktury / paragonu','text',entry?.invoice_number||'')}${input('odometer','Przebieg pojazdu w km','number',entry?.odometer??'')}${input('fuel_liters','Litry paliwa / AdBlue (tylko tankowanie)','number',entry?.fuel_liters??'')}<label class="lw-field">Opis<textarea data-exp="description">${e(entry?.description||'')}</textarea></label><label class="lw-field">Informacja dla biura<textarea data-exp="dispatcher_note">${e(entry?.dispatcher_note||'')}</textarea></label><label class="lw-field"><span><input type="checkbox" data-exp="paid_by_driver" ${entry?.paid_by_driver?'checked':''}> Zapłaciłam / zapłaciłem własnymi pieniędzmi</span></label><label class="lw-field"><span><input type="checkbox" data-exp="has_driver_invoice" ${entry?.has_driver_invoice?'checked':''}> Faktura kierowcy</span></label><p id="lw-exp-file">Nie wybrano załącznika.</p><div class="lw-actions">${button('Zrób zdjęcie dokumentu','data-exp-camera',true)}${button('Zeskanuj dokument PDF','data-exp-scan',true)}${button('Wybierz plik dokumentu','data-exp-file',true)}${button('Zapisz wydatek w TMS','data-exp-save')}</div></section>`;
    let attachment=null;
    const attach=async scan=>{const file=await capture(scan);if(!file)return;if(attachment)keepEvidence(attachment);attachment=file;root.querySelector('#lw-exp-file').textContent=`${file.name} · ${(file.size/1024/1024).toFixed(1)} MB`};
    bind('[data-exp-camera]',()=>attach(false));bind('[data-exp-scan]',()=>attach(true));
    bind('[data-exp-file]',async()=>{const file=await chooseFile();if(file?.status==='cancelled')return;if(file?.status!=='ok'||!file.token)fail(file?.message||'Nie wybrano pliku.');attachment=file;keepEvidence(file);root.querySelector('#lw-exp-file').textContent=file.name;});
    bind('[data-exp-edit]',async n=>{const record=await request('GET',`stats/cost-entries/${id(n.dataset.expEdit)}/`);await expenses(record);});
    bind('[data-exp-save]',async()=>{
      const payload={vehicle:Number(id(entry?.vehicle||vehicleId)),driver:Number(id(driverId)),is_general_expense:false,expense_category:'',create_note:false};
      root.querySelectorAll('#lw-expense-form [data-exp]').forEach(node=>payload[node.dataset.exp]=node.type==='checkbox'?node.checked:node.value.trim());
      for(const field of ['date','cost_type','payment_method','accounting_type','amount_net','amount_vat','currency'])if(payload[field]==='')fail('Uzupełnij datę, rodzaj, sposób zapłaty, dokument, kwoty i walutę.');
      for(const field of ['amount_net','amount_vat','fuel_liters','odometer'])if(payload[field]!==''&&(!Number.isFinite(Number(payload[field]))||Number(payload[field])<0))fail('Kwoty, litry i przebieg muszą być nieujemnymi liczbami.');
      if(['fuel','adblue'].includes(payload.cost_type)&&(!payload.fuel_liters||!payload.odometer))fail('Przy tankowaniu podaj litry i przebieg.');
      if(sourcePoint&&['fuel','adblue'].includes(payload.cost_type))payload.source_route_point=Number(id(sourcePoint));
      if(!attachment&&!entry)fail('Dołącz zdjęcie lub skan dokumentu.');
      if(!confirm('Zapisać ten wydatek i załączony dokument w rzeczywistym TMS?'))return;
      let result;
      if(entry){result=await request('PATCH',`stats/cost-entries/${id(entry.id)}/`,payload);if(attachment)await upload(`stats/cost-entries/${id(entry.id)}/add-files/`,attachment,{});}
      else result=await upload('stats/cost-entries/',attachment,payload);
      const recordId=id(result?.id||entry?.id),read=await request('GET',`stats/cost-entries/${recordId}/`);
      if(String(read.driver)!==String(driverId)||read.currency!==payload.currency||Number(read.amount_net)!==Number(payload.amount_net)||Number(read.amount_vat)!==Number(payload.amount_vat)||payload.source_route_point&&Number(read.source_route_point)!==payload.source_route_point)fail('Odczyt nie potwierdził danych zapisanego wydatku. Sprawdź wpis przed powtórzeniem.');
      if(attachment)keepEvidence(attachment);attachment=null;await expenses();feedback(`Wydatek ${recordId} odczytany z TMS po zapisie.`);
    });
  }
  async function routeStops(){
    const snapshot=await request('GET','routes/driver/status/'),points=(snapshot.active_routes||[]).flatMap(r=>r.operations||[r.current_point,r.next_point].filter(Boolean)).filter(p=>['fueling','fuel','parking'].includes(p.operation_type));
    body().innerHTML=points.map(p=>card(p.location_name||p.operation_type_display||'Punkt trasy',`${p.status_display||p.status||''} · ${p.time_window_start||p.planned_at||''}`,'Otwórz',`data-route-stop="${e(id(p.id))}"`)).join('')||empty('Brak punktów tankowania lub parkingów w aktywnej trasie.');
    body().insertAdjacentHTML('beforeend',button('Dodaj wydatek lub paragon','data-stop-expenses',true));bind('[data-stop-expenses]',()=>open('expenses'));bind('[data-route-stop]',n=>fuelPoint(n.dataset.routeStop));
  }
  async function fuelPoint(pointId){
    const path=`routes/points/${id(pointId)}/`,point=await request('GET',path),fuel=['fuel','fueling'].includes(point.operation_type),photos=point.fuel_photos||[];
    body().innerHTML=`<section class="panel"><h3>${e(point.location_name||point.operation_type_display||'Punkt trasy')}</h3><p>${e(point.location_address||point.location_details?.full_address||'')}</p><p>Stan w TMS: ${e(point.status_display||point.status||'')}</p></section>`;
    if(fuel){body().insertAdjacentHTML('beforeend',`<section class="panel"><h3>Dokumentacja tankowania</h3>${[['nozzle','Pistolet w baku'],['dispenser','Wyświetlacz dystrybutora']].map(([kind,label])=>card(label,photos.some(p=>p.kind===kind)?'Zdjęcie zapisane w TMS':'Brak zdjęcia','Zrób zdjęcie',`data-fuel-photo="${kind}"`)).join('')}<label class="lw-field">Nie mogę zrobić zdjęć<select id="lw-fuel-skip"><option value="">Wybierz przyczynę</option><option value="no_self_service">Brak dystrybutora self-service</option><option value="camera_broken">Awaria aparatu / telefonu</option><option value="not_allowed">Zakaz fotografowania</option><option value="other">Inny powód</option></select></label><label class="lw-field">Opis przyczyny<textarea id="lw-fuel-reason"></textarea></label>${button('Zapisz uzasadnienie w TMS','data-fuel-skip',true)}${point.fuel_photo_skip?`<p>Zapisany wyjątek: ${e(point.fuel_photo_skip.reason_display||point.fuel_photo_skip.reason)}</p>`:''}</section>`);}
    const action=point.status==='pending'?'start':point.status==='in_progress'?'complete':null;
    if(action)body().insertAdjacentHTML('beforeend',button(action==='start'?'Dotarłem — rozpocznij punkt':'Zakończ punkt w TMS','data-stop-status'));
    body().insertAdjacentHTML('beforeend',button(fuel?'Wydatek i paragon za tankowanie':'Wydatek za parking','data-stop-cost',true)+button('Panel tacho i odpoczynek','data-stop-tacho',true));
    bind('[data-fuel-photo]',async n=>{const file=await capture();if(!file)return;try{await upload(path+'fuel-photos/',file,{kind:n.dataset.fuelPhoto});const read=await request('GET',path);if(!read.fuel_photos?.some(p=>p.kind===n.dataset.fuelPhoto))fail('Odczyt nie potwierdził zdjęcia w tym slocie.');await fuelPoint(pointId);feedback('Zdjęcie tankowania odczytane z TMS.');}finally{keepEvidence(file);}});
    bind('[data-fuel-skip]',async()=>{const reason=root.querySelector('#lw-fuel-skip').value,reason_text=root.querySelector('#lw-fuel-reason').value.trim();if(!reason||reason==='other'&&!reason_text)fail('Wybierz przyczynę i opisz inny powód.');if(!confirm('Zapisać w TMS podane uzasadnienie braku zdjęć?'))return;await request('POST',path+'skip-fuel-photos/',{reason,reason_text});const read=await request('GET',path);if(!read.fuel_photo_skip)fail('Nie potwierdzono wyjątku w punkcie.');await fuelPoint(pointId);feedback('Uzasadnienie odczytane z TMS.');});
    bind('[data-stop-status]',async()=>{if(action==='complete'&&fuel&&!point.fuel_photo_skip&&(!photos.some(p=>p.kind==='nozzle')||!photos.some(p=>p.kind==='dispenser')))fail('Uzupełnij oba zdjęcia tankowania lub rzeczywiste uzasadnienie ich braku.');if(!confirm('Zapisać wskazaną zmianę statusu tego punktu w TMS?'))return;await request('POST',path+action+'/',{});const read=await request('GET',path);if(read.status!==(action==='start'?'in_progress':'completed'))fail('Odczyt nie potwierdził zmiany statusu punktu.');await fuelPoint(pointId);feedback('Status punktu odczytany z TMS.');});
    bind('[data-stop-cost]',()=>open('expenses',{sourceRoutePoint:pointId}));bind('[data-stop-tacho]',()=>open('tacho'));
  }
  async function transshipments(){
    const meetings=list(await request('GET','routes/transshipment-steps/upcoming/'));
    body().innerHTML=meetings.map(m=>card(m.place_name||'Przeładunek',`${m.window?.start||''} · ${m.steps_count||0} kroków · wydajesz ${m.releases||0}, odbierasz ${m.receipts||0}`,'Otwórz',`data-trans-point="${e(id(m.point_id))}"`)).join('')||empty('Brak nadchodzących przeładunków dla tego konta.');
    bind('[data-trans-point]',n=>meeting(n.dataset.transPoint));
  }
  async function meeting(pointId){
    const data=await request('GET',`routes/transshipment-steps/mine/?point_id=${id(pointId)}`),steps=data.steps||[],pointIds=(data.point_ids||[]).map(v=>Number(id(v))),arrived=steps.find(s=>s.kind==='arrive')?.status==='done',finish=steps.find(s=>s.kind==='finish'),done=data.status==='completed';
    body().innerHTML=`<section class="panel"><h3>${e(data.place?.name||'Spotkanie przeładunkowe')}</h3><p>${e(data.place?.address||'')}</p><p>${e(data.window?.start||'')} – ${e(data.window?.end||'')}</p></section>`+steps.filter(s=>['release','receive'].includes(s.kind)).map(s=>`<section class="panel"><h3>${s.kind==='release'?'Wydajesz':'Odbierasz'}: ${e((s.kind==='release'?s.to:s.from)?.driver_name||(s.kind==='release'?s.to:s.from)?.name||'kierowca')}</h3><p>Zlecenia: ${e((s.offers||[]).join(', '))} · ${e(s.status||'')}</p><p>Sztuki: ${(s.pieces||[]).filter(p=>p.scanned).length}/${s.pieces?.length||0} · CMR: ${(s.cmr||[]).filter(c=>c.scanned).length}/${s.cmr?.length||0}</p>${button('Plomby, ładunek i zdjęcia',`data-trans-detail="${e(id(s.point_id))}"`,true)}</section>`).join('')+(done?empty('TMS potwierdza zakończone spotkanie.'):arrived?`<section class="panel"><h3>Domknięcie spotkania</h3>${(finish?.blockers||[]).map(b=>`<p>${e(b.order_number||b.offer_id||'Zlecenie')}: ${e(b.message||b.reason||JSON.stringify(b))}</p>`).join('')}${button('Zakończ przeładunek w TMS','data-trans-finish')}</section>`:button('Jestem na miejscu — rozpocznij przeładunek','data-trans-arrive'));
    bind('[data-trans-detail]',n=>transPoint(n.dataset.transDetail,pointId));
    bind('[data-trans-arrive]',async()=>{if(!pointIds.length)fail('TMS nie zwrócił punktów spotkania.');if(!confirm('Potwierdzić przyjazd na to spotkanie w TMS?'))return;await request('POST','routes/transshipment-steps/arrive/',{point_ids:pointIds});const read=await request('GET',`routes/transshipment-steps/mine/?point_id=${id(pointId)}`);if(!read.steps?.some(s=>s.kind==='arrive'&&s.status==='done'))fail('Nie potwierdzono rozpoczęcia spotkania.');await meeting(pointId);feedback('Przyjazd odczytany z TMS.');});
    bind('[data-trans-finish]',async()=>{if(finish?.blockers?.length)fail('Uzupełnij wskazane przez TMS braki.');if(!confirm('Zakończyć wszystkie własne punkty tego przeładunku w TMS?'))return;await request('POST','routes/transshipment-steps/finish/',{point_ids:pointIds,notes:''});const read=await request('GET',`routes/transshipment-steps/mine/?point_id=${id(pointId)}`);if(read.status!=='completed')fail('Odczyt nie potwierdził zakończenia spotkania.');await meeting(pointId);feedback('TMS potwierdził zakończenie przeładunku.');});
  }
  async function transPoint(pointId,meetingId){
    const path=`routes/points/${id(pointId)}/`,point=await request('GET',path),offers=point.transshipment_offers||[],scanned=new Set((point.transshipment_state?.scanned_item_ids||[]).map(String));
    body().innerHTML=button('Wróć do spotkania','data-trans-back',true)+`<section class="panel"><h3>${point.operation_type==='transshipment_out'?'Wydanie':'Przyjęcie'} ładunku</h3><p>${e(point.location_name||'')} · ${e(point.status_display||point.status||'')}</p><div class="lw-actions">${button('Skanuj plombę sztuki lub CMR','data-trans-scan',true)}<label class="lw-field">Kod do wpisania ręcznie<input id="lw-trans-code" autocomplete="off"></label>${button('Sprawdź wpisany kod w TMS','data-trans-code',true)}</div></section>`;
    offers.forEach(offer=>{
      const pieces=offer.cargo_items||[],ready=pieces.length>0&&pieces.every(p=>scanned.has(String(p.id)));
      body().insertAdjacentHTML('beforeend',`<section class="panel" data-trans-offer="${e(id(offer.id))}"><h3>${e(offer.order_number||offer.id)}</h3><p>${e(offer.weight_kg??'—')} kg · ${e(offer.pieces_count??pieces.length)} szt.</p>${pieces.map(p=>`<label class="lw-field">${p.label_code?`<span>${scanned.has(String(p.id))?'✓':'○'} ${e(p.description||p.name||'Sztuka')} · ${e(p.label_code)}</span>`:`<span><input type="checkbox" data-unsealed-piece="${e(id(p.id))}" ${offer.cargo_confirmed_at?'checked disabled':''}> Fizycznie sprawdzono: ${e(p.description||p.name||'Sztuka bez plomby')}</span>`}</label>`).join('')}<p>Ładunek: ${offer.cargo_confirmed_at?'potwierdzony w TMS':ready?'plomby zeskanowane — potwierdź fizyczny stan':'do sprawdzenia'}. Dokument CMR: ${offer.cmr_confirmed_at?'potwierdzony':'do zeskanowania'}.</p>${offer.cargo_confirmed_at?'':button('Potwierdź fizyczny stan tego ładunku',`data-trans-confirm="${e(id(offer.id))}"`,true)}<div class="lw-actions">${[['photo_transshipment','Zdjęcie ładunku'],['photo_transshipment_label','Zdjęcie plomby na ładunku'],['photo_transshipment_cmr','Zdjęcie dokumentu CMR']].map(([type,label])=>button(label,`data-trans-photo="${e(id(offer.id))}" data-document-type="${type}"`,true)).join('')}</div></section>`);
    });
    const scan=async(code,manual)=>{await request('POST',path+'transshipment-scan/',{code,manual});await transPoint(pointId,meetingId);feedback('Odświeżono plomby i bramki z TMS po skanie.');};
    bind('[data-trans-back]',()=>meeting(meetingId));
    bind('[data-trans-scan]',async()=>{const result=await nativeScanCode();if(result?.status==='cancelled')return;if(result?.status!=='ok'||!result.code)fail(result?.message||'Nie odczytano plomby.');await scan(result.code,false);});
    bind('[data-trans-code]',async()=>{const code=root.querySelector('#lw-trans-code').value.trim();if(!code)fail('Wpisz kod plomby.');await scan(code,true);});
    bind('[data-trans-confirm]',async n=>{const offer=offers.find(o=>String(o.id)===n.dataset.transConfirm),pieces=offer.cargo_items||[],node=root.querySelector(`[data-trans-offer="${id(offer.id)}"]`);if(pieces.some(p=>p.label_code&&!scanned.has(String(p.id))))fail('Najpierw zeskanuj wszystkie sztuki z plombami.');if([...node.querySelectorAll('[data-unsealed-piece]')].some(p=>!p.checked))fail('Sprawdź fizycznie wszystkie sztuki bez plomb.');if(!confirm('Zapisać potwierdzenie fizycznego stanu tego ładunku w TMS?'))return;await request('POST',path+'confirm-transshipment/',{offer_id:Number(id(offer.id)),cargo_confirmed:true});const read=await request('GET',path);if(!read.transshipment_offers?.find(o=>String(o.id)===String(offer.id))?.cargo_confirmed_at)fail('Nie potwierdzono przyjęcia ładunku w odczycie.');await transPoint(pointId,meetingId);feedback('Potwierdzenie ładunku odczytane z TMS.');});
    bind('[data-trans-photo]',async n=>{const file=await capture();if(!file)return;try{await upload(`documents/transport/${id(n.dataset.transPhoto)}/upload_document/`,file,{document_type:n.dataset.documentType,route_point_id:pointId});await transPoint(pointId,meetingId);feedback('TMS przyjął zdjęcie. Sprawdź pozostałe bramki spotkania.');}finally{keepEvidence(file);}});
  }
  document.addEventListener('click',event=>{
    if(!enabled()||state().status!=='connected')return;
    const nav=event.target.closest('[data-nav]'),workspace=event.target.closest('#workspace-choose,[data-live-menu]'),designed=event.target.closest('[data-designed-view]');
    if(!nav&&!workspace&&!designed)return;
    const name=nav?.dataset.nav;
    if(name==='now'){close();return;}
    event.preventDefault();event.stopImmediatePropagation();
    open(workspace?'menu':designed?({tacho:'tacho',chat:'chat',collection:'collection','cmr-transferor':'collection',transshipment:'transshipment','transshipment-out':'transshipment',fueling:'fueling',parking:'fueling',survey:'service',inventory:'service',handover:'service',history:'service',help:'help'}[designed.dataset.designedView]||'menu'):name==='service'?'service':name==='help'?'help':name);
  },true);
  window.addEventListener('ss-native-state',()=>{const account=state().status==='connected'?String(state().profile?.id??''):'';if(account!==evidenceOwner){localEvidence.clear();formDrafts.clear();evidenceOwner=account;}if(root&&!current())close();const button=document.getElementById('workspace-choose');if(button)button.textContent='Moje sprawy';const menu=document.querySelector('.driver-chip');if(menu){if(account){menu.dataset.liveMenu='1';menu.textContent='Moje sprawy';menu.setAttribute('role','button');menu.tabIndex=0;}else{delete menu.dataset.liveMenu;menu.textContent='SUPER SPEDYTOR';menu.removeAttribute('role');menu.removeAttribute('tabindex');}}});
  document.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.matches('[data-live-menu]')){event.preventDefault();open('menu');}});
  window.SuperSpedytorLiveWorkspace={open,close};
})();
