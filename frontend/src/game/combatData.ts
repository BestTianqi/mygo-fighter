import type { Move } from "./objects/Move";
import type { Character } from "./objects/Character";
import type { FighterIdentity } from "./objects/Fighter";
/* Browser port of the core combat and terrain rules in Game/StageFighterState.h.
 * Independent of rendering; fixed 10 ms steps keep gameplay frame-rate independent. */

import * as mujica from "./mujica";
import * as mewtype from "./mewtype";
const isMujica = (character: number) => character >= 5 && character < 10;
const kitFor = (f: FighterIdentity) =>
  f.character >= 10 ? mewtype : isMujica(f.character) ? mujica : null;
const MAX_HEALTH = 200;
const ROUND_END_TIMING = Object.freeze({
  impact: 120,
  knockout: 700,
  art: 1900,
  settle: 600,
  total: 3200,
});
const WORLD = Object.freeze({
  left: -720,
  right: 1680,
  bottom: -180,
  top: 1120,
});
// Reference values are normalized from a 54-unit standing sprite to our 235-unit artwork.
const FEEL = Object.freeze({
  scale: 235 / 54,
  walk: (1.82 * 60 * 235) / 54,
  airRatio: 1.38 / 1.82,
  jump: (275 * 235) / 54,
  airJumpRatio: 230 / 275,
  gravity: (760 * 235) / 54,
  dashSpeed: (5.15 * 60 * 235) / 54,
  dashDuration: 180,
  dashCooldown: 600,
  dashInvuln: 120,
  dashCost: 10,
  normalBuffer: 150,
  specialBuffer: 300,
  bodyGap: (20 * 235) / 54,
  groundDrag: (11 * 60 * 235) / 54,
  airDrag: (3 * 60 * 235) / 54,
  baseZoom: ((54 / 235) * 960) / 384,
});
const ROSTER: Character[] = [
  {
    name: "千早爱音",
    shortName: "爱音",
    en: "CHIHAYA ANON",
    skill: "闪耀合奏",
    color: "#f6a4c7",
    role: "主音吉他",
    archetype: "均衡型",
    specialType: "突进",
    description: "向前一步，用闪耀的合奏打开局面。",
    speed: 345,
    jump: 620,
    lightReach: 94,
    heavyReach: 126,
    heavyDamage: 16,
    specialReach: 170,
  },
  {
    name: "长崎素世",
    shortName: "素世",
    en: "NAGASAKI SOYO",
    skill: "回响终章",
    color: "#dfbd91",
    role: "贝斯",
    archetype: "控场型",
    specialType: "对空",
    description: "保持距离，用回响截住对手的跃起。",
    speed: 345,
    jump: 620,
    lightReach: 94,
    heavyReach: 126,
    heavyDamage: 16,
    specialReach: 230,
    specialVertical: 160,
  },
  {
    name: "高松灯",
    shortName: "灯",
    en: "TAKAMATSU TOMORI",
    skill: "迷途之歌",
    color: "#a8bfdc",
    role: "主唱",
    archetype: "歌声控场型",
    specialType: "三段歌声",
    description: "握紧麦克风，让诗句与歌声传到对手面前。",
    speed: 315,
    jump: 590,
    lightReach: 88,
    heavyReach: 118,
    heavyDamage: 16,
    specialReach: 210,
  },
  {
    name: "要乐奈",
    shortName: "乐奈",
    en: "KANAME RANA",
    skill: "野猫即兴独奏",
    color: "#b5d4ba",
    role: "吉他",
    archetype: "灵巧突进型",
    specialType: "四段拨弦",
    description: "低姿突进与吉他挥击，抓住空隙即兴独奏。",
    speed: 390,
    jump: 690,
    lightReach: 100,
    heavyReach: 128,
    heavyDamage: 15,
    specialReach: 195,
  },
  {
    name: "椎名立希",
    shortName: "立希",
    en: "SHIINA TAKI",
    skill: "八拍过门",
    color: "#b5a1d7",
    role: "鼓手",
    archetype: "鼓点压制型",
    specialType: "八段连打",
    description: "双棒衔接重拍，积累四拍强化下一次特殊技。",
    speed: 330,
    jump: 620,
    lightReach: 100,
    heavyReach: 145,
    heavyDamage: 20,
    specialReach: 200,
  },
  ...mujica.CHARACTERS,
  ...mewtype.CHARACTERS,
];
const NORMAL_BUTTONS = [
  "light",
  "medium",
  "heavy",
  "lightKick",
  "mediumKick",
  "heavyKick",
];
for (const profile of ROSTER) {
  profile.speed *= FEEL.walk / 345;
  profile.jump *= FEEL.jump / 620;
}
const PENGUIN_PROFILE = {
  ...ROSTER[2],
  speed: (375 * FEEL.walk) / 345,
  jump: (640 * FEEL.jump) / 620,
};
const profileFor = (f: FighterIdentity) => {
  const profile =
    f.character === 2 && f.penguin ? PENGUIN_PROFILE : ROSTER[f.character];
  return isMujica(f.character) && f.stageForm
    ? { ...profile, speed: profile.speed * mujica.STAGE_FORM.speedMultiplier }
    : profile;
};
const NORMAL_KEYS = ["J", "H", "K", "N", "M", ","];
const verticalScale = Math.sqrt(FEEL.gravity / 1600);
const MOVES: Record<string, Move> = {};
const normalSpecs: [
  string,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
][] = [
  ["轻拳·起音", 300, 80, 140, 8, 94, 180, 120],
  ["中拳·切分", 390, 120, 180, 11, 115, 240, 150],
  ["重拳·重拍", 520, 170, 240, 16, 126, 300, 210],
  ["轻脚·前奏", 270, 70, 120, 6, 105, 160, 110],
  ["中脚·延音", 420, 130, 200, 12, 145, 260, 180],
  ["重脚·回旋", 590, 210, 280, 18, 175, 350, 250],
];
for (const [stanceIndex, stance] of (
  ["standing", "crouch", "air"] as const
).entries()) {
  normalSpecs.forEach(
    ([name, duration, start, end, damage, reach, stun, push], index) => {
      const key =
        (stance === "standing" ? "" : stance + "_") + NORMAL_BUTTONS[index];
      MOVES[key] = {
        name:
          (stance === "crouch" ? "蹲" : stance === "air" ? "空中" : "") + name,
        category: "normal",
        stance,
        strength: (index % 3) + 1,
        normalIndex: stanceIndex * 6 + index,
        command:
          (stance === "crouch" ? "↓ + " : stance === "air" ? "跳跃 + " : "") +
          NORMAL_KEYS[index],
        duration,
        start,
        end,
        damage: damage - (stance === "standing" ? 0 : 1),
        reach,
        stun,
        push,
        level:
          stance === "air"
            ? "high"
            : stance === "crouch" && index !== 2
              ? "low"
              : "mid",
        vertical: stance === "crouch" && index === 2 ? 175 : 95,
        knockdown: stance === "crouch" && index === 5 ? 650 : 0,
      };
    },
  );
}
Object.assign(MOVES, {
  penguinTransform: {
    name: "凑企鹅变身",
    command: "G / Delete（2P）",
    category: "transformation",
    tomoriOnly: true,
    nativeOnly: true,
    ground: true,
    cost: 50,
    duration: 0,
    start: 0,
    end: 0,
    damage: 0,
    lifetime: 20000,
  },
  penguinKick: {
    name: "飞踢",
    command: "C / 空中F；2P Home / PageDown",
    category: "special",
    tomoriOnly: true,
    penguinOnly: true,
    penguinAirAction: true,
    cost: 10,
    duration: 680,
    start: 140,
    end: 330,
    damage: 16,
    stun: 350,
    push: 190,
    reach: 160,
    vertical: 140,
    knockdown: 350,
  },
  penguinCry: {
    name: "糖哭·反击",
    command: "U / 小键盘*（2P）",
    category: "defense",
    tomoriOnly: true,
    penguinOnly: true,
    ground: true,
    counter: true,
    cost: 15,
    duration: 900,
    start: 80,
    end: 700,
    damage: 0,
  },
  penguinCryWave: {
    name: "糖哭·回击",
    category: "special",
    tomoriOnly: true,
    penguinOnly: true,
    internal: true,
    projectile: true,
    damage: 10,
    chip: 1,
    stun: 260,
    push: 170,
    speed: 500,
    lifetime: 600,
    radiusX: 24,
    radiusY: 44,
    height: 90,
  },
  penguinHey: {
    name: "hey?·当面震慑",
    command: "I / 2P 小键盘5",
    category: "special",
    tomoriOnly: true,
    penguinOnly: true,
    ground: true,
    cost: 10,
    duration: 440,
    start: 120,
    end: 180,
    damage: 10,
    chip: 1,
    stun: 300,
    push: 220,
    reach: 220,
    vertical: 150,
  },
  penguinLaugh: {
    name: "唐笑·震荡",
    command: "T / 小键盘 Enter（2P）",
    category: "special",
    tomoriOnly: true,
    penguinOnly: true,
    ground: true,
    omni: true,
    cost: 20,
    duration: 650,
    start: 200,
    end: 270,
    damage: 12,
    stun: 360,
    push: 250,
    reach: 200,
    vertical: 180,
  },
  penguinCall: {
    name: "咕咕嘎嘎·冲撞三连",
    command: "O / 2P 小键盘6",
    category: "special",
    tomoriOnly: true,
    penguinOnly: true,
    ground: true,
    cost: 40,
    duration: 900,
    start: 180,
    end: 560,
    damage: 8,
    chip: 1,
    stun: 260,
    push: 40,
    reach: 170,
    vertical: 150,
    movement: 260,
    movementEnd: 500,
    pulses: [
      { at: 180, damage: 6 },
      { at: 340, damage: 6 },
      { at: 500, damage: 12, push: 240 },
    ],
  },
  special: {
    name: "闪耀合奏",
    command: "L",
    category: "special",
    duration: 650,
    start: 230,
    end: 290,
    damage: 24,
    stun: 380,
    push: 280,
    cost: 60,
  },
  wave: {
    name: "音符弹·中",
    command: "↓↘→ + H / I",
    category: "special",
    projectile: true,
    duration: 380,
    start: 120,
    end: 140,
    damage: 14,
    stun: 200,
    push: 150,
    cost: 20,
    speed: 440,
  },
  tomoriNote: {
    name: "微光音符",
    command: "I / 小键盘4（2P）",
    category: "special",
    tomoriOnly: true,
    nativeOnly: true,
    ground: true,
    projectile: true,
    duration: 440,
    start: 140,
    end: 160,
    damage: 12,
    chip: 2,
    stun: 220,
    push: 110,
    cost: 20,
    speed: 380,
    lifetime: 1800,
    radiusX: 16,
    radiusY: 25,
    height: 100,
  },
  tomoriEcho: {
    name: "诗句回声",
    command: "T / 小键盘 Enter（2P）",
    category: "special",
    tomoriOnly: true,
    nativeOnly: true,
    ground: true,
    projectile: true,
    duration: 700,
    start: 230,
    end: 250,
    damage: 18,
    chip: 3,
    stun: 330,
    push: 210,
    cost: 30,
    speed: 360,
    lifetime: 1800,
    radiusX: 34,
    radiusY: 65,
    height: 110,
  },
  tomoriChorus: {
    name: "迷途之歌",
    command: "L / 小键盘3（2P）",
    category: "special",
    tomoriOnly: true,
    nativeOnly: true,
    ground: true,
    projectile: true,
    duration: 1100,
    start: 260,
    end: 660,
    shots: [260, 450, 640],
    damage: 8,
    chip: 1,
    stun: 260,
    push: 70,
    cost: 60,
    speed: 420,
    lifetime: 1800,
    radiusX: 26,
    radiusY: 54,
    height: 110,
  },
  tomoriSuper: {
    name: "一辈子乐队",
    command: "P / 2P 小键盘8",
    category: "super",
    ownerCharacter: 2,
    tomoriOnly: true,
    nativeOnly: true,
    ground: true,
    projectile: true,
    cost: 100,
    duration: 7200,
    start: 500,
    end: 6490,
    invuln: 100,
    shots: [500, 3400, 6400],
    damage: 48,
    speed: 420,
    lifetime: 1400,
    height: 110,
    radiusX: 40,
    radiusY: 100,
    stun: 400,
    push: 25,
    pulses: [
      { at: 500, damage: 12 },
      { at: 3400, damage: 16 },
      { at: 6400, damage: 20, push: 150 },
    ],
  },
  penguinSuper: {
    name: "司凤版春日影演唱",
    command: "P / 2P 小键盘8",
    category: "super",
    ownerCharacter: 2,
    tomoriOnly: true,
    penguinOnly: true,
    ground: true,
    projectile: true,
    cost: 100,
    duration: 8300,
    start: 500,
    end: 7990,
    invuln: 100,
    shots: [500, 1700, 2900, 4100, 5300],
    damage: 10,
    radial: true,
    fixedDamage: true,
    omni: true,
    reach: 650,
    speed: 250,
    lifetime: 2800,
    height: 100,
    stun: 360,
    push: 10,
    pulses: [500, 1700, 2900, 4100, 5300].map((at) => ({ at, damage: 10 })),
  },
  sonic: {
    name: "TGW·音波攻击",
    command: "T",
    category: "special",
    projectile: true,
    anonOnly: true,
    ground: true,
    duration: 620,
    start: 180,
    end: 200,
    damage: 22,
    stun: 360,
    push: 360,
    cost: 30,
    speed: 560,
    lifetime: 950,
    artIndex: 2,
  },
  anonCry: {
    name: "唐哭",
    command: "← + U",
    category: "special",
    projectile: true,
    ownerCharacter: 0,
    anonOnly: true,
    ground: true,
    duration: 650,
    start: 180,
    end: 200,
    damage: 12,
    stun: 300,
    push: 100,
    cost: 20,
    speed: 480,
    lifetime: 1200,
    maxReach: 560,
    radiusX: 30,
    radiusY: 50,
    height: 110,
    artIndex: 2,
  },
  thrust: {
    name: "闪光突刺",
    command: "↓↘→ + 脚 / C",
    category: "special",
    anonOnly: true,
    ground: true,
    duration: 500,
    start: 130,
    end: 220,
    damage: 14,
    stun: 330,
    push: 170,
    cost: 15,
    reach: 140,
    artIndex: 1,
  },
  rush: {
    name: "切分三连击",
    command: "V",
    category: "special",
    anonOnly: true,
    ground: true,
    duration: 900,
    start: 100,
    end: 590,
    damage: 22,
    stun: 260,
    push: 80,
    cost: 25,
    artIndex: 0,
    cancelAt: 520,
    pulses: [
      { at: 100, damage: 6, reach: 150, stun: 230, push: 60 },
      { at: 280, damage: 6, reach: 165, stun: 260, push: 80 },
      { at: 500, damage: 10, reach: 180, stun: 400, push: 220 },
    ],
  },
  dive: {
    name: "流星俯冲踢",
    command: "空中 ↓ + , / F",
    category: "special",
    anonOnly: true,
    airOnly: true,
    minHeight: 45,
    duration: 700,
    start: 60,
    end: 600,
    damage: 16,
    stun: 420,
    push: 130,
    cost: 15,
    reach: 100,
    vertical: 115,
    level: "high",
    artIndex: 17,
  },
  throw: {
    name: "投技·换拍",
    command: "B（后投：← + B）",
    category: "throw",
    ground: true,
    duration: 520,
    start: 80,
    end: 100,
    damage: 18,
    stun: 500,
    push: 320,
    reach: 66,
    knockdown: 650,
  },
  shield: {
    name: "钢板防护",
    command: "U",
    category: "defense",
    anonOnly: true,
    ground: true,
    cost: 20,
    duration: 360,
    start: 100,
    end: 120,
    damage: 0,
    durability: 40,
    lifetime: 3000,
  },
  heal: {
    name: "归心·自愈",
    command: "G / Delete（2P）",
    category: "support",
    soyoOnly: true,
    ground: true,
    duration: 1200,
    start: 700,
    end: 710,
    damage: 0,
    cost: 35,
    healing: 24,
    recast: 12000,
  },
  soyoCutline: {
    name: "剪切线",
    command: "前 + I / 2P 前 + 小键盘5",
    category: "special",
    ownerCharacter: 1,
    soyoOnly: true,
    ground: true,
    duration: 760,
    start: 180,
    end: 440,
    cost: 25,
    damage: 20,
    reach: 360,
    vertical: 105,
    stun: 280,
    push: 0,
    chip: 1,
    pulses: [
      { at: 180, damage: 9, push: 0 },
      { at: 360, damage: 11, stun: 380, push: 280 },
    ],
  },
  summon: {
    name: "小天素罗召唤",
    command: "T / 小键盘 Enter（2P）",
    category: "special",
    soyoOnly: true,
    ground: true,
    duration: 600,
    start: 220,
    end: 240,
    damage: 4,
    cost: 50,
    lifetime: 10000,
    callGap: 1000,
  },
  tensoraHit: {
    name: "小天素罗突袭",
    category: "special",
    internal: true,
    minion: true,
    damage: 4,
    chip: 1,
    stun: 110,
    push: 45,
  },
  soyoSuper: {
    name: "为什么要演奏春日影",
    command: "P / 2P 小键盘−",
    category: "super",
    soyoOnly: true,
    ground: true,
    cost: 100,
    duration: 2800,
    start: 850,
    end: 850,
    damage: 0,
    hardStun: 2000,
    reach: 620,
    expansion: 450,
    waveDuration: 700,
    invuln: 850,
  },
  rising: {
    name: "闪耀升龙",
    command: "→↓↘ + 拳 / Y",
    category: "special",
    anonOnly: true,
    ground: true,
    duration: 650,
    start: 80,
    end: 180,
    damage: 20,
    stun: 380,
    push: 190,
    cost: 30,
    reach: 125,
    vertical: 230,
    invuln: 110,
    launch: 380,
  },
  spin: {
    name: "旋律回旋踢",
    command: "↓↙← + 脚 / ;",
    category: "special",
    anonOnly: true,
    duration: 620,
    start: 160,
    end: 280,
    damage: 18,
    stun: 330,
    push: 230,
    cost: 25,
    reach: 180,
    vertical: 115,
    artIndex: 5,
  },
  overhead: {
    name: "越拍踢",
    command: "→ + ,",
    category: "normal",
    anonOnly: true,
    ground: true,
    strength: 3,
    duration: 650,
    start: 260,
    end: 340,
    damage: 18,
    stun: 360,
    push: 200,
    reach: 160,
    level: "high",
    artIndex: 5,
  },
  super: {
    name: "粉色奶龙·法天象地",
    command: "↓↘→↓↘→ + 拳 / P",
    category: "super",
    anonOnly: true,
    ground: true,
    duration: 2600,
    start: 800,
    end: 1580,
    damage: 48,
    stun: 450,
    push: 150,
    cost: 100,
    reach: 450,
    vertical: 360,
    invuln: 850,
    pulses: [
      { at: 800, damage: 8, reach: 250 },
      { at: 1120, damage: 10, reach: 350 },
      { at: 1500, damage: 30, reach: 470, push: 320, knockdown: 750 },
    ],
  },
});
MOVES.waveLight = {
  ...MOVES.wave,
  name: "音符弹·轻",
  command: "↓↘→ + J",
  anonOnly: true,
  damage: 10,
  speed: 330,
};
MOVES.waveHeavy = {
  ...MOVES.wave,
  name: "音符弹·重",
  command: "↓↘→ + K",
  anonOnly: true,
  damage: 18,
  speed: 570,
};
const ranaNames = [
  "猫掌轻拍",
  "琴身碰撞",
  "吉他重挥",
  "探步轻踢",
  "侧身中踢",
  "转身重踢",
];
for (const stance of ["standing", "crouch", "air"])
  NORMAL_BUTTONS.forEach((button, i) => {
    const suffix = (stance === "standing" ? "" : stance + "_") + button,
      source = MOVES[suffix];
    MOVES["rana_" + suffix] = {
      ...source,
      ranaOnly: true,
      name:
        (stance === "crouch" ? "蹲下·" : stance === "air" ? "空中·" : "") +
        ranaNames[i],
      duration: Math.max(230, source.duration - 30),
      start: Math.max(60, source.start - 10),
      damage: source.damage - 1,
      reach: source.reach! + (i < 3 ? 8 : 0),
    };
  });
