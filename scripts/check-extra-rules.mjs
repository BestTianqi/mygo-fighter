import assert from "node:assert/strict";
import { evaluate } from "./kernel.mjs";

const { Match, FEEL } = await evaluate("frontend/src/game/engine.ts", [
  "Match",
  "FEEL",
]);
const { normalizeBattleRules, DEFAULT_BATTLE_RULES } = await evaluate(
  "frontend/src/game/battleRules.ts",
  ["normalizeBattleRules", "DEFAULT_BATTLE_RULES"],
);
const { BATTLE_RULE_PRESETS } = await evaluate(
  "frontend/src/pages/GamePage/functions/battleRulePresets.ts",
  ["BATTLE_RULE_PRESETS"],
);
const { create: createServer } = await evaluate(
  "frontend/src/game/serverSimulation.ts",
  ["create"],
);
const create = (rules = {}, options = {}) => {
  const match = new Match({
    mode: "duel",
    characters: [0, 1],
    ...options,
    rules,
  });
  match.start();
  match.phase = "fighting";
  return match;
};
const close = (actual, expected, message) =>
  assert.ok(
    Math.abs(actual - expected) < 1e-7,
    `${message}: ${actual} != ${expected}`,
  );
const advanceSecond = (match) => {
  for (let tick = 0; tick < 100; tick++) match.step({}, {}, {});
};

const regen = create({ energyRegen: 10, healthRegen: 5 });
regen.fighters[0].hp = 100;
advanceSecond(regen);
close(regen.fighters[0].energy, 10, "passive energy uses combat seconds");
close(regen.fighters[0].hp, 105, "passive health uses combat seconds");
assert.equal(regen.fighters[1].hp, 200, "health is capped");
regen.fighters[0].energy = 99.99;
regen.fighters[0].hp = 199.99;
regen.step({}, {});
assert.equal(regen.fighters[0].energy, 100, "energy is capped");
assert.equal(regen.fighters[0].hp, 200, "health caps on fractional recovery");

const ordinary = create();
ordinary.fighters[0].hp = 100;
advanceSecond(ordinary);
assert.equal(ordinary.fighters[0].energy, 0, "default has no passive energy");
assert.equal(ordinary.fighters[0].hp, 100, "default has no passive health");
for (const state of ["ready", "roundOver", "paused", "freeze", "KO"]) {
  const match = create({ energyRegen: 20, healthRegen: 20 });
  const fighter = match.fighters[0];
  fighter.hp = state === "KO" ? 0 : 100;
  if (state === "paused") match.paused = true;
  else if (state === "freeze") match.freeze = 100;
  else if (state !== "KO") match.phase = state;
  const hp = fighter.hp;
  match.advance(10);
  assert.equal(fighter.hp, hp, `${state} cannot regenerate health`);
  assert.equal(fighter.energy, 0, `${state} cannot regenerate energy`);
}
const brawl = create(
  { energyRegen: 10, healthRegen: 10 },
  {
    format: "3ffa",
    teams: [
      [0, 1, 2],
      [2, 3, 4],
      [4, 5, 6],
    ],
  },
);
brawl.fighters.forEach((fighter) => {
  fighter.hp = 100;
});
advanceSecond(brawl);
for (const fighter of brawl.fighters) {
  close(fighter.hp, 110, "every brawl side recovers health");
  close(fighter.energy, 10, "every brawl side recovers energy");
}
brawl.fighters[0].hp = 0;
brawl.step({}, {}, {});
assert.ok(brawl.respawnMs[0] > 0);
advanceSecond(brawl);
assert.equal(brawl.fighters[0].hp, 0, "waiting reserves do not revive early");

