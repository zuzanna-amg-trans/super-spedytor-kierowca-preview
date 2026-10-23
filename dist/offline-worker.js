'use strict';
const BUILD="8a11ed99a16930e40cae17344f2c983c7685a959";
const FILES=["android-shell.css","assets/OFL.txt","assets/manrope-400.ttf","assets/manrope-500.ttf","assets/manrope-600.ttf","assets/manrope-700.ttf","assets/manrope-800.ttf","break-suggestion.js","cmr-collection.js","cmr-inventory.css","cmr-inventory.js","demo-assets.js","document-ai-worker.js","document-ai.js","document-ai/LICENSE","document-ai/NOTICE","document-ai/model.ort","document-enhancement.js","document-export.js","document-pdf.js","document-processing.js","driver.css","flow.css","flow.js","handover-v2.css","handover-v2.js","live-operation.js","offline-store.js","offline-workspace.js","offline.css","operation-timing.js","paper-scanner.js","robots.txt","scan-quality.js","scanner.css","scanner.js","service-register.js","service-survey.js","service.css","ss-scanner/core.js","survey-register.css","survey-register.js","tacho-day-summary.js","tacho.css","tacho.js","translator-launcher.css","translator-launcher.js","translator/app.js","translator/index.html","translator/styles.css","transshipment.css","transshipment.js","vehicle-custody-ui.js","vehicle-custody.js","vehicle-exchange.js","vehicle-handover.js","vehicle-inspection-v2.js","vendor/OpenCV-LICENSE.txt","vendor/OpenCV-NOTICE.txt","vendor/models/LICENSE-SCI-ONNX.txt","vendor/models/LICENSE-SCI.txt","vendor/models/SCI-NOTICE.txt","vendor/models/sci-difficult.onnx","vendor/onnxruntime/LICENSE.txt","vendor/onnxruntime/ThirdPartyNotices.txt","vendor/onnxruntime/ort-wasm-simd-threaded.mjs","vendor/onnxruntime/ort-wasm-simd-threaded.wasm","vendor/onnxruntime/ort.wasm.min.js","vendor/opencv-4.13.0.js","vendor/pdf-lib-1.17.1.min.js","vendor/pdf-lib-LICENSE.txt","vendor/pdf-lib-NOTICE.txt","web-backend.js","index.html","app.html","build-info.json"];
const CACHE='ss-driver-shell-'+BUILD;
const ROOT=new URL('./',self.location.href);
const allowed=new Set(FILES.map(path=>new URL(path,ROOT).pathname));
const critical=FILES.filter(path=>/\.(html|css|js)$/.test(path)&&!path.startsWith('vendor/onnxruntime/')&&!path.includes('document-ai/'));
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(critical.map(path=>new Request(new URL(path,ROOT),{cache:'reload'})));
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const name of await caches.keys())if(name.startsWith('ss-driver-shell-')&&name!==CACHE)await caches.delete(name);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==ROOT.origin)return;
  if(!allowed.has(url.pathname)&&url.pathname!==ROOT.pathname)return;
  const version=url.searchParams.get('v');
  if(version&&version!==BUILD)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const key=url.pathname===ROOT.pathname?new URL('index.html',ROOT).href:url.href;
    if(request.mode!=='navigate'){
      const cached=await cache.match(key,{ignoreSearch:true});if(cached)return cached;
    }
    try{
      const response=await fetch(request);
      if(response.ok)await cache.put(key,response.clone());
      return response;
    }catch(error){const cached=await cache.match(key,{ignoreSearch:true});if(cached)return cached;throw error;}
  })());
});
