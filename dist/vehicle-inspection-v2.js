'use strict';

(function exposeVehicleInspectionV2(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SuperSpedytorVehicleInspectionV2=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  const readings=Object.freeze([
    Object.freeze({id:'odometer',field:'odometerKm',title:'Przebieg',unit:'km',integer:true,min:0,description:'Wpisz aktualny przebieg, a następnie zrób czytelne zdjęcie licznika.'}),
    Object.freeze({id:'fuel',field:'fuelLevel',title:'Paliwo',unit:'%',min:0,max:100,description:'Wpisz poziom paliwa w procentach i sfotografuj jego wskazanie.'}),
    Object.freeze({id:'dpf',field:'dpfLevel',title:'DPF',unit:'%',min:0,max:100,allowUnavailable:true,description:'Wpisz wskazanie DPF i zrób zdjęcie ekranu. Jeżeli pojazd nie pokazuje wartości, wybierz „Brak wskazania”.'}),
    Object.freeze({id:'adBlue',field:'adBlueLevel',title:'AdBlue',unit:'%',min:0,max:100,description:'Wpisz poziom AdBlue w procentach i sfotografuj jego wskazanie.'})
  ]);
  const cabinKeys=new Set(['mainKey','spareKey','vehicleDocuments','fuelCards','tollDevice','extinguisher','triangle','firstAid','vests','flashlight','documentCase']);
  const cargoKeys=new Set(['straps','corners','mats','bars','broom']);
  const acceptedStatuses=new Set(['matching','present','missing','damaged','partial','elsewhere','not-applicable']);
  const exteriorOrder=Object.freeze(['front','rightSide','rightMirror','rightDoor','frontRightWheelArch','rearRightWheelArch','rear','leftSide','leftMirror','leftDoor','frontLeftWheelArch','rearLeftWheelArch']);
  const fallbackPhotos={
    odometer:{name:'Licznik i przebieg',description:'Obejmij cały licznik. Przebieg musi być czytelny.'},
    fuel:{name:'Poziom paliwa',description:'Zrób czytelne zdjęcie wskaźnika poziomu paliwa.'},
    dpf:{name:'DPF i kontrolki',description:'Zrób zdjęcie wskazania DPF lub ekranu, na którym pojazd pokazuje dostępne komunikaty i kontrolki.'},
    adBlue:{name:'Poziom AdBlue',description:'Otwórz wskazanie AdBlue na desce rozdzielczej i zrób czytelne zdjęcie ekranu.'},
    rightDoor:{name:'Prawe drzwi',description:'Pozostając po prawej stronie, sfotografuj całe prawe drzwi, klamkę i widoczne krawędzie.'},
    leftDoor:{name:'Lewe drzwi',description:'Pozostając po lewej stronie, sfotografuj całe lewe drzwi, klamkę i widoczne krawędzie.'}
  };

  const has=value=>value!==null&&value!==undefined&&String(value).trim()!=='';
  const hasPhoto=value=>Boolean(value);
  const equipmentKey=item=>item.localKey||item.id;

  function createState(){
    return {stepIndex:0,values:{},statuses:{},quantities:{},locations:{},cardDigits:{},notes:{},photos:{},issuePhotos:{},confirmed:false,submitted:false,error:null};
  }

  function buildSteps(snapshot={},options={}){
    const equipment=Array.isArray(snapshot.equipment)?snapshot.equipment:[];
    const requirements=Array.isArray(snapshot.photoRequirements)?snapshot.photoRequirements:[];
    const byId=new Map(requirements.filter(item=>has(item?.id)).map(item=>[item.id,item]));
    const photoFor=(id,groupId)=>{
      const supplied=byId.get(id);
      if(supplied)return {...supplied,groupId:supplied.groupId||groupId};
      const fallback=fallbackPhotos[id];
      if(!fallback)return null;
      return {id,...fallback,groupId,icon:'camera',required:true,synthetic:true,source:'v2-preview',snapshotSource:snapshot.source||null};
    };
    const photoStep=(photo,section)=>({id:`photo-${photo.id}`,type:'photo',section,title:photo.name,description:photo.description||'Zrób czytelne zdjęcie całego wskazanego elementu.',photo:{...photo}});
    const checklist=(id,section,title,description,items)=>({id,type:'checklist',section,title,description,items:items.map(item=>({...item}))});
    const fullStages=Array.isArray(snapshot.equipmentStages)?snapshot.equipmentStages:[];
    const stagesFor=section=>fullStages.filter(group=>group.section===section).map(group=>({...checklist('checklist-'+group.id,section,group.title,group.placeNote||'Sprawdź wszystkie pozycje w tym miejscu.',equipment.filter(item=>item.groupId===group.id)),placeNote:group.placeNote})).filter(step=>step.items.length);
    const steps=[{
      id:'intro',type:'intro',section:'start',title:options.mode==='inventory'?'Inwentaryzacja · V2':'Przekazanie auta · V2',
      description:'Zrób zdjęcia kabiny i sprawdź jej wyposażenie, obejdź pojazd, a potem przejdź do przestrzeni ładunkowej i schowków zewnętrznych.'
    }];

    readings.forEach(reading=>steps.push({
      id:`reading-${reading.id}`,type:'reading',section:'cabin',title:reading.title,
      description:reading.description,reading:{...reading},photo:photoFor(reading.id,'readings')
    }));
    requirements.filter(photo=>photo.groupId==='cabin').forEach(photo=>steps.push(photoStep(photo,'cabin')));
    const cabinEquipment=equipment.filter(item=>cabinKeys.has(equipmentKey(item)));
    if(fullStages.length)steps.push(...stagesFor('cabin'));
    else if(cabinEquipment.length)steps.push(checklist('checklist-cabin','cabin','Wyposażenie kabiny','Pozostając w kabinie, sprawdź klucze, dokumenty, karty i wyposażenie. Następnie wyjdziesz zrobić zdjęcia dookoła pojazdu.',cabinEquipment));
    exteriorOrder.forEach(id=>{
      const photo=photoFor(id,'exterior');
      if(photo)steps.push(photoStep(photo,'exterior'));
    });
    // Preserve any extra owner-supplied exterior requirements after the standard walkaround.
    requirements.filter(photo=>photo.groupId==='exterior'&&!exteriorOrder.includes(photo.id)).forEach(photo=>steps.push(photoStep(photo,'exterior')));
    if(fullStages.length)steps.push(...stagesFor('exterior'));
    requirements.filter(photo=>photo.groupId==='cargo').forEach(photo=>steps.push(photoStep(photo,'cargo')));
    const cargoEquipment=equipment.filter(item=>cargoKeys.has(equipmentKey(item)));
    if(fullStages.length)steps.push(...stagesFor('cargo'));
    else if(cargoEquipment.length)steps.push(checklist('checklist-cargo','cargo','Wyposażenie paki i windy','Sprawdź wyposażenie przestrzeni ładunkowej. Następnie przejdziesz do schowków zewnętrznych.',cargoEquipment));
    const extras=equipment.filter(item=>!cabinKeys.has(equipmentKey(item))&&!cargoKeys.has(equipmentKey(item)));
    if(!fullStages.length&&extras.length)steps.push(checklist('checklist-extras','cargo','Schowki zewnętrzne i wyposażenie dodatkowe','Na koniec sprawdź rzeczy przechowywane na zewnątrz i pozostałe wyposażenie przypisane do auta.',extras));
    if(fullStages.length){
      const grouped=new Set(fullStages.map(group=>group.id));
      const ungrouped=equipment.filter(item=>!grouped.has(item.groupId));
      if(ungrouped.length)steps.push(checklist('checklist-unassigned','cargo','Pozostałe pozycje przypisane do auta','Pozycje bez wskazanego miejsca — sprawdź każdą z nich.',ungrouped));
    }
    steps.push({id:'review',type:'review',section:'finish',title:options.mode==='inventory'?'Zakończ inwentaryzację':'Zakończ przekazanie',description:'Sprawdź podsumowanie i potwierdź wykonanie wszystkich czynności.'});
    return steps;
  }

  function readingValueValid(reading,value){
    if(reading.allowUnavailable&&value==='unavailable')return true;
    if(!has(value)||!['string','number'].includes(typeof value))return false;
    const normalized=typeof value==='string'?value.trim().replace(',','.'):value;
    const number=Number(normalized);
    return Number.isFinite(number)
      && number>=(reading.min??0)
      && (reading.max===undefined||number<=reading.max)
      && (!reading.integer||Number.isInteger(number));
  }

  function firstProblem(step,state={}){
    if(!step||step.type==='intro')return null;
    if(step.type==='reading'){
      if(!readingValueValid(step.reading,state.values?.[step.reading.field])){
        const message=step.reading.id==='odometer'
          ?'Musisz wpisać poprawny przebieg w pełnych kilometrach.'
          :step.reading.id==='dpf'
            ?'Musisz wpisać DPF od 0 do 100% albo wybrać „Brak wskazania”.'
            :`Musisz wpisać ${step.reading.title} od 0 do 100%.`;
        return {kind:'value',key:step.reading.field,message};
      }
    }
    if((step.type==='reading'||step.type==='photo')&&!hasPhoto(state.photos?.[step.photo?.id])){
      return {kind:'photo',key:step.photo?.id,message:`Musisz dodać zdjęcie: ${step.photo?.name||step.title}.`};
    }
    if(step.type==='checklist'){
      for(const item of step.items||[]){
        const status=state.statuses?.[item.id];
        if(!acceptedStatuses.has(status))return {kind:'status',key:item.id,message:`Musisz wskazać stan pozycji „${item.name}”.`};
        if(status==='not-applicable'&&item.criticality!=='extra')return {kind:'status',key:item.id,message:'Ta pozycja nie jest wyposażeniem opcjonalnym.'};
        if(item.countRequired&&!['missing','not-applicable'].includes(status)){
          const counts=state.quantities?.[item.id];
          if(!counts||['good','average','bad'].some(key=>!validCount(counts[key])))return {kind:'quantity',key:item.id,message:`Wpisz poprawne ilości pozycji „${item.name}” (pełne liczby od 0 do 9999).`};
          const total=Number(counts.good)+Number(counts.average)+Number(counts.bad);
          if(status==='matching'&&item.expectedQuantity!==null&&total!==item.expectedQuantity)return {kind:'quantity',key:item.id,message:'Ilość różni się od normy. Wybierz „Inna ilość” i wpisz faktyczny stan.'};
          if(status==='damaged'&&Number(counts.bad)===0)return {kind:'quantity',key:item.id,message:'Wpisz liczbę uszkodzonych sztuk.'};
        }
        if(status==='elsewhere'&&!has(state.locations?.[item.id]))return {kind:'location',key:item.id,message:'Wskaż miejsce, w którym znaleziono wyposażenie.'};
        if(status==='elsewhere'&&state.locations?.[item.id]==='other'&&!has(state.notes?.[item.id]))return {kind:'location',key:item.id,message:'Opisz inne miejsce przechowywania w uwagach.'};
        if(item.asksCardDigits&&!['missing','not-applicable'].includes(status)){
          const digits=state.cardDigits?.[item.id]||'';
          if(!/^(\d{4}|BRAK)$/.test(digits))return {kind:'card',key:item.id,message:'Wpisz 4 ostatnie cyfry karty albo BRAK, jeśli nie można ich odczytać. Bez pełnego numeru i PIN-u.'};
          if(digits==='BRAK'&&!has(state.notes?.[item.id]))return {kind:'note',key:item.id,message:'Opisz, dlaczego nie można odczytać numeru karty.'};
        }
        if(status!=='damaged'&&!(Number(state.quantities?.[item.id]?.bad)>0&&!['missing','not-applicable'].includes(status)))continue;
        const photos=state.issuePhotos?.[item.id]||{};
        if(!hasPhoto(photos.wide))return {kind:'issue-wide',key:item.id,message:`Musisz dodać zdjęcie całego uszkodzonego elementu: ${item.name}.`};
        if(!hasPhoto(photos.close))return {kind:'issue-close',key:item.id,message:`Musisz dodać zbliżenie uszkodzenia: ${item.name}.`};
        if(!has(state.notes?.[item.id]))return {kind:'note',key:item.id,message:`Musisz opisać uszkodzenie: ${item.name}.`};
      }
    }
    if(step.type==='review'&&state.confirmed!==true)return {kind:'confirmation',key:'confirmed',message:'Musisz potwierdzić sprawdzenie auta przed zakończeniem protokołu.'};
    return null;
  }

  const validCount=value=>has(value)&&typeof value!=='boolean'&&Number.isInteger(Number(value))&&Number(value)>=0&&Number(value)<=9999;
  function itemCounts(item,state){
    const status=state.statuses?.[item.id],counts=state.quantities?.[item.id]||{};
    const excluded=['missing','not-applicable'].includes(status);
    const good=excluded?0:Number(counts.good||0),average=excluded?0:Number(counts.average||0),bad=excluded?0:Number(counts.bad||0);
    const present=good+average+bad,missing=status==='not-applicable'||item.expectedQuantity===null?null:Math.max(0,Number(item.expectedQuantity||0)-present);
    return {good,average,bad,present,missing,issue:Boolean(status&&status!=='not-applicable'&&(status==='missing'||status==='elsewhere'||bad>0||average>0||missing>0||item.expectedQuantity!==null&&present>item.expectedQuantity))};
  }

  const stepReady=(step,state)=>firstProblem(step,state)===null;
  const requiredStages=steps=>steps.filter(step=>!['intro','review'].includes(step.type));

  function progress(steps=[],state={}){
    const stages=requiredStages(steps);
    const completed=stages.filter(step=>stepReady(step,state)).length;
    return {completed,total:stages.length,percentage:stages.length?Math.round(completed/stages.length*100):0};
  }

  function allReady(steps=[],state={}){
    const stages=requiredStages(steps);
    return stages.length>0&&stages.every(step=>stepReady(step,state))&&state.confirmed===true;
  }

  // Returns -1 when every required stage and the final confirmation are complete.
  function firstIncompleteStepIndex(steps=[],state={}){
    return steps.findIndex(step=>step.type!=='intro'&&!stepReady(step,state));
  }

  // Advances one page; an unfinished earlier/current page always wins over moving forward.
  function nextStepIndex(steps=[],state={},fromIndex=state.stepIndex||0){
    if(!steps.length)return -1;
    const current=Math.max(0,Math.min(steps.length-1,Number.isInteger(fromIndex)?fromIndex:0));
    for(let index=0;index<=current;index++){
      if(!stepReady(steps[index],state))return index;
    }
    return Math.min(current+1,steps.length-1);
  }

  return Object.freeze({readings,exteriorOrder,createState,buildSteps,readingValueValid,validCount,itemCounts,firstProblem,stepReady,progress,allReady,firstIncompleteStepIndex,nextStepIndex});
});
