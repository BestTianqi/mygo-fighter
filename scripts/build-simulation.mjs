import { build } from "esbuild";
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { evaluate } from "./kernel.mjs";
// Bundle the browser's combat rules without DOM or Node dependencies. Scala
// loads this global into a restricted GraalJS context for each room.
await build({
  entryPoints: ["frontend/src/game/serverSimulation.ts"],
  bundle: true,
  platform: "neutral",
  format: "iife",
  globalName: "MygoSimulation",
  target: "es2022",
  outfile: "backend/src/main/resources/simulation.js",
});
// Terrain must match the frontend catalog; regenerate it with tools/build.py
// when changing source stages. The resources directory contains build outputs.
await copyFile("scripts/stages.json", "backend/src/main/resources/stages.json");
// Server-side validation limits follow the shared kernel registry, so adding a
// band needs no Scala edits. The Scala server reads these counts at startup.
const { ROSTER } = await evaluate("frontend/src/game/combatData.ts", [
  "ROSTER",
]);
const stages = JSON.parse(
  await readFile(new URL("./stages.json", import.meta.url), "utf8"),
);
const roster = { characters: ROSTER.length, stages: stages.length };
await writeFile(
  "backend/src/main/resources/roster.json",
  JSON.stringify(roster) + "\n",
);
console.log(
  `Built shared simulation for the Scala JVM server: ${roster.characters} characters, ` +
    `${roster.stages} stages.`,
);
