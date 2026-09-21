'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const canvas = $('gameCanvas'), ctx = canvas.getContext('2d'), shell = $('gameShell');
  const W = 1280, H = 720, TAU = Math.PI * 2;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const rnd = (lo, hi) => lo + Math.random() * (hi - lo);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const waveLengths = [28, 32, 36];
  let mode = 'menu', previousMode = 'playing', player, enemies = [], bullets = [], enemyBullets = [], particles = [], pickups = [], hazards = [], floaters = [];
  let wave = 0, waveTime = 0, runTime = 0, spawnTimer = 0, kills = 0, score = 0, boss = null, shake = 0, bombFlash = 0;
  let lastFrame = 0, uiTimer = 0, ambientTime = 0, shotTimer = 0, noticeTimer, announcementTimer;
  let dpr = 1, scale = 1, viewW = W, viewH = H, camX = 0, camY = 0;
  const keys = new Set();
  const touch = { x: 0, y: 0, id: null };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let soundOn = false, audioContext, musicTimer = 0, musicStep = 0, record = 0;
  try { record = Math.max(0, Number(localStorage.getItem('snickers3-best')) || 0); } catch {}
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
    if (soundOn) tone(660, .14, 'triangle', .06, 880);
  }
  function music(dt) {
    if (!soundOn) return;
    musicTimer -= dt;
    if (musicTimer <= 0) {
      musicTimer = boss ? .18 : .24;
      const notes = [110, 110, 164.81, 130.81, 110, 146.83, 164.81, 98];
      tone(notes[musicStep % 8], .2, 'triangle', .035);
      if (musicStep % 4 === 0) tone(75, .09, 'sine', .1, 30);
      if (musicStep % 2 === 1) tone(notes[musicStep % 8] * 4, .07, 'sine', .016);
      musicStep++;
    }
  }
  function toast(message) {
    $('loadingNotice').textContent = message; $('loadingNotice').classList.remove('hidden');
    clearTimeout(noticeTimer); noticeTimer = setTimeout(() => $('loadingNotice').classList.add('hidden'), 2800);
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
  function resetInput() {
    keys.clear(); touch.x = touch.y = 0; touch.id = null;
    $('joystickThumb').style.transform = 'translate(0,0)';
  }
  function startGame() {
    clearTimeout(announcementTimer); clearTimeout(noticeTimer); resetInput();
    player = { x: W / 2, y: H / 2 + 25, r: 18, hp: 6, maxHp: 6, speed: 218, invuln: 1.8, dashCd: 0, dashTime: 0, dashX: 1, dashY: 0, face: 1, moving: false, angle: 0, bombs: 2, damage: 1, fireRate: .36, spread: 0, pierce: 0, magnet: 90, trail: [] };
    enemies = []; bullets = []; enemyBullets = []; particles = []; pickups = []; hazards = []; floaters = [];
    wave = 0; waveTime = 0; runTime = 0; score = 0; kills = 0; boss = null; spawnTimer = .7; shotTimer = .2; shake = 0; bombFlash = 0; musicStep = 0;
    mode = 'playing'; hideOverlay();
    $('startScreen').classList.add('hidden'); $('hud').classList.remove('hidden'); $('hud').setAttribute('aria-hidden', 'false');
    $('runInfo').classList.remove('hidden'); $('pauseButton').classList.remove('hidden'); $('touchControls').classList.remove('hidden'); $('bossHud').classList.add('hidden'); $('loadingNotice').classList.add('hidden');
    updateHud(); announce('WELLE 01 / 03', 'DIE MÖHREN-MILIZ'); tone(330, .3, 'triangle', .08, 660);
  }
  function goMenu() {
    mode = 'menu'; resetInput(); hideOverlay();
    $('startScreen').classList.remove('hidden'); $('hud').classList.add('hidden'); $('hud').setAttribute('aria-hidden', 'true');
    for (const id of ['runInfo','pauseButton','touchControls','bossHud','announcement']) $(id).classList.add('hidden');
    $('menuRecord').textContent = record ? `LOKALER REKORD ${record.toLocaleString('de-DE')}` : '';
    $('startButton').focus();
  }
  function pauseGame() {
    if (mode === 'paused') return resumeGame();
    if (mode !== 'playing') return;
    previousMode = mode; mode = 'paused'; resetInput(); $('announcement').classList.add('hidden');
    showOverlay('<span class="eyebrow">TAKTISCHE KNABBERPAUSE</span><h2 id="overlayTitle">DIE HASEN WARTEN.</h2><p>Durchatmen. Nüsse zählen. Weiterkämpfen.</p><div class="overlay-actions"><button class="primary-button" id="resumeButton">WEITERSPIELEN <span>↗</span></button><button class="secondary-button" id="menuButton">Zum Hauptmenü</button></div>');
    $('resumeButton').onclick = resumeGame; $('menuButton').onclick = goMenu;
  }
  function resumeGame() { if (mode !== 'paused') return; mode = previousMode; hideOverlay(); lastFrame = performance.now(); }
  function showHelp() {
    if (mode !== 'menu') return;
    mode = 'help';
    showOverlay('<span class="eyebrow">DEIN SEHR KURZES ÜBERLEBENSHANDBUCH</span><h2 id="overlayTitle">KLEIN, ABER BEWAFFNET.</h2><p>Überlebe drei Wellen und besiege Hasenbein. Bleib in Bewegung, sammle Nüsse für Punkte und grüne Herzen zum Heilen.</p><div class="help-grid"><div class="help-row"><kbd>WASD</kbd><span>Bewegen<small>Auch mit Pfeiltasten oder dem Touch-Stick.</small></span></div><div class="help-row"><kbd>⌖</kbd><span>Automatisch feuern<small>Snickers zielt auf den nächsten Gegner.</small></span></div><div class="help-row"><kbd>SPACE</kbd><span>Ausweichen<small>Kurz unverwundbar. Alle 2,6 Sekunden.</small></span></div><div class="help-row"><kbd>E</kbd><span>Nussbombe<small>Räumt Gegner und Geschosse in der Nähe weg.</small></span></div></div><p>Orange Kreise bedeuten: raus da! Zwischen den Wellen wählst du eine Verbesserung und heilst 2 Herzen.</p><button class="primary-button" id="helpClose">ALLES KLAR <span>↗</span></button>');
    $('helpClose').onclick = () => { mode = 'menu'; hideOverlay(); $('startButton').focus(); };
  }
  function useDash() {
    if (mode !== 'playing' || player.dashCd > 0) return;
    let x = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + touch.x;
    let y = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) + touch.y;
    const m = Math.hypot(x, y);
    if (m < .1) { x = player.face; y = 0; } else { x /= m; y /= m; }
    player.dashX = x; player.dashY = y; player.dashTime = .19; player.dashCd = 2.6; player.invuln = Math.max(player.invuln, .42);
    burst(player.x, player.y, '#c7f36b', 14, 110); tone(250, .18, 'sine', .05, 650);
  }
  function useBomb() {
    if (mode !== 'playing') return;
    if (player.bombs <= 0) { toast('Keine Nussbomben mehr – halte durch!'); return; }
    player.bombs--; bombFlash = .5; shake = reducedMotion ? 0 : 10;
    particles.push({ type:'ring', x:player.x, y:player.y, life:.65, maxLife:.65, r:0, color:'#dfff95' });
    burst(player.x, player.y, '#ddff9a', 65, 440);
    for (const e of enemies) if (dist(player, e) < 360) damageEnemy(e, 18, true);
    if (boss && dist(player, boss) < 410) damageEnemy(boss, 24, true);
    enemyBullets = enemyBullets.filter(b => dist(player, b) > 400);
    hazards = hazards.filter(h => dist(player, h) > 360);
    tone(160, .5, 'sawtooth', .12, 25); updateHud();
  }
  function spawnEnemy(type) {
    const angle = rnd(0, TAU), x = clamp(player.x + Math.cos(angle) * 660, -30, W + 30), y = clamp(player.y + Math.sin(angle) * 660, -30, H + 30);
    const stats = { bunny: [2, 62 + wave * 7, 18, 65], runner: [1, 127 + wave * 5, 15, 85], brute: [7, 40, 27, 160], gunner: [3, 47, 20, 120] }[type];
    enemies.push({ x, y, type, hp:stats[0], maxHp:stats[0], speed:stats[1], r:stats[2], points:stats[3], phase:rnd(0,TAU), hit:0, fireCd:rnd(1.5,3), id:Math.random(), dead:false });
  }
  function spawnBoss() {
    boss = { x: W / 2, y: 160, type:'boss', r:49, hp:180, maxHp:180, speed:44, phase:0, hit:0, actionCd:3, attack:0, summonCd:8, enraged:false, dead:false, points:5000 };
    waveTime = 0; enemyBullets = []; hazards = []; player.bombs++; player.hp = Math.min(player.maxHp, player.hp + 2);
    $('bossHud').classList.remove('hidden'); announce('DAS WAR NUR DIE VORSPEISE.', 'GENERAL HASENBEIN');
    tone(90, 1, 'sawtooth', .08, 55); updateHud();
  }
  function upgradeScreen() {
    mode = 'upgrade'; resetInput(); enemies = []; enemyBullets = []; hazards = []; bullets = [];
    for (const p of pickups) if (p.type === 'nut') score += 20;
    pickups = []; $('announcement').classList.add('hidden');
    const choices = wave === 0 ? [
      { id:'spread', icon:'⋔', title:'DOPPELT HÄLT BESSER', desc:'Zwei zusätzliche Nüsse pro Schuss.', apply:() => player.spread++ },
      { id:'rapid', icon:'»', title:'ESPRESSO-NÜSSE', desc:'35 % schneller feuern. Mehr Nuss pro Sekunde.', apply:() => player.fireRate /= 1.35 },
      { id:'health', icon:'♡', title:'DICKE BACKEN', desc:'2 zusätzliche Herzen und volle Heilung.', apply:() => { player.maxHp += 2; player.hp = player.maxHp; } }
    ] : [
      { id:'pierce', icon:'↗', title:'PANZERKNACKER', desc:'Schüsse durchdringen 2 weitere Gegner.', apply:() => player.pierce += 2 },
      { id:'power', icon:'✳', title:'EXTRA KNACKIG', desc:'60 % mehr Schaden mit jeder Nuss.', apply:() => player.damage *= 1.6 },
      { id:'bombs', icon:'◎', title:'NUSS-ESKALATION', desc:'3 zusätzliche Nussbomben für harte Zeiten.', apply:() => player.bombs += 3 }
    ];
    showOverlay(`<span class="eyebrow">WELLE ${String(wave + 1).padStart(2,'0')} GESCHAFFT</span><h2 id="overlayTitle">ZEIT AUFZURÜSTEN.</h2><p>Wähle eine Verbesserung. Du bekommst außerdem 2 Herzen zurück.</p><div class="upgrades">${choices.map((c,i) => `<button class="upgrade" id="upgrade${i}"><span class="upgrade-icon">${c.icon}</span><strong>${c.title}</strong><span>${c.desc}</span><em>AUSWÄHLEN ↗</em></button>`).join('')}</div>`);
    choices.forEach((c,i) => { $(`upgrade${i}`).onclick = () => {
      if (mode !== 'upgrade') return;
      c.apply(); player.hp = Math.min(player.maxHp, player.hp + 2); player.bombs++; player.invuln = 2;
      wave++; waveTime = 0; spawnTimer = 1; mode = 'playing'; hideOverlay(); updateHud();
      announce(`WELLE ${String(wave+1).padStart(2,'0')} / 03`, wave === 1 ? 'DIE LANGOHREN SCHLAGEN ZURÜCK' : 'DAS LETZTE AUFGEBOT');
      tone(523, .25, 'triangle', .08, 1046);
    }; });
  }
  function finish(won) {
    if (mode !== 'playing') return;
    mode = won ? 'won' : 'lost'; resetInput(); $('announcement').classList.add('hidden');
    if (won) score += 2000 + player.hp * 250 + Math.max(0, Math.round((210 - runTime) * 15));
    const isRecord = score > record;
    if (isRecord) { record = score; try { localStorage.setItem('snickers3-best', String(record)); } catch {} }
    updateHud();
    showOverlay(`<span class="eyebrow">${won ? 'MISSION ERFÜLLT · NUSS GESICHERT' : 'MISSION GESCHEITERT · EGO LEICHT ANGEKNABBERT'}</span><h2 id="overlayTitle">${won ? 'DIE NUSS GEHÖRT DIR.' : 'HASENBEIN LACHT NOCH.'}</h2><p>${won ? 'Der General ist besiegt. Snickers hat die letzte Nuss zurück. Sie schmeckt nach Erdnuss. Und nach Vergeltung.' : ['Diese Langohren spielen unfair. Zum Glück gibt es noch einen Versuch.', 'Auch Helden brauchen mal einen zweiten Anlauf. Die Nuss wartet auf dich.', 'Zu viele Karotten. Zu wenig Deckung. Du weißt jetzt, wie der Hase läuft.'][Math.floor(Math.random()*3)]}</p>${isRecord ? '<div class="new-record">NEUER LOKALER REKORD</div>' : ''}<div class="stats"><div><strong>${score.toLocaleString('de-DE')}</strong><span>PUNKTE</span></div><div><strong>${kills}</strong><span>HASEN BESIEGT</span></div><div><strong>${formatTime(runTime)}</strong><span>ÜBERLEBT</span></div></div><div class="overlay-actions"><button id="retryButton" class="primary-button">${won ? 'NOCH EINE RUNDE' : 'REVANCHE'} <span>↗</span></button><button id="endMenuButton" class="secondary-button">Hauptmenü</button></div>`);
    $('retryButton').onclick = startGame; $('endMenuButton').onclick = goMenu;
    if (won) { tone(523,.3,'triangle',.1); setTimeout(() => tone(659,.3,'triangle',.1),150); setTimeout(() => tone(1046,.5,'triangle',.1),300); }
    else tone(180,.55,'triangle',.1,50);
  }
  function formatTime(n) { return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(Math.floor(n%60)).padStart(2,'0')}`; }
  function updateHud() {
    if (!player) return;
    $('healthBar').innerHTML = Array.from({length:player.maxHp},(_,i)=>`<i class="health-segment${i < player.hp ? '' : ' empty'}"></i>`).join('');
    $('healthText').textContent = `${player.hp}/${player.maxHp}`;
    $('scoreValue').textContent = String(score).padStart(6,'0');
    $('waveLabel').textContent = boss ? 'FINALE' : `WELLE ${String(wave+1).padStart(2,'0')} / 03`;
    $('waveFill').style.width = boss ? '100%' : `${clamp(waveTime / waveLengths[wave] * 100, 0, 100)}%`;
    $('waveObjective').textContent = boss ? 'Besiege General Hasenbein' : waveTime >= waveLengths[wave] ? 'Besiege die übrigen Hasen' : `${Math.max(0,Math.ceil(waveLengths[wave]-waveTime))} s · Bleib in Bewegung`;
    $('bombCount').textContent = `× ${player.bombs}`; $('runTime').textContent = formatTime(runTime);
    $('dashFill').style.width = `${(1-clamp(player.dashCd/2.6,0,1))*100}%`;
    $('dashLabel').textContent = player.dashCd <= 0 ? 'AUSWEICHEN BEREIT' : 'LÄDT AUF …';
    if (boss) { $('bossFill').style.width = `${Math.max(0,boss.hp/boss.maxHp*100)}%`; $('bossPhase').textContent = boss.enraged ? 'JETZT IST ER SAUER' : 'DER NUSS-DIKTATOR'; }
  }
  function burst(x, y, color, count = 10, speed = 100) {
    for (let i=0;i<count;i++) {
      const a=rnd(0,TAU), v=rnd(speed*.2,speed), life=rnd(.22,.65);
      particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life,maxLife:life,r:rnd(2,5),color});
    }
    if (particles.length > 650) particles.splice(0,particles.length-650);
  }
  function floater(x,y,text,color='#dcf2bf') { floaters.push({x,y,text,color,life:1}); }
  function damageEnemy(e, amount, blast = false) {
    if (e.dead) return;
    e.hp -= amount; e.hit = .1;
    burst(e.x,e.y, e.type === 'boss' ? '#ffa977' : '#cad8b7', blast ? 12 : 4, 110);
    if (e.hp > 0) return;
    e.dead = true; kills++; score += e.points;
    burst(e.x,e.y, e.type === 'boss' ? '#c7f36b' : '#91ba70', e.type==='boss'?85:16,180);
    floater(e.x,e.y-22,`+${e.points}`);
    if (e.type === 'boss') { finish(true); return; }
    pickups.push({x:e.x,y:e.y,type:Math.random()<.095?'heart':'nut',life:16,phase:rnd(0,TAU)});
    if (Math.random()<.12) tone(400,.055,'triangle',.02,700);
  }
  function hurtPlayer(damage = 1) {
    if (player.invuln > 0 || mode !== 'playing') return;
    player.hp = Math.max(0,player.hp-damage); player.invuln = 1.3; shake = reducedMotion ? 0 : 7;
    burst(player.x,player.y,'#ff9d71',18,180); floater(player.x,player.y-36,`−${damage} ♥`,'#ff9d71');
    tone(150,.22,'sawtooth',.07,50); updateHud();
    if (player.hp <= 0) finish(false);
  }
  function fire() {
    let target = null, closest = 740;
    const candidates = boss && !boss.dead ? [...enemies,boss] : enemies;
    for (const e of candidates) { const d=dist(player,e); if (!e.dead && d<closest) { closest=d; target=e; } }
    if (!target) return false;
    player.angle = Math.atan2(target.y-player.y,target.x-player.x);
    const angles = player.spread ? [-.16,0,.16] : [0];
    for (const offset of angles) {
      const a=player.angle+offset;
      bullets.push({x:player.x+Math.cos(a)*22,y:player.y+Math.sin(a)*22,vx:Math.cos(a)*690,vy:Math.sin(a)*690,life:1.2,damage:player.damage,pierce:player.pierce,hitIds:new Set(),r:6,a});
    }
    tone(rnd(660,800),.04,'triangle',.035,280);
    return true;
  }
  function enemyShot(x,y,a,speed=155) { enemyBullets.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,a,r:7,life:8}); }
  function updateBoss(dt) {
    if (!boss || boss.dead) return;
    boss.phase += dt * 4; boss.hit = Math.max(0,boss.hit-dt);
    if (boss.hp < boss.maxHp * .45 && !boss.enraged) { boss.enraged=true; boss.speed=64; announce('OH OH.', 'HASENBEIN DREHT DURCH'); }
    const dx=player.x-boss.x,dy=player.y-boss.y,d=Math.hypot(dx,dy)||1;
    if(d>110) { boss.x += dx/d*boss.speed*dt; boss.y += dy/d*boss.speed*dt; }
    boss.x=clamp(boss.x,55,W-55);boss.y=clamp(boss.y,140,H-60);
    boss.actionCd-=dt;boss.summonCd-=dt;
    if (boss.actionCd <= 0) {
      boss.attack++;
      if (boss.attack % 2 === 1) {
        const count=boss.enraged?14:10, offset=Math.atan2(dy,dx);
        for(let i=0;i<count;i++) enemyShot(boss.x,boss.y,offset+TAU*i/count,boss.enraged?185:150);
        burst(boss.x,boss.y,'#ff9b67',15,100); tone(120,.17,'square',.04,80);
      } else {
        hazards.push({x:player.x,y:player.y,r:boss.enraged?128:106,wait:1.3,life:.35,hit:false});
        if(boss.enraged) hazards.push({x:clamp(player.x+rnd(-190,190),65,W-65),y:clamp(player.y+rnd(-150,150),140,H-55),r:110,wait:1.7,life:.35,hit:false});
        tone(520,.1,'sine',.07,380);
      }
      boss.actionCd=boss.enraged?1.6:2.2;
    }
    if (boss.summonCd <= 0 && enemies.length < 12) { for(let i=0;i<3;i++) spawnEnemy(i===2?'runner':'bunny'); boss.summonCd=boss.enraged?7:10; }
    if(d < player.r + boss.r) hurtPlayer(2);
  }
  function update(dt) {
    runTime+=dt; waveTime+=dt; music(dt);
    player.invuln=Math.max(0,player.invuln-dt); player.dashCd=Math.max(0,player.dashCd-dt);
    let mx=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+touch.x;
    let my=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+touch.y;
    const mag=Math.hypot(mx,my); if(mag>1){mx/=mag;my/=mag;}
    player.moving=mag>.08;
    if(Math.abs(mx)>.05)player.face=mx>0?1:-1;
    if(player.dashTime>0) {
      player.dashTime-=dt; player.x+=player.dashX*820*dt; player.y+=player.dashY*820*dt;
      if(!reducedMotion)player.trail.push({x:player.x,y:player.y,life:.22});
    } else { player.x+=mx*player.speed*dt;player.y+=my*player.speed*dt; }
    player.x=clamp(player.x,42,W-42);player.y=clamp(player.y,106,H-48);
    player.trail=player.trail.filter(p=>(p.life-=dt)>0);
    shotTimer-=dt;
    if(shotTimer<=0){if(fire())shotTimer=player.fireRate;else shotTimer=.07;}
    if (!boss && waveTime < waveLengths[wave]) {
      spawnTimer-=dt;
      if(spawnTimer<=0){
        const roll=Math.random();let type='bunny';
        if(wave>0&&roll<.18)type='gunner';else if(wave>0&&roll<.31)type='brute';else if(waveTime>9&&roll<.62)type='runner';
        spawnEnemy(type); if(wave===2&&Math.random()<.5)spawnEnemy('bunny');
        spawnTimer=Math.max(.36,.97-wave*.18-waveTime*.01);
      }
    }
    for(const e of enemies){
      if(e.dead)continue;
      e.phase+=dt*(e.type==='runner'?12:7);e.hit=Math.max(0,e.hit-dt);e.fireCd-=dt;
      const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;
      const desired=e.type==='gunner'?280:0;
      if(d>desired || (e.type==='gunner'&&d<170)) {
        const dir=e.type==='gunner'&&d<170?-1:1;
        e.x+=dx/d*e.speed*dt*dir;e.y+=dy/d*e.speed*dt*dir;
      }
      if(e.type==='gunner'&&e.fireCd<=0&&d<650){enemyShot(e.x,e.y,Math.atan2(dy,dx),150);e.fireCd=2.5;}
      if(d<e.r+player.r-3)hurtPlayer(e.type==='brute'?2:1);
      if(mode!=='playing')return;
    }
    // A small separation force keeps the rabbit horde readable.
    for(let i=0;i<enemies.length;i++)for(let j=i+1;j<enemies.length;j++){
      const a=enemies[i],b=enemies[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=(a.r+b.r)*.82;
      if(d>0&&d<min){const force=(min-d)*dt*2;a.x-=dx/d*force;a.y-=dy/d*force;b.x+=dx/d*force;b.y+=dy/d*force;}
    }
    updateBoss(dt); if(mode!=='playing')return;
    for(const b of bullets){
      const oldX=b.x,oldY=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
      const all=boss&&!boss.dead?[...enemies,boss]:enemies;
      for(const e of all){
        if(e.dead||b.hitIds.has(e))continue;
        const dx=b.x-oldX,dy=b.y-oldY,l2=dx*dx+dy*dy;
        const t=l2?clamp(((e.x-oldX)*dx+(e.y-oldY)*dy)/l2,0,1):0;
        if(Math.hypot(oldX+dx*t-e.x,oldY+dy*t-e.y)<e.r+b.r){
          b.hitIds.add(e); damageEnemy(e,b.damage);
          if(mode!=='playing')return;
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
        if(!h.hit){h.hit=true;shake=reducedMotion?0:9;burst(h.x,h.y,'#ffa65e',35,260);tone(90,.25,'sawtooth',.06,30);}
        if(dist(player,h)<h.r+player.r*.5)hurtPlayer(2);
      }
      if(mode!=='playing')return;
    }
    hazards=hazards.filter(h=>h.wait>0||h.life>0);
    for(const p of pickups){
      p.life-=dt;p.phase+=dt*3;const d=dist(player,p);
      if(d<player.magnet&&d>1){p.x+=(player.x-p.x)/d*310*dt;p.y+=(player.y-p.y)/d*310*dt;}
      if(d<25){p.life=0;if(p.type==='heart'){player.hp=Math.min(player.maxHp,player.hp+1);floater(player.x,player.y-35,'+1 ♥','#c7f36b');tone(700,.13,'sine',.055,1050);}else{score+=20;tone(1000,.045,'sine',.022,1400);}}
    }
    pickups=pickups.filter(p=>p.life>0);enemies=enemies.filter(e=>!e.dead);
    if(!boss&&waveTime>=waveLengths[wave]&&enemies.length===0){if(wave<2)upgradeScreen();else spawnBoss();}
    uiTimer-=dt;if(uiTimer<=0){updateHud();uiTimer=.1;}
  }

  // Game-native canvas art: a moonlit clearing with a warm little hero.
  let seed=74319;const sr=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  const ground=document.createElement('canvas');ground.width=W;ground.height=H;const g=ground.getContext('2d');
  function ellipse(c,x,y,rx,ry,color,rotation=0){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,rotation,0,TAU);c.fill();}
  function path(c,points,color){c.fillStyle=color;c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fill();}
  function makeGround(){
    const grad=g.createRadialGradient(640,350,70,640,350,780);grad.addColorStop(0,'#344a32');grad.addColorStop(.57,'#253e2f');grad.addColorStop(1,'#102820');g.fillStyle=grad;g.fillRect(0,0,W,H);
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
      ellipse(g,x+5,y+9,30,17,'#061b1b66');ellipse(g,x,y,25,19,'#183b2b');ellipse(g,x-4,y-5,19,15,'#214833');ellipse(g,x-10,y-8,8,6,'#375f3b');
    }
    for(let i=0;i<14;i++){
      const x=sr()*W,y=sr()>.5?sr()*17:703+sr()*17;
      ellipse(g,x,y,55,23,'#091f1b');ellipse(g,x-10,y-7,44,21,'#143d2a');ellipse(g,x-20,y-11,18,10,'#245037');
    }
  }
  makeGround();
  const fireflies=Array.from({length:25},()=>({x:sr()*W,y:sr()*H,phase:sr()*TAU}));

  function drawHamster(p, alpha=1){
    const c=ctx,bob=p.moving?Math.sin(ambientTime*17)*2:Math.sin(ambientTime*3)*.7;
    c.save();c.translate(p.x,p.y);c.globalAlpha=alpha;
    ellipse(c,0,13,23,8,'#051b176b');
    if(p.invuln>0&&Math.floor(ambientTime*14)%2===0&&p.dashTime<=0)c.globalAlpha=alpha*.6;
    if(p.dashTime>0){c.strokeStyle='#d8ff96';c.lineWidth=2;c.beginPath();c.arc(0,0,29,0,TAU);c.stroke();}
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
    const c=ctx, isBoss=e.type==='boss', factor=isBoss?2.4:e.type==='brute'?1.4:e.type==='runner'?.83:1;
    const bob=Math.sin(e.phase)*2.5, face=player&&player.x<e.x?-1:1;
    c.save();c.translate(e.x,e.y);ellipse(c,0,12*factor,21*factor,7*factor,'#051b1877');c.scale(factor*face,factor);c.translate(0,bob);
    const fur=e.hit>0?'#ffffff':e.type==='runner'?'#c0bfb0':e.type==='gunner'?'#91ada0':'#d6d7bc';
    const dark=e.hit>0?'#efffcf':'#8e9f8c';
    ellipse(c,-9,13,8,5,dark);ellipse(c,10,13,8,5,dark);ellipse(c,0,2,18,19,dark);ellipse(c,-1,-1,17,18,fur);
    ellipse(c,-9,-25,5,16,fur,-.18);ellipse(c,9,-27,5,18,fur,.14);ellipse(c,-9,-25,2,11,'#b98f7c',-.18);ellipse(c,9,-27,2,12,'#b98f7c',.14);
    ellipse(c,1,-8,16,14,fur);ellipse(c,7,-2,10,7,'#eaead0');
    if(isBoss){
      path(c,[[-17,2],[-3,7],[-4,15],[-17,12]],'#354a47');c.fillStyle='#667772';c.fillRect(-12,8,5,10);c.fillStyle='#a4b49b';c.fillRect(-12,10,5,3);
      path(c,[[5,-19],[16,-13],[16,-3],[8,-4]],'#263e39');ellipse(c,10,-10,5,5,'#fa684b');ellipse(c,10,-10,2,2,'#ffe3a3');
      path(c,[[-12,-16],[-2,-19],[2,-12],[-10,-10]],'#435549');c.fillStyle='#da7d40';c.fillRect(-6,-20,5,4);
      c.fillStyle='#e9e3b7';c.fillRect(4,2,3,6);c.fillRect(8,2,3,6);
      c.strokeStyle='#9aa999';c.lineWidth=3;c.beginPath();c.moveTo(13,6);c.lineTo(22,11);c.lineTo(20,19);c.stroke();
    } else {
      ellipse(c,-5,-10,2.5,3,'#c54e38');ellipse(c,9,-10,2.5,3,'#c54e38');
      c.strokeStyle='#475641';c.lineWidth=2;c.beginPath();c.moveTo(-9,-14);c.lineTo(-2,-12);c.moveTo(6,-12);c.lineTo(13,-14);c.stroke();
      if(e.type==='brute'){path(c,[[-20,-10],[-18,-21],[10,-24],[20,-17],[20,-10]],'#536550');c.fillStyle='#85906a';c.fillRect(-18,-12,37,4);}
      if(e.type==='gunner'){c.fillStyle='#436047';c.fillRect(-15,-21,29,10);c.fillStyle='#627e55';c.fillRect(-19,-13,39,5);path(c,[[10,1],[34,-2],[30,9],[10,9]],'#dd9144');c.fillStyle='#82a34e';c.fillRect(29,-1,9,4);}
      if(e.type==='runner'){path(c,[[-14,-13],[14,-13],[14,-8],[-14,-8]],'#a05c43');ellipse(c,-5,-10,2,2,'#ffe2aa');ellipse(c,9,-10,2,2,'#ffe2aa');}
    }
    ellipse(c,7,-3,2.2,1.5,'#866e5b');c.restore();
    if(!isBoss&&e.hp<e.maxHp){c.fillStyle='#0b1b16';c.fillRect(e.x-18,e.y-50*factor,36,4);c.fillStyle='#c4e087';c.fillRect(e.x-18,e.y-50*factor,36*e.hp/e.maxHp,4);}
  }
  function drawPickup(p){
    const c=ctx,y=p.y+Math.sin(p.phase)*3;c.save();c.translate(p.x,y);c.globalAlpha=p.life<3?.5+Math.sin(ambientTime*12)*.4:1;
    ellipse(c,0,6,10,4,'#0a251955');
    if(p.type==='heart'){
      c.shadowBlur=12;c.shadowColor='#b9f886';c.fillStyle='#c7f36b';c.beginPath();c.moveTo(0,7);c.bezierCurveTo(-18,-3,-6,-16,0,-6);c.bezierCurveTo(6,-16,18,-3,0,7);c.fill();
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
    if(mode==='menu'||mode==='help')return;
    for(const h of hazards){
      ctx.save();ctx.translate(h.x,h.y);ctx.strokeStyle='#ff9b65';ctx.lineWidth=3;ctx.fillStyle=h.wait>0?'#ed713524':'#ffb46677';ctx.beginPath();ctx.arc(0,0,h.r,0,TAU);ctx.fill();ctx.stroke();
      if(h.wait>0){ctx.setLineDash([7,7]);ctx.beginPath();ctx.arc(0,0,h.r*(1-clamp(h.wait/1.3,0,1)),0,TAU);ctx.stroke();ctx.font='bold 30px Arial';ctx.fillStyle='#ffb66d';ctx.textAlign='center';ctx.fillText('!',0,11);}ctx.restore();
    }
    for(const p of pickups)drawPickup(p);
    for(const t of player.trail)drawHamster({...player,x:t.x,y:t.y},t.life*.9);
    const actors=[...enemies.filter(e=>!e.dead),...(boss&&!boss.dead?[boss]:[]),{...player,isPlayer:true}].sort((a,b)=>a.y-b.y);
    for(const a of actors){if(a.isPlayer)drawHamster(player);else drawRabbit(a);}
    for(const b of bullets){
      ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.a);ctx.fillStyle='#c7f36b44';ctx.fillRect(-23,-3,24,6);ellipse(ctx,0,0,8,4,'#f0dc8f');ellipse(ctx,3,0,5,4,'#e7f9ad');ctx.restore();
    }
    for(const b of enemyBullets){
      ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.a);path(ctx,[[10,0],[-7,-5],[-7,5]],'#ffab64');ctx.fillStyle='#77a654';ctx.fillRect(-12,-4,6,3);ctx.fillRect(-12,2,6,3);ctx.restore();
    }
    for(const p of particles){
      ctx.globalAlpha=clamp(p.life/p.maxLife,0,1);
      if(p.type==='ring'){ctx.strokeStyle=p.color;ctx.lineWidth=8*(p.life/p.maxLife);ctx.beginPath();ctx.arc(p.x,p.y,360*(1-p.life/p.maxLife),0,TAU);ctx.stroke();}
      else ellipse(ctx,p.x,p.y,p.r,p.r*.8,p.color);
    }ctx.globalAlpha=1;
    for(const f of floaters){ctx.globalAlpha=Math.min(1,f.life*2);ctx.font='bold 16px Barlow, Arial';ctx.textAlign='center';ctx.fillStyle='#102519';ctx.fillText(f.text,f.x+1,f.y+1);ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y);}ctx.globalAlpha=1;
    if(bombFlash>0){ctx.fillStyle=`rgba(220,255,150,${bombFlash*.25})`;ctx.fillRect(0,0,W,H);}
    // Keep the HUD visually separate without concealing the arena.
    const top=ctx.createLinearGradient(0,0,0,125);top.addColorStop(0,'#071911dc');top.addColorStop(1,'#07191100');ctx.fillStyle=top;ctx.fillRect(0,0,W,125);
    const bottom=ctx.createLinearGradient(0,H-85,0,H);bottom.addColorStop(0,'#07191100');bottom.addColorStop(1,'#071911af');ctx.fillStyle=bottom;ctx.fillRect(0,H-85,W,85);
  }
  function frame(now){
    const dt=Math.min((now-lastFrame)/1000||0,.04);lastFrame=now;
    if(mode==='playing'){
      ambientTime+=dt; update(dt);shake=Math.max(0,shake-dt*22);bombFlash=Math.max(0,bombFlash-dt);
      for(const p of particles){p.life-=dt;p.x+=(p.vx||0)*dt;p.y+=(p.vy||0)*dt;p.vx*=.97;p.vy*=.97;}
      particles=particles.filter(p=>p.life>0);for(const f of floaters){f.life-=dt;f.y-=dt*30;}floaters=floaters.filter(f=>f.life>0);
    } else if(mode==='menu'||mode==='help')ambientTime+=dt;
    render(dt);requestAnimationFrame(frame);
  }

  $('startButton').onclick=startGame;$('helpButton').onclick=showHelp;$('pauseButton').onclick=pauseGame;$('soundButton').onclick=toggleSound;
  $('fullscreenButton').onclick=async()=>{
    try{if(document.fullscreenElement)await document.exitFullscreen();else if(shell.requestFullscreen)await shell.requestFullscreen();else toast('Vollbild ist in diesem Browser nicht verfügbar.');}
    catch{toast('Vollbild ist in dieser Ansicht nicht verfügbar.');}
  };
  document.addEventListener('fullscreenchange',()=>{resize();$('fullscreenButton').setAttribute('aria-label',document.fullscreenElement?'Vollbild schließen':'Vollbild öffnen');});
  document.addEventListener('keydown',e=>{
    const gameKeys=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyE','KeyP','Escape'];
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
      return;
    }
    if(mode!=='playing')return;
    keys.add(e.code);if(e.code==='Space')useDash();if(e.code==='KeyE')useBomb();
  });
  document.addEventListener('keyup',e=>keys.delete(e.code));
  window.addEventListener('blur',()=>{resetInput();if(mode==='playing')pauseGame();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){resetInput();if(mode==='playing')pauseGame();}});
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
    const result=()=>({state:mode,wave:wave+1,score,health:player?{current:player.hp,max:player.maxHp}:null,bombs:player?.bombs??0,seconds:Math.floor(runTime),bossHealth:boss?Math.max(0,boss.hp):null});
    const registry=[
      {name:'read_game_state',description:'Read the current Snickers 3 game status, score, health and wave.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(input){if(input&&Object.keys(input).length)throw Error('No arguments expected.');return result();}},
      {name:'start_game',description:'Start Snickers 3 from the menu or replay a completed run. Cannot replace an active run.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(input&&Object.keys(input).length)throw Error('No arguments expected.');if(!['menu','won','lost'].includes(mode))throw Error('A game is already active.');startGame();return result();}},
      {name:'set_game_paused',description:'Pause or resume the current Snickers 3 run.',inputSchema:{type:'object',properties:{paused:{type:'boolean'}},required:['paused'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||typeof input.paused!=='boolean'||Object.keys(input).some(k=>k!=='paused'))throw Error('Expected only paused: boolean.');if(!['playing','paused'].includes(mode))throw Error('No active run to pause or resume.');if(input.paused&&mode==='playing')pauseGame();if(!input.paused&&mode==='paused')resumeGame();return result();}}
    ];
    for(const tool of registry){try{Promise.resolve(modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
    window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  }
  requestAnimationFrame(frame);
})();
