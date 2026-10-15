(function(root,factory){
  const model=factory();
  if(typeof module==='object'&&module.exports)module.exports=model;
  else root.SuperSpedytorCmrCollection=model;
})(typeof window==='object'?window:globalThis,()=>{
  'use strict';
  const expected=(group,orders)=>orders.filter(order=>order.sourceId===group?.sourceId);
  const referenceFor=(group,orders,itemId)=>expected(group,orders).find(order=>order.id===itemId)||null;
  function assess(group,orders){
    const list=expected(group,orders),documents=group?.documents||[],missingIds=group?.shortage?.itemIds||[];
    const acceptedIds=new Set(documents.map(document=>document.handoverId));
    const valid=documents.every(document=>document.confirmed&&document.sourceId===group.sourceId&&list.some(order=>order.id===document.handoverId))&&acceptedIds.size===documents.length;
    const missing=list.filter(order=>missingIds.includes(order.id)&&!acceptedIds.has(order.id));
    const missingValid=missing.length===missingIds.length&&(!missing.length||Boolean(group.shortage?.confirmedAt));
    const remaining=list.filter(order=>!acceptedIds.has(order.id)&&!missingIds.includes(order.id));
    return {expected:list,accepted:documents,missing,remaining,complete:valid&&documents.length===list.length&&list.length>0,
      canSeal:Boolean(valid&&missingValid&&documents.length>0&&remaining.length===0&&!group.pendingDocument&&!group.blockedDocument)};
  }
  function validateScan(group,orders,code){
    const order=orders.find(item=>item.qrCode===code);
    if(!group)return {ok:false,kind:'no_driver'};
    if(group.envelope?.sealCode)return {ok:false,kind:'sealed'};
    if(group.pendingDocument||group.blockedDocument)return {ok:false,kind:'decision_pending'};
    if(!order)return {ok:false,kind:'unknown'};
    if(order.sourceId!==group.sourceId)return {ok:false,kind:'wrong_driver',order};
    if(group.documents.some(item=>item.handoverId===order.id))return {ok:false,kind:'duplicate'};
    return {ok:true,order};
  }
  function reportMissing(group,orders,itemIds,confirmedAt){
    if(!group||group.envelope?.sealCode||group.pendingDocument||group.blockedDocument)throw new Error('Najpierw zakończ decyzję o skanowanym dokumencie.');
    const ids=[...new Set(itemIds)],list=expected(group,orders);
    if(!ids.length||ids.some(id=>!list.some(order=>order.id===id)||group.documents.some(document=>document.handoverId===id)))throw new Error('Wybierz brakujące dokumenty z listy tej osoby.');
    if(!confirmedAt)throw new Error('Potwierdź sprawdzenie brakujących oryginałów.');
    group.shortage={itemIds:[...new Set([...(group.shortage?.itemIds||[]),...ids])],confirmedAt,syncState:'LOCAL_ONLY'};
    group.envelope.contentsConfirmed=false;
  }
  function acceptPending(group,orders,acceptedAt){
    const record=group?.pendingDocument;
    if(!record||group.blockedDocument||group.envelope?.sealCode)throw new Error('Nie ma dokumentu do przyjęcia.');
    const verdict=validateScan({...group,pendingDocument:null},orders,record.qrCode);
    if(!verdict.ok||verdict.order.id!==record.handoverId)throw new Error('Ten dokument nie pasuje do aktywnej koperty.');
    record.confirmed=true;record.acceptedAt=acceptedAt;
    group.documents.unshift(record);group.pendingDocument=null;
    if(group.shortage)group.shortage.itemIds=group.shortage.itemIds.filter(id=>id!==record.handoverId);
    group.envelope.contentsConfirmed=false;
    return record;
  }
  return {assess,validateScan,reportMissing,acceptPending,referenceFor};
});
