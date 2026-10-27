'use strict';
(function(){
  let frozen=false, required=false, checkpointId=null, view={},pdfBusy=false;
  const native=()=>window.SuperSpedytorNative;
  const container=()=>document.getElementById('app-update-gate');
  const busy=()=>typeof pendingRequests==='undefined'||pendingRequests.size>0
    || typeof liveBusy==='undefined'||liveBusy||Boolean(liveOperation?.finishing||backendPointActionPending)
    || backendState?.write?.status==='pending'||pdfBusy||Boolean(window.SuperSpedytorScanner?.isBusy());
  const allowedUrl=value=>typeof value==='string'&&/^(blob:|ssfile:\/\/local\/)/.test(value);
  function element(tag,text){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;}
  function materials(parent){
    const data=window.SuperSpedytorOfflineWorkspace?.updateRescue();
    parent.append(element('h2','Zapisane materiały i synchronizacja'));
    parent.append(element('p','Kolejka nadal może wysyłać zapisane dane. Aktualizacja nie usuwa plików z telefonu.'));
    for(const job of data?.jobs||[])parent.append(element('p',`${job.label||'Materiał'} — ${job.state==='sending'?'wysyłanie':job.state==='uncertain'?'wynik do sprawdzenia':'oczekuje na potwierdzenie'}`));
    const seen=new Set();
    function visit(value,depth=0){
      if(!value||typeof value!=='object'||depth>16)return;
      if(allowedUrl(value.url)&&!seen.has(value.url)){
        seen.add(value.url);
        const figure=element('figure'),caption=element('figcaption',value.fileName||value.name||'Zapisany materiał');
        if((value.mimeType||value.mime)==='application/pdf'||/\.pdf$/i.test(value.fileName||value.name||'')){
          const link=element('button','Otwórz dokument PDF');link.type='button';
          link.onclick=async()=>{
            if(pdfBusy)return;pdfBusy=true;link.disabled=true;
            try{
              const response=await fetch(value.url);if(!response.ok)throw Error('Brak pliku');
              const blob=await response.blob();
              if(blob.size>100*1024*1024)throw Error('Limit pliku');
              const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),v=>v.toString(16).padStart(2,'0')).join('');
              const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
              const hex=Array.from(bytes,v=>v.toString(16).padStart(2,'0')).join('');
              const requestId=hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);
              await window.CmrDocumentExport.start({blob,hash,mime:'application/pdf',name:value.fileName||value.name||'Zapisany-CMR.pdf'},'view',{native:native(),requestId});
            }catch{figure.append(element('p','Nie udało się otworzyć PDF. Plik pozostaje zapisany na telefonie.'));}
            finally{pdfBusy=false;link.disabled=false;}
          };
          figure.append(link);
        }else{const image=element('img');image.src=value.url;image.alt=caption.textContent;image.style.maxWidth='100%';figure.append(image);}
        figure.append(caption);parent.append(figure);
      }
      for(const child of Object.values(value))visit(child,depth+1);
    }
    visit(data?.materials);
    if(!seen.size)parent.append(element('p','Brak zdjęć w bieżącym zapisie. Pliki natywne i kolejka DDD pozostają w pamięci aplikacji.'));
  }
  function render(){
    const old=container();
    if(!frozen&&!required){old?.remove();return;}
    if(old)return;
    const panel=element('section');panel.id='app-update-gate';
    panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Aktualizacja aplikacji');
    Object.assign(panel.style,{position:'fixed',inset:'0',zIndex:'2147483647',background:'#fff',color:'#182431',overflow:'auto',padding:'24px',boxSizing:'border-box'});
    panel.append(element('h1',frozen?'Zapis danych przed aktualizacją':'Wymagana aktualizacja'));
    panel.append(element('p',view.message||'Aby rozpocząć kolejne czynności, zaktualizuj aplikację na postoju.'));
    const content=element('div');panel.append(content);
    function button(text,action){const b=element('button',text);b.type='button';b.style.cssText='display:block;padding:14px;margin:12px 0;font:inherit';b.onclick=action;panel.append(b);return b;}
    if(!frozen){
      button('Zaktualizuj na postoju',()=>native()?.requestAppUpdate());
      button('Zapisane materiały i kolejka',()=>{content.replaceChildren();materials(content);});
      button('Pomoc',()=>{content.replaceChildren(element('p',view.support||'Skontaktuj się z biurem. Sprawdź połączenie, konto Google Play i dostęp do właściwego testu. Nie odinstalowuj aplikacji i nie czyść jej danych.'));});
      button('Wyloguj',()=>native()?.backendLogout());
    }
    document.body.append(panel);
    // Background UI remains rendered for synchronization, but cannot receive focus/touches.
    panel.tabIndex=-1;panel.focus();
  }
  function repaint(){container()?.remove();render();}
  function release(){
    frozen=false;checkpointId=null;repaint();
  }
  async function prepare(id){
    if(typeof id!=='string'||!/^[0-9a-f-]{36}$/.test(id)||frozen)return;
    checkpointId=id;frozen=true;repaint();
    let ok=false;
    try{
      if(busy())throw Error('Trwa czynność');
      ok=await window.SuperSpedytorOfflineWorkspace?.updateCheckpoint()===true;
      ok=ok&&!busy()&&checkpointId===id;
    }catch{ok=false;}
    if(checkpointId!==id)return;
    try{native()?.appUpdatePrepared(id,ok);}catch{release();}
    if(!ok)release();
  }
  // Capture also protects against UI rerenders adding controls while the gate is visible.
  for(const type of ['click','pointerdown','keydown','submit','focusin']){
    document.addEventListener(type,event=>{
      if((frozen||required)&&!container()?.contains(event.target)){
        event.preventDefault();event.stopImmediatePropagation();
        if(type==='focusin')container()?.focus();
      }
    },true);
  }
  window.SuperSpedytorUpdates={
    show(next){
      const changed=required!==Boolean(next?.required)||view.message!==next?.message||view.support!==next?.support;
      view=next||{};required=Boolean(view.required);
      if(changed)repaint();else render();
    },
    prepare,release,paused:()=>frozen
  };
})();
