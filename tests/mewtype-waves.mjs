import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";

const { outputFiles } = await build({
  stdin: {
    contents: `export { Match, MOVES } from './frontend/src/game/engine'; export { schemeFor, bindingList } from './frontend/src/game/controls'; export { presentationFor } from './frontend/src/pages/GamePage/functions/presentationFor'; export { create } from './frontend/src/game/serverSimulation'; export { Prediction } from './frontend/src/game/Prediction';`,
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
  schemeFor,
  bindingList,
  presentationFor,
  create,
  Prediction,
} = await import(
  "data:text/javascript;base64," +
    Buffer.from(outputFiles[0].text).toString("base64")
);
const assets = JSON.parse(
  await readFile("frontend/public/assets.json", "utf8"),
);
const waveKey = (id) => `mewtype_${id}_virtual_wave`;
function setup(id, side = 0, distance = 500, terrain = null) {
  const m = new Match({
    mode: "duel",
    characters: side ? [1, id] : [id, 1],
    terrain,
  });
  m.start();
  m.advance(2000);
  const a = m.fighters[side],
    b = m.fighters[1 - side];
  a.x = 480;
  b.x = a.x + (side ? -1 : 1) * distance;
  a.y = b.y = 0;
  a.energy = 100;
  return { m, a, b };
}
function cast(m, side = 0) {
  // The down gesture is latched even if S is released before the input is consumed.
  const input = {
    unified: true,
    skill1: true,
    pressDirections: { skill1: { crouch: true } },
  };
  m.advance(10, side ? {} : input, side ? input : {});
}

for (const id of [10, 11, 12, 13, 14]) {
  for (const side of [0, 1])
    test(`${id}: down U launches a forward wave on side ${side}`, () => {
      const { m, a, b } = setup(id, side);
      const key = waveKey(id);
      cast(m, side);
      assert.equal(a.attack, key);
      assert.equal(a.energy, 80);
      m.advance(250);
      const w = m.waves.find((w) => w.attack === key);
      assert(
        w,
        "A projectile leaves the fighter rather than applying melee damage",
      );
      assert.equal(w.owner, side);
      assert.equal(Math.sign(w.vx), side ? -1 : 1);
      assert.equal(
        b.hp,
        200,
        "A distant enemy is unharmed before travel completes",
      );
      const y = w.y,
        x = w.x;
      m.advance(50);
      assert.equal(w.y, y, "The new wave travels horizontally");
      assert.equal(Math.sign(w.x - x), side ? -1 : 1);
      m.advance(1800);
      const hits = m
        .drainEvents()
        .filter((e) => e.type === "hit" && e.attack === key);
      assert.equal(hits.length, 1, "A wave hits once");
      assert.equal(200 - b.hp, MOVES[key].damage);
      assert.equal(a.energy, 82, "A skill hit restores exactly two resonance");
      assert(!m.waves.some((w) => w.attack === key));
    });

  test(`${id}: wave is listed and uses authored U poses and voice`, () => {
    const f = { character: id },
      key = waveKey(id),
      scheme = schemeFor(f);
    assert.equal(scheme.variants.down1, key);
    assert.deepEqual(
      scheme.base,
      ["u", "i", "o"].map((s) => `mewtype_${id}_virtual_${s}`),
    );
    assert(
      bindingList(f).some((row) => row.move === key && row.key === "↓＋U"),
    );
    assert.equal(
      presentationFor(assets, f, key).voice,
      id === 11
        ? "ritsuAnimeMedium"
        : id === 14
          ? "nonokaAnimeHug"
          : id === 13
            ? "yunoAnimeWorld"
            : assets.memeSkills[id].slots.u.voice,
    );
    const frames = assets.mewtypeForms[id].virtual.frames;
    for (const phase of ["windup", "impact", "recover"])
      assert(
        frames.some(
          (frame) => frame.name === MOVES[key].visualSlot + "-" + phase,
        ),
      );
  });

  test(`${id}: wave consumes energy, can be guarded, and stops at terrain`, () => {
    const low = setup(id);
    low.a.energy = 19;
    cast(low.m);
    low.m.advance(500);
    assert.equal(low.a.energy, 19);
    assert.equal(low.a.attack, null);
    assert.equal(low.m.waves.length, 0);
    const guard = setup(id);
    cast(guard.m);
    guard.m.advance(1800, {}, { guard: true });
    const hit = guard.m
      .drainEvents()
      .find((e) => e.type === "hit" && e.attack === waveKey(id));
    assert(hit?.blocked);
    assert.equal(guard.b.hp, 198);
    assert.equal(
      guard.a.energy,
      81,
      "A blocked skill retains the existing one-point gain",
    );
    const terrain = {
      platforms: [],
      ground: [
        { x: -720, y: 0 },
        { x: 680, y: 0 },
        { x: 700, y: 180 },
        { x: 740, y: 180 },
        { x: 760, y: 0 },
        { x: 1680, y: 0 },
      ],
    };
    const wall = setup(id, 0, 500, terrain);
    cast(wall.m);
    wall.m.advance(2000);
    assert.equal(wall.b.hp, 200);
    assert(wall.m.drainEvents().some((e) => e.type === "terrainHit"));
    const far = setup(id, 0, 1100);
    cast(far.m);
    far.m.advance(2500);
    assert.equal(far.b.hp, 200);
    assert.equal(far.m.waves.length, 0);
  });

  test(`${id}: LAN authority and prediction advance the same projectile`, () => {
    const options = { mode: "practice", characters: [id, 1], seed: 123 };
    const s = create(JSON.stringify(options));
    s.advance(2000);
    s.input(
      0,
      1,
      JSON.stringify({ unified: true, crouch: true, skill1: true }),
    );
    s.advance(240);
    const p = JSON.parse(s.packet());
    assert.equal(p.acks[0], 1);
    assert(p.state.waves.some((w) => w.attack === waveKey(id)));
    const client = new Match(options);
    client.start();
    const prediction = new Prediction();
    prediction.receive(client, p, 0, 1000, 0);
    prediction.advance(client, 1010, 10);
    s.advance(10);
    assert.deepEqual(client.waves, JSON.parse(s.packet()).state.waves);
  });
}

test("opposing waves clash instead of passing through each other", () => {
  const { m, a, b } = setup(10, 0, 600);
  b.character = 11;
  b.energy = 100;
  const input = { unified: true, crouch: true, skill1: true };
  m.advance(10, input, input);
  m.advance(1500);
  assert(m.drainEvents().some((e) => e.type === "clash"));
  assert.equal(a.hp, 200);
  assert.equal(b.hp, 200);
});

test("a timed jump can clear the projectile lane", () => {
  for (const id of [10, 11, 12, 13, 14]) {
    const { m, b } = setup(id);
    cast(m);
    m.advance(550);
    m.advance(10, {}, { jump: true });
    m.advance(1400);
    assert.equal(b.hp, 200, `Character ${id}'s wave can be jumped over`);
  }
});

test("LAN snapshots preserve wave hits against targets above ground", () => {
  const { m, b } = setup(12);
  cast(m);
  m.advance(250);
  const wave = m.waves[0];
  b.x = wave.x + 40;
  b.y = 30;
  b.vy = 0;
  const { options: _options, events: _events, ...state } = m;
  const packet = JSON.parse(
    create(JSON.stringify({ mode: "duel", characters: [12, 1] })).packet(),
  );
  packet.state = JSON.parse(JSON.stringify(state));
  packet.tick = m.simulationTick;
  const client = new Match({ mode: "duel", characters: [12, 1] });
  client.start();
  const prediction = new Prediction();
  prediction.receive(client, packet, 0, 1000, 0);
  m.advance(10);
  prediction.advance(client, 1010, 10);
  assert(b.hp < 200, "The wave reaches the elevated target");
  assert.equal(client.fighters[1].hp, b.hp);
});

for (const id of [11, 14])
  test(`${id}: CPU can select its ranged variant`, () => {
    const m = new Match({ mode: "cpu", characters: [0, id], seed: 123 });
    m.start();
    m.advance(2000);
    m.fighters[0].x = 0;
    m.fighters[1].x = 600;
    m.fighters[1].energy = 80;
    m.advance(4000);
    assert(
      m
        .drainEvents()
        .some((e) => e.type === "attack" && e.attack === waveKey(id)),
    );
  });
