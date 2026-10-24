import { NetworkInputs } from "./NetworkInputs";
import { HISTORY_MS, type SimulationPacket } from "./networkProtocol";
import type { Match } from "./engine";
import type { Input } from "./objects/Input";

interface RecordedInput {
  seq: number;
  at: number;
  tick: number;
  input: Input;
}
/** Bounded replay of the same two-body simulation. Presentation never feeds back into physics. */
export class Prediction {
  private history: RecordedInput[] = [];
  private inputs = new NetworkInputs();
  private packet: SimulationPacket | null = null;
  private receivedAt = 0;
  private predictedAt = 0;
  private epoch = -1;
  private rtt = 0;
  private exhausted = false;
  reset() {
    this.history = [];
    this.inputs = new NetworkInputs();
    this.packet = null;
    this.predictedAt = 0;
    this.epoch = -1;
    this.exhausted = false;
  }
  get horizon() {
    return Math.min(250, Math.max(100, this.rtt + 50));
  }
  stale(now: number) {
    return (
      !this.packet || this.exhausted || now - this.receivedAt > this.horizon
    );
  }
  record(match: Match, side: number, seq: number, input: Input, now: number) {
    const value = structuredClone(input);
    this.history.push({
      seq,
      input: value,
      at: now,
      tick: match.simulationTick + 1,
    });
    this.inputs.receive(side, seq, value);
    if (this.history.length > 600 || now - this.history[0].at > HISTORY_MS) {
      this.history = [];
      this.exhausted = true;
    }
  }
  receive(
    match: Match,
    packet: SimulationPacket,
    side: number,
    now: number,
    rtt: number,
  ) {
    const reset = this.epoch !== packet.epoch;
    this.rtt = Math.max(0, rtt);
    const priorTick = reset ? packet.tick : match.simulationTick;
    this.history = reset
      ? []
      : this.history.filter((e) => e.seq > packet.acks[side]);
    if (this.history.some((e) => now - e.at > HISTORY_MS)) this.history = [];
    this.packet = packet;
    this.receivedAt = this.predictedAt = now;
    this.epoch = packet.epoch;
    this.exhausted = false;
    // Clone before prediction: authoritative HUD values must never be mutated by replay.
    const state = structuredClone(packet.state);
    const fighters = match.fighters;
    Object.assign(match, state);
    match.fighters = state.fighters.map((f, i) =>
      Object.assign(fighters[i], f),
    );
    match.events = [];
    this.inputs.state = structuredClone(packet.inputState);
    if (!reset && !match.paused) {
      const target = Math.min(
        packet.tick + Math.floor(this.horizon / 10),
        Math.max(priorTick, packet.tick + Math.floor(this.rtt / 20)),
      );
      for (let tick = packet.tick + 1; tick <= target; tick++) {
        for (const e of this.history)
          if (e.tick <= tick && e.seq > this.inputs.state.received[side])
            this.inputs.receive(side, e.seq, e.input);
        this.inputs.advance(match, 10 - match.accumulator);
      }
    }
    // A just-sent input may lie beyond the replay target; retain it for the next predicted step.
    for (const e of this.history)
      if (e.seq > this.inputs.state.received[side])
        this.inputs.receive(side, e.seq, e.input);
    match.drainEvents();
    return reset;
  }
  advance(match: Match, now: number, dt: number) {
    if (this.stale(now) || match.paused) return;
    // Bound work even after a background-tab stall.
    let remaining = Math.min(50, dt, Math.max(0, now - this.predictedAt));
    this.predictedAt = now;
    while (remaining > 0) {
      const step = Math.min(remaining, 10 - match.accumulator);
      this.inputs.advance(match, step);
      remaining -= step;
    }
    match.drainEvents();
  }
}
