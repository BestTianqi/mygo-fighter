import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";

const bundle = await build({
  stdin: {
    contents: `import { createElement } from "react";
      import { renderToStaticMarkup } from "react-dom/server";
      import { FinishBackground } from "./frontend/src/pages/GamePage/components/FinishBackground";
      import { FinishOverlay } from "./frontend/src/pages/GamePage/components/FinishOverlay";
      export const render = (props) => renderToStaticMarkup(createElement(FinishBackground, props));
      export const renderFinish = (props) => renderToStaticMarkup(createElement(FinishOverlay, props));`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  write: false,
});
const module = { exports: {} };
new Function("require", "module", "exports", bundle.outputFiles[0].text)(
  createRequire(import.meta.url),
  module,
  module.exports,
);
const original = Object.getOwnPropertyDescriptor(globalThis, "navigator");
const props = {
  src: "/media/test.mp4",
  timeMs: 100,
  paused: false,
};
const originalMatchMedia = globalThis.matchMedia;
let reducedMotion = false;
globalThis.matchMedia = () => ({ matches: reducedMotion });
const finishProps = (age, side = 0, ultimate = true) => ({
  className: "",
  assets: {
    ultimateFinishes: {
      0: { normal: { art: "/art.webp", video: "/finish.mp4" } },
    },
    finishArts: { 0: "/art.webp" },
  },
  view: {
    phase: "roundOver",
    phaseMs: 2500 - age,
    paused: false,
    finishVideoMs: age,
    teamRemaining: [2, 1],
    wins: [0, 0],
    roundEnd: {
      tick: 42,
      winner: side,
      fighters: [{ character: 0 }, { character: 0 }],
      finisher: ultimate ? { character: 0, side, attack: "anonSuper" } : null,
    },
  },
});
try {
  for (const userAgent of [
    "Mozilla/5.0 (Linux; Android 14) baiduboxapp/13.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile baiduboxapp/13.0",
    "Mozilla/5.0 (Linux; Android 14) baidubrowser/6.0",
  ]) {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { userAgent },
    });
    const html = module.exports.render(props);
    assert.ok(
      !html.includes("<video"),
      "Baidu backgrounds must not create a native media element",
    );
    assert.ok(
      !html.includes("test.mp4"),
      "Baidu must not load background videos",
    );
    const finish = module.exports.renderFinish(finishProps(1400));
    assert.ok(!finish.includes("<video"));
    assert.ok(
      finish.includes("data-finish-foreground"),
      "Baidu retains static finish art",
    );
  }
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { userAgent: "Mozilla/5.0 Chrome/130.0 Safari/537.36" },
  });
  const html = module.exports.render(props);
  assert.ok(
    html.includes("<video"),
    "ordinary browsers keep original video playback",
  );
  assert.ok(/playsinline/i.test(html));
  for (const side of [0, 1]) {
    for (const reduced of [false, true]) {
      reducedMotion = reduced;
      for (const age of [0, 239, 500, 701, 999]) {
        const finish = module.exports.renderFinish(finishProps(age, side));
        assert.ok(
          finish.includes("data-finish-foreground"),
          `cut-in present at ${age}ms`,
        );
      }
      for (const age of [1000, 1100, 1800, 2200]) {
        const finish = module.exports.renderFinish(finishProps(age, side));
        assert.ok(
          !finish.includes("data-finish-foreground"),
          `cut-in exits by ${age}ms`,
        );
        assert.ok(
          finish.includes("<video"),
          "background remains after cut-in exits",
        );
        assert.ok(!finish.includes("<img"), "no portrait obscures background");
      }
      const normal = module.exports.renderFinish(
        finishProps(1400, side, false),
      );
      assert.ok(
        normal.includes("data-finish-foreground"),
        "ordinary KO timing retained",
      );
    }
  }
} finally {
  globalThis.matchMedia = originalMatchMedia;
  if (original) Object.defineProperty(globalThis, "navigator", original);
  else delete globalThis.navigator;
}
console.log(
  "Verified Baidu backgrounds cannot invoke native video; standard inline playback retained.",
);
