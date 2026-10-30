import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { evaluate } from "./kernel.mjs";

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const assets = await readJson("frontend/public/assets.json");
const catalog = await readJson("assets/meme-media/manifest.json");
const finishes = await readJson("assets/finish-art/v2/sources-voices.json");
const finishVideos = await readJson("assets/finish-art/v2/sources-videos.json");
// Explicit user-selected replacements are distinct from the character-only audit.
const selectedSources = {
  0: {
    bvid: "BV1FgL9zgEQJ",
    speaker: "user-meme",
    speakers: ["unverified-meme"],
    start: 0,
    end: 7.2,
  },
  1: {
    bvid: "BV1BzcGefE4d",
    speaker: "soyo",
    speakers: ["soyo"],
    start: 123,
    end: 128,
  },
  2: {
    bvid: "BV18nHz6mEKc",
    speaker: "user-meme",
    speakers: ["unverified-meme"],
    start: 0,
    end: 8,
  },
  6: {
    bvid: "BV1sf1uYWEV1",
    speaker: "mixed",
    speakers: ["soyo", "sakiko"],
    start: 58.603,
    end: 66.603,
  },
};
const { schemeFor } = await evaluate("frontend/src/game/controls.ts", [
  "schemeFor",
]);
const { presentationFor } = await evaluate(
  "frontend/src/pages/GamePage/functions/presentationFor.ts",
  ["presentationFor"],
);
const forms = [
  ...Array.from({ length: finishes.length }, (_, character) => ({ character })),
  ...[5, 6, 7, 8, 9].map((character) => ({
    character,
    stageForm: { ms: 20000 },
  })),
  { character: 2, penguin: { ms: 20000 } },
];
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
  await sameRecording(
    assets.memeVoices[entry.voice] ??
      assets.soyoVoices[entry.voice] ??
      assets.penguinVoices[entry.voice],
    source.audio,
  );
}
for (const finish of finishes) {
  const selected = selectedSources[finish.character];
  if (selected) {
    assert.equal(finish.sourcePolicy, "user-selected-2026-10-30");
    assert.equal(finish.bvid, selected.bvid);
    assert.equal(finish.speaker, selected.speaker);
    assert.deepEqual(finish.speakers, selected.speakers);
    assert.equal(finish.sourceStart, selected.start);
    assert.equal(finish.sourceEnd, selected.end);
  } else assert.equal(finish.speaker, finish.characterName);
  const video = finishVideos.find(
    (entry) => entry.character === finish.character,
  );
  assert.ok(video);
  const forms = assets.ultimateFinishes[finish.character];
  for (const scene of Object.values(forms)) {
    assert.equal(scene.voice, finish.key);
    assert.equal(scene.durationMs, video.durationMs);
    await sameRecording(scene.video, video.output);
  }
  await sameRecording(assets.finishVoices[finish.key], finish.output);
}
console.log(
  `Verified ${forms.length} ultimate forms and ${finishes.length} finish voice/video bindings, including four explicitly selected sources.`,
);
