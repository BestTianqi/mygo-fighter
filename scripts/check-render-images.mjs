import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { evaluate } from "./kernel.mjs";

const rendering = "frontend/src/pages/GamePage/runtime/rendering/";
const { CanvasRenderer } = await evaluate(`${rendering}CanvasRenderer.ts`, [
  "CanvasRenderer",
]);
const { retainRenderImage, releaseRenderImage } = await evaluate(
  `${rendering}RenderImage.ts`,
  ["retainRenderImage", "releaseRenderImage"],
);
const assets = JSON.parse(
  await readFile(new URL("../frontend/public/assets.json", import.meta.url)),
);
const originals = new Map(
  ["Image", "createImageBitmap"].map((key) => [
    key,
    Object.getOwnPropertyDescriptor(globalThis, key),
  ]),
);
const created = [];
let decode = () => Promise.resolve();
let failLoad = false;
class FakeImage {
  width = 100;
  height = 200;
  decode() {
    return decode();
  }
  set src(url) {
    this.url = url;
    queueMicrotask(() => (failLoad ? this.onerror() : this.onload()));
  }
  constructor() {
    created.push(this);
  }
}
const bitmap = (width = 100, height = 200) => ({
  width,
  height,
  closed: 0,
  close() {
    this.closed++;
  },
});
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => (resolve = done));
  return { promise, resolve };
};
const flush = () => new Promise((resolve) => setImmediate(resolve));
// Exercise the real loading, preparation, eviction and disposal methods without
// constructing a canvas or running the combat renderer in a second browser.
const renderer = () => {
  const instance = Object.create(CanvasRenderer.prototype);
  Object.assign(instance, {
    assets,
    images: new Map(),
    loading: new Map(),
    disposed: false,
    resizeObserver: { disconnect() {} },
    scene: { reset() {} },
    context: {
      drawImage(image) {
        assert(image, "prepare must not warm a missing/disposed image");
      },
    },
  });
  return instance;
};
async function check(name, run) {
  created.length = 0;
  decode = () => Promise.resolve();
  failLoad = false;
  globalThis.Image = FakeImage;
  globalThis.createImageBitmap = async () => bitmap();
  await run();
  console.log("PASS", name);
}

try {
  await check(
    "decoded bitmap is retained and cached; concurrent loads share it",
    async () => {
      const instance = renderer();
      const first = instance.load("same.webp");
      assert.equal(instance.load("same.webp"), first);
      const result = await first;
      assert.notEqual(result, created[0]);
      assert.equal(result.closed, 0);
      assert.equal(instance.images.get("same.webp"), result);
      assert.equal(await instance.load("same.webp"), result);
      assert.equal(created.length, 1);
      assert.equal(instance.loading.size, 0);
      instance.dispose();
      instance.dispose();
      assert.equal(
        result.closed,
        1,
        "a retained surface is released exactly once",
      );
      assert.equal(instance.images.size, 0);
    },
  );

  for (const [name, factory] of [
    ["unsupported", undefined],
    ["rejected", () => Promise.reject(new Error("decode unsupported"))],
    [
      "synchronous failure",
      () => {
        throw new Error("bitmap unavailable");
      },
    ],
  ])
    await check(
      `${name} bitmap creation uses the decoded HTML image`,
      async () => {
        globalThis.createImageBitmap = factory;
        const image = new FakeImage();
        assert.equal(await retainRenderImage(image), image);
        releaseRenderImage(image);
        const instance = renderer();
        assert.equal(await instance.load("fallback.webp"), created[1]);
        instance.dispose();
      },
    );

  for (const stage of ["load", "decode"])
    await check(
      `${stage} failure clears in-flight state and allows retry`,
      async () => {
        const instance = renderer();
        if (stage === "load") failLoad = true;
        else decode = () => Promise.reject(new Error("bad decode"));
        await assert.rejects(instance.load("retry.webp"));
        assert.equal(instance.images.size, 0);
        assert.equal(instance.loading.size, 0);
        failLoad = false;
        decode = () => Promise.resolve();
        const result = await instance.load("retry.webp");
        assert.equal(instance.images.get("retry.webp"), result);
        instance.dispose();
      },
    );

  for (const stage of ["decode", "bitmap"])
    await check(
      `dispose during pending ${stage} closes the late bitmap`,
      async () => {
        const gate = deferred();
        const result = bitmap();
        if (stage === "decode") decode = () => gate.promise;
        globalThis.createImageBitmap = () =>
          stage === "bitmap" ? gate.promise : Promise.resolve(result);
        const instance = renderer();
        const pending = instance.load("late.webp");
        await flush();
        instance.dispose();
        gate.resolve(stage === "bitmap" ? result : undefined);
        await pending;
        assert.equal(result.closed, 1);
        assert.equal(instance.images.size, 0);
        assert.equal(instance.loading.size, 0);
        const count = created.length;
        await assert.rejects(instance.load("after-dispose.webp"));
        assert.equal(created.length, count);
      },
    );

  await check(
    "dispose interrupts prepare before subsequent loads and canvas warmup",
    async () => {
      const gate = deferred();
      const surfaces = [];
      decode = () => gate.promise;
      globalThis.createImageBitmap = async () => {
        const result = bitmap();
        surfaces.push(result);
        return result;
      };
      const instance = renderer();
      instance.context.drawImage = () =>
        assert.fail("disposed prepare must not draw");
      const pending = instance.prepare({
        characters: [0, 1],
        settings: { arena: Object.keys(assets.backgrounds)[0] },
      });
      await flush();
      assert.equal(created.length, 2, "loading concurrency stays bounded");
      instance.dispose();
      gate.resolve();
      await pending;
      assert.equal(created.length, 2, "no later batch loads after disposal");
      assert.equal(surfaces.length, 2);
      assert(surfaces.every((surface) => surface.closed === 1));
      await instance.prepare({});
      assert.equal(instance.images.size, 0);
    },
  );

  await check(
    "trimming closes oldest nonrequired images within the memory budget",
    () => {
      const instance = renderer();
      // Each surface represents 256 MiB without allocating actual pixel buffers.
      const retained = bitmap(8192, 8192);
      const oldest = bitmap(8192, 8192);
      const recent = bitmap(4096, 4096);
      instance.images = new Map([
        ["required", retained],
        ["oldest", oldest],
        ["recent", recent],
      ]);
      instance.trimDecodedImages(new Set(["required"]));
      assert.equal(oldest.closed, 1);
      assert.equal(retained.closed, 0);
      assert.equal(recent.closed, 0);
      assert.deepEqual([...instance.images.keys()], ["required", "recent"]);
      instance.dispose();
      assert.equal(oldest.closed, 1, "evicted bitmap is not closed twice");
      assert.equal(retained.closed, 1);
      assert.equal(recent.closed, 1);
    },
  );

  await check(
    "required art above the budget survives while all older art is released",
    () => {
      const instance = renderer();
      const required = bitmap(16384, 8192);
      const old = bitmap();
      instance.images = new Map([
        ["old", old],
        ["required", required],
      ]);
      instance.trimDecodedImages(new Set(["required"]));
      assert.equal(old.closed, 1);
      assert.equal(required.closed, 0);
      assert.deepEqual([...instance.images.keys()], ["required"]);
      instance.dispose();
    },
  );
} finally {
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
}
