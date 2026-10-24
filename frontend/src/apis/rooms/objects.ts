import type { SimulationPacket } from "../../game/networkProtocol";
export interface RoomPlayer {
  character: number;
  ready: boolean;
  connected: boolean;
}
export interface RoomView {
  code: string;
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
