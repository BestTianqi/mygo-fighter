import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const repository = new URL("../", import.meta.url);
const query = process.argv.slice(2).join(" ").trim().toLowerCase();
if (!query) {
  console.log(
    "Usage: npm run assets:find -- <name, manifest key or media hash>",
  );
  console.log("Examples: penguin, soyo, mujicaForms.6, ultimateFinishes, .mp4");
  process.exit(0);
}

const sourceMatches = [];
async function findSources(directory) {
  const entries = await readdir(new URL(directory, repository), {
    withFileTypes: true,
  });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const path = `${directory}${entry.name}`;
    if (entry.isDirectory()) await findSources(`${path}/`);
    else if (path.toLowerCase().includes(query)) sourceMatches.push(path);
  }
}
await findSources("assets/");
const manifest = JSON.parse(
  await readFile(new URL("frontend/public/assets.json", repository), "utf8"),
);
const runtimeMatches = [];
function findRuntime(value, path = "", inheritedMatch = false) {
  const matches =
    inheritedMatch ||
    path.toLowerCase().includes(query) ||
    (typeof value?.key === "string" && value.key.toLowerCase().includes(query));
  if (typeof value === "string" && value.startsWith("/media/")) {
    if (matches || value.toLowerCase().includes(query))
      runtimeMatches.push(`${path} -> frontend/public${value}`);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value))
      findRuntime(child, path ? `${path}.${key}` : key, matches);
  }
}
findRuntime(manifest);
console.log(`Source files (${sourceMatches.length}):`);
for (const path of sourceMatches.sort()) console.log(`  ${path}`);
console.log(`\nRuntime bindings (${runtimeMatches.length}):`);
for (const binding of runtimeMatches) console.log(`  ${binding}`);
console.log(
  `\nPacking commands and game consumers: ${fileURLToPath(new URL("assets/README.md", repository))}`,
);
console.log(
  "Source and runtime matches are independent; cropped/packed artwork has different hashes.",
);
if (!sourceMatches.length && !runtimeMatches.length) process.exitCode = 1;
