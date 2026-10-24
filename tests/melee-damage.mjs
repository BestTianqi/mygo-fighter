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
const cases = [
  {
    id: 0,
    key: "thrust",
    damage: 16,
    cost: 15,
    button: "skill1",
    direction: "forward",
  },
  { id: 3, key: "ranaRush", damage: 14, cost: 15, button: "skill1" },
  {
    id: 4,
    key: "rikiOverhead",
    damage: 21,
    cost: 20,
    button: "skill1",
    direction: "down",
  },
  { id: 5, key: "mujica_5_normal_o", damage: 25, cost: 30, button: "skill3" },
  {
    id: 7,
    key: "mujica_7_stage_i",
    damage: 18,
    cost: 25,
    button: "skill2",
    stage: true,
  },
  {
    id: 11,
    key: "mewtype_11_virtual_o",
    damage: 25,
    cost: 30,
    button: "skill3",
  },
  {
    id: 14,
    key: "mewtype_14_virtual_i",
    damage: 18,
    cost: 25,
    button: "skill2",
  },
];
const inputFor = (spec, side) => ({
  unified: true,
  [spec.button]: true,
  pressDirections: {
    [spec.button]:
      spec.direction === "down"
        ? { crouch: true }
        : spec.direction === "forward"
          ? { [side ? "left" : "right"]: true }
          : {},
  },
});
const expectedDamage = (spec) =>
  Math.round(spec.damage * (spec.stage ? 1.2 : 1) * 10) / 10;

for (const spec of cases) {
  for (const side of [0, 1])
    test(`${spec.key}: cast deals ${expectedDamage(spec)} damage on side ${side}`, () => {
      const m = new Match({
        mode: "duel",
        characters: side ? [1, spec.id] : [spec.id, 1],
      });
      m.start();
      m.advance(2000);
      const a = m.fighters[side],
        b = m.fighters[1 - side];
      a.x = 600;
      b.x = a.x + (side ? -1 : 1) * 140;
      a.energy = 100;
      if (spec.stage) a.stageForm = { ms: 15000 };
      m.drainEvents();
      m.advance(
        10,
        side ? {} : inputFor(spec, side),
        side ? inputFor(spec, side) : {},
      );
      assert.equal(a.attack, spec.key);
      assert.equal(a.energy, 100 - spec.cost);
      assert.equal(MOVES[spec.key].damage, spec.damage);
      m.advance(1000);
      const hits = m
        .drainEvents()
        .filter((e) => e.type === "hit" && e.attack === spec.key);
      assert.equal(hits.length, 1);
      assert.equal(hits[0].damage, expectedDamage(spec));
      assert.equal(b.hp, 200 - expectedDamage(spec));
      assert.equal(
        a.energy,
        102 - spec.cost,
        "skill hit still restores exactly 2 resonance",
      );
    });
  test(`${spec.key}: LAN authority and prediction share the stronger hit`, () => {
    const options = { mode: "practice", characters: [spec.id, 1], seed: 123 };
    const server = create(JSON.stringify(options));
    server.advance(2000);
    server.input(0, 1, JSON.stringify({ right: true }));
    server.advance(550);
    server.input(0, 2, "{}");
    server.advance(10);
    if (spec.stage) {
      server.input(0, 3, JSON.stringify({ unified: true, transform: true }));
      server.advance(10);
      server.input(0, 4, "{}");
      server.advance(1400); // Let the transformation burst's combo scaling expire.
    }
    server.input(0, 5, JSON.stringify(inputFor(spec, 0)));
    server.advance(10);
    server.input(0, 6, "{}");
    server.advance(1000);
    const packet = JSON.parse(server.packet());
    const hits = packet.events.filter(
      (e) => e.event.type === "hit" && e.event.attack === spec.key,
    );
    assert.equal(hits.length, 1);
    assert.equal(hits[0].event.damage, expectedDamage(spec));
    const local = new Match(options);
    local.start();
    new Prediction().receive(local, packet, 0, 1000, 0);
    assert.deepEqual(local.fighters, packet.state.fighters);
  });
}
test("Riki's four-beat derivative inherits the buff", () => {
  assert.equal(MOVES.rikiOverheadBoost.damage, 21);
  assert.equal(MOVES.rikiOverheadBoost.cost, 20);
});
