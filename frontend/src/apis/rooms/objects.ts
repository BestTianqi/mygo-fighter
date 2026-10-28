import type { SimulationPacket } from "../../game/networkProtocol";
import type { BattleRules } from "../../game/objects/BattleRules";
import type { Format } from "../../game/objects/MatchOptions";
export interface RoomPlayer {
  character: number;
  team: number[];
  ready: boolean;
  connected: boolean;
  loaded: boolean;
}
export interface RoomView {
  code: string;
  format: Format;
  rules: BattleRules;
  arena: number;
  terrain: boolean;
  generation: number;
  players: (RoomPlayer | null)[];
  playing: boolean;
  preparing: boolean;
  draft: {
    bans: number[];
    phase: "ban" | "pick" | "complete";
    turn: number | null;
  } | null;
}
export interface SessionResponse {
  token: string;
  side: number;
  room: RoomView;
}
export interface StatePacket extends SimulationPacket {
  generation: number;
  serverUpdateMs: number;
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
