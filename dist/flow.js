'use strict';

const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const icon=name=>`<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const has=value=>value!==null&&value!==undefined&&String(value).trim()!=='';
const materialWord=value=>value===1?'materiał':(value%10>=2&&value%10<=4&&(value%100<12||value%100>14)?'materiały':'materiałów');
const dispatcher={name:'Spedytor testowy',phone:'+48 000 000 000',demo:true};
const mapTarget=place=>has(place.latitude)&&has(place.longitude)?`${place.latitude},${place.longitude}`:(place.address||`${place.company}, ${place.countryName}`);
const locationUrl=place=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapTarget(place))}`;
const navigationUrl=place=>`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapTarget(place))}`;
const androidShell=document.documentElement.classList.contains('android-shell');
const appQuery=new URLSearchParams(window.location.search);
const previewMode=appQuery.get('preview')==='1';
const nativeBackendAvailable=(()=>{try{return androidShell&&Boolean(window.SuperSpedytorNative?.backendEnabled());}catch{return false;}})();
const backendMode=nativeBackendAvailable&&appQuery.get('backend')==='1';
const collectionPreviewRole=appQuery.get('cmrView')==='handover'?'transferor':'receiver';
document.documentElement.classList.toggle('backend-mode',backendMode);
const routePointIds={load:'demo-loading-1',unload:'demo-unloading-1',collection:'demo-document-collection-1',parking:'demo-parking-1',fueling:'demo-fueling-1'};
const nativeHasArrival=stopId=>{
  try{return androidShell&&Boolean(window.SuperSpedytorNative?.hasArrival(stopId));}catch{return false;}
};
const nativeConfirmArrival=operation=>{
  try{if(androidShell)window.SuperSpedytorNative?.markArrivalConfirmed(routePointIds[operation]);}catch{}
};
const nativeReset=()=>{
  try{if(androidShell)window.SuperSpedytorNative?.resetDemo();}catch{}
};
const nativeOpenExternal=url=>{
  try{if(androidShell)window.SuperSpedytorNative?.openExternal(url);}catch{}
};

const pickup={company:'Magazyn demonstracyjny Alfa',address:'Punkt demonstracyjny A · Warszawa',country:'PL',countryName:'Polska',latitude:52.22970,longitude:21.01220};
const delivery={company:'Centrum demonstracyjne Beta',address:'Punkt demonstracyjny B · Poznań',country:'PL',countryName:'Polska',latitude:52.40640,longitude:16.92520};
const assignment={
  id:'DEMO/0001',
  pickup,
  delivery,
  cargo:{name:'Sprzęt w skrzyniach transportowych',quantity:2,unit:'skrzynie',mass:240,dimensions:'120 × 80 × 100 cm / szt.',demo:true}
};
const routeStopDefinitions={
  collection:{
    title:'Dokumenty CMR',genitive:'przekazanie dokumentów',icon:'envelope',country:'PL',countryName:'Polska',
    company:'Spotkanie kierowców na trasie',address:'Miejsce ustalone między kierowcami',
    note:'Oryginały CMR z ładunków, które zostały już rozładowane'
  },
  parking:{
    title:'Parking',genitive:'parking',icon:'parking',country:'PL',countryName:'Polska',
    company:'Parking demonstracyjny',address:'Punkt demonstracyjny P · Łódź',latitude:51.75920,longitude:19.45600,
    note:'Miejsce demonstracyjne · parking dla pojazdów ciężarowych',
    details:[['Rezerwacja','Do 18:00'],['Ochrona','24/7'],['Miejsce','P-01']]
  },
  fueling:{
    title:'Tankowanie',genitive:'tankowanie',icon:'fuel',country:'PL',countryName:'Polska',
    company:'Stacja demonstracyjna',address:'Punkt demonstracyjny T · Łódź',latitude:51.76020,longitude:19.45800,
    note:'Stacja demonstracyjna · operator testowy',
    details:[['Sieć','Testowa'],['Paliwo','Diesel'],['Dodatkowo','AdBlue']],
    card:{name:'Karta paliwowa · demonstracyjna',number:'•••• 0000',pin:'0000',vehicle:'Pojazd demonstracyjny'}
  }
};
const collectionSources=[
  {id:'driver-demo-a',name:'Kierowca demonstracyjny A',vehicle:'Pojazd DEMO 01'},
  {id:'driver-demo-b',name:'Kierowca demonstracyjny B',vehicle:'Pojazd DEMO 02'}
];
const collectionOrders=[
  {id:'handover-demo-1',sourceId:'driver-demo-a',orderId:'DEMO/CMR/0001',qrCode:'DEMO-CMR-0001',unloadedAt:'11 paź · 16:40'},
  {id:'handover-demo-2',sourceId:'driver-demo-b',orderId:'DEMO/CMR/0002',qrCode:'DEMO-CMR-0002',unloadedAt:'12 paź · 08:15'},
  {id:'handover-demo-3',sourceId:'driver-demo-a',orderId:'DEMO/CMR/0003',qrCode:'DEMO-CMR-0003',unloadedAt:'12 paź · 09:20'}
];
const scenarios={
  basic:{
    load:{ref:null,contact:null,instructions:null,notes:[],photos:[],gate:null,parking:null,warehouse:null,ramp:null},
    unload:{ref:null,contact:null,instructions:null,notes:[],photos:[],gate:null,parking:null,warehouse:null,ramp:null}
  },
  contact:{
    load:{ref:null,contact:{name:'Kontakt testowy A',phone:'+48 000 000 001'},instructions:'Towar jest przechowywany w demonstracyjnej strefie nr 1.',notes:['Kontakt testowy będzie na miejscu w oknie załadunku.'],photos:[],gate:null,parking:null,warehouse:null,ramp:null},
    unload:{ref:null,contact:{name:'Kontakt testowy B',phone:'+48 000 000 002'},instructions:'Po przyjeździe zgłoś się do magazynu testowego B. Skrzynie zostaw w strefie rozładunku przy rampie 4.',notes:['Przed odjazdem poproś kontakt testowy o potwierdzenie odbioru.'],photos:[],gate:'B',parking:'P2',warehouse:'B',ramp:'4'}
  },
  materials:{
    load:{ref:'REF-DEMO-0001',refDemo:true,contact:{name:'Kontakt testowy A',phone:'+48 000 000 001'},instructions:'Towar jest przechowywany w demonstracyjnej strefie nr 1.',notes:['Kontakt testowy będzie na miejscu w oknie załadunku.'],photos:[{name:'Zdjęcie miejsca odbioru',url:demoPhoto(1),demo:true},{name:'Zdjęcie przygotowanego ładunku',url:demoPhoto(0),demo:true}],gate:null,parking:null,warehouse:null,ramp:null},
    unload:{ref:'DEL-DEMO-0001',refDemo:true,contact:{name:'Kontakt testowy B',phone:'+48 000 000 002'},instructions:'Wjedź bramą B i podjedź pod rampę 4. Skrzynie zostaw w oznaczonej strefie testowej B.',notes:['Nie zostawiaj ładunku w ciągu komunikacyjnym.'],photos:[{name:'Miejsce pozostawienia ładunku',url:demoPhoto(1),demo:true},{name:'Wjazd do strefy rozładunku',url:demoPhoto(0),demo:true}],gate:'B',parking:'P2',warehouse:'B',ramp:'4'}
  }
};

const makePiece=(number,values={})=>({
  id:values.id||`piece-${number}-${Math.random().toString(36).slice(2,8)}`,
  name:values.name||`Skrzynia transportowa ${number}`,
  description:values.description||'Sprzęt eventowy w opakowaniu transportowym',
  mass:values.mass??120,
  dimensions:values.dimensions||'120 × 80 × 100 cm',
  label:Boolean(values.label),
  seal:values.seal||null,
  expectedSeal:values.expectedSeal||null,
  photos:{near:values.photos?.near||null,far:values.photos?.far||null,unload:values.photos?.unload||null},
  loadingPhotos:{near:values.loadingPhotos?.near||null,far:values.loadingPhotos?.far||null}
});
const demoLoadingPhoto=(number,side)=>({hash:`loading-photo-${number}-${side}`,demo:true,kind:`photo-${side}`,mime:'image/svg+xml',name:`Sztuka-${number}-${side}`,url:demoPhoto(side==='near'?0:1),source:'load-operation',chatSynced:true});
const demoLoadingDocuments=()=>[{hash:'loading-cmr-demo-1',demo:true,kind:'cmr',mime:'image/svg+xml',name:'CMR-z-zaladunku-strona-1',source:'load-operation',chatSynced:true}];
const defaultPieces=()=>Array.from({length:assignment.cargo.quantity},(_,index)=>makePiece(index+1));
const defaultUnloadPieces=()=>Array.from({length:assignment.cargo.quantity},(_,index)=>makePiece(index+1,{expectedSeal:`DEMO-PL-${String(index+1).padStart(2,'0')}`,loadingPhotos:{near:demoLoadingPhoto(index+1,'near'),far:demoLoadingPhoto(index+1,'far')}}));
const fresh=(mode='load',pieces=mode==='load'?defaultPieces():defaultUnloadPieces(),values={})=>({
  mode,
  arrived:true,
  physicalConfirmed:false,
  started:false,
  items:pieces,
  cmrLabel:false,
  cmrSeal:null,
  expectedCmrSeal:values.expectedCmrSeal||(mode==='unload'?'DEMO-PL-CMR':null),
  loadingDocuments:mode==='unload'?(values.loadingDocuments||demoLoadingDocuments()):[],
  documents:[],
  documentsComplete:false,
  messages:[],
  finished:false,
  step:'info'
});
const freshRouteStop=type=>({
  type,screen:'travel',returnScreen:'travel',arrived:false,finished:false,messages:[],
  photos:type==='fueling'?{receipt:null,dispenser:null,nozzle:null}:null,
  expense:type==='fueling'?{country:'DE',liters:'',price:'',withAdBlue:false,adBlueLiters:'',adBluePrice:''}:null,
  breakDecision:type==='fueling'?null:undefined
});
const freshHandoverGroup=source=>({
  sourceId:source.id,prepared:false,preparedAt:null,documents:[],pendingDocument:null,
  envelope:{contentsConfirmed:false,sealCode:null,sealedAt:null},syncState:'LOCAL_ONLY'
});
const freshDocumentCollection=()=>({
  type:'collection',role:collectionPreviewRole,transferorSourceId:collectionSources[0].id,activeSourceId:null,
  screen:'info',returnScreen:'info',started:false,finished:false,messages:[],groups:collectionSources.map(freshHandoverGroup),syncState:'LOCAL_ONLY'
});
const serviceDailyStorageKey='super-spedytor-service-daily-v1';
const servicePhotoDatabaseName='super-spedytor-service-photos-v1';
const servicePhotoStoreName='survey-photos';
const serviceDateKey=(date=new Date())=>{
  const effective=new Date(date);
  if(effective.getHours()===0&&effective.getMinutes()<1)effective.setDate(effective.getDate()-1);
  return `${effective.getFullYear()}-${String(effective.getMonth()+1).padStart(2,'0')}-${String(effective.getDate()).padStart(2,'0')}`;
};
const nextServiceExpiry=(date=new Date())=>{
  const expiry=new Date(date);
  expiry.setHours(0,1,0,0);
  if(date>=expiry)expiry.setDate(expiry.getDate()+1);
  return expiry;
};
const servicePromptSlot=(date=new Date())=>date.getHours()<15?'morning':'evening';
function readServiceDailyRecord(){
  try{
    const record=JSON.parse(localStorage.getItem(serviceDailyStorageKey)||'null');
    return record&&typeof record==='object'?record:null;
  }catch{return null;}
}
function writeServiceDailyRecord(changes={}){
  try{
    const today=serviceDateKey(),stored=readServiceDailyRecord();
    const base=stored?.date===today?stored:{date:today,status:'due',promptSlots:[]};
    const record={...base,...changes,date:today};
    localStorage.setItem(serviceDailyStorageKey,JSON.stringify(record));
    return record;
  }catch{return null;}
}
function clearServiceDailyRecord(){
  try{localStorage.removeItem(serviceDailyStorageKey);}catch{}
  clearStoredServicePhotos().catch(()=>{});
}
function openServicePhotoDatabase(){
  return new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)){reject(new Error('Brak pamięci zdjęć na tym urządzeniu.'));return;}
    const request=indexedDB.open(servicePhotoDatabaseName,1);
    request.onupgradeneeded=()=>{
      const database=request.result;
      if(!database.objectStoreNames.contains(servicePhotoStoreName))database.createObjectStore(servicePhotoStoreName,{keyPath:'id'});
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('Nie udało się otworzyć pamięci zdjęć.'));
  });
}
const waitForTransaction=transaction=>new Promise((resolve,reject)=>{
  transaction.oncomplete=()=>resolve();
  transaction.onerror=()=>reject(transaction.error||new Error('Nie udało się zapisać zdjęć.'));
  transaction.onabort=()=>reject(transaction.error||new Error('Zapis zdjęć został przerwany.'));
});
async function clearStoredServicePhotos(){
  const database=await openServicePhotoDatabase();
  try{
    const transaction=database.transaction(servicePhotoStoreName,'readwrite');
    transaction.objectStore(servicePhotoStoreName).clear();
    await waitForTransaction(transaction);
  }finally{database.close();}
}
async function persistServicePhotos(date,photos){
  Object.entries(photos).forEach(([key,record])=>{
    if(record&&!record.demo&&!record.blob)throw new Error(`Nie można utrwalić zdjęcia: ${key}.`);
  });
  const database=await openServicePhotoDatabase();
  const snapshot={};
  try{
    const transaction=database.transaction(servicePhotoStoreName,'readwrite'),store=transaction.objectStore(servicePhotoStoreName);
    store.clear();
    Object.entries(photos).forEach(([key,record])=>{
      if(!record)return;
      if(record.demo){
        snapshot[key]={demo:true,url:record.url,name:record.name,mime:record.mime,kind:record.kind,source:record.source};
        return;
      }
      const id=`${date}:${key}`;
      store.put({id,date,key,blob:record.blob,name:record.name,mime:record.mime,kind:record.kind,source:record.source});
      snapshot[key]={storageId:id,name:record.name,mime:record.mime,kind:record.kind,source:record.source};
    });
    await waitForTransaction(transaction);
    return snapshot;
  }finally{database.close();}
}
async function restoreServicePhotos(metadata={}){
  const restored={oil:null,adBlue:null,serviceDistance:null,dpf:null,message:null};
  const storedEntries=Object.entries(metadata).filter(([,record])=>record?.storageId);
  Object.entries(metadata).filter(([,record])=>record?.demo).forEach(([key,record])=>{restored[key]={...record};});
  if(!storedEntries.length)return restored;
  const database=await openServicePhotoDatabase();
  try{
    const transaction=database.transaction(servicePhotoStoreName,'readonly'),store=transaction.objectStore(servicePhotoStoreName);
    const results=await Promise.all(storedEntries.map(([key,record])=>new Promise((resolve,reject)=>{
      const request=store.get(record.storageId);
      request.onsuccess=()=>resolve([key,record,request.result]);
      request.onerror=()=>reject(request.error||new Error('Nie udało się odczytać zdjęcia.'));
    })));
    results.forEach(([key,metadataRecord,stored])=>{
      if(!stored?.blob)return;
      restored[key]={...metadataRecord,blob:stored.blob,url:URL.createObjectURL(stored.blob),demo:false};
    });
    return restored;
  }finally{database.close();}
}
function serviceCompletedToday(){
  const record=readServiceDailyRecord();
  return Boolean(record?.date===serviceDateKey()&&record.status==='done'&&record.survey);
}
async function markServiceDailyDone(time){
  const date=serviceDateKey(),photoSnapshot=await persistServicePhotos(date,state.serviceSurvey.photos);
  const record=writeServiceDailyRecord({
    status:'done',completedAt:new Date().toISOString(),submittedAt:time,
    expiresAt:nextServiceExpiry().toISOString(),snoozeUntil:null,
    survey:{
      oil:state.serviceSurvey.oil,
      adBlue:state.serviceSurvey.adBlue,
      serviceDistance:state.serviceSurvey.serviceDistance,
      afterService:state.serviceSurvey.afterService,
      note:state.serviceSurvey.note,
      photos:photoSnapshot
    }
  });
  if(!record)throw new Error('Nie udało się zapisać ankiety na urządzeniu.');
}
function markServiceDailyDue(){
  const record=readServiceDailyRecord();
  writeServiceDailyRecord({status:'due',completedAt:null,submittedAt:null,promptSlots:record?.date===serviceDateKey()?record.promptSlots||[]:[]});
}
function serviceReminderDue(){
  const now=new Date(),record=readServiceDailyRecord();
  if(record?.date===serviceDateKey(now)&&record.status==='done'&&record.survey)return false;
  if(record?.date!==serviceDateKey(now))return true;
  if(record.snoozeUntil&&Date.now()<new Date(record.snoozeUntil).getTime())return false;
  return !(record.promptSlots||[]).includes(servicePromptSlot(now));
}
function recordServiceReminderShown(){
  const now=new Date(),record=readServiceDailyRecord();
  const slots=record?.date===serviceDateKey(now)?record.promptSlots||[]:[];
  writeServiceDailyRecord({status:'due',promptSlots:[...new Set([...slots,servicePromptSlot(now)])],lastPromptedAt:now.toISOString(),snoozeUntil:null});
}
function postponeServiceReminder(){
  const now=new Date(),later=new Date(now),record=readServiceDailyRecord();
  if(now.getHours()<18)later.setHours(18,0,0,0);else later.setTime(now.getTime()+60*60*1000);
  const slots=(record?.date===serviceDateKey(now)?record.promptSlots||[]:[]).filter(slot=>slot!==servicePromptSlot(now));
  writeServiceDailyRecord({status:'due',promptSlots:slots,snoozeUntil:later.toISOString()});
  return now.getHours()<18?'wieczorem po otwarciu aplikacji':'za godzinę po ponownym otwarciu aplikacji';
}
function updateServiceNavIndicator(){
  const button=$('[data-nav="service"]');
  if(!button)return;
  const due=!serviceCompletedToday();
  button.classList.toggle('service-due',due);
  button.setAttribute('aria-label',due?'Serwis — dzisiejsza ankieta do wypełnienia':'Serwis — dzisiejsza ankieta wykonana');
}
function maybeShowDailyServiceReminder(){
  if(state.modal||state.serviceOpen||!serviceReminderDue())return;
  recordServiceReminderShown();
  openModal('daily-service',{});
}
const freshServiceSurvey=()=>({
  date:serviceDateKey(),
  oil:'',adBlue:'',serviceDistance:'',afterService:false,note:'',
  photos:{oil:null,adBlue:null,serviceDistance:null,dpf:null,message:null},
  submitted:false,submittedAt:null,reopened:false,hydrated:false
});
const inventoryGroups=[
  {
    id:'safety',
    eyebrow:'BEZPIECZEŃSTWO',
    title:'Kabina i wyposażenie awaryjne',
    items:[
      {id:'extinguisher',name:'Gaśnica',expected:'1 szt.',icon:'warning'},
      {id:'triangle',name:'Trójkąt ostrzegawczy',expected:'1 szt.',icon:'warning'},
      {id:'firstAid',name:'Apteczka',expected:'1 szt.',icon:'box'},
      {id:'vests',name:'Kamizelki odblaskowe',expected:'2 szt.',icon:'box'}
    ]
  },
  {
    id:'cargo',
    eyebrow:'ZABEZPIECZENIE ŁADUNKU',
    title:'Wyposażenie przestrzeni ładunkowej',
    items:[
      {id:'straps',name:'Pasy transportowe',expected:'12 szt.',icon:'box'},
      {id:'corners',name:'Narożniki ochronne',expected:'12 szt.',icon:'box'},
      {id:'mats',name:'Maty antypoślizgowe',expected:'8 szt.',icon:'box'},
      {id:'bars',name:'Belki rozporowe',expected:'2 szt.',icon:'box'}
    ]
  },
  {
    id:'additional',
    eyebrow:'WYPOSAŻENIE DODATKOWE',
    title:'Rzeczy przypisane do pojazdu',
    items:[
      {id:'chocks',name:'Kliny pod koła',expected:'2 szt.',icon:'box'},
      {id:'flashlight',name:'Latarka',expected:'1 szt.',icon:'box'},
      {id:'broom',name:'Miotła do przestrzeni ładunkowej',expected:'1 szt.',icon:'box'},
      {id:'documentCase',name:'Dokumentownik CMR',expected:'1 szt.',icon:'doc'}
    ]
  }
];
const inventoryItems=inventoryGroups.flatMap(group=>group.items);
const inventoryItem=id=>inventoryItems.find(item=>item.id===id);
const freshInventoryProtocol=()=>({
  id:'INV/DEMO/2026/001',
  vehicle:'Pojazd demonstracyjny',
  registration:'DEMO 01',
  driver:'Kierowca demonstracyjny',
  statuses:{},
  notes:{},
  photos:{},
  confirmed:false,
  submitted:false,
  submittedAt:null
});
const initialLoad=fresh('load');
if(androidShell)initialLoad.arrived=nativeHasArrival(routePointIds.load);
const initialServicePanel=appQuery.get('service')==='inventory'?'inventory':'survey';
const state={operation:'load',routeStop:null,screen:androidShell&&!initialLoad.arrived?'travel':'info',returnScreen:'info',scenario:'basic',language:'pl',manualLanguage:false,operations:{load:initialLoad,unload:fresh('unload')},routeStops:{collection:freshDocumentCollection(),parking:freshRouteStop('parking'),fueling:freshRouteStop('fueling')},serviceOpen:appQuery.has('service'),servicePanel:initialServicePanel,serviceSurvey:freshServiceSurvey(),inventoryProtocol:freshInventoryProtocol(),modal:null};
function ensureServiceSurveyToday(){
  if(state.serviceSurvey.date===serviceDateKey())return;
  Object.values(state.serviceSurvey.photos).forEach(revoke);
  state.serviceSurvey=freshServiceSurvey();
}
async function restoreServiceSurveyForToday(){
  const record=readServiceDailyRecord();
  if(record?.date===serviceDateKey()&&record.status==='done'&&!record.survey){
    writeServiceDailyRecord({status:'due',completedAt:null,submittedAt:null,promptSlots:[]});
    return false;
  }
  if(state.serviceSurvey.hydrated||record?.date!==serviceDateKey()||!record.survey)return false;
  const hasUnsavedInput=[state.serviceSurvey.oil,state.serviceSurvey.adBlue,state.serviceSurvey.serviceDistance,state.serviceSurvey.note].some(has)
    ||Object.values(state.serviceSurvey.photos).some(Boolean);
  if(hasUnsavedInput)return false;
  let photos={oil:null,adBlue:null,serviceDistance:null,dpf:null,message:null},photosComplete=true;
  try{
    photos=await restoreServicePhotos(record.survey.photos);
    photosComplete=Object.keys(record.survey.photos||{}).every(key=>Boolean(photos[key]));
  }catch{photosComplete=false;}
  Object.assign(state.serviceSurvey,{
    oil:record.survey.oil||'',
    adBlue:record.survey.adBlue||'',
    serviceDistance:record.survey.serviceDistance||'',
    afterService:Boolean(record.survey.afterService),
    note:record.survey.note||'',
    photos,
    submitted:false,
    submittedAt:null,
    reopened:record.status!=='done'||!photosComplete,
    hydrated:true
  });
  if(!photosComplete)markServiceDailyDue();
  return true;
}
async function expireServiceSurveyDataIfNeeded(){
  const today=serviceDateKey(),record=readServiceDailyRecord();
  const expired=Boolean(record?.date&&record.date!==today)||state.serviceSurvey.date!==today;
  if(!expired)return false;
  Object.values(state.serviceSurvey.photos).forEach(revoke);
  state.serviceSurvey=freshServiceSurvey();
  try{localStorage.removeItem(serviceDailyStorageKey);}catch{}
  try{await clearStoredServicePhotos();}catch{}
  return true;
}
let serviceExpiryTimer=null;
function scheduleServiceSurveyExpiry(){
  clearTimeout(serviceExpiryTimer);
  const delay=Math.max(1000,nextServiceExpiry().getTime()-Date.now());
  serviceExpiryTimer=setTimeout(async()=>{
    await expireServiceSurveyDataIfNeeded();
    ensureServiceSurveyToday();
    render();
    scheduleServiceSurveyExpiry();
  },Math.min(delay,2147483647));
}
async function initializeServiceSurveyStorage(){
  await expireServiceSurveyDataIfNeeded();
  await restoreServiceSurveyForToday();
  ensureServiceSurveyToday();
  render();
  maybeShowDailyServiceReminder();
  scheduleServiceSurveyExpiry();
}
const dictionary={pl:{pickup:'ZAŁADUNEK',delivery:'ROZŁADUNEK',flag:'🇵🇱'},en:{pickup:'PICKUP',delivery:'DELIVERY',flag:'🇬🇧'},de:{pickup:'BELADUNG',delivery:'ENTLADUNG',flag:'🇩🇪'},it:{pickup:'CARICO',delivery:'SCARICO',flag:'🇮🇹'}};

