import { spawn } from "node:child_process";
import { javaEnvironment } from "./java.mjs";
const child = spawn("sbt", process.argv.slice(2), {
  cwd: new URL("../backend/", import.meta.url),
  env: javaEnvironment(),
  stdio: "inherit",
  shell: process.platform === "win32",
});
child.on("error", (error) => {
  console.error(`Cannot start sbt: ${error.message}`);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
