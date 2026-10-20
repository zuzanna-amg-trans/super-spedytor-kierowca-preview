(function(){
  'use strict';
  const query=new URLSearchParams(window.location.search);
  const loopback=['localhost','127.0.0.1','[::1]','::1'].includes(window.location.hostname);
  if(query.get('web')!=='1'||window.SuperSpedytorNative||(window.location.protocol!=='https:'&&!loopback))return;

  const BACKEND_ORIGIN='https://dev.amg-trans.eu';
  const BASE=BACKEND_ORIGIN+'/api/';
  const environmentValid=query.getAll('backendEnv').length===1&&query.get('backendEnv')==='dev';
  const originValid=window.location.origin===BACKEND_ORIGIN||loopback;
  const configurationError=!environmentValid
    ?'Nieprawidłowa konfiguracja podglądu. Wymagane jest jawne środowisko DEV (backendEnv=dev).'
    :!originValid?'Odczyt danych DEV jest dostępny wyłącznie pod adresem https://dev.amg-trans.eu/driver-app/.':'';
  const readonlyState=next=>({...next,backend_environment:'dev',backend_origin:BACKEND_ORIGIN,read_only:true,write_capabilities:[]});
  const authPaths=new Set(['token/','token/refresh/','logout/']);
  const readPaths=new Set(['users/me/','users/me/current-vehicle/','routes/driver/status/','driver-tasks/history/']);
  const allowedRequest=(method,path)=>method==='POST'?authPaths.has(path):method==='GET'&&(readPaths.has(path)||/^documents\/transport\/[1-9]\d*\/$/.test(path)||/^driver-tasks\/[1-9]\d*\/$/.test(path));
  const MAX_BYTES=2*1024*1024;
  const REMEMBER_KEY='ss-web-dev-remember';
  const TIMEOUT_MS=25000;
  const SESSION_MESSAGE='Nie można odnowić sesji w tej przeglądarce. Zaloguj się ponownie; automatyczne odnawianie wymaga pliku cookie Super Spedytora.';
  let accessToken=null;
  let expectedIdentity=null;
  let generation=0;
  let queue=Promise.resolve();
  // Cookie-changing responses must finish in order even across account switches.
  let cookieQueue=Promise.resolve();
  let current=readonlyState({status:'disconnected',message:'Zaloguj się kontem kierowcy Super Spedytora DEV'});
  const controllers=new Set();
  let build={};
  try{build=JSON.parse(document.getElementById('ss-web-build')?.textContent||'{}');}catch{}

  if(configurationError){
    current=readonlyState({status:'error',message:configurationError,can_retry:false,configuration_error:true});
    const failClosed=()=>{
      try{window.SuperSpedytorBackend?.receive(JSON.stringify(current));}catch{}
      return Promise.resolve();
    };
    window.SuperSpedytorWeb={
      backendEnabled:()=>true,
      backendState:()=>JSON.stringify(current),
      getAppVersion:()=>String(build.androidRuntimeVersion||build.androidSourceVersion||''),
      getUiSourceCommit:()=>String(build.sourceCommit||''),
      getUiAssetsHash:()=>String(build.assetManifestSha256||''),
      backendLogin:failClosed,backendRefresh:failClosed,backendLogout:failClosed,
      backendPointAction:failClosed,backendServiceSurvey:failClosed,backendTestingMode(){}
    };
    return;
  }

  function wantsRemember(){
    try{return window.localStorage.getItem(REMEMBER_KEY)==='1';}catch{return false;}
  }
  function saveRemember(enabled){
    try{
      if(enabled)window.localStorage.setItem(REMEMBER_KEY,'1');
      else window.localStorage.removeItem(REMEMBER_KEY);
      return true;
    }catch{return false;}
  }
  class SessionError extends Error{constructor(message,status=0){super(message);this.status=status;}}
  class StaleSession extends Error{}
  const alive=gen=>{if(gen!==generation)throw new StaleSession();};
  const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const asObject=value=>{if(!plain(value))throw new SessionError('Backend zwrócił nieprawidłowe dane');return value;};
  const errorState=error=>({status:'error',message:error instanceof SessionError?error.message:'Nie można połączyć się z backendem Super Spedytora',can_retry:Boolean(accessToken)});
  function publish(next,gen){
    alive(gen);
    if(next.status==='connected'&&!accessToken){
      const write=next.write;
      next={status:'error',message:(write?.status==='uncertain'?write.message+' ':'')+'Sesja wygasła — zaloguj się ponownie',...(write?{write}:{})};
    }
    next=readonlyState(next);
    current=next;
    try{window.SuperSpedytorBackend?.receive(JSON.stringify(next));}catch{}
  }
  function invalidate(){
    generation++;
    for(const controller of controllers)controller.abort();
    controllers.clear();
    accessToken=null;
    expectedIdentity=null;
    queue=Promise.resolve();
    return generation;
  }
  function enqueue(gen,task,onError){
    const result=queue.catch(()=>{}).then(async()=>{
      try{alive(gen);await task();}
      catch(error){
        if(error instanceof StaleSession||gen!==generation)return;
        if(onError)onError(error);
        else publish(errorState(error),gen);
      }
    });
    queue=result.catch(()=>{});
    return result;
  }
  async function request(method,path,body,authenticated,gen){
    if(method==='POST'&&authPaths.has(path)){
      const pending=cookieQueue.catch(()=>{}).then(()=>performRequest(method,path,body,authenticated,gen,true));
      cookieQueue=pending.catch(()=>{});
      return pending;
    }
    return performRequest(method,path,body,authenticated,gen);
  }
  async function performRequest(method,path,body,authenticated,gen,cookieChanging=false){
    alive(gen);
    if(!/^[a-z0-9][a-z0-9/-]*\/$/i.test(path)||path.includes('..'))throw new SessionError('Nieprawidłowy adres żądania');
    if(!allowedRequest(method,path))throw new SessionError('Podgląd DEV pozwala wyłącznie na odczyt danych kierowcy i obsługę sesji',403);
    const headers={Accept:'application/json'};
    if(authenticated){
      if(!accessToken)throw new SessionError(SESSION_MESSAGE,401);
      headers.Authorization='Bearer '+accessToken;
    }
    if(body!==undefined)headers['Content-Type']='application/json; charset=utf-8';
    const controller=new AbortController();
    if(!cookieChanging)controllers.add(controller);
    const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
    try{
      const response=await fetch(BASE+path,{
        method,headers,body:body===undefined?undefined:JSON.stringify(body),
        credentials:'include',mode:'cors',cache:'no-store',redirect:'error',signal:controller.signal
      });
      alive(gen);
      if(response.status===401){try{await response.body?.cancel?.();}catch{}alive(gen);return {status:401,data:{}};}
      const declared=Number(response.headers?.get?.('content-length'));
      if(Number.isFinite(declared)&&declared>MAX_BYTES)throw new SessionError('Odpowiedź Super Spedytora jest zbyt duża');
      let text;
      if(response.body?.getReader){
        const reader=response.body.getReader(),chunks=[];let size=0;
        try{
          while(true){
            const chunk=await reader.read();alive(gen);
            if(chunk.done)break;
            size+=chunk.value.byteLength;
            if(size>MAX_BYTES){await reader.cancel();throw new SessionError('Odpowiedź Super Spedytora jest zbyt duża');}
            chunks.push(chunk.value);
          }
        }finally{reader.releaseLock?.();}
        const bytes=new Uint8Array(size);let offset=0;
        for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
        text=new TextDecoder().decode(bytes);
      }else text=await response.text();
      alive(gen);
      if(new TextEncoder().encode(text).length>MAX_BYTES)throw new SessionError('Odpowiedź Super Spedytora jest zbyt duża');
      let data={};
      try{if(text.trim())data=JSON.parse(text);}
      catch{if(response.status===401||response.status===403)data={};else throw new SessionError('Backend zwrócił nieprawidłowe dane',response.status>=200&&response.status<300?0:response.status);}
      return {status:response.status,data};
    }catch(error){
      alive(gen);
      if(error instanceof SessionError)throw error;
      throw new SessionError('Nie można połączyć się z backendem Super Spedytora');
    }finally{
      clearTimeout(timer);
      controllers.delete(controller);
    }
  }
  function requireSuccess(result,fallback,includeDetail=true){
    if(result.status>=200&&result.status<300)return result.data;
    const detail=plain(result.data)&&(result.data.detail||result.data.error);
    let message=includeDetail&&typeof detail==='string'&&detail.trim()?detail.slice(0,500):fallback;
    if(accessToken)message=message.split(accessToken).join('[token]');
    throw new SessionError(`${message} (HTTP ${result.status})`,result.status);
  }
  async function refreshAccess(gen){
    const result=await request('POST','token/refresh/',{},false,gen);
    alive(gen);
    if(result.status===401||result.status===403){accessToken=null;throw new SessionError(SESSION_MESSAGE,401);}
    const data=asObject(requireSuccess(result,'Nie udało się odnowić sesji'));
    if(typeof data.access!=='string'||!data.access){accessToken=null;throw new SessionError(SESSION_MESSAGE,401);}
    alive(gen);
    accessToken=data.access;
    // A refresh cookie may have changed in another tab. Verify the access
    // token's actual owner before replaying any authenticated request.
    try{
      const profile=asObject(requireSuccess(await request('GET','users/me/',undefined,true,gen),'Nie udało się potwierdzić sesji kierowcy'));
      alive(gen);verifyProfile(profile);
    }catch(error){alive(gen);accessToken=null;throw error;}
  }
  function verifyProfile(profile){
    if(profile.has_driver!==true){accessToken=null;throw new SessionError('To konto nie ma profilu kierowcy');}
    let identity='';
    if(profile.id!==undefined&&profile.id!==null){
      try{identity='id:'+canonicalId(profile.id);}catch{accessToken=null;throw new SessionError('Backend zwrócił nieprawidłową tożsamość kierowcy');}
    }else if(typeof profile.username==='string'&&profile.username.trim())identity='username:'+profile.username.trim();
    if(!identity){accessToken=null;throw new SessionError('Backend nie zwrócił tożsamości kierowcy');}
    if(expectedIdentity&&expectedIdentity!==identity){accessToken=null;throw new SessionError('Konto sesji zmieniło się w innej karcie. Zaloguj się ponownie właściwym kontem kierowcy.',401);}
    expectedIdentity=identity;
  }
  async function authenticated(method,path,body,gen){
    let result=await request(method,path,body,true,gen);
    alive(gen);
    if(result.status===401){
      await refreshAccess(gen);
      alive(gen);
      result=await request(method,path,body,true,gen);
      alive(gen);
    }
    if(result.status===401){accessToken=null;throw new SessionError(SESSION_MESSAGE,401);}
    return result;
  }
  async function getObject(path,gen){return asObject(requireSuccess(await authenticated('GET',path,undefined,gen),'Nie udało się pobrać danych kierowcy'));}
  function nearestPoint(routeStatus){
    let firstPending=null;
    for(const route of Array.isArray(routeStatus.active_routes)?routeStatus.active_routes:[]){
      if(!plain(route))continue;
      const points=Array.isArray(route.operations)?route.operations:[route.current_point,route.next_point];
      let routePending=null;
      for(const point of points){
        if(!plain(point))continue;
        if(String(point.status).toLowerCase()==='in_progress')return point;
        if(String(point.status).toLowerCase()==='pending'&&(!routePending||Number(point.sequence??Number.MAX_SAFE_INTEGER)<Number(routePending.sequence??Number.MAX_SAFE_INTEGER)))routePending=point;
      }
      if(!firstPending)firstPending=routePending;
    }
    return firstPending;
  }
  function applyCargo(routeStatus,point,offer){
    const offerId=Number(point.transport_offer);
    if(!Number.isSafeInteger(offerId)||offerId<=0||Number(offer.id)!==offerId||point.order_number&&String(point.order_number).trim()!==String(offer.order_number||''))throw new SessionError('Zlecenie nie jest powiązane z tą operacją kierowcy');
    const cargo={offer_id:offerId,scope:'order',description:String(offer.cargo_description??offer.title??'')};
    for(const field of ['cargo_weight','ldm','cargo_length','cargo_width','cargo_height'])if(offer[field]!==null&&offer[field]!==undefined)cargo[field]=offer[field];
    for(const route of routeStatus.active_routes||[]){
      for(const item of [...(Array.isArray(route.operations)?route.operations:[]),route.current_point,route.next_point]){
        if(plain(item)&&Number(item.transport_offer)===offerId)item.order_cargo=cargo;
      }
    }
  }
  async function snapshot(gen){
    const profile=await getObject('users/me/',gen);alive(gen);
    verifyProfile(profile);
    const vehicleResponse=await getObject('users/me/current-vehicle/',gen);alive(gen);
    const routeStatus=await getObject('routes/driver/status/',gen);alive(gen);
    let cargoError='';
    const point=nearestPoint(routeStatus),offerId=Number(point?.transport_offer);
    if(Number.isSafeInteger(offerId)&&offerId>0){
      try{const offer=await getObject(`documents/transport/${offerId}/`,gen);alive(gen);applyCargo(routeStatus,point,offer);}
      catch(error){alive(gen);if(error.status===401)throw error;cargoError='Nie udało się pobrać opisu ładunku ze zlecenia';}
    }
    let serviceHistory=[],historyError='';
    try{
      const tasks=requireSuccess(await authenticated('GET','driver-tasks/history/',undefined,gen),'Nie udało się pobrać historii ankiet');alive(gen);
      if(!Array.isArray(tasks))throw new SessionError('Backend zwrócił nieprawidłowe dane historii ankiet');
      serviceHistory=tasks.filter(task=>plain(task)&&task.definition_slug==='service-inspection'&&task.status==='completed');
    }catch(error){alive(gen);if(error.status===401)throw error;historyError=error instanceof SessionError?error.message:'Nie udało się pobrać historii ankiet';}
    const next={status:'connected',message:'Połączono z Super Spedytorem',read_only:true,write_capabilities:[],backend_environment:'dev',backend_origin:BACKEND_ORIGIN,synced_at:new Date().toISOString(),profile,vehicle:vehicleResponse.vehicle??null,route_status:routeStatus,service_history:serviceHistory};
    if(cargoError)next.cargo_error=cargoError;
    if(historyError)next.service_history_error=historyError;
    return next;
  }
  function canonicalId(raw){
    const value=String(raw??'').trim();
    if(!/^\d+$/.test(value))throw new SessionError('Nieprawidłowy identyfikator punktu trasy');
    const number=Number(value);
    if(!Number.isSafeInteger(number)||number<=0)throw new SessionError('Nieprawidłowy identyfikator punktu trasy');
    return String(number);
  }

  window.SuperSpedytorWeb={
    backendEnabled:()=>true,
    backendState:()=>JSON.stringify(current),
    getAppVersion:()=>String(build.androidRuntimeVersion||build.androidSourceVersion||''),
    getUiSourceCommit:()=>String(build.sourceCommit||''),
    getUiAssetsHash:()=>String(build.assetManifestSha256||''),
    backendLogin(username,password,rememberMe){
      const gen=invalidate();
      saveRemember(false);
      const user=typeof username==='string'?username.trim():'';
      let secret=typeof password==='string'?password:'';
      if(!user||!secret){publish({status:'error',message:'Podaj login i hasło'},gen);return Promise.resolve();}
      publish({status:'connecting',message:'Łączenie z Super Spedytorem…'},gen);
      return enqueue(gen,async()=>{
        let result;
        try{result=await request('POST','token/',{username:user,password:secret,remember_me:Boolean(rememberMe)},false,gen);}
        finally{secret='';}
        alive(gen);
        const data=asObject(requireSuccess(result,'Nie udało się zalogować',false));
        if(typeof data.access!=='string'||!data.access)throw new SessionError('Backend nie zwrócił tokenu dostępu');
        accessToken=data.access;
        const next=await snapshot(gen);alive(gen);
        if(Boolean(rememberMe)&&!saveRemember(true))next.remember_error='Przeglądarka nie pozwala zapamiętać tego ustawienia. Po ponownym otwarciu strony zaloguj się ponownie.';
        publish(next,gen);
      },error=>{accessToken=null;saveRemember(false);publish(errorState(error),gen);});
    },
    backendRefresh(){
      const gen=generation;
      if(!accessToken&&!wantsRemember()){
        publish({status:'disconnected',message:'Zaloguj się kontem kierowcy Super Spedytora'},gen);
        return Promise.resolve();
      }
      publish({status:'connecting',message:'Odświeżanie danych kierowcy…'},gen);
      return enqueue(gen,async()=>{
        if(!accessToken)await refreshAccess(gen);
        alive(gen);const next=await snapshot(gen);alive(gen);publish(next,gen);
      });
    },
    backendLogout(){
      const gen=invalidate();
      saveRemember(false);
      publish({status:'disconnected',message:'Wylogowano z Super Spedytora'},gen);
      // Browser owns the HttpOnly cookie. Delete local access immediately;
      // revoke the server cookie without exposing it to JavaScript.
      return request('POST','logout/',{},false,gen).catch(()=>{});
    },
    backendTestingMode(){},
    backendPointAction(){
      const gen=generation;
      publish({...current,write:{id:crypto.randomUUID(),status:'error',message:'Podgląd DEV jest tylko do odczytu. Operacja nie została wysłana.'}},gen);
      return Promise.resolve();
    },
    backendServiceSurvey(rawId){
      const gen=generation;
      return enqueue(gen,async()=>{
        const id=Number(rawId);
        if(!Number.isSafeInteger(id)||id<=0||!Array.isArray(current.service_history)||!current.service_history.some(task=>Number(task.id)===id&&task.definition_slug==='service-inspection'&&task.status==='completed'))throw new SessionError('Ta ankieta nie należy do historii zalogowanego kierowcy');
        const loading={...current,service_history_loading_id:id};delete loading.service_history_detail;delete loading.service_history_detail_error;publish(loading,gen);
        const detail=await getObject(`driver-tasks/${id}/`,gen);alive(gen);
        if(Number(detail.id)!==id||detail.definition?.slug!=='service-inspection'||detail.status!=='completed')throw new SessionError('Super Spedytor zwrócił niezgodny rekord ankiety');
        const next={...current,service_history_detail:detail};delete next.service_history_loading_id;delete next.service_history_detail_error;publish(next,gen);
      },error=>{
        const next={...current,service_history_detail_error:error instanceof SessionError?error.message:'Nie udało się pobrać ankiety'};
        delete next.service_history_loading_id;delete next.service_history_detail;publish(next,gen);
      });
    }
  };
})();
