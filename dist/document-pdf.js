/* Offline CMR PDF packaging. Original image samples and PDF vectors are retained. */
(function(root,factory){
  'use strict';
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.CmrDocumentPdf=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  const VERSION='cmr-pdf-1',ENGINE='pdf-lib-1.17.1';
  const MAX_PAGES=20,MAX_BYTES=100*1024*1024,MAX_IMAGE_PIXELS=80000000;
  const A4=Object.freeze([595.2755905511812,841.8897637795276]);
  class DocumentPdfError extends Error {
    constructor(code,message){super(message);this.name='DocumentPdfError';this.code=code;}
  }
  const fail=(code,message)=>{throw new DocumentPdfError(code,message);};
  function limits(options){
    const maxPages=options.maxPages??MAX_PAGES,maxBytes=options.maxBytes??MAX_BYTES;
    if(!Number.isInteger(maxPages)||maxPages<1||maxPages>MAX_PAGES
      ||!Number.isInteger(maxBytes)||maxBytes<1||maxBytes>MAX_BYTES)fail('INVALID_LIMIT','Nieprawidłowy limit dokumentu.');
    return {maxPages,maxBytes};
  }
  function library(options){
    const lib=options.PDFLib||root.PDFLib;
    if(!lib?.PDFDocument||!lib?.PDFName)fail('ENGINE_UNAVAILABLE','Brakuje modułu tworzenia PDF. Zaktualizuj aplikację.');
    return lib;
  }
  function checkActive(options){if(options.signal?.aborted)fail('CANCELLED','Tworzenie PDF anulowano.');}
  function bytesOf(value){
    if(value instanceof ArrayBuffer)return new Uint8Array(value.slice(0));
    if(ArrayBuffer.isView(value))return new Uint8Array(value.buffer,value.byteOffset,value.byteLength).slice();
    fail('INVALID_BYTES','Nie udało się odczytać pliku do PDF.');
  }
  async function readBytes(page,options){
    if(typeof options.readBytes==='function')return bytesOf(await options.readBytes(page));
    if(page?.bytes)return bytesOf(page.bytes);
    const blob=page?.blob||page?.file;
    if(blob&&typeof blob.arrayBuffer==='function')return bytesOf(await blob.arrayBuffer());
    fail('MISSING_BYTES','Brak pełnego pliku skanu. Zeskanuj stronę ponownie.');
  }
  function sniff(bytes){
    if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
    if(bytes.length>=24&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return 'image/png';
    if(bytes.length>=8&&String.fromCharCode(...bytes.subarray(0,5))==='%PDF-')return 'application/pdf';
    fail('UNSUPPORTED_FILE','Wybierz poprawny plik JPG, PNG lub PDF.');
  }
  function assertType(page,actual){
    let declared=String(page?.mime||page?.blob?.type||page?.file?.type||'').toLowerCase();
    if(declared==='image/jpg')declared='image/jpeg';
    if(declared&&declared!==actual)fail('INVALID_MIME','Zawartość pliku nie odpowiada jego formatowi.');
  }
  function assertImageSize(width,height){
    if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1||width*height>MAX_IMAGE_PIXELS){
      fail('INVALID_IMAGE','Nieprawidłowe wymiary obrazu lub zdjęcie większe niż 80 megapikseli.');
    }
  }
  function pngSize(bytes){
    const data=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    const width=data.getUint32(16),height=data.getUint32(20);assertImageSize(width,height);
  }
  function checkAnnotations(page,lib){
    const annotations=page.node.lookupMaybe(lib.PDFName.of('Annots'),lib.PDFArray);
    if(!annotations)return;
    for(let i=0;i<annotations.size();i++){
      const annotation=annotations.lookup(i,lib.PDFDict);
      const subtype=annotation.get(lib.PDFName.of('Subtype'))?.toString();
      const flag=annotation.lookupMaybe(lib.PDFName.of('F'),lib.PDFNumber)?.asNumber()||0;
      // Hidden annotations do not contribute visible or printed page contents.
      if(flag&2)continue;
      if(subtype==='/Link'&&!annotation.has(lib.PDFName.of('AP')))continue;
      fail('UNSUPPORTED_PDF_ANNOTATION','PDF zawiera adnotacje lub pola, których wyglądu nie można bezpiecznie zachować. Wybierz spłaszczony PDF lub zeskanuj dokument.');
    }
  }
  function pageGeometry(page){
    const media=page.getMediaBox(),crop=page.getCropBox();
    for(const box of [media,crop])if(![box.x,box.y,box.width,box.height].every(Number.isFinite)||box.width<=0||box.height<=0){
      fail('INVALID_PDF','PDF ma nieprawidłowe wymiary strony.');
    }
    const left=Math.max(media.x,crop.x),bottom=Math.max(media.y,crop.y);
    const right=Math.min(media.x+media.width,crop.x+crop.width),top=Math.min(media.y+media.height,crop.y+crop.height);
    if(right<=left||top<=bottom)fail('INVALID_PDF','PDF ma nieprawidłowy obszar strony.');
    const angle=page.getRotation().angle;
    if(!Number.isFinite(angle)||angle%90!==0)fail('INVALID_PDF','PDF ma nieobsługiwany obrót strony.');
    return {width:right-left,height:top-bottom,rotation:((angle%360)+360)%360,bounds:{left,bottom,right,top}};
  }
  async function loadPdf(bytes,lib,maxPages){
    let source;
    try{source=await lib.PDFDocument.load(bytes,{ignoreEncryption:false,updateMetadata:false,throwOnInvalidObject:true});}
    catch(error){
      if(error?.name==='EncryptedPDFError'||/encrypted/i.test(error?.message||''))fail('ENCRYPTED_PDF','PDF jest zaszyfrowany. Wybierz plik bez hasła lub zeskanuj dokument.');
      fail('INVALID_PDF','Nie udało się otworzyć PDF. Wybierz poprawny plik lub zeskanuj dokument.');
    }
    if(source.isEncrypted)fail('ENCRYPTED_PDF','PDF jest zaszyfrowany. Wybierz plik bez hasła lub zeskanuj dokument.');
    let count;
    try{count=source.getPageCount();}catch{fail('INVALID_PDF','Nie udało się odczytać stron PDF.');}
    if(count<1)fail('EMPTY_PDF','PDF nie zawiera stron.');
    if(count>maxPages)fail('PAGE_LIMIT','Zestaw może zawierać maksymalnie '+maxPages+' stron, wliczając strony PDF.');
    try{
      for(const page of source.getPages()){checkAnnotations(page,lib);pageGeometry(page);}
    }catch(error){if(error instanceof DocumentPdfError)throw error;fail('INVALID_PDF','Nie udało się odczytać stron PDF.');}
    return source;
  }
  async function inspectPdf(data,options={}){
    const lib=library(options),limit=limits(options);checkActive(options);
    const bytes=bytesOf(data);
    if(bytes.length>limit.maxBytes)fail('BYTE_LIMIT','Zestaw PDF przekracza limit 100 MiB.');
    if(sniff(bytes)!=='application/pdf')fail('INVALID_PDF','Plik nie jest poprawnym PDF.');
    const source=await loadPdf(bytes,lib,limit.maxPages);checkActive(options);
    return {pageCount:source.getPageCount(),size:bytes.length};
  }
  async function hashOf(bytes,options){
    let hash;
    if(typeof options.sha256==='function')hash=await options.sha256(bytes);
    else{
      const subtle=root.crypto?.subtle;
      if(!subtle)fail('HASH_UNAVAILABLE','Nie udało się sprawdzić gotowego PDF. Zaktualizuj Android System WebView.');
      hash=Array.from(new Uint8Array(await subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
    }
    if(typeof hash!=='string'||!/^[a-f0-9]{64}$/i.test(hash))fail('HASH_UNAVAILABLE','Nie udało się sprawdzić gotowego PDF.');
    return hash.toLowerCase();
  }
  function filename(value){
    let name=String(value||'CMR.pdf').replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g,'-').trim().slice(0,120);
    if(!name||name==='.'||name==='..')name='CMR';
    return /\.pdf$/i.test(name)?name:name+'.pdf';
  }
  function placement(width,height,rotation=0){
    const swapped=rotation===90||rotation===270;
    const visibleWidth=swapped?height:width,visibleHeight=swapped?width:height;
    const size=visibleWidth>visibleHeight?[A4[1],A4[0]]:[A4[0],A4[1]];
    const scale=Math.min(size[0]/visibleWidth,size[1]/visibleHeight);
    const displayWidth=visibleWidth*scale,displayHeight=visibleHeight*scale;
    const left=(size[0]-displayWidth)/2,bottom=(size[1]-displayHeight)/2;
    let x=left,y=bottom;
    if(rotation===90)y+=displayHeight;
    else if(rotation===180){x+=displayWidth;y+=displayHeight;}
    else if(rotation===270)x+=displayWidth;
    return {pageSize:size,x,y,width:width*scale,height:height*scale,rotation:-rotation,
      displayWidth,displayHeight,left,bottom};
  }
  function stripPageMetadata(page,lib){
    // The source is a private parsed copy. Remove non-rendering references before
    // pdf-lib copies it, so orphan annotation/action objects cannot be serialized.
    const allowed=new Set(['Type','Parent','Resources','MediaBox','CropBox','BleedBox','TrimBox','ArtBox','Contents','Rotate','Group','UserUnit']);
    for(const key of page.node.keys())if(!allowed.has(key.decodeText()))page.node.delete(key);
  }
  async function create(pages,options={}){
    if(!Array.isArray(pages)||!pages.length)fail('EMPTY_DOCUMENT','Dodaj przynajmniej jedną stronę do PDF.');
    const lib=library(options),limit=limits(options);
    if(pages.length>limit.maxPages)fail('PAGE_LIMIT','Zestaw może zawierać maksymalnie '+limit.maxPages+' stron.');
    checkActive(options);
    const output=await lib.PDFDocument.create(),manifest=[];
    output.setProducer('Super Spedytor Kierowca / '+ENGINE);
    output.setCreator('Super Spedytor Kierowca');
    const name=filename(options.name);output.setTitle(name.replace(/\.pdf$/i,''));
    if(options.creationDate instanceof Date){output.setCreationDate(options.creationDate);output.setModificationDate(options.creationDate);}
    let inputBytes=0;
    for(let index=0;index<pages.length;index++){
      checkActive(options);
      const item=pages[index],data=await readBytes(item,options);inputBytes+=data.length;
      if(!data.length||inputBytes>limit.maxBytes)fail('BYTE_LIMIT','Pliki zestawu przekraczają limit 100 MiB.');
      const mime=sniff(data);assertType(item,mime);
      const sourceHash=await hashOf(data,options);
      if(mime==='application/pdf'){
        const source=await loadPdf(data,lib,limit.maxPages-manifest.length);
        for(let sourceIndex=0;sourceIndex<source.getPageCount();sourceIndex++){
          checkActive(options);
          const sourcePage=source.getPage(sourceIndex),geometry=pageGeometry(sourcePage);
          const layout=placement(geometry.width,geometry.height,geometry.rotation);
          const target=output.addPage(layout.pageSize);
          stripPageMetadata(sourcePage,lib);
          if(sourcePage.node.Contents()){
            const embedded=await output.embedPage(sourcePage,geometry.bounds);
            target.drawPage(embedded,{x:layout.x,y:layout.y,width:layout.width,height:layout.height,rotate:lib.degrees(layout.rotation)});
            const group=sourcePage.node.lookupMaybe(lib.PDFName.of('Group'),lib.PDFDict);
            if(group&&lib.PDFObjectCopier){
              await embedded.embed();
              const copied=lib.PDFObjectCopier.for(source.context,output.context).copy(group);
              output.context.lookup(embedded.ref,lib.PDFRawStream).dict.set(lib.PDFName.of('Group'),copied);
            }
          }
          manifest.push({outputPage:manifest.length+1,sourceIndex:index,sourcePage:sourceIndex+1,mime,sourceHash,
            sourceWidth:geometry.width,sourceHeight:geometry.height,sourceRotation:geometry.rotation,
            pageWidth:layout.pageSize[0],pageHeight:layout.pageSize[1]});
        }
      }else{
        if(manifest.length>=limit.maxPages)fail('PAGE_LIMIT','Zestaw może zawierać maksymalnie '+limit.maxPages+' stron, wliczając strony PDF.');
        if(mime==='image/png')pngSize(data);
        let image;
        try{image=mime==='image/jpeg'?await output.embedJpg(data):await output.embedPng(data);}
        catch{fail('INVALID_IMAGE','Nie udało się odczytać zdjęcia. Wybierz poprawny JPG lub PNG.');}
        assertImageSize(image.width,image.height);
        // A processed JPEG's rotation is already baked into its samples. The
        // editor's page.rotation metadata must never rotate those pixels again.
        const layout=placement(image.width,image.height),target=output.addPage(layout.pageSize);
        target.drawImage(image,{x:layout.x,y:layout.y,width:layout.width,height:layout.height});
        manifest.push({outputPage:manifest.length+1,sourceIndex:index,sourcePage:1,mime,sourceHash,
          sourceWidth:image.width,sourceHeight:image.height,sourceRotation:0,
          pageWidth:layout.pageSize[0],pageHeight:layout.pageSize[1]});
      }
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    checkActive(options);
    // drawImage/drawPage normalize a new page with an empty Annots array.
    // Remove it too; output pages intentionally contain only visible content.
    for(const page of output.getPages())page.node.delete(lib.PDFName.of('Annots'));
    let bytes;
    try{bytes=await output.save({useObjectStreams:true,addDefaultPage:false,objectsPerTick:30});}
    catch{fail('SAVE_FAILED','Nie udało się zapisać kompletnego PDF. Spróbuj mniejszego zestawu.');}
    if(bytes.length>limit.maxBytes)fail('BYTE_LIMIT','Gotowy PDF przekracza limit 100 MiB. Podziel dokument.');
    const hash=await hashOf(bytes,options);checkActive(options);
    const blob=new Blob([bytes],{type:'application/pdf'});
    return {blob,bytes,mime:'application/pdf',name,size:bytes.length,hash,pageCount:manifest.length,
      manifest,engine:ENGINE,version:VERSION,inputBytes};
  }
  return {create,inspectPdf,DocumentPdfError,VERSION,ENGINE,MAX_PAGES,MAX_BYTES,A4};
});
