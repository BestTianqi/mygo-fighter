import type { Move, Pulse } from "../objects/Move";
import { createMoveRegistrar, missile } from "./createMoveRegistrar";
import { CHARACTERS } from "./roster";

export function registerSuperMoves(MOVES: Record<string, Move>): void {
  const add = createMoveRegistrar(MOVES);
  const superNames: Record<number, string> = {
    5: "练习结束后再吵",
    6: "我来成为神明",
    7: "Saki酱！Saki酱！",
    8: "从来没觉得玩乐队开心过",
    9: "完美笑容·摘下面具",
  };
  const superDurations: Record<number, number> = {
    5: 3400,
    6: 6400,
    7: 4800,
    8: 8300,
    9: 3500,
  };
  for (const c of CHARACTERS)
    for (const [i, form] of ["normal", "stage"].entries()) {
      const damages =
        c.id === 5 && !i
          ? [16, 16, 16]
          : c.id === 9 && i
            ? Array(8).fill(6)
            : [8, 12, 28];
      const duration = superDurations[c.id!];
      const pulses: Pulse[] = damages.map((damage, n) => ({
        at:
          Math.round(
            (500 + (n * (duration - 1100)) / (damages.length - 1)) / 10,
          ) * 10,
        damage,
        reach: Math.min(420, 220 + n * 100),
        stun: 400,
        push: n === damages.length - 1 ? 240 : 15,
      }));
      if (c.id === 7)
        pulses.forEach((pulse, n) => {
          pulse.at = [1000, 2600, 4200][n];
          pulse.reach = 200;
        });
      add(c.id!, form, "super", superNames[c.id!], {
        category: "super",
        duration,
        start: 500,
        end: pulses.at(-1)!.at + 90,
        invuln: 100,
        damage: 48,
        reach: 420,
        vertical: 300,
        pulses,
        ...(c.id === 7
          ? {
              crawl: true,
              crawlSpeed: 90,
              level: "low",
              reach: 200,
              vertical: 90,
            }
          : {}),
      });
    }
  for (const [key, move] of Object.entries(MOVES))
    if (move.counter && move.counterDamage) {
      move.counterAttack = key + "_counter";
      MOVES[move.counterAttack] = {
        ...missile,
        ownerCharacter: move.ownerCharacter,
        form: move.form,
        internal: true,
        duration: 0,
        start: 0,
        end: 0,
        name: move.name + "·反击",
        category: "special",
        ...(move.nyamu ? { nyamu: move.nyamu } : {}),
        ...(move.umiri ? { umiri: move.umiri } : {}),
        damage: move.counterDamage,
        chip: 0,
        stun: 340,
        push: 220,
        speed: 700,
        lifetime: 500,
      };
    }
  Object.assign(MOVES.mujica_8_stage_super, {
    name: "Mortis·双生剧场",
    mortis: "theater",
    omni: true,
    reach: 420,
    pulses: [
      { at: 500, damage: 8, reach: 420, stun: 650, pull: 90, push: 0 },
      { at: 4100, damage: 12, reach: 420, stun: 650, pull: 90, push: 0 },
      { at: 7200, damage: 28, reach: 420, stun: 650, push: 240, launch: 240 },
    ],
  });
}