Object.assign(MOVES, {
  ranaPick: {
    name: "拨弦·弦音",
    command: "I / 2P 小键盘4",
    category: "special",
    ranaOnly: true,
    ground: true,
    projectile: true,
    cost: 20,
    duration: 390,
    start: 110,
    end: 130,
    damage: 12,
    chip: 2,
    stun: 230,
    push: 120,
    speed: 600,
    lifetime: 1100,
    height: 110,
    radiusX: 20,
    radiusY: 32,
  },
  ranaChord: {
    name: "强奏·和弦",
    command: "T / 2P 小键盘Enter",
    category: "special",
    ranaOnly: true,
    ground: true,
    projectile: true,
    cost: 30,
    duration: 630,
    start: 210,
    end: 230,
    damage: 20,
    chip: 3,
    stun: 340,
    push: 260,
    speed: 460,
    lifetime: 1250,
    height: 110,
    radiusX: 34,
    radiusY: 70,
  },
  ranaParfait: {
    name: "抹茶芭菲投掷",
    command: "V / 2P End",
    category: "special",
    ranaOnly: true,
    ground: true,
    projectile: true,
    cost: 25,
    duration: 700,
    start: 220,
    end: 240,
    damage: 18,
    chip: 2,
    stun: 320,
    push: 190,
    speed: 550,
    lifetime: 1800,
    height: 135,
    spawnOffset: 85,
    radiusX: 24,
    radiusY: 42,
    projectileVy: 170,
    projectileGravity: 420,
  },
  ranaRush: {
    name: "野猫突进",
    command: "C / 2P Home",
    category: "special",
    ranaOnly: true,
    ground: true,
    cost: 15,
    duration: 420,
    start: 100,
    end: 190,
    damage: 12,
    stun: 300,
    push: 145,
    reach: 135,
    vertical: 100,
  },
  ranaRise: {
    name: "琴锋上挑",
    command: "Y / 2P 小键盘+",
    category: "special",
    ranaOnly: true,
    ground: true,
    cost: 25,
    duration: 650,
    start: 70,
    end: 200,
    damage: 17,
    stun: 350,
    push: 150,
    reach: 135,
    vertical: 230,
    invuln: 80,
    launch: 380,
  },
  ranaSlide: {
    name: "猫步滑踢",
    command: "U / 2P 小键盘*",
    category: "special",
    ranaOnly: true,
    ground: true,
    cost: 20,
    duration: 550,
    start: 100,
    end: 230,
    damage: 13,
    stun: 340,
    push: 200,
    reach: 155,
    vertical: 90,
    level: "low",
    knockdown: 450,
  },
  ranaDive: {
    name: "跃猫俯冲",
    command: "空中 F / 2P PageDown",
    category: "special",
    ranaOnly: true,
    airOnly: true,
    minHeight: 45,
    cost: 15,
    duration: 700,
    start: 50,
    end: 600,
    damage: 15,
    stun: 390,
    push: 130,
    reach: 105,
    vertical: 115,
    level: "high",
  },
  ranaSolo: {
    name: "野猫即兴独奏",
    command: "L / 2P 小键盘3",
    category: "special",
    ranaOnly: true,
    ground: true,
    projectile: true,
    cost: 60,
    duration: 1050,
    start: 180,
    end: 680,
    shots: [180, 340, 500, 660],
    damage: 7,
    chip: 1,
    stun: 240,
    push: 45,
    speed: 540,
    lifetime: 1600,
    height: 110,
    radiusX: 26,
    radiusY: 52,
  },
  ranaTune: {
    name: "静心调弦",
    command: "G / 2P Delete",
    category: "support",
    ranaOnly: true,
    ground: true,
    cost: 0,
    duration: 1180,
    start: 800,
    end: 810,
    damage: 0,
    energyGain: 20,
    recast: 8000,
  },
  ranaSuper: {
    name: "有趣的女人·全力独奏",
    command: "P / 2P 小键盘8",
    category: "super",
    ranaOnly: true,
    ground: true,
    cost: 100,
    duration: 2300,
    start: 400,
    end: 1080,
    damage: 48,
    stun: 400,
    push: 75,
    reach: 420,
    vertical: 260,
    invuln: 430,
    pulses: [
      { at: 400, damage: 8, reach: 260 },
      { at: 700, damage: 12, reach: 340 },
      { at: 1000, damage: 28, reach: 420, push: 300, knockdown: 700 },
    ],
  },
});
const penguinNames = [
  "鳍拍·轻",
  "鳍拍·连",
  "企鹅顶撞",
  "蹬脚·轻",
  "蹬脚·中",
  "回身扫脚",
];
for (const stance of ["standing", "crouch", "air"])
  NORMAL_BUTTONS.forEach((button, i) => {
    const suffix = (stance === "standing" ? "" : stance + "_") + button,
      source = MOVES[suffix];
    MOVES["penguin_" + suffix] = {
      ...source,
      name:
        (stance === "crouch" ? "低位·" : stance === "air" ? "空中·" : "") +
        penguinNames[i],
      penguinNormal: true,
      tomoriOnly: true,
      penguinOnly: true,
      damage: [6, 9, 14, 5, 10, 16][i],
      reach: [90, 110, 125, 105, 130, 155][i],
    };
  });
