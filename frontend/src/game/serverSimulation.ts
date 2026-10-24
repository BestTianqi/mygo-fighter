import { Match } from "./engine";
import { NetworkInputs } from "./NetworkInputs";
import {
  HISTORY_MS,
  NETWORK_PROTOCOL,
  type NetworkEvent,
} from "./networkProtocol";
import type { Input } from "./objects/Input";
import type { MatchOptions } from "./objects/MatchOptions";

/** Runs inside a private JVM polyglot context. No DOM, Node, timers or host access. */
export function create(optionsJson: string) {
  const match = new Match(JSON.parse(optionsJson) as MatchOptions);
  const inputs = new NetworkInputs();
  let time = 0,
    epoch = 0,
    eventId = 0;
  let events: NetworkEvent[] = [];
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
          events = [];
        }
        left -= step;
      }
    },
    pause(value: boolean) {
      match.setPaused(value);
      inputs.clear();
      epoch++;
      events = [];
    },
    restart() {
      match.restart();
      inputs.clear();
      epoch++;
      events = [];
    },
    packet() {
      events = events.filter((e) => time - e.at <= HISTORY_MS);
      events.push(
        ...match
          .drainEvents()
          .map((event) => ({ id: ++eventId, at: time, event })),
      );
      const { options: _options, events: _events, ...state } = match;
      return JSON.stringify({
        protocol: NETWORK_PROTOCOL,
        epoch,
        tick: match.simulationTick,
        time,
        state,
        events,
        acks: inputs.state.applied,
        received: inputs.state.received,
        inputs: inputs.state.inputs,
        inputState: inputs.state,
      });
    },
  };
}
