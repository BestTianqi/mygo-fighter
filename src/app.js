(function () {
  'use strict';
  const { Match, ROSTER, MOVES, moveList, WORLD, MAX_HEALTH } = window.MygoFighter;
  const assets = window.MYGO_ASSETS;
  const chooseAnimation = window.MygoAnimation.createAnimator();
  const actionFrames = new Map(assets.anonActions.frames.map(frame => [frame.name, frame]));
  const soyoActionFrames = new Map(assets.soyoActions.frames.map(frame => [frame.name, frame]));
  const tomoriActionFrames = new Map(assets.tomoriActions.frames.map(frame => [frame.name, frame]));
  const ranaActionFrames = new Map(assets.characters[3].actionFrames.map(frame => [frame.name, frame]));
  const rikiActionFrames = new Map(assets.characters[4].actionFrames.map(frame => [frame.name, frame]));
  const parfaitActionFrames = new Map(assets.ranaParfaitActions.frames.map(frame => [frame.name, frame]));
  const penguinActionFrames = new Map(assets.penguin.frames.map(frame => [frame.name, frame]));
  const jabActionFrames = assets.jabActions.map(art => new Map(art.frames.map(frame => [frame.name, frame])));
  const $ = id => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d'), stage = $('stage');
  const held = new Set(), touchHeld = new Set(), taps = new Set(), pressIds = new Map(), pressDirections = new Map();
  const { KEYS1: keys1, KEYS2: keys2, schemeFor, bindingList } = window.MygoControls;
  const boundKeys = new Set([...Object.values(keys1), ...Object.values(keys2)]);
  const colors = ['#f6a4c7', '#65d1ee'];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let arena = 0, battleArena = 0, loaded = false, inMenu = true;
  let match = new Match({ characters: [0, 1], terrain: assets.stages[arena].terrain });
  const camera = new MygoCamera.Camera();
  let cameraFighter;
  let lastTime = 0, visualTime = 0, shake = 0, flash = 0, fightBanner = 0;
  let lastUiPhase = '', soundEnabled = false, audioContext;
  let voicePlayer, voiceLoading;
  const soyoCutins = [0, 1].map(side => {
    const panel = $('soyo-cutin-' + side), video = panel.querySelector('video');
    video.src = assets.soyoSuperVideo;
    return { panel, video, active: false };
  });
  let fx = [], impactMotion = null, inkMs = 0, inkMax = 200, noiseBuffer;
  const dialogState = new Map();
  let atlases, backgrounds, normalAtlas, dragonAtlas, actionAtlas, tensoraAtlas, soyoActionAtlas, penguinAtlas;
  let parfaitActionAtlas, parfaitImage;
  let jabAtlases;

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = async () => { try { await im.decode(); resolve(im); } catch (error) { reject(error); } };
      im.onerror = reject; im.src = src;
    });
  }
  function input(map) {
    return { unified: true, ...Object.fromEntries(Object.entries(map).map(([action, key]) => [action, held.has(key) || touchHeld.has(key) || taps.has(key)])), touchLight: touchHeld.has(map.light),
      pressIds: Object.fromEntries(Object.entries(map).map(([action, key]) => [action, pressIds.get(key) || 0])),
      pressDirections: Object.fromEntries(Object.entries(map).filter(([, key]) => taps.has(key)).map(([action, key]) => [action, pressDirections.get(key)])) };
  }
  function recordPress(key) {
    taps.add(key); pressIds.set(key, (pressIds.get(key) || 0) + 1);
    const map = Object.values(keys2).includes(key) ? keys2 : keys1;
    pressDirections.set(key, Object.fromEntries(['left', 'right', 'crouch', 'jump'].map(action => [action, held.has(map[action]) || touchHeld.has(map[action])])));
  }
  function warmCharacterArt(characters) {
    const groups = new Map();
    for (const character of characters) {
      const base = assets.characters[character]; groups.set(atlases[character], base.frames[0]);
      if (character < 3) groups.set(jabAtlases[character], assets.jabActions[character].frames[0]);
      if (character === 0) for (const [atlas, art] of [[actionAtlas, assets.anonActions], [normalAtlas, assets.anonNormals], [dragonAtlas, assets.milkDragon]]) groups.set(atlas, art.frames[0]);
      if (character === 1) for (const [atlas, art] of [[soyoActionAtlas, assets.soyoActions], [tensoraAtlas, assets.soyoTensora]]) groups.set(atlas, art.frames[0]);
      if (character === 2) groups.set(penguinAtlas, assets.penguin.frames[0]);
      if (character === 3) groups.set(parfaitActionAtlas, assets.ranaParfaitActions.frames[0]);
    }
    for (const [atlas, f] of groups) {
      ctx.save(); ctx.globalAlpha = .001;
      const scale = (f.height || 235) / f.h * .574 * canvas.width / 960;
      ctx.drawImage(atlas, f.x, f.y, f.w, f.h, 0, 0, f.w * scale, f.h * scale); ctx.restore();
    }
  }
  function clearInput() {
    held.clear(); touchHeld.clear(); taps.clear(); pressDirections.clear(); match.release();
    document.querySelectorAll('.touch-controls .held').forEach(el => el.classList.remove('held'));
  }
  function prepareVoices() {
    voiceLoading ||= Promise.all(Object.entries({ ...assets.penguinVoices, ...assets.soyoVoices }).map(async ([move, src]) => {
      const bytes = Uint8Array.from(atob(src.split(',')[1]), c => c.charCodeAt(0));
      return [move, await audioContext.decodeAudioData(bytes.buffer)];
    })).then(entries => {
      voicePlayer = MygoVoice.createVoicePlayer(audioContext, Object.fromEntries(entries));
      voicePlayer.setEnabled(soundEnabled); voicePlayer.setPaused(match.paused);
    });
    return voiceLoading;
  }
  function stopSoyoCutins(side) {
    for (const [i, cutin] of soyoCutins.entries()) if (side === undefined || side === i) {
      cutin.video.pause(); cutin.video.currentTime = 0; cutin.panel.hidden = true; cutin.active = false;
    }
  }
  function startSoyoCutin(side) {
    const cutin = soyoCutins[side];
    cutin.video.currentTime = 0; cutin.active = true;
    cutin.panel.hidden = match.paused;
    if (!match.paused) cutin.video.play().catch(() => {});
  }
  function syncSoyoCutins() {
    for (const [side, cutin] of soyoCutins.entries()) {
      if (!cutin.active) continue;
      if (match.phase !== 'fighting' || match.fighters[side].attack !== 'soyoSuper') { stopSoyoCutins(side); continue; }
      cutin.panel.hidden = match.paused;
      if (match.paused) cutin.video.pause();
      else if (cutin.video.paused && !cutin.video.ended) cutin.video.play().catch(() => {});
    }
  }
  function tone(kind, side = 0, weight = 1) {
    if (!soundEnabled || !audioContext) return;
    if (voicePlayer?.play(kind, side)) return;
    if (kind.startsWith('riki')) {
      const now = audioContext.currentTime, gain = audioContext.createGain(), drum = audioContext.createOscillator();
      const bass = /Shock|Super|Eight/.test(kind), duration = bass ? .22 : .08;
      drum.type = 'triangle'; drum.frequency.setValueAtTime(bass ? 135 : 470, now);
      drum.frequency.exponentialRampToValueAtTime(bass ? 42 : 150, now + duration);
      gain.gain.setValueAtTime(.0001, now); gain.gain.linearRampToValueAtTime(bass ? .16 : .09, now + .003);
      gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      drum.connect(gain); gain.connect(audioContext.destination); drum.start(now); drum.stop(now + duration);
      return;
    }
    const now = audioContext.currentTime;
    if (kind === 'hit' || kind === 'block' || kind === 'land' || kind === 'landHeavy') {
      if (!noiseBuffer) {
        noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      const source = audioContext.createBufferSource(), filter = audioContext.createBiquadFilter(), gain = audioContext.createGain();
      const landing = kind.startsWith('land'), blocked = kind === 'block', duration = landing ? .14 : .06 + weight * .025;
      source.buffer = noiseBuffer; filter.type = 'lowpass'; filter.frequency.value = landing ? 420 : blocked ? 4800 : 1800 + weight * 600;
      gain.gain.setValueAtTime(landing ? .07 : blocked ? .045 : .09 + weight * .025, now);
      gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      source.connect(filter); filter.connect(gain); gain.connect(audioContext.destination); source.start(now); source.stop(now + duration);
      if (landing) return;
    }
    if (kind.startsWith('rana')) {
      const chord = kind === 'ranaSuper' ? [196, 247, 294, 392] : kind === 'ranaTune' ? [330, 440] : [330, 415, 494];
      chord.forEach((freq, i) => {
        const osc = audioContext.createOscillator(), gain = audioContext.createGain(), t = now + i * .018;
        osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(.0001, t); gain.gain.exponentialRampToValueAtTime(.035, t + .006);
        gain.gain.exponentialRampToValueAtTime(.0001, t + .32);
        osc.connect(gain); gain.connect(audioContext.destination); osc.start(t); osc.stop(t + .33);
      }); return;
    }
    if (kind === 'hit' || kind === 'block') {
      const blocked = kind === 'block', duration = blocked ? .065 : .07 + weight * .025;
      for (const click of [false, true]) {
        const osc = audioContext.createOscillator(), gain = audioContext.createGain();
        osc.type = blocked || click ? 'sine' : 'triangle';
        const pitch = blocked ? (click ? 2100 : 1150) : click ? 1300 + weight * 180 : 160 - weight * 32;
        osc.frequency.setValueAtTime(pitch, now);
        osc.frequency.exponentialRampToValueAtTime(blocked ? pitch * .7 : click ? 300 : 35, now + duration);
        gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(click ? .025 : .07 + weight * .015, now + .003);
        gain.gain.exponentialRampToValueAtTime(.0001, now + (click ? .025 : duration));
        osc.connect(gain); gain.connect(audioContext.destination); osc.start(now); osc.stop(now + duration + .01);
      }
      return;
    }
    if (kind === 'sonic') {
      for (let i = 0; i < 3; i++) {
        const osc = audioContext.createOscillator(), gain = audioContext.createGain(), start = now + i * .09;
        osc.type = i === 1 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime([660, 480, 330][i], start);
        osc.frequency.exponentialRampToValueAtTime([380, 260, 140][i], start + .22);
        gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(.045, start + .015);
        gain.gain.exponentialRampToValueAtTime(.0001, start + .25);
        osc.connect(gain); gain.connect(audioContext.destination); osc.start(start); osc.stop(start + .26);
      }
      return;
    }
    const osc = audioContext.createOscillator(), gain = audioContext.createGain();
    const freq = { penguinTransform: 740, penguinKick: 180, penguinCry: 440, penguinHey: 880, penguinLaugh: 620, penguinCall: 330, tomoriNote: 523, tomoriEcho: 659, tomoriChorus: 784, heal: 880, light: 280, heavy: 140, special: 540, wave: 680, summon: 740, super: 90, rising: 800, spin: 420, thrust: 740, rush: 250, dive: 820, shield: 430, shieldHit: 1180, hit: 100, block: 900, fight: 660, result: 440, throw: 190 }[kind] || 360;
    osc.type = ['hit', 'heavy', 'throw'].includes(kind) ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq + side * 20, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(45, freq * .45), now + .12);
    gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.075, now + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .16);
    osc.connect(gain); gain.connect(audioContext.destination); osc.start(now); osc.stop(now + .17);
  }
  function showBattle() {
    inMenu = false; $('main-menu').hidden = true;
    $('battle-screen').hidden = false; $('battle-screen').inert = false;
    document.body.classList.remove('menu-open');
  }
  function renderMainMenu() {
    $('menu-selection').textContent = selectedCharacters().map(c => ROSTER[c].name).join(' × ');
    $('menu-stage').textContent = assets.stages[arena].name;
    if (!backgrounds || !atlases) return;
    const menuCanvas = $('menu-art'), painter = menuCanvas.getContext('2d');
    painter.clearRect(0, 0, 1440, 860);
    painter.drawImage(backgrounds[arena], 0, 0, 1440, 860);
    painter.fillStyle = '#0813247a'; painter.fillRect(0, 0, 1440, 860);
    const lineup = [
      { character: 1, x: 735, y: 765, height: 475 },
      { character: 4, x: 1250, y: 765, height: 485 },
      { character: 3, x: 1105, y: 785, height: 460 },
      { character: 2, x: 925, y: 780, height: 465 },
      { character: 0, x: 840, y: 815, height: 500 },
    ];
    for (const person of lineup) {
      const art = assets.characters[person.character], frame = art.frames[0], scale = person.height / frame.h;
      painter.save(); painter.shadowColor = '#090d21'; painter.shadowBlur = 18;
      painter.drawImage(atlases[person.character], frame.x, frame.y, frame.w, frame.h,
        person.x - frame.ax * scale, person.y - frame.ay * scale, frame.w * scale, frame.h * scale);
      painter.restore();
    }
  }
  function returnToMenu() {
    pause(true); clearInput(); inMenu = true;
    $('battle-screen').hidden = true; $('battle-screen').inert = true;
    $('main-menu').hidden = false; document.body.classList.add('menu-open');
    $('menu-resume').hidden = match.phase === 'idle';
    $('main-menu').classList.toggle('has-match', match.phase !== 'idle');
    $('menu-resume').textContent = ['roundOver', 'finished'].includes(match.phase) ? '返回对战结果 ↗' : '继续对战 ↗';
    renderMainMenu();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    ($('menu-resume').hidden ? $('menu-start') : $('menu-resume')).focus({ preventScroll: true });
    $('main-menu').scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  function beginMode(mode) { $('mode').value = mode; start(); }
  $('menu-start').addEventListener('click', () => beginMode('cpu'));
  $('menu-duel').addEventListener('click', () => beginMode('duel'));
  $('menu-practice').addEventListener('click', () => beginMode('practice'));
  $('menu-settings').addEventListener('click', () => showDialog('settings-dialog'));
  $('menu-help').addEventListener('click', () => {
    const character = Number($('player-character').value);
    $('help-player-name').textContent = '1P / ' + ROSTER[character].name;
    $('help-skills').innerHTML = skillTable({ character });
    showDialog('help-dialog');
  });
  $('menu-resume').addEventListener('click', () => { showBattle(); updateCharacterInfo(); pause(false); });
  $('home').addEventListener('click', returnToMenu);
  function start() {
    if (!loaded) return;
    showBattle();
    battleArena = arena;
    warmCharacterArt(selectedCharacters());
    voicePlayer?.stop(); voicePlayer?.setPaused(false);
    stopSoyoCutins();
    match = new Match({ mode: $('mode').value, dummy: $('dummy').value, difficulty: Number($('difficulty').value), characters: selectedCharacters(), terrain: selectedTerrain(), seed: Date.now() >>> 0 });
    match.start(); clearInput(); fx = []; shake = flash = inkMs = 0; impactMotion = null; lastUiPhase = '';
    $('setup-note').hidden = true;
    $('start').textContent = '重新开始';
    $('last-move').textContent = '';
    $('settings-dialog').close();
    updateMode(); updateCharacterInfo(); stage.focus({ preventScroll: true });
    if (matchMedia('(max-width: 850px)').matches) stage.scrollIntoView({ block: 'start', behavior: 'instant' });
    if (soundEnabled && audioContext) audioContext.resume();
  }
  function action() {
    if (!loaded) return;
    if (match.paused) pause(false);
    else if (match.phase === 'roundOver') {
      if (match.nextRound()) { voicePlayer?.stop(); stopSoyoCutins(); clearInput(); fx = []; lastUiPhase = ''; stage.focus({ preventScroll: true }); }
    } else start();
  }
  function pause(value = !match.paused) {
    if (!loaded || match.phase === 'idle' || (!value && inMenu)) return;
    match.setPaused(value); clearInput(); lastUiPhase = '';
    voicePlayer?.setPaused(value);
    syncSoyoCutins();
    if (!value) stage.focus({ preventScroll: true });
  }
  function updateMode() {
    const duel = match.options.mode === 'duel', practice = match.options.mode === 'practice';
    $('p2-tag').textContent = duel ? '2P' : practice ? '木桩' : 'CPU'; $('meter-p2-label').textContent = $('p2-tag').textContent;
    $('difficulty').disabled = $('mode').value !== 'cpu';
    $('practice-settings').hidden = $('mode').value !== 'practice';
  }
  function selectedCharacters() { return [Number($('player-character').value), Number($('opponent-character').value)]; }
  function selectedTerrain() { return $('terrain-enabled').checked ? assets.stages[arena].terrain : null; }
  function updateCharacterInfo() {
    match.fighters.forEach((f, side) => {
      const profile = ROSTER[f.character];
      $('name' + (side + 1)).textContent = profile.name + (f.penguin ? ' · 凑企鹅' : '');
    });
    const player = match.fighters[0], scheme = schemeFor(player);
    $('help-player-name').textContent = '1P / ' + ROSTER[player.character].name;
    for (const [i, key] of ['KeyU', 'KeyI', 'KeyO'].entries()) document.querySelector('[data-key="' + key + '"]').textContent = ['U', 'I', 'O'][i] + ' ' + MOVES[scheme.base[i]].name;
    document.querySelector('[data-key="KeyH"]').hidden = !scheme.transform;
    document.querySelector('[data-key="KeyH"]').disabled = !!player.penguin;
    document.querySelector('[data-key="KeyH"]').textContent = 'H 凑企鹅';
    document.querySelector('[data-key="KeyP"]').hidden = !scheme.super;
    document.querySelector('[data-key="KeyP"]').textContent = 'P ' + (scheme.super ? MOVES[scheme.super].name : '大招');
    $('help-skills').innerHTML = skillTable(player);
    canvas.setAttribute('aria-label', match.fighters.map(f => ROSTER[f.character].name).join(' 对战 '));
  }
  function markSetup() {
    $('difficulty').disabled = $('mode').value !== 'cpu';
    $('practice-settings').hidden = $('mode').value !== 'practice';
    if (match.phase === 'idle') {
      match = new Match({ mode: $('mode').value, characters: selectedCharacters(), terrain: selectedTerrain() });
      updateMode(); updateCharacterInfo();
    } else {
      $('setup-note').hidden = false;
      $('start').textContent = '应用并重开';
    }
    if (inMenu) renderMainMenu();
  }
  $('start').addEventListener('click', start);
  $('overlay-action').addEventListener('click', action);
  $('pause').addEventListener('click', () => pause());
  $('restart').addEventListener('click', start);
  $('mode').addEventListener('change', markSetup);
  $('difficulty').addEventListener('change', markSetup);
  $('dummy').addEventListener('change', () => {
    if (match.options.mode === 'practice' && $('mode').value === 'practice') match.options.dummy = $('dummy').value;
    else markSetup();
  });
  $('super-demo').addEventListener('click', () => {
    $('mode').value = 'practice'; start();
  });
  $('player-character').addEventListener('change', markSetup);
  $('opponent-character').addEventListener('change', markSetup);
  $('terrain-enabled').addEventListener('change', () => {
    if (!inMenu) { battleArena = arena; match.setTerrain(selectedTerrain()); }
    else if (match.phase !== 'idle') $('setup-note').hidden = false;
  });
  function renderStageChoices() {
    const fragment = document.createDocumentFragment();
    assets.stages.forEach((scene, index) => {
      const button = document.createElement('button'), image = document.createElement('img'), label = document.createElement('span');
      button.type = 'button'; button.className = 'stage-choice'; button.dataset.stage = index;
      button.classList.toggle('selected', index === arena);
      button.setAttribute('aria-pressed', String(index === arena));
      image.src = scene.thumbnail; image.alt = ''; image.width = 320; image.height = 180;
      label.textContent = scene.name; button.append(image, label); fragment.append(button);
    });
    $('stage-choices').replaceChildren(fragment);
  }
  $('stage-choices').addEventListener('click', event => {
    const button = event.target.closest('[data-stage]');
    if (!button) return;
    arena = Number(button.dataset.stage);
    if (!inMenu) { battleArena = arena; match.setTerrain(selectedTerrain()); }
    else if (match.phase !== 'idle') $('setup-note').hidden = false;
    document.querySelectorAll('[data-stage]').forEach(b => {
      const selected = b === button; b.classList.toggle('selected', selected); b.setAttribute('aria-pressed', String(selected));
    });
    if (inMenu) renderMainMenu();
  });
  $('sound').addEventListener('click', async () => {
    soundEnabled = !soundEnabled;
    if (soundEnabled) {
      try { audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); await audioContext.resume(); await prepareVoices(); tone('fight'); }
      catch { soundEnabled = false; }
    }
    voicePlayer?.setEnabled(soundEnabled);
    $('sound').setAttribute('aria-pressed', String(soundEnabled));
    $('sound').setAttribute('aria-label', soundEnabled ? '关闭音效' : '开启音效');
    $('sound').innerHTML = '♪ <span>' + (soundEnabled ? '音效开' : '音效关') + '</span>';
  });
  $('fullscreen').addEventListener('click', async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await stage.requestFullscreen(); }
    catch { $('status').textContent = '浏览器暂不支持全屏，可使用 F11。'; }
  });
  function showDialog(id) {
    const dialog = $(id);
    const state = { match, wasRunning: match.phase !== 'idle' && !match.paused };
    dialogState.set(dialog, state);
    if (state.wasRunning) pause(true);
    dialog.showModal();
  }
  for (const name of ['settings', 'help', 'moves']) {
    const dialog = $(name + '-dialog');
    $('close-' + name).addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
      const state = dialogState.get(dialog);
      dialogState.delete(dialog);
      if (state?.wasRunning && state.match === match && !document.querySelector('dialog[open]')) pause(false);
    });
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
  }
  $('settings').addEventListener('click', () => showDialog('settings-dialog'));
  $('help').addEventListener('click', () => showDialog('help-dialog'));
  function skillTable(f) {
    const rows = bindingList(f);
    return '<table><thead><tr><th>招式</th><th>1P</th><th>2P 小键盘</th><th>共鸣</th></tr></thead><tbody>' + rows.map(({ move, key, key2 }) => `<tr><td>${MOVES[move].name}</td><td>${key}</td><td>${key2}</td><td>${MOVES[move].cost || 0}%</td></tr>`).join('') + '</tbody></table>';
  }
  function showMoves() {
    const f = match.fighters[0];
    $('moves-title').textContent = ROSTER[f.character].name + (f.penguin ? ' · 凑企鹅' : '') + ' · 招式表';
    $('moves-intro').textContent = 'J 攻击（三段连按） · K 重击或腿击 · L 瞬移；2P 对应小键盘1 / 2 / 3。站立、蹲下和空中各有对应攻击动作。';
    $('moves-content').innerHTML = skillTable(f);
    showDialog('moves-dialog');
  }
  $('moves').addEventListener('click', showMoves);

  window.addEventListener('keydown', e => {
    if (inMenu || document.querySelector('dialog[open]')) return;
    if (e.target.closest('select,input,textarea')) return;
    if (e.code === 'F1') { e.preventDefault(); if (!e.repeat) showMoves(); return; }
    if (boundKeys.has(e.code)) {
      e.preventDefault();
      if (match.phase === 'fighting' && !match.paused) { held.add(e.code); if (!e.repeat) recordPress(e.code); }
      return;
    }
    if ((e.code === 'Space' || e.code === 'Enter') && e.target.closest('#pause,#restart,#overlay-action')) e.preventDefault();
    if (e.code === 'Space' && e.target === stage) e.preventDefault();
  });
  window.addEventListener('keyup', e => held.delete(e.code));
  window.addEventListener('blur', () => { clearInput(); if (match.phase === 'ready' || match.phase === 'fighting') pause(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && (match.phase === 'ready' || match.phase === 'fighting')) pause(true); });
  stage.addEventListener('pointerdown', e => { if (e.target === canvas) stage.focus({ preventScroll: true }); });
  // Keep touch and keyboard holds separate so releasing one cannot release the other.
  document.querySelectorAll('[data-key]').forEach(button => {
    const release = () => { touchHeld.delete(button.dataset.key); button.classList.remove('held'); };
    button.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (match.phase !== 'fighting' || match.paused) return;
      button.setPointerCapture(e.pointerId); touchHeld.add(button.dataset.key); recordPress(button.dataset.key); button.classList.add('held');
    });
    button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
    button.addEventListener('contextmenu', e => e.preventDefault());
  });

  function consumeEvents() {
    for (const event of match.drainEvents()) {
      if (event.type === 'attack') {
        if (event.attack !== 'penguinTransform') tone(event.attack, event.side);
        if (!event.side) $('last-move').textContent = moveList(match.fighters[0].character, !!match.fighters[0].penguin).find(m => m.key === event.attack)?.name || MOVES[event.attack].name;
        if (event.attack === 'super') { flash = reducedMotion ? 0 : 150; tone('special', event.side); }
        if (event.attack === 'soyoSuper') { startSoyoCutin(event.side); flash = reducedMotion ? 0 : 100; }
      }
      if (event.type === 'fight') { fightBanner = 600; clearInput(); tone('fight'); }
      if (event.type === 'dash' || event.type === 'blink') {
        const f = match.fighters[event.side];
        if (event.type === 'blink') {
          fx = fx.filter(effect => effect.type !== 'blink' || effect.side !== event.side);
          fx.push({ type: 'blink', side: event.side, fromX: event.fromX, fromY: event.fromY,
            toX: f.x, toY: f.y, sprite: fighterSprite(event.side, event.direction),
            life: reducedMotion ? 160 : 260, max: reducedMotion ? 160 : 260,
            travelMs: reducedMotion ? 0 : 90, color: colors[event.side] });
        }
        fx.push({ x: f.x, y: 438 - f.y, life: 160, max: 160, type: 'dash', direction: event.direction, color: colors[event.side] });
      }
      if (event.type === 'landing') {
        fx.push({ x: event.x, y: 438 - event.y, life: event.heavy ? 420 : 240, max: event.heavy ? 420 : 240, type: 'landing', heavy: event.heavy, color: '#d5d4ce' });
        tone(event.heavy ? 'landHeavy' : 'land', event.side);
        if (event.heavy && !reducedMotion) impactMotion = { age: 0, duration: 150, power: 4, direction: 0 };
      }
      if (event.type === 'voicePulse' && match.fighters[event.side].attack !== 'penguinCall') tone(match.fighters[event.side].character === 4 ? 'rikiShock' : match.fighters[event.side].character === 3 ? 'ranaSolo' : ['tomoriNote', 'tomoriEcho', 'tomoriChorus'][event.pulse], event.side);
      if (event.type === 'beat' || event.type === 'beatBoost') {
        const f = match.fighters[event.side];
        if (event.type === 'beatBoost') fx.push({ x: f.x, y: 438 - f.y - 175, life: 450, max: 450, type: 'burst', color: '#ddc9ff', text: '四拍强化' });
        else if (f.attack === 'rikiCalibrate') tone('rikiCalibrate', event.side);
      }
      if (event.type === 'tune') {
        const f = match.fighters[event.side]; tone('ranaTune', event.side);
        fx.push({ x: f.x, y: 438 - f.y - 170, life: 800, max: 800, type: 'burst', color: '#bce9c6', text: '+' + event.amount + ' 共鸣' });
      }
      if (event.type === 'parfaitSplash') {
        tone('shieldHit', event.side);
        fx.push({ x: event.x, y: 438 - event.y, life: 520, max: 520, type: 'parfaitSplash', color: '#b4cf60' });
      }
      if (event.type === 'penguinStart' || event.type === 'penguinEnd') {
        if (event.type === 'penguinEnd') voicePlayer?.stop(event.side);
        updateCharacterInfo(); const f = match.fighters[event.side];
        fx.push({ x: f.x, y: 438 - f.y - 110, life: 650, max: 650, type: 'burst', color: '#fff0c6', text: event.type === 'penguinStart' ? '凑企鹅！' : '恢复原形' });
        tone('penguinTransform', event.side);
      }
      if (event.type === 'penguinCounter') {
        fx.push({ x: event.x, y: 438 - event.y, life: 500, max: 500, type: 'guard', color: '#b6e7ff', text: '糖哭反击' }); tone('block', event.side);
      }
      if (event.type === 'heal') {
        const f = match.fighters[event.side]; tone('heal', event.side);
        fx.push({ x: f.x, y: 438 - f.y - 160, life: 950, max: 950, type: 'burst', color: '#aeefcf', text: '+' + event.amount + ' 生命' });
      }
      if (event.type === 'summon') {
        const f = match.fighters[event.side];
        fx.push({ x: f.x, y: 438 - f.y - 120, life: 650, max: 650, type: 'burst', color: '#ffe0a0', text: '小天素罗 ×3' });
      }
      if (event.type === 'shieldSummon') tone('shield', event.side);
      if (event.type === 'terrainHit') fx.push({ x: event.x, y: 438 - event.y, life: 300, max: 300, type: 'burst', color: '#c4d9e5' });
      if (event.type === 'shieldHit') {
        fx.push({ x: event.x, y: 438 - event.y, life: event.broken ? 600 : 350, max: event.broken ? 600 : 350,
          type: event.broken ? 'steelBreak' : 'burst', color: '#c4e9ff', text: event.broken ? '钢板破碎' : '钢板 −' + event.absorbed });
        tone('shieldHit', event.side);
      }
      if (event.type === 'result') { fx = fx.filter(effect => effect.type !== 'blink'); voicePlayer?.stop(); stopSoyoCutins(); clearInput(); tone('result'); }
      if (event.type === 'hit' || event.type === 'clash') {
        if (event.type === 'hit' && !event.blocked) { voicePlayer?.stop(1 - event.side); stopSoyoCutins(1 - event.side); }
        const color = event.blocked ? '#b1e6ff' : event.type === 'clash' ? '#fff2c4' : colors[event.side];
        const weight = event.weight ?? 1, life = event.blocked ? 220 : 300 + weight * 35;
        fx.push({ x: event.x, y: 438 - event.y, life, max: life, type: event.blocked ? 'guard' : 'impact', weight, direction: match.fighters[event.side ?? 0].facing,
          color, text: event.counter ? 'COUNTER' : event.blocked ? 'GUARD' : event.damage ? '-' + event.damage : '' });
        if (!reducedMotion) {
          const power = event.blocked ? 2 : (2.4 + [1, 1.3, 1.85, 2.8][weight] * 2.2) * 1.5;
          if (!impactMotion || power >= impactMotion.power) impactMotion = { age: 0, duration: event.blocked ? 50 : weight >= 2 ? 200 : 120, power, direction: match.fighters[event.side ?? 0].facing };
          camera.impact({ ...event, weight });
        }
        if (!event.blocked && weight >= 2) { inkMs = inkMax = weight === 3 ? 370 : 200; }
        if (event.attack === 'super') fx.push({ x: event.x, y: 438 - match.fighters[event.side].y, life: 650, max: 650, type: 'shock', color: '#ffa9d2' });
        if (event.attack === 'soyoSuper') fx.push({ x: event.x, y: 438 - match.fighters[event.side].y, life: 650, max: 650, type: 'shock', color: '#ffe3a6' });
        tone(event.blocked ? 'block' : 'hit', event.side, weight);
        if (MOVES[event.attack]?.rikiOnly) tone(event.attack, event.side, weight);
      }
    }
  }
  function drawBackground() {
    const magnification = 1.12 + camera.zoom * .34, width = 960 * magnification, height = 540 * magnification;
    const offsetX = Math.max(-(width - 960) / 2, Math.min((width - 960) / 2, (camera.x - 480) * .13 * camera.zoom));
    const offsetY = Math.max(-(height - 540) / 2, Math.min((height - 540) / 2, (camera.y - 300) * .15 * camera.zoom));
    ctx.drawImage(backgrounds[battleArena], (960 - width) / 2 - offsetX, (540 - height) / 2 - offsetY, width, height);
    const shade = ctx.createLinearGradient(0, 0, 0, 540);
    shade.addColorStop(0, '#071221a0'); shade.addColorStop(.25, '#08142215');
    shade.addColorStop(.7, '#06121d05'); shade.addColorStop(1, '#061322d9');
    ctx.fillStyle = shade; ctx.fillRect(0, 0, 960, 540);
    if (!reducedMotion) {
      for (let i = 0; i < 17; i++) {
        const x = (i * 151 + visualTime * .007) % 960;
        const y = 150 + (i * 59) % 260 + Math.sin(visualTime * .0006 + i) * 12;
        ctx.globalAlpha = .12 + (Math.sin(visualTime * .001 + i) + 1) * .09;
        ctx.fillStyle = i % 2 ? '#97dcec' : '#f6b9cd'; ctx.fillRect(x, y, 1.5, 1.5);
      }
      ctx.globalAlpha = 1;
    }
  }
  function drawTerrain() {
    const terrain = match.options.terrain || { ...assets.stages[battleArena].terrain, platforms: [], hills: [] };
    const [edge, face, dark] = terrain.colors;
    ctx.save();
    // Render the exact height function used by combat, including every ramp.
    {
      const left = WORLD.left - 360, right = WORLD.right + 360, bottom = 438 - WORLD.bottom + 700;
      const gradient = ctx.createLinearGradient(0, 390, 0, 485);
      gradient.addColorStop(0, face); gradient.addColorStop(1, dark);
      ctx.beginPath(); ctx.moveTo(left, 438 - match.floorHeight(left));
      for (let x = left + 4; x <= right; x += 4) ctx.lineTo(x, 438 - match.floorHeight(x));
      ctx.lineTo(right, bottom); ctx.lineTo(left, bottom); ctx.closePath();
      ctx.fillStyle = gradient; ctx.fill();
      ctx.beginPath();
      for (let x = left; x <= right; x += 4) {
        const y = 438 - match.floorHeight(x); if (x === left) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = edge; ctx.lineWidth = 3; ctx.stroke();
      ctx.globalAlpha = .25; ctx.strokeStyle = edge; ctx.lineWidth = 1;
      for (let x = left + 24; x < right; x += 48) {
        const y = 438 - match.floorHeight(x); ctx.beginPath(); ctx.moveTo(x, y + 7); ctx.lineTo(x, y + 100); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    for (const p of terrain.platforms) {
      const top = 438 - p.height, width = p.right - p.left;
      ctx.fillStyle = '#02091650'; ctx.beginPath();
      ctx.ellipse((p.left + p.right) / 2, 442 - match.floorHeight((p.left + p.right) / 2), width * .52, 8, 0, 0, Math.PI * 2); ctx.fill();
      // Supports sit behind the one-way deck; its bright top edge is the landing line.
      for (const x of [p.left + 14, p.right - 22]) {
        const bottom = 438 - match.floorHeight(x);
        ctx.fillStyle = dark; ctx.fillRect(x, top + 15, 8, bottom - top - 15);
        ctx.fillStyle = face; ctx.fillRect(x, top + 15, 2, bottom - top - 15);
      }
      if (terrain.material === 'metal') {
        ctx.strokeStyle = face; ctx.lineWidth = 4; ctx.beginPath();
        ctx.moveTo(p.left + 18, top + 20); ctx.lineTo(p.right - 18, 428 - match.floorHeight(p.right - 18));
        ctx.moveTo(p.right - 18, top + 20); ctx.lineTo(p.left + 18, 428 - match.floorHeight(p.left + 18)); ctx.stroke();
      }
      const slab = ctx.createLinearGradient(0, top, 0, top + 22);
      slab.addColorStop(0, face); slab.addColorStop(1, dark);
      ctx.fillStyle = slab; ctx.fillRect(p.left, top, width, 20);
      ctx.fillStyle = edge; ctx.fillRect(p.left, top, width, 3);
      ctx.fillStyle = '#00000050'; ctx.fillRect(p.left, top + 18, width, 3);
      ctx.strokeStyle = edge; ctx.lineWidth = 1; ctx.globalAlpha = .45;
      const spacing = terrain.material === 'wood' ? 17 : terrain.material === 'stone' ? 36 : 25;
      for (let x = p.left + 8; x < p.right - 5; x += spacing) {
        if (terrain.material === 'speaker') {
          ctx.beginPath(); ctx.arc(x + 5, top + 11, 5, 0, Math.PI * 2); ctx.stroke();
        } else if (terrain.material === 'metal') {
          ctx.fillStyle = edge; ctx.fillRect(x, top + 9, 3, 3);
        } else {
          ctx.beginPath(); ctx.moveTo(x, top + 4); ctx.lineTo(x, top + 17); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  function fighterSprite(side, blinkDirection = 0) {
    const f = match.fighters[side];
    const animation = blinkDirection
      ? f.penguin ? (blinkDirection * f.facing < 0 ? 'walk-pass' : 'flipper-heavy') : blinkDirection * f.facing < 0 ? 'dash-back' : 'dash-forward'
      : chooseAnimation(match, side);
    let art = assets.characters[f.character], frame = art.frames[match.pose(side)], atlas = atlases[f.character];
    let scale = f.character >= 2 ? frame.height / frame.h : 235 / art.frames[0].h;
    const move = MOVES[f.attack], acting = !f.stun && !f.knockdown && match.phase === 'fighting';
    if (f.character === 0 && acting && f.attack === 'super') {
      art = assets.milkDragon; atlas = dragonAtlas;
      const t = f.attackMs;
      frame = art.frames[t < 350 ? 0 : t < 760 ? 1 : t < 1490 ? 2 : t < 1940 ? 3 : 1];
      const growth = Math.min(1, .4 + t / 600), shrink = t > 2050 ? Math.max(.35, 1 - (t - 2050) / 700) : 1;
      scale = 360 * growth * shrink / frame.h;
    } else if (f.character === 0 && acting && move && (move.normalIndex !== undefined || move.artIndex !== undefined || f.attack === 'rising')) {
      art = assets.anonNormals; atlas = normalAtlas;
      let index = move.normalIndex ?? move.artIndex ?? (f.attackMs < 180 ? 8 : 14);
      if (f.attack === 'rush') index = f.attackMs < 250 ? 0 : f.attackMs < 460 ? 1 : 2;
      if (f.attack === 'thrust' && f.attackMs < 60) index = 0;
      frame = art.frames[index]; scale = frame.height / frame.h;
    }
    if (animation) {
      if (f.penguin) { art = assets.penguin; atlas = penguinAtlas; frame = penguinActionFrames.get(animation); }
      else if (animation.startsWith('jab-')) { art = assets.jabActions[f.character]; atlas = jabAtlases[f.character]; frame = jabActionFrames[f.character].get(animation); }
      else if (f.character === 3 && animation.startsWith('parfait-')) { art = assets.ranaParfaitActions; atlas = parfaitActionAtlas; frame = parfaitActionFrames.get(animation); }
      else {
        art = [assets.anonActions, assets.soyoActions, assets.tomoriActions, assets.characters[3], assets.characters[4]][f.character];
        atlas = [actionAtlas, soyoActionAtlas, atlases[2], atlases[3], atlases[4]][f.character];
        frame = [actionFrames, soyoActionFrames, tomoriActionFrames, ranaActionFrames, rikiActionFrames][f.character].get(animation);
      }
      scale = frame.height / frame.h;
    }
    return { atlas, frame, scale, animation, facing: f.facing };
  }
  function drawBlinkTrails(dt) {
    for (const effect of fx) if (effect.type === 'blink') {
      if (!match.paused) effect.life = Math.max(0, effect.life - dt);
      const age = effect.max - effect.life, { atlas, frame, scale, facing } = effect.sprite;
      const count = reducedMotion ? 1 : 5;
      for (let i = 0; i < count; i++) {
        const position = i / 5, delay = position * effect.travelMs;
        if (age < delay) continue;
        const fade = Math.max(0, 1 - (age - delay) / (effect.max - delay));
        if (!fade) continue;
        const x = effect.fromX + (effect.toX - effect.fromX) * position;
        const y = effect.fromY + (effect.toY - effect.fromY) * position;
        ctx.save(); ctx.translate(x, 438 - y); ctx.scale(facing * scale, scale);
        ctx.globalAlpha = (reducedMotion ? .18 : .48) * fade * fade;
        ctx.shadowColor = effect.color; ctx.shadowBlur = reducedMotion ? 0 : 7;
        ctx.drawImage(atlas, frame.x, frame.y, frame.w, frame.h, -frame.ax, -frame.ay, frame.w, frame.h);
        ctx.restore();
      }
    }
  }
  function drawFighter(side) {
    const f = match.fighters[side], move = MOVES[f.attack], acting = !f.stun && !f.knockdown && match.phase === 'fighting';
    const blink = fx.find(effect => effect.type === 'blink' && effect.side === side && effect.max - effect.life < effect.travelMs);
    // Combat stays responsive at the destination; attacks and hit reactions show there immediately.
    const traveling = blink && acting && !f.attack;
    const progress = traveling ? Math.min(1, (blink.max - blink.life) / blink.travelMs) : 1;
    const remaining = (1 - progress) * (1 - progress);
    const renderX = f.x + (traveling ? (blink.fromX - blink.toX) * remaining : 0);
    const renderY = f.y + (traveling ? (blink.fromY - blink.toY) * remaining : 0);
    const { atlas, frame, scale, animation, facing } = traveling ? blink.sprite : fighterSprite(side);
    const floor = 438, surface = match.surfaceBelow(renderX, renderY, f.dropMs), shadowY = floor - surface;
    ctx.save();
    ctx.globalAlpha = .3; ctx.fillStyle = '#03111e';
    ctx.beginPath(); ctx.ellipse(renderX, shadowY + 3, 37 - Math.min(12, (f.y - surface) * .04), 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = .7;
    ctx.strokeStyle = colors[side]; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(renderX, shadowY + 1, 31, 6, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    const bob = !f.attack && !f.stun && !f.vx ? Math.sin(visualTime * .004 + side) * 1.2 : 0;
    const recoil = !reducedMotion && f.stun ? Math.min(9, f.stun / 25) * (f.guard ? .55 : 1) * -f.facing : 0;
    ctx.translate(renderX + recoil, floor - renderY + (traveling ? 0 : bob));
    ctx.scale(facing * scale, scale);
    if (f.attack === 'dive' && acting) ctx.rotate(.18);
    if (!animation && f.crouch && !f.attack && !f.guard) ctx.scale(1.06, .87);
    ctx.shadowColor = ['special', 'super'].includes(f.attack) ? colors[side] : '#051323';
    ctx.shadowBlur = ['special', 'super'].includes(f.attack) ? 16 : 4;
    if (!traveling && !reducedMotion && (f.dashMs || acting && ['thrust', 'dive'].includes(f.attack))) {
      const trailDirection = f.dashMs ? Math.sign(f.vx) * f.facing : 1;
      for (const distance of [40, 20]) {
        ctx.globalAlpha = distance === 40 ? .08 : .15;
        ctx.drawImage(atlas, frame.x, frame.y, frame.w, frame.h, -frame.ax - distance / scale * trailDirection, -frame.ay - (f.attack === 'dive' ? distance / scale : 0), frame.w, frame.h);
      }
      ctx.globalAlpha = 1;
    }
    if (traveling) ctx.globalAlpha = .7 + .3 * progress;
    if (f.wakeInvuln > 0 && !reducedMotion && Math.floor(visualTime / 50) % 2) ctx.globalAlpha = .65;
    ctx.drawImage(atlas, frame.x, frame.y, frame.w, frame.h, -frame.ax, -frame.ay, frame.w, frame.h);
    ctx.restore();
    if (f.character === 4 && acting && move?.rikiOnly && f.attackMs >= move.start && f.attackMs <= move.end) {
      ctx.save(); ctx.translate(f.x, floor - f.y - 110); ctx.scale(f.facing, 1);
      ctx.strokeStyle = move.boosted ? '#fff0c7' : '#d9c4ff'; ctx.lineWidth = move.category === 'super' ? 5 : 3;
      ctx.globalAlpha = reducedMotion ? .4 : .7;
      const radius = move.category === 'super' ? 90 + (f.attackMs % 320) / 320 * 330 : 65;
      ctx.beginPath(); ctx.ellipse(25, 0, radius, radius * .6, -.5, -1.8, 1.2); ctx.stroke(); ctx.restore();
    }
    if (f.character === 3 && acting && f.attack && ['ranaTune', 'ranaSuper', 'ranaRise', 'ranaSlide', 'ranaRush'].includes(f.attack)) {
      const m = MOVES[f.attack], active = f.attackMs >= m.start && f.attackMs <= m.end;
      ctx.save(); ctx.translate(f.x, floor - f.y - 95); ctx.scale(f.facing, 1);
      ctx.strokeStyle = '#c9f0c3'; ctx.lineWidth = f.attack === 'ranaSuper' ? 4 : 2;
      ctx.globalAlpha = reducedMotion ? .3 : .65; ctx.shadowColor = '#b9e8c3'; ctx.shadowBlur = reducedMotion ? 0 : 12;
      if (f.attack === 'ranaSuper' && active) {
        const radius = 80 + (f.attackMs % 300) / 300 * 330;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(20, 0, radius - i * 18, 70 + i * 20, 0, -1.5, 1.5); ctx.stroke(); }
      } else if (f.attack === 'ranaTune') {
        ctx.beginPath(); ctx.ellipse(0, 95, 35 + Math.sin(visualTime * .008) * 3, 8, 0, 0, Math.PI * 2); ctx.stroke();
      } else if (active) { ctx.beginPath(); ctx.arc(30, f.attack === 'ranaSlide' ? 65 : -10, 65, -1.8, 1.1); ctx.stroke(); }
      ctx.restore();
    }
    // Side colours also distinguish mirror matches.
    if (match.grounded(f) && !f.stun && !f.attack && match.phase === 'idle') {
      ctx.fillStyle = colors[side]; ctx.font = 'bold 9px "Segoe UI",sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(ROSTER[f.character].en, f.x, shadowY + 23);
    }
  }
  function drawSoyoEffect(side) {
    const f = match.fighters[side], move = MOVES[f.attack], t = f.attackMs;
    if (f.character !== 1 || match.phase !== 'fighting' || f.stun || !move) return;
    ctx.save(); ctx.translate(f.x, 438 - f.y);
    if (f.attack === 'heal') {
      const progress = Math.min(1, t / move.start), fade = t > 950 ? (move.duration - t) / 250 : 1;
      ctx.strokeStyle = '#a4e8c7'; ctx.fillStyle = '#d5ffe7'; ctx.lineWidth = 1.8;
      ctx.shadowColor = '#87dcb7'; ctx.shadowBlur = reducedMotion ? 0 : 10;
      ctx.globalAlpha = .65 * fade;
      ctx.beginPath(); ctx.ellipse(0, -4, 36 + progress * 12, 9, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -145, 25 + progress * 13, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const phase = (t / 1000 + i / 6) % 1, x = Math.sin(i * 2.4 + t / 500) * 40, y = -30 - phase * 170;
        ctx.globalAlpha = Math.sin(phase * Math.PI) * .75 * fade;
        ctx.fillRect(x - 1, y - 4, 2, 8); ctx.fillRect(x - 4, y - 1, 8, 2);
      }
    } else if (['light', 'heavy', 'special', 'summon'].includes(f.attack) && t >= move.start && t < move.end + 110) {
      const phase = (t - move.start) / (move.end + 110 - move.start);
      ctx.scale(f.facing, 1); ctx.strokeStyle = f.attack === 'summon' ? '#f2d398' : '#b2dce4';
      ctx.globalAlpha = (1 - phase) * .7; ctx.lineWidth = f.attack === 'heavy' ? 3 : 1.5;
      ctx.beginPath(); ctx.ellipse(65 + phase * 45, -125, 12 + phase * 15, 28 + phase * 25, -.15, -.9, 1.5); ctx.stroke();
    }
    ctx.restore();
  }
  function drawOffenseEffect(side) {
    const f = match.fighters[side], t = f.attackMs;
    if (match.phase !== 'fighting' || f.stun || !['thrust', 'rush', 'dive'].includes(f.attack)) return;
    ctx.save(); ctx.translate(f.x, 438 - f.y); ctx.scale(f.facing, 1);
    ctx.strokeStyle = '#ffc0e1'; ctx.shadowColor = '#ff87c4'; ctx.shadowBlur = 13; ctx.lineWidth = 2;
    if (f.attack === 'thrust' && t < 280) {
      for (let i = 0; i < 5; i++) {
        const y = -45 - i * 30;
        ctx.globalAlpha = .65 - i * .08; ctx.beginPath();
        ctx.moveTo(-80 - i * 6, y); ctx.lineTo(35 - i * 6, y - 4); ctx.stroke();
      }
      ctx.globalAlpha = .8; ctx.fillStyle = '#fff0f9';
      ctx.beginPath(); ctx.moveTo(80, -130); ctx.lineTo(105, -112); ctx.lineTo(80, -94); ctx.lineTo(88, -112); ctx.closePath(); ctx.fill();
    } else if (f.attack === 'rush' && t < 650) {
      const beat = t < 250 ? 0 : t < 460 ? 1 : 2, pulse = MOVES.rush.pulses[beat];
      const strength = Math.max(.15, 1 - Math.abs(t - pulse.at) / 140);
      ctx.globalAlpha = strength; ctx.lineWidth = 3 + beat;
      ctx.beginPath(); ctx.ellipse(55, -110, 40 + beat * 8, 60 + beat * 9, -.4 + beat * .25, -1.4, 1.3); ctx.stroke();
      ctx.scale(f.facing, 1); ctx.fillStyle = '#ffdbed'; ctx.textAlign = 'center';
      ctx.font = 'bold italic 12px "Segoe UI",sans-serif'; ctx.fillText((beat + 1) + ' / 3 BEAT', 0, -245);
    } else if (f.attack === 'dive') {
      ctx.lineWidth = 3; ctx.globalAlpha = .75;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath(); ctx.moveTo(-65 + i * 19, -210 - i * 4); ctx.lineTo(-25 + i * 20, -110 + i * 10); ctx.stroke();
      }
      ctx.lineWidth = 4; ctx.strokeStyle = '#c8edff';
      ctx.beginPath(); ctx.arc(25, -25, 35, -.8, 1.2); ctx.stroke();
    }
    ctx.restore();
  }
  function drawSuperAura() {
    const view = camera.viewport();
    for (const f of match.fighters) {
      if (f.attack === 'soyoSuper' && match.phase === 'fighting') {
        const move = MOVES.soyoSuper, t = f.attackMs;
        ctx.save();
        const intensity = Math.min(1, t / 300, (move.duration - t) / 400);
        ctx.fillStyle = `rgba(24,14,5,${.25 * intensity})`; ctx.fillRect(view.left, view.top, view.width, view.height);
        ctx.translate(f.x, 438 - f.y - 110); ctx.scale(f.facing, 1);
        ctx.strokeStyle = '#ffe3a6'; ctx.shadowColor = '#e8ac52'; ctx.shadowBlur = reducedMotion ? 0 : 14;
        for (const pulse of move.pulses) {
          const age = t - pulse.at;
          if (age < -180 || age > 450) continue;
          const progress = Math.max(0, Math.min(1, (age + 180) / 630));
          const reach = pulse.reach * (.25 + progress * .75);
          ctx.globalAlpha = intensity * (1 - progress); ctx.lineWidth = 6 - progress * 3;
          ctx.beginPath(); ctx.ellipse(0, 0, reach, 115 + progress * 95, 0, -.48 * Math.PI, .48 * Math.PI); ctx.stroke();
          ctx.font = 'bold 42px Georgia'; ctx.fillStyle = '#fff0cf'; ctx.fillText('♪', reach * .6, -35 - progress * 60);
        }
        ctx.restore(); continue;
      }
      if (f.attack !== 'super' || match.phase !== 'fighting') continue;
      const t = f.attackMs, intensity = Math.min(1, t / 500) * Math.min(1, (2600 - t) / 400);
      ctx.save();
      ctx.fillStyle = `rgba(12,6,24,${.4 * intensity})`; ctx.fillRect(view.left, view.top, view.width, view.height);
      const glow = ctx.createRadialGradient(f.x, 438 - f.y - 160, 15, f.x, 438 - f.y - 160, 370);
      glow.addColorStop(0, '#ffbcdf70'); glow.addColorStop(.65, '#e54da42a'); glow.addColorStop(1, '#ffb1d800');
      ctx.fillStyle = glow; ctx.fillRect(view.left, view.top, view.width, view.height);
      ctx.strokeStyle = '#ffb7d9'; ctx.shadowColor = '#ff70bd'; ctx.shadowBlur = 18; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const r = 45 + ((t * .12 + i * 65) % 200);
        ctx.globalAlpha = intensity * (1 - r / 270);
        ctx.beginPath(); ctx.ellipse(f.x, 439 - f.y, r, r * .2, 0, 0, Math.PI * 2); ctx.stroke();
      }
      if (!reducedMotion) for (let i = 0; i < 14; i++) {
        const x = f.x + Math.sin(i * 2.4) * 180, y = 440 - f.y - ((t * .25 + i * 39) % 350);
        ctx.globalAlpha = intensity * .6; ctx.fillStyle = '#ffd0e6'; ctx.fillRect(x, y, 2, 9);
      }
      ctx.restore();
    }
  }
  function drawShield(side) {
    const f = match.fighters[side], steel = f.shield;
    if (!steel || match.phase !== 'fighting') return;
    ctx.save(); ctx.translate(f.x + f.facing * 58, 438 - f.y); ctx.scale(f.facing, 1);
    ctx.globalAlpha = Math.min(1, steel.ms / 200);
    ctx.shadowColor = '#aee6ff'; ctx.shadowBlur = steel.hitMs ? 22 : 7;
    const metal = ctx.createLinearGradient(-23, 0, 24, 0);
    metal.addColorStop(0, '#394956'); metal.addColorStop(.12, '#dae7ef');
    metal.addColorStop(.3, '#8899a8'); metal.addColorStop(.65, '#abbac5'); metal.addColorStop(1, '#4a5f70');
    ctx.fillStyle = metal; ctx.strokeStyle = '#e0eff7'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-23, -222); ctx.lineTo(23, -211); ctx.lineTo(23, -12); ctx.lineTo(-23, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0; ctx.strokeStyle = '#283d4e'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-17, -211); ctx.lineTo(-17, -12); ctx.stroke();
    ctx.strokeStyle = '#e6f1f530'; ctx.lineWidth = 1;
    for (let y = -200; y < -15; y += 5) { ctx.beginPath(); ctx.moveTo(-12, y); ctx.lineTo(18, y + 2); ctx.stroke(); }
    for (const y of [-199, -27]) for (const x of [-11, 12]) {
      ctx.fillStyle = '#344b5d'; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#dae6ee'; ctx.fillRect(x - 1, y - 2, 2, 1);
    }
    ctx.strokeStyle = '#e7b46f'; ctx.lineWidth = 5;
    for (let y = -185; y < -40; y += 26) { ctx.beginPath(); ctx.moveTo(18, y); ctx.lineTo(18, y + 12); ctx.stroke(); }
    if (steel.hp < 20) {
      ctx.strokeStyle = '#263947'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-8, -160); ctx.lineTo(5, -137); ctx.lineTo(-5, -120); ctx.lineTo(11, -96); ctx.lineTo(0, -73); ctx.stroke();
    }
    if (steel.hitMs) { ctx.fillStyle = `rgba(235,249,255,${steel.hitMs / 250})`; ctx.fillRect(-15, -205, 31, 190); }
    ctx.scale(f.facing, 1);
    ctx.fillStyle = '#152c40'; ctx.fillRect(-27, -240, 54, 6);
    ctx.fillStyle = steel.hp > 15 ? '#bde8fc' : '#ffc475'; ctx.fillRect(-27, -240, 54 * steel.hp / MOVES.shield.durability, 6);
    ctx.fillStyle = '#e0f5ff'; ctx.textAlign = 'center'; ctx.font = 'bold 10px "Segoe UI",sans-serif';
    ctx.fillText('钢板 ' + steel.hp, 0, -248);
    ctx.restore();
  }
  function drawSummons() {
    const art = assets.soyoTensora;
    for (const [side, f] of match.fighters.entries()) {
      const group = f.summons;
      if (!group) continue;
      for (const [i, p] of group.units.entries()) {
        const age = 10000 - group.ms, bob = Math.abs(Math.sin(visualTime * .012 + i * 1.8)) * (p.phase === 'charge' ? 12 : 6);
        const index = p.hitMs > 0 ? 3 : p.phase === 'charge' ? 2 : Math.floor(visualTime / 160 + i) % 2;
        const frame = art.frames[index], scale = frame.height / frame.h;
        const surface = match.surfaceBelow(p.x, p.y), ground = 438 - surface;
        ctx.save(); ctx.globalAlpha = Math.min(1, age / 160, group.ms / 400);
        ctx.fillStyle = '#09101c66'; ctx.beginPath(); ctx.ellipse(p.x, ground + 3, 21, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = colors[side]; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(p.x, ground + 2, 19, 4, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.translate(p.x, 438 - p.y - bob); ctx.scale(p.facing * scale, scale);
        ctx.shadowColor = '#e9ba64'; ctx.shadowBlur = p.hitMs ? 10 : 2;
        ctx.drawImage(tensoraAtlas, frame.x, frame.y, frame.w, frame.h, -frame.ax, -frame.ay, frame.w, frame.h);
        ctx.restore();
      }
    }
  }
  function drawWave(w) {
    if (MOVES[w.attack]?.rikiOnly) {
      ctx.save(); ctx.translate(w.x, 438 - w.y); ctx.scale(w.vx > 0 ? 1 : -1, 1);
      ctx.strokeStyle = '#dfccff'; ctx.fillStyle = '#baa0e333'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(0, 10, w.rx, w.ry, -.25, -1.8, 1.3); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-48, 38); ctx.lineTo(15, 38); ctx.stroke(); ctx.restore(); return;
    }
    if (w.attack === 'ranaParfait') {
      const h = assets.ranaParfait.height, width = parfaitImage.width / parfaitImage.height * h;
      ctx.save(); ctx.translate(w.x, 438 - w.y); ctx.scale(w.vx > 0 ? 1 : -1, 1);
      ctx.rotate(Math.atan2(-w.vy, Math.abs(w.vx)) * .35 + Math.sin(w.age * .009) * .16);
      ctx.globalAlpha = Math.min(1, w.life / 120); ctx.shadowColor = '#82953e'; ctx.shadowBlur = reducedMotion ? 0 : 5;
      ctx.drawImage(parfaitImage, -width / 2, -h / 2, width, h); ctx.restore(); return;
    }
    if (MOVES[w.attack]?.penguinOnly) { drawPenguinWave(w); return; }
    if (MOVES[w.attack]?.ranaOnly) {
      ctx.save(); ctx.translate(w.x, 438 - w.y); ctx.scale(w.vx > 0 ? 1 : -1, 1);
      ctx.strokeStyle = '#d2f4c9'; ctx.lineWidth = 2; ctx.globalAlpha = Math.min(1, w.life / 150);
      ctx.shadowColor = '#a4d6ad'; ctx.shadowBlur = reducedMotion ? 0 : 12;
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(-i * 6, 0, Math.max(6, w.rx - i * 2), Math.max(10, w.ry - i * 3), 0, -1.35, 1.35); ctx.stroke(); }
      ctx.restore(); return;
    }
    if (MOVES[w.attack]?.tomoriOnly) { drawVoiceWave(w); return; }
    if (w.attack === 'sonic') { drawSonicWave(w); return; }
    const x = w.x, y = 438 - w.y, color = colors[w.owner];
    ctx.save(); ctx.translate(x, y); ctx.scale(w.vx > 0 ? 1 : -1, 1);
    ctx.shadowColor = color; ctx.shadowBlur = 20; ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, 0, 16, 22, 0, -.5 * Math.PI, .5 * Math.PI); ctx.stroke();
    ctx.font = 'bold 38px Georgia'; ctx.textAlign = 'center'; ctx.fillText('♪', 0, 12);
    ctx.globalAlpha = .45; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-24 - i * 10, -10 + i * 10); ctx.lineTo(-42 - i * 9, -10 + i * 10); ctx.stroke(); }
    ctx.restore();
  }
  function drawPenguinWave(w) {
    ctx.save(); ctx.translate(w.x, 438 - w.y); ctx.scale(w.vx > 0 ? 1 : -1, 1);
    ctx.globalAlpha = Math.min(1, w.life / 140); ctx.strokeStyle = '#fff0c8'; ctx.fillStyle = '#ecf7ff'; ctx.lineWidth = 3;
    ctx.shadowColor = '#eac589'; ctx.shadowBlur = reducedMotion ? 0 : 12;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(-i * 11, 0, Math.max(6, w.rx - i * 5), Math.max(8, w.ry - i * 9), 0, -1.25, 1.25); ctx.stroke(); }
    ctx.scale(w.vx > 0 ? 1 : -1, 1); ctx.font = 'bold 16px "Microsoft YaHei",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(w.attack === 'penguinHey' ? 'hey?' : w.attack === 'penguinCall' ? '咕嘎！' : '呜！', 0, -w.ry - 8); ctx.restore();
  }
  function drawVoiceWave(w) {
    const wide = w.attack !== 'tomoriNote', chorus = w.attack === 'tomoriChorus';
    ctx.save(); ctx.translate(w.x, 438 - w.y); ctx.scale(w.vx > 0 ? 1 : -1, 1);
    ctx.globalAlpha = Math.min(1, w.life / 180); ctx.shadowColor = '#a8bfdc'; ctx.shadowBlur = reducedMotion ? 0 : 12;
    ctx.strokeStyle = chorus ? '#e4c3df' : '#c1deed'; ctx.fillStyle = '#d5e8f2'; ctx.lineWidth = chorus ? 3 : 2;
    for (let i = 0; i < (wide ? 3 : 1); i++) {
      ctx.beginPath(); ctx.ellipse(-i * 13, 0, Math.max(8, w.rx - i * 5), w.ry - i * 9, 0, -1.25, 1.25); ctx.stroke();
    }
    const flutter = Math.sin(w.age * .012) * 5;
    ctx.beginPath(); ctx.ellipse(-5, 9 + flutter, 8, 5, -.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(2, 8 + flutter); ctx.lineTo(2, -20 + flutter); ctx.lineTo(17, -16 + flutter); ctx.stroke();
    if (chorus) { ctx.beginPath(); ctx.arc(-18, -18, 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  function drawSonicWave(w) {
    const rx = w.rx, ry = w.ry;
    ctx.save(); ctx.translate(w.x, 438 - w.y); ctx.scale(w.vx > 0 ? 1 : -1, 1);
    ctx.globalAlpha = Math.min(1, w.life / 120);
    const glow = ctx.createRadialGradient(0, 0, 5, 0, 0, ry);
    glow.addColorStop(0, '#fff1fa85'); glow.addColorStop(.4, '#f98acb4a'); glow.addColorStop(1, '#f98acb00');
    ctx.fillStyle = glow; ctx.fillRect(-rx * 1.5, -ry, rx * 3, ry * 2);
    ctx.shadowColor = '#ff8dce'; ctx.shadowBlur = 22;
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = ['#fff1fa', '#ff98d0', '#a9e5ff', '#fa8ec7'][i]; ctx.lineWidth = i ? 2.5 : 5;
      ctx.beginPath(); ctx.ellipse(-i * rx * .43, 0, rx * (1 - i * .12), ry * (1 - i * .12), 0, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    }
    ctx.lineWidth = 2; ctx.strokeStyle = '#fff5fd'; ctx.beginPath();
    for (let i = 0; i <= 28; i++) {
      const x = -rx * 1.3 + i / 28 * rx * 2;
      const y = Math.sin(i * 1.7 - w.age * .025) * (8 + Math.sin(i / 28 * Math.PI) * 14);
      if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.scale(w.vx > 0 ? 1 : -1, 1);
    ctx.font = '900 italic 21px "Segoe UI",sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4;
    ctx.strokeStyle = '#48243d'; ctx.strokeText('TGW!!', 0, -ry - 12);
    ctx.fillStyle = '#ffe8f5'; ctx.fillText('TGW!!', 0, -ry - 12);
    ctx.restore();
  }
  function drawFx(dt) {
    for (const effect of fx) {
      if (effect.type === 'blink') continue;
      if (!match.paused) effect.life -= dt;
      const progress = 1 - effect.life / effect.max;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - progress); ctx.translate(effect.x, effect.y);
      ctx.strokeStyle = effect.color; ctx.fillStyle = effect.color;
      ctx.shadowColor = effect.color; ctx.shadowBlur = 16;
      if (effect.type === 'landing') {
        ctx.shadowBlur = 0;
        for (let i = 0; i < (effect.heavy ? 12 : 7); i++) {
          const direction = i % 2 ? -1 : 1, distance = progress * (30 + (i % 5) * 20);
          ctx.globalAlpha = Math.max(0, 1 - progress) * .55;
          ctx.beginPath(); ctx.ellipse(direction * distance, -Math.sin(progress * Math.PI) * (5 + i % 3 * 9), 6 + progress * 12, 2 + progress * 4, 0, 0, Math.PI * 2); ctx.fill();
        }
      } else if (effect.type === 'dash') {
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
          const x = -effect.direction * (i * 9 + progress * 40), y = -4 - i * 3;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - effect.direction * (12 + progress * 20), y - 3); ctx.stroke();
        }
      } else if (effect.type === 'parfaitSplash') {
        ctx.shadowBlur = 0;
        for (let i = 0; i < 15; i++) {
          const angle = i * 2.4, dist = 8 + progress * (35 + i % 4 * 10);
          const x = Math.cos(angle) * dist, y = Math.sin(angle) * dist - progress * 18 + progress * progress * 38;
          ctx.fillStyle = ['#a1ba45', '#fff0c6', '#e95d58', '#f4d278', '#79513a'][i % 5];
          ctx.beginPath(); ctx.ellipse(x, y, 3 + i % 3 * 2, 2 + i % 2 * 2, angle, 0, Math.PI * 2); ctx.fill();
        }
      } else if (effect.type === 'impact') {
        ctx.save(); ctx.rotate(-.4 * effect.direction);
        const size = (18 + effect.weight * 9) * (.65 + progress * 1.8);
        const age = (effect.max - effect.life) / 1000, power = [1, 1.3, 1.85, 2.8][effect.weight];
        if (effect.weight >= 2 && age < .17) {
          ctx.globalAlpha *= (1 - age / .17) * (reducedMotion ? .25 : .8);
          for (let i = 0; i < 9; i++) {
            const angle = i * 2.4, near = 55, far = (240 + effect.weight * 65) * (.7 + i % 3 * .15);
            ctx.lineWidth = i % 2 ? 3 : 5; ctx.beginPath(); ctx.moveTo(Math.cos(angle) * near, Math.sin(angle) * near);
            ctx.lineTo(Math.cos(angle) * far, Math.sin(angle) * far); ctx.stroke();
          }
          ctx.globalAlpha = Math.max(0, 1 - progress);
        }
        for (let i = 0; i < 20 + effect.weight * 4; i++) {
          const angle = i * 2.39996, length = (12 + effect.weight * 10) * (1 - progress);
          ctx.lineWidth = (i % 2 ? 2 : 4) * (1 - progress) + 1;
          const distance = (650 + i % 7 * 95) * power * (1 - Math.exp(-5 * age)) / 5;
          const x = Math.cos(angle) * distance * 1.2 + effect.direction * age * power * 100, y = Math.sin(angle) * distance * .65 + age * age * 200;
          ctx.strokeStyle = i % 3 ? effect.color : '#fff4da';
          ctx.beginPath(); ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(angle) * length * .3, y + Math.sin(angle) * length * .3); ctx.stroke();
          if (i % 5 === 0) { ctx.save(); ctx.translate(x, y); ctx.rotate(angle + progress * 4); ctx.fillRect(-2, -3, 4, 6); ctx.restore(); }
        }
        ctx.fillStyle = '#ffffff'; ctx.globalAlpha *= Math.max(0, 1 - progress * 2);
        ctx.beginPath(); ctx.moveTo(-size * .7, 0); ctx.lineTo(0, -size * .4); ctx.lineTo(size * .7, 0); ctx.lineTo(0, size * .4); ctx.closePath(); ctx.fill();
        ctx.restore();
      } else if (effect.type === 'steelBreak') {
        for (let i = 0; i < 8; i++) {
          const angle = i * 2.4;
          ctx.save(); ctx.translate(Math.cos(angle) * progress * 80, Math.sin(angle) * progress * 80 + progress * progress * 65);
          ctx.rotate(angle + progress * 5); ctx.fillRect(-3, -6, 6, 12); ctx.restore();
        }
      } else if (effect.type === 'shock') {
        ctx.lineWidth = 5 * (1 - progress) + 1; ctx.beginPath();
        ctx.ellipse(0, 0, 40 + progress * 300, 8 + progress * 45, 0, 0, Math.PI * 2); ctx.stroke();
      } else if (effect.type === 'guard') {
        ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, 12 + progress * 18, 38 + progress * 10, 0, 0, Math.PI * 2); ctx.stroke();
      } else {
        for (let i = 0; i < 10; i++) {
          const angle = i / 10 * Math.PI * 2, dist = 9 + progress * 48;
          ctx.lineWidth = i % 2 ? 1.5 : 3;
          ctx.beginPath(); ctx.moveTo(Math.cos(angle) * dist * .25, Math.sin(angle) * dist * .25);
          ctx.lineTo(Math.cos(angle) * dist, Math.sin(angle) * dist); ctx.stroke();
        }
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 5 + progress * 27, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.shadowBlur = 0; ctx.textAlign = 'center'; ctx.font = 'bold ' + (effect.type === 'impact' ? 38 : 26) + 'px "Segoe UI",sans-serif';
      ctx.fillText(effect.text || '', 0, -55 - progress * 35); ctx.restore();
    }
    fx = fx.filter(e => e.life > 0);
  }
  function draw(dt) {
    if (cameraFighter !== match.fighters[0]) { cameraFighter = match.fighters[0]; camera.reset(match); }
    else camera.update(match, dt);
    ctx.save(); ctx.setTransform(canvas.width / 960, 0, 0, canvas.height / 540, 0, 0);
    if (impactMotion) {
      if (!match.paused) impactMotion.age += dt;
      const p = Math.min(1, impactMotion.age / impactMotion.duration), phase = [1, -.6, .3, -.15][Math.min(3, Math.floor(p * 4))];
      const offset = phase * impactMotion.power * (1 - p);
      ctx.translate(offset * impactMotion.direction, offset * (impactMotion.direction ? .35 : 1));
      if (p === 1) impactMotion = null;
    }
    drawBackground();
    if (inkMs > 0) {
      ctx.fillStyle = 'rgba(7,8,18,' + (Math.min(reducedMotion ? .12 : .64, .64 * inkMs / inkMax)) + ')'; ctx.fillRect(0, 0, 960, 540);
      if (!match.paused) inkMs = Math.max(0, inkMs - dt);
    }
    ctx.save(); ctx.translate(480, 270); ctx.scale(camera.zoom, camera.zoom); ctx.translate(-camera.x, -camera.y);
    drawTerrain();
    drawSuperAura();
    for (const side of [0, 1]) drawOffenseEffect(side);
    for (const side of [0, 1]) drawSoyoEffect(side);
    for (const f of match.fighters) if (f.character === 2 && !f.penguin && MOVES[f.attack]?.tomoriOnly && !MOVES[f.attack]?.nativeOnly && !f.stun && match.phase === 'fighting') {
      const t = f.attackMs; ctx.save(); ctx.translate(f.x, 438 - f.y); ctx.scale(f.facing, 1);
      ctx.strokeStyle = '#bcd7ec'; ctx.lineWidth = 1.5; ctx.globalAlpha = .35;
      const pulse = (t % 190) / 190;
      ctx.beginPath(); ctx.ellipse(12 + pulse * 18, -178, 14 + pulse * 12, 20 + pulse * 15, 0, -1.1, 1.1); ctx.stroke();
      if (f.attack === 'tomoriChorus') { ctx.strokeStyle = '#d9b9d8'; ctx.beginPath(); ctx.ellipse(0, -3, 40 + pulse * 10, 8, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
    }
    for (const f of match.fighters) if (match.phase === 'fighting' && !f.stun && f.penguin) {
      ctx.save(); ctx.translate(f.x, 438 - f.y); ctx.strokeStyle = '#fff0c7'; ctx.lineWidth = 2;
      if (f.penguin.ms > 19880) {
        const t = (20000 - f.penguin.ms) / 120; ctx.globalAlpha = Math.sin(t * Math.PI) * .7;
        ctx.beginPath(); ctx.ellipse(0, -100, 55 + t * 30, 105, 0, 0, Math.PI * 2); ctx.stroke();
      } else if (f.attack === 'penguinCry') {
        ctx.strokeStyle = '#b6e7ff'; ctx.globalAlpha = .45; ctx.beginPath(); ctx.ellipse(0, -100, 57, 85, 0, 0, Math.PI * 2); ctx.stroke();
      } else if (f.attack === 'penguinLaugh' && f.attackMs >= 180 && f.attackMs < 420) {
        const p = (f.attackMs - 180) / 240; ctx.globalAlpha = .7 * (1 - p); ctx.beginPath(); ctx.ellipse(0, -90, 50 + p * 170, 35 + p * 110, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }
    drawBlinkTrails(dt);
    for (const side of [0, 1]) drawFighter(side);
    drawSummons();
    for (const side of [0, 1]) drawShield(side);
    match.waves.forEach(drawWave); drawFx(dt);
    ctx.restore();
    if (flash > 0) {
      ctx.fillStyle = '#f6cee92a'; ctx.fillRect(0, 0, 960, 540);
      if (!match.paused) flash -= dt;
    }
    ctx.restore();
  }
  function overlayContent(kicker, title, description, label, hint) {
    $('overlay-kicker').textContent = kicker; $('overlay-title').innerHTML = title;
    $('overlay-description').innerHTML = description;
    $('overlay-action').textContent = label;
    $('overlay-hint').textContent = hint;
  }
  function updateUI(dt) {
    const player = match.fighters[0];
    const next = bindingList(player).find(({ move }) => player.energy >= (MOVES[move].cost || 0) && match.canCancel(player, move));
    $('chain-hint').textContent = next ? '可接 ' + next.key + ' · ' + MOVES[next.move].name : player.landingRecovery ? '落地收招中' : '招式表 F1';
    $('chain-hint').classList.toggle('available', !!next);
    document.querySelector('[data-key="KeyH"]').disabled = !!player.penguin;
    if (player.character === 1 && player.hp < MAX_HEALTH && !player.healCooldown) $('chain-hint').textContent = '↓＋I 自愈 · 35%共鸣';
    if (player.character === 3) $('chain-hint').textContent = player.attack === 'ranaTune' ? '静心调弦 · 蓄积共鸣' : player.tuneCooldown ? '调弦冷却 ' + (player.tuneCooldown / 1000).toFixed(1) + ' 秒' : '↓＋I 调弦 · F1 招式表';
    if (player.character === 4) $('chain-hint').textContent = player.beats === 4 ? '四拍就绪 · 下一招强化' : '节拍 ' + player.beats + '/4 · ↓＋I 校拍';
    for (let side = 0; side < 2; side++) {
      const f = match.fighters[side], n = side + 1;
      $('hp' + n).style.width = f.hp / MAX_HEALTH * 100 + '%'; $('hptext' + n).textContent = f.hp + ' / ' + MAX_HEALTH;
      $('energy' + n).style.width = f.energy + '%'; $('energytext' + n).textContent = f.energy + '%';
      $('energy' + n).closest('.meter').classList.toggle('ready', f.energy >= 60);
      const skill = ROSTER[f.character].skill;
      $('special' + n).textContent = f.character === 0 && f.energy >= 100 ? (side ? '粉色奶龙 · 已就绪' : '按 P · 粉色奶龙·法天象地') : f.energy >= 60 ? (side ? skill + ' · 已就绪' : '按 O · ' + skill + '就绪') : (side ? skill : '共鸣 60% 可释放必杀');
      if (f.character === 3 && f.energy === 100) $('special' + n).textContent = side ? '全力独奏 · 已就绪' : '按 P · 自由之弦·全力独奏';
      if (f.character === 1 && f.energy >= 50) $('special' + n).textContent = side ? '小天素罗 · 已就绪' : '按 U · 小天素罗（50%）';
      if (f.character === 1 && f.hp < MAX_HEALTH && f.energy >= MOVES.heal.cost && !f.healCooldown) $('special' + n).textContent = side ? '归心·自愈 · 已就绪' : '按 ↓＋I · 归心·自愈（35%）';
      if (f.character === 2 && f.energy < 60) $('special' + n).textContent = f.energy >= 30 ? (side ? '诗句回声 · 已就绪' : '按 U · 诗句回声（30%）') : f.energy >= 20 ? (side ? '微光音符 · 已就绪' : '按 I · 微光音符（20%）') : '共鸣20% · 微光音符';
      if (f.character === 2 && f.attack === 'tomoriChorus') $('special' + n).textContent = '迷途之歌 · ' + Math.min(3, f.hitMarks.length + 1) + ' / 3';
      if (f.summons) $('special' + n).textContent = '小天素罗 ×3 · ' + (f.summons.ms / 1000).toFixed(1) + ' 秒';
      if (f.character === 1 && f.energy >= 100) $('special' + n).textContent = side ? '为什么要演奏春日影 · 已就绪' : '按 P · 为什么要演奏春日影';
      if (f.attack === 'soyoSuper') $('special' + n).textContent = '为什么要演奏春日影！';
      if (f.shield) $('special' + n).textContent = '钢板 ' + f.shield.hp + '/40 · ' + (f.shield.ms / 1000).toFixed(1) + ' 秒';
      if (f.penguin) $('special' + n).textContent = '凑企鹅 · ' + (f.penguin.ms / 1000).toFixed(1) + ' 秒';
      if (f.character === 4) $('special' + n).textContent = '节拍 ' + f.beats + '/4 · ' + (f.energy === 100 ? (side ? '全场共振就绪' : 'P 全场共振') : f.calibrateCooldown ? '校拍冷却 ' + (f.calibrateCooldown / 1000).toFixed(1) + '秒' : '↓＋I 节拍校准');
      [...$('wins' + n).children].forEach((pip, i) => pip.classList.toggle('won', i < match.wins[side]));
      $('combo' + n).innerHTML = f.combo > 1 && f.comboMs > 0 && match.phase === 'fighting' ? f.combo + ' <small>HITS</small>' : '';
    }
    $('timer').textContent = match.options.mode === 'practice' ? '∞' : String(Math.ceil(match.remaining / 1000)).padStart(2, '0');
    const superFighter = match.fighters.find(f => f.attack === 'super');
    $('super-title').hidden = !superFighter || superFighter.attackMs > 1550 || match.paused || match.phase !== 'fighting';
    $('super-title').classList.toggle('from-right', superFighter === match.fighters[1]);
    syncSoyoCutins();
    $('timer').parentElement.classList.toggle('warning', match.remaining < 11000);
    $('round-label').textContent = match.options.mode === 'practice' ? '练习' : '第 ' + match.round + ' 回合';
    $('pause').disabled = match.phase === 'idle';
    $('pause').textContent = match.paused ? '继续' : '暂停';
    let banner = '';
    if (match.phase === 'ready') banner = match.phaseMs > 300 ? '第 ' + match.round + ' 回合' : 'FIGHT!';
    else if (fightBanner > 0 && match.phase === 'fighting') { banner = 'FIGHT!'; if (!match.paused) fightBanner -= dt; }
    if (match.paused) banner = '';
    $('banner').innerHTML = banner;
    const uiPhase = match.paused ? 'paused' : match.phase;
    if (uiPhase !== lastUiPhase) {
      lastUiPhase = uiPhase;
      $('overlay').hidden = ['ready', 'fighting'].includes(uiPhase);
      if (uiPhase === 'paused') overlayContent('', '已暂停', '', '继续', '点击继续返回对战');
      if (uiPhase === 'roundOver' || uiPhase === 'finished') {
        const win = match.winner, title = win < 0 ? '平局' : ROSTER[match.fighters[win].character].name + '获胜';
        const description = `${match.reason} · ${match.wins[0]} : ${match.wins[1]}`;
        overlayContent(uiPhase === 'finished' ? '对战结束' : '回合结束', title, description, uiPhase === 'finished' ? '再来一场' : '下一回合', '点击按钮继续');
      }
    }
    $('overlay-action').disabled = uiPhase === 'roundOver' && match.phaseMs > 0;
    $('status').textContent = { idle: '等待上场', ready: '回合准备', fighting: match.options.mode === 'practice' ? '自由练习 · 共鸣自动回充' : match.options.mode === 'duel' ? '本地双人对战中' : '与' + ROSTER[match.fighters[1].character].shortName + '切磋中', paused: '对战已暂停', roundOver: '回合结束', finished: '本场对战结束' }[uiPhase];
  }
  function frame(time) {
    const dt = Math.min(50, Math.max(0, time - (lastTime || time))); lastTime = time;
    if (inMenu) { requestAnimationFrame(frame); return; }
    if (!match.paused) visualTime += dt;
    const inputTickBefore = match.inputTick;
    match.advance(dt, input(keys1), input(keys2));
    if (match.inputTick !== inputTickBefore) {
      // Keep a quick press during hitstop until a simulation tick consumes it.
      for (const key of taps) {
        for (const [side, map] of [[0, keys1], [1, keys2]]) {
          const action = Object.keys(map).find(action => map[action] === key);
          if (action && match.previous[side][action]) taps.delete(key);
        }
      }
    }
    consumeEvents(); draw(dt); updateUI(dt); requestAnimationFrame(frame);
  }
  async function boot() {
    try {
      [atlases, backgrounds, normalAtlas, dragonAtlas, actionAtlas, tensoraAtlas, soyoActionAtlas, penguinAtlas, parfaitActionAtlas, parfaitImage, jabAtlases] = await Promise.all([
        Promise.all(assets.characters.map(art => loadImage(art.atlas))),
        Promise.all(assets.backgrounds.map(loadImage)),
        loadImage(assets.anonNormals.atlas), loadImage(assets.milkDragon.atlas), loadImage(assets.anonActions.atlas), loadImage(assets.soyoTensora.atlas), loadImage(assets.soyoActions.atlas), loadImage(assets.penguin.atlas),
        loadImage(assets.ranaParfaitActions.atlas), loadImage(assets.ranaParfait.src),
        Promise.all(assets.jabActions.map(art => loadImage(art.atlas))),
      ]);
      renderStageChoices();
      warmCharacterArt(selectedCharacters());
      loaded = true; $('loading').hidden = true; $('menu-loading').hidden = true;
      document.querySelectorAll('[data-menu-ready]').forEach(button => button.disabled = false);
      updateMode(); updateCharacterInfo(); renderMainMenu(); requestAnimationFrame(frame);
    } catch (error) {
      $('loading').textContent = $('menu-loading').textContent = '素材加载失败，请重新打开完整的 index.html。'; console.error(error);
    }
  }
  // A read-only game reference is useful for inspecting the standalone prototype.
  window.mygoGame = { get match() { return match; }, get loaded() { return loaded; }, get camera() { return camera.snapshot(); },
    get feedback() { return { inkMs, motion: impactMotion && { ...impactMotion }, effects: fx.map(e => ({ type: e.type, life: e.life })) }; } };
  boot();
})();
