/* Android owns pixels and model sessions; only compressed files cross the WebView bridge. */
(function(){
  'use strict';
  const jobs=new Map(),CHUNK=192*1024;
  const bridge=()=>window.CmrEnhancerNative;
  const available=()=>['begin','camera','append','process','cancel','release'].every(key=>typeof bridge()?.[key]==='function');
  const uuid=()=>crypto.randomUUID?.()||'10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(Number(c)^crypto.getRandomValues(new Uint8Array(1))[0]&15>>Number(c)/4).toString(16));
  const encode=bytes=>{let value='';for(let i=0;i<bytes.length;i+=8192)value+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(value);};
  function release(page){if(page?.nativeSourceId)try{bridge()?.release(page.nativeSourceId);}catch{}}
  function stop(){
    for(const [requestId,job] of jobs){
      jobs.delete(requestId);clearTimeout(job.timer);try{bridge()?.cancel(requestId);}catch{}
      if(job.created)try{bridge()?.release(job.sourceId);}catch{}
      job.reject(new DOMException('Przerwano ulepszanie skanu.','AbortError'));
    }
  }
  function receive(result){
    try{if(typeof result==='string')result=JSON.parse(result);}catch{return;}
    const job=jobs.get(result?.requestId);if(!job)return;
    jobs.delete(result.requestId);clearTimeout(job.timer);
    if(result.status==='ok')job.resolve({...result,nativeSourceId:job.sourceId});
    else{if(job.created)bridge()?.release(job.sourceId);job.reject(new Error(result.message||'Nie udało się ulepszyć skanu.'));}
  }
  async function process(page,{mode='color',quad=null,rotation=0}={}){
    if(!available())throw new Error('Ta instalacja nie zawiera natywnego modułu ulepszania.');
    const requestId=uuid(),sourceId=page.nativeSourceId||uuid();
    let resolve,reject;
    const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});promise.catch(()=>{});
    const job={resolve,reject,sourceId,created:!page.nativeSourceId,timer:setTimeout(()=>{
      if(jobs.get(requestId)!==job)return;jobs.delete(requestId);bridge().cancel(requestId);
      if(job.created)bridge().release(sourceId);reject(new Error('Obróbka trwa zbyt długo. Spróbuj ponownie.'));
    },30000)};
    jobs.set(requestId,job);
    try{
      if(job.created){
        if(page.scanId){if(!bridge().camera(sourceId,page.scanId,page.scanPage))throw new Error('Nie udało się otworzyć skanu.');}
        else{
          const blob=page.originalBlob||page.blob;
          if(!blob||!bridge().begin(sourceId,blob.size))throw new Error('Nie udało się przygotować zdjęcia. Limit to 100 MB.');
          const bytes=new Uint8Array(await blob.arrayBuffer());
          for(let offset=0,index=0;offset<bytes.length;offset+=CHUNK,index++){
            if(!jobs.has(requestId))return await promise;
            if(!bridge().append(sourceId,index,encode(bytes.subarray(offset,offset+CHUNK))))throw new Error('Nie udało się przekazać całego zdjęcia.');
            if(index%4===0)await new Promise(next=>setTimeout(next,0));
          }
        }
      }
      if(jobs.has(requestId)&&!bridge().process(requestId,sourceId,JSON.stringify({mode,quad,rotation})))throw new Error('Silnik skanera jest zajęty. Spróbuj ponownie.');
    }catch(error){
      if(jobs.get(requestId)===job){jobs.delete(requestId);clearTimeout(job.timer);if(job.created)bridge().release(sourceId);job.reject(error);}
    }
    const result=await promise;
    try{
      const response=await fetch(result.url);if(!response.ok)throw new Error('Nie udało się odczytać ulepszonego skanu.');
      const blob=await response.blob();if(blob.size<8)throw new Error('Pusty wynik skanera.');
      return {...result,blob};
    }catch(error){if(job.created)bridge().release(sourceId);throw error;}
  }
  window.CmrEnhancement={available,process,receive,release,stop};
})();
