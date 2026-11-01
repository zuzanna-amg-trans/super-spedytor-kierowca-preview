'use strict';
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SuperSpedytorTransshipmentUI=api;})(typeof window==='undefined'?null:window,()=>{
  const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=name=>`<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  function context({outgoing=false,vehicle='',driver='',order='',goods='',pieceCount=null,detailsHtml=''}){
    return `<details class="transshipment-current-context ${outgoing?'issuing':'receiving'}"><summary>${icon('truck')}<span>${outgoing?'Wydajesz do':'Odbierasz z'} <strong>${e(vehicle||'auta drugiego kierowcy')}</strong></span><span class="transshipment-context-toggle">Szczegóły ${icon('arrow')}</span></summary><div class="transshipment-context-details"><p><strong>${e(driver||'Nie podano kierowcy')}</strong>${order?`<span>Zlecenie ${e(order)}</span>`:''}${goods||pieceCount!==null?`<span>${e([goods,pieceCount===null?'':pieceCount+' szt.'].filter(Boolean).join(' · '))}</span>`:''}</p>${detailsHtml}</div></details>`;
  }
  function executionHeader({backAttribute='data-transshipment-back="info"',backLabel='Bilans i plan',position='',progress=''}){
    return `<div class="transshipment-execution-header"><button class="secondary-button" ${backAttribute}>${icon('back')}${e(backLabel)}</button><span>${e(position)}<small>${e(progress)}</small></span></div>`;
  }
  return Object.freeze({context,executionHeader});
});
