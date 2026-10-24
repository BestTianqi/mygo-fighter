import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { readFileSync } from "node:fs";

const { outputFiles } = await build({
  stdin: {
    contents: `export { Match, MOVES, moveList } from './frontend/src/game/engine';
      export { schemeFor, bindingList } from './frontend/src/game/controls';
      export { createAnimator } from './frontend/src/game/animation';
      export { presentationFor } from './frontend/src/pages/GamePage/functions/presentationFor';
      export { create } from './frontend/src/game/serverSimulation';
      export { Prediction } from './frontend/src/game/Prediction';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const {
  Match,
  MOVES,
  moveList,
  schemeFor,
  bindingList,
  createAnimator,
  presentationFor,
  create,
  Prediction,
} = await import(
  "data:text/javascript;base64," +
    Buffer.from(outputFiles[0].text).toString("base64")
);
const prefix = "mujica_5_stage_";
const assets = JSON.parse(readFileSync("frontend/public/assets.json", "utf8"));
function setup(side = 0, distance = 300) {
  const m = new Match({ mode: "duel", characters: side ? [1, 5] : [5, 1] });
  m.start();
  m.advance(2000);
  const a = m.fighters[side],
    b = m.fighters[1 - side];
  a.x = 480;
  b.x = a.x + (side ? -1 : 1) * distance;
  a.energy = 100;
  a.stageForm = { ms: 18000 };
  return { m, a, b };
}
function cast(m, button, side = 0, down = false) {
  const input = {
    unified: true,
    [button]: true,
    pressDirections: { [button]: down ? { crouch: true } : {} },
  };
  m.advance(10, side ? {} : input, side ? input : {});
}
test("normal form and super stay intact; the extra stage counter is discoverable", () => {
  assert.equal(
    schemeFor({ character: 5, stageForm: true }).variants.down1,
    prefix + "schedule",
  );
  assert.equal(schemeFor({ character: 5 }).variants.down1, undefined);
  assert(
    bindingList({ character: 5, stageForm: true }).some(
      (row) => row.key === "↓＋U" && row.move === prefix + "schedule",
    ),
  );
  assert(moveList(5, true).some((move) => move.key === prefix + "schedule"));
  assert(!moveList(5, false).some((move) => move.key === prefix + "schedule"));
  assert.equal(MOVES.mujica_5_normal_u.damage, 16);
  assert.equal(MOVES.mujica_5_normal_i.counterDamage, 18);
  assert.equal(MOVES.mujica_5_normal_o.damage, 25);
  assert.equal(MOVES[prefix + "super"].category, "super");
});
for (const side of [0, 1]) {
  test(`three low bass waves reach a distant target on side ${side}`, () => {
    const { m, a, b } = setup(side, 440);
    cast(m, "skill1", side);
    assert.equal(a.energy, 80);
    assert.equal(MOVES[prefix + "u"].umiri, "bass");
    assert.equal(MOVES[prefix + "u"].level, "low");
    m.advance(2500);
    const hits = m
      .drainEvents()
      .filter((e) => e.type === "hit" && e.attack === prefix + "u");
    assert.equal(hits.length, 3);
    assert.equal(hits[0].damage, 7.2);
    assert.equal(b.energy, 8);
    assert.equal(a.energy, 86);
  });
  test(`bass hook draws the target in before a distinct lifting follow-up on side ${side}`, () => {
    const { m, a, b } = setup(side, 320),
      initial = Math.abs(b.x - a.x);
    cast(m, "skill2", side);
    assert.equal(a.energy, 75);
    const hits = [];
    let pulled = false,
      launched = false;
    for (let i = 0; i < 160; i++) {
      m.advance(10);
      for (const hit of m
        .drainEvents()
        .filter((e) => e.type === "hit" && e.attack === prefix + "i")) {
        hits.push(hit);
        if (hits.length === 1) pulled = Math.abs(b.x - a.x) < initial - 100;
      }
      launched ||= b.launched && b.knockdown > 0;
    }
    assert.equal(hits.length, 2);
    assert(pulled);
    assert(launched);
    assert.equal(b.energy, 8);
    assert.equal(a.energy, 79);
  });
  test(`zero-calorie advancing throw catches guard and knocks down on side ${side}`, () => {
    const { m, a, b } = setup(side, 210),
      x = a.x;
    cast(m, "skill3", side);
    assert.equal(a.energy, 70);
    let knockdown = false;
    for (let i = 0; i < 130; i++) {
      m.advance(10, side ? { guard: true } : {}, side ? {} : { guard: true });
      knockdown ||= b.knockdown > 0;
    }
    const hits = m
      .drainEvents()
      .filter((e) => e.type === "hit" && e.attack === prefix + "o");
    assert.equal(hits.length, 1);
    assert(!hits[0].blocked);
    assert.equal(hits[0].damage, 31.2);
    assert(knockdown);
    assert(Math.abs(a.x - x) > 50);
    assert.equal(b.energy, 8);
    assert.equal(a.energy, 72);
  });
}
test("low waves can be duck-guarded or jumped; the advancing throw can whiff", () => {
  for (const input of [{ guard: true, crouch: true }, { jump: true }]) {
    const { m, b } = setup(0, 440);
    cast(m, "skill1");
    if (input.jump) m.advance(550);
    m.advance(10, {}, input);
    m.advance(input.jump ? 1000 : 1400, {}, input);
    if (input.guard) {
      const hits = m
        .drainEvents()
        .filter((e) => e.type === "hit" && e.attack === prefix + "u");
      assert.equal(hits.length, 3);
      assert(hits.every((e) => e.blocked));
      assert.equal(b.energy, 3);
    } else assert.equal(b.hp, 200);
  }
  const { m, b } = setup(0, 500);
  cast(m, "skill3");
  m.advance(1500);
  assert.equal(b.hp, 200);
});
test("schedule counter protects only the front during its active window", () => {
  const key = prefix + "schedule";
  assert(MOVES[key]);
  for (const [age, front] of [
    [50, true],
    [180, true],
    [180, false],
    [500, true],
  ]) {
    const { m, a, b } = setup(0, 140);
    cast(m, "skill1", 0, true);
    assert.equal(a.energy, 80);
    assert(a.moveCooldowns[key] > 3000);
    a.attackMs = age;
    m.hit(1, "light", a.x + (front ? 100 : -100), 100);
    if (age === 180 && front) {
      assert.equal(a.hp, 200);
      assert(m.waves.some((w) => w.attack === key + "_counter"));
      assert.equal(MOVES[key + "_counter"].umiri, "schedule");
    } else assert(a.hp < 200);
  }
});
test("stage skills use intact authored poses and correctly named original voices", () => {
  const { m, a } = setup(),
    animate = createAnimator(),
    frames = assets.mujicaForms[5].stage.frames;
  for (const slot of ["u", "i", "o", "schedule"]) {
    const key = prefix + slot,
      move = MOVES[key];
    assert(move);
    a.attack = key;
    for (const time of [
      move.start / 2,
      move.start + 10,
      move.end - 10,
      move.duration - 20,
    ]) {
      a.attackMs = time;
      assert(frames.some((f) => f.name === animate(m, 0)));
    }
    const media = presentationFor(assets, a, key);
    assert.equal(media.label, move.name);
    assert(assets.memeVoices[media.voice]);
    assert(!media.video);
  }
  a.attack = prefix + "i";
  a.attackMs = 200;
  const first = animate(m, 0);
  a.attackMs = 430;
  assert.notEqual(animate(m, 0), first);
  a.attack = prefix + "o";
  a.attackMs = 190;
  assert.equal(animate(m, 0), "throw-release");
});
for (const [button, suffix, down] of [
  ["skill1", "u", false],
  ["skill2", "i", false],
  ["skill3", "o", false],
  ["skill1", "schedule", true],
])
  test(`LAN authority and prediction agree on stage ${suffix}`, () => {
    const options = { mode: "practice", characters: [5, 1], seed: 123 },
      server = create(JSON.stringify(options));
    server.advance(2000);
    server.input(0, 1, JSON.stringify({ unified: true, transform: true }));
    server.advance(1000);
    assert(JSON.parse(server.packet()).state.fighters[0].stageForm);
    server.input(
      0,
      2,
      JSON.stringify({ unified: true, [button]: true, crouch: down }),
    );
    server.advance(200);
    const packet = JSON.parse(server.packet());
    assert.equal(packet.state.fighters[0].attack, prefix + suffix);
    const client = new Match(options);
    client.start();
    const prediction = new Prediction();
    prediction.receive(client, packet, 0, 1000, 0);
    for (let i = 1; i <= 80; i++) {
      prediction.advance(client, 1000 + i * 10, 10);
      server.advance(10);
      const state = JSON.parse(server.packet()).state;
      assert.deepEqual(JSON.parse(JSON.stringify(client.waves)), state.waves);
      for (const side of [0, 1]) {
        assert.equal(client.fighters[side].hp, state.fighters[side].hp);
        assert.equal(client.fighters[side].energy, state.fighters[side].energy);
      }
      if (i % 8 === 0)
        prediction.receive(
          client,
          JSON.parse(server.packet()),
          0,
          1000 + i * 10,
          0,
        );
    }
  });
