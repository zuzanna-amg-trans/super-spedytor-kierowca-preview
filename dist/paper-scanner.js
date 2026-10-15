/* Local document geometry and colour processing. No network or generated content. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.CmrPaperScanner=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='paper-color-1',MAX_EDGE=4200,MAX_PIXELS=11000000;
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const area=q=>Math.abs(q.reduce((sum,p,i)=>{const n=q[(i+1)%q.length];return sum+p.x*n.y-n.x*p.y;},0))/2;
  function order(points){
    const cx=points.reduce((s,p)=>s+p.x,0)/4,cy=points.reduce((s,p)=>s+p.y,0)/4;
    const q=points.map(p=>({x:p.x,y:p.y})).sort((a,b)=>Math.atan2(a.y-cy,a.x-cx)-Math.atan2(b.y-cy,b.x-cx));
    const start=q.reduce((best,p,i)=>p.x+p.y<q[best].x+q[best].y?i:best,0);
    return [...q.slice(start),...q.slice(0,start)];
  }
  function validQuad(q,width,height){
    if(q?.length!==4||!q.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.y>=0&&p.x<width&&p.y<height))return false;
    const cross=q.map((p,i)=>{const a=q[(i+1)%4],b=q[(i+2)%4];return (a.x-p.x)*(b.y-a.y)-(a.y-p.y)*(b.x-a.x);});
    return cross.every(v=>v>0)&&area(q)>width*height*.035&&q.every((p,i)=>distance(p,q[(i+1)%4])>Math.min(width,height)*.06);
  }
  function dimensions(q){
    // Never upscale a small photo to make it pass the resolution gate.
    let width=Math.round(Math.max(distance(q[0],q[1]),distance(q[3],q[2])));
    let height=Math.round(Math.max(distance(q[0],q[3]),distance(q[1],q[2])));
    const scale=Math.min(1,MAX_EDGE/Math.max(width,height),Math.sqrt(MAX_PIXELS/(width*height)));
    return {width:Math.max(2,Math.round(width*scale)),height:Math.max(2,Math.round(height*scale))};
  }
  function scope(cv,callback){const owned=[];try{return callback(value=>{owned.push(value);return value;});}finally{owned.reverse().forEach(value=>value.delete());}}
  function detect(cv,rgba,width,height){
    return scope(cv,keep=>{
      const src=keep(cv.matFromArray(height,width,cv.CV_8UC4,rgba));
      const small=keep(new cv.Mat()),gray=keep(new cv.Mat()),blur=keep(new cv.Mat()),edges=keep(new cv.Mat());
      const scale=Math.min(1,1100/Math.max(width,height));
      cv.resize(src,small,new cv.Size(Math.round(width*scale),Math.round(height*scale)),0,0,cv.INTER_AREA);
      cv.cvtColor(small,gray,cv.COLOR_RGBA2GRAY);cv.GaussianBlur(gray,blur,new cv.Size(5,5),0);
      cv.Canny(blur,edges,35,110);
      const kernel=keep(cv.Mat.ones(5,5,cv.CV_8U));cv.morphologyEx(edges,edges,cv.MORPH_CLOSE,kernel);
      const candidates=[];
      function contours(mask){
        const list=keep(new cv.MatVector()),hierarchy=keep(new cv.Mat());
        cv.findContours(mask,list,hierarchy,cv.RETR_LIST,cv.CHAIN_APPROX_SIMPLE);
        for(let i=0;i<list.size();i++){
          const c=list.get(i);
          try{
            if(Math.abs(cv.contourArea(c))<small.rows*small.cols*.08)continue;
            const perimeter=cv.arcLength(c,true),poly=new cv.Mat();
            try{
              for(const epsilon of [.015,.025,.04]){
                cv.approxPolyDP(c,poly,perimeter*epsilon,true);
                if(poly.rows!==4||!cv.isContourConvex(poly))continue;
                const q=order(Array.from({length:4},(_,j)=>({x:poly.data32S[j*2],y:poly.data32S[j*2+1]})));
                if(!validQuad(q,small.cols,small.rows))continue;
                const a=area(q)/(small.cols*small.rows),d=dimensions(q),ratio=Math.max(d.width,d.height)/Math.min(d.width,d.height);
                if(a>.985||ratio>2.8)continue;
                // A large dark screen/frame must not outrank the actual bright paper.
                let mean=0,count=0,bright=0;
                for(let v=.08;v<.94;v+=.1)for(let u=.08;u<.94;u+=.1){
                  const x=Math.round((1-v)*((1-u)*q[0].x+u*q[1].x)+v*((1-u)*q[3].x+u*q[2].x));
                  const y=Math.round((1-v)*((1-u)*q[0].y+u*q[1].y)+v*((1-u)*q[3].y+u*q[2].y));
                  const value=gray.data[y*small.cols+x];mean+=value;count++;if(value>115)bright++;
                }
                mean/=count;const light=bright/count;
                if(mean<85||light<.5)continue;
                const score=Math.sqrt(a)*.48+mean/255*.28+light*.2+(ratio>=1.15&&ratio<1.8?.04:0);
                const boundary=q.filter(p=>p.x<3||p.y<3||p.x>small.cols-4||p.y>small.rows-4).length;
                candidates.push({quad:q.map(p=>({x:Math.min(width-1,p.x/scale),y:Math.min(height-1,p.y/scale)})),score,area:a,mean,boundary});break;
              }
            }finally{poly.delete();}
          }finally{c.delete();}
        }
      }
      contours(edges);
      // Complement edges with several brightness masks for a pale page on a busy desk.
      const mask=keep(new cv.Mat());
      for(const threshold of [100,145,185]){
        cv.threshold(blur,mask,threshold,255,cv.THRESH_BINARY);cv.morphologyEx(mask,mask,cv.MORPH_CLOSE,kernel);contours(mask);
      }
      candidates.sort((a,b)=>b.score-a.score);
      const best=candidates[0];
      if(!best)return {quad:null,confident:false,reason:'missing'};
      return {...best,confident:best.score>.70&&best.area>.16&&best.boundary<2,reason:best.boundary>=2?'boundary':'detected'};
    });
  }
  function enhance(cv,rgba,width,height,mode='color',existingMat=null){
    if(mode==='natural')return new Uint8ClampedArray(rgba);
    return scope(cv,keep=>{
      const source=existingMat||keep(cv.matFromArray(height,width,cv.CV_8UC4,rgba));
      const small=keep(new cv.Mat()),background=keep(new cv.Mat());
      const scale=Math.min(1,420/Math.max(width,height));
      cv.resize(source,small,new cv.Size(Math.max(8,Math.round(width*scale)),Math.max(8,Math.round(height*scale))),0,0,cv.INTER_AREA);
      const kernel=keep(cv.Mat.ones(9,9,cv.CV_8U));
      cv.dilate(small,background,kernel);cv.GaussianBlur(background,background,new cv.Size(31,31),0,0,cv.BORDER_REPLICATE);
      const output=new Uint8ClampedArray(rgba.length),bw=background.cols,bh=background.rows,bg=background.data;
      const contrast=mode==='strong'?1.34:1.15;
      // Low-frequency lighting correction per colour channel, retaining coloured ink.
      // No thresholding, erasing, OCR replacement, or generative reconstruction.
      for(let y=0;y<height;y++){
        const by=y*(bh-1)/Math.max(1,height-1),y0=Math.floor(by),y1=Math.min(bh-1,y0+1),fy=by-y0;
        for(let x=0;x<width;x++){
          const bx=x*(bw-1)/Math.max(1,width-1),x0=Math.floor(bx),x1=Math.min(bw-1,x0+1),fx=bx-x0,i=(y*width+x)*4;
          for(let c=0;c<3;c++){
            const top=bg[(y0*bw+x0)*4+c]*(1-fx)+bg[(y0*bw+x1)*4+c]*fx;
            const bottom=bg[(y1*bw+x0)*4+c]*(1-fx)+bg[(y1*bw+x1)*4+c]*fx;
            const light=Math.max(65,top*(1-fy)+bottom*fy),normalized=Math.min(255,rgba[i+c]*248/light);
            output[i+c]=Math.max(0,Math.min(255,(normalized-245)*contrast+245));
          }
          output[i+3]=255;
        }
      }
      return output;
    });
  }
  function process(cv,rgba,width,height,quad,mode='color'){
    if(!validQuad(quad,width,height))throw new Error('Ustaw cztery rogi kartki w kolejności. Obrys nie może się przecinać.');
    return scope(cv,keep=>{
      const outputSize=dimensions(quad),src=keep(cv.matFromArray(height,width,cv.CV_8UC4,rgba)),dst=keep(new cv.Mat());
      const from=keep(cv.matFromArray(4,1,cv.CV_32FC2,quad.flatMap(p=>[p.x,p.y])));
      const to=keep(cv.matFromArray(4,1,cv.CV_32FC2,[0,0,outputSize.width-1,0,outputSize.width-1,outputSize.height-1,0,outputSize.height-1]));
      const matrix=keep(cv.getPerspectiveTransform(from,to));
      cv.warpPerspective(src,dst,matrix,new cv.Size(outputSize.width,outputSize.height),cv.INTER_CUBIC,cv.BORDER_REPLICATE);
      const data=enhance(cv,dst.data,dst.cols,dst.rows,mode,dst);
      return {data,...outputSize,version:VERSION,mode,quad:quad.map(p=>({...p}))};
    });
  }
  return {VERSION,MAX_EDGE,MAX_PIXELS,order,area,validQuad,dimensions,detect,process,enhance};
});
