import assert from "node:assert/strict";
import { evaluate } from "./kernel.mjs";
const { Match, ROSTER } = await evaluate("frontend/src/game/engine.ts", [
  "Match",
  "ROSTER",
]);
const { NetworkInputs } = await evaluate("frontend/src/game/NetworkInputs.ts", [
  "NetworkInputs",
]);
const { create } = await evaluate("frontend/src/game/serverSimulation.ts", [
  "create",
]);
let checks = 0;
for (const format of ["1v1", "3ffa"]) {
  for (let character = 0; character < ROSTER.length; character++) {
    const options = {
      mode: "duel",
      format,
      seed: 128,
      characters: [character, (character + 1) % ROSTER.length],
      ...(format === "3ffa"
        ? {
            teams: Array.from({ length: 3 }, (_, side) =>
              Array.from(
                { length: 3 },
                (_, index) => (character + side + index) % ROSTER.length,
              ),
            ),
          }
        : {}),
      rules: { infiniteTime: true, initialEnergy: 100 },
    };
    const match = new Match(options),
      inputs = new NetworkInputs(match.playerCount);
    const server = create(JSON.stringify(options));
    match.start();
    for (let tick = 0; tick < 1600; tick++) {
      if (tick % 20 === 0)
        for (let side = 0; side < match.playerCount; side++) {
          const input = {
            unified: true,
            [side ? "left" : "right"]: tick % 80 < 40,
            light: tick % 40 === 0,
            heavy: tick % 100 === 0,
            skill1: tick % 160 === 0,
            skill2: tick % 240 === 0,
            transform: tick % 300 === 0,
            super: tick % 400 === 0,
          };
          inputs.receive(side, tick, input);
          server.input(side, tick, JSON.stringify(input));
        }
      if (tick === 800 || tick === 820) {
        match.setPaused(tick === 800);
        inputs.clear();
        server.pause(tick === 800);
      }
      if (tick === 1200) {
        match.restart();
        inputs.clear();
        server.restart();
      }
      inputs.advance(match, 10);
      server.advance(10);
      if (tick % 40 === 0) {
        const { options: _options, events: _events, ...state } = match;
        const packet = JSON.parse(server.packet());
        assert.deepEqual(
          packet.state,
          JSON.parse(JSON.stringify(state)),
          `${format}/${character}/${tick}: every serializable Match field must be sent`,
        );
        assert.deepEqual(
          packet.inputState,
          JSON.parse(JSON.stringify(inputs.state)),
        );
        checks++;
      }
      match.drainEvents();
      server.eventBatch();
    }
  }
}
console.log(
  `Verified ${checks} complete server snapshots across all ${ROSTER.length} characters, two/three players, pause and restart.`,
);
