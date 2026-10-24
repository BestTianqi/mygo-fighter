import { existsSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
export function javaEnvironment() {
  const candidates = [
    process.env.JAVA_HOME,
    ...(process.platform === "darwin"
      ? [
          "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home",
          "/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home",
        ]
      : []),
    undefined,
  ];
  for (const home of candidates) {
    if (home && !existsSync(home)) continue;
    const executable = home
      ? `${home}/bin/java${process.platform === "win32" ? ".exe" : ""}`
      : "java";
    const result = spawnSync(executable, ["-version"], { encoding: "utf8" });
    const version = Number(
      ((result.stderr ?? "") + (result.stdout ?? "")).match(
        /version "(\d+)/,
      )?.[1] ?? 0,
    );
    if (result.status === 0 && version >= 21) {
      const env = { ...process.env, ...(home ? { JAVA_HOME: home } : {}) };
      if (process.platform === "win32") {
        // JLine extracts its console DLL here, including in forked sbt JVMs.
        const temp = fileURLToPath(
          new URL("../output/java-tmp/", import.meta.url),
        );
        mkdirSync(temp, { recursive: true });
        env.TEMP = env.TMP = temp;
      }
      return env;
    }
  }
  throw new Error(
    "Java 21 or newer is required. Install a JDK and set JAVA_HOME to its installation folder.",
  );
}
