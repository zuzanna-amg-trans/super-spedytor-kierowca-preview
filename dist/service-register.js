(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SuperSpedytorServiceRegister=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const statuses={
    completed:{label:'Ankieta wykonana',tone:'done',icon:'check'},
    not_submitted:{label:'Brak ankiety po terminie',tone:'missing',icon:'warning'},
    pending:{label:'Do wypełnienia',tone:'pending',icon:'clock'},
    in_progress:{label:'W trakcie wypełniania',tone:'pending',icon:'clock'},
    needs_correction:{label:'Do poprawy',tone:'pending',icon:'edit'},
    not_assigned:{label:'Brak przydzielonej ankiety',tone:'neutral',icon:'calendar'},
    skipped:{label:'Ankieta pominięta',tone:'neutral',icon:'info'},
    cancelled:{label:'Ankieta anulowana',tone:'neutral',icon:'info'}
  };
  function status(record){
    const value=statuses[record?.status]||{label:'Status nieznany',tone:'neutral',icon:'info'};
    // Only the explicit B802 overdue status establishes a missing survey.
    // A gap in completed-only history, a draft or a transport error never does.
    return {...value,penalty:record?.status==='not_submitted'?-5:0};
  }
  function validRegistry(value){
    return Boolean(value&&/^\d{4}-\d{2}$/.test(value.month||'')&&/^\d{4}-\d{2}-\d{2}$/.test(value.today||'')&&Array.isArray(value.rows)
      &&value.rows.every(row=>row&&/^\d{4}-\d{2}-\d{2}$/.test(row.date||'')&&Array.isArray(row.surveys)&&row.surveys.every(survey=>survey&&typeof survey.survey_slug==='string'&&typeof survey.status==='string')));
  }
  function records(registry,completed=[]){
    if(!validRegistry(registry))return completed;
    const details=new Map(completed.map(record=>[String(record.id),record]));
    return registry.rows.flatMap(row=>{
      const surveys=row.surveys.filter(survey=>survey.survey_slug==='service-inspection');
      if(!surveys.length)return [{date:row.date,id:'unassigned-'+row.date,status:'not_assigned'}];
      return surveys.map(survey=>{
        const prior=details.get(String(survey.task_id));
        return {...(prior||{}),...survey,date:row.date,id:survey.task_id,definition_slug:'service-inspection',
          detail:survey.status==='completed'?prior?.detail:null};
      });
    }).sort((a,b)=>b.date.localeCompare(a.date));
  }
  function summary(records){
    return records.reduce((sum,record)=>{
      if(record.status==='completed')sum.completed++;
      if(record.status==='not_submitted'){sum.missing++;sum.penalty-=5;}
      return sum;
    },{completed:0,missing:0,penalty:0});
  }
  return {status,validRegistry,records,summary};
});
