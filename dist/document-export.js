/* Offline PDF export: Android's document picker/share sheet, or browser download. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.CmrDocumentExport=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const CHUNK_BYTES=192*1024,MAX_BYTES=100*1024*1024;
  const waiting=new Map();
  const messages={saved:'Zapisano dokument PDF.',shared:'Otwarto ekran udostępniania PDF.',opened:'Otwarto podgląd dokumentu PDF.',cancelled:'Anulowano zapis PDF.'};
  const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
  function encode(bytes){
    let binary='';
    for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    return btoa(binary);
  }
  function receive(result){
    try{if(typeof result==='string')result=JSON.parse(result);}catch{return;}
    const job=waiting.get(result?.requestId);
    if(!job){if(result?.status==='attached'&&/^[a-f0-9]{32}$/.test(result.file?.token||''))try{globalThis.SuperSpedytorNative?.releaseFile?.(result.file.token);}catch{}return;}
    waiting.delete(result.requestId);
    if(result.status==='error')job.reject(new Error(result.message||'Nie udało się wyeksportować PDF. Spróbuj ponownie.'));
    else if(result.status==='attached'&&result.file?.status==='ok'&&/^[a-f0-9]{32}$/.test(result.file.token||'')&&result.file.mime==='application/pdf')job.resolve({status:'attached',file:result.file});
    else if(Object.prototype.hasOwnProperty.call(messages,result.status))job.resolve({status:result.status,message:messages[result.status]});
    else job.reject(new Error('Nie udało się potwierdzić eksportu PDF.'));
  }
  function cancel(requestId){
    const job=waiting.get(requestId);if(!job)return;
    waiting.delete(requestId);
    try{job.native.cancelPdfExport(requestId);}catch{}
    job.resolve({status:'cancelled',message:messages.cancelled});
  }
  function cancelAll(){for(const requestId of [...waiting.keys()])cancel(requestId);}
  async function start(document,action,{native,requestId,onProgress=()=>{}}={}){
    if(!['save','share','view','attach'].includes(action))throw new Error('Nieobsługiwana czynność PDF.');
    if(!native||typeof native.beginPdfExport!=='function')throw new Error('Ta instalacja nie obsługuje eksportu PDF. Zaktualizuj aplikację.');
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId||''))throw new Error('Nie udało się bezpiecznie rozpocząć eksportu PDF.');
    if(waiting.size)throw new Error('Dokończ bieżący eksport PDF.');
    if(document.mime!=='application/pdf'||!document.blob||document.blob.size<5||document.blob.size>MAX_BYTES||!/^[a-f0-9]{64}$/.test(document.hash||''))throw new Error('Dokument PDF jest nieprawidłowy lub przekracza 100 MB.');
    // Register before invoking the bridge: native validation may answer immediately.
    let resolveJob,rejectJob;
    const completion=new Promise((resolve,reject)=>{resolveJob=resolve;rejectJob=reject;});
    completion.catch(()=>{});
    waiting.set(requestId,{native,resolve:resolveJob,reject:rejectJob});
    try{
      const bytes=new Uint8Array(await document.blob.arrayBuffer());
      if(!waiting.has(requestId))return await completion;
      if(!native.beginPdfExport(requestId,document.name,bytes.length,document.hash))throw new Error('Nie udało się przygotować pliku PDF do eksportu.');
      for(let offset=0,index=0;offset<bytes.length;offset+=CHUNK_BYTES,index++){
        if(!waiting.has(requestId))return await completion;
        const chunk=bytes.subarray(offset,Math.min(bytes.length,offset+CHUNK_BYTES));
        if(!native.appendPdfExport(requestId,index,encode(chunk)))throw new Error('Nie udało się przekazać całego PDF do zapisu.');
        onProgress(Math.min(bytes.length,offset+chunk.length),bytes.length);
        if(index%4===0)await pause();
      }
      if(waiting.has(requestId)&&!native.finishPdfExport(requestId,action))throw new Error('Nie udało się otworzyć eksportu PDF.');
    }catch(error){
      const job=waiting.get(requestId);waiting.delete(requestId);
      try{native.cancelPdfExport(requestId);}catch{}
      if(job)job.reject(error);
    }
    return completion;
  }
  return {start,receive,cancel,cancelAll,CHUNK_BYTES,MAX_BYTES};
});
