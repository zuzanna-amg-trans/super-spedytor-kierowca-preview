// === B935: mycie zewnętrzne 15 EUR — prawdziwa wysyłka do biura (tylko natywny mostek) ===
// Moduł nie ma własnego HTTP: request/upload/capture to bezpośrednie nativeCall (nie kolejka offline CMR).
// Wynik każdej operacji jest odrzucany, gdy właściciel albo epoka sesji się zmieniły.
let carWashLiveHandle=null;
let carWashEpoch=0;
let carWashOpenOwner='';
const carWashOwner=()=>backendState?.profile?.id!=null?`${backendState.backend_origin||'native'}|${backendState.profile.id}`:'';
function carWashLiveBlock(){
  const native=window.SuperSpedytorNative;
  if(!backendMode||browserBackend||!native?.backendRequest||!native?.backendUpload||!native?.capturePhoto)return 'Wysyłka mycia do biura działa tylko w aplikacji mobilnej.';
  if(!window.SuperSpedytorCarWashLive)return 'Moduł mycia nie został załadowany.';
  if(backendState?.status!=='connected')return 'Najpierw połącz się z Super Spedytorem.';
  if(backendTestWorkspace)return 'W trybie testu widoków mycie niczego nie wysyła do biura.';
  if(backendState.read_only===true||backendState.native_read_only===true)return 'Połączenie tylko do odczytu — mycie nie może zostać wysłane.';
  if(!carWashOwner())return 'Brak tożsamości kierowcy — nie można zapisać zgłoszenia.';
  return '';
}
function closeCarWashLive(){
  const handle=carWashLiveHandle;
  carWashLiveHandle=null;
  carWashOpenOwner='';
  carWashEpoch++;
  try{handle?.close();}catch{}
}
function syncCarWashLive(){
  if(!carWashLiveHandle)return;
  if(!carWashLiveHandle.isOpen()){carWashLiveHandle=null;return;}
  if(carWashLiveBlock()||carWashOwner()!==carWashOpenOwner)closeCarWashLive();
}
function openCarWashLive(){
  const reason=carWashLiveBlock();
  if(reason){toast(reason);return;}
  closeCarWashLive();
  window.SuperSpedytorLiveWorkspace?.close?.();
  window.SuperSpedytorCarWash?.close?.();
  const owner=carWashOwner();
  carWashOpenOwner=owner;
  const epoch=carWashEpoch;
  const native=window.SuperSpedytorNative;
  carWashLiveHandle=window.SuperSpedytorCarWashLive.open({
    host:$('.device'),
    owner,
    isCurrent:()=>epoch===carWashEpoch&&carWashOwner()===owner&&!carWashLiveBlock(),
    request:(method,path,body)=>nativeCall(id=>native.backendRequest(id,method,path,body?JSON.stringify(body):'')),
    upload:(path,token,fields)=>nativeCall(id=>native.backendUpload(id,path,token,JSON.stringify(fields||{}))),
    capture:()=>nativeCall(id=>native.capturePhoto(id)),
    release:token=>{try{native.releaseFile(token);}catch{}},
    onClose:()=>{if(epoch===carWashEpoch){carWashLiveHandle=null;carWashEpoch++;}}
  });
}
function openCarWashDemo(){
  closeCarWashLive();
  window.SuperSpedytorCarWash?.open({host:$('.device'),demo:true,context:{driver_id:'demo-driver',driver_full_name:'Jan Testowy',vehicle_id:'demo-vehicle',vehicle_registration:'DEMO 001',round_id:'demo-round'}});
}
function carWashEntryHtml(){
  if(backendMode&&backendState?.status==='connected'&&!backendTestWorkspace){
    const reason=carWashLiveBlock();
    return `<section class="panel car-wash-entry"><button type="button" class="secondary-button" data-car-wash-live-open ${reason?'disabled':''}>Mycie zewnętrzne · 15 EUR</button><small>${esc(reason||'Własne środki, stały zwrot po akceptacji biura. Zdjęcia trafiają do biura w Super Spedytorze.')}</small></section>`;
  }
  if(productionScope||!window.SuperSpedytorCarWash)return '';
  return '<section class="panel car-wash-entry"><button type="button" class="secondary-button" data-car-wash-demo-open>Mycie zewnętrzne · 15 EUR (test lokalny)</button><small>Dane przykładowe — nic nie jest wysyłane.</small></section>';
}
function bindCarWashEntry(scope=document){
  scope.querySelectorAll('[data-car-wash-live-open]').forEach(button=>button.onclick=openCarWashLive);
  scope.querySelectorAll('[data-car-wash-demo-open]').forEach(button=>button.onclick=openCarWashDemo);
}
window.SuperSpedytorCarWashEntry={html:carWashEntryHtml,bind:bindCarWashEntry,open:openCarWashLive,close:closeCarWashLive,sync:syncCarWashLive};
