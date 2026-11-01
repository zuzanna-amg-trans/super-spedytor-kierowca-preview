'use strict';
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SuperSpedytorTmsResults=api;})(typeof window==='undefined'?null:window,()=>{
  function writable(state){return state?.status==='connected'&&state.read_only!==true&&state.native_read_only!==true&&state.offline!==true;}
  function confirmedResponse(response){return Number.isInteger(response?.status)&&response.status>=200&&response.status<300&&response.status!==202&&response.cached!==true&&response.queued!==true;}
  function messageReadback(created,rows,text,attachment=false){
    const record=created?.message&&typeof created.message==='object'?created.message:created;
    if(!record?.id)return false;
    const saved=rows.find(m=>String(m.id)===String(record.id));
    return Boolean(saved&&(saved.body??saved.text??'')===text&&(!attachment||(saved.attachments||saved.files||[]).length>0));
  }
  return Object.freeze({writable,confirmedResponse,messageReadback});
});
