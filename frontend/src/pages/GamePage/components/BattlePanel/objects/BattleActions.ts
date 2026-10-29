import type { GameRuntime } from "../../../runtime/GameRuntime";
import type { TouchInput } from "../../../runtime/input/InputController";
export type BattleActions = Pick<
  GameRuntime,
  | "pause"
  | "restart"
  | "begin"
  | "back"
  | "showDialog"
  | "setSound"
  | "clearCutin"
> & { readonly input: TouchInput };
