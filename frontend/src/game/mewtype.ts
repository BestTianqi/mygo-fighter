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
    skill: "全域Drop",
  },
  {
    id: 14,
    key: "nonoka",
    name: "宫永野乃花",
    shortName: "野乃花",
    en: "MIYANAGA NONOKA",
    color: "#a7d7c3",
    role: "吉他",
    archetype: "跃兔连击型",
    skill: "虹兔疾奏",
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
  variants: {},
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
const combo = (damages: number[], interval = 160) => ({
  duration: 120 + interval * (damages.length - 1) + 360,
  start: 120,
  end: 200 + interval * (damages.length - 1),
  pulses: damages.map((damage, i) => ({
    at: 120 + i * interval,
    damage,
    reach: 200,
    stun: 330,
    push: i === damages.length - 1 ? 220 : 25,
  })),
});
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
add(13, "u", "怎么先走·低频唱片", {
  ...missile,
  groundShock: true,
  level: "low",
  height: 40,
  radiusY: 30,
});
add(13, "i", "有惊无险·节拍屏障", {
  category: "defense",
  durability: 24,
  lifetime: 2000,
  recast: 6000,
  damage: 0,
  duration: 400,
  start: 120,
  end: 140,
});
add(13, "o", "真不敢信·混音过门", combo([6, 6, 10]));
add(14, "u", "完成了·兔耳扫弦", combo([8, 8]));
add(14, "i", "头像通缉·跃兔滑奏", {
  movement: 240,
  movementEnd: 300,
  start: 200,
  end: 330,
  reach: 165,
});
add(14, "o", "病娇野乃·跳拍尾奏", {
  hop: 380,
  movement: 100,
  movementEnd: 300,
  duration: 750,
  start: 300,
  end: 540,
  vertical: 230,
  level: "high",
});
const superNames: Record<number, string> = {
  10: "U咩哇帕瓦",
  11: "杂鱼～杂鱼～",
  12: "临兵斗者皆阵列在前",
  13: "不要丢下我",
  14: "病娇国王",
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
  });
  if (c.id === 13) MOVES[`mewtype_${c.id}_virtual_super`].omni = true;
}
export { CHARACTERS, MOVES, schemeFor, prefixFor, normalFor, formFor };
