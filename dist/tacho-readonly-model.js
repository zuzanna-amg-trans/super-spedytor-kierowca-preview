'use strict';

((root,factory)=>{
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SuperSpedytorReadOnlyTachoModel=api;
})(typeof window==='undefined'?null:window,()=>{
  const MAX_AGE_MS=600000,FUTURE_SKEW_MS=60000;
  const MODES={drive:'Jazda',work:'Inna praca',rest:'Odpoczynek',available:'Dyspozycyjność'};
  const SOURCES={emtrack:'EMTRACK',gbox:'GBOX',ddd:'Plik DDD',import:'Import'};
  const object=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
  const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
  const id=value=>{
    if(typeof value==='number')return Number.isSafeInteger(value)&&value>0?String(value):null;
    if(typeof value==='string'&&/^[1-9]\d{0,15}$/.test(value)&&Number.isSafeInteger(Number(value)))return value;
    return null;
  };
  const seconds=value=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?value:null;
  const timestamp=value=>{
    if(typeof value!=='string')return null;
    const parts=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(value);
    if(!parts)return null;
    const [year,month,day,hour,minute,second]=parts.slice(1,7).map(Number);
    const leap=year%4===0&&(year%100!==0||year%400===0);
    const monthDays=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
    if(year<1||month<1||month>12||day<1||day>monthDays[month-1]||hour>23||minute>59||second>59
      ||parts[7]!==undefined&&(Number(parts[7])>23||Number(parts[8])>59))return null;
    const ms=Date.parse(value);return Number.isFinite(ms)?ms:null;
  };
  function sessionContext(session){
    if(!object(session)||session.status!=='connected'||!object(session.profile))return null;
    const profile=session.profile,userId=id(profile.id);
    const hasDirect=own(profile,'driver_id'),hasNested=own(profile,'driver_profile');
    const direct=hasDirect?id(profile.driver_id):null;
    const nested=hasNested&&object(profile.driver_profile)&&own(profile.driver_profile,'id')?id(profile.driver_profile.id):null;
    if(!userId||(hasDirect&&!direct)||(hasNested&&(!object(profile.driver_profile)||!nested))||(direct&&nested&&direct!==nested))return null;
    const driverId=direct||nested;
    if(!driverId||typeof session.backend_origin!=='string')return null;
    let origin;
    try{const u=new URL(session.backend_origin);if(u.protocol!=='https:'||u.username||u.password||u.port||u.search||u.hash||u.pathname!=='/'||!['dev.amg-trans.eu','tms.amg.eco'].includes(u.hostname))return null;origin=u.origin;}catch{return null;}
    return {userId,driverId,origin,key:`${origin}|${userId}|${driverId}`};
  }
  function empty(state='no_data',reason='no_data'){
    return {state,reason,ready:false,observedAt:null,sourceNames:[],mode:null,modeLabel:null,status:null,
      currentDurationSeconds:null,continuousDriveSeconds:null,timeToBreakSeconds:null,shiftDriveSeconds:null,
      weekDriveSeconds:null,fortnightDriveSeconds:null,dailyHistoryComplete:false,weeklyHistoryComplete:false,alerts:[]};
  }
  function build(payload,session,nowMs){
    const context=sessionContext(session);
    if(!context)return empty('error','session');
    if(!object(payload)||!object(payload.driver)||id(payload.driver.id)!==context.driverId)return empty('error','identity');
    const c=payload.compliance;
    if(!object(c)||!['ok','warning','violation','no_data'].includes(c.status))return empty('error','malformed');
    const view=empty();view.observedAt=timestamp(c.last_data_at);
    const sourceKeys=Array.isArray(c.sources)?c.sources.filter(s=>typeof s==='string'&&own(SOURCES,s)):[];
    if(object(c.current)&&typeof c.current.source==='string'&&own(SOURCES,c.current.source))sourceKeys.push(c.current.source);
    view.sourceNames=[...new Set(sourceKeys)].map(s=>SOURCES[s]);
    if(c.status==='no_data'||!object(c.current)||!own(MODES,c.current.work_mode))return view;
    if(typeof nowMs!=='number'||!Number.isFinite(nowMs)||view.observedAt===null)return {...view,state:'stale',reason:'timestamp'};
    const age=nowMs-view.observedAt;
    if(c.stale!==false||age>MAX_AGE_MS||age< -FUTURE_SKEW_MS)return {...view,state:'stale',reason:'expired'};
    view.state='ready';view.reason=null;view.ready=true;view.mode=c.current.work_mode;view.modeLabel=MODES[view.mode];view.status=c.status;
    view.currentDurationSeconds=seconds(c.current.duration_s);
    view.continuousDriveSeconds=seconds(c.break?.continuous_drive_s);
    view.timeToBreakSeconds=seconds(c.break?.time_to_break_s);
    view.shiftDriveSeconds=seconds(c.daily?.drive_s);
    view.weekDriveSeconds=seconds(c.weekly?.drive_s);
    view.fortnightDriveSeconds=seconds(c.weekly?.fortnight_drive_s);
    view.dailyHistoryComplete=c.coverage?.daily_complete===true;
    view.weeklyHistoryComplete=c.coverage?.weekly_complete===true;
    view.alerts=(Array.isArray(payload.alerts)?payload.alerts:[]).filter(a=>object(a)&&id(a.driver)===context.driverId&&a.resolved_at==null)
      .slice(0,5).map(a=>({message:typeof a.message==='string'?a.message.slice(0,240):typeof a.alert_type_label==='string'?a.alert_type_label.slice(0,240):'Alert TMS',severity:[10,20,30].includes(a.severity)?a.severity:10}));
    return view;
  }
  function formatDuration(value){
    const s=seconds(value);if(s===null)return '—';
    const minutes=Math.floor(s/60);return `${Math.floor(minutes/60)}:${String(minutes%60).padStart(2,'0')}`;
  }
  function formatTimestamp(value){
    if(typeof value!=='number'||!Number.isFinite(value))return 'Brak daty odczytu';
    return new Intl.DateTimeFormat('pl-PL',{timeZone:'Europe/Warsaw',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(value));
  }
  return {build,sessionContext,formatDuration,formatTimestamp,MAX_AGE_MS,FUTURE_SKEW_MS};
});
