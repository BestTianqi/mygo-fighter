import type { Move } from "../../objects/Move";
import type { Scheme } from "../../objects/Scheme";

/** Backward U/I/O are explicit ranged commands in every character's scheme. */
export function withBackSkills(scheme: Scheme, prefix: string): Scheme {
  return {
    ...scheme,
    variants: {
      ...scheme.variants,
      back1: `${prefix}_back1`,
      back2: `${prefix}_back2`,
      back3: `${prefix}_back3`,
    },
  };
}

/** Each band supplies its own authored art/media sources and ownership flags. */
export function registerBackSkills(
  moves: Record<string, Move>,
  character: number,
  prefix: string,
  sources: [string, string, string],
  ownership: Partial<Move> = {},
): void {
  const names = ["轻音波", "重音波", "抛射"];
  for (let index = 0; index < 3; index++) {
    const lob = index === 2;
    moves[`${prefix}_back${index + 1}`] = {
      ...ownership,
      ownerCharacter: character,
      name: `${moves[sources[index]].name}·${names[index]}`,
      command: `后＋${["U", "I", "O"][index]}`,
      category: "special",
      slot: ["u", "i", "o"][index],
      visualSlot: `skill-${["u", "i", "o"][index]}`,
      visualBase: sources[index],
      backSkill: lob ? "lob" : index ? "heavy" : "quick",
      ground: true,
      projectile: true,
      cost: [15, 20, 25][index],
      damage: [12, 16, 18][index],
      duration: [480, 620, 660][index],
      start: [120, 180, 210][index],
      end: [150, 210, 240][index],
      speed: [700, 560, 500][index],
      maxReach: [650, 800, 720][index],
      lifetime: 1500,
      height: 110,
      radiusX: [22, 34, 26][index],
      radiusY: [40, 65, 34][index],
      stun: [220, 300, 320][index],
      push: [110, 140, 180][index],
      chip: index ? 2 : 1,
      recast: [500, 900, 1100][index],
      ...(lob
        ? { projectileVy: 180, projectileGravity: 300, knockdown: 350 }
        : {}),
    };
  }
}
