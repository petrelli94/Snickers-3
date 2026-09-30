/* Snickers 3 · Pixelwerk. Deterministic, editable pixel assets. No network, no gameplay state. */
'use strict';
window.PixelStudio=(()=>{
  const INK='#19222e',CREAM='#fff0c2',WHITE='#fff9e4';
  const cache=new Map(),urls=new Map(),manifest={};
  const heroIds=['snickers','raffzahn','krustenbraten','slanny','koettitroeter'];
  const hash=s=>Array.from(s).reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,7);
  const mix=(a,b,t)=>{const x=a.replace('#',''),y=b.replace('#','');return '#'+[0,2,4].map(i=>Math.round(parseInt(x.slice(i,i+2),16)*(1-t)+parseInt(y.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');};
  function surface(w,h=w){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function pen(c){const x=c.getContext('2d');x.imageSmoothingEnabled=false;
    const r=(a,b,w,h,col)=>{x.fillStyle=col;x.fillRect(Math.round(a),Math.round(b),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
    const line=(a,b,u,v,col,w=1)=>{a=Math.round(a);b=Math.round(b);u=Math.round(u);v=Math.round(v);let dx=Math.abs(u-a),sx=a<u?1:-1,dy=-Math.abs(v-b),sy=b<v?1:-1,e=dx+dy;for(let n=0;n<1000;n++){r(a,b,w,w,col);if(a===u&&b===v)break;const e2=2*e;if(e2>=dy){e+=dy;a+=sx;}if(e2<=dx){e+=dx;b+=sy;}}};
    const poly=(p,col,outline=INK)=>{const lo=Math.floor(Math.min(...p.map(v=>v[1]))),hi=Math.ceil(Math.max(...p.map(v=>v[1])));for(let yy=lo;yy<=hi;yy++){const hits=[];for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];if((a[1]<=yy&&b[1]>yy)||(b[1]<=yy&&a[1]>yy))hits.push(a[0]+(yy-a[1])*(b[0]-a[0])/(b[1]-a[1]));}hits.sort((a,b)=>a-b);for(let i=0;i+1<hits.length;i+=2)r(Math.ceil(hits[i]),yy,Math.floor(hits[i+1])-Math.ceil(hits[i])+1,1,col);}if(outline)for(let i=0;i<p.length;i++)line(...p[i],...p[(i+1)%p.length],outline);};
    const oval=(a,b,w,h,col,outline=INK)=>{for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){const d=((xx-(w-1)/2)/(w/2))**2+((yy-(h-1)/2)/(h/2))**2;if(d<=1){let edge=false;if(outline){for(const [dx,dy]of [[-1,0],[1,0],[0,-1],[0,1]])if(((xx+dx-(w-1)/2)/(w/2))**2+((yy+dy-(h-1)/2)/(h/2))**2>1)edge=true;}r(a+xx,b+yy,1,1,edge?outline:col);}}};
    const box=(a,b,w,h,col,o=INK)=>{r(a,b,w,h,o);if(w>2&&h>2)r(a+1,b+1,w-2,h-2,col);};
    const shade=(a,b,w,h,col)=>{oval(a,b,w,h,mix(col,INK,.30));oval(a+1,b+1,w-3,h-4,col,null);oval(a+3,b+2,Math.max(2,w*.42),Math.max(2,h*.36),mix(col,CREAM,.18),null);};
    return {x,r,line,poly,oval,box,shade};
  }
  function eye(p,x,y,angry=false,blink=false,color=INK){if(blink){p.line(x-1,y+1,x+2,y+1,INK);return;}p.box(x,y,3,4,color,color);p.r(x,y,1,1,WHITE);if(angry)p.line(x-1,y-2,x+3,y-1,INK);}
  function sparkle(p,x,y,col=CREAM){p.r(x,y-2,1,5,col);p.r(x-2,y,5,1,col);}
  function crown(p,x,y){p.poly([[x-8,y+4],[x-9,y-4],[x-4,y],[x,y-7],[x+4,y],[x+9,y-4],[x+8,y+4]],'#eab74d');p.r(x-7,y+2,14,2,'#ffe296');p.r(x-1,y-1,3,3,'#c25769');}
  function gun(p,x,y,col='#977652'){p.box(x,y,16,7,col);p.box(x+12,y+1,7,5,'#ecd393');p.r(x+2,y+1,8,1,'#d3cbb0');p.box(x+3,y+6,4,5,'#695750');p.r(x+3,y+2,2,3,'#75d4ba');}
  function horn(p,x,y){p.poly([[x,y+2],[x+11,y+2],[x+16,y-4],[x+19,y-4],[x+19,y+9],[x+16,y+9],[x+11,y+5],[x,y+5]],'#e2b753');p.line(x+3,y+1,x+13,y+1,'#fff0a5');p.box(x+15,y-2,3,9,'#6c583b');p.r(x+3,y-2,1,5,'#f7d876');p.r(x+6,y-2,1,5,'#f7d876');p.r(x+9,y-2,1,5,'#f7d876');}
  function hero(id,pose='idle',frame=0,skin='classic'){
    const key=`h:${id}:${pose}:${frame%4}:${skin}`;if(cache.has(key))return cache.get(key);
    const c=surface(56),p=pen(c);c.pixelOrigin={width:48,x:4,y:8};p.x.translate(4,8);let bob=pose==='walk'?[0,-1,0,1][frame%4]:pose==='attack'?(frame===1?-1:0):pose==='dance'?[0,-2,0,-1][frame%4]:0;
    const step=pose==='walk'?[0,2,0,-2][frame%4]:pose==='dance'?[2,-2,2,-2][frame%4]:0;
    if(pose==='death'){const base=hero(id,'hurt',0,skin);p.x.translate(5,45);p.x.rotate(-Math.PI/2);p.x.drawImage(base,0,0,56,56,0,0,39,39);cache.set(key,c);return c;}
    p.x.translate(0,bob);p.oval(9,42,30,4,'#111b2677',null);
    if(id==='snickers'){
      p.box(12-step,37,9,6,'#8b5239');p.box(27+step,37,9,6,'#8b5239');
      p.shade(10,20,28,21,'#bd7c3e');p.oval(16,26,17,13,'#f2d6a0',null);
      p.shade(8,6,12,13,'#d19752');p.oval(11,9,6,7,'#d69a88',null);p.shade(29,6,12,13,'#d19752');p.oval(32,9,6,7,'#e7b29a',null);
      p.shade(8,12,32,23,'#e0a252');p.poly([[12,15],[17,11],[22,12],[22,15]],'#efbb70',null);
      p.oval(9,23,15,11,'#f7dfad',null);p.oval(25,23,14,11,'#f7dfad',null);p.oval(20,25,10,10,'#efd09c',null);
      eye(p,16,20,false,pose==='idle'&&frame===3);eye(p,29,20,false,pose==='idle'&&frame===3);
      p.box(22,25,5,3,'#a86556');p.line(24,28,24,31,'#7d594a');p.r(23,31,4,1,'#7d594a');p.r(23,30,2,2,CREAM);
      p.poly([[9,33],[35,33],[33,37],[12,36]],'#b84443');p.r(14,33,18,1,'#eb7560');p.poly([[12,34],[3,32-step],[6,39],[14,37]],'#d7574b');
      p.shade(7,30,7,7,'#d69a52');p.shade(34,28,7,7,'#d69a52');
    }else if(id==='raffzahn'){
      p.line(14,36,5,38,'#c3889f',2);p.line(5,38,3,30,'#c3889f',2);p.line(3,30,7,25,'#edb4b8');
      p.box(14-step,37,7,6,'#65566b');p.box(29+step,37,7,6,'#65566b');p.shade(14,21,21,20,'#76677f');
      p.poly([[16,23],[29,24],[35,36],[15,39]],'#586577');p.line(22,24,24,37,'#9fa39f');p.box(26,32,6,5,'#ad9271');
      p.shade(10,5,13,13,'#a99aae');p.oval(13,8,7,7,'#d49aa9',null);p.shade(28,4,13,13,'#a99aae');p.oval(31,7,7,7,'#d49aa9',null);
      p.poly([[13,12],[30,11],[39,22],[31,30],[20,29],[10,20]],'#aaa0b7');p.poly([[25,18],[42,23],[32,28],[23,24]],'#d6bec8');p.box(39,21,4,4,'#8c6277');p.r(31,26,2,4,CREAM);p.r(34,26,2,3,CREAM);
      eye(p,23,17,false,pose==='idle'&&frame===3);p.line(13,20,7,18,'#e5c9d0');p.line(14,23,6,24,'#e5c9d0');p.line(25,12,30,14,'#d4c1d7');p.box(11,26,8,5,'#8fa17a');p.line(36,31,43,25,'#d8d4c4',2);
    }else if(id==='krustenbraten'){
      p.box(11-step,38,10,6,'#6b4445');p.box(29+step,38,10,6,'#6b4445');p.shade(6,19,35,23,'#b66c66');
      p.poly([[14,22],[32,22],[35,40],[12,40]],'#e9ddba');p.line(18,23,19,39,'#fff1ce');p.box(19,30,10,7,'#c2b395');p.r(22,31,4,1,CREAM);
      p.poly([[9,17],[5,7],[17,13]],'#ecaaa0');p.poly([[31,12],[41,7],[38,21]],'#dc928c');p.shade(9,10,30,20,'#e6a095');p.shade(17,19,19,10,'#edb3a3');p.r(22,23,2,2,'#874c59');p.r(29,23,2,2,'#874c59');eye(p,16,17);eye(p,30,16);
      p.box(13,5,21,6,'#e4d7b5');p.shade(10,0,13,9,'#f9edcb');p.shade(18,0,14,8,'#f9edcb');p.shade(27,0,10,10,'#f9edcb');p.r(15,8,17,2,'#fffae4');
      p.line(35,29,44,23,'#746458',3);p.oval(38,15,10,12,'#374354');p.oval(40,17,6,7,'#667586',null);p.shade(6,28,8,9,'#e4a492');
    }else if(id==='slanny'){
      p.box(12-step,37,8,6,'#445d50');p.box(29+step,37,8,6,'#445d50');p.poly([[16,20],[31,20],[38,38],[30,37],[26,41],[13,38]],'#4f7758');p.poly([[17,22],[31,23],[29,35],[22,38],[17,34]],'#84996b');
      p.poly([[12,19],[8,2],[10,0],[15,3],[19,20]],'#cbd1a2');p.poly([[12,5],[13,3],[16,17],[14,17]],'#d6a995',null);
      p.poly([[27,18],[28,0],[33,0],[34,4],[32,19]],'#d2d5ac');p.line(30,3,30,15,'#c9928c',2);
      p.poly([[12,16],[18,12],[32,14],[37,21],[33,30],[16,29],[10,23]],'#b9c595');p.poly([[9,16],[16,12],[17,20],[11,25]],'#486751');p.poly([[31,13],[36,18],[38,27],[33,23]],'#486751');p.oval(17,23,17,8,'#e4dbb1',null);eye(p,18,19);eye(p,28,18);p.r(24,24,3,2,'#8c7762');p.r(24,28,3,3,CREAM);
      p.box(17,31,15,3,'#ad8f55');p.box(22,31,4,4,'#edce81');p.poly([[32,31],[44,23],[40,33],[45,38],[32,35]],'#e89b4c');p.line(34,32,39,29,'#ffd481');p.r(40,23,3,4,'#6ca966');
    }else{
      p.box(8-step,38,11,6,'#4f6253');p.box(29+step,38,12,6,'#4f6253');p.shade(6,18,36,25,'#718965');
      p.poly([[6,16],[1,10],[3,7],[14,13]],'#91a77b');p.poly([[34,13],[45,7],[47,11],[40,19]],'#91a77b');p.shade(10,7,29,25,'#9bb07f');p.poly([[12,10],[17,5],[19,8],[26,5],[28,9],[35,8],[37,14]],'#516c58');
      p.oval(14,20,23,12,'#b4bc8d');p.box(23,17,9,8,'#a5ad79');p.r(29,22,2,1,'#6c7456');p.line(14,28,33,28,'#4b5945');p.poly([[15,29],[15,24],[19,28]],CREAM);p.poly([[29,28],[33,23],[33,29]],CREAM);
      eye(p,15,16,true);eye(p,32,15,true);p.r(14,14,6,2,'#687d5c');p.r(30,13,6,2,'#687d5c');p.poly([[8,30],[17,33],[22,40],[9,40]],'#716044');p.box(18,36,17,5,'#66533d');p.box(23,36,5,5,'#e8bd66');p.shade(4,26,10,10,'#8b9e73');horn(p,26,27);
    }
    outfit(p,id,skin,frame);
    if(pose==='hurt'){p.x.globalCompositeOperation='source-atop';p.x.fillStyle='#fff7df77';p.x.fillRect(-4,-8,56,56);p.x.globalCompositeOperation='source-over';}
    if(pose==='special'){sparkle(p,5,18,'#f8d77b');sparkle(p,41,9,'#f8d77b');}
    cache.set(key,c);return c;
  }
  function outfit(p,id,skin,f){let s=skin.split('__').pop();if(s==='classic')return;const colors={normal0:'#548d86',normal1:'#f3e4be',normal2:'#736589',hard0:'#d07171',hard1:'#aa694d',hard2:'#e2b74e',endless50:'#749bae',endless100:'#97bd8c',hard50:'#995875',hard100:'#bb7776',impossible0:'#79905c',impossible1:'#6c6099',impossible2:'#ecc777',impossibleEndless10:'#a5a777',impossibleEndless50:'#956ba5',impossibleEndless100:'#d4a17b',hasenbeinVictor:'#c78b66',superSaiyajin:'#e6c74e'};
    const col=colors[s]||'#a6959b';p.box(14,33,18,5,col);p.r(17,34,11,1,mix(col,CREAM,.45));
    const hatY=id==='krustenbraten'?9:id==='slanny'?15:id==='koettitroeter'?8:12;
    if(s==='normal0'){p.box(9,hatY-2,29,3,'#4e7771');p.box(15,hatY-9,16,8,col);p.r(16,hatY-3,14,2,'#d3b985');p.oval(29,20,8,8,'#a5dacc');p.oval(31,22,4,4,'#314e59');p.line(35,27,39,31,'#be9e69',2);}
    else if(s==='normal1'){p.box(14,hatY-5,20,7,'#e9ddbe');for(const x of [13,20,27])p.shade(x,hatY-12,10,10,CREAM);p.r(16,hatY,15,2,'#fffaf0');}
    else if(s==='normal2'){p.box(12,hatY,23,3,'#353548');p.box(17,hatY-9,13,10,'#4c465f');p.r(18,hatY-2,11,2,col);p.poly([[19,32],[24,34],[28,31],[28,36],[24,34],[19,37]],CREAM);}
    else if(s==='hard0'||s==='impossibleEndless10'){p.oval(9,30,31,10,col);p.oval(15,32,19,5,'#536659');p.r(11,33,4,3,CREAM);p.r(34,32,4,3,CREAM);}
    else if(s==='hard1'||s==='superSaiyajin'){p.poly([[15,hatY],[11,hatY-10],[20,hatY-6],[24,hatY-16],[28,hatY-7],[35,hatY-11],[33,hatY+1]],s==='hard1'?'#db8451':'#ffe18a');p.line(22,hatY-9,24,hatY-2,CREAM);}
    else if(['hard2','impossible2','impossibleEndless100'].includes(s)){crown(p,24,hatY-3);p.box(9,30,6,10,col);p.box(34,29,6,11,col);p.r(11,31,2,3,CREAM);p.r(35,30,2,3,CREAM);}
    else if(['endless50','hard50','impossibleEndless50'].includes(s)){p.line(11,23,11,hatY-1,col,3);p.line(11,hatY-1,35,hatY-1,col,3);p.box(8,20,6,10,col);p.box(35,19,6,10,col);p.r(9,23,3,4,'#d6e9dc');}
    else if(s==='impossible0'){p.box(10,hatY,29,3,'#c7b283');p.box(17,hatY-6,16,7,col);p.poly([[31,hatY-3],[34,hatY-9],[38,hatY-7],[35,hatY-2]],'#aec589');}
    else if(s==='impossible1'){p.poly([[8,15],[15,8],[31,9],[39,17],[36,22],[31,15],[18,16],[12,24]],col);p.box(15,25,18,6,'#3b3b59');p.r(18,20,3,1,'#baebff');p.r(29,19,3,1,'#baebff');}
    else if(s==='hasenbeinVictor'){p.box(11,hatY-1,26,5,'#796d58');p.poly([[12,hatY],[8,hatY-14],[13,hatY-15],[18,hatY]],'#d0a58a');p.poly([[30,hatY],[33,hatY-15],[38,hatY-13],[36,hatY]],'#d0a58a');p.r(22,hatY,5,2,'#edd183');}
    else {p.box(10,27,5,13,col);p.box(33,26,6,15,col);for(const x of [12,35])p.poly([[x-3,29],[x,24],[x+3,29]],CREAM);sparkle(p,f%2?7:42,15,col);}
  }
  const types={
    bunny:['rabbit','#d8d1ae',''],runner:['rabbit','#b7bf9e','band'],gunner:['rabbit','#8fa991','gun'],brute:['rabbit','#7f9181','armor'],rabid:['rabbit','#c99275','fang'],gatling:['rabbit','#72988b','gatling'],sniper:['rabbit','#91b0bf','scope'],sapper:['rabbit','#b39a72','bomb'],splitter:['rabbit','#bca4c8','crystal'],voidBunny:['rabbit','#8573a8','void'],rocketHare:['rabbit','#ae9068','rocket'],burrowBunny:['rabbit','#987c60','drill'],stormBunny:['rabbit','#729cb7','storm'],zombieBoss:['rabbit','#819570','zombie'],pigRammer:['pig','#c88976','ram'],pigMortar:['pig','#c49273','mortar'],pigCannon:['pig','#b48681','cannon'],pigDrone:['pig','#c4998b','propeller'],pigHowler:['pig','#bb7d85','horn'],pigJuggernaut:['pig','#996c68','armor'],gnomePig:['pig','#c59478','gnome'],shieldHare:['rabbit','#82b8b8','shield'],arcHare:['rabbit','#bba0d0','storm'],pigMedic:['pig','#c2bea1','medic'],glassHare:['rabbit','#9fc9c3','crystal'],sewerRat:['rat','#9893a9',''],lanternMoth:['moth','#d2b778','lamp'],clockCrab:['crab','#c19c66','clock'],cometRat:['rat','#b1a0cf','star'],platedHare:['rabbit','#889aaa','armor'],ashThrower:['rabbit','#aa917b','fire'],shardHunter:['rabbit','#aabdca','crystal'],cursePig:['pig','#a08ab2','void'],rottenHare:['rabbit','#a4a36b','rot'],feverPig:['pig','#b98d78','rot'],marrowHunter:['rabbit','#c9c2a6','skull'],rotWasp:['wasp','#a4a46a','rot'],plagueSinger:['rabbit','#9b95ac','horn'],bileBoar:['pig','#b09869','rot'],whiskerScout:['rat','#aaacbc','scope'],tarSnail:['snail','#9a9a79','tar'],ramCaptain:['rabbit','#b9ac83','captain'],mortarChef:['pig','#c3a67d','chef'],discoBoar:['pig','#b795bc','disco'],hiveKeeper:['moth','#a8b27b','hive'],frostWarden:['rabbit','#94c4d0','ice'],bergTroll:['troll','#95a27a','stone'],knoll:['bird','#b59078','potato'],hasenbein:['rabbit','#b4b69a','general'],cyberHasenbein:['robot','#81bcc5','laser'],karnil:['boar','#978283','spikes'],ottah:['pig','#bb8d77','king'],pafti:['human','#c7bcac','controller'],carrotTitan:['rabbit','#caab79','titan'],moleMarshal:['mole','#ae937c','drill'],gnomeOverlord:['gnome','#c8a28b','gnome'],quarryBoar:['boar','#a78479','stone'],herbert:['human','#c6ac9d','singer'],ratEmpress:['rat','#bea0b3','queen'],sugarGolem:['golem','#d4ac73','caramel'],starOwl:['owl','#a8b3d0','star']
  };
  function enemy(id,frame=0,pose='walk',hard=false){
    const key=`e:${id}:${frame%4}:${pose}:${hard}`;if(cache.has(key))return cache.get(key);
    const c=surface(64),p=pen(c),[species,base,gear]=types[id]||['rabbit','#aaa98b',''],col=hard?mix(base,'#aa6573',.17):base;
    const b=pose==='walk'?[0,-1,0,1][frame%4]:0,step=pose==='walk'?[0,2,0,-2][frame%4]:0;
    p.x.translate(0,b);p.oval(10,55,46,6,'#10192370',null);
    if(['moth','wasp','owl','bird'].includes(species)){
      const y=frame%2?18:26;
      p.poly([[25,30],[6,y-8],[1,y+9],[15,44],[26,42]],mix(col,'#ede1af',.15));p.poly([[39,30],[58,y-8],[63,y+9],[49,44],[38,42]],mix(col,'#ede1af',.15));
      for(const s of [-1,1]){p.line(32+s*17,y+2,32+s*9,39,mix(col,INK,.35));p.oval(32+s*19-4,y,7,10,mix(col,INK,.26));p.oval(32+s*19-2,y+2,3,4,'#efcb83',null);}
      p.shade(22,21,22,33,col);p.oval(24,23,18,18,'#dfd6b2');eye(p,26,28,hard);eye(p,36,28,hard);p.poly([[29,35],[35,35],[32,42]],'#dfac66');p.box(23-step,52,6,5,'#bea374');p.box(35+step,52,6,5,'#bea374');
      if(species==='bird'){p.oval(23,14,18,14,'#ce987f');p.poly([[37,18],[47,24],[35,25]],'#e8b35e');p.box(25,41,15,13,'#987b54');}
    }else if(species==='crab'){
      for(const s of [-1,1])for(let i=0;i<3;i++){p.line(32+s*13,38+i*5,32+s*(24+i),36+i*7,'#8e7153',3);p.line(32+s*(24+i),36+i*7,32+s*(25+i),41+i*6,'#d3b080',2);}p.shade(12,25,40,26,col);p.box(18,21,4,8,INK);p.box(42,21,4,8,INK);p.r(19,21,2,2,CREAM);p.r(43,21,2,2,CREAM);p.oval(25,31,15,15,'#e8d4aa');p.line(32,38,32,33,INK);p.line(32,38,37,40,INK);
    }else if(species==='snail'){
      p.shade(10,44,46,12,'#7c8977');p.shade(10,19,36,32,col);p.oval(16,25,23,21,'#786c5b');p.oval(21,29,15,14,'#b1a07a');p.oval(25,34,7,7,'#675c50');p.line(47,46,47,32,'#b5c1a1',3);p.line(54,47,57,33,'#b5c1a1',3);p.box(45,30,5,5,INK);p.box(56,31,5,5,INK);p.r(46,31,2,2,CREAM);
    }else if(species==='human'){
      p.box(23-step,47,8,11,'#514e52');p.box(35+step,47,8,11,'#514e52');p.poly([[23,29],[41,29],[47,49],[20,51]],'#66586b');p.line(32,31,33,48,'#beae9b');p.shade(21,13,24,21,col);p.r(23,11,19,7,'#8f8c89');p.shade(15,30,8,18,col);p.shade(43,30,8,18,col);eye(p,26,21);eye(p,36,21);p.line(27,29,38,28,'#7d5e60');
      if(gear==='controller'){p.box(16,11,32,18,'#aba6b8');p.box(18,13,27,13,'#d3cbd0');p.box(21,17,3,9,'#454459');p.box(18,20,9,3,'#454459');p.oval(35,17,4,4,'#8a739f');p.oval(40,21,4,4,'#be92bd');p.r(30,23,3,1,'#64596d');p.line(45,30,51,56,'#cfb990',2);}
      else {p.box(22,10,20,5,'#766054');p.box(26,5,12,7,'#6a584e');p.line(45,31,47,52,'#d7c69e',2);p.oval(42,27,8,10,'#e5d7b0');}
    }else if(species==='golem'){
      p.box(13,14,37,38,col);p.box(17,17,30,31,'#dfbd86');p.poly([[13,14],[23,10],[31,14],[41,9],[50,15],[48,26],[40,22],[31,28],[23,21],[13,26]],'#f2ddb1');p.shade(3,25,14,25,'#b8885e');p.shade(48,24,14,26,'#b8885e');p.box(13-step,50,14,8,'#96745c');p.box(35+step,50,14,8,'#96745c');eye(p,22,30,true);eye(p,38,30,true);p.line(25,43,38,42,INK);p.r(27,43,2,2,CREAM);p.r(34,43,2,2,CREAM);
    }else{
      const broad=['pig','boar','troll','mole'].includes(species),bx=broad?12:19,bw=broad?41:28;
      p.box(16-step,50,12,8,mix(col,INK,.45));p.box(36+step,50,12,8,mix(col,INK,.45));p.shade(bx,27,bw,28,mix(col,INK,.16));
      p.oval(broad?21:25,35,broad?24:18,16,mix(col,CREAM,.20),null);
      if(species==='rabbit'||species==='robot'){p.poly([[20,26],[14,3],[17,1],[23,4],[28,24]],col);p.poly([[37,24],[40,1],[46,2],[48,8],[44,29]],col);p.line(19,7,24,22,species==='robot'?'#aeece4':'#c79592',2);p.line(43,6,41,21,species==='robot'?'#aeece4':'#c79592',2);}
      else if(species==='rat'){p.shade(10,11,19,19,col);p.oval(14,15,11,11,'#d8a0b2',null);p.shade(37,10,19,19,col);p.oval(41,14,11,11,'#d8a0b2',null);p.line(16,48,4,53,'#bd8599',3);p.line(4,53,3,40,'#d0a3b1',2);}
      else if(species==='troll'){p.poly([[19,21],[7,10],[3,16],[16,31]],'#b6c593');p.poly([[46,20],[59,10],[62,18],[49,29]],'#b6c593');}
      else if(species==='gnome'){p.poly([[16,23],[28,1],[46,24]],'#b66466');}
      else {p.poly([[17,26],[10,11],[27,20]],col);p.poly([[42,20],[56,10],[50,31]],col);}
      p.shade(broad?13:17,17,broad?41:33,25,col);
      if(['pig','boar'].includes(species)){p.shade(24,30,24,12,mix(col,'#ffc4ab',.4));p.box(29,34,3,3,'#855562');p.box(39,34,3,3,'#855562');}
      else if(species==='rat'||species==='mole'){p.poly([[27,27],[52,33],[37,41],[23,35]],mix(col,CREAM,.24));p.box(48,31,5,4,'#8d6179');p.r(36,39,3,4,CREAM);}
      else {p.oval(22,31,23,10,mix(col,CREAM,.3),null);p.box(30,32,6,3,'#9d8074');p.r(31,38,2,3,CREAM);p.r(34,38,2,3,CREAM);}
      eye(p,23,26,true,false,hard?'#b75061':INK);eye(p,40,25,true,false,hard?'#b75061':INK);
      p.shade(8,33,10,17,mix(col,INK,.1));p.shade(48,33,10,17,col);
      if(species==='boar'||species==='troll'){p.poly([[22,38],[18,30],[18,42],[25,43]],CREAM);p.poly([[45,37],[49,29],[49,42],[41,43]],CREAM);}
      if(species==='robot'){p.box(19,24,31,8,'#244759');p.r(23,27,10,2,'#c8fcf2');p.r(39,27,7,2,'#ed929b');p.box(23,39,23,10,'#527f8b');p.r(26,41,16,2,'#a1d4d1');}
    }
    equipment(p,gear,col,frame,pose);
    if(hard){p.r(18,44,2,3,'#9f4c62');p.r(21,47,1,2,'#b75865');}
    if(pose==='hurt'){p.x.globalCompositeOperation='source-atop';p.x.fillStyle='#fff6dc88';p.x.fillRect(0,0,64,64);p.x.globalCompositeOperation='source-over';}
    cache.set(key,c);return c;
  }
  function equipment(p,gear,col,f,pose){
    if(['gun','gatling','scope','cannon','laser'].includes(gear)){gun(p,40,39,gear==='laser'?'#6b93a1':'#7d8b85');if(gear==='scope'){p.box(45,35,12,3,'#9db9c2');p.r(57,36,2,2,'#eb8b8b');}if(gear==='gatling')for(let i=0;i<3;i++)p.box(49,37+i*3,13,3,'#78877f');if(pose==='attack'&&f%2)sparkle(p,62,41,'#ffe298');}
    if(['general','captain','band','gun','scope'].includes(gear)){const col2=gear==='band'?'#bc6559':'#566d60';p.box(15,20,38,5,col2);if(gear!=='band'){p.box(23,13,23,8,col2);p.r(26,15,15,1,'#a0ab7e');p.box(32,16,4,4,'#efc36f');}else p.poly([[17,21],[7,25],[12,29],[20,24]],col2);}
    if(['armor','shield','stone','spikes','titan'].includes(gear)){p.poly([[17,39],[31,33],[50,38],[48,52],[21,53]],gear==='stone'?'#737c77':'#6b7c85');p.line(21,39,29,37,'#adbeb4');p.line(34,37,46,40,'#adbeb4');p.box(27,42,14,8,'#56676f');p.r(29,43,10,2,'#a6b3a8');if(gear==='shield')p.poly([[5,31],[17,28],[25,33],[22,50],[15,55],[6,48]],'#72969e');if(gear==='spikes'||gear==='titan')for(const x of [10,20,42,52])p.poly([[x-3,39],[x,30],[x+3,39]],'#d0c6ac');}
    if(['bomb','mortar','rocket','drill'].includes(gear)){p.box(42,28,12,25,'#6c6862');p.box(42,26,13,5,'#b6ac8c');if(gear==='rocket')p.poly([[44,27],[48,16],[53,27]],'#d69d69');if(gear==='drill')p.poly([[47,34],[63,42],[47,49]],'#c0c3b2');if(gear==='bomb'){p.oval(43,33,15,15,'#575967');p.line(51,34,55,27,'#deb571');sparkle(p,56,26,'#f2c77a');}}
    if(['horn','chef'].includes(gear))horn(p,39,33);
    if(['chef','medic'].includes(gear)){p.box(21,13,28,8,'#e7dcc2');if(gear==='chef'){for(const x of [18,27,37])p.shade(x,4,14,13,'#f1e7cd');}else{p.r(32,13,4,8,'#b76772');p.r(29,16,10,3,'#b76772');}p.box(23,40,20,12,'#d5cdb4');}
    if(['queen','king'].includes(gear)){crown(p,33,14);p.poly([[13,35],[21,38],[18,56],[7,53]],'#966784');p.poly([[48,35],[53,38],[59,54],[48,56]],'#966784');p.r(25,47,17,3,'#e7c274');}
    if(gear==='gnome'){p.poly([[16,24],[31,0],[48,24]],'#aa5c64');p.poly([[20,37],[32,49],[45,37],[39,50],[29,53]],'#ebe2c4');}
    if(['void','storm','crystal','ice','star'].includes(gear)){const cc=gear==='void'?'#b08dd5':gear==='star'?'#efcf8b':'#b8e6e0';p.poly([[7,36],[4,22],[11,27],[15,19],[18,37]],cc);p.poly([[48,21],[53,15],[55,27],[62,23],[57,38]],cc);sparkle(p,8+f*2,10,cc);if(gear==='storm')p.poly([[34,14],[27,23],[33,23],[29,31],[41,19],[34,19]],'#edce86');}
    if(gear==='propeller'){p.box(28,13,9,7,'#677f89');p.r(9,11+f%2,47,2,'#bdd0c8');p.r(29,10,6,4,'#e6c679');}
    if(['fang','zombie','rot','skull'].includes(gear)){p.line(19,23,26,27,'#85646b');p.r(24,29,2,5,'#d38677');p.box(29,41,12,5,'#4a5550');for(const x of [30,34,38])p.r(x,41,2,2,CREAM);if(gear==='rot')for(const [x,y]of [[16,34],[44,44],[37,20]])p.oval(x,y,4,4,'#b5c677',null);}
    if(gear==='disco'){p.box(19,25,31,7,'#574568');p.r(22,27,10,2,'#e9d0ac');p.r(38,27,9,2,'#e9d0ac');sparkle(p,8,17,'#d8adcc');sparkle(p,55,14,'#95dace');}
    if(gear==='fire'){p.poly([[46,38],[43,24],[50,28],[54,15],[60,31],[58,42]],'#cf7858');p.poly([[48,36],[51,28],[56,36]],'#ffcf82');}
    if(gear==='potato'){p.oval(39,36,14,16,'#c7a477');p.r(44,41,2,1,'#8e795c');p.r(47,46,2,1,'#8e795c');}
  }
  const companions={narrath:['human','#e2c1a2','professor'],bruno:['pig','#d59a8d','chair'],wollenkamps:['human','#dbc3b3','grandma'],potencyMinister:['human','#caa887','minister'],knisterKnight:['robot','#a3c0c4','knight'],olangolil:['eye','#c2a38e','bingo'],eiterWesen:['eye','#92ac80','slime'],ronnySquirrel:['squirrel','#bd8751','gun'],erweinLewy:['astronaut','#c5d7d3','legs'],soapedRat:['rat','#aabdaf','soap'],daimDuo:['gnome','#c49e8d','duo'],pigPatrol:['pig','#c9907d','gun'],troutDormian:['fish','#8fb6bf',''],nutSentry:['machine','#bf985e','gun'],carrotDrone:['machine','#d99b59','propeller'],eggBooger:['blob','#a8be70',''],eichelkopf:['nut','#ae8855',''],creamPuff:['pastry','#e1c7a1',''],lominarWorm:['worm','#9eb66b',''],ratKing:['rat','#a69daf','queen']};
  Object.assign(companions,{brunoStanding:['pig','#d59a8d','standing'],chick:['chick','#e8ce7e',''],bee:['bee','#d8b665',''],noseFriend:['human','#d8b191','barber']});
  function companion(id,f=0){const key=`c:${id}:${f%4}`;if(cache.has(key))return cache.get(key);const c=surface(48),p=pen(c),[sp,col,gear]=companions[id]||['nut','#ba965b',''];
    p.oval(10,40,31,5,'#17202a66',null);
    if(sp==='eye'){p.line(19,29,11,43,col,3);p.line(28,29,38,43,col,3);p.line(15,20,4,29-f%2*3,col,3);p.line(32,20,44,28+f%2*3,col,3);p.shade(13,7,23,27,col);p.oval(19,11,12,13,CREAM);p.oval(23,14,5,7,'#5a586a');p.r(23,15,2,2,WHITE);p.oval(16,25,20,5,'#d38c9f');p.oval(20,29,13,4,'#b56a88');if(gear==='bingo'){p.box(1,20,10,13,'#eddda8');for(let i=0;i<3;i++)for(let j=0;j<3;j++)p.r(3+i*3,22+j*3,1,1,'#6c645d');}}
    else if(sp==='human'){p.box(17,35,5,8,'#5c5b65');p.box(28,35,5,8,'#5c5b65');p.poly([[17,19],[32,19],[37,37],[13,37]],gear==='professor'?'#e5e4cb':gear==='grandma'?'#8e7ba8':'#4d6b84');p.shade(16,6,19,18,col);for(const x of [15,21,27,32])p.oval(x,3,7,7,'#cfd0c7');eye(p,20,12);eye(p,29,12);if(gear==='professor'){p.box(18,11,7,6,'#657682');p.r(20,13,3,2,'#c0e3e1');p.box(27,11,7,6,'#657682');p.r(29,13,3,2,'#c0e3e1');gun(p,30,25,'#7d9b9f');}if(gear==='grandma')p.line(39,25,39,43,'#caba9d',2);if(gear==='minister'){p.box(14,6,24,3,CREAM);p.box(18,0,16,7,'#c9c9b2');p.r(24,23,2,9,'#d6907c');}}
    else if(gear==='chair'||gear==='standing'){if(gear==='chair'){p.box(5,15,37,26,'#755765');p.box(3,27,9,17,'#a57779');p.box(37,26,9,18,'#a57779');}else{p.box(13-f%2*2,35,8,9,'#65505a');p.box(29+f%2*2,35,8,9,'#65505a');}p.shade(12,16,25,23,col);p.shade(12,3,23,19,col);p.poly([[13,8],[10,0],[20,5]],col);p.poly([[28,5],[39,1],[35,11]],col);p.shade(18,12,15,7,'#edb8a2');p.r(22,15,2,2,'#986269');p.r(28,15,2,2,'#986269');eye(p,17,9);eye(p,30,8);p.box(37,21,9,12,'#dac388');p.r(39,20,5,2,CREAM);}
    else if(sp==='chick'){p.box(16,37,3,7,'#cc935e');p.box(29,37,3,7,'#cc935e');p.shade(10,18,27,23,col);p.shade(23,10,18,19,'#f3dd97');p.poly([[39,17],[47,21],[39,24]],'#db945c');p.poly([[27,12],[24,5],[29,8],[31,3],[33,12]],col);eye(p,34,15);p.line(14,25,19,30,'#b7965f',2);}
    else if(sp==='bee'){p.oval(13,6+f%2*5,14,19,'#bdddd5');p.oval(6,15-f%2*4,18,15,'#e2edcc');p.shade(10,22,31,17,col);p.r(20,23,4,15,'#6a6252');p.r(29,23,4,15,'#6a6252');p.poly([[9,26],[3,30],[9,34]],'#ede5bd');eye(p,35,26);p.line(38,22,41,16,'#8d8168',2);}
    else if(sp==='blob'){p.oval(7,34,35,7,'#798c52');p.shade(12,18,27,23,'#a9bd70');p.oval(16,20,10,8,'#d6de8e',null);p.oval(31,29,9,10,'#becb7b');eye(p,31,25);p.r(22,35,7,2,'#7a8d53');}
    else if(sp==='astronaut'){for(let i=0;i<8;i++){const a=i*Math.PI/4;p.line(24,24,24+Math.cos(a)*20,25+Math.sin(a)*17,'#86a6ac',2);}p.shade(12,10,25,27,col);p.oval(16,13,17,15,'#628799');p.oval(18,15,10,7,'#b7e0db',null);p.box(19,29,12,6,'#9aaca8');p.r(22,31,2,2,'#c4a072');}
    else if(sp==='fish'){p.poly([[14,20],[3,11],[4,33],[17,28]],'#6a8f9f');p.shade(12,15,31,17,col);p.poly([[22,18],[28,7],[34,19]],'#799eaa');eye(p,35,20);p.r(40,26,3,1,'#526672');}
    else if(sp==='worm'){for(let i=0;i<6;i++)p.shade(4+i*6,24+Math.round(Math.sin(f+i)*2),10,10,i===5?'#c4cf89':col);eye(p,39,25);}
    else if(sp==='pastry'){p.shade(10,26,29,12,'#c89762');for(const [x,y]of [[11,22],[19,16],[27,21]])p.shade(x,y,13,13,'#f7e7bc');p.r(25,17,3,2,WHITE);}
    else if(sp==='machine'){p.shade(11,19,27,19,col);gun(p,27,24);if(gear==='propeller'){p.r(10,15,31,2,'#aaccc1');p.box(22,12,7,6,'#637a7b');}else{p.box(15,34,6,7,'#717467');p.box(29,34,6,7,'#717467');}}
    else if(sp==='robot'){p.poly([[13,18],[5,31],[9,39],[23,31]],'#648d9b');p.box(18,19,17,20,'#96afb8');p.shade(16,6,22,19,'#b2c7c7');p.box(24,10,12,9,'#405768');p.r(29,13,6,2,'#c6e7de');p.line(35,25,46,8,'#edead1',3);p.line(32,22,42,28,'#dfba76',2);}
    else if(sp==='squirrel'){p.shade(2,9,16,30,'#a46b49');p.shade(5,12,9,23,'#d9a15f');p.shade(15,23,22,16,col);p.shade(15,10,24,20,col);p.poly([[16,13],[17,3],[23,12]],col);p.poly([[30,11],[36,3],[39,15]],col);p.oval(25,22,15,8,'#e6c693',null);eye(p,24,17);gun(p,29,30);}
    else if(sp==='rat'||sp==='pig'||sp==='gnome'){p.x.drawImage(enemy(sp==='rat'?'sewerRat':sp==='pig'?'pigRammer':'gnomeOverlord',f),6,0,40,40);if(gear==='soap'){p.oval(7,20,9,8,'#d5eee1');p.oval(18,14,9,7,'#e8f6e8');}if(gear==='queen')crown(p,25,7);}
    else {p.shade(14,14,23,26,col);p.shade(11,12,27,11,'#755e43');p.r(22,9,3,5,'#8b9c5f');p.line(25,25,24,36,'#e1c58c');}
    if(gear==='barber'){p.box(15,1,21,7,'#665267');p.r(12,7,27,3,'#867080');p.poly([[20,18],[24,16],[27,18],[31,16],[34,18],[28,21],[24,21]],'#6e5260');p.shade(23,13,6,7,'#e6bea0');p.line(36,31,45,22,'#d0dbcf',2);p.line(36,22,45,31,'#d0dbcf',2);p.oval(31,28,7,7,'#b2956c');p.oval(31,18,7,7,'#b2956c');p.r(22,25,3,11,'#d0b491');}
    cache.set(key,c);return c;
  }
  function iconMotif(id){id=id.replace(/Up\d+$/,'');if(companions[id])return 'companion';const powerMotifs={magnet:'magnet',berserk:'anger',doubleShot:'double',phase:'ghost',scoreRush:'coins',jackpot:'gem',thorns:'thorns',giantNut:'giant',overdrive:'redEye',splinterStorm:'splinters',carrotFlak:'carrot',overclock:'bolt'};if(powerMotifs[id])return powerMotifs[id];const rules=[[/health|heart|regen|vampire|reserve|doctor|life|broth/i,'heart'],[/shield|barrier|shell|fur|guard|armor|fortif|bunker|plating/i,'shield'],[/frost|ice|freeze/i,'ice'],[/fireRate|rapid|haste|speed|turbo|dash|reflex|adrenaline|lacer|dodge/i,'boot'],[/laser|rail|blaster|gatling|cannon|sentry|gun|arsenal|salvo|crossfire/i,'gun'],[/bomb|mortar|nova|rocket|comet|meteor/i,'bomb'],[/rat|beagle|hunter|rabbit|hare|swarm/i,'rat'],[/crown|royal|golden|spark|star|legend|sun|bingo/i,'star'],[/carrot|leaf|garden|season|harvest|roots/i,'carrot'],[/ammo|satchel|supply|cache|postbox|larder|scaveng/i,'crate'],[/clock|time|chrono|cool|afterHour|phase/i,'clock'],[/tesla|storm|thunder|chain|overdrive|overclock|reactor|electric/i,'bolt'],[/poison|fart|vape|slime|diarrhea|rot|pocken|berserk|madel/i,'flask'],[/book|duden|ledger|index|chronicle|command/i,'book'],[/sausage|pig|pork|meat|brat/i,'sausage'],[/cream|puff|crumb|bread|snack|snickers|krokette|pretzel|goulash/i,'food'],[/orbit|singular|gravit|void|dimension|magnet|homing/i,'orbit'],[/sword|cleft|fang|bite|pierc|crit|execution|sharp|drill/i,'blade'],[/coin|score|jackpot|luck|compass|power/i,'gem']];return rules.find(([r])=>r.test(id))?.[1]||'nut';}
  function icon(id){const key='i:'+id;if(cache.has(key))return cache.get(key);const c=surface(32),p=pen(c),motif=iconMotif(id),accent=['#e7be74','#9bbca5','#a6b9d0','#c59bae','#d6ad87','#bab982'][hash(id)%6];
    if(motif==='companion'){p.x.drawImage(companion(id.replace(/Up\d+$/,'')),0,0,32,32);}
    else if(motif==='magnet'){p.poly([[5,4],[12,4],[12,20],[15,23],[19,23],[22,20],[22,4],[29,4],[29,22],[24,29],[10,29],[5,22]],'#bc7377');p.box(5,3,8,7,'#c5d9ce');p.box(22,3,8,7,'#c5d9ce');p.r(7,12,2,8,'#e2a197');sparkle(p,17,8,'#c6e6c3');}
    else if(motif==='anger'||motif==='redEye'){p.poly([[2,13],[8,8],[16,10],[24,8],[30,13],[26,23],[17,26],[7,23]],'#7b4c64');p.poly([[5,13],[13,16],[11,21],[5,19]],'#ef8f77');p.poly([[19,16],[27,13],[27,19],[21,21]],'#ef8f77');p.r(7,15,3,3,CREAM);p.r(23,15,3,3,CREAM);if(motif==='redEye'){for(const x of [4,14,24])p.poly([[x,9],[x+3,1],[x+5,10]],'#e7ad6c');}else{p.poly([[10,24],[13,24],[13,29]],CREAM);p.poly([[20,24],[23,24],[20,29]],CREAM);}}
    else if(motif==='double'){for(const [x,y]of [[5,6],[14,18]]){p.shade(x,y,13,10,'#d5b071');p.r(x+3,y+2,3,3,CREAM);p.line(x-4,y+5,x-1,y+5,'#91b5ad',2);}p.line(17,5,28,5,'#9fc9bc',2);p.line(25,2,28,5,'#9fc9bc',2);p.line(28,5,25,8,'#9fc9bc',2);}
    else if(motif==='ghost'){p.poly([[6,27],[6,12],[10,6],[16,3],[23,7],[27,13],[27,28],[22,24],[18,28],[13,24],[9,28]],'#a8bbd0');p.r(11,12,4,5,'#415b78');p.r(21,12,3,5,'#415b78');p.r(9,9,3,9,'#d9e8df');sparkle(p,3,6,'#c5c1da');}
    else if(motif==='coins'){for(const [x,y]of [[4,17],[16,17],[10,7]]){p.shade(x,y,13,13,'#caa66b');p.oval(x+3,y+3,7,7,'#ecd597');p.r(x+6,y+4,1,5,'#ad8858');}sparkle(p,25,5,CREAM);}
    else if(motif==='thorns'){for(let i=0;i<8;i++){const a=i*Math.PI/4,x=16+Math.cos(a)*9,y=17+Math.sin(a)*9;p.poly([[x-3,y-2],[16+Math.cos(a)*15,17+Math.sin(a)*15],[x+3,y+3]],'#9aa476');}p.shade(7,8,20,20,'#b19668');p.line(16,14,16,23,'#e9cc8c',2);}
    else if(motif==='giant'){p.shade(4,7,25,24,'#b89560');p.shade(2,5,29,12,'#766645');p.r(14,1,5,6,'#91a879');p.line(17,18,16,28,'#e7c794',2);p.r(8,11,5,2,'#c4ab7c');}
    else if(motif==='splinters'){p.shade(11,11,11,12,'#d7b277');for(const [x,y,a,b]of [[3,3,8,8],[24,3,20,8],[3,26,8,22],[26,27,21,23]])p.line(x,y,a,b,'#b5d6c2',2);p.poly([[3,13],[8,17],[2,19]],'#e7c794');p.poly([[26,11],[31,16],[25,18]],'#e7c794');}
    else if(motif==='heart'){p.poly([[16,10],[11,6],[6,7],[3,12],[5,18],[16,28],[27,18],[29,12],[26,7],[21,6]],'#c97379');p.poly([[7,9],[11,8],[14,11],[9,11],[6,15]],'#f4b2a1',null);p.line(17,25,25,18,'#a14f67');}
    else if(motif==='shield'){p.poly([[5,6],[16,3],[27,6],[26,21],[16,29],[6,21]],'#678b90');p.poly([[8,8],[16,5],[23,8],[23,19],[16,25],[9,19]],accent);p.r(15,8,3,14,CREAM);p.r(11,12,11,3,CREAM);}
    else if(motif==='ice'){for(const a of [0,Math.PI/3,2*Math.PI/3]){const dx=Math.cos(a),dy=Math.sin(a);p.line(16-dx*12,16-dy*12,16+dx*12,16+dy*12,'#abdcd9',2);}for(const [x,y]of [[16,4],[6,10],[6,22],[26,10],[26,22],[16,28]])p.r(x-1,y-1,3,3,CREAM);p.box(13,13,7,7,'#d1f1e6');}
    else if(motif==='boot'){p.poly([[10,5],[23,5],[21,18],[28,21],[28,27],[7,27],[6,22],[11,17]],'#b6936c');p.r(12,7,9,3,'#e8cd95');p.r(10,22,15,3,'#d5b98a');p.line(3,13,8,13,accent,2);p.line(1,18,7,18,accent,2);}
    else if(motif==='gun'){gun(p,4,11);p.box(5,10,13,9,'#637b81');p.r(7,11,9,2,'#b8cebd');p.r(23,12,5,3,accent);}
    else if(motif==='bomb'){p.shade(6,10,21,20,'#596477');p.box(13,7,7,5,'#a7a78d');p.line(17,8,21,4,'#d5b66f',2);sparkle(p,23,4,'#ffda8e');p.oval(10,14,5,4,'#9caeba',null);}
    else if(motif==='carrot'){p.poly([[4,27],[10,10],[20,9],[24,17]],'#db9458');p.line(10,17,15,19,'#a86d46');p.line(8,21,11,22,'#a86d46');p.poly([[18,10],[18,2],[22,6],[26,3],[25,10],[29,11],[23,14]],'#88aa71');p.line(13,12,9,24,'#f6c675');}
    else if(motif==='bolt'){p.poly([[17,2],[5,18],[14,18],[10,30],[28,11],[19,11],[23,2]],'#e9c56c');p.line(17,6,10,15,CREAM);}
    else if(motif==='crate'){p.box(4,8,25,20,'#a98d61');p.box(3,6,26,5,'#dfba75');p.r(7,12,2,13,'#dfc18b');p.r(23,12,2,13,'#dfc18b');p.r(14,13,5,10,'#ede0ad');p.r(11,16,11,4,'#ede0ad');}
    else if(motif==='clock'){p.shade(4,5,25,25,'#caa671');p.oval(8,9,17,17,'#f0e2b5');p.line(16,17,16,11,'#536371',2);p.line(16,17,21,20,'#536371',2);p.box(13,2,6,5,'#ab916b');}
    else if(motif==='flask'){p.box(12,3,10,5,'#b2b9af');p.poly([[13,8],[13,15],[6,24],[8,29],[26,29],[28,24],[21,15],[21,8]],'#687e8a');p.poly([[12,20],[22,20],[25,25],[24,27],[10,27],[9,25]],accent);p.r(11,21,3,3,CREAM);p.r(16,11,2,6,'#b7d2c6');}
    else if(motif==='book'){p.box(5,5,23,25,'#aa756f');p.r(8,5,2,24,'#d4b283');p.box(12,8,13,18,'#e8dab0');for(let i=0;i<4;i++)p.r(14,11+i*3,9-(i%2)*3,1,'#a09078');}
    else if(motif==='star'){p.poly([[16,2],[20,11],[30,12],[23,19],[25,29],[16,24],[7,29],[9,19],[2,12],[12,11]],'#e7c477');p.line(16,7,14,14,CREAM);p.r(12,16,2,3,'#9c784e');p.r(20,16,2,3,'#9c784e');}
    else if(motif==='rat'){p.x.drawImage(companion('ratKing'),0,0,32,32);}
    else if(motif==='sausage'){p.shade(4,9,25,14,'#c68275');p.line(10,11,13,20,'#915365');p.line(17,11,20,20,'#915365');p.poly([[4,13],[0,10],[0,21],[4,18]],'#caa18a');p.r(7,11,3,2,'#f0c1a0');}
    else if(motif==='food'){p.shade(4,12,25,15,'#bc9365');p.poly([[5,17],[6,10],[13,7],[25,9],[28,16],[23,20],[18,17],[13,21],[9,17]],'#e4c492');p.r(9,11,6,2,CREAM);p.r(19,12,4,2,'#f5dfac');}
    else if(motif==='orbit'){p.oval(2,10,29,13,accent);p.oval(5,12,23,9,INK);p.shade(11,6,13,20,'#a99ac6');p.line(4,17,27,15,accent,2);sparkle(p,26,5,CREAM);}
    else if(motif==='blade'){p.poly([[10,22],[24,3],[29,3],[29,8],[15,26]],'#c5d6ce');p.line(14,22,26,7,WHITE);p.line(5,20,17,29,'#cea96b',3);p.line(9,25,4,30,'#937867',3);}
    else if(motif==='gem'){p.poly([[9,5],[23,5],[29,14],[16,29],[3,14]],accent);p.poly([[9,5],[14,5],[9,14],[3,14]],CREAM);p.line(9,14,16,29,mix(accent,INK,.3));p.line(9,14,23,14,mix(accent,CREAM,.4));}
    else {p.shade(8,9,20,21,'#b9915c');p.shade(5,7,25,11,'#786344');p.r(15,3,4,6,'#8fa16d');p.line(18,19,17,26,'#e6c993');p.r(11,12,3,1,'#c2a979');}
    const level=/Up(\d+)$/.exec(id);if(level){p.box(22,23,10,9,'#ddbb78');tiny(p,level[1],24,25,INK);}
    cache.set(key,c);return c;
  }
  const digits=['111101101101111','010110010010111','111001111100111','111001111001111','101101111001001','111100111001111','111100111101111','111001010010010','111101111101111','111101111001111'];
  function tiny(p,t,x,y,col){for(const ch of t){const a=digits[+ch];if(a)for(let i=0;i<15;i++)if(a[i]==='1')p.r(x+i%3,y+Math.floor(i/3),1,1,col);x+=4;}}
  function url(kind,id,skin='classic'){const key=[kind,id,skin].join(':');if(!urls.has(key)){const c=kind==='hero'?hero(id,'idle',0,skin):kind==='enemy'?enemy(id):kind==='companion'?companion(id):icon(id);urls.set(key,c.toDataURL('image/png'));}return urls.get(key);}
  function draw(c,img,x,y,w=72,anchor=.82,flip=false,alpha=1){c.save();c.imageSmoothingEnabled=false;c.globalAlpha*=alpha;c.translate(Math.round(x),Math.round(y));if(flip)c.scale(-1,1);const o=img.pixelOrigin||{width:img.width,x:0,y:0},unit=w/o.width;c.drawImage(img,-Math.round(w/2+o.x*unit),-Math.round(w*anchor+o.y*unit),Math.round(img.width*unit),Math.round(img.height*unit));c.restore();}
  function arena(id='snickers',stage=0,hard=false,impossible=false,endless=false,theme='forest'){
    const key=`arena:${id}:${stage}:${hard}:${impossible}:${endless}:${theme}`;if(cache.has(key))return cache.get(key);
    const c=surface(640,360),p=pen(c);let seed=hash(key);const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const chapters={snickers:['garden','lab','quarry','kitchen','portal'],raffzahn:['sewer','lab','quarry','caramel','portal'],krustenbraten:['kitchen','kitchen','quarry','caramel','kitchen'],slanny:['swamp','garden','portal','astral','sewer'],koettitroeter:['stage','lab','quarry','astral','portal']};
    const kind=endless?['garden','lab','quarry','kitchen','portal','sewer','caramel','astral'][stage%8]:(chapters[id]||chapters.snickers)[stage%5];
    const palettes={garden:['#263e42','#2c4747','#192c38','#859768'],lab:['#354453','#3b4d5c','#202d40','#84bab5'],quarry:['#4b4244','#554c4c','#2a2b38','#c49c70'],kitchen:['#504347','#5d4d50','#302d3b','#d9ba8e'],portal:['#34354e','#3c4057','#21273e','#bb9bcb'],sewer:['#2a404c','#314b54','#1c2d40','#89b6a4'],swamp:['#31464a','#384f50','#202e3f','#b9ba7d'],stage:['#373e4c','#414959','#252936','#ddbd78'],caramel:['#584448','#654d4e','#372d3b','#e0ad7c'],astral:['#282e4a','#303756','#1a223b','#b3bed8']};
    const tint={neon:'#214d61',dusk:'#514163',ember:'#694b3e'}[theme],pal=palettes[kind].map(col=>tint?mix(col,tint,.23):col),floor=impossible?mix(pal[0],'#614050',.19):pal[0];p.r(0,0,640,360,pal[2]);
    p.r(15,38,611,307,floor);
    const organic=['garden','swamp','quarry','sewer'].includes(kind);
    for(let y=38;y<345;y+=16)for(let x=15;x<628;x+=organic?32:16){const cc=mix(floor,pal[1],rand()*.65);const off=organic&&Math.floor(y/16)%2?12:0;
      p.r(x+off,y,(organic?31:15),15,cc);if(!organic){p.r(x+off+1,y+1,organic?28:12,1,mix(cc,CREAM,.055));}
      else if(rand()>.72){p.line(x+off+1,y+14,x+off+20,y+14,mix(cc,INK,.16));p.line(x+off+1,y+4,x+off+1,y+14,mix(cc,INK,.16));}
      if(rand()>.68){p.line(x+off+4,y+11,x+off+7+rand()*7,y+11,mix(cc,'#899488',.10));p.r(x+off+5,y+3,2,1,mix(cc,'#99b7a4',.13));}}
    for(let i=0;i<550;i++){const x=20+rand()*595,y=45+rand()*294;p.r(x,y,1+Math.floor(rand()*3),1,rand()>.5?mix(floor,CREAM,.11):mix(floor,INK,.2));}
    // Stepped stone border; short highlights define the arena without noisy stripes.
    for(let x=5;x<640;x+=20){p.box(x,27,20,12,'#596065');p.r(x+2,28,15,2,'#767d79');p.box(x,344,20,12,'#3a434c');p.r(x+2,345,16,2,'#677068');}
    for(let y=40;y<346;y+=18){p.box(3,y,13,17,'#434f54');p.r(5,y+2,2,10,'#7c8676');p.box(625,y,13,17,'#434f54');}
    if(kind==='sewer'||kind==='swamp'){
      for(const x of [20,578]){p.r(x,44,40,298,'#233b4b');for(let y=46;y<340;y+=7){p.r(x+4+rand()*12,y,10+rand()*15,1,'#52716e');}for(let y=72;y<330;y+=68){p.box(x-5,y,50,17,'#4c5c60');p.r(x-3,y+2,46,2,'#71817b');}}
      for(const x of [100,278,470]){p.box(x,7,44,22,'#5b6a6b');p.box(x+4,9,36,15,'#1a2e3d');for(let xx=x+8;xx<x+39;xx+=6)p.r(xx,9,2,15,'#8c9987');}
    }
    if(kind==='lab'){
      for(const x of [30,220,413,580]){p.box(x,1,32,29,'#61777b');p.box(x+4,4,24,14,'#263c50');p.r(x+6,6,12,2,'#91d8cb');p.r(x+8,11,18,1,'#78b4b0');p.box(x+6,22,5,4,'#dfbb75');p.r(x+19,23,5,1,'#cd7d7b');}
      for(const y of [85,282]){p.line(62,y,577,y,'#4b6870');for(let x=70;x<574;x+=36)p.r(x,y-1,8,2,'#7c9b92');}
    }
    if(kind==='kitchen'||kind==='caramel'){
      for(const x of [25,169,450,585]){p.box(x,3,30,30,'#8b645a');p.box(x+4,9,22,17,'#372d38');p.r(x+8,20,14,3,'#d99059');p.r(x+11,15,8,6,'#f0b96b');p.box(x+4,2,22,5,'#b2977d');}
      for(let i=0;i<16;i++){const x=70+rand()*500,y=70+rand()*250;p.r(x,y,5,3,'#8d7061');p.r(x+1,y,2,1,'#c19c77');}
    }
    if(kind==='quarry'){
      for(let x=90;x<560;x+=18){p.box(x,13,11,17,'#6d5550');}p.r(85,15,479,2,'#aaa08a');p.r(85,28,479,2,'#aaa08a');
      for(const [x,y]of [[32,55],[594,64],[42,299],[580,303]]){p.poly([[x,y+16],[x+4,y],[x+17,y-6],[x+32,y+5],[x+30,y+21],[x+13,y+24]],'#737371');p.poly([[x+4,y],[x+17,y-6],[x+27,y+5],[x+11,y+9]],'#939087');p.line(x+11,y+9,x+13,y+20,'#515660');}
    }
    if(kind==='portal'||kind==='astral'){
      for(const x of [38,579])for(const y of [62,273]){p.oval(x-5,y-8,31,35,'#514d70');p.poly([[x+3,y+12],[x+7,y-16],[x+19,y-20],[x+24,y+11],[x+12,y+23]],'#997eaf');p.poly([[x+7,y-16],[x+12,y+2],[x+19,y-20]],'#d9baca');p.r(x+12,y+3,2,10,'#c5b2d4');}
      for(let i=0;i<35;i++){const x=65+rand()*510,y=55+rand()*275;p.r(x,y,1,1,'#aaa9c166');}
    }
    if(kind==='stage'){
      for(let y=57;y<321;y+=10){p.line(95,y,548,y,'#3b3e49');for(let x=96+(y%30);x<548;x+=64){p.r(x,y+1,1,8,'#383b46');p.r(x+3,y+3,9,1,'#565462');}}
      for(let x=62;x<595;x+=32){p.box(x,6,28,21,'#574b57');p.box(x+4,9,20,16,'#252c38');p.oval(x+9,13,10,10,'#505b69');p.r(x+5,10,2,2,'#d3b676');}
      p.r(95,52,453,2,'#706457');p.r(95,321,453,2,'#706457');for(const x of [26,589]){p.box(x,49,25,32,'#655967');p.oval(x+5,55,15,15,'#303947');p.box(x+5,72,15,5,'#303947');}
    }
    if(kind==='garden'||kind==='swamp'){
      // Moss clusters, flagstones, fern fronds and roots stay around a quiet combat floor.
      for(let i=0;i<145;i++){const side=i%4,x=side<2?25+rand()*585:side===2?22+rand()*58:563+rand()*58,y=side===0?42+rand()*34:side===1?298+rand()*42:46+rand()*295;
        p.oval(x,y,4+rand()*12,3+rand()*5,['#3b5347','#435d49','#4c664d'][i%3],null);if(i%3===0){p.line(x+3,y+4,x+1,y-2,'#5a7253');p.line(x+4,y+4,x+7,y,'#6e815b');}}
      for(const [x,y]of [[82,103],[166,288],[280,66],[457,294],[528,151],[245,230]]){p.poly([[x,y+5],[x+3,y],[x+20,y-2],[x+27,y+3],[x+24,y+11],[x+6,y+12]],'#3b504c',null);p.line(x+4,y,x+18,y-1,'#55665c');p.line(x+22,y+4,x+19,y+8,'#2b403f');p.r(x+7,y+9,4,1,'#698064');}
      const tree=(x,y)=>{p.poly([[x-7,y+27],[x-3,y-8],[x+8,y-11],[x+14,y+24],[x+23,y+36],[x+12,y+33],[x+4,y+29],[x-14,y+37]],'#5d5147');p.line(x+1,y-7,x+3,y+26,'#a08964',2);p.line(x+8,y-5,x+11,y+23,'#393f3d',2);p.line(x+3,y+27,x-9,y+34,'#8b7655');
        for(const [xx,yy,ww]of [[-15,-21,25],[2,-25,29],[-26,-10,27],[-6,-15,36],[15,-9,27],[-18,3,30],[4,0,30]]){p.oval(x+xx,y+yy,ww,19,'#304c45');p.oval(x+xx+2,y+yy+2,ww-5,12,'#42634f',null);p.line(x+xx+5,y+yy+3,x+xx+13,y+yy+3,'#6a7e59');}};
      tree(40,45);tree(590,48);tree(33,300);tree(587,303);
      for(const [x,y]of [[61,89],[570,111],[69,304],[554,303],[250,41],[398,334]]){p.line(x,y+8,x,y-5,'#82966b');for(let j=0;j<4;j++){p.line(x,y+j*2,x-7+j,y-3+j*2,'#5e7e5d');p.line(x,y+j*2,x+7-j,y-3+j*2,'#789367');}p.r(x-9,y+7,2,2,'#d5ba87');}
      for(let i=0;i<140;i++){const x=rand()*640,y=rand()>.5?rand()*25:350+rand()*10;p.line(x,y,x-2,y-5,'#536c58');p.line(x,y,x+3,y-4,'#637b5d');}
      for(const [x,y]of [[32,65],[597,92],[51,311],[586,307]]){p.box(x+5,y+5,3,9,'#b9b69a');p.oval(x,y,14,9,'#c7876c');p.r(x+3,y+2,2,2,'#e3cfb0');p.r(x+9,y+3,2,1,'#e3cfb0');p.line(x+16,y+13,x+17,y+5,'#6d865f');}
      for(let x=9;x<640;x+=38){p.box(x,0,7,26,'#4c5653');p.r(x+1,2,2,22,'#74816a');}p.r(0,9,640,4,'#586457');p.r(0,10,640,1,'#8a9477');
    }
    if(kind==='lab')for(const [x,y]of [[29,112],[575,267]]){p.box(x,y,37,37,'#526b70');p.box(x+3,y+3,31,22,'#223d50');p.r(x+7,y+8,17,2,'#99cbb7');p.r(x+10,y+13,19,2,'#6aafa9');p.r(x+6,y+19,5,2,'#caaf75');for(let j=0;j<4;j++)p.box(x+4+j*8,y+29,6,4,j===2?'#d78e78':'#98a28d');}
    if(kind==='kitchen'||kind==='caramel')for(const [x,y]of [[27,83],[569,103],[34,294],[566,294]]){p.box(x,y+3,44,23,'#796052');p.r(x+1,y,42,5,'#b5a082');p.r(x+2,y+6,40,1,'#d0b799');p.oval(x+8,y-8,25,13,'#d4b685');p.oval(x+9,y-7,23,8,'#efd6a4',null);for(let j=0;j<3;j++)p.line(x+14+j*6,y-5,x+12+j*6,y,'#a58764');p.box(x+1,y+26,5,7,'#574e49');p.box(x+36,y+26,5,7,'#574e49');}
    // Blood treatment is restricted to sparse floor decals so warnings remain readable.
    if(hard)for(let i=0;i<(impossible?20:12);i++){const x=60+rand()*530,y=65+rand()*260,w=10+rand()*20;p.oval(x,y,w,5+rand()*8,impossible?'#663947':'#75434a',null);p.r(x+rand()*w,y-2,3,3,'#905357');}
    // Corner lanterns and four distinct pools of warm pixels.
    for(const [x,y]of [[20,32],[612,32],[20,331],[612,331]]){p.box(x,y-5,9,13,'#2c303b');p.r(x+2,y-2,5,6,pal[3]);p.r(x+3,y-1,2,4,CREAM);p.r(x-2,y+9,13,1,mix(pal[3],floor,.65));}
    cache.set(key,c);return c;
  }
  function cinema(id,part='intro',stage=0){
    const key=`cinema:${id}:${part}:${stage}`;if(urls.has(key))return urls.get(key);const c=surface(480,150),p=pen(c);
    p.r(0,0,480,150,'#1c293d');p.r(0,61,480,89,'#273e46');p.oval(305,10,55,55,'#dccfa5',null);p.oval(316,5,51,52,'#1c293d',null);
    let seed=hash(key);const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<40;i++)p.r(rand()*480,rand()*65,1,1,i%2?'#749397':'#c6bea1');
    for(let i=0;i<17;i++){let x=i*31-12,y=26+rand()*26;p.poly([[x,y+35],[x+12,y],[x+22,y+36],[x+30,y+18],[x+44,y+64],[x-10,y+64]],'#25384b');}
    p.x.drawImage(arena(id,stage),0,45,640,315,0,76,480,74);
    for(const x of [10,448]){p.box(x,22,18,114,'#344746');p.r(x+3,24,4,105,'#60735d');p.poly([[x-9,32],[x+9,6],[x+24,23],[x+32,62],[x-14,64]],'#3a574e');p.box(x+7,53,10,14,'#202d35');p.r(x+9,56,6,8,'#e0b477');}
    const villain=part==='pafti'?'pafti':part==='act1'?'cyberHasenbein':part==='act2'||part==='karnil'?'karnil':part==='ottah'?'ottah':part==='nose'?'herbert':'hasenbein';
    const victory=part==='victory'||part==='hasenbeinVictory',defeat=part==='defeat';
    if(part==='hasenbein'||part==='hasenbeinVictory'){p.x.drawImage(enemy('hasenbein'),77,53,82,82);p.x.drawImage(enemy('karnil'),333,26,108,108);p.x.drawImage(hero(id,defeat?'death':'idle'),207,88,52,52);if(victory){p.poly([[236,132],[226,118],[233,106],[239,114],[247,98],[254,115],[262,112],[257,134]],'#d5865d');p.poly([[236,132],[240,118],[248,127],[250,134]],'#efcb7d');}}
    else {p.x.drawImage(hero(id,defeat?'death':victory?'dance':'idle'),81,56,83,83);if(!victory)p.x.drawImage(part==='nose'?companion('noseFriend'):enemy(villain),327,37,100,100);else for(let i=0;i<18;i++)p.r(180+rand()*200,25+rand()*86,2,3,['#d9bb76','#93bc9e','#c19cac'][i%3]);p.x.drawImage(icon(part==='nose'?'health':part==='pafti'?'regen':id==='koettitroeter'?'storm':id==='slanny'?'carrot':id==='krustenbraten'?'food':'nut'),218,63,40,40);}
    if(part==='pafti'){p.x.drawImage(enemy('karnil'),252,61,82,82);for(const [x,y]of [[311,78],[302,92],[319,105]]){p.r(x-3,y,9,3,'#b4dfac');p.r(x,y-3,3,9,'#b4dfac');}}
    p.r(0,145,480,5,'#182433');urls.set(key,c.toDataURL('image/png'));return urls.get(key);
  }
  function configure(data){Object.assign(manifest,data);}
  return {hero,enemy,companion,icon,url,draw,surface,pen,mix,hash,types,companions,heroIds,configure,manifest,cache,arena,cinema};
})();
