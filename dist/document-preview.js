(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.CmrDocumentPreview=api;
  if(root.document?.addEventListener){
    const settle=(event,failed)=>{
      const image=event.target;
      if(!image?.matches?.('[data-cmr-page-preview]'))return;
      const frame=image.closest('.cmr-pdf-page');
      frame?.classList.add(failed?'preview-failed':'preview-loaded');
    };
    root.document.addEventListener('load',event=>settle(event,false),true);
    root.document.addEventListener('error',event=>settle(event,true),true);
    root.document.addEventListener('click',event=>api.openNativeDocument(event,root.SuperSpedytorNative),true);
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function safeSource(value){
    if(typeof value!=='string'||value.length>4000)return null;
    try{
      const url=new URL(value,'https://preview.invalid/');
      return ['https:','blob:','ssfile:','ssmedia:','content:'].includes(url.protocol)?value:null;
    }catch{return null;}
  }
  function openNativeDocument(event,native){
    if(typeof native?.openDocument!=='function')return false;
    const anchor=event?.target?.closest?.('a[data-cmr-open-document]');
    if(!anchor)return false;
    // Consume this native-only action even when the file expired. Never send a
    // protected local URI to an external application as a fallback.
    event.preventDefault();
    const source=anchor.getAttribute('href');
    let opened=false;
    try{
      // Match NativeFileStore's owned local handle, not a URL supplied by a link.
      if(typeof source==='string'&&/^ssfile:\/\/local\/[a-f0-9]{32}$/.test(source)
          &&typeof native.canOpenDocument==='function'&&native.canOpenDocument(source)===true){
        opened=native.openDocument(source)===true;
      }
    }catch{}
    const error=anchor.closest('.cmr-pdf-preview')?.querySelector('[data-cmr-open-error]');
    if(error)error.hidden=opened;
    return true;
  }
  function markup(record,{native=null}={}){
    const source=safeSource(record?.url);
    if(!source)return '<p class="cmr-preview-error" role="status">Brak dostępnego pliku do podglądu. Odśwież dokumenty zlecenia.</p>';
    if(typeof native?.canOpenDocument==='function'){
      let available=false;try{available=native.canOpenDocument(source)===true;}catch{}
      if(!available)return '<p class="cmr-preview-error" role="status">Ten plik PDF nie jest dostępny do podglądu na tym urządzeniu. Odśwież dokumenty zlecenia.</p>';
    }
    const name=escape(record.name||'CMR.pdf'),href=escape(source);
    const nativeAction=typeof native?.openDocument==='function'?' data-cmr-open-document':'';
    const openError=nativeAction?'<p class="cmr-preview-error" data-cmr-open-error role="status" hidden>Nie udało się otworzyć tego pliku PDF. Plik mógł wygasnąć lub zostać usunięty. Odśwież dokumenty zlecenia.</p>':'';
    const count=Number.isInteger(record.pages)&&record.pages>0?Math.min(20,record.pages):null;
    const open=`<a href="${href}"${nativeAction} target="_blank" rel="noopener" class="cmr-open-document"><strong>${name}</strong><span>Otwórz i powiększ cały PDF${count?' · '+count+' '+(count===1?'strona':'stron'):''} ›</span></a>`;
    if(typeof native?.documentPreviewUrl==='function'){
      const pages=Array.from({length:count||1},(_,page)=>{
        let url='';try{url=native.documentPreviewUrl(source,page);}catch{}
        if(typeof url!=='string'||!url.startsWith('sspreview://local/pdf?'))return '';
        return `<figure class="cmr-pdf-page"><figcaption>Strona ${page+1}${count?' z '+count:''}</figcaption><a href="${href}"${nativeAction} target="_blank" rel="noopener" aria-label="Powiększ stronę ${page+1} dokumentu ${name}"><img data-cmr-page-preview src="${escape(url)}" alt="Skan CMR, strona ${page+1}" ${page?'loading="lazy"':''} decoding="async"></a><p class="cmr-preview-loading" role="status">Ładuję podgląd strony…</p><p class="cmr-preview-error" role="status">Nie udało się wyświetlić tej strony. Otwórz pełny PDF, aby sprawdzić dokument.</p></figure>`;
      }).join('');
      return `<div class="cmr-pdf-preview">${pages}${open}${openError}</div>`;
    }
    return `<div class="cmr-pdf-preview"><object class="cmr-pdf-embedded" data="${href}${source.includes('#')?'':'#page=1&view=FitH'}" type="application/pdf" aria-label="Podgląd skanu ${name}"><p>Ta przeglądarka nie wyświetla PDF wewnątrz strony. Użyj przycisku poniżej, aby obejrzeć dokument.</p></object>${open}${openError}</div>`;
  }
  return {markup,safeSource,openNativeDocument};
});
