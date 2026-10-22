'use strict';

// One transaction commits both workflow state and its actual Blob/File bytes.
// A blob: URL alone is never a durable file reference.
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.SuperSpedytorOffline=factory();
})(typeof self!=='undefined'?self:this,function(){
  function createDatabase(indexedDB){
    let database;
    function open(){
      if(database)return database;
      database=new Promise((resolve,reject)=>{
        const request=indexedDB.open('super-spedytor-offline-v1',1);
        request.onupgradeneeded=()=>request.result.createObjectStore('records');
        request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();database=null;};resolve(db);};
        request.onerror=()=>{database=null;reject(request.error);};
        request.onblocked=()=>{database=null;reject(new Error('Zamknij starszą kartę aplikacji, aby zapisać dane.'));};
      });
      return database;
    }
    return {
      async get(key){
        const db=await open();
        return new Promise((resolve,reject)=>{
          const tx=db.transaction('records','readonly'),request=tx.objectStore('records').get(key);
          tx.oncomplete=()=>resolve(request.result);tx.onabort=()=>reject(tx.error||new Error('Odczyt przerwany'));
          tx.onerror=()=>{};
        });
      },
      async put(key,value){
        const db=await open();
        return new Promise((resolve,reject)=>{
          let tx;
          try{tx=db.transaction('records','readwrite',{durability:'strict'});}catch{tx=db.transaction('records','readwrite');}
          tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||new Error('Zapis przerwany'));
          tx.onerror=()=>{};
          try{tx.objectStore('records').put(value,key);}catch(error){tx.abort();reject(error);}
        });
      }
    };
  }
  async function pack(value,fetchBlob){
    if(!value||typeof value!=='object')return value;
    if(typeof Blob!=='undefined'&&value instanceof Blob)return value;
    if(Array.isArray(value))return Promise.all(value.map(item=>pack(item,fetchBlob)));
    const result={};
    for(const [key,item] of Object.entries(value)){
      if(typeof item==='function'||key==='modal'||key==='hydrated'||key==='saving')continue;
      if(key==='url'&&typeof item==='string'&&item.startsWith('blob:')){
        result.__offlineBlob=value.blob||await fetchBlob(item);
      }else result[key]=await pack(item,fetchBlob);
    }
    return result;
  }
  function unpack(value,makeUrl){
    if(!value||typeof value!=='object')return value;
    if(typeof Blob!=='undefined'&&value instanceof Blob)return value;
    if(Array.isArray(value))return value.map(item=>unpack(item,makeUrl));
    const result={};
    for(const [key,item] of Object.entries(value))if(key!=='__offlineBlob')result[key]=unpack(item,makeUrl);
    if(value.__offlineBlob){result.blob=value.__offlineBlob;result.url=makeUrl(value.__offlineBlob);}
    return result;
  }
  function createQueue({db,key,onChange=()=>{},id=()=>crypto.randomUUID()}){
    let jobs=[],serial=Promise.resolve();
    const change=operation=>{
      const result=serial.catch(()=>{}).then(async()=>{
        const next=operation(jobs.map(item=>({...item})));
        await db.put(key,next);jobs=next;onChange(jobs);return next;
      });serial=result;return result;
    };
    return {
      async restore(){
        const saved=await db.get(key);jobs=Array.isArray(saved)?saved:[];
        // A killed process may already have delivered an in-flight request.
        if(jobs.some(job=>job.state==='sending'))await change(list=>list.map(job=>job.state==='sending'?{...job,state:'uncertain'}:job));
        onChange(jobs);return jobs;
      },
      list:()=>jobs.map(item=>({...item})),
      async add(payload){
        const existing=jobs.find(job=>job.dedupe===payload.dedupe);
        if(existing)return existing;
        const job={...payload,id:id(),createdAt:new Date().toISOString(),state:'queued'};
        await change(list=>list.some(item=>item.dedupe===job.dedupe)?list:[...list,job]);
        return jobs.find(item=>item.dedupe===payload.dedupe);
      },
      update:(jobId,fields)=>change(list=>list.map(job=>job.id===jobId?{...job,...fields}:job)),
      remove:jobId=>change(list=>list.filter(job=>job.id!==jobId)),
      // Only requests known not to have been attempted may be sent automatically.
      async drain(send){
        for(const job of [...jobs]){
          if(job.state!=='queued')break;
          await this.update(job.id,{state:'sending'});
          let result;
          try{result=await send(job);}catch{result={state:'uncertain'};}
          if(result?.confirmed)await this.remove(job.id);
          else{await this.update(job.id,{state:result?.state||'uncertain',message:result?.message||''});break;}
        }
      }
    };
  }
  function validateJob(job,snapshot){
    const points=(snapshot?.route_status?.active_routes||[]).flatMap(route=>route.operations||[route.current_point,route.next_point]).filter(Boolean);
    const transport=job.path?.match(/^documents\/transport\/(\d+)\//);
    const pointId=job.pointId||job.body?.point_id||job.path?.match(/^routes\/points\/(\d+)\//)?.[1];
    const point=pointId?points.find(item=>String(item.id)===String(pointId)):transport?points.find(item=>String(item.transport_offer)===transport[1]&&item.status==='in_progress'):null;
    if((pointId||transport)&&(!point||transport&&String(point.transport_offer)!==transport[1]))
      return 'Przydział lub zlecenie zmieniły się. Sprawdź zapis w Super Spedytorze.';
    if(job.kind==='upload'&&transport&&point?.status!=='in_progress')
      return 'Ta operacja nie jest już w toku. Plik pozostaje na telefonie do sprawdzenia.';
    return '';
  }
  return {createDatabase,pack,unpack,createQueue,validateJob};
});
