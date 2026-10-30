import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
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
  // Packaging (makePom) still uses Ivy even when dependency downloads use
  // Coursier. Windows profiles may deny Ivy's default ~/.ivy2 lock file.
  const ivyHome = path("ivy");
  mkdirSync(ivyHome, { recursive: true });
  const ivyOption = `-Dsbt.ivy.home=${ivyHome}`;
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
        ivyOption,
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
  else
    // Installed sbt launchers also inherit JVM options, including paths with
    // spaces. Keep this setting local to the child process, not the user profile.
    env.JAVA_TOOL_OPTIONS = [env.JAVA_TOOL_OPTIONS, `"${ivyOption}"`]
      .filter(Boolean)
      .join(" ");
  return spawn(portable ? java : "sbt", options, {
    cwd: new URL("../backend/", import.meta.url),
    env,
    stdio: "inherit",
    detached,
    shell: !portable && process.platform === "win32",
    windowsHide: true,
  });
}
