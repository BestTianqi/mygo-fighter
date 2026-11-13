import assert from "node:assert/strict";
import { evaluate } from "./kernel.mjs";
const { Match, MOVES } = await evaluate("frontend/src/game/engine.ts", [
  "Match",
  "MOVES",
]);

// Existing windows measure combat time after the authored cinematic opening.
function advanceSuper(match, combatMs, opponentInput = {}) {
  match.advance(10, { super: true }, opponentInput);
  match.advance(
    (match.superIntro?.durationMs ?? 0) + combatMs - 10,
    {},
    opponentInput,
  );
}
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
  advanceSuper(m, 5000);
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
  advanceSuper(blocked, 5000, { guard: true });
  assert.ok(
    blocked.fighters[1].hp > 1000 - item.damage,
    "fixed damage still respects guard",
  );
  const disabled = start(item.id, 160, { disableSupers: true });
  disabled.advance(2000, { super: true });
  assert.equal(disabled.fighters[1].hp, 1000);
  assert.equal(disabled.fighters[0].energy, 100);
  const multiplied = start(item.id, 160, { damageMultiplier: 2 });
  advanceSuper(multiplied, 5000);
  assert.equal(1000 - multiplied.fighters[1].hp, item.damage * 2);
}
const remote = start(10, 1000);
advanceSuper(remote, 5000);
assert.equal(1000 - remote.fighters[1].hp, 40, "Arale reaches1000 units");
const homing = start(10, 700);
advanceSuper(homing, 140);
homing.fighters[1].y = 480;
homing.updateWaves();
assert.ok(
  homing.waves.some((w) => w.homing && w.vy > 0),
  "Arale steers upward toward high targets",
);
for (const id of [11, 13, 4]) {
  const mid = start(id, 350);
  advanceSuper(mid, 5000);
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
  advanceSuper(m, 5000);
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

// Nonoka's P is a moving melee strike: targets enter the box along the rush,
// and each opponent can take the one strike only once per cast.
const nonokaKey = "mewtype_14_virtual_super";
function headbutt(distance = 160, facing = 1, rules = {}) {
  const m = start(14, distance, rules);
  m.fighters[0].x = facing > 0 ? -500 : 500;
  m.fighters[1].x = m.fighters[0].x + distance * facing;
  return m;
}
function strikes(m) {
  return m.drainEvents().filter((e) => e.type === "hit" && e.side === 0);
}
for (const facing of [1, -1]) {
  for (const distance of [100, 350, 650]) {
    const m = headbutt(distance, facing);
    const origin = m.fighters[0].x;
    advanceSuper(m, 10);
    assert.equal(m.fighters[0].attack, nonokaKey, "P starts Nonoka's super");
    m.advance(100);
    assert.equal(m.fighters[0].x, origin, "head lowers before the rush moves");
    assert.equal(m.fighters[1].hp, 1000, "windup has no attack box");
    m.advance(2200);
    assert.equal(1000 - m.fighters[1].hp, 50, "one headbutt deals exactly50");
    assert.equal(strikes(m).length, 1, "each cast hits an opponent once");
    assert.equal(m.fighters[0].energy, 0, "P costs100 without attacker gain");
    assert.equal(
      m.fighters[1].energy,
      8,
      "one hit grants the defender budget8",
    );
    assert.equal(m.fighters[0].attack, null, "the rush recovers on time");
    assert.equal(m.waves.length, 0, "the headbutt creates no projectile");
    m.advance(1600);
    assert.equal(strikes(m).length, 0, "recovery cannot repeat the damage");
    assert.equal(m.fighters[1].energy, 8, "recovery cannot repeat resonance");
  }
  const whiff = headbutt(1000, facing);
  const origin = whiff.fighters[0].x;
  advanceSuper(whiff, 1800);
  assert.equal(whiff.fighters[1].hp, 1000, "an out-of-range opponent is safe");
  assert.equal(strikes(whiff).length, 0);
  const travel = (whiff.fighters[0].x - origin) * facing;
  assert.ok(travel >= 500 && travel <= 650, `actual forward travel=${travel}`);
  assert.equal(whiff.fighters[0].attack, null, "a whiff still recovers");
  const behind = headbutt(350, facing);
  advanceSuper(behind, 10);
  behind.fighters[1].x = behind.fighters[0].x - facing * 180;
  behind.advance(1800);
  assert.equal(behind.fighters[1].hp, 1000, "the rush cannot hit behind");
  assert.equal(strikes(behind).length, 0);
}
const nonokaGuard = headbutt();
advanceSuper(nonokaGuard, 2200, { guard: true });
const guardedHits = strikes(nonokaGuard);
assert.equal(guardedHits.length, 1);
assert.equal(guardedHits[0].blocked, true);
assert.equal(nonokaGuard.fighters[1].hp, 998, "guard keeps normal super chip");
assert.equal(
  nonokaGuard.fighters[1].energy,
  3,
  "guard grants its normal budget",
);
const nonokaDisabled = headbutt(160, 1, { disableSupers: true });
nonokaDisabled.advance(2200, { super: true });
assert.equal(nonokaDisabled.fighters[0].energy, 100);
assert.equal(nonokaDisabled.fighters[1].hp, 1000);
assert.equal(strikes(nonokaDisabled).length, 0);
const nonokaMultiplied = headbutt(350, 1, { damageMultiplier: 2 });
advanceSuper(nonokaMultiplied, 2200);
assert.equal(nonokaMultiplied.fighters[1].hp, 900, "P follows damage rules");
const combo = headbutt();
combo.fighters[0].combo = 4;
combo.fighters[0].comboMs = 1000;
advanceSuper(combo, 2200);
assert.equal(
  combo.fighters[1].hp,
  950,
  "the complete super remains50 in combos",
);
const armored = headbutt(100);
advanceSuper(armored, 130, { light: true });
const incoming = armored
  .drainEvents()
  .find((e) => e.type === "hit" && e.side === 1);
assert.equal(
  incoming?.armored,
  true,
  "the real opposing jab meets super armor",
);
assert.ok(
  armored.fighters[0].hp < 1000,
  "armor still receives incoming damage",
);
assert.equal(armored.fighters[0].attack, nonokaKey, "armor preserves the rush");
armored.advance(2100);
assert.equal(armored.fighters[1].hp, 950, "an armored rush still completes");
assert.equal(
  armored.fighters[0].energy,
  8,
  "only received damage grants resonance",
);
for (const [height, hp] of [
  [350, 950],
  [370, 1000],
]) {
  const elevated = headbutt(350);
  elevated.setTerrain({ platforms: [{ left: -850, right: 1700, height }] });
  elevated.fighters[1].y = height;
  advanceSuper(elevated, 2200);
  assert.equal(
    elevated.fighters[1].hp,
    hp,
    "moving P retains the common super height tolerance",
  );
}
for (const facing of [1, -1]) {
  const mixed = new Match({
    mode: "duel",
    format: "3ffa",
    teams: [
      [14, 0, 1],
      [0, 1, 2],
      [1, 2, 3],
    ],
    rules: { maxHealth: 1000, infiniteTime: true },
  });
  mixed.start();
  mixed.advance(3000);
  mixed.drainEvents();
  mixed.fighters[0].x = 0;
  mixed.fighters[0].energy = 100;
  mixed.fighters[1].x = 160 * facing;
  mixed.fighters[2].x = 520 * facing;
  advanceSuper(mixed, 2200);
  const hits = strikes(mixed);
  assert.deepEqual(
    hits.map((h) => h.target).sort(),
    [1, 2],
    "moving box hits both opponents along its path once",
  );
  assert.equal(mixed.fighters[1].hp, 950);
  assert.equal(mixed.fighters[2].hp, 950);
  assert.equal(mixed.fighters[1].energy, 8);
  assert.equal(mixed.fighters[2].energy, 8);
  mixed.advance(1600);
  assert.equal(strikes(mixed).length, 0);
}
console.log(
  "Verified stronger supers and Nonoka's moving headbutt: damage, travel, facing, guards, energy, custom rules, recovery and mixed-battle targets.",
);
