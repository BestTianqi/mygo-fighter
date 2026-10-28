import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { evaluate } from "./kernel.mjs";

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const assets = await readJson("frontend/public/assets.json");
const catalog = await readJson("assets/meme-media/manifest.json");
const finishes = await readJson("assets/finish-art/v2/sources-voices.json");
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
  assert.equal(finish.speaker, finish.characterName);
  const forms = assets.ultimateFinishes[finish.character];
  for (const scene of Object.values(forms))
    assert.equal(scene.voice, finish.key);
  await sameRecording(assets.finishVoices[finish.key], finish.output);
}
console.log(
  `Verified ${forms.length} ultimate forms and ${finishes.length} finish voices against reviewed source recordings.`,
);
