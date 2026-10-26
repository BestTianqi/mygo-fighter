import { readFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = new URL("../frontend/public/", import.meta.url);
const sources = new URL("../assets/", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("assets.json", root), "utf8"),
);
const references = new Set();
// Media can appear in nested forms, voices and cutins, not just characters.
function collect(value) {
  if (typeof value === "string" && value.startsWith("/media/"))
    references.add(value.slice(7));
  else if (Array.isArray(value)) value.forEach(collect);
  else if (value && typeof value === "object")
    Object.values(value).forEach(collect);
}
collect(manifest);
// Runtime filenames encode the first 20 SHA-256 digits of the actual bytes.
for (const filename of references) {
  if (!/^[a-f0-9]{20}\.(webp|mp3|mp4|png)$/.test(filename))
    throw new Error(`Invalid media filename: ${filename}`);
  const bytes = await readFile(new URL(`media/${filename}`, root));
  if (
    !filename.startsWith(
      createHash("sha256").update(bytes).digest("hex").slice(0, 20),
    )
  )
    throw new Error(`Media hash mismatch: ${filename}`);
}
const files = await readdir(new URL("media/", root));
for (const filename of files)
  if (!references.has(filename))
    throw new Error(`Unreferenced runtime media: ${filename}`);
// Action catalogs use assets-relative paths; stage entries use repository paths.
// Check both conventions so source reorganization cannot silently break packing.
const sourceReferences = new Set();
for (const catalog of [
  "mygo/anon/anon-extra-actions.json",
  "mygo/soyo/soyo-extra-actions.json",
  "mygo/tomori/tomori-actions.json",
  "mygo/tomori/tomori-penguin-actions.json",
  "mygo/rana/rana-actions.json",
  "mygo/riki/riki-actions.json",
  "mygo/jab-actions.json",
]) {
  const groups = JSON.parse(await readFile(new URL(catalog, sources), "utf8"));
  for (const group of groups) {
    sourceReferences.add(group.file);
    for (const override of Object.values(group.overrides ?? {}))
      sourceReferences.add(override);
  }
}
const viola = JSON.parse(
  await readFile(new URL("mewtype/viola/manifest.json", sources), "utf8"),
);
for (const filename of viola.sourceFiles) sourceReferences.add(filename);
const stages = JSON.parse(
  await readFile(new URL("stages/stages.json", sources), "utf8"),
);
for (const stage of stages) {
  if (!stage.file.startsWith("assets/"))
    throw new Error(`Invalid stage source: ${stage.file}`);
  sourceReferences.add(stage.file.slice(7));
}
for (const filename of sourceReferences) {
  const url = new URL(filename, sources);
  if (!url.href.startsWith(sources.href))
    throw new Error(`Source outside assets/: ${filename}`);
  const file = await stat(url);
  if (!file.isFile() || file.size === 0)
    throw new Error(`Missing or empty artwork source: ${filename}`);
}
console.log(
  `Verified ${references.size} media files, ${sourceReferences.size} artwork sources, ` +
    `${manifest.characters.length} characters and ${manifest.stages.length} stages.`,
);
