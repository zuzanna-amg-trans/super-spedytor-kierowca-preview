'use strict';
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SuperSpedytorTransshipmentMedia=api;})(typeof window==='undefined'?null:window,()=>{
  const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const list=v=>Array.isArray(v)?v:[];
  // Only owner API media. Never turn an arbitrary document field into a request.
  function validQuery(u){
    if(!u.search)return !u.href.includes('?');
    // SignedMediaStorage: 16-byte MD5 in canonical unpadded base64url,
    // followed by the positive Unix expiry. Keep this exact query for nginx.
    const match=/^\?md5=[A-Za-z0-9_-]{21}[AQgw]&expires=([1-9]\d{0,18})$/.exec(u.search);
    return !!match&&Number.isSafeInteger(Number(match[1]))&&Number(match[1])>Date.now()/1000;
  }
  function source(value){
    if(typeof value!=='string'||value.length>4000||value.includes('\\'))return null;
    try{const u=new URL(value,'https://tms.amg.eco');
      if(u.protocol!=='https:'||u.host!=='tms.amg.eco'||u.username||u.password||!validQuery(u)||u.hash||!u.pathname.startsWith('/media/')||/(?:%2f|%5c|%2e)/i.test(u.pathname))return null;
      return u.href.replace(/^https:/,'ssmedia:');
    }catch{return null;}
  }
  function documents(rows,offerId){
    const seen=new Set();
    return list(rows).filter(d=>d&&['cmr_loading','cmr','photo_transshipment_cmr'].includes(d.document_type)&&(!d.offer||String(d.offer)===String(offerId))).flatMap(d=>{
      const url=source(d.file||d.file_url);if(!url||seen.has(url))return [];seen.add(url);
      const pathname=new URL(url).pathname,pdf=/\.pdf$/i.test(pathname),image=/\.(jpe?g|png|webp|heic)$/i.test(pathname);
      if(!pdf&&!image)return [];
      return [{id:d.id,url,pdf,name:pdf?'CMR.pdf':'CMR',label:d.document_type==='photo_transshipment_cmr'?'CMR z przeładunku':'CMR z załadunku'}];
    });
  }
  // A renewed signature changes download access, not the file the driver saw.
  function sameDocuments(a,b){return a.length===b.length&&a.every((v,i)=>v.id===b[i].id&&new URL(v.url).pathname===new URL(b[i].url).pathname);}
  function photos(offer,documentRows=[]){
    // The point can omit its gallery. The driver-scoped document list is for
    // this exact offer; never mix documents from a different offer or slot.
    const docs=list(documentRows).filter(d=>d?.document_type==='photo_loading'&&(d.offer==null||String(d.offer)===String(offer.id)));
    const files=new Map();
    for(const addr of [...list(offer.loading_photos),offer.loading_photo_url,...docs.map(d=>d.file||d.file_url)].map(source).filter(Boolean)){
      const u=new URL(addr),expiry=Number(u.searchParams.get('expires')||0),previous=files.get(u.pathname);
      if(!previous||expiry>previous.expiry)files.set(u.pathname,{addr,expiry});
    }
    return [...files.values()].map(f=>f.addr);
  }
  function cmrMarkup(files,{native=null,error='',orderNumber='',forReview=true}={}){
    if(error)return `<p class="cmr-preview-error" role="alert">${e(error)}</p><button class="secondary-button" data-trans-media-retry>Spróbuj pobrać podgląd ponownie</button>`;
    if(!files.length)return '<p class="cmr-preview-error" role="status">W TMS nie ma dostępnego skanu CMR z załadunku dla tego zlecenia. Zgłoś brak spedytorowi.</p><button class="secondary-button" data-trans-media-retry>Odśwież dokumenty</button>';
    return `<div class="transfer-cmr-viewer"><div class="transfer-cmr-heading"><strong>Skany CMR zlecenia</strong><span>${e(orderNumber)}</span></div>${files.length>1?'<p class="small-note">W zleceniu jest kilka plików. Porównaj cały komplet z papierowym dokumentem; pliki nie mają osobnego przypisania do plomby.</p>':''}${files.map((file,index)=>{
      let preview=file.url;
      if(file.pdf){try{preview=native?.documentPreviewUrl?.(file.url,0)||'';}catch{preview='';}if(!preview.startsWith('sspreview://local/pdf?'))preview='';}
      return `<figure class="transshipment-media-file"><figcaption>${e(file.label)}${files.length>1?' · plik '+(index+1)+'/'+files.length:''}${file.pdf?' · PDF':''}</figcaption>${preview?`<a href="${e(file.url)}" data-trans-media-open aria-label="Otwórz cały CMR ${index+1}"><img data-trans-media-image data-trans-cmr-image src="${e(preview)}" alt="${file.pdf?'Pierwsza strona CMR':'Skan CMR'} zlecenia ${e(orderNumber)}" decoding="async"></a><p data-trans-media-error class="cmr-preview-error" hidden>Nie udało się wyświetlić podglądu. Otwórz cały dokument lub <button class="secondary-button" data-trans-media-retry>Wczytaj podgląd jeszcze raz</button></p>`:'<p class="small-note">Otwórz PDF, aby obejrzeć wszystkie strony.</p>'}<a class="cmr-open-document" data-trans-media-open href="${e(file.url)}">${file.pdf?'Otwórz i powiększ cały PDF':'Otwórz i powiększ skan'}</a></figure>`;
    }).join('')}${forReview?'<p class="small-note">Porównaj wszystkie strony z papierowym CMR przed potwierdzeniem.</p>':''}</div>`;
  }
  function cargoMarkup(offer,{documentRows=[],error=''}={}){
    const urls=photos(offer,documentRows);
    const gallery=urls.length?`<div class="transshipment-loading-gallery" data-trans-loading-gallery>${urls.map((url,index)=>`<figure class="transshipment-media-file" data-trans-gallery-item="${index}" ${index?'hidden':''}><a href="${e(url)}" data-trans-media-open aria-label="Powiększ zdjęcie z załadunku ${index+1}"><img data-trans-media-image src="${e(url)}" alt="Zdjęcie z załadunku zlecenia ${e(offer.order_number||offer.id)} · ${index+1}" ${index?'loading="lazy"':''}></a><p data-trans-media-error class="cmr-preview-error" hidden>Nie udało się wczytać zdjęcia. <button class="secondary-button" data-trans-media-retry>Wczytaj zdjęcie jeszcze raz</button></p><a href="${e(url)}" data-trans-media-open>Powiększ zdjęcie</a></figure>`).join('')}<div class="transfer-cmr-controls"><button data-trans-gallery-prev disabled aria-label="Poprzednie zdjęcie">‹</button><b data-trans-gallery-count>Zdjęcie 1 z ${urls.length}</b><button data-trans-gallery-next ${urls.length<2?'disabled':''} aria-label="Następne zdjęcie">›</button></div><p class="small-note">Zlecenie ${e(offer.order_number||offer.id)}${list(offer.cargo_items).length>1?' · galeria całego zlecenia':''}</p></div>`:'<p class="cmr-preview-error" role="status">Brak zdjęć z załadunku w TMS dla tego zlecenia.</p>';
    if(error&&!urls.length)return `<p class="cmr-preview-error" role="alert">Nie udało się pobrać zdjęć z załadunku. ${e(error)}</p><button class="secondary-button" data-trans-media-retry>Spróbuj ponownie</button>`;
    if(!urls.length&&(list(offer.loading_photos).length||offer.loading_photo_url||list(documentRows).some(d=>d?.document_type==='photo_loading'&&(d.offer==null||String(d.offer)===String(offer.id)))))return '<p class="cmr-preview-error" role="status">TMS wskazuje zdjęcia z załadunku, ale nie udostępnił ich plików do podglądu.</p><button class="secondary-button" data-trans-media-retry>Odśwież zdjęcia</button>';
    return gallery+(error?'<p class="small-note">Lista zdjęć może być niepełna.</p><button class="secondary-button" data-trans-media-retry>Odśwież zdjęcia</button>':'');
  }
  return {source,documents,sameDocuments,photos,cmrMarkup,cargoMarkup};
});
