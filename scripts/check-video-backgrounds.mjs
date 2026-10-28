import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";

const bundle = await build({
  stdin: {
    contents: `import { createElement } from "react";
      import { renderToStaticMarkup } from "react-dom/server";
      import { FinishBackground } from "./frontend/src/pages/GamePage/components/FinishBackground";
      export const render = (props) => renderToStaticMarkup(createElement(FinishBackground, props));`,
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
} finally {
  if (original) Object.defineProperty(globalThis, "navigator", original);
  else delete globalThis.navigator;
}
console.log(
  "Verified Baidu backgrounds cannot invoke native video; standard inline playback retained.",
);
