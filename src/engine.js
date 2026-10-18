/* Browser port of the core combat and terrain rules in Game/StageFighterState.h.
 * Independent of rendering; fixed 10 ms steps keep gameplay frame-rate independent. */
(function (root) {
  'use strict';
  const WORLD = Object.freeze({ left: -720, right: 1680, bottom: -180, top: 1120 });
  const ROSTER = [
    { name: '千早爱音', shortName: '爱音', en: 'CHIHAYA ANON', skill: '闪耀合奏', color: '#f6a4c7', role: '主音吉他', archetype: '均衡型', specialType: '突进', description: '向前一步，用闪耀的合奏打开局面。', speed: 345, jump: 620, lightReach: 94, heavyReach: 126, heavyDamage: 16, specialReach: 170 },
    { name: '长崎素世', shortName: '素世', en: 'NAGASAKI SOYO', skill: '回响终章', color: '#dfbd91', role: '贝斯', archetype: '控场型', specialType: '对空', description: '保持距离，用回响截住对手的跃起。', speed: 345, jump: 620, lightReach: 94, heavyReach: 126, heavyDamage: 16, specialReach: 230, specialVertical: 160 },
    { name: '高松灯', shortName: '灯', en: 'TAKAMATSU TOMORI', skill: '迷途之歌', color: '#a8bfdc', role: '主唱', archetype: '歌声控场型', specialType: '三段歌声', description: '握紧麦克风，让诗句与歌声传到对手面前。', speed: 315, jump: 590, lightReach: 88, heavyReach: 118, heavyDamage: 16, specialReach: 210 },
    { name: '要乐奈', speed: 270, jump: 690, lightReach: 100, heavyReach: 128, heavyDamage: 15, specialReach: 195 },
    { name: '椎名立希', speed: 215, jump: 620, lightReach: 90, heavyReach: 140, heavyDamage: 22, specialReach: 175 },
    { name: '八幡海铃', speed: 235, jump: 600, lightReach: 115, heavyReach: 150, heavyDamage: 17, specialReach: 260 },
  ];
  const NORMAL_BUTTONS = ['light', 'medium', 'heavy', 'lightKick', 'mediumKick', 'heavyKick'];
  const PENGUIN_PROFILE = { ...ROSTER[2], speed: 375, jump: 640 };
  const profileFor = f => f.character === 2 && f.penguin ? PENGUIN_PROFILE : ROSTER[f.character];
  const NORMAL_KEYS = ['J', 'H', 'K', 'N', 'M', ','];
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
    penguinHey: { name: 'hey?', command: 'I / 小键盘4（2P）', category: 'special', tomoriOnly: true, penguinOnly: true, ground: true, projectile: true,
      cost: 10, duration: 440, start: 120, end: 140, damage: 10, chip: 1, stun: 240, push: 140, speed: 560, lifetime: 450, radiusX: 22, radiusY: 42, height: 100 },
    penguinLaugh: { name: '唐笑·震荡', command: 'T / 小键盘 Enter（2P）', category: 'special', tomoriOnly: true, penguinOnly: true, ground: true, omni: true,
      cost: 20, duration: 650, start: 200, end: 270, damage: 12, stun: 360, push: 250, reach: 200, vertical: 180 },
    penguinCall: { name: '咕咕嘎嘎！', command: 'L / 小键盘3（2P）', category: 'special', tomoriOnly: true, penguinOnly: true, ground: true, projectile: true,
      cost: 40, duration: 900, start: 180, end: 500, shots: [180, 330, 480], damage: 8, chip: 1, stun: 260, push: 80, speed: 500, lifetime: 1400, radiusX: 32, radiusY: 65, height: 100 },
    special: { name: '闪耀合奏', command: 'L', category: 'special', duration: 650, start: 230, end: 290, damage: 24, stun: 380, push: 280, cost: 60 },
    wave: { name: '音符弹·中', command: '↓↘→ + H / I', category: 'special', projectile: true, duration: 380, start: 120, end: 140, damage: 14, stun: 200, push: 150, cost: 20, speed: 440 },
    tomoriNote: { name: '微光音符', command: 'I / 小键盘4（2P）', category: 'special', tomoriOnly: true, ground: true, projectile: true,
      duration: 440, start: 140, end: 160, damage: 12, chip: 2, stun: 220, push: 110, cost: 20, speed: 380, lifetime: 1800, radiusX: 16, radiusY: 25, height: 100 },
    tomoriEcho: { name: '诗句回声', command: 'T / 小键盘 Enter（2P）', category: 'special', tomoriOnly: true, ground: true, projectile: true,
      duration: 700, start: 230, end: 250, damage: 18, chip: 3, stun: 330, push: 210, cost: 30, speed: 360, lifetime: 1800, radiusX: 34, radiusY: 65, height: 110 },
    tomoriChorus: { name: '迷途之歌', command: 'L / 小键盘3（2P）', category: 'special', tomoriOnly: true, ground: true, projectile: true,
      duration: 1100, start: 260, end: 660, shots: [260, 450, 640], damage: 8, chip: 1, stun: 260, push: 70, cost: 60, speed: 420, lifetime: 1800, radiusX: 26, radiusY: 54, height: 110 },
    sonic: { name: 'TGW·音波攻击', command: 'T', category: 'special', projectile: true, anonOnly: true, ground: true,
      duration: 620, start: 180, end: 200, damage: 22, stun: 360, push: 360, cost: 30, speed: 560, lifetime: 950, artIndex: 2 },
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
    summon: { name: '小天素罗召唤', command: 'T / 小键盘 Enter（2P）', category: 'special', soyoOnly: true, ground: true,
      duration: 600, start: 220, end: 240, damage: 4, cost: 50, lifetime: 10000 },
    tensoraHit: { name: '小天素罗突袭', category: 'special', internal: true, minion: true, damage: 4, chip: 1, stun: 110, push: 45 },
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
  const penguinNames = ['鳍拍·轻', '鳍拍·连', '企鹅顶撞', '蹬脚·轻', '蹬脚·中', '回身扫脚'];
  for (const stance of ['standing', 'crouch', 'air']) NORMAL_BUTTONS.forEach((button, i) => {
    const suffix = (stance === 'standing' ? '' : stance + '_') + button, source = MOVES[suffix];
    MOVES['penguin_' + suffix] = { ...source, name: (stance === 'crouch' ? '低位·' : stance === 'air' ? '空中·' : '') + penguinNames[i],
      penguinNormal: true, tomoriOnly: true, penguinOnly: true, damage: [6, 9, 14, 5, 10, 16][i], reach: [90, 110, 125, 105, 130, 155][i] };
  });
  function moveList(character, penguin = false) {
    return Object.entries(MOVES).filter(([key, move]) => {
      if (move.internal) return false;
      if (character === 0) return !move.soyoOnly && !move.tomoriOnly;
      if (character === 2) return penguin ? move.penguinOnly || key === 'throw' : !move.penguinOnly && (['light', 'heavy', 'throw'].includes(key) || move.tomoriOnly);
      return ['light', 'heavy', 'special', 'wave', 'throw'].includes(key) || (character === 1 && ['summon', 'heal'].includes(key));
    }).map(([key, move]) => ({ key, ...move, name: character === 1 ? ({ special: '回响终章', light: '轻掌·试探', heavy: '双掌·推拍' }[key] || move.name) : character === 2 ? ({ light: '轻击·试探', heavy: '重击·前行', throw: penguin ? '鳍抱·摔投' : move.name }[key] || move.name) : move.name,
      command: character !== 0 && key === 'wave' ? 'I' : character !== 0 && key === 'throw' ? (penguin ? 'B（后投：← + B）' : 'U（后投：← + U）') : move.command }));
  }
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  class Match {
    constructor(options = {}) {
      this.options = { mode: 'cpu', difficulty: 1, characters: [0, 0], seed: 128, ...options };
      this.seed = this.options.seed || 1;
      this.wins = [0, 0]; this.round = 1; this.phase = 'idle'; this.paused = false;
      this.events = []; this.elapsed = 0; this.accumulator = 0; this.winner = -1;
      this.resetRound();
    }
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
      f.y = height; f.vy = 0; f.vx = 0; f.airUsed = false; f.dropMs = 0;
      if (f.attack && MOVES[f.attack].stance === 'air') { f.attack = null; f.cooldown = 60; }
      if (f.attack === 'dive') { f.attack = null; f.cooldown = f.landingRecovery = f.contact ? 100 : 240; f.contact = false; }
      if (f.attack === 'penguinKick') { f.attack = null; f.cooldown = f.landingRecovery = f.contact ? 90 : 200; f.contact = false; }
    }
    jumpTime(f, height) {
      const speed = profileFor(f).jump, discriminant = speed * speed - 3200 * (height - f.y);
      return discriminant < 0 ? -1 : (speed + Math.sqrt(discriminant)) / 1600;
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
      this.fighters = [0, 1].map(side => ({
        character: this.options.characters[side], x: side ? 680 : 280, y: 0,
        vx: 0, vy: 0, facing: side ? -1 : 1, hp: 100, energy: 0,
        attack: null, attackMs: 0, hit: false, stun: 0, cooldown: 0, guard: false,
        crouch: false, knockdown: 0, landingRecovery: 0, dashMs: 0, dashCooldown: 0, combo: 0,
        comboMs: 0, cancelDepth: 0, contact: false, lastHitAt: -1, buffer: null, bufferMs: 0,
        motion: [], controlMs: 0, hitMarks: [], attackCrouch: false, backThrow: false, airUsed: false, shield: null, summons: null, dropMs: 0, healCooldown: 0, penguin: null,
      }));
      if (this.options.mode === 'practice') {
        this.fighters[0].energy = 100; this.fighters[1].x = 480;
      }
      for (const f of this.fighters) f.y = this.floorHeight(f.x);
      this.remaining = 60000; this.waves = []; this.freeze = 0;
      this.previous = [{}, {}]; this.aiThink = 360; this.aiGuard = 0; this.aiGoal = -1; this.winner = -1; this.accumulator = 0;
    }
    start() { this.resetRound(); this.phase = 'ready'; this.phaseMs = 1000; this.paused = false; }
    endPenguin(side) {
      const f = this.fighters[side]; if (!f.penguin) return;
      f.penguin = null;
      if (MOVES[f.attack]?.penguinOnly || f.attack === 'penguinTransform') { f.attack = null; f.contact = false; f.hitMarks = []; f.cooldown = Math.min(f.cooldown, 120); }
      f.buffer = null; f.bufferMs = 0; this.events.push({ type: 'penguinEnd', side });
    }
    restart() { this.wins = [0, 0]; this.round = 1; this.events = []; this.start(); }
    nextRound() {
      if (this.phase !== 'roundOver' || this.phaseMs > 0) return false;
      if (this.winner !== -1) this.round++;
      this.start(); return true;
    }
    setPaused(value) {
      if (this.phase === 'idle') return;
      this.paused = value; this.release();
    }
    release() { this.previous = [{}, {}]; this.fighters.forEach(f => { f.buffer = null; f.bufferMs = 0; f.motion = []; }); }
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
      if (a.character === 2 && !a.penguin && a.hp <= 70 && a.energy >= 50 && this.grounded(a) && d > 120) return { heal: true };
      if (a.penguin && this.grounded(a)) {
        if (b.attack && d < 170 && a.energy >= 15) return { shield: true };
        if (d < 180 && a.energy >= 20) return { sonic: true };
        if (d > 200 && d < 650 && a.energy >= 40) return { special: true };
        if (d > 145 && d < 370 && a.energy >= 10) return { thrust: true };
      }
      if (a.character === 2 && !a.penguin && this.grounded(a)) {
        if (a.energy >= 60 && d > 180 && d < 650) return { special: true };
        if (a.energy >= 30 && d > 150 && d < 550) return { sonic: true };
      }
      if (a.character === 1 && a.hp <= 65 && !a.healCooldown && this.grounded(a) && a.energy >= MOVES.heal.cost && d > 240 && !b.attack) return { heal: true };
      if (a.character === 1 && !a.summons && this.grounded(a) && a.energy >= 50 && d > 90) { input.sonic = true; return input; }
      if (a.character === 0 && a.energy === 100 && d < 340 && this.random() > .35) { input.super = true; return input; }
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
        else input[a.character === 0 || a.penguin ? NORMAL_BUTTONS[Math.floor(this.random() * 6)] : this.random() > .38 ? 'light' : 'heavy'] = true;
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
      if (this.phase !== 'fighting') { this.phaseMs = Math.max(0, this.phaseMs - 10); return; }
      if (this.freeze > 0) { this.freeze -= 10; return; }
      if (this.options.mode !== 'practice') this.remaining = Math.max(0, this.remaining - 10);
      const dummy = this.options.dummy;
      const inputs = [p1, this.options.mode === 'practice' ? { guard: dummy === 'guard' || dummy === 'crouch', crouch: dummy === 'crouch' } : this.options.mode === 'cpu' ? this.aiInput() : p2];
      if (this.options.mode === 'cpu' && this.aiGuard > 0) {
        this.aiGuard -= 10; inputs[1].guard = true; inputs[1].left = inputs[1].right = false;
      }
      for (let side = 0; side < 2; side++) this.updateFighter(side, inputs[side]);
      this.separate();
      // Resolve both active strikes together so simultaneous attacks can trade.
      const hits = [];
      for (let side = 0; side < 2; side++) {
        const f = this.fighters[side], other = this.fighters[1 - side], move = MOVES[f.attack];
        if (!move || f.hit || f.attackMs < move.start || f.attackMs > move.end) continue;
        if (move.counter) continue;
        if (f.attack === 'heal') {
          const amount = Math.min(move.healing, 100 - f.hp);
          if (f.hp > 0) { f.hp += amount; this.events.push({ type: 'heal', side, amount }); }
          f.hit = true; continue;
        }
        if (f.attack === 'shield') {
          f.shield = { hp: move.durability, ms: move.lifetime, hitMs: 0 };
          f.hit = true; this.events.push({ type: 'shieldSummon', side }); continue;
        }
        if (f.attack === 'summon') {
          f.summons = { ms: move.lifetime, bornAt: this.elapsed, units: [0, 1, 2].map(i => ({
            x: clamp(f.x + (i - 1) * 52, WORLD.left + 32, WORLD.right - 32), y: f.y + 8, facing: f.facing,
            phase: 'follow', cooldown: 350 + i * 320, phaseMs: 0, hitMs: 0,
          })) };
          f.hit = true; this.events.push({ type: 'summon', side }); continue;
        }
        if (move.projectile) {
          if (move.shots) {
            const shot = move.shots.findIndex((at, i) => f.attackMs >= at && !f.hitMarks.includes(i));
            if (shot >= 0) { this.spawnWave(side, f.attack); f.hitMarks.push(shot); this.events.push({ type: 'voicePulse', side, pulse: shot }); }
            f.hit = f.hitMarks.length === move.shots.length;
          } else { this.spawnWave(side, f.attack); f.hit = true; }
          continue;
        }
        const profile = ROSTER[f.character];
        const pulse = move.pulses?.findIndex((p, i) => f.attackMs >= p.at && f.attackMs < p.at + 90 && !f.hitMarks.includes(i));
        if (move.pulses && pulse < 0) continue;
        const impact = move.pulses ? move.pulses[pulse] : {};
        const compactReach = f.character === 2 && ['light', 'heavy'].includes(f.attack) ? (f.attack === 'light' ? profile.lightReach : profile.heavyReach) : 0;
        const reach = impact.reach || compactReach || move.reach || (f.attack === 'light' ? profile.lightReach : f.attack === 'heavy' ? profile.heavyReach : profile.specialReach);
        const dx = (other.x - f.x) * f.facing;
        if ((move.omni ? Math.abs(dx) > reach : dx < -10 || dx > reach) || Math.abs(other.y - f.y) > (move.vertical || (f.attack === 'special' ? profile.specialVertical || 130 : 88)) || other.knockdown > 0 || this.invulnerable(other)) continue;
        if (f.attack === 'throw' && (!this.grounded(f) || !this.grounded(other) || Math.abs(f.y - other.y) > 25 || other.stun)) continue;
        if (move.pulses) f.hitMarks.push(pulse);
        if (!move.pulses) f.hit = true;
        hits.push({ side, attack: f.attack, impact });
      }
      for (const hit of hits) this.hit(hit.side, hit.attack, undefined, undefined, hit.impact);
      this.updateSummons();
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
      const requested = ['super', 'shield', 'throw', 'dive', 'thrust', 'rush', 'rising', 'spin', 'special', 'heal', 'summon', 'sonic', 'wave', 'penguinTransform', 'penguinKick', 'penguinCry', 'penguinHey', 'penguinLaugh', 'penguinCall', 'tomoriChorus', 'tomoriEcho', 'tomoriNote', ...NORMAL_BUTTONS.slice().reverse()].find(pressed);
      if (!requested) return null;
      if (requested === 'heal') return f.character === 2 ? 'penguinTransform' : f.character === 1 ? 'heal' : null;
      if (requested === 'summon') return f.character === 1 ? 'summon' : null;
      if (f.character === 2) {
        if (requested === 'penguinTransform') return requested;
        if (f.penguin) {
          if (NORMAL_BUTTONS.includes(requested)) return 'penguin_' + (!this.grounded(f) ? 'air_' : input.crouch ? 'crouch_' : '') + requested;
          return ({ wave: 'penguinHey', sonic: 'penguinLaugh', special: 'penguinCall', shield: 'penguinCry', thrust: 'penguinKick', dive: 'penguinKick' }[requested]) || (['throw', 'penguinKick', 'penguinCry', 'penguinHey', 'penguinLaugh', 'penguinCall'].includes(requested) ? requested : null);
        }
        return ({ wave: 'tomoriNote', sonic: 'tomoriEcho', special: 'tomoriChorus', shield: 'throw' }[requested]) || (['light', 'heavy', 'throw', 'tomoriNote', 'tomoriEcho', 'tomoriChorus'].includes(requested) ? requested : null);
      }
      if (f.character === 1 && requested === 'sonic') return 'summon';
      if (f.character !== 0 && requested === 'shield') return 'throw'; // Preserve Soyo's U binding.
      if (f.character !== 0) return ['light', 'heavy', 'special', 'wave', 'throw'].includes(requested) ? requested : null;
      const index = NORMAL_BUTTONS.indexOf(requested);
      if (index < 0) return requested;
      if (!this.grounded(f) && input.crouch && requested === 'heavyKick') return 'dive';
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
      if (!f.attack || !f.contact || (!f.hit && !f.hitMarks.length) || f.cancelDepth >= (f.character === 0 ? 5 : 4)) return false;
      const current = MOVES[f.attack], next = MOVES[name];
      if (!next || f.attackMs < current.start + 20 || f.attackMs > current.end + 150) return false;
      if (!this.grounded(f)) return current.stance === 'air' && ((f.character === 0 && name === 'dive' && this.airHeight(f) >= next.minHeight) || (f.penguin && name === 'penguinKick'));
      if (current.cancelAt && (f.attackMs < current.cancelAt || f.lastHitAt < current.pulses.at(-1).at)) return false;
      if (next.category === 'super') return current.category === 'normal' || current.category === 'special';
      if (f.character === 0 && f.attack === 'thrust' && name === 'rush') return true;
      return current.category === 'normal' && (next.category === 'special' || (next.category === 'normal' && next.strength > current.strength));
    }
    invulnerable(f) { return !!f.attack && !!MOVES[f.attack].invuln && f.attackMs < MOVES[f.attack].invuln; }
    updateFighter(side, input) {
      const f = this.fighters[side], other = this.fighters[1 - side];
      if (f.penguin) { f.penguin.ms -= 10; if (f.penguin.ms <= 0) this.endPenguin(side); }
      let profile = profileFor(f);
      if (f.shield) {
        f.shield.ms -= 10; f.shield.hitMs = Math.max(0, f.shield.hitMs - 10);
        if (f.shield.ms <= 0) f.shield = null;
      }
      for (const key of ['stun', 'cooldown', 'knockdown', 'landingRecovery', 'dashMs', 'dashCooldown', 'comboMs', 'bufferMs', 'dropMs', 'healCooldown']) f[key] = Math.max(0, f[key] - 10);
      if (!f.comboMs) f.combo = 0;
      if (!f.bufferMs) f.buffer = null;
      if (!f.attack && !f.stun) {
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
      const pressed = key => !!input[key] && !this.previous[side][key];
      const requested = this.resolveAttack(f, input, pressed);
      if (requested) { f.buffer = requested; f.bufferMs = 120; }
      if (f.attack) {
        f.attackMs += 10;
        if (f.attackMs >= MOVES[f.attack].duration) { f.attack = null; f.contact = false; f.cancelDepth = 0; }
      }
      f.crouch = ground && (f.attack ? f.attackCrouch : !!input.crouch) && !f.stun && !f.knockdown && !f.landingRecovery;
      f.guard = ground && !f.attack && !f.knockdown && !f.landingRecovery && !f.dashMs && (f.stun ? f.guard : !!input.guard || direction === -f.facing);
      // Holding back is a walking guard. The dedicated guard key plants the
      // feet; hitstun locks movement after contact regardless of guard source.
      const plantedGuard = f.guard && !!input.guard;
      if (!f.stun && !f.knockdown && !f.landingRecovery) {
        const cancel = f.buffer && this.canCancel(f, f.buffer);
        if (f.buffer && ((!f.attack && !f.cooldown && (!plantedGuard || f.buffer === 'throw')) || cancel)) {
          const name = f.buffer, move = MOVES[name];
          const legalStance = (!move.ground || ground) && (!move.airOnly || (!ground && this.airHeight(f) >= move.minHeight && (!f.airUsed || (cancel && MOVES[f.attack].stance === 'air')))) && (!(f.character === 0 || f.penguin) || ((move.stance !== 'air' || (!ground && !f.airUsed)) && (!move.stance || move.stance === 'air' || ground))) && (!move.penguinAirAction || ground || !f.airUsed || (cancel && MOVES[f.attack].stance === 'air'));
          if (f.energy >= (move.cost || 0) && legalStance && (!move.anonOnly || f.character === 0) && (!move.soyoOnly || f.character === 1) && (!move.tomoriOnly || f.character === 2) && (!move.penguinOnly || f.penguin) && (!move.nativeOnly || !f.penguin) && (name !== 'summon' || !f.summons) && (name !== 'heal' || (f.hp > 0 && f.hp < 100 && !f.healCooldown))) {
            f.energy -= move.cost || 0; f.guard = false; f.attack = name; f.attackMs = 0; f.hit = false;
            f.hitMarks = []; f.attackCrouch = ground && (move.stance === 'crouch' || !!input.crouch); f.crouch = f.attackCrouch;
            f.backThrow = name === 'throw' && direction === -f.facing;
            f.contact = false; f.lastHitAt = -1; f.dashMs = 0; f.cooldown = move.duration + 40; f.buffer = null;
            f.cancelDepth = cancel ? f.cancelDepth + 1 : 0;
            if (move.stance === 'air' || move.airOnly) f.airUsed = true;
            if (name === 'dive') { f.vy = -570; f.vx = f.facing * 360; }
            if (name === 'penguinKick') { f.airUsed = true; f.vy = ground ? 340 : Math.max(140, f.vy); f.y += .01; f.vx = f.facing * 400; }
            if (name === 'rising') { f.vy = 610; f.y += .01; f.vx = f.facing * 130; }
            if (name === 'spin' && ground) { f.vy = 260; f.y += .01; f.vx = f.facing * 230; }
            if (name === 'super') { f.vx = 0; this.freeze = 240; }
            if (name === 'heal') { f.healCooldown = move.recast; f.attackCrouch = f.crouch = false; }
            if (name === 'penguinTransform') {
              f.penguin = { ms: move.lifetime }; f.attack = null; f.cooldown = 0;
              profile = profileFor(f); this.events.push({ type: 'penguinStart', side });
            }
            this.events.push({ type: 'attack', side, attack: name });
          }
        }
        if (pressed('jump') && ground && !f.attack && !plantedGuard) {
          f.guard = f.crouch = false;
          if (input.crouch && !onFloor) { f.dropMs = 220; f.vy = -80; f.y -= .2; }
          else {
            f.vy = profile.jump; f.y += .01; f.vx = direction * profile.speed;
            if (side === 1 && this.options.mode === 'cpu' && this.aiGoal >= 0) {
              const p = this.options.terrain.platforms[this.aiGoal], time = this.jumpTime({ ...f, y: oldY }, p.height);
              f.vx = clamp((clamp(other.x, p.left + 18, p.right - 18) - f.x) / time, -profile.speed, profile.speed);
            }
          }
        }
        const trace = f.motion;
        const doubleTap = direction && trace.length >= 3 && trace.at(-1).d === (direction === f.facing ? 6 : 4) && trace.at(-2).d === 5 && trace.at(-3).d === trace.at(-1).d && f.controlMs - trace.at(-3).t <= 240;
        if ((pressed('dash') || doubleTap) && ground && !f.attack && !plantedGuard && !f.dashCooldown) {
          f.guard = false; f.dashMs = 140; f.dashCooldown = 360; f.vx = (direction || f.facing) * 1160;
          f.motion = [];
        }
        if (ground && f.vy <= 0 && !f.dropMs && !f.dashMs) {
          f.vx = !f.attack && !plantedGuard && !f.crouch ? direction * profile.speed : 0;
          if (f.attack === 'special' && f.character === 0 && f.attackMs >= 120 && f.attackMs < 200) f.vx = f.facing * 420;
          if (f.attack === 'thrust' && !f.hit && f.attackMs >= 40 && f.attackMs < 220) f.vx = f.facing * 600;
          if (f.attack === 'rush' && f.attackMs < 500) f.vx = f.facing * 120;
        }
        if (f.attack === 'dive') f.vx = f.hit ? 0 : f.facing * 360;
      } else f.vx *= .91;
      if (this.options.mode === 'practice' && side === 0 && !f.attack && !f.cooldown) f.energy = 100;
      f.x = clamp(f.x + f.vx * .01, WORLD.left + 45, WORLD.right - 45);
      if (onFloor && f.vy <= 0 && !f.dropMs) f.y = this.floorHeight(f.x);
      if (!this.grounded(f) || f.vy > 0) {
        f.y += f.vy * .01; f.vy -= 1600 * .01;
        if (f.y > WORLD.top) { f.y = WORLD.top; f.vy = Math.min(0, f.vy); }
        let floor = this.floorHeight(f.x);
        if (!f.dropMs && f.vy <= 0) for (const p of this.options.terrain?.platforms || []) {
          if (f.x >= p.left && f.x <= p.right && oldY >= p.height - .1 && f.y <= p.height) floor = Math.max(floor, p.height);
        }
        if (f.y <= floor) {
          this.land(f, floor);
        }
      }
    }
    separate() {
      const [a, b] = this.fighters;
      if (Math.abs(a.y - b.y) > 110) return;
      const dx = b.x - a.x, gap = Math.abs(dx);
      if (gap >= 56) return;
      const onFloor = this.fighters.map(f => this.grounded(f) && Math.abs(f.y - this.floorHeight(f.x)) < .1);
      const sign = dx >= 0 ? 1 : -1, push = (56 - gap) / 2;
      const left = WORLD.left + 45, right = WORLD.right - 45;
      a.x = clamp(a.x - sign * push, left, right); b.x = clamp(b.x + sign * push, left, right);
      if (a.x === left || a.x === right) b.x = a.x + sign * 56;
      if (b.x === left || b.x === right) a.x = b.x - sign * 56;
      this.fighters.forEach((f, i) => {
        const floor = this.floorHeight(f.x);
        if (onFloor[i]) f.y = floor;
        else if (f.y < floor || (f.vy <= 0 && f.y <= floor + .1)) this.land(f, floor);
      });
    }
    updateSummons() {
      for (let side = 0; side < 2; side++) {
        const f = this.fighters[side], target = this.fighters[1 - side], group = f.summons;
        if (!group || group.bornAt === this.elapsed) continue;
        group.ms -= 10;
        if (group.ms <= 0 || f.hp <= 0) { f.summons = null; continue; }
        for (const [i, p] of group.units.entries()) {
          p.hitMs = Math.max(0, p.hitMs - 10);
          const anchorX = clamp(f.x + (i - 1) * 52, WORLD.left + 32, WORLD.right - 32), anchorY = Math.max(f.y, this.floorHeight(anchorX)) + 8;
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
              this.events.push({ type: 'minionStrike', side, unit: i, x: p.x, y: p.y + 40 });
              p.hitMs = 180; p.phase = 'return'; p.cooldown = 950;
            } else if (p.phaseMs <= 0) { p.phase = 'return'; p.cooldown = 950; }
          } else if (p.phase === 'return' && Math.abs(p.x - anchorX) < 16 && Math.abs(p.y - anchorY) < 16) p.phase = 'follow';
        }
      }
    }
    spawnWave(side, attack = 'wave') {
      const f = this.fighters[side], sonic = attack === 'sonic', move = MOVES[attack];
      this.waves.push({ x: f.x + f.facing * 45, y: f.y + (move.height || (sonic ? 110 : 75)), vx: f.facing * move.speed,
        owner: side, life: move.lifetime || 2200, age: 0, rx: move.radiusX || (sonic ? 22 : 15), ry: move.radiusY || (sonic ? 48 : 20), attack });
    }
    updateWaves() {
      for (const w of this.waves) {
        w.x += w.vx * .01; w.life -= 10; w.age += 10;
        if (w.attack === 'sonic') { const growth = Math.min(1, w.age / 420); w.rx = 22 + growth * 38; w.ry = 48 + growth * 82; }
        if (w.life > 0 && w.y <= this.floorHeight(w.x)) {
          w.life = 0; this.events.push({ type: 'terrainHit', x: w.x, y: w.y });
        }
      }
      for (let i = 0; i < this.waves.length; i++) for (let j = i + 1; j < this.waves.length; j++) {
        const a = this.waves[i], b = this.waves[j];
        if (a.life > 0 && b.life > 0 && a.owner !== b.owner && Math.abs(a.x - b.x) < a.rx + b.rx && Math.abs(a.y - b.y) < a.ry + b.ry) {
          a.life = b.life = 0; this.events.push({ type: 'clash', x: (a.x + b.x) / 2, y: a.y });
        }
      }
      for (const w of this.waves) {
        const target = this.fighters[1 - w.owner];
        const sonic = w.attack === 'sonic' || MOVES[w.attack]?.tomoriOnly;
        if (w.life > 0 && !target.knockdown && Math.abs(target.x - w.x) < (sonic ? w.rx + 18 : 35) && Math.abs(target.y + 80 - w.y) < (sonic ? w.ry + 50 : 80)) {
          this.hit(w.owner, w.attack || 'wave', w.x, w.y, { projectileRadiusY: w.ry }); w.life = 0;
        }
      }
      this.waves = this.waves.filter(w => w.life > 0 && w.x > WORLD.left - 50 && w.x < WORLD.right + 50);
    }
    hit(side, attack, x, y, impact = {}) {
      const a = this.fighters[side], b = this.fighters[1 - side], move = { ...MOVES[attack], ...impact };
      if (this.invulnerable(b)) return;
      let damage = attack === 'heavy' ? ROSTER[a.character].heavyDamage : move.damage;
      const sourceX = x ?? a.x, sourceY = y ?? a.y + 100;
      const radiusY = move.projectileRadiusY || 0;
      const parry = MOVES[b.attack];
      if (parry?.counter && b.attackMs >= parry.start && b.attackMs <= parry.end && attack !== 'throw' && (sourceX - b.x) * b.facing > 0) {
        b.attack = null; b.buffer = null; b.stun = 80; b.cooldown = 220; b.vx = 0;
        this.spawnWave(1 - side, 'penguinCryWave'); this.freeze = Math.max(this.freeze, 50);
        this.events.push({ type: 'penguinCounter', side: 1 - side, x: b.x, y: b.y + 110 }); return;
      }
      if (b.shield && attack !== 'throw' && (sourceX - b.x) * b.facing > 0 && sourceY + radiusY >= b.y && sourceY - radiusY <= b.y + 220) {
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
      const blocked = attack !== 'throw' && b.guard && (!low || b.crouch) && (!high || !b.crouch);
      const counter = !blocked && !!b.attack && b.attackMs < MOVES[b.attack].start;
      if (blocked) damage = Math.min(damage, move.chip ?? (move.category === 'super' ? (impact.knockdown ? 6 : 2) : move.category === 'special' ? 3 : 0));
      else {
        a.combo = a.comboMs > 0 ? a.combo + 1 : 1; a.comboMs = 1000;
        damage = Math.round(damage * Math.max(.5, 1 - (a.combo - 1) * .1) * (counter ? 1.2 : 1));
        if (a.attack === attack) { a.contact = true; a.lastHitAt = a.attackMs; if (!move.pulses && !move.shots) a.hit = true; }
      }
      b.hp = Math.max(this.options.mode === 'practice' && side === 0 ? 1 : 0, b.hp - damage);
      if (move.category !== 'super' && !move.minion) a.energy = clamp(a.energy + (blocked ? 4 : 12), 0, 100);
      b.energy = clamp(b.energy + (move.minion ? 2 : blocked ? 3 : 8), 0, 100);
      if (attack === 'throw' && a.backThrow) { [a.x, b.x] = [b.x, a.x]; a.facing *= -1; b.facing = -a.facing; }
      b.stun = blocked ? (move.category === 'super' ? 260 : 180) : move.stun;
      b.vx = (move.minion || move.omni ? Math.sign(b.x - sourceX) || a.facing : a.facing) * (blocked ? move.minion ? 25 : move.category === 'super' ? 60 : 140 : move.push);
      b.attack = null; b.buffer = null; b.dashMs = 0;
      if (!blocked) { b.guard = false; b.crouch = false; }
      if (!blocked && (move.knockdown || move.launch)) {
        b.knockdown = move.knockdown || 0; b.vy = move.launch || 280; b.y += .01;
      }
      this.freeze = move.minion ? Math.max(this.freeze, 20) : move.category === 'super' ? 90 : blocked ? 35 : attack === 'heavy' || attack === 'special' ? 75 : 45;
      this.events.push({ type: 'hit', side, attack, damage, blocked, counter, combo: a.combo, x: x ?? b.x, y: y ?? b.y + 100 });
    }
    endRound() {
      const [a, b] = this.fighters;
      this.winner = a.hp === b.hp ? -1 : a.hp > b.hp ? 0 : 1;
      this.reason = this.remaining <= 0 ? 'TIME OVER' : 'K.O.';
      if (this.winner >= 0) this.wins[this.winner]++;
      this.phase = this.wins.some(w => w >= 2) ? 'finished' : 'roundOver';
      this.phaseMs = 650; this.release();
      this.fighters.forEach(f => { f.summons = null; });
      this.fighters.forEach((f, side) => { if (f.penguin) this.endPenguin(side); });
      this.events.push({ type: 'result', winner: this.winner, reason: this.reason });
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
  const api = { Match, ROSTER, MOVES, NORMAL_BUTTONS, moveList, WORLD };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MygoFighter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
