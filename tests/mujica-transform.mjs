import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const { outputFiles } = await build({
  stdin: {
    contents: `export { Match, MOVES, ROSTER } from './frontend/src/game/engine';
      export { profileFor } from './frontend/src/game/combatData';
      export { create } from './frontend/src/game/serverSimulation';
      export { Prediction } from './frontend/src/game/Prediction';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const { Match, MOVES, ROSTER, profileFor, create, Prediction } = await import(
  "data:text/javascript;base64," +
    Buffer.from(outputFiles[0].text).toString("base64")
);
function ready(id, side = 0, distance = 180) {
  const m = new Match({ mode: "duel", characters: side ? [0, id] : [id, 0] });
  m.start();
  m.advance(2000);
  const a = m.fighters[side],
    b = m.fighters[1 - side];
  a.x = 300;
  b.x = a.x + (side ? -distance : distance);
  a.y = b.y = 0;
  a.energy = 100;
  m.drainEvents();
  return { m, a, b };
}
function transform(m, side = 0, other = {}) {
  const cast = { unified: true, transform: true };
  m.advance(10, side ? other : cast, side ? cast : other);
}
const near = (actual, expected) =>
  assert(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

for (const id of [5, 6, 7, 8, 9]) {
  for (const side of [0, 1])
    test(`${id}: transform bursts once and costs 50 on side ${side}`, () => {
      const { m, a, b } = ready(id, side);
      transform(m, side);
      assert.equal(a.stageForm.ms, 20000);
      assert.equal(a.energy, 50);
      assert.equal(b.hp, 190);
      assert(Math.sign(b.pushVx) === Math.sign(b.x - a.x));
      m.advance(1800);
      transform(m, side);
      assert.equal(a.energy, 50);
      const hits = m
        .drainEvents()
        .filter((e) => e.type === "hit" && e.attack === "mujicaTransform");
      assert.equal(hits.length, 1);
      assert.equal(hits[0].damage, 10);
    });
  test(`${id}: transformed walking and air movement are 1.1 times faster`, () => {
    const base = ready(id, 0, 1000),
      stage = ready(id, 0, 1000);
    stage.a.stageForm = { ms: 15000 };
    base.m.advance(200, { right: true });
    stage.m.advance(200, { right: true });
    near(stage.a.x - 300, (base.a.x - 300) * 1.1);
    near(profileFor(stage.a).speed, ROSTER[id].speed * 1.1);
    near(profileFor(base.a).speed, ROSTER[id].speed);
    const x = [base.a.x, stage.a.x];
    base.m.advance(200, { jump: true, right: true });
    stage.m.advance(200, { jump: true, right: true });
    near(stage.a.x - x[1], (base.a.x - x[0]) * 1.1);
    near(stage.a.y, base.a.y);
  });
  test(`${id}: normals, skills and fixed multihit damage gain 20 percent`, () => {
    for (const [attack, impact] of [
      [`mujica_${id}_stage_light`, {}],
      [`mujica_${id}_stage_heavy`, {}],
      [`mujica_${id}_stage_u`, { damage: 17 }],
      [`mujica_${id}_stage_super`, { damage: 10, fixedDamage: true }],
    ]) {
      const { m, a, b } = ready(id);
      a.stageForm = { ms: 15000 };
      m.hit(0, attack, a.x, a.y + 100, impact);
      near(200 - b.hp, (impact.damage ?? MOVES[attack].damage) * 1.2);
    }
  });
}
test("burst reaches behind, respects range, guard and invulnerability", () => {
  for (const distance of [-180, 180, 300]) {
    const { m, a, b } = ready(6, 0, distance);
    transform(m);
    assert.equal(b.hp, Math.abs(distance) < 220 ? 190 : 200);
    assert(a.stageForm);
  }
  const guard = ready(6);
  transform(guard.m, 0, { guard: true });
  assert.equal(guard.b.hp, 198);
  const dodge = ready(6);
  dodge.b.wakeInvuln = 200;
  transform(dodge.m);
  assert.equal(dodge.b.hp, 200);
  const low = ready(6);
  low.a.energy = 49;
  transform(low.m);
  assert.equal(low.a.stageForm, null);
  assert.equal(low.b.hp, 200);
});
test("simultaneous transformations trade bursts", () => {
  const { m, a, b } = ready(6);
  b.character = 8;
  b.energy = 100;
  m.advance(
    10,
    { unified: true, transform: true },
    { unified: true, transform: true },
  );
  assert(a.stageForm && b.stageForm);
  assert.deepEqual([a.hp, b.hp], [190, 190]);
});
test("expiry restores movement and damage; other bands keep their stats", () => {
  const { m, a, b } = ready(6, 0, 1000);
  a.stageForm = { ms: 10 };
  m.advance(10, { right: true });
  assert.equal(a.stageForm, null);
  near(a.vx, ROSTER[6].speed);
  m.hit(0, "mujica_6_normal_heavy", a.x, a.y + 100);
  near(200 - b.hp, MOVES.mujica_6_normal_heavy.damage);
  for (const id of [0, 2, 10, 14]) {
    const normal = ready(id);
    normal.a.stageForm = { ms: 10000 };
    near(profileFor(normal.a).speed, ROSTER[id].speed);
    normal.m.hit(0, "heavy", normal.a.x, 100);
    near(200 - normal.b.hp, ROSTER[id].heavyDamage);
  }
});
test("boosted hits damage shields and summons consistently", () => {
  const { m, a, b } = ready(6);
  a.stageForm = { ms: 10000 };
  b.shield = { hp: 50, ms: 1000, hitMs: 0 };
  b.facing = -1;
  m.hit(0, "mujica_6_stage_u", a.x, 100, { damage: 17 });
  near(b.shield.hp, 50 - 17 * 1.2);
  const unit = { id: 0, hp: 20, maxHp: 20, x: b.x, y: 0 };
  b.summons = { ms: 1000, bornAt: 0, units: [unit] };
  m.hitMinion(0, unit, "mujica_6_stage_heavy");
  near(unit.hp, 20 - MOVES.mujica_6_stage_heavy.damage * 1.2);
});
test("LAN snapshots retain burst outcome, form timer and movement bonus", () => {
  const options = { mode: "practice", characters: [6, 0], seed: 123 };
  const server = create(JSON.stringify(options));
  server.advance(2000);
  server.input(0, 1, JSON.stringify({ right: true }));
  server.advance(500);
  server.input(
    0,
    2,
    JSON.stringify({ unified: true, transform: true, right: true }),
  );
  server.advance(10);
  const packet = JSON.parse(server.packet());
  assert.equal(packet.state.fighters[1].hp, 190);
  const client = new Match(options);
  client.start();
  const prediction = new Prediction();
  prediction.receive(client, packet, 0, 1000, 150);
  for (let i = 1; i <= 3; i++) {
    prediction.advance(client, 1000 + i * 50, 50);
    server.advance(50);
  }
  const authority = JSON.parse(server.packet()).state;
  assert.deepEqual(client.fighters, authority.fighters);
  assert(client.fighters[0].x > packet.state.fighters[0].x);
  near(profileFor(client.fighters[0]).speed, ROSTER[6].speed * 1.1);
});
