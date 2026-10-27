import type { Move } from "../../objects/Move";

// Deliberately NOT imported by bands/index.ts. This factory prepares an offline
// skill pack; the caller supplies IDs only when the band is eventually added.
export const POPPINPARTY_KEYS = [
  "kasumi",
  "tae",
  "rimi",
  "saaya",
  "arisa",
] as const;
export type PoppinPartyKey = (typeof POPPINPARTY_KEYS)[number];

export const POPPINPARTY_ACTIONS: Record<
  PoppinPartyKey,
  {
    j: [string, string, string];
    k: string;
    entry: string;
    finish: string;
  }
> = {
  kasumi: {
    j: [
      "右手短拨弦，前脚探步",
      "转肩反向扫弦，左脚跟进",
      "举起琴颈后向前下扫，星屑收束",
    ],
    k: "重心后移后踏步大扫弦，红色星形琴身随身转动",
    entry: "轻跳落地，扶正星形吉他，笑着举手招呼",
    finish: "红色星形吉他举起，夜空与五色舞台灯从立绘背后展开",
  },
  tae: {
    j: [
      "右手短促拨弦，蓝色细弧前送",
      "左手滑品，侧身反拨",
      "跨步扫弦，琴颈上挑后回正",
    ],
    k: "长发随转身甩动，双手压住吉他打出宽幅和弦",
    entry: "侧耳听音，轻拨一弦，再抬眼望向对手",
    finish: "蓝色吉他长音化成平行弦线，练习室窗光与蓝色聚光灯铺开",
  },
  rimi: {
    j: [
      "指尖轻拨低音弦，身体略微前倾",
      "换指连续勾弦，向前小迈一步",
      "双脚站稳，掌根闷弦，低音圆环前推",
    ],
    k: "抱稳贝斯后向前重拨，粉色低频波随重心推进",
    entry: "抱着贝斯深呼吸，从害羞低头转为坚定抬头",
    finish: "粉色贝斯与巧克力螺旋面包的暖色剪影，面包店橱窗和舞台光扩展背景",
  },
  saaya: {
    j: [
      "右鼓棒斜下敲击",
      "左鼓棒反手横敲，右棒收回",
      "双棒交叉后向前合击，金色鼓点炸开",
    ],
    k: "双棒举过肩膀，踏步同时下击，形成宽鼓面波纹",
    entry: "转动鼓棒，交叉敲两拍，微笑站稳",
    finish: "双棒交叉定格，金色鼓面圆环与面包店暖灯展开",
  },
  arisa: {
    j: [
      "右手点按短键，推出一枚方形音符",
      "左手横移连按，身体侧转",
      "双手向前压下和弦，矩形键阵合拢",
    ],
    k: "抬起一手后重压琴键，紫色宽键幕向前拍出",
    entry: "抱臂轻哼，抬手唤出紫色琴键，整理站姿",
    finish: "紫色键盘音阶与流星堂仓库练习空间展开，表情嘴硬而自信",
  },
};

const shot: Partial<Move> = {
  projectile: true,
  speed: 680,
  lifetime: 1300,
  maxReach: 850,
  height: 100,
  radiusX: 34,
  radiusY: 110,
  projectileRadiusY: 110,
  stun: 280,
  push: 150,
};
const sequence = (
  damages: number[],
  reach: number,
  start = 140,
  interval = 130,
): Partial<Move> => ({
  start,
  end: start + (damages.length - 1) * interval + 80,
  duration: start + (damages.length - 1) * interval + 380,
  damage: damages.reduce((sum, d) => sum + d, 0),
  pulses: damages.map((damage, i) => ({
    at: start + interval * i,
    damage,
    reach,
    stun: i === damages.length - 1 ? 400 : 320,
    push: i === damages.length - 1 ? 230 : 0,
  })),
});

