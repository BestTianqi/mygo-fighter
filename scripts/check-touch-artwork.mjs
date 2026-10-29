import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { evaluate } from "./kernel.mjs";

const { hydrateAssets } = await evaluate("frontend/src/assets/loadAssets.ts", [
  "hydrateAssets",
]);
const { touchActionArtworkFor } = await evaluate(
  "frontend/src/pages/GamePage/components/BattlePanel/functions/touchActionArtworkFor.ts",
  ["touchActionArtworkFor"],
);
const { BANDS } = await evaluate("frontend/src/game/bands/index.ts", ["BANDS"]);
const root = new URL("../frontend/public/", import.meta.url);
const assets = hydrateAssets(
  JSON.parse(await readFile(new URL("assets.json", root), "utf8")),
);
const urls = new Set();
let forms = 0,
  icons = 0;
for (const band of BANDS)
  for (const character of band.characters) {
    const base = { character: character.id };
    const variants = band.forms.map((form) => ({
      ...base,
      stageForm: form === "stage",
    }));
    // MyGO's optional Penguin transformation shares the base roster entry.
    if (!band.transform && band.schemeFor(base).transform)
      variants.push({ ...base, stageForm: false, penguin: true });
    for (const fighter of variants) {
      forms++;
      const actions = [
        "light",
        "heavy",
        "blink",
        "skill1",
        "skill2",
        "skill3",
        "super",
      ];
      if (band.schemeFor(fighter).transform) actions.push("transform");
      for (const action of actions) {
        const art = touchActionArtworkFor(assets, fighter, action);
        const label = `${character.key}/${fighter.penguin ? "penguin" : fighter.stageForm ? "stage" : "base"}/${action}`;
        assert.equal(
          art.kind,
          action === "super" ? "image" : "sprite",
          `${label}: missing action frame`,
        );
        if (art.kind === "sprite")
          assert.ok(
            art.frame.w > 0 &&
              art.frame.h > 0 &&
              art.frame.x >= 0 &&
              art.frame.y >= 0,
            label,
          );
        urls.add(art.src);
        urls.add(art.fallback);
        icons++;
      }
    }
  }
for (const url of urls)
  assert.ok((await stat(new URL(url.slice(1), root))).isFile(), url);
console.log(
  `Verified ${icons} touch action artworks across ${forms} character forms.`,
);
