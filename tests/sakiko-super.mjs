import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const { outputFiles } = await build({
  stdin: {
    contents: "export {Match,MOVES} from './frontend/src/game/engine'",
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const { Match, MOVES } = await import(
  "data:text/javascript;base64," +
    Buffer.from(outputFiles[0].text).toString("base64")
);

for (const stage of [false, true])
  for (const side of [0, 1])
    test(`Sakiko ${stage ? "stage" : "normal"} super on side ${side} lands three hits quickly and recovers`, () => {
      const m = new Match({ mode: "duel", characters: side ? [0, 6] : [6, 0] });
      m.start();
      m.advance(2000);
      const a = m.fighters[side],
        b = m.fighters[1 - side];
      a.x = 300;
      b.x = side ? 120 : 480;
      a.energy = 100;
      if (stage) a.stageForm = { ms: 15000 };
      const key = `mujica_6_${stage ? "stage" : "normal"}_super`;
      const cast = { unified: true, super: true };
      const began = m.elapsed;
      m.advance(10, side ? {} : cast, side ? cast : {});
      assert.equal(a.attack, key);
      assert.equal(a.energy, 0);
      const hits = [];
      for (let i = 0; i < 120; i++) {
        m.advance(10);
        for (const e of m.drainEvents())
          if (e.type === "hit" && e.attack === key)
            hits.push({ ...e, elapsed: m.elapsed - began });
      }
      assert.equal(hits.length, 3);
      assert(hits[0].elapsed <= 150, `First hit took ${hits[0].elapsed} ms`);
      assert(hits[2].elapsed <= 800, `Last hit took ${hits[2].elapsed} ms`);
      assert.deepEqual(
        hits.map((e) => e.damage),
        stage ? [9.6, 14.4, 33.6] : [8, 12, 28],
      );
      assert.equal(a.attack, null);
      assert.equal(a.cooldown, 0);
      assert.equal(a.energy, 0);
      assert.equal(b.hp, stage ? 142.4 : 152);
      assert.deepEqual(
        MOVES[key].pulses.map((p) => p.damage),
        [8, 12, 28],
      );
      const x = a.x;
      m.advance(100, side ? {} : { left: true }, side ? { left: true } : {});
      assert(a.x < x, "Caster can move after the shorter recovery");
    });
