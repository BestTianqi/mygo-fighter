import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { javaEnvironment } from "./java.mjs";
const port = Number(process.env.PORT ?? 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT must be between 1 and 65535.");
function addresses() {
  console.log(`\nThis computer: http://localhost:${port}`);
  for (const [name, list] of Object.entries(networkInterfaces()))
    for (const ip of list ?? []) {
      if (
        ip.family === "IPv4" &&
        !ip.internal &&
        !/^(utun|awdl|llw|tun|tap)/i.test(name) &&
        !/^(169\.254\.|198\.1[89]\.)/.test(ip.address)
      )
        console.log(`LAN (${name}): http://${ip.address}:${port}`);
    }
  console.log(
    "Keep this window open. Both players must use the same server.\n",
  );
}
const running = await fetch(`http://127.0.0.1:${port}/api/health`, {
  signal: AbortSignal.timeout(1000),
})
  .then((r) => r.json())
  .catch(() => null);
if (running?.app === "mygo-scala") {
  console.log("The MyGO Scala server is already running.");
  addresses();
  process.exit(0);
}
await new Promise((resolve, reject) => {
  const server = createServer();
  server.once("error", () =>
    reject(
      new Error(
        `Port ${port} is already in use. Close that server or set PORT to another port.`,
      ),
    ),
  );
  server.listen(port, "0.0.0.0", () => server.close(resolve));
});
if (
  !existsSync(new URL("../frontend/dist/index.html", import.meta.url)) ||
  !existsSync(
    new URL("../backend/src/main/resources/simulation.js", import.meta.url),
  )
)
  throw new Error(
    "Build the project first with npm run build, or use npm run lan.",
  );
addresses();
const child = spawn("sbt", ["run"], {
  cwd: new URL("../backend/", import.meta.url),
  env: {
    ...javaEnvironment(),
    PORT: String(port),
    WEB_ROOT: fileURLToPath(new URL("../frontend/dist/", import.meta.url)),
  },
  stdio: "inherit",
  shell: process.platform === "win32",
  detached: process.platform !== "win32",
});
child.on("error", (error) => {
  console.error(`Cannot start sbt: ${error.message}`);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    if (child.pid && process.platform !== "win32") {
      try {
        process.kill(-child.pid, signal);
      } catch {}
    } else child.kill(signal);
  });
