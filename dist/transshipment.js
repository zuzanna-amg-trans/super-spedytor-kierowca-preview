'use strict';

(function attachTransshipmentModel(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SuperSpedytorTransshipment=api;
})(typeof window!=='undefined'?window:globalThis,function createTransshipmentModel(){
  const clone=value=>JSON.parse(JSON.stringify(value));

  function unloadSequence(order){
    const value=Number(order?.unload?.sequence);
    return Number.isFinite(value)?value:0;
  }

  function sortForVehicleLoading(orders=[]){
    return [...orders].sort((left,right)=>{
      const bySequence=unloadSequence(right)-unloadSequence(left);
      if(bySequence)return bySequence;
      const leftTime=Date.parse(left?.unload?.plannedAt||'')||0;
      const rightTime=Date.parse(right?.unload?.plannedAt||'')||0;
      return rightTime-leftTime;
    });
  }

  function normalizeOrder(order,loadingIndex){
    return {
      ...clone(order),
      loadingIndex,
      cmr:{
        ...clone(order.cmr||{}),
        scannedCode:null,
        previewVisible:false,
        reviewedPages:[],
        previewPage:0,
        zoomed:false,
        viewerOpen:false,
        accepted:false,
        issuedCode:null,handedOver:false,
        acceptedAt:null
      },
      pieces:(order.pieces||[]).map((piece,pieceIndex)=>({
        ...clone(piece),
        pieceIndex,
        scannedCode:null,
        photos:{near:null,far:null},
        received:false,issued:false,issuedCode:null,
        receivedAt:null
      }))
    };
  }

  function createSession(payload={}){
    const orders=sortForVehicleLoading(payload.orders||[]).map((order,index)=>normalizeOrder({...order,sourceDriver:order.sourceDriver||payload.sourceDriver||{}},index));
    return {
      id:payload.id||'local-transshipment-session',
      sourceDriver:clone(payload.sourceDriver||{}),
      receiverVehicle:clone(payload.receiverVehicle||{}),
      ownerVersion:payload.ownerVersion??null,
      direction:payload.direction||'receive',
      retainedOrders:clone(payload.retainedOrders||[]),
      selectedVehicleId:null,
      overviewTab:'balance',
      screen:'info',
      returnScreen:'info',
      started:false,
      finished:false,
      activeOrderIndex:0,
      syncState:'LOCAL_ONLY',
      orders,
      messages:[]
    };
  }

  function activeOrder(session){
    return session?.orders?.[session.activeOrderIndex]||null;
  }

  // This is a suggested placement, not a record of a physical move.
  function vehicleLoadingPlan(session){
    return sortForVehicleLoading([
      ...session.orders.map(order=>({...order,disposition:'incoming'})),
      ...(session.retainedOrders||[]).map(order=>({...clone(order),disposition:'retained'}))
    ]).map((order,index,list)=>({...order,vehiclePosition:index+1,placement:list.length===1?'Cała przestrzeń':index===0?'Najgłębiej · przy kabinie':index===list.length-1?'Przy drzwiach':'Między pozostałymi ładunkami'}));
  }

  function counterpartyId(session,order){
    return session.direction==='issue'?(order.receiverVehicle||session.receiverVehicle).id:(order.sourceDriver.vehicleId||order.sourceDriver.id);
  }

  function selectVehicle(session,vehicleId){
    const current=activeOrder(session),isComplete=session.direction==='issue'?issuedOrderComplete:orderComplete;
    const inProgress=current&&(current.cmr.scannedCode||current.cmr.issuedCode)&&!isComplete(current);
    if(inProgress&&counterpartyId(session,current)!==vehicleId)return {ok:false,reason:'ORDER_IN_PROGRESS'};
    const index=session.orders.findIndex(order=>counterpartyId(session,order)===vehicleId&&!isComplete(order));
    if(index<0)return {ok:false,reason:'NO_PENDING_VEHICLE'};
    session.activeOrderIndex=index;
    session.selectedVehicleId=vehicleId;
    return {ok:true,order:activeOrder(session)};
  }

  function reviewCmrPage(session,pageIndex){
    const order=activeOrder(session),cmr=order?.cmr;
    if(!cmr?.previewVisible&&!cmr?.issuedCode)return {ok:false,reason:'CMR_NOT_SCANNED'};
    if(!Number.isInteger(cmr.pages)||cmr.pages<1||cmr.pages>20||!Number.isInteger(pageIndex)||pageIndex<0||pageIndex>=cmr.pages)return {ok:false,reason:'INVALID_CMR_PAGE'};
    cmr.previewPage=pageIndex;
    if(!cmr.reviewedPages.includes(pageIndex))cmr.reviewedPages.push(pageIndex);
    return {ok:true};
  }

  function cmrReviewComplete(order){
    const pages=Number(order?.cmr?.pages);
    return Number.isInteger(pages)&&pages>0&&pages<=20&&Array.from({length:pages},(_,index)=>index).every(index=>order.cmr.reviewedPages.includes(index));
  }

  function nextPiece(order){
    return order?.pieces?.find(piece=>!piece.received)||null;
  }

  function orderComplete(order){
    return Boolean(order?.cmr?.accepted&&order.pieces.length>0&&order.pieces.every(piece=>piece.received));
  }

  function sessionComplete(session){
    return Boolean(session?.orders?.length&&session.orders.every(orderComplete));
  }

  function progress(session){
    const cmrDone=session.orders.filter(order=>order.cmr.accepted).length;
    const pieces=session.orders.flatMap(order=>order.pieces);
    const piecesDone=pieces.filter(piece=>piece.received).length;
    return {
      ordersDone:session.orders.filter(orderComplete).length,
      ordersTotal:session.orders.length,
      cmrDone,
      cmrTotal:session.orders.length,
      piecesDone,
      piecesTotal:pieces.length
    };
  }

  function scanCmr(session,rawCode,now=new Date().toISOString()){
    const order=activeOrder(session);
    const code=String(rawCode||'').trim().toUpperCase();
    if(!order)return {ok:false,reason:'NO_ACTIVE_ORDER'};
    if(order.cmr.accepted)return {ok:false,reason:'CMR_ALREADY_ACCEPTED'};
    if(code!==String(order.cmr.expectedSeal||'').trim().toUpperCase())return {ok:false,reason:'CMR_SEAL_MISMATCH',expected:order.cmr.expectedSeal};
    order.cmr.scannedCode=code;
    order.cmr.previewVisible=true;
    order.cmr.previewPage=0;
    order.cmr.scannedAt=now;
    return {ok:true,order};
  }

  function acceptCmr(session,now=new Date().toISOString()){
    const order=activeOrder(session);
    if(!order?.cmr?.previewVisible||!order.cmr.scannedCode)return {ok:false,reason:'CMR_NOT_SCANNED'};
    if(!cmrReviewComplete(order))return {ok:false,reason:'CMR_PAGES_NOT_REVIEWED'};
    order.cmr.accepted=true;
    order.cmr.acceptedAt=now;
    return {ok:true,order};
  }

  function scanPiece(session,pieceId,rawCode,now=new Date().toISOString()){
    const order=activeOrder(session);
    const piece=order?.pieces?.find(item=>item.id===pieceId);
    const code=String(rawCode||'').trim().toUpperCase();
    if(!order)return {ok:false,reason:'NO_ACTIVE_ORDER'};
    if(!order.cmr.accepted)return {ok:false,reason:'CMR_NOT_ACCEPTED'};
    if(!piece)return {ok:false,reason:'PIECE_NOT_FOUND'};
    if(piece.received)return {ok:false,reason:'PIECE_ALREADY_RECEIVED'};
    if(nextPiece(order)?.id!==piece.id)return {ok:false,reason:'WRONG_PIECE_ORDER'};
    if(code!==String(piece.expectedSeal||'').trim().toUpperCase())return {ok:false,reason:'CARGO_SEAL_MISMATCH',expected:piece.expectedSeal};
    piece.scannedCode=code;
    piece.scannedAt=now;
    return {ok:true,order,piece};
  }

  function savePiecePhoto(session,pieceId,side,record){
    const order=activeOrder(session),piece=nextPiece(order);
    if(!order?.cmr.accepted)return {ok:false,reason:'CMR_NOT_ACCEPTED'};
    if(piece?.id!==pieceId)return {ok:false,reason:'WRONG_PIECE_ORDER'};
    if(!piece.scannedCode)return {ok:false,reason:'CARGO_NOT_SCANNED'};
    if(!['near','far'].includes(side)||!record?.url)return {ok:false,reason:'PHOTO_REQUIRED'};
    piece.photos[side]=record;
    return {ok:true,piece};
  }

  function completePiece(session,pieceId,now=new Date().toISOString()){
    const order=activeOrder(session),piece=nextPiece(order);
    if(!order?.cmr.accepted)return {ok:false,reason:'CMR_NOT_ACCEPTED'};
    if(piece?.id!==pieceId)return {ok:false,reason:'WRONG_PIECE_ORDER'};
    if(!piece.scannedCode)return {ok:false,reason:'CARGO_NOT_SCANNED'};
    if(!piece.photos.near||!piece.photos.far)return {ok:false,reason:'PHOTOS_INCOMPLETE'};
    piece.received=true;
    piece.receivedAt=now;
    return {ok:true,order,piece};
  }

  function advance(session){
    const order=activeOrder(session);
    const isComplete=session.direction==='issue'?issuedOrderComplete:orderComplete;
    if(!isComplete(order))return {ok:false,reason:'ORDER_INCOMPLETE'};
    const nextIndex=session.orders.findIndex(item=>!isComplete(item));
    if(nextIndex>=0){
      session.activeOrderIndex=nextIndex;
      session.selectedVehicleId=counterpartyId(session,activeOrder(session));
      return {ok:true,finished:false,order:activeOrder(session)};
    }
    return {ok:true,finished:true,order};
  }

  function nextIssuedPiece(order){return order?.pieces?.find(piece=>!piece.issued)||null;}

  function scanIssuedCmr(session,rawCode,now=new Date().toISOString()){
    const order=activeOrder(session),code=String(rawCode||'').trim().toUpperCase();
    if(!order)return {ok:false,reason:'NO_ACTIVE_ORDER'};
    if(order.cmr.handedOver)return {ok:false,reason:'CMR_ALREADY_ISSUED'};
    if(code!==String(order.cmr.expectedSeal||'').trim().toUpperCase())return {ok:false,reason:'CMR_SEAL_MISMATCH',expected:order.cmr.expectedSeal};
    order.cmr.issuedCode=code;order.cmr.issuedScannedAt=now;
    return {ok:true,order};
  }

  function confirmIssuedCmr(session,now=new Date().toISOString()){
    const order=activeOrder(session);
    if(!order?.cmr.issuedCode)return {ok:false,reason:'CMR_NOT_SCANNED'};
    if(!cmrReviewComplete(order))return {ok:false,reason:'CMR_PAGES_NOT_REVIEWED'};
    order.cmr.handedOver=true;order.cmr.handedOverAt=now;
    return {ok:true,order};
  }

  function scanIssuedPiece(session,pieceId,rawCode,now=new Date().toISOString()){
    const order=activeOrder(session),piece=order?.pieces.find(item=>item.id===pieceId),code=String(rawCode||'').trim().toUpperCase();
    if(!order?.cmr.handedOver)return {ok:false,reason:'CMR_NOT_ISSUED'};
    if(!piece)return {ok:false,reason:'PIECE_NOT_FOUND'};
    if(piece.issued)return {ok:false,reason:'PIECE_ALREADY_ISSUED'};
    if(nextIssuedPiece(order)?.id!==pieceId)return {ok:false,reason:'WRONG_PIECE_ORDER'};
    if(code!==String(piece.expectedSeal||'').trim().toUpperCase())return {ok:false,reason:'CARGO_SEAL_MISMATCH',expected:piece.expectedSeal};
    piece.issuedCode=code;piece.issuedScannedAt=now;
    return {ok:true,order,piece};
  }

  function confirmIssuedPiece(session,pieceId,now=new Date().toISOString()){
    const order=activeOrder(session),piece=nextIssuedPiece(order);
    if(!order?.cmr.handedOver)return {ok:false,reason:'CMR_NOT_ISSUED'};
    if(piece?.id!==pieceId)return {ok:false,reason:'WRONG_PIECE_ORDER'};
    if(!piece.issuedCode)return {ok:false,reason:'CARGO_NOT_SCANNED'};
    piece.issued=true;piece.issuedAt=now;
    return {ok:true,order,piece};
  }

  function issuedOrderComplete(order){return Boolean(order?.cmr.handedOver&&order.cmr.issuedCode&&order.pieces.length&&order.pieces.every(piece=>piece.issued&&piece.issuedCode));}

  return {
    sortForVehicleLoading,
    vehicleLoadingPlan,
    counterpartyId,
    selectVehicle,
    reviewCmrPage,
    cmrReviewComplete,
    createSession,
    activeOrder,
    nextPiece,
    orderComplete,
    sessionComplete,
    progress,
    scanCmr,
    acceptCmr,
    scanPiece,
    savePiecePhoto,
    completePiece,
    scanIssuedCmr,
    confirmIssuedCmr,
    scanIssuedPiece,
    confirmIssuedPiece,
    nextIssuedPiece,
    issuedOrderComplete,
    advance
  };
});
