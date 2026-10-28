'use strict';

((root,factory)=>{
  const model=typeof module==='object'&&module.exports?require('./tacho-readonly-model.js'):root.SuperSpedytorReadOnlyTachoModel;
  const api=factory(root,model);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SuperSpedytorReadOnlyTacho=api;
})(typeof window==='undefined'?null:window,(browser,model)=>{
  const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=name=>name==='refresh'?'<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M20 12a8 8 0 1 1-2.3-5.7L20 9"/></svg>':`<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const activityIcon=mode=>{
    const shapes={
      drive:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.4"/><path d="M3.8 10h16.4M12 14.4v6M6.4 10c.8 3.4 2.6 5.4 5.6 6.2M17.6 10c-.8 3.4-2.6 5.4-5.6 6.2"/>',
      work:'<path d="m5 4 15 15-3 3L2 7V4h3ZM19 3l2 2-6.5 6.5-2-2ZM8.5 15.5 3 21M16 4l4 4"/>',
      rest:'<path d="M4 19V7M4 15h16v4M7 15v-5h4a4 4 0 0 1 4 4v1M20 19v-7"/><circle cx="7" cy="11" r="1.6"/>'
    };
    return shapes[mode]?`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${shapes[mode]}</svg>`:icon('clock');
  };
  const STATES={loading:['Pobieram Twój odczyt','Łączę z TMS. Poprzednie wartości są ukryte do potwierdzenia aktualnego odczytu.'],
    paused:['Odczyt wstrzymany','Po powrocie do aplikacji ponownie sprawdzimy dane.'],
    no_data:['Brak aktualnego stanu Tacho','TMS nie potwierdził stanu tachografu dla Twojego konta. Brak danych nie oznacza dostępnego czasu jazdy.'],
    stale:['Odczyt wymaga odświeżenia','Dane są nieaktualne albo nie mają wiarygodnej daty. Sprawdź tachograf; aktualnych liczników nie potwierdzono.'],
    error:['Nie udało się potwierdzić odczytu','Sprawdź połączenie i spróbuj ponownie. Poprzednie liczniki nie są wyświetlane.']};
  const ERROR_MESSAGES={401:'Sesja TMS wygasła. Zaloguj się ponownie w aplikacji.',403:'To konto nie ma dostępu do własnego odczytu Tacho.',404:'TMS nie znalazł stanu kierowcy dla tego konta.',identity:'Dane nie odpowiadają zalogowanemu kierowcy. Odczyt został ukryty.',malformed:'TMS zwrócił niepełny odczyt. Aktualnych liczników nie potwierdzono.'};
  function renderSnapshot(view,{state=view?.state||'no_data',errorMessage=''}={}){
    // Layout is shared with the approved Tacho surface. Only a confirmed model
    // may supply numbers; unknown sections keep their place without DEMO data.
    const ready=state==='ready'&&view?.ready===true;
    if(state==='ready'&&!ready)state='error';
    const data=ready?view:null,duration=model.formatDuration;
    const source=(view?.sourceNames||[]).map(name=>`<span>${e(name)}</span>`).join('')||'<span>Źródło nieokreślone</span>';
    const stamp=view?.observedAt==null?'Brak daty odczytu':`Odczyt z ${e(model.formatTimestamp(view.observedAt))}`;
    const meta=`<div class="tro-snapshot-meta"><span>${icon('clock')}${stamp}</span><div class="tro-source-chips" aria-label="Źródła danych">${source}</div></div>`;
    const note=`<aside class="tacho-source-note tro-source-note">${icon('info')}<p><strong>Tachograf jest źródłem nadrzędnym.</strong> To wartości z ostatniego odczytu TMS, a nie potwierdzenie możliwości dalszej jazdy.</p></aside>`;
    const heading=(title,caption)=>`<div class="tacho-section-heading"><h3>${e(title)}</h3><span>${e(caption)}</span></div>`;
    const unknown='Dane niedostępne';
    const metric=(label,value,kind='',description='Wg tego samego odczytu TMS',limit=null)=>{
      const known=value!=null;
      const bar=known&&Number.isSafeInteger(value)&&Number.isSafeInteger(limit)&&limit>0
        ?`<div class="tacho-mini-progress" aria-hidden="true"><span style="--progress:${Math.max(0,Math.min(100,value/limit*100)).toFixed(1)}%"></span></div>`:'';
      return `<article class="tacho-metric ${kind}${known?'':' tro-unavailable'}"><small>${e(label)}</small><strong>${duration(value)}</strong><p>${e(known?description:unknown)}</p>${bar}</article>`;
    };
    const status={ok:'Stan TMS',warning:'TMS: zwróć uwagę',violation:'TMS: sprawdź odczyt'}[data?.status]||'Wg odczytu TMS';
    const since=data?.currentSinceLabel?`${data.mode==='rest'?'Odpoczynek':data.modeLabel} od ${data.currentSinceLabel}`:'Brak godziny rozpoczęcia w TMS';
    const rest=data?.mode==='rest';
    const mainValue=rest?data.currentDurationSeconds:data?.timeToBreakSeconds;
    const mainLabel=rest?'Trwanie odpoczynku według TMS':'Do wymaganej przerwy według TMS';
    const now=ready
      ?`<section class="tacho-now-card tro-now-card ${e(data.mode)}"><div class="tacho-now-top"><span class="tacho-status tro-mode ${e(data.mode)}"><span class="tacho-status-dot"></span>Teraz · ${e(data.modeLabel)}</span><span class="tacho-status-time">${e(status)}</span></div><div class="tacho-driver-instruction tro-current-reading"><span>${e(mainLabel)}</span><strong class="tacho-primary-time">${duration(mainValue)}</strong><p class="tro-current-since">${e(since)}</p><small>Wg ostatniego odczytu TMS</small></div><div class="tacho-driver-fact"><span>Jazda od pełnej przerwy</span><strong>${duration(data.continuousDriveSeconds)}</strong></div></section>`
      :`<section class="tacho-now-card tro-now-card tro-empty" role="${state==='error'?'alert':'status'}"><div class="tacho-now-top"><span class="tacho-status">${icon(state==='loading'?'clock':'info')}Stan odczytu</span></div><h3>${e((STATES[state]||STATES.error)[0])}</h3><p>${e(errorMessage||(STATES[state]||STATES.error)[1])}</p><strong class="tacho-primary-time" aria-label="Brak potwierdzonego licznika">—</strong></section>`;
    const limit=data?.shiftDriveLimitSeconds,remaining=data?.shiftDriveRemainingSeconds;
    const dailyDescription=limit!=null
      ?`Limit wg TMS: ${duration(limit)}${remaining!=null?` · pozostało ${duration(remaining)}`:''}`
      :remaining!=null?`Pozostało wg TMS: ${duration(remaining)}`:'Limit i pozostały czas są niedostępne';
    const currentActivity=ready
      ?`<div class="tacho-period current" data-tacho-current-period><time>${e(data.currentSinceLabel||'Brak godziny')}</time><span class="tacho-activity-icon ${e(data.mode)}" aria-hidden="true">${activityIcon(data.mode)}</span><span><strong>${e(data.modeLabel)}</strong><small>${data.currentDurationSeconds==null?'Brak długości okresu w TMS':`${duration(data.currentDurationSeconds)} · wg odczytu`}</small></span></div>`
      :`<div class="tacho-period tro-unavailable"><time>—</time><span class="tacho-activity-icon unknown" aria-hidden="true">${icon('clock')}</span><span><strong>Brak potwierdzonej aktywności</strong><small>Brak danych o bieżącym okresie.</small></span></div>`;
    const alerts=ready&&data.alerts?.length?`${heading('Komunikaty z TMS',`${data.alerts.length} komunikatów`)}<section class="tro-alerts">${data.alerts.map(a=>`<article class="tro-alert ${a.severity===30?'critical':a.severity===20?'warning':''}">${icon('info')}<p>${e(a.message)}</p></article>`).join('')}</section>`:'';
    return `<div class="tacho-screen tro-designed-screen">
      ${now}${meta}
      ${heading('Ramy dnia','Wg odczytu TMS')}
      <section class="tacho-day-window"><div><small>Dzień rozpoczęty</small><strong>${e(data?.shiftStartedAtLabel||'—')}</strong><span>${data?.shiftStartedAtLabel?'Początek zmiany wg TMS':unknown}</span></div><span class="tacho-day-arrow" aria-hidden="true">${icon('arrow')}</span><div class="deadline tro-unavailable"><small>Zakończ najpóźniej</small><strong>—</strong><span>Brak potwierdzonego terminu</span></div></section>
      ${heading('Jazda i „dziewiątki”','Wg tego samego odczytu')}
      <section class="tacho-metrics" aria-label="Bilans jazdy z TMS">
        ${metric('Jazda w zmianie',data?.shiftDriveSeconds,'tacho-drive-metric',dailyDescription,limit)}
        ${metric('Skrócone odpoczynki 9 h',null,'tacho-nine-metric')}
        <article class="tacho-extension-card tro-unavailable"><span class="tacho-extension-mark" aria-hidden="true">10 h</span><span class="tacho-extension-copy"><small>Przedłużenia jazdy do 10 h</small><strong>—</strong><span>${unknown}</span></span><b>Niedostępne</b></article>
        ${metric('Ten tydzień',data?.weekDriveSeconds,'tacho-week-metric')}
        ${metric('Dwa kolejne tygodnie',data?.fortnightDriveSeconds,'tacho-fortnight-metric')}
      </section>
      ${ready&&(!data.dailyHistoryComplete||!data.weeklyHistoryComplete)?'<p class="tro-coverage-note">Historia może być niepełna. Panel nie potwierdza dostępnych przedłużeń jazdy ani skróconych odpoczynków.</p>':''}
      ${heading('Dzisiejsza aktywność','Bieżący okres wg TMS')}
      <section class="tacho-activity-card"><div class="tacho-period-list" aria-label="Bieżąca aktywność z TMS">${currentActivity}</div>${metric('Praca w zmianie',data?.dailyWorkSeconds,'tro-work-summary')}<p class="tro-history-note">Pełna lista dzisiejszych okresów jest niedostępna.</p></section>
      ${heading('Odpoczynki','Najważniejsze terminy')}
      <section class="tacho-rest-list"><div class="tacho-rest-row tro-unavailable"><span class="tacho-rest-icon" aria-hidden="true">${icon('parking')}</span><div><small>Ostatni odpoczynek dobowy</small><strong>—</strong></div><b>${unknown}</b></div><div class="tacho-rest-row tro-unavailable"><span class="tacho-rest-icon" aria-hidden="true">${icon('clock')}</span><div><small>Następny odpoczynek dobowy</small><strong>—</strong></div><b>Brak terminu</b></div></section>
      ${alerts}${note}
    </div>`;
  }
  function create(options){
    if(!options||typeof options.getSession!=='function'||typeof options.request!=='function')throw new TypeError('Brak transportu odczytu Tacho');
    const win=browser||globalThis.window,doc=win?.document||globalThis.document;
    if(!doc||!model)throw new Error('Panel Tacho jest niedostępny');
    const clock=()=>Date.now();
    let root=null,body=null,device=null,owner=null,epoch=0,raw=null,view=null,error=null,displayState='loading';
    let inFlight=null,queued=false,busy=false,checkTimer=null,refreshTimer=null,resizeObserver=null,paused=false;
    let underlay=[];
    function context(){try{return model.sessionContext(options.getSession());}catch{return null;}}
    function alive(token=epoch,key=owner){const current=context();return Boolean(root&&current&&current.key===key&&token===epoch);}
    function hidden(){return doc.hidden===true;}
    function updateLayout(){
      if(!root||!device?.getBoundingClientRect)return;
      const frame=device.getBoundingClientRect();if(!(frame.height>0))return;
      let top=0,bottom=0;
      for(const selector of ['.app-header','#driver-workspace-bar']){
        const el=device.querySelector(selector),r=el?.getBoundingClientRect?.();
        if(el&&!el.hidden&&r?.height>0&&r.bottom>frame.top&&r.top<frame.bottom)top=Math.max(top,r.bottom-frame.top);
      }
      const nav=device.querySelector('.bottom-nav'),r=nav?.getBoundingClientRect?.();
      if(nav&&!nav.hidden&&r?.height>0&&r.top<frame.bottom&&r.bottom>frame.top)bottom=frame.bottom-r.top;
      root.style.top=`${Math.max(0,Math.min(top,frame.height-100))}px`;
      root.style.bottom=`${Math.max(0,Math.min(bottom,frame.height-100))}px`;
    }
    function paint(){
      if(!root)return;
      if(!alive()){close();return;}
      const scroll=body.scrollTop||0;
      body.innerHTML=renderSnapshot(view,{state:displayState,errorMessage:error||''});body.scrollTop=scroll;
      const button=root.querySelector('[data-tacho-readonly-refresh]');
      if(button){button.disabled=busy;button.setAttribute('aria-busy',String(busy));button.innerHTML=`${icon('refresh')}${busy?'Pobieram…':'Odśwież'}`;}
      updateLayout();
    }
    function assess(){
      if(!root)return false;
      if(!alive()){close();return false;}
      if(raw&&!hidden()){
        const next=model.build(raw,options.getSession(),clock());
        const changed=next.state!==view?.state||next.currentSince!==view?.currentSince||next.shiftStartedAt!==view?.shiftStartedAt;
        view=next;displayState=next.state;
        if(next.state==='error'){raw=null;error=ERROR_MESSAGES[next.reason]||STATES.error[1];}
        if(changed)paint();
      }
      return true;
    }
    function messageFor(response){const status=response?.status;return ERROR_MESSAGES[status]||(typeof status==='number'&&status>=500?'TMS jest chwilowo niedostępny. Spróbuj ponownie za chwilę.':STATES.error[1]);}
    async function refresh(){
      if(!root||!assess()||hidden())return false;
      if(inFlight){queued=true;return inFlight;}
      paused=false;queued=false;
      const token=epoch,key=owner;
      raw=null;view=null;error=null;displayState='loading';busy=true;paint();
      const pending=Promise.resolve().then(()=>{if(!alive(token,key)||hidden())return null;return options.request();});
      inFlight=pending;
      try{
        const response=await pending;
        if(!alive(token,key)||hidden())return false;
        if(!response||response.status!==200||response.cached===true||response.offline===true){displayState='error';error=messageFor(response);return false;}
        const next=model.build(response.body,options.getSession(),clock());
        view=next;displayState=next.state;
        if(next.state==='error'){error=ERROR_MESSAGES[next.reason]||STATES.error[1];return false;}
        raw=response.body;return next.ready;
      }catch{
        if(alive(token,key)&&!hidden()){raw=null;view=null;displayState='error';error=STATES.error[1];}
        return false;
      }finally{
        if(inFlight===pending)inFlight=null;
        if(alive(token,key)){busy=false;paint();}
        if(queued&&root&&!hidden()){queued=false;refresh();}
      }
    }
    function resumed(){
      if(!root||hidden())return;
      if(!assess())return;
      if(inFlight){queued=true;paused=true;return;}
      refresh();
    }
    function visibility(){
      if(!root)return;
      if(hidden()){
        epoch++;paused=true;queued=false;raw=null;view=null;error=null;busy=false;displayState='paused';paint();
      }else resumed();
    }
    function close(){
      epoch++;queued=false;paused=false;raw=null;view=null;owner=null;error=null;busy=false;
      if(checkTimer!==null)win.clearInterval(checkTimer);if(refreshTimer!==null)win.clearInterval(refreshTimer);
      checkTimer=null;refreshTimer=null;resizeObserver?.disconnect();resizeObserver=null;
      doc.removeEventListener('visibilitychange',visibility);win.removeEventListener('focus',resumed);win.removeEventListener('resize',updateLayout);win.removeEventListener('pagehide',close);
      root?.remove();for(const item of underlay){item.node.inert=item.inert;if(item.ariaHidden===null)item.node.removeAttribute('aria-hidden');else item.node.setAttribute('aria-hidden',item.ariaHidden);}underlay=[];
      device?.classList.remove('tacho-readonly-mode');root=null;body=null;device=null;
    }
    function open(){
      const current=context();if(!current){close();return Promise.resolve(false);}
      if(root&&owner===current.key){assess();return Promise.resolve(true);}
      close();owner=current.key;device=doc.querySelector('.device');if(!device){owner=null;return Promise.resolve(false);}
      root=doc.createElement('section');root.className='tacho-readonly-overlay';root.setAttribute('role','region');root.setAttribute('aria-label','Panel Tacho — dane z TMS');
      root.innerHTML=`<header class="tro-header"><div class="tacho-heading"><span class="tacho-kicker">${icon('clock')}Panel kierowcy · dane z TMS</span><h2>Czas pod kontrolą</h2><p>Najpierw to, co ważne teraz. Niżej bilans jazdy i odpoczynków.</p></div><button type="button" class="tro-refresh" data-tacho-readonly-refresh>${icon('refresh')}Odśwież</button></header><div class="tro-body"></div><footer class="tro-footer"><button type="button" data-tacho-readonly-back>${icon('arrow')}Wróć do operacji</button></footer>`;
      device.appendChild(root);device.classList.add('tacho-readonly-mode');
      underlay=['#app-scroll','#app-action'].map(selector=>device.querySelector(selector)).filter(Boolean).map(node=>({node,inert:Boolean(node.inert),ariaHidden:node.getAttribute('aria-hidden')}));
      for(const item of underlay){item.node.inert=true;item.node.setAttribute('aria-hidden','true');}
      body=root.querySelector('.tro-body');
      root.querySelector('[data-tacho-readonly-refresh]').onclick=refresh;
      root.querySelector('[data-tacho-readonly-back]').onclick=()=>{close();if(typeof options.onClose==='function')options.onClose();};
      doc.addEventListener('visibilitychange',visibility);win.addEventListener('focus',resumed);win.addEventListener('resize',updateLayout);win.addEventListener('pagehide',close);
      checkTimer=win.setInterval(()=>{if(root)assess();},1000);
      refreshTimer=win.setInterval(()=>{if(root&&!hidden())refresh();},60000);
      if(typeof win.ResizeObserver==='function'){resizeObserver=new win.ResizeObserver(updateLayout);resizeObserver.observe(device);for(const selector of ['.app-header','#driver-workspace-bar','.bottom-nav']){const el=device.querySelector(selector);if(el)resizeObserver.observe(el);}}
      updateLayout();displayState=hidden()?'paused':'loading';paint();return refresh();
    }
    return {open,close,refresh,isOpen(){if(root&&!alive())close();return Boolean(root);}};
  }
  return {create,renderSnapshot};
});
