/* Eight authored walk/attack sheets; embedded data also works over file://. */
'use strict';
(() => {
  const art=window.PixelStudio,data=window.PIXEL_BESTIARY33,sheets=window.PIXEL_ANIMATIONS33;
  if(!art||!data)return;
  const previousEnemy=art.enemy,bases=new Map(),frames=new Map(),animations=new Map();
  const surface=(w=256,h=w)=>{const c=document.createElement('canvas');c.width=w;c.height=h;c.pixelOrigin={width:256,x:0,y:0};c.getContext('2d').imageSmoothingEnabled=false;return c;};
  const load=([id,src],animated=false)=>new Promise(resolve=>{
    const image=new Image();image.onload=()=>{
      if(animated){
        const regions=window.PIXEL_ANIM_LAYOUT33?.[id];
        if(!regions||regions.length!==8){console.warn('Animationsausschnitte fehlen:',id);resolve();return;}
        const cells=regions.map(([left,top,width,height])=>({b:{left,top,width,height}}));
        // One common scale for all poses. Independent fitting would make a
        // crouching enemy grow and a raised weapon shrink its entire body.
        const scale=Math.min(228/Math.max(...cells.map(f=>f.b.width)),218/Math.max(...cells.map(f=>f.b.height)));
        const sprites=cells.map(({b})=>{const c=surface(),x=c.getContext('2d'),w=Math.round(b.width*scale),h=Math.round(b.height*scale),left=Math.round((256-w)/2),top=244-h;
          x.drawImage(image,b.left,b.top,b.width,b.height,left,top,w,h);c.pixelActor=true;c.actorBounds={left,top,right:left+w,bottom:244,width:w,height:h};return c;});
        animations.set(id,sprites);
      }else{
        const c=surface(),ctx=c.getContext('2d'),scale=228/Math.max(image.width,image.height),w=Math.round(image.width*scale),h=Math.round(image.height*scale),left=Math.round((256-w)/2),top=244-h;
        ctx.drawImage(image,left,top,w,h);c.pixelActor=true;c.actorBounds={left,top,right:left+w,bottom:244,width:w,height:h};bases.set(id,c);
      }
      resolve();
    };
    image.onerror=()=>{console.warn('Edition-33-Grafik nicht geladen:',id,animated?'Animation':'Porträt');resolve();};image.src=src;
  });
  art.ready=Promise.all([art.ready,Promise.all(Object.entries(data).map(row=>load(row))),Promise.all(Object.entries(sheets||{}).map(row=>load(row,true)))]);
  art.bestiary33={bases,frames,animations};
  art.enemy=function(id,frame=0,pose='walk',hard=false,...args){
    const base=bases.get(id);if(!base)return previousEnemy(id,frame,pose,hard,...args);
    const n=((Math.floor(frame)%4)+4)%4,strip=animations.get(id);
    const index=pose==='windup'?4+Math.min(1,n):pose==='attack'?4+n:pose==='dash'?6:pose==='idle'?0:n;
    const sprite=strip?.[index]||base;if(pose!=='hurt')return sprite;
    const key=id+':hurt:'+n;if(frames.has(key))return frames.get(key);
    const c=surface(),ctx=c.getContext('2d');ctx.drawImage(sprite,0,0);ctx.globalCompositeOperation='source-atop';ctx.fillStyle='#fff0cc72';ctx.fillRect(0,0,256,256);
    c.pixelActor=true;c.actorBounds=sprite.actorBounds;frames.set(key,c);return c;
  };
})();
