import type { ConnectionView } from "../../../apis/rooms/objects";
import type { MatchConfig } from "../../../game/objects/MatchOptions";
import type { Presentation } from "../../../assets/objects/Assets";
import type { RoundEnd } from "../../../game/objects/RoundEnd";
export interface FighterView {
  character: number;
  hp: number;
  lifesteal: { ratio: number; ms: number } | null;
  energy: number;
  combo: number;
  beats: number;
  transformed: boolean;
  name: string;
  color: string;
}
export interface GameView {
  screen: "menu" | "selection" | "loadingBattle" | "battle";
  fighters: FighterView[];
  phase: "idle" | "ready" | "fighting" | "roundOver" | "finished";
  paused: boolean;
  remaining: number;
  round: number;
  wins: number[];
  reason: string;
  winner: number;
  roundEnd: RoundEnd | null;
  phaseMs: number;
  finishVideoMs: number | null;
  teamRemaining: number[];
  respawnMs: number[];
  eliminated: boolean[];
  config: MatchConfig | null;
  lastMove: string;
  connectionStalled: boolean;
  diagnostics: string;
  error: string;
  sound: boolean;
  network: ConnectionView;
  lobbyOpen: boolean;
  dialog: "help" | "moves" | null;
  cutins: (Presentation | null)[];
}
export const initialView: GameView = {
  screen: "menu",
  fighters: [],
  phase: "idle",
  paused: false,
  remaining: 60000,
  round: 1,
  wins: [0, 0],
  reason: "",
  winner: -1,
  roundEnd: null,
  phaseMs: 0,
  finishVideoMs: null,
  teamRemaining: [1, 1],
  respawnMs: [0, 0],
  eliminated: [false, false],
  config: null,
  lastMove: "",
  connectionStalled: false,
  diagnostics: "",
  error: "",
  sound: true,
  network: { status: "offline", room: null, side: 0, rtt: null, error: "" },
  lobbyOpen: false,
  dialog: null,
  cutins: [null, null],
};
