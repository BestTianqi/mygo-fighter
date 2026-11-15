import { execFileSync } from "node:child_process";
import {
  cp,
  chmod,
  mkdir,
  readFile,
  writeFile,
  access,
} from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const { values } = parseArgs({
  options: {
    "server-dir": { type: "string", default: "backend/target/universal/stage" },
    "runtime-dir": { type: "string" },
    arch: { type: "string", default: process.arch },
    commit: { type: "string" },
  },
});
if (process.platform !== "darwin")
  throw new Error("Package macOS ZIPs on macOS (ditto is required).");
if (!values["runtime-dir"] || !["arm64", "x64"].includes(values.arch))
  throw new Error(
    "Usage: npm run package:macos -- --runtime-dir /path/to/temurin-jre --arch arm64|x64 [--server-dir /path/to/distribution] [--commit SHA]",
  );
const version = JSON.parse(
  await readFile(path.join(root, "package.json"), "utf8"),
).version;
const commit = execFileSync(
  "git",
  ["rev-parse", "--verify", `${values.commit ?? "HEAD"}^{commit}`],
  { cwd: root, encoding: "utf8" },
).trim();
const server = path.resolve(root, values["server-dir"]);
const runtime = path.resolve(root, values["runtime-dir"]);
await access(path.join(server, "web/index.html"));
await access(path.join(server, "lib", `mygo.mygo-server-${version}.jar`));
await access(path.join(runtime, "Contents/Home/bin/java"));
const runtimeRelease = await readFile(
  path.join(runtime, "Contents/Home/release"),
  "utf8",
);
const expectedArch = values.arch === "arm64" ? "aarch64" : "x86_64";
if (
  !runtimeRelease.includes(`OS_ARCH="${expectedArch}"`) ||
  !runtimeRelease.includes('JAVA_VERSION="21.')
)
  throw new Error("Supply a macOS Java 21 runtime matching --arch.");
const name = `MyGO-Fighter-${version}-macos-${values.arch}-${commit.slice(0, 7)}`;
const destination = path.join(root, "output/releases", name);
// Never overwrite a previous package or verification run.
await mkdir(path.dirname(destination), { recursive: true });
await mkdir(destination);
for (const directory of ["lib", "web"])
  await cp(path.join(server, directory), path.join(destination, directory), {
    recursive: true,
  });
await cp(runtime, path.join(destination, "runtime"), {
  recursive: true,
  verbatimSymlinks: true,
});
for (const launcher of [
  "start-game.sh",
  "start-game.command",
  "start-lan.command",
]) {
  await cp(
    path.join(root, "scripts/portable", launcher),
    path.join(destination, launcher),
  );
  await chmod(path.join(destination, launcher), 0o755);
}
await writeFile(
  path.join(destination, "build-info.json"),
  JSON.stringify(
    {
      version,
      commit,
      platform: "macos",
      arch: values.arch,
      runtime: runtimeRelease,
    },
    null,
    2,
  ) + "\n",
);
await writeFile(
  path.join(destination, "README.txt"),
  `MyGO Fighter ${version} · macOS ${values.arch === "arm64" ? "Apple Silicon (M1 or newer)" : "Intel"} 免安装版
构建提交 ${commit}

完整解压 ZIP 后，双击 start-game.command，等待浏览器自动打开，即可本地游玩。
局域网房主双击 start-lan.command，点击「创建房间」和「复制邀请链接」。
朋友连接同一个 Wi-Fi 或热点后，打开邀请链接，点击「加入房间」。
双方各自选人并点击「准备开战」。朋友只需浏览器，无需下载此包。
游玩时保持房主的启动窗口开启。结束时在原窗口按 Ctrl+C。
游戏主菜单和联机大厅内均有「联机教程」。

无需安装 Node.js、Java 或 sbt，包内已包含 Java 21 与全部游戏文件。
Apple Silicon 与 Intel 请分别下载对应版本。默认网页端口 8080。
本包未做 Apple 开发者签名或公证。首次启动若被 macOS 拦截，请在
确认下载来自项目官方 Release 后，在「系统设置 → 隐私与安全性」允许打开，
然后重新启动；只对下载的游戏启动器操作。局域网模式如出现防火墙提示，请允许 Java 接入。
也可在终端进入解压文件夹后运行 /bin/bash ./start-game.sh（联机加 --lan）。
Java 和第三方运行时声明见 runtime/Contents/Home/legal，媒体与字体署名见 web/licenses。

Extract the entire ZIP. Double-click start-game.command for local play, or
start-lan.command to host a LAN room. Share the invitation with friends on the
same Wi-Fi/hotspot. Keep the launch window open; press Ctrl+C there to stop.
Java 21 is bundled; Node.js, Java installation and sbt are not required.
Choose arm64 for Apple Silicon or x64 for Intel. This package is not Apple
Developer ID signed or notarized. If macOS blocks the launcher, allow it in
System Settings > Privacy & Security after checking the official release source.
`,
);
const archive = `${destination}.zip`;
try {
  await access(archive);
  throw new Error(`Archive already exists: ${archive}`);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
execFileSync(
  "/usr/bin/ditto",
  ["-c", "-k", "--keepParent", "--norsrc", destination, archive],
  { stdio: "inherit" },
);
console.log(archive);
