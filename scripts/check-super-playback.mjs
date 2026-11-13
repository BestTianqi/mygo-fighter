import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { evaluate } from "./kernel.mjs";
import { build } from "esbuild";

const { createVoicePlayer } = await evaluate(
  "frontend/src/pages/GamePage/runtime/audio/createVoicePlayer.ts",
  ["createVoicePlayer"],
);
const { AudioDirector } = await evaluate(
  "frontend/src/pages/GamePage/runtime/audio/AudioDirector.ts",
  ["AudioDirector"],
);
const { GameRuntime } = await evaluate(
  "frontend/src/pages/GamePage/runtime/GameRuntime.ts",
  ["GameRuntime"],
);
const assets = JSON.parse(
  await readFile("frontend/public/assets.json", "utf8"),
);
const sources = [];
const context = {
  currentTime: 0,
  destination: {},
  createGain: () => ({ gain: { value: 0 }, connect() {}, disconnect() {} }),
  createBufferSource() {
    const source = {
      onended: null,
      connect() {},
      disconnect() {},
      stopped: false,
      start(_when, offset) {
        this.offset = offset;
      },
      stop() {
        this.stopped = true;
      },
    };
    sources.push(source);
    return source;
  },
};
const buffer = { duration: 10 };
let resolveLoad;
const player = createVoicePlayer(context, {
  get: (name) => (name === "delayed" ? undefined : buffer),
  load: () =>
    new Promise((resolve) => {
      resolveLoad = resolve;
    }),
});
player.setEnabled(true);
player.playAt("delayed", 0, 0, false);
player.sync(0, 1250, false);
resolveLoad(buffer);
await Promise.resolve();
assert.equal(
  sources.at(-1).offset,
  1.25,
  "late decode starts at current cast time",
);
const started = sources.length;
context.currentTime = 0.04;
player.sync(0, 1290, false);
assert.equal(
  sources.length,
  started,
  "matching clock does not restart playback",
);
player.sync(0, 1500, false);
assert.equal(sources.length, started + 1, "large drift seeks once");
assert.equal(sources.at(-1).offset, 1.5);
player.sync(0, 1500, true);
assert.equal(sources.at(-1).stopped, true, "held cast pauses its channel");
player.playAt("other", 1, 0, false);
assert.equal(sources.at(-1).stopped, false, "other side remains audible");
player.sync(0, 1500, false);
assert.equal(
  sources.at(-1).offset,
  1.5,
  "held channel resumes at the frozen clock",
);
player.setPaused(true);
const pausedSources = sources.length;
player.sync(0, 1500, false);
assert.equal(sources.length, pausedSources, "global pause overrides cast sync");
player.setPaused(false);
player.playAt("aligned", 2, -400, false);
const waitingSources = sources.length;
player.sync(2, -10, false);
assert.equal(
  sources.length,
  waitingSources,
  "negative cast clock waits silently",
);
player.sync(2, 0, false);
assert.equal(sources.at(-1).offset, 0);
let finishDone = false;
player.playAfterCurrent("finish", 0, () => {
  finishDone = true;
});
const superSource = sources.findLast(
  (source) => source.offset === 1.5 && !source.stopped,
);
superSource.onended();
const finishSource = sources.at(-1);
assert.equal(
  finishSource.offset,
  0,
  "finisher queues after the remaining sentence",
);
player.sync(0, 8000, false);
assert.equal(
  sources.at(-1),
  finishSource,
  "old cast cannot seek queued finisher",
);
finishSource.onended();
assert.equal(finishDone, true);

const failedFinish = new AudioDirector(assets);
const missingAudio = createVoicePlayer(context, {
  get: () => undefined,
  load: async () => {
    throw new Error("finish recording unavailable");
  },
});
missingAudio.setEnabled(true);
failedFinish.speeches = missingAudio;
const roundEnd = {
  tick: 12,
  finisher: { character: 0, side: 0 },
  fighters: [{}, {}],
};
assert.deepEqual(failedFinish.updateFinish(roundEnd, 0, false), {
  complete: false,
  videoMs: null,
});
await Promise.resolve();
assert.deepEqual(
  failedFinish.updateFinish(roundEnd, 30, false),
  {
    complete: false,
    videoMs: 30,
  },
  "a missing recording still allows the timed art and video to play",
);
missingAudio.dispose();

// The director keys playback by cast identity, not transient fighter form or events.
const calls = [];
const director = new AudioDirector(assets);
director.speeches = {
  playAt(...args) {
    calls.push(args);
    return true;
  },
  sync() {},
  stop() {},
};
director.voices = { stop() {} };
const cast = {
  id: 10,
  side: 0,
  character: 0,
  attack: "super",
  form: "normal",
  elapsedMs: 760,
  held: false,
};
director.syncSupers([cast, null], 1);
director.syncSupers([{ ...cast, elapsedMs: 900 }, null], 1);
assert.equal(calls.length, 1, "same cast never replays its sentence");
assert.equal(calls[0][2], 760, "late authority uses the current offset");
director.syncSupers([{ ...cast, id: 11, elapsedMs: 0 }, null], 1);
assert.equal(calls.length, 2, "new legal super replaces the previous sentence");
director.syncSupers([{ ...cast, id: 11 }, null], 2);
assert.equal(
  calls.length,
  3,
  "round identity allows another cast with the same tick",
);

