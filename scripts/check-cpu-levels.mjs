import assert from "node:assert/strict";
import { evaluate } from "./kernel.mjs";

const { Match, ROSTER, MOVES } = await evaluate("frontend/src/game/engine.ts", [
  "Match",
  "ROSTER",
  "MOVES",
]);
const fresh = (difficulty, extra = {}) => {
  const match = new Match({
    mode: "cpu",
    difficulty,
    seed: 731,
    characters: [0, 0],
    ...extra,
  });
  match.start();
  match.advance(match.phaseMs);
  match.aiThink = 0;
  return match;
};

for (const level of [0, 1, 2, 3, 4, 5, -1, 99, NaN]) {
  const match = fresh(level);
  match.aiInput();
  assert(
    Number.isFinite(match.aiThink),
    `finite reaction delay at level ${level}`,
  );
}

console.log("PASS all CPU levels have finite reaction delays");

const close = (match) => {
  match.fighters[0].x = 400;
  match.fighters[1].x = 510;
  match.fighters[0].facing = 1;
  match.fighters[1].facing = -1;
};

// Defend the attack's actual height, including an overhead from a crouching foe.
for (const [attack, crouch] of [
  ["crouch_light", true],
  ["overhead", false],
]) {
  const match = fresh(5);
  close(match);
  Object.assign(match.fighters[0], { attack, attackMs: 0, crouch: true });
  const input = match.aiInput();
  assert.equal(input.guard, true, `guard ${attack}`);
  assert.equal(input.crouch, crouch, `correct guard height for ${attack}`);
}
console.log("PASS advanced guard reads low/overhead attacks");

const heldGuard = fresh(5);
close(heldGuard);
Object.assign(heldGuard.fighters[0], { attack: "crouch_light", attackMs: 0 });
heldGuard.advance(10);
assert(heldGuard.fighters[1].guard && heldGuard.fighters[1].crouch);
heldGuard.advance(10);
assert(
  heldGuard.fighters[1].guard && heldGuard.fighters[1].crouch,
  "low guard persists between reaction decisions",
);

const projectile = fresh(5);
projectile.fighters[0].x = 0;
projectile.fighters[1].x = 700;
projectile.waves.push({
  owner: 0,
  attack: "wave",
  x: 540,
  y: 100,
  vx: 600,
  age: 0,
  life: 1000,
});
assert.equal(
  projectile.aiInput().guard,
  true,
  "reacts to incoming projectiles",
);
console.log("PASS held low guard and projectile defense");

const combo = fresh(5);
close(combo);
Object.assign(combo.fighters[1], {
  attack: "light",
  attackMs: MOVES.light.start + 30,
  contact: true,
  hit: true,
  energy: 100,
});
const followup = combo.aiInput();
const name = combo.resolveAttack(
  combo.fighters[1],
  followup,
  (key) => !!followup[key],
);
assert(
  name && combo.canCancel(combo.fighters[1], name),
  "CPU uses a legal confirmed cancel",
);
assert.equal(
  combo.fighters[1].energy,
  100,
  "decision cannot grant or consume energy",
);
console.log("PASS advanced CPU chooses a legal hit-confirmed combo");

// A normal cannot be thrown out across the screen when no ranged skill is affordable.
const far = fresh(5);
far.fighters[0].x = 0;
far.fighters[1].x = 900;
far.fighters[1].energy = 0;
const approach = far.aiInput();
assert(approach.left && !approach.light && !approach.heavy);
console.log("PASS advanced CPU closes distance without whiffing normals");

const freeDash = fresh(5, { rules: { freeDash: true } });
freeDash.fighters[0].x = 0;
freeDash.fighters[1].x = 900;
freeDash.fighters[1].energy = 0;
assert.equal(freeDash.aiInput().dash, true, "free dash needs no energy");

function play(level, character, seed = 731, rules = {}) {
  const match = fresh(level, { characters: [0, character], seed, rules });
  const trace = [];
  for (let frame = 0; frame < 1500 && match.phase === "fighting"; frame++) {
    const [player, cpu] = match.fighters;
    match.advance(10, {
      left: player.x > cpu.x,
      right: player.x < cpu.x,
      light: frame % 24 === 0,
      heavy: frame % 53 === 0,
    });
    trace.push(
      ...match
        .drainEvents()
        .filter((event) => ["attack", "hit", "block"].includes(event.type)),
    );
  }
  assert(Number.isFinite(match.aiThink));
  for (const f of match.fighters)
    for (const key of ["x", "y", "hp", "energy"])
      assert(
        Number.isFinite(f[key]),
        `level ${level}, character ${character}: ${key}`,
      );
  return {
    trace,
    hp: match.fighters.map((f) => f.hp),
    energy: match.fighters.map((f) => f.energy),
  };
}

const totals = [];
for (let level = 0; level <= 5; level++) {
  let damage = 0,
    received = 0,
    attacks = 0;
  for (let character = 0; character < ROSTER.length; character++) {
    const result = play(level, character);
    damage += 200 - result.hp[0];
    received += 200 - result.hp[1];
    const cpuAttacks = result.trace.filter(
      (e) => e.type === "attack" && e.side === 1,
    );
    assert(
      cpuAttacks.length > 0,
      `level ${level}, character ${character} acts`,
    );
    attacks += cpuAttacks.length;
    if (level >= 3)
      assert.deepEqual(play(level, character), result, "seeded match replay");
  }
  totals.push({
    level,
    damage: Math.round(damage),
    received: Math.round(received),
    attacks,
  });
}
console.table(totals);
assert(
  totals[3].damage > totals[2].damage &&
    totals[3].received < totals[2].received,
  "expert outperforms serious against the same scripted pressure",
);
for (const level of [4, 5])
  assert(
    totals[level].damage > totals[level - 1].damage &&
      totals[level].received < totals[level - 1].received,
    `level ${level} improves pressure and defense over the previous tier`,
  );
console.log(
  `PASS all ${ROSTER.length} characters across six levels; advanced replays deterministic`,
);

for (const level of [3, 4, 5]) {
  const result = play(level, 0, 917, {
    disableNormals: true,
    disableSupers: true,
    disableTransform: true,
    disableGuard: true,
  });
  const cpuAttacks = result.trace.filter(
    (e) => e.type === "attack" && e.side === 1,
  );
  assert(cpuAttacks.length > 0);
  assert(
    cpuAttacks.every(
      (e) =>
        !["normal", "super", "transformation"].includes(
          MOVES[e.attack].category,
        ),
    ),
  );
}
console.log("PASS advanced CPUs honor disabled action rules");

for (const level of [3, 4, 5]) {
  const brawl = fresh(level, {
    format: "3ffa",
    teams: [
      [0, 1, 2],
      [5, 6, 7],
      [13, 14, 15],
    ],
  });
  const acted = new Set();
  for (let frame = 0; frame < 2000; frame++) {
    brawl.advance(10, { light: frame % 24 === 0 });
    for (const event of brawl.drainEvents())
      if (event.type === "attack") acted.add(event.side);
    for (const side of [1, 2])
      assert(Number.isFinite(brawl.aiStates[side].think));
  }
  assert(acted.has(1) && acted.has(2), `both brawl CPUs act at level ${level}`);
}
console.log("PASS independent CPU decisions in three-player brawls");
