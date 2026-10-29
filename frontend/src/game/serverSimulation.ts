import { Match } from "./engine";
import { NetworkInputs } from "./NetworkInputs";
import { NETWORK_PROTOCOL, type Snapshot } from "./networkProtocol";
import type { Input } from "./objects/Input";
import type { MatchOptions } from "./objects/MatchOptions";

/** Runs inside a private JVM polyglot context. No DOM, Node, timers or host access. */
export function create(optionsJson: string) {
  const match = new Match(JSON.parse(optionsJson) as MatchOptions);
  const inputs = new NetworkInputs(match.playerCount);
  let time = 0,
    epoch = 0,
    eventId = 0;
  match.start();
  return {
    input(side: number, seq: number, json: string) {
      inputs.receive(side, seq, JSON.parse(json) as Input);
    },
    advance(ms: number, now = time + ms) {
      time = now;
      // Each fixed step consumes latched taps once, including catch-up batches.
      let left = Math.max(0, ms);
      while (left > 0) {
        const step = Math.min(left, 10 - match.accumulator);
        const phase = match.phase;
        inputs.advance(match, step);
        if (phase === "roundOver" && match.phase === "ready") {
          epoch++;
          inputs.clear();
        }
        left -= step;
      }
      return !match.paused && (match.phase !== "finished" || match.phaseMs > 0);
    },
    pause(value: boolean) {
      match.setPaused(value);
      inputs.clear();
      epoch++;
    },
    completeFinish(side: number, tick: number) {
      match.completeFinish(side, tick);
    },
    restart() {
      match.restart();
      inputs.clear();
      epoch++;
    },
    eventBatch() {
      const events = match.drainEvents();
      if (!events.length) return null;
      return JSON.stringify({
        epoch,
        time,
        events: events.map((event) => ({ id: ++eventId, at: time, event })),
      });
    },
    packet() {
      // Explicit fields avoid GraalJS's per-packet object-rest enumeration.
      // Snapshot makes a new serializable Match field a type error until mapped.
      const state = {
        teamIndices: match.teamIndices,
        teamCarry: match.teamCarry,
        teams: match.teams,
        seed: match.seed,
        wins: match.wins,
        round: match.round,
        phase: match.phase,
        paused: match.paused,
        elapsed: match.elapsed,
        accumulator: match.accumulator,
        winner: match.winner,
        fighters: match.fighters,
        roundEnd: match.roundEnd,
        finishReady: match.finishReady,
        remaining: match.remaining,
        waves: match.waves,
        areas: match.areas,
        freeze: match.freeze,
        inputTick: match.inputTick,
        simulationTick: match.simulationTick,
        previous: match.previous,
        aiThink: match.aiThink,
        aiGuard: match.aiGuard,
        aiGoal: match.aiGoal,
        phaseMs: match.phaseMs,
        entrySides: match.entrySides,
        reason: match.reason,
        soyoSuperId: match.soyoSuperId,
        aiStates: match.aiStates,
        respawnMs: match.respawnMs,
        eliminated: match.eliminated,
      } satisfies Snapshot;
      return JSON.stringify({
        protocol: NETWORK_PROTOCOL,
        epoch,
        tick: match.simulationTick,
        time,
        state,
        inputState: inputs.state,
      });
    },
  };
}
