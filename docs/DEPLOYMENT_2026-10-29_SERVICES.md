**简体中文** | [English](DEPLOYMENT_2026-10-29_SERVICES.en.md) | [日本語](DEPLOYMENT_2026-10-29_SERVICES.ja.md)

# 服务拆分部署 — 2026-10-29

历史准备记录。[2026-10-30 部署与玩法审计](DEPLOYMENT_2026-10-30.md) 记录了协议 25 的启用、修订后的资源预算、两房间上限以及已验证的遗留回滚。下面的待办步骤与初始预算描述的是更早的准备状态。

本次变更把 Scala 后端拆分为三个部署角色 `edge`、`lobby` 与 `rooms`，仍以同一个 `mygo-server-2.0.0.tgz` 产物发布，通过 `SERVICE_ROLE` 选择。同时把公开协议提升到 **25**，因为房间令牌现在携带房间码，客户端连接 `/ws?room=CODE`。`edge`、`lobby` 与 `rooms` 取代了单一 `mygo-fighter.service` 布局；Caddy 不变，仍把公开主机名反向代理到 `127.0.0.1:8080`。

| 项目           | 取值                                                                                   |
| -------------- | -------------------------------------------------------------------------------------- |
| 变更日期       | 2026-10-29                                                                             |
| 应用提交       | `ca01050`（协议 25 服务拆分）                                                          |
| 发布 ID        | `20261029-ca01050-protocol25`（公网主机尚未激活）                                      |
| 归档 SHA-256   | `0aff77bc74caa49bb88e1943d784452b0e9ce353bb92ce1774b61aaeaa61d87e`（本地构建，未上传） |
| WebSocket 协议 | `25`                                                                                   |
| 服务           | `edge` 公网 8080，`lobby` 内部 8079，`rooms` 内部 8091（实例 `b` 为 8092）             |
| 公网默认       | 一个 rooms 实例，全局与每实例 `MAX_ROOMS=4`                                            |
| 局域网默认     | 三个本地进程（`npm run lan`），`MAX_ROOMS=20`                                          |
| 服务内存上限   | edge 192 MiB，lobby 128 MiB，每个 rooms 实例 512 MiB                                   |
| 公网代理       | Caddy 不变；TLS/WSS 指向 `127.0.0.1:8080`                                              |

在下面的步骤执行之前，公网阿里云主机仍运行协议 22 的单体发布。GitHub Pages 不受影响。

## 变更内容

- `backend/src/main/scala/services/system/api/Main.scala` 根据 `SERVICE_ROLE=edge|lobby|rooms` 分发；`all` 仍是单 JVM 本地调试组合。
- 新增的 `services/edge/` 负责公开入住、静态文件、API 转发、有界房间所有者缓存与 WebSocket 代理。
- 新增的 `services/lobby/` 负责实例注册表、全局 `MAX_ROOMS`、放置与预留，以及根据心跳重建的房间码目录。
- `services/rooms/` 保留房间执行逻辑，并新增内部路由、`LobbyClient` 心跳/注册与按实例配置。
- 跨进程负载类型移至 `services/system/objects/internal/`；`InternalGuard` 强制环回地址与 `X-Mygo-Internal`。
- 协议 25：令牌为 `<六位大写十六进制房间码>.<48 位十六进制密钥>`，socket 为 `/ws?room=CODE`；协议 24 及更早的客户端会被拒绝。
- 部署文件：三个 systemd 单元、四个环境变量示例加上保留的遗留 `server.env.example`，以及重写的 `install.sh`、`activate.sh` 与 `rollback.sh`。
- 文档：新增 `docs/SERVICES.md`；更新了 `docs/ARCHITECTURE.md`、`docs/COURSE_GUIDANCE.md`、`docs/WAN.md`、`README.md` 以及 `AGENTS.md` 中的一条开发规则。

## 本地验证状态

本次变更已验证通过：

