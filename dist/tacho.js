'use strict';

(() => {
  const tq=(selector,root=document)=>root.querySelector(selector);
  const tqa=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const tachoIcon=name=>`<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const tachoActivityIcon=(type,label)=>{
    const shapes={
      drive:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.4"/><path d="M3.8 10h16.4M12 14.4v6M6.4 10c.8 3.4 2.6 5.4 5.6 6.2M17.6 10c-.8 3.4-2.6 5.4-5.6 6.2"/>',
      work:'<path d="m5 4 15 15-3 3L2 7V4h3ZM19 3l2 2-6.5 6.5-2-2ZM8.5 15.5 3 21M16 4l4 4"/>',
      rest:'<path d="M4 19V7M4 15h16v4M7 15v-5h4a4 4 0 0 1 4 4v1M20 19v-7"/><circle cx="7" cy="11" r="1.6"/>'
    };
    return `<span class="tacho-activity-icon ${type}" role="img" aria-label="${label}"><svg viewBox="0 0 24 24" aria-hidden="true">${shapes[type]}</svg></span>`;
  };
  const breakTypes=[
    {id:'break-15',group:'Przerwy po jeździe',title:'Przerwa 15 min',hint:'Pierwsza część przerwy dzielonej',seconds:15*60,icon:'clock'},
    {id:'break-30',group:'Przerwy po jeździe',title:'Przerwa 30 min',hint:'Druga część po wcześniejszych 15 min',seconds:30*60,icon:'clock'},
    {id:'break-45',group:'Przerwy po jeździe',title:'Przerwa 45 min',hint:'Pełna, nieprzerwana przerwa',seconds:45*60,icon:'clock'},
    {id:'daily-11',group:'Odpoczynek dobowy',title:'Odpoczynek dobowy 11 h',hint:'Regularny odpoczynek dobowy',seconds:11*60*60,icon:'parking',rest:true},
    {id:'daily-9',group:'Odpoczynek dobowy',title:'Odpoczynek dobowy 9 h',hint:'Skrócony; maks. 3 razy między odpoczynkami tygodniowymi',seconds:9*60*60,icon:'parking',rest:true},
    {id:'weekly-45',group:'Odpoczynek tygodniowy',title:'Tygodniowy regularny 45 h',hint:'Poza kabiną: hotel, baza lub dom',seconds:45*60*60,icon:'home',rest:true},
    {id:'weekly-24',group:'Odpoczynek tygodniowy',title:'Tygodniowy skrócony',hint:'Minimum 24 h; wymaga rozliczenia rekompensaty',seconds:24*60*60,icon:'home',rest:true}
  ];
  const recommendationPresets={
    'fuel-1h':{
      label:'tankowanie po 1 h',shortLabel:'wczesna okazja',drivingSeconds:60*60,dailyDrivingSeconds:60*60,dayRemainingSeconds:7*60*60,
      suggestedTypeId:'break-15',headline:'Przy tankowaniu zrób 15 min',
      reason:'Od pełnej przerwy minęła godzina jazdy. Tankowanie może być dobrą okazją na pierwsze 15 min przerwy dzielonej.',
      primaryTime:'3 godz. 30 min',primaryLabel:'do wymaganej przerwy',nextBreak:'15 min przy tankowaniu',progress:22.2
    },
    'drive-428':{
      label:'4:28 jazdy',shortLabel:'2 min do limitu',drivingSeconds:4*60*60+28*60,dailyDrivingSeconds:6*60*60+12*60,dayRemainingSeconds:3*60*60,
      suggestedTypeId:'break-45',headline:'Zrób teraz 45 min',
      reason:'Masz 4 godz. 28 min jazdy bez pełnej przerwy. Do 4 godz. 30 min zostały 2 minuty.',
      primaryTime:'2 min',primaryLabel:'do wymaganej przerwy',nextBreak:'45 min',progress:99.3
    },
    'after-15':{
      label:'wcześniej 15 min',shortLabel:'druga część',drivingSeconds:4*60*60+5*60,dailyDrivingSeconds:6*60*60+12*60,dayRemainingSeconds:3*60*60,splitStage:1,
      suggestedTypeId:'break-30',headline:'Teraz minimum 30 min',
      reason:'Pierwsze 15 min jest już zaliczone. Kolejna część musi mieć co najmniej 30 min — druga „15” nie zamknie przerwy dzielonej.',
      primaryTime:'30 min',primaryLabel:'wymagana druga część przerwy dzielonej',nextBreak:'30 min',progress:90.7
    },
    'short-5':{
      label:'wcześniej 5 min',shortLabel:'krótki postój',drivingSeconds:3*60*60+50*60,dailyDrivingSeconds:6*60*60+12*60,dayRemainingSeconds:3*60*60,lastBreakSeconds:5*60,
      suggestedTypeId:'break-45',headline:'Zaplanuj pełne 45 min',
      reason:'Wcześniejszy postój trwał 5 min. Nie stanowi pierwszej części układu 15 + 30, dlatego licznik jazdy nadal wymaga pełnej przerwy.',
      primaryTime:'40 min',primaryLabel:'do wymaganej przerwy',nextBreak:'45 min',progress:85.2
    },
    'day-end':{
      label:'koniec dnia',shortLabel:'28 min do końca',drivingSeconds:3*60*60+12*60,dailyDrivingSeconds:6*60*60+12*60,dayRemainingSeconds:28*60,reducedDailyRestsUsed:2,
      suggestedTypeId:'daily-11',alternateTypeId:'daily-9',headline:'Rozpocznij odpoczynek dobowy',
      reason:'Zbliża się graniczna godzina zakończenia dnia. Preferowany jest regularny odpoczynek 11 h; 9 h pokażemy jako skróconą alternatywę tylko przy dostępnej możliwości.',
      primaryTime:'28 min',primaryLabel:'do rozpoczęcia odpoczynku dobowego',nextBreak:'11 h lub 9 h',progress:96.4
    }
  };
  const tachoState={active:null,lastClosed:null,splitStage:0,recommendationPreset:'drive-428',arrivedAtParking:false,history:[]};
  let tachoOpen=false;
  let timer=null;

  const formatElapsed=seconds=>{
    const safe=Math.max(0,Math.floor(seconds));
    const hours=Math.floor(safe/3600);
    const minutes=Math.floor((safe%3600)/60);
    const rest=safe%60;
    return hours>0
      ?`${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(rest).padStart(2,'0')}`
      :`${String(minutes).padStart(2,'0')}:${String(rest).padStart(2,'0')}`;
  };
  const shortDuration=seconds=>{
    if(seconds<60)return 'mniej niż 1 min';
    const minutes=Math.max(0,Math.floor(seconds/60));
    const hours=Math.floor(minutes/60);
    const rest=minutes%60;
    if(hours&&rest)return `${hours} godz. ${rest} min`;
    if(hours)return `${hours} godz.`;
    return `${minutes} min`;
  };
  const remainingDuration=seconds=>shortDuration(Math.ceil(Math.max(0,seconds)/60)*60);
  const startedAtLabel=timestamp=>new Date(timestamp).toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'});
  const activeType=()=>breakTypes.find(item=>item.id===tachoState.active?.typeId);
  const activeElapsed=()=>tachoState.active?Math.max(0,(Date.now()-tachoState.active.startedAt)/1000):0;
  const recommendationPreset=()=>recommendationPresets[tachoState.recommendationPreset]||recommendationPresets['drive-428'];
  const currentRecommendation=()=>{
    if(tachoState.splitStage===1&&tachoState.recommendationPreset!=='day-end')return {...recommendationPresets['after-15'],key:'after-15'};
    return {...recommendationPreset(),key:tachoState.recommendationPreset};
  };
  const parkingDayContext=()=>{
    const recommendation=currentRecommendation();
    const previousRestEndedAt=Date.parse('2026-10-14T06:42:00+02:00');
    return {
      fresh:true,
      drivingSinceFullBreakSeconds:recommendation.drivingSeconds,
      dailyDrivingSeconds:recommendation.dailyDrivingSeconds,
      previousRestEndedAt,
      referenceAt:previousRestEndedAt+13*60*60*1000-recommendation.dayRemainingSeconds*1000,
      reducedDailyRestsUsed:recommendation.reducedDailyRestsUsed??2,
      crewSize:1,
      dailyRestMode:'uninterrupted'
    };
  };
  function parkingTimeSummary(){
    const context=parkingDayContext();
    const summary=window.SuperSpedytorDaySummary?.summarize(context);
    if(!summary)return '';
    const duration=value=>value===null?'Sprawdź tachograf':shortDuration(value);
    const clock=value=>new Date(value).toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Warsaw'});
    const deadline=(value,label)=>`<div class="tacho-parking-deadline"><span>${label}</span><strong>${clock(value)}${value<=context.referenceAt?'<small>termin minął</small>':''}</strong></div>`;
    const restNote=summary.reducedRestsRemaining===null?'Sprawdź, czy możesz skrócić odpoczynek do 9 h.':summary.reducedRestsRemaining===0?'9 h niedostępne — wykorzystano 3 skrócenia.':`9 h: możesz skrócić jeszcze ${summary.reducedRestsRemaining} ${summary.reducedRestsRemaining===1?'raz':'razy'}.`;
    return `<section class="tacho-parking-summary" aria-label="Twój czas na parkingu"><div class="tacho-parking-driving"><div><span>Od pełnej przerwy</span><strong>${duration(summary.drivingSinceFullBreakSeconds)}</strong></div><div><span>Jazda dzisiaj</span><strong>${duration(summary.dailyDrivingSeconds)}</strong></div></div><div class="tacho-parking-rest"><h4>Zacznij odpoczynek najpóźniej</h4>${summary.regularRestStartBy===null?'<p>Sprawdź godzinę na tachografie.</p>':deadline(summary.regularRestStartBy,'11 h odpoczynku')}${summary.reducedRestStartBy===null?'':deadline(summary.reducedRestStartBy,'9 h skróconego')}<p class="tacho-parking-rest-note">${restNote}</p></div></section>`;
  }
  const fuelBreakContext=()=>{
    const recommendation=currentRecommendation();
    const type=activeType();
    const drivingSinceFullBreakMinutes=Math.floor(recommendation.drivingSeconds/60);
    return {
      source:'DEMO_TACHOGRAPH',
      computedAt:new Date(Date.now()-3*60*1000).toISOString(),
      fresh:true,
      drivingSinceFullBreakMinutes,
      minutesToRequiredBreak:Math.max(0,270-drivingSinceFullBreakMinutes),
      splitBreak15Completed:Boolean(recommendation.splitStage===1||tachoState.splitStage===1),
      activeReportedBreak:type?{
        typeId:type.id,
        title:type.title,
        plannedMinutes:Math.round(type.seconds/60),
        startedAt:tachoState.active.startedAt
      }:null
    };
  };
  const recommendationType=recommendation=>breakTypes.find(item=>item.id===recommendation.suggestedTypeId);
  const instructionDuration=type=>({
    'break-15':'15 min',
    'break-30':'30 min',
    'break-45':'45 min',
    'daily-11':'11 godz.',
    'daily-9':'9 godz.',
    'weekly-45':'45 godz.',
    'weekly-24':'24 godz.'
  })[type?.id]||'';
  const instructionLabel=type=>`${instructionDuration(type)} ${type?.id.startsWith('break-')?'przerwy':'odpoczynku'}`.trim();
  const instructionReason=recommendation=>({
    'fuel-1h':'To dobry moment na pierwsze 15 min przerwy.',
    'drive-428':'Do limitu jazdy zostały 2 min.',
    'after-15':'Masz już zaliczone 15 min. Zostało minimum 30 min.',
    'short-5':'Postój 5 min nie zaliczył wymaganej przerwy.',
    'day-end':'Kończysz dzień pracy. Zacznij odpoczynek teraz.'
  })[recommendation.key]||recommendation.reason;
  const currentInstruction=()=>{
    const recommendation=currentRecommendation();
    const type=recommendationType(recommendation);
    return {
      recommendation,
      type,
      duration:instructionDuration(type),
      label:instructionLabel(type),
      reason:instructionReason(recommendation)
    };
  };
  const choiceWarning=(typeId,recommendation=currentRecommendation())=>{
    if(typeId==='break-15'&&recommendation.key==='after-15')return {
      title:'Druga „15” nie domknie tej przerwy',
      text:'Masz już zaliczone 15 min. Druga część musi trwać minimum 30 min.',
      suggestedTypeId:'break-30'
    };
    if(typeId==='break-15'&&['drive-428','short-5'].includes(recommendation.key))return {
      title:'15 min to dopiero pierwsza część',
      text:'15 min nie zakończy okresu jazdy. Zrób pełne 45 min.',
      suggestedTypeId:'break-45'
    };
    if(typeId==='break-30'&&recommendation.key!=='after-15')return {
      title:'Brakuje wcześniejszych 15 min',
      text:'Nie masz zaliczonych wcześniejszych 15 min. Zrób pełne 45 min.',
      suggestedTypeId:'break-45'
    };
    return null;
  };

  function showTachoToast(message){
    const element=tq('#toast');
    if(!element)return;
    element.textContent=message;
    element.classList.add('visible');
    window.setTimeout(()=>element.classList.remove('visible'),3800);
  }

  function activeBreakCard(){
    const type=activeType();
    if(!type)return '';
    const elapsed=activeElapsed();
    const progress=Math.min(100,(elapsed/type.seconds)*100);
    return `<section class="tacho-active-card" aria-live="polite">
      <span class="tacho-active-badge"><span></span>Aktywne zgłoszenie</span>
      <h3>${type.title}</h3>
      <p>Zgłoszona od ${startedAtLabel(tachoState.active.startedAt)} · plan ${shortDuration(type.seconds)}</p>
      <strong class="tacho-elapsed" id="tacho-elapsed">${formatElapsed(elapsed)}</strong>
      <div class="tacho-progress"><span id="tacho-active-progress" style="--progress:${progress}%"></span></div>
      <div class="tacho-progress-labels"><span>Trwa</span><b id="tacho-active-remaining">${elapsed>=type.seconds?'Plan osiągnięty':`pozostało ${remainingDuration(type.seconds-elapsed)}`}</b></div>
      <div class="tacho-active-actions"><button class="tacho-change-button" id="tacho-change">Zmień rodzaj</button><button class="tacho-end-button" id="tacho-end">Zakończ zgłoszenie</button></div>
    </section>`;
  }

  function defaultDrivingCard(){
    const last=tachoState.lastClosed;
    const recommendation=currentRecommendation();
    const instruction=currentInstruction();
    const splitStage=recommendation.splitStage||tachoState.splitStage;
    const drivingMinutes=Math.floor(recommendation.drivingSeconds/60);
    const drivingTime=`${Math.floor(drivingMinutes/60)}:${String(drivingMinutes%60).padStart(2,'0')}`;
    const splitSummary=splitStage===1
      ?`<div class="tacho-split-summary pending">${tachoIcon('clock')}<span><strong>15 min zaliczone</strong>Do pełnej przerwy dzielonej potrzebujesz jeszcze minimum 30 min.</span></div>`
      :splitStage===2
        ?`<div class="tacho-split-summary complete">${tachoIcon('check')}<span><strong>Przerwa dzielona zaliczona</strong>15 + 30 min ukończone. Nowy okres jazdy rozpoczęty od 0:00.</span></div>`
        :recommendation.lastBreakSeconds
          ?`<div class="tacho-split-summary pending">${tachoIcon('info')}<span><strong>Postój 5 min nie domknął przerwy</strong>Po ponownej jeździe nadal potrzebujesz przerwy 45 min albo prawidłowej sekwencji 15 + 30.</span></div>`
          :'';
    return `<section class="tacho-now-card">
      <div class="tacho-now-top"><span class="tacho-status"><span class="tacho-status-dot"></span>Teraz · jazda</span><span class="tacho-status-time">odczyt demo · 3 min temu</span></div>
      <div class="tacho-driver-instruction">
        <span>ZRÓB TERAZ</span>
        <strong>${instruction.label}</strong>
        <p>${instruction.reason}</p>
      </div>
      <button class="tacho-report-button" id="tacho-start-suggested">${tachoIcon('clock')}Rozpoczynam ${instruction.duration}</button>
      <button class="tacho-other-button" id="tacho-report">Zgłaszam inną przerwę</button>
      <div class="tacho-driver-fact"><span>Jazda od pełnej przerwy</span><strong>${drivingTime}</strong></div>
      ${splitSummary}
      <details class="tacho-demo-controls"><summary>Przykłady testowe</summary><div class="tacho-preset-picker" aria-label="Scenariusze demonstracyjne"><span>Ustaw przykład:</span><div>${Object.entries(recommendationPresets).map(([key,item])=>`<button data-tacho-preset="${key}" class="${recommendation.key===key?'active':''}">${item.label}</button>`).join('')}</div></div><button class="tacho-split-button" id="tacho-split-sim">${tachoIcon('arrow')}${splitStage?'Kontynuuj symulację 15 + 30':'Symulacja przerwy dzielonej 15 + 30'}</button></details>
      ${last?`<div class="tacho-last-report">${tachoIcon('check')}<span><strong>Ostatnie zgłoszenie zakończone</strong>${last.title} · trwało ${shortDuration(last.elapsed)}</span></div>`:''}
    </section>`;
  }

  function tachoView(){
    return `<div class="app-content tacho-screen">
      <header class="tacho-heading"><span class="tacho-kicker">${tachoIcon('clock')}Panel kierowcy · dane demonstracyjne</span><h2>Czas pod kontrolą</h2><p>Najpierw to, co ważne teraz. Niżej pełny bilans jazdy i odpoczynków.</p></header>
      ${tachoState.active?activeBreakCard():defaultDrivingCard()}
      <div class="tacho-section-heading"><h3>Ramy dnia</h3><span>Pełny odpoczynek<br>11 godzin</span></div>
      <section class="tacho-day-window">
        <div><small>Dzień rozpoczęty</small><strong>06:42</strong><span>po odpoczynku dobowym</span></div>
        <span class="tacho-day-arrow">${tachoIcon('arrow')}</span>
        <div class="deadline"><small>Zakończ najpóźniej</small><strong>19:42</strong><span>aby zrobić pełne 11 h</span></div>
      </section>
      <div class="tacho-section-heading"><h3>Jazda i „dziewiątki”</h3><span>Stan z tachografu<br>w wersji docelowej</span></div>
      <div class="tacho-metrics">
        <article class="tacho-metric tacho-drive-metric"><small>Dzisiaj · limit 10 h</small><strong>6:12</strong><p>zostało 3:48 jazdy</p><div class="tacho-mini-progress"><span style="--progress:62%"></span></div></article>
        <article class="tacho-metric tacho-nine-metric"><small>Skrócone odpoczynki 9 h</small><strong>2 z 3</strong><p>została 1 do odpoczynku tygodniowego</p><div class="tacho-mini-progress"><span style="--progress:66.7%"></span></div></article>
        <article class="tacho-extension-card" aria-label="Przedłużenia jazdy do 10 godzin: wykorzystane 1 z 2, zostało 1">
          <span class="tacho-extension-mark" aria-hidden="true">10 h</span>
          <span class="tacho-extension-copy"><small>Przedłużenia jazdy do 10 h</small><strong>1 z 2 wykorzystane</strong><span class="tacho-extension-slots" aria-hidden="true"><i class="used"></i><i></i></span></span>
          <b>Zostało 1</b>
        </article>
        <article class="tacho-metric tacho-week-metric"><small>Ten tydzień</small><strong>30:45</strong><p>z 56 godz. · zostało 25:15</p><div class="tacho-mini-progress"><span style="--progress:54.9%"></span></div></article>
        <article class="tacho-metric tacho-fortnight-metric"><small>Dwa kolejne tygodnie</small><strong>68:20</strong><p>z 90 godz. · zostało 21:40</p><div class="tacho-mini-progress"><span style="--progress:75.9%"></span></div></article>
      </div>
      <div class="tacho-section-heading"><h3>Dzisiejsza aktywność</h3><span>Łącznie od 06:42</span></div>
      <section class="tacho-activity-card">
        <div class="tacho-activity-bar" aria-label="Kolejność dzisiejszych okresów"><span style="--part:4.4%;--activity-color:#859879"></span><span style="--part:36.7%;--activity-color:#ff7a31"></span><span style="--part:8.6%;--activity-color:#b7aecc"></span><span style="--part:15.9%;--activity-color:#859879"></span><span style="--part:34.4%;--activity-color:#ff7a31"></span></div>
        <div class="tacho-period-list" aria-label="Okresy dzisiejszej aktywności">
          <div class="tacho-period" style="--activity-color:#859879"><time>06:42–07:05</time>${tachoActivityIcon('work','Inna praca — symbol skrzyżowanych młotków')}<span><strong>Inna praca</strong><small>23 min</small></span></div>
          <div class="tacho-period" style="--activity-color:#ff7a31"><time>07:05–10:17</time>${tachoActivityIcon('drive','Jazda — symbol kierownicy')}<span><strong>Jazda</strong><small>3 godz. 12 min</small></span></div>
          <div class="tacho-period" style="--activity-color:#b7aecc"><time>10:17–11:02</time>${tachoActivityIcon('rest','Przerwa lub odpoczynek — symbol łóżka')}<span><strong>Przerwa</strong><small>45 min</small></span></div>
          <div class="tacho-period" style="--activity-color:#859879"><time>11:02–12:25</time>${tachoActivityIcon('work','Inna praca — symbol skrzyżowanych młotków')}<span><strong>Inna praca</strong><small>1 godz. 23 min</small></span></div>
          <div class="tacho-period current" style="--activity-color:#ff7a31"><time>12:25–15:25</time>${tachoActivityIcon('drive','Jazda — symbol kierownicy')}<span><strong>Jazda</strong><small>3 godz. · bieżący okres</small></span></div>
        </div>
      </section>
      <div class="tacho-section-heading"><h3>Odpoczynki</h3><span>Najważniejsze terminy</span></div>
      <section class="tacho-rest-list">
        <div class="tacho-rest-row"><span class="tacho-rest-icon">${tachoIcon('check')}</span><div><small>Ostatni odpoczynek dobowy</small><strong>11 godz. 18 min</strong></div><b>Zakończony<br>06:42</b></div>
        <div class="tacho-rest-row"><span class="tacho-rest-icon">${tachoIcon('clock')}</span><div><small>Następny odpoczynek dobowy</small><strong>Planowany regularny 11 h</strong></div><b>Dzisiaj</b></div>
      </section>
      <div class="tacho-source-note">${tachoIcon('info')}<p><strong>Tachograf jest źródłem nadrzędnym.</strong>Ten prototyp nie odczytuje urządzenia i nie wysyła zgłoszeń. W wersji docelowej zgłoszenie poinformuje spedytora, ale nie zmieni aktywności zapisanej w tachografie.</p></div>
    </div>`;
  }

  function tachoDesignNotes(){
    return `<h2>Jedno spojrzenie.<br>Jedna decyzja.</h2><p class="note-description">Największy komunikat odpowiada na pytanie: „co i kiedy mam zrobić?”. Start i koniec dnia, limit 10 godzin oraz wykorzystane „dziewiątki” są widoczne przed podsumowaniami tygodniowymi.</p><div class="design-progress"><div class="design-progress-title">PANEL TACHO<span>4 priorytety</span></div><div class="design-step current"><span class="design-step-num">01</span><span>Najbliższa przerwa i czas do niej</span></div><div class="design-step"><span class="design-step-num">02</span><span>Start dnia i graniczna godzina zakończenia</span></div><div class="design-step"><span class="design-step-num">03</span><span>Jazda dzienna do limitu 10 godzin</span></div><div class="design-step"><span class="design-step-num">04</span><span>Wykorzystane i pozostałe odpoczynki 9 h</span></div></div><div class="design-shared"><strong>Zgłoszenie nie steruje tachografem</strong><p>Aplikacja przekazuje informację operacyjną do spedytora. Urządzenie i karta kierowcy pozostają źródłem prawdy.</p></div>`;
  }

  function updateActiveClock(){
    if(!tachoState.active)return;
    const type=activeType();
    const elapsed=activeElapsed();
    const elapsedNode=tq('#tacho-elapsed');
    const progressNode=tq('#tacho-active-progress');
    const remainingNode=tq('#tacho-active-remaining');
    if(elapsedNode)elapsedNode.textContent=formatElapsed(elapsed);
    if(progressNode)progressNode.style.setProperty('--progress',`${Math.min(100,(elapsed/type.seconds)*100)}%`);
    if(remainingNode)remainingNode.textContent=elapsed>=type.seconds?'Plan osiągnięty':`pozostało ${remainingDuration(type.seconds-elapsed)}`;
  }

  function syncTimer(){
    if(timer){window.clearInterval(timer);timer=null;}
    if(tachoState.active)timer=window.setInterval(updateActiveClock,1000);
  }

  function bindTachoView(){
    tq('#tacho-start-suggested')?.addEventListener('click',()=>startBreak(currentRecommendation().suggestedTypeId,false,{arrival:tachoState.arrivedAtParking}));
    tq('#tacho-report')?.addEventListener('click',()=>openBreakOptions({arrival:tachoState.arrivedAtParking}));
    tq('#tacho-split-sim')?.addEventListener('click',openSplitSimulation);
    tq('#tacho-change')?.addEventListener('click',()=>openBreakOptions({arrival:tachoState.arrivedAtParking}));
    tq('#tacho-end')?.addEventListener('click',endBreak);
  }

  function renderTacho(){
    tachoOpen=true;
    window.SuperSpedytorBackend?.setActiveNav?.('tacho');
    tq('.device')?.classList.add('tacho-mode');
    tq('#app').innerHTML=tachoView();
    tq('#app-action').innerHTML='';
    tq('#design-context').innerHTML=tachoDesignNotes();
    tq('#preview-label').textContent='PANEL TACHO / CZAS KIEROWCY';
    tqa('[data-nav]').forEach(button=>button.classList.toggle('active',button.dataset.nav==='tacho'));
    tqa('.screen-list [data-screen]').forEach(button=>button.classList.remove('active'));
    tq('#app-scroll').scrollTop=0;
    bindTachoView();
    syncTimer();
  }

  function leaveTacho(){
    tachoOpen=false;
    tq('.device')?.classList.remove('tacho-mode');
  }

  function closeTachoModal(){
    const root=tq('#modal-root');
    if(root)root.innerHTML='';
  }

  function modalShell(title,body){
    tq('#modal-root').innerHTML=`<div class="modal-overlay"><section class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="tacho-modal-title" tabindex="-1"><div class="modal-handle"></div><div class="modal-title"><h3 id="tacho-modal-title">${title}</h3><button class="icon-button" id="tacho-modal-close" aria-label="Zamknij">${tachoIcon('close')}</button></div>${body}</section></div>`;
    tq('#tacho-modal-close').onclick=closeTachoModal;
    tq('.modal-overlay').onclick=event=>{if(event.target.classList.contains('modal-overlay'))closeTachoModal();};
    tq('.modal-sheet').focus();
  }

  function openBreakPicker(options={}){
    const instruction=currentInstruction();
    if(!instruction.type)return;
    const arrivalStatus=options.arrival?`<div class="tacho-arrival-status">${tachoIcon('check')}Jesteś na parkingu</div>`:'';
    modalShell(options.arrival?'Co zrobić na parkingu?':'Co robisz teraz?',`${arrivalStatus}<section class="tacho-instruction-modal"><span>ZRÓB TERAZ</span><strong>${instruction.duration}</strong><h4>${instruction.type.rest?'odpoczynku':'przerwy'}</h4><p>${instruction.reason}</p></section>${options.arrival?parkingTimeSummary():''}<button class="tacho-primary-action" id="tacho-start-instruction">${tachoIcon('clock')}Rozpoczynam ${instruction.duration}</button><button class="tacho-secondary-action" id="tacho-open-options">Zgłaszam inną przerwę</button><p class="tacho-simple-note">${options.arrival?'Dane przykładowe. Sprawdź tachograf.':'Sprawdź wartość na tachografie przed rozpoczęciem.'}</p>`);
    if(options.arrival)tq('.modal-sheet').classList.add('tacho-parking-modal');
    tq('#tacho-start-instruction').onclick=()=>startBreak(instruction.type.id,false,options);
    tq('#tacho-open-options').onclick=()=>openBreakOptions(options);
  }

  function openBreakOptions(options={}){
    const recommendation=currentRecommendation();
    const groups=[...new Set(breakTypes.map(item=>item.group))];
    const choices=groups.map(group=>`<section class="tacho-choice-group"><h4>${group}</h4><div class="tacho-choice-list">${breakTypes.filter(item=>item.group===group).map(item=>{
      const isSuggested=item.id===recommendation.suggestedTypeId;
      const isAlternate=item.id===recommendation.alternateTypeId;
      const warning=choiceWarning(item.id,recommendation);
      const badge=isSuggested?'SUGEROWANE':isAlternate?'ALTERNATYWA':warning?'SPRAWDŹ WYBÓR':'';
      return `<button class="tacho-choice ${item.rest?'rest':''} ${isSuggested?'suggested':''} ${warning?'has-warning':''}" data-tacho-type="${item.id}"><span class="tacho-choice-icon">${tachoIcon(item.icon)}</span><span><strong>${item.title}${badge?`<em>${badge}</em>`:''}</strong><small>${item.hint}</small></span>${tachoIcon('arrow')}</button>`;
    }).join('')}</div></section>`).join('');
    modalShell('Wybierz inną przerwę',`${choices}<p class="tacho-simple-note">Zgłoś dokładnie tę przerwę, którą faktycznie rozpoczynasz.</p>`);
    tqa('[data-tacho-type]').forEach(button=>button.onclick=()=>startBreak(button.dataset.tachoType,false,{arrival:Boolean(options.arrival)}));
  }

  function openChoiceWarning(typeId,warning,options={}){
    const selected=breakTypes.find(item=>item.id===typeId);
    const suggested=breakTypes.find(item=>item.id===warning.suggestedTypeId);
    if(!selected||!suggested)return;
    modalShell('Ta przerwa nie wystarczy',`<section class="tacho-warning-command"><span>ZRÓB TERAZ</span><strong>${instructionLabel(suggested)}</strong><p>${warning.text}</p></section><button class="tacho-primary-action" id="tacho-use-suggestion">${tachoIcon('clock')}Rozpoczynam ${instructionDuration(suggested)}</button><button class="tacho-secondary-action" id="tacho-change-break-type">Zmieniam rodzaj przerwy</button><button class="tacho-warning-actual" id="tacho-use-actual">Mimo to zgłoś: ${instructionDuration(selected)}</button><p class="tacho-simple-note">Zgłaszaj tylko to, co faktycznie robisz.</p>`);
    tq('#tacho-use-suggestion').onclick=()=>startBreak(suggested.id,true,options);
    tq('#tacho-change-break-type').onclick=()=>openBreakOptions(options);
    tq('#tacho-use-actual').onclick=()=>startBreak(selected.id,true,options);
  }

  function parkingSuggestionCard(){
    if(tachoState.active){
      const type=activeType();
      return `<section class="panel parking-break-card active"><div class="parking-break-icon">${tachoIcon('clock')}</div><div class="parking-break-copy"><span>PRZERWA TRWA</span><h3>${instructionLabel(type)||'Aktywna przerwa'}</h3><p>Nie ruszaj przed zakończeniem wymaganej przerwy.</p></div><button data-tacho-show-active>${tachoIcon('arrow')}Pokaż licznik</button></section>`;
    }
    const instruction=currentInstruction();
    return `<section class="panel parking-break-card"><div class="parking-break-icon">${tachoIcon('clock')}</div><div class="parking-break-copy"><span>ZRÓB TERAZ</span><h3>${instruction.label}</h3><p>${instruction.reason}</p></div>${parkingTimeSummary()}<button data-tacho-start-suggested>${tachoIcon('clock')}Rozpoczynam ${instruction.duration}</button><button class="parking-break-other" data-tacho-open-options>Zgłaszam inną przerwę</button><small>${tachoIcon('info')} Dane przykładowe. Sprawdź tachograf.</small></section>`;
  }

  function offerParkingBreak(){
    tachoState.arrivedAtParking=true;
    if(tachoState.active){renderTacho();showTachoToast('Przerwa jest już zgłoszona — pokazuję aktywny licznik.');return;}
    openBreakPicker({arrival:true});
  }

  function selectRecommendationPreset(key){
    if(!recommendationPresets[key])return;
    tachoState.recommendationPreset=key;
    tachoState.splitStage=key==='after-15'?1:0;
    if(tachoOpen)renderTacho();
    else{
      const currentCard=tq('.parking-break-card');
      if(currentCard){
        const holder=document.createElement('div');
        holder.innerHTML=parkingSuggestionCard();
        currentCard.replaceWith(holder.firstElementChild);
      }
    }
  }

  function openSplitSimulation(){
    const stage=tachoState.splitStage;
    const firstDone=stage>=1;
    const secondDone=stage>=2;
    const status=stage===0
      ?'<strong>Przed pierwszą częścią</strong><span>Licznik jazdy wynosi 3:12. Rozpocznij od minimum 15 minut przerwy.</span>'
      :stage===1
        ?'<strong>15 minut zaliczone</strong><span>Licznik 4:30 nie jest jeszcze wyzerowany. Druga część musi mieć minimum 30 minut.</span>'
        :'<strong>Pełna przerwa zaliczona</strong><span>15 + 30 minut ukończone w prawidłowej kolejności. Nowy okres jazdy zaczyna się od 0:00.</span>';
    const action=stage===0?'Symuluj pierwsze 15 min':stage===1?'Symuluj kolejne 30 min':'Uruchom symulację od początku';
    modalShell('Symulacja przerwy 15 + 30',`<div class="tacho-split-rule">${tachoIcon('info')}<p><strong>Prawidłowa kolejność: najpierw 15, potem 30 minut.</strong>Przerwa 30 + 15 minut nie zeruje okresu jazdy jako prawidłowo podzielona przerwa.</p></div><div class="tacho-split-steps"><div class="tacho-split-step ${firstDone?'done':stage===0?'current':''}"><span>${firstDone?tachoIcon('check'):'1'}</span><div><strong>Minimum 15 min</strong><small>Pierwsza część przerwy dzielonej</small></div></div><div class="tacho-split-step ${secondDone?'done':stage===1?'current':'locked'}"><span>${secondDone?tachoIcon('check'):'2'}</span><div><strong>Minimum 30 min</strong><small>Druga część, po wcześniejszych 15 min</small></div></div></div><div class="tacho-split-result ${secondDone?'complete':''}">${status}</div><button class="tacho-split-next" id="tacho-split-next">${action}</button>${stage===1?'<button class="tacho-split-reset" id="tacho-split-reset">Przerwij i wyzeruj symulację</button>':''}<p class="tacho-modal-note">${tachoIcon('info')}To demonstracja. W rzeczywistej pracy o zaliczeniu przerwy decyduje zapis tachografu.</p>`);
    tq('#tacho-split-next').onclick=advanceSplitSimulation;
    tq('#tacho-split-reset')?.addEventListener('click',resetSplitSimulation);
  }

  function advanceSplitSimulation(){
    tachoState.splitStage=tachoState.splitStage===2?0:tachoState.splitStage+1;
    closeTachoModal();
    renderTacho();
    openSplitSimulation();
  }

  function resetSplitSimulation(){
    tachoState.splitStage=0;
    closeTachoModal();
    renderTacho();
    showTachoToast('Symulacja przerwy dzielonej została wyzerowana.');
  }

  function startBreak(typeId,confirmed=false,options={}){
    const type=breakTypes.find(item=>item.id===typeId);
    if(!type)return;
    const recommendation=currentRecommendation();
    const warning=choiceWarning(typeId,recommendation);
    if(warning&&!confirmed){openChoiceWarning(typeId,warning,options);return;}
    tachoState.active={typeId,startedAt:Date.now(),recommendationKey:recommendation.key,reportedAtParking:Boolean(options.arrival||tachoState.arrivedAtParking)};
    tachoState.history.push({typeId,startedAt:tachoState.active.startedAt,recommendationKey:recommendation.key,reportedAtParking:tachoState.active.reportedAtParking});
    closeTachoModal();
    renderTacho();
    showTachoToast(`${type.title} — zgłoszenie demonstracyjne rozpoczęte.`);
  }

  function startSuggestedBreak(minutes){
    if(tachoState.active)return fuelBreakContext();
    const type=breakTypes.find(item=>item.id===`break-${minutes}`);
    if(!type)return null;
    const recommendation=currentRecommendation();
    tachoState.active={typeId:type.id,startedAt:Date.now(),source:'fuel-suggestion',recommendationKey:recommendation.key,reportedAtParking:false};
    tachoState.history.push({typeId:type.id,startedAt:tachoState.active.startedAt,source:'fuel-suggestion',recommendationKey:recommendation.key,reportedAtParking:false});
    syncTimer();
    return fuelBreakContext();
  }

  function endBreak(){
    const type=activeType();
    if(!type)return;
    tachoState.lastClosed={title:type.title,elapsed:activeElapsed(),endedAt:Date.now()};
    const historyItem=tachoState.history[tachoState.history.length-1];
    if(historyItem&&historyItem.typeId===type.id&&!historyItem.endedAt){historyItem.endedAt=tachoState.lastClosed.endedAt;historyItem.elapsed=tachoState.lastClosed.elapsed;}
    tachoState.active=null;
    syncTimer();
    renderTacho();
    showTachoToast('Zgłoszenie demonstracyjne zostało zakończone.');
  }

  function openTachoHelp(){
    modalShell('Pomoc · panel tacho',`<p>Panel pokazuje bilans jazdy i odpoczynków oraz pozwala zgłosić spedytorowi rozpoczętą przerwę.</p><div class="tacho-source-note">${tachoIcon('info')}<p><strong>Najpierw sprawdź tachograf.</strong>Jeśli wartości w aplikacji i urządzeniu się różnią, obowiązuje zapis tachografu. Wersja demonstracyjna nie wysyła danych.</p></div>`);
  }

  window.SuperSpedytorTacho={
    open:renderTacho,
    close:leaveTacho,
    getFuelBreakContext:fuelBreakContext,
    startSuggestedBreak,
    offerParkingBreak,
    parkingSuggestionCard,
    openBreakPicker:()=>openBreakPicker({arrival:tachoState.arrivedAtParking}),
    hasActiveBreak:()=>Boolean(tachoState.active)
  };

  document.addEventListener('click',event=>{
    const presetButton=event.target.closest('[data-tacho-preset]');
    if(presetButton){event.preventDefault();selectRecommendationPreset(presetButton.dataset.tachoPreset);return;}
    const pickerButton=event.target.closest('[data-tacho-open-picker]');
    if(pickerButton){event.preventDefault();openBreakPicker({arrival:true});return;}
    const optionsButton=event.target.closest('[data-tacho-open-options]');
    if(optionsButton){event.preventDefault();openBreakOptions({arrival:true});return;}
    const suggestedButton=event.target.closest('[data-tacho-start-suggested]');
    if(suggestedButton){event.preventDefault();startBreak(currentRecommendation().suggestedTypeId,false,{arrival:true});return;}
    const activeButton=event.target.closest('[data-tacho-show-active]');
    if(activeButton){event.preventDefault();closeTachoModal();renderTacho();}
  });

  const nav=tq('.bottom-nav');
  nav?.addEventListener('click',event=>{
    const button=event.target.closest('[data-nav]');
    if(!button)return;
    if(button.dataset.nav==='tacho'){
      event.preventDefault();
      event.stopPropagation();
      closeTachoModal();
      renderTacho();
      return;
    }
    if(tachoOpen&&button.dataset.nav==='help'){
      event.preventDefault();
      event.stopPropagation();
      openTachoHelp();
      return;
    }
    if(tachoOpen)leaveTacho();
  },true);

  tqa('[data-operation],[data-route-stop],.screen-list [data-screen],#reset').forEach(control=>control.addEventListener('click',leaveTacho));
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&tq('#tacho-modal-title'))closeTachoModal();
  });
})();
