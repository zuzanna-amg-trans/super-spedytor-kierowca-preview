(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.CmrScanQuality=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const MIN_SHORT=1600,MIN_LONG=2200,MAX_PAGES=20,MAX_BYTES=100*1024*1024;
  // Indicators, not calibrated OCR/legibility scores. Never report a "quality %".
  function pixels(rgba,width,height){
    if(width<3||height<3||rgba.length!==width*height*4)throw new Error('Invalid image sample');
    const gray=new Float32Array(width*height);
    let sum=0,sum2=0,dark=0,color=0;
    for(let i=0;i<gray.length;i++){
      const r=rgba[i*4],g=rgba[i*4+1],b=rgba[i*4+2],value=.299*r+.587*g+.114*b;
      gray[i]=value;sum+=value;sum2+=value*value;
      if(value<45)dark++;
      if(Math.max(r,g,b)-Math.min(r,g,b)>28&&value>40&&value<245)color++;
    }
    let lap=0,lap2=0,n=0;
    // Exclude the crop boundary: a sharp edge against the background is not text.
    const mx=Math.max(1,Math.floor(width*.04)),my=Math.max(1,Math.floor(height*.04));
    for(let y=my;y<height-my;y++)for(let x=mx;x<width-mx;x++){
      const i=y*width+x,v=4*gray[i]-gray[i-1]-gray[i+1]-gray[i-width]-gray[i+width];
      lap+=v;lap2+=v*v;n++;
    }
    const mean=sum/gray.length;
    return {mean,variance:Math.max(0,sum2/gray.length-mean*mean),focus:Math.max(0,lap2/n-(lap/n)**2),darkFraction:dark/gray.length,colorFraction:color/gray.length};
  }
  function assess({width,height,metrics,mime}){
    if(mime==='application/pdf')return {blocked:false,manual:true,issues:['PDF: otwórz plik i sprawdź wszystkie strony. Automatyczna kontrola zdjęcia nie obejmuje PDF.']};
    const issues=[];
    let blocked=false;
    if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0){
      return {blocked:true,issues:['Nie udało się odczytać strony. Zeskanuj ją ponownie.']};
    }
    if(Math.min(width,height)<MIN_SHORT||Math.max(width,height)<MIN_LONG){
      blocked=true;issues.push(`Za mała rozdzielczość: ${width} × ${height} px. Zbliż telefon i zeskanuj całą kartkę ponownie.`);
    }else if(Math.min(width,height)<2480||Math.max(width,height)<3508){
      issues.push('Dla drobnego druku warto wykonać bliższy skan. Cel dla kartki A4 to około 2480 × 3508 px.');
    }
    if(!metrics){
      blocked=true;issues.push('Nie udało się sprawdzić obrazu. Wybierz inną stronę lub zeskanuj ponownie.');
    }else if(metrics.variance<9&&metrics.focus<2){
      blocked=true;issues.push('Na obrazie prawie nie ma widocznych szczegółów. Sprawdź kadr, ostrość i oświetlenie.');
    }else{
      if(metrics.focus<35)issues.push('Możliwa nieostrość. Powiększ drobny tekst i podpisy; jeśli się zlewają, powtórz skan.');
      if(metrics.darkFraction>.55)issues.push('Obraz jest ciemny. Doświetl całą kartkę równomiernie i unikaj cienia telefonu.');
    }
    return {blocked,manual:false,issues};
  }
  function pageReady(page){return !!page&&!page.quality?.blocked&&!!page.quality&&['edges','text','color'].every(key=>page.checks?.[key]===true);}
  function packetReady(pages){return pages.length>0&&pages.reduce((sum,page)=>sum+(page.pageCount||1),0)<=MAX_PAGES&&pages.every(pageReady)&&pages.reduce((sum,page)=>sum+(page.size||0),0)<=MAX_BYTES;}
  return {pixels,assess,pageReady,packetReady,MIN_SHORT,MIN_LONG,MAX_PAGES,MAX_BYTES};
});
