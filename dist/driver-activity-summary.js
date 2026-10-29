'use strict';

((root,factory)=>{
  const model=typeof module==='object'&&module.exports?require('./tacho-readonly-model.js'):root?.SuperSpedytorReadOnlyTachoModel;
  const api=factory(model);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SuperSpedytorDriverActivitySummary=api;
})(typeof window==='undefined'?null:window,model=>{
  const MAX_AGE_MS=model?.MAX_AGE_MS||600000;
  const MODES={rest:'Odpoczynek',drive:'Jazda',work:'Inna praca',available:'Dyspozycyjność'};
  const object=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
  const seconds=value=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?value:null;
  // Require a dated source instant with its timezone; Date.parse alone normalizes
  // impossible dates and interprets unzoned values in the phone's local timezone.
  function timestamp(value){
    if(typeof value!=='string')return null;
    const p=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(value);
    if(!p)return null;
    const [y,m,d,h,min,s]=p.slice(1,7).map(Number),leap=y%4===0&&(y%100!==0||y%400===0);
    const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
    if(y<1||m<1||m>12||d<1||d>days[m-1]||h>23||min>59||s>59
      ||p[7]!==undefined&&(Number(p[7])>23||Number(p[8])>59))return null;
    const at=Date.parse(value);return Number.isFinite(at)?at:null;
  }
  function formatDateTime(at){
    if(typeof at!=='number'||!Number.isFinite(at))return null;
    const p=Object.fromEntries(new Intl.DateTimeFormat('pl-PL',{timeZone:'Europe/Warsaw',
      day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
      .formatToParts(new Date(at)).map(part=>[part.type,part.value]));
    return `${p.day}.${p.month}.${p.year} ${p.hour}:${p.minute}`;
  }
  function formatDuration(value){
    const s=seconds(value);if(s===null)return null;
    const minutes=Math.floor(s/60);
    return `${Math.floor(minutes/60)} godz. ${String(minutes%60).padStart(2,'0')} min`;
  }
  function empty(state='no_data',reason='no_data'){
    return {state,reason,ready:false,mode:null,label:'Brak danych o czynności',sinceLabel:null,
      durationLabel:null,observedAt:null,continuous:false,startMs:null,durationSeconds:null,note:null};
  }
  function build(payload,session,nowMs){
    if(!model?.sessionContext(session))return empty('error','session');
    if(typeof nowMs!=='number'||!Number.isFinite(nowMs))return empty('error','timestamp');
    const guarded=model.build(payload,session,nowMs);
    if(guarded.state==='error')return empty('error',guarded.reason);
    const c=payload?.compliance,current=c?.current;
    if(!object(c)||c.status==='no_data'||!object(current)||!Object.hasOwn(MODES,current.work_mode))return empty();
    const sourceAt=timestamp(c.last_data_at);
    // Future data cannot be described as a past or present activity.
    if(sourceAt===null||sourceAt>nowMs)return empty('no_data','timestamp');
    let observedAt=sourceAt,startMs=timestamp(current.since),durationSeconds=seconds(current.duration_s),continuous=false;
    if(startMs===null||startMs>sourceAt||startMs>nowMs){startMs=null;durationSeconds=null;}
    else if(durationSeconds!==null&&durationSeconds>(sourceAt-startMs)/1000+2)durationSeconds=null;
    const progress=payload.rest_progress;
    let progressStale=false;
    if(current.work_mode==='rest'&&object(progress)&&progress.scope==='rest_only'
      &&['confirmed','needs_verification'].includes(progress.status)&&progress.start_confirmed===true){
      const at=timestamp(progress.data_as_of),start=timestamp(progress.started_at);
      if(at!==null&&at<=nowMs&&start!==null&&start<=at&&start<=nowMs){
        // B896 aggregates continuous rest on the server. Never join day slices
        // or bridge a missing activity locally; the declaration is not a start.
        observedAt=at;startMs=start;continuous=true;
        const elapsed=seconds(progress.elapsed_s),confirmedSeconds=Math.floor((at-start)/1000);
        // B896's elapsed_s can be calculated at server request time, while
        // data_as_of remains the last source observation. Normalize to the
        // source anchor before interpolating, so the delay is never added twice.
        durationSeconds=elapsed!==null&&elapsed>=confirmedSeconds-2
          &&elapsed<=Math.floor((nowMs-start)/1000)+60?confirmedSeconds:null;
        progressStale=progress.stale!==false;
      }
    }
    const noSignal=c.live?.no_signal===true&&current.source!=='gbox';
    const stale=c.stale!==false||nowMs-sourceAt>MAX_AGE_MS||nowMs-observedAt>MAX_AGE_MS
      ||progressStale||payload.offline===true||payload.cached===true||session.offline===true||session.cached===true||noSignal;
    // The local clock can advance only within the source freshness window.
    // Historical/offline readings always keep their original source anchor.
    if(!stale&&durationSeconds!==null)durationSeconds+=Math.floor((nowMs-observedAt)/1000);
    const label=current.work_mode==='rest'&&!continuous?'Odcinek odpoczynku':MODES[current.work_mode];
    return {state:stale?'stale':'ready',reason:stale?'expired':null,ready:!stale,mode:current.work_mode,
      label,sinceLabel:formatDateTime(startMs),durationLabel:formatDuration(durationSeconds),observedAt,
      continuous,startMs,durationSeconds,
      note:stale?'Ostatni potwierdzony odczyt; czas zatrzymany na godzinie odczytu.':
        current.work_mode==='rest'&&!continuous?'Początek ciągłego odpoczynku wymaga potwierdzenia.':null};
  }
  return {build,sessionContext:model?.sessionContext,formatDateTime,formatDuration,MAX_AGE_MS};
});
