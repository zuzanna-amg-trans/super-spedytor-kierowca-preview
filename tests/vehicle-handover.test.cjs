'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const handover=require('../dist/vehicle-handover.js');

const snapshot={
  handoverId:'handover-1',
  ownerVersion:7,
  vehicle:{id:'vehicle-1',registration:'DEMO 01'},
  transferor:{id:'driver-a'},
  receiver:{id:'driver-b'},
  equipment:[
    {id:'extinguisher',name:'Gaśnica',expectedQuantity:1},
    {id:'straps',name:'Pasy transportowe',expectedQuantity:12}
  ]
};

test('odrzuca niepelny zrzut wlascicielski API',()=>{
  const result=handover.validateSnapshot({});
  assert.equal(result.valid,false);
  assert.ok(result.errors.includes('vehicle.id'));
  assert.ok(result.errors.includes('equipment'));
});

test('zgodna pozycja nie wymaga zdjecia ani opisu',()=>{
  assert.equal(handover.itemReady('extinguisher',{statuses:{extinguisher:'matching'}}),true);
});

test('niezgodnosc wymaga jednoczesnie zdjecia i opisu',()=>{
  const protocol={statuses:{straps:'missing'},notes:{straps:'Brakuje dwoch pasow'},photos:{}};
  assert.equal(handover.itemReady('straps',protocol),false);
  protocol.photos.straps={uploadId:'upload-1'};
  assert.equal(handover.itemReady('straps',protocol),true);
});

test('protokol wymaga odczytow, calej listy i potwierdzenia odbiorcy',()=>{
  const protocol={
    odometerKm:'123456',fuelLevel:'half',receiverConfirmed:true,
    statuses:{extinguisher:'matching',straps:'missing'},
    notes:{straps:'Brakuje dwoch pasow'},photos:{straps:{uploadId:'upload-1'}}
  };
  assert.equal(handover.ready(snapshot,protocol),true);
  protocol.receiverConfirmed=false;
  assert.equal(handover.ready(snapshot,protocol),false);
});

test('payload zachowuje identyfikatory i wersje ze zrzutu API',()=>{
  const protocol={
    odometerKm:'123456',fuelLevel:'half',receiverConfirmed:true,
    statuses:{extinguisher:'matching',straps:'damaged'},
    notes:{straps:'Przetarcie'},photos:{straps:{uploadId:'upload-2'}}
  };
  const payload=handover.buildSubmission(snapshot,protocol,{
    idempotencyKey:'idem-1',occurredAt:'2026-10-13T10:00:00Z',deviceId:'device-1'
  });
  assert.equal(payload.expected_owner_version,7);
  assert.equal(payload.vehicle_id,'vehicle-1');
  assert.equal(payload.receiver_driver_id,'driver-b');
  assert.equal(payload.equipment[1].upload_id,'upload-2');
});

test('dopiero readback z nowym przypisaniem potwierdza przekazanie',()=>{
  assert.equal(handover.confirmsOwnerReadback(snapshot,{
    handover_id:'handover-1',owner_state:'completed_with_issues',owner_version:8,
    assignment:{vehicle_id:'vehicle-1',driver_id:'driver-b'}
  }),true);
  assert.equal(handover.confirmsOwnerReadback(snapshot,{
    handover_id:'handover-1',owner_state:'completed',owner_version:8,
    assignment:{vehicle_id:'vehicle-1',driver_id:'driver-a'}
  }),false);
});
