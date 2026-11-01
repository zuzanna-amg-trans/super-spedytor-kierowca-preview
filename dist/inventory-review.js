(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SuperSpedytorInventoryReview=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l').toLowerCase().trim();
  const adrNames=new Set(['Pojemnik z przykrywką (ADR)','Folia budowlana (ADR)','Gogle ochronne (ADR)','Maska ucieczkowa (ADR)','Oczomyjka (ADR)','Kogut (ADR)','Szufelka (ADR)','Instrukcja ADR'].map(normalize));
  const product=row=>row.product||row;
  const isBackpackContent=row=>adrNames.has(normalize(product(row).name));
  const photoRequired=row=>{const p=product(row);return row.photo_required===true||p.photo_required===true||p.asks_card_digits===true||p.asksCardDigits===true||/^karta\b/.test(normalize(p.name))||/licenc/.test(normalize(p.name));};
  const url=photo=>typeof photo==='string'?photo:photo?.url||photo?.image||photo?.photo||photo?.file_url||'';
  function referencePhotos(row){
    const p=product(row),seen=new Set();
    return [p.default_photo,...(p.photos||[]),...(p.reference_photos||[])].filter(Boolean).map(photo=>typeof photo==='string'?{url:photo}:photo).filter(photo=>{const value=url(photo);if(!value||seen.has(value))return false;seen.add(value);return true;});
  }
  function condition(values){
    const positive=['good','average','bad'].filter(key=>Number(values[key]||0)>0);
    return positive.length>1?'mixed':({good:'present',average:'worn',bad:'damaged'}[positive[0]]||'missing');
  }
  const sameValues=(row,values)=>['good','average','bad','recovered'].every(k=>Number(row[k]||0)===Number(values[k]||0))&&(row.found_at_slot??null)===(values.found_at_slot??null);
  const ready=(row,photos=row.photos||[])=>row.confirmed===true&&(!photoRequired(row)||photos.length>0);
  function validate(row,selection,values,photos=[]){
    if(!selection)return 'Wybierz stan wyposażenia. Żaden stan nie jest zaznaczany automatycznie.';
    if(['good','average','bad','recovered'].some(k=>!Number.isInteger(values[k])||values[k]<0||values[k]>9999))return 'Podaj całkowite ilości od 0 do 9999.';
    if(condition(values)!==selection)return 'Wybrany stan nie zgadza się z ilościami. Sprawdź ilości i wybierz właściwy stan.';
    if(product(row).count_mode==='presence'&&values.good+values.average+values.bad>1)return 'Wybierz jeden stan tej pozycji.';
    if(values.recovered>Number(row.missing||0))return 'Odnaleziona ilość nie może przekroczyć wcześniejszego braku.';
    if(photoRequired(row)&&!photos.length)return 'Dodaj wymagane zdjęcie tej pozycji. Przy stanie „Brak” sfotografuj jej miejsce przechowywania.';
    return '';
  }
  return Object.freeze({normalize,isBackpackContent,photoRequired,referencePhotos,photoURL:url,condition,sameValues,ready,validate});
});
