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
const prefix = "mujica_9_stage_";
const assets = JSON.parse(readFileSync("frontend/public/assets.json", "utf8"));
function setup(side = 0, distance = 140) {
  const m = new Match({ mode: "duel", characters: side ? [1, 9] : [9, 1] });
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
test("stage U/I/O have the unmask, sticks and encore identities", () => {
  assert.equal(MOVES[prefix + "u"].nyamu, "reveal");
  assert.equal(MOVES[prefix + "i"].nyamu, "sticks");
  assert.equal(MOVES[prefix + "o"].nyamu, "encore");
  assert(MOVES[prefix + "i"].projectile);
  assert.equal(MOVES[prefix + "i"].shots.length, 2);
});
test("stage down U adds a fourth skill and leaves normal-form commands intact", () => {
  assert.equal(
    schemeFor({ character: 9, stageForm: true }).variants.down1,
    prefix + "smile",
  );
  assert.equal(schemeFor({ character: 9 }).variants.down1, undefined);
  assert(
    bindingList({ character: 9, stageForm: true }).some(
      (row) => row.key === "↓＋U" && row.move === prefix + "smile",
    ),
  );
  assert(moveList(9, true).some((move) => move.key === prefix + "smile"));
  assert(!moveList(9, false).some((move) => move.key === prefix + "smile"));
  for (const [slot, damage] of [
    ["u", 16],
    ["i", 16],
    ["o", 22],
  ])
    assert.equal(MOVES["mujica_9_normal_" + slot].damage, damage);
});
for (const side of [0, 1]) {
  test(`unmask flash hits either direction and respects range on side ${side}`, () => {
    for (const distance of [-130, 130, 320]) {
      const { m, a, b } = setup(side, distance);
      cast(m, "skill1", side);
      assert.equal(a.attack, prefix + "u");
      assert.equal(a.energy, 80);
      let hit;
      for (let n = 0; n < 60 && !hit; n++) {
        m.advance(10);
        hit = m
          .drainEvents()
          .find((e) => e.type === "hit" && e.attack === prefix + "u");
      }
      if (Math.abs(distance) < 240) {
        assert(hit);
        assert.equal(hit.damage, 16.8);
        assert(b.stun >= 500);
        assert.equal(b.energy, 8);
      } else {
        assert(!hit);
        assert.equal(b.hp, 200);
      }
    }
  });
  test(`two thrown sticks reach a distant target with split resonance on side ${side}`, () => {
    const { m, a, b } = setup(side, 400);
    cast(m, "skill2", side);
    assert.equal(a.attack, prefix + "i");
    assert.equal(a.energy, 75);
    m.advance(1800);
    const hits = m
      .drainEvents()
      .filter((e) => e.type === "hit" && e.attack === prefix + "i");
    assert.equal(hits.length, 2);
    assert.equal(b.energy, 8);
    assert.equal(a.energy, 79);
    assert.equal(hits[0].damage, 9.6);
  });
  test(`encore advances, lands four drum beats and ends in knockdown on side ${side}`, () => {
    const { m, a, b } = setup(side);
    const x = a.x;
    cast(m, "skill3", side);
    assert.equal(a.attack, prefix + "o");
    assert.equal(a.energy, 70);
    const hits = [];
    let knockdown = false;
    for (let n = 0; n < 220; n++) {
      m.advance(10);
      hits.push(
        ...m
          .drainEvents()
          .filter((e) => e.type === "hit" && e.attack === prefix + "o"),
      );
      knockdown ||= b.knockdown > 0;
    }
    assert.equal(hits.length, 4);
    assert(knockdown);
    assert(Math.abs(a.x - x) > 20);
    assert.equal(b.energy, 8);
    assert.equal(a.energy, 78);
  });
}
test("perfect-smile counter costs energy, has a cooldown, and counters only in its window", () => {
  const key = prefix + "smile";
  assert(MOVES[key]);
  for (const age of [50, 180, 480]) {
    const { m, a, b } = setup();
    cast(m, "skill1", 0, true);
    assert.equal(a.attack, key);
    assert.equal(a.energy, 80);
    assert(a.moveCooldowns[key] > 3000);
    a.attackMs = age;
    m.hit(1, "light", b.x, 100);
    assert.equal(a.hp, age === 180 ? 200 : age === 50 ? 194 : 195);
    if (age === 180) {
      assert(m.waves.some((w) => w.attack === key + "_counter"));
      assert.equal(a.attack, null);
    }
  }
});
test("new skills select existing intact poses and their own media labels", () => {
  const { m, a } = setup();
  const animate = createAnimator();
  for (const slot of ["u", "i", "o", "smile"]) {
    const key = prefix + slot,
      move = MOVES[key];
    assert(move);
    a.attack = key;
    for (const time of [move.start / 2, move.start + 10, move.duration - 20]) {
      a.attackMs = time;
      const pose = animate(m, 0);
      assert(
        assets.mujicaForms[9].stage.frames.some((f) => f.name === pose),
        pose,
      );
    }
    const media = presentationFor(assets, a, key);
    assert.equal(media.label, move.name);
    assert(assets.memeVoices[media.voice]);
    assert(!media.video, "ordinary skills should not open the ultimate video");
  }
});

for (const [button, suffix, down] of [
  ["skill1", "u", false],
  ["skill2", "i", false],
  ["skill3", "o", false],
  ["skill1", "smile", true],
])
  test(`LAN authority and prediction agree on stage ${suffix}`, () => {
    const options = { mode: "practice", characters: [9, 1], seed: 123 };
    const server = create(JSON.stringify(options));
    server.advance(2000);
    server.input(0, 1, JSON.stringify({ unified: true, transform: true }));
    server.advance(1000);
    assert(JSON.parse(server.packet()).state.fighters[0].stageForm);
    server.input(
      0,
      2,
      JSON.stringify({ unified: true, [button]: true, crouch: down }),
    );
    server.advance(180);
    const packet = JSON.parse(server.packet());
    assert.equal(packet.acks[0], 2);
    assert.equal(packet.state.fighters[0].attack, prefix + suffix);
    const client = new Match(options);
    client.start();
    const prediction = new Prediction();
    prediction.receive(client, packet, 0, 1000, 0);
    for (let i = 1; i <= 50; i++) {
      prediction.advance(client, 1000 + i * 10, 10);
      server.advance(10);
      if (i % 8 === 0)
        prediction.receive(
          client,
          JSON.parse(server.packet()),
          0,
          1000 + i * 10,
          0,
        );
    }
    const state = JSON.parse(server.packet()).state;
    assert.deepEqual(client.waves, state.waves);
    for (const side of [0, 1]) {
      assert.equal(client.fighters[side].hp, state.fighters[side].hp);
      assert.equal(client.fighters[side].energy, state.fighters[side].energy);
      assert.equal(client.fighters[side].attack, state.fighters[side].attack);
    }
  });
