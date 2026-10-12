'use strict';

(function exposeVehicleHandover(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SuperSpedytorVehicleHandover=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  const acceptedStatuses=new Set(['matching','missing','damaged']);

  const has=value=>value!==null&&value!==undefined&&String(value).trim()!=='';

  function validateSnapshot(snapshot={}){
    const errors=[];
    if(!has(snapshot.handoverId))errors.push('handover_id');
    if(!has(snapshot.ownerVersion))errors.push('owner_version');
    if(!has(snapshot.vehicle?.id))errors.push('vehicle.id');
    if(!has(snapshot.vehicle?.registration))errors.push('vehicle.registration');
    if(!has(snapshot.transferor?.id))errors.push('transferor.id');
    if(!has(snapshot.receiver?.id))errors.push('receiver.id');
    if(!Array.isArray(snapshot.equipment)||snapshot.equipment.length===0)errors.push('equipment');
    else snapshot.equipment.forEach((item,index)=>{
      if(!has(item?.id))errors.push(`equipment[${index}].id`);
      if(!has(item?.name))errors.push(`equipment[${index}].name`);
      if(!Number.isFinite(Number(item?.expectedQuantity))||Number(item.expectedQuantity)<0){
        errors.push(`equipment[${index}].expected_quantity`);
      }
    });
    return {valid:errors.length===0,errors};
  }

  function itemReady(itemId,protocol={}){
    const status=protocol.statuses?.[itemId];
    if(status==='matching')return true;
    if(status!=='missing'&&status!=='damaged')return false;
    return Boolean(protocol.photos?.[itemId]&&has(protocol.notes?.[itemId]));
  }

  function progress(snapshot={},protocol={}){
    const equipment=Array.isArray(snapshot.equipment)?snapshot.equipment:[];
    const complete=equipment.filter(item=>itemReady(item.id,protocol)).length;
    const issues=equipment.filter(item=>['missing','damaged'].includes(protocol.statuses?.[item.id])).length;
    const answered=equipment.filter(item=>acceptedStatuses.has(protocol.statuses?.[item.id])).length;
    return {complete,issues,answered,total:equipment.length};
  }

  function readingsReady(protocol={}){
    const odometer=Number(protocol.odometerKm);
    return Number.isFinite(odometer)&&odometer>=0&&has(protocol.fuelLevel);
  }

  function ready(snapshot={},protocol={}){
    const validation=validateSnapshot(snapshot);
    const counts=progress(snapshot,protocol);
    return validation.valid
      && counts.total>0
      && counts.complete===counts.total
      && readingsReady(protocol)
      && protocol.receiverConfirmed===true;
  }

  function buildSubmission(snapshot={},protocol={},meta={}){
    if(!ready(snapshot,protocol))throw new Error('vehicle_handover_not_ready');
    return {
      idempotency_key:meta.idempotencyKey,
      occurred_at:meta.occurredAt,
      device_id:meta.deviceId,
      expected_owner_version:snapshot.ownerVersion,
      vehicle_id:snapshot.vehicle.id,
      transferor_driver_id:snapshot.transferor.id,
      receiver_driver_id:snapshot.receiver.id,
      odometer_km:Number(protocol.odometerKm),
      fuel_level:protocol.fuelLevel,
      receiver_confirmation:true,
      equipment:snapshot.equipment.map(item=>({
        equipment_item_id:item.id,
        expected_quantity:Number(item.expectedQuantity),
        status:protocol.statuses[item.id],
        note:protocol.notes?.[item.id]||null,
        upload_id:protocol.photos?.[item.id]?.uploadId||null
      }))
    };
  }

  function confirmsOwnerReadback(snapshot={},readback={}){
    return readback.handover_id===snapshot.handoverId
      && ['completed','completed_with_issues'].includes(readback.owner_state)
      && Number(readback.owner_version)>Number(snapshot.ownerVersion)
      && readback.assignment?.vehicle_id===snapshot.vehicle?.id
      && readback.assignment?.driver_id===snapshot.receiver?.id;
  }

  return Object.freeze({
    validateSnapshot,
    itemReady,
    progress,
    readingsReady,
    ready,
    buildSubmission,
    confirmsOwnerReadback
  });
});