const rikiNames = [
  "轻鼓棒",
  "交叉双棒",
  "重拍砸棒",
  "低踢",
  "侧踢",
  "转身扫踢",
];
for (const stance of ["standing", "crouch", "air"])
  NORMAL_BUTTONS.forEach((button, i) => {
    const suffix = (stance === "standing" ? "" : stance + "_") + button,
      source = MOVES[suffix];
    MOVES["riki_" + suffix] = {
      ...source,
      rikiOnly: true,
      name:
        (stance === "crouch" ? "蹲下·" : stance === "air" ? "空中·" : "") +
        rikiNames[i],
      damage: [7, 11, 20, 6, 10, 17][i] - (stance === "standing" ? 0 : 1),
      duration: source.duration + (i === 2 ? 40 : 0),
      reach: source.reach! + (i < 3 ? 12 : 0),
    };
  });
Object.assign(MOVES, {
  rikiRoll: {
    name: "滚奏连打",
    command: "I / 2P 小键盘4",
    category: "special",
    rikiOnly: true,
    ground: true,
    cost: 20,
    duration: 650,
    start: 100,
    end: 490,
    damage: 15,
    stun: 300,
    push: 10,
    reach: 190,
    cancelAt: 400,
    pulses: [100, 250, 400].map((at) => ({ at, damage: 5, reach: 190 })),
  },
  rikiRush: {
    name: "踩镲抢拍",
    command: "C / 2P Home",
    category: "special",
    rikiOnly: true,
    ground: true,
    cost: 15,
    duration: 500,
    start: 160,
    end: 250,
    damage: 12,
    stun: 350,
    push: 35,
    reach: 170,
    dashSpeed: 1000,
  },
  rikiOverhead: {
    name: "反拍砸击",
    command: "U / 2P 小键盘*",
    category: "special",
    rikiOnly: true,
    ground: true,
    cost: 20,
    duration: 760,
    start: 300,
    end: 390,
    damage: 18,
    stun: 360,
    push: 130,
    reach: 195,
    vertical: 140,
    level: "high",
  },
  rikiShock: {
    name: "低音落震",
    command: "T / 2P 小键盘Enter",
    category: "special",
    rikiOnly: true,
    ground: true,
    projectile: true,
    cost: 30,
    duration: 700,
    start: 220,
    end: 240,
    damage: 18,
    chip: 3,
    stun: 310,
    push: 160,
    speed: 480,
    lifetime: 720,
    height: 40,
    radiusX: 32,
    radiusY: 42,
    groundShock: true,
    level: "low",
  },
  rikiRise: {
    name: "重拍上挑",
    command: "Y / 2P 小键盘+",
    category: "special",
    rikiOnly: true,
    ground: true,
    cost: 25,
    duration: 760,
    start: 90,
    end: 220,
    damage: 16,
    stun: 390,
    push: 90,
    reach: 160,
    vertical: 240,
    launch: 380,
  },
  rikiCalibrate: {
    name: "节拍校准",
    command: "G / 2P Delete",
    category: "support",
    rikiOnly: true,
    ground: true,
    cost: 25,
    duration: 800,
    start: 300,
    end: 310,
    damage: 0,
    recast: 8000,
  },
  rikiEight: {
    name: "八拍过门",
    command: "L / 2P 小键盘3",
    category: "special",
    rikiOnly: true,
    ground: true,
    cost: 60,
    duration: 1450,
    start: 180,
    end: 1110,
    damage: 29,
    stun: 300,
    push: 8,
    reach: 220,
    cancelAt: 1020,
    pulses: Array.from({ length: 8 }, (_, i) => ({
      at: 180 + i * 120,
      damage: i === 7 ? 8 : 3,
      reach: 220,
      ...(i === 7 ? { push: 150, knockdown: 650 } : {}),
    })),
  },
  rikiSuper: {
    name: "哈？哈？哈？·全场共振",
    command: "P / 2P 小键盘8",
    category: "super",
    rikiOnly: true,
    ground: true,
    cost: 100,
    duration: 4400,
    start: 500,
    end: 3690,
    damage: 48,
    stun: 500,
    push: 30,
    reach: 420,
    vertical: 280,
    invuln: 100,
    pulses: [
      { at: 500, damage: 8, reach: 300, chip: 2 },
      { at: 1800, damage: 12, reach: 360, chip: 2 },
      { at: 3600, damage: 28, reach: 420, push: 300, knockdown: 750, chip: 4 },
    ],
  },
});
for (const [name, changes] of Object.entries({
  rikiRoll: { hitRecovery: 100 },
  rikiRush: { dashSpeed: 1220, pull: true },
  rikiOverhead: { stun: 440 },
  rikiShock: { shots: [220, 410], end: 430 },
  rikiRise: { vertical: 290, follow: true },
})) {
  const source = MOVES[name];
  MOVES[name + "Boost"] = {
    ...source,
    ...changes,
    name: source.name + "·四拍强化",
    internal: true,
    boosted: true,
    base: name,
    ...(source.pulses ? { pulses: source.pulses.map((p) => ({ ...p })) } : {}),
  };
}
MOVES.rikiShockExtra = {
  ...MOVES.rikiShock,
  name: "四拍·追加低音",
  internal: true,
  damage: 8,
  chip: 1,
};
Object.assign(MOVES, mujica.MOVES, mewtype.MOVES);
function chainPrefix(f: FighterIdentity) {
  return kitFor(f)
    ? kitFor(f)!.prefixFor(f)
    : f.penguin
      ? "penguin"
      : ["anon", "soyo", "tomori", "rana", "riki"][f.character];
}
function firstJab(f: FighterIdentity) {
  return kitFor(f)
    ? kitFor(f)!.normalFor(f, "light")
    : f.penguin
      ? "penguin_light"
      : f.character === 3
        ? "rana_light"
        : f.character === 4
          ? "riki_light"
          : "light";
}
for (const key of ["light", "rana_light", "penguin_light", "riki_light"])
  Object.assign(MOVES[key], {
    duration: 300,
    start: 80,
    end: 130,
    reach: 45 * FEEL.scale,
    stun: 270,
    push: 50 * FEEL.scale,
    jab: true,
  });
