import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { evaluate } from "./kernel.mjs";

const read = async (path) =>
  JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const [sources, client, server] = await Promise.all([
  read("../assets/stages/stages.json"),
  read("../frontend/public/assets.json"),
  read("./stages.json"),
]);
const { Match, WORLD } = await evaluate("frontend/src/game/engine.ts", [
  "Match",
  "WORLD",
]);
const { drawArenaArtwork } = await evaluate(
  "frontend/src/pages/GamePage/runtime/rendering/drawArenaArtwork.ts",
  ["drawArenaArtwork"],
);
const image = { width: 1600, height: 900 };
const { CanvasRenderer } = await evaluate(
  "frontend/src/pages/GamePage/runtime/rendering/CanvasRenderer.ts",
  ["CanvasRenderer"],
);
const near = (a, b, detail) => assert.ok(Math.abs(a - b) < 0.00001, detail);

// Sample the image rectangles the actual renderer sends to Canvas. A fighter
// standing on the source pixel must project to that pixel in every camera.
function checkProjection(stage, view, x, y, worldX, height) {
  const screenX = 480 + (worldX - view.x) * view.zoom;
  const screenY = 270 + (438 - height - view.y) * view.zoom;
  if (screenX < 0 || screenX > 960 || screenY < 0 || screenY > 540) return;
  let overscan = false,
    painted = false;
  const ctx = {
    save() {
      overscan = true;
    },
    restore() {
      overscan = false;
    },
    scale() {},
    translate() {},
    drawImage(img, ...rect) {
      if (overscan) return;
      const [sx, sy, sw, sh, dx, dy, dw, dh] =
        rect.length === 4 ? [0, 0, img.width, img.height, ...rect] : rect;
      const u = (x * img.width) / 960,
        v = (y * img.height) / 540;
      if (u < sx || u > sx + sw || v < sy || v > sy + sh) return;
      near(dx + ((u - sx) / sw) * dw, screenX, stage.id + " image X");
      near(dy + ((v - sy) / sh) * dh, screenY, stage.id + " image Y");
      painted = true;
    },
  };
  drawArenaArtwork(ctx, image, stage.artBounds, view);
  assert.ok(painted, stage.id + " missing painted surface");
}

for (const [i, source] of sources.entries()) {
  const stage = client.stages[i],
    terrain = stage.terrain,
    trace = source.surfaces;
  assert.equal(stage.id, source.id);
  assert.deepEqual(terrain, server[i].terrain, stage.id + " LAN terrain");
  const match = new Match({ mode: "duel", terrain });
  match.start();
  match.advance(match.phaseMs);
  const f = match.fighters[0];
  const worldX = (px) =>
    stage.artBounds.left + (px * stage.artBounds.width) / 960;
  const verify = (px, py, height) => {
    const x = worldX(px);
    near(
      438 - height,
      stage.artBounds.top + (py * stage.artBounds.height) / 540,
      stage.id + " trace",
    );
    for (const view of [
      { x, y: 438 - height - 150, zoom: 0.58 },
      { x: 480, y: -110, zoom: 0.27 },
    ])
      checkProjection(stage, view, px, py, x, height);
  };
  for (const [x, y] of trace.ground ?? [])
    verify(x, y, match.floorHeight(worldX(x)));
  for (const [left, right, y] of trace.ledges ?? []) {
    const px = (left + right) / 2;
    f.x = worldX(px);
    f.y = 438 - stage.artBounds.top - (y * stage.artBounds.height) / 540 + 8;
    f.vy = -180;
    for (let t = 0; t < 20 && !match.grounded(f); t++)
      match.updateFighter(0, {});
    assert.ok(match.grounded(f), stage.id + " jump landing");
    verify(px, y, f.y);
  }

  // Traverse at real movement speed in both directions, including every riser.
  const left = WORLD.left + 45,
    right = WORLD.right - 45;
  for (const forward of [true, false]) {
    const end = forward ? right : left;
    f.x = forward ? left : right;
    f.y = match.floorHeight(f.x);
    f.vy = 0;
    for (let t = 0; t < 800 && f.x !== end; t++) {
      match.updateFighter(0, forward ? { right: true } : { left: true });
      near(f.y, match.floorHeight(f.x), stage.id + " grounded traversal");
    }
    assert.equal(f.x, end, stage.id + " both ends reachable");
  }
  // Snapshot correction can put the rendered X on the neighbouring tread.
  const renderer = Object.create(CanvasRenderer.prototype);
  const step = terrain.ground.find(
    (p, index) =>
      index && p.x > left && p.x < right && p.y !== terrain.ground[index - 1].y,
  );
  f.x = (step?.x ?? 480) - 10;
  f.y = match.floorHeight(f.x);
  f.vy = 0;
  renderer.correct(match, [{ x: f.x + 15, y: f.y + 8 }], false);
  const shown = renderer.positions(match)[0];
  near(shown.y, match.floorHeight(shown.x), stage.id + " LAN step correction");
  for (const ledge of terrain.platforms) {
    f.x = ledge.right - 1;
    f.y = ledge.height;
    renderer.correct(match, [{ x: f.x + 10, y: f.y + 8 }], false);
    const edge = renderer.positions(match)[0];
    near(edge.x, ledge.right, stage.id + " LAN ledge end");
    near(edge.y, ledge.height, stage.id + " LAN ledge height");
  }
  match.setTerrain(null);
  near(match.surfaceBelow(480, 1000), 0, stage.id + " terrain disabled");
}
console.log(
  `Verified ${sources.length} traced arenas, both approaches, jump landings, camera projection and LAN parity.`,
);
