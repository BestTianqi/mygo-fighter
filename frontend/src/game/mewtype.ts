import type { Scheme } from "./objects/Scheme";
import type { Move, Pulse } from "./objects/Move";
import type { Character } from "./objects/Character";
import type { FighterIdentity } from "./objects/Fighter";
/* Yume Gendai MewType: single-form virtual costumes and owned combat data. */

const CHARACTERS: Character[] = [
  {
    id: 10,
    key: "arale",
    name: "仲町阿拉蕾",
    shortName: "阿拉蕾",
    en: "NAKAMACHI ARALE",
    color: "#f18fb8",
    role: "主唱",
    archetype: "声浪压制型",
    skill: "闪耀安可",
  },
  {
    id: 11,
    key: "ritsu",
    name: "峰月律",
    shortName: "律",
    en: "MINETSUKI RITSU",
    color: "#6b9de8",
    role: "吉他",
    archetype: "蓝熊防反型",
    skill: "极光熊奏",
  },
  {
    id: 12,
    key: "miyako",
    name: "藤都子",
    shortName: "都子",
    en: "FUJI MIYAKO",
    color: "#b894db",
    role: "键盘",
    archetype: "漫画机关型",
    skill: "终章跨页",
  },
  {
    id: 13,
    key: "yuno",
    name: "千石由乃",
    shortName: "由乃",
    en: "SENGOKU YUNO",
    color: "#ee79c8",
    role: "DJ",
    archetype: "节拍控场型",
    skill: "最高のバンド·世界へ",
  },
  {
    id: 14,
    key: "nonoka",
    name: "宫永野乃花",
    shortName: "野乃花",
    en: "MIYANAGA NONOKA",
    color: "#a7d7c3",
    role: "吉他",
    archetype: "兔食者追击型",
    skill: "不会放开由乃亲",
  },
].map((c) => ({
  ...c,
  band: "mewtype",
  stageName: c.shortName,
  description: `以${c.role}演奏虚拟舞台的节奏，${c.archetype}招式展现各自个性。`,
  specialType: "虚拟舞台",
  speed: 345,
  jump: 620,
  lightReach: 115,
  heavyReach: 155,
  heavyDamage: 16,
  specialReach: 190,
}));
const MOVES: Record<string, Move> = {};
const formFor = () => "virtual";
const prefixFor = (f: FighterIdentity) => `mewtype_${f.character}_virtual`;
const normalFor = (f: FighterIdentity, button: string, stance = "standing") =>
  `${prefixFor(f)}_${stance === "standing" ? "" : stance + "_"}${button}`;
