import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { javaEnvironment } from "../scripts/java.mjs";

if (process.platform !== "win32") {
  console.log("Windows JLine check only runs on Windows.");
  process.exit(0);
}
const root = fileURLToPath(new URL("../", import.meta.url));
const toolchain = join(root, "output/toolchain");
const portable = existsSync(toolchain)
  ? readdirSync(toolchain).find((name) => name.startsWith("jdk-"))
  : null;
const home =
  process.env.MYGO_TEST_JAVA_HOME ??
  (portable ? join(toolchain, portable) : process.env.JAVA_HOME);
const boot = join(toolchain, "sbt-boot");
const native = existsSync(boot)
  ? readdirSync(boot, { recursive: true }).find((p) =>
      /jline-native-[^\\/]+\.jar$/.test(p),
    )
  : null;
assert(
  home && native,
  "Set MYGO_TEST_JAVA_HOME and cache sbt's JLine dependencies first.",
);
const folder = resolve(root, "output/windows java check");
mkdirSync(folder, { recursive: true });
const source = join(folder, "JLineProbe.java");
writeFileSync(
  source,
  `public class JLineProbe {
  public static void main(String[] args) throws Exception {
    Class.forName("org.jline.nativ.Kernel32");
    System.out.println("JLINE_NATIVE_OK");
    System.out.println("MARKER=" + System.getProperty("mygo.launcher.marker"));
    System.out.println("TEMP=" + System.getProperty("java.io.tmpdir"));
  }
}`,
);
const compile = spawnSync(join(home, "bin/javac.exe"), ["-d", folder, source], {
  encoding: "utf8",
});
assert.equal(compile.status, 0, compile.stderr);
const blocked = join(folder, "blocked-temp");
writeFileSync(blocked, "A file cannot be used as a temporary directory.");
const saved = {
  JAVA_HOME: process.env.JAVA_HOME,
  TEMP: process.env.TEMP,
  TMP: process.env.TMP,
  JAVA_TOOL_OPTIONS: process.env.JAVA_TOOL_OPTIONS,
};
try {
  process.env.JAVA_HOME = home;
  process.env.TEMP = process.env.TMP = blocked;
  process.env.JAVA_TOOL_OPTIONS = [
    saved.JAVA_TOOL_OPTIONS,
    "-Dmygo.launcher.marker=preserved",
  ]
    .filter(Boolean)
    .join(" ");
  const args = ["-cp", folder + ";" + join(boot, native), "JLineProbe"];
  const run = (env) =>
    spawnSync(join(home, "bin/java.exe"), args, {
      encoding: "utf8",
      env,
      timeout: 15000,
    });
  const broken = run({ ...process.env });
  assert.notEqual(
    broken.status,
    0,
    "The probe must reproduce the native library failure.",
  );
  assert.match(broken.stderr, /Unable to load jline native library/);
  console.log(
    "Reproduced: JLine cannot extract its DLL into an unusable Windows TEMP.",
  );
  const fixed = run(javaEnvironment());
  assert.equal(fixed.status, 0, fixed.stderr);
  assert.match(fixed.stdout, /JLINE_NATIVE_OK/);
  assert.match(fixed.stdout, /MARKER=preserved/);
  assert(!fixed.stdout.includes("TEMP=" + blocked));
  console.log(
    "Passed: the launcher loads JLine with a broken user TEMP and preserves Java options.",
  );
} finally {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
