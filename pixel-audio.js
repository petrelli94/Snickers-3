/* Original score for Snickers 3. 16-bit PCM instruments, 32-bar arrangements.
   No audio files, third-party tunes, network requests or live oscillator beeps. */
'use strict';
(()=>{
 const row=s=>s.split(' ').map(n=>n==='-'?null:Number(n));
 const track=(name,bpm,key,mode,lead,groove,chords,phrases)=>({name,bpm,key,mode,lead,groove,chords,phrases:phrases.map(row)});
 const tracks={
  menu:track('Eine Nuss geht auf Reisen',112,62,'major','flute','light',[0,3,4,0,5,3,4,4],['0 2 4 5 4 2 1 -','2 3 4 7 6 4 2 -','5 4 2 0 1 2 4 2','3 2 1 - 4 3 1 0']),
  garden:track('Möhrenmiliz',158,62,'minor','brass','drive',[0,5,3,4,0,3,5,4],['0 0 2 4 - 3 2 1','0 2 4 7 6 4 3 2','3 4 5 - 7 6 5 3','4 - 3 2 1 4 1 0']),
  sewer:track('Raffzahns Nachtschicht',146,55,'minor','reed','funk',[0,0,3,4,5,3,4,0],['0 - 2 3 - 4 2 -','- 4 6 7 6 - 4 3','3 5 - 7 5 4 - 2','4 3 1 - 0 - 7 6']),
  kitchen:track('Pfanne gegen Panzer',166,58,'major','mallet','swing',[0,3,0,4,5,3,1,4],['0 2 4 2 5 - 4 2','3 5 7 5 6 5 3 -','7 6 5 4 2 - 0 2','1 3 4 - 6 4 1 0']),
  swamp:track('Der freie Möhrenpfad',144,57,'dorian','flute','forest',[0,3,5,4,0,5,3,4],['0 2 3 4 6 - 4 3','2 4 7 6 4 3 2 -','5 7 6 5 3 - 2 0','1 3 4 6 4 2 1 0']),
  stage:track('Tröten bis der Putz fällt',172,53,'minor','brass','funk',[0,3,0,4,5,3,4,4],['0 - 4 3 2 - 0 2','4 4 6 - 7 6 4 -','5 - 7 8 7 5 4 3','2 4 3 1 - 4 1 0']),
  lab:track('Kein Update für den Frieden',178,64,'minor','pulse','machine',[0,5,3,4,0,2,5,4],['0 4 7 4 2 6 4 2','1 5 8 5 3 7 5 3','4 7 9 7 6 4 3 2','5 4 2 1 4 3 1 0']),
  quarry:track('Stein auf Stein auf Hamster',152,60,'minor','string','heavy',[0,5,3,4,0,3,2,4],['0 - 0 4 3 - 2 1','5 - 7 6 5 3 2 -','3 5 7 - 6 4 3 1','4 4 3 2 1 - 1 0']),
  endless:track('Feierabend wurde gestrichen',182,58,'minor','pulse','drive',[0,3,5,4,0,5,2,4],['0 2 4 7 6 4 2 3','5 7 9 8 7 6 4 -','3 4 7 6 5 3 2 0','4 6 7 4 3 2 1 0']),
  herbert:track('Brot im Rampenlicht',168,57,'dorian','voice','drive',[0,3,1,4,5,2,3,4],['0 3 - 2 5 4 2 -','4 6 5 - 3 2 0 1','5 - 6 8 7 5 3 2','2 4 - 3 1 0 2 0']),
  hasenbein:track('General ohne Garten',176,62,'minor','brass','march',[0,0,5,4,3,5,1,4],['0 0 - 4 3 2 1 -','0 2 4 - 7 6 4 2','5 5 7 6 5 3 4 -','4 6 7 6 4 3 1 0']),
  cyber:track('Überstrom im Möhrenkern',188,66,'minor','pulse','machine',[0,2,5,4,0,5,3,4],['0 4 2 7 4 9 7 6','5 7 8 7 5 4 2 1','3 6 4 8 7 6 4 3','4 7 6 4 3 2 1 0']),
  karnil:track('Der Schöpfer räumt auf',156,61,'minor','string','heavy',[0,5,0,4,3,5,2,4],['0 - 7 6 4 - 3 2','5 5 - 7 6 5 3 -','3 4 5 7 9 7 5 3','4 - 6 4 3 2 1 0']),
  ottah:track('Warzenwalzer im Sperrgebiet',174,55,'minor','brass','swing',[0,3,5,4,0,5,1,4],['0 3 4 - 6 4 3 2','5 7 6 5 3 - 5 4','7 9 8 7 6 4 3 -','4 3 1 4 6 4 1 0']),
  pafti:track('Kein Reset für Pafti',196,59,'minor','mallet','machine',[0,5,2,4,3,0,5,4],['0 7 4 2 6 4 1 4','5 2 7 4 8 5 3 6','3 7 5 9 7 4 6 3','4 7 6 4 3 4 1 0']),
  troll:track('Bergtroll mit Hausrecht',140,52,'dorian','reed','heavy',[0,3,0,4,5,3,1,4],['0 - 2 0 4 - 3 -','3 5 - 4 2 - 0 2','5 - 7 5 3 4 5 -','4 - 3 2 1 4 1 0']),
  story:track('Ärger hinter dem Gartenzaun',102,62,'minor','flute','light',[0,3,5,4,0,5,3,4],['0 - 2 4 - 3 2 -','5 - 4 2 - 0 1 -','3 - 5 7 6 - 4 -','4 3 2 - 1 - 0 -']),
  victory:track('Die Nuss bleibt hier',164,60,'major','brass','march',[0,3,4,0,5,3,4,0],['0 2 4 - 7 7 6 4','3 5 7 - 9 7 5 3','5 7 9 8 7 6 4 2','3 4 6 7 4 2 1 0']),
  defeat:track('Nur kurz das Fell sortieren',82,57,'minor','mallet','light',[0,5,3,4,0,3,4,0],['7 - 6 - 4 3 2 -','5 - 3 - 2 1 0 -','3 - 4 5 4 - 2 -','1 - 4 - 1 - 0 -'])
 };
 const scales={minor:[0,2,3,5,7,8,10],major:[0,2,4,5,7,9,11],dorian:[0,2,3,5,7,9,10]};
 const pitch=(t,d,oct=0)=>t.key+12*oct+12*Math.floor(d/7)+scales[t.mode][((d%7)+7)%7];
 const hz=n=>440*2**((n-69)/12),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function create(context,{offline=false}={}){
  const master=context.createGain(),compressor=context.createDynamicsCompressor(),musicGain=context.createGain(),sfxGain=context.createGain();
  compressor.threshold.value=-9;compressor.knee.value=8;compressor.ratio.value=12;compressor.attack.value=.003;compressor.release.value=.12;
  musicGain.gain.value=.68;sfxGain.gain.value=.9;musicGain.connect(master);sfxGain.connect(master);master.connect(compressor);compressor.connect(context.destination);master.gain.value=.65;
  const echo=context.createDelay(.5),echoGain=context.createGain(),feedback=context.createGain(),echoFilter=context.createBiquadFilter();echo.delayTime.value=.176;echoGain.gain.value=.12;feedback.gain.value=.18;echoFilter.type='lowpass';echoFilter.frequency.value=3400;
  musicGain.connect(echo);echo.connect(echoFilter);echoFilter.connect(echoGain);echoGain.connect(master);echoFilter.connect(feedback);feedback.connect(echo);
  const buffers={},active=new Set(),lastEffect=new Map();let trackId='',bus=null,step=0,next=0,enabled=true,musicMuted=false,sfxMuted=false,intensity=0,notesScheduled=0;
  let seed=17391;const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
  for(const name of ['bass','pulse','brass','string','flute','reed','mallet','voice']){
   const b=context.createBuffer(1,256,22050),a=b.getChannelData(0);let peak=0;
   for(let i=0;i<256;i++){const p=i/256*Math.PI*2;let v=0;
    if(name==='bass')v=Math.sin(p)+.32*Math.sin(2*p)+.1*Math.sin(3*p);
    else if(name==='flute')v=Math.sin(p)+.15*Math.sin(2*p)+.045*Math.sin(4*p);
    else if(name==='voice'){for(let h=1;h<=18;h++)v+=Math.sin(p*h)*(Math.exp(-(((h-4)/2)**2))+.55*Math.exp(-(((h-10)/3)**2)))/h;}
    else if(name==='mallet')v=Math.sin(p)+.24*Math.sin(3*p)+.09*Math.sin(7*p);
    else for(let h=1;h<=14;h++){const weight=name==='pulse'?Math.sin(h*Math.PI*.3)/h:name==='brass'?1/h**1.1:name==='reed'?(h%2?1/h:0):1/h**1.65;v+=Math.sin(p*h)*weight;}
    a[i]=v;peak=Math.max(peak,Math.abs(v));
   }for(let i=0;i<256;i++)a[i]=Math.round(a[i]/peak*32767)/32767;buffers[name]=b;
  }
  for(const [name,duration]of [['kick',.25],['snare',.22],['hat',.085],['openhat',.2],['crash',.65],['tom',.3],['noise',.45],['metal',.23]]){
   const b=context.createBuffer(1,Math.ceil(22050*duration),22050),a=b.getChannelData(0);let phase=0,low=0;
   for(let i=0;i<a.length;i++){const t=i/22050,n=noise();low+=.17*(n-low);let v;
    if(name==='kick'){phase+=Math.PI*2*(48+110*Math.exp(-t*35))/22050;v=Math.sin(phase)*Math.exp(-t*18)+n*Math.exp(-t*150)*.08;}
    else if(name==='snare')v=(n*.7+Math.sin(t*2*Math.PI*185)*.35)*Math.exp(-t*22);
    else if(name==='tom'){phase+=Math.PI*2*(90+100*Math.exp(-t*22))/22050;v=Math.sin(phase)*Math.exp(-t*12);}
    else if(name==='metal')v=(Math.sin(t*2*Math.PI*913)+Math.sin(t*2*Math.PI*1471)*.7+n*.18)*Math.exp(-t*27)*.55;
    else if(name==='noise')v=low*Math.exp(-t*7);
    else v=(n-low)*Math.exp(-t*(name==='crash'?6:name==='hat'?55:18))*.7;
    a[i]=Math.round(clamp(v,-1,1)*32767)/32767;
   }buffers[name]=b;
  }
  const gainTargets=new Map([[master.gain,.65],[musicGain.gain,.68],[sfxGain.gain,.9]]);
  const ramp=(param,value,time=.03)=>{if(gainTargets.get(param)===value)return;gainTargets.set(param,value);const now=context.currentTime,start=param.value;param.cancelScheduledValues(now);param.setValueAtTime(start,now);param.linearRampToValueAtTime(value,now+time);};
  function note(instrument,midi,time,duration,volume,pan=0,target=bus,slide=null){
   if(!target||!Number.isFinite(time)||(!offline&&active.size>90))return;
   const source=context.createBufferSource(),gain=context.createGain(),stereo=context.createStereoPanner(),drum=['kick','snare','hat','openhat','crash','tom','noise','metal'].includes(instrument);
   source.buffer=buffers[instrument]||buffers.pulse;source.loop=!drum;
   const rate=drum?(midi?2**((midi-60)/12):1):hz(midi)/(22050/256);source.playbackRate.setValueAtTime(rate,time);if(slide!==null)source.playbackRate.exponentialRampToValueAtTime(drum?Math.max(.2,slide):hz(slide)/(22050/256),time+duration);
   const attack=instrument==='string'?.035:instrument==='flute'?.012:.004,release=instrument==='string'?.16:.045,end=time+Math.max(.025,duration);
   gain.gain.setValueAtTime(.0001,time);gain.gain.linearRampToValueAtTime(volume,time+Math.min(attack,duration*.3));gain.gain.setValueAtTime(volume*.72,Math.max(time+attack,end-.015));gain.gain.exponentialRampToValueAtTime(.0001,end+release);
   stereo.pan.value=clamp(pan,-1,1);source.connect(gain);gain.connect(stereo);stereo.connect(target);active.add(source);notesScheduled++;
   source.onended=()=>{source.disconnect();gain.disconnect();stereo.disconnect();active.delete(source);};source.start(time);source.stop(end+release+.01);
  }
  function tick(t,index,time){
   const bar=Math.floor(index/16)%32,s=index%16,section=Math.floor(bar/8),chord=t.chords[bar%8],beat=60/t.bpm,unit=beat/4,light=t.groove==='light',heavy=t.groove==='heavy',machine=t.groove==='machine',swing=t.groove==='swing';
   const when=time+(swing&&s%4===2?unit*.3:0),opening=section===0&&bar%8<2,bridge=section===2&&bar%8<4;
   if(s%2===0){const phrase=t.phrases[(bar+(section===1?1:section===3?2:0))%4],d=phrase[s/2];
    if(d!==null){const oct=section===3&&bar%4===3?1:0;note(t.lead,pitch(t,d,oct),when,unit*(bridge?2.8:1.75),light?.105:.15,-.1);if(section===3&&!opening)note('string',pitch(t,d-2,oct),when,unit*1.7,.033,.3);}
   }
   if((light?s%4===0:s%2===0)){
    const pattern=t.groove==='funk'?[0,0,4,7,0,4,6,4]:heavy?[0,0,7,0,0,4,7,4]:[0,7,0,4,0,7,4,7],degree=chord+pattern[Math.floor(s/2)%8];
    note('bass',pitch(t,degree,-2),when,unit*(light?3.4:1.6),.18,0);
   }
   if(s===0||s===8){for(const [i,d]of [0,2,4].entries())note(light?'flute':'string',pitch(t,chord+d,-1),when,beat*(light?1.8:1.5),.042,[-.65,.5,.7][i]);}
   if(!opening&&!bridge&&(s%2===1||machine)){
    const arp=[0,2,4,7,4,2,7,4][s%8];note('mallet',pitch(t,chord+arp,1),when,unit*.7,.027,s%2?.6:-.6);
   }
   if(!light||bar%4>1){
    const kicks=heavy?[0,3,8,10]:t.groove==='funk'?[0,6,9,14]:t.groove==='march'?[0,8]:[0,6,8,11];
    if(kicks.includes(s))note('kick',60,when,.19,bridge?.18:.32,0);
    if(s===4||s===12){note('snare',60,when,.17,light?.09:.19,.12);if(t.groove==='march'&&s===12)note('snare',60,when+unit*.7,.1,.07,-.12);}
    if(s%2===0||machine)note(s===14&&!bridge?'openhat':'hat',60,when,.075,light?.027:.045,s%4?-.35:.35);
    if(bar%8===7&&s>=10){note('tom',68-(s-10)*2,when,.17,.13,(s-13)*.16);if(s%2)note('snare',60,when,.1,.09);}
    if(s===0&&bar%8===0)note('crash',60,when,.55,.10,.45);
   }
   if(intensity>.45&&s%4===2&&!light)note('brass',pitch(t,chord+4,-1),when,unit*1.3,.035,-.3);
  }
  function change(id,at=context.currentTime+.04){
   if(!tracks[id])id='garden';if(trackId===id&&bus)return;
   if(bus){const previous=bus;previous.gain.cancelScheduledValues(at);previous.gain.setTargetAtTime(0,at,.16);if(!offline)setTimeout(()=>previous.disconnect(),1800);}
   bus=context.createGain();bus.gain.setValueAtTime(.0001,at);bus.gain.linearRampToValueAtTime(1,at+.28);bus.connect(musicGain);trackId=id;step=0;next=at;
  }
  function mix(state){enabled=!!state.enabled;musicMuted=!!state.musicMute;sfxMuted=!!state.sfxMute;intensity=state.intensity||0;
   const value=enabled?clamp(state.volume/100,0,1)*.65:0;ramp(master.gain,value);
   const level=musicMuted?0:state.paused?.22:.68;ramp(musicGain.gain,level,.06);
   const fx=sfxMuted?0:.9;ramp(sfxGain.gain,fx);
  }
  function update(id,state){mix(state);if(!enabled||musicMuted||state.volume<=0||context.state==='suspended')return;change(id);
   if(next<context.currentTime-.15)next=context.currentTime+.025;
   let safety=0;while(next<context.currentTime+.16&&safety++<24){tick(tracks[trackId],step++,next);next+=60/tracks[trackId].bpm/4;}
  }
  function effect(name,{pan=0,volume=1,pitch:transpose=0}={}){
   if(!enabled||sfxMuted||(!offline&&context.state==='suspended'))return;const now=context.currentTime,delay={impact:.055,pickup:.045,shot:.055,step:.09,reward:.8}[name]||.035;if(now-(lastEffect.get(name)||-100)<delay)return;lastEffect.set(name,now);
   const play=(instrument,midi,offset,duration,gain,end=null)=>note(instrument,midi+transpose,now+offset+.004,duration,gain*volume,pan,sfxGain,end);
   if(name==='shot'){play('noise',72,0,.055,.22);play('bass',57,0,.09,.25,35);play('metal',75,0,.04,.035);}
   else if(name==='bite'){play('noise',77,0,.085,.24);play('reed',62,0,.07,.095,42);play('metal',68,.035,.05,.06);}
   else if(name==='pan'){play('metal',58,0,.16,.20);play('noise',66,.01,.12,.16);play('bass',44,0,.12,.16,29);}
   else if(name==='carrot'){play('noise',79,0,.10,.19);play('flute',80,0,.11,.08,60);}
   else if(name==='horn'){for(const d of [0,4,7])play('brass',48+d,0,.15,d===0?.09:.045);play('noise',61,0,.045,.08);}
   else if(name==='explosion'){play('kick',47,0,.28,.37);play('noise',49,0,.39,.6);play('metal',44,.02,.18,.10);}
   else if(name==='trap'){play('noise',54,0,.22,.24);play('metal',56,.065,.13,.16);play('reed',49,.04,.15,.06,35);}
   else if(name==='fire'){play('noise',67,0,.29,.45);play('metal',65,.06,.06,.07);}
   else if(name==='vines'){play('noise',77,0,.19,.25);for(let i=0;i<3;i++)play('mallet',62+i*5,i*.036,.10,.08);}
   else if(name==='resonance'){for(const d of [0,7,12])play('brass',43+d,0,.36,.085);play('noise',64,.015,.2,.11);}
   else if(name==='dash'){play('noise',80,0,.14,.3);play('flute',72,0,.12,.075,48);}
   else if(name==='hurt'){play('bass',52,0,.15,.19,35);play('noise',68,0,.09,.16);}
   else if(name==='impact'){play('noise',77,0,.045,.15);play('mallet',78,0,.05,.038,63);}
   else if(name==='pickup'){play('mallet',88,0,.055,.11);play('mallet',95,.045,.09,.075);}
   else if(name==='power'){[72,76,79,84].forEach((n,i)=>play('mallet',n,i*.048,.16,.11));}
   else if(name==='reward'){[72,76,79,84].forEach((n,i)=>{play('brass',n,i*.11,.22,.12);play('mallet',n+12,i*.11,.15,.07);});[60,64,67].forEach(n=>play('brass',n,.36,.43,.055));play('tom',60,.33,.2,.12);}
   else if(name==='boss'){[36,43,48,51].forEach((n,i)=>play('brass',n,i*.06,.55,.085));play('tom',48,0,.4,.25);}
   else if(['vibrato','belting','staccato','falsetto'].includes(name)){const notes=name==='staccato'?[57,60,57,64]:name==='falsetto'?[76,79,81]:name==='belting'?[55,62]:[60,61,60,59,60];notes.forEach((n,i)=>play('voice',n,i*(name==='staccato'?.09:.07),name==='belting'?.32:.16,.095));}
   else if(name==='ui'){play('mallet',79,0,.045,.085);play('flute',86,.04,.07,.045);}
   else {play('mallet',74,0,.075,.09);play('mallet',81,.055,.1,.06);}
  }
  return {update,mix,effect,setTrack:change,schedulePreview(id,seconds){change(id,.05);while(next<seconds){tick(tracks[trackId],step++,next);next+=60/tracks[trackId].bpm/4;}},get debug(){return {track:trackId,step,activeVoices:active.size,notesScheduled,enabled,musicMuted,sfxMuted,masterGain:master.gain.value,musicGain:musicGain.gain.value,sfxGain:sfxGain.gain.value,targets:{master:gainTargets.get(master.gain),music:gainTargets.get(musicGain.gain),sfx:gainTargets.get(sfxGain.gain)}};},dispose(){for(const node of active){try{node.stop();}catch{}}active.clear();master.disconnect();echo.disconnect();feedback.disconnect();}};
 }
 window.PixelAudio={tracks,create};
})();
