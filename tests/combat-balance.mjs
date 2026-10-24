import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
const { outputFiles } = await build({
  stdin: {
    contents: "export {Match,MOVES,ROSTER} from './frontend/src/game/engine'",
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const { Match, MOVES, ROSTER } = await import(
  "data:text/javascript;base64," +
    Buffer.from(outputFiles[0].text).toString("base64")
);

// Test contact beyond the former heavy range, across every playable form.
const contacts = [
  [0, "normal", 140],
  [1, "normal", 140],
  [2, "normal", 130],
  [2, "penguin", 140],
  [3, "normal", 145],
  [4, "normal", 150],
  [5, "normal", 165],
  [5, "stage", 180],
  [6, "normal", 160],
  [6, "stage", 170],
  [7, "normal", 160],
  [7, "stage", 170],
  [8, "normal", 165],
  [8, "stage", 180],
  [9, "normal", 160],
  [9, "stage", 170],
  ...[10, 11, 12, 13, 14].map((id) => [id, "normal", 170]),
];
function ready(id, form, distance = 110) {
  const m = new Match({ mode: "duel", characters: [id, 1] });
  m.start();
  m.advance(2000);
  const [a, b] = m.fighters;
  a.x = 280;
  b.x = a.x + distance;
  if (form === "stage") a.stageForm = { ms: 20000 };
  if (form === "penguin") a.penguin = { ms: 20000 };
  return { m, a, b };
}
for (const [id, form, distance] of contacts)
  test(`${id} ${form}: heavy connects at the expanded range`, () => {
    const { m, a, b } = ready(id, form, distance);
    m.advance(10, { unified: true, heavy: true });
    const attack = a.attack;
    assert(attack);
    m.advance(350);
    const hits = m
      .drainEvents()
      .filter((e) => e.type === "hit" && e.attack === attack);
    assert.equal(hits.length, 1);
    assert(b.hp < 200);
    const formerDamage =
      id === 4 ? 15 : id === 3 || form === "penguin" ? 11 : 12;
    assert(hits[0].damage < formerDamage, "Normal damage is slightly lower");
  });
test("light attacks and followups deal lower damage without changing skill damage", () => {
  assert.equal(MOVES.light.damage, 5);
  assert.equal(MOVES.anonJab2.damage, 7);
  assert.equal(MOVES.anonJab3.damage, 12);
  assert.equal(MOVES.heavy.damage, 11);
  assert.equal(ROSTER[4].heavyDamage, 14);
  assert.equal(MOVES.sonic.damage, 22);
  assert.equal(MOVES.mewtype_12_virtual_super.damage, 50);
  assert.equal(MOVES.mewtype_12_virtual_i.damage, 24);
});
test("strong crouching and aerial attacks also gain range", () => {
  for (const key of [
    "crouch_heavy",
    "air_heavy",
    "penguin_crouch_heavy",
    "rana_air_heavy",
    "riki_crouch_heavy",
    "mujica_8_stage_air_heavy",
    "mewtype_14_virtual_crouch_heavy",
  ])
    assert(MOVES[key].reach >= 145, key);
  assert.equal(
    Math.round(MOVES.light.reach),
    196,
    "Light attacks keep their current reach",
  );
});