const current=()=>state.operations[state.operation];
const currentStop=()=>state.routeStop?state.routeStops[state.routeStop]:null;
const stopDefinition=()=>state.routeStop?routeStopDefinitions[state.routeStop]:null;
const cargoMode=()=>!state.routeStop;
const isLoad=()=>state.operation==='load';
const operationName=()=>isLoad()?'Załadunek':'Rozładunek';
const operationGenitive=()=>isLoad()?'załadunku':'rozładunku';
const currentPlace=()=>isLoad()?assignment.pickup:assignment.delivery;
const optional=()=>scenarios[state.scenario][state.operation];
const count=()=>current().items.length;
const photoRecords=operation=>operation.items.flatMap(item=>(operation.mode==='load'?[item.photos.near,item.photos.far]:[item.photos.unload]).filter(Boolean));
const pieceReady=(item,operation=current())=>operation.mode==='load'?Boolean(item.label&&item.seal&&item.photos.near&&item.photos.far):Boolean(item.seal&&item.photos.unload);
const cargoReady=()=>count()>0&&current().items.every(item=>pieceReady(item));
const cmrSealReady=()=>Boolean(current().cmrSeal&&(isLoad()?current().cmrLabel:true));
const documentReady=()=>current().documents.length>0&&current().documentsComplete;
const allReady=()=>current().started&&current().physicalConfirmed&&cargoReady()&&cmrSealReady()&&documentReady();
const documentationSteps=()=>isLoad()?['photos','seals','documents']:['seals','photos','documents'];
const operationFlow=()=>isLoad()?['info',...documentationSteps(),'review']:['seals','info','photos','documents','review'];
const progress=()=>isLoad()?[cargoReady(),cmrSealReady(),documentReady()]:[cmrSealReady(),cargoReady(),documentReady()];
const completedPieces=()=>current().items.filter(item=>pieceReady(item)).length;
const collection=()=>state.routeStops.collection;
const collectionSource=id=>collectionSources.find(source=>source.id===id)||collectionSources[0];
const collectionGroup=(sourceId=collection().activeSourceId)=>sourceId?collection().groups.find(group=>group.sourceId===sourceId)||null:null;
const collectionGroupOrders=(group=collectionGroup())=>group?collectionOrders.filter(order=>order.sourceId===group.sourceId):[];
const availableCollectionOrders=(group=collectionGroup())=>group?collectionGroupOrders(group).filter(order=>!group.documents.some(record=>record.handoverId===order.id)&&group.pendingDocument?.handoverId!==order.id):[];
const collectionDocumentsReady=(group=collectionGroup())=>Boolean(group&&!group.pendingDocument&&collectionGroupOrders(group).length>0&&group.documents.length===collectionGroupOrders(group).length&&group.documents.every(record=>record.confirmed));
const collectionEnvelopeReady=(group=collectionGroup())=>Boolean(group&&collectionDocumentsReady(group)&&group.envelope.contentsConfirmed&&group.envelope.sealCode);
const allCollectionGroupsReady=()=>collection().groups.every(group=>collectionEnvelopeReady(group));
const nextPendingCollectionGroup=()=>collection().groups.find(group=>!collectionEnvelopeReady(group));

let toastTimer,uploadTarget,focusBeforeModal,uploadBusy=false,arrivalCountdown=null;

function toast(message){
  $('#toast').textContent=message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3800);
}
function revoke(record){if(record?.url?.startsWith('blob:'))URL.revokeObjectURL(record.url);}
function revokePiece(piece){revoke(piece.photos.near);revoke(piece.photos.far);revoke(piece.photos.unload);}

function openService(panel=state.servicePanel||'survey'){
  cancelArrivalCountdown(false);
  closeModal(false);
  state.servicePanel=panel;
  state.serviceOpen=true;
  render();
  $('#app-scroll').scrollTop=0;
}
function closeService(){
  state.serviceOpen=false;
  closeModal(false);
  render();
  $('#app-scroll').scrollTop=0;
}

function cancelArrivalCountdown(showToast=false){
  if(!arrivalCountdown)return;
  clearInterval(arrivalCountdown.timer);
  arrivalCountdown=null;
  if(showToast){render();toast('Potwierdzenie dotarcia zostało wycofane.');}
}
function startArrivalCountdown(){
  cancelArrivalCountdown(false);
  const operation=state.routeStop||state.operation;
  arrivalCountdown={operation,remaining:5,timer:null};
  render();
  arrivalCountdown.timer=setInterval(()=>{
    const activeOperation=state.routeStop||state.operation;
    if(!arrivalCountdown||arrivalCountdown.operation!==operation||activeOperation!==operation||state.screen!=='travel'){
      cancelArrivalCountdown(false);
      return;
    }
    arrivalCountdown.remaining-=1;
    if(arrivalCountdown.remaining<=0){
      clearInterval(arrivalCountdown.timer);
      arrivalCountdown=null;
      nativeConfirmArrival(operation);
      if(state.routeStop){
        currentStop().arrived=true;
        goStop('info');
        if(operation==='parking')window.SuperSpedytorTacho?.offerParkingBreak?.();
      }
      else{current().arrived=true;go(isLoad()?'info':'seals');}
      return;
    }
    render();
  },1000);
}

function go(screen){
  if(arrivalCountdown)cancelArrivalCountdown(false);
  state.serviceOpen=false;
  const arrivalSeal=screen==='seals'&&!isLoad()&&current().arrived;
  if(['photos','seals','documents','review'].includes(screen)&&(!current().started||!current().physicalConfirmed)&&!arrivalSeal){
    toast(isLoad()?'Najpierw potwierdź wykonanie załadunku.':'Najpierw potwierdź liczbę sztuk przeznaczonych do rozładunku.');
    return;
  }
  if(screen==='seals'&&isLoad()&&!cargoReady()){
    toast('Najpierw przy każdej sztuce naklej i zeskanuj plombę oraz dodaj dwa zdjęcia.');
    return;
  }
  if(screen==='photos'&&!isLoad()&&!cmrSealReady()){
    toast('Najpierw przygotuj dokumenty i zeskanuj plombę CMR.');
    return;
  }
  if(screen==='documents'&&(!cargoReady()||!cmrSealReady())){
    toast(isLoad()?'Najpierw zeskanuj plombę z pustego tyłu ostatniej strony CMR.':'Najpierw zeskanuj plombę CMR i sprawdź jej zgodność z załadunkiem.');
    return;
  }
  if(screen==='review'&&!allReady()){
    toast('Do zakończenia potrzebne są kompletne sztuki ładunku, plomba CMR i pełny skan CMR.');
    return;
  }
  if(screen==='chat'&&state.screen!=='chat')state.returnScreen=state.screen;
  closeModal(false);
  state.screen=screen;
  if(operationFlow().includes(screen))current().step=screen;
  if(screen==='travel')current().arrived=false;
  if(screen==='info')current().arrived=true;
  render();
  $('#app-scroll').scrollTop=0;
}
function goStop(screen){
  if(arrivalCountdown)cancelArrivalCountdown(false);
  state.serviceOpen=false;
  const stop=currentStop();
  if(!stop)return;
  if(state.routeStop==='collection'){
    if(collection().role!=='receiver'&&screen!=='info'){toast('To konto ma tylko zadanie przygotowania własnych dokumentów.');return;}
    if(screen==='photos'&&(!collection().started||!collectionGroup())){toast('Najpierw zeskanuj QR pierwszego dokumentu CMR. System sam rozpozna kierowcę.');return;}
    if(screen==='documents'&&!collectionDocumentsReady()){toast('Najpierw zeskanuj i sprawdź wszystkie CMR-y tego kierowcy.');return;}
    if(screen==='review'&&!collectionEnvelopeReady()){toast('Najpierw potwierdź zawartość, naklej nieużytą plombę i zeskanuj jej QR.');return;}
  }
  if(screen==='chat'&&state.screen!=='chat')stop.returnScreen=state.screen;
  closeModal(false);
  state.screen=screen;
  stop.screen=screen;
  if(screen==='travel')stop.arrived=false;
  if(screen==='info')stop.arrived=true;
  render();
  $('#app-scroll').scrollTop=0;
}
function switchOperation(operation,screen='info'){
  cancelArrivalCountdown(false);
  state.routeStop=null;
  state.operation=operation;
  if(!state.manualLanguage)state.language=operation==='load'?'it':'en';
  go(screen);
}
function switchRouteStop(type,screen='travel'){
  cancelArrivalCountdown(false);
  state.serviceOpen=false;
  state.routeStop=type;
  const stop=currentStop();
  state.screen=screen||stop.screen;
  stop.screen=state.screen;
  closeModal(false);
  render();
  $('#app-scroll').scrollTop=0;
}
function switchScenario(value){
  cancelArrivalCountdown(false);
  state.scenario=value;
  if(state.routeStop){render();return;}
  state.screen=current().arrived?(current().finished?'success':current().step):'travel';
  render();
  $('#app-scroll').scrollTop=0;
}
function languageControl(){
  return `<label class="language-control"><span aria-hidden="true">${dictionary[state.language].flag}</span><select id="language-select" aria-label="Język nazw operacji">${Object.keys(dictionary).map(language=>`<option value="${language}" ${language===state.language?'selected':''}>${language.toUpperCase()}</option>`).join('')}</select></label>`;
}
function pageHeading(travel=false){
  const place=currentPlace();
  return `<div class="operation-heading"><div><div class="overline">${esc(assignment.id)} · PUNKT ${isLoad()?'1':'2'}/2</div><h2>${operationName()}</h2></div><div class="header-tools">${languageControl()}</div></div><div class="heading-status"><span class="badge ${travel?'orange':'green'}">${icon(travel?'route':'check')}${travel?'W drodze':'Jesteś na miejscu'}</span><span class="arrival-time">${place.country} · ${place.countryName}</span></div>`;
}
function travelCargoView(){
  const title=isLoad()?'Co będziesz ładować':'Co będziesz rozładowywać';
  const quantity=`${count()} ${count()===1?'sztuka':count()<5?'sztuki':'sztuk'}`;
  const totalMass=current().items.reduce((sum,piece)=>sum+(Number(piece.mass)||0),0);
  return `<div class="travel-cargo-preview" aria-label="${title}"><div class="travel-cargo-heading"><span>${icon('box')}</span><div><small>${title}</small><strong>${quantity}${totalMass?` · ${totalMass} kg`:''}</strong></div></div><div class="travel-cargo-list">${current().items.map((piece,index)=>`<div class="travel-cargo-item"><span class="piece-index">${index+1}</span><div><strong>${esc(piece.name)}</strong><small>${[piece.description,has(piece.mass)?`${piece.mass} kg`:null,piece.dimensions].filter(has).map(esc).join(' · ')}</small></div></div>`).join('')}</div></div>`;
}
function locationActionsView(place,extraClass=''){
  const canNavigate=has(place.address)||(has(place.latitude)&&has(place.longitude));
  if(!canNavigate)return '';
  return `<div class="place-location-actions ${extraClass}"><a class="place-location-button pin-action" href="${locationUrl(place)}" rel="noopener" aria-label="Pokaż punkt na mapie bez wyznaczania trasy"><span>${icon('pin')}</span><small>Pinezka</small></a><a class="place-location-button navigation-action" href="${navigationUrl(place)}" rel="noopener" aria-label="Rozpocznij nawigację do punktu"><span>${icon('nav')}</span><small>Nawiguj</small></a></div>`;
}
function unloadBeforeArrivalView(){
  if(isLoad())return '';
  const pieces=current().items.map((piece,index)=>({piece,index,seal:piece.expectedSeal})).filter(item=>has(item.seal));
  const cmrSeal=current().expectedCmrSeal;
  const photos=(optional().photos||[]).map((photo,index)=>({photo,index})).filter(({photo})=>has(photo?.url));
  if(!pieces.length&&!has(cmrSeal)&&!photos.length)return '';
  const seals=pieces.map(({piece,index,seal})=>`<div class="unload-next-row"><span>Plomba ładunku · sztuka ${index+1}</span><strong>${esc(seal)}</strong><small>${esc(piece.name)}</small></div>`).join('');
  const cmr=has(cmrSeal)?`<div class="unload-next-row"><span>Plomba dokumentu CMR</span><strong>${esc(cmrSeal)}</strong><small>Numer zapisany podczas załadunku</small></div>`:'';
  const suppliedPhotos=photos.length?`<div class="unload-place-photo-title">${icon('camera')}<span><strong>Zdjęcia miejsca rozładunku</strong><small>Sprawdź przed dojazdem</small></span></div><div class="unload-place-photos">${photos.map(({photo,index})=>`<button type="button" data-supplied-photo="${index}" aria-label="Otwórz: ${esc(photo.name)}"><img src="${photo.url}" alt="${esc(photo.name)}${photo.demo?' — przykład demonstracyjny':''}"><span>${esc(photo.name)}</span></button>`).join('')}</div>`:'';
  return `<section class="panel unload-next-panel" aria-label="Informacje potrzebne przed rozładunkiem"><div class="section-kicker">${icon('qr')} PRZED DOJAZDEM</div><h3>Plomby ładunku</h3>${seals}${cmr}<div class="unload-next-instruction">${icon('info')}<div><p><strong>Numery są dostępne już w trasie.</strong> Po dotarciu porównaj je z plombami fizycznie znajdującymi się na sztukach i na CMR.</p></div></div>${suppliedPhotos}<div class="unload-photo-rule">${icon('camera')}<p><strong>Zdjęcie z rozładunku</strong>Po zdjęciu każdej sztuki z pojazdu zrób jej zdjęcie na rampie albo na ziemi. Aplikacja poprosi o nie w kroku dokumentacji.</p></div></section>`;
}
function travelView(){
  const place=currentPlace(),data=optional();
  const access=[has(data.gate)?`Brama ${data.gate}`:null,has(data.parking)?`Parking ${data.parking}`:null,has(data.ramp)?`Rampa ${data.ramp}`:null].filter(Boolean);
  const nextStep=isLoad()?'Po potwierdzeniu dotarcia zobaczysz informacje o załadunku i listę sztuk.':'Po potwierdzeniu dotarcia aplikacja od razu poprosi o zeskanowanie plomby CMR.';
  return `<div class="app-content travel-screen">${pageHeading(true)}<section class="travel-map-card" aria-label="Mapa dojazdu do punktu ${operationGenitive()}"><div class="travel-map-visual"><svg viewBox="0 0 360 210" role="img" aria-label="Schemat trasy do punktu"><path class="map-street major" d="M-20 166 C55 128 93 139 151 101 S278 36 390 52"/><path class="map-street" d="M18 15 C62 62 79 96 91 224"/><path class="map-street" d="M185 -15 C177 37 198 88 243 128 S304 176 374 193"/><path class="map-street thin" d="M-10 79 C66 88 103 60 148 46 S254 35 370 98"/><path class="map-street thin" d="M121 -14 C127 44 152 67 197 91 S282 128 315 220"/><path class="map-route" d="M38 181 C82 146 112 153 148 119 S217 78 276 65"/><circle class="map-start" cx="38" cy="181" r="7"/><circle class="map-destination" cx="276" cy="65" r="9"/></svg><span class="travel-map-road road-one">A15</span><span class="travel-map-road road-two">N210</span><span class="travel-map-pin">${icon('pin')}</span><span class="travel-map-label">Punkt ${operationGenitive()}</span></div><div class="travel-destination"><span class="travel-destination-icon">${icon('pin')}</span><div><small>${isLoad()?'ZAŁADUNEK':'ROZŁADUNEK'} · ${esc(place.country)}</small><h3>${esc(place.company)}</h3><div class="travel-address-row"><p>${esc(place.address||place.countryName)}</p>${locationActionsView(place,'travel-location-actions')}</div>${access.length?`<div class="travel-access">${access.map(item=>`<span>${esc(item)}</span>`).join('')}</div>`:''}</div></div>${travelCargoView()}</section>${unloadBeforeArrivalView()}<div class="travel-next-hint">${icon(isLoad()?'info':'qr')}<p><strong>${isLoad()?'Po dotarciu':'Na rozładunku najpierw CMR'}</strong>${nextStep}</p></div></div>`;
}
function placeView(){
  const place=currentPlace(),data=optional();
  const fields=[['Brama',data.gate],['Parking',data.parking],['Magazyn',data.warehouse],['Rampa',data.ramp]].filter(([,value])=>has(value));
  return `<section class="panel place-panel"><div class="section-kicker">${icon('pin')} FIRMA ${isLoad()?'ZAŁADOWCY':'ODBIORCY'}</div><h3>${esc(place.company)}</h3><div class="place-address-row">${has(place.address)?`<p class="address">${esc(place.address)}</p>`:''}${locationActionsView(place)}</div>${fields.length?`<div class="gate-chips optional-place-fields">${fields.map(([label,value])=>`<div class="gate-chip"><small>${label}</small><b>${esc(value)}</b></div>`).join('')}</div>`:''}</section>`;
}
function destinationView(){
  const place=isLoad()?assignment.delivery:assignment.pickup;
  return `<section class="panel destination-panel"><div class="section-kicker">${icon('route')} ${isLoad()?'DOKĄD JEDZIE ŁADUNEK':'SKĄD JEDZIE ŁADUNEK'} / ${dictionary[state.language][isLoad()?'delivery':'pickup']}</div><h4>${esc(place.company)}</h4><p>${esc(place.countryName)}${has(place.address)?`<br>${esc(place.address)}`:''}</p><a href="${locationUrl(place)}" target="_blank" rel="noopener">Otwórz lokalizację ${icon('arrow')}</a></section>`;
}
function cargoView(){
  return `<div class="cargo-list" aria-label="Lista sztuk ładunku ze zlecenia">${current().items.map((piece,index)=>`<section class="panel cargo-list-item"><div class="cargo-list-heading"><span class="piece-index">${index+1}</span><div><small>SZTUKA ${index+1} Z ${count()}</small><h4>${esc(piece.name)}</h4></div></div><p>${esc(piece.description)}</p><dl><div><dt>Masa</dt><dd>${has(piece.mass)?`${esc(piece.mass)} kg`:'Nie podano'}</dd></div><div><dt>Wymiary</dt><dd>${has(piece.dimensions)?esc(piece.dimensions):'Nie podano'}</dd></div></dl>${!isLoad()?`<div class="cargo-seal-reference"><span>Numer plomby z załadunku</span><strong>${esc(piece.expectedSeal||'Nie zapisano')}</strong></div>`:''}</section>`).join('')}</div><div class="cargo-total">${icon('box')}<span><strong>${count()} ${count()===1?'sztuka':count()<5?'sztuki':'sztuk'} w zleceniu</strong><small>${assignment.cargo.mass} kg łącznie</small></span></div>`;
}
function optionalView(){
  const data=optional(),contact=data.contact&&(has(data.contact.name)||has(data.contact.phone)),notes=data.notes?.filter(has)||[],photos=data.photos||[];
  const visible=has(data.ref)||contact||has(data.instructions)||notes.length||photos.length;
  if(!visible)return '';
  const guidance=has(data.instructions)||notes.length;
  return `<div class="section-heading additional-info-heading"><h3>Dodatkowe informacje</h3><span>Tylko dla tego zlecenia</span></div><section class="panel additional-info-panel">${has(data.ref)?`<div class="additional-info-row reference-row"><span class="additional-info-icon">${icon('doc')}</span><div><small>REF ${data.refDemo?'· przykład':operationGenitive()}</small><strong>${esc(data.ref)}</strong></div><button class="copy-button" id="copy-reference" aria-label="Kopiuj numer referencyjny">${icon('doc')}</button></div>`:''}${contact?`<div class="additional-info-row"><span class="additional-info-icon">${icon('phone')}</span><div class="contact-info"><small>Osoba kontaktowa</small>${has(data.contact.name)?`<strong>${esc(data.contact.name)}</strong>`:''}${has(data.contact.phone)?`<span>${esc(data.contact.phone)}</span>`:''}</div>${has(data.contact.phone)?`<a class="contact-button" href="tel:${data.contact.phone.replace(/[^+0-9]/g,'')}" aria-label="Zadzwoń do podanej osoby kontaktowej">${icon('phone')}</a>`:''}</div>`:''}${guidance?`<div class="additional-info-row guidance-row"><span class="additional-info-icon">${icon('info')}</span><div><small>Instrukcje i notatka od spedytora</small>${has(data.instructions)?`<p>${esc(data.instructions)}</p>`:''}${notes.map(note=>`<p>${esc(note)}</p>`).join('')}</div></div>`:''}${photos.length?`<div class="additional-attachments"><div class="additional-attachments-title">${icon('clip')}<span><strong>Załączniki</strong><small>${photos.length} ${photos.length===1?'materiał':'materiały'}</small></span></div>${photos.map((photo,index)=>`<button data-supplied-photo="${index}" class="supplied-photo"><img src="${photo.url}" alt="${esc(photo.name)} — przykład demonstracyjny"><span><strong>${esc(photo.name)}</strong><small>${photo.demo?'Materiał demonstracyjny':'Od zleceniodawcy'}</small></span>${icon('arrow')}</button>`).join('')}</div>`:''}</section>`;
}
function pieceSummary(piece,index,editable=true){
  const details=[has(piece.description)?piece.description:null,has(piece.mass)?`${piece.mass} kg`:null,piece.dimensions].filter(has);
  return `<div class="cargo-piece-summary"><span class="piece-index">${index+1}</span><div><strong>${esc(piece.name)}</strong><small>${details.map(esc).join(' · ')}</small></div>${editable?`<div class="piece-summary-actions"><button data-edit-piece="${index}" aria-label="Edytuj szczegóły sztuki ${index+1}">${icon('edit')}</button><button data-remove-piece="${index}" aria-label="Usuń sztukę ${index+1}" ${count()===1?'disabled':''}>${icon('close')}</button></div>`:''}</div>`;
}
function piecesManager(){
  const editable=!current().started;
  return `<div class="cargo-items-manager"><div class="cargo-items-title"><span>Faktyczne sztuki ładunku</span><b>${count()}</b></div>${current().items.map((piece,index)=>pieceSummary(piece,index,editable)).join('')}${editable?`<div class="cargo-count-actions"><button id="add-cargo-piece">${icon('plus')}<span><strong>Towaru jest więcej?</strong><small>Dodaj sztukę i jej szczegóły</small></span></button><button id="remove-last-piece" ${count()===1?'disabled':''}>${icon('close')}<span><strong>Towaru jest mniej?</strong><small>Usuń ostatnią sztukę</small></span></button></div>`:''}</div>`;
}
function infoView(){
  const afterConfirm=isLoad()?'Po potwierdzeniu przejdziesz przez każdą sztukę: nakleisz plombę, zeskanujesz jej QR oraz zrobisz zdjęcie z bliska i z daleka.':'Plomba CMR jest już sprawdzona. Po potwierdzeniu porównasz każdą sztukę ze zdjęciami z załadunku, zeskanujesz jej plombę i zrobisz zdjęcie z rozładunku.';
  const quantity=`${count()} ${count()===1?'sztuka':count()<5?'sztuki':'sztuk'}`;
  const confirmation=isLoad()?`Potwierdzam, że załadowałem ${quantity} ładunku zgodnie ze zleceniem.`:`Sprawdziłem, że do rozładowania są ${quantity} ładunku zgodne ze zleceniem.`;
  return `<div class="app-content">${pageHeading()}${placeView()}<div class="section-heading"><h3>${isLoad()?'Co odbierasz':'Do rozładowania'}</h3><span>Każda sztuka osobno</span></div>${cargoView()}<button class="cargo-mismatch-button" id="report-cargo-mismatch">${icon('chat')}<span><strong>Towar lub jego liczba nie zgadza się ze zleceniem?</strong><small>Zgłoś spedytorowi</small></span>${icon('arrow')}</button>${destinationView()}${optionalView()}<section class="panel loading-confirmation"><div class="section-kicker">${isLoad()?'PO FIZYCZNYM ZAŁADUNKU':'PRZED ROZŁADUNKIEM'}</div><label class="check-row"><input id="physical-confirm" type="checkbox" ${current().physicalConfirmed?'checked':''}><span>${confirmation}</span></label><p>${afterConfirm}</p></section></div>`;
}
function stepHeader(screen,title,description){
  const steps=documentationSteps(),index=steps.indexOf(screen);
  return `<div class="stage-header"><button id="stage-back" aria-label="Wróć do poprzedniego ekranu">${icon('back')}</button><div><span>${operationName()} · ${assignment.id}</span><b>KROK ${index+1} Z 3</b></div><button class="stage-chat" data-open-chat aria-label="Otwórz czat i dokumentację">${icon('chat')}</button></div><div class="stage-progress" aria-label="Postęp dokumentacji">${steps.map((step,stepIndex)=>`<span class="${stepIndex===index?'current':progress()[stepIndex]?'done':''}"></span>`).join('')}</div><h2 class="stage-title">${title}</h2><p class="stage-description">${description}</p>`;
}
function sourceLabel(record){return record.source==='chat'?'Dodano z czatu':record.chatSynced?'Automatycznie w czacie':record.demo?'Dodano przykład':'Dodano z tego ekranu';}

