/* Scripted sprite theatre. Actors, projectiles and scenery remain separate layers. */
'use strict';
(()=>{
 const scenes=new Set(),art=window.PixelStudio,reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
 function mount(root){for(const figure of root.querySelectorAll('.pixel-cinema[data-scene]:not(.is-animated)')){
  const c=document.createElement('canvas');c.width=640;c.height=240;c.setAttribute('aria-hidden','true');figure.append(c);figure.classList.add('is-animated');
  const scene={figure,canvas:c,context:c.getContext('2d'),id:figure.dataset.hero||'snickers',part:figure.dataset.scene,stage:Number(figure.dataset.stage)||0,time:reduce?3:0,last:-1};scenes.add(scene);draw(scene);
 }}
 function draw(s){
  const x=s.context,t=s.time%12,part=s.part,id=s.id,duel=part.startsWith('hasenbein'),victory=part==='victory'||part==='hasenbeinVictory',defeat=part==='defeat',friend=part==='nose',heal=part==='pafti',arrival=part==='hasenbeinKarnil';
  const villain=part==='troll'?'bergTroll':part==='knoll'?'knoll':heal||part==='act2'||part==='karnil'?'karnil':part==='act1'?'cyberHasenbein':part==='ottah'||part==='plus2'?'ottah':'hasenbein';
  x.imageSmoothingEnabled=false;x.clearRect(0,0,640,240);
  const arena=art.arena(id,s.stage),pan=reduce?0:Math.sin(t*.38)*4;
  x.drawImage(arena,0,32,640,240,Math.round(pan)-8,-4,656,248);
  x.fillStyle='#06102438';x.fillRect(0,0,640,240);
  const point=(a,b,size,color,alpha=1)=>{x.globalAlpha=alpha;x.fillStyle=color;x.fillRect(Math.round(a-size/2),Math.round(b-size/2),size,size);x.globalAlpha=1;};
  const line=(ax,ay,bx,by,color,alpha=1,width=2)=>{const n=Math.ceil(Math.hypot(bx-ax,by-ay)/2);for(let i=0;i<=n;i++)point(ax+(bx-ax)*i/n,ay+(by-ay)*i/n,width,color,alpha);};
  const effect=(name,px,py,size,alpha=1,angle=0)=>{x.save();x.globalAlpha=alpha;x.translate(Math.round(px),Math.round(py));x.rotate(angle);x.drawImage(art.detail(name),-size/2,-size/2,size,size);x.restore();};
  const actor=(kind,which,px,py,size,pose='idle',flip=false,frame=0,alpha=1)=>{
   const im=kind==='hero'?art.hero(which,pose,frame):kind==='companion'?art.companion(which,frame):art.enemy(which,frame,pose);
   x.save();x.globalAlpha=.32*alpha;x.fillStyle='#071018';x.fillRect(Math.round(px-size*.23),Math.round(py-6),Math.round(size*.46),5);x.restore();
   art.draw(x,im,px,py,size,.97,flip,alpha);
  };
  const combat=!victory&&!defeat&&!friend&&!heal,melee=id==='raffzahn'&&!duel,advance=combat?(melee?170:40):0;
  const enter=ease(t/1.45),approach=ease((t-2.9)/.7),retreat=ease((t-4.55)/.9),end=ease((t-10.6)/1.4),walkFrame=Math.floor(t*11)%8;
  let left=155-(1-enter)*210+approach*advance-retreat*advance,right=480+(1-enter)*225-approach*(combat?22:0)+retreat*(combat?22:0);
  if(reduce){left=165;right=480;}
  const attacking=combat&&t>3.6&&t<4.05,hit=combat&&t>4.14&&t<4.32,counter=combat&&t>7.15&&t<7.65,heroHit=combat&&t>8.02&&t<8.19,walking=t<1.45||combat&&(t>2.9&&t<3.6||t>4.55&&t<5.45);
  const recoil=hit?Math.sin((t-4.14)/.18*Math.PI)*8:0;right+=recoil;left-=heroHit?Math.sin((t-8.02)/.17*Math.PI)*5:0;
  const heroPose=defeat?'hurt':victory?'dance':heroHit?'hurt':attacking?'attack':walking?'walk':'idle';
  if(duel){
   actor('enemy','hasenbein',left,221,156,victory?'dance':heroHit?'hurt':attacking?'attack':walking?'walk':'idle',false,walkFrame);
   if(arrival||victory){const px=330+(1-ease((t-.5)/1.2))*360;actor('enemy','karnil',px,227,190,arrival&&t<2?'walk':'idle',true,walkFrame%4);if(arrival&&t>1&&t<2.2)effect('dust',px,218,90,.7*(2.2-t));}
   actor('hero',id,right,223,126,victory?'death':hit?'hurt':counter?'attack':walking?'walk':'idle',true,walkFrame);
  }else{
   actor('hero',id,left,222,id==='koettitroeter'?158:144,heroPose,false,walkFrame);
   if(friend){actor('companion','noseFriend',right,223,150,walking?'walk':'idle',true,walkFrame%4);}
   else if(!victory){actor('enemy',villain,right,224,villain==='karnil'?187:165,defeat?'dance':hit?'hurt':counter?'attack':walking?'walk':'idle',true,walkFrame);}
   else {actor('enemy',villain,right+25,235,150,'death',true,0,.65);}
  }
  const relic={snickers:'hazelnut',raffzahn:'clock',krustenbraten:'duden',slanny:'crownNut',koettitroeter:'command-horn'}[id]||'hazelnut';
  if(!friend&&!defeat&&!heal&&!duel){const stolen=!victory;const px=stolen?right-31:left+37,py=stolen?193:191;art.draw(x,art.icon(relic),px,py,23,.5);}
  if(heal){
   const px=370-(1-ease((t-1.6)/.6))*90;actor('enemy','pafti',px,183,92,t>2.2&&t<5?'attack':'idle',false,Math.floor(t*6)%4);
   if(t>2.3&&t<5.1){const a=Math.sin((t-2.3)/2.8*Math.PI);for(let j=0;j<3;j++)line(px+20,145,right-35,145+Math.sin(t*11+j)*10,['#ad99f0','#d9c1ff','#fff0b0'][j],a*.7,2);for(let j=0;j<5;j++){const q=(t*.7+j*.18)%1;point(right-34+(j%3)*25,200-q*128,4,'#b9efb2',a*(1-q));}}
  }else if(friend){
   if(t>2.5){for(let j=0;j<3;j++){const q=(t*.34+j*.33)%1;art.draw(x,art.icon('health'),290+j*24,161-q*62,19,.5,false,(1-q)*.8);}}
  }else if(victory){
   for(let j=0;j<20;j++){const q=(t*.22+j*.079)%1;point(80+(j*73)%480,18+q*205,3,['#ffdb7c','#93dbcd','#e89aac'][j%3],.8);}
   if(!duel)art.draw(x,art.icon('crownNut'),left,63+(reduce?0:Math.sin(t*2.2)*4),52,.5);
  }else if(!defeat&&t>3.6&&t<4.5){
   const q=clamp((t-3.6)/.65,0,1),px=left+50+(right-left-85)*q,py=158-Math.sin(q*Math.PI)*24;
   if(duel)effect('carrot-dart',px,py,30);
   else if(id==='snickers'){effect('hazelnut',px,py,25,1,t*9);if(t<3.78)effect('muzzle',left+68,163,37);}
   else if(id==='raffzahn'){effect('rat-slash',left+55+q*32,158,108,Math.sin(q*Math.PI)*.8+.2,-.5+q);}
   else if(id==='krustenbraten'){effect('pan-impact',right-25,199,88,1-q*.7);effect('ember-burst',right-25,183,54,1-q*.7);}
   else if(id==='slanny')effect('carrot-blade',px,py,34,1,t*8);
   else effect('horn-wave',px,162,65+q*35,1-q*.3);
   if(q>.86)effect('impact',right-15,160,60,(1-q)*6);
  }
  // A delayed reply makes the encounter read as an exchange rather than a looped pose.
  if(combat&&t>7.5&&t<8.2){
   const q=clamp((t-7.5)/.6,0,1),px=right-45-(right-left-95)*q,py=160-Math.sin(q*Math.PI)*13;
   const projectile=duel?({snickers:'hazelnut',raffzahn:'rat-slash',krustenbraten:'pan-impact',slanny:'carrot-blade',koettitroeter:'horn-wave'}[id]):villain==='karnil'?'boulder':villain==='cyberHasenbein'?'electric-burst':'carrot-dart';
   if(q<1)effect(projectile,px,py,projectile==='boulder'?41:29,1,Math.PI);
   if(heroHit)effect('impact',left+18,163,51,.85);
  }
  if(walking&&!reduce){for(const px of [left-30,right+30])effect('dust',px,220,34,.3);}
  // Sparse drifting motes keep the scene alive between narrative beats.
  for(let j=0;j<9;j++){const q=(t*.07+j*.117)%1;point(28+j*71+Math.sin(t+j)*8,188-q*145,2,j%2?'#9fdbcf':'#ffe1a0',.25);}
  x.fillStyle='#07111b';x.fillRect(0,0,640,5);x.fillRect(0,233,640,7);x.fillStyle='#e4bd75';x.fillRect(0,5,640,1);x.fillRect(0,232,640,1);
  if(end>0){x.fillStyle=`rgba(8,17,28,${Math.sin(end*Math.PI)*.18})`;x.fillRect(0,0,640,240);}
  s.figure.dataset.beat=friend?'friendship':victory?'celebration':heal?'healing':attacking?'attack':walking?'approach':'standoff';
 }
 function tick(dt){for(const s of scenes){if(!s.figure.isConnected){scenes.delete(s);continue;}if(document.hidden||s.figure.closest('.hidden'))continue;if(!reduce)s.time+=Math.min(dt,.05);const f=Math.floor(s.time*18);if(f!==s.last){draw(s);s.last=f;}}}
 window.PixelCinema={mount,tick,draw,get active(){return scenes.size;}};
})();
