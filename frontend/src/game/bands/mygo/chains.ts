import type { Move } from "../../objects/Move";
import { CHAIN as anon } from "./characters/anon/base";
import { CHAIN as rana } from "./characters/rana/base";
import { CHAIN as riki } from "./characters/riki/base";
import { CHAIN as soyo } from "./characters/soyo/base";
import { CHAIN as tomori } from "./characters/tomori/base";
import { CHAIN as penguin } from "./characters/tomori/penguin";
import { registerChain, registerJabs } from "./shared/registerChains";
const FORMS = [anon, soyo, tomori, rana, penguin, riki];
export function registerMygoJabs(MOVES: Record<string, Move>): void {
  registerJabs(MOVES, FORMS);
}
export function registerMygoChains(MOVES: Record<string, Move>): void {
  for (const form of FORMS) registerChain(MOVES, form);
}