function piecePhotoButton(piece,index,side){
  const photo=piece.photos[side],near=side==='near',title=side==='unload'?'Zdjęcie z rozładunku':near?'Zdjęcie z bliska':'Zdjęcie z daleka',enabled=Boolean(piece.seal);
  const emptyHint=side==='unload'?(enabled?'Po rozładunku: na rampie lub na ziemi':'Najpierw zeskanuj plombę'):enabled?'Zrób lub dodaj zdjęcie':'Najpierw zeskanuj plombę';
  return `<button class="piece-photo-button ${photo?'done':''}" data-piece-photo="${index}" data-photo-side="${side}" ${enabled?'':'disabled'}>${photo?`<img src="${photo.url}" alt="${title} · ${esc(piece.name)}">`:`<span class="piece-photo-icon">${icon('camera')}</span>`}<span><strong>${title}</strong><small>${photo?sourceLabel(photo):emptyHint}</small></span>${photo?icon('check'):icon('arrow')}</button>`;
}
function loadingPhotosView(piece){
  const photos=[['near','Z bliska'],['far','Z daleka']].map(([side,label])=>({side,label,record:piece.loadingPhotos?.[side]})).filter(item=>item.record);
  if(!photos.length)return '';
  return `<div class="loading-photo-reference"><div class="loading-photo-reference-title">${icon('camera')}<span><strong>Zdjęcia z załadunku</strong><small>Pokazane automatycznie dla porównania</small></span></div><div class="loading-photo-reference-grid">${photos.map(({label,record})=>`<figure><img src="${record.url}" alt="${label} · zdjęcie z załadunku · ${esc(piece.name)}"><figcaption>${label}</figcaption></figure>`).join('')}</div></div>`;
}
function pieceTaskCard(piece,index){
  const load=isLoad(),taskCount=(load?[piece.label,piece.seal,piece.photos.near,piece.photos.far]:[piece.seal,piece.photos.unload]).filter(Boolean).length,total=load?4:2;
  const sealStep=load?`<label class="check-row"><input type="checkbox" data-piece-label="${index}" ${piece.label?'checked':''}><span>Plomba jest naklejona na opakowaniu</span></label>`:`<div class="expected-seal"><span>Numer plomby z załadunku</span><strong>${esc(piece.expectedSeal||'Nie zapisano')}</strong><small>Zeskanuj istniejącą plombę. Nie naklejaj nowej.</small></div>`;
  const photos=load?`${piecePhotoButton(piece,index,'near')}${piecePhotoButton(piece,index,'far')}`:piecePhotoButton(piece,index,'unload');
  return `<section class="panel piece-task-card ${pieceReady(piece)?'complete':''}"><div class="piece-task-heading"><span class="piece-index">${index+1}</span><div><h3>${esc(piece.name)}</h3><p>${[piece.description,has(piece.mass)?`${piece.mass} kg`:null,piece.dimensions].filter(has).map(esc).join(' · ')}</p></div><span class="piece-task-progress">${taskCount}/${total}</span></div>${load?'':loadingPhotosView(piece)}<div class="piece-seal-line">${sealStep}<div class="seal-code-row">${piece.seal?`<strong>${esc(piece.seal)}</strong>`:'<span>Kod jeszcze nieodczytany</span>'}<button class="scan-button ${piece.seal?'scanned':''}" data-piece-scan="${index}" ${load&&!piece.label?'disabled':''}>${icon(piece.seal?'check':'qr')}${piece.seal?'Zmień':'Skanuj QR'}</button></div></div><div class="piece-photo-grid ${load?'':'single-photo'}">${photos}</div>${pieceReady(piece)?`<div class="piece-complete-note">${icon('check')} ${load?`Sztuka ${index+1} ma komplet zdjęć`:`Sztuka ${index+1} ma skan plomby i zdjęcie z rozładunku`}</div>`:''}</section>`;
}
function piecesView(){
  const header=isLoad()?stepHeader('photos','Każda sztuka osobno','Dla każdej sztuki zachowaj kolejność: naklej plombę, zeskanuj QR, zrób zdjęcie z bliska i zdjęcie z daleka.'):stepHeader('photos','Plomby i zdjęcia sztuk','Porównaj towar ze zdjęciami z załadunku, zeskanuj istniejącą plombę, a po zdjęciu towaru z pojazdu zrób zdjęcie na rampie albo na ziemi, jeśli rozładunek odbywa się poza rampą.');
  const sequence=isLoad()?'<span>1</span> Naklej plombę <b>→</b><span>2</span> Skan QR <b>→</b><span>3</span> Zdjęcie z bliska <b>→</b><span>4</span> Zdjęcie z daleka':'<span>1</span> Sprawdź zdjęcia z załadunku <b>→</b><span>2</span> Skan plomby <b>→</b><span>3</span> Rozładuj <b>→</b><span>4</span> Zdjęcie z rozładunku';
  return `<div class="app-content">${header}<div class="piece-sequence-note">${sequence}</div>${current().items.map(pieceTaskCard).join('')}<div class="auto-chat-hint">${icon('chat')}<span><strong>Automatycznie w czacie</strong>${isLoad()?'Zdjęcia każdej sztuki':'Zdjęcie z rozładunku każdej sztuki'} od razu ${isLoad()?'pojawią':'pojawi'} się w czacie zlecenia.</span></div></div>`;
}
function cmrSealView(){
  const load=isLoad();
  const header=load?stepHeader('seals','Plomba CMR','Po udokumentowaniu wszystkich sztuk naklej plombę na pustym tyle ostatniej strony CMR i zeskanuj jej kod QR.'):stepHeader('seals','Przygotuj dokumenty','Dotarłeś na rozładunek. Na tyle dokumentu CMR znajduje się plomba z numerem zapisanym przy załadunku. Przygotuj CMR i zeskanuj tę plombę.');
  const card=load?`<div class="section-kicker">PUSTY TYŁ OSTATNIEJ STRONY CMR</div><h3>Naklej osobną plombę na pustym tyle strony</h3><p>Ostatnia strona CMR zawiera treść z przodu. Plombę naklej na jej pustym tyle, a następnie zapisz kod QR.</p><label class="check-row"><input id="cmr-label" type="checkbox" ${current().cmrLabel?'checked':''}><span>Plomba jest naklejona na pustym tyle ostatniej strony CMR</span></label>`:`<div class="section-kicker">PLOMBA NA TYLE CMR</div><h3>Zeskanuj plombę CMR</h3><p>Porównaj numer na tyle dokumentu z numerem zapisanym podczas załadunku. Nie naklejaj nowej plomby.</p><div class="expected-seal"><span>Numer plomby CMR z załadunku</span><strong>${esc(current().expectedCmrSeal||'Nie zapisano')}</strong></div>`;
  const evidence=load?`<div class="evidence-status">${icon('check')} Każda sztuka ładunku ma komplet zdjęć · ${count()}/${count()}</div>`:'';
  const scanLabel=current().cmrSeal?'Skanuj ponownie':load?'Skanuj QR':'Zeskanuj plombę';
  const afterScan=!load&&current().cmrSeal?`<section class="prior-cmr-section"><div class="section-heading"><h3>CMR z załadunku</h3><span>Pokazany automatycznie</span></div><p class="prior-cmr-intro">Plomba jest zgodna. Poniżej znajduje się skan CMR wykonany podczas pierwszej operacji — załadunku.</p>${current().loadingDocuments.map((record,index)=>loadingDocumentRecordView(record,index)).join('')}</section>`:'';
  return `<div class="app-content">${header}${evidence}<section class="panel cmr-seal-card"><div class="cmr-seal-illustration"><span>${icon('doc')}</span><span class="cmr-sticker">QR</span></div>${card}<div class="seal-code-row">${current().cmrSeal?`<strong>${esc(current().cmrSeal)}</strong>`:'<span>Kod plomby CMR nieodczytany</span>'}<button class="scan-button ${current().cmrSeal?'scanned':''}" id="scan-cmr-seal" ${load&&!current().cmrLabel?'disabled':''}>${icon(current().cmrSeal?'check':'qr')}${scanLabel}</button></div></section>${afterScan}${load?`<div class="shared-hint">${icon('info')} Po zapisaniu QR przejdziesz do skanu wypełnionego dokumentu CMR.</div>`:''}</div>`;
}
function demoDocument(page=1,operation=state.operation,orderId=assignment.id){
  return `<div class="demo-document"><div class="document-paper"><h4>CMR</h4><p>MIĘDZYNARODOWY SAMOCHODOWY LIST PRZEWOZOWY</p><p>Magazyn demonstracyjny Alfa → Centrum demonstracyjne Beta</p><p>Zlecenie ${esc(orderId)}</p><div class="paper-grid"></div><div class="paper-signature">${operation==='load'?'Nadawca':'Odbiorca'} · ${page}</div></div><div class="demo-label">DOKUMENT DEMONSTRACYJNY</div></div>`;
}
function loadingDocumentRecordView(record,index){
  return `<div class="document-page prior-document-page"><h4>${record.mime==='application/pdf'?'Plik PDF':`Strona ${index+1}`}</h4>${record.demo?demoDocument(index+1,'load'):record.mime==='application/pdf'?`<a href="${record.url}" target="_blank" rel="noopener" class="pdf-preview">${icon('doc')}<strong>${esc(record.name)}</strong><span>Otwórz CMR z załadunku ${icon('arrow')}</span></a>`:`<img class="document-image" src="${record.url}" alt="Skan CMR wykonany przy załadunku">`}<div class="document-source">CMR z załadunku · tylko do wglądu</div></div>`;
}
function documentRecordView(record,index,removable=true){
  return `<div class="document-page"><h4>${record.mime==='application/pdf'?'Plik PDF':`Strona ${index+1}`} ${removable?`<button data-remove-document="${index}" aria-label="Usuń ten skan">${icon('close')}</button>`:''}</h4>${record.demo?demoDocument(index+1):record.mime==='application/pdf'?`<a href="${record.url}" target="_blank" rel="noopener" class="pdf-preview">${icon('doc')}<strong>${esc(record.name)}</strong><span>Otwórz podgląd PDF ${icon('arrow')}</span></a>`:`<img class="document-image" src="${record.url}" alt="Podgląd skanu dokumentu CMR">`}<div class="document-source">${sourceLabel(record)}</div></div>`;
}
function documentConfirmation(){
  return `<label class="check-row document-confirmation ${current().documents.length?'':'disabled'}"><input id="documents-confirm" type="checkbox" ${current().documentsComplete?'checked':''} ${current().documents.length?'':'disabled'}><span>Potwierdzam, że skan CMR jest czytelny i zawiera wszystkie strony.</span></label>`;
}
function documentsView(){
  const records=current().documents;
  const title=isLoad()?'Skan dokumentu CMR':'Skan CMR po rozładunku';
  const description=isLoad()?'Plomba dokumentu jest już zapisana. Teraz dołącz pełny, czytelny skan wypełnionego CMR.':'Plomba CMR i sztuki ładunku są już sprawdzone. Po rozładunku dołącz nowy, pełny i czytelny skan dokumentu CMR.';
  return `<div class="app-content">${stepHeader('documents',title,description)}<div class="evidence-status">${icon('check')} ${isLoad()?'Plomba na pustym tyle ostatniej strony CMR':'Plomba CMR zgodna z załadunkiem'} · ${esc(current().cmrSeal)}</div>${records.length?`<div class="evidence-status ${documentReady()?'ready':'pending'}">${icon(documentReady()?'check':'info')}${records.some(record=>record.source==='chat')?'CMR dodany z czatu — jest również tutaj.':'CMR dodany do zlecenia i automatycznie do czatu.'}</div>`:''}<section class="panel document-panel">${records.length?records.map((record,index)=>documentRecordView(record,index)).join(''):`<button class="document-placeholder" id="add-document">${icon('camera')}<strong>${isLoad()?'Zeskanuj dokument CMR':'Zeskanuj CMR po rozładunku'}</strong><small>Wszystkie strony, czytelny tekst i podpisy</small></button>`}${records.length?`<button class="secondary-button" id="add-document">${icon('plus')} Dodaj stronę lub plik</button>`:''}<p class="document-hints">Sprawdź cały dokument: krawędzie stron, numery, ostrość tekstu i podpisy.</p></section><div class="document-assertion">${documentConfirmation()}</div><div class="auto-chat-hint">${icon('chat')}<span><strong>Automatycznie w czacie</strong>Każda strona CMR lub plik PDF od razu pojawi się w czacie zlecenia.</span></div></div>`;
}
function reviewView(){
  const photoTotal=count()*(isLoad()?2:1),cargoDetail=isLoad()?'Każda ma plombę, QR oraz zdjęcie z bliska i z daleka':'Każda ma zgodny skan plomby oraz zdjęcie z rozładunku',photoDetail=isLoad()?'Dwa osobne ujęcia każdej pozycji':'Jedno zdjęcie z rozładunku każdej pozycji',cmrDetail=isLoad()?'Plomba na pustym tyle ostatniej strony':'Numer zgodny z plombą zapisaną przy załadunku';
  const sequence=isLoad()?'sztuki ładunku → plomba CMR → skan CMR':'plomba CMR → sztuki ładunku → skan CMR po rozładunku';
  return `<div class="app-content"><button class="subpage-back" id="review-back">${icon('back')} Wróć do skanu CMR</button><div class="overline">SPRAWDŹ PRZED ZAKOŃCZENIEM</div><h2 class="stage-title">Dokumentacja gotowa</h2><p class="stage-description">Wymagana kolejność została wykonana dla zlecenia ${assignment.id}.</p><section class="panel review-checklist"><div>${icon('check')}<span>Sztuki ładunku<small>${cargoDetail}</small></span><b>${count()}/${count()}</b></div><div>${icon('check')}<span>Zdjęcia sztuk ładunku<small>${photoDetail}</small></span><b>${photoTotal}/${photoTotal}</b></div><div>${icon('check')}<span>Plomba CMR<small>${cmrDetail} · ${esc(current().cmrSeal)}</small></span><b>1/1</b></div><div>${icon('check')}<span>Pełny skan dokumentu CMR<small>${current().documents.length} ${current().documents.length===1?'plik':'pliki'} · kompletność potwierdzona</small></span><b>OK</b></div></section><p class="small-note">Zakończenie jest dostępne dopiero po wykonaniu całej sekwencji: ${sequence}.</p></div>`;
}
function chatMessagesView(messages){
  return messages.map(message=>`<div class="chat-message-own"><p>${esc(message.text)}</p><small>Kierowca · ${esc(message.time)}</small></div>`).join('');
}
function chatComposerView(){
  return `<div class="chat-composer"><input id="chat-message" maxlength="500" autocomplete="off" placeholder="Napisz wiadomość do spedytora" aria-label="Wiadomość do spedytora"><button id="chat-send" aria-label="Wyślij wiadomość">${icon('arrow')}</button></div><p class="chat-demo-note">Prototyp: wiadomość pozostaje tylko w tym podglądzie.</p>`;
}
function chatView(){
  const record=current(),photos=photoRecords(record),autoCount=[...photos,...record.documents].filter(item=>item.chatSynced).length,photoTarget=count()*(isLoad()?2:1),sides=isLoad()?['near','far']:['unload'];
  const instruction=allReady()?'Dokumentacja wszystkich sztuk, plomba CMR i skan CMR są kompletne.':isLoad()?'Najpierw udokumentuj każdą sztukę, następnie plombę CMR, a na końcu dołącz skan CMR.':'Najpierw zeskanuj plombę CMR, następnie udokumentuj każdą sztukę, a na końcu dołącz skan CMR po rozładunku.';
  return `<div class="app-content"><div class="chat-header"><button id="chat-back" aria-label="Wróć do operacji">${icon('back')}</button><span><strong>Czat zlecenia</strong><small>${assignment.id} · spedytor</small></span><span class="badge orange">Symulacja</span></div><div class="chat-bubble"><span>Spedytor</span><p>${instruction}</p></div>${chatMessagesView(record.messages)}${autoCount?`<div class="chat-system-note">${icon('check')} Aplikacja automatycznie dodała ${autoCount} ${materialWord(autoCount)} do czatu.</div>`:''}<div class="chat-evidence-summary"><div>${icon('camera')} Zdjęcia sztuk <b>${photos.length}/${photoTarget}</b></div><div>${icon('doc')} Dokument CMR <b>${record.documents.length?`${record.documents.length} plik${record.documents.length===1?'':'i'}`:'Do dodania'}</b></div></div>${record.items.flatMap((piece,pieceIndex)=>sides.map(side=>({piece,pieceIndex,side,photo:piece.photos[side]})).filter(item=>item.photo)).map(({piece,pieceIndex,side,photo})=>`<div class="chat-file">${icon('camera')}<div><strong>Sztuka ${pieceIndex+1} · ${side==='near'?'z bliska':side==='far'?'z daleka':'zdjęcie z rozładunku'}</strong><small>${esc(piece.name)} · ${photo.source==='chat'?'dodano w czacie':'automatycznie z operacji'}</small></div>${icon('check')}</div>`).join('')}${record.documents.map((document,index)=>`<div class="chat-file">${icon('doc')}<div><strong>CMR · ${document.mime==='application/pdf'?esc(document.name):`strona ${index+1}`}</strong><small>${document.source==='chat'?'Dodano w czacie':'Automatycznie z ekranu CMR'} · w dokumentacji</small></div>${icon('check')}</div>`).join('')}${record.documents.length?`<section class="panel chat-document-confirmation">${documentConfirmation()}</section>`:''}<div class="shared-hint">${icon('info')} Zdjęcia poszczególnych sztuk i skany CMR trafiają automatycznie tutaj.</div>${!record.started?`<p class="small-note">${isLoad()?'Załączniki dodasz po potwierdzeniu wykonania załadunku.':'Załączniki dodasz po potwierdzeniu liczby sztuk do rozładowania.'}</p>`:''}${chatComposerView()}</div>`;
}
function successView(){
  const photoTotal=count()*(isLoad()?2:1);
  return `<div class="app-content"><section class="panel completion-panel"><span class="success-icon">${icon('check')}</span><h2>${operationName()} zakończony</h2><p>${esc(currentPlace().company)}<br>Dokumentacja jest kompletna w tym podglądzie.</p><div class="summary-line">${icon('check')} Sztuki ładunku <b>${count()}/${count()}</b></div><div class="summary-line">${icon('check')} ${isLoad()?'Zdjęcia każdej sztuki':'Zdjęcia z rozładunku'} <b>${photoTotal}/${photoTotal}</b></div><div class="summary-line">${icon('check')} Plomba CMR <b>${esc(current().cmrSeal)}</b></div><div class="summary-line">${icon('check')} Pełny skan CMR <b>OK</b></div></section><p class="small-note">To demonstracja. Żadne pliki ani wiadomości nie zostały wysłane do rzeczywistego systemu.</p></div>`;
}
function stopMapCard(){
  const stop=stopDefinition();
  return `<section class="travel-map-card route-stop-map" aria-label="Mapa dojazdu: ${esc(stop.title)}"><div class="travel-map-visual"><svg viewBox="0 0 360 210" role="img" aria-label="Schemat trasy do punktu"><path class="map-street major" d="M-20 166 C55 128 93 139 151 101 S278 36 390 52"/><path class="map-street" d="M18 15 C62 62 79 96 91 224"/><path class="map-street" d="M185 -15 C177 37 198 88 243 128 S304 176 374 193"/><path class="map-street thin" d="M-10 79 C66 88 103 60 148 46 S254 35 370 98"/><path class="map-route" d="M38 181 C82 146 112 153 148 119 S217 78 276 65"/><circle class="map-start" cx="38" cy="181" r="7"/><circle class="map-destination" cx="276" cy="65" r="9"/></svg><span class="travel-map-road road-one">A7</span><span class="travel-map-road road-two">E50</span><span class="travel-map-pin">${icon(stop.icon)}</span><span class="travel-map-label">${esc(stop.title)}</span></div><div class="travel-destination"><span class="travel-destination-icon">${icon(stop.icon)}</span><div><small>${esc(stop.title.toUpperCase())} · ${esc(stop.country)}</small><h3>${esc(stop.company)}</h3><p>${esc(stop.address)}</p><div class="route-stop-demo">${esc(stop.note)}</div></div></div><a class="travel-navigate-button" href="${navigationUrl(stop)}" target="_blank" rel="noopener" aria-label="Nawiguj: ${esc(stop.company)}"><span class="travel-navigate-icon">${icon('nav')}</span><span><strong>Nawiguj</strong><small>Otwórz trasę w Google Maps</small></span>${icon('arrow')}</a><div class="route-stop-details">${stop.details.map(([label,value])=>`<div><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`).join('')}</div></section>`;
}
function stopTravelView(){
  const stop=stopDefinition(),hint=state.routeStop==='fueling'?'Po dotarciu zobaczysz kartę przypisaną do tankowania i demonstracyjny kod PIN.':'Po dotarciu zobaczysz numer miejsca, a aplikacja od razu zaproponuje przerwę na podstawie wcześniejszej jazdy i odpoczynków.';
  return `<div class="app-content travel-screen"><div class="route-stop-heading"><span class="route-stop-heading-icon">${icon(stop.icon)}</span><div><small>PUNKT NA TRASIE · ${esc(stop.country)}</small><h2>${esc(stop.title)}</h2></div><span class="badge orange">W drodze</span></div>${stopMapCard()}<div class="travel-next-hint">${icon('info')}<p><strong>Po potwierdzeniu dotarcia</strong>${hint}</p></div></div>`;
}
function parkingInfoView(){
  const stop=stopDefinition();
  const breakSuggestion=window.SuperSpedytorTacho?.parkingSuggestionCard?.()||'';
  return `<div class="app-content"><div class="route-stop-heading"><span class="route-stop-heading-icon">${icon('parking')}</span><div><small>DOTARŁEŚ NA PARKING</small><h2>${esc(stop.company)}</h2></div><span class="badge green">Na miejscu</span></div><section class="panel parking-arrival-card"><div class="parking-place-number">P-01</div><div><small>PRZYDZIELONE MIEJSCE</small><h3>Zaparkuj na miejscu P-01</h3><p>Rezerwacja demonstracyjna jest ważna do 18:00. Parking posiada ochronę 24/7.</p></div></section>${breakSuggestion}<section class="panel route-arrival-summary">${stop.details.map(([label,value])=>`<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('')}</section><p class="small-note">Prototyp: miejsce, rezerwacja, historia tachografu i sugestia przerwy są demonstracyjne.</p></div>`;
}
function fuelingInfoView(){
  const stop=stopDefinition(),card=stop.card;
  return `<div class="app-content"><div class="route-stop-heading"><span class="route-stop-heading-icon">${icon('fuel')}</span><div><small>DOTARŁEŚ NA TANKOWANIE</small><h2>${esc(stop.company)}</h2></div><span class="badge green">Na miejscu</span></div><section class="panel station-arrival-card"><div class="section-kicker">${icon('pin')} STACJA</div><h3>${esc(stop.company)}</h3><p>${esc(stop.address)}</p><div class="route-stop-demo">${esc(stop.note)}</div></section>${fuelBreakSuggestionView()}<section class="fuel-card" aria-label="Karta do tankowania i demonstracyjny PIN"><div class="fuel-card-top"><span>${icon('card')}</span><small>DANE DEMONSTRACYJNE</small></div><strong>${esc(card.name)}</strong><div class="fuel-card-number">${esc(card.number)}</div><div class="fuel-card-meta"><span><small>PIN</small><b>${esc(card.pin)}</b></span><span><small>Pojazd</small><b>${esc(card.vehicle)}</b></span></div></section><div class="fuel-before-note">${icon('info')}<p><strong>Przed tankowaniem</strong>Sprawdź stację, kartę i pojazd. Tankowanie samo nie rozpoczyna przerwy. W trakcie aplikacja poprosi o dwa zdjęcia.</p></div></div>`;
}
const fuelPhotoLabels={receipt:['receipt','Paragon','Cały paragon z widoczną kwotą i stacją'],dispenser:['fuel','Dystrybutor','Widoczne litry i kwota na dystrybutorze'],nozzle:['camera','Pistolet w pojeździe','Pistolet wsadzony do tankowanego pojazdu']};
const fuelingPhotoKeys=['dispenser','nozzle'];
const fuelingPhotosReady=()=>fuelingPhotoKeys.every(key=>Boolean(currentStop().photos[key]));
const receiptReady=()=>Boolean(currentStop().photos.receipt);
const positiveNumber=value=>Number(String(value).replace(',','.'))>0;
const fuelExpenseReady=()=>{
  const expense=currentStop().expense;
  return Boolean(expense.country&&positiveNumber(expense.liters)&&positiveNumber(expense.price)&&(!expense.withAdBlue||(positiveNumber(expense.adBlueLiters)&&positiveNumber(expense.adBluePrice))));
};
const fuelingReady=()=>receiptReady()&&fuelExpenseReady();
const fuelWorkTimeContext=()=>{
  try{return window.SuperSpedytorTacho?.getFuelBreakContext?.()||{fresh:false,drivingSinceFullBreakMinutes:null};}
  catch{return {fresh:false,drivingSinceFullBreakMinutes:null};}
};
const fuelBreakRecommendation=()=>{
  const engine=window.SuperSpedytorBreakSuggestion;
  return engine?.recommendFuelBreak?engine.recommendFuelBreak(fuelWorkTimeContext()):{
    action:'CHECK_TACHOGRAPH',durationMinutes:null,reasonCode:'MODEL_UNAVAILABLE',rulesetVersion:'unavailable',
    title:'Najpierw sprawdź tachograf',description:'Model sugestii przerwy nie jest dostępny.'
  };
};
const workTimeLabel=minutes=>{
  if(!Number.isFinite(Number(minutes)))return 'brak odczytu';
  const value=Math.max(0,Math.floor(Number(minutes)));
  return `${Math.floor(value/60)}:${String(value%60).padStart(2,'0')}`;
};
function fuelBreakSuggestionView(){
  const context=fuelWorkTimeContext(),recommendation=fuelBreakRecommendation();
  const tone=recommendation.action==='SUGGEST_BREAK'?'suggested':recommendation.action==='CHECK_TACHOGRAPH'?'check':recommendation.action==='KEEP_ACTIVE_REPORT'?'active':'continue';
  const badge=recommendation.durationMinutes?`${recommendation.durationMinutes} MIN`:recommendation.action==='KEEP_ACTIVE_REPORT'?'JUŻ TRWA':recommendation.action==='CHECK_TACHOGRAPH'?'SPRAWDŹ':'BEZ DODATKOWEJ PRZERWY';
  return `<section class="fuel-break-suggestion ${tone}" aria-live="polite"><div class="fuel-break-heading"><span>${icon('clock')}</span><div><small>SUGESTIA PRZY TANKOWANIU</small><h3>${esc(recommendation.title)}</h3></div><b>${esc(badge)}</b></div><p>${esc(recommendation.description)}</p><div class="fuel-break-metrics"><span><small>Jazda od pełnej przerwy</small><strong>${esc(workTimeLabel(context.drivingSinceFullBreakMinutes))}</strong></span><span><small>Do wymaganej przerwy</small><strong>${esc(workTimeLabel(context.minutesToRequiredBreak))}</strong></span></div><div class="fuel-break-source">${icon('info')} Odczyt demonstracyjny · tachograf pozostaje źródłem nadrzędnym</div></section>`;
}
const expenseCountries=[
  ['PL','Polska',true],['DE','Niemcy',true],['IT','Włochy',true],['FR','Francja',true],['LU','Luksemburg',true],
  ['AL','Albania'],['AD','Andora'],['AM','Armenia'],['AT','Austria'],['AZ','Azerbejdżan'],['BE','Belgia'],['BY','Białoruś'],['BA','Bośnia i Hercegowina'],['BG','Bułgaria'],['HR','Chorwacja'],['ME','Czarnogóra'],['CY','Cypr'],['CZ','Czechy'],['DK','Dania'],['EE','Estonia'],['FI','Finlandia'],['GE','Gruzja'],['GR','Grecja'],['ES','Hiszpania'],['NL','Holandia'],['IE','Irlandia'],['IS','Islandia'],['KZ','Kazachstan'],['XK','Kosowo'],['LI','Liechtenstein'],['LT','Litwa'],['LV','Łotwa'],['MK','Macedonia Północna'],['MT','Malta'],['MD','Mołdawia'],['MC','Monako'],['NO','Norwegia'],['PT','Portugalia'],['RU','Rosja'],['RO','Rumunia'],['SM','San Marino'],['RS','Serbia'],['SK','Słowacja'],['SI','Słowenia'],['CH','Szwajcaria'],['SE','Szwecja'],['TR','Turcja'],['UA','Ukraina'],['HU','Węgry'],['GB','Wielka Brytania'],['VA','Watykan']
];
const countryOptions=selected=>{
  const options=entries=>entries.map(([code,name])=>`<option value="${code}" ${selected===code?'selected':''}>${name}</option>`).join('');
  return `<optgroup label="Najczęściej wybierane">${options(expenseCountries.filter(([, ,frequent])=>frequent))}</optgroup><optgroup label="Pozostałe kraje Europy">${options(expenseCountries.filter(([, ,frequent])=>!frequent))}</optgroup>`;
};
const expenseCurrency=()=>({PL:'PLN',CZ:'CZK',DK:'DKK',HU:'HUF',RO:'RON',SE:'SEK',NO:'NOK',CH:'CHF',LI:'CHF',GB:'GBP',IS:'ISK',AL:'ALL',BA:'BAM',RS:'RSD',MK:'MKD',MD:'MDL',UA:'UAH',TR:'TRY',GE:'GEL',AM:'AMD',AZ:'AZN',BY:'BYN',RU:'RUB',KZ:'KZT'}[currentStop().expense.country]||'EUR');
function fuelPhotoButton(key){
  const record=currentStop().photos[key],[photoIcon,title,hint]=fuelPhotoLabels[key];
  return `<button class="fuel-photo-button ${record?'done':''}" data-fuel-photo="${key}">${record?`<img src="${record.url}" alt="${esc(title)}">`:`<span>${icon(photoIcon)}</span>`}<div><strong>${esc(title)}</strong><small>${record?'Zdjęcie dodane':esc(hint)}</small></div>${icon(record?'check':'arrow')}</button>`;
}
function fuelingInProgressView(){
  const photoCount=fuelingPhotoKeys.filter(key=>currentStop().photos[key]).length;
  return `<div class="app-content"><div class="stage-header route-stage-header"><button data-stop-back="info" aria-label="Wróć do danych karty">${icon('back')}</button><div><span>TANKOWANIE · W TRAKCIE</span><b>ZDJĘCIA PRZED ZAKOŃCZENIEM</b></div><button class="stage-chat" data-stop-chat aria-label="Otwórz czat">${icon('chat')}</button></div><h2 class="stage-title">Tankowanie w toku</h2><p class="stage-description">Zanim zakończysz tankowanie, zrób zdjęcie dystrybutora oraz pistoletu włożonego do pojazdu.</p><div class="fuel-live-banner">${icon('camera')}<p><strong>Nie kończ jeszcze tankowania</strong>Najpierw dodaj oba zdjęcia wykonywane przy pojeździe.</p></div><div class="fuel-section-heading"><h3>Zdjęcia w trakcie tankowania</h3><span>${photoCount}/2</span></div><div class="fuel-photo-list">${fuelingPhotoKeys.map(fuelPhotoButton).join('')}</div></div>`;
}
function fuelingExpenseView(){
  const expense=currentStop().expense,currency=expenseCurrency();
  return `<div class="app-content"><div class="stage-header route-stage-header"><button data-stop-back="photos" aria-label="Wróć do tankowania">${icon('back')}</button><div><span>TANKOWANIE ZAKOŃCZONE</span><b>PARAGON I WYDATEK</b></div><button class="stage-chat" data-stop-chat aria-label="Otwórz czat">${icon('chat')}</button></div><h2 class="stage-title">Dodaj paragon i wydatek</h2><p class="stage-description">Zdjęcia przy pojeździe są już zapisane. Teraz sfotografuj paragon i uzupełnij dane wydatku.</p><div class="fuel-section-heading"><h3>Paragon</h3><span>${receiptReady()?'1/1':'0/1'}</span></div><div class="fuel-photo-list">${fuelPhotoButton('receipt')}</div><div class="fuel-section-heading expense-heading"><h3>Wydatek za diesel</h3><span id="expense-status">${fuelExpenseReady()?'Gotowy':'Wymagane pola'}</span></div><section class="panel expense-form"><div class="diesel-fixed"><span>${icon('fuel')}</span><div><small>RODZAJ PALIWA</small><strong>Diesel</strong></div></div><label><span>Kraj wydatku *</span><select id="expense-country" class="text-input">${countryOptions(expense.country)}</select></label><div class="expense-two-columns"><label><span>Litry diesla *</span><input id="fuel-liters" class="text-input" inputmode="decimal" value="${esc(expense.liters)}" placeholder="np. 420,50"></label><label><span>Cena za litr (${currency}) *</span><input id="fuel-price" class="text-input" inputmode="decimal" value="${esc(expense.price)}" placeholder="np. 1,72"></label></div><label class="check-row adblue-toggle"><input id="with-adblue" type="checkbox" ${expense.withAdBlue?'checked':''}><span>Tankowałem również AdBlue</span></label>${expense.withAdBlue?`<div class="adblue-fields"><div class="adblue-title">${icon('drop')}<span><strong>AdBlue</strong><small>W systemie zapisze się jako osobny wydatek.</small></span></div><div class="expense-two-columns"><label><span>Litry AdBlue *</span><input id="adblue-liters" class="text-input" inputmode="decimal" value="${esc(expense.adBlueLiters)}" placeholder="np. 32,00"></label><label><span>Cena za litr (${currency}) *</span><input id="adblue-price" class="text-input" inputmode="decimal" value="${esc(expense.adBluePrice)}" placeholder="np. 0,79"></label></div></div>`:''}</section><div class="fuel-system-note">${icon('info')}<p>Po zapisaniu wydatku aplikacja ponownie sprawdzi czas jazdy. Jeśli sugestia nadal obowiązuje, zapyta, czy rozpocząć przerwę.</p></div></div>`;
}
function routeStopSuccessView(){
  const stop=stopDefinition();
  if(state.routeStop==='parking')return `<div class="app-content"><section class="panel completion-panel"><span class="success-icon">${icon('parking')}</span><h2>Postój rozpoczęty</h2><p>${esc(stop.company)}<br>Miejsce P-01 · dane demonstracyjne</p><div class="summary-line">${icon('check')} Potwierdzenie dotarcia <b>OK</b></div><div class="summary-line">${icon('check')} Miejsce parkingowe <b>P-01</b></div></section></div>`;
  const record=currentStop(),expense=record.expense,breakDecision=record.breakDecision;
  const started=breakDecision?.choice==='STARTED';
  const skipped=breakDecision?.choice==='CONTINUE'&&breakDecision?.recommendation?.action==='SUGGEST_BREAK';
  const active=breakDecision?.recommendation?.action==='KEEP_ACTIVE_REPORT';
  const canContinue=breakDecision?.recommendation?.action==='CONTINUE_AFTER_FUELING';
  const heading=started?`Przerwa ${breakDecision.recommendation.durationMinutes} min zgłoszona`:canContinue?'Po tankowaniu możesz jechać dalej':active?'Kontynuuj zgłoszoną przerwę':'Wydatek zapisany';
  const breakOutcome=started
    ?`<div class="fuel-break-outcome started">${icon('clock')}<p><strong>Licznik zgłoszenia rozpoczęty</strong>Plan: ${breakDecision.recommendation.durationMinutes} min. Ustaw właściwą aktywność na tachografie.</p></div>`
    :skipped
      ?`<div class="fuel-break-outcome skipped">${icon('info')}<p><strong>Sugestia nie została uruchomiona</strong>Wybrano dalszą jazdę mimo sugestii ${breakDecision.recommendation.durationMinutes} min. Sprawdź aktualny zapis tachografu.</p></div>`
      :active
        ?`<div class="fuel-break-outcome active">${icon('clock')}<p><strong>Nie utworzono drugiego zgłoszenia</strong>${esc(breakDecision.recommendation.description)}</p></div>`
        :canContinue
          ?`<div class="fuel-break-outcome continue">${icon('check')}<p><strong>Brak dodatkowej sugestii</strong>${esc(breakDecision.recommendation.description)}</p></div>`
          :`<div class="fuel-break-outcome skipped">${icon('info')}<p><strong>Sprawdź tachograf</strong>Brak aktualnych danych nie pozwala ocenić, czy możesz kontynuować jazdę.</p></div>`;
  return `<div class="app-content"><button class="subpage-back" id="fuel-expense-back">${icon('back')} Wróć do wydatku</button><section class="panel completion-panel"><span class="success-icon">${icon(started||active?'clock':'fuel')}</span><h2>${esc(heading)}</h2><p>${esc(stop.company)}<br>Dokumentacja demonstracyjna jest kompletna.</p><div class="summary-line">${icon('check')} Zdjęcia w trakcie tankowania <b>2/2</b></div><div class="summary-line">${icon('check')} Paragon <b>1/1</b></div><div class="summary-line">${icon('check')} Diesel <b>${esc(expense.liters)} l · ${esc(expense.price)} ${expenseCurrency()}/l</b></div>${expense.withAdBlue?`<div class="summary-line">${icon('check')} AdBlue <b>${esc(expense.adBlueLiters)} l · ${esc(expense.adBluePrice)} ${expenseCurrency()}/l</b></div>`:''}<div class="summary-line">${icon('check')} Wydatki w systemie <b>${expense.withAdBlue?'2':'1'}</b></div></section>${breakOutcome}<p class="small-note">To demonstracja. Wydatek, zdjęcia i zgłoszenie przerwy nie zostały zapisane w rzeczywistym systemie.</p></div>`;
}
function collectionHeader(screen,title,description){
  const steps=['info','photos','documents','review'],index=steps.indexOf(screen),record=collection();
  const group=collectionGroup(),done=[record.started,collectionDocumentsReady(group),collectionEnvelopeReady(group),record.finished];
  return `<div class="stage-header">${screen!=='info'?`<button data-collection-back="${steps[Math.max(0,index-1)]}" aria-label="Wróć do poprzedniego kroku">${icon('back')}</button>`:'<span class="collection-header-icon">'+icon('envelope')+'</span>'}<div><span>Dokumenty CMR · ${record.role==='transferor'?'twoje dokumenty':'odbiór na trasie'}</span><b>${record.role==='transferor'?'OTWARTA KOPERTA':screen==='info'?'WYBIERZ KIEROWCĘ':`KROK ${index+1} Z 4`}</b></div></div>${record.role==='receiver'?`<div class="stage-progress" aria-label="Postęp odbioru dokumentów">${steps.map((step,stepIndex)=>`<span class="${stepIndex===index?'current':done[stepIndex]?'done':''}"></span>`).join('')}</div>`:''}<h2 class="stage-title collection-stage-title">${title}</h2><p class="stage-description collection-stage-description">${description}</p>`;
}
function transferorCollectionView(){
  const record=collection(),group=collectionGroup(record.transferorSourceId),source=collectionSource(group.sourceId),orders=collectionGroupOrders(group);
  return `${collectionHeader('info','Przygotuj swoje dokumenty','Aplikacja pokazuje wyłącznie dokumenty przypisane do Twojego konta. Włóż je do jednej koperty, ale jej jeszcze nie zamykaj.')}<section class="panel collection-handover-card ${group.prepared?'prepared':''}"><div class="collection-handover-person"><span>${icon(group.prepared?'check':'envelope')}</span><div><small>ZALOGOWANY KIEROWCA · TWOJA KOPERTA</small><h3>${esc(source.name)}</h3><p>${esc(source.vehicle)}</p></div></div><div class="section-kicker">DOKUMENTY DO PRZEKAZANIA · ${orders.length}</div><div class="collection-envelope-list">${orders.map((order,index)=>`<div><span>${index+1}</span><p><strong>${esc(order.orderId)}</strong><small>Rozładunek potwierdzony · QR na dokumencie</small></p>${icon('check')}</div>`).join('')}</div><div class="collection-open-warning">${icon('info')}<p><strong>Przygotuj tylko otwartą kopertę</strong>Włóż wszystkie wymienione CMR-y. Nie naklejaj plomby i nie zamykaj koperty — osoba odbierająca zrobi to po kontroli dokumentów.</p></div>${group.prepared?`<div class="collection-prepared-state">${icon('check')}<p><strong>Dokumenty przygotowane</strong>Otwarta koperta jest gotowa do przekazania. Na tym etapie nie ma jeszcze przypisanej plomby.</p></div>`:''}</section>`;
}
function receiverCollectionInfoView(){
  const record=collection(),active=collectionGroup(),activeSource=active?collectionSource(active.sourceId):null,hasOpenEnvelope=Boolean(active&&!collectionEnvelopeReady(active)&&record.started);
  if(hasOpenEnvelope)return `${collectionHeader('info',`Dokończ odbiór od kierowcy`,`${activeSource.name} ma rozpoczętą kopertę. Wróć do niej i zakończ wszystkie CMR-y przed wyborem kolejnej osoby.`)}<section class="panel collection-active-driver"><div class="collection-active-driver-icon">${icon('envelope')}</div><div><small>AKTYWNA KOPERTA</small><h3>${esc(activeSource.name)}</h3><p>${esc(activeSource.vehicle)}</p><div class="collection-order-chips">${collectionGroupOrders(active).map(order=>`<span>${esc(order.orderId)}</span>`).join('')}</div></div></section><div class="collection-open-warning collection-large-instruction">${icon('info')}<p><strong>Teraz zajmujesz się tylko tym kierowcą</strong>Nie rozpoczynaj odbioru od innej osoby, dopóki ta koperta nie zostanie sprawdzona i zaplombowana.</p></div>`;
  return `${collectionHeader('info','Od którego kierowcy odbierasz dokumenty?','Wybierz osobę, z którą właśnie się spotkałeś. Po wyborze zobaczysz wyłącznie jej CMR-y i jej oddzielną kopertę.')}<div class="collection-queue-title"><span>KIEROWCY I CMR-Y DO ODBIORU</span><b>${record.groups.filter(collectionEnvelopeReady).length}/${record.groups.length} koperty gotowe</b></div><div class="collection-driver-queue collection-driver-choice-list">${record.groups.map(group=>{const item=collectionSource(group.sourceId),orders=collectionGroupOrders(group),sealed=collectionEnvelopeReady(group);const content=`<span class="collection-driver-state">${sealed?icon('check'):icon('envelope')}</span><span class="collection-driver-choice-content"><strong>${esc(item.name)}</strong><small>${esc(item.vehicle)}</small><span class="collection-driver-orders">${orders.map(order=>`<b>${esc(order.orderId)}</b>`).join('')}</span>${sealed?`<em>Koperta zamknięta · plomba ${esc(group.envelope.sealCode)}</em>`:`<span class="collection-driver-choice-action">Odbieram dokumenty od tego kierowcy ${icon('arrow')}</span>`}</span>`;return sealed?`<div class="collection-driver-choice complete">${content}</div>`:`<button data-collection-source="${esc(group.sourceId)}" class="collection-driver-choice" aria-label="Odbieram dokumenty od: ${esc(item.name)}">${content}</button>`;}).join('')}</div><div class="collection-large-instruction collection-selection-help">${icon('info')}<p><strong>Jedna osoba = jedna koperta</strong>Najpierw wybierz kierowcę. Potem skanuj i sprawdzaj wyłącznie jego dokumenty.</p></div>`;
}
function collectionInfoView(){
  return `<div class="app-content">${collection().role==='transferor'?transferorCollectionView():receiverCollectionInfoView()}</div>`;
}
function collectionDocumentPreview(record,index){
  const source=collectionSource(record.sourceId);
  const preview=record.demo?demoDocument(1,'unload',record.orderId):record.mime==='application/pdf'?`<a href="${record.url}" target="_blank" rel="noopener" class="pdf-preview">${icon('doc')}<strong>${esc(record.name)}</strong><span>Otwórz skan CMR z systemu ${icon('arrow')}</span></a>`:`<img class="collection-document-image" src="${record.url}" alt="Skan CMR z systemu dla zlecenia ${esc(record.orderId)}">`;
  return `<section class="panel collection-document-card confirmed"><div class="collection-document-heading"><span class="number-circle">${index+1}</span><div>${index===0?'<span class="collection-newest-badge">NAJNOWSZY PRZEJĘTY</span>':''}<small>${esc(source.name)} · przejęto ${esc(record.acceptedAt||record.scannedAt||'przed chwilą')}</small><h3>${esc(record.orderId)}</h3></div><span class="collection-accepted-icon" aria-label="Dokument przejęty">${icon('check')}</span></div><div class="collection-match-status">${icon('check')} DOKUMENT PRZEJĘTY · oryginał zgodny ze skanem CMR</div><div class="collection-preview">${preview}</div></section>`;
}
function collectionPendingDocumentView(record){
  const source=collectionSource(record.sourceId);
  const preview=record.demo?demoDocument(1,'unload',record.orderId):record.mime==='application/pdf'?`<a href="${record.url}" target="_blank" rel="noopener" class="pdf-preview">${icon('doc')}<strong>${esc(record.name)}</strong><span>Otwórz skan CMR z systemu ${icon('arrow')}</span></a>`:`<img class="collection-document-image" src="${record.url}" alt="Skan CMR z systemu dla zlecenia ${esc(record.orderId)}">`;
  return `<section class="panel collection-pending-card"><div class="collection-pending-status">${icon('info')}<span><small>QR ROZPOZNANY · DOKUMENT JESZCZE NIEPRZEJĘTY</small><strong>Sprawdź, czy to ten CMR</strong></span></div><div class="collection-pending-order"><span>${icon('doc')}</span><div><small>KIEROWCA I ZLECENIE</small><strong>${esc(record.orderId)}</strong><p>${esc(source.name)} · ${esc(source.vehicle)}</p></div></div><div class="collection-preview collection-pending-preview">${preview}</div><div class="collection-verification-instruction">${icon('qr')}<p><strong>Porównaj papierowy oryginał z podglądem</strong>Sprawdź numer zlecenia, dane przewozu i dokument. Dopiero zatwierdzenie oznacza przejęcie CMR.</p></div><div class="collection-verification-actions"><button class="primary-button" id="collection-accept-document">${icon('check')}Tak, to ten dokument — przejmuję CMR</button><button class="secondary-button" id="collection-reject-document">${icon('close')}To nie jest ten dokument</button></div><p class="collection-verification-lock">Nie można zeskanować kolejnego CMR, dopóki nie zatwierdzisz albo nie odrzucisz tego dokumentu.</p></section>`;
}
function collectionScanView(){
  const group=collectionGroup(),source=collectionSource(group.sourceId),orders=collectionGroupOrders(group),available=availableCollectionOrders(group),verifying=group.pendingDocument;
  const headerTitle=verifying?'Sprawdź zeskanowany CMR':`Odbierasz dokumenty od: ${source.name}`;
  const headerDescription=verifying?'QR został rozpoznany, ale dokument nie został jeszcze przejęty. Porównaj papierowy oryginał z podglądem i wybierz jedną decyzję.':'Skup się teraz wyłącznie na tej osobie. Po zatwierdzeniu każdy przejęty CMR trafi na samą górę listy.';
  const acceptedList=group.documents.length?`<div class="collection-accepted-heading"><span>JUŻ PRZEJĘTE DOKUMENTY</span><b>${group.documents.length}/${orders.length}</b></div>${group.documents.map(collectionDocumentPreview).join('')}`:'';
  return `<div class="app-content">${collectionHeader('photos',headerTitle,headerDescription)}<div class="collection-driver-ribbon"><span>${icon('envelope')}</span><p><small>AKTYWNA KOPERTA</small><strong>${esc(source.name)}</strong>${esc(source.vehicle)}</p><b>${group.documents.length}/${orders.length}</b></div>${verifying?collectionPendingDocumentView(verifying):group.envelope.sealCode?'':available.length?`<button class="collection-add-document collection-scan-primary" id="collection-add-document">${icon('qr')}<span><strong>${group.documents.length?'Skanuj następny CMR':'Skanuj pierwszy CMR'}</strong><small>Po odczycie zobaczysz właściwy skan. Dokument trafi do koperty dopiero po zatwierdzeniu.</small></span>${icon('arrow')}</button>`:''}<div class="collection-counter"><span>${icon('check')}<strong>Przejęte: ${group.documents.length} z ${orders.length}</strong></span><b>${verifying?'1 oczekuje na decyzję':'Brak dokumentu do decyzji'}</b></div>${acceptedList}${!available.length&&!verifying&&!group.envelope.sealCode?`<div class="collection-prepared-state collection-large-instruction">${icon('check')}<p><strong>Wszystkie CMR-y zostały przejęte</strong>Każdy oryginał zatwierdzono po porównaniu z podglądem. Możesz przejść do zamknięcia tej koperty.</p></div>`:''}<div class="collection-chain-note collection-large-instruction">${icon('info')}<p><strong>Aktualna koperta: ${esc(source.name)}</strong>Wkładaj tutaj tylko zatwierdzone dokumenty tej osoby. CMR innego kierowcy nie zostanie dodany do tej koperty.</p></div></div>`;
}
function collectionEnvelopeView(){
  const group=collectionGroup(),source=collectionSource(group.sourceId),sealed=Boolean(group.envelope.sealCode);
  return `<div class="app-content">${collectionHeader('documents',`Zamknij kopertę · ${source.name}`,'Wybierz nieużytą plombę, naklej ją na zamknięcie koperty i zeskanuj jej QR. Dopiero ten odczyt przypisze numer plomby do koperty.')}<section class="panel collection-envelope-card"><div class="collection-envelope-visual"><span>${icon('envelope')}</span>${sealed?`<b>${icon('check')}</b>`:'<i>QR</i>'}</div><div class="collection-envelope-owner"><small>KOPERTA KIEROWCY</small><strong>${esc(source.name)}</strong><span>${esc(source.vehicle)}</span></div>${sealed?`<div class="collection-assigned-seal compact"><span>PLOMBA PRZYPISANA PRZY ZAMKNIĘCIU</span><strong>${esc(group.envelope.sealCode)}</strong></div>`:`<div class="collection-open-warning">${icon('info')}<p><strong>Plomba nie jest jeszcze przypisana</strong>Najpierw sprawdź zawartość. Potem weź dowolną nieużytą plombę, naklej ją na kopertę i zeskanuj QR — wtedy numer zostanie zapisany przy tej kopercie.</p></div>`}<div class="section-kicker">ZAWARTOŚĆ · ${group.documents.length} CMR</div><div class="collection-envelope-list">${group.documents.map((document,index)=>`<div><span>${index+1}</span><p><strong>${esc(document.orderId)}</strong><small>${esc(source.name)} · QR dokumentu sprawdzony</small></p>${icon('check')}</div>`).join('')}</div><label class="check-row collection-envelope-confirm"><input id="collection-envelope-confirm" type="checkbox" ${group.envelope.contentsConfirmed?'checked':''} ${sealed?'disabled':''}><span>Sprawdziłem zawartość i włożyłem do tej koperty wszystkie wymienione oryginały CMR tego kierowcy.</span></label><div class="seal-code-row">${sealed?`<strong>${esc(group.envelope.sealCode)}</strong>`:'<span>Brak przypisanej plomby</span>'}<button class="scan-button ${sealed?'scanned':''}" id="scan-collection-envelope" ${group.envelope.contentsConfirmed&&!sealed?'':'disabled'}>${icon(sealed?'check':'qr')}${sealed?'Zamknięta':'Naklej i skanuj plombę'}</button></div></section>${sealed?`<div class="collection-locked-note">${icon('check')}<p><strong>Ta koperta jest zamknięta</strong>Plomba ${esc(group.envelope.sealCode)} została przypisana w chwili skanowania. Dokumenty kierowcy ${esc(source.name)} są zablokowane.</p></div>`:`<p class="small-note">Numer plomby nie jest wybierany wcześniej. System sprawdzi jedynie, czy zeskanowany QR nie został już użyty.</p>`}</div>`;
}
function collectionReviewView(){
  const record=collection(),group=collectionGroup(),source=collectionSource(group.sourceId),totalDocuments=record.groups.reduce((sum,item)=>sum+item.documents.length,0);
  if(record.finished)return `<div class="app-content"><section class="panel completion-panel"><span class="success-icon">${icon('envelope')}</span><h2>Odbiór zabezpieczony</h2><p>${totalDocuments} ${totalDocuments===1?'oryginał CMR został rozdzielony':'oryginały CMR zostały rozdzielone'} do osobnych, zaplombowanych kopert kierowców.</p><div class="summary-line">${icon('check')} Kierowcy przekazujący <b>${record.groups.length}</b></div><div class="summary-line">${icon('check')} Osobne koperty <b>${record.groups.length}</b></div>${record.groups.map(item=>{const owner=collectionSource(item.sourceId);return `<div class="summary-line">${icon('check')} ${esc(owner.name)} <b>${esc(item.envelope.sealCode)}</b></div>`;}).join('')}<div class="summary-line">${icon('clock')} Synchronizacja z TMS <b>OCZEKUJE</b></div></section><p class="small-note">To demonstracja offline. Zapis nie został potwierdzony przez produkcyjny Super Spedytor.</p></div>`;
  return `<div class="app-content">${collectionHeader('review',`Koperta zamknięta · ${source.name}`,'Sprawdź dokumenty i plombę tej osoby. Każdy kolejny kierowca przechodzi identyczny proces we własnej kopercie.')}<section class="panel review-checklist"><div>${icon('check')}<span>Kierowca przekazujący<small>${esc(source.vehicle)}</small></span><b>${esc(source.name)}</b></div><div>${icon('check')}<span>Oryginały porównane ze skanami<small>${group.documents.map(document=>esc(document.orderId)).join(' · ')}</small></span><b>${group.documents.length}</b></div><div>${icon('check')}<span>Osobna koperta<small>Nie zawiera dokumentów innych kierowców.</small></span><b>1</b></div><div>${icon('check')}<span>Plomba koperty<small>Przypisana w chwili naklejenia i zeskanowania QR.</small></span><b>${esc(group.envelope.sealCode)}</b></div></section><div class="collection-chain-note">${icon('info')}<p><strong>${allCollectionGroupsReady()?'Wszystkie koperty są gotowe':'Następny kierowca otrzyma nową kopertę'}</strong>${allCollectionGroupsReady()?'Możesz zakończyć cały odbiór i zapisać go do kolejki synchronizacji.':'Nie otwieraj ani nie uzupełniaj ponownie tej zaplombowanej koperty.'}</p></div></div>`;
}
function stopChatView(){
  const stop=stopDefinition(),record=currentStop();
  const instruction=state.routeStop==='collection'?'Dla każdego kierowcy użyj osobnej koperty. Skanuj QR z papierowych CMR-ów, porównuj je z właściwymi skanami z systemu, a plombę przypisz dopiero przy zamknięciu koperty.':state.routeStop==='fueling'?'Po dotarciu sprawdź kartę i PIN. W trakcie tankowania dodaj zdjęcie dystrybutora i pistoletu, a po zakończeniu — paragon oraz wydatek.':'Po dotarciu zaparkuj na przydzielonym miejscu P-01.';
  return `<div class="app-content"><div class="chat-header"><button id="stop-chat-back" aria-label="Wróć do zadania">${icon('back')}</button><span><strong>Czat trasy</strong><small>${esc(stop.title)} · spedytor testowy</small></span><span class="badge orange">Symulacja</span></div><div class="chat-bubble"><span>Spedytor testowy</span><p>${instruction}</p></div>${chatMessagesView(record.messages)}${chatComposerView()}</div>`;
}
function stopActionView(){
  const screen=state.screen,stop=currentStop(),definition=stopDefinition();
  let text='',action='',disabled=false,caption='';
  if(state.routeStop==='collection'){
    const group=collection().role==='transferor'?collectionGroup(collection().transferorSourceId):collectionGroup(),orders=collectionGroupOrders(group);
    if(screen==='info'&&collection().role==='transferor'){text=group.prepared?'Dokumenty przygotowane':'Potwierdź przygotowanie otwartej koperty';action=group.prepared?'collection-prepared':'collection-prepare';disabled=group.prepared;caption=group.prepared?'Czekaj na osobę odbierającą. Nie zaklejaj koperty i nie naklejaj plomby.':'Włóż wymienione dokumenty do koperty, ale jej nie zamykaj i nie używaj plomby.';}
    if(screen==='info'&&collection().role==='receiver'){
      if(group&&collection().started&&!collectionEnvelopeReady(group)){text=`Kontynuuj kopertę · ${collectionSource(group.sourceId).name}`;action='collection-resume';caption='Nie rozpoczynaj dokumentów innej osoby, dopóki ta koperta nie zostanie zaplombowana.';}
      else return nextPendingCollectionGroup()?'<p class="action-caption collection-selection-caption">Wybierz powyżej przycisk „Odbieram dokumenty od tego kierowcy”.</p>':'<p class="action-caption collection-selection-caption">Wszystkie osobne koperty są już zamknięte.</p>';
    }
    if(screen==='photos'){text='Dalej: zamknij tę kopertę';action='collection-envelope';disabled=!collectionDocumentsReady(group);caption=group.pendingDocument?'Najpierw zatwierdź albo odrzuć wyświetlony dokument. Nie możesz teraz skanować kolejnego CMR.':group.documents.length?collectionDocumentsReady(group)?'Wszystkie oryginały tego kierowcy zostały przejęte po porównaniu ze skanami CMR z systemu.':`Przejęte CMR-y ${group.documents.length}/${orders.length} · zeskanuj i zatwierdź każdy pozostały dokument.`:`Zeskanuj QR na ${orders.length} ${orders.length===1?'dokumencie':'dokumentach'} tego kierowcy.`;}
    if(screen==='documents'){text='Dalej: sprawdź tę kopertę';action='collection-review';disabled=!collectionEnvelopeReady(group);caption=collectionEnvelopeReady(group)?'Koperta tego kierowcy jest zamknięta, a zeskanowana plomba została do niej przypisana.':'Potwierdź zawartość, naklej nieużytą plombę i zeskanuj jej QR.';}
    if(screen==='review'&&!allCollectionGroupsReady()){text='Wybierz następnego kierowcę';action='collection-next-driver';caption='Wrócisz do listy osób i rozpoczniesz dla wybranego kierowcy nową, oddzielną kopertę.';}
    if(screen==='review'&&allCollectionGroupsReady()){text=collection().finished?'Wróć do trasy':'Zakończ cały odbiór CMR';action=collection().finished?'collection-next':'collection-finish';disabled=!allCollectionGroupsReady();caption=collection().finished?'Zapis pozostaje lokalny do czasu potwierdzenia przez TMS.':`Gotowe ${collection().groups.length}/${collection().groups.length} osobne koperty.`;}
    if(screen==='chat')return '<p class="action-caption chat-action-caption">Wiadomości w tym prototypie są symulowane.</p>';
    return `<div class="flow-actions"><button class="primary-button" id="main-action" data-action="${action}" ${disabled?'disabled':''}>${icon(action==='collection-finish'?'check':action==='collection-next'?'route':'arrow')}${text}</button></div>${caption?`<p class="action-caption">${caption}</p>`:''}`;
  }
  if(screen==='travel'){
    const countdown=arrivalCountdown?.operation===state.routeStop?arrivalCountdown:null;
    text=countdown?`Cofnij potwierdzenie · ${countdown.remaining} s`:`Dotarłem na ${definition.genitive}`;
    action=countdown?'cancel-arrival':'start-arrival';
    caption=countdown?'Dotarcie zostanie potwierdzone automatycznie. Naciśnij przycisk, aby wycofać.':'Po naciśnięciu masz 5 sekund na wycofanie potwierdzenia.';
  }
  if(screen==='info'){text=state.routeStop==='fueling'?'Rozpocznij tankowanie':'Rozpocznij postój';action=state.routeStop==='fueling'?'fuel-start':'stop-finish';caption=state.routeStop==='fueling'?'W trakcie tankowania dodasz zdjęcie dystrybutora i pistoletu.':'Potwierdź rozpoczęcie postoju na przydzielonym miejscu.';}
  if(screen==='photos'){const count=fuelingPhotoKeys.filter(key=>stop.photos[key]).length;text='Zakończ tankowanie';action='fuel-end';disabled=!fuelingPhotosReady();caption=fuelingPhotosReady()?'Oba zdjęcia z tankowania są zapisane.':`Zdjęcia w trakcie tankowania ${count}/2 · dodaj oba przed zakończeniem.`;}
  if(screen==='documents'){text='Zapisz wydatek';action='fuel-finish';disabled=!fuelingReady();caption=fuelingReady()?'Paragon i dane wydatku są kompletne.':`${receiptReady()?'Paragon dodany':'Dodaj paragon'} · uzupełnij wszystkie wymagane pola.`;}
  if(screen==='review'){text=state.routeStop==='fueling'?'Wróć do trasy':'Kolejny punkt na trasie';action='stop-next';}
  if(screen==='chat')return '<p class="action-caption chat-action-caption">Wiadomości w tym prototypie są symulowane.</p>';
  const actionIcon=action==='cancel-arrival'?'close':action==='fuel-end'||action==='fuel-finish'||action==='stop-finish'?'check':'arrow';
  return `<div class="flow-actions"><button class="primary-button ${action==='cancel-arrival'?'countdown-active':''}" id="main-action" data-action="${action}" ${disabled?'disabled':''}>${icon(actionIcon)}${text}</button></div>${caption?`<p class="action-caption ${action==='cancel-arrival'?'countdown-caption':''}">${caption}</p>`:''}`;
}
function stopDesignNotes(){
  if(state.routeStop==='collection'){
    const activeScreen=state.screen==='chat'?(collection().returnScreen||'info'):state.screen;
    const steps=[['info','Wybór kierowcy z listy'],['photos','Najnowszy skan CMR na górze'],['documents','Naklejenie i przypisanie plomby'],['review','Potwierdzenie zamkniętej koperty']];
    const activeIndex=Math.max(0,steps.findIndex(([screen])=>screen===activeScreen));
    return `<h2>Wybierz osobę.<br>Skup się na jednej kopercie.</h2><p class="note-description">Kierowca wybiera z przydzielonej listy osobę, od której właśnie odbiera dokumenty. Potem cały ekran pokazuje wyłącznie jej CMR-y, a najnowszy skan trafia na górę.</p><div class="design-progress"><div class="design-progress-title">ODBIÓR CMR<span>${Math.min(activeIndex+1,steps.length)}/${steps.length}</span></div>${steps.map(([screen,label],index)=>`<div class="design-step ${index<activeIndex?'done':index===activeIndex?'current':''}"><span class="design-step-num">${index<activeIndex?icon('check'):String(index+1).padStart(2,'0')}</span><span>${label}</span></div>`).join('')}</div><div class="design-shared"><strong>Jedna otwarta koperta naraz</strong><p>Kolejną osobę można wybrać dopiero po zeskanowaniu plomby bieżącej koperty. Przed zamknięciem nie ma przypisanego numeru plomby.</p></div>`;
  }
  if(state.routeStop==='parking')return `<h2>Parking.<br>Bez zgadywania.</h2><p class="note-description">Kierowca widzi parking, dokładny adres, przydzielone miejsce i najważniejsze informacje przed dotarciem.</p><div class="design-progress"><div class="design-progress-title">PUNKT NA TRASIE<span>${currentStop().arrived?'2':'1'}/2</span></div><div class="design-step ${state.screen==='travel'?'current':'done'}"><span class="design-step-num">01</span><span>Mapa i nawigacja na parking</span></div><div class="design-step ${state.screen==='info'?'current':currentStop().finished?'done':''}"><span class="design-step-num">02</span><span>Miejsce parkingowe i potwierdzenie postoju</span></div></div>`;
  const activeScreen=state.screen==='chat'?(currentStop().returnScreen||'travel'):state.screen;
  const steps=[['travel','Stacja i nawigacja'],['info','Sugestia przerwy + karta i PIN'],['photos','Dwa zdjęcia w trakcie tankowania'],['documents','Paragon i wydatek'],['review','Decyzja: przerwa albo dalsza jazda']];
  const activeIndex=Math.max(0,steps.findIndex(([screen])=>screen===activeScreen));
  return `<h2>Tankowanie i przerwa.<br>Jedna świadoma decyzja.</h2><p class="note-description">Sugestia pojawia się po dotarciu, a po zapisaniu wydatku jest liczona ponownie. Przerwa zaczyna się dopiero po potwierdzeniu przez kierowcę.</p><div class="design-progress"><div class="design-progress-title">TANKOWANIE<span>${Math.min(activeIndex+1,steps.length)}/${steps.length}</span></div>${steps.map(([screen,label],index)=>`<div class="design-step ${index<activeIndex?'done':index===activeIndex?'current':''}"><span class="design-step-num">${index<activeIndex?icon('check'):String(index+1).padStart(2,'0')}</span><span>${label}</span></div>`).join('')}</div><div class="design-shared"><strong>Progi: 15 / 30 / 45 min</strong><p>1:00–2:00 jazdy sugeruje 15 min. Po 2:00 bez piętnastki — 45 min. Po potwierdzonej piętnastce, od 3:30 lub godzinę przed granicą — 30 min.</p></div>`;
}
function actionView(){
  const screen=state.screen;
  let text='',action='',disabled=false,back=null,caption='';
  if(screen==='travel'){
    const countdown=arrivalCountdown?.operation===state.operation?arrivalCountdown:null;
    text=countdown?`Cofnij potwierdzenie · ${countdown.remaining} s`:`Dotarłem na ${isLoad()?'załadunek':'rozładunek'}`;
    action=countdown?'cancel-arrival':'start-arrival';
    caption=countdown?'Dotarcie zostanie potwierdzone automatycznie. Naciśnij przycisk, aby wycofać.':'Po naciśnięciu masz 5 sekund na wycofanie potwierdzenia.';
  }
  if(screen==='info'){
    text=current().started?'Przejdź do dokumentacji':isLoad()?'Załadunek wykonany · dalej':'Rozpocznij dokumentowanie rozładunku';
    action='start';
    disabled=!count()||(!isLoad()&&!cmrSealReady());
    caption=current().started
      ?'Dodane materiały pozostają w dokumentacji.'
      :!current().physicalConfirmed
        ?isLoad()?'Zaznacz potwierdzenie wykonania załadunku na końcu listy.':'Zaznacz potwierdzenie liczby sztuk do rozładunku.'
        :isLoad()?'Potwierdzenie gotowe · możesz przejść dalej.':'Sprawdź informacje i liczbę sztuk przed rozpoczęciem rozładunku.';
  }
  if(screen==='photos'){text=isLoad()?'Dalej: plomba CMR':'Dalej: skan CMR po rozładunku';action=isLoad()?'seals':'documents';disabled=!cargoReady();back='info';caption=cargoReady()?(isLoad()?'Każda sztuka ładunku ma komplet zdjęć.':'Każda sztuka ma skan plomby i zdjęcie z rozładunku.'):`Gotowe sztuki · ${completedPieces()}/${count()}`;}
  if(screen==='seals'){text=isLoad()?'Dalej: skan CMR':'Dalej: informacje o rozładunku';action=isLoad()?'documents':'info';disabled=!cmrSealReady();back=isLoad()?'photos':'travel';caption=cmrSealReady()?(isLoad()?'Plomba CMR jest zapisana.':'CMR z załadunku jest gotowy do wglądu.'):(isLoad()?'Naklej plombę na pustym tyle ostatniej strony CMR i zeskanuj QR.':'Po dotarciu przygotuj dokumenty i zeskanuj istniejącą plombę CMR.');}
  if(screen==='documents'){text='Dalej: sprawdź i zakończ';action='review';disabled=!documentReady();back=isLoad()?'seals':'photos';caption=documentReady()?'Pełny CMR jest gotowy.':isLoad()?'Dodaj pełny CMR i potwierdź jego czytelność.':'Dodaj pełny CMR po rozładunku i potwierdź jego czytelność.';}
  if(screen==='review'){text=`Zakończ ${isLoad()?'załadunek':'rozładunek'}`;action='finish';disabled=!allReady();back='documents';}
  if(screen==='chat'){text='Załącz dokumenty';action='chat-attach';caption='Możesz pisać od razu. Zdjęcia są przypisane do konkretnych sztuk, a CMR pozostaje osobnym dokumentem.';}
  if(screen==='success'){text='Kolejny punkt na trasie';action='next-point';}
  const actionIcon=action==='chat-attach'?'clip':action==='finish'?'check':action==='cancel-arrival'?'close':'arrow';
  return `<div class="flow-actions">${back?`<button class="flow-back" data-back="${back}" aria-label="Wróć do poprzedniego kroku">${icon('back')}</button>`:''}<button class="primary-button ${action==='cancel-arrival'?'countdown-active':''}" id="main-action" data-action="${action}" ${disabled?'disabled':''}>${icon(actionIcon)}${text}</button></div>${caption?`<p class="action-caption ${action==='cancel-arrival'?'countdown-caption':''}">${caption}</p>`:''}`;
}

function designNotes(){
  const done=progress(),names=isLoad()?['Każda sztuka: plomba, QR i dwa zdjęcia','Plomba na pustym tyle ostatniej strony CMR','Pełny skan dokumentu CMR']:['Przygotuj CMR, zeskanuj plombę i pokaż CMR z załadunku','Zdjęcia z załadunku, skan plomby i zdjęcie z rozładunku','Pełny skan CMR po rozładunku'],screens=documentationSteps();
  return `<h2>${isLoad()?'Najpierw plomba.<br>Potem CMR.':'Dotarłem.<br>Potem CMR.'}</h2><p class="note-description">${isLoad()?'Każda sztuka przechodzi własną sekwencję. Dopiero po niej kierowca nakleja plombę na pustym tyle ostatniej strony CMR i dosyła skan dokumentu.':'Bezpośrednio po potwierdzeniu dotarcia kierowca skanuje plombę CMR i widzi dokument z załadunku. Dopiero potem sprawdza miejsce, instrukcje i sztuki przeznaczone do rozładunku.'}</p><div class="design-progress"><div class="design-progress-title">DOKUMENTACJA<span>${done.filter(Boolean).length}/3</span></div>${names.map((name,index)=>`<div class="design-step ${done[index]?'done':state.screen===screens[index]?'current':''}"><span class="design-step-num">${done[index]?icon('check'):String(index+1).padStart(2,'0')}</span><span>${name}</span></div>`).join('')}</div><div class="design-shared"><strong>Dowody z załadunku są pod ręką</strong><p>${isLoad()?'Każda pozycja ma własną plombę, QR oraz ujęcie z bliska i z daleka.':'Po skanie plomby CMR pojawia się wcześniejszy dokument, a przy każdej sztuce automatycznie widać jej zdjęcia z załadunku.'}</p></div>`;
}

const serviceTaskKeys=['oil','adBlue','serviceDistance','dpf'];
const serviceTaskMeta={
  oil:{icon:'oil',title:'Poziom oleju',description:'Sfotografuj wskazanie i wpisz poziom.',unit:'%',placeholder:'np. 85',max:100},
  adBlue:{icon:'drop',title:'Poziom AdBlue',description:'Sfotografuj wskazanie i wpisz poziom.',unit:'%',placeholder:'np. 60',max:100},
  serviceDistance:{icon:'service',title:'Dystans do przeglądu',description:'Sfotografuj licznik i wpisz pozostały dystans.',unit:'km',placeholder:'np. 12500'},
  dpf:{icon:'filter',title:'Zdjęcie DPF',description:'Zrób czytelne zdjęcie wskazania filtra DPF.'}
};
function serviceValueValid(key){
  if(key==='dpf')return true;
  const raw=state.serviceSurvey[key];
  if(!has(raw))return false;
  const value=Number(String(raw).replace(',','.'));
  if(!Number.isFinite(value)||value<0)return false;
  return serviceTaskMeta[key].max===undefined||value<=serviceTaskMeta[key].max;
}
function serviceTaskReady(key){return Boolean(state.serviceSurvey.photos[key])&&serviceValueValid(key);}
function serviceCompletedCount(){return serviceTaskKeys.filter(serviceTaskReady).length;}
function serviceReady(){return serviceCompletedCount()===serviceTaskKeys.length;}
function servicePhotoButton(key,compact=false){
  const record=state.serviceSurvey.photos[key];
  const label=key==='message'?'Zdjęcie komunikatu':serviceTaskMeta[key].title;
  return `<button class="service-photo-button ${compact?'compact':''} ${record?'done':''}" data-service-photo="${key}" aria-label="${record?'Zmień':'Dodaj'} zdjęcie: ${esc(label)}">${record?`<img src="${record.url}" alt="${esc(label)}">`:`<span class="service-photo-icon">${icon('camera')}</span>`}<span class="service-photo-copy"><strong>${record?'Zdjęcie dodane':'Dodaj zdjęcie'}</strong><small>${record?'Dotknij, aby zmienić':'Aparat lub galeria'}</small></span>${icon(record?'check':'plus')}</button>`;
}
function serviceTaskCard(key,index){
  const meta=serviceTaskMeta[key],done=serviceTaskReady(key),photo=servicePhotoButton(key);
  const valueField=key==='dpf'?'':`<label class="service-value-field" for="service-${key}"><span>Wartość *</span><span class="service-value-control"><input id="service-${key}" data-service-value="${key}" type="number" min="0" ${meta.max!==undefined?`max="${meta.max}"`:''} step="1" inputmode="numeric" value="${esc(state.serviceSurvey[key])}" placeholder="${esc(meta.placeholder)}"><b>${meta.unit}</b></span><small>${key==='serviceDistance'?'Kilometry pozostałe do przeglądu':'Zakres od 0 do 100'}</small></label>`;
  return `<section class="panel service-task-card ${done?'complete':''}" data-service-task="${key}"><div class="service-task-heading"><span class="service-task-number">${done?icon('check'):index+1}</span><span class="service-task-icon">${icon(meta.icon)}</span><div><h3>${esc(meta.title)}</h3><p>${esc(meta.description)}</p></div><b class="service-task-status">${done?'Gotowe':'Wymagane'}</b></div><div class="service-task-body">${photo}${valueField}</div></section>`;
}
function serviceModuleSwitch(active){
  return `<div class="service-module-switch" role="tablist" aria-label="Moduły obsługi pojazdu"><button role="tab" data-service-panel="survey" aria-selected="${active==='survey'}" class="${active==='survey'?'active':''}">${icon('service')}<span><strong>Kontrola dzienna</strong><small>Ankieta serwisowa</small></span></button><button role="tab" data-service-panel="inventory" aria-selected="${active==='inventory'}" class="${active==='inventory'?'active':''}">${icon('clipboard')}<span><strong>Inwentaryzacja</strong><small>Protokół wyposażenia</small></span></button></div>`;
}
function serviceSurveyView(){
  const done=serviceCompletedCount(),survey=state.serviceSurvey,dailyDone=survey.submitted||serviceCompletedToday(),dailyRecord=readServiceDailyRecord();
  const status=dailyDone?'Wykonana dzisiaj':done===4?'Gotowa do zapisu':'Do uzupełnienia';
  const savedTime=survey.submittedAt||dailyRecord?.submittedAt||'';
  if(dailyDone&&!survey.submitted&&!survey.reopened){
    return `<div class="app-content service-screen"><div class="service-page-header"><button id="service-back" aria-label="Wróć do poprzedniego widoku">${icon('back')}</button><div><span>CODZIENNA KONTROLA POJAZDU</span><h2>Ankieta serwisowa</h2></div><b class="service-state-badge saved">${status}</b></div><section class="service-daily-status done"><span>${icon('check')}</span><div><strong>Dzisiejsza kontrola wykonana</strong><small>Zapisano na tym urządzeniu${savedTime?` o ${esc(savedTime)}`:''}.</small></div><b>RAZ DZIENNIE</b></section><section class="panel service-completed-card"><span>${icon('check')}</span><h3>Na dzisiaj wszystko gotowe</h3><p>Cały zapis jest ważny do jutra do 00:01. Po tej godzinie wartości, notatka i zdjęcia zostaną usunięte, a pojawi się nowa ankieta.</p><button class="secondary-button" id="service-correct">${icon('edit')}Wprowadź korektę</button></section><p class="service-offline-note">${icon('info')}Potwierdzenie pozostaje na tym urządzeniu. Wersja demonstracyjna nie wysyła danych do backendu Super Spedytora.</p></div>`;
  }
  return `<div class="app-content service-screen"><div class="service-page-header"><button id="service-back" aria-label="Wróć do poprzedniego widoku">${icon('back')}</button><div><span>CODZIENNA KONTROLA POJAZDU</span><h2>Ankieta serwisowa</h2></div><b class="service-state-badge ${dailyDone?'saved':done===4?'ready':''}">${status}</b></div><p class="service-intro">Zrób zdjęcia komputera pokładowego i uzupełnij cztery pozycje. Dzięki temu serwis widzi stan pojazdu przed trasą.</p><section class="service-daily-status ${dailyDone?'done':''}"><span>${icon(dailyDone?'check':'bell')}</span><div><strong>${dailyDone?'Dzisiejsza kontrola wykonana':'Do wypełnienia dzisiaj'}</strong><small>${dailyDone?`Zapisano na tym urządzeniu${savedTime?` o ${esc(savedTime)}`:''}.`:'Wypełnij rano przed trasą albo wieczorem po zakończeniu jazdy.'}</small></div><b>RAZ DZIENNIE</b></section>${survey.submitted?`<div class="service-saved-banner">${icon('check')}<p><strong>Ankieta jest kompletna</strong>Zapisano cały formularz o ${esc(survey.submittedAt)}. Dane pozostaną ważne do jutra do 00:01.</p></div>`:''}<section class="service-progress-card"><div><span>POSTĘP ANKIETY</span><strong id="service-progress-count">${done}/4</strong></div><div class="service-progress-track"><span id="service-progress-bar" style="width:${done/4*100}%"></span></div><p>Każda pozycja wymaga zdjęcia. Olej, AdBlue i przegląd wymagają również wartości.</p></section><section class="panel service-message-card"><div class="service-message-heading"><span>${icon('camera')}</span><div><h3>Komunikaty serwisowe</h3><p>Kontrolki lub komunikaty z deski rozdzielczej · opcjonalne</p></div><b>Opcjonalne</b></div>${servicePhotoButton('message',true)}<label for="service-note"><span>Opis komunikatu</span><textarea id="service-note" maxlength="300" placeholder="Wpisz lub podyktuj, co pojawiło się na desce rozdzielczej">${esc(survey.note)}</textarea></label></section><div class="service-list-heading"><div><span>WYMAGANE</span><h3>Zdjęcia i wartości</h3></div><b>${done}/4 gotowe</b></div>${serviceTaskKeys.map(serviceTaskCard).join('')}<label class="panel check-row service-after-check"><input id="service-after" type="checkbox" ${survey.afterService?'checked':''}><span><strong>Po przeglądzie</strong><small>Zaznacz, jeśli pojazd właśnie wrócił z przeglądu.</small></span></label><p class="service-offline-note">${icon('info')}Wartości i zdjęcia zostaną utrwalone dopiero po ostatniej akcji „Zapisz ankietę”. Następnego dnia o 00:01 znikną z aplikacji.</p></div>`;
}
function serviceActionView(){
  const done=serviceCompletedCount(),submitted=state.serviceSurvey.submitted;
  if(submitted||serviceCompletedToday()&&!state.serviceSurvey.reopened)return `<div class="flow-actions"><button class="primary-button" id="service-close">${icon('check')}Zamknij ankietę</button></div><p class="action-caption">Zapis pozostaje ważny do następnego dnia do 00:01.</p>`;
  return `<div class="flow-actions"><button class="primary-button" id="service-save" ${serviceReady()?'':'disabled'}>${icon('check')}Zapisz ankietę</button></div><p class="action-caption">${done===4?'Wszystkie wymagane pozycje są kompletne.':`Uzupełnione ${done}/4 · dodaj brakujące zdjęcia i wartości.`}</p>`;
}
function serviceDesignNotes(){
  const done=serviceCompletedCount();
  return `<h2>Jedna kontrola.<br>Cztery dowody.</h2><p class="note-description">Ekran oddziela obowiązkowe od opcjonalnych danych. Kierowca od razu widzi, czego brakuje, a zapis odblokowuje się dopiero przy komplecie.</p><div class="design-progress"><div class="design-progress-title">ANKIETA SERWISOWA<span>${done}/4</span></div>${serviceTaskKeys.map((key,index)=>`<div class="design-step ${serviceTaskReady(key)?'done':index===done?'current':''}"><span class="design-step-num">${serviceTaskReady(key)?icon('check'):String(index+1).padStart(2,'0')}</span><span>${serviceTaskMeta[key].title}</span></div>`).join('')}</div><div class="design-shared"><strong>Aparat i galeria</strong><p>Każdą fotografię można wykonać aparatem albo wybrać z urządzenia. Komunikaty serwisowe są celowo opcjonalne.</p></div>`;
}
function refreshServiceProgress(){
  const done=serviceCompletedCount();
  if($('#service-progress-count'))$('#service-progress-count').textContent=`${done}/4`;
  if($('#service-progress-bar'))$('#service-progress-bar').style.width=`${done/4*100}%`;
  const listStatus=$('.service-list-heading b');
  if(listStatus)listStatus.textContent=`${done}/4 gotowe`;
  serviceTaskKeys.forEach(key=>{
    const card=$(`[data-service-task="${key}"]`);
    if(!card)return;
    const ready=serviceTaskReady(key);
    card.classList.toggle('complete',ready);
    const status=$('.service-task-status',card);
    if(status)status.textContent=ready?'Gotowe':'Wymagane';
  });
  const badge=$('.service-state-badge');
  if(badge){badge.textContent=done===4?'Gotowa do zapisu':'Do uzupełnienia';badge.classList.toggle('ready',done===4);badge.classList.remove('saved');}
  updateServiceNavIndicator();
  $('#app-action').innerHTML=serviceActionView();
  bindServiceAction();
}
function markServiceEdited(){
  if(state.serviceSurvey.submitted||serviceCompletedToday()){
    state.serviceSurvey.submitted=false;
    state.serviceSurvey.submittedAt=null;
    markServiceDailyDue();
  }
}
function bindServiceAction(){
  if($('#service-save'))$('#service-save').onclick=async event=>{
    if(!serviceReady())return;
    const button=event.currentTarget,time=new Date().toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'});
    button.disabled=true;
    button.innerHTML=`${icon('clock')}Zapisywanie ankiety…`;
    try{
      await markServiceDailyDone(time);
      state.serviceSurvey.submitted=true;
      state.serviceSurvey.submittedAt=time;
      state.serviceSurvey.reopened=false;
      state.serviceSurvey.hydrated=true;
      render();
      toast('Cała ankieta została zapisana na urządzeniu do jutra, do 00:01.');
    }catch(error){
      render();
      toast('Nie udało się zapisać całej ankiety. Dane nie zostały oznaczone jako gotowe.');
    }
  };
  if($('#service-close'))$('#service-close').onclick=()=>closeService();
}
function bindServiceView(){
  bindServiceAction();
  if($('#service-back'))$('#service-back').onclick=()=>closeService();
  if($('#service-correct'))$('#service-correct').onclick=()=>{state.serviceSurvey.reopened=true;render();};
  $$('[data-service-panel]').forEach(button=>button.onclick=()=>openService(button.dataset.servicePanel));
  $$('[data-service-photo]').forEach(button=>button.onclick=()=>openModal('service-photo',{key:button.dataset.servicePhoto,service:true,kind:'service-photo'}));
  $$('[data-service-value]').forEach(input=>input.oninput=event=>{markServiceEdited();state.serviceSurvey[event.target.dataset.serviceValue]=event.target.value;refreshServiceProgress();});
  if($('#service-note'))$('#service-note').oninput=event=>{markServiceEdited();state.serviceSurvey.note=event.target.value;refreshServiceProgress();};
  if($('#service-after'))$('#service-after').onchange=event=>{markServiceEdited();state.serviceSurvey.afterService=event.target.checked;refreshServiceProgress();};
}

const inventoryStatusMeta={
  present:{label:'Jest',short:'Jest',icon:'check'},
  missing:{label:'Brak',short:'Brak',icon:'close'},
  damaged:{label:'Uszkodzone',short:'Uszk.',icon:'warning'}
};
const inventoryStatus=id=>state.inventoryProtocol.statuses[id]||null;
const inventoryIssue=id=>['missing','damaged'].includes(inventoryStatus(id));
const inventoryItemReady=id=>{
  const status=inventoryStatus(id);
  if(status==='present')return true;
  if(!inventoryIssue(id))return false;
  return Boolean(state.inventoryProtocol.photos[id]&&has(state.inventoryProtocol.notes[id]));
};
const inventoryCompletedCount=()=>inventoryItems.filter(item=>inventoryItemReady(item.id)).length;
const inventoryAnsweredCount=()=>inventoryItems.filter(item=>inventoryStatus(item.id)).length;
const inventoryIssueCount=()=>inventoryItems.filter(item=>inventoryIssue(item.id)).length;
const inventoryPresentCount=()=>inventoryItems.filter(item=>inventoryStatus(item.id)==='present').length;
const inventoryAllItemsReady=()=>inventoryCompletedCount()===inventoryItems.length;
const inventoryReady=()=>inventoryAllItemsReady()&&state.inventoryProtocol.confirmed;

function inventoryPhotoButton(id){
  const record=state.inventoryProtocol.photos[id],item=inventoryItem(id);
  return `<button class="inventory-photo-button ${record?'done':''}" data-inventory-photo="${id}" aria-label="${record?'Zmień':'Dodaj'} zdjęcie niezgodności: ${esc(item.name)}">${record?`<img src="${record.url}" alt="Niezgodność: ${esc(item.name)}">`:`<span>${icon('camera')}</span>`}<span><strong>${record?'Zdjęcie dodane':'Dodaj zdjęcie'}</strong><small>${record?'Dotknij, aby zmienić':'Wymagane przy niezgodności'}</small></span>${icon(record?'check':'plus')}</button>`;
}
function inventoryItemRow(item){
  const status=inventoryStatus(item.id),ready=inventoryItemReady(item.id),issue=inventoryIssue(item.id),note=state.inventoryProtocol.notes[item.id]||'';
  const stateClass=ready?'complete':issue?'issue-open':status?'incomplete':'';
  return `<article class="inventory-item ${stateClass}" data-inventory-item="${item.id}"><div class="inventory-item-heading"><span class="inventory-item-icon">${icon(item.icon)}</span><div><strong>${esc(item.name)}</strong><small>Stan oczekiwany: ${esc(item.expected)}</small></div><b class="inventory-item-result">${ready?icon('check'):status?'Uzupełnij':'Oceń'}</b></div><div class="inventory-status-options" role="group" aria-label="Stan: ${esc(item.name)}">${Object.entries(inventoryStatusMeta).map(([value,meta])=>`<button data-inventory-status="${item.id}" data-status="${value}" aria-pressed="${status===value}" class="${status===value?`active ${value}`:''}">${icon(meta.icon)}<span>${meta.short}</span></button>`).join('')}</div>${issue?`<div class="inventory-issue-details"><div class="inventory-issue-title">${icon('warning')}<span><strong>${status==='missing'?'Udokumentuj brak':'Udokumentuj uszkodzenie'}</strong><small>Zdjęcie i opis są wymagane przed zapisem protokołu.</small></span></div>${inventoryPhotoButton(item.id)}<label for="inventory-note-${item.id}"><span>Opis niezgodności *</span><textarea id="inventory-note-${item.id}" data-inventory-note="${item.id}" maxlength="300" placeholder="${status==='missing'?'Napisz, czego brakuje i gdzie to sprawdzono.':'Opisz uszkodzenie i czy wyposażenia można bezpiecznie używać.'}">${esc(note)}</textarea></label></div>`:''}</article>`;
}
function inventoryGroupView(group){
  const complete=group.items.filter(item=>inventoryItemReady(item.id)).length;
  return `<section class="inventory-group"><div class="inventory-group-heading"><div><span>${esc(group.eyebrow)}</span><h3>${esc(group.title)}</h3></div><b data-inventory-group-count="${group.id}">${complete}/${group.items.length}</b></div><div class="panel inventory-group-card">${group.items.map(inventoryItemRow).join('')}</div></section>`;
}
function inventoryProtocolView(){
  const protocol=state.inventoryProtocol,done=inventoryCompletedCount(),issues=inventoryIssueCount();
  const badge=protocol.submitted?'Zatwierdzony':inventoryReady()?'Gotowy do zapisu':'Roboczy';
  return `<div class="app-content service-screen inventory-screen"><div class="service-page-header"><button id="service-back" aria-label="Wróć do poprzedniego widoku">${icon('back')}</button><div><span>WYPOSAŻENIE POJAZDU</span><h2>Protokół inwentaryzacji</h2></div><b class="service-state-badge inventory-state ${protocol.submitted?'saved':inventoryReady()?'ready':''}">${badge}</b></div>${serviceModuleSwitch('inventory')}<p class="service-intro">Sprawdź każdą pozycję przy pojeździe. Brak albo uszkodzenie wymaga zdjęcia i krótkiego opisu.</p><section class="inventory-identity-card"><div class="inventory-identity-top"><span>${icon('clipboard')}</span><div><small>PROTOKÓŁ DEMONSTRACYJNY</small><strong>${esc(protocol.id)}</strong></div><b>DANE DEMO</b></div><div class="inventory-vehicle"><div><span>Pojazd</span><strong>${esc(protocol.vehicle)}</strong><small>${esc(protocol.registration)}</small></div><div><span>Kierowca</span><strong>${esc(protocol.driver)}</strong><small>Podgląd bez danych produkcyjnych</small></div></div></section>${protocol.submitted?`<div class="service-saved-banner inventory-saved">${icon('check')}<p><strong>Protokół demonstracyjny jest kompletny</strong>Zapisano lokalnie o ${esc(protocol.submittedAt)}. Nie wysłano danych do Super Spedytora.</p></div>`:''}<section class="service-progress-card inventory-progress-card"><div><span>POSTĘP PROTOKOŁU</span><strong id="inventory-progress-count">${done}/${inventoryItems.length}</strong></div><div class="service-progress-track"><span id="inventory-progress-bar" style="width:${done/inventoryItems.length*100}%"></span></div><div class="inventory-progress-stats"><span><b id="inventory-present-count">${inventoryPresentCount()}</b> zgodne</span><span><b id="inventory-issue-count">${issues}</b> niezgodności</span><span><b id="inventory-open-count">${inventoryItems.length-inventoryAnsweredCount()}</b> bez oceny</span></div></section>${issues?`<div class="inventory-alert">${icon('warning')}<p><strong>${issues} ${issues===1?'niezgodność':'niezgodności'}</strong>Każdy brak lub uszkodzenie musi mieć zdjęcie i opis.</p></div>`:`<div class="inventory-guidance">${icon('info')}Wybierz stan każdej pozycji: „Jest”, „Brak” albo „Uszkodzone”.</div>`}${inventoryGroups.map(inventoryGroupView).join('')}<label class="panel check-row inventory-confirm"><input id="inventory-confirm" type="checkbox" ${protocol.confirmed?'checked':''} ${inventoryAllItemsReady()?'':'disabled'}><span><strong>Potwierdzam zgodność ze stanem faktycznym</strong><small>${inventoryAllItemsReady()?'Sprawdziłem wyposażenie przy pojeździe i opisane niezgodności są kompletne.':'Najpierw oceń wszystkie pozycje i udokumentuj niezgodności.'}</small></span></label><p class="service-offline-note">${icon('info')}To interaktywny projekt panelu. Lista wyposażenia, pojazd i numer protokołu są demonstracyjne; zapis nie trafia do produkcyjnego Super Spedytora.</p></div>`;
}
function inventoryActionView(){
  const protocol=state.inventoryProtocol,done=inventoryCompletedCount(),answered=inventoryAnsweredCount();
  if(protocol.submitted)return `<div class="flow-actions"><button class="primary-button" id="inventory-close">${icon('check')}Zamknij protokół</button></div><p class="action-caption">Wersja demonstracyjna: zapis istnieje tylko w tym podglądzie.</p>`;
  const caption=inventoryAllItemsReady()?(protocol.confirmed?'Wszystkie pozycje i niezgodności są kompletne.':'Zaznacz potwierdzenie zgodności ze stanem faktycznym.'):`Oceniono ${answered}/${inventoryItems.length} · kompletne ${done}/${inventoryItems.length}.`;
  return `<div class="flow-actions"><button class="primary-button" id="inventory-save" ${inventoryReady()?'':'disabled'}>${icon('check')}Zapisz protokół</button></div><p class="action-caption">${caption}</p>`;
}
function inventoryDesignNotes(){
  const issues=inventoryIssueCount(),done=inventoryCompletedCount();
  const steps=[['01','Oceń każdą pozycję',inventoryAnsweredCount()===inventoryItems.length],['02','Udokumentuj niezgodności',inventoryItems.filter(item=>inventoryIssue(item.id)).every(item=>inventoryItemReady(item.id))],['03','Potwierdź i zapisz',state.inventoryProtocol.submitted]];
  return `<h2>Jedna lista.<br>Zero domysłów.</h2><p class="note-description">Kierowca zaznacza faktyczny stan wyposażenia. Zdjęcie i opis pojawiają się tylko przy braku albo uszkodzeniu.</p><div class="design-progress"><div class="design-progress-title">PROTOKÓŁ INWENTARYZACJI<span>${done}/${inventoryItems.length}</span></div>${steps.map(([number,label,complete],index)=>`<div class="design-step ${complete?'done':index===0||steps[index-1][2]?'current':''}"><span class="design-step-num">${complete?icon('check'):number}</span><span>${label}</span></div>`).join('')}</div><div class="design-shared"><strong>Niezgodności są widoczne od razu</strong><p>${issues?`W podglądzie oznaczono ${issues} ${issues===1?'niezgodność':'niezgodności'}.`:'Przy wyborze „Brak” lub „Uszkodzone” aplikacja pokaże wymagane zdjęcie i opis.'} Zapis odblokowuje się dopiero po komplecie.</p></div>`;
}
function markInventoryEdited(){
  const protocol=state.inventoryProtocol;
  if(protocol.submitted){protocol.submitted=false;protocol.submittedAt=null;protocol.confirmed=false;}
}
function refreshInventoryProgress(){
  const done=inventoryCompletedCount(),answered=inventoryAnsweredCount();
  if($('#inventory-progress-count'))$('#inventory-progress-count').textContent=`${done}/${inventoryItems.length}`;
  if($('#inventory-progress-bar'))$('#inventory-progress-bar').style.width=`${done/inventoryItems.length*100}%`;
  if($('#inventory-present-count'))$('#inventory-present-count').textContent=inventoryPresentCount();
  if($('#inventory-issue-count'))$('#inventory-issue-count').textContent=inventoryIssueCount();
  if($('#inventory-open-count'))$('#inventory-open-count').textContent=inventoryItems.length-answered;
  inventoryGroups.forEach(group=>{
    const counter=$(`[data-inventory-group-count="${group.id}"]`);
    if(counter)counter.textContent=`${group.items.filter(item=>inventoryItemReady(item.id)).length}/${group.items.length}`;
  });
  inventoryItems.forEach(item=>{
    const row=$(`[data-inventory-item="${item.id}"]`),ready=inventoryItemReady(item.id);
    if(!row)return;
    row.classList.toggle('complete',ready);
    const result=$('.inventory-item-result',row);
    if(result)result.innerHTML=ready?icon('check'):inventoryStatus(item.id)?'Uzupełnij':'Oceń';
  });
  const confirm=$('#inventory-confirm');
  if(confirm){
    confirm.disabled=!inventoryAllItemsReady();
    const help=$('.inventory-confirm small');
    if(help)help.textContent=inventoryAllItemsReady()?'Sprawdziłem wyposażenie przy pojeździe i opisane niezgodności są kompletne.':'Najpierw oceń wszystkie pozycje i udokumentuj niezgodności.';
  }
  const badge=$('.inventory-state');
  if(badge){
    badge.textContent=inventoryReady()?'Gotowy do zapisu':'Roboczy';
    badge.classList.toggle('ready',inventoryReady());
    badge.classList.remove('saved');
  }
  if($('#design-context'))$('#design-context').innerHTML=inventoryDesignNotes();
  $('#app-action').innerHTML=inventoryActionView();
  bindInventoryAction();
}
function bindInventoryAction(){
  if($('#inventory-save'))$('#inventory-save').onclick=()=>{
    if(!inventoryReady())return;
    state.inventoryProtocol.submitted=true;
    state.inventoryProtocol.submittedAt=new Date().toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'});
    render();
    toast('Protokół demonstracyjny został zapisany lokalnie.');
  };
  if($('#inventory-close'))$('#inventory-close').onclick=()=>closeService();
}
function bindInventoryView(){
  bindInventoryAction();
  if($('#service-back'))$('#service-back').onclick=()=>closeService();
  $$('[data-service-panel]').forEach(button=>button.onclick=()=>openService(button.dataset.servicePanel));
  $$('[data-inventory-status]').forEach(button=>button.onclick=()=>{
    const id=button.dataset.inventoryStatus,status=button.dataset.status,protocol=state.inventoryProtocol;
    if(protocol.statuses[id]===status)return;
    markInventoryEdited();
    protocol.confirmed=false;
    protocol.statuses[id]=status;
    if(status==='present'){
      revoke(protocol.photos[id]);
      delete protocol.photos[id];
      delete protocol.notes[id];
    }
    render();
  });
  $$('[data-inventory-photo]').forEach(button=>button.onclick=()=>openModal('inventory-photo',{key:button.dataset.inventoryPhoto,inventory:true,kind:'inventory-photo'}));
  $$('[data-inventory-note]').forEach(input=>input.oninput=event=>{
    markInventoryEdited();
    state.inventoryProtocol.confirmed=false;
    state.inventoryProtocol.notes[event.target.dataset.inventoryNote]=event.target.value;
    refreshInventoryProgress();
  });
  if($('#inventory-confirm'))$('#inventory-confirm').onchange=event=>{
    markInventoryEdited();
    state.inventoryProtocol.confirmed=event.target.checked;
    refreshInventoryProgress();
  };
}

function updateScreenList(){
  if(state.routeStop){
    const transferor=state.routeStop==='collection'&&collection().role==='transferor';
    const labels=transferor?{info:['01','Przygotuj swoje dokumenty']}:state.routeStop==='collection'?{info:['01','Wybierz kierowcę'],photos:['02','Skanuj i sprawdzaj CMR-y'],documents:['03','Naklej i przypisz plombę'],review:['04','Sprawdź tę kopertę']}:state.routeStop==='parking'?{travel:['↗','Dojazd na parking'],info:['01','Informacje po dotarciu'],review:['02','Postój rozpoczęty']}:{travel:['↗','Dojazd na tankowanie'],info:['01','Sugestia + karta i PIN'],photos:['02','Tankowanie i 2 zdjęcia'],documents:['03','Paragon i wydatek'],review:['04','Przerwa lub dalsza jazda']};
    const order=transferor?['info']:state.routeStop==='collection'?['info','photos','documents','review']:state.routeStop==='parking'?['travel','info','review']:['travel','info','photos','documents','review'];
    $$('.screen-list [data-screen]').forEach(button=>{button.hidden=!labels[button.dataset.screen];});
    order.forEach(screen=>{
      const button=$(`.screen-list [data-screen="${screen}"]`),label=labels[screen];
      button.querySelector('.screen-num').textContent=label[0];
      button.querySelectorAll('span')[1].textContent=label[1];
      $('.screen-list').appendChild(button);
    });
    return;
  }
  const labels=isLoad()?{info:['00','Zlecenie i załadunek'],photos:['01','Sztuki ładunku'],seals:['02','Plomba ostatniej strony CMR'],documents:['03','Skan dokumentu CMR'],review:['04','Sprawdź i zakończ']}:{seals:['00','Po dotarciu: plomba CMR'],info:['01','Informacje o rozładunku'],photos:['02','Plomby i zdjęcia sztuk'],documents:['03','Skan CMR po rozładunku'],review:['04','Sprawdź i zakończ']};
  const nav=$('.screen-list'),order=isLoad()?['travel','info','photos','seals','documents','review']:['travel','seals','info','photos','documents','review'];
  $$('.screen-list [data-screen]').forEach(button=>{button.hidden=false;});
  order.forEach(screen=>nav.appendChild($(`.screen-list [data-screen="${screen}"]`)));
  $$('.screen-list [data-screen]').forEach(button=>{
    const label=labels[button.dataset.screen];
    if(!label)return;
    button.querySelector('.screen-num').textContent=label[0];
    button.querySelectorAll('span')[1].textContent=label[1];
  });
}

function render(){
  const scroll=$('#app-scroll').scrollTop;
  ensureServiceSurveyToday();
  updateServiceNavIndicator();
  if(state.serviceOpen){
    const inventory=state.servicePanel==='inventory';
    $('#app').innerHTML=inventory?inventoryProtocolView():serviceSurveyView();
    if(!inventory)$('.service-page-header')?.insertAdjacentHTML('afterend',serviceModuleSwitch('survey'));
    $('#app-action').innerHTML=inventory?inventoryActionView():serviceActionView();
    $('#design-context').innerHTML=inventory?inventoryDesignNotes():serviceDesignNotes();
    $('#preview-label').textContent=inventory?'SERWIS / INWENTARYZACJA':'SERWIS / ANKIETA';
    $$('[data-operation],[data-route-stop],[data-service-preview]').forEach(button=>{button.classList.remove('active');button.setAttribute('aria-pressed','false');});
    const servicePreview=$(`[data-service-preview="${state.servicePanel}"]`);
    if(servicePreview){servicePreview.classList.add('active');servicePreview.setAttribute('aria-pressed','true');}
    $$('.screen-list [data-screen]').forEach(button=>button.classList.remove('active'));
    $('#scenario-select').disabled=true;
    $('#mobile-scenario').disabled=true;
    $$('[data-nav]').forEach(button=>button.classList.toggle('active',button.dataset.nav==='service'));
    if(inventory)bindInventoryView();else bindServiceView();
    $('#app-scroll').scrollTop=scroll;
    return;
  }
  if(state.routeStop){
    const collectionViews={info:collectionInfoView,photos:collectionScanView,documents:collectionEnvelopeView,review:collectionReviewView,chat:stopChatView};
    const ordinaryViews={travel:stopTravelView,info:state.routeStop==='parking'?parkingInfoView:fuelingInfoView,photos:fuelingInProgressView,documents:fuelingExpenseView,review:routeStopSuccessView,chat:stopChatView};
    const views=state.routeStop==='collection'?collectionViews:ordinaryViews;
    $('#app').innerHTML=views[state.screen]();
    $('#app-action').innerHTML=stopActionView();
    $('#design-context').innerHTML=stopDesignNotes();
    const stopStage=state.routeStop==='collection'?{info:'START',photos:'SKANOWANIE',documents:'KOPERTA',review:collection().finished?'GOTOWE':'KONTROLA',chat:'CZAT'}:{travel:'W DRODZE',info:'NA MIEJSCU',photos:'W TRAKCIE',documents:'WYDATEK',review:'GOTOWE',chat:'CZAT'};
    $('#preview-label').textContent=`${stopDefinition().title.toUpperCase()} / ${stopStage[state.screen]}`;
    $$('[data-operation]').forEach(button=>{button.classList.remove('active');button.setAttribute('aria-pressed','false');});
    $$('[data-route-stop]').forEach(button=>{const active=button.dataset.routeStop===state.routeStop;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    $$('[data-service-preview]').forEach(button=>{button.classList.remove('active');button.setAttribute('aria-pressed','false');});
    updateScreenList();
    $$('.screen-list [data-screen]').forEach(button=>button.classList.toggle('active',button.dataset.screen===state.screen));
    $('#scenario-select').disabled=true;
    $('#mobile-scenario').disabled=true;
    $$('[data-nav]').forEach(button=>button.classList.toggle('active',button.dataset.nav===(state.screen==='chat'?'chat':'now')));
    bindStopView();
    $('#app-scroll').scrollTop=scroll;
    return;
  }
  const views={info:infoView,travel:travelView,photos:piecesView,seals:cmrSealView,documents:documentsView,review:reviewView,chat:chatView,success:successView};
  $('#app').innerHTML=views[state.screen]();
  $('#app-action').innerHTML=actionView();
  $('#design-context').innerHTML=designNotes();
  $('#preview-label').textContent=`${operationName().toUpperCase()} / ${{info:'INFORMACJE',travel:'W DRODZE',photos:'SZTUKI ŁADUNKU',seals:'PLOMBA CMR',documents:'SKAN CMR',review:'ZAKOŃCZENIE',chat:'CZAT',success:'GOTOWE'}[state.screen]}`;
  $$('[data-operation]').forEach(button=>{button.classList.toggle('active',button.dataset.operation===state.operation);button.setAttribute('aria-pressed',String(button.dataset.operation===state.operation));});
  $$('[data-route-stop]').forEach(button=>{button.classList.remove('active');button.setAttribute('aria-pressed','false');});
  $$('[data-service-preview]').forEach(button=>{button.classList.remove('active');button.setAttribute('aria-pressed','false');});
  $$('.screen-list [data-screen]').forEach(button=>button.classList.toggle('active',button.dataset.screen===state.screen));
  updateScreenList();
  $('#scenario-select').value=state.scenario;
  $('#mobile-scenario').value=state.scenario;
  $('#scenario-select').disabled=false;
  $('#mobile-scenario').disabled=false;
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

function sendChatMessage(record){
  const input=$('#chat-message'),text=input?.value.trim();
  if(!text){input?.focus();return;}
  record.messages.push({text,time:'10:42'});
  render();
  $('#app-scroll').scrollTop=$('#app-scroll').scrollHeight;
  toast('Wiadomość została dodana do czatu demonstracyjnego.');
}

function bindChatComposer(record){
  if($('#chat-send'))$('#chat-send').onclick=()=>sendChatMessage(record);
  if($('#chat-message'))$('#chat-message').onkeydown=event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendChatMessage(record);}};
}

function finishFuelingWithBreakDecision(recommendation,choice){
  const stop=currentStop();
  let finalChoice=choice;
  if(choice==='STARTED'){
    const started=window.SuperSpedytorTacho?.startSuggestedBreak?.(recommendation.durationMinutes);
    if(!started)finalChoice='CHECK_TACHOGRAPH';
  }
  stop.breakDecision={
    recommendation,
    choice:finalChoice,
    decidedAt:new Date().toISOString()
  };
  stop.finished=true;
  closeModal(false);
  goStop('review');
  if(finalChoice==='STARTED')toast(`Przerwa ${recommendation.durationMinutes} min została zgłoszona w demonstracji.`);
  if(finalChoice==='CONTINUE')toast('Zapisano wybór dalszej jazdy. Sugestia przerwy nie została uruchomiona.');
  if(finalChoice==='CHECK_TACHOGRAPH')toast('Nie uruchomiono przerwy. Najpierw sprawdź tachograf.');
}

function completeFuelingExpense(){
  const recommendation=fuelBreakRecommendation();
  if(recommendation.action==='SUGGEST_BREAK'||recommendation.action==='CHECK_TACHOGRAPH'){
    openModal('fuel-break',{recommendation});
    return;
  }
  finishFuelingWithBreakDecision(
    recommendation,
    recommendation.action==='KEEP_ACTIVE_REPORT'?'ALREADY_ACTIVE':'AUTO_CONTINUE'
  );
}

function bindStopAction(){
  if(!$('#main-action'))return;
  $('#main-action').onclick=()=>{
    const action=$('#main-action').dataset.action;
    if(action==='start-arrival')startArrivalCountdown();
    if(action==='cancel-arrival')cancelArrivalCountdown(true);
    if(action==='fuel-start')goStop('photos');
    if(action==='fuel-end'&&fuelingPhotosReady())goStop('documents');
    if(action==='stop-finish'){currentStop().finished=true;goStop('review');}
    if(action==='fuel-finish'&&fuelingReady())completeFuelingExpense();
    if(action==='collection-prepare'){
      const group=collectionGroup(collection().transferorSourceId);
      group.prepared=true;
      group.preparedAt=new Date().toISOString();
      render();
      toast('Dokumenty są przygotowane. Koperta pozostaje otwarta.');
    }
    if(action==='collection-resume'&&collectionGroup())goStop('photos');
    if(action==='collection-envelope'&&collectionDocumentsReady())goStop('documents');
    if(action==='collection-review'&&collectionEnvelopeReady())goStop('review');
    if(action==='collection-next-driver'){
      collection().activeSourceId=null;
      collection().started=false;
      goStop('info');
    }
    if(action==='collection-finish'&&allCollectionGroupsReady()){collection().finished=true;collection().syncState='PENDING_SYNC';collection().groups.forEach(group=>group.syncState='PENDING_SYNC');render();toast('Każdą kopertę zapisano osobno. Odbiór oczekuje na potwierdzenie TMS.');}
    if(action==='collection-next')switchOperation('load','travel');
    if(action==='stop-next')switchOperation('load','travel');
  };
}

function refreshStopAction(){
  $('#app-action').innerHTML=stopActionView();
  if($('#expense-status'))$('#expense-status').textContent=fuelExpenseReady()?'Gotowy':'Wymagane pola';
  bindStopAction();
}

function bindStopView(){
  bindStopAction();
  if(state.routeStop==='collection'){
    $$('[data-collection-back]').forEach(button=>button.onclick=()=>goStop(button.dataset.collectionBack));
    $$('[data-collection-source]').forEach(button=>button.onclick=()=>{
      const group=collectionGroup(button.dataset.collectionSource);
      if(!group||collectionEnvelopeReady(group))return;
      collection().activeSourceId=group.sourceId;
      collection().started=true;
      goStop('photos');
      toast(`Odbierasz dokumenty od: ${collectionSource(group.sourceId).name}.`);
    });
    if($('#collection-add-document'))$('#collection-add-document').onclick=()=>openModal('collection-scan');
    if($('#collection-accept-document'))$('#collection-accept-document').onclick=()=>{
      const group=collectionGroup(),record=group?.pendingDocument;
      if(!group||!record)return;
      record.confirmed=true;
      record.acceptedAt=new Date().toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'});
      group.documents.unshift(record);
      group.pendingDocument=null;
      group.envelope.contentsConfirmed=false;
      render();
      toast('Dokument przejęty i dodany na górę listy. Możesz skanować kolejny CMR.');
    };
    if($('#collection-reject-document'))$('#collection-reject-document').onclick=()=>{
      const group=collectionGroup(),record=group?.pendingDocument;
      if(!group||!record)return;
      revoke(record);
      group.pendingDocument=null;
      group.envelope.contentsConfirmed=false;
      render();
      toast('Dokument nie został przejęty. Zeskanuj właściwy CMR.');
    };
    if($('#collection-envelope-confirm'))$('#collection-envelope-confirm').onchange=event=>{collectionGroup().envelope.contentsConfirmed=event.target.checked;render();};
    if($('#scan-collection-envelope'))$('#scan-collection-envelope').onclick=()=>openModal('scan',{kind:'collection-envelope'});
  }
  $$('[data-stop-back]').forEach(button=>button.onclick=()=>goStop(button.dataset.stopBack));
  if($('#fuel-expense-back'))$('#fuel-expense-back').onclick=()=>{currentStop().finished=false;goStop('documents');};
  if($('#stop-chat-back'))$('#stop-chat-back').onclick=()=>goStop(currentStop().returnScreen||'travel');
  $$('[data-stop-chat]').forEach(button=>button.onclick=()=>goStop('chat'));
  bindChatComposer(currentStop());
  $$('[data-fuel-photo]').forEach(button=>button.onclick=()=>openModal('fuel-photo',{key:button.dataset.fuelPhoto}));
  if($('#expense-country'))$('#expense-country').onchange=event=>{currentStop().expense.country=event.target.value;render();};
  if($('#fuel-liters'))$('#fuel-liters').oninput=event=>{currentStop().expense.liters=event.target.value;refreshStopAction();};
  if($('#fuel-price'))$('#fuel-price').oninput=event=>{currentStop().expense.price=event.target.value;refreshStopAction();};
  if($('#with-adblue'))$('#with-adblue').onchange=event=>{currentStop().expense.withAdBlue=event.target.checked;render();};
  if($('#adblue-liters'))$('#adblue-liters').oninput=event=>{currentStop().expense.adBlueLiters=event.target.value;refreshStopAction();};
  if($('#adblue-price'))$('#adblue-price').oninput=event=>{currentStop().expense.adBluePrice=event.target.value;refreshStopAction();};
}

function bindView(){
  if($('#language-select'))$('#language-select').onchange=event=>{state.language=event.target.value;state.manualLanguage=true;render();};
  if($('#physical-confirm'))$('#physical-confirm').onchange=event=>{current().physicalConfirmed=event.target.checked;render();};
  if($('#report-cargo-mismatch'))$('#report-cargo-mismatch').onclick=()=>openModal('cwp-contact');
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
    openModal('attachment',{kind:side==='near'?'photo-near':side==='far'?'photo-far':'photo-unload',pieceIndex,source:'step'});
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
  if($('#stage-back'))$('#stage-back').onclick=()=>{if(!isLoad()&&state.screen==='seals'){go('travel');return;}const flow=operationFlow();go(flow[Math.max(0,flow.indexOf(state.screen)-1)]);};
  if($('#review-back'))$('#review-back').onclick=()=>go('documents');
  if($('#chat-back'))$('#chat-back').onclick=()=>go(state.returnScreen);
  bindChatComposer(current());
  if($('#copy-reference'))$('#copy-reference').onclick=async()=>{try{await navigator.clipboard.writeText(optional().ref);toast('REF został skopiowany.');}catch{openModal('copy');}};
  $('#main-action').onclick=()=>{
    const action=$('#main-action').dataset.action;
    if(action==='start-arrival')startArrivalCountdown();
    if(action==='cancel-arrival')cancelArrivalCountdown(true);
    if(action==='start'){
      if(!count()||(!isLoad()&&!cmrSealReady()))return;
      if(!current().physicalConfirmed){
        const confirmation=$('.loading-confirmation'),checkbox=$('#physical-confirm');
        confirmation?.classList.remove('needs-attention');
        if(confirmation)void confirmation.offsetWidth;
        confirmation?.classList.add('needs-attention');
        confirmation?.scrollIntoView({behavior:'smooth',block:'center'});
        checkbox?.focus({preventScroll:true});
        toast(isLoad()?'Zaznacz potwierdzenie, że fizyczny załadunek został wykonany.':'Zaznacz potwierdzenie liczby sztuk do rozładunku.');
        setTimeout(()=>confirmation?.classList.remove('needs-attention'),2400);
        return;
      }
      current().started=true;
      go('photos');
    }
    if(['info','photos','seals','documents','review'].includes(action))go(action);
    if(action==='chat-attach')openModal('chat-attach');
    if(action==='finish'&&allReady())openModal('finish');
    if(action==='next-point'){
      if(isLoad()){
        const loadOperation=state.operations.load;
        const pieces=loadOperation.items.map((piece,index)=>makePiece(index+1,{name:piece.name,description:piece.description,mass:piece.mass,dimensions:piece.dimensions,expectedSeal:piece.seal||`DEMO-PL-${String(index+1).padStart(2,'0')}`,loadingPhotos:{near:piece.photos.near||demoLoadingPhoto(index+1,'near'),far:piece.photos.far||demoLoadingPhoto(index+1,'far')}}));
        state.operations.unload=fresh('unload',pieces,{expectedCmrSeal:loadOperation.cmrSeal||'DEMO-PL-CMR',loadingDocuments:loadOperation.documents.length?loadOperation.documents:demoLoadingDocuments()});
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
  if(kind==='photo-unload')return `Zrób zdjęcie sztuki „${piece.name}” dopiero po zdjęciu jej z pojazdu. Pokaż ją na rampie albo na ziemi, jeśli rozładunek odbywa się poza rampą.`;
  return kind==='photo-near'?`Pokaż z bliska całą sztukę „${piece.name}”, jej opakowanie i naklejoną plombę.`:`Pokaż z daleka całą sztukę „${piece.name}” oraz jej ustawienie w przestrzeni ładunkowej.`;
}

function attachmentChoices(){
  const pieceChoices=current().items.flatMap((piece,index)=>isLoad()?[
    {kind:'photo-near',icon:'camera',label:`Sztuka ${index+1} · z bliska`,hint:piece.photos.near?'Już dodane — możesz zmienić':piece.seal?'Dodaj zdjęcie':'Najpierw zeskanuj plombę',pieceIndex:index,disabled:!piece.seal},
    {kind:'photo-far',icon:'camera',label:`Sztuka ${index+1} · z daleka`,hint:piece.photos.far?'Już dodane — możesz zmienić':piece.seal?'Dodaj zdjęcie':'Najpierw zeskanuj plombę',pieceIndex:index,disabled:!piece.seal}
  ]:[{kind:'photo-unload',icon:'camera',label:`Sztuka ${index+1} · zdjęcie z rozładunku`,hint:piece.photos.unload?'Już dodane — możesz zmienić':piece.seal?'Na rampie lub na ziemi':'Najpierw zeskanuj plombę',pieceIndex:index,disabled:!piece.seal}]);
  const choices=[...pieceChoices,{kind:'cmr',icon:'doc',label:'Dokument CMR',hint:current().documents.length?'Już dodany — możesz dołączyć kolejną stronę':cmrSealReady()?'Wszystkie strony lub plik PDF':'Najpierw zeskanuj plombę CMR',disabled:!cmrSealReady()}];
  return choices.map(choice=>`<button data-attachment-kind="${choice.kind}" ${choice.pieceIndex!==undefined?`data-attachment-piece="${choice.pieceIndex}"`:''} ${choice.disabled?'disabled':''}>${icon(choice.icon)}<span><strong>${esc(choice.label)}</strong><small>${esc(choice.hint)}</small></span>${icon('arrow')}</button>`).join('');
}

function openModal(type,target){
  if(type==='piece-form'&&current().started)return;
  if(type==='attachment'){
    if(!current().started||!current().physicalConfirmed){toast(isLoad()?'Załączniki dodasz po potwierdzeniu wykonania załadunku.':'Załączniki dodasz po potwierdzeniu liczby sztuk do rozładowania.');return;}
    if(target.kind==='cmr'&&!cmrSealReady()){toast(isLoad()?'Najpierw naklej plombę na pustym tyle ostatniej strony CMR i zeskanuj QR.':'Najpierw zeskanuj istniejącą plombę CMR.');return;}
    if(target.kind!=='cmr'&&!current().items[target.pieceIndex]?.seal){toast(isLoad()?'Najpierw naklej i zeskanuj plombę tej sztuki.':'Najpierw zeskanuj istniejącą plombę tej sztuki.');return;}
  }
  if(type==='scan'){
    const collectionEnvelope=target.kind==='collection-envelope';
    const allowed=collectionEnvelope?collectionDocumentsReady()&&collectionGroup().envelope.contentsConfirmed:isLoad()?(target.kind==='cmr'?current().cmrLabel:current().items[target.index]?.label):true;
    if(!allowed)return;
  }
  if(type==='finish'&&!allReady())return;
  if(!state.modal)focusBeforeModal=document.activeElement;
  state.modal={type,target};
  let title='',body='';

  if(type==='piece-form'){
    const editing=target.index!==null,item=editing?current().items[target.index]:null;
    title=editing?'Edytuj szczegóły sztuki':'Dodaj sztukę ładunku';
    body=`<p>${isLoad()?'Każda sztuka otrzyma własną plombę, QR i dwa zdjęcia.':'Każda sztuka będzie miała numer plomby z załadunku, skan QR i zdjęcie z rozładunku.'}</p><label class="field-label" for="piece-name">Nazwa lub rodzaj sztuki *</label><input id="piece-name" class="text-input" maxlength="80" value="${esc(item?.name||'')}" placeholder="np. Skrzynia transportowa 3"><label class="field-label" for="piece-description">Opis zawartości</label><textarea id="piece-description" class="text-input piece-textarea" maxlength="180" placeholder="np. Sprzęt eventowy w opakowaniu">${esc(item?.description||'')}</textarea><div class="piece-form-grid"><label><span class="field-label">Waga w kg</span><input id="piece-mass" class="text-input" type="number" min="0" step="0.1" value="${has(item?.mass)?esc(item.mass):''}" placeholder="120"></label><label><span class="field-label">Wymiary</span><input id="piece-dimensions" class="text-input" maxlength="60" value="${esc(item?.dimensions||'')}" placeholder="120 × 80 × 100 cm"></label></div><p id="piece-error" class="field-error" role="alert"></p><button class="primary-button" id="save-piece">${icon(editing?'check':'plus')}${editing?'Zapisz szczegóły':'Dodaj sztukę'}</button>`;
  }
  if(type==='attachment'){
    const piece=target.kind==='cmr'?null:current().items[target.pieceIndex];
    title=target.kind==='cmr'?'Dodaj skan CMR':target.kind==='photo-near'?`Sztuka ${target.pieceIndex+1} · z bliska`:target.kind==='photo-far'?`Sztuka ${target.pieceIndex+1} · z daleka`:`Sztuka ${target.pieceIndex+1} · zdjęcie z rozładunku`;
    body=`<p>${esc(attachmentDescription(target.kind,piece))}</p>${target.kind==='cmr'?demoDocument():`<img class="photo-preview" src="${demoPhoto(target.kind==='photo-near'?0:1)}" alt="Przykładowe ujęcie ładunku — ilustracja">`}<button class="primary-button" id="choose-file">${icon('camera')}${target.kind==='cmr'?'Aparat, zdjęcia lub PDF':'Aparat lub zdjęcie z urządzenia'}</button><button class="secondary-button" id="use-demo">${target.kind==='cmr'?'Dodaj przykładową stronę':'Wypróbuj na zdjęciu przykładowym'}</button><p class="small-note">${target.source==='chat'?'Załącznik z czatu uzupełni również ekran operacji. ':''}Prototyp: wybrane pliki pozostają w tej karcie i nie są wysyłane do systemu.</p>`;
  }
  if(type==='chat-attach'){
    title='Załącz dokumenty';
    body=`<p>Wybierz konkretną sztukę i ujęcie albo dokument CMR. Kolejność procesu nadal obowiązuje.</p><div class="attachment-kind-list">${attachmentChoices()}</div>`;
  }
  if(type==='fuel-photo'){
    const [,label,hint]=fuelPhotoLabels[target.key];
    target={...target,kind:'fuel-photo',routeStop:'fueling'};
    state.modal.target=target;
    title=label;
    body=`<p>${esc(hint)}.</p><div class="fuel-photo-modal-icon">${icon(fuelPhotoLabels[target.key][0])}</div><button class="primary-button" id="choose-file">${icon('camera')}Aparat lub zdjęcie z urządzenia</button><button class="secondary-button" id="use-demo">Dodaj zdjęcie demonstracyjne</button><p class="small-note">Prototyp: zdjęcie pozostaje w tej karcie i nie jest wysyłane do systemu.</p>`;
  }
  if(type==='service-photo'){
    const meta=target.key==='message'?{title:'Komunikat serwisowy',description:'Zrób zdjęcie kontrolki albo komunikatu widocznego na desce rozdzielczej.',icon:'camera'}:{title:serviceTaskMeta[target.key].title,description:serviceTaskMeta[target.key].description,icon:serviceTaskMeta[target.key].icon};
    title=meta.title;
    body=`<p>${esc(meta.description)}</p><div class="fuel-photo-modal-icon service-photo-modal-icon">${icon(meta.icon)}</div><button class="primary-button" id="choose-file">${icon('camera')}Aparat lub galeria</button><button class="secondary-button" id="use-demo">Dodaj zdjęcie demonstracyjne</button><p class="small-note">Wersja preview: zdjęcie pozostaje tylko na tym urządzeniu i nie jest wysyłane do backendu.</p>`;
  }
  if(type==='inventory-photo'){
    const item=inventoryItem(target.key),status=inventoryStatus(target.key);
    title=status==='missing'?'Zdjęcie braku':'Zdjęcie uszkodzenia';
    body=`<p>Zrób czytelne zdjęcie pozycji „${esc(item.name)}” albo miejsca, w którym powinna się znajdować.</p><div class="fuel-photo-modal-icon service-photo-modal-icon">${icon('camera')}</div><button class="primary-button" id="choose-file">${icon('camera')}Aparat lub galeria</button><button class="secondary-button" id="use-demo">Dodaj zdjęcie demonstracyjne</button><p class="small-note">Wersja preview: zdjęcie pozostaje tylko w tym podglądzie i nie jest wysyłane do backendu.</p>`;
  }
  if(type==='collection-scan'){
    const group=collectionGroup(),source=group?collectionSource(group.sourceId):null,available=group?availableCollectionOrders(group):[];
    const first=available[0];
    target={kind:'collection-document',routeStop:'collection',sourceId:group?.sourceId||null,demoQrCode:first?.qrCode||null};
    state.modal.target=target;
    title=group?`${group.documents.length?'Kolejny':'Pierwszy'} CMR · ${source.name}`:'Najpierw wybierz kierowcę';
    body=available.length?`<p>Odbierasz dokumenty od kierowcy <strong>${esc(source.name)}</strong>. Zeskanowany QR musi należeć do tej osoby.</p><div class="scan-camera"><span class="scan-guide">${icon('qr')}</span><span class="demo-watermark">Skanuj CMR kierowcy ${esc(source.name)}</span></div><button class="primary-button" id="simulate-collection-document">${icon('qr')}Symuluj odczyt QR dokumentu</button><label for="collection-document-qr" class="field-label">Lub wpisz kod QR dokumentu</label><input id="collection-document-qr" class="text-input" autocomplete="off" maxlength="64" placeholder="np. ${esc(first.qrCode)}"><p id="qr-error" class="field-error" role="alert"></p><button class="secondary-button" id="manual-collection-document">Pokaż właściwy skan CMR</button><p class="small-note">Odczyt QR tylko otworzy podgląd. Dokument zostanie przejęty i trafi na górę listy dopiero po Twoim zatwierdzeniu.</p>`:`<p>Wszystkie oczekiwane dokumenty tego kierowcy zostały już przejęte.</p>`;
  }
  if(type==='scan'){
    const collectionEnvelope=target.kind==='collection-envelope',cmr=target.kind==='cmr',piece=collectionEnvelope||cmr?null:current().items[target.index];
    const expected=collectionEnvelope?null:cmr?current().expectedCmrSeal:piece.expectedSeal;
    title=collectionEnvelope?'Plomba koperty':cmr?'Plomba CMR':`Plomba · sztuka ${target.index+1}`;
    const scanInstruction=collectionEnvelope?`Weź dowolną nieużytą plombę, naklej ją na zamknięcie koperty kierowcy ${esc(collectionSource(collectionGroup().sourceId).name)}, a następnie zeskanuj jej QR. Odczytany numer zostanie teraz przypisany do tej koperty.`:isLoad()?(cmr?'Zeskanuj kod QR z etykiety naklejonej na pustym tyle ostatniej strony CMR.':`Skieruj aparat na etykietę fizycznie przyklejoną do opakowania sztuki „${esc(piece.name)}”.`):(cmr?`Zeskanuj plombę znajdującą się na tyle dokumentu CMR. Oczekiwany numer z załadunku: ${esc(expected||'nie zapisano')}.`:`Zeskanuj istniejącą plombę sztuki „${esc(piece.name)}”. Oczekiwany numer z załadunku: ${esc(expected||'nie zapisano')}.`);
    const placeholder=collectionEnvelope?'np. PL-ENV-000123':expected||(cmr?'DEMO-PL-CMR':`DEMO-PL-${String(target.index+1).padStart(2,'0')}`);
    body=`<p>${scanInstruction}</p><div class="scan-camera"><span class="scan-guide">${icon('qr')}</span><span class="demo-watermark">Podgląd skanera — odczyt symulowany</span></div><button class="primary-button" id="simulate-scan">${icon('qr')}Symuluj odczyt QR</button><label for="qr-code" class="field-label">Lub wpisz kod z etykiety</label><input id="qr-code" class="text-input" autocomplete="off" maxlength="64" placeholder="${esc(placeholder)}"><p id="qr-error" class="field-error" role="alert"></p><button class="secondary-button" id="manual-scan">Zatwierdź kod</button>`;
  }
  if(type==='supplied'){
    const photo=optional().photos[target];
    title=photo.name;
    body=`<img class="supplied-full-photo" src="${photo.url}" alt="${esc(photo.name)}"><p>Materiał pomocniczy od zleceniodawcy. Nie zastępuje zdjęć wykonywanych przez kierowcę dla każdej sztuki.</p>${photo.demo?'<p class="small-note">Zdjęcie demonstracyjne do podglądu opcjonalnej sekcji.</p>':''}`;
  }
  if(type==='copy'){title='Numer referencyjny';body=`<input class="text-input" value="${esc(optional().ref)}" readonly aria-label="Numer referencyjny">`;}
  if(type==='cwp-contact'){
    title='Zgłoś rozbieżność spedytorowi';
    body=`<p>Towar lub jego liczba nie zgadza się ze zleceniem ${assignment.id}. Wybierz sposób kontaktu ze spedytorem.</p><div class="cwp-contact-options"><button id="cwp-chat">${icon('chat')}<span><strong>Napisz na czacie</strong><small>Otwórz czat tego zlecenia</small></span>${icon('arrow')}</button><a href="tel:${dispatcher.phone.replace(/[^+0-9]/g,'')}" aria-label="Zadzwoń do spedytora testowego">${icon('phone')}<span><strong>Zadzwoń do spedytora</strong><small>${esc(dispatcher.phone)}${dispatcher.demo?' · numer demonstracyjny':''}</small></span>${icon('arrow')}</a></div><p class="small-note">Prototyp: czat i numer telefonu są demonstracyjne.</p>`;
  }
  if(type==='help'){
    title='Pomoc przy zleceniu';
    body=`<p>${assignment.id} · ${esc(currentPlace().company)}</p><div class="help-options"><button id="help-chat">${icon('chat')}Otwórz czat ze spedytorem</button>${optional().contact?.phone?`<a class="help-contact-link" href="tel:${optional().contact.phone.replace(/[^+0-9]/g,'')}">${icon('phone')}Kontakt na miejscu: ${esc(optional().contact.name)}</a>`:''}</div>`;
  }
  if(type==='route-help'){
    const stop=stopDefinition();
    title=`Pomoc · ${stop.title}`;
    body=`<p>${esc(stop.company)}<br>${esc(stop.address)}</p><div class="help-options"><button id="help-stop-chat">${icon('chat')}Otwórz czat ze spedytorem</button><a class="help-contact-link" href="tel:${dispatcher.phone.replace(/[^+0-9]/g,'')}">${icon('phone')}Zadzwoń do spedytora · ${esc(dispatcher.phone)}</a></div><p class="small-note">Prototyp: kontakt i dane punktu są demonstracyjne.</p>`;
  }
  if(type==='service-help'){
    title='Pomoc · ankieta serwisowa';
    body=`<p>Uzupełnij poziom oleju, poziom AdBlue, dystans do przeglądu oraz zdjęcie wskazania DPF. Każda z czterech pozycji wymaga zdjęcia.</p><div class="help-options"><button id="help-service-chat">${icon('chat')}Otwórz czat ze spedytorem</button></div><p class="small-note">Komunikaty serwisowe i zaznaczenie „Po przeglądzie” są opcjonalne.</p>`;
  }
  if(type==='inventory-help'){
    title='Pomoc · inwentaryzacja';
    body=`<p>Sprawdź wyposażenie przy pojeździe i wybierz stan każdej pozycji. Przy braku lub uszkodzeniu dodaj zdjęcie i krótki opis.</p><div class="help-options"><button id="help-inventory-chat">${icon('chat')}Otwórz czat ze spedytorem</button></div><p class="small-note">Lista w podglądzie jest demonstracyjna. Produkcyjny protokół wymaga zatwierdzonej listy wyposażenia i endpointu zapisu.</p>`;
  }
  if(type==='daily-service'){
    const evening=new Date().getHours()>=15;
    title='Dzisiejsza ankieta serwisowa';
    body=`<div class="service-reminder"><span class="service-reminder-icon">${icon('bell')}</span><strong>Jedna krótka kontrola pojazdu dziennie</strong><p>Zrób zdjęcia wskazań, wpisz poziom oleju, AdBlue i dystans do przeglądu. Możesz zrobić to rano przed trasą albo wieczorem po zakończeniu jazdy.</p><div class="service-reminder-time">${icon('clock')}<span><b>${evening?'Dobry moment: po trasie':'Dobry moment: przed trasą'}</b><small>Po zapisaniu przypomnienie zniknie do następnego dnia.</small></span></div><button class="primary-button service-reminder-primary" id="service-reminder-now">${icon('service')}Wypełnij teraz</button><button class="secondary-button service-reminder-secondary" id="service-reminder-later">${icon('clock')}${evening?'Przypomnij za godzinę':'Przypomnij wieczorem'}</button><button class="service-reminder-skip" id="service-reminder-close">Później — zostaw oznaczenie przy „Serwis”</button><p class="small-note">Wersja offline przypomina po otwarciu aplikacji. Powiadomienie systemowe wymaga integracji natywnej i API.</p></div>`;
  }
  if(type==='finish'){
    title=`Zakończyć ${isLoad()?'załadunek':'rozładunek'}?`;
    const photoTotal=count()*(isLoad()?2:1);
    body=`<p>${isLoad()?'Każda sztuka ma plombę, QR i dwa zdjęcia. Plomba na pustym tyle ostatniej strony CMR oraz pełny skan dokumentu są gotowe.':'Każda sztuka ma zgodny skan plomby i zdjęcie z rozładunku. Plomba CMR oraz pełny skan dokumentu są gotowe.'}</p><div class="summary-line">${icon('check')}Sztuki ładunku <b>${count()}/${count()}</b></div><div class="summary-line">${icon('check')}${isLoad()?'Zdjęcia każdej sztuki':'Zdjęcia z rozładunku'} <b>${photoTotal}/${photoTotal}</b></div><div class="summary-line">${icon('check')}Plomba CMR <b>${esc(current().cmrSeal)}</b></div><div class="summary-line">${icon('check')}Pełny skan CMR <b>OK</b></div><button class="primary-button" id="confirm-finish">${icon('check')}Potwierdź zakończenie</button><p class="small-note">Demonstracja: nie zmieniamy statusu rzeczywistego zlecenia.</p>`;
  }
  if(type==='fuel-break'){
    const recommendation=target.recommendation;
    if(recommendation.action==='SUGGEST_BREAK'){
      title=`Zacząć przerwę ${recommendation.durationMinutes} min?`;
      body=`<div class="fuel-break-modal-recommendation">${icon('clock')}<p><strong>${esc(recommendation.title)}</strong>${esc(recommendation.description)}</p></div><p>Tankowanie i wydatek są zakończone. Czy chcesz teraz rozpocząć zgłoszenie tej przerwy?</p><button class="primary-button" id="fuel-break-start">${icon('clock')}Zacznij przerwę ${recommendation.durationMinutes} min</button><button class="secondary-button" id="fuel-break-continue">Nie, jadę dalej</button><p class="small-note">Tankowanie samo nie jest przerwą. Zgłoszenie nie zastępuje właściwego ustawienia tachografu.</p>`;
    }else{
      title='Sprawdź tachograf';
      body=`<div class="fuel-break-modal-recommendation check">${icon('info')}<p><strong>${esc(recommendation.title)}</strong>${esc(recommendation.description)}</p></div><p>Aplikacja nie potwierdzi, że możesz jechać dalej, dopóki nie ma świeżego odczytu.</p><button class="primary-button" id="fuel-break-check">Rozumiem · zakończ tankowanie</button>`;
    }
  }
  if(type==='reset'){title='Zresetować podgląd?';body='<p>Usuniesz postęp i wybrane pliki z tej demonstracji.</p><button class="primary-button" id="confirm-reset">Zresetuj podgląd</button>';}

  $('#modal-root').innerHTML=`<div class="modal-overlay"><section class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1"><div class="modal-handle"></div><div class="modal-title"><h3 id="modal-title">${title}</h3><button class="icon-button" id="close-modal" aria-label="Zamknij">${icon('close')}</button></div>${body}</section></div>`;
  $('#close-modal').onclick=()=>closeModal();
  $('.modal-overlay').onclick=event=>{if(event.target.classList.contains('modal-overlay'))closeModal();};
  if($('#fuel-break-start'))$('#fuel-break-start').onclick=()=>finishFuelingWithBreakDecision(target.recommendation,'STARTED');
  if($('#fuel-break-continue'))$('#fuel-break-continue').onclick=()=>finishFuelingWithBreakDecision(target.recommendation,'CONTINUE');
  if($('#fuel-break-check'))$('#fuel-break-check').onclick=()=>finishFuelingWithBreakDecision(target.recommendation,'CHECK_TACHOGRAPH');
  $$('[data-attachment-kind]').forEach(button=>button.onclick=()=>openModal('attachment',{kind:button.dataset.attachmentKind,pieceIndex:button.dataset.attachmentPiece!==undefined?Number(button.dataset.attachmentPiece):undefined,source:'chat'}));
  if($('#save-piece'))$('#save-piece').onclick=()=>savePiece(target.index);
  if($('#choose-file'))$('#choose-file').onclick=()=>{
    uploadTarget=target.routeStop?{...target}:{operation:state.operation,...target};
    const input=$('#file-input');
    input.value='';
    input.multiple=target.kind==='cmr';
    input.accept=target.kind==='cmr'?'image/*,application/pdf':'image/*';
    if(target.kind==='cmr')input.removeAttribute('capture');else input.setAttribute('capture','environment');
    input.click();
  };
  if($('#use-demo'))$('#use-demo').onclick=()=>{
    if(target.inventory){
      const previous=state.inventoryProtocol.photos[target.key],item=inventoryItem(target.key);
      revoke(previous);
      state.inventoryProtocol.photos[target.key]={hash:`demo-inventory-${target.key}`,demo:true,kind:'inventory-photo',name:`Niezgodność · ${item.name}`,mime:'image/svg+xml',url:demoPhoto(target.key==='extinguisher'||target.key==='triangle'?0:1),source:'inventory-protocol'};
      markInventoryEdited();
      state.inventoryProtocol.confirmed=false;
      closeModal(false);
      render();
      toast('Zdjęcie niezgodności zostało dodane do protokołu.');
      return;
    }
    if(target.service){
      const previous=state.serviceSurvey.photos[target.key];
      revoke(previous);
      state.serviceSurvey.photos[target.key]={hash:`demo-service-${target.key}`,demo:true,kind:'service-photo',name:target.key==='message'?'Komunikat serwisowy':serviceTaskMeta[target.key].title,mime:'image/svg+xml',url:demoPhoto(target.key==='adBlue'||target.key==='dpf'?1:0),source:'service-survey'};
      markServiceEdited();
      closeModal(false);
      render();
      toast('Zdjęcie do ankiety serwisowej zostało dodane.');
      return;
    }
    if(target.routeStop==='fueling'){
      const previous=state.routeStops.fueling.photos[target.key];
      revoke(previous);
      state.routeStops.fueling.photos[target.key]={hash:`demo-fuel-${target.key}`,demo:true,kind:'fuel-photo',name:fuelPhotoLabels[target.key][1],mime:'image/svg+xml',url:demoPhoto(target.key==='receipt'?0:1),source:'fuel-operation'};
      closeModal(false);
      render();
      toast('Zdjęcie z tankowania zostało dodane.');
      return;
    }
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
  if($('#simulate-collection-document'))$('#simulate-collection-document').onclick=()=>saveQR(target,target.demoQrCode||'');
  if($('#manual-collection-document'))$('#manual-collection-document').onclick=()=>saveQR(target,$('#collection-document-qr').value);
  if($('#collection-document-qr'))$('#collection-document-qr').onkeydown=event=>{if(event.key==='Enter')saveQR(target,event.target.value);};
  if($('#simulate-scan'))$('#simulate-scan').onclick=()=>{
    const collectionEnvelope=target.kind==='collection-envelope';
    const sealSuffix=collectionGroup().sourceId.endsWith('-b')?'B':'A';
    const fallback=collectionEnvelope?`DEMO-SEAL-${sealSuffix}-001`:target.kind==='cmr'?'DEMO-PL-CMR':`DEMO-PL-${String(target.index+1).padStart(2,'0')}`;
    const expected=collectionEnvelope?null:target.kind==='cmr'?current().expectedCmrSeal:current().items[target.index]?.expectedSeal;
    saveQR(target,(collectionEnvelope||!isLoad())&&expected||fallback);
  };
  if($('#manual-scan'))$('#manual-scan').onclick=()=>saveQR(target,$('#qr-code').value);
  if($('#qr-code'))$('#qr-code').onkeydown=event=>{if(event.key==='Enter')saveQR(target,event.target.value);};
  if($('#cwp-chat'))$('#cwp-chat').onclick=()=>go('chat');
  if($('#help-chat'))$('#help-chat').onclick=()=>go('chat');
  if($('#help-stop-chat'))$('#help-stop-chat').onclick=()=>goStop('chat');
  if($('#help-service-chat'))$('#help-service-chat').onclick=()=>{closeModal(false);state.serviceOpen=false;state.routeStop?goStop('chat'):go('chat');};
  if($('#help-inventory-chat'))$('#help-inventory-chat').onclick=()=>{closeModal(false);state.serviceOpen=false;state.routeStop?goStop('chat'):go('chat');};
  if($('#service-reminder-now'))$('#service-reminder-now').onclick=()=>openService('survey');
  if($('#service-reminder-later'))$('#service-reminder-later').onclick=()=>{const when=postponeServiceReminder();closeModal(false);updateServiceNavIndicator();toast(`Przypomnimy ${when}.`);};
  if($('#service-reminder-close'))$('#service-reminder-close').onclick=()=>{closeModal();updateServiceNavIndicator();};
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
    const piece=operation.items[record.pieceIndex],side=record.kind==='photo-near'?'near':record.kind==='photo-far'?'far':'unload';
    revoke(piece.photos[side]);
    piece.photos[side]=record;
  }
  return true;
}

