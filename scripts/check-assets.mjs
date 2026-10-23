import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = new URL("../frontend/public/", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("assets.json", root), "utf8"),
);
const references = new Set();
function collect(value) {
  if (typeof value === "string" && value.startsWith("/media/"))
    references.add(value.slice(7));
  else if (Array.isArray(value)) value.forEach(collect);
  else if (value && typeof value === "object")
    Object.values(value).forEach(collect);
}
collect(manifest);
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
if (manifest.characters.length !== 15 || manifest.stages.length !== 15)
  throw new Error("Incomplete character or stage catalog");
console.log(
  `Verified ${references.size} media files, 15 characters and 15 stages.`,
);
