import type { Match } from "./engine";
import type { Input } from "./objects/Input";
import type { CombatEvent } from "./objects/CombatEvent";

export const NETWORK_PROTOCOL = 8;
export const HISTORY_MS = 2000;
export type MatchState = Pick<
  Match,
  {
    [K in keyof Match]: Match[K] extends (...args: never[]) => unknown
      ? never
      : K;
  }[keyof Match]
>;
export type Snapshot = Omit<
  MatchState,
  "options" | "events" | "isTeamBattle" | "teamRemaining"
>;
export interface InputState {
  inputs: Input[];
  pending: Input[];
  received: number[];
  applied: number[];
  seen: Record<string, number>[];
}
export interface NetworkEvent {
  id: number;
  at: number;
  event: CombatEvent;
}
export interface SimulationPacket {
  protocol: number;
  epoch: number;
  tick: number;
  time: number;
  state: Snapshot;
  events: NetworkEvent[];
  acks: number[];
  received: number[];
  inputs: Input[];
  inputState: InputState;
}