export function createPoppinPartyMoves(
  owners: Record<PoppinPartyKey, number>,
): Record<string, Move> {
  const ids = POPPINPARTY_KEYS.map((key) => owners[key]);
  if (
    ids.some((id) => !Number.isInteger(id) || id < 0) ||
    new Set(ids).size !== ids.length
  )
    throw new Error(
      "Poppin'Party needs five distinct nonnegative character IDs",
    );
  const moves: Record<string, Move> = {};
  const add = (
    who: PoppinPartyKey,
    slot: string,
    name: string,
    patch: Partial<Move>,
  ) => {
    moves[`poppinparty_${who}_${slot}`] = {
      name,
      ownerCharacter: owners[who],
      form: "normal",
      category: "special",
      command: slot.toUpperCase(),
      slot,
      visualSlot: `skill-${slot}`,
      start: 160,
      end: 240,
      duration: 640,
      damage: 20,
      cost: 20,
      reach: 260,
      vertical: 280,
      stun: 320,
      push: 180,
      hitstop: 55,
      recast: 2200,
      fixedDamage: patch.category === "super",
      ...patch,
    };
  };
  for (const who of POPPINPARTY_KEYS) {
    for (const [i, damage] of [5, 6, 8].entries())
      add(who, `j${i + 1}`, POPPINPARTY_ACTIONS[who].j[i], {
        category: "normal",
        command: "J",
        slot: "light",
        cost: 0,
        recast: 0,
        damage,
        start: i === 2 ? 130 : 80,
        end: i === 2 ? 210 : 150,
        duration: i === 2 ? 530 : 400,
        reach: 200,
        vertical: 240,
        stance: "standing",
        visualSlot: `jab-${i + 1}`,
        chain: i + 1,
        normalIndex: i,
        strength: i + 1,
        jab: i === 0,
        internal: i > 0,
        stun: i === 2 ? 400 : 280,
        push: i === 2 ? 240 : 45,
      });
    add(who, "k", POPPINPARTY_ACTIONS[who].k, {
      category: "normal",
      command: "K",
      slot: "heavy",
      cost: 0,
      recast: 0,
      damage: 13,
      start: 180,
      end: 270,
      duration: 620,
      reach: 240,
      vertical: 280,
      strength: 3,
      stun: 400,
      push: 260,
      visualSlot: "heavy",
    });
    const themes = {
      kasumi: "星光",
      tae: "蓝弦",
      rimi: "低音",
      saaya: "鼓点",
      arisa: "琴键",
    };
    add(who, "backu", `${themes[who]}·短波`, {
      ...shot,
      command: "后退＋U",
      slot: "u",
      visualSlot: "skill-u",
      backSkill: "quick",
      damage: 16,
      cost: 20,
      recast: 1700,
    });
    add(who, "backi", `${themes[who]}·重波`, {
      ...shot,
      command: "后退＋I",
      slot: "i",
      visualSlot: "skill-i",
      backSkill: "heavy",
      damage: 24,
      cost: 30,
      speed: 480,
      radiusX: 55,
      start: 230,
      end: 310,
      duration: 760,
      push: 260,
      recast: 2600,
    });
    add(who, "backo", `${themes[who]}·抛射`, {
      ...shot,
      command: "后退＋O",
      slot: "o",
      visualSlot: "skill-o",
      backSkill: "lob",
      damage: 20,
      cost: 25,
      speed: 420,
      height: 120,
      projectileVy: 380,
      projectileGravity: 650,
      lifetime: 1700,
      maxReach: 700,
      recast: 2400,
    });
  }

  add("kasumi", "u", "闪闪发光·星形拨片", { ...shot, damage: 18, speed: 760 });
  add("kasumi", "i", "心动追星", {
    ...sequence([10, 14], 280, 170, 160),
    cost: 25,
    movement: 140,
    movementEnd: 160,
    recast: 2700,
  });
  add("kasumi", "o", "星之鼓动", {
    ...sequence([8, 8, 8], 300, 150, 170),
    omni: true,
    cost: 30,
    recast: 3200,
  });
  add("kasumi", "p", "我们的星之鼓动", {
    ...sequence([10, 10, 10, 10, 10], 520, 120, 170),
    category: "super",
    cost: 100,
    omni: true,
    vertical: 340,
    recast: 0,
  });

  add("tae", "u", "蓝弦双拨", {
    ...shot,
    damage: 9,
    shots: [130, 260],
    start: 130,
    end: 310,
    duration: 650,
    speed: 820,
  });
  add("tae", "i", "滑音疾走", {
    ...sequence([8, 8, 10], 270, 150, 140),
    movement: 110,
    movementEnd: 140,
    cost: 25,
    recast: 2800,
  });
  add("tae", "o", "兔耳上行音阶", {
    damage: 26,
    cost: 30,
    reach: 230,
    vertical: 360,
    launch: 360,
    knockdown: 400,
    start: 170,
    end: 250,
    recast: 3200,
  });
  add("tae", "p", "花园电吉他", {
    ...shot,
    category: "super",
    cost: 100,
    damage: 10,
    shots: [100, 260, 420, 580, 740],
    start: 100,
    end: 800,
    duration: 1140,
    speed: 850,
    radiusX: 50,
    radiusY: 150,
    projectileRadiusY: 150,
    recast: 0,
  });

  add("rimi", "u", "巧克力螺旋面包", {
    ...shot,
    damage: 20,
    speed: 460,
    projectileVy: 230,
    projectileGravity: 400,
    lifetime: 1700,
    radiusX: 42,
  });
  add("rimi", "i", "闷弦低鸣", {
    ...sequence([11, 13], 290, 170, 180),
    cost: 25,
    level: "low",
    recast: 2800,
  });
  add("rimi", "o", "我也要向前一步", {
    damage: 26,
    cost: 30,
    reach: 290,
    movement: 90,
    movementEnd: 150,
    start: 190,
    end: 270,
    push: 340,
    knockdown: 400,
    recast: 3300,
  });
  add("rimi", "p", "巧克力低音交响", {
    ...sequence([10, 10, 10, 10, 10], 500, 140, 160),
    category: "super",
    cost: 100,
    omni: true,
    vertical: 340,
    recast: 0,
  });

  add("saaya", "u", "双棒切分", {
    ...shot,
    damage: 10,
    shots: [120, 280],
    start: 120,
    end: 340,
    duration: 680,
  });
  add("saaya", "i", "这一拍由我接住", {
    category: "defense",
    counter: true,
    counterAttack: "poppinparty_saaya_counter",
    damage: 0,
    cost: 25,
    start: 80,
    end: 420,
    duration: 720,
    recast: 4200,
  });
  add("saaya", "counter", "返拍鼓波", {
    ...shot,
    internal: true,
    slot: "i",
    visualSlot: "skill-i",
    cost: 0,
    damage: 26,
    speed: 900,
    radiusX: 65,
    push: 300,
    recast: 0,
  });
  add("saaya", "o", "守住节拍", {
    category: "defense",
    damage: 0,
    cost: 30,
    durability: 30,
    lifetime: 3000,
    start: 130,
    end: 210,
    duration: 540,
    recast: 5000,
  });
  add("saaya", "p", "为你敲响的鼓动", {
    ...sequence([8, 8, 8, 8, 8, 10], 460, 100, 140),
    category: "super",
    cost: 100,
    omni: true,
    vertical: 340,
    recast: 0,
  });

  add("arisa", "u", "别擅自开始啊", {
    ...shot,
    damage: 18,
    speed: 720,
    radiusX: 50,
  });
  add("arisa", "i", "仓库练习·落键", {
    delayedArea: true,
    warning: 380,
    areaRadius: 170,
    damage: 25,
    cost: 25,
    start: 150,
    end: 230,
    duration: 610,
    stun: 650,
    push: 0,
    recast: 3200,
  });
  add("arisa", "o", "才没有担心你", {
    damage: 24,
    cost: 30,
    omni: true,
    reach: 300,
    start: 160,
    end: 240,
    push: 380,
    stun: 420,
    recast: 3000,
  });
  add("arisa", "p", "流星堂·全键齐奏", {
    ...sequence([10, 10, 10, 10, 10], 420, 120, 160),
    category: "super",
    cost: 100,
    targetArea: true,
    areaRadius: 220,
    vertical: 340,
    recast: 0,
  });
  return moves;
}
