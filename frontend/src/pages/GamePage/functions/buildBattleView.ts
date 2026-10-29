import { ROSTER } from "../../../game/combatData";
import type { Match } from "../../../game/engine";
import type { GameView } from "../objects/GameView";

/** Project authoritative combat values without leaking mutable fighter objects. */
export function buildBattleView(m: Match, finishVideoMs: number | null) {
  return {
    fighters: m.fighters.map((f) => ({
      character: f.character,
      hp: f.hp,
      lifesteal: f.lifesteal ? { ...f.lifesteal } : null,
      // Display one decimal without implying an unavailable spend threshold.
      energy: Math.floor(f.energy * 10) / 10,
      combo: f.combo,
      beats: f.beats,
      transformed: !!(f.stageForm || f.penguin),
      name: f.penguin ? "凑企鹅" : ROSTER[f.character].name,
      color: ROSTER[f.character].color,
    })),
    phase: m.phase,
    paused: m.paused,
    remaining: m.remaining,
    round: m.round,
    wins: [...m.wins],
    reason: m.reason,
    winner: m.winner,
    roundEnd: m.roundEnd,
    phaseMs: m.phaseMs,
    finishVideoMs: m.roundEnd?.finisher ? finishVideoMs : null,
    teamRemaining: m.isTeamBattle ? m.teamRemaining : [1, 1],
    respawnMs: [...m.respawnMs],
    eliminated: [...m.eliminated],
  } satisfies Partial<GameView>;
}