- `bash -n deploy/install.sh deploy/activate.sh deploy/rollback.sh` 通过。
- `install.sh`、`activate.sh` 与 `rollback.sh` 在本地测试脚手架中演练过，使用临时的 `/etc` 与 `/srv` 目录树，并以桩程序替换 `systemctl`、`apt-get`、`useradd`、`caddy`、`curl`、`flock` 与 `mv` 命令（该工作站没有 systemd、没有 root，也没有 `flock`/`mv -T`）。脚手架覆盖了：保留环境变量文件的幂等安装与单一生成的 `INTERNAL_SECRET`；修改 `ROOMS_INSTANCES` 后启用新的 rooms 实例；存在遗留单元时的迁移说明输出；激活的停止/启动顺序、符号链接切换、健康探测、`deployment.json` 解析与 `previous` 保留；端口 8091 与 8092 的多实例激活；健康检查失败后的自动恢复；回滚成功、失败恢复以及无 previous 的错误路径。
- 单元与示例中的环境变量名称、默认值与校验规则，已与 `EdgeConfig`、`LobbyConfig` 和 `RoomsConfig` 交叉核对。内部路径、状态码、负载类型与角色健康响应体，已在工作区中与 `LobbyInternalRoutes`、`RoomInternalRoutes`、`InternalGuard`、`services/system/objects/internal/` 中的类型、`LobbyClient`、`EdgeApiRoutes`、`EdgeHealthRoute`、`EdgeSocketRoutes` 以及 `SocketProxy` 交叉核对。
- 撰写时工作区中的静态服务检查通过：`node scripts/check-services.mjs`（服务目录、禁止的 import、进程内 rooms tick 路径、`SERVICE_ROLE` 分发与三个部署单元）、`node scripts/check-api.mjs`（已注册房间 API 名称与前端调用方对照）与 `node scripts/check-protocol.mjs`（协议 `25`）。

本次变更未运行（该任务只写文件）：完整的 `npm run check` 与类型检查套件、`sbt` 编译、打包、三进程局域网启动器、`npm run check:e2e`、真实 systemd 安装、全新主机初始化以及任何公网部署。这些属于下面的集成步骤。

此检出上的集成检查也已运行并通过：

- `npm run check`（类型检查，加上内核、规则、快照与素材套件、协议 `25`、10 个房间 API 名称以及服务边界检查）。
- `npm run check:backend`（`build-simulation.mjs`、`sbt compile`、`scalafmtCheckAll`）。
- `npm run build` 与 `npm run build:pages`。
- `npm run package:server`：产出 `backend/target/universal/mygo-server-2.0.0.tgz`（156 MB、51 个运行时 jar、`bin/mygo-server`、`web/index.html`）。解包后的 `bin/mygo-server` 启动了 `lobby` 角色，并以 `{"role":"lobby","ok":true,...}` 应答 `GET /internal/health`，说明角色选择器在打包后的启动器中同样可用，而不只是在 sbt 中。
- `npm run check:e2e`：三个真实 JVM 进程（`rooms` 18091、`lobby` 18079、`edge` 18080）通过两道健康门禁，并跑通完整的双房间流程 —— 经 edge/lobby 放置的 `createroom`、`joinroom`、在代理 socket 上完成协议 25 认证、`chooseroom`、`ready`、`prepare`、`loadedroom`、权威 `state` 帧、20 个输入帧、双方各自后续的 state 帧，且没有错误帧。两个并行房间保持隔离并产生不同的房间码。报告：`output/services-e2e/report.json`。
- `node scripts/start.mjs`（`npm start` 启动器，在隔离端口上运行）：从暂存产物启动 rooms、lobby 与 edge，写入 `output/run/services.json`，`/api/health` 报告 `{"app":"mygo-scala","ok":true,...,"services":{"edge":"ok","lobby":"ok","rooms":"ok"}}`。`SIGINT` 停止全部三个进程并删除 pid 文件。
- `SERVICE_ROLE=all`（单 JVM 调试组合）提供 `/api/health`，三个角色均健康，并能对一个即时的 `createroom` 返回协议 25 令牌（`<六位大写十六进制>.<48 位十六进制>`），说明环回拓扑与房间令牌格式在无需独立进程时也能工作。

仍未运行：目标主机上的真实 systemd 安装、公网阿里云激活、桌面/手机浏览器验收，以及拆分角色的容量测量。这些属于下面的公网主机步骤。

## 待办的公网主机步骤

