'use strict';

(function expose(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SuperSpedytorVehicleCustody=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  const clone=value=>JSON.parse(JSON.stringify(value));
  const code=value=>String(value||'').trim().toUpperCase();
  const has=value=>typeof value==='string'&&value.trim().length>0;
  const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
  function create(snapshot={},role='receive'){
    const manifest=snapshot.contents;
    const orders=clone(manifest?.orders||[]);
    const ids=new Set(),seals=new Set();
    const unique=(id,seal)=>{if(!has(id)||!code(seal)||ids.has(id)||seals.has(code(seal)))return false;ids.add(id);seals.add(code(seal));return true;};
    const valid=Boolean(manifest&&manifest.vehicleId===snapshot.vehicle?.id&&manifest.ownerVersion!==undefined&&Array.isArray(manifest.orders)&&['issue','receive'].includes(role)
      &&orders.every(order=>has(order.id)&&Array.isArray(order.pieces)&&order.pieces.length>0&&order.pieces.every(piece=>unique(piece.id,piece.expectedSeal))&&order.cmr&&Number.isInteger(order.cmr.pages)&&order.cmr.pages>=1&&order.cmr.pages<=20&&unique(order.cmr.id||`cmr:${order.id}`,order.cmr.expectedSeal)));
    return {vehicleId:snapshot.vehicle?.id,protocolId:snapshot.protocolId||snapshot.handoverId,ownerVersion:snapshot.ownerVersion,
      manifestVersion:manifest?.ownerVersion,role,actor:clone(snapshot.actor||(role==='issue'?snapshot.transferor:snapshot.receiver)||{}),
      manifestValid:valid,orders,checks:{},extras:[],signature:null,completedAt:null,emptyConfirmed:false,discrepanciesConfirmed:false,revision:0};
  }
  function items(state){
    return state.orders.flatMap(order=>[
      ...(order.pieces||[]).map(piece=>({id:piece.id,kind:'cargo',orderId:order.id,name:piece.name||order.goods,expectedSeal:piece.expectedSeal,quantity:1,order})),
      ...(order.cmr?[{id:order.cmr.id||`cmr:${order.id}`,kind:'cmr',orderId:order.id,name:'CMR',expectedSeal:order.cmr.expectedSeal,pages:order.cmr.pages,order}]:[])
    ]).concat(state.extras);
  }
  function edit(state){state.completedAt=null;state.discrepanciesConfirmed=false;state.emptyConfirmed=false;state.revision++;}
  function sign(state,inspection,now=new Date().toISOString()){
    if(!state.manifestValid)return {ok:false,reason:'MANIFEST_UNAVAILABLE'};
    if(!state.actor.id||!state.protocolId||state.ownerVersion===undefined||!inspection?.confirmed)return {ok:false,reason:'SIGNATURE_REQUIRED'};
    if(state.signature)return {ok:false,reason:'ALREADY_SIGNED'};
    state.signature=freeze({protocolId:state.protocolId,vehicleId:state.vehicleId,actorId:state.actor.id,role:state.role,ownerVersion:state.ownerVersion,signedAt:now,inspection:clone(inspection)});
    return {ok:true};
  }
  function reopen(state){state.signature=null;state.checks={};state.completedAt=null;state.emptyConfirmed=false;state.discrepanciesConfirmed=false;state.revision++;}
  function scan(state,itemId,value){
    if(!state.signature)return {ok:false,reason:'VEHICLE_NOT_SIGNED'};
    const item=items(state).find(item=>item.id===itemId);
    if(!item)return {ok:false,reason:'ITEM_NOT_FOUND'};
    if(!code(item.expectedSeal)||code(item.expectedSeal)!==code(value))return {ok:false,reason:'SEAL_MISMATCH'};
    edit(state);state.checks[itemId]={status:item.kind==='cargo'?'confirmed':'preview',code:code(value),reviewedPages:[]};
    return {ok:true,item};
  }
  function reviewPage(state,itemId,page){
    const item=items(state).find(item=>item.id===itemId),check=state.checks[itemId];
    if(item?.kind!=='cmr'||check?.status!=='preview')return {ok:false,reason:'CMR_NOT_SCANNED'};
    if(!Number.isInteger(item.pages)||item.pages<1||item.pages>20||!Number.isInteger(page)||page<0||page>=item.pages)return {ok:false,reason:'INVALID_PAGE'};
    if(!check.reviewedPages.includes(page))check.reviewedPages.push(page);
    return {ok:true};
  }
  function acceptDocument(state,itemId){
    const item=items(state).find(item=>item.id===itemId),check=state.checks[itemId];
    if(item?.kind!=='cmr'||check?.status!=='preview')return {ok:false,reason:'CMR_NOT_SCANNED'};
    if(!Number.isInteger(item.pages)||item.pages<1||item.pages>20||Array.from({length:item.pages},(_,i)=>i).some(i=>!check.reviewedPages.includes(i)))return {ok:false,reason:'CMR_PAGES_REQUIRED'};
    edit(state);check.status='confirmed';return {ok:true};
  }
  function missing(state,itemId,note){
    if(!state.signature)return {ok:false,reason:'VEHICLE_NOT_SIGNED'};
    if(!items(state).some(item=>item.id===itemId))return {ok:false,reason:'ITEM_NOT_FOUND'};
    if(!has(note))return {ok:false,reason:'DISCREPANCY_NOTE_REQUIRED'};
    edit(state);state.checks[itemId]={status:'missing',note:note.trim()};return {ok:true};
  }
  function add(state,input={}){
    if(!['cargo','cmr'].includes(input.kind)||!has(input.orderId)||!has(input.name)||!code(input.expectedSeal))return {ok:false,reason:'EXTRA_FIELDS_REQUIRED'};
    if(items(state).some(item=>code(item.expectedSeal)===code(input.expectedSeal)))return {ok:false,reason:'DUPLICATE_SEAL'};
    const quantity=Number(input.quantity||1);
    if(!Number.isInteger(quantity)||quantity!==1)return {ok:false,reason:'ONE_PIECE_REQUIRED'};
    const id=`driver-reported-${state.vehicleId}-${state.extras.length+1}`;
    const item={id,kind:input.kind,orderId:input.orderId.trim(),name:input.name.trim(),quantity:1,expectedSeal:code(input.expectedSeal),pages:1,source:'driver-reported',note:'Dopisano przy aucie; do uzgodnienia z planem.',order:clone(input.order||{id:input.orderId,goods:input.name,massKg:0,unload:{company:'Pozycja dopisana przez kierowcę',city:'Do wyjaśnienia'},pieces:[],cmr:{pages:1,expectedSeal:code(input.expectedSeal)}})};
    if(input.kind==='cmr'&&input.scan){item.scan=input.scan;item.pages=input.scan.pageCount||1;}
    edit(state);state.extras.push(item);return {ok:true,item};
  }
  function progress(state){
    const list=items(state),count=kind=>list.filter(item=>item.kind===kind);
    return {cargo:{total:count('cargo').length,confirmed:count('cargo').filter(item=>state.checks[item.id]?.status==='confirmed').length},
      cmr:{total:count('cmr').length,confirmed:count('cmr').filter(item=>state.checks[item.id]?.status==='confirmed').length},
      undecided:list.filter(item=>!['confirmed','missing'].includes(state.checks[item.id]?.status)).length,
      missing:list.filter(item=>state.checks[item.id]?.status==='missing').length,extra:state.extras.length};
  }
  function finish(state,now=new Date().toISOString()){
    if(!state.signature||!state.manifestValid)return {ok:false,reason:'VEHICLE_NOT_SIGNED'};
    const p=progress(state);
    if(p.undecided)return {ok:false,reason:'CONTENT_NOT_CHECKED'};
    if(!items(state).length&&!state.emptyConfirmed)return {ok:false,reason:'EMPTY_NOT_CONFIRMED'};
    if((p.missing||p.extra)&&!state.discrepanciesConfirmed)return {ok:false,reason:'DISCREPANCIES_NOT_CONFIRMED'};
    state.completedAt=now;return {ok:true,status:p.missing||p.extra?'LOCAL_WITH_DISCREPANCIES':'LOCAL_COMPLETE'};
  }
  function exchangeReports(first,second,exchangeId){
    return [first,second].flatMap((vehicle,index)=>[
      {id:`${exchangeId}:${index}:issue`,actor:vehicle.transferor,role:'issue',snapshot:clone(vehicle)},
      {id:`${exchangeId}:${index}:receive`,actor:vehicle.receiver,role:'receive',snapshot:clone(vehicle)}
    ]).map(record=>({...record,snapshot:{...record.snapshot,protocolId:record.id,exchangeId,actor:clone(record.actor),role:record.role}}));
  }
  return Object.freeze({create,items,sign,reopen,scan,reviewPage,acceptDocument,missing,add,progress,finish,exchangeReports});
});
