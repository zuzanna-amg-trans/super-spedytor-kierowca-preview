'use strict';
// Synthetic public example. No account, card or production TMS record is used.
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SuperSpedytorTachoHistoryDemo=api;})(typeof window==='undefined'?null:window,()=>{
  function payload(){
    const at='2026-10-12T19:00:00Z';
    const rows=[['2026-10-11T22:00:00Z','2026-10-12T08:00:00Z','rest','ddd'],['2026-10-12T08:00:00Z','2026-10-12T08:15:00Z','work','ddd'],['2026-10-12T08:15:00Z','2026-10-12T12:30:00Z','drive','ddd'],['2026-10-12T12:30:00Z','2026-10-12T13:15:00Z','rest','ddd'],['2026-10-12T13:15:00Z','2026-10-12T17:10:00Z','drive','emtrack'],['2026-10-12T17:10:00Z',at,'rest','emtrack']];
    return {driver:{id:4242},compliance:{status:'ok',stale:false,last_data_at:at,sources:['ddd','emtrack'],current:{work_mode:'rest',since:'2026-10-12T17:10:00Z',duration_s:6600,source:'emtrack'},daily:{shift_start:'2026-10-12T08:00:00Z',drive_s:29400,work_s:30300,limit_s:32400,remaining_s:3000,rest_due_at:'2026-10-13T08:00:00Z'},weekly:{drive_s:90000,fortnight_drive_s:180000,reduced_rests:1,tens_used:1},coverage:{daily_complete:true,weekly_complete:true}},
      activity_history:{status:'complete',date:'2026-10-12',time_zone:'Europe/Warsaw',window_start:rows[0][0],observed_at:at,complete:true,stale:false,periods:rows.map(([started_at,ended_at,work_mode,source])=>({started_at,ended_at,work_mode,source,duration_s:(Date.parse(ended_at)-Date.parse(started_at))/1000}))},
      last_daily_rest:{started_at:'2026-10-11T19:30:00Z',ended_at:'2026-10-12T08:00:00Z',duration_s:45000,start_confirmed:true,completed:true,sources:['ddd']}};
  }
  function render(){
    const data=payload(),view=window.SuperSpedytorLiveTachoModel.build(data,Date.parse(data.compliance.last_data_at));
    return '<p class="small-note" data-tacho-history-demo>DEMO · DANE DEMONSTRACYJNE · przykład historii dnia i zakończonego odpoczynku</p>'+window.SuperSpedytorDesignedTacho.render(data,view);
  }
  return {payload,render};
});
