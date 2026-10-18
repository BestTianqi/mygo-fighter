(function () {
  'use strict';
  const { Match, ROSTER, MOVES, moveList, WORLD } = window.MygoFighter;
  const assets = window.MYGO_ASSETS;
  const chooseAnimation = window.MygoAnimation.createAnimator();
  const actionFrames = new Map(assets.anonActions.frames.map(frame => [frame.name, frame]));
  const soyoActionFrames = new Map(assets.soyoActions.frames.map(frame => [frame.name, frame]));
  const tomoriActionFrames = new Map(assets.tomoriActions.frames.map(frame => [frame.name, frame]));
  const penguinActionFrames = new Map(assets.penguin.frames.map(frame => [frame.name, frame]));
  const $ = id => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d'), stage = $('stage');
  const held = new Set(), touchHeld = new Set(), taps = new Set();
  const keys1 = { left: 'KeyA', right: 'KeyD', jump: 'KeyW', crouch: 'KeyS', light: 'KeyJ', medium: 'KeyH', heavy: 'KeyK', lightKick: 'KeyN', mediumKick: 'KeyM', heavyKick: 'Comma', special: 'KeyL', wave: 'KeyI', sonic: 'KeyT', thrust: 'KeyC', rush: 'KeyV', dive: 'KeyF', throw: 'KeyB', shield: 'KeyU', guard: 'KeyO', dash: 'ShiftLeft', rising: 'KeyY', spin: 'Semicolon', super: 'KeyP', heal: 'KeyG' };
  const keys2 = { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', crouch: 'ArrowDown', light: 'Numpad1', medium: 'Numpad7', heavy: 'Numpad2', lightKick: 'Numpad8', mediumKick: 'Numpad9', heavyKick: 'NumpadDecimal', special: 'Numpad3', wave: 'Numpad4', sonic: 'NumpadEnter', thrust: 'Home', rush: 'End', dive: 'PageDown', throw: 'Numpad5', shield: 'NumpadMultiply', guard: 'Numpad0', dash: 'Numpad6', rising: 'NumpadAdd', spin: 'NumpadDivide', super: 'NumpadSubtract', heal: 'Delete' };
  const boundKeys = new Set([...Object.values(keys1), ...Object.values(keys2), 'ShiftRight']);
  const colors = ['#f6a4c7', '#65d1ee'];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let arena = 0, loaded = false;
  let match = new Match({ characters: [0, 1], terrain: assets.stages[arena].terrain });
  const camera = new MygoCamera.Camera();
  let cameraFighter;
  let lastTime = 0, visualTime = 0, shake = 0, flash = 0, fightBanner = 0;
  let lastUiPhase = '', soundEnabled = false, audioContext;
  let voicePlayer, voiceLoading;
  let fx = [];
  const dialogState = new Map();
  let atlases, backgrounds, normalAtlas, dragonAtlas, actionAtlas, tensoraAtlas, soyoActionAtlas, penguinAtlas;

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const im = new Image(); im.onload = () => resolve(im); im.onerror = reject; im.src = src;
    });
  }
  function input(map) {
    return Object.fromEntries(Object.entries(map).map(([action, key]) => [action, held.has(key) || touchHeld.has(key) || taps.has(key) || (action === 'dash' && map === keys1 && (held.has('ShiftRight') || taps.has('ShiftRight')))]));
  }
  function clearInput() {
    held.clear(); touchHeld.clear(); taps.clear(); match.release();
    document.querySelectorAll('.touch-controls .held').forEach(el => el.classList.remove('held'));
  }
  function prepareVoices() {
    voiceLoading ||= Promise.all(Object.entries(assets.penguinVoices).map(async ([move, src]) => {
      const bytes = Uint8Array.from(atob(src.split(',')[1]), c => c.charCodeAt(0));
      return [move, await audioContext.decodeAudioData(bytes.buffer)];
    })).then(entries => {
      voicePlayer = MygoVoice.createVoicePlayer(audioContext, Object.fromEntries(entries));
      voicePlayer.setEnabled(soundEnabled); voicePlayer.setPaused(match.paused);
    });
    return voiceLoading;
  }
  function tone(kind, side = 0) {
    if (!soundEnabled || !audioContext) return;
    if (voicePlayer?.play(kind, side)) return;
    const now = audioContext.currentTime;
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
  function start() {
    if (!loaded) return;
    voicePlayer?.stop(); voicePlayer?.setPaused(false);
    match = new Match({ mode: $('mode').value, dummy: $('dummy').value, difficulty: Number($('difficulty').value), characters: selectedCharacters(), terrain: selectedTerrain(), seed: Date.now() >>> 0 });
    match.start(); clearInput(); fx = []; shake = flash = 0; lastUiPhase = '';
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
      if (match.nextRound()) { voicePlayer?.stop(); clearInput(); fx = []; lastUiPhase = ''; stage.focus({ preventScroll: true }); }
    } else start();
  }
  function pause(value = !match.paused) {
    if (!loaded || match.phase === 'idle') return;
    match.setPaused(value); clearInput(); lastUiPhase = '';
    voicePlayer?.setPaused(value);
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
    const player = match.fighters[0], character = player.character, penguin = !!player.penguin, profile = ROSTER[character];
    $('help-player-name').textContent = '1P / ' + profile.name;
    $('help-skill-name').textContent = penguin ? '咕咕嘎嘎（40%）' : profile.skill + '（60%）';
    document.querySelectorAll('.anon-only').forEach(el => el.hidden = match.fighters[0].character !== 0);
    document.querySelectorAll('.soyo-only').forEach(el => el.hidden = match.fighters[0].character !== 1);
    document.querySelectorAll('.tomori-only').forEach(el => el.hidden = character !== 2 || penguin);
    document.querySelectorAll('.penguin-only').forEach(el => el.hidden = !penguin);
    document.querySelectorAll('.extra-normal,.form-shared').forEach(el => el.hidden = character !== 0 && !penguin);
    document.querySelectorAll('.support-control').forEach(el => el.hidden = character === 0);
    $('help-basic-attacks').textContent = penguin ? 'J / H / K 鳍拍；N / M / , 蹬脚（站立 / 蹲下 / 空中）' : character === 0 ? 'J / H / K 轻 / 中 / 重拳' : 'J / K 轻击 / 重击';
    $('help-throw-key').textContent = character === 0 || penguin ? 'B' : 'U';
    const labels = {
      KeyU: penguin ? '糖哭' : character === 0 ? '钢板' : '投技',
      KeyT: penguin ? '唐笑' : ['TGW音波', '小天素罗', '诗句回声'][character],
      KeyI: penguin ? 'hey?' : character === 2 ? '微光音符' : '音符',
      KeyL: penguin ? '咕咕嘎嘎' : character === 2 ? '迷途之歌' : '必杀',
      KeyJ: penguin ? '轻鳍' : character === 1 ? '轻掌' : character === 2 ? '轻击' : '轻拳',
      KeyK: penguin ? '顶撞' : character === 1 ? '双掌' : character === 2 ? '重击' : '重拳',
      KeyH: penguin ? '连鳍' : '中拳', KeyN: penguin ? '轻蹬' : '轻脚', KeyM: penguin ? '中蹬' : '中脚',
      Comma: penguin ? '扫脚' : '重脚', KeyB: penguin ? '鳍抱' : '投技', KeyC: penguin ? '飞踢' : '突刺',
      KeyF: penguin ? '空中飞踢' : '俯冲踢', KeyG: character === 2 ? '凑企鹅' : '归心自愈',
    };
    for (const [key, text] of Object.entries(labels)) document.querySelector('[data-key="' + key + '"]').textContent = text;
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
  $('terrain-enabled').addEventListener('change', () => match.setTerrain(selectedTerrain()));
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
    match.setTerrain(selectedTerrain());
    document.querySelectorAll('[data-stage]').forEach(b => {
      const selected = b === button; b.classList.toggle('selected', selected); b.setAttribute('aria-pressed', String(selected));
    });
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
  function showMoves() {
    const character = match.fighters[0].character, penguin = !!match.fighters[0].penguin;
    $('moves-intro').textContent = character === 0 ? '方向以面向对手为准。拳：J / H / K；脚：N / M / 逗号，依次为轻、中、重。支持方向指令和单键快捷技。'
      : character === 2 ? '灯：J / K 轻击与重击，U 投技；I 微光音符，T 诗句回声，L 三段迷途之歌。歌声技能需站在地面或平台上施放。' : '素世：J / K 轻掌与双掌，U 投技；I 音符，T 小天素罗，G 归心·自愈，L 回响终章。';
    $('moves-title').textContent = ROSTER[character].name + ' · 招式表';
    if (penguin) { $('moves-title').textContent = '高松灯 · 凑企鹅招式表'; $('moves-intro').textContent = 'J / H / K 鳍拍，N / M / 逗号蹬脚，支持站立、蹲下与空中；C / 空中F 飞踢，U 糖哭反击，I hey?，T 唐笑，L 咕咕嘎嘎，B 鳍抱投技。'; }
    const groups = [['standing', '站立拳脚'], ['crouch', '蹲下拳脚'], ['air', '空中拳脚'], ['other', '特殊技与必杀']];
    $('moves-content').innerHTML = groups.map(([stance, title]) => {
      const moves = moveList(character, penguin).filter(m => stance === 'other' ? !m.stance : m.stance === stance);
      return moves.length ? `<section><h3>${title}</h3><table><thead><tr><th>招式</th><th>按键 / 指令</th><th>伤害 / 恢复</th><th>共鸣</th></tr></thead><tbody>` + moves.map(m => `<tr class="${m.category === 'super' ? 'super-row' : ''}"><td>${m.name}</td><td>${m.command}</td><td>${m.healing ? '回复 ' + m.healing : m.shots ? m.damage + ' × ' + m.shots.length : m.damage}</td><td>${m.cost || '—'}${m.cost ? '%' : ''}</td></tr>`).join('') + '</tbody></table></section>' : '';
    }).join('');
    showDialog('moves-dialog');
  }
  $('moves').addEventListener('click', showMoves);

  window.addEventListener('keydown', e => {
    if (document.querySelector('dialog[open]')) return;
    if (e.target.closest('select,input,textarea')) return;
    if (e.code === 'F1') { e.preventDefault(); if (!e.repeat) showMoves(); return; }
    if (boundKeys.has(e.code)) {
      e.preventDefault();
      if (match.phase === 'fighting' && !match.paused) { held.add(e.code); if (!e.repeat) taps.add(e.code); }
      return;
    }
    if (e.repeat) return;
    if (e.code === 'Space' || e.code === 'Escape') { e.preventDefault(); pause(); }
    else if (e.code === 'KeyR') { e.preventDefault(); start(); }
    else if (e.code === 'Enter' && !e.target.closest('button,a')) {
      e.preventDefault(); if (match.phase === 'idle' || match.phase === 'roundOver' || match.phase === 'finished' || match.paused) action();
    }
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
      button.setPointerCapture(e.pointerId); touchHeld.add(button.dataset.key); taps.add(button.dataset.key); button.classList.add('held');
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
      }
      if (event.type === 'fight') { fightBanner = 600; clearInput(); tone('fight'); }
      if (event.type === 'voicePulse' && match.fighters[event.side].attack !== 'penguinCall') tone(['tomoriNote', 'tomoriEcho', 'tomoriChorus'][event.pulse], event.side);
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
      if (event.type === 'result') { voicePlayer?.stop(); clearInput(); tone('result'); }
      if (event.type === 'hit' || event.type === 'clash') {
        if (event.type === 'hit' && !event.blocked) voicePlayer?.stop(1 - event.side);
        const color = event.blocked ? '#b1e6ff' : event.type === 'clash' ? '#fff2c4' : colors[event.side];
        fx.push({ x: event.x, y: 438 - event.y, life: 380, max: 380, type: event.blocked ? 'guard' : 'burst', color, text: event.counter ? 'COUNTER' : event.blocked ? 'GUARD' : event.damage ? '-' + event.damage : '' });
        if (!reducedMotion) shake = event.blocked ? 2 : 6;
        if (event.attack === 'special' || event.attack === 'super') flash = reducedMotion ? 0 : 100;
        if (event.attack === 'super') fx.push({ x: event.x, y: 438 - match.fighters[event.side].y, life: 650, max: 650, type: 'shock', color: '#ffa9d2' });
        tone(event.blocked ? 'block' : 'hit', event.side);
      }
    }
  }
  function drawBackground() {
    const magnification = 1.12 + camera.zoom * .34, width = 960 * magnification, height = 540 * magnification;
    const offsetX = Math.max(-(width - 960) / 2, Math.min((width - 960) / 2, (camera.x - 480) * .13 * camera.zoom));
    const offsetY = Math.max(-(height - 540) / 2, Math.min((height - 540) / 2, (camera.y - 300) * .15 * camera.zoom));
    ctx.drawImage(backgrounds[arena], (960 - width) / 2 - offsetX, (540 - height) / 2 - offsetY, width, height);
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
    const terrain = match.options.terrain || { ...assets.stages[arena].terrain, platforms: [], hills: [] };
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
  function drawFighter(side) {
    const f = match.fighters[side];
    const animation = chooseAnimation(match, side);
    let art = assets.characters[f.character], frame = art.frames[match.pose(side)], atlas = atlases[f.character];
    let scale = f.character === 2 ? frame.height / frame.h : 235 / art.frames[0].h;
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
      else {
        art = [assets.anonActions, assets.soyoActions, assets.tomoriActions][f.character];
        atlas = [actionAtlas, soyoActionAtlas, atlases[2]][f.character];
        frame = [actionFrames, soyoActionFrames, tomoriActionFrames][f.character].get(animation);
      }
      scale = frame.height / frame.h;
    }
    const floor = 438, surface = match.surfaceBelow(f.x, f.y, f.dropMs), shadowY = floor - surface;
    ctx.save();
    ctx.globalAlpha = .3; ctx.fillStyle = '#03111e';
    ctx.beginPath(); ctx.ellipse(f.x, shadowY + 3, 37 - Math.min(12, (f.y - surface) * .04), 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = .7;
    ctx.strokeStyle = colors[side]; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(f.x, shadowY + 1, 31, 6, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    const bob = !f.attack && !f.stun && !f.vx && !match.paused ? Math.sin(visualTime * .004 + side) * 1.2 : 0;
    ctx.translate(f.x, floor - f.y + bob);
    ctx.scale(f.facing * scale, scale);
    if (f.attack === 'dive' && acting) ctx.rotate(.18);
    if (!animation && f.crouch && !f.attack && !f.guard) ctx.scale(1.06, .87);
    ctx.shadowColor = ['special', 'super'].includes(f.attack) ? colors[side] : '#051323';
    ctx.shadowBlur = ['special', 'super'].includes(f.attack) ? 16 : 4;
    if (!reducedMotion && acting && ['thrust', 'dive'].includes(f.attack)) {
      for (const distance of [40, 20]) {
        ctx.globalAlpha = distance === 40 ? .08 : .15;
        ctx.drawImage(atlas, frame.x, frame.y, frame.w, frame.h, -frame.ax - distance / scale, -frame.ay - (f.attack === 'dive' ? distance / scale : 0), frame.w, frame.h);
      }
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(atlas, frame.x, frame.y, frame.w, frame.h, -frame.ax, -frame.ay, frame.w, frame.h);
    ctx.restore();
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
    if (MOVES[w.attack]?.penguinOnly) { drawPenguinWave(w); return; }
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
      if (!match.paused) effect.life -= dt;
      const progress = 1 - effect.life / effect.max;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - progress); ctx.translate(effect.x, effect.y);
      ctx.strokeStyle = effect.color; ctx.fillStyle = effect.color;
      ctx.shadowColor = effect.color; ctx.shadowBlur = 16;
      if (effect.type === 'steelBreak') {
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
      ctx.shadowBlur = 0; ctx.textAlign = 'center'; ctx.font = 'bold 13px "Segoe UI",sans-serif';
      ctx.fillText(effect.text || '', 0, -37 - progress * 27); ctx.restore();
    }
    fx = fx.filter(e => e.life > 0);
  }
  function draw(dt) {
    if (cameraFighter !== match.fighters[0]) { cameraFighter = match.fighters[0]; camera.reset(match); }
    else camera.update(match, dt);
    ctx.save(); ctx.setTransform(canvas.width / 960, 0, 0, canvas.height / 540, 0, 0);
    if (shake > .1 && !match.paused) {
      ctx.translate(Math.sin(visualTime * .1) * shake, Math.cos(visualTime * .15) * shake * .5);
      shake *= Math.pow(.85, dt / 16);
    }
    drawBackground();
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
    const next = player.character === 0 && match.phase === 'fighting' && !match.paused
      ? [['medium', 'H 中拳'], ['heavy', 'K 重拳'], ['thrust', 'C 突刺'], ['rush', 'V 三连'], ['dive', 'F 俯冲'], ['super', 'P 奶龙']].find(([key]) => player.energy >= (MOVES[key].cost || 0) && match.canCancel(player, key))
      : null;
    $('chain-hint').textContent = next ? '可接 ' + next[1] : player.landingRecovery ? '落地收招中' : '招式表 F1';
    $('chain-hint').classList.toggle('available', !!next);
    if (player.penguin) $('chain-hint').textContent = 'C 飞踢 · U 糖哭 · F1 招式表';
    document.querySelector('[data-key="KeyG"]').disabled = player.character === 2 && !!player.penguin;
    if (player.character === 1) $('chain-hint').textContent = player.attack === 'heal' ? (player.attackMs < MOVES.heal.start ? '归心 · 凝神中' : '归心 · 已恢复')
      : player.healCooldown ? '归心冷却 ' + (player.healCooldown / 1000).toFixed(1) + ' 秒' : player.hp < 100 ? 'G 自愈 · 35%共鸣' : '招式表 F1';
    for (let side = 0; side < 2; side++) {
      const f = match.fighters[side], n = side + 1;
      $('hp' + n).style.width = f.hp + '%'; $('hptext' + n).textContent = f.hp + ' / 100';
      $('energy' + n).style.width = f.energy + '%'; $('energytext' + n).textContent = f.energy + '%';
      $('energy' + n).closest('.meter').classList.toggle('ready', f.energy >= 60);
      const skill = ROSTER[f.character].skill;
      $('special' + n).textContent = f.character === 0 && f.energy >= 100 ? (side ? '粉色奶龙 · 已就绪' : '按 P · 粉色奶龙·法天象地') : f.energy >= 60 ? (side ? skill + ' · 已就绪' : '按 L · ' + skill + '就绪') : (side ? skill : '共鸣 60% 可释放必杀');
      if (f.character === 1 && f.energy >= 50) $('special' + n).textContent = side ? '小天素罗 · 已就绪' : '按 T · 小天素罗（50%）';
      if (f.character === 1 && f.hp < 100 && f.energy >= MOVES.heal.cost && !f.healCooldown) $('special' + n).textContent = side ? '归心·自愈 · 已就绪' : '按 G · 归心·自愈（35%）';
      if (f.character === 2 && f.energy < 60) $('special' + n).textContent = f.energy >= 30 ? (side ? '诗句回声 · 已就绪' : '按 T · 诗句回声（30%）') : f.energy >= 20 ? (side ? '微光音符 · 已就绪' : '按 I · 微光音符（20%）') : '共鸣20% · 微光音符';
      if (f.character === 2 && f.attack === 'tomoriChorus') $('special' + n).textContent = '迷途之歌 · ' + Math.min(3, f.hitMarks.length + 1) + ' / 3';
      if (f.summons) $('special' + n).textContent = '小天素罗 ×3 · ' + (f.summons.ms / 1000).toFixed(1) + ' 秒';
      if (f.shield) $('special' + n).textContent = '钢板 ' + f.shield.hp + '/40 · ' + (f.shield.ms / 1000).toFixed(1) + ' 秒';
      if (f.penguin) $('special' + n).textContent = '凑企鹅 · ' + (f.penguin.ms / 1000).toFixed(1) + ' 秒';
      [...$('wins' + n).children].forEach((pip, i) => pip.classList.toggle('won', i < match.wins[side]));
      $('combo' + n).innerHTML = f.combo > 1 && f.comboMs > 0 && match.phase === 'fighting' ? f.combo + ' <small>HITS</small>' : '';
    }
    $('timer').textContent = match.options.mode === 'practice' ? '∞' : String(Math.ceil(match.remaining / 1000)).padStart(2, '0');
    const superFighter = match.fighters.find(f => f.attack === 'super');
    $('super-title').hidden = !superFighter || superFighter.attackMs > 1550 || match.paused || match.phase !== 'fighting';
    $('super-title').classList.toggle('from-right', superFighter === match.fighters[1]);
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
      if (uiPhase === 'paused') overlayContent('', '已暂停', '', '继续', '空格 / Esc 继续');
      if (uiPhase === 'roundOver' || uiPhase === 'finished') {
        const win = match.winner, title = win < 0 ? '平局' : ROSTER[match.fighters[win].character].name + '获胜';
        const description = `${match.reason} · ${match.wins[0]} : ${match.wins[1]}`;
        overlayContent(uiPhase === 'finished' ? '对战结束' : '回合结束', title, description, uiPhase === 'finished' ? '再来一场' : '下一回合', '按 ENTER 继续');
      }
    }
    $('overlay-action').disabled = uiPhase === 'roundOver' && match.phaseMs > 0;
    $('status').textContent = { idle: '等待上场', ready: '回合准备', fighting: match.options.mode === 'practice' ? '自由练习 · 共鸣自动回充' : match.options.mode === 'duel' ? '本地双人对战中' : '与' + ROSTER[match.fighters[1].character].shortName + '切磋中', paused: '对战已暂停', roundOver: '回合结束', finished: '本场对战结束' }[uiPhase];
  }
  function frame(time) {
    const dt = Math.min(50, Math.max(0, time - (lastTime || time))); lastTime = time;
    if (!match.paused) visualTime += dt;
    const elapsedBefore = match.elapsed;
    match.advance(dt, input(keys1), input(keys2));
    if (match.elapsed !== elapsedBefore) {
      // Keep a quick press during hitstop until a simulation tick consumes it.
      for (const key of taps) {
        for (const [side, map] of [[0, keys1], [1, keys2]]) {
          const action = Object.keys(map).find(action => map[action] === key || (side === 0 && action === 'dash' && key === 'ShiftRight'));
          if (action && match.previous[side][action]) taps.delete(key);
        }
      }
    }
    consumeEvents(); draw(dt); updateUI(dt); requestAnimationFrame(frame);
  }
  async function boot() {
    try {
      [atlases, backgrounds, normalAtlas, dragonAtlas, actionAtlas, tensoraAtlas, soyoActionAtlas, penguinAtlas] = await Promise.all([
        Promise.all(assets.characters.map(art => loadImage(art.atlas))),
        Promise.all(assets.backgrounds.map(loadImage)),
        loadImage(assets.anonNormals.atlas), loadImage(assets.milkDragon.atlas), loadImage(assets.anonActions.atlas), loadImage(assets.soyoTensora.atlas), loadImage(assets.soyoActions.atlas), loadImage(assets.penguin.atlas),
      ]);
      renderStageChoices();
      loaded = true; $('loading').hidden = true; updateMode(); updateCharacterInfo(); requestAnimationFrame(frame);
    } catch (error) {
      $('loading').textContent = '素材加载失败，请重新打开完整的 index.html。'; console.error(error);
    }
  }
  // A read-only game reference is useful for inspecting the standalone prototype.
  window.mygoGame = { get match() { return match; }, get loaded() { return loaded; }, get camera() { return camera.snapshot(); } };
  boot();
})();
