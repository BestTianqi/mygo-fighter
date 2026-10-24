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
const prefix = "mujica_7_stage_",
  assets = JSON.parse(readFileSync("frontend/public/assets.json", "utf8"));
function setup(side = 0, distance = 120) {
  const m = new Match({ mode: "duel", characters: side ? [1, 7] : [7, 1] });
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
test("the extra crescent belongs only to stage form; normal kit and crawling super stay intact", () => {
  assert.equal(
    schemeFor({ character: 7, stageForm: true }).variants.down1,
    prefix + "crescent",
  );
  assert.equal(schemeFor({ character: 7 }).variants.down1, undefined);
  assert(
    bindingList({ character: 7, stageForm: true }).some(
      (row) => row.key === "↓＋U" && row.move === prefix + "crescent",
    ),
  );
  assert(moveList(7, true).some((move) => move.key === prefix + "crescent"));
  assert(!moveList(7, false).some((move) => move.key === prefix + "crescent"));
  assert.equal(MOVES.mujica_7_normal_u.damage, 16);
  assert.equal(MOVES.mujica_7_normal_i.movement, 280);
  assert.equal(MOVES.mujica_7_normal_o.pulses.length, 3);
  for (const form of ["normal", "stage"]) {
    const move = MOVES[`mujica_7_${form}_super`];
    assert(move.crawl);
    assert.equal(move.pulses.length, 5);
    assert(move.pulses.at(-1).at <= 1000);
  }
});
for (const side of [0, 1]) {
  test(`three denial bursts hit around Uika while she retreats on side ${side}`, () => {
    for (const distance of [-90, 90]) {
      const { m, a, b } = setup(side, distance),
        x = a.x;
      cast(m, "skill1", side);
      assert.equal(a.energy, 80);
      assert.equal(MOVES[prefix + "u"].uika, "denial");
      m.advance(1800);
      const hits = m
        .drainEvents()
        .filter((e) => e.type === "hit" && e.attack === prefix + "u");
      assert.equal(hits.length, 3);
      assert.equal(hits[0].damage, 4.8);
      assert.equal(b.energy, 8);
      assert.equal(a.energy, 86);
      assert(Math.abs(a.x - x) > 30);
    }
  });
  test(`Saki pursuit closes distance and retains its buffed single hit on side ${side}`, () => {
    const { m, a, b } = setup(side, 370),
      x = a.x;
    cast(m, "skill2", side);
    assert.equal(a.energy, 75);
    m.advance(1500);
    const hits = m
      .drainEvents()
      .filter((e) => e.type === "hit" && e.attack === prefix + "i");
    assert.equal(hits.length, 1);
    assert.equal(hits[0].damage, 21.6);
    assert(Math.abs(a.x - x) > 180);
    assert.equal(a.energy, 77);
    assert.equal(b.energy, 8);
  });
  test(`star cage telegraphs a fixed target and releases Uika before its strike on side ${side}`, () => {
    const { m, a, b } = setup(side, 300);
    cast(m, "skill3", side);
    assert.equal(a.energy, 70);
    m.advance(200);
    assert.equal(m.areas.length, 1);
    const center = m.areas[0].x;
    assert.equal(center, b.x);
    assert.equal(b.hp, 200);
    m.advance(350);
    assert.equal(a.attack, null);
    const x = a.x;
    m.advance(80, side ? {} : { left: true }, side ? { right: true } : {});
    assert.notEqual(a.x, x);
    m.advance(200);
    const hit = m
      .drainEvents()
      .find((e) => e.type === "hit" && e.attack === prefix + "o");
    assert(hit);
    assert.equal(hit.damage, 24);
    assert(b.stun >= 500);
    assert.equal(b.energy, 8);
  });
  test(`slow crescent travels forward as a single ranged projectile on side ${side}`, () => {
    const { m, a, b } = setup(side, 400);
    cast(m, "skill1", side, true);
    assert.equal(a.energy, 80);
    m.advance(250);
    assert(m.waves.some((w) => w.attack === prefix + "crescent"));
    assert.equal(b.hp, 200);
    m.advance(2300);
    const hits = m
      .drainEvents()
      .filter((e) => e.type === "hit" && e.attack === prefix + "crescent");
    assert.equal(hits.length, 1);
    assert.equal(hits[0].damage, 16.8);
    assert.equal(b.energy, 8);
    assert.equal(a.energy, 82);
  });
}
test("cage can be escaped during its warning and crescent stops at its range limit", () => {
  const { m, b } = setup(0, 300);
  cast(m, "skill3");
  m.advance(200);
  const x = m.areas[0].x;
  m.advance(1200, {}, { right: true });
  assert.equal(b.hp, 200);
  assert(b.x > x + 145);
  const far = setup(0, 850);
  cast(far.m, "skill1", 0, true);
  far.m.advance(3000);
  assert.equal(far.b.hp, 200);
  assert.equal(far.m.waves.length, 0);
  const low = setup();
  low.a.energy = 19;
  cast(low.m, "skill1", 0, true);
  low.m.advance(500);
  assert.equal(low.a.attack, null);
  assert.equal(low.m.waves.length, 0);
});
test("new moves select existing intact poses and original voice aliases without skill videos", () => {
  const { m, a } = setup(),
    animate = createAnimator(),
    frames = assets.mujicaForms[7].stage.frames;
  for (const slot of ["u", "i", "o", "crescent"]) {
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
    assert(assets.memeVoices[media.voice]);
    assert(!media.video);
  }
  a.attack = prefix + "u";
  a.attackMs = 130;
  const first = animate(m, 0);
  a.attackMs = 270;
  assert.notEqual(animate(m, 0), first);
});
for (const [button, suffix, down] of [
  ["skill1", "u", false],
  ["skill2", "i", false],
  ["skill3", "o", false],
  ["skill1", "crescent", true],
])
  test(`LAN authority and prediction agree on stage ${suffix}`, () => {
    const options = { mode: "practice", characters: [7, 1], seed: 123 },
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
      assert.deepEqual(JSON.parse(JSON.stringify(client.areas)), state.areas);
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
