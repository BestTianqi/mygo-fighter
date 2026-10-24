import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

if (process.platform !== "win32") {
  console.log("Windows LAN launcher check only runs on Windows.");
  process.exit(0);
}
const root = fileURLToPath(new URL("../", import.meta.url));
const folder = fileURLToPath(new URL("../output/lan-start/", import.meta.url));
mkdirSync(folder, { recursive: true });
const port = await new Promise((resolve) => {
  const probe = createServer();
  probe.listen(0, "0.0.0.0", () => {
    const value = probe.address().port;
    probe.close(() => resolve(value));
  });
});
// Exercise npm start's actual Node entry with the user's system Java 17,
// no installed sbt, and only the project's existing portable JDK/sbt cache.
const env = { ...process.env, PORT: String(port) };
delete env.JAVA_HOME;
let output = "",
  exit = null;
const child = spawn(process.execPath, ["scripts/start.mjs"], {
  cwd: root,
  env,
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});
child.stdout.on("data", (bytes) => (output += bytes));
child.stderr.on("data", (bytes) => (output += bytes));
child.on("exit", (code) => (exit = code));
try {
  let health;
  for (let i = 0; i < 120; i++) {
    health = await fetch(`http://127.0.0.1:${port}/api/health`, {
      signal: AbortSignal.timeout(500),
    })
      .then((r) => r.json())
      .catch(() => null);
    if (health?.app === "mygo-scala") break;
    assert.equal(exit, null, output);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.equal(health?.app, "mygo-scala", output);
  await new Promise((resolve) => setTimeout(resolve, 1500));
  assert.equal(exit, null, "The backend remains alive after startup");
  const again = spawnSync(process.execPath, ["scripts/start.mjs"], {
    cwd: root,
    env,
    encoding: "utf8",
    timeout: 10000,
  });
  assert.equal(again.status, 0, again.stderr);
  assert.match(again.stdout, /already running/);
  assert.equal(
    (await fetch(`http://127.0.0.1:${port}/api/health`)).status,
    200,
  );
  const batch = spawnSync("cmd.exe", ["/d", "/c", "start-lan.cmd"], {
    cwd: root,
    env,
    input: "\r\n",
    encoding: "utf8",
    timeout: 30000,
    windowsHide: true,
  });
  assert.equal(batch.status, 0, batch.stdout + batch.stderr);
  assert.match(batch.stdout, /already running/);
  assert.match(batch.stdout, /The launcher has finished/);
  console.log(
    "Portable Java/sbt start, persistent backend, existing-server reuse and batch window retention passed.",
  );
} finally {
  writeFileSync(
    new URL("../output/lan-start/server.log", import.meta.url),
    output,
  );
  // This test owns the launcher and its complete child process tree.
  if (exit === null)
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      windowsHide: true,
    });
}
