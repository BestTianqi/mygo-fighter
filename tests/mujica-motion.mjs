import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const { outputFiles } = await build({
  stdin: {
    contents: `export { Match, MOVES } from './frontend/src/game/engine';
      export { createMujicaMotion } from './frontend/src/game/animation';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const { Match, MOVES, createMujicaMotion } = await import(
  "data:text/javascript;base64," +
    Buffer.from(outputFiles[0].text).toString("base64")
);
function setup(id = 6, stage = false) {
  const match = new Match({ mode: "practice", characters: [id, 0] });
  match.start();
  match.advance(2000);
  const fighter = match.fighters[0];
  fighter.x = 300;
  fighter.y = 0;
  if (stage) fighter.stageForm = { ms: 15000 };
  const motion = createMujicaMotion();
  const sample = (dt = 10, pose = "idle") => {
    match.elapsed += dt;
    return motion(match, 0, pose);
  };
  sample();
  return { match, fighter, motion, sample };
}

for (const id of [5, 6, 7, 8, 9])
  for (const stage of [false, true]) {
    const label = `${id}/${stage ? "stage" : "normal"}`;
    test(`${label}: landing compresses then returns to breathing`, () => {
      const { fighter: f, sample } = setup(id, stage);
      f.y = 100;
      f.vy = -800;
      assert.equal(sample(10, "jump-fall"), null);
      f.y = f.vy = 0;
      sample(10, "landing");
      const landed = sample(50, "landing");
      assert(landed, "landing pose needs a planted compression");
      assert(landed.lift < -1, "falling weight should compress the body");
      assert(landed.width > 1, "compression should spread weight subtly");
      for (let t = 0; t < 700; t += 10) sample();
      const settled = sample();
      assert(settled.lift > -0.1);
      assert(Math.abs(settled.width - 1) < 0.001);
    });
    test(`${label}: windup and strike have no sudden torso snap`, () => {
      const { fighter: f, sample } = setup(id, stage);
      const name = `mujica_${id}_${stage ? "stage" : "normal"}_heavy`;
      const move = MOVES[name];
      f.attack = name;
      const poses = [];
      for (const t of [move.start - 1, move.start, move.start + 1]) {
        f.attackMs = t;
        poses.push(sample(1, "heavy-impact"));
      }
      assert(Math.abs(poses[1].lean - poses[0].lean) < 0.5);
      assert(Math.abs(poses[2].lean - poses[1].lean) < 0.5);
      assert(poses.every((pose) => pose.width > 0.9 && pose.width < 1.1));
    });
  }

test("walking stops settle gradually instead of snapping upright", () => {
  const { fighter: f, sample } = setup();
  f.vx = 300;
  for (let n = 0; n < 20; n++) {
    f.x += 3;
    sample(10, "walk-contact");
  }
  const moving = sample(10, "walk-pass");
  f.vx = 0;
  const stopped = sample(1);
  assert(Math.abs(stopped.lean - moving.lean) < 0.2);
});
test("turning transfers weight without mirroring the old lean abruptly", () => {
  const { fighter: f, sample } = setup();
  f.vx = 300;
  for (let n = 0; n < 20; n++) {
    f.x += 3;
    sample(10, "walk-contact");
  }
  const before = sample();
  f.facing = -1;
  const after = sample(1);
  assert(Math.abs(before.lean + after.lean) < 0.2);
  const turning = sample(50);
  assert(turning.width < 0.99 && turning.width > 0.9);
});
test("pause and hitstop freeze the entire secondary motion", () => {
  const { match, fighter: f, sample } = setup();
  f.vx = 300;
  f.x += 3;
  const pose = sample(10, "walk-contact");
  for (const reason of ["paused", "freeze"]) {
    match[reason] = reason === "paused" ? true : 100;
    assert.deepEqual(sample(50, "walk-contact"), pose);
    match[reason] = reason === "paused" ? false : 0;
  }
  match.freeze = 100;
  f.stun = 200;
  assert.equal(
    sample(10, "hit-high"),
    null,
    "hit reactions use their own posture",
  );
});
test("visual sampling leaves combat and movement state untouched", () => {
  const { match, fighter: f, sample, motion } = setup();
  const before = JSON.stringify(f);
  for (let n = 0; n < 20; n++) sample();
  assert.equal(JSON.stringify(f), before);
  assert.equal(motion(match, 0, "idle", true), null);
  f.stun = 100;
  assert.equal(sample(10, "hit-high"), null);
  f.stun = 0;
  f.dashMs = 100;
  assert.equal(sample(10, "dash-forward"), null);
  const other = setup(0);
  assert.equal(other.sample(), null);
});
