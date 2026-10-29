import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
