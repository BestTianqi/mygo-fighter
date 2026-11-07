import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  readFile,
  realpath,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const workspace = fileURLToPath(new URL("../", import.meta.url));
const regenerate =
  "Run python tools/optimize_web_assets.py to regenerate web assets.";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

function rewrite(value, replacements, references) {
  if (typeof value === "string") {
    if (value.startsWith("/media/")) references.add(value);
    return replacements.get(value) ?? value;
  }
  if (Array.isArray(value))
    return value.map((item) => rewrite(item, replacements, references));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        rewrite(item, replacements, references),
      ]),
    );
  return value;
}

export async function prepareWebAssets(root = workspace) {
  root = await realpath(root);
  const original = join(root, "frontend/public");
  const optimized = join(root, "assets/optimized-web");
  const destination = resolve(root, "output/web-public");
  let manifest;
  try {
    manifest = JSON.parse(
      await readFile(join(optimized, "manifest.json"), "utf8"),
    );
  } catch (error) {
    throw new Error(`Cannot read optimized web manifest. ${regenerate}`, {
      cause: error,
    });
  }
  if (manifest.version !== 1 || !Array.isArray(manifest.entries))
    throw new Error(`Unsupported optimized web manifest. ${regenerate}`);
  const assets = JSON.parse(
    await readFile(join(original, "assets.json"), "utf8"),
  );
  const references = new Set();
  rewrite(assets, new Map(), references);
  const replacements = new Map();
  for (const entry of manifest.entries) {
    if (
      !/^\/media\/[a-f0-9]{20}\.webp$/.test(entry.source) ||
      !/^\/media\/[a-f0-9]{20}\.webp$/.test(entry.output) ||
      replacements.has(entry.source) ||
      entry.source === entry.output
    )
      throw new Error(
        `Invalid optimized web entry: ${entry.source}. ${regenerate}`,
      );
    if (!references.has(entry.source))
      throw new Error(
        `Optimized source is no longer referenced: ${entry.source}. ${regenerate}`,
      );
    for (const [label, directory, url, expectedHash, expectedBytes] of [
      ["Source", original, entry.source, entry.sourceSha256, entry.sourceBytes],
      ["Optimized", optimized, entry.output, entry.sha256, entry.bytes],
    ]) {
      let bytes;
      try {
        bytes = await readFile(join(directory, url.slice(1)));
      } catch (error) {
        throw new Error(`${label} image is missing: ${url}. ${regenerate}`, {
          cause: error,
        });
      }
      const actualHash = hash(bytes);
      if (
        actualHash !== expectedHash ||
        bytes.length !== expectedBytes ||
        url !== `/media/${actualHash.slice(0, 20)}.webp`
      )
        throw new Error(
          `${label} image hash or size changed: ${url}. ${regenerate}`,
        );
    }
    replacements.set(entry.source, entry.output);
  }

  // Only this known generated directory may be cleared. Resolve its parent
  // first so an output junction cannot redirect recursive deletion elsewhere.
  await mkdir(join(root, "output"), { recursive: true });
  const outputDirectory = await realpath(join(root, "output"));
  const withinRoot = relative(root, outputDirectory);
  if (
    withinRoot !== "output" ||
    destination !== join(outputDirectory, "web-public")
  )
    throw new Error(`Refusing to clear web-public outside ${root}${sep}output`);
  await rm(destination, { recursive: true, force: true });
  await cp(original, destination, { recursive: true });
  for (const entry of manifest.entries) {
    await unlink(join(destination, entry.source.slice(1)));
    await cp(
      join(optimized, entry.output.slice(1)),
      join(destination, entry.output.slice(1)),
    );
  }
  const published = rewrite(assets, replacements, new Set());
  const publishedReferences = new Set();
  rewrite(published, new Map(), publishedReferences);
  const expectedReferences = new Set(
    [...references].map((url) => replacements.get(url) ?? url),
  );
  if (
    publishedReferences.size !== expectedReferences.size ||
    [...expectedReferences].some((url) => !publishedReferences.has(url))
  )
    throw new Error(
      "Published media references differ from the original asset catalog.",
    );
  for (const url of publishedReferences) {
    if (!/^\/media\/[a-f0-9]{20}\.(webp|png|mp3|mp4)$/.test(url))
      throw new Error(`Invalid published media URL: ${url}`);
    const bytes = await readFile(join(destination, url.slice(1)));
    if (!url.startsWith(`/media/${hash(bytes).slice(0, 20)}.`))
      throw new Error(`Published media hash mismatch: ${url}`);
  }
  await writeFile(join(destination, "assets.json"), JSON.stringify(published));
  console.log(
    `Prepared web assets: ${replacements.size} optimized images, ${publishedReferences.size} media references.`,
  );
  return destination;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await prepareWebAssets();
