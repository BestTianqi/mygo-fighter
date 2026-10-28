import { actions, type Input } from "./objects/Input";
import type { InputState } from "./networkProtocol";
import type { Match } from "./engine";

/** Shared press latching for authority and replay. A receipt is not an applied acknowledgement. */
export class NetworkInputs {
  state: InputState;
  constructor(playerCount = 2) {
    this.state = {
      inputs: Array.from({ length: playerCount }, () => ({})),
      pending: Array.from({ length: playerCount }, () => ({})),
      received: Array(playerCount).fill(-1),
      applied: Array(playerCount).fill(-1),
      seen: Array.from({ length: playerCount }, () => ({})),
    };
  }
  receive(side: number, seq: number, input: Input) {
    const s = this.state;
    if (
      !Number.isInteger(side) ||
      side < 0 ||
      side >= s.inputs.length ||
      seq <= s.received[side]
    )
      return;
    for (const action of actions) {
      if (
        (input[action] && !s.inputs[side][action]) ||
        (input.pressIds?.[action] ?? 0) > (s.seen[side][action] ?? 0)
      )
        s.pending[side][action] = true;
      s.seen[side][action] = Math.max(
        s.seen[side][action] ?? 0,
        input.pressIds?.[action] ?? 0,
      );
    }
    s.inputs[side] = input;
    s.received[side] = seq;
  }
  advance(match: Match, ms: number) {
    const before = match.inputTick,
      s = this.state;
    match.advance(
      ms,
      { ...s.inputs[0], ...s.pending[0] },
      { ...s.inputs[1], ...s.pending[1] },
      { ...s.inputs[2], ...s.pending[2] },
    );
    if (before !== match.inputTick) {
      s.pending = s.inputs.map(() => ({}));
      s.applied = [...s.received];
    }
  }
  clear() {
    this.state.inputs = this.state.inputs.map(() => ({}));
    this.state.pending = this.state.pending.map(() => ({}));
    this.state.applied = [...this.state.received];
  }
}
