import assert from "node:assert/strict";
import { evaluate } from "./kernel.mjs";
const { Match, MOVES } = await evaluate("frontend/src/game/engine.ts", [
  "Match",
  "MOVES",
]);
const cases = [
  { id: 10, key: "mewtype_10_virtual_super", damage: 40, hits: 3 },
  { id: 11, key: "mewtype_11_virtual_super", damage: 50, hits: 5 },
  { id: 13, key: "mewtype_13_virtual_super", damage: 50, hits: 3 },
  { id: 4, key: "rikiSuper", damage: 50, hits: 4 },
];
function start(id, distance = 160, rules = {}) {
  const match = new Match({
    mode: "duel",
    characters: [id, 0],
    rules: { maxHealth: 1000, infiniteTime: true, ...rules },
  });
  match.start();
  match.advance(3000);
  match.drainEvents();
  match.fighters[0].energy = 100;
  match.fighters[0].x = -500;
  match.fighters[1].x = -500 + distance;
  return match;
}
for (const item of cases) {
  const m = start(item.id);
  m.advance(5000, { super: true });
  const hits = m.drainEvents().filter((e) => e.type === "hit" && e.side === 0);
  assert.equal(hits.length, item.hits, `${item.key}: all strikes connect`);
  assert.equal(1000 - m.fighters[1].hp, item.damage, item.key);
  assert.equal(
    m.fighters[0].energy,
    0,
    "super costs100 and awards no attacker energy",
  );
  assert.ok(
    Math.abs(m.fighters[1].energy - 8) < 0.01,
    "multi-hit defender budget stays8",
  );
  const blocked = start(item.id);
  blocked.advance(5000, { super: true }, { guard: true });
  assert.ok(
    blocked.fighters[1].hp > 1000 - item.damage,
    "fixed damage still respects guard",
  );
  const disabled = start(item.id, 160, { disableSupers: true });
  disabled.advance(2000, { super: true });
  assert.equal(disabled.fighters[1].hp, 1000);
  assert.equal(disabled.fighters[0].energy, 100);
  const multiplied = start(item.id, 160, { damageMultiplier: 2 });
  multiplied.advance(5000, { super: true });
  assert.equal(1000 - multiplied.fighters[1].hp, item.damage * 2);
}
const remote = start(10, 1000);
remote.advance(5000, { super: true });
assert.equal(1000 - remote.fighters[1].hp, 40, "Arale reaches1000 units");
const homing = start(10, 700);
homing.advance(140, { super: true });
homing.fighters[1].y = 480;
homing.updateWaves();
assert.ok(
  homing.waves.some((w) => w.homing && w.vy > 0),
  "Arale steers upward toward high targets",
);
for (const id of [11, 13, 4]) {
  const mid = start(id, 350);
  mid.advance(5000, { super: true });
  assert.equal(
    1000 - mid.fighters[1].hp,
    cases.find((row) => row.id === id).damage,
    "full sequence reaches midrange",
  );
  const m = new Match({
    mode: "duel",
    format: "3ffa",
    teams: [
      [id, 0, 1],
      [0, 1, 2],
      [1, 2, 3],
    ],
    rules: { maxHealth: 1000, infiniteTime: true },
  });
  m.start();
  m.advance(3000);
  m.drainEvents();
  m.fighters[0].x = 0;
  m.fighters[1].x = 160;
  m.fighters[2].x = id === 13 ? -200 : 220;
  m.fighters[0].energy = 100;
  m.advance(5000, { super: true });
  const targets = new Set(
    m
      .drainEvents()
      .filter((e) => e.type === "hit" && e.side === 0)
      .map((e) => e.target),
  );
  assert.deepEqual(
    targets,
    new Set([1, 2]),
    "mixed battle reaches both opponents; Yuno also hits behind",
  );
}
assert.equal(MOVES.rikiSuper.pulses.length, 4);
console.log(
  "Verified four stronger supers: full damage, mid/far range, homing height, guards, energy, custom rules and mixed-battle targets.",
);
