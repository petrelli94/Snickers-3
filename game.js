'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const canvas = $('gameCanvas'), ctx = canvas.getContext('2d'), shell = $('gameShell');
  const W = 1280, H = 720, TAU = Math.PI * 2;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const rnd = (lo, hi) => lo + Math.random() * (hi - lo);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  // The timer controls only how long reinforcements may spawn. A wave ends only after every spawned enemy is dead.
  const waveLengths = [38, 42, 46, 42, 46, 50, 38, 42, 46];
  const waveSpawningComplete = () => waveTime >= waveLengths[wave];
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
  let settings = {theme:'forest',accent:'lime'}, settingsReturn = 'menu', generalDefeated = false, cyberDefeated = false, lastDefeatedBoss = '';
  let newGamePlus=false, ngPlusUnlocked=false, ngPlusBuild=null;
  try{ngPlusUnlocked=localStorage.getItem('snickers3-ngplus-unlocked-v1')==='1';ngPlusBuild=JSON.parse(localStorage.getItem('snickers3-ngplus-build-v1')||'null');}catch{}
  try { const saved=JSON.parse(localStorage.getItem('snickers3-settings-v4')||localStorage.getItem('snickers3-settings-v3')||localStorage.getItem('snickers3-settings-v2')||'{}'); if(themes[saved.theme])settings.theme=saved.theme;if(accents[saved.accent])settings.accent=saved.accent; } catch {}
  const accent = () => accents[settings.accent].hex;
  const isBoss = e => e?.type === 'boss';
  let mode = 'menu', previousMode = 'playing', player, enemies = [], bullets = [], enemyBullets = [], particles = [], pickups = [], hazards = [], floaters = [], thrownWeapons = [];
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
    {id:'nutless',title:'TROCKENÜBUNG',desc:'Starte eine Welle ohne eine Bombe zu benutzen.',goal:1,kind:'gag'},
    {id:'comeback',title:'AUS DEM FELSEN',desc:'Erlebe Karnils zweite Phase.',goal:1,kind:'gag'},
    {id:'intro_story',title:'FELLIGE MOTIVATION',desc:'Sieh dir Snickers’ Jagdgrund an.',goal:1,kind:'gag'},
    {id:'retry_hero',title:'NOCH EINE RUNDE',desc:'Nutze eine der drei Gesamt-Retries.',goal:1,kind:'gag'},
    {id:'three_strikes',title:'DREI VERSUCHE',desc:'Verbrauche alle drei Retry-Marken.',goal:3,kind:'progress'},
    {id:'full_reload',title:'MUNITIONSHAMSTER',desc:'Sammle 20 seltene Spezialmunitions-Drops.',goal:20,kind:'progress'},
    {id:'boss_breaker',title:'BOSS-BRECHER',desc:'Besiege alle drei Bosse.',goal:3,kind:'progress'},
    {id:'power_mix',title:'POWER-BUFFET',desc:'Sammle fünf verschiedene Power-ups.',goal:5,kind:'progress'},
    {id:'speed_demon',title:'RASERFELL',desc:'Sammle FLINKES FELL ein.',goal:1,kind:'gag'},
    {id:'phase_shift',title:'DURCH DIE WAND',desc:'Werde mit PHASENFELL unberührbar.',goal:1,kind:'gag'},
    {id:'double_trouble',title:'DOPPELT GEMOPPELT',desc:'Aktiviere DOPPELSCHUSS.',goal:1,kind:'gag'},
    {id:'freeze_frame',title:'EINGEFROREN',desc:'Friere eine Gegnerhorde ein.',goal:1,kind:'gag'},
    {id:'score_hog',title:'PUNKTEFERKEL',desc:'Sammle 10.000 Punkte in einem Lauf.',goal:10000,kind:'progress'},
    {id:'arsenal',title:'ARSENAL AUF',desc:'Schalte fünf Waffenarten frei.',goal:5,kind:'progress'},
    {id:'clean_wave',title:'SAUBERE SACHE',desc:'Beende eine Welle ohne Treffer.',goal:1,kind:'gag'},
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
    {id:'ngplus_all_skills',title:'FÜNF PLUS',desc:'Sammle alle fünf exklusiven New-Game+-Skills.',goal:5,kind:'progress',ngplus:true,secret:true},
    {id:'ngplus_phase3',title:'DRITTE RUNDE',desc:'Erreiche Karnils dritte Phase in New Game+.',goal:1,kind:'gag',ngplus:true,secret:true},
    {id:'ngplus_pafti',title:'PAFTI WAR HIER',desc:'Erlebe Paftis Eingriff in Karnils dritte Phase.',goal:1,kind:'gag',ngplus:true,secret:true},
    {id:'ngplus_clear',title:'PLUS DURCHGESPIELT',desc:'Schließe New Game+ vollständig ab.',goal:1,kind:'gag',ngplus:true,secret:true}
  ];
  let achievementData={};
  try { achievementData=JSON.parse(localStorage.getItem('snickers3-achievements-v4')||localStorage.getItem('snickers3-achievements-v3')||'{}')||{}; } catch {}
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

  function tone(freq, duration = .1, type = 'sine', volume = .06, endFreq) {
    if (!soundOn || !audioContext) return;
    try {
      const t = audioContext.currentTime, osc = audioContext.createOscillator(), gain = audioContext.createGain();
      osc.type = type; osc.frequency.setValueAtTime(freq, t);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 20), t + duration);
      gain.gain.setValueAtTime(volume, t); gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
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
    if (soundOn) { addAchievementProgress('music_rush'); tone(660, .14, 'triangle', .06, 880); }
  }
  function music(dt) {
    if (!soundOn) return;
    musicTimer -= dt;
    if (musicTimer <= 0) {
      const track = boss?.karnil ? {bpm:238,notes:[98,147,196,247,294,392,294,247]} : boss?.cyber ? {bpm:226,notes:[123,155,196,247,311,392,311,247]} : boss ? {bpm:218,notes:[147,185,220,277,330,415,330,277]} : waveTracks[clamp(wave,0,waveTracks.length-1)];
      if(musicTrack!==wave){musicStep=0;musicTrack=wave;}
      musicTimer = 60 / track.bpm;
      const notes = track.notes;
      tone(notes[musicStep % notes.length], .18, 'triangle', .035);
      tone(notes[(musicStep+2) % notes.length] * 2, .08, 'square', .013);
      if (musicStep % 4 === 0) tone(notes[0] / 2, .09, 'sine', .085, notes[0]/4);
      musicStep++;
    }
  }
  function toast(message) {
    $('loadingNotice').textContent = message; $('loadingNotice').classList.remove('hidden');
    clearTimeout(noticeTimer); noticeTimer = setTimeout(() => $('loadingNotice').classList.add('hidden'), 2800);
  }
  function saveAchievements(){try{localStorage.setItem('snickers3-achievements-v4',JSON.stringify(achievementData));}catch{}}
  function unlockAchievement(id,amount=1){
    const item=achievements.find(a=>a.id===id);if(!item||achievementUnlocked(id))return;
    const current=achievementValue(id)+amount;achievementData[id]={progress:Math.min(item.goal,current),unlocked:current>=item.goal};saveAchievements();
    if(current>=item.goal){
      $('achievementHud').innerHTML=`<span class="achievement-pop"><b>★ ACHIEVEMENT</b><strong>${item.title}</strong><small>${item.desc}</small></span>`;$('achievementHud').classList.remove('hidden');
      clearTimeout(achievementTimer);achievementTimer=setTimeout(()=>$('achievementHud').classList.add('hidden'),4700);tone(740,.12,'triangle',.07,1040);setTimeout(()=>tone(1040,.22,'triangle',.06,1480),100);
    }
  }
  function addAchievementProgress(id,amount=1){
    const item=achievements.find(a=>a.id===id);if(!item||achievementUnlocked(id))return;unlockAchievement(id,amount);
  }
  function showAchievements(){
    if(mode!=='menu')return;mode='achievements';
    const rows=achievements.map(a=>{const hidden=a.secret&&!ngPlusUnlocked;if(hidden)return `<div class="achievement-row secret-achievement"><span class="achievement-badge">?</span><div><strong>???</strong><small>GEHEIM · Wird nach dem ersten Durchspielen enthüllt.</small><div class="achievement-track"><i style="width:0%"></i></div></div><b>—</b></div>`;const value=Math.min(a.goal,achievementValue(a.id)),done=achievementUnlocked(a.id),pct=value/a.goal*100;return `<div class="achievement-row ${done?'done':''}${a.ngplus?' ngplus-achievement':''}"><span class="achievement-badge">${done?'★':'○'}</span><div><strong>${a.title}</strong><small>${a.desc}</small><div class="achievement-track"><i style="width:${pct}%"></i></div></div><b>${value}/${a.goal}</b></div>`;}).join('');
    showOverlay(`<span class="eyebrow">DEINE NUSS-CHRONIK</span><h2 id="overlayTitle">ACHIEVEMENTS</h2><p>${achievements.filter(a=>achievementUnlocked(a.id)).length} von ${achievements.length} freigeschaltet.</p><div class="achievement-list">${rows}</div><button class="primary-button" id="achievementClose">ZURÜCK <span>↗</span></button>`);$('achievementClose').onclick=()=>{mode='menu';hideOverlay();$('startButton').focus();};
  }
  function announce(kicker, title) {
    $('announcementKicker').textContent = kicker; $('announcementTitle').textContent = title;
    const el = $('announcement'); el.classList.add('hidden'); void el.offsetWidth; el.classList.remove('hidden');
    clearTimeout(announcementTimer); announcementTimer = setTimeout(() => el.classList.add('hidden'), 2800);
  }
  function showOverlay(html) {
    $('overlayContent').innerHTML = html; $('overlay').classList.remove('hidden');
    requestAnimationFrame(() => $('overlayContent').querySelector('button')?.focus());
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
    showOverlay(`<span class="eyebrow">DEIN HAMSTER. DEINE FARBEN.</span><h2 id="overlayTitle">EINSTELLUNGEN</h2><div class="settings-section"><h3>Farbwelt</h3><div class="theme-options">${Object.entries(themes).map(([id,t])=>`<button class="theme-option" id="theme-${id}" aria-pressed="${settings.theme===id}"><span class="theme-preview" style="background:linear-gradient(130deg,${t.ground[0]},${t.bg})"></span><strong>${t.name}</strong><small>${t.note}</small><span class="choice-check" aria-hidden="true">✓</span></button>`).join('')}</div></div><div class="settings-section"><h3>UI-Farbe</h3><div class="accent-options">${Object.entries(accents).map(([id,a])=>`<button id="accent-${id}" class="accent-option" aria-pressed="${settings.accent===id}"><span style="background:${a.hex}"></span>${a.name}<i class="choice-check" aria-hidden="true">✓</i></button>`).join('')}</div></div><div class="settings-section rebirth-section"><h3>Hamsterneugeburt</h3><p>Setze ausgewählte lokale Fortschrittsdaten zurück.</p><button class="secondary-button rebirth-open" id="rebirthOpen">🐹 HAMSTERNEUGEBURT</button></div><p class="settings-note">Farbwelt und UI-Farbe werden auf diesem Gerät gespeichert. Das laufende Spiel pausiert hier.</p><button class="primary-button" id="settingsClose">FERTIG <span>↗</span></button>`);
    for(const id of Object.keys(themes))$(`theme-${id}`).onclick=()=>{settings.theme=id;applySettings();for(const k of Object.keys(themes))$(`theme-${k}`).setAttribute('aria-pressed',String(k===id));};
    for(const id of Object.keys(accents))$(`accent-${id}`).onclick=()=>{settings.accent=id;applySettings();for(const k of Object.keys(accents))$(`accent-${k}`).setAttribute('aria-pressed',String(k===id));};
    $('rebirthOpen').onclick=showHamsterRebirth;
    $('settingsClose').onclick=closeSettings;
  }
  function showHamsterRebirth(){
    if(mode!=='settings')return;
    showOverlay(`<span class="eyebrow">OPTIONEN · LOKALE DATEN</span><h2 id="overlayTitle">HAMSTERNEUGEBURT</h2><p>Wähle aus, was auf diesem Gerät zurückgesetzt werden soll. Nicht angehakte Daten bleiben erhalten.</p><div class="rebirth-options"><label class="rebirth-choice"><input type="checkbox" id="resetAchievements"><span><strong>Achievements zurücksetzen</strong><small>Setzt alle 40 Achievements und deren Fortschritt auf 0.</small></span></label><label class="rebirth-choice"><input type="checkbox" id="resetHighscore"><span><strong>Highscore zurücksetzen</strong><small>Löscht den lokal gespeicherten Rekord.</small></span></label></div><div class="overlay-actions"><button class="secondary-button" id="rebirthBack">ZURÜCK</button><button class="primary-button danger-button" id="rebirthConfirm" disabled>NEUGEBURT STARTEN <span>↻</span></button></div>`);
    const ach=$('resetAchievements'),high=$('resetHighscore'),confirm=$('rebirthConfirm');
    const sync=()=>{confirm.disabled=!(ach.checked||high.checked);};
    ach.onchange=sync;high.onchange=sync;
    $('rebirthBack').onclick=showSettings;
    confirm.onclick=()=>{
      if(confirm.disabled)return;
      if(ach.checked){achievementData={};try{localStorage.removeItem('snickers3-achievements-v4');localStorage.removeItem('snickers3-achievements-v3');}catch{}$('achievementHud').classList.add('hidden');}
      if(high.checked){record=0;try{localStorage.removeItem('snickers3-best-v4');localStorage.removeItem('snickers3-best-v3');}catch{}$('menuRecord').textContent='';}
      showOverlay(`<span class="eyebrow">HAMSTERNEUGEBURT ABGESCHLOSSEN</span><h2 id="overlayTitle">FRISCH AUS DEM NEST.</h2><p>${ach.checked&&high.checked?'Achievements und Highscore wurden zurückgesetzt.':ach.checked?'Alle Achievements wurden zurückgesetzt.':'Der Highscore wurde zurückgesetzt.'}</p><button class="primary-button" id="rebirthDone">ZURÜCK ZU DEN OPTIONEN <span>↗</span></button>`);
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
  const ngPlusCarryKeys=['maxHp','speed','dashCooldown','damage','fireRate','spread','pierce','magnet','frost','chain','orbit','nutSentry','carrotDrone','shield','vampire','powerLuck','ammoBonus','ammoDropLuck','specialDamage','damageGuard','pickupLifeBonus','bossDamage','homing','crit','shockDash','ammoRefillBonus','scoreRushBonus','powerDuration','nutstorm','waveRenew','turretVolley','mustardTrail','dashNova','executioner','powerFrenzy'];
  function captureNGPlusBuild(p){
    const build={};for(const k of ngPlusCarryKeys)if(p[k]!==undefined)build[k]=p[k];
    build.skills={...(p.skills||{})};build.specials={...(p.specials||{})};build.weapons=[...(p.weapons||['nutBomb'])];build.scorePerks={...(p.scorePerks||{})};return build;
  }
  function applyNGPlusBuild(p,build){
    if(!build)return;for(const k of ngPlusCarryKeys)if(build[k]!==undefined)p[k]=build[k];
    p.skills={...(build.skills||{})};p.specials={...(build.specials||{})};p.weapons=[...(build.weapons||['nutBomb'])];p.scorePerks={damage:0,speed:0,fireRate:0,dash:0,powerLuck:0,...(build.scorePerks||{})};
    p.weaponUses={};for(const id of p.weapons)p.weaponUses[id]=(weaponBook[id]?.max||0)+(p.ammoBonus||0);p.weaponIndex=0;p.hp=p.maxHp;p.shieldReady=Boolean(p.shield);p.shieldCd=0;p.nutSentryCd=0;p.carrotDroneCd=0;
  }
  function saveNGPlusBuild(){
    if(!player)return;ngPlusUnlocked=true;ngPlusBuild=captureNGPlusBuild(player);try{localStorage.setItem('snickers3-ngplus-unlocked-v1','1');localStorage.setItem('snickers3-ngplus-build-v1',JSON.stringify(ngPlusBuild));}catch{}updateNGPlusMenu();
  }
  function updateNGPlusMenu(){const b=$('ngPlusButton');if(!b)return;b.classList.toggle('hidden',!(ngPlusUnlocked&&ngPlusBuild));}
  function startGame(ng=false) {
    clearTimeout(announcementTimer); clearTimeout(noticeTimer); resetInput();
    newGamePlus=Boolean(ng&&ngPlusUnlocked&&ngPlusBuild);
    player = { x: W / 2, y: H / 2 + 25, r: 18, hp: 5, maxHp: 5, speed: 264, invuln: 1.8, dashCd: 0, dashCooldown:2.25, dashTime: 0, dashX: 1, dashY: 0, face: 1, moving: false, angle: 0, bombs: 2, damage: 1, fireRate: .32, spread: 0, pierce: 0, magnet: 90, trail: [], skills:{}, frost:false, chain:false, orbit:false, orbitCd:0, nutSentry:false, nutSentryCd:0, carrotDrone:false, carrotDroneCd:0, shield:false, shieldReady:false, shieldCd:0, vampire:false, vampireKills:0, shotCount:0, weapons:['nutBomb'],weaponIndex:0,weaponUses:{nutBomb:3},usedWeapons:new Set(),powerups:{},powerLuck:1,powerDryKills:0,ammoBonus:0,ammoDropLuck:1,ammoDropsThisWave:0,ammoDropTarget:0,ammoDryKills:0,waveAmmoSnapshot:null,bossAmmoSnapshot:null,bossPhaseAmmoSnapshot:null,specialDamage:1,damageGuard:0,powerSeen:new Set(),moveDistance:0,dashCount:0,weaponShots:0,usedBombThisWave:false,lastWaveKills:0,waveHits:0,scoreSkillNext:30000,scoreSkillQueue:[],scorePerks:{damage:0,speed:0,fireRate:0,dash:0,powerLuck:0} };
    if(newGamePlus){
      applyNGPlusBuild(player,ngPlusBuild);
      const ownedNgSkills=Object.keys(ngPlusSkillBook).filter(id=>player.skills[id]).length;
      if(ownedNgSkills){addAchievementProgress('ngplus_first_skill');const missing=Math.max(0,ownedNgSkills-achievementValue('ngplus_all_skills'));if(missing)addAchievementProgress('ngplus_all_skills',missing);}
    }
    enemies = []; bullets = []; enemyBullets = []; particles = []; pickups = []; hazards = []; floaters = []; thrownWeapons = [];
    wave = 0; waveTime = 0; runTime = 0; score = 0; kills = 0; boss = null; generalDefeated=false; cyberDefeated=false; lastDefeatedBoss=''; retriesLeft=3;retryWave=0;retryBossKind=null; spawnTimer = .65; shotTimer = .2; shake = 0; bombFlash = 0; musicStep = 0; musicTrack=-1; pointer.x=W/2;pointer.y=H/2;pointer.active=false;
    mode = 'intro';
    $('startScreen').classList.add('hidden'); $('hud').classList.remove('hidden'); $('hud').setAttribute('aria-hidden', 'false');
    $('runInfo').classList.remove('hidden'); $('pauseButton').classList.remove('hidden'); $('touchControls').classList.remove('hidden'); $('bossHud').classList.add('hidden'); $('loadingNotice').classList.add('hidden');$('powerHud').classList.add('hidden');$('achievementHud').classList.add('hidden');
    $('skillHud').classList.add('hidden');$('skillHud').innerHTML='';
    updateHud(); updateWeaponHud(); updatePowerHud();updateSkills();
    showOverlay(newGamePlus?'<span class="eyebrow ngplus-kicker">NEW GAME+ · DIE HASEN HABEN NICHT GELERNT</span><h2 id="overlayTitle">RUNDE ZWEI. KEINE AUSREDEN.</h2><p>Snickers behält seinen kompletten Build. Dafür kommen doppelt so viele Gegner, sie verursachen doppelten Schaden, laufen schneller und haben neue Verstärkung dabei.</p><blockquote class="snickers-quote"><b>SNICKERS</b>„Ihr wolltet mehr? Ich habe meine Upgrades mitgebracht.“</blockquote><button class="primary-button ngplus-button" id="introButton">NEW GAME+ STARTEN <span>↗</span></button>':'<span class="eyebrow">VORSPANN · DIE ERSTE NUSS</span><h2 id="overlayTitle">DER FELLIGE FRIEDEN IST VORBEI.</h2><p>Snickers putzt gerade gemütlich sein Fell. Da schnappt sich ein frecher Hase seine Nuss und hoppelt davon. Snickers wird wütend, schnappt sich den Blaster und geht auf Hasenjagd.</p><blockquote class="snickers-quote"><b>SNICKERS</b>„Meine Nuss. Meine Regeln.“</blockquote><button class="primary-button" id="introButton">HASENJAGD STARTEN <span>↗</span></button>');
    $('introButton').onclick=beginFirstWave;
    addAchievementProgress('intro_story',1);
  }
  function beginFirstWave(){
    if(mode!=='intro')return;
    if(newGamePlus)addAchievementProgress('ngplus_start');
    tone(330,.3,'triangle',.08,660);addAchievementProgress('nutless',1);startWave(0);
  }
  function goMenu() {
    mode = 'menu'; resetInput(); hideOverlay();
    $('startScreen').classList.remove('hidden'); $('hud').classList.add('hidden'); $('hud').setAttribute('aria-hidden', 'true');
    for (const id of ['runInfo','pauseButton','touchControls','bossHud','announcement','skillHud','powerHud','achievementHud']) $(id).classList.add('hidden');
    $('menuRecord').textContent = record ? `LOKALER REKORD ${record.toLocaleString('de-DE')}` : '';updateNGPlusMenu();
    $('startButton').focus();
  }
  function pauseGame() {
    if (mode === 'paused') return resumeGame();
    if (mode !== 'playing') return;
    previousMode = mode; mode = 'paused'; resetInput(); $('announcement').classList.add('hidden');
    const powerRows=Object.values(powerBook).map(p=>`<div class="pause-power-row"><span class="power-guide-icon">${p.icon}</span><span><b>${p.name}</b><small>${p.desc} · ${p.duration}s</small></span></div>`).join('');
    showOverlay(`<span class="eyebrow">TAKTISCHE KNABBERPAUSE</span><h2 id="overlayTitle">DIE SCHWEINE WARTEN.</h2><p>Durchatmen. Nüsse zählen. Hier steht auch noch einmal, was die einsammelbaren Power-ups machen.</p><div class="pause-power-guide">${powerRows}</div><div class="overlay-actions"><button class="primary-button" id="resumeButton">WEITERSPIELEN <span>↗</span></button><button class="secondary-button" id="pauseSettings">Einstellungen</button><button class="secondary-button" id="menuButton">Zum Hauptmenü</button></div>`);
    $('resumeButton').onclick = resumeGame; $('menuButton').onclick = goMenu;$('pauseSettings').onclick=showSettings;
  }
  function resumeGame() { if (mode !== 'paused') return; mode = previousMode; hideOverlay(); lastFrame = performance.now(); }
  function showHelp() {
    if (mode !== 'menu') return;
    mode = 'help';
    showOverlay('<span class="eyebrow">DEIN SEHR KURZES ÜBERLEBENSHANDBUCH</span><h2 id="overlayTitle">KLEIN, ABER BEWAFFNET.</h2><p>Überlebe 9 Wellen. Der Nachschub läuft eine Weile, aber eine Welle ist erst geschafft, wenn wirklich jeder Gegner erledigt ist. Nach Welle 3 wartet General Hasenbein, nach Welle 6 seine Cyber-Version, danach Karnil.</p><div class="help-grid"><div class="help-row"><kbd>WASD</kbd><span>Bewegen<small>Auch mit Pfeiltasten oder dem Touch-Stick.</small></span></div><div class="help-row"><kbd>MAUS</kbd><span>Zielen<small>Sanfte Zielhilfe korrigiert nur leicht in Richtung Gegner.</small></span></div><div class="help-row"><kbd>LMB</kbd><span>Waffe abfeuern<small>Die normalen Schüsse starten automatisch; Linksklick feuert sofort in Maus-Richtung.</small></span></div><div class="help-row"><kbd>E</kbd><span>Spezialwaffe abfeuern<small>Benutzt die aktuell ausgewählte Spezialwaffe.</small></span></div><div class="help-row"><kbd>SPACE</kbd><span>Ausweichen<small>Kurz unverwundbar. Alle 2,25 Sekunden.</small></span></div><div class="help-row"><kbd>Q/R</kbd><span>Spezialwaffe wechseln<small>Wechselt zwischen Nussbombe und freigeschalteten Spezialwaffen.</small></span></div></div><p>Orange Warnungen bedeuten: raus da! Gegner können seltene, zeitlich begrenzte Power-ups und sehr selten Spezialmunition fallen lassen. Spezialwaffen laden sich zwischen Wellen nicht automatisch auf. Drei Gesamt-Retries halten dich im Lauf.</p><button class="primary-button" id="helpClose">ALLES KLAR <span>↗</span></button>');
    $('helpClose').onclick = () => { mode = 'menu'; hideOverlay(); $('startButton').focus(); };
  }
  function showPowerups() {
    if (mode !== 'menu') return;
    mode = 'help';
    const rows=Object.values(powerBook).map(p=>`<div class="help-row power-guide-row"><span class="power-guide-icon">${p.icon}</span><span>${p.name}<small>${p.desc} · ${p.duration}s</small></span></div>`).join('');
    showOverlay(`<span class="eyebrow">EINSAMMELBARE POWER-UPS</span><h2 id="overlayTitle">KLEINE DROPS. GROSSE WIRKUNG.</h2><p>Power-ups fallen selten von besiegten Gegnern. Sie wirken sofort und laufen nach der angezeigten Zeit wieder aus.</p><div class="help-grid powerup-guide">${rows}</div><button class="primary-button" id="powerupClose">ZURÜCK <span>↗</span></button>`);
    $('powerupClose').onclick=()=>{mode='menu';hideOverlay();$('powerupButton').focus();};
  }
  function useDash() {
    if (mode !== 'playing' || player.dashCd > 0) return;
    let x = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + touch.x;
    let y = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) + touch.y;
    const m = Math.hypot(x, y);
    if (m < .1) { x = player.face; y = 0; } else { x /= m; y /= m; }
    player.dashX = x; player.dashY = y; player.dashTime = .19; player.dashCd = player.dashCooldown; player.invuln = Math.max(player.invuln, .42);
    if(player.shockDash){for(const e of enemies)if(!e.dead&&dist(player,e)<105)damageEnemy(e,15,true);if(boss&&!boss.dead&&dist(player,boss)<120)damageEnemy(boss,18,true);}
    burst(player.x, player.y, accent(), 14, 110); tone(250, .18, 'sine', .05, 650);
  }
  const weaponBook={
    nutBomb:{name:'NUSSBOMBE',icon:'◎',desc:'Defensiver Notfallknopf: starker Rundumschaden und löscht Geschosse sowie Gefahren in deiner Nähe.',max:3},
    carrotMine:{name:'MÖHRENMINE',icon:'◇',desc:'Große verzögerte Sprengfalle. Hoher Flächenschaden für wenig wertvolle Munition.',max:6},
    peanutBoomerang:{name:'NUSS-BOOMERANG',icon:'↩',desc:'Munitionsstarker Linienräumer. Trifft Gegner auf Hin- UND Rückflug erneut.',max:7},
    acornNova:{name:'EICHEL-NOVA',icon:'✹',desc:'Panikknopf gegen Umzingelung: 20 durchschlagende Eicheln in alle Richtungen.',max:5},
    pigPopper:{name:'SCHWEINEPOPFER',icon:'✦',desc:'Extremer Anti-Schwein-Schockstoß mit vernichtendem Schaden gegen Ferkel und Bosse.',max:4},
    walnutCannon:{name:'WALLNUSS-KANONE',icon:'◉',desc:'Extrem schweres Geschoss mit sehr hohem Schaden und starkem Durchschlag.',max:2},
    hazelnutShotgun:{name:'HASELNUSS-SCHROT',icon:'⋰',desc:'Elf schwere Pellets. Auf kurze Distanz eine der höchsten Schadensspitzen.',max:5},
    carrotLaser:{name:'MÖHRENLASER',icon:'━',desc:'Sofortiger breiter Strahl mit hohem Schaden durch die komplette Gegnerlinie.',max:2},
    acornRocket:{name:'EICHEL-RAKETE',icon:'➤',desc:'Große Explosion mit sehr hohem Flächen- und Boss-Schaden.',max:2},
    nutDrill:{name:'NUSSBOHRER',icon:'↠',desc:'Massive Bohrnuss mit enormem Linienschaden und fast unbegrenztem Durchschlag.',max:2},
    mustardBazooka:{name:'NUSS-BAZOOKA MIT SENF',icon:'☢',desc:'NG+-Waffe: Eine gewaltige Senfnuss explodiert im Zielgebiet und schleudert brennende Senfsplitter weiter.',max:2}
  };
  function maxWeaponAmmo(id){return (weaponBook[id]?.max||0)+(player?.ammoBonus||0);}
  function refillWeapons(){
    if(!player)return;
    for(const id of player.weapons)player.weaponUses[id]=maxWeaponAmmo(id);
    updateWeaponHud();addAchievementProgress('full_reload');
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
    if(!player)return;
    for(const id of player.weapons){
      const max=maxWeaponAmmo(id);
      if(id==='nutBomb')player.weaponUses[id]=max;
      else player.weaponUses[id]=Math.min(max,weaponAmmo(id)+Math.max(1,Math.ceil(max*.5)));
    }
    updateWeaponHud();
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
  function consumeWeapon(id){if(weaponAmmo(id)<=0){toast(`${weaponBook[id].name} ist leer.`);return false;}player.weaponUses[id]--;player.usedWeapons.add(id);addAchievementProgress('weapon_rack',player.usedWeapons.size>=3?1:0);addAchievementProgress('arsenal',player.weapons.length>=5?1:0);if(id==='walnutCannon')addAchievementProgress('walnut_boom');if(id==='hazelnutShotgun')addAchievementProgress('scatter_king');if(id==='carrotLaser')addAchievementProgress('laser_line');if(id==='acornRocket')addAchievementProgress('rocket_science');if(id==='nutDrill')addAchievementProgress('drill_baby');if(id==='mustardBazooka'&&newGamePlus)addAchievementProgress('ngplus_mustard');updateWeaponHud();return true;}
  function useWeapon(){
    if(mode!=='playing'||!player)return;
    const id=player.weapons[player.weaponIndex]||'nutBomb';if(!consumeWeapon(id))return;
    player.weaponShots++;
    if(id==='nutBomb'){
      player.usedBombThisWave=true;bombFlash=.5;shake=reducedMotion?0:10;particles.push({type:'ring',x:player.x,y:player.y,life:.65,maxLife:.65,r:0,color:accent()});burst(player.x,player.y,accent(),65,440);
      const specialMult=player.specialDamage||1;for(const e of enemies)if(dist(player,e)<255)damageEnemy(e,29*specialMult,true);if(boss&&dist(player,boss)<285)damageEnemy(boss,38*specialMult,true);enemyBullets=enemyBullets.filter(b=>dist(player,b)>340);hazards=hazards.filter(h=>h.friendly||dist(player,h)>275);tone(160,.5,'sawtooth',.12,25);
    }else if(id==='carrotMine'){
      hazards.push({type:'mine',x:player.x,y:player.y,r:105,wait:.9,life:13,hit:false,damage:34*(player.specialDamage||1),friendly:true});burst(player.x,player.y,'#f2a85c',13,80);tone(260,.12,'square',.04,140);
    }else if(id==='peanutBoomerang'){
      thrownWeapons.push({type:'boomerang',x:player.x,y:player.y,startX:player.x,startY:player.y,vx:Math.cos(player.angle)*470,vy:Math.sin(player.angle)*470,life:1.72,damage:10*(player.specialDamage||1),returning:false,hitIds:new Set(),r:13});tone(480,.12,'triangle',.05,780);
    }else if(id==='acornNova'){
      for(let i=0;i<20;i++){const a=TAU*i/20;bullets.push({x:player.x,y:player.y,vx:Math.cos(a)*525,vy:Math.sin(a)*525,life:1.22,damage:7*(player.specialDamage||1),pierce:2,hitIds:new Set(),r:8,a,frost:player.frost});}burst(player.x,player.y,'#f5d278',32,220);tone(220,.4,'sawtooth',.08,880);
    }else if(id==='pigPopper'){
      hazards.push({type:'shock',x:player.x,y:player.y,r:240,wait:.1,life:.3,hit:false,damage:42*(player.specialDamage||1),pigBonus:2.25,bossBonus:1.65,friendly:true});burst(player.x,player.y,'#ffb3e4',30,260);tone(360,.33,'square',.09,80);
    }else if(id==='walnutCannon'){
      const a=player.angle,sm=player.specialDamage||1;
      bullets.push({x:player.x+Math.cos(a)*24,y:player.y+Math.sin(a)*24,vx:Math.cos(a)*610,vy:Math.sin(a)*610,life:1.55,damage:46*sm,pierce:7,hitIds:new Set(),r:16,a,frost:false,heavy:true});
      burst(player.x+Math.cos(a)*25,player.y+Math.sin(a)*25,'#e5bc69',20,135);shake=reducedMotion?0:4;tone(115,.24,'square',.08,60);
    }else if(id==='hazelnutShotgun'){
      const sm=player.specialDamage||1;
      for(let i=-5;i<=5;i++){const a=player.angle+i*.075;bullets.push({x:player.x,y:player.y,vx:Math.cos(a)*720,vy:Math.sin(a)*720,life:.78,damage:6.5*sm,pierce:1,hitIds:new Set(),r:6,a,frost:false});}
      burst(player.x,player.y,'#f0d28a',22,180);tone(185,.18,'sawtooth',.07,90);
    }else if(id==='carrotLaser'){
      const a=player.angle,len=840,x2=player.x+Math.cos(a)*len,y2=player.y+Math.sin(a)*len,sm=player.specialDamage||1;
      particles.push({type:'beam',x:player.x,y:player.y,x2,y2,life:.2,maxLife:.2,color:'#ffb35e'});
      const all=boss&&!boss.dead?[...enemies,boss]:enemies;
      for(const e of all){if(e.dead)continue;const vx=x2-player.x,vy=y2-player.y,l2=vx*vx+vy*vy,t=clamp(((e.x-player.x)*vx+(e.y-player.y)*vy)/l2,0,1),px=player.x+vx*t,py=player.y+vy*t;if(Math.hypot(e.x-px,e.y-py)<e.r+30)damageEnemy(e,34*sm,true);if(mode!=='playing')break;}
      shake=reducedMotion?0:5;tone(520,.28,'sawtooth',.07,1100);
    }else if(id==='acornRocket'){
      const a=player.angle,tx=clamp(player.x+Math.cos(a)*430,70,W-70),ty=clamp(player.y+Math.sin(a)*430,130,H-65),sm=player.specialDamage||1;
      particles.push({type:'ring',x:tx,y:ty,life:.5,maxLife:.5,r:0,color:'#ffb35e'});burst(tx,ty,'#f0a15d',42,310);
      for(const e of enemies)if(!e.dead&&Math.hypot(e.x-tx,e.y-ty)<178+e.r)damageEnemy(e,34*sm,true);
      if(boss&&!boss.dead&&Math.hypot(boss.x-tx,boss.y-ty)<198+boss.r)damageEnemy(boss,44*sm,true);
      shake=reducedMotion?0:8;tone(95,.42,'sawtooth',.1,35);
    }else if(id==='nutDrill'){
      const a=player.angle,sm=player.specialDamage||1;
      bullets.push({x:player.x+Math.cos(a)*24,y:player.y+Math.sin(a)*24,vx:Math.cos(a)*520,vy:Math.sin(a)*520,life:1.9,damage:25*sm,pierce:14,hitIds:new Set(),r:20,a,frost:false,drill:true});
      burst(player.x,player.y,'#c89a58',18,120);tone(250,.42,'sawtooth',.06,95);
    }else if(id==='mustardBazooka'){
      const a=player.angle,tx=clamp(player.x+Math.cos(a)*485,80,W-80),ty=clamp(player.y+Math.sin(a)*485,140,H-70),sm=player.specialDamage||1;
      particles.push({type:'ring',x:tx,y:ty,life:.7,maxLife:.7,r:0,color:'#e8d43b'});burst(tx,ty,'#e7cf3e',60,360);
      for(const e of enemies)if(!e.dead&&Math.hypot(e.x-tx,e.y-ty)<220+e.r)damageEnemy(e,58*sm,true);
      if(boss&&!boss.dead&&Math.hypot(boss.x-tx,boss.y-ty)<235+boss.r)damageEnemy(boss,70*sm,true);
      for(let i=0;i<10;i++){const ba=TAU*i/10;bullets.push({x:tx,y:ty,vx:Math.cos(ba)*430,vy:Math.sin(ba)*430,life:.8,damage:12*sm,pierce:2,hitIds:new Set(),r:8,a:ba,frost:false,mustard:true});}
      shake=reducedMotion?0:12;tone(72,.55,'sawtooth',.12,28);
    }
    updateWeaponHud();
  }
  function useBomb(){useWeapon();}
  const powerBook={
    haste:{name:'FLINKES FELL',icon:'⚡',duration:8,desc:'Du läufst 34 % schneller.',apply:p=>p.powerups.haste=8},
    berserk:{name:'WUT-NUSS',icon:'✹',duration:8,desc:'Deutlich mehr Schussschaden und viel schnelleres Feuer.',apply:p=>p.powerups.berserk=8},
    magnet:{name:'MAGNET-MÖHRE',icon:'✧',duration:10,desc:'Zieht Herzen, Nüsse und Power-ups aus deutlich größerer Entfernung an.',apply:p=>p.powerups.magnet=10},
    barrier:{name:'KUSCHELSCHILD',icon:'◇',duration:8,desc:'Blockt den nächsten Treffer vollständig.',apply:p=>p.powerups.barrier=8},
    jackpot:{name:'NUSS-JACKPOT',icon:'$',duration:7,desc:'Normale Nuss-Drops geben viermal so viele Punkte.',apply:p=>p.powerups.jackpot=7},
    freeze:{name:'EIS-MÖHRE',icon:'❄',duration:7,desc:'Verlangsamt die gesamte Gegnerhorde deutlich.',apply:p=>p.powerups.freeze=7},
    doubleShot:{name:'DOPPELSCHUSS',icon:'✣',duration:8,desc:'Jeder Schuss wird zur breiten Dreifachsalve.',apply:p=>p.powerups.doubleShot=8},
    phase:{name:'PHASENFELL',icon:'◈',duration:5,desc:'Du bist für kurze Zeit komplett unverwundbar.',apply:p=>p.powerups.phase=5},
    scoreRush:{name:'PUNKTEBRAUSE',icon:'★',duration:9,desc:'Verdoppelt Punkte durch Kills und eingesammelte Nüsse.',apply:p=>p.powerups.scoreRush=9},
    thorns:{name:'STACHELNUSS',icon:'✦',duration:8,desc:'Bei Treffern bekommen Gegner in deiner Nähe Gegenschaden.',apply:p=>p.powerups.thorns=8},
    overclock:{name:'NUSS-TURBO',icon:'»',duration:7,desc:'Deine normale Waffe feuert 38 % schneller.',apply:p=>p.powerups.overclock=7},
    giantNut:{name:'RIESENNUSS',icon:'●',duration:8,desc:'Schüsse werden größer und verursachen 40 % mehr Schaden.',apply:p=>p.powerups.giantNut=8},
    regen:{name:'NOTFALL-SNACK',icon:'♥',duration:8,desc:'Regeneriert während der Laufzeit regelmäßig Herzen.',apply:p=>{p.powerups.regen=8;p.regenCd=0;}},
    overdrive:{name:'ROTER BLICK',icon:'☄',duration:5,desc:'SEHR SELTEN: 5 s unverwundbar, doppelte Feuerrate und doppelter normaler Schussschaden.',rare:true,apply:p=>p.powerups.overdrive=5}
  };
  function rollPowerupId(){
    if(Math.random()<.02)return 'overdrive';
    const ids=Object.keys(powerBook).filter(id=>id!=='overdrive');return ids[Math.floor(Math.random()*ids.length)];
  }
  function dropPowerup(x,y){
    if(Math.random()>(.035*(player?.powerLuck||1)))return;const id=rollPowerupId();pickups.push({x,y,type:'power',power:id,life:18,phase:rnd(0,TAU)});
  }
  function collectPowerup(p){const power=powerBook[p.power];if(!power)return;power.apply(player);if(player.powerDuration&&p.power!=='overdrive')player.powerups[p.power]*=player.powerDuration;if(p.power==='barrier')player.invuln=Math.max(player.invuln,.8);player.powerSeen.add(p.power);addAchievementProgress('power_hungry');addAchievementProgress('power_mix',player.powerSeen.size>=5?1:0);addAchievementProgress('power_encyclopedia',Math.max(0,player.powerSeen.size-achievementValue('power_encyclopedia')));if(p.power==='haste')addAchievementProgress('speed_demon');if(p.power==='phase')addAchievementProgress('phase_shift');if(p.power==='doubleShot')addAchievementProgress('double_trouble');if(p.power==='freeze')addAchievementProgress('freeze_frame');floater(player.x,player.y-38,`${power.icon} ${power.name}`,accent());tone(p.power==='overdrive'?860:620,p.power==='overdrive'?.32:.18,'triangle',p.power==='overdrive'?.1:.07,p.power==='overdrive'?1320:980);updatePowerHud();}
  function spawnEnemy(type) {
    const angle = rnd(0, TAU), x = clamp(player.x + Math.cos(angle) * 660, 38, W - 38), y = clamp(player.y + Math.sin(angle) * 660, 112, H - 48);
    const stats = { bunny: [2+(wave>2?1:0), 76 + wave * 7, 18, 65], runner: [1+(wave>2?1:0), 154 + wave * 5, 15, 85], brute: [9, 49, 27, 160], gunner: [4, 58, 20, 120], rabid:[5,114,19,150], gatling:[9,53,24,230], splitter:[6,92,22,180], sniper:[6,46,21,280], sapper:[7,61,22,245], pigRammer:[12,68,31,320], pigMortar:[10,42,28,350], pigCannon:[14,51,27,420], pigDrone:[5,130,17,260], pigHowler:[11,48,30,390], zombieBoss:[300,58,37,1100], voidBunny:[18,102,25,560], rocketHare:[14,66,23,640], pigJuggernaut:[28,61,35,820] }[type] || [2,76,18,65];
    const e={ x, y, type, hp:stats[0], maxHp:stats[0], speed:stats[1]*(newGamePlus?1.1:1), r:stats[2], points:stats[3], phase:rnd(0,TAU), hit:0, fireCd:rnd(1.8,3), slow:0, chargeCd:rnd(1.6,2.8), windup:0, charge:0, aim:0, burstLeft:0, burstCd:0, dead:false, mortarCd:rnd(2.5,4), summonCd:rnd(3,5), summoned:false, mineCd:rnd(2.5,4), howlCd:rnd(2.8,4.5),teleportCd:rnd(2.4,4),rocketCd:rnd(2,3.4),shockCd:rnd(2.5,4) };
    enemies.push(e);return e;
  }
  function spawnBoss(cyber=false,karnil=false) {
    const hp=karnil?1800:(cyber?900:420);
    boss = { x: W / 2, y: 170, type:'boss', cyber, karnil, r:karnil?78:(cyber?55:49), hp, maxHp:hp, speed:(karnil?54:(cyber?67:49))*(newGamePlus?1.1:1), phase:0, hit:0, actionCd:karnil?1.85:2.2, attack:0, summonCd:karnil?6:8, enraged:false, dead:false, points:karnil?18000:(cyber?10000:5600), slow:0, windup:0, charge:0, aim:0, burstLeft:0, burstCd:0, phaseTwo:false,phaseThree:false,paftiHealed:false,supplyStep:0,supplyThresholds:[.78,.52,.28], pattern:0 };
    player.bossAmmoSnapshot=snapshotAmmo();player.bossPhaseAmmoSnapshot=null;
    waveTime = 0; enemyBullets = []; hazards = []; player.x=W/2;player.y=H/2+60;player.invuln=2;
    $('bossName').textContent=karnil?'KARNIL · FERKEL DER EINGESTÜRZTEN':cyber?'CYBER-HASENBEIN':'GENERAL HASENBEIN';
    $('bossHud').classList.remove('hidden');$('bossHud').classList.toggle('cyber',cyber);$('bossHud').classList.toggle('karnil',karnil);
    announce(karnil?'DER FELSEN BEWEGT SICH.':cyber?'REANIMATION ABGESCHLOSSEN.':'BOSS 01 / 03',karnil?'KARNIL':'GENERAL HASENBEIN');
    tone(karnil?45:(cyber?65:90), 1, 'sawtooth', .08, 40); updateHud();
  }
  function getMiniBoss(){return enemies.find(e=>e.miniBoss&&!e.dead)||null;}
  function spawnZombieHasenbein(){
    const existing=getMiniBoss();if(existing)return existing;
    const zombie=spawnEnemy('zombieBoss');
    zombie.miniBoss=true;zombie.hp=zombie.maxHp=520;zombie.points=4200;zombie.speed=72;zombie.r=43;zombie.fireCd=.9;zombie.chargeCd=2.1;
    zombie.x=clamp((boss?.x||W/2)-185,80,W-80);zombie.y=clamp((boss?.y||170)+120,155,H-75);
    burst(zombie.x,zombie.y,'#a7c86f',34,190);tone(84,.55,'sawtooth',.07,44);updateHud();return zombie;
  }
  function activateKarnilPhaseTwo(fromRetry=false){
    if(!boss||!boss.karnil||boss.phaseTwo)return;
    boss.phaseTwo=true;boss.enraged=true;boss.hp=boss.maxHp;boss.speed=92;boss.actionCd=.95;boss.summonCd=5.5;boss.windup=0;boss.charge=0;boss.burstLeft=0;boss.hit=0;boss.supplyStep=0;
    enemyBullets=[];hazards=[];player.invuln=Math.max(player.invuln,1.4);player.bossPhaseAmmoSnapshot=snapshotAmmo();
    spawnZombieHasenbein();addAchievementProgress('comeback');
    if(!fromRetry)announce('DER FELSEN BRICHT ENDGÜLTIG AUF.','PHASE 2 · KARNIL + ZOMBIE-HASENBEIN');
    burst(boss.x,boss.y,'#ff8c59',65,260);shake=reducedMotion?0:14;tone(42,.9,'sawtooth',.11,22);updateHud();
  }
  function spawnCyberHasenbein(){
    enemies=enemies.filter(e=>!e.miniBoss);const cyber=spawnEnemy('zombieBoss');cyber.miniBoss=true;cyber.cyberMini=true;cyber.hp=cyber.maxHp=900;cyber.points=7000;cyber.speed=88*(newGamePlus?1.1:1);cyber.r=47;cyber.fireCd=.65;cyber.chargeCd=1.7;cyber.x=clamp((boss?.x||W/2)-195,85,W-85);cyber.y=clamp((boss?.y||170)+125,160,H-80);burst(cyber.x,cyber.y,'#81eaff',45,230);tone(110,.65,'sawtooth',.08,780);updateHud();return cyber;
  }
  function activateKarnilPhaseThree(){
    if(!newGamePlus||!boss||!boss.karnil||boss.phaseThree)return;
    boss.phaseThree=true;boss.phaseTwo=true;boss.enraged=true;boss.hp=boss.maxHp;boss.speed=112;boss.actionCd=.72;boss.summonCd=4.7;boss.windup=0;boss.charge=0;boss.burstLeft=0;boss.hit=0;boss.paftiHealed=false;boss.supplyStep=0;addAchievementProgress('ngplus_phase3');
    enemyBullets=[];hazards=[];player.invuln=Math.max(player.invuln,1.8);spawnCyberHasenbein();announce('NEW GAME+ · DER STEINBRUCH BRENNT.','PHASE 3 · KARNIL + CYBER-HASENBEIN');burst(boss.x,boss.y,'#6fe7ff',90,330);shake=reducedMotion?0:18;tone(35,1.1,'sawtooth',.13,18);updateHud();
  }
  function triggerPaftiIntervention(){
    if(!boss||!boss.karnil||!boss.phaseThree||boss.paftiHealed)return;boss.paftiHealed=true;boss.hp=boss.maxHp;addAchievementProgress('ngplus_pafti');enemyBullets=[];hazards=[];mode='paftiCutscene';resetInput();updateHud();
    showOverlay(`<span class="eyebrow ngplus-kicker">NEW GAME+ · UNGEBETENER BESUCH</span><h2 id="overlayTitle">PAFTI DRÜCKT START.</h2><div class="pafti-scene" aria-label="Pafti, ein alter Mann mit SNES-Controller als Schädel"><div class="pafti-controller"><i></i><b>✚</b><em>● ●</em></div><div class="pafti-body">♟</div></div><p>Ein alter Mann wankt aus dem Staub. Wo sein Schädel sein sollte, sitzt ein vergilbter SNES-Controller. Pafti hasst Hamster – und offenbar liebt er unfair lange Bosskämpfe.</p><blockquote class="snickers-quote"><b>PAFTI</b>„Hamster gehören ins Menü, nicht ins Endgame.“</blockquote><p><strong>PAFTI HEILT KARNIL VOLLSTÄNDIG.</strong></p><button class="primary-button ngplus-button" id="paftiContinue">DANN EBEN NOCHMAL <span>↗</span></button>`);
    $('paftiContinue').onclick=()=>{if(mode!=='paftiCutscene')return;mode='playing';hideOverlay();player.invuln=2.5;lastFrame=performance.now();announce('PAFTI HAT IHN VOLLGEHEILT.','KARNIL · PHASE 3 GEHT WEITER');};
  }
  const skillBook = {
    spread:{icon:'⋔',title:'DOPPELT HÄLT BESSER',short:'Dreifachschuss',desc:'Zwei zusätzliche Nüsse pro Schuss.',apply:p=>p.spread=1},
    rapid:{icon:'»',title:'ESPRESSO-NÜSSE',short:'Schnellfeuer',desc:'35 % schneller feuern. Mehr Nuss pro Sekunde.',apply:p=>p.fireRate/=1.35},
    health:{icon:'♡',title:'DICKE BACKEN',short:'Extra-Herzen',desc:'2 zusätzliche Herzen und volle Heilung.',apply:p=>{p.maxHp+=2;p.hp=p.maxHp;}},
    pierce:{icon:'↗',title:'PANZERKNACKER',short:'Durchschlag',desc:'Schüsse durchdringen 2 weitere Gegner.',apply:p=>p.pierce+=2},
    power:{icon:'✳',title:'EXTRA KNACKIG',short:'Mehr Schaden',desc:'55 % mehr Schaden mit jeder Nuss.',apply:p=>p.damage*=1.55},
    bombs:{icon:'◎',title:'NUSS-ESKALATION',short:'Bombenvorrat',desc:'3 zusätzliche Nussbomben-Ladungen sofort.',apply:p=>p.weaponUses.nutBomb=(p.weaponUses.nutBomb||0)+3},
    frost:{icon:'❄',title:'FROSTNÜSSE',short:'Frostnüsse',desc:'Treffer bremsen Gegner 1,5 s lang um 28 %. Bosse: 12 %.',apply:p=>p.frost=true},
    chain:{icon:'ϟ',title:'KETTENKNACKER',short:'Kettenblitz',desc:'Jede 4. Salve lässt Blitze auf einen nahen Gegner überspringen.',apply:p=>p.chain=true},
    orbit:{icon:'◌',title:'NUSS-SATELLITEN',short:'Satelliten',desc:'Zwei kreisende Nüsse treffen Gegner in deiner Nähe.',apply:p=>p.orbit=true},
    nutSentry:{icon:'♜',title:'KNABBER-TURM',short:'Auto-Turm',desc:'Eine fliegende Wallnuss-Wache sucht selbstständig Ziele und feuert regelmäßig auf den nächsten Gegner.',apply:p=>{p.nutSentry=true;p.nutSentryCd=0;}},
    carrotDrone:{icon:'⌁',title:'MÖHREN-DROHNE',short:'Auto-Mörser',desc:'Eine kleine Drohne bombardiert automatisch alle paar Sekunden einen Gegner mit einer Mini-Möhrenexplosion.',apply:p=>{p.carrotDrone=true;p.carrotDroneCd=0;}},
    reflex:{icon:'↯',title:'FLUMMI-REFLEX',short:'Schneller Dash',desc:'Ausweichen alle 1,6 s und 8 % schneller laufen.',apply:p=>{p.dashCooldown=1.6;p.speed*=1.08;}},
    vampire:{icon:'♥',title:'SNACK-VAMPIR',short:'Snack-Vampir',desc:'Alle 22 besiegten Gegner: 1 Herz. Doppelte Sammelreichweite.',apply:p=>{p.vampire=true;p.magnet=180;}},
    shield:{icon:'◇',title:'NOTFALL-SCHALE',short:'Schutzschale',desc:'Fängt einen Treffer ab. Lädt nach 15 Sekunden wieder auf.',apply:p=>{p.shield=true;p.shieldReady=true;p.shieldCd=0;}},
    waveRenew:{icon:'✚',title:'REGENERATIONSFELL',short:'Wellenheilung',desc:'Nach jeder künftig abgeschlossenen normalen Welle werden deine Leben vollständig geheilt.',apply:p=>{p.waveRenew=true;}},
    carrotMine:{icon:'◇',title:'MÖHRENMACHER',short:'Möhrenmine',desc:'Große verzögerte Sprengfalle mit starkem Flächenschaden.',weapon:'carrotMine',apply:p=>{if(!p.weapons.includes('carrotMine'))p.weapons.push('carrotMine');p.weaponUses.carrotMine=(p.weaponUses.carrotMine||0)+6;}},
    peanutBoomerang:{icon:'↩',title:'RÜCKKEHR-NUSS',short:'Boomerang',desc:'Linienräumer: trifft Gegner auf dem Hin- und Rückflug erneut.',weapon:'peanutBoomerang',apply:p=>{if(!p.weapons.includes('peanutBoomerang'))p.weapons.push('peanutBoomerang');p.weaponUses.peanutBoomerang=(p.weaponUses.peanutBoomerang||0)+7;}},
    acornNova:{icon:'✹',title:'EICHEL-NOVA',short:'Eichel-Nova',desc:'20 durchschlagende Eicheln räumen Gegner rund um Snickers ab.',weapon:'acornNova',apply:p=>{if(!p.weapons.includes('acornNova'))p.weapons.push('acornNova');p.weaponUses.acornNova=(p.weaponUses.acornNova||0)+5;}},
    pigPopper:{icon:'✦',title:'SCHWEINEPOPFER',short:'Pig Popper',desc:'Extremer Schockstoß: gewaltiger Schaden gegen Schweine und stark erhöhter Boss-Schaden.',weapon:'pigPopper',apply:p=>{if(!p.weapons.includes('pigPopper'))p.weapons.push('pigPopper');p.weaponUses.pigPopper=(p.weaponUses.pigPopper||0)+4;}},
    ammo:{icon:'⊕',title:'MUNITIONSKISTE',short:'Mehr Munition',desc:'+1 maximale Ladung je Spezialwaffe und sofort +1 Ladung für jede freigeschaltete Waffe.',apply:p=>{p.ammoBonus=(p.ammoBonus||0)+1;for(const id of p.weapons)p.weaponUses[id]=Math.min((weaponBook[id].max+p.ammoBonus),(p.weaponUses[id]||0)+1);}},
    powerLuck:{icon:'✦',title:'POWER-GLÜCK',short:'Power-Glück',desc:'Gegner lassen etwas öfter Power-ups fallen.',apply:p=>p.powerLuck=(p.powerLuck||1)*1.45},
    homing:{icon:'⌁',title:'ZIELNUSSEN',short:'Nussradar',desc:'Schüsse korrigieren leicht in Richtung naher Gegner.',apply:p=>p.homing=true},
    crit:{icon:'✹',title:'KRITISCH KNACKIG',short:'Kritische Treffer',desc:'Jeder fünfte Treffer verursacht doppelten Schaden.',apply:p=>p.crit=(p.crit||0)+.2},
    turbo:{icon:'»',title:'TURBO-BACKEN',short:'Turbo-Feuer',desc:'20 % schneller feuern, ohne den Schaden zu verlieren.',apply:p=>p.fireRate*=.8},
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
    crownNut:{icon:'♛',title:'KRONENNUSS',short:'Kronennuss',desc:'+35 % normaler Schaden, +1 Durchschlag und +10 % Krit-Chance.',legendary:true,apply:p=>{p.damage*=1.35;p.pierce+=1;p.crit=Math.min(.65,(p.crit||0)+.1);}},
    ghostFur:{icon:'✧',title:'GEISTERFELL',short:'Geisterfell',desc:'18 % mehr Tempo, 25 % schnellerer Dash und +12 % Blockchance.',legendary:true,apply:p=>{p.speed*=1.18;p.dashCooldown*=.75;p.damageGuard=Math.min(.5,(p.damageGuard||0)+.12);}},
    arsenalRelic:{icon:'◆',title:'ARSENAL-RELIKT',short:'Arsenal-Relikt',desc:'+45 % Spezialschaden, +1 maximale Ladung je Waffe und Munitionskisten füllen 65 % statt 50 %.',legendary:true,apply:p=>{p.specialDamage=(p.specialDamage||1)*1.45;p.ammoBonus=(p.ammoBonus||0)+1;p.ammoRefillBonus=Math.min(.35,(p.ammoRefillBonus||0)+.15);}}
  };
  const ngPlusSkillBook={
    annihilator:{icon:'☠',title:'NUSS-ANNIHILATOR',short:'Annihilator',desc:'NG+: +35 % normaler Schaden und +20 % Spezialwaffen-Schaden.',ngplus:true,apply:p=>{p.damage*=1.35;p.specialDamage=(p.specialDamage||1)*1.2;}},
    hyperFur:{icon:'⚡',title:'HYPERFELL',short:'Hyperfell',desc:'NG+: +20 % Bewegungstempo und 20 % kürzerer Dash-Cooldown.',ngplus:true,apply:p=>{p.speed*=1.2;p.dashCooldown*=.8;}},
    turretVolley:{icon:'♜',title:'WACHEN-SCHWARM',short:'Wachen-Schwarm',desc:'NG+: Der Knabber-Turm feuert eine Doppelsalve und deutlich schneller.',ngplus:true,apply:p=>{p.nutSentry=true;p.turretVolley=true;}},
    powerFrenzy:{icon:'✦',title:'POWER-FIEBER',short:'Power-Fieber',desc:'NG+: Power-ups fallen 60 % häufiger und halten 30 % länger.',ngplus:true,apply:p=>{p.powerLuck=(p.powerLuck||1)*1.6;p.powerDuration=Math.max(p.powerDuration||1,1.3);p.powerFrenzy=true;}},
    executioner:{icon:'⌖',title:'ENDGEGNER-SCHRECK',short:'Boss-Schreck',desc:'NG+: +40 % Schaden gegen Bosse und Minibosse sowie +10 % Krit-Chance.',ngplus:true,apply:p=>{p.bossDamage=(p.bossDamage||1)*1.4;p.crit=Math.min(.75,(p.crit||0)+.1);p.executioner=true;}}
  };
  const ngPlusWeaponUpgrade={icon:'☢',title:'NUSS-BAZOOKA MIT SENF',short:'Senf-Bazooka',desc:'NG+-Waffe: gigantische Senfexplosion mit Splittersalve. Sehr stark, aber nur 2 Schuss.',weapon:'mustardBazooka',ngplus:true,apply:p=>{if(!p.weapons.includes('mustardBazooka'))p.weapons.push('mustardBazooka');p.weaponUses.mustardBazooka=maxWeaponAmmo('mustardBazooka');}};
  const upgradePools=[['spread','rapid','health','walnutCannon','nutSentry','homing','hotPaws','specialCore','waveRenew'],['frost','carrotMine','hazelnutShotgun','carrotDrone','shield','turbo','ammoHunter','ironFur'],['orbit','power','peanutBoomerang','carrotLaser','nutSentry','crit','specialCore','hunter','waveRenew'],['reflex','vampire','acornNova','acornRocket','carrotDrone','fortified','ammoScrounger','hotPaws'],['chain','frost','ammo','nutDrill','nutSentry','scavenger','ammoHunter','ironFur','waveRenew'],['power','orbit','pigPopper','walnutCannon','carrotDrone','shockDash','specialCore','hunter'],['peanutBoomerang','hazelnutShotgun','powerLuck','health','nutSentry','homing','ammoScrounger','hotPaws','waveRenew'],['carrotMine','carrotLaser','nutDrill','ammo','carrotDrone','shield','crit','ammoHunter','ironFur'],['pigPopper','acornNova','acornRocket','power','nutSentry','carrotDrone','turbo','specialCore','hunter','waveRenew']];
  const specialUpgradeBook={
    goldenNut:{icon:'✹',title:'GOLDENE NUSS',short:'Goldene Nuss',desc:'+55 % normaler Schaden und alle Punkte zählen doppelt.',apply:p=>{p.damage*=1.55;p.scoreRushBonus=(p.scoreRushBonus||1)*2;}},
    chronoFur:{icon:'◌',title:'CHRONO-FELL',short:'Chrono-Fell',desc:'Dash lädt 45 % schneller und Snickers läuft 18 % schneller.',apply:p=>{p.dashCooldown*=.55;p.speed*=1.18;}},
    nutstorm:{icon:'✣',title:'NUSSSTURM',short:'Nusssturm',desc:'Dreifachschuss, +2 Durchschlag und ein zusätzlicher Splitter pro Salve.',apply:p=>{p.spread=1;p.pierce+=2;p.nutstorm=true;}},
    bossBane:{icon:'☠',title:'BOSS-BANN',short:'Boss-Bann',desc:'Bosse und Minibosse erleiden 50 % mehr Schaden.',apply:p=>p.bossDamage=(p.bossDamage||1)*1.5},
    shellArmor:{icon:'◇',title:'SCHALE AUS STAHL',short:'Stahlschale',desc:'4 Herzen, eine geladene Schutzschale und 1 s Startschutz.',apply:p=>{p.maxHp+=4;p.hp=p.maxHp;p.shield=true;p.shieldReady=true;p.invuln=1;}},
    powerCondenser:{icon:'✦',title:'POWER-KONDENSATOR',short:'Power-Kondensator',desc:'Power-ups halten 65 % länger und fallen 55 % häufiger.',apply:p=>{p.powerDuration=Math.max(p.powerDuration||1,1.65);p.powerLuck=(p.powerLuck||1)*1.55;}},
    boomerangMaster:{icon:'↩',title:'ARSENAL-MEISTER',short:'Arsenal-Meister',desc:'Alle Spezialwaffen bekommen +2 maximale Ladungen und verursachen 20 % mehr Schaden. Keine automatische Auffüllung.',apply:p=>{p.ammoBonus=(p.ammoBonus||0)+2;p.specialDamage=(p.specialDamage||1)*1.2;}},
    ammoForge:{icon:'⊕',title:'FERKEL-MUNITIONSWERK',short:'Ammo-Werk',desc:'Munitionsdrops fallen 85 % häufiger und Kisten füllen jede Waffe zusätzlich 20 % stärker auf.',apply:p=>{p.ammoDropLuck=(p.ammoDropLuck||1)*1.85;p.ammoRefillBonus=Math.min(.35,(p.ammoRefillBonus||0)+.2);}},
    savageCore:{icon:'◆',title:'WILDER KERN',short:'Wilder Kern',desc:'+40 % normaler Schaden und +35 % Spezialwaffen-Schaden.',apply:p=>{p.damage*=1.4;p.specialDamage=(p.specialDamage||1)*1.35;}},
    graniteFur:{icon:'▣',title:'GRANITFELL',short:'Granitfell',desc:'+4 permanente Herzen, volle Heilung und zusätzliche 15 % Blockchance.',apply:p=>{p.maxHp+=4;p.hp=p.maxHp;p.damageGuard=Math.min(.5,(p.damageGuard||0)+.15);}}
  };
  const specialUpgradePools=[['goldenNut','chronoFur','nutstorm','ammoForge'],['bossBane','shellArmor','powerCondenser','savageCore'],['boomerangMaster','goldenNut','nutstorm','graniteFur','ammoForge','savageCore']];
  function updateSkills(){
    const ids=Object.keys(player.skills);$('skillHud').innerHTML=ids.map(id=>{const info=skillBook[id]||legendarySkillBook[id]||ngPlusSkillBook[id];return info?`<span class="${info.legendary?'legendary-skill-chip':''}" title="${info.title}">${info.icon}<span>${info.short}</span>${player.skills[id]>1?` ×${player.skills[id]}`:''}</span>`:'';}).join('');
    $('skillHud').classList.toggle('hidden',!ids.length);
  }
  const scoreSkillBook={
    damage:{icon:'✹',title:'SCHADEN',desc:'+10 % dauerhafter Schaden.',apply:p=>p.damage*=1.10},
    speed:{icon:'»',title:'BEWEGUNGSGESCHWINDIGKEIT',desc:'+10 % dauerhafte Bewegungsgeschwindigkeit.',apply:p=>p.speed*=1.10},
    fireRate:{icon:'ϟ',title:'SCHUSSGESCHWINDIGKEIT',desc:'+10 % dauerhafte Feuerrate.',apply:p=>p.fireRate/=1.10},
    dash:{icon:'↯',title:'DASH COOLDOWN',desc:'10 % kürzerer Dash-Cooldown.',apply:p=>p.dashCooldown*=.90},
    powerLuck:{icon:'✦',title:'POWER-UP-DROPCHANCE',desc:'+10 % dauerhafte Power-up-Dropchance.',apply:p=>p.powerLuck*=1.10}
  };
  function queueScoreSkillMilestones(){
    if(!player)return;
    while(score>=player.scoreSkillNext){player.scoreSkillQueue.push(player.scoreSkillNext);player.scoreSkillNext+=30000;}
    if(mode==='playing'&&player.scoreSkillQueue.length)showScoreSkillMenu();
  }
  function showScoreSkillMenu(){
    if(!player||!player.scoreSkillQueue.length||mode!=='playing')return;
    const milestone=player.scoreSkillQueue[0];
    mode='scoreSkill';resetInput();$('announcement').classList.add('hidden');
    const entries=Object.entries(scoreSkillBook);
    showOverlay(`<span class="eyebrow">${milestone.toLocaleString('de-DE')} PUNKTE · PERMANENTER BONUS</span><h2 id="overlayTitle">SNICKERS WIRD STÄRKER.</h2><p>Der Kampf ist pausiert. Wähle eine Eigenschaft, die für den Rest dieses Runs dauerhaft um 10 % verbessert wird.</p><div class="upgrades score-skill-upgrades">${entries.map(([id,c],i)=>`<button class="upgrade skill-upgrade score-skill-card" id="scoreSkill${i}"><small class="upgrade-kind skill-kind">PUNKTE-SKILL · STUFE ${(player.scorePerks[id]||0)+1}</small><span class="upgrade-icon">${c.icon}</span><strong>${c.title}</strong><span>${c.desc}</span><em>+10 % WÄHLEN ↗</em></button>`).join('')}</div>`);
    entries.forEach(([id,c],i)=>{$(`scoreSkill${i}`).onclick=()=>{
      if(mode!=='scoreSkill')return;
      c.apply(player);player.scorePerks[id]=(player.scorePerks[id]||0)+1;player.scoreSkillQueue.shift();
      tone(660,.24,'triangle',.08,990);updateHud();
      if(player.scoreSkillQueue.length){mode='playing';showScoreSkillMenu();return;}
      mode='playing';hideOverlay();player.invuln=Math.max(player.invuln,.75);lastFrame=performance.now();
    };});
  }
  function startWave(next){
    wave=next;waveTime=0;spawnTimer=1;boss=null;mode='playing';player.invuln=1.8;player.usedBombThisWave=false;player.waveHits=0;player.ammoDropsThisWave=0;player.ammoDropTarget=2+Math.floor(Math.random()*4);player.ammoDryKills=0;player.waveAmmoSnapshot=snapshotAmmo();
    hideOverlay();$('bossHud').classList.add('hidden');updateHud();
    announce(`WELLE ${String(wave+1).padStart(2,'0')} / 09`,waveNames[wave]);
    musicTrack=-1;
  }
  function showGeneralInterlude(){
    generalDefeated=true;mode='interlude';resetInput();enemies=[];bullets=[];enemyBullets=[];hazards=[];pickups=[];boss=null;
    $('bossHud').classList.add('hidden');$('announcement').classList.add('hidden');
    showOverlay('<span class="eyebrow">AKT I GESCHAFFT · AKT II WARTET</span><h2 id="overlayTitle">TOTGESAGTE HOPPELN LÄNGER.</h2><p>Hasenbein ist gefallen. Doch unter dem Möhrenfeld fährt ein geheimes Labor hoch. Seine Terror-Kaninchen sammeln die Reste ein. Ein neuer Körper wartet schon.</p><blockquote class="snickers-quote"><b>SNICKERS</b>„Reanimation? Ich hätte einfach eine schlechte Bewertung dagelassen.“</blockquote><p>Wellen 4–6 bringen dich zu Cyber-Hasenbein. Danach beginnt der Steinbruch-Abschnitt.</p><button class="primary-button" id="actTwoButton">WEITER MIT WELLE 4 <span>↗</span></button>');
    $('actTwoButton').onclick=()=>{if(mode!=='interlude')return;player.hp=player.maxHp;player.x=W/2;player.y=H/2+25;startWave(3);};
    tone(85,.7,'sawtooth',.07,200);
  }
  function showCyberInterlude(){
    cyberDefeated=true;mode='interlude';resetInput();enemies=[];bullets=[];enemyBullets=[];hazards=[];pickups=[];boss=null;$('bossHud').classList.add('hidden');$('announcement').classList.add('hidden');
    showOverlay('<span class="eyebrow">AKT II GESCHAFFT · DER STEINBRUCH RUFT</span><h2 id="overlayTitle">DAS WAR SEIN LETZTES UPDATE.</h2><p>Cyber-Hasenbein ist endgültig ausgeschaltet. Hinter der eingestürzten Felswand rumpelt es trotzdem weiter. Etwas Großes hat dort sehr lange auf seine Rückkehr gewartet.</p><blockquote class="snickers-quote"><b>SNICKERS</b>„Ich hoffe, das ist kein dritter Hase. Ich habe nur zwei Ohren.“</blockquote><button class="primary-button" id="actThreeButton">IN DEN STEINBRUCH <span>↗</span></button>');
    $('actThreeButton').onclick=()=>{if(mode!=='interlude')return;player.hp=player.maxHp;startWave(6);};tone(72,.8,'sawtooth',.08,190);
  }
  function bossUpgradeScreen(kind){
    mode='bossUpgrade';resetInput();enemies=[];bullets=[];enemyBullets=[];hazards=[];pickups=[];$('bossHud').classList.add('hidden');$('announcement').classList.add('hidden');
    const index=kind==='general'?0:kind==='cyber'?1:2,ids=[...specialUpgradePools[index]].sort(()=>Math.random()-.5).slice(0,3);
    const choices=ids.map(id=>({...specialUpgradeBook[id],id}));
    const label=kind==='karnil'?'KARNIL GEFÄLLT · SPEZIAL-ABSPANN':kind==='cyber'?'CYBER-HASENBEIN GEFÄLLT · SPEZIAL-UPGRADE':'GENERAL HASENBEIN GEFÄLLT · SPEZIAL-UPGRADE';
    showOverlay(`<span class="eyebrow">${label}</span><h2 id="overlayTitle">BEUTE AUS DEM BOSS.</h2><p>Wähle eines von drei Boss-Upgrades. Diese Belohnungen sind bewusst stärker als normale Wave-Upgrades, aber keine Legendary-3%-Skills. Spezialmunition bleibt knapp und wird nicht automatisch aufgefüllt.</p><div class="upgrades special-upgrades">${choices.map((c,i)=>`<button class="upgrade special-upgrade" id="specialUpgrade${i}" data-skill="${c.id}"><small class="upgrade-kind special-kind">BOSS-UPGRADE</small><span class="upgrade-icon">${c.icon}</span><strong>${c.title}</strong><span>${c.desc}</span><em>SPEZIAL WÄHLEN ↗</em></button>`).join('')}</div>`);
    choices.forEach((c,i)=>{ $(`specialUpgrade${i}`).onclick=()=>{
      if(mode!=='bossUpgrade')return;c.apply(player);player.specials??={};player.specials[c.id]=(player.specials[c.id]||0)+1;updateWeaponHud();updateSkills();tone(620,.25,'triangle',.08,1240);
      if(kind==='general')showGeneralInterlude();else if(kind==='cyber')showCyberInterlude();else {boss=null;mode='playing';finish(true);}
    };});
  }
  function generalDown(){lastDefeatedBoss='general';addAchievementProgress('boss_breaker');addAchievementProgress('three_bosses');addAchievementProgress('wallpaper');bossUpgradeScreen('general');}
  function cyberDown(){lastDefeatedBoss='cyber';addAchievementProgress('boss_breaker');addAchievementProgress('three_bosses');addAchievementProgress('wallpaper');bossUpgradeScreen('cyber');}
  function upgradeScreen() {
    mode = 'upgrade'; resetInput(); enemies = []; enemyBullets = []; hazards = []; bullets = [];
    if(player.waveHits===0)addAchievementProgress('clean_wave');
    for (const p of pickups) if (p.type === 'nut') score += 20;
    pickups = []; $('announcement').classList.add('hidden');
    // Nach jeder normalen Welle erhalten alle Spezialwaffen 50 % ihrer Maximalmunition zurück; die Nussbombe wird vollständig geladen.
    refillWeaponsAfterWave();
    // Normal waves no longer grant free healing. Only the Regenerationsfell skill does that automatically.
    if(player.waveRenew)player.hp=player.maxHp;
    updateHud();
    const repeatable=['rapid','power','health','bombs','ammo','powerLuck'];
    const available=id=>!player.skills[id]||(repeatable.includes(id)&&(player.skills[id]||0)<2);
    let ids=upgradePools[wave].filter(available).sort(()=>Math.random()-.5);
    for(const id of Object.keys(skillBook).sort(()=>Math.random()-.5)){if(ids.length>=7)break;if(available(id)&&!ids.includes(id))ids.push(id);}
    let choices=ids.slice(0,3).map(id=>({...skillBook[id],id,type:skillBook[id].weapon?'weapon':'skill'}));
    // Weapons should be discoverable, but not dominate every single screen.
    const availableWeapons=Object.keys(skillBook).filter(id=>skillBook[id].weapon&&available(id));
    if(availableWeapons.length&&Math.random()<.68&&!choices.some(c=>c.weapon)){
      const wid=availableWeapons[Math.floor(Math.random()*availableWeapons.length)];
      choices[2]={...skillBook[wid],id:wid,type:'weapon'};
    }
    // Legendary skills: exactly 3% total chance per cleared wave; at most one can appear.
    const legendaryAvailable=Object.keys(legendarySkillBook).filter(id=>!player.skills[id]);
    if(legendaryAvailable.length&&Math.random()<.03){
      const lid=legendaryAvailable[Math.floor(Math.random()*legendaryAvailable.length)],slot=Math.floor(Math.random()*choices.length);
      choices[slot]={...legendarySkillBook[lid],id:lid,type:'skill',legendary:true};
    }
    if(newGamePlus){
      const ngAvailable=Object.keys(ngPlusSkillBook).filter(id=>!player.skills[id]);
      if(ngAvailable.length&&Math.random()<.62){const id=ngAvailable[Math.floor(Math.random()*ngAvailable.length)],slot=Math.floor(Math.random()*choices.length);choices[slot]={...ngPlusSkillBook[id],id,type:'skill',ngplus:true};}
      if(!player.weapons.includes('mustardBazooka')&&Math.random()<.48){const slot=Math.floor(Math.random()*choices.length);choices[slot]={...ngPlusWeaponUpgrade,id:'mustardBazookaUnlock',type:'weapon',ngplus:true};}
    }
    const quote=waveQuotes[wave]||'Ich brauche eine größere Nuss.';
    const typeLabel=c=>c.legendary?'LEGENDARY SKILL':c.ngplus?(c.weapon?'NG+ WAFFE':'NG+ SKILL'):c.weapon?'WAFFE':'SKILL';
    const cardClass=c=>`upgrade${c.legendary?' legendary-upgrade':''}${c.ngplus?' ngplus-upgrade':''}${c.weapon?' weapon-upgrade':' skill-upgrade'}`;
    const healText=player.hp>=player.maxHp?'Du bist bereits voll geheilt, bekommst aber trotzdem +1 permanentes Herz.':'Verzichte auf das Upgrade, heile vollständig und erhalte +1 permanentes Herz.';
    showOverlay(`<span class="eyebrow">WELLE ${String(wave + 1).padStart(2,'0')} / 09 GESCHAFFT</span><h2 id="overlayTitle">ZEIT AUFZURÜSTEN.</h2><blockquote class="snickers-quote" aria-live="polite"><b>SNICKERS</b>„${quote}“</blockquote><p>Nach einer Welle gibt es keine kostenlose Heilung. Wähle eine Waffe oder einen Skill – oder verzichte auf das Upgrade und nimm die Verschnaufpause.</p><div class="upgrades reward-upgrades">${choices.map((c,i) => `<button class="${cardClass(c)}" id="upgrade${i}" data-skill="${c.id}"><small class="upgrade-kind ${c.legendary?'legendary-kind':c.weapon?'weapon-kind':'skill-kind'}">${typeLabel(c)}</small><span class="upgrade-icon">${c.icon}</span><strong>${c.title}</strong><span>${c.desc}</span><em>${player.skills[c.id]?'VERSTÄRKEN':'AUSWÄHLEN'} ↗</em></button>`).join('')}<button class="upgrade heal-upgrade" id="healInstead"><small class="upgrade-kind heal-kind">HEILUNG STATT UPGRADE</small><span class="upgrade-icon">♥</span><strong>VERSCHNAUFPAUSE</strong><span>${healText}</span><em>+1 MAX-HERZ · VOLL HEILEN ↗</em></button></div>`);
    const continueRun=()=>{
      // Auch wenn ein gewähltes Upgrade die maximale Munition verändert, startet die nächste Etappe mit voller Nussbombe.
      player.weaponUses.nutBomb=maxWeaponAmmo('nutBomb');
      player.invuln=2;mode='playing';hideOverlay();
      if(wave===2)spawnBoss(false);else if(wave===5)spawnBoss(true);else if(wave===8)spawnBoss(false,true);else startWave(wave+1);
    };
    choices.forEach((c,i) => { $(`upgrade${i}`).onclick = () => {
      if (mode !== 'upgrade') return;
      const wasOwned=Boolean(player.skills[c.id]);
      c.apply(player);if(c.id!=='mustardBazookaUnlock')player.skills[c.id]=(player.skills[c.id]||0)+1;
      if(newGamePlus&&c.ngplus&&!c.weapon&&!wasOwned){addAchievementProgress('ngplus_first_skill');addAchievementProgress('ngplus_all_skills');}
      if(c.id==='crownNut')addAchievementProgress('crown_found');
      if(c.id==='ghostFur')addAchievementProgress('ghosted');
      if(c.id==='arsenalRelic')addAchievementProgress('relic_run');
      updateWeaponHud();updateSkills();continueRun();
      tone(c.legendary?784:523, c.legendary?.42:.25, 'triangle', c.legendary?.11:.08, c.legendary?1568:1046);
    }; });
    $('healInstead').onclick=()=>{
      if(mode!=='upgrade')return;
      addAchievementProgress('breather');
      player.maxHp+=1;player.hp=player.maxHp;updateHud();continueRun();tone(690,.35,'triangle',.1,1035);
    };
  }
  function finish(won) {
    if(!won&&mode==='playing'&&retriesLeft>0){
      retryWave=wave;retryBossKind=boss&&!boss.dead?{cyber:Boolean(boss.cyber),karnil:Boolean(boss.karnil),phaseTwo:Boolean(boss.phaseTwo)}:null;mode='retry';resetInput();$('announcement').classList.add('hidden');
      showOverlay(`<span class="eyebrow">SNICKERS IST NOCH NICHT FERTIG</span><h2 id="overlayTitle">NOCH EIN RETRY?</h2><p>Die aktuelle ${retryBossKind?(retryBossKind.karnil?'Bosskampf':'Bossphase'):'Welle'} ist verloren, aber du hast noch <strong>${retriesLeft}</strong> von 3 Gesamt-Retries. Skills und Punkte bleiben erhalten.</p><div class="retry-badge">RETRY-MARKEN ÜBRIG: ${retriesLeft}</div><div class="overlay-actions"><button id="retryWaveButton" class="primary-button">AKTUELLE ${retryBossKind?(retryBossKind.karnil?'BOSS-KAMPF':'BOSS-PHASE'):'WELLE'} RETRY <span>↗</span></button><button id="retryMenuButton" class="secondary-button">HAUPTMENÜ</button></div>`);
      $('retryWaveButton').onclick=retryCurrentWave;$('retryMenuButton').onclick=goMenu;tone(210,.4,'triangle',.08,90);return;
    }
    if (mode !== 'playing') return;
    mode = won ? 'won' : 'lost'; resetInput(); $('announcement').classList.add('hidden');
    if (won) { score += 5000 + player.hp * 250 + Math.max(0, Math.round((620 - runTime) * 15)); addAchievementProgress('wave_runner',9);if(lastDefeatedBoss==='karnil')addAchievementProgress('housepig');if(retriesLeft>0)addAchievementProgress('nutty_survivor');if(newGamePlus)addAchievementProgress('ngplus_clear');saveNGPlusBuild(); }
    const isRecord = score > record;
    if (isRecord) { record = score; try { localStorage.setItem('snickers3-best-v4', String(record)); } catch {} }
    updateHud();
    const epilogue=won&&lastDefeatedBoss==='karnil';
    showOverlay(`<span class="eyebrow">${won ? 'MISSION ERFÜLLT · NUSS GESICHERT' : retriesLeft<=0 ? 'GAME OVER · ALLE RETRIES VERBRAUCHT' : 'MISSION GESCHEITERT · EGO LEICHT ANGEKNABBERT'}</span><h2 id="overlayTitle">${epilogue ? 'DER GARTEN HAT JETZT SCHWEIN.' : won ? 'DIE NUSS GEHÖRT DIR.' : retriesLeft<=0 ? 'DAS WAR’S, SNICKERS.' : 'KARNIL LACHT NOCH.'}</h2><p>${epilogue ? 'Snickers gönnt sich zur Feier des Tages einen gewaltigen Nussberg. Karnil steht derweil als ausgesprochen unwilliges Hausschwein im Garten. An der Wand hängt das Fell von Hasenbein. Es passt erstaunlich gut zur Tapete.' : won ? 'Neun Wellen. Drei Bosse. Eine Nuss. Snickers: „Ich hätte gern eine Belohnung, die nicht versucht, mich zu fressen.“' : retriesLeft<=0 ? 'Alle drei Retry-Marken sind verbraucht. Die Hasenjagd endet hier — aber der nächste Lauf wartet schon.' : ['Diese Ferkel spielen unfair. Zum Glück gibt es noch einen Versuch.', 'Auch Helden brauchen mal einen zweiten Anlauf. Die Nuss wartet auf dich.', 'Zu viele Schweine. Zu wenig Deckung. Du weißt jetzt, wie der Hase läuft.'][Math.floor(Math.random()*3)]}</p>${epilogue ? '<blockquote class="snickers-quote"><b>ABSPANN</b>Snickers isst Nüsse. Karnil grunzt. Die Nachbarschaft beschwert sich über beides.</blockquote>' : ''}${isRecord ? '<div class="new-record">NEUER LOKALER REKORD</div>' : ''}<div class="stats"><div><strong>${score.toLocaleString('de-DE')}</strong><span>PUNKTE</span></div><div><strong>${kills}</strong><span>GEGNER BESIEGT</span></div><div><strong>${formatTime(runTime)}</strong><span>ÜBERLEBT</span></div></div><div class="overlay-actions"><button id="retryButton" class="primary-button">${won ? (newGamePlus?'NEW GAME+ NOCHMAL':'NEW GAME+ STARTEN') : retriesLeft<=0 ? 'NEUER LAUF' : 'REVANCHE'} <span>↗</span></button><button id="endMenuButton" class="secondary-button">Hauptmenü</button></div>`);
    $('retryButton').onclick = won?()=>startGame(true):()=>startGame(false); $('endMenuButton').onclick = goMenu;
    if (won) { tone(523,.3,'triangle',.1); setTimeout(() => tone(659,.3,'triangle',.1),150); setTimeout(() => tone(1046,.5,'triangle',.1),300); }
    else tone(180,.55,'triangle',.1,50);
  }
  function retryCurrentWave(){
    if(mode!=='retry'||retriesLeft<=0)return;
    retriesLeft--;addAchievementProgress('retry_hero');addAchievementProgress('three_strikes');
    enemies=[];bullets=[];enemyBullets=[];hazards=[];pickups=[];floaters=[];thrownWeapons=[];boss=null;player.hp=Math.max(1,Math.ceil(player.maxHp*.65));player.powerups={};player.invuln=2;
    const savedWave=retryWave,savedBoss=retryBossKind;retryBossKind=null;hideOverlay();
    if(savedBoss){mode='playing';const ammoState=savedBoss.karnil?player.bossAmmoSnapshot:player.bossAmmoSnapshot;spawnBoss(savedBoss.cyber,savedBoss.karnil);restoreAmmo(ammoState);player.bossAmmoSnapshot=snapshotAmmo();announce(savedBoss.karnil?'RETRY · KARNIL VON VORN':'RETRY · BOSS-PHASE',savedBoss.karnil?'PHASE 1 · FELSENBRECHER':savedBoss.cyber?'CYBER-HASENBEIN':'GENERAL HASENBEIN');updateHud();}
    else {restoreAmmo(player.waveAmmoSnapshot);startWave(savedWave);}
  }
  function formatTime(n) { return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(Math.floor(n%60)).padStart(2,'0')}`; }
  function updateHud() {
    if (!player) return;
    $('healthBar').innerHTML = Array.from({length:player.maxHp},(_,i)=>`<i class="health-segment${i < player.hp ? '' : ' empty'}"></i>`).join('');
    $('healthText').textContent = `${player.hp}/${player.maxHp}`;
    $('scoreValue').textContent = String(score).padStart(6,'0');
    $('waveLabel').textContent = boss ? `${newGamePlus?'NG+ · ':''}${boss.karnil?'BOSS 03 / 03':boss.cyber?'BOSS 02 / 03':'BOSS 01 / 03'}` : `${newGamePlus?'NG+ · ':''}WELLE ${String(wave+1).padStart(2,'0')} / 09`;
    $('waveFill').style.width = boss ? '100%' : `${clamp(waveTime / waveLengths[wave] * 100, 0, 100)}%`;
    const alive=livingEnemyCount();
    $('waveObjective').textContent = boss ? (boss.karnil?(boss.phaseThree?'Überlebe Karnils dritte Phase und Cyber-Hasenbein':boss.phaseTwo?'Besiege Karnil und Zombie-Hasenbein':'Leere Karnils erste Lebensleiste'):boss.cyber?'Beende seine zweite Karriere':'Besiege General Hasenbein') : waveSpawningComplete() ? `RESTLICHE GEGNER: ${alive}` : `NACHSCHUB ${Math.max(0,Math.ceil(waveLengths[wave]-waveTime))} s · ${wave<3?'AKT I':wave<6?'AKT II':'STEINBRUCH'}`;
    updateWeaponHud();updatePowerHud();$('runTime').textContent = formatTime(runTime);
    $('dashFill').style.width = `${(1-clamp(player.dashCd/player.dashCooldown,0,1))*100}%`;
    $('dashLabel').textContent = player.dashCd <= 0 ? 'AUSWEICHEN BEREIT' : 'LÄDT AUF …';
    if (boss) { $('bossFill').style.width = `${Math.max(0,boss.hp/boss.maxHp*100)}%`; $('bossPhase').textContent = boss.karnil?(boss.phaseThree?'PHASE 3 · CYBER-HASENBEIN · PAFTI LAUERT':boss.phaseTwo?'PHASE 2 · VOLLE LEBEN · ZOMBIE-HASENBEIN':'PHASE 1 · FELSENBRECHER'):boss.cyber?(boss.enraged?'ÜBERTAKTET':'WIEDERBELEBT. AUFGERÜSTET.'):(boss.enraged ? 'JETZT IST ER SAUER' : 'DER NUSS-DIKTATOR'); }
    const mini=getMiniBoss(),miniHud=$('miniBossHud');if(miniHud){miniHud.classList.toggle('hidden',!mini);if(mini){const label=miniHud.querySelector('span');if(label)label.textContent=mini.cyberMini?'CYBER-HASENBEIN':'ZOMBIE-HASENBEIN';$('miniBossFill').style.width=`${Math.max(0,mini.hp/mini.maxHp*100)}%`;}}
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
    const remaining=target-(player.ammoDropsThisWave||0),progress=boss?.karnil?.5:clamp(waveTime/(waveLengths[wave]||35),0,1);
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
    if (e.dead) return;
    if(e.type==='boss'||e.miniBoss)amount*=player.bossDamage||1;
    e.hp -= amount; e.hit = .1;
    burst(e.x,e.y, e.type === 'boss' ? '#ffa977' : '#cad8b7', blast ? 12 : 4, 110);
    if(isBoss(e))maybeDropBossSupply(e);
    if(isBoss(e)&&e.karnil){
      if(!e.phaseTwo&&e.hp<=0){activateKarnilPhaseTwo(false);return;}
      if(newGamePlus&&e.phaseTwo&&!e.phaseThree&&e.hp<=0){activateKarnilPhaseThree();return;}
      if(newGamePlus&&e.phaseThree&&!e.paftiHealed&&e.hp<=e.maxHp*.5){triggerPaftiIntervention();return;}
    }
    if (e.hp > 0) return;
    e.dead = true; kills++; score += Math.round(e.points*((player.powerups.scoreRush>0?2:1)*(player.scoreRushBonus||1)));addAchievementProgress('first_crunch');addAchievementProgress('score_hog',Math.max(0,e.points));if(e.type.startsWith('pig'))addAchievementProgress('pigsty');if(e.type==='gatling')addAchievementProgress('veggie_fear');if(newGamePlus&&e.type==='voidBunny')addAchievementProgress('ngplus_void');if(newGamePlus&&e.type==='rocketHare')addAchievementProgress('ngplus_rocket');if(newGamePlus&&e.type==='pigJuggernaut')addAchievementProgress('ngplus_juggernaut');
    burst(e.x,e.y, e.type === 'boss' ? '#c7f36b' : '#91ba70', e.type==='boss'?85:16,180);
    floater(e.x,e.y-22,`+${e.points}`);
    if(e.miniBoss){toast('ZOMBIE-HASENBEIN ERLEDIGT');updateHud();}
    if (isBoss(e)) { lastDefeatedBoss=e.karnil?'karnil':e.cyber?'cyber':'general';if(e.karnil)bossUpgradeScreen('karnil');else if(e.cyber)cyberDown();else generalDown();return; }
    if(player.vampire){player.vampireKills++;if(player.vampireKills>=22){player.vampireKills=0;player.hp=Math.min(player.maxHp,player.hp+1);floater(player.x,player.y-38,'SNACK! +1 ♥',accent());}}
    if(e.type==='splitter')for(let i=0;i<2;i++){const child=spawnEnemy('runner');child.x=clamp(e.x+(i?22:-22),32,W-32);child.y=clamp(e.y+12,105,H-45);child.hp=child.maxHp=1;child.speed=158;burst(child.x,child.y,'#dba7ed',10,80);}
    const dropRoll=Math.random(),powerChance=.035*(player.powerLuck||1),life=18+(player.pickupLifeBonus||0);
    const ammoDropped=(e.miniBoss&&player.weapons.some(id=>weaponAmmo(id)<maxWeaponAmmo(id))&&((player.ammoDropsThisWave||0)<(player.ammoDropTarget||3)))?(pickups.push({x:e.x,y:e.y,type:'ammo',life,phase:rnd(0,TAU)}),player.ammoDropsThisWave=(player.ammoDropsThisWave||0)+1,player.ammoDryKills=0,true):tryDropSpecialAmmo(e.x,e.y,life);
    // Power-ups stay rare, but pure RNG can no longer create absurdly long dry streaks.
    const forcePower=(player.powerDryKills||0)>=15;
    if(ammoDropped){player.powerDryKills=(player.powerDryKills||0)+1;}
    else if(forcePower||(dropRoll>=.07&&dropRoll<.07+powerChance)){
      const id=rollPowerupId();
      pickups.push({x:e.x,y:e.y,type:'power',power:id,life,phase:rnd(0,TAU)});
      player.powerDryKills=0;
    }else{
      player.powerDryKills=(player.powerDryKills||0)+1;
      if(dropRoll<.07)pickups.push({x:e.x,y:e.y,type:'heart',life,phase:rnd(0,TAU)});
      else pickups.push({x:e.x,y:e.y,type:'nut',life,phase:rnd(0,TAU)});
    }
    if (Math.random()<.12) tone(400,.055,'triangle',.02,700);
  }
  function hurtPlayer(damage = 1) {
    if (player.invuln > 0 || mode !== 'playing') return;
    if(player.powerups.overdrive>0){floater(player.x,player.y-36,'ROTER BLICK',accent());return;}
    if(player.damageGuard&&Math.random()<player.damageGuard){player.invuln=.45;burst(player.x,player.y,accent(),18,150);floater(player.x,player.y-36,'EISENFELL!',accent());tone(760,.12,'triangle',.05,420);return;}
    if(player.powerups.phase>0){floater(player.x,player.y-36,'PHASENFELL',accent());return;}
    if(player.powerups.barrier>0){player.powerups.barrier=0;player.invuln=.7;burst(player.x,player.y,accent(),25,180);floater(player.x,player.y-36,'ABGEBLOCKT',accent());tone(840,.2,'sine',.06,320);return;}
    if(player.shieldReady){player.shieldReady=false;player.shieldCd=15;player.invuln=.7;burst(player.x,player.y,accent(),25,180);floater(player.x,player.y-36,'ABGEBLOCKT',accent());tone(840,.2,'sine',.06,320);return;}
    if(player.powerups.thorns>0){for(const e of enemies)if(!e.dead&&dist(player,e)<150)damageEnemy(e,12,true);if(boss&&!boss.dead&&dist(player,boss)<160)damageEnemy(boss,14,true);}
    if(newGamePlus)damage*=2;
    player.waveHits++;
    player.hp = Math.max(0,player.hp-damage); player.invuln = 1.15; shake = reducedMotion ? 0 : 7;
    burst(player.x,player.y,'#ff9d71',18,180); floater(player.x,player.y-36,`−${damage} ♥`,'#ff9d71');
    tone(150,.22,'sawtooth',.07,50); updateHud();
    if (player.hp <= 0) finish(false);
  }
  const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  function fire() {
    let target = null, closest = 780;
    const candidates = boss && !boss.dead ? [...enemies,boss] : enemies;
    for (const e of candidates) { const d=dist(player,e); if (!e.dead && d<closest) { closest=d; target=e; } }
    if (!target && !pointer.active) return false;
    const fallback=player.angle|| (player.face>0?0:Math.PI);
    let desired=pointer.active?Math.atan2(pointer.y-player.y,pointer.x-player.x):fallback;
    if(target){
      const targetAngle=Math.atan2(target.y-player.y,target.x-player.x),delta=angleDelta(targetAngle,desired);
      // Aim assist only nudges a mouse direction that is already roughly on target.
      if(!pointer.active||Math.abs(delta)<.48)desired+=delta*(player.homing?.58:(pointer.active?.28:1));
    }
    player.angle=desired;
    player.shotCount++;
    const angles = player.nutstorm ? [-.28,-.14,0,.14,.28] : player.spread||player.powerups.doubleShot ? [-.16,0,.16] : [0];
    for (const offset of angles) {
      const a=player.angle+offset;
      const crit=player.crit&&Math.random()<player.crit;
      bullets.push({x:player.x+Math.cos(a)*22,y:player.y+Math.sin(a)*22,vx:Math.cos(a)*755,vy:Math.sin(a)*755,life:1.2,damage:player.damage*(player.powerups.berserk>0?1.65:1)*(player.powerups.giantNut>0?1.4:1)*(player.powerups.overdrive>0?2:1)*(crit?2.2:1),pierce:player.pierce,hitIds:new Set(),r:player.powerups.giantNut>0?10:6,a,chain:player.chain&&player.shotCount%4===0,frost:player.frost});
    }
    tone(rnd(660,800),.04,'triangle',.035,280);
    return true;
  }
  function enemyShot(x,y,a,speed=174,cyber=false) { if(enemyBullets.length<260)enemyBullets.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,a,r:7,life:7,cyber}); }
  function chainHit(source,damage){
    const all=boss&&!boss.dead?[...enemies,boss]:enemies;let target=null,near=185;
    for(const e of all){const d=dist(source,e);if(e!==source&&!e.dead&&d<near){near=d;target=e;}}
    if(target){particles.push({type:'arc',x:source.x,y:source.y,x2:target.x,y2:target.y,life:.2,maxLife:.2,color:'#c9ecff'});damageEnemy(target,damage*.8);}
  }
  function updateSkillsInPlay(dt){
    for(const id of Object.keys(player.powerups)){player.powerups[id]=Math.max(0,player.powerups[id]-dt);if(player.powerups[id]<=0)delete player.powerups[id];}
    if(player.powerups.regen>0){player.regenCd=(player.regenCd||0)-dt;if(player.regenCd<=0){if(player.hp<player.maxHp){player.hp++;floater(player.x,player.y-38,'SNACK! +1 ♥',accent());tone(700,.12,'sine',.04,980);updateHud();}player.regenCd=2;}}
    if(player.shield&&!player.shieldReady){player.shieldCd=Math.max(0,player.shieldCd-dt);if(player.shieldCd<=0){player.shieldReady=true;floater(player.x,player.y-36,'SCHALE BEREIT',accent());}}
    player.orbitCd=Math.max(0,player.orbitCd-dt);
    if(player.orbit&&player.orbitCd<=0){
      let hit=false;const all=boss&&!boss.dead?[...enemies,boss]:enemies;
      for(let i=0;i<2;i++){
        const a=runTime*3.5+i*Math.PI,orb={x:player.x+Math.cos(a)*62,y:player.y+Math.sin(a)*62};
        for(const e of all)if(!e.dead&&dist(orb,e)<e.r+12){damageEnemy(e,2.2);hit=true;if(mode!=='playing')return;}
      }
      if(hit)player.orbitCd=.52;
    }
    player.nutSentryCd=Math.max(0,(player.nutSentryCd||0)-dt);
    if(player.nutSentry&&player.nutSentryCd<=0){
      const all=boss&&!boss.dead?[...enemies,boss]:enemies;let target=null,near=560;
      for(const e of all){const d=dist(player,e);if(!e.dead&&d<near){near=d;target=e;}}
      if(target){const sx=player.x+Math.cos(runTime*1.8)*46,sy=player.y-34+Math.sin(runTime*1.8)*10,a=Math.atan2(target.y-sy,target.x-sx),shots=player.turretVolley?[-.07,.07]:[0];for(const off of shots)bullets.push({x:sx,y:sy,vx:Math.cos(a+off)*650,vy:Math.sin(a+off)*650,life:1.15,damage:(player.turretVolley?4.3:3.4)*Math.max(1,Math.sqrt(player.damage||1)),pierce:player.turretVolley?1:0,hitIds:new Set(),r:6,a:a+off,frost:false,auto:true});player.nutSentryCd=player.turretVolley?.42:.72;tone(410,.025,'triangle',.015,620);}
    }
    player.carrotDroneCd=Math.max(0,(player.carrotDroneCd||0)-dt);
    if(player.carrotDrone&&player.carrotDroneCd<=0){
      const all=boss&&!boss.dead?[...enemies,boss]:enemies;let target=null,near=720;
      for(const e of all){const d=dist(player,e);if(!e.dead&&d<near){near=d;target=e;}}
      if(target){hazards.push({type:'friendlyMortar',x:target.x,y:target.y,r:82,wait:.62,life:.35,hit:false,damage:9*Math.max(1,Math.sqrt(player.specialDamage||1)),friendly:true});player.carrotDroneCd=2.35;tone(255,.035,'square',.015,180);}
    }
    updatePowerHud();
  }
  function updateTerror(e,dt){
    const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1,slow=(e.slow>0?.72:1)*(player.powerups.freeze>0?.58:1);
    if(e.type==='rabid'){
      if(e.windup>0){e.windup-=dt;if(e.windup<=0){e.charge=.66;e.dashTagged=false;burst(e.x,e.y,'#ffad79',12,140);}return;}
      if(e.charge>0){e.charge-=dt;e.x+=Math.cos(e.aim)*458*slow*dt;e.y+=Math.sin(e.aim)*458*slow*dt;e.x=clamp(e.x,32,W-32);e.y=clamp(e.y,106,H-44);if(player.dashTime>0&&!e.dashTagged&&dist(player,e)<72){e.dashTagged=true;addAchievementProgress('nope_rope');}return;}
      e.chargeCd-=dt;
      if(d<490&&e.chargeCd<=0){e.aim=Math.atan2(dy,dx);e.windup=.72;e.chargeCd=3.2;return;}
      e.x+=dx/d*e.speed*slow*dt;e.y+=dy/d*e.speed*slow*dt;
    }else if(e.type==='gatling'){
      if(e.windup>0){e.windup-=dt;if(e.windup<=0){e.burstLeft=8;e.burstCd=0;}return;}
      if(e.burstLeft>0){e.burstCd-=dt;if(e.burstCd<=0){const sweep=(4-e.burstLeft)*.065;enemyShot(e.x,e.y,e.aim+sweep,210);e.burstLeft--;e.burstCd=.115;tone(160,.03,'square',.02,80);}return;}
      if(d>310){e.x+=dx/d*e.speed*slow*dt;e.y+=dy/d*e.speed*slow*dt;}
      if(e.fireCd<=0&&d<620){e.aim=Math.atan2(dy,dx);e.windup=.85;e.fireCd=3.6;}
    }else if(e.type==='sniper'){
      if(e.windup>0){e.windup-=dt;if(e.windup<=0){enemyShot(e.x,e.y,e.aim,350,true);e.fireCd=3.8;addAchievementProgress('sniper_nope');}return;}
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
      e.chargeCd-=dt;if(d<560&&e.chargeCd<=0){e.aim=Math.atan2(dy,dx);e.windup=.65;e.chargeCd=3.1;return;}
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
      e.teleportCd-=dt;if(e.teleportCd<=0){const a=rnd(0,TAU),rr=rnd(190,360);e.x=clamp(player.x+Math.cos(a)*rr,55,W-55);e.y=clamp(player.y+Math.sin(a)*rr,125,H-55);for(let i=0;i<10;i++)enemyShot(e.x,e.y,TAU*i/10,235,true);burst(e.x,e.y,'#b184ff',24,170);e.teleportCd=3.4;return;}
      if(d>260){e.x+=dx/d*e.speed*slow*dt;e.y+=dy/d*e.speed*slow*dt;}if(e.fireCd<=0){const a=Math.atan2(dy,dx);for(let i=-2;i<=2;i++)enemyShot(e.x,e.y,a+i*.16,260,true);e.fireCd=2.2;}
    }else if(e.type==='rocketHare'){
      e.rocketCd-=dt;if(d<330){e.x-=dx/d*e.speed*slow*dt;e.y-=dy/d*e.speed*slow*dt;}else if(d>520){e.x+=dx/d*e.speed*slow*dt;e.y+=dy/d*e.speed*slow*dt;}if(e.rocketCd<=0){hazards.push({type:'rocketMark',x:clamp(player.x+rnd(-85,85),60,W-60),y:clamp(player.y+rnd(-75,75),130,H-55),r:92,wait:.78,life:.38,hit:false,damage:3});e.rocketCd=2.65;tone(125,.18,'square',.04,65);}
    }else if(e.type==='pigJuggernaut'){
      e.shockCd-=dt;e.chargeCd-=dt;if(e.windup>0){e.windup-=dt;if(e.windup<=0)e.charge=.72;return;}if(e.charge>0){e.charge-=dt;e.x+=Math.cos(e.aim)*455*slow*dt;e.y+=Math.sin(e.aim)*455*slow*dt;return;}if(e.shockCd<=0&&d<360){hazards.push({type:'shock',x:e.x,y:e.y,r:145,wait:.55,life:.35,hit:false,damage:3});e.shockCd=3.2;}if(e.chargeCd<=0&&d<600){e.aim=Math.atan2(dy,dx);e.windup=.52;e.chargeCd=2.7;return;}e.x+=dx/d*e.speed*slow*dt;e.y+=dy/d*e.speed*slow*dt;
    }else if(e.type==='zombieBoss'){
      if(e.miniBoss){
        e.chargeCd-=dt;
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
    boss.phase += dt * 4; boss.hit = Math.max(0,boss.hit-dt);boss.slow=Math.max(0,boss.slow-dt);
    if (!boss.karnil && boss.hp < boss.maxHp * .48 && !boss.enraged) { boss.enraged=true; boss.speed=boss.cyber?92:76; announce(boss.cyber?'ÜBERTAKTUNG AKTIV.':'OH OH.', boss.cyber?'CYBER-WUTMODUS':'HASENBEIN DREHT DURCH'); }
    const dx=player.x-boss.x,dy=player.y-boss.y,d=Math.hypot(dx,dy)||1;
    const slow=(boss.slow>0?.88:1)*(player.powerups.freeze>0?.7:1);
    if(boss.windup>0){boss.windup-=dt;if(boss.windup<=0){if(boss.windupMode==='beam'){const count=boss.enraged?5:3;for(let i=0;i<count;i++)enemyShot(boss.x,boss.y,boss.aim+(i-(count-1)/2)*.1,boss.enraged?330:290,true);}else boss.charge=boss.windupMode==='ram'?.68:.5;}}
    else if(boss.charge>0){boss.charge-=dt;boss.x+=Math.cos(boss.aim)*(boss.karnil?610:555)*slow*dt;boss.y+=Math.sin(boss.aim)*(boss.karnil?610:555)*slow*dt;}
    else if(d>110) { boss.x += dx/d*boss.speed*slow*dt; boss.y += dy/d*boss.speed*slow*dt; }
    boss.x=clamp(boss.x,55,W-55);boss.y=clamp(boss.y,140,H-60);
    boss.actionCd-=dt;boss.summonCd-=dt;
    if(boss.burstLeft>0){boss.burstCd-=dt;if(boss.burstCd<=0){enemyShot(boss.x,boss.y,boss.aim+(boss.burstCount-boss.burstLeft)*.075,boss.enraged?285:245,true);boss.burstLeft--;boss.burstCd=.1;}}
    if (boss.actionCd <= 0 && boss.windup<=0 && boss.charge<=0 && boss.burstLeft<=0) {
      boss.attack++;const pattern=boss.phaseThree?boss.attack%6:boss.attack%5,offset=Math.atan2(dy,dx);
      if(boss.karnil&&boss.phaseThree&&pattern===0){for(let ring=0;ring<2;ring++)for(let i=0;i<14;i++)enemyShot(boss.x,boss.y,TAU*i/14+ring*.12,300-ring*35,true);tone(55,.35,'sawtooth',.08,25);}
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
      boss.actionCd=boss.karnil?(boss.phaseThree?.82:(boss.enraged?1.18:1.55)):boss.cyber?(boss.enraged?1.48:1.82):(boss.enraged?1.3:1.7);
    }
    if (boss.summonCd <= 0 && enemies.length < (newGamePlus?24:12)) { const baseCount=boss.enraged?4:3,count=baseCount*(newGamePlus?2:1);for(let i=0;i<count;i++){let type;if(boss.karnil){const pigTypes=boss.phaseThree?['pigJuggernaut','rocketHare','pigCannon','voidBunny']:boss.enraged?['pigHowler','pigRammer','pigCannon','pigDrone']:['pigRammer','pigMortar','pigDrone'];type=pigTypes[i%pigTypes.length];}else type=newGamePlus&&i%4===3?'voidBunny':boss.cyber?(i%3===2?'rabid':'runner'):(i%3===2?'runner':'bunny');spawnEnemy(type);} boss.summonCd=boss.enraged?6.5:9; }
    if(d < player.r + boss.r) hurtPlayer(2);
  }
  function update(dt) {
    if(mode!=='playing')return;
    queueScoreSkillMilestones();if(mode!=='playing')return;
    runTime+=dt; waveTime+=dt; music(dt);
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
    } else { const moveSpeed=player.speed*(player.powerups.haste>0?1.34:1);player.x+=mx*moveSpeed*dt;player.y+=my*moveSpeed*dt;player.moveDistance+=Math.hypot(mx,my)*moveSpeed*dt;addAchievementProgress('long_run',Math.hypot(mx,my)*moveSpeed*dt); }
    player.x=clamp(player.x,42,W-42);player.y=clamp(player.y,106,H-48);
    player.trail=player.trail.filter(p=>(p.life-=dt)>0);
    shotTimer-=dt;
    if(shotTimer<=0){if(fire())shotTimer=player.fireRate*(player.powerups.berserk>0?.55:1)*(player.powerups.overclock>0?.62:1)*(player.powerups.overdrive>0?.5:1);else shotTimer=.07;}
    if (!boss && waveTime < waveLengths[wave]) {
      spawnTimer-=dt;
      if(spawnTimer<=0){
        const roll=Math.random();let type='bunny';
        if(wave>=6){
          if(roll<.22)type='pigRammer';else if(roll<.42)type='pigMortar';else if(roll<.59)type='pigCannon';else if(roll<.72)type='pigDrone';else if(roll<.81)type='pigHowler';else if(roll<.9)type='rabid';else type='splitter';
          if(type==='pigMortar'&&enemies.filter(e=>e.type==='pigMortar'&&!e.dead).length>=3)type='pigRammer';
        }else if(wave>=3){
          if(roll<.27)type='rabid';else if(roll<.45&&wave>=4)type='gatling';else if(roll<.58&&wave>=4)type='sniper';else if(roll<.68&&wave>=3)type='sapper';else if(roll<.78)type='splitter';else if(roll<.86)type='runner';else type='brute';
          if(type==='gatling'&&enemies.filter(e=>e.type==='gatling'&&!e.dead).length>=3)type='bunny';
        }else if(wave>0&&roll<.19)type='gunner';else if(wave>0&&roll<.33)type='brute';else if(waveTime>8&&roll<.64)type='runner';
        if(newGamePlus){const eliteRoll=Math.random();if(wave>=5&&eliteRoll<.09)type='pigJuggernaut';else if(wave>=2&&eliteRoll<.18)type='rocketHare';else if(eliteRoll<.27)type='voidBunny';}
        const cap=newGamePlus?118:62;if(enemies.length<cap){spawnEnemy(type);if(newGamePlus&&enemies.length<cap)spawnEnemy(type);if(wave===2&&Math.random()<.5)spawnEnemy('bunny');}
        spawnTimer=wave<3?Math.max(.31,.82-wave*.16-waveTime*.009):wave<6?Math.max(.38,.69-(wave-3)*.075-waveTime*.004):Math.max(.35,.62-(wave-6)*.07-waveTime*.004);
      }
    }
    for(const e of enemies){
      if(e.dead)continue;
      e.phase+=dt*(e.type==='runner'||e.type==='rabid'||e.type==='pigDrone'?12:7);e.hit=Math.max(0,e.hit-dt);e.fireCd-=dt;e.slow=Math.max(0,e.slow-dt);e.mortarCd-=dt;
      const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;
      const desired=e.type==='gunner'||e.type==='pigMortar'?300:0;
      e.mineCd-=dt;e.howlCd-=dt;
      if(e.type==='rabid'||e.type==='gatling'||e.type==='sniper'||e.type==='sapper'||e.type==='pigHowler'||e.type==='pigRammer'||e.type==='pigMortar'||e.type==='pigCannon'||e.type==='pigDrone'||e.type==='zombieBoss'||e.type==='voidBunny'||e.type==='rocketHare'||e.type==='pigJuggernaut')updateTerror(e,dt);
      else if(d>desired || (e.type==='gunner'&&d<170)) {
        const dir=e.type==='gunner'&&d<170?-1:1;
        const slow=(e.slow>0?.72:1)*(player.powerups.freeze>0?.58:1);e.x+=dx/d*e.speed*dt*dir*slow;e.y+=dy/d*e.speed*dt*dir*slow;
      }
      if(e.type==='gunner'&&e.fireCd<=0&&d<650){enemyShot(e.x,e.y,Math.atan2(dy,dx),184);e.fireCd=2.15;}
      if(e.type==='pigMortar'&&e.mortarCd<=0&&d<760){hazards.push({type:'mortar',x:clamp(player.x+rnd(-110,110),55,W-55),y:clamp(player.y+rnd(-100,100),125,H-50),r:67,wait:1.05,life:.35,hit:false,damage:2});e.mortarCd=3.2;}
      if(dist(player,e)<e.r+player.r-3)hurtPlayer(e.type==='brute'||e.type==='pigRammer'||e.type==='pigHowler'?2:1);
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
      const all=boss&&!boss.dead?[...enemies,boss]:enemies;
      for(const e of all){
        if(e.dead||b.hitIds.has(e))continue;
        const dx=b.x-oldX,dy=b.y-oldY,l2=dx*dx+dy*dy;
        const t=l2?clamp(((e.x-oldX)*dx+(e.y-oldY)*dy)/l2,0,1):0;
        if(Math.hypot(oldX+dx*t-e.x,oldY+dy*t-e.y)<e.r+b.r){
          b.hitIds.add(e);if(b.frost)e.slow=1.5;damageEnemy(e,b.damage);
          if(mode!=='playing')return;
          if(b.chain){b.chain=false;chainHit(e,b.damage);if(mode!=='playing')return;}
          if(b.pierce<=0){b.life=0;break;}b.pierce--;
        }
      }
    }
    bullets=bullets.filter(b=>b.life>0&&b.x>-60&&b.x<W+60&&b.y>-60&&b.y<H+60);
    for(const b of enemyBullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(dist(player,b)<player.r+b.r-3){hurtPlayer();b.life=0;}if(mode!=='playing')return;}
    enemyBullets=enemyBullets.filter(b=>b.life>0&&b.x>-50&&b.x<W+50&&b.y>-50&&b.y<H+50);
    for(const h of hazards){
      h.wait-=dt;
      if(h.wait<=0){
        h.life-=dt;
        if(!h.hit){h.hit=true;shake=reducedMotion?0:9;burst(h.x,h.y,h.type==='shock'?'#ffb3e4':h.type==='mine'?'#f4b25e':'#ffa65e',h.type==='mine'?45:35,260);tone(h.type==='rockfall'?55:90,.25,'sawtooth',.06,30);
          if(h.type==='mine'||h.type==='sapperMine'||h.type==='shock'||h.type==='friendlyMortar'){for(const e of enemies)if(dist(h,e)<h.r+e.r){const pigMult=h.pigBonus&&e.type.startsWith('pig')?h.pigBonus:1;damageEnemy(e,(h.damage||36)*pigMult,true);}if(boss&&dist(h,boss)<h.r+boss.r)damageEnemy(boss,(h.damage||36)*(h.bossBonus||.8),true);h.life=.3;if(h.type==='sapperMine')addAchievementProgress('mine_sweeper');}
        }
        if(!h.friendly&&dist(player,h)<h.r+player.r*.5&&!h.playerHit){h.playerHit=true;hurtPlayer(h.damage||2);}
      }
      if(mode!=='playing')return;
    }
    hazards=hazards.filter(h=>h.wait>0||h.life>0);
    for(const t of thrownWeapons){
      t.life-=dt;if(!t.returning&&t.life<.86){t.returning=true;t.hitIds.clear();t.damage*=.9;}
      if(t.returning){const dx=player.x-t.x,dy=player.y-t.y,d=Math.hypot(dx,dy)||1;t.vx=dx/d*560;t.vy=dy/d*560;}
      t.x+=t.vx*dt;t.y+=t.vy*dt;
      const all=boss&&!boss.dead?[...enemies,boss]:enemies;
      for(const e of all)if(!e.dead&&!t.hitIds.has(e)&&dist(t,e)<e.r+t.r){t.hitIds.add(e);damageEnemy(e,t.damage);if(t.hitIds.size<5)t.damage*=.92;}
    }
    thrownWeapons=thrownWeapons.filter(t=>t.life>0&&(!t.returning||dist(t,player)>25));
    for(const p of pickups){
      p.life-=dt;p.phase+=dt*3;const d=dist(player,p),magnetRadius=player.magnet*(player.powerups.magnet>0?2.2:1);
      if(d<magnetRadius&&d>1){p.x+=(player.x-p.x)/d*310*dt;p.y+=(player.y-p.y)/d*310*dt;}
      if(d<25){p.life=0;if(p.type==='heart'){player.hp=Math.min(player.maxHp,player.hp+1);floater(player.x,player.y-35,'+1 ♥',accent());tone(700,.13,'sine',.055,1050);}else if(p.type==='power'){collectPowerup(p);}else if(p.type==='ammo'){grantSpecialAmmo();}else{score+=Math.round((player.powerups.jackpot>0?80:20)*(player.powerups.scoreRush>0?2:1)*(player.scoreRushBonus||1));addAchievementProgress('score_hog',20);tone(1000,.045,'sine',.022,1400);}}
    }
    pickups=pickups.filter(p=>p.life>0);enemies=enemies.filter(e=>!e.dead);
    if(!boss&&waveSpawningComplete()&&livingEnemyCount()===0)upgradeScreen();
    uiTimer-=dt;if(uiTimer<=0){updateHud();uiTimer=.1;}
  }

  // Game-native canvas art: a moonlit clearing with a warm little hero.
  let seed=74319;const sr=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  const ground=document.createElement('canvas');ground.width=W;ground.height=H;const g=ground.getContext('2d');
  // Thick ink around actors gives the arena a hand-animated 90s cartoon read.
  function cartoonInk(c,width=2.35){if(c!==ctx)return;c.strokeStyle='#2a2230';c.lineWidth=width;c.lineJoin='round';c.lineCap='round';}
  function ellipse(c,x,y,rx,ry,color,rotation=0){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,rotation,0,TAU);c.fill();if(c===ctx){cartoonInk(c);c.stroke();}}
  function path(c,points,color){c.fillStyle=color;c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fill();if(c===ctx){cartoonInk(c);c.stroke();}}
  function makeGround(){
    seed=74319;const palette=themes[settings.theme];
    const grad=g.createRadialGradient(640,350,70,640,350,780);grad.addColorStop(0,palette.ground[0]);grad.addColorStop(.57,palette.ground[1]);grad.addColorStop(1,palette.ground[2]);g.fillStyle=grad;g.fillRect(0,0,W,H);
    g.fillStyle='#5e68552a';g.beginPath();g.moveTo(410,720);g.bezierCurveTo(410,590,890,490,760,0);g.lineTo(870,0);g.bezierCurveTo(960,440,560,600,560,720);g.fill();
    g.strokeStyle='#61705017';g.lineWidth=1;
    for(let i=0;i<1600;i++){
      const x=sr()*W,y=sr()*H,v=sr();
      if(v>.2){g.strokeStyle=v>.7?'#81966630':'#071e204d';g.beginPath();g.moveTo(x,y);g.lineTo(x-2,y-3-sr()*5);g.moveTo(x,y);g.lineTo(x+3,y-5-sr()*4);g.stroke();}
      else ellipse(g,x,y,1+sr()*3,1+sr()*2,'#aac18d19');
    }
    for(let i=0;i<80;i++){const x=sr()*W,y=sr()*H;ellipse(g,x,y,3+sr()*4,2+sr()*2,'#172f24');ellipse(g,x-1,y-1,2+sr()*3,1+sr()*2,'#63776140');}
    for(const [x,y] of [[119,161],[1130,595],[1075,172],[199,599]]){
      g.save();g.translate(x,y);g.rotate(-.18);g.strokeStyle='#89947325';g.lineWidth=3;g.strokeRect(-20,-13,40,27);g.beginPath();g.moveTo(-20,0);g.lineTo(20,0);g.moveTo(0,-13);g.lineTo(0,13);g.stroke();g.restore();
    }
    // Low fences and carrot beds delineate the playable garden.
    for(let x=40;x<W;x+=52){
      g.fillStyle='#101f1b';g.fillRect(x+2,79,7,17);g.fillStyle='#637157';g.fillRect(x,73,5,18);g.fillStyle='#344b39';g.fillRect(x,76,52,4);
      g.fillStyle='#12271f';g.fillRect(x,685,6,22);g.fillStyle='#5a674c';g.fillRect(x,683,4,17);g.fillStyle='#324933';g.fillRect(x,687,52,4);
    }
    for(let i=0;i<31;i++){
      const x=40+i*41,y=40+sr()*15;
      ellipse(g,x,y+8,9,4,'#071a1755');ellipse(g,x,y,5,8,'#ab6c35');g.strokeStyle='#698a46';g.lineWidth=2;g.beginPath();g.moveTo(x,y-5);g.lineTo(x-5,y-17);g.moveTo(x,y-4);g.lineTo(x+5,y-14);g.stroke();
    }
    for(let i=0;i<50;i++){
      const side=i%2,x=side?W-8-sr()*23:sr()*23,y=sr()*H;
      ellipse(g,x+5,y+9,30,17,palette.shade+'66');ellipse(g,x,y,25,19,palette.plant[0]);ellipse(g,x-4,y-5,19,15,palette.plant[1]);ellipse(g,x-10,y-8,8,6,palette.plant[2]);
    }
    for(let i=0;i<14;i++){
      const x=sr()*W,y=sr()>.5?sr()*17:703+sr()*17;
      ellipse(g,x,y,55,23,palette.shade);ellipse(g,x-10,y-7,44,21,palette.plant[0]);ellipse(g,x-20,y-11,18,10,palette.plant[1]);
    }
  }
  makeGround();
  const fireflies=Array.from({length:25},()=>({x:sr()*W,y:sr()*H,phase:sr()*TAU}));

  function drawHamster(p, alpha=1){
    const c=ctx,bob=p.moving?Math.sin(ambientTime*17)*2:Math.sin(ambientTime*3)*.7;
    c.save();c.translate(p.x,p.y);c.globalAlpha=alpha;
    ellipse(c,0,13,23,8,'#051b176b');
    if(p.invuln>0&&Math.floor(ambientTime*14)%2===0&&p.dashTime<=0)c.globalAlpha=alpha*.6;
    if(p.dashTime>0||p.shieldReady){c.strokeStyle=accent();c.lineWidth=p.shieldReady?2.5:2;c.setLineDash(p.shieldReady?[9,4]:[]);c.beginPath();c.arc(0,0,31,0,TAU);c.stroke();c.setLineDash([]);}
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
    const c=ctx,isBoss=e.type==='boss',pig=e.type.startsWith('pig'),zombie=e.type==='zombieBoss';
    const factor=e.karnil?3.25:isBoss?(e.cyber?2.7:2.4):e.type==='brute'?1.4:e.type==='gatling'?1.2:e.type==='splitter'?1.15:e.type==='sniper'?1.1:e.type==='sapper'?1.08:e.type==='pigRammer'?1.18:e.type==='pigMortar'?1.08:e.type==='pigCannon'?1.22:e.type==='pigHowler'?1.28:e.type==='pigDrone'?.9:e.type==='pigJuggernaut'?1.5:e.type==='voidBunny'?1.22:e.type==='rocketHare'?1.16:e.type==='runner'?.83:zombie?1.42:1;
    const bob=Math.sin(e.phase)*2.5,face=player&&player.x<e.x?-1:1;
    c.save();c.translate(e.x,e.y);ellipse(c,0,12*factor,21*factor,7*factor,'#051b1777');c.scale(factor*face,factor);c.translate(0,bob);
    const pigFur=e.type==='pigRammer'?'#c87363':e.type==='pigMortar'?'#c99270':e.type==='pigCannon'?'#ba7f78':e.type==='pigHowler'?'#b87879':e.type==='pigDrone'?'#c99181':e.type==='pigJuggernaut'?'#9c6762':'#d08a71';
    const pigDark=e.type==='pigRammer'?'#7f4747':e.type==='pigMortar'?'#80604d':e.type==='pigCannon'?'#72515b':e.type==='pigHowler'?'#744657':e.type==='pigDrone'?'#6d5a61':e.type==='pigJuggernaut'?'#493c43':'#8e5b59';
    const fur=e.hit>0?'#ffffff':e.karnil?'#756762':e.cyber?'#859ba5':pig?pigFur:zombie?'#849278':e.type==='rabid'?'#d39676':e.type==='gatling'?'#87a192':e.type==='sniper'?'#8ba5b6':e.type==='sapper'?'#a68f73':e.type==='voidBunny'?'#7f69a8':e.type==='rocketHare'?'#b28b66':e.type==='splitter'?'#b49ac1':e.type==='runner'?'#c0bfb0':e.type==='gunner'?'#91ada0':'#d6d7bc';
    const dark=e.hit>0?'#efffcf':e.karnil?'#514449':pig?pigDark:zombie?'#4e6352':'#8e9f8c';
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
      if(e.karnil){
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
      path(c,[[-12,-16],[-2,-19],[2,-12],[-10,-10]],e.cyber?'#435864':e.karnil?'#58494a':'#435549');
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
    for(const e of [...enemies,...(boss?[boss]:[])]){
      if(e.dead)continue;
      if(e.windup>0||(e.type==='gatling'&&e.burstLeft>0)||(e.cyber&&e.burstLeft>0)){
        const charge=e.type==='rabid'||e.type==='pigRammer'||e.karnil||(e.cyber&&e.windup>0),length=charge?340:420;
        ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.aim);ctx.fillStyle='#ff986426';path(ctx,[[0,-e.r*.5],[length,-(charge?e.r*.5:70)],[length,charge?e.r*.5:70],[0,e.r*.5]],'#ff986426');ctx.strokeStyle='#ffb275';ctx.lineWidth=2;ctx.setLineDash([8,8]);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(length,0);ctx.stroke();ctx.restore();
      }
    }
    for(const h of hazards){
      ctx.save();ctx.translate(h.x,h.y);ctx.strokeStyle='#ff9b65';ctx.lineWidth=3;ctx.fillStyle=h.wait>0?'#ed713524':'#ffb46677';ctx.beginPath();ctx.arc(0,0,h.r,0,TAU);ctx.fill();ctx.stroke();
      if(h.wait>0){ctx.setLineDash([7,7]);ctx.beginPath();ctx.arc(0,0,h.r*(1-clamp(h.wait/1.3,0,1)),0,TAU);ctx.stroke();ctx.font='bold 30px Arial';ctx.fillStyle='#ffb66d';ctx.textAlign='center';ctx.fillText('!',0,11);}ctx.restore();
    }
    for(const p of pickups)drawPickup(p);
    for(const t of player.trail)drawHamster({...player,x:t.x,y:t.y},t.life*.9);
    const actors=[...enemies.filter(e=>!e.dead),...(boss&&!boss.dead?[boss]:[]),{...player,isPlayer:true}].sort((a,b)=>a.y-b.y);
    for(const a of actors){if(a.isPlayer)drawHamster(player);else drawRabbit(a);}
    if(player.orbit){
      ctx.save();ctx.strokeStyle=accent()+'40';ctx.lineWidth=1;ctx.beginPath();ctx.arc(player.x,player.y,62,0,TAU);ctx.stroke();
      for(let i=0;i<2;i++){const a=runTime*3.5+i*Math.PI,x=player.x+Math.cos(a)*62,y=player.y+Math.sin(a)*62;ellipse(ctx,x,y,9,6,accent(),a);ellipse(ctx,x-2,y-1,3,3,'#fff5cb');}ctx.restore();
    }
    if(player.nutSentry){const a=runTime*1.8,x=player.x+Math.cos(a)*46,y=player.y-34+Math.sin(a)*10;ctx.save();ctx.translate(x,y);ellipse(ctx,0,0,12,9,'#b77c42');ellipse(ctx,-2,-2,6,4,'#edd087');ctx.fillStyle='#4d3b2b';ctx.fillRect(8,-3,13,6);ctx.restore();}
    if(player.carrotDrone){const a=runTime*1.35+Math.PI,x=player.x+Math.cos(a)*55,y=player.y-48+Math.sin(a)*12;ctx.save();ctx.translate(x,y);path(ctx,[[-10,-4],[7,-7],[12,0],[7,7],[-10,4]],'#e78642');ctx.strokeStyle='#75a85b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-8,-2);ctx.lineTo(-17,-10);ctx.moveTo(-8,2);ctx.lineTo(-17,10);ctx.stroke();ctx.restore();}
    for(const b of bullets){
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
    if(mode==='playing'){
      ambientTime+=dt; update(dt);shake=Math.max(0,shake-dt*22);bombFlash=Math.max(0,bombFlash-dt);
      for(const p of particles){p.life-=dt;p.x+=(p.vx||0)*dt;p.y+=(p.vy||0)*dt;if(p.vx!==undefined)p.vx*=.97;if(p.vy!==undefined)p.vy*=.97;}
      particles=particles.filter(p=>p.life>0);for(const f of floaters){f.life-=dt;f.y-=dt*30;}floaters=floaters.filter(f=>f.life>0);
    } else if(mode==='menu'||mode==='help'||mode==='intro'||mode==='retry'||mode==='bossUpgrade'||mode==='interlude'||mode==='upgrade'||mode==='scoreSkill'||mode==='paftiCutscene')ambientTime+=dt;
    render(dt);requestAnimationFrame(frame);
  }

  $('startButton').onclick=()=>startGame(false);$('ngPlusButton').onclick=()=>startGame(true);$('helpButton').onclick=showHelp;$('achievementButton').onclick=showAchievements;$('powerupButton').onclick=showPowerups;$('pauseButton').onclick=pauseGame;$('soundButton').onclick=toggleSound;$('settingsButton').onclick=showSettings;
  updateNGPlusMenu();
  $('fullscreenButton').onclick=async()=>{
    try{if(document.fullscreenElement)await document.exitFullscreen();else if(shell.requestFullscreen)await shell.requestFullscreen();else toast('Vollbild ist in diesem Browser nicht verfügbar.');}
    catch{toast('Vollbild ist in dieser Ansicht nicht verfügbar.');}
  };
  document.addEventListener('fullscreenchange',()=>{resize();$('fullscreenButton').setAttribute('aria-label',document.fullscreenElement?'Vollbild schließen':'Vollbild öffnen');});
  document.addEventListener('keydown',e=>{
    const gameKeys=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyE','KeyQ','KeyR','KeyP','Escape'];
    if(mode==='playing'&&gameKeys.includes(e.code))e.preventDefault();
    if(e.code==='Tab'&&!$('overlay').classList.contains('hidden')){
      const buttons=Array.from($('overlayContent').querySelectorAll('button:not([disabled])'));const first=buttons[0],last=buttons[buttons.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      return;
    }
    if(e.repeat)return;
    if(e.code==='KeyP'||e.code==='Escape'){
      if(mode==='playing'||mode==='paused'){e.preventDefault();pauseGame();}
      else if(mode==='help'){mode='menu';hideOverlay();$('startButton').focus();}
      else if(mode==='settings'&&e.code==='Escape'){e.preventDefault();closeSettings();}
      return;
    }
    if(mode!=='playing')return;
    keys.add(e.code);if(e.code==='Space')useDash();if(e.code==='KeyE')useWeapon();if(e.code==='KeyQ')cycleWeapon(-1);if(e.code==='KeyR')cycleWeapon(1);
  });
  document.addEventListener('keyup',e=>keys.delete(e.code));
  window.addEventListener('blur',()=>{resetInput();if(mode==='playing')pauseGame();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){resetInput();if(mode==='playing')pauseGame();}});
  function updatePointer(e){
    if(mode!=='playing')return;
    const rect=shell.getBoundingClientRect();
    pointer.x=clamp((e.clientX-rect.left)/scale+camX,0,W);pointer.y=clamp((e.clientY-rect.top)/scale+camY,0,H);pointer.active=true;
  }
  shell.addEventListener('pointermove',updatePointer);shell.addEventListener('pointerdown',e=>{if(mode!=='playing')return;if(e.target&&e.target!==canvas)return;e.preventDefault();updatePointer(e);fire();shotTimer=player.fireRate*(player.powerups.berserk>0?.55:1)*(player.powerups.overclock>0?.62:1)*(player.powerups.overdrive>0?.5:1);});shell.addEventListener('pointerleave',()=>{pointer.active=false;});
  shell.addEventListener('wheel',e=>{if(mode==='playing'){e.preventDefault();cycleWeapon(e.deltaY>0?1:-1);}},{passive:false});
  const stick=$('joystick');
  function moveStick(e){
    if(e.pointerId!==touch.id)return;
    const rect=stick.getBoundingClientRect(),dx=e.clientX-(rect.left+rect.width/2),dy=e.clientY-(rect.top+rect.height/2),max=rect.width*.31,m=Math.hypot(dx,dy),f=m>max?max/m:1;
    touch.x=dx*f/max;touch.y=dy*f/max;$('joystickThumb').style.transform=`translate(${dx*f}px,${dy*f}px)`;
  }
  stick.addEventListener('pointerdown',e=>{if(mode!=='playing')return;e.preventDefault();touch.id=e.pointerId;stick.setPointerCapture(e.pointerId);moveStick(e);});
  stick.addEventListener('pointermove',moveStick);
  const releaseStick=e=>{if(e.pointerId===touch.id){touch.id=null;touch.x=touch.y=0;$('joystickThumb').style.transform='translate(0,0)';}};
  stick.addEventListener('pointerup',releaseStick);stick.addEventListener('pointercancel',releaseStick);stick.addEventListener('lostpointercapture',releaseStick);
  $('touchDash').addEventListener('pointerdown',e=>{e.preventDefault();useDash();});$('touchBomb').addEventListener('pointerdown',e=>{e.preventDefault();useBomb();});

  // Read-only state and the same start/pause actions exposed by the game UI.
  const modelContext=document.modelContext;
  if(modelContext?.registerTool){
    const lifecycle=new AbortController();
    const result=()=>({version:4,state:mode,wave:wave+1,totalWaves:9,act:generalDefeated?(cyberDefeated?3:2):1,score,health:player?{current:player.hp,max:player.maxHp}:null,bombs:player?.bombs??0,weapons:player?.weapons??[],powerups:player?Object.keys(player.powerups):[],retriesLeft,seconds:Math.floor(runTime),boss:boss?(boss.karnil?'Karnil':boss.cyber?'Cyber-Hasenbein':'General Hasenbein'):null,bossHealth:boss?Math.max(0,boss.hp):null,skills:player?Object.keys(player.skills):[],theme:settings.theme,accent:settings.accent});
    const registry=[
      {name:'read_game_state',description:'Read the current Snickers 3 game status, score, health and wave.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(input){if(input&&Object.keys(input).length)throw Error('No arguments expected.');return result();}},
      {name:'start_game',description:'Start Snickers 3 from the menu or replay a completed run. Cannot replace an active run.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(input&&Object.keys(input).length)throw Error('No arguments expected.');if(!['menu','won','lost'].includes(mode))throw Error('A game is already active.');startGame();return result();}},
      {name:'set_game_paused',description:'Pause or resume the current Snickers 3 run.',inputSchema:{type:'object',properties:{paused:{type:'boolean'}},required:['paused'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||typeof input.paused!=='boolean'||Object.keys(input).some(k=>k!=='paused'))throw Error('Expected only paused: boolean.');if(!['playing','paused'].includes(mode))throw Error('No active run to pause or resume.');if(input.paused&&mode==='playing')pauseGame();if(!input.paused&&mode==='paused')resumeGame();return result();}}
    ];
    for(const tool of registry){try{Promise.resolve(modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
    window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  }
  applySettings(false);
  requestAnimationFrame(frame);
})();
