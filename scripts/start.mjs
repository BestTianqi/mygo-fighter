import { existsSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { launchScala } from "./scala-process.mjs";
const port = Number(process.env.PORT ?? 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT must be between 1 and 65535.");
function addresses(existing = false) {
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
    existing
      ? "The existing backend is still running in its original window. Both players must use the same server.\n"
      : "Keep this window open. Both players must use the same server.\n",
  );
}
const running = await fetch(`http://127.0.0.1:${port}/api/health`, {
  signal: AbortSignal.timeout(1000),
})
  .then((r) => r.json())
  .catch(() => null);
if (running?.app === "mygo-scala") {
  console.log("The MyGO Scala server is already running.");
  addresses(true);
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
console.log(
  "Starting the Scala backend. Waiting for the server to become ready...",
);
const child = launchScala(["run"], {
  env: {
    PORT: String(port),
    WEB_ROOT: fileURLToPath(new URL("../frontend/dist/", import.meta.url)),
  },
  detached: process.platform !== "win32",
});
let checking = false;
const ready = setInterval(async () => {
  if (checking) return;
  checking = true;
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
      signal: AbortSignal.timeout(1000),
    });
    if ((await response.json()).app === "mygo-scala") {
      clearInterval(ready);
      addresses();
    }
  } catch {
  } finally {
    checking = false;
  }
}, 500);
ready.unref();
child.on("error", (error) => {
  clearInterval(ready);
  console.error(`Cannot start sbt: ${error.message}`);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  clearInterval(ready);
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
