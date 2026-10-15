'use strict';

(function exposeServiceSurvey(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SuperSpedytorServiceSurvey = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createServiceSurvey() {
  const steps = Object.freeze(['message', 'oil', 'adBlue', 'serviceDistance', 'dpf']);
  const titles = Object.freeze({message:'Komunikat serwisowy', oil:'Poziom oleju',
    adBlue:'Poziom AdBlue', serviceDistance:'Dystans do przeglądu', dpf:'Zdjęcie DPF'});
  const hasValue = value => value !== null && value !== undefined && String(value).trim() !== '';
  const stepIndex = value => Math.max(0, Math.min(steps.length - 1, Math.floor(Number(value) || 0)));

  function dateKey(date = new Date()) {
    const day = new Date(date);
    if (day.getHours() === 0 && day.getMinutes() < 1) day.setDate(day.getDate() - 1);
    return `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
  }
  function expiry(date = new Date()) {
    const next = new Date(date);
    next.setHours(0, 1, 0, 0);
    if (date >= next) next.setDate(next.getDate() + 1);
    return next;
  }
  function create(date = new Date()) {
    return {date:dateKey(date), step:0, messageStatus:null,
      oil:'', adBlue:'', serviceDistance:'', afterService:false, note:'',
      photos:{oil:null, adBlue:null, serviceDistance:null, dpf:null, message:null},
      submitted:false, submittedAt:null, reopened:false, hydrated:false};
  }
  function validation(survey, key = steps[stepIndex(survey.step)]) {
    if (key === 'message') {
      if (!['clear','reported'].includes(survey.messageStatus)) return 'Wybierz, czy na desce jest komunikat serwisowy.';
      return survey.messageStatus === 'reported' && !survey.photos?.message ? 'Dodaj zdjęcie komunikatu z deski rozdzielczej.' : '';
    }
    if (key !== 'dpf') {
      const value = Number(String(survey[key]).replace(',', '.'));
      if (!hasValue(survey[key]) || !Number.isFinite(value) || value < 0
          || (key !== 'serviceDistance' && value > 100)) {
        return key === 'serviceDistance' ? 'Wpisz dystans do przeglądu w kilometrach.' : 'Wpisz poziom od 0 do 100%.';
      }
    }
    return survey.photos?.[key] ? '' : 'Dodaj czytelne zdjęcie wskazania.';
  }
  function firstIncomplete(survey) { return steps.findIndex(key => Boolean(validation(survey,key))); }
  function ready(survey) { return firstIncomplete(survey) === -1; }
  function reminderDue(record, now = new Date()) {
    if (record?.date === dateKey(now) && record.status === 'done' && record.survey) return false;
    if (record?.date !== dateKey(now)) return true;
    if (record.snoozeUntil && now.getTime() < new Date(record.snoozeUntil).getTime()) return false;
    if (record.draft && now.getTime() - new Date(record.lastPromptedAt || 0).getTime() >= 15*60*1000) return true;
    return !(record.promptSlots || []).includes(now.getHours() < 15 ? 'morning' : 'evening');
  }
  function snapshot(survey, photos = {}) {
    return {date:survey.date, step:stepIndex(survey.step), messageStatus:survey.messageStatus,
      oil:survey.oil, adBlue:survey.adBlue, serviceDistance:survey.serviceDistance,
      afterService:Boolean(survey.afterService), note:survey.note, photos};
  }
  function restore(record, photos, date = new Date()) {
    if (!record || record.date !== dateKey(date)) return null;
    const source = record.draft || record.survey;
    if (!source) return null;
    const survey = {...create(date), ...snapshot({...source,date:record.date}, photos), photos,
      hydrated:true, reopened:record.status !== 'done'};
    if (!source.messageStatus && record.survey) survey.messageStatus = source.note || photos.message ? 'reported' : 'clear';
    const incomplete = firstIncomplete(survey);
    if (incomplete >= 0 && incomplete < survey.step) survey.step = incomplete;
    return survey;
  }
  return Object.freeze({steps,titles,stepIndex,dateKey,expiry,create,validation,firstIncomplete,ready,reminderDue,snapshot,restore});
});
