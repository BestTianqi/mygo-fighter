(function () {
  'use strict';
  const { Match, ROSTER, MOVES, moveList, WORLD, MAX_HEALTH, ROUND_END_TIMING } = window.MygoFighter;
  const assets = window.MYGO_ASSETS;
  const mujica = window.MygoMujica;
  const mewtype = window.MygoMewtype;
  const characterForms = { ...assets.mujicaForms, ...assets.mewtypeForms };
  characterForms[6] = { ...characterForms[6], customer: assets.sakikoCustomerActions };
  for (const [id, art] of Object.entries(assets.mujicaMaskForms)) characterForms[id] = { ...characterForms[id], mask: art };
  characterForms[7] = { ...characterForms[7], ...Object.fromEntries(
    Object.entries(assets.memeCrawlForms).map(([form, art]) => [form + '-crawl', art])) };
  const mujicaAtlases = new Map(), mujicaLoads = new Map();
  const mujicaFrames = new Map(Object.entries(characterForms).flatMap(([id, forms]) => Object.entries(forms).map(([form, art]) => [id + ":" + form, new Map(art.frames.map(frame => [frame.name, frame]))])));
  const chooseAnimation = window.MygoAnimation.createAnimator();
  const mujicaMotion = window.MygoAnimation.createMujicaMotion();
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
  let arena = 0, battleArena = 0, loaded = false, inMenu = true, inSelection = false, starting = false, startRequest = 0;
  let matchConfig = null, teamHudKey = '';
  let match = new Match({ characters: [0, 1], terrain: assets.stages[arena].terrain });
  const camera = new MygoCamera.Camera();
  let cameraFighter;
  let lastTime = 0, visualTime = 0, shake = 0, flash = 0, fightBanner = 0;
  let lastUiPhase = '', soundEnabled = true, audioContext;
  let voicePlayer, summonVoicePlayer, superVoicePlayer, transformMusicPlayer, voiceLoading;
  const memeMedia = window.MygoMemeMedia;
  const memeCutins = memeMedia.createCutinPlayer([$('meme-cutin-0'), $('meme-cutin-1')]);
  const soyoCutins = [0, 1].map(side => {
    const panel = $('soyo-cutin-' + side), video = panel.querySelector('video');
    video.src = assets.soyoSuperVideo;
    video.defaultPlaybackRate = 1;
    video.playbackRate = 1;
    const cutin = { panel, video, active: false };
    video.onended = () => { cutin.active = false; panel.hidden = true; };
    return cutin;
  });
  let fx = [], impactMotion = null, inkMs = 0, inkMax = 200, noiseBuffer;
  const dialogState = new Map();
  let atlases, backgrounds, normalAtlas, dragonAtlas, actionAtlas, tensoraAtlas, soyoActionAtlas, penguinAtlas;
  let parfaitActionAtlas, parfaitImage;
  let jabAtlases, menuPortraits, menuStagePortraits;
  let menuBand = null;
  const portraitAtlases = new Map();
  let soyoFinishArt, uikaFinishArt;
  let finishSnapshot = null;
  let finishCueStage = '', roundRevealFighter = null;
  const selectionScreen = MygoSelection.createSelectionScreen({ root: $('character-select'), roster: ROSTER, assets,
    onConfirm: config => launchMatch(config), onBack: () => returnToMenu() });
  const lan = MygoLan.createLan({ assets, roster: ROSTER,
    onPrepare: async config => { await launchMatch(config); if (inMenu || starting) throw Error('角色准备失败，请返回房间重试。'); },
    onLobby: () => { returnToMenu(); },
    onDisconnect: () => { if (lan.active) { match.setPaused(true); clearInput(); lastUiPhase=''; } },
    onState: (state, events) => {
      const fighters=match.fighters, pending=match.events;
      Object.assign(match,state);match.fighters=state.fighters.map((f,i)=>Object.assign(fighters[i],f));
      match.events=pending.concat(events);updateCharacterInfo();
    } });
  document.addEventListener('lan-unlock-audio',()=>{setSoundEnabled(soundEnabled);});

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = async () => { try { await im.decode(); resolve(im); } catch (error) { reject(error); } };
      im.onerror = reject; im.src = src;
    });
  }
  async function prepareCharacters(characters) {
    await Promise.all([...new Set(characters)].filter(id => id >= 5).flatMap(id => Object.keys(characterForms[id]).map(form => {
      const key = id + ':' + form;
      if (mujicaAtlases.has(key)) return Promise.resolve();
      if (!mujicaLoads.has(key)) mujicaLoads.set(key, loadImage(characterForms[id][form].atlas).then(im => {
        mujicaAtlases.set(key, im); mujicaLoads.delete(key);
      }, error => { mujicaLoads.delete(key); throw error; }));
      return mujicaLoads.get(key);
    })));
    await Promise.all([...new Set(characters)].filter(id => assets.mujicaPortraits?.[id]).flatMap(id => ['normal', 'stage'].map(async form => {
      const key = id + ':' + form;
      if (!portraitAtlases.has(key)) portraitAtlases.set(key, await loadImage(assets.mujicaPortraits[id][form].idle.atlas));
    })));
  }
  function setBattleLoading(value) {
    $('loading').hidden = !value;
    if (value) $('loading').textContent = '正在准备双方角色与动作…';
    document.querySelectorAll('.game-tools button:not(#home)').forEach(button => button.disabled = value);
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
      if (character >= 5) {
        for (const [form, art] of Object.entries(characterForms[character])) groups.set(mujicaAtlases.get(character + ':' + form), art.frames[0]);
        continue;
      }
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
    voiceLoading ||= Promise.all(Object.entries({ ...assets.penguinVoices, ...assets.soyoVoices, ...assets.memeVoices, ...assets.summonVoices, ...assets.transformMusic }).map(async ([move, src]) => {
      let bytes;
      if (src.startsWith('data:')) bytes = Uint8Array.from(atob(src.split(',')[1]), c => c.charCodeAt(0)).buffer;
      else {
        const response = await fetch(src);
        if (!response.ok) throw new Error('语音加载失败：' + move + ' (' + response.status + ')');
        bytes = await response.arrayBuffer();
      }
      return [move, await audioContext.decodeAudioData(bytes)];
    })).then(entries => {
      voicePlayer = MygoVoice.createVoicePlayer(audioContext, Object.fromEntries(entries));
      summonVoicePlayer = MygoVoice.createVoicePlayer(audioContext, Object.fromEntries(entries));
      superVoicePlayer = MygoVoice.createVoicePlayer(audioContext, Object.fromEntries(entries));
      transformMusicPlayer = MygoVoice.createVoicePlayer(audioContext, Object.fromEntries(entries));
      voicePlayer.setEnabled(soundEnabled); voicePlayer.setPaused(match.paused);
      summonVoicePlayer.setEnabled(soundEnabled); summonVoicePlayer.setPaused(match.paused);
      superVoicePlayer.setEnabled(soundEnabled); superVoicePlayer.setPaused(match.paused);
      transformMusicPlayer.setEnabled(soundEnabled); transformMusicPlayer.setPaused(match.paused);
    }).catch(error => { voiceLoading = null; throw error; });
    return voiceLoading;
  }
  function stopSoyoCutins(side) {
    memeCutins.stop(side);
    superVoicePlayer?.stop(side);
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
    memeCutins.sync(match.fighters, match.paused, match.phase);
    for (const [side, cutin] of soyoCutins.entries()) {
      if (!cutin.active) continue;
      if (match.phase !== 'fighting' || match.fighters[side].character !== 1) { stopSoyoCutins(side); continue; }
      cutin.panel.hidden = match.paused;
      if (match.paused) cutin.video.pause();
      else if (cutin.video.paused && !cutin.video.ended) cutin.video.play().catch(() => {});
    }
  }
  function syncSummonVoices() {
    for (const [side, fighter] of match.fighters.entries()) {
      for (let id = 0; id < 3; id++) {
        if (match.phase !== 'fighting' || !fighter.summons?.units.some(unit => unit.id === id && unit.hp > 0)) summonVoicePlayer?.stop(side * 3 + id);
      }
    }
  }
  function presentationFor(f, attack) {
    return memeMedia.resolve(assets, f, MOVES[attack]?.base || attack, schemeFor(f));
  }
  function tone(kind, side = 0, weight = 1, recorded = true) {
    if (!soundEnabled || !audioContext) return;
    if (kind === 'result' || kind === 'finishReveal') {
      const now = audioContext.currentTime, reveal = kind === 'finishReveal';
      (reveal ? [220, 330, 440] : [95, 47]).forEach((pitch, i) => {
        const osc = audioContext.createOscillator(), gain = audioContext.createGain(), at = now + (reveal ? i * .035 : 0);
        osc.type = reveal ? 'triangle' : 'sine'; osc.frequency.setValueAtTime(pitch, at);
        osc.frequency.exponentialRampToValueAtTime(reveal ? pitch : 28, at + .18);
        gain.gain.setValueAtTime(.0001, at); gain.gain.exponentialRampToValueAtTime(reveal ? .025 : .075, at + .008);
        gain.gain.exponentialRampToValueAtTime(.0001, at + .24);
        osc.connect(gain); gain.connect(audioContext.destination); osc.start(at); osc.stop(at + .25);
      }); return;
    }
    const presentation = recorded && presentationFor(match.fighters[side], kind);
    if (recorded && MOVES[kind]?.category === 'super' && superVoicePlayer?.play(presentation?.voice || kind, side)) { voicePlayer?.stop(side); return; }
    if (recorded && voicePlayer?.play(presentation?.voice || kind, side)) return;
    if (MOVES[kind]?.ownerCharacter >= 5 || kind === 'mujicaTransform') {
      const owner = MOVES[kind]?.ownerCharacter ?? match.fighters[side].character;
      const now = audioContext.currentTime, pitches = ({
        5: [82, 123], 6: [262, 330, 392], 9: [140, 85],
        10: [523, 659, 784], 11: [147, 220, 294], 12: [330, 440, 554],
        13: [110, 55, 165], 14: [392, 494, 587],
      })[owner] || [196, 247, 294];
      pitches.forEach((pitch, i) => {
        const osc = audioContext.createOscillator(), gain = audioContext.createGain(), t = now + i * .025;
        osc.type = [6, 10, 12].includes(owner) ? 'sine' : 'triangle'; osc.frequency.setValueAtTime(pitch, t);
        osc.frequency.exponentialRampToValueAtTime(owner === 9 || owner === 13 ? 40 : pitch * .97, t + .18);
        gain.gain.setValueAtTime(.0001, t); gain.gain.exponentialRampToValueAtTime(.04, t + .006); gain.gain.exponentialRampToValueAtTime(.0001, t + .22);
        osc.connect(gain); gain.connect(audioContext.destination); osc.start(t); osc.stop(t + .23);
      }); return;
    }
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
    inMenu = false; inSelection = false; selectionScreen.close(); $('main-menu').hidden = true; $('main-menu').inert = true;
    $('battle-screen').hidden = false; $('battle-screen').inert = false;
    document.body.classList.remove('menu-open');
  }
  function renderMainMenu() {
    $('menu-selection').textContent = selectedCharacters().map(c => ROSTER[c].name).join(' × ');
    $('menu-stage').textContent = assets.stages[arena].name;
    const selectedBand = menuBand || ROSTER[Number($('player-character').value)].band;
    document.querySelectorAll('[data-menu-band]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.menuBand === (selectedBand || 'mygo'))));
    const showMujica = selectedBand === 'mujica', showMewtype = selectedBand === 'mewtype';
    $('main-menu').classList.toggle('mujica-menu', showMujica);
    $('main-menu').classList.toggle('mewtype-menu', showMewtype);
    $('menu-wordmark').textContent = showMewtype ? '夢限大 MewType' : showMujica ? 'Ave Mujica' : 'MyGO!!!!!';
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
    if (showMujica) lineup.splice(0, lineup.length,
      { character: 5, x: 690, y: 770, height: 470 },
      { character: 7, x: 840, y: 755, height: 470 },
      { character: 8, x: 1055, y: 770, height: 470 },
      { character: 9, x: 1275, y: 770, height: 480 },
      { character: 6, x: 920, y: 835, height: 470 });
    if (showMewtype) lineup.splice(0, lineup.length,
      { character: 11, x: 690, y: 770, height: 470 },
      { character: 12, x: 840, y: 755, height: 470 },
      { character: 13, x: 1055, y: 770, height: 465 },
      { character: 14, x: 1275, y: 770, height: 480 },
      { character: 10, x: 920, y: 835, height: 470 });
    for (const person of lineup) {
      if (person.character >= 5) {
        const portrait = showMujica ? menuStagePortraits[person.character - 5] : menuPortraits[person.character - 5], scale = person.height / portrait.height;
        painter.save(); painter.shadowColor = '#090d21'; painter.shadowBlur = 18;
        painter.drawImage(portrait, person.x - portrait.width * scale / 2, person.y - person.height, portrait.width * scale, person.height);
        painter.restore(); continue;
      }
      const art = assets.characters[person.character], frame = art.frames[0], scale = person.height / frame.h;
      painter.save(); painter.shadowColor = '#090d21'; painter.shadowBlur = 18;
      painter.drawImage(atlases[person.character], frame.x, frame.y, frame.w, frame.h,
        person.x - frame.ax * scale, person.y - frame.ay * scale, frame.w * scale, frame.h * scale);
      painter.restore();
    }
  }
  function returnToMenu() {
    startRequest++; starting = false; setBattleLoading(false);
    pause(true); clearInput(); selectionScreen.close(); inSelection = false; inMenu = true;
    $('battle-screen').hidden = true; $('battle-screen').inert = true;
    $('main-menu').hidden = false; $('main-menu').inert = false; document.body.classList.add('menu-open');
    $('menu-resume').hidden = match.phase === 'idle';
    $('main-menu').classList.toggle('has-match', match.phase !== 'idle');
    $('menu-resume').textContent = match.roundEnd && match.phaseMs > 0 ? '继续胜利演出 ↗' : match.phase === 'finished' ? '返回对战结果 ↗' : '继续对战 ↗';
    renderMainMenu();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    ($('menu-resume').hidden ? $('menu-start') : $('menu-resume')).focus({ preventScroll: true });
    $('main-menu').scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  function beginMode(mode, format = '1v1') { $('mode').value = mode; $('match-format').value = format; start(); }
  $('menu-start').addEventListener('click', () => beginMode('cpu'));
  $('menu-duel').addEventListener('click', () => beginMode('duel'));
  $('menu-practice').addEventListener('click', () => beginMode('practice'));
  $('menu-team').addEventListener('click', () => beginMode('cpu', '3v3'));
  $('menu-settings').addEventListener('click', () => showDialog('settings-dialog'));
  $('menu-help').addEventListener('click', () => {
    const character = Number($('player-character').value);
    $('help-player-name').textContent = '1P / ' + ROSTER[character].name;
    $('help-skills').innerHTML = skillTable({ character });
    showDialog('help-dialog');
  });
  $('menu-resume').addEventListener('click', () => { showBattle(); updateCharacterInfo(); pause(false); });
  $('home').addEventListener('click', () => lan.connected ? lan.leave() : returnToMenu());
  document.querySelectorAll('[data-menu-band]').forEach(button => button.addEventListener('click', () => { menuBand = button.dataset.menuBand; renderMainMenu(); }));
  $('overlay-home').addEventListener('click', returnToMenu);
  $('overlay-reselect').addEventListener('click', () => {
    if (lan.connected) { lan.command('lobby'); return; }
    if (matchConfig) { $('mode').value = matchConfig.mode; $('match-format').value = matchConfig.format; }
    start(true);
  });
  function start(keepLineup = false) {
    if (!loaded || starting) return;
    pause(true); clearInput(); inSelection = true; inMenu = false;
    $('settings-dialog').close(); $('main-menu').hidden = true; $('main-menu').inert = true;
    $('battle-screen').hidden = true; $('battle-screen').inert = true;
    document.body.classList.remove('menu-open');
    const mode = $('mode').value, format = mode === 'practice' ? '1v1' : $('match-format').value;
    selectionScreen.open({ mode, format, characters: selectedCharacters(),
      ...(keepLineup === true && matchConfig ? { teams: matchConfig.teams || matchConfig.characters.map(id => [id]) } : {}), settings: {
      arena, difficulty: Number($('difficulty').value), sound: soundEnabled,
      terrain: $('terrain-enabled').checked, dummy: $('dummy').value,
    } });
    $('character-select').scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  async function launchMatch(config) {
    if (!loaded || starting) return;
    const request = ++startRequest, characters = [...config.characters];
    const teamMode = config.format === '3v3' && config.mode !== 'practice';
    const teams = teamMode ? config.teams.map(team => [...team]) : undefined;
    const allCharacters = [...new Set(teamMode ? teams.flat() : characters)];
    if (config.settings) {
      arena = config.settings.arena;
      $('difficulty').value = config.settings.difficulty;
      $('terrain-enabled').checked = config.settings.terrain;
      $('dummy').value = config.settings.dummy;
      soundEnabled = config.settings.sound;
      syncStageChoices();
    }
    // Unlock sound inside the Start click, before character loading yields to the browser.
    const audioReady = setSoundEnabled(soundEnabled);
    $('mode').value = config.mode; $('match-format').value = teamMode ? '3v3' : '1v1';
    $('player-character').value = characters[0]; $('opponent-character').value = characters[1];
    starting = true; showBattle(); setBattleLoading(true);
    $('settings-dialog').close(); clearInput();
    voicePlayer?.stop(); summonVoicePlayer?.stop(); transformMusicPlayer?.stop(); stopSoyoCutins();
    try {
      await Promise.all([prepareCharacters(allCharacters), audioReady]);
      if (request !== startRequest) return;
      battleArena = arena; warmCharacterArt(allCharacters);
      matchConfig = { mode: config.mode, format: teamMode ? '3v3' : '1v1', characters, ...(teams ? {teams} : {}) };
      match = new Match({ ...matchConfig, dummy: $('dummy').value, difficulty: Number($('difficulty').value), terrain: selectedTerrain(), seed: Date.now() >>> 0 });
      match.start(); clearInput(); fx = []; shake = flash = inkMs = 0; impactMotion = null; lastUiPhase = '';
      for (const key of mujicaAtlases.keys()) if (!allCharacters.includes(Number(key.split(':')[0]))) mujicaAtlases.delete(key);
      voicePlayer?.setPaused(false); summonVoicePlayer?.setPaused(false); superVoicePlayer?.setPaused(false); transformMusicPlayer?.setPaused(false); starting = false; setBattleLoading(false);
      $('setup-note').hidden = true; $('start').textContent = '重新开始'; $('last-move').textContent = '';
      updateMode(); updateCharacterInfo(); stage.focus({ preventScroll: true });
      if (matchMedia('(max-width: 850px)').matches) stage.scrollIntoView({ block: 'start', behavior: 'instant' });
      if (soundEnabled && audioContext) audioContext.resume();
    } catch (error) {
      if (request !== startRequest) return;
      returnToMenu(); $('menu-loading').hidden = false; $('menu-loading').textContent = '角色素材加载失败，请重新打开完整游戏文件。'; console.error(error);
    }
  }
  function action() {
    if (!loaded) return;
    if (lan.connected) { lan.command(match.paused ? 'pause' : 'restart', match.paused ? {paused:false} : {}); return; }
    if (match.paused) pause(false);
    else if (match.phase === 'roundOver') {
      if (match.nextRound()) { voicePlayer?.stop(); summonVoicePlayer?.stop(); transformMusicPlayer?.stop(); stopSoyoCutins(); clearInput(); fx = []; lastUiPhase = ''; updateCharacterInfo(); stage.focus({ preventScroll: true }); }
    } else if (match.phase === 'finished' && matchConfig) launchMatch(matchConfig);
    else start();
  }
  function pause(value = !match.paused) {
    if (lan.connected) { clearInput(); lan.command('pause', {paused:value}); return; }
    if (!loaded || match.phase === 'idle' || (!value && (inMenu || inSelection))) return;
    match.setPaused(value); clearInput(); lastUiPhase = '';
    voicePlayer?.setPaused(value);
    summonVoicePlayer?.setPaused(value);
    superVoicePlayer?.setPaused(value);
    transformMusicPlayer?.setPaused(value);
    syncSoyoCutins();
    if (!value) stage.focus({ preventScroll: true });
  }
  function updateMode() {
    const duel = match.options.mode === 'duel', practice = match.options.mode === 'practice';
    $('p2-tag').textContent = duel ? '2P' : practice ? '木桩' : 'CPU'; $('meter-p2-label').textContent = $('p2-tag').textContent;
    $('difficulty').disabled = $('mode').value !== 'cpu';
    $('practice-settings').hidden = $('mode').value !== 'practice';
    $('match-format').disabled = $('mode').value === 'practice';
  }
  function selectedCharacters() { return [Number($('player-character').value), Number($('opponent-character').value)]; }
  function selectedTerrain() { return $('terrain-enabled').checked ? assets.stages[arena].terrain : null; }
  function updateCharacterInfo() {
    match.fighters.forEach((f, side) => {
      const profile = ROSTER[f.character];
      $('name' + (side + 1)).textContent = profile.name + (f.penguin ? ' · 凑企鹅' : f.stageForm ? ' · ' + profile.stageName : '');
    });
    const player = match.fighters[lan.connected ? lan.side : 0], scheme = schemeFor(player);
    $('help-player-name').textContent = '1P / ' + ROSTER[player.character].name;
    for (const [i, key] of ['KeyU', 'KeyI', 'KeyO'].entries()) document.querySelector('[data-key="' + key + '"]').textContent = ['U', 'I', 'O'][i] + ' ' + MOVES[scheme.base[i]].name;
    document.querySelector('[data-key="KeyH"]').hidden = !scheme.transform;
    document.querySelector('[data-key="KeyH"]').disabled = !!player.penguin || !!player.stageForm;
    document.querySelector('[data-key="KeyH"]').textContent = player.character >= 5 ? 'H 演出变身' : 'H 凑企鹅';
    document.querySelector('[data-key="KeyP"]').hidden = !scheme.super;
    document.querySelector('[data-key="KeyP"]').textContent = 'P ' + (scheme.super ? MOVES[scheme.super].name : '大招');
    $('help-skills').innerHTML = skillTable(player);
    canvas.setAttribute('aria-label', match.fighters.map(f => ROSTER[f.character].name).join(' 对战 '));
  }
  function updateTeamHUD() {
    const enabled = match.isTeamBattle;
    $('stage').classList.toggle('team-battle', enabled);
    for (let side = 0; side < 2; side++) {
      $('team-roster-' + side).hidden = !enabled;
      $('wins' + (side + 1)).hidden = enabled;
    }
    if (!enabled) { teamHudKey = ''; return; }
    const key = JSON.stringify([match.teams, match.teamIndices]);
    if (key === teamHudKey) return;
    teamHudKey = key;
    for (let side = 0; side < 2; side++) {
      const roster = $('team-roster-' + side); roster.replaceChildren();
      match.teams[side].forEach((character, slot) => {
        const state = slot < match.teamIndices[side] ? 'defeated' : slot === match.teamIndices[side] ? 'current' : 'reserved';
        const member = document.createElement('div'), image = document.createElement('img'), order = document.createElement('span');
        member.className = 'team-member ' + state;
        member.title = ROSTER[character].name + ' · ' + ({defeated:'已退场',current:'出战',reserved:'候场'})[state];
        member.dataset.character = character; image.src = assets.characters[character].portrait; image.alt = ROSTER[character].name;
        order.textContent = slot + 1; member.append(image, order); roster.append(member);
      });
    }
  }
  function markSetup() {
    $('difficulty').disabled = $('mode').value !== 'cpu';
    $('practice-settings').hidden = $('mode').value !== 'practice';
    $('match-format').disabled = $('mode').value === 'practice';
    if ($('mode').value === 'practice') $('match-format').value = '1v1';
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
  $('restart').addEventListener('click', () => lan.connected ? lan.command('restart') : matchConfig ? launchMatch(matchConfig) : start());
  $('mode').addEventListener('change', markSetup);
  $('match-format').addEventListener('change', markSetup);
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
      const button = document.createElement('button'), image = document.createElement('img'), label = document.createElement('span'), detail = document.createElement('small');
      button.type = 'button'; button.className = 'stage-choice'; button.dataset.stage = index;
      button.dataset.category = scene.category;
      button.setAttribute('aria-label', scene.name + ' · ' + scene.layout);
      button.classList.toggle('selected', index === arena);
      button.setAttribute('aria-pressed', String(index === arena));
      image.src = scene.thumbnail; image.alt = ''; image.width = 320; image.height = 180;
      label.textContent = scene.name; detail.textContent = scene.layout;
      button.append(image, label, detail); fragment.append(button);
    });
    $('stage-choices').replaceChildren(fragment);
  }
  function syncStageChoices() {
    $('stage-choices').querySelectorAll('[data-stage]').forEach(button => {
      const selected = Number(button.dataset.stage) === arena;
      button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
    });
  }
  $('stage-filter').addEventListener('change', () => {
    const category = $('stage-filter').value;
    document.querySelectorAll('.stage-choice').forEach(button => { button.hidden = category !== 'all' && button.dataset.category !== category; });
  });
  $('stage-choices').addEventListener('click', event => {
    const button = event.target.closest('[data-stage]');
    if (!button) return;
    arena = Number(button.dataset.stage);
    if (!inMenu) { battleArena = arena; match.setTerrain(selectedTerrain()); }
    else if (match.phase !== 'idle') $('setup-note').hidden = false;
    syncStageChoices();
    if (inMenu) renderMainMenu();
  });
  function syncSoundControls() {
    voicePlayer?.setEnabled(soundEnabled);
    summonVoicePlayer?.setEnabled(soundEnabled);
    superVoicePlayer?.setEnabled(soundEnabled);
    transformMusicPlayer?.setEnabled(soundEnabled);
    $('sound').setAttribute('aria-pressed', String(soundEnabled));
    $('sound').setAttribute('aria-label', soundEnabled ? '关闭音效' : '开启音效');
    $('sound').innerHTML = '♪ <span>' + (soundEnabled ? '音效开' : '音效关') + '</span>';
  }
  async function setSoundEnabled(value, cue = false) {
    soundEnabled = value; syncSoundControls();
    if (!value) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      await Promise.all([audioContext.resume(), prepareVoices()]);
      if (soundEnabled && cue) tone('fight');
    } catch {
      soundEnabled = false; syncSoundControls();
    }
  }
  $('sound').addEventListener('click', () => setSoundEnabled(!soundEnabled, true));
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
    return '<table><thead><tr><th>招式</th><th>1P</th><th>2P 小键盘</th><th>共鸣</th></tr></thead><tbody>' + rows.map(({ move, key, key2 }) => {
      const presentation = presentationFor(f, move), name = MOVES[move].name;
      const label = presentation?.label && !name.includes(presentation.label) ? ' · ' + presentation.label : '';
      const effect = move === 'soyoSuper' ? ' · 四周扩散，硬直2秒，释放后可行动' : move === 'penguinSuper' ? ' · 1秒内五层扩散，每层10伤害' :
        MOVES[move].forwardCrawl ? ' · 1秒向前爬行，五段各10伤害' :
        move === 'penguinHey' ? ' · 近身震慑' : move === 'penguinCall' ? ' · 向前冲撞三连' :
        MOVES[move].mortis ? ' · ' + ({ double:'后撤后替身二连击',parry:'架势中格挡正面攻击并反击',snare:'预警后牵线拉回对手',theater:'双侧人偶三幕攻击，前两幕拉近、终幕挑空',toddler:'哭喊震退周围对手',burger:'向前投掷汉堡' })[MOVES[move].mortis] :
        move === 'anonCry' ? ' · 向前音波' : move === 'soyoCutline' ? ' · 前方交叉琴弦，二段击退' : '';
      return `<tr><td>${name}${label}${effect}</td><td>${key}</td><td>${key2}</td><td>${MOVES[move].cost || 0}%</td></tr>`;
    }).join('') + '</tbody></table>';
  }
  function showMoves() {
    const f = match.fighters[lan.connected ? lan.side : 0];
    $('moves-title').textContent = ROSTER[f.character].name + (f.penguin ? ' · 凑企鹅' : f.stageForm ? ' · ' + ROSTER[f.character].stageName : '') + ' · 招式表';
    $('moves-intro').textContent = 'J 攻击（三段连按） · K 重击或腿击 · L 瞬移（消耗10共鸣）；2P 对应小键盘1 / 2 / 3。站立、蹲下和空中各有对应攻击动作。';
    $('moves-content').innerHTML = skillTable(f);
    showDialog('moves-dialog');
  }
  $('moves').addEventListener('click', showMoves);

  window.addEventListener('keydown', e => {
    if (inMenu || inSelection || starting || document.querySelector('dialog[open]')) return;
    if (e.target.closest('select,input,textarea')) return;
    if (e.code === 'F1') { e.preventDefault(); if (!e.repeat) showMoves(); return; }
    if (boundKeys.has(e.code)) {
      if (lan.connected && !Object.values(keys1).includes(e.code)) return;
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
      if (starting || match.phase !== 'fighting' || match.paused) return;
      button.setPointerCapture(e.pointerId); touchHeld.add(button.dataset.key); recordPress(button.dataset.key); button.classList.add('held');
    });
    button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
    button.addEventListener('contextmenu', e => e.preventDefault());
  });

  function consumeEvents() {
    for (const event of match.drainEvents()) {
      if (event.type === 'teamAdvance' || event.type === 'roundAdvance') {
        roundRevealFighter = match.fighters[0];
        voicePlayer?.stop(); summonVoicePlayer?.stop(); transformMusicPlayer?.stop(); stopSoyoCutins(); clearInput();
        fx = []; shake = flash = inkMs = fightBanner = 0; impactMotion = null; lastUiPhase = '';
        warmCharacterArt(event.characters); updateCharacterInfo();
      }
      if (event.type === 'attack') {
        if (event.attack !== 'penguinTransform') tone(event.attack, event.side);
        const f = match.fighters[event.side], presentation = presentationFor(f, event.attack);
        if (presentation?.video && presentation.slot === 'p' && event.attack !== 'soyoSuper') {
          $('meme-cutin-' + event.side).querySelector('strong').textContent = presentation.label;
          memeCutins.start(event.side, presentation, { character: f.character, attack: event.attack });
        }
        if (presentation?.label && presentation.slot !== 'p') fx.push({ type: 'burst', x: f.x, y: 438 - f.y - 230,
          life: 950, max: 950, color: ROSTER[f.character].color, text: presentation.label });
        if (!event.side) $('last-move').textContent = moveList(match.fighters[0].character, !!(match.fighters[0].penguin || match.fighters[0].stageForm)).find(m => m.key === event.attack)?.name || MOVES[event.attack].name;
        if (event.attack === 'super') { flash = reducedMotion ? 0 : 150; tone('special', event.side, 1, false); }
        if (event.attack === 'soyoSuper') { startSoyoCutin(event.side); flash = reducedMotion ? 0 : 100; }
        if (MOVES[event.attack]?.ownerCharacter >= 5 && MOVES[event.attack].category === 'super') flash = reducedMotion ? 0 : 100;
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
      // Penguin calls and the five-wave encore use their recorded track once per cast.
      if (event.type === 'voicePulse' && !['penguinCall', 'penguinSuper'].includes(event.attack)) {
        const f = match.fighters[event.side];
        tone(f.character >= 5 ? event.attack : f.character === 4 ? 'rikiShock' : f.character === 3 ? 'ranaSolo' : ['tomoriNote', 'tomoriEcho', 'tomoriChorus'][event.pulse], event.side, 1, false);
      }
      if (event.type === 'stageFormStart' || event.type === 'stageFormEnd') {
        const f = match.fighters[event.side];
        updateCharacterInfo();
        fx.push({ x: f.x, y: 438 - f.y - 110, life: 650, max: 650, type: 'burst', color: ROSTER[f.character].color,
          text: event.type === 'stageFormStart' ? ROSTER[f.character].stageName : '谢幕' });
        if (event.type === 'stageFormStart') {
          if (!reducedMotion) { inkMs = inkMax = 720; shake = Math.max(shake, 7); }
          if (f.character === 7) transformMusicPlayer?.play('uikaImprisoned', event.side);
          else tone('mujicaTransform', event.side);
        } else { transformMusicPlayer?.stop(event.side); voicePlayer?.stop(event.side); memeCutins.stop(event.side); }
      }
      if (event.type === 'counter' || event.type === 'areaPulse') {
        fx.push({ x: event.x, y: 438 - event.y, life: 450, max: 450, type: event.type === 'counter' ? 'guard' : 'shock',
          color: ROSTER[match.fighters[event.side].character].color, text: event.type === 'counter' ? '反拨' : '' });
        tone(event.type === 'counter' ? 'block' : 'hit', event.side);
      }
      if (event.type === 'memePulse') fx.push({ type: 'incantation', x: event.x, y: 438 - event.y - 35,
        life: 1300, max: 1300, color: '#dbabff', text: event.glyph, glyph: event.glyph,
        pulse: event.pulse, radius: event.radius });
      if (event.type === 'hardControl') {
        voicePlayer?.stop(event.target); memeCutins.stop(event.target);
        if (!match.fighters[event.target].soyoSuper) stopSoyoCutins(event.target);
        fx.push({ x: event.x, y: 438 - event.y - 70, life: 700, max: 700, type: 'burst', color: '#ffe5ac', text: '硬直 2 秒' });
      }
      if (event.type === 'beat' || event.type === 'beatBoost') {
        const f = match.fighters[event.side];
        if (event.type === 'beatBoost') fx.push({ x: f.x, y: 438 - f.y - 175, life: 450, max: 450, type: 'burst', color: '#ddc9ff', text: '四拍强化' });
        else if (f.attack === 'rikiCalibrate') tone('rikiCalibrate', event.side, 1, false);
      }
      if (event.type === 'tune') {
        const f = match.fighters[event.side]; tone('ranaTune', event.side, 1, false);
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
        const f = match.fighters[event.side]; tone('heal', event.side, 1, false);
        fx.push({ x: f.x, y: 438 - f.y - 160, life: 950, max: 950, type: 'burst', color: '#aeefcf', text: '+' + event.amount + ' 生命' });
      }
      if (event.type === 'summon') {
        const f = match.fighters[event.side];
        fx.push({ x: f.x, y: 438 - f.y - 120, life: 650, max: 650, type: 'burst', color: '#ffe0a0', text: '小天素罗 ×3' });
      }
      if (event.type === 'minionCall') {
        summonVoicePlayer?.play('tensoraOhYeah', event.side * 3 + event.unit);
        fx.push({ x: event.x, y: 438 - event.y - 85, life: 650, max: 650, type: 'burst', color: '#ffe0a0', text: '哦也！' });
      }
      if (event.type === 'minionHit') {
        if (event.defeated) summonVoicePlayer?.stop(event.owner * 3 + event.unit);
        fx.push({ x: event.x, y: 438 - event.y - 35, life: 350, max: 350, type: 'impact', weight: 0, color: '#ffe0a0', text: '-' + event.damage });
        tone('hit', event.side, 0, false);
      }
      if (event.type === 'shieldSummon') tone('shield', event.side, 1, false);
      if (event.type === 'terrainHit') fx.push({ x: event.x, y: 438 - event.y, life: 300, max: 300, type: 'burst', color: '#c4d9e5' });
      if (event.type === 'shieldHit') {
        const mujicaShield = match.fighters[event.side].character >= 5;
        fx.push({ x: event.x, y: 438 - event.y, life: event.broken ? 600 : 350, max: event.broken ? 600 : 350,
          type: event.broken && !mujicaShield ? 'steelBreak' : 'burst', color: '#c4e9ff', text: (match.fighters[event.side].character === 13 ? '节拍屏障' : mujicaShield ? '茶会护盾' : '钢板') + (event.broken ? '破碎' : ' −' + event.absorbed) });
        tone('shieldHit', event.side);
      }
      if (event.type === 'result') { fx = fx.filter(effect => effect.type !== 'blink'); voicePlayer?.stop(); summonVoicePlayer?.stop(); transformMusicPlayer?.stop(); stopSoyoCutins(); clearInput(); tone('result'); }
      if (event.type === 'hit' || event.type === 'clash') {
        if (event.type === 'hit' && !event.blocked && !event.armored) {
          voicePlayer?.stop(1 - event.side);
          if (!match.fighters[1 - event.side].soyoSuper) stopSoyoCutins(1 - event.side);
        }
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
        if (MOVES[event.attack]?.rikiOnly) tone(event.attack, event.side, weight, false);
      }
    }
  }
  function drawStageAtmosphere(stage) {
    // This layer shares the background's parallax, behind both terrain and fighters.
    const time = reducedMotion ? 0 : visualTime, id = stage.id;
    const beam = (x, y, endX, endY, width, color) => {
      const light = ctx.createLinearGradient(x, y, endX, endY);
      light.addColorStop(0, color); light.addColorStop(1, '#ffffff00');
      ctx.fillStyle = light; ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y);
      ctx.lineTo(endX + width, endY); ctx.lineTo(endX - width, endY); ctx.closePath(); ctx.fill();
    };
    ctx.save();
    if (id === 'ring' || id === 'theater') {
      const theater = id === 'theater', sway = Math.sin(time * .00017) * 32;
      for (let i = 0; i < 4; i++) {
        const x = 145 + i * 220;
        beam(x, 20, x + (i % 2 ? -42 : 42) + sway, 430, 68,
          theater ? '#d5b3f322' : i % 2 ? '#8de4ec28' : '#ed8cac28');
      }
      if (theater) {
        for (const x of [95, 833]) {
          const curtain = ctx.createLinearGradient(x, 0, x + 32, 0);
          curtain.addColorStop(0, '#160f24c0'); curtain.addColorStop(.5, '#54283a80'); curtain.addColorStop(1, '#140d2300');
          ctx.fillStyle = curtain; ctx.fillRect(x, 0, 32, 440);
        }
      }
    } else if (id === 'studio' || id.endsWith('-studio')) {
      const cool = id === 'ring-studio';
      for (const x of [185, 465, 755]) beam(x, 30, x + 15, 360, 94, cool ? '#d0dfff14' : '#ffdc9c1d');
    } else if (id === 'rainstreet') {
      ctx.strokeStyle = '#bfd7ef39'; ctx.lineWidth = .9; ctx.beginPath();
      for (let i = 0; i < 42; i++) {
        const y = (i * 83 + time * .18) % 560 - 20, x = (i * 137 - y * .15 + 960) % 960;
        ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 16);
      }
      ctx.stroke();
      for (let i = 0; i < 5; i++) {
        ctx.globalAlpha = .15; ctx.strokeStyle = i % 2 ? '#d98aac' : '#a4d2e0';
        const ripple = reducedMotion ? 14 : (time * .018 + i * 13) % 36;
        ctx.beginPath(); ctx.ellipse(95 + i * 183, 407 + i % 2 * 35, 12 + ripple, 1.5 + ripple * .08, 0, 0, Math.PI * 2); ctx.stroke();
      }
    } else if (id === 'rooftop' || id === 'haneoka-roof') {
      // Faint upper-sky wisps; no weather layer covers the fighting plane.
      ctx.fillStyle = id === 'rooftop' ? '#f9c8a710' : '#f4fbff18';
      for (let i = 0; i < 3; i++) {
        const x = (i * 365 + time * .003) % 1280 - 160;
        ctx.beginPath(); ctx.ellipse(x, 46 + i * 25, 155, 12, -.05, 0, Math.PI * 2); ctx.fill();
      }
    } else if (['sakura', 'hanasakigawa', 'haneoka', 'tsukinomori', 'tsukinomori-garden'].includes(id)) {
      const blossom = id === 'sakura' || id === 'hanasakigawa';
      // Nearby branches frame the corners instead of drawing over school facades.
      for (const side of [0, 1]) {
        ctx.save(); ctx.translate(side ? 860 : 100, 65); ctx.scale(side ? -1 : 1, 1);
        ctx.strokeStyle = '#25423938'; ctx.lineWidth = 3; ctx.beginPath();
        ctx.moveTo(-10, 38); ctx.quadraticCurveTo(46, 50, 103, 3); ctx.stroke();
        for (let i = 0; i < 9; i++) {
          ctx.fillStyle = blossom ? (i % 2 ? '#eab6cc42' : '#f3d5df54') : (i % 2 ? '#4d775b40' : '#82a87642');
          ctx.beginPath(); ctx.ellipse(8 + i * 12, 29 - i * 2 + Math.sin(time * .0006 + i) * 2, 15, 7, -.35 + i * .19, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
      if (id === 'tsukinomori-garden') beam(730, 0, 545, 360, 95, '#f0eed425');
    } else if (id === 'sunshine-steps' || id === 'sunshine-night') {
      const night = id === 'sunshine-night';
      for (const x of [175, 780]) {
        const glow = ctx.createRadialGradient(x, 240, 1, x, 240, night ? 72 : 110);
        glow.addColorStop(0, night ? '#c5ddff1d' : '#ffca8c19'); glow.addColorStop(1, '#ffffff00');
        ctx.fillStyle = glow; ctx.fillRect(x - 110, 130, 220, 220);
      }
    }
    ctx.restore();
  }
  function drawBackground() {
    const magnification = 1.12 + camera.zoom * .34, width = 960 * magnification, height = 540 * magnification;
    const offsetX = Math.max(-(width - 960) / 2, Math.min((width - 960) / 2, (camera.x - 480) * .13 * camera.zoom));
    const offsetY = Math.max(-(height - 540) / 2, Math.min((height - 540) / 2, (camera.y - 300) * .15 * camera.zoom));
    ctx.drawImage(backgrounds[battleArena], (960 - width) / 2 - offsetX, (540 - height) / 2 - offsetY, width, height);
    ctx.save(); ctx.translate((960 - width) / 2 - offsetX, (540 - height) / 2 - offsetY); ctx.scale(magnification, magnification);
    drawStageAtmosphere(assets.stages[battleArena]); ctx.restore();
    const shade = ctx.createLinearGradient(0, 0, 0, 540);
    const stage = assets.stages[battleArena];
    const ambience = ({ sakura: 'petals', rooftop: 'sunset', studio: 'dust', theater: 'night', rainstreet: 'rain' })[stage.id] || stage.ambience;
    shade.addColorStop(0, ['petals', 'leaves', 'breeze'].includes(ambience) ? '#07122170' : '#071221a0'); shade.addColorStop(.25, '#08142215');
    shade.addColorStop(.7, '#06121d05'); shade.addColorStop(1, '#061322d9');
    ctx.fillStyle = shade; ctx.fillRect(0, 0, 960, 540);
    if (!reducedMotion && ambience !== 'rain') {
      for (let i = 0; i < 17; i++) {
        const x = (i * 151 + visualTime * (ambience === 'breeze' ? .025 : .007)) % 960;
        const y = 150 + (i * 59) % 260 + Math.sin(visualTime * .0006 + i) * 12;
        ctx.globalAlpha = .12 + (Math.sin(visualTime * .001 + i) + 1) * .09;
        ctx.fillStyle = ({ petals: '#f3c8d9', leaves: '#b8d99b', breeze: '#e4f0f5', dust: '#e9cfab', sunset: '#f2c28a', night: '#b9d3f5' })[ambience] || (i % 2 ? '#97dcec' : '#f6b9cd');
        if (ambience === 'petals' || ambience === 'leaves') {
          ctx.beginPath(); ctx.ellipse(x, y, 3, 1.2, visualTime * .0004 + i, 0, Math.PI * 2); ctx.fill();
        } else ctx.fillRect(x, y, ambience === 'breeze' ? 8 : 1.5, ambience === 'breeze' ? .6 : 1.5);
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
      // Texture is clipped to the solid face, leaving every landing edge exact.
      ctx.save(); ctx.clip(); ctx.lineWidth = 1; ctx.strokeStyle = '#ffffff0b';
      for (let y = 300; y < 700; y += 38) {
        ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
      }
      ctx.restore();
      ctx.beginPath();
      for (let x = left; x <= right; x += 4) {
        const y = 438 - match.floorHeight(x); if (x === left) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = edge; ctx.lineWidth = 3; ctx.stroke();
      ctx.globalAlpha = .25; ctx.strokeStyle = edge; ctx.lineWidth = 1;
      for (let x = left + 24; x < right; x += 96) {
        const y = 438 - match.floorHeight(x); ctx.beginPath(); ctx.moveTo(x, y + 7); ctx.lineTo(x, y + 100); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    for (const p of terrain.platforms) {
      const top = 438 - p.height, width = p.right - p.left;
      const material = p.style || terrain.material;
      ctx.fillStyle = '#02091650'; ctx.beginPath();
      ctx.ellipse((p.left + p.right) / 2, 442 - match.floorHeight((p.left + p.right) / 2), width * .52, 8, 0, 0, Math.PI * 2); ctx.fill();
      // Supports sit behind the one-way deck; its bright top edge is the landing line.
      for (const x of [p.left + 14, p.right - 22]) {
        const bottom = 438 - match.floorHeight(x);
        ctx.fillStyle = dark; ctx.fillRect(x, top + 15, 8, bottom - top - 15);
        ctx.fillStyle = face; ctx.fillRect(x, top + 15, 2, bottom - top - 15);
      }
      if (material === 'rail' || material === 'roof') {
        ctx.strokeStyle = edge; ctx.globalAlpha = .55; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(p.left + 6, top - 34); ctx.lineTo(p.right - 6, top - 34);
        for (let x = p.left + 8; x < p.right; x += 32) { ctx.moveTo(x, top - 34); ctx.lineTo(x, top); }
        ctx.stroke(); ctx.globalAlpha = 1;
      }
      if (material === 'planter') {
        ctx.fillStyle = '#486e53'; ctx.fillRect(p.left + 8, top - 8, width - 16, 8);
        ctx.fillStyle = '#8da97b';
        for (let x = p.left + 15; x < p.right - 10; x += 20) { ctx.beginPath(); ctx.ellipse(x, top - 8, 9, 5, -.3, 0, Math.PI * 2); ctx.fill(); }
      }
      if (material === 'metal') {
        ctx.strokeStyle = face; ctx.lineWidth = 4; ctx.beginPath();
        ctx.moveTo(p.left + 18, top + 20); ctx.lineTo(p.right - 18, 428 - match.floorHeight(p.right - 18));
        ctx.moveTo(p.right - 18, top + 20); ctx.lineTo(p.left + 18, 428 - match.floorHeight(p.left + 18)); ctx.stroke();
      }
      const slab = ctx.createLinearGradient(0, top, 0, top + 22);
      slab.addColorStop(0, face); slab.addColorStop(1, dark);
      ctx.fillStyle = slab; ctx.fillRect(p.left, top, width, 20);
      ctx.fillStyle = edge; ctx.fillRect(p.left, top, width, 3);
      ctx.fillStyle = '#00000050'; ctx.fillRect(p.left, top + 18, width, 3);
      // Small inset fixtures distinguish materials without changing the silhouette.
      if (material === 'speaker') {
        ctx.fillStyle = '#080e1690'; ctx.fillRect(p.left + 7, top + 5, width - 14, 11);
        ctx.fillStyle = '#a6dab8'; ctx.fillRect(p.right - 14, top + 7, 3, 3);
        ctx.fillStyle = '#86a6be'; ctx.fillRect(p.right - 20, top + 7, 3, 3);
      } else if (material === 'stone' || material === 'concrete') {
        ctx.fillStyle = '#ffffff10'; ctx.fillRect(p.left + 5, top + 5, width - 10, 1);
        if (assets.stages[battleArena].id === 'sunshine-night') {
          ctx.fillStyle = '#b9d8e8';
          for (let x = p.left + 20; x < p.right - 10; x += 64) ctx.fillRect(x, top + 6, 12, 2);
        }
      } else if (material === 'metal' || material === 'roof') {
        ctx.fillStyle = '#d6ba7760';
        for (const x of [p.left + 5, p.right - 16]) {
          ctx.beginPath(); ctx.moveTo(x, top + 5); ctx.lineTo(x + 4, top + 5); ctx.lineTo(x + 10, top + 15); ctx.lineTo(x + 6, top + 15); ctx.closePath(); ctx.fill();
        }
      } else if (material === 'wood') {
        ctx.strokeStyle = '#d8bf9240'; ctx.lineWidth = .7; ctx.beginPath();
        ctx.moveTo(p.left + 9, top + 8); ctx.bezierCurveTo(p.left + width * .3, top + 5, p.left + width * .55, top + 12, p.right - 9, top + 8); ctx.stroke();
      } else if (material === 'planter') {
        for (let x = p.left + 22; x < p.right - 12; x += 35) {
          ctx.fillStyle = assets.stages[battleArena].id === 'tsukinomori-garden' ? '#ddcaee' : '#f2cfb2';
          ctx.beginPath(); ctx.arc(x, top - 7, 2.1, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.strokeStyle = edge; ctx.lineWidth = 1; ctx.globalAlpha = .45;
      const spacing = material === 'wood' ? 17 : material === 'stone' ? 36 : 25;
      for (let x = p.left + 8; x < p.right - 5; x += spacing) {
        if (material === 'speaker') {
          ctx.beginPath(); ctx.arc(x + 5, top + 11, 5, 0, Math.PI * 2); ctx.stroke();
        } else if (material === 'metal' || material === 'roof') {
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
    const live = match.fighters[side], ending = match.roundEnd?.fighters[side];
    const impact = ending && ROUND_END_TIMING.total - match.phaseMs < ROUND_END_TIMING.impact;
    const f = ending ? { ...live, penguin: ending.penguin, stageForm: ending.stageForm,
      ...(impact ? { attack: ending.attack, attackMs: ending.attackMs } : {}) } : live;
    const animation = blinkDirection
      ? f.penguin ? (blinkDirection * f.facing < 0 ? 'walk-pass' : 'flipper-heavy') : blinkDirection * f.facing < 0 ? 'dash-back' : 'dash-forward'
      : chooseAnimation(match, side);
    if (f.character >= 5) {
      const form = animation.startsWith('customer-') ? 'customer' : animation.startsWith('mask-') ? 'mask' : (f.character >= 10 ? mewtype : mujica).formFor(f);
      const key = f.character + ':' + form + (animation.startsWith('crawl-') ? '-crawl' : '');
      if (animation === 'idle' && assets.mujicaPortraits?.[f.character]) {
        const art = assets.mujicaPortraits[f.character][form].idle, frame = art.frames[0];
        return { atlas: portraitAtlases.get(f.character + ':' + form), frame, scale: frame.height / frame.h, animation, facing: f.facing };
      }
      const frame = mujicaFrames.get(key).get(animation);
      return { atlas: mujicaAtlases.get(key), frame, scale: frame.height / frame.h, animation, facing: f.facing };
    }
    let art = assets.characters[f.character], frame = art.frames[match.pose(side)], atlas = atlases[f.character];
    let scale = f.character >= 2 ? frame.height / frame.h : 235 / art.frames[0].h;
    const move = MOVES[f.attack], acting = !f.stun && !f.knockdown && (match.phase === 'fighting' || impact);
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
  function drawMujicaBody(atlas, frame, scale, motion) {
    // Narrow contiguous bands keep the face intact while the torso follows through.
    // This supplements the authored poses; the bottom quarter is never displaced.
    const strips = 40, step = frame.h / strips;
    ctx.save(); ctx.shadowBlur = 0;
    for (let n = 0; n < strips; n++) {
      const top = n * step, bottom = Math.min(frame.h, (n + 1) * step);
      const a = window.MygoAnimation.mujicaBodyOffset(motion, (frame.ay - top) / frame.ay);
      const b = window.MygoAnimation.mujicaBodyOffset(motion, (frame.ay - bottom) / frame.ay);
      ctx.drawImage(atlas, frame.x, frame.y + top, frame.w, bottom - top,
        -frame.ax + (a.x + b.x) / (2 * scale), -frame.ay + top + a.y / scale,
        frame.w, bottom - top + (b.y - a.y) / scale);
    }
    ctx.restore();
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
    const motion = mujicaMotion(match, side, animation, reducedMotion);
    const isMujica = f.character >= 5 && f.character < 10;
    const bob = !isMujica && !f.attack && !f.stun && !f.vx ? Math.sin(visualTime * .004 + side) * 1.2 : 0;
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
    if (motion && !traveling) drawMujicaBody(atlas, frame, scale, motion);
    else ctx.drawImage(atlas, frame.x, frame.y, frame.w, frame.h, -frame.ax, -frame.ay, frame.w, frame.h);
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
    if (f.attack === 'soyoCutline') {
      ctx.scale(f.facing, 1);
      ctx.lineCap = 'round'; ctx.shadowColor = '#f6d6a4'; ctx.shadowBlur = reducedMotion ? 0 : 12;
      if (t < move.start) {
        const ready = t / move.start;
        ctx.strokeStyle = '#f4dbb8'; ctx.lineWidth = 1.4; ctx.globalAlpha = .25 + ready * .45;
        for (const slope of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(28, -112 + slope * 13); ctx.lineTo(65 + ready * 36, -112 - slope * 30); ctx.stroke();
        }
      }
      for (let i = 0; i < move.pulses.length; i++) {
        const age = t - move.pulses[i].at;
        if (age < 0 || age > 290) continue;
        const growth = Math.min(1, age / 75), fade = 1 - age / 290;
        const end = 42 + (move.reach - 42) * growth, slope = i ? -1 : 1;
        const startY = -112 + slope * 49, endY = -112 - slope * 49;
        ctx.globalAlpha = fade * .95;
        for (const [width, color] of [[10, '#e4b77b44'], [4, '#e8bf84'], [1.4, '#fff6df']]) {
          ctx.lineWidth = width; ctx.strokeStyle = color;
          ctx.beginPath(); ctx.moveTo(42, startY); ctx.lineTo(end, startY + (endY - startY) * growth); ctx.stroke();
        }
        ctx.strokeStyle = '#fff4d7'; ctx.lineWidth = 1.5;
        const cutX = end - 18, cutY = startY + (endY - startY) * growth;
        ctx.beginPath(); ctx.moveTo(cutX - 7, cutY - 9); ctx.lineTo(cutX + 7, cutY + 9);
        ctx.moveTo(cutX - 7, cutY + 9); ctx.lineTo(cutX + 7, cutY - 9); ctx.stroke();
        if (!reducedMotion) for (let n = 0; n < 5; n++) {
          ctx.globalAlpha = fade * .65; ctx.fillStyle = '#ffebbf';
          const x = 65 + (end - 65) * n / 5, y = startY + (endY - startY) * n / 5;
          ctx.fillRect(x + age * .035, y + Math.sin(n * 2) * age * .06, 3, 2);
        }
      }
    } else if (f.attack === 'heal') {
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
      if (f.hardStun > 0 && match.phase === 'fighting') {
        ctx.save(); ctx.translate(f.x, 438 - f.y - 245);
        ctx.strokeStyle = '#ffe1a0'; ctx.fillStyle = '#fff0cb'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(0, 0, 30, 9, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
        for (let i = 0; i < 3; i++) { const a = visualTime / 250 + i * Math.PI * 2 / 3; ctx.fillText('✦', Math.cos(a) * 30, Math.sin(a) * 9 + 4); }
        ctx.fillText('硬直 ' + (f.hardStun / 1000).toFixed(1) + 's', 0, -15); ctx.restore();
      }
      if (f.soyoSuper && match.phase === 'fighting') {
        const cast = f.soyoSuper, age = MOVES.soyoSuper.duration - cast.ms - MOVES.soyoSuper.start;
        if (age <= 700) {
          ctx.save(); ctx.translate(cast.x, 438 - cast.y);
          ctx.strokeStyle = '#ffe3a6'; ctx.fillStyle = '#ffe3a612'; ctx.shadowColor = '#e8ac52'; ctx.shadowBlur = reducedMotion ? 0 : 14;
          ctx.globalAlpha = cast.released ? Math.min(1, Math.max(0, (700 - age) / 250)) : .35;
          const radius = cast.released ? Math.max(1, cast.radius) : 30 + Math.sin(visualTime / 90) * 5;
          ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.globalAlpha *= .5; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, radius * .82, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        }
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
    if (f.character >= 5) {
      ctx.save(); ctx.translate(f.x + f.facing * 58, 438 - f.y - 110);
      ctx.globalAlpha = Math.min(1, steel.ms / 200); ctx.strokeStyle = f.character === 13 ? '#ff91d6' : '#e1d7ff'; ctx.fillStyle = '#adbbef25';
      ctx.shadowColor = '#d4caff'; ctx.shadowBlur = reducedMotion ? 0 : steel.hitMs ? 22 : 8; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(0, 0, 28, 106, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 1;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(-22, i * 20); ctx.lineTo(22, i * 20); ctx.stroke(); }
      ctx.font = '28px Georgia'; ctx.textAlign = 'center'; ctx.fillStyle = '#f0eaff'; ctx.fillText('♪', 0, 10);
      ctx.shadowBlur = 0; ctx.fillStyle = '#182539'; ctx.fillRect(-27, -130, 54, 5);
      ctx.fillStyle = '#dad3ff'; ctx.fillRect(-27, -130, 54 * steel.hp / 24, 5);
      ctx.font = 'bold 10px "Segoe UI",sans-serif'; ctx.fillText((f.character === 13 ? '节拍 ' : '茶会 ') + steel.hp, 0, -138); ctx.restore(); return;
    }
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
        const age = 10000 - group.ms, bob = Math.abs(Math.sin(visualTime * .012 + p.id * 1.8)) * (p.phase === 'charge' ? 12 : 6);
        const index = p.hitMs > 0 ? 3 : p.phase === 'charge' ? 2 : Math.floor(visualTime / 160 + p.id) % 2;
        const frame = art.frames[index], scale = frame.height / frame.h;
        const surface = match.surfaceBelow(p.x, p.y), ground = 438 - surface;
        ctx.save(); ctx.globalAlpha = Math.min(1, age / 160, group.ms / 400);
        ctx.fillStyle = '#09101c66'; ctx.beginPath(); ctx.ellipse(p.x, ground + 3, 21, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = colors[side]; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(p.x, ground + 2, 19, 4, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.translate(p.x, 438 - p.y - bob); ctx.scale(p.facing * scale, scale);
        ctx.shadowColor = '#e9ba64'; ctx.shadowBlur = p.hitMs ? 10 : 2;
        ctx.drawImage(tensoraAtlas, frame.x, frame.y, frame.w, frame.h, -frame.ax, -frame.ay, frame.w, frame.h);
        ctx.restore();
        ctx.save(); ctx.globalAlpha = Math.min(1, age / 160, group.ms / 400);
        ctx.translate(p.x, 438 - p.y - bob - 82);
        ctx.fillStyle = '#111726df'; ctx.fillRect(-23, -3, 46, 6);
        ctx.fillStyle = p.hp <= 6 ? '#ef8d8d' : '#f1d38c'; ctx.fillRect(-22, -2, 44 * p.hp / p.maxHp, 4);
        ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff0cf';
        ctx.fillText(p.hp + '/' + p.maxHp, 0, -7); ctx.restore();
      }
    }
  }
  function drawMaskAura(f) {
    if (match.phase !== 'fighting' || f.character < 5 || f.character > 9 || !f.stageForm) return;
    const age = 20000 - f.stageForm.ms;
    if (age < 0 || age > 1100) return;
    const charge = Math.min(1, age / 440), burst = Math.max(0, (age - 440) / 660);
    const color = ROSTER[f.character].color, strength = (1 - burst) * (reducedMotion ? .28 : 1);
    ctx.save(); ctx.translate(f.x, 438 - f.y); ctx.strokeStyle = color; ctx.lineWidth = 3;
    const glow = ctx.createRadialGradient(0, -120, 20, 0, -120, 200 + burst * 140);
    glow.addColorStop(0, color + '90'); glow.addColorStop(.5, color + '3a'); glow.addColorStop(1, color + '00');
    ctx.globalAlpha = strength; ctx.fillStyle = glow; ctx.fillRect(-350, -420, 700, 450);
    ctx.shadowColor = color; ctx.shadowBlur = reducedMotion ? 0 : 20;
    for (let i = 0; i < 3; i++) {
      const radius = age < 440 ? 40 + charge * 35 + i * 12 : 70 + burst * (210 + i * 70);
      ctx.globalAlpha = strength * (1 - i * .18);
      ctx.beginPath(); ctx.ellipse(0, -3, radius, radius * .18, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (age >= 440) for (let i = 0; i < 18; i++) {
      const angle = i * 2.39996, near = 40 + burst * 60, far = near + 80 + i % 4 * 30;
      ctx.globalAlpha = strength * .75; ctx.strokeStyle = i % 3 ? color : '#fff0dd';
      ctx.lineWidth = i % 2 ? 2 : 4;
      ctx.beginPath(); ctx.moveTo(Math.cos(angle) * near, -125 + Math.sin(angle) * near);
      ctx.lineTo(Math.cos(angle) * far, -125 + Math.sin(angle) * far); ctx.stroke();
    }
    if (!reducedMotion) for (let i = 0; i < 7; i++) {
      const x = (i - 3) * 30, rise = (age * .16 + i * 37) % 250;
      ctx.globalAlpha = strength * .55; ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(x - 14, -rise); ctx.quadraticCurveTo(x - 26, -rise - 60, x + 10, -rise - 105);
      ctx.quadraticCurveTo(x, -rise - 38, x + 14, -rise); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function drawBurger(x, y, scale = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.shadowBlur = 5;
    ctx.strokeStyle = '#7b4926'; ctx.lineWidth = 1.5; ctx.fillStyle = '#e9ac53';
    ctx.beginPath(); ctx.moveTo(-32, -4); ctx.bezierCurveTo(-34, -35, 34, -35, 32, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff2bf'; for (const [sx,sy] of [[-16,-17],[0,-23],[15,-15],[-4,-12]]) { ctx.beginPath(); ctx.ellipse(sx,sy,3,1.4,-.3,0,Math.PI*2); ctx.fill(); }
    ctx.fillStyle = '#76b64c'; ctx.fillRect(-35, -2, 70, 5);
    ctx.fillStyle = '#ce5147'; ctx.fillRect(-31, 3, 62, 5);
    ctx.fillStyle = '#623927'; ctx.fillRect(-33, 8, 66, 10);
    ctx.fillStyle = '#ffdc65'; ctx.beginPath(); ctx.moveTo(-32,8); ctx.lineTo(28,8); ctx.lineTo(12,18); ctx.lineTo(-3,12); ctx.lineTo(-20,18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e9ac53'; ctx.beginPath(); ctx.roundRect(-32, 18, 64, 10, 5); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  function drawMujicaEffects() {
    if (match.phase !== 'fighting') return;
    for (const area of match.areas) {
      const profile = ROSTER[match.fighters[area.owner].character], y = 438 - area.y;
      ctx.save(); ctx.strokeStyle = profile.color; ctx.fillStyle = profile.color + '25'; ctx.lineWidth = 2;
      ctx.globalAlpha = area.fired ? Math.max(0, area.life / 100) : .45 + Math.sin(visualTime * .025) * .2;
      if (MOVES[area.attack].mortis === 'snare') {
        ctx.strokeStyle = '#d8eab4';
        ctx.beginPath(); ctx.ellipse(area.x, y, area.radius, 22, 0, 0, Math.PI * 2); ctx.stroke();
        for (const direction of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(area.x + direction * area.radius, y - 230);
          ctx.lineTo(area.x - direction * 30, y - (area.fired ? 120 : 12)); ctx.stroke();
        }
        ctx.restore(); continue;
      }
      if (profile.band === 'mewtype') {
        ctx.strokeRect(area.x - area.radius, y - 12, area.radius * 2, 24);
        const rise = area.fired ? 160 : 20 + 40 * (1 - area.warning / 600);
        for (let i = -1; i <= 1; i++) {
          const x = area.x + i * area.radius * .6;
          ctx.fillRect(x - 25, y - rise, 50, rise); ctx.strokeRect(x - 25, y - rise, 50, rise);
          ctx.beginPath(); ctx.moveTo(x - 17, y - rise + 12); ctx.lineTo(x + 17, y - rise + 12); ctx.stroke();
        }
        ctx.restore(); continue;
      }
      ctx.beginPath(); ctx.ellipse(area.x, y, area.radius, 18, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      const rise = area.fired ? 180 : 20 + 55 * (1 - area.warning / 600);
      for (let i = -2; i <= 2; i++) {
        const x = area.x + i * area.radius / 3;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - rise); ctx.stroke();
      }
      ctx.restore();
    }
    for (const f of match.fighters) {
      if (f.character < 5) continue;
      const profile = ROSTER[f.character], move = MOVES[f.attack];
      ctx.save(); ctx.translate(f.x, 438 - f.y); ctx.strokeStyle = profile.color; ctx.fillStyle = profile.color;
      if (f.stageForm) {
        ctx.globalAlpha = .3; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(0, 0, 43 + Math.sin(visualTime * .004) * 3, 8, 0, 0, Math.PI * 2); ctx.stroke();
      }
      if (!move || move.ownerCharacter !== f.character || f.stun || !move.slot) { ctx.restore(); continue; }
      const age = f.attackMs, active = age >= move.start && age <= move.end;
      ctx.scale(f.facing, 1); ctx.lineWidth = active ? 3 : 1.5;
      ctx.globalAlpha = active ? .8 : .28;
      ctx.shadowColor = profile.color; ctx.shadowBlur = reducedMotion ? 0 : active ? 12 : 3;
      if (move.mortis) {
        const ghost = (offset, form, pose, alpha) => {
          const key = '8:' + form, image = mujicaAtlases.get(key), frame = mujicaFrames.get(key).get(pose);
          const scale = 235 / frame.h;
          ctx.save(); ctx.globalAlpha = alpha; ctx.shadowBlur = 0;
          ctx.drawImage(image, frame.x, frame.y, frame.w, frame.h, offset - frame.ax * scale, -frame.ay * scale, frame.w * scale, frame.h * scale);
          ctx.restore();
        };
        if (move.mortis === 'toddler') {
          const pulse = Math.min(1, age / move.end);
          for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(0, -115, 45 + pulse * 180 - i * 20, 35 + pulse * 70, 0, 0, Math.PI * 2); ctx.stroke(); }
        } else if (move.mortis === 'burger') {
          if (age < move.start) drawBurger(65, -150, .6);
        } else if (move.mortis === 'double' || move.mortis === 'theater') {
          const theater = move.mortis === 'theater', offsets = theater ? [-180,180] : [150,270];
          offsets.forEach((offset, index) => {
            ghost(offset, index ? 'stage' : 'normal', theater && index ? 'super-impact' : 'idle', active ? .5 : .18);
            ctx.beginPath(); ctx.moveTo(offset - 35, -350);ctx.lineTo(offset - 25, -140);
            ctx.moveTo(offset + 35, -350);ctx.lineTo(offset + 25, -140);ctx.stroke();
          });
          if (theater) { ctx.beginPath();ctx.ellipse(0, -90, move.reach, 170, 0, 0, Math.PI * 2);ctx.stroke(); }
        } else if (move.mortis === 'parry') {
          ghost(-55, 'normal', 'idle', .22);
          ctx.beginPath();ctx.ellipse(20, -115, 62, 108, 0, 0, Math.PI * 2);ctx.stroke();
          ctx.beginPath();ctx.moveTo(-20,-90);ctx.quadraticCurveTo(15,-60,50,-90);ctx.stroke();
        } else {
          ctx.beginPath();ctx.moveTo(0,-240);ctx.lineTo(130,-80);ctx.lineTo(30,-200);ctx.stroke();
        }
      } else if (move.counter) {
        ctx.beginPath(); ctx.ellipse(38, -105, 34, 85, 0, -.5 * Math.PI, .5 * Math.PI); ctx.stroke();
      } else if (move.targetArea && f.attackTarget) {
        ctx.save(); ctx.scale(f.facing, 1);
        const tx = f.attackTarget.x - f.x, ty = f.y - f.attackTarget.y;
        ctx.beginPath(); ctx.ellipse(tx, ty, move.areaRadius, 16, 0, 0, Math.PI * 2); ctx.stroke();
        if (active) for (let i = -1; i <= 1; i++) {
          ctx.beginPath(); ctx.moveTo(tx + i * 60, ty - 280); ctx.lineTo(tx + i * 60, ty - 10); ctx.stroke();
        }
        ctx.restore();
      } else if (!move.delayedArea && !move.durability) {
        const reach = Math.min(move.reach || 170, 420), p = Math.min(1, age / Math.max(1, move.end));
        if (f.character === 10) {
          for (let i = 0; i < 3; i++) {
            ctx.beginPath(); ctx.ellipse(35 + i * reach / 4, -125, 12 + i * 12 + p * 14, 24 + i * 18, 0, -1.25, 1.25); ctx.stroke();
          }
        } else if (f.character === 12) {
          for (let i = 0; i < 3; i++) {
            ctx.save(); ctx.translate(40 + i * reach / 4, -150 + i * 20); ctx.rotate(-.18 + i * .12);
            ctx.strokeRect(0, 0, 48, 65);
            for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.moveTo(8, 12 + j * 15); ctx.lineTo(38, 12 + j * 15); ctx.stroke(); }
            ctx.restore();
          }
        } else if (f.character === 13) {
          for (let i = 0; i < 9; i++) {
            const h = 12 + (1 + Math.sin(age * .025 + i * .9)) * 32;
            ctx.fillRect(25 + i * reach / 11, -95 - h / 2, 8, h);
          }
        } else if (f.character === 6) {
          // Piano keys fan out from the conductor's hands.
          for (let i = 0; i < 7; i++) {
            const x = 30 + i * reach / 9, y = -125 + Math.sin(i * .65 + p * 2) * 25;
            ctx.fillRect(x, y, 10, i % 3 ? 27 : 18);
          }
        } else if (f.character === 9) {
          // Drum hits form paired rings; the stage kit uses a faster eight-beat roll.
          const beat = age % (f.stageForm ? 120 : 180) / (f.stageForm ? 120 : 180);
          for (const offset of [-28, 28]) {
            ctx.beginPath(); ctx.ellipse(60 + reach * .3, -105 + offset, 20 + beat * 55, 12 + beat * 24, -.35, 0, Math.PI * 2); ctx.stroke();
          }
        } else {
          const low = move.level === 'low', high = move.level === 'high', y = low ? -35 : high ? -165 : -105;
          for (let i = 0; i < (f.character === 5 ? 4 : 6); i++) {
            ctx.beginPath(); ctx.moveTo(28, y + i * 5);
            ctx.quadraticCurveTo(reach * .55, y - (f.character === 7 ? 65 : 25) + i * 9, reach, y + i * 5); ctx.stroke();
          }
          if (move.pull) { ctx.beginPath(); ctx.arc(reach, y, 15, -.5, 2.6); ctx.stroke(); }
        }
        if (move.category === 'super') {
          ctx.globalAlpha *= .55;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath(); ctx.ellipse(90, -100, 50 + i * 38 + p * 25, 85 + i * 16, -.3, -.8, 2); ctx.stroke();
          }
        }
      }
      ctx.restore();
    }
  }
  function drawMujicaWave(w) {
    const move = MOVES[w.attack], profile = ROSTER[move.ownerCharacter];
    ctx.save(); ctx.translate(w.x, 438 - w.y); ctx.scale(w.vx >= 0 ? 1 : -1, 1);
    ctx.globalAlpha = Math.min(1, w.life / 120); ctx.strokeStyle = profile.color; ctx.fillStyle = profile.color;
    ctx.shadowColor = profile.color; ctx.shadowBlur = reducedMotion ? 0 : 10; ctx.lineWidth = 3;
    if (move.mortis === 'burger') {
      ctx.rotate(Math.sin(w.age * .009) * .12); drawBurger(0, 0);
    } else if (move.ownerCharacter === 8 && move.form === 'normal' && move.slot === 'u') {
      ctx.rotate(w.age * .008); ctx.fillStyle = '#76a347'; ctx.strokeStyle = '#d7e89d';
      ctx.beginPath(); ctx.ellipse(0, 0, 29, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#aac773'; ctx.lineWidth = 1;
      for (const y of [-4, 0, 4]) { ctx.beginPath(); ctx.moveTo(-22, y); ctx.lineTo(22, y); ctx.stroke(); }
    } else if (move.ownerCharacter === 6) {
      for (let i = 0; i < 4; i++) { ctx.globalAlpha *= .88; ctx.fillRect(-i * 12, -w.ry / 2, 8, w.ry); }
    } else {
      for (let i = 0; i < 4; i++) {
        ctx.globalAlpha *= .8;
        ctx.beginPath(); ctx.ellipse(-i * 10, 0, Math.max(6, w.rx - i * 3), Math.max(8, w.ry - i * 5), 0, -1.4, 1.4); ctx.stroke();
      }
      if (move.groundShock) { ctx.beginPath(); ctx.moveTo(-45, 20); ctx.lineTo(22, 20); ctx.stroke(); }
    }
    ctx.restore();
  }
  function drawMewtypeWave(w) {
    const owner = MOVES[w.attack].ownerCharacter, color = ROSTER[owner].color;
    ctx.save(); ctx.translate(w.x, 438 - w.y); ctx.scale(w.vx >= 0 ? 1 : -1, 1);
    ctx.globalAlpha = Math.min(1, w.life / 120); ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.shadowColor = color; ctx.shadowBlur = reducedMotion ? 0 : 12; ctx.lineWidth = 3;
    if (owner === 12) {
      ctx.rotate(w.age * .006); ctx.fillStyle = '#fff8ef'; ctx.fillRect(-21, -28, 42, 56);
      ctx.strokeRect(-21, -28, 42, 56); ctx.lineWidth = 2;
      ctx.strokeRect(-15, -22, 30, 19); ctx.strokeRect(-15, 3, 13, 18); ctx.strokeRect(4, 3, 11, 18);
    } else if (owner === 13) {
      ctx.fillStyle = '#222336'; ctx.beginPath(); ctx.ellipse(0, 0, 38, 16, -.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      for (let r = 9; r < 35; r += 8) { ctx.beginPath(); ctx.ellipse(0, 0, r, r * .4, -.2, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    } else {
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha *= .8; ctx.beginPath();
        ctx.ellipse(-i * 12, 0, Math.max(8, w.rx - i * 4), Math.max(12, w.ry - i * 7), 0, -1.35, 1.35); ctx.stroke();
      }
      ctx.globalAlpha = Math.min(1, w.life / 120);
      ctx.beginPath(); ctx.ellipse(0, 8, 8, 5, -.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(7, 8); ctx.lineTo(7, -20); ctx.lineTo(18, -13); ctx.stroke();
    }
    ctx.restore();
  }
  function drawWave(w) {
    if (MOVES[w.attack]?.customerService) {
      ctx.save(); ctx.translate(w.x, 438 - w.y); ctx.scale(w.vx > 0 ? 1 : -1, 1);
      ctx.globalAlpha = Math.min(1, w.life / 150); ctx.strokeStyle = '#b5cffc'; ctx.fillStyle = '#ecf2ff';
      ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(i * 12 - 17, 0, 10 + i * 7, 22 + i * 12, 0, -1.25, 1.25); ctx.stroke(); }
      // A phone receiver identifies this as the customer-service call, separate from keyboard waves.
      ctx.save(); ctx.rotate(-.35); ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(-17, 0, 15, -.95, .95); ctx.stroke();
      ctx.fillRect(-12, -17, 10, 8); ctx.fillRect(-12, 9, 10, 8); ctx.restore(); ctx.restore(); return;
    }
    if (w.radial) {
      ctx.save();ctx.translate(w.x, 438 - w.y);
      ctx.globalAlpha = Math.min(1, w.life / 220);ctx.strokeStyle = '#c4ebff';ctx.lineWidth = 4;
      ctx.shadowColor = '#a7dfff';ctx.shadowBlur = reducedMotion ? 0 : 12;
      ctx.beginPath();ctx.arc(0,0,w.radius,0,Math.PI*2);ctx.stroke();
      ctx.strokeStyle = '#fff0bc';ctx.lineWidth = 1.5;
      ctx.beginPath();ctx.arc(0,0,Math.max(0,w.radius-10),0,Math.PI*2);ctx.stroke();
      for (let i=0;i<6;i++) {
        const angle=i*Math.PI/3+(reducedMotion?0:w.age*.00035),x=Math.cos(angle)*w.radius,y=Math.sin(angle)*w.radius;
        ctx.beginPath();ctx.ellipse(x,y,5,3,-.4,0,Math.PI*2);ctx.stroke();
        ctx.beginPath();ctx.moveTo(x+4,y);ctx.lineTo(x+4,y-16);ctx.lineTo(x+12,y-12);ctx.stroke();
      }
      ctx.restore();return;
    }
    if (w.attack === 'anonCry') {
      ctx.save(); ctx.translate(w.x, 438 - w.y); ctx.scale(w.vx > 0 ? 1 : -1, 1);
      ctx.globalAlpha = Math.min(1, w.life / 150); ctx.strokeStyle = '#b7e7ff'; ctx.fillStyle = '#dbf3ff';
      ctx.shadowColor = '#80c4ef'; ctx.shadowBlur = reducedMotion ? 0 : 12; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.ellipse(-i * 14, 0, Math.max(7, w.rx - i * 5), Math.max(10, w.ry - i * 8), 0, -1.35, 1.35); ctx.stroke();
      }
      for (const [x, y] of [[-12, -18], [-31, 20]]) {
        ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.quadraticCurveTo(x - 10, y + 4, x, y + 7); ctx.quadraticCurveTo(x + 9, y + 3, x, y - 10); ctx.fill();
      }
      ctx.restore(); return;
    }
    if (MOVES[w.attack]?.ownerCharacter >= 10) { drawMewtypeWave(w); return; }
    if (MOVES[w.attack]?.ownerCharacter >= 5) { drawMujicaWave(w); return; }
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
    const wide = w.attack !== 'tomoriNote', chorus = w.attack === 'tomoriChorus' || w.attack === 'tomoriSuper';
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
      if (effect.type === 'incantation') {
        const radius = effect.radius * (.72 + progress * .28);
        ctx.save(); ctx.scale(1, .32); ctx.strokeStyle = effect.color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
        ctx.rotate((effect.max - effect.life) * (reducedMotion ? 0 : .001));
        ctx.beginPath();
        for (let i = 0; i <= 9; i++) { const angle = i * Math.PI * 8 / 9; const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
          if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        ctx.stroke(); ctx.restore();
      } else if (effect.type === 'landing') {
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
    match.fighters.forEach(drawMaskAura);
    drawMujicaEffects();
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
      } else if (f.attack === 'penguinHey' && f.attackMs >= 100 && f.attackMs < 320) {
        ctx.scale(f.facing, 1);ctx.globalAlpha = Math.min(1, (320-f.attackMs)/180);
        ctx.beginPath();ctx.ellipse(115,-105,55,40,0,-1.4,1.4);ctx.stroke();
        ctx.fillStyle = '#e6f7ff';ctx.font = 'bold 22px sans-serif';ctx.fillText('hey?',65,-130);
      } else if (f.attack === 'penguinCall' && f.attackMs >= 120 && f.attackMs < 600) {
        ctx.scale(f.facing,1);ctx.globalAlpha=.6;
        const pulse=(f.attackMs%160)/160;
        for (let i=0;i<3;i++) {ctx.beginPath();ctx.ellipse(45-i*25,-95,35+pulse*30,65,0,-1.4,1.4);ctx.stroke();}
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
  function prepareRoundFinish() {
    finishSnapshot = match.roundEnd;
    finishCueStage = '';
    const panel = $('round-finish'), side = finishSnapshot.winner;
    const fighter = side < 0 ? null : finishSnapshot.fighters[side], character = fighter && ROSTER[fighter.character];
    const art = $('finish-art'), context = art.getContext('2d');
    const still = fighter?.character === 1 ? soyoFinishArt : fighter?.character === 7 ? uikaFinishArt : null;
    art.width = still ? still.naturalWidth : 640;
    art.height = still ? still.naturalHeight : 640;
    context.clearRect(0, 0, art.width, art.height);
    panel.classList.toggle('is-draw', !fighter);
    panel.style.setProperty('--finish-color', character?.color || '#c5d8eb');
    panel.dataset.character = fighter ? String(fighter.character) : 'draw';
    panel.dataset.form = fighter ? fighter.penguin ? 'penguin' : fighter.character >= 10 ? 'virtual' : fighter.stageForm ? 'stage' : 'normal' : '';
    $('finish-reason').textContent = match.reason === 'TIME OVER' ? 'TIME UP' : side < 0 ? 'DOUBLE K.O.' : 'K.O.';
    $('finish-side').textContent = fighter ? (side === 0 ? '1P' : match.options.mode === 'duel' ? '2P' : 'CPU') + ' / 奥义特写' : '回合平局';
    $('finish-name').textContent = character?.name || '不分胜负';
    $('finish-move').textContent = fighter ? MOVES[schemeFor(fighter).super].name : match.reason === 'TIME OVER' ? '时间耗尽 · 势均力敌' : '同时击倒 · 双方退场';
    $('finish-verdict').textContent = fighter ? '胜 利' : '平 局';
    $('finish-score').textContent = match.isTeamBattle ? '剩余队员  ' + match.teamRemaining.join(' : ') : '回合比分  ' + match.wins.join(' : ');
    $('finish-next').textContent = match.phase === 'finished' ? '本场对战结束' : match.isTeamBattle ? '下一位即将上场' : side < 0 ? '自动重赛' : '下一回合即将开始';
    const nextup = $('finish-nextup');
    nextup.hidden = !match.isTeamBattle || match.phase === 'finished';
    if (!nextup.hidden) for (let nextSide = 0; nextSide < 2; nextSide++) {
      const id = match.teams[nextSide][match.teamIndices[nextSide]], carry = match.teamCarry?.[nextSide];
      $('finish-portrait-' + nextSide).src = assets.characters[id].portrait;
      $('finish-contender-' + nextSide).textContent = ROSTER[id].name;
      $('finish-entry-' + nextSide).textContent = (nextSide === 0 ? '1P' : match.options.mode === 'duel' ? '2P' : 'CPU') + (carry ? ' · 继续迎战' : ' · 接力登场');
      $('finish-resources-' + nextSide).textContent = '生命 ' + (carry?.hp ?? MAX_HEALTH) + ' / 共鸣 ' + (carry?.energy ?? 0);
    }
    if (!fighter) return;
    if (still) {
      context.drawImage(still, 0, 0);
      return;
    }
    let atlas, frame;
    if (fighter.character >= 5) {
      const key = fighter.character + ':' + (fighter.character >= 10 ? mewtype : mujica).formFor(fighter);
      atlas = mujicaAtlases.get(key); frame = mujicaFrames.get(key).get('super-impact');
    } else if (fighter.character === 0) {
      atlas = dragonAtlas; frame = assets.milkDragon.frames[2];
    } else if (fighter.penguin) {
      atlas = penguinAtlas; frame = penguinActionFrames.get('call-release');
    } else {
      atlas = [null, soyoActionAtlas, atlases[2], atlases[3], atlases[4]][fighter.character];
      frame = [null, soyoActionFrames, tomoriActionFrames, ranaActionFrames, rikiActionFrames][fighter.character]
        .get([null, 'cast-release', 'chorus-release', 'super-release', 'super-release'][fighter.character]);
    }
    const scale = Math.min(600 / frame.w, 600 / frame.h), width = frame.w * scale, height = frame.h * scale;
    context.drawImage(atlas, frame.x, frame.y, frame.w, frame.h, (640 - width) / 2, (640 - height) / 2, width, height);
  }
  function updateRoundFinish() {
    const panel = $('round-finish');
    const curtain = $('round-curtain');
    const curtainOpacity = match.phase === 'roundOver' && match.roundEnd ? Math.max(0, 1 - match.phaseMs / 220)
      : match.phase === 'ready' && roundRevealFighter === match.fighters[0] ? Math.max(0, (match.phaseMs - 780) / 220) : 0;
    curtain.hidden = curtainOpacity <= 0 || match.paused;
    curtain.style.opacity = curtainOpacity;
    const active = !!match.roundEnd && match.phaseMs > 0 && ['roundOver', 'finished'].includes(match.phase);
    panel.hidden = !active || match.paused;
    if (!active) { finishSnapshot = null; return false; }
    if (finishSnapshot !== match.roundEnd) prepareRoundFinish();
    const elapsed = ROUND_END_TIMING.total - match.phaseMs;
    const artTime = Math.max(0, elapsed - ROUND_END_TIMING.knockout);
    panel.dataset.stage = elapsed < ROUND_END_TIMING.knockout ? 'ko' : artTime < ROUND_END_TIMING.art ? 'art' : 'settle';
    if (panel.dataset.stage !== finishCueStage && !match.paused) {
      if (panel.dataset.stage === 'art') tone('finishReveal', 0, 1, false);
      finishCueStage = panel.dataset.stage;
    }
    const enter = reducedMotion ? 1 : Math.min(1, artTime / 260);
    panel.style.setProperty('--finish-enter', enter);
    panel.style.setProperty('--finish-stamp', reducedMotion ? 1 : Math.min(1, Math.max(0, (elapsed - 50) / 150)));
    panel.style.setProperty('--finish-verdict', reducedMotion ? 1 : Math.min(1, Math.max(0, (artTime - 180) / 160)));
    panel.style.setProperty('--finish-settle', reducedMotion ? 1 : Math.min(1, Math.max(0, (artTime - ROUND_END_TIMING.art) / 160)));
    panel.style.setProperty('--finish-drift', reducedMotion ? 0 : Math.min(1, artTime / ROUND_END_TIMING.art));
    panel.style.setProperty('--finish-exit', Math.min(1, match.phaseMs / 220));
    panel.style.setProperty('--finish-progress', match.phaseMs / ROUND_END_TIMING.total);
    return true;
  }
  function updateUI(dt) {
    const player = match.fighters[0];
    const next = bindingList(player).find(({ move }) => player.energy >= (MOVES[move].cost || 0) && match.canCancel(player, move));
    $('chain-hint').textContent = next ? '可接 ' + next.key + ' · ' + MOVES[next.move].name : player.landingRecovery ? '落地收招中' : '招式表 F1';
    $('chain-hint').classList.toggle('available', !!next);
    document.querySelector('[data-key="KeyH"]').disabled = !!player.penguin || !!player.stageForm;
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
      if (f.summons) $('special' + n).textContent = '小天素罗 ×' + f.summons.units.length + ' · ' + (f.summons.ms / 1000).toFixed(1) + ' 秒';
      if (f.character === 1 && f.energy >= 100) $('special' + n).textContent = side ? '为什么要演奏春日影 · 已就绪' : '按 P · 为什么要演奏春日影';
      if (f.attack === 'soyoSuper') $('special' + n).textContent = '为什么要演奏春日影！';
      if (f.shield) $('special' + n).textContent = '钢板 ' + f.shield.hp + '/40 · ' + (f.shield.ms / 1000).toFixed(1) + ' 秒';
      if (f.penguin) $('special' + n).textContent = f.attack === 'penguinSuper' ? '春日影·企鹅演唱 · ' + f.hitMarks.length + ' / 5层音波' : '凑企鹅 · ' + (f.penguin.ms / 1000).toFixed(1) + ' 秒' + (f.energy >= 100 ? ' · P 春日影·企鹅演唱' : '');
      if (f.character === 4) $('special' + n).textContent = '节拍 ' + f.beats + '/4 · ' + (f.energy === 100 ? (side ? '全场共振就绪' : 'P 全场共振') : f.calibrateCooldown ? '校拍冷却 ' + (f.calibrateCooldown / 1000).toFixed(1) + '秒' : '↓＋I 节拍校准');
      if (f.character >= 5) {
        const form = schemeFor(f), superName = MOVES[form.super].name;
        $('special' + n).textContent = f.character >= 10 ? ROSTER[f.character].specialType : f.stageForm ? ROSTER[f.character].stageName + ' · ' + (f.stageForm.ms / 1000).toFixed(1) + ' 秒' : (side ? '登台变身 · 50%' : 'H 演出变身 · 50%');
        if (f.energy >= 100) $('special' + n).textContent += ' · ' + (side ? superName + '就绪' : 'P ' + superName);
        if (f.shield) $('special' + n).textContent = (f.character === 13 ? '节拍屏障 ' : '茶会护盾 ') + f.shield.hp + '/24 · ' + (f.shield.ms / 1000).toFixed(1) + ' 秒';
      }
      [...$('wins' + n).children].forEach((pip, i) => pip.classList.toggle('won', i < match.wins[side]));
      $('combo' + n).innerHTML = f.combo > 1 && f.comboMs > 0 && match.phase === 'fighting' ? f.combo + ' <small>HITS</small>' : '';
    }
    $('timer').textContent = match.options.mode === 'practice' ? '∞' : String(Math.ceil(match.remaining / 1000)).padStart(2, '0');
    const superFighter = match.fighters.find(f => f.attack === 'super');
    $('super-title').hidden = !superFighter || superFighter.attackMs > 1550 || match.paused || match.phase !== 'fighting';
    $('super-title').classList.toggle('from-right', superFighter === match.fighters[1]);
    const mujicaSuper = match.fighters.find(f => f.character >= 5 && MOVES[f.attack]?.category === 'super');
    $('mujica-super-title').hidden = !mujicaSuper || mujicaSuper.attackMs > 1550 || match.paused || match.phase !== 'fighting';
    if (mujicaSuper) {
      $('mujica-super-role').textContent = mujicaSuper.stageForm ? ROSTER[mujicaSuper.character].stageName : ROSTER[mujicaSuper.character].name;
      $('mujica-super-name').textContent = MOVES[mujicaSuper.attack].name;
      $('mujica-super-title').classList.toggle('from-right', mujicaSuper === match.fighters[1]);
    }
    syncSoyoCutins();
    syncSummonVoices();
    $('timer').parentElement.classList.toggle('warning', match.remaining < 11000);
    updateTeamHUD();
    $('round-label').textContent = match.isTeamBattle ? '3v3 · 第 ' + match.round + ' 战' : match.options.mode === 'practice' ? '练习' : '第 ' + match.round + ' 回合';
    $('pause').disabled = match.phase === 'idle';
    $('pause').textContent = match.paused ? '继续' : '暂停';
    let banner = '';
    if (match.phase === 'ready') banner = match.phaseMs > 300 ? '第 ' + match.round + (match.isTeamBattle ? ' 战' : ' 回合') : 'FIGHT!';
    else if (fightBanner > 0 && match.phase === 'fighting') { banner = 'FIGHT!'; if (!match.paused) fightBanner -= dt; }
    if (match.paused) banner = '';
    $('banner').innerHTML = banner;
    const ending = updateRoundFinish();
    const uiPhase = match.paused ? 'paused' : ending ? 'ending' : match.phase;
    if (uiPhase !== lastUiPhase) {
      lastUiPhase = uiPhase;
      $('overlay').hidden = ['ready', 'fighting', 'ending'].includes(uiPhase);
      $('overlay-options').hidden = !['paused', 'finished'].includes(uiPhase);
      if (uiPhase === 'paused') overlayContent('', '已暂停', '', '继续', '点击继续返回对战');
      if (uiPhase === 'roundOver' || uiPhase === 'finished') {
        const win = match.winner;
        if (match.isTeamBattle) {
          const label = win === 0 ? '1P' : match.options.mode === 'duel' ? '2P' : 'CPU';
          const title = uiPhase === 'finished' ? win < 0 ? '双方队伍全部退场' : label + ' 队伍获胜' : '下一位即将上场';
          const description = `${match.reason} · 剩余 ${match.teamRemaining[0]} : ${match.teamRemaining[1]}`;
          overlayContent('3v3 车轮战', title, description, uiPhase === 'finished' ? '原阵容再战' : '下一位上场', uiPhase === 'finished' ? '保留双方阵容与当前场地' : '自动继续 · 胜者保留血量与能量');
        } else {
          const title = win < 0 ? '平局' : ROSTER[match.fighters[win].character].name + '获胜';
          const description = `${match.reason} · ${match.wins[0]} : ${match.wins[1]}`;
          overlayContent(uiPhase === 'finished' ? '对战结束' : '回合结束', title, description, uiPhase === 'finished' ? '原阵容再战' : '下一回合', uiPhase === 'finished' ? '保留双方角色与当前场地' : '下一回合即将开始');
        }
      }
    }
    $('overlay-action').disabled = uiPhase === 'roundOver' && match.phaseMs > 0;
    $('status').textContent = { idle: '等待上场', ready: '回合准备', fighting: match.isTeamBattle ? '3v3车轮战进行中' : match.options.mode === 'practice' ? '自由练习 · 共鸣自动回充' : match.options.mode === 'duel' ? '本地双人对战中' : '与' + ROSTER[match.fighters[1].character].shortName + '切磋中', paused: '对战已暂停', ending: '胜利演出', roundOver: '回合结束', finished: '本场对战结束' }[uiPhase];
  }
  function frame(time) {
    const dt = Math.min(50, Math.max(0, time - (lastTime || time))); lastTime = time;
    if (inMenu || inSelection || starting) { requestAnimationFrame(frame); return; }
    if (!match.paused) visualTime += dt;
    const inputTickBefore = match.inputTick;
    if (lan.active) { lan.sendInput(match.paused ? {} : input(keys1)); taps.clear(); }
    else match.advance(dt, input(keys1), input(keys2));
    if (match.inputTick !== inputTickBefore) {
      // Keep a quick press during hitstop until a simulation tick consumes it.
      for (const key of taps) {
        for (const [side, map] of [[0, keys1], [1, keys2]]) {
          const action = Object.keys(map).find(action => map[action] === key);
          if (action && match.previous[side][action]) taps.delete(key);
        }
      }
    }
    consumeEvents(); draw(dt); updateUI(dt);
    if (lan.connected) {
      $('settings').disabled=$('super-demo').disabled=true;
      $('restart').disabled=lan.side!==0;
      if(match.phase==='finished'&&!match.paused){$('overlay-action').disabled=lan.side!==0;$('overlay-action').textContent=lan.side===0?'原阵容再战':'等待房主再战';}
    }
    requestAnimationFrame(frame);
  }
  async function boot() {
    try {
      [atlases, backgrounds, normalAtlas, dragonAtlas, actionAtlas, tensoraAtlas, soyoActionAtlas, penguinAtlas, parfaitActionAtlas, parfaitImage, jabAtlases, menuPortraits, soyoFinishArt, uikaFinishArt, menuStagePortraits] = await Promise.all([
        Promise.all(assets.characters.slice(0, 5).map(art => loadImage(art.atlas))),
        Promise.all(assets.backgrounds.map(loadImage)),
        loadImage(assets.anonNormals.atlas), loadImage(assets.milkDragon.atlas), loadImage(assets.anonActions.atlas), loadImage(assets.soyoTensora.atlas), loadImage(assets.soyoActions.atlas), loadImage(assets.penguin.atlas),
        loadImage(assets.ranaParfaitActions.atlas), loadImage(assets.ranaParfait.src),
        Promise.all(assets.jabActions.map(art => loadImage(art.atlas))),
        Promise.all(assets.characters.slice(5).map(art => loadImage(art.portrait))),
        loadImage(assets.soyoFinishArt),
        loadImage(assets.uikaFinishArt),
        Promise.all([5, 6, 7, 8, 9].map(id => loadImage(assets.mujicaPortraits[id].stage.portrait))),
      ]);
      renderStageChoices();
      warmCharacterArt(selectedCharacters().filter(id => id < 5));
      loaded = true; $('loading').hidden = true; $('menu-loading').hidden = true;
      document.querySelectorAll('[data-menu-ready]').forEach(button => button.disabled = false);
      updateMode(); updateCharacterInfo(); renderMainMenu(); requestAnimationFrame(frame);
    } catch (error) {
      $('loading').textContent = $('menu-loading').textContent = window.MYGO_HOSTED
        ? '网页资源加载失败，请刷新页面重试。' : '素材加载失败，请重新打开完整的 index.html。'; console.error(error);
    }
  }
  // A read-only game reference is useful for inspecting the standalone prototype.
  window.mygoGame = { get match() { return match; }, get loaded() { return loaded; }, get camera() { return camera.snapshot(); }, get selection() { return selectionScreen.snapshot(); },
    get feedback() { return { inkMs, motion: impactMotion && { ...impactMotion }, effects: fx.map(e => ({ type: e.type, life: e.life })) }; } };
  boot();
})();