MOVES.throw.reach = 40 * FEEL.scale;
for (const move of Object.values(MOVES)) {
  if (move.launch) move.launch *= verticalScale;
  if (!move.jab && move.push) move.push *= FEEL.scale / 2;
  if (move.pulses)
    for (const pulse of move.pulses)
      if (pulse.push) pulse.push *= FEEL.scale / 2;
}
for (const [prefix, source] of [
  ["anon", MOVES.light],
  ["soyo", MOVES.light],
  ["tomori", MOVES.light],
  ["rana", MOVES.rana_light],
  ["penguin", MOVES.penguin_light],
  ["riki", MOVES.riki_light],
] as [string, Move][]) {
  for (const chain of [2, 3])
    MOVES[prefix + "Jab" + chain] = {
      ...source,
      internal: true,
      chain,
      name:
        (chain === 2 ? "二段·" : "三段·") +
        (
          {
            anon: ["侧踢", "破拍上勾拳"],
            soyo: ["横掌", "双掌上挑"],
            tomori: ["贴身肘击", "麦克风上挑"],
            rana: ["琴身撞击", "琴锋上挑"],
            penguin: ["蹬脚", "企鹅顶撞"],
            riki: ["交叉双棒", "重拍上挑"],
          } as Record<string, string[]>
        )[prefix][chain - 2],
      duration: chain === 2 ? 320 : 450,
      start: chain === 2 ? 80 : 130,
      end: chain === 2 ? 150 : 200,
      jab: true,
      reach: (chain === 2 ? 47 : 51) * FEEL.scale,
      normalIndex:
        chain === 2 && prefix === "anon"
          ? 4
          : chain === 2 && prefix === "penguin"
            ? 3
            : chain - 1,
      strength: chain,
      damage: chain === 2 ? 10 : 17,
      stun: chain === 2 ? 300 : 480,
      push: (chain === 2 ? 65 : 145) * FEEL.scale,
      launch: chain === 3 ? 220 * FEEL.scale : 0,
      anonOnly: prefix === "anon",
      soyoOnly: prefix === "soyo",
      tomoriOnly: prefix === "tomori" || prefix === "penguin",
      ranaOnly: prefix === "rana",
      rikiOnly: prefix === "riki",
      penguinOnly: prefix === "penguin",
    };
}
// Shared balance pass covers every roster member, stance, chain and transformation.
const normalDamage = (damage: number) =>
  Math.max(1, Math.round(Math.round(damage * 0.75) * 0.9));
