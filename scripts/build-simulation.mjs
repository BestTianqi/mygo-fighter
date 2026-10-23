import { build } from "esbuild";
import { copyFile } from "node:fs/promises";
await build({
  entryPoints: ["frontend/src/game/serverSimulation.ts"],
  bundle: true,
  platform: "neutral",
  format: "iife",
  globalName: "MygoSimulation",
  target: "es2022",
  outfile: "backend/src/main/resources/simulation.js",
});
await copyFile("scripts/stages.json", "backend/src/main/resources/stages.json");
console.log("Built shared simulation for the Scala JVM server.");
