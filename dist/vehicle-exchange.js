'use strict';

(function expose(root){
  function create(options){
    const {first,second,icon,esc,onChange,onExit,createReport}=options;
    const definitions=root.SuperSpedytorVehicleCustody.exchangeReports(first,second,'SWAP/DEMO/001');
    const drivers=[first.transferor,second.transferor];
    let driverId=drivers[0].id,activeId=null;
    const controllers=new Map();
    const active=()=>controllers.get(activeId);
    function redraw(){onChange();const scroll=document.querySelector('#app-scroll');if(scroll)scroll.scrollTop=0;}
    function status(definition){const s=controllers.get(definition.id)?.status();return s?.complete?'Zakończono lokalnie':s?.vehicleSigned?'Auto podpisane · sprawdź zawartość':s?.started?'W trakcie kontroli auta':'Do wykonania';}
    function card(definition){
      const s=controllers.get(definition.id)?.status(),snapshot=definition.snapshot;
      return `<button class="vx-report ${s?.complete?'done':''}" data-vx-report="${esc(definition.id)}"><span>${icon(definition.role==='issue'?'truck':'clipboard')}</span><div><small>${definition.role==='issue'?'PRZEKAZUJESZ SWOJE AUTO':'ODBIERASZ DRUGIE AUTO'}</small><strong>${esc(snapshot.vehicle.registration)}</strong><p>${definition.role==='issue'?'Dla: '+esc(snapshot.receiver.displayName):'Od: '+esc(snapshot.transferor.displayName)}</p><b>${status(definition)}</b></div>${icon(s?.complete?'check':'arrow')}</button>`;
    }
    function view(){
      if(activeId)return active().view();
      const done=definitions.filter(definition=>controllers.get(definition.id)?.status().complete).length;
      return `<div class="app-content hv2-screen vx-screen"><header class="hv2-header"><button class="hv2-back" data-vx-exit aria-label="Wróć do przekazania auta">${icon('back')}</button><span>Zamiana samochodów<small>DEMO · dwa auta, dwaj kierowcy</small></span></header><h2 class="hv2-title">Każdy wydaje.<br>Każdy odbiera.</h2><p class="hv2-description">Po dwa osobne protokoły na osobę. W każdym: stan auta, podpis, a na końcu ładunki i CMR-y przypisane do tego pojazdu.</p><div class="vx-vehicles"><span><b>${esc(first.vehicle.registration)}</b>${esc(first.transferor.displayName)} → ${esc(first.receiver.displayName)}</span><span><b>${esc(second.vehicle.registration)}</b>${esc(second.transferor.displayName)} → ${esc(second.receiver.displayName)}</span></div><p class="vc-label">Podgląd kierowcy w DEMO</p><div class="vc-role-switch" role="group" aria-label="Podgląd kierowcy">${drivers.map(driver=>`<button data-vx-driver="${esc(driver.id)}" aria-pressed="${driverId===driver.id}">${esc(driver.displayName)}</button>`).join('')}</div><h3>Twoje dwa protokoły</h3>${definitions.filter(definition=>definition.actor.id===driverId).map(card).join('')}<section class="hv2-intro-card"><span class="hv2-eyebrow">CAŁA ZAMIANA · ${done}/4 PROTOKOŁY</span>${definitions.map(definition=>`<p class="vx-status"><strong>${esc(definition.actor.displayName)} · ${definition.role==='issue'?'wydanie':'odbiór'} ${esc(definition.snapshot.vehicle.registration)}</strong><span>${status(definition)}</span></p>`).join('')}<p>${done===4?'Obaj kierowcy zakończyli swoje protokoły w DEMO. Potwierdzenie w TMS nadal oczekuje.':'Zamiana nie jest gotowa, dopóki obaj kierowcy nie zakończą wydania i odbioru.'}</p></section><p class="hv2-photo-tip">${icon('box')}Towar zostaje w swoim aucie. Zmienia się kierowca i odpowiedzialność za pojazd, ładunek oraz dokumenty.</p><p class="small-note">Przełączanie kierowcy służy wyłącznie podglądowi DEMO. W rzeczywistym procesie każdy pracuje na własnym koncie.</p></div>`;
    }
    function actions(){return activeId?active().actions():'<p class="action-caption">Wybierz swój protokół wydania albo odbioru powyżej.</p>';}
    function bind(){
      if(activeId){active().bind();return;}
      document.querySelector('[data-vx-exit]').onclick=onExit;
      document.querySelectorAll('[data-vx-driver]').forEach(button=>button.onclick=()=>{driverId=button.dataset.vxDriver;redraw();});
      document.querySelectorAll('[data-vx-report]').forEach(button=>button.onclick=()=>{
        const definition=definitions.find(item=>item.id===button.dataset.vxReport&&item.actor.id===driverId);if(!definition)return;
        if(!controllers.has(definition.id))controllers.set(definition.id,createReport(definition.snapshot,definition.role,()=>{activeId=null;redraw();}));
        activeId=definition.id;redraw();
      });
    }
    return {view,actions,bind,notes:()=>activeId?active().notes():'<h2>Zamiana aut</h2><p>Dwa auta, cztery niezależne protokoły. Każdy kierowca kontroluje wydanie i odbiór.</p>',reset:()=>{controllers.forEach(controller=>controller.reset());controllers.clear();activeId=null;driverId=drivers[0].id;}};
  }
  root.SuperSpedytorVehicleExchange={create};
})(window);