function saveQR(target,raw){
  const code=raw.trim().toUpperCase();
  if(!/^[A-Z0-9][A-Z0-9._/-]{3,63}$/.test(code)){$('#qr-error').textContent='Wpisz kod z etykiety: minimum 4 znaki, bez spacji.';return;}
  if(target.kind==='collection-document'){
    const group=collectionGroup();
    const order=collectionOrders.find(item=>item.qrCode===code);
    if(!order){$('#qr-error').textContent='Nie znaleziono dokumentu dla tego kodu QR. Sprawdź etykietę albo zgłoś brak spedytorowi.';return;}
    if(collection().groups.some(item=>item.documents.some(record=>record.handoverId===order.id)||item.pendingDocument?.handoverId===order.id)){$('#qr-error').textContent='Ten QR został już odczytany. Najpierw zakończ wyświetloną weryfikację dokumentu.';return;}
    if(!group){$('#qr-error').textContent='Najpierw wróć do listy i wybierz kierowcę, od którego odbierasz dokumenty.';return;}
    if(group.pendingDocument){$('#qr-error').textContent='Najpierw zatwierdź albo odrzuć dokument, który jest już wyświetlony.';return;}
    if(order.sourceId!==group.sourceId){$('#qr-error').textContent=`Ten dokument należy do innego kierowcy: ${collectionSource(order.sourceId).name}. Nie wkładaj go do tej koperty.`;return;}
    group.pendingDocument={id:`collection-document-${Date.now()}`,hash:`tms-scan-${order.id}`,demo:true,kind:'collection-cmr-reference',mime:'image/svg+xml',name:`CMR-${order.orderId}`,handoverId:order.id,sourceId:order.sourceId,orderId:order.orderId,qrCode:order.qrCode,unloadedAt:order.unloadedAt,scannedAt:new Date().toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'}),confirmed:false,acceptedAt:null};
    group.envelope.contentsConfirmed=false;
    closeModal(false);
    state.screen='photos';
    collection().screen='photos';
    render();
    toast('QR odczytany. Sprawdź podgląd CMR i zatwierdź dokument.');
    return;
  }
  if(target.kind==='collection-envelope'){
    const group=collectionGroup();
    if(!collectionDocumentsReady(group)||!group.envelope.contentsConfirmed)return;
    const usedByAnother=collection().groups.some(item=>item.sourceId!==group.sourceId&&item.envelope.sealCode===code);
    if(usedByAnother){$('#qr-error').textContent='Ten numer plomby zamyka już kopertę innego kierowcy.';return;}
    group.envelope.sealCode=code;
    group.envelope.sealedAt=new Date().toISOString();
    closeModal(false);
    render();
    toast('Plomba została przypisana podczas skanowania. Koperta jest zamknięta.');
    return;
  }
  const used=[...current().items.map(item=>item.seal),current().cmrSeal];
  const ownIndex=target.kind==='cmr'?count():target.index;
  if(used.some((value,index)=>index!==ownIndex&&value===code)){$('#qr-error').textContent='Ten kod przypisano już do innej sztuki lub dokumentu. Każda plomba musi mieć unikalny QR.';return;}
  if(!isLoad()){
    const expected=target.kind==='cmr'?current().expectedCmrSeal:current().items[target.index]?.expectedSeal;
    if(expected&&code!==expected){$('#qr-error').textContent=`Kod nie pasuje do tej pozycji. W przykładzie oczekujemy: ${expected}.`;return;}
  }
  if(target.kind==='cmr')current().cmrSeal=code;else current().items[target.index].seal=code;
  closeModal(false);
  render();
  toast(target.kind==='cmr'?(isLoad()?'Plomba CMR została odczytana.':'Plomba CMR jest zgodna z załadunkiem.'):(isLoad()?'Plomba została przypisana do tej sztuki ładunku.':'Plomba sztuki jest zgodna z załadunkiem.'));
}

function reset(){
  cancelArrivalCountdown(false);
  Object.values(state.operations).forEach(operation=>{operation.items.forEach(revokePiece);operation.documents.forEach(revoke);});
  Object.values(state.routeStops).forEach(stop=>{if(stop.photos)Object.values(stop.photos).forEach(revoke);});
  collection().groups.forEach(group=>{group.documents.forEach(revoke);revoke(group.pendingDocument);});
  Object.values(state.serviceSurvey.photos).forEach(revoke);
  Object.values(state.inventoryProtocol.photos).forEach(revoke);
  state.operations={load:fresh('load'),unload:fresh('unload')};
  state.routeStops={collection:freshDocumentCollection(),parking:freshRouteStop('parking'),fueling:freshRouteStop('fueling')};
  state.serviceSurvey=freshServiceSurvey();
  state.inventoryProtocol=freshInventoryProtocol();
  clearServiceDailyRecord();
  state.serviceOpen=false;
  state.servicePanel='survey';
  state.operation='load';
  state.routeStop=null;
  state.scenario='basic';
  state.language='pl';
  state.manualLanguage=false;
  nativeReset();
  if(androidShell)state.operations.load.arrived=false;
  go(androidShell?'travel':'info');
  toast('Podgląd został zresetowany.');
}

async function readImage(url){return new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(true);image.onerror=()=>resolve(false);image.src=url;});}

