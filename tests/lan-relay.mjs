import assert from "node:assert/strict";
import { build } from "esbuild";
async function load(entry) {
  const { outputFiles } = await build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString("base64")}`
  );
}
const { Match } = await load("frontend/src/game/engine.ts");
const { create } = await load("frontend/src/game/serverSimulation.ts");
const options = {
  mode: "duel",
  format: "3v3",
  teams: [
    [4, 2, 0],
    [1, 3, 5],
  ],
  seed: 123,
};
const match = new Match(options);
match.start();
match.advance(2000);
assert.equal(match.phase, "fighting");
match.fighters[0].hp = 123;
match.fighters[0].energy = 47;
match.fighters[0].beats = 2;
for (let defeat = 0; defeat < 3; defeat++) {
  match.fighters[1].hp = 0;
  match.endRound();
  assert.deepEqual(match.teamIndices, [0, defeat + 1]);
  if (defeat < 2) {
    assert.equal(match.phase, "roundOver");
    match.advance(6000);
    assert.equal(match.phase, "fighting");
    assert.equal(match.fighters[1].character, options.teams[1][defeat + 1]);
    assert.equal(match.fighters[1].hp, 200);
    assert.equal(match.fighters[0].hp, 123);
    assert.equal(match.fighters[0].energy, 47);
    assert.equal(match.fighters[0].beats, 2);
    assert(match.drainEvents().some((event) => event.type === "teamAdvance"));
  }
}
assert.equal(match.phase, "finished");
assert.equal(match.winner, 0);
match.restart();
assert.deepEqual(match.teamIndices, [0, 0]);
assert.deepEqual(
  match.fighters.map((f) => f.hp),
  [200, 200],
);
const server = create(JSON.stringify(options));
server.advance(2000);
const before = JSON.parse(server.packet()).state;
assert.deepEqual(before.teams, options.teams);
server.pause(true);
server.advance(1000);
assert.equal(JSON.parse(server.packet()).state.elapsed, before.elapsed);
server.restart();
const restarted = JSON.parse(server.packet()).state;
assert.deepEqual(restarted.teamIndices, [0, 0]);
assert.deepEqual(
  restarted.fighters.map((f) => f.character),
  [4, 1],
);
console.log(
  "Relay checks passed: ordered reserves, KO transitions, survivor HP/energy/beats, victory, pause, restart and authoritative packets.",
);

// A socket can drop while the six selected fighters are still decoding.
// The next room message must cancel the pending preparation and restore the lobby.
const { RoomConnection } = await load(
  "frontend/src/apis/rooms/RoomConnection.ts",
);
let finishPreparing;
let lobbyReturns = 0;
let view;
const connection = new RoomConnection({
  onView: (next) => {
    view = next;
  },
  onPrepare: () =>
    new Promise((resolve) => {
      finishPreparing = resolve;
    }),
  onState: () => {},
  onDisconnect: () => {},
  onLobby: () => {
    lobbyReturns++;
  },
});
const preparingRoom = {
  code: "ABCDEF",
  format: "3v3",
  generation: 1,
  players: [],
  arena: 0,
  terrain: false,
  playing: false,
  preparing: true,
};
await connection.receive(JSON.stringify({ type: "room", data: preparingRoom }));
const preparation = connection.receive(
  JSON.stringify({ type: "prepare", data: { config: options, generation: 1 } }),
);
// Mirrors onclose, which preserves the last authoritative room while reconnecting.
connection.update({ status: "reconnecting" });
await connection.receive(
  JSON.stringify({
    type: "room",
    data: { ...preparingRoom, generation: 2, preparing: false },
  }),
);
assert.equal(lobbyReturns, 1);
assert.equal(view.status, "lobby");
finishPreparing();
await preparation;
assert.equal(connection.prepared, false);
assert.equal(connection.generation, 2);
console.log(
  "Preparation disconnect check passed: lobby restored and stale load discarded.",
);
