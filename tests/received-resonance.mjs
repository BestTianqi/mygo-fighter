import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const { outputFiles } = await build({
  stdin: {
    contents: `export { Match, MOVES } from './frontend/src/game/engine';
      export { create } from './frontend/src/game/serverSimulation';
      export { Prediction } from './frontend/src/game/Prediction';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const { Match, MOVES, create, Prediction } = await import(
  "data:text/javascript;base64," +
    Buffer.from(outputFiles[0].text).toString("base64")
);
function setup(id = 0, side = 0) {
  const match = new Match({
    mode: "duel",
    characters: side ? [1, id] : [id, 1],
  });
  match.start();
  match.advance(2000);
  const a = match.fighters[side],
    b = match.fighters[1 - side];
  a.x = 480;
  b.x = a.x + (side ? -100 : 100);
  a.energy = b.energy = 0;
  return { match, a, b };
}
for (const [key, move] of Object.entries(MOVES)) {
  const count = Math.max(move.pulses?.length ?? 0, move.shots?.length ?? 0);
  if (count < 2) continue;
  for (const blocked of [false, true])
    test(`${key}: all ${count} hits grant ${blocked ? 3 : 8} defender resonance`, () => {
      const { match, a, b } = setup(move.ownerCharacter ?? 0);
      a.attack = key;
      b.energy = 42;
      b.guard = blocked;
      b.crouch = move.level === "low";
      for (let n = 0; n < count; n++)
        match.hit(0, key, a.x, 100, move.pulses?.[n]);
      assert.equal(b.energy, blocked ? 45 : 50);
      assert.equal(
        a.energy,
        move.category === "super" ? 0 : (blocked ? 1 : 2) * count,
        "attacker's per-hit gain stays unchanged",
      );
    });
}
test("partial five-ring hits grant only the corresponding share", () => {
  const { match, a, b } = setup(2);
  match.hit(0, "penguinSuper", a.x, 100);
  match.hit(0, "penguinSuper", a.x, 100);
  assert.equal(b.energy, 3.2);
});
test("an internal extra projectile shares its parent skill's budget", () => {
  const { match, a, b } = setup(4);
  match.hit(0, "rikiShockBoost", a.x, 100);
  match.hit(0, "rikiShockExtra", a.x, 100);
  assert.equal(b.energy, 8);
  assert.equal(a.energy, 4);
});
test("normal attacks and single-hit skills retain 8/3 defender gain", () => {
  for (const key of ["light", "thrust"])
    for (const blocked of [false, true]) {
      const { match, a, b } = setup();
      b.guard = blocked;
      match.hit(0, key, a.x, 100);
      assert.equal(b.energy, blocked ? 3 : 8);
      assert.equal(a.energy, blocked ? 1 : key === "light" ? 12 : 2);
    }
});
test("a summon shares its gain cap among every unit and resets on recast", () => {
  for (const blocked of [false, true]) {
    const { match, a, b } = setup(1);
    b.guard = blocked;
    a.summons = { ms: 10000, bornAt: 0, units: [] };
    for (let n = 0; n < 20; n++) match.hit(0, "tensoraHit", a.x, 100);
    assert.equal(b.energy, blocked ? 3 : 8);
    assert.equal(a.energy, 0);
    b.stun = b.knockdown = 0;
    a.summons = { ms: 10000, bornAt: 1, units: [] };
    for (let n = 0; n < 20; n++) match.hit(0, "tensoraHit", a.x, 100);
    assert.equal(b.energy, blocked ? 6 : 16);
  }
});
test("a capped defender cannot bank hidden gain for later spending", () => {
  const { match, a, b } = setup(1);
  a.summons = { ms: 10000, bornAt: 0, units: [] };
  b.energy = 100;
  for (let n = 0; n < 4; n++) match.hit(0, "tensoraHit", a.x, 100);
  b.energy -= 50;
  match.hit(0, "tensoraHit", a.x, 100);
  assert.equal(b.energy, 50);
});
test("invulnerability and a fully absorbing shield grant no resonance", () => {
  const { match, a, b } = setup();
  b.wakeInvuln = 100;
  match.hit(0, "rush", a.x, 100);
  assert.equal(b.energy, 0);
  b.wakeInvuln = 0;
  b.shield = { hp: 100, ms: 1000, hitMs: 0 };
  match.hit(0, "rush", a.x, 100);
  assert.equal(b.energy, 0);
});

for (const [id, key, input, penguin] of [
  [4, "rikiRoll", { unified: true, skill1: true }],
  [2, "penguinSuper", { unified: true, super: true }, true],
  [12, "mewtype_12_virtual_super", { unified: true, super: true }],
])
  test(`${key}: the live multi-hit execution grants exactly eight`, () => {
    const { match, a, b } = setup(id);
    a.energy = 100;
    b.energy = 42;
    if (penguin) a.penguin = { ms: 15000 };
    match.advance(10, input);
    match.advance(6000);
    const hits = match
      .drainEvents()
      .filter((e) => e.type === "hit" && e.attack === key);
    assert.equal(
      hits.length,
      Math.max(MOVES[key].pulses?.length ?? 0, MOVES[key].shots?.length ?? 0),
    );
    assert.equal(b.energy, 50);
  });
test("the boosted ground wave's extra projectile uses the split gain in combat", () => {
  const { match, a, b } = setup(4);
  a.energy = 100;
  a.beats = 4;
  b.energy = 42;
  match.advance(10, { unified: true, skill2: true });
  assert.equal(a.attack, "rikiShockBoost");
  match.advance(2000);
  const hits = match
    .drainEvents()
    .filter(
      (e) =>
        e.type === "hit" &&
        ["rikiShockBoost", "rikiShockExtra"].includes(e.attack),
    );
  assert.equal(hits.length, 2);
  assert.equal(b.energy, 50);
});
test("LAN authority and replay preserve a summon's spent resonance budget", () => {
  const options = { mode: "practice", characters: [1, 0], seed: 123 };
  const server = create(JSON.stringify(options));
  server.advance(2000);
  server.input(0, 1, JSON.stringify({ right: true }));
  server.advance(550);
  server.input(0, 2, JSON.stringify({ unified: true, skill1: true }));
  server.advance(10);
  server.input(0, 3, "{}");
  server.advance(5000);
  const packet = JSON.parse(server.packet());
  assert.equal(packet.state.fighters[1].energy, 8);
  assert.equal(packet.state.fighters[0].summons.resonanceGranted, 8);
  const client = new Match(options);
  client.start();
  const predictor = new Prediction();
  predictor.receive(client, packet, 0, 1000, 80);
  for (let n = 1; n <= 2; n++) {
    predictor.advance(client, 1000 + n * 50, 50);
    server.advance(50);
  }
  assert.deepEqual(client.fighters, JSON.parse(server.packet()).state.fighters);
});
