import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
const { outputFiles } = await build({
  stdin: {
    contents: `export {Match,MOVES} from './frontend/src/game/engine';
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
const { Match, MOVES, presentationFor, create, Prediction } = await import(
  "data:text/javascript;base64," +
    Buffer.from(outputFiles[0].text).toString("base64")
);
const attack = "mujica_8_stage_super";
function ready(side = 0, distance = 240) {
  const m = new Match({ mode: "duel", characters: side ? [0, 8] : [8, 0] });
  m.start();
  m.advance(2000);
  const a = m.fighters[side],
    b = m.fighters[1 - side];
  a.x = 400;
  b.x = a.x + distance;
  a.energy = 100;
  a.stageForm = { ms: 15000 };
  m.drainEvents();
  const cast = { unified: true, super: true };
  m.advance(10, side ? {} : cast, side ? cast : {});
  return { m, a, b };
}
for (const side of [0, 1])
  for (const distance of [-240, 240])
    test(`Mortis side ${side} sends five radial waves toward target ${distance}`, () => {
      const { m, a, b } = ready(side, distance);
      assert.equal(a.attack, attack);
      assert.equal(a.energy, 0);
      m.advance(800);
      const waves = m.waves.filter((w) => w.attack === attack);
      assert.equal(waves.length, 5);
      assert(waves.every((w) => w.radial && w.x === a.x && w.vx === 0));
      assert(waves.every((w) => w.y === a.y + 100 && w.radius > 0));
      m.advance(2200);
      const events = m.drainEvents();
      const hits = events.filter(
        (e) => e.type === "hit" && e.attack === attack,
      );
      assert.equal(
        events.filter((e) => e.type === "voicePulse" && e.attack === attack)
          .length,
        5,
      );
      assert.deepEqual(
        hits.map((e) => e.damage),
        [12, 12, 12, 12, 12],
      );
      assert.equal(b.hp, 140);
      assert.equal(m.waves.length, 0);
      assert.equal(a.attack, null);
      assert.equal(a.energy, 0);
    });
test("scream waves can be guarded and cannot hit beyond their range", () => {
  const guarded = ready();
  for (let i = 0; i < 300; i++) guarded.m.advance(10, {}, { guard: true });
  assert.equal(guarded.b.hp, 188);
  const far = ready(0, 900);
  far.m.advance(3000);
  assert.equal(far.b.hp, 200);
});
test("Mortis keeps super armor while screaming", () => {
  const { m, a, b } = ready();
  m.advance(100);
  m.hit(1, "heavy", b.x, b.y + 100);
  assert(a.hp < 200);
  assert.equal(a.attack, attack);
  assert.equal(a.stun, 0);
  m.advance(3000);
  assert.equal(b.hp, 140);
});
test("normal Mutsumi's super and the penguin song remain distinct", () => {
  const base = MOVES.mujica_8_normal_super;
  assert.equal(base.name, "从来没觉得玩乐队开心过");
  assert(!base.radial);
  assert.equal(base.pulses.length, 3);
  assert.equal(MOVES.penguinSuper.name, "春日影·企鹅演唱");
  assert.equal(MOVES[attack].ownerCharacter, 8);
  assert.equal(MOVES[attack].form, "stage");
  assert.equal(MOVES[attack].cost, 100);
});
test("stage P plays the verified Mortis scream and keeps original-rate video", async () => {
  const assets = JSON.parse(
    await readFile("frontend/public/assets.json", "utf8"),
  );
  const media = presentationFor(
    assets,
    { character: 8, stageForm: true },
    attack,
  );
  const scream = assets.memeSkills[8].variants.mujica_8_stage_o;
  assert.equal(assets.memeVoices[media.voice], assets.memeVoices[scream.voice]);
  assert.equal(media.label, "Mortis·失控尖叫");
  assert.equal(media.videoRate, 1);
  assert.equal(media.duration, 2.1);
  assert(media.video.endsWith("38175c6abfafcb94b2d4.mp4"));
});
test("LAN prediction matches the authoritative five-wave state and hits", () => {
  const options = { mode: "practice", characters: [8, 0], seed: 123 };
  const server = create(JSON.stringify(options));
  server.advance(2000);
  server.input(0, 1, JSON.stringify({ unified: true, transform: true }));
  server.advance(10);
  server.input(0, 2, "{}");
  server.advance(120); // Let the nearby H burst's hit freeze finish before P.
  server.input(0, 3, JSON.stringify({ unified: true, super: true }));
  server.advance(800);
  const packet = JSON.parse(server.packet());
  assert.equal(
    packet.state.waves.filter((w) => w.attack === attack && w.radial).length,
    5,
  );
  const client = new Match(options);
  client.start();
  const prediction = new Prediction();
  prediction.receive(client, packet, 0, 1000, 200);
  for (let i = 1; i <= 4; i++) {
    prediction.advance(client, 1000 + i * 50, 50);
    server.advance(50);
  }
  const authority = JSON.parse(server.packet()).state;
  assert.deepEqual(client.waves, authority.waves);
  assert.deepEqual(client.fighters, authority.fighters);
  assert(authority.fighters[1].hp < 200);
});
