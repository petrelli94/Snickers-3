'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const canvas = $('gameCanvas'), ctx = canvas.getContext('2d'), shell = $('gameShell');
  const W = 1280, H = 720, TAU = Math.PI * 2;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const rnd = (lo, hi) => lo + Math.random() * (hi - lo);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  // The timer controls only how long reinforcements may spawn. A wave ends only after every spawned enemy is dead.
  // Knollenbrot-Balance: kurze Einstiegswellen, danach kontrolliert längere Belastungsphasen.
  const waveLengths = [34, 37, 40, 38, 41, 44, 40, 43, 46];
  const endlessWaveLength = w => Math.min(46,34 + Math.floor(Math.max(0,w) * .5));
  const currentWaveLength = () => endlessMode ? endlessWaveLength(wave) : (waveLengths[wave]||48);
  // Difficulty curves deliberately scale different axes at different speeds. Stacking the same exponential on HP,
  // density, speed, actions and incoming damage made old late-game waves jump from easy to unfair.
  const endlessHpScale = w => 1 + .075*Math.max(0,w) + .0015*Math.max(0,w-25)**2;
  const endlessBossHpScale = w => 1 + .09*Math.max(0,w) + .0017*Math.max(0,w-25)**2;
  const endlessSpeedScale = w => Math.min(1.55,(1 + Math.max(0,w)*.011)*1.04);
  const endlessActionScale = w => Math.min(1.72,(1 + Math.max(0,w)*.017)*1.04);
  const endlessDensityScale = w => Math.min(2.85,(1 + Math.max(0,w)*.045)*(w<5?1.06:1.08));
  const campaignHpScale = () => (1 + wave*.025) * (gamePlusLevel===2?2.25:gamePlusLevel===1?1.55:1);
  const campaignSpeedScale = () => (1 + wave*.004) * (gamePlusLevel===2?1.15:gamePlusLevel===1?1.08:1) * (wave<3?1.04:1.06);
  const campaignActionScale = () => (1 + wave*.008) * (gamePlusLevel===2?1.18:gamePlusLevel===1?1.10:1) * 1.05;
  const incomingDamageScale = () => (hardMode?1.25:1)*(impossibleMode?1.28:1)*(endlessMode
    ? Math.min(2.35,(endlessFromHall?1.25:1) * (1 + wave*.012))
    : gamePlusLevel===2?1.5:gamePlusLevel===1?1.2:1);
  function endlessEnemyPool(w){
    const extras=[];if(w>=3)extras.push('sewerRat');if(w>=8)extras.push('lanternMoth');if(w>=12)extras.push('clockCrab');if(w>=18)extras.push('cometRat');
    if(w<2)return ['bunny','bunny','runner','runner','brute','gunner'];
    if(w<5)return ['bunny','runner','brute','gunner','rabid','splitter','sapper','sniper',...extras];
    if(w<10)return ['runner','brute','rabid','gatling','splitter','sniper','sapper','pigRammer','pigMortar','pigDrone',...extras];
    if(w<15)return ['rabid','gatling','sniper','sapper','pigRammer','pigMortar','pigCannon','pigDrone','pigHowler','voidBunny','rocketHare',...extras];
    if(w<20)return ['gatling','pigRammer','pigMortar','pigCannon','pigDrone','pigHowler','voidBunny','rocketHare','burrowBunny','stormBunny','gnomePig','pigJuggernaut',...extras];
    return ['rabid','gatling','sniper','sapper','pigRammer','pigMortar','pigCannon','pigDrone','pigHowler','voidBunny','rocketHare','pigJuggernaut','burrowBunny','stormBunny','gnomePig',...extras];
  }
  const waveSpawningComplete = () => waveTime >= currentWaveLength();
  const livingEnemyCount = () => enemies.reduce((count,e) => count + (!e.dead ? 1 : 0), 0);
  const waveNames = ['DIE MÖHREN-MILIZ', 'LANGOHREN SCHLAGEN ZURÜCK', 'DAS ERSTE AUFGEBOT', 'TOLLWUT MIT FELL', 'MÖHREN AUS DEM LAUF', 'DIE TERROR-ERNTE', 'KILLERFERKEL IN ANMARSCH', 'SCHWEINEREI IM STEINBRUCH', 'DAS GRUNZENDE ENDE'];
  const waveQuotes = [
    'Ich wollte einen Snack. Jetzt habe ich ein Hasenproblem.',
    'So viel Bewegung hatte mein Hamsterrad nicht auf dem Schirm.',
    'Drei Wellen? Ich kündige meine Mitgliedschaft im Streichelzoo.',
    'Schaum vorm Mund? Jungs, die Zahnpasta wird ausgespuckt!',
    'Möhren-Gatling. Endlich Gemüse, das ich aus gutem Grund meide.',
    'Wenn der Hase jetzt noch WLAN hat, kündige ich das Internet.',
    'Ferkel mit Waffen. Ich hätte heute einfach liegen bleiben sollen.',
    'Dieser Steinbruch hat eindeutig zu viel Schwein gehabt.',
    'Karnil? Klingt wie Knuspern, nur mit deutlich mehr Lebenspunkten.'
  ];
  const bossQuotes=[
    'Chef besiegt. Bekomme ich jetzt endlich eine Mittagspause?',
    'Große Lebensleiste. Kleine Ausbeute. Typisch Management.',
    'Ich habe keine Aggressionsprobleme. Ich habe ein Nussproblem.',
    'Der wollte drei Phasen. Ich wollte drei Weißwürste.',
    'Noch so ein Boss und ich verlange Kilometergeld.',
    'Im Lebenslauf steht jetzt: Führungskräfte entfernt.',
    'Die nächste Nuss kaufe ich einfach im Supermarkt.',
    'So. Wer räumt das jetzt alles auf? Ich jedenfalls nicht.',
    'Meine Backentaschen sind voll. Meine Geduld war es zuerst.',
    'War das der Endgegner oder nur der Abteilungsleiter?',
    'Ich bin klein. Meine Beschwerden sind es nicht.',
    'Ab jetzt wird Gemüse nur noch gedünstet.',
    'Da hätte selbst mein Hamsterrad Überstunden angemeldet.',
    'Ich habe den Boss gefragt. Er hatte keine Einwände mehr.',
    'Ist das hier noch ein Garten oder schon ein Bewerbungsgespräch?',
    'Einer weniger auf der Gästeliste für meine Nussfeier.',
    'Für den Stress hätte ich mindestens zwei Erdnüsse erwartet.',
    'Mein Fell sitzt. Seine Rüstung nicht mehr.',
    'Das war kein Kampf. Das war eine sehr laute Snackpause.',
    'Bitte den nächsten Boss ohne Knochen und mit Senf.',
    'Wenn das so weitergeht, brauche ich einen Betriebsrat.',
    'Ich kam, ich knabberte, ich stellte die Rechnung.',
    'Hoffentlich ist im nächsten Raum wenigstens eine Sitzgelegenheit.',
    'Unendliche Wellen? Mein Urlaub war anders geplant.'
  ];
  let bossQuoteBag=[];
  function shuffled(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function bossQuoteMarkup(){if(!bossQuoteBag.length)bossQuoteBag=shuffled(bossQuotes);return `<blockquote class="snickers-quote"><b>SNICKERS</b>„${bossQuoteBag.pop()}“</blockquote>`;}
  const stageNames=['NACHTGARTEN','MÖHRENLABOR','FERKEL-STEINBRUCH','SAHNEKÜCHE','ZWERGENPORTAL','RATTENKANAL','ZUCKERSTURM','STERNENPLANTAGE'];
  function randomStage(previous=-1){return shuffled(stageNames.map((_,i)=>i).filter(i=>i!==previous))[0];}
  function stageAfterBoss(kind){stageVisual=endlessMode?randomStage(stageVisual):({general:1,cyber:2,karnil:3,ottah:4}[kind]??stageVisual);stagePrepared=endlessMode;makeGround();}
  const waveTracks = [
    {bpm:168,notes:[220,277,330,440,330,277,247,330]},
    {bpm:174,notes:[196,247,294,392,294,247,220,294]},
    {bpm:180,notes:[165,220,262,330,392,330,262,220]},
    {bpm:186,notes:[147,196,247,294,392,294,247,196]},
    {bpm:192,notes:[174,233,277,349,466,349,277,233]},
    {bpm:198,notes:[185,247,311,370,494,370,311,247]},
    {bpm:204,notes:[131,196,262,330,523,330,262,196]},
    {bpm:210,notes:[123,185,246,311,493,311,246,185]},
    {bpm:216,notes:[110,165,220,277,440,277,220,165]}
  ];
  const themes = {
    forest: {name:'Nachtwald', note:'Moos & Mondlicht', bg:'#101816', panel:'#1b2b21', line:'#40523c', dim:'#a7b59e', rgb:'16 24 22', ground:['#344a32','#253e2f','#102820'], plant:['#183b2b','#214833','#375f3b'], shade:'#071911'},
    neon: {name:'Cybernacht', note:'Petrol & Neon', bg:'#091820', panel:'#142d3a', line:'#365466', dim:'#9fb9c8', rgb:'9 24 32', ground:['#254956','#193646','#102434'], plant:['#15313b','#224550','#346470'], shade:'#071821'},
    dusk: {name:'Dämmerung', note:'Violett & Nebel', bg:'#181322', panel:'#2b203b', line:'#584269', dim:'#baa9ce', rgb:'24 19 34', ground:['#4a3b57','#352d47','#201f34'], plant:['#302338','#45314d','#644967'], shade:'#171220'},
    ember: {name:'Glutgarten', note:'Kupfer & Asche', bg:'#21150f', panel:'#38271d', line:'#69503b', dim:'#c5ad98', rgb:'33 21 15', ground:['#59432e','#443528','#2f2922'], plant:['#392d24','#504033','#735540'], shade:'#21160f'}
  };
  const accents = {lime:{name:'Limette',hex:'#c7f36b',rgb:'199 243 107'}, cyan:{name:'Eisblau',hex:'#7ee5f5',rgb:'126 229 245'}, violet:{name:'Flieder',hex:'#d1afff',rgb:'209 175 255'}, amber:{name:'Gold',hex:'#ffd17a',rgb:'255 209 122'}, pink:{name:'Pink',hex:'#ffa9ca',rgb:'255 169 202'}};
  let settings = {theme:'forest',accent:'lime',volume:70,musicMute:false,sfxMute:false}, settingsReturn = 'menu', generalDefeated = false, cyberDefeated = false, lastDefeatedBoss = '';
  let gamePlusLevel=0, newGamePlus=false, newGamePlus2=false, ngPlusUnlocked=false, ngPlusBuild=null, ngPlus2Unlocked=false, ngPlus2Build=null, ngPlusEverUnlocked=false, ngPlus2EverUnlocked=false, hallOfFame=[];
  let endlessMode=false,endlessSelectedBuild=null,endlessFromHall=false,endlessBossesDefeated=0,stageVisual=0,stagePrepared=false;
  let hardMode=false,impossibleMode=false,paftiBoss=null;
  try{
    ngPlusUnlocked=localStorage.getItem('snickers3-ngplus-unlocked-v1')==='1';
    ngPlusBuild=JSON.parse(localStorage.getItem('snickers3-ngplus-build-v1')||'null');
    ngPlus2Unlocked=localStorage.getItem('snickers3-ngplus2-unlocked-v1')==='1';
    ngPlus2Build=JSON.parse(localStorage.getItem('snickers3-ngplus2-build-v1')||'null');
    ngPlusEverUnlocked=localStorage.getItem('snickers3-ngplus-ever-v1')==='1'||ngPlusUnlocked||ngPlus2Unlocked;
    ngPlus2EverUnlocked=localStorage.getItem('snickers3-ngplus2-ever-v1')==='1'||ngPlus2Unlocked;
    hallOfFame=JSON.parse(localStorage.getItem('snickers3-hall-of-fame-v1')||'[]')||[];
    if(!Array.isArray(hallOfFame))hallOfFame=[];
    hallOfFame=hallOfFame.filter(r=>r&&typeof r==='object'&&(r.gamePlusLevel===undefined||r.gamePlusLevel===2));
  }catch{}
  try { const saved=JSON.parse(localStorage.getItem('snickers3-settings-v4')||localStorage.getItem('snickers3-settings-v3')||localStorage.getItem('snickers3-settings-v2')||'{}'); if(themes[saved.theme])settings.theme=saved.theme;if(accents[saved.accent])settings.accent=saved.accent;if(Number.isFinite(saved.volume))settings.volume=clamp(saved.volume,0,100);settings.musicMute=Boolean(saved.musicMute);settings.sfxMute=Boolean(saved.sfxMute); } catch {}
  const accent = () => accents[settings.accent].hex;
  const isBoss = e => e?.type === 'boss';
  let inputMode=matchMedia('(pointer: coarse)').matches?'touch':'mouse', victoryTime=0, victoryAfter=null;
  let poisonPatches=[], ratSwarms=[], activeRewardChoices=[], minibossPlan=null, lastMiniWave=-99, achievementDirty=false;
  let mode = 'menu', previousMode = 'playing', player, enemies = [], bullets = [], enemyBullets = [], particles = [], pickups = [], hazards = [], floaters = [], thrownWeapons = [], ossiWalls = [];
  let wave = 0, waveTime = 0, runTime = 0, spawnTimer = 0, kills = 0, score = 0, boss = null, shake = 0, bombFlash = 0;
  let lastFrame = 0, uiTimer = 0, ambientTime = 0, shotTimer = 0, noticeTimer, announcementTimer, achievementTimer, retriesLeft = 3, retryWave = 0, retryBossKind = null;
  let dpr = 1, scale = 1, viewW = W, viewH = H, camX = 0, camY = 0;
  const keys = new Set();
  const touch = { x: 0, y: 0, id: null };
  const pointer = {x:W/2,y:H/2,active:false};
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let soundOn = false, audioContext, musicTimer = 0, musicStep = 0, record = 0, musicTrack = -1;
  const achievements = [
    {id:'first_crunch',title:'ERSTER KNACKER',desc:'Besiege deinen ersten Gegner.',goal:1,kind:'progress'},
    {id:'long_run',title:'HAMSTERRAD-MARATHON',desc:'Bewege dich 25.000 Einheiten.',goal:25000,kind:'progress'},
    {id:'wave_runner',title:'WELLENREITER',desc:'Schaffe alle neun Wellen.',goal:9,kind:'progress'},
    {id:'pigsty',title:'SCHWEIN GEHABT',desc:'Besiege 25 Killerferkel.',goal:25,kind:'progress'},
    {id:'power_hungry',title:'POWER-HAMSTER',desc:'Sammle 10 Power-ups.',goal:10,kind:'progress'},
    {id:'weapon_rack',title:'WAFFENKAMMER',desc:'Benutze drei verschiedene Spezialwaffen.',goal:3,kind:'progress'},
    {id:'veggie_fear',title:'MÖHRENALLERGIE',desc:'Besiege 10 Möhren-Gatlings.',goal:10,kind:'progress'},
    {id:'nope_rope',title:'NEIN, DANKE',desc:'Weiche drei Tollwut-Sprints aus.',goal:3,kind:'progress'},
    {id:'wallpaper',title:'WANDDEKO',desc:'Besiege General und Cyber-Hasenbein.',goal:2,kind:'gag'},
    {id:'housepig',title:'HAUSSCHWEIN-HALTER',desc:'Erreiche das geheime Gartenfinale.',goal:1,kind:'gag'},
    {id:'close_call',title:'KNAPPE KISTE',desc:'Beende eine Welle mit höchstens 1 Herz übrig.',goal:1,kind:'gag'},
    {id:'comeback',title:'AUS DEM FELSEN',desc:'Erlebe Karnils zweite Phase.',goal:1,kind:'gag'},
    {id:'intro_story',title:'FELLIGE MOTIVATION',desc:'Sieh dir Snickers’ Jagdgrund an.',goal:1,kind:'gag'},
    {id:'retry_hero',title:'NOCH EINE RUNDE',desc:'Nutze einen Retry in einer Welle oder einem Bosskampf.',goal:1,kind:'gag'},
    {id:'three_strikes',title:'DREI VERSUCHE',desc:'Verbrauche alle drei Retry-Marken.',goal:3,kind:'progress'},
    {id:'full_reload',title:'MUNITIONSHAMSTER',desc:'Sammle 20 seltene Spezialmunitions-Drops.',goal:20,kind:'progress'},
    {id:'boss_breaker',title:'BOSS-BRECHER',desc:'Besiege alle drei Bosse.',goal:3,kind:'progress'},
    {id:'power_mix',title:'POWER-BUFFET',desc:'Sammle fünf verschiedene Power-ups.',goal:5,kind:'progress'},
    {id:'speed_demon',title:'RASERFELL',desc:'Sammle FLINKES FELL ein.',goal:1,kind:'gag'},
    {id:'phase_shift',title:'DURCH DIE WAND',desc:'Werde mit PHASENFELL unberührbar.',goal:1,kind:'gag'},
    {id:'double_trouble',title:'DOPPELT GEMOPPELT',desc:'Aktiviere DOPPELSCHUSS.',goal:1,kind:'gag'},
    {id:'freeze_frame',title:'EINGEFROREN',desc:'Sammle eine EIS-MÖHRE ein.',goal:1,kind:'gag'},
    {id:'score_hog',title:'PUNKTEFERKEL',desc:'Sammle 10.000 Punkte in einem Lauf.',goal:10000,kind:'progress'},
    {id:'arsenal',title:'ARSENAL AUF',desc:'Schalte fünf Waffenarten frei.',goal:5,kind:'progress'},
    {id:'clean_wave',title:'SAUBERE SACHE',desc:'Gewinne eine normale Welle ohne Lebensverlust.',goal:1,kind:'gag'},
    {id:'three_bosses',title:'DREIFACHER ÄRGER',desc:'Erreiche alle drei Bosskämpfe.',goal:3,kind:'progress'},
    {id:'music_rush',title:'BEAT IM BAUCH',desc:'Schalte die rasante Musik ein.',goal:1,kind:'gag'},
    {id:'sniper_nope',title:'KEIN FADENKREUZ',desc:'Weiche drei Scharfschützen-Schüssen aus.',goal:3,kind:'progress'},
    {id:'mine_sweeper',title:'MINENFELD-PROFI',desc:'Überstehe fünf Sapper-Minen-Warnungen.',goal:5,kind:'progress'},
    {id:'nutty_survivor',title:'NUSS MIT NERVEN',desc:'Erreiche Welle 9 mit mindestens einem Retry übrig.',goal:1,kind:'gag'},
    {id:'walnut_boom',title:'WALLNUSS-WUMMS',desc:'Benutze die WALLNUSS-KANONE zum ersten Mal.',goal:1,kind:'gag'},
    {id:'scatter_king',title:'STREUSALZ',desc:'Feuere einmal HASELNUSS-SCHROT ab.',goal:1,kind:'gag'},
    {id:'laser_line',title:'LASERLINIE',desc:'Zünde den MÖHRENLASER.',goal:1,kind:'gag'},
    {id:'rocket_science',title:'RAKETENFELL',desc:'Nutze die EICHEL-RAKETE.',goal:1,kind:'gag'},
    {id:'drill_baby',title:'BOHR DICH DURCH',desc:'Setze den NUSSBOHRER ein.',goal:1,kind:'gag'},
    {id:'crown_found',title:'KRONE GEFUNDEN',desc:'Wähle den Legendary Skill KRONENNUSS.',goal:1,kind:'gag'},
    {id:'ghosted',title:'GEISTERSTUNDE',desc:'Wähle den Legendary Skill GEISTERFELL.',goal:1,kind:'gag'},
    {id:'relic_run',title:'RELIKTJÄGER',desc:'Wähle den Legendary Skill ARSENAL-RELIKT.',goal:1,kind:'gag'},
    {id:'breather',title:'VERSCHNAUFPAUSE',desc:'Verzichte einmal auf ein Upgrade und nimm die Heilungsoption.',goal:1,kind:'gag'},
    {id:'power_encyclopedia',title:'POWER-LEXIKON',desc:'Sammle alle 14 verschiedenen Power-ups mindestens einmal.',goal:14,kind:'progress'},
    {id:'ngplus_start',title:'NOCHMAL MIT ZÄHNEN',desc:'Starte deinen ersten New-Game+-Durchlauf.',goal:1,kind:'gag',ngplus:true,secret:true},
    {id:'ngplus_void',title:'NICHTS IST LEER',desc:'Besiege 10 Leerenhasen in New Game+.',goal:10,kind:'progress',ngplus:true,secret:true},
    {id:'ngplus_rocket',title:'RAKETENABWEHR',desc:'Besiege 10 Raketenhasen in New Game+.',goal:10,kind:'progress',ngplus:true,secret:true},
    {id:'ngplus_juggernaut',title:'SCHWEINEPANZER',desc:'Besiege 5 Juggernaut-Ferkel in New Game+.',goal:5,kind:'progress',ngplus:true,secret:true},
    {id:'ngplus_mustard',title:'MIT SENF, BITTE',desc:'Feuere die NUSS-BAZOOKA MIT SENF ab.',goal:1,kind:'gag',ngplus:true,secret:true},
    {id:'ngplus_first_skill',title:'PLUS ULTRA',desc:'Wähle dein erstes exklusives New-Game+-Upgrade.',goal:1,kind:'gag',ngplus:true,secret:true},
    {id:'ngplus_all_skills',title:'ACHT PLUS',desc:'Sammle acht verschiedene exklusive New-Game+-Skills.',goal:8,kind:'progress',ngplus:true,secret:true},
    {id:'ngplus_phase3',title:'DRITTE RUNDE',desc:'Erreiche Karnils dritte Phase in New Game+.',goal:1,kind:'gag',ngplus:true,secret:true},
    {id:'ngplus_pafti',title:'PAFTI WAR HIER',desc:'Erlebe Paftis Eingriff in Karnils dritte Phase.',goal:1,kind:'gag',ngplus:true,secret:true},
    {id:'ngplus_clear',title:'PLUS DURCHGESPIELT',desc:'Schließe New Game+ vollständig ab.',goal:1,kind:'gag',ngplus:true,secret:true},
    {id:'ng2_start',title:'DOPPELT PLUS',desc:'Starte New Game+2.',goal:1,kind:'gag',ngplus2:true,secret:true},
    {id:'ng2_skill',title:'GARTENVERBOTEN STARK',desc:'Wähle einen exklusiven New-Game+2-Skill.',goal:1,kind:'gag',ngplus2:true,secret:true},
    {id:'ng2_weapon',title:'SCHWERE GESCHÜTZE',desc:'Schalte eine exklusive New-Game+2-Waffe frei.',goal:1,kind:'gag',ngplus2:true,secret:true},
    {id:'ng2_ottah',title:'WARZENSCHWEIN AM HORIZONT',desc:'Erreiche den geheimen Ottah-Kampf.',goal:1,kind:'gag',ngplus2:true,secret:true},
    {id:'ng2_sahne',title:'SAHNEFRIEDEN',desc:'Besiege Ottah und schließe Freundschaft.',goal:1,kind:'gag',ngplus2:true,secret:true},
    {id:'endless_start',title:'KEIN ENDE IN SICHT',desc:'Starte den Endlosmodus.',goal:1,kind:'gag',endless:true,secret:true},
    {id:'endless_10',title:'ZEHN UND KEIN BETT',desc:'Erreiche Welle 10 im Endlosmodus.',goal:1,kind:'gag',endless:true,secret:true},
    {id:'endless_bosses',title:'BOSSKARUSSELL',desc:'Besiege 5 Bosse in einem Endlos-Run.',goal:5,kind:'progress',endless:true,secret:true},
    {id:'endless_25',title:'KNOPPERS-MARATHON',desc:'Erreiche Welle 25 im Endlosmodus.',goal:1,kind:'gag',endless:true,secret:true},
    {id:'endless_hall',title:'UNSTERBLICHER BUILD',desc:'Starte Endlos mit einem Build aus der Hall of Fame.',goal:1,kind:'gag',endless:true,secret:true}
  ];
  let achievementData={};let achievementSets={};try{achievementSets=JSON.parse(localStorage.getItem('snickers3-achievement-sets-v5')||'{}')||{};}catch{}
  try { achievementData=JSON.parse(localStorage.getItem('snickers3-achievements-v4')||localStorage.getItem('snickers3-achievements-v3')||'{}')||{}; } catch {}
  // Remove progress belonging to the retired achievement from older local saves.
  if(achievementData.nutless){
    delete achievementData.nutless;
    try{localStorage.setItem('snickers3-achievements-v4',JSON.stringify(achievementData));}catch{}
  }
  const achievementValue=id=>Number(achievementData[id]?.progress||0);
  const achievementUnlocked=id=>Boolean(achievementData[id]?.unlocked);
  try { record = Math.max(0, Number(localStorage.getItem('snickers3-best-v4')||localStorage.getItem('snickers3-best-v3')) || 0); } catch {}
  if (record) $('menuRecord').textContent = `LOKALER REKORD ${record.toLocaleString('de-DE')}`;

  function resize() {
    const rect = shell.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    scale = Math.max(rect.width / W, rect.height / H);
    viewW = rect.width / scale; viewH = rect.height / scale;
  }
  new ResizeObserver(resize).observe(shell);
  resize();

  let musicTone=false;
  function tone(freq, duration = .1, type = 'sine', volume = .06, endFreq) {
    if (!soundOn || !audioContext || settings.volume<=0 || (musicTone?settings.musicMute:settings.sfxMute)) return;
    try {
      const t = audioContext.currentTime, osc = audioContext.createOscillator(), gain = audioContext.createGain();
      osc.type = type; osc.frequency.setValueAtTime(freq, t);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 20), t + duration);
      gain.gain.setValueAtTime(volume*settings.volume/100, t); gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
      osc.connect(gain); gain.connect(audioContext.destination); osc.start(t); osc.stop(t + duration);
    } catch {}
  }
  function toggleSound() {
    soundOn = !soundOn;
    if (soundOn) {
      try { audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); audioContext.resume().catch(() => {}); }
      catch { soundOn = false; toast('Dieser Browser unterstützt leider keinen Spielton.'); }
    }
    $('soundButton').setAttribute('aria-pressed', String(soundOn));
    $('soundButton').setAttribute('aria-label', soundOn ? 'Ton ausschalten' : 'Ton einschalten');
    $('soundButton').title = soundOn ? 'Ton ausschalten' : 'Ton einschalten';
    $('soundWaves').setAttribute('d', soundOn ? 'M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14' : 'm16 9 6 6m0-6-6 6');
    if (soundOn) {  tone(660, .14, 'triangle', .06, 880); }
  }
  function music(dt) {
    if (!soundOn || settings.musicMute || settings.volume<=0) return;
    musicTimer -= dt;
    if (musicTimer <= 0) {
      const track = boss?.karnil ? {bpm:238,notes:[98,147,196,247,294,392,294,247]} : boss?.cyber ? {bpm:226,notes:[123,155,196,247,311,392,311,247]} : boss ? {bpm:218,notes:[147,185,220,277,330,415,330,277]} : waveTracks[clamp(wave,0,waveTracks.length-1)];
      if(musicTrack!==wave){musicStep=0;musicTrack=wave;}
      musicTimer = 60 / track.bpm;
      const notes = track.notes;
      musicTone=true;
      tone(notes[musicStep % notes.length], .18, 'triangle', .035);
      tone(notes[(musicStep+2) % notes.length] * 2, .08, 'square', .013);
      if (musicStep % 4 === 0) tone(notes[0] / 2, .09, 'sine', .085, notes[0]/4);
      musicTone=false;musicStep++;
    }
  }
  function toast(message) {
    $('loadingNotice').textContent = message; $('loadingNotice').classList.remove('hidden');
    clearTimeout(noticeTimer); noticeTimer = setTimeout(() => $('loadingNotice').classList.add('hidden'), 2800);
  }
  function saveAchievements(){achievementDirty=true;}
  function unlockAchievement(id,amount=1){
    const item=achievements.find(a=>a.id===id);if(!item||achievementUnlocked(id))return;
    const current=achievementValue(id)+amount;achievementData[id]={progress:Math.min(item.goal,current),unlocked:current>=item.goal};saveAchievements();
    if(current>=item.goal){flushAchievements();
      $('achievementHud').innerHTML=`<span class="achievement-pop"><b>★ ACHIEVEMENT</b><strong>${item.title}</strong><small>${item.desc}</small></span>`;$('achievementHud').classList.remove('hidden');
      clearTimeout(achievementTimer);achievementTimer=setTimeout(()=>$('achievementHud').classList.add('hidden'),4700);tone(740,.12,'triangle',.07,1040);setTimeout(()=>tone(1040,.22,'triangle',.06,1480),100);
    }
  }
  function addAchievementProgress(id,amount=1){
    const item=achievements.find(a=>a.id===id);if(!item||achievementUnlocked(id))return;unlockAchievement(id,amount);
  }
  function showAchievements(){
    if(mode!=='menu')return;mode='achievements';
    const rows=achievements.map(a=>{const hidden=a.secret&&(a.impossible?!hardProgress.endless:a.hard?!hardUnlocked():a.ngplus2?!ngPlus2EverUnlocked:a.endless?!hallOfFame.length:!ngPlusEverUnlocked);if(hidden){const reveal=a.impossible?'Wird nach Hard NG+2 enthüllt.':a.hard?'Wird nach dem normalen NG+2-Abschluss enthüllt.':a.endless?'Wird mit dem Endlosmodus enthüllt.':a.ngplus2?'Wird mit New Game+2 enthüllt.':'Wird mit New Game+ enthüllt.';return `<div class="achievement-row secret-achievement"><span class="achievement-badge">?</span><div><strong>???</strong><small>GEHEIM · ${reveal}</small><div class="achievement-track"><i style="width:0%"></i></div></div><b>—</b></div>`;}const value=Math.min(a.goal,achievementValue(a.id)),done=achievementUnlocked(a.id),pct=value/a.goal*100;return `<div class="achievement-row ${done?'done':''}${a.ngplus?' ngplus-achievement':''}"><span class="achievement-badge">${done?'★':'○'}</span><div><strong>${a.title}</strong><small>${a.desc}</small><div class="achievement-track"><i style="width:${pct}%"></i></div></div><b>${value}/${a.goal}</b></div>`;}).join('');
    showOverlay(`<span class="eyebrow">DEINE NUSS-CHRONIK</span><h2 id="overlayTitle">ACHIEVEMENTS</h2><p>${achievements.filter(a=>achievementUnlocked(a.id)).length} von ${achievements.length} freigeschaltet.</p><div class="achievement-list">${rows}</div><button class="primary-button" id="achievementClose">ZURÜCK <span>↗</span></button>`);$('achievementClose').onclick=()=>{mode='menu';hideOverlay();$('startButton').focus();};
  }
  function announce(kicker, title) {
    $('announcementKicker').textContent = kicker; $('announcementTitle').textContent = title;
    const el = $('announcement'); el.classList.add('hidden'); void el.offsetWidth; el.classList.remove('hidden');
    clearTimeout(announcementTimer); announcementTimer = setTimeout(() => el.classList.add('hidden'), 2800);
  }
  function showOverlay(html) {
    clearTimeout(noticeTimer);$('loadingNotice').classList.add('hidden');
    $('overlayContent').innerHTML = html; $('overlay').classList.remove('hidden');$('overlay').scrollTop=0;
    $('overlayContent').setAttribute('tabindex','-1');requestAnimationFrame(() => $('overlayContent').focus({preventScroll:true}));
  }
  function hideOverlay() { $('overlay').classList.add('hidden'); $('overlayContent').innerHTML = ''; canvas.focus({ preventScroll: true }); }
  function applySettings(persist=true) {
    const theme=themes[settings.theme], color=accents[settings.accent], root=document.documentElement;
    root.dataset.theme=settings.theme;
    for(const [key,value] of Object.entries({'--bg':theme.bg,'--panel':theme.panel,'--line':theme.line,'--dim':theme.dim,'--bg-rgb':theme.rgb,'--lime':color.hex,'--accent-rgb':color.rgb}))root.style.setProperty(key,value);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme.bg);
    makeGround();
    if(persist)try{localStorage.setItem('snickers3-settings-v4',JSON.stringify(settings));}catch{}
  }
  function showSettings() {
    if(!['menu','playing','paused','settings'].includes(mode))return;
    if(mode!=='settings')settingsReturn=mode;
    mode='settings';resetInput();$('announcement').classList.add('hidden');
    showOverlay(`<span class="eyebrow">DEIN HAMSTER. DEINE FARBEN.</span><h2 id="overlayTitle">EINSTELLUNGEN</h2><div class="settings-section"><h3>Farbwelt</h3><div class="theme-options">${Object.entries(themes).map(([id,t])=>`<button class="theme-option" id="theme-${id}" aria-pressed="${settings.theme===id}"><span class="theme-preview" style="background:linear-gradient(130deg,${t.ground[0]},${t.bg})"></span><strong>${t.name}</strong><small>${t.note}</small><span class="choice-check" aria-hidden="true">✓</span></button>`).join('')}</div></div><div class="settings-section"><h3>UI-Farbe</h3><div class="accent-options">${Object.entries(accents).map(([id,a])=>`<button id="accent-${id}" class="accent-option" aria-pressed="${settings.accent===id}"><span style="background:${a.hex}"></span>${a.name}<i class="choice-check" aria-hidden="true">✓</i></button>`).join('')}</div></div><div class="settings-section audio-section"><h3>Audio</h3><label for="masterVolume">GESAMTLAUTSTÄRKE <output id="volumeValue">${settings.volume} %</output></label><input id="masterVolume" type="range" min="0" max="100" step="1" value="${settings.volume}"><div class="mute-options"><label><input id="musicMute" type="checkbox" ${settings.musicMute?'checked':''}> Musik stumm</label><label><input id="sfxMute" type="checkbox" ${settings.sfxMute?'checked':''}> Soundeffekte und Sprache stumm</label></div></div><div class="settings-section rebirth-section"><h3>Hamsterneugeburt</h3><p>Setze ausgewählte lokale Fortschrittsdaten zurück.</p><button class="secondary-button rebirth-open" id="rebirthOpen">🐹 HAMSTERNEUGEBURT</button></div><p class="settings-note">Farbwelt und UI-Farbe werden auf diesem Gerät gespeichert. Das laufende Spiel pausiert hier.</p><button class="primary-button" id="settingsClose">FERTIG <span>↗</span></button>`);
    for(const id of Object.keys(themes))$(`theme-${id}`).onclick=()=>{settings.theme=id;applySettings();for(const k of Object.keys(themes))$(`theme-${k}`).setAttribute('aria-pressed',String(k===id));};
    for(const id of Object.keys(accents))$(`accent-${id}`).onclick=()=>{settings.accent=id;applySettings();for(const k of Object.keys(accents))$(`accent-${k}`).setAttribute('aria-pressed',String(k===id));};
    const saveAudio=()=>{try{localStorage.setItem('snickers3-settings-v4',JSON.stringify(settings));}catch{}};
    $('masterVolume').oninput=()=>{settings.volume=Number($('masterVolume').value);$('volumeValue').textContent=settings.volume+' %';if(!settings.volume)stopBossSpeech();saveAudio();};
    $('musicMute').onchange=()=>{settings.musicMute=$('musicMute').checked;saveAudio();};
    $('sfxMute').onchange=()=>{settings.sfxMute=$('sfxMute').checked;if(settings.sfxMute)stopBossSpeech();saveAudio();};
    $('rebirthOpen').onclick=showHamsterRebirth;
    $('settingsClose').onclick=closeSettings;
  }
  function showHamsterRebirth(){
    if(mode!=='settings')return;
    showOverlay(`<span class="eyebrow">OPTIONEN · LOKALE DATEN</span><h2 id="overlayTitle">HAMSTERNEUGEBURT</h2><p>Wähle aus, was auf diesem Gerät zurückgesetzt werden soll. Nicht angehakte Daten bleiben erhalten.</p><div class="rebirth-options"><label class="rebirth-choice"><input type="checkbox" id="resetAchievements"><span><strong>Achievements zurücksetzen</strong><small>Setzt alle Achievements und deren Fortschritt auf 0.</small></span></label><label class="rebirth-choice"><input type="checkbox" id="resetHighscore"><span><strong>Highscore zurücksetzen</strong><small>Löscht den lokal gespeicherten Rekord.</small></span></label><label class="rebirth-choice"><input type="checkbox" id="resetRun"><span><strong>Run / New Game+ zurücksetzen</strong><small>Löscht den fortsetzbaren Run sowie normale und Hard-Sieger-Builds für NG+/NG+2. Die Hall of Fame und darüber freigeschaltete Modi bleiben erhalten.</small></span></label></div><div class="overlay-actions"><button class="secondary-button" id="rebirthBack">ZURÜCK</button><button class="primary-button danger-button" id="rebirthConfirm" disabled>NEUGEBURT STARTEN <span>↻</span></button></div>`);
    const ach=$('resetAchievements'),high=$('resetHighscore'),run=$('resetRun'),confirm=$('rebirthConfirm');
    const sync=()=>{confirm.disabled=!(ach.checked||high.checked||run.checked);};
    ach.onchange=sync;high.onchange=sync;run.onchange=sync;
    $('rebirthBack').onclick=showSettings;
    confirm.onclick=()=>{
      if(confirm.disabled)return;
      const done=[];
      if(ach.checked){achievementData={};achievementSets={};try{localStorage.removeItem('snickers3-achievement-sets-v5');}catch{}try{localStorage.removeItem('snickers3-achievements-v4');localStorage.removeItem('snickers3-achievements-v3');}catch{}$('achievementHud').classList.add('hidden');done.push('Achievements');}
      if(high.checked){record=0;try{localStorage.removeItem('snickers3-best-v4');localStorage.removeItem('snickers3-best-v3');}catch{}$('menuRecord').textContent='';done.push('Highscore');}
      if(run.checked){impossibleProgress.ngplus=false;impossibleProgress.ngplus2=false;impossibleProgress.ngBuild=null;impossibleProgress.ng2Build=null;saveImpossibleProgress();endRunSession(true);settingsReturn='menu';player=null;hardProgress={unlocked:hardUnlocked(),ngplus:false,ngplus2:false,endless:hallOfFame.some(r=>r.hardMode),ngBuild:null,ng2Build:null};saveHardProgress();goMenu();mode='settings';ngPlusUnlocked=false;ngPlusBuild=null;ngPlus2Unlocked=false;ngPlus2Build=null;try{localStorage.removeItem('snickers3-ngplus-unlocked-v1');localStorage.removeItem('snickers3-ngplus-build-v1');localStorage.removeItem('snickers3-ngplus2-unlocked-v1');localStorage.removeItem('snickers3-ngplus2-build-v1');}catch{}updateNGPlusMenu();done.push('Run / New Game+');}
      showOverlay(`<span class="eyebrow">HAMSTERNEUGEBURT ABGESCHLOSSEN</span><h2 id="overlayTitle">FRISCH AUS DEM NEST.</h2><p>${done.join(', ')} wurde zurückgesetzt.</p><button class="primary-button" id="rebirthDone">ZURÜCK ZU DEN OPTIONEN <span>↗</span></button>`);
      $('rebirthDone').onclick=showSettings;
    };
  }
  function closeSettings() {
    if(mode!=='settings')return;
    if(settingsReturn==='paused'){mode='playing';pauseGame();return;}
    mode=settingsReturn;hideOverlay();lastFrame=performance.now();
    if(mode==='menu')$('settingsButton').focus();
  }
  function resetInput() {
    keys.clear(); touch.x = touch.y = 0; touch.id = null;
    $('joystickThumb').style.transform = 'translate(0,0)';
  }
  const ngPlusCarryKeys=['maxHp','speed','dashCooldown','damage','fireRate','spread','pierce','magnet','frost','chain','orbit','nutSentry','carrotDrone','eggBooger','merzEggs','shield','vampire','powerLuck','ammoBonus','ammoDropLuck','specialDamage','damageGuard','pickupLifeBonus','bossDamage','homing','crit','shockDash','ammoRefillBonus','scoreRushBonus','powerDuration','nutstorm','waveRenew','turretVolley','mustardTrail','dashNova','executioner','powerFrenzy','dodgeChance','deathBurst','deathBurstKills','ammoAlchemy','sniebelPlate','lominarWorm','ng2Reactor','ng2TimeField','ng2Turret','lominarX','lominarY','lominarDir','rabbitDamage','brothBox','hunnaExpert','breadHalo','creamHeart','thunderCrumbs','nutFan','rearNut','hotChamber','nutDropping','snickersBar','candyBuffs','beagle','narrath','ricochet','emergencyReserve','phaseCapacitor','lastBite','scavengerPulse','adrenaline','ratKing','stormOrbit','survivalInstinct','bombBonus','shuffleBonusBank','duden','krokette','bingoMaster','potencyMinister','steelMuzzle','starIndex','goldenTalisman','rabbitReckoning','ngFlicker','ngLedger','ng2Pulse','ng2Shell','endlessHarvest','endlessShield'];
  function captureNGPlusBuild(p){
    const build={schemaVersion:4,hardMode:Boolean(p.hardMode)};for(const k of ngPlusCarryKeys)if(p[k]!==undefined)build[k]=typeof p[k]==='object'?JSON.parse(JSON.stringify(p[k])):p[k];
    build.skills={...(p.skills||{})};build.specials={...(p.specials||{})};build.weapons=[...(p.weapons||['nutBomb'])];build.scorePerks={...(p.scorePerks||{})};if(trollQuest&&trollQuest.status!=='reward')build.trollCarry=cloneData(trollQuest);return build;
  }
  function levelMap(value){
    if(Array.isArray(value))return Object.fromEntries(value.map(id=>[id,1]));
    return Object.fromEntries(Object.entries(value||{}).filter(([,n])=>Number(n)>0).map(([id,n])=>[id,Math.floor(Number(n))]));
  }
  function hallBuild(entry){
    const b=entry.build||{};
    return {...b,hardMode:Boolean(entry.hardMode??b.hardMode),maxHp:b.maxHp??entry.maxHp,skills:levelMap(b.skills??entry.skills),specials:levelMap(b.specials??entry.specials),weapons:[...new Set(b.weapons??entry.weapons??['nutBomb'])],scorePerks:{...(entry.scorePerks||{}),...(b.scorePerks||{})}};
  }
  function restoreBuildValues(build){
    const p=createPlayer(),skills=levelMap(build.skills),specials=levelMap(build.specials);
    const books={...skillBook,...legendarySkillBook,...ngPlusSkillBook,...ngPlus2SkillBook,...survivalSkillBook};
    // Legacy records sometimes contain names/levels only. Reconstruct missing values.
    for(const id of Object.keys(skills)){const c=books[id];if(c&&!c.weapon){if(id==='snickersBar'&&build.candyBuffs)p.candyBuffs=[...build.candyBuffs];c.apply(p);}}
    for(const id of Object.keys(specials))specialUpgradeBook[id]?.apply(p);
    const perks={...p.scorePerks,...levelMap(build.scorePerks)};
    for(const [id,n] of Object.entries(perks))if(id!=='shuffle')for(let i=0;i<Math.min(1000,n);i++)scoreSkillBook[id]?.apply(p);
    // Saved final values already include perks. Use them exactly, never multiply twice.
    for(const k of ngPlusCarryKeys)if(build[k]!==undefined)p[k]=build[k];
    p.skills=skills;p.specials=specials;p.scorePerks=perks;
    p.weapons=[...new Set(['nutBomb',...(build.weapons||[])])].filter(id=>weaponBook[id]);
    normalizeBuild(p);return p;
  }
  function applyNGPlusBuild(p,build){
    if(!build)return;
    const restored=restoreBuildValues(build);
    for(const k of ngPlusCarryKeys)if(restored[k]!==undefined)p[k]=restored[k];
    p.skills={...restored.skills};p.specials={...restored.specials};p.weapons=[...restored.weapons];p.scorePerks={...restored.scorePerks};
    p.weaponUses={};for(const id of p.weapons)p.weaponUses[id]=(weaponBook[id]?.max||0)+(p.ammoBonus||0)+(id==='nutBomb'?(p.bombBonus||0):0);
    p.weaponIndex=0;p.hp=p.maxHp;p.shieldReady=Boolean(p.shield);p.shieldCd=0;p.nutSentryCd=0;p.carrotDroneCd=0;p.eggBoogerCd=0;p.eggBoogerAnim=0;p.eggBoogerFrom=null;p.eggBoogerTo=null;p.merzEggCd=0;p.ossiWallTime=0;
  }
  function scorePerkLevels(p){return Object.values(p?.scorePerks||{}).reduce((a,b)=>a+Number(b||0),0);}
  function scoreSkillCost(level){return 50000+level*25000;}
  function initializeScoreSkillProgress(p){p.scoreSkillQueue=[];p.scoreSkillNext=scoreSkillCost(scorePerkLevels(p));}
  function persistProgressionWin(){
    if(!player)return;
    if(impossibleMode){persistImpossibleWin();return;}
    if(hardMode){persistHardWin();return;}
    const build=captureNGPlusBuild(player);
    if(gamePlusLevel===0){
      ngPlusUnlocked=true;ngPlusBuild=build;ngPlusEverUnlocked=true;
      try{localStorage.setItem('snickers3-ngplus-unlocked-v1','1');localStorage.setItem('snickers3-ngplus-build-v1',JSON.stringify(build));localStorage.setItem('snickers3-ngplus-ever-v1','1');}catch{}
    }else if(gamePlusLevel===1){
      ngPlus2Unlocked=true;ngPlus2Build=build;ngPlusEverUnlocked=true;ngPlus2EverUnlocked=true;
      try{localStorage.setItem('snickers3-ngplus2-unlocked-v1','1');localStorage.setItem('snickers3-ngplus2-build-v1',JSON.stringify(build));localStorage.setItem('snickers3-ngplus-ever-v1','1');localStorage.setItem('snickers3-ngplus2-ever-v1','1');}catch{}
    }else if(gamePlusLevel===2){
      const entry={hardMode:false,gamePlusLevel:2,completedAt:new Date().toISOString(),score,kills,time:Math.floor(runTime),maxHp:player.maxHp,retriesLeft,skills:Object.keys(player.skills||{}),specials:Object.keys(player.specials||{}),weapons:[...(player.weapons||[])],scorePerks:{...(player.scorePerks||{})},build:captureNGPlusBuild(player)};
      hallOfFame=[entry,...hallOfFame];
      ngPlusUnlocked=false;ngPlusBuild=null;ngPlus2Unlocked=false;ngPlus2Build=null;
      try{localStorage.setItem('snickers3-hall-of-fame-v1',JSON.stringify(hallOfFame));localStorage.removeItem('snickers3-ngplus-unlocked-v1');localStorage.removeItem('snickers3-ngplus-build-v1');localStorage.removeItem('snickers3-ngplus2-unlocked-v1');localStorage.removeItem('snickers3-ngplus2-build-v1');}catch{}
    }
    updateNGPlusMenu();
  }
  function updateNGPlusMenu(){
    const b1=$('ngPlusButton'),b2=$('ngPlus2Button'),hall=$('hallOfFameButton'),endless=$('endlessButton');
    if(b1)b1.classList.toggle('hidden',!(ngPlusUnlocked&&ngPlusBuild));
    if(b2)b2.classList.toggle('hidden',!(ngPlus2Unlocked&&ngPlus2Build));
    if(hall)hall.classList.toggle('hidden',!hallOfFame.length);
    if(endless)endless.classList.toggle('hidden',!hallOfFame.length);
  }
  const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const displayNumber=value=>Number(value||0).toLocaleString('de-DE',{maximumFractionDigits:2});
  const allSkillInfo=id=>skillBook[id]||legendarySkillBook[id]||ngPlusSkillBook[id]||ngPlus2SkillBook[id]||survivalSkillBook[id];
  function runDate(r){const date=new Date(r.completedAt);return Number.isNaN(date.getTime())?'Datum unbekannt':date.toLocaleString('de-DE',{dateStyle:'medium',timeStyle:'short'});}
  function runSummary(r,i,source){
    const b=hallBuild(r),skillCount=Object.keys(b.skills).filter(id=>!allSkillInfo(id)?.weapon).length;
    return `<button class="run-card" id="${source}Run${i}"><span class="run-card-medal" aria-hidden="true">♛</span><span class="run-card-main"><span class="run-card-heading"><strong>RUN ${hallOfFame.length-i}</strong><small>NG+2 ABGESCHLOSSEN</small></span><span class="run-card-date">${escapeHTML(runDate(r))}</span><span class="run-card-score">${displayNumber(r.score)} <small>PUNKTE</small></span><span class="run-card-tags"><span>${skillCount} Skills</span><span>${b.weapons.length} Waffen</span><span>${Object.keys(b.specials).length} Boss-Upgrades</span><span>${scorePerkLevels(b)} Punkte-Boni</span></span></span><span class="run-card-arrow" aria-hidden="true">↗</span></button>`;
  }
  function showHallOfFame(){
    if(!['menu','hallDetail'].includes(mode)||!hallOfFame.length)return;mode='hallOfFame';
    showOverlay(`<span class="eyebrow">DIE UNSTERBLICHEN KNABBERLÄUFE</span><h2 id="overlayTitle">HALL OF FAME</h2><p>${hallOfFame.length} abgeschlossene NG+2-Runs. Klicke auf einen Run, um seinen vollständigen Build und alle Werte anzusehen.</p><div class="hall-run-list">${hallOfFame.map((r,i)=>runSummary(r,i,'hall')).join('')}</div><button class="secondary-button" id="hallClose">ZURÜCK ZUM MENÜ</button>`);
    hallOfFame.forEach((r,i)=>{$(`hallRun${i}`).onclick=()=>showRunDetail(i,'hall');});
    $('hallClose').onclick=()=>{mode='menu';hideOverlay();$('hallOfFameButton').focus();};
  }
  function startHallRun(index){
    endlessSelectedBuild=hallBuild(hallOfFame[index]);endlessFromHall=true;startGame(3);
  }
  function showEndlessSelect(){
    if(!['menu','hallDetail'].includes(mode)||!hallOfFame.length)return;mode='endlessSelect';
    showOverlay(`<span class="eyebrow">ENDLOSMODUS · BUILD WÄHLEN</span><h2 id="overlayTitle">KEIN FEIERABEND.</h2><p>Starte frisch oder wähle einen deiner ${hallOfFame.length} abgeschlossenen NG+2-Runs. Hall-Builds übernehmen alle Waffen, Skills und permanenten Werte inklusive Punkte-Boni.</p><button class="endless-build-card fresh" id="endlessFresh"><strong>◌ KOMPLETT FRISCH STARTEN</strong><small>Normal-Niveau · ohne übernommene Upgrades</small></button><div class="hall-run-list endless-run-list">${hallOfFame.map((r,i)=>runSummary(r,i,'endless')).join('')}</div><button class="secondary-button" id="endlessBack">ZURÜCK ZUM MENÜ</button>`);
    $('endlessFresh').onclick=()=>{endlessSelectedBuild=null;endlessFromHall=false;startGame(3);};
    hallOfFame.forEach((r,i)=>{$(`endlessRun${i}`).onclick=()=>showRunDetail(i,'endless');});
    $('endlessBack').onclick=()=>{mode='menu';hideOverlay();$('endlessButton').focus();};
  }
  function buildCards(ids,lookup,kind){
    if(!ids.length)return '<p class="build-empty">Keine gewählt.</p>';
    return `<div class="build-card-grid">${ids.map(id=>{const c=lookup(id);return `<article class="build-item ${kind}"><span class="build-item-icon" aria-hidden="true">${escapeHTML(c?.icon||'•')}</span><div><strong>${escapeHTML(c?.title||c?.name||id)}</strong><small>${escapeHTML(c?.desc||'Aus einem früheren Run übernommen.')}</small></div></article>`;}).join('')}</div>`;
  }
  function perkEffect(id,n){
    if(id==='heart')return '+'+n+' max. Herzen';if(id==='ammo')return '+'+n+' Ladungen';if(id==='shuffle')return '+'+n+' einmal erhalten';
    if(id==='dodge')return '+'+displayNumber(Math.min(40,n*2))+' %-Punkte';
    if(id==='dash')return '−'+displayNumber((1-Math.pow(.9,n))*100)+' % Cooldown';
    return '+'+displayNumber((Math.pow(1.1,n)-1)*100)+' %';
  }
  function showRunDetail(index,source='hall'){
    const r=hallOfFame[index];if(!r)return;mode='hallDetail';const p=restoreBuildValues(hallBuild(r));
    showOverlay(`<div class="run-detail-header"><span class="eyebrow">HALL OF FAME · NG+2 ABGESCHLOSSEN</span><h2 id="overlayTitle">RUN ${hallOfFame.length-index}</h2><p>${escapeHTML(runDate(r))} · ${displayNumber(r.score)} Punkte · ${displayNumber(r.kills)} Gegner · ${formatTime(r.time||0)}</p></div><div class="run-detail-actions"><button class="secondary-button" id="runDetailBack">← ALLE RUNS</button><button class="primary-button" id="runDetailStart">IM ENDLOSMODUS STARTEN ↗</button></div>${buildDetailsMarkup(p,false)}<div class="run-detail-nav"><button class="secondary-button" id="runPrev" ${index===0?'disabled':''}>← NEUERER RUN</button><button class="secondary-button" id="runNext" ${index===hallOfFame.length-1?'disabled':''}>ÄLTERER RUN →</button></div>`);
    $('runDetailBack').onclick=()=>source==='endless'?showEndlessSelect():showHallOfFame();$('runDetailStart').onclick=()=>startHallRun(index);$('runPrev').onclick=()=>showRunDetail(index-1,source);$('runNext').onclick=()=>showRunDetail(index+1,source);bindBuildJumps();
  }
  function createPlayer(){
    return { x: W / 2, y: H / 2 + 25, r: 18, hp: 5, maxHp: 5, speed: 264, invuln: 1.8, dashCd: 0, dashCooldown:2.25, dashTime: 0, dashX: 1, dashY: 0, face: 1, moving: false, angle: 0, bombs: 2, damage: 1.4, fireRate: .32, spread: 0, nutFan:false, rearNut:false, hotChamber:false, pierce: 0, magnet: 90, trail: [], skills:{}, frost:false, chain:false, orbit:false, orbitCd:0, nutSentry:false, nutSentryCd:0, carrotDrone:false, carrotDroneCd:0, shield:false, shieldReady:false, shieldCd:0, vampire:false, vampireKills:0, shotCount:0, weapons:['nutBomb'],weaponIndex:0,weaponUses:{nutBomb:3},usedWeapons:new Set(),powerups:{},powerLuck:1,powerDryKills:0,ammoBonus:0,ammoDropLuck:1,ammoDropsThisWave:0,ammoDropTarget:0,ammoDryKills:0,waveAmmoSnapshot:null,bossAmmoSnapshot:null,bossPhaseAmmoSnapshot:null,specialDamage:1,damageGuard:0,dodgeChance:0,sniebelPlate:false,lominarWorm:false,lominarX:-80,lominarY:360,lominarDir:1,lominarHitCd:0,ng2Reactor:false,ng2TimeField:false,ng2Turret:false,powerSeen:new Set(),moveDistance:0,dashCount:0,weaponShots:0,usedBombThisWave:false,lastWaveKills:0,waveHits:0,scoreSkillNext:50000,scoreSkillQueue:[],specialCd:0,runShuffle:1,shuffleBonusBank:0,waveShuffle:0,shuffleCount:0,bombBonus:0,candyBuffs:[],scorePerks:{damage:0,speed:0,fireRate:0,dash:0,powerLuck:0,dodge:0,heart:0,ammo:0,shuffle:0} };
  }
  let importedStartBuild=null;
  function startGame(level=0,hard=false,impossible=false) {
    if(!canStartMode(Number(level)||0,hard,endlessSelectedBuild,impossible))return;
    impossibleMode=Boolean(impossible);hardMode=Boolean(hard||impossible);
    clearTimeout(announcementTimer); clearTimeout(noticeTimer); resetInput();
    gamePlusLevel=Number(level)||0;endlessMode=gamePlusLevel===3;newGamePlus=gamePlusLevel===1||gamePlusLevel===2;newGamePlus2=gamePlusLevel===2;
    const carryBuild=endlessMode?endlessSelectedBuild:gamePlusLevel===0&&importedStartBuild?importedStartBuild:(impossibleMode?(gamePlusLevel===2?impossibleProgress.ng2Build:gamePlusLevel===1?impossibleProgress.ngBuild:null):hardMode?(gamePlusLevel===2?hardProgress.ng2Build:gamePlusLevel===1?hardProgress.ngBuild:null):(gamePlusLevel===2?ngPlus2Build:gamePlusLevel===1?ngPlusBuild:null));
    if(gamePlusLevel===1&&!((impossibleMode?impossibleProgress.ngplus:hardMode?hardProgress.ngplus:ngPlusUnlocked)&&carryBuild))return;
    if(gamePlusLevel===2&&!((impossibleMode?impossibleProgress.ngplus2:hardMode?hardProgress.ngplus2:ngPlus2Unlocked)&&carryBuild))return;
    importedStartBuild=null;
    player = createPlayer();
    if(newGamePlus||endlessMode&&carryBuild||gamePlusLevel===0&&carryBuild){
      applyNGPlusBuild(player,carryBuild);initializeScoreSkillProgress(player);
      const ownedNgSkills=Object.keys(ngPlusSkillBook).filter(id=>player.skills[id]).length;
      if(ownedNgSkills){addAchievementProgress('ngplus_first_skill');const missing=Math.max(0,Math.min(8,ownedNgSkills)-achievementValue('ngplus_all_skills'));if(missing)addAchievementProgress('ngplus_all_skills',missing);}
    }else initializeScoreSkillProgress(player);
    enemies = []; bullets = []; enemyBullets = []; particles = []; pickups = []; hazards = []; floaters = []; thrownWeapons = []; ossiWalls = [];
    poisonPatches=[];ratSwarms=[];minibossPlan=null;lastMiniWave=-99;victoryAfter=null;activeRewardChoices=[];normalizeBuild(player);
    wave = 0; waveTime = 0; runTime = 0; score = 0; kills = 0; boss = null; generalDefeated=false; cyberDefeated=false; lastDefeatedBoss=''; retriesLeft=3;retryWave=0;retryBossKind=null; spawnTimer = .65; shotTimer = .2; shake = 0; bombFlash = 0; musicStep = 0; musicTrack=-1; pointer.x=W/2;pointer.y=H/2;pointer.active=false;
    endlessBossesDefeated=0;stageVisual=endlessMode?randomStage():0;stagePrepared=endlessMode;makeGround();
    mode = 'intro';
    $('startScreen').classList.add('hidden'); $('hud').classList.remove('hidden'); $('hud').setAttribute('aria-hidden', 'false');
    $('runInfo').classList.remove('hidden'); $('pauseButton').classList.remove('hidden'); $('touchControls').classList.remove('hidden'); $('bossHud').classList.add('hidden'); $('loadingNotice').classList.add('hidden');$('powerHud').classList.add('hidden');$('achievementHud').classList.add('hidden');
    $('skillHud').classList.add('hidden');$('skillHud').innerHTML='';
    updateHud(); updateWeaponHud(); updatePowerHud();updateSkills();
    const intro=endlessMode?`<span class="eyebrow ngplus-kicker">ENDLOSMODUS · KEIN FEIERABEND</span><h2 id="overlayTitle">WELLEN BIS DER GARTEN AUFGIBT.</h2><p>${endlessFromHall?'Du startest mit einem vollständigen Hall-of-Fame-Build auf NG+2-Niveau.':'Du startest mit einem frischen Build auf Normal-Niveau.'} Neue Gegnertypen werden stufenweise freigeschaltet; jede Welle wird härter und jede fünfte Welle endet mit einem Boss.</p><blockquote class="snickers-quote"><b>SNICKERS</b>„Unendlich ist auch nur sehr oft neun.“</blockquote><button class="primary-button ngplus-button" id="introButton">ENDLOSMODUS STARTEN <span>↗</span></button>`:gamePlusLevel===2?'<span class="eyebrow ngplus-kicker">NEW GAME+2 · JETZT WIRD ES UNVERNÜNFTIG</span><h2 id="overlayTitle">RUNDE DREI. ENDE DER NAHRUNGSKETTE.</h2><p>Dein kompletter NG+-Build bleibt. Die Gegner sind gegenüber NG+ nochmals härter, aber die Skalierung bleibt abgestuft: mehr Leben, höherer Druck, stärkere Treffer und mehr Elite-Gegner.</p><blockquote class="snickers-quote"><b>SNICKERS</b>„Danach ist Schluss. Entweder mit den Hasen oder mit dem Garten.“</blockquote><button class="primary-button ngplus-button" id="introButton">NEW GAME+2 STARTEN <span>↗</span></button>':gamePlusLevel===1?'<span class="eyebrow ngplus-kicker">NEW GAME+ · DIE HASEN HABEN NICHT GELERNT</span><h2 id="overlayTitle">RUNDE ZWEI. KEINE AUSREDEN.</h2><p>Snickers behält seinen kompletten Build. Dafür steigen Gegnerdichte, Leben, Tempo und Angriffsdruck kontrolliert an; neue Elite-Verstärkung kommt dazu.</p><blockquote class="snickers-quote"><b>SNICKERS</b>„Ihr wolltet mehr? Ich habe meine Upgrades mitgebracht.“</blockquote><button class="primary-button ngplus-button" id="introButton">NEW GAME+ STARTEN <span>↗</span></button>':'<span class="eyebrow">VORSPANN · DIE ERSTE NUSS</span><h2 id="overlayTitle">DER FELLIGE FRIEDEN IST VORBEI.</h2><p>Snickers putzt gerade gemütlich sein Fell. Da schnappt sich ein frecher Hase seine Nuss und hoppelt davon. Snickers wird wütend, schnappt sich den Blaster und geht auf Hasenjagd.</p><blockquote class="snickers-quote"><b>SNICKERS</b>„Meine Nuss. Meine Regeln.“</blockquote><button class="primary-button" id="introButton">HASENJAGD STARTEN <span>↗</span></button>';
    showOverlay(impossibleMode?`<span class="eyebrow impossible-kicker">IMPOSSIBLE · ${gamePlusLevel===2?'NEW GAME+2':gamePlusLevel===1?'NEW GAME+':'NORMAL'}</span><h2 id="overlayTitle">DIE FÄULNIS HAT ZÄHNE.</h2><p>Neue verdorbene Gegner, zwei zusätzliche Phasen je Hauptboss und mehr Schaden. ${gamePlusLevel===2?'Ottah und Pafti kämpfen am Ende gemeinsam.':''}</p><button class="primary-button" id="introButton">IMPOSSIBLE STARTEN ↗</button>`:intro);$('introButton').onclick=beginFirstWave;beginRunSession(carryBuild);
  }
  function beginFirstWave(){
    if(mode!=='intro')return;
    if(newGamePlus)addAchievementProgress('ngplus_start');if(gamePlusLevel===2)addAchievementProgress('ng2_start');if(endlessMode){addAchievementProgress('endless_start');if(endlessFromHall)addAchievementProgress('endless_hall');}
    tone(330,.3,'triangle',.08,660);startWave(0);
  }
  function goMenu() {
    saveRunNow();mode = 'menu';victoryAfter=null;flushAchievements();resetInput(); hideOverlay();
    $('startScreen').classList.remove('hidden'); $('hud').classList.add('hidden'); $('hud').setAttribute('aria-hidden', 'true');
    for (const id of ['runInfo','pauseButton','touchControls','bossHud','announcement','skillHud','powerHud','achievementHud','waveMiniBar']) $(id).classList.add('hidden');
    $('menuRecord').textContent = record ? `LOKALER REKORD ${record.toLocaleString('de-DE')}` : '';updateNGPlusMenu();
    $('startButton').focus();
  }
  function pauseGame(){
    if(mode!=='playing'&&mode!=='paused')return;previousMode='playing';mode='paused';resetInput();$('announcement').classList.add('hidden');
    showOverlay(`<span class="eyebrow">TAKTISCHE KNABBERPAUSE</span><h2 id="overlayTitle">DIE HASEN WARTEN.</h2><p>Welle ${wave+1} · ${formatTime(runTime)} · ${retriesLeft} Retries</p><div class="pause-sections"><button class="pause-section-button" id="pauseBuild"><span>♛</span><strong>MEIN KOMPLETTER BUILD</strong><small>Alle Werte, Skills, Waffen, Punkte-Boni und aktiven Effekte</small></button><button class="pause-section-button" id="pauseGuide"><span>?</span><strong>POWER-UPS & SPIELHILFE</strong><small>Power-ups, Mechaniken, Shuffles und Steuerung</small></button><button class="pause-section-button" id="pauseSkins"><span>♠</span><strong>SNICKERS SKINS</strong><small>Freigeschaltetes Outfit im laufenden Run wechseln</small></button><button class="pause-section-button" id="pauseShare"><span>⇄</span><strong>BUILD TEILEN</strong><small>Code zum Anschauen oder Spielen exportieren</small></button></div><div class="overlay-actions"><button class="primary-button" id="resumeButton">WEITERSPIELEN ↗</button><button class="secondary-button" id="pauseSettings">EINSTELLUNGEN</button><button class="secondary-button pause-menu-button" id="menuButton">← HAUPTMENÜ</button></div>`);
    $('pauseBuild').onclick=showCurrentBuild;$('pauseGuide').onclick=()=>showGuide(true);$('pauseSkins').onclick=()=>showSkins(true);$('pauseShare').onclick=()=>showShare(true);$('resumeButton').onclick=resumeGame;$('pauseSettings').onclick=showSettings;$('menuButton').onclick=goMenu;
  }
  function resumeGame() { if (mode !== 'paused') return; mode = previousMode; hideOverlay(); lastFrame = performance.now(); }
  function showHelp(){showGuide(false);}
  function showPowerups(){showGuide(false);}
  function useDash() {
    if (mode !== 'playing' || player.madelpulator || player.dashCd > 0) return;
    let x = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + touch.x;
    let y = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) + touch.y;
    const m = Math.hypot(x, y);
    if (m < .1) { x = player.face; y = 0; } else { x /= m; y /= m; }
    player.dashCount++;player.dashX = x; player.dashY = y; player.dashTime = .19; player.dashCd = effectiveDash(player); player.invuln = Math.max(player.invuln, .42);
    if(player.shockDash){for(const e of enemies)if(!e.dead&&dist(player,e)<105)damageEnemy(e,6*Math.sqrt(player.damage),true);for(const target of [boss,paftiBoss])if(target&&!target.dead&&dist(player,target)<120)damageEnemy(target,8*Math.sqrt(player.damage),true);}
    if(player.dashNova){for(let i=0;i<12;i++){const a=TAU*i/12;bullets.push({x:player.x,y:player.y,vx:Math.cos(a)*560,vy:Math.sin(a)*560,life:.85,damage:2.6*Math.sqrt(player.damage||1),pierce:1,hitIds:new Set(),r:7,a,frost:false});}burst(player.x,player.y,'#ffd36f',24,175);}
    if(player.phaseCapacitor){let cleared=0;enemyBullets=enemyBullets.filter(b=>!(dist(player,b)<150&&cleared++<10));}
    burst(player.x, player.y, accent(), 14, 110); tone(250, .18, 'sine', .05, 650);
  }
  const weaponBook={
    pretzelSling:{name:'BREZELSCHLEUDER',icon:'∞',desc:'Drei breite Brezelgeschosse mit je 12 Basisschaden und drei zusätzlichen Durchschlägen.',max:6},
    sausageMortar:{name:'WEISSWURST-WERFER',icon:'☄',desc:'Drei Weißwurst-Einschläge mit je 32 Basisschaden und großem Explosionsradius rund um dein Ziel.',max:2},
    nutBomb:{name:'NUSSBOMBE',icon:'◎',desc:'Defensiver Notfallknopf: starker Rundumschaden und löscht Geschosse sowie Gefahren in deiner Nähe.',max:3},
    carrotMine:{name:'MÖHRENMINE',icon:'◇',desc:'Große verzögerte Sprengfalle. Hoher Flächenschaden für wenig wertvolle Munition.',max:6},
    peanutBoomerang:{name:'NUSS-BOOMERANG',icon:'↩',desc:'Munitionsstarker Linienräumer. Trifft Gegner auf Hin- UND Rückflug erneut.',max:7},
    acornNova:{name:'EICHEL-NOVA',icon:'✹',desc:'Panikknopf gegen Umzingelung: 20 durchschlagende Eicheln in alle Richtungen.',max:5},
    pigPopper:{name:'SCHWEINEOPFER',icon:'✦',desc:'Extremer Anti-Schwein-Schockstoß mit massivem Schaden gegen Ferkel und sehr hohem Boss-Schaden.',max:4},
    walnutCannon:{name:'WALLNUSS-KANONE',icon:'◉',desc:'Extrem schweres Geschoss mit sehr hohem Schaden und starkem Durchschlag.',max:2},
    hazelnutShotgun:{name:'HASELNUSS-SCHROT',icon:'⋰',desc:'Elf schwere Pellets. Auf kurze Distanz eine der höchsten Schadensspitzen.',max:5},
    carrotLaser:{name:'MÖHRENLASER',icon:'━',desc:'Sofortiger breiter Strahl mit hohem Schaden durch die komplette Gegnerlinie.',max:2},
    acornRocket:{name:'EICHEL-RAKETE',icon:'➤',desc:'Große Explosion mit sehr hohem Flächen- und Boss-Schaden.',max:2},
    nutDrill:{name:'NUSSBOHRER',icon:'↠',desc:'Massive Bohrnuss mit enormem Linienschaden und fast unbegrenztem Durchschlag.',max:2},
    mustardBazooka:{name:'NUSS-BAZOOKA MIT SENF',icon:'☢',desc:'NG+-Waffe: Eine gewaltige Senfnuss explodiert im Zielgebiet und schleudert brennende Senfsplitter weiter.',max:2},
    nutTesla:{name:'NUSS-TESLA',icon:'ϟ',desc:'NG+-Waffe: Kettenblitz springt automatisch durch bis zu acht Gegner und trifft Bosse besonders hart.',max:3},
    pickleMortar:{name:'GURKEN-MÖRSER',icon:'◉',desc:'NG+-Waffe: Schleudert eine Spreewald-Gurke ins Zielgebiet, verursacht großen Flächenschaden und bremst Überlebende.',max:3},
    ossiWall:{name:'OSSI MAUER',icon:'▥',desc:'Riegelt normale Gegner kurz ab. Im Bosskampf entsteht eine dreifach große echte Mauer, die gegnerische Schüsse beim Auftreffen stoppt.',max:3},
    creamRailgun:{name:'SAHNE-RAILGUN',icon:'═',desc:'NG+2-Waffe: ein extrem breiter Sahnestrahl durchschlägt die komplette Arena und trifft Bosse besonders hart.',max:2},
    gnomeArtillery:{name:'GARTENZWERG-ARTILLERIE',icon:'♟',desc:'NG+2-Waffe: markiert sechs Einschlagspunkte und bombardiert die Arena mit schweren Gartenzwerg-Geschossen.',max:2}
  };
  function maxWeaponAmmo(id){return (weaponBook[id]?.max||0)+(player?.ammoBonus||0)+(id==='nutBomb'?(player?.bombBonus||0):0);}
  function refillWeapons(){
    if(!player)return;
    for(const id of player.weapons)player.weaponUses[id]=maxWeaponAmmo(id);
    updateWeaponHud();
  }
  function snapshotAmmo(){return Object.fromEntries(player.weapons.map(id=>[id,weaponAmmo(id)]));}
  function restoreAmmo(snapshot){
    if(!snapshot)return;
    for(const id of player.weapons)player.weaponUses[id]=Math.min(maxWeaponAmmo(id),Number(snapshot[id]??player.weaponUses[id]??0));
    updateWeaponHud();
  }
  function grantSpecialAmmo(){
    const ratio=Math.min(.85,.5+(player.ammoRefillBonus||0));
    let changed=false;
    for(const id of player.weapons){
      const max=maxWeaponAmmo(id),before=weaponAmmo(id);
      if(before>=max)continue;
      const amount=Math.max(1,Math.ceil(max*ratio));
      player.weaponUses[id]=Math.min(max,before+amount);changed=true;
    }
    if(!changed){score+=35;floater(player.x,player.y-38,'MUNITION VOLL · +35',accent());return;}
    floater(player.x,player.y-38,`⊕ ALLE WAFFEN +${Math.round(ratio*100)} %`,accent());addAchievementProgress('full_reload');tone(520,.18,'square',.055,820);updateWeaponHud();
  }
  function refillWeaponsAfterWave(){
    if(!player)return;for(const id of player.weapons)player.weaponUses[id]=maxWeaponAmmo(id);updateWeaponHud();
  }
  function updateWeaponHud(){
    if(!player)return;const id=player.weapons[player.weaponIndex]||'nutBomb',w=weaponBook[id];$('weaponLabel').textContent=`${w.icon} ${w.name}`;$('weaponCount').textContent=`× ${player.weaponUses[id]||0}`;
    $('weaponLabel').title=`${w.desc} · Basis-Munition: ${w.max}`;
  }
  function updatePowerHud(){
    if(!player)return;const active=Object.entries(player.powerups).filter(([,v])=>v>0);$('powerHud').innerHTML=active.map(([id,v])=>`<span class="power-chip ${id}">${powerBook[id]?.icon||'✦'} <b>${powerBook[id]?.name||id}</b><i>${v.toFixed(1)}s</i></span>`).join('');$('powerHud').classList.toggle('hidden',!active.length);
  }
  function cycleWeapon(direction=1){
    if(mode!=='playing'||!player||player.weapons.length<2){if(mode==='playing')toast('Noch keine Spezialwaffe freigeschaltet.');return;}
    player.weaponIndex=(player.weaponIndex+direction+player.weapons.length)%player.weapons.length;updateWeaponHud();toast(`${weaponBook[player.weapons[player.weaponIndex]].icon} ${weaponBook[player.weapons[player.weaponIndex]].name}`);tone(430,.06,'triangle',.04,620);
  }
  function weaponAmmo(id){return Number(player.weaponUses[id]||0);}
  function consumeWeapon(id){if(weaponAmmo(id)<=0){toast(`${weaponBook[id].name} ist leer.`);return false;}player.weaponUses[id]--;player.usedWeapons.add(id);setAchievementProgress('weapon_rack',player.usedWeapons.size);setAchievementProgress('arsenal',player.weapons.length);if(id==='walnutCannon')addAchievementProgress('walnut_boom');if(id==='hazelnutShotgun')addAchievementProgress('scatter_king');if(id==='carrotLaser')addAchievementProgress('laser_line');if(id==='acornRocket')addAchievementProgress('rocket_science');if(id==='nutDrill')addAchievementProgress('drill_baby');if(id==='mustardBazooka'&&newGamePlus)addAchievementProgress('ngplus_mustard');updateWeaponHud();return true;}
  function useWeapon(){
    if(mode!=='playing'||!player)return;
    if(player.specialCd>0)return;aimPlayer();const id=player.weapons[player.weaponIndex]||'nutBomb';if(!consumeWeapon(id))return;player.specialCd=.5;
    if(useNewWeapon(id)){updateWeaponHud();return;}
    player.weaponShots++;
    if(id==='nutBomb'){
      player.usedBombThisWave=true;bombFlash=.5;shake=reducedMotion?0:10;particles.push({type:'ring',x:player.x,y:player.y,life:.65,maxLife:.65,r:0,color:accent()});burst(player.x,player.y,accent(),65,440);
      const specialMult=player.specialDamage||1;for(const e of enemies)if(dist(player,e)<255)damageEnemy(e,29*specialMult,true);for(const target of [boss,paftiBoss])if(target&&!target.dead&&dist(player,target)<285)damageEnemy(target,38*specialMult,true);enemyBullets=enemyBullets.filter(b=>dist(player,b)>340);hazards=hazards.filter(h=>h.friendly||dist(player,h)>275);tone(160,.5,'sawtooth',.12,25);
    }else if(id==='carrotMine'){
      hazards.push({type:'mine',x:player.x,y:player.y,r:115,wait:.9,life:13,hit:false,damage:36*(player.specialDamage||1),friendly:true});burst(player.x,player.y,'#f2a85c',13,80);tone(260,.12,'square',.04,140);
    }else if(id==='peanutBoomerang'){
      thrownWeapons.push({type:'boomerang',x:player.x,y:player.y,startX:player.x,startY:player.y,vx:Math.cos(player.angle)*470,vy:Math.sin(player.angle)*470,life:1.72,damage:12*(player.specialDamage||1),returning:false,hitIds:new Set(),r:13});tone(480,.12,'triangle',.05,780);
    }else if(id==='acornNova'){
      for(let i=0;i<20;i++){const a=TAU*i/20;bullets.push({x:player.x,y:player.y,vx:Math.cos(a)*525,vy:Math.sin(a)*525,life:1.22,damage:7*(player.specialDamage||1),pierce:2,hitIds:new Set(),r:8,a,frost:player.frost});}burst(player.x,player.y,'#f5d278',32,220);tone(220,.4,'sawtooth',.08,880);
    }else if(id==='pigPopper'){
      hazards.push({type:'shock',x:player.x,y:player.y,r:255,wait:.1,life:.3,hit:false,damage:30*(player.specialDamage||1),pigBonus:1.65,bossBonus:1.25,friendly:true});burst(player.x,player.y,'#ffb3e4',30,260);tone(360,.33,'square',.09,80);
    }else if(id==='pretzelSling'){
      for(const off of [-.18,0,.18]){const a=player.angle+off;bullets.push({x:player.x,y:player.y,vx:Math.cos(a)*590,vy:Math.sin(a)*590,life:1.4,damage:12*(player.specialDamage||1),pierce:3,hitIds:new Set(),r:11,a,frost:false,pretzel:true});}
      burst(player.x,player.y,'#eab87a',18,150);tone(330,.2,'triangle',.07,170);
    }else if(id==='sausageMortar'){
      const tx=weaponTarget(350).x,ty=weaponTarget(350).y;
      for(let i=0;i<3;i++){const a=TAU*i/3;hazards.push({type:'friendlyMortar',x:clamp(tx+Math.cos(a)*62,50,W-50),y:clamp(ty+Math.sin(a)*62,110,H-45),r:115,wait:.5+i*.2,life:.35,hit:false,damage:32*(player.specialDamage||1),bossBonus:1,friendly:true,sausage:true});}
      tone(110,.38,'square',.08,48);
    }else if(id==='walnutCannon'){
      const a=player.angle,sm=player.specialDamage||1;
      bullets.push({x:player.x+Math.cos(a)*24,y:player.y+Math.sin(a)*24,vx:Math.cos(a)*610,vy:Math.sin(a)*610,life:1.55,damage:46*sm,pierce:7,hitIds:new Set(),r:16,a,frost:false,heavy:true});
      burst(player.x+Math.cos(a)*25,player.y+Math.sin(a)*25,'#e5bc69',20,135);shake=reducedMotion?0:4;tone(115,.24,'square',.08,60);
    }else if(id==='hazelnutShotgun'){
      const sm=player.specialDamage||1;
      for(let i=-5;i<=5;i++){const a=player.angle+i*.075;bullets.push({x:player.x,y:player.y,vx:Math.cos(a)*720,vy:Math.sin(a)*720,life:.78,damage:4.5*sm,pierce:1,hitIds:new Set(),r:6,a,frost:false});}
      burst(player.x,player.y,'#f0d28a',22,180);tone(185,.18,'sawtooth',.07,90);
    }else if(id==='carrotLaser'){
      const a=player.angle,len=840,x2=player.x+Math.cos(a)*len,y2=player.y+Math.sin(a)*len,sm=player.specialDamage||1;
      particles.push({type:'beam',x:player.x,y:player.y,x2,y2,life:.2,maxLife:.2,color:'#ffb35e'});
      const all=[...enemies,...(boss&&!boss.dead?[boss]:[]),...(paftiBoss&&!paftiBoss.dead?[paftiBoss]:[])];
      for(const e of all){if(e.dead)continue;const vx=x2-player.x,vy=y2-player.y,l2=vx*vx+vy*vy,t=clamp(((e.x-player.x)*vx+(e.y-player.y)*vy)/l2,0,1),px=player.x+vx*t,py=player.y+vy*t;if(Math.hypot(e.x-px,e.y-py)<e.r+30)damageEnemy(e,48*sm,true);if(mode!=='playing')break;}
      shake=reducedMotion?0:5;tone(520,.28,'sawtooth',.07,1100);
    }else if(id==='acornRocket'){
      const a=player.angle,tx=weaponTarget(430).x,ty=weaponTarget(430).y,sm=player.specialDamage||1;
      particles.push({type:'ring',x:tx,y:ty,life:.5,maxLife:.5,r:0,color:'#ffb35e'});burst(tx,ty,'#f0a15d',42,310);
      for(const e of enemies)if(!e.dead&&Math.hypot(e.x-tx,e.y-ty)<178+e.r)damageEnemy(e,34*sm,true);
      for(const target of [boss,paftiBoss])if(target&&!target.dead&&Math.hypot(target.x-tx,target.y-ty)<198+target.r)damageEnemy(target,44*sm,true);
      shake=reducedMotion?0:8;tone(95,.42,'sawtooth',.1,35);
    }else if(id==='nutDrill'){
      const a=player.angle,sm=player.specialDamage||1;
      bullets.push({x:player.x+Math.cos(a)*24,y:player.y+Math.sin(a)*24,vx:Math.cos(a)*520,vy:Math.sin(a)*520,life:1.9,damage:42*sm,pierce:14,hitIds:new Set(),r:20,a,frost:false,drill:true});
      burst(player.x,player.y,'#c89a58',18,120);tone(250,.42,'sawtooth',.06,95);
    }else if(id==='mustardBazooka'){
      const a=player.angle,tx=weaponTarget(485).x,ty=weaponTarget(485).y,sm=player.specialDamage||1;
      particles.push({type:'ring',x:tx,y:ty,life:.7,maxLife:.7,r:0,color:'#e8d43b'});burst(tx,ty,'#e7cf3e',60,360);
      for(const e of enemies)if(!e.dead&&Math.hypot(e.x-tx,e.y-ty)<220+e.r)damageEnemy(e,58*sm,true);
      for(const target of [boss,paftiBoss])if(target&&!target.dead&&Math.hypot(target.x-tx,target.y-ty)<235+target.r)damageEnemy(target,70*sm,true);
      for(let i=0;i<10;i++){const ba=TAU*i/10;bullets.push({x:tx,y:ty,vx:Math.cos(ba)*430,vy:Math.sin(ba)*430,life:.8,damage:12*sm,pierce:2,hitIds:new Set(),r:8,a:ba,frost:false,mustard:true});}
      shake=reducedMotion?0:12;tone(72,.55,'sawtooth',.12,28);
    }else if(id==='nutTesla'){
      const sm=player.specialDamage||1,targets=combatTargets().filter(e=>!e.dead).sort((a,b)=>dist(player,a)-dist(player,b)).slice(0,8);
      let from={x:player.x,y:player.y};for(const e of targets){particles.push({type:'beam',x:from.x,y:from.y,x2:e.x,y2:e.y,life:.16,maxLife:.16,color:'#86efff'});damageEnemy(e,(isBoss(e)?48:31)*sm,true);from=e;}
      burst(player.x,player.y,'#86efff',20,150);tone(740,.32,'sawtooth',.08,1220);
    }else if(id==='pickleMortar'){
      const a=player.angle,tx=weaponTarget(455).x,ty=weaponTarget(455).y,sm=player.specialDamage||1;
      burst(tx,ty,'#99d665',55,300);particles.push({type:'ring',x:tx,y:ty,life:.65,maxLife:.65,r:0,color:'#9bdc62'});
      for(const e of enemies)if(!e.dead&&Math.hypot(e.x-tx,e.y-ty)<190+e.r){damageEnemy(e,38*sm,true);e.slow=Math.max(e.slow||0,2.6);}
      for(const target of [boss,paftiBoss])if(target&&!target.dead&&Math.hypot(target.x-tx,target.y-ty)<210+target.r){damageEnemy(target,52*sm,true);target.slow=Math.max(target.slow||0,1.7);}
      shake=reducedMotion?0:8;tone(120,.38,'square',.08,55);
    }else if(id==='creamRailgun'){
      const a=player.angle,len=1100,x2=player.x+Math.cos(a)*len,y2=player.y+Math.sin(a)*len,sm=player.specialDamage||1;
      particles.push({type:'beam',x:player.x,y:player.y,x2,y2,life:.34,maxLife:.34,color:'#fff3d5'});
      const all=[...enemies,...(boss&&!boss.dead?[boss]:[]),...(paftiBoss&&!paftiBoss.dead?[paftiBoss]:[])];for(const e of all){if(e.dead)continue;const vx=x2-player.x,vy=y2-player.y,l2=vx*vx+vy*vy,t=clamp(((e.x-player.x)*vx+(e.y-player.y)*vy)/l2,0,1),px=player.x+vx*t,py=player.y+vy*t;if(Math.hypot(e.x-px,e.y-py)<e.r+48)damageEnemy(e,(isBoss(e)?96:68)*sm,true);if(mode!=='playing')break;}
      shake=reducedMotion?0:12;tone(310,.52,'sawtooth',.1,980);
    }else if(id==='gnomeArtillery'){
      const sm=player.specialDamage||1,all=combatTargets().filter(e=>!e.dead);
      for(let i=0;i<6;i++){const t=all.length?all[i%all.length]:null,x=t?clamp(t.x+rnd(-45,45),70,W-70):rnd(80,W-80),y=t?clamp(t.y+rnd(-40,40),135,H-65):rnd(150,H-80);hazards.push({type:'friendlyMortar',x,y,r:128,wait:.38+i*.13,life:.35,hit:false,damage:17*sm,bossBonus:1.05,friendly:true});}
      tone(95,.6,'square',.1,45);
    }else if(id==='ossiWall'){
      const wallBoss=boss&&!boss.dead?boss:paftiBoss&&!paftiBoss.dead?paftiBoss:null;
      if(wallBoss){
        const dx=wallBoss.x-player.x,dy=wallBoss.y-player.y,d=Math.hypot(dx,dy)||1;
        player.ossiWallTime=Math.max(player.ossiWallTime||0,6);ossiWalls=[{x:player.x+dx/d*115,y:player.y+dy/d*115,life:6,maxLife:6,boss:true,w:228,h:108}];
        floater(player.x,player.y-54,'OSSI MAUER · RIESEN-BARRIERE',accent());tone(105,.42,'square',.07,55);
      }else{
        const live=enemies.filter(e=>!e.dead).sort(()=>Math.random()-.5),count=Math.ceil(live.length/2);ossiWalls=[];
        for(const e of live.slice(0,count)){
          e.ossiBlocked=4.8;const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;
          ossiWalls.push({x:e.x+dx/d*42,y:e.y+dy/d*42,life:4.8,maxLife:4.8,boss:false});
        }
        floater(player.x,player.y-54,`OSSI MAUER · ${count} ABGERIEGELT`,accent());tone(105,.42,'square',.07,55);
      }
    }
    updateWeaponHud();
  }
  function useBomb(){useWeapon();}
  const powerBook={
    haste:{name:'FLINKES FELL',icon:'⚡',duration:8,desc:'Du läufst 34 % schneller.',apply:p=>p.powerups.haste=8},
    berserk:{name:'WUT-NUSS',icon:'✹',duration:8,desc:'45 % mehr Schussschaden und rund 43 % schnellere Feuerrate.',apply:p=>p.powerups.berserk=8},
    magnet:{name:'MAGNET-MÖHRE',icon:'✧',duration:10,desc:'Zieht Herzen, Nüsse und Power-ups aus deutlich größerer Entfernung an.',apply:p=>p.powerups.magnet=10},
    barrier:{name:'KUSCHELSCHILD',icon:'◇',duration:8,desc:'Blockt den nächsten Treffer vollständig.',apply:p=>p.powerups.barrier=8},
    jackpot:{name:'NUSS-JACKPOT',icon:'$',duration:7,desc:'Normale Nuss-Drops geben viermal so viele Punkte.',apply:p=>p.powerups.jackpot=7},
    freeze:{name:'EIS-MÖHRE',icon:'❄',duration:7,desc:'Verlangsamt die gesamte Gegnerhorde deutlich.',apply:p=>p.powerups.freeze=7},
    doubleShot:{name:'DOPPELSCHUSS',icon:'✣',duration:8,desc:'Jede Salve erhält zwei zusätzliche Seitenprojektile mit reduziertem Einzelschaden.',apply:p=>p.powerups.doubleShot=8},
    phase:{name:'PHASENFELL',icon:'◈',duration:5,desc:'Du bist für kurze Zeit komplett unverwundbar.',apply:p=>p.powerups.phase=5},
    scoreRush:{name:'PUNKTEBRAUSE',icon:'★',duration:9,desc:'Verdoppelt Punkte durch Kills und eingesammelte Nüsse.',apply:p=>p.powerups.scoreRush=9},
    thorns:{name:'STACHELNUSS',icon:'✦',duration:8,desc:'Bei Treffern bekommen Gegner in deiner Nähe Gegenschaden.',apply:p=>p.powerups.thorns=8},
    overclock:{name:'NUSS-TURBO',icon:'»',duration:7,desc:'Deine normale Waffe feuert rund 38 % schneller.',apply:p=>p.powerups.overclock=7},
    giantNut:{name:'RIESENNUSS',icon:'●',duration:8,desc:'Schüsse werden größer und verursachen 40 % mehr Schaden.',apply:p=>p.powerups.giantNut=8},
    regen:{name:'NOTFALL-SNACK',icon:'♥',duration:8,desc:'Regeneriert während der Laufzeit regelmäßig Herzen.',apply:p=>{p.powerups.regen=8;p.regenCd=0;}},
    overdrive:{name:'ROTER BLICK',icon:'☄',duration:5,desc:'SEHR SELTEN: 5 s unverwundbar, rund 61 % höhere Feuerrate und 55 % mehr normalen Schussschaden.',rare:true,apply:p=>p.powerups.overdrive=5}
  };
  function rollPowerupId(){
    if(Math.random()<.02)return 'overdrive';
    const ids=Object.keys(powerBook).filter(id=>id!=='overdrive');return ids[Math.floor(Math.random()*ids.length)];
  }
  function dropPowerup(x,y){
    if(Math.random()>(.035*(player?.powerLuck||1)))return;const id=rollPowerupId();pickups.push({x,y,type:'power',power:id,life:18,phase:rnd(0,TAU)});
  }
  function collectPowerup(p){const power=powerBook[p.power];if(!power)return;power.apply(player);if(player.scavengerPulse&&(player.scavengerCd||0)<=0){const id=shuffled(player.weapons.filter(id=>weaponAmmo(id)<maxWeaponAmmo(id)))[0];if(id){player.weaponUses[id]++;player.scavengerCd=8;updateWeaponHud();}}if(player.powerDuration&&p.power!=='overdrive')player.powerups[p.power]*=player.powerDuration;if(p.power==='barrier')player.invuln=Math.max(player.invuln,.8);player.powerSeen.add(p.power);addAchievementProgress('power_hungry');setAchievementProgress('power_mix',player.powerSeen.size);recordDistinct('power_encyclopedia',p.power);if(p.power==='haste')addAchievementProgress('speed_demon');if(p.power==='phase')addAchievementProgress('phase_shift');if(p.power==='doubleShot')addAchievementProgress('double_trouble');if(p.power==='freeze')addAchievementProgress('freeze_frame');floater(player.x,player.y-38,`${power.icon} ${power.name}`,accent());tone(p.power==='overdrive'?860:620,p.power==='overdrive'?.32:.18,'triangle',p.power==='overdrive'?.1:.07,p.power==='overdrive'?1320:980);updatePowerHud();}
  function spawnEnemy(type) {
    type=limitEnemyType(type);const {x,y}=safeSpawnPoint();
    const stats = extraEnemyBook[type]?.stats || { bunny: [2+(wave>2?1:0), 76 + Math.min(wave,12) * 6, 18, 65], runner: [1+(wave>2?1:0), 146 + Math.min(wave,12) * 3, 15, 85], brute: [9, 49, 27, 160], gunner: [4, 58, 20, 120], rabid:[5,114,19,150], gatling:[9,53,24,230], splitter:[6,92,22,180], sniper:[6,46,21,280], sapper:[7,61,22,245], pigRammer:[12,68,31,320], pigMortar:[10,42,28,350], pigCannon:[14,51,27,420], pigDrone:[5,130,17,260], pigHowler:[11,48,30,390], zombieBoss:[300,58,37,1100], voidBunny:[18,102,25,560], rocketHare:[14,66,23,640], pigJuggernaut:[28,61,35,820], burrowBunny:[16,92,23,520], stormBunny:[13,78,22,590], gnomePig:[22,56,31,760] }[type] || [2,76,18,65];
    const enemyHpMult=endlessMode?(endlessFromHall?2.9:1)*endlessHpScale(wave):campaignHpScale();
    const enemySpeedMult=endlessMode?(endlessFromHall?1.08:1)*endlessSpeedScale(wave):campaignSpeedScale();
    const actionRate=endlessMode?(endlessFromHall?1.08:1)*endlessActionScale(wave):campaignActionScale();
    const hp=Math.max(1,stats[0]*enemyHpMult);
    const e={ x, y, type, hp, maxHp:hp, speed:stats[1]*enemySpeedMult, r:stats[2], points:stats[3], phase:rnd(0,TAU), hit:0, fireCd:rnd(1.8,3), actionRate, slow:0, chargeCd:rnd(1.6,2.8), windup:0, charge:0, aim:0, burstLeft:0, burstCd:0, dead:false, mortarCd:rnd(2.5,4), summonCd:rnd(3,5), summoned:false, mineCd:rnd(2.5,4), howlCd:rnd(2.8,4.5),teleportCd:rnd(2.4,4),rocketCd:rnd(2,3.4),shockCd:rnd(2.5,4) };
    if(extraEnemyBook[type]){e.variant=type;e.fireCd=2;e.chargeCd=2;}e.spawnGrace=.65;enemies.push(e);return e;
  }
  function spawnBoss(cyber=false,karnil=false,keepRetries=false) {
    clearCombatExtras();ossiWalls=[];player.ossiWallTime=0;
    const bossHp=[{general:289,cyber:525,karnil:882},{general:945,cyber:1575,karnil:1890},{general:3570,cyber:4935,karnil:3360}][gamePlusLevel]||{general:289,cyber:525,karnil:882};
    const hp=bossHp[karnil?'karnil':cyber?'cyber':'general'],bossSpeedMult=gamePlusLevel===2?1.15:gamePlusLevel===1?1.07:1;
    boss = { x: W / 2, y: 170, type:'boss', cyber, karnil, r:karnil?78:(cyber?55:49), hp, maxHp:hp, speed:(karnil?54:(cyber?67:49))*bossSpeedMult, phase:0, hit:0, actionCd:karnil?1.85:2.2, attack:0, summonCd:karnil?6:8, enraged:false, dead:false, points:karnil?18000:(cyber?10000:5600), slow:0, windup:0, charge:0, aim:0, burstLeft:0, burstCd:0, phaseTwo:false,phaseThree:false,paftiHealed:false,supplyStep:0,supplyThresholds:[.78,.52,.28], pattern:0 };
    player.emergencyUsed=false;player.bossHits=0;player.bossAmmoSnapshot=snapshotAmmo();player.bossPhaseAmmoSnapshot=null;
    recordDistinct('three_bosses',karnil?'karnil':cyber?'cyber':'general');waveTime = 0; enemyBullets = []; hazards = []; player.x=W/2;player.y=H/2+60;player.invuln=2;
    $('bossName').textContent=karnil?'KARNIL · FERKEL DER EINGESTÜRZTEN':cyber?'CYBER-HASENBEIN':'GENERAL HASENBEIN';
    $('bossHud').classList.remove('hidden');$('bossHud').classList.toggle('cyber',cyber);$('bossHud').classList.toggle('karnil',karnil);
    announce(karnil?'DER FELSEN BEWEGT SICH.':cyber?'REANIMATION ABGESCHLOSSEN.':'BOSS 01 / 03',karnil?'KARNIL':cyber?'CYBER-HASENBEIN':'GENERAL HASENBEIN');
    tone(karnil?45:(cyber?65:90), 1, 'sawtooth', .08, 40); updateHud();
  }
  function spawnOttah(){
    clearCombatExtras();ossiWalls=[];player.ossiWallTime=0;stageVisual=3;makeGround();
    const hp=3150;
    boss={x:W/2,y:178,type:'boss',ottah:true,ottahPhase:1,r:72,hp,maxHp:hp,speed:92,phase:0,hit:0,actionCd:1.25,attack:0,summonCd:5.5,enraged:false,dead:false,points:30000,slow:0,windup:0,charge:0,aim:0,burstLeft:0,burstCd:0,supplyStep:0,supplyThresholds:[.82,.62,.42,.22]};
    player.emergencyUsed=false;player.bossHits=0;clearCombatExtras();player.hp=player.maxHp;player.invuln=2.2;player.x=W/2;player.y=H/2+80;clearCombatExtras();player.bossHits=0;player.emergencyUsed=false;player.bossAmmoSnapshot=snapshotAmmo();enemyBullets=[];hazards=[];enemies=[];
    $('bossName').textContent='OTTAH · DAS WARZENSCHWEIN';$('bossHud').classList.remove('hidden');$('bossHud').classList.remove('cyber','karnil');
    addAchievementProgress('ng2_ottah');announce('NEUE STAGE · SAHNEKÜCHE','OTTAH');tone(58,.9,'sawtooth',.1,30);updateHud();
  }
  function advanceOttahPhase(){
    if(!boss?.ottah||boss.ottahPhase>=3)return false;
    boss.ottahPhase++;boss.hp=boss.maxHp;boss.attack=0;boss.actionCd=.8;boss.summonCd=4.8;boss.speed+=boss.ottahPhase===2?12:18;boss.hit=0;boss.supplyStep=0;
    enemyBullets=[];hazards=[];player.invuln=Math.max(player.invuln,1.7);
    announce(`OTTAH · PHASE ${boss.ottahPhase} / 3`,boss.ottahPhase===2?'WARZEN-WUT':'SAHNE-STURM');burst(boss.x,boss.y,boss.ottahPhase===3?'#fff0bd':'#d88b63',70,280);shake=reducedMotion?0:16;tone(boss.ottahPhase===3?45:62,.85,'sawtooth',.11,24);updateHud();return true;
  }
  const endlessBossBook={
    carrotTitan:{name:'KAROTTEN-KOLOSS',subtitle:'WURZELWERK AUF ZWEI BEINEN',hp:430,speed:68,color:'#e89b54'},
    moleMarshal:{name:'MAULWURF-MARSCHALL',subtitle:'KOMMT VON UNTEN',hp:370,speed:96,color:'#9f8b79'},
    gnomeOverlord:{name:'ZWERGEN-OVERLORD',subtitle:'GARTENREICH SCHLÄGT ZURÜCK',hp:460,speed:62,color:'#d96756'},
    general:{name:'GENERAL HASENBEIN',subtitle:'ENDLOS-REVANCHE',hp:350,speed:78,color:'#b7c989'},
    cyber:{name:'CYBER-HASENBEIN',subtitle:'ENDLOS-REBOOT',hp:410,speed:90,color:'#78dfee'},
    quarryBoar:{name:'STEINBRUCH-Eber',subtitle:'KARNILS COUSIN',hp:490,speed:72,color:'#b47761'}
  };
  function spawnEndlessBoss(fromRetry=false,forcedKind=null){
    const keys=Object.keys(endlessBossBook).filter(k=>(endlessBossBook[k].minWave||0)<=wave),kind=forcedKind||keys[Math.floor(Math.random()*keys.length)],cfg=endlessBossBook[kind];
    const waveScale=endlessBossHpScale(wave),buildScale=endlessFromHall?3.8:1,hp=cfg.hp*waveScale*buildScale*1.07*1.05;
    boss={x:W/2,y:175,type:'boss',endlessBoss:true,endlessKind:kind,endlessName:cfg.name,endlessSubtitle:cfg.subtitle,r:kind==='gnomeOverlord'||kind==='quarryBoar'?68:55,hp,maxHp:hp,speed:cfg.speed*(endlessFromHall?1.08:1)*endlessSpeedScale(wave),phase:0,hit:0,actionCd:1.15,attack:0,summonCd:5.8,enraged:false,dead:false,points:5000+wave*900,slow:0,windup:0,charge:0,aim:0,burstLeft:0,burstCd:0,supplyStep:0,supplyThresholds:[.76,.48,.24]};
    clearCombatExtras();player.bossHits=0;player.emergencyUsed=false;player.bossAmmoSnapshot=snapshotAmmo();enemyBullets=[];hazards=[];enemies=[];player.x=W/2;player.y=H/2+75;player.invuln=2;
    $('bossName').textContent=cfg.name;$('bossHud').classList.remove('hidden');$('bossHud').classList.remove('cyber','karnil');
    if(!fromRetry)announce(`ENDLOS · BOSS NACH WELLE ${wave+1}`,cfg.name);tone(68,.7,'sawtooth',.08,34);updateHud();
  }
  function updateOttahBoss(dt){
    const e=boss;if(!e?.ottah||e.dead)return;e.phase+=dt*4;e.hit=Math.max(0,e.hit-dt);e.slow=Math.max(0,e.slow-dt);
    const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1,a=Math.atan2(dy,dx),slow=(e.slow>0?.86:1)*(player.powerups.freeze>0?.7:1);
    if(e.windup>0){e.windup-=dt;if(e.windup<=0)e.charge=e.pendingCharge||.62;return;}
    if(e.charge>0){e.charge-=dt;e.x+=Math.cos(e.aim)*650*slow*dt;e.y+=Math.sin(e.aim)*650*slow*dt;}else if(d>135){e.x+=dx/d*e.speed*slow*dt;e.y+=dy/d*e.speed*slow*dt;}
    e.x=clamp(e.x,70,W-70);e.y=clamp(e.y,145,H-65);e.actionCd-=dt*(hardMode?1.12:1);e.summonCd-=dt;
    if(e.actionCd<=0&&e.charge<=0){const ph=e.ottahPhase||1,pat=e.attack++%(ph===1?4:ph===2?6:8);
      if(pat===0){const n=ph===3?28:ph===2?22:16;for(let i=0;i<n;i++)enemyShot(e.x,e.y,TAU*i/n+e.attack*.04,270+ph*28,true);}
      else if(pat===1){e.aim=a;e.windup=.85;e.pendingCharge=.62;for(let i=0;i<ph+1;i++)hazards.push({type:'shock',x:clamp(player.x+rnd(-180,180),70,W-70),y:clamp(player.y+rnd(-130,130),145,H-60),r:95+ph*12,wait:.62+i*.18,life:.35,hit:false,damage:2});}
      else if(pat===2){for(let i=0;i<4+ph*2;i++)hazards.push({type:'rockfall',x:clamp(player.x+rnd(-340,340),80,W-80),y:clamp(player.y+rnd(-220,220),150,H-60),r:80+ph*8,wait:.45+i*.1,life:.35,hit:false,damage:2});}
      else if(pat===3){for(let i=-4-ph;i<=4+ph;i++)enemyShot(e.x,e.y,a+i*.105,390+ph*20,true);}
      else if(pat===4){for(let ring=0;ring<2;ring++)for(let i=0;i<14;i++)enemyShot(e.x,e.y,TAU*i/14+ring*.13,300+ring*75,true);}
      else if(pat===5){for(let i=0;i<6;i++)hazards.push({type:'shock',x:clamp(W*(i+1)/7,70,W-70),y:clamp(player.y+rnd(-150,150),145,H-60),r:92,wait:.45+i*.1,life:.35,hit:false,damage:2});}
      else if(pat===6){for(let i=0;i<3;i++){const aa=a+(i-1)*.35;for(let j=0;j<7;j++)enemyShot(e.x,e.y,aa+(j-3)*.045,430-j*8,true);}}
      else {for(let i=0;i<10;i++)hazards.push({type:'rockfall',x:rnd(90,W-90),y:rnd(155,H-70),r:92,wait:.35+i*.065,life:.35,hit:false,damage:2});for(let i=0;i<20;i++)enemyShot(e.x,e.y,TAU*i/20,360,true);}
      e.actionCd=(ph===3?.80:ph===2?.98:1.16)*.96;
    }
    if(e.summonCd<=0&&enemies.length<16){const types=e.ottahPhase===3?['pigJuggernaut','gnomePig','rocketHare']:['pigRammer','pigCannon','pigHowler'];for(let i=0;i<(e.ottahPhase+1);i++)spawnEnemy(types[i%types.length]);e.summonCd=e.ottahPhase===3?5:6.5;}
    if(d<player.r+e.r)hurtPlayer(2,e);
  }
  function updateEndlessBoss(dt){
    const e=boss;if(!e?.endlessBoss||e.dead)return;e.phase+=dt*4;e.hit=Math.max(0,e.hit-dt);e.slow=Math.max(0,e.slow-dt);
    const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1,a=Math.atan2(dy,dx),rate=endlessActionScale(wave)*(endlessFromHall?1.08:1),slow=(e.slow>0?.86:1)*(player.powerups.freeze>0?.7:1);
    if(e.windup>0){e.windup-=dt;if(e.windup<=0)e.charge=.55;return;}
    if(e.charge>0){e.charge-=dt;e.x+=Math.cos(e.aim)*600*slow*dt;e.y+=Math.sin(e.aim)*600*slow*dt;}else if(d>125){e.x+=dx/d*e.speed*slow*dt;e.y+=dy/d*e.speed*slow*dt;}
    e.x=clamp(e.x,65,W-65);e.y=clamp(e.y,145,H-60);e.actionCd-=dt*rate*(hardMode?1.12:1);e.summonCd-=dt*rate;
    if(e.actionCd<=0&&e.charge<=0){const pat=e.attack++%5,k=e.endlessKind;
      if(['ratEmpress','sugarGolem','starOwl'].includes(k)){newEndlessPattern(e,pat,a);e.actionCd=1.4;return;}
      if(k==='moleMarshal'&&pat===0){const pos=safeSpawnPoint();e.x=pos.x;e.y=pos.y;hazards.push({type:'shock',x:e.x,y:e.y,r:150,wait:.45,life:.35,hit:false,damage:2});}
      else if(k==='carrotTitan'&&pat<=1){for(let i=0;i<20;i++)enemyShot(e.x,e.y,TAU*i/20+e.attack*.06,300,true);for(let i=0;i<3;i++)hazards.push({type:'mortar',x:clamp(player.x+rnd(-170,170),70,W-70),y:clamp(player.y+rnd(-130,130),145,H-60),r:84,wait:.7+i*.15,life:.35,hit:false,damage:2});}
      else if(k==='gnomeOverlord'&&pat===2){for(let i=0;i<2&&enemies.length<14;i++)spawnEnemy('gnomePig');for(let i=-4;i<=4;i++)enemyShot(e.x,e.y,a+i*.12,360,true);}
      else if(k==='quarryBoar'&&pat===3){for(let i=0;i<7;i++)hazards.push({type:'rockfall',x:rnd(80,W-80),y:rnd(150,H-65),r:95,wait:.4+i*.09,life:.35,hit:false,damage:2});}
      else if(pat===4){e.aim=a;e.windup=.85;}else {for(let i=-3;i<=3;i++)enemyShot(e.x,e.y,a+i*.14,335,true);}
      e.actionCd=.95;
    }
    if(e.summonCd<=0&&enemies.length<14){const pool=endlessEnemyPool(wave);const count=Math.min(6,2+Math.floor(wave/12)+(endlessFromHall?1:0));for(let i=0;i<count;i++)spawnEnemy(pool[Math.floor(Math.random()*pool.length)]);e.summonCd=5.5;}
    if(d<player.r+e.r)hurtPlayer(2,e);
  }
  function getMiniBoss(){return enemies.find(e=>e.miniBoss&&!e.dead)||null;}
  function spawnZombieHasenbein(){
    const existing=getMiniBoss();if(existing)return existing;
    const zombie=spawnEnemy('zombieBoss');
    zombie.miniBoss=true;zombie.hp=zombie.maxHp=150*(gamePlusLevel===2?2:newGamePlus?1.45:1);zombie.points=4200;zombie.speed=72*1.05*(gamePlusLevel===2?1.15:newGamePlus?1.07:1);zombie.r=43;zombie.fireCd=.9;zombie.chargeCd=2.1;
    zombie.x=clamp((boss?.x||W/2)-185,80,W-80);zombie.y=clamp((boss?.y||170)+120,155,H-75);
    burst(zombie.x,zombie.y,'#a7c86f',34,190);tone(84,.55,'sawtooth',.07,44);updateHud();return zombie;
  }
  function activateKarnilPhaseTwo(fromRetry=false){
    if(!boss||!boss.karnil||boss.phaseTwo)return;
    boss.phaseTwo=true;boss.enraged=true;boss.hp=boss.maxHp;boss.speed=92*(gamePlusLevel===2?1.15:newGamePlus?1.07:1);boss.actionCd=.95;boss.summonCd=5.5;boss.windup=0;boss.charge=0;boss.burstLeft=0;boss.hit=0;boss.supplyStep=0;
    enemyBullets=[];hazards=[];player.invuln=Math.max(player.invuln,1.4);player.bossPhaseAmmoSnapshot=snapshotAmmo();
    spawnZombieHasenbein();addAchievementProgress('comeback');
    if(!fromRetry)announce('DER FELSEN BRICHT ENDGÜLTIG AUF.','PHASE 2 · KARNIL + ZOMBIE-HASENBEIN');
    burst(boss.x,boss.y,'#ff8c59',65,260);shake=reducedMotion?0:14;tone(42,.9,'sawtooth',.11,22);updateHud();
  }
  function spawnCyberHasenbein(){
    enemies=enemies.filter(e=>!e.miniBoss);const cyber=spawnEnemy('zombieBoss');cyber.miniBoss=true;cyber.cyberMini=true;cyber.hp=cyber.maxHp=265*(gamePlusLevel===2?1.7:1.2);cyber.points=7000;cyber.speed=88*1.05*(gamePlusLevel===2?1.15:1.07);cyber.r=47;cyber.fireCd=.65;cyber.chargeCd=1.7;cyber.x=clamp((boss?.x||W/2)-195,85,W-85);cyber.y=clamp((boss?.y||170)+125,160,H-80);burst(cyber.x,cyber.y,'#81eaff',45,230);tone(110,.65,'sawtooth',.08,780);updateHud();return cyber;
  }
  function activateKarnilPhaseThree(){
    if(!newGamePlus||!boss||!boss.karnil||boss.phaseThree)return;
    boss.phaseThree=true;boss.phaseTwo=true;boss.enraged=true;boss.hp=boss.maxHp;boss.speed=112*(gamePlusLevel===2?1.15:1.07);boss.actionCd=.72;boss.summonCd=4.7;boss.windup=0;boss.charge=0;boss.burstLeft=0;boss.hit=0;boss.paftiHealed=false;boss.supplyStep=0;addAchievementProgress('ngplus_phase3');
    enemyBullets=[];hazards=[];player.invuln=Math.max(player.invuln,1.8);spawnCyberHasenbein();announce('NEW GAME+ · DER STEINBRUCH BRENNT.','PHASE 3 · KARNIL + CYBER-HASENBEIN');burst(boss.x,boss.y,'#6fe7ff',90,330);shake=reducedMotion?0:18;tone(35,1.1,'sawtooth',.13,18);updateHud();
  }
  function triggerPaftiIntervention(restoring=false){
    if(!boss||!boss.karnil||!boss.phaseThree||(!restoring&&boss.paftiHealed))return;if(!restoring){boss.paftiHealed=true;boss.hp=Math.min(boss.maxHp,boss.hp+boss.maxHp*.25);}addAchievementProgress('ngplus_pafti');enemyBullets=[];hazards=[];mode='paftiCutscene';resetInput();updateHud();
    showOverlay(`<span class="eyebrow ngplus-kicker">NEW GAME+ · UNGEBETENER BESUCH</span><h2 id="overlayTitle">PAFTI DRÜCKT START.</h2><div class="pafti-scene" aria-label="Pafti, ein alter Mann mit SNES-Controller als Schädel"><div class="pafti-controller"><i></i><b>✚</b><em>● ●</em></div><div class="pafti-body">♟</div></div><p>Ein alter Mann wankt aus dem Staub. Wo sein Schädel sein sollte, sitzt ein vergilbter SNES-Controller. Pafti hasst Hamster – und offenbar liebt er dramatische Auftritte.</p><blockquote class="snickers-quote"><b>PAFTI</b>„Hamster gehören ins Menü, nicht ins Endgame.“</blockquote><p><strong>PAFTI HEILT KARNIL UM 25 % SEINER MAXIMALEN LEBEN.</strong></p><button class="primary-button ngplus-button" id="paftiContinue">DANN EBEN NOCHMAL <span>↗</span></button>`);
    $('paftiContinue').onclick=()=>{if(mode!=='paftiCutscene')return;mode='playing';hideOverlay();player.invuln=2.5;lastFrame=performance.now();announce('PAFTIS LETZTE HILFE · +25 % LEBEN.','KARNIL · PHASE 3 GEHT WEITER');};
  }
  const skillBook = {
    rabbitCleft:{icon:'⋎',title:'HASENSCHARTE',short:'Hasenscharte',desc:'30 % mehr Schaden gegen Hasen, inklusive Hasen-Bosse.',apply:p=>p.rabbitDamage=(p.rabbitDamage||1)*1.3},
    corffelsBag:{icon:'♧',title:'CORFFELS SACK',short:'Corffels Sack',desc:'+65 Sammelradius, Drops bleiben 5 Sekunden länger liegen und 20 % mehr Munitions-Dropchance.',apply:p=>{p.magnet+=65;p.pickupLifeBonus=(p.pickupLifeBonus||0)+5;p.ammoDropLuck*=1.2;}},
    brothBox:{icon:'▣',title:'BROTKASTEN',short:'Brotkasten',desc:'+1 permanentes Herz. Alle 35 Kills gibt es automatisch ein weiteres Herz Heilung.',apply:p=>{p.brothBox=true;p.maxHp++;p.hp=Math.min(p.maxHp,p.hp+1);}},
    hunnaExpert:{icon:'⌖',title:'HUNNA EXPERTE',short:'Hunna Experte',desc:'Jede zehnte normale Salve verursacht dreifachen Schaden und durchschlägt 2 zusätzliche Gegner.',apply:p=>p.hunnaExpert=true},
    crumbCompass:{icon:'✥',title:'KRÜMELKOMPASS',short:'Krümelkompass',desc:'8 % mehr Lauftempo und 20 % mehr Power-up-Dropchance. Für Hamster mit Orientierungssinn.',apply:p=>{p.speed*=1.08;p.powerLuck*=1.2;}},
    pretzelSling:{icon:'∞',title:'BREZELSCHLEUDER',short:'Brezelschleuder',desc:'Drei breite, durchschlagende Brezelgeschosse. Solider Linienschaden, 6 Ladungen.',weapon:'pretzelSling',apply:p=>{if(!p.weapons.includes('pretzelSling'))p.weapons.push('pretzelSling');p.weaponUses.pretzelSling=6+(p.ammoBonus||0);}},
    sausageMortar:{icon:'☄',title:'WEISSWURST-WERFER',short:'Weißwurst-Werfer',desc:'Drei schwere Weißwurst-Einschläge rund um dein Ziel. Hoher Flächenschaden, 2 Ladungen.',weapon:'sausageMortar',apply:p=>{if(!p.weapons.includes('sausageMortar'))p.weapons.push('sausageMortar');p.weaponUses.sausageMortar=2+(p.ammoBonus||0);}},
    spread:{icon:'⋔',title:'DOPPELT HÄLT BESSER',short:'Dreifachschuss',desc:'Drei Nüsse pro Salve. Jede verursacht 52 % Schaden – mehr Flächenkontrolle ohne dreifachen Boss-DPS.',apply:p=>p.spread=1},
    nutFan:{icon:'⋰',title:'NUSSFÄCHER',short:'Nussfächer',desc:'Jede normale Salve erhält zwei weit außen fliegende Nüsse mit je 26 % Schaden.',apply:p=>p.nutFan=true},
    rearNut:{icon:'↶',title:'RÜCKSPIEGELNUSS',short:'Rückspiegelnuss',desc:'Jede normale Salve feuert zusätzlich eine Nuss nach hinten. Sie verursacht 65 % Schaden und hält Verfolger auf Abstand.',apply:p=>p.rearNut=true},
    hotChamber:{icon:'♨',title:'HEISSE KAMMER',short:'Heiße Kammer',desc:'30 % höhere Feuerrate, dafür 12 % weniger normalen Projektilschaden. Stark für Proc-Builds, aber kein Gratis-DPS.',apply:p=>{p.hotChamber=true;p.fireRate/=1.30;p.damage*=.88;}},
    rapid:{icon:'»',title:'ESPRESSO-NÜSSE',short:'Schnellfeuer',desc:'30 % schneller feuern. Mehr Nuss pro Sekunde.',apply:p=>p.fireRate/=1.30},
    health:{icon:'♡',title:'DICKE BACKEN',short:'Extra-Herzen',desc:'2 zusätzliche Herzen und volle Heilung.',apply:p=>{p.maxHp+=2;p.hp=p.maxHp;}},
    pierce:{icon:'↗',title:'PANZERKNACKER',short:'Durchschlag',desc:'Schüsse durchdringen 2 weitere Gegner.',apply:p=>p.pierce+=2},
    power:{icon:'✳',title:'EXTRA KNACKIG',short:'Mehr Schaden',desc:'45 % mehr Schaden mit jeder Nuss.',apply:p=>p.damage*=1.45},
    bombs:{icon:'◎',title:'NUSS-ESKALATION',short:'Bombenvorrat',desc:'3 zusätzliche Nussbomben-Ladungen sofort.',apply:p=>p.weaponUses.nutBomb=(p.weaponUses.nutBomb||0)+3},
    frost:{icon:'❄',title:'FROSTNÜSSE',short:'Frostnüsse',desc:'Treffer bremsen Gegner 1,5 s lang um 28 %. Bosse: 12 %.',apply:p=>p.frost=true},
    chain:{icon:'ϟ',title:'KETTENKNACKER',short:'Kettenblitz',desc:'Jede 4. Salve lässt Blitze auf einen nahen Gegner überspringen.',apply:p=>p.chain=true},
    orbit:{icon:'◌',title:'NUSS-SATELLITEN',short:'Satelliten',desc:'Zwei kreisende Nüsse treffen Gegner in deiner Nähe.',apply:p=>p.orbit=true},
    nutSentry:{icon:'♜',title:'KNABBER-TURM',short:'Auto-Turm',desc:'Eine fliegende Wallnuss-Wache sucht selbstständig Ziele und feuert regelmäßig auf den nächsten Gegner.',apply:p=>{p.nutSentry=true;p.nutSentryCd=0;}},
    carrotDrone:{icon:'⌁',title:'MÖHREN-DROHNE',short:'Auto-Mörser',desc:'Eine kleine Drohne bombardiert automatisch alle paar Sekunden einen Gegner mit einer Mini-Möhrenexplosion.',apply:p=>{p.carrotDrone=true;p.carrotDroneCd=0;}},
    eggBooger:{icon:'●',title:'EIERPOPEL',short:'Eierpopel',desc:'Ein widerlicher Eierpopel springt automatisch von Gegner zu Gegner und bohrt sich in ihre Nasen. Verursacht regelmäßig mäßigen Schaden.',apply:p=>{p.eggBooger=true;p.eggBoogerCd=0;p.eggBoogerAnim=0;}},
    merzEggs:{icon:'🥚',title:'FRIEDRICH MERZ EIER',short:'Explosiv-Eier',desc:'Alle 5 Sekunden erscheinen automatisch zwei Hühnereier bei Gegnern und explodieren kurz darauf.',apply:p=>{p.merzEggs=true;p.merzEggCd=1;}},
    sniebelPlate:{icon:'▤',title:'SNIEBEL SCHNITTPLATTE',short:'Schnittplatte',desc:'Snickers schnallt sich Sniebels Schnittplatte auf den Rücken. Angriffe aus dem hinteren Halbkreis haben 50 % Chance, komplett an der Platte abzuprallen.',apply:p=>{p.sniebelPlate=true;}},
    lominarWorm:{icon:'〰',title:'DER LOMINARWURM',short:'Lominarwurm',desc:'Ein hektischer Wurm rast selbstständig durch die Arena. Berührte Gegner werden für kurze Zeit um etwa 30 % verlangsamt.',apply:p=>{p.lominarWorm=true;p.lominarX=-60;p.lominarY=rnd(150,H-80);p.lominarDir=1;}},
    reflex:{icon:'↯',title:'FLUMMI-REFLEX',short:'Schneller Dash',desc:'Dash-Cooldown um 29 % kürzer und 8 % schneller laufen.',apply:p=>{p.dashCooldown*=1.6/2.25;p.speed*=1.08;}},
    vampire:{icon:'♥',title:'SNACK-VAMPIR',short:'Snack-Vampir',desc:'Alle 22 besiegten Gegner: 1 Herz. Doppelte Sammelreichweite.',apply:p=>{p.vampire=true;p.magnet*=2;}},
    shield:{icon:'◇',title:'NOTFALL-SCHALE',short:'Schutzschale',desc:'Fängt einen Treffer ab. Lädt nach 15 Sekunden wieder auf.',apply:p=>{p.shield=true;p.shieldReady=true;p.shieldCd=0;}},
    waveRenew:{icon:'✚',title:'REGENERATIONSFELL',short:'Wellenheilung',desc:'Nach jeder künftig gewonnenen normalen Welle heilst du 50 % deiner maximalen Herzen, mindestens 3 Herzen. Heilt höchstens bis zum Maximum.',apply:p=>{p.waveRenew=true;}},
    carrotMine:{icon:'◇',title:'MÖHRENMACHER',short:'Möhrenmine',desc:'Große verzögerte Sprengfalle mit starkem Flächenschaden.',weapon:'carrotMine',apply:p=>{if(!p.weapons.includes('carrotMine'))p.weapons.push('carrotMine');p.weaponUses.carrotMine=(p.weaponUses.carrotMine||0)+6;}},
    peanutBoomerang:{icon:'↩',title:'RÜCKKEHR-NUSS',short:'Boomerang',desc:'Linienräumer: trifft Gegner auf dem Hin- und Rückflug erneut.',weapon:'peanutBoomerang',apply:p=>{if(!p.weapons.includes('peanutBoomerang'))p.weapons.push('peanutBoomerang');p.weaponUses.peanutBoomerang=(p.weaponUses.peanutBoomerang||0)+7;}},
    acornNova:{icon:'✹',title:'EICHEL-NOVA',short:'Eichel-Nova',desc:'20 durchschlagende Eicheln räumen Gegner rund um Snickers ab.',weapon:'acornNova',apply:p=>{if(!p.weapons.includes('acornNova'))p.weapons.push('acornNova');p.weaponUses.acornNova=(p.weaponUses.acornNova||0)+5;}},
    pigPopper:{icon:'✦',title:'SCHWEINEOPFER',short:'Schweineopfer',desc:'Extremer Schockstoß: massiver Schaden gegen Schweine und sehr hoher Boss-Schaden.',weapon:'pigPopper',apply:p=>{if(!p.weapons.includes('pigPopper'))p.weapons.push('pigPopper');p.weaponUses.pigPopper=(p.weaponUses.pigPopper||0)+4;}},
    ossiWall:{icon:'▥',title:'OSSI MAUER',short:'Ossi Mauer',desc:'Riegelt die Hälfte der Gegner kurz ab; im Bosskampf blockt sie ungefähr die Hälfte der Schüsse. 3 Ladungen.',weapon:'ossiWall',apply:p=>{if(!p.weapons.includes('ossiWall'))p.weapons.push('ossiWall');p.weaponUses.ossiWall=Math.min(maxWeaponAmmo('ossiWall'),(p.weaponUses.ossiWall||0)+3);}},
    ammo:{icon:'⊕',title:'MUNITIONSKISTE',short:'Mehr Munition',desc:'+1 maximale Ladung je Spezialwaffe und sofort +1 Ladung für jede freigeschaltete Waffe.',apply:p=>{p.ammoBonus=(p.ammoBonus||0)+1;for(const id of p.weapons)p.weaponUses[id]=Math.min((weaponBook[id].max+p.ammoBonus),(p.weaponUses[id]||0)+1);}},
    powerLuck:{icon:'✦',title:'POWER-GLÜCK',short:'Power-Glück',desc:'Gegner lassen etwas öfter Power-ups fallen.',apply:p=>p.powerLuck=(p.powerLuck||1)*1.45},
    homing:{icon:'⌁',title:'ZIELNUSSEN',short:'Nussradar',desc:'Schüsse korrigieren leicht in Richtung naher Gegner.',apply:p=>p.homing=true},
    crit:{icon:'✹',title:'KRITISCH KNACKIG',short:'Kritische Treffer',desc:'20 % Chance pro Projektil auf doppelten Schaden.',apply:p=>p.crit=(p.crit||0)+.2},
    turbo:{icon:'»',title:'TURBO-BACKEN',short:'Turbo-Feuer',desc:'20 % schneller feuern, ohne den Schaden zu verlieren.',apply:p=>p.fireRate/=1.20},
    fortified:{icon:'▣',title:'PANZERFELL',short:'Panzerfell',desc:'3 zusätzliche Herzen und volle Heilung.',apply:p=>{p.maxHp+=3;p.hp=p.maxHp;}},
    shockDash:{icon:'⚡',title:'SCHOCKSPRUNG',short:'Schock-Dash',desc:'Der Dash verletzt Gegner in deiner Flugbahn.',apply:p=>p.shockDash=true},
    scavenger:{icon:'✧',title:'PLÜNDERFELL',short:'Länger sammeln',desc:'Sammelradius und Lebensdauer von Drops steigen.',apply:p=>{p.magnet+=70;p.pickupLifeBonus=(p.pickupLifeBonus||0)+6;}},
    specialCore:{icon:'◆',title:'SPEZIAL-KERN',short:'Spezialschaden',desc:'Spezialwaffen verursachen 35 % mehr Schaden.',apply:p=>p.specialDamage=(p.specialDamage||1)*1.35},
    ammoHunter:{icon:'⊕',title:'MUNITIONS-SPÜRNASEN',short:'Ammo-Jäger',desc:'Seltene Spezialmunition fällt 45 % häufiger.',apply:p=>p.ammoDropLuck=(p.ammoDropLuck||1)*1.45},
    ironFur:{icon:'▰',title:'EISENFELL',short:'Eisenfell',desc:'18 % Chance, einen eingehenden Treffer komplett abzufangen.',apply:p=>p.damageGuard=Math.min(.45,(p.damageGuard||0)+.18)},
    hotPaws:{icon:'↯',title:'HEISSE PFOTEN',short:'Tempo+',desc:'12 % schneller laufen und Dash lädt 10 % schneller.',apply:p=>{p.speed*=1.12;p.dashCooldown*=.9;}},
    ammoScrounger:{icon:'✚',title:'DOPPELTE TASCHE',short:'Doppel-Munition',desc:'Munitionskisten füllen jede Waffe statt 50 % nun um 60 % auf.',apply:p=>p.ammoRefillBonus=Math.min(.35,(p.ammoRefillBonus||0)+.1)},
    hunter:{icon:'⌖',title:'GROSSWILDJÄGER',short:'Bossjäger',desc:'20 % mehr Schaden gegen Bosse und Minibosse.',apply:p=>p.bossDamage=(p.bossDamage||1)*1.2},
    walnutCannon:{icon:'◉',title:'WALLNUSS-KANONE',short:'Wallnuss-Kanone',desc:'Extrem schweres Projektil mit sehr hohem Schaden und starkem Durchschlag.',weapon:'walnutCannon',apply:p=>{if(!p.weapons.includes('walnutCannon'))p.weapons.push('walnutCannon');p.weaponUses.walnutCannon=(p.weaponUses.walnutCannon||0)+2;}},
    hazelnutShotgun:{icon:'⋰',title:'HASELNUSS-SCHROT',short:'Nuss-Schrot',desc:'Elf schwere Pellets mit enormer Schadensspitze auf kurze Distanz.',weapon:'hazelnutShotgun',apply:p=>{if(!p.weapons.includes('hazelnutShotgun'))p.weapons.push('hazelnutShotgun');p.weaponUses.hazelnutShotgun=(p.weaponUses.hazelnutShotgun||0)+5;}},
    carrotLaser:{icon:'━',title:'MÖHRENLASER',short:'Möhrenlaser',desc:'Breiter Sofortstrahl mit hohem Schaden durch die komplette Gegnerlinie.',weapon:'carrotLaser',apply:p=>{if(!p.weapons.includes('carrotLaser'))p.weapons.push('carrotLaser');p.weaponUses.carrotLaser=(p.weaponUses.carrotLaser||0)+2;}},
    acornRocket:{icon:'➤',title:'EICHEL-RAKETE',short:'Eichel-Rakete',desc:'Große Ziel-Explosion mit sehr hohem Flächen- und Boss-Schaden.',weapon:'acornRocket',apply:p=>{if(!p.weapons.includes('acornRocket'))p.weapons.push('acornRocket');p.weaponUses.acornRocket=(p.weaponUses.acornRocket||0)+2;}},
    nutDrill:{icon:'↠',title:'NUSSBOHRER',short:'Nussbohrer',desc:'Massive Bohrnuss mit enormem Linienschaden und extremem Durchschlag.',weapon:'nutDrill',apply:p=>{if(!p.weapons.includes('nutDrill'))p.weapons.push('nutDrill');p.weaponUses.nutDrill=(p.weaponUses.nutDrill||0)+2;}}
  };
  const legendarySkillBook={
    crownNut:{icon:'♛',title:'KRONENNUSS',short:'Kronennuss',desc:'+30 % normaler Schaden, +1 Durchschlag und +10 % Krit-Chance.',legendary:true,apply:p=>{p.damage*=1.30;p.pierce+=1;p.crit=Math.min(.65,(p.crit||0)+.1);}},
    ghostFur:{icon:'✧',title:'GEISTERFELL',short:'Geisterfell',desc:'18 % mehr Tempo, 25 % schnellerer Dash und +12 % Blockchance.',legendary:true,apply:p=>{p.speed*=1.18;p.dashCooldown*=.75;p.damageGuard=Math.min(.5,(p.damageGuard||0)+.12);}},
    arsenalRelic:{icon:'◆',title:'ARSENAL-RELIKT',short:'Arsenal-Relikt',desc:'+35 % Spezialschaden, +1 maximale Ladung je Waffe und Munitionskisten füllen 65 % statt 50 %.',legendary:true,apply:p=>{p.specialDamage=(p.specialDamage||1)*1.35;p.ammoBonus=(p.ammoBonus||0)+1;p.ammoRefillBonus=Math.min(.35,(p.ammoRefillBonus||0)+.15);}}
  };
  const ngPlusSkillBook={
    breadHalo:{icon:'◉',title:'BROTKRUSTEN-AURA',short:'Brotkrusten-Aura',desc:'NG+: Alle 4 Sekunden trifft eine Krustenwelle sämtliche Gegner im Umkreis. Skaliert mit deinem Schaden.',ngplus:true,apply:p=>p.breadHalo=true},
    creamHeart:{icon:'♡',title:'SAHNEHERZ',short:'Sahneherz',desc:'NG+: +3 permanente Herzen und volle Heilung. Heilt anschließend alle 18 Sekunden 1 Herz.',ngplus:true,apply:p=>{p.creamHeart=true;p.maxHp+=3;p.hp=p.maxHp;}},
    thunderCrumbs:{icon:'ϟ',title:'DONNERKRÜMEL',short:'Donnerkrümel',desc:'NG+: Jede sechste Salve löst zusätzlich zwei starke, durchschlagende Blitznüsse mit je 180 % Schaden aus.',ngplus:true,apply:p=>p.thunderCrumbs=true},
    pocketDimension:{icon:'⊞',title:'TASCHENDIMENSION',short:'Taschendimension',desc:'NG+: +1 maximale Ladung je Spezialwaffe und +35 Sammelradius. Munition wird regulär nachgeladen.',ngplus:true,apply:p=>{p.ammoBonus++;p.magnet+=35;}},
    afterHours:{icon:'☕',title:'FEIERABENDKAFFEE',short:'Feierabendkaffee',desc:'NG+: 12 % höhere Feuerrate und 8 % kürzerer Dash-Cooldown. Noch eine Runde geht immer.',ngplus:true,apply:p=>{p.fireRate/=1.12;p.dashCooldown*=.92;}},
    annihilator:{icon:'☠',title:'NUSS-ANNIHILATOR',short:'Annihilator',desc:'NG+: +35 % normaler Schaden und +20 % Spezialwaffen-Schaden.',ngplus:true,apply:p=>{p.damage*=1.35;p.specialDamage=(p.specialDamage||1)*1.2;}},
    hyperFur:{icon:'⚡',title:'HYPERFELL',short:'Hyperfell',desc:'NG+: +20 % Bewegungstempo und 20 % kürzerer Dash-Cooldown.',ngplus:true,apply:p=>{p.speed*=1.2;p.dashCooldown*=.8;}},
    turretVolley:{icon:'♜',title:'WACHEN-SCHWARM',short:'Wachen-Schwarm',desc:'NG+: Der Knabber-Turm feuert eine Doppelsalve und deutlich schneller.',ngplus:true,apply:p=>{p.nutSentry=true;p.turretVolley=true;}},
    powerFrenzy:{icon:'✦',title:'POWER-FIEBER',short:'Power-Fieber',desc:'NG+: Power-ups fallen 60 % häufiger und halten 30 % länger.',ngplus:true,apply:p=>{p.powerLuck=(p.powerLuck||1)*1.6;p.powerDuration=Math.max(p.powerDuration||1,1.3);p.powerFrenzy=true;}},
    executioner:{icon:'⌖',title:'ENDGEGNER-SCHRECK',short:'Boss-Schreck',desc:'NG+: +40 % Schaden gegen Bosse und Minibosse sowie +10 % Krit-Chance.',ngplus:true,apply:p=>{p.bossDamage=(p.bossDamage||1)*1.4;p.crit=Math.min(.75,(p.crit||0)+.1);p.executioner=true;}},
    dashNova:{icon:'✺',title:'DASH-KOMET',short:'Dash-Komet',desc:'NG+: Jeder Dash schleudert automatisch zwölf starke Nüsse radial heraus.',ngplus:true,apply:p=>{p.dashNova=true;p.dashCooldown*=.9;}},
    ammoAlchemy:{icon:'⊕',title:'MUNITIONS-ALCHEMIE',short:'Ammo-Alchemie',desc:'NG+: +2 maximale Ladungen für alle Spezialwaffen, +15 % Spezialschaden und Munitionskisten füllen deutlich stärker.',ngplus:true,apply:p=>{p.ammoAlchemy=true;p.ammoBonus=(p.ammoBonus||0)+2;p.specialDamage=(p.specialDamage||1)*1.15;p.ammoRefillBonus=Math.min(.45,(p.ammoRefillBonus||0)+.2);}},
    deathBurst:{icon:'✸',title:'TODESSPLITTER',short:'Todessplitter',desc:'NG+: Jeder fünfte Kill löst automatisch eine schädliche Nuss-Explosion am besiegten Gegner aus.',ngplus:true,apply:p=>{p.deathBurst=true;p.deathBurstKills=0;}}
  };
  const ngPlus2SkillBook={
    royalReactor:{icon:'♛',title:'KÖNIGSREAKTOR',short:'Königsreaktor',desc:'NG+2: +45 % normaler Schaden und +30 % Spezialwaffen-Schaden.',ngplus2:true,apply:p=>{p.ng2Reactor=true;p.damage*=1.45;p.specialDamage=(p.specialDamage||1)*1.3;}},
    timeEater:{icon:'⌛',title:'ZEITFRESSER',short:'Zeitfresser',desc:'NG+2: +18 % Bewegungstempo, 25 % kürzerer Dash und Gegner in deiner Nähe bewegen sich zusätzlich langsamer.',ngplus2:true,apply:p=>{p.ng2TimeField=true;p.speed*=1.18;p.dashCooldown*=.75;}},
    nuclearSentry:{icon:'☢',title:'NUKLEARER KNABBER-TURM',short:'Nuklear-Turm',desc:'NG+2: Der automatische Knabber-Turm wird zur starken Dreifachsalven-Wache.',ngplus2:true,apply:p=>{p.nutSentry=true;p.ng2Turret=true;p.turretVolley=true;}}
  };
  const ngPlus2WeaponUpgrades={
    creamRailgunUnlock:{icon:'═',title:'SAHNE-RAILGUN',short:'Sahne-Railgun',desc:'NG+2-Waffe: gigantischer Arena-Strahl mit massivem Linien- und Boss-Schaden. 2 Ladungen.',weapon:'creamRailgun',ngplus2:true,apply:p=>{if(!p.weapons.includes('creamRailgun'))p.weapons.push('creamRailgun');p.weaponUses.creamRailgun=maxWeaponAmmo('creamRailgun');}},
    gnomeArtilleryUnlock:{icon:'♟',title:'GARTENZWERG-ARTILLERIE',short:'Zwerg-Artillerie',desc:'NG+2-Waffe: sechs schwere Flächeneinschläge mit hoher Boss-Wirkung. 2 Ladungen.',weapon:'gnomeArtillery',ngplus2:true,apply:p=>{if(!p.weapons.includes('gnomeArtillery'))p.weapons.push('gnomeArtillery');p.weaponUses.gnomeArtillery=maxWeaponAmmo('gnomeArtillery');}}
  };
  const ngPlusWeaponUpgrades={
    mustardBazookaUnlock:{icon:'☢',title:'NUSS-BAZOOKA MIT SENF',short:'Senf-Bazooka',desc:'NG+-Waffe: gigantische Senfexplosion mit Splittersalve. Sehr stark, aber nur 2 Schuss.',weapon:'mustardBazooka',ngplus:true,apply:p=>{if(!p.weapons.includes('mustardBazooka'))p.weapons.push('mustardBazooka');p.weaponUses.mustardBazooka=maxWeaponAmmo('mustardBazooka');}},
    nutTeslaUnlock:{icon:'ϟ',title:'NUSS-TESLA',short:'Nuss-Tesla',desc:'NG+-Waffe: Kettenblitz durch bis zu acht Ziele. 3 Ladungen.',weapon:'nutTesla',ngplus:true,apply:p=>{if(!p.weapons.includes('nutTesla'))p.weapons.push('nutTesla');p.weaponUses.nutTesla=maxWeaponAmmo('nutTesla');}},
    pickleMortarUnlock:{icon:'◉',title:'GURKEN-MÖRSER',short:'Gurken-Mörser',desc:'NG+-Waffe: großer Flächenschaden plus Verlangsamung. 3 Ladungen.',weapon:'pickleMortar',ngplus:true,apply:p=>{if(!p.weapons.includes('pickleMortar'))p.weapons.push('pickleMortar');p.weaponUses.pickleMortar=maxWeaponAmmo('pickleMortar');}}
  };
  const upgradePools=[['spread','rapid','health','walnutCannon','nutSentry','eggBooger','sniebelPlate','lominarWorm','homing','hotPaws','specialCore','waveRenew'],['frost','carrotMine','hazelnutShotgun','carrotDrone','merzEggs','shield','turbo','ammoHunter','ironFur'],['orbit','power','peanutBoomerang','carrotLaser','nutSentry','ossiWall','crit','specialCore','hunter','waveRenew'],['reflex','vampire','acornNova','acornRocket','carrotDrone','eggBooger','sniebelPlate','lominarWorm','fortified','ammoScrounger','hotPaws'],['chain','frost','ammo','nutDrill','nutSentry','merzEggs','scavenger','ammoHunter','ironFur','waveRenew'],['power','orbit','pigPopper','walnutCannon','carrotDrone','ossiWall','shockDash','specialCore','hunter'],['peanutBoomerang','hazelnutShotgun','powerLuck','health','nutSentry','eggBooger','sniebelPlate','lominarWorm','homing','ammoScrounger','hotPaws','waveRenew'],['carrotMine','carrotLaser','nutDrill','ammo','carrotDrone','merzEggs','shield','crit','ammoHunter','ironFur'],['pigPopper','acornNova','acornRocket','power','nutSentry','carrotDrone','ossiWall','eggBooger','merzEggs','sniebelPlate','lominarWorm','turbo','specialCore','hunter','waveRenew']];
  const newNormalRewards=['rabbitCleft','corffelsBag','brothBox','hunnaExpert','crumbCompass','nutFan','rearNut','hotChamber','pretzelSling','sausageMortar'];
  upgradePools.forEach((pool,i)=>{const n=newNormalRewards.length;pool.push(newNormalRewards[i%n],newNormalRewards[(i+3)%n],newNormalRewards[(i+6)%n]);});
  const specialUpgradeBook={
    goldenNut:{icon:'✹',title:'GOLDENE NUSS',short:'Goldene Nuss',desc:'+45 % normaler Schaden und 50 % mehr Punkte.',apply:p=>{p.damage*=1.45;p.scoreRushBonus=(p.scoreRushBonus||1)*1.5;}},
    chronoFur:{icon:'◌',title:'CHRONO-FELL',short:'Chrono-Fell',desc:'Dash lädt 45 % schneller und Snickers läuft 18 % schneller.',apply:p=>{p.dashCooldown*=.55;p.speed*=1.18;}},
    nutstorm:{icon:'✣',title:'NUSSSTURM',short:'Nusssturm',desc:'Fünf kontrollierte Nüsse pro Salve, +2 Durchschlag. Sehr hohe Flächenkontrolle bei normalisiertem Einzelschaden.',apply:p=>{p.spread=1;p.pierce+=2;p.nutstorm=true;}},
    bossBane:{icon:'☠',title:'BOSS-BANN',short:'Boss-Bann',desc:'Bosse und Minibosse erleiden 40 % mehr Schaden.',apply:p=>p.bossDamage=(p.bossDamage||1)*1.4},
    shellArmor:{icon:'◇',title:'SCHALE AUS STAHL',short:'Stahlschale',desc:'4 Herzen, eine geladene Schutzschale und 1 s Startschutz.',apply:p=>{p.maxHp+=4;p.hp=p.maxHp;p.shield=true;p.shieldReady=true;p.invuln=1;}},
    powerCondenser:{icon:'✦',title:'POWER-KONDENSATOR',short:'Power-Kondensator',desc:'Power-ups halten 65 % länger und fallen 55 % häufiger.',apply:p=>{p.powerDuration=Math.max(p.powerDuration||1,1.65);p.powerLuck=(p.powerLuck||1)*1.55;}},
    boomerangMaster:{icon:'↩',title:'ARSENAL-MEISTER',short:'Arsenal-Meister',desc:'Alle Spezialwaffen bekommen +2 maximale Ladungen und verursachen 20 % mehr Schaden. Keine automatische Auffüllung.',apply:p=>{p.ammoBonus=(p.ammoBonus||0)+2;p.specialDamage=(p.specialDamage||1)*1.2;}},
    ammoForge:{icon:'⊕',title:'FERKEL-MUNITIONSWERK',short:'Ammo-Werk',desc:'Munitionsdrops fallen 85 % häufiger und Kisten füllen jede Waffe zusätzlich 20 % stärker auf.',apply:p=>{p.ammoDropLuck=(p.ammoDropLuck||1)*1.85;p.ammoRefillBonus=Math.min(.35,(p.ammoRefillBonus||0)+.2);}},
    savageCore:{icon:'◆',title:'WILDER KERN',short:'Wilder Kern',desc:'+32 % normaler Schaden und +30 % Spezialwaffen-Schaden.',apply:p=>{p.damage*=1.32;p.specialDamage=(p.specialDamage||1)*1.30;}},
    graniteFur:{icon:'▣',title:'GRANITFELL',short:'Granitfell',desc:'+4 permanente Herzen, volle Heilung und zusätzliche 15 % Blockchance.',apply:p=>{p.maxHp+=4;p.hp=p.maxHp;p.damageGuard=Math.min(.5,(p.damageGuard||0)+.15);}}
  };
  const specialUpgradePools=[['goldenNut','chronoFur','nutstorm','ammoForge'],['bossBane','shellArmor','powerCondenser','savageCore'],['boomerangMaster','goldenNut','nutstorm','graniteFur','ammoForge','savageCore']];
  function availableRewards(includeSpecial=false){
    const books=[skillBook,legendarySkillBook];
    if(newGamePlus||(endlessMode&&(endlessFromHall||wave>=5)))books.push(ngPlusSkillBook,ngPlusWeaponUpgrades);
    if(gamePlusLevel===2||(endlessMode&&(endlessFromHall||wave>=13)))books.push(ngPlus2SkillBook,ngPlus2WeaponUpgrades);
    if(endlessMode)books.push(survivalSkillBook,survivalWeaponUpgrades);
    const rewards=books.flatMap(book=>Object.entries(book).map(([id,c])=>({...c,id})));
    if(includeSpecial)rewards.push(...Object.entries(specialUpgradeBook).map(([id,c])=>({...c,id,special:true})));
    return rewards.filter(c=>!(c.id==='spread'&&player.nutstorm)&&!(c.id==='nutSentry'&&player.nutSentry)&&!(c.id==='turretVolley'&&player.turretVolley)&&!(c.id==='shield'&&player.shield)).filter(c=>c.special?!player.specials?.[c.id]:!player.skills[c.id]&&(!c.weapon||!player.weapons.includes(c.weapon)));
  }
  function rewardChoices(){
    const available=availableRewards(),base=available.filter(c=>!c.legendary&&!c.ngplus&&!c.ngplus2);
    const preferred=base.filter(c=>endlessMode||upgradePools[wave]?.includes(c.id));
    let choices=shuffled(preferred).slice(0,3);
    for(const c of shuffled(base)){if(choices.length>=3)break;if(!choices.some(item=>item.id===c.id))choices.push(c);}
    const offer=(pool,chance)=>{if(pool.length&&Math.random()<chance){const c=shuffled(pool)[0];if(!choices.some(item=>item.id===c.id)){if(choices.length<3)choices.push(c);else choices[Math.floor(Math.random()*choices.length)]=c;}}};
    if(!choices.some(c=>c.weapon))offer(base.filter(c=>c.weapon),.68);
    offer(available.filter(c=>c.ngplus&&!c.weapon),.62);offer(available.filter(c=>c.ngplus&&c.weapon),.58);
    offer(available.filter(c=>c.ngplus2&&!c.weapon),.58);offer(available.filter(c=>c.ngplus2&&c.weapon),.52);
    offer(available.filter(c=>c.legendary),.04);
    // Never leave a reward slot empty while any unowned reward remains, even a rare one.
    for(const c of shuffled(available)){if(choices.length>=3)break;if(!choices.some(item=>item.id===c.id))choices.push(c);}
    if(!choices.length&&endlessMode)choices=shuffled(availableRewards(true)).slice(0,3);
    return choices;
  }
  function grantReward(c){    if(c.special?player.specials?.[c.id]:player.skills[c.id]||(c.weapon&&player.weapons.includes(c.weapon)))return;
    c.apply(player);normalizeBuild(player);if(c.weapon)player.weaponUses[c.weapon]=maxWeaponAmmo(c.weapon);
    if(c.special){player.specials??={};player.specials[c.id]=1;}
    else if(!c.weapon)player.skills[c.id]=1;
    if(newGamePlus&&c.ngplus&&!c.weapon){addAchievementProgress('ngplus_first_skill');recordDistinct('ngplus_all_skills',c.id);}
    if(c.ngplus2&&!c.weapon)addAchievementProgress('ng2_skill');if(c.ngplus2&&c.weapon)addAchievementProgress('ng2_weapon');
    if(c.id==='crownNut')addAchievementProgress('crown_found');if(c.id==='ghostFur')addAchievementProgress('ghosted');if(c.id==='arsenalRelic')addAchievementProgress('relic_run');
    setAchievementProgress('arsenal',player.weapons.length);updateHud();updateWeaponHud();updateSkills();
  }
  function updateSkills(){
    const ids=Object.keys(player.skills);$('skillHud').innerHTML=ids.map(id=>{const info=skillBook[id]||legendarySkillBook[id]||ngPlusSkillBook[id]||ngPlus2SkillBook[id]||survivalSkillBook[id];return info?`<span class="${info.legendary?'legendary-skill-chip':''}" title="${info.title}">${info.icon}<span>${info.short}</span>${player.skills[id]>1?` ×${player.skills[id]}`:''}</span>`:'';}).join('');
    $('skillHud').classList.toggle('hidden',!ids.length);
  }
  const scoreSkillBook={
    damage:{icon:'✹',title:'SCHADEN',desc:'+10 % dauerhafter Schaden.',apply:p=>p.damage*=1.10},
    speed:{icon:'»',title:'BEWEGUNGSGESCHWINDIGKEIT',desc:'+10 % dauerhafte Bewegungsgeschwindigkeit.',apply:p=>p.speed*=1.10},
    fireRate:{icon:'ϟ',title:'SCHUSSGESCHWINDIGKEIT',desc:'+10 % dauerhafte Feuerrate.',apply:p=>p.fireRate/=1.10},
    dash:{icon:'↯',title:'DASH COOLDOWN',desc:'10 % kürzerer Dash-Cooldown.',apply:p=>p.dashCooldown*=.90},
    powerLuck:{icon:'✦',title:'POWER-UP-DROPCHANCE',desc:'+10 % dauerhafte Power-up-Dropchance.',apply:p=>p.powerLuck*=1.10},
    dodge:{icon:'◈',title:'DODGE-CHANCE',desc:'+2 % Chance, einen gegnerischen Treffer komplett auszuweichen. Jede weitere Stufe gibt erneut +2 %.',apply:p=>p.dodgeChance=Math.min(.40,(p.dodgeChance||0)+.02)}
  };
  function queueScoreSkillMilestones(){
    if(!player)return;
    if(!player.scoreSkillQueue.length&&score>=player.scoreSkillNext)player.scoreSkillQueue.push(player.scoreSkillNext);
    if(mode==='playing'&&player.scoreSkillQueue.length)showScoreSkillMenu();
  }
  function showScoreSkillMenu(afterReward=null){
    const fallback=typeof afterReward==='function';
    if(!player||(!fallback&&(!player.scoreSkillQueue.length||mode!=='playing')))return;
    // The replacement reward is legal only after every unique endless reward is owned.
    if(fallback&&(!endlessMode||availableRewards(true).length))return;
    const milestone=player.scoreSkillQueue[0];
    mode='scoreSkill';resetInput();$('announcement').classList.add('hidden');
    const entries=Object.entries(scoreSkillBook).filter(([id])=>scorePerkAvailable(id));
    const nextTarget=milestone+scoreSkillCost(scorePerkLevels(player)+1);
    const kicker=fallback?'ALLE SKILLS UND WAFFEN GESAMMELT':`${milestone.toLocaleString('de-DE')} PUNKTE · PERMANENTER BONUS`;
    const description=fallback?'Dein einzigartiger Build ist komplett: Alle Skills, Waffen und Boss-Upgrades sind bereits gewählt. Als Ersatz darfst du jetzt einen permanenten Punkte-Bonus wählen. Es erscheinen keine doppelten Skills.':`Der Kampf ist pausiert. Die nächste Punkte-Schwelle liegt nach dieser Wahl bei <strong>${nextTarget.toLocaleString('de-DE')}</strong> Punkten in diesem Run. Der Abstand steigt pro gewähltem Bonus um 25.000 Punkte.`;
    showOverlay(`<span class="eyebrow">${kicker}</span><h2 id="overlayTitle">SNICKERS WIRD STÄRKER.</h2><p>${description}</p><div class="upgrades score-skill-upgrades">${entries.map(([id,c],i)=>`<button class="upgrade skill-upgrade score-skill-card" id="scoreSkill${i}" data-perk="${id}"><small class="upgrade-kind skill-kind">${fallback?'ERSATZ-BONUS':'PUNKTE-SKILL'} · STUFE ${(player.scorePerks[id]||0)+1}</small><span class="upgrade-icon">${c.icon}</span><strong>${c.title}</strong><span>${c.desc}</span><em>${['heart','ammo','shuffle'].includes(id)?'+1 WÄHLEN':id==='dodge'?'+2 % DODGE':id==='dash'?'−10 % COOLDOWN':'+10 % WÄHLEN'} ↗</em></button>`).join('')}</div>`);
    entries.forEach(([id,c],i)=>{$(`scoreSkill${i}`).onclick=()=>{
      if(mode!=='scoreSkill')return;
      c.apply(player);normalizeBuild(player);player.scorePerks[id]=(player.scorePerks[id]||0)+1;
      if(!fallback){player.scoreSkillQueue.shift();player.scoreSkillNext=milestone+scoreSkillCost(scorePerkLevels(player));}
      tone(660,.24,'triangle',.08,990);updateHud();hideOverlay();
      if(fallback){afterReward();return;}
      mode='playing';player.invuln=Math.max(player.invuln,.75);lastFrame=performance.now();
      if(player.scoreSkillQueue.length)showScoreSkillMenu();
    };});
  }
  function startWave(next,keepRetries=false){
    wave=next;waveTime=0;spawnTimer=1;shotTimer=.2;player.specialCd=0;player.waveShuffle=0;poisonPatches=[];ratSwarms=[];thrownWeapons=[];minibossPlan=keepRetries?(minibossPlan?{...minibossPlan,spawned:false}:null):planMiniBoss(next);player.emergencyUsed=false;boss=null;mode='playing';ossiWalls=[];player.ossiWallTime=0;player.invuln=1.8;player.usedBombThisWave=false;player.waveHits=0;player.ammoDropsThisWave=0;player.ammoDropTarget=2+Math.floor(Math.random()*4);player.ammoDryKills=0;player.waveAmmoSnapshot=snapshotAmmo();
    if(endlessMode){if(!keepRetries&&!stagePrepared)stageVisual=randomStage(stageVisual);stagePrepared=false;}
    else stageVisual=wave<3?0:wave<6?1:2;
    makeGround();
    hideOverlay();$('bossHud').classList.add('hidden');updateHud();
    announce(endlessMode?`ENDLOS-WELLE ${String(wave+1).padStart(2,'0')}`:`WELLE ${String(wave+1).padStart(2,'0')} / 09`,endlessMode?stageNames[stageVisual]+' · ENDLOSMODUS':stageNames[stageVisual]+' · '+waveNames[wave]);
    if(endlessMode&&wave+1>=10)addAchievementProgress('endless_10');if(endlessMode&&wave+1>=25)addAchievementProgress('endless_25');

    musicTrack=-1;
  }
  function showGeneralInterlude(){
    generalDefeated=true;mode='interlude';resetInput();enemies=[];bullets=[];enemyBullets=[];hazards=[];pickups=[];boss=null;
    $('bossHud').classList.add('hidden');$('announcement').classList.add('hidden');
    showOverlay(`<span class="eyebrow">AKT I GESCHAFFT · AKT II WARTET</span><h2 id="overlayTitle">TOTGESAGTE HOPPELN LÄNGER.</h2><p>Hasenbein ist gefallen. Doch unter dem Möhrenfeld fährt ein geheimes Labor hoch. Seine Terror-Kaninchen sammeln die Reste ein. Ein neuer Körper wartet schon.</p>${bossQuoteMarkup()}<p>Wellen 4–6 bringen dich zu Cyber-Hasenbein. Danach beginnt der Steinbruch-Abschnitt.</p><button class="primary-button" id="actTwoButton">WEITER MIT WELLE 4 <span>↗</span></button>`);
    $('actTwoButton').onclick=()=>{if(mode!=='interlude')return;player.hp=player.maxHp;player.x=W/2;player.y=H/2+25;startWave(3);};
    tone(85,.7,'sawtooth',.07,200);
  }
  function showCyberInterlude(){
    cyberDefeated=true;mode='interlude';resetInput();enemies=[];bullets=[];enemyBullets=[];hazards=[];pickups=[];boss=null;$('bossHud').classList.add('hidden');$('announcement').classList.add('hidden');
    showOverlay(`<span class="eyebrow">AKT II GESCHAFFT · DER STEINBRUCH RUFT</span><h2 id="overlayTitle">DAS WAR SEIN LETZTES UPDATE.</h2><p>Cyber-Hasenbein ist endgültig ausgeschaltet. Hinter der eingestürzten Felswand rumpelt es trotzdem weiter. Etwas Großes hat dort sehr lange auf seine Rückkehr gewartet.</p>${bossQuoteMarkup()}<button class="primary-button" id="actThreeButton">IN DEN STEINBRUCH <span>↗</span></button>`);
    $('actThreeButton').onclick=()=>{if(mode!=='interlude')return;player.hp=player.maxHp;startWave(6);};tone(72,.8,'sawtooth',.08,190);
  }
  function bossUpgradeScreen(kind){
    stageAfterBoss(kind);refillWeaponsAfterWave();
    mode='bossUpgrade';resetInput();enemies=[];bullets=[];enemyBullets=[];hazards=[];pickups=[];$('bossHud').classList.add('hidden');$('announcement').classList.add('hidden');
    const afterBoss=()=>{
      if(kind==='general')showGeneralInterlude();
      else if(kind==='cyber')showCyberInterlude();
      else if(kind==='endless'){boss=null;mode='playing';startWave(wave+1);}
      else if(kind==='karnil'&&gamePlusLevel===2){
        boss=null;mode='interlude';player.hp=player.maxHp;stageVisual=3;makeGround();
        showOverlay(`<span class="eyebrow">NG+2 · EINE LETZTE STAGE</span><h2 id="overlayTitle">DA GRUNZT NOCH WAS.</h2><p>Karnil ist erledigt. Snickers heilt vollständig und nimmt das Boss-Upgrade mit. Hinter der Sahneküche wartet Ottah – ein Warzenschwein mit drei Phasen und bemerkenswert schlechter Laune.</p>${bossQuoteMarkup()}<button class="primary-button" id="ottahStart">ZU OTTAH <span>↗</span></button>`);
        $('ottahStart').onclick=()=>{if(mode!=='interlude')return;hideOverlay();mode='playing';spawnOttah();};
      }else{boss=null;mode='playing';finish(true);}
    };
    const index=kind==='general'?0:kind==='cyber'?1:2;
    const unowned=availableRewards(true).filter(c=>c.special);
    let choices=shuffled(unowned.filter(c=>specialUpgradePools[index].includes(c.id))).slice(0,3);
    for(const c of shuffled(unowned)){if(choices.length>=3)break;if(!choices.some(item=>item.id===c.id))choices.push(c);}
    if(!choices.length&&endlessMode)choices=shuffled(availableRewards(true)).slice(0,3);
    const label=kind==='endless'?'ENDLOS-BOSS GEFÄLLT':kind==='karnil'?'KARNIL GEFÄLLT':kind==='cyber'?'CYBER-HASENBEIN GEFÄLLT':'GENERAL HASENBEIN GEFÄLLT';
    if(!choices.length){
      if(endlessMode){showScoreSkillMenu(afterBoss);return;}
      showOverlay(`<span class="eyebrow">${label}</span><h2 id="overlayTitle">BOSS-BEUTE LEERGEKNABBERT.</h2>${bossQuoteMarkup()}<p>Du besitzt bereits jedes Boss-Upgrade. Du erhältst +1 permanentes Herz, volle Heilung und die normale Boss-Munitionsauffüllung.</p><button class="primary-button" id="bossSupplyReward">VORRÄTE NEHMEN <span>↗</span></button>`);
      $('bossSupplyReward').onclick=()=>{if(mode!=='bossUpgrade')return;player.maxHp++;normalizeBuild(player);player.hp=player.maxHp;updateHud();afterBoss();};return;
    }
    showOverlay(`<span class="eyebrow">${label} · ${stageNames[stageVisual]}</span><h2 id="overlayTitle">BEUTE AUS DEM BOSS.</h2>${bossQuoteMarkup()}<p>Wähle ein neues Upgrade. Bereits gewählte Skills und Waffen erscheinen nicht erneut. Alle Spezialwaffen sind vollständig nachgeladen.</p><div class="upgrades special-upgrades">${choices.map((c,i)=>`<button class="upgrade ${c.special?'special-upgrade':c.weapon?'weapon-upgrade':'skill-upgrade'}" id="specialUpgrade${i}" data-skill="${c.id}"><small class="upgrade-kind special-kind">${c.special?'BOSS-UPGRADE':c.weapon?'WAFFE':'SKILL'}</small><span class="upgrade-icon">${c.icon}</span><strong>${c.title}</strong><span>${c.desc}</span><em>WÄHLEN ↗</em></button>`).join('')}</div>`);
    choices.forEach((c,i)=>{$(`specialUpgrade${i}`).onclick=()=>{if(mode!=='bossUpgrade')return;grantReward(c);player.weaponUses.nutBomb=maxWeaponAmmo('nutBomb');tone(620,.25,'triangle',.08,1240);afterBoss();};});
  }
  function generalDown(){lastDefeatedBoss='general';recordDistinct('boss_breaker',lastDefeatedBoss);recordDistinct('wallpaper',lastDefeatedBoss);beginVictory(()=>bossUpgradeScreen('general'));}
  function cyberDown(){lastDefeatedBoss='cyber';recordDistinct('boss_breaker',lastDefeatedBoss);recordDistinct('wallpaper',lastDefeatedBoss);beginVictory(()=>bossUpgradeScreen('cyber'));}
  function continueAfterWave(){
    player.waveShuffle=0;player.weaponUses.nutBomb=maxWeaponAmmo('nutBomb');player.invuln=2;mode='playing';hideOverlay();
    if(endlessMode){if((wave+1)%5===0)spawnEndlessBoss();else startWave(wave+1);}
    else if(wave===2)spawnBoss(false);else if(wave===5)spawnBoss(true);else if(wave===8)spawnBoss(false,true);else startWave(wave+1);
  }
  function upgradeScreen(){prepareWaveReward();renderWaveReward();}
  function finish(won) {
    if(!won&&mode==='playing'&&retriesLeft>0){
      retryWave=wave;retryBossKind=boss&&!boss.dead?{cyber:Boolean(boss.cyber),karnil:Boolean(boss.karnil),ottah:Boolean(boss.ottah),endlessBoss:Boolean(boss.endlessBoss),endlessKind:boss.endlessKind||null,phaseTwo:Boolean(boss.phaseTwo)}:null;mode='retry';resetInput();$('announcement').classList.add('hidden');
      const section=retryBossKind?(retryBossKind.ottah?'Ottah-Kampf':retryBossKind.endlessBoss?'Endlos-Bosskampf':retryBossKind.karnil?'Bosskampf':'Bossphase'):'Welle';
      showOverlay(`<span class="eyebrow">SNICKERS IST NOCH NICHT FERTIG</span><h2 id="overlayTitle">NOCH EIN RETRY?</h2><p>Der aktuelle ${section} ist verloren, aber du hast noch <strong>${retriesLeft}</strong> von 3 Retries für diesen gesamten Run. Skills und Punkte bleiben erhalten.</p><div class="retry-badge">RETRY-MARKEN ÜBRIG: ${retriesLeft}</div><div class="overlay-actions"><button id="retryWaveButton" class="primary-button">AKTUELLEN ABSCHNITT RETRY <span>↗</span></button><button id="retryMenuButton" class="secondary-button">HAUPTMENÜ</button></div>`);
      $('retryWaveButton').onclick=retryCurrentWave;$('retryMenuButton').onclick=goMenu;tone(210,.4,'triangle',.08,90);return;
    }
    if(mode!=='playing')return;
    mode=won?'won':'lost';resetInput();$('announcement').classList.add('hidden');
    if(won){
      score+=Math.round((5000+player.hp*250+Math.max(0,Math.round((620-runTime)*15)))*(hardMode?1.55:1));setAchievementProgress('wave_runner',9);
      if(lastDefeatedBoss==='karnil'||lastDefeatedBoss==='ottah')addAchievementProgress('housepig');
      if(retriesLeft>0)addAchievementProgress('nutty_survivor');if(hardMode&&!impossibleMode&&retriesLeft>=2)addAchievementProgress('hard_spare_retries');if(hardMode&&!impossibleMode&&gamePlusLevel===2&&retriesLeft===3)addAchievementProgress('hard_ng2_perfect_retries');if(gamePlusLevel===1)addAchievementProgress('ngplus_clear');
      persistProgressionWin();
    }
    const isRecord=score>record;if(isRecord){record=score;try{localStorage.setItem('snickers3-best-v4',String(record));}catch{}}
    updateHud();
    const ottahEnding=won&&lastDefeatedBoss==='ottah',karnilEnding=won&&lastDefeatedBoss==='karnil',epilogue=ottahEnding||karnilEnding;
    const headline=ottahEnding?'SAHNEFRIEDEN.':karnilEnding?'DER GARTEN HAT JETZT SCHWEIN.':won?'DIE NUSS GEHÖRT DIR.':retriesLeft<=0?'DAS WAR’S, SNICKERS.':'KARNIL LACHT NOCH.';
    const copy=ottahEnding?'Ottah ist besiegt. Statt sich weiter zu prügeln, schließen Snickers und das Warzenschwein Frieden. Seitdem stehen beide gemeinsam am Topf und kochen Sahne. Niemand weiß warum. Niemand traut sich zu fragen.':karnilEnding?'Snickers gönnt sich zur Feier des Tages einen gewaltigen Nussberg. Karnil steht derweil als ausgesprochen unwilliges Hausschwein im Garten. An der Wand hängt das Fell von Hasenbein. Es passt erstaunlich gut zur Tapete.':won?'Neun Wellen. Drei Bosse. Eine Nuss. Snickers: „Ich hätte gern eine Belohnung, die nicht versucht, mich zu fressen.“':retriesLeft<=0?'Alle drei Retry-Marken dieses Runs sind verbraucht. Die Hasenjagd endet hier — aber der nächste Lauf wartet schon.':['Diese Ferkel spielen unfair. Zum Glück gibt es noch einen Versuch.','Auch Helden brauchen mal einen zweiten Anlauf. Die Nuss wartet auf dich.','Zu viele Schweine. Zu wenig Deckung. Du weißt jetzt, wie der Hase läuft.'][Math.floor(Math.random()*3)];
    const endingArt=epilogue?`<div class="ending-gag-art" aria-label="Lustiger Abspann"><svg viewBox="0 0 640 230" role="img"><rect width="640" height="230" rx="18" fill="#17241f"/><rect y="170" width="640" height="60" fill="#26372d"/><g fill="#bd8b4a"><circle cx="250" cy="172" r="18"/><circle cx="280" cy="165" r="20"/><circle cx="310" cy="176" r="17"/><circle cx="335" cy="160" r="19"/><circle cx="365" cy="174" r="18"/></g><g transform="translate(270 105)"><ellipse cx="0" cy="27" rx="38" ry="33" fill="#d99b50"/><circle cx="-24" cy="0" r="15" fill="#c47c3e"/><circle cx="24" cy="0" r="15" fill="#c47c3e"/><circle cx="-12" cy="22" r="4" fill="#1b2820"/><circle cx="12" cy="22" r="4" fill="#1b2820"/><path d="M-7 33 Q0 40 7 33" stroke="#6d3f2e" stroke-width="4" fill="none"/></g><g transform="translate(450 128)"><ellipse cx="0" cy="30" rx="54" ry="36" fill="${ottahEnding?'#9b6659':'#b96d64'}"/><circle cx="0" cy="0" r="35" fill="${ottahEnding?'#b97868':'#d48479'}"/><ellipse cx="0" cy="14" rx="16" ry="10" fill="#dfa08f"/><circle cx="-12" cy="-5" r="4"/><circle cx="12" cy="-5" r="4"/><path d="M-14 15 L-34 27 L-27 9" fill="#f2e1b6"/><path d="M14 15 L34 27 L27 9" fill="#f2e1b6"/>${ottahEnding?'<rect x="-42" y="52" width="84" height="8" rx="4" fill="#fff0d0"/><circle cx="0" cy="52" r="22" fill="#fff8e6"/>':'<path d="M-26 -27 L0 -75 L26 -27 Z" fill="#f0cf54"/><circle cx="0" cy="-75" r="7" fill="#ff726d"/>'}</g><g transform="translate(92 70)"><rect x="-45" y="-35" width="90" height="90" rx="12" fill="#36483d" stroke="#758e7a" stroke-width="4"/><path d="M-18 -4 C-30 -35 -4 -42 0 -13 C4 -42 30 -35 18 -4 C35 13 26 42 0 42 C-26 42 -35 13 -18 -4Z" fill="#b8c5b2"/><circle cx="-10" cy="8" r="4"/><circle cx="10" cy="8" r="4"/></g><text x="320" y="216" fill="#e7efdc" font-size="13" text-anchor="middle" font-family="Arial">${ottahEnding?'SNICKERS + OTTAH · GEMEINSAM SAHNE KOCHEN.':'SNICKERS FEIERT. KARNIL BEREUT ALLES.'}</text></svg></div><blockquote class="snickers-quote"><b>ABSPANN</b>${ottahEnding?'Snickers rührt. Ottah grunzt. Die Sahne köchelt. Freundschaften beginnen manchmal sehr merkwürdig.':'Snickers isst Nüsse. Karnil grunzt. Die Nachbarschaft beschwert sich über beides.'}</blockquote>`:'';
    showOverlay(`<span class="eyebrow">${won?'MISSION ERFÜLLT · NUSS GESICHERT':retriesLeft<=0?'GAME OVER · ALLE RETRIES VERBRAUCHT':'MISSION GESCHEITERT · EGO LEICHT ANGEKNABBERT'}</span><h2 id="overlayTitle">${headline}</h2><p>${copy}</p>${endingArt}${won?bossQuoteMarkup():''}${isRecord?'<div class="new-record">NEUER LOKALER REKORD</div>':''}<div class="stats"><div><strong>${score.toLocaleString('de-DE')}</strong><span>PUNKTE</span></div><div><strong>${kills}</strong><span>GEGNER BESIEGT</span></div><div><strong>${formatTime(runTime)}</strong><span>ÜBERLEBT</span></div></div><div class="overlay-actions"><button id="retryButton" class="primary-button">WEITER <span>↗</span></button><button id="endMenuButton" class="secondary-button">Hauptmenü</button></div>`);
    if(won){const nextLevel=gamePlusLevel===0?1:gamePlusLevel===1?2:0;$('retryButton').textContent=gamePlusLevel===0?'NEW GAME+ STARTEN ↗':gamePlusLevel===1?'NEW GAME+2 STARTEN ↗':'KOMPLETT NEUER RUN ↗';$('retryButton').onclick=()=>nextLevel?requestRunStart(nextLevel,hardMode,null,impossibleMode):impossibleMode?showImpossibleModes():chooseRunMode(0);}
    else $('retryButton').onclick=()=>{if(endlessMode){goMenu();setTimeout(()=>showEndlessSelect(hardMode),0);}else chooseRunMode(0);};
    $('endMenuButton').onclick=goMenu;
    if(won){tone(523,.3,'triangle',.1);setTimeout(()=>tone(659,.3,'triangle',.1),150);setTimeout(()=>tone(1046,.5,'triangle',.1),300);}else tone(180,.55,'triangle',.1,50);
  }
  function retryCurrentWave(){
    if(mode!=='retry'||retriesLeft<=0)return;
    retriesLeft--;addAchievementProgress('retry_hero');addAchievementProgress('three_strikes');
    enemies=[];bullets=[];enemyBullets=[];hazards=[];pickups=[];floaters=[];thrownWeapons=[];ossiWalls=[];boss=null;paftiBoss=null;clearCombatExtras();player.ossiWallTime=0;player.hp=Math.max(1,Math.ceil(player.maxHp*.65));player.powerups={};player.invuln=2;
    const savedWave=retryWave,savedBoss=retryBossKind;retryBossKind=null;hideOverlay();
    if(savedBoss){mode='playing';const ammoState=player.bossAmmoSnapshot;if(savedBoss.ottah)spawnOttah();else if(savedBoss.endlessBoss)spawnEndlessBoss(true,savedBoss.endlessKind);else spawnBoss(savedBoss.cyber,savedBoss.karnil,true);restoreAmmo(ammoState);player.bossAmmoSnapshot=snapshotAmmo();announce(savedBoss.ottah?'RETRY · OTTAH VON VORN':savedBoss.endlessBoss?'RETRY · ENDLOS-BOSS':savedBoss.karnil?'RETRY · KARNIL VON VORN':'RETRY · BOSS-PHASE',savedBoss.ottah?'PHASE 1 · ERSTES GRUNZEN':savedBoss.endlessBoss?(boss?.endlessName||'ENDLOS-BOSS'):savedBoss.karnil?'PHASE 1 · FELSENBRECHER':savedBoss.cyber?'CYBER-HASENBEIN':'GENERAL HASENBEIN');updateHud();}
    else {restoreAmmo(player.waveAmmoSnapshot);startWave(savedWave,true);}
  }
  function formatTime(n) { return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(Math.floor(n%60)).padStart(2,'0')}`; }
  function updateHud() {
    if (!player) return;
    $('healthBar').innerHTML = Array.from({length:Math.min(30,player.maxHp)},(_,i)=>`<i class="health-segment${i < player.hp ? '' : ' empty'}"></i>`).join('');
    $('healthText').textContent = `${displayNumber(player.hp)}/${player.maxHp}`;
    $('scoreValue').textContent = String(score).padStart(6,'0');
    $('waveLabel').textContent = boss ? (endlessMode?`ENDLOS · BOSS · WELLE ${wave+1}`:`${gamePlusLevel===2?'NG+2 · ':newGamePlus?'NG+ · ':''}${boss.ottah?'BOSS 04 / 04':boss.karnil?'BOSS 03 / 03':boss.cyber?'BOSS 02 / 03':'BOSS 01 / 03'}`) : (endlessMode?`ENDLOS · WELLE ${String(wave+1).padStart(2,'0')}`:`${gamePlusLevel===2?'NG+2 · ':newGamePlus?'NG+ · ':''}WELLE ${String(wave+1).padStart(2,'0')} / 09`);
    $('waveFill').style.width = boss ? '100%' : `${clamp(waveTime / currentWaveLength() * 100, 0, 100)}%`;
    const alive=livingEnemyCount();
    $('waveObjective').textContent = boss ? (boss.ottah?`OTTAH · PHASE ${boss.ottahPhase||1} / 3`:boss.endlessBoss?`ENDLOS-BOSS · ${boss.endlessName}`:boss.karnil?(boss.phaseThree?'Überlebe Karnils dritte Phase und Cyber-Hasenbein':boss.phaseTwo?'Besiege Karnil und Zombie-Hasenbein':'Leere Karnils erste Lebensleiste'):boss.cyber?'Beende seine zweite Karriere':'Besiege General Hasenbein') : waveSpawningComplete() ? `RESTLICHE GEGNER: ${alive}` : `NACHSCHUB ${Math.max(0,Math.ceil(currentWaveLength()-waveTime))} s · ${endlessMode?'ENDLOS':wave<3?'AKT I':wave<6?'AKT II':'STEINBRUCH'}`;
    updateWeaponHud();updatePowerHud();$('runTime').textContent = formatTime(runTime);
    $('dashFill').style.width = `${(1-clamp(player.dashCd/effectiveDash(player),0,1))*100}%`;
    $('dashLabel').textContent = player.dashCd <= 0 ? 'AUSWEICHEN BEREIT' : 'LÄDT AUF …';
    if (boss) { $('bossFill').style.width = `${Math.max(0,boss.hp/boss.maxHp*100)}%`; $('bossPhase').textContent = boss.ottah?`PHASE ${boss.ottahPhase||1} / 3 · ${boss.ottahPhase===3?'SAHNE-STURM':boss.ottahPhase===2?'WARZEN-WUT':'ERSTES GRUNZEN'}`:boss.endlessBoss?boss.endlessSubtitle:boss.karnil?(boss.phaseThree?'PHASE 3 · CYBER-HASENBEIN · PAFTI LAUERT':boss.phaseTwo?'PHASE 2 · VOLLE LEBEN · ZOMBIE-HASENBEIN':'PHASE 1 · FELSENBRECHER'):boss.cyber?(boss.enraged?'ÜBERTAKTET':'WIEDERBELEBT. AUFGERÜSTET.'):(boss.enraged ? 'JETZT IST ER SAUER' : 'DER NUSS-DIKTATOR'); }
    const mini=getMiniBoss(),miniHud=$('miniBossHud');$('waveMiniBar').classList.toggle('hidden',!mini?.miniKind&&!mini?.troll);if(mini?.miniKind||mini?.troll){$('waveMiniName').textContent=mini.troll?'BERGTROLL':miniBossBook[mini.miniKind].name;$('waveMiniFill').style.width=(100*Math.max(0,mini.hp/mini.maxHp))+'%';}if(miniHud){miniHud.classList.toggle('hidden',!mini);if(mini){const label=miniHud.querySelector('span');if(label)label.textContent=mini.troll?'BERGTROLL':mini.miniKind?miniBossBook[mini.miniKind].name:mini.cyberMini?'CYBER-HASENBEIN':'ZOMBIE-HASENBEIN';$('miniBossFill').style.width=`${Math.max(0,mini.hp/mini.maxHp*100)}%`;}}
  }
  function burst(x, y, color, count = 10, speed = 100) {
    for (let i=0;i<count;i++) {
      const a=rnd(0,TAU), v=rnd(speed*.2,speed), life=rnd(.22,.65);
      particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life,maxLife:life,r:rnd(2,5),color});
    }
    if (particles.length > 650) particles.splice(0,particles.length-650);
  }
  function floater(x,y,text,color='#dcf2bf') { floaters.push({x,y,text,color,life:1}); }
  function tryDropSpecialAmmo(x,y,life){
    if(!player||!player.weapons.some(id=>weaponAmmo(id)<maxWeaponAmmo(id)))return false;
    const target=player.ammoDropTarget||3;if((player.ammoDropsThisWave||0)>=target)return false;
    player.ammoDryKills=(player.ammoDryKills||0)+1;
    const remaining=target-(player.ammoDropsThisWave||0),progress=boss?.karnil?.5:clamp(waveTime/currentWaveLength(),0,1);
    const chance=(.026+.018*progress+.008*Math.max(0,remaining-1))*(player.ammoDropLuck||1);
    const force=player.ammoDryKills>=Math.max(9,16-remaining*2);
    if(!force&&Math.random()>=chance)return false;
    pickups.push({x,y,type:'ammo',life,phase:rnd(0,TAU)});player.ammoDropsThisWave=(player.ammoDropsThisWave||0)+1;player.ammoDryKills=0;return true;
  }
  function maybeDropBossSupply(e){
    if(!isBoss(e)||e.dead||e.hp<=0)return;
    const thresholds=e.supplyThresholds||[.78,.52,.28];
    while((e.supplyStep||0)<thresholds.length&&e.hp/e.maxHp<=thresholds[e.supplyStep||0]){
      e.supplyStep=(e.supplyStep||0)+1;
      if(Math.random()>=.58)continue;
      const life=15+(player.pickupLifeBonus||0),a=rnd(0,TAU),r=rnd(55,105),x=clamp(e.x+Math.cos(a)*r,48,W-48),y=clamp(e.y+Math.sin(a)*r,120,H-50),roll=Math.random();
      const needsAmmo=player.weapons.some(id=>weaponAmmo(id)<maxWeaponAmmo(id));
      if(roll<.52&&needsAmmo)pickups.push({x,y,type:'ammo',life,phase:rnd(0,TAU)});
      else if(roll<.82)pickups.push({x,y,type:'heart',life,phase:rnd(0,TAU)});
      else pickups.push({x,y,type:'power',power:rollPowerupId(),life,phase:rnd(0,TAU)});
      floater(x,y-18,'BOSS-DROP',accent());
    }
  }
  function damageEnemy(e, amount, blast = false) {
    if (e.dead||mode!=='playing'||!Number.isFinite(amount)||amount<=0||e.invuln>0) return;
    if(e.shieldTime>0)amount*=.55;
    if(player.lastBite&&e.hp/e.maxHp<.3)amount*=1.25;
    if(e.type==='boss'||e.miniBoss)amount*=player.bossDamage||1;
    if(player.duden)amount*=isBoss(e)?1.08:1.12;
    if(e.potencyMarked>0)amount*=isBoss(e)?1.08:1.14;
    const rabbit=isRabbit(e);
    if(rabbit)amount*=player.rabbitDamage||1;
    amount*=contentDamageMultiplier(e);e.hp -= amount; e.hit = .1;
    burst(e.x,e.y, e.type === 'boss' ? '#ffa977' : '#cad8b7', blast ? 12 : 4, 110);
    if(isBoss(e))maybeDropBossSupply(e);
    if(e.hp<=0&&impossibleMode&&e===boss&&e.hardFinal&&!e.impossibleFinal){e.impossibleFinal=true;startHardFinal(e);e.hp=e.maxHp=Math.max(1,e.maxHp*.75);e.hardPattern=3;announce('IMPOSSIBLE · LETZTE PHASE','DER BOSS GIBT NOCH EINMAL ALLES');return;}
    if(e.hp<=0&&hardMode&&e===boss&&!e.hardFinal&&isLastBossPhase(e)){startHardFinal(e);return;}
    if(e.pafti&&e.hp<=0&&e.paftiPhase<3){e.paftiPhase++;e.hp=e.maxHp=Math.max(1,e.maxHp*.65);e.invuln=1.4;enemyBullets=[];announce('PAFTI · PHASE '+e.paftiPhase,'DER CONTROLLER GLÜHT');return;}
    if(isBoss(e)&&e.ottah&&e.hp<=0){if(advanceOttahPhase())return;}
    if(isBoss(e)&&e.karnil){
      if(!e.phaseTwo&&e.hp<=0){activateKarnilPhaseTwo(false);return;}
      if(newGamePlus&&e.phaseTwo&&!e.phaseThree&&e.hp<=0){activateKarnilPhaseThree();return;}
      if(newGamePlus&&e.phaseThree&&!e.paftiHealed&&e.hp<=e.maxHp*.5){triggerPaftiIntervention();return;}
    }
    if (e.hp > 0) return;
    onContentKill(e);if(e.narrathHit)addAchievementProgress('professor_kills');if(e.ratHit)addAchievementProgress('rat_kills');e.dead = true; kills++; score += Math.round(e.points*((player.powerups.scoreRush>0?2:1)*runScoreMultiplier()));if(player.deathBurst&&!isBoss(e)&&!e.miniBoss){player.deathBurstKills=(player.deathBurstKills||0)+1;if(player.deathBurstKills>=5){player.deathBurstKills=0;hazards.push({type:'friendlyMortar',x:e.x,y:e.y,r:125,wait:.08,life:.32,hit:false,damage:7*Math.sqrt(player.damage||1),friendly:true});}}addAchievementProgress('first_crunch');setAchievementProgress('score_hog',score);if(e.type.startsWith('pig'))addAchievementProgress('pigsty');if(e.type==='gatling')addAchievementProgress('veggie_fear');if(newGamePlus&&e.type==='voidBunny')addAchievementProgress('ngplus_void');if(newGamePlus&&e.type==='rocketHare')addAchievementProgress('ngplus_rocket');if(newGamePlus&&e.type==='pigJuggernaut')addAchievementProgress('ngplus_juggernaut');
    burst(e.x,e.y, e.type === 'boss' ? '#c7f36b' : '#91ba70', e.type==='boss'?85:16,180);
    floater(e.x,e.y-22,`+${e.points}`);
    if(e.miniBoss){toast((e.troll?'BERGTROLL':e.miniKind?miniBossBook[e.miniKind].name:e.cyberMini?'CYBER-HASENBEIN':'ZOMBIE-HASENBEIN')+' ERLEDIGT');if(e.miniKind){recordDistinct('mini_collection',e.miniKind);const powers=shuffled(Object.keys(powerBook).filter(k=>k!=='overdrive'));for(let i=0;i<3;i++){const a=TAU*i/3;pickups.push({x:clamp(e.x+Math.cos(a)*34,45,W-45),y:clamp(e.y+Math.sin(a)*34,115,H-50),type:'power',power:powers[i],life:24,phase:a,guaranteed:true});}}updateHud();}
    if (isBoss(e)) {
      if(!player.bossHits)addAchievementProgress('precision_run');
      if(e.pafti){paftiBoss=null;if(boss?.ottah&&!boss.dead)return;stageAfterBoss('ottah');lastDefeatedBoss='ottah';addAchievementProgress('ng2_sahne');beginVictory(()=>{mode='playing';finish(true);});return;}
      if(e.ottah){if(paftiBoss&&!paftiBoss.dead){announce('OTTAH BESIEGT','PAFTI KÄMPFT WEITER');return;}stageAfterBoss('ottah');lastDefeatedBoss='ottah';addAchievementProgress('ng2_sahne');beginVictory(()=>{mode='playing';finish(true);});return;}
      if(e.endlessBoss){lastDefeatedBoss='endless';endlessBossesDefeated++;setAchievementProgress('endless_bosses',endlessBossesDefeated);const survived=wave+1,key=hardMode?'hard':'normal';if(survived>(endlessBest[key]||0)){endlessBest[key]=survived;try{localStorage.setItem('snickers3-endless-best-v1',JSON.stringify(endlessBest));}catch{}}for(const n of [75,100,150,200])if(survived>=n)addAchievementProgress('endless_'+n);if(hardMode&&survived>=30&&retriesLeft===3)addAchievementProgress('hard_endless_30');beginVictory(()=>bossUpgradeScreen('endless'));return;}
      lastDefeatedBoss=e.karnil?'karnil':e.cyber?'cyber':'general';if(e.karnil){recordDistinct('boss_breaker',lastDefeatedBoss);beginVictory(()=>bossUpgradeScreen('karnil'));}else if(e.cyber)cyberDown();else generalDown();return;
    }
    if(player.brothBox){player.breadKills=(player.breadKills||0)+1;if(player.breadKills>=35){player.breadKills=0;player.hp=Math.min(player.maxHp,player.hp+1);floater(player.x,player.y-38,'BROTZEIT! +1 ♥','#eac997');}}
    if(player.vampire){player.vampireKills++;if(player.vampireKills>=22){player.vampireKills=0;player.hp=Math.min(player.maxHp,player.hp+1);floater(player.x,player.y-38,'SNACK! +1 ♥',accent());}}
    if(e.type==='splitter')for(let i=0;i<2;i++){const child=spawnEnemy('runner');child.x=clamp(e.x+(i?22:-22),32,W-32);child.y=clamp(e.y+12,105,H-45);child.hp=child.maxHp=1;child.speed=158;burst(child.x,child.y,'#dba7ed',10,80);}
    if(e.miniKind){tryDropSpecialAmmo(e.x,e.y,24);return;}
    const dropRoll=Math.random(),powerChance=Math.min(.16,.035*(player.powerLuck||1)),life=18+(player.pickupLifeBonus||0);
    const ammoDropped=(e.miniBoss&&player.weapons.some(id=>weaponAmmo(id)<maxWeaponAmmo(id))&&((player.ammoDropsThisWave||0)<(player.ammoDropTarget||3)))?(pickups.push({x:e.x,y:e.y,type:'ammo',life,phase:rnd(0,TAU)}),player.ammoDropsThisWave=(player.ammoDropsThisWave||0)+1,player.ammoDryKills=0,true):tryDropSpecialAmmo(e.x,e.y,life);
    // Power-ups stay rare, but pure RNG can no longer create absurdly long dry streaks.
    const forcePower=(player.powerDryKills||0)>=18;
    if(ammoDropped){player.powerDryKills=(player.powerDryKills||0)+1;}
    else if(forcePower||(dropRoll>=.06&&dropRoll<.06+powerChance)){
      const id=rollPowerupId();
      pickups.push({x:e.x,y:e.y,type:'power',power:id,life,phase:rnd(0,TAU)});
      player.powerDryKills=0;
    }else{
      player.powerDryKills=(player.powerDryKills||0)+1;
      if(dropRoll<.06)pickups.push({x:e.x,y:e.y,type:'heart',life,phase:rnd(0,TAU)});
      else pickups.push({x:e.x,y:e.y,type:'nut',life,phase:rnd(0,TAU)});
    }
    if (Math.random()<.12) tone(400,.055,'triangle',.02,700);
  }
  function hurtPlayer(damage = 1, source = null) {
    if (player.invuln > 0 || mode !== 'playing') return;
    if(player.powerups.overdrive>0){floater(player.x,player.y-36,'ROTER BLICK',accent());return;}
    if(player.sniebelPlate&&source&&Number.isFinite(source.x)&&Number.isFinite(source.y)){
      const sourceAngle=Math.atan2(source.y-player.y,source.x-player.x);
      const rear=Math.abs(angleDelta(sourceAngle,player.angle))>Math.PI/2;
      if(rear&&Math.random()<.5){player.invuln=.28;burst(player.x,player.y,'#d9c89b',13,105);floater(player.x,player.y-36,'SNIEBEL-PLATTE!', '#ead9ad');tone(420,.1,'square',.045,220);return;}
    }
    if(player.dodgeChance&&Math.random()<player.dodgeChance){player.invuln=.35;burst(player.x,player.y,'#d8f5ff',12,120);floater(player.x,player.y-36,'DODGE!', '#d8f5ff');tone(920,.08,'triangle',.04,1180);return;}
    if(player.damageGuard&&Math.random()<player.damageGuard){player.invuln=.45;burst(player.x,player.y,accent(),18,150);floater(player.x,player.y-36,'EISENFELL!',accent());tone(760,.12,'triangle',.05,420);return;}
    if(player.powerups.phase>0){floater(player.x,player.y-36,'PHASENFELL',accent());return;}
    if(player.powerups.barrier>0){player.powerups.barrier=0;player.invuln=.7;burst(player.x,player.y,accent(),25,180);floater(player.x,player.y-36,'ABGEBLOCKT',accent());tone(840,.2,'sine',.06,320);return;}
    if(player.shieldReady){player.shieldReady=false;player.shieldCd=15;player.invuln=.7;burst(player.x,player.y,accent(),25,180);floater(player.x,player.y-36,'ABGEBLOCKT',accent());tone(840,.2,'sine',.06,320);return;}
    if(player.powerups.thorns>0){for(const e of enemies)if(!e.dead&&dist(player,e)<150)damageEnemy(e,12,true);for(const target of [boss,paftiBoss])if(target&&!target.dead&&dist(player,target)<160)damageEnemy(target,14,true);}
    if(mode!=='playing')return;
    damage=Math.max(1,Math.round(damage*incomingDamageScale()*10)/10);
    if(player.emergencyReserve&&!player.emergencyUsed&&player.hp-damage<=0){player.emergencyUsed=true;player.hp=1;player.invuln=2;enemyBullets=enemyBullets.filter(b=>dist(player,b)>180);floater(player.x,player.y-40,'NOTRESERVE!',accent());updateHud();return;}
    player.waveHits++;if(endlessMode)player.endlessHitEver=true;if(boss){player.bossHits=(player.bossHits||0)+1;if(impossibleMode)player.impossibleBossHits=(player.impossibleBossHits||0)+1;}
    if(player.survivalInstinct&&player.instinctCd<=0){player.dashCd=0;player.instinctCd=8;}
    player.hp = Math.max(0,Math.round((player.hp-damage)*10)/10); player.invuln = 1.15; shake = reducedMotion ? 0 : 7;
    burst(player.x,player.y,'#ff9d71',18,180); floater(player.x,player.y-36,`−${damage} ♥`,'#ff9d71');
    tone(150,.22,'sawtooth',.07,50); updateHud();
    if (player.hp <= 0) finish(false);
  }
  const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  function fire() {
    if(mode!=='playing'||!aimPlayer())return false;
    player.shotCount++;
    const hunnaShot=player.hunnaExpert&&player.shotCount%10===0;
    // Projectile-count upgrades add coverage, but their total front-loaded damage is normalized.
    // This prevents spread builds from multiplying every damage/crit/proc upgrade by 3-7x.
    let shots=player.nutstorm
      ? [-.28,-.14,0,.14,.28].map(offset=>({offset,mul:.38,main:offset===0}))
      : player.spread
        ? [-.16,0,.16].map(offset=>({offset,mul:.52,main:offset===0}))
        : [{offset:0,mul:1,main:true}];
    if(player.nutFan)shots.push({offset:-.34,mul:.26},{offset:.34,mul:.26});
    if(player.powerups.doubleShot>0)shots.push({offset:-.25,mul:.48},{offset:.25,mul:.48});
    if(player.rearNut)shots.push({offset:Math.PI,mul:.65,rear:true});
    const commonDamage=player.damage*(player.powerups.berserk>0?1.45:1)*(player.powerups.giantNut>0?1.4:1)*(player.powerups.overdrive>0?1.55:1)*(hunnaShot?3:1);
    let chainAssigned=false;
    for (const shot of shots) {
      const a=player.angle+shot.offset;
      const crit=player.crit&&Math.random()<player.crit;
      const canChain=player.chain&&player.shotCount%4===0&&!chainAssigned&&(shot.main||(!shots.some(s=>s.main)&&!shot.rear));if(canChain)chainAssigned=true;
      bullets.push({x:player.x+Math.cos(a)*22,y:player.y+Math.sin(a)*22,vx:Math.cos(a)*755,vy:Math.sin(a)*755,life:1.2,damage:commonDamage*shot.mul*(crit?2:1),pierce:player.pierce+(hunnaShot?2:0),hitIds:new Set(),r:player.powerups.giantNut>0?10:6,a,chain:canChain,ricochet:player.ricochet,frost:player.frost});
    }
    if(player.thunderCrumbs&&player.shotCount%6===0){for(const off of [-.1,.1]){const a=player.angle+off;bullets.push({x:player.x,y:player.y,vx:Math.cos(a)*820,vy:Math.sin(a)*820,life:1.15,damage:player.damage*1.8,pierce:3,hitIds:new Set(),r:8,a,chain:true,frost:false});}burst(player.x,player.y,'#b4eaff',8,80);}
    if(hunnaShot)floater(player.x,player.y-40,'HUNNA!','#ffe096');
    tone(rnd(660,800),.04,'triangle',.035,280);
    return true;
  }
  function enemyShot(x,y,a,speed=174,cyber=false,tag='') { if(enemyBullets.length<150)enemyBullets.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,a,r:7,life:7,cyber,sniper:tag==='sniper'}); }
  function chainHit(source,damage){
    const all=[...enemies,...(boss&&!boss.dead?[boss]:[]),...(paftiBoss&&!paftiBoss.dead?[paftiBoss]:[])];let target=null,near=185;
    for(const e of all){const d=dist(source,e);if(e!==source&&!e.dead&&d<near){near=d;target=e;}}
    if(target){particles.push({type:'arc',x:source.x,y:source.y,x2:target.x,y2:target.y,life:.2,maxLife:.2,color:'#c9ecff'});damageEnemy(target,damage*.8);}
  }
  function updateSkillsInPlay(dt){
    if(player.creamHeart){player.creamHeartCd=(player.creamHeartCd??18)-dt;if(player.creamHeartCd<=0){player.creamHeartCd=18;if(player.hp<player.maxHp){player.hp=Math.min(player.maxHp,player.hp+1);floater(player.x,player.y-38,'SAHNEHERZ +1 ♥','#fff0d1');updateHud();}}}
    if(player.breadHalo){player.breadHaloCd=(player.breadHaloCd||0)-dt;if(player.breadHaloCd<=0){player.breadHaloCd=4;const all=boss&&!boss.dead?[...enemies,boss]:[...enemies];particles.push({type:'ring',x:player.x,y:player.y,life:.55,maxLife:.55,r:0,color:'#edc786'});for(const e of all){if(!e.dead&&dist(player,e)<185+e.r)damageEnemy(e,4.5*Math.sqrt(player.damage),true);if(mode!=='playing')return;}}}
    for(const id of Object.keys(player.powerups)){player.powerups[id]=Math.max(0,player.powerups[id]-dt);if(player.powerups[id]<=0)delete player.powerups[id];}
    if(player.powerups.regen>0){player.regenCd=(player.regenCd||0)-dt;if(player.regenCd<=0){if(player.hp<player.maxHp){player.hp=Math.min(player.maxHp,player.hp+1);floater(player.x,player.y-38,'SNACK! +1 ♥',accent());tone(700,.12,'sine',.04,980);updateHud();}player.regenCd=2;}}
    if(player.shield&&!player.shieldReady){player.shieldCd=Math.max(0,player.shieldCd-dt);if(player.shieldCd<=0){player.shieldReady=true;floater(player.x,player.y-36,'SCHALE BEREIT',accent());}}
    player.orbitCd=Math.max(0,player.orbitCd-dt);
    if(player.orbit&&player.orbitCd<=0){
      let hit=false;const all=[...enemies,...(boss&&!boss.dead?[boss]:[]),...(paftiBoss&&!paftiBoss.dead?[paftiBoss]:[])];
      for(let i=0;i<2;i++){
        const a=runTime*3.5+i*Math.PI,orb={x:player.x+Math.cos(a)*62,y:player.y+Math.sin(a)*62};
        for(const e of all)if(!e.dead&&dist(orb,e)<e.r+12){damageEnemy(e,1.8*Math.sqrt(player.damage));hit=true;if(mode!=='playing')return;}
      }
      if(hit)player.orbitCd=.52;
    }
    player.nutSentryCd=Math.max(0,(player.nutSentryCd||0)-dt);
    if(player.nutSentry&&player.nutSentryCd<=0){
      const all=[...enemies,...(boss&&!boss.dead?[boss]:[]),...(paftiBoss&&!paftiBoss.dead?[paftiBoss]:[])];let target=null,near=560;
      for(const e of all){const d=dist(player,e);if(!e.dead&&d<near){near=d;target=e;}}
      if(target){const sx=player.x+Math.cos(runTime*1.8)*46,sy=player.y-34+Math.sin(runTime*1.8)*10,a=Math.atan2(target.y-sy,target.x-sx),shots=player.ng2Turret?[-.12,0,.12]:player.turretVolley?[-.07,.07]:[0];for(const off of shots)bullets.push({x:sx,y:sy,vx:Math.cos(a+off)*650,vy:Math.sin(a+off)*650,life:1.15,damage:(player.ng2Turret?1.5:player.turretVolley?1.65:1.8)*Math.max(1,Math.sqrt(player.damage||1)),pierce:player.ng2Turret?2:player.turretVolley?1:0,hitIds:new Set(),r:6,a:a+off,frost:false,auto:true});player.nutSentryCd=player.ng2Turret?.55:player.turretVolley?.60:.82;tone(410,.025,'triangle',.015,620);}
    }
    player.carrotDroneCd=Math.max(0,(player.carrotDroneCd||0)-dt);
    if(player.carrotDrone&&player.carrotDroneCd<=0){
      const all=[...enemies,...(boss&&!boss.dead?[boss]:[]),...(paftiBoss&&!paftiBoss.dead?[paftiBoss]:[])];let target=null,near=720;
      for(const e of all){const d=dist(player,e);if(!e.dead&&d<near){near=d;target=e;}}
      if(target){hazards.push({type:'friendlyMortar',x:target.x,y:target.y,r:82,wait:.62,life:.35,hit:false,damage:9*Math.max(1,Math.sqrt(player.specialDamage||1)),friendly:true});player.carrotDroneCd=2.8;tone(255,.035,'square',.015,180);}
    }
    player.eggBoogerCd=Math.max(0,(player.eggBoogerCd||0)-dt);player.eggBoogerAnim=Math.max(0,(player.eggBoogerAnim||0)-dt);
    if(player.eggBooger&&player.eggBoogerCd<=0){
      const all=boss&&!boss.dead?[...enemies.filter(e=>!e.dead),boss]:enemies.filter(e=>!e.dead);
      if(all.length){const target=all[Math.floor(Math.random()*all.length)],from=player.eggBoogerTo||{x:player.x,y:player.y-25};player.eggBoogerFrom={x:from.x,y:from.y};player.eggBoogerTo={x:target.x,y:target.y-target.r*.35};player.eggBoogerAnim=.34;player.eggBoogerCd=.85;damageEnemy(target,2.8*Math.max(1,Math.sqrt(player.damage||1)));floater(target.x,target.y-target.r-12,'NASENBOHR!', '#b9df73');tone(310,.035,'triangle',.015,180);if(mode!=='playing')return;}
    }
    player.merzEggCd=Math.max(0,(player.merzEggCd||0)-dt);
    if(player.merzEggs&&player.merzEggCd<=0){
      const all=boss&&!boss.dead?[...enemies.filter(e=>!e.dead),boss]:enemies.filter(e=>!e.dead);
      for(let i=0;i<2;i++){const t=all.length?all[Math.floor(Math.random()*all.length)]:null,x=t?clamp(t.x+rnd(-55,55),55,W-55):rnd(80,W-80),y=t?clamp(t.y+rnd(-45,45),125,H-55):rnd(140,H-80);hazards.push({type:'friendlyEgg',x,y,r:92,wait:1.05,life:.35,hit:false,damage:10*Math.max(1,Math.sqrt(player.specialDamage||1)),friendly:true});}
      player.merzEggCd=5;tone(440,.05,'triangle',.02,260);
    }
    if(player.ng2TimeField){for(const e of enemies)if(!e.dead&&dist(player,e)<250)e.slow=Math.max(e.slow||0,.18);if(boss&&!boss.dead&&dist(player,boss)<270)boss.slow=Math.max(boss.slow||0,.12);}
    if(player.lominarWorm){
      player.lominarX+=(player.lominarDir||1)*390*dt;player.lominarY+=Math.sin(runTime*3.2)*34*dt;
      if(player.lominarX>W+70){player.lominarDir=-1;player.lominarY=rnd(145,H-70);}else if(player.lominarX<-70){player.lominarDir=1;player.lominarY=rnd(145,H-70);}
      const worm={x:player.lominarX,y:player.lominarY};for(const e of enemies)if(!e.dead&&dist(worm,e)<e.r+22)e.slow=Math.max(e.slow||0,2.1);if(boss&&!boss.dead&&dist(worm,boss)<boss.r+24)boss.slow=Math.max(boss.slow||0,1.1);
    }
    player.ossiWallTime=Math.max(0,(player.ossiWallTime||0)-dt);for(const w of ossiWalls)w.life-=dt;ossiWalls=ossiWalls.filter(w=>w.life>0);
  }
  function updateTerror(e,dt){
    const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1,slow=(e.slow>0?.70:1)*(player.powerups.freeze>0?.58:1);
    if(e.type==='rabid'){
      if(e.windup>0){e.windup-=dt;if(e.windup<=0){e.charge=.66;e.dashTagged=false;burst(e.x,e.y,'#ffad79',12,140);}return;}
      if(e.charge>0){e.charge-=dt;e.x+=Math.cos(e.aim)*458*slow*dt;e.y+=Math.sin(e.aim)*458*slow*dt;e.x=clamp(e.x,32,W-32);e.y=clamp(e.y,106,H-44);if(player.dashTime>0&&!e.dashTagged&&dist(player,e)<72){e.dashTagged=true;addAchievementProgress('nope_rope');}return;}
      e.chargeCd-=dt*(e.actionRate||1);
      if(d<490&&e.chargeCd<=0){e.aim=Math.atan2(dy,dx);e.windup=.72;e.chargeCd=3.2;return;}
      e.x+=dx/d*e.speed*slow*dt;e.y+=dy/d*e.speed*slow*dt;
    }else if(e.type==='gatling'){
      if(e.windup>0){e.windup-=dt;if(e.windup<=0){e.burstLeft=8;e.burstCd=0;}return;}
      if(e.burstLeft>0){e.burstCd-=dt;if(e.burstCd<=0){const sweep=(4-e.burstLeft)*.065;enemyShot(e.x,e.y,e.aim+sweep,210);e.burstLeft--;e.burstCd=.115;tone(160,.03,'square',.02,80);}return;}
      if(d>310){e.x+=dx/d*e.speed*slow*dt;e.y+=dy/d*e.speed*slow*dt;}
      if(e.fireCd<=0&&d<620){e.aim=Math.atan2(dy,dx);e.windup=.85;e.fireCd=3.6;}
    }else if(e.type==='sniper'){
      if(e.windup>0){e.windup-=dt;if(e.windup<=0){enemyShot(e.x,e.y,e.aim,350,true,'sniper');e.fireCd=3.8;}return;}
      if(d<390){e.x-=dx/d*e.speed*slow*dt;e.y-=dy/d*e.speed*slow*dt;}else if(d>570){e.x+=dx/d*e.speed*slow*dt;e.y+=dy/d*e.speed*slow*dt;}
      if(e.fireCd<=0&&d<760){e.aim=Math.atan2(dy,dx);e.windup=1.05;}
    }else if(e.type==='sapper'){
      if(e.mineCd<=0&&d<720){hazards.push({type:'sapperMine',x:clamp(player.x+rnd(-100,100),55,W-55),y:clamp(player.y+rnd(-90,90),125,H-50),r:58,wait:1.35,life:.45,hit:false,damage:2});e.mineCd=4.6;}
      if(d>290){e.x+=dx/d*e.speed*slow*dt;e.y+=dy/d*e.speed*slow*dt;}
    }else if(e.type==='pigHowler'){
      if(d>330){e.x+=dx/d*e.speed*slow*dt;e.y+=dy/d*e.speed*slow*dt;}
      if(e.howlCd<=0){const count=e.enraged?14:10;for(let i=0;i<count;i++)enemyShot(e.x,e.y,TAU*i/count,190,true);e.howlCd=3.8;burst(e.x,e.y,'#e99a83',16,130);}
    }else if(e.type==='pigRammer'){
      if(e.windup>0){e.windup-=dt;if(e.windup<=0)e.charge=.8;return;}
      if(e.charge>0){e.charge-=dt;e.x+=Math.cos(e.aim)*410*slow*dt;e.y+=Math.sin(e.aim)*410*slow*dt;e.x=clamp(e.x,35,W-35);e.y=clamp(e.y,108,H-45);return;}
      e.chargeCd-=dt*(e.actionRate||1);if(d<560&&e.chargeCd<=0){e.aim=Math.atan2(dy,dx);e.windup=.65;e.chargeCd=3.1;return;}
      e.x+=dx/d*e.speed*slow*dt;e.y+=dy/d*e.speed*slow*dt;
    }else if(e.type==='pigMortar'){
      if(d>330){e.x+=dx/d*e.speed*slow*dt;e.y+=dy/d*e.speed*slow*dt;}
    }else if(e.type==='pigCannon'){
      if(e.windup>0){e.windup-=dt;if(e.windup<=0){e.burstLeft=5;e.burstCd=0;}return;}
      if(e.burstLeft>0){e.burstCd-=dt;if(e.burstCd<=0){enemyShot(e.x,e.y,e.aim+(e.burstLeft-3)*.11,240);e.burstLeft--;e.burstCd=.2;}return;}
      if(d>250){e.x+=dx/d*e.speed*slow*dt;e.y+=dy/d*e.speed*slow*dt;}if(e.fireCd<=0&&d<700){e.aim=Math.atan2(dy,dx);e.windup=.8;e.fireCd=3.3;}
    }else if(e.type==='pigDrone'){
      const side=Math.sin(ambientTime*2+e.phase),px=player.x-dy/d*side*150,py=player.y+dx/d*side*150;
      e.x+=(px-e.x)*dt*.7;e.y+=(py-e.y)*dt*.7;if(e.fireCd<=0&&d<680){enemyShot(e.x,e.y,Math.atan2(dy,dx),205,true);e.fireCd=1.75;}
    }else if(e.type==='voidBunny'){
      e.teleportCd-=dt*(e.actionRate||1);if(e.teleportCd<=0){const a=rnd(0,TAU),rr=rnd(190,360);e.x=clamp(player.x+Math.cos(a)*rr,55,W-55);e.y=clamp(player.y+Math.sin(a)*rr,125,H-55);for(let i=0;i<10;i++)enemyShot(e.x,e.y,TAU*i/10,235,true);burst(e.x,e.y,'#b184ff',24,170);e.teleportCd=3.4;return;}
      if(d>260){e.x+=dx/d*e.speed*slow*dt;e.y+=dy/d*e.speed*slow*dt;}if(e.fireCd<=0){const a=Math.atan2(dy,dx);for(let i=-2;i<=2;i++)enemyShot(e.x,e.y,a+i*.16,260,true);e.fireCd=2.2;}
    }else if(e.type==='rocketHare'){
      e.rocketCd-=dt*(e.actionRate||1);if(d<330){e.x-=dx/d*e.speed*slow*dt;e.y-=dy/d*e.speed*slow*dt;}else if(d>520){e.x+=dx/d*e.speed*slow*dt;e.y+=dy/d*e.speed*slow*dt;}if(e.rocketCd<=0){hazards.push({type:'rocketMark',x:clamp(player.x+rnd(-85,85),60,W-60),y:clamp(player.y+rnd(-75,75),130,H-55),r:92,wait:.78,life:.38,hit:false,damage:3});e.rocketCd=2.65;tone(125,.18,'square',.04,65);}
    }else if(e.type==='pigJuggernaut'){
      e.shockCd-=dt*(e.actionRate||1);e.chargeCd-=dt*(e.actionRate||1);if(e.windup>0){e.windup-=dt;if(e.windup<=0)e.charge=.72;return;}if(e.charge>0){e.charge-=dt;e.x+=Math.cos(e.aim)*455*slow*dt;e.y+=Math.sin(e.aim)*455*slow*dt;return;}if(e.shockCd<=0&&d<360){hazards.push({type:'shock',x:e.x,y:e.y,r:145,wait:.55,life:.35,hit:false,damage:3});e.shockCd=3.2;}if(e.chargeCd<=0&&d<600){e.aim=Math.atan2(dy,dx);e.windup=.52;e.chargeCd=2.7;return;}e.x+=dx/d*e.speed*slow*dt;e.y+=dy/d*e.speed*slow*dt;
    }else if(e.type==='burrowBunny'){
      e.teleportCd-=dt*(e.actionRate||1);if(e.teleportCd<=0){const a=rnd(0,TAU),rr=rnd(100,210);burst(e.x,e.y,'#8c6d4d',14,100);e.x=clamp(player.x+Math.cos(a)*rr,55,W-55);e.y=clamp(player.y+Math.sin(a)*rr,125,H-55);hazards.push({type:'shock',x:e.x,y:e.y,r:88,wait:.48,life:.3,hit:false,damage:2});e.teleportCd=3.6;return;}if(d>180){e.x+=dx/d*e.speed*slow*dt;e.y+=dy/d*e.speed*slow*dt;}
    }else if(e.type==='stormBunny'){
      if(d>300){e.x+=dx/d*e.speed*slow*dt;e.y+=dy/d*e.speed*slow*dt;}if(e.fireCd<=0){const spin=ambientTime*.7;for(let i=0;i<12;i++)enemyShot(e.x,e.y,TAU*i/12+spin,235,true);e.fireCd=2.7;burst(e.x,e.y,'#91c8ff',16,120);}
    }else if(e.type==='gnomePig'){
      if(d>360){e.x+=dx/d*e.speed*slow*dt;e.y+=dy/d*e.speed*slow*dt;}if(e.mortarCd<=0){for(let i=0;i<3;i++)hazards.push({type:'mortar',x:clamp(player.x+rnd(-170,170),60,W-60),y:clamp(player.y+rnd(-130,130),130,H-55),r:74,wait:.72+i*.18,life:.35,hit:false,damage:2});e.mortarCd=3.8;}
    }else if(e.type==='zombieBoss'){
      if(e.miniBoss){
        e.chargeCd-=dt*(e.actionRate||1);
        if(e.cyberMini){
          if(e.windup>0){e.windup-=dt;if(e.windup<=0){const a=e.aim;for(let i=-3;i<=3;i++)enemyShot(e.x,e.y,a+i*.11,340,true);e.fireCd=1.4;}return;}
          if(d>210){e.x+=dx/d*e.speed*slow*dt;e.y+=dy/d*e.speed*slow*dt;}
          if(e.chargeCd<=0){for(let i=0;i<16;i++)enemyShot(e.x,e.y,TAU*i/16,275,true);e.chargeCd=2.6;burst(e.x,e.y,'#76eaff',20,150);}
          if(e.fireCd<=0){e.aim=Math.atan2(dy,dx);e.windup=.5;}return;
        }
        if(e.windup>0){e.windup-=dt;if(e.windup<=0)e.charge=.48;return;}
        if(e.charge>0){e.charge-=dt;e.x+=Math.cos(e.aim)*330*slow*dt;e.y+=Math.sin(e.aim)*330*slow*dt;return;}
        if(d>175){e.x+=dx/d*e.speed*slow*dt;e.y+=dy/d*e.speed*slow*dt;}
        if(e.chargeCd<=0&&d<520){e.aim=Math.atan2(dy,dx);e.windup=.55;e.chargeCd=3.4;return;}
        if(e.fireCd<=0){const a=Math.atan2(dy,dx);for(let i=-2;i<=2;i++)enemyShot(e.x,e.y,a+i*.19,205,true);for(let i=0;i<6;i++)enemyShot(e.x,e.y,TAU*i/6,145,true);e.fireCd=2.35;burst(e.x,e.y,'#a8c66d',14,120);}
      }else{if(d>130){e.x+=dx/d*e.speed*slow*dt;e.y+=dy/d*e.speed*slow*dt;}if(e.fireCd<=0){for(let i=0;i<5;i++)enemyShot(e.x,e.y,Math.atan2(dy,dx)+TAU*i/5,150,true);e.fireCd=2.8;}}
    }
  }
  function keepEnemiesInArena(){
    for(const e of enemies){
      if(e.dead)continue;
      if(!Number.isFinite(e.x)||!Number.isFinite(e.y)){
        const a=rnd(0,TAU),radius=rnd(220,330);
        e.x=clamp(player.x+Math.cos(a)*radius,Math.max(38,e.r+6),W-Math.max(38,e.r+6));
        e.y=clamp(player.y+Math.sin(a)*radius,Math.max(112,e.r+6),H-Math.max(48,e.r+6));
        e.windup=0;e.charge=0;e.hit=0;
        continue;
      }
      const padX=Math.max(38,e.r+6),padTop=Math.max(112,e.r+6),padBottom=Math.max(48,e.r+6);
      e.x=clamp(e.x,padX,W-padX);
      e.y=clamp(e.y,padTop,H-padBottom);
    }
  }
  function updateBoss(dt) {
    if (!boss || boss.dead) return;
    if(boss.hardFinal){updateHardFinal(boss,dt);return;}
    if(boss.ottah){updateOttahBoss(dt);return;}
    if(boss.endlessBoss){updateEndlessBoss(dt);return;}
    boss.phase += dt * 4; boss.hit = Math.max(0,boss.hit-dt);boss.slow=Math.max(0,boss.slow-dt);
    if (!boss.karnil && boss.hp < boss.maxHp * .48 && !boss.enraged) { boss.enraged=true; boss.speed=(boss.cyber?92:76)*(gamePlusLevel===2?1.15:newGamePlus?1.07:1); announce(boss.cyber?'ÜBERTAKTUNG AKTIV.':'OH OH.', boss.cyber?'CYBER-WUTMODUS':'HASENBEIN DREHT DURCH'); }
    const dx=player.x-boss.x,dy=player.y-boss.y,d=Math.hypot(dx,dy)||1;
    const slow=(boss.slow>0?.88:1)*(player.powerups.freeze>0?.7:1);
    if(boss.windup>0){boss.windup-=dt;if(boss.windup<=0){if(boss.windupMode==='beam'){const count=boss.enraged?5:3;for(let i=0;i<count;i++)enemyShot(boss.x,boss.y,boss.aim+(i-(count-1)/2)*.1,boss.enraged?330:290,true);}else boss.charge=boss.windupMode==='ram'?.68:.5;}}
    else if(boss.charge>0){boss.charge-=dt;boss.x+=Math.cos(boss.aim)*(boss.karnil?610:555)*slow*dt;boss.y+=Math.sin(boss.aim)*(boss.karnil?610:555)*slow*dt;}
    else if(d>110) { boss.x += dx/d*boss.speed*slow*dt; boss.y += dy/d*boss.speed*slow*dt; }
    boss.x=clamp(boss.x,55,W-55);boss.y=clamp(boss.y,140,H-60);
    boss.actionCd-=dt*(hardMode?1.12:1);boss.summonCd-=dt;
    if(boss.burstLeft>0){boss.burstCd-=dt;if(boss.burstCd<=0){enemyShot(boss.x,boss.y,boss.aim+(boss.burstCount-boss.burstLeft)*.075,boss.enraged?285:245,true);boss.burstLeft--;boss.burstCd=.1;}}
    if (boss.actionCd <= 0 && boss.windup<=0 && boss.charge<=0 && boss.burstLeft<=0) {
      boss.attack++;const pattern=boss.phaseThree?(gamePlusLevel===2?boss.attack%8:boss.attack%6):(newGamePlus?boss.attack%7:boss.attack%5),offset=Math.atan2(dy,dx);
      if(boss.karnil&&boss.phaseThree&&gamePlusLevel===2&&pattern===6){for(let i=0;i<8;i++)hazards.push({type:'rockfall',x:clamp(player.x+Math.cos(TAU*i/8)*rnd(90,300),80,W-80),y:clamp(player.y+Math.sin(TAU*i/8)*rnd(80,220),150,H-60),r:95,wait:.45+i*.07,life:.35,hit:false,damage:3});for(let i=0;i<12;i++)enemyShot(boss.x,boss.y,TAU*i/12,365,true);}
      else if(boss.karnil&&boss.phaseThree&&gamePlusLevel===2&&pattern===7){for(let ring=0;ring<3;ring++)for(let i=0;i<12;i++)enemyShot(boss.x,boss.y,TAU*i/12+ring*.09,330+ring*35,true);for(let i=0;i<5;i++)hazards.push({type:'shock',x:clamp(player.x+rnd(-260,260),70,W-70),y:clamp(player.y+rnd(-180,180),145,H-60),r:100,wait:.65+i*.1,life:.35,hit:false,damage:3});}
      else if(newGamePlus&&!boss.phaseThree&&!boss.karnil&&!boss.cyber&&pattern===5){for(let ring=0;ring<2;ring++)for(let i=0;i<16;i++)enemyShot(boss.x,boss.y,TAU*i/16+ring*.1,230+ring*70,true);burst(boss.x,boss.y,'#ffb36f',24,160);}
      else if(newGamePlus&&!boss.phaseThree&&!boss.karnil&&!boss.cyber&&pattern===6){for(let i=0;i<3;i++)hazards.push({type:'shock',x:clamp(player.x+rnd(-190,190),65,W-65),y:clamp(player.y+rnd(-140,140),140,H-55),r:105,wait:.55+i*.18,life:.35,hit:false,damage:3});boss.aim=offset;boss.burstLeft=7;boss.burstCount=7;boss.burstCd=.09;}
      else if(newGamePlus&&!boss.phaseThree&&boss.cyber&&!boss.karnil&&pattern===5){for(let lane=-2;lane<=2;lane++)for(let i=0;i<3;i++)enemyShot(boss.x,boss.y,offset+lane*.18+i*.025,330+i*45,true);tone(520,.25,'sawtooth',.07,880);}
      else if(newGamePlus&&!boss.phaseThree&&boss.cyber&&!boss.karnil&&pattern===6){for(let i=0;i<24;i++)enemyShot(boss.x,boss.y,TAU*i/24+(boss.attack%2)*.08,300+(i%2)*70,true);hazards.push({type:'shock',x:player.x,y:player.y,r:155,wait:.75,life:.35,hit:false,damage:3});}
      else if(newGamePlus&&!boss.phaseThree&&boss.karnil&&pattern===5){for(let i=0;i<7;i++)hazards.push({type:'rockfall',x:clamp(player.x-300+i*100,80,W-80),y:clamp(player.y+rnd(-130,130),150,H-60),r:92,wait:.55+i*.09,life:.35,hit:false,damage:3});}
      else if(newGamePlus&&!boss.phaseThree&&boss.karnil&&pattern===6){for(let ring=0;ring<2;ring++)for(let i=0;i<18;i++)enemyShot(boss.x,boss.y,TAU*i/18+ring*.1,280+ring*55,true);hazards.push({type:'shock',x:player.x,y:player.y,r:175,wait:.8,life:.35,hit:false,damage:3});}
      else if(boss.karnil&&boss.phaseThree&&pattern===0){for(let ring=0;ring<2;ring++)for(let i=0;i<14;i++)enemyShot(boss.x,boss.y,TAU*i/14+ring*.12,300-ring*35,true);tone(55,.35,'sawtooth',.08,25);}
      else if(boss.karnil&&boss.phaseThree&&pattern===1){for(let i=0;i<6;i++)hazards.push({type:'rockfall',x:clamp(player.x+rnd(-310,310),80,W-80),y:clamp(player.y+rnd(-220,220),150,H-60),r:105,wait:.55+i*.11,life:.35,hit:false,damage:3});}
      else if(boss.karnil&&boss.phaseThree&&pattern===2){boss.aim=offset;boss.windup=.48;boss.windupMode='ram';hazards.push({type:'shock',x:player.x,y:player.y,r:175,wait:.8,life:.35,hit:false,damage:3});}
      else if(boss.karnil&&boss.phaseThree&&pattern===3){boss.aim=offset;boss.burstLeft=13;boss.burstCount=13;boss.burstCd=.08;}
      else if(boss.karnil&&boss.phaseThree&&pattern===4){for(let i=0;i<4;i++){const a=TAU*i/4;hazards.push({type:'shock',x:clamp(player.x+Math.cos(a)*180,65,W-65),y:clamp(player.y+Math.sin(a)*140,140,H-55),r:105,wait:.72+i*.12,life:.35,hit:false,damage:3});}}
      else if(boss.karnil&&boss.phaseThree){const a=offset;for(let i=-4;i<=4;i++)enemyShot(boss.x,boss.y,a+i*.14,350,true);}
      else if(boss.karnil&&pattern===0){boss.aim=offset;boss.windup=.9;boss.windupMode='ram';hazards.push({type:'rockfall',x:clamp(player.x+rnd(-250,250),80,W-80),y:clamp(player.y+rnd(-180,180),150,H-60),r:boss.enraged?155:125,wait:1.05,life:.4,hit:false,damage:3});tone(48,.5,'sawtooth',.1,22);}
      else if(boss.karnil&&pattern===1){const count=boss.enraged?20:14;for(let i=0;i<count;i++)enemyShot(boss.x,boss.y,offset+TAU*i/count,boss.enraged?255:210,true);burst(boss.x,boss.y,'#bd7350',26,160);}
      else if(boss.karnil&&pattern===2){boss.aim=offset;boss.burstLeft=boss.enraged?9:7;boss.burstCount=boss.burstLeft;boss.burstCd=.2;}
      else if(boss.karnil&&pattern===3){for(let i=0;i<(boss.enraged?4:3);i++)hazards.push({type:'rockfall',x:clamp(player.x+rnd(-270,270),80,W-80),y:clamp(player.y+rnd(-200,200),150,H-60),r:boss.enraged?100:82,wait:.8+i*.18,life:.35,hit:false,damage:2});tone(60,.4,'sawtooth',.08,28);}
      else if(boss.karnil){hazards.push({type:'shock',x:player.x,y:player.y,r:boss.enraged?150:125,wait:1.15,life:.35,hit:false,damage:3});hazards.push({type:'shock',x:clamp(player.x+rnd(-220,220),65,W-65),y:clamp(player.y+rnd(-170,170),140,H-55),r:92,wait:1.55,life:.35,hit:false,damage:2});tone(90,.25,'square',.06,40);}
      else if(boss.cyber&&pattern===0){boss.aim=offset;boss.windup=.78;boss.windupMode='beam';tone(360,.3,'sawtooth',.06,650);}
      else if(boss.cyber&&pattern===1){boss.aim=offset;boss.burstLeft=boss.enraged?18:14;boss.burstCount=boss.burstLeft;boss.burstCd=.12;}
      else if(boss.cyber&&pattern===2){const count=boss.enraged?20:16;for(let i=0;i<count;i++)enemyShot(boss.x,boss.y,TAU*i/count,boss.enraged?255:215,true);burst(boss.x,boss.y,'#87e7f5',20,150);}
      else if(boss.cyber&&pattern===3){hazards.push({type:'shock',x:player.x,y:player.y,r:boss.enraged?145:115,wait:1.05,life:.35,hit:false,damage:3});hazards.push({type:'shock',x:clamp(player.x+rnd(-210,210),65,W-65),y:clamp(player.y+rnd(-160,160),140,H-55),r:90,wait:1.45,life:.35,hit:false,damage:2});}
      else if(boss.cyber){boss.aim=offset;boss.windup=.72;boss.windupMode='ram';}
      else if(pattern===0){boss.aim=offset;boss.windup=.78;boss.windupMode='ram';}
      else if(pattern===1){const count=boss.enraged?18:13;for(let i=0;i<count;i++)enemyShot(boss.x,boss.y,offset+TAU*i/count,boss.enraged?225:185,false);burst(boss.x,boss.y,'#ff9b67',18,110);}
      else if(pattern===2){hazards.push({x:player.x,y:player.y,r:boss.enraged?138:112,wait:1.05,life:.35,hit:false,damage:2});hazards.push({x:clamp(player.x+rnd(-180,180),65,W-65),y:clamp(player.y+rnd(-150,150),140,H-55),r:88,wait:1.45,life:.35,hit:false,damage:2});}
      else {const count=boss.enraged?7:5;for(let i=0;i<count;i++)enemyShot(boss.x,boss.y,offset+(i-(count-1)/2)*.14,boss.enraged?275:220,false);}
      boss.actionCd=(boss.karnil?(boss.phaseThree?.88:(boss.enraged?1.22:1.58)):boss.cyber?(boss.enraged?1.52:1.86):(boss.enraged?1.34:1.74))*(gamePlusLevel===2?.84*.96:newGamePlus?.93*.94:.93);
    }
    if (boss.summonCd <= 0 && enemies.length < (gamePlusLevel===2?18:newGamePlus?14:10)) { const baseCount=boss.enraged?4:3,count=baseCount+(gamePlusLevel===2?2:newGamePlus?1:0);for(let i=0;i<count;i++){let type;if(boss.karnil){const pigTypes=boss.phaseThree?['pigJuggernaut','rocketHare','pigCannon','voidBunny']:boss.enraged?['pigHowler','pigRammer','pigCannon','pigDrone']:['pigRammer','pigMortar','pigDrone'];type=pigTypes[i%pigTypes.length];}else type=newGamePlus&&i%4===3?'voidBunny':boss.cyber?(i%3===2?'rabid':'runner'):(i%3===2?'runner':'bunny');spawnEnemy(type);} boss.summonCd=boss.enraged?6.5:9; }
    if(d < player.r + boss.r) hurtPlayer(2,boss);
  }
  function update(dt) {
    if(mode!=='playing')return;
    queueScoreSkillMilestones();if(mode!=='playing')return;
    runTime+=dt; waveTime+=dt;player.specialCd=Math.max(0,player.specialCd-dt);music(dt);aimPlayer();updateExpansion(dt);if(mode!=='playing')return;
    updateSkillsInPlay(dt);if(mode!=='playing')return;
    player.invuln=Math.max(0,player.invuln-dt); player.dashCd=Math.max(0,player.dashCd-dt);
    let mx=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+touch.x;
    let my=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+touch.y;
    const mag=Math.hypot(mx,my); if(mag>1){mx/=mag;my/=mag;}
    player.moving=mag>.08;
    if(Math.abs(mx)>.05)player.face=mx>0?1:-1;
    if(player.dashTime>0) {
      player.dashTime-=dt; player.x+=player.dashX*875*dt; player.y+=player.dashY*875*dt;
      if(!reducedMotion)player.trail.push({x:player.x,y:player.y,life:.22});
    } else { const moveSpeed=effectiveSpeed(player);player.x+=mx*moveSpeed*dt;player.y+=my*moveSpeed*dt;player.moveDistance+=Math.hypot(mx,my)*moveSpeed*dt;addAchievementProgress('long_run',Math.hypot(mx,my)*moveSpeed*dt); }
    player.x=clamp(player.x,42,W-42);player.y=clamp(player.y,106,H-48);
    player.trail=player.trail.filter(p=>(p.life-=dt)>0);
    shotTimer-=dt;
    if(shotTimer<=0){if(fire())shotTimer=effectiveInterval(player);else shotTimer=.07;}
    if (!boss && waveTime < currentWaveLength()) {
      spawnTimer-=dt;
      if(spawnTimer<=0){
        if(endlessMode){
          const pool=endlessEnemyPool(wave),density=endlessDensityScale(wave)*(endlessFromHall?1.18:1);
          const baseCap=38+wave*1.3+(endlessFromHall?12:0),cap=Math.min(78,Math.round(baseCap));
          let type=hardEnemyChoice(pool[Math.floor(Math.random()*pool.length)]);
          if(wave===0&&!endlessFromHall)type=waveTime>9&&Math.random()<.55?'runner':'bunny';
          else if(wave===0&&endlessFromHall&&Math.random()<.12)type='voidBunny';
          let copies=1;if((endlessFromHall||wave>=14)&&Math.random()<(endlessFromHall?.24:.12))copies++;
          if(enemies.length<cap){for(let c=0;c<copies&&enemies.length<cap;c++)spawnEnemy(c===0?type:pool[Math.floor(Math.random()*pool.length)]);}
          spawnTimer=(impossibleMode?.87:hardMode?.84:1)*Math.max(.19,Math.max(.34,.80-waveTime*.008)/density)*(getMiniBoss()?.miniKind||enemies.some(e=>e.troll&&!e.dead)?1.45:1);
        }else{
        const roll=Math.random();let type='bunny';
        if(wave>=6){
          if(roll<.22)type='pigRammer';else if(roll<.42)type='pigMortar';else if(roll<.59)type='pigCannon';else if(roll<.72)type='pigDrone';else if(roll<.81)type='pigHowler';else if(roll<.9)type='rabid';else type='splitter';
          if(type==='pigMortar'&&enemies.filter(e=>e.type==='pigMortar'&&!e.dead).length>=3)type='pigRammer';
        }else if(wave>=3){
          if(roll<.27)type='rabid';else if(roll<.45&&wave>=4)type='gatling';else if(roll<.58&&wave>=4)type='sniper';else if(roll<.68&&wave>=3)type='sapper';else if(roll<.78)type='splitter';else if(roll<.86)type='runner';else type='brute';
          if(type==='gatling'&&enemies.filter(e=>e.type==='gatling'&&!e.dead).length>=3)type='bunny';
        }else if(wave>0&&roll<.19)type='gunner';else if(wave>0&&roll<.33)type='brute';else if(waveTime>8&&roll<.64)type='runner';
        if(newGamePlus){const eliteRoll=Math.random(),j=gamePlusLevel===2?.10:.06,r=gamePlusLevel===2?.22:.14,v=gamePlusLevel===2?.34:.22;if(wave>=5&&eliteRoll<j)type='pigJuggernaut';else if(wave>=2&&eliteRoll<r)type='rocketHare';else if(eliteRoll<v)type='voidBunny';}
        type=hardEnemyChoice(campaignExtraType(type));const cap=gamePlusLevel===2?66:newGamePlus?54:42;
        if(enemies.length<cap){let copies=1;if(gamePlusLevel===2){if(Math.random()<.30)copies++;}else if(newGamePlus&&Math.random()<.18)copies++;for(let c=0;c<copies&&enemies.length<cap;c++)spawnEnemy(type);if(wave===2&&Math.random()<.35)spawnEnemy('bunny');}
        const baseTimer=wave<3?Math.max(.31,.82-wave*.16-waveTime*.009):wave<6?Math.max(.38,.69-(wave-3)*.075-waveTime*.004):Math.max(.35,.62-(wave-6)*.07-waveTime*.004);
        spawnTimer=baseTimer*(impossibleMode?.70:hardMode?.82:1)*(gamePlusLevel===2?.85:newGamePlus?.93:1)*(wave<3?.93:.90)*(getMiniBoss()?.miniKind||enemies.some(e=>e.troll&&!e.dead)?1.45:1);
        }
      }
    }
    for(const e of enemies){
      if(e.dead)continue;
      if(e.spawnGrace>0){e.spawnGrace=Math.max(0,e.spawnGrace-dt);continue;}
      if((e.ossiBlocked||0)>0){e.ossiBlocked=Math.max(0,e.ossiBlocked-dt);e.phase+=dt*13;if(Math.random()<dt*2.4)particles.push({type:'spark',x:e.x+rnd(-8,8),y:e.y+rnd(-4,8),life:.22,maxLife:.22,r:3,color:'#c7b385'});continue;}
      e.phase+=dt*(e.type==='runner'||e.type==='rabid'||e.type==='pigDrone'?12:7);e.hit=Math.max(0,e.hit-dt);const actionDt=dt*(e.actionRate||1);e.fireCd-=actionDt;e.slow=Math.max(0,e.slow-dt);e.mortarCd-=actionDt;
      const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;
      const desired=e.type==='gunner'||e.type==='pigMortar'?300:0;
      e.mineCd-=actionDt;e.howlCd-=actionDt;
      if(e.discussTime>0){e.discussTime=Math.max(0,e.discussTime-dt);}
      else if(e.troll||e.hardType)updateContentEnemy(e,dt);
      else if(e.miniKind||e.variant)updateExtraEnemy(e,dt);
      else if(e.type==='rabid'||e.type==='gatling'||e.type==='sniper'||e.type==='sapper'||e.type==='pigHowler'||e.type==='pigRammer'||e.type==='pigMortar'||e.type==='pigCannon'||e.type==='pigDrone'||e.type==='zombieBoss'||e.type==='voidBunny'||e.type==='rocketHare'||e.type==='pigJuggernaut'||e.type==='burrowBunny'||e.type==='stormBunny'||e.type==='gnomePig')updateTerror(e,dt);
      else if(d>desired || (e.type==='gunner'&&d<170)) {
        const dir=e.type==='gunner'&&d<170?-1:1;
        const slow=(e.slow>0?.70:1)*(player.powerups.freeze>0?.58:1);e.x+=dx/d*e.speed*dt*dir*slow;e.y+=dy/d*e.speed*dt*dir*slow;
      }
      if(!(e.discussTime>0)&&e.type==='gunner'&&e.fireCd<=0&&d<650){enemyShot(e.x,e.y,Math.atan2(dy,dx),184);e.fireCd=2.15;}
      if(!(e.discussTime>0)&&e.type==='pigMortar'&&e.mortarCd<=0&&d<760){hazards.push({type:'mortar',x:clamp(player.x+rnd(-110,110),55,W-55),y:clamp(player.y+rnd(-100,100),125,H-50),r:67,wait:1.05,life:.35,hit:false,damage:2});e.mortarCd=3.2;}
      if(!(e.discussTime>0)&&dist(player,e)<e.r+player.r-3)hurtPlayer(e.type==='brute'||e.type==='pigRammer'||e.type==='pigHowler'?2:1,e);
      if(mode!=='playing')return;
    }
    // A small separation force keeps the rabbit horde readable.
    for(let i=0;i<enemies.length;i++)for(let j=i+1;j<enemies.length;j++){
      const a=enemies[i],b=enemies[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=(a.r+b.r)*.82;
      if(d>0&&d<min){const force=(min-d)*dt*2;a.x-=dx/d*force;a.y-=dy/d*force;b.x+=dx/d*force;b.y+=dy/d*force;}
    }
    // Never let a living enemy disappear outside the arena or become unfinishable through invalid coordinates.
    keepEnemiesInArena();
    updateBoss(dt); if(mode!=='playing')return;
    for(const b of bullets){
      const oldX=b.x,oldY=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
      const all=[...enemies,...(boss&&!boss.dead?[boss]:[]),...(paftiBoss&&!paftiBoss.dead?[paftiBoss]:[])];
      for(const e of all){
        if(e.dead||b.hitIds.has(e))continue;
        const dx=b.x-oldX,dy=b.y-oldY,l2=dx*dx+dy*dy;
        const t=l2?clamp(((e.x-oldX)*dx+(e.y-oldY)*dy)/l2,0,1):0;
        if(Math.hypot(oldX+dx*t-e.x,oldY+dy*t-e.y)<e.r+b.r){
          b.hitIds.add(e);if(b.narrath)e.narrathHit=true;if(b.frost)e.slow=1.5;damageEnemy(e,b.damage*((b.auto||b.narrath||b.ping)&&player.professorCouncil?1.18:1));if(b.ricochet&&player.ricochet){b.ricochet=false;chainHit(e,b.damage*.55);}
          if(mode!=='playing')return;
          if(b.chain){b.chain=false;chainHit(e,b.damage);if(mode!=='playing')return;}
          if(b.pierce<=0){b.life=0;break;}b.pierce--;
        }
      }
    }
    bullets=bullets.filter(b=>b.life>0&&b.x>-60&&b.x<W+60&&b.y>-60&&b.y<H+60);
    for(const b of enemyBullets){
      const from={x:b.x,y:b.y};b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
      const wall=ossiWalls.find(w=>w.boss&&segmentBox(from,b,w,(w.w||228)/2+b.r,(w.h||108)/2+b.r));
      if(wall){b.life=0;continue;}
      const close=segmentDistance(player,from,b);b.closest=Math.min(b.closest??Infinity,close);
      if(close<player.r+b.r-3){hurtPlayer(1,b);b.life=0;b.playerHit=true;}
      if(b.life<=0||b.x<0||b.x>W||b.y<0||b.y>H){if(b.sniper&&!b.playerHit&&!b.counted&&b.closest<140){b.counted=true;addAchievementProgress('sniper_nope');}}
      if(mode!=='playing')return;
    }
    enemyBullets=enemyBullets.filter(b=>b.life>0&&b.x>-50&&b.x<W+50&&b.y>-50&&b.y<H+50);
    for(const h of hazards){
      h.wait-=dt;
      if(h.wait<=0){
        h.life-=dt;
        if(!h.hit){h.hit=true;shake=reducedMotion?0:9;burst(h.x,h.y,h.type==='friendlyEgg'?'#fff1b2':h.type==='shock'?'#ffb3e4':h.type==='mine'?'#f4b25e':'#ffa65e',h.type==='mine'?45:35,260);tone(h.type==='rockfall'?55:90,.25,'sawtooth',.06,30);
          if(h.friendly){for(const e of enemies)if(dist(h,e)<h.r+e.r){const pigMult=h.pigBonus&&e.type.startsWith('pig')?h.pigBonus:1;if(h.ice)e.slow=Math.max(e.slow||0,3);damageEnemy(e,(h.damage||36)*pigMult,true);if(mode!=='playing')return;}for(const target of [boss,paftiBoss])if(target&&!target.dead&&dist(h,target)<h.r+target.r){if(h.ice)target.slow=Math.max(target.slow||0,1.5);damageEnemy(target,(h.damage||36)*(h.bossBonus||.8),true);}h.life=.3;}
        }
        if(h.type==='sapperMine'&&h.life<=0&&!h.playerHit&&!h.achievementCounted){h.achievementCounted=true;addAchievementProgress('mine_sweeper');}
        if(!h.friendly&&dist(player,h)<h.r+player.r*.5&&!h.playerHit){h.playerHit=true;hurtPlayer(h.damage||2,h);}
      }
      if(mode!=='playing')return;
    }
    hazards=hazards.filter(h=>h.wait>0||h.life>0);
    for(const t of thrownWeapons){
      t.life-=dt;if(!t.returning&&t.life<.86){t.returning=true;t.hitIds.clear();t.damage*=.9;}
      if(t.returning){const dx=player.x-t.x,dy=player.y-t.y,d=Math.hypot(dx,dy)||1;t.vx=dx/d*560;t.vy=dy/d*560;}
      t.x+=t.vx*dt;t.y+=t.vy*dt;
      const all=[...enemies,...(boss&&!boss.dead?[boss]:[]),...(paftiBoss&&!paftiBoss.dead?[paftiBoss]:[])];
      for(const e of all)if(!e.dead&&!t.hitIds.has(e)&&dist(t,e)<e.r+t.r){t.hitIds.add(e);damageEnemy(e,t.damage);if(mode!=='playing')return;if(t.hitIds.size<5)t.damage*=.92;}
    }
    thrownWeapons=thrownWeapons.filter(t=>t.life>0&&(!t.returning||dist(t,player)>25));
    for(const p of pickups){
      p.life-=dt;p.phase+=dt*3;const d=dist(player,p),magnetRadius=player.magnet*(player.powerups.magnet>0?2.2:1);
      if(d<magnetRadius&&d>1){p.x+=(player.x-p.x)/d*310*dt;p.y+=(player.y-p.y)/d*310*dt;}
      if(d<25){p.life=0;if(p.type==='heart'){player.hp=Math.min(player.maxHp,player.hp+1);floater(player.x,player.y-35,'+1 ♥',accent());tone(700,.13,'sine',.055,1050);}else if(p.type==='power'){collectPowerup(p);}else if(p.type==='ammo'){grantSpecialAmmo();}else{score+=Math.round((player.powerups.jackpot>0?80:20)*(player.powerups.scoreRush>0?2:1)*runScoreMultiplier());setAchievementProgress('score_hog',score);tone(1000,.045,'sine',.022,1400);}}
    }
    pickups=pickups.filter(p=>p.life>0);enemies=enemies.filter(e=>!e.dead);
    if(!boss&&waveSpawningComplete()&&livingEnemyCount()===0)beginVictory(upgradeScreen);
    uiTimer-=dt;if(uiTimer<=0){updateHud();uiTimer=.1;}
  }

  // Final Knoppers: shared balance limits, explicit reward state, and additive content.
  const BALANCE={maxSpeed:440,minInterval:.10,minDash:.85,maxHearts:30,maxAmmoBonus:12,maxPowerLuck:4.5,maxDamage:30};
  const extraEnemyBook={
    shieldHare:{name:'SCHILDKNAPPE',stats:[12,64,23,280],color:'#70cbd5',unlock:'NG+ · Welle 2',species:'rabbit'},
    arcHare:{name:'BLITZLÖFFEL',stats:[10,77,21,310],color:'#d8b0fa',unlock:'NG+ · Welle 5',species:'rabbit'},
    pigMedic:{name:'FERKEL-SANITÄTER',stats:[16,65,26,440],color:'#cde4c0',unlock:'NG+2 · Welle 2',species:'pig'},
    glassHare:{name:'SPLITTERLÄUFER',stats:[9,136,20,380],color:'#a5eced',unlock:'NG+2 · Welle 6',species:'rabbit'},
    sewerRat:{name:'KANALRATTE',stats:[5,156,17,190],color:'#aaa0b2',unlock:'Endlosmodus · Welle 4',species:'rat'},
    lanternMoth:{name:'LAMPENMOTTE',stats:[12,70,23,360],color:'#e9d487',unlock:'Endlosmodus · Welle 9',species:'moth'},
    clockCrab:{name:'UHRWERK-KRABBE',stats:[20,54,29,530],color:'#ddb074',unlock:'Endlosmodus · Welle 13',species:'crab'},
    cometRat:{name:'KOMETRATTE',stats:[18,103,24,590],color:'#bf9fea',unlock:'Endlosmodus · Welle 19',species:'rat'}
  };
  const miniBossBook={
    ramCaptain:{name:'RAMMEL-KAPITÄN',hp:76,speed:70,color:'#e8aa72',icon:'↗'},
    mortarChef:{name:'MÖRSER-KOCH',hp:70,speed:45,color:'#e9cd97',icon:'☄'},
    discoBoar:{name:'DISKO-KEILER',hp:83,speed:55,color:'#d699df',icon:'✦'},
    hiveKeeper:{name:'BRUTMEISTER',hp:74,speed:54,color:'#a1cb82',icon:'♜'},
    frostWarden:{name:'FROSTWÄCHTER',hp:78,speed:60,color:'#90dbef',icon:'❄'}
  };
  Object.assign(endlessBossBook,{
    ratEmpress:{name:'RATTENKAISERIN',subtitle:'DIE KANÄLE GEHÖREN IHR',hp:460,speed:78,color:'#b895aa',minWave:9},
    sugarGolem:{name:'KARAMELL-GOLEM',subtitle:'ZUCKER MIT SCHLAGKRAFT',hp:510,speed:58,color:'#ddaa67',minWave:14},
    starOwl:{name:'STERNENEUle'.toUpperCase(),subtitle:'KEIN STERN IST SICHER',hp:480,speed:82,color:'#a9bce9',minWave:19}
  });
  const survivalSkillBook={
    scavengerPulse:{icon:'✧',title:'SCHROTTMAGNET',short:'Schrottmagnet',desc:'Nur Endlosmodus: Alle 18 Sekunden werden alle Drops herangezogen. Ein eingesammeltes Power-up lädt eine zufällige leere Spezialwaffen-Ladung nach (8 s Abklingzeit).',endless:true,apply:p=>p.scavengerPulse=true},
    adrenaline:{icon:'⚡',title:'ADRENALINBACKEN',short:'Adrenalin',desc:'Nur Endlosmodus: Unter 40 % Leben +22 % Feuerrate und +10 % Tempo. Kein dauerhafter Wertverlust beim Heilen.',endless:true,apply:p=>p.adrenaline=true},
    ratKing:{icon:'♛',title:'RATTENKÖNIG',short:'Rattenkönig',desc:'Nur Endlosmodus: Alle 9 Sekunden begleitet dich ein Rudel aus 5 Ratten (je 1,6 × Spezialfaktor Schaden). Rattenterror erhält zwei zusätzliche Ratten.',endless:true,apply:p=>p.ratKing=true},
    stormOrbit:{icon:'◉',title:'GEWITTERKRANZ',short:'Gewitterkranz',desc:'Nur Endlosmodus: Alle 6 Sekunden 4 × √Nussschaden im Radius 175; löscht dabei maximal 6 feindliche Projektile in diesem Radius.',endless:true,apply:p=>p.stormOrbit=true},
    survivalInstinct:{icon:'◈',title:'ÜBERLEBENSINSTINKT',short:'Instinkt',desc:'Nur Endlosmodus: +1 Herz. Nach einem echten Treffer lädt dein Dash sofort; der Effekt hat 8 Sekunden Abklingzeit.',endless:true,apply:p=>{p.survivalInstinct=true;p.maxHp++;p.hp=Math.min(p.maxHp,p.hp+1);}}
  };
  Object.assign(skillBook,{
    nutDropping:{icon:'●',title:'DER NUSSKÖTTEL',short:'Nussköttel',desc:'Alle 5,5 Sekunden ein zufälliger Nussköttel (max. 3, je 12 s). Berührung vergiftet 5 s: 0,8 × √Nussschaden pro Sekunde. Gegner stecken sich bei Kontakt an. Gift stapelt nicht.',apply:p=>p.nutDropping=true},
    snickersBar:{icon:'▰',title:'DER SNICKERS RIEGEL',short:'Snickers Riegel',desc:'Einmal essen: 3 unterschiedliche zufällige Werte aus +12 % Nussschaden, +10 % Feuerrate, +7 % Tempo, −8 % Dash-Cooldown, +12 % Spezialschaden, +1 Herz. Das Ergebnis bleibt im Build sichtbar.',apply:p=>{p.snickersBar=true;if(!p.candyBuffs?.length)p.candyBuffs=shuffled(Object.keys(candyBook)).slice(0,3);for(const id of p.candyBuffs)candyBook[id].apply(p);}},
    beagle:{icon:'↻',title:'BEAGLEHUND MIT MISCHSUCHT',short:'Beagle-Buff',desc:'Nach jeder künftig gewonnenen Welle ein kostenloser Shuffle. Unbenutzte Wellen-Shuffles verfallen; deine einmaligen Shuffle-Ladungen bleiben erhalten.',apply:p=>p.beagle=true},
    narrath:{icon:'⚕',title:'HERR DR. NARRATH',short:'Dr. Narrath',desc:'Ein Professor im Laborkittel begleitet dich. Sein Laserblaster feuert 5-mal pro Sekunde auf nahe Gegner: je 0,5 × √Nussschaden, Reichweite 620.',apply:p=>p.narrath=true}
  });
  const candyBook={
    damage:{label:'+12 % Nussschaden',apply:p=>p.damage*=1.12},fireRate:{label:'+10 % Feuerrate',apply:p=>p.fireRate/=1.1},speed:{label:'+7 % Tempo',apply:p=>p.speed*=1.07},dash:{label:'−8 % Dash-Cooldown',apply:p=>p.dashCooldown*=.92},special:{label:'+12 % Spezialschaden',apply:p=>p.specialDamage*=1.12},heart:{label:'+1 permanentes Herz',apply:p=>{p.maxHp++;p.hp=Math.min(p.maxHp,p.hp+1);}}
  };
  Object.assign(ngPlusSkillBook,{
    ricochet:{icon:'↬',title:'BANDE MIT BISS',short:'Bandenbiss',desc:'NG+: Normale Projektile lassen einmal 44 % ihres Trefferschadens auf ein anderes Ziel im Radius 185 überspringen.',ngplus:true,apply:p=>p.ricochet=true},
    emergencyReserve:{icon:'♥',title:'NOTRESERVE',short:'Notreserve',desc:'NG+: Ein tödlicher Treffer pro Welle lässt dir 1 Herz und 2 s Schutz. Bosse zählen als eigener Abschnitt; kein zusätzlicher Retry.',ngplus:true,apply:p=>p.emergencyReserve=true}
  });
  Object.assign(ngPlus2SkillBook,{
    phaseCapacitor:{icon:'⌁',title:'PHASENKONDENSATOR',short:'Phasenkondensator',desc:'NG+2: Dash lädt 12 % schneller und löscht beim Start bis zu 10 feindliche Projektile im Radius 150. +15 % Spezialschaden.',ngplus2:true,apply:p=>{p.phaseCapacitor=true;p.dashCooldown*=.88;p.specialDamage*=1.15;}},
    lastBite:{icon:'⋎',title:'DER LETZTE BISS',short:'Letzter Biss',desc:'NG+2: 25 % zusätzlicher Schaden an Gegnern unter 30 % Leben. Wirkt auch auf Bossphasen, Gift und Begleiter.',ngplus2:true,apply:p=>p.lastBite=true}
  });
  Object.assign(weaponBook,{
    ratTerror:{name:'RATTENTERROR',icon:'≋',desc:'Feuert 9 Ratten in Zielrichtung. Sie suchen danach Gegner im Umkreis, treffen je einmal mit 4 × Spezialfaktor Schaden und bleiben 2,4 s. 3 Ladungen.',max:3},
    singularity:{name:'NUSS-SINGULARITÄT',icon:'◉',desc:'Nur Endlosmodus: 2,8 s Sog am Ziel; hält normale Gegner zusammen. Abschlussexplosion: 32 × Spezialfaktor Schaden, Radius 155. Bosse werden nicht verschoben. 3 Ladungen.',max:3},
    thunderRail:{name:'DONNERGLEIS',icon:'ϟ',desc:'Nur Endlosmodus: Drei parallele Strahlen mit je 18 × Spezialfaktor Schaden durch die Arena. 3 Ladungen.',max:3},
    hiveLauncher:{name:'HUMMELHAUBITZE',icon:'✿',desc:'Nur Endlosmodus: Ein Schwarm aus 12 suchenden Hummeln mit je 3 × Spezialfaktor Schaden. 4 Ladungen.',max:4},
    iceComet:{name:'FROSTKOMET',icon:'❄',desc:'Nur Endlosmodus: Zieleinschlag mit 38 × Spezialfaktor Schaden, Radius 145. Verlangsamt Überlebende 3 s, Bosse 1,5 s. 3 Ladungen.',max:3},
    orbitSaw:{name:'KREISSÄGEN-KARUSSELL',icon:'✺',desc:'Nur Endlosmodus: 4 Sägen umkreisen dich 3 Sekunden in Radius 94. Alle 0,45 s können sie je 4 × Spezialfaktor Schaden zufügen. 3 Ladungen.',max:3}
  });
  function weaponUnlock(id,endless=false){const w=weaponBook[id];return {title:w.name,short:w.name,icon:w.icon,desc:w.desc,weapon:id,endless,apply:p=>{if(!p.weapons.includes(id))p.weapons.push(id);p.weaponUses[id]=w.max+(p.ammoBonus||0);}};}
  skillBook.ratTerror=weaponUnlock('ratTerror');
  const survivalWeaponUpgrades=Object.fromEntries(['singularity','thunderRail','hiveLauncher','iceComet','orbitSaw'].map(id=>[id,weaponUnlock(id,true)]));
  Object.assign(scoreSkillBook,{
    heart:{icon:'♥',title:'PERMANENTES HERZ',desc:'+1 maximales Herz und +1 Herz Heilung. Maximal 30 Herzen.',apply:p=>{p.maxHp++;p.hp=Math.min(p.maxHp,p.hp+1);}},
    ammo:{icon:'⊕',title:'EXTRA-MUNITION',desc:'+1 maximale und aktuelle Ladung pro Waffe, auch für später freigeschaltete Waffen. Maximal +12.',apply:p=>{p.ammoBonus++;for(const id of p.weapons)p.weaponUses[id]=(p.weaponUses[id]||0)+1;}},
    shuffle:{icon:'↻',title:'EXTRA-SHUFFLE',desc:'+1 einmalige Shuffle-Ladung. Bleibt bis zur Verwendung erhalten; lädt sich nach einer Welle nicht auf.',apply:p=>p.shuffleBonusBank=(p.shuffleBonusBank||0)+1}
  });
  // Old choices remain in the game, but every choice gets a distinct role.
  Object.assign(skillBook.rapid,{desc:'25 % höhere Feuerrate.',apply:p=>p.fireRate/=1.25});
  Object.assign(skillBook.hotChamber,{desc:'45 % höhere Feuerrate, dafür 14 % weniger Nussschaden. Gut für salvenabhängige Effekte.',apply:p=>{p.hotChamber=true;p.fireRate/=1.45;p.damage*=.86;}});
  Object.assign(skillBook.turbo,{desc:'18 % höhere Feuerrate und +8 % Spezialschaden.',apply:p=>{p.fireRate/=1.18;p.specialDamage*=1.08;}});
  Object.assign(skillBook.power,{desc:'35 % mehr Nussschaden.',apply:p=>p.damage*=1.35});
  Object.assign(skillBook.bombs,{desc:'Nussbomben erhalten dauerhaft +2 maximale Ladungen und werden sofort gefüllt.',apply:p=>{p.bombBonus=(p.bombBonus||0)+2;p.weaponUses.nutBomb=weaponBook.nutBomb.max+p.ammoBonus+p.bombBonus;}});
  Object.assign(skillBook.fortified,{desc:'+2 Herzen, volle Heilung und +5 % Blockchance.',apply:p=>{p.maxHp+=2;p.hp=p.maxHp;p.damageGuard+=.05;}});
  Object.assign(skillBook.ossiWall,{desc:weaponBook.ossiWall.desc});
  skillBook.pigPopper.desc=weaponBook.pigPopper.desc='Schockstoß im Radius 255: 30 Basisschaden, ×1,65 gegen Schweine oder ×1,25 gegen Bosse. 4 Ladungen.';
  Object.assign(specialUpgradeBook.chronoFur,{desc:'Dash lädt 30 % schneller und Snickers läuft 12 % schneller.',apply:p=>{p.dashCooldown*=.70;p.speed*=1.12;}});
  Object.assign(specialUpgradeBook.shellArmor,{desc:'+3 Herzen, volle Heilung und eine wiederaufladbare Schutzschale.',apply:p=>{p.maxHp+=3;p.hp=p.maxHp;p.shield=true;p.shieldReady=true;}});
  Object.assign(specialUpgradeBook.graniteFur,{desc:'+3 Herzen, volle Heilung und +12 % Blockchance.',apply:p=>{p.maxHp+=3;p.hp=p.maxHp;p.damageGuard+=.12;}});
  Object.assign(ngPlusSkillBook.creamHeart,{desc:'NG+: +2 Herzen und volle Heilung. Im Kampf alle 18 Sekunden +1 Herz.',apply:p=>{p.creamHeart=true;p.maxHp+=2;p.hp=p.maxHp;}});
  ngPlusSkillBook.breadHalo.desc='NG+: Alle 4 Sekunden eine Krustenwelle im Radius 185: 4,5 × √Nussschaden.';
  ngPlusSkillBook.deathBurst.desc='NG+: Jeder fünfte Kill löst eine Explosion im Radius 125 mit 7 × √Nussschaden aus.';
  ngPlusSkillBook.dashNova.desc='NG+: Jeder Dash feuert 12 radiale Nüsse mit je 2,6 × √Nussschaden. Dash lädt 10 % schneller.';
  skillBook.shockDash.desc='Der Dash-Start trifft nahe Gegner für 6 × √Nussschaden, Bosse für 8 × √Nussschaden.';
  skillBook.nutSentry.desc='Ein automatischer Begleiter feuert alle 0,82 s mit 1,8 × √Nussschaden. Reichweite 560.';
  skillBook.carrotDrone.desc='Alle 2,8 s ein automatischer Einschlag: 9 × √Spezialschaden im Radius 82, nach 0,62 s Vorwarnung.';
  skillBook.eggBooger.desc='Alle 0,85 s springt der Eierpopel auf einen Gegner: 2,8 × √Nussschaden.';
  skillBook.merzEggs.desc='Alle 5 s zwei Eier bei Gegnern. Sie explodieren nach 1,05 s im Radius 92 mit je 10 × √Spezialschaden.';
  skillBook.orbit.desc='Zwei Nüsse kreisen im Radius 62. Berührungen verursachen 1,8 × √Nussschaden, mit 0,52 s gemeinsamem Treffer-Cooldown.';
  ngPlusSkillBook.turretVolley.desc='NG+: Schaltet den Knabber-Turm frei oder verbessert ihn: alle 0,60 s zwei Nüsse mit je 1,65 × √Nussschaden und +1 Durchschlag.';
  ngPlus2SkillBook.nuclearSentry.desc='NG+2: Automatischer Knabber-Turm mit drei Nüssen alle 0,55 s. Je 1,5 × √Nussschaden und +2 Durchschlag.';
  scoreSkillBook.damage.desc='+10 % dauerhafter Nussschaden, maximal 30 Basisschaden pro Nuss.';
  scoreSkillBook.speed.desc='+10 % dauerhaftes Tempo, maximal 440 Arena-Einheiten/s.';
  scoreSkillBook.fireRate.desc='+10 % dauerhafte Feuerrate, maximal 10 normale Salven/s ohne Power-ups.';
  scoreSkillBook.dash.desc='10 % kürzerer Dash-Cooldown, mindestens 0,85 s.';
  scoreSkillBook.powerLuck.desc='+10 % Power-up-Dropfaktor, maximal 4,5×.';
  upgradePools.forEach(pool=>pool.push('nutDropping','snickersBar','beagle','narrath','ratTerror'));

  function normalizeBuild(p){
    p.maxHp=clamp(Number(p.maxHp)||5,1,BALANCE.maxHearts);p.hp=clamp(Number(p.hp)||0,0,p.maxHp);
    p.speed=clamp(Number(p.speed)||264,180,BALANCE.maxSpeed);p.fireRate=clamp(Number(p.fireRate)||.32,BALANCE.minInterval,1);
    p.dashCooldown=clamp(Number(p.dashCooldown)||2.25,BALANCE.minDash,4);p.damage=clamp(Number(p.damage)||1.4,.2,BALANCE.maxDamage);
    p.specialDamage=Math.max(.2,Number(p.specialDamage)||1);p.powerLuck=clamp(Number(p.powerLuck)||1,.1,BALANCE.maxPowerLuck);
    p.ammoBonus=clamp(Math.floor(p.ammoBonus||0),0,BALANCE.maxAmmoBonus);p.dodgeChance=clamp(p.dodgeChance||0,0,.4);p.damageGuard=clamp(p.damageGuard||0,0,.45);p.crit=clamp(p.crit||0,0,.65);
    p.shuffleBonusBank=Math.max(0,Math.floor(p.shuffleBonusBank||0));p.bombBonus=clamp(p.bombBonus||0,0,4);
    for(const id of p.weapons)p.weaponUses[id]=clamp(Number(p.weaponUses[id])||0,0,weaponBook[id].max+p.ammoBonus+(id==='nutBomb'?p.bombBonus:0));
  }
  const adrenalineActive=p=>p.adrenaline&&p.hp/p.maxHp<.4;
  const effectiveInterval=p=>Math.max(.065,p.fireRate*(p.powerups?.berserk>0?.70:1)*(p.powerups?.overclock>0?.72:1)*(p.powerups?.overdrive>0?.62:1)/(adrenalineActive(p)?1.22:1)/(p.nightTime>0?1.15:1));
  const effectiveSpeed=p=>Math.min(550,p.speed*(p.powerups?.haste>0?1.34:1)*(adrenalineActive(p)?1.1:1));
  const effectiveDash=p=>Math.max(.85,p.dashCooldown);
  function nearestTarget(from=player,range=900){let best=null,near=range;for(const e of enemies){if(!e.dead){const d=dist(from,e);if(d<near){best=e;near=d;}}}if(boss&&!boss.dead&&dist(from,boss)<near){best=boss;near=dist(from,boss);}if(paftiBoss&&!paftiBoss.dead&&dist(from,paftiBoss)<near)best=paftiBoss;return best;}
  function combatTargets(){return [...enemies.filter(e=>!e.dead),...(boss&&!boss.dead?[boss]:[]),...(paftiBoss&&!paftiBoss.dead?[paftiBoss]:[])];}
  function aimPlayer(){
    if(!player)return false;
    if(inputMode==='touch'){const target=nearestTarget(player,1500);if(target){player.angle=Math.atan2(target.y-player.y,target.x-player.x);return true;}return false;}
    if(!pointer.active)return false;
    player.angle=Math.atan2(pointer.y-player.y,pointer.x-player.x);return true;
  }
  function weaponTarget(range){
    let t=inputMode==='touch'?nearestTarget(player,range+180):pointer.active?pointer:null;
    if(!t)t={x:player.x+Math.cos(player.angle)*range,y:player.y+Math.sin(player.angle)*range};
    const d=dist(player,t),f=d>range?range/d:1;return {x:clamp(player.x+(t.x-player.x)*f,55,W-55),y:clamp(player.y+(t.y-player.y)*f,118,H-55)};
  }
  function safeSpawnPoint(){
    let best={x:40,y:120},far=0;
    for(let i=0;i<12;i++){const edge=Math.floor(Math.random()*4),p={x:edge===0?40:edge===1?W-40:rnd(40,W-40),y:edge===2?115:edge===3?H-50:rnd(115,H-50)},d=dist(player,p);if(d>far){best=p;far=d;}if(d>340)return p;}
    return best;
  }
  function isRabbit(e){if(e.miniKind)return ['ramCaptain','frostWarden'].includes(e.miniKind);if(e.troll)return false;if(extraEnemyBook[e.type])return extraEnemyBook[e.type].species==='rabbit';return isBoss(e)?e.endlessBoss?['general','cyber'].includes(e.endlessKind):!e.karnil&&!e.ottah:!e.type.startsWith('pig')&&e.type!=='gnomePig';}
  function limitEnemyType(type){
    if(type==='pigMedic'&&enemies.filter(e=>!e.dead&&e.type==='pigMedic').length>=2)return 'pigDrone';
    const caster=['pigMortar','gnomePig','rocketHare','sapper','clockCrab','lanternMoth'];
    if(caster.includes(type)&&enemies.filter(e=>!e.dead&&caster.includes(e.type)).length>=5)return 'runner';
    if(['gatling','sniper','stormBunny','pigHowler','arcHare'].includes(type)&&enemies.filter(e=>!e.dead&&e.type===type).length>=3)return 'bunny';
    return type;
  }
  function campaignExtraType(type){
    if(!newGamePlus||Math.random()>.17)return type;
    const pool=[];if(wave>=1)pool.push('shieldHare');if(wave>=4)pool.push('arcHare');if(gamePlusLevel===2&&wave>=1)pool.push('pigMedic');if(gamePlusLevel===2&&wave>=5)pool.push('glassHare');return pool.length?shuffled(pool)[0]:type;
  }
  function planMiniBoss(w){
    const chance=endlessMode?.40:gamePlusLevel===2?.60:gamePlusLevel===1?.55:.40;
    if(w<3||w-lastMiniWave<2||Math.random()>=chance)return null;
    return {kind:shuffled(Object.keys(miniBossBook))[0],time:rnd(13,23),spawned:false};
  }
  function spawnWaveMini(kind){
    const cfg=miniBossBook[kind],p=safeSpawnPoint(),scale=endlessMode?(endlessFromHall?2.9:1)*endlessHpScale(wave):campaignHpScale();
    const e=spawnEnemy('brute');Object.assign(e,p,{type:'waveMini',miniBoss:true,miniKind:kind,hp:cfg.hp*scale,maxHp:cfg.hp*scale,r:31,speed:cfg.speed*1.05,points:1600+wave*85,fireCd:2,chargeCd:2,spawnGrace:1.1,pattern:0});
    lastMiniWave=wave;announce('MINIBOSS · 3 GARANTIERTE POWER-UPS',cfg.name);return e;
  }
  function clearCombatExtras(){poisonPatches=[];ratSwarms=[];thrownWeapons=[];if(player){player.emergencyUsed=false;player.sawTime=0;player.specialCd=0;} }
  function updateExtraEnemy(e,dt){
    const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1,a=Math.atan2(dy,dx),slow=(e.slow>0?.7:1)*(player.powerups.freeze>0?.65:1);
    e.shieldTime=Math.max(0,(e.shieldTime||0)-dt);
    if(e.charge>0){e.charge-=dt;e.x+=Math.cos(e.aim)*430*slow*dt;e.y+=Math.sin(e.aim)*430*slow*dt;return;}
    if(e.windup>0){e.windup-=dt;if(e.windup<=0)executeExtraAttack(e);return;}
    const ranged=e.miniKind!=='ramCaptain'&&e.type!=='sewerRat'&&e.type!=='glassHare',stop=ranged?270:40;
    if(d>stop){e.x+=dx/d*e.speed*slow*dt;e.y+=dy/d*e.speed*slow*dt;}
    if(e.fireCd<=0){e.aim=a;e.windup=e.miniKind?.9:.75;e.fireCd=(e.miniKind?3.3:3.9)/(e.actionRate||1);}
  }
  function executeExtraAttack(e){
    const k=e.miniKind||e.type;e.pattern=(e.pattern||0)+1;
    if(k==='ramCaptain'||k==='glassHare'||k==='sewerRat'||k==='cometRat'){
      e.charge=k==='ramCaptain'?.62:.38;
      if(k==='cometRat')hazards.push({type:'rocketMark',x:player.x,y:player.y,r:65,wait:1.1,life:.35,hit:false,damage:1.5});
    }else if(k==='mortarChef'||k==='clockCrab'){
      for(let i=0;i<(k==='mortarChef'?3:2);i++)hazards.push({type:'mortar',x:clamp(player.x+(i-1)*105,70,W-70),y:clamp(player.y+(i%2)*70,140,H-60),r:k==='mortarChef'?66:56,wait:1.05+i*.25,life:.35,hit:false,damage:1.5});
    }else if(k==='discoBoar'||k==='lanternMoth'){
      const count=k==='discoBoar'?14:10,gap=e.pattern%count;for(let i=0;i<count;i++)if(i!==gap&&i!==(gap+1)%count)enemyShot(e.x,e.y,TAU*i/count+e.pattern*.13,205,true);
    }else if(k==='hiveKeeper'){
      if(enemies.filter(x=>x.summoned&&!x.dead).length<4)for(let i=0;i<2;i++){const c=spawnEnemy('runner');c.summoned=true;c.x=clamp(e.x+(i?38:-38),40,W-40);c.y=e.y;c.spawnGrace=.8;}
      for(let i=-1;i<=1;i++)enemyShot(e.x,e.y,e.aim+i*.24,200);
    }else if(k==='frostWarden'){
      for(let i=-2;i<=2;i++)enemyShot(e.x,e.y,e.aim+i*.20,230,true);
      hazards.push({type:'shock',x:player.x,y:player.y,r:75,wait:1.15,life:.3,hit:false,damage:1.5});
    }else if(k==='shieldHare'){e.shieldTime=1.6;enemyShot(e.x,e.y,e.aim,215,true);}
    else if(k==='arcHare'){for(let i=-1;i<=1;i++)enemyShot(e.x,e.y,e.aim+i*.30,255,true);}
    else if(k==='pigMedic'){
      const t=enemies.find(x=>x!==e&&!x.dead&&!x.miniBoss&&x.hp<x.maxHp&&dist(x,e)<200);if(t){t.hp=Math.min(t.maxHp,t.hp+t.maxHp*.15);particles.push({type:'beam',x:e.x,y:e.y,x2:t.x,y2:t.y,life:.3,maxLife:.3,color:'#baf0ae'});}enemyShot(e.x,e.y,e.aim,180);
    }
  }
  function infectEnemy(e,duration=5,spread=false){
    if(e.dead||e.poison>0)return;e.poison=duration;e.poisonTick=0;e.poisonSpread=.6;
    if(spread)addAchievementProgress('poison_chain');burst(e.x,e.y,'#b4cb63',5,40);
  }
  function launchRats(count,damage,kind='rat',life=2.4){
    for(let i=0;i<count&&ratSwarms.length<60;i++){
      const a=player.angle+(i-(count-1)/2)*.07;ratSwarms.push({x:player.x,y:player.y,a,vx:Math.cos(a)*400,vy:Math.sin(a)*400,life,maxLife:life,age:0,damage,kind,r:8});
    }
  }
  function useNewWeapon(id){
    const sm=player.specialDamage,t=weaponTarget(460);
    if(id==='ratTerror'){launchRats(9+(player.ratKing?2:0),4*sm);tone(260,.2,'square',.06,600);}
    else if(id==='hiveLauncher'){launchRats(12,3*sm,'bee',2.8);}
    else if(id==='singularity'){hazards.push({type:'singularity',x:t.x,y:t.y,r:155,wait:2.8,life:.35,hit:false,friendly:true,damage:32*sm,bossBonus:1});}
    else if(id==='thunderRail'){
      for(const side of [-28,0,28]){const a=player.angle,from={x:player.x-Math.sin(a)*side,y:player.y+Math.cos(a)*side},to={x:from.x+Math.cos(a)*1000,y:from.y+Math.sin(a)*1000};particles.push({type:'beam',x:from.x,y:from.y,x2:to.x,y2:to.y,life:.28,maxLife:.28,color:'#a9deff'});for(const e of combatTargets()){if(segmentDistance(e,from,to)<e.r+9)damageEnemy(e,18*sm,true);if(mode!=='playing')return true;}}
    }else if(id==='iceComet'){
      hazards.push({type:'friendlyMortar',x:t.x,y:t.y,r:145,wait:.6,life:.35,hit:false,friendly:true,damage:38*sm,bossBonus:1,ice:true});
    }else if(id==='orbitSaw'){player.sawTime=3;player.sawCd=0;}
    else return false;
    return true;
  }
  function updateExpansion(dt){
    if(!boss&&minibossPlan&&!minibossPlan.spawned&&waveTime>=minibossPlan.time){minibossPlan.spawned=true;spawnWaveMini(minibossPlan.kind);}
    player.instinctCd=Math.max(0,(player.instinctCd||0)-dt);player.scavengerCd=Math.max(0,(player.scavengerCd||0)-dt);
    const all=combatTargets();
    if(player.nutDropping){player.droppingCd=(player.droppingCd||0)-dt;if(player.droppingCd<=0){player.droppingCd=5.5;if(poisonPatches.length<3)poisonPatches.push({x:rnd(90,W-90),y:rnd(145,H-80),life:12,r:27});}}
    for(const patch of poisonPatches){patch.life-=dt;for(const e of all)if(dist(patch,e)<patch.r+e.r)infectEnemy(e);}
    poisonPatches=poisonPatches.filter(p=>p.life>0);
    for(const e of all){
      if(e.poison>0){e.poison-=dt;e.poisonTick=(e.poisonTick||0)+dt;e.poisonSpread=(e.poisonSpread||0)-dt;
        if(e.poisonTick>=.5-1e-9){e.poisonTick-=.5;damageEnemy(e,.4*Math.sqrt(player.damage));if(mode!=='playing')return;}
        if(e.poisonSpread<=0&&e.poison>1){e.poisonSpread=.6;for(const target of all)if(target!==e&&!target.dead&&dist(e,target)<e.r+target.r+4)infectEnemy(target,Math.min(3.5,e.poison),true);}
      }
    }
    if(player.narrath){
      const desired={x:clamp(player.x-52,35,W-35),y:clamp(player.y-28,120,H-45)};player.profX=(player.profX??desired.x)+(desired.x-(player.profX??desired.x))*Math.min(1,dt*6);player.profY=(player.profY??desired.y)+(desired.y-(player.profY??desired.y))*Math.min(1,dt*6);
      player.narrathCd=(player.narrathCd||0)-dt;const from={x:player.profX,y:player.profY},target=nearestTarget(from,620);
      if(target&&player.narrathCd<=0){player.narrathCd=.2;const a=Math.atan2(target.y-from.y,target.x-from.x);bullets.push({x:from.x,y:from.y,vx:Math.cos(a)*890,vy:Math.sin(a)*890,life:.78,damage:.5*Math.sqrt(player.damage),pierce:0,hitIds:new Set(),r:4,a,narrath:true});}
    }
    if(player.ratKing){player.ratKingCd=(player.ratKingCd??3)-dt;if(player.ratKingCd<=0){player.ratKingCd=9;launchRats(5,1.6*player.specialDamage);}}
    for(const rat of ratSwarms){
      rat.life-=dt;rat.age+=dt;const target=nearestTarget(rat,380);
      if(target&&rat.age>.18){const desired=Math.atan2(target.y-rat.y,target.x-rat.x);rat.a+=clamp(angleDelta(desired,rat.a),-dt*5,dt*5);}
      const from={x:rat.x,y:rat.y};rat.x+=Math.cos(rat.a)*390*dt;rat.y+=Math.sin(rat.a)*390*dt;
      for(const e of all){if(!e.dead&&segmentDistance(e,from,rat)<e.r+rat.r){if(rat.kind!=='chick')e.ratHit=true;damageEnemy(e,rat.damage);rat.life=0;break;}}if(mode!=='playing')return;
    }
    ratSwarms=ratSwarms.filter(r=>r.life>0&&r.x>-30&&r.x<W+30&&r.y>80&&r.y<H+30);
    for(const h of hazards)if(h.type==='singularity'&&h.wait>0)for(const e of all)if(!isBoss(e)&&!e.miniBoss&&dist(h,e)<220){e.x+=(h.x-e.x)*dt*.7;e.y+=(h.y-e.y)*dt*.7;}
    if(player.sawTime>0){player.sawTime-=dt;player.sawCd-=dt;if(player.sawCd<=0){player.sawCd=.45;for(let i=0;i<4;i++){const a=runTime*5+i*TAU/4,pos={x:player.x+Math.cos(a)*94,y:player.y+Math.sin(a)*94};for(const e of all)if(!e.dead&&dist(pos,e)<e.r+19){damageEnemy(e,4*player.specialDamage);if(mode!=='playing')return;}}}}
    if(player.stormOrbit){player.stormCd=(player.stormCd??2)-dt;if(player.stormCd<=0){player.stormCd=6;let removed=0;enemyBullets=enemyBullets.filter(b=>!(dist(b,player)<175&&removed++<6));for(const e of all)if(!e.dead&&dist(e,player)<175+e.r){damageEnemy(e,4*Math.sqrt(player.damage));if(mode!=='playing')return;}burst(player.x,player.y,'#acdeff',20,170);}}
    if(player.scavengerPulse){player.scavengerPulseCd=(player.scavengerPulseCd??18)-dt;if(player.scavengerPulseCd<=0){player.scavengerPulseCd=18;for(const p of pickups){p.x=player.x+rnd(-12,12);p.y=player.y+rnd(-12,12);}floater(player.x,player.y-45,'SCHROTTMAGNET',accent());}}
    // The homing skill bends in-flight nuts; mouse input itself remains manual.
    if(player.homing)for(const b of bullets)if(!b.heavy&&!b.drill&&!b.narrath){const t=nearestTarget(b,170);if(t){const a=Math.atan2(t.y-b.y,t.x-b.x);b.a+=clamp(angleDelta(a,b.a),-dt*1.4,dt*1.4);const v=Math.hypot(b.vx,b.vy);b.vx=Math.cos(b.a)*v;b.vy=Math.sin(b.a)*v;}}
  }
  function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/l,0,1):0;return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);}
  function segmentBox(a,b,c,hx,hy){let lo=0,hi=1;for(const [v,d,min,max] of [[a.x,b.x-a.x,c.x-hx,c.x+hx],[a.y,b.y-a.y,c.y-hy,c.y+hy]]){if(Math.abs(d)<1e-8){if(v<min||v>max)return false;}else{let x=(min-v)/d,y=(max-v)/d;if(x>y)[x,y]=[y,x];lo=Math.max(lo,x);hi=Math.min(hi,y);if(lo>hi)return false;}}return true;}
  function shuffleTotal(){return (player.runShuffle||0)+(player.shuffleBonusBank||0)+(player.waveShuffle||0);}
  function prepareWaveReward(){
    mode='upgrade';resetInput();enemies=[];enemyBullets=[];hazards=[];bullets=[];clearCombatExtras();
    if(player.waveHits===0)addAchievementProgress('clean_wave');if(player.hp>0&&player.hp<=1)addAchievementProgress('close_call');
    if(!player.usedBombThisWave)addAchievementProgress('dry_training');
    if(endlessMode){const survived=wave+1,key=hardMode?'hard':'normal',cleared=survived%5===0?survived-1:survived;if(cleared>(endlessBest[key]||0)){endlessBest[key]=cleared;try{localStorage.setItem('snickers3-endless-best-v1',JSON.stringify(endlessBest));}catch{}}}
    if(hardMode&&!impossibleMode&&!endlessMode&&wave===8&&player.waveHits===0)addAchievementProgress('hard_last_clean');
    if(impossibleMode&&wave===8&&retriesLeft===3)addAchievementProgress('impossible_wave9_clean');
    if(!endlessMode)setAchievementProgress('wave_runner',wave+1);
    if(!endlessMode&&wave===7&&retriesLeft>0)addAchievementProgress('nutty_survivor');
    for(const p of pickups){
      if(p.type==='nut')score+=Math.round(20*(player.powerups.jackpot>0?4:1)*(player.powerups.scoreRush>0?2:1)*runScoreMultiplier());
      else if(p.type==='heart')player.hp=Math.min(player.maxHp,player.hp+1);
      else if(p.type==='power')collectPowerup(p);
      else if(p.type==='ammo')grantSpecialAmmo();
    }
    pickups=[];$('announcement').classList.add('hidden');refillWeaponsAfterWave();if(player.waveRenew)player.hp=Math.min(player.maxHp,Math.round((player.hp+Math.max(3,player.maxHp*.5))*10)/10);
    player.waveShuffle=player.beagle?1:0;activeRewardChoices=rewardChoices();setAchievementProgress('score_hog',score);updateHud();
  }
  function shuffleWaveRewards(){
    if(mode!=='upgrade'||shuffleTotal()<=0||!activeRewardChoices.length)return;
    const old=new Set(activeRewardChoices.map(c=>c.id)),pool=availableRewards().filter(c=>!old.has(c.id));
    if(!pool.length){toast('Du besitzt fast alles; es gibt keine anderen Angebote mehr.');return;}
    if(player.waveShuffle>0)player.waveShuffle--;else if(player.runShuffle>0)player.runShuffle--;else player.shuffleBonusBank--;
    const preferred=rewardChoices().filter(c=>!old.has(c.id)),next=[...preferred];
    for(const c of shuffled(pool))if(next.length<3&&!next.some(v=>v.id===c.id))next.push(c);
    // If fewer than three alternatives exist, preserve a previous card to keep every slot useful.
    for(const c of activeRewardChoices)if(next.length<3&&!next.some(v=>v.id===c.id))next.push(c);
    activeRewardChoices=next.slice(0,3);player.shuffleCount++;setAchievementProgress('shuffle_master',player.shuffleCount);renderWaveReward();tone(530,.2,'triangle',.06,940);
  }
  function renderWaveReward(){
    mode='upgrade';const choices=activeRewardChoices;
    if(!choices.length&&endlessMode){showScoreSkillMenu(continueAfterWave);return;}
    const quote=endlessMode?`Welle ${wave+1}. Unendlich wird langsam persönlich.`:waveQuotes[wave];
    const label=c=>c.legendary?(c.weapon?'LEGENDARY · WAFFE':'LEGENDARY · SKILL'):c.endless?(c.weapon?'ENDLOS · WAFFE':'ENDLOS · SKILL'):c.ngplus2?(c.weapon?'NG+2 · WAFFE':'NG+2 · SKILL'):c.ngplus?(c.weapon?'NG+ · WAFFE':'NG+ · SKILL'):c.weapon?'WAFFE':'SKILL';
    const alternatives=availableRewards().some(c=>!choices.some(o=>o.id===c.id));
    showOverlay(`<span class="eyebrow">${endlessMode?'ENDLOSMODUS':'KAMPAGNE'} · WELLE ${wave+1} GESCHAFFT</span><h2 id="overlayTitle">ZEIT AUFZURÜSTEN.</h2><blockquote class="snickers-quote"><b>SNICKERS</b>„${quote}“</blockquote><p>Alle Waffen sind nachgeladen. Wähle deinen nächsten Baustein oder gönn Snickers eine Verschnaufpause.</p><div class="shuffle-bar"><div><strong>↻ ${shuffleTotal()} SHUFFLE${shuffleTotal()===1?'':'S'}</strong><small>Run: ${player.runShuffle||0} · Extra: ${player.shuffleBonusBank||0} · Beagle: ${player.waveShuffle||0}${player.beagle?' (nur diese Auswahl)':''}</small></div><button class="secondary-button" id="shuffleButton" ${!shuffleTotal()||!alternatives?'disabled':''}>NEU MISCHEN ↻</button></div><div class="upgrades reward-upgrades">${choices.map((c,i)=>`<button class="upgrade ${rarityClass(c)}" id="upgrade${i}" data-skill="${c.id}"><small class="upgrade-kind">${label(c)}</small><span class="upgrade-icon">${c.icon}</span><strong>${c.title}</strong><span>${c.desc}</span><em>AUSWÄHLEN ↗</em></button>`).join('')}<button class="upgrade heal-upgrade" id="healInstead"><small class="upgrade-kind">HEILUNG STATT SKILL</small><span class="upgrade-icon">♥</span><strong>VERSCHNAUFPAUSE</strong><span>Volle Heilung und +1 permanentes Herz (max. 30). Du verzichtest auf einen Skill oder eine Waffe.</span><em>VERSCHNAUFEN ↗</em></button></div><p class="click-note">Auswahl ausschließlich per Mausklick oder Touch.</p>`);
    $('shuffleButton').onclick=shuffleWaveRewards;
    choices.forEach((c,i)=>{$(`upgrade${i}`).onclick=()=>{if(mode!=='upgrade')return;grantReward(c);player.waveShuffle=0;continueAfterWave();tone(630,.25,'triangle',.07,1046);};});
    $('healInstead').onclick=()=>{if(mode!=='upgrade')return;addAchievementProgress('breather');player.maxHp++;normalizeBuild(player);player.hp=player.maxHp;player.waveShuffle=0;updateHud();continueAfterWave();};
  }
  function beginVictory(next){
    if(mode!=='playing')return;mode='victory';resetInput();victoryTime=2.1;victoryAfter=next;enemyBullets=[];hazards=[];bullets=[];ratSwarms=[];thrownWeapons=[];player.moving=false;player.dashTime=0;
    announce(boss?'BOSS GESCHAFFT!':`WELLE ${wave+1} GESCHAFFT!`,'SNICKERS JUBELT!');
    burst(player.x,player.y-20,'#f1d479',48,200);victoryFanfare();
  }
  function victoryFanfare(){
    if(!soundOn||!audioContext)return;
    // Scheduled in the audio clock; no timeout is allowed to advance gameplay.
    for(const [i,freq] of [523.25,659.25,783.99,1046.5].entries()){
      const t=audioContext.currentTime+i*.13,osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type='triangle';osc.frequency.value=freq;gain.gain.setValueAtTime(.0001,t);gain.gain.linearRampToValueAtTime(.075,t+.02);gain.gain.exponentialRampToValueAtTime(.0001,t+.36);osc.connect(gain);gain.connect(audioContext.destination);osc.start(t);osc.stop(t+.38);
    }
  }
  function setAchievementProgress(id,value){const delta=Math.max(0,value-achievementValue(id));if(delta)addAchievementProgress(id,delta);}
  function recordDistinct(id,value){const list=new Set(achievementSets[id]||[]);list.add(value);achievementSets[id]=[...list];setAchievementProgress(id,list.size);achievementDirty=true;}
  function flushAchievements(){if(!achievementDirty)return;try{localStorage.setItem('snickers3-achievements-v4',JSON.stringify(achievementData));localStorage.setItem('snickers3-achievement-sets-v5',JSON.stringify(achievementSets));achievementDirty=false;}catch{}}
  const retiredAchievements={
    intro_story:{id:'dry_training',title:'TROCKENÜBUNG',desc:'Gewinne 3 normale Wellen ohne Nussbombe.',goal:3,kind:'progress'},
    music_rush:{id:'precision_run',title:'MIT RUHIGER PFOTE',desc:'Besiege einen Hauptboss ohne selbst Schaden zu nehmen.',goal:1,kind:'gag'}
  };
  for(let i=0;i<achievements.length;i++)if(retiredAchievements[achievements[i].id])achievements[i]=retiredAchievements[achievements[i].id];
  achievements.push(
    {id:'poison_chain',title:'ANSTECKEND KNACKIG',desc:'Löse 25 Ansteckungen durch Kontakt zwischen vergifteten und gesunden Gegnern aus.',goal:25,kind:'progress'},
    {id:'shuffle_master',title:'MIXTAPE MIT FELL',desc:'Mische die Wellen-Belohnungen 5-mal in einem Run neu.',goal:5,kind:'progress'},
    {id:'professor_kills',title:'DOKTOR DER HASENKUNDE',desc:'Besiege 50 Gegner, die Dr. Narrath getroffen hat.',goal:50,kind:'progress'},
    {id:'rat_kills',title:'RATTENFÄNGER',desc:'Besiege 40 Gegner mit Unterstützung deiner Ratten oder Hummeln.',goal:40,kind:'progress'},
    {id:'mini_collection',title:'FÜNF KLEINE PROBLEME',desc:'Besiege alle 5 verschiedenen Wellen-Minibosse.',goal:5,kind:'progress'}
  );
  const achievementDescriptions={
    wave_runner:'Gewinne alle 9 normalen Kampagnenwellen in einem Durchlauf.',weapon_rack:'Benutze 3 unterschiedliche Spezialwaffen in einem Run.',
    wallpaper:'Besiege General Hasenbein und Cyber-Hasenbein.',full_reload:'Sammle 20 Munitionskisten, die tatsächlich Munition nachladen.',
    boss_breaker:'Besiege General Hasenbein, Cyber-Hasenbein und Karnil.',three_bosses:'Erreiche General Hasenbein, Cyber-Hasenbein und Karnil.',
    power_mix:'Sammle 5 verschiedene Power-up-Arten in einem Run.',power_encyclopedia:'Sammle über alle Runs hinweg alle 14 Power-up-Arten.',
    sniper_nope:'Lass 3 Scharfschützen-Schüsse im Abstand unter 140 Einheiten an dir vorbeifliegen.',mine_sweeper:'Überstehe 5 Sapper-Minen bis zum Ende ihrer Explosion, ohne darin getroffen zu werden.',
    ngplus_all_skills:'Wähle über alle Runs hinweg 8 verschiedene exklusive NG+-Skills.',endless_10:'Erreiche Welle 10 im Endlosmodus.',endless_25:'Erreiche Welle 25 im Endlosmodus.'
  };
  for(const a of achievements)if(achievementDescriptions[a.id])a.desc=achievementDescriptions[a.id];

  function buildStatsMarkup(p,live=false){
    const front=(p.nutstorm?1.9:p.spread?1.56:1)+(p.nutFan?.52:0)+(p.powerups?.doubleShot>0?.96:0);
    const shot=p.damage*(p.powerups?.berserk>0?1.45:1)*(p.powerups?.giantNut>0?1.4:1)*(p.powerups?.overdrive>0?1.55:1)*(p.defianceReactor&&p.hp/p.maxHp<.5?1.2:1)*(p.madelpulator?1.78:1),dps=shot*front/effectiveInterval(p)*(1+(p.crit||0));
    const rows=[[live?'HERZEN':'MAX. HERZEN',live?`${displayNumber(p.hp)} / ${p.maxHp}`:String(p.maxHp),'maximal 30'],['NUSS-SCHADEN',displayNumber(shot),`Basiswert ${displayNumber(p.damage)}${p.madelpulator?' · Madelpulator ×1,78':''} · Start 1,4`],['SALVEN PRO SEKUNDE',displayNumber(1/effectiveInterval(p)),`permanent ${displayNumber(1/p.fireRate)}`],['THEORETISCHER FRONT-DPS',displayNumber(dps),'Alle Frontnüsse treffen; mit Krit, ohne Begleiter/Procs'],['LAUFTEMPO',displayNumber(effectiveSpeed(p)),`permanent ${displayNumber(p.speed)} · Basis 264`],['DASH-COOLDOWN',p.madelpulator?'ENTFÄLLT':displayNumber(effectiveDash(p))+' s',p.madelpulator?'Madelpulator: dauerhaft kein Dash / Dash-Schutz':`bereit in ${displayNumber(p.dashCd||0)} s · 0,42 s Schutz`],['GESAMTSCHADEN',p.madelpulator?'1,78×':'1×','Madelpulator: Nüsse, Waffen, Gift und Begleiter'],['SPEZIALSCHADEN',displayNumber(p.specialDamage*(p.madelpulator?1.78:1))+'×',p.madelpulator?'inklusive Madelpulator; vor Ziel-/Power-up-Boni':'Faktor für Waffen-Basisschaden'],['BOSSSCHADEN',displayNumber(p.bossDamage||1)+'×','auch Minibosse'],['HASENSCHADEN',displayNumber(p.rabbitDamage||1)+'×','auch Hasen-Bosse'],['KRITISCHE TREFFER',displayNumber((p.crit||0)*100)+' %','doppelter Projektilschaden'],['DODGE',displayNumber((p.dodgeChance||0)*100)+' %','pro drohendem Treffer · max. 40 %'],['BLOCKCHANCE',displayNumber((p.damageGuard||0)*100)+' %','separater Wurf nach Dodge · max. 45 %'],['DURCHSCHLAG','+'+(p.pierce||0),'weitere Ziele pro normalem Projektil'],['SAMMELRADIUS',displayNumber(p.magnet),'×2,2 mit Magnet-Möhre'],['POWER-UP-FAKTOR',displayNumber(p.powerLuck)+'×',`Basis 3,5 % · maximal 16 %; Schutz vor langen Pechsträhnen`],['MUNITIONS-FAKTOR',displayNumber(p.ammoDropLuck)+'×','mit begrenzten Drops pro Welle'],['MUNITIONSKISTE',Math.round(Math.min(.85,.5+(p.ammoRefillBonus||0))*100)+' %','Maximalmunition pro Waffe'],['POWER-UP-DAUER',displayNumber(p.powerDuration||1)+'×','Roter Blick bleibt bei 5 s'],['DROP-LEBENSDAUER',(18+(p.pickupLifeBonus||0))+' s','Miniboss-Power-ups: 24 s'],['PUNKTEFAKTOR',displayNumber((p.scoreRushBonus||1)*(p.hardMode?1.55:1))+'×','zusätzlich zu temporären Power-ups'],['SHUFFLES',live?String(shuffleTotal()):String(p.shuffleBonusBank||0),live?`Run ${p.runShuffle||0} · Extra ${p.shuffleBonusBank||0} · Welle ${p.waveShuffle||0}`:'gespeicherte Extra-Ladungen'],['SCHUTZSCHALE',p.shield?(p.shieldReady?'BEREIT':displayNumber(p.shieldCd||0)+' s'):'—','eine Blockade; lädt 15 s'],['EINGEHENDER SCHADEN',live?displayNumber(incomingDamageScale())+'×':'—','Kontakt und Gefahren; auf Zehntelherzen gerundet']];
    return `<div class="build-stat-grid">${rows.map(([name,value,note])=>`<div class="build-stat"><small>${name}</small><strong>${value}</strong><span>${note}</span></div>`).join('')}</div>`;
  }
  function buildDetailsMarkup(p,live=false){
    const skills=Object.keys(p.skills).filter(id=>!allSkillInfo(id)?.weapon),specials=Object.keys(p.specials||{}),powers=Object.entries(p.powerups||{}).filter(([,n])=>n>0);
    return `<nav class="build-nav"><button data-jump="currentStats">WERTE</button><button data-jump="currentWeapons">WAFFEN</button><button data-jump="currentSkills">SKILLS</button><button data-jump="currentPerks">PUNKTE-BONI</button></nav><section class="build-section" id="currentStats"><h3>Deine Werte <span>Temporäre Effekte und permanente Basis getrennt</span></h3>${buildStatsMarkup(p,live)}</section><section class="build-section"><h3>Aktive Power-ups</h3>${powers.length?`<div class="power-detail-list">${powers.map(([id,n])=>`<div><strong>${powerBook[id].icon} ${powerBook[id].name}</strong><span>${n.toFixed(1)} s · ${powerBook[id].desc}</span></div>`).join('')}</div>`:'<p class="build-empty">Zurzeit keine temporären Power-ups.</p>'}${p.snickersBar?`<p class="candy-result"><strong>Dein Snickers Riegel:</strong> ${p.candyBuffs.map(id=>candyBook[id]?.label||id).join(' · ')}</p>`:''}</section><section class="build-section" id="currentWeapons"><h3>Waffen <span>${p.weapons.length} freigeschaltet</span></h3>${buildCards(p.weapons,id=>({...weaponBook[id],desc:weaponBook[id].desc+` Munition: ${live?p.weaponUses[id]+' / ':''}${weaponBook[id].max+p.ammoBonus+(id==='nutBomb'?(p.bombBonus||0):0)}.`}),'weapon')}</section><section class="build-section" id="currentSkills"><h3>Alle gewählten Skills <span>${skills.length}</span></h3>${buildCards(skills,id=>({...allSkillInfo(id),title:allSkillInfo(id)?.title+(p.skills[id]>1?' · '+p.skills[id]+'× gewählt':'')}),'skill')}</section><section class="build-section"><h3>Boss-Upgrades</h3>${buildCards(specials,id=>specialUpgradeBook[id],'special')}</section><section class="build-section" id="currentPerks"><h3>Permanente Punkte-Boni <span>Bereits in deinen Werten enthalten</span></h3><div class="perk-detail-grid">${Object.entries(scoreSkillBook).map(([id,c])=>{const n=p.scorePerks[id]||0;return `<article class="perk-detail ${n?'active':''}"><span>${c.icon}</span><div><strong>${c.title}</strong><small>${n}× gewählt</small></div><b>${n?perkEffect(id,n):'—'}</b></article>`;}).join('')}</div></section>`;
  }
  function bindBuildJumps(){document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>{const panel=$('overlay'),target=$(b.dataset.jump);panel.scrollTop+=target.getBoundingClientRect().top-panel.getBoundingClientRect().top-64;});}
  function showCurrentBuild(){
    if(mode!=='paused')return;mode='build';showOverlay(`<div class="run-detail-header"><span class="eyebrow">PAUSIERT · DEIN AKTUELLER RUN</span><h2 id="overlayTitle">SNICKERS' BUILD</h2><p>Welle ${wave+1} · ${displayNumber(score)} Punkte · ${formatTime(runTime)} · ${retriesLeft} Retries übrig</p></div><button class="secondary-button" id="buildBack">← ZUR PAUSE</button>${buildDetailsMarkup(player,true)}<button class="primary-button" id="buildDone">ZURÜCK ZUR PAUSE ↗</button>`);$('buildBack').onclick=$('buildDone').onclick=()=>{mode='playing';pauseGame();};bindBuildJumps();
  }
  function helpMarkup(){
    return `<section class="build-section"><h3>Steuerung</h3><div class="help-grid"><div class="help-row"><kbd>WASD</kbd><span>Bewegen<small>Auch Pfeiltasten. Diagonale Bewegung ist normalisiert.</small></span></div><div class="help-row"><kbd>MAUS</kbd><span>Manuell zielen<small>Automatisches Feuer in Maus-Richtung. Klick respektiert die Feuerrate.</small></span></div><div class="help-row"><kbd>SPACE</kbd><span>Dash<small>Kurze Unverwundbarkeit, Grund-Cooldown 2,25 s.</small></span></div><div class="help-row"><kbd>E</kbd><span>Spezialwaffe<small>Q/R oder Mausrad wechseln die Waffe. 0,5 s gemeinsamer Waffen-Cooldown.</small></span></div><div class="help-row"><kbd>P / ESC</kbd><span>Pause öffnen<small>Fenster und Auswahl ausschließlich per Maus oder Touch bestätigen.</small></span></div><div class="help-row"><kbd>TOUCH</kbd><span>Automatisch zielen<small>Stick links; rechts Spezialwaffe, Waffenwechsel und Dash. Ein echter Mauszeiger schaltet auf manuelles Zielen um.</small></span></div></div></section><section class="build-section"><h3>Spielmechaniken</h3><div class="mechanics-grid"><article><b>Wellen & Bosse</b><p>Der Timer beendet den Nachschub. Erst wenn alle Gegner besiegt sind, endet die Welle mit Jubel und Fanfare. Bosse warten nach Welle 3, 6 und 9; Endlosmodus: alle 5 Wellen.</p></article><article><b>Build & Versorgung</b><p>Die meisten Skills und alle Waffen nur einmal; ausgewählte Werte-Skills sind bis zur angegebenen Grenze stapelbar. Nach jeder Welle und jedem Boss werden alle Waffen vollständig aufgefüllt. Lose Drops werden am Wellenende eingesammelt. Normale Wellen heilen nur durch Drops, gewählte Skills oder Verschnaufpause.</p></article><article><b>Shuffles</b><p>Einmal pro Run drei neue Angebote. Punkte-Boni geben zusätzliche einmalige Ladungen. Mit Beagle nach jeder gewonnenen Welle ein frischer Wellen-Shuffle; er wird zuerst verbraucht und kann nicht angespart werden. Keine Shuffles bei Boss- oder Punkte-Boni.</p></article><article><b>Minibosse</b><p>Ab Welle 4: 40 % Chance je berechtigter Welle, in NG+ 55 %, in NG+2 60 %. Maximal einer pro Welle, mit einer Welle Abstand. Eigene Vorwarnung und reduzierter normaler Nachschub. Jeder besiegte Wellen-Miniboss garantiert 3 Power-ups.</p></article><article><b>Punkte & Retries</b><p>Ab 50.000 Punkten ein permanenter Bonus. Weitere Schwellen werden teurer. 3 Retries je Run; Munition wird auf den Abschnittsstart zurückgesetzt, Skills und Punkte bleiben. Ein Retry erzeugt keinen Shuffle.</p></article><article><b>Lesbare Gefahren</b><p>Orange markiert feindliche Angriffe; türkis markiert deine Flächenwaffen. Neue Gegner und Sturmangriffe haben Vorwarnungen. Dash, Schutzschale und Nussbombe können dich aus einer Bedrängnis retten.</p></article><article><b>Obergrenzen</b><p>30 Herzen, 30 Basis-Nussschaden, 440 permanentes Tempo, 10 normale Salven/s, 0,85 s minimaler Dash-Cooldown, 40 % Dodge, 45 % Blocken und +12 allgemeine Waffenladungen. Power-ups dürfen Tempo und Feuerrate kurzzeitig weiter erhöhen.</p></article><article><b>Endlosmodus & New Game+</b><p>NG+ und NG+2 übernehmen den Sieger-Build. Der Endlosmodus wird nach NG+2 freigeschaltet und bietet frische oder Hall-of-Fame-Builds. NG+-Belohnungen kommen dort ab Welle 6, NG+2 ab Welle 14; Hall-Builds starten mit erhöhtem Gegnerniveau. Impossible folgt nach Hard NG+2.</p></article><article><b>Skins & Build-Codes</b><p>Skins sind rein optisch. Im Hauptmenü und in der Pause kannst du sie wählen. Builds lassen sich per Code zum Anschauen oder zur Nutzung im passenden freigeschalteten Modus weitergeben.</p></article></div></section><section class="build-section"><h3>Alle 14 Power-ups</h3><div class="pause-power-guide">${Object.values(powerBook).map(p=>`<div class="pause-power-row"><span class="power-guide-icon">${p.icon}</span><span><b>${p.name}</b><small>${p.desc} · ${p.duration} s Basisdauer</small></span></div>`).join('')}</div></section>`;
  }
  function showGuide(fromPause=false){
    if(fromPause?mode!=='paused':mode!=='menu')return;mode=fromPause?'guide':'help';showOverlay(`<span class="eyebrow">${fromPause?'PAUSIERT':'SPIELHANDBUCH'}</span><h2 id="overlayTitle">SO KNACKST DU DEN GARTEN.</h2><button class="secondary-button" id="guideBack">← ZURÜCK</button>${helpMarkup()}<button class="primary-button" id="guideDone">ALLES KLAR ↗</button>`);$('guideBack').onclick=$('guideDone').onclick=()=>{if(fromPause){mode='playing';pauseGame();}else{mode='menu';hideOverlay();}};
  }
  function drawExpansion(){
    for(const p of poisonPatches){ctx.save();ctx.globalAlpha=Math.min(1,p.life/2);ellipse(ctx,p.x,p.y+5,p.r,11,'#82994f55');for(let i=0;i<3;i++)ellipse(ctx,p.x+(i-1)*9,p.y-(i%2)*5,8,6,'#90744c');ctx.restore();}
    for(const e of combatTargets())if(e.poison>0){ctx.strokeStyle='#beda6c';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(e.x,e.y+10,e.r+4,9,0,0,TAU);ctx.stroke();}
    for(const r of ratSwarms){ctx.save();ctx.translate(r.x,r.y);ctx.rotate(r.a);if(r.kind==='chick'){ellipse(ctx,0,0,9,8,'#f6d66f');ellipse(ctx,6,-4,5,5,'#ffe695');path(ctx,[[10,-5],[16,-2],[10,0]],'#de8e43');ellipse(ctx,7,-6,1.5,1.5,'#263b38');}else if(r.kind==='bee'){ellipse(ctx,-1,0,9,6,'#ebcf76');ellipse(ctx,-3,-6,5,4,'#def2eba8');ellipse(ctx,-3,6,5,4,'#def2eba8');}else{ctx.strokeStyle='#d29dab';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-8,0);ctx.quadraticCurveTo(-17,6,-21,1);ctx.stroke();ellipse(ctx,0,0,10,6,'#a69aa6');ellipse(ctx,5,-5,4,4,'#cf9daf');ellipse(ctx,9,0,2,2,'#f2d1c8');}ctx.restore();}
    if(player.narrath){const x=player.profX??player.x-52,y=player.profY??player.y-28;ctx.save();ctx.translate(x,y);ellipse(ctx,0,15,17,5,'#081a1855');ctx.fillStyle='#f4efda';ctx.fillRect(-11,-2,22,23);path(ctx,[[-11,-2],[0,4],[11,-2],[6,23],[-6,23]],'#ecf2e4');ellipse(ctx,0,-12,11,12,'#dfbaa3');for(const xx of [-11,-6,0,6,11])ellipse(ctx,xx,-23,5,5,'#dedee0');ctx.strokeStyle='#2c3d4b';ctx.lineWidth=2;ctx.strokeRect(-9,-16,8,7);ctx.strokeRect(2,-16,8,7);ctx.fillStyle='#647e89';ctx.fillRect(8,3,22,7);ctx.fillStyle='#8ef5f7';ctx.fillRect(27,3,5,7);ctx.restore();}
    if(player.sawTime>0)for(let i=0;i<4;i++){const a=runTime*5+i*TAU/4,x=player.x+Math.cos(a)*94,y=player.y+Math.sin(a)*94;ctx.save();ctx.translate(x,y);ctx.rotate(ambientTime*12);path(ctx,Array.from({length:20},(_,j)=>{const r=j%2?11:17;return [Math.cos(TAU*j/20)*r,Math.sin(TAU*j/20)*r];}),'#d4dce0');ellipse(ctx,0,0,4,4,'#86785c');ctx.restore();}
    if(mode==='victory'&&!player.bossDance){ctx.save();ctx.textAlign='center';ctx.font='bold 32px Arial';ctx.fillStyle='#ffdd85';ctx.fillText('✦  JUHUU!  ✦',player.x,player.y-70);ctx.restore();}
  }
  function drawExtraEnemy(e){
    if(e.troll||e.hardType){drawContentEnemy(e);return;}
    const cfg=e.miniKind?miniBossBook[e.miniKind]:extraEnemyBook[e.type],c=ctx,pig=e.miniKind==='discoBoar'||cfg.species==='pig',rat=cfg.species==='rat';
    c.save();c.translate(e.x,e.y);const s=e.miniKind?1.5:1;c.scale(s,s);if(e.spawnGrace>0)c.globalAlpha=.5+Math.sin(ambientTime*14)*.2;
    ellipse(c,0,15,23,7,'#08152077');ellipse(c,0,1,21,22,e.hit>0?'#fff2d9':cfg.color);
    if(pig){path(c,[[-18,-12],[-23,-27],[-6,-18]],cfg.color);path(c,[[18,-12],[23,-27],[6,-18]],cfg.color);ellipse(c,0,2,11,7,'#e5b6aa');ellipse(c,-4,2,2,2,'#66444d');ellipse(c,4,2,2,2,'#66444d');}
    else if(rat){ellipse(c,-14,-18,9,9,'#b58a9c');ellipse(c,14,-18,9,9,'#b58a9c');c.strokeStyle='#d2a2ac';c.lineWidth=3;c.beginPath();c.moveTo(-18,11);c.quadraticCurveTo(-38,23,-40,7);c.stroke();}
    else if(cfg.species==='moth'){ellipse(c,-22,0,16,23,'#e8d28b');ellipse(c,22,0,16,23,'#e8d28b');}
    else if(cfg.species==='crab'){for(const xx of [-1,1]){c.strokeStyle='#bf955e';c.lineWidth=5;c.beginPath();c.moveTo(xx*15,8);c.lineTo(xx*31,18);c.moveTo(xx*16,-2);c.lineTo(xx*34,-10);c.stroke();}}
    else{ellipse(c,-11,-26,6,17,cfg.color,-.1);ellipse(c,11,-26,6,17,cfg.color,.1);}
    ellipse(c,-7,-8,3,4,'#23333d');ellipse(c,8,-8,3,4,'#23333d');
    c.fillStyle='#23323a';c.fillRect(-17,13,34,8);c.fillStyle=cfg.color;c.font='bold 14px Arial';c.textAlign='center';c.fillText(cfg.icon||({shieldHare:'◇',arcHare:'ϟ',pigMedic:'+',glassHare:'◆',lanternMoth:'✦',clockCrab:'◷',cometRat:'★'}[e.type]||'•'),0,9);
    if(e.shieldTime>0){c.strokeStyle='#a9f1fa';c.lineWidth=4;c.beginPath();c.arc(0,0,28,0,TAU);c.stroke();}c.restore();
    if(e.hp<e.maxHp||e.miniKind){c.fillStyle='#0f2524';c.fillRect(e.x-28,e.y-e.r-30,56,5);c.fillStyle=cfg.color;c.fillRect(e.x-28,e.y-e.r-30,56*Math.max(0,e.hp/e.maxHp),5);}
  }

  function drawNewBoss(e){
    const c=ctx,k=e.endlessKind,col=e.hit>0?'#fff1db':endlessBossBook[k].color;
    c.save();c.translate(e.x,e.y);ellipse(c,0,36,60,17,'#04132388');
    if(k==='ratEmpress'){
      c.strokeStyle='#b47e98';c.lineWidth=9;c.beginPath();c.moveTo(-38,22);c.bezierCurveTo(-95,55,-118,8,-89,-9);c.stroke();
      ellipse(c,0,10,46,48,col);ellipse(c,-28,-33,22,24,col);ellipse(c,28,-33,22,24,col);ellipse(c,-28,-33,13,15,'#e3bac7');ellipse(c,28,-33,13,15,'#e3bac7');
      path(c,[[-30,-47],[-37,-75],[-15,-61],[0,-88],[15,-61],[37,-75],[30,-47]],'#efcd75');ellipse(c,0,6,19,14,'#e2bcc7');ellipse(c,0,-1,7,5,'#683e59');
    }else if(k==='sugarGolem'){
      c.fillStyle=col;c.strokeStyle='#553e43';c.lineWidth=4;c.beginPath();c.roundRect(-48,-44,96,95,16);c.fill();c.stroke();
      for(const side of [-1,1]){ellipse(c,side*59,18,23,31,'#c98f5e');ellipse(c,side*26,48,24,15,'#a96d50');}
      path(c,[[-43,-31],[-20,-48],[0,-35],[25,-51],[44,-30],[39,-7],[16,-15],[-4,-8],[-26,-17],[-39,-3]],'#f1d3a1');
      c.strokeStyle='#82543d';c.lineWidth=4;c.beginPath();c.moveTo(-27,25);c.lineTo(-5,30);c.lineTo(23,20);c.stroke();
    }else{
      ellipse(c,0,8,46,50,col);for(const side of [-1,1]){path(c,[[side*26,-18],[side*88,-7],[side*100,29],[side*63,22],[side*31,39]],'#7389c4');ellipse(c,side*21,-17,23,28,'#d6dbea');}
      path(c,[[-10,-2],[0,19],[10,-2]],'#e7c777');path(c,[[-37,-35],[-44,-66],[-13,-41]],'#899fd9');path(c,[[37,-35],[44,-66],[13,-41]],'#899fd9');
    }
    ellipse(c,-17,-17,6,8,'#23323e');ellipse(c,17,-17,6,8,'#23323e');ellipse(c,-19,-20,2,3,'#fff5d1');ellipse(c,15,-20,2,3,'#fff5d1');c.restore();
  }

  function drawNewGround(c,stage){
    const colors=stage===5?['#172c33','#397878']:stage===6?['#3c2930','#b79062']:['#151d32','#7e91cb'];c.fillStyle=colors[0];c.fillRect(0,0,W,H);
    if(stage===5){for(let y=115;y<H;y+=70){c.fillStyle='#20424a';c.fillRect(0,y,W,18);c.strokeStyle='#57928b44';c.lineWidth=2;c.beginPath();for(let x=0;x<W;x+=15)c.lineTo(x,y+8+Math.sin(x*.03)*3);c.stroke();}for(let x=55;x<W;x+=175){c.fillStyle='#4b5c59';c.fillRect(x,34,75,45);c.fillStyle='#131f26';for(let i=0;i<5;i++)c.fillRect(x+9+i*12,37,5,37);}}
    else if(stage===6){for(let i=0;i<180;i++){const x=sr()*W,y=sr()*H;path(c,[[x,y-5],[x+8,y],[x,y+5],[x-8,y]],i%3?'#cbb88722':'#edb8c329');}for(let x=40;x<W;x+=120){c.fillStyle='#aa6870';c.fillRect(x,24,28,57);c.fillStyle='#d4b79a';for(let y=24;y<80;y+=16)c.fillRect(x,y,28,6);}}
    else{for(let i=0;i<170;i++){const x=sr()*W,y=sr()*H;ellipse(c,x,y,1+sr()*2,1,'#e1e2f759');}for(let x=80;x<W;x+=180){c.strokeStyle='#859be240';c.lineWidth=2;c.beginPath();c.ellipse(x,360,67,170,0,0,TAU);c.stroke();}for(const x of [65,W-65]){ellipse(c,x,55,40,30,'#444a78');ellipse(c,x-8,50,31,24,'#6d74a7');}}
    c.strokeStyle=colors[1];c.lineWidth=3;c.strokeRect(28,100,W-56,H-140);
  }
  function scorePerkAvailable(id){const p=player;return id==='damage'?p.damage<30-.001:id==='heart'?p.maxHp<30:id==='speed'?p.speed<440-.001:id==='dash'?p.dashCooldown>.85+.001:id==='fireRate'?p.fireRate>.10+.0001:id==='powerLuck'?p.powerLuck<4.5-.001:id==='dodge'?p.dodgeChance<.4-.0001:id==='ammo'?p.ammoBonus<12:true;}
  function newEndlessPattern(e,pat,a){
    if(e.endlessKind==='ratEmpress'){
      if(pat===0&&enemies.length<12){for(let i=0;i<3;i++)spawnEnemy('sewerRat');}
      else if(pat===1){e.aim=a;e.windup=.95;}
      else for(let i=-3;i<=3;i++)enemyShot(e.x,e.y,a+i*.19,245,true);
    }else if(e.endlessKind==='sugarGolem'){
      if(pat%2===0)for(let i=0;i<4;i++)hazards.push({type:'rockfall',x:clamp(player.x+(i-1.5)*110,70,W-70),y:clamp(player.y+(i%2)*80,140,H-60),r:66,wait:1.05+i*.17,life:.35,hit:false,damage:2});
      else for(let i=0;i<16;i++)if(i%8!==pat)enemyShot(e.x,e.y,TAU*i/16+pat*.11,220,true);
    }else{
      if(pat===2)for(let i=0;i<5;i++)hazards.push({type:'shock',x:clamp(160+i*240,70,W-70),y:clamp(player.y,140,H-60),r:70,wait:1.15+i*.12,life:.3,hit:false,damage:2});
      else for(let i=-3;i<=3;i++)enemyShot(e.x,e.y,a+i*.22+(pat%2?.1:0),270,true);
    }
  }

  // Game-native canvas art: a moonlit clearing with a warm little hero.
  let seed=74319;const sr=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  const ground=document.createElement('canvas');ground.width=W;ground.height=H;const g=ground.getContext('2d');
  // Thick ink around actors gives the arena a hand-animated 90s cartoon read.
  function cartoonInk(c,width=2.35){if(c!==ctx)return;c.strokeStyle='#2a2230';c.lineWidth=width;c.lineJoin='round';c.lineCap='round';}
  function ellipse(c,x,y,rx,ry,color,rotation=0){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,rotation,0,TAU);c.fill();if(c===ctx){cartoonInk(c);c.stroke();}}
  function path(c,points,color){c.fillStyle=color;c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fill();if(c===ctx){cartoonInk(c);c.stroke();}}
  function makeGround(){
    seed=74319+stageVisual*719;const palette=themes[settings.theme];
    const colors=[palette.ground,['#21434c','#152c39','#101e2a'],['#796044','#51412f','#30291f'],['#52696a','#364b4e','#233437'],['#503853','#322b45','#1c2032']][stageVisual]||palette.ground;
    const grad=g.createRadialGradient(640,350,70,640,350,780);grad.addColorStop(0,colors[0]);grad.addColorStop(.57,colors[1]);grad.addColorStop(1,colors[2]);g.fillStyle=grad;g.fillRect(0,0,W,H);
    const line=(x,y,x2,y2,color,width=1)=>{g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.moveTo(x,y);g.lineTo(x2,y2);g.stroke();};
    if(stageVisual===0){
      // Winding dirt path, flowers, carrot beds and a wooden garden fence.
      g.fillStyle='#8e8a4930';g.beginPath();g.moveTo(410,H);g.bezierCurveTo(410,590,890,490,760,0);g.lineTo(870,0);g.bezierCurveTo(960,440,560,600,560,H);g.fill();
      for(let i=0;i<900;i++){const x=sr()*W,y=sr()*H;line(x,y,x-3,y-5-sr()*5,'#8aaf6230');line(x,y,x+3,y-4,'#122d2680');}
      for(let x=35;x<W;x+=52){g.fillStyle='#536443';g.fillRect(x,71,6,25);g.fillRect(x,683,6,26);g.fillStyle='#384c34';g.fillRect(x,80,52,5);g.fillRect(x,690,52,5);}
      for(let i=0;i<30;i++){const x=45+i*41;ellipse(g,x,44,5,9,'#c48a4c');line(x,39,x-5,25,'#8eb461',2);line(x,39,x+5,26,'#8eb461',2);}
      for(let i=0;i<60;i++){const x=i%2?W-sr()*24:sr()*24,y=sr()*H;ellipse(g,x,y,29,24,palette.plant[0]);ellipse(g,x-5,y-6,20,16,palette.plant[1]);ellipse(g,x-9,y-10,10,7,palette.plant[2]);}
      for(let i=0;i<25;i++){const x=40+sr()*(W-80),y=110+sr()*550;ellipse(g,x,y,3,3,'#e9c87955');ellipse(g,x+4,y-2,2,2,'#e4a6ae60');}
    }else if(stageVisual===1){
      // Metal panels, neon conduits, coolant tanks and computer terminals.
      for(let x=32;x<W;x+=76)for(let y=96;y<H-36;y+=64){g.fillStyle=(x+y)%3?'#27485250':'#40636b38';g.fillRect(x+2,y+2,72,60);g.strokeStyle='#81adba25';g.lineWidth=1;g.strokeRect(x+2,y+2,72,60);ellipse(g,x+8,y+8,1.5,1.5,'#8badad50');}
      for(const y of [91,674]){line(25,y,W-25,y,'#06171e',13);line(25,y,W-25,y,'#55d6de80',3);}
      for(let i=0;i<7;i++){const x=100+i*176;g.fillStyle='#152b36';g.fillRect(x-35,28,95,46);g.strokeStyle='#5b8495';g.strokeRect(x-35,28,95,46);g.fillStyle='#72d9b6aa';g.fillRect(x-26,37,38,24);line(x+19,44,x+47,44,'#7ab7db',3);line(x+19,56,x+42,56,'#4f777f',3);}
      for(const x of [12,W-43])for(let i=0;i<5;i++){const y=153+i*105;g.fillStyle='#15222e';g.fillRect(x,y,30,71);g.fillStyle='#67c9cb55';g.fillRect(x+5,y+7,20,54);ellipse(g,x+15,y+31,7,13,'#cadd8980');line(x+3,y+65,x+27,y+65,'#85b8bf',3);}
      g.strokeStyle='#74dce730';g.lineWidth=5;g.strokeRect(451,253,378,230);line(640,250,640,490,'#74dce724',2);
    }else if(stageVisual===2){
      // Ochre quarry rubble, fractured earth, railway sleepers and mine carts.
      for(let i=0;i<230;i++){const x=sr()*W,y=100+sr()*570;ellipse(g,x,y,2+sr()*8,1+sr()*5,'#d2b47c24');}
      for(let i=0;i<19;i++){const x=50+sr()*1180,y=130+sr()*510;line(x,y,x+30,y+12,'#211d2450',2);line(x+30,y+12,x+46,y+5,'#211d2450',2);line(x+30,y+12,x+37,y+33,'#211d2450',2);}
      for(let t=0;t<=1;t+=.035){const x=68+1140*t,y=653-520*t;line(x-17,y-27,x+17,y+27,'#322b24',8);}
      line(58,633,1198,113,'#a5a29266',5);line(80,675,1220,155,'#a5a29266',5);
      for(let i=0;i<21;i++){const x=sr()*W,y=i%2?685+sr()*30:sr()*76;path(g,[[x-37,y+20],[x-30,y-8],[x,y-23],[x+31,y-8],[x+43,y+20]],'#4d4235');path(g,[[x-30,y-8],[x,y-23],[x+31,y-8],[x+7,y+4]],'#87735a');}
      for(const [x,y] of [[210,65],[1050,690]]){g.fillStyle='#332e2c';g.fillRect(x-46,y-25,90,31);g.strokeStyle='#9b7a50';g.lineWidth=3;g.strokeRect(x-46,y-25,90,31);ellipse(g,x-27,y+9,9,9,'#211f23');ellipse(g,x+25,y+9,9,9,'#211f23');}
    }else if(stageVisual===3){
      // Checkerboard kitchen floor, steel counters, cooking pots and cream spills.
      for(let x=0;x<W;x+=64)for(let y=92;y<H;y+=64){g.fillStyle=((x/64+Math.floor((y-92)/64))%2)?'#acc4be20':'#092b3530';g.fillRect(x+1,y+1,62,62);}
      for(const y of [23,682]){g.fillStyle='#213c40';g.fillRect(20,y,W-40,37);line(20,y,W-20,y,'#a9c5bc',4);for(let x=52;x<W-50;x+=145){g.fillStyle='#587572';g.fillRect(x,y+7,110,24);line(x+42,y+13,x+70,y+13,'#c1cbc0',3);}}
      for(let i=0;i<7;i++){const x=110+i*174;ellipse(g,x,52,33,16,'#152a34');ellipse(g,x,47,28,12,'#bed0c3');ellipse(g,x,47,23,8,'#eee0b3');line(x-39,48,x-27,48,'#b2c5bb',5);line(x+28,48,x+40,48,'#b2c5bb',5);}
      for(let i=0;i<10;i++){const x=80+sr()*1120,y=150+sr()*455;ellipse(g,x,y,18+sr()*30,7+sr()*13,'#e4deac23');ellipse(g,x+32,y+11,8,5,'#e4deac1b');}
      g.strokeStyle='#f7e2ac26';g.lineWidth=3;g.strokeRect(445,280,390,183);g.font='bold 26px Arial';g.fillStyle='#dfdcc525';g.textAlign='center';g.fillText('SAHNEKÜCHE',640,380);
    }else{
      // Violet flagstones, rune circles, crystal clusters and tiny gnome monuments.
      for(let y=95;y<H-30;y+=55)for(let x=20+(y%2)*32;x<W;x+=90){g.strokeStyle='#b7a6c31e';g.lineWidth=2;g.strokeRect(x,y,86,51);}
      for(const radius of [100,162,236]){g.strokeStyle='#b692ee38';g.lineWidth=radius===162?5:2;g.beginPath();g.ellipse(640,370,radius*1.45,radius*.84,0,0,TAU);g.stroke();}
      for(let i=0;i<12;i++){const a=i*TAU/12,x=640+Math.cos(a)*244,y=370+Math.sin(a)*141;g.save();g.translate(x,y);g.rotate(a);g.strokeStyle='#b7a0dc55';g.strokeRect(-4,-8,8,16);g.restore();}
      for(let i=0;i<12;i++){const x=60+i*106,y=i%2?681:62;path(g,[[x-16,y+11],[x-11,y-23],[x,y-39],[x+15,y-16],[x+20,y+12]],'#8773ae');path(g,[[x,y-39],[x+15,y-16],[x+2,y+8]],'#b6a1d0');}
      for(const x of [33,W-33])for(const y of [184,361,551]){ellipse(g,x,y+15,22,13,'#474058');ellipse(g,x,y,13,17,'#d1b49e');path(g,[[x-17,y-8],[x,y-51],[x+17,y-8]],'#a05f81');ellipse(g,x,y+8,12,9,'#c8c0ba');}
    }
    if(stageVisual>=5)drawNewGround(g,stageVisual);
    if(hardMode){
      g.fillStyle=impossibleMode?'#470c1a33':'#73182627';g.fillRect(0,90,W,H-110);
      for(let i=0;i<(impossibleMode?95:72);i++){
        const x=32+sr()*(W-64),y=108+sr()*(H-155),rx=12+sr()*42,ry=5+sr()*16;
        g.fillStyle=i%3?'#551322a8':'#a42a35aa';g.beginPath();g.ellipse(x,y,rx,ry,sr()*.6,0,TAU);g.fill();
        g.strokeStyle='#ee737640';g.lineWidth=1.3;g.beginPath();g.ellipse(x-3,y-2,rx*.65,ry*.57,0,.2,2.6);g.stroke();
        for(let j=0;j<3;j++){g.fillStyle='#a4273a99';g.beginPath();g.arc(x+(sr()-.5)*rx*3,y+(sr()-.5)*ry*5,1+sr()*3,0,TAU);g.fill();}
      }
      if(impossibleMode){
        for(let i=0;i<65;i++){const x=sr()*W,y=106+sr()*565;g.strokeStyle=i%2?'#1d121d':'#b0554366';g.lineWidth=2+sr()*2;g.beginPath();g.moveTo(x-18,y-10);g.lineTo(x,y);g.lineTo(x+sr()*26,y+13);g.stroke();}
        for(let i=0;i<24;i++){const x=sr()*W,y=115+sr()*530;g.fillStyle='#65805d55';g.beginPath();g.arc(x,y,6+sr()*11,0,TAU);g.fill();g.fillStyle='#40353a';g.fillRect(x-2,y-13,4,9);}
      }
    }
    g.fillStyle='#0c182070';g.fillRect(0,0,W,20);g.fillRect(0,H-18,W,18);
  }
  makeGround();
  const fireflies=Array.from({length:25},()=>({x:sr()*W,y:sr()*H,phase:sr()*TAU}));

  function drawHamster(p, alpha=1){
    const c=ctx,bob=mode==='victory'&&!p.bossDance?-Math.abs(Math.sin(victoryTime*9))*16:p.moving?Math.sin(ambientTime*17)*2:Math.sin(ambientTime*3)*.7;
    c.save();c.translate(p.x,p.y);c.globalAlpha=alpha;
    ellipse(c,0,13,23,8,'#051b176b');
    if(p.invuln>0&&Math.floor(ambientTime*14)%2===0&&p.dashTime<=0)c.globalAlpha=alpha*.6;
    if(p.dashTime>0||p.shieldReady){c.strokeStyle=accent();c.lineWidth=p.shieldReady?2.5:2;c.setLineDash(p.shieldReady?[9,4]:[]);c.beginPath();c.arc(0,0,31,0,TAU);c.stroke();c.setLineDash([]);}
    if(p.sniebelPlate){
      c.save();const bx=-Math.cos(p.angle)*16,by=-Math.sin(p.angle)*16+4;c.translate(bx,by);c.rotate(p.angle);c.fillStyle='#bda56f';c.strokeStyle='#5c4c32';c.lineWidth=2;c.beginPath();c.roundRect(-12,-15,24,30,4);c.fill();c.stroke();c.strokeStyle='#806c48';c.lineWidth=1;c.beginPath();c.moveTo(-8,-8);c.lineTo(8,-8);c.moveTo(-8,0);c.lineTo(8,0);c.moveTo(-8,8);c.lineTo(8,8);c.stroke();c.restore();
    }
    c.translate(0,bob);c.scale(p.face,1);
    ellipse(c,-9,14,9,5,'#965e35');ellipse(c,10,14,9,5,'#965e35');
    ellipse(c,0,1,19,19,'#9c5d31');ellipse(c,-2,-1,18,18,'#ce8f43');ellipse(c,0,7,12,10,'#edd19b');
    ellipse(c,-11,-17,9,9,'#b4773b');ellipse(c,10,-17,9,9,'#c98c46');ellipse(c,-11,-17,5,5,'#e1aa71');ellipse(c,10,-17,5,5,'#e9b976');
    ellipse(c,0,-5,19,17,'#dfa24f');ellipse(c,-8,-1,10,10,'#f3d3a0');ellipse(c,9,-1,10,10,'#f3d3a0');
    ellipse(c,-7,-8,3,4,'#1b2820');ellipse(c,8,-8,3,4,'#1b2820');ellipse(c,-7.8,-9.5,1.1,1.2,'#fff3cc');ellipse(c,7,-9.5,1.1,1.2,'#fff3cc');
    ellipse(c,1,-1,3,2,'#986149');c.strokeStyle='#986149';c.lineWidth=1;c.beginPath();c.moveTo(1,1);c.lineTo(1,4);c.stroke();
    path(c,[[-14,6],[15,6],[14,12],[-13,11]],'#c84738');path(c,[[-12,8],[-29,5+Math.sin(ambientTime*10)*3],[-24,15],[-11,13]],'#d4543a');
    c.restore();
    // The peanut blaster rotates independently from the hamster.
    c.save();c.translate(p.x,p.y+5+bob);c.rotate(p.angle);c.globalAlpha=alpha;
    c.fillStyle='#18342b';c.fillRect(6,-6,27,12);c.fillStyle='#a1b985';c.fillRect(12,-5,14,8);c.fillStyle='#ddb560';c.fillRect(24,-3,11,6);c.fillStyle='#d2f482';c.fillRect(33,-4,4,8);ellipse(c,8,5,5,4,'#dca04d');c.restore();
    if(p.invuln>1.2){c.save();c.strokeStyle='#d4f89955';c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,33,0,TAU);c.stroke();c.restore();}
  }
  function drawRabbit(e){
    if(e.pafti){drawPaftiBoss(e);return;}
    if(e.endlessBoss&&['ratEmpress','sugarGolem','starOwl'].includes(e.endlessKind)){drawNewBoss(e);return;}
    if(e.miniKind||e.variant||e.troll||e.hardType){drawExtraEnemy(e);return;}
    const c=ctx,isBoss=e.type==='boss',pig=e.type.startsWith('pig')||e.type==='gnomePig'||Boolean(e.ottah),zombie=e.type==='zombieBoss';
    const factor=e.ottah?3.15:e.karnil?3.25:e.endlessBoss?2.75:isBoss?(e.cyber?2.7:2.4):e.type==='brute'?1.4:e.type==='gatling'?1.2:e.type==='splitter'?1.15:e.type==='sniper'?1.1:e.type==='sapper'?1.08:e.type==='pigRammer'?1.18:e.type==='pigMortar'?1.08:e.type==='pigCannon'?1.22:e.type==='pigHowler'?1.28:e.type==='pigDrone'?.9:e.type==='pigJuggernaut'?1.5:e.type==='gnomePig'?1.32:e.type==='voidBunny'?1.22:e.type==='burrowBunny'?1.12:e.type==='stormBunny'?1.18:e.type==='rocketHare'?1.16:e.type==='runner'?.83:zombie?1.42:1;
    const bob=Math.sin(e.phase)*2.5,face=player&&player.x<e.x?-1:1;
    c.save();c.translate(e.x,e.y);ellipse(c,0,12*factor,21*factor,7*factor,'#051b1777');c.scale(factor*face,factor);c.translate(0,bob);
    const pigFur=e.type==='pigRammer'?'#c87363':e.type==='pigMortar'?'#c99270':e.type==='pigCannon'?'#ba7f78':e.type==='pigHowler'?'#b87879':e.type==='pigDrone'?'#c99181':e.type==='pigJuggernaut'?'#9c6762':'#d08a71';
    const pigDark=e.type==='pigRammer'?'#7f4747':e.type==='pigMortar'?'#80604d':e.type==='pigCannon'?'#72515b':e.type==='pigHowler'?'#744657':e.type==='pigDrone'?'#6d5a61':e.type==='pigJuggernaut'?'#493c43':'#8e5b59';
    const fur=e.hit>0?'#ffffff':e.ottah?'#9b6659':e.endlessBoss?(endlessBossBook[e.endlessKind]?.color||'#8b806e'):e.karnil?'#756762':e.cyber?'#859ba5':pig?pigFur:zombie?'#849278':e.type==='rabid'?'#d39676':e.type==='gatling'?'#87a192':e.type==='sniper'?'#8ba5b6':e.type==='sapper'?'#a68f73':e.type==='voidBunny'?'#7f69a8':e.type==='burrowBunny'?'#8f7457':e.type==='stormBunny'?'#7294b7':e.type==='rocketHare'?'#b28b66':e.type==='splitter'?'#b49ac1':e.type==='runner'?'#c0bfb0':e.type==='gunner'?'#91ada0':'#d6d7bc';
    const dark=e.hit>0?'#efffcf':e.ottah?'#5f3c38':e.endlessBoss?'#433c42':e.karnil?'#514449':pig?pigDark:zombie?'#4e6352':'#8e9f8c';
    ellipse(c,-9,13,8,5,dark);ellipse(c,10,13,8,5,dark);ellipse(c,0,2,18,19,dark);ellipse(c,-1,-1,17,18,fur);
    if(pig||e.karnil){
      path(c,[[-15,-17],[-13,-29],[-3,-23],[-5,-12]],e.karnil?'#665858':'#a96462');path(c,[[-12,-19],[-11,-25],[-6,-22],[-6,-16]],e.karnil?'#927b73':'#efb1a0');
      path(c,[[7,-15],[14,-27],[19,-20],[14,-10]],e.karnil?'#665858':'#a96462');path(c,[[11,-17],[14,-23],[17,-20],[14,-14]],e.karnil?'#927b73':'#efb1a0');
    }else{
      ellipse(c,-9,-25,5,16,fur,-.18);ellipse(c,9,-27,5,18,fur,.14);ellipse(c,-9,-25,2,11,zombie?'#65765f':'#b98f7c',-.18);ellipse(c,9,-27,2,12,zombie?'#65765f':'#b98f7c',.14);
      if(zombie){path(c,[[-13,-34],[-6,-44],[-4,-29]],'#6f7d67');path(c,[[6,-38],[13,-47],[12,-28]],'#51614f');}
    }
    ellipse(c,1,-8,16,14,fur);ellipse(c,7,-2,10,7,'#eaead0');
    if(isBoss){
      if(e.ottah){
        // Ottah: broad warthog silhouette, huge tusks and a ridiculous cream-cook crown.
        path(c,[[-34,-15],[-25,-38],[-6,-45],[17,-40],[36,-20],[38,9],[22,31],[-20,30],[-39,8]],'#6f4943');
        path(c,[[-30,-17],[-13,-35],[13,-34],[30,-15],[21,3],[-2,-2],[-22,3]],'#a16b5d');
        ellipse(c,8,-10,19,13,'#c78773');ellipse(c,1,-8,4,4,'#3e292a');ellipse(c,15,-8,4,4,'#3e292a');
        path(c,[[-10,0],[-29,15],[-35,9],[-16,-5]],'#f2e1b6');path(c,[[19,-1],[39,12],[34,19],[12,5]],'#f2e1b6');
        c.strokeStyle='#3d292d';c.lineWidth=3;c.beginPath();c.moveTo(-24,-10);c.lineTo(-8,-6);c.moveTo(12,-6);c.lineTo(29,-11);c.stroke();
        path(c,[[-16,-42],[0,-62],[17,-42]],e.ottahPhase===3?'#fff0ad':'#d8b45d');ellipse(c,0,-61,5,5,'#fff5d0');
        if(e.ottahPhase>=2){c.strokeStyle=e.ottahPhase===3?'#fff1ad':'#e38c66';c.lineWidth=3;c.beginPath();c.arc(0,0,46+Math.sin(ambientTime*7)*3,0,TAU);c.stroke();}
        if(e.ottahPhase===3){for(let i=0;i<4;i++)ellipse(c,-24+i*16,-36-Math.sin(ambientTime*5+i)*4,3,7,'#fff4cc99');}
      }else if(e.endlessBoss){
        const k=e.endlessKind;
        path(c,[[-28,-17],[-20,-37],[0,-44],[22,-34],[31,-13],[27,21],[0,31],[-27,20]],k==='gnomeOverlord'?'#7c4b45':k==='moleMarshal'?'#62564e':k==='carrotTitan'?'#8b6544':'#59605b');
        ellipse(c,0,-7,17,13,endlessBossBook[k]?.color||'#a98f70');
        if(k==='carrotTitan'){path(c,[[-12,-39],[0,-65],[12,-39]],'#e98b40');c.strokeStyle='#76a85b';c.lineWidth=4;for(let i=-1;i<=1;i++){c.beginPath();c.moveTo(i*6,-60);c.lineTo(i*13,-78);c.stroke();}}
        if(k==='moleMarshal'){c.fillStyle='#27242a';c.fillRect(-28,-25,56,8);ellipse(c,-10,-8,3,3,'#ffb166');ellipse(c,10,-8,3,3,'#ffb166');}
        if(k==='gnomeOverlord'){path(c,[[-25,-35],[0,-76],[25,-35]],'#d9574c');ellipse(c,0,-76,6,6,'#efe1bd');}
        if(k==='quarryBoar'){path(c,[[-14,1],[-31,13],[-35,7],[-18,-4]],'#efe0bd');path(c,[[16,0],[34,11],[30,17],[10,4]],'#efe0bd');}
        c.strokeStyle='#c7f36b88';c.lineWidth=2;c.beginPath();c.arc(0,0,43+Math.sin(ambientTime*6)*3,0,TAU);c.stroke();
      }else if(e.karnil){
        // Karnil: a hulking quarry boar built from broken masonry, iron and living cracks.
        const crack=e.phaseThree?'#70e7ff':e.phaseTwo?'#ff8d4f':'#3a3034',glow=e.phaseThree?'#9cf5ff':e.phaseTwo?'#ffb15c':'#8b776d';
        path(c,[[-31,-11],[-21,-36],[-7,-44],[12,-41],[33,-25],[37,2],[24,27],[-17,27],[-37,9]],'#554d4b');
        path(c,[[-27,-19],[-8,-36],[12,-32],[29,-16],[20,1],[-4,-3],[-18,-7]],'#80716c');
        path(c,[[-25,7],[-8,0],[10,5],[25,18],[8,29],[-20,21]],'#956d5e');
        path(c,[[-7,-41],[3,-51],[15,-42],[9,-33]],'#6f625d');path(c,[[17,-35],[31,-40],[34,-27],[24,-21]],'#71615c');
        ellipse(c,9,-12,17,11,'#d28a72');ellipse(c,13,-12,5,4,e.phaseTwo?'#ff6a48':'#442c35');ellipse(c,22,-12,5,4,e.phaseTwo?'#ff6a48':'#442c35');
        c.fillStyle='#2b252b';c.fillRect(10,-14,4,4);c.fillRect(20,-14,4,4);
        // Huge broken tusks make the silhouette much clearer.
        path(c,[[-9,3],[-20,12],[-26,8],[-14,-1]],'#f0dfba');path(c,[[18,2],[32,9],[28,15],[14,5]],'#f0dfba');
        c.strokeStyle='#272329';c.lineWidth=3;c.beginPath();c.moveTo(-25,-4);c.lineTo(-10,-2);c.moveTo(13,-3);c.lineTo(28,-6);c.stroke();
        c.strokeStyle='#c5baa8';c.lineWidth=3;c.beginPath();c.moveTo(-29,-31);c.lineTo(-40,-47);c.moveTo(-31,-35);c.lineTo(-17,-51);c.moveTo(28,-27);c.lineTo(38,-41);c.stroke();
        c.strokeStyle='#3d3538';c.lineWidth=2;c.beginPath();c.moveTo(-20,-25);c.lineTo(-7,-12);c.lineTo(-13,7);c.moveTo(21,-28);c.lineTo(10,-9);c.lineTo(17,13);c.moveTo(-7,-34);c.lineTo(3,-21);c.lineTo(0,-7);c.stroke();
        c.strokeStyle=crack;c.lineWidth=e.phaseTwo?3:1.8;c.beginPath();c.moveTo(-10,-18);c.lineTo(-3,-10);c.lineTo(-7,-1);c.lineTo(3,6);c.moveTo(13,-28);c.lineTo(8,-18);c.lineTo(15,-10);c.lineTo(9,2);c.moveTo(-17,12);c.lineTo(-6,15);c.lineTo(-1,24);c.stroke();
        ellipse(c,0,4,e.phaseTwo?6:4,e.phaseTwo?6:4,glow);ellipse(c,0,4,2,2,'#fff2bd');
        c.fillStyle='#e8d2aa';c.fillRect(-11,18,5,10);c.fillRect(-3,19,5,9);c.fillStyle='#42383b';c.fillRect(-17,15,7,5);c.fillRect(4,16,9,5);
        if(e.phaseTwo){c.strokeStyle=e.phaseThree?'#78eaff':'#ff8964';c.lineWidth=3;c.beginPath();c.arc(0,0,46+Math.sin(ambientTime*7)*2,0,TAU);c.stroke();for(let i=0;i<3;i++)ellipse(c,-18+i*18,-42-Math.sin(ambientTime*4+i)*4,2.5,5,'#ff9b5a88');}
      }else if(e.cyber){
        path(c,[[-17,-15],[16,-16],[18,-1],[-15,0]],'#283c4a');c.fillStyle='#9feaff';c.fillRect(-12,-11,24,3);ellipse(c,11,-10,4,4,'#ff796b');
        path(c,[[-9,-21],[-14,-39],[-8,-43],[-4,-21]],'#607b87');path(c,[[5,-23],[8,-45],[14,-42],[12,-23]],'#7895a0');
        c.fillStyle='#273d47';c.fillRect(-16,1,32,12);ellipse(c,1,5,5,5,e.enraged?'#ff715f':'#a6f2ff');ellipse(c,1,5,2,2,'#fff5dc');
        for(let i=0;i<3;i++){c.fillStyle='#506775';c.fillRect(13+i*3,3,3,20);c.fillStyle='#c1d8df';c.fillRect(13+i*3,19,2,4);}
        c.strokeStyle='#8be9ff';c.lineWidth=1;c.beginPath();c.moveTo(-14,0);c.lineTo(-18,6);c.lineTo(-14,11);c.stroke();
      }else{
        path(c,[[-19,-18],[-15,-27],[13,-27],[20,-18]],'#45513f');c.fillStyle='#798269';c.fillRect(-20,-19,42,5);c.fillStyle='#dcb972';c.fillRect(-3,-25,6,5);
        path(c,[[5,-13],[16,-13],[16,-4],[5,-4]],'#29352a');ellipse(c,-5,-8,3,3,'#ba5539');
      }
      path(c,[[-12,-16],[-2,-19],[2,-12],[-10,-10]],e.ottah?'#6c4841':e.endlessBoss?'#4d4a50':e.cyber?'#435864':e.karnil?'#58494a':'#435549');
      c.fillStyle='#e9e3b7';c.fillRect(4,2,3,6);c.fillRect(8,2,3,6);
      c.strokeStyle='#9aa999';c.lineWidth=3;c.beginPath();c.moveTo(13,6);c.lineTo(22,11);c.lineTo(20,19);c.stroke();
    }else{
      if(pig){
        ellipse(c,-7,-9,3,3,'#3b2830');ellipse(c,9,-9,3,3,'#3b2830');ellipse(c,-6.3,-10,1,1,'#fff0d5');ellipse(c,8.3,-10,1,1,'#fff0d5');
        ellipse(c,5,1,11,8,'#e6ae88');ellipse(c,1,-1,3,3,'#492c36');ellipse(c,9,-1,3,3,'#492c36');
        path(c,[[-7,3],[-13,9],[-8,10],[-2,5]],'#f2e2bd');path(c,[[15,3],[22,8],[17,11],[11,5]],'#f2e2bd');
        c.strokeStyle='#6b4140';c.lineWidth=2;c.beginPath();c.moveTo(-5,7);c.lineTo(1,11);c.lineTo(8,7);c.stroke();
        path(c,[[-15,4],[-17,12],[-9,14]],pigDark);path(c,[[13,4],[18,10],[11,14]],pigDark);c.fillStyle='#43363b';c.fillRect(-14,11,8,5);c.fillRect(8,11,8,5);
        if(e.type==='pigRammer'){path(c,[[-18,-18],[18,-20],[20,-10],[-17,-8]],'#5a4d48');path(c,[[10,5],[38,-2],[35,11],[10,13]],'#755747');c.fillStyle='#efb47e';c.fillRect(28,2,10,5);c.fillStyle='#fff0c1';c.fillRect(34,-1,5,5);}
        if(e.type==='pigMortar'){c.fillStyle='#4c4a43';c.fillRect(-19,-25,20,13);c.fillStyle='#d1a25e';c.fillRect(-16,-31,6,8);path(c,[[4,-2],[27,-24],[32,-18],[10,5]],'#5b5247');ellipse(c,30,-21,6,6,'#b87c53');c.fillStyle='#2d2d2b';c.fillRect(-20,3,7,15);}
        if(e.type==='pigCannon'){c.fillStyle='#4e4b4e';c.fillRect(-17,-22,26,11);path(c,[[7,-12],[39,-19],[42,-7],[9,-3]],'#6f6470');ellipse(c,40,-13,7,7,e.burstLeft>0?'#ffbb69':'#d68f64');c.fillStyle='#313039';c.fillRect(-19,2,8,14);}
        if(e.type==='pigHowler'){c.strokeStyle='#f3c079';c.lineWidth=3;c.beginPath();c.arc(0,0,25+(e.howlCd<.5?8:0),0,TAU);c.stroke();c.fillStyle='#5f3e4a';c.fillRect(-21,-24,42,8);ellipse(c,-14,-20,5,5,'#d79b6a');ellipse(c,14,-20,5,5,'#d79b6a');}
        if(e.type==='pigDrone'){c.strokeStyle='#7bc4cb';c.lineWidth=3;c.beginPath();c.moveTo(-20,-20);c.lineTo(22,-20);c.moveTo(-14,-24);c.lineTo(-20,-32);c.moveTo(15,-24);c.lineTo(21,-32);c.stroke();ellipse(c,-20,-33,5,5,'#e7cb65');ellipse(c,21,-33,5,5,'#e7cb65');c.strokeStyle='#d8edf1';c.lineWidth=2;c.beginPath();c.moveTo(-31,-33);c.lineTo(-9,-33);c.moveTo(10,-33);c.lineTo(32,-33);c.stroke();}
        if(e.type==='pigJuggernaut'){path(c,[[-22,-22],[21,-22],[25,-8],[-21,-7]],'#343740');c.fillStyle='#777d84';c.fillRect(-18,-19,34,7);path(c,[[8,2],[34,-2],[39,8],[11,13]],'#4b4e57');c.strokeStyle='#e68b55';c.lineWidth=3;c.beginPath();c.arc(0,1,29,0,TAU);c.stroke();}
        if(e.type==='gnomePig'){path(c,[[-20,-21],[0,-46],[20,-21]],'#d85b4b');ellipse(c,0,-45,5,5,'#f0e1b4');c.fillStyle='#476b4d';c.fillRect(-18,-14,36,7);path(c,[[8,2],[31,-13],[36,-6],[13,10]],'#6c6259');}
      }else if(zombie){
        ellipse(c,-5,-10,3.2,3.2,'#e2c96b');ellipse(c,9,-10,3.2,3.2,'#e2c96b');ellipse(c,-5,-10,1.2,1.2,'#302a25');ellipse(c,9,-10,1.2,1.2,'#302a25');
        path(c,[[-18,-17],[-7,-24],[12,-23],[20,-15],[13,-11],[-13,-10]],'#465447');c.fillStyle='#8a7a54';c.fillRect(-18,-17,38,4);
        c.strokeStyle='#d06c6a';c.lineWidth=2;c.beginPath();c.moveTo(-8,4);c.lineTo(-1,8);c.lineTo(8,5);c.stroke();c.fillStyle='#e5dcc1';c.fillRect(-2,5,4,7);c.fillRect(4,5,4,7);
        path(c,[[-16,4],[-24,11],[-16,14]],'#a5b28d');path(c,[[13,4],[23,8],[16,14]],'#a5b28d');
        if(e.miniBoss){c.strokeStyle=e.cyberMini?'#79eaff':'#9ece72';c.lineWidth=2.5;c.beginPath();c.arc(0,0,25+Math.sin(ambientTime*8)*2,0,TAU);c.stroke();if(e.cyberMini){c.fillStyle='#315267';c.fillRect(-18,-22,36,7);c.fillStyle='#8cecff';c.fillRect(-12,-19,24,2);ellipse(c,13,-10,3,3,'#ff6d65');}}
      }else{
        ellipse(c,-5,-10,2.5,3,'#c54e38');ellipse(c,9,-10,2.5,3,'#c54e38');
        c.strokeStyle='#475641';c.lineWidth=2;c.beginPath();c.moveTo(-9,-14);c.lineTo(-2,-12);c.moveTo(6,-12);c.lineTo(13,-14);c.stroke();
        if(e.type==='brute'){path(c,[[-20,-10],[-18,-21],[10,-24],[20,-17],[20,-10]],'#536550');c.fillStyle='#85906a';c.fillRect(-18,-12,37,4);}
        if(e.type==='gunner'){c.fillStyle='#436047';c.fillRect(-15,-21,29,10);c.fillStyle='#627e55';c.fillRect(-19,-13,39,5);path(c,[[10,1],[34,-2],[30,9],[10,9]],'#dd9144');c.fillStyle='#82a34e';c.fillRect(29,-1,9,4);}
        if(e.type==='runner'){path(c,[[-14,-13],[14,-13],[14,-8],[-14,-8]],'#a05c43');ellipse(c,-5,-10,2,2,'#ffe2aa');ellipse(c,9,-10,2,2,'#ffe2aa');}
        if(e.type==='rabid'){
          path(c,[[-16,-14],[-9,-18],[-7,-12]],'#703a2f');ellipse(c,-5,-10,3,3,'#ff6045');ellipse(c,9,-10,3,3,'#ff6045');
          for(let i=0;i<5;i++)ellipse(c,4+i*2,4+(i%2)*3,2.4,2.4,'#f2f4e8');
          path(c,[[-11,7],[-20,13],[-14,13],[-21,18],[-8,12]],'#a53b33');
        }
        if(e.type==='gatling'){
          c.fillStyle='#3e574a';c.fillRect(-19,-17,34,7);c.fillStyle='#202e29';c.fillRect(-18,0,31,11);c.fillStyle='#b88747';c.fillRect(-17,3,28,3);
          ellipse(c,15,5,8,10,'#57655b');for(let i=0;i<3;i++){c.fillStyle='#354946';c.fillRect(13,-3+i*5,25,4);c.fillStyle=e.burstLeft>0?'#ffaf60':'#a7bba5';c.fillRect(34,-3+i*5,5,4);}
        }
        if(e.type==='sniper'){c.fillStyle='#3f5364';c.fillRect(-13,-22,27,9);path(c,[[7,-14],[36,-30],[39,-24],[10,-8]],'#607f92');c.strokeStyle=e.windup>0?'#ff9e6d':'#b4c9d2';c.lineWidth=2;c.beginPath();c.moveTo(31,-28);c.lineTo(40,-28);c.stroke();}
        if(e.type==='sapper'){c.fillStyle='#594b3c';c.fillRect(-17,-18,25,11);c.fillStyle='#e1b15c';c.fillRect(-11,-26,7,9);c.strokeStyle='#f3b36a';c.lineWidth=2;c.beginPath();c.arc(15,3,8,0,TAU);c.stroke();}
        if(e.type==='voidBunny'){c.strokeStyle='#c59cff';c.lineWidth=2;c.beginPath();c.arc(0,-2,27+Math.sin(ambientTime*6)*3,0,TAU);c.stroke();ellipse(c,-6,-10,3,3,'#d9b1ff');ellipse(c,9,-10,3,3,'#d9b1ff');for(let i=0;i<3;i++)ellipse(c,Math.cos(ambientTime*2+i*2.1)*24,Math.sin(ambientTime*2+i*2.1)*15,3,3,'#9a6de0');}
        if(e.type==='rocketHare'){c.fillStyle='#574b3e';c.fillRect(-17,-23,31,10);path(c,[[7,-9],[35,-17],[40,-9],[12,1]],'#8b6b4d');ellipse(c,38,-13,6,6,e.rocketCd<.5?'#ffb14e':'#c87948');c.fillStyle='#e4ba68';c.fillRect(-8,-29,6,8);}
        if(e.type==='burrowBunny'){c.fillStyle='#5e4936';c.fillRect(-18,-22,36,7);ellipse(c,0,14,25,6,'#4a372a');c.strokeStyle='#c5a16d';c.lineWidth=2;c.beginPath();c.arc(0,0,27,0,TAU);c.stroke();}
        if(e.type==='stormBunny'){c.strokeStyle='#79bfff';c.lineWidth=3;c.beginPath();c.arc(0,-2,28+Math.sin(ambientTime*8)*3,0,TAU);c.stroke();c.fillStyle='#d5ecff';c.fillRect(-14,-24,28,5);}
        if(e.type==='splitter'){
          c.strokeStyle='#e0b2ef';c.lineWidth=2;c.beginPath();c.moveTo(-11,-2);c.lineTo(-3,2);c.lineTo(-9,8);c.lineTo(2,13);c.stroke();
          ellipse(c,-18,2,7,10,'#724683');ellipse(c,-18,2,3,6,'#ddb1ee');
        }
      }
    }
    ellipse(c,7,-3,2.2,1.5,'#866e5b');c.restore();
    if(e.slow>0){c.save();c.strokeStyle='#9fe6ff';c.lineWidth=2;c.setLineDash([4,4]);c.beginPath();c.ellipse(e.x,e.y+8,e.r+5,10,0,0,TAU);c.stroke();c.restore();}
    if(!isBoss&&e.hp<e.maxHp){c.fillStyle='#0b1b16';c.fillRect(e.x-18,e.y-50*factor,36,4);c.fillStyle='#c4e087';c.fillRect(e.x-18,e.y-50*factor,36*e.hp/e.maxHp,4);}
  }
  function drawPickup(p){
    const c=ctx,y=p.y+Math.sin(p.phase)*3;c.save();c.translate(p.x,y);c.globalAlpha=p.life<3?.5+Math.sin(ambientTime*12)*.4:1;
    ellipse(c,0,6,10,4,'#0a251955');
    if(p.type==='heart'){
      c.shadowBlur=12;c.shadowColor='#b9f886';c.fillStyle='#c7f36b';c.beginPath();c.moveTo(0,7);c.bezierCurveTo(-18,-3,-6,-16,0,-6);c.bezierCurveTo(6,-16,18,-3,0,7);c.fill();
    } else if(p.type==='power'){
      const power=powerBook[p.power]||powerBook.haste;c.rotate(ambientTime*.8);c.shadowBlur=14;c.shadowColor=accent();path(c,[[-11,0],[0,-12],[11,0],[0,12]],accent()+'d9');c.rotate(-ambientTime*.8);c.fillStyle='#222033';c.font='bold 13px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText(power.icon,0,1);
    } else if(p.type==='ammo'){
      c.shadowBlur=13;c.shadowColor='#f3d06b';path(c,[[-12,-9],[11,-9],[11,9],[-12,9]],'#6d5b38');path(c,[[-8,-13],[7,-13],[11,-9],[-12,-9]],'#d5b45f');c.fillStyle='#fff1b4';c.font='bold 16px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText('⊕',0,1);
    } else {
      c.rotate(-.4);ellipse(c,0,-3,5,7,'#b58243');ellipse(c,0,4,5,7,'#d8b76b');ellipse(c,-1,-3,2,5,'#efce80');c.strokeStyle='#846233';c.lineWidth=1;c.beginPath();c.moveTo(-4,0);c.lineTo(4,0);c.stroke();
    }c.restore();
  }
  function render(dt){
    const px=player?.x??W/2,py=player?.y??H/2;
    camX=clamp(px-viewW/2,0,Math.max(0,W-viewW));camY=clamp(py-viewH/2,0,Math.max(0,H-viewH));
    ctx.setTransform(dpr*scale,0,0,dpr*scale,-camX*dpr*scale,-camY*dpr*scale);
    if(shake>.1&&!reducedMotion)ctx.translate(rnd(-shake,shake),rnd(-shake,shake));
    ctx.drawImage(ground,0,0);
    for(const f of fireflies){const pulse=.25+Math.sin(ambientTime*1.7+f.phase)*.2;ctx.globalAlpha=pulse;ellipse(ctx,f.x+Math.sin(ambientTime*.5+f.phase)*12,f.y+Math.cos(ambientTime*.7+f.phase)*9,2,2,'#d2f384');}ctx.globalAlpha=1;
    if(!player||mode==='menu'||mode==='help'||(mode==='settings'&&settingsReturn==='menu'))return;
    if(mode==='victory'&&player.bossDance){drawHamster(player);return;}
    for(const e of [...enemies,...(boss?[boss]:[]),...(paftiBoss?[paftiBoss]:[])]){
      if(e.dead)continue;
      if(e.windup>0||(e.type==='gatling'&&e.burstLeft>0)||(e.cyber&&e.burstLeft>0)){
        const charge=e.type==='rabid'||e.type==='pigRammer'||e.karnil||(e.cyber&&e.windup>0),length=charge?340:420;
        ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.aim);ctx.fillStyle='#ff986426';path(ctx,[[0,-e.r*.5],[length,-(charge?e.r*.5:70)],[length,charge?e.r*.5:70],[0,e.r*.5]],'#ff986426');ctx.strokeStyle='#ffb275';ctx.lineWidth=2;ctx.setLineDash([8,8]);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(length,0);ctx.stroke();ctx.restore();
      }
    }
    for(const h of hazards){
      ctx.save();ctx.translate(h.x,h.y);ctx.strokeStyle=h.friendly?'#8fdcc6':'#ff9b65';ctx.lineWidth=3;ctx.fillStyle=h.friendly?'#66ccb422':h.wait>0?'#ed713524':'#ffb46677';ctx.beginPath();ctx.arc(0,0,h.r,0,TAU);ctx.fill();ctx.stroke();
      if(h.wait>0){ctx.setLineDash([7,7]);ctx.beginPath();ctx.arc(0,0,h.r*(1-clamp(h.wait/1.3,0,1)),0,TAU);ctx.stroke();ctx.font='bold 30px Arial';ctx.fillStyle=h.type==='friendlyEgg'?'#fff4cf':'#ffb66d';ctx.textAlign='center';ctx.fillText(h.sausage?'🌭':h.type==='friendlyEgg'?'🥚':h.friendly?'+':'!',0,11);}ctx.restore();
    }
    for(const w of ossiWalls){
      const fade=clamp(w.life/w.maxLife,0,1);ctx.save();ctx.globalAlpha=.45+.55*fade;ctx.translate(w.x,w.y);ctx.fillStyle='#958a70';ctx.strokeStyle='#3f3a31';ctx.lineWidth=3;const ww=w.boss?(w.w||228):76,hh=w.boss?(w.h||108):36;ctx.fillRect(-ww/2,-hh/2,ww,hh);ctx.strokeRect(-ww/2,-hh/2,ww,hh);ctx.strokeStyle='#c8bda4';ctx.lineWidth=2;const ww2=w.boss?(w.w||228):76,hh2=w.boss?(w.h||108):36;for(let yy=-hh2/2+6;yy<hh2/2;yy+=12){ctx.beginPath();ctx.moveTo(-ww2/2+4,yy);ctx.lineTo(ww2/2-4,yy);ctx.stroke();}for(let xx=-ww2/2+16;xx<ww2/2;xx+=22){ctx.beginPath();ctx.moveTo(xx,-hh2/2+3);ctx.lineTo(xx,hh2/2-3);ctx.stroke();}ctx.fillStyle='#efe4c7';ctx.font='bold 9px Arial';ctx.textAlign='center';ctx.fillText('OSSI MAUER',0,3);ctx.restore();
    }
    if(player.lominarWorm){ctx.save();ctx.translate(player.lominarX,player.lominarY);ctx.scale(player.lominarDir||1,1);for(let i=0;i<7;i++){const yy=Math.sin(ambientTime*10-i*.7)*5;ellipse(ctx,-i*9,yy,8,6,i===0?'#d7df72':'#a9c45d');}ellipse(ctx,4,-2,2,2,'#2e3521');ctx.restore();}
    drawExpansion();for(const p of pickups)drawPickup(p);
    for(const t of player.trail)drawHamster({...player,x:t.x,y:t.y},t.life*.9);
    const actors=[...enemies.filter(e=>!e.dead),...(boss&&!boss.dead?[boss]:[]),...(paftiBoss&&!paftiBoss.dead?[paftiBoss]:[]),{...player,isPlayer:true}].sort((a,b)=>a.y-b.y);
    for(const a of actors){if(a.isPlayer)drawHamster(player);else drawRabbit(a);}
    if(player.orbit){
      ctx.save();ctx.strokeStyle=accent()+'40';ctx.lineWidth=1;ctx.beginPath();ctx.arc(player.x,player.y,62,0,TAU);ctx.stroke();
      for(let i=0;i<2;i++){const a=runTime*3.5+i*Math.PI,x=player.x+Math.cos(a)*62,y=player.y+Math.sin(a)*62;ellipse(ctx,x,y,9,6,accent(),a);ellipse(ctx,x-2,y-1,3,3,'#fff5cb');}ctx.restore();
    }
    if(player.nutSentry){const a=runTime*1.8,x=player.x+Math.cos(a)*46,y=player.y-34+Math.sin(a)*10;ctx.save();ctx.translate(x,y);ellipse(ctx,0,0,12,9,'#b77c42');ellipse(ctx,-2,-2,6,4,'#edd087');ctx.fillStyle='#4d3b2b';ctx.fillRect(8,-3,13,6);ctx.restore();}
    if(player.carrotDrone){const a=runTime*1.35+Math.PI,x=player.x+Math.cos(a)*55,y=player.y-48+Math.sin(a)*12;ctx.save();ctx.translate(x,y);path(ctx,[[-10,-4],[7,-7],[12,0],[7,7],[-10,4]],'#e78642');ctx.strokeStyle='#75a85b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-8,-2);ctx.lineTo(-17,-10);ctx.moveTo(-8,2);ctx.lineTo(-17,10);ctx.stroke();ctx.restore();}
    if(player.eggBooger){let x=player.x,y=player.y-28;if(player.eggBoogerTo){x=player.eggBoogerTo.x;y=player.eggBoogerTo.y;if(player.eggBoogerAnim>0&&player.eggBoogerFrom){const t=1-player.eggBoogerAnim/.34;x=player.eggBoogerFrom.x+(player.eggBoogerTo.x-player.eggBoogerFrom.x)*t;y=player.eggBoogerFrom.y+(player.eggBoogerTo.y-player.eggBoogerFrom.y)*t-Math.sin(t*Math.PI)*42;}}ctx.save();ctx.translate(x,y);ellipse(ctx,0,0,9,6,'#b8d85f');ellipse(ctx,4,-2,4,3,'#e9ef96');ctx.strokeStyle='#668339';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-7,2);ctx.lineTo(-14,8);ctx.stroke();ctx.restore();}
    for(const b of bullets){
      if(b.ping||b.puff){drawContentBullet(b);continue;}
      if(b.narrath){ctx.strokeStyle='#91f7ff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(b.x-Math.cos(b.a)*20,b.y-Math.sin(b.a)*20);ctx.lineTo(b.x,b.y);ctx.stroke();continue;}
      if(b.pretzel){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(ambientTime*8);ctx.strokeStyle='#e8ba78';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(-5,-2,6,8,-.4,0,TAU);ctx.ellipse(5,-2,6,8,.4,0,TAU);ctx.moveTo(-9,7);ctx.lineTo(9,-6);ctx.moveTo(9,7);ctx.lineTo(-9,-6);ctx.stroke();ctx.restore();continue;}
      ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.a);const rr=b.drill?18:b.heavy?14:8;ctx.fillStyle=(b.frost?'#9ee4ff':accent())+'44';ctx.fillRect(b.drill?-34:-23,b.drill?-5:-3,b.drill?36:24,b.drill?10:6);ellipse(ctx,0,0,rr,Math.max(4,rr*.55),b.frost?'#beefff':b.drill?'#d39a50':b.heavy?'#c88646':b.chain?'#e2d0ff':'#f0dc8f');ellipse(ctx,rr*.35,0,Math.max(4,rr*.55),Math.max(3,rr*.42),'#fff2cf');ctx.restore();
    }
    for(const t of thrownWeapons){
      ctx.save();ctx.translate(t.x,t.y);ctx.rotate(ambientTime*8);ellipse(ctx,0,0,13,8,'#c9934d');ellipse(ctx,0,0,8,5,'#f1d27e');ctx.strokeStyle='#7c542f';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-7,0);ctx.lineTo(7,0);ctx.stroke();ctx.restore();
    }
    for(const b of enemyBullets){
      ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.a);path(ctx,[[10,0],[-7,-5],[-7,5]],b.cyber?'#ff8578':'#ffab64');ctx.fillStyle=b.cyber?'#f2cae0':'#77a654';ctx.fillRect(-12,-4,6,3);ctx.fillRect(-12,2,6,3);ctx.restore();
    }
    for(const p of particles){
      ctx.globalAlpha=clamp(p.life/p.maxLife,0,1);
      if(p.type==='arc'){ctx.strokeStyle=p.color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo((p.x+p.x2)/2+12,(p.y+p.y2)/2-9);ctx.lineTo(p.x2,p.y2);ctx.stroke();}
      else if(p.type==='beam'){ctx.strokeStyle=p.color;ctx.lineWidth=12*(p.life/p.maxLife)+3;ctx.globalAlpha=.8*clamp(p.life/p.maxLife,0,1);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x2,p.y2);ctx.stroke();ctx.strokeStyle='#fff0b0';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x2,p.y2);ctx.stroke();}
      else if(p.type==='ring'){ctx.strokeStyle=p.color;ctx.lineWidth=8*(p.life/p.maxLife);ctx.beginPath();ctx.arc(p.x,p.y,360*(1-p.life/p.maxLife),0,TAU);ctx.stroke();}
      else ellipse(ctx,p.x,p.y,p.r,p.r*.8,p.color);
    }ctx.globalAlpha=1;
    for(const f of floaters){ctx.globalAlpha=Math.min(1,f.life*2);ctx.font='bold 16px Barlow, Arial';ctx.textAlign='center';ctx.fillStyle='#102519';ctx.fillText(f.text,f.x+1,f.y+1);ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y);}ctx.globalAlpha=1;
    if(pointer.active&&mode==='playing'){
      ctx.save();ctx.translate(pointer.x,pointer.y);ctx.strokeStyle=accent()+'cc';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,11,0,TAU);ctx.moveTo(-17,0);ctx.lineTo(-6,0);ctx.moveTo(6,0);ctx.lineTo(17,0);ctx.moveTo(0,-17);ctx.lineTo(0,-6);ctx.moveTo(0,6);ctx.lineTo(0,17);ctx.stroke();ctx.restore();
    }
    if(bombFlash>0){ctx.fillStyle=`rgba(220,255,150,${bombFlash*.25})`;ctx.fillRect(0,0,W,H);}
    // Keep the HUD visually separate without concealing the arena.
    const shade=themes[settings.theme].shade;
    const top=ctx.createLinearGradient(0,0,0,125);top.addColorStop(0,shade+'dc');top.addColorStop(1,shade+'00');ctx.fillStyle=top;ctx.fillRect(0,0,W,125);
    const bottom=ctx.createLinearGradient(0,H-85,0,H);bottom.addColorStop(0,shade+'00');bottom.addColorStop(1,shade+'af');ctx.fillStyle=bottom;ctx.fillRect(0,H-85,W,85);
  }
  function frame(now){
    const dt=Math.min((now-lastFrame)/1000||0,.04);lastFrame=now;
    if(mode==='victory'){if(!document.hidden){ambientTime+=dt;victoryTime-=dt;updateBossCelebration();if(victoryTime<=0){closeBossCelebration();const next=victoryAfter;victoryAfter=null;next?.();}}}
    if(mode==='playing'){
      ambientTime+=dt; update(dt);shake=Math.max(0,shake-dt*22);bombFlash=Math.max(0,bombFlash-dt);
      for(const p of particles){p.life-=dt;p.x+=(p.vx||0)*dt;p.y+=(p.vy||0)*dt;if(p.vx!==undefined)p.vx*=.97;if(p.vy!==undefined)p.vy*=.97;}
      particles=particles.filter(p=>p.life>0);for(const f of floaters){f.life-=dt;f.y-=dt*30;}floaters=floaters.filter(f=>f.life>0);
    } else if(mode==='menu'||mode==='help'||mode==='intro'||mode==='retry'||mode==='bossUpgrade'||mode==='interlude'||mode==='upgrade'||mode==='scoreSkill'||mode==='paftiCutscene'||mode==='hallOfFame')ambientTime+=dt;
    tickRunSave(dt);
    if(achievementDirty&&Math.floor(now/1000)!==Math.floor((now-dt*1000)/1000))flushAchievements();
    render(dt);requestAnimationFrame(frame);
  }

  // Knochenbrot content patch: definitions remain in the existing reward/build registries.
  const contentFlags=['creamPuff','bruno','pigHose','fartBottle','wollenkamps','cheeseInsurance','recallService','professorCouncil','defianceReactor','supplyPlan','nightShift','crunchChronicle','hardMode'];
  ngPlusCarryKeys.push(...contentFlags);
  const passive=(title,icon,desc,flag,extra={})=>({title,short:title,icon,desc,apply:p=>p[flag]=true,...extra});
  Object.assign(skillBook,{
    creamPuff:passive('MINI SAHNE WINDBEUTEL','◒','Alle 7 s entsteht ein kleiner Windbeutel, der dich 5 s umkreist. Bei Kontakt platzt er: 3,2 × √Nussschaden im Radius 85 und kurze Verlangsamung. Passiver Skill, keine Munition.','creamPuff'),
    bruno:passive('BRUNO STERNI (DIE SESSELSAU)','▰','Bruno sitzt rechts oben im Sessel. Alle 0,85 s wirft er einen Pingpongball auf einen Gegner: 2 × √Nussschaden und 1 Durchschlag.','bruno'),
    pigHose:passive('DER SCHWEINESCHLAUCH','〰','Alle 2,4 s bespritzt ein Schweineschlauch die nächste Gegnerlinie in Reichweite 240: 3 × √Nussschaden und 1 s Verlangsamung.','pigHose'),
    fartBottle:passive('FURZ IN DER FLASCHE','♧','Ein Dash hinterlässt 3 s eine Duftwolke. Sie verursacht alle 0,6 s 1,2 × √Nussschaden im Radius 85. 4,5 s Abklingzeit; verlangsamt normale Gegner.','fartBottle'),
    wollenkamps:passive('FRAU WOLLENKAMPS','☂','Frau Wollenkamps geht zu Gegnern und diskutiert über schlechtes Wetter. Alle 6,5 s hält sie einen normalen Gegner 1,8 s vom Angreifen ab. Bosse werden kurz verlangsamt.','wollenkamps')
  });
  Object.assign(ngPlusSkillBook,{
    cheeseInsurance:passive('KÄSEVERSICHERUNG','◇','NG+: Nach tatsächlichem Lebensverlust verschwinden bis zu 3 feindliche Geschosse im Radius 100. 8 s Abklingzeit.','cheeseInsurance',{ngplus:true}),
    recallService:passive('RÜCKRUFSERVICE','↩','NG+: Jede dritte Spezialwaffen-Nutzung lädt 1 verbrauchte Ladung einer anderen Waffe nach. Mindestens 10 s zwischen Rückrufen.','recallService',{ngplus:true})
  });
  Object.assign(ngPlus2SkillBook,{
    professorCouncil:passive('PROFESSORENRAT','⚕','NG+2: Automatische Schüsse von Knabber-Turm, Dr. Narrath und Bruno verursachen 18 % mehr Schaden.','professorCouncil',{ngplus2:true}),
    defianceReactor:passive('TROTZREAKTOR','♥','NG+2: +1 permanentes Herz. Unter 50 % Leben verursachen alle Angriffe 20 % mehr Schaden.','defianceReactor',{ngplus2:true,apply:p=>{p.defianceReactor=true;p.maxHp++;p.hp=Math.min(p.maxHp,p.hp+1);}})
  });
  Object.assign(survivalSkillBook,{
    supplyPlan:passive('SCHICHTPLAN','↻','Nur Endlosmodus: Jede dritte künftig gewonnene Welle gibt eine zusätzliche einmalige Shuffle-Ladung. Der Zähler beginnt mit diesem Skill.','supplyPlan',{endless:true}),
    nightShift:passive('NACHTSCHICHT','☾','Nur Endlosmodus: Je 25 besiegte Gegner 8 s lang 15 % höhere Feuerrate. Weitere Auslöser erneuern die Dauer.','nightShift',{endless:true})
  });
  Object.assign(weaponBook,{
    incubator:{name:'DER BRUTKASTEN',icon:'▣',desc:'Stellt am Ziel einen Brutkasten auf. Über 3 s schlüpfen 6 zielsuchende Küken, je 5 × Spezialfaktor Schaden. 4 Ladungen.',max:4},
    corkscrew:{name:'KORKENZIEHER-KARUSSELL',icon:'↬',desc:'NG+: Drei schwere Spiralnüsse mit je 14 × Spezialfaktor Schaden und 2 Durchschlägen. 3 Ladungen.',max:3},
    goulashStorm:{name:'GULASCHGEWITTER',icon:'☄',desc:'NG+: Drei zeitversetzte Einschläge nahe dem Ziel, je 20 × Spezialfaktor Schaden im Radius 85. 3 Ladungen.',max:3},
    creamCompressor:{name:'SAHNEKOMPRESSOR',icon:'⋰',desc:'NG+2: Fünf kurze Sahnestrahlen mit je 12 × Spezialfaktor Schaden. Schiebt normale Gegner zurück und löscht bis zu 12 Geschosse im Kegel. 3 Ladungen.',max:3},
    starStomper:{name:'STERNENSTAMPFER',icon:'★',desc:'NG+2: Markiert einen Einschlag im Radius 190. Nach 0,7 s: 52 × Spezialfaktor Schaden und Verlangsamung. 2 Ladungen.',max:2},
    scrapSpinner:{name:'SCHROTTKREISEL',icon:'↶',desc:'Nur Endlosmodus: Zwei zurückkehrende Schrottscheiben mit je 14 × Spezialfaktor Schaden. Hin- und Rückflug treffen getrennt. 5 Ladungen.',max:5},
    stormJar:{name:'GEWITTER IM GLAS',icon:'ϟ',desc:'Nur Endlosmodus: Ein Glas am Ziel blitzt innerhalb von 3,5 s dreimal zum nächsten Gegner in Reichweite 350. Je 22 × Spezialfaktor Schaden. 3 Ladungen.',max:3},
    sunBrood:{name:'SONNENBRUT',icon:'☀',desc:'Legendäre Waffe: Ein goldenes Ei explodiert am Ziel für 65 × Spezialfaktor Schaden im Radius 160. Danach schlüpfen 6 Küken, je 3 × Spezialfaktor Schaden. 2 Ladungen.',max:2}
  });
  skillBook.incubator=weaponUnlock('incubator');
  for(const id of ['corkscrew','goulashStorm'])ngPlusWeaponUpgrades[id]={...weaponUnlock(id),ngplus:true};
  for(const id of ['creamCompressor','starStomper'])ngPlus2WeaponUpgrades[id]={...weaponUnlock(id),ngplus2:true};
  for(const id of ['scrapSpinner','stormJar'])survivalWeaponUpgrades[id]=weaponUnlock(id,true);
  legendarySkillBook.crunchChronicle=passive('KNUSPERCHRONIK','⌛','Legendär: +10 % Nussschaden und +1 Herz. Alle 12 s entsteht für 3 s eine Zeitblase (Radius 145), die Gegner bremst und beim Entstehen bis zu 8 Geschosse löscht.','crunchChronicle',{legendary:true,apply:p=>{p.crunchChronicle=true;p.damage*=1.10;p.maxHp++;p.hp=Math.min(p.maxHp,p.hp+1);}});
  legendarySkillBook.sunBrood={...weaponUnlock('sunBrood'),legendary:true};
  const normalContent=['creamPuff','bruno','pigHose','fartBottle','wollenkamps','incubator'];
  upgradePools.forEach((pool,i)=>pool.push(normalContent[i%6],normalContent[(i+2)%6]));
  // Only used when a troll owes three legendary choices but unique legendaries are exhausted.
  const legendarySupplies={
    legendaryFeast:{id:'legendaryFeast',title:'GOLDENES FESTMAHL',icon:'♛',desc:'Legendärer Vorrat: +6 % Nussschaden (max. 30) und volle Heilung. Ersatz für bereits gesammelte Legendaries.',legendary:true,repeatable:true,apply:p=>{p.damage*=1.06;p.hp=p.maxHp;}},
    legendaryStock:{id:'legendaryStock',title:'GOLDENE VORRATSKAMMER',icon:'⊕',desc:'Legendärer Vorrat: +1 maximale Ladung pro Waffe (max. +12) und +8 % Spezialschaden. Ersatz für bereits gesammelte Legendaries.',legendary:true,repeatable:true,apply:p=>{p.ammoBonus++;p.specialDamage*=1.08;}},
    legendaryMix:{id:'legendaryMix',title:'GOLDENES MISCHTAPE',icon:'↻',desc:'Legendärer Vorrat: +2 einmalige Shuffles und +1 Herz Heilung. Ersatz für bereits gesammelte Legendaries.',legendary:true,repeatable:true,apply:p=>{p.shuffleBonusBank+=2;p.hp=Math.min(p.maxHp,p.hp+1);}}
  };
  function rewardRef(c){return {id:c.id,special:Boolean(c.special)};}
  function resolveReward(ref){
    if(!ref)return null;const c=ref.special?specialUpgradeBook[ref.id]:allSkillInfo(ref.id)||ngPlusWeaponUpgrades[ref.id]||ngPlus2WeaponUpgrades[ref.id]||survivalWeaponUpgrades[ref.id]||legendarySupplies[ref.id];
    return c?{...c,id:ref.id,...(ref.special?{special:true}:{})}:null;
  }
  const contentGrantReward=grantReward;
  grantReward=function(c){if(!c)return;if(c.repeatable){c.apply(player);normalizeBuild(player);refillWeapons();updateHud();return;}contentGrantReward(c);};

  let hardProgress={unlocked:false,ngplus:false,ngplus2:false,endless:false,ngBuild:null,ng2Build:null},endlessSelectHard=false;
  let impossibleProgress={unlocked:false,ngplus:false,ngplus2:false,clear:false,ngBuild:null,ng2Build:null};
  try{Object.assign(impossibleProgress,JSON.parse(localStorage.getItem('snickers3-impossible-progress-v1')||'{}'));}catch{}
  let selectedSkin='classic';try{selectedSkin=localStorage.getItem('snickers3-selected-skin-v1')||'classic';}catch{}
  let endlessBest={normal:0,hard:0};try{Object.assign(endlessBest,JSON.parse(localStorage.getItem('snickers3-endless-best-v1')||'{}'));}catch{}
  try{const h=JSON.parse(localStorage.getItem('snickers3-hard-progress-v1')||'null');if(h&&typeof h==='object')hardProgress={...hardProgress,...h};}catch{}
  const hardUnlocked=()=>Boolean(hardProgress.unlocked||hallOfFame.some(r=>!r.hardMode));
  function saveHardProgress(){try{localStorage.setItem('snickers3-hard-progress-v1',JSON.stringify(hardProgress));}catch{toast('Hard-Fortschritt konnte nicht gespeichert werden. Bitte Browser-Speicher freigeben.');}}
  function canStartMode(level,hard,build=null,impossible=false){
    if(![0,1,2,3].includes(level))return false;
    if(impossible){if(level===3||!hardProgress.endless)return false;return level===0||level===1&&Boolean(impossibleProgress.ngplus&&impossibleProgress.ngBuild)||level===2&&Boolean(impossibleProgress.ngplus2&&impossibleProgress.ng2Build);}
    if(hard&&!hardUnlocked())return false;
    if(level===0)return true;
    if(level===1){const b=hard?hardProgress.ngBuild:ngPlusBuild;return Boolean((hard?hardProgress.ngplus:ngPlusUnlocked)&&b&&Boolean(b.hardMode)===Boolean(hard));}
    if(level===2){const b=hard?hardProgress.ng2Build:ngPlus2Build;return Boolean((hard?hardProgress.ngplus2:ngPlus2Unlocked)&&b&&Boolean(b.hardMode)===Boolean(hard));}
    if(hard?!hardProgress.endless:!hallOfFame.some(r=>!r.hardMode))return false;
    return !build||Boolean(build.hardMode)===Boolean(hard);
  }
  function runScoreMultiplier(){return (player.scoreRushBonus||1)*(hardMode?1.55:1);}
  function persistHardWin(){
    hardProgress.unlocked=true;const build=captureNGPlusBuild(player);build.hardMode=true;
    if(gamePlusLevel===0){hardProgress.ngplus=true;hardProgress.ngBuild=build;addAchievementProgress('hard_clear');}
    else if(gamePlusLevel===1){hardProgress.ngplus2=true;hardProgress.ng2Build=build;addAchievementProgress('hard_ng_clear');}
    else if(gamePlusLevel===2){
      hardProgress.endless=true;impossibleProgress.unlocked=true;addAchievementProgress('hard_ng2_clear');
      hallOfFame.unshift({hardMode:true,gamePlusLevel:2,completedAt:new Date().toISOString(),score,kills,time:Math.floor(runTime),maxHp:player.maxHp,retriesLeft,skills:Object.keys(player.skills),specials:Object.keys(player.specials||{}),weapons:[...player.weapons],scorePerks:{...player.scorePerks},build});
      try{localStorage.setItem('snickers3-hall-of-fame-v1',JSON.stringify(hallOfFame));}catch{}
    }
    saveHardProgress();if(impossibleProgress.unlocked)saveImpossibleProgress();updateNGPlusMenu();
  }
  achievements.push(
    {id:'hard_first_boss',title:'KEIN WEICHER KERN',desc:'Besiege einen Hauptboss einschließlich seiner zusätzlichen Hard-Phase.',goal:1,kind:'gag',hard:true,secret:true},
    {id:'hard_clear',title:'HARTES BROT',desc:'Schließe die Kampagne im Hard Mode ab.',goal:1,kind:'gag',hard:true,secret:true},
    {id:'hard_ng_clear',title:'NOCH HÄRTER GEKNACKT',desc:'Schließe Hard New Game+ ab.',goal:1,kind:'gag',hard:true,secret:true},
    {id:'hard_ng2_clear',title:'KNOCHENBROT-MEISTER',desc:'Schließe Hard New Game+2 einschließlich Ottah ab.',goal:1,kind:'gag',hard:true,secret:true},
    {id:'hard_survival_10',title:'HARTNÄCKIG ENDLOS',desc:'Erreiche Welle 10 im Hard-Endlosmodus.',goal:1,kind:'gag',hard:true,secret:true}
  );
  const contentUpdateMenu=updateNGPlusMenu;
  updateNGPlusMenu=function(){contentUpdateMenu();$('hardModeButton')?.classList.toggle('hidden',!hardUnlocked());$('endlessButton')?.classList.toggle('hidden',!hallOfFame.some(r=>!r.hardMode)&&!hardProgress.endless);updateContinueButton();};
  function requestRunStart(level,hard=false,build=null,impossible=false,importedBuild=null){
    if(!canStartMode(level,hard,build,impossible)){toast('Dieser Modus ist noch nicht freigeschaltet oder der Build passt nicht zur Schwierigkeit.');return;}
    const launch=()=>{importedStartBuild=importedBuild;endlessSelectedBuild=level===3?build:null;endlessFromHall=Boolean(level===3&&build);startGame(level,hard,impossible);};
    if(!hasSavedRun()){launch();return;}
    mode='newRunConfirm';showOverlay('<span class="eyebrow">GESPEICHERTER RUN VORHANDEN</span><h2 id="overlayTitle">NEU ANFANGEN?</h2><p>Ein neuer Run ersetzt deinen pausierten Run. Erfolge, freigeschaltete Modi und Hall of Fame bleiben erhalten.</p><div class="overlay-actions"><button class="primary-button" id="confirmFreshRun">NEUEN RUN STARTEN ↗</button><button class="secondary-button" id="keepSavedRun">GESPEICHERTEN RUN BEHALTEN</button></div>');
    $('confirmFreshRun').onclick=()=>{if(mode==='newRunConfirm')launch();};$('keepSavedRun').onclick=goMenu;
  }
  function chooseRunMode(level=0){
    if(level===3&&!hardProgress.endless){showEndlessSelect(false);return;}
    if(!hardUnlocked()){requestRunStart(level,false);return;}
    mode='modeSelect';showOverlay(`<span class="eyebrow">SCHWIERIGKEIT WÄHLEN</span><h2 id="overlayTitle">${level===3?'ENDLOS WEITER.':'FRISCH AUS DEM NEST.'}</h2><p>Normal bleibt die knackige bisherige Balance. Hard erhöht Angriffsdruck, Treffer und Gegnervielfalt; jeder Hauptboss erhält eine zusätzliche Phase. Dafür gibt es 55 % mehr Kampf- und Abschlusspunkte. Builds wechseln nicht zwischen den Schwierigkeiten.</p><div class="difficulty-options"><button class="upgrade" id="normalStart"><small>NORMAL</small><strong>Angenehme Hasenjagd</strong><span>Die bisherige Schwierigkeit.</span></button><button class="upgrade hard-card" id="hardStart"><small>HARD</small><strong>Hasen jagen mit Hummeln im Arsch</strong><span>Für abgeschlossene NG+2-Veteranen. +55 % Punkte.</span></button></div><button class="secondary-button" id="modeBack">ZURÜCK</button>`);
    $('normalStart').disabled=!canStartMode(level,false);$('hardStart').disabled=!canStartMode(level,true);
    $('normalStart').onclick=()=>level===3?showEndlessSelect(false):requestRunStart(level,false);
    $('hardStart').onclick=()=>level===3?showEndlessSelect(true):requestRunStart(level,true);$('modeBack').onclick=goMenu;
  }
  function showHardModes(){
    if(!hardUnlocked())return;mode='hardSelect';const labels=['HARD · FRISCHER RUN','HARD · NEW GAME+','HARD · NEW GAME+2','HARD · ENDLOSMODUS'];
    showOverlay(`<span class="eyebrow">HARD MODE · +55 % PUNKTE</span><h2 id="overlayTitle">Nüsse aus Stahl</h2><p>Hard-Kampagne → Hard NG+ → Hard NG+2 → Hard Endlosmodus. Jede abgeschlossene Stufe schaltet die nächste frei. Normale Runs und ihre Builds bleiben separat verfügbar.</p><div class="hard-mode-list">${labels.map((s,i)=>`<button class="secondary-button ${i===0?'hard-card':''}" id="hardLevel${i}" ${!canStartMode(i,true)?'disabled':''}>${s}${canStartMode(i,true)?' ↗':' · NOCH GESPERRT'}</button>`).join('')}</div><button class="secondary-button" id="hardBack">ZURÜCK</button>`);
    labels.forEach((_,i)=>{$('hardLevel'+i).onclick=()=>i===3?showEndlessSelect(true):requestRunStart(i,true);});$('hardBack').onclick=goMenu;
  }
  const contentRunSummary=runSummary;
  runSummary=function(r,i,source){return contentRunSummary(r,i,source).replace('NG+2 ABGESCHLOSSEN',`${r.hardMode?'HARD':'NORMAL'} · NG+2 ABGESCHLOSSEN`);};
  showEndlessSelect=function(hard=endlessSelectHard){
    if(!canStartMode(3,hard)){toast('Der Endlosmodus wird mit dem passenden NG+2-Abschluss freigeschaltet.');return;}
    endlessSelectHard=Boolean(hard);mode='endlessSelect';const entries=hallOfFame.map((r,i)=>({r,i})).filter(({r})=>Boolean(r.hardMode)===endlessSelectHard);
    showOverlay(`<span class="eyebrow">${hard?'HARD':'NORMAL'} · ENDLOSMODUS</span><h2 id="overlayTitle">KEIN FEIERABEND.</h2><p>Frisch starten oder einen abgeschlossenen ${hard?'Hard-':'Normal-'}Build übernehmen. Hall-Builds spielen auf erhöhtem NG+2-Gegnerniveau${hard?' plus Hard-Regeln':''}.</p><button class="endless-build-card fresh" id="endlessFresh"><strong>◌ KOMPLETT FRISCH STARTEN</strong><small>${hard?'Hard':'Normal'} · ohne übernommene Upgrades</small></button><div class="hall-run-list endless-run-list">${entries.map(({r,i})=>runSummary(r,i,'endless')).join('')}</div><button class="secondary-button" id="endlessBack">ZURÜCK ZUM MENÜ</button>`);
    $('endlessFresh').onclick=()=>requestRunStart(3,endlessSelectHard);entries.forEach(({i})=>{$('endlessRun'+i).onclick=()=>showRunDetail(i,'endless');});$('endlessBack').onclick=goMenu;
  };
  startHallRun=function(index){const entry=hallOfFame[index];if(!entry)return;requestRunStart(3,Boolean(entry.hardMode),hallBuild(entry));};
  const contentRunDetail=showRunDetail;
  showRunDetail=function(index,source='hall'){
    const r=hallOfFame[index];if(!r)return;contentRunDetail(index,source);
    $('overlayTitle').textContent=`${r.hardMode?'HARD':'NORMAL'} · RUN ${hallOfFame.length-index}`;
    $('runDetailStart').textContent=`IN ${r.hardMode?'HARD':'NORMAL'}-ENDLOSMODUS STARTEN ↗`;
    if(source==='endless'){
      const ids=hallOfFame.map((x,i)=>Boolean(x.hardMode)===endlessSelectHard?i:-1).filter(i=>i>=0),pos=ids.indexOf(index);
      $('runPrev').disabled=pos<=0;$('runNext').disabled=pos>=ids.length-1;
      $('runPrev').onclick=()=>showRunDetail(ids[pos-1],source);$('runNext').onclick=()=>showRunDetail(ids[pos+1],source);
    }
  };
  const contentHud=updateHud;
  updateHud=function(){contentHud();if(!player)return;if(hardMode){$('waveLabel').textContent='HARD · '+$('waveLabel').textContent;if(boss?.hardFinal){$('bossPhase').textContent='HARD · ZUSATZPHASE';$('waveObjective').textContent='LETZTE PHASE · DOPPELT GEBACKEN';}}};
  function isLastBossPhase(e){return e.ottah?(e.ottahPhase||1)>=3:e.karnil?(newGamePlus?e.phaseThree&&e.paftiHealed:e.phaseTwo):true;}
  function startHardFinal(e){
    e.hardFinal=true;e.hp=e.maxHp=Math.max(1,e.maxHp*.60);e.enraged=true;e.hardGuard=1.25;e.hardCd=1.5;e.hardWindup=0;e.hardPattern=0;
    enemyBullets=[];hazards=hazards.filter(h=>h.friendly);player.invuln=Math.max(player.invuln,1.5);e.slow=0;
    announce('HARD · ZUSATZPHASE','LETZTER WIDERSTAND · 60 % PHASENLEBEN');burst(e.x,e.y,'#faad93',36,190);updateHud();
  }
  function updateHardFinal(e,dt){
    e.hit=Math.max(0,e.hit-dt);e.slow=Math.max(0,(e.slow||0)-dt);e.hardGuard=Math.max(0,e.hardGuard-dt);
    const a=Math.atan2(player.y-e.y,player.x-e.x),d=dist(e,player),speed=e.speed*(e.slow>0?.8:1)*(player.powerups.freeze>0?.7:1);
    if(e.hardWindup>0){e.hardWindup-=dt;if(e.hardWindup<=0){
      const pat=e.hardPattern++%3;
      if(pat===0){for(let i=-3;i<=3;i++)enemyShot(e.x,e.y,e.hardAim+i*.18,275,true);}
      else if(pat===1){const n=e.karnil||e.ottah?16:12,gap=e.hardAim;for(let i=0;i<n;i++){const b=TAU*i/n;if(Math.abs(angleDelta(b,gap))>.42)enemyShot(e.x,e.y,b,215,true);}}
      else {for(let i=-1;i<=1;i++)hazards.push({type:'mortar',x:clamp(e.hardTarget.x+i*105,65,W-65),y:clamp(e.hardTarget.y+(i===0?60:-40),145,H-65),r:58,wait:1+i*.12,life:.3,hit:false,damage:1.5});}
      if(impossibleMode&&e.impossibleFinal){const aim=Math.atan2(player.y-e.y,player.x-e.x);for(const off of [-.32,0,.32])enemyShot(e.x,e.y,aim+off,260,true);}
      e.hardCd=(e.impossibleFinal?1.38:1.8)+(e.ottah?.15:0);
    }}else{e.hardCd-=dt;if(d>260){e.x+=Math.cos(a)*speed*dt;e.y+=Math.sin(a)*speed*dt;}if(e.hardCd<=0){e.hardWindup=.95;e.hardAim=a;e.hardTarget={x:player.x,y:player.y};}}
    e.x=clamp(e.x,65,W-65);e.y=clamp(e.y,135,H-65);
    if(dist(e,player)<e.r+player.r-8)hurtPlayer(e.ottah||e.karnil?1.5:1,e);
    if(e.hardWindup>0){e.aim=e.hardAim;}
  }

  let overlayFromPause=false;
  const RUN_SAVE_KEY='snickers3-active-run-v1';
  let runSessionId=null,runRevision=0,runSaveClock=0,restoringRun=false,saveFailed=false;
  let pendingBossKind=null,pendingBossChoices=[],scoreFallback=null,victoryDestination=null,interludeKind=null;
  let contentEffects=[],contentCompanion=null,trollQuest=null;
  const savedRunModes=new Set(['intro','playing','victory','upgrade','bossUpgrade','scoreSkill','interlude','retry','paftiCutscene']);
  const cloneData=value=>JSON.parse(JSON.stringify(value));
  // A graph preserves identity: a piercing projectile's hit Set must refer to the restored enemy,
  // not a second copy of it. It also preserves Sets and Infinity used by existing projectiles.
  function encodeRunGraph(root){
    const seen=new Map(),nodes=[];
    function enc(value){
      if(value===undefined)return {u:1};
      if(typeof value==='number'&&!Number.isFinite(value))return {n:String(value)};
      if(value===null||typeof value!=='object'){if(typeof value==='function')throw Error('Function in run state');return value;}
      if(seen.has(value))return {r:seen.get(value)};
      const id=nodes.length;seen.set(value,id);nodes.push(null);
      if(value instanceof Set)nodes[id]={t:'s',v:[...value].map(enc)};
      else if(Array.isArray(value))nodes[id]={t:'a',v:value.map(enc)};
      else nodes[id]={t:'o',v:Object.entries(value).filter(([,v])=>typeof v!=='function').map(([k,v])=>[k,enc(v)])};
      return {r:id};
    }
    return {root:enc(root),nodes};
  }
  function decodeRunGraph(graph){
    if(!graph||!Array.isArray(graph.nodes)||graph.nodes.length>90000)throw Error('Invalid run graph');
    const values=graph.nodes.map(n=>n.t==='s'?new Set():n.t==='a'?[]:n.t==='o'?{}:null);
    function dec(v){
      if(v===null||typeof v!=='object')return v;
      if('r'in v){if(!Number.isInteger(v.r)||!values[v.r])throw Error('Invalid run reference');return values[v.r];}
      if(v.u===1)return undefined;
      if(v.n==='Infinity')return Infinity;if(v.n==='-Infinity')return -Infinity;if(v.n==='NaN')return NaN;
      throw Error('Invalid run value');
    }
    graph.nodes.forEach((node,i)=>{if(!values[i]||!Array.isArray(node.v))throw Error('Invalid run node');for(const entry of node.v){if(node.t==='s')values[i].add(dec(entry));else if(node.t==='a')values[i].push(dec(entry));else{const [key,v]=entry;if(['__proto__','constructor','prototype'].includes(key))throw Error('Invalid run key');values[i][key]=dec(v);}}});
    return dec(graph.root);
  }
  function resumableMode(){
    if(['paused','build','guide'].includes(mode)||mode==='settings'&&settingsReturn==='paused'||['skins','share'].includes(mode)&&overlayFromPause)return 'playing';
    return savedRunModes.has(mode)?mode:null;
  }
  function snapshotRun(){
    const savedMode=resumableMode();if(!savedMode||!player)return null;
    return {savedMode,player,enemies,bullets,enemyBullets,particles,pickups,hazards,floaters,thrownWeapons,ossiWalls,poisonPatches,ratSwarms,boss,
      wave,waveTime,runTime,spawnTimer,kills,score,shake,bombFlash,shotTimer,ambientTime,uiTimer,retriesLeft,retryWave,retryBossKind,
      gamePlusLevel,newGamePlus,newGamePlus2,endlessMode,endlessFromHall,endlessBossesDefeated,stageVisual,stagePrepared,generalDefeated,cyberDefeated,lastDefeatedBoss,
      minibossPlan,lastMiniWave,victoryTime,hardMode,impossibleMode,paftiBoss,contentEffects,contentCompanion,trollQuest,pendingBossKind,scoreFallback,victoryDestination,interludeKind,
      rewardRefs:activeRewardChoices.map(rewardRef),bossRewardRefs:pendingBossChoices.map(rewardRef),pointer:{...pointer},inputMode,bossQuoteBag};
  }
  function readSavedRun(){
    try{const raw=localStorage.getItem(RUN_SAVE_KEY);if(!raw)return null;const save=JSON.parse(raw);return save?.schema===1&&save.data&&save.id?save:null;}catch{return null;}
  }
  function hasSavedRun(){return Boolean(readSavedRun());}
  function updateContinueButton(){
    const button=$('continueRunButton');if(!button)return;const saved=readSavedRun();button.classList.toggle('hidden',!saved);
    if(saved){const s=saved.summary||{};button.textContent=`RUN FORTSETZEN · ${s.impossible?'IMPOSSIBLE · ':s.hard?'HARD · ':''}${s.level===3?'ENDLOS · ':s.level===2?'NG+2 · ':s.level===1?'NG+ · ':''}WELLE ${s.wave||1} ↗`;}
  }
  function beginRunSession(carryBuild){
    runSessionId=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);runRevision=0;runSaveClock=0;saveFailed=false;
    player.hardMode=hardMode;player.impossibleMode=impossibleMode;contentEffects=[];contentCompanion=null;pendingBossKind=null;pendingBossChoices=[];scoreFallback=null;victoryDestination=null;interludeKind=null;
    trollQuest=carryBuild?.trollCarry?cloneData(carryBuild.trollCarry):null;
    if(trollQuest){trollQuest.status='pending';trollQuest.wave=null;}
    if(hardMode){const p=$('overlayContent').querySelector('p');if(p)p.textContent+=impossibleMode?' IMPOSSIBLE: zusätzliche Gegner und Bossphasen. Ottah kämpft zusammen mit Pafti.':' HARD: 55 % mehr Punkte, neue Gegner und eine zusätzliche Phase je Hauptboss.';}
    saveRunNow();updateContinueButton();
  }
  function saveRunNow(){
    if(restoringRun||!runSessionId)return false;const state=snapshotRun();if(!state)return false;
    try{
      const save={schema:1,id:runSessionId,revision:++runRevision,savedAt:Date.now(),summary:{wave:wave+1,level:gamePlusLevel,hard:hardMode,impossible:impossibleMode},data:encodeRunGraph(state)};
      localStorage.setItem(RUN_SAVE_KEY,JSON.stringify(save));saveFailed=false;return true;
    }catch{if(!saveFailed)toast('Run konnte nicht gespeichert werden. Bitte Browser-Speicher freigeben.');saveFailed=true;return false;}
  }
  function tickRunSave(dt){if(!resumableMode()||restoringRun)return;runSaveClock+=dt;if(runSaveClock>=1){runSaveClock=0;saveRunNow();}}
  function endRunSession(force=false){
    try{const save=readSavedRun();if(force||!save||save.id===runSessionId)localStorage.removeItem(RUN_SAVE_KEY);}catch{}
    runSessionId=null;updateContinueButton();
  }
  function resumeSavedRun(){
    const saved=readSavedRun();if(!saved){toast('Kein gespeicherter Run vorhanden.');return;}
    let s;try{
      s=decodeRunGraph(saved.data);
      if(!s?.player||!savedRunModes.has(s.savedMode)||!Array.isArray(s.enemies)||!Number.isFinite(s.wave)||!Number.isFinite(s.player.x)||!Array.isArray(s.player.weapons)||!s.player.weapons.every(id=>weaponBook[id]))throw Error('Invalid run state');
      if(!(s.player.usedWeapons instanceof Set)||!(s.player.powerSeen instanceof Set))throw Error('Invalid run sets');
      s.impossibleMode=Boolean(s.impossibleMode);s.paftiBoss??=null;
      if(s.rewardRefs.some(ref=>!resolveReward(ref))||s.bossRewardRefs.some(ref=>!resolveReward(ref)))throw Error('Unknown reward');
    }catch{toast('Dieser Run-Speicher ist beschädigt oder gehört zu einer anderen Spielversion.');return;}
    restoringRun=true;
    try{
      ({player,enemies,bullets,enemyBullets,particles,pickups,hazards,floaters,thrownWeapons,ossiWalls,poisonPatches,ratSwarms,boss,
        wave,waveTime,runTime,spawnTimer,kills,score,shake,bombFlash,shotTimer,ambientTime,uiTimer,retriesLeft,retryWave,retryBossKind,
        gamePlusLevel,newGamePlus,newGamePlus2,endlessMode,endlessFromHall,endlessBossesDefeated,stageVisual,stagePrepared,generalDefeated,cyberDefeated,lastDefeatedBoss,
        minibossPlan,lastMiniWave,victoryTime,hardMode,impossibleMode,paftiBoss,contentEffects,contentCompanion,trollQuest,pendingBossKind,scoreFallback,victoryDestination,interludeKind,bossQuoteBag}=s);
      activeRewardChoices=s.rewardRefs.map(resolveReward);pendingBossChoices=s.bossRewardRefs.map(resolveReward);Object.assign(pointer,s.pointer);inputMode=(matchMedia('(pointer: coarse)').matches||shell.classList.contains('touch-input'))?'touch':'mouse';
      runSessionId=saved.id;runRevision=saved.revision||0;runSaveClock=0;mode=s.savedMode;resetInput();lastFrame=performance.now();musicTrack=-1;makeGround();
      $('startScreen').classList.add('hidden');$('hud').classList.remove('hidden');$('hud').setAttribute('aria-hidden','false');
      for(const id of ['runInfo','pauseButton','touchControls'])$(id).classList.remove('hidden');
      $('announcement').classList.add('hidden');$('bossHud').classList.toggle('hidden',!boss||boss.dead);
      if(boss){$('bossName').textContent=boss.ottah?'OTTAH · DAS WARZENSCHWEIN':boss.endlessBoss?boss.endlessName:boss.karnil?'KARNIL · FERKEL DER EINGESTÜRZTEN':boss.cyber?'CYBER-HASENBEIN':'GENERAL HASENBEIN';$('bossHud').classList.toggle('cyber',Boolean(boss.cyber));$('bossHud').classList.toggle('karnil',Boolean(boss.karnil));}
      updateHud();updateSkills();hideOverlay();
      if(mode==='playing'){pauseGame();toast('Run geladen. Zeit und Gegner warten, bis du fortsetzt.');}
      else if(mode==='upgrade')renderWaveReward();
      else if(mode==='bossUpgrade')renderBossReward();
      else if(mode==='scoreSkill'){mode='playing';showScoreSkillMenu(scoreFallback?scoreContinuation():null);}
      else if(mode==='victory'){victoryAfter=restoredVictoryCallback();announce(boss?'BOSS GESCHAFFT!':`WELLE ${wave+1} GESCHAFFT!`,'SNICKERS JUBELT!');}
      else if(mode==='retry'){mode='playing';finish(false);}
      else if(mode==='paftiCutscene')triggerPaftiIntervention(true);
      else if(mode==='interlude'){if(interludeKind==='general')showGeneralInterlude();else if(interludeKind==='cyber')showCyberInterlude();else showOttahInterlude();}
      else if(mode==='intro'){showOverlay(`<span class="eyebrow">GESPEICHERTER RUN · ${hardMode?'HARD':'NORMAL'}</span><h2 id="overlayTitle">DIE HASEN WARTEN.</h2><p>Dein vorbereiteter Run und dein Build sind geladen. Mit der ersten Welle geht es weiter.</p><button class="primary-button" id="introButton">RUN STARTEN ↗</button>`);$('introButton').onclick=beginFirstWave;}
    }finally{restoringRun=false;}
  }
  function restoredVictoryCallback(){return victoryDestination==='finish'?()=>{mode='playing';finish(true);}:victoryDestination?.startsWith('boss:')?()=>bossUpgradeScreen(victoryDestination.slice(5)):upgradeScreen;}
  function scoreContinuation(){return scoreFallback==='boss'?()=>afterBossReward(pendingBossKind):continueAfterWave;}
  const contentBeginVictory=beginVictory;
  beginVictory=function(next){if(mode!=='playing')return;victoryDestination=boss?(boss.ottah?'finish':'boss:'+lastDefeatedBoss):'wave';contentBeginVictory(next);saveRunNow();};
  const contentScoreMenu=showScoreSkillMenu;
  showScoreSkillMenu=function(after=null){if(!restoringRun)scoreFallback=typeof after==='function'?(mode==='bossUpgrade'?'boss':'wave'):null;contentScoreMenu(after);};
  const contentFinish=finish;
  finish=function(won){contentFinish(won);if(mode==='won'||mode==='lost'){endRunSession();}else if(mode==='retry')saveRunNow();};
  const contentGeneralInterlude=showGeneralInterlude,contentCyberInterlude=showCyberInterlude;
  showGeneralInterlude=function(){interludeKind='general';contentGeneralInterlude();};
  showCyberInterlude=function(){interludeKind='cyber';contentCyberInterlude();};

  const contentAvailableRewards=availableRewards;
  availableRewards=function(includeSpecial=false){
    const pool=contentAvailableRewards(includeSpecial),reserved=new Set(trollQuest&&trollQuest.status!=='reward'?(trollQuest.legendRefs||[]).map(r=>r.id):[]);
    return reserved.size?pool.filter(c=>!reserved.has(c.id)):pool;
  };
  function reserveTrollLegendaries(){
    const unique=Object.entries(legendarySkillBook).filter(([id,c])=>!player.skills[id]&&(!c.weapon||!player.weapons.includes(c.weapon))).map(([id,c])=>({...c,id}));
    const choices=shuffled(unique).slice(0,3);for(const c of shuffled(Object.values(legendarySupplies)))if(choices.length<3)choices.push(c);
    return choices.map(rewardRef);
  }
  const contentPrepareReward=prepareWaveReward;
  prepareWaveReward=function(){
    contentPrepareReward();
    if(player.supplyPlan){player.supplyWaves=(player.supplyWaves||0)+1;if(player.supplyWaves%3===0){player.shuffleBonusBank++;}}
    if(trollQuest?.status==='defeated'){
      trollQuest.status='reward';activeRewardChoices=trollQuest.legendRefs.map(resolveReward);return;
    }
    if(!trollQuest&&Math.random()<.01){trollQuest={status:'soiled',wave:null,legendRefs:reserveTrollLegendaries(),spawned:false};}
  };
  const poopMark='<svg viewBox="0 0 44 40" width="35" height="35" aria-hidden="true"><g fill="#b28b5f"><ellipse cx="22" cy="32" rx="20" ry="7"/><ellipse cx="22" cy="22" rx="14" ry="8"/><ellipse cx="24" cy="12" rx="7" ry="8"/></g></svg>';
  const trollArt=`<div class="troll-visit" aria-hidden="true"><svg viewBox="0 0 420 115"><path d="M0 104H420" stroke="#8b8261" stroke-width="3"/><g class="visiting-troll"><ellipse cx="67" cy="66" rx="37" ry="30" fill="#879469"/><path d="M43 37L26 18L57 27M85 35L104 16L78 25" fill="#b5bc8a"/><ellipse cx="68" cy="35" rx="29" ry="28" fill="#9fab7b"/><circle cx="57" cy="29" r="4"/><circle cx="78" cy="29" r="4"/><path d="M53 47Q68 57 84 43" fill="none" stroke="#343a27" stroke-width="4"/><path d="M39 80L28 99H58L60 82M77 80L80 99H109L98 81" fill="#687b58"/></g><g fill="#8b6546"><ellipse cx="320" cy="95" rx="32" ry="10"/><ellipse cx="320" cy="82" rx="23" ry="10"/><ellipse cx="324" cy="69" rx="12" ry="10"/></g></svg></div>`;
  const contentRenderReward=renderWaveReward;
  renderWaveReward=function(){
    if(trollQuest?.status==='soiled'){
      mode='upgrade';showOverlay(`<span class="eyebrow">1 % PECH · BERGTROLL ZU BESUCH</span><h2 id="overlayTitle">DAS WAR KEIN UPGRADE.</h2>${trollArt}<p>Ein Bergtroll hat auf deine Upgrades gekackt. Diese Auswahl ist unbrauchbar. In der nächsten Welle stellt er sich dir – danach warten drei garantierte Legendary-Angebote, von denen du eines wählen kannst.</p><div class="upgrades soiled-upgrades">${activeRewardChoices.map(c=>`<button class="upgrade" disabled><small>UNBRAUCHBAR</small><span class="upgrade-icon">${poopMark}</span><strong>${c.title}</strong><span>Vom Bergtroll verdorben.</span></button>`).join('')}</div><button class="primary-button" id="trollContinue">TROLL SUCHEN · OHNE UPGRADE WEITER ↗</button>`);
      $('trollContinue').onclick=()=>{if(mode!=='upgrade'||trollQuest?.status!=='soiled')return;trollQuest.status='pending';player.waveShuffle=0;continueAfterWave();saveRunNow();};return;
    }
    if(trollQuest?.status==='reward'){
      mode='upgrade';showOverlay(`<span class="eyebrow">BERGTROLL BESIEGT · GARANTIERTE LEGENDARIES</span><h2 id="overlayTitle">GOLD STATT GESTANK.</h2><p>Die versprochene Entschädigung: Wähle genau eines dieser drei legendären Upgrades. Kein Shuffle nötig.</p><div class="upgrades reward-upgrades troll-legend-upgrades">${activeRewardChoices.map((c,i)=>`<button class="upgrade ${rarityClass(c)}" id="trollLegend${i}" data-skill="${c.id}"><small class="upgrade-kind">LEGENDARY · ${c.weapon?'WAFFE':c.repeatable?'VORRAT':'SKILL'}</small><span class="upgrade-icon">${c.icon}</span><strong>${c.title}</strong><span>${c.desc}</span><em>WÄHLEN ↗</em></button>`).join('')}</div>`);
      activeRewardChoices.forEach((c,i)=>{$('trollLegend'+i).onclick=()=>{if(mode!=='upgrade'||trollQuest?.status!=='reward')return;grantReward(c);trollQuest=null;player.waveShuffle=0;continueAfterWave();saveRunNow();};});return;
    }
    contentRenderReward();
  };
  const contentShuffle=shuffleWaveRewards;
  shuffleWaveRewards=function(){if(trollQuest&&['soiled','reward'].includes(trollQuest.status))return;contentShuffle();saveRunNow();};
  const contentStartWave=startWave;
  startWave=function(next,keepRetries=false){
    contentStartWave(next,keepRetries);contentEffects=[];contentCompanion=null;scoreFallback=null;pendingBossKind=null;pendingBossChoices=[];interludeKind=null;
    if(trollQuest&&(trollQuest.status==='pending'||keepRetries&&trollQuest.wave===next&&['fighting','defeated'].includes(trollQuest.status))){trollQuest.status='fighting';trollQuest.wave=next;trollQuest.spawned=false;minibossPlan=null;}
    if(endlessMode&&next===9&&!player.endlessHitEver)addAchievementProgress('endless_10_perfect');
    if(hardMode&&endlessMode&&next>=9)addAchievementProgress('hard_survival_10');saveRunNow();
  };
  function spawnBergtroll(){
    const e=spawnEnemy('brute'),p=safeSpawnPoint(),scale=endlessMode?endlessHpScale(wave)*(endlessFromHall?2.9:1):campaignHpScale();
    Object.assign(e,p,{type:'bergTroll',troll:true,miniBoss:true,hp:90*scale*(hardMode?1.18:1),maxHp:90*scale*(hardMode?1.18:1),r:34,speed:65*(hardMode?1.08:1),points:2100+wave*100,fireCd:2.5,spawnGrace:1.2,pattern:0});
    announce('DER BERGTROLL IST DA','BESIEGE IHN UND DIE WELLE · 3 LEGENDARY-ANGEBOTE');return e;
  }
  function showOttahInterlude(){
    interludeKind='ottah';boss=null;mode='interlude';
    showOverlay(`<span class="eyebrow">${hardMode?'HARD · ':''}NG+2 · EINE LETZTE STAGE</span><h2 id="overlayTitle">DA GRUNZT NOCH WAS.</h2><p>Karnil ist erledigt. Hinter der Sahneküche wartet Ottah: drei Phasen${hardMode?' und eine zusätzliche Hard-Phase':''}, bemerkenswert schlechte Laune.</p><button class="primary-button" id="ottahStart">ZU OTTAH ↗</button>`);
    $('ottahStart').onclick=()=>{if(mode!=='interlude')return;hideOverlay();mode='playing';spawnOttah();saveRunNow();};
  }
  function afterBossReward(kind){
    scoreFallback=null;
    if(kind==='general')showGeneralInterlude();else if(kind==='cyber')showCyberInterlude();
    else if(kind==='endless'){boss=null;mode='playing';startWave(wave+1);}
    else if(kind==='karnil'&&gamePlusLevel===2){player.hp=player.maxHp;stageVisual=3;makeGround();showOttahInterlude();}
    else{boss=null;mode='playing';finish(true);}saveRunNow();
  }
  bossUpgradeScreen=function(kind){
    pendingBossKind=kind;stageAfterBoss(kind);refillWeaponsAfterWave();mode='bossUpgrade';resetInput();enemies=[];bullets=[];enemyBullets=[];hazards=[];pickups=[];contentEffects=[];contentCompanion=null;
    $('bossHud').classList.add('hidden');$('announcement').classList.add('hidden');const index=kind==='general'?0:kind==='cyber'?1:2,unowned=availableRewards(true).filter(c=>c.special);
    pendingBossChoices=shuffled(unowned.filter(c=>specialUpgradePools[index].includes(c.id))).slice(0,3);
    for(const c of shuffled(unowned))if(pendingBossChoices.length<3&&!pendingBossChoices.some(v=>v.id===c.id))pendingBossChoices.push(c);
    if(!pendingBossChoices.length&&endlessMode)pendingBossChoices=shuffled(availableRewards(true)).slice(0,3);
    renderBossReward();saveRunNow();
  };
  function renderBossReward(){
    mode='bossUpgrade';const choices=pendingBossChoices;
    if(!choices.length){
      if(endlessMode){showScoreSkillMenu(()=>afterBossReward(pendingBossKind));return;}
      showOverlay('<span class="eyebrow">BOSS GESCHAFFT</span><h2 id="overlayTitle">BEUTE LEERGEKNABBERT.</h2><p>Du besitzt bereits alle Boss-Upgrades. Als Vorrat erhältst du +1 maximales Herz (max. 30) und volle Heilung.</p><button class="primary-button" id="bossSupplyReward">VORRÄTE NEHMEN ↗</button>');
      $('bossSupplyReward').onclick=()=>{if(mode!=='bossUpgrade')return;player.maxHp++;normalizeBuild(player);player.hp=player.maxHp;afterBossReward(pendingBossKind);};return;
    }
    showOverlay(`<span class="eyebrow">${hardMode?'HARD · ':''}BOSS GESCHAFFT · ${stageNames[stageVisual]}</span><h2 id="overlayTitle">BEUTE AUS DEM BOSS.</h2><p>Wähle ein Upgrade. Alle Spezialwaffen sind nachgeladen.</p><div class="upgrades special-upgrades">${choices.map((c,i)=>`<button class="upgrade ${rarityClass(c)}" id="specialUpgrade${i}" data-skill="${c.id}"><small class="upgrade-kind">${c.special?'BOSS-UPGRADE':c.legendary?'LEGENDARY':c.weapon?'WAFFE':'SKILL'}</small><span class="upgrade-icon">${c.icon}</span><strong>${c.title}</strong><span>${c.desc}</span><em>WÄHLEN ↗</em></button>`).join('')}</div>`);
    choices.forEach((c,i)=>{$('specialUpgrade'+i).onclick=()=>{if(mode!=='bossUpgrade')return;grantReward(c);player.weaponUses.nutBomb=maxWeaponAmmo('nutBomb');afterBossReward(pendingBossKind);};});
  }

  Object.assign(extraEnemyBook,{
    platedHare:{name:'SCHLACKENHASE',stats:[10,83,23,300],color:'#dca487',species:'rabbit',hard:true,unlock:'Hard · Welle 2'},
    ashThrower:{name:'ASCHEWERFER',stats:[13,59,24,390],color:'#d8ab69',species:'pig',hard:true,unlock:'Hard · Welle 4'},
    shardHunter:{name:'SCHERBENJÄGER',stats:[12,116,21,440],color:'#a3c1ed',species:'rabbit',hard:true,unlock:'Hard · Welle 6'},
    cursePig:{name:'FLUCHFERKEL',stats:[19,66,29,560],color:'#c99ed5',species:'pig',hard:true,unlock:'Hard · Welle 8'}
  });
  function hardEnemyChoice(type){
    if(!hardMode||wave<1||Math.random()>(wave<3?.13:.20)||enemies.filter(e=>e.hardType&&!e.dead).length>=4)return type;
    const pool=['platedHare',...(wave>=3?['ashThrower']:[]),...(wave>=5?['shardHunter']:[]),...(wave>=7?['cursePig']:[])].filter(id=>enemies.filter(e=>e.type===id&&!e.dead).length<2);
    return pool.length?pool[Math.floor(Math.random()*pool.length)]:type;
  }
  const contentSpawnEnemy=spawnEnemy;
  spawnEnemy=function(type){
    if(extraEnemyBook[type]?.hard&&!hardMode)type='brute';
    const e=contentSpawnEnemy(type);if(hardMode){e.hp*=1.18*(impossibleMode?1.35:1);e.maxHp=e.hp;e.speed*=1.08*(impossibleMode?1.07:1);e.actionRate*=1.12*(impossibleMode?1.13:1);}
    if(extraEnemyBook[e.type]?.hard)e.hardType=e.type;return e;
  };
  const contentSpawnMini=spawnWaveMini;
  spawnWaveMini=function(kind){const e=contentSpawnMini(kind);if(hardMode){e.hp*=1.18;e.maxHp=e.hp;e.speed*=1.08;}return e;};
  const contentSpawnZombie=spawnZombieHasenbein,contentSpawnCyber=spawnCyberHasenbein;
  function scaleStoryMini(e){if(e&&hardMode){e.hp*=1.18;e.maxHp=e.hp;e.speed*=1.08;}return e;}
  spawnZombieHasenbein=function(){return scaleStoryMini(contentSpawnZombie());};spawnCyberHasenbein=function(){return scaleStoryMini(contentSpawnCyber());};
  const contentSpawnBoss=spawnBoss,contentSpawnOttah=spawnOttah,contentSpawnEndless=spawnEndlessBoss;
  function scaleHardBoss(){contentEffects=[];contentCompanion=null;if(hardMode&&boss){boss.hp*=1.08*(impossibleMode?1.28:1);boss.maxHp=boss.hp;boss.speed*=1.05*(impossibleMode?1.06:1);}updateHud();saveRunNow();}
  spawnBoss=function(...args){contentSpawnBoss(...args);player.impossibleBossHits=0;scaleHardBoss();};spawnOttah=function(...args){contentSpawnOttah(...args);player.impossibleBossHits=0;scaleHardBoss();};spawnEndlessBoss=function(...args){contentSpawnEndless(...args);player.impossibleBossHits=0;scaleHardBoss();};
  function contentDamageMultiplier(e){if(e.hardGuard>0)return 0;return (player.madelpulator?1.9:1)*(player.defianceReactor&&player.hp/player.maxHp<.5?1.2:1);}
  function eraseNearbyShots(from,r,max){let n=0;enemyBullets=enemyBullets.filter(b=>!(dist(b,from)<r&&n++<max));}
  function onContentKill(e){
    if(e.troll&&trollQuest?.status==='fighting')trollQuest.status='defeated';
    if(hardMode&&isBoss(e))addAchievementProgress('hard_first_boss');
    if(impossibleMode&&isBoss(e)&&!e.pafti&&player.impossibleBossHits===0)addAchievementProgress('impossible_boss_perfect');
    if(player.nightShift){player.nightKills=(player.nightKills||0)+1;if(player.nightKills%25===0){player.nightTime=8;floater(player.x,player.y-45,'NACHTSCHICHT · +15 % FEUER','#baceff');}}
  }
  const contentHurtPlayer=hurtPlayer;
  hurtPlayer=function(damage=1,source=null){const before=player?.hp;contentHurtPlayer(damage,source);if(player?.cheeseInsurance&&player.hp<before&&(player.cheeseCd||0)<=0){player.cheeseCd=8;eraseNearbyShots(player,100,3);burst(player.x,player.y,'#efd28e',15,130);}};
  const contentConsume=consumeWeapon;
  consumeWeapon=function(id){const ok=contentConsume(id);if(ok&&player.recallService){player.recallUses=(player.recallUses||0)+1;if(player.recallUses>=3&&(player.recallCd||0)<=0){const other=shuffled(player.weapons.filter(x=>x!==id&&weaponAmmo(x)<maxWeaponAmmo(x)))[0];if(other){player.weaponUses[other]++;player.recallUses=0;player.recallCd=10;floater(player.x,player.y-35,'RÜCKRUF +1 '+weaponBook[other].icon,'#b9dfc6');updateWeaponHud();}}}return ok;};
  const contentDash=useDash;
  useDash=function(){const before=player?.dashCount;contentDash();if(player?.fartBottle&&player.dashCount>before&&(player.fartCd||0)<=0){player.fartCd=4.5;contentEffects.push({kind:'gas',x:player.x,y:player.y,r:85,life:3,tick:.3,damage:1.2*Math.sqrt(player.damage)});}};
  function contentProjectile(from,a,damage,opts={}){bullets.push({x:from.x,y:from.y,vx:Math.cos(a)*(opts.speed||540),vy:Math.sin(a)*(opts.speed||540),a,life:1.7,damage,pierce:0,hitIds:new Set(),r:6,...opts});}
  function contentChicks(from,count,damage){for(let i=0;i<count&&ratSwarms.length<60;i++){const t=nearestTarget(from,700),a=t?Math.atan2(t.y-from.y,t.x-from.x)+(i-(count-1)/2)*.14:rnd(0,TAU);ratSwarms.push({x:from.x,y:from.y,a,life:2.8,maxLife:2.8,age:.19,damage,kind:'chick',r:8});}}
  const contentNewWeapon=useNewWeapon;
  useNewWeapon=function(id){
    if(!['incubator','corkscrew','goulashStorm','creamCompressor','starStomper','scrapSpinner','stormJar','sunBrood'].includes(id))return contentNewWeapon(id);
    player.weaponShots++;const sm=player.specialDamage,t=weaponTarget(440);
    if(id==='incubator'){contentEffects.push({kind:'incubator',...t,life:4,tick:.28,remaining:8,damage:6*sm});}
    else if(id==='corkscrew'){for(const off of [-.16,0,.16])contentProjectile(player,player.angle+off,14*sm,{pierce:2,r:10,pretzel:true,speed:630});}
    else if(id==='goulashStorm'){for(let i=0;i<3;i++){const a=i*TAU/3;hazards.push({type:'friendlyMortar',x:clamp(t.x+Math.cos(a)*48,55,W-55),y:clamp(t.y+Math.sin(a)*48,118,H-55),r:85,wait:.55+i*.26,life:.35,hit:false,friendly:true,damage:20*sm});}}
    else if(id==='creamCompressor'){
      for(const off of [-.28,-.14,0,.14,.28]){const a=player.angle+off,to={x:player.x+Math.cos(a)*350,y:player.y+Math.sin(a)*350};particles.push({type:'beam',x:player.x,y:player.y,x2:to.x,y2:to.y,life:.26,maxLife:.26,color:'#ffedc6'});for(const e of combatTargets()){if(segmentDistance(e,player,to)<e.r+12){damageEnemy(e,12*sm,true);if(!isBoss(e)&&!e.miniBoss){e.x=clamp(e.x+Math.cos(a)*18,40,W-40);e.y=clamp(e.y+Math.sin(a)*18,118,H-45);}}if(mode!=='playing')break;}}
      let n=0;enemyBullets=enemyBullets.filter(b=>!(dist(b,player)<350&&Math.abs(angleDelta(Math.atan2(b.y-player.y,b.x-player.x),player.angle))<.45&&n++<12));
    }else if(id==='starStomper'){hazards.push({type:'friendlyMortar',...t,r:190,wait:.7,life:.35,hit:false,friendly:true,damage:52*sm,ice:true});}
    else if(id==='scrapSpinner'){for(const off of [-.13,.13]){const a=player.angle+off;thrownWeapons.push({type:'boomerang',x:player.x,y:player.y,startX:player.x,startY:player.y,vx:Math.cos(a)*470,vy:Math.sin(a)*470,life:1.72,damage:14*sm,returning:false,hitIds:new Set(),r:14});}}
    else if(id==='stormJar'){contentEffects.push({kind:'stormJar',...t,life:3.6,tick:.4,remaining:3,damage:22*sm});}
    else if(id==='sunBrood'){hazards.push({type:'friendlyMortar',...t,r:160,wait:.65,life:.35,hit:false,friendly:true,damage:65*sm});contentEffects.push({kind:'sunEgg',...t,life:.66,tick:.65,damage:3*sm});}
    // A finite actor budget also bounds memory in long, heavily upgraded runs.
    if(contentEffects.length>24)contentEffects.splice(0,contentEffects.length-24);
    tone(460,.18,'triangle',.06,820);return true;
  };
  function brunoPosition(){const top=viewW<950?305:145;return {x:clamp(camX+viewW-57,65,W-50),y:clamp(camY+top,145,H-60)};}
  const contentExpansion=updateExpansion;
  updateExpansion=function(dt){contentExpansion(dt);if(mode!=='playing')return;updateContent(dt);};
  function updateContent(dt){
    for(const key of ['cheeseCd','recallCd','fartCd','nightTime'])player[key]=Math.max(0,(player[key]||0)-dt);
    if(trollQuest?.status==='fighting'&&!trollQuest.spawned&&!boss&&waveTime>=6){trollQuest.spawned=true;spawnBergtroll();}
    const rootDamage=Math.sqrt(player.damage),targets=combatTargets();
    if(player.creamPuff){player.puffCd=(player.puffCd??1)-dt;if(player.puffCd<=0){player.puffCd=7;contentEffects.push({kind:'puff',x:player.x,y:player.y,r:14,life:5,angle:runTime*2,damage:3.2*rootDamage});}}
    if(player.bruno){player.brunoCd=(player.brunoCd||0)-dt;const from=brunoPosition(),target=nearestTarget(from,1500);if(target&&player.brunoCd<=0){player.brunoCd=.85;contentProjectile(from,Math.atan2(target.y-from.y,target.x-from.x),2*rootDamage,{ping:true,pierce:1,speed:650,life:2.1,r:7});}}
    if(player.pigHose){player.hoseCd=(player.hoseCd||0)-dt;const t=nearestTarget(player,240);if(t&&player.hoseCd<=0){player.hoseCd=2.4;const a=Math.atan2(t.y-player.y,t.x-player.x),to={x:player.x+Math.cos(a)*240,y:player.y+Math.sin(a)*240};particles.push({type:'beam',x:player.x,y:player.y,x2:to.x,y2:to.y,life:.25,maxLife:.25,color:'#f4b7c6'});for(const e of targets)if(!e.dead&&segmentDistance(e,player,to)<e.r+11){e.slow=Math.max(e.slow||0,1);damageEnemy(e,3*rootDamage);if(mode!=='playing')return;}}}
    if(player.wollenkamps){
      contentCompanion??={x:player.x-38,y:player.y+25,cooldown:1,talk:0};const c=contentCompanion;c.cooldown=Math.max(0,c.cooldown-dt);c.talk=Math.max(0,c.talk-dt);
      const t=c.cooldown<=0?nearestTarget(c,1500):null,dest=t||{x:player.x-45,y:player.y+30},d=dist(c,dest);
      if(d>35){const step=Math.min(d-35,165*dt);c.x+=(dest.x-c.x)/d*step;c.y+=(dest.y-c.y)/d*step;}
      if(t&&d<80&&c.cooldown<=0){c.cooldown=6.5;c.talk=2;c.line=shuffled(['Schon wieder Regen!','Dieses Wetter!','Früher war mehr Sonne.','Haben Sie einen Schirm?','Der Wind ist ja frech!','Die Wolken sind beleidigt.','Nass bis ins Fell!','Morgen wird es besser.','Das ist doch kein Sommer!','Ich melde das dem Wetteramt.','Wo ist mein Regenschirm?','Die Luft riecht nach Ärger.','Die Sonne macht Überstunden.','Das gibt Gewitter!'])[0];if(isBoss(t)||t.miniBoss)t.slow=Math.max(t.slow||0,1.4);else t.discussTime=1.8;burst(t.x,t.y,'#d3c7ef',6,45);}
    }
    if(player.crunchChronicle){player.chronicleCd=(player.chronicleCd??3)-dt;if(player.chronicleCd<=0){player.chronicleCd=12;contentEffects.push({kind:'timeBubble',x:player.x,y:player.y,r:145,life:3});eraseNearbyShots(player,145,8);}}
    for(const f of contentEffects){
      f.life-=dt;if(f.tick!==undefined)f.tick-=dt;
      if(f.kind==='puff'){
        f.angle+=dt*2.5;f.x=player.x+Math.cos(f.angle)*65;f.y=player.y+Math.sin(f.angle)*48;
        if(targets.some(e=>!e.dead&&dist(e,f)<e.r+f.r)){f.life=0;burst(f.x,f.y,'#ffebc1',20,150);for(const e of targets)if(!e.dead&&dist(e,f)<85+e.r){e.slow=Math.max(e.slow||0,1.2);damageEnemy(e,f.damage);if(mode!=='playing')return;}}
      }else if(f.kind==='gas'&&f.tick<=0){f.tick=.6;for(const e of targets)if(!e.dead&&dist(e,f)<f.r+e.r){if(!isBoss(e)&&!e.miniBoss)e.slow=Math.max(e.slow||0,.8);damageEnemy(e,f.damage);if(mode!=='playing')return;}}
      else if(f.kind==='incubator'&&f.remaining>0&&f.tick<=0){f.tick=.4;f.remaining--;contentChicks(f,1,f.damage);}
      else if(f.kind==='stormJar'&&f.remaining>0&&f.tick<=0){const t=nearestTarget(f,350);if(t){f.tick=1.05;f.remaining--;particles.push({type:'beam',x:f.x,y:f.y,x2:t.x,y2:t.y,life:.24,maxLife:.24,color:'#b5ddff'});damageEnemy(t,f.damage);if(mode!=='playing')return;}}
      else if(f.kind==='sunEgg'&&f.tick<=0){contentChicks(f,6,f.damage);f.life=0;f.tick=99;}
      else if(f.kind==='timeBubble')for(const e of targets)if(!e.dead&&dist(e,f)<f.r+e.r)e.slow=Math.max(e.slow||0,.35);
    }
    contentEffects=contentEffects.filter(f=>f.life>0);
  }
  function updateContentEnemy(e,dt){
    const a=Math.atan2(player.y-e.y,player.x-e.x),d=dist(e,player),slow=(e.slow>0?.7:1)*(player.powerups.freeze>0?.65:1);
    e.shieldTime=Math.max(0,(e.shieldTime||0)-dt);
    if(e.charge>0){e.charge-=dt;e.x+=Math.cos(e.aim)*380*slow*dt;e.y+=Math.sin(e.aim)*380*slow*dt;return;}
    if(e.windup>0){e.windup-=dt;if(e.windup<=0){
      e.pattern=(e.pattern||0)+1;
      if(e.troll){if(e.pattern%2){for(let i=-2;i<=2;i++)enemyShot(e.x,e.y,e.aim+i*.23,215,true);}else for(let i=-1;i<=1;i++)hazards.push({type:'mortar',x:clamp(e.targetX+i*95,65,W-65),y:clamp(e.targetY+(i?0:70),140,H-60),r:57,wait:1.1,life:.3,hit:false,damage:1.5});}
      else if(e.hardType==='platedHare'){e.shieldTime=1.1;for(let i=-1;i<=1;i++)enemyShot(e.x,e.y,e.aim+i*.19,250,true);}
      else if(e.hardType==='ashThrower'){for(let i=-1;i<=1;i++)hazards.push({type:'mortar',x:clamp(e.targetX+i*85,60,W-60),y:clamp(e.targetY,135,H-55),r:49,wait:1.0+Math.abs(i)*.18,life:.32,hit:false,damage:1.5});}
      else if(e.hardType==='shardHunter'){e.charge=.42;for(const off of [-.65,.65])enemyShot(e.x,e.y,e.aim+off,220,true);}
      else if(e.hardType==='cursePig'){const n=10,gap=e.pattern%n;for(let i=0;i<n;i++)if(i!==gap&&i!==(gap+1)%n)enemyShot(e.x,e.y,i*TAU/n,190,true);}
    }return;}
    const stop=e.hardType==='shardHunter'?100:260;if(d>stop){e.x+=Math.cos(a)*e.speed*slow*dt;e.y+=Math.sin(a)*e.speed*slow*dt;}
    if(e.fireCd<=0){e.windup=e.troll?1:.85;e.aim=a;e.targetX=player.x;e.targetY=player.y;e.fireCd=e.troll?3.8:4.1;}
  }
  function drawContentBullet(b){ctx.save();ctx.translate(b.x,b.y);ellipse(ctx,0,0,b.r,b.r,b.ping?'#fff6d9':'#f4dba9');ellipse(ctx,-2,-2,2,2,'#ffffff');ctx.restore();}
  function drawContentEnemy(e){
    const cfg=extraEnemyBook[e.hardType],color=e.hit>0?'#fff6df':e.troll?'#91a477':cfg.color;
    ctx.save();ctx.translate(e.x,e.y);if(e.spawnGrace>0)ctx.globalAlpha=.55;const r=e.r;
    ellipse(ctx,0,r*.65,r*.9,9,'#09201d88');ellipse(ctx,0,0,r,r,color);
    if(e.troll){path(ctx,[[-r*.7,-r*.5],[-r,-r*1.2],[-r*.2,-r*.8]],'#d7c89c');path(ctx,[[r*.7,-r*.5],[r,-r*1.2],[r*.2,-r*.8]],'#d7c89c');ellipse(ctx,0,7,15,10,'#bdc398');}
    else if(cfg.species==='rabbit'){ellipse(ctx,-r*.45,-r,6,17,color,-.2);ellipse(ctx,r*.45,-r,6,17,color,.2);}else{path(ctx,[[-20,-12],[-26,-33],[-7,-19]],color);path(ctx,[[20,-12],[26,-33],[7,-19]],color);ellipse(ctx,0,6,12,8,'#edb9ad');}
    ellipse(ctx,-r*.35,-7,3,4,'#243332');ellipse(ctx,r*.35,-7,3,4,'#243332');ctx.strokeStyle='#503e36';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-9,17);ctx.lineTo(9,14);ctx.stroke();
    if(e.hardType==='platedHare'){path(ctx,[[-21,0],[0,-13],[21,0],[0,30]],'#626b80');ctx.strokeStyle='#c2d7dd';ctx.strokeRect(-13,0,26,14);}
    if(e.shieldTime>0){ctx.strokeStyle='#bddfff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,r+5,0,TAU);ctx.stroke();}
    ctx.restore();if(e.hp<e.maxHp||e.troll){ctx.fillStyle='#17272c';ctx.fillRect(e.x-30,e.y-r-31,60,5);ctx.fillStyle=color;ctx.fillRect(e.x-30,e.y-r-31,60*Math.max(0,e.hp/e.maxHp),5);}
    if(e.troll){ctx.fillStyle='#dcecc0';ctx.textAlign='center';ctx.font='bold 11px Arial';ctx.fillText('BERGTROLL',e.x,e.y-r-38);}
  }
  const contentDrawExpansion=drawExpansion;
  drawExpansion=function(){contentDrawExpansion();drawContent();};
  function drawContent(){
    for(const f of contentEffects){ctx.save();ctx.translate(f.x,f.y);
      if(f.kind==='puff'){ellipse(ctx,0,3,15,10,'#c3915e');ellipse(ctx,0,-3,13,8,'#fff1cb');ellipse(ctx,-4,-8,6,5,'#fff7e4');}
      else if(f.kind==='gas'||f.kind==='timeBubble'){ctx.globalAlpha=Math.min(.28,f.life*.18);ellipse(ctx,0,0,f.r,f.r,f.kind==='gas'?'#b0c778':'#b6d7f0');ctx.globalAlpha=.75;ctx.strokeStyle=f.kind==='gas'?'#d6e393':'#c2e4ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,f.r,0,TAU);ctx.stroke();if(f.kind==='gas'){ctx.fillStyle='#a4bd68';ctx.fillRect(-6,-12,12,21);ctx.fillRect(-3,-18,6,6);}}
      else if(f.kind==='incubator'){ctx.fillStyle='#a98764';ctx.fillRect(-20,-12,40,30);ctx.strokeStyle='#ead9a1';ctx.lineWidth=3;ctx.strokeRect(-20,-12,40,30);for(const x of [-10,0,10])ellipse(ctx,x,3,5,7,'#fff2c9');}
      else if(f.kind==='stormJar'){ctx.fillStyle='#b6dff078';ctx.fillRect(-13,-20,26,37);ctx.strokeStyle='#d2eef9';ctx.lineWidth=2;ctx.strokeRect(-13,-20,26,37);path(ctx,[[4,-16],[-7,0],[1,0],[-3,14],[9,-4],[2,-4]],'#f8dc80');}
      else if(f.kind==='sunEgg'){ellipse(ctx,0,0,20,25,'#f8d477');ellipse(ctx,-6,-9,6,9,'#fff6c7');}ctx.restore();
    }
    if(player.bruno){const p=brunoPosition();ctx.save();ctx.translate(p.x,p.y);ellipse(ctx,0,30,32,7,'#101e2177');ctx.fillStyle='#785c65';ctx.fillRect(-29,-13,58,48);ctx.fillStyle='#a77a7c';ctx.fillRect(-31,9,14,25);ctx.fillRect(17,9,14,25);ellipse(ctx,0,5,20,23,'#c99a96');ellipse(ctx,0,-16,18,19,'#dfb3a4');path(ctx,[[-13,-25],[-22,-38],[-5,-32]],'#d3a399');path(ctx,[[13,-25],[22,-38],[5,-32]],'#d3a399');ellipse(ctx,0,-10,10,7,'#efc1b4');ellipse(ctx,-6,-20,2,3,'#313438');ellipse(ctx,6,-20,2,3,'#313438');ellipse(ctx,27,1,9,12,'#dabb70',-.3);ctx.fillStyle='#e9d9bb';ctx.font='bold 10px Arial';ctx.textAlign='center';ctx.fillText('BRUNO STERNI',0,48);ctx.restore();}
    if(player.wollenkamps&&contentCompanion){const c=contentCompanion;ctx.save();ctx.translate(c.x,c.y);ellipse(ctx,0,22,19,5,'#0b242277');path(ctx,[[-9,-1],[9,-1],[17,21],[-17,21]],'#8b7eb0');ellipse(ctx,0,-11,11,13,'#edc6ac');for(const x of [-8,0,8])ellipse(ctx,x,-22,6,6,'#d8d6cf');ctx.strokeStyle='#cbbada';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(18,-3);ctx.lineTo(18,24);ctx.stroke();ctx.restore();if(c.talk>0){ctx.font='bold 12px Arial';ctx.textAlign='center';const x=clamp(c.x,105,W-105),y=c.y-42;ctx.fillStyle='#f2edda';ctx.fillRect(x-92,y-17,184,25);ctx.fillStyle='#424350';ctx.fillText(c.line,x,y);}}
    if(boss?.hardFinal){ctx.save();ctx.strokeStyle='#ffab84';ctx.lineWidth=3;ctx.setLineDash([9,9]);ctx.beginPath();ctx.arc(boss.x,boss.y,boss.r+10,0,TAU);ctx.stroke();if(boss.hardWindup>0){ctx.translate(boss.x,boss.y);ctx.rotate(boss.hardAim);path(ctx,[[0,-15],[500,-90],[500,90],[0,15]],'#ffad7440');}ctx.restore();}
  }
  const contentClearExtras=clearCombatExtras;
  clearCombatExtras=function(){contentClearExtras();contentEffects=[];contentCompanion=null;};
  const contentHelp=helpMarkup;
  helpMarkup=function(){return contentHelp();};
  function initContentPatch(){
    if(hardUnlocked()&&!hardProgress.unlocked){hardProgress.unlocked=true;saveHardProgress();}
    if((hardProgress.endless||achievementUnlocked('hard_ng2_clear')||hallOfFame.some(r=>r.hardMode))&&!impossibleProgress.unlocked){hardProgress.endless=true;impossibleProgress.unlocked=true;saveHardProgress();saveImpossibleProgress();}
    if(!unlockedSkins().has(selectedSkin))selectedSkin='classic';
    $('continueRunButton').onclick=resumeSavedRun;$('startButton').onclick=()=>chooseRunMode(0);$('ngPlusButton').onclick=()=>requestRunStart(1,false);$('ngPlus2Button').onclick=()=>requestRunStart(2,false);$('hardModeButton').onclick=showHardModes;$('endlessButton').onclick=()=>chooseRunMode(3);$('impossibleButton').onclick=showImpossibleModes;$('skinsButton').onclick=()=>showSkins(false);$('buildShareButton').onclick=()=>showShare(false);
    window.addEventListener('pagehide',saveRunNow);window.addEventListener('beforeunload',saveRunNow);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)saveRunNow();});
    document.addEventListener('click',()=>{Promise.resolve().then(()=>{saveRunNow();if(mode==='menu')updateContinueButton();});});
    updateNGPlusMenu();
  }


  // Eichelkopf: additional normal rewards; existing mode gates and rarity rules remain intact.
  Object.assign(skillBook,{
    madelpulator:{icon:'⚕',title:'MADELPULATOR',short:'Madelpulator',desc:'Eine Injektion ins Hirn: +90 % auf sämtlichen Schaden, auch Waffen und Begleiter. Dafür verlierst du dauerhaft den Dash, seinen Schutz und alle Dash-Auslöser – auch in übernommenen Builds!',apply:p=>{p.madelpulator=true;p.dashTime=0;p.dashCd=0;}},
    knisterKnight:{icon:'⚔',title:'KNISTERRITTER',short:'Knisterritter',desc:'Ein knisternder Ritter schneidet alle 2,8 s diagonal durch den sichtbaren Kampfbereich. Pro Durchflug 4,2 × √Nussschaden je getroffenem Gegner. Verbraucht keine Munition.',apply:p=>{p.knisterKnight=true;p.knisterState=null;}}
  });
  weaponBook.sausageBlinker={name:'WURSTBLINKER',icon:'↯',desc:'Eine Wurst blinkt in drei explosiven Sprüngen entlang deiner Zielrichtung. Je Sprung 18 Basisschaden im Radius 58; bis zu 420 Reichweite, 3 Ladungen. Snickers bleibt an Ort und Stelle.',max:3};
  skillBook.sausageBlinker=weaponUnlock('sausageBlinker');
  ngPlusCarryKeys.push('madelpulator','knisterKnight');
  upgradePools.forEach(pool=>pool.push('madelpulator','knisterKnight','sausageBlinker'));
  const dashOnlyRewards=new Set(['shockDash','dashNova','fartBottle']);
  const eichelkopfAvailable=availableRewards;
  availableRewards=function(includeSpecial=false){return eichelkopfAvailable(includeSpecial).filter(c=>!player.madelpulator||!dashOnlyRewards.has(c.id));};
  const eichelkopfPerkAvailable=scorePerkAvailable;
  scorePerkAvailable=function(id){return !(player.madelpulator&&id==='dash')&&eichelkopfPerkAvailable(id);};
  const eichelkopfHud=updateHud;
  updateHud=function(){
    eichelkopfHud();if(!player)return;
    const locked=Boolean(player.madelpulator),button=$('touchDash');button.disabled=locked;button.setAttribute('aria-label',locked?'Madelpulator: Dash dauerhaft verloren':'Ausweichen');button.title=locked?'Madelpulator: +78 % Schaden, kein Dash':'Ausweichen';
    button.innerHTML=locked?'KEIN DASH<span>⚕</span>':'DASH<span>↗</span>';
    if(locked){$('dashFill').style.width='0%';$('dashLabel').textContent='MADELPULATOR · KEIN DASH';}
  };
  const eichelkopfBuildDetails=buildDetailsMarkup;
  buildDetailsMarkup=function(p,live=false){
    const note=p.madelpulator?'<p class="madelpulator-note"><strong>⚕ Madelpulator aktiv · +78 % Gesamtschaden.</strong> Der Dash ist dauerhaft verloren. Bereits gewählte Dash-Skills bleiben im Build, ihre Dash-Auslöser ruhen. Lauf-, Block- und Schadensboni dieser Skills wirken weiterhin. Auch neue Punkte-Boni stellen den Dash nicht wieder her.</p>':'';
    return note+eichelkopfBuildDetails(p,live);
  };
  const eichelkopfHelp=helpMarkup;
  helpMarkup=function(){return eichelkopfHelp();};

  const eichelkopfNewWeapon=useNewWeapon;
  useNewWeapon=function(id){
    if(id!=='sausageBlinker')return eichelkopfNewWeapon(id);
    player.weaponShots++;player.wurstBlinks??=[];
    player.wurstBlinks.push({x:player.x,y:player.y,a:player.angle,step:0,timer:.16,damage:18*player.specialDamage,pulses:[]});
    tone(230,.12,'square',.032,710);return true;
  };
  function knightRoute(step){
    const left=clamp(camX+20,25,W-65),right=clamp(camX+viewW-20,left+40,W-25),top=clamp(camY+135,135,H-100),bottom=clamp(camY+viewH-42,top+40,H-35);
    const corners=[{x:left,y:top},{x:right,y:top},{x:right,y:bottom},{x:left,y:bottom}],from=corners[step%4],to=corners[(step+2)%4];
    return {from,to};
  }
  // Short filtered noise bursts: crackles without samples or network requests.
  function knightCrackle(){
    if(!soundOn||!audioContext||document.hidden||settings.sfxMute||settings.volume<=0)return;
    try{
      const length=Math.floor(audioContext.sampleRate*.034),buffer=audioContext.createBuffer(1,length,audioContext.sampleRate),data=buffer.getChannelData(0);
      // Keep audio randomness separate from game RNG / loot.
      for(let i=0;i<length;i++)data[i]=(Math.sin(i*77.37)+Math.sin(i*31.13))*.5*(1-i/length);
      const source=audioContext.createBufferSource(),filter=audioContext.createBiquadFilter(),gain=audioContext.createGain();
      source.buffer=buffer;filter.type='highpass';filter.frequency.value=1800;gain.gain.value=.045*settings.volume/100;
      source.connect(filter);filter.connect(gain);gain.connect(audioContext.destination);source.start();source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
    }catch{}
  }
  const eichelkopfExpansion=updateExpansion;
  updateExpansion=function(dt){eichelkopfExpansion(dt);if(mode==='playing')updateEichelkopf(dt);};
  function updateEichelkopf(dt){
    if(player.knisterKnight){
      const k=player.knisterState??={phase:'rest',timer:.55,step:0,hitIds:new Set(),trail:[],crackle:0};
      k.timer-=dt;k.crackle-=dt;
      if(k.phase==='rest'&&k.timer<=0){Object.assign(k,knightRoute(k.step),{phase:'ready',timer:.3,hitIds:new Set(),trail:[]});k.x=k.from.x;k.y=k.from.y;}
      else if(k.phase==='ready'&&k.timer<=0){k.phase='slice';k.timer=1.4;k.crackle=0;}
      else if(k.phase==='slice'){
        const before={x:k.x,y:k.y},t=clamp(1-k.timer/1.4,0,1);k.x=k.from.x+(k.to.x-k.from.x)*t;k.y=k.from.y+(k.to.y-k.from.y)*t;
        k.trail.push(before);if(k.trail.length>9)k.trail.shift();
        if(k.crackle<=0){k.crackle=.16;knightCrackle();}
        for(const e of combatTargets())if(!k.hitIds.has(e)&&segmentDistance(e,before,k)<e.r+29){k.hitIds.add(e);damageEnemy(e,4.2*Math.sqrt(player.damage));if(mode!=='playing')return;}
        if(k.timer<=0){k.phase='rest';k.timer=1.1;k.step=(k.step+1)%4;k.hitIds.clear();k.trail=[];}
      }
    }
    for(const w of player.wurstBlinks||[]){
      for(const pulse of w.pulses)pulse.life-=dt;w.pulses=w.pulses.filter(p=>p.life>0);w.timer-=dt;
      if(w.step<3&&w.timer<=0){
        const next={x:clamp(w.x+Math.cos(w.a)*140,35,W-35),y:clamp(w.y+Math.sin(w.a)*140,118,H-35)};
        // No repeated wall-clamped explosions on one spot.
        if(w.step>0&&dist(w,next)<36){w.step=3;continue;}
        const from={x:w.x,y:w.y};w.x=next.x;w.y=next.y;w.step++;w.timer=.24;
        w.pulses.push({...next,from,life:.38});burst(next.x,next.y,'#efa8bb',9,85);tone(440+w.step*130,.08,'triangle',.045,190);
        for(const e of combatTargets())if(dist(e,next)<58+e.r){damageEnemy(e,w.damage,true);if(mode!=='playing')return;}
      }
    }
    player.wurstBlinks=(player.wurstBlinks||[]).filter(w=>w.step<3||w.pulses.length);
  }
  const eichelkopfClearExtras=clearCombatExtras;
  clearCombatExtras=function(){eichelkopfClearExtras();if(player){player.knisterState=null;player.wurstBlinks=[];}};

  const eichelkopfDrawExpansion=drawExpansion;
  drawExpansion=function(){eichelkopfDrawExpansion();drawEichelkopf();};
  function drawEichelkopf(){
    const k=player.knisterState;
    if(player.knisterKnight&&k&&k.phase!=='rest'){
      ctx.save();ctx.strokeStyle='#a9e9e644';ctx.lineWidth=2;ctx.setLineDash([7,12]);ctx.beginPath();ctx.moveTo(k.from.x,k.from.y);ctx.lineTo(k.to.x,k.to.y);ctx.stroke();ctx.setLineDash([]);
      if(k.phase==='slice'){
        k.trail.forEach((p,i)=>{ctx.globalAlpha=i/k.trail.length*.5;ellipse(ctx,p.x,p.y,17,13,'#d2e9ee');});ctx.globalAlpha=1;
        ctx.translate(k.x,k.y);ctx.rotate(Math.atan2(k.to.y-k.from.y,k.to.x-k.from.x));
        path(ctx,[[-7,-12],[-43,-23],[-28,0],[-45,23],[-7,13]],'#659fa7');
        ellipse(ctx,-6,0,19,14,'#647f93');path(ctx,[[-8,-14],[10,-12],[19,0],[10,12],[-8,14]],'#cedce1');ctx.fillStyle='#203c50';ctx.fillRect(5,-8,5,16);
        ctx.strokeStyle='#a7bdcb';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-11,-13);ctx.lineTo(-25,-20);ctx.moveTo(-11,13);ctx.lineTo(-25,20);ctx.stroke();
        ctx.rotate(-.8+Math.sin(runTime*15)*.35);path(ctx,[[4,-4],[48,-5],[61,0],[48,5],[4,4]],'#f5f8e2');ctx.fillStyle='#e9ba77';ctx.fillRect(4,-12,5,24);ctx.fillStyle='#48697c';ctx.fillRect(-9,-3,13,6);
        ctx.strokeStyle='#fff0b7';ctx.lineWidth=2;for(let i=0;i<4;i++){const a=runTime*18+i*1.5,r=30+(i%2)*12;ctx.beginPath();ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);ctx.lineTo(Math.cos(a)*(r+9),Math.sin(a)*(r+9));ctx.stroke();}
      }ctx.restore();
    }
    for(const w of player.wurstBlinks||[]){
      for(const p of w.pulses){ctx.save();ctx.globalAlpha=p.life/.38;ctx.strokeStyle='#f3b6ca';ctx.lineWidth=3;ctx.setLineDash([5,8]);ctx.beginPath();ctx.moveTo(p.from.x,p.from.y);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.setLineDash([]);ellipse(ctx,p.x,p.y,58*(1-p.life/.55),58*(1-p.life/.55),'#ecb3d023');ctx.beginPath();ctx.arc(p.x,p.y,58*(1-p.life/.55),0,TAU);ctx.stroke();ctx.restore();}
      ctx.save();ctx.translate(w.x,w.y);ctx.rotate(w.a);ctx.globalAlpha=w.step===3?Math.min(1,(w.pulses[0]?.life||0)/.3):1;ellipse(ctx,0,0,25,10,'#dd9384');ellipse(ctx,-3,-3,19,5,'#f2c0a2');path(ctx,[[-24,-4],[-32,-8],[-32,8],[-24,4]],'#b77978');path(ctx,[[24,-4],[32,-8],[32,8],[24,4]],'#b77978');ctx.strokeStyle='#9f555e';ctx.lineWidth=2;for(const x of [-9,0,9]){ctx.beginPath();ctx.moveTo(x-2,-5);ctx.lineTo(x+2,5);ctx.stroke();}ctx.restore();
    }
    if(player.madelpulator&&mode==='playing'){ctx.save();ctx.strokeStyle='#e4abd7';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(player.x-5,player.y-33);ctx.lineTo(player.x+5,player.y-33);ctx.moveTo(player.x,player.y-38);ctx.lineTo(player.x,player.y-28);ctx.stroke();ctx.restore();}
  }

  // Fleischer des Grauens: all new rewards use the existing 4 % Legendary offer and 1 % troll event.
  Object.assign(skillBook,{
    duden:passive('DER DUDEN','▤','Snickers lernt lesen: +12 % Schaden an normalen Gegnern und +8 % an Bossen. Markierte Schwachstellen leuchten auf.','duden'),
    krokette:{title:'KROKETTE IM ARSCH',short:'Krokette',icon:'♨',desc:'Eine heiße Krokette treibt Snickers an: +12 % Tempo und +12 % Feuerrate. Die üblichen Obergrenzen gelten.',apply:p=>{p.krokette=true;p.speed*=1.12;p.fireRate/=1.12;}},
    olangolil:passive('DER OLANGOLIL','▦','Olangolil spielt mitten in der Arena Bingo. Alle 8 s zieht er eine Zahl; ein Gewinn (spätestens beim dritten Zug) löst 5 s Raserei aus: alle 0,4 s ein Treffer gegen das nächste Ziel für 2,8 × √Nussschaden.','bingoMaster'),
    potencyMinister:passive('PILLEMAN POTENZ MINISTER','♧','Der Minister läuft über die Map. Alle 8 s prüft er einen Gegner: 6 s Schwachstelle (+14 % Schaden; Bosse +8 %) und 1,3 s Angriffspause bei normalen Gegnern.','potencyMinister'),
    steelMuzzle:passive('STAHLBEISSER','▣','+1 Herz und 7 % Blockchance. Eine robuste Absicherung für lange Runs.','steelMuzzle',{apply:p=>{p.steelMuzzle=true;p.maxHp++;p.hp=Math.min(p.maxHp,p.hp+1);p.damageGuard+=.07;}}),
    starIndex:passive('STERNKARTE AUS KÄSE','✧','+10 % Spezialschaden und +10 % Reichweite beim Einsammeln von Drops.','starIndex',{apply:p=>{p.starIndex=true;p.specialDamage*=1.10;p.magnet*=1.10;}})
  });
  Object.assign(ngPlusSkillBook,{
    ngFlicker:passive('FLACKERFELL','✦','NG+: +12 % Krit-Chance und +8 % Tempo.','ngFlicker',{ngplus:true,apply:p=>{p.ngFlicker=true;p.crit+=.12;p.speed*=1.08;}}),
    ngLedger:passive('NUSSBUCHHALTER','⊕','NG+: +16 % Spezialschaden und +1 maximale Ladung je Waffe.','ngLedger',{ngplus:true,apply:p=>{p.ngLedger=true;p.specialDamage*=1.16;p.ammoBonus++;}})
  });
  Object.assign(ngPlus2SkillBook,{
    ng2Pulse:passive('ENDZEIT-PULS','ϟ','NG+2: +18 % Schaden gegen Bosse und +10 % Nussschaden.','ng2Pulse',{ngplus2:true,apply:p=>{p.ng2Pulse=true;p.bossDamage=(p.bossDamage||1)*1.18;p.damage*=1.10;}}),
    ng2Shell:passive('PANZERKOPF','◇','NG+2: +2 Herzen, volle Heilung und +8 % Blockchance.','ng2Shell',{ngplus2:true,apply:p=>{p.ng2Shell=true;p.maxHp+=2;p.hp=p.maxHp;p.damageGuard+=.08;}})
  });
  Object.assign(survivalSkillBook,{
    endlessHarvest:passive('ENDLOSE ERNTE','✣','Nur Endlosmodus: Alle 30 Kills heilt Snickers ein Herz. Höchstens ein Auslöser je Kill.','endlessHarvest',{endless:true}),
    endlessShield:passive('LETZTE SCHICHT','◇','Nur Endlosmodus: +1 Herz und 8 % Blockchance, auch gegen späte Wellen.','endlessShield',{endless:true,apply:p=>{p.endlessShield=true;p.maxHp++;p.hp=Math.min(p.maxHp,p.hp+1);p.damageGuard+=.08;}})
  });
  Object.assign(legendarySkillBook,{
    bingoCrown:{title:'BINGO-KRONE',short:'Bingo-Krone',icon:'♛',desc:'Legendär: +15 % Nussschaden und +12 % Feuerrate.',legendary:true,apply:p=>{p.damage*=1.15;p.fireRate/=1.12;}},
    bunkerCheeks:{title:'BUNKERBACKEN',short:'Bunkerbacken',icon:'▣',desc:'Legendär: +3 Herzen, volle Heilung und +11 % Blockchance.',legendary:true,apply:p=>{p.maxHp+=3;p.hp=p.maxHp;p.damageGuard+=.11;}},
    scarletCompass:{title:'SCHARLACH-KOMPASS',short:'Scharlach-Kompass',icon:'✥',desc:'Legendär: +22 % Spezialschaden, +15 % Boss-Schaden und +25 Sammelradius.',legendary:true,apply:p=>{p.specialDamage*=1.22;p.bossDamage=(p.bossDamage||1)*1.15;p.magnet+=25;}},
    royalSpark:{title:'KÖNIGSFUNKEN',short:'Königsfunken',icon:'✹',desc:'Legendär: +12 % Krit-Chance, +1 Durchschlag und +10 % Nussschaden.',legendary:true,apply:p=>{p.crit+=.12;p.pierce++;p.damage*=1.10;}}
  });
  weaponBook.moonMill={name:'MONDMÜHLE',icon:'☾',desc:'Legendäre Waffe: 3 Kreissägen-Pulse im Radius 135 um das Ziel, je 19 × Spezialfaktor Schaden. 2 Ladungen.',max:2};
  legendarySkillBook.moonMill={...weaponUnlock('moonMill'),legendary:true};
  weaponBook.incubator.desc='Stellt am Ziel einen Brutkasten auf. Über 3 s schlüpfen 8 zielsuchende Küken, je 6 × Spezialfaktor Schaden. 4 Ladungen.';
  skillBook.incubator.desc=weaponBook.incubator.desc;
  ngPlusCarryKeys.push('bingoMaster','potencyMinister','duden','krokette','steelMuzzle','starIndex','ngFlicker','ngLedger','ng2Pulse','ng2Shell','endlessHarvest','endlessShield');
  const addedNormal=['duden','krokette','olangolil','potencyMinister','steelMuzzle','starIndex'];
  upgradePools.forEach((pool,i)=>pool.push(addedNormal[i%6],addedNormal[(i+2)%6],addedNormal[(i+4)%6]));
  Object.assign(specialUpgradeBook,{
    amberShield:{title:'BERNSTEIN-SCHUTZ',short:'Bernsteinschutz',icon:'◇',desc:'+2 Herzen, volle Heilung und +7 % Blockchance.',apply:p=>{p.maxHp+=2;p.hp=p.maxHp;p.damageGuard+=.07;}},
    recoilEngine:{title:'RÜCKSTOSS-MOTOR',short:'Rückstoß-Motor',icon:'⚙',desc:'+22 % Spezialschaden und +1 maximale Waffenladung.',apply:p=>{p.specialDamage*=1.22;p.ammoBonus++;}},
    sharpDentist:{title:'BOSS-ZAHNARZT',short:'Boss-Zahnarzt',icon:'⌖',desc:'+24 % Boss-Schaden und +5 % Krit-Chance.',apply:p=>{p.bossDamage=(p.bossDamage||1)*1.24;p.crit+=.05;}},
    fleaHop:{title:'FLOHSPRUNG',short:'Flohsprung',icon:'↗',desc:'+15 % Tempo und +10 % Feuerrate.',apply:p=>{p.speed*=1.15;p.fireRate/=1.10;}}
  });
  specialUpgradePools[0].push('amberShield','fleaHop');specialUpgradePools[1].push('sharpDentist','recoilEngine');specialUpgradePools[2].push('sharpDentist','amberShield','recoilEngine');
  skillBook.madelpulator.desc=skillBook.madelpulator.desc.replace('+90 %','+78 %');
  // Cap stacks before applying them; boolean skills and weapons remain unique.
  const stackCaps={rapid:3,power:3,turbo:2,health:2,ammo:3,specialCore:2,hunter:2,crit:2,powerLuck:2,ammoHunter:2,ironFur:2,scavenger:2};
  for(const [id,max] of Object.entries(stackCaps)){skillBook[id].repeatable=true;skillBook[id].maxStacks=max;skillBook[id].desc+=' Mehrfach wählbar (max. '+max+'×).';}
  const originalAvailableRewards=availableRewards;
  availableRewards=function(includeSpecial=false){
    const existing=originalAvailableRewards(includeSpecial);
    const extra=Object.entries(stackCaps).filter(([id,max])=>player.skills[id]>0&&player.skills[id]<max).map(([id])=>({...skillBook[id],id}));
    return [...existing,...extra];
  };
  const originalGrantReward=grantReward;
  grantReward=function(c){
    if(!c)return;
    if(c.repeatable&&!c.legendary&&!c.special){const count=player.skills[c.id]||0;if(count>=(c.maxStacks||1))return;c.apply(player);player.skills[c.id]=count+1;normalizeBuild(player);updateHud();updateSkills();saveRunNow();return;}
    originalGrantReward(c);
  };
  const originalNewWeapon=useNewWeapon;
  useNewWeapon=function(id){
    if(id==='moonMill'){player.weaponShots++;const t=weaponTarget(460);contentEffects.push({kind:'moonMill',...t,r:135,life:2.3,tick:.3,remaining:3,damage:19*player.specialDamage});tone(680,.19,'triangle',.05,280);return true;}
    return originalNewWeapon(id);
  };
  const originalUpdateContent=updateContent;
  updateContent=function(dt){
    originalUpdateContent(dt);if(mode!=='playing')return;
    for(const e of combatTargets())e.potencyMarked=Math.max(0,(e.potencyMarked||0)-dt);
    if(player.bingoMaster){player.bingoCd=(player.bingoCd??7)-dt;if(player.bingoCd<=0){player.bingoCd=8;player.bingoDraw=(player.bingoDraw||0)+1;if(player.bingoDraw>=3||Math.random()<.28){player.bingoDraw=0;player.bingoRage=5;floater(W/2,H/2-44,'BINGO! RASEREI','#f4c884');}}player.bingoRage=Math.max(0,(player.bingoRage||0)-dt);if(player.bingoRage>0){player.bingoAttack=(player.bingoAttack||0)-dt;if(player.bingoAttack<=0){player.bingoAttack=.4;const target=nearestTarget({x:W/2,y:H/2},760);if(target)damageEnemy(target,2.8*Math.sqrt(player.damage));}}}
    if(player.potencyMinister){player.ministerX=(player.ministerX??-25)+dt*95;if(player.ministerX>W+40)player.ministerX=-40;player.ministerCd=(player.ministerCd??2)-dt;if(player.ministerCd<=0){const t=nearestTarget({x:player.ministerX,y:H/2},480);if(t){player.ministerCd=8;t.potencyMarked=6;if(!isBoss(t)&&!t.miniBoss)t.discussTime=Math.max(t.discussTime||0,1.3);floater(t.x,t.y-35,'POTENZ GEPRÜFT','#b7e6eb');}}}
    if(player.endlessHarvest&&endlessMode&&kills-(player.harvestKills||0)>=30){player.harvestKills=kills;player.hp=Math.min(player.maxHp,player.hp+1);updateHud();}
    for(const f of contentEffects)if(f.kind==='moonMill'&&f.remaining>0&&f.tick<=0){f.tick=.65;f.remaining--;burst(f.x,f.y,'#e5e5a9',12,105);for(const e of combatTargets())if(!e.dead&&dist(e,f)<f.r+e.r){damageEnemy(e,f.damage,true);if(mode!=='playing')return;}}
    updatePafti(dt);
  };
  const originalContentDraw=drawContent;
  drawContent=function(){originalContentDraw();if(!player)return;
    if(player.bingoMaster){ctx.save();ctx.translate(W/2,H/2);ellipse(ctx,0,14,20,5,'#13231bbb');ellipse(ctx,0,-3,17,18,player.bingoRage>0?'#e68065':'#b8a08b');ctx.fillStyle='#f4e7c0';ctx.fillRect(-29,-31,58,17);ctx.fillStyle='#4b4c46';ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.fillText(player.bingoRage>0?'BINGO!':'B I N G O',0,-18);ellipse(ctx,-7,-6,2,3,'#3f342d');ellipse(ctx,7,-6,2,3,'#3f342d');ctx.restore();}
    if(player.potencyMinister){const x=player.ministerX??-25;ctx.save();ctx.translate(x,H/2+45);ellipse(ctx,0,12,15,4,'#172823aa');ctx.fillStyle='#47627c';ctx.fillRect(-9,-8,18,24);ellipse(ctx,0,-16,11,12,'#e2bba2');ctx.fillStyle='#eee5d0';ctx.fillRect(-11,-31,22,7);ctx.fillStyle='#1e4159';ctx.font='bold 9px Arial';ctx.textAlign='center';ctx.fillText('MINISTER',0,32);ctx.restore();}
    for(const f of contentEffects)if(f.kind==='moonMill'){ctx.save();ctx.translate(f.x,f.y);ctx.rotate(ambientTime*7);ctx.strokeStyle='#e5df9e';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,38,0,TAU);ctx.stroke();for(let i=0;i<6;i++){const a=i*TAU/6;path(ctx,[[Math.cos(a)*34,Math.sin(a)*34],[Math.cos(a+.17)*61,Math.sin(a+.17)*61],[Math.cos(a+.34)*38,Math.sin(a+.34)*38]],'#d0c5a0');}ctx.restore();}
  };
  const originalKillEffects=onContentKill;
  onContentKill=function(e){originalKillEffects(e);if(hardMode&&!impossibleMode&&e.ottah&&player.bossHits===0)addAchievementProgress('hard_ottah_clean');};
  const originalDamageMultiplier=contentDamageMultiplier;
  contentDamageMultiplier=function(e){return originalDamageMultiplier(e)*(player.madelpulator?1.78/1.9:1);};
  achievements.push(
    {id:'hard_spare_retries',title:'RESERVEN FÜR DEN HEIMWEG',desc:'Schließe eine Hard-Kampagne mit mindestens 2 Retries ab.',goal:1,kind:'gag',hard:true,secret:true},
    {id:'hard_ng2_perfect_retries',title:'DREI MARKEN, KEIN FEHLER',desc:'Schließe Hard NG+2 ohne Retry ab.',goal:1,kind:'gag',hard:true,secret:true},
    {id:'hard_last_clean',title:'BLUTROTE SAUBERKEIT',desc:'Überstehe Welle 9 einer Hard-Kampagne ohne Lebensverlust.',goal:1,kind:'gag',hard:true,secret:true},
    {id:'hard_endless_30',title:'DREISSIGMAL SCHWEIN GEHABT',desc:'Überstehe Hard-Endloswelle 30 ohne Retry in diesem Run.',goal:1,kind:'gag',hard:true,secret:true},
    {id:'hard_ottah_clean',title:'UNGEKRATZTES WARZENSCHWEIN',desc:'Besiege Ottah in Hard NG+2 ohne Lebensverlust im Bosskampf.',goal:1,kind:'gag',hard:true,secret:true},
    ...[75,100,150,200].map(n=>({id:'endless_'+n,title:'WELLENBRECHER '+n,desc:'Überstehe Welle '+n+' im Endlosmodus.',goal:1,kind:'gag',endless:true,secret:true})),
    {id:'endless_10_perfect',title:'ZEHN WELLEN, KEIN KRATZER',desc:'Erreiche Endloswelle 10 ohne Lebensverlust in diesem Run.',goal:1,kind:'gag',endless:true,secret:true},
    {id:'impossible_boss_perfect',title:'BOSS OHNE SCHRAMME',desc:'Besiege einen Impossible-Hauptboss ohne Lebensverlust im Kampf.',goal:1,kind:'gag',impossible:true,secret:true},
    {id:'impossible_wave9_clean',title:'NEUN WELLEN, DREI LEBEN',desc:'Überstehe Impossible-Welle 9, ohne im Run einen Retry einzusetzen.',goal:1,kind:'gag',impossible:true,secret:true},
    {id:'impossible_clear',title:'DURCH DIE FÄULNIS',desc:'Schließe Impossible Normal ab.',goal:1,kind:'gag',impossible:true,secret:true},
    {id:'impossible_ng_clear',title:'DOPPELT UNMÖGLICH',desc:'Schließe Impossible New Game+ ab.',goal:1,kind:'gag',impossible:true,secret:true},
    {id:'impossible_ng2_clear',title:'GEFÄHRLICHSTER HAMSTER',desc:'Besiege Ottah und Pafti zusammen in Impossible New Game+2.',goal:1,kind:'gag',impossible:true,secret:true}
  );

  function saveImpossibleProgress(){try{localStorage.setItem('snickers3-impossible-progress-v1',JSON.stringify(impossibleProgress));}catch{toast('Impossible-Fortschritt konnte nicht gespeichert werden.');}}
  function persistImpossibleWin(){
    impossibleProgress.unlocked=true;const build=captureNGPlusBuild(player);build.hardMode=true;build.impossibleMode=true;
    if(gamePlusLevel===0){impossibleProgress.ngplus=true;impossibleProgress.ngBuild=build;addAchievementProgress('impossible_clear');}
    else if(gamePlusLevel===1){impossibleProgress.ngplus2=true;impossibleProgress.ng2Build=build;addAchievementProgress('impossible_ng_clear');}
    else if(gamePlusLevel===2){impossibleProgress.clear=true;addAchievementProgress('impossible_ng2_clear');}
    saveImpossibleProgress();updateNGPlusMenu();
  }
  function showImpossibleModes(){
    if(!hardProgress.endless)return;
    mode='impossibleSelect';const names=['NORMAL','NEW GAME+','NEW GAME+2'];
    showOverlay(`<span class="eyebrow impossible-kicker">IMPOSSIBLE MODE</span><h2 id="overlayTitle">DIE FÄULNIS LEBT.</h2><p>Freigeschaltet durch Hard NG+2. Deutlich härter als Hard: verdorbene Gegner, zwei Extra-Bossphasen und höherer Angriffsdruck. Impossible NG+2 endet mit Ottah und Pafti gemeinsam. Jede Stufe übernimmt nur ihren eigenen Sieger-Build.</p><div class="hard-mode-list">${names.map((name,i)=>`<button class="secondary-button impossible-card" id="impossibleLevel${i}" ${!canStartMode(i,true,null,true)?'disabled':''}>IMPOSSIBLE · ${name}${canStartMode(i,true,null,true)?' ↗':' · NOCH GESPERRT'}</button>`).join('')}</div><button class="secondary-button" id="impossibleBack">← HAUPTMENÜ</button>`);
    names.forEach((_,i)=>{$('impossibleLevel'+i).onclick=()=>requestRunStart(i,true,null,true);});$('impossibleBack').onclick=goMenu;
  }
  const previousMenuUpdate=updateNGPlusMenu;
  updateNGPlusMenu=function(){previousMenuUpdate();$('impossibleButton').classList.toggle('hidden',!hardProgress.endless);$('dangerMedal').classList.toggle('hidden',!impossibleProgress.clear);$('achievementCount').textContent=achievements.length+' ACHIEVEMENTS';};
  const previousSpawnOttah=spawnOttah;
  spawnOttah=function(...args){previousSpawnOttah(...args);paftiBoss=null;
    if(impossibleMode&&gamePlusLevel===2){
      const hp=2850;
      paftiBoss={x:W*.26,y:235,type:'boss',pafti:true,paftiPhase:1,r:48,hp,maxHp:hp,speed:82,dead:false,hit:0,slow:0,points:28000,actionCd:2,windup:0,pattern:0,invuln:1.5,supplyStep:0,supplyThresholds:[.7,.4]};
      $('paftiHud').classList.remove('hidden');announce('IMPOSSIBLE · ZWEI HAUPTBOSSE','OTTAH + PAFTI');updateHud();saveRunNow();
    }else $('paftiHud').classList.add('hidden');
  };
  function updatePafti(dt){
    const e=paftiBoss;if(!e||e.dead||mode!=='playing')return;
    e.invuln=Math.max(0,(e.invuln||0)-dt);e.slow=Math.max(0,(e.slow||0)-dt);e.hit=Math.max(0,(e.hit||0)-dt);
    const a=Math.atan2(player.y-e.y,player.x-e.x),d=dist(player,e);
    if(e.windup>0){e.windup-=dt;if(e.windup<=0){
      const pattern=e.pattern++%3;
      if(pattern===0)for(let i=-3;i<=3;i++)enemyShot(e.x,e.y,e.aim+i*.16,270+e.paftiPhase*18,true);
      else if(pattern===1){for(const [dx,dy] of [[0,0],[-105,0],[105,0],[0,110]])hazards.push({type:'mortar',x:clamp(e.targetX+dx,65,W-65),y:clamp(e.targetY+dy,145,H-65),r:48,wait:1.15,life:.3,hit:false,damage:1.6});}
      else{const n=11+e.paftiPhase*2;for(let i=0;i<n;i++){const dir=i*TAU/n;if(Math.abs(angleDelta(dir,e.aim))>.34)enemyShot(e.x,e.y,dir,205+e.paftiPhase*20,true);}}
      e.actionCd=Math.max(1.35,2.3-e.paftiPhase*.25);
    }}else{e.actionCd-=dt;if(e.actionCd<=0){e.windup=.95;e.aim=a;e.targetX=player.x;e.targetY=player.y;}}
    if(d>200){const v=e.speed*(e.slow>0?.7:1)*dt;e.x=clamp(e.x+Math.cos(a)*v,65,W-65);e.y=clamp(e.y+Math.sin(a)*v,150,H-65);}
    if(d<e.r+player.r)hurtPlayer(1.5,e);
  }
  function drawPaftiBoss(e){
    ctx.save();ctx.translate(e.x,e.y);ellipse(ctx,0,35,48,12,'#120d1c88');path(ctx,[[-28,-13],[-44,42],[40,42],[25,-13]],e.hit>0?'#f3e1da':'#684f62');
    ellipse(ctx,0,-20,37,24,'#d5d1c8');ellipse(ctx,-16,-24,7,8,'#4b435a');ellipse(ctx,17,-24,7,8,'#a05d90');
    ctx.fillStyle='#564659';ctx.fillRect(-16,-33,8,18);ctx.fillRect(-21,-28,18,8);for(const [x,y] of [[12,-30],[24,-29],[20,-19],[11,-18]])ellipse(ctx,x,y,3,3,'#ab6b96');
    ctx.strokeStyle='#49384b';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-27,-2);ctx.lineTo(-46,27);ctx.moveTo(27,-2);ctx.lineTo(47,26);ctx.stroke();
    if(e.windup>0){ctx.strokeStyle='#ff746e';ctx.lineWidth=2;ctx.setLineDash([8,7]);ctx.beginPath();ctx.arc(0,0,e.r+14,0,TAU);ctx.stroke();ctx.setLineDash([]);}ctx.restore();
    ctx.font='bold 11px Arial';ctx.textAlign='center';ctx.fillStyle='#ffb8a9';ctx.fillText('PAFTI · PHASE '+e.paftiPhase,e.x,e.y-58);
  }
  const earlierHud=updateHud;
  updateHud=function(){earlierHud();const active=Boolean(paftiBoss&&!paftiBoss.dead&&mode!=='menu');$('paftiHud').classList.toggle('hidden',!active);if(active){$('paftiFill').style.width=Math.max(0,paftiBoss.hp/paftiBoss.maxHp*100)+'%';$('paftiPhase').textContent='PHASE '+paftiBoss.paftiPhase+' / 3 · '+(boss?.dead?'OTTAH IST GEFALLEN':'GEMEINSAM MIT OTTAH');}if(impossibleMode&&player){$('waveLabel').textContent=$('waveLabel').textContent.replace(/^HARD /,'IMPOSSIBLE ');if(boss?.impossibleFinal)$('bossPhase').textContent='IMPOSSIBLE · FINALE EXTRAPHASE';}};
  const earlierGoMenu=goMenu;
  goMenu=function(){paftiBoss=null;$('paftiHud').classList.add('hidden');earlierGoMenu();};
  Object.assign(extraEnemyBook,{
    rottenHare:{name:'FÄULNISHASE',stats:[18,104,26,540],color:'#85756e',species:'rabbit',hard:true,impossible:true,unlock:'Impossible · Welle 2'},
    feverPig:{name:'FIEBERFERKEL',stats:[25,75,30,680],color:'#9b7465',species:'pig',hard:true,impossible:true,unlock:'Impossible · Welle 4'},
    marrowHunter:{name:'MARKJÄGER',stats:[21,132,23,710],color:'#a8a4ac',species:'rabbit',hard:true,impossible:true,unlock:'Impossible · Welle 7'}
  });
  const earlierHardChoice=hardEnemyChoice;
  hardEnemyChoice=function(type){
    if(impossibleMode&&wave>=1&&Math.random()<.36&&enemies.filter(e=>extraEnemyBook[e.type]?.impossible&&!e.dead).length<5){
      const candidates=['rottenHare',...(wave>=3?['feverPig']:[]),...(wave>=6?['marrowHunter']:[])].filter(id=>enemies.filter(e=>e.type===id&&!e.dead).length<2);
      if(candidates.length)return shuffled(candidates)[0];
    }
    return earlierHardChoice(type);
  };
  const earlierContentEnemy=updateContentEnemy;
  updateContentEnemy=function(e,dt){
    if(!extraEnemyBook[e.type]?.impossible)return earlierContentEnemy(e,dt);
    const a=Math.atan2(player.y-e.y,player.x-e.x),d=dist(e,player),slow=e.slow>0?.7:1;
    if(e.windup>0){e.windup-=dt;if(e.windup<=0){if(e.type==='rottenHare'){for(let i=-2;i<=2;i++)enemyShot(e.x,e.y,e.aim+i*.23,210,true);}
      if(e.type==='feverPig'){for(let i=-1;i<=1;i++)hazards.push({type:'mortar',x:clamp(e.targetX+i*95,65,W-65),y:clamp(e.targetY,145,H-65),r:46,wait:1.2,life:.3,hit:false,damage:1.5});}
      if(e.type==='marrowHunter'){e.charge=.32;for(const off of [-.4,0,.4])enemyShot(e.x,e.y,e.aim+off,235,true);}}return;}
    if(e.charge>0){e.charge-=dt;e.x=clamp(e.x+Math.cos(e.aim)*380*dt,40,W-40);e.y=clamp(e.y+Math.sin(e.aim)*380*dt,112,H-44);return;}
    if(d>e.r+90){e.x+=Math.cos(a)*e.speed*slow*dt;e.y+=Math.sin(a)*e.speed*slow*dt;}
    if(e.fireCd<=0){e.fireCd=3.2;e.windup=1.1;e.aim=a;e.targetX=player.x;e.targetY=player.y;}
  };

  const purpleRewards=new Set(['madelpulator','power','ironFur','nutSentry','waveRenew','duden','bingoMaster','olangolil','potencyMinister','narrath','ratKing','stormOrbit','ng2Pulse','ng2Shell','ngLedger']);
  const blueRewards=new Set(['rapid','health','fortified','crit','specialCore','hunter','krokette','bruno','wollenkamps','steelMuzzle','snickersBar','powerLuck','ngFlicker','endlessShield']);
  function rarityClass(c){if(c.weapon)return 'weapon-upgrade';if(c.legendary)return 'legendary-upgrade';if(c.special)return 'rarity-purple special-upgrade';if(c.ngplus2||purpleRewards.has(c.id))return 'rarity-purple';if(c.ngplus||c.endless||blueRewards.has(c.id))return 'rarity-blue';return 'rarity-green';}

  const skins=[
    {id:'classic',name:'SNICKERS ORIGINAL',mark:'🐹',color:'#d49b50',hint:'Immer verfügbar.'},
    {id:'normal0',name:'NUSSDETEKTIV',mark:'⌕',color:'#83c5a1',hint:'Normal abschließen.'},
    {id:'normal1',name:'SAHNEKOCH',mark:'♨',color:'#f5dabc',hint:'Normal NG+ abschließen.'},
    {id:'normal2',name:'OTTAHS BUTLER',mark:'♠',color:'#c0a9df',hint:'Normal NG+2 abschließen.'},
    {id:'hard0',name:'BLUTBAD-BADemeister'.toUpperCase(),mark:'✚',color:'#d57e77',hint:'Hard Normal abschließen.'},
    {id:'hard1',name:'KRUSTENROCKER',mark:'ϟ',color:'#ea9d71',hint:'Hard NG+ abschließen.'},
    {id:'hard2',name:'HUMMELKÖNIG',mark:'♛',color:'#eccc69',hint:'Hard NG+2 abschließen.'},
    {id:'endless50',name:'WELLENWART',mark:'∞',color:'#8bbccd',hint:'Normal Endloswelle 50 überstehen.'},
    {id:'endless100',name:'HUNDERTBEISSER',mark:'❂',color:'#aedcae',hint:'Normal Endloswelle 100 überstehen.'},
    {id:'hard50',name:'BLUTWELLEN-WÄCHTER',mark:'◈',color:'#d77c9e',hint:'Hard Endloswelle 50 überstehen.'},
    {id:'hard100',name:'SCHRECKENSWART',mark:'☠',color:'#e99d9d',hint:'Hard Endloswelle 100 überstehen.'},
    {id:'impossible0',name:'VERDORBENER GÄRTNER',mark:'✿',color:'#9cac78',hint:'Impossible Normal abschließen.'},
    {id:'impossible1',name:'SCHATTEN-SNICKERS',mark:'☾',color:'#a99cdd',hint:'Impossible NG+ abschließen.'},
    {id:'impossible2',name:'GEFÄHRLICHSTER HAMSTER',mark:'♛',color:'#ffe285',hint:'Impossible NG+2 abschließen.'}
  ];
  function unlockedSkins(){
    const normal0=ngPlusEverUnlocked||ngPlusUnlocked||ngPlus2EverUnlocked||hallOfFame.some(r=>!r.hardMode);
    const normal1=ngPlus2EverUnlocked||ngPlus2Unlocked||hallOfFame.some(r=>!r.hardMode);
    const normal2=hallOfFame.some(r=>!r.hardMode);
    const active=readSavedRun()?.summary;if(active?.level===3){const key=active.hard?'hard':'normal';endlessBest[key]=Math.max(endlessBest[key]||0,(active.wave||1)-1);}
    return new Set(['classic',...(normal0?['normal0']:[]),...(normal1?['normal1']:[]),...(normal2?['normal2']:[]),...(hardProgress.ngplus||achievementUnlocked('hard_clear')?['hard0']:[]),...(hardProgress.ngplus2||achievementUnlocked('hard_ng_clear')?['hard1']:[]),...(hardProgress.endless||achievementUnlocked('hard_ng2_clear')?['hard2']:[]),...((endlessBest.normal||0)>=50?['endless50']:[]),...((endlessBest.normal||0)>=100?['endless100']:[]),...((endlessBest.hard||0)>=50?['hard50']:[]),...((endlessBest.hard||0)>=100?['hard100']:[]),...(impossibleProgress.ngplus?['impossible0']:[]),...(impossibleProgress.ngplus2?['impossible1']:[]),...(impossibleProgress.clear?['impossible2']:[])]);
  }
  function showSkins(fromPause=false){
    if(fromPause?mode!=='paused':mode!=='menu')return;
    overlayFromPause=fromPause;mode='skins';const owned=unlockedSkins();if(!owned.has(selectedSkin))selectedSkin='classic';
    showOverlay(`<span class="eyebrow">SNICKERS' GARDEROBE</span><h2 id="overlayTitle">14 MÖGLICHKEITEN ZU KNABBERN.</h2><p>Skins verändern dein Aussehen und sind auch mitten im Run wechselbar. Bereits gespeicherte Abschlüsse schalten sie rückwirkend frei.</p><div class="skin-grid">${skins.map(s=>`<button class="skin-card" id="skin-${s.id}" style="--skin:${s.color}" ${owned.has(s.id)?'':'disabled'} aria-pressed="${selectedSkin===s.id}"><span class="skin-icon">${s.mark}</span><strong>${s.name}</strong><small>${owned.has(s.id)?'FREIGESCHALTET · ':''}${s.hint}</small></button>`).join('')}</div><button class="secondary-button" id="skinBack">← ${fromPause?'ZUR PAUSE':'ZUM MENÜ'}</button>`);
    for(const s of skins)if(owned.has(s.id))$('skin-'+s.id).onclick=()=>{selectedSkin=s.id;try{localStorage.setItem('snickers3-selected-skin-v1',s.id);}catch{}for(const x of skins)$('skin-'+x.id).setAttribute('aria-pressed',String(x.id===s.id));};
    $('skinBack').onclick=()=>{if(fromPause){mode='playing';pauseGame();}else{mode='menu';hideOverlay();}};
  }
  function drawSkin(p,alpha=1){
    const skin=skins.find(s=>s.id===selectedSkin);if(!skin||skin.id==='classic'||alpha<.9)return;
    ctx.save();ctx.translate(p.x,p.y+(p.moving?Math.sin(ambientTime*17)*2:Math.sin(ambientTime*3)*.7));ctx.globalAlpha=alpha;
    // Each costume has a distinct colored cape, headpiece and emblem. Cosmetics never change hitboxes.
    ctx.fillStyle=skin.color;ctx.strokeStyle='#392934';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(-15,-17);ctx.lineTo(-24,-36);ctx.lineTo(24,-36);ctx.lineTo(15,-17);ctx.closePath();ctx.fill();ctx.stroke();
    ellipse(ctx,0,-36,17,8,skin.color);ctx.fillStyle='#fff5e1';ctx.font='bold 18px Arial';ctx.textAlign='center';ctx.fillText(skin.mark,0,-37);
    ctx.strokeStyle=skin.color;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-15,10);ctx.lineTo(0,16);ctx.lineTo(15,10);ctx.stroke();
    if(skin.id==='normal0'){ctx.strokeStyle='#d9eec8';ctx.lineWidth=3;ctx.beginPath();ctx.arc(13,-4,9,0,TAU);ctx.moveTo(19,2);ctx.lineTo(30,14);ctx.stroke();}
    else if(skin.id==='normal1'){for(const x of [-12,0,12])ellipse(ctx,x,-43,11,10,'#fff4e3');ctx.fillStyle='#e6ad6e';ctx.fillRect(18,3,5,25);}
    else if(skin.id==='normal2'){path(ctx,[[-5,5],[0,11],[5,5]],'#e7e6ed');ellipse(ctx,0,9,2,2,'#372637');ctx.fillStyle='#ebe0bb';ctx.fillRect(20,8,13,4);}
    else if(skin.id==='hard0'){ctx.strokeStyle='#ffded1';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,3,20,0,TAU);ctx.stroke();}
    else if(skin.id==='hard1'){for(let i=-2;i<=2;i++)path(ctx,[[i*7-4,-29],[i*7,-51-Math.abs(i)*3],[i*7+4,-29]],'#f1976c');}
    else if(skin.id==='hard2'){ctx.fillStyle='#f7d064';for(const x of [-23,22]){ellipse(ctx,x,2,10,16,'#f0d16e99');ctx.fillRect(x-1,8,3,13);}}
    else if(skin.id==='endless50'||skin.id==='hard50'){ctx.strokeStyle='#b4e0f2';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,-4,21,Math.PI,TAU);ctx.stroke();ctx.fillStyle=skin.color;ctx.fillRect(-22,-3,9,14);ctx.fillRect(13,-3,9,14);}
    else if(skin.id==='endless100'||skin.id==='hard100'){ctx.strokeStyle=skin.color;ctx.lineWidth=2;for(let i=0;i<4;i++){const a=ambientTime*2+i*TAU/4;ellipse(ctx,Math.cos(a)*29,Math.sin(a)*18-5,3,3,skin.color);}}
    else if(skin.id==='impossible0'){ctx.fillStyle='#a1bd7a';for(const x of [-20,18]){ellipse(ctx,x,-35,7,10,'#8aa36a');ctx.fillRect(x-2,-26,4,9);}}
    else if(skin.id==='impossible1'){ctx.fillStyle='#52395d99';ctx.fillRect(-22,-24,44,34);ellipse(ctx,0,-13,13,9,'#b6a0df77');}
    else if(skin.id==='impossible2'){ctx.strokeStyle='#ffe199';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-31,26+Math.sin(ambientTime*3)*2,0,TAU);ctx.stroke();}
    if(['hard0','hard1','hard2','hard50','hard100','impossible0','impossible1','impossible2'].includes(skin.id)){ctx.strokeStyle=skin.color+'aa';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-4,27,0,TAU);ctx.stroke();}
    ctx.restore();
  }
  const previousHamsterDraw=drawHamster;
  drawHamster=function(p,alpha=1){previousHamsterDraw(p,alpha);if(mode!=='victory'||!player?.bossDance)drawSkin(p,alpha);
    if(p.madelpulator&&alpha>.9&&mode!=='victory'){const bob=p.moving?Math.sin(ambientTime*17)*2:Math.sin(ambientTime*3)*.7;ctx.save();ctx.shadowBlur=11;ctx.shadowColor='#ff2525';for(const x of [-7,8]){ellipse(ctx,p.x+x*p.face,p.y-8+bob,4,3,'#ff3333');ctx.strokeStyle='#fa3737';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x+x*p.face,p.y-8+bob);ctx.lineTo(p.x+x*p.face+p.face*13,p.y-12+bob);ctx.stroke();}ctx.restore();}
  };
  const previousDrawRabbit=drawRabbit;
  drawRabbit=function(e){previousDrawRabbit(e);if(!hardMode||e.dead)return;ctx.save();ctx.shadowColor=impossibleMode?'#ff2525':'#d94740';ctx.shadowBlur=impossibleMode?16:9;for(const x of [-e.r*.33,e.r*.33])ellipse(ctx,e.x+x,e.y-7,impossibleMode?4:3,3,impossibleMode?'#ff2929':'#d84a42');if(e.potencyMarked>0||player?.duden){ctx.font='bold 14px Arial';ctx.textAlign='center';ctx.fillStyle='#ffbb8d';ctx.fillText('✕',e.x,e.y-e.r-5);}ctx.restore();};

  const SHARE_PREFIX='SN3-1-';
  function compactSharedBuild(p,difficulty){
    const raw=captureNGPlusBuild(p),b={hardMode:difficulty!=='normal',impossibleMode:difficulty==='impossible',skills:raw.skills,specials:raw.specials,weapons:raw.weapons,scorePerks:raw.scorePerks};
    for(const key of ngPlusCarryKeys)if(raw[key]!==undefined)b[key]=raw[key];
    return b;
  }
  function sanitizeSharedBuild(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Ungültiger Build.');
    const clean={skills:{},specials:{},weapons:['nutBomb'],scorePerks:{}};
    for(const key of ngPlusCarryKeys){const v=raw[key];if(typeof v==='boolean')clean[key]=v;else if(typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=10000)clean[key]=v;else if(key==='candyBuffs'&&Array.isArray(v))clean[key]=v.filter(id=>Object.hasOwn(candyBook,id)).slice(0,3);}
    for(const [id,level] of Object.entries(raw.skills||{}))if(allSkillInfo(id)&&!allSkillInfo(id).weapon&&Number.isInteger(level)&&level>0)clean.skills[id]=Math.min(level,stackCaps[id]||1);
    for(const [id,level] of Object.entries(raw.specials||{}))if(Object.hasOwn(specialUpgradeBook,id)&&Number(level)>0)clean.specials[id]=1;
    if(Array.isArray(raw.weapons))clean.weapons=[...new Set(['nutBomb',...raw.weapons.filter(id=>typeof id==='string'&&Object.hasOwn(weaponBook,id))])].slice(0,40);
    for(const id of Object.keys(scoreSkillBook)){const n=raw.scorePerks?.[id];if(Number.isInteger(n)&&n>=0)clean.scorePerks[id]=Math.min(n,30);}
    clean.hardMode=Boolean(raw.hardMode);clean.impossibleMode=Boolean(raw.impossibleMode);return clean;
  }
  function encodeShareCode(build,difficulty,allowUse){
    const json=JSON.stringify({version:1,difficulty,allowUse:Boolean(allowUse),build});
    const bytes=new TextEncoder().encode(json);return SHARE_PREFIX+btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function decodeShareCode(code){
    const input=String(code||'').trim();if(!input.startsWith(SHARE_PREFIX)||input.length>40000||!/^[A-Za-z0-9_-]+$/.test(input.slice(SHARE_PREFIX.length)))throw Error('Der Code hat kein gültiges Snickers-3-Format.');
    const body=input.slice(SHARE_PREFIX.length).replace(/-/g,'+').replace(/_/g,'/');const bytes=Uint8Array.from(atob(body.padEnd(Math.ceil(body.length/4)*4,'=')),c=>c.charCodeAt(0));
    const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
    if(data?.version!==1||!['normal','hard','impossible'].includes(data.difficulty)||typeof data.allowUse!=='boolean')throw Error('Dieser Code gehört zu einer anderen Version.');
    const build=sanitizeSharedBuild(data.build);
    if(Boolean(build.hardMode)!==(data.difficulty!=='normal')||Boolean(build.impossibleMode)!==(data.difficulty==='impossible'))throw Error('Die Schwierigkeit im Code passt nicht zum Build.');
    return {difficulty:data.difficulty,allowUse:data.allowUse,build};
  }
  function showShare(fromPause=false,hallIndex=null,source='hall'){
    if(fromPause?mode!=='paused':!['menu','hallDetail'].includes(mode))return;
    overlayFromPause=fromPause;mode='share';let entry=hallIndex===null?hallOfFame[0]:hallOfFame[hallIndex],p=fromPause?player:entry?restoreBuildValues(hallBuild(entry)):null;
    const difficulty=()=>fromPause?(impossibleMode?'impossible':hardMode?'hard':'normal'):entry?.build?.impossibleMode?'impossible':entry?.hardMode?'hard':'normal';
    showOverlay(`<span class="eyebrow">BUILDS TEILEN</span><h2 id="overlayTitle">EIN CODE FÜR DEINEN BUILD.</h2><p>Erzeuge einen Code für deinen aktuellen Run oder einen Hall-of-Fame-Build. Du bestimmst, ob der Empfänger den Build nur ansehen oder auch in einem neuen Run der passenden Schwierigkeit spielen darf.</p>${!fromPause&&hallOfFame.length?`<label class="share-label" for="shareSource">BUILD AUS DER HALL OF FAME</label><select id="shareSource" class="share-input">${hallOfFame.map((r,i)=>`<option value="${i}" ${r===entry?'selected':''}>Run ${hallOfFame.length-i} · ${r.hardMode?'Hard':'Normal'} · ${escapeHTML(runDate(r))}</option>`).join('')}</select>`:''}${p?`<div class="share-export"><label><input id="sharePlayable" type="checkbox"> Empfänger darf den Build spielen</label><textarea id="shareOutput" class="share-input" readonly aria-label="Exportierter Build-Code"></textarea><button class="secondary-button" id="shareCopy">CODE KOPIEREN</button></div>`:'<p>Noch kein abgeschlossener Hall-of-Fame-Build vorhanden. Du kannst trotzdem einen fremden Code ansehen.</p>'}<div class="share-export"><label class="share-label" for="shareInput">CODE IMPORTIEREN</label><textarea id="shareInput" class="share-input" maxlength="40000" placeholder="SN3-1-…"></textarea><button class="primary-button" id="shareImport">BUILD ANSEHEN ↗</button></div><div id="sharePreview" aria-live="polite"></div><button class="secondary-button" id="shareBack">← ZURÜCK</button>`);
    const refresh=()=>{if(p)$('shareOutput').value=encodeShareCode(compactSharedBuild(p,difficulty()),difficulty(),$('sharePlayable').checked);};
    if(p){refresh();$('sharePlayable').onchange=refresh;$('shareCopy').onclick=async()=>{try{await navigator.clipboard.writeText($('shareOutput').value);toast('Build-Code kopiert.');}catch{$('shareOutput').select();toast('Code markiert – bitte kopieren.');}};}
    if($('shareSource'))$('shareSource').onchange=()=>{entry=hallOfFame[Number($('shareSource').value)];p=restoreBuildValues(hallBuild(entry));refresh();};
    $('shareImport').onclick=()=>{let parsed;try{parsed=decodeShareCode($('shareInput').value);}catch(err){$('sharePreview').innerHTML=`<p class="share-error">${escapeHTML(err.message)}</p>`;return;}
      const view=restoreBuildValues(parsed.build),allowed=parsed.allowUse&&(parsed.difficulty==='normal'||parsed.difficulty==='hard'&&hardUnlocked()||parsed.difficulty==='impossible'&&hardProgress.endless);
      $('sharePreview').innerHTML=`<div class="share-preview"><h3>IMPORTIERTER BUILD · ${parsed.difficulty.toUpperCase()}</h3><p>${parsed.allowUse?'Der Exporteur hat die Nutzung erlaubt.':'Dieser Code ist nur zum Anschauen freigegeben.'}</p>${allowed?'<button class="primary-button" id="shareStart">MIT DIESEM BUILD STARTEN ↗</button>':''}${buildDetailsMarkup(view,false)}</div>`;
      bindBuildJumps();if(allowed)$('shareStart').onclick=()=>requestRunStart(0,parsed.difficulty!=='normal',null,parsed.difficulty==='impossible',parsed.build);
    };
    $('shareBack').onclick=()=>{if(fromPause){mode='playing';pauseGame();}else if(hallIndex!==null)showRunDetail(hallIndex,source);else{mode='menu';hideOverlay();}};
  }
  const previousRunDetail=showRunDetail;
  showRunDetail=function(index,source='hall'){previousRunDetail(index,source);$('runDetailStart').insertAdjacentHTML('afterend','<button class="secondary-button" id="runDetailShare">BUILD TEILEN ⇄</button>');$('runDetailShare').onclick=()=>showShare(false,index,source);};

  const bossDanceQuotes=[
    'Soooo dich hab ich zerlegt du Knecht, jetzt tanze ich erst Mal den Schniedel Pilly Pilly',
    'Soooo, du Knecht bist zerlegt! Die Arena gehört mir. Jetzt gibt es den Schniedel Pilly Pilly!',
    'Ha! Dich hab ich schön zerknuspert, du Knecht! Pfoten hoch, jetzt tanze ich den Schniedel Pilly Pilly!',
    'Soooo, Boss aus, Hamster an! Du Knecht liegst flach und ich tanze erst mal den Schniedel Pilly Pilly!',
    'Zerlegt, zernagt und weggeknuspert, du Knecht! Jetzt gehört die Tanzfläche meinem Schniedel Pilly Pilly!',
    'Na, wer hat hier wen zerlegt, du Knecht? Snickers natürlich! Musik an für den Schniedel Pilly Pilly!'
  ];
  const BOSS_DANCE_SECONDS=2.4;
  let bossSpeech=null,bossDanceUiQuote='';
  const eichelkopfVictory=beginVictory;
  beginVictory=function(next){
    if(mode!=='playing')return;
    stopBossSpeech();
    if(boss?.dead&&isBoss(boss)){
      const previous=player.lastBossQuote;
      const options=bossDanceQuotes.map((_,i)=>i).filter(i=>i!==previous);
      const index=previous===undefined?0:options[Math.floor(Math.random()*options.length)];
      player.lastBossQuote=index;player.bossDance={quote:bossDanceQuotes[index],duration:12,spoken:false,beat:-1};
    }else player.bossDance=null;
    eichelkopfVictory(next);
    if(player.bossDance){
      victoryTime=player.bossDance.duration;clearTimeout(announcementTimer);$('announcement').classList.add('hidden');player.trail=[];
      updateHud();syncBossCelebration();saveRunNow();
    }
  };
  function stopBossSpeech(){
    if(!bossSpeech)return;
    bossSpeech.onend=bossSpeech.onerror=null;bossSpeech=null;
    try{window.speechSynthesis?.cancel();}catch{}
  }
  function closeBossCelebration(){
    stopBossSpeech();shell.classList.remove('boss-celebrating');$('bossCelebration').classList.add('hidden');bossDanceUiQuote='';
  }
  function syncBossCelebration(){
    const d=mode==='victory'&&player?.bossDance;
    if(!d){closeBossCelebration();return;}
    shell.classList.add('boss-celebrating');$('bossCelebration').classList.remove('hidden');
    $('loadingNotice').classList.add('hidden');$('waveLabel').textContent='BOSS BESIEGT';$('waveObjective').textContent='SCHNIEDEL PILLY PILLY';
    const speaking=d.duration-victoryTime>=BOSS_DANCE_SECONDS;
    $('bossDanceEyebrow').textContent=speaking?'SNICKERS BRÜLLT:':'BOSS BESIEGT · TANZFLÄCHE FREI';
    const line=speaking?'„'+d.quote+'“':'Die Pfoten fliegen. Der Boss liegt. Snickers dreht auf!';
    if(line!==bossDanceUiQuote){$('bossDanceQuote').textContent=line;bossDanceUiQuote=line;}
    $('bossDanceContinue').disabled=!speaking;
  }
  function updateBossCelebration(){
    const d=player?.bossDance;if(mode!=='victory'||!d)return;
    const elapsed=d.duration-victoryTime;
    if(elapsed<BOSS_DANCE_SECONDS){
      const beat=Math.floor(elapsed/.2);
      if(beat!==d.beat){d.beat=beat;tone([392,523,659,523,783,659][beat%6],.13,'triangle',.048);}
    }else if(soundOn&&!settings.sfxMute&&settings.volume>0&&!d.spoken&&!document.hidden){
      d.spoken=true;
      try{
        const synth=window.speechSynthesis,Utterance=window.SpeechSynthesisUtterance;
        const voices=synth?.getVoices()||[],german=voices.filter(v=>/^de(?:-|_)/i.test(v.lang)||v.lang==='de');
        const voice=german.find(v=>v.localService)||german[0];
        if(synth&&Utterance&&voice){
          const speech=new Utterance(d.quote);speech.lang='de-DE';speech.voice=voice;speech.rate=1.12;speech.pitch=1.3;speech.volume=settings.volume/100;
          bossSpeech=speech;
          speech.onend=()=>{if(bossSpeech!==speech)return;bossSpeech=null;if(mode==='victory'&&player.bossDance===d)victoryTime=Math.min(victoryTime,1.4);};
          speech.onerror=()=>{if(bossSpeech===speech)bossSpeech=null;};
          synth.speak(speech);
        }
      }catch{bossSpeech=null;}
      saveRunNow();
    }
  }
  function continueBossCelebration(){
    if(mode!=='victory'||!player?.bossDance||player.bossDance.duration-victoryTime<BOSS_DANCE_SECONDS)return;
    closeBossCelebration();const next=victoryAfter;victoryAfter=null;victoryTime=0;next?.();saveRunNow();
  }
  const eichelkopfGoMenu=goMenu;
  goMenu=function(){closeBossCelebration();eichelkopfGoMenu();};
  const eichelkopfToggleSound=toggleSound;
  toggleSound=function(){eichelkopfToggleSound();if(!soundOn)stopBossSpeech();};
  const eichelkopfRender=render;
  render=function(dt){syncBossCelebration();eichelkopfRender(dt);};

  const eichelkopfHamster=drawHamster;
  drawHamster=function(p,alpha=1){
    const d=mode==='victory'&&player?.bossDance;
    if(!d){eichelkopfHamster(p,alpha);return;}
    if(alpha!==1)return;
    const t=Math.max(0,d.duration-victoryTime),dancing=t<BOSS_DANCE_SECONDS;
    const compact=viewH<430,portrait=viewW<800;
    const x=camX+viewW*(compact?.23:.5)+(reducedMotion?0:Math.sin(t*9)*Math.min(46,viewW*.08)),y=camY+viewH*(compact?.56:portrait?.26:.36);
    const jump=reducedMotion?Math.sin(t*3)*2:-Math.abs(Math.sin(t*(dancing?12:5)))*(dancing?24:7),spin=reducedMotion?0:dancing?Math.sin(t*11)*.35+t*TAU/1.2:Math.sin(t*5)*.07;
    ctx.save();ellipse(ctx,x,y+34,62,13,'#071c2066');ellipse(ctx,x,y+32,68,15,'#e8d3a62a');
    for(let i=0;i<20;i++){
      const phase=t*(reducedMotion?.25:1.7)+i*2.399,r=65+(i%5)*13,xx=x+Math.cos(phase)*r,yy=y-24+Math.sin(phase)*r*.64;
      ctx.save();ctx.translate(xx,yy);ctx.rotate(phase);ctx.fillStyle=['#eed683','#8fdac6','#f2b5bd','#b2c8ed'][i%4];ctx.fillRect(-3,-5,6,10);ctx.restore();
    }
    ctx.translate(x,y+jump);ctx.rotate(spin);ctx.scale(compact?1.8:2.25,compact?1.8:2.25);
    // Exaggerated kicks and waving paws; the combat position and collision state never move.
    const kick=Math.sin(t*18)*(reducedMotion?3:9);
    ctx.strokeStyle='#b9763c';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-13,2);ctx.lineTo(-26,-12-kick);ctx.moveTo(13,2);ctx.lineTo(26,-12+kick);ctx.moveTo(-8,14);ctx.lineTo(-17-kick,23);ctx.moveTo(8,14);ctx.lineTo(17-kick,23);ctx.stroke();
    eichelkopfHamster({...p,x:0,y:0,face:1,angle:-.35+Math.sin(t*8)*.6,invuln:0,shieldReady:false,dashTime:0},1);
    drawSkin({...p,x:0,y:0,face:1,moving:false},1);
    if(p.madelpulator){ctx.save();ctx.shadowColor='#ff3535';ctx.shadowBlur=10;ellipse(ctx,-7,-8,4,3,'#ff3333');ellipse(ctx,8,-8,4,3,'#ff3333');ctx.restore();}
    if(!dancing){ellipse(ctx,1,-2,5,5+Math.abs(Math.sin(t*18))*2,'#553834');ellipse(ctx,1,1,3,2,'#e7a298');}
    ctx.restore();
  };
  function initEichelkopfPatch(){
    shell.classList.toggle('touch-input',inputMode==='touch');
    document.addEventListener('pointerdown',e=>{
      if(e.pointerType==='touch'){inputMode='touch';pointer.active=false;shell.classList.add('touch-input');}
      else if(e.pointerType==='mouse'&&e.target===canvas){inputMode='mouse';shell.classList.remove('touch-input');}
    },true);
    $('bossDanceContinue').onclick=continueBossCelebration;
    window.addEventListener('pagehide',stopBossSpeech);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stopBossSpeech();});
    try{window.speechSynthesis?.getVoices();}catch{}
  }

  $('startButton').onclick=()=>startGame(0);$('menuSettingsButton').onclick=showSettings;$('ngPlusButton').onclick=()=>startGame(1);$('ngPlus2Button').onclick=()=>startGame(2);$('hallOfFameButton').onclick=showHallOfFame;$('endlessButton').onclick=showEndlessSelect;$('helpButton').onclick=showHelp;$('achievementButton').onclick=showAchievements;$('powerupButton').onclick=showPowerups;$('pauseButton').onclick=pauseGame;$('soundButton').onclick=toggleSound;$('settingsButton').onclick=showSettings;
  updateNGPlusMenu();
  $('fullscreenButton').onclick=async()=>{
    try{if(document.fullscreenElement)await document.exitFullscreen();else if(shell.requestFullscreen)await shell.requestFullscreen();else toast('Vollbild ist in diesem Browser nicht verfügbar.');}
    catch{toast('Vollbild ist in dieser Ansicht nicht verfügbar.');}
  };
  document.addEventListener('fullscreenchange',()=>{resize();$('fullscreenButton').setAttribute('aria-label',document.fullscreenElement?'Vollbild schließen':'Vollbild öffnen');});
  document.addEventListener('keydown',e=>{
    if(mode!=='playing'&&['Space','Enter','NumpadEnter','Escape','KeyP'].includes(e.code)){e.preventDefault();return;}
    const gameKeys=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyE','KeyQ','KeyR','KeyP','Escape'];
    if(mode==='playing'&&gameKeys.includes(e.code))e.preventDefault();
    if(e.code==='Tab'&&!$('overlay').classList.contains('hidden')){
      const buttons=Array.from($('overlayContent').querySelectorAll('button:not([disabled])'));const first=buttons[0],last=buttons[buttons.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      return;
    }
    if(e.repeat)return;
    if((e.code==='KeyP'||e.code==='Escape')&&mode==='playing'){e.preventDefault();pauseGame();return;}
    if(mode!=='playing')return;
    keys.add(e.code);if(e.code==='Space')useDash();if(e.code==='KeyE')useWeapon();if(e.code==='KeyQ')cycleWeapon(-1);if(e.code==='KeyR')cycleWeapon(1);
  });
  document.addEventListener('keyup',e=>{if(mode!=='playing'&&['Space','Enter','NumpadEnter'].includes(e.code))e.preventDefault();keys.delete(e.code);});
  document.addEventListener('click',e=>{if(e.detail===0&&e.target.closest?.('button')){e.preventDefault();e.stopImmediatePropagation();}},true);
  window.addEventListener('blur',()=>{resetInput();if(mode==='playing')pauseGame();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){resetInput();if(mode==='playing')pauseGame();}});
  function updatePointer(e){
    if(mode!=='playing'||e.pointerType==='touch'||e.target!==canvas)return;inputMode='mouse';
    const rect=shell.getBoundingClientRect();
    pointer.x=clamp((e.clientX-rect.left)/scale+camX,0,W);pointer.y=clamp((e.clientY-rect.top)/scale+camY,0,H);pointer.active=true;
  }
  shell.addEventListener('pointermove',updatePointer);shell.addEventListener('pointerdown',e=>{if(mode!=='playing')return;if(e.target&&e.target!==canvas)return;e.preventDefault();if(e.pointerType==='touch'){inputMode='touch';pointer.active=false;}else{updatePointer(e);if(shotTimer<=0&&fire())shotTimer=effectiveInterval(player);}});shell.addEventListener('pointerleave',()=>{});
  shell.addEventListener('wheel',e=>{if(mode==='playing'){e.preventDefault();cycleWeapon(e.deltaY>0?1:-1);}},{passive:false});
  const stick=$('joystick');
  function moveStick(e){
    if(e.pointerId!==touch.id)return;
    const rect=stick.getBoundingClientRect(),dx=e.clientX-(rect.left+rect.width/2),dy=e.clientY-(rect.top+rect.height/2),max=rect.width*.31,m=Math.hypot(dx,dy),f=m>max?max/m:1;
    touch.x=dx*f/max;touch.y=dy*f/max;$('joystickThumb').style.transform=`translate(${dx*f}px,${dy*f}px)`;
  }
  stick.addEventListener('pointerdown',e=>{if(mode!=='playing')return;e.preventDefault();inputMode='touch';pointer.active=false;touch.id=e.pointerId;stick.setPointerCapture(e.pointerId);moveStick(e);});
  stick.addEventListener('pointermove',moveStick);
  const releaseStick=e=>{if(e.pointerId===touch.id){touch.id=null;touch.x=touch.y=0;$('joystickThumb').style.transform='translate(0,0)';}};
  stick.addEventListener('pointerup',releaseStick);stick.addEventListener('pointercancel',releaseStick);stick.addEventListener('lostpointercapture',releaseStick);
  $('touchDash').addEventListener('pointerdown',e=>{e.preventDefault();inputMode='touch';pointer.active=false;useDash();});$('touchBomb').addEventListener('pointerdown',e=>{e.preventDefault();inputMode='touch';pointer.active=false;useBomb();});
  $('touchCycle').addEventListener('pointerdown',e=>{e.preventDefault();inputMode='touch';pointer.active=false;cycleWeapon(1);});
  window.addEventListener('pagehide',flushAchievements);

  // Read-only state and the same start/pause actions exposed by the game UI.
  const modelContext=document.modelContext;
  if(modelContext?.registerTool){
    const lifecycle=new AbortController();
    const result=()=>({version:7,hardMode,state:mode,wave:wave+1,totalWaves:9,act:generalDefeated?(cyberDefeated?3:2):1,score,health:player?{current:player.hp,max:player.maxHp}:null,bombs:player?.weaponUses?.nutBomb??0,weapons:player?.weapons??[],powerups:player?Object.keys(player.powerups):[],retriesLeft,seconds:Math.floor(runTime),boss:boss?(boss.ottah?'Ottah':boss.endlessBoss?boss.endlessName:boss.karnil?'Karnil':boss.cyber?'Cyber-Hasenbein':'General Hasenbein'):null,bossHealth:boss?Math.max(0,boss.hp):null,skills:player?Object.keys(player.skills):[],theme:settings.theme,accent:settings.accent});
    const registry=[
      {name:'read_game_state',description:'Read the current Snickers 3 game status, score, health and wave.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(input){if(input&&Object.keys(input).length)throw Error('No arguments expected.');return result();}},
      {name:'start_game',description:'Start Snickers 3 from the menu or replay a completed run. Cannot replace an active run.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(input&&Object.keys(input).length)throw Error('No arguments expected.');if(!['menu','won','lost'].includes(mode)||hasSavedRun())throw Error('A game is already active.');startGame();return result();}},
      {name:'set_game_paused',description:'Pause or resume the current Snickers 3 run.',inputSchema:{type:'object',properties:{paused:{type:'boolean'}},required:['paused'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||typeof input.paused!=='boolean'||Object.keys(input).some(k=>k!=='paused'))throw Error('Expected only paused: boolean.');if(!['playing','paused'].includes(mode))throw Error('No active run to pause or resume.');if(input.paused&&mode==='playing')pauseGame();if(!input.paused&&mode==='paused')resumeGame();return result();}}
    ];
    for(const tool of registry){try{Promise.resolve(modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
    window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  }
  applySettings(false);
  initContentPatch();
  initEichelkopfPatch();
  requestAnimationFrame(frame);
})();
