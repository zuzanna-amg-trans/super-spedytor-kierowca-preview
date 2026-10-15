'use strict';

(function exposeVehicleHandover(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SuperSpedytorVehicleHandover=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  const acceptedStatuses=new Set(['matching','missing','damaged']);

  const has=value=>value!==null&&value!==undefined&&String(value).trim()!=='';

  function validateInspection(snapshot={}){
    const errors=[];
    if(!has(snapshot.ownerVersion))errors.push('owner_version');
    if(!has(snapshot.vehicle?.id))errors.push('vehicle.id');
    if(!has(snapshot.vehicle?.registration))errors.push('vehicle.registration');
    if(!Array.isArray(snapshot.equipment)||snapshot.equipment.length===0)errors.push('equipment');
    else snapshot.equipment.forEach((item,index)=>{
      if(!has(item?.id))errors.push(`equipment[${index}].id`);
      if(!has(item?.name))errors.push(`equipment[${index}].name`);
      if(!Number.isFinite(Number(item?.expectedQuantity))||Number(item.expectedQuantity)<0){
        errors.push(`equipment[${index}].expected_quantity`);
      }
    });
    if(!Array.isArray(snapshot.photoRequirements)||snapshot.photoRequirements.length===0)errors.push('photo_requirements');
    else snapshot.photoRequirements.forEach((item,index)=>{
      if(!has(item?.id))errors.push(`photo_requirements[${index}].id`);
      if(!has(item?.name))errors.push(`photo_requirements[${index}].name`);
    });
    return {valid:errors.length===0,errors};
  }

  function validateSnapshot(snapshot={}){
    const {errors}=validateInspection(snapshot);
    if(!has(snapshot.handoverId))errors.push('handover_id');
    if(!has(snapshot.transferor?.id))errors.push('transferor.id');
    if(!has(snapshot.receiver?.id))errors.push('receiver.id');
    return {valid:errors.length===0,errors};
  }

  function validateInventorySnapshot(snapshot={}){
    const {errors}=validateInspection(snapshot);
    if(!has(snapshot.inventoryId))errors.push('inventory_id');
    if(!has(snapshot.author?.id))errors.push('author.id');
    return {valid:errors.length===0,errors};
  }

  function itemReady(itemId,protocol={}){
    const status=protocol.statuses?.[itemId];
    if(status==='matching'||status==='missing')return true;
    if(status!=='damaged')return false;
    const evidence=protocol.issuePhotos?.[itemId]||{};
    return Boolean(evidence.wide&&evidence.close&&has(protocol.notes?.[itemId]));
  }

  function photoProgress(snapshot={},protocol={}){
    const requirements=(Array.isArray(snapshot.photoRequirements)?snapshot.photoRequirements:[]).filter(item=>item.required!==false);
    const complete=requirements.filter(item=>protocol.vehiclePhotos?.[item.id]).length;
    return {complete,total:requirements.length};
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
    return has(protocol.odometerKm)&&Number.isFinite(odometer)&&odometer>=0&&has(protocol.fuelLevel);
  }

  function inspectionComplete(snapshot={},protocol={}){
    const counts=progress(snapshot,protocol);
    const photos=photoProgress(snapshot,protocol);
    return counts.total>0
      && counts.complete===counts.total
      && photos.total>0
      && photos.complete===photos.total
      && readingsReady(protocol);
  }

  function ready(snapshot={},protocol={}){
    return validateSnapshot(snapshot).valid&&inspectionComplete(snapshot,protocol)&&protocol.receiverConfirmed===true;
  }

  function inventoryReady(snapshot={},protocol={}){
    return validateInventorySnapshot(snapshot).valid&&inspectionComplete(snapshot,protocol)&&protocol.authorConfirmed===true;
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
      vehicle_photos:snapshot.photoRequirements
        .filter(item=>protocol.vehiclePhotos?.[item.id])
        .map(item=>({
          photo_requirement_id:item.id,
          upload_id:protocol.vehiclePhotos[item.id].uploadId
        })),
      equipment:snapshot.equipment.map(item=>({
        equipment_item_id:item.id,
        expected_quantity:Number(item.expectedQuantity),
        status:protocol.statuses[item.id],
        note:protocol.notes?.[item.id]||null,
        issue_upload_ids:['wide','close']
          .map(kind=>protocol.issuePhotos?.[item.id]?.[kind]?.uploadId)
          .filter(Boolean)
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
    validateInventorySnapshot,
    itemReady,
    progress,
    photoProgress,
    readingsReady,
    ready,
    inventoryReady,
    buildSubmission,
    confirmsOwnerReadback
  });
});
