import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { readFileSync } from "node:fs";

const { outputFiles } = await build({
  stdin: {
    contents: `export { Match, MOVES } from './frontend/src/game/engine';
      export { createAnimator } from './frontend/src/game/animation';
      export { heavyMotion, isHeavyAttack } from './frontend/src/game/heavyAnimation';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const { Match, MOVES, createAnimator, heavyMotion, isHeavyAttack } =
  await import(
    "data:text/javascript;base64," +
      Buffer.from(outputFiles[0].text).toString("base64")
  );
const assets = JSON.parse(readFileSync("frontend/public/assets.json", "utf8"));
for (let id = 0; id < 15; id++)
  for (const transformed of (id >= 5 && id < 10) || id === 2
    ? [false, true]
    : [false])
    for (const stance of ["standing", "crouch", "air"]) {
      const prefix =
        id >= 10
          ? `mewtype_${id}_virtual_`
          : id >= 5
            ? `mujica_${id}_${transformed ? "stage" : "normal"}_`
            : id === 3
              ? "rana_"
              : id === 4
                ? "riki_"
                : transformed
                  ? "penguin_"
                  : "";
      const key =
        id === 1 || (id === 2 && !transformed)
          ? "heavy"
          : prefix + (stance === "standing" ? "" : stance + "_") + "heavy";
      test(`${id}/${transformed}/${stance}: complete authored heavy sequence`, () => {
        const match = new Match({ mode: "practice", characters: [id, 0] });
        match.start();
        match.advance(2000);
        const f = match.fighters[0],
          move = MOVES[key],
          animate = createAnimator();
        f.attack = key;
        f.crouch = stance === "crouch";
        f.y = stance === "air" ? 100 : 0;
        if (transformed) {
          if (id === 2) f.penguin = { ms: 15000 };
          else f.stageForm = { ms: 15000 };
        }
        const art =
          id >= 10
            ? assets.mewtypeForms[id].virtual
            : id >= 5
              ? assets.mujicaForms[id][transformed ? "stage" : "normal"]
              : transformed
                ? assets.penguin
                : [
                    assets.anonActions,
                    assets.soyoActions,
                    assets.tomoriActions,
                    assets.characters[3],
                    assets.characters[4],
                  ][id];
        const frames = art.actionFrames ?? art.frames;
        for (const t of [move.start / 2, move.start + 10, move.duration - 30]) {
          f.attackMs = t;
          const pose = animate(match, 0);
          if (id === 0 && t >= move.start && t <= move.end)
            assert.equal(pose, null);
          else {
            assert(pose, `missing heavy phase at ${t}ms`);
            assert(
              frames.some((frame) => frame.name === pose),
              `unavailable heavy drawing: ${pose}`,
            );
          }
        }
        const before = JSON.stringify(f);
        const sample = (t) => {
          f.attackMs = t;
          return heavyMotion(f, move);
        };
        for (const boundary of [move.start, move.start + 35, move.end]) {
          const a = sample(boundary - 0.1),
            b = sample(boundary + 0.1);
          assert(a && b);
          assert(
            Math.abs(a.lean - b.lean) < 0.3,
            "heavy weight must not snap between phases",
          );
        }
        assert.equal(sample(0).opacity, 0, "no swing before contact");
        const finish = sample(move.duration - 0.01);
        assert(
          Math.abs(finish.lean) < 0.01 && Math.abs(finish.width - 1) < 0.01,
        );
        f.attackMs = JSON.parse(before).attackMs;
        heavyMotion(f, move);
        assert.equal(
          JSON.stringify(f),
          before,
          "drawing must not change combat state",
        );
        assert.equal(heavyMotion(f, move, true), null);
      });
    }

test("only genuine heavy normals receive the heavy animation", () => {
  assert(isHeavyAttack(MOVES.heavy));
  assert(isHeavyAttack(MOVES.heavyKick));
  assert(!isHeavyAttack(MOVES.light));
  assert(!isHeavyAttack(MOVES.anonJab3));
  assert(!isHeavyAttack(MOVES.waveHeavy));
  assert(!isHeavyAttack(MOVES.super));
});
