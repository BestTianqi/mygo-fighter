import { FEEL } from "../../../data/rules";
import type { Move } from "../../../objects/Move";
export interface ChainSpec {
  prefix: string;
  source: string;
  names: readonly [string, string];
  secondNormalIndex: number;
  ownership: Partial<
    Pick<
      Move,
      | "anonOnly"
      | "soyoOnly"
      | "tomoriOnly"
      | "ranaOnly"
      | "rikiOnly"
      | "penguinOnly"
    >
  >;
}
/** Jab flags are applied before the shared movement scaling pass. */
export function registerJabs(
  MOVES: Record<string, Move>,
  forms: readonly ChainSpec[],
): void {
  for (const key of new Set(forms.map((form) => form.source)))
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
}
/** Follow-ups clone already-scaled normals; authored names and variants belong to the form. */
export function registerChain(
  MOVES: Record<string, Move>,
  form: ChainSpec,
): void {
  const source = MOVES[form.source];
  for (const chain of [2, 3])
    MOVES[form.prefix + "Jab" + chain] = {
      ...source,
      internal: true,
      chain,
      name: (chain === 2 ? "二段·" : "三段·") + form.names[chain - 2],
      duration: chain === 2 ? 320 : 450,
      start: chain === 2 ? 80 : 130,
      end: chain === 2 ? 150 : 200,
      jab: true,
      reach: (chain === 2 ? 47 : 51) * FEEL.scale,
      normalIndex: chain === 2 ? form.secondNormalIndex : chain - 1,
      strength: chain,
      damage: chain === 2 ? 10 : 17,
      stun: chain === 2 ? 300 : 480,
      push: (chain === 2 ? 65 : 145) * FEEL.scale,
      launch: chain === 3 ? 220 * FEEL.scale : 0,
      anonOnly: false,
      soyoOnly: false,
      tomoriOnly: false,
      ranaOnly: false,
      rikiOnly: false,
      penguinOnly: false,
      ...form.ownership,
    };
}
