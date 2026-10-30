import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { javaEnvironment } from "./java.mjs";

// One staged artifact, three roles. The launcher and the end-to-end check must
// build the same environment and start/stop the same JVM commands, otherwise a
// check could pass against a differently configured service topology.
export const projectRoot = path.resolve(
  fileURLToPath(new URL("..", import.meta.url)),
);
export const stageDir = path.join(
  projectRoot,
  "backend/target/universal/stage",
);
export const stageLibDir = path.join(stageDir, "lib");
export const servicesFile = path.join(projectRoot, "output/run/services.json");
export const roomsPort = 8091;
export const lobbyPort = 8079;
export const mainClass = "services.system.api.Main";

let baseEnvironmentCache;

/** JDK environment from java.mjs, probed once for every role process. */
export function baseEnvironment() {
  baseEnvironmentCache ??= javaEnvironment();
  return baseEnvironmentCache;
}

export function javaCommand(env = baseEnvironment()) {
  const executable = process.platform === "win32" ? "java.exe" : "java";
  return env.JAVA_HOME ? path.join(env.JAVA_HOME, "bin", executable) : "java";
}

/** Reads an optional integer environment override so errors surface before spawning. */
export function integerOption(value, name, fallback) {
  if (value === undefined || value === null || String(value).trim() === "")
    return fallback;
  const number = Number(value);
  if (!Number.isInteger(number)) throw new Error(`${name} must be an integer.`);
  return number;
}

/** Jars produced by `sbt Universal/stage`; empty when the stage is missing. */
export async function stagedLibraries() {
  if (!existsSync(stageLibDir)) return [];
  return (await readdir(stageLibDir)).filter((name) => name.endsWith(".jar"));
}

export async function runStage({ stdio = "inherit" } = {}) {
  const child = spawn(
    process.execPath,
    ["scripts/scala.mjs", "Universal/stage"],
    {
      cwd: projectRoot,
      env: baseEnvironment(),
      stdio,
      windowsHide: true,
    },
  );
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  if (code !== 0)
    throw new Error(`sbt Universal/stage failed with exit code ${code}.`);
}

/** Stages the backend on demand; returns true when a build was required. */
export async function ensureStaged({ stdio = "inherit" } = {}) {
  if ((await stagedLibraries()).length > 0) return false;
  console.log("Staged backend is missing. Running sbt Universal/stage...");
  await runStage({ stdio });
  if ((await stagedLibraries()).length === 0)
    throw new Error(
      `sbt Universal/stage did not create jars in ${stageLibDir}.`,
    );
  return true;
}

function webRootPath(webRoot) {
  const absolute = path.resolve(webRoot);
  return absolute.endsWith(path.sep) ? absolute : `${absolute}${path.sep}`;
}

/**
 * Role-specific configuration for one local topology: rooms on 8091, lobby on
 * 8079 and the public edge on PORT. Edge keeps the LAN binding; internal
 * services stay on loopback behind the internal-only routes.
 */
export function serviceEnvironments({
  edgePort = 8080,
  rooms = roomsPort,
  lobby = lobbyPort,
  host = "0.0.0.0",
  webRoot = path.join(projectRoot, "frontend/dist"),
  maxRooms = 20,
  heartbeatIntervalMs,
  instanceTtlMs,
  internalSecret,
  trustLocalProxy,
} = {}) {
  const lobbyUrl = `http://127.0.0.1:${lobby}`;
  const roomsUrl = `http://127.0.0.1:${rooms}`;
  const shared = internalSecret ? { INTERNAL_SECRET: internalSecret } : {};
  const roomsEnvironment = {
    SERVICE_ROLE: "rooms",
    ROOMS_HOST: "127.0.0.1",
    ROOMS_PORT: String(rooms),
    INSTANCE_ID: "a",
    INSTANCE_URL: roomsUrl,
    MAX_ROOMS: String(maxRooms),
    LOBBY_URL: lobbyUrl,
    ...shared,
  };
  if (heartbeatIntervalMs)
    roomsEnvironment.HEARTBEAT_INTERVAL_MS = String(heartbeatIntervalMs);
  const lobbyEnvironment = {
    SERVICE_ROLE: "lobby",
    LOBBY_HOST: "127.0.0.1",
    LOBBY_PORT: String(lobby),
    MAX_ROOMS: String(maxRooms),
    ROOMS_PER_INSTANCE: String(maxRooms),
    ...shared,
  };
  if (instanceTtlMs) lobbyEnvironment.INSTANCE_TTL_MS = String(instanceTtlMs);
  const edgeEnvironment = {
    SERVICE_ROLE: "edge",
    HOST: host,
    PORT: String(edgePort),
    WEB_ROOT: webRootPath(webRoot),
    LOBBY_URL: lobbyUrl,
    ROOMS_DIRECT_URL: roomsUrl,
    ...shared,
  };
  if (trustLocalProxy) edgeEnvironment.TRUST_LOCAL_PROXY = trustLocalProxy;
  return [
    { role: "rooms", port: rooms, env: roomsEnvironment },
    { role: "lobby", port: lobby, env: lobbyEnvironment },
    { role: "edge", port: edgePort, env: edgeEnvironment },
  ];
}

