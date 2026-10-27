'use strict';

const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const icon=name=>`<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const has=value=>value!==null&&value!==undefined&&String(value).trim()!=='';
const hasOwn=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const materialWord=value=>value===1?'materiał':(value%10>=2&&value%10<=4&&(value%100<12||value%100>14)?'materiały':'materiałów');
const dispatcher={name:'Spedytor testowy',phone:'+48 000 000 000',demo:true};
const mapTarget=place=>has(place.latitude)&&has(place.longitude)?`${place.latitude},${place.longitude}`:(place.address||`${place.company}, ${place.countryName}`);
const locationUrl=place=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapTarget(place))}`;
const navigationUrl=place=>`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapTarget(place))}`;
const androidShell=document.documentElement.classList.contains('android-shell');
const driverBridge=window.SuperSpedytorNative||window.SuperSpedytorWeb;
const browserBackend=Boolean(window.SuperSpedytorWeb)&&!window.SuperSpedytorNative;
const installedAppVersion=(()=>{try{return driverBridge?.getAppVersion?.()||'';}catch{return '';}})();
const appQuery=new URLSearchParams(window.location.search);
const productionScope=appQuery.get('production')==='1';
const privacyPolicyUrl=(()=>{
  try{
    const value=driverBridge?.getPrivacyPolicyUrl?.();
    if(!value)return '';
    const url=new URL(value);
    return url.protocol==='https:'&&url.hostname&&!url.username&&!url.password?url.href:'';
  }catch{return '';}
})();
const privacyPolicyLink=()=>privacyPolicyUrl?`<a class="backend-privacy-link" href="${esc(privacyPolicyUrl)}">Polityka prywatności</a>`:'';
const previewMode=appQuery.get('preview')==='1';
const nativeBackendAvailable=(()=>{try{return androidShell&&Boolean(driverBridge?.backendEnabled());}catch{return false;}})();
const backendMode=nativeBackendAvailable&&appQuery.get('backend')==='1';
const attachmentLimitBytes=100*1024*1024;
let transshipmentPreviewRole='receiver';
let collectionPreviewRole=appQuery.get('cmrView')==='handover'?'transferor':'receiver';
const operationTimingModel=window.SuperSpedytorOperationTiming;
const serviceWizardModel=window.SuperSpedytorServiceSurvey;
const vehicleHandoverModel=window.SuperSpedytorVehicleHandover;
const transshipmentModel=window.SuperSpedytorTransshipment;
const liveOperationModel=window.SuperSpedytorLiveOperation;
document.documentElement.classList.toggle('backend-mode',backendMode);
document.documentElement.classList.toggle('production-scope',productionScope);
function tachoReadOnlyAvailable(){
  try{return backendMode&&!previewMode&&driverBridge?.tachoReadOnlyEnabled?.()===true;}catch{return false;}
}
document.documentElement.classList.toggle('tacho-readonly-capable',tachoReadOnlyAvailable());
if(productionScope)$$('[data-nav="tacho"],[data-nav="chat"],[data-nav="service"]').forEach(button=>{
  if(button.dataset.nav==='tacho'&&tachoReadOnlyAvailable())return;
  button.hidden=true;button.disabled=true;
});
const routePointIds={load:'demo-loading-1',unload:'demo-unloading-1',collection:'demo-document-collection-1',transshipment:'demo-transshipment-1',parking:'demo-parking-1',fueling:'demo-fueling-1'};
const nativeHasArrival=stopId=>{
  try{return androidShell&&Boolean(driverBridge?.hasArrival(stopId));}catch{return false;}
};
const nativeConfirmArrival=operation=>{
  try{if(androidShell)driverBridge?.markArrivalConfirmed(routePointIds[operation]);}catch{}
};
const nativeReset=()=>{
  try{if(androidShell)driverBridge?.resetDemo();}catch{}
};
const nativeOpenExternal=url=>{
  try{if(androidShell)driverBridge?.openExternal(url);}catch{}
};

const pickup={company:'Magazyn demonstracyjny Alfa',address:'Punkt demonstracyjny A · Warszawa',country:'PL',countryName:'Polska',latitude:52.22970,longitude:21.01220};
const delivery={company:'Centrum demonstracyjne Beta',address:'Punkt demonstracyjny B · Poznań',country:'PL',countryName:'Polska',latitude:52.40640,longitude:16.92520};
let assignment={
  id:'DEMO/0001',
  pickup,
  delivery,
  cargo:{name:'Sprzęt w skrzyniach transportowych',quantity:2,unit:'skrzynie',mass:240,dimensions:'120 × 80 × 100 cm / szt.',demo:true}
};
const demoOperationPlan=[
  {
    key:'load',sequence:1,type:'Załadunek',appointment:'08:00',arrivalLeadMinutes:15,
    place:pickup,cargo:`${assignment.cargo.quantity} ${assignment.cargo.unit} · ${assignment.cargo.mass} kg`,
    goods:assignment.cargo.name
  },
  {
    key:'unload',sequence:2,type:'Rozładunek',eta:'11:20',
    place:delivery,cargo:`${assignment.cargo.quantity} ${assignment.cargo.unit} · ${assignment.cargo.mass} kg`,
    goods:assignment.cargo.name
  }
];
const routeStopDefinitions={
  transshipment:{
    title:'Przeładunek',genitive:'przeładunek',icon:'box',country:'DE',countryName:'Niemcy',
    company:'Autohof demonstracyjny Kassel',address:'Punkt spotkania kierowców · DE-34123 Kassel',
    note:'Odbiór zleceń od dwóch kierowców · wspólny plan ułożenia auta'
  },
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
  {id:'driver-demo-a',name:'Marek Nowak',vehicle:'Zestaw 01',color:'blue',initials:'MN'},
  {id:'driver-demo-b',name:'Piotr Wiśniewski',vehicle:'Zestaw 02',color:'violet',initials:'PW'}
];
const collectionOrders=[
  {id:'handover-demo-1',sourceId:'driver-demo-a',orderId:'DEMO/CMR/0001',qrCode:'DEMO-CMR-0001',unloadedAt:'11 paź · 16:40'},
  {id:'handover-demo-2',sourceId:'driver-demo-b',orderId:'DEMO/CMR/0002',qrCode:'DEMO-CMR-0002',unloadedAt:'12 paź · 08:15'},
  {id:'handover-demo-3',sourceId:'driver-demo-a',orderId:'DEMO/CMR/0003',qrCode:'DEMO-CMR-0003',unloadedAt:'12 paź · 09:20'},
  {id:'handover-demo-4',sourceId:'driver-demo-b',orderId:'DEMO/CMR/0004',qrCode:'DEMO-CMR-0004',unloadedAt:'12 paź · 10:45'},
  {id:'handover-demo-5',sourceId:'driver-demo-a',orderId:'DEMO/CMR/0005',qrCode:'DEMO-CMR-0005',unloadedAt:'12 paź · 12:10'},
  {id:'handover-demo-6',sourceId:'driver-demo-b',orderId:'DEMO/CMR/0006',qrCode:'DEMO-CMR-0006',unloadedAt:'12 paź · 13:35'},
  {id:'handover-demo-7',sourceId:'driver-demo-a',orderId:'DEMO/CMR/0007',qrCode:'DEMO-CMR-0007',unloadedAt:'12 paź · 15:05'},
  {id:'handover-demo-8',sourceId:'driver-demo-b',orderId:'DEMO/CMR/0008',qrCode:'DEMO-CMR-0008',unloadedAt:'12 paź · 17:20'},
  {id:'handover-demo-9',sourceId:'driver-demo-a',orderId:'DEMO/CMR/0009',qrCode:'DEMO-CMR-0009',unloadedAt:'13 paź · 07:30'},
  {id:'handover-demo-10',sourceId:'driver-demo-b',orderId:'DEMO/CMR/0010',qrCode:'DEMO-CMR-0010',unloadedAt:'13 paź · 08:10'},
  {id:'handover-demo-11',sourceId:'driver-demo-a',orderId:'DEMO/CMR/0011',qrCode:'DEMO-CMR-0011',unloadedAt:'13 paź · 09:15'},
  {id:'handover-demo-12',sourceId:'driver-demo-b',orderId:'DEMO/CMR/0012',qrCode:'DEMO-CMR-0012',unloadedAt:'13 paź · 10:40'}
];
const collectionModel=window.SuperSpedytorCmrCollection;
const collectionScenarios={complete:'Komplet dokumentów',missing:'Brakuje 1 CMR · 5 z 6',foreign:'Szósty CMR od innej osoby'};
const transshipmentPlan={
  id:'TS/DEMO/2026/001',
  ownerVersion:41,
  sourceDriver:{id:'driver-demo-transfer',name:'Adam Kowalski',vehicle:'DEMO 03 · ciągnik + naczepa'},
  receiverVehicle:{id:'vehicle-demo-receiver',registration:'DEMO 04',label:'Twój pojazd · DEMO 04'},
  retainedOrders:[
    {id:'DEMO/TS/750',goods:'Skrzynia techniczna',massKg:250,currentPlacement:'Przy kabinie',unload:{sequence:6,company:'Magazyn demonstracyjny Kiel',city:'DE-24103 Kiel',appointment:'16 paź · 14:00'},cmr:{expectedSeal:'CMR-KIE-750',pages:1},pieces:[{id:'TS-750-1',name:'Skrzynia techniczna',expectedSeal:'LAD-750-A'}]},
    {id:'DEMO/TS/200',goods:'Stojak ekspozycyjny',massKg:90,currentPlacement:'W środkowej części auta',unload:{sequence:1,company:'Punkt demonstracyjny Kassel',city:'DE-34123 Kassel',appointment:'14 paź · 07:00'},cmr:{expectedSeal:'CMR-KAS-200',pages:1},pieces:[{id:'TS-200-1',name:'Stojak ekspozycyjny',expectedSeal:'LAD-200-A'}]}
  ],
  outgoingOrders:[
    {id:'DEMO/TS/110',goods:'Skrzynia nagłośnieniowa',massKg:300,receiverVehicle:{id:'vehicle-demo-transfer',registration:'DEMO 03',driverName:'Adam Kowalski'},unload:{sequence:1,company:'Punkt demonstracyjny Frankfurt',city:'DE-60311 Frankfurt',appointment:'14 paź · 12:00'},cmr:{expectedSeal:'CMR-FRA-110',pages:2},pieces:[{id:'TS-110-1',name:'Skrzynia nagłośnieniowa',expectedSeal:'LAD-110-A',photoIndex:0}]}
  ],
  orders:[
    {id:'DEMO/TS/640',sourceDriver:{id:'driver-demo-d',name:'Tomasz Zieliński',vehicle:'DEMO 05'},goods:'Skrzynia oświetleniowa',massKg:180,unload:{sequence:5,company:'Centrum demonstracyjne Hamburg',city:'DE-20095 Hamburg',appointment:'16 paź · 09:00',plannedAt:'2026-10-16T09:00:00+02:00'},cmr:{expectedSeal:'CMR-HAM-640',pages:1},pieces:[{id:'TS-640-1',name:'Skrzynia oświetleniowa',description:'Sprzęt oświetleniowy · 100 × 80 cm',expectedSeal:'LAD-640-A',photoIndex:1}]},
    {
      id:'DEMO/TS/310',customerRef:'REF-POZ-310',goods:'2 skrzynie eventowe',massKg:420,
      unload:{sequence:2,company:'Centrum demonstracyjne Poznań',city:'PL-60-101 Poznań',appointment:'14 paź · 09:00',plannedAt:'2026-10-14T09:00:00+02:00'},
      cmr:{expectedSeal:'CMR-POZ-310',pages:2},
      pieces:[
        {id:'TS-310-1',name:'Skrzynia eventowa A',description:'Czarna skrzynia flight-case · 120 × 80 cm',expectedSeal:'LAD-310-A',photoIndex:0},
        {id:'TS-310-2',name:'Skrzynia eventowa B',description:'Czarna skrzynia flight-case · 120 × 80 cm',expectedSeal:'LAD-310-B',photoIndex:1}
      ]
    },
    {
      id:'DEMO/TS/420',customerRef:'REF-BER-420',goods:'Paleta EUR',massKg:680,
      unload:{sequence:3,company:'Messe Berlin · brama 7',city:'DE-14055 Berlin',appointment:'15 paź · 08:00',plannedAt:'2026-10-15T08:00:00+02:00'},
      cmr:{expectedSeal:'CMR-BER-420',pages:3},
      pieces:[
        {id:'TS-420-1',name:'Paleta EUR · owinięta folią',description:'1 paleta · 120 × 80 × 145 cm',expectedSeal:'LAD-420-A',photoIndex:1}
      ]
    },
    {
      id:'DEMO/TS/530',customerRef:'REF-HAN-530',goods:'Kontener transportowy',massKg:510,
      unload:{sequence:4,company:'Hannover Expo · hala 3',city:'DE-30521 Hannover',appointment:'15 paź · 13:00',plannedAt:'2026-10-15T13:00:00+02:00'},
      cmr:{expectedSeal:'CMR-HAN-530',pages:2},
      pieces:[
        {id:'TS-530-1',name:'Kontener transportowy',description:'Srebrny kontener na kołach · 140 × 90 cm',expectedSeal:'LAD-530-A',photoIndex:0}
      ]
    }
  ]
};
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
  mass:'mass' in values?values.mass:120,
  dimensions:'dimensions' in values?values.dimensions:'120 × 80 × 100 cm',
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
  cmrReturnCode:null,
  cmrRetained:false,
  expectedCmrSeal:values.expectedCmrSeal||(mode==='unload'?'DEMO-PL-CMR':null),
  loadingDocuments:mode==='unload'?(values.loadingDocuments||demoLoadingDocuments()):[],
  documents:[],
  documentsComplete:false,
  messages:[],
  finished:false,
  timing:{
    startedAt:null,
    endedAt:null,
    offsetSeconds:0,
    acknowledgedThreshold:0,
    response:null,
    responseAt:null,
    alertedThreshold:0,
    renderedStage:'normal'
  },
  step:'info'
});
const freshRouteStop=type=>({
  type,screen:'travel',returnScreen:'travel',arrived:false,finished:false,messages:[],
  photos:type==='fueling'?{receipt:null,adBlueReceipt:null,dispenser:null,nozzle:null}:null,
  expense:type==='fueling'?{country:'DE',liters:'',price:'',withAdBlue:false,adBlueLiters:'',adBluePrice:''}:null,
  expenseRecords:type==='fueling'?[]:null,
  breakDecision:type==='fueling'?null:undefined
});
const freshHandoverGroup=source=>({
  sourceId:source.id,prepared:false,preparedAt:null,documents:[],pendingDocument:null,
  shortage:null,blockedDocument:null,rejectedScans:[],
  envelope:{contentsConfirmed:false,sealCode:null,sealedAt:null},syncState:'LOCAL_ONLY'
});
const freshDocumentCollection=()=>({
  type:'collection',role:collectionPreviewRole,transferorSourceId:collectionSources[0].id,activeSourceId:null,
  scenario:hasOwn(collectionScenarios,appQuery.get('cmrScenario'))?appQuery.get('cmrScenario'):'complete',
  screen:'info',returnScreen:'info',started:false,finished:false,messages:[],groups:collectionSources.map(freshHandoverGroup),syncState:'LOCAL_ONLY'
});
const freshTransshipment=()=>transshipmentModel.createSession(transshipmentPlan);
const freshOutgoingTransshipment=()=>transshipmentModel.createSession({...transshipmentPlan,direction:'issue',sourceDriver:{id:'driver-demo-self',name:'Ty',vehicle:transshipmentPlan.receiverVehicle.registration},receiverVehicle:transshipmentPlan.outgoingOrders[0].receiverVehicle,orders:transshipmentPlan.outgoingOrders});
const outgoingOrderReady=()=>transshipmentModel.issuedOrderComplete(transshipmentOrder());
const outgoingReady=()=>transshipment().orders.length>0&&transshipment().orders.every(transshipmentModel.issuedOrderComplete);
const serviceDailyStorageKey='super-spedytor-service-daily-v1';
const servicePhotoDatabaseName='super-spedytor-service-photos-v1';
const servicePhotoStoreName='survey-photos';
let serviceDraftSavePromise=Promise.resolve(),serviceDraftTimer=null,serviceReminderTimer=null,servicePersistenceGeneration=0;
const serviceDateKey=serviceWizardModel.dateKey;
const nextServiceExpiry=serviceWizardModel.expiry;
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
  servicePersistenceGeneration++;
  clearTimeout(serviceDraftTimer);
  clearTimeout(serviceReminderTimer);
  try{localStorage.removeItem(serviceDailyStorageKey);}catch{}
  serviceDraftSavePromise.catch(()=>{}).then(clearStoredServicePhotos).catch(()=>{});
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
  const date=state.serviceSurvey.date;
  if(date!==serviceDateKey())throw new Error('Rozpoczął się nowy dzień kontroli.');
  const photoSnapshot=await persistServicePhotos(date,state.serviceSurvey.photos);
  if(date!==serviceDateKey())throw new Error('Rozpoczął się nowy dzień kontroli.');
  const record=writeServiceDailyRecord({
    status:'done',completedAt:new Date().toISOString(),submittedAt:time,
    expiresAt:nextServiceExpiry().toISOString(),snoozeUntil:null,draft:null,
    survey:{
      step:4,messageStatus:state.serviceSurvey.messageStatus,
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
  return serviceWizardModel.reminderDue(readServiceDailyRecord());
}
function recordServiceReminderShown(){
  const now=new Date(),record=readServiceDailyRecord();
  const slots=record?.date===serviceDateKey(now)?record.promptSlots||[]:[];
  writeServiceDailyRecord({status:record?.draft?'in_progress':'due',promptSlots:[...new Set([...slots,servicePromptSlot(now)])],lastPromptedAt:now.toISOString(),snoozeUntil:null});
}
function postponeServiceReminder(){
  const now=new Date(),later=new Date(now),record=readServiceDailyRecord();
  if(now.getHours()<18)later.setHours(18,0,0,0);else later.setTime(now.getTime()+60*60*1000);
  const slots=(record?.date===serviceDateKey(now)?record.promptSlots||[]:[]).filter(slot=>slot!==servicePromptSlot(now));
  writeServiceDailyRecord({status:record?.draft?'in_progress':'due',promptSlots:slots,snoozeUntil:later.toISOString()});
  scheduleServiceReminder();
  return now.getHours()<18?'wieczorem po otwarciu aplikacji':'za godzinę po ponownym otwarciu aplikacji';
}
function updateServiceNavIndicator(){
  const button=$('[data-nav="service"]');
  if(!button)return;
  if(backendMode&&!backendTestWorkspace&&backendState?.status==='connected'){
    button.classList.remove('service-due');
    button.setAttribute('aria-label',driverBridge?.liveWorkflowsEnabled?.()===true?'Serwis — ankiety i zadania':'Serwis — historia ankiet i widoki testowe');
    return;
  }
  const due=!serviceCompletedToday();
  button.classList.toggle('service-due',due);
  button.setAttribute('aria-label',due?'Serwis — dzisiejsza ankieta do wypełnienia':'Serwis — dzisiejsza ankieta wykonana');
}
function maybeShowDailyServiceReminder(){
  if(backendMode)return;
  if(state.modal||state.serviceOpen||!serviceReminderDue())return;
  recordServiceReminderShown();
  openModal('daily-service',{});
}
function scheduleServiceReminder(){
  clearTimeout(serviceReminderTimer);
  if(backendMode||serviceCompletedToday())return;
  const record=readServiceDailyRecord();
  const reminderAt=record?.snoozeUntil?new Date(record.snoozeUntil).getTime():Date.now()+15*60*1000;
  serviceReminderTimer=setTimeout(()=>{
    maybeShowDailyServiceReminder();
    if(!state.modal&&!serviceCompletedToday())scheduleServiceReminder();
    else if(state.modal?.type!=='daily-service')serviceReminderTimer=setTimeout(scheduleServiceReminder,60000);
  },Math.max(1000,Math.min(reminderAt-Date.now(),2147483647)));
}
const freshServiceSurvey=()=>serviceWizardModel.create();
const servicePhotoFingerprint=photos=>Object.values(photos).map(photo=>photo?(photo.hash||photo.storageId||photo.url):'').join('|');
function updateServiceDraftLabel(failed=false){
  const label=$('#service-draft-status');
  if(label){label.textContent=failed?'Nie udało się zachować postępu. Spróbuj ponownie.':'Postęp zachowany. Możesz dokończyć później.';label.classList.toggle('error',failed);}
}
function queueServiceDraftSave(){
  const survey=state.serviceSurvey;
  if(survey.submitted||survey.saving||survey.date!==serviceDateKey())return;
  writeServiceDailyRecord({status:'in_progress',draft:serviceWizardModel.snapshot(survey,survey.photoMetadata||{}),survey:null});
  clearTimeout(serviceDraftTimer);
  serviceDraftTimer=setTimeout(()=>flushServiceDraft().catch(()=>{}),180);
}
function flushServiceDraft(){
  clearTimeout(serviceDraftTimer);
  const survey=state.serviceSurvey,generation=servicePersistenceGeneration;
  if(survey.submitted||survey.saving||survey.date!==serviceDateKey())return serviceDraftSavePromise;
  const photos={...survey.photos},snapshot=serviceWizardModel.snapshot(survey),fingerprint=servicePhotoFingerprint(photos);
  serviceDraftSavePromise=serviceDraftSavePromise.catch(()=>{}).then(async()=>{
    if(generation!==servicePersistenceGeneration||snapshot.date!==serviceDateKey()||survey.submitted)return;
    const metadata=fingerprint===survey.photoFingerprint?survey.photoMetadata||{}:await persistServicePhotos(snapshot.date,photos);
    if(generation!==servicePersistenceGeneration||snapshot.date!==serviceDateKey()||survey.submitted)return;
    survey.photoMetadata=metadata;
    survey.photoFingerprint=fingerprint;
    const record=writeServiceDailyRecord({status:'in_progress',draft:{...snapshot,photos:metadata},survey:null,expiresAt:nextServiceExpiry().toISOString()});
    if(!record)throw new Error('Brak miejsca na zapis postępu.');
    updateServiceDraftLabel();
  }).catch(error=>{updateServiceDraftLabel(true);throw error;});
  return serviceDraftSavePromise;
}
async function pauseServiceSurvey(){
  if(state.serviceSurvey.submitted||serviceCompletedToday()){closeService();return;}
  try{await flushServiceDraft();}
  catch{toast('Nie udało się zachować postępu. Spróbuj ponownie przed wyjściem.');return;}
  const remindAt=new Date(Date.now()+15*60*1000);
  writeServiceDailyRecord({status:'in_progress',snoozeUntil:remindAt.toISOString()});
  closeService();
  scheduleServiceReminder();
  toast(`Przypomnimy o dokończeniu. Wrócisz do kroku ${state.serviceSurvey.step+1} z 5.`);
}
const serviceHistoryStepMeta={
  oil_level:{label:'Poziom oleju',icon:'oil',unit:'%'},
  adblue_level:{label:'Poziom AdBlue',icon:'drop',unit:'%'},
  service_distance:{label:'Dystans do przeglądu',icon:'service',unit:'km'},
  dpf_photo:{label:'Zdjęcie DPF',icon:'filter'},
  after_inspection:{label:'Po przeglądzie',icon:'check',optional:true},
  service_messages:{label:'Komunikaty serwisowe',icon:'warning',optional:true}
};
const serviceHistoryStepOrder=Object.keys(serviceHistoryStepMeta);
const serviceHistoryDateOffset=days=>{
  const date=new Date();
  date.setHours(12,0,0,0);
  date.setDate(date.getDate()+days);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
};
const serviceHistoryCompletedAt=(date,time)=>`${date}T${time}:00`;
function demoServiceHistoryRecord(id,days,time,values){
  const date=serviceHistoryDateOffset(days),responses=[
    {step_key:'oil_level',note:String(values.oil),status_value:'photo_uploaded',photos:[{uploaded_at:serviceHistoryCompletedAt(date,time)}]},
    {step_key:'adblue_level',note:String(values.adBlue),status_value:'photo_uploaded',photos:[{uploaded_at:serviceHistoryCompletedAt(date,time)}]},
    {step_key:'service_distance',note:String(values.serviceDistance),status_value:'photo_uploaded',photos:[{uploaded_at:serviceHistoryCompletedAt(date,time)}]},
    {step_key:'dpf_photo',note:'',status_value:'photo_uploaded',photos:[{uploaded_at:serviceHistoryCompletedAt(date,time)}]}
  ];
  if(values.afterService)responses.push({step_key:'after_inspection',note:'true',status_value:'checked',photos:[]});
  if(values.note)responses.push({step_key:'service_messages',note:values.note,status_value:'photo_uploaded',photos:[{uploaded_at:serviceHistoryCompletedAt(date,time)}]});
  const detail={
    id,definition:{slug:'service-inspection',name:'Ankieta serwisowa'},date,status:'completed',
    vehicle_registration:'DEMO 01',completed_at:serviceHistoryCompletedAt(date,time),
    odometer_km:values.odometer,step_responses:responses
  };
  return {
    id,definition_name:'Ankieta serwisowa',definition_slug:'service-inspection',date,status:'completed',
    vehicle_registration:'DEMO 01',completed_at:detail.completed_at,
    completed_steps:4,total_steps:4,detail
  };
}
function previewServiceHistory(){
  const records=[
    demoServiceHistoryRecord('demo-service-1',-1,'07:32',{oil:86,adBlue:72,serviceDistance:12400,odometer:182310.4,afterService:false,note:''}),
    demoServiceHistoryRecord('demo-service-2',-2,'19:08',{oil:84,adBlue:69,serviceDistance:12630,odometer:182079.1,afterService:false,note:'Bez nowych komunikatów na desce.'}),
    demoServiceHistoryRecord('demo-service-3',-4,'06:54',{oil:91,adBlue:81,serviceDistance:13100,odometer:181611.7,afterService:true,note:''})
  ];
  const local=readServiceDailyRecord();
  if(local?.date===serviceDateKey()&&local.status==='done'&&local.survey){
    const date=local.date,time=local.submittedAt||new Date(local.completedAt||Date.now()).toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'});
    const normalizedTime=/^\d{2}:\d{2}$/.test(time)?time:'12:00';
    const values={
      oil:local.survey.oil,adBlue:local.survey.adBlue,serviceDistance:local.survey.serviceDistance,
      odometer:null,afterService:Boolean(local.survey.afterService),note:local.survey.note||''
    };
    const today=demoServiceHistoryRecord(`local-service-${date}`,0,normalizedTime,values);
    today.date=date;
    today.completed_at=local.completedAt||serviceHistoryCompletedAt(date,normalizedTime);
    today.detail.date=date;
    today.detail.completed_at=today.completed_at;
    today.local=true;
    records.unshift(today);
  }
  if(!records.some(record=>record.date===serviceDateKey()))records.unshift({
    id:'demo-service-today',date:serviceDateKey(),status:local?.status==='in_progress'?'in_progress':'pending',
    definition_slug:'service-inspection',vehicle_registration:'DEMO 01'
  });
  for(const days of [-3,-5])records.push({id:'demo-service-missing'+days,date:serviceHistoryDateOffset(days),
    status:'not_submitted',definition_slug:'service-inspection',vehicle_registration:'DEMO 01'});
  records.push({id:'demo-service-unassigned',date:serviceHistoryDateOffset(-6),status:'not_assigned',definition_slug:'service-inspection'});
  return records.sort((a,b)=>b.date.localeCompare(a.date));
}
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
const freshVehicleInspectionProtocol=()=>({
  odometerKm:'',fuelLevel:'',statuses:{},notes:{},vehiclePhotos:{},issuePhotos:{},pendingSync:false,preparedAt:null
});
const freshInventoryProtocol=()=>({...freshVehicleInspectionProtocol(),authorConfirmed:false});
const handoverSourceGroups=[
  {
    id:'custody',
    eyebrow:'KLUCZE, DOKUMENTY I KARTY',
    title:'Klucze, dokumenty i karty',
    items:[
      {id:'mainKey',name:'Kluczyk główny',expected:'1 szt.',icon:'lock'},
      {id:'spareKey',name:'Kluczyk zapasowy',expected:'1 szt.',icon:'lock'},
      {id:'vehicleDocuments',name:'Dokumenty pojazdu i ubezpieczenia',expected:'1 komplet',icon:'doc'},
      {id:'fuelCards',name:'Karty paliwowe podstawowe i zapasowe',expected:'Zestaw z API · bez PIN-ów',expectedQuantity:2,icon:'card'},
      {id:'tollDevice',name:'Urządzenie opłat drogowych',expected:'1 szt.',icon:'route'}
    ]
  },
  ...inventoryGroups
];
const handoverPhotoGroups=[
  {
    id:'readings',eyebrow:'WSKAZANIA POJAZDU',title:'Licznik, paliwo i komunikaty',
    items:[
      {id:'odometer',name:'Licznik i przebieg',description:'Cały zestaw wskaźników, z czytelnym przebiegiem.',icon:'signal',required:true},
      {id:'fuel',name:'Poziom paliwa',description:'Wskaźnik paliwa widoczny na desce rozdzielczej.',icon:'fuel',required:true},
      {id:'dpf',name:'DPF i kontrolki',description:'Ekran DPF albo pełny komunikat i widoczne kontrolki.',icon:'filter',required:true}
    ]
  },
  {
    id:'cabin',eyebrow:'KABINA · OSOBNE UJĘCIA',title:'Wnętrze kabiny',
    items:[
      {id:'cabinOverview',name:'Kabina — widok ogólny',description:'Cała kabina od strony otwartych drzwi, bez zasłoniętych elementów.',icon:'truck',required:true},
      {id:'driverSeat',name:'Fotel kierowcy',description:'Osobne zdjęcie całego fotela, podstawy, podłokietników i pasa.',icon:'camera',required:true},
      {id:'passengerSeat',name:'Fotel pasażera',description:'Osobne zdjęcie całego fotela pasażera i pasa bezpieczeństwa.',icon:'camera',required:true},
      {id:'cabinFloor',name:'Podłoga kabiny',description:'Podłoga i stopnie wejściowe, z widocznym stanem wykładziny.',icon:'camera',required:true},
      {id:'fridge',name:'Lodówka',description:'Osobne zdjęcie lodówki po otwarciu, pokazujące wnętrze i stan urządzenia.',icon:'box',required:true},
      {id:'sleeperBerth',name:'Leżanka i część sypialna',description:'Cała leżanka, materac i widoczna część sypialna.',icon:'camera',required:true},
      {id:'storageCompartments',name:'Schowki w kabinie',description:'Otwarte schowki i ich widoczne wyposażenie.',icon:'box',required:true},
      {id:'documentsAndCards',name:'Miejsce dokumentów i kart',description:'Dokumentownik i miejsce przechowywania kart; bez numerów i kodów PIN.',icon:'card',required:true}
    ]
  },
  {
    id:'cargo',eyebrow:'PAKA I WINDA · OSOBNE UJĘCIA',title:'Zabudowa i urządzenia',
    items:[
      {id:'cargoFromRear',name:'Paka od strony drzwi',description:'Pełny widok wnętrza od tyłu w stronę kabiny.',icon:'box',required:true},
      {id:'cargoFromFront',name:'Paka od strony kabiny',description:'Pełny widok wnętrza w przeciwnym kierunku, aż do drzwi.',icon:'box',required:true},
      {id:'cargoFloor',name:'Podłoga paki',description:'Osobne ujęcie całej podłogi oraz punktów mocowania.',icon:'camera',required:true},
      {id:'tailLiftClosed',name:'Winda złożona',description:'Cała winda w położeniu transportowym oraz jej mocowania.',icon:'truck',required:true},
      {id:'tailLiftOpen',name:'Winda rozłożona i platforma',description:'Cała rozłożona platforma z widoczną powierzchnią roboczą.',icon:'truck',required:true},
      {id:'tailLiftControls',name:'Sterowanie windy',description:'Osobne, czytelne zdjęcie panelu i przewodu sterowania.',icon:'camera',required:true}
    ]
  },
  {
    id:'exterior',eyebrow:'OBEJŚCIE ZEWNĘTRZNE · OSOBNE UJĘCIA',title:'Karoseria, lusterka i nadkola',
    items:[
      {id:'front',name:'Przód pojazdu',description:'Cały przód, tablica i narożniki w jednym ujęciu.',icon:'camera',required:true},
      {id:'rightSide',name:'Prawy bok',description:'Cały bok od przodu do tyłu, bez uciętych narożników.',icon:'camera',required:true},
      {id:'rear',name:'Tył pojazdu',description:'Tył, drzwi lub plandeka, światła i tablica.',icon:'camera',required:true},
      {id:'leftSide',name:'Lewy bok',description:'Cały bok od tyłu do przodu, bez uciętych narożników.',icon:'camera',required:true},
      {id:'leftMirror',name:'Lewe lusterko',description:'Osobne zdjęcie obudowy, lustra i mocowania lewego lusterka.',icon:'camera',required:true},
      {id:'rightMirror',name:'Prawe lusterko',description:'Osobne zdjęcie obudowy, lustra i mocowania prawego lusterka.',icon:'camera',required:true},
      {id:'frontLeftWheelArch',name:'Przednie lewe nadkole',description:'Całe nadkole, rant i widoczna część opony.',icon:'camera',required:true},
      {id:'frontRightWheelArch',name:'Przednie prawe nadkole',description:'Całe nadkole, rant i widoczna część opony.',icon:'camera',required:true},
      {id:'rearLeftWheelArch',name:'Tylne lewe nadkole',description:'Całe nadkole, rant i widoczna część opony.',icon:'camera',required:true},
      {id:'rearRightWheelArch',name:'Tylne prawe nadkole',description:'Całe nadkole, rant i widoczna część opony.',icon:'camera',required:true}
    ]
  }
];
const vehicleHandoverSnapshot={
  source:'super-spedytor-api-demo',
  handoverId:'VH/DEMO/2026/001',
  ownerVersion:7,
  assignmentVersion:12,
  status:'awaiting_receiver',
  createdAt:'2026-10-13T08:30:00+02:00',
  vehicle:{id:'vehicle-demo-01',registration:'DEMO 01',name:'Pojazd demonstracyjny',makeModel:'Ciągnik demonstracyjny'},
  transferor:{id:'driver-demo-a',code:'K-DEMO-A',displayName:'Marek Nowak',confirmedAt:'2026-10-13T08:34:00+02:00'},
  receiver:{id:'driver-demo-b',code:'K-DEMO-B',displayName:'Piotr Wiśniewski'},
  handoverPlace:'Baza AMG · miejsce demonstracyjne',
  photoRequirements:handoverPhotoGroups.flatMap(group=>group.items.map(item=>({...item,groupId:group.id}))),
  equipment:handoverSourceGroups.flatMap(group=>group.items.map(item=>({
    id:`equipment-demo-${item.id}`,
    localKey:item.id,
    groupId:group.id,
    groupTitle:group.title,
    groupEyebrow:group.eyebrow,
    name:item.name,
    expectedQuantity:item.expectedQuantity??Number.parseInt(item.expected,10),
    expectedLabel:item.expected,
    icon:item.icon
  })))
};
vehicleHandoverSnapshot.contents={vehicleId:vehicleHandoverSnapshot.vehicle.id,ownerVersion:7,orders:JSON.parse(JSON.stringify(transshipmentPlan.orders.filter(order=>['DEMO/TS/310','DEMO/TS/530'].includes(order.id))))};
const vehicleInventorySnapshot={
  source:vehicleHandoverSnapshot.source,
  inventoryId:'INV/DEMO/2026/001',
  ownerVersion:vehicleHandoverSnapshot.ownerVersion,
  vehicle:vehicleHandoverSnapshot.vehicle,
  author:vehicleHandoverSnapshot.receiver,
  inspectionPlace:vehicleHandoverSnapshot.handoverPlace,
  photoRequirements:vehicleHandoverSnapshot.photoRequirements,
  equipment:vehicleHandoverSnapshot.equipment
};
const handoverEquipmentGroups=handoverSourceGroups.map(group=>({
  id:group.id,
  eyebrow:group.eyebrow,
  title:group.title,
  items:vehicleHandoverSnapshot.equipment.filter(item=>item.groupId===group.id)
}));
const handoverZones=[
  {
    id:'cabin',number:'1',title:'Kabina',
    description:'Zacznij w środku: wpisz wskazania, wykonaj każde zdjęcie kabiny osobno, a potem sprawdź klucze, dokumenty, karty i wyposażenie kabinowe.',
    photoGroupIds:['readings','cabin'],
    equipmentKeys:['mainKey','spareKey','vehicleDocuments','fuelCards','tollDevice','extinguisher','triangle','firstAid','vests','flashlight','documentCase'],
    equipmentFirst:false
  },
  {
    id:'cargo',number:'2',title:'Paka i winda',
    description:'Najpierw policz wyposażenie paki. Dopiero potem sfotografuj osobno wnętrze paki, platformę i sterowanie windy.',
    photoGroupIds:['cargo'],
    equipmentKeys:['straps','corners','mats','bars','broom'],
    equipmentFirst:true
  },
  {
    id:'exterior',number:'3',title:'Obejście zewnętrzne',
    description:'Obejdź auto dookoła. Boki, lusterka oraz każde z czterech nadkoli mają własne wymagane pole zdjęciowe.',
    photoGroupIds:['exterior'],
    equipmentKeys:['chocks'],
    equipmentFirst:false
  }
];
const handoverPhotoGroup=id=>handoverPhotoGroups.find(group=>group.id===id);
const handoverZoneEquipmentGroups=zone=>handoverEquipmentGroups.map(group=>({
  ...group,
  id:`${zone.id}-${group.id}`,
  items:group.items.filter(item=>zone.equipmentKeys.includes(item.localKey))
})).filter(group=>group.items.length);
const handoverEquipmentItem=id=>vehicleHandoverSnapshot.equipment.find(item=>item.id===id);
const freshVehicleHandoverProtocol=()=>({
  ...freshVehicleInspectionProtocol(),receiverConfirmed:false
});
const initialLoad=fresh('load');
if(androidShell)initialLoad.arrived=nativeHasArrival(routePointIds.load);
if(initialLoad.arrived)initialLoad.timing.startedAt=Date.now();
const requestedServicePanel=appQuery.get('service');
const initialServicePanel=['inventory','handover','history'].includes(requestedServicePanel)?requestedServicePanel:'survey';
const state={operation:'load',routeStop:null,screen:androidShell&&!initialLoad.arrived?'travel':'info',returnScreen:'info',scenario:'basic',language:'pl',manualLanguage:false,operations:{load:initialLoad,unload:fresh('unload')},routeStops:{collection:freshDocumentCollection(),transshipment:freshTransshipment(),transshipmentOut:freshOutgoingTransshipment(),parking:freshRouteStop('parking'),fueling:freshRouteStop('fueling')},serviceOpen:appQuery.has('service'),servicePanel:initialServicePanel,serviceSurvey:freshServiceSurvey(),serviceHistorySelectedId:null,inventoryProtocol:freshInventoryProtocol(),vehicleHandover:freshVehicleHandoverProtocol(),modal:null};
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
  const source=record?.draft||record?.survey;
  if(state.serviceSurvey.hydrated||record?.date!==serviceDateKey()||!source)return false;
  const hasUnsavedInput=[state.serviceSurvey.oil,state.serviceSurvey.adBlue,state.serviceSurvey.serviceDistance,state.serviceSurvey.note].some(has)
    ||Object.values(state.serviceSurvey.photos).some(Boolean);
  if(hasUnsavedInput)return false;
  let photos={oil:null,adBlue:null,serviceDistance:null,dpf:null,message:null},photosComplete=true;
  try{
    photos=await restoreServicePhotos(source.photos);
    photosComplete=Object.keys(source.photos||{}).every(key=>Boolean(photos[key]));
  }catch{photosComplete=false;}
  const restored=serviceWizardModel.restore(record,photos);
  if(!restored)return false;
  Object.assign(state.serviceSurvey,restored,{photoMetadata:source.photos||{},photoFingerprint:servicePhotoFingerprint(photos),
    reopened:record.status!=='done'||!photosComplete});
  if(!photosComplete)markServiceDailyDue();
  return true;
}
async function expireServiceSurveyDataIfNeeded(){
  const today=serviceDateKey(),record=readServiceDailyRecord();
  const expired=Boolean(record?.date&&record.date!==today)||state.serviceSurvey.date!==today;
  if(!expired)return false;
  servicePersistenceGeneration++;
  clearTimeout(serviceDraftTimer);
  clearTimeout(serviceReminderTimer);
  Object.values(state.serviceSurvey.photos).forEach(revoke);
  state.serviceSurvey=freshServiceSurvey();
  try{localStorage.removeItem(serviceDailyStorageKey);}catch{}
  try{await serviceDraftSavePromise.catch(()=>{});await clearStoredServicePhotos();}catch{}
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
    maybeShowDailyServiceReminder();
    scheduleServiceReminder();
    scheduleServiceSurveyExpiry();
  },Math.min(delay,2147483647));
}
async function initializeServiceSurveyStorage(){
  await expireServiceSurveyDataIfNeeded();
  await restoreServiceSurveyForToday();
  ensureServiceSurveyToday();
  render();
  maybeShowDailyServiceReminder();
  scheduleServiceReminder();
  scheduleServiceSurveyExpiry();
}
const dictionary={pl:{pickup:'ZAŁADUNEK',delivery:'ROZŁADUNEK',flag:'🇵🇱'},en:{pickup:'PICKUP',delivery:'DELIVERY',flag:'🇬🇧'},de:{pickup:'BELADUNG',delivery:'ENTLADUNG',flag:'🇩🇪'},it:{pickup:'CARICO',delivery:'SCARICO',flag:'🇮🇹'}};

const current=()=>state.operations[state.operation];
const currentStop=()=>state.routeStop==='transshipment'?transshipment():state.routeStop?state.routeStops[state.routeStop]:null;
const stopDefinition=()=>state.routeStop?routeStopDefinitions[state.routeStop]:null;
const cargoMode=()=>!state.routeStop;
const isLoad=()=>state.operation==='load';
const operationName=()=>current()?.live&&current().operationLabel?current().operationLabel:isLoad()?'Załadunek':'Rozładunek';
const operationGenitive=()=>isLoad()?'załadunku':'rozładunku';
const cargoOrderId=()=>current().orderId||assignment.id;
const currentPlace=()=>current().place||(isLoad()?assignment.pickup:assignment.delivery);
const optional=()=>current()?.live?(current().optional||{}):scenarios[state.scenario][state.operation];
const count=()=>current().items.length;
const photoRecords=operation=>operation.items.flatMap(item=>(operation.mode==='load'?[item.photos.near,item.photos.far]:[item.photos.unload]).filter(Boolean));
const pieceReady=(item,operation=current())=>operation.mode==='load'?Boolean(item.label&&item.seal&&item.photos.near&&item.photos.far):Boolean(item.seal&&item.photos.unload);
const cargoReady=()=>count()>0&&current().items.every(item=>pieceReady(item));
const cmrSealReady=()=>Boolean(current().cmrSeal&&(isLoad()?current().cmrLabel:true))||Boolean(current().cmrSealSkipped);
const documentReady=()=>current().documents.length>0&&current().documentsComplete;
const allReady=()=>current().started&&current().physicalConfirmed&&cargoReady()&&cmrSealReady()&&documentReady();
const finishReady=()=>allReady()&&(liveMode()||isLoad()||Boolean(current().cmrReturnCode===current().cmrSeal&&current().cmrRetained));
const documentationSteps=()=>isLoad()?['photos','seals','documents']:['seals','photos','documents'];
const operationFlow=()=>isLoad()?['info',...documentationSteps(),'review']:['seals','info','photos','documents','review'];
const progress=()=>isLoad()?[cargoReady(),cmrSealReady(),documentReady()]:[cmrSealReady(),cargoReady(),documentReady()];
const completedPieces=()=>current().items.filter(item=>pieceReady(item)).length;
const operationTimerMeta={
  normal:{label:'W normie',title:'Operacja trwa',description:'Do 20 minut bez dodatkowej akcji.',icon:'clock'},
  'check-in':{label:'Pytanie o status',title:'Minęło 20 minut',description:'Biuro pyta, co dzieje się na miejscu.',icon:'chat'},
  urgent:{label:'Wydłużony czas',title:'Minęło 40 minut',description:'Możesz kontynuować operację i przekazać spedytorowi aktualny status.',icon:'bell'},
  limit:{label:'Przekroczono 60 min',title:'Maksymalny czas przekroczony',description:'Możesz kontynuować dokumentowanie i przekazać spedytorowi przyczynę opóźnienia.',icon:'warning'}
};
const operationResponseOptions=()=>[
  ...(current().physicalConfirmed?[["documenting",isLoad()?"Załadunek wykonany — dokumentuję":"Rozładunek wykonany — dokumentuję"]]:[]),
  ['waiting','Czekam na rampę'],
  ['in-progress',isLoad()?'Trwa załadunek':'Trwa rozładunek'],
  ['problem','Problem na miejscu']
];
function operationStatusPromptView(){
  return `<p>Jeśli chcesz uzupełnić status, wybierz aktualny etap operacji. Możesz też kontynuować dokumentowanie bez odpowiedzi.</p><div class="operation-response-actions operation-status-options">${operationResponseOptions().map(([value,label])=>`<button type="button" data-operation-response="${value}">${icon(value==='documenting'?'check':'clock')}<span>${esc(label)}</span>${icon('arrow')}</button>`).join('')}</div><p class="small-note">Odpowiedź zapisuje się na tym telefonie. Zakończenie punktu potwierdzisz po uzupełnieniu dokumentacji. Spedytora powiadomisz przez Czat.</p>`;
}
function beginOperationTimer(record=current()){
  if(!record?.timing||record.finished)return;
  if(record.live)return;
  if(!record.timing.startedAt){
    record.timing.startedAt=Date.now();
    record.timing.endedAt=null;
    record.timing.renderedStage='normal';
  }
}
function finishOperationTimer(record=current()){
  if(!record?.timing||record.timing.endedAt)return;
  if(record.live&&!record.timing.startedAt)return;
  beginOperationTimer(record);
  record.timing.endedAt=Date.now();
}
function operationElapsedSeconds(record=current()){
  const timing=record?.timing;
  if(!timing?.startedAt)return 0;
  const until=timing.endedAt||Date.now();
  return Math.max(0,Math.floor((until-timing.startedAt)/1000)+(Number(timing.offsetSeconds)||0));
}
function operationTimerSnapshot(record=current()){
  return operationTimingModel.describe(operationElapsedSeconds(record),record?.timing?.acknowledgedThreshold||0);
}
function operationResponseSuggested(record=current()){
  return Boolean(record?.arrived&&!record.finished&&operationTimerSnapshot(record).invitesResponse);
}
function operationTimerView(compact=false){
  const record=current();
  if(!record.arrived||record.finished)return '';
  if(record.live&&!record.timing?.startedAt)return '';
  beginOperationTimer(record);
  const snapshot=operationTimerSnapshot(record),meta=operationTimerMeta[snapshot.stage],timing=record.timing;
  const showQuestion=snapshot.stage!=='normal';
  const answered=timing.response&&timing.acknowledgedThreshold>=snapshot.threshold;
  const stageLabel=answered?(record.live?'Status potwierdzony':'Status zarejestrowany'):meta.label;
  const stageDescription=answered?'Odpowiedź kierowcy została zapisana na tym telefonie.':meta.description;
  const previewControls=!record.live&&(previewMode||!androidShell)&&!compact?`<div class="operation-timer-preview"><span>PODGLĄD PROGÓW</span>${[0,20,40,60].map(minutes=>`<button type="button" data-timer-preview="${minutes}">${minutes} min</button>`).join('')}</div>`:'';
  const response=showQuestion?`<div class="operation-timer-response ${snapshot.invitesResponse?'requested':''}"><div class="operation-timer-question">${icon(meta.icon)}<div><strong>${esc(meta.title)}</strong><small>${esc(stageDescription)}</small></div></div>${answered?`<div class="operation-response-saved">${icon('check')}<span><strong>${esc(timing.response)}</strong><small>${record.live?'Potwierdzono na tym telefonie':'Zarejestrowano w podglądzie'} o ${esc(timing.responseAt)}</small></span></div>`:`<div class="operation-response-actions">${operationResponseOptions().map(([value,label])=>`<button type="button" data-operation-response="${value}">${esc(label)}</button>`).join('')}<button type="button" class="operation-response-chat" data-operation-response="chat">${icon('chat')} Czat</button></div>`}</div>`:'';
  return `<section class="operation-timer ${compact?'compact':''} ${snapshot.stage}" data-operation-timer><div class="operation-timer-top"><span class="operation-timer-icon">${icon(meta.icon)}</span><div><small>CZAS NA ${isLoad()?'ZAŁADUNKU':'ROZŁADUNKU'}</small><strong data-operation-elapsed>${operationTimingModel.formatDuration(snapshot.elapsedSeconds)}</strong></div><b data-operation-stage>${esc(stageLabel)}</b></div><div class="operation-timer-track"><span data-operation-progress style="width:${snapshot.progressPercent}%"></span><i class="at-20"></i><i class="at-40"></i></div><div class="operation-timer-thresholds"><span>20 min · status</span><span>40 min · alarm</span><span>60 min · limit</span></div>${response}${previewControls}</section>`;
}
const collection=()=>state.routeStops.collection;
const collectionSource=id=>collectionSources.find(source=>source.id===id)||collectionSources[0];
const collectionGroup=(sourceId=collection().activeSourceId)=>sourceId?collection().groups.find(group=>group.sourceId===sourceId)||null:null;
const collectionGroupOrders=(group=collectionGroup())=>group?collectionOrders.filter(order=>order.sourceId===group.sourceId):[];
const collectionAssessment=(group=collectionGroup())=>collectionModel.assess(group,collectionOrders);
const availableCollectionOrders=(group=collectionGroup())=>group?collectionAssessment(group).remaining.filter(order=>group.pendingDocument?.handoverId!==order.id):[];
const collectionDocumentsReady=(group=collectionGroup())=>collectionAssessment(group).canSeal;
const collectionMissingOrders=(group=collectionGroup())=>collectionAssessment(group).missing;
const collectionEnvelopeReady=(group=collectionGroup())=>Boolean(group&&collectionDocumentsReady(group)&&group.envelope.contentsConfirmed&&group.envelope.sealCode);
const allCollectionGroupsReady=()=>collection().groups.every(group=>collectionEnvelopeReady(group));
const nextPendingCollectionGroup=()=>collection().groups.find(group=>!collectionEnvelopeReady(group));
const transshipment=()=>transshipmentPreviewRole==='transferor'?state.routeStops.transshipmentOut:state.routeStops.transshipment;
const transshipmentSource=(order=transshipmentOrder())=>order?.sourceDriver||transshipment().sourceDriver;
const transshipmentSources=()=>[...new Map(transshipment().orders.map(order=>[order.sourceDriver.id,order.sourceDriver])).values()];
const transshipmentOrder=()=>transshipmentModel.activeOrder(transshipment());
const transshipmentPiece=()=>transshipmentModel.nextPiece(transshipmentOrder());
const transshipmentProgress=()=>transshipmentModel.progress(transshipment());
const transshipmentOrderReady=()=>transshipmentModel.orderComplete(transshipmentOrder());
const transshipmentReady=()=>transshipmentModel.sessionComplete(transshipment());

let toastTimer,uploadTarget,focusBeforeModal,uploadBusy=false,arrivalCountdown=null;

let nextActionFrame=null;
function focusNextAction(selector,alignment='start'){
  cancelAnimationFrame(nextActionFrame);
  nextActionFrame=requestAnimationFrame(()=>{
    const scroller=$('#app-scroll'),target=$(selector);if(!scroller||!target)return;
    const viewport=scroller.getBoundingClientRect(),rect=target.getBoundingClientRect(),sticky=$('.transshipment-current-context');
    const inset=sticky&&sticky!==target&&getComputedStyle(sticky).position==='sticky'?sticky.getBoundingClientRect().height+12:12;
    const scale=scroller.getBoundingClientRect().height/scroller.clientHeight;
    const usableTop=viewport.top+inset,usableHeight=viewport.bottom-usableTop-12;
    const offset=alignment==='center'?(usableHeight-rect.height)/2:0;
    const desired=scroller.scrollTop+(rect.top-usableTop-offset)/scale;
    scroller.scrollTop=Math.max(0,Math.min(desired,scroller.scrollHeight-scroller.clientHeight));
  });
}
function focusTransshipmentAction(){
  const order=transshipmentOrder();if(!order)return;
  if(transshipmentPreviewRole==='transferor'){
    if(!order.cmr.handedOver){focusNextAction(order.cmr.issuedCode?'.outgoing-cmr-preview':'.outgoing-cmr-task',order.cmr.issuedCode?'center':'start');return;}
    const piece=transshipmentModel.nextIssuedPiece(order);
    focusNextAction(piece?'.outgoing-piece.active':'.outgoing-order-done');return;
  }
  if(!order.cmr.accepted){focusNextAction(order.cmr.previewVisible?'.transshipment-cmr-preview':'.transshipment-cmr-card [data-transshipment-scan="cmr"]','center');return;}
  const piece=transshipmentPiece();
  if(!piece){focusNextAction('.transshipment-order-done','center');return;}
  if(!piece.scannedCode){focusNextAction('.transshipment-piece-card [data-transshipment-scan="piece"]','center');return;}
  const photoTarget=$('#app-scroll').clientHeight<550?'.transfer-photo-step .piece-photo-grid':'.transfer-photo-step';
  focusNextAction(!piece.photos.near?photoTarget:!piece.photos.far?'[data-transshipment-photo="far"]':'#transshipment-complete-piece','center');
}
function transshipmentCurrentContext(order){
  const source=transshipmentSource(order),outgoing=transshipmentPreviewRole==='transferor';
  const piece=outgoing?order.cmr.handedOver&&transshipmentModel.nextIssuedPiece(order):order.cmr.accepted&&transshipmentModel.nextPiece(order);
  const item=piece?`Sztuka ${piece.pieceIndex+1} z ${order.pieces.length}: ${piece.name}`:`${order.goods} · ${order.pieces.length} ${order.pieces.length===1?'sztuka':'sztuki'}`;
  const review=!outgoing&&order.cmr.previewVisible&&!order.cmr.accepted;
  return `<div class="transshipment-current-context ${outgoing?'issuing':'receiving'} ${review?'document-review':''}"><span>${icon(outgoing?'truck':'box')}</span><div><small>${outgoing?'WYDAJESZ DO AUTA '+esc(order.receiverVehicle?.registration||transshipment().receiverVehicle.registration):'ODBIERASZ OD KIEROWCY'}</small><strong>${esc(outgoing?transshipment().sourceDriver.name:source.name)} · ${esc(source.vehicle)}</strong><b>${esc(item)}</b><em>Zlecenie ${esc(order.id)}</em></div></div>`;
}

function toast(message){
  const device=$('.device'),bar=$('#driver-workspace-bar'),header=$('.app-header');
  const anchor=bar&&!bar.hidden?bar:header;
  if(device&&anchor)$('#toast').style.top=`${(anchor.getBoundingClientRect().bottom-device.getBoundingClientRect().top)/(device.getBoundingClientRect().width/device.offsetWidth)+8}px`;
  $('#toast').textContent=message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3800);
}
function revoke(record){if(record?.scanId||record?.originalUrl||record?.sourcePages)window.SuperSpedytorScanner?.release(record);else if(record?.url?.startsWith('blob:'))URL.revokeObjectURL(record.url);}
function revokePiece(piece){revoke(piece.photos.near);revoke(piece.photos.far);revoke(piece.photos.unload);}

function openService(panel=(!serviceCompletedToday()?'survey':state.servicePanel||'survey')){
  if(productionScope)return;
  if(backendTestWorkspace)backendActiveNav='service';
  if(backendMode&&!backendTestWorkspace&&backendState?.status==='connected'&&panel!=='history'&&!enterTestingWorkspace('survey',false))return;
  cancelArrivalCountdown(false);
  closeModal(false);
  if(panel!=='history')state.serviceHistorySelectedId=null;
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
  if(liveReadOnly())return;
  cancelArrivalCountdown(false);
  const operation=state.routeStop||state.operation;
  const routeKey=liveOperation?.routeKey;
  arrivalCountdown={operation,remaining:5,timer:null};
  render();
  arrivalCountdown.timer=setInterval(()=>{
    const activeOperation=state.routeStop||state.operation;
    if(!arrivalCountdown||arrivalCountdown.operation!==operation||activeOperation!==operation||state.screen!=='travel'||routeKey!==liveOperation?.routeKey){
      cancelArrivalCountdown(false);
      return;
    }
    arrivalCountdown.remaining-=1;
    if(arrivalCountdown.remaining<=0){
      clearInterval(arrivalCountdown.timer);
      arrivalCountdown=null;
      if(liveMode()){
        if(liveReadOnly()||String(liveOperation.point?.status)!=='pending')return;
        requestLivePointAction('start');
        render();
        return;
      }
      nativeConfirmArrival(operation);
      if(state.routeStop){
        currentStop().arrived=true;
        goStop('info');
        if(operation==='parking')window.SuperSpedytorTacho?.offerParkingBreak?.();
      }
      else{
        current().arrived=true;
        beginOperationTimer();
        go(isLoad()?'info':'seals');
      }
      return;
    }
    render();
  },1000);
}

function go(screen){
  if(productionScope&&screen==='chat')return;
  if(liveReadOnly())return goLiveReadOnly(screen);
  if(backendTestWorkspace)backendActiveNav='now';
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
  if(screen==='travel'&&!liveMode())current().arrived=false;
  if(screen==='info'){
    current().arrived=true;
    beginOperationTimer();
  }
  render();
  $('#app-scroll').scrollTop=0;
}
function goStop(screen){
  if(productionScope)return;
  if(arrivalCountdown)cancelArrivalCountdown(false);
  state.serviceOpen=false;
  const stop=currentStop();
  if(!stop)return;
  if(state.routeStop==='collection'){
    if(collection().role!=='receiver'&&screen!=='info'){toast('To konto ma tylko zadanie przygotowania własnych dokumentów.');return;}
    if(screen==='photos'&&(!collection().started||!collectionGroup())){toast('Najpierw wybierz osobę, od której odbierasz dokumenty.');return;}
    if(screen==='documents'&&!collectionDocumentsReady()){toast('Najpierw odbierz pozostałe CMR-y lub odnotuj brak oryginałów.');return;}
    if(screen==='envelope-scan'&&(!collectionDocumentsReady()||!collectionGroup().envelope.contentsConfirmed||collectionGroup().envelope.sealCode)){toast('Najpierw sprawdź i potwierdź zawartość koperty.');return;}
    if(screen==='review'&&!collectionEnvelopeReady()){toast('Najpierw potwierdź zawartość, naklej nieużytą plombę i zeskanuj jej QR.');return;}
  }
  if(state.routeStop==='transshipment'){
    if(screen==='photos'&&!transshipment().started){toast('Najpierw sprawdź plan ułożenia ładunku i rozpocznij przeładunek.');return;}
    if(screen==='review'&&!(transshipmentPreviewRole==='transferor'?outgoingReady():transshipmentReady())){toast('Najpierw odbierz CMR i każdą sztukę wszystkich zleceń zgodnie z kolejnością.');return;}
  }
  if(screen==='chat'&&state.screen!=='chat')stop.returnScreen=state.screen;
  closeModal(false);
  state.screen=screen;
  stop.screen=screen;
  if(screen==='travel')stop.arrived=false;
  if(screen==='info')stop.arrived=true;
  render();
  if(state.routeStop==='transshipment'&&screen==='photos')focusTransshipmentAction();
  else if(state.routeStop==='collection'&&screen==='photos')focusNextAction(collectionGroup()?.pendingDocument?'.collection-pending-preview':'#collection-add-document','center');
  else if(state.routeStop==='collection'&&screen==='documents')focusNextAction('#collection-envelope-checklist','start');
  else $('#app-scroll').scrollTop=0;
}
function switchOperation(operation,screen='info'){
  cancelArrivalCountdown(false);
  state.routeStop=null;
  state.operation=operation;
  if(!state.manualLanguage)state.language=operation==='load'?'it':'en';
  go(screen);
}
function switchRouteStop(type,screen='travel'){
  if(backendTestWorkspace)backendActiveNav='now';
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
function liveSessionTools(){
  if(!current()?.live)return '';
  return `<span class="live-session-tools"><button id="backend-refresh" class="icon-button" aria-label="Odśwież dane">↻</button><button id="backend-logout" class="icon-button" aria-label="Wyloguj z aplikacji">${icon('close')}</button></span>`;
}
function pageHeading(travel=false){
  const place=currentPlace();
  const live=current().live;
  const pointLabel=live?(live.pointSequence!=null?`PUNKT ${live.pointSequence}${live.totalPoints!=null?`/${live.totalPoints}`:''}`:'')
    :current().orderId?'ROZŁADUNEK PO PRZEŁADUNKU':`PUNKT ${isLoad()?'1':'2'}/2`;
  const orderLabel=[cargoOrderId(),pointLabel].filter(has).map(esc).join(' · ');
  const country=[place.country,place.countryName].filter(has).map(esc).join(' · ');
  const sessionTools=liveSessionTools();
  return `<div class="operation-heading"><div><div class="overline">${orderLabel}</div><h2>${esc(travel?'Cel podróży':operationName())}</h2></div><div class="header-tools">${languageControl()}${sessionTools}</div></div><div class="heading-status"><span class="badge ${travel?'orange':'green'}">${icon(travel?'route':'check')}${travel?'W drodze':'Jesteś na miejscu'}</span>${country?`<span class="arrival-time">${country}</span>`:''}</div>`;
}
function travelCargoView(){
  const title=isLoad()?'Co będziesz ładować':'Co będziesz rozładowywać';
  const quantity=`${count()} ${count()===1?'sztuka':count()<5?'sztuki':'sztuk'}`;
  const totalMass=liveMode()?assignment.cargo.mass:current().cargoMass??current().items.reduce((sum,piece)=>sum+(Number(piece.mass)||0),0);
  const massScope=liveMode()&&assignment.cargo.massScope==='order'?' (całe zlecenie)':'';
  return `<div class="travel-cargo-preview" aria-label="${title}"><div class="travel-cargo-heading"><span>${icon('box')}</span><div><small>${title}</small><strong>${quantity}${has(totalMass)?` · ${esc(totalMass)} kg${massScope}`:''}</strong></div></div><div class="travel-cargo-list">${current().items.map((piece,index)=>`<div class="travel-cargo-item"><span class="piece-index">${index+1}</span><div><strong>${esc(piece.name)}</strong><small>${[piece.description,has(piece.mass)?`${piece.mass} kg`:null,piece.dimensions].filter(has).map(esc).join(' · ')}</small></div></div>`).join('')}</div></div>`;
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
  const cmr=has(cmrSeal)?`<div class="unload-next-row"><span>Plomba dokumentu CMR</span><strong>${esc(cmrSeal)}</strong><small>${current().orderId?'Numer potwierdzony przy przeładunku':'Numer zapisany podczas załadunku'}</small></div>`:'';
  const suppliedPhotos=photos.length?`<div class="unload-place-photo-title">${icon('camera')}<span><strong>Zdjęcia miejsca rozładunku</strong><small>Sprawdź przed dojazdem</small></span></div><div class="unload-place-photos">${photos.map(({photo,index})=>`<button type="button" data-supplied-photo="${index}" aria-label="Otwórz: ${esc(photo.name)}"><img src="${photo.url}" alt="${esc(photo.name)}${photo.demo?' — przykład demonstracyjny':''}"><span>${esc(photo.name)}</span></button>`).join('')}</div>`:'';
  return `<section class="panel unload-next-panel" aria-label="Informacje potrzebne przed rozładunkiem"><div class="section-kicker">${icon('qr')} PRZED DOJAZDEM</div><h3>Plomby ładunku</h3>${seals}${cmr}<div class="unload-next-instruction">${icon('info')}<div><p><strong>Numery są dostępne już w trasie.</strong> Po dotarciu porównaj je z plombami fizycznie znajdującymi się na sztukach i na CMR.</p></div></div>${suppliedPhotos}<div class="unload-photo-rule">${icon('camera')}<p><strong>Zdjęcie z rozładunku</strong>Po zdjęciu każdej sztuki z pojazdu zrób jej zdjęcie na rampie albo na ziemi. Aplikacja poprosi o nie w kroku dokumentacji.</p></div></section>`;
}
function demoOperationPlanView(){
  const currentIndex=isLoad()?0:1,visible=demoOperationPlan.slice(currentIndex);
  const nextStep=isLoad()?'Po potwierdzeniu dotarcia zobaczysz informacje o załadunku i listę sztuk.':'Po potwierdzeniu dotarcia aplikacja od razu poprosi o zeskanowanie plomby CMR.';
  const pin=place=>`<a class="operation-plan-pin" href="${locationUrl(place)}" target="_blank" rel="noopener" aria-label="Pokaż na mapie: ${esc(place.company)}">${icon('pin')}<span>Pinezka</span></a>`;
  const content=current().orderId
    ?`<section class="received-order-route"><small>ROZŁADUNEK PRZEJĘTEGO ZLECENIA</small><h3>${esc(current().orderId)}</h3><p>${esc(currentPlace().company)} · ${esc(currentPlace().address)}</p><strong>${count()} sztuki · ${current().cargoMass} kg</strong>${pin(currentPlace())}</section>`
    :`<div class="operation-plan-list">${visible.map((item,index)=>{
    const first=item.sequence===1&&item.appointment;
    const arrival=first?operationTimingModel.subtractMinutesFromClock(item.appointment,item.arrivalLeadMinutes):item.eta;
    const timeLabel=first?'BĄDŹ NA MIEJSCU':'AKTUALNE ETA';
    const appointment=first?`Operacja o ${item.appointment} · 15 min wcześniej`:'Aktualizowane po poprzednim punkcie';
    return `<article class="operation-plan-item ${index===0?'current':''}"><div class="operation-plan-time"><small>${timeLabel}</small><strong>${esc(arrival)}</strong></div><div class="operation-plan-line"><span></span></div><div class="operation-plan-detail"><div><b>${item.sequence}. ${esc(item.type)}</b><em>${esc(appointment)}</em></div><h4>${esc(item.place.company)}</h4><p>${esc(item.place.address)}</p>${pin(item.place)}<div class="operation-plan-cargo">${icon('box')}<span><strong>${esc(item.goods)}</strong><small>${esc(item.cargo)}</small></span></div></div></article>`;
  }).join('')}</div><div class="operation-plan-note">${icon('info')}<p><strong>Pierwsza operacja ma twardą godzinę.</strong> ETA kolejnych punktów przesuwa się według dojazdu i rzeczywistego czasu poprzedniej operacji.</p></div>`;
  return `<details class="operation-plan operation-plan-preview"><summary><span class="operation-plan-summary-icon">${icon('pin')}</span><span><strong>Podgląd najbliższych operacji</strong><small>Miejsca, godziny i ładunki · rozwiń, aby zobaczyć</small></span><span class="operation-plan-chevron">${icon('arrow')}</span></summary><div class="operation-plan-body">${content}${travelCargoView()}<div class="travel-next-hint">${icon(isLoad()?'info':'qr')}<p><strong>${isLoad()?'Po dotarciu':'Na rozładunku najpierw CMR'}</strong>${nextStep}</p></div></div></details>`;
}
function demoTravelTimingView(){
  if(current().orderId)return '';
  const item=demoOperationPlan.find(operation=>operation.key===state.operation);
  if(!item)return '';
  const first=item.sequence===1&&item.appointment;
  const arrival=first?operationTimingModel.subtractMinutesFromClock(item.appointment,item.arrivalLeadMinutes):item.eta;
  if(!has(arrival))return '';
  return `<div class="travel-arrival">${icon('clock')}<span><small>${first?'BĄDŹ NA MIEJSCU':'AKTUALNE ETA'}</small><strong>${esc(arrival)}</strong></span><p>${first?`Operacja o ${esc(item.appointment)}<br>15 minut wcześniej`:'Przewidywany dojazd<br>do celu podróży'}</p></div>`;
}
function travelDestinationCard({place,operationLabel,access=[],timing='',actions='',details='',schematicLabel='Punkt trasy',demoRoadLabels=false}){
  return `<section class="travel-map-card" aria-label="Cel podróży: ${esc(place.company)}">
    <div class="travel-destination"><span class="travel-destination-icon">${icon('pin')}</span><div><small>${esc(operationLabel)}${place.country?` · ${esc(place.country)}`:''}</small><h3>${esc(place.company)}</h3>${place.address||place.countryName?`<p>${esc(place.address||place.countryName)}</p>`:''}${access.length?`<div class="travel-access">${access.map(item=>`<span>${esc(item)}</span>`).join('')}</div>`:''}</div></div>
    ${timing}${actions}${details}
    <div class="travel-map-visual"><svg viewBox="0 0 360 210" role="img" aria-label="Schemat celu podróży — otwórz mapę, aby zobaczyć rzeczywistą trasę"><path class="map-street major" d="M-20 166 C55 128 93 139 151 101 S278 36 390 52"/><path class="map-street" d="M18 15 C62 62 79 96 91 224"/><path class="map-street" d="M185 -15 C177 37 198 88 243 128 S304 176 374 193"/><path class="map-street thin" d="M-10 79 C66 88 103 60 148 46 S254 35 370 98"/><path class="map-street thin" d="M121 -14 C127 44 152 67 197 91 S282 128 315 220"/><path class="map-route" d="M38 181 C82 146 112 153 148 119 S217 78 276 65"/><circle class="map-start" cx="38" cy="181" r="7"/><circle class="map-destination" cx="276" cy="65" r="9"/></svg>${demoRoadLabels?'<span class="travel-map-road road-one">A15</span><span class="travel-map-road road-two">N210</span>':''}<span class="travel-map-pin">${icon('pin')}</span><span class="travel-map-label">${esc(schematicLabel)}</span></div>
  </section>`;
}
function travelView(){
  const place=currentPlace(),data=optional();
  const live=current().live;
  const access=[has(data.gate)?`Brama ${data.gate}`:null,has(data.parking)?`Parking ${data.parking}`:null,has(data.ramp)?`Rampa ${data.ramp}`:null].filter(Boolean);
  const timing=live?backendDesignedTiming(liveOperation.point):demoTravelTimingView();
  const plan=live?backendDesignedRoutePlan():demoOperationPlanView();
  return `<div class="app-content travel-screen">${pageHeading(!live||!current().arrived)}${travelDestinationCard({place,operationLabel:live?operationName():isLoad()?'ZAŁADUNEK':'ROZŁADUNEK',access,timing,actions:locationActionsView(place,'travel-goal-actions'),schematicLabel:live&&current().live.routeOnly?'Punkt trasy':`Punkt ${operationGenitive()}`,demoRoadLabels:!live})}${unloadBeforeArrivalView()}${plan}${liveInventoryTasksView()}</div>`;
}
function placeView(){
  const place=currentPlace(),data=optional();
  const fields=[['Brama',data.gate],['Parking',data.parking],['Magazyn',data.warehouse],['Rampa',data.ramp]].filter(([,value])=>has(value));
  return `<section class="panel place-panel"><div class="section-kicker">${icon('pin')} FIRMA ${isLoad()?'ZAŁADOWCY':'ODBIORCY'}</div><h3>${esc(place.company)}</h3><div class="place-address-row">${has(place.address)?`<p class="address">${esc(place.address)}</p>`:''}${locationActionsView(place)}</div>${fields.length?`<div class="gate-chips optional-place-fields">${fields.map(([label,value])=>`<div class="gate-chip"><small>${label}</small><b>${esc(value)}</b></div>`).join('')}</div>`:''}</section>`;
}
function destinationView(){
  const place=current().sourcePlace||(isLoad()?assignment.delivery:assignment.pickup);
  return `<section class="panel destination-panel"><div class="section-kicker">${icon('route')} ${isLoad()?'DOKĄD JEDZIE ŁADUNEK':'SKĄD JEDZIE ŁADUNEK'} / ${dictionary[state.language][isLoad()?'delivery':'pickup']}</div><h4>${esc(place.company)}</h4><p>${esc(place.countryName)}${has(place.address)?`<br>${esc(place.address)}`:''}</p><a href="${locationUrl(place)}" target="_blank" rel="noopener">Otwórz lokalizację ${icon('arrow')}</a></section>`;
}
function cargoView(){
  const totalMass=current().cargoMass??assignment.cargo.mass;
  const massScope=liveMode()&&current().cargoMass==null&&assignment.cargo.massScope==='order'?'· masa całego zlecenia':'łącznie';
  const massText=has(totalMass)?`${esc(totalMass)} kg ${massScope}`:'Masa: nie podano';
  const ldm=liveMode()&&has(assignment.cargo.ldm)?`<small>${esc(assignment.cargo.ldm)} LDM · całe zlecenie</small>`:'';
  return `<div class="cargo-list" aria-label="Lista sztuk ładunku ze zlecenia">${current().items.map((piece,index)=>`<section class="panel cargo-list-item"><div class="cargo-list-heading"><span class="piece-index">${index+1}</span><div><small>SZTUKA ${index+1} Z ${count()}</small><h4>${esc(piece.name)}</h4></div></div><p>${esc(piece.description)}</p><dl><div><dt>Masa</dt><dd>${has(piece.mass)?`${esc(piece.mass)} kg`:'Nie podano'}</dd></div><div><dt>Wymiary</dt><dd>${has(piece.dimensions)?esc(piece.dimensions):'Nie podano'}</dd></div></dl>${!isLoad()?`<div class="cargo-seal-reference"><span>Numer plomby z załadunku</span><strong>${esc(piece.expectedSeal||'Nie zapisano')}</strong></div>`:''}</section>`).join('')}</div><div class="cargo-total">${icon('box')}<span><strong>${count()} ${count()===1?'sztuka':count()<5?'sztuki':'sztuk'} w zleceniu</strong><small>${massText}</small>${ldm}</span></div>`;
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
  const editable=!current().started&&!liveMode();
  return `<div class="cargo-items-manager"><div class="cargo-items-title"><span>Faktyczne sztuki ładunku</span><b>${count()}</b></div>${current().items.map((piece,index)=>pieceSummary(piece,index,editable)).join('')}${editable?`<div class="cargo-count-actions"><button id="add-cargo-piece">${icon('plus')}<span><strong>Towaru jest więcej?</strong><small>Dodaj sztukę i jej szczegóły</small></span></button><button id="remove-last-piece" ${count()===1?'disabled':''}>${icon('close')}<span><strong>Towaru jest mniej?</strong><small>Usuń ostatnią sztukę</small></span></button></div>`:''}</div>`;
}
function infoView(){
  const afterConfirm=isLoad()?'Po potwierdzeniu przejdziesz przez każdą sztukę: nakleisz plombę, zeskanujesz jej QR oraz zrobisz zdjęcie z bliska i z daleka.':'Plomba CMR jest już sprawdzona. Po potwierdzeniu porównasz każdą sztukę ze zdjęciami z załadunku, zeskanujesz jej plombę i zrobisz zdjęcie z rozładunku.';
  const quantity=`${count()} ${count()===1?'sztuka':count()<5?'sztuki':'sztuk'}`;
  const confirmation=isLoad()?`Potwierdzam, że załadowałem ${quantity} ładunku zgodnie ze zleceniem.`:`Sprawdziłem, że do rozładowania są ${quantity} ładunku zgodne ze zleceniem.`;
  const liveExit=liveMode()&&!liveOperation.routeKey?`<button class="subpage-back live-exit" id="live-exit">${icon('back')} Najbliższa operacja · ${esc(assignment.id)}</button>`:'';
  const details=current().live?liveDetailsNotice():'';
  const tasks=liveInventoryTasksView();
  return `<div class="app-content">${liveExit}${pageHeading()}${details}${operationTimerView()}${placeView()}<div class="section-heading"><h3>${isLoad()?'Co odbierasz':'Do rozładowania'}</h3><span>Każda sztuka osobno</span></div>${cargoView()}<button class="cargo-mismatch-button" id="report-cargo-mismatch">${icon('chat')}<span><strong>Towar lub jego liczba nie zgadza się ze zleceniem?</strong><small>Zgłoś spedytorowi</small></span>${icon('arrow')}</button>${destinationView()}${optionalView()}<section class="panel loading-confirmation"><div class="section-kicker">${isLoad()?'PO FIZYCZNYM ZAŁADUNKU':'PRZED ROZŁADUNKIEM'}</div><label class="check-row"><input id="physical-confirm" type="checkbox" ${current().physicalConfirmed?'checked':''}><span>${confirmation}</span></label><p>${afterConfirm}</p></section>${tasks}</div>`;
}
function stepHeader(screen,title,description){
  const steps=documentationSteps(),index=steps.indexOf(screen);
  return `<div class="stage-header"><button id="stage-back" aria-label="Wróć do poprzedniego ekranu">${icon('back')}</button><div><span>${esc(operationName())} · ${esc(cargoOrderId())}</span><b>KROK ${index+1} Z 3</b></div>${liveSessionTools()}<button class="stage-chat" data-open-chat aria-label="Otwórz czat i dokumentację">${icon('chat')}</button></div>${operationTimerView(true)}<div class="stage-progress" aria-label="Postęp dokumentacji">${steps.map((step,stepIndex)=>`<span class="${stepIndex===index?'current':progress()[stepIndex]?'done':''}"></span>`).join('')}</div><h2 class="stage-title">${title}</h2><p class="stage-description">${description}</p>`;
}
function sourceLabel(record){if(record.syncState&&record.syncState!=='confirmed')return 'Zapisano na telefonie · oczekuje na synchronizację';if(record.source==='transshipment')return 'Nowe zdjęcie po przeładunku';return record.source==='chat'?'Dodano z czatu':record.chatSynced?'Automatycznie w czacie':record.demo?'Dodano przykład':'Dodano z tego ekranu';}

function piecePhotoButton(piece,index,side){
  const photo=piece.photos[side],near=side==='near',title=side==='unload'?'Zdjęcie z rozładunku':near?'Zdjęcie z bliska':'Zdjęcie z daleka',enabled=Boolean(piece.seal);
  const emptyHint=side==='unload'?(enabled?'Po rozładunku: na rampie lub na ziemi':'Najpierw zeskanuj plombę'):enabled?'Zrób lub dodaj zdjęcie':'Najpierw zeskanuj plombę';
  return `<button class="piece-photo-button ${photo?'done':''}" data-piece-photo="${index}" data-photo-side="${side}" ${enabled?'':'disabled'}>${photo?`<img src="${photo.url}" alt="${title} · ${esc(piece.name)}">`:`<span class="piece-photo-icon">${icon('camera')}</span>`}<span><strong>${title}</strong><small>${photo?sourceLabel(photo):emptyHint}</small></span>${photo?icon('check'):icon('arrow')}</button>`;
}
function loadingPhotosView(piece){
  const photos=[['near','Z bliska'],['far','Z daleka']].map(([side,label])=>({side,label,record:piece.loadingPhotos?.[side]})).filter(item=>item.record);
  if(!photos.length)return '';
  return `<div class="loading-photo-reference"><div class="loading-photo-reference-title">${icon('camera')}<span><strong>${piece.loadingPhotos.near?.source==='transshipment'?'Aktualne zdjęcia po przeładunku':'Zdjęcia z załadunku'}</strong><small>Pokazane automatycznie dla porównania</small></span></div><div class="loading-photo-reference-grid">${photos.map(({label,record})=>`<figure><img src="${record.url}" alt="${label} · ${record.source==='transshipment'?'zdjęcie po przeładunku':'zdjęcie z załadunku'} · ${esc(piece.name)}"><figcaption>${label}</figcaption></figure>`).join('')}</div></div>`;
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
  return `<div class="app-content">${header}<div class="piece-sequence-note">${sequence}</div>${liveLoadingPhotosGallery()}${current().items.map(pieceTaskCard).join('')}<div class="auto-chat-hint">${icon('chat')}<span><strong>Automatycznie w czacie</strong>${isLoad()?'Zdjęcia każdej sztuki':'Zdjęcie z rozładunku każdej sztuki'} od razu ${isLoad()?'pojawią':'pojawi'} się w czacie zlecenia.</span></div></div>`;
}
function cmrSealView(){
  const load=isLoad();
  const header=load?stepHeader('seals','Plomba CMR','Po udokumentowaniu wszystkich sztuk naklej plombę na pustym tyle ostatniej strony CMR i zeskanuj jej kod QR.'):stepHeader('seals','Przygotuj dokumenty','Dotarłeś na rozładunek. Na tyle dokumentu CMR znajduje się plomba z numerem zapisanym przy załadunku. Przygotuj CMR i zeskanuj tę plombę.');
  const card=load?`<div class="section-kicker">PUSTY TYŁ OSTATNIEJ STRONY CMR</div><h3>Naklej osobną plombę na pustym tyle strony</h3><p>Ostatnia strona CMR zawiera treść z przodu. Plombę naklej na jej pustym tyle, a następnie zapisz kod QR.</p><label class="check-row"><input id="cmr-label" type="checkbox" ${current().cmrLabel?'checked':''}><span>Plomba jest naklejona na pustym tyle ostatniej strony CMR</span></label>`:`<div class="section-kicker">PLOMBA NA TYLE CMR</div><h3>Zeskanuj plombę CMR</h3><p>Porównaj numer na tyle dokumentu z numerem zapisanym podczas załadunku. Nie naklejaj nowej plomby.</p><div class="expected-seal"><span>Numer plomby CMR z załadunku</span><strong>${esc(current().expectedCmrSeal||(liveMode()?'Super Spedytor sprawdzi zgodność po skanie':'Nie zapisano'))}</strong></div>${liveMode()&&!current().cmrSeal?`<button class="secondary-button" id="live-cmr-missing">${icon('info')}${current().cmrSealSkipped?'Krok pominięty · zeskanuj, jeśli plomba jest':'Na CMR nie ma plomby — pomiń ten krok'}</button>`:''}`;
  const evidence=load?(cargoReady()
    ?`<div class="evidence-status">${icon('check')} Każda sztuka ładunku ma komplet zdjęć · ${completedPieces()}/${count()}</div>`
    :`<div class="shared-hint">${icon('info')} Kompletność zdjęć i plomb niepotwierdzona · ${completedPieces()}/${count()} gotowych sztuk${liveReadOnly()?' · podgląd tylko do odczytu':''}</div>`):'';
  const scanLabel=current().cmrSeal?'Skanuj ponownie':load?'Skanuj QR':'Zeskanuj plombę';
  const afterScan=!load&&current().cmrSeal&&current().loadingDocuments.length?`<section class="prior-cmr-section"><div class="section-heading"><h3>CMR z załadunku</h3><span>Pokazany automatycznie</span></div><p class="prior-cmr-intro">Plomba jest zgodna. Poniżej znajduje się skan CMR wykonany podczas pierwszej operacji — załadunku.</p>${current().loadingDocuments.map((record,index)=>loadingDocumentRecordView(record,index)).join('')}</section>`:'';
  return `<div class="app-content">${header}${evidence}<section class="panel cmr-seal-card"><div class="cmr-seal-illustration"><span>${icon('doc')}</span><span class="cmr-sticker">QR</span></div>${card}<div class="seal-code-row">${current().cmrSeal?`<strong>${esc(current().cmrSeal)}</strong>`:'<span>Kod plomby CMR nieodczytany</span>'}<button class="scan-button ${current().cmrSeal?'scanned':''}" id="scan-cmr-seal" ${load&&!current().cmrLabel?'disabled':''}>${icon(current().cmrSeal?'check':'qr')}${scanLabel}</button></div></section>${liveCmrSealRows()}${afterScan}${load?`<div class="shared-hint">${icon('info')} Po zapisaniu QR przejdziesz do skanu wypełnionego dokumentu CMR.</div>`:''}${liveInventoryTasksView()}</div>`;
}
function demoDocument(page=1,operation=state.operation,orderId=cargoOrderId()){
  return `<div class="demo-document"><div class="document-paper"><h4>CMR</h4><p>MIĘDZYNARODOWY SAMOCHODOWY LIST PRZEWOZOWY</p><p>Magazyn demonstracyjny Alfa → Centrum demonstracyjne Beta</p><p>Zlecenie ${esc(orderId)}</p><div class="paper-grid"></div><div class="paper-signature">${operation==='load'?'Nadawca':'Odbiorca'} · ${page}</div></div><div class="demo-label">DOKUMENT DEMONSTRACYJNY</div></div>`;
}
function loadingDocumentRecordView(record,index){
  return `<div class="document-page prior-document-page"><h4>${record.mime==='application/pdf'?'Plik PDF':`Strona ${index+1}`}</h4>${record.demo?demoDocument(index+1,'load'):record.mime==='application/pdf'?`<a href="${record.url}" target="_blank" rel="noopener" class="pdf-preview">${icon('doc')}<strong>${esc(record.name)}</strong><span>Otwórz CMR z załadunku ${icon('arrow')}</span></a>`:`<img class="document-image" src="${record.url}" alt="Skan CMR wykonany przy załadunku">`}<div class="document-source">CMR z załadunku · tylko do wglądu</div></div>`;
}
function documentRecordView(record,index,removable=true){
  return `<div class="document-page"><h4>${record.mime==='application/pdf'?'Plik PDF':`Strona ${index+1}`} ${removable?`<button data-remove-document="${index}" aria-label="Usuń ten skan">${icon('close')}</button>`:''}</h4>${record.demo?demoDocument(index+1):record.mime==='application/pdf'?`<a href="${record.url}" target="_blank" rel="noopener" class="pdf-preview">${icon('doc')}<strong>${esc(record.name)}</strong><span>Otwórz podgląd PDF ${icon('arrow')}</span></a>`:`<img class="document-image" src="${record.url}" alt="Podgląd skanu dokumentu CMR">`}<div class="document-source">${sourceLabel(record)}</div>${record.qualityReview?`<span class="scanner-source-tag">${icon('check')}Podgląd sprawdzony przez kierowcę${record.width?` · ${record.width} × ${record.height} px`:''}</span>`:''}</div>`;
}
function documentConfirmation(){
  return `<label class="check-row document-confirmation ${current().documents.length?'':'disabled'}"><input id="documents-confirm" type="checkbox" ${current().documentsComplete?'checked':''} ${current().documents.length?'':'disabled'}><span>Potwierdzam, że skan CMR jest czytelny i zawiera wszystkie strony.</span></label>`;
}
function documentsView(){
  const records=current().documents;
  const title=isLoad()?'Skan dokumentu CMR':'Skan CMR po rozładunku';
  const description=liveReadOnly()&&!cmrSealReady()?'Podgląd dokumentacji CMR. Plomba nie jest jeszcze potwierdzona w tej operacji.':isLoad()?'Plomba dokumentu jest już zapisana. Teraz dołącz pełny, czytelny skan wypełnionego CMR.':'Plomba CMR i sztuki ładunku są już sprawdzone. Po rozładunku dołącz nowy, pełny i czytelny skan dokumentu CMR.';
  return `<div class="app-content">${stepHeader('documents',title,description)}<div class="evidence-status">${icon(cmrSealReady()?'check':'info')} ${cmrSealReady()?(isLoad()?'Plomba na pustym tyle ostatniej strony CMR':'Plomba CMR zgodna z załadunkiem'):'Plomba CMR niepotwierdzona'}${current().cmrSeal?` · ${esc(current().cmrSeal)}`:''}</div>${records.length?`<div class="evidence-status ${documentReady()?'ready':'pending'}">${icon(documentReady()?'check':'info')}${records.some(record=>record.syncState&&record.syncState!=='confirmed')?'Plik zapisano na telefonie — oczekuje na synchronizację.':records.some(record=>record.source==='chat')?'CMR dodany z czatu — jest również tutaj.':'CMR dodany do zlecenia i automatycznie do czatu.'}</div>`:''}<section class="panel document-panel">${records.length?records.map((record,index)=>documentRecordView(record,index,!liveMode())).join(''):`<button class="document-placeholder" id="add-document">${icon('camera')}<strong>${isLoad()?'Zeskanuj dokument CMR':'Zeskanuj CMR po rozładunku'}</strong><small>Wszystkie strony, czytelny tekst i podpisy</small></button>`}${records.length?`<button class="secondary-button" id="add-document">${icon('plus')} Dodaj stronę lub plik</button>`:''}<p class="document-hints">Sprawdź cały dokument: krawędzie stron, numery, ostrość tekstu i podpisy.</p></section><div class="document-assertion">${documentConfirmation()}</div><div class="auto-chat-hint">${icon('chat')}<span><strong>Po synchronizacji w czacie</strong>Strony CMR i pliki PDF pojawią się w czacie zlecenia po potwierdzeniu wysyłki.</span></div></div>`;
}
function cmrRetentionView(){
  if(isLoad()||liveMode())return '';
  const scanned=current().cmrReturnCode===current().cmrSeal&&Boolean(current().cmrSeal);
  return `<section class="panel cmr-retention-panel"><div class="section-kicker">${icon('qr')} PRZED ODJAZDEM</div><h3>CMR z plombą zostaje u Ciebie</h3><p>Po podpisaniu odbierz ten dokument od rozładowcy. Zeskanuj ponownie plombę na jego odwrocie.</p><strong class="retained-seal">${esc(current().cmrSeal)}</strong><button class="scan-button" id="scan-cmr-return">${icon(scanned?'check':'qr')}${scanned?'Plomba sprawdzona · skanuj ponownie':'Skanuj plombę CMR po rozładunku'}</button><label class="check-row"><input id="cmr-retained" type="checkbox" ${current().cmrRetained?'checked':''} ${scanned?'':'disabled'}><span>Mam przy sobie CMR z tą plombą. Dokument zostaje u mnie w aucie.</span></label></section>`;
}
function reviewView(){
  const photoTotal=count()*(isLoad()?2:1),actualPhotos=photoRecords(current()).length;
  const cargoDone=cargoReady(),sealDone=cmrSealReady(),documentDone=documentReady(),ready=allReady();
  const cargoDetail=isLoad()?'Każda ma plombę, QR oraz zdjęcie z bliska i z daleka':'Każda ma zgodny skan plomby oraz zdjęcie z rozładunku';
  const photoDetail=isLoad()?'Dwa osobne ujęcia każdej pozycji':'Jedno zdjęcie z rozładunku każdej pozycji';
  const cmrDetail=isLoad()?'Plomba na pustym tyle ostatniej strony':'Numer zgodny z plombą zapisaną przy załadunku';
  const sequence=isLoad()?'sztuki ładunku → plomba CMR → skan CMR':'plomba CMR → sztuki ładunku → skan CMR po rozładunku';
  return `<div class="app-content"><button class="subpage-back" id="review-back">${icon('back')} Wróć do skanu CMR</button>${liveSessionTools()}<div class="overline">SPRAWDŹ PRZED ZAKOŃCZENIEM</div><h2 class="stage-title">${ready?'Dokumentacja gotowa':'Dokumentacja w trakcie'}</h2><p class="stage-description">${ready?'Wymagana kolejność została wykonana':'Aktualny stan dokumentacji'} dla zlecenia ${esc(cargoOrderId())}.</p>${operationTimerView(true)}${cmrRetentionView()}<section class="panel review-checklist"><div>${icon(cargoDone?'check':'info')}<span>Sztuki ładunku<small>${cargoDetail}</small></span><b>${completedPieces()}/${count()}</b></div><div>${icon(actualPhotos===photoTotal&&photoTotal>0?'check':'info')}<span>Zdjęcia sztuk ładunku<small>${photoDetail}</small></span><b>${actualPhotos}/${photoTotal}</b></div><div>${icon(sealDone?'check':'info')}<span>Plomba CMR<small>${cmrDetail}${current().cmrSeal?` · ${esc(current().cmrSeal)}`:''}</small></span><b>${sealDone?'1/1':'0/1'}</b></div><div>${icon(documentDone?'check':'info')}<span>Pełny skan dokumentu CMR<small>${current().documents.length} ${current().documents.length===1?'plik':'pliki'} · ${documentDone?'kompletność potwierdzona':'kompletność niepotwierdzona'}</small></span><b>${documentDone?'OK':'Brak'}</b></div></section><p class="small-note">Zakończenie jest dostępne dopiero po wykonaniu całej sekwencji: ${sequence}.</p></div>`;
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
  return `<div class="app-content"><div class="chat-header"><button id="chat-back" aria-label="Wróć do operacji">${icon('back')}</button><span><strong>Czat zlecenia</strong><small>${esc(cargoOrderId())} · spedytor</small></span><span class="badge orange">Symulacja</span></div><div class="chat-bubble"><span>Spedytor</span><p>${instruction}</p></div>${chatMessagesView(record.messages)}${autoCount?`<div class="chat-system-note">${icon('check')} Aplikacja automatycznie dodała ${autoCount} ${materialWord(autoCount)} do czatu.</div>`:''}<div class="chat-evidence-summary"><div>${icon('camera')} Zdjęcia sztuk <b>${photos.length}/${photoTarget}</b></div><div>${icon('doc')} Dokument CMR <b>${record.documents.length?`${record.documents.length} plik${record.documents.length===1?'':'i'}`:'Do dodania'}</b></div></div>${record.items.flatMap((piece,pieceIndex)=>sides.map(side=>({piece,pieceIndex,side,photo:piece.photos[side]})).filter(item=>item.photo)).map(({piece,pieceIndex,side,photo})=>`<div class="chat-file">${icon('camera')}<div><strong>Sztuka ${pieceIndex+1} · ${side==='near'?'z bliska':side==='far'?'z daleka':'zdjęcie z rozładunku'}</strong><small>${esc(piece.name)} · ${photo.source==='chat'?'dodano w czacie':'automatycznie z operacji'}</small></div>${icon('check')}</div>`).join('')}${record.documents.map((document,index)=>`<div class="chat-file">${icon('doc')}<div><strong>CMR · ${document.mime==='application/pdf'?esc(document.name):`strona ${index+1}`}</strong><small>${document.source==='chat'?'Dodano w czacie':'Automatycznie z ekranu CMR'} · w dokumentacji</small></div>${icon('check')}</div>`).join('')}${record.documents.length?`<section class="panel chat-document-confirmation">${documentConfirmation()}</section>`:''}<div class="shared-hint">${icon('info')} Zdjęcia poszczególnych sztuk i skany CMR trafiają automatycznie tutaj.</div>${!record.started?`<p class="small-note">${isLoad()?'Załączniki dodasz po potwierdzeniu wykonania załadunku.':'Załączniki dodasz po potwierdzeniu liczby sztuk do rozładowania.'}</p>`:''}${chatComposerView()}</div>`;
}
function successView(){
  const photoTotal=count()*(isLoad()?2:1);
  return `<div class="app-content"><section class="panel completion-panel"><span class="success-icon">${icon('check')}</span><h2>${esc(operationName())} zakończony</h2><p>${esc(currentPlace().company)}<br>Dokumentacja jest kompletna w tym podglądzie.</p><div class="summary-line">${icon('check')} Sztuki ładunku <b>${count()}/${count()}</b></div><div class="summary-line">${icon('check')} ${isLoad()?'Zdjęcia każdej sztuki':'Zdjęcia z rozładunku'} <b>${photoTotal}/${photoTotal}</b></div><div class="summary-line">${icon('check')} Plomba CMR <b>${esc(current().cmrSeal)}</b></div><div class="summary-line">${icon('check')} Pełny skan CMR <b>OK</b></div></section><p class="small-note">To demonstracja. Żadne pliki ani wiadomości nie zostały wysłane do rzeczywistego systemu.</p></div>`;
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
const fuelPhotoLabels={receipt:['receipt','Paragon za diesel *','Cały paragon z widoczną pozycją Diesel, kwotą i stacją'],adBlueReceipt:['receipt','Paragon za AdBlue *','Cały paragon z widoczną pozycją AdBlue, kwotą i stacją'],dispenser:['fuel','Dystrybutor','Widoczne litry i kwota na dystrybutorze'],nozzle:['camera','Pistolet w pojeździe','Pistolet wsadzony do tankowanego pojazdu']};
const fuelingPhotoKeys=['dispenser','nozzle'];
const fuelingPhotosReady=()=>fuelingPhotoKeys.every(key=>Boolean(currentStop().photos[key]));
const adBlueReceiptReady=()=>Boolean(currentStop().photos.adBlueReceipt);
const receiptReady=()=>Boolean(currentStop().photos.receipt&&(!currentStop().expense.withAdBlue||adBlueReceiptReady()));
const fuelExpenseNumber=value=>Number(String(value).trim().replace(',','.'));
const positiveNumber=value=>Number.isFinite(fuelExpenseNumber(value))&&fuelExpenseNumber(value)>0;
const fuelExpenseReady=()=>{
  const expense=currentStop().expense;
  return Boolean(expense.country&&positiveNumber(expense.liters)&&positiveNumber(expense.price)&&(!expense.withAdBlue||(positiveNumber(expense.adBlueLiters)&&positiveNumber(expense.adBluePrice))));
};
const fuelingReady=()=>fuelingPhotosReady()&&receiptReady()&&fuelExpenseReady();
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
function buildFuelExpenseRecords(){
  if(!fuelingReady())return [];
  const stop=currentStop(),expense=stop.expense;
  const record=(type,liters,price,receipt)=>{
    const quantity=fuelExpenseNumber(liters),unitPrice=fuelExpenseNumber(price),total=quantity*unitPrice;
    return {id:`${routePointIds.fueling}:${type}`,type,country:expense.country,currency:expenseCurrency(),liters:quantity,unitPrice,amount:Math.round((total+Number.EPSILON*total)*100)/100,receipt:{...receipt},syncStatus:'PREVIEW_ONLY'};
  };
  const records=[record('diesel',expense.liters,expense.price,stop.photos.receipt)];
  if(expense.withAdBlue)records.push(record('adblue',expense.adBlueLiters,expense.adBluePrice,stop.photos.adBlueReceipt));
  return records;
}
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
  return `<div class="app-content"><div class="stage-header route-stage-header"><button data-stop-back="photos" aria-label="Wróć do tankowania">${icon('back')}</button><div><span>TANKOWANIE ZAKOŃCZONE</span><b>PARAGON I WYDATEK</b></div><button class="stage-chat" data-stop-chat aria-label="Otwórz czat">${icon('chat')}</button></div><h2 class="stage-title">Dodaj paragon i wydatek</h2><p class="stage-description">Zdjęcia przy pojeździe są już zapisane. Teraz sfotografuj paragon i uzupełnij dane wydatku.</p><div class="fuel-section-heading"><h3>Paragon za diesel *</h3><span>${currentStop().photos.receipt?'1/1':'0/1'}</span></div><div class="fuel-photo-list">${fuelPhotoButton('receipt')}</div><div class="fuel-section-heading expense-heading"><h3>Wydatek za diesel</h3><span id="expense-status">${fuelExpenseReady()&&receiptReady()?'Gotowy':'Wymagane pola lub paragon'}</span></div><section class="panel expense-form"><div class="diesel-fixed"><span>${icon('fuel')}</span><div><small>RODZAJ PALIWA</small><strong>Diesel</strong></div></div><label><span>Kraj wydatku *</span><select id="expense-country" class="text-input">${countryOptions(expense.country)}</select></label><div class="expense-two-columns"><label><span>Litry diesla *</span><input id="fuel-liters" class="text-input" inputmode="decimal" value="${esc(expense.liters)}" placeholder="np. 420,50"></label><label><span>Cena za litr (${currency}) *</span><input id="fuel-price" class="text-input" inputmode="decimal" value="${esc(expense.price)}" placeholder="np. 1,72"></label></div><label class="check-row adblue-toggle"><input id="with-adblue" type="checkbox" ${expense.withAdBlue?'checked':''}><span>Tankowałem również AdBlue</span></label>${expense.withAdBlue?`<div class="adblue-fields"><div class="adblue-title">${icon('drop')}<span><strong>AdBlue</strong><small>Osobny wydatek z własnym zdjęciem paragonu.</small></span></div><div class="expense-two-columns"><label><span>Litry AdBlue *</span><input id="adblue-liters" class="text-input" inputmode="decimal" value="${esc(expense.adBlueLiters)}" placeholder="np. 32,00"></label><label><span>Cena za litr (${currency}) *</span><input id="adblue-price" class="text-input" inputmode="decimal" value="${esc(expense.adBluePrice)}" placeholder="np. 0,79"></label></div><div class="fuel-section-heading"><h3>Paragon za AdBlue *</h3><span>${adBlueReceiptReady()?'1/1':'0/1'}</span></div><div class="fuel-photo-list">${fuelPhotoButton('adBlueReceipt')}</div><p class="adblue-receipt-note">Zdjęcie jest obowiązkowe. Jeśli diesel i AdBlue są na jednym paragonie, dodaj jego zdjęcie także tutaj.</p></div>`:''}</section><div class="fuel-system-note">${icon('info')}<p>Po zapisaniu wydatku aplikacja ponownie sprawdzi czas jazdy. Jeśli sugestia nadal obowiązuje, zapyta, czy rozpocząć przerwę.</p></div></div>`;
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
  return `<div class="app-content"><button class="subpage-back" id="fuel-expense-back">${icon('back')} Wróć do wydatku</button><section class="panel completion-panel"><span class="success-icon">${icon(started||active?'clock':'fuel')}</span><h2>${esc(heading)}</h2><p>${esc(stop.company)}<br>Dokumentacja demonstracyjna jest kompletna.</p><div class="summary-line">${icon('check')} Zdjęcia w trakcie tankowania <b>2/2</b></div>${record.expenseRecords.map(item=>`<div class="summary-line fuel-expense-record" data-expense-type="${esc(item.type)}">${icon('receipt')}<span><strong>${item.type==='diesel'?'Diesel':'AdBlue'} · osobny wydatek</strong><small>${esc(item.liters)} l · ${esc(item.unitPrice)} ${esc(item.currency)}/l<br>Paragon: ${esc(item.receipt.name)}</small></span><b>${esc(item.amount.toFixed(2))} ${esc(item.currency)}</b></div>`).join('')}<div class="summary-line">${icon('check')} Przygotowane wydatki <b>${record.expenseRecords.length}</b></div></section>${breakOutcome}<p class="small-note">To demonstracja. Wydatek, zdjęcia i zgłoszenie przerwy nie zostały zapisane w rzeczywistym systemie.</p></div>`;
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
  const ready=record.groups.filter(collectionEnvelopeReady).length;
  return `${collectionHeader('info','Lista kierowców, od których odbierzesz dokumenty.','Wybierz osobę, od której odbierzesz dokumenty. Następnie zeskanuj każdą plombę na CMR i dodaj dokumenty do nowej, pustej koperty.')}
    <div class="collection-envelope-progress" role="status"><span>${icon('envelope')}</span><div><strong>${ready}/${record.groups.length}</strong><b>koperty gotowe</b><small>Każdy kierowca ma osobną kopertę</small></div></div>
    <div class="collection-queue-title"><span>KIEROWCY I CMR-Y DO ODBIORU</span></div>
    <div class="collection-driver-queue collection-driver-choice-list">${[...record.groups].sort((left,right)=>Number(collectionEnvelopeReady(left))-Number(collectionEnvelopeReady(right))).map(group=>{
      const item=collectionSource(group.sourceId),orders=collectionGroupOrders(group),sealed=collectionEnvelopeReady(group),missing=collectionMissingOrders(group);
      const content=`<span class="collection-driver-state">${sealed?icon('check'):esc(item.initials)}</span><span class="collection-driver-choice-content"><strong>${esc(item.name)}</strong><small>${esc(item.vehicle)} · ${sealed?`Przejęto ${group.documents.length}/${orders.length} CMR`:`${orders.length} CMR do odbioru`}</small><span class="collection-driver-orders">${orders.map(order=>`<b>${esc(order.orderId)}</b>`).join('')}</span>${sealed?`<em><span class="collection-received-badge">${icon('check')}Koperta odebrana</span>${missing.length?`<span class="collection-shortage-badge">Do wyjaśnienia: brak ${missing.length} CMR</span>`:''}Plomba ${esc(group.envelope.sealCode)}</em>`:`<span class="collection-driver-choice-action">Odbieram dokumenty ${icon('arrow')}</span>`}</span>`;
      return sealed?`<div class="collection-driver-choice collection-color-${item.color} complete">${content}</div>`:`<button data-collection-source="${esc(group.sourceId)}" class="collection-driver-choice collection-color-${item.color}" aria-label="Odbieram dokumenty od: ${esc(item.name)}">${content}</button>`;
    }).join('')}</div>
    <div class="collection-large-instruction collection-selection-help">${icon('info')}<p><strong>Jedna osoba = jedna koperta</strong>Porównaj każdy papierowy CMR z podglądem i zatwierdź odbiór, zanim włożysz go do koperty.</p></div>
    ${collectionSimulationControls()}`;
}
function collectionSimulationControls(){
  if(androidShell)return '';
  return `<details class="collection-simulation-controls"><summary>Symulacje odbioru dokumentów</summary><p>Fikcyjne osoby i dane. Rozpoczniesz nowy przykład odbioru od Marka Nowaka.</p><button data-collection-scenario="missing">Brakuje CMR · odbiór 5 z 6</button><button data-collection-scenario="foreign">6 dokumentów · jeden innej osoby</button><button data-collection-scenario="complete">Pełny komplet · zacznij od nowa</button></details>`;
}
function startCollectionScenario(scenario){
  if(!hasOwn(collectionScenarios,scenario))return;
  clearTimeout(toastTimer);$('#toast').textContent='';$('#toast').classList.remove('visible');
  const record=freshDocumentCollection();record.scenario=scenario;
  state.routeStops.collection=record;
  state.routeStop='collection';state.serviceOpen=false;
  if(scenario!=='complete'){
    const group=record.groups[0];
    record.activeSourceId=group.sourceId;record.started=true;
    group.documents=collectionOrders.filter(order=>order.sourceId===group.sourceId).slice(0,5).map((order,index)=>({
      id:`collection-fixture-${order.id}`,hash:`tms-scan-${order.id}`,demo:true,kind:'collection-cmr-reference',mime:'image/svg+xml',
      name:`CMR-${order.orderId}`,handoverId:order.id,sourceId:order.sourceId,orderId:order.orderId,qrCode:order.qrCode,
      unloadedAt:order.unloadedAt,confirmed:true,acceptedAt:`10:${String(30+index).padStart(2,'0')}`
    })).reverse();
  }
  goStop(scenario==='complete'?'info':'photos');
}
function collectionShortageView(group){
  const missing=collectionMissingOrders(group);
  if(!missing.length)return '';
  return `<section class="collection-exception recorded" role="status"><div class="collection-exception-title">${icon('warning')}<h3>Odebrano ${group.documents.length}/${collectionGroupOrders(group).length} CMR · brak ${missing.length}</h3></div><p>Brakujące oryginały:</p><ul>${missing.map(order=>`<li><strong>${esc(order.orderId)}</strong><small>Plomba ${esc(order.qrCode)}</small><button class="collection-reference-button" data-collection-reference="${esc(order.id)}" data-collection-source="${esc(group.sourceId)}">${icon('doc')}Pokaż skan brakującej CMR</button></li>`).join('')}</ul><p>Te dokumenty nie zostały przejęte i nie znajdą się w kopercie. Brak pozostaje przy przekazującym do wyjaśnienia.</p><b class="collection-local-report">Brak odnotowany w podglądzie · oczekuje na wysłanie</b></section>`;
}
function collectionBlockedDocumentView(group){
  const document=group.blockedDocument,owner=collectionSource(document.sourceId),active=collectionSource(group.sourceId);
  return `<section class="collection-exception blocked" role="alert"><div class="collection-exception-title">${icon('warning')}<h2>To CMR innej osoby</h2></div><strong class="collection-blocked-order">${esc(document.orderId)}</strong><dl><div><dt>Przypisany do</dt><dd>${esc(owner.name)}</dd></div><div><dt>Odbierasz teraz od</dt><dd>${esc(active.name)}</dd></div></dl><p><strong>Nie wkładaj tego dokumentu do aktualnej koperty.</strong>Odłóż go osobno i wyjaśnij z przekazującym. Nie został przejęty.</p><div class="collection-rejected-counter">Przejęte nadal: ${group.documents.length}/${collectionGroupOrders(group).length}</div><button class="primary-button" id="collection-dismiss-foreign">Odłożony · wróć do odbioru</button></section>`;
}
function collectionInfoView(){
  return `<div class="app-content">${collection().role==='transferor'?transferorCollectionView():receiverCollectionInfoView()}</div>`;
}
function collectionDocumentPreview(record,index){
  const source=collectionSource(record.sourceId);
  const preview=record.demo?demoDocument(1,'unload',record.orderId):record.mime==='application/pdf'?`<a href="${record.url}" target="_blank" rel="noopener" class="pdf-preview">${icon('doc')}<strong>${esc(record.name)}</strong><span>Otwórz skan CMR z systemu ${icon('arrow')}</span></a>`:`<img class="collection-document-image" src="${record.url}" alt="Skan CMR z systemu dla zlecenia ${esc(record.orderId)}">`;
  return `<section class="panel collection-document-card confirmed"><div class="collection-document-heading"><span class="number-circle">${index+1}</span><div>${index===0?'<span class="collection-newest-badge">NAJNOWSZY PRZEJĘTY</span>':''}<small>${esc(source.name)} · przejęto ${esc(record.acceptedAt||record.scannedAt||'przed chwilą')}</small><h3>${esc(record.orderId)}</h3></div><span class="collection-accepted-icon" aria-label="Dokument przejęty">${icon('check')}</span></div><div class="collection-match-status">${icon('check')} DOKUMENT PRZEJĘTY · oryginał zgodny ze skanem CMR</div><div class="collection-preview">${preview}</div></section>`;
}
function collectionSearchPreview(order){
  return `<div class="collection-reference-meta"><strong>${esc(order.orderId)}</strong><span>Plomba CMR: ${esc(order.qrCode)}</span></div><div class="collection-preview collection-search-preview">${demoDocument(1,'unload',order.orderId)}</div><p class="collection-reference-note">Podgląd do szukania oryginału. Nie potwierdza odbioru i nie dodaje CMR do koperty.</p>`;
}
function collectionPendingDocumentView(record){
  const source=collectionSource(record.sourceId);
  const preview=record.demo?demoDocument(1,'unload',record.orderId):record.mime==='application/pdf'?`<a href="${record.url}" target="_blank" rel="noopener" class="pdf-preview">${icon('doc')}<strong>${esc(record.name)}</strong><span>Otwórz cały skan CMR ${icon('arrow')}</span></a>`:`<img class="collection-document-image" src="${record.url}" alt="Cały skan CMR do zlecenia ${esc(record.orderId)}">`;
  return `<section class="panel collection-pending-card compact-cmr"><h2>Sprawdź CMR</h2><div class="collection-cmr-identifiers"><span>Plomba na dokumencie<strong>${esc(record.qrCode)}</strong></span><span>Numer zlecenia<strong>${esc(record.orderId)}</strong></span></div><p class="cmr-source">Od: ${esc(source.name)} · ${esc(source.vehicle)}</p><div class="collection-preview collection-pending-preview">${preview}</div><p class="cmr-compare-hint">Porównaj cały skan z papierowym dokumentem.</p><div class="collection-verification-actions"><button class="primary-button" id="collection-accept-document">${icon('check')}Jest OK</button><button class="secondary-button" id="collection-reject-document">${icon('close')}Nie przyjmuję, to nie jest ten dokument</button></div></section>`;
}

function collectionScanView(){
  const group=collectionGroup(),source=collectionSource(group.sourceId),orders=collectionGroupOrders(group),available=availableCollectionOrders(group),verifying=group.pendingDocument;
  if(verifying)return `<div class="app-content cmr-verification-content">${collectionPendingDocumentView(verifying)}</div>`;
  if(group.blockedDocument)return `<div class="app-content">${collectionBlockedDocumentView(group)}</div>`;
  const headerTitle=verifying?'Sprawdź zeskanowany CMR':`Odbierasz dokumenty od: ${source.name}`;
  const headerDescription=verifying?'QR został rozpoznany, ale dokument nie został jeszcze przejęty. Porównaj papierowy oryginał z podglądem i wybierz jedną decyzję.':'Skup się teraz wyłącznie na tej osobie. Po zatwierdzeniu każdy przejęty CMR trafi na samą górę listy.';
  const acceptedList=group.documents.length?`<div class="collection-accepted-heading"><span>JUŻ PRZEJĘTE DOKUMENTY</span><b>${group.documents.length}/${orders.length}</b></div>${group.documents.map(collectionDocumentPreview).join('')}`:'';
  const missing=collectionMissingOrders(group),simulation=collection().scenario!=='complete'&&group.sourceId===collectionSources[0].id&&group.documents.length===5;
  const simulationNote=simulation?`<div class="collection-simulation-note"><b>SYMULACJA · ${esc(collectionScenarios[collection().scenario])}</b><span>Pięć CMR już sprawdzono i przyjęto. ${collection().scenario==='missing'?'Marek nie ma ostatniej CMR z listy.':'Marek podaje szósty dokument, ale QR wskazuje Piotra Wiśniewskiego.'}</span></div>`:'';
  const unresolved=available.length?`<section class="collection-outstanding"><h3>Jeszcze do odebrania · ${available.length}</h3><p>Nie możecie znaleźć CMR? Otwórz skan i sprawdźcie inne koszulki. Jeśli nadal go nie ma, zgłoś brak.</p>${available.map(order=>`<div><strong>${esc(order.orderId)}</strong><small>Plomba ${esc(order.qrCode)}</small><button class="collection-reference-button" data-collection-reference="${esc(order.id)}">${icon('doc')}Pokaż skan CMR</button></div>`).join('')}<button class="collection-report-missing" id="collection-report-missing">${icon('warning')}Zgłoś brak dokumentu</button></section>`:'';
  const success=collectionAssessment(group).complete&&!group.envelope.sealCode?`<div class="collection-prepared-state collection-large-instruction">${icon('check')}<p><strong>Wszystkie CMR-y zostały przejęte</strong>Możesz zamknąć kopertę z ${group.documents.length} dokumentami.</p></div>`:'';
  return `<div class="app-content">${collectionHeader('photos',headerTitle,headerDescription)}${simulationNote}<div class="collection-driver-ribbon collection-color-${source.color}"><span>${esc(source.initials)}</span><p><small>AKTYWNA KOPERTA</small><strong>${esc(source.name)}</strong>${esc(source.vehicle)}</p><b>${group.documents.length}/${orders.length}</b></div>
    ${group.envelope.sealCode||(!available.length&&!missing.length)?'':`<button class="collection-add-document collection-scan-primary" id="collection-add-document">${icon('qr')}<span><strong>${missing.length&&!available.length?'Skanuj odnaleziony CMR':group.documents.length?'Skanuj następny CMR':'Skanuj pierwszy CMR'}</strong><small>Porównaj podgląd i zatwierdź dokument. Dopiero wtedy zostanie przejęty.</small></span>${icon('arrow')}</button>`}
    <div class="collection-counter"><span>${icon('check')}<strong>Przejęte: ${group.documents.length} z ${orders.length}</strong></span><b>${missing.length?'Odnotowano brak: '+missing.length:'Tylko zatwierdzone CMR'}</b></div>${collectionShortageView(group)}${unresolved}${success}${acceptedList}<div class="collection-chain-note collection-large-instruction">${icon('info')}<p><strong>Aktualna koperta: ${esc(source.name)}</strong>Wkładaj tutaj tylko zatwierdzone dokumenty tej osoby. CMR innego kierowcy nie zostanie dodany do tej koperty.</p></div></div>`;
}
function collectionEnvelopeView(){
  const group=collectionGroup(),source=collectionSource(group.sourceId),sealed=Boolean(group.envelope.sealCode);
  return `<div class="app-content">${collectionHeader('documents',`Zamknij kopertę · ${source.name}`,'Włóż odebrane CMR do nowej, pustej koperty. Zamknij ją, naklej nieużytą plombę i zeskanuj jej QR.')}
    <section class="panel collection-envelope-card" id="collection-envelope-checklist">
      <div class="collection-packing-instruction">${icon('envelope')}<div><strong>Sprawdź wszystkie dokumenty.</strong><p>Zamknij kopertę, naklej i zeskanuj plombę.</p></div></div>
      <div class="collection-envelope-owner"><small>OSOBNA KOPERTA</small><strong>${esc(source.name)}</strong><span>${esc(source.vehicle)}</span></div>
      ${collectionShortageView(group)}
      ${sealed?`<div class="collection-assigned-seal compact"><span>PLOMBA PRZYPISANA PRZY ZAMKNIĘCIU</span><strong>${esc(group.envelope.sealCode)}</strong></div>`:''}
      <div class="section-kicker">FAKTYCZNA ZAWARTOŚĆ · ${group.documents.length} CMR</div>
      <div class="collection-envelope-list">${group.documents.map((document,index)=>`<div><span>${index+1}</span><p><strong>${esc(document.orderId)}</strong><small>${esc(source.name)} · dokument przejęty</small></p>${icon('check')}</div>`).join('')}</div>
      <label class="check-row collection-envelope-confirm"><input id="collection-envelope-confirm" type="checkbox" ${group.envelope.contentsConfirmed?'checked':''} ${sealed?'disabled':''}><span>Sprawdziłem zawartość. W kopercie jest dokładnie ${group.documents.length} wymienionych, odebranych oryginałów CMR.</span></label>
      <div class="seal-code-row">${sealed?`<strong>${esc(group.envelope.sealCode)}</strong>`:'<span>Plomba zostanie przypisana po zeskanowaniu QR.</span>'}</div>
    </section>${sealed?`<div class="collection-locked-note">${icon('check')}<p><strong>Ta koperta jest zamknięta</strong>Plomba ${esc(group.envelope.sealCode)} zabezpiecza ${group.documents.length} odebranych CMR. Odnotowane braki nadal pozostają do wyjaśnienia.</p></div>`:''}</div>`;
}
function collectionEnvelopeScannerView(){
  const group=collectionGroup(),source=collectionSource(group.sourceId);
  return `<div class="app-content collection-envelope-scanner"><div class="stage-header"><button data-collection-back="documents" aria-label="Wróć do zawartości koperty">${icon('back')}</button><div><span>Koperta · ${esc(source.name)}</span><b>SKANUJ PLOMBĘ KOPERTY</b></div></div>
    <h2>Zeskanuj plombę z koperty</h2><p class="collection-envelope-scan-hint">Naklej nieużytą plombę na zamknięcie koperty. Skieruj aparat na jej kod QR.</p>
    <div class="collection-envelope-visual collection-envelope-scan-art" role="img" aria-label="Zamknięta koperta z plombą QR na zamknięciu"><span>${icon('envelope')}</span><i>${icon('qr')}</i><small>Plomba na zamknięciu koperty</small></div>
    <div class="collection-scan-owner"><strong>${esc(source.name)}</strong><span>W kopercie: ${group.documents.length} CMR</span></div>
    <button class="primary-button" id="collection-read-envelope-qr">${icon('camera')}Otwórz skaner plomby</button>
    <p class="small-note">Samo otwarcie skanera nie zamyka odbioru. Numer plomby zostanie przypisany dopiero po odczycie QR.</p></div>`;
}
function collectionReviewView(){
  const record=collection(),group=collectionGroup(),source=collectionSource(group.sourceId),totalDocuments=record.groups.reduce((sum,item)=>sum+item.documents.length,0);
  const missing=record.groups.flatMap(item=>collectionMissingOrders(item));
  if(record.finished)return `<div class="app-content"><section class="panel completion-panel"><span class="success-icon">${icon(missing.length?'warning':'envelope')}</span><h2>${missing.length?'Koperty zamknięte · odbiór z brakami':'Odbiór zabezpieczony'}</h2><p>Odebrano ${totalDocuments}/${collectionOrders.length} CMR. Odebrane dokumenty są w ${record.groups.length} osobnych, zaplombowanych kopertach.</p>${record.groups.map(item=>`<div class="summary-line">${icon('envelope')} ${esc(collectionSource(item.sourceId).name)} <b>${item.documents.length}/${collectionGroupOrders(item).length} CMR<br>${esc(item.envelope.sealCode)}</b></div>`).join('')}<div class="summary-line">${icon('clock')} Synchronizacja z TMS <b>OCZEKUJE</b></div></section>${record.groups.map(collectionShortageView).join('')}<p class="small-note">To demonstracja offline. Zgłoszenie braku i odbiór nie zostały wysłane do Super Spedytora.</p>${collectionSimulationControls()}</div>`;
  return `<div class="app-content">${collectionHeader('review',`Koperta zamknięta · ${source.name}`,'Sprawdź zawartość i plombę. Odnotowany brak pozostaje widoczny także po zamknięciu koperty.')}${collectionShortageView(group)}<section class="panel review-checklist"><div>${icon('check')}<span>Kierowca przekazujący<small>${esc(source.vehicle)}</small></span><b>${esc(source.name)}</b></div><div>${icon('check')}<span>Faktycznie przejęte CMR<small>${group.documents.map(document=>esc(document.orderId)).join(' · ')}</small></span><b>${group.documents.length}/${collectionGroupOrders(group).length}</b></div><div>${icon('check')}<span>Osobna koperta<small>Tylko odebrane dokumenty tej osoby.</small></span><b>1</b></div><div>${icon('check')}<span>Plomba koperty<small>Przypisana przy zeskanowaniu QR.</small></span><b>${esc(group.envelope.sealCode)}</b></div></section><div class="collection-chain-note">${icon('info')}<p><strong>${allCollectionGroupsReady()?'Wszystkie koperty są zamknięte':'Możesz wybrać kolejną osobę'}</strong>Nie otwieraj ponownie zaplombowanej koperty.${missing.length?' Brakujące CMR pozostają do wyjaśnienia.':''}</p></div></div>`;
}
function transshipmentHeader(screen,title,description){
  const steps=['info','photos','review'],index=steps.indexOf(screen),record=transshipment(),progress=transshipmentProgress();
  const done=[record.started,transshipmentReady(),record.finished];
  return `<div class="stage-header transshipment-stage-header">${screen!=='info'?`<button data-transshipment-back="${steps[Math.max(0,index-1)]}" aria-label="Wróć do poprzedniego kroku">${icon('back')}</button>`:`<span class="transshipment-header-icon">${icon('box')}</span>`}<div><span>Przeładunek · ${transshipmentPreviewRole==='transferor'?'wydajesz':'odbierasz'}</span><b>${screen==='info'?'PLAN UŁOŻENIA':record.finished?'POTWIERDZENIE':`ZLECENIE ${Math.min(record.activeOrderIndex+1,record.orders.length)} Z ${record.orders.length}`}</b></div></div><div class="stage-progress transshipment-stage-progress" aria-label="Postęp przeładunku">${steps.map((step,stepIndex)=>`<span class="${stepIndex===index?'current':done[stepIndex]?'done':''}"></span>`).join('')}</div><h2 class="stage-title transshipment-stage-title">${title}</h2><p class="stage-description transshipment-stage-description">${description}</p>${screen!=='info'?`<div class="transshipment-total-progress"><span>${icon('doc')} CMR <b>${progress.cmrDone}/${progress.cmrTotal}</b></span><span>${icon('box')} Sztuki <b>${progress.piecesDone}/${progress.piecesTotal}</b></span></div>`:''}`;
}
function transshipmentPlanCard(order,index,total){
  const position=index===0?'Najgłębiej na aucie':index===total-1?'Przy drzwiach':'Środek przestrzeni ładunkowej';
  const positionClass=index===0?'deep':index===total-1?'door':'middle';
  return `<section class="panel transshipment-plan-card ${positionClass} order-tone-${index%3}"><div class="transshipment-plan-number"><span>${index+1}</span><small>ŁADUJ JAKO</small></div><div class="transshipment-plan-main"><div class="transshipment-plan-flags"><span>W trasie: ${order.unload.sequence}. rozładunek</span><b>${esc(position)}</b></div><h3>${esc(order.id)}</h3><p class="transshipment-source-name">Od: ${esc(order.sourceDriver.name)} · ${esc(order.sourceDriver.vehicle)}</p><p class="transshipment-destination"><strong>${esc(order.unload.company)}</strong>${esc(order.unload.city)} · ${esc(order.unload.appointment)}</p><div class="transshipment-cargo-summary">${icon('box')}<span><strong>${esc(order.goods)}</strong><small>${order.pieces.length} ${order.pieces.length===1?'sztuka':'sztuki'} · ${order.massKg} kg</small></span></div><div class="transshipment-seal-preview"><span><small>PLOMBA CMR / KOPERTY</small><strong>${esc(order.cmr.expectedSeal)}</strong></span><span><small>PLOMBY ŁADUNKU</small><strong>${order.pieces.map(piece=>esc(piece.expectedSeal)).join(' · ')}</strong></span></div></div></section>`;
}
function transshipmentInfoView(){
  return transshipmentOverviewView();
}

function transshipmentBalanceGroups(){
  return [
    {key:'issue',title:'Wydajesz',hint:'Z Twojego auta do drugiego kierowcy',orders:state.routeStops.transshipmentOut.orders},
    {key:'receive',title:'Odbierasz',hint:'Od drugiego kierowcy na Twoje auto',orders:state.routeStops.transshipment.orders},
    {key:'retained',title:'Zostaje u Ciebie',hint:'Już na aucie · jedzie z Tobą dalej',orders:state.routeStops.transshipment.retainedOrders}
  ];
}
function transshipmentBalanceView(){
  return transshipmentBalanceGroups().map(group=>`<section class="panel transfer-balance-group ${group.key}" data-transfer-group="${group.key}"><header><span>${icon(group.key==='retained'?'lock':group.key==='issue'?'truck':'box')}</span><div><h3>${group.title}</h3><p>${group.hint}</p></div><b>${group.orders.reduce((sum,order)=>sum+order.pieces.length,0)} szt.</b></header>${group.orders.map(order=>{
    const source=order.sourceDriver||transshipmentPlan.sourceDriver,ready=group.key==='issue'?transshipmentModel.issuedOrderComplete(order):group.key==='receive'?transshipmentModel.orderComplete(order):false;
    return `<div class="transfer-balance-item"><div><strong>${esc(order.goods)}</strong><small>${esc(order.id)} · ${order.pieces.length} szt. · ${order.massKg} kg</small><p>${group.key==='issue'?`Do: ${esc(order.receiverVehicle.registration)} · ${esc(order.receiverVehicle.driverName)}`:group.key==='receive'?`Od: ${esc(source.vehicle)} · ${esc(source.name)}`:`Rozładunek ${order.unload.sequence} · ${esc(order.unload.city)}`}</p></div><span class="transfer-item-status ${ready?'done':''}">${ready?'Potwierdzone':group.key==='retained'?'Na aucie':'Do '+(group.key==='issue'?'wydania':'odbioru')}</span></div>`;
  }).join('')||'<p class="transfer-empty">Brak pozycji.</p>'}</section>`).join('');
}
function transshipmentLoadingView(){
  const plan=transshipmentModel.vehicleLoadingPlan(state.routeStops.transshipment);
  return `<section class="transfer-layout"><h3>Tak proponujemy ułożyć auto</h3><p>Ostatni rozładunek najgłębiej, pierwszy przy drzwiach. Uwzględniamy też towar, który zostaje u Ciebie.</p><div class="transfer-layout-legend"><span class="receive">Nowo odbierany</span><span class="retained">Zostaje na aucie</span></div><div class="transfer-loading-bay" aria-label="Sugerowane ułożenie całego auta od kabiny do drzwi"><div class="transfer-bay-cab">${icon('truck')}KABINA · NAJGŁĘBIEJ</div>${plan.map(order=>`<section class="transfer-bay-slot ${order.disposition}" data-layout-order="${esc(order.id)}"><b>${order.vehiclePosition}</b><div><small>${order.disposition==='retained'?'ZOSTAJE U CIEBIE':'ODBIERASZ'} · ROZŁADUNEK ${order.unload.sequence}</small><strong>${esc(order.goods)}</strong><span>${esc(order.id)} · ${esc(order.unload.city)}</span>${order.disposition==='retained'?`<em>Teraz: ${esc(order.currentPlacement)}. Sprawdź ustawienie.</em>`:''}</div></section>`).join('')}<div class="transfer-bay-doors">DRZWI · PIERWSZY ROZŁADUNEK</div></div><div class="transshipment-order-rule">${icon('info')}<p><strong>To sugestia ustawienia</strong>Towar wydawany znika z planu dalszej trasy. Towaru, który zostaje, nie odbierasz ponownie. Sprawdź, czy jego obecne ustawienie pozwala dołożyć pozostałe sztuki. Schemat pokazuje kolejność, nie wymiary ani wolne miejsce.</p></div></section>`;
}
function transshipmentSequenceView(){
  const incoming=state.routeStops.transshipment.orders,outgoing=state.routeStops.transshipmentOut.orders;
  return `<section class="transfer-sequence"><h3>Proponowana kolejność pracy</h3><p>Możesz wybrać inne auto. Sugestia ułożenia nadal wynika z kolejności rozładunków całej dalszej trasy.</p><ol><li><strong>Najpierw wydaj towar</strong><p>${outgoing.map(order=>`${esc(order.id)} → ${esc(order.receiverVehicle.registration)}`).join(' · ')||'Nie masz nic do wydania.'} Zwolnij miejsce na swoim aucie.</p></li><li><strong>Sprawdź to, co zostaje</strong><p>Porównaj obecne ustawienie z zakładką „Ułożenie”. Jeśli towar blokuje miejsce lub dojście, przygotuj je przed odbiorem.</p></li>${incoming.map(order=>`<li class="${transshipmentModel.orderComplete(order)?'done':''}"><strong>${esc(order.goods)}</strong><p>${esc(order.id)} · z auta ${esc(order.sourceDriver.vehicle)} · rozładunek ${order.unload.sequence}</p><small>${transshipmentModel.orderComplete(order)?'CMR i sztuki odebrane':'QR CMR → cały skan → potwierdzenie → sztuki i zdjęcia'}</small></li>`).join('')}<li><strong>Sprawdź całe auto po wymianie</strong><p>Nowe ładunki i te, które zostały, muszą pozwalać na rozładunki w zaplanowanej kolejności.</p></li></ol></section>`;
}
function transshipmentVehicleChoices(){
  const record=transshipment(),outgoing=transshipmentPreviewRole==='transferor',current=transshipmentOrder(),complete=outgoing?transshipmentModel.issuedOrderComplete:transshipmentModel.orderComplete;
  const groups=[...new Map(record.orders.map(order=>[transshipmentModel.counterpartyId(record,order),order])).entries()];
  const recommended=record.orders.find(order=>!complete(order)),locked=(current.cmr.scannedCode||current.cmr.issuedCode)&&!complete(current);
  return `<section class="transfer-vehicle-choices"><h3>${outgoing?'Do którego auta wydajesz?':'Z którego auta odbierasz?'}</h3><p>${locked?'Dokończ CMR i sztuki bieżącego zlecenia, zanim zmienisz auto.':'Wybierz auto. Sugerujemy zacząć od zaznaczonej pozycji.'}</p>${groups.map(([id,first])=>{
    const items=record.orders.filter(order=>transshipmentModel.counterpartyId(record,order)===id),done=items.every(complete),selected=transshipmentModel.counterpartyId(record,current)===id;
    const vehicle=outgoing?first.receiverVehicle.registration:first.sourceDriver.vehicle,name=outgoing?first.receiverVehicle.driverName:first.sourceDriver.name;
    return `<button class="transfer-vehicle-choice ${selected?'selected':''}" data-transshipment-vehicle="${esc(id)}" aria-pressed="${selected}" ${done||locked&&!selected?'disabled':''}><span>${icon(done?'check':'truck')}</span><div><strong>${esc(vehicle)}</strong><span>${esc(name)} · ${items.reduce((sum,order)=>sum+order.pieces.length,0)} szt.</span><small>${done?'Komplet potwierdzony':selected?'Wybrane auto':recommended&&transshipmentModel.counterpartyId(record,recommended)===id?'Sugerowane jako pierwsze':'Możesz wybrać to auto'}</small></div>${icon(selected?'check':'arrow')}</button>`;
  }).join('')}</section>`;
}
function transshipmentOverviewView(){
  const record=transshipment(),tab=record.overviewTab,outgoing=transshipmentPreviewRole==='transferor';
  return `<div class="app-content transfer-overview">${transshipmentHeader('info','Bilans przeładunku',`Twoje auto ${transshipmentPlan.receiverVehicle.registration}. Widzisz całą wymianę i towar, z którym jedziesz dalej.`)}<button class="secondary-button transfer-change-vehicle" data-vehicle-exchange>${icon('truck')}Zamieniamy się całymi autami</button><div class="transfer-role-switch" role="group" aria-label="Tryb przeładunku"><button data-transshipment-role="transferor" aria-pressed="${outgoing}">Wydaję</button><button data-transshipment-role="receiver" aria-pressed="${!outgoing}">Odbieram</button></div><button class="secondary-button transfer-change-vehicle" data-transshipment-choose>${icon('truck')}${outgoing?'Wybierz auto do wydania':'Wybierz auto do odbioru'}</button><div class="transfer-balance-counts">${transshipmentBalanceGroups().map(group=>`<span class="${group.key}"><b>${group.orders.reduce((sum,order)=>sum+order.pieces.length,0)}</b>${group.title}</span>`).join('')}</div><nav class="transfer-overview-tabs" aria-label="Plan przeładunku">${[['balance','Lista'],['layout','Ułożenie'],['sequence','Kolejność']].map(([key,title])=>`<button data-transshipment-tab="${key}" aria-pressed="${tab===key}">${title}</button>`).join('')}</nav>${tab==='layout'?transshipmentLoadingView():tab==='sequence'?transshipmentSequenceView():transshipmentBalanceView()}${transshipmentVehicleChoices()}<p class="small-note">Test widoków · przykładowe ładunki i skany. Każdy kierowca, CMR i sztuka zachowują własne przypisanie.</p></div>`;
}

function transshipmentTransferorView(){
  if(state.screen==='info')return transshipmentOverviewView();
  const record=transshipment(),order=transshipmentOrder(),review=state.screen==='review',piece=transshipmentModel.nextIssuedPiece(order);
  if(record.finished)return `<div class="app-content outgoing-transshipment"><span class="role-badge">WYDAJESZ ŁADUNEK</span><h2>Wydanie zapisane lokalnie</h2><p>Twoje potwierdzenie czeka na odbiór drugiego kierowcy.</p><section class="panel"><h3>Do auta ${esc(record.receiverVehicle.registration)}</h3><p>${record.orders.length} zlecenia · CMR i sztuki wydane po skanach QR</p><strong>OCZEKUJE NA ODBIERAJĄCEGO</strong></section></div>`;
  const cmrTask=order.cmr.handedOver?`<section class="panel outgoing-cmr-task done"><h3>${icon('check')}CMR wydany</h3><p>${esc(order.id)} · ${esc(order.cmr.issuedCode)}</p><details><summary>Pokaż ten sam skan CMR</summary>${transshipmentCmrViewer(order)}</details></section>`:`<section class="panel outgoing-cmr-task"><h3>1. Zeskanuj CMR, który wydajesz</h3><p>Plomba na dokumencie <strong>${esc(order.cmr.expectedSeal)}</strong></p><button class="scan-button" data-transshipment-scan="outgoing-cmr">${icon('qr')}${order.cmr.issuedCode?'Sprawdź QR ponownie':'Skanuj QR z CMR'}</button>${order.cmr.issuedCode?`<div class="outgoing-cmr-preview">${transshipmentCmrViewer(order)}</div><button class="primary-button" id="outgoing-cmr" ${transshipmentModel.cmrReviewComplete(order)?'':'disabled'}>${icon('check')}To ten CMR · przekazałem dokument</button>`:''}</section>`;
  const cargoTask=!order.cmr.handedOver?'':piece?`<section class="panel outgoing-piece active"><h3>2. Wydaj tę sztukę</h3><strong>${esc(piece.name)}</strong><p>Plomba <strong>${esc(piece.expectedSeal)}</strong></p><button class="scan-button" data-transshipment-scan="outgoing-piece" data-piece-id="${esc(piece.id)}">${icon('qr')}${piece.issuedCode?'QR zgodny · sprawdź ponownie':'Skanuj QR tej sztuki'}</button><button class="primary-button" data-outgoing-piece="${esc(piece.id)}" ${piece.issuedCode?'':'disabled'}>${icon('check')}Przekazałem tę sztukę odbierającemu</button></section>`:`<section class="panel outgoing-order-done"><h3>${icon('check')}Wydanie tego zlecenia gotowe</h3><p>CMR i ${order.pieces.length} sztuki mają własne skany QR oraz potwierdzenie wydania.</p></section>`;
  return `<div class="app-content outgoing-transshipment"><button class="secondary-button transfer-back-plan" data-transshipment-back="info">${icon('back')}Bilans i wybór auta</button><span class="role-badge">WYDAJESZ ŁADUNEK I CMR</span><h2>Wydajesz towar do auta ${esc(order.receiverVehicle?.registration||record.receiverVehicle.registration)}</h2><p>Twój pojazd: ${esc(record.sourceDriver.vehicle)}. Zeskanuj CMR oraz każdą sztukę, zanim potwierdzisz ich wydanie.</p>${record.started&&!review?`${transshipmentCurrentContext(order)}${cmrTask}${cargoTask}`:`${transshipmentBalanceView()}${transshipmentLoadingView()}`}<p class="small-note">To potwierdzenie wydającego. Odbierający osobno skanuje i potwierdza przejęcie. Test zapisuje się lokalnie.</p></div>`;
}

function transshipmentDemoCmrPage(order,page){
  const labels=['Nadawca / Sender','Odbiorca / Consignee','Miejsce przeznaczenia / Place of delivery','Miejsce i data załadowania / Place and date of taking over','Załączone dokumenty / Documents attached','Znaki i numery / Marks and numbers','Liczba sztuk / Number of packages','Sposób opakowania / Method of packing','Rodzaj towaru / Nature of goods','Numer statystyczny / Statistical number','Waga brutto / Gross weight, kg','Objętość / Volume, m³','Instrukcje nadawcy / Sender instructions','Postanowienia dotyczące przewoźnego / Freight payment','Zapłata / Cash on delivery','Przewoźnik / Carrier','Kolejni przewoźnicy / Successive carriers','Zastrzeżenia przewoźnika / Carrier reservations','Postanowienia specjalne / Special agreements','Do zapłacenia / To be paid by','Wystawiono / Established in','Podpis nadawcy / Sender signature','Podpis przewoźnika / Carrier signature','Podpis odbiorcy / Consignee signature'];
  const values={1:'Magazyn demonstracyjny Alfa',2:order.unload.company,3:order.unload.city,4:'Punkt demonstracyjny · 14.10.2026',5:order.id,6:order.pieces.map(piece=>piece.expectedSeal).join(' · '),7:String(order.pieces.length),8:'Opakowania transportowe',9:order.goods,11:String(order.massKg),13:'Kolejność rozładunków: '+order.unload.sequence,16:'Przewoźnik demonstracyjny AMG',18:'Przykład do testów widoku',21:'Kassel · 14.10.2026',22:'NADAWCA · PODPIS DEMO',23:'KIEROWCA · PODPIS DEMO',24:'Miejsce na podpis i pieczątkę'};
  const cells=labels.map((label,index)=>{const number=index+1,x=index<12?28:408,y=140+(index%12)*75;return `<rect x="${x}" y="${y}" width="358" height="75" fill="white" stroke="#8c9690"/><text x="${x+10}" y="${y+18}" font-size="10" fill="#414b45">${number}. ${esc(label)}</text><text x="${x+10}" y="${y+42}" font-size="12" fill="#174f6c">${esc(String(values[number]||'—').slice(0,49))}</text>`;}).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="794" height="1123" viewBox="0 0 794 1123"><rect width="794" height="1123" fill="#fffefb"/><g font-family="Arial,sans-serif"><text x="28" y="40" font-size="24" font-weight="bold">CMR</text><text x="766" y="37" font-size="13" text-anchor="end">${esc(order.id)}</text><text x="28" y="65" font-size="12">MIĘDZYNARODOWY SAMOCHODOWY LIST PRZEWOZOWY</text><text x="28" y="88" font-size="11">Strona ${page+1} / ${order.cmr.pages} · Plomba dokumentu: ${esc(order.cmr.expectedSeal)}</text><rect x="28" y="103" width="738" height="25" fill="#fff0dd"/><text x="397" y="120" text-anchor="middle" font-size="11" fill="#a35923">DOKUMENT DEMONSTRACYJNY · CAŁA STRONA</text>${cells}<text x="28" y="1072" font-size="12" fill="#356188">Skan przypisany do ${esc(order.id)} · strona ${page+1}</text><text x="28" y="1094" font-size="10" fill="#667066">Przykład interfejsu. Nie jest dokumentem przewozowym.</text></g></svg>`;
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function transshipmentCmrViewer(order){
  const cmr=order.cmr,page=cmr.previewPage||0,url=cmr.scanPages?cmr.scanPages[page]?.url:transshipmentDemoCmrPage(order,page);
  return `<section class="transfer-cmr-viewer" data-cmr-order="${esc(order.id)}"><div class="transfer-cmr-heading"><strong>Cały skan CMR</strong><span>${esc(order.id)}</span><small>Plomba: ${esc(cmr.scannedCode||cmr.issuedCode||cmr.expectedSeal)}</small></div><div class="transfer-cmr-controls"><button data-cmr-page="${page-1}" ${page===0?'disabled':''} aria-label="Poprzednia strona CMR">${icon('back')}</button><b>Strona ${page+1} z ${cmr.pages}</b><button data-cmr-page="${page+1}" ${page>=cmr.pages-1?'disabled':''} aria-label="Następna strona CMR">${icon('arrow')}</button><button data-cmr-zoom aria-pressed="${cmr.zoomed}">${cmr.zoomed?'Dopasuj':'Powiększ'}</button></div><div class="transfer-cmr-image ${cmr.zoomed?'zoomed':''}" tabindex="0" aria-label="Pełna strona CMR. Po powiększeniu przewiń, aby obejrzeć szczegóły.">${url?`<img data-cmr-image data-page-index="${page}" src="${esc(url)}" alt="Cały skan CMR ${esc(order.id)}, strona ${page+1} z ${cmr.pages}">`:'<p role="alert">Brak tej strony skanu. Nie można potwierdzić CMR.</p>'}</div><p class="transfer-cmr-page-status" aria-live="polite">Obejrzane strony: ${cmr.reviewedPages.length}/${cmr.pages}. Porównaj cały dokument z oryginałem.</p></section>`;
}

function transshipmentOrderRibbon(order){
  const position=transshipmentModel.vehicleLoadingPlan(state.routeStops.transshipment).find(item=>item.id===order.id);
  return `<section class="panel transshipment-order-ribbon"><div class="transshipment-order-position"><b>${position.vehiclePosition}</b><small>MIEJSCE W PLANIE</small></div><div><small>ZLECENIE · ${order.unload.sequence}. ROZŁADUNEK W TRASIE</small><h3>${esc(order.id)}</h3><p>${esc(order.unload.company)} · ${esc(order.unload.city)}</p><span>${icon('clock')} ${esc(order.unload.appointment)}</span></div><em>SUGESTIA: ${esc(position.placement)}</em></section>`;
}
function transshipmentCmrTask(order){
  if(order.cmr.accepted)return `<section class="panel transshipment-accepted-cmr"><div class="transshipment-task-complete"><span>${icon('check')}</span><div><small>CMR ODEBRANY</small><strong>${esc(order.id)}</strong><p>Plomba dokumentu / koperty: ${esc(order.cmr.scannedCode)}</p></div></div><details><summary>Pokaż ten sam skan CMR · ${order.cmr.pages} str.</summary>${transshipmentCmrViewer(order)}</details></section>`;
  if(order.cmr.previewVisible)return `<section class="panel transshipment-cmr-card preview"><div class="transshipment-task-label"><span>${icon('doc')}</span><div><small>KROK 1 · PLOMBA ZGODNA</small><h3>Sprawdź CMR przed odbiorem</h3></div></div><div class="transshipment-expected-seal matched"><small>ZESKANOWANA PLOMBA DOKUMENTU / KOPERTY</small><strong>${esc(order.cmr.scannedCode)}</strong>${icon('check')}</div><div class="transshipment-cmr-preview">${transshipmentCmrViewer(order)}</div><button class="primary-button transshipment-accept-cmr" id="transshipment-accept-cmr" ${transshipmentModel.cmrReviewComplete(order)?'':'disabled'}>${icon('check')}Dokument odebrany · to właściwy CMR</button><button class="secondary-button transshipment-report-mismatch" data-stop-chat>${icon('chat')}To nie jest ten dokument</button><p class="small-note">Obejrzyj wszystkie strony. Odbiór nastąpi dopiero po Twoim potwierdzeniu.</p></section>`;
  return `<section class="panel transshipment-cmr-card"><div class="transshipment-task-label"><span>${icon('doc')}</span><div><small>KROK 1 · NAJPIERW DOKUMENT</small><h3>Odbierz CMR do zlecenia</h3></div></div><p class="transshipment-task-copy">Weź dokument od kierowcy, sprawdź numer plomby na CMR lub jego kopercie i zeskanuj kod.</p><div class="transshipment-expected-seal"><small>OCZEKIWANA PLOMBA DOKUMENTU / KOPERTY</small><strong>${esc(order.cmr.expectedSeal)}</strong></div><button class="scan-button transshipment-scan-button" data-transshipment-scan="cmr">${icon('qr')}Skanuj plombę CMR</button><div class="transshipment-locked-next">${icon('lock')} Sztuki ładunku odblokują się po potwierdzeniu dokumentu.</div></section>`;
}
function transshipmentPieceTask(order,piece){
  if(!piece)return `<section class="panel transshipment-order-done"><span>${icon('check')}</span><h3>Zlecenie ${esc(order.id)} przejęte</h3><p>CMR i ${order.pieces.length} ${order.pieces.length===1?'sztuka ma':'sztuki mają'} zgodne plomby oraz nowe zdjęcia.</p><button class="secondary-button" data-transshipment-unload="${esc(order.id)}">${icon('camera')}Pokaż zdjęcia w rozładunku</button></section>`;
  const received=order.pieces.filter(item=>item.received);
  const photos=['near','far'].map(side=>`<button class="piece-photo-button ${piece.photos[side]?'done':''}" data-transshipment-photo="${side}" data-piece-id="${esc(piece.id)}" ${piece.scannedCode?'':'disabled'}>${piece.photos[side]?`<img src="${piece.photos[side].url}" alt="Nowe zdjęcie ${side==='near'?'z bliska':'z daleka'}: ${esc(piece.name)}">`:`<span class="piece-photo-icon">${icon('camera')}</span>`}<span><strong>${side==='near'?'Zdjęcie z bliska':'Zdjęcie z daleka'}</strong><small>Po przeładunku na Twoje auto</small></span>${icon(piece.photos[side]?'check':'arrow')}</button>`).join('');
  return `<section class="panel transshipment-piece-card"><div class="transshipment-task-label"><span>${icon('box')}</span><div><small>SZTUKA ${piece.pieceIndex+1} Z ${order.pieces.length}</small><h3>Przeładuj tę sztukę</h3></div></div><div class="cmr-linked-piece">${icon('doc')}<span>Sztuka należy do przyjętego CMR<strong>${esc(order.id)} · ${esc(order.cmr.scannedCode)}</strong></span></div><div class="transshipment-piece-photo"><img src="${demoPhoto(piece.photoIndex)}" alt="Zdjęcie referencyjne: ${esc(piece.name)}"><span>ZDJĘCIE PRZED PRZEŁADUNKIEM</span></div><div class="transshipment-piece-details"><h4>${esc(piece.name)}</h4><p>${esc(piece.description)}</p></div><div class="transshipment-expected-seal"><small>PLOMBA NA TEJ SZTUCE</small><strong>${esc(piece.expectedSeal)}</strong></div><button class="scan-button transshipment-scan-button" data-transshipment-scan="piece" data-piece-id="${esc(piece.id)}">${icon(piece.scannedCode?'check':'qr')}${piece.scannedCode?'Plomba zgodna · sprawdź ponownie':'1. Skanuj plombę sztuki'}</button><div class="transfer-photo-step"><h3>Teraz dodaj dwa zdjęcia</h3><p class="transshipment-task-copy">2. Ustaw sztukę na swoim aucie. Zrób nowe zdjęcie z bliska i z daleka.</p><div class="piece-photo-grid">${photos}</div></div><button class="primary-button" id="transshipment-complete-piece" data-piece-id="${esc(piece.id)}" ${piece.photos.near&&piece.photos.far?'':'disabled'}>${icon('check')}3. Sztuka na moim aucie · potwierdzam</button></section>${received.length?`<div class="transshipment-received-list"><small>SZTUKI POD TYM CMR · ${esc(order.id)}</small>${received.map(item=>`<span>${icon('check')}<strong>${esc(item.name)}<small>CMR przyjęty · nowe zdjęcia 2/2</small></strong><b>${esc(item.scannedCode)}</b></span>`).join('')}</div>`:''}`;
}

function transshipmentGuidedView(){
  if(transshipmentPreviewRole==='transferor')return transshipmentTransferorView();
  const record=transshipment(),order=transshipmentOrder(),piece=transshipmentPiece();
  return `<div class="app-content">${transshipmentHeader('photos',order.cmr.accepted?'Teraz odbierz ładunek':'Najpierw odbierz dokument CMR',`Pracujesz na zleceniu ${order.id}. Najpierw dokument, potem jego sztuki.`)}<button class="secondary-button transfer-back-plan" data-transshipment-back="info">${icon('back')}Bilans, ułożenie i wybór auta</button><div class="transshipment-source-lock">${icon('lock')}<span><small>AKTYWNY KIEROWCA PRZEKAZUJĄCY</small><strong>${esc(transshipmentSource(order).name)} · ${esc(transshipmentSource(order).vehicle)}</strong></span></div>${transshipmentOrderRibbon(order)}${transshipmentCurrentContext(order)}${transshipmentCmrTask(order)}${order.cmr.accepted?transshipmentPieceTask(order,piece):''}</div>`;
}
function transshipmentReviewView(){
  if(transshipmentPreviewRole==='transferor')return transshipmentTransferorView();
  const record=transshipment(),progress=transshipmentProgress();
  if(record.finished)return `<div class="app-content">${transshipmentHeader('review','Odbiór zapisany lokalnie','Odebrane CMR i sztuki są potwierdzone w teście. Sprawdź jeszcze wydania oraz ułożenie całego auta.')}<section class="panel completion-panel transshipment-completion"><span class="success-icon">${icon('check')}</span><h2>Odbiór gotowy</h2><p>${transshipmentSources().length} kierowców → ${esc(record.receiverVehicle.registration)}</p><div class="summary-line">${icon('check')} Dokumenty CMR <b>${progress.cmrDone}/${progress.cmrTotal}</b></div><div class="summary-line">${icon('check')} Odebrane sztuki <b>${progress.piecesDone}/${progress.piecesTotal}</b></div><div class="summary-line">${icon('lock')} Zostaje na aucie <b>${record.retainedOrders.reduce((sum,order)=>sum+order.pieces.length,0)} szt.</b></div><div class="summary-line">${icon('clock')} Synchronizacja z TMS <b>OCZEKUJE</b></div></section>${transshipmentBalanceView()}${transshipmentLoadingView()}</div>`;
  return `<div class="app-content">${transshipmentHeader('review','Sprawdź całe auto po wymianie','Porównaj proponowane ułożenie z autem: zarówno nowy towar, jak i ten, który pozostał. Wydania mają osobne potwierdzenia.')}<div class="transshipment-final-stack">${record.orders.map((order,index)=>`<section class="panel transshipment-final-order"><span>${index+1}</span><div><small>ODEBRANO · ROZŁADUNEK ${order.unload.sequence}</small><h3>${esc(order.id)}</h3><p>${esc(order.unload.company)}</p><div><b>CMR ${esc(order.cmr.scannedCode)}</b>${order.pieces.map(piece=>`<b>${esc(piece.scannedCode)} · zdjęcia 2/2</b>`).join('')}</div></div>${icon('check')}</section>`).join('')}</div>${transshipmentLoadingView()}<div class="transshipment-order-rule final">${icon('info')}<p><strong>Każdy CMR należy do swojego zlecenia</strong>Dokumenty, sztuki, plomby i zdjęcia zachowują przypisanie do właściwego kierowcy. Towar, który został, nie wymaga ponownego odbioru.</p></div></div>`;
}
function stopChatView(){
  const stop=stopDefinition(),record=currentStop();
  const instruction=state.routeStop==='collection'?'Dla każdego kierowcy użyj osobnej koperty. Skanuj QR z papierowych CMR-ów, porównuj je z właściwymi skanami z systemu, a plombę przypisz dopiero przy zamknięciu koperty.':state.routeStop==='transshipment'?'Odbieraj zlecenia w kolejności podanej przez aplikację: najpóźniejszy rozładunek najpierw. Dla każdego zlecenia najpierw CMR, potem kolejno wszystkie sztuki ładunku i ich plomby.':state.routeStop==='fueling'?'Po dotarciu sprawdź kartę i PIN. W trakcie tankowania dodaj zdjęcie dystrybutora i pistoletu, a po zakończeniu — paragon oraz wydatek.':'Po dotarciu zaparkuj na przydzielonym miejscu P-01.';
  return `<div class="app-content"><div class="chat-header"><button id="stop-chat-back" aria-label="Wróć do zadania">${icon('back')}</button><span><strong>Czat trasy</strong><small>${esc(stop.title)} · spedytor testowy</small></span><span class="badge orange">Symulacja</span></div><div class="chat-bubble"><span>Spedytor testowy</span><p>${instruction}</p></div>${chatMessagesView(record.messages)}${chatComposerView()}</div>`;
}
function stopActionView(){
  const screen=state.screen,stop=currentStop(),definition=stopDefinition();
  let text='',action='',disabled=false,caption='';
  if(state.routeStop==='transshipment'){
    const order=transshipmentOrder(),progress=transshipmentProgress();
    if(transshipmentPreviewRole==='transferor'){
      const action=screen==='info'?'outgoing-start':screen==='photos'?'outgoing-next':transshipment().finished?'transshipment-route':'outgoing-finish';
      const text=screen==='info'?`Wydaję do ${(order.receiverVehicle||transshipment().receiverVehicle).registration}`:screen==='photos'?'Dalej: kolejne wydanie':transshipment().finished?'Wróć do trasy':'Potwierdź wydanie · czekaj na odbiór';
      const disabled=screen==='photos'?!outgoingOrderReady():screen==='review'&&!transshipment().finished?!outgoingReady():false;
      return `<button class="primary-button outgoing-action" id="main-action" data-action="${action}" ${disabled?'disabled':''}>${icon('arrow')}${text}</button><p class="action-caption">Widok wydającego · potwierdzenie odbierającego jest osobnym krokiem.</p>`;
    }
    if(screen==='info'){text=`Odbieram z ${transshipmentSource(order).vehicle}`;action='transshipment-start';caption='Wybrane auto · najpierw QR i cały CMR, potem jego sztuki. Ułożenie podpowiadamy dla całego auta.';}
    if(screen==='photos'){
      text=transshipmentOrderReady()?(transshipmentReady()?'Dalej: kontrola ułożenia':'Dalej: sugerowane zlecenie'):'Wykonaj bieżący krok na ekranie';
      action='transshipment-next-order';
      disabled=!transshipmentOrderReady();
      caption=transshipmentOrderReady()?`Zlecenie ${order.id} kompletne · CMR i ${order.pieces.length} ${order.pieces.length===1?'sztuka':'sztuki'} odebrane.`:order.cmr.previewVisible&&!order.cmr.accepted?'Porównaj skan z papierowym dokumentem i potwierdź odbiór CMR.':order.cmr.accepted?`Sztuki ${order.pieces.filter(piece=>piece.received).length}/${order.pieces.length} · plomba, nowe zdjęcia z bliska i z daleka.`:`Zeskanuj plombę dokumentu / koperty ${order.cmr.expectedSeal}.`;
    }
    if(screen==='review'){text=transshipment().finished?'Wróć do trasy':'Zakończ przeładunek';action=transshipment().finished?'transshipment-route':'transshipment-finish';disabled=!transshipmentReady();caption=transshipment().finished?'Zapis oczekuje na potwierdzenie właścicielskie TMS.':`Gotowe ${progress.ordersDone}/${progress.ordersTotal} zlecenia, ${progress.cmrDone}/${progress.cmrTotal} CMR i ${progress.piecesDone}/${progress.piecesTotal} sztuki.`;}
    if(screen==='chat')return '<p class="action-caption chat-action-caption">Wiadomości w tym prototypie są symulowane.</p>';
    return `<div class="flow-actions"><button class="primary-button" id="main-action" data-action="${action}" ${disabled?'disabled':''}>${icon(action==='transshipment-finish'?'check':'arrow')}${text}</button></div>${caption?`<p class="action-caption">${caption}</p>`:''}`;
  }
  if(state.routeStop==='collection'){
    if(screen==='envelope-scan')return '';
    const group=collection().role==='transferor'?collectionGroup(collection().transferorSourceId):collectionGroup(),orders=collectionGroupOrders(group);
    if(screen==='info'&&collection().role==='transferor'){text=group.prepared?'Dokumenty przygotowane':'Potwierdź przygotowanie otwartej koperty';action=group.prepared?'collection-prepared':'collection-prepare';disabled=group.prepared;caption=group.prepared?'Czekaj na osobę odbierającą. Nie zaklejaj koperty i nie naklejaj plomby.':'Włóż wymienione dokumenty do koperty, ale jej nie zamykaj i nie używaj plomby.';}
    if(screen==='info'&&collection().role==='receiver'){
      if(group&&collection().started&&!collectionEnvelopeReady(group)){text=`Kontynuuj kopertę · ${collectionSource(group.sourceId).name}`;action='collection-resume';caption='Nie rozpoczynaj dokumentów innej osoby, dopóki ta koperta nie zostanie zaplombowana.';}
      else return nextPendingCollectionGroup()?'<p class="action-caption collection-selection-caption">Wybierz powyżej przycisk „Odbieram dokumenty od tego kierowcy”.</p>':'<p class="action-caption collection-selection-caption">Wszystkie osobne koperty są już zamknięte.</p>';
    }
    if(screen==='photos'){
      const missing=collectionMissingOrders(group);
      text=missing.length?`Zamknij kopertę z ${group.documents.length} CMR`:'Dalej: zamknij tę kopertę';action='collection-envelope';disabled=!collectionDocumentsReady(group);
      caption=group.blockedDocument?'Obcy CMR nie został przyjęty. Odłóż go osobno.':group.pendingDocument?'Najpierw porównaj podgląd i zatwierdź albo odrzuć dokument.':missing.length?`Odebrano ${group.documents.length}/${orders.length}. Brak ${missing.length} CMR jest odnotowany i pozostaje do wyjaśnienia.`:group.documents.length?collectionDocumentsReady(group)?'Wszystkie oryginały zostały przejęte. Możesz zamknąć kopertę.':`Przejęte ${group.documents.length}/${orders.length} · zeskanuj pozostałe CMR lub odnotuj brak.`:`Zeskanuj QR na ${orders.length} dokumentach tej osoby.`;
    }
    if(screen==='documents'){
      const sealed=collectionEnvelopeReady(group);
      text=sealed?'Dalej: sprawdź tę kopertę':'Naklej i skanuj plombę';action=sealed?'collection-review':'collection-scan-envelope';disabled=!sealed&&!group.envelope.contentsConfirmed;
      caption=sealed?'Plomba została przypisana do tej koperty.':'Sprawdź listę i potwierdź zawartość koperty.';
    }
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
  if(screen==='documents'){
    text=stop.expense.withAdBlue?'Zapisz 2 wydatki':'Zapisz wydatek';action='fuel-finish';disabled=!fuelingReady();
    const missing=[];
    if(!fuelingPhotosReady())missing.push('Dodaj zdjęcia z tankowania');
    if(!stop.photos.receipt)missing.push('Dodaj paragon za diesel');
    if(stop.expense.withAdBlue&&!adBlueReceiptReady())missing.push('Dodaj obowiązkowe zdjęcie paragonu za AdBlue');
    if(!fuelExpenseReady())missing.push('Uzupełnij wymagane pola wydatku');
    caption=missing.length?missing.join(' · '):stop.expense.withAdBlue?'Oba paragony i dane 2 osobnych wydatków są kompletne.':'Paragon i dane wydatku są kompletne.';
  }
  if(screen==='review'){text=state.routeStop==='fueling'?'Wróć do trasy':'Kolejny punkt na trasie';action='stop-next';}
  if(screen==='chat')return '<p class="action-caption chat-action-caption">Wiadomości w tym prototypie są symulowane.</p>';
  const actionIcon=action==='cancel-arrival'?'close':action==='fuel-end'||action==='fuel-finish'||action==='stop-finish'?'check':'arrow';
  return `<div class="flow-actions"><button class="primary-button ${action==='cancel-arrival'?'countdown-active':''}" id="main-action" data-action="${action}" ${disabled?'disabled':''}>${icon(actionIcon)}${text}</button></div>${caption?`<p class="action-caption ${action==='cancel-arrival'?'countdown-caption':''}">${caption}</p>`:''}`;
}
function stopDesignNotes(){
  if(state.routeStop==='transshipment'){
    const activeScreen=state.screen==='chat'?(transshipment().returnScreen||'info'):state.screen;
    const steps=[['info','Plan auta z kolejności rozładunków'],['photos','CMR, potem każda sztuka i plomba'],['review','Kontrola ułożenia i kompletu']];
    const activeIndex=Math.max(0,steps.findIndex(([screen])=>screen===activeScreen));
    return `<h2>Najpóźniejszy rozładunek.<br>Najpierw na auto.</h2><p class="note-description">Kierowca widzi pełny plan, ale realizuje tylko jeden bieżący krok. Dla zlecenia najpierw skanuje plombę dokumentu, potwierdza CMR, a potem odbiera po jednej sztuce ładunku.</p><div class="design-progress"><div class="design-progress-title">PRZEŁADUNEK<span>${Math.min(activeIndex+1,steps.length)}/${steps.length}</span></div>${steps.map(([screen,label],index)=>`<div class="design-step ${index<activeIndex?'done':index===activeIndex?'current':''}"><span class="design-step-num">${index<activeIndex?icon('check'):String(index+1).padStart(2,'0')}</span><span>${label}</span></div>`).join('')}</div><div class="design-shared"><strong>Jedna sesja = jeden przekazujący</strong><p>Zlecenia i sztuki są pogrupowane po kierowcy źródłowym. Nie można przejść do kolejnego zlecenia ani kolejnej osoby bez kompletnego CMR i zgodnych plomb.</p></div>`;
  }
  if(state.routeStop==='collection'){
    $$('[data-collection-scenario]').forEach(button=>button.onclick=()=>startCollectionScenario(button.dataset.collectionScenario));
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
  if(liveReadOnly()){
    const screens=current().arrived&&!current().live.routeOnly?operationFlow():['travel'];
    const index=Math.max(0,screens.indexOf(state.screen));
    const labels={info:'informacje',photos:'sztuki ładunku',seals:'plomba CMR',documents:'skan CMR',review:'podsumowanie'};
    const next=screens[index+1]||screens[0],disabled=screens.length===1;
    return `<div class="flow-actions">${index>0?`<button class="flow-back" data-back="${screens[index-1]}" aria-label="Wróć do poprzedniego kroku">${icon('back')}</button>`:''}<button class="primary-button" id="main-action" data-action="readonly-next" ${disabled?'disabled':''}>${icon('arrow')}${disabled?(current().live.routeOnly?'Dotarłem do celu':`Dotarłem na ${isLoad()?'załadunek':'rozładunek'}`):index===screens.length-1?'Wróć do informacji':`Dalej: ${labels[next]}`}</button></div><p class="action-caption">Podgląd tylko do odczytu · bez zapisywania zmian w TMS.</p>`;
  }
  const screen=state.screen;
  let text='',action='',disabled=false,back=null,caption='';
  if(screen==='travel'){
    const countdown=arrivalCountdown?.operation===state.operation?arrivalCountdown:null;
    text=countdown?`Cofnij potwierdzenie · ${countdown.remaining} s`:`Dotarłem na ${isLoad()?'załadunek':'rozładunek'}`;
    action=countdown?'cancel-arrival':'start-arrival';
    caption=countdown?'Dotarcie zostanie potwierdzone automatycznie. Naciśnij przycisk, aby wycofać.':'Po naciśnięciu masz 5 sekund na wycofanie potwierdzenia.';
    if(liveMode())disabled=Boolean(backendPointActionPending)||!(backendState.write_capabilities||[]).includes('start');
    if(liveMode()&&current().live.routeOnly){
      if(current().arrived){text='Zakończ operację';action='complete-point';disabled=Boolean(backendPointActionPending)||!(backendState.write_capabilities||[]).includes('complete');caption='Potwierdź dopiero po rzeczywistym zakończeniu operacji.';}
      else if(!countdown)text='Dotarłem do celu';
    }
  }
  if(screen==='info'){
    text=isLoad()?'Dalej: sztuki ładunku':current().started?'Przejdź do dokumentacji':'Rozpocznij dokumentowanie rozładunku';
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
  if(screen==='review'){text=`Zakończ ${isLoad()?'załadunek':'rozładunek'}`;action='finish';disabled=!finishReady();back='documents';}
  if(screen==='chat'){text='Załącz dokumenty';action='chat-attach';caption='Możesz pisać od razu. Zdjęcia są przypisane do konkretnych sztuk, a CMR pozostaje osobnym dokumentem.';}
  if(screen==='success'){text='Kolejny punkt na trasie';action='next-point';}
  if(liveMode()&&current().arrived&&!current().live.routeOnly&&!current().live.targetsReady){disabled=true;caption=current().live.detailsLoading?'Pobieranie danych zlecenia…':'Szczegóły zlecenia są niedostępne. Spróbuj ponownie.';}
  const statusLink=!['travel','chat','success'].includes(screen)&&operationResponseSuggested()?'<button type="button" class="operation-status-optional" data-operation-status-open>Podaj status · opcjonalnie</button>':'';
  const actionIcon=action==='chat-attach'?'clip':action==='finish'?'check':action==='cancel-arrival'?'close':'arrow';
  return `<div class="flow-actions">${back?`<button class="flow-back" data-back="${back}" aria-label="Wróć do poprzedniego kroku">${icon('back')}</button>`:''}<button class="primary-button ${action==='cancel-arrival'?'countdown-active':''}" id="main-action" data-action="${action}" ${disabled?'disabled':''}>${icon(actionIcon)}${text}</button></div>${caption?`<p class="action-caption ${action==='cancel-arrival'?'countdown-caption':''}">${caption}</p>`:''}${statusLink}`;
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
function serviceReady(){return serviceWizardModel.ready(state.serviceSurvey);}
function servicePhotoButton(key,compact=false){
  const record=state.serviceSurvey.photos[key];
  const label=key==='message'?'Zdjęcie komunikatu':serviceTaskMeta[key].title;
  return `<button class="service-photo-button ${compact?'compact':''} ${record?'done':''}" data-service-photo="${key}" aria-label="${record?'Zmień':'Dodaj'} zdjęcie: ${esc(label)}">${record?`<img src="${record.url}" alt="${esc(label)}">`:`<span class="service-photo-icon">${icon('camera')}</span>`}<span class="service-photo-copy"><strong>${record?'Zdjęcie dodane':'Dodaj zdjęcie'}</strong><small>${record?'Dotknij, aby zmienić':'Aparat lub galeria'}</small></span>${icon(record?'check':'plus')}</button>`;
}
function serviceTaskCard(key,index){
  const meta=serviceTaskMeta[key],done=serviceTaskReady(key),photo=servicePhotoButton(key);
  const valueField=key==='dpf'?'':`<label class="service-value-field" for="service-${key}"><span>${key==='serviceDistance'?'Pozostało do przeglądu':'Wpisz poziom'} *</span><span class="service-value-control"><input id="service-${key}" data-service-value="${key}" type="number" min="0" ${meta.max!==undefined?`max="${meta.max}"`:''} step="1" inputmode="numeric" value="${esc(state.serviceSurvey[key])}" placeholder="${esc(meta.placeholder)}"><b>${meta.unit}</b></span><small>${key==='serviceDistance'?'Kilometry pozostałe do przeglądu':'Zakres od 0 do 100'}</small></label>`;
  return `<section class="panel service-task-card ${done?'complete':''}" data-service-task="${key}"><div class="service-task-heading"><span class="service-task-number">${done?icon('check'):index+1}</span><span class="service-task-icon">${icon(meta.icon)}</span><div><h3 id="service-step-title" tabindex="-1">${esc(meta.title)}</h3><p>${esc(meta.description)}</p></div><b class="service-task-status">${done?'Gotowe':'Wymagane'}</b></div><div class="service-task-body">${photo}${valueField}</div></section>`;
}
function serviceHistoryIsLive(){return backendMode&&!backendTestWorkspace&&backendState?.status==='connected'&&typeof driverBridge?.backendServiceSurvey==='function';}
function serviceHistoryRecords(){
  const model=window.SuperSpedytorServiceRegister;
  if(!serviceHistoryIsLive())return previewServiceHistory();
  const completed=(Array.isArray(backendState.service_history)?backendState.service_history:[])
    .filter(record=>record?.definition_slug==='service-inspection'&&record.status==='completed');
  return model.records(backendState.service_registry,completed);
}
function serviceHistorySelectedRecord(){
  const selected=String(state.serviceHistorySelectedId??'');
  return serviceHistoryRecords().find(record=>String(record.id)===selected)||null;
}
function serviceHistorySelectedDetail(){
  const selected=String(state.serviceHistorySelectedId??'');
  if(!selected)return null;
  if(serviceHistoryIsLive()){
    const detail=backendState.service_history_detail;
    return detail&&String(detail.id)===selected?detail:null;
  }
  return serviceHistorySelectedRecord()?.detail||null;
}
function serviceHistoryDateLabel(value){
  if(!has(value))return 'Data nieznana';
  const date=new Date(`${value}T12:00:00`);
  if(Number.isNaN(date.getTime()))return String(value);
  const label=date.toLocaleDateString('pl-PL',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  return label.charAt(0).toUpperCase()+label.slice(1);
}
function serviceHistoryTime(value){
  if(!has(value))return '';
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'':date.toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Warsaw'});
}
function serviceHistoryNumber(value){
  if(!has(value))return '';
  const number=Number(value);
  return Number.isFinite(number)?number.toLocaleString('pl-PL',{maximumFractionDigits:1}):String(value);
}
function serviceHistoryEntryButton(){
  return `<button type="button" class="service-history-entry" data-service-panel="history"><span>${icon('clipboard')}</span><span><strong>Rejestr serwisów</strong><small>Wykonane ankiety, braki i kary −5 EUR</small></span><b>Pokaż ${icon('arrow')}</b></button>`;
}
function serviceHistoryListCard(record){
  const meta=window.SuperSpedytorServiceRegister.status(record),completedAt=serviceHistoryTime(record.completed_at);
  const open=record.status==='completed';
  const tag=open?'button':'section';
  const attributes=open?` type="button" data-service-history-id="${esc(record.id)}"`:'';
  const result=meta.penalty?'−5 EUR':open?'PODGLĄD':meta.tone==='pending'?'W TERMINIE':'BEZ KARY';
  const label=record.status==='needs_correction'?'DO POPRAWY':result;
  return `<${tag}${attributes} class="service-history-card service-register-${meta.tone}"><span class="service-history-check">${icon(meta.icon)}</span><span class="service-history-card-copy"><small>${esc(serviceHistoryDateLabel(record.date))}</small><strong>${esc(meta.label)}${open&&completedAt?` · ${esc(completedAt)}`:''}</strong><em>${esc(record.vehicle_registration||'Bez przypisanego pojazdu')}${record.local?' · zapis na tym urządzeniu':''}</em>${meta.penalty?'<span class="service-register-reason">Kara za niewypełnioną ankietę</span>':''}</span><span class="service-history-card-result"><b>${label}</b>${open?icon('arrow'):''}</span></${tag}>`;
}
function serviceHistoryResponseMap(detail){
  return new Map((Array.isArray(detail?.step_responses)?detail.step_responses:[]).map(response=>[response.step_key,response]));
}
function serviceHistoryAnswer(key,response){
  const photos=Array.isArray(response?.photos)?response.photos:[];
  const note=String(response?.note??'').trim();
  if(key==='after_inspection')return /^(true|1|yes)$/i.test(note)?'Tak':'Nie';
  if(key==='service_messages')return response?(response.transcription||note||`${photos.length||1} zdjęcie komunikatu`):'Brak zgłoszonych komunikatów';
  if(key==='dpf_photo')return photos.length?'Zdjęcie zapisane w Super Spedytorze':'Brak zdjęcia';
  const unit=serviceHistoryStepMeta[key]?.unit||'';
  return has(note)?`${serviceHistoryNumber(note)}${unit?` ${unit}`:''}`:'Brak odpowiedzi';
}
function serviceHistoryAnswerRow(key,response){
  const meta=serviceHistoryStepMeta[key],photos=Array.isArray(response?.photos)?response.photos:[];
  const photoText=photos.length?`${photos.length} ${photos.length===1?'zdjęcie':'zdjęcia'} zapisane`:meta.optional?'Odpowiedź opcjonalna':'Brak zdjęcia';
  return `<section class="service-history-answer ${meta.optional?'optional':''}"><span>${icon(meta.icon)}</span><div><small>${esc(meta.label)}${meta.optional?' · opcjonalne':''}</small><strong>${esc(serviceHistoryAnswer(key,response))}</strong><em>${esc(photoText)}</em></div>${response?icon('check'):''}</section>`;
}
function serviceHistoryDetailView(detail){
  const responses=serviceHistoryResponseMap(detail),photoCount=[...responses.values()].reduce((sum,response)=>sum+(Array.isArray(response.photos)?response.photos.length:0),0);
  const completedAt=serviceHistoryTime(detail.completed_at),odometer=serviceHistoryNumber(detail.odometer_km);
  return `<div class="service-history-detail"><section class="service-history-owner"><span>${icon('check')}</span><div><small>${serviceHistoryIsLive()?'REKORD SUPER SPEDYTORA':'PRZYKŁAD ANKIETY'}</small><strong>${serviceHistorySelectedRecord()?.local?'Zapisana na tym urządzeniu':'Wykonana i zapisana'}</strong><p>${esc(serviceHistoryDateLabel(detail.date))}${completedAt?` · ${esc(completedAt)}`:''}</p></div><b>TYLKO ODCZYT</b></section><section class="panel service-history-facts"><div><small>Pojazd</small><strong>${esc(detail.vehicle_registration||'Z przypisania kierowcy')}</strong></div><div><small>Przebieg</small><strong>${odometer?`${esc(odometer)} km`:'Nie podano'}</strong></div><div><small>Zdjęcia</small><strong>${photoCount}</strong></div></section><div class="service-history-section-title"><span>ODPOWIEDZI KIEROWCY</span><h3>Co zostało zapisane</h3></div><div class="service-history-answers">${serviceHistoryStepOrder.map(key=>serviceHistoryAnswerRow(key,responses.get(key))).join('')}</div><p class="service-history-retention">${icon('info')}Historia pozostaje w Super Spedytorze. Czyszczenie lokalnej kopii telefonu po 00:01 nie usuwa tego rekordu.</p></div>`;
}
function serviceHistoryView(){
  const selected=serviceHistorySelectedRecord(),detail=serviceHistorySelectedDetail(),records=serviceHistoryRecords();
  const model=window.SuperSpedytorServiceRegister,live=serviceHistoryIsLive();
  const complete=!live||model.validRegistry(backendState.service_registry),totals=model.summary(records);
  const loading=live&&String(backendState.service_history_loading_id??'')===String(state.serviceHistorySelectedId??'');
  const error=live?(backendState.service_history_detail_error||backendState.service_history_error||''):'';
  const historyUnavailable=live&&!complete&&Boolean(backendState.service_history_error);
  const title=selected?'Szczegóły ankiety':'Rejestr serwisów';
  const filter=state.serviceHistoryFilter||'all';
  const shown=records.filter(record=>filter==='missing'?record.status==='not_submitted':filter==='done'?record.status==='completed':true);
  const period=live&&complete?backendState.service_registry.month.split('-').reverse().join('.'):'Ostatnie dni';
  const summary=`<section class="service-history-summary"><span>${icon('clipboard')}</span><div><small>ANKIETY SERWISOWE · ${esc(period)}</small><strong>Wykonane i brakujące</strong><p>Każdy brak ankiety po terminie: −5 EUR.</p></div></section><div class="service-register-totals"><div><strong>${historyUnavailable&&!records.length?'—':totals.completed}</strong><span>Wykonane</span></div><div><strong>${complete?totals.missing:'—'}</strong><span>Braki po terminie</span></div><div class="penalty"><strong>${complete?(totals.penalty?'−'+Math.abs(totals.penalty):'0')+' EUR':'—'}</strong><span>Suma kar za braki</span></div></div>`;
  const unavailable=complete?'':`<p class="service-register-warning" role="status">${icon('info')}<span>Pełny rejestr jest niedostępny. ${historyUnavailable?'Nie udało się pobrać także historii wykonanych ankiet.':'Pokazujemy tylko wykonane ankiety.'} Nie można ustalić braków ani sumy kar.${backendState.service_registry_error?' '+esc(backendState.service_registry_error):''}</span></p>`;
  const filters=`<div class="service-register-filters" role="group" aria-label="Filtr rejestru">${[['all','Wszystkie'],['missing','Braki'],['done','Wykonane']].map(([key,label])=>`<button type="button" data-service-history-filter="${key}" aria-pressed="${filter===key}">${label}</button>`).join('')}</div>`;
  const body=selected
    ?detail?serviceHistoryDetailView(detail):`<section class="service-history-loading">${loading?'<span class="backend-loader" aria-hidden="true"></span>':icon('warning')}<h3>${loading?'Pobieramy odpowiedzi…':'Nie udało się otworzyć ankiety'}</h3><p>${esc(error||'Spróbuj ponownie z listy historii.')}</p></section>`
    :summary+unavailable+filters+(shown.length?`<div class="service-history-list">${shown.map(serviceHistoryListCard).join('')}</div>`:`<section class="service-history-empty">${icon('clipboard')}<h3>${historyUnavailable?'Historia ankiet jest niedostępna':filter==='missing'?(complete?'Brak zaległych ankiet':'Braki są nieznane'):filter==='done'||!complete?'Nie ma jeszcze wykonanych ankiet':'Brak pozycji w rejestrze'}</h3><p>${esc(error||'Zmień filtr, aby zobaczyć pozostałe dni.')}</p></section>`)+`<p class="service-history-retention">${icon('info')}<span>${live?'Statusy pochodzą z Super Spedytora.':'Dane demonstracyjne. Zapis dzisiejszej ankiety pozostaje na tym urządzeniu.'} Kara dotyczy tylko ankiety oznaczonej jako niewysłana po terminie. Brak przydziału i ankieta w terminie: bez kary. Kwoty w rejestrze nie potwierdzają potrącenia z rozliczenia.</span></p>`;
  return `<div class="app-content service-screen service-history-screen"><div class="service-page-header"><button id="service-history-back" aria-label="${selected?'Wróć do rejestru serwisów':'Wróć do ankiety dziennej'}">${icon('back')}</button><div><span>${live?(backendState?.read_only===true&&backendState?.backend_environment==='dev'?'DANE Z WERSJI DEV SUPER SPEDYTORA':'DANE Z SUPER SPEDYTORA'):'PODGLĄD NA DANYCH DEMONSTRACYJNYCH'}</span><h2>${title}</h2></div><b class="service-state-badge saved">${selected?'ZAPIS':'REJESTR'}</b></div>${live&&!selected?'<button type="button" class="secondary-button service-register-refresh" id="service-register-refresh">'+icon('sync')+'Odśwież rejestr</button>':''}${body}</div>`;
}
function serviceHistoryActionView(){
  const selected=serviceHistorySelectedRecord();
  const label=selected?'Wróć do historii':serviceHistoryIsLive()?'Wróć do operacji':'Dzisiejsza ankieta';
  return `<div class="flow-actions"><button class="primary-button" id="service-history-action">${icon('back')}${label}</button></div><p class="action-caption">Historia jest tylko do odczytu — niczego tutaj nie można zmienić.</p>`;
}
function serviceHistoryDesignNotes(){
  return `<h2>Historia bez papieru.<br>Odpowiedzi pod ręką.</h2><p class="note-description">Kierowca widzi własne wykonane ankiety z Super Spedytora. Lista pokazuje daty i pojazd, a szczegół dokładnie te odpowiedzi, które przyjął system.</p><div class="design-shared"><strong>Trwały zapis SS</strong><p>Lokalna kopia bieżącej ankiety znika po 00:01, ale historia właścicielska pozostaje w TMS zgodnie z jego retencją.</p></div>`;
}
function bindServiceHistoryView(){
  $$('[data-service-panel]').forEach(button=>button.onclick=()=>openService(button.dataset.servicePanel));
  const goBack=()=>{
    if(state.serviceHistorySelectedId!==null){state.serviceHistorySelectedId=null;render();return;}
    if(serviceHistoryIsLive()){backendActiveNav='now';render();return;}
    openService('survey');
  };
  if($('#service-history-back'))$('#service-history-back').onclick=goBack;
  if($('#service-history-action'))$('#service-history-action').onclick=goBack;
  $$('[data-service-history-filter]').forEach(button=>button.onclick=()=>{state.serviceHistoryFilter=button.dataset.serviceHistoryFilter;render();});
  if($('#service-register-refresh'))$('#service-register-refresh').onclick=()=>driverBridge?.backendRefresh?.();
  $$('[data-service-history-id]').forEach(button=>button.onclick=()=>{
    state.serviceHistorySelectedId=button.dataset.serviceHistoryId;
    if(serviceHistoryIsLive()){
      driverBridge?.backendServiceSurvey?.(Number(button.dataset.serviceHistoryId));
      return;
    }
    render();
  });
}
function serviceModuleSwitch(active){
  return `<div class="service-module-switch" role="tablist" aria-label="Moduły obsługi pojazdu"><button role="tab" data-service-panel="survey" aria-selected="${active==='survey'}" class="${active==='survey'?'active':''}">${icon('service')}<span><strong>Kontrola</strong><small>Ankieta dzienna</small></span></button><button role="tab" data-service-panel="inventory" aria-selected="${active==='inventory'}" class="${active==='inventory'?'active':''}">${icon('clipboard')}<span><strong>Inwentaryzacja</strong><small>Stan wyposażenia</small></span></button><button role="tab" data-service-panel="handover" aria-selected="${active==='handover'}" class="${active==='handover'?'active':''}">${icon('truck')}<span><strong>Przekazanie</strong><small>Auto i wyposażenie</small></span></button></div>`;
}
function serviceWizardView(){
  const survey=state.serviceSurvey,step=serviceWizardModel.stepIndex(survey.step),key=serviceWizardModel.steps[step];
  const message=key==='message';
  const progress=serviceWizardModel.steps.map((item,index)=>'<span class="'+(index<step?'done':index===step?'current':'')+'" aria-hidden="true"></span>').join('');
  const messageBody='<section class="panel service-wizard-message"><span class="service-wizard-symbol">'+icon('warning')+'</span><h3 id="service-step-title" tabindex="-1">Komunikat serwisowy</h3><p>Sprawdź kontrolki i komunikaty na desce rozdzielczej.</p><div class="service-message-choices"><button data-service-message="clear" aria-pressed="'+(survey.messageStatus==='clear')+'" class="'+(survey.messageStatus==='clear'?'selected':'')+'">'+icon('check')+'<span>Brak komunikatów</span></button><button data-service-message="reported" aria-pressed="'+(survey.messageStatus==='reported')+'" class="'+(survey.messageStatus==='reported'?'selected warning':'')+'">'+icon('warning')+'<span>Jest komunikat</span></button></div>'+(survey.messageStatus==='reported'?servicePhotoButton('message')+'<label class="service-wizard-note" for="service-note"><span>Opis komunikatu · opcjonalnie</span><textarea id="service-note" maxlength="300" placeholder="Wpisz lub podyktuj opis">'+esc(survey.note)+'</textarea></label>':'<div class="service-wizard-tip">'+icon('info')+'<span>Jeśli nic się nie wyświetla, wybierz „Brak komunikatów” i przejdź dalej.</span></div>')+'</section>';
  const afterService=key==='serviceDistance'?'<label class="panel check-row service-after-check"><input id="service-after" type="checkbox" '+(survey.afterService?'checked':'')+'><span><strong>Pojazd jest po przeglądzie</strong><small>Zaznacz, jeśli przegląd właśnie wykonano.</small></span></label>':'';
  return '<div class="app-content service-screen service-wizard-screen" data-service-step="'+key+'"><div class="service-wizard-header"><div><span>CODZIENNA KONTROLA</span><h2>Ankieta serwisowa</h2></div><button id="service-pause" aria-label="Przerwij ankietę i zachowaj postęp">'+icon('close')+'</button></div><div class="service-wizard-progress" aria-label="Krok '+(step+1)+' z 5"><div><strong>Krok '+(step+1)+' <span>z 5</span></strong><span>'+(step===4?'Ostatni krok':esc(serviceWizardModel.titles[key]))+'</span></div><div class="service-wizard-dots">'+progress+'</div></div>'+(message?messageBody:serviceTaskCard(key,step))+afterService+'<p id="service-step-error" class="service-wizard-error" role="alert"></p><p id="service-draft-status" class="service-wizard-draft" role="status">Postęp zachowuje się automatycznie.</p><button class="service-wizard-pause" id="service-pause-later">'+icon('clock')+'Dokończę później</button></div>';
}
function serviceSurveyView(){
  const survey=state.serviceSurvey,dailyDone=survey.submitted||serviceCompletedToday(),dailyRecord=readServiceDailyRecord();
  if(!dailyDone||survey.reopened)return serviceWizardView();
  const savedTime=survey.submittedAt||dailyRecord?.submittedAt||'';
  return '<div class="app-content service-screen"><div class="service-page-header"><button id="service-back" aria-label="Wróć do poprzedniego widoku">'+icon('back')+'</button><div><span>CODZIENNA KONTROLA POJAZDU</span><h2>Ankieta wykonana</h2></div><b class="service-state-badge saved">Gotowe na dziś</b></div><section class="panel service-completed-card"><span>'+icon('check')+'</span><h3>Dziękujemy. Kontrola zakończona.</h3><p>Zapisano całą ankietę'+(savedTime?' o '+esc(savedTime):'')+'. Następna kontrola pojawi się jutro. Lokalny zapis wygaśnie o 00:01.</p><button class="secondary-button" id="service-correct">'+icon('edit')+'Popraw ankietę</button></section>'+serviceHistoryEntryButton()+'<p class="service-offline-note">'+icon('info')+'Podgląd demonstracyjny zapisuje odpowiedzi wyłącznie na tym urządzeniu.</p></div>';
}
function serviceActionView(){
  const survey=state.serviceSurvey;
  if(survey.submitted||serviceCompletedToday()&&!survey.reopened)return '<div class="flow-actions"><button class="primary-button" id="service-close">'+icon('check')+'Zakończ</button></div>';
  const step=serviceWizardModel.stepIndex(survey.step),last=step===4,error=serviceWizardModel.validation(survey);
  return '<div class="flow-actions service-wizard-actions">'+(step>0?'<button class="flow-back" id="service-previous" aria-label="Poprzedni krok ankiety">'+icon('back')+'</button>':'')+'<button class="primary-button" id="'+(last?'service-save':'service-next')+'">'+icon(last?'check':'arrow')+(last?'Zapisz ankietę':'Dalej')+'</button></div><p class="action-caption">'+(error?esc(error):last?'Zapiszesz całą ankietę i zakończysz kontrolę.':'Następnie: '+esc(serviceWizardModel.titles[serviceWizardModel.steps[step+1]]))+'</p>';
}
function serviceDesignNotes(){
  const survey=state.serviceSurvey,step=serviceWizardModel.stepIndex(survey.step);
  return '<h2>Jedna ankieta.<br>Pięć prostych kroków.</h2><p class="note-description">Kierowca zajmuje się jedną rzeczą naraz. Może przerwać i wrócić do tego samego ekranu, wraz z odpowiedziami i zdjęciami.</p><div class="design-progress"><div class="design-progress-title">ANKIETA SERWISOWA<span>'+(step+1)+'/5</span></div>'+serviceWizardModel.steps.map((key,index)=>'<div class="design-step '+(index<step?'done':index===step?'current':'')+'"><span class="design-step-num">'+(index<step?icon('check'):String(index+1).padStart(2,'0'))+'</span><span>'+serviceWizardModel.titles[key]+'</span></div>').join('')+'</div><div class="design-shared"><strong>Wróć tam, gdzie skończyłeś</strong><p>Przerwana ankieta pozostaje do dokończenia. Po 15 minutach przypomni o sobie w otwartej aplikacji. Ostateczne potwierdzenie następuje dopiero po ostatnim kroku.</p></div>';
}
function refreshServiceProgress(){
  const error=$('#service-step-error');if(error)error.textContent='';
  updateServiceNavIndicator();
  $('#app-action').innerHTML=serviceActionView();
  bindServiceAction();
}
function markServiceEdited(){
  state.serviceSurvey.hydrated=true;
  if(state.serviceSurvey.submitted||serviceCompletedToday()){
    state.serviceSurvey.submitted=false;
    state.serviceSurvey.submittedAt=null;
    markServiceDailyDue();
  }
  queueMicrotask(queueServiceDraftSave);
}
function showServiceStepError(message){
  const error=$('#service-step-error');if(error)error.textContent=message;
  const key=serviceWizardModel.steps[state.serviceSurvey.step];
  const target=key==='message'?$('[data-service-message]'):serviceValueValid(key)?$('[data-service-photo="'+key+'"]'):$('#service-'+key);
  target?.focus({preventScroll:true});
  target?.scrollIntoView({block:'nearest',behavior:'smooth'});
}
async function moveServiceStep(direction){
  const survey=state.serviceSurvey;
  if(direction>0){
    const error=serviceWizardModel.validation(survey);
    if(error){showServiceStepError(error);return;}
  }
  survey.step=serviceWizardModel.stepIndex(survey.step+direction);
  queueServiceDraftSave();
  try{await flushServiceDraft();}catch{}
  render();
  $('#app-scroll').scrollTop=0;
  $('#service-step-title')?.focus({preventScroll:true});
}
function bindServiceAction(){
  if($('#service-next'))$('#service-next').onclick=()=>moveServiceStep(1);
  if($('#service-previous'))$('#service-previous').onclick=()=>moveServiceStep(-1);
  if($('#service-save'))$('#service-save').onclick=async event=>{
    const survey=state.serviceSurvey;
    if(!serviceReady()){
      survey.step=Math.max(0,serviceWizardModel.firstIncomplete(survey));
      render();$('#app-scroll').scrollTop=0;
      showServiceStepError(serviceWizardModel.validation(survey));
      return;
    }
    const button=event.currentTarget,time=new Date().toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'});
    button.disabled=true;
    button.innerHTML=icon('clock')+'Zapisywanie ankiety…';
    try{
      await flushServiceDraft();
      if(survey.date!==serviceDateKey())throw new Error('Rozpoczął się nowy dzień kontroli.');
      survey.saving=true;
      await markServiceDailyDone(time);
      if(survey!==state.serviceSurvey||survey.date!==serviceDateKey())throw new Error('Rozpoczął się nowy dzień kontroli.');
      servicePersistenceGeneration++;
      clearTimeout(serviceDraftTimer);clearTimeout(serviceReminderTimer);
      survey.submitted=true;survey.submittedAt=time;survey.reopened=false;survey.hydrated=true;survey.saving=false;
      render();
      toast('Ankieta zapisana. Kontrola na dzisiaj wykonana.');
    }catch(error){
      survey.saving=false;
      render();
      toast('Nie udało się zapisać całej ankiety. Postęp pozostaje do dokończenia.');
    }
  };
  if($('#service-close'))$('#service-close').onclick=()=>closeService();
}
function bindServiceView(){
  bindServiceAction();
  if($('#service-back'))$('#service-back').onclick=()=>closeService();
  if($('#service-pause'))$('#service-pause').onclick=pauseServiceSurvey;
  if($('#service-pause-later'))$('#service-pause-later').onclick=pauseServiceSurvey;
  if($('#service-correct'))$('#service-correct').onclick=()=>{
    state.serviceSurvey.reopened=true;state.serviceSurvey.step=0;markServiceEdited();render();
  };
  $$('[data-service-panel]').forEach(button=>button.onclick=()=>openService(button.dataset.servicePanel));
  $$('[data-service-message]').forEach(button=>button.onclick=()=>{
    markServiceEdited();
    state.serviceSurvey.messageStatus=button.dataset.serviceMessage;
    if(state.serviceSurvey.messageStatus==='clear'){
      revoke(state.serviceSurvey.photos.message);state.serviceSurvey.photos.message=null;state.serviceSurvey.note='';
    }
    render();
  });
  $$('[data-service-photo]').forEach(button=>button.onclick=()=>openModal('service-photo',{key:button.dataset.servicePhoto,service:true,kind:'service-photo'}));
  $$('[data-service-value]').forEach(input=>input.oninput=event=>{markServiceEdited();state.serviceSurvey[event.target.dataset.serviceValue]=event.target.value;refreshServiceProgress();});
  if($('#service-note'))$('#service-note').oninput=event=>{markServiceEdited();state.serviceSurvey.note=event.target.value;refreshServiceProgress();};
  if($('#service-after'))$('#service-after').onchange=event=>{markServiceEdited();state.serviceSurvey.afterService=event.target.checked;refreshServiceProgress();};
}

// Both protocols use the same inspection definition and rendering; their records stay separate.
const inspectionMode=()=>state.servicePanel==='inventory'?'inventory':'handover';
const inspectionProtocol=(mode=inspectionMode())=>mode==='inventory'?state.inventoryProtocol:state.vehicleHandover;
const inspectionSnapshot=()=>inspectionMode()==='inventory'?vehicleInventorySnapshot:vehicleHandoverSnapshot;
const inspectionConfirmationKey=(mode=inspectionMode())=>mode==='inventory'?'authorConfirmed':'receiverConfirmed';
const inspectionV2Controllers={inventory:null,handover:null,'handover-receive':null};
let normalHandoverRole='issue',vehicleExchangeActive=false,vehicleExchangeController=null;
// Every handover uses the contents-aware protocol. Inventory retains its comparison view.
const inspectionV2Enabled=()=>(inspectionMode()==='handover'||appQuery.get('handoverVersion')!=='1')&&Boolean(window.SuperSpedytorHandoverV2);
function openVehicleExchange(){vehicleExchangeActive=true;openService('handover');}
function exchangeController(){
  if(!vehicleExchangeController){
    const first=JSON.parse(JSON.stringify(vehicleHandoverSnapshot));
    const second={...JSON.parse(JSON.stringify(vehicleHandoverSnapshot)),handoverId:'VH/DEMO/2026/002',ownerVersion:8,
      vehicle:{id:'vehicle-demo-02',registration:'DEMO 02',name:'Drugi pojazd demonstracyjny',makeModel:'Sprinter demonstracyjny'},
      transferor:{...first.receiver},receiver:{...first.transferor},
      equipment:first.equipment.map(item=>({...item,id:`vehicle-02-${item.localKey}`})),
      contents:{vehicleId:'vehicle-demo-02',ownerVersion:8,orders:JSON.parse(JSON.stringify(transshipmentPlan.orders.filter(order=>order.id==='DEMO/TS/420')))}};
    vehicleExchangeController=window.SuperSpedytorVehicleExchange.create({first,second,icon,esc,onChange:()=>render(),onExit:()=>{vehicleExchangeActive=false;render();},
      createReport:(snapshot,role,onExit)=>window.SuperSpedytorHandoverV2.create({snapshot,role,mode:'handover',icon,esc,demoPhoto,demo:true,nativeQr:typeof driverBridge?.scanQr==='function',cmrPageUrl:(order,page)=>order.cmr.scanPages?.[page]?.url||transshipmentDemoCmrPage(order,page),onChange:()=>render(),onExit})});
  }
  return vehicleExchangeController;
}
function inspectionV2Controller(){
  const mode=inspectionMode();
  if(mode==='handover'&&vehicleExchangeActive)return exchangeController();
  const key=mode==='handover'&&normalHandoverRole==='receive'?'handover-receive':mode;
  if(!inspectionV2Controllers[key])inspectionV2Controllers[key]=window.SuperSpedytorHandoverV2.create({
    snapshot:{...inspectionSnapshot(),protocolId:`${inspectionSnapshot().handoverId||inspectionSnapshot().inventoryId}:${normalHandoverRole}`},mode,role:normalHandoverRole,icon,esc,demoPhoto,demo:true,nativeQr:typeof driverBridge?.scanQr==='function',
    cmrPageUrl:(order,page)=>order.cmr.scanPages?.[page]?.url||transshipmentDemoCmrPage(order,page),
    onRole:role=>{normalHandoverRole=role;render();$('#app-scroll').scrollTop=0;},onSwap:openVehicleExchange,
    onChange:()=>render(),onExit:()=>closeService()
  });
  return inspectionV2Controllers[key];
}
function inventoryProtocolView(){return vehicleHandoverView();}
function inventoryActionView(){return vehicleHandoverActionView();}
function inventoryDesignNotes(){return vehicleHandoverDesignNotes();}
function bindInventoryView(){bindVehicleHandoverView();}

function clearProtocolProblem(){
  $$('.protocol-validation-error').forEach(element=>element.remove());
  $$('.protocol-validation-target').forEach(element=>element.classList.remove('protocol-validation-target'));
}
function showProtocolProblem(problem){
  if(!problem)return false;
  clearProtocolProblem();
  const target=$(problem.row);
  if(!target)return false;
  target.classList.add('protocol-validation-target');
  const message=document.createElement('p');
  message.className='protocol-validation-error';
  message.setAttribute('role','alert');
  message.textContent=problem.message;
  target.appendChild(message);
  target.scrollIntoView({behavior:'smooth',block:'center'});
  setTimeout(()=>{
    const focusTarget=$(problem.focus);
    if(!focusTarget)return;
    try{focusTarget.focus({preventScroll:true});}catch(error){focusTarget.focus();}
  },450);
  return true;
}

const handoverStatusMeta={
  matching:{label:'Zgodne',short:'Zgodne',icon:'check'},
  missing:{label:'Brak',short:'Brak',icon:'close'},
  damaged:{label:'Uszkodzone',short:'Uszk.',icon:'warning'}
};
const handoverStatus=id=>inspectionProtocol().statuses[id]||null;
const handoverIssue=id=>['missing','damaged'].includes(handoverStatus(id));
const handoverEvidenceRequired=id=>handoverStatus(id)==='damaged';
const handoverItemReady=id=>vehicleHandoverModel.itemReady(id,inspectionProtocol());
const handoverProgress=()=>vehicleHandoverModel.progress(inspectionSnapshot(),inspectionProtocol());
const handoverVehiclePhotoProgress=()=>vehicleHandoverModel.photoProgress(inspectionSnapshot(),inspectionProtocol());
const handoverPhotoRequirement=id=>inspectionSnapshot().photoRequirements.find(item=>item.id===id);
const handoverReadingsReady=()=>vehicleHandoverModel.readingsReady(inspectionProtocol());
const handoverPrerequisitesReady=()=>{
  const progress=handoverProgress(),photos=handoverVehiclePhotoProgress();
  return handoverReadingsReady()&&photos.complete===photos.total&&progress.complete===progress.total;
};
const handoverReady=()=>inspectionMode()==='inventory'
  ?vehicleHandoverModel.inventoryReady(inspectionSnapshot(),inspectionProtocol())
  :vehicleHandoverModel.ready(inspectionSnapshot(),inspectionProtocol());

function handoverFirstProblem(){
  const protocol=inspectionProtocol();
  if(!has(protocol.odometerKm))return {row:'.handover-readings',focus:'#handover-odometer',message:'Musisz podać przebieg pojazdu.'};
  if(!Number.isFinite(Number(protocol.odometerKm))||Number(protocol.odometerKm)<0)return {row:'.handover-readings',focus:'#handover-odometer',message:'Musisz podać prawidłowy przebieg pojazdu.'};
  if(!has(protocol.fuelLevel))return {row:'.handover-readings',focus:'#handover-fuel',message:'Musisz wskazać poziom paliwa.'};
  for(const zone of handoverZones){
    const photos=zone.photoGroupIds.flatMap(groupId=>handoverPhotoGroup(groupId).items);
    const equipment=handoverZoneEquipmentGroups(zone).flatMap(group=>group.items);
    const orderedChecks=zone.equipmentFirst?[['equipment',equipment],['photos',photos]]:[['photos',photos],['equipment',equipment]];
    for(const [kind,items] of orderedChecks){
      if(kind==='photos'){
        for(const photo of items){
          if(photo.required!==false&&!protocol.vehiclePhotos[photo.id])return {row:`[data-handover-photo-row="${photo.id}"]`,focus:`[data-handover-vehicle-photo="${photo.id}"]`,message:`Musisz dodać osobne zdjęcie: ${photo.name}.`};
        }
        continue;
      }
      for(const item of items){
        const status=handoverStatus(item.id),evidence=protocol.issuePhotos[item.id]||{},note=has(protocol.notes[item.id]);
        if(!status)return {row:`[data-handover-item="${item.id}"]`,focus:`[data-handover-status="${item.id}"]`,message:'Musisz wskazać stan tej pozycji.'};
        if(status==='damaged'&&!evidence.wide)return {row:`[data-handover-item="${item.id}"]`,focus:`[data-handover-issue-photo="${item.id}"][data-shot="wide"]`,message:'Musisz dodać zdjęcie ogólne pokazujące miejsce uszkodzenia.'};
        if(status==='damaged'&&!evidence.close)return {row:`[data-handover-item="${item.id}"]`,focus:`[data-handover-issue-photo="${item.id}"][data-shot="close"]`,message:'Musisz dodać zbliżenie uszkodzenia.'};
        if(status==='damaged'&&!note)return {row:`[data-handover-item="${item.id}"]`,focus:`[data-handover-note="${item.id}"]`,message:'Musisz dodać opis uszkodzenia.'};
      }
    }
  }
  if(!protocol[inspectionConfirmationKey()])return {row:'.handover-confirm',focus:'#handover-confirm',message:inspectionMode()==='inventory'?'Musisz potwierdzić stan pojazdu i wyposażenia przed zakończeniem inwentaryzacji.':'Musisz potwierdzić przejęcie pojazdu przed zakończeniem protokołu.'};
  return null;
}

function handoverVehiclePhotoButton(requirement){
  const record=inspectionProtocol().vehiclePhotos[requirement.id];
  return `<article class="handover-photo-row ${record?'complete':''}" data-handover-photo-row="${requirement.id}"><div class="handover-photo-copy"><span>${icon(requirement.icon||'camera')}</span><div><strong>${esc(requirement.name)}</strong><small>${esc(requirement.description)}</small></div></div><button class="handover-photo-capture ${record?'done':''}" data-handover-vehicle-photo="${requirement.id}" aria-label="${record?'Zmień':'Zrób'} zdjęcie: ${esc(requirement.name)}">${record?`<img src="${record.url}" alt="${esc(requirement.name)}">`:`<span>${icon('camera')}</span>`}<span><strong>${record?'Zdjęcie gotowe':'Zrób zdjęcie'}</strong><small>${record?'Dotknij, aby powtórzyć':'Wymagane'}</small></span>${icon(record?'check':'arrow')}</button></article>`;
}
function handoverPhotoGroupView(group){
  const complete=group.items.filter(item=>inspectionProtocol().vehiclePhotos[item.id]).length;
  return `<section class="handover-photo-group"><div class="inventory-group-heading"><div><span>${esc(group.eyebrow)}</span><h3>${esc(group.title)}</h3></div><b>${complete}/${group.items.length}</b></div><div class="panel handover-photo-list">${group.items.map(handoverVehiclePhotoButton).join('')}</div></section>`;
}
function handoverIssuePhotoButton(id,shot){
  const record=inspectionProtocol().issuePhotos[id]?.[shot],item=handoverEquipmentItem(id);
  const label=shot==='wide'?'Zdjęcie ogólne':'Zbliżenie';
  const help=shot==='wide'?'Pokaż miejsce na pojeździe':'Pokaż szczegół uszkodzenia';
  return `<button class="inventory-photo-button handover-issue-photo ${record?'done':''}" data-handover-issue-photo="${id}" data-shot="${shot}" aria-label="${record?'Zmień':'Dodaj'} ${label.toLowerCase()}: ${esc(item.name)}">${record?`<img src="${record.url}" alt="${label}: ${esc(item.name)}">`:`<span>${icon('camera')}</span>`}<span><strong>${record?`${label} gotowe`:label}</strong><small>${record?'Dotknij, aby zmienić':help}</small></span>${icon(record?'check':'plus')}</button>`;
}
function handoverEquipmentRow(item){
  const status=handoverStatus(item.id),ready=handoverItemReady(item.id),issue=handoverIssue(item.id),evidenceRequired=handoverEvidenceRequired(item.id),note=inspectionProtocol().notes[item.id]||'';
  const stateClass=ready?'complete':issue?'issue-open':status?'incomplete':'';
  return `<article class="inventory-item ${stateClass}" data-handover-item="${item.id}"><div class="inventory-item-heading"><span class="inventory-item-icon">${icon(item.icon)}</span><div><strong>${esc(item.name)}</strong><small>Z Super Spedytora: ${esc(item.expectedLabel)}</small></div><b class="inventory-item-result">${ready?icon('check'):status?'Uzupełnij':'Sprawdź'}</b></div><div class="inventory-status-options" role="group" aria-label="Stan: ${esc(item.name)}">${Object.entries(handoverStatusMeta).map(([value,meta])=>`<button data-handover-status="${item.id}" data-status="${value}" aria-pressed="${status===value}" class="${status===value?`active ${value==='matching'?'present':value}`:''}">${icon(meta.icon)}<span>${meta.short}</span></button>`).join('')}</div>${evidenceRequired?`<div class="inventory-issue-details"><div class="inventory-issue-title">${icon('warning')}<span><strong>Udokumentuj uszkodzenie</strong><small>Super Spedytor wymaga ujęcia ogólnego, zbliżenia i opisu. Oba zdjęcia pozostają przypisane do tej pozycji.</small></span></div><div class="handover-issue-photo-grid">${handoverIssuePhotoButton(item.id,'wide')}${handoverIssuePhotoButton(item.id,'close')}</div><label for="handover-note-${item.id}"><span>Opis uszkodzenia *</span><textarea id="handover-note-${item.id}" data-handover-note="${item.id}" maxlength="300" placeholder="Opisz uszkodzenie i możliwość dalszego używania.">${esc(note)}</textarea></label></div>`:''}</article>`;
}
function handoverEquipmentGroupView(group){
  const complete=group.items.filter(item=>handoverItemReady(item.id)).length;
  return `<section class="inventory-group"><div class="inventory-group-heading"><div><span>${esc(group.eyebrow)}</span><h3>${esc(group.title)}</h3></div><b data-handover-group-count="${group.id}">${complete}/${group.items.length}</b></div><div class="panel inventory-group-card">${group.items.map(handoverEquipmentRow).join('')}</div></section>`;
}
function handoverReadingsView(){
  const protocol=inspectionProtocol();
  return `<section class="panel handover-readings"><div class="handover-section-heading"><span>${icon('edit')}</span><div><small>${inspectionMode()==='inventory'?'STAN POJAZDU PODCZAS INWENTARYZACJI':'STAN POJAZDU PRZY ODBIORZE'}</small><h3>Przebieg i paliwo</h3></div><b>${handoverReadingsReady()?'Gotowe':'Wymagane'}</b></div><div class="handover-reading-grid"><label for="handover-odometer"><span>Przebieg *</span><span class="service-value-control"><input id="handover-odometer" type="number" min="0" step="1" inputmode="numeric" value="${esc(protocol.odometerKm)}" placeholder="np. 245000"><b>km</b></span></label><label for="handover-fuel"><span>Poziom paliwa *</span><select id="handover-fuel"><option value="">Wybierz poziom</option><option value="reserve" ${protocol.fuelLevel==='reserve'?'selected':''}>Rezerwa</option><option value="quarter" ${protocol.fuelLevel==='quarter'?'selected':''}>1/4</option><option value="half" ${protocol.fuelLevel==='half'?'selected':''}>1/2</option><option value="three_quarters" ${protocol.fuelLevel==='three_quarters'?'selected':''}>3/4</option><option value="full" ${protocol.fuelLevel==='full'?'selected':''}>Pełny</option></select></label></div></section>`;
}
function handoverZoneView(zone){
  const photoGroups=zone.photoGroupIds.map(handoverPhotoGroup);
  const equipmentGroups=handoverZoneEquipmentGroups(zone);
  const photoCount=photoGroups.reduce((total,group)=>total+group.items.length,0);
  const equipmentCount=equipmentGroups.reduce((total,group)=>total+group.items.length,0);
  const photoBlock=`<div class="handover-zone-block handover-zone-photos"><div class="handover-zone-subheading"><span>${icon('camera')}</span><div><strong>Zdjęcia · ${photoCount} osobnych pól</strong><small>Jedno pole = jedno konkretne ujęcie. Nie łącz kilku elementów w jednym zdjęciu.</small></div></div>${photoGroups.map(handoverPhotoGroupView).join('')}</div>`;
  const equipmentBlock=`<div class="handover-zone-block handover-zone-equipment"><div class="handover-zone-subheading"><span>${icon('clipboard')}</span><div><strong>Wyposażenie · ${equipmentCount} ${equipmentCount===1?'pozycja':'pozycji'}</strong><small>Porównaj każdą rzecz ze zrzutem przypisanym do tego auta.</small></div></div>${equipmentGroups.map(handoverEquipmentGroupView).join('')}</div>`;
  const orderedBlocks=zone.equipmentFirst?`${equipmentBlock}${photoBlock}`:`${photoBlock}${equipmentBlock}`;
  return `<section class="handover-zone" data-handover-zone="${zone.id}"><div class="handover-stage"><span>${zone.number}</span><div><strong>${esc(zone.title)}</strong><small>${esc(zone.description)}</small></div></div>${zone.id==='cabin'?handoverReadingsView():''}${orderedBlocks}</section>`;
}
function vehicleHandoverView(){
  if(inspectionV2Enabled())return inspectionV2Controller().view();
  const protocol=inspectionProtocol(),progress=handoverProgress(),photoProgress=handoverVehiclePhotoProgress(),snapshot=inspectionSnapshot();
  const inventory=inspectionMode()==='inventory',title=inventory?'Protokół inwentaryzacji':'Protokół przekazania auta';
  const badge=protocol.pendingSync?(inventory?'Zapisany lokalnie':'Oczekuje na TMS'):handoverReady()?'Gotowy':'Roboczy';
  const confirmationReady=handoverPrerequisitesReady();
  const parties=inventory
    ?`<section class="panel handover-parties inventory-author"><div class="handover-party receiver"><span>${icon('clipboard')}</span><div><small>KIEROWCA SPORZĄDZAJĄCY INWENTARYZACJĘ</small><strong>${esc(snapshot.author.displayName)}</strong><p>${esc(snapshot.author.code)}</p></div></div></section>`
    :`<section class="panel handover-parties"><div class="handover-party complete"><span>${icon('check')}</span><div><small>PRZEKAZUJĄCY · POTWIERDZIŁ</small><strong>${esc(snapshot.transferor.displayName)}</strong><p>${esc(snapshot.transferor.code)}</p></div></div><div class="handover-party-arrow">${icon('arrow')}</div><div class="handover-party receiver"><span>${icon('truck')}</span><div><small>PRZEJMUJĄCY · TO KONTO</small><strong>${esc(snapshot.receiver.displayName)}</strong><p>${esc(snapshot.receiver.code)}</p></div></div></section>`;
  return `<div class="app-content service-screen handover-screen ${inventory?'inventory-screen':''}">
    <div class="service-page-header"><button id="service-back" aria-label="Wróć do poprzedniego widoku">${icon('back')}</button><div><span>${inventory?'KONTROLA STANU POJAZDU I WYPOSAŻENIA':'ZMIANA ODPOWIEDZIALNOŚCI ZA POJAZD'}</span><h2>${title}</h2></div><b class="service-state-badge handover-state ${protocol.pendingSync?'pending':handoverReady()?'ready':''}">${badge}</b></div>
    ${serviceModuleSwitch(inspectionMode())}
    <div class="handover-api-source">${icon('signal')}<p><strong>${inventory?'Inwentaryzacja · ten sam zakres kontroli co przy przekazaniu':'Struktura zgodna z procesem Super Spedytora'}</strong>${inventory?'Pojazd, kierowca sporządzający, zdjęcia i wyposażenie należą do jednego protokołu. W podglądzie wartości są demonstracyjne.':'Pojazd, kierowcy, lista zdjęć oraz wyposażenie pochodzą z jednego wersjonowanego zadania. W podglądzie wartości są demonstracyjne.'}</p><b>v${snapshot.ownerVersion} · DEMO</b></div>
    <section class="handover-vehicle-card"><div class="handover-vehicle-mark">${icon('truck')}</div><div><small>${inventory?'POJAZD INWENTARYZOWANY':'POJAZD DO PRZEJĘCIA'}</small><h3>${esc(snapshot.vehicle.registration)}</h3><p>${esc(snapshot.vehicle.makeModel)} · ${esc(snapshot.vehicle.name)}</p><p>${esc(inventory?snapshot.inspectionPlace:snapshot.handoverPlace)}</p></div><span>${icon('lock')} DANE Z API</span></section>
    ${parties}
    ${protocol.pendingSync?`<div class="handover-pending-banner">${icon('clock')}<p><strong>${inventory?'Inwentaryzacja zapisana lokalnie':'Protokół przygotowany lokalnie'} o ${esc(protocol.preparedAt)}</strong>${inventory?'Dokumentacja jest kompletna w podglądzie. Zapis do Super Spedytora wymaga potwierdzenia przez system.':'Podgląd nie wywołał API i nie zmienił przypisania samochodu. Stan „przekazano” pojawi się dopiero po readbacku Super Spedytora.'}</p></div>`:''}
    <div class="handover-photo-guidance">${icon('route')}<p><strong>Trasa kontroli: kabina → paka i winda → obejście auta</strong>Każdy wymagany element ma osobne pole zdjęciowe. Nie łącz fotela, lodówki, lusterek ani nadkoli w jeden kadr.</p></div>
    <section class="service-progress-card inventory-progress-card handover-photo-progress"><div><span>ZDJĘCIA WYMAGANE PRZEZ PROTOKÓŁ</span><strong id="handover-photo-progress-count">${photoProgress.complete}/${photoProgress.total}</strong></div><div class="service-progress-track"><span id="handover-photo-progress-bar" style="width:${photoProgress.total?photoProgress.complete/photoProgress.total*100:0}%"></span></div></section>
    <section class="service-progress-card inventory-progress-card"><div><span>POZYCJE Z API</span><strong id="handover-progress-count">${progress.complete}/${progress.total}</strong></div><div class="service-progress-track"><span id="handover-progress-bar" style="width:${progress.total?progress.complete/progress.total*100:0}%"></span></div><div class="inventory-progress-stats"><span><b id="handover-matching-count">${progress.answered-progress.issues}</b> zgodne</span><span><b id="handover-issue-count">${progress.issues}</b> zastrzeżenia</span><span><b id="handover-open-count">${progress.total-progress.answered}</b> bez oceny</span></div></section>
    ${progress.issues?`<div class="inventory-alert">${icon('warning')}<p><strong>${progress.issues} ${progress.issues===1?'zastrzeżenie':'zastrzeżenia'}</strong>Brak zaznacz na liście. Uszkodzenie wymaga ujęcia ogólnego, zbliżenia i opisu.</p></div>`:`<div class="inventory-guidance">${icon('info')}Nie potwierdzaj pozycji na podstawie wpisu w protokole. Sprawdź fizycznie, czy przedmiot jest w aucie i gdzie się znajduje.</div>`}
    ${handoverZones.map(handoverZoneView).join('')}
    <div class="handover-stage"><span>4</span><div><strong>${inventory?'Potwierdzenie sporządzającego':'Potwierdzenie odbiorcy'}</strong><small>Dopiero po pełnej dokumentacji i sprawdzeniu wszystkich pozycji.</small></div></div>
    <label class="panel check-row inventory-confirm handover-confirm"><input id="handover-confirm" type="checkbox" ${protocol[inspectionConfirmationKey()]?'checked':''} ${confirmationReady?'':'disabled'}><span><strong>${inventory?'Potwierdzam faktyczny stan pojazdu i wyposażenia':progress.issues?'Przejmuję pojazd z zaznaczonymi zastrzeżeniami':'Przejmuję pojazd i wskazane wyposażenie'}</strong><small>${confirmationReady?(inventory?'Potwierdzenie dotyczy kierowcy sporządzającego inwentaryzację.':'Potwierdzenie dotyczy zalogowanego kierowcy przejmującego.'):'Najpierw uzupełnij wskazania, wszystkie zdjęcia i całą listę wyposażenia.'}</small></span></label>
    <p class="service-offline-note">${icon('info')}${inventory?'Podgląd używa danych demonstracyjnych. Produkcyjna inwentaryzacja zapisuje stan pojazdu i potwierdzenie sporządzającego.':'Widok korzysta z danych syntetycznych. Produkcja musi pobrać całe zadanie przekazania z Driver API i potwierdzić zmianę przypisania właścicielskim readbackiem.'}</p>
  </div>`;
}
function vehicleHandoverActionView(){
  if(inspectionV2Enabled())return inspectionV2Controller().actions();
  const protocol=inspectionProtocol(),progress=handoverProgress(),photos=handoverVehiclePhotoProgress();
  if(protocol.pendingSync)return `<div class="flow-actions"><button class="secondary-button" id="handover-correct">${icon('edit')}Popraw protokół</button><button class="primary-button" id="handover-close">${icon('check')}Zamknij podgląd</button></div><p class="action-caption">${inspectionMode()==='inventory'?'Inwentaryzacja zapisana lokalnie w podglądzie.':'Nie wysłano do TMS · przypisanie pojazdu pozostało bez zmian.'}</p>`;
  const caption=handoverReady()?'Komplet gotowy do idempotentnego zapisu i właścicielskiego readbacku.':`Zdjęcia ${photos.complete}/${photos.total} · pozycje ${progress.complete}/${progress.total} · naciśnij, aby przejść do pierwszego braku.`;
  return `<div class="flow-actions"><button class="primary-button ${handoverReady()?'':'validation-required'}" id="handover-prepare">${icon('check')}${inspectionMode()==='inventory'?'Zapisz inwentaryzację':'Przygotuj przekazanie'}</button></div><p class="action-caption">${caption}</p>`;
}
function vehicleHandoverDesignNotes(){
  if(inspectionV2Enabled())return inspectionV2Controller().notes();
  const progress=handoverProgress(),photos=handoverVehiclePhotoProgress();
  const steps=[['01',inspectionMode()==='inventory'?'Pojazd i sporządzający':'Zadanie i osoby z API',(inspectionMode()==='inventory'?vehicleHandoverModel.validateInventorySnapshot(inspectionSnapshot()):vehicleHandoverModel.validateSnapshot(inspectionSnapshot())).valid],['02',`Zdjęcia pojazdu ${photos.complete}/${photos.total}`,photos.complete===photos.total],['03','Wyposażenie i potwierdzenie',handoverPrerequisitesReady()&&inspectionProtocol()[inspectionConfirmationKey()]],['04',inspectionMode()==='inventory'?'Potwierdzenie zapisu inwentaryzacji':'Readback nowego przypisania',false]];
  return `<h2>Jedno auto.<br>Pełny stan.</h2><p class="note-description">${inspectionMode()==='inventory'?'Pojazd, sporządzający, wymagane ujęcia i wyposażenie należą do jednej inwentaryzacji.':'Pojazd, kierowcy, wymagane ujęcia i wyposażenie pochodzą z jednego wersjonowanego zadania Super Spedytora.'} Kierowca dokumentuje stan w stałej kolejności.</p><div class="design-progress"><div class="design-progress-title">${inspectionMode()==='inventory'?'INWENTARYZACJA POJAZDU':'PRZEKAZANIE POJAZDU'}<span>${progress.complete}/${progress.total}</span></div>${steps.map(([number,label,complete],index)=>`<div class="design-step ${complete?'done':index===0||steps[index-1][2]?'current':''}"><span class="design-step-num">${complete?icon('check'):number}</span><span>${label}</span></div>`).join('')}</div><div class="design-shared"><strong>${inspectionMode()==='inventory'?'Jedna osoba, pełna kontrola':'Bez lokalnego „przepisania” auta'}</strong><p>${inspectionMode()==='inventory'?'Inwentaryzacja obejmuje te same zdjęcia, wskazania i wyposażenie. Sporządza ją jeden kierowca.':'Aplikacja pokaże zakończenie dopiero, gdy TMS zwróci nowe przypisanie auta do kierowcy przejmującego oraz wyższą wersję rekordu.'}</p></div>`;
}
function markVehicleHandoverEdited(protocol=inspectionProtocol(),mode=inspectionMode()){
  if(protocol.pendingSync){protocol.pendingSync=false;protocol.preparedAt=null;protocol[inspectionConfirmationKey(mode)]=false;}
}
function refreshVehicleHandoverProgress(){
  clearProtocolProblem();
  const progress=handoverProgress(),photos=handoverVehiclePhotoProgress();
  if($('#handover-progress-count'))$('#handover-progress-count').textContent=`${progress.complete}/${progress.total}`;
  if($('#handover-progress-bar'))$('#handover-progress-bar').style.width=`${progress.total?progress.complete/progress.total*100:0}%`;
  if($('#handover-matching-count'))$('#handover-matching-count').textContent=progress.answered-progress.issues;
  if($('#handover-issue-count'))$('#handover-issue-count').textContent=progress.issues;
  if($('#handover-open-count'))$('#handover-open-count').textContent=progress.total-progress.answered;
  if($('#handover-photo-progress-count'))$('#handover-photo-progress-count').textContent=`${photos.complete}/${photos.total}`;
  if($('#handover-photo-progress-bar'))$('#handover-photo-progress-bar').style.width=`${photos.total?photos.complete/photos.total*100:0}%`;
  handoverZones.flatMap(handoverZoneEquipmentGroups).forEach(group=>{
    const counter=$(`[data-handover-group-count="${group.id}"]`);
    if(counter)counter.textContent=`${group.items.filter(item=>handoverItemReady(item.id)).length}/${group.items.length}`;
  });
  const confirm=$('#handover-confirm');
  if(confirm){
    confirm.disabled=!handoverPrerequisitesReady();
    if(confirm.disabled){inspectionProtocol()[inspectionConfirmationKey()]=false;confirm.checked=false;}
  }
  const readings=$('.handover-readings .handover-section-heading>b');
  if(readings)readings.textContent=handoverReadingsReady()?'Gotowe':'Wymagane';
  const badge=$('.handover-state');
  if(badge){badge.textContent=handoverReady()?'Gotowy':'Roboczy';badge.classList.toggle('ready',handoverReady());badge.classList.remove('pending');}
  if($('#design-context'))$('#design-context').innerHTML=vehicleHandoverDesignNotes();
  $('#app-action').innerHTML=vehicleHandoverActionView();
  bindVehicleHandoverAction();
}
function bindVehicleHandoverAction(){
  if($('#handover-prepare'))$('#handover-prepare').onclick=()=>{
    if(!handoverReady()){
      showProtocolProblem(handoverFirstProblem());
      return;
    }
    inspectionProtocol().pendingSync=true;
    inspectionProtocol().preparedAt=new Date().toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'});
    render();
    toast(inspectionMode()==='inventory'?'Inwentaryzację zapisano lokalnie w podglądzie.':'Protokół demonstracyjny przygotowano lokalnie. Nie wysłano go do TMS.');
  };
  if($('#handover-correct'))$('#handover-correct').onclick=()=>{markVehicleHandoverEdited();render();};
  if($('#handover-close'))$('#handover-close').onclick=()=>closeService();
}
function bindVehicleHandoverView(){
  if(inspectionV2Enabled()){inspectionV2Controller().bind();return;}
  bindVehicleHandoverAction();
  if($('#service-back'))$('#service-back').onclick=()=>closeService();
  $$('[data-service-panel]').forEach(button=>button.onclick=()=>openService(button.dataset.servicePanel));
  $$('[data-handover-status]').forEach(button=>button.onclick=()=>{
    const id=button.dataset.handoverStatus,status=button.dataset.status,protocol=inspectionProtocol();
    if(protocol.statuses[id]===status)return;
    markVehicleHandoverEdited();
    protocol[inspectionConfirmationKey()]=false;
    protocol.statuses[id]=status;
    if(status!=='damaged'){
      Object.values(protocol.issuePhotos[id]||{}).forEach(revoke);
      delete protocol.issuePhotos[id];
      delete protocol.notes[id];
    }
    render();
  });
  $$('[data-handover-vehicle-photo]').forEach(button=>button.onclick=()=>openModal('handover-photo',{key:button.dataset.handoverVehiclePhoto,handover:true,inspectionMode:inspectionMode(),photoKind:'vehicle',kind:'handover-photo'}));
  $$('[data-handover-issue-photo]').forEach(button=>button.onclick=()=>openModal('handover-photo',{key:button.dataset.handoverIssuePhoto,shot:button.dataset.shot,handover:true,inspectionMode:inspectionMode(),photoKind:'issue',kind:'handover-photo'}));
  $$('[data-handover-note]').forEach(input=>input.oninput=event=>{
    markVehicleHandoverEdited();
    inspectionProtocol()[inspectionConfirmationKey()]=false;
    inspectionProtocol().notes[event.target.dataset.handoverNote]=event.target.value;
    refreshVehicleHandoverProgress();
  });
  if($('#handover-odometer'))$('#handover-odometer').oninput=event=>{
    markVehicleHandoverEdited();
    inspectionProtocol()[inspectionConfirmationKey()]=false;
    inspectionProtocol().odometerKm=event.target.value;
    refreshVehicleHandoverProgress();
  };
  if($('#handover-fuel'))$('#handover-fuel').onchange=event=>{
    markVehicleHandoverEdited();
    inspectionProtocol()[inspectionConfirmationKey()]=false;
    inspectionProtocol().fuelLevel=event.target.value;
    refreshVehicleHandoverProgress();
  };
  if($('#handover-confirm'))$('#handover-confirm').onchange=event=>{
    markVehicleHandoverEdited();
    inspectionProtocol()[inspectionConfirmationKey()]=event.target.checked;
    refreshVehicleHandoverProgress();
  };
}

function updateScreenList(){
  if(state.routeStop){
    const transferor=state.routeStop==='collection'&&collection().role==='transferor';
    let labels,order;
    if(transferor){labels={info:['01','Przygotuj swoje dokumenty']};order=['info'];}
    else if(state.routeStop==='collection'){labels={info:['01','Wybierz kierowcę'],photos:['02','Skanuj i sprawdzaj CMR-y'],documents:['03','Naklej i przypisz plombę'],review:['04','Sprawdź tę kopertę']};order=['info','photos','documents','review'];}
    else if(state.routeStop==='transshipment'){labels={info:['01','Plan ułożenia auta'],photos:['02','Odbiór krok po kroku'],review:['03','Kontrola ułożenia']};order=['info','photos','review'];}
    else if(state.routeStop==='parking'){labels={travel:['↗','Dojazd na parking'],info:['01','Informacje po dotarciu'],review:['02','Postój rozpoczęty']};order=['travel','info','review'];}
    else{labels={travel:['↗','Dojazd na tankowanie'],info:['01','Sugestia + karta i PIN'],photos:['02','Tankowanie i 2 zdjęcia'],documents:['03','Paragon i wydatek'],review:['04','Przerwa lub dalsza jazda']};order=['travel','info','photos','documents','review'];}
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

// === AA9: kreator załadunku na realnym API (tryb live) ===
// Rekord operacji ma kształt fresh('load'), ale sztuki i plomby pochodzą z labels/targets,
// a zdjęcia i CMR z potwierdzonych uploadów. Każdy zapis idzie przez mostek natywny
// (SuperSpedytorNative.backendRequest/backendUpload), po zapisie ponowny odczyt celów.
const demoAssignment=assignment;
let liveOperation=null;
let liveRequestSeq=0;
const pendingRequests=new Map();
const liveMode=()=>Boolean(liveOperation);
const nativeCall=invoke=>new Promise((resolve,reject)=>{
  const id=`req-${Date.now()}-${++liveRequestSeq}`;
  pendingRequests.set(id,{resolve,reject});
  try{invoke(id);}catch(error){pendingRequests.delete(id);reject(error);}
});
const nativeRequest=(method,path,body)=>{
  if(backendState?.read_only===true&&!backendTestWorkspace&&String(method).toUpperCase()!=='GET')return Promise.resolve(readOnlyResult());
  const send=()=>nativeCall(id=>window.SuperSpedytorNative.backendRequest(id,method,path,body?JSON.stringify(body):''));
  return window.SuperSpedytorOfflineWorkspace?.request(method,path,body,send)||send();
};
const nativeUpload=(path,token,fields)=>{
  if(backendState?.read_only===true&&!backendTestWorkspace)return Promise.resolve(readOnlyResult());
  const send=()=>nativeCall(id=>window.SuperSpedytorNative.backendUpload(id,path,token,JSON.stringify(fields||{})));
  return window.SuperSpedytorOfflineWorkspace?.upload(path,token,fields,send)||send();
};
function queuePointAction(pointId,action){
  if(backendState?.read_only===true&&!backendTestWorkspace){toast(readOnlyResult().message);return;}
  if(window.SuperSpedytorOfflineWorkspace)window.SuperSpedytorOfflineWorkspace.point(pointId,action).catch(()=>{backendPointActionPending=null;toast('Nie zapisano statusu. Sprawdź pamięć telefonu i spróbuj ponownie.');});
  else driverBridge?.backendPointAction(pointId,action);
}
const nativeCapturePhoto=()=>backendReadOnly()?Promise.resolve(readOnlyResult()):nativeCall(id=>window.SuperSpedytorNative.capturePhoto(id));
const nativeScanDocument=()=>backendReadOnly()?Promise.resolve(readOnlyResult()):window.CmrEnhancement?.available()&&window.SuperSpedytorScanner?.scanForUpload
  ?window.SuperSpedytorScanner.scanForUpload():nativeCall(id=>window.SuperSpedytorNative.scanDocument(id));
const nativeScanCode=()=>backendReadOnly()?Promise.resolve(readOnlyResult()):nativeCall(id=>window.SuperSpedytorNative.scanCode(id));
const nativeReleaseFile=token=>{try{if(token&&!window.SuperSpedytorOfflineWorkspace?.retains(token))window.SuperSpedytorNative?.releaseFile(token);}catch{}};
const liveTargetsPath=()=>liveOperationModel.targetsPath(liveOperation.mode,liveOperation.pointId);
let liveScanManual=false;
let liveBusy=false;
let liveRouteEpoch=0;
let liveRouteLoad=null;
const settledPointWrites=new Set();
function readOnlyResult(){return {status:403,message:'Podgląd tylko do odczytu. Zmiany nie są zapisywane w TMS.'};}
function backendReadOnly(){return Boolean(!backendTestWorkspace&&backendState?.read_only===true);}
function liveReadOnly(){return Boolean(liveMode()&&backendReadOnly());}
function requestLivePointAction(action){
  if(!liveMode()||backendTestWorkspace||backendReadOnly()||backendState?.status!=='connected'||backendPointActionPending)return false;
  const expected=action==='start'?'pending':action==='complete'?'in_progress':'';
  if(!expected||liveOperation.point?.status!==expected||!(backendState.write_capabilities||[]).includes(action))return false;
  const previous=backendState.write;
  if(previous?.id&&previous.status!=='pending')settledPointWrites.add(`${liveOperation.ownerKey}|${previous.id}:${previous.status}`);
  backendPointActionPending={pointId:liveOperation.pointId,action,previousWriteId:String(backendState?.write?.id||'')};
  try{queuePointAction(liveOperation.pointId,action);return true;}
  catch{backendPointActionPending=null;toast('Warstwa natywna nie odpowiada. Spróbuj ponownie.');return false;}
}
function liveRouteSelection(){
  if(!backendMode||backendTestWorkspace||backendState?.status!=='connected'||backendState?.profile?.id==null)return null;
  const plan=backendDriverOperationPlan(backendState.route_status?.active_routes||[]),point=plan.nearest;
  if(!point||!has(point.id))return null;
  const ownerKey=`${backendState.backend_origin||'native'}|${backendState.profile.id}`;
  const key=[ownerKey,point.id,point.transport_offer,point.order_number,point.status,point.operation_type,backendState.read_only===true?'readonly':'write'].join('|');
  return {point,ownerKey,key};
}
function cancelLiveRouteRead(){
  liveRouteEpoch++;
  liveRouteLoad=null;
  liveBusy=false;
  if(liveMode()&&current()?.live?.detailsLoading){current().live.detailsLoading=false;current().live.targetsRequested=false;}
}
function detachLiveOperation(){
  cancelLiveRouteRead();
  cancelArrivalCountdown(false);
  if(!liveMode())return;
  const mode=liveOperation.mode,record=state.operations[mode];
  [...(record?.items||[]).flatMap(item=>[item.photos?.near,item.photos?.far,item.photos?.unload]),...(record?.documents||[])]
    .filter(Boolean).forEach(item=>nativeReleaseFile(item.token));
  liveOperation=null;
  assignment=demoAssignment;
  state.operations[mode]=fresh(mode);
  closeModal(false);
}
function synchronizeDesignedOperation(){
  if(!backendMode||backendTestWorkspace)return false;
  const selected=liveRouteSelection();
  if(liveMode()&&(!selected||liveOperation.ownerKey&&liveOperation.ownerKey!==selected.ownerKey||String(liveOperation.pointId)!==String(selected.point.id))){
    detachLiveOperation();
  }
  if(backendActiveNav!=='now'){
    if(liveRouteLoad)cancelLiveRouteRead();
    return false;
  }
  if(!selected)return false;
  backendLastNearest=selected.point;
  // Owner-scoped offline restoration can replace the live record asynchronously.
  // Wait for that restoration before starting an API read, then validate its point.
  if(window.SuperSpedytorOfflineWorkspace&&!window.SuperSpedytorOfflineWorkspace.ready())return false;
  const mode=liveOperationModel.operationMode(selected.point)||'load';
  const sameRoute=liveMode()&&liveOperation.routeKey===selected.key&&current()?.live;
  if(!sameRoute){
    const restored=liveMode()&&!liveOperation.routeKey&&String(liveOperation.pointId)===String(selected.point.id)&&liveOperation.mode===mode?current():null;
    if(!restored)detachLiveOperation();
    const record=liveOperationModel.buildRouteRecord(selected.point,null,restored,backendState.backend_origin);
    record.live.targetsRequested=false;
    state.operations[mode]=record;
    liveOperation={pointId:String(selected.point.id),point:selected.point,mode,ownerKey:selected.ownerKey,routeKey:selected.key,finishing:false};
    assignment=liveOperationModel.buildAssignment(selected.point,record);
    state.operation=mode;state.routeStop=null;state.serviceOpen=false;state.screen=record.step;
    state.manualLanguage=true;state.language='pl';
    closeModal(false);
  }else{
    liveOperation.point=selected.point;
    current().place=liveOperationModel.placeFromPoint(selected.point);
    current().operationLabel=String(selected.point.operation_type_display||current().operationLabel);
    current().optional.instructions=String(selected.point.notes||'');
    current().arrived=String(selected.point.status).toLowerCase()==='in_progress';
    current().timing.startedAt=liveOperationModel.confirmedStartInstant(selected.point);
    current().timing.offsetSeconds=0;
  }
  const record=current();
  if(liveOperationModel.wizardMode(selected.point)&&!record.live.targetsRequested&&!record.live.targetsReady){
    record.live.targetsRequested=true;
    if(backendState.refreshing){record.live.targetsRequested=false;record.live.detailsLoading=true;}
    else if(window.SuperSpedytorNative?.backendRequest)enterLiveOperation(selected.point,{selected});
    else record.live.detailsError='Szczegóły sztuk są dostępne w aplikacji na telefonie.';
  }
  return true;
}
function liveDetailsNotice(){
  const detail=current().live;
  if(detail?.detailsLoading)return '<section class="panel" role="status"><p>Pobieranie sztuk i dokumentacji zlecenia…</p></section>';
  if(detail?.detailsError)return `<section class="panel" role="alert"><p>${esc(detail.detailsError)}</p><button type="button" class="secondary-button" id="live-details-retry">Spróbuj ponownie</button></section>`;
  return '';
}
function goLiveReadOnly(screen){
  const screens=current()?.arrived&&!current().live.routeOnly?operationFlow():['travel'];
  if(!screens.includes(screen))return;
  closeModal(false);state.screen=screen;current().step=screen;
  render();$('#app-scroll').scrollTop=0;
}
function bindLiveReadOnlyView(){
  // Read-only means the same screens with inspection/navigation, never camera,
  // QR, file selection, local confirmations or a queued native mutation.
  $$('input,textarea,select,button',$('#app')).forEach(control=>{control.disabled=true;});
  bindLiveSessionControls();
  bindInventoryCards();
  const screens=current().arrived&&!current().live.routeOnly?operationFlow():['travel'];
  const index=Math.max(0,screens.indexOf(state.screen));
  const retry=$('#live-details-retry');
  if(retry){retry.disabled=false;retry.onclick=()=>{current().live.targetsRequested=false;current().live.detailsError='';render();};}
  const stageBack=$('#stage-back');
  if(stageBack&&index>0){stageBack.disabled=false;stageBack.onclick=()=>goLiveReadOnly(screens[index-1]);}
  $$('[data-back]').forEach(button=>button.onclick=()=>goLiveReadOnly(button.dataset.back));
  const main=$('#main-action');
  if(main)main.onclick=()=>goLiveReadOnly(screens[index+1]||screens[0]);
}
function bindLiveSessionControls(){
  const refresh=$('#backend-refresh'),logout=$('#backend-logout'),retry=$('#live-details-retry');
  if(refresh){refresh.disabled=false;refresh.onclick=()=>{
    if(liveMode()&&current()?.live){current().live.targetsRequested=false;current().live.targetsReady=false;}
    driverBridge?.backendRefresh();
  };}
  if(logout){logout.disabled=false;logout.onclick=()=>{closeBackendReadOnlyTacho(false);detachLiveOperation();driverBridge?.backendLogout();};}
  if(retry){retry.disabled=false;retry.onclick=()=>{current().live.targetsRequested=false;current().live.detailsError='';render();};}
}
function liveFailure(result,fallback){
  const message=liveOperationModel.errorMessage(result,fallback);
  toast(message);
  return message;
}
async function enterLiveOperation(point,{selected=liveRouteSelection()}={}){
  if(!liveOperationModel||!window.SuperSpedytorNative?.backendRequest||!selected||String(point.id)!==String(selected.point.id))return;
  const mode=liveOperationModel.wizardMode(point);
  if(!mode||liveRouteLoad?.key===selected.key)return;
  const epoch=++liveRouteEpoch;
  liveRouteLoad={key:selected.key,epoch};
  liveBusy=true;
  if(liveMode()&&liveOperation.routeKey===selected.key)current().live.detailsLoading=true;
  try{
    const result=await nativeRequest('GET',liveOperationModel.targetsPath(mode,point.id));
    if(epoch!==liveRouteEpoch||liveRouteSelection()?.key!==selected.key||backendActiveNav!=='now'||backendTestWorkspace)return;
    if(!liveOperationModel.isSuccess(result)){
      if(liveMode()&&liveOperation.routeKey===selected.key)current().live.detailsError=liveOperationModel.errorMessage(result,'Nie udało się pobrać szczegółów zlecenia.');
      return;
    }
    const previous=liveMode()&&liveOperation.routeKey===selected.key?current():null;
    const record=liveOperationModel.buildRouteRecord(point,result.body,previous,backendState?.backend_origin);
    record.live.targetsRequested=true;
    liveOperation={pointId:String(point.id),point,mode,ownerKey:selected.ownerKey,routeKey:selected.key,finishing:false};
    state.operations[mode]=record;
    assignment=liveOperationModel.buildAssignment(point,record);
    state.routeStop=null;
    state.serviceOpen=false;
    state.operation=mode;
    state.screen=record.step;
    beginOperationTimer(record);
    closeModal(false);
  }catch(error){
    if(epoch===liveRouteEpoch&&liveMode()&&liveOperation.routeKey===selected.key)current().live.detailsError='Nie udało się pobrać szczegółów zlecenia. Spróbuj ponownie.';
  }finally{
    if(epoch===liveRouteEpoch){
      liveRouteLoad=null;liveBusy=false;
      if(liveMode()&&liveOperation.routeKey===selected.key)current().live.detailsLoading=false;
      render();
    }
  }
}
async function refreshLiveTargets(){
  if(!liveMode())return false;
  const operation=liveOperation,record=current();
  const result=await nativeRequest('GET',liveTargetsPath());
  if(!liveMode()||liveOperation!==operation||current()!==record)return false;
  if(!liveOperationModel.isSuccess(result)){liveFailure(result,'Nie udało się odświeżyć plomb.');return false;}
  const mode=liveOperation.mode;
  state.operations[mode]=liveOperationModel.buildRouteRecord(liveOperation.point,result.body,state.operations[mode],backendState?.backend_origin);
  assignment=liveOperationModel.buildAssignment(liveOperation.point,state.operations[mode]);
  render();
  return true;
}
function exitLiveOperation(message){
  if(!liveMode())return;
  detachLiveOperation();
  state.operation='load';
  state.screen='info';
  backendActiveNav='now';
  closeModal(false);
  render();
  if(message)toast(message);
}
async function liveAssign(target,code){
  if(backendReadOnly()){toast(readOnlyResult().message);return;}
  const unload=current().mode==='unload';
  const body=unload?liveOperationModel.scanBody(code,liveScanManual):liveOperationModel.assignBody(current(),target,code);
  if(!body){$('#qr-error').textContent='Nie ma do czego przypiąć tej plomby. Odśwież ekran.';return;}
  const button=$('#manual-scan');
  if(button)button.disabled=true;
  try{
    const result=await nativeRequest('POST',unload?`routes/points/${encodeURIComponent(liveOperation.pointId)}/label-scan/`:'documents/labels/assign/',body);
    if(!liveMode())return;
    if(result.queued){closeModal(false);render();toast('Plombę zapisano na telefonie. Potwierdzenie zgodności nastąpi po odzyskaniu internetu.');return;}
    if(!liveOperationModel.isSuccess(result)){
      const message=liveOperationModel.errorMessage(result,'Super Spedytor odrzucił tę plombę.');
      if($('#qr-error'))$('#qr-error').textContent=message;else toast(message);
      return;
    }
    let note='';
    if(unload)note=liveOperationModel.applyScanResult(current(),target,result.body).message;
    else liveOperationModel.applyAssignResult(current(),target,result.body);
    closeModal(false);
    render();
    toast(note||(unload?(target.kind==='cmr'?'Plomba CMR zgodna ze zleceniem.':'Plomba sztuki potwierdzona w Super Spedytorze.'):(target.kind==='cmr'?'Plomba CMR przypięta w Super Spedytorze.':'Plomba przypięta do tej sztuki w Super Spedytorze.')));
    await refreshLiveTargets();
  }catch(error){
    if($('#qr-error'))$('#qr-error').textContent='Warstwa natywna nie odpowiada. Spróbuj ponownie.';
  }finally{if(button)button.disabled=false;}
}
async function liveAttach(target){
  if(backendReadOnly()){toast(readOnlyResult().message);return;}
  if(liveBusy)return;
  const record=current(),cmr=target.kind==='cmr';
  liveBusy=true;
  let file=null;
  let evidence=null;
  try{
    file=await (cmr?nativeScanDocument():nativeCapturePhoto());
    if(!liveMode()||current()!==record){if(file?.token)nativeReleaseFile(file.token);return;}
    if(!file||file.status!=='ok'||!file.token){
      if(file&&file.status==='error')toast(file.message||'Nie udało się zrobić zdjęcia.');
      return;
    }
    closeModal(false);
    toast(cmr?'Wysyłam skan CMR do zlecenia…':'Wysyłam zdjęcie do zlecenia…');
    const fields=liveOperationModel.uploadFields(record.mode,target.kind);
    if(cmr)fields.route_point_id=String(record.live.pointId);
    evidence=liveOperationModel.evidenceRecord(file,target.kind,target.pieceIndex,{});
    evidence.syncState='local';
    if(!addEvidence(record.mode,evidence))return;
    record.live.fileTokens.push(file.token);
    render();
    const result=await nativeUpload(`documents/transport/${encodeURIComponent(record.live.offerId)}/upload_document/`,file.token,fields);
    if(!liveMode()){nativeReleaseFile(file.token);return;}
    if(!liveOperationModel.isSuccess(result)){liveFailure(result,'Plik pozostał na telefonie. Super Spedytor nie potwierdził odbioru.');return;}
    evidence.syncState=result.queued?'queued':'confirmed';
    evidence.documentId=result.body?.id??null;
    evidence.chatSynced=!result.queued;
    render();
    toast(result.queued?'Plik zapisano na telefonie. Oczekuje na synchronizację.':cmr?'Skan CMR zapisany w zleceniu.':'Zdjęcie zapisane w zleceniu.');
    await refreshLiveTargets();
  }catch(error){
    toast('Plik pozostaje na telefonie. Nie udało się potwierdzić wysyłki. Sprawdź kolejkę synchronizacji.');
  }finally{liveBusy=false;}
}
function liveFinish(){
  if(backendReadOnly()){toast(readOnlyResult().message);return;}
  if(!liveMode()||liveOperation.finishing)return;
  if(!liveOperationModel.sealsSatisfyGate(current())){toast(current().mode==='unload'?'Super Spedytor wymaga zeskanowania plomby każdej sztuki, która tu schodzi.':'Super Spedytor wymaga plomby na każdej sztuce i na CMR przed zakończeniem.');return;}
  liveOperation.finishing=true;
  closeModal(false);
  toast(current().mode==='unload'?'Zamykam rozładunek w Super Spedytorze…':'Zamykam załadunek w Super Spedytorze…');
  queuePointAction(liveOperation.pointId,'complete');
}
function settleBackendPointWrite(write,previousWriteKey,context){
  if(!write?.id||write.status==='pending'||`${write.id}:${write.status}`===previousWriteKey)return;
  const owner=backendState?.profile?.id==null?'':`${backendState.backend_origin||'native'}|${backendState.profile.id}`;
  if(!owner||owner!==context.owner||backendState.status!=='connected'||backendTestWorkspace)return;
  const key=`${owner}|${write.id}:${write.status}`;
  if(settledPointWrites.has(key))return;
  settledPointWrites.add(key);
  if(settledPointWrites.size>128)settledPointWrites.delete(settledPointWrites.values().next().value);
  const point=context.point;
  if(write.status==='confirmed'&&point&&String(point.id)===String(write.point_id)&&!backendReadOnly()){
    if(write.action==='complete'&&liveMode()&&String(liveOperation.pointId)===String(point.id))finishOperationTimer();
    if(['start','complete'].includes(write.action))liveOrderStatus(point,write.action);
  }
  if(liveMode()&&String(liveOperation.pointId)===String(write.point_id))liveOperation.finishing=false;
  if(write.message)toast(write.message);
}
async function liveOrderStatus(point,action){
  if(backendReadOnly())return;
  // Status zlecenia jak w przeglądarce (usePointStatusUpdate): po starcie at_loading/at_unloading,
  // po zakończeniu załadunku en_route_to_unloading. Błąd nie blokuje — punkt jest już zapisany.
  const update=liveOperationModel?.orderStatusAfterWrite(point,action);
  if(!update||!window.SuperSpedytorNative?.backendRequest)return;
  try{
    const result=await nativeRequest('POST',update.path,{status:update.status});
    if(!liveOperationModel.isSuccess(result))toast(`Status zlecenia nie zapisał się: ${liveOperationModel.errorMessage(result,'')}`);
  }catch{}
}
function liveLoadingPhotosGallery(){
  const record=current();
  const photos=liveMode()&&record.mode==='unload'?record.live.loadingPhotos:[];
  if(!photos.length)return liveMode()&&record.mode==='unload'?`<div class="shared-hint">${icon('info')} Brak zdjęć z załadunku w Super Spedytorze dla tego zlecenia.</div>`:'';
  return `<div class="loading-photo-reference live-loading-gallery"><div class="loading-photo-reference-title">${icon('camera')}<span><strong>Zdjęcia z załadunku</strong><small>${photos.length} ${photos.length===1?'zdjęcie':photos.length<5?'zdjęcia':'zdjęć'} ze zlecenia · do porównania</small></span></div><div class="loading-photo-reference-grid">${photos.map((url,index)=>`<figure><img src="${esc(url)}" alt="Zdjęcie z załadunku ${index+1}" loading="lazy"><figcaption>Załadunek · ${index+1}</figcaption></figure>`).join('')}</div></div>`;
}
function liveCmrSealRows(){
  const record=current();
  if(!liveMode()||record.cmrItems.length<2)return '';
  return `<section class="panel live-cmr-list"><div class="section-kicker">PLOMBA NA KAŻDEJ CMR-ce · ${record.cmrItems.length} odbiorców</div>${record.cmrItems.map((cmr,index)=>`<div class="seal-code-row live-cmr-row"><span><strong>${esc(cmr.label||`CMR ${index+1}`)}</strong><small>${cmr.seal?esc(cmr.seal):'Kod plomby nieodczytany'}</small></span><button class="scan-button ${cmr.seal?'scanned':''}" data-cmr-scan="${index}" ${record.cmrLabel?'':'disabled'}>${icon(cmr.seal?'check':'qr')}${cmr.seal?'Zmień':'Skanuj QR'}</button></div>`).join('')}</section>`;
}

function render(){
  if(typeof tachoReadonlyScreen!=='undefined'&&tachoReadonlyScreen?.isOpen()){
    if(backendMode&&!backendTestWorkspace&&backendState?.status==='connected'&&backendActiveNav==='tacho'){
      updateDriverWorkspaceBar();return;
    }
    closeBackendReadOnlyTacho(false);
  }
  synchronizeDesignedOperation();
  window.SuperSpedytorOfflineWorkspace?.changed();
  window.SuperSpedytorTranslator?.refresh(backendState);
  updateDriverWorkspaceBar();
  $('.device')?.classList.toggle('service-survey-focus',state.serviceOpen&&state.servicePanel==='survey'&&!state.serviceSurvey.submitted&&(!serviceCompletedToday()||state.serviceSurvey.reopened));
  $('.device')?.classList.toggle('document-verification-mode',state.routeStop==='collection'&&Boolean(collectionGroup()?.pendingDocument));
  if(backendTestWorkspace&&backendActiveNav==='tacho'){window.SuperSpedytorTacho?.open?.();return;}
  const scroll=$('#app-scroll').scrollTop;
  const backendOperationActive=backendMode&&!backendTestWorkspace&&backendState?.status==='connected'&&backendActiveNav==='now'&&!liveMode();
  const backendServiceActive=backendMode&&!backendTestWorkspace&&backendState?.status==='connected'&&backendActiveNav==='service';
  $('.device')?.classList.toggle('backend-operation-mode',backendOperationActive);
  if(backendOperationActive){
    renderBackendOperationScreen(0);
    return;
  }
  if(backendServiceActive){
    renderBackendServiceHistoryScreen(scroll);
    return;
  }
  ensureServiceSurveyToday();
  updateServiceNavIndicator();
  if(state.serviceOpen){
    const serviceViews={survey:serviceSurveyView,history:serviceHistoryView,inventory:inventoryProtocolView,handover:vehicleHandoverView};
    const serviceActions={survey:serviceActionView,history:serviceHistoryActionView,inventory:inventoryActionView,handover:vehicleHandoverActionView};
    const serviceNotes={survey:serviceDesignNotes,history:serviceHistoryDesignNotes,inventory:inventoryDesignNotes,handover:vehicleHandoverDesignNotes};
    const serviceBinders={survey:bindServiceView,history:bindServiceHistoryView,inventory:bindInventoryView,handover:bindVehicleHandoverView};
    const serviceLabels={survey:'SERWIS / ANKIETA',history:'SERWIS / HISTORIA',inventory:'SERWIS / INWENTARYZACJA',handover:'SERWIS / PRZEKAZANIE AUTA'};
    const panel=serviceViews[state.servicePanel]?state.servicePanel:'survey';
    $('#app').innerHTML=serviceViews[panel]();
    $('#app-action').innerHTML=serviceActions[panel]();
    $('#design-context').innerHTML=serviceNotes[panel]();
    $('#preview-label').textContent=serviceLabels[panel];
    $$('[data-operation],[data-route-stop],[data-service-preview]').forEach(button=>{button.classList.remove('active');button.setAttribute('aria-pressed','false');});
    const servicePreview=$(`[data-service-preview="${state.servicePanel}"]`);
    if(servicePreview){servicePreview.classList.add('active');servicePreview.setAttribute('aria-pressed','true');}
    $$('.screen-list [data-screen]').forEach(button=>button.classList.remove('active'));
    $('#scenario-select').disabled=true;
    $('#mobile-scenario').disabled=true;
    $$('[data-nav]').forEach(button=>button.classList.toggle('active',button.dataset.nav==='service'));
    serviceBinders[panel]();
    $('#app-scroll').scrollTop=scroll;
    return;
  }
  if(state.routeStop){
    const collectionViews={info:collectionInfoView,photos:collectionScanView,documents:collectionEnvelopeView,'envelope-scan':collectionEnvelopeScannerView,review:collectionReviewView,chat:stopChatView};
    const transshipmentViews={info:transshipmentInfoView,photos:transshipmentGuidedView,review:transshipmentReviewView,chat:stopChatView};
    const ordinaryViews={travel:stopTravelView,info:state.routeStop==='parking'?parkingInfoView:fuelingInfoView,photos:fuelingInProgressView,documents:fuelingExpenseView,review:routeStopSuccessView,chat:stopChatView};
    const views=state.routeStop==='collection'?collectionViews:state.routeStop==='transshipment'?transshipmentViews:ordinaryViews;
    $('#app').innerHTML=views[state.screen]();
    $('#app-action').innerHTML=stopActionView();
    $('#design-context').innerHTML=stopDesignNotes();
    const stopStage=state.routeStop==='collection'?{info:'START',photos:'SKANOWANIE',documents:'KOPERTA','envelope-scan':'SKAN PLOMBY KOPERTY',review:collection().finished?'GOTOWE':'KONTROLA',chat:'CZAT'}:state.routeStop==='transshipment'?{info:'PLAN',photos:'ODBIÓR',review:transshipment().finished?'GOTOWE':'KONTROLA',chat:'CZAT'}:{travel:'W DRODZE',info:'NA MIEJSCU',photos:'W TRAKCIE',documents:'WYDATEK',review:'GOTOWE',chat:'CZAT'};
    $('#preview-label').textContent=`${stopDefinition().title.toUpperCase()} / ${stopStage[state.screen]}`;
    $$('[data-operation]').forEach(button=>{button.classList.remove('active');button.setAttribute('aria-pressed','false');});
    $$('[data-service-preview]').forEach(button=>{button.classList.remove('active');button.setAttribute('aria-pressed','false');});
    $$('[data-route-stop]').forEach(button=>{const active=button.dataset.routeStop===state.routeStop;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
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
  if(!fuelingReady())return;
  currentStop().expenseRecords=buildFuelExpenseRecords();
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
    if(action==='transshipment-start'){
      transshipment().started=true;
      goStop('photos');
      focusTransshipmentAction();
      toast(`Odbierasz z ${transshipmentSource().vehicle}. Zeskanuj QR CMR.`);
    }
    if(action==='transshipment-next-order'&&transshipmentOrderReady()){
      const result=transshipmentModel.advance(transshipment());
      if(result.finished)goStop('review');
      else{render();focusTransshipmentAction();toast(`Następne zlecenie: ${result.order.id}. Najpierw odbierz CMR.`);}
    }
    if(action==='transshipment-finish'&&transshipmentReady()){
      transshipment().finished=true;
      transshipment().syncState='PENDING_SYNC';
      render();
      toast('Przeładunek zapisano lokalnie. Oczekuje na potwierdzenie TMS.');
    }
    if(action==='outgoing-start'){transshipment().started=true;goStop('photos');focusTransshipmentAction();}
    if(action==='outgoing-next'&&outgoingOrderReady()){const next=transshipmentModel.advance(transshipment());if(next.finished)goStop('review');else{render();focusTransshipmentAction();}}
    if(action==='outgoing-finish'&&outgoingReady()){transshipment().finished=true;transshipment().syncState='AWAITING_RECEIVER';render();}
    if(action==='transshipment-route')switchOperation('load','travel');
    if(action==='collection-prepare'){
      const group=collectionGroup(collection().transferorSourceId);
      group.prepared=true;
      group.preparedAt=new Date().toISOString();
      render();
      toast('Dokumenty są przygotowane. Koperta pozostaje otwarta.');
    }
    if(action==='collection-resume'&&collectionGroup())goStop('photos');
    if(action==='collection-envelope'&&collectionDocumentsReady())goStop('documents');
    if(action==='collection-scan-envelope')goStop('envelope-scan');
    if(action==='collection-review'&&collectionEnvelopeReady())goStop('review');
    if(action==='collection-next-driver'){
      collection().activeSourceId=null;
      collection().started=false;
      goStop('info');
      focusNextAction('.collection-driver-choice-list','start');
    }
    if(action==='collection-finish'&&allCollectionGroupsReady()){collection().finished=true;collection().syncState='PENDING_SYNC';collection().groups.forEach(group=>{group.syncState='PENDING_SYNC';if(group.shortage)group.shortage.syncState='PENDING_SYNC';});render();toast('Koperty i ewentualne braki oczekują na potwierdzenie TMS.');}
    if(action==='collection-next')switchOperation('load','travel');
    if(action==='stop-next')switchOperation('load','travel');
  };
}

function refreshStopAction(){
  $('#app-action').innerHTML=stopActionView();
  if($('#expense-status'))$('#expense-status').textContent=fuelExpenseReady()&&receiptReady()?'Gotowy':'Wymagane pola lub paragon';
  bindStopAction();
}

function bindStopView(){
  $$('[data-vehicle-exchange]').forEach(button=>button.onclick=openVehicleExchange);
  bindStopAction();
  if(state.routeStop==='transshipment'){
    $$('[data-transshipment-choose]').forEach(button=>button.onclick=()=>focusNextAction('.transfer-vehicle-choices'));
    $$('[data-transshipment-tab]').forEach(button=>button.onclick=()=>{transshipment().overviewTab=button.dataset.transshipmentTab;render();focusNextAction('.transfer-overview-tabs');});
    $$('[data-transshipment-role]').forEach(button=>button.onclick=()=>{transshipmentPreviewRole=button.dataset.transshipmentRole;goStop('info');});
    $$('[data-transshipment-vehicle]').forEach(button=>button.onclick=()=>{
      const selected=transshipmentModel.selectVehicle(transshipment(),button.dataset.transshipmentVehicle);
      if(!selected.ok){toast(selected.reason==='ORDER_IN_PROGRESS'?'Dokończ bieżący CMR i jego sztuki, zanim zmienisz auto.':'To auto nie ma już pozycji do przejęcia.');return;}
      render();focusNextAction('.transfer-vehicle-choices');
    });
    $$('[data-cmr-page]').forEach(button=>button.onclick=()=>{
      const cmr=transshipmentOrder().cmr,page=Number(button.dataset.cmrPage);
      if(!Number.isInteger(page)||page<0||page>=cmr.pages)return;
      cmr.previewPage=page;render();focusNextAction('.transfer-cmr-viewer');
    });
    $$('[data-cmr-zoom]').forEach(button=>button.onclick=()=>{const cmr=transshipmentOrder().cmr;cmr.zoomed=!cmr.zoomed;render();focusNextAction('.transfer-cmr-viewer');});
    $$('[data-cmr-order]').forEach(viewer=>{
      const image=$('[data-cmr-image]',viewer),order=transshipmentOrder(),role=transshipmentPreviewRole;
      const details=viewer.closest('details');
      if(details){details.open=order.cmr.viewerOpen;details.ontoggle=()=>{if(details.isConnected)order.cmr.viewerOpen=details.open;};}
      if(!image)return;
      const loaded=()=>{
        if(transshipmentPreviewRole!==role||transshipmentOrder()?.id!==viewer.dataset.cmrOrder||!image.naturalWidth)return;
        const result=transshipmentModel.reviewCmrPage(transshipment(),Number(image.dataset.pageIndex));if(!result.ok)return;
        $('.transfer-cmr-page-status',viewer).textContent=`Obejrzane strony: ${order.cmr.reviewedPages.length}/${order.cmr.pages}. Porównaj cały dokument z oryginałem.`;
        const accept=$('#transshipment-accept-cmr')||$('#outgoing-cmr');if(accept)accept.disabled=!transshipmentModel.cmrReviewComplete(order);
      };
      image.onload=loaded;
      image.onerror=()=>{
        if(transshipmentPreviewRole!==role||transshipmentOrder()?.id!==viewer.dataset.cmrOrder)return;
        order.cmr.reviewedPages=order.cmr.reviewedPages.filter(page=>page!==Number(image.dataset.pageIndex));
        $('.transfer-cmr-page-status',viewer).textContent='Nie udało się wczytać strony CMR. Potwierdzenie jest zablokowane.';
        const accept=$('#transshipment-accept-cmr')||$('#outgoing-cmr');if(accept)accept.disabled=true;
      };
      if(image.complete){if(image.naturalWidth)loaded();else image.onerror();}
    });
    if($('#outgoing-cmr'))$('#outgoing-cmr').onclick=()=>{if(!transshipmentModel.confirmIssuedCmr(transshipment()).ok)return;render();focusTransshipmentAction();};
    $$('[data-outgoing-piece]').forEach(button=>button.onclick=()=>{if(!transshipmentModel.confirmIssuedPiece(transshipment(),button.dataset.outgoingPiece).ok)return;render();focusTransshipmentAction();});
    $$('[data-transshipment-photo]').forEach(button=>button.onclick=()=>openModal('transshipment-photo',{routeStop:'transshipment',orderId:transshipmentOrder().id,pieceId:button.dataset.pieceId,side:button.dataset.transshipmentPhoto}));
    $$('[data-transshipment-unload]').forEach(button=>button.onclick=()=>showTransferredUnload(button.dataset.transshipmentUnload));
    if($('#transshipment-complete-piece'))$('#transshipment-complete-piece').onclick=()=>{
      const result=transshipmentModel.completePiece(transshipment(),$('#transshipment-complete-piece').dataset.pieceId);
      if(!result.ok)return;render();focusTransshipmentAction();toast('Sztuka potwierdzona pod właściwym CMR. Nowe zdjęcia są dostępne w rozładunku.');
    };
    $$('[data-transshipment-back]').forEach(button=>button.onclick=()=>goStop(button.dataset.transshipmentBack));
    $$('[data-transshipment-scan]').forEach(button=>button.onclick=()=>openModal('transshipment-scan',{kind:button.dataset.transshipmentScan,pieceId:button.dataset.pieceId||null}));
    if($('#transshipment-accept-cmr'))$('#transshipment-accept-cmr').onclick=()=>{
      const result=transshipmentModel.acceptCmr(transshipment());
      if(!result.ok)return;
      render();
      focusTransshipmentAction();
      toast('Dokument odebrany. Teraz odbierz kolejno sztuki ładunku.');
    };
  }
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
    if($('#collection-report-missing'))$('#collection-report-missing').onclick=()=>openModal('collection-missing');
    $$('[data-collection-reference]').forEach(button=>button.onclick=()=>openModal('collection-reference',{itemId:button.dataset.collectionReference,sourceId:button.dataset.collectionSource||collectionGroup()?.sourceId}));
    if($('#collection-dismiss-foreign'))$('#collection-dismiss-foreign').onclick=()=>{collectionGroup().blockedDocument=null;render();$('#app-scroll').scrollTop=0;};
    if($('#collection-accept-document'))$('#collection-accept-document').onclick=()=>{
      const group=collectionGroup(),record=group?.pendingDocument;
      if(!group||!record)return;
      try{collectionModel.acceptPending(group,collectionOrders,new Date().toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'}));}
      catch(error){toast(error.message);return;}
      render();
      $('#app-scroll').scrollTop=0;
      if(availableCollectionOrders(group).length)openModal('collection-scan');
      toast('CMR przyjęty. Zeskanuj następny dokument tego kierowcy.');
    };
    if($('#collection-reject-document'))$('#collection-reject-document').onclick=()=>{
      const group=collectionGroup(),record=group?.pendingDocument;
      if(!group||!record)return;
      revoke(record);
      group.pendingDocument=null;
      group.envelope.contentsConfirmed=false;
      render();
      $('#app-scroll').scrollTop=0;openModal('collection-scan');
      toast('Dokument nie został przejęty. Zeskanuj właściwy CMR.');
    };
    if($('#collection-envelope-confirm'))$('#collection-envelope-confirm').onchange=event=>{collectionGroup().envelope.contentsConfirmed=event.target.checked;render();};
    if($('#collection-read-envelope-qr'))$('#collection-read-envelope-qr').onclick=()=>openModal('scan',{kind:'collection-envelope',sourceId:collectionGroup().sourceId});
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

function playOperationEscalation(snapshot){
  if(snapshot.threshold<operationTimingModel.thresholds.urgentSeconds)return;
  const timing=current().timing;
  if(timing.alertedThreshold>=snapshot.threshold)return;
  timing.alertedThreshold=snapshot.threshold;
  try{navigator.vibrate?.(snapshot.stage==='limit'?[350,120,350,120,500]:[250,120,250]);}catch{}
  try{
    const AudioContextClass=window.AudioContext||window.webkitAudioContext;
    if(!AudioContextClass)return;
    const context=new AudioContextClass(),gain=context.createGain(),start=context.currentTime;
    gain.gain.setValueAtTime(.0001,start);
    gain.gain.exponentialRampToValueAtTime(.16,start+.02);
    gain.gain.exponentialRampToValueAtTime(.0001,start+.7);
    gain.connect(context.destination);
    [0,.28].forEach((offset,index)=>{
      const oscillator=context.createOscillator();
      oscillator.type='sine';
      oscillator.frequency.setValueAtTime(index?880:660,start+offset);
      oscillator.connect(gain);
      oscillator.start(start+offset);
      oscillator.stop(start+offset+.2);
    });
    setTimeout(()=>context.close().catch(()=>{}),900);
  }catch{}
}

function acknowledgeOperationTimer(value){
  if(liveReadOnly())return;
  const record=current(),timing=record.timing,snapshot=operationTimerSnapshot(record);
  const option=operationResponseOptions().find(([key])=>key===value);
  const label=value==='chat'?'Kontakt ze spedytorem':option?.[1];
  if(!label||snapshot.stage==='normal')return;
  timing.acknowledgedThreshold=snapshot.threshold;
  timing.response=label;
  timing.responseAt=new Date().toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'});
  if(state.modal?.type==='operation-status')closeModal(false);
  if(value==='chat'||value==='problem'){
    if(record.live){
      render();
      window.SuperSpedytorLiveWorkspace?.open('chat');
      toast('Odpowiedź zapisano na telefonie. Przekaż szczegóły spedytorowi w Czacie.');
    }else{toast('Status zapisano w podglądzie. Uzupełnij szczegóły w czacie.');go('chat');}
    return;
  }
  render();
  $('#main-action')?.focus({preventScroll:true});
  toast(record.live?'Odpowiedź zapisano na tym telefonie.':'Status zapisano w podglądzie. Nie wysłano go do backendu.');
}

function setOperationTimerPreview(minutes){
  const timing=current().timing,seconds=Math.max(0,Number(minutes)||0)*60;
  timing.startedAt=Date.now();
  timing.endedAt=null;
  timing.offsetSeconds=seconds;
  timing.acknowledgedThreshold=0;
  timing.response=null;
  timing.responseAt=null;
  timing.alertedThreshold=0;
  const snapshot=operationTimingModel.describe(seconds,0);
  timing.renderedStage=snapshot.stage;
  playOperationEscalation(snapshot);
  render();
}

function bindOperationTimer(){
  $$('[data-operation-status-open]').forEach(button=>button.onclick=()=>openModal('operation-status'));
  $$('[data-operation-response]').forEach(button=>button.onclick=()=>acknowledgeOperationTimer(button.dataset.operationResponse));
  $$('[data-timer-preview]').forEach(button=>button.onclick=()=>setOperationTimerPreview(button.dataset.timerPreview));
}

function updateOperationTimerDom(){
  const record=current();
  if(!record.arrived||record.finished||!record.timing?.startedAt)return;
  const snapshot=operationTimerSnapshot(record);
  if(snapshot.stage!==record.timing.renderedStage){
    record.timing.renderedStage=snapshot.stage;
    playOperationEscalation(snapshot);
    render();
    return;
  }
  $$('[data-operation-elapsed]').forEach(element=>{element.textContent=operationTimingModel.formatDuration(snapshot.elapsedSeconds);});
  $$('[data-operation-progress]').forEach(element=>{element.style.width=`${snapshot.progressPercent}%`;});
}

function bindView(){
  if(liveReadOnly()){bindLiveReadOnlyView();return;}
  if(liveMode()){bindLiveSessionControls();bindInventoryCards();}
  bindOperationTimer();
  if($('#language-select'))$('#language-select').onchange=event=>{state.language=event.target.value;state.manualLanguage=true;render();};
  if($('#physical-confirm'))$('#physical-confirm').onchange=event=>{current().physicalConfirmed=event.target.checked;$('#app-action').innerHTML=actionView();bindView();};
  if($('#report-cargo-mismatch'))$('#report-cargo-mismatch').onclick=()=>openModal(liveMode()?'live-help':'cwp-contact');
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
    const card=input.closest('.piece-task-card');
    card.querySelector('[data-piece-scan]').disabled=!piece.label;
    card.querySelector('.piece-task-progress').textContent=`${[piece.label,piece.seal,piece.photos.near,piece.photos.far].filter(Boolean).length}/4`;
    $('#app-action').innerHTML=actionView();
    bindView();
  });
  $$('[data-piece-scan]').forEach(button=>button.onclick=()=>openModal('scan',{kind:'piece',index:Number(button.dataset.pieceScan)}));
  $$('[data-piece-photo]').forEach(button=>button.onclick=()=>{
    const pieceIndex=Number(button.dataset.piecePhoto),side=button.dataset.photoSide;
    openModal('attachment',{kind:side==='near'?'photo-near':side==='far'?'photo-far':'photo-unload',pieceIndex,source:'step'});
  });
  if($('#cmr-label'))$('#cmr-label').onchange=event=>{
    if(!event.target.checked&&current().cmrSeal){event.target.checked=true;toast('Kod plomby CMR jest już zapisany. Możesz zeskanować go ponownie.');return;}
    current().cmrLabel=event.target.checked;
    $('#scan-cmr-seal').disabled=!current().cmrLabel;$('#app-action').innerHTML=actionView();bindView();
  };
  if($('#scan-cmr-return'))$('#scan-cmr-return').onclick=()=>openModal('scan',{kind:'cmr-return'});
  if($('#cmr-retained'))$('#cmr-retained').onchange=event=>{current().cmrRetained=event.target.checked;$('#app-action').innerHTML=actionView();bindView();};
  if($('#scan-cmr-seal'))$('#scan-cmr-seal').onclick=()=>openModal('scan',{kind:'cmr',cmrIndex:0});
  $$('[data-cmr-scan]').forEach(button=>button.onclick=()=>openModal('scan',{kind:'cmr',cmrIndex:Number(button.dataset.cmrScan)}));
  if($('#live-exit'))$('#live-exit').onclick=()=>exitLiveOperation();
  if($('#live-cmr-missing'))$('#live-cmr-missing').onclick=()=>{if(current().cmrSealSkipped)return;current().cmrSealSkipped=true;render();toast('Krok plomby CMR pominięty. Super Spedytor nie wymaga go do zakończenia rozładunku.');};
  if($('#add-document'))$('#add-document').onclick=()=>openModal('attachment',{kind:'cmr',source:'step'});
  if($('#documents-confirm'))$('#documents-confirm').onchange=event=>{current().documentsComplete=event.target.checked;render();};
  $$('[data-remove-document]').forEach(button=>button.onclick=()=>{const record=current().documents.splice(Number(button.dataset.removeDocument),1)[0];revoke(record);current().documentsComplete=false;render();});
  $$('[data-supplied-photo]').forEach(button=>button.onclick=()=>openModal('supplied',Number(button.dataset.suppliedPhoto)));
  $$('[data-open-chat]').forEach(button=>button.onclick=()=>go('chat'));
  $$('[data-back]').forEach(button=>button.onclick=()=>go(button.dataset.back));
  if($('#stage-back'))$('#stage-back').onclick=()=>{if(!isLoad()&&state.screen==='seals'){if(liveMode())exitLiveOperation();else go('travel');return;}const flow=operationFlow();go(flow[Math.max(0,flow.indexOf(state.screen)-1)]);};
  if($('#review-back'))$('#review-back').onclick=()=>go('documents');
  if($('#chat-back'))$('#chat-back').onclick=()=>go(state.returnScreen);
  bindChatComposer(current());
  if($('#copy-reference'))$('#copy-reference').onclick=async()=>{try{await navigator.clipboard.writeText(optional().ref);toast('REF został skopiowany.');}catch{openModal('copy');}};
  $('#main-action').onclick=()=>{
    const action=$('#main-action').dataset.action;
    if(action==='operation-status'){openModal('operation-status');return;}
    if(action==='start-arrival')startArrivalCountdown();
    if(action==='cancel-arrival')cancelArrivalCountdown(true);
    if(action==='complete-point'&&liveMode()&&!backendReadOnly()){
      if(!window.confirm('Potwierdzasz, że ta operacja została faktycznie zakończona?'))return;
      requestLivePointAction('complete');render();
    }
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
    if(action==='finish'&&finishReady())openModal('finish');
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
  if(productionScope&&['designed-views','service-help'].includes(type))return;
  if(type==='collection-reference'&&!collectionModel.referenceFor(collectionGroup(target?.sourceId),collectionOrders,target?.itemId))return;
  if(type==='collection-missing'){
    const group=collectionGroup();
    if(!group||group.envelope.sealCode||group.pendingDocument||group.blockedDocument||!availableCollectionOrders(group).length)return;
  }
  if(type==='piece-form'&&current().started)return;
  if(type==='attachment'){
    if(!current().started||!current().physicalConfirmed){toast(isLoad()?'Załączniki dodasz po potwierdzeniu wykonania załadunku.':'Załączniki dodasz po potwierdzeniu liczby sztuk do rozładowania.');return;}
    if(target.kind==='cmr'&&!cmrSealReady()){toast(isLoad()?'Najpierw naklej plombę na pustym tyle ostatniej strony CMR i zeskanuj QR.':'Najpierw zeskanuj istniejącą plombę CMR.');return;}
    if(target.kind!=='cmr'&&!current().items[target.pieceIndex]?.seal){toast(isLoad()?'Najpierw naklej i zeskanuj plombę tej sztuki.':'Najpierw zeskanuj istniejącą plombę tej sztuki.');return;}
  }
  if(type==='scan'){
    const collectionEnvelope=target.kind==='collection-envelope';
    const allowed=collectionEnvelope?collectionDocumentsReady()&&collectionGroup().envelope.contentsConfirmed&&!collectionGroup().envelope.sealCode&&target.sourceId===collectionGroup().sourceId:isLoad()?(target.kind==='cmr'?current().cmrLabel:current().items[target.index]?.label):true;
    if(!allowed)return;
  }
  if(type==='finish'&&!finishReady())return;
  if(type==='operation-status'&&(liveReadOnly()||!operationResponseSuggested()))return;
  if(!state.modal)focusBeforeModal=document.activeElement;
  state.modal={type,target};
  let title='',body='';

  if(type==='operation-status'){title='Co dzieje się na miejscu?';body=operationStatusPromptView();}
  if(type==='designed-views'){
    title='Wszystkie widoki do testów';
    body=`<p>Wybierz proces. Widoki używają danych przykładowych. Zdjęcia, plomby i dokumenty pozostają na tym telefonie.</p><div class="designed-view-list">${designedDriverViews.map(view=>`<button type="button" data-designed-view="${view.id}"><span>${icon(view.icon)}</span><div><strong>${esc(view.title)}</strong><small>${esc(view.description)}</small></div>${icon('arrow')}</button>`).join('')}</div>`;
  }
  if(type==='live-help'){
    title='Pomoc · Super Spedytor';
    body='<p>Operacja pokazuje Twoją trasę z SS. Mapa otwiera lokalizację, a Nawiguj rozpoczyna prowadzenie. Rozpoczęcie i zakończenie operacji zapisują status w SS. Serwis pokazuje historię ankiet.</p><p>Wszystkie pozostałe widoki możesz przejść w trybie testowym z danymi przykładowymi.</p><button class="primary-button" id="help-test-views">Testuj wszystkie widoki</button>';
  }

  if(type==='piece-form'){
    const editing=target.index!==null,item=editing?current().items[target.index]:null;
    title=editing?'Edytuj szczegóły sztuki':'Dodaj sztukę ładunku';
    body=`<p>${isLoad()?'Każda sztuka otrzyma własną plombę, QR i dwa zdjęcia.':'Każda sztuka będzie miała numer plomby z załadunku, skan QR i zdjęcie z rozładunku.'}</p><label class="field-label" for="piece-name">Nazwa lub rodzaj sztuki *</label><input id="piece-name" class="text-input" maxlength="80" value="${esc(item?.name||'')}" placeholder="np. Skrzynia transportowa 3"><label class="field-label" for="piece-description">Opis zawartości</label><textarea id="piece-description" class="text-input piece-textarea" maxlength="180" placeholder="np. Sprzęt eventowy w opakowaniu">${esc(item?.description||'')}</textarea><div class="piece-form-grid"><label><span class="field-label">Waga w kg</span><input id="piece-mass" class="text-input" type="number" min="0" step="0.1" value="${has(item?.mass)?esc(item.mass):''}" placeholder="120"></label><label><span class="field-label">Wymiary</span><input id="piece-dimensions" class="text-input" maxlength="60" value="${esc(item?.dimensions||'')}" placeholder="120 × 80 × 100 cm"></label></div><p id="piece-error" class="field-error" role="alert"></p><button class="primary-button" id="save-piece">${icon(editing?'check':'plus')}${editing?'Zapisz szczegóły':'Dodaj sztukę'}</button>`;
  }
  if(type==='attachment'){
    const piece=target.kind==='cmr'?null:current().items[target.pieceIndex];
    title=target.kind==='cmr'?'Dodaj skan CMR':target.kind==='photo-near'?`Sztuka ${target.pieceIndex+1} · z bliska`:target.kind==='photo-far'?`Sztuka ${target.pieceIndex+1} · z daleka`:`Sztuka ${target.pieceIndex+1} · zdjęcie z rozładunku`;
    body=liveMode()
      ?`<p>${esc(attachmentDescription(target.kind,piece))}</p><button class="primary-button" id="choose-file">${icon('camera')}${target.kind==='cmr'?'Skanuj CMR aparatem (PDF)':'Zrób zdjęcie aparatem'}</button><p class="small-note">${target.kind==='cmr'?'Skaner wyprostuje strony i złoży je w jeden PDF. ':''}Plik trafi od razu do zlecenia w Super Spedytorze.</p>`
      :`<p>${esc(attachmentDescription(target.kind,piece))}</p>${target.kind==='cmr'?demoDocument():`<img class="photo-preview" src="${demoPhoto(target.kind==='photo-near'?0:1)}" alt="Przykładowe ujęcie ładunku — ilustracja">`}<button class="primary-button" id="choose-file">${icon('camera')}${target.kind==='cmr'?'Aparat, zdjęcia lub PDF':'Aparat lub zdjęcie z urządzenia'}</button><button class="secondary-button" id="use-demo">${target.kind==='cmr'?'Dodaj przykładową stronę':'Wypróbuj na zdjęciu przykładowym'}</button><p class="small-note">${target.source==='chat'?'Załącznik z czatu uzupełni również ekran operacji. ':''}Do 100 MB na plik. W teście widoków materiały pozostają na telefonie.</p>`;
    if(!liveMode()&&target.kind==='cmr')body=`<div class="scanner-color-tip">${icon('doc')}<p><strong>CMR wymaga pełnego skanu.</strong> Zeskanuj wszystkie strony, zachowaj kolor i sprawdź tekst, podpisy oraz pieczątki w powiększeniu.</p></div><button class="primary-button scanner-modal-primary" id="open-cmr-scanner">${icon('camera')}Skanuj CMR i sprawdź jakość</button><button class="secondary-button" id="use-demo">Dodaj przykładową stronę · test</button><p class="small-note">Skaner dokumentu poprawia kadr. Czytnik QR służy osobno do odczytu numeru plomby. Do 20 stron i 100 MB na zestaw. W teście widoków materiały pozostają na telefonie.</p>`;
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
  if(type==='handover-photo'){
    if(target.photoKind==='vehicle'){
      const requirement=handoverPhotoRequirement(target.key);
      title=requirement.name;
      body=`<p>${esc(requirement.description)}</p><div class="fuel-photo-modal-icon service-photo-modal-icon">${icon(requirement.icon||'camera')}</div><button class="primary-button handover-modal-camera" id="choose-file">${icon('camera')}Zrób zdjęcie</button><button class="secondary-button" id="use-demo">Dodaj zdjęcie demonstracyjne</button><p class="small-note">Sprawdź ostrość i pełny kadr. Nie fotografuj kodów PIN do kart paliwowych.</p>`;
    }else{
      const item=handoverEquipmentItem(target.key),wide=target.shot==='wide';
      title=wide?'Ujęcie ogólne uszkodzenia':'Zbliżenie uszkodzenia';
      body=`<p>${wide?`Pokaż całą pozycję „${esc(item.name)}” i miejsce uszkodzenia na pojeździe.`:`Pokaż wyraźnie szczegół uszkodzenia pozycji „${esc(item.name)}”.`}</p><div class="fuel-photo-modal-icon service-photo-modal-icon">${icon('camera')}</div><button class="primary-button handover-modal-camera" id="choose-file">${icon('camera')}Zrób zdjęcie</button><button class="secondary-button" id="use-demo">Dodaj zdjęcie demonstracyjne</button><p class="small-note">Super Spedytor wymaga obu ujęć: ogólnego i zbliżenia. Produkcja zapisuje identyfikatory obu uploadów przy tej pozycji.</p>`;
    }
  }
  if(type==='transshipment-photo'){
    const piece=transshipmentPiece();if(!piece||piece.id!==target.pieceId||!piece.scannedCode)return;
    title=target.side==='near'?'Zdjęcie po przeładunku · z bliska':'Zdjęcie po przeładunku · z daleka';
    body=`<p>${target.side==='near'?'Pokaż sztukę i jej plombę z bliska.':'Pokaż całą sztukę i jej miejsce na swoim aucie.'} Zdjęcie zostanie przypisane do ${esc(piece.name)} oraz CMR ${esc(target.orderId)}.</p><button class="primary-button" id="choose-file">${icon('camera')}Zrób lub dodaj zdjęcie</button><button class="secondary-button" id="use-demo">Dodaj zdjęcie demonstracyjne</button><p class="small-note">Do 100 MB na plik · zapis lokalny w teście widoków.</p>`;
  }
  if(type==='transshipment-scan'){
    const order=transshipmentOrder(),piece=target.kind.endsWith('piece')?order?.pieces.find(item=>item.id===target.pieceId):null;
    const expected=target.kind.endsWith('cmr')?order?.cmr.expectedSeal:piece?.expectedSeal;
    target={...target,role:transshipmentPreviewRole,routeStop:'transshipment',orderId:order?.id||null,expected};
    state.modal.target=target;
    title=target.kind.endsWith('cmr')?`Plomba CMR · ${order.id}`:`Plomba ładunku · ${piece.name}`;
    body=`<p>${target.kind.endsWith('cmr')?`${transshipmentPreviewRole==='transferor'?'Zeskanuj plombę CMR, który przekazujesz odbierającemu.':'Zeskanuj plombę dokumentu CMR lub jego koperty.'} Po zgodnym odczycie pokażemy skan dokumentu zapisany dla zlecenia ${esc(order.id)}.`:`Porównaj sztukę ze zdjęciem z załadunku i zeskanuj plombę znajdującą się na tej konkretnej sztuce.`}</p><div class="scan-camera transshipment-scan-camera"><span class="scan-guide">${icon('qr')}</span><span class="demo-watermark">${target.kind.endsWith('cmr')?'Skanuj plombę dokumentu / koperty':'Skanuj plombę pokazanej sztuki'}</span></div><div class="transshipment-modal-expected"><small>OCZEKIWANY NUMER</small><strong>${esc(expected)}</strong></div><button class="primary-button" id="simulate-transshipment-scan">${icon('qr')}Symuluj zgodny odczyt</button><label for="transshipment-qr-code" class="field-label">Lub wpisz numer plomby</label><input id="transshipment-qr-code" class="text-input" autocomplete="off" maxlength="64" placeholder="${esc(expected)}"><p id="qr-error" class="field-error" role="alert"></p><button class="secondary-button" id="manual-transshipment-scan">Sprawdź numer plomby</button><p class="small-note">Błędny numer nie zaliczy dokumentu ani sztuki i nie pozwoli przejść dalej.</p>`;
  }
  if(type==='collection-scan'){
    const group=collectionGroup(),source=group?collectionSource(group.sourceId):null,available=group?availableCollectionOrders(group):[];
    const first=available[0]||collectionMissingOrders(group)[0];
    const foreign=collection().scenario==='foreign'&&group?.sourceId===collectionSources[0].id&&group.documents.length===5&&available.length>0;
    const missing=collection().scenario==='missing'&&group?.sourceId===collectionSources[0].id&&group.documents.length===5&&available.length>0;
    target={kind:'collection-document',routeStop:'collection',sourceId:group?.sourceId||null,demoQrCode:foreign?collectionOrders.find(order=>order.sourceId===collectionSources[1].id).qrCode:first?.qrCode||null};
    state.modal.target=target;
    title=group?`${group.documents.length?'Kolejny':'Pierwszy'} CMR · ${source.name}`:'Najpierw wybierz kierowcę';
    body=first?`<p>Odbierasz dokumenty od: <strong>${esc(source.name)}</strong>. Zeskanowany QR musi należeć do tej osoby.</p><div class="scan-camera"><span class="scan-guide">${icon('qr')}</span><span class="demo-watermark">Skanuj plombę na CMR</span></div>${missing?`<div class="collection-exception"><p><strong>Symulacja: kierowca nie ma tej CMR.</strong>Na liście pozostaje ${esc(first.orderId)}. Otwórz skan i sprawdźcie inne koszulki przed zgłoszeniem braku.</p></div>`:`<button class="primary-button" id="simulate-collection-document">${icon('qr')}${foreign?'Symuluj QR szóstego dokumentu':'Symuluj odczyt QR dokumentu'}</button>`}${available.length?`<button class="collection-report-missing" id="collection-missing-from-scan">${icon('warning')}Zgłoś brak / sprawdź skan CMR</button>`:''}<label for="collection-document-qr" class="field-label">Lub wpisz kod QR dokumentu</label><input id="collection-document-qr" class="text-input" autocomplete="off" maxlength="64" placeholder="np. ${esc(first.qrCode)}"><p id="qr-error" class="field-error" role="alert"></p><button class="secondary-button" id="manual-collection-document">Pokaż właściwy skan CMR</button><p class="small-note">Odczyt QR otworzy podgląd. CMR zostanie przejęty dopiero po zatwierdzeniu.</p>`:`<p>Wszystkie oczekiwane dokumenty zostały już przejęte.</p>`;
  }
  if(type==='collection-reference'){
    const group=collectionGroup(target.sourceId),order=collectionModel.referenceFor(group,collectionOrders,target.itemId);
    const canReport=group===collectionGroup()&&!group.envelope.sealCode&&!group.documents.some(document=>document.handoverId===order.id)&&!collectionMissingOrders(group).some(item=>item.id===order.id);
    title='Znajdź papierowy oryginał CMR';
    body=`<p>Dokument od: <strong>${esc(collectionSource(group.sourceId).name)}</strong>. Porównajcie ten skan z dokumentami w innych koszulkach.</p>${collectionSearchPreview(order)}<button class="secondary-button" id="collection-reference-back">Wróć do listy dokumentów</button>${canReport?`<button class="collection-report-missing" id="collection-reference-missing">${icon('warning')}Nie ma oryginału · zgłoś brak</button>`:''}`;
  }
  if(type==='collection-missing'){
    const group=collectionGroup(),remaining=availableCollectionOrders(group);
    title='Którego dokumentu brakuje?';
    body=`<p>Przekazujący: <strong>${esc(collectionSource(group.sourceId).name)}</strong>. Najpierw otwórz skan i sprawdźcie inne koszulki. Zaznacz tylko CMR, których oryginałów nadal nie ma.</p><div class="collection-missing-choices">${remaining.map(order=>`<section><label><input type="checkbox" data-missing-cmr="${esc(order.id)}" ${target?.itemId===order.id?'checked':''}><span><strong>${esc(order.orderId)}</strong><small>Plomba ${esc(order.qrCode)}</small></span></label><details class="collection-missing-preview" ${remaining.length===1||target?.itemId===order.id?'open':''}><summary>Pokaż skan CMR · sprawdź inne koszulki</summary>${collectionSearchPreview(order)}</details></section>`).join('')}</div><label class="check-row collection-shortage-confirm"><input type="checkbox" id="collection-shortage-checked"><span>Sprawdziliśmy też inne koszulki. Zaznaczonych oryginałów nie ma — nie przejmuję ich.</span></label><p class="collection-missing-consequence">Do koperty trafi wyłącznie ${group.documents.length} odebranych CMR. Brakujące pozycje pozostaną do wyjaśnienia przy przekazującym.</p><p id="collection-missing-error" class="field-error" role="alert"></p><button class="primary-button" id="collection-save-shortage">Zgłoś brak zaznaczonych CMR</button><p class="small-note">Podgląd zapisze brak lokalnie. Spedytor nie otrzyma teraz zgłoszenia.</p>`;
  }
  if(type==='scan'){
    const collectionEnvelope=target.kind==='collection-envelope',cmr=['cmr','cmr-return'].includes(target.kind),piece=collectionEnvelope||cmr?null:current().items[target.index];
    const expected=collectionEnvelope?null:target.kind==='cmr-return'?current().cmrSeal:cmr?current().expectedCmrSeal:piece.expectedSeal;
    title=collectionEnvelope?'Plomba koperty':cmr?'Plomba CMR':`Plomba · sztuka ${target.index+1}`;
    const scanInstruction=target.kind==='cmr-return'?`Po rozładunku weź z powrotem CMR z plombą ${esc(current().cmrSeal)}. Dokument z tą plombą zostaje u Ciebie. Zeskanuj ponownie jego QR, zanim odjedziesz.`:collectionEnvelope?`Weź dowolną nieużytą plombę, naklej ją na zamknięcie koperty kierowcy ${esc(collectionSource(collectionGroup().sourceId).name)}, a następnie zeskanuj jej QR. Odczytany numer zostanie teraz przypisany do tej koperty.`:isLoad()?(cmr?'Zeskanuj kod QR z etykiety naklejonej na pustym tyle ostatniej strony CMR.':`Skieruj aparat na etykietę fizycznie przyklejoną do opakowania sztuki „${esc(piece.name)}”.`):(cmr?`Zeskanuj plombę znajdującą się na tyle dokumentu CMR. ${expected?`Oczekiwany numer z załadunku: ${esc(expected)}.`:liveMode()?'Super Spedytor sprawdzi zgodność po skanie.':'Oczekiwany numer z załadunku: nie zapisano.'}`:`Zeskanuj istniejącą plombę sztuki „${esc(piece.name)}”. ${expected?`Oczekiwany numer z załadunku: ${esc(expected)}.`:liveMode()?'Super Spedytor sprawdzi zgodność po skanie.':'Oczekiwany numer z załadunku: nie zapisano.'}`);
    const placeholder=liveMode()?'np. AMG-0003963':collectionEnvelope?'np. PL-ENV-000123':expected||(cmr?'DEMO-PL-CMR':`DEMO-PL-${String(target.index+1).padStart(2,'0')}`);
    const scanVisual=collectionEnvelope?`<div class="scan-camera collection-envelope-camera"><div class="collection-envelope-visual" role="img" aria-label="Koperta z plombą QR w wizjerze skanera"><span>${icon('envelope')}</span><i>${icon('qr')}</i></div><span class="scan-guide"></span><span class="demo-watermark">Ustaw QR plomby koperty w ramce</span></div>`:`<div class="scan-camera"><span class="scan-guide">${icon('qr')}</span><span class="demo-watermark">${liveMode()?'Skaner otworzy się w osobnym oknie':'Podgląd skanera — odczyt symulowany'}</span></div>`;
    const scanAction=liveMode()&&!collectionEnvelope?`<button class="primary-button" id="live-scan-code">${icon('qr')}Skanuj QR aparatem</button>`:`<button class="primary-button" id="simulate-scan">${icon('qr')}${collectionEnvelope?'Symuluj odczyt QR plomby':'Symuluj odczyt QR'}</button>`;
    body=`<p>${scanInstruction}</p>${scanVisual}${collectionEnvelope?`<div class="collection-scan-owner"><strong>${esc(collectionSource(collectionGroup().sourceId).name)}</strong><span>${collectionGroup().documents.length} CMR · plomba jeszcze nieprzypisana</span></div>`:''}${scanAction}<label for="qr-code" class="field-label">Lub wpisz kod z etykiety</label><input id="qr-code" class="text-input" autocomplete="off" maxlength="64" placeholder="${esc(placeholder)}"><p id="qr-error" class="field-error" role="alert"></p><button class="secondary-button" id="manual-scan">Zatwierdź kod</button>`;
  }
  if(type==='supplied'){
    const photo=optional().photos[target];
    title=photo.name;
    body=`<img class="supplied-full-photo" src="${photo.url}" alt="${esc(photo.name)}"><p>Materiał pomocniczy od zleceniodawcy. Nie zastępuje zdjęć wykonywanych przez kierowcę dla każdej sztuki.</p>${photo.demo?'<p class="small-note">Zdjęcie demonstracyjne do podglądu opcjonalnej sekcji.</p>':''}`;
  }
  if(type==='copy'){title='Numer referencyjny';body=`<input class="text-input" value="${esc(optional().ref)}" readonly aria-label="Numer referencyjny">`;}
  if(type==='cwp-contact'){
    title='Zgłoś rozbieżność spedytorowi';
    body=`<p>Towar lub jego liczba nie zgadza się ze zleceniem ${esc(cargoOrderId())}. Wybierz sposób kontaktu ze spedytorem.</p><div class="cwp-contact-options"><button id="cwp-chat">${icon('chat')}<span><strong>Napisz na czacie</strong><small>Otwórz czat tego zlecenia</small></span>${icon('arrow')}</button><a href="tel:${dispatcher.phone.replace(/[^+0-9]/g,'')}" aria-label="Zadzwoń do spedytora testowego">${icon('phone')}<span><strong>Zadzwoń do spedytora</strong><small>${esc(dispatcher.phone)}${dispatcher.demo?' · numer demonstracyjny':''}</small></span>${icon('arrow')}</a></div><p class="small-note">Prototyp: czat i numer telefonu są demonstracyjne.</p>`;
  }
  if(type==='help'){
    title='Pomoc przy zleceniu';
    body=`<p>${esc(cargoOrderId())} · ${esc(currentPlace().company)}</p><div class="help-options"><button id="help-chat">${icon('chat')}Otwórz czat ze spedytorem</button>${optional().contact?.phone?`<a class="help-contact-link" href="tel:${optional().contact.phone.replace(/[^+0-9]/g,'')}">${icon('phone')}Kontakt na miejscu: ${esc(optional().contact.name)}</a>`:''}</div>`;
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
    body=`<p>Wykonaj tę samą kontrolę co przy przekazaniu auta: kabina, paka i winda, obejście zewnętrzne. Wpisz przebieg i paliwo, dodaj każde wymagane zdjęcie oraz oceń całe wyposażenie. Inwentaryzację potwierdza kierowca ją sporządzający.</p><p>Brak wyposażenia potwierdzasz samym wyborem. Uszkodzenie wymaga zdjęcia ogólnego, zbliżenia i opisu.</p><div class="help-options"><button id="help-inventory-chat">${icon('chat')}Otwórz czat ze spedytorem</button></div><p class="small-note">Dane i zapis w podglądzie są demonstracyjne.</p>`;
  }
  if(type==='handover-help'){
    title='Pomoc · przekazanie auta';
    body=`<p>Postępuj w kolejności z Super Spedytora: dane i karty paliwowe, komplet zdjęć auta, wyposażenie po miejscach, potwierdzenie odbiorcy. Każde uszkodzenie wymaga ujęcia ogólnego, zbliżenia i opisu.</p><div class="help-options"><button id="help-handover-chat">${icon('chat')}Otwórz czat ze spedytorem</button></div><p class="small-note">Nie fotografuj kodów PIN. Sam lokalny zapis nie zmienia przypisania — zakończenie wymaga readbacku TMS z nowym kierowcą pojazdu.</p>`;
  }
  if(type==='daily-service'){
    const evening=new Date().getHours()>=15,draft=readServiceDailyRecord()?.draft;
    const step=serviceWizardModel.stepIndex(draft?.step);
    title=draft?'Dokończ ankietę serwisową':'Dzisiejsza ankieta serwisowa';
    body='<div class="service-reminder"><span class="service-reminder-icon">'+icon('bell')+'</span><strong>'+(draft?'Wróć dokładnie tam, gdzie skończyłeś':'Pięć kroków. Jedna kontrola.')+'</strong><p>'+(draft?'Twoje odpowiedzi i zdjęcia są zachowane. Do dokończenia: <b>krok '+(step+1)+' z 5 — '+esc(serviceWizardModel.titles[serviceWizardModel.steps[step]])+'</b>.':'Sprawdź komunikaty, poziom oleju, AdBlue, dystans do przeglądu i DPF. Poprowadzimy Cię ekran po ekranie.')+'</p><div class="service-reminder-time">'+icon('clock')+'<span><b>'+(draft?'Postęp czeka na Ciebie':evening?'Dobry moment: po trasie':'Dobry moment: przed trasą')+'</b><small>'+(draft?'Ankieta pozostanie do dokończenia aż do ostatniego zapisu.':'Możesz przerwać i wrócić do tego samego kroku.')+'</small></span></div><button class="primary-button service-reminder-primary" id="service-reminder-now">'+icon('service')+(draft?'Wznów ankietę · '+(step+1)+'/5':'Wypełnij teraz')+'</button><button class="secondary-button service-reminder-secondary" id="service-reminder-later">'+icon('clock')+(evening?'Przypomnij za godzinę':'Przypomnij wieczorem')+'</button><button class="service-reminder-skip" id="service-reminder-close">Dokończę później</button></div>';
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

  if(productionScope&&['help','live-help','route-help','cwp-contact'].includes(type)){
    title='Pomoc · Super Spedytor';
    body='<p>Operacja pokazuje Twoją trasę z Super Spedytora. Mapa otwiera lokalizację, a Nawiguj rozpoczyna prowadzenie. Rozpoczęcie i zakończenie punktu, plomby, zdjęcia oraz dokumenty zapisują się w systemie.</p><p>W skanerze CMR sprawdź wszystkie strony, rogi, kolor, podpisy i pieczątki przed zatwierdzeniem PDF. Zadania zamkniętych CMR znajdziesz przy swojej trasie.</p><p>W razie problemu z operacją skontaktuj się ze swoim spedytorem przez ustalony kanał firmowy.</p>';
  }
  if(['help','live-help','route-help'].includes(type))body+=privacyPolicyLink();
  $('#modal-root').innerHTML=`<div class="modal-overlay"><section class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1"><div class="modal-handle"></div><div class="modal-title"><h3 id="modal-title">${title}</h3><button class="icon-button" id="close-modal" aria-label="Zamknij">${icon('close')}</button></div>${body}</section></div>`;
  $('#close-modal').onclick=()=>closeModal();
  if(type==='operation-status')bindOperationTimer();
  if($('#collection-missing-from-scan'))$('#collection-missing-from-scan').onclick=()=>openModal('collection-missing');
  if($('#collection-reference-back'))$('#collection-reference-back').onclick=()=>closeModal();
  if($('#collection-reference-missing'))$('#collection-reference-missing').onclick=()=>openModal('collection-missing',{itemId:target.itemId});
  if($('#collection-save-shortage'))$('#collection-save-shortage').onclick=()=>{
    const ids=$$('[data-missing-cmr]:checked').map(input=>input.dataset.missingCmr);
    if(!$('#collection-shortage-checked').checked){$('#collection-missing-error').textContent='Potwierdź, że wspólnie sprawdziliście brakujące oryginały.';return;}
    try{collectionModel.reportMissing(collectionGroup(),collectionOrders,ids,new Date().toISOString());}
    catch(error){$('#collection-missing-error').textContent=error.message;return;}
    closeModal(false);render();$('#app-scroll').scrollTop=0;toast('Brak odnotowany. Do koperty trafią tylko odebrane dokumenty.');
  };
  if($('#open-cmr-scanner'))$('#open-cmr-scanner').onclick=()=>openCmrScanner(target);
  if(['scan','collection-scan','transshipment-scan'].includes(type)&&typeof driverBridge?.scanQr==='function'){
    const camera=$('.scan-camera');
    if(camera){
      const button=document.createElement('button');button.type='button';button.className='primary-button scanner-qr-button';button.innerHTML=`${icon('qr')}Odczytaj QR aparatem`;
      camera.replaceWith(button);
      const modal=state.modal;
      button.onclick=()=>{
        button.disabled=true;
        try{
          window.SuperSpedytorScanner.scanQr(value=>{
            if(state.modal!==modal)return;
            button.disabled=false;
            // Decoding only: existing validation and explicit CMR acceptance still apply.
            if(type==='transshipment-scan')saveTransshipmentSeal(target,value);else saveQR(target,value);
          },message=>{if(state.modal!==modal)return;button.disabled=false;$('#qr-error').textContent=message;});
        }catch{button.disabled=false;$('#qr-error').textContent='Nie udało się uruchomić aparatu. Spróbuj ponownie lub wpisz numer plomby.';}
      };
    }
  }
  $$('[data-designed-view]').forEach(button=>button.onclick=()=>showDesignedView(button.dataset.designedView));
  if($('#help-test-views'))$('#help-test-views').onclick=()=>openModal('designed-views',{});
  $('.modal-overlay').onclick=event=>{if(event.target.classList.contains('modal-overlay'))closeModal();};
  if($('#fuel-break-start'))$('#fuel-break-start').onclick=()=>finishFuelingWithBreakDecision(target.recommendation,'STARTED');
  if($('#fuel-break-continue'))$('#fuel-break-continue').onclick=()=>finishFuelingWithBreakDecision(target.recommendation,'CONTINUE');
  if($('#fuel-break-check'))$('#fuel-break-check').onclick=()=>finishFuelingWithBreakDecision(target.recommendation,'CHECK_TACHOGRAPH');
  $$('[data-attachment-kind]').forEach(button=>button.onclick=()=>openModal('attachment',{kind:button.dataset.attachmentKind,pieceIndex:button.dataset.attachmentPiece!==undefined?Number(button.dataset.attachmentPiece):undefined,source:'chat'}));
  if($('#save-piece'))$('#save-piece').onclick=()=>savePiece(target.index);
  if($('#live-scan-code'))$('#live-scan-code').onclick=async()=>{
    const button=$('#live-scan-code');button.disabled=true;
    try{
      const scan=await nativeScanCode();
      if(!$('#qr-code'))return;
      if(scan?.status==='ok'&&scan.code){$('#qr-code').value=scan.code;liveScanManual=false;saveQR(target,scan.code);}
      else if(scan?.status==='error')$('#qr-error').textContent=scan.message||'Skaner nie odczytał kodu.';
    }catch{if($('#qr-error'))$('#qr-error').textContent='Skaner jest niedostępny. Wpisz numer plomby ręcznie.';}
    finally{if(button.isConnected)button.disabled=false;}
  };
  if($('#choose-file'))$('#choose-file').onclick=()=>{
    if(liveMode()){liveAttach(target);return;}
    uploadTarget=target.routeStop?{...target}:{operation:state.operation,...target};
    const input=$('#file-input');
    input.value='';
    input.multiple=target.kind==='cmr';
    input.accept=target.kind==='cmr'?'image/*,application/pdf':'image/*';
    if(target.kind==='cmr')input.removeAttribute('capture');else input.setAttribute('capture','environment');
    input.click();
  };
  if($('#use-demo'))$('#use-demo').onclick=()=>{
    if(target.routeStop==='transshipment'){saveTransferredPhoto(target,{hash:`transfer-${target.pieceId}-${target.side}`,demo:true,mime:'image/svg+xml',url:demoPhoto(target.side==='near'?0:1),source:'transshipment',name:'Zdjęcie po przeładunku'});return;}
    if(target.handover){
      const protocol=inspectionProtocol(target.inspectionMode);
      if(target.photoKind==='vehicle'){
        const requirement=handoverPhotoRequirement(target.key),previous=protocol.vehiclePhotos[target.key];
        revoke(previous);
        protocol.vehiclePhotos[target.key]={hash:`demo-handover-vehicle-${target.key}`,demo:true,kind:'handover-vehicle-photo',name:`${target.inspectionMode==='inventory'?'Inwentaryzacja':'Przekazanie'} · ${requirement.name}`,mime:'image/svg+xml',url:demoPhoto(['odometer','front','rear','driverCab'].includes(target.key)?0:1),source:target.inspectionMode==='inventory'?'vehicle-inventory':'vehicle-handover'};
      }else{
        const item=handoverEquipmentItem(target.key),previous=protocol.issuePhotos[target.key]?.[target.shot];
        revoke(previous);
        protocol.issuePhotos[target.key]??={};
        protocol.issuePhotos[target.key][target.shot]={hash:`demo-handover-issue-${target.key}-${target.shot}`,demo:true,kind:`handover-issue-${target.shot}`,name:`${target.shot==='wide'?'Ujęcie ogólne':'Zbliżenie'} · ${item.name}`,mime:'image/svg+xml',url:demoPhoto(target.shot==='wide'?0:1),source:target.inspectionMode==='inventory'?'vehicle-inventory':'vehicle-handover'};
      }
      markVehicleHandoverEdited(protocol,target.inspectionMode);
      protocol[inspectionConfirmationKey(target.inspectionMode)]=false;
      closeModal(false);
      render();
      toast(target.photoKind==='vehicle'?'Zdjęcie pojazdu dodano do protokołu.':'Zdjęcie uszkodzenia dodano do protokołu.');
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
      state.routeStops.fueling.photos[target.key]={hash:`demo-fuel-${target.key}`,demo:true,kind:'fuel-photo',name:fuelPhotoLabels[target.key][1],mime:'image/svg+xml',url:demoPhoto(target.key==='receipt'||target.key==='adBlueReceipt'?0:1),source:'fuel-operation'};
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
    if(added&&target.kind==='cmr')focusNextAction('.document-page:last-of-type','center');
    else if(added&&target.kind==='photo-near')focusNextAction(`[data-piece-photo="${target.pieceIndex}"][data-photo-side="far"]`,'center');
    if(added)toast(target.kind==='cmr'?'CMR uzupełniony w dokumentacji i czacie.':'Zdjęcie sztuki uzupełnione w dokumentacji i czacie.');
  };
  if($('#simulate-collection-document'))$('#simulate-collection-document').onclick=()=>saveQR(target,target.demoQrCode||'');
  if($('#manual-collection-document'))$('#manual-collection-document').onclick=()=>saveQR(target,$('#collection-document-qr').value);
  if($('#collection-document-qr'))$('#collection-document-qr').onkeydown=event=>{if(event.key==='Enter')saveQR(target,event.target.value);};
  if($('#simulate-transshipment-scan'))$('#simulate-transshipment-scan').onclick=()=>saveTransshipmentSeal(target,target.expected||'');
  if($('#manual-transshipment-scan'))$('#manual-transshipment-scan').onclick=()=>saveTransshipmentSeal(target,$('#transshipment-qr-code').value);
  if($('#transshipment-qr-code'))$('#transshipment-qr-code').onkeydown=event=>{if(event.key==='Enter')saveTransshipmentSeal(target,event.target.value);};
  if($('#simulate-scan'))$('#simulate-scan').onclick=()=>{
    const collectionEnvelope=target.kind==='collection-envelope';
    const sealSuffix=collectionEnvelope&&collectionGroup()?.sourceId?.endsWith('-b')?'B':'A';
    const fallback=collectionEnvelope?`DEMO-SEAL-${sealSuffix}-001`:['cmr','cmr-return'].includes(target.kind)?'DEMO-PL-CMR':`DEMO-PL-${String(target.index+1).padStart(2,'0')}`;
    const expected=collectionEnvelope?null:target.kind==='cmr-return'?current().cmrSeal:target.kind==='cmr'?current().expectedCmrSeal:current().items[target.index]?.expectedSeal;
    saveQR(target,(collectionEnvelope||!isLoad())&&expected||fallback);
  };
  if($('#manual-scan'))$('#manual-scan').onclick=()=>{liveScanManual=true;saveQR(target,$('#qr-code').value);};
  if($('#qr-code'))$('#qr-code').onkeydown=event=>{if(event.key==='Enter'){liveScanManual=true;saveQR(target,event.target.value);}};
  if($('#cwp-chat'))$('#cwp-chat').onclick=()=>go('chat');
  if($('#help-chat'))$('#help-chat').onclick=()=>go('chat');
  if($('#help-stop-chat'))$('#help-stop-chat').onclick=()=>goStop('chat');
  if($('#help-service-chat'))$('#help-service-chat').onclick=()=>{closeModal(false);state.serviceOpen=false;state.routeStop?goStop('chat'):go('chat');};
  if($('#help-inventory-chat'))$('#help-inventory-chat').onclick=()=>{closeModal(false);state.serviceOpen=false;state.routeStop?goStop('chat'):go('chat');};
  if($('#help-handover-chat'))$('#help-handover-chat').onclick=()=>{closeModal(false);state.serviceOpen=false;state.routeStop?goStop('chat'):go('chat');};
  if($('#service-reminder-now'))$('#service-reminder-now').onclick=()=>openService('survey');
  if($('#service-reminder-later'))$('#service-reminder-later').onclick=()=>{const when=postponeServiceReminder();closeModal(false);updateServiceNavIndicator();toast(`Przypomnimy ${when}.`);};
  if($('#service-reminder-close'))$('#service-reminder-close').onclick=()=>{
    if(readServiceDailyRecord()?.draft)writeServiceDailyRecord({snoozeUntil:new Date(Date.now()+15*60*1000).toISOString()});
    closeModal();updateServiceNavIndicator();scheduleServiceReminder();
  };
  if($('#confirm-finish'))$('#confirm-finish').onclick=()=>{if(!finishReady())return;if(liveMode()){liveFinish();return;}finishOperationTimer();current().finished=true;go('success');};
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
  record.chatSynced=record.syncState==='queued'?false:record.source!=='chat';
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

function openCmrScanner(target){
  const operationName=state.operation,operation=state.operations[operationName],seal=operation.cmrSeal;
  closeModal(false);
  window.SuperSpedytorScanner.open({onAccept:pages=>{
    if(state.operation!==operationName||state.routeStop||state.serviceOpen||state.operations[operationName]!==operation||operation.cmrSeal!==seal){
      toast('Zlecenie lub plomba się zmieniły. Otwórz skaner ponownie dla właściwego CMR.');
      return false;
    }
    let added=0;
    for(const page of pages){
      const record={...page,kind:'cmr',demo:false,source:target.source||'step'};
      // Pixel samples are transient. Retain the full file and review evidence.
      delete record.metrics;delete record.checks;delete record.quality;
      if(addEvidence(operationName,record))added++;
    }
    render();
    if(added)focusNextAction('.document-panel .document-page:last-of-type','center');
    if(added)toast(`Dodano ${added} ${added===1?'sprawdzony skan':'sprawdzone strony'} CMR w lokalnym teście.`);
    return true;
  }});
}

function saveTransferredPhoto(target,record){
  if(transshipmentPreviewRole!=='receiver'||transshipmentOrder()?.id!==target.orderId){revoke(record);toast('Zlecenie się zmieniło. Otwórz zdjęcie ponownie.');return;}
  const piece=transshipmentPiece(),previous=piece?.photos[target.side];
  const result=transshipmentModel.savePiecePhoto(transshipment(),target.pieceId,target.side,record);
  if(!result.ok){revoke(record);return;}revoke(previous);closeModal(false);render();focusTransshipmentAction();toast('Nowe zdjęcie przypisano do sztuki i jej CMR.');
}
function showTransferredUnload(orderId){
  const order=state.routeStops.transshipment.orders.find(item=>item.id===orderId);
  if(!transshipmentModel.orderComplete(order))return;
  const previous=state.operations.unload;
  previous.items.forEach(revokePiece);previous.documents.forEach(revoke);
  const pieces=order.pieces.map((piece,index)=>makePiece(index+1,{name:piece.name,description:piece.description,mass:null,dimensions:piece.dimensions||null,expectedSeal:piece.scannedCode,loadingPhotos:{near:piece.photos.near,far:piece.photos.far}}));
  state.operations.unload=fresh('unload',pieces,{expectedCmrSeal:order.cmr.scannedCode,loadingDocuments:Array.from({length:order.cmr.pages},(_,page)=>({url:order.cmr.scanPages?order.cmr.scanPages[page]?.url:transshipmentDemoCmrPage(order,page),mime:'image/svg+xml',kind:'cmr',source:'transshipment',orderId:order.id,name:`CMR ${order.id} · strona ${page+1}`}))});
  const country=order.unload.city.startsWith('PL-')?'PL':'DE';
  Object.assign(state.operations.unload,{orderId:order.id,cargoMass:order.massKg,sourcePlace:{company:order.sourceDriver.name,address:order.sourceDriver.vehicle,countryName:'Przeładunek'},place:{company:order.unload.company,address:order.unload.city,country,countryName:country==='PL'?'Polska':'Niemcy'}});
  switchOperation('unload','travel');
}

function saveTransshipmentSeal(target,raw){
  const code=String(raw||'').trim().toUpperCase();
  if(!/^[A-Z0-9][A-Z0-9._/-]{3,63}$/.test(code)){$('#qr-error').textContent='Wpisz numer plomby: minimum 4 znaki, bez spacji.';return;}
  const order=transshipmentOrder();
  if(!order||order.id!==target.orderId||target.role!==transshipmentPreviewRole){$('#qr-error').textContent='Bieżące zlecenie zmieniło się. Zamknij skaner i spróbuj ponownie.';return;}
  const result=target.kind==='outgoing-cmr'?transshipmentModel.scanIssuedCmr(transshipment(),code):target.kind==='outgoing-piece'?transshipmentModel.scanIssuedPiece(transshipment(),target.pieceId,code):target.kind==='cmr'?transshipmentModel.scanCmr(transshipment(),code):transshipmentModel.scanPiece(transshipment(),target.pieceId,code);
  if(!result.ok){
    const messages={
      CMR_SEAL_MISMATCH:`To nie jest plomba dokumentu tego zlecenia. Oczekiwany numer: ${result.expected}.`,
      CMR_NOT_ACCEPTED:'Najpierw odbierz i potwierdź dokument CMR.',
      CMR_NOT_ISSUED:'Najpierw zeskanuj i przekaż CMR tego zlecenia.',
      CMR_ALREADY_ISSUED:'Ten CMR został już wydany.',PIECE_ALREADY_ISSUED:'Ta sztuka została już wydana.',
      CARGO_SEAL_MISMATCH:`Numer nie pasuje do pokazanej sztuki. Oczekiwany numer: ${result.expected}.`,
      WRONG_PIECE_ORDER:'To plomba innej sztuki. Odbieraj ładunek w kolejności pokazanej na ekranie.',
      PIECE_ALREADY_RECEIVED:'Ta sztuka została już odebrana.',
      CMR_ALREADY_ACCEPTED:'Ten dokument został już odebrany.'
    };
    $('#qr-error').textContent=messages[result.reason]||'Nie udało się przypisać tej plomby do bieżącego kroku.';
    return;
  }
  closeModal(false);
  render();
  if(target.kind==='outgoing-cmr')toast('QR zgodny. Sprawdź CMR i potwierdź wydanie.');
  else if(target.kind==='outgoing-piece')toast('QR sztuki zgodny. Potwierdź jej fizyczne wydanie.');
  else if(target.kind==='cmr')toast('Plomba zgodna. Sprawdź wyświetlony skan i potwierdź odbiór CMR.');
  else toast('Plomba zgodna. Przeładuj sztukę i zrób dwa nowe zdjęcia.');
  focusTransshipmentAction();
}

function saveQR(target,raw){
  const code=raw.trim().toUpperCase();
  if(!/^[A-Z0-9][A-Z0-9._/-]{3,63}$/.test(code)){$('#qr-error').textContent='Wpisz kod z etykiety: minimum 4 znaki, bez spacji.';return;}
  if(target.kind==='collection-document'){
    const group=collectionGroup();
    const verdict=collectionModel.validateScan(group,collectionOrders,code);
    if(!verdict.ok){
      if(verdict.kind==='wrong_driver'){
        group.blockedDocument={...verdict.order};
        group.rejectedScans.push({code,sourceId:verdict.order.sourceId,reason:'WRONG_DRIVER',at:new Date().toISOString()});
        closeModal(false);render();$('#app-scroll').scrollTop=0;return;
      }
      const reasons={unknown:'Nie znaleziono dokumentu dla tego kodu QR.',no_driver:'Najpierw wybierz osobę, od której odbierasz dokumenty.',sealed:'Ta koperta jest już zamknięta. Nie można dodać dokumentu.',decision_pending:'Najpierw zakończ decyzję o wyświetlonym dokumencie.',duplicate:'Ten CMR został już przejęty. Nie dodamy go ponownie.'};
      $('#qr-error').textContent=reasons[verdict.kind];return;
    }
    const order=verdict.order;
    group.pendingDocument={id:`collection-document-${Date.now()}`,hash:`tms-scan-${order.id}`,demo:true,kind:'collection-cmr-reference',mime:'image/svg+xml',name:`CMR-${order.orderId}`,handoverId:order.id,sourceId:order.sourceId,orderId:order.orderId,qrCode:order.qrCode,unloadedAt:order.unloadedAt,scannedAt:new Date().toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'}),confirmed:false,acceptedAt:null};
    group.envelope.contentsConfirmed=false;
    closeModal(false);
    state.screen='photos';
    collection().screen='photos';
    render();
    focusNextAction('.collection-pending-preview','center');
    toast('Porównaj dokument i wybierz decyzję.');
    return;
  }
  if(target.kind==='collection-envelope'){
    const group=collectionGroup();
    if(target.sourceId!==group?.sourceId)return;
    if(!collectionDocumentsReady(group)||!group.envelope.contentsConfirmed||group.envelope.sealCode)return;
    const usedByAnother=collection().groups.some(item=>item.sourceId!==group.sourceId&&item.envelope.sealCode===code);
    if(usedByAnother){$('#qr-error').textContent='Ten numer plomby zamyka już kopertę innego kierowcy.';return;}
    group.envelope.sealCode=code;
    group.envelope.sealedAt=new Date().toISOString();
    closeModal(false);
    if(state.screen==='envelope-scan')goStop('review');else render();
    toast('Plomba została przypisana podczas skanowania. Koperta jest zamknięta.');
    return;
  }
  if(target.kind==='cmr-return'){
    if(code!==current().cmrSeal){$('#qr-error').textContent=`To inny dokument. Zeskanuj plombę ${current().cmrSeal}.`;return;}
    current().cmrReturnCode=code;current().cmrRetained=false;
    closeModal(false);render();toast('Plomba CMR zgodna. Potwierdź, że dokument zostaje u Ciebie.');return;
  }
  const used=[...current().items.map(item=>item.seal),current().cmrSeal];
  const ownIndex=target.kind==='cmr'?count():target.index;
  if(used.some((value,index)=>index!==ownIndex&&value===code)){$('#qr-error').textContent='Ten kod przypisano już do innej sztuki lub dokumentu. Każda plomba musi mieć unikalny QR.';return;}
  if(!isLoad()){
    const expected=target.kind==='cmr-return'?current().cmrSeal:target.kind==='cmr'?current().expectedCmrSeal:current().items[target.index]?.expectedSeal;
    if(expected&&code!==expected){$('#qr-error').textContent=`Kod nie pasuje do tej pozycji. Plomba z załadunku: ${expected}.`;return;}
  }
  if(liveMode()){liveAssign(target,code);return;}
  if(target.kind==='cmr'){current().cmrSeal=code;current().cmrReturnCode=null;current().cmrRetained=false;}else current().items[target.index].seal=code;
  closeModal(false);
  render();
  if(target.kind==='piece')focusNextAction(`[data-piece-photo="${target.index}"][data-photo-side="${isLoad()?'near':'unload'}"]`,'center');
  toast(target.kind==='cmr'?(isLoad()?'Plomba CMR została odczytana.':'Plomba CMR jest zgodna z załadunkiem.'):(isLoad()?'Plomba została przypisana do tej sztuki ładunku.':'Plomba sztuki jest zgodna z załadunkiem.'));
}

function reset(){
  cancelArrivalCountdown(false);
  Object.values(state.operations).forEach(operation=>{operation.items.forEach(revokePiece);operation.documents.forEach(revoke);});
  Object.values(state.routeStops).forEach(stop=>{if(stop.photos)Object.values(stop.photos).forEach(revoke);});
  collection().groups.forEach(group=>{group.documents.forEach(revoke);revoke(group.pendingDocument);});
  Object.values(state.serviceSurvey.photos).forEach(revoke);
  Object.values(state.inventoryProtocol.vehiclePhotos).forEach(revoke);
  Object.values(state.inventoryProtocol.issuePhotos).forEach(records=>Object.values(records).forEach(revoke));
  Object.values(state.vehicleHandover.vehiclePhotos).forEach(revoke);
  Object.values(state.vehicleHandover.issuePhotos).forEach(records=>Object.values(records).forEach(revoke));
  state.operations={load:fresh('load'),unload:fresh('unload')};
  state.routeStops={collection:freshDocumentCollection(),transshipment:freshTransshipment(),transshipmentOut:freshOutgoingTransshipment(),parking:freshRouteStop('parking'),fueling:freshRouteStop('fueling')};
  state.serviceSurvey=freshServiceSurvey();
  state.inventoryProtocol=freshInventoryProtocol();
  state.vehicleHandover=freshVehicleHandoverProtocol();
  Object.values(inspectionV2Controllers).forEach(controller=>controller?.reset());
  vehicleExchangeController?.reset();vehicleExchangeActive=false;normalHandoverRole='issue';
  clearServiceDailyRecord();
  state.serviceOpen=false;
  state.servicePanel='survey';
  state.serviceHistorySelectedId=null;
  state.operation='load';
  state.routeStop=null;
  state.scenario='basic';
  state.language='pl';
  state.manualLanguage=false;
  nativeReset();
  if(androidShell)state.operations.load.arrived=false;
  else{
    state.operations.load.arrived=true;
    beginOperationTimer(state.operations.load);
  }
  go(androidShell?'travel':'info');
  toast('Podgląd został zresetowany.');
}

async function readImage(url){return new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(true);image.onerror=()=>resolve(false);image.src=url;});}

function localUploadOwner(target){
  if(target.handover)return inspectionProtocol(target.inspectionMode);
  if(target.service)return state.serviceSurvey;
  if(target.routeStop==='transshipment')return transshipment();
  if(target.routeStop)return state.routeStops[target.routeStop];
  return state.operations[target.operation];
}

$('#file-input').onchange=async event=>{
  const files=[...event.target.files];
  if(!files.length||!uploadTarget||uploadBusy)return;
  if(liveMode()){toast('W aktywnej operacji użyj aparatu lub skanera aplikacji.');return;}
  uploadBusy=true;
  const target={...uploadTarget};
  const owner=localUploadOwner(target),workspace=backendTestWorkspace,liveRecord=liveOperation;
  const uploadIsCurrent=()=>backendTestWorkspace===workspace&&liveOperation===liveRecord&&localUploadOwner(target)===owner;
  let added=0;
  if(target.routeStop==='transshipment'){
    try{const file=files[0];if(!file.type.startsWith('image/')){toast('Wybierz zdjęcie JPG, PNG lub WebP.');return;}
      if(file.size>attachmentLimitBytes){toast('Wybierz zdjęcie do 100 MB.');return;}
      const url=URL.createObjectURL(file);if(!await readImage(url)){URL.revokeObjectURL(url);toast('Nie udało się odczytać formatu zdjęcia. Wybierz JPG, PNG lub WebP.');return;}
      if(!uploadIsCurrent()){URL.revokeObjectURL(url);return;}
      saveTransferredPhoto(target,{url,blob:file,mime:file.type,name:file.name,demo:false,source:'transshipment'});
    }catch{toast('Nie udało się dodać zdjęcia. Spróbuj ponownie.');}finally{uploadBusy=false;}return;
  }
  if(target.handover){
    try{
      const file=files[0];
      if(!file.type.startsWith('image/')){toast('Wybierz zdjęcie JPG, PNG lub WebP.');return;}
      if(file.size>attachmentLimitBytes){toast('Wybierz zdjęcie do 100 MB.');return;}
      const url=URL.createObjectURL(file);
      if(!await readImage(url)){URL.revokeObjectURL(url);toast('Nie udało się odczytać zdjęcia.');return;}
      if(!uploadIsCurrent()){URL.revokeObjectURL(url);return;}
      const protocol=inspectionProtocol(target.inspectionMode);
      if(target.photoKind==='vehicle'){
        const previous=protocol.vehiclePhotos[target.key];
        revoke(previous);
        protocol.vehiclePhotos[target.key]={hash:`handover-vehicle-${target.key}-${Date.now()}`,url,blob:file,name:file.name,mime:file.type,demo:false,kind:'handover-vehicle-photo',source:target.inspectionMode==='inventory'?'vehicle-inventory':'vehicle-handover'};
      }else{
        const previous=protocol.issuePhotos[target.key]?.[target.shot];
        revoke(previous);
        protocol.issuePhotos[target.key]??={};
        protocol.issuePhotos[target.key][target.shot]={hash:`handover-issue-${target.key}-${target.shot}-${Date.now()}`,url,blob:file,name:file.name,mime:file.type,demo:false,kind:`handover-issue-${target.shot}`,source:target.inspectionMode==='inventory'?'vehicle-inventory':'vehicle-handover'};
      }
      markVehicleHandoverEdited(protocol,target.inspectionMode);
      protocol[inspectionConfirmationKey(target.inspectionMode)]=false;
      closeModal(false);
      render();
      toast(target.photoKind==='vehicle'?'Zdjęcie pojazdu dodano do protokołu.':'Zdjęcie uszkodzenia dodano do protokołu.');
    }catch(error){toast('Nie udało się dodać zdjęcia. Spróbuj ponownie.');}
    finally{uploadBusy=false;}
    return;
  }
  if(target.service){
    try{
      const file=files[0];
      if(!file.type.startsWith('image/')){toast('Wybierz zdjęcie JPG, PNG lub WebP.');return;}
      if(file.size>attachmentLimitBytes){toast('Wybierz zdjęcie do 100 MB.');return;}
      const url=URL.createObjectURL(file);
      if(!await readImage(url)){URL.revokeObjectURL(url);toast('Nie udało się odczytać zdjęcia.');return;}
      if(!uploadIsCurrent()){URL.revokeObjectURL(url);return;}
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
      if(file.size>attachmentLimitBytes){toast('Wybierz zdjęcie do 100 MB.');return;}
      const url=URL.createObjectURL(file);
      if(!await readImage(url)){URL.revokeObjectURL(url);toast('Nie udało się odczytać zdjęcia.');return;}
      if(!uploadIsCurrent()){URL.revokeObjectURL(url);return;}
      const previous=state.routeStops.fueling.photos[target.key];
      revoke(previous);
      state.routeStops.fueling.photos[target.key]={hash:`fuel-${target.key}-${Date.now()}`,url,blob:file,name:file.name,mime:file.type,demo:false,kind:'fuel-photo',source:'fuel-operation'};
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
      if(file.size>attachmentLimitBytes){toast('Wybierz plik do 100 MB.');continue;}
      const bytes=await file.arrayBuffer();
      if(!uploadIsCurrent())return;
      if(pdf&&new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-'){toast('Plik PDF jest nieprawidłowy. Wybierz skan dokumentu.');continue;}
      const digest=await crypto.subtle.digest('SHA-256',bytes),hash=[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
      if(!uploadIsCurrent())return;
      const url=URL.createObjectURL(file);
      if(!pdf&&!await readImage(url)){URL.revokeObjectURL(url);toast('Nie udało się odczytać zdjęcia. Wybierz JPG, PNG lub WebP.');continue;}
      if(!uploadIsCurrent()){URL.revokeObjectURL(url);return;}
      const record={hash,url,name:file.name,mime:pdf?'application/pdf':file.type,demo:false,kind:target.kind,pieceIndex:target.pieceIndex,source:target.source};
      if(addEvidence(target.operation,record))added++;
    }
    if(!uploadIsCurrent())return;
    closeModal(false);
    render();
    if(added&&target.kind==='cmr')focusNextAction('.document-page:last-of-type','center');
    else if(added&&target.kind==='photo-near')focusNextAction(`[data-piece-photo="${target.pieceIndex}"][data-photo-side="far"]`,'center');
    if(added)toast(`Dodano ${added} ${added===1?'plik':'pliki'} do dokumentacji i czatu.`);
  }catch(error){toast('Nie udało się dodać pliku. Spróbuj ponownie.');}
  finally{uploadBusy=false;}
};

$$('[data-operation]').forEach(button=>button.onclick=()=>switchOperation(button.dataset.operation));
$$('[data-route-stop]').forEach(button=>button.onclick=()=>switchRouteStop(button.dataset.routeStop,['collection','transshipment'].includes(button.dataset.routeStop)?'info':'travel'));
$$('[data-service-preview]').forEach(button=>button.onclick=()=>openService(button.dataset.servicePreview));
$$('.screen-list [data-screen]').forEach(button=>button.onclick=()=>state.routeStop?goStop(button.dataset.screen):go(button.dataset.screen));
$('#scenario-select').onchange=event=>switchScenario(event.target.value);
$('#mobile-scenario').onchange=event=>switchScenario(event.target.value);
$$('[data-nav]').forEach(button=>button.onclick=event=>{
  if(button.dataset.nav==='tacho'&&openBackendReadOnlyTacho()){event?.stopImmediatePropagation();return;}
  if(typeof tachoReadonlyScreen!=='undefined'&&tachoReadonlyScreen?.isOpen()){
    closeBackendReadOnlyTacho(button.dataset.nav==='now');
    if(button.dataset.nav==='now'){event?.stopImmediatePropagation();return;}
  }
  if(productionScope&&!['now','help'].includes(button.dataset.nav)){event?.stopImmediatePropagation();return;}
  if(backendTestWorkspace)backendActiveNav=button.dataset.nav==='service'?'service':'now';
  if(backendMode&&!backendTestWorkspace&&backendState?.status==='connected'){
    event?.stopImmediatePropagation();
    if(button.dataset.nav==='chat'){showDesignedView('chat');return;}
    if(button.dataset.nav==='tacho'){showDesignedView('tacho');return;}
    if(button.dataset.nav==='help'){openModal('live-help',{});return;}
    if(button.dataset.nav==='service'&&typeof driverBridge?.backendServiceSurvey!=='function'){showDesignedView('history');return;}
    backendActiveNav=button.dataset.nav==='service'?'service':'now';
    if(backendActiveNav!=='service')state.serviceHistorySelectedId=null;
    state.serviceOpen=false;
    state.routeStop=null;
    render();
    return;
  }
  if(button.dataset.nav==='service'){openService();return;}
  if(state.serviceOpen){
    if(button.dataset.nav==='now')closeService();
    if(button.dataset.nav==='chat'){state.serviceOpen=false;state.routeStop?goStop('chat'):go('chat');}
    if(button.dataset.nav==='help')openModal(state.servicePanel==='inventory'?'inventory-help':state.servicePanel==='handover'?'handover-help':'service-help',{});
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
    const first=items[0],last=items[items.length-1],sheet=$('.modal-sheet');
    if(event.shiftKey&&(document.activeElement===first||document.activeElement===sheet)){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===sheet)){event.preventDefault();first?.focus();}
  }
});

let backendTestWorkspace=false;
let testingWorkspaceInitialized=false;
let backendRememberMe=browserBackend;
let backendState={status:'disconnected',message:'Zaloguj się kontem kierowcy Super Spedytora'};
// The native preflight runs before it publishes write.pending. Keep the UI
// isolated from test data throughout that asynchronous gap as well.
let backendPointActionPending=null;
let backendActiveNav='now';
let backendLastNearest=null;
let tachoReadonlyScreen=null;
const designedDriverViews=[
  {id:'scanner',title:'Skaner CMR',icon:'camera',description:'Obrys kartki na żywo, automatyczny skan i kolor'},
  {id:'load',title:'Załadunek',icon:'box',description:'Mapa, sztuki, plomby, zdjęcia i skan CMR'},
  {id:'unload',title:'Rozładunek',icon:'box',description:'Plomby z załadunku, zdjęcia i dokumenty'},
  {id:'collection',title:'Odbiór CMR od kierowców',icon:'doc',description:'Skan, porównanie dokumentu i osobne koperty'},
  {id:'cmr-transferor',title:'Przygotowanie własnych CMR',icon:'doc',description:'Dokumenty kierowcy przekazującego'},
  {id:'transshipment',title:'Przeładunek · odbieram',icon:'truck',description:'CMR, plomby i nowe zdjęcia od kilku kierowców'},
  {id:'transshipment-out',title:'Przeładunek · wydaję',icon:'truck',description:'Wydanie własnego ładunku i CMR innemu kierowcy'},
  {id:'vehicle-swap',title:'Zamiana aut między kierowcami',icon:'truck',description:'Każdy wydaje i odbiera auto · ładunki oraz CMR-y'},
  {id:'parking',title:'Parking',icon:'parking',description:'Dojazd, miejsce i wybór przerwy'},
  {id:'fueling',title:'Tankowanie',icon:'fuel',description:'Karta, zdjęcia, paragon i wydatek'},
  {id:'tacho',title:'Tacho',icon:'clock',description:'Czas jazdy, przerwy i odpoczynki'},
  {id:'chat',title:'Czat i załączniki',icon:'chat',description:'Wiadomości i dokumentacja operacji'},
  {id:'survey',title:'Ankieta serwisowa',icon:'service',description:'Odczyty, zdjęcia i zapis na telefonie'},
  {id:'history',title:'Rejestr serwisów — przykład',icon:'clipboard',description:'Wykonane ankiety, braki i kary −5 EUR'},
  {id:'inventory',title:'Inwentaryzacja',icon:'clipboard',description:'Wyposażenie, braki i uszkodzenia'},
  {id:'handover',title:'Przekazanie auta',icon:'truck',description:'Kabina, paka, zdjęcia i wyposażenie'},
  {id:'help',title:'Pomoc',icon:'help',description:'Instrukcje i kontakt w procesie'}
];
function updateDriverWorkspaceBar(){
  const bar=$('#driver-workspace-bar');
  if(!bar)return;
  bar.hidden=!backendMode||backendState?.status!=='connected'||!backendTestWorkspace;
  if(bar.hidden)return;
  const devConnection=backendState?.read_only===true&&backendState?.backend_environment==='dev';
  updateServiceNavIndicator();
  bar.classList.toggle('testing',backendTestWorkspace);
  bar.innerHTML=backendTestWorkspace
    ?`<div><strong>Test widoków · dane przykładowe</strong><small>${browserBackend?'Zmiany zostają na tym urządzeniu':'Zmiany zostają na telefonie'}${installedAppVersion?` · ${esc(installedAppVersion)}`:''}</small></div><button id="workspace-choose">Widoki</button><button id="workspace-live">${devConnection?'Wróć do danych DEV':'Wróć do SS'}</button>`
    :`<div><strong>${devConnection?'DEV · tylko odczyt':'Dane Super Spedytora'}</strong><small>${devConnection?'Profil, pojazd, trasa i historia ankiet':'Twoja trasa i historia ankiet'}${installedAppVersion?` · ${esc(installedAppVersion)}`:''}</small></div><button id="workspace-choose">${driverBridge?.liveWorkflowsEnabled?.()===true?'Moje sprawy':'Testuj widoki'}</button>`;
  $('#workspace-choose').onclick=()=>openModal('designed-views',{});
  if(productionScope){
    const note=bar.querySelector('small');
    if(note)note.textContent=`Trasa i dokumenty CMR${installedAppVersion?` · ${installedAppVersion}`:''}`;
  }
  if($('#workspace-live'))$('#workspace-live').onclick=leaveTestingWorkspace;
  const chip=$('.driver-chip');
  if(chip)chip.textContent=backendTestWorkspace?'TEST WIDOKÓW':devConnection?'DEV · tylko odczyt':'SUPER SPEDYTOR';
}
function enterTestingWorkspace(viewId,renderView=true){
  if(productionScope)return false;
  if(!backendMode||backendState?.status!=='connected')return false;
  if(liveBusy||liveOperation?.finishing||backendPointActionPending||backendState?.write?.status==='pending'||pendingRequests.size>0){toast('Poczekaj na zakończenie bieżącej operacji.');return false;}
  backendTestWorkspace=true;
  if(liveMode())exitLiveOperation();
  if(typeof cmrInventoryScreen!=='undefined'&&cmrInventoryScreen){cmrInventoryScreen.close();cmrInventoryScreen=null;}
  document.documentElement.classList.add('backend-testing');
  driverBridge?.backendTestingMode?.(true);
  $('.device')?.classList.remove('backend-operation-mode');
  state.manualLanguage=true;
  state.language='pl';
  state.serviceOpen=false;
  closeModal(false);
  cancelArrivalCountdown(false);
  updateDriverWorkspaceBar();
  if(!testingWorkspaceInitialized){
    testingWorkspaceInitialized=true;
    initializeServiceSurveyStorage().catch(()=>scheduleServiceSurveyExpiry());
    const ticker=setInterval(()=>{if(backendTestWorkspace)updateOperationTimerDom();},1000);
    window.addEventListener('beforeunload',()=>clearInterval(ticker),{once:true});
  }
  if(renderView)render();
  return true;
}
function leaveTestingWorkspace(){
  window.SuperSpedytorTacho?.close?.();
  closeModal(false);
  cancelArrivalCountdown(false);
  backendTestWorkspace=false;
  document.documentElement.classList.remove('backend-testing');
  driverBridge?.backendTestingMode?.(false);
  backendActiveNav='now';
  state.serviceOpen=false;
  state.routeStop=null;
  render();
}
function showDesignedView(viewId){
  if(productionScope)return;
  if(!designedDriverViews.some(view=>view.id===viewId))return;
  backendActiveNav=viewId==='tacho'?'tacho':'now';
  window.SuperSpedytorTacho?.close?.();
  if(backendMode&&!enterTestingWorkspace(viewId,false))return;
  if(viewId==='scanner'){
    state.routeStop=null;
    state.serviceOpen=false;
    switchOperation('load','travel');
    openCmrScanner({source:'step'});
    return;
  }
  if(viewId==='tacho'){window.SuperSpedytorTacho?.open?.();return;}
  if(viewId==='vehicle-swap'){openVehicleExchange();return;}
  if(['survey','history','inventory','handover'].includes(viewId)){if(viewId==='handover')vehicleExchangeActive=false;openService(viewId);return;}
  if(['collection','cmr-transferor'].includes(viewId)){
    collectionPreviewRole=viewId==='cmr-transferor'?'transferor':'receiver';
    collection().role=collectionPreviewRole;
    switchRouteStop('collection','info');return;
  }
  if(['transshipment','transshipment-out'].includes(viewId)){transshipmentPreviewRole=viewId==='transshipment-out'?'transferor':'receiver';switchRouteStop('transshipment','info');return;}
  if(['parking','fueling'].includes(viewId)){
    switchRouteStop(viewId,viewId==='transshipment'?'info':'travel');return;
  }
  state.routeStop=null;
  if(viewId==='chat'){go('chat');return;}
  switchOperation(viewId==='unload'?'unload':'load','travel');
  if(viewId==='help')openModal('help',{});
}
const backendCountryName=code=>({PL:'Polska',DE:'Niemcy',FR:'Francja',NL:'Holandia',BE:'Belgia',IT:'Włochy',ES:'Hiszpania',CZ:'Czechy',SK:'Słowacja',AT:'Austria',DK:'Dania',SE:'Szwecja'}[String(code||'').toUpperCase()]||code||'');
const backendPointPlace=point=>{
  const location=point?.location_details||{};
  const country=point?.country||location.country||'';
  return {
    company:point?.location_name||location.label||point?.operation_type_display||'Punkt trasy',
    address:point?.location_address||location.full_address||'',
    country,
    countryName:backendCountryName(country),
    latitude:point?.latitude??location.latitude,
    longitude:point?.longitude??location.longitude
  };
};
const backendClock=value=>{
  if(!has(value))return '';
  const date=new Date(value);
  if(!Number.isNaN(date.getTime()))return date.toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'});
  const match=String(value).match(/(?:T|\s)(\d{2}:\d{2})|^(\d{1,2}:\d{2})/);
  return match?.[1]||match?.[2]||String(value);
};
const backendCargoText=point=>{
  const orderCargo=point?.order_cargo;
  if(orderCargo)return [orderCargo.description,has(orderCargo.cargo_weight)?`${orderCargo.cargo_weight} kg`:null,has(orderCargo.ldm)?`${orderCargo.ldm} LDM`:null].filter(has).join(' · ');
  const direct=[point?.cargo_summary,point?.cargo_description,point?.goods_description,point?.goods_name].find(has);
  if(has(direct))return String(direct);
  const cargo=point?.cargo;
  if(typeof cargo==='string'&&has(cargo))return cargo;
  if(cargo&&typeof cargo==='object')return [cargo.name,cargo.quantity,cargo.weight].filter(has).join(' · ');
  return '';
};
const backendPointKey=point=>{
  if(has(point?.id))return `id:${point.id}`;
  return [point?.sequence,point?.operation_type,point?.location_name,point?.planned_at||point?.time_window_start]
    .map(value=>String(value||''))
    .join('|');
};
const backendPointTerminal=point=>{
  const status=String(point?.status||'').toLowerCase();
  return ['completed','complete','done','finished','skipped'].includes(status);
};
const backendPointOrder=point=>{
  const sequence=Number(point?.sequence);
  if(Number.isFinite(sequence))return sequence;
  const time=Date.parse(point?.planned_at||point?.live_eta_datetime||point?.eta_datetime||point?.time_window_start||'');
  return Number.isNaN(time)?Number.MAX_SAFE_INTEGER:time;
};
const backendOperationPlan=route=>{
  const apiOperations=Array.isArray(route?.operations)?route.operations:null;
  const candidates=apiOperations?[...apiOperations]:[route?.current_point,route?.next_point];
  if(!apiOperations)['upcoming_points','future_points','points'].forEach(key=>{
    if(Array.isArray(route?.[key]))candidates.push(...route[key]);
  });
  const seen=new Set();
  const operations=candidates.filter(point=>{
    if(!point||typeof point!=='object')return false;
    const key=backendPointKey(point);
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  }).sort((left,right)=>backendPointOrder(left)-backendPointOrder(right));
  const nearest=operations.find(point=>String(point?.status||'').toLowerCase()==='in_progress')
    ||operations.find(point=>!backendPointTerminal(point))
    ||(!apiOperations?(route?.current_point||route?.next_point):null);
  const nearestKey=nearest?backendPointKey(nearest):'';
  const upcoming=operations.filter(point=>!backendPointTerminal(point)&&backendPointKey(point)!==nearestKey);
  const history=operations.filter(backendPointTerminal);
  return {nearest,upcoming,history,source:apiOperations?'operations':'legacy'};
};
const backendDriverPointCompare=(left,right)=>{
  const routeDifference=Number(left?.__route_index||0)-Number(right?.__route_index||0);
  if(routeDifference)return routeDifference;
  return backendPointOrder(left)-backendPointOrder(right);
};
const backendDriverOperationPlan=routes=>{
  const activeRoutes=Array.isArray(routes)?routes:[];
  const seen=new Set();
  const operations=[];
  let b794RouteCount=0;
  activeRoutes.forEach((route,routeIndex)=>{
    const plan=backendOperationPlan(route);
    if(plan.source==='operations')b794RouteCount+=1;
    [plan.nearest,...plan.upcoming,...plan.history].filter(Boolean).forEach(point=>{
      const key=`${route?.route_id||routeIndex}:${backendPointKey(point)}`;
      if(seen.has(key))return;
      seen.add(key);
      operations.push({...point,__route:route,__route_index:routeIndex,__route_name:activeRoutes.length>1?(route?.route_name||route?.route_id&&`Trasa ${route.route_id}`||''):''});
    });
  });
  operations.sort(backendDriverPointCompare);
  const nearest=operations.find(point=>String(point?.status||'').toLowerCase()==='in_progress')
    ||operations.find(point=>!backendPointTerminal(point))
    ||null;
  const nearestKey=nearest?`${nearest.__route_index}:${backendPointKey(nearest)}`:'';
  const upcoming=operations.filter(point=>!backendPointTerminal(point)&&`${point.__route_index}:${backendPointKey(point)}`!==nearestKey);
  const history=operations.filter(backendPointTerminal);
  const source=activeRoutes.length&&b794RouteCount===activeRoutes.length?'operations':b794RouteCount?'mixed':'legacy';
  return {nearest,upcoming,history,source};
};
const backendDateLabel=value=>{
  const match=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match?`${match[3]}.${match[2]}`:String(value||'');
};
const backendDayLabel=(day,dates={})=>{
  if(day==='today')return `DZISIAJ${dates.today?` · ${backendDateLabel(dates.today)}`:''}`;
  if(day==='tomorrow')return `JUTRO${dates.tomorrow?` · ${backendDateLabel(dates.tomorrow)}`:''}`;
  return 'POZOSTAŁE';
};
const backendUpcomingCaption=(points,dates={})=>{
  const today=points.filter(point=>point?.day==='today').length;
  const tomorrow=points.filter(point=>point?.day==='tomorrow').length;
  const parts=[];
  if(today)parts.push(`Dziś ${today}${dates.today?` · ${backendDateLabel(dates.today)}`:''}`);
  if(tomorrow)parts.push(`jutro ${tomorrow}${dates.tomorrow?` · ${backendDateLabel(dates.tomorrow)}`:''}`);
  return parts.join(' · ')||(points.length?'Miejsca, terminy i pinezki punktów trasy':'Brak kolejnych niezakończonych operacji');
};
let surveyRegisterScreen=null;
let cmrInventoryTasks=[];
let cmrInventoryScreen=null;
let cmrInventoryRefreshAt=0;
let cmrInventoryLoading=false;
async function inventoryRequest(method,path,body){
  const result=await nativeRequest(method,path,body);
  if(!liveOperationModel.isSuccess(result))throw new Error(liveOperationModel.errorMessage(result,'Nie udało się odczytać inwentaryzacji.'));
  return result.body;
}
async function refreshInventoryTasks(force=false){
  if(!window.SuperSpedytorNative?.backendRequest||!backendMode||backendState?.status!=='connected'||cmrInventoryLoading||(!force&&Date.now()-cmrInventoryRefreshAt<30000))return;
  cmrInventoryLoading=true;cmrInventoryRefreshAt=Date.now();
  try{
    const result=await nativeRequest('GET','documents/cmr-inventory/');
    if(result?.status===404){cmrInventoryTasks=[];return;}
    if(liveOperationModel.isSuccess(result)){
      cmrInventoryTasks=Array.isArray(result.body?.results)?result.body.results:[];
      const holder=document.getElementById('cmri-tasks');if(holder){holder.innerHTML=inventoryTaskCards();bindInventoryCards();}
    }
  }catch(_){/* Preserve last confirmed tasks when the network is unavailable. */}
  finally{cmrInventoryLoading=false;}
}
function inventoryTaskCards(){
  return cmrInventoryTasks.map(task=>`<button class="cmri-task" data-cmr-inventory-open="${Number(task.id)}"><strong>${task.overdue?'⚠ Zaległe zadanie':'Zinwentaryzuj zamknięte CMR-y'}</strong><span>${esc(task.driver_name)} · ${task.packed} z ${task.expected} koszulek w kopercie${task.issues?' · wymaga CWP: '+task.issues:''}</span></button>`).join('');
}
function liveInventoryTasksView(){
  return current().live?`<div id="cmri-tasks">${inventoryTaskCards()}</div>`:'';
}
function bindInventoryCards(){
  document.querySelectorAll('[data-cmr-inventory-open]').forEach(button=>{button.disabled=false;button.onclick=()=>openInventory(Number(button.dataset.cmrInventoryOpen));});
}
function openInventory(id){
  if(!window.SuperSpedytorNative?.backendRequest)return;
  if(cmrInventoryScreen)cmrInventoryScreen.close();
  const owner=String(backendState?.backend_origin||'native')+'|'+String(backendState?.profile?.id??'');
  if(!window.SuperSpedytorCmrInventory)return;
  cmrInventoryScreen=new window.SuperSpedytorCmrInventory.Screen({
    id,host:document.querySelector('.device'),request:inventoryRequest,isReadOnly:backendReadOnly,
    upload:async(path,token,fields)=>{const result=await nativeUpload(path,token,fields);if(!liveOperationModel.isSuccess(result))throw new Error(liveOperationModel.errorMessage(result,'Zdjęcie nie zostało potwierdzone.'));return {...result.body,queued:result.queued===true};},
    prepare:()=>window.SuperSpedytorOfflineWorkspace?.prepare(),
    pendingUploads:()=>window.SuperSpedytorOfflineWorkspace?.inventoryUploads(id)||[],
    reconcile:data=>window.SuperSpedytorOfflineWorkspace?.reconcileInventory(id,data),
    subscribe:listener=>window.SuperSpedytorOfflineWorkspace?.subscribeInventory(listener),
    isActive:()=>backendState?.status==='connected'&&!backendTestWorkspace&&owner===String(backendState?.backend_origin||'native')+'|'+String(backendState?.profile?.id??''),
    capture:async()=>{const result=await nativeCapturePhoto();if(result?.status==='cancelled')return null;if(result?.status!=='ok')throw new Error(result?.message||'Nie udało się zrobić zdjęcia.');return result;},
    scan:async()=>{const result=await nativeScanCode();if(result?.status==='cancelled')return null;if(result?.status!=='ok')throw new Error(result?.message||'Nie udało się zeskanować plomby.');return result.code;},
    release:nativeReleaseFile,onClose:()=>{cmrInventoryScreen=null;refreshInventoryTasks(true);}
  });
  cmrInventoryScreen.start();
}
window.SuperSpedytorOpenInventory=id=>{if(backendState?.status==='connected')openInventory(Number(id));};
function backendDesignedTiming(point,{firstOperation=false,history=false}={}){
  const planned=point.planned_at||point.live_eta_datetime||point.eta_datetime||point.time_window_start;
  const actual=history?(point.actual_end_datetime||point.actual_arrival_datetime):point.actual_arrival_datetime;
  const inProgress=String(point.status||'').toLowerCase()==='in_progress';
  const appointment=backendClock(point.time_window_start);
  const arrivalBy=firstOperation&&appointment?operationTimingModel.subtractMinutesFromClock(appointment,15):'';
  const clock=arrivalBy||backendClock(history?actual||planned:planned);
  const label=history?(point.actual_end_datetime?'ZAKOŃCZONO':'PRZYJAZD'):inProgress?'PLANOWANY CZAS':arrivalBy?'BĄDŹ NA MIEJSCU':'AKTUALNE ETA';
  const hint=arrivalBy?`Operacja o ${esc(appointment)} · 15 min wcześniej`:history?'Według odczytu TMS':point.live_eta_datetime||point.eta_datetime?'Przewidywany dojazd':'Planowany czas operacji';
  const timing=clock?`<div class="travel-arrival">${icon('clock')}<span><small>${label}</small><strong>${esc(clock)}</strong></span><p>${hint}</p></div>`:'';
  const window=has(point.time_window_start)||has(point.time_window_end)?`<div class="live-time-window"><small>OKNO CZASOWE</small><strong>${esc(backendClock(point.time_window_start)||'—')}–${esc(backendClock(point.time_window_end)||'—')}</strong></div>`:'';
  const actualFacts=[actual&&!history?`Przyjazd ${backendClock(actual)}`:null,has(point.planned_stay_minutes)?`Planowany postój ${point.planned_stay_minutes} min`:null].filter(Boolean);
  const facts=actualFacts.length?`<div class="travel-access live-operation-facts">${actualFacts.map(fact=>`<span>${esc(fact)}</span>`).join('')}</div>`:'';
  return timing+window+facts;
}
function backendDesignedPlanItem(point,{history=false,current=false}={}){
  const place=backendPointPlace(point),cargo=backendCargoText(point);
  const clock=backendClock(history?(point.actual_end_datetime||point.actual_arrival_datetime||point.planned_at||point.time_window_start):(point.planned_at||point.live_eta_datetime||point.eta_datetime||point.time_window_start));
  const hasLocation=has(place.address)||(has(place.latitude)&&has(place.longitude));
  return `<article class="operation-plan-item ${current?'current':''}"><div class="operation-plan-time"><small>${history?'WYKONANO':'PLAN'}</small><strong>${esc(clock||'—')}</strong></div><div class="operation-plan-line"><span></span></div><div class="operation-plan-detail"><div><b>${esc(point.operation_type_display||point.operation_type||'Operacja')}</b>${point.status_display?`<em>${esc(point.status_display)}</em>`:''}</div><h4>${esc(place.company)}</h4>${place.address?`<p>${esc(place.address)}</p>`:''}${point.order_number?`<p>${esc(point.order_number)}</p>`:''}${has(point.transport_offer)?`<p class="operation-plan-reference">Oferta ${esc(point.transport_offer)}</p>`:''}${hasLocation?`<a class="operation-plan-pin" href="${locationUrl(place)}" target="_blank" rel="noopener" aria-label="Pokaż na mapie: ${esc(place.company)}">${icon('pin')}<span>Pinezka</span></a>`:''}${cargo?`<div class="operation-plan-cargo">${icon('box')}<span><strong>${esc(cargo)}</strong></span></div>`:''}${point.notes?`<p>${esc(point.notes)}</p>`:''}</div></article>`;
}
function backendDesignedPlanGroups(points,dates={},options={}){
  const groups=['today','tomorrow','other'].map(day=>({day,points:points.filter(point=>(point.day==='today'||point.day==='tomorrow'?point.day:'other')===day)})).filter(group=>group.points.length);
  return groups.map(group=>`<section class="live-operation-day"><div class="section-heading"><h3>${esc(backendDayLabel(group.day,dates))}</h3><span>${group.points.length}</span></div><div class="operation-plan-list">${group.points.map(point=>backendDesignedPlanItem(point,{...options,current:String(point.id)===String(backendLastNearest?.id)})).join('')}</div></section>`).join('');
}
function backendDesignedRoutePlan(){
  const routeStatus=backendState.route_status||{},plan=backendDriverOperationPlan(routeStatus.active_routes||[]);
  const point=plan.nearest;
  if(!point)return '';
  const route=point.__route||{},dates=routeStatus.operations_dates||{};
  const label=route.route_name||route.route_id&&`Trasa ${route.route_id}`||'Trasa kierowcy';
  const facts=[];
  if(has(route.completed_points)&&has(route.total_points))facts.push(`${route.completed_points} z ${route.total_points} punktów`);
  if(has(route.progress_percentage)&&Number.isFinite(Number(route.progress_percentage)))facts.push(`${Number(route.progress_percentage)}% trasy`);
  const points=[point,...plan.upcoming];
  const history=plan.history.length?`<details class="live-history-details"><summary>Zakończone i pominięte · ${plan.history.length}</summary>${backendDesignedPlanGroups(plan.history,dates,{history:true})}</details>`:'';
  return `<details class="operation-plan operation-plan-preview"><summary><span class="operation-plan-summary-icon">${icon('pin')}</span><span><strong>Podgląd najbliższych operacji</strong><small>${esc(backendUpcomingCaption(points,dates))}</small></span><span class="operation-plan-chevron">${icon('arrow')}</span></summary><div class="operation-plan-body"><div class="live-route-context"><small>AKTYWNA TRASA</small><strong>${esc(label)}</strong>${facts.length?`<span>${facts.map(esc).join(' · ')}</span>`:''}</div>${backendDesignedPlanGroups(points,dates)}${history}</div></details>`;
}
function backendOperationFallbackView(){
  const routes=backendState.route_status?.active_routes||[];
  const point=backendDriverOperationPlan(routes).nearest;
  const title=point?'Pobieranie danych zlecenia…':routes.length?'Trasa zakończona':'Brak aktywnej trasy';
  const message=point?'Poczekaj na otwarcie danych kierowcy.':routes.length?'Nie ma kolejnej niezakończonej operacji. Odśwież plan, jeśli spedytor dodał nowe zadanie.':'Super Spedytor nie zwrócił aktywnej trasy dla Twojego konta.';
  return `<div class="app-content"><div class="operation-heading"><h2>${title}</h2><div class="header-tools"><button id="backend-refresh" class="icon-button" aria-label="Odśwież dane">↻</button><button id="backend-logout" class="icon-button" aria-label="Wyloguj z aplikacji">${icon('close')}</button></div></div><section class="panel" role="status"><p>${message}</p></section><div id="cmri-tasks">${inventoryTaskCards()}</div></div>`;
}
function renderBackendOperationScreen(scroll=0){
  if(typeof surveyRegisterScreen!=='undefined')surveyRegisterScreen?.destroy();
  window.SuperSpedytorTranslator?.refresh(backendState);
  $('#app').innerHTML=backendOperationFallbackView();
  $('#app-action').innerHTML='';
  $('#design-context').innerHTML='';
  $('#preview-label').textContent=backendState?.read_only===true&&backendState?.backend_environment==='dev'?'OPERACJA / DEV · TYLKO ODCZYT':'OPERACJA / SUPER SPEDYTOR';
  $$('[data-operation],[data-route-stop],[data-service-preview]').forEach(button=>{button.classList.remove('active');button.setAttribute('aria-pressed','false');});
  $$('.screen-list [data-screen]').forEach(button=>button.classList.remove('active'));
  $('#scenario-select').disabled=true;
  $('#mobile-scenario').disabled=true;
  $$('[data-nav]').forEach(button=>button.classList.toggle('active',button.dataset.nav==='now'));
  bindLiveSessionControls();
  bindInventoryCards();
  $('#app-scroll').scrollTop=scroll;
}
function renderBackendServiceHistoryScreen(scroll=0){
  surveyRegisterScreen?.destroy();
  surveyRegisterScreen=null;
  // A bridge is not proof that this backend supports the monthly register.
  // Keep own completed history available when the snapshot reports an error.
  const monthlyAvailable=window.SuperSpedytorServiceRegister?.validRegistry(backendState?.service_registry)===true;
  if(!productionScope&&monthlyAvailable&&window.SuperSpedytorSurveyRegister
    &&(window.SuperSpedytorNative?.backendRequest||driverBridge?.backendSurveyRegister)){
    const owner=String(backendState?.profile?.id??'');
    $('#app-action').innerHTML='';
    $('#design-context').innerHTML='';
    $('#preview-label').textContent='REJESTR ANKIET / SUPER SPEDYTOR';
    surveyRegisterScreen=window.SuperSpedytorSurveyRegister.mount($('#app'),{
      request:async month=>{
        const result=browserBackend
          ?await driverBridge.backendSurveyRegister(month)
          :await nativeRequest('GET','driver-tasks/survey-history/'+(month?'?month='+month:''));
        if(!liveOperationModel.isSuccess(result))throw new Error('Nie udało się pobrać rejestru.');
        return result.body;
      },
      isActive:()=>backendState?.status==='connected'&&!backendTestWorkspace
        &&backendActiveNav==='service'&&String(backendState?.profile?.id??'')===owner,
      onBack:()=>{surveyRegisterScreen?.destroy();backendActiveNav='now';render();}
    });
    $('#app-scroll').scrollTop=scroll;
    return;
  }

  $('#app').innerHTML=serviceModuleSwitch('history')+serviceHistoryView();
  $('#app-action').innerHTML=serviceHistoryActionView();
  $('#design-context').innerHTML=serviceHistoryDesignNotes();
  $('#preview-label').textContent=backendState?.read_only===true&&backendState?.backend_environment==='dev'?'SERWIS / HISTORIA DEV':'SERWIS / HISTORIA SS';
  $$('[data-operation],[data-route-stop],[data-service-preview]').forEach(button=>{button.classList.remove('active');button.setAttribute('aria-pressed','false');});
  $$('.screen-list [data-screen]').forEach(button=>button.classList.remove('active'));
  $('#scenario-select').disabled=true;
  $('#mobile-scenario').disabled=true;
  $$('[data-nav]').forEach(button=>button.classList.toggle('active',button.dataset.nav==='service'));
  bindServiceHistoryView();
  $('#app-scroll').scrollTop=scroll;
}
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
  const connected=status==='connected';
  const devConnection=browserBackend&&backendState?.read_only===true&&backendState?.backend_environment==='dev';
  const configurationError=backendState?.configuration_error===true;
  const chip=$('.driver-chip');
  if(chip&&!backendTestWorkspace)chip.textContent=devConnection?'DEV · tylko odczyt':'SUPER SPEDYTOR';
  if(!connected&&status!=='connecting'){
    backendActiveNav='now';
    state.serviceHistorySelectedId=null;
  }
  document.documentElement.classList.toggle('backend-connected',connected);
  document.documentElement.classList.toggle('backend-auth-gate',!connected);
  panel.classList.toggle('backend-panel-connected',connected);
  if(status==='connecting'){
    panel.innerHTML=`<div class="backend-gate"><div class="backend-loader" aria-hidden="true"></div><h2>${devConnection?'Łączenie z wersją dev SS':'Łączenie z Super Spedytorem'}</h2><p>${esc(backendState.message||'Pobieranie danych kierowcy…')}</p></div>`;
    return;
  }
  if(status==='connected'){
    delete renderSavedDriverLogin.state;
    panel.innerHTML='';
    render();
    return;
  }
  const error=status==='error'?backendState.message:'';
  const savedLoginsSupported=!browserBackend&&['backendLoginSaved','backendForgetSavedAccount','backendLoginRemembered'].every(key=>typeof driverBridge?.[key]==='function');
  if(savedLoginsSupported&&!devConnection&&!configurationError){renderSavedDriverLogin(panel,error);return;}
  const nativeRemember=!browserBackend&&typeof driverBridge?.backendLoginRemembered==='function';
  panel.innerHTML=`<form id="backend-login" class="backend-login" autocomplete="off"><span class="backend-login-mark">${icon('truck')}</span><small>${devConnection?'DEV · tylko odczyt':'SUPER SPEDYTOR KIEROWCA'}${installedAppVersion?` · ${esc(installedAppVersion)}`:''}</small><h2>${devConnection?'Połącz z wersją dev SS':'Zaloguj kierowcę'}</h2><p>${devConnection?'Pobierzesz profil kierowcy, aktualny pojazd, własną trasę i historię ankiet z wersji dev Super Spedytora. Ten podgląd służy wyłącznie do odczytu.':'Połączenie pobierze profil, aktualny pojazd, własną trasę oraz historię wykonanych ankiet serwisowych.'}</p>${error?`<div class="backend-error" role="alert">${icon('info')} ${esc(error)}</div>`:''}<label><span>Login</span><input id="backend-username" name="username" autocomplete="off" autocapitalize="none" required ${configurationError?'disabled':''}></label><label><span>Hasło</span><input id="backend-password" name="password" type="password" autocomplete="off" required ${configurationError?'disabled':''}></label>${(browserBackend||nativeRemember)&&!devConnection?`<label class="backend-remember"><input id="backend-remember" name="remember" type="checkbox" ${backendRememberMe?'checked':''}><span>Zapamiętaj mnie na tym urządzeniu</span></label>`:''}${backendState.can_retry&&!configurationError?'<button id="backend-retry" type="button">Spróbuj ponownie połączyć</button>':''}<button type="submit" ${configurationError?'disabled':''}>${icon('signal')} ${devConnection?'Połącz z wersją dev SS':'Połącz z Super Spedytorem'}</button><div class="backend-security">${icon('check')} ${devConnection?'Login i hasło nie są zapamiętywane. Sesja dotyczy wyłącznie wersji dev.':browserBackend?'Zapamiętanie sesji wymaga pliku cookie Super Spedytora. Jeśli przeglądarka go zablokuje, zalogujesz się ponownie.':nativeRemember?'Dane logowania i tokeny pozostają w warstwie natywnej. Zapamiętana sesja jest szyfrowana na tym urządzeniu.':'Dane logowania i tokeny pozostają w warstwie natywnej. Po ponownym uruchomieniu aplikacji zalogujesz się ponownie.'}</div></form>`;
  if(productionScope){
    const description=$('#backend-login > p',panel);
    if(description)description.textContent='Połączenie pobierze profil kierowcy, aktualny pojazd i własną trasę. Operacje oraz zadania zamkniętych CMR korzystają z firmowego systemu.';
  }
  if(privacyPolicyUrl){
    const form=$('#backend-login',panel);
    form.insertAdjacentHTML('beforeend',privacyPolicyLink());
  }
  $('#backend-login',panel).onsubmit=event=>{
    event.preventDefault();
    if(configurationError)return;
    const username=$('#backend-username',panel).value;
    const password=$('#backend-password',panel).value;
    const rememberMe=!devConnection&&Boolean($('#backend-remember',panel)?.checked);
    backendRememberMe=rememberMe;
    $('#backend-password',panel).value='';
    if(browserBackend)driverBridge?.backendLogin(username,password,rememberMe);
    else if(nativeRemember)driverBridge.backendLoginRemembered(username,password,rememberMe);
    else driverBridge?.backendLogin(username,password);
  };
  const retry=$('#backend-retry',panel);
  if(retry)retry.onclick=()=>driverBridge?.backendRefresh();
}
function renderSavedDriverLogin(panel,error){
  const logins=[...new Set((Array.isArray(backendState.saved_logins)?backendState.saved_logins:[]).filter(value=>typeof value==='string'&&value.length>0&&value.length<=200))];
  const ui=renderSavedDriverLogin.state||(renderSavedDriverLogin.state={manual:false,selected:'',username:'',remember:true,failure:''});
  if(backendState.login_failure_id&&ui.failure!==backendState.login_failure_id){
    ui.failure=backendState.login_failure_id;ui.manual=true;ui.username=backendState.login_username||'';
  }
  const selected=logins.includes(ui.selected)?ui.selected:logins[0]||'';
  const manual=ui.manual||!selected;
  const problem=error||backendState.saved_credentials_error||'';
  const accounts=logins.length?`<section class="backend-saved-logins" aria-label="Zapisane konta kierowców"><h3>Zapisane konta</h3>${logins.map((username,index)=>`<div class="backend-saved-row ${!manual&&username===selected?'selected':''}"><button type="button" class="backend-saved-account" data-saved-login="${index}" aria-pressed="${!manual&&username===selected}">${icon('truck')}<span>${esc(username)}<small>Hasło zapamiętane na tym iPhonie</small></span>${!manual&&username===selected?icon('check'):icon('arrow')}</button><button type="button" class="backend-saved-remove" data-forget-login="${index}" aria-label="Usuń zapisane konto ${esc(username)}" title="Usuń login i hasło z tego iPhone’a">${icon('close')}</button></div>`).join('')}</section>`:'';
  const fields=manual?`<label><span>Login</span><input id="backend-username" name="username" value="${esc(ui.username)}" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="200" required></label><label><span>Hasło</span><input id="backend-password" name="password" type="password" autocomplete="current-password" maxlength="1000" required></label><label class="backend-remember"><input id="backend-remember" name="remember" type="checkbox" ${ui.remember?'checked':''}><span>Zapamiętaj login i hasło na tym iPhonie</span></label>`:'';
  panel.innerHTML=`<form id="backend-login" class="backend-login" autocomplete="on"><span class="backend-login-mark">${icon('truck')}</span><small>SUPER SPEDYTOR KIEROWCA${installedAppVersion?` · ${esc(installedAppVersion)}`:''}</small><h2>Zaloguj kierowcę</h2><p>${manual?'Wpisz dane konta kierowcy Super Spedytora.':'Wybierz zapisane konto, aby zalogować się bez wpisywania hasła.'}</p>${problem?`<div class="backend-error" role="alert">${icon('info')} ${esc(problem)}</div>`:''}${accounts}${logins.length?`<button id="backend-other-account" class="backend-other-account" type="button">Inny użytkownik</button>`:''}${fields}<button type="submit">${icon('signal')} ${manual?'Połącz z Super Spedytorem':`Zaloguj jako ${esc(selected)}`}</button><div class="backend-security">${icon('check')} Hasła chroni Pęk kluczy tego iPhone’a. Wylogowanie kończy sesję; zapisane konto możesz usunąć z listy.</div></form>`;
  const form=$('#backend-login',panel);
  if(privacyPolicyUrl)form.insertAdjacentHTML('beforeend',privacyPolicyLink());
  $$('[data-saved-login]',panel).forEach(button=>button.onclick=()=>{
    ui.selected=logins[Number(button.dataset.savedLogin)];ui.manual=false;renderSavedDriverLogin(panel,error);
  });
  $$('[data-forget-login]',panel).forEach(button=>button.onclick=()=>{
    button.disabled=true;driverBridge.backendForgetSavedAccount(logins[Number(button.dataset.forgetLogin)]);
  });
  const other=$('#backend-other-account',panel);
  if(other)other.onclick=()=>{ui.manual=true;ui.username='';renderSavedDriverLogin(panel,error);$('#backend-username',panel)?.focus();};
  const remember=$('#backend-remember',panel);
  if(manual&&remember)remember.onchange=()=>{ui.remember=remember.checked;};
  form.onsubmit=event=>{
    event.preventDefault();
    if(!manual){driverBridge.backendLoginSaved(selected);return;}
    const username=$('#backend-username',panel).value.trim();
    const password=$('#backend-password',panel).value;
    ui.username=username;ui.remember=Boolean($('#backend-remember',panel)?.checked);
    $('#backend-password',panel).value='';
    driverBridge.backendLoginRemembered(username,password,ui.remember);
  };
}
// AA28: a separate GET-only Tacho surface; no offline request cache or demo fallback.
function positiveTachoId(value){
  if(typeof value==='number')return Number.isSafeInteger(value)&&value>0?String(value):'';
  if(typeof value==='string'&&/^[1-9]\d*$/.test(value)){
    const number=Number(value);return Number.isSafeInteger(number)?String(number):'';
  }
  return '';
}
function tachoSessionKey(session){
  if(session?.status!=='connected')return '';
  const user=positiveTachoId(session.profile?.id);
  const profile=session.profile;
  if(!profile||typeof profile!=='object'||Array.isArray(profile))return '';
  const directPresent=Object.prototype.hasOwnProperty.call(profile,'driver_id');
  const nestedPresent=Object.prototype.hasOwnProperty.call(profile,'driver_profile');
  const nested=profile.driver_profile;
  if(nestedPresent&&(!nested||typeof nested!=='object'||Array.isArray(nested)||!Object.prototype.hasOwnProperty.call(nested,'id')))return '';
  const directId=directPresent?positiveTachoId(profile.driver_id):'';
  const nestedId=nestedPresent?positiveTachoId(nested.id):'';
  if(directPresent&&!directId||nestedPresent&&!nestedId||directId&&nestedId&&directId!==nestedId)return '';
  const driver=directId||nestedId;
  let origin='';
  try{
    const url=new URL(session.backend_origin);
    if(url.protocol!=='https:'||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash
      ||!['dev.amg-trans.eu','tms.amg.eco'].includes(url.hostname))return '';
    origin=url.origin;
  }catch{return '';}
  return user&&driver?`${origin}|${user}|${driver}`:'';
}
async function backendTachoMe(){
  const owner=tachoSessionKey(backendState);
  if(!owner||!tachoReadOnlyAvailable())throw new Error('Odczyt Tacho wymaga połączenia z kontem kierowcy.');
  // Intentionally bypass nativeRequest / SuperSpedytorOfflineWorkspace.
  const result=browserBackend
    ?await driverBridge.backendTachoMe()
    :await nativeCall(id=>driverBridge.backendRequest(id,'GET','vehicles/vehicles/tacho/me/',''));
  if(owner!==tachoSessionKey(backendState))throw new Error('Sesja kierowcy zmieniła się.');
  if(result?.cached===true||result?.status!==200||!result.body||typeof result.body!=='object'||Array.isArray(result.body))
    throw new Error(result?.status===404?'Brak danych Tacho dla tego konta.':result?.status===401?'Sesja wygasła. Zaloguj się ponownie.':'Nie udało się odczytać aktualnych danych Tacho.');
  const expected=owner.slice(owner.lastIndexOf('|')+1);
  if(positiveTachoId(result.body.driver?.id)!==expected)throw new Error('Odpowiedź Tacho nie jest przypisana do zalogowanego kierowcy.');
  return result;
}
function closeBackendReadOnlyTacho(restore=false){
  try{driverBridge?.tachoScreenVisible?.(false);}catch{}
  tachoReadonlyScreen?.close();tachoReadonlyScreen=null;
  if(backendActiveNav==='tacho')backendActiveNav='now';
  if(restore)render();
}
function openBackendReadOnlyTacho(){
  if(!backendMode||backendTestWorkspace||driverBridge?.liveWorkflowsEnabled?.()===true)return false;
  if(!tachoReadOnlyAvailable()){
    toast('Ta wersja aplikacji nie udostępnia rzeczywistego odczytu Tacho.');return true;
  }
  if(backendState?.status!=='connected'){
    toast('Zaloguj się kontem kierowcy, aby odczytać Tacho.');return true;
  }
  if(!tachoSessionKey(backendState)){
    toast('Brak jednoznacznego profilu kierowcy dla Tacho. Odśwież dane lub zaloguj się ponownie.');return true;
  }
  if(liveBusy||liveOperation?.finishing||backendState?.write?.status==='pending'){
    toast('Poczekaj na zakończenie bieżącej operacji.');return true;
  }
  if(!window.SuperSpedytorReadOnlyTacho?.create){
    toast('Panel Tacho nie został załadowany. Otwórz aplikację ponownie.');return true;
  }
  window.SuperSpedytorTacho?.close?.();
  backendActiveNav='tacho';
  updateDriverWorkspaceBar();
  $$('[data-nav]').forEach(button=>button.classList.toggle('active',button.dataset.nav==='tacho'));
  if(!tachoReadonlyScreen)tachoReadonlyScreen=window.SuperSpedytorReadOnlyTacho.create({
    getSession:()=>backendState,
    request:backendTachoMe,
    onClose:()=>closeBackendReadOnlyTacho(true)
  });
  tachoReadonlyScreen.open();
  if(tachoReadonlyScreen.isOpen()){
    try{driverBridge?.tachoScreenVisible?.(true);}catch{}
  }else closeBackendReadOnlyTacho(false);
  return true;
}
window.SuperSpedytorBackend={
  closeTachoReadOnly(){
    if(!tachoReadonlyScreen?.isOpen())return false;
    closeBackendReadOnlyTacho(true);return true;
  },
  setActiveNav(nav){
    if(nav==='tacho'&&openBackendReadOnlyTacho())return false;
    if(typeof tachoReadonlyScreen!=='undefined'&&tachoReadonlyScreen?.isOpen()&&nav!=='tacho')closeBackendReadOnlyTacho(false);
    if(productionScope&&!['now','help'].includes(nav))return false;
    if(backendMode&&backendState?.status==='connected'&&nav==='tacho'&&!backendTestWorkspace&&!enterTestingWorkspace('tacho',false))return false;
    backendActiveNav=nav==='service'?'service':nav==='tacho'?'tacho':'now';
    updateDriverWorkspaceBar();
    return true;
  },
  receive(raw){
    const previousTachoOwner=tachoSessionKey(backendState);
    const previousWriteKey=`${backendState?.write?.id||''}:${backendState?.write?.status||''}`;
    const previousContext={point:liveOperation?.point||backendLastNearest,owner:backendState?.profile?.id==null?'':`${backendState.backend_origin||'native'}|${backendState.profile.id}`};
    try{backendState=typeof raw==='string'?JSON.parse(raw):raw;}
    catch{backendState={status:'error',message:'Aplikacja otrzymała nieprawidłową odpowiedź'};}
    const receivedOwner=backendState?.profile?.id==null?'':`${backendState.backend_origin||'native'}|${backendState.profile.id}`;
    if(tachoReadonlyScreen&&(!previousTachoOwner||previousTachoOwner!==tachoSessionKey(backendState)))closeBackendReadOnlyTacho(false);
    if(receivedOwner!==previousContext.owner)backendPointActionPending=null;
    window.SuperSpedytorTranslator?.refresh(backendState);
    const pointWrite=backendState?.write;
    if(typeof cmrInventoryScreen!=='undefined'&&cmrInventoryScreen?.options?.isActive&&!cmrInventoryScreen.options.isActive())cmrInventoryScreen.close();
    window.SuperSpedytorOfflineWorkspace?.receive();
    if(!['connected','connecting'].includes(backendState?.status))backendPointActionPending=null;
    else if(backendPointActionPending&&pointWrite?.id
      &&String(pointWrite.id)!==backendPointActionPending.previousWriteId
      &&['confirmed','error','uncertain'].includes(pointWrite.status)
      &&(!pointWrite.point_id||String(pointWrite.point_id)===String(backendPointActionPending.pointId))
      &&(!pointWrite.action||pointWrite.action===backendPointActionPending.action))backendPointActionPending=null;
    if(backendState?.status!=='connected'){
      if(typeof surveyRegisterScreen!=='undefined')surveyRegisterScreen?.destroy();
      backendTestWorkspace=false;
      document.documentElement.classList.remove('backend-testing');
      driverBridge?.backendTestingMode?.(false);
      if(liveMode())exitLiveOperation();
    }
    if(backendState?.status==='connected')refreshInventoryTasks();
    else {cmrInventoryTasks=[];if(cmrInventoryScreen)cmrInventoryScreen.close();}
    settleBackendPointWrite(backendState?.write,previousWriteKey,previousContext);
    renderBackendPanel();
    if(backendState?.remember_error)toast(backendState.remember_error);
  },
  // AA9: odpowiedź mostka na backendRequest/backendUpload/capturePhoto/scanDocument/scanCode
  receiveResult(requestId,result){
    const pending=pendingRequests.get(requestId);
    if(!pending)return;
    pendingRequests.delete(requestId);
    pending.resolve(result&&typeof result==='object'?result:{status:'error',message:'Nieprawidłowa odpowiedź warstwy natywnej'});
  }
};
function initializeBackendPanel(){
  if(!backendMode)return;
  try{
    const initial=driverBridge?.backendState();
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
  window.addEventListener('pagehide',cancelLiveRouteRead);
  const chip=$('.driver-chip');
  if(chip){
    chip.textContent='SUPER SPEDYTOR';
    chip.setAttribute('title','Operacje i historia kierowcy z Super Spedytora');
  }
}

if(androidShell&&!browserBackend){
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href]');
    if(!link)return;
    const url=link.href;
    if(!/^(https?:|tel:|geo:|google\.navigation:)/i.test(url))return;
    event.preventDefault();
    nativeOpenExternal(url);
  },true);
}

if(!backendMode&&hasOwn(collectionScenarios,appQuery.get('cmrScenario')))startCollectionScenario(appQuery.get('cmrScenario'));
else render();
initializeBackendPanel();
if(browserBackend)window.SuperSpedytorWeb.backendRefresh();
if(!backendMode){
  window.addEventListener('pagehide',()=>{if(state.serviceOpen&&state.servicePanel==='survey'&&!state.serviceSurvey.submitted)flushServiceDraft().catch(()=>{});});
  const operationTimerTicker=setInterval(updateOperationTimerDom,1000);
  window.addEventListener('beforeunload',()=>clearInterval(operationTimerTicker),{once:true});
  initializeServiceSurveyStorage().catch(()=>{
    maybeShowDailyServiceReminder();
    scheduleServiceSurveyExpiry();
  });
  document.addEventListener('visibilitychange',async()=>{
    if(document.hidden){if(state.serviceOpen&&state.servicePanel==='survey'&&!state.serviceSurvey.submitted)flushServiceDraft().catch(()=>{});return;}
    const expired=await expireServiceSurveyDataIfNeeded();
    const restored=await restoreServiceSurveyForToday();
    ensureServiceSurveyToday();
    if(expired||restored)render();
    updateServiceNavIndicator();
    maybeShowDailyServiceReminder();
    scheduleServiceReminder();
    scheduleServiceSurveyExpiry();
  });
}

if(backendMode){
  const inventoryTicker=setInterval(()=>{if(!document.hidden)refreshInventoryTasks();},30000);
  window.addEventListener('beforeunload',()=>clearInterval(inventoryTicker),{once:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshInventoryTasks(true);});
}
