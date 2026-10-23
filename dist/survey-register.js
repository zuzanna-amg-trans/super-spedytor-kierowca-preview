(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SuperSpedytorSurveyRegister=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const statuses={
    completed:['Wysłana','sent'],pending:['Do wypełnienia','pending'],
    in_progress:['W trakcie','pending'],not_submitted:['Nie wysłano','missing'],
    needs_correction:['Do poprawy','pending'],skipped:['Pominięta','muted'],
    cancelled:['Anulowana','muted']
  };
  const frequencies={daily:'Codziennie',weekly:'Co tydzień',monthly:'Co miesiąc',per_route:'Raz na rundę',on_demand:'Na zlecenie'};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const validMonth=month=>/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(month)&&Number(month.slice(0,4))>0;
  function shiftMonth(month,delta){
    if(!validMonth(month))throw new Error('Nieprawidłowy miesiąc');
    const index=Number(month.slice(0,4))*12+Number(month.slice(5))-1+delta;
    const year=Math.floor(index/12);
    if(year<1||year>9999)throw new Error('Nieprawidłowy miesiąc');
    return String(year).padStart(4,'0')+'-'+String(index%12+1).padStart(2,'0');
  }
  function missingServiceLabel(survey){
    return survey.survey_slug==='service-inspection'&&survey.frequency==='daily'
      &&survey.status==='not_submitted'&&survey.missing_service_amount_eur==='5.00'?'-5 euro':'';
  }
  function sentAt(value){
    const date=new Date(value);
    if(!Number.isFinite(date.getTime()))return '';
    return new Intl.DateTimeFormat('pl-PL',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Warsaw'}).format(date);
  }
  function validate(data){
    if(!data||!validMonth(data.month)||!/^\d{4}-\d{2}-\d{2}$/.test(data.today)
      ||!Array.isArray(data.rows)||data.rows.some(row=>!row||!/^\d{4}-\d{2}-\d{2}$/.test(row.date)
        ||!Array.isArray(row.surveys)||row.surveys.some(s=>!s||typeof s!=='object'))){
      throw new Error('Nie udało się odczytać rejestru ankiet.');
    }
    return data;
  }
  function render(data,{loading=false,error=''}={}){
    const header='<header class="survey-register-header"><button type="button" data-register-back aria-label="Wróć do operacji">←</button><div><h2>Rejestr ankiet</h2><p>Wszystkie przydzielone ankiety — dzień po dniu.</p></div></header>';
    // Nie pokazujemy poprzednich kwot jako aktualnych podczas odświeżania lub błędu.
    if(loading)return header+'<p role="status">Ładowanie rejestru…</p>';
    if(error)return header+'<div role="alert"><p>'+esc(error)+'</p><button type="button" data-register-refresh>Spróbuj ponownie</button></div>';
    if(!data)return header;
    validate(data);
    const all=data.rows.flatMap(row=>row.surveys),sent=all.filter(s=>s.status==='completed').length;
    const monthName=new Intl.DateTimeFormat('pl-PL',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(data.month+'-01T12:00:00Z'));
    const controls='<div class="survey-register-month"><button type="button" data-register-prev aria-label="Poprzedni miesiąc" '+(data.month==='0001-01'?'disabled':'')+'>‹</button><h3>'+esc(monthName)+'</h3><button type="button" data-register-next aria-label="Następny miesiąc" '+(data.month>=data.today.slice(0,7)?'disabled':'')+'>›</button></div><div class="survey-register-count"><span>Wysłane: '+sent+' / '+all.length+'</span><button type="button" data-register-refresh>Odśwież</button></div>';
    const rows=data.rows.map(row=>'<tr><th scope="row"><time datetime="'+esc(row.date)+'">'+esc(row.date.split('-').reverse().join('.'))+'</time>'+(row.date===data.today?'<small>Dzisiaj</small>':'')+'</th><td>'+
      (row.surveys.length?row.surveys.map(survey=>{
        const status=statuses[survey.status]||['Oczekuje','muted'],penalty=missingServiceLabel(survey);
        const timestamp=survey.status==='completed'&&survey.completed_at?sentAt(survey.completed_at):'';
        return '<article class="survey-register-item"><strong>'+esc(survey.survey_name)+'</strong><small>'+esc(frequencies[survey.frequency]||'Przydzielona ankieta')+(survey.vehicle_registration?' · '+esc(survey.vehicle_registration):'')+'</small><span class="survey-register-status '+status[1]+'">'+status[0]+'</span>'+
          (penalty?'<b class="survey-register-amount" title="F-01 K-10: brak obowiązkowej ankiety serwisowej po terminie">'+penalty+'</b>':'')+
          (timestamp?'<small>Wysłano: '+esc(timestamp)+'</small>':'')+'</article>';
      }).join(''):'<span class="survey-register-empty">Brak przydzielonych ankiet</span>')+'</td></tr>').join('');
    return header+controls+'<table aria-label="Rejestr ankiet kierowcy"><thead><tr><th scope="col">Dzień</th><th scope="col">Ankiety i statusy</th></tr></thead><tbody>'+rows+'</tbody></table>';
  }
  function mount(container,{request,onBack=()=>{},isActive=()=>true}){
    let data=null,month='',sequence=0,alive=true;
    const active=()=>alive&&isActive();
    function draw(options={}){
      if(!active())return;
      container.innerHTML='<div class="survey-register">'+render(data,options)+'</div>';
      const bind=(selector,callback)=>{const button=container.querySelector(selector);if(button)button.onclick=callback;};
      bind('[data-register-back]',onBack);
      bind('[data-register-refresh]',()=>load(month));
      bind('[data-register-prev]',()=>load(shiftMonth(data.month,-1)));
      bind('[data-register-next]',()=>load(shiftMonth(data.month,1)));
    }
    async function load(nextMonth=month){
      if(!active())return;
      if(nextMonth&&!validMonth(nextMonth))return;
      const current=++sequence;
      month=nextMonth;draw({loading:true});
      try{
        const received=validate(await request(nextMonth));
        if(!active()||current!==sequence)return;
        data=received;month=data.month;draw();
      }catch(error){
        if(!active()||current!==sequence)return;
        data=null;
        draw({error:'Nie udało się odświeżyć rejestru. Sprawdź połączenie i spróbuj ponownie.'});
      }
    }
    const ready=load();
    return {ready,load,destroy(){alive=false;sequence++;}};
  }
  return {mount,render,missingServiceLabel,shiftMonth,validate};
});
