import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = path.resolve(
  fileURLToPath(new URL("..", import.meta.url)),
);

/**
 * Bundles a kernel entry with the project esbuild and evaluates it in Node.
 * Used by the check scripts so roster/catalog expectations follow the kernel
 * instead of hardcoded counts.
 */
export async function evaluate(entry, exports, options = {}) {
  const root = options.root ?? defaultRoot;
  const specifier = entry.startsWith(".") ? entry : `./${entry}`;
  const contents = `export { ${exports.join(", ")} } from "${specifier}";`;
  const result = await build({
    absWorkingDir: root,
    stdin: {
      contents,
      resolveDir: root,
      sourcefile: "kernel-entry.ts",
      loader: "ts",
    },
    bundle: true,
    write: false,
    platform: "node",
    format: "esm",
    target: "node22",
    logLevel: "silent",
  });
  const code = result.outputFiles[0].text;
  return import(
    "data:text/javascript;base64," + Buffer.from(code).toString("base64")
  );
}
