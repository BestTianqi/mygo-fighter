import { readFile } from "node:fs/promises";

const frontendSource = new URL(
  "../frontend/src/game/networkProtocol.ts",
  import.meta.url,
);
const scalaSource = new URL(
  "../backend/src/main/scala/services/rooms/objects/GameProtocol.scala",
  import.meta.url,
);

const [frontend, scala] = await Promise.all([
  readFile(frontendSource, "utf8"),
  readFile(scalaSource, "utf8"),
]);

function versionOf(source, pattern, name) {
  const match = source.match(pattern);
  if (!match) throw new Error(`Cannot find ${name} in source`);
  return Number(match[1]);
}

const frontendVersion = versionOf(
  frontend,
  /NETWORK_PROTOCOL\s*=\s*(\d+)/,
  "NETWORK_PROTOCOL",
);
const scalaVersion = versionOf(
  scala,
  /val\s+Version\s*:\s*Int\s*=\s*(\d+)/,
  "GameProtocol.Version",
);

if (frontendVersion !== scalaVersion)
  throw new Error(
    `Protocol mismatch: NETWORK_PROTOCOL is ${frontendVersion}, ` +
      `GameProtocol.Version is ${scalaVersion}`,
  );

console.log(`Verified websocket protocol version ${frontendVersion}.`);
