import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { evaluate } from "./kernel.mjs";

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const assets = await readJson("frontend/public/assets.json");
const catalog = await readJson("assets/meme-media/manifest.json");
const finishes = await readJson("assets/finish-art/v2/sources-voices.json");
const finishVideos = await readJson("assets/finish-art/v2/sources-videos.json");
const selectedBackgrounds = await readJson(
  "assets/meme-media/selected-ultimate-backgrounds/sources.json",
);
const { schemeFor } = await evaluate("frontend/src/game/controls.ts", [
  "schemeFor",
]);
const { presentationFor } = await evaluate(
  "frontend/src/pages/GamePage/functions/presentationFor.ts",
  ["presentationFor"],
);
const { ultimateFinishFor } = await evaluate(
  "frontend/src/pages/GamePage/functions/ultimateFinishFor.ts",
  ["ultimateFinishFor"],
);
const { MOVES } = await evaluate("frontend/src/game/combatData.ts", ["MOVES"]);
const forms = [
  ...assets.characters.map((_, character) => ({ character })),
  ...[5, 6, 7, 8, 9].map((character) => ({
    character,
    stageForm: { ms: 20000 },
  })),
  { character: 2, penguin: { ms: 20000 } },
];
const synchronizedMoves = new Map(
  selectedBackgrounds.clips.flatMap((clip) =>
    clip.moves.map((move) => [move, clip]),
  ),
);
async function sameRecording(runtime, source) {
  assert.ok(
    runtime?.startsWith("/media/"),
    `Missing runtime voice for ${source}`,
  );
  const [actual, expected] = await Promise.all([
    readFile(`frontend/public${runtime}`),
    readFile(source),
  ]);
  assert.equal(
    createHash("sha256").update(actual).digest("hex"),
    createHash("sha256").update(expected).digest("hex"),
    source,
  );
}
for (const fighter of forms) {
  const profile = catalog.characters[fighter.character];
  const move = schemeFor(fighter).super;
  const entry = presentationFor(assets, fighter, move);
  assert.ok(
    entry?.voice,
    `Missing ultimate voice: ${fighter.character} ${move}`,
  );
  const source = [
    ...Object.values(profile.slots),
    ...Object.values(profile.variants),
  ].find((clip) => clip.voice === entry.voice);
  assert.ok(
    source,
    `Cross-character ultimate voice: ${fighter.character} ${entry.voice}`,
  );
  const synchronized = synchronizedMoves.get(move);
  assert.ok(synchronized, `${move}: missing synchronized source audit`);
  await sameRecording(entry.video, synchronized.video);
  assert.equal(synchronized.speaker, profile.key, `${move}: selected speaker`);
  assert.equal(entry.voice, synchronized.voice);
  assert.equal(source.audio, synchronized.audio);
  assert.equal(source.source.url, source.videoSource.url);
  assert.equal(source.source.bvid, source.videoSource.bvid);
  assert.equal(source.source.start, source.videoSource.start);
  assert.equal(source.source.end, source.videoSource.end);
  assert.deepEqual(source.source.segments, source.videoSource.segments);
  assert.equal(source.source.speaker, profile.key);
  assert.equal(entry.videoRate ?? 1, 1, `${move}: original playback rate`);
  const timing = MOVES[move].cinematic;
  assert.equal(timing.releaseCueMs, synchronized.releaseCueMs);
  assert.ok(synchronized.releaseCueMs < synchronized.duration * 1000);
  await sameRecording(
    assets.memeVoices[entry.voice] ??
      assets.soyoVoices[entry.voice] ??
      assets.penguinVoices[entry.voice],
    source.audio,
  );
}
assert.equal(synchronizedMoves.size, forms.length);
for (const finish of finishes) {
  const speaker =
    finish.characterName === "mutsumi" && finish.form === "stage"
      ? "mortis"
      : finish.characterName;
  assert.equal(finish.speaker, speaker, finish.key);
  assert.deepEqual(finish.speakers, [finish.speaker], finish.key);
  const video = finishVideos.find((entry) => entry.voice === finish.key);
  assert.ok(video);
  assert.equal(video.sourceUrl, finish.sourceUrl);
  assert.equal(video.sourceStart, finish.sourceStart);
  assert.equal(video.sourceEnd, finish.sourceEnd);
  assert.ok(video.durationMs > 1000, `${finish.key}: video continues past art`);
  assert.ok(Math.abs(finish.duration * 1000 - video.durationMs) <= 42);
  const formEntries = Object.values(assets.ultimateFinishes[finish.character]);
  const scenes = formEntries.filter((scene) => scene.voice === finish.key);
  assert.ok(scenes.length > 0, finish.key);
  if (finish.form)
    assert.equal(
      assets.ultimateFinishes[finish.character][finish.form].voice,
      finish.key,
    );
  for (const scene of scenes) {
    assert.equal(scene.durationMs, video.durationMs);
    await sameRecording(scene.video, video.output);
  }
  await sameRecording(assets.finishVoices[finish.key], finish.output);
}
for (const fighter of forms) {
  const form = fighter.stageForm
    ? "stage"
    : fighter.penguin
      ? "penguin"
      : "normal";
  const candidates = finishes.filter(
    ({ character }) => character === fighter.character,
  );
  const expected =
    candidates.find((clip) => clip.form === form) ??
    candidates.find((clip) => !clip.form || clip.form === "normal");
  assert.ok(expected, `${fighter.character} ${form}: missing finish source`);
  assert.equal(ultimateFinishFor(assets, fighter)?.voice, expected.key);
}
console.log(
  `Verified ${forms.length} synchronized ultimate forms and ${finishes.length} finish voice/video bindings.`,
);
