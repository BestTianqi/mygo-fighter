import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { evaluate } from "./kernel.mjs";

const { Match, MOVES, ROSTER } = await evaluate("frontend/src/game/engine.ts", [
  "Match",
  "MOVES",
  "ROSTER",
]);
const { bandFor } = await evaluate("frontend/src/game/combatData.ts", [
  "bandFor",
]);
const { overlaps, hurtbox, sweptContact, ringTouches } = await evaluate(
  "frontend/src/game/match/collision.ts",
  ["overlaps", "hurtbox", "sweptContact", "ringTouches"],
);
const { strikeIndex } = await evaluate("frontend/src/game/data/strikePose.ts", [
  "strikeIndex",
]);
const assets = JSON.parse(
  await readFile(
    new URL("../frontend/public/assets.json", import.meta.url),
    "utf8",
  ),
);
const boxes = JSON.parse(
  await readFile(
    new URL("../frontend/src/game/data/strikeBoxes.json", import.meta.url),
    "utf8",
  ),
);
function scenario(character, form, facing = 1, distance = 92) {
  const match = new Match({
    mode: "duel",
    characters: [character, 1],
    rules: { maxHealth: 1000, infiniteTime: true },
  });
  match.start();
  match.advance(match.phaseMs);
  const [a, b] = match.fighters;
  a.x = 400;
  b.x = a.x + distance * facing;
  a.facing = facing;
  b.facing = -facing;
  if (form === "penguin") a.penguin = { ms: 15000 };
  if (form === "stage") a.stageForm = { ms: 15000 };
  a.energy = 100;
  const forward = facing === 1 ? "right" : "left";
  const step = (input = {}, defense = {}) =>
    match.advance(
      10,
      { unified: true, ...input },
      { unified: true, ...defense },
    );
  const until = (condition, label, defense = {}) => {
    for (let i = 0; i < 115 && !condition(); i++) step({}, defense);
    assert.ok(
      condition(),
      `${ROSTER[character].key}/${form}/${facing} ${label} (${a.attack} at ${a.attackMs} ms, opponent HP ${b.hp})`,
    );
  };
  const hook = () => {
    step({ crouch: true });
    step({ crouch: true, [forward]: true });
    step({ [forward]: true, light: true });
  };
  const dragon = () => {
    step({ [forward]: true });
    step({ crouch: true });
    step({ crouch: true, [forward]: true, heavy: true });
  };
  return { match, a, b, step, until, hook, dragon };
}
let chains = 0;
for (const { id } of ROSTER) {
  const band = bandFor(id);
  const forms = band.transform
    ? ["base", "stage"]
    : id === 2
      ? ["base", "penguin"]
      : ["base"];
  assert.deepEqual(
    Object.keys(assets.strikeAtlases[id]).sort(),
    [...forms].sort(),
  );
  for (const form of forms) {
    const frames = assets.strikeAtlases[id][form].frames,
      contacts = boxes[id][form];
    assert.equal(frames.length, 5);
    assert.equal(contacts.length, 5);
    for (const [i, frame] of frames.entries()) {
      const [near, far, bottom, top, center, bodyHeight] = contacts[i];
      assert.ok(
        near < far &&
          bottom < top &&
          top <= frame.height &&
          Number.isFinite(center) &&
          bodyHeight > 0,
      );
      assert.ok(frame.w > 0 && frame.h > 0 && frame.ay === frame.h);
    }
    for (const facing of [-1, 1]) {
      const { a, b, step, match, until, hook, dragon } = scenario(
        id,
        form,
        facing,
      );
      step({ light: true });
      until(() => a.contact && match.freeze > 0, "opening hit");
      assert.equal(strikeIndex(a, MOVES[a.attack]), 0);
      // Enter the direction changes entirely inside hitstop, as a real player can.
      hook();
      until(
        () => a.attack === "uppercut" && a.contact && match.freeze > 0,
        "buffered uppercut",
      );
      assert.equal(strikeIndex(a, MOVES[a.attack]), 3);
      dragon();
      until(
        () => a.attack === "dragonPunch" && a.contact && a.y > 0,
        "rising finisher",
      );
      assert.equal(strikeIndex(a, MOVES[a.attack]), 4);
      assert.ok(a.combo >= 3 && b.hp < match.options.rules.maxHealth);
      chains++;
    }
    // The three grounded normal commands select three distinct authored cells.
    const { a, b, step, until, match } = scenario(id, form);
    for (let i = 0; i < 3; i++) {
      const before = b.hp;
      step({ light: true });
      until(() => b.hp < before && a.contact, "normal " + (i + 1));
      assert.equal(strikeIndex(a, MOVES[a.attack]), i);
      if (i < 2)
        until(() => !match.freeze && a.attackMs >= 130, "next normal window");
    }
  }
}
{
  const { a, b, match, hook, until } = scenario(0, "base", 1, 420);
  hook();
  until(() => a.attack === "uppercut" && a.attackMs >= 110, "whiff recovery");
  assert.equal(b.hp, 1000);
  assert.equal(match.canCancel(a, "dragonPunch"), false);
}
{
  const { a, match, step, until, hook } = scenario(0, "base");
  hook();
  until(
    () => a.contact && a.attackMs >= 100 && !match.freeze,
    "confirmed hook",
  );
  const slot = bandFor(a.character)
    .schemeFor(a)
    .base.findIndex((name) => MOVES[name].damage > 0 || MOVES[name].projectile);
  assert.ok(slot >= 0);
  const attack = bandFor(a.character).schemeFor(a).base[slot];
  step({ ["skill" + (slot + 1)]: true });
  assert.equal(
    a.attack,
    attack,
    "a native attacking skill cancels a confirmed hook",
  );
}
{
  const { a, until, hook, match } = scenario(0, "base");
  hook();
  until(() => a.attack === "uppercut" && a.attackMs >= 110, "guarded hook", {
    guard: true,
  });
  assert.equal(a.contact, false);
  assert.equal(match.canCancel(a, "dragonPunch"), false);
}
{
  const { match, a, b } = scenario(0, "base");
  a.attack = "uppercut";
  a.attackMs = MOVES.uppercut.start;
  b.x = a.x + 104 + 32;
  assert.equal(
    match.meleeConnects(a, b, MOVES.uppercut, 104, 280),
    false,
    "touching edges",
  );
  b.x -= 0.01;
  assert.equal(match.meleeConnects(a, b, MOVES.uppercut, 104, 280), true);
  b.crouch = true;
  assert.equal(
    match.meleeConnects(a, b, MOVES.uppercut, 104, 280),
    false,
    "high fist passes over crouching target",
  );
  b.y = 400;
  assert.equal(
    match.meleeConnects(a, b, MOVES.uppercut, 104, 280),
    false,
    "clear vertical miss",
  );
  const target = hurtbox(b),
    edge = { ...target, bottom: target.top, top: target.top + 10 };
  assert.equal(overlaps(target, edge), false);
  assert.equal(ringTouches(target, b.x, b.y, 360, 300), false);
  assert.equal(ringTouches(target, b.x - 64, b.y, 44, 0), true);
  assert.equal(
    sweptContact(target, b.x - 350, b.y + 50, b.x + 350, b.y + 50, 2, 2),
    (350 - 36 - 2) / 700,
  );
  assert.equal(
    sweptContact(
      target,
      b.x - 350,
      target.top + 2,
      b.x + 350,
      target.top + 2,
      2,
      2,
    ),
    Infinity,
  );
}
for (const [x, hit] of [
  [534, true],
  [537, false],
]) {
  const { match, a, b } = scenario(0, "base");
  b.x = x;
  match.waves.push({
    owner: 0,
    attack: "wave",
    x: 490,
    y: 95,
    vx: 16000,
    age: 100,
    life: 10,
    rx: 4,
    ry: 6,
    originX: a.x,
    originY: 0,
    maxReach: 100,
    maxVertical: 220,
  });
  match.updateWaves();
  assert.equal(
    b.hp < 1000,
    hit,
    "last projectile sweep at its range cap, against the leading edge",
  );
  assert.equal(match.waves.length, 0);
}
console.log(
  `Verified ${chains} mirrored motion combos, three distinct jab contacts per form, native skill cancels, guards, whiffs and geometric contact.`,
);