1. 集成检查已在提交 `ca01050` 上完成（见本地验证状态）。上传前在发布提交上重跑 `npm run check`、`npm run check:backend`、`npm run build`、`npm run package:server` 与 `npm run check:e2e`，并确认打包产物内嵌协议 25 与匹配的前端。
2. 应用提交、发布 ID 与本地归档 SHA-256 已记录在上表中。用它核对上传归档的校验和，并把激活时间记录到部署记录中。
3. 上传软件包并在激活前校验其校验和：

   ```sh
   scp backend/target/universal/mygo-server-2.0.0.tgz alicloud:/tmp/mygo-server-2.0.0.tgz
   ssh alicloud 'sha256sum /tmp/mygo-server-2.0.0.tgz'
   ```

4. 安装新的主机布局。把 `deploy/` 复制到主机并运行 `sudo bash deploy/install.sh PUBLIC_HOSTNAME`。安装脚本启用 `mygo-rooms@a`、停用遗留的 `mygo-fighter.service`、在缺失时创建 `/etc/mygo-fighter/{base,edge,lobby,rooms}.env`，并追加一个生成的 `INTERNAL_SECRET`。激活前，把旧的 `/etc/mygo-fighter.env` 取值与新文件对比：`HOST`、`PORT`、`WEB_ROOT` 与 `TRUST_LOCAL_PROXY` 属于 `edge.env`；四房间上限同时属于 `lobby.env`（全局）与 `rooms.env`（每实例）。确认 Caddy 的现有配置与证书保持原位。
5. 原子激活：

   ```sh
   ssh alicloud 'sudo bash /opt/mygo-fighter/activate.sh /tmp/mygo-server-2.0.0.tgz RELEASE_ID COMMIT'
   ```

   预期输出 `Active release: RELEASE_ID`、各角色端口与实例列表。确认 `sudo cat /srv/mygo-fighter/current/deployment.json` 包含发布、提交、归档 SHA-256 与角色端口；rooms 与 lobby 的 `/internal/health` 均报告 `"ok":true`；公网 `/api/health` 报告 `"app":"mygo-scala"` 且 `services` 映射符合预期。被替换的协议 22 目录变为 `/srv/mygo-fighter/previous`。

6. 用刷新后的客户端做公网验收：HTTPS/WSS 访问且无需绕过证书、通过 edge 创建与加入房间、协议 25 拒绝过期客户端、浏览器网络面板中出现 `/ws?room=CODE`、两个同时存在的房间的 ready/loading/state 流量、刷新/重连、暂停/重启、房间已满处理、无效房间码、外部来源拒绝、带 `Retry-After: 60` 的入住限制，以及两个浏览器控制台均无报错。
7. 在验收期间与之后，用 `systemctl show mygo-edge mygo-lobby mygo-rooms@a -p MemoryCurrent -p MemoryPeak -p NRestarts` 观察拆分后的内存与 CPU。三个上限是初始预算；未经与 [2026-10-27 容量记录](DEPLOYMENT_CAPACITY_2026-10-27.md) 相当的容量测试，不要提高 `MAX_ROOMS`。
8. 新发布通过验收后测试回滚：`sudo bash /opt/mygo-fighter/rollback.sh` 会为服务与符号链接一并恢复协议 22 发布。两次变更都会终止临时房间，因此每次切换后客户端都必须刷新。之后重新激活新发布，并让已验收的发布保持活动。
9. 新布局稳定后，删除已停用的遗留单元与旧环境变量文件：`rm /etc/systemd/system/mygo-fighter.service /etc/mygo-fighter.env`，随后执行 `systemctl daemon-reload`。保留活动与前一发布的目录以便回滚。

## 注意事项与限制

- 协议 25 与更早的客户端和服务器不兼容。请同时部署 UI 与后端；任何已打开的页面都必须刷新后才能创建或加入房间。
- 发布切换会停止所有角色单元，因此临时房间与会话会被丢弃，与之前的单体激活相同。
- 该布局首次激活时会把当前的协议 22 发布保留为 `previous`；回滚同样会恢复协议 22，因此客户端必须再次刷新。
- 内存上限与单实例/四房间的公网预算属于计划配置，并非当前主机上实测的容量。拆分角色的容量结果尚未确立；`docs/BACKEND_SCALING_2026-10-27.md` 与 `docs/DEPLOYMENT_CAPACITY_2026-10-27.md` 中的历史测量描述的是更早的单进程布局。
- Caddy 无需改动。公开主机名仍解析到同一主机；只是其后的环回进程从一个单元变为三个。
- `docs/LAN.md` 仍是战斗节奏与 socket 时序的参考；`docs/SERVICES.md` 是服务拆分的参考。
