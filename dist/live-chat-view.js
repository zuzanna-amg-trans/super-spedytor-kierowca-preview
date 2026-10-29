'use strict';
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SuperSpedytorLiveChatView=api;})(typeof window==='undefined'?null:window,()=>{
  const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function media(value){
    if(typeof value!=='string')return '';
    try{const u=new URL(value,'https://tms.amg.eco');return ['https:','ssmedia:'].includes(u.protocol)&&u.hostname==='tms.amg.eco'&&!u.username&&!u.password&&u.pathname.startsWith('/media/')&&![...u.searchParams.keys()].some(k=>/^(access_token|refresh_token|password|authorization)$/i.test(k))?u.href.replace(/^https:/,'ssmedia:'):'';}catch{return '';}
  }
  function attachment(file,native){
    const url=media(file.file_url||file.url||file.file),name=file.download_name||file.original_name||file.name||file.filename||'Załącznik';
    if(!url)return `<p>Załącznik: ${e(name)} · TMS nie udostępnił adresu pliku.</p>`;
    const mime=file.mime_type||file.content_type||file.mime||'',pathname=new URL(url).pathname;
    let image='';
    if(/^image\/(jpeg|png|webp|gif|heic|heif|avif)$/i.test(mime)||/\.(jpe?g|png|webp|gif|heic|heif|avif)$/i.test(pathname))image=url;
    if(mime==='application/pdf'||/\.pdf$/i.test(pathname)){
      try{const candidate=native?.documentPreviewUrl?.(url,0);if(typeof candidate==='string'&&candidate.startsWith('sspreview://local/pdf?'))image=candidate;}catch{}
    }
    return `<figure class="lw-chat-attachment"><a href="${e(url)}" aria-label="Otwórz załącznik: ${e(name)}">${image?`<img src="${e(image)}" alt="Podgląd: ${e(name)}" loading="lazy" decoding="async" data-chat-inline-preview>`:'<span class="lw-file-symbol" aria-hidden="true">▤</span>'}<span>${e(name)}</span><small>Otwórz i powiększ</small></a>${image?'<p class="lw-preview-error" hidden>Nie udało się wczytać miniatury. Dotknij nazwy, aby otworzyć plik.</p>':''}</figure>`;
  }
  function message(m,native){
    const sender=m.sender_name||m.author_name||m.sender?.display_name||m.sender?.full_name||m.sender?.username||'Użytkownik';
    const date=m.created_at&&!Number.isNaN(new Date(m.created_at).getTime())?new Date(m.created_at).toLocaleString('pl-PL',{timeZone:'Europe/Warsaw',dateStyle:'short',timeStyle:'short'}):'';
    return `<article class="chat-bubble"><small>${e(sender)}${date?' · '+e(date):''}</small><p>${e(m.body||m.text||'')}</p><div class="lw-chat-attachments">${(m.attachments||m.files||[]).map(f=>attachment(f,native)).join('')}</div></article>`;
  }
  function chronological(messages){
    const entries=messages.map((message,index)=>({message,index,time:Date.parse(message.created_at)}));
    const ordered=entries.filter(entry=>Number.isFinite(entry.time)).sort((a,b)=>a.time-b.time||a.index-b.index);
    let next=0;
    return entries.map(entry=>Number.isFinite(entry.time)?ordered[next++].message:entry.message);
  }
  return {media,attachment,message,chronological};
});
