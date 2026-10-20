(function(){
  'use strict';
  const quality=window.CmrScanQuality;
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const icon=name=>`<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const native=()=>window.SuperSpedytorNative;
  const available=()=>typeof native()?.scanQr==='function';
  const androidApp=()=>new URLSearchParams(window.location.search).get('android')==='1'&&!window.SuperSpedytorWeb;
  const liveCamera=()=>typeof native()?.scanCmr==='function';
  // AA8 uses its own ML Kit/token bridge for live operations. The view-only
  // scanner must not pretend that bridge implements CameraX or local AI.
  const pdfImportOnly=()=>androidApp()&&(!liveCamera()||typeof native()?.getDocumentProcessingScript!=='function');
  const pdfExportAvailable=()=>['beginPdfExport','appendPdfExport','finishPdfExport','cancelPdfExport'].every(name=>typeof native()?.[name]==='function');
  const legacyImportMessage='Ta wersja aplikacji obsługuje tutaj import gotowego PDF. Obróbkę zdjęć i podgląd skanera sprawdzisz w przeglądarce. Skanowanie w aktywnym załadunku i rozładunku korzysta z osobnego skanera aplikacji.';
  const legacyExportMessage='Ta wersja aplikacji nie obsługuje tutaj otwierania, zapisu ani udostępniania PDF. Możesz sprawdzić dokument i dodać go w tym teście widoków; eksport PDF sprawdzisz w przeglądarce.';
  const appVersion=()=>{try{return (native()||window.SuperSpedytorWeb)?.getAppVersion?.()||'Podgląd';}catch{return 'Podgląd';}};
  const launchIdError='Nie udało się bezpiecznie uruchomić skanera. Zaktualizuj Android System WebView i spróbuj ponownie.';
  const id=()=>{
    if(typeof crypto==='undefined')throw new Error('Secure randomness unavailable');
    if(typeof crypto.randomUUID==='function')return crypto.randomUUID();
    // Older Android WebView supports secure random bytes but not randomUUID.
    // Keep UUIDv4 request tokens without replacing secure randomness with time.
    if(typeof crypto.getRandomValues!=='function')throw new Error('Secure randomness unavailable');
    const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);
    bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
    const hex=Array.from(bytes,value=>value.toString(16).padStart(2,'0')).join('');
    return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
  };
  let session=null,pending=null,qrPending=null,previousFocus=null;
  const consumedRequests=new Set();
  const root=()=>document.getElementById('scanner-root');
  const active=()=>session?.pages[session.index];

  function release(page){
    page?.sourcePages?.forEach(release);
    for(const url of new Set([page?.url,page?.originalUrl,page?.thumbnailUrl]))if(url?.startsWith('blob:'))URL.revokeObjectURL(url);
    if(page?.scanId)try{native()?.releaseScanPage(page.scanId,page.scanPage);}catch{}
  }
  function cancelPending(){
    if(pending)try{native()?.cancelScan(pending.id);}catch{}
    pending=null;
  }
  function close(keep=false){
    cancelPending();
    session?.documentJob?.abort();
    window.CmrDocumentExport?.cancelAll();
    window.CmrDocumentProcessing?.stop();
    window.CmrDocumentAi?.stop();
    if(session)session.generation++;
    if(!keep){session?.pages.forEach(release);release(session?.document);}
    session=null;root().innerHTML='';
    if(previousFocus?.isConnected)previousFocus.focus();
  }
  function open(options){
    if(session)close();
    previousFocus=document.activeElement;
    session={options,pages:[],index:0,stage:'intro',error:'',replace:null,generation:0,document:null,exporting:false,exportMessage:''};
    render();
  }
  const checks=[
    ['edges','Cała kartka jest widoczna','Żaden narożnik, numer ani dopisek nie jest ucięty.'],
    ['text','Tekst, podpisy i pieczątki są czytelne','Sprawdziłem drobny druk w powiększeniu.'],
    ['color','Kolory zgadzają się z papierem','Filtr zachował kolory pieczątek i długopisu.']
  ];
  function render(preserveScroll=false){
    if(!session)return;
    const scroll=preserveScroll?(root().querySelector('.scanner-body')?.scrollTop||0):0;
    const s=session,page=active();
    let content='';
    if(s.stage==='intro'&&pdfImportOnly())content=`<div class="scanner-intro-copy"><span class="scanner-eyebrow">CMR · TEST WIDOKÓW</span><h2>Sprawdź gotowy dokument PDF</h2><p>${legacyImportMessage}</p></div><button class="primary-button" data-scan-start>${icon('upload')}Wybierz gotowy PDF</button><button class="secondary-button" data-scan-import>${icon('upload')}Importuj PDF</button><p class="scanner-local-note">Do 20 stron · 100 MB łącznie<br>Import i podgląd nie oznaczają wysłania dokumentu do TMS.</p>`;
    else if(s.stage==='intro')content=`<div class="scanner-intro-art" aria-hidden="true"><div class="scanner-corners"></div><div class="scanner-paper"><span>CMR</span><i></i><i></i><i></i><div class="scanner-paper-stamp">AMG</div><b>podpis</b></div></div><div class="scanner-intro-copy"><span class="scanner-eyebrow">CMR · SKANOWANIE NA ŻYWO</span><h2>Ustaw kartkę.<br>Skan zrobi się sam.</h2><p>Rozłóż dokument i ustaw całą kartkę w kadrze. Zielony obrys i stabilny obraz uruchomią skan automatycznie.</p></div><div class="scanner-features"><span>${icon('doc')} Obrys na żywo</span><span><b class="scanner-color-dot"></b> Kolor pieczątek</span><span>${icon('check')} Automatyczny skan</span></div><div class="scanner-color-tip">${icon('info')}<p><strong>Kolor dokumentu:</strong> wycinamy kartkę, prostujemy perspektywę, wyrównujemy cienie i wzmacniamy pismo. Wszystkie strony zapiszesz w jednym PDF. W podglądzie możesz poprawić rogi i porównać oryginał.</p></div>${liveCamera()?'<p class="scanner-platform-note">Skanowanie i poprawa koloru odbywają się na telefonie, również bez internetu.</p>':'<p class="scanner-platform-note">Skaner na żywo jest dostępny w aplikacji Android. Tutaj możesz wybrać i poprawić gotowe zdjęcia.</p>'}<button class="primary-button" data-scan-start>${icon('camera')}${liveCamera()?'Uruchom skaner CMR':'Wybierz zdjęcie CMR'}</button><button class="secondary-button" data-scan-import>${icon('upload')}Wybierz zdjęcia lub PDF</button><p class="scanner-local-note">Do 20 stron · 100 MB łącznie<br>Dokument dodasz dopiero po sprawdzeniu podglądu.</p>`;
    else if(s.stage==='waiting')content=`<div class="scanner-loading" role="status"><span></span><h2>${s.processing?'Wycinam i ulepszam…':'Uruchamiam skaner na żywo…'}</h2><p>${s.pages.length&&quality.packetReady(s.pages)?'Składam wszystkie sprawdzone strony w jeden dokument PDF.':pdfImportOnly()?'Sprawdzam gotowy dokument PDF. Plik pozostaje w lokalnym teście widoków.':'AI wykrywa obszar kartki i jej cztery rogi. Prostuję perspektywę i wyrównuję oświetlenie. Zachowuję oryginał zdjęcia.'}</p></div><button class="secondary-button" data-scan-cancel-wait>Wróć</button>`;
    else if(s.stage==='document'&&s.document){
      const doc=s.document,first=s.pages.find(p=>p.mime!=='application/pdf');
      content=`<div class="scanner-review-heading"><span class="scanner-eyebrow">DOKUMENT DO ZAPISANIA</span><h2>Dokument PDF gotowy</h2><span class="scanner-review-status checked">${icon('doc')} ${doc.pageCount} ${doc.pageCount===1?'strona':doc.pageCount<5?'strony':'stron'} · PDF w kolorze</span></div><div class="scanner-document scanner-pdf">${androidApp()?`${first?`<img src="${escape(first.url)}" alt="Podgląd pierwszej zeskanowanej strony dokumentu PDF">`:icon('doc')}<p>Plik PDF zawiera ${doc.pageCount} ${doc.pageCount===1?'stronę':doc.pageCount<5?'strony':'stron'} w kolejności skanowania.</p>`:`<iframe title="Gotowy dokument PDF — wszystkie strony" src="${escape(doc.url)}"></iframe>`}</div><div class="scanner-file-meta"><span>${escape(doc.name)}</span><span>${(doc.size/1024/1024).toFixed(1)} MB · PDF</span></div>${s.exportMessage?`<p class="scanner-export-status" role="status">${escape(s.exportMessage)}</p>`:''}${androidApp()&&!pdfExportAvailable()?`<p class="scanner-platform-note">${legacyExportMessage}</p>`: ''}<div class="scanner-pdf-actions"><button class="secondary-button" data-document-view ${s.exporting||androidApp()&&!pdfExportAvailable()?'disabled':''}>${icon('doc')}Otwórz PDF</button><button class="secondary-button" data-document-save ${s.exporting||androidApp()&&!pdfExportAvailable()?'disabled':''}>${icon('upload')}Zapisz PDF</button>${androidApp()?`<button class="secondary-button" data-document-share ${s.exporting||!pdfExportAvailable()?'disabled':''}>Udostępnij PDF</button>`:''}</div><button class="primary-button" data-document-accept ${s.exporting?'disabled':''}>${icon('check')}Dodaj dokument PDF</button><button class="secondary-button" data-document-back ${s.exporting?'disabled':''}>Wróć do stron i popraw</button><p class="scanner-local-note">PDF zachowuje pełną rozdzielczość skanów i kolory. Sam zapis lub udostępnienie nie potwierdza przyjęcia CMR w TMS.</p>`;
    }
    else if(page){
      const ready=quality.pageReady(page),count=s.pages.filter(quality.pageReady).length;
      content=`<div class="scanner-review-heading"><span class="scanner-eyebrow">SPRAWDŹ PRZED DODANIEM</span><h2>Strona ${s.index+1} z ${s.pages.length}</h2><span class="scanner-review-status ${ready?'checked':''}">${icon(ready?'check':'doc')}${ready?'Sprawdzona przez kierowcę':page.mime==='application/pdf'?'PDF · sprawdź wszystkie strony':page.needsCrop?'Ustaw rogi przed dodaniem':page.paperProcessing?.mode==='natural'?'Wycięta kartka · naturalny':'Wycięta kartka · kolor'}</span></div><div class="scanner-document ${page.mime==='application/pdf'?'scanner-pdf':''}">${page.mime==='application/pdf'?`<iframe title="Podgląd wszystkich stron PDF" src="${escape(page.url)}"></iframe><a href="${escape(page.url)}" target="_blank" rel="noopener">Otwórz PDF</a><p>Jeśli telefon nie pokazuje PDF, wróć i zeskanuj papierowy CMR.</p>`:`<button class="scanner-image-button" data-scan-zoom aria-label="Powiększ skan"><img src="${escape(page.url)}" alt="Skan CMR, strona ${s.index+1}"><span>${icon('plus')}Powiększ tekst i podpisy</span></button>`}</div><div class="scanner-file-meta"><span>${page.width?`${page.width} × ${page.height} px`:'Oryginalny PDF'}</span><span>${(page.size/1024/1024).toFixed(1)} MB${page.paperProcessing?' · Strona do PDF · pełna jakość':''}</span></div>${page.originalUrl?`<div class="scanner-edit-actions"><button class="secondary-button" data-scan-crop>${page.needsCrop?'Ustaw rogi kartki':'Popraw rogi'}</button><button class="secondary-button" data-scan-original>Porównaj oryginał</button></div>${!page.needsCrop?`<div class="scanner-filter-row"><label for="scan-filter">Wygląd skanu</label><select id="scan-filter" data-scan-filter><option value="color" ${page.paperProcessing?.mode==='color'?'selected':''}>Dokument · kolor i usuwanie cieni</option><option value="natural" ${page.paperProcessing?.mode==='natural'?'selected':''}>Naturalny · tylko wycięcie</option></select><button class="secondary-button" data-scan-rotate aria-label="Obróć skan o 90 stopni">↻ Obróć</button></div>`:''}`:''}${page.quality.issues.length?`<div class="scanner-issues ${page.quality.blocked?'blocked':''}" role="status">${icon(page.quality.blocked?'warning':'info')}<div>${page.quality.issues.map(issue=>`<p>${escape(issue)}</p>`).join('')}</div></div>`:''}<div class="scanner-checks">${checks.map(([key,title,help])=>`<label><input type="checkbox" data-scan-check="${key}" ${page.checks[key]?'checked':''} ${page.quality.blocked?'disabled':''}><span><strong>${title}</strong><small>${help}</small></span></label>`).join('')}</div><div class="scanner-page-actions"><button class="secondary-button" data-scan-retake>${icon('camera')}Powtórz tę stronę</button><button class="scanner-delete" data-scan-delete aria-label="Usuń tę stronę">${icon('close')}</button></div><div class="scanner-thumbnails" aria-label="Strony CMR">${s.pages.map((p,i)=>`<button data-scan-page="${i}" class="${i===s.index?'active':''} ${quality.pageReady(p)?'checked':''}" aria-label="Strona ${i+1}${quality.pageReady(p)?', sprawdzona':''}" aria-current="${i===s.index?'page':'false'}">${p.mime==='application/pdf'?icon('doc'):`<img src="${escape(p.thumbnailUrl||p.url)}" alt="">`}<span>${i+1}</span>${quality.pageReady(p)?icon('check'):''}</button>`).join('')}<button data-scan-add aria-label="Dodaj kolejne strony">${icon('plus')}</button></div><div class="scanner-footer-progress"><span>Sprawdzono <strong>${count} z ${s.pages.length}</strong></span><small>Każda strona wymaga sprawdzenia</small></div><button class="primary-button" data-scan-accept ${quality.packetReady(s.pages)?'':'disabled'}>${icon('check')}Utwórz dokument PDF</button><p class="scanner-local-note">Materiały pozostają w lokalnym teście widoków.</p>`;
    }
    root().innerHTML=`<div class="scanner-overlay"><section class="scanner-sheet" role="dialog" aria-modal="true" aria-labelledby="scanner-title" tabindex="-1"><header class="scanner-header"><div><span>${icon('doc')}</span><p id="scanner-title">Skan CMR<small>${escape(appVersion())} · skaner CMR</small></p></div><button class="icon-button" data-scan-close aria-label="Zamknij skaner">${icon('close')}</button></header><div class="scanner-body">${s.error?`<p class="scanner-error" role="alert">${escape(s.error)}</p>`:''}${content}</div><input type="file" data-scanner-input accept="image/*,application/pdf" multiple hidden></section></div>`;
    root().querySelector('[data-scan-close]').onclick=()=>close();
    const bind=(selector,handler)=>{const node=root().querySelector(selector);if(node)node.onclick=handler;};
    bind('[data-scan-start]',()=>capture());
    bind('[data-scan-import]',()=>chooseFiles(false));
    bind('[data-scan-add]',()=>{if(s.pages.length>=quality.MAX_PAGES){s.error='Limit to 20 stron w jednym skanie.';render();return;}capture();});
    bind('[data-scan-retake]',()=>capture(s.index));
    bind('[data-scan-cancel-wait]',()=>{cancelPending();s.documentJob?.abort();window.CmrDocumentProcessing?.stop();window.CmrDocumentAi?.stop();s.generation++;s.stage=s.pages.length?'review':'intro';s.processing=false;render();});
    bind('[data-scan-delete]',()=>{release(s.pages.splice(s.index,1)[0]);s.index=Math.max(0,Math.min(s.index,s.pages.length-1));s.stage=s.pages.length?'review':'intro';render();});
    bind('[data-scan-zoom]',()=>zoom(page));
    bind('[data-scan-original]',()=>zoom({...page,url:page.originalUrl},true));
    bind('[data-scan-crop]',()=>editCrop(page));
    bind('[data-scan-rotate]',()=>reprocess(page,{rotation:((page.rotation||0)+1)%4}));
    const filter=root().querySelector('[data-scan-filter]');if(filter)filter.onchange=()=>reprocess(page,{mode:filter.value});
    bind('[data-scan-accept]',()=>createDocument());
    bind('[data-document-save]',()=>exportDocument('save'));
    bind('[data-document-share]',()=>exportDocument('share'));
    bind('[data-document-view]',()=>exportDocument('view'));
    bind('[data-document-back]',()=>{if(s.exporting)return;release(s.document);s.document=null;s.stage='review';s.exportMessage='';render();});
    bind('[data-document-accept]',()=>{
      if(s.exporting||!s.document||!quality.packetReady(s.pages))return;
      const pages=s.pages.map(page=>({...page,qualityReview:{version:2,checks:{...page.checks},checkedAt:new Date().toISOString(),width:page.width,height:page.height,issues:[...page.quality.issues]}}));
      const doc={...s.document,sourcePages:pages,qualityReview:{version:2,checkedAt:new Date().toISOString(),pageCount:s.document.pageCount,pages:pages.map(p=>({hash:p.hash,width:p.width,height:p.height,pageCount:p.pageCount||1,paperProcessing:p.paperProcessing,checks:{...p.checks}}))}};
      // One actual PDF is the evidence item; the caller owns its sources too.
      try{if(s.options.onAccept([doc])!==false)close(true);else{s.error='Zlecenie lub plomba się zmieniły. Zamknij skaner i otwórz go ponownie dla właściwego CMR.';render(true);}}
      catch{s.error='Nie udało się dodać dokumentu PDF. Spróbuj ponownie.';render(true);}
    });
    root().querySelectorAll('[data-scan-page]').forEach(button=>button.onclick=()=>{s.index=Number(button.dataset.scanPage);render();});
    root().querySelectorAll('[data-scan-check]').forEach(input=>input.onchange=()=>{
      page.checks[input.dataset.scanCheck]=input.checked;
      // Keep checkbox focus stable while refreshing progress and action state.
      const key=input.dataset.scanCheck;render(true);root().querySelector(`[data-scan-check="${key}"]`)?.focus({preventScroll:true});
    });
    root().querySelector('[data-scanner-input]').onchange=event=>importFiles([...event.target.files]);
    root().querySelector('.scanner-sheet').focus({preventScroll:true});
    root().querySelector('.scanner-body').scrollTop=scroll;
  }

  async function createDocument(){
    const s=session;if(!s||!quality.packetReady(s.pages))return;
    const generation=s.generation;
    s.stage='waiting';s.processing=true;s.error='';render();
    try{
      if(!window.CmrDocumentPdf||!window.PDFLib)throw new Error('Brakuje modułu dokumentów PDF. Zaktualizuj aplikację.');
      s.documentJob=new AbortController();
      const {bytes,...doc}=await window.CmrDocumentPdf.create(s.pages,{PDFLib:window.PDFLib,signal:s.documentJob.signal});
      if(session!==s||s.generation!==generation)return;
      release(s.document);
      s.document={...doc,url:URL.createObjectURL(doc.blob)};
      s.stage='document';s.processing=false;render();
    }catch(error){
      if(session!==s||s.generation!==generation)return;
      s.error=error.message||'Nie udało się utworzyć PDF. Strony pozostały w skanerze.';
      s.stage='review';s.processing=false;render();
    }
  }
  async function exportDocument(action){
    const s=session;if(!s?.document||s.exporting)return;
    s.error='';s.exportMessage='';
    if(androidApp()&&!pdfExportAvailable()){s.error=legacyExportMessage;render(true);return;}
    if(!androidApp()){
      if(action==='view'){window.open(s.document.url,'_blank','noopener');return;}
      const link=document.createElement('a');link.href=s.document.url;link.download=s.document.name;
      document.body.append(link);link.click();link.remove();
      s.exportMessage='Rozpoczęto pobieranie dokumentu PDF.';render(true);return;
    }
    s.exporting=true;s.exportMessage='Przygotowuję dokument PDF…';render(true);
    try{
      const result=await window.CmrDocumentExport.start(s.document,action,{native:native(),requestId:id()});
      if(session===s)s.exportMessage=result.message;
    }catch(error){if(session===s){s.error=error.message||'Nie udało się zapisać PDF.';s.exportMessage='';}}
    finally{if(session===s){s.exporting=false;render(true);}}
  }
  function chooseFiles(camera,replace=null){
    session.replace=replace;
    const input=root().querySelector('[data-scanner-input]');
    input.value='';input.multiple=replace===null;input.accept=pdfImportOnly()?'application/pdf':camera?'image/*':'image/*,application/pdf';
    if(camera)input.setAttribute('capture','environment');else input.removeAttribute('capture');
    input.click();
  }
  function capture(replace=null){
    if(!session)return;
    if(pdfImportOnly()){
      session.error=legacyImportMessage;
      render();chooseFiles(false,replace);return;
    }
    if(!liveCamera()){
      chooseFiles(false,replace);return;
    }
    const s=session;let requestId;
    try{requestId=id();}catch{s.error=launchIdError;render();return;}
    s.replace=replace;s.stage='waiting';s.processing=false;s.error='';
    pending={id:requestId,session:s,replace};render();
    try{native().scanCmr(requestId);}catch{pending=null;s.stage=s.pages.length?'review':'intro';s.error='Nie udało się uruchomić skanera. Spróbuj ponownie lub wybierz gotowe zdjęcie.';render();}
  }
  async function imageInfo(url){
    const image=await new Promise((resolve,reject)=>{const img=new Image();img.crossOrigin='anonymous';img.onload=()=>resolve(img);img.onerror=reject;img.src=url;});
    if(image.naturalWidth*image.naturalHeight>80000000)throw new Error('Zdjęcie przekracza 80 megapikseli. Wybierz standardową rozdzielczość aparatu.');
    const scale=Math.min(1,1280/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.max(3,Math.round(image.naturalWidth*scale));canvas.height=Math.max(3,Math.round(image.naturalHeight*scale));
    const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0,canvas.width,canvas.height);
    return {width:image.naturalWidth,height:image.naturalHeight,metrics:quality.pixels(context.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height)};
  }
  function assessPage(page,info={}){
    const assessment=quality.assess({...page,...info});
    if(page.needsCrop){assessment.blocked=true;assessment.issues.unshift('Nie wykryłem pewnie granic kartki. Ustaw jej cztery rogi, aby zachować całą stronę.');}
    return assessment;
  }
  async function prepare(page){
    const input=page;
    try{
    if(page.mime!=='application/pdf'&&pdfImportOnly())throw new Error(legacyImportMessage);
    if(page.mime==='application/pdf'){
      if(!window.CmrDocumentPdf||!window.PDFLib)throw new Error('Brakuje modułu dokumentów PDF. Zaktualizuj aplikację.');
      const info=await window.CmrDocumentPdf.inspectPdf(await page.blob.arrayBuffer(),{PDFLib:window.PDFLib});
      page={...page,pageCount:info.pageCount};
    }
    if(page.mime!=='application/pdf'&&!page.paperProcessing)page=await detectAndProcess(page);
    const info=page.mime==='application/pdf'?{}:await imageInfo(page.url);
    const assessment=assessPage(page,info);
    return {...page,...info,quality:assessment,checks:{edges:false,text:false,color:false}};
    }catch(error){
      // append() still owns the incoming original. A failed decode/quality
      // assessment must also release the newly processed preview and thumbnail.
      if(page!==input)for(const url of new Set([page.url,page.thumbnailUrl]))if(url&&url!==input.url&&url.startsWith('blob:'))URL.revokeObjectURL(url);
      throw error;
    }
  }
  async function append(pages,s,replace,generation=s.generation){
    let prepared=[];
    try{
      const totalPages=s.pages.length-(replace===null?0:1)+pages.length;
      const bytes=s.pages.reduce((sum,p,i)=>sum+(i===replace?0:p.size),0)+pages.reduce((sum,p)=>sum+p.size,0);
      if(totalPages>quality.MAX_PAGES||bytes>quality.MAX_BYTES)throw new Error('Limit to 20 stron i 100 MB łącznie. Podziel dokument na mniejsze zestawy.');
      if(replace!==null&&pages.length!==1)throw new Error('Przy powtórzeniu wybierz dokładnie jedną stronę.');
      const hashes=new Set(s.pages.filter((_,i)=>i!==replace).map(p=>p.originalHash||p.hash));
      for(const page of pages){if(hashes.has(page.hash))throw new Error('Ten sam plik jest już w bieżącym skanie. Wybierz kolejną stronę.');hashes.add(page.hash);}
      s.stage='waiting';s.processing=true;render();
      for(const page of pages){
        if(session!==s||s.generation!==generation)break;
        prepared.push(await prepare(page));
      }
      const outputBytes=s.pages.reduce((sum,p,i)=>sum+(i===replace?0:p.size),0)+prepared.reduce((sum,p)=>sum+p.size,0);
      const actualPages=s.pages.reduce((sum,p,i)=>sum+(i===replace?0:(p.pageCount||1)),0)+prepared.reduce((sum,p)=>sum+(p.pageCount||1),0);
      if(actualPages>quality.MAX_PAGES)throw new Error('Dokument może zawierać maksymalnie 20 stron, także wewnątrz importowanych PDF.');
      if(outputBytes>quality.MAX_BYTES)throw new Error('Przetworzone skany przekraczają 100 MB. Podziel dokument na mniejsze zestawy.');
      if(session!==s||s.generation!==generation){[...pages,...prepared].forEach(release);return;}
      if(replace!==null){release(s.pages[replace]);s.pages.splice(replace,1,...prepared);s.index=replace;}
      else{s.index=s.pages.length;s.pages.push(...prepared);}
      s.error='';s.stage='review';s.processing=false;render();if(active()?.needsCrop)editCrop(active());
    }catch(error){
      [...pages,...prepared].forEach(release);
      if(session!==s||s.generation!==generation)return;
      s.error=error instanceof Error?error.message:'Nie udało się odczytać stron. Wybierz JPG, PNG lub poprawny PDF.';
      s.stage=s.pages.length?'review':'intro';s.processing=false;render();
    }
  }
  async function importFiles(files){
    if(!session||!files.length)return;
    const s=session,replace=s.replace,generation=s.generation,pages=[];
    // Put the read step under the same session boundary as native results.
    s.stage='waiting';s.processing=true;render();
    try{
      if(files.length>quality.MAX_PAGES)throw new Error('Wybierz maksymalnie 20 stron.');
      let bytes=0;
      for(const file of files){
        bytes+=file.size;if(bytes>quality.MAX_BYTES)throw new Error('Limit zestawu to 100 MB.');
        const pdf=file.type==='application/pdf'||(!file.type&&/\.pdf$/i.test(file.name));
        if(!pdf&&!file.type.startsWith('image/'))throw new Error('Wybierz zdjęcia JPG, PNG lub plik PDF.');
        const buffer=await file.arrayBuffer();
        if(pdf&&new TextDecoder().decode(buffer.slice(0,5))!=='%PDF-')throw new Error('Plik nie jest poprawnym PDF.');
        const digest=await crypto.subtle.digest('SHA-256',buffer);
        pages.push({url:URL.createObjectURL(file),blob:file,name:file.name,mime:pdf?'application/pdf':file.type,size:file.size,hash:[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join(''),engine:'import'});
      }
      if(session!==s||s.generation!==generation){pages.forEach(release);return;}
      await append(pages,s,replace,generation);
    }catch(error){pages.forEach(release);if(session!==s||s.generation!==generation)return;s.error=error.message;s.stage=s.pages.length?'review':'intro';s.processing=false;render();}
  }

  async function runPaper(action,input){
    if(!window.CmrDocumentProcessing)throw new Error('Brakuje modułu skanera SS. Zaktualizuj aplikację.');
    if(action==='detect'){
      let detection;
      try{
        if(!window.CmrDocumentAi)throw new Error('Brakuje modelu granic dokumentu.');
        detection=await window.CmrDocumentAi.detect(input);
        if(detection.confident)return detection;
      }catch(error){
        if(error?.name==='AbortError')throw error;
        detection={quad:null,confident:false,engine:'docquad-review',reason:'ai-unavailable'};
      }
      // A classical edge may be printed inside the page. Without a confident
      // global document mask it is only an editable suggestion, never success.
      const suggestion=await window.CmrDocumentProcessing.run(action,input);
      return {...suggestion,...detection,quad:detection.quad||suggestion.quad,confident:false};
    }
    return window.CmrDocumentProcessing.run(action,input);
  }
  async function decode(url,maxEdge=4200){
    const img=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Nie udało się odczytać zdjęcia. Wybierz JPG lub PNG.'));image.crossOrigin='anonymous';image.src=url;});
    if(img.naturalWidth*img.naturalHeight>80000000)throw new Error('Zdjęcie przekracza 80 megapikseli. Wybierz standardową rozdzielczość aparatu.');
    const scale=Math.min(1,maxEdge/Math.max(img.naturalWidth,img.naturalHeight),Math.sqrt(11000000/(img.naturalWidth*img.naturalHeight)));
    const canvas=document.createElement('canvas');canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);
    const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(img,0,0,canvas.width,canvas.height);
    return {data:context.getImageData(0,0,canvas.width,canvas.height).data,width:canvas.width,height:canvas.height,sourceWidth:img.naturalWidth,sourceHeight:img.naturalHeight};
  }
  async function digest(blob){
    const hash=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());
    return [...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('');
  }
  async function outputPage(page,quad,mode='color',rotation=0){
    const decoded=await decode(page.originalUrl),aiOutline=page.outlineDetection?.engine?.startsWith('docquadnet')===true,
      result=await runPaper('process',{...decoded,quad,mode,refine:!page.manualCrop,aiOutline});
    decoded.data=null;
    const actualQuad=result.quad||quad;
    const canvas=document.createElement('canvas');
    canvas.width=rotation%2?result.height:result.width;canvas.height=rotation%2?result.width:result.height;
    const ctx=canvas.getContext('2d');
    if(!rotation)ctx.putImageData(new ImageData(result.data,result.width,result.height),0,0);
    else{
      const source=document.createElement('canvas');source.width=result.width;source.height=result.height;
      source.getContext('2d').putImageData(new ImageData(result.data,result.width,result.height),0,0);
      ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(rotation*Math.PI/2);ctx.drawImage(source,-source.width/2,-source.height/2);
      source.width=source.height=1;
    }
    const thumbnail=document.createElement('canvas'),scale=240/Math.max(canvas.width,canvas.height);
    thumbnail.width=Math.max(1,Math.round(canvas.width*scale));thumbnail.height=Math.max(1,Math.round(canvas.height*scale));
    thumbnail.getContext('2d').drawImage(canvas,0,0,thumbnail.width,thumbnail.height);
    const thumbnailBlob=await new Promise(resolve=>thumbnail.toBlob(resolve,'image/jpeg',.8));
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.97));
    canvas.width=canvas.height=thumbnail.width=thumbnail.height=1;
    if(!blob)throw new Error('Brak pamięci na zapis skanu. Zamknij inne aplikacje i spróbuj ponownie.');
    const hash=await digest(blob);
    return {...page,url:URL.createObjectURL(blob),thumbnailUrl:thumbnailBlob?URL.createObjectURL(thumbnailBlob):null,blob,mime:'image/jpeg',size:blob.size,hash,engine:'ss-driver-local',needsCrop:aiOutline&&!page.manualCrop&&!result.refined,quad:actualQuad,rotation,
      name:(page.originalName||page.name||'CMR').replace(/\.[^.]+$/,'')+'-skan.jpg',
      paperProcessing:{outlineDetection:page.outlineDetection,version:result.version,mode,manual:!!page.manualCrop,quad:actualQuad,refined:!!result.refined,rotation,sourceEngine:result.sourceEngine,sourceWidth:decoded.sourceWidth,sourceHeight:decoded.sourceHeight,workingWidth:decoded.width,workingHeight:decoded.height}};
  }
  async function detectAndProcess(page){
    const original={...page,originalUrl:page.url,originalBlob:page.blob,originalHash:page.hash,originalName:page.name};
    const sample=await decode(page.url,1100),detection=await runPaper('detect',sample);
    const scale=Math.min(1,4200/Math.max(sample.sourceWidth,sample.sourceHeight),Math.sqrt(11000000/(sample.sourceWidth*sample.sourceHeight)));
    const working={width:Math.round(sample.sourceWidth*scale),height:Math.round(sample.sourceHeight*scale)},sx=working.width/sample.width,sy=working.height/sample.height;
    const quad=detection.quad?.map(p=>({x:p.x*sx,y:p.y*sy}))||[{x:0,y:0},{x:working.width-1,y:0},{x:working.width-1,y:working.height-1},{x:0,y:working.height-1}];
    original.quad=quad;original.workingWidth=working.width;original.workingHeight=working.height;
    original.outlineDetection={engine:detection.engine,score:detection.score,maskIou:detection.maskIou,minPeakProbability:detection.minPeakProbability,reason:detection.reason};
    if(!detection.confident)return {...original,needsCrop:true};
    return outputPage(original,quad);
  }
  async function reprocess(page,changes={},panel=null){
    const s=session,generation=s.generation,index=s.pages.indexOf(page);
    if(index<0)return;
    s.processing=true;s.stage='waiting';s.error='';render();
    let updated;
    try{
      updated=await outputPage({...page,manualCrop:changes.manual??page.paperProcessing?.manual},changes.quad||page.quad,changes.mode||page.paperProcessing?.mode||'color',changes.rotation??page.rotation??0);
      const info=await imageInfo(updated.url);updated={...updated,...info,quality:assessPage(updated,info),checks:{edges:false,text:false,color:false}};
      if(session!==s||s.generation!==generation){for(const url of [updated.url,updated.thumbnailUrl])if(url?.startsWith('blob:'))URL.revokeObjectURL(url);return;}
      if(updated.size+s.pages.reduce((sum,p,i)=>sum+(i===index?0:p.size),0)>quality.MAX_BYTES)throw new Error('Skan przekracza limit 100 MB. Podziel dokument na mniejsze zestawy.');
      if(page.url!==page.originalUrl&&page.url.startsWith('blob:'))URL.revokeObjectURL(page.url);
      if(page.thumbnailUrl)URL.revokeObjectURL(page.thumbnailUrl);
      s.pages[index]=updated;s.index=index;s.stage='review';s.processing=false;render();if(updated.needsCrop)editCrop(updated);
    }catch(error){
      for(const url of [updated?.url,updated?.thumbnailUrl])if(url?.startsWith('blob:'))URL.revokeObjectURL(url);
      if(session!==s||s.generation!==generation)return;
      s.error=error.message;s.stage='review';s.processing=false;render();
    }
  }
  function editCrop(page){
    const panel=document.createElement('div');panel.className='scanner-crop';
    const width=page.workingWidth||page.paperProcessing.workingWidth,height=page.workingHeight||page.paperProcessing.workingHeight;
    const quad=page.quad.map(p=>({...p}));
    panel.innerHTML=`<header><h2>Rogi kartki</h2><p>Przesuń cztery punkty na rogi papieru. Wewnątrz obrysu powinna zostać tylko cała kartka.</p></header><div class="scanner-crop-preview"><img src="${escape(page.originalUrl)}" alt="Oryginalne zdjęcie do wycięcia"><svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="Obrys kartki"><polygon></polygon></svg>${quad.map((_,i)=>`<button class="scanner-crop-handle" data-corner="${i}" aria-label="Róg ${['lewy górny','prawy górny','prawy dolny','lewy dolny'][i]} · przesuń palcem lub strzałkami">${i+1}</button>`).join('')}</div><p class="scanner-crop-error" role="alert"></p><div class="scanner-crop-footer"><button class="secondary-button" data-crop-cancel>Wróć</button><button class="primary-button" data-crop-apply>Wytnij i ulepsz</button></div>`;
    root().querySelector('.scanner-sheet').append(panel);
    const preview=panel.querySelector('.scanner-crop-preview');
    const fit=()=>{const scale=Math.min((panel.clientWidth-72)/width,Math.max(120,panel.clientHeight-250)/height);preview.style.width=width*scale+'px';preview.style.height=height*scale+'px';};
    fit();
    const handles=[...panel.querySelectorAll('[data-corner]')];
    const update=()=>{
      panel.querySelector('polygon').setAttribute('points',quad.map(p=>`${p.x},${p.y}`).join(' '));
      handles.forEach((button,i)=>{button.style.left=quad[i].x/width*100+'%';button.style.top=quad[i].y/height*100+'%';});
      panel.querySelector('[data-crop-apply]').disabled=!CmrPaperScanner.validQuad(quad,width,height);
    };
    handles.forEach((button,i)=>{
      button.onpointerdown=event=>{button.setPointerCapture(event.pointerId);button.classList.add('dragging');};
      button.onpointermove=event=>{
        if(!button.hasPointerCapture(event.pointerId))return;
        const box=preview.getBoundingClientRect();quad[i]={x:Math.max(0,Math.min(width-1,(event.clientX-box.left)/box.width*width)),y:Math.max(0,Math.min(height-1,(event.clientY-box.top)/box.height*height))};update();
      };
      button.onpointerup=event=>{button.releasePointerCapture(event.pointerId);button.classList.remove('dragging');};
      button.onkeydown=event=>{
        if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();
        const step=(event.shiftKey?10:2)*Math.max(width,height)/1000;
        quad[i].x=Math.max(0,Math.min(width-1,quad[i].x+(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0)));
        quad[i].y=Math.max(0,Math.min(height-1,quad[i].y+(event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0)));update();
      };
    });
    panel.querySelector('[data-crop-cancel]').onclick=()=>{panel.remove();root().querySelector('[data-scan-crop]')?.focus();};
    panel.querySelector('[data-crop-apply]').onclick=()=>reprocess(page,{quad,manual:true});
    update();handles[0].focus();
  }

  function zoom(page,original=false){
    const panel=document.createElement('div');panel.className='scanner-zoom';
    panel.innerHTML=`<button class="secondary-button" aria-label="Zamknij powiększenie">${icon('close')}${original?'Oryginał · wróć do skanu':'Wróć do kontroli strony'}</button><div tabindex="0" aria-label="Powiększony skan, przewijaj aby sprawdzić szczegóły"><img src="${escape(page.url)}" alt="Powiększony skan CMR"></div>`;
    root().querySelector('.scanner-sheet').append(panel);
    panel.querySelector('button').onclick=()=>{panel.remove();root().querySelector('[data-scan-zoom]')?.focus();};
    panel.querySelector('button').focus();
  }
  function scanQr(onResult,onError){
    if(qrPending||pending){onError('Skaner jest już otwarty. Dokończ bieżący odczyt.');return;}
    let requestId;try{requestId=id();}catch{onError(launchIdError);return;}
    qrPending={id:requestId,onResult,onError};
    try{native().scanQr(requestId);}catch{qrPending=null;onError('Nie udało się otworzyć czytnika QR. Spróbuj ponownie.');}
  }
  async function receive(json){
    let result;try{result=typeof json==='string'?JSON.parse(json):json;}catch{return;}
    if(qrPending?.id===result.requestId){
      const request=qrPending;qrPending=null;
      if(result.status==='qr')request.onResult(result.value);
      else request.onError(result.status==='error'?result.message:'');
      return;
    }
    if(consumedRequests.has(result.requestId))return;
    if(!pending||pending.id!==result.requestId||pending.session!==session){
      if(result.status==='document')result.pages?.forEach(release);
      return;
    }
    const request=pending;pending=null;consumedRequests.add(result.requestId);
    if(result.status==='document'){await append(result.pages.map(page=>({...page,engine:'camerax-live-paper'})),request.session,request.replace);return;}
    session.stage=session.pages.length?'review':'intro';session.processing=false;
    session.error=result.status==='error'?result.message:'';render();
  }
  document.addEventListener('keydown',event=>{
    if(!session)return;
    event.stopImmediatePropagation();
    const zoomPanel=root().querySelector('.scanner-zoom,.scanner-crop');
    if(event.key==='Escape'){event.preventDefault();if(zoomPanel)zoomPanel.querySelector('[data-crop-cancel],button').click();else close();return;}
    if(event.key!=='Tab')return;
    const items=[...(zoomPanel||root()).querySelectorAll('button:not([disabled]),select:not([disabled]),input:not([hidden]):not([disabled]),a[href],[tabindex="0"]')];
    const first=items[0],last=items[items.length-1];
    if(event.shiftKey&&(document.activeElement===first||document.activeElement.classList.contains('scanner-sheet'))){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&(document.activeElement===last||document.activeElement.classList.contains('scanner-sheet'))){event.preventDefault();first?.focus();}
  });
  window.SuperSpedytorScanner={open,close,receive,scanQr,available,release,receiveExport:result=>window.CmrDocumentExport?.receive(result)};
})();
