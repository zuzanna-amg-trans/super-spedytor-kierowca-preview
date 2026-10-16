/* Local ONNX CPU inference; no document or image leaves this worker. */
'use strict';
const version=self.location.search;
importScripts('document-ai.js'+version,'vendor/onnxruntime/ort.wasm.min.js'+version);
let model=null,busy=false;
async function load(){
  if(model)return model;
  ort.env.logLevel='error';ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;
  ort.env.wasm.wasmPaths={
    mjs:new URL('vendor/onnxruntime/ort-wasm-simd-threaded.mjs'+version,self.location.href).href,
    wasm:new URL('vendor/onnxruntime/ort-wasm-simd-threaded.wasm'+version,self.location.href).href
  };
  model=(async()=>{
    const response=await fetch('document-ai/model.ort'+version);
    if(!response.ok)throw new Error('missing model');
    const bytes=await response.arrayBuffer();
    if(bytes.byteLength!==13404960)throw new Error('invalid model');
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
    if(hash!=='f0f2f52d7d79ff02d346c8f9d0c9e903407366aeea1747cdcff160c401e3e72a')throw new Error('invalid model');
    return await ort.InferenceSession.create(new Uint8Array(bytes),{executionProviders:['wasm'],graphOptimizationLevel:'all'});
  })();
  try{return await model;}catch(error){model=null;throw error;}
}
self.onmessage=async event=>{
  const {id,rgba,letterbox}=event.data;
  if(busy){self.postMessage({id,error:true});return;}
  busy=true;let input,outputs;
  try{
    const session=await load();
    input=new ort.Tensor('float32',CmrDocQuad.nchw(rgba),[1,3,256,256]);
    outputs=await session.run({input});
    const corners=outputs.corner_heatmaps,mask=outputs.mask_logits;
    if(corners?.dims?.join(',')!=='1,4,64,64'||mask?.dims?.join(',')!=='1,1,64,64')throw new Error('invalid output');
    const logits=new Float32Array(20480);logits.set(corners.data);logits.set(mask.data,16384);
    self.postMessage({id,result:CmrDocQuad.decode(logits,letterbox)});
  }catch{self.postMessage({id,error:true});}
  finally{input?.dispose();if(outputs)for(const value of Object.values(outputs))value.dispose();busy=false;}
};
