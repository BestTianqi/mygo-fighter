import assert from "node:assert/strict";
import { evaluate } from "./kernel.mjs";

const { Match } = await evaluate("frontend/src/game/engine.ts", ["Match"]);
const { normalizeBattleRules } = await evaluate(
  "frontend/src/game/battleRules.ts",
  ["normalizeBattleRules"],
);
const create = (rules = {}) => {
  const m = new Match({ mode: "duel", characters: [0, 1], rules });
  m.start();
  m.phase = "fighting";
  return m;
};
assert.equal(
  create({ roundSeconds: 180 }).remaining,
  180000,
  "custom round duration",
);
const unlimited = create({ infiniteTime: true });
unlimited.remaining = 10;
unlimited.advance(100);
assert.equal(
  unlimited.phase,
  "fighting",
  "infinite time never ends on the clock",
);
assert.equal(unlimited.remaining, 10);
unlimited.fighters[1].hp = 0;
unlimited.step({}, {});
assert.equal(unlimited.phase, "roundOver", "KO still ends infinite-time bouts");
const timed = create();
timed.remaining = 10;
timed.step({}, {});
assert.equal(timed.phase, "roundOver");
assert.equal(timed.reason, "TIME OVER");
assert.equal(create({ initialEnergy: 75 }).fighters[0].energy, 75);
const reserves = new Match({
  mode: "duel",
  format: "2v2",
  teams: [
    [0, 1],
    [2, 3],
  ],
  rules: { initialEnergy: 75 },
});
reserves.start();
reserves.phase = "fighting";
reserves.fighters[0].energy = 42;
reserves.fighters[1].hp = 0;
reserves.endRound();
reserves.phaseMs = 0;
reserves.nextRound();
assert.equal(
  reserves.fighters[0].energy,
  42,
  "surviving fighter retains resources",
);
assert.equal(
  reserves.fighters[1].energy,
  75,
  "reserves use higher configured entry energy",
);

const impact = (m, damage = 40) =>
  m.hit(0, "wave", 280, 100, { damage, fixedDamage: true });
const doubled = create({ damageMultiplier: 2 });
impact(doubled);
assert.equal(doubled.fighters[1].hp, 120, "damage setting scales actual hits");
const halved = create({ damageMultiplier: 0.5 });
halved.hit(0, "wave", 280, 100, { damage: 5, fixedDamage: false });
assert.equal(
  halved.fighters[1].hp,
  197.5,
  "half damage preserves fractional hits",
);
const sudden = create({ oneHitKO: true });
impact(sudden);
assert.equal(sudden.fighters[1].hp, 0);
const guarded = create({ oneHitKO: true });
guarded.fighters[1].guard = true;
impact(guarded);
assert.ok(guarded.fighters[1].hp > 0, "guard chip is not an instant KO");
const shielded = create({ oneHitKO: true });
shielded.fighters[1].shield = { hp: 80, ms: 1000, hitMs: 0 };
impact(shielded);
assert.equal(
  shielded.fighters[1].hp,
  200,
  "a fully absorbed hit cannot trigger KO",
);
const vampire = create({ vampire: true });
vampire.fighters[0].hp = 100;
impact(vampire);
assert.equal(
  vampire.fighters[0].hp,
  110,
  "vampire heals 25% of HP actually removed",
);
const buffed = create({ vampire: true });
buffed.fighters[0].hp = 100;
buffed.fighters[0].lifesteal = { ratio: 0.4, ms: 1000 };
impact(buffed);
assert.equal(
  buffed.fighters[0].hp,
  116,
  "stronger character lifesteal wins without stacking",
);
const noGuard = create({ disableGuard: true });
noGuard.fighters[1].guard = true;
impact(noGuard);
assert.equal(noGuard.fighters[1].hp, 160);
noGuard.updateFighter(0, { guard: true, left: true });
assert.equal(
  noGuard.fighters[0].guard,
  false,
  "guard key and walking back cannot guard",
);

const walk = (rules) => {
  const m = create(rules);
  m.updateFighter(0, { right: true });
  return m.fighters[0].vx;
};
assert.equal(walk({ speedMultiplier: 2 }), walk({}) * 2);
const blinkDistance = (rules) => {
  const m = create({ infiniteEnergy: true, ...rules });
  const x = m.fighters[0].x;
  m.updateFighter(0, { unified: true, blink: true });
  return m.fighters[0].x - x;
};
assert.ok(
  Math.abs(blinkDistance({ speedMultiplier: 2 }) - blinkDistance({}) * 2) <
    1e-8,
  "blink distance scales with movement speed",
);
const jump = (rules) => {
  const m = create(rules);
  m.updateFighter(0, { jump: true });
  for (let n = 0; n < 20; n++) m.updateFighter(0, {});
  return m.fighters[0].y;
};
assert.ok(
  jump({ lowGravity: true }) > jump({}),
  "low gravity produces a higher arc",
);
const air = create({ infiniteJumps: true });
air.fighters[0].y = 100;
air.fighters[0].jumps = 0;
air.updateFighter(0, { jump: true });
assert.ok(
  air.fighters[0].vy > 0,
  "air jump remains available after the normal jump budget",
);
const ordinary = create();
ordinary.fighters[0].y = 100;
ordinary.fighters[0].jumps = 0;
ordinary.updateFighter(0, { jump: true });
assert.ok(ordinary.fighters[0].vy < 0);
const normalized = normalizeBattleRules(
  {
    roundSeconds: 0,
    initialEnergy: 200,
    damageMultiplier: NaN,
    speedMultiplier: Infinity,
  },
  "1v1",
  16,
);
assert.equal(normalized.roundSeconds, 30);
assert.equal(normalized.initialEnergy, 100);
assert.equal(normalized.damageMultiplier, 1);
assert.equal(normalized.speedMultiplier, 1);
console.log(
  "Verified round time, starting energy, damage/speed, one-hit KO, vampire, guard and aerial rules.",
);
