'use strict';

(function exposeFuelBreakSuggestion(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SuperSpedytorBreakSuggestion=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  const RULESET_VERSION='fuel-break-v1';
  const thresholds={
    earlyOpportunityStartMinutes:60,
    earlyOpportunityEndMinutes:120,
    finishSplitAfterDrivingMinutes:210,
    urgentRemainingMinutes:60
  };

  const finiteMinutes=value=>{
    const number=Number(value);
    return Number.isFinite(number)&&number>=0?number:null;
  };
  const decision=(action,durationMinutes,reasonCode,title,description,extra={})=>({
    action,
    durationMinutes,
    reasonCode,
    title,
    description,
    rulesetVersion:RULESET_VERSION,
    ...extra
  });

  function recommendFuelBreak(context={}){
    const drivingMinutes=finiteMinutes(context.drivingSinceFullBreakMinutes);
    const remainingMinutes=finiteMinutes(context.minutesToRequiredBreak);
    const active=context.activeReportedBreak||null;
    const fresh=context.fresh!==false;

    if(!fresh||drivingMinutes===null){
      return decision(
        'CHECK_TACHOGRAPH',
        null,
        fresh?'MISSING_DRIVING_TIME':'STALE_WORK_TIME',
        'Najpierw sprawdź tachograf',
        'Brakuje aktualnego, wiarygodnego odczytu czasu jazdy. Aplikacja nie proponuje długości przerwy.'
      );
    }

    if(active){
      return decision(
        'KEEP_ACTIVE_REPORT',
        finiteMinutes(active.plannedMinutes),
        'ACTIVE_BREAK_ALREADY_REPORTED',
        'Przerwa jest już zgłoszona',
        active.title?`${active.title} trwa. Nie uruchamiaj drugiego zgłoszenia.`:'Kontynuuj bieżące zgłoszenie. Nie uruchamiaj drugiego.',
        {activeReport:active}
      );
    }

    const split15=Boolean(context.splitBreak15Completed);
    const urgent=remainingMinutes!==null&&remainingMinutes<=thresholds.urgentRemainingMinutes;

    if(split15&&(drivingMinutes>=thresholds.finishSplitAfterDrivingMinutes||urgent)){
      return decision(
        'SUGGEST_BREAK',
        30,
        urgent?'SPLIT_15_DONE_AND_LIMIT_NEAR':'SPLIT_15_DONE_AFTER_3H30',
        'Sugerowana przerwa: 30 min',
        'Masz potwierdzone 15 minut pierwszej części. Po zakończeniu tankowania możesz rozpocząć kolejne 30 minut.'
      );
    }

    if(!split15&&(urgent||drivingMinutes>thresholds.earlyOpportunityEndMinutes)){
      return decision(
        'SUGGEST_BREAK',
        45,
        urgent?'NO_SPLIT_AND_LIMIT_NEAR':'NO_BREAK_AFTER_2H',
        'Sugerowana przerwa: 45 min',
        'Nie ma potwierdzonej wcześniejszej piętnastki. Po zakończeniu tankowania możesz rozpocząć pełną, nieprzerwaną przerwę.'
      );
    }

    if(!split15&&drivingMinutes>=thresholds.earlyOpportunityStartMinutes){
      return decision(
        'SUGGEST_BREAK',
        15,
        'EARLY_FUELING_OPPORTUNITY',
        'Sugerowana przerwa: 15 min',
        'Tankowanie wypada między 1:00 a 2:00 jazdy. Po zakończeniu czynności możesz rozpocząć pierwsze 15 minut przerwy dzielonej.'
      );
    }

    if(split15){
      return decision(
        'CONTINUE_AFTER_FUELING',
        null,
        'SPLIT_15_DONE_NOT_YET_DUE',
        'Po tankowaniu możesz jechać dalej',
        'Pierwsze 15 minut jest potwierdzone, a próg sugestii kolejnych 30 minut nie został jeszcze osiągnięty.'
      );
    }

    return decision(
      'CONTINUE_AFTER_FUELING',
      null,
      'UNDER_1H_DRIVING',
      'Po tankowaniu możesz jechać dalej',
      'Od pełnej przerwy minęła mniej niż godzina jazdy, dlatego przy tym tankowaniu nie proponujemy dodatkowej przerwy.'
    );
  }

  return {RULESET_VERSION,thresholds,recommendFuelBreak};
});
