'use strict';
// One history presentation for both native Tacho surfaces. It renders only
// observed intervals; current counters remain the responsibility of their model.
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SuperSpedytorTachoHistory=api;})(typeof window==='undefined'?null:window,()=>{
  const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
  const timestamp=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(v)&&Number.isFinite(Date.parse(v))?Date.parse(v):null;
  const duration=v=>Number.isSafeInteger(v)&&v>=0?`${Math.floor(v/3600)}:${String(Math.floor(v%3600/60)).padStart(2,'0')}`:'—';
  const clock=v=>new Date(v).toLocaleString('pl-PL',{timeZone:'Europe/Warsaw',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  const modes={drive:'Jazda',work:'Praca',available:'Dyspozycyjność',rest:'Odpoczynek',unknown:'Brak potwierdzonej aktywności'};
  const sources={ddd:'DDD',emtrack:'EMTRACK',emtrack_live:'EMTRACK',gbox:'GBOX',import:'Import',conflict:'Sprzeczne źródła',missing:'Luka w odczycie'};
  const icon=mode=>`<svg class="icon" aria-hidden="true"><use href="#i-${mode==='rest'?'parking':mode==='drive'?'truck':'clock'}"/></svg>`;
  function interval(row){
    if(!object(row))return null;
    const start=timestamp(row.started_at),end=timestamp(row.ended_at);
    if(start===null||end===null||end<=start||!Number.isSafeInteger(row.duration_s)||row.duration_s<0||Math.floor((end-start)/1000)!==row.duration_s)return null;
    return {start,end,durationS:row.duration_s};
  }
  function build(data){
    const raw=data?.activity_history,result={available:false,periods:[],complete:false,caption:'Bieżący okres z TMS',note:'Historia dnia nie została udostępniona w tym odczycie.',lastRest:null};
    const rest=data?.last_daily_rest,r=interval(rest);
    if(r&&r.durationS>=9*3600&&rest.completed===true&&typeof rest.start_confirmed==='boolean')result.lastRest={...r,startConfirmed:rest.start_confirmed,sources:(Array.isArray(rest.sources)?rest.sources:[]).filter(s=>Object.hasOwn(sources,s)).map(s=>sources[s])};
    if(!object(raw)||!['complete','partial'].includes(raw.status)||raw.time_zone!=='Europe/Warsaw'||!Array.isArray(raw.periods)||!raw.periods.length||raw.periods.length>2000)return result;
    const start=timestamp(raw.window_start),end=timestamp(raw.observed_at);
    if(start===null||end===null||end<=start||end-start>25*3600000||typeof raw.complete!=='boolean')return result;
    const periods=[];let cursor=start;
    for(const row of raw.periods){
      const p=interval(row);
      if(!p||p.start!==cursor||p.end>end||!Object.hasOwn(modes,row.work_mode)||!Object.hasOwn(sources,row.source))return result;
      periods.push({...p,mode:row.work_mode,label:modes[row.work_mode],source:sources[row.source]});cursor=p.end;
    }
    if(cursor!==end||raw.complete&&(raw.status!=='complete'||periods.some(p=>p.mode==='unknown')))return result;
    return {...result,available:true,periods,complete:raw.complete,caption:'Historia dnia z TMS',
      note:`${raw.complete?'Historia dnia do':'Niepełna historia dnia do'} ${clock(end)}${raw.stale===true?' · według ostatniego odczytu':''}.${raw.complete?'':' Luki i sprzeczne źródła są oznaczone osobno.'}`};
  }
  function renderPeriods(history){
    return history.periods.map(p=>`<div class="tacho-period" data-tacho-history-period="${p.mode}"><time>${e(clock(p.start))}<small>do ${e(clock(p.end))}</small></time><span class="tacho-activity-icon ${p.mode}">${icon(p.mode)}</span><span><strong>${e(p.label)}</strong><small>${duration(p.durationS)} · ${e(p.source)}</small></span></div>`).join('');
  }
  function renderLastRest(history){
    const r=history.lastRest;
    return `<div class="tacho-rest-row" data-tacho-last-daily-rest><span class="tacho-rest-icon">${icon('rest')}</span><div><small>Ostatni odpoczynek dobowy</small><strong>${r?`${r.startConfirmed?'':'Co najmniej '}${duration(r.durationS)}`:'—'}</strong>${r?`<small>Od ${e(clock(r.start))}${r.startConfirmed?'':' · początek niepotwierdzony'}</small>`:''}</div><b>${r?`Zakończony ${e(clock(r.end))}${r.sources.length?' · '+e(r.sources.join(', ')):''}`:'Brak potwierdzonego odpoczynku w historii'}</b></div>`;
  }
  return {build,renderPeriods,renderLastRest};
});