$('#file-input').onchange=async event=>{
  const files=[...event.target.files];
  if(!files.length||!uploadTarget||uploadBusy)return;
  uploadBusy=true;
  const target={...uploadTarget};
  let added=0;
  if(target.inventory){
    try{
      const file=files[0];
      if(!file.type.startsWith('image/')){toast('Wybierz zdjęcie JPG, PNG lub WebP.');return;}
      if(file.size>20*1024*1024){toast('Wybierz zdjęcie do 20 MB.');return;}
      const url=URL.createObjectURL(file);
      if(!await readImage(url)){URL.revokeObjectURL(url);toast('Nie udało się odczytać zdjęcia.');return;}
      const previous=state.inventoryProtocol.photos[target.key];
      revoke(previous);
      state.inventoryProtocol.photos[target.key]={hash:`inventory-${target.key}-${Date.now()}`,url,blob:file,name:file.name,mime:file.type,demo:false,kind:'inventory-photo',source:'inventory-protocol'};
      markInventoryEdited();
      state.inventoryProtocol.confirmed=false;
      closeModal(false);
      render();
      toast('Zdjęcie niezgodności zostało dodane do protokołu.');
    }catch(error){toast('Nie udało się dodać zdjęcia. Spróbuj ponownie.');}
    finally{uploadBusy=false;}
    return;
  }
  if(target.service){
    try{
      const file=files[0];
      if(!file.type.startsWith('image/')){toast('Wybierz zdjęcie JPG, PNG lub WebP.');return;}
      if(file.size>20*1024*1024){toast('Wybierz zdjęcie do 20 MB.');return;}
      const url=URL.createObjectURL(file);
      if(!await readImage(url)){URL.revokeObjectURL(url);toast('Nie udało się odczytać zdjęcia.');return;}
      const previous=state.serviceSurvey.photos[target.key];
      revoke(previous);
      state.serviceSurvey.photos[target.key]={hash:`service-${target.key}-${Date.now()}`,url,blob:file,name:file.name,mime:file.type,demo:false,kind:'service-photo',source:'service-survey'};
      markServiceEdited();
      closeModal(false);
      render();
      toast('Zdjęcie do ankiety serwisowej zostało dodane.');
    }catch(error){toast('Nie udało się dodać zdjęcia. Spróbuj ponownie.');}
    finally{uploadBusy=false;}
    return;
  }
  if(target.routeStop==='fueling'){
    try{
      const file=files[0];
      if(!file.type.startsWith('image/')){toast('Wybierz zdjęcie JPG, PNG lub WebP.');return;}
      if(file.size>20*1024*1024){toast('Wybierz zdjęcie do 20 MB.');return;}
      const url=URL.createObjectURL(file);
      if(!await readImage(url)){URL.revokeObjectURL(url);toast('Nie udało się odczytać zdjęcia.');return;}
      const previous=state.routeStops.fueling.photos[target.key];
      revoke(previous);
      state.routeStops.fueling.photos[target.key]={hash:`fuel-${target.key}-${Date.now()}`,url,name:file.name,mime:file.type,demo:false,kind:'fuel-photo',source:'fuel-operation'};
      closeModal(false);
      render();
      toast('Zdjęcie z tankowania zostało dodane.');
    }catch(error){toast('Nie udało się dodać zdjęcia. Spróbuj ponownie.');}
    finally{uploadBusy=false;}
    return;
  }
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
$$('[data-route-stop]').forEach(button=>button.onclick=()=>switchRouteStop(button.dataset.routeStop,button.dataset.routeStop==='collection'?'info':'travel'));
$$('[data-service-preview]').forEach(button=>button.onclick=()=>openService(button.dataset.servicePreview));
$$('.screen-list [data-screen]').forEach(button=>button.onclick=()=>state.routeStop?goStop(button.dataset.screen):go(button.dataset.screen));
$('#scenario-select').onchange=event=>switchScenario(event.target.value);
$('#mobile-scenario').onchange=event=>switchScenario(event.target.value);
$$('[data-nav]').forEach(button=>button.onclick=()=>{
  if(button.dataset.nav==='service'){openService();return;}
  if(state.serviceOpen){
    if(button.dataset.nav==='now')closeService();
    if(button.dataset.nav==='chat'){state.serviceOpen=false;state.routeStop?goStop('chat'):go('chat');}
    if(button.dataset.nav==='help')openModal(state.servicePanel==='inventory'?'inventory-help':'service-help',{});
    return;
  }
  if(state.routeStop){
    if(button.dataset.nav==='now')goStop(currentStop().finished?'review':currentStop().returnScreen==='chat'?'travel':currentStop().screen==='chat'?(currentStop().returnScreen||'travel'):currentStop().screen);
    if(button.dataset.nav==='chat')goStop('chat');
    if(button.dataset.nav==='help')openModal('route-help');
    return;
  }
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

let backendState={status:'disconnected',message:'Zaloguj się kontem kierowcy Super Spedytora'};
const backendCountryName=code=>({PL:'Polska',DE:'Niemcy',FR:'Francja',NL:'Holandia',BE:'Belgia',IT:'Włochy',ES:'Hiszpania',CZ:'Czechy',SK:'Słowacja',AT:'Austria',DK:'Dania',SE:'Szwecja'}[String(code||'').toUpperCase()]||code||'');
const backendPointPlace=point=>{
  const location=point?.location_details||{};
  return {
    company:point?.location_name||location.label||point?.operation_type_display||'Punkt trasy',
    address:point?.location_address||location.full_address||'',
    country:location.country||'',
    countryName:backendCountryName(location.country),
    latitude:location.latitude,
    longitude:location.longitude
  };
};
const backendPointCard=(point,label)=>{
  if(!point)return `<section class="backend-point backend-point-empty"><small>${esc(label)}</small><strong>Brak punktu w odpowiedzi backendu</strong></section>`;
  const place=backendPointPlace(point);
  const time=point.live_eta_datetime||point.eta_datetime||point.time_window_start||'';
  const status=point.status_display||point.status||'';
  const canNavigate=(has(place.latitude)&&has(place.longitude))||has(place.address);
  return `<section class="backend-point"><div class="backend-point-heading"><span>${icon(label==='TERAZ'?'pin':'route')}</span><div><small>${esc(label)}${status?` · ${esc(status)}`:''}</small><strong>${esc(place.company)}</strong></div></div>${place.address?`<p>${esc(place.address)}</p>`:''}<div class="backend-point-meta">${place.country?`<span>${esc(place.country)}${place.countryName?` · ${esc(place.countryName)}`:''}</span>`:''}${time?`<span>${esc(time)}</span>`:''}</div>${canNavigate?`<a class="backend-navigate" href="${navigationUrl(place)}" target="_blank" rel="noopener">${icon('nav')} Nawiguj do punktu</a>`:''}</section>`;
};
function backendPanel(){
  let panel=$('#backend-panel');
  if(panel)return panel;
  panel=document.createElement('section');
  panel.id='backend-panel';
  panel.className='backend-panel';
  panel.setAttribute('aria-live','polite');
  $('.device')?.insertBefore(panel,$('.app-scroll'));
  return panel;
}
function renderBackendPanel(){
  if(!backendMode)return;
  const panel=backendPanel();
  if(!panel)return;
  const status=backendState?.status||'disconnected';
  if(status==='connecting'){
    panel.innerHTML=`<div class="backend-gate"><div class="backend-loader" aria-hidden="true"></div><h2>Łączenie z Super Spedytorem</h2><p>${esc(backendState.message||'Pobieranie danych kierowcy…')}</p></div>`;
    return;
  }
  if(status==='connected'){
    const profile=backendState.profile||{};
    const vehicle=backendState.vehicle||profile.driver_profile?.current_vehicle||null;
    const routeStatus=backendState.route_status||{};
    const route=(routeStatus.active_routes||[])[0]||null;
    const driverName=routeStatus.driver_name||`${profile.first_name||''} ${profile.last_name||''}`.trim()||profile.username||'Kierowca';
    const progress=route?Number(route.progress_percentage||0):0;
    panel.innerHTML=`<div class="backend-live"><div class="backend-live-top"><div><span class="backend-readonly">${icon('signal')} POŁĄCZONO · TYLKO ODCZYT</span><h2>${esc(driverName)}</h2><p>${vehicle?.registration_number?`Pojazd ${esc(vehicle.registration_number)}`:'Brak pojazdu przypisanego do aktywnej trasy'}</p></div><button id="backend-refresh" class="backend-icon-button" aria-label="Odśwież dane">↻</button></div>${route?`<section class="backend-route-summary"><div><small>AKTYWNA TRASA</small><strong>${esc(route.route_name||`Trasa ${route.route_id}`)}</strong><span>${Number(route.completed_points||0)} z ${Number(route.total_points||0)} punktów</span></div><b>${Math.round(progress)}%</b><div class="backend-progress"><span style="width:${Math.max(0,Math.min(100,progress))}%"></span></div></section>${backendPointCard(route.current_point,'TERAZ')}${backendPointCard(route.next_point,'NASTĘPNIE')}`:`<section class="backend-no-route">${icon('route')}<h3>Brak aktywnej trasy</h3><p>Backend potwierdził konto kierowcy, ale nie zwrócił obecnie aktywnej trasy.</p></section>`}<div class="backend-readonly-note">${icon('info')}<p><strong>Dane pochodzą z Super Spedytora.</strong>Ten etap integracji nie wysyła potwierdzeń przyjazdu, zdjęć ani CMR-ów.</p></div><button id="backend-logout" class="backend-logout">Wyloguj z aplikacji</button></div>`;
    $('#backend-refresh',panel).onclick=()=>window.SuperSpedytorNative?.backendRefresh();
    $('#backend-logout',panel).onclick=()=>window.SuperSpedytorNative?.backendLogout();
    return;
  }
  const error=status==='error'?backendState.message:'';
  panel.innerHTML=`<form id="backend-login" class="backend-login" autocomplete="off"><span class="backend-login-mark">${icon('truck')}</span><small>SUPERSPEDYTOR · BACKEND</small><h2>Zaloguj kierowcę</h2><p>Połączenie pobierze profil, aktualny pojazd i własną aktywną trasę.</p>${error?`<div class="backend-error" role="alert">${icon('info')} ${esc(error)}</div>`:''}<label><span>Login</span><input id="backend-username" name="username" autocomplete="off" autocapitalize="none" required></label><label><span>Hasło</span><input id="backend-password" name="password" type="password" autocomplete="off" required></label><button type="submit">${icon('signal')} Połącz z Super Spedytorem</button><div class="backend-security">${icon('check')} Aplikacja nie zapisuje loginu, hasła ani tokenów. Sesja kończy się przy restarcie.</div></form>`;
  $('#backend-login',panel).onsubmit=event=>{
    event.preventDefault();
    const username=$('#backend-username',panel).value;
    const password=$('#backend-password',panel).value;
    $('#backend-password',panel).value='';
    window.SuperSpedytorNative?.backendLogin(username,password);
  };
}
window.SuperSpedytorBackend={
  receive(raw){
    try{backendState=typeof raw==='string'?JSON.parse(raw):raw;}
    catch{backendState={status:'error',message:'Aplikacja otrzymała nieprawidłową odpowiedź'};}
    renderBackendPanel();
  }
};
function initializeBackendPanel(){
  if(!backendMode)return;
  try{
    const initial=window.SuperSpedytorNative?.backendState();
    if(initial)window.SuperSpedytorBackend.receive(initial);
    else renderBackendPanel();
  }catch{
    backendState={status:'error',message:'Warstwa natywna aplikacji jest niedostępna'};
    renderBackendPanel();
  }
}

if(previewMode){
  const chip=$('.driver-chip');
  if(chip){
    chip.textContent='PREVIEW · OFFLINE';
    chip.setAttribute('title','Wariant pokazowy bez połączenia z backendem');
  }
}

if(backendMode){
  const chip=$('.driver-chip');
  if(chip){
    chip.textContent='BACKEND · ODCZYT';
    chip.setAttribute('title','Dane kierowcy pobierane z Super Spedytora bez zapisu');
  }
}

if(androidShell){
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href]');
    if(!link)return;
    const url=link.href;
    if(!/^(https?:|tel:|geo:|google\.navigation:)/i.test(url))return;
    event.preventDefault();
    nativeOpenExternal(url);
  },true);
}

render();
initializeBackendPanel();
if(!backendMode){
  initializeServiceSurveyStorage().catch(()=>{
    maybeShowDailyServiceReminder();
    scheduleServiceSurveyExpiry();
  });
  document.addEventListener('visibilitychange',async()=>{
    if(document.hidden)return;
    const expired=await expireServiceSurveyDataIfNeeded();
    const restored=await restoreServiceSurveyForToday();
    ensureServiceSurveyToday();
    if(expired||restored)render();
    updateServiceNavIndicator();
    maybeShowDailyServiceReminder();
    scheduleServiceSurveyExpiry();
  });
}