for (const profile of ROSTER) {
  profile.heavyDamage = normalDamage(profile.heavyDamage);
  profile.heavyReach = Math.round(profile.heavyReach * 1.2);
}
for (const [key, move] of Object.entries(MOVES)) {
  if (move.category === "normal") {
    move.damage = normalDamage(move.damage);
    move.duration += 80;
    const strong = move.strength === 3 && !move.jab;
    if (strong && move.reach) move.reach = Math.round(move.reach * 1.2);
    if (move.pulses)
      move.pulses = move.pulses.map((p) => ({
        ...p,
        damage: normalDamage(p.damage),
        ...(strong && p.reach ? { reach: Math.round(p.reach * 1.2) } : {}),
      }));
  }
  if (move.category !== "super" || key === "super") continue;
  for (const timing of [
    "duration",
    "start",
    "end",
    "invuln",
    "expansion",
    "waveDuration",
    "movementEnd",
  ] as const) {
    if (move[timing])
      move[timing] = Math.max(10, Math.round(move[timing] / 20) * 10);
  }
  if (move.shots) move.shots = move.shots.map((t) => Math.round(t / 20) * 10);
  if (move.pulses)
    move.pulses = move.pulses.map((p) => ({
      ...p,
      at: Math.round(p.at / 20) * 10,
    }));
  move.hitstop ??= 100;
}
// Sakiko's combat timing is independent of the recorded super video's length.
for (const form of ["normal", "stage"]) {
  const move = MOVES[`mujica_6_${form}_super`];
  Object.assign(move, {
    duration: 900,
    start: 100,
    end: 690,
    hitstop: 50,
    // Compact hits must retain the damage of the formerly separated strikes.
    fixedDamage: true,
    pulses: move.pulses!.map((pulse, i) => ({ ...pulse, at: 100 + i * 250 })),
  });
}
Object.assign(MOVES.penguinSuper, {
  name: "春日影·企鹅演唱",
  duration: 1500,
  start: 50,
  end: 930,
  hitstop: 0,
  shots: [50, 230, 410, 590, 770],
  pulses: [50, 230, 410, 590, 770].map((at) => ({ at, damage: 10 })),
  speed: 650,
  lifetime: 1100,
});
for (const form of ["normal", "stage"])
  Object.assign(MOVES["mujica_7_" + form + "_super"], {
    duration: 1000,
    start: 80,
    end: 930,
    crawlSpeed: 600,
    forwardCrawl: true,
    damage: 10,
    fixedDamage: true,
    hitstop: 0,
    pulses: [100, 280, 460, 640, 820].map((at, i) => ({
      at,
      damage: 10,
      reach: 200,
      stun: 240,
      push: i === 4 ? 180 : 0,
    })),
  });
