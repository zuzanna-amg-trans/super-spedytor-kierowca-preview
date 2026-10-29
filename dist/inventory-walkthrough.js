'use strict';

(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SuperSpedytorInventoryWalkthrough=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  const name=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l').trim();
  const shotCode=shot=>typeof shot==='string'?shot:shot.code||shot.key||shot.id;
  const documentNames={'dowod-rejestracyjny':'Dowód rejestracyjny','wypis-z-licencji':'Wypis z licencji'};

  // The TMS slot remains the authoritative placement. This plan only interleaves
  // its equipment stages and photo requirements; it never rewrites row keys,
  // quantities, names or assignments and never hides an unknown section.
  function build(stages=[],sections=[],slots=[]){
    const stageSteps=stages.map((stage,stageIndex)=>{
      const slot=stage.slot||stage.products?.[0]?.slot;
      const section=slot?.section||slots.find(s=>String(s.id)===String(slot?.id))?.section;
      return {type:'stage',stage,stageIndex,section,photosByRow:{}};
    });
    const photoSteps=[];
    sections.forEach((section,sectionIndex)=>{
      const remaining=[];
      for(const shot of section.shots||[]){
        const expected=documentNames[shotCode(shot)];
        const matches=[];
        if(section.kind==='documents'&&expected){
          for(const step of stageSteps.filter(s=>s.section==='cabin')){
            (step.stage.products||[]).forEach((row,rowIndex)=>{
              if(name(row.product?.name||row.name)===name(expected))matches.push({step,rowIndex});
            });
          }
        }
        if(matches.length===1){
          const {step,rowIndex}=matches[0];
          (step.photosByRow[rowIndex]||=[]).push(shot);
        }else remaining.push(shot);
      }
      if(remaining.length)photoSteps.push({type:'photos',section:{...section,shots:remaining},sectionIndex});
    });
    const photos=kind=>photoSteps.filter(step=>step.section.kind===kind);
    const equipment=section=>stageSteps.filter(step=>step.section===section);
    return [
      ...photos('interior'),...equipment('cabin'),...photos('documents'),
      ...photos('exterior'),...photos('cargo'),...equipment('cargo'),
      ...equipment('external'),
      ...photoSteps.filter(step=>!['interior','documents','exterior','cargo'].includes(step.section.kind)),
      ...stageSteps.filter(step=>!['cabin','cargo','external'].includes(step.section))
    ];
  }
  return Object.freeze({build});
});
