import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const frontend = fileURLToPath(new URL("../frontend/", import.meta.url));
const sourceRoot = path.join(frontend, "src");
const configFile = path.join(frontend, "tsconfig.json");
const config = ts.readConfigFile(configFile, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, frontend);
const cache = ts.createModuleResolutionCache(frontend, (name) => name);
const failures = [];
let checked = 0;
const inside = (name, directory) =>
  name === directory || name.startsWith(`${directory}/`);
const relative = (file) =>
  path.relative(sourceRoot, file).split(path.sep).join("/");
const region = (name) =>
  /^pages\/GamePage\/components\/(BattlePanel|CharacterSelection|LanLobby)\//.exec(
    name,
  )?.[1];

/** Keep dependency direction independent of file names and import aliases. */
function violations(owner, target) {
  const errors = [];
  if (inside(owner, "game") && !inside(target, "game"))
    errors.push("shared combat may import only shared combat modules");
  if (
    inside(owner, "apis") &&
    !inside(target, "apis") &&
    !inside(target, "game")
  )
    errors.push("API transport may import only API and combat modules");
  if (
    inside(owner, "assets") &&
    !inside(target, "assets") &&
    !inside(target, "game")
  )
    errors.push("application assets may import only assets and combat modules");
  if (
    inside(owner, "pages/GamePage/runtime") &&
    (inside(target, "pages/GamePage/components") ||
      inside(target, "pages/GamePage/hooks") ||
      target === "pages/GamePage/index.tsx")
  )
    errors.push("runtime must not depend on React page regions or hooks");
  if (region(owner) && region(target) && region(owner) !== region(target))
    errors.push("page regions must share helpers at page level");
  if (
    inside(owner, "components/ui") &&
    !inside(target, "components/ui") &&
    !target.startsWith("external:")
  )
    errors.push("shared UI primitives must not depend on application features");
  if (
    owner === "App.tsx" &&
    inside(target, "pages") &&
    target !== "pages/GamePage/index.tsx"
  )
    errors.push("application startup must not depend on page internals");
  return errors;
}

for (const file of parsed.fileNames) {
  const owner = relative(file);
  const tree = ts.createSourceFile(
    file,
    ts.sys.readFile(file),
    ts.ScriptTarget.Latest,
    true,
  );
  function checkImport(specifier) {
    const resolved = ts.resolveModuleName(
      specifier,
      file,
      parsed.options,
      ts.sys,
      cache,
    ).resolvedModule;
    const target =
      resolved && !resolved.isExternalLibraryImport
        ? relative(resolved.resolvedFileName)
        : `external:${specifier}`;
    for (const error of violations(owner, target))
      failures.push(`${owner} -> ${target}: ${error}`);
    checked++;
  }
  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    )
      checkImport(node.moduleSpecifier.text);
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    )
      checkImport(node.arguments[0].text);
    if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteralLike(node.argument.literal)
    )
      checkImport(node.argument.literal.text);
    ts.forEachChild(node, visit);
  }
  visit(tree);
}
assert.equal(failures.length, 0, failures.join("\n"));
console.log(`Verified frontend ownership across ${checked} module references.`);