function moveList(character: number, penguin = false) {
  return Object.entries(MOVES)
    .filter(([key, move]) => {
      if (move.internal) return false;
      if (character >= 10)
        return (
          key === "throw" ||
          (move.ownerCharacter === character && move.form === "virtual")
        );
      if (isMujica(character))
        return (
          key === "throw" ||
          key === "mujicaTransform" ||
          (move.ownerCharacter === character &&
            move.form === (penguin ? "stage" : "normal"))
        );
      if (
        (move.ownerCharacter !== undefined &&
          move.ownerCharacter !== character) ||
        move.mujicaOnly
      )
        return false;
      if (character === 0)
        return (
          !move.soyoOnly && !move.tomoriOnly && !move.ranaOnly && !move.rikiOnly
        );
      if (character === 2)
        return penguin
          ? move.penguinOnly || key === "throw"
          : !move.penguinOnly &&
              (["light", "heavy", "throw"].includes(key) || move.tomoriOnly);
      if (character === 3) return move.ranaOnly || key === "throw";
      if (character === 4) return move.rikiOnly || key === "throw";
      return (
        ["light", "heavy", "special", "wave", "throw"].includes(key) ||
        (character === 1 &&
          ["summon", "heal", "soyoSuper", "soyoCutline"].includes(key))
      );
    })
    .map(([key, move]) => ({
      key,
      ...move,
      name:
        character === 1
          ? (
              {
                special: "回响终章",
                light: "轻掌·试探",
                heavy: "双掌·推拍",
              } as Record<string, string>
            )[key] || move.name
          : character === 2
            ? (
                {
                  light: "轻击·试探",
                  heavy: "重击·前行",
                  throw: penguin ? "鳍抱·摔投" : move.name,
                } as Record<string, string>
              )[key] || move.name
            : move.name,
      command:
        character !== 0 && key === "wave"
          ? "I"
          : character !== 0 && key === "throw"
            ? penguin || character >= 3
              ? "B（后投：← + B）"
              : "U（后投：← + U）"
            : move.command,
    }));
}

export {
  ROSTER,
  MOVES,
  NORMAL_BUTTONS,
  moveList,
  WORLD,
  FEEL,
  MAX_HEALTH,
  ROUND_END_TIMING,
  profileFor,
  kitFor,
  isMujica,
  chainPrefix,
  firstJab,
  verticalScale,
};
