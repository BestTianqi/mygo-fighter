import { readFile } from "node:fs/promises";
import { evaluate } from "./kernel.mjs";

const root = new URL("../frontend/public/", import.meta.url);
const stagesSource = new URL("../scripts/stages.json", import.meta.url);

const kernel = await evaluate("frontend/src/game/combatData.ts", [
  "BANDS",
  "ROSTER",
  "MOVES",
  "bandFor",
  "moveList",
]);
const { BANDS, ROSTER, MOVES, bandFor, moveList } = kernel;
const contract = await evaluate("frontend/src/game/bands/index.ts", [
  "defineBand",
  "validateBands",
]);
const { defineBand, validateBands } = contract;

// 1. Every registered character resolves to a band and the registry covers 0..N-1.
for (let id = 0; id < ROSTER.length; id++) {
  const band = bandFor(id);
  if (!band.characters.some((character) => character.id === id))
    throw new Error(`bandFor(${id}) returned ${band.id}, which does not own it`);
}
for (const invalid of [-1, ROSTER.length, 999])
  try {
    bandFor(invalid);
    throw new Error(`bandFor(${invalid}) should have thrown`);
  } catch (error) {
    if (error instanceof RangeError === false) throw error;
  }

// 2. Bands own disjoint move keys and every character can list and reach a move.
const moveKeys = new Set();
for (const band of BANDS) {
  for (const key of Object.keys(band.moves)) {
    if (moveKeys.has(key)) throw new Error(`Move key ${key} is owned twice`);
    moveKeys.add(key);
  }
  for (const character of band.characters) {
    const rows = moveList(character.id);
    if (!rows.length)
      throw new Error(`Band ${band.id} character ${character.id} has no moves`);
    for (const row of rows)
      if (!(row.key in MOVES))
        throw new Error(`Missing move ${row.key} in ${band.id}`);
    if (!band.schemeFor({ character: character.id }).base.length)
      throw new Error(`Band ${band.id} character ${character.id} has no scheme`);
  }
}

// 3. The manifest and the runtime stage catalog follow the kernel roster.
const manifest = JSON.parse(await readFile(new URL("assets.json", root), "utf8"));
if (manifest.characters.length !== ROSTER.length)
  throw new Error(
    `assets.json has ${manifest.characters.length} characters, kernel has ${ROSTER.length}`,
  );
const stages = JSON.parse(await readFile(stagesSource, "utf8"));
if (manifest.stages.length !== stages.length)
  throw new Error(
    `assets.json has ${manifest.stages.length} stages, stages.json has ${stages.length}`,
  );

// 4. Contract test: a band that only declares the required fields must work.
// This is the executable proof that adding a band needs no shared-file edits.
const minimal = defineBand({
  id: "test",
  label: "TEST",
  characters: [
    {
      id: 0,
      key: "test",
      name: "测试",
      shortName: "测",
      en: "TEST",
      skill: "测试",
      color: "#fff",
      role: "测试",
      archetype: "测试",
    },
  ],
  moves: {
    test_0_base_u: {
      name: "测试技能",
      category: "special",
      duration: 600,
      start: 160,
      end: 240,
      damage: 10,
      ownerCharacter: 0,
      form: "base",
    },
  },
});
validateBands([minimal]);
if (minimal.formFor({ character: 0 }) !== "base")
  throw new Error("Default formFor should return the declared form");
const rows = minimal.movesFor(minimal.moves, 0);
if (rows.length !== 1 || rows[0].key !== "test_0_base_u")
  throw new Error("Default movesFor should list the band's own moves");
if (!minimal.owns({ character: 0 }, minimal.moves.test_0_base_u, "test_0_base_u"))
  throw new Error("Default owns should accept the band's own moves");
if (minimal.owns({ character: 1 }, minimal.moves.test_0_base_u, "test_0_base_u"))
  throw new Error("Default owns should reject another band's moves");
if (minimal.profileFor({ character: 0 }).key !== "test")
  throw new Error("Default profileFor should resolve the declared character");

console.log(
  `Verified ${BANDS.length} bands, ${ROSTER.length} characters, ${Object.keys(MOVES).length} moves, ` +
    `${manifest.stages.length} stages; minimal band contract OK.`,
);
