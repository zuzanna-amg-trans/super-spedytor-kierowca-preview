'use strict';
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SuperSpedytorTransshipmentMedia=api;})(typeof window==='undefined'?null:window,()=>{
  const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const list=v=>Array.isArray(v)?v:[];
  // Only owner API media. Never turn an arbitrary document field into a request.
  function source(value){
    if(typeof value!=='string'||value.length>4000||value.includes('\\'))return null;
    try{const u=new URL(value,'https://tms.amg.eco');
      if(u.protocol!=='https:'||u.host!=='tms.amg.eco'||u.username||u.password||u.search||u.hash||!u.pathname.startsWith('/media/')||/(?:%2f|%5c|%2e)/i.test(u.pathname))return null;
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
  function photos(offer){
    const rows=list(offer?.loading_photos);return [...new Set((rows.length?rows:[offer?.loading_photo_url]).map(source).filter(Boolean))];
  }
  function cmrMarkup(files,{native=null,error='',orderNumber=''}={}){
    if(error)return `<p class="cmr-preview-error" role="alert">${e(error)}</p><button class="secondary-button" data-trans-media-retry>Spróbuj pobrać podgląd ponownie</button>`;
    if(!files.length)return '<p class="cmr-preview-error" role="status">W TMS nie ma dostępnego skanu CMR z załadunku dla tego zlecenia. Zgłoś brak spedytorowi.</p><button class="secondary-button" data-trans-media-retry>Odśwież dokumenty</button>';
    return `<div class="transfer-cmr-viewer"><div class="transfer-cmr-heading"><strong>Skany CMR zlecenia</strong><span>${e(orderNumber)}</span></div>${files.length>1?'<p class="small-note">W zleceniu jest kilka plików. Porównaj cały komplet z papierowym dokumentem; pliki nie mają osobnego przypisania do plomby.</p>':''}${files.map((file,index)=>{
      let preview=file.url;
      if(file.pdf){try{preview=native?.documentPreviewUrl?.(file.url,0)||'';}catch{preview='';}if(!preview.startsWith('sspreview://local/pdf?'))preview='';}
      return `<figure class="transshipment-media-file"><figcaption>${e(file.label)}${files.length>1?' · plik '+(index+1)+'/'+files.length:''}${file.pdf?' · PDF':''}</figcaption>${preview?`<a href="${e(file.url)}" data-trans-media-open aria-label="Otwórz cały CMR ${index+1}"><img data-trans-media-image data-trans-cmr-image src="${e(preview)}" alt="${file.pdf?'Pierwsza strona CMR':'Skan CMR'} zlecenia ${e(orderNumber)}" decoding="async"></a><p data-trans-media-error class="cmr-preview-error" hidden>Nie udało się wyświetlić podglądu. Spróbuj ponownie albo otwórz cały dokument.</p>`:'<p class="small-note">Otwórz PDF, aby obejrzeć wszystkie strony.</p>'}<a class="cmr-open-document" data-trans-media-open href="${e(file.url)}">${file.pdf?'Otwórz i powiększ cały PDF':'Otwórz i powiększ skan'}</a></figure>`;
    }).join('')}<p class="small-note">Porównaj wszystkie strony z papierowym CMR przed potwierdzeniem.</p></div>`;
  }
  function cargoMarkup(offer,{compact=false}={}){
    const urls=photos(offer);
    const gallery=urls.length?`<div class="transshipment-loading-gallery" data-trans-loading-gallery><p class="small-note">Zdjęcia z załadunku · ${e(offer.order_number||offer.id)}${list(offer.cargo_items).length>1?' · galeria całego zlecenia':''}</p><div class="transfer-cmr-controls"><button data-trans-gallery-prev disabled aria-label="Poprzednie zdjęcie">‹</button><b data-trans-gallery-count>Zdjęcie 1 z ${urls.length}</b><button data-trans-gallery-next ${urls.length<2?'disabled':''} aria-label="Następne zdjęcie">›</button></div>${urls.map((url,index)=>`<figure class="transshipment-media-file" data-trans-gallery-item="${index}" ${index?'hidden':''}><a href="${e(url)}" data-trans-media-open aria-label="Powiększ zdjęcie z załadunku ${index+1}"><img data-trans-media-image src="${e(url)}" alt="Zdjęcie z załadunku zlecenia ${e(offer.order_number||offer.id)} · ${index+1}" ${index?'loading="lazy"':''}></a><p data-trans-media-error class="cmr-preview-error" hidden>Nie udało się wczytać zdjęcia. Odśwież podgląd lub otwórz zdjęcie ponownie.</p><a href="${e(url)}" data-trans-media-open>Powiększ zdjęcie</a></figure>`).join('')}</div>`:'<p class="cmr-preview-error" role="status">Brak zdjęć z załadunku w TMS dla tego zlecenia.</p>';
    return compact?`<details class="transshipment-live-manual"><summary>Pokaż zdjęcia z załadunku · ${urls.length}</summary>${gallery}</details>`:gallery;
  }
  return {source,documents,photos,cmrMarkup,cargoMarkup};
});
