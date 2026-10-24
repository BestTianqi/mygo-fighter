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
const prefix = "mewtype_12_virtual_",
  assets = JSON.parse(readFileSync("frontend/public/assets.json", "utf8"));
function setup(side = 0, distance = 120) {
  const m = new Match({ mode: "duel", characters: side ? [1, 12] : [12, 1] });
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
const SUPER_PRESENTATION = {
  voice: "meme_12_p",
  label: "临兵斗者皆阵列在前",
  duration: 11.3,
  videoRate: 1,
  video: "/media/ff5834191411b0a96346.mp4",
};
const SUPER_FINISH = "/media/4abf606f23978e9ccc16.webp";
test("anime small skills stay on UIO/down-U and the original nine-hit super remains intact", () => {
  assert.deepEqual(
    schemeFor({ character: 12 }).base,
    ["u", "i", "o"].map((s) => prefix + s),
  );
  for (const [slot, kind] of [
    ["u", "draft"],
    ["i", "stamp"],
    ["o", "marathon"],
    ["wave", "ink"],
  ]) {
    assert.equal(MOVES[prefix + slot].miyako, kind);
    assert(moveList(12).some((r) => r.key === prefix + slot));
  }
  assert.equal(MOVES[prefix + "i"].damage, 24);
  assert.equal(MOVES[prefix + "wave"].damage, 15);
  const superMove = MOVES[prefix + "super"];
  assert.equal(superMove.damage, 50);
  assert.equal(superMove.pulses.length, 9);
  assert.equal(superMove.damageReduction, 0.8);
  assert(superMove.targetLock);
  assert(superMove.fixedDamage);
  const { a } = setup();
  assert.deepEqual(presentationFor(assets, a, prefix + "super"), {
    ...SUPER_PRESENTATION,
    slot: "p",
  });
  assert.equal(assets.finishArts[12], SUPER_FINISH);
});
for (const side of [0, 1]) {
  test(`two manuscript pages arc forward with one resonance budget on side ${side}`, () => {
    const { m, a, b } = setup(side, 330);
    cast(m, "skill1", side);
    assert.equal(a.energy, 80);
    m.advance(200);
    const wave = m.waves.find((w) => w.attack === prefix + "u");
    assert(wave);
    assert.notEqual(wave.y, MOVES[prefix + "u"].height);
    m.advance(2500);
    const hits = m
      .drainEvents()
      .filter((e) => e.type === "hit" && e.attack === prefix + "u");
    assert.equal(hits.length, 2);
    assert.equal(
      hits.reduce((s, h) => s + h.damage, 0),
      15,
    );
    assert.equal(a.energy, 84);
    assert.equal(b.energy, 8);
  });
  test(`penance stamp warns a fixed position, allowing movement before impact on side ${side}`, () => {
    const { m, a, b } = setup(side, 300);
    cast(m, "skill2", side);
    assert.equal(a.energy, 75);
    m.advance(200);
    assert.equal(m.areas.length, 1);
    assert.equal(m.areas[0].x, b.x);
    assert.equal(m.areas[0].radius, 135);
    assert.equal(b.hp, 200);
    m.advance(320);
    assert.equal(a.attack, null);
    const x = a.x;
    m.advance(100, side ? {} : { left: true }, side ? { right: true } : {});
    assert.notEqual(a.x, x);
    m.advance(700);
    const hits = m
      .drainEvents()
      .filter((e) => e.type === "hit" && e.attack === prefix + "i");
    assert.equal(hits.length, 1);
    assert.equal(hits[0].damage, 24);
    assert.equal(b.energy, 8);
  });
  test(`Akihabara deadline sprint closes the gap continuously on side ${side}`, () => {
    const { m, a, b } = setup(side, 390),
      x = a.x;
    cast(m, "skill3", side);
    assert.equal(a.energy, 70);
    m.advance(100);
    assert(Math.abs(a.x - x) > 30 && Math.abs(a.x - x) < 200);
    m.advance(1500);
    const hits = m
      .drainEvents()
      .filter((e) => e.type === "hit" && e.attack === prefix + "o");
    assert.equal(hits.length, 1);
    assert.equal(hits[0].damage, 22);
    assert(Math.abs(a.x - x) > 200);
    assert.equal(b.energy, 8);
  });
}
test("stamp can be escaped and its cooldown rejects early recasts", () => {
  const { m, a, b } = setup(0, 300);
  cast(m, "skill2");
  m.advance(210);
  b.x += 300;
  m.advance(700);
  assert.equal(b.hp, 200);
  const energy = a.energy;
  cast(m, "skill2");
  assert.equal(a.energy, energy);
  m.advance(1500);
  assert.equal(m.areas.length, 0);
  const low = setup();
  low.a.energy = 24;
  cast(low.m, "skill2");
  low.m.advance(1000);
  assert.equal(low.m.areas.length, 0);
  const far = setup(0, 1000);
  cast(far.m, "skill3");
  far.m.advance(2000);
  assert.equal(far.b.hp, 200);
});
test("small skills select original anime audio without videos, while retained poses differ", () => {
  const { m, a } = setup(),
    animate = createAnimator(),
    frames = assets.mewtypeForms[12].virtual.frames;
  for (const slot of ["u", "i", "o", "wave"]) {
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
    assert(/^miyakoAnime/.test(media.voice), media.voice);
    assert(assets.memeVoices[media.voice]);
    assert(!media.video);
  }
  assert(/^miyakoAnime/.test(presentationFor(assets, a, "throw").voice));
  a.attack = prefix + "u";
  a.attackMs = 160;
  assert.equal(animate(m, 0), "skill-u-impact");
  a.attackMs = 340;
  assert.equal(animate(m, 0), "skill-o-impact");
  a.attack = prefix + "i";
  a.attackMs = 130;
  assert.equal(animate(m, 0), "crouch-heavy-impact");
  a.attack = prefix + "o";
  a.attackMs = 100;
  assert.equal(animate(m, 0), "dash-forward");
});
for (const [button, suffix, down] of [
  ["skill1", "u", false],
  ["skill2", "i", false],
  ["skill3", "o", false],
  ["skill1", "wave", true],
])
  test(`LAN authority and prediction agree on Miyako ${suffix}`, () => {
    const options = { mode: "practice", characters: [12, 1], seed: 123 },
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
