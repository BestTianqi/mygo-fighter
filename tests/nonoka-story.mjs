import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { readFileSync } from "node:fs";
const { outputFiles } = await build({
  stdin: {
    contents: `export {Match,MOVES,moveList} from './frontend/src/game/engine';
    export {schemeFor,bindingList} from './frontend/src/game/controls';
    export {createAnimator} from './frontend/src/game/animation';
    export {presentationFor} from './frontend/src/pages/GamePage/functions/presentationFor';
    export {create} from './frontend/src/game/serverSimulation';
    export {Prediction} from './frontend/src/game/Prediction';`,
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
const prefix = "mewtype_14_virtual_",
  assets = JSON.parse(readFileSync("frontend/public/assets.json", "utf8"));
function setup(side = 0, distance = 120) {
  const m = new Match({ mode: "duel", characters: side ? [1, 14] : [14, 1] });
  m.start();
  m.advance(2000);
  const a = m.fighters[side],
    b = m.fighters[1 - side];
  a.x = 480;
  b.x = a.x + (side ? -1 : 1) * distance;
  a.energy = 100;
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
test("all active skill names use anime motifs and the shield is listed on down I", () => {
  assert.equal(schemeFor({ character: 14 }).variants.down2, prefix + "comfort");
  assert(
    bindingList({ character: 14 }).some(
      (r) => r.key === "↓＋I" && r.move === prefix + "comfort",
    ),
  );
  for (const [slot, kind] of [
    ["u", "hug"],
    ["i", "search"],
    ["o", "tuna"],
    ["wave", "bite"],
    ["comfort", "comfort"],
    ["super", "eater"],
  ]) {
    const key = prefix + slot;
    assert.equal(MOVES[key]?.nonoka, kind);
    assert(moveList(14).some((row) => row.key === key));
    assert(!/通缉|病娇|国王/.test(MOVES[key].name));
  }
  assert.equal(MOVES[prefix + "i"].damage, 18);
  assert.equal(MOVES[prefix + "wave"].damage, 13);
});
for (const side of [0, 1]) {
  test(`hug catches a guarding close target and leaves hitstun on side ${side}`, () => {
    const { m, a, b } = setup(side, 130);
    cast(m, "skill1", side);
    assert.equal(a.energy, 80);
    let stun = 0;
    for (let n = 0; n < 100; n++) {
      m.advance(10, side ? { guard: true } : {}, side ? {} : { guard: true });
      stun = Math.max(stun, b.stun);
    }
    const hits = m
      .drainEvents()
      .filter((e) => e.type === "hit" && e.attack === prefix + "u");
    assert.equal(hits.length, 1);
    assert(!hits[0].blocked);
    assert.equal(hits[0].damage, 14);
    assert(stun >= 550);
    assert.equal(b.energy, 8);
    assert.equal(a.energy, 82);
    const far = setup(side, 420);
    cast(far.m, "skill1", side);
    far.m.advance(1200);
    assert.equal(far.b.hp, 200);
  });
  test(`seaside search closes a gap without teleporting on side ${side}`, () => {
    const { m, a, b } = setup(side, 370),
      x = a.x;
    cast(m, "skill2", side);
    assert.equal(a.energy, 75);
    m.advance(100);
    assert(Math.abs(a.x - x) > 20 && Math.abs(a.x - x) < 200);
    m.advance(1400);
    const hits = m
      .drainEvents()
      .filter((e) => e.type === "hit" && e.attack === prefix + "i");
    assert.equal(hits.length, 1);
    assert.equal(hits[0].damage, 18);
    assert.equal(b.energy, 8);
    assert.equal(a.energy, 77);
  });
  test(`tuna punch knocks down with one committed strike on side ${side}`, () => {
    const { m, a, b } = setup(side, 190);
    cast(m, "skill3", side);
    assert.equal(a.energy, 70);
    let down = false;
    for (let n = 0; n < 140; n++) {
      m.advance(10);
      down ||= b.knockdown > 0;
    }
    const hits = m
      .drainEvents()
      .filter((e) => e.type === "hit" && e.attack === prefix + "o");
    assert.equal(hits.length, 1);
    assert.equal(hits[0].damage, 24);
    assert(down);
    assert.equal(b.energy, 8);
    assert.equal(a.energy, 72);
  });
}
test("comfort spends energy, absorbs frontal damage, expires and enforces cooldown", () => {
  const { m, a, b } = setup();
  cast(m, "skill2", 0, true);
  assert.equal(a.attack, prefix + "comfort");
  assert.equal(a.energy, 75);
  m.advance(180);
  assert.equal(a.shield.hp, 24);
  assert(a.moveCooldowns[prefix + "comfort"] > 5000);
  const hp = a.hp;
  m.hit(1, "light", b.x, 100);
  assert.equal(a.hp, hp);
  assert(a.shield.hp < 24);
  m.advance(800);
  cast(m, "skill2", 0, true);
  assert.equal(a.energy, 75);
  m.advance(1300);
  assert.equal(a.shield, null);
  const low = setup();
  low.a.energy = 24;
  cast(low.m, "skill2", 0, true);
  low.m.advance(500);
  assert.equal(low.a.shield, null);
});
test("rabbit-eater super retains six-hit budget and super armor while using anime media", () => {
  const { m, a, b } = setup(0, 140);
  cast(m, "super");
  assert.equal(a.energy, 0);
  m.advance(6000);
  const hits = m
    .drainEvents()
    .filter((e) => e.type === "hit" && e.attack === prefix + "super");
  assert.equal(hits.length, 6);
  assert.equal(b.energy, 8);
  assert.equal(a.energy, 0);
  const armored = setup();
  cast(armored.m, "super");
  armored.a.attackMs = 350;
  armored.m.hit(1, "light", armored.b.x, 100);
  assert.equal(armored.a.attack, prefix + "super");
  assert.equal(armored.a.stun, 0);
});
test("every active skill and throw uses verified anime recordings; the super has anime video and finish art", () => {
  const { m, a } = setup(),
    animate = createAnimator(),
    frames = assets.mewtypeForms[14].virtual.frames;
  for (const slot of ["u", "i", "o", "wave", "comfort", "super"]) {
    const key = prefix + slot,
      move = MOVES[key];
    assert(move);
    a.attack = key;
    for (const t of [
      move.start / 2,
      move.start + 10,
      move.end - 10,
      move.duration - 20,
    ]) {
      a.attackMs = t;
      assert(frames.some((f) => f.name === animate(m, 0)));
    }
    const media = presentationFor(assets, a, key);
    assert.equal(media.label, move.name);
    assert(/^nonokaAnime/.test(media.voice), media.voice);
    assert(assets.memeVoices[media.voice]);
    if (slot === "super") {
      assert(media.video);
      assert.equal(media.videoRate, 1);
    } else assert(!media.video);
  }
  assert(/^nonokaAnime/.test(presentationFor(assets, a, "throw").voice));
  assert(assets.finishArts?.[14]);
  a.attack = prefix + "u";
  a.attackMs = 180;
  assert.equal(animate(m, 0), "throw-release");
  a.attack = prefix + "o";
  a.attackMs = 250;
  assert.equal(animate(m, 0), "heavy-impact");
});
for (const [button, suffix, down] of [
  ["skill1", "u", false],
  ["skill2", "i", false],
  ["skill3", "o", false],
  ["skill1", "wave", true],
  ["skill2", "comfort", true],
  ["super", "super", false],
])
  test(`LAN authority and prediction agree on Nonoka ${suffix}`, () => {
    const options = { mode: "practice", characters: [14, 1], seed: 123 },
      server = create(JSON.stringify(options));
    server.advance(2000);
    server.input(
      0,
      1,
      JSON.stringify({ unified: true, [button]: true, crouch: down }),
    );
    server.advance(200);
    const packet = JSON.parse(server.packet());
    assert.equal(packet.state.fighters[0].attack, prefix + suffix);
    const client = new Match(options);
    client.start();
    const prediction = new Prediction();
    prediction.receive(client, packet, 0, 1000, 0);
    for (let n = 1; n <= 100; n++) {
      prediction.advance(client, 1000 + n * 10, 10);
      server.advance(10);
      const state = JSON.parse(server.packet()).state;
      assert.deepEqual(JSON.parse(JSON.stringify(client.waves)), state.waves);
      for (const side of [0, 1]) {
        assert.equal(client.fighters[side].hp, state.fighters[side].hp);
        assert.equal(client.fighters[side].energy, state.fighters[side].energy);
        assert.deepEqual(
          client.fighters[side].shield,
          state.fighters[side].shield,
        );
      }
      if (n % 8 === 0)
        prediction.receive(
          client,
          JSON.parse(server.packet()),
          0,
          1000 + n * 10,
          0,
        );
    }
  });
