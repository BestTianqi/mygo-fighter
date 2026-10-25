import { build } from "esbuild";
import { copyFile } from "node:fs/promises";
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
console.log("Built shared simulation for the Scala JVM server.");
