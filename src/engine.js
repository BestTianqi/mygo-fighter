/* Browser port of the core combat and terrain rules in Game/StageFighterState.h.
 * Independent of rendering; fixed 10 ms steps keep gameplay frame-rate independent. */
(function (root) {
  'use strict';
  const controls = typeof module !== 'undefined' && module.exports ? require('./controls.js') : root.MygoControls;
  const mujica = typeof module !== 'undefined' && module.exports ? require('./mujica.js') : root.MygoMujica;
  const mewtype = typeof module !== 'undefined' && module.exports ? require('./mewtype.js') : root.MygoMewtype;
  const isMujica = character => character >= 5 && character < 10;
  const kitFor = f => f.character >= 10 ? mewtype : isMujica(f.character) ? mujica : null;
  const MAX_HEALTH = 200;
  const ROUND_END_TIMING = Object.freeze({ impact: 120, knockout: 700, art: 1900, settle: 600, total: 3200 });
  const WORLD = Object.freeze({ left: -720, right: 1680, bottom: -180, top: 1120 });
  // Reference values are normalized from a 54-unit standing sprite to our 235-unit artwork.
  const FEEL = Object.freeze({ scale: 235 / 54, walk: 1.82 * 60 * 235 / 54,
    airRatio: 1.38 / 1.82, jump: 275 * 235 / 54, airJumpRatio: 230 / 275,
    gravity: 760 * 235 / 54, dashSpeed: 5.15 * 60 * 235 / 54,
    dashDuration: 180, dashCooldown: 600, dashInvuln: 120, dashCost: 10,
    normalBuffer: 150, specialBuffer: 300, bodyGap: 20 * 235 / 54,
    groundDrag: 11 * 60 * 235 / 54, airDrag: 3 * 60 * 235 / 54,
    baseZoom: 54 / 235 * 960 / 384 });
  const ROSTER = [
    { name: '千早爱音', shortName: '爱音', en: 'CHIHAYA ANON', skill: '闪耀合奏', color: '#f6a4c7', role: '主音吉他', archetype: '均衡型', specialType: '突进', description: '向前一步，用闪耀的合奏打开局面。', speed: 345, jump: 620, lightReach: 94, heavyReach: 126, heavyDamage: 16, specialReach: 170 },
    { name: '长崎素世', shortName: '素世', en: 'NAGASAKI SOYO', skill: '回响终章', color: '#dfbd91', role: '贝斯', archetype: '控场型', specialType: '对空', description: '保持距离，用回响截住对手的跃起。', speed: 345, jump: 620, lightReach: 94, heavyReach: 126, heavyDamage: 16, specialReach: 230, specialVertical: 160 },
    { name: '高松灯', shortName: '灯', en: 'TAKAMATSU TOMORI', skill: '迷途之歌', color: '#a8bfdc', role: '主唱', archetype: '歌声控场型', specialType: '三段歌声', description: '握紧麦克风，让诗句与歌声传到对手面前。', speed: 315, jump: 590, lightReach: 88, heavyReach: 118, heavyDamage: 16, specialReach: 210 },
    { name: '要乐奈', shortName: '乐奈', en: 'KANAME RANA', skill: '野猫即兴独奏', color: '#b5d4ba', role: '吉他', archetype: '灵巧突进型', specialType: '四段拨弦', description: '低姿突进与吉他挥击，抓住空隙即兴独奏。', speed: 390, jump: 690, lightReach: 100, heavyReach: 128, heavyDamage: 15, specialReach: 195 },
    { name: '椎名立希', shortName: '立希', en: 'SHIINA TAKI', skill: '八拍过门', color: '#b5a1d7', role: '鼓手', archetype: '鼓点压制型', specialType: '八段连打', description: '双棒衔接重拍，积累四拍强化下一次特殊技。', speed: 330, jump: 620, lightReach: 100, heavyReach: 145, heavyDamage: 20, specialReach: 200 },
    ...mujica.CHARACTERS,
    ...mewtype.CHARACTERS,
  ];
  const NORMAL_BUTTONS = ['light', 'medium', 'heavy', 'lightKick', 'mediumKick', 'heavyKick'];
  for (const profile of ROSTER) { profile.speed *= FEEL.walk / 345; profile.jump *= FEEL.jump / 620; }
  const PENGUIN_PROFILE = { ...ROSTER[2], speed: 375 * FEEL.walk / 345, jump: 640 * FEEL.jump / 620 };
  const profileFor = f => f.character === 2 && f.penguin ? PENGUIN_PROFILE : ROSTER[f.character];
  const NORMAL_KEYS = ['J', 'H', 'K', 'N', 'M', ','];
  const verticalScale = Math.sqrt(FEEL.gravity / 1600);
  const MOVES = {};
  const normalSpecs = [
    ['轻拳·起音', 300, 80, 140, 8, 94, 180, 120],
    ['中拳·切分', 390, 120, 180, 11, 115, 240, 150],
    ['重拳·重拍', 520, 170, 240, 16, 126, 300, 210],
    ['轻脚·前奏', 270, 70, 120, 6, 105, 160, 110],
    ['中脚·延音', 420, 130, 200, 12, 145, 260, 180],
    ['重脚·回旋', 590, 210, 280, 18, 175, 350, 250],
  ];
  for (const [stanceIndex, stance] of ['standing', 'crouch', 'air'].entries()) {
    normalSpecs.forEach(([name, duration, start, end, damage, reach, stun, push], index) => {
      const key = (stance === 'standing' ? '' : stance + '_') + NORMAL_BUTTONS[index];
      MOVES[key] = { name: (stance === 'crouch' ? '蹲' : stance === 'air' ? '空中' : '') + name,
        category: 'normal', stance, strength: index % 3 + 1, normalIndex: stanceIndex * 6 + index,
        command: (stance === 'crouch' ? '↓ + ' : stance === 'air' ? '跳跃 + ' : '') + NORMAL_KEYS[index],
        duration, start, end, damage: damage - (stance === 'standing' ? 0 : 1), reach,
        stun, push, level: stance === 'air' ? 'high' : stance === 'crouch' && index !== 2 ? 'low' : 'mid',
        vertical: stance === 'crouch' && index === 2 ? 175 : 95,
        knockdown: stance === 'crouch' && index === 5 ? 650 : 0,
      };
    });
  }
  Object.assign(MOVES, {
    penguinTransform: { name: '凑企鹅变身', command: 'G / Delete（2P）', category: 'transformation', tomoriOnly: true, nativeOnly: true, ground: true,
      cost: 50, duration: 0, start: 0, end: 0, damage: 0, lifetime: 20000 },
    penguinKick: { name: '飞踢', command: 'C / 空中F；2P Home / PageDown', category: 'special', tomoriOnly: true, penguinOnly: true, penguinAirAction: true,
      cost: 10, duration: 680, start: 140, end: 330, damage: 16, stun: 350, push: 190, reach: 160, vertical: 140, knockdown: 350 },
    penguinCry: { name: '糖哭·反击', command: 'U / 小键盘*（2P）', category: 'defense', tomoriOnly: true, penguinOnly: true, ground: true, counter: true,
      cost: 15, duration: 900, start: 80, end: 700, damage: 0 },
    penguinCryWave: { name: '糖哭·回击', category: 'special', tomoriOnly: true, penguinOnly: true, internal: true, projectile: true,
      damage: 10, chip: 1, stun: 260, push: 170, speed: 500, lifetime: 600, radiusX: 24, radiusY: 44, height: 90 },
    penguinHey: { name: 'hey?·当面震慑', command: 'I / 2P 小键盘5', category: 'special', tomoriOnly: true, penguinOnly: true, ground: true,
      cost: 10, duration: 440, start: 120, end: 180, damage: 10, chip: 1, stun: 300, push: 220, reach: 220, vertical: 150 },
    penguinLaugh: { name: '唐笑·震荡', command: 'T / 小键盘 Enter（2P）', category: 'special', tomoriOnly: true, penguinOnly: true, ground: true, omni: true,
      cost: 20, duration: 650, start: 200, end: 270, damage: 12, stun: 360, push: 250, reach: 200, vertical: 180 },
    penguinCall: { name: '咕咕嘎嘎·冲撞三连', command: 'O / 2P 小键盘6', category: 'special', tomoriOnly: true, penguinOnly: true, ground: true,
      cost: 40, duration: 900, start: 180, end: 560, damage: 8, chip: 1, stun: 260, push: 40, reach: 170, vertical: 150,
      movement: 260, movementEnd: 500, pulses: [{ at:180,damage:6 }, { at:340,damage:6 }, { at:500,damage:12,push:240 }] },
    special: { name: '闪耀合奏', command: 'L', category: 'special', duration: 650, start: 230, end: 290, damage: 24, stun: 380, push: 280, cost: 60 },
    wave: { name: '音符弹·中', command: '↓↘→ + H / I', category: 'special', projectile: true, duration: 380, start: 120, end: 140, damage: 14, stun: 200, push: 150, cost: 20, speed: 440 },
    tomoriNote: { name: '微光音符', command: 'I / 小键盘4（2P）', category: 'special', tomoriOnly: true, nativeOnly: true, ground: true, projectile: true,
      duration: 440, start: 140, end: 160, damage: 12, chip: 2, stun: 220, push: 110, cost: 20, speed: 380, lifetime: 1800, radiusX: 16, radiusY: 25, height: 100 },
    tomoriEcho: { name: '诗句回声', command: 'T / 小键盘 Enter（2P）', category: 'special', tomoriOnly: true, nativeOnly: true, ground: true, projectile: true,
      duration: 700, start: 230, end: 250, damage: 18, chip: 3, stun: 330, push: 210, cost: 30, speed: 360, lifetime: 1800, radiusX: 34, radiusY: 65, height: 110 },
    tomoriChorus: { name: '迷途之歌', command: 'L / 小键盘3（2P）', category: 'special', tomoriOnly: true, nativeOnly: true, ground: true, projectile: true,
      duration: 1100, start: 260, end: 660, shots: [260, 450, 640], damage: 8, chip: 1, stun: 260, push: 70, cost: 60, speed: 420, lifetime: 1800, radiusX: 26, radiusY: 54, height: 110 },
    tomoriSuper: { name: '一辈子乐队', command: 'P / 2P 小键盘8', category: 'super', ownerCharacter: 2, tomoriOnly: true, nativeOnly: true, ground: true, projectile: true,
      cost: 100, duration: 7200, start: 500, end: 6490, invuln: 100, shots: [500, 3400, 6400], damage: 48,
      speed: 420, lifetime: 1400, height: 110, radiusX: 40, radiusY: 100, stun: 400, push: 25,
      pulses: [{ at: 500, damage: 12 }, { at: 3400, damage: 16 }, { at: 6400, damage: 20, push: 150 }] },
    penguinSuper: { name: '司凤版春日影演唱', command: 'P / 2P 小键盘8', category: 'super', ownerCharacter: 2, tomoriOnly: true, penguinOnly: true, ground: true, projectile: true,
      cost: 100, duration: 8300, start: 500, end: 7990, invuln: 100, shots: [500, 1700, 2900, 4100, 5300], damage: 10,
      radial: true, fixedDamage: true, omni: true, reach: 650, speed: 250, lifetime: 2800, height: 100, stun: 360, push: 10,
      pulses: [500, 1700, 2900, 4100, 5300].map(at => ({ at, damage: 10 })) },
    sonic: { name: 'TGW·音波攻击', command: 'T', category: 'special', projectile: true, anonOnly: true, ground: true,
      duration: 620, start: 180, end: 200, damage: 22, stun: 360, push: 360, cost: 30, speed: 560, lifetime: 950, artIndex: 2 },
    anonCry: { name: '唐哭', command: '← + U', category: 'special', projectile: true, ownerCharacter: 0, anonOnly: true, ground: true,
      duration: 650, start: 180, end: 200, damage: 12, stun: 300, push: 100, cost: 20, speed: 480, lifetime: 1200,
      maxReach: 560, radiusX: 30, radiusY: 50, height: 110, artIndex: 2 },
    thrust: { name: '闪光突刺', command: '↓↘→ + 脚 / C', category: 'special', anonOnly: true, ground: true,
      duration: 500, start: 130, end: 220, damage: 14, stun: 330, push: 170, cost: 15, reach: 140, artIndex: 1 },
    rush: { name: '切分三连击', command: 'V', category: 'special', anonOnly: true, ground: true,
      duration: 900, start: 100, end: 590, damage: 22, stun: 260, push: 80, cost: 25, artIndex: 0, cancelAt: 520,
      pulses: [{ at: 100, damage: 6, reach: 150, stun: 230, push: 60 }, { at: 280, damage: 6, reach: 165, stun: 260, push: 80 }, { at: 500, damage: 10, reach: 180, stun: 400, push: 220 }] },
    dive: { name: '流星俯冲踢', command: '空中 ↓ + , / F', category: 'special', anonOnly: true, airOnly: true, minHeight: 45,
      duration: 700, start: 60, end: 600, damage: 16, stun: 420, push: 130, cost: 15, reach: 100, vertical: 115, level: 'high', artIndex: 17 },
    throw: { name: '投技·换拍', command: 'B（后投：← + B）', category: 'throw', ground: true, duration: 520, start: 80, end: 100, damage: 18, stun: 500, push: 320, reach: 66, knockdown: 650 },
    shield: { name: '钢板防护', command: 'U', category: 'defense', anonOnly: true, ground: true, cost: 20,
      duration: 360, start: 100, end: 120, damage: 0, durability: 40, lifetime: 3000 },
    heal: { name: '归心·自愈', command: 'G / Delete（2P）', category: 'support', soyoOnly: true, ground: true,
      duration: 1200, start: 700, end: 710, damage: 0, cost: 35, healing: 24, recast: 12000 },
    soyoCutline: { name: '剪切线', command: '前 + I / 2P 前 + 小键盘5', category: 'special', ownerCharacter: 1, soyoOnly: true, ground: true,
      duration: 760, start: 180, end: 440, cost: 25, damage: 20, reach: 360, vertical: 105, stun: 280, push: 0, chip: 1,
      pulses: [{ at: 180, damage: 9, push: 0 }, { at: 360, damage: 11, stun: 380, push: 280 }] },
    summon: { name: '小天素罗召唤', command: 'T / 小键盘 Enter（2P）', category: 'special', soyoOnly: true, ground: true,
      duration: 600, start: 220, end: 240, damage: 4, cost: 50, lifetime: 10000, callGap: 1000 },
    tensoraHit: { name: '小天素罗突袭', category: 'special', internal: true, minion: true, damage: 4, chip: 1, stun: 110, push: 45 },
    soyoSuper: { name: '为什么要演奏春日影', command: 'P / 2P 小键盘−', category: 'super', soyoOnly: true, ground: true,
      cost: 100, duration: 2800, start: 850, end: 850, damage: 0, hardStun: 2000, reach: 620, expansion: 450, waveDuration: 700, invuln: 850 },
    rising: { name: '闪耀升龙', command: '→↓↘ + 拳 / Y', category: 'special', anonOnly: true, ground: true, duration: 650, start: 80, end: 180, damage: 20, stun: 380, push: 190, cost: 30, reach: 125, vertical: 230, invuln: 110, launch: 380 },
    spin: { name: '旋律回旋踢', command: '↓↙← + 脚 / ;', category: 'special', anonOnly: true, duration: 620, start: 160, end: 280, damage: 18, stun: 330, push: 230, cost: 25, reach: 180, vertical: 115, artIndex: 5 },
    overhead: { name: '越拍踢', command: '→ + ,', category: 'normal', anonOnly: true, ground: true, strength: 3, duration: 650, start: 260, end: 340, damage: 18, stun: 360, push: 200, reach: 160, level: 'high', artIndex: 5 },
    super: { name: '粉色奶龙·法天象地', command: '↓↘→↓↘→ + 拳 / P', category: 'super', anonOnly: true, ground: true,
      duration: 2600, start: 800, end: 1580, damage: 48, stun: 450, push: 150, cost: 100, reach: 450, vertical: 360, invuln: 850,
      pulses: [{ at: 800, damage: 8, reach: 250 }, { at: 1120, damage: 10, reach: 350 }, { at: 1500, damage: 30, reach: 470, push: 320, knockdown: 750 }],
    },
  });
  MOVES.waveLight = { ...MOVES.wave, name: '音符弹·轻', command: '↓↘→ + J', anonOnly: true, damage: 10, speed: 330 };
  MOVES.waveHeavy = { ...MOVES.wave, name: '音符弹·重', command: '↓↘→ + K', anonOnly: true, damage: 18, speed: 570 };
  const ranaNames = ['猫掌轻拍', '琴身碰撞', '吉他重挥', '探步轻踢', '侧身中踢', '转身重踢'];
  for (const stance of ['standing', 'crouch', 'air']) NORMAL_BUTTONS.forEach((button, i) => {
    const suffix = (stance === 'standing' ? '' : stance + '_') + button, source = MOVES[suffix];
    MOVES['rana_' + suffix] = { ...source, ranaOnly: true,
      name: (stance === 'crouch' ? '蹲下·' : stance === 'air' ? '空中·' : '') + ranaNames[i],
      duration: Math.max(230, source.duration - 30), start: Math.max(60, source.start - 10),
      damage: source.damage - 1, reach: source.reach + (i < 3 ? 8 : 0) };
  });
  Object.assign(MOVES, {
    ranaPick: { name: '拨弦·弦音', command: 'I / 2P 小键盘4', category: 'special', ranaOnly: true, ground: true, projectile: true,
      cost: 20, duration: 390, start: 110, end: 130, damage: 12, chip: 2, stun: 230, push: 120, speed: 600, lifetime: 1100, height: 110, radiusX: 20, radiusY: 32 },
    ranaChord: { name: '强奏·和弦', command: 'T / 2P 小键盘Enter', category: 'special', ranaOnly: true, ground: true, projectile: true,
      cost: 30, duration: 630, start: 210, end: 230, damage: 20, chip: 3, stun: 340, push: 260, speed: 460, lifetime: 1250, height: 110, radiusX: 34, radiusY: 70 },
    ranaParfait: { name: '抹茶芭菲投掷', command: 'V / 2P End', category: 'special', ranaOnly: true, ground: true, projectile: true,
      cost: 25, duration: 700, start: 220, end: 240, damage: 18, chip: 2, stun: 320, push: 190, speed: 550, lifetime: 1800,
      height: 135, spawnOffset: 85, radiusX: 24, radiusY: 42, projectileVy: 170, projectileGravity: 420 },
    ranaRush: { name: '野猫突进', command: 'C / 2P Home', category: 'special', ranaOnly: true, ground: true,
      cost: 15, duration: 420, start: 100, end: 190, damage: 12, stun: 300, push: 145, reach: 135, vertical: 100 },
    ranaRise: { name: '琴锋上挑', command: 'Y / 2P 小键盘+', category: 'special', ranaOnly: true, ground: true,
      cost: 25, duration: 650, start: 70, end: 200, damage: 17, stun: 350, push: 150, reach: 135, vertical: 230, invuln: 80, launch: 380 },
    ranaSlide: { name: '猫步滑踢', command: 'U / 2P 小键盘*', category: 'special', ranaOnly: true, ground: true,
      cost: 20, duration: 550, start: 100, end: 230, damage: 13, stun: 340, push: 200, reach: 155, vertical: 90, level: 'low', knockdown: 450 },
    ranaDive: { name: '跃猫俯冲', command: '空中 F / 2P PageDown', category: 'special', ranaOnly: true, airOnly: true, minHeight: 45,
      cost: 15, duration: 700, start: 50, end: 600, damage: 15, stun: 390, push: 130, reach: 105, vertical: 115, level: 'high' },
    ranaSolo: { name: '野猫即兴独奏', command: 'L / 2P 小键盘3', category: 'special', ranaOnly: true, ground: true, projectile: true,
      cost: 60, duration: 1050, start: 180, end: 680, shots: [180, 340, 500, 660], damage: 7, chip: 1, stun: 240, push: 45, speed: 540, lifetime: 1600, height: 110, radiusX: 26, radiusY: 52 },
    ranaTune: { name: '静心调弦', command: 'G / 2P Delete', category: 'support', ranaOnly: true, ground: true,
      cost: 0, duration: 1180, start: 800, end: 810, damage: 0, energyGain: 20, recast: 8000 },
    ranaSuper: { name: '有趣的女人·全力独奏', command: 'P / 2P 小键盘8', category: 'super', ranaOnly: true, ground: true,
      cost: 100, duration: 2300, start: 400, end: 1080, damage: 48, stun: 400, push: 75, reach: 420, vertical: 260, invuln: 430,
      pulses: [{ at: 400, damage: 8, reach: 260 }, { at: 700, damage: 12, reach: 340 }, { at: 1000, damage: 28, reach: 420, push: 300, knockdown: 700 }] },
  });
  const penguinNames = ['鳍拍·轻', '鳍拍·连', '企鹅顶撞', '蹬脚·轻', '蹬脚·中', '回身扫脚'];
  for (const stance of ['standing', 'crouch', 'air']) NORMAL_BUTTONS.forEach((button, i) => {
    const suffix = (stance === 'standing' ? '' : stance + '_') + button, source = MOVES[suffix];
    MOVES['penguin_' + suffix] = { ...source, name: (stance === 'crouch' ? '低位·' : stance === 'air' ? '空中·' : '') + penguinNames[i],
      penguinNormal: true, tomoriOnly: true, penguinOnly: true, damage: [6, 9, 14, 5, 10, 16][i], reach: [90, 110, 125, 105, 130, 155][i] };
  });
  const rikiNames = ['轻鼓棒', '交叉双棒', '重拍砸棒', '低踢', '侧踢', '转身扫踢'];
  for (const stance of ['standing', 'crouch', 'air']) NORMAL_BUTTONS.forEach((button, i) => {
    const suffix = (stance === 'standing' ? '' : stance + '_') + button, source = MOVES[suffix];
    MOVES['riki_' + suffix] = { ...source, rikiOnly: true,
      name: (stance === 'crouch' ? '蹲下·' : stance === 'air' ? '空中·' : '') + rikiNames[i],
      damage: [7, 11, 20, 6, 10, 17][i] - (stance === 'standing' ? 0 : 1),
      duration: source.duration + (i === 2 ? 40 : 0), reach: source.reach + (i < 3 ? 12 : 0) };
  });
  Object.assign(MOVES, {
    rikiRoll: { name: '滚奏连打', command: 'I / 2P 小键盘4', category: 'special', rikiOnly: true, ground: true,
      cost: 20, duration: 650, start: 100, end: 490, damage: 15, stun: 300, push: 10, reach: 190, cancelAt: 400,
      pulses: [100, 250, 400].map(at => ({ at, damage: 5, reach: 190 })) },
    rikiRush: { name: '踩镲抢拍', command: 'C / 2P Home', category: 'special', rikiOnly: true, ground: true,
      cost: 15, duration: 500, start: 160, end: 250, damage: 12, stun: 350, push: 35, reach: 170, dashSpeed: 1000 },
    rikiOverhead: { name: '反拍砸击', command: 'U / 2P 小键盘*', category: 'special', rikiOnly: true, ground: true,
      cost: 20, duration: 760, start: 300, end: 390, damage: 18, stun: 360, push: 130, reach: 195, vertical: 140, level: 'high' },
    rikiShock: { name: '低音落震', command: 'T / 2P 小键盘Enter', category: 'special', rikiOnly: true, ground: true, projectile: true,
      cost: 30, duration: 700, start: 220, end: 240, damage: 18, chip: 3, stun: 310, push: 160, speed: 480, lifetime: 720,
      height: 40, radiusX: 32, radiusY: 42, groundShock: true, level: 'low' },
    rikiRise: { name: '重拍上挑', command: 'Y / 2P 小键盘+', category: 'special', rikiOnly: true, ground: true,
      cost: 25, duration: 760, start: 90, end: 220, damage: 16, stun: 390, push: 90, reach: 160, vertical: 240, launch: 380 },
    rikiCalibrate: { name: '节拍校准', command: 'G / 2P Delete', category: 'support', rikiOnly: true, ground: true,
      cost: 25, duration: 800, start: 300, end: 310, damage: 0, recast: 8000 },
    rikiEight: { name: '八拍过门', command: 'L / 2P 小键盘3', category: 'special', rikiOnly: true, ground: true,
      cost: 60, duration: 1450, start: 180, end: 1110, damage: 29, stun: 300, push: 8, reach: 220, cancelAt: 1020,
      pulses: Array.from({ length: 8 }, (_, i) => ({ at: 180 + i * 120, damage: i === 7 ? 8 : 3, reach: 220,
        ...(i === 7 ? { push: 150, knockdown: 650 } : {}) })) },
    rikiSuper: { name: '哈？哈？哈？·全场共振', command: 'P / 2P 小键盘8', category: 'super', rikiOnly: true, ground: true,
      cost: 100, duration: 4400, start: 500, end: 3690, damage: 48, stun: 500, push: 30, reach: 420, vertical: 280, invuln: 100,
      pulses: [{ at: 500, damage: 8, reach: 300, chip: 2 }, { at: 1800, damage: 12, reach: 360, chip: 2 },
        { at: 3600, damage: 28, reach: 420, push: 300, knockdown: 750, chip: 4 }] },
  });
  for (const [name, changes] of Object.entries({
    rikiRoll: { hitRecovery: 100 }, rikiRush: { dashSpeed: 1220, pull: true }, rikiOverhead: { stun: 440 },
    rikiShock: { shots: [220, 410], end: 430 }, rikiRise: { vertical: 290, follow: true },
  })) {
    const source = MOVES[name];
    MOVES[name + 'Boost'] = { ...source, ...changes, name: source.name + '·四拍强化', internal: true, boosted: true, base: name,
      ...(source.pulses ? { pulses: source.pulses.map(p => ({ ...p })) } : {}) };
  }
  MOVES.rikiShockExtra = { ...MOVES.rikiShock, name: '四拍·追加低音', internal: true, damage: 8, chip: 1 };
  Object.assign(MOVES, mujica.MOVES, mewtype.MOVES);
  function chainPrefix(f) { return kitFor(f) ? kitFor(f).prefixFor(f) : f.penguin ? 'penguin' : ['anon', 'soyo', 'tomori', 'rana', 'riki'][f.character]; }
  function firstJab(f) { return kitFor(f) ? kitFor(f).normalFor(f, 'light') : f.penguin ? 'penguin_light' : f.character === 3 ? 'rana_light' : f.character === 4 ? 'riki_light' : 'light'; }
  for (const key of ['light', 'rana_light', 'penguin_light', 'riki_light']) Object.assign(MOVES[key], {
    duration: 300, start: 80, end: 130, reach: 45 * FEEL.scale,
    stun: 270, push: 50 * FEEL.scale, jab: true,
  });
  MOVES.throw.reach = 40 * FEEL.scale;
  for (const move of Object.values(MOVES)) {
    if (move.launch) move.launch *= verticalScale;
    if (!move.jab && move.push) move.push *= FEEL.scale / 2;
    if (move.pulses) for (const pulse of move.pulses) if (pulse.push) pulse.push *= FEEL.scale / 2;
  }
  for (const [prefix, source] of [['anon', MOVES.light], ['soyo', MOVES.light], ['tomori', MOVES.light], ['rana', MOVES.rana_light], ['penguin', MOVES.penguin_light], ['riki', MOVES.riki_light]]) {
    for (const chain of [2, 3]) MOVES[prefix + 'Jab' + chain] = { ...source, internal: true, chain,
      name: (chain === 2 ? '二段·' : '三段·') + ({ anon: ['侧踢', '破拍上勾拳'], soyo: ['横掌', '双掌上挑'], tomori: ['贴身肘击', '麦克风上挑'], rana: ['琴身撞击', '琴锋上挑'], penguin: ['蹬脚', '企鹅顶撞'], riki: ['交叉双棒', '重拍上挑'] })[prefix][chain - 2],
      duration: chain === 2 ? 320 : 450, start: chain === 2 ? 80 : 130, end: chain === 2 ? 150 : 200,
      jab: true, reach: (chain === 2 ? 47 : 51) * FEEL.scale,
      normalIndex: chain === 2 && prefix === 'anon' ? 4 : chain === 2 && prefix === 'penguin' ? 3 : chain - 1,
      strength: chain, damage: chain === 2 ? 10 : 17, stun: chain === 2 ? 300 : 480,
      push: (chain === 2 ? 65 : 145) * FEEL.scale, launch: chain === 3 ? 220 * FEEL.scale : 0,
      anonOnly: prefix === 'anon', soyoOnly: prefix === 'soyo', tomoriOnly: prefix === 'tomori' || prefix === 'penguin',
      ranaOnly: prefix === 'rana', rikiOnly: prefix === 'riki', penguinOnly: prefix === 'penguin' };
  }
  // Shared balance pass covers every roster member, stance, chain and transformation.
  for (const profile of ROSTER) profile.heavyDamage = Math.max(1, Math.round(profile.heavyDamage * .75));
  for (const [key, move] of Object.entries(MOVES)) {
    if (move.category === 'normal') {
      move.damage = Math.max(1, Math.round(move.damage * .75)); move.duration += 80;
      if (move.pulses) move.pulses = move.pulses.map(p => ({ ...p, damage: Math.max(1, Math.round(p.damage * .75)) }));
    }
    if (move.category !== 'super' || key === 'super') continue;
    for (const timing of ['duration','start','end','invuln','expansion','waveDuration','movementEnd']) {
      if (move[timing]) move[timing] = Math.max(10, Math.round(move[timing] / 20) * 10);
    }
    if (move.shots) move.shots = move.shots.map(t => Math.round(t / 20) * 10);
    if (move.pulses) move.pulses = move.pulses.map(p => ({ ...p, at: Math.round(p.at / 20) * 10 }));
    move.hitstop = 100;
  }
  Object.assign(MOVES.penguinSuper, { name:'春日影·企鹅演唱',duration:1500,start:50,end:930,hitstop:0,
    shots:[50,230,410,590,770],pulses:[50,230,410,590,770].map(at=>({at,damage:10})),speed:650,lifetime:1100 });
  for (const form of ['normal','stage']) Object.assign(MOVES['mujica_7_'+form+'_super'], {
    duration:1000,start:80,end:930,crawlSpeed:600,forwardCrawl:true,damage:10,fixedDamage:true,hitstop:0,
    pulses:[100,280,460,640,820].map((at,i)=>({at,damage:10,reach:200,stun:240,push:i===4?180:0})),
  });
  function moveList(character, penguin = false) {
    return Object.entries(MOVES).filter(([key, move]) => {
      if (move.internal) return false;
      if (character >= 10) return key === 'throw' || (move.ownerCharacter === character && move.form === 'virtual');
      if (isMujica(character)) return key === 'throw' || key === 'mujicaTransform' || (move.ownerCharacter === character && move.form === (penguin ? 'stage' : 'normal'));
      if ((move.ownerCharacter !== undefined && move.ownerCharacter !== character) || move.mujicaOnly) return false;
      if (character === 0) return !move.soyoOnly && !move.tomoriOnly && !move.ranaOnly && !move.rikiOnly;
      if (character === 2) return penguin ? move.penguinOnly || key === 'throw' : !move.penguinOnly && (['light', 'heavy', 'throw'].includes(key) || move.tomoriOnly);
      if (character === 3) return move.ranaOnly || key === 'throw';
      if (character === 4) return move.rikiOnly || key === 'throw';
      return ['light', 'heavy', 'special', 'wave', 'throw'].includes(key) || (character === 1 && ['summon', 'heal', 'soyoSuper', 'soyoCutline'].includes(key));
    }).map(([key, move]) => ({ key, ...move, name: character === 1 ? ({ special: '回响终章', light: '轻掌·试探', heavy: '双掌·推拍' }[key] || move.name) : character === 2 ? ({ light: '轻击·试探', heavy: '重击·前行', throw: penguin ? '鳍抱·摔投' : move.name }[key] || move.name) : move.name,
      command: character !== 0 && key === 'wave' ? 'I' : character !== 0 && key === 'throw' ? (penguin || character >= 3 ? 'B（后投：← + B）' : 'U（后投：← + U）') : move.command }));
  }
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  class Match {
    constructor(options = {}) {
      this.options = { mode: 'cpu', format: '1v1', difficulty: 1, characters: [0, 0], seed: 128, ...options };
      this.options.characters = [...this.options.characters];
      this.teamIndices = [0, 0]; this.teamCarry = null;
      if (this.isTeamBattle) {
        const teams = this.options.teams;
        if (!Array.isArray(teams) || teams.length !== 2 || !Array.from(teams).every(team =>
          Array.isArray(team) && team.length === 3 && new Set(team).size === 3 &&
          Array.from(team).every(id => Number.isInteger(id) && id >= 0 && id < ROSTER.length))) {
          throw new RangeError('Team battle requires two teams of three unique valid character IDs');
        }
        this.teams = teams.map(team => [...team]);
        this.options.teams = this.teams.map(team => [...team]);
        this.options.characters = this.teams.map(team => team[0]);
      }
      this.seed = this.options.seed || 1;
      this.wins = [0, 0]; this.round = 1; this.phase = 'idle'; this.paused = false;
      this.events = []; this.elapsed = 0; this.accumulator = 0; this.winner = -1;
      this.resetRound();
    }
    get isTeamBattle() { return this.options.format === '3v3'; }
    get teamRemaining() { return this.teamIndices.map(index => Math.max(0, 3 - index)); }
    random() { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296; }
    floorHeight(x) {
      const points = this.options.terrain?.ground;
      let base = 0;
      if (points?.length) {
        base = x <= points[0].x ? points[0].y : points.at(-1).y;
        for (let i = 1; i < points.length; i++) if (x > points[i - 1].x && x <= points[i].x) {
          const a = points[i - 1], b = points[i]; base = a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x); break;
        }
      }
      return base + Math.max(0, ...(this.options.terrain?.hills || []).map(p => x <= p.left || x >= p.right ? 0
        : x < p.peak ? (x - p.left) / (p.peak - p.left) * p.height : (p.right - x) / (p.right - p.peak) * p.height));
    }
    surfaceBelow(x, y, dropMs = 0) {
      let height = this.floorHeight(x);
      if (!dropMs) for (const p of this.options.terrain?.platforms || []) {
        if (x >= p.left && x <= p.right && p.height <= y + .1) height = Math.max(height, p.height);
      }
      return height;
    }
    grounded(f) { return f.vy <= 0 && Math.abs(f.y - this.surfaceBelow(f.x, f.y, f.dropMs)) < .1; }
    airHeight(f) { return f.y - this.surfaceBelow(f.x, f.y, f.dropMs); }
    setTerrain(terrain) {
      const onFloor = this.fighters.map(f => this.grounded(f) && Math.abs(f.y - this.floorHeight(f.x)) < .1);
      this.options.terrain = terrain;
      this.aiGoal = -1;
      this.fighters.forEach((f, i) => {
        const floor = this.floorHeight(f.x);
        if (onFloor[i]) { f.y = floor; f.vy = 0; }
        else if (f.y < floor || (f.vy <= 0 && f.y <= floor + .1)) this.land(f, floor);
      });
    }
    land(f, height) {
      const speed = Math.max(0, -f.vy), heavy = speed > 180 * FEEL.scale && (f.stun > 0 || f.launched || f.hp <= 0);
      if (speed > 0) this.events.push({ type: 'landing', side: this.fighters.indexOf(f), x: f.x, y: height, heavy, speed });
      if (heavy) { f.knockdown = 400; f.stun = 0; f.wakeInvuln = 770; }
      f.launched = false;
      f.y = height; f.vy = 0; if (!f.dashMs) f.vx = 0; f.airUsed = false; f.jumps = 2; f.dropMs = 0;
      if (f.attack && MOVES[f.attack].stance === 'air') { f.attack = null; f.cooldown = 60; }
      if (f.attack === 'dive' || f.attack === 'ranaDive') { f.attack = null; f.cooldown = f.landingRecovery = f.contact ? 100 : 240; f.contact = false; }
      if (f.attack === 'penguinKick') { f.attack = null; f.cooldown = f.landingRecovery = f.contact ? 90 : 200; f.contact = false; }
    }
    jumpTime(f, height) {
      const speed = profileFor(f).jump, discriminant = speed * speed - 2 * FEEL.gravity * (height - f.y);
      return discriminant < 0 ? -1 : (speed + Math.sqrt(discriminant)) / FEEL.gravity;
    }
    nextPlatform(a, b) {
      const platforms = this.options.terrain?.platforms || [];
      const target = platforms.findIndex(p => b.x >= p.left && b.x <= p.right && Math.abs(b.y - p.height) < .1);
      if (target < 0 || b.y <= a.y + .1) return -1;
      const support = platforms.findIndex(p => a.x >= p.left && a.x <= p.right && Math.abs(a.y - p.height) < .1);
      const start = support < 0 ? platforms.length : support;
      const nodes = [...platforms, { left: WORLD.left + 45, right: WORLD.right - 45, height: a.y }], visited = new Set([start]);
      const queue = [{ index: start, first: -1 }], profile = profileFor(a);
      while (queue.length) {
        const { index, first } = queue.shift(), from = nodes[index];
        for (let i = 0; i < platforms.length; i++) {
          const to = platforms[i];
          if (visited.has(i) || to.height <= from.height) continue;
          const time = this.jumpTime({ ...a, y: from.height }, to.height);
          const gap = Math.max(0, to.left + 18 - (from.right - 18), from.left + 18 - (to.right - 18));
          if (time < 0 || time * profile.speed < gap + 8) continue;
          const hop = first < 0 ? i : first;
          if (i === target) return hop;
          visited.add(i); queue.push({ index: i, first: hop });
        }
      }
      return -1;
    }
    resetRound() {
      this.roundEnd = null;
      this.fighters = [0, 1].map(side => ({
        character: this.options.characters[side], x: side ? 680 : 280, y: 0,
        vx: 0, vy: 0, pushVx: 0, facing: side ? -1 : 1, hp: MAX_HEALTH, energy: 0,
        attack: null, attackMs: 0, hit: false, stun: 0, hardStun: 0, soyoSuper: null, cooldown: 0, guard: false,
        crouch: false, knockdown: 0, landingRecovery: 0, dashMs: 0, dashCooldown: 0, dashInvuln: 0, jumps: 2, combo: 0,
        comboMs: 0, cancelDepth: 0, contact: false, lastHitAt: -1, buffer: null, bufferMs: 0,
        jumpBufferMs: 0, dashBufferMs: 0, blinkBuffer: false, dashDirection: side ? -1 : 1, coyoteMs: 0,
        motion: [], controlMs: 0, hitMarks: [], minionHitMarks: [], attackCrouch: false, backThrow: false, airUsed: false, shield: null, summons: null, dropMs: 0, healCooldown: 0, tuneCooldown: 0, penguin: null,
        wakeInvuln: 0, launched: false, lightHoldMs: 0, pressIds: {},
        beats: 0, beatGranted: false, calibrateCooldown: 0, stageForm: null, moveCooldowns: {}, attackTarget: null, runeMarks: [],
      }));
      if (this.options.mode === 'practice') {
        this.fighters[0].energy = 100; this.fighters[1].x = 480;
      }
      for (const f of this.fighters) f.y = this.floorHeight(f.x);
      this.remaining = 60000; this.waves = []; this.areas = []; this.freeze = 0; this.inputTick = 0;
      this.previous = [{}, {}]; this.aiThink = 360; this.aiGuard = 0; this.aiGoal = -1; this.winner = -1; this.accumulator = 0;
    }
    start(carry = null) {
      this.resetRound();
      if (carry) carry.forEach((resources, side) => { if (resources) Object.assign(this.fighters[side], resources); });
      this.phase = 'ready'; this.phaseMs = 1000; this.paused = false;
    }
    endStageForm(side) {
      const f = this.fighters[side]; if (!f.stageForm) return;
      f.stageForm = null;
      if (MOVES[f.attack]?.form === 'stage') { f.attack = null; f.contact = false; f.hitMarks = []; f.cooldown = 0; f.vx = 0; }
      f.buffer = null; f.bufferMs = 0; this.events.push({ type: 'stageFormEnd', side });
    }
    endPenguin(side) {
      const f = this.fighters[side]; if (!f.penguin) return;
      f.penguin = null;
      if (MOVES[f.attack]?.penguinOnly || f.attack === 'penguinTransform') { f.attack = null; f.contact = false; f.hitMarks = []; f.cooldown = Math.min(f.cooldown, 120); }
      f.buffer = null; f.bufferMs = 0; this.events.push({ type: 'penguinEnd', side });
    }
    restart() {
      this.wins = [0, 0]; this.round = 1; this.events = []; this.teamIndices = [0, 0]; this.teamCarry = null;
      if (this.isTeamBattle) this.options.characters = this.teams.map(team => team[0]);
      this.start();
    }
    nextRound() {
      if (this.phase !== 'roundOver' || this.phaseMs > 0) return false;
      if (this.isTeamBattle) {
        this.round++;
        this.options.characters = this.teams.map((team, side) => team[this.teamIndices[side]]);
        this.start(this.teamCarry); this.teamCarry = null;
        this.events.push({ type: 'teamAdvance', characters: [...this.options.characters], teamIndices: [...this.teamIndices] });
        return true;
      }
      if (this.winner !== -1) this.round++;
      this.start();
      this.events.push({ type: 'roundAdvance', characters: [...this.options.characters] });
      return true;
    }
    setPaused(value) {
      if (this.phase === 'idle') return;
      this.paused = value; this.release();
    }
    release() { this.previous = [{}, {}]; this.fighters.forEach(f => { f.buffer = null; f.bufferMs = f.jumpBufferMs = f.dashBufferMs = 0; f.motion = []; }); }
    advance(ms, p1 = {}, p2 = {}) {
      if (this.paused || this.phase === 'idle') return;
      this.accumulator += clamp(ms, 0, 60000);
      while (this.accumulator >= 10) { this.accumulator -= 10; this.step(p1, p2); }
    }
    aiInput() {
      const a = this.fighters[1], b = this.fighters[0];
      const d = Math.abs(a.x - b.x), toward = b.x > a.x ? 1 : -1;
      const input = {};
      if (d > 95) input[toward > 0 ? 'right' : 'left'] = true;
      if (this.grounded(a)) this.aiGoal = this.nextPlatform(a, b);
      if (this.aiGoal >= 0 && !a.attack && !a.stun && !a.knockdown) {
        const platform = this.options.terrain.platforms[this.aiGoal];
        if (this.grounded(a)) {
          const travel = this.jumpTime(a, platform.height) * profileFor(a).speed;
          const launch = clamp(a.x, platform.left + 18 - travel + 8, platform.right - 18 + travel - 8);
          input.left = launch < a.x - 3; input.right = launch > a.x + 3;
          if (!input.left && !input.right) input.jump = true;
        }
        return input;
      }
      if (this.grounded(a) && b.y + 35 < a.y && !a.attack) {
        const platform = (this.options.terrain?.platforms || []).find(p => a.x >= p.left && a.x <= p.right && Math.abs(a.y - p.height) < .1);
        if (platform && b.x >= platform.left && b.x <= platform.right) return { crouch: true, jump: true };
      }
      this.aiThink -= 10;
      if (this.aiThink > 0) return input;
      const level = this.options.difficulty;
      this.aiThink = [440, 260, 150][level] + this.random() * 160;
      if (a.stun || a.attack || a.knockdown) return input;
      if (kitFor(a)) {
        const scheme = controls.schemeFor(a);
        if (this.grounded(a)) {
          if (isMujica(a.character) && !a.stageForm && a.energy >= 75 && this.elapsed > 8000 && this.random() < .35) return { unified: true, transform: true };
          if (a.energy === 100 && d <= 420 && Math.abs(a.y - b.y) <= 300 && this.random() < .45) return { unified: true, super: true };
          const legal = scheme.base.map((key, index) => ({ key, index, move: MOVES[key] }))
            .filter(({ key, move }) => a.energy >= move.cost && !a.moveCooldowns[key] && (!move.delayedArea || !this.areas.some(area => area.owner === 1 && area.attack === key)));
          if (legal.length && d < 720 && this.random() < .72) return { unified: true, ['skill' + (legal[Math.floor(this.random() * legal.length)].index + 1)]: true };
          if (b.attack && d < 200 && this.random() < .4) return { guard: true, crouch: b.crouch };
        }
        if (d < 180) return { unified: true, [this.random() < .65 ? 'light' : 'heavy']: true, crouch: this.random() < .2 };
        if (d > 200 && this.random() < .2) input.jump = true;
        return input;
      }
      if (a.character === 2 && !a.penguin && a.hp <= MAX_HEALTH * .7 && a.energy >= 50 && this.grounded(a) && d > 120) return { heal: true };
      if (a.character === 2 && a.energy === 100 && this.grounded(a) &&
          (a.penguin ? Math.hypot(a.x-b.x,a.y-b.y) <= MOVES.penguinSuper.reach : d < 420 && Math.abs(a.y-b.y) <= 300)) return { super: true };
      if (a.penguin && this.grounded(a)) {
        if (b.attack && d < 170 && a.energy >= 15) return { shield: true };
        if (d < 180 && a.energy >= 20) return { sonic: true };
        if (d > 180 && d < 430 && a.energy >= 40) return { special: true };
        if (d >= 180 && d < 220 && a.energy >= 10) return { wave: true };
        if (d > 145 && d < 370 && a.energy >= 10) return { thrust: true };
      }
      if (a.character === 2 && !a.penguin && this.grounded(a)) {
        if (a.energy >= 60 && d > 180 && d < 650) return { special: true };
        if (a.energy >= 30 && d > 150 && d < 550) return { sonic: true };
      }
      if (a.character === 1 && a.hp <= MAX_HEALTH * .65 && !a.healCooldown && this.grounded(a) && a.energy >= MOVES.heal.cost && d > 240 && !b.attack) return { heal: true };
      if (a.character === 1 && a.energy === 100 && this.grounded(a) && d < 340 && Math.abs(a.y - b.y) < 300) return { super: true };
      if (a.character === 1 && !a.summons && this.grounded(a) && a.energy >= 50 && d > 90) { input.sonic = true; return input; }
      if (a.character === 1 && this.grounded(a) && a.energy >= MOVES.soyoCutline.cost && d > 160 && d <= MOVES.soyoCutline.reach && Math.abs(a.y - b.y) <= MOVES.soyoCutline.vertical) {
        return { unified: true, left: b.x < a.x, right: b.x > a.x, skill2: true };
      }
      if (a.character === 0 && a.energy === 100 && d < 340 && this.random() > .35) { input.super = true; return input; }
      if (a.character === 4 && this.grounded(a)) {
        if (a.energy === 100 && d < 300) return { super: true };
        if (a.energy >= 25 && b.y > a.y + 30 && d < 170) return { rising: true };
        if (a.energy >= 60 && d < 190) return { special: true };
        if (a.energy >= 20 && d < 190 && b.crouch) return { shield: true };
        if (a.energy >= 20 && d < 170) return { wave: true };
        if (a.energy >= 15 && d > 170 && d < 400) return { thrust: true };
        if (a.energy >= 30 && d > 350 && d < 650) return { sonic: true };
        if (a.energy >= 25 && a.beats < 4 && !a.calibrateCooldown && d > 650 && !b.attack) return { heal: true };
      }
      if (a.character === 3) {
        if (this.airHeight(a) >= 70 && !a.airUsed && a.energy >= 15 && d < 220) return { dive: true };
        if (this.grounded(a)) {
          if (a.energy === 100 && d < 260) return { super: true };
          if (a.energy >= 25 && b.y > a.y + 35 && d < 140) return { rising: true };
          if (a.energy >= 25 && d > 320 && d < 760) return { rush: true };
          if (a.energy >= 60 && d > 180 && d < 600) return { special: true };
          if (a.energy >= 15 && d > 150 && d < 320) return { thrust: true };
          if (a.energy >= 20 && d < 140 && b.guard && !b.crouch) return { shield: true };
          if (a.energy < 40 && !a.tuneCooldown && d > 400 && !b.attack) return { heal: true };
        }
      }
      if (b.attack && d < 170 && this.random() < [.2, .55, .8][level]) {
        input.guard = true; input.crouch = b.crouch;
        this.aiGuard = 260; return input;
      }
      if (a.character === 0) {
        if (this.airHeight(a) >= 70 && !a.airUsed && a.energy >= 15 && d < 230 && this.random() > .35) { input.dive = true; return input; }
        if (this.grounded(a) && d > 155 && d < 300 && a.energy >= 15 && this.random() > .55) { input.thrust = true; return input; }
        if (this.grounded(a) && d < 145 && a.energy >= 25 && this.random() > .6) { input.rush = true; return input; }
        if (this.grounded(a) && d > 250 && a.energy >= 30 && this.random() > .65) { input.sonic = true; return input; }
      }
      if (d < 65 && b.guard && this.random() > .45) input.throw = true;
      else if (d < 130) {
        if (a.energy >= 60 && this.random() > .45) input.special = true;
        else input[a.character === 0 || a.character >= 3 || a.penguin ? NORMAL_BUTTONS[Math.floor(this.random() * 6)] : this.random() > .38 ? 'light' : 'heavy'] = true;
      } else if (d > 190 && a.energy >= 20 && this.random() > .45) input.wave = true;
      else if (d > 180 && this.random() > .76) input.jump = true;
      return input;
    }
    step(p1, p2) {
      this.elapsed += 10;
      if (this.phase === 'ready') {
        this.phaseMs -= 10; this.previous = [{ ...p1 }, { ...p2 }];
        if (this.phaseMs <= 0) { this.phase = 'fighting'; this.events.push({ type: 'fight' }); }
        return;
      }
      if (this.phase !== 'fighting') {
        this.phaseMs = Math.max(0, this.phaseMs - 10);
        if (this.roundEnd && this.phaseMs > 0) {
          // Presentation only: settle the final hit without running attacks or changing resources.
          const elapsed = ROUND_END_TIMING.total - this.phaseMs;
          const t = Math.max(0, Math.min(1, (elapsed - ROUND_END_TIMING.impact) / (ROUND_END_TIMING.knockout - ROUND_END_TIMING.impact)));
          this.fighters.forEach((f, side) => {
            const start = this.roundEnd.fighters[side];
            f.y = start.y + (start.landY - start.y) * t * t + (f.hp <= 0 ? 48 * Math.sin(Math.PI * t) : 0);
            if (t === 1) f.y = start.landY;
            if (elapsed >= ROUND_END_TIMING.impact) f.vy = 0;
          });
        }
        if (this.phase === 'roundOver' && this.phaseMs <= 0) {
          const pendingTime = this.accumulator;
          this.nextRound(); this.accumulator = pendingTime;
        }
        return;
      }
      if (this.freeze > 0) { this.freeze -= 10; return; }
      this.inputTick++;
      if (this.options.mode !== 'practice') this.remaining = Math.max(0, this.remaining - 10);
      const dummy = this.options.dummy;
      const inputs = [p1, this.options.mode === 'practice' ? { guard: dummy === 'guard' || dummy === 'crouch', crouch: dummy === 'crouch' } : this.options.mode === 'cpu' ? this.aiInput() : p2];
      if (this.options.mode === 'cpu' && this.aiGuard > 0) {
        this.aiGuard -= 10; inputs[1].guard = true; inputs[1].left = inputs[1].right = false;
      }
      for (let side = 0; side < 2; side++) this.updateFighter(side, inputs[side]);
      this.separate();
      this.updateSoyoSupers();
      // Resolve both active strikes together so simultaneous attacks can trade.
      const hits = [];
      for (let side = 0; side < 2; side++) {
        const f = this.fighters[side], other = this.fighters[1 - side], move = MOVES[f.attack];
        if (!move || f.attackMs < move.start || f.attackMs > move.end || (f.hit && (move.projectile || move.delayedArea || !move.damage || f.attack === 'summon'))) continue;
        if (move.counter) continue;
        if (f.attack === 'ranaTune') {
          const amount = Math.min(move.energyGain, 100 - f.energy);
          f.energy += amount; f.hit = true; this.events.push({ type: 'tune', side, amount }); continue;
        }
        if (f.attack === 'rikiCalibrate') {
          f.beats = Math.min(4, f.beats + 2); f.hit = true; this.events.push({ type: 'beat', side, beats: f.beats }); continue;
        }
        if (f.attack === 'heal') {
          const amount = Math.min(move.healing, MAX_HEALTH - f.hp);
          if (f.hp > 0) { f.hp += amount; this.events.push({ type: 'heal', side, amount }); }
          f.hit = true; continue;
        }
        if (move.durability) {
          f.shield = { hp: move.durability, ms: move.lifetime, hitMs: 0 };
          f.hit = true; this.events.push({ type: 'shieldSummon', side }); continue;
        }
        if (f.attack === 'summon') {
          f.summons = { ms: move.lifetime, bornAt: this.elapsed, units: [0, 1, 2].map(i => ({
            id: i, hp: 20, maxHp: 20, called: false,
            x: clamp(f.x + (i - 1) * 52, WORLD.left + 32, WORLD.right - 32), y: f.y + 8, facing: f.facing,
            phase: 'follow', cooldown: 350 + i * 320, phaseMs: 0, hitMs: 0,
          })) };
          f.hit = true; this.events.push({ type: 'summon', side }); continue;
        }
        if (move.delayedArea) {
          this.areas.push({ owner: side, attack: f.attack, x: f.attackTarget.x, y: f.attackTarget.y,
            warning: move.warning, life: move.warning + 100, radius: move.areaRadius,
            platform: (this.options.terrain?.platforms || []).find(p => f.attackTarget.x >= p.left && f.attackTarget.x <= p.right && Math.abs(p.height - f.attackTarget.y) < .1) });
          this.events.push({ type: 'areaWarning', side, attack: f.attack, x: f.attackTarget.x, y: f.attackTarget.y });
          f.hit = true; continue;
        }
        if (!move.damage && !move.pulses) { f.hit = true; continue; }
        if (move.projectile) {
          if (move.shots) {
            const shot = move.shots.findIndex((at, i) => f.attackMs >= at && !f.hitMarks.includes(i));
            if (shot >= 0) { this.spawnWave(side, f.attack === 'rikiShockBoost' && shot === 1 ? 'rikiShockExtra' : f.attack, move.pulses?.[shot]); f.hitMarks.push(shot); this.events.push({ type: 'voicePulse', side, pulse: shot, attack: f.attack }); }
            f.hit = f.hitMarks.length === move.shots.length;
          } else { this.spawnWave(side, f.attack); f.hit = true; }
          continue;
        }
        const profile = ROSTER[f.character];
        const pulse = move.pulses?.findIndex(p => f.attackMs >= p.at && f.attackMs < p.at + 90);
        if (move.pulses && pulse < 0) continue;
        const impact = move.pulses ? move.pulses[pulse] : {};
        if (impact.glyph && !f.runeMarks.includes(pulse)) {
          f.runeMarks.push(pulse);
          this.events.push({ type: 'memePulse', side, attack: f.attack, pulse, glyph: impact.glyph,
            x: f.attackTarget?.x ?? f.x, y: f.attackTarget?.y ?? f.y, radius: move.areaRadius });
        }
        const compactReach = f.character === 2 && ['light', 'heavy'].includes(f.attack) ? (f.attack === 'light' ? MOVES.light.reach * profile.lightReach / 94 : profile.heavyReach) : 0;
        const reach = impact.reach || compactReach || move.reach || (f.attack === 'light' ? profile.lightReach : f.attack === 'heavy' ? profile.heavyReach : profile.specialReach);
        const vertical = move.vertical || (f.attack === 'special' ? profile.specialVertical || 130 : 88);
        if (move.category !== 'throw') {
          const group = other.summons;
          for (const unit of [...(group?.units || [])]) {
            const mark = `${group.bornAt}:${unit.id}:${pulse ?? 'strike'}`;
            if (!f.minionHitMarks.includes(mark) && this.meleeConnects(f, unit, move, reach, vertical)) {
              f.minionHitMarks.push(mark); this.hitMinion(side, unit, f.attack, impact);
            }
          }
        }
        if (f.hit || (move.pulses && f.hitMarks.includes(pulse)) || !this.meleeConnects(f, other, move, reach, vertical) || other.knockdown > 0 || this.invulnerable(other)) continue;
        if (move.category === 'throw' && (!this.grounded(f) || !this.grounded(other) || Math.abs(f.y - other.y) > 25 || other.stun)) continue;
        if (move.pulses) f.hitMarks.push(pulse);
        if (!move.pulses) f.hit = true;
        hits.push({ side, attack: f.attack, impact: { ...impact, beatEligible: f.character === 4 && move.category === 'normal' && !f.beatGranted } });
      }
      for (const hit of hits) this.hit(hit.side, hit.attack, undefined, undefined, hit.impact);
      this.updateSummons();
      this.updateAreas();
      this.updateWaves();
      this.previous = inputs.map(input => ({ ...input }));
      if (this.options.mode !== 'practice' && (this.remaining <= 0 || this.fighters.some(f => f.hp <= 0))) this.endRound();
    }
    recordDirection(f, input) {
      f.controlMs += 10;
      const horizontal = (Number(!!input.right) - Number(!!input.left)) * f.facing;
      const direction = 5 + horizontal + (input.crouch ? -3 : input.jump ? 3 : 0);
      f.motion = f.motion.filter(e => f.controlMs - e.t <= 500);
      if (f.motion.at(-1)?.d !== direction) f.motion.push({ d: direction, t: f.controlMs });
    }
    motionMatches(f, pattern) {
      const history = f.motion.filter(e => e.d !== 5 && f.controlMs - e.t <= 500);
      if (history.length < pattern.length || f.controlMs - history.at(-1).t > 150) return false;
      return pattern.every((d, i) => history[history.length - pattern.length + i].d === d);
    }
    resolveAttack(f, input, pressed) {
      if (input.unified || kitFor(f)) {
        const skill = controls.resolveSkill(f, input, pressed, !this.grounded(f));
        if (skill !== undefined) return skill;
      }
      const requested = ['super', 'shield', 'throw', 'dive', 'thrust', 'rush', 'rising', 'spin', 'special', 'heal', 'summon', 'anonCry', 'sonic', 'wave', 'penguinTransform', 'penguinKick', 'penguinCry', 'penguinHey', 'penguinLaugh', 'penguinCall', 'tomoriChorus', 'tomoriEcho', 'tomoriNote', ...NORMAL_BUTTONS.slice().reverse()].find(pressed);
      if (!requested) return null;
      if (requested === 'anonCry') return f.character === 0 ? requested : null;
      if (requested === 'light' && this.grounded(f) && !input.crouch) {
        if (f.attack === firstJab(f)) return chainPrefix(f) + 'Jab2';
        if (MOVES[f.attack]?.chain === 2) return chainPrefix(f) + 'Jab3';
      }
      if (kitFor(f)) {
        if (requested === 'light' || requested === 'heavy') return kitFor(f).normalFor(f, requested, !this.grounded(f) ? 'air' : input.crouch ? 'crouch' : 'standing');
        if (requested === 'throw') return requested;
        return null;
      }
      if (f.character === 4) {
        if (NORMAL_BUTTONS.includes(requested)) return 'riki_' + (!this.grounded(f) ? 'air_' : input.crouch ? 'crouch_' : '') + requested;
        return ({ wave: 'rikiRoll', thrust: 'rikiRush', shield: 'rikiOverhead', sonic: 'rikiShock', rising: 'rikiRise', heal: 'rikiCalibrate', special: 'rikiEight', super: 'rikiSuper', throw: 'throw' })[requested] || null;
      }
      if (f.character === 3) {
        if (NORMAL_BUTTONS.includes(requested)) return 'rana_' + (!this.grounded(f) ? 'air_' : input.crouch ? 'crouch_' : '') + requested;
        return ({ wave: 'ranaPick', sonic: 'ranaChord', rush: 'ranaParfait', thrust: 'ranaRush', rising: 'ranaRise', shield: 'ranaSlide', dive: 'ranaDive', special: 'ranaSolo', heal: 'ranaTune', super: 'ranaSuper', throw: 'throw' })[requested] || null;
      }
      if (requested === 'heal') return f.character === 2 ? 'penguinTransform' : f.character === 1 ? 'heal' : null;
      if (requested === 'summon') return f.character === 1 ? 'summon' : null;
      if (f.character === 2) {
        if (requested === 'penguinTransform') return requested;
        if (f.penguin) {
          if (NORMAL_BUTTONS.includes(requested)) return 'penguin_' + (!this.grounded(f) ? 'air_' : input.crouch ? 'crouch_' : '') + requested;
          return ({ wave: 'penguinHey', sonic: 'penguinLaugh', special: 'penguinCall', super: 'penguinSuper', shield: 'penguinCry', thrust: 'penguinKick', dive: 'penguinKick' }[requested]) || (['throw', 'penguinKick', 'penguinCry', 'penguinHey', 'penguinLaugh', 'penguinCall'].includes(requested) ? requested : null);
        }
        return ({ wave: 'tomoriNote', sonic: 'tomoriEcho', special: 'tomoriChorus', super: 'tomoriSuper', shield: 'throw' }[requested]) || (['light', 'heavy', 'throw', 'tomoriNote', 'tomoriEcho', 'tomoriChorus'].includes(requested) ? requested : null);
      }
      if (f.character === 1 && requested === 'sonic') return 'summon';
      if (f.character === 1 && requested === 'super') return 'soyoSuper';
      if (f.character !== 0 && requested === 'shield') return 'throw'; // Preserve Soyo's U binding.
      if (f.character !== 0) return ['light', 'heavy', 'special', 'wave', 'throw'].includes(requested) ? requested : null;
      const index = NORMAL_BUTTONS.indexOf(requested);
      if (index < 0) return requested;
      if (!this.grounded(f) && input.crouch && requested === 'heavyKick') return 'dive';
      if (input.unified) return (!this.grounded(f) ? 'air_' : input.crouch ? 'crouch_' : '') + requested;
      let command;
      if (index < 3 && this.motionMatches(f, [2, 3, 6, 2, 3, 6]) && f.energy >= 100) command = 'super';
      else if (index < 3 && this.motionMatches(f, [6, 2, 3])) command = 'rising';
      else if (index < 3 && this.motionMatches(f, [2, 3, 6])) command = ['waveLight', 'wave', 'waveHeavy'][index];
      else if (index >= 3 && this.motionMatches(f, [2, 1, 4])) command = 'spin';
      else if (index >= 3 && this.motionMatches(f, [2, 3, 6])) command = 'thrust';
      if (command) { f.motion = []; return command; }
      if (this.grounded(f) && !input.crouch && requested === 'heavyKick' && (input.right ? 1 : input.left ? -1 : 0) === f.facing) return 'overhead';
      return (!this.grounded(f) ? 'air_' : input.crouch ? 'crouch_' : '') + requested;
    }
    canCancel(f, name) {
      if (name === 'mujicaTransform') return false;
      const chain = MOVES[name]?.chain;
      if (this.grounded(f) && chain && ((chain === 2 && f.attack === firstJab(f)) || (chain === 3 && MOVES[f.attack]?.chain === 2))) {
        return f.attackMs >= (chain === 2 ? 120 : 130) && f.attackMs <= (chain === 2 ? 280 : 300);
      }
      if (!f.attack || !f.contact || (!f.hit && !f.hitMarks.length) || f.cancelDepth >= (f.character === 0 ? 5 : 4)) return false;
      const current = MOVES[f.attack], next = MOVES[name];
      if (!next || f.attackMs < current.start + 20 || f.attackMs > current.end + 150) return false;
      if (!this.grounded(f)) return current.stance === 'air' && (((f.character === 0 && name === 'dive' || f.character === 3 && name === 'ranaDive') && this.airHeight(f) >= next.minHeight) || (f.penguin && name === 'penguinKick'));
      if (current.cancelAt && (f.attackMs < current.cancelAt || f.lastHitAt < current.pulses.at(-1).at)) return false;
      if (next.category === 'super') return current.category === 'normal' || current.category === 'special';
      if (f.character === 0 && f.attack === 'thrust' && name === 'rush') return true;
      if (f.character === 4 && (current.base || f.attack) === 'rikiRush' && name === 'rikiRoll') return true;
      if (f.character === 4 && ['rikiRoll', 'rikiRollBoost'].includes(f.attack) && name === 'rikiEight') return true;
      return current.category === 'normal' && (next.category === 'special' || (next.category === 'normal' && next.strength > current.strength));
    }
    invulnerable(f) { return f.knockdown > 0 || f.wakeInvuln > 0 || f.dashInvuln > 0 || (!!f.attack && !!MOVES[f.attack].invuln && f.attackMs < MOVES[f.attack].invuln); }
    updateFighter(side, input) {
      const f = this.fighters[side], other = this.fighters[1 - side];
      if (f.penguin) { f.penguin.ms -= 10; if (f.penguin.ms <= 0) this.endPenguin(side); }
      if (f.stageForm) { f.stageForm.ms -= 10; if (f.stageForm.ms <= 0) this.endStageForm(side); }
      for (const key of Object.keys(f.moveCooldowns)) f.moveCooldowns[key] = Math.max(0, f.moveCooldowns[key] - 10);
      let profile = profileFor(f);
      if (f.shield) {
        f.shield.ms -= 10; f.shield.hitMs = Math.max(0, f.shield.hitMs - 10);
        if (f.shield.ms <= 0) f.shield = null;
      }
      for (const key of ['stun', 'hardStun', 'cooldown', 'knockdown', 'landingRecovery', 'dashMs', 'dashCooldown', 'dashInvuln', 'wakeInvuln', 'comboMs', 'bufferMs', 'dropMs', 'healCooldown', 'tuneCooldown', 'calibrateCooldown', 'jumpBufferMs', 'dashBufferMs', 'coyoteMs']) f[key] = Math.max(0, f[key] - 10);
      f.stun = Math.max(f.stun, f.hardStun);
      if (f.hardStun) {
        input = {};
        f.buffer = null; f.bufferMs = f.jumpBufferMs = f.dashBufferMs = f.coyoteMs = 0;
        f.blinkBuffer = false; f.motion = []; f.guard = false;
      }
      if (!f.comboMs) f.combo = 0;
      if (!f.bufferMs) f.buffer = null;
      if (!f.attack && !f.stun && !f.dashMs) {
        const facing = other.x >= f.x ? 1 : -1;
        if (f.facing !== facing) f.motion = [];
        f.facing = facing;
      }
      this.recordDirection(f, input);
      const ground = this.grounded(f), oldY = f.y, onFloor = ground && Math.abs(f.y - this.floorHeight(f.x)) < .1;
      // A descent can enter the ground tolerance before crossing the surface.
      // Finish that landing too, so the next jump gets its air action back.
      if (ground && f.vy < 0) this.land(f, this.surfaceBelow(f.x, f.y, f.dropMs));
      const direction = Number(!!input.right) - Number(!!input.left);
      f.lightHoldMs = input.touchLight ? f.lightHoldMs + 10 : 0;
      const repeatLight = input.touchLight && f.lightHoldMs >= 200 && (f.lightHoldMs - 200) % 150 === 0;
      const pressed = key => !!input[key] && (!this.previous[side][key] || (input.pressIds?.[key] && input.pressIds[key] !== f.pressIds[key]) || (key === 'light' && repeatLight));
      if (ground && !f.stun && !f.knockdown) { f.coyoteMs = 80; f.jumps = 2; }
      if (pressed('jump')) f.jumpBufferMs = FEEL.specialBuffer;
      if (pressed('dash')) { f.blinkBuffer = false; f.dashBufferMs = FEEL.specialBuffer; f.dashDirection = direction || f.facing; }
      if (pressed('blink')) {
        const gesture = input.pressDirections?.blink || input;
        f.blinkBuffer = true; f.dashBufferMs = FEEL.specialBuffer;
        f.dashDirection = (Number(!!gesture.right) - Number(!!gesture.left)) || f.facing;
      }
      let requested = this.resolveAttack(f, input, pressed);
      if (requested === 'mujicaTransform') {
        let transformed = false;
        if (isMujica(f.character) && !f.stageForm && ground && !f.stun && !f.knockdown && !f.attack && !f.landingRecovery && f.energy >= 50) {
          f.energy -= 50; f.stageForm = { ms: 20000 }; f.buffer = null; f.bufferMs = 0; f.cooldown = 0;
          transformed = true;
          this.events.push({ type: 'stageFormStart', side });
        }
        requested = transformed ? this.resolveAttack(f, { ...input, transform: false }, key => key !== 'transform' && pressed(key)) : null;
      }
      if (requested && !(MOVES[requested].category === 'normal' && f.buffer && MOVES[f.buffer].category !== 'normal')) {
        f.buffer = requested; f.bufferMs = MOVES[requested].category === 'normal' ? FEEL.normalBuffer : FEEL.specialBuffer;
        const gesture = input.pressDirections?.[pressed('skill1') ? 'skill1' : 'skill3'] || input;
        f.bufferBackThrow = input.unified ? (Number(!!gesture.right) - Number(!!gesture.left)) === -f.facing : null;
      }
      if (f.attack) {
        f.attackMs += 10;
        const move = MOVES[f.attack];
        if (move.hitRecovery && f.contact && f.lastHitAt >= move.pulses.at(-1).at && f.attackMs >= move.duration - move.hitRecovery) { f.attackMs = move.duration; f.cooldown = Math.min(f.cooldown, 40); }
        if (f.attackMs >= MOVES[f.attack].duration) { f.attack = null; f.contact = false; f.cancelDepth = 0; }
      }
      // Blockstun retains the guard height until the defender can act again.
      f.crouch = ground && !f.knockdown && !f.landingRecovery && (f.stun ? f.guard && f.crouch : f.attack ? f.attackCrouch || !!MOVES[f.attack].crawl : !!input.crouch);
      f.guard = ground && !f.attack && !f.knockdown && !f.landingRecovery && !f.dashMs && (f.stun ? f.guard : !!input.guard || direction === -f.facing);
      // Holding back is a walking guard. The dedicated guard key plants the
      // feet; hitstun locks movement after contact regardless of guard source.
      const plantedGuard = f.guard && !!input.guard;
      if (!f.stun && !f.knockdown && !f.landingRecovery) {
        const cancel = f.buffer && this.canCancel(f, f.buffer);
        if (f.buffer && !f.dashMs && ((!f.attack && !f.cooldown && (!plantedGuard || f.buffer === 'throw')) || cancel)) {
          let name = f.buffer, move = MOVES[name];
          const legalStance = (!move.ground || ground) && (!move.airOnly || (!ground && this.airHeight(f) >= move.minHeight && (!f.airUsed || (cancel && MOVES[f.attack].stance === 'air')))) && (!(f.character === 0 || f.character >= 3 || f.penguin) || ((move.stance !== 'air' || !ground) && (!move.stance || move.stance === 'air' || ground))) && (!move.penguinAirAction || ground || !f.airUsed || (cancel && MOVES[f.attack].stance === 'air'));
          const legalOwner = (move.ownerCharacter === undefined || move.ownerCharacter === f.character) && (!move.form || move.form === kitFor(f)?.formFor(f)) && (!move.mujicaOnly || isMujica(f.character)) && (!kitFor(f) || move.ownerCharacter === f.character || name === 'throw');
          if (f.energy >= (move.cost || 0) && legalStance && legalOwner && !f.moveCooldowns[name] && (!move.delayedArea || !this.areas.some(a => a.owner === side && a.attack === name)) && (!move.anonOnly || f.character === 0) && (!move.soyoOnly || f.character === 1) && (!move.tomoriOnly || f.character === 2) && (!move.ranaOnly || f.character === 3) && (!move.rikiOnly || f.character === 4) && (!move.penguinOnly || f.penguin) && (!move.nativeOnly || !f.penguin) && (name !== 'summon' || !f.summons) && (name !== 'heal' || (f.hp > 0 && f.hp < MAX_HEALTH && !f.healCooldown)) && (name !== 'ranaTune' || (!f.tuneCooldown && f.energy < 100)) && (name !== 'rikiCalibrate' || (!f.calibrateCooldown && f.beats < 4))) {
            if (f.character === 4 && f.beats === 4 && MOVES[name + 'Boost']) { f.beats = 0; name += 'Boost'; move = MOVES[name]; this.events.push({ type: 'beatBoost', side, attack: name }); }
            f.energy -= move.cost || 0; f.guard = false; f.attack = name; f.attackMs = 0; f.hit = false;
            f.beatGranted = false;
            f.hitMarks = []; f.minionHitMarks = []; f.runeMarks = []; f.attackCrouch = ground && (move.stance === 'crouch' || !!move.crawl || !!input.crouch); f.crouch = f.attackCrouch;
            f.backThrow = name === 'throw' && (f.bufferBackThrow ?? direction === -f.facing);
            f.contact = false; f.lastHitAt = -1; f.dashMs = 0; f.cooldown = move.duration + (move.category === 'normal' ? 0 : 40); f.buffer = null;
            f.cancelDepth = cancel ? f.cancelDepth + 1 : 0;
            if (move.recast && move.ownerCharacter !== undefined) f.moveCooldowns[name] = move.recast;
            if (move.delayedArea || move.targetArea) {
              const targetX = clamp(other.x, f.facing > 0 ? f.x : f.x - 420, f.facing > 0 ? f.x + 420 : f.x);
              f.attackTarget = { x: clamp(targetX, WORLD.left + 45, WORLD.right - 45), y: this.surfaceBelow(targetX, move.delayedArea ? f.y : other.y) };
            }
            if (move.hop) { f.vy = move.hop * verticalScale; f.y += .01; }
            if (move.forwardCrawl) f.crawlFacing = f.facing;
            if (move.movement) f.vx = f.facing * move.movement / (move.movementEnd / 1000);
            if (move.stance === 'air' || move.airOnly) f.airUsed = true;
            if (name === 'dive' || name === 'ranaDive') { f.vy = -570 * verticalScale; f.vx = f.facing * 360; }
            if (name === 'penguinKick') { f.airUsed = true; f.vy = ground ? 340 * verticalScale : Math.max(140 * verticalScale, f.vy); f.y += .01; f.vx = f.facing * 400; }
            if (name === 'rising') { f.vy = 610 * verticalScale; f.y += .01; f.vx = f.facing * 130; }
            if (name === 'ranaRise') { f.vy = 620 * verticalScale; f.y += .01; f.vx = f.facing * 130; }
            if (name === 'rikiRise' || name === 'rikiRiseBoost') { f.vy = 400 * verticalScale; f.y += .01; f.vx = f.facing * (move.follow ? 200 : 80); }
            if (name === 'spin' && ground) { f.vy = 260 * verticalScale; f.y += .01; f.vx = f.facing * 230; }
            if (name === 'super') { f.vx = 0; this.freeze = 240; }
            if (name === 'ranaSuper') { f.vx = 0; this.freeze = 130; }
            if (name === 'soyoSuper') {
              f.vx = 0; f.attackCrouch = f.crouch = false; this.freeze = 130;
              this.soyoSuperId = (this.soyoSuperId || 0) + 1;
              f.soyoSuper = { id: this.soyoSuperId, ms: move.duration, released: false, radius: 0, x: f.x, y: f.y + 100, bornAt: this.elapsed, hitTargets: [] };
            }
            if (name === 'rikiSuper') { f.vx = 0; this.freeze = 130; }
            if (name === 'rikiCalibrate') { f.calibrateCooldown = move.recast; f.attackCrouch = f.crouch = false; }
            if (name === 'ranaTune') { f.tuneCooldown = move.recast; f.attackCrouch = f.crouch = false; }
            if (name === 'heal') { f.healCooldown = move.recast; f.attackCrouch = f.crouch = false; }
            if (name === 'penguinTransform') {
              f.penguin = { ms: move.lifetime }; f.attack = null; f.cooldown = 0;
              profile = profileFor(f); this.events.push({ type: 'penguinStart', side });
            }
            this.events.push({ type: 'attack', side, attack: name });
          }
        }
        if (f.jumpBufferMs && (ground || f.coyoteMs || f.jumps > 0) && !f.attack && !f.dashMs && !plantedGuard) {
          const groundJump = ground || f.coyoteMs > 0;
          f.guard = f.crouch = false;
          f.jumpBufferMs = f.coyoteMs = f.dashMs = 0;
          if (ground && input.crouch && !onFloor) { f.dropMs = 220; f.vy = -80; f.y -= .2; }
          else {
            f.vy = profile.jump * (groundJump ? 1 : FEEL.airJumpRatio); f.jumps--;
            f.airUsed = false; f.y += .01; f.vx = direction * profile.speed * (ground ? 1 : FEEL.airRatio);
            if (side === 1 && this.options.mode === 'cpu' && this.aiGoal >= 0) {
              const p = this.options.terrain.platforms[this.aiGoal], time = this.jumpTime({ ...f, y: oldY }, p.height);
              f.vx = clamp((clamp(other.x, p.left + 18, p.right - 18) - f.x) / time, -profile.speed, profile.speed);
            }
          }
        }
        const trace = f.motion;
        const doubleTap = direction && trace.length >= 3 && trace.at(-1).t === f.controlMs && trace.at(-1).d === (direction === f.facing ? 6 : 4) && trace.at(-2).d === 5 && trace.at(-3).d === trace.at(-1).d && f.controlMs - trace.at(-3).t <= 240;
        if (doubleTap && !input.unified) { f.blinkBuffer = false; f.dashBufferMs = FEEL.specialBuffer; f.dashDirection = direction; }
        if (f.dashBufferMs && !f.attack && !plantedGuard && !f.dashCooldown && f.energy >= FEEL.dashCost) {
          f.energy -= FEEL.dashCost;
          f.guard = false; f.dashMs = FEEL.dashDuration; f.dashCooldown = FEEL.dashCooldown; f.dashInvuln = FEEL.dashInvuln;
          const fromX = f.x, fromY = f.y, blink = f.blinkBuffer;
          if (blink) {
            f.x = clamp(f.x + f.dashDirection * FEEL.dashSpeed * FEEL.dashDuration / 1000, WORLD.left + 45, WORLD.right - 45);
            f.vx = 0; f.dashMs = 10;
          } else f.vx = f.dashDirection * FEEL.dashSpeed;
          f.dashBufferMs = 0; f.blinkBuffer = false; f.motion = [];
          this.events.push({ type: blink ? 'blink' : 'dash', side, direction: f.dashDirection, fromX, fromY });
        }
        if (ground && f.vy <= 0 && !f.dropMs && !f.dashMs) {
          f.vx = !f.attack && !plantedGuard && !f.crouch ? direction * profile.speed : 0;
          if (f.attack === 'special' && f.character === 0 && f.attackMs >= 120 && f.attackMs < 200) f.vx = f.facing * 420;
          if (f.attack === 'thrust' && !f.hit && f.attackMs >= 40 && f.attackMs < 220) f.vx = f.facing * 600;
          if (f.attack === 'rush' && f.attackMs < 500) f.vx = f.facing * 120;
          if (f.attack === 'ranaRush' && !f.hit && f.attackMs >= 30 && f.attackMs < 190) f.vx = f.facing * 640;
          if (f.attack === 'ranaSlide' && !f.hit && f.attackMs >= 40 && f.attackMs < 230) f.vx = f.facing * 440;
          if (MOVES[f.attack]?.base === 'rikiRush' || f.attack === 'rikiRush') { if (!f.hit && f.attackMs >= 20 && f.attackMs < 250) f.vx = f.facing * MOVES[f.attack].dashSpeed; }
          if (f.attack === 'rikiEight' && f.attackMs < 180) f.vx = f.facing * 200;
          const jab = MOVES[f.attack];
          if (jab?.movement && f.attackMs < jab.movementEnd) f.vx = f.facing * jab.movement / (jab.movementEnd / 1000);
          if (jab?.crawl && f.attackMs >= jab.start && f.attackMs <= jab.end) {
            f.facing = jab.forwardCrawl ? f.crawlFacing : other.x >= f.x ? 1 : -1;
            if (Math.abs(other.x - f.x) > FEEL.bodyGap + 8) f.vx = f.facing * jab.crawlSpeed;
          }
          if (jab?.jab && f.attackMs >= jab.start - 40 && f.attackMs <= jab.start) f.vx = f.facing * (jab.chain ? 2.7 : 1.5) * 60 * FEEL.scale;
        }
        if (f.attack === 'dive' || f.attack === 'ranaDive') f.vx = f.hit ? 0 : f.facing * 360;
        if (!ground && MOVES[f.attack]?.movement && f.attackMs >= MOVES[f.attack].movementEnd) f.vx = 0;
        if (!ground && (!f.attack || MOVES[f.attack].stance === 'air') && !f.dashMs && !(side === 1 && this.options.mode === 'cpu')) {
          f.vx = direction * profile.speed * FEEL.airRatio;
        }
      } else f.vx = 0;
      if (this.options.mode === 'practice' && side === 0 && !f.attack && !f.cooldown) f.energy = 100;
      const oldX = f.x;
      f.x = clamp(f.x + (f.vx + f.pushVx) * .01, WORLD.left + 45, WORLD.right - 45);
      if (MOVES[f.attack]?.crawl && ground && !onFloor) {
        const support = (this.options.terrain?.platforms || []).find(p => oldX >= p.left && oldX <= p.right && Math.abs(p.height - f.y) < .1);
        if (support) f.x = clamp(f.x, support.left + 18, support.right - 18);
      }
      f.pushVx = Math.sign(f.pushVx) * Math.max(0, Math.abs(f.pushVx) - (ground ? FEEL.groundDrag : FEEL.airDrag) * .01);
      if (onFloor && f.vy <= 0 && !f.dropMs) f.y = this.floorHeight(f.x);
      if (!this.grounded(f) || f.vy > 0) {
        f.vy -= FEEL.gravity * .01; f.y += f.vy * .01;
        if (f.y > WORLD.top) { f.y = WORLD.top; f.vy = Math.min(0, f.vy); }
        let floor = this.floorHeight(f.x);
        if (!f.dropMs && f.vy <= 0) for (const p of this.options.terrain?.platforms || []) {
          if (f.x >= p.left && f.x <= p.right && oldY >= p.height - .1 && f.y <= p.height) floor = Math.max(floor, p.height);
        }
        if (f.y <= floor) {
          this.land(f, floor);
        }
      }
      f.stun = Math.max(f.stun, f.hardStun);
      f.pressIds = { ...input.pressIds };
    }
    separate() {
      const [a, b] = this.fighters;
      if (Math.abs(a.y - b.y) > 34 * FEEL.scale || a.dashMs || b.dashMs) return;
      const dx = b.x - a.x, gap = Math.abs(dx);
      if (gap >= FEEL.bodyGap) return;
      const onFloor = this.fighters.map(f => this.grounded(f) && Math.abs(f.y - this.floorHeight(f.x)) < .1);
      const crawlSupports = this.fighters.map(f => MOVES[f.attack]?.crawl && this.grounded(f)
        ? (this.options.terrain?.platforms || []).find(p => f.x >= p.left && f.x <= p.right && Math.abs(p.height - f.y) < .1) : null);
      const sign = dx >= 0 ? 1 : -1, push = (FEEL.bodyGap - gap) / 2;
      const left = WORLD.left + 45, right = WORLD.right - 45;
      a.x = clamp(a.x - sign * push, left, right); b.x = clamp(b.x + sign * push, left, right);
      if (a.x === left || a.x === right) b.x = a.x + sign * FEEL.bodyGap;
      if (b.x === left || b.x === right) a.x = b.x - sign * FEEL.bodyGap;
      this.fighters.forEach((f, i) => {
        if (crawlSupports[i]) f.x = clamp(f.x, crawlSupports[i].left + 18, crawlSupports[i].right - 18);
        const floor = this.floorHeight(f.x);
        if (onFloor[i]) f.y = floor;
        else if (f.y < floor || (f.vy <= 0 && f.y <= floor + .1)) this.land(f, floor);
      });
    }
    meleeConnects(source, target, move, reach, vertical) {
      const dx = (target.x - source.x) * source.facing;
      const outside = move.targetArea ? Math.abs(target.x - source.attackTarget.x) > move.areaRadius || Math.abs(target.x - source.x) > 420 : move.omni ? Math.abs(dx) > reach : dx < -10 || dx > reach;
      return !outside && Math.abs(target.y - source.y) <= vertical;
    }
    hitMinion(side, unit, attack, impact = {}) {
      const owner = 1 - side, group = this.fighters[owner].summons;
      const move = { ...MOVES[attack], ...impact };
      if (!group?.units.includes(unit) || unit.hp <= 0 || move.category === 'throw') return;
      const damage = attack === 'heavy' ? ROSTER[this.fighters[side].character].heavyDamage : move.damage;
      if (!(damage > 0)) return;
      unit.hp = Math.max(0, unit.hp - damage);
      this.events.push({ type: 'minionHit', side, owner, unit: unit.id, damage, hp: unit.hp, defeated: unit.hp === 0, x: unit.x, y: unit.y + 40 });
      if (unit.hp === 0) {
        group.units = group.units.filter(p => p !== unit);
        if (!group.units.length) this.fighters[owner].summons = null;
      }
    }
    updateSoyoSupers() {
      const move = MOVES.soyoSuper, controls = [];
      // Release both casts before applying reactions, so simultaneous P casts trade.
      for (let side = 0; side < 2; side++) {
        const f = this.fighters[side], state = f.soyoSuper;
        if (!state) continue;
        if (f.hp <= 0 || (!state.released && f.attack !== 'soyoSuper')) { f.soyoSuper = null; continue; }
        if (state.bornAt !== this.elapsed) state.ms -= 10;
        if (state.ms <= 0) { f.soyoSuper = null; continue; }
        const age = move.duration - state.ms - move.start;
        if (!state.released && age >= 0) {
          state.released = true; state.x = f.x; state.y = f.y + 100;
          f.attack = null; f.cooldown = 0; f.contact = false; f.cancelDepth = 0;
          this.events.push({ type: 'soyoSuperRelease', side, x: state.x, y: state.y });
        }
        if (!state.released) continue;
        state.radius = move.reach * Math.min(1, age / move.expansion);
        const target = this.fighters[1 - side];
        if (age > move.waveDuration || state.hitTargets.includes(1 - side) || target.hp <= 0 || this.invulnerable(target)) continue;
        if (Math.hypot(target.x - state.x, target.y + 100 - state.y) <= state.radius) {
          state.hitTargets.push(1 - side); controls.push(side);
        }
      }
      for (const side of controls) {
        const target = this.fighters[1 - side];
        target.hardStun = Math.max(target.hardStun, move.hardStun); target.stun = Math.max(target.stun, target.hardStun);
        target.attack = target.buffer = null; target.cooldown = target.bufferMs = target.jumpBufferMs = target.dashBufferMs = target.coyoteMs = 0;
        target.dashMs = 0; target.blinkBuffer = false; target.motion = []; target.guard = target.crouch = false; target.vx = 0;
        if (target.soyoSuper && !target.soyoSuper.released) target.soyoSuper = null;
        this.events.push({ type: 'hardControl', side, target: 1 - side, duration: move.hardStun, x: target.x, y: target.y + 100 });
      }
    }
    updateSummons() {
      for (let side = 0; side < 2; side++) {
        const f = this.fighters[side], target = this.fighters[1 - side], group = f.summons;
        if (!group) continue;
        if (group.bornAt !== this.elapsed) group.ms -= 10;
        if (group.ms <= 0 || f.hp <= 0) { f.summons = null; continue; }
        for (const p of group.units) {
          if (!p.called && MOVES.summon.lifetime - group.ms >= p.id * MOVES.summon.callGap) {
            p.called = true; this.events.push({ type: 'minionCall', side, unit: p.id, x: p.x, y: p.y });
          }
          if (group.bornAt === this.elapsed) continue;
          p.hitMs = Math.max(0, p.hitMs - 10);
          const anchorX = clamp(f.x + (p.id - 1) * 52, WORLD.left + 32, WORLD.right - 32), anchorY = Math.max(f.y, this.floorHeight(anchorX)) + 8;
          if (p.phase === 'follow') {
            p.cooldown -= 10;
            if (p.cooldown <= 0 && target.hp > 0) { p.phase = 'charge'; p.phaseMs = 800; }
          }
          const charging = p.phase === 'charge';
          const direction = target.x >= p.x ? 1 : -1;
          const goalX = charging ? target.x - direction * 26 : anchorX;
          const goalY = charging ? target.y + 10 : anchorY;
          p.facing = charging ? direction : f.facing;
          p.x = clamp(p.x + clamp(goalX - p.x, charging ? -6 : -5, charging ? 6 : 5), WORLD.left + 20, WORLD.right - 20);
          p.y += clamp(goalY - p.y, -4.2, 4.2);
          if (charging) {
            p.phaseMs -= 10;
            if (Math.abs(target.x - p.x) < 40 && Math.abs(target.y + 10 - p.y) < 60 && !target.knockdown && !this.invulnerable(target) && target.hp > 0) {
              this.hit(side, 'tensoraHit', p.x, p.y + 40);
              this.events.push({ type: 'minionStrike', side, unit: p.id, x: p.x, y: p.y + 40 });
              p.hitMs = 180; p.phase = 'return'; p.cooldown = 950;
            } else if (p.phaseMs <= 0) { p.phase = 'return'; p.cooldown = 950; }
          } else if (p.phase === 'return' && Math.abs(p.x - anchorX) < 16 && Math.abs(p.y - anchorY) < 16) p.phase = 'follow';
        }
      }
    }
    updateAreas() {
      for (const area of this.areas) {
        area.warning -= 10; area.life -= 10;
        if (area.warning > 0 || area.fired) continue;
        area.fired = true;
        const target = this.fighters[1 - area.owner], move = MOVES[area.attack];
        this.events.push({ type: 'areaPulse', side: area.owner, attack: area.attack, x: area.x, y: area.y });
        const connects = body => {
          const support = this.surfaceBelow(body.x, body.y, body.dropMs);
          const surface = area.platform ? area.platform.height : this.floorHeight(body.x);
          const sameSurface = Math.abs(support - surface) < .1 && (!area.platform || (body.x >= area.platform.left && body.x <= area.platform.right));
          return sameSurface && Math.abs(body.x - area.x) <= area.radius && body.y >= surface - .1 && body.y - surface <= move.vertical;
        };
        if (connects(target) && !target.knockdown) this.hit(area.owner, area.attack, area.x, area.y + 80);
        for (const unit of [...(target.summons?.units || [])]) if (connects(unit)) this.hitMinion(area.owner, unit, area.attack);
      }
      this.areas = this.areas.filter(area => area.life > 0);
    }
    spawnWave(side, attack = 'wave', impact) {
      const f = this.fighters[side], sonic = attack === 'sonic', move = MOVES[attack];
      if (move.radial) {
        this.waves.push({ radial: true, x: f.x, y: f.y + move.height, vx: 0, owner: side, attack,
          life: move.lifetime, age: 0, radius: 0, previousRadius: 0, hitTargets: [], hitMinions: [], ...(impact ? { impact } : {}) });
        return;
      }
      this.waves.push({ x: f.x + f.facing * (move.spawnOffset || 45), y: f.y + (move.height || (sonic ? 110 : 75)), vx: f.facing * move.speed,
        owner: side, life: move.lifetime || 2200, age: 0, rx: move.radiusX || (sonic ? 22 : 15), ry: move.radiusY || (sonic ? 48 : 20), attack,
        ...(impact ? { impact } : {}), ...(move.ownerCharacter !== undefined ? { originX: f.x, originY: f.y, maxReach: move.maxReach || (move.category === 'super' ? 420 : undefined), maxVertical: move.category === 'super' ? 300 : Infinity } : {}),
        ...(move.projectileGravity ? { vy: move.projectileVy, gravity: move.projectileGravity } : {}),
        ...(move.groundShock ? { groundShock: true, platform: (this.options.terrain?.platforms || []).find(p => f.x >= p.left && f.x <= p.right && Math.abs(p.height - f.y) < .1) } : {}) });
    }
    updateWaves() {
      for (const w of this.waves) {
        if (w.radial) {
          w.life -= 10; w.age += 10; w.previousRadius = w.radius;
          w.radius = Math.min(MOVES[w.attack].reach, w.age * MOVES[w.attack].speed / 1000);
          continue;
        }
        w.x += w.vx * .01; w.life -= 10; w.age += 10;
        if (w.maxReach && Math.abs(w.x - w.originX) > w.maxReach) w.life = 0;
        if (w.groundShock) {
          if (w.platform && (w.x < w.platform.left || w.x > w.platform.right)) w.life = 0;
          w.y = (w.platform ? w.platform.height : this.floorHeight(w.x)) + 40;
        }
        if (w.gravity) { w.y += w.vy * .01; w.vy -= w.gravity * .01; }
        if (w.attack === 'sonic') { const growth = Math.min(1, w.age / 420); w.rx = 22 + growth * 38; w.ry = 48 + growth * 82; }
        if (w.life > 0 && w.y <= this.floorHeight(w.x)) {
          w.life = 0; this.events.push({ type: 'terrainHit', x: w.x, y: w.y });
        }
      }
      for (let i = 0; i < this.waves.length; i++) for (let j = i + 1; j < this.waves.length; j++) {
        const a = this.waves[i], b = this.waves[j];
        if (!a.radial && !b.radial && a.life > 0 && b.life > 0 && a.owner !== b.owner && Math.abs(a.x - b.x) < a.rx + b.rx && Math.abs(a.y - b.y) < a.ry + b.ry) {
          a.life = b.life = 0; this.events.push({ type: 'clash', x: (a.x + b.x) / 2, y: a.y });
        }
      }
      for (const w of this.waves) {
        const target = this.fighters[1 - w.owner];
        if (w.life <= 0) continue;
        if (w.radial) {
          const touches = (body, height, radius) => {
            const distance = Math.hypot(body.x - w.x, body.y + height - w.y);
            return distance - radius <= w.radius && distance + radius >= w.previousRadius;
          };
          if (!w.hitTargets.includes(1 - w.owner) && !target.knockdown && !this.invulnerable(target) && touches(target, 80, 45)) {
            w.hitTargets.push(1 - w.owner); this.hit(w.owner, w.attack, w.x, w.y, w.impact);
          }
          const group = target.summons;
          for (const unit of [...(group?.units || [])]) {
            const mark = group.bornAt + ':' + unit.id;
            if (!w.hitMinions.includes(mark) && touches(unit, 40, 30)) {
              w.hitMinions.push(mark); this.hitMinion(w.owner, unit, w.attack, w.impact);
            }
          }
          continue;
        }
        const inRange = body => !w.maxReach || (Math.abs(body.x - w.originX) <= w.maxReach && Math.abs(body.y - w.originY) <= w.maxVertical);
        const sonic = w.attack === 'sonic' || MOVES[w.attack]?.tomoriOnly || MOVES[w.attack]?.ranaOnly || MOVES[w.attack]?.rikiOnly || MOVES[w.attack]?.ownerCharacter !== undefined;
        const crawling = MOVES[target.attack]?.crawl && target.crouch;
        const center = target.y + (crawling ? 35 : 80), halfHeight = crawling ? 35 : 50;
        const contacts = [];
        const fighterRadius = sonic ? w.rx + 18 : 35;
        if (inRange(target) && !target.knockdown && !this.invulnerable(target) && Math.abs(target.x - w.x) < fighterRadius && Math.abs(center - w.y) < (crawling || sonic ? w.ry + halfHeight : 80)) contacts.push({ body: target, radius: fighterRadius });
        for (const unit of target.summons?.units || []) {
          if (inRange(unit) && Math.abs(unit.x - w.x) < w.rx + 20 && Math.abs(unit.y + 40 - w.y) < w.ry + 40) contacts.push({ body: unit, radius: w.rx + 20 });
        }
        // The leading boundary determines which overlapping body intercepted the travelling shot.
        const direction = Math.sign(w.vx) || this.fighters[w.owner].facing;
        contacts.sort((a, b) => direction * (a.body.x - b.body.x) - a.radius + b.radius);
        const first = contacts[0]?.body;
        if (first) {
          if (first === target) this.hit(w.owner, w.attack || 'wave', w.x, w.y, { ...w.impact, projectileRadiusY: w.ry });
          else this.hitMinion(w.owner, first, w.attack || 'wave', w.impact);
          w.life = 0;
        }
      }
      for (const w of this.waves) if (w.life <= 0 && w.attack === 'ranaParfait') this.events.push({ type: 'parfaitSplash', side: w.owner, x: w.x, y: w.y });
      this.waves = this.waves.filter(w => w.life > 0 && w.x > WORLD.left - 50 && w.x < WORLD.right + 50);
    }
    hit(side, attack, x, y, impact = {}) {
      const a = this.fighters[side], b = this.fighters[1 - side], move = { ...MOVES[attack], ...impact };
      if (this.invulnerable(b)) return;
      let damage = attack === 'heavy' ? ROSTER[a.character].heavyDamage : move.damage;
      const sourceX = x ?? a.x, sourceY = y ?? a.y + 100;
      const radiusY = move.projectileRadiusY || 0;
      const parry = MOVES[b.attack];
      if (parry?.counter && b.attackMs >= parry.start && b.attackMs <= parry.end && move.category !== 'throw' && (sourceX - b.x) * b.facing > 0) {
        b.attack = null; b.buffer = null; b.stun = Math.max(b.stun, b.hardStun, 80); b.cooldown = 220; b.vx = 0;
        this.spawnWave(1 - side, parry.counterAttack || 'penguinCryWave'); this.freeze = Math.max(this.freeze, 50);
        this.events.push({ type: parry.counterAttack ? 'counter' : 'penguinCounter', side: 1 - side, x: b.x, y: b.y + 110 }); return;
      }
      if (b.shield && move.category !== 'throw' && (sourceX - b.x) * b.facing > 0 && sourceY + radiusY >= b.y && sourceY - radiusY <= b.y + 220) {
        const absorbed = Math.min(b.shield.hp, damage);
        b.shield.hp -= absorbed; damage -= absorbed; b.shield.hitMs = 160;
        const broken = b.shield.hp <= 0;
        if (broken) b.shield = null;
        this.freeze = Math.max(this.freeze, 40);
        this.events.push({ type: 'shieldHit', side: 1 - side, attacker: side, absorbed, broken, x: b.x + b.facing * 58, y: b.y + 105 });
        if (damage <= 0) return;
      }
      const low = move.level === 'low' || (a.character !== 0 && a.crouch && attack === 'light');
      const high = move.level === 'high' || (a.character !== 0 && !this.grounded(a) && (attack === 'light' || attack === 'heavy'));
      const blocked = move.category !== 'throw' && b.guard && (!low || b.crouch) && (!high || !b.crouch);
      const superArmor = MOVES[b.attack]?.category === 'super';
      const counter = !blocked && !superArmor && !!b.attack && b.attackMs < MOVES[b.attack].start;
      if (blocked) damage = Math.min(damage, move.chip ?? (move.category === 'super' ? (impact.knockdown ? 6 : 2) : move.category === 'special' ? 3 : 0));
      else {
        a.combo = a.comboMs > 0 ? a.combo + 1 : 1; a.comboMs = 1000;
        if (a.character === 4 && move.category === 'normal' && (a.attack === attack || impact.beatEligible) && !a.beatGranted) {
          a.beats = Math.min(4, a.beats + 1); a.beatGranted = true; this.events.push({ type: 'beat', side, beats: a.beats });
        }
        if (!move.fixedDamage) damage = Math.round(damage * Math.max(.5, 1 - (a.combo - 1) * .1) * (counter ? 1.2 : 1));
        if (a.attack === attack) { a.contact = true; a.lastHitAt = a.attackMs; if (!move.pulses && !move.shots) a.hit = true; }
      }
      b.hp = Math.max(this.options.mode === 'practice' && side === 0 ? 1 : 0, b.hp - damage);
      if (move.category !== 'super' && !move.minion) a.energy = clamp(a.energy + (blocked ? 1 : move.category === 'normal' ? 12 : 2), 0, 100);
      b.energy = clamp(b.energy + (move.minion ? 2 : blocked ? 3 : 8), 0, 100);
      // Super armor absorbs the reaction, not damage. Lethal hits still interrupt.
      const armored = superArmor && b.hp > 0;
      if (!armored) {
        if (attack === 'throw' && a.backThrow) { [a.x, b.x] = [b.x, a.x]; a.facing *= -1; b.facing = -a.facing; }
        b.stun = Math.max(b.stun, b.hardStun, blocked ? (move.category === 'super' ? 260 : 150) : move.stun || 0);
        b.vx = 0;
        b.pushVx = (move.minion || move.omni ? Math.sign(b.x - sourceX) || a.facing : a.facing) * (blocked ? move.minion ? 25 : 40 * FEEL.scale : move.push);
        if (!blocked && move.pull) {
          if (move.ownerCharacter !== undefined) {
            const onFloor = this.grounded(b) && Math.abs(b.y - this.floorHeight(b.x)) < .1;
            const distance = Math.min(move.pull, Math.max(0, Math.abs(b.x - a.x) - FEEL.bodyGap));
            b.x = clamp(b.x + Math.sign(a.x - b.x) * distance, WORLD.left + 45, WORLD.right - 45);
            if (onFloor) b.y = this.floorHeight(b.x);
            else if (b.y < this.floorHeight(b.x)) this.land(b, this.floorHeight(b.x));
            b.pushVx = 0;
          } else b.pushVx = -a.facing * 100;
        }
        b.attack = null; b.buffer = null; b.dashMs = b.dashInvuln = 0;
        b.jumpBufferMs = b.dashBufferMs = b.coyoteMs = 0;
        if (!blocked) { b.guard = false; b.crouch = false; }
        if (!blocked && (move.knockdown || move.launch || !this.grounded(b))) {
          b.knockdown = move.knockdown || 0;
          b.vy = (move.launch || (move.knockdown ? 280 * verticalScale : 90 * FEEL.scale)) * Math.max(.5, 1 - a.combo * .05);
          b.y += .01; b.launched = true;
        }
      }
      if (b.hp <= 0) { b.soyoSuper = null; b.hardStun = 0; }
      const weight = move.category === 'super' ? 3 : move.minion ? 0 : attack === 'heavy' || attack === 'throw' || move.strength === 3 || move.damage >= 18 ? 2 : move.strength === 2 || move.category === 'special' ? 1 : 0;
      const hitstop = move.hitstop ?? (blocked ? 50 : move.minion ? 20 : [70, 80, 130, 220][weight]);
      this.freeze = Math.max(this.freeze, hitstop);
      const footStrike = move.normalIndex !== undefined && move.normalIndex % 6 >= 3;
      const contactHeight = low ? 55 : a.penguin ? (footStrike ? 75 : 110) : footStrike ? 105 : 160;
      this.events.push({ type: 'hit', side, attack, damage, blocked, armored, counter, weight, combo: a.combo, x: x ?? b.x, y: y ?? b.y + contactHeight });
    }
    endRound() {
      if (this.phase !== 'fighting') return;
      const [a, b] = this.fighters;
      this.winner = a.hp === b.hp ? -1 : a.hp > b.hp ? 0 : 1;
      const boutWinner = this.winner;
      this.roundEnd = Object.freeze({ winner: boutWinner, fighters: this.fighters.map(f => Object.freeze({
        character: f.character, penguin: !!f.penguin, stageForm: !!f.stageForm,
        attack: f.attack, attackMs: f.attackMs,
        y: f.y, landY: this.surfaceBelow(f.x, f.y, f.dropMs),
      })) });
      this.reason = this.remaining <= 0 ? 'TIME OVER' : 'K.O.';
      if (this.winner >= 0) this.wins[this.winner]++;
      if (this.isTeamBattle) {
        // Rebuild both fighters between bouts, carrying only the survivor's persistent resources.
        this.teamCarry = this.fighters.map((f, side) => {
          if (side !== boutWinner) { this.teamIndices[side]++; return null; }
          return { hp: f.hp, energy: f.energy, ...(f.character === 4 ? { beats: f.beats } : {}) };
        });
        const exhausted = this.teamIndices.map(index => index >= 3);
        this.phase = exhausted.some(Boolean) ? 'finished' : 'roundOver';
        if (this.phase === 'finished') this.winner = exhausted[0] === exhausted[1] ? -1 : exhausted[0] ? 1 : 0;
      } else this.phase = this.wins.some(w => w >= 2) ? 'finished' : 'roundOver';
      this.phaseMs = ROUND_END_TIMING.total; this.release();
      this.fighters.forEach(f => { f.summons = null; f.soyoSuper = null; f.hardStun = 0; });
      this.fighters.forEach((f, side) => { if (f.penguin) this.endPenguin(side); });
      this.fighters.forEach((f, side) => { if (f.stageForm) this.endStageForm(side); }); this.areas = []; this.waves = [];
      this.events.push({ type: 'result', winner: this.winner, reason: this.reason,
        ...(this.isTeamBattle ? { boutWinner, teamIndices: [...this.teamIndices], teamRemaining: this.teamRemaining } : {}) });
    }
    drainEvents() { return this.events.splice(0); }
    pose(side) {
      const f = this.fighters[side];
      if (this.phase === 'finished' || this.phase === 'roundOver') return this.winner < 0 ? 0 : this.winner === side ? 14 : 15;
      if (f.knockdown) return 13;
      if (f.landingRecovery) return 3;
      if (f.guard || f.crouch) return 3;
      if (f.stun) return f.stun > 150 ? 13 : 12;
      if (f.attack) {
        if (f.attack === 'shield') return 3;
        const m = MOVES[f.attack], base = f.attack === 'light' || f.attack === 'throw' ? 4 : 7;
        return base + (f.attackMs < m.start ? 0 : f.attackMs <= m.end ? 1 : 2);
      }
      if (!this.grounded(f)) return f.vy > 0 ? 10 : 11;
      if (Math.abs(f.vx) > 25) return 1 + Math.floor(this.elapsed / 110) % 2;
      return 0;
    }
  }
  const api = { Match, ROSTER, MOVES, NORMAL_BUTTONS, moveList, WORLD, FEEL, MAX_HEALTH, ROUND_END_TIMING };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MygoFighter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
