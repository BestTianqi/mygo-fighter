/* Ave Mujica's two complete combat forms. Shared by controls, simulation and UI. */
(function (root) {
  'use strict';
  const CHARACTERS = [
    { id: 5, name: '八幡海铃', shortName: '海铃', en: 'YAHATA UMIRI', stageName: 'Timoris', color: '#71849b', role: '贝斯', archetype: '精准反击型', skill: '深渊低鸣' },
    { id: 6, name: '丰川祥子', shortName: '祥子', en: 'TOGAWA SAKIKO', stageName: 'Oblivionis', color: '#879bcc', role: '键盘', archetype: '傀儡控场型', skill: '神谕终幕' },
    { id: 7, name: '三角初华', shortName: '初华', en: 'MISUMI UIKA', stageName: 'Doloris', color: '#e2bd92', role: '主唱／吉他', archetype: '双月突进型', skill: '星落哀歌' },
    { id: 8, name: '若叶睦', shortName: '睦', en: 'WAKABA MUTSUMI', stageName: 'Mortis', color: '#a7c2a4', role: '吉他', archetype: '人偶牵制型', skill: '空壳剧场' },
    { id: 9, name: '祐天寺若麦', shortName: '若麦', en: 'YUUTENJI NYAMU', stageName: 'Amoris', color: '#cda2bb', role: '鼓手', archetype: '狂爱连击型', skill: '狂爱谢幕' },
  ].map((c, i) => ({ ...c, key: ['umiri', 'sakiko', 'uika', 'mutsumi', 'nyamu'][i], band: 'mujica', description: `以${c.role}的节拍战斗，登台后展现${c.stageName}的另一面。`, specialType: '双形态', speed: 345, jump: 620, lightReach: 110, heavyReach: 150, heavyDamage: 16, specialReach: 180 }));
  const MOVES = {};
  const formFor = f => f.stageForm ? 'stage' : 'normal';
  const prefixFor = f => `mujica_${f.character}_${formFor(f)}`;
  const normalFor = (f, button, stance = 'standing') => `${prefixFor(f)}_${stance === 'standing' ? '' : stance + '_'}${button}`;
  const schemeFor = f => ({ base: ['u', 'i', 'o'].map(k => `${prefixFor(f)}_${k}`), super: `${prefixFor(f)}_super`, transform: 'mujicaTransform',
    variants: f.character === 6 && formFor(f) === 'normal' ? { down1: 'mujica_6_normal_customer' } :
      f.character === 8 && formFor(f) === 'stage' ? { down1: 'mujica_8_stage_toddler', down2: 'mujica_8_stage_burger' } : {} });
  const normalNames = {
    5: [['拨弦轻击', '琴颈重拍'], ['锚弦轻击', '沉锚重拍']], 6: [['琴键轻拍', '茶会重音'], ['黑键敲击', '傀儡重音']],
    7: [['星屑轻拨', '和弦重击'], ['悲弦轻斩', '双月重斩']], 8: [['寡言轻拨', '琴身重击'], ['人偶轻切', '断线重斩']], 9: [['镜头轻拍', '开播重击'], ['绯红轻敲', '狂爱重拍']],
  };
  for (const c of CHARACTERS) for (const [formIndex, form] of ['normal', 'stage'].entries()) {
    const prefix = `mujica_${c.id}_${form}`, owner = { ownerCharacter: c.id, form };
    for (const [stanceIndex, stance] of ['standing', 'crouch', 'air'].entries()) for (const [i, button] of ['light', 'heavy'].entries()) {
      MOVES[`${prefix}_${stance === 'standing' ? '' : stance + '_'}${button}`] = {
        ...owner, name: (stance === 'standing' ? '' : stance === 'crouch' ? '低位·' : '空中·') + normalNames[c.id][formIndex][i],
        command: (stance === 'standing' ? '' : stance === 'crouch' ? '↓＋' : '空中＋') + (i ? 'K' : 'J'), category: 'normal', stance,
        visualSlot: stance === 'standing' ? i ? 'heavy' : 'jab-1' : stance + '-' + button,
        normalIndex: stanceIndex * 6 + (i ? 2 : 0), strength: i ? 3 : 1, duration: i ? 500 : 300,
        start: i ? 160 : 80, end: i ? 240 : 130, damage: (i ? 16 : 8) - (stanceIndex ? 1 : 0),
        reach: (i ? 145 : 110) + (formIndex ? 12 : 0) + (c.id === 5 || c.id === 8 ? 8 : 0),
        vertical: stance === 'crouch' && i ? 170 : 100, level: stance === 'air' ? 'high' : stance === 'crouch' && !i ? 'low' : 'mid',
        stun: i ? 340 : 270, push: i ? 230 : 180, jab: !i && stance === 'standing',
      };
    }
    for (const chain of [2, 3]) MOVES[prefix + 'Jab' + chain] = { ...MOVES[prefix + '_light'],
      name: normalNames[c.id][formIndex][0] + '·' + (chain === 2 ? '二段' : '终拍'), internal: true, chain, visualSlot: 'jab-' + chain,
      duration: chain === 2 ? 320 : 450, start: chain === 2 ? 80 : 130, end: chain === 2 ? 150 : 200,
      normalIndex: chain - 1, strength: chain, damage: chain === 2 ? 10 : 17, reach: chain === 2 ? 150 : 175,
      stun: chain === 2 ? 300 : 480, push: chain === 2 ? 180 : 350, launch: chain === 3 ? 350 : 0 };
  }
  MOVES.mujicaTransform = { name: '登台变身', command: 'H / 2P 小键盘7', category: 'transformation', mujicaOnly: true,
    ground: true, cost: 50, duration: 0, start: 0, end: 0, damage: 0, lifetime: 20000 };
  function add(id, form, slot, name, extra = {}) {
    const key = `mujica_${id}_${form}_${slot}`;
    MOVES[key] = { ownerCharacter: id, form, name, slot, visualSlot: slot === 'super' ? 'super' : 'skill-' + slot, command: { u: 'U', i: 'I', o: 'O', super: 'P' }[slot],
      category: 'special', ground: true, cost: { u: 20, i: 25, o: 30, super: 100 }[slot],
      duration: 600, start: 160, end: 240, damage: slot === 'o' ? 22 : 16, stun: 320, push: 150, reach: 170, vertical: 160, ...extra };
    return key;
  }
  const missile = { projectile: true, speed: 520, lifetime: 1100, height: 100, radiusX: 22, radiusY: 42 };
  const combo = (damages, interval = 160, start = 120) => ({ duration: start + interval * (damages.length - 1) + 360, start, end: start + interval * (damages.length - 1) + 80,
    pulses: damages.map((damage, i) => ({ at: start + i * interval, damage, reach: 190, stun: 320, push: i === damages.length - 1 ? 220 : 25 })) });
  add(5, 'normal', 'u', '意欲何为·精准拨弦', { ...missile, lifetime: 1400, speed: 600 });
  add(5, 'normal', 'i', '很遗憾·稳拍反拨', { category: 'defense', counter: true, counterDamage: 18, start: 120, end: 300, duration: 600, damage: 0, recast: 4000 });
  add(5, 'normal', 'o', '零卡路里·收工重拍', { vertical: 300, reach: 150, launch: 350 });
  add(5, 'stage', 'u', '意欲何为·重低音', { ...missile, groundShock: true, level: 'low', height: 40, radiusY: 30 });
  add(5, 'stage', 'i', '很遗憾·沉锚弦钩', { reach: 300, pull: 100 });
  add(5, 'stage', 'o', '零卡路里·铁壁重拍', { category: 'throw', reach: 90, stun: 500, knockdown: 550 });
  add(6, 'normal', 'u', '琴键问候', missile);
  add(6, 'normal', 'customer', '客服小祥·请稍候', { ...missile, slot: 'u', command: '↓＋U', visualSlot: 'customer', cost: 20,
    customerService: true, damage: 14, stun: 550, push: 160, speed: 680, lifetime: 900, radiusX: 30, radiusY: 54,
    duration: 680, start: 180, end: 210, recast: 2400 });
  add(6, 'normal', 'i', '茶会谢绝', { category: 'defense', durability: 24, lifetime: 2000, recast: 6000, damage: 0, start: 120, end: 140, duration: 400 });
  add(6, 'normal', 'o', '不必再联系', { reach: 195, push: 400 });
  add(6, 'stage', 'u', '黑键断章', { ...missile, damage: 8, shots: [160, 330], end: 350, duration: 650 });
  add(6, 'stage', 'i', '遗忘之牢', { delayedArea: true, damage: 24, warning: 600, areaRadius: 115, recast: 4000, start: 120, end: 140, duration: 450 });
  add(6, 'stage', 'o', '傀儡律令', { reach: 360, pull: 100 });
  add(7, 'normal', 'u', '星屑和弦', missile);
  add(7, 'normal', 'i', '偶像步伐', { damage: 0, movement: 280, movementEnd: 280, duration: 420, start: 300, end: 310 });
  add(7, 'normal', 'o', '追星连奏', combo([6, 6, 10]));
  add(7, 'stage', 'u', '悲恸斩弦', { reach: 220, vertical: 210 });
  add(7, 'stage', 'i', '双月滑奏', { movement: 240, movementEnd: 300, start: 200, end: 330, reach: 150 });
  add(7, 'stage', 'o', '哀歌回响', { ...missile, speed: 280, radiusX: 55, radiusY: 90, lifetime: 1700 });
  add(8, 'normal', 'u', '青瓜投掷', { ...missile, height: 135, spawnOffset: 60, projectileVy: 220, projectileGravity: 600 });
  add(8, 'normal', 'i', '寡言拨弦', { level: 'low', reach: 230 });
  add(8, 'normal', 'o', '请安静一点', { omni: true, reach: 170, push: 400 });
  add(8, 'stage', 'u', 'Mortis·替身代演', { mortis: 'double', duration:760,start:220,end:480,
    pulses:[{at:220,damage:8,reach:320,stun:320,push:25},{at:400,damage:12,reach:340,stun:320,push:220}],
    reach: 340, movement: -100, movementEnd: 160, recast: 1400 });
  add(8, 'stage', 'i', '我不会弹吉他·装死反击', { mortis: 'parry', category: 'defense', counter: true, counterDamage: 22, start: 100, end: 650, duration: 900, damage: 0, recast: 4500 });
  add(8, 'stage', 'o', '不要解散·牵线留人', { mortis: 'snare', level: 'high', delayedArea: true, warning: 430, areaRadius: 150,
    reach: 420, vertical: 180, damage: 18, stun: 650, pull: 150, push: 0, duration: 850, recast: 2600 });
  add(8, 'stage', 'toddler', '我只有两岁', { slot:'u', command:'↓＋U', visualSlot:'skill-u', cost:20,
    mortis:'toddler', omni:true, reach:260, vertical:190, damage:14, stun:420, push:230,
    duration:620, start:150, end:240, recast:1600 });
  add(8, 'stage', 'burger', '我要吃汉堡', { ...missile, slot:'i', command:'↓＋I', visualSlot:'skill-o', cost:25,
    mortis:'burger', damage:18, stun:350, push:180, speed:580, lifetime:1250, radiusX:34, radiusY:35,
    duration:640, start:180, end:210, recast:1400 });
  add(9, 'normal', 'u', '补光闪拍', { reach: 200, vertical: 180 });
  add(9, 'normal', 'i', '流量冲刺', { movement: 200, movementEnd: 260, start: 170, end: 280 });
  add(9, 'normal', 'o', '开播连击', combo([6, 6, 10]));
  add(9, 'stage', 'u', '绯红双击', combo([8, 8]));
  add(9, 'stage', 'i', '踏碎节拍', { hop: 380, movement: 100, movementEnd: 300, duration: 750, start: 300, end: 540, vertical: 230, level: 'high' });
  add(9, 'stage', 'o', '狂欢过门', combo([4, 4, 4, 10], 130));
  const superNames = { 5: '练习结束后再吵', 6: '我来成为神明', 7: 'Saki酱！Saki酱！', 8: '从来没觉得玩乐队开心过', 9: '完美笑容·摘下面具' };
  const superDurations = { 5: 3400, 6: 6400, 7: 4800, 8: 8300, 9: 3500 };
  for (const c of CHARACTERS) for (const [i, form] of ['normal', 'stage'].entries()) {
    const damages = c.id === 5 && !i ? [16, 16, 16] : c.id === 9 && i ? Array(8).fill(6) : [8, 12, 28];
    const duration = superDurations[c.id];
    const pulses = damages.map((damage, n) => ({ at: Math.round((500 + n * (duration - 1100) / (damages.length - 1)) / 10) * 10,
      damage, reach: Math.min(420, 220 + n * 100), stun: 400, push: n === damages.length - 1 ? 240 : 15 }));
    if (c.id === 7) pulses.forEach((pulse, n) => { pulse.at = [1000, 2600, 4200][n]; pulse.reach = 200; });
    add(c.id, form, 'super', superNames[c.id], { category: 'super', duration, start: 500,
      end: pulses.at(-1).at + 90, invuln: 100, damage: 48, reach: 420, vertical: 300, pulses,
      ...(c.id === 7 ? { crawl: true, crawlSpeed: 90, level: 'low', reach: 200, vertical: 90 } : {}) });
  }
  for (const [key, move] of Object.entries(MOVES)) if (move.counter && move.counterDamage) {
    move.counterAttack = key + '_counter';
    MOVES[move.counterAttack] = { ...missile, ownerCharacter: move.ownerCharacter, form: move.form, internal: true,
      name: move.name + '·反击', category: 'special', damage: move.counterDamage, chip: 0, stun: 340, push: 220, speed: 700, lifetime: 500 };
  }
  Object.assign(MOVES.mujica_8_stage_super, { name: 'Mortis·双生剧场', mortis: 'theater', omni: true, reach: 420,
    pulses: [{ at:500,damage:8,reach:420,stun:650,pull:90,push:0 }, { at:4100,damage:12,reach:420,stun:650,pull:90,push:0 },
      { at:7200,damage:28,reach:420,stun:650,push:240,launch:240 }] });
  const api = { CHARACTERS, MOVES, schemeFor, prefixFor, normalFor, formFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MygoMujica = api;
})(typeof window !== 'undefined' ? window : globalThis);