/** Spawns one role of the staged artifact; the caller owns lifecycle handling. */
export function startService({ role, port, env, stdio = "inherit" }) {
  const base = baseEnvironment();
  const child = spawn(
    javaCommand(base),
    [
      "-Dpolyglot.engine.WarnInterpreterOnly=false",
      "-cp",
      path.join(stageLibDir, "*"),
      mainClass,
    ],
    {
      cwd: projectRoot,
      env: { ...base, ...env },
      stdio,
      // A detached POSIX child leads its own process group so the launcher can
      // stop the JVM (and any helper it starts) with one negative pid signal.
      detached: process.platform !== "win32",
      windowsHide: true,
    },
  );
  return { role, port, child };
}

export async function writeServicesFile(services) {
  await mkdir(path.dirname(servicesFile), { recursive: true });
  await writeFile(
    servicesFile,
    `${JSON.stringify(
      services.map(({ role, port, child }) => ({
        role,
        pid: child.pid ?? 0,
        port,
      })),
      null,
      2,
    )}\n`,
  );
}

export async function removeServicesFile() {
  await rm(servicesFile, { force: true });
  // Keep output/ when other artifacts live there; only drop the empty run dir.
  await rm(path.dirname(servicesFile), {
    recursive: false,
    force: true,
  }).catch(() => {});
}

function hasExited(service) {
  const { child } = service;
  return child.exitCode !== null || child.signalCode !== null;
}

export function killService(service, signal = "SIGTERM") {
  const { child } = service;
  if (!child.pid || hasExited(service)) return;
  try {
    if (process.platform === "win32") child.kill(signal);
    else process.kill(-child.pid, signal);
  } catch {}
}

export function killServices(services, signal = "SIGTERM") {
  for (const service of services) killService(service, signal);
}

export function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function waitForServicesExit(services, timeoutMs = 5000) {
  const startedAt = Date.now();
  while (services.some((service) => !hasExited(service))) {
    if (Date.now() - startedAt >= timeoutMs) return false;
    await delay(100);
  }
  return true;
}

/**
 * Polls a condition with a deadline. `services` makes a crashed or stopped
 * child abort the wait instead of reporting a misleading timeout.
 */
export async function waitFor(
  check,
  {
    timeoutMs = 90000,
    intervalMs = 400,
    label = "the expected condition",
    services = [],
    aborted = () => false,
  } = {},
) {
  const startedAt = Date.now();
  let lastError = null;
  for (;;) {
    if (aborted()) throw new Error(`Stopped while waiting for ${label}.`);
    for (const service of services) {
      if (!hasExited(service)) continue;
      const state = service.child.signalCode
        ? `signal ${service.child.signalCode}`
        : `code ${service.child.exitCode ?? "unknown"}`;
      throw new Error(
        `The ${service.role} service exited with ${state} while waiting for ${label}.`,
      );
    }
    try {
      const value = await check();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    if (Date.now() - startedAt >= timeoutMs) {
      const detail = lastError ? `: ${lastError.message}` : "";
      throw new Error(
        `Timed out after ${timeoutMs}ms waiting for ${label}${detail}.`,
      );
    }
    await delay(intervalMs);
  }
}

export async function fetchJson(url, timeoutMs = 1000) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
  return await response.json();
}

export async function waitForJson(url, accept, options = {}) {
  return waitFor(
    async () => {
      const body = await fetchJson(url, options.requestTimeoutMs ?? 1000);
      return accept(body) ? body : null;
    },
    { ...options, label: options.label ?? url },
  );
}

/** Fails before startup (or after a stale run) when a role port is taken. */
export function requireFreePort(
  port,
  message = `Port ${port} is already in use.`,
) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", () => reject(new Error(message)));
    server.listen(port, "0.0.0.0", () => server.close(() => resolve()));
  });
}