const runtime = Object.assign(Object.create(GameRuntime.prototype), {
  lan: { connected: true },
  match: { round: 1, superCasts: [{ ...cast, elapsedMs: 1100 }, null] },
  authoritativeMatch: { round: 1, superCasts: [cast, null] },
});
assert.equal(
  runtime.playbackCasts()[0].elapsedMs,
  1100,
  "confirmed cast uses matching prediction clock",
);
runtime.match.superCasts[1] = { ...cast, id: 12, side: 1 };
assert.equal(
  runtime.playbackCasts()[1],
  null,
  "speculative super is never presented",
);
assert.equal(
  runtime.playbackCasts()[0].elapsedMs,
  760,
  "speculative intro cannot hold confirmed playback",
);
runtime.authoritativeMatch = null;
assert.deepEqual(
  runtime.playbackCasts(),
  [],
  "LAN waits for an authoritative cast identity",
);

const failed = createVoicePlayer(context, {
  get: () => undefined,
  load: async () => {
    throw new Error("missing media");
  },
});
failed.setEnabled(true);
failed.playAt("missing", 0, 500, false);
await Promise.resolve();
assert.equal(
  failed.playing(0),
  false,
  "load failure releases the channel without blocking simulation",
);
player.dispose();
failed.dispose();

// Drive the component's actual effects and media readiness callbacks with a
// deterministic element, including a metadata load that finishes mid-cast.
const videoBundle = await build({
  entryPoints: [
    "frontend/src/pages/GamePage/components/BattlePanel/UltimateBackgroundVideo.tsx",
  ],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  jsx: "transform",
  jsxFactory: "__element",
  tsconfigRaw: { compilerOptions: { jsx: "react", jsxFactory: "__element" } },
  banner: { js: "const __element = (tag, props) => ({ tag, props });" },
  plugins: [
    {
      name: "video-effect-harness",
      setup(builder) {
        builder.onResolve({ filter: /^react$/ }, () => ({
          path: "react",
          namespace: "harness",
        }));
        builder.onLoad({ filter: /.*/, namespace: "harness" }, () => ({
          contents:
            "export const useRef = v => globalThis.__superVideoHooks.ref(v); export const useEffect = f => globalThis.__superVideoHooks.effect(f);",
        }));
      },
    },
  ],
});
const { UltimateBackgroundVideo } = await import(
  "data:text/javascript;base64," +
    Buffer.from(videoBundle.outputFiles[0].text).toString("base64")
);
const video = {
  currentTime: 0,
  duration: 5,
  readyState: 0,
  playbackRate: 3,
  paused: true,
  pause() {
    this.paused = true;
  },
  play() {
    this.paused = false;
    return Promise.resolve();
  },
};
const refs = [{ current: video }];
let refIndex = 0;
const effects = [];
globalThis.__superVideoHooks = {
  ref(value) {
    return refs[refIndex++] ?? (refs[refIndex - 1] = { current: value });
  },
  effect(fn) {
    effects.push(fn);
  },
};
let ended = 0;
const media = { video: "test.mp4", videoRate: 3 };
function renderVideo(timeMs, paused = false) {
  refIndex = 0;
  const element = UltimateBackgroundVideo({
    media,
    timeMs,
    paused,
    onEnd: () => ended++,
  });
  for (const effect of effects.splice(0)) effect();
  return element;
}
try {
  renderVideo(0);
  const loaded = renderVideo(1550);
  video.readyState = 1;
  loaded.props.onLoadedMetadata();
  assert.equal(
    video.currentTime,
    1.55,
    "late video metadata seeks to the current cast clock",
  );
  assert.equal(
    video.playbackRate,
    1,
    "existing videoRate cannot speed up a super",
  );
  assert.equal(video.paused, false);
  renderVideo(1600, true);
  assert.equal(video.paused, true, "held or paused cast freezes video");
  renderVideo(1800);
  assert.equal(
    video.currentTime,
    1.8,
    "resuming corrects noticeable video drift",
  );
  renderVideo(5000);
  assert.equal(video.paused, true);
  assert.equal(
    ended,
    1,
    "short source finishes without looping or acceleration",
  );
} finally {
  delete globalThis.__superVideoHooks;
}
console.log(
  "Verified cast-clock audio/video offsets, drift, holds, pause, repeat supers, finisher queue, media failure and authoritative LAN gating.",
);
