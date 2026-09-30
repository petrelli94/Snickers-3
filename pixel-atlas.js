/* Edition 20: authored sprite sheets, fixed pixel grid, shared animation anchors. */
'use strict';
(() => {
  const art = window.PixelStudio, definitions = window.PIXEL_ATLAS_MANIFEST || {};
  if (!art) return;
  const original = {...art}, images = new Map(), frames = new Map(), urls = new Map();
  const skinIds = ['classic','normal0','normal1','normal2','hard0','hard1','hard2','endless50','endless100','hard50','hard100','impossible0','impossible1','impossible2','impossibleEndless10','impossibleEndless50','impossibleEndless100','hasenbeinVictor','superSaiyajin'];
  const create = (w,h=w) => { const c = document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').imageSmoothingEnabled=false; return c; };
  const load = ([name,def]) => new Promise(resolve => {
    const img = new Image(); img.onload=()=>{ images.set(name,img); resolve(); };
    img.onerror=()=>{ console.error('Sprite sheet could not load: '+def.file); resolve(); };
    img.src=window.PIXEL_OFFLINE_ATLASES?.[name]||'assets/pixel/edition18/'+def.file;
  });
  art.ready = (async()=>{
    if(location.protocol==='file:'||document.querySelector('meta[name="snickers-art"][content="embedded"]'))await new Promise(resolve=>{const s=document.createElement('script');s.src='assets/pixel/edition18/offline-atlases.js';s.onload=resolve;s.onerror=resolve;document.head.appendChild(s);});
    await Promise.all(Object.entries(definitions).map(load));
  })();
  art.atlas = {definitions,images,frames,skinIds};

  function sprite(sheet,index,size=128) {
    const key=`sheet:${sheet}:${index}:${size}`;
    if (frames.has(key)) return frames.get(key);
    const img=images.get(sheet),def=definitions[sheet],rect=def?.rects[index];
    if (!img || !rect) return null;
    const c=create(size),x=c.getContext('2d');
    const [sx,sy,sw,sh]=rect, factor=(def.packed?size:size-12)/Math.max(sw,sh),w=Math.round(sw*factor),h=Math.round(sh*factor);
    // Transparent margin is part of the sprite, never part of its world-space anchor.
    x.drawImage(img,sx,sy,sw,sh,Math.round((size-w)/2),def.packed?0:size-5-h,w,h);
    c.pixelOrigin={width:size,x:0,y:0};
    frames.set(key,c); return c;
  }
  function posed(base,key,pose,frame) {
    if (!base) return null;
    if (pose==='idle' && !frame) return base;
    if (frames.has(key)) return frames.get(key);
    const c=create(base.width),x=c.getContext('2d'),n=frame%6;
    if (pose==='death') { x.translate(64,74); x.rotate(-Math.PI/2); x.drawImage(base,-48,-48,96,96); }
    else {
      const authored=key.includes(':authored:');
      const lift=pose==='walk'&&!authored?[0,-1,-2,0,-1,1][n]:pose==='dance'?[0,-5,-2,-5,0,-2][n]:pose==='idle'&&n===3?-1:0;
      x.save();
      if(pose==='walk'&&!authored){
        // Rigid torso, separate alternating feet: no stretching, scale change or whole-body wobble.
        const b=opaqueBounds(base),seam=b.bottom-Math.round(b.height*.19),middle=Math.round((b.left+b.right)/2),step=[-1,0,1,1,0,-1][n],liftA=[0,1,2,1,0,0][n],liftB=[1,0,0,0,1,2][n];
        x.drawImage(base,0,seam,middle,base.height-seam,-step,seam-liftA,middle,base.height-seam);
        x.drawImage(base,middle,seam,base.width-middle,base.height-seam,middle+step,seam-liftB,base.width-middle,base.height-seam);
        x.drawImage(base,0,0,base.width,seam+3,0,0,base.width,seam+3);
      }else{
        const recoil=pose==='attack'?[3,2,1,0,0,0][n]:pose==='dash'?4:0;
        x.translate(64-recoil,118+lift);if(pose==='attack'||pose==='dash')x.rotate((pose==='dash'?.05:-.018*recoil));
        x.drawImage(base,-64,-118);
      }
      x.restore();
      if (pose==='hurt') { x.globalCompositeOperation='source-atop';x.fillStyle='#ffe6c280';x.fillRect(0,0,c.width,c.height);x.globalCompositeOperation='source-over'; }
      if (pose==='special') { x.fillStyle='#ffdf8f';for(const [a,b]of [[9,42],[112,22],[103,82]]){x.fillRect(a,b+n*2,2,8);x.fillRect(a-3,b+3+n*2,8,2);} }
    }
    c.pixelOrigin=base.pixelOrigin;frames.set(key,c);return c;
  }
  // A common foot anchor and body height prevent front/back art from growing.
  const boundsCache=new WeakMap(),depthCache=new WeakMap();
  function opaqueBounds(c){if(boundsCache.has(c))return boundsCache.get(c);const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let left=c.width,top=c.height,right=0,bottom=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4+3]>128){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}const b={left,top,right,bottom,height:bottom-top+1,width:right-left+1};boundsCache.set(c,b);return b;}
  function directionalScale(base,reference,key){if(!base||!reference)return base;const k='body-scale23:'+key;if(frames.has(k))return frames.get(k);const b=opaqueBounds(base),r=opaqueBounds(reference),factor=r.height/b.height,c=create(128),x=c.getContext('2d');const w=Math.round(b.width*factor),h=r.height;x.drawImage(base,b.left,b.top,b.width,b.height,Math.round(64-w/2),r.bottom-h+1,w,h);c.pixelOrigin=base.pixelOrigin;frames.set(k,c);return c;}
  function actorDepth(base){if(!base)return base;if(depthCache.has(base))return depthCache.get(base);const c=create(base.width),x=c.getContext('2d');x.drawImage(base,0,0);const b=opaqueBounds(base),pixels=x.getImageData(0,0,c.width,c.height),d=pixels.data;for(let y=b.top;y<=b.bottom;y++)for(let xx=b.left;xx<=b.right;xx++){const q=(y*c.width+xx)*4;if(!d[q+3])continue;const vertical=Math.floor((y-b.top)/Math.max(1,b.height)*5)/4,horizontal=(xx-b.left)/Math.max(1,b.width);const shade=1.045-.105*vertical-.055*horizontal;d[q]=Math.min(255,Math.round(d[q]*shade));d[q+1]=Math.min(255,Math.round(d[q+1]*shade));d[q+2]=Math.min(255,Math.round(d[q+2]*(shade+.015)));}x.putImageData(pixels,0,0);c.pixelOrigin=base.pixelOrigin;c.pixelActor=true;c.actorBounds=b;depthCache.set(base,c);return c;}
  // Eye anchors live in the sprite's own 128px coordinates, before posing/mirroring.
  const actionEyes = {
    snickers:[[73,69],[77,69],[78,69],[54,70]],
    raffzahn:[[75,55],[86,65],[90,66],[81,67]],
    krustenbraten:[[55,52],[66,60],[72,62],[84,65]],
    slanny:[[72,64],[78,67],[80,68],[64,63]],
    koettitroeter:[[64,66],[72,73],[75,74],[68,72]]
  };
  const costumeEyes = {
    snickers:[[75,70],[79,70],[62,65],[64,69],[62,66],[70,69],[71,65],[69,68],[70,69],[68,66],[75,71],[73,68],[70,70],[74,69],[69,66],[76,67],[71,66],[69,72],[68,67]],
    raffzahn:[[76,55],[76,52],[76,53],[78,51],[83,52],[77,51],[80,53],[80,50],[82,56],[82,49],[77,55],[81,55],[83,51],[82,49],[84,54],[80,55],[84,52],[84,53],[84,55]],
    krustenbraten:[[55,52],[57,65],[55,66],[60,66],[63,68],[61,67],[61,69],[62,65],[68,68],[68,67],[65,69],[69,69],[72,70],[75,68],[71,68],[64,68],[65,70],[68,71],[62,70]],
    slanny:[[72,64],[76,65],[70,64],[76,67],[76,65],[77,61],[77,61],[78,61],[80,62],[82,61],[79,63],[80,64],[84,65],[83,63],[80,63],[81,62],[81,63],[81,67],[77,68]],
    koettitroeter:[[64,66],[65,63],[64,59],[63,61],[65,62],[65,62],[65,62],[66,62],[69,62],[75,64],[76,64],[71,63],[78,65],[76,60],[73,64],[65,60],[70,62],[73,62],[64,62]]
  };
  const motionEyes={
    snickers:[[73,59],[78,58],[81,57],[78,55],[77,56],[78,57],[71,62]],
    raffzahn:[[75,61],[85,65],[85,69],[86,67],[81,66],[84,69],[78,70]],
    krustenbraten:[[62,60],[67,63],[71,64],[67,61],[67,63],[70,64],[76,63]],
    slanny:[[75,62],[85,65],[82,65],[85,66],[83,64],[84,66],[74,58]],
    koettitroeter:[[78,50],[82,55],[80,52],[80,51],[81,54],[80,52],[77,65]]
  };
  function madelEyes(base,id,row,si,authored=false,cycle=false) {
    const key=`madel:${id}:${si}:${row}:${authored}:${cycle}`;if(frames.has(key))return frames.get(key);
    const c=create(128),x=c.getContext('2d');x.drawImage(base,0,0);
    const [hintX,hintY]=(cycle?[[84,67],[85,67],[84,68],[86,66],[86,67],[84,67],[85,68],[86,68],[84,65],[84,67],[84,72],[95,77]][row]:si>0?costumeEyes[id][si]:authored?motionEyes[id][row]:actionEyes[id][row]);
    const pixels=x.getImageData(0,0,128,128),d=pixels.data;
    const light=(a,b)=>{const q=(b*128+a)*4;return d[q+3]>128?(d[q]*.3+d[q+1]*.59+d[q+2]*.11):0;};
    let ex=hintX,ey=hintY,best=-Infinity;
    // Snap a hand-placed facial landmark to the dark pupil surrounded by lighter fur.
    for(let b=hintY-5;b<=hintY+5;b++)for(let a=hintX-5;a<=hintX+5;a++){
      const dark=light(a,b);if(dark>105||d[(b*128+a)*4+3]<128)continue;
      const ring=[[3,0],[-3,0],[0,3],[0,-3],[2,2],[-2,2],[2,-2],[-2,-2]].reduce((s,[u,v])=>s+light(a+u,b+v),0)/8;
      const score=ring-dark-Math.hypot(a-hintX,b-hintY)*6;
      if(score>best){best=score;ex=a;ey=b;}
    }
    // Recolour the pupil pixels only, retaining the artwork's own eyelid and contour.
    for(let b=ey-1;b<=ey+1;b++)for(let a=ex-1;a<=ex+1;a++)if(light(a,b)<115){const q=(b*128+a)*4;d[q]=255;d[q+1]=53;d[q+2]=76;}
    const glint=(ey*128+ex)*4;d[glint]=255;d[glint+1]=204;d[glint+2]=163;
    x.putImageData(pixels,0,0);c.pixelOrigin=base.pixelOrigin;frames.set(key,c);return c;
  }
  art.hero = (id,pose='idle',frame=0,skin='classic',madel=false,facing='right') => {
    if((facing==='up'||facing==='down')&&images.has('wardrobe-'+id+'-'+facing)&&!['dance','death'].includes(pose)){
      const si=Math.max(0,skinIds.indexOf(skin.split('__').pop())),column=art.heroIds.indexOf(id),reference=si>0?sprite('skins-'+id,si):id==='snickers'?sprite('snickers-cycle',8):sprite('heroes-motion',column);
      const base=directionalScale(sprite('wardrobe-'+id+'-'+facing,si),reference,id+':costume24:'+si+':'+facing);
      return posed(base,`wardrobe24:${id}:${si}:${facing}:${pose}:${frame%6}`,pose,frame);
    }
    const column=art.heroIds.indexOf(id),template=skin.split('__').pop(),si=skinIds.indexOf(template);
    if (column<0) return original.hero(id,pose,frame,skin);
    const cycle=id==='snickers'&&si<=0&&images.has('snickers-cycle');
    if(cycle){const row=pose==='walk'?frame%8:pose==='attack'||pose==='special'?9:pose==='hurt'?10:pose==='dash'?11:8;let base=sprite('snickers-cycle',row);if(madel&&pose!=='death')base=madelEyes(base,id,row,si,true,true);return posed(base,`hero:snickers:cycle:authored:${pose}:${frame%8}:${Boolean(madel)}`,pose,frame);}
    const authored=si<=0&&images.has('heroes-motion');
    const row=authored?(pose==='walk'?[1,2,3,4,5,3][frame%6]:pose==='attack'||pose==='special'?6:pose==='dash'?2:0):(pose==='walk'?(frame%2?2:1):pose==='attack'?3:0);
    let base=si>0?sprite('skins-'+id,si):sprite(authored?'heroes-motion':'heroes',row*5+column);
    if(base&&madel&&pose!=='death')base=madelEyes(base,id,row,si,authored);
    return posed(base,`hero:${id}:${template}:${authored?'authored:':''}${pose}:${frame%6}:${Boolean(madel)}`,pose,frame)||original.hero(id,pose,frame,skin);
  };
  const find = (name,id) => definitions[name]?.ids.indexOf(id) ?? -1;
  art.portrait=id=>sprite('portraits',find('portraits',id),256)||art.hero(id);
  art.enemy = (id,frame=0,pose='walk',hard=false,facing='right') => {
    const row25=find('enemies25',id+'-0');if(row25>=0){const col=['attack','windup','dash'].includes(pose)?3:pose==='walk'?1+frame%2:0;return posed(sprite('enemies25',row25+col),`enemy25:${id}:authored:${pose}:${frame%4}`,pose,frame);}
    const row24=find('enemies24',id+'-0');if(row24>=0){const col=['attack','windup','dash'].includes(pose)?3:pose==='walk'?1+frame%2:0;return posed(sprite('enemies24',row24+col),`enemy24:${id}:authored:${pose}:${frame%4}`,pose,frame);}
    if(id==='herbert'&&images.has('herbert24'))return sprite('herbert24',pose==='hurt'?10:pose==='attack'?4:pose==='walk'?1+frame%2:pose==='dance'?11:0);

    if(id==='hasenbein'&&(facing==='up'||facing==='down')&&images.has('hasenbein-directions')&&!['death','dance'].includes(pose)){const step=pose==='walk'?[0,1,0,2][frame%4]:0,index=(facing==='up'?3:0)+step;return posed(directionalScale(sprite('hasenbein-directions',index),sprite('hasenbein-cycle',8),'hasenbein:'+index),`hasenbein-direction:${facing}:authored:${pose}:${frame%4}`,pose,frame);}
    const guardian=['badger','toad','beetle'].indexOf(id);if(guardian>=0&&images.has('guardians')){const col=pose==='walk'?1+frame%2:['attack','windup','dash'].includes(pose)?3:0;return posed(sprite('guardians',guardian*4+col),`guardian:${id}:authored:${pose}:${frame%4}`,pose,frame);}
    if(id==='hasenbein'&&images.has('hasenbein-cycle')){
      const row=pose==='walk'?frame%8:pose==='attack'?9:pose==='windup'?10:pose==='dash'?11:8;
      return posed(sprite('hasenbein-cycle',row),`enemy:hasenbein:authored:${pose}:${frame%8}`,pose,frame);
    }
    const motionColumn=find('rabbits-motion',id),authored=motionColumn>=0;
    const sheet=authored?'rabbits-motion':['ottah','bosses','enemies-a','enemies-b'].find(n=>find(n,id)>=0),row=pose==='walk'?1+frame%4:pose==='attack'?5:0,index=authored?row*4+motionColumn:sheet?find(sheet,id):-1;
    let base=index>=0?sprite(sheet,index):null;
    if(base&&hard){const key='hard:'+id+':'+index;if(frames.has(key))base=frames.get(key);else{const c=create(128),x=c.getContext('2d');x.drawImage(base,0,0);x.globalCompositeOperation='source-atop';x.fillStyle='#941c2e25';x.fillRect(0,0,128,128);frames.set(key,c);base=c;}}
    return posed(base,`enemy:${id}:${authored?'authored:':''}${frame%4}:${pose}:${hard}`,pose,frame)||original.enemy(id,frame,pose,hard);
  };
  art.companion = (id,frame=0,facing='right',pose='walk') => {
    const first24=find('cast24',id+'-0');if(first24>=0){const col=pose==='attack'?3:pose==='walk'?1+frame%2:0;return posed(sprite('cast24',first24+col),`companion24:${id}:authored:${pose}:${frame%4}`,pose,frame);}

    const sheet=['companion-a','companion-b','companion-c','companion-d'].find(n=>find(n,id+'-0')>=0&&images.has(n));
    if(sheet){const vertical=facing==='down'||facing==='up',first=find(sheet,id+'-0'),index=first+(facing==='down'?0:facing==='up'?1:2+(pose==='walk'?frame%2:0));return posed(sprite(sheet,index),`companion:${id}:${facing}:${vertical?'weighted':'authored'}:${pose}:${frame%4}`,pose,frame);}
    return posed(id==='narrath'?sprite('narrath',0):sprite('companions',find('companions',id)),`companion:${id}:${frame%4}`,'walk',frame)||original.companion(id,frame);
  };
  for(const kind of ['hero','enemy','companion']){const drawActor=art[kind];art[kind]=(...args)=>actorDepth(drawActor(...args));}
  const drawOriginal=art.draw;
  art.draw=(c,img,x,y,w=72,anchor=.82,flip=false,alpha=1)=>{if(img?.pixelActor){const b=img.actorBounds,unit=w/img.width,foot=y+(b.bottom-img.width*anchor)*unit,half=Math.max(7,Math.min(w*.3,b.width*unit*.40));c.save();c.globalAlpha*=alpha;for(const [scale,height,color]of [[1.22,5,'#07131f20'],[1,4,'#07131f38'],[.65,2,'#07131f45']]){c.fillStyle=color;for(let j=-height;j<=height;j+=2){const rx=half*scale*Math.sqrt(Math.max(0,1-(j/height)**2));c.fillRect(Math.round(x-rx),Math.round(foot+j),Math.round(rx*2),2);}}c.restore();}drawOriginal(c,img,x,y,w,anchor,flip,alpha);};

  art.projectile26=(id,frame=0)=>sprite('attacks26',find('attacks26',id+'-'+(frame%4)),64);
  art.fan24=(id,frame=0)=>actorDepth(sprite('fans24',id*4+frame));
  art.car24=(frame=0)=>actorDepth(sprite('cast24',20+frame%4));
  art.singer24=(frame=0)=>actorDepth(sprite('herbert24',frame));
  const categories = [
    [/health|heart|regen|vampire|reserve|doctor|life|broth|tough|endurance/i,'health'],
    [/shield|barrier|shell|fur|guard|armor|fortif|bunker|plating|defiance/i,'barrier'],
    [/frost|ice|freeze/i,'freeze'], [/fireRate|rapid|haste|speed|turbo|dash|reflex|adrenaline|dodge/i,'haste'],
    [/laser|rail|blaster|gatling|cannon|gun|arsenal|salvo|crossfire/i,'walnutCannon'],
    [/bomb|mortar|nova|rocket|comet|meteor/i,'nutBomb'], [/crown|royal|golden|spark|star|legend|sun/i,'crownNut'],
    [/carrot|leaf|garden|season|harvest|roots/i,'carrotCyclone'], [/ammo|satchel|supply|cache|postbox|larder|scaveng/i,'ammo'],
    [/clock|time|chrono|cool|afterHour/i,'clock'], [/tesla|storm|thunder|chain|reactor|electric/i,'stormJar'],
    [/poison|fart|vape|slime|diarrhea|rot|pocken|berserk|madel/i,'diarrheaSling'],
    [/book|duden|ledger|index|chronicle|command|council|tax/i,'duden'], [/sausage|pig|pork|meat|brat/i,'sausageMortar'],
    [/cream|puff|crumb|bread|snack|krokette|pretzel|goulash|candy/i,'regen'],
    [/orbit|singular|gravit|void|dimension|magnet|homing/i,'singularity'],
    [/sword|cleft|fang|bite|pierc|crit|execution|sharp|drill/i,'nutDrill'], [/coin|score|jackpot|luck|compass|power/i,'jackpot']
  ];
  // The named oddities keep their own motif; statistic upgrades share a readable family.
  const iconAliases = {
    ratWhistle:'rat-hole',pigPan:'pig-oven',carrotCyclone:'vine-bloom',trollFanfare:'brass-resonator',bingoMaster:'olangolil',brunoOperation:'brunoStanding',noseFriendship:'noseFriend',
    rabbitCleft:'bossBane',hunnaExpert:'spread',nutFan:'spread',rearNut:'spread',hotChamber:'overclock',
    power:'giantNut',bombs:'ammo',orbit:'eichelkopf',waveRenew:'regen',specialCore:'phaseCapacitor',
    hotPaws:'ngHareLaces',hunter:'bossBane',hamsterTwister:'orbitSaw',unknofMachine:'creamCompressor',
    annihilator:'giantNut',turretVolley:'nutSentry',deathBurst:'splinterStorm',ricochet:'peanutBoomerang',
    cheeseInsurance:'barrier',recallService:'ammo',ngFlicker:'phase',ngAcornBarrage:'spread',
    ngPouchRunner:'corffelsBag',nuclearSentry:'nutSentry',ng2Pulse:'bossBane',ng2VictoryTeeth:'bossBane',
    ng2IronEncore:'steelMuzzle',ng2BattleRhythm:'warDrums',survivalInstinct:'health',nightShift:'overclock',
    endlessCourier:'corffelsBag',endlessBloodMoon:'bossBane',endlessSwarm:'bee',endlessPicket:'pigPatrol',
    endlessSurge:'overclock',endlessRadar:'carrotDrone',boomerangMaster:'walnutCannon',savageCore:'phaseCapacitor',
    recoilEngine:'creamCompressor',fleaHop:'ngHareLaces',echoPelts:'phaseCapacitor',tidalNut:'doubleShot',
    pigHose:'pigPan',fartBottle:'stormJar',pockenstrombose:'nutTesla',krokette:'pretzelSling',
    meatUnbopper:'steelMuzzle',rabbitCommand:'bossBane',professorCouncil:'narrath',
    ammoScrounger:'corffelsBag',pocketDimension:'corffelsBag',bottomlessSatchel:'corffelsBag',
    scavenger:'corffelsBag',scavengerPulse:'magnet',ammoForge:'ammo',supplyPlan:'beagle',
    ngGardenEcho:'spread',nutstorm:'spread',ng2Crossfire:'spread',ng2LastSnack:'snickersBar',
    breadHalo:'pretzelSling',endlessHarvest:'regen',afterHours:'liquidCourage',
    ghostFur:'phase',hyperFur:'ngHareLaces',chronoFur:'clock',sharpDentist:'bossBane',
    executioner:'bossBane',royalReactor:'phaseCapacitor',powerCondenser:'phaseCapacitor'
  };
  Object.assign(iconAliases,{"e24Steppke": "e24Knallfrosch", "e24Gegenwind": "e24Schalenalarm", "e24Kanaladel": "e24Mullewapp", "e24Enterbte": "e24Backentaschenbrief", "e24Bodenversicherung": "e24AmtlicheKrume", "e24PanierteGeduld": "e24KrustenRand", "e24Rueckschein": "e24Wallby", "e24Fluchtprotokoll": "e24Maehdrescher", "e24Laermsteuer": "e24Ruhestoerung", "e24Untermieter": "e24Haushaltsaufloesung", "e24Zugabe": "e24PausenbrotTon"});
  art.iconSource = id => {
    if(find('icons28',id)>=0)return {kind:'icons28',id};
    const info=art.manifest.skills?.[id],baseId=info?.requires||id.replace(/Up\d+$/,''),motif=iconAliases[id]||iconAliases[baseId]||baseId;
    if(find('cast24',motif+'-0')>=0||find('companions',motif)>=0)return {kind:'companion',id:motif};
    for(const sheet of ['skills25','skills24','duel','abilities','details','skills-extra','items'])if(find(sheet,motif)>=0)return {kind:sheet,id:motif};
    const family=categories.find(([r])=>r.test(baseId))?.[1];
    return {kind:'items',id:family||'nut',fallback:!family};
  };
  art.icon = id => {
    const key='icon:'+id;if(frames.has(key))return frames.get(key);
    const c=create(64),x=c.getContext('2d'),source=art.iconSource(id);
    const base=source.kind==='companion'?art.companion(source.id,0):sprite(source.kind,find(source.kind,source.id),64);
    if (!base) return original.icon(id);
    x.drawImage(base,0,0,64,64);
    // Upgrade ranks belong to the same illustrated skill family.
    const rank=/Up(\d+)$/.exec(id)?.[1];
    if(rank){x.fillStyle='#171c28';x.fillRect(43,43,21,21);x.fillStyle='#e9bc63';x.fillRect(45,45,19,19);x.fillStyle='#263342';x.font='20px NuttyPixel';x.textAlign='center';x.fillText(rank,54,61);}
    frames.set(key,c);return c;
  };
  art.detail=id=>{
    const duel=find('duel',id);if(duel>=0)return sprite('duel',duel);
    const own=find('abilities',id);if(own>=0)return sprite('abilities',own);
    if(id==='oil')return sprite('abilities',5);if(id==='burrow')return sprite('abilities',0);
    return sprite('details',find('details',id),128)||art.icon(id);
  };
  art.world=id=>sprite('flora28',find('flora28',id),256)||sprite('props27',find('props27',id),256)||sprite('buildings25',find('buildings25',id),256)||sprite('props25',find('props25',id),256)||sprite('props24',find('props24',id),256)||sprite('structures',find('structures',id),256)||sprite('exploration',find('exploration',id),256)||art.icon(id);
  art.terrain=(stage,id='snickers',endless=false)=>{const biome=window.PixelWorlds25?.resolve(stage,id,endless)||'garden';return sprite('ground25',find('ground25',biome),256)||sprite('terrain',0,256);};
  art.quest28=frame=>sprite('gundula28',Math.max(0,frame)%4,384);
  art.merchant27=frame=>sprite('walburga27',Math.max(0,frame)%4,384);
  art.shop27=()=>{const key='shop27';if(frames.has(key))return frames.get(key);const img=images.get('shop27'),r=definitions.shop27?.rects[0];if(!img||!r)return art.room(0);const c=create(960,640);c.getContext('2d').drawImage(img,...r,0,0,960,640);frames.set(key,c);return c;};
  art.room=style=>{const i=Math.max(0,style)%4,key='room22:'+i;if(frames.has(key))return frames.get(key);const img=images.get('interiors'),r=definitions.interiors?.rects[i];if(!img||!r)return original.arena('snickers',0);const c=create(640,360);c.getContext('2d').drawImage(img,...r,0,0,640,360);frames.set(key,c);return c;};
  art.url=(kind,id,skin='classic')=>{const key=`${kind}:${id}:${skin}`;if(!urls.has(key)){const c=kind==='hero'?art.hero(id,'idle',0,skin):kind==='enemy'?art.enemy(id,0,'idle'):kind==='companion'?art.companion(id,0):kind==='world'?art.world(id):kind==='quest28'?art.quest28(id):kind==='room'?art.room(id):art.icon(id);urls.set(key,c.toDataURL());}return urls.get(key);};

  const stages={snickers:['garden','lab','quarry','kitchen','astral'],raffzahn:['sewer','lab','quarry','kitchen','astral'],krustenbraten:['kitchen','kitchen','quarry','kitchen','lab'],slanny:['swamp','garden','astral','astral','sewer'],koettitroeter:['stage','lab','quarry','astral','stage']};
  const environments=['garden','sewer','kitchen','quarry','lab','swamp','astral','stage'];
  art.arena=(id='snickers',stage=0,hard=false,impossible=false,endless=false,theme='forest')=>{
    const type=window.PixelWorlds25?.resolve(stage,id,endless)||(stages[id]||stages.snickers)[stage%5],key=`arena18:${type}:${hard}:${impossible}:${theme}`;
    if(frames.has(key))return frames.get(key);
    const i=environments.indexOf(type),sheet=i<4?'worlds-a':'worlds-b',img=images.get(sheet);
    if(!img)return original.arena(id,stage,hard,impossible,endless,theme);
    const c=create(640,360),x=c.getContext('2d'),n=i%4,sw=img.width/2,sh=img.height/2;
    x.drawImage(img,(n%2)*sw,Math.floor(n/2)*sh,sw,sh,0,0,640,360);
    if(hard||impossible){
      x.fillStyle=impossible?'#46204b20':'#682c2417';x.fillRect(0,0,640,360);let seed=art.hash(type);
      for(let j=0;j<(impossible?18:12);j++){
        seed=(Math.imul(seed,1664525)+1013904223)>>>0;const a=65+seed%510;
        seed=(Math.imul(seed,1664525)+1013904223)>>>0;const b=50+seed%260,w=25+seed%34,h=w*(.36+(seed%9)*.025);
        x.save();x.globalAlpha=.28+(seed%5)*.06;x.translate(a,b);x.rotate((seed%8)*Math.PI/4);x.drawImage(art.detail('blood'+j%4),-w/2,-h/2,w,h);x.restore();
      }
    }
    if(theme!=='forest'){x.fillStyle={neon:'#2575ac20',dusk:'#8a46b528',ember:'#db712226'}[theme]||'#00000000';x.fillRect(0,0,640,360);}
    frames.set(key,c);return c;
  };
  art.cinema=(id,part='intro',stage=0)=>{
    const key=`cinema18:${id}:${part}:${stage}`;if(urls.has(key))return urls.get(key);
    const c=create(640,240),x=c.getContext('2d');
    x.drawImage(art.arena(id,stage),0,20,640,320,0,0,640,240);
    x.fillStyle='#10182642';x.fillRect(0,0,640,240);
    const victory=/Victory|victory/.test(part),defeat=part==='defeat';
    const villain=part==='pafti'?'pafti':part==='act1'?'cyberHasenbein':part==='act2'||part==='karnil'?'karnil':part==='ottah'?'ottah':'hasenbein';
    const actor=(im,a,b,w,flip=false)=>{x.fillStyle='#09101988';x.fillRect(a-w*.28,b-5,w*.56,6);x.save();x.translate(a,b);if(flip)x.scale(-1,1);x.drawImage(im,Math.round(-w/2),-w,w,w);x.restore();};
    if(part==='hasenbein'||part==='hasenbeinVictory'){
      actor(art.enemy('hasenbein',0,'idle'),155,225,195);actor(art.enemy('karnil',0,'idle'),485,228,224,true);actor(art.hero(id,defeat?'death':'idle'),320,230,102);
    }else{actor(art.hero(id,defeat?'death':victory?'dance':'idle'),172,226,177);if(!victory)actor(part==='nose'?art.companion('noseFriend',0):art.enemy(villain,0,'idle'),474,226,206,true);}
    if(part==='pafti')actor(art.enemy('karnil',0,'idle'),333,230,173);
    if(victory){for(let j=0;j<26;j++){x.fillStyle=['#ffd486','#b3d69e','#dc8d7c'][j%3];x.fillRect(270+(j*37)%240,18+(j*19)%167,3,5);}actor(art.icon('crownNut'),454,166,105);}
    if(part==='nose')actor(art.icon('health'),316,129,44);
    x.fillStyle='#e5c58b';x.fillRect(0,0,640,2);x.fillStyle='#182431';x.fillRect(0,237,640,3);
    urls.set(key,c.toDataURL());return urls.get(key);
  };
})();