for (const blink of [false, true]) {
  const free = create({ freeDash: true });
  const start = free.fighters[0].x;
  free.updateFighter(
    0,
    blink ? { unified: true, blink: true } : { dash: true, right: true },
  );
  assert.ok(free.fighters[0].x > start, "free dash/blink works at zero energy");
  assert.equal(
    free.fighters[0].energy,
    0,
    "free movement does not charge energy",
  );
  assert.ok(
    free.fighters[0].dashCooldown > 0,
    "free movement retains cooldown",
  );
  const paid = create({ initialEnergy: 50 });
  paid.updateFighter(
    0,
    blink ? { unified: true, blink: true } : { dash: true, right: true },
  );
  assert.equal(
    paid.fighters[0].energy,
    50 - FEEL.dashCost,
    "default movement still costs energy",
  );
}
const hit = (rules, blocked = false) => {
  const match = create(rules);
  match.fighters[1].guard = blocked;
  match.hit(0, "wave", 280, 100, {
    damage: 10,
    fixedDamage: true,
    push: 100,
    launch: 200,
  });
  return match.fighters[1];
};
for (const multiplier of [0.5, 1.5, 2, 3]) {
  const normal = hit({});
  const boosted = hit({ knockbackMultiplier: multiplier });
  close(
    boosted.pushVx,
    normal.pushVx * multiplier,
    "horizontal knockback scales",
  );
  close(boosted.vy, normal.vy * multiplier, "launch scales");
  assert.equal(boosted.hp, normal.hp, "knockback does not change damage");
  close(
    hit({ knockbackMultiplier: multiplier }, true).pushVx,
    hit({}, true).pushVx * multiplier,
    "blocked push scales",
  );
}
const restricted = create({ energyRegen: 20, disableSupers: true });
restricted.fighters[0].energy = 100;
restricted.fighters[0].buffer = "super";
restricted.fighters[0].bufferMs = 200;
restricted.updateFighter(0, {});
assert.equal(
  restricted.fighters[0].attack,
  null,
  "regeneration cannot bypass a move ban",
);
const infinite = create({ energyRegen: 20, infiniteEnergy: true });
advanceSecond(infinite);
assert.equal(
  infinite.fighters[0].energy,
  100,
  "infinite energy remains capped",
);

const normalized = normalizeBattleRules(
  {
    energyRegen: Infinity,
    healthRegen: -1,
    knockbackMultiplier: 99,
    freeDash: "yes",
  },
  "1v1",
  16,
);
assert.equal(normalized.energyRegen, 0);
assert.equal(normalized.healthRegen, 0);
assert.equal(normalized.knockbackMultiplier, 1);
assert.equal(normalized.freeDash, false);
const clamped = normalizeBattleRules(
  { energyRegen: 100, healthRegen: 4.6 },
  "1v1",
  16,
);
assert.equal(clamped.energyRegen, 20);
assert.equal(clamped.healthRegen, 5);
assert.deepEqual(
  normalizeBattleRules(undefined, "1v1", 16),
  DEFAULT_BATTLE_RULES,
);
for (const preset of BATTLE_RULE_PRESETS) {
  assert.deepEqual(
    normalizeBattleRules(preset.rules, "1v1", 16),
    preset.rules,
    `${preset.label} is normalized`,
  );
}
assert.ok(
  BATTLE_RULE_PRESETS.some(
    ({ rules }) => rules.energyRegen > 0 && rules.freeDash,
  ),
);
assert.ok(BATTLE_RULE_PRESETS.some(({ rules }) => rules.healthRegen > 0));
assert.ok(
  BATTLE_RULE_PRESETS.some(({ rules }) => rules.knockbackMultiplier > 1),
);

// The same rules and inputs must produce identical local and authoritative
// simulation snapshots, including after a pause and a network-style restart.
const options = {
  mode: "duel",
  characters: [0, 1],
  rules: {
    energyRegen: 10,
    healthRegen: 5,
    freeDash: true,
    knockbackMultiplier: 2,
  },
};
const local = new Match(options);
local.start();
const server = createServer(JSON.stringify(options));
const compare = () => {
  const remote = JSON.parse(server.packet()).state;
  assert.deepEqual(
    remote.fighters,
    JSON.parse(JSON.stringify(local.fighters)),
    "LAN and local fighter state match",
  );
  assert.equal(remote.phase, local.phase);
  assert.equal(remote.remaining, local.remaining);
};
local.advance(local.phaseMs);
server.advance(JSON.parse(server.packet()).state.phaseMs);
compare();
let seq = 0;
for (let tick = 0; tick < 500; tick++) {
  const p1 =
    tick < 65 ? { right: true } : tick % 100 < 50 ? { light: true } : {};
  const p2 =
    tick < 65 ? { left: true } : tick % 100 >= 50 ? { heavy: true } : {};
  server.input(0, ++seq, JSON.stringify(p1));
  server.input(1, seq, JSON.stringify(p2));
  local.advance(10, p1, p2);
  server.advance(10);
  compare();
}
assert.ok(
  local.fighters.some((fighter) => fighter.hp < 200),
  "replay exercises actual damage and recovery",
);
local.setPaused(true);
server.pause(true);
local.advance(1000);
server.advance(1000);
compare();
local.restart();
server.restart();
compare();
console.log(
  "Verified passive resources, KO/lifecycle limits, all brawl sides, free dash/blink, knockback, rule normalization and presets.",
);
