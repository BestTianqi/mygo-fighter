import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const { outputFiles } = await build({
  stdin: {
    contents: `export { Match, MOVES } from './frontend/src/game/engine'; export { create } from './frontend/src/game/serverSimulation'; export { Prediction } from './frontend/src/game/Prediction';`,
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
const attack = "mewtype_12_virtual_super";
const options = { mode: "duel", characters: [12, 0], seed: 123 };
function setup(side = 0, distance = 240) {
  const m = new Match({ ...options, characters: side ? [0, 12] : [12, 0] });
  m.start();
  m.advance(2000);
  const caster = m.fighters[side],
    target = m.fighters[1 - side];
  caster.x = 0;
  caster.y = target.y = 0;
  caster.facing = side ? -1 : 1;
  caster.energy = 100;
  target.x = caster.facing * distance;
  const cast = { unified: true, super: true };
  m.advance(10, side ? {} : cast, side ? cast : {});
  assert.equal(caster.attack, attack);
  return { m, caster, target };
}
function until(m, predicate, timeout = 15000) {
  for (let ms = 0; !predicate() && ms < timeout; ms += 10) m.advance(10);
  assert(predicate(), "Simulation reached the expected state");
}

for (const side of [0, 1])
  test(`nine locked hits total 50 HP, caster side ${side}`, () => {
    const { m, caster, target } = setup(side);
    caster.combo = 7;
    caster.comboMs = 20000;
    const hits = [],
      glyphs = [];
    let pin;
    // Inputs begin after acquisition so this checks escape, rather than startup evasion.
    until(m, () => !!caster.binding);
    pin = { x: target.x, y: target.y };
    target.energy = 100;
    for (let i = 0; caster.attack === attack && i < 1500; i++) {
      const escape =
        i % 2
          ? {}
          : {
              unified: true,
              guard: true,
              blink: true,
              jump: true,
              [side ? "left" : "right"]: true,
              light: true,
              skill1: true,
              super: true,
            };
      m.advance(10, side ? escape : {}, side ? {} : escape);
      for (const e of m.drainEvents()) {
        if (e.type === "hit" && e.attack === attack) hits.push(e);
        if (e.type === "memePulse" && e.attack === attack) glyphs.push(e.glyph);
      }
      if (caster.binding) {
        assert.equal(target.x, pin.x);
        assert.equal(target.y, pin.y);
        assert.equal(target.attack, null);
        assert.equal(target.guard, false);
      }
    }
    assert.equal(hits.length, 9);
    assert.equal(
      hits.reduce((n, e) => n + e.damage, 0),
      50,
    );
    assert.equal(target.hp, 150);
    assert.equal(glyphs.join(""), "临兵斗者皆阵列在前");
    assert.equal(caster.binding, null);
    m.advance(500);
    const x = target.x;
    const walk = { [side ? "left" : "right"]: true };
    m.advance(100, side ? walk : {}, side ? {} : walk);
    assert.notEqual(target.x, x, "Control returns after the cast");
  });

test("capture only acquires the frontal area, with one acquisition window", () => {
  for (const distance of [-180, 600]) {
    const { m, caster, target } = setup();
    target.x = distance;
    m.advance(700);
    assert.equal(caster.binding, null);
    target.x = 200;
    until(m, () => caster.attack === null);
    assert.equal(
      target.hp,
      200,
      "Entering after acquisition cannot be recaptured",
    );
  }
  const { m, caster, target } = setup();
  m.advance(MOVES[attack].start - 20);
  target.dashInvuln = 300;
  m.advance(1000);
  assert.equal(caster.binding, null, "Startup evasion remains possible");
  assert.equal(target.hp, 200);
});

test("airborne targets remain bound in place without falling or knockback", () => {
  const { m, caster, target } = setup();
  m.advance(MOVES[attack].start - 20);
  target.y = 180;
  target.vy = 50;
  until(m, () => !!caster.binding);
  const pin = { x: target.x, y: target.y };
  target.pushVx = 700;
  m.advance(2500);
  assert.equal(target.x, pin.x);
  assert.equal(target.y, pin.y);
  assert.equal(target.vy, 0);
});

test("80 percent reduction applies throughout casting and ends with it", () => {
  const { m, caster } = setup();
  for (const age of [
    0,
    200,
    MOVES[attack].start + 100,
    MOVES[attack].duration - 10,
  ]) {
    caster.attackMs = age;
    caster.hp = 200;
    m.hit(1, "light", undefined, undefined, { damage: 10, fixedDamage: true });
    assert.equal(caster.hp, 198);
    assert.equal(caster.attack, attack, "Armor also prevents interruption");
    m.drainEvents();
  }
  caster.attack = null;
  caster.hp = 200;
  m.hit(1, "light", undefined, undefined, { damage: 10, fixedDamage: true });
  assert.equal(caster.hp, 190);
  const otherSuper = "mewtype_11_virtual_super";
  caster.attack = otherSuper;
  caster.attackMs = 200;
  caster.hp = 200;
  m.hit(1, "light", undefined, undefined, { damage: 10, fixedDamage: true });
  assert.equal(caster.hp, 190, "Other supers retain their damage rules");
});

test("small hits retain exactly 80 percent reduction without floating point drift", () => {
  const { m, caster } = setup();
  for (let i = 0; i < 10; i++)
    m.hit(1, "light", undefined, undefined, { damage: 7, fixedDamage: true });
  assert.equal(caster.hp, 186);
});

test("binding clears on caster defeat, round transition, and restart", () => {
  for (const finish of ["death", "round", "restart"]) {
    const { m, caster, target } = setup();
    until(m, () => !!caster.binding);
    if (finish === "death") caster.hp = 0;
    else if (finish === "round") m.endRound();
    else m.restart();
    if (finish === "death") until(m, () => m.phase !== "fighting");
    else m.advance(10);
    assert(m.fighters.every((f) => !f.binding));
    if (finish !== "restart") assert.equal(target.hardStun, 0);
  }
});

test("authoritative packets and prediction restore the active binding", () => {
  const s = create(JSON.stringify(options));
  s.advance(2000);
  const initial = JSON.parse(s.packet());
  // Restore a close-range match, using the same state path as LAN reconciliation.
  const { m, caster } = setup();
  until(m, () => !!caster.binding);
  const { options: _options, events: _events, ...state } = m;
  const p = {
    ...initial,
    state: JSON.parse(JSON.stringify(state)),
    tick: m.simulationTick,
  };
  const client = new Match(options);
  client.start();
  const predictor = new Prediction();
  predictor.receive(client, p, 1, 1000, 0);
  assert.deepEqual(client.fighters[0].binding, caster.binding);
  const before = client.fighters[1].x;
  predictor.record(
    client,
    1,
    1,
    { unified: true, right: true, blink: true },
    1010,
  );
  predictor.advance(client, 1010, 10);
  assert.equal(client.fighters[1].x, before);
  assert.equal(client.fighters[1].attack, null);
});
