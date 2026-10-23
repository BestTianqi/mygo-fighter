import type { Match } from "../../game/engine";
import type { CombatEvent } from "../../game/objects/CombatEvent";
import type { Input } from "../../game/objects/Input";
export interface RoomPlayer {
  character: number;
  team: number[];
  ready: boolean;
  connected: boolean;
}
export interface RoomView {
  code: string;
  format: "1v1" | "3v3";
  arena: number;
  terrain: boolean;
  generation: number;
  players: (RoomPlayer | null)[];
  playing: boolean;
  preparing: boolean;
}
export interface SessionResponse {
  token: string;
  side: number;
  room: RoomView;
}
export interface StatePacket {
  generation: number;
  state: Partial<Match> &
    Pick<Match, "fighters" | "phase" | "paused" | "inputTick">;
  events: CombatEvent[];
  acks: number[];
  inputs: Input[];
}
export type ConnectionStatus =
  | "offline"
  | "connecting"
  | "lobby"
  | "preparing"
  | "playing"
  | "reconnecting"
  | "error";
export interface ConnectionView {
  status: ConnectionStatus;
  room: RoomView | null;
  side: number;
  rtt: number | null;
  error: string;
}
