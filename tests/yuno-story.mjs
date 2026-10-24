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
const prefix = "mewtype_13_virtual_",
  assets = JSON.parse(readFileSync("frontend/public/assets.json", "utf8"));
function setup(side = 0, distance = 120) {
  const m = new Match({ mode: "duel", characters: side ? [1, 13] : [13, 1] });
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
test("anime kit exposes five distinct techniques and retains ranged wave stats", () => {
  assert.equal(schemeFor({ character: 13 }).variants.down2, prefix + "guard");
  for (const [slot, kind] of [
    ["u", "bass"],
    ["i", "release"],
    ["o", "seaside"],
    ["wave", "wave"],
    ["guard", "band"],
    ["super", "world"],
  ]) {
    assert.equal(MOVES[prefix + slot].yuno, kind);
    assert(moveList(13).some((r) => r.key === prefix + slot));
    assert(
      !/怎么先走|有惊无险|真不敢信|不要丢下/.test(MOVES[prefix + slot].name),
    );
  }
  assert(
    bindingList({ character: 13 }).some(
      (r) => r.key === "↓＋I" && r.move === prefix + "guard",
    ),
  );
  assert.equal(MOVES[prefix + "wave"].damage, 14);
});
for (const side of [0, 1]) {
  test(`low bass shoots twice with one received-resonance budget on side ${side}`, () => {
    const { m, a, b } = setup(side, 300);
    cast(m, "skill1", side);
    assert.equal(a.energy, 80);
    m.advance(2400);
    const hits = m
      .drainEvents()
      .filter((e) => e.type === "hit" && e.attack === prefix + "u");
    assert.equal(hits.length, 2);
    assert.equal(
      hits.reduce((s, h) => s + h.damage, 0),
      15,
    );
    assert.equal(b.energy, 8);
    assert.equal(a.energy, 84);
  });
  test(`let-go scratch repels both directions and retreats smoothly on side ${side}`, () => {
    for (const direction of [-1, 1]) {
      const { m, a, b } = setup(side, 100);
      b.x = a.x + direction * 100;
      const x = a.x;
      cast(m, "skill2", side);
      assert.equal(a.energy, 75);
      m.advance(80);
      assert(Math.abs(a.x - x) > 10 && Math.abs(a.x - x) < 100);
      m.advance(1400);
      const hits = m
        .drainEvents()
        .filter((e) => e.type === "hit" && e.attack === prefix + "i");
      assert.equal(hits.length, 1);
      assert.equal(hits[0].damage, 14);
      assert.equal(b.energy, 8);
      assert(Math.abs(a.x - x) > 80);
    }
  });
  test(`seaside remix telegraphs a fixed position and lets Yuno act before it fires on side ${side}`, () => {
    const { m, a, b } = setup(side, 300);
    cast(m, "skill3", side);
    assert.equal(a.energy, 70);
    m.advance(200);
    assert.equal(m.areas.length, 1);
    assert.equal(m.areas[0].x, b.x);
    assert.equal(b.hp, 200);
    m.advance(320);
    assert.equal(a.attack, null);
    m.advance(600);
    const hits = m
      .drainEvents()
      .filter((e) => e.type === "hit" && e.attack === prefix + "o");
    assert.equal(hits.length, 1);
    assert.equal(hits[0].damage, 22);
    assert.equal(b.energy, 8);
  });
}
test("seaside warning can be escaped", () => {
  const { m, b } = setup(0, 300);
  cast(m, "skill3");
  m.advance(210);
  b.x += 300;
  m.advance(1000);
  assert.equal(b.hp, 200);
});
test("reunion guard absorbs frontal damage, costs 25 and cannot be immediately recast", () => {
  const { m, a, b } = setup();
  cast(m, "skill2", 0, true);
  m.advance(180);
  assert.equal(a.attack, prefix + "guard");
  assert.equal(a.energy, 75);
  assert.equal(a.shield.hp, 24);
  m.hit(1, "light", b.x, 100);
  assert.equal(a.hp, 200);
  assert(a.shield.hp < 24);
  m.advance(800);
  cast(m, "skill2", 0, true);
  assert.equal(a.energy, 75);
  m.advance(1500);
  assert.equal(a.shield, null);
  const low = setup();
  low.a.energy = 24;
  cast(low.m, "skill2", 0, true);
  low.m.advance(500);
  assert.equal(low.a.shield, null);
});
test("world drop keeps three hits, combo scaling, super armor and a single received-energy budget", () => {
  const { m, a, b } = setup(0, 100);
  cast(m, "super");
  m.advance(3000);
  const hits = m
    .drainEvents()
    .filter((e) => e.type === "hit" && e.attack === prefix + "super");
  assert.equal(hits.length, 3);
  assert.equal(
    hits.reduce((s, h) => s + h.damage, 0),
    41,
  );
  assert.equal(b.energy, 8);
  assert.equal(a.energy, 0);
  const armor = setup();
  cast(armor.m, "super");
  armor.a.attackMs = 350;
  armor.m.hit(1, "light", armor.b.x, 100);
  assert.equal(armor.a.attack, prefix + "super");
  assert.equal(armor.a.stun, 0);
});
test("all techniques and throw use verified anime audio, full-body frames and original-speed super video", () => {
  const { m, a } = setup(),
    animate = createAnimator(),
    frames = assets.mewtypeForms[13].virtual.frames;
  for (const slot of ["u", "i", "o", "wave", "guard", "super"]) {
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
    assert(/^yunoAnime/.test(media.voice), media.voice);
    assert(assets.memeVoices[media.voice]);
    if (slot === "super") {
      assert(media.video);
      assert.equal(media.videoRate, 1);
    } else assert(!media.video);
  }
  assert(/^yunoAnime/.test(presentationFor(assets, a, "throw").voice));
  assert(assets.finishArts?.[13]);
  a.attack = prefix + "i";
  a.attackMs = 100;
  assert.equal(animate(m, 0), "dash-back");
  a.attack = prefix + "guard";
  a.attackMs = 130;
  assert.equal(animate(m, 0), "guard-standing");
});
for (const [button, suffix, down] of [
  ["skill1", "u", false],
  ["skill2", "i", false],
  ["skill3", "o", false],
  ["skill1", "wave", true],
  ["skill2", "guard", true],
  ["super", "super", false],
])
  test(`LAN authority and prediction agree on Yuno ${suffix}`, () => {
    const options = { mode: "practice", characters: [13, 1], seed: 123 },
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
