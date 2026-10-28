import assert from "node:assert/strict";
import { evaluate } from "./kernel.mjs";

const { Match, MOVES, ROSTER } = await evaluate("frontend/src/game/engine.ts", [
  "Match",
  "MOVES",
  "ROSTER",
]);
const { normalizeBattleRules, maxBanCount } = await evaluate(
  "frontend/src/game/battleRules.ts",
  ["normalizeBattleRules", "maxBanCount"],
);
const { schemeFor } = await evaluate("frontend/src/game/controls.ts", [
  "schemeFor",
]);
const create = (rules = {}, options = {}) => {
  const match = new Match({
    mode: "duel",
    characters: [0, 1],
    rules,
    ...options,
  });
  match.start();
  match.phase = "fighting";
  return match;
};
assert.equal(create().fighters[0].hp, 200, "default health remains 200");
assert.equal(
  create({ maxHealth: 750 }).fighters[0].hp,
  750,
  "custom health applies at entry",
);
const wheel = create(
  { maxHealth: 500 },
  {
    format: "5v5",
    teams: [
      [0, 1, 2, 3, 4],
      [5, 6, 7, 8, 9],
    ],
  },
);
assert.equal(wheel.isTeamBattle, true);
assert.deepEqual([...wheel.teamRemaining], [5, 5]);
for (let index = 0; index < 5; index++) {
  wheel.fighters[1].hp = 0;
  wheel.endRound();
  if (index < 4) {
    assert.equal(
      wheel.phase,
      "roundOver",
      "wheel continues past the third fighter",
    );
    wheel.phaseMs = 0;
    wheel.nextRound();
    assert.equal(wheel.fighters[1].character, index + 6);
    assert.equal(wheel.fighters[1].hp, 500);
    assert.equal(wheel.fighters[1].energy, 30);
    wheel.phase = "fighting";
  }
}
assert.equal(wheel.phase, "finished");
assert.equal(wheel.winner, 0);

function attempt(match, name) {
  const f = match.fighters[0];
  f.energy = 100;
  f.buffer = name;
  f.bufferMs = 300;
  match.updateFighter(0, {});
  return f.attack;
}
assert.equal(attempt(create({ disableNormals: true }), "light"), null);
assert.equal(attempt(create({ disableNormals: true }), "heavyKick"), null);
assert.equal(attempt(create({ disableSupers: true }), "super"), null);
assert.equal(attempt(create({ disableNormals: true }), "wave"), "wave");
const infinite = create({ infiniteEnergy: true });
assert.equal(infinite.fighters[0].energy, 100, "infinite energy starts full");
assert.equal(attempt(infinite, "wave"), "wave");
assert.equal(
  infinite.fighters[0].energy,
  100,
  "skill costs do not lower infinite energy",
);
const form = create({ disableTransform: true }, { characters: [8, 0] });
form.fighters[0].energy = 100;
form.updateFighter(0, { unified: true, transform: true });
assert.equal(
  form.fighters[0].stageForm,
  null,
  "H cannot bypass transformation ban",
);
assert.equal(form.fighters[0].energy, 100);
const cooldown = create({ noCooldowns: true });
cooldown.fighters[0].moveCooldowns.wave = 5000;
assert.equal(
  attempt(cooldown, "wave"),
  "wave",
  "skill recast restrictions can be disabled",
);
const recovery = cooldown.fighters[0].attack;
cooldown.updateFighter(0, {});
assert.equal(
  cooldown.fighters[0].attack,
  recovery,
  "no cooldown preserves attack animation",
);
assert.equal(MOVES.wave.category, "special");

assert.equal(maxBanCount(1, ROSTER.length), 7);
assert.equal(maxBanCount(8, ROSTER.length), 0);
assert.equal(
  normalizeBattleRules({ maxHealth: NaN, banCount: 99 }, "5v5", 16).banCount,
  3,
);
assert.equal(
  normalizeBattleRules({ maxHealth: 99999 }, "1v1", 16).maxHealth,
  2000,
);
assert.equal(normalizeBattleRules({ maxHealth: -10 }, "1v1", 16).maxHealth, 50);
const healed = create({ maxHealth: 750 }, { characters: [1, 0] });
healed.fighters[0].hp = 745;
healed.fighters[0].attack = "heal";
healed.fighters[0].attackMs = MOVES.heal.start - 10;
healed.step({}, {});
assert.equal(healed.fighters[0].hp, 750, "healing respects custom maximum");
const steal = create({ maxHealth: 750 });
steal.fighters[0].hp = 745;
steal.fighters[0].lifesteal = { ratio: 0.4, ms: 10000 };
steal.hit(0, "light", 0, 0, { damage: 50, fixedDamage: true });
assert.equal(steal.fighters[0].hp, 750, "lifesteal respects custom maximum");
const ordinary = create();
ordinary.fighters[0].moveCooldowns.wave = 5000;
assert.equal(
  attempt(ordinary, "wave"),
  null,
  "standard recast restriction remains",
);
const dash = create({ infiniteEnergy: true });
dash.updateFighter(0, { unified: true, blink: true });
assert.equal(
  dash.fighters[0].energy,
  100,
  "blink is also free with infinite energy",
);

let formsChecked = 0;
for (const character of ROSTER) {
  const states = [{}];
  if (character.id >= 5 && character.id <= 9)
    states.push({ stageForm: { ms: 10000 } });
  if (character.id === 2) states.push({ penguin: { ms: 10000 } });
  for (const form of states) {
    const blocked = create(
      { disableNormals: true, disableSupers: true, disableTransform: true },
      { characters: [character.id, 0] },
    );
    const f = blocked.fighters[0];
    Object.assign(f, form, { energy: 100 });
    for (const input of [
      { light: true },
      { heavy: true },
      { crouch: true, light: true },
      { right: true, heavy: true },
      { super: true },
      { transform: true },
    ]) {
      const unified = { unified: true, ...input };
      assert.equal(
        blocked.resolveAttack(f, unified, (key) => !!unified[key]),
        null,
        `${character.key} banned command blocked in all forms`,
      );
    }
    const superName = schemeFor(f).super;
    if (superName) assert.equal(attempt(blocked, superName), null);
    formsChecked++;
  }
  const cpu = create(
    {
      disableNormals: true,
      disableSupers: true,
      disableTransform: true,
      infiniteEnergy: true,
    },
    { mode: "cpu", characters: [0, character.id] },
  );
  cpu.fighters[1].x = 400;
  for (let n = 0; n < 30; n++) {
    cpu.aiThink = 0;
    const input = cpu.aiInput();
    const attack = cpu.resolveAttack(
      cpu.fighters[1],
      input,
      (key) => !!input[key],
    );
    if (attack)
      assert.ok(
        !["normal", "super", "transformation"].includes(MOVES[attack].category),
        `${character.key} CPU obeys rules`,
      );
  }
}
assert.throws(
  () =>
    create(
      {},
      {
        format: "8v8",
        teams: [
          [0, 1],
          [2, 3],
        ],
      },
    ),
  /eight|8/,
);
console.log(
  `Verified custom health/healing, five-person wheel, ${formsChecked} forms, CPU action bans, infinite energy and recast rules.`,
);