const schemeFor = (f: FighterIdentity): Scheme => ({
  base: ["u", "i", "o"].map((slot) => `${prefixFor(f)}_${slot}`),
  super: `${prefixFor(f)}_super`,
  variants: {
    down1: `${prefixFor(f)}_wave`,
    ...(f.character === 13 ? { down2: `${prefixFor(f)}_guard` } : {}),
    ...(f.character === 14 ? { down2: `${prefixFor(f)}_comfort` } : {}),
  },
});
const normalNames: Record<number, string[]> = {
  10: ["扩音点拍", "抬肘应援", "高音上挑", "扩音重唱"],
  11: ["蓝熊探弦", "蓝熊肘击", "熊爪上勾", "琴身重拍"],
  12: ["笔尖点墨", "翻页横挥", "分镜挑笔", "分镜侧踢"],
  13: ["指尖切拍", "搓盘回旋", "推盘升拍", "唱片重落"],
  14: ["兔爪轻拨", "跃兔直拳", "琴颈上挑", "兔耳重扫"],
};
for (const c of CHARACTERS) {
  const prefix = prefixFor({ character: c.id! });
  for (const [stanceIndex, stance] of (
    ["standing", "crouch", "air"] as const
  ).entries())
    for (const [i, button] of ["light", "heavy"].entries()) {
      MOVES[normalFor({ character: c.id! }, button, stance)] = {
        ownerCharacter: c.id,
        form: "virtual",
        name:
          (stance === "standing"
            ? ""
            : stance === "crouch"
              ? "低位·"
              : "空中·") + normalNames[c.id!][i ? 3 : 0],
        command:
          (stance === "standing"
            ? ""
            : stance === "crouch"
              ? "↓＋"
              : "空中＋") + (i ? "K" : "J"),
        visualSlot:
          stance === "standing"
            ? i
              ? "heavy"
              : "jab-1"
            : stance + "-" + button,
        category: "normal",
        stance,
        normalIndex: stanceIndex * 6 + (i ? 2 : 0),
        strength: i ? 3 : 1,
        duration: i ? 500 : 300,
        start: i ? 160 : 80,
        end: i ? 240 : 130,
        damage: (i ? 16 : 8) - (stanceIndex ? 1 : 0),
        reach: i ? 155 : 115,
        vertical: stance === "crouch" && i ? 170 : 105,
        level:
          stance === "air" ? "high" : stance === "crouch" && !i ? "low" : "mid",
        stun: i ? 340 : 270,
        push: i ? 220 : 160,
        jab: !i && stance === "standing",
      };
    }
  for (const chain of [2, 3])
    MOVES[prefix + "Jab" + chain] = {
      ...MOVES[prefix + "_light"],
      internal: true,
      chain,
      name: normalNames[c.id!][chain - 1],
      visualSlot: "jab-" + chain,
      duration: chain === 2 ? 320 : 450,
      start: chain === 2 ? 80 : 130,
      end: chain === 2 ? 150 : 200,
      normalIndex: chain - 1,
      strength: chain,
      damage: chain === 2 ? 10 : 17,
      reach: chain === 2 ? 150 : 175,
      stun: chain === 2 ? 300 : 480,
      push: chain === 2 ? 180 : 350,
      launch: chain === 3 ? 350 : 0,
    };
}
function add(
  id: number,
  slot: "u" | "i" | "o" | "super",
  name: string,
  extra: Partial<Move> = {},
) {
  const key = `mewtype_${id}_virtual_${slot}`;
  MOVES[key] = {
    ownerCharacter: id,
    form: "virtual",
    slot,
    visualSlot: slot === "super" ? "super" : "skill-" + slot,
    name,
    command: { u: "U", i: "I", o: "O", super: "P" }[slot],
    category: "special",
    ground: true,
    cost: { u: 20, i: 25, o: 30, super: 100 }[slot],
    duration: 600,
    start: 160,
    end: 240,
    damage: slot === "o" ? 22 : 16,
    stun: 320,
    push: 150,
    reach: 190,
    vertical: 170,
    ...extra,
  };
  return key;
}
const missile = {
  projectile: true,
  speed: 520,
  lifetime: 1100,
  height: 100,
  radiusX: 24,
  radiusY: 45,
};
add(10, "u", "糖果声浪", missile);
add(10, "i", "应援叠唱", {
  ...missile,
  damage: 8,
  shots: [160, 330],
  end: 350,
  duration: 650,
  radiusY: 65,
});
add(10, "o", "全场跟唱", { omni: true, reach: 210, vertical: 210, push: 360 });
add(11, "u", "真丢人·蓝熊拨弦", { reach: 240, vertical: 210 });
const counter = add(11, "i", "不害臊吗·熊抱守拍", {
  category: "defense",
  counter: true,
  counterAttack: "mewtype_11_virtual_counter",
  start: 120,
  end: 300,
  duration: 600,
  damage: 0,
  recast: 4000,
});
MOVES.mewtype_11_virtual_counter = {
  ...missile,
  ownerCharacter: 11,
  form: "virtual",
  internal: true,
  duration: 0,
  start: 0,
  end: 0,
  name: MOVES[counter].name + "·反击",
  category: "special",
  damage: 18,
  chip: 0,
  stun: 340,
  push: 220,
  speed: 700,
  lifetime: 500,
};
add(11, "o", "弱弱胃袋·破蓝重奏", {
  damage: 25,
  movement: 220,
  movementEnd: 300,
  start: 210,
  end: 340,
  reach: 175,
});
add(12, "u", "分镜飞页", {
  ...missile,
  height: 135,
  projectileVy: 230,
  projectileGravity: 580,
});
add(12, "i", "伏笔机关", {
  delayedArea: true,
  damage: 24,
  warning: 600,
  areaRadius: 115,
  recast: 4000,
  duration: 450,
  start: 120,
  end: 140,
});
add(12, "o", "截稿线", { reach: 350, pull: 100 });
add(13, "u", "迈向世界·双重低音", {
  ...missile,
  yuno: "bass",
  damage: 8,
  shots: [120, 300],
  start: 120,
  end: 320,
  duration: 650,
  speed: 620,
  push: 80,
  groundShock: true,
  level: "low",
  height: 40,
  radiusY: 30,
});
add(13, "i", "放开我·拒绝贴贴", {
  yuno: "release",
  omni: true,
  damage: 14,
  reach: 225,
  vertical: 200,
  movement: -130,
  movementEnd: 220,
  start: 120,
  end: 190,
  duration: 580,
  push: 420,
  stun: 450,
  recast: 1800,
});
add(13, "o", "supremacy·海边重奏", {
  yuno: "seaside",
  delayedArea: true,
  damage: 22,
  warning: 500,
  areaRadius: 135,
  reach: 420,
  vertical: 240,
  stun: 650,
  push: 60,
  start: 160,
  end: 180,
  duration: 480,
  recast: 3200,
});
MOVES.mewtype_13_virtual_guard = {
  ownerCharacter: 13,
  form: "virtual",
  yuno: "band",
  name: "最棒的乐队·合奏屏障",
  command: "↓＋I",
  slot: "i",
  visualSlot: "skill-i",
  ground: true,
  cost: 25,
  category: "defense",
  durability: 24,
  lifetime: 2000,
  recast: 6000,
  damage: 0,
  duration: 400,
  start: 120,
  end: 140,
};
add(14, "u", "抱抱还是亲亲·强制手当", {
  nonoka: "hug",
  category: "throw",
  damage: 14,
  reach: 110,
  movement: 70,
  movementEnd: 140,
  start: 160,
  end: 230,
  duration: 700,
  stun: 600,
  push: 40,
  recast: 2000,
});
add(14, "i", "海边搜寻·找到由乃亲", {
  nonoka: "search",
  damage: 18,
  movement: 300,
  movementEnd: 300,
  start: 200,
  end: 340,
  duration: 700,
  reach: 165,
  recast: 1600,
});
add(14, "o", "金枪鱼小黑·认真一拳", {
  nonoka: "tuna",
  damage: 24,
  reach: 240,
  vertical: 210,
  start: 230,
  end: 330,
  duration: 740,
  stun: 400,
  push: 300,
  launch: 160,
  knockdown: 450,
  recast: 1800,
});
MOVES.mewtype_14_virtual_comfort = {
  ownerCharacter: 14,
  form: "virtual",
  nonoka: "comfort",
  name: "我没事哦·元气护身",
  slot: "i",
  visualSlot: "skill-u",
  command: "↓＋I",
  category: "defense",
  ground: true,
  cost: 25,
  damage: 0,
  durability: 24,
  lifetime: 1800,
  recast: 6000,
  start: 140,
  end: 170,
  duration: 450,
};
// A shared down-U command adds ranged options without replacing the three base skills.
for (const wave of [
  {
    id: 10,
    name: "心糖扩音波",
    damage: 14,
    speed: 600,
    radiusX: 34,
    radiusY: 48,
    maxReach: 850,
    start: 170,
    duration: 640,
  },
  {
    id: 11,
    name: "蓝熊弦压波",
    damage: 16,
    speed: 700,
    radiusX: 30,
    radiusY: 42,
    maxReach: 780,
    start: 190,
    duration: 660,
  },
  {
    id: 12,
    name: "墨线分镜波",
    damage: 15,
    speed: 640,
    radiusX: 32,
    radiusY: 44,
    maxReach: 820,
    start: 170,
    duration: 620,
  },
  {
    id: 13,
    name: "迈向世界·混音声波",
    damage: 14,
    speed: 560,
    radiusX: 28,
    radiusY: 60,
    maxReach: 780,
    start: 210,
    duration: 680,
  },
  {
    id: 14,
    name: "兔食者·咬咬波",
    damage: 13,
    speed: 760,
    radiusX: 26,
    radiusY: 36,
    maxReach: 900,
    start: 160,
    duration: 600,
  },
]) {
  const { id, ...spec } = wave;
  MOVES[`${prefixFor({ character: id })}_wave`] = {
    ...missile,
    ownerCharacter: id,
    form: "virtual",
    slot: "u",
    visualSlot: "skill-u",
    command: "↓＋U",
    category: "special",
    ground: true,
    cost: 20,
    height: 100,
    lifetime: 1500,
    chip: 2,
    stun: 320,
    push: 150,
    ...spec,
    ...(id === 14 ? { nonoka: "bite" as const } : {}),
    ...(id === 13 ? { yuno: "wave" as const } : {}),
    end: spec.start + 80,
  };
}
const superNames: Record<number, string> = {
  10: "U咩哇帕瓦",
  11: "杂鱼～杂鱼～",
  12: "临兵斗者皆阵列在前",
  13: "最高のバンド·世界へ",
  14: "兔食者·不会放开由乃亲",
};
const superDurations: Record<number, number> = {
  10: 3000,
  11: 3100,
  12: 11500,
  13: 2800,
  14: 5150,
};
for (const c of CHARACTERS) {
  const duration = superDurations[c.id!];
  const damages =
    c.id === 14
      ? Array(6).fill(8)
      : c.id === 12
        ? [...Array(8).fill(5), 10]
        : [8, 12, 28];
  const pulses: Pulse[] = damages.map((damage, i) => ({
    at:
      Math.round((500 + (i * (duration - 1100)) / (damages.length - 1)) / 10) *
      10,
    damage,
    reach: Math.min(420, 220 + i * 100),
    stun: 400,
    push: i === damages.length - 1 ? 240 : 15,
    ...(c.id === 12 ? { glyph: "临兵斗者皆阵列在前"[i] } : {}),
  }));
  if (c.id === 11) {
    pulses.forEach((pulse, i) => (pulse.reach = [240, 300, 360][i]));
    pulses.at(-1)!.launch = 360;
  }
  add(c.id!, "super", superNames[c.id!], {
    category: "super",
    duration,
    start: 500,
    end: pulses.at(-1)!.at + 90,
    damage: 48,
    invuln: 100,
    reach: 420,
    vertical: 300,
    pulses,
    ...(c.id === 10
      ? {
          projectile: true,
          shots: pulses.map((p) => p.at),
          speed: 600,
          lifetime: 600,
          height: 100,
          radiusX: 32,
          radiusY: 250,
        }
      : {}),
    ...(c.id === 12
      ? {
          damage: 50,
          targetArea: true,
          targetLock: true,
          areaRadius: 210,
          fixedDamage: true,
          damageReduction: 0.8,
          invuln: 0,
          hitstop: 40,
        }
      : {}),
    ...(c.id === 14 ? { nonoka: "eater" as const } : {}),
    ...(c.id === 13 ? { yuno: "world" as const } : {}),
  });
  if (c.id === 13) MOVES[`mewtype_${c.id}_virtual_super`].omni = true;
}
export { CHARACTERS, MOVES, schemeFor, prefixFor, normalFor, formFor };
