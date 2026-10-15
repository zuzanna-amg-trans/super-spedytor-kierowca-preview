'use strict';

((root,factory)=>{
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SuperSpedytorDaySummary=api;
})(typeof window==='undefined'?null:window,()=>{
  const HOUR=60*60*1000;
  const seconds=value=>Number.isFinite(value)&&value>=0?Math.floor(value):null;
  const timestamp=value=>{
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value!=='string'||!/(Z|[+-]\d{2}:\d{2})$/.test(value))return null;
    const parsed=Date.parse(value);
    return Number.isFinite(parsed)?parsed:null;
  };

  // Ordinary single-driver, uninterrupted daily rest only. Other arrangements
  // need their own verified rule before this UI can show a deadline.
  function summarize(context={}){
    const result={drivingSinceFullBreakSeconds:null,dailyDrivingSeconds:null,regularRestStartBy:null,reducedRestStartBy:null,reducedRestsRemaining:null};
    if(context.fresh!==true)return result;
    result.drivingSinceFullBreakSeconds=seconds(context.drivingSinceFullBreakSeconds);
    result.dailyDrivingSeconds=seconds(context.dailyDrivingSeconds);
    if(result.dailyDrivingSeconds!==null&&result.drivingSinceFullBreakSeconds!==null&&result.dailyDrivingSeconds<result.drivingSinceFullBreakSeconds){
      result.dailyDrivingSeconds=null;
      result.drivingSinceFullBreakSeconds=null;
    }
    const used=context.reducedDailyRestsUsed;
    if(Number.isInteger(used)&&used>=0&&used<=3)result.reducedRestsRemaining=3-used;
    const restEnd=timestamp(context.previousRestEndedAt);
    const reference=timestamp(context.referenceAt);
    if(context.crewSize!==1||context.dailyRestMode!=='uninterrupted'||restEnd===null||reference===null||reference<restEnd||reference>=restEnd+24*HOUR)return result;
    result.regularRestStartBy=restEnd+13*HOUR;
    if(result.reducedRestsRemaining>0)result.reducedRestStartBy=restEnd+15*HOUR;
    return result;
  }
  return {summarize};
});
