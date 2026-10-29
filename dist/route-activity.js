'use strict';

((root,factory)=>{
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SuperSpedytorRouteActivity=api.create({
    getNode:()=>root.document.getElementById('route-activity'),
    model:()=>root.SuperSpedytorDriverActivitySummary,
  });
})(typeof window==='undefined'?null:window,()=>{
  const REFRESH_MS=60000;
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function markup(view,{loading=false,error='',demo=false}={}){
    const known=Boolean(view?.mode&&view?.sinceLabel);
    const stale=view?.state==='stale'||Boolean(error);
    const title=known?`${stale?'Ostatnio: ':''}${view.label}`:'Czynność kierowcy';
    const start=known?`Od ${view.sinceLabel}`:loading?'Pobieranie aktualnego odczytu…':'Brak potwierdzonej godziny rozpoczęcia';
    const observation=view?.observedAt?new Intl.DateTimeFormat('pl-PL',{timeZone:'Europe/Warsaw',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(view.observedAt)):'';
    const note=error||view?.note||(stale?'Brak aktualnego potwierdzenia czynności.':'');
    return `<div class="route-activity-heading"><span class="route-activity-icon" aria-hidden="true">◷</span><div><small>${demo?'PRZYKŁAD · DANE DEMONSTRACYJNE':'BIEŻĄCA CZYNNOŚĆ'}</small><h3>${escape(title)}</h3></div><button type="button" data-route-activity-refresh aria-label="Odśwież czynność kierowcy" ${loading?'disabled':''}>↻</button></div><div class="route-activity-values"><p data-route-activity-start>${escape(start)}</p>${known&&view.durationLabel?`<strong data-route-activity-duration>${escape(view.durationLabel)}</strong>`:''}</div>${note?`<p class="route-activity-note">${escape(note)}</p>`:''}${observation?`<p class="route-activity-observed">${stale?'Ostatnie potwierdzenie':'Dane z'} ${escape(observation)}</p>`:''}`;
  }
  function create({getNode,model,now=Date.now,setTimer=setInterval,clearTimer=clearInterval}){
    let options={},owner='',payload=null,error='',pending=false,fetchedAt=null,epoch=0,timer=null,suspended=false;
    function stop(){if(timer!==null){clearTimer(timer);timer=null;}}
    function paint(){
      const node=getNode();if(!node)return;
      node.hidden=!options.active||suspended;if(node.hidden)return;
      const session=error?{...options.session,offline:true}:options.session;
      const view=payload?model()?.build(payload,session,now()):null;
      node.dataset.state=error?'stale':view?.state||'loading';
      node.innerHTML=markup(view,{loading:pending,error,demo:options.demo===true});
      const refresh=node.querySelector('[data-route-activity-refresh]');
      if(refresh)refresh.onclick=()=>load(true);
    }
    async function load(force=false){
      if(!options.active||suspended||options.demo||pending||typeof options.request!=='function'||options.session?.offline||options.session?.refreshing)return;
      // Background telemetry must wait for foreground work. A deferred read
      // does not consume the refresh interval and can recover on the next sync.
      if(typeof options.canRequest==='function'&&!options.canRequest())return;
      if(!force&&fetchedAt!==null&&now()-fetchedAt<REFRESH_MS)return;
      const generation=epoch,key=owner,request=options.request;
      pending=true;fetchedAt=now();paint();
      try{
        const result=await request();
        if(generation!==epoch||owner!==key)return;
        if(result?.cached===true||result?.status!==200||!result.body)throw Error('Nie udało się odświeżyć czynności.');
        payload=result.body;error='';
      }catch(_){if(generation===epoch&&owner===key)error='Nie udało się odświeżyć. Pokazujemy tylko ostatni potwierdzony odczyt.';}
      finally{if(generation===epoch&&owner===key){pending=false;paint();}}
    }
    function sync(next={}){
      const session=next.session,key=model()?.sessionContext?.(session)?.key||'';
      if(key!==owner){epoch++;owner=key;payload=null;error='';pending=false;fetchedAt=null;stop();}
      options={...next,active:Boolean(next.active&&key)};
      if(next.demo&&next.payload)payload=next.payload;
      if(!options.active||suspended){stop();paint();return;}
      if(timer===null)timer=setTimer(()=>{paint();load();},REFRESH_MS);
      paint();load(next.force===true);
    }
    function close(){
      epoch++;owner='';payload=null;error='';pending=false;fetchedAt=null;options={};stop();
      const node=getNode();if(node){node.hidden=true;node.innerHTML='';delete node.dataset.state;}
    }
    function suspend(){suspended=true;stop();paint();}
    function resume(){suspended=false;sync(options);}
    return {sync,refresh:()=>load(true),close,suspend,resume};
  }
  return {create,markup};
});
