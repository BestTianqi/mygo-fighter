import type { Move } from "../../../objects/Move";
import { STAGE_FORM } from "../forms";
export function registerTransformation(MOVES: Record<string, Move>): void {
  MOVES.mujicaTransform = {
    name: "登台变身",
    command: "H / 2P 小键盘7",
    category: "transformation",
    mujicaOnly: true,
    ground: true,
    cost: 50,
    duration: 0,
    start: 0,
    end: 0,
    damage: 10,
    fixedDamage: true,
    omni: true,
    reach: 220,
    vertical: 180,
    stun: 300,
    push: 150,
    chip: 2,
    hitstop: 80,
    lifetime: STAGE_FORM.duration,
  };
}
