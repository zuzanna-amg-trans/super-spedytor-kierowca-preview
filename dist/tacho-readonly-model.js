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
      currentSince:null,currentSinceLabel:null,shiftStartedAt:null,shiftStartedAtLabel:null,
      lastActivity:null,restProgress:null,currentDurationSeconds:null,continuousDriveSeconds:null,timeToBreakSeconds:null,shiftDriveSeconds:null,
      shiftDriveLimitSeconds:null,shiftDriveRemainingSeconds:null,dailyWorkSeconds:null,
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
    const since=activityStart(c.current.since,view.observedAt,nowMs);
    const rest=c.current.work_mode==='rest'?restProgress(payload.rest_progress,payload.event,nowMs):null;
    const knownSince=rest?.sourceStartConfirmed?rest.startedAt:since;
    view.lastActivity={mode:c.current.work_mode,modeLabel:MODES[c.current.work_mode],sinceLabel:formatActivityTimestamp(knownSince,view.observedAt)};
    const age=nowMs-view.observedAt;
    if(c.stale!==false||age>MAX_AGE_MS||age< -FUTURE_SKEW_MS)return {...view,state:'stale',reason:'expired'};
    view.state='ready';view.reason=null;view.ready=true;view.mode=c.current.work_mode;view.modeLabel=MODES[view.mode];view.status=c.status;
    // TMS contract: compliance.current.since is the source segment's started_at.
    // Never infer it from last_data_at, duration_s, a declaration or this clock.
    view.currentSince=activityStart(c.current.since,view.observedAt,nowMs);
    view.currentSinceLabel=formatActivityTimestamp(view.currentSince,view.observedAt);
    view.shiftStartedAt=activityStart(c.daily?.shift_start,view.observedAt,nowMs);
    view.shiftStartedAtLabel=formatActivityTimestamp(view.shiftStartedAt,view.observedAt);
    view.currentDurationSeconds=seconds(c.current.duration_s);
    if(view.mode==='rest'){
      view.restProgress=rest;
      if(view.restProgress?.startConfirmed){
        view.currentSince=view.restProgress.startedAt;
        view.currentSinceLabel=formatActivityTimestamp(view.currentSince,view.observedAt);
        view.currentDurationSeconds=view.restProgress.elapsedSeconds;
      }
    }
    view.continuousDriveSeconds=seconds(c.break?.continuous_drive_s);
    view.timeToBreakSeconds=seconds(c.break?.time_to_break_s);
    view.shiftDriveSeconds=seconds(c.daily?.drive_s);
    view.shiftDriveLimitSeconds=seconds(c.daily?.limit_s);
    view.shiftDriveRemainingSeconds=seconds(c.daily?.remaining_s);
    view.dailyWorkSeconds=seconds(c.daily?.work_s);
    view.weekDriveSeconds=seconds(c.weekly?.drive_s);
    view.fortnightDriveSeconds=seconds(c.weekly?.fortnight_drive_s);
    view.dailyHistoryComplete=c.coverage?.daily_complete===true;
    view.weeklyHistoryComplete=c.coverage?.weekly_complete===true;
    view.alerts=(Array.isArray(payload.alerts)?payload.alerts:[]).filter(a=>object(a)&&id(a.driver)===context.driverId&&a.resolved_at==null)
      .slice(0,5).map(a=>({message:typeof a.message==='string'?a.message.slice(0,240):typeof a.alert_type_label==='string'?a.alert_type_label.slice(0,240):'Alert TMS',severity:[10,20,30].includes(a.severity)?a.severity:10}));
    return view;
  }
  // B896: a later declaration chooses the rest type, not a new start.
  // Keep source activity separate from a confirmed target / compensation plan.
  function restProgress(progress,event,nowMs){
    if(!object(progress)||progress.scope!=='rest_only'||!['confirmed','needs_verification'].includes(progress.status))return null;
    const at=timestamp(progress.data_as_of),start=timestamp(progress.started_at);
    if(at===null||start===null||start<=0||start>at||start>nowMs||at-nowMs>FUTURE_SKEW_MS)return null;
    const fresh=progress.stale===false&&nowMs-at<=MAX_AGE_MS;
    const elapsed=seconds(progress.elapsed_s),remaining=seconds(progress.remaining_s);
    const base=seconds(progress.base_duration_s),compensation=seconds(progress.compensation_before_s);
    const total=seconds(progress.total_duration_s),end=timestamp(progress.end_at);
    const type=typeof progress.event_type==='string'?progress.event_type:'';
    const allowed=['break_15','break_30','break_45','daily_rest_9','daily_rest_11','weekly_rest_24','weekly_rest_45'];
    const reported=timestamp(progress.event_reported_at);
    const matches=!object(event)||event.event_type===type;
    const validPlan=fresh&&progress.start_confirmed===true&&allowed.includes(type)&&matches
      &&reported!==null&&reported>=start&&reported<=nowMs&&base!==null&&base>0
      &&compensation!==null&&total!==null&&total===base+compensation&&end!==null
      &&Math.abs(end-start-total*1000)<=1000&&elapsed!==null&&remaining!==null
      &&Math.abs(Math.max(0,total-elapsed)-remaining)<=2;
    const confirmed=validPlan&&progress.status==='confirmed'
      &&Array.isArray(progress.reasons)&&progress.reasons.length===0;
    return {startedAt:start,sourceStartConfirmed:progress.start_confirmed===true,startConfirmed:progress.start_confirmed===true&&fresh,
      startedAtLabel:formatActivityTimestamp(start,at),elapsedSeconds:fresh?elapsed:null,
      planConfirmed:confirmed,planEstimated:validPlan&&!confirmed,stale:!fresh,
      endAt:validPlan?end:null,endAtLabel:validPlan?formatActivityTimestamp(end,at):null,
      baseDurationSeconds:validPlan?base:null,compensationBeforeSeconds:validPlan?compensation:null,
      totalDurationSeconds:validPlan?total:null,remainingSeconds:validPlan?remaining:null,
      otherCompensationOwedSeconds:fresh?seconds(progress.other_compensation_owed_s):null};
  }
  function activityStart(value,observedAt,nowMs){
    const start=timestamp(value);
    return start!==null&&start>0&&start<=observedAt&&start<=nowMs?start:null;
  }
  function formatActivityTimestamp(value,referenceMs){
    if(typeof value!=='number'||!Number.isFinite(value))return null;
    const parts=at=>Object.fromEntries(new Intl.DateTimeFormat('pl-PL',{timeZone:'Europe/Warsaw',
      year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
      .formatToParts(new Date(at)).map(part=>[part.type,part.value]));
    const at=parts(value),reference=parts(referenceMs);
    return `${at.day}.${at.month}${at.year===reference.year?'':'.'+at.year} ${at.hour}:${at.minute}`;
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
