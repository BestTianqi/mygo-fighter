import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareWebAssets } from "./prepare-web-assets.mjs";

const frontend = new URL("../frontend/", import.meta.url);
const require = createRequire(new URL("package.json", frontend));
const env = { ...process.env };

// esbuild exchanges large transforms through temporary files. The Windows
// system temp directory can reject their removal; use the writable workspace.
if (process.platform === "win32") {
  const temp = fileURLToPath(new URL("../output/build-temp/", import.meta.url));
  mkdirSync(temp, { recursive: true });
  env.TEMP = env.TMP = temp;
}

function run(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: frontend,
    env,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

await prepareWebAssets();
run(require.resolve("typescript/bin/tsc"), ["--noEmit"]);
run(require.resolve("typescript/bin/tsc"), [
  "--noEmit",
  "-p",
  "tsconfig.kernel.json",
]);
run(join(dirname(require.resolve("vite/package.json")), "bin/vite.js"), [
  "build",
  ...process.argv.slice(2),
]);

async function directoryBytes(directory) {
  let bytes = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    bytes += entry.isDirectory()
      ? await directoryBytes(path)
      : (await stat(path)).size;
  }
  return bytes;
}

const bytes = await directoryBytes(fileURLToPath(new URL("dist/", frontend)));
if (bytes > 50_000_000)
  throw new Error(
    `Frontend dist is ${bytes.toLocaleString("en-US")} bytes; the web publishing limit is 50,000,000 bytes. Run python tools/optimize_web_assets.py and rebuild.`,
  );
console.log(
  `Frontend dist: ${bytes.toLocaleString("en-US")} / 50,000,000 bytes.`,
);
