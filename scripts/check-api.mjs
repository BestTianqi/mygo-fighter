import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Public API names are derived from API message class names on both sides of
// the wire. A rename in either place breaks the game with a 404 instead of a
// compile error, so the routes and the frontend call files must agree.
const routesFile = new URL(
  "../backend/src/main/scala/services/rooms/routes/RoomRoutes.scala",
  import.meta.url,
);
const frontendDirectory = fileURLToPath(
  new URL("../frontend/src/apis/rooms/", import.meta.url),
);
const backendApiDirectory = fileURLToPath(
  new URL("../backend/src/main/scala/services/rooms/api/", import.meta.url),
);
const distAssetsDirectory = new URL(
  "../frontend/dist/assets/",
  import.meta.url,
);

const BUNDLE_CLASS_NAMES = [
  "CreateRoomMessage",
  "ChooseRoomMessage",
  "LobbyRoomMessage",
];

function apiName(messageName) {
  return messageName.replace(/Message$/, "").toLowerCase();
}

const routes = await readFile(routesFile, "utf8");
const registered = new Set();
for (const match of routes.matchAll(
  /(?:APIRegistration\.named|authenticated)\s*\[\s*(?:[\w.]+\.)?(\w+Message)\s*\]/g,
))
  registered.add(apiName(match[1]));
if (registered.size === 0)
  throw new Error(
    "Cannot find APIRegistration.named[...] or authenticated[...] entries in RoomRoutes.scala.",
  );

const frontendNames = new Set(
  (await readdir(frontendDirectory))
    .filter((name) => name.endsWith("Message.ts"))
    .map((name) => name.replace(/Message\.ts$/, "").toLowerCase()),
);

const missingInFrontend = [...registered]
  .filter((name) => !frontendNames.has(name))
  .sort();
const missingInRoutes = [...frontendNames]
  .filter((name) => !registered.has(name))
  .sort();
if (missingInFrontend.length > 0 || missingInRoutes.length > 0) {
  const details = [];
  if (missingInFrontend.length > 0)
    details.push(
      `registered in RoomRoutes but missing frontend file: ${missingInFrontend.join(", ")}`,
    );
  if (missingInRoutes.length > 0)
    details.push(
      `frontend file without a route registration: ${missingInRoutes.join(", ")}`,
    );
  throw new Error(
    `Room API names do not match frontend message files: ${details.join("; ")}.`,
  );
}

const backendMessages = (await readdir(backendApiDirectory)).filter((name) =>
  /Message\.scala$/.test(name),
);
const internalOnly = backendMessages
  .map((name) => apiName(name.replace(/\.scala$/, "")))
  .filter((name) => !registered.has(name));
console.log(
  `Verified ${registered.size} room API names match frontend message files.` +
    (internalOnly.length > 0
      ? ` Ignored ${internalOnly.length} internal-only room messages.`
      : ""),
);

// Vite uses esbuild keepNames so the class name survives minification and can
// still derive the API route name in the browser.
if (existsSync(distAssetsDirectory)) {
  const bundles = (await readdir(distAssetsDirectory)).filter((name) =>
    name.endsWith(".js"),
  );
  if (bundles.length === 0) {
    console.log(
      "Skipped dist bundle check: frontend/dist/assets has no JavaScript bundle.",
    );
  } else {
    const contents = await Promise.all(
      bundles.map((name) =>
        readFile(new URL(name, distAssetsDirectory), "utf8"),
      ),
    );
    const bundle = contents.join("\n");
    const missing = BUNDLE_CLASS_NAMES.filter((name) => !bundle.includes(name));
    if (missing.length > 0)
      throw new Error(
        `frontend/dist lost room message class names required by keepNames: ${missing.join(", ")}.`,
      );
    console.log(
      `Verified the dist bundle keeps ${BUNDLE_CLASS_NAMES.length} room message class names.`,
    );
  }
} else {
  console.log("Skipped dist bundle check: frontend/dist is not built.");
}
