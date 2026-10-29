import { existsSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { fileURLToPath } from "node:url";
import {
  integerOption,
  killServices,
  lobbyPort,
  removeServicesFile,
  requireFreePort,
  roomsPort,
  runStage,
  serviceEnvironments,
  stagedLibraries,
  startService,
  waitForJson,
  waitForServicesExit,
  writeServicesFile,
} from "./services-process.mjs";

const port = integerOption(process.env.PORT, "PORT", 8080);
if (port < 1 || port > 65535)
  throw new Error("PORT must be between 1 and 65535.");
const maxRooms = integerOption(process.env.MAX_ROOMS, "MAX_ROOMS", 20);
if (maxRooms < 1) throw new Error("MAX_ROOMS must be a positive integer.");
const host = process.env.HOST?.trim() || "0.0.0.0";
const webRoot = fileURLToPath(new URL("../frontend/dist/", import.meta.url));
const heartbeatIntervalMs =
  process.env.HEARTBEAT_INTERVAL_MS?.trim() || undefined;
const instanceTtlMs = process.env.INSTANCE_TTL_MS?.trim() || undefined;
const internalSecret = process.env.INTERNAL_SECRET?.trim() || undefined;
const trustLocalProxy = process.env.TRUST_LOCAL_PROXY?.trim() || undefined;

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

// Reuse only a server that identifies itself as this application. The port
// probes below report unrelated listeners instead of treating them as ready.
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
await requireFreePort(
  port,
  `Port ${port} is already in use. Close that server or set PORT to another port.`,
);
for (const [role, rolePort] of [
  ["lobby", lobbyPort],
  ["rooms", roomsPort],
]) {
  if (rolePort === port) continue;
  await requireFreePort(
    rolePort,
    `Port ${rolePort} (${role}) is already in use. Close the old server before starting the three services.`,
  );
}
if (
  !existsSync(new URL("../frontend/dist/index.html", import.meta.url)) ||
  !existsSync(
    new URL("../backend/src/main/resources/simulation.js", import.meta.url),
  )
)
  throw new Error(
    "Build the project first with npm run build, or use npm run lan.",
  );

// The launcher ships one artifact and chooses each service role at runtime, so
// rebuild the staged JVM distribution before spawning the three processes.
console.log(
  (await stagedLibraries()).length > 0
    ? "Rebuilding the staged Scala backend..."
    : "Building the staged Scala backend (the first build can take a while)...",
);
await runStage();
if ((await stagedLibraries()).length === 0)
  throw new Error(
    "sbt Universal/stage did not produce jars in backend/target/universal/stage/lib.",
  );

console.log(
  "Starting the rooms, lobby and edge services. Waiting for the server to become ready...",
);
const services = [];
try {
  for (const service of serviceEnvironments({
    edgePort: port,
    host,
    webRoot,
    maxRooms,
    heartbeatIntervalMs,
    instanceTtlMs,
    internalSecret,
    trustLocalProxy,
  }))
    services.push(startService(service));
} catch (error) {
  killServices(services, "SIGTERM");
  await waitForServicesExit(services, 5000);
  throw error;
}

let shuttingDown = false;
let exitCode = 0;
let remaining = services.length;
let finished = false;

async function finish() {
  if (finished) return;
  finished = true;
  await removeServicesFile().catch(() => {});
  process.exit(exitCode);
}

function finishIfStopped() {
  if (shuttingDown && remaining === 0) void finish();
}

function beginShutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  exitCode = code;
  killServices(services, "SIGTERM");
  // Detached JVMs should stop promptly; force them so a stuck process cannot
  // keep the launcher window open forever, then stop waiting for stragglers.
  setTimeout(() => killServices(services, "SIGKILL"), 6000).unref();
  setTimeout(() => {
    if (remaining === 0) return;
    console.error("Some services did not stop. Closing the launcher anyway.");
    void finish();
  }, 12000).unref();
  finishIfStopped();
}

try {
  await writeServicesFile(services);
} catch (error) {
  killServices(services, "SIGTERM");
  await waitForServicesExit(services, 5000);
  killServices(services, "SIGKILL");
  throw error;
}

for (const service of services) {
  let handled = false;
  const stopped = (detail) => {
    if (handled) return;
    handled = true;
    remaining -= 1;
    if (shuttingDown) {
      finishIfStopped();
      return;
    }
    console.error(
      `The ${service.role} service ${detail}. Stopping the other services...`,
    );
    beginShutdown(1);
  };
  service.child.on("error", (error) => {
    stopped(`could not start (${error.message})`);
  });
  service.child.on("exit", (code, signal) => {
    stopped(`exited unexpectedly (${signal ?? `code ${code}`})`);
  });
}

// sbt spawning is not readiness. Print playable addresses only after the edge
// answers /api/health with this application's payload.
waitForJson(
  `http://127.0.0.1:${port}/api/health`,
  (body) => body?.app === "mygo-scala",
  {
    label: "the edge to become ready",
    timeoutMs: 180000,
    intervalMs: 500,
    services,
    aborted: () => shuttingDown,
  },
)
  .then(() => {
    if (!shuttingDown) addresses();
  })
  .catch((error) => {
    if (shuttingDown) return;
    console.error(error.message);
    beginShutdown(1);
  });

// Closing the launcher window stops the whole local topology, not one role.
const signals =
  process.platform === "win32"
    ? ["SIGINT", "SIGTERM"]
    : ["SIGINT", "SIGTERM", "SIGHUP"];
for (const signal of signals) process.on(signal, () => beginShutdown(0));
