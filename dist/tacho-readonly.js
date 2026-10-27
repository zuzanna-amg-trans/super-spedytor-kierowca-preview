'use strict';

((root,factory)=>{
  const model=typeof module==='object'&&module.exports?require('./tacho-readonly-model.js'):root.SuperSpedytorReadOnlyTachoModel;
  const api=factory(root,model);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SuperSpedytorReadOnlyTacho=api;
})(typeof window==='undefined'?null:window,(browser,model)=>{
  const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=name=>name==='refresh'?'<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M20 12a8 8 0 1 1-2.3-5.7L20 9"/></svg>':`<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const STATES={loading:['Pobieram Twój odczyt','Łączę z TMS. Poprzednie wartości są ukryte do potwierdzenia aktualnego odczytu.'],
    paused:['Odczyt wstrzymany','Po powrocie do aplikacji ponownie sprawdzimy dane.'],
    no_data:['Brak aktualnego stanu Tacho','TMS nie potwierdził stanu tachografu dla Twojego konta. Brak danych nie oznacza dostępnego czasu jazdy.'],
    stale:['Odczyt wymaga odświeżenia','Dane są nieaktualne albo nie mają wiarygodnej daty. Sprawdź tachograf; aktualnych liczników nie potwierdzono.'],
    error:['Nie udało się potwierdzić odczytu','Sprawdź połączenie i spróbuj ponownie. Poprzednie liczniki nie są wyświetlane.']};
  const ERROR_MESSAGES={401:'Sesja TMS wygasła. Zaloguj się ponownie w aplikacji.',403:'To konto nie ma dostępu do własnego odczytu Tacho.',404:'TMS nie znalazł stanu kierowcy dla tego konta.',identity:'Dane nie odpowiadają zalogowanemu kierowcy. Odczyt został ukryty.',malformed:'TMS zwrócił niepełny odczyt. Aktualnych liczników nie potwierdzono.'};
  function renderSnapshot(view,{state=view?.state||'no_data',errorMessage=''}={}){
    const source=(view?.sourceNames||[]).map(name=>`<span>${e(name)}</span>`).join('')||'<span>Źródło nieokreślone</span>';
    const stamp=view?.observedAt==null?'Brak daty odczytu':`Odczyt z ${e(model.formatTimestamp(view.observedAt))}`;
    const meta=`<div class="tro-snapshot-meta"><span>${icon('clock')}${stamp}</span><div class="tro-source-chips" aria-label="Źródła danych">${source}</div></div>`;
    const note=`<aside class="tro-source-note">${icon('info')}<p><strong>Tachograf jest źródłem nadrzędnym.</strong> To wartości z ostatniego odczytu TMS, a nie potwierdzenie możliwości dalszej jazdy.</p></aside>`;
    if(state!=='ready'){
      const text=STATES[state]||STATES.error;
      return `<section class="tro-empty" role="${state==='error'?'alert':'status'}"><span class="tro-empty-icon">${icon(state==='loading'?'clock':'info')}</span><h3>${e(text[0])}</h3><p>${e(errorMessage||text[1])}</p></section>${meta}${note}`;
    }
    const duration=model.formatDuration;
    const metric=(label,value,tone='')=>`<article class="tro-metric ${tone}"><span>${e(label)}</span><strong>${duration(value)}</strong><small>${value==null?'Brak wartości w odczycie':'godz. : min · wg TMS'}</small></article>`;
    const status={ok:'Stan TMS',warning:'TMS: zwróć uwagę',violation:'TMS: sprawdź odczyt'}[view.status]||'Stan TMS';
    const alerts=view.alerts?.length?`<section class="tro-alerts"><div class="tro-section-heading"><h3>Komunikaty z TMS</h3><span>${view.alerts.length}</span></div>${view.alerts.map(a=>`<article class="tro-alert ${a.severity===30?'critical':a.severity===20?'warning':''}">${icon('info')}<p>${e(a.message)}</p></article>`).join('')}</section>`:'';
    const coverage=!view.dailyHistoryComplete||!view.weeklyHistoryComplete?'<p class="tro-coverage-note">Historia może być niepełna. Panel nie potwierdza dostępnych przedłużeń jazdy ani skróconych odpoczynków.</p>':'';
    return `<section class="tro-now-card"><div class="tro-now-top"><span class="tro-mode ${e(view.mode)}"><i></i>${e(view.modeLabel)}</span><span>${e(status)}</span></div><div class="tro-break-value"><span>Do wymaganej przerwy według TMS</span><strong>${duration(view.timeToBreakSeconds)}</strong><p>${view.timeToBreakSeconds==null?'Brak wartości w odczycie':'godziny : minuty · wartość z odczytu'}</p></div><div class="tro-drive-fact"><span>Jazda od pełnej przerwy</span><strong>${duration(view.continuousDriveSeconds)}</strong></div></section>${meta}<div class="tro-section-heading"><h3>Bilans jazdy</h3><span>Wg tego samego odczytu</span></div><section class="tro-metrics" aria-label="Bilans jazdy z TMS">${metric('Jazda w zmianie',view.shiftDriveSeconds)}${metric('Ten tydzień',view.weekDriveSeconds,'weekly')}${metric('Dwa tygodnie',view.fortnightDriveSeconds,'fortnight')}</section>${coverage}${alerts}${note}`;
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
        const changed=next.state!==view?.state;
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
      root.innerHTML=`<header class="tro-header"><div><span>${icon('clock')}Twój panel Tacho</span><h2>Czas pod kontrolą</h2><p>Rzeczywiste dane z Super Spedytora</p></div><button type="button" class="tro-refresh" data-tacho-readonly-refresh>${icon('refresh')}Odśwież</button></header><div class="tro-body"></div><footer class="tro-footer"><button type="button" data-tacho-readonly-back>${icon('arrow')}Wróć do operacji</button></footer>`;
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
