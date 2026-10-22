'use strict';

(function(){
  const model=window.SuperSpedytorOffline;
  if(!model)return;
  const db=model.createDatabase(window.indexedDB);
  let scope='',ready=false,loading=false,revision=0,saveTimer,saveChain=Promise.resolve(),queue,queueReady;
  let saving=false,problem='',savedAt='',syncing=false,pointWaiter=null,epoch=0,detailOpen=false;
  let serviceArchive={};
  const clone=value=>{
    if(!value||typeof value!=='object'||value instanceof Blob)return value;
    return Array.isArray(value)?value.map(clone):Object.fromEntries(Object.entries(value).filter(([,item])=>typeof item!=='function').map(([key,item])=>[key,clone(item)]));
  };
  const currentScope=()=>{
    if(!backendMode)return 'demo';
    const owner=backendState?.profile?.id!=null?`${backendState.backend_origin||'native'}|${backendState.profile.id}`:'';
    return owner&&backendTestWorkspace?`${owner}|demo`:owner;
  };
  const initialState=clone(state);
  const initialAssignment=clone(demoAssignment);
  const offline=()=>navigator.onLine===false||Boolean(backendMode&&!backendTestWorkspace&&backendState?.offline);
  const writable=()=>backendMode&&!backendTestWorkspace&&backendState?.status==='connected'&&backendState?.read_only!==true&&Boolean(scope)&&scope!=='demo';
  function banner(){
    let bar=document.getElementById('offline-status');
    if(!bar){bar=document.createElement('div');bar.id='offline-status';bar.className='offline-status';bar.setAttribute('role','status');document.querySelector('.app-header')?.after(bar);}
    const jobs=queue?.list()||[],uncertain=jobs.filter(job=>job.state==='uncertain'||job.state==='blocked').length;
    const title=problem?'Nie zapisano na telefonie':!ready?'Otwieram zapis na telefonie…':saving?'Zapisuję na telefonie…':syncing?'Synchronizuję…':offline()?'Tryb offline':jobs.length?'Oczekuje na synchronizację':'Zapis na telefonie gotowy';
    const description=problem||(!ready?'Poczekaj na odtworzenie poprzedniej pracy.':jobs.length?`${jobs.length} do wysłania${uncertain?` · ${uncertain} do sprawdzenia`:''}`:offline()?'Pliki i postęp zapisują się bez internetu.':savedAt?`Ostatni zapis ${new Date(savedAt).toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`:'Pliki i postęp są zapisywane automatycznie.');
    bar.classList.toggle('offline',offline());bar.classList.toggle('error',Boolean(problem||uncertain));
    bar.innerHTML=`<div><strong>${esc(title)}</strong><span>${esc(description)}</span></div><button type="button" id="offline-details">${jobs.length?'Kolejka':'Szczegóły'}</button>`;
    document.getElementById('offline-details').onclick=()=>{detailOpen=!detailOpen;details();};
    if(detailOpen)details();
  }
  function details(){
    document.getElementById('offline-details-panel')?.remove();
    if(!detailOpen)return;
    const panel=document.createElement('div');panel.id='offline-details-panel';panel.className='offline-details-panel';
    panel.innerHTML=`<button id="offline-details-close" aria-label="Zamknij szczegóły">×</button><h3>Zapis i synchronizacja</h3><p>Zdjęcia, skany i postęp pozostają na tym urządzeniu. Status „wysłano” wymaga potwierdzenia systemu. ${!backendMode||backendTestWorkspace?'Dane DEMO pozostają lokalne i nie są wysyłane do SS.':'Wysyłka wznawia się po odzyskaniu połączenia i potwierdzeniu konta kierowcy.'}</p>${problem?`<p role="alert">${esc(problem)} Zachowaj otwartą aplikację i zwolnij pamięć.</p>`:''}${(queue?.list()||[]).map(job=>`<article><strong>${esc(job.label||'Zmiana statusu')}</strong><span>${esc(({queued:'Oczekuje na internet',sending:'Wysyłanie',uncertain:'Wynik nieznany — sprawdź w SS',blocked:'Wymaga sprawdzenia'})[job.state])}</span>${job.message?`<p>${esc(job.message)}</p>`:''}${['blocked','uncertain'].includes(job.state)?`<button data-offline-retry="${esc(job.id)}">Ponów po sprawdzeniu w SS</button>`:''}</article>`).join('')}<button id="offline-retry-save">Ponów zapis / sprawdź połączenie</button>`;
    document.querySelector('.device').append(panel);
    panel.querySelector('#offline-details-close').onclick=()=>{detailOpen=false;panel.remove();};
    panel.querySelector('#offline-retry-save').onclick=()=>{flush();if(writable())driverBridge?.backendRefresh();};
    panel.querySelectorAll('[data-offline-retry]').forEach(button=>button.onclick=async()=>{
      if(!window.confirm('Sprawdź w Super Spedytorze, czy ten zapis już istnieje. Ponowienie przy nieznanym wyniku może utworzyć duplikat. Potwierdzasz ponowienie po sprawdzeniu?'))return;
      await queue.update(button.dataset.offlineRetry,{state:'queued',message:''});
      driverBridge?.backendRefresh();
    });
    for(const [date,survey]of Object.entries(serviceArchive)){
      const archive=document.createElement('details');
      archive.innerHTML=`<summary>Ankieta ${esc(date)} · lokalna kopia</summary><p>Olej: ${esc(survey.oil||'—')} · AdBlue: ${esc(survey.adBlue||'—')} · Do serwisu: ${esc(survey.serviceDistance||'—')} km</p><p>${esc(survey.note||'')}</p>${Object.entries(survey.photos||{}).filter(([,photo])=>photo?.url).map(([key,photo])=>`<figure><figcaption>${esc(key)}</figcaption><img src="${esc(photo.url)}" alt="Zapisane zdjęcie ankiety" style="max-width:100%"></figure>`).join('')}`;
      panel.append(archive);
    }
  }
  function capture(){
    const survey=state.serviceSurvey;
    if(survey&&Object.values(survey.photos||{}).some(Boolean))serviceArchive[survey.date]=clone(survey);
    const snapshot=clone(state);
    // The daily survey has its own dated store and 00:01 expiry policy.
    delete snapshot.serviceSurvey;snapshot.modal=null;
    return {version:1,state:snapshot,assignment:clone(assignment),liveOperation:clone(liveOperation),
      controllers:Object.fromEntries(Object.entries(inspectionV2Controllers).filter(([,controller])=>controller).map(([key,controller])=>[key,clone(controller.snapshot?.())])),
      exchange:clone(vehicleExchangeController?.snapshot?.()),vehicleExchangeActive,normalHandoverRole,serviceArchive:clone(serviceArchive),
      savedAt:new Date().toISOString()};
  }
  function changed(){
    if(!ready||loading||currentScope()!==scope)return;
    revision++;saving=true;banner();clearTimeout(saveTimer);saveTimer=setTimeout(flush,180);
  }
  function flush(){
    clearTimeout(saveTimer);
    if(!ready||loading||currentScope()!==scope)return saveChain;
    const snapshot=capture(),key=`workspace:${scope}`,saveRevision=revision;
    saveChain=saveChain.catch(()=>{}).then(async()=>{
      try{
        const packed=await model.pack(snapshot,async url=>{const response=await fetch(url);if(!response.ok)throw new Error('Brak pliku');return response.blob();});
        await db.put(key,packed);savedAt=snapshot.savedAt;problem='';
      }catch(error){problem=error?.name==='QuotaExceededError'?'Brak miejsca na zapis plików.':'Nie udało się trwale zapisać plików i postępu.';}
      finally{if(saveRevision===revision)saving=false;banner();}
    });
    return saveChain;
  }
  async function open(){
    const nextScope=currentScope();
    if(nextScope===scope&&ready)return;
    if(nextScope===scope&&loading)return;
    const token=++epoch;ready=false;loading=true;scope=nextScope;queue=null;banner();
    document.querySelector('.device')?.classList.add('offline-restoring');
    if(!scope){loading=false;return;}
    try{
      const saved=await db.get(`workspace:${scope}`);
      if(token!==epoch)return;
      Object.assign(state,clone(initialState));assignment=clone(initialAssignment);liveOperation=null;
      serviceArchive={};
      for(const key of Object.keys(inspectionV2Controllers))inspectionV2Controllers[key]=null;
      vehicleExchangeController=null;vehicleExchangeActive=false;normalHandoverRole='issue';
      if(saved?.version===1){
        const restored=model.unpack(saved,blob=>URL.createObjectURL(blob));
        serviceArchive=restored.serviceArchive||{};
        Object.assign(state,restored.state,{modal:null});
        if(appQuery.has('service')){state.serviceOpen=true;state.servicePanel=initialServicePanel;}
        assignment=restored.assignment||assignment;liveOperation=restored.liveOperation||null;
        if(liveOperation)liveOperation.finishing=false;
        normalHandoverRole=restored.normalHandoverRole||'issue';
        for(const [key,value]of Object.entries(restored.controllers||{})){
          const previousPanel=state.servicePanel,previousRole=normalHandoverRole;
          state.servicePanel=key==='inventory'?'inventory':'handover';normalHandoverRole=key==='handover-receive'?'receive':'issue';
          inspectionV2Controller().restore?.(value);state.servicePanel=previousPanel;normalHandoverRole=previousRole;
        }
        if(restored.exchange)exchangeController().restore?.(restored.exchange);
        vehicleExchangeActive=Boolean(restored.vehicleExchangeActive);savedAt=restored.savedAt||'';
      }
      queue=model.createQueue({db,key:`queue:${scope}`,onChange:banner,id:()=>`offline-${Date.now()}-${Math.random().toString(36).slice(2)}`});
      queueReady=queue.restore();await queueReady;
      if(token!==epoch)return;
      problem='';ready=true;loading=false;document.querySelector('.device')?.classList.remove('offline-restoring');render();banner();sync();
      navigator.storage?.persist?.().catch(()=>{});
    }catch(error){if(token===epoch){loading=false;problem='Nie można otworzyć pamięci offline.';banner();}}
  }
  async function ensure(){if(currentScope()!==scope||!ready)await open();if(!ready||!queue)throw new Error('Pamięć offline jest niedostępna');await queueReady;}
  function outcome(result){
    return Number(result?.status)>=200&&Number(result?.status)<300;
  }
  const queuedResult=job=>({status:202,queued:true,queueId:job.id,body:{offline_queued:true},message:'Zapisano na telefonie. Oczekuje na synchronizację.'});
  async function enqueue(payload){
    try{await ensure();const job=await queue.add(payload);await flush();setTimeout(sync,0);return queuedResult(job);}
    catch(error){problem='Nie udało się trwale zapisać kolejki. Zwolnij pamięć telefonu i ponów zapis.';banner();throw error;}
  }
  async function request(method,path,body,send){
    if(method==='GET'){
      const key=`read:${currentScope()}:${path}`;
      if(offline()){const cached=await db.get(key);return cached?{...cached,cached:true}:{status:0,message:'Brak zapisanego podglądu tych danych. Pobierz je po odzyskaniu połączenia.'};}
      const result=await send();if(outcome(result))await db.put(key,result);return result;
    }
    if(writable()&&(/^(documents\/labels\/assign\/|routes\/points\/\d+\/label-scan\/|documents\/transport\/\d+\/driver-update-status\/)$/.test(path)))
      return enqueue({kind:'request',path,method,body,label:'Plomba lub status zlecenia',dedupe:JSON.stringify([method,path,body])});
    return send();
  }
  async function upload(path,token,fields,send){
    if(!writable())return send();
    // Preserve the file before attempting any network write, including on-line failures.
    return enqueue({kind:'upload',path,token,fields,label:fields.document_type?.includes('cmr')?'Skan CMR':'Zdjęcie',dedupe:`file:${token}`,pointId:liveOperation?.pointId});
  }
  async function point(pointId,action){
    if(!writable()){driverBridge?.backendPointAction(pointId,action);return;}
    await enqueue({kind:'point',pointId,action,label:action==='start'?'Dotarłem · rozpoczęcie operacji':'Zakończenie operacji',dedupe:`point:${pointId}:${action}`});
    if(liveOperation)liveOperation.finishing=false;
    backendPointActionPending=null;toast('Status zapisano na telefonie. Oczekuje na potwierdzenie SS.');render();
  }
  function pointStatus(pointId){
    for(const route of backendState?.route_status?.active_routes||[])
      for(const point of route.operations||[route.current_point,route.next_point])if(point&&String(point.id)===String(pointId))return point.status;
    return null;
  }
  function confirmedPoint(job){const status=pointStatus(job.pointId);return job.action==='start'?['in_progress','completed'].includes(status):status==='completed';}
  async function send(job,token){
    if(token!==epoch||offline()||!writable()||backendState?.offline)return {state:'queued'};
    if(job.kind!=='point'){
      const validation=model.validateJob(job,backendState);
      if(validation)return {state:'blocked',message:validation};
    }
    let result;
    if(job.kind==='point'){
      if(confirmedPoint(job))return {confirmed:true};
      result=await new Promise(resolve=>{
        const timer=setTimeout(()=>{pointWaiter=null;resolve({status:'uncertain'});},100000);
        pointWaiter={job,resolve:write=>{clearTimeout(timer);pointWaiter=null;resolve(write);}};
        try{driverBridge.backendPointAction(job.pointId,job.action);}catch{pointWaiter.resolve({status:'uncertain'});}
      });
      return result.status==='confirmed'?{confirmed:true}:{state:result.status==='queued'?'queued':result.status==='uncertain'?'uncertain':'blocked',message:result.message};
    }
    if(job.kind==='upload'&&/^documents\/cmr-inventory\/\d+\/photo\/$/.test(job.path)){
      const path=job.path.replace(/photo\/$/,'');
      const check=await nativeCall(id=>window.SuperSpedytorNative.backendRequest(id,'GET',path,''));
      if(!outcome(check))return {state:Number(check.status)>0?'blocked':'queued',message:'Nie potwierdzono aktualnego zadania CMR.'};
      if(!(check.body?.attempts||[]).some(attempt=>String(attempt.id)===String(job.fields.attempt_id)))
        return {state:'blocked',message:'Próba skanowania CMR zmieniła się. Zdjęcie pozostaje na telefonie.'};
    }
    result=job.kind==='upload'
      ?await nativeCall(id=>window.SuperSpedytorNative.backendUpload(id,job.path,job.token,JSON.stringify(job.fields||{})))
      :await nativeCall(id=>window.SuperSpedytorNative.backendRequest(id,job.method,job.path,JSON.stringify(job.body||{})));
    if(token!==epoch)return {state:'uncertain'};
    if(outcome(result)){
      if(job.kind==='upload'){
        for(const operation of Object.values(state.operations))for(const evidence of allEvidence(operation))if(evidence.token===job.token){evidence.syncState='confirmed';evidence.documentId=result.body?.id??null;evidence.chatSynced=true;}
        changed();await flush();
      }
      return {confirmed:true};
    }
    return {state:Number(result.status)>0&&Number(result.status)<500?'blocked':'uncertain',message:result.message||'Sprawdź wynik w Super Spedytorze przed ponowieniem.'};
  }
  async function sync(){
    if(syncing||!ready||!writable()||offline()||backendState.offline)return;
    const token=epoch,activeQueue=queue;syncing=true;banner();
    try{
      // Owner readback can settle a previously ambiguous point without repeating its POST.
      for(const job of activeQueue.list())if(job.kind==='point'&&confirmedPoint(job))await activeQueue.remove(job.id);
      await activeQueue.drain(job=>send(job,token));
    }catch{problem='Nie udało się zapisać kolejki synchronizacji.';}
    finally{
      syncing=false;banner();
      if(token===epoch){
        render();
        if(!offline()&&liveMode())refreshLiveTargets().catch(()=>{});
        const first=queue?.list()[0];
        if(first?.state==='queued'&&!offline())setTimeout(sync,250);
      }
    }
  }
  function receive(){
    const write=backendState?.write;
    if(pointWaiter&&write&&write.status!=='pending'&&String(write.point_id)===String(pointWaiter.job.pointId)&&write.action===pointWaiter.job.action)pointWaiter.resolve(write);
    if(currentScope()!==scope||!ready){open();return;}
    banner();sync();
  }
  window.SuperSpedytorOfflineWorkspace={changed,flush,request,upload,point,receive,ready:()=>ready,retains:token=>Boolean(queue?.list().some(job=>job.token===token)||Object.values(state.operations).some(operation=>allEvidence(operation).some(record=>record.token===token&&record.syncState&&record.syncState!=='confirmed')))};
  document.addEventListener('input',()=>setTimeout(changed,0));
  document.addEventListener('change',()=>setTimeout(changed,0));
  document.addEventListener('click',event=>{if(!event.target.closest('#offline-status,#offline-details-panel'))setTimeout(changed,0);});
  window.addEventListener('pagehide',flush);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)flush();else if(writable())driverBridge?.backendRefresh();});
  window.addEventListener('offline',banner);
  window.addEventListener('online',()=>{banner();if(writable())driverBridge?.backendRefresh();else sync();});
  const retryTimer=setInterval(()=>{if(!document.hidden&&ready&&!syncing&&writable()&&(backendState.offline||queue.list().some(job=>job.state==='queued')))driverBridge?.backendRefresh();},30000);
  window.addEventListener('pagehide',()=>clearInterval(retryTimer),{once:true});
  open();
  if((location.protocol==='https:'||['localhost','127.0.0.1'].includes(location.hostname))&&'serviceWorker'in navigator&&!backendMode)
    navigator.serviceWorker.register('offline-worker.js').catch(()=>{});
})();
