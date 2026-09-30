/* Pixel primitives for the original effects pipeline. Curves become integer
   scanlines and stepped strokes; sprite sheets retain their authored detail. */
'use strict';
window.createPixelContext = function(native) {
  let paths=[],current=null;
  const point=(x,y)=>{const m=native.getTransform();return [m.a*x+m.c*y+m.e,m.b*x+m.d*y+m.f];};
  const begin=()=>{paths=[];current=null;};
  const move=(x,y)=>{current=[point(x,y)];paths.push(current);};
  const append=p=>{if(!current){current=[];paths.push(current);}current.push(p);};
  const line=(x,y)=>append(point(x,y));
  const close=()=>{if(current?.length)current.push(current[0]);};
  function curve(cx,cy,rx,ry,rotation,start,end,anticlockwise=false){
    let sweep=end-start;if(Math.abs(sweep)>=Math.PI*2)sweep=anticlockwise?-Math.PI*2:Math.PI*2;
    else if(anticlockwise&&sweep>0)sweep-=Math.PI*2;else if(!anticlockwise&&sweep<0)sweep+=Math.PI*2;
    const steps=Math.max(4,Math.ceil(Math.abs(sweep)*Math.max(rx,ry)/3)),co=Math.cos(rotation),si=Math.sin(rotation);
    for(let i=0;i<=steps;i++){const a=start+sweep*i/steps,x=Math.cos(a)*rx,y=Math.sin(a)*ry;line(cx+x*co-y*si,cy+x*si+y*co);}
  }
  function fill(){
    const edges=[];let lo=Infinity,hi=-Infinity;
    for(const points of paths){if(points.length<3)continue;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if(a[1]===b[1])continue;edges.push([a,b]);lo=Math.min(lo,a[1],b[1]);hi=Math.max(hi,a[1],b[1]);}}
    if(!edges.length)return;
    native.save();native.setTransform(1,0,0,1,0,0);
    for(let y=Math.max(0,Math.floor(lo));y<Math.min(native.canvas.height,Math.ceil(hi));y++){
      const hits=[];for(const [a,b]of edges)if((a[1]<=y+.5&&b[1]>y+.5)||(b[1]<=y+.5&&a[1]>y+.5))hits.push(a[0]+(y+.5-a[1])*(b[0]-a[0])/(b[1]-a[1]));
      hits.sort((a,b)=>a-b);for(let i=0;i+1<hits.length;i+=2){const l=Math.round(hits[i]),r=Math.round(hits[i+1]);if(r>l)native.fillRect(l,y,r-l,1);}
    }
    native.restore();
  }
  function stroke(){
    const m=native.getTransform(),width=Math.max(1,Math.round(native.lineWidth*Math.hypot(m.a,m.b))),brush=Math.max(1,width),dash=native.getLineDash();
    const cycle=dash.reduce((a,b)=>a+b,0),visible=distance=>{if(!cycle)return true;let t=distance%cycle;for(let i=0;i<dash.length;i++){if(t<dash[i])return i%2===0;t-=dash[i];}return true;};
    native.save();native.setTransform(1,0,0,1,0,0);native.fillStyle=native.strokeStyle;
    for(const points of paths){let distance=0;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))));
      for(let k=0;k<=steps;k++)if(visible(distance+length*k/steps)){const x=Math.round(a[0]+dx*k/steps-brush/2),y=Math.round(a[1]+dy*k/steps-brush/2);native.fillRect(x,y,brush,brush);}distance+=length;
    }}
    native.restore();
  }
  const methods={
    setTransform:(...args)=>{if(args.length===6){args[4]=Math.round(args[4]);args[5]=Math.round(args[5]);}native.setTransform(...args);},
    beginPath:begin,moveTo:move,lineTo:line,closePath:close,fill,stroke,
    arc:(x,y,r,a,b,ccw)=>curve(x,y,r,r,0,a,b,ccw),ellipse:curve,
    rect:(x,y,w,h)=>{move(x,y);line(x+w,y);line(x+w,y+h);line(x,y+h);close();},
    roundRect:(x,y,w,h)=>{move(x+2,y);line(x+w-2,y);line(x+w,y+2);line(x+w,y+h-2);line(x+w-2,y+h);line(x+2,y+h);line(x,y+h-2);line(x,y+2);close();},
    quadraticCurveTo:(cx,cy,x,y)=>{const a=current?.at(-1)||point(0,0),b=point(cx,cy),c=point(x,y);for(let i=1;i<=20;i++){const t=i/20,u=1-t;append([u*u*a[0]+2*u*t*b[0]+t*t*c[0],u*u*a[1]+2*u*t*b[1]+t*t*c[1]]);}},
    bezierCurveTo:(c1x,c1y,c2x,c2y,x,y)=>{const a=current?.at(-1)||point(0,0),b=point(c1x,c1y),c=point(c2x,c2y),d=point(x,y);for(let i=1;i<=24;i++){const t=i/24,u=1-t;append([u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t*t*t*d[0],u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t*t*t*d[1]]);}},
    fillText:(text,x,y,max)=>{
      const clean=String(text).replace(/[\p{Extended_Pictographic}\uFE0F]/gu,'');
      native.font=native.font.replace(/(?:Barlow,\s*)?Arial|sans-serif|monospace/g,'NuttyText');
      if(max===undefined)native.fillText(clean,Math.round(x),Math.round(y));else native.fillText(clean,Math.round(x),Math.round(y),max);
    }
  };
  return new Proxy(native,{get(target,key){if(methods[key])return methods[key];const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;},set(target,key,value){Reflect.set(target,key,value,target);return true;}});
};
