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
const prefix = "mewtype_11_virtual_",
  assets = JSON.parse(readFileSync("frontend/public/assets.json", "utf8"));
function setup(side = 0, distance = 120) {
  const m = new Match({ mode: "duel", characters: side ? [1, 11] : [11, 1] });
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
test("anime-only kit keeps UIO and down-U and the buffed heavy skill", () => {
  assert.deepEqual(
    schemeFor({ character: 11 }).base,
    ["u", "i", "o"].map((s) => prefix + s),
  );
  for (const [slot, kind] of [
    ["u", "meat"],
    ["i", "polite"],
    ["o", "steak"],
    ["wave", "wave"],
    ["super", "hungry"],
  ]) {
    assert.equal(MOVES[prefix + slot].ritsu, kind);
    assert(moveList(11).some((r) => r.key === prefix + slot));
    assert(!/真丢人|不害臊|弱弱胃袋|杂鱼/.test(MOVES[prefix + slot].name));
  }
  assert.equal(MOVES[prefix + "o"].damage, 25);
  assert.equal(MOVES[prefix + "wave"].damage, 16);
  assert(
    bindingList({ character: 11 }).some(
      (r) => r.key === "↓＋U" && r.move === prefix + "wave",
    ),
  );
});
for (const side of [0, 1]) {
  test(`two-pound sweep advances, hits twice and splits received resonance on side ${side}`, () => {
    const { m, a, b } = setup(side, 220),
      x = a.x;
    cast(m, "skill1", side);
    assert.equal(a.energy, 80);
    m.advance(100);
    assert(Math.abs(a.x - x) > 10 && Math.abs(a.x - x) < 90);
    m.advance(1500);
    const hits = m
      .drainEvents()
      .filter((e) => e.type === "hit" && e.attack === prefix + "u");
    assert.equal(hits.length, 2);
    assert.equal(
      hits.reduce((s, h) => s + h.damage, 0),
      17,
    );
    assert.equal(a.energy, 84);
    assert.equal(b.energy, 8);
  });
  test(`medium-well rush retains its 25 damage on side ${side}`, () => {
    const { m, a, b } = setup(side, 330),
      x = a.x;
    cast(m, "skill3", side);
    assert.equal(a.energy, 70);
    m.advance(1800);
    const hits = m
      .drainEvents()
      .filter((e) => e.type === "hit" && e.attack === prefix + "o");
    assert.equal(hits.length, 1);
    assert.equal(hits[0].damage, 25);
    assert(Math.abs(a.x - x) > 150);
    assert.equal(b.energy, 8);
  });
  test(`hungry super delivers five rapid forward hits with armor on side ${side}`, () => {
    const { m, a, b } = setup(side, 140);
    cast(m, "super", side);
    assert.equal(a.energy, 0);
    m.advance(3000);
    const hits = m
      .drainEvents()
      .filter((e) => e.type === "hit" && e.attack === prefix + "super");
    assert.equal(hits.length, 5);
    assert.equal(
      hits.reduce((s, h) => s + h.damage, 0),
      40,
    );
    assert.equal(b.energy, 8);
    assert.equal(a.energy, 0);
    const move = MOVES[prefix + "super"];
    assert.deepEqual(
      move.pulses.map((p) => p.at),
      [100, 280, 460, 640, 820],
    );
    const armor = setup(side);
    cast(armor.m, "super", side);
    armor.a.attackMs = 350;
    armor.m.hit(1 - side, "light", armor.b.x, 100);
    assert.equal(armor.a.attack, prefix + "super");
    assert.equal(armor.a.stun, 0);
  });
}
test("polite counter protects only the front in its active window and has a cooldown", () => {
  for (const [age, front] of [
    [40, true],
    [200, true],
    [200, false],
    [500, true],
  ]) {
    const { m, a } = setup();
    cast(m, "skill2");
    assert.equal(a.energy, 75);
    assert(a.moveCooldowns[prefix + "i"] > 3000);
    a.attackMs = age;
    m.hit(1, "light", a.x + (front ? 100 : -100), 100);
    if (age === 200 && front) {
      assert.equal(a.hp, 200);
      assert(m.waves.some((w) => w.attack === prefix + "counter"));
    } else assert(a.hp < 200);
  }
  const { m, a } = setup();
  cast(m, "skill2");
  m.advance(900);
  cast(m, "skill2");
  assert.equal(a.energy, 75);
  const low = setup();
  low.a.energy = 24;
  cast(low.m, "skill2");
  assert.notEqual(low.a.attack, prefix + "i");
});
test("counter loses to throws and attacks can whiff at distance", () => {
  const { m, a } = setup(0, 60);
  cast(m, "skill2");
  a.attackMs = 200;
  m.hit(1, "throw", a.x + 50, 100);
  assert(a.hp < 200);
  for (const key of ["skill1", "skill3", "super"]) {
    const far = setup(0, 1000);
    cast(far.m, key);
    far.m.advance(3500);
    assert.equal(far.b.hp, 200);
  }
});
test("all active skills and throw select anime recordings and intact poses; super keeps original video speed", () => {
  const { m, a } = setup(),
    animate = createAnimator(),
    frames = assets.mewtypeForms[11].virtual.frames;
  for (const slot of ["u", "i", "o", "wave", "super"]) {
    const key = prefix + slot,
      move = MOVES[key];
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
    assert(/^ritsuAnime/.test(media.voice), media.voice);
    assert(assets.memeVoices[media.voice]);
    if (slot === "super") {
      assert(media.video);
      assert.equal(media.videoRate, 1);
    } else assert(!media.video);
  }
  assert(/^ritsuAnime/.test(presentationFor(assets, a, "throw").voice));
  assert(
    /^ritsuAnime/.test(presentationFor(assets, a, prefix + "counter").voice),
  );
  assert(assets.finishArts?.[11]);
  a.attack = prefix + "u";
  a.attackMs = 150;
  assert.equal(animate(m, 0), "skill-u-impact");
  a.attackMs = 340;
  assert.equal(animate(m, 0), "skill-o-impact");
  a.attack = prefix + "i";
  a.attackMs = 200;
  assert.equal(animate(m, 0), "guard-standing");
  a.attack = prefix + "o";
  a.attackMs = 240;
  assert.equal(animate(m, 0), "heavy-impact");
});
for (const [button, suffix, down] of [
  ["skill1", "u", false],
  ["skill2", "i", false],
  ["skill3", "o", false],
  ["skill1", "wave", true],
  ["super", "super", false],
])
  test(`LAN authority and prediction agree on Ritsu ${suffix}`, () => {
    const options = { mode: "practice", characters: [11, 1], seed: 123 },
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
