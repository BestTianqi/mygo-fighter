import { Match } from "./engine";
import { actions } from "./objects/Input";
import type { Input } from "./objects/Input";
import type { MatchOptions } from "./objects/MatchOptions";

/** Runs inside a private JVM polyglot context. No DOM, Node, timers or host access. */
export function create(optionsJson: string) {
  const match = new Match(JSON.parse(optionsJson) as MatchOptions);
  const inputs: Input[] = [{}, {}];
  const pending: Input[] = [{}, {}];
  const sequences = [-1, -1];
  const seenPressIds: Record<string, number>[] = [{}, {}];
  match.start();
  return {
    input(side: number, seq: number, json: string) {
      if (seq <= sequences[side]) return;
      const next = JSON.parse(json) as Input;
      for (const action of actions) {
        if (
          (next[action] && !inputs[side][action]) ||
          (next.pressIds?.[action] ?? 0) > (seenPressIds[side][action] ?? 0)
        ) {
          pending[side][action] = true;
        }
        seenPressIds[side][action] = Math.max(
          seenPressIds[side][action] ?? 0,
          next.pressIds?.[action] ?? 0,
        );
      }
      inputs[side] = next;
      sequences[side] = seq;
    },
    advance(ms: number) {
      const tick = match.inputTick;
      match.advance(
        ms,
        { ...inputs[0], ...pending[0] },
        { ...inputs[1], ...pending[1] },
      );
      if (tick !== match.inputTick) pending.splice(0, 2, {}, {});
    },
    pause(value: boolean) {
      match.setPaused(value);
      inputs.splice(0, 2, {}, {});
      pending.splice(0, 2, {}, {});
    },
    restart() {
      match.restart();
      inputs.splice(0, 2, {}, {});
      pending.splice(0, 2, {}, {});
    },
    packet() {
      const { options: _options, events: _events, ...state } = match;
      return JSON.stringify({
        state,
        events: match.drainEvents(),
        acks: sequences,
        inputs,
      });
    },
  };
}
