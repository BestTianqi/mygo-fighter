import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { javaEnvironment } from "./java.mjs";

// Both npm start and the Scala developer commands use the same toolchain.
export function launchScala(
  args,
  { env: overrides = {}, detached = false } = {},
) {
  const env = { ...javaEnvironment(), ...overrides };
  const toolchain = new URL("../output/toolchain/", import.meta.url);
  const path = (name) => fileURLToPath(new URL(name, toolchain));
  const portable = existsSync(path("sbt-launch.jar"));
  const java = env.JAVA_HOME
    ? `${env.JAVA_HOME}/bin/java${process.platform === "win32" ? ".exe" : ""}`
    : "java";
  // Keep optional portable launcher caches in output/. Without that launcher,
  // use installed sbt, including Windows shell resolution of its command file.
  const options = portable
    ? [
        "-Dsbt.supershell=false",
        "-Dsbt.server.autostart=false",
        `-Dsbt.boot.directory=${path("sbt-boot")}`,
        `-Dsbt.global.base=${path("sbt-global")}`,
        ...(existsSync(path("repositories"))
          ? [
              `-Dsbt.repository.config=${path("repositories")}`,
              "-Dsbt.override.build.repos=true",
            ]
          : []),
        "-jar",
        path("sbt-launch.jar"),
        ...args,
      ]
    : args;
  if (portable) env.COURSIER_CACHE ??= path("coursier");
  return spawn(portable ? java : "sbt", options, {
    cwd: new URL("../backend/", import.meta.url),
    env,
    stdio: "inherit",
    detached,
    shell: !portable && process.platform === "win32",
    windowsHide: true,
  });
}
