/* Edition 32: twenty-four individual transparent creatures, loaded before game boot. */
'use strict';
(() => {
  const art=window.PixelStudio, data=window.PIXEL_BESTIARY32;
  if(!art||!data)return;
  const previousEnemy=art.enemy, bases=new Map(), frames=new Map();
  const flying=new Set(['flourMoth32','bogGnat32','starJelly32','encorePhantom32']);
  const surface=()=>{const c=document.createElement('canvas');c.width=c.height=256;c.pixelOrigin={width:256,x:0,y:0};c.getContext('2d').imageSmoothingEnabled=false;return c;};
  const load=([id,src])=>new Promise((resolve,reject)=>{
    const image=new Image();image.onload=()=>{
      const c=surface(),ctx=c.getContext('2d'),scale=228/Math.max(image.width,image.height),w=Math.round(image.width*scale),h=Math.round(image.height*scale);
      const left=Math.round((256-w)/2),top=242-h;
      ctx.drawImage(image,left,top,w,h);c.pixelActor=true;c.actorBounds={left,top,right:left+w,bottom:242,width:w,height:h};bases.set(id,c);resolve();
    };image.onerror=()=>reject(new Error('Edition-32-Kreatur konnte nicht geladen werden: '+id));image.src=src;
  });
  art.ready=Promise.all([art.ready,Promise.all(Object.entries(data).map(load))]);
  art.bestiary32={bases,frames};
  art.enemy=function(id,frame=0,pose='walk',hard=false,...args){
    const base=bases.get(id);if(!base)return previousEnemy(id,frame,pose,hard,...args);
    const n=((Math.floor(frame)%4)+4)%4,key=id+':'+pose+':'+n;
    if(frames.has(key))return frames.get(key);
    if(pose==='idle'&&n===0)return base;
    const c=surface(),ctx=c.getContext('2d'),inAir=flying.has(id),lift=inAir?[0,-3,-5,-2][n]:0;
    ctx.save();
    if(pose==='walk'&&!inAir){
      // The torso remains stable while alternating feet suggest movement.
      const seam=204,step=[-2,0,2,0][n];
      ctx.drawImage(base,0,seam,128,52,-step,seam-(n===0?3:0),128,52);
      ctx.drawImage(base,128,seam,128,52,128+step,seam-(n===2?3:0),128,52);
      ctx.drawImage(base,0,0,256,seam,0,0,256,seam);
    }else{
      const recoil=['attack','dash'].includes(pose)?[4,2,0,0][n]:pose==='windup'?-2:0;
      ctx.translate(128-recoil,240+lift);if(recoil)ctx.rotate(-recoil*.005);
      ctx.drawImage(base,-128,-240);
    }
    ctx.restore();
    if(pose==='hurt'){ctx.globalCompositeOperation='source-atop';ctx.fillStyle='#fff0cc88';ctx.fillRect(0,0,256,256);ctx.globalCompositeOperation='source-over';}
    c.pixelActor=true;c.actorBounds=base.actorBounds;frames.set(key,c);return c;
  };
})();
