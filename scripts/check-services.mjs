import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { projectRoot } from "./services-process.mjs";

// Static service boundaries for the three-process backend. These checks catch
// the architectural regressions that Scala cannot express: a rooms process
// reaching for the lobby, or the 120 Hz tick loop starting a network request.
const servicesDirectory = path.join(
  projectRoot,
  "backend/src/main/scala/services",
);
const deployDirectory = path.join(projectRoot, "deploy");
const failures = [];

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  failures.push(message);
  console.log(`FAIL ${message}`);
}

function relative(target) {
  return path.relative(projectRoot, target);
}

async function isDirectory(target) {
  try {
    return (await stat(target)).isDirectory();
  } catch {
    return false;
  }
}

async function isFile(target) {
  try {
    return (await stat(target)).isFile();
  } catch {
    return false;
  }
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(target)));
    else files.push(target);
  }
  return files;
}

function importLines(contents) {
  return contents
    .split("\n")
    .filter((line) => line.trimStart().startsWith("import"));
}

// services/<name> must keep its public layer split; shared infrastructure
// (system) has no private utils directory of its own.
const requiredDirectories = {
  system: ["api", "objects", "routes"],
  rooms: ["api", "objects", "routes", "utils"],
  lobby: ["api", "objects", "routes", "utils"],
  edge: ["api", "objects", "routes", "utils"],
};
for (const [service, directories] of Object.entries(requiredDirectories)) {
  const root = path.join(servicesDirectory, service);
  if (!(await isDirectory(root))) {
    fail(
      `services/${service}/ is missing from backend/src/main/scala/services`,
    );
    continue;
  }
  const missing = [];
  for (const directory of directories)
    if (!(await isDirectory(path.join(root, directory))))
      missing.push(directory);
  if (missing.length > 0)
    fail(
      `services/${service}/ is missing ${missing.map((name) => `${name}/`).join(", ")}`,
    );
  else
    pass(
      `services/${service}/ has ${directories.map((name) => `${name}/`).join(", ")}` +
        (service === "system"
          ? " (utils/ is not required for shared infrastructure)"
          : ""),
    );
}

/** Reports files whose import lines cross a forbidden service boundary. */
async function checkImports(label, files, forbidden, message) {
  const violations = [];
  for (const file of files) {
    const contents = await readFile(file, "utf8");
    const boundary = importLines(contents).filter((line) =>
      forbidden.test(line),
    );
    if (boundary.length > 0)
      violations.push(`${relative(file)}: ${boundary[0].trim()}`);
  }
  if (violations.length > 0) fail(`${label}: ${violations.join("; ")}`);
  else pass(message);
}

const roomsFiles = await walk(path.join(servicesDirectory, "rooms"));
await checkImports(
  "services/rooms must not import another process's modules",
  roomsFiles,
  /services\.(?:edge|lobby)\b/,
  "services/rooms does not import services.edge or services.lobby",
);

const edgeFiles = await walk(path.join(servicesDirectory, "edge"));
const lobbyFiles = await walk(path.join(servicesDirectory, "lobby"));
await checkImports(
  "services/edge must not import the rooms process",
  edgeFiles,
  /services\.rooms\b/,
  "services/edge does not import services.rooms",
);
await checkImports(
  "services/lobby must not import the rooms process",
  lobbyFiles,
  /services\.rooms\b/,
  "services/lobby does not import services.rooms",
);

// The room clock, simulation kernel and API message handlers stay in-process.
// *Main.scala files are composition roots and may wire a LobbyClient for
// heartbeats outside the tick loop.
const roomsApiDirectory = path.join(servicesDirectory, "rooms/api");
const tickPathFiles = [
  path.join(servicesDirectory, "rooms/utils/RoomRuntime.scala"),
  path.join(servicesDirectory, "rooms/utils/Simulation.scala"),
  ...(await readdir(roomsApiDirectory))
    .filter((name) => name.endsWith(".scala") && !name.endsWith("Main.scala"))
    .sort()
    .map((name) => path.join(roomsApiDirectory, name)),
];
const tickPathViolations = [];
for (const file of tickPathFiles) {
  if (!(await isFile(file))) {
    tickPathViolations.push(`${relative(file)} is missing`);
    continue;
  }
  const contents = await readFile(file, "utf8");
  const banned = ["java.net.http", "InstanceClient", "LobbyClient"].filter(
    (token) => contents.includes(token),
  );
  if (banned.length > 0)
    tickPathViolations.push(
      `${relative(file)} references ${banned.join(", ")}`,
    );
}
if (tickPathViolations.length > 0)
  fail(
    `rooms tick path must not call other processes: ${tickPathViolations.join("; ")}`,
  );
else
  pass(
    "rooms tick path (RoomRuntime, Simulation, api messages) has no cross-process HTTP calls",
  );

const mainFile = path.join(servicesDirectory, "system/api/Main.scala");
if (!(await isFile(mainFile))) {
  fail("services/system/api/Main.scala is missing");
} else {
  const main = await readFile(mainFile, "utf8");
  const missingRoles = ["edge", "lobby", "rooms", "all"].filter(
    (role) => !new RegExp(`case\\s+"${role}"`).test(main),
  );
  if (!main.includes("SERVICE_ROLE"))
    missingRoles.push("the SERVICE_ROLE environment lookup");
  if (missingRoles.length > 0)
    fail(
      `services/system/api/Main.scala is missing role branches: ${missingRoles.join(", ")}`,
    );
  else
    pass(
      "services/system/api/Main.scala switches SERVICE_ROLE between edge, lobby, rooms and all",
    );
}

// Production runs the same artifact under one systemd unit per role; each unit
// must select its role either directly or through its shipped env example.
const units = [
  { file: "mygo-edge.service", role: "edge" },
  { file: "mygo-lobby.service", role: "lobby" },
  { file: "mygo-rooms@.service", role: "rooms" },
];
for (const { file, role } of units) {
  const unitPath = path.join(deployDirectory, file);
  if (!(await isFile(unitPath))) {
    fail(`deploy/${file} is missing`);
    continue;
  }
  const unit = await readFile(unitPath, "utf8");
  const sources = [unit];
  for (const match of unit.matchAll(/EnvironmentFile=-?(\S+)/g)) {
    const name = path.basename(match[1]);
    const candidates = [
      path.join(deployDirectory, "env", `${name}.example`),
      path.join(deployDirectory, `${name}.example`),
      path.join(deployDirectory, "env", `${role}.env.example`),
      path.join(deployDirectory, `${role}.env.example`),
    ];
    for (const candidate of candidates)
      if (await isFile(candidate))
        sources.push(await readFile(candidate, "utf8"));
  }
  const serviceRole = new RegExp(`SERVICE_ROLE\\s*=\\s*"?${role}"?`);
  if (sources.some((source) => serviceRole.test(source)))
    pass(`deploy/${file} sets SERVICE_ROLE=${role}`);
  else fail(`deploy/${file} does not set SERVICE_ROLE=${role}`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} service structure check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log("\nAll service structure checks passed.");
}
