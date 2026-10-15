/* Run the SS document pipeline in one local worker, including Android file://. */
(function(){
  'use strict';
  let state=null,sequence=0;
  function stop(message='Przerwano obróbkę dokumentu.',expected=null){
    if(expected&&state!==expected)return;
    const old=state;state=null;if(!old)return;
    clearTimeout(old.timer);old.worker?.terminate();
    if(old.url)URL.revokeObjectURL(old.url);
    old.rejectReady?.(new Error(message));
    for(const job of old.jobs.values()){clearTimeout(job.timer);job.reject(new Error(message));}
    old.jobs.clear();
  }
  async function initialize(){
    if(state)return state.ready;
    if(typeof Worker!=='function'||!window.SsDocumentScannerCoreFactory||!window.CmrPaperScannerFactory)throw new Error('Ten WebView nie obsługuje silnika skanera SS. Zaktualizuj Android System WebView.');
    const current={worker:null,url:null,jobs:new Map(),timer:null,rejectReady:null,ready:null};
    state=current;
    current.ready=(async()=>{
      let cvSource;
      if(typeof window.SuperSpedytorNative?.getDocumentProcessingScript==='function')cvSource=window.SuperSpedytorNative.getDocumentProcessingScript();
      else{
        const response=await fetch('vendor/opencv-4.13.0.js');
        if(!response.ok)throw new Error('Brakuje lokalnego silnika obrazu.');
        cvSource=await response.text();
      }
      if(state!==current)throw new Error('Przerwano obróbkę dokumentu.');
      if(typeof cvSource!=='string'||cvSource.length<1000000||cvSource.length>12*1024*1024)throw new Error('Brakuje lokalnego silnika obrazu. Zaktualizuj aplikację.');
      const code=[cvSource,'\nself.SsDocumentScannerCore=(',window.SsDocumentScannerCoreFactory.toString(),')();\nself.CmrPaperScanner=(',window.CmrPaperScannerFactory.toString(),')(self.SsDocumentScannerCore);\n',`
        let initialized=false;
        const loaded=()=>{if(!initialized){initialized=true;self.postMessage({ready:true});}};
        if(self.cv.Mat)loaded();else self.cv.onRuntimeInitialized=loaded;
        self.onmessage=event=>{
          const {id,action,input}=event.data;
          try{
            if(!initialized)throw new Error('Silnik obrazu nie jest gotowy.');
            const result=action==='detect'
              ?self.CmrPaperScanner.detect(self.cv,input.data,input.width,input.height)
              :self.CmrPaperScanner.process(self.cv,input.data,input.width,input.height,input.quad,input.mode,{refine:input.refine===true});
            self.postMessage({id,result},result.data?[result.data.buffer]:[]);
          }catch(error){self.postMessage({id,error:typeof error?.message==='string'?error.message:'Nie udało się przetworzyć dokumentu.'});}
        };
      `].join('');
      current.url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));
      return await new Promise((resolve,reject)=>{
        current.rejectReady=reject;
        current.timer=setTimeout(()=>stop('Uruchomienie skanera SS trwa zbyt długo. Spróbuj ponownie.',current),20000);
        current.worker=new Worker(current.url);
        current.worker.onerror=()=>stop('Silnik skanera został zatrzymany. Zamknij inne aplikacje i spróbuj ponownie.',current);
        current.worker.onmessage=event=>{
          const data=event.data;
          if(data.ready){clearTimeout(current.timer);current.rejectReady=null;resolve(current);return;}
          const job=current.jobs.get(data.id);if(!job)return;
          current.jobs.delete(data.id);clearTimeout(job.timer);
          if(data.error)job.reject(new Error(data.error));else job.resolve(data.result);
        };
      });
    })();
    current.ready.catch(()=>{if(state===current)stop();});
    return current.ready;
  }
  async function run(action,input){
    if(!['detect','process'].includes(action))throw new Error('Nieprawidłowa operacja skanera.');
    const current=await initialize();
    if(state!==current)throw new Error('Przerwano obróbkę dokumentu.');
    return await new Promise((resolve,reject)=>{
      const id=++sequence;
      const timer=setTimeout(()=>stop('Obróbka dokumentu trwa zbyt długo. Spróbuj ponownie.',current),30000);
      current.jobs.set(id,{resolve,reject,timer});
      try{current.worker.postMessage({id,action,input},[input.data.buffer]);}
      catch{current.jobs.delete(id);clearTimeout(timer);reject(new Error('Nie udało się przekazać zdjęcia do obróbki.'));}
    });
  }
  window.CmrDocumentProcessing={run,stop};
})();
