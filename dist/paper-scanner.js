/* Adapter for the existing Super Spedytor driver document engine, offline. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./ss-scanner/core.js'));
  else{root.CmrPaperScanner=factory(root.SsDocumentScannerCore);root.CmrPaperScannerFactory=factory;}
})(typeof globalThis!=='undefined'?globalThis:this,function(core){
  'use strict';
  const VERSION='ss-driver-adc5c3b3b-3-paper-shadow',MAX_EDGE=4200,MAX_PIXELS=11000000;
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
    const w=Math.max(distance(q[0],q[1]),distance(q[3],q[2])),h=Math.max(distance(q[0],q[3]),distance(q[1],q[2]));
    const scale=Math.min(1,MAX_EDGE/Math.max(w,h),Math.sqrt(MAX_PIXELS/(w*h)));
    return {width:Math.max(2,Math.round(w*scale)),height:Math.max(2,Math.round(h*scale))};
  }
  function refineQuad(rgba,width,height,quad,aiOutline=false){
    // Only refine an automatic proposal. Work on the original RGB pixels so
    // scaling a 640px outline cannot leave a strip of desk in a 12MP scan.
    // Tiny arrays below contain side samples; no full-image buffer is made.
    // A learned 64x64 heatmap is a global proposal, with one source-cell
    // uncertainty. Refine that interval; old edge proposals keep their radius.
    const radius=Math.max(8,Math.max(width,height)*(aiOutline?1/64:.006)),steps=Math.ceil(radius);
    const median=values=>{const sorted=values.slice().sort((a,b)=>a-b),m=sorted.length>>1;return sorted.length%2?sorted[m]:(sorted[m-1]+sorted[m])/2;};
    const sample=(x,y)=>{
      if(x<0||x>width-1||y<0||y>height-1)return null;
      const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(width-1,x0+1),y1=Math.min(height-1,y0+1),fx=x-x0,fy=y-y0;
      const i00=(y0*width+x0)*4,i10=(y0*width+x1)*4,i01=(y1*width+x0)*4,i11=(y1*width+x1)*4;
      return [0,1,2].map(c=>(rgba[i00+c]*(1-fx)+rgba[i10+c]*fx)*(1-fy)+(rgba[i01+c]*(1-fx)+rgba[i11+c]*fx)*fy);
    };
    const difference=(a,b)=>a.map((value,i)=>value-b[i]);
    const norm=vector=>Math.hypot(...vector);
    const average=(x,y,tx,ty)=>{
      const rgb=[0,0,0];
      for(let k=-2;k<=2;k++){
        const value=sample(x+tx*k,y+ty*k);if(!value)return null;
        for(let c=0;c<3;c++)rgb[c]+=value[c]/5;
      }
      return rgb;
    };
    const lines=[];
    for(let side=0;side<4;side++){
      const a=quad[side],b=quad[(side+1)%4],length=distance(a,b),tx=(b.x-a.x)/length,ty=(b.y-a.y)/length,nx=-ty,ny=tx,points=[];
      for(let j=0;j<80;j++){
        const t=.05+.9*j/79,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
        const outside=average(x-nx*(radius+4),y-ny*(radius+4),tx,ty),inside=average(x+nx*(radius+4),y+ny*(radius+4),tx,ty);
        if(!outside||!inside)continue;
        const reference=difference(inside,outside),gap=norm(reference);
        if(gap<18)continue;
        const scores=[],limit=Math.max(18,gap*.55);let peak=-1;
        for(let offset=-steps;offset<=steps;offset++){
          const p=average(x+nx*(offset+1.5),y+ny*(offset+1.5),tx,ty),o=average(x+nx*(offset-1.5),y+ny*(offset-1.5),tx,ty);
          let strength=0;
          const insideError=p?norm(difference(p,inside)):Infinity,outsideError=o?norm(difference(o,outside)):Infinity;
          if(p&&o&&insideError<=limit&&outsideError<=limit){
            const delta=difference(p,o),magnitude=norm(delta),alignment=delta.reduce((sum,v,i)=>sum+v*reference[i],0)/(magnitude*gap+1e-9);
            // A printed border just inside the paper may be stronger than the
            // paper edge. It does not have the same OUTSIDE color as the desk.
            if(magnitude>=18&&alignment>=.65)strength=magnitude/(1+(outsideError/Math.max(8,gap*.08))**2+(insideError/Math.max(8,gap*.16))**2);
          }
          scores.push(strength);
          if(strength>0&&(peak<0||strength>scores[peak]))peak=scores.length-1;
        }
        if(peak<0||peak===0||peak===scores.length-1)continue;
        // A subpixel centroid avoids choosing one end of a flat gradient peak.
        let weight=0,weightedOffset=0;
        for(let k=Math.max(0,peak-2);k<=Math.min(scores.length-1,peak+2);k++){
          weight+=scores[k];weightedOffset+=(k-steps)*scores[k];
        }
        if(weight)points.push({t,offset:weightedOffset/weight});
      }
      if(points.length<48)return {quad:quad.map(p=>({...p})),refined:false};
      // Theil-Sen initialization tolerates isolated text/stamps at the edge;
      // MAD rejection then ordinary least squares gives the physical straight side.
      const slopes=[];
      for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)if(points[j].t-points[i].t>=.2)slopes.push((points[j].offset-points[i].offset)/(points[j].t-points[i].t));
      if(!slopes.length)return {quad:quad.map(p=>({...p})),refined:false};
      const slope=median(slopes),intercept=median(points.map(p=>p.offset-slope*p.t));
      const residuals=points.map(p=>p.offset-intercept-slope*p.t),center=median(residuals),mad=median(residuals.map(r=>Math.abs(r-center)));
      if(mad>Math.max(1.5,radius*.12))return {quad:quad.map(p=>({...p})),refined:false};
      const tolerance=Math.max(1.25,3*1.4826*mad),inliers=points.filter((p,i)=>Math.abs(residuals[i]-center)<=tolerance);
      if(inliers.length<48||inliers.length<points.length*.6)return {quad:quad.map(p=>({...p})),refined:false};
      const mt=inliers.reduce((sum,p)=>sum+p.t,0)/inliers.length,mo=inliers.reduce((sum,p)=>sum+p.offset,0)/inliers.length;
      let numerator=0,denominator=0;
      for(const p of inliers){numerator+=(p.t-mt)*(p.offset-mo);denominator+=(p.t-mt)**2;}
      if(denominator<1e-6)return {quad:quad.map(p=>({...p})),refined:false};
      const beta=numerator/denominator,alpha=mo-beta*mt;
      if(Math.max(Math.abs(alpha),Math.abs(alpha+beta))>radius)return {quad:quad.map(p=>({...p})),refined:false};
      const dx=b.x-a.x+nx*beta,dy=b.y-a.y+ny*beta,dl=Math.hypot(dx,dy);
      // Learned outlines refine to the physical edge without an inward inset:
      // keep edge annotations. Legacy proposals retain their original half pixel.
      const inset=aiOutline?0:.5;
      lines.push({x:a.x+nx*alpha-dy/dl*inset,y:a.y+ny*alpha+dx/dl*inset,dx,dy});
    }
    const refined=[];
    for(let i=0;i<4;i++){
      const a=lines[(i+3)%4],b=lines[i],det=a.dx*b.dy-a.dy*b.dx;
      if(Math.abs(det)<1e-6)return {quad:quad.map(p=>({...p})),refined:false};
      const t=((b.x-a.x)*b.dy-(b.y-a.y)*b.dx)/det,p={x:a.x+t*a.dx,y:a.y+t*a.dy};
      if(distance(p,quad[i])>radius)return {quad:quad.map(p=>({...p})),refined:false};
      refined.push(p);
    }
    return validQuad(refined,width,height)?{quad:refined,refined:true}:{quad:quad.map(p=>({...p})),refined:false};
  }
  function scope(callback){const owned=[];try{return callback(value=>{owned.push(value);return value;});}finally{owned.reverse().forEach(value=>value.delete());}}
  function sideSupport(rgba,width,height,q){
    // A threshold can end inside a shadow gradient. Require actual RGB
    // separation along every proposed side before saying the page was found.
    const sample=(x,y)=>{
      const i=(Math.max(0,Math.min(height-1,Math.round(y)))*width+Math.max(0,Math.min(width-1,Math.round(x))))*4;
      return [rgba[i],rgba[i+1],rgba[i+2]];
    };
    return q.map((a,i)=>{
      const b=q[(i+1)%4],length=distance(a,b),nx=-(b.y-a.y)/length,ny=(b.x-a.x)/length;
      let supported=0;
      for(let j=0;j<32;j++){
        const t=.07+.86*j/31,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
        const inside=[0,0,0],outside=[0,0,0];
        for(const band of [3,5,8]){
          const p=sample(x+nx*band,y+ny*band),o=sample(x-nx*band,y-ny*band);
          for(let c=0;c<3;c++){inside[c]+=p[c]/3;outside[c]+=o[c]/3;}
        }
        if(Math.hypot(...inside.map((v,c)=>v-outside[c]))>=18)supported++;
      }
      return supported/32;
    });
  }
  function detect(cv,rgba,width,height){
    if(!core)throw new Error('Brakuje silnika dokumentów SS. Zaktualizuj aplikację.');
    return scope(keep=>{
      const src=keep(cv.matFromArray(height,width,cv.CV_8UC4,rgba)),small=keep(new cv.Mat()),gray=keep(new cv.Mat());
      const scale=Math.min(1,640/Math.max(width,height));
      cv.resize(src,small,new cv.Size(Math.round(width*scale),Math.round(height*scale)),0,0,cv.INTER_AREA);
      cv.cvtColor(small,gray,cv.COLOR_RGBA2GRAY);
      const values=new Uint8ClampedArray(gray.data),candidates=[];
      function proposals(data,channel){
        const edge=core.cornersFromGray(cv,data,gray.cols,gray.rows);
        const threshold=edge?.confident?null:core.findDocument(data,gray.cols,gray.rows);
        for(const [result,method] of [[edge,'hough'],[threshold,'threshold']])if(result?.corners){
          const q=order(result.corners),support=sideSupport(small.data,small.cols,small.rows,q);
          candidates.push({...result,corners:q,support,method,channel,verified:result.confident&&support.every(v=>v>=.6)});
        }
      }
      proposals(values,'luminance');
      if(!candidates.some(p=>p.verified)){
        // Paper and a wooden desk can have equal luminance in bad light.
        // A second view suppresses saturated background while retaining the
        // same SS Hough/Otsu algorithms; the final RGB pixels are untouched.
        const chroma=new Uint8ClampedArray(values.length),rgb=small.data;
        for(let p=0;p<values.length;p++){
          const i=p*4,high=Math.max(rgb[i],rgb[i+1],rgb[i+2]),low=Math.min(rgb[i],rgb[i+1],rgb[i+2]);
          chroma[p]=values[p]*(1-.65*(high-low)/(high+1));
        }
        proposals(chroma,'paper-color');
      }
      candidates.sort((a,b)=>Number(b.verified)-Number(a.verified)||Math.min(...b.support)-Math.min(...a.support));
      const selected=candidates[0];
      if(!selected?.corners)return {quad:null,confident:false,reason:'missing',engine:'ss-driver'};
      const quad=order(selected.corners.map(p=>({x:p.x/scale,y:p.y/scale})));
      if(!validQuad(quad,width,height))return {quad:null,confident:false,reason:'boundary',engine:'ss-driver'};
      const boundary=quad.filter(p=>p.x<3/scale||p.y<3/scale||p.x>width-4/scale||p.y>height-4/scale).length;
      const confident=!!selected.verified&&boundary===0;
      return {quad,confident,reason:boundary>=1?'boundary':confident?'detected':'uncertain',engine:'ss-driver-'+selected.method,channel:selected.channel,sideSupport:selected.support,area:area(quad)/(width*height),boundary,score:confident?1:.5};
    });
  }
  function natural(cv,rgba,width,height,quad){
    return scope(keep=>{
      const size=dimensions(quad),src=keep(cv.matFromArray(height,width,cv.CV_8UC4,rgba)),dst=keep(new cv.Mat());
      const from=keep(cv.matFromArray(4,1,cv.CV_32FC2,quad.flatMap(p=>[p.x,p.y]))),to=keep(cv.matFromArray(4,1,cv.CV_32FC2,[0,0,size.width-1,0,size.width-1,size.height-1,0,size.height-1]));
      const matrix=keep(cv.getPerspectiveTransform(from,to));
      cv.warpPerspective(src,dst,matrix,new cv.Size(size.width,size.height),cv.INTER_LANCZOS4,cv.BORDER_REPLICATE);
      return {data:new Uint8ClampedArray(dst.data),...size};
    });
  }
  function normalizeColor(cv,image){
    // Same edge-preserving paper estimator as native Android. Closing removes
    // narrow ink from the background map; median filtering retains sharp fold
    // shadows. Filled coloured panels receive one exposure gain, preserving hue.
    // The original RGB pixels are corrected in bounded 128-row tiles.
    const {width,height,data}=image,owned=new Set();
    const keep=value=>{owned.add(value);return value;};
    const release=value=>{if(owned.delete(value))value.delete();};
    try{
      const rgba=keep(cv.matFromArray(height,width,cv.CV_8UC4,data)),rgb=keep(new cv.Mat());
      cv.cvtColor(rgba,rgb,cv.COLOR_RGBA2RGB);release(rgba);
      const scale=Math.min(1,1024/Math.max(width,height));
      const sw=Math.max(1,Math.round(width*scale)),sh=Math.max(1,Math.round(height*scale));
      const small=keep(new cv.Mat());
      cv.resize(rgb,small,new cv.Size(sw,sh),0,0,cv.INTER_AREA);
      const element=keep(cv.getStructuringElement(cv.MORPH_RECT,new cv.Size(7,7)));
      const paper=keep(new cv.Mat()),background=keep(new cv.Mat());
      cv.morphologyEx(small,paper,cv.MORPH_CLOSE,element,new cv.Point(-1,-1),1,cv.BORDER_REPLICATE,cv.morphologyDefaultBorderValue());
      cv.medianBlur(paper,background,7);
      const gains=keep(new cv.Mat(sh,sw,cv.CV_32FC3)),values=gains.data32F,bg=background.data;
      const histogram=new Uint32Array(256);let neutral=0;
      for(let i=0;i<bg.length;i+=3){
        const high=Math.max(bg[i],bg[i+1],bg[i+2]),low=Math.min(bg[i],bg[i+1],bg[i+2]);
        if((high-low)/Math.max(high,1)<.30){histogram[high]++;neutral++;}
      }
      let reference=250;
      if(neutral){let count=0;for(let v=0;v<256;v++){count+=histogram[v];if(count>=Math.ceil(neutral*.90)){reference=v;break;}}}
      const exposure=Math.max(.65,Math.min(4,.98*255/Math.max(reference,1)));
      for(let i=0;i<bg.length;i+=3){
        const high=Math.max(bg[i],bg[i+1],bg[i+2]),low=Math.min(bg[i],bg[i+1],bg[i+2]);
        const protection=Math.max(0,Math.min(1,((high-low)/Math.max(high,1)-.30)/.20));
        for(let c=0;c<3;c++)values[i+c]=Math.max(.65,Math.min(4,(1-protection)*.98/Math.max(bg[i+c]/255,.08)+protection*exposure));
      }
      release(background);release(paper);release(element);release(small);
      const normalized=keep(new cv.Mat(height,width,cv.CV_8UC3));
      const gainTile=keep(new cv.Mat()),floatTile=keep(new cv.Mat());
      const transform=keep(cv.matFromArray(2,3,cv.CV_64F,[sw/width,0,.5*sw/width-.5,0,sh/height,.5*sh/height-.5]));
      for(let y=0;y<height;y+=128){
        const rows=Math.min(128,height-y);transform.data64F[5]=(y+.5)*sh/height-.5;
        cv.warpAffine(gains,gainTile,transform,new cv.Size(width,rows),cv.INTER_LINEAR|cv.WARP_INVERSE_MAP,cv.BORDER_REPLICATE,new cv.Scalar());
        const source=keep(rgb.roi(new cv.Rect(0,y,width,rows))),target=keep(normalized.roi(new cv.Rect(0,y,width,rows)));
        source.convertTo(floatTile,cv.CV_32FC3);
        cv.multiply(floatTile,gainTile,floatTile,1,cv.CV_32F);
        floatTile.convertTo(target,cv.CV_8UC3);release(target);release(source);
      }
      release(transform);release(floatTile);release(gainTile);release(gains);release(rgb);
      const lab=keep(new cv.Mat());cv.cvtColor(normalized,lab,cv.COLOR_RGB2Lab);release(normalized);
      const luminance=keep(new cv.Mat(height,width,cv.CV_8UC1)),local=keep(new cv.Mat()),mixed=keep(new cv.Mat());
      const clahe=keep(new cv.CLAHE(1.4,new cv.Size(8,8)));
      // This reviewed OpenCV.js build does not bind extract/insertChannel.
      // Copy only L; a and b remain byte-for-byte unchanged in the Lab Mat.
      for(let i=0;i<luminance.data.length;i++)luminance.data[i]=lab.data[i*3];
      clahe.apply(luminance,local);cv.addWeighted(luminance,.8,local,.2,0,mixed);
      for(let i=0;i<mixed.data.length;i++)lab.data[i*3]=mixed.data[i];
      release(clahe);release(mixed);release(local);release(luminance);
      const color=keep(new cv.Mat());cv.cvtColor(lab,color,cv.COLOR_Lab2RGB);release(lab);
      const blurred=keep(new cv.Mat()),sharp=keep(new cv.Mat());
      cv.GaussianBlur(color,blurred,new cv.Size(0,0),.8,.8,cv.BORDER_REPLICATE);
      cv.addWeighted(color,1.25,blurred,-.25,0,sharp);release(blurred);release(color);
      const output=keep(new cv.Mat());cv.cvtColor(sharp,output,cv.COLOR_RGB2RGBA);release(sharp);
      return {data:new Uint8ClampedArray(output.data),width,height};
    }finally{for(const value of [...owned].reverse())value.delete();}
  }
  function process(cv,rgba,width,height,quad,mode='color',options={refine:false}){
    if(!validQuad(quad,width,height))throw new Error('Ustaw cztery rogi kartki w kolejności. Obrys nie może się przecinać.');
    if(!core)throw new Error('Brakuje silnika dokumentów SS. Zaktualizuj aplikację.');
    const geometry=options?.refine===true?refineQuad(rgba,width,height,quad,options.aiOutline===true):{quad:quad.map(p=>({...p})),refined:false};
    const cropped=natural(cv,rgba,width,height,geometry.quad);
    const result=mode==='natural'?cropped:normalizeColor(cv,cropped);
    return {...result,version:VERSION,mode:mode==='natural'?'natural':'color',quad:geometry.quad,refined:geometry.refined,sourceEngine:core.sourceCommit,
      enhancementEngine:mode==='natural'?'none':'opencv-paper-background-v2'};
  }
  return {VERSION,MAX_EDGE,MAX_PIXELS,order,area,validQuad,dimensions,detect,process};
});
