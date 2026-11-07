**简体中文** | [English](WAN.en.md) | [日本語](WAN.ja.md)

# 公网在线部署

完整的游戏可以运行在一台 Linux 服务器上。Scala 后端以独立的 `edge`、`lobby` 与 `rooms` 角色运行：rooms 用与本地对战相同的 TypeScript 战斗内核执行权威的两人与三人对局，lobby 负责跟踪实例与房间容量，edge 接收公网流量。Caddy 提供 HTTPS，并把 HTTP 与 WebSocket 转发到 `127.0.0.1:8080` 上的 edge。玩家打开同一个共享游戏 URL；任何玩家都不需要开放公网端口或安装后端。

**阿里云北京**部署运行在 `alicloud` SSH 主机上（`123.57.149.254`，Ubuntu 24.04，x86-64，两个 vCPU，约 1.6 GiB 内存）。游玩地址为 [mygo-123-57-149-254.sslip.io](https://mygo-123-57-149-254.sslip.io/)。配套的前端、Scala 后端与共享战斗内核对应应用提交 `2ed585d`、协议 **25**、发布版本 `20261030-2ed585d-protocol25`。页面较旧的客户端必须刷新。GitHub Pages 不链接到该服务器。

公网主机运行各自独立的 edge、lobby 与 rooms JVM，并只有一个 rooms 实例。生产环境在大厅与 rooms 配置中都使用**两房间上限**。在本次玩法审计中，四个房间会把该主机压满；两个房间通过了最初的受控测试。实测负载及其限制见[2026-10-30 部署与玩法审计](DEPLOYMENT_2026-10-30.md)。该设置并不代表能容纳所有可能的自定义规则组合。`deployment.json` 记录应用提交、归档校验和与验证信息。仍在使用 OpenJDK 21。

协议 22 的发布版本作为 `previous` 保留，连同其已禁用的旧版 unit 与环境文件，用于回滚。恢复路径已在公网主机上双向演练。更早的发布版本则保持删除状态。**Azure 游戏试用已退役**；下面的 Azure 部署细节均为历史记录。

[运行时评估](RUNTIME_OPTIMIZATION_2026-10-27.md)、[协议 12 审计](DEPLOYMENT_PERFORMANCE_2026-10-26.md)与[最初的阿里云部署](DEPLOYMENT_ALICLOUD_2026-10-26.md)仍是历史记录，包含其测量值与限制。它们对应的发布目录已不存在。

## 构建与安装

先运行常规检查，然后在开发机上执行 `npm run package:server`。生成的 `backend/target/universal/mygo-server-2.0.0.tgz` 包含 JVM 依赖 jar、启动脚本、前端与原始运行时媒体，以及配套的内嵌战斗内核与地形清单。源美术资源保留在 Git 中，无需上传。目标主机只需要 Java 21，不需要 Node 或 sbt。

根目录的 `deploy/` 文件夹存放操作系统安装与服务文件。它们属于部署基础设施而非后端业务代码，因此放在 Scala 的 `services/` 树之外。[后端服务](SERVICES.md)记录了运行时拓扑、内部端点与完整配置矩阵。

## 三服务布局

同一份发布产物服务全部三个角色；每个 systemd unit 设置 `SERVICE_ROLE`，并读取共享环境文件与角色专属环境文件。Caddy 保持不变：它仍把 `PUBLIC_HOSTNAME` 代理到 `127.0.0.1:8080`，只有 edge 在那里监听。

| Unit                      | 角色    | 监听地址                                         | 环境文件                                                           |
| ------------------------- | ------- | ------------------------------------------------ | ------------------------------------------------------------------ |
| `mygo-edge.service`       | `edge`  | 公网 `127.0.0.1:8080`                            | `/etc/mygo-fighter/base.env`、`/etc/mygo-fighter/edge.env`         |
| `mygo-lobby.service`      | `lobby` | 内部 `127.0.0.1:8079`                            | `/etc/mygo-fighter/base.env`、`/etc/mygo-fighter/lobby.env`        |
| `mygo-rooms@<id>.service` | `rooms` | 内部 `127.0.0.1:8091`（实例 `a`；`b` 为 `8092`） | `/etc/mygo-fighter/base.env`、`rooms.env`、可选的 `rooms-<id>.env` |

`base.env` 保存安装器生成的 `INTERNAL_SECRET` 以及激活过程使用的 `ROOMS_INSTANCES` 列表。初始部署预算为一个 rooms 实例，全局与逐实例的 `MAX_ROOMS=2`，`edge` 上限 256 MiB，`lobby` 192 MiB，`rooms` 512 MiB，由原先单一 512 MiB 的服务上限拆分而来。提高房间数之前，请先确认实测内存；这些限制只是配置，不是容量承诺。

在全新的专用主机上首次安装：

```sh
tar -czf output/wan/hosting.tar.gz deploy
scp output/wan/hosting.tar.gz alicloud:/tmp/mygo-hosting.tar.gz
ssh alicloud 'mkdir -p /tmp/mygo-hosting && tar -xzf /tmp/mygo-hosting.tar.gz -C /tmp/mygo-hosting'
ssh alicloud 'sudo bash /tmp/mygo-hosting/deploy/install.sh PUBLIC_HOSTNAME'
```

`install.sh` 创建 `mygo` 账号与发布目录，把三个 unit 以及 `activate.sh`/`rollback.sh` 安装到 `/opt/mygo-fighter` 下，仅在缺失时创建 `/etc/mygo-fighter/{base,edge,lobby,rooms}.env`，在缺少时追加生成的 `INTERNAL_SECRET`，并启用 Caddy 与 `ROOMS_INSTANCES` 中的每个 unit（默认 `a`）。它保留 Caddy 安全检查，且是幂等的。在仍运行旧单一 unit 的主机上，使用 `--prepare-only` 可以在旧服务继续可用的同时安装新布局。激活过程会在切换发布版本前停止旧服务。不加该选项时，安装器会立即禁用并停止 `mygo-fighter`。它保留 `/etc/mygo-fighter.env` 以便对照，并打印迁移步骤。迁移值映射如下：`HOST`、`PORT`、`WEB_ROOT` 与 `TRUST_LOCAL_PROXY` 对应 `edge.env`；旧的 `MAX_ROOMS` 对应 `lobby.env`（全局）与 `rooms.env`（逐实例）。修改 `ROOMS_INSTANCES` 后重新运行 `install.sh` 会启用新增的实例 unit。

部署新的应用发布版本：

```sh
scp backend/target/universal/mygo-server-2.0.0.tgz alicloud:/tmp/mygo-server-2.0.0.tgz
ssh alicloud 'sha256sum /tmp/mygo-server-2.0.0.tgz'
ssh alicloud 'sudo bash /opt/mygo-fighter/activate.sh /tmp/mygo-server-2.0.0.tgz RELEASE_ID COMMIT'
```

激活前请把上传的校验和与本地归档对比。可选的第三个参数会把应用提交记录到 `deployment.json`。激活会先停止 edge，再停止 lobby，然后停止每个 rooms 实例；把 `/srv/mygo-fighter/current` 切换到解压出的发布版本；依次启动 rooms 实例、lobby、edge，并等待每个内部 `/internal/health` 与 edge 的 `/api/health` 报告 `"app":"mygo-scala"`。随后它写入 `deployment.json`，包含发布 ID、可选提交、归档 SHA-256、激活时间与角色/实例端口，并把被替换的发布版本保留为 `previous`。启动或健康检查失败会还原上一个发布版本并重启整套服务。首次迁移会保留协议 22 的目录。失败还原与回滚能识别它的单 unit 布局，会启动 `mygo-fighter`，而不是把旧产物当作三个角色运行。在保留该回滚目标期间，请保留旧版 unit 与环境文件。

请使用新的、有描述性的 `RELEASE_ID`，其中只能包含字母、数字、点、连字符与下划线。安装器使用 Ubuntu 的 Java 与 Caddy 软件包，并创建一个专用的 `mygo` 账号。它会拒绝替换与之无关的现有 Caddy 安装，备份初始 Caddy 配置，并保留任何现有的游戏环境文件。激活期间各角色会停止，因此切换发布版本会结束临时房间，客户端必须刷新；协议 25 的发布版本会拒绝协议 24 及更早的客户端。

```sh
ssh alicloud 'systemctl status mygo-edge mygo-lobby caddy --no-pager'
ssh alicloud 'systemctl list-units "mygo-rooms@*" --all --no-pager'
ssh alicloud 'sudo journalctl -u mygo-edge -u mygo-lobby -n 100 --no-pager'
ssh alicloud 'sudo systemctl show mygo-edge mygo-lobby "mygo-rooms@a" -p MemoryCurrent -p MemoryPeak -p NRestarts'
ssh alicloud 'sudo cat /srv/mygo-fighter/current/deployment.json'
ssh alicloud 'sudo bash /opt/mygo-fighter/rollback.sh'
```

每增加一个 rooms 实例，就为内存检查增加一条 `journalctl -u mygo-rooms@<id>` 与一个实例。`rollback.sh` 用相同的停止、启动与健康检查序列回退整套服务；如果回滚本身失败，它会重新启动当前活跃的发布版本，并保持链接不变。如需做内部健康检查，可以从 `base.env` 中读出生成的密钥：

```sh
ssh alicloud 'sudo bash -c ". /etc/mygo-fighter/base.env; curl -fsS -H \"X-Mygo-Internal: \$INTERNAL_SECRET\" http://127.0.0.1:8079/internal/health"'
```

Azure SSH 别名的历史开通步骤（游戏试用现已移除）：

```sh
tar -czf output/wan/hosting.tar.gz deploy
scp output/wan/hosting.tar.gz azure:/tmp/mygo-hosting.tar.gz
ssh azure 'mkdir -p /tmp/mygo-hosting && tar -xzf /tmp/mygo-hosting.tar.gz -C /tmp/mygo-hosting'
ssh azure 'sudo bash /tmp/mygo-hosting/deploy/install.sh mygo-20-78-1-182.sslip.io'
scp backend/target/universal/mygo-server-2.0.0.tgz azure:/tmp/mygo-server-2.0.0.tgz
ssh azure 'sudo bash /tmp/mygo-hosting/deploy/activate.sh /tmp/mygo-server-2.0.0.tgz RELEASE_ID'
```

上面的 Azure 命令描述的是使用单一 unit 的已退役试用；当前的 `install.sh` 改为安装三服务布局。请在虚拟机的 Azure 网络安全组中放行入站 **TCP 80 与 443**。不要开放 8080，也不要修改现有的 UDP 443 VPN 规则。随附的 Caddy 配置已禁用 HTTP/3，因此不会占用 VPN 的 UDP 端口。代理会保留 Host 并处理 WebSocket 升级。其 ACME 证书数据仍保存在 Caddy 的持久服务存储中。

该试用在 `azure-vm-nsg` 中使用优先级 330 的 `MyGO-Web-TCP-80-443`，仅挂接到这台虚拟机的网络接口。优先级 320 的现有 `Hysteria2-UDP-443` 规则保持不变。Caddy 占用 TCP 80/443；JVM 仍绑定回环端口 8080，Hysteria 保留 UDP 443。

## 历史单 unit 配置与共享行为

`/etc/mygo-fighter.env` 曾保存已退役单 unit 布局的运行时设置。它在迁移过的主机上仍然保留，但 edge/lobby/rooms 的 unit **不再读取**它；三服务对应的配置位于 `/etc/mygo-fighter/{base,edge,lobby,rooms}.env`，如上所述。

| 设置                | 试用值                          | 含义                                       |
| ------------------- | ------------------------------- | ------------------------------------------ |
| `HOST`              | `127.0.0.1`                     | 后端只能通过本地代理/SSH 访问              |
| `PORT`              | `8080`                          | 私有后端端口                               |
| `WEB_ROOT`          | `/srv/mygo-fighter/current/web` | 属于当前活跃发布版本的前端                 |
| `MAX_ROOMS`         | `2`                             | 正数的房间上限；普通局域网默认仍为 20      |
| `TRUST_LOCAL_PROXY` | `true`                          | 只接受来自回环对端的最后一个转发客户端地址 |

单一 unit 启动时使用 64 MB 最小 / 256 MB 最大 Java 堆、64 MB 预留代码缓存与 512 MB 服务内存上限，且不分配服务交换空间。三服务布局改为把 edge 限制在 256 MB、lobby 192 MB、每个 rooms 实例 512 MB；这样为 Ubuntu、Caddy 与现有 VPN 留出空间。这些设置是试用预算，不是容量保证。虚拟机不会自动扩容。

每个 rooms unit 通过 `CacheDirectory` 与 `XDG_CACHE_HOME` 为内嵌的 GraalJS 运行时提供专用的逐实例缓存 `/var/cache/mygo-fighter/rooms-<id>`。这样在应用发布版本与服务主目录保持只读的同时，原生运行时资源仍可解压。没有该缓存时，GraalJS 会因 `/srv/mygo-fighter/.cache` 下的访问拒绝错误而报出误导性的缺少 `truffleattach` 警告。现有安装需要换上更新后的 unit，然后执行 `systemctl daemon-reload` 并重启服务。参见 [GraalVM 的内部资源文档](https://www.graalvm.org/latest/reference-manual/embed-languages/#managing-internal-resources)。

edge 保持相同的准入行为：创建房间与加入房间合计限制为每个客户端地址每分钟 20 次尝试，套接字握手另有每分钟 60 次的限制，计数器会过期，地址/类别映射上限为 4,096 项。拒绝时使用 HTTP 429、JSON 重试消息与 `Retry-After: 60`。已建立的套接字保留现有的每秒 300 条消息与 8 KiB 消息上限。edge 强制校验同源浏览器请求；rooms 进程在处理玩家命令前解析会话令牌。房间码出现在 WebSocket URL（`/ws?room=CODE`）中，令牌则从不出现在其中。Caddy 会忽略不可信的入站转发声明；只有位于可信回环代理之后才应启用 `TRUST_LOCAL_PROXY`。

服务器每个房间接受两名真人玩家，并保留房主专属的规则修改、1v1 与 3v3 队伍接力、权威战斗与重连加载屏障。断线会暂停对局。所有套接字消失两分钟后，房间清理会停止其时钟、关闭仿真、吊销其会话并释放容量。30 分钟不活跃过期与所有人显式离开后的立即清理仍然保留。服务器重启会丢弃临时房间。

## 历史 Azure 操作与通用回滚行为

下面的 Azure 命令是为已退役的单一 unit 试用保留的。对于当前的阿里云主机，请改用[三服务布局](#三服务布局)中的三服务命令。

```sh
ssh azure 'systemctl status mygo-fighter caddy hysteria-server --no-pager'
ssh azure 'sudo journalctl -u mygo-fighter -u caddy --no-pager -n 100'
ssh azure 'systemctl show mygo-fighter -p MemoryCurrent -p MemoryPeak -p CPUUsageNSec -p NRestarts'
ssh azure 'sudo systemctl restart mygo-fighter'
curl --fail https://mygo-20-78-1-182.sslip.io/api/health
```

发布安装器会解压到 `/srv/mygo-fighter/releases/RELEASE_ID`，停止各角色 unit，原子地切换 `current`，按依赖顺序启动它们，并检查内部与公网健康状态。先停止再切换可避免上一个 JVM 继续提供更新的前端。切换、启动或健康检查失败时，如果存在上一个发布版本就会还原它并重启整套服务。成功激活会把它记录为 `previous`；在主机上运行 `sudo bash /opt/mygo-fighter/rollback.sh` 即可还原。部署与回滚通过主机本地锁串行化。切换与重启都会结束当前的临时对局。裁剪发布版本时，通常应保留活跃与上一个目录。2026-10-28 明确提出的删除旧版本请求覆盖了该部署的默认做法；现在只保留活跃的阿里云目录。

要退役该试用，请停止并禁用各角色 unit（历史上的单一 unit 是 `mygo-fighter`；当前布局使用 `mygo-edge`、`mygo-lobby` 与 `mygo-rooms@<id>`），只移除该试用的 Azure TCP 80/443 入站规则，然后在 Caddy 仍只服务本游戏时停止它。如果要把 Caddy 留给其他用途，请还原 `/etc/caddy/Caddyfile.before-mygo`。之后可以在完成所需备份后移除游戏的发布目录、其服务 unit、`/etc/mygo-fighter*` 配置与专用的 `mygo` 账号。请保持 VPN 服务、其证书与 UDP 443 规则不变。

## 历史 Azure 试用验证

必需的验收包括：常规前端/媒体/构建与 Scala 检查；在 `/mygo-fighter/` 下的静态 Pages 检查且不含试用链接；不绕过证书的 HTTPS 与 WebSocket 访问；原始图片/音频/视频加载；两个同时进行的对局中四个相互隔离的客户端持续至少 15 分钟；伤害、大招、替补推进、暂停、重开与重连；满员/无效房间、无效会话、不兼容协议、来源与准入检查；以及废弃房间过期。记录内存、CPU、快照时序与 VPN 响应性。所有临时工具与测量都属于被 Git 忽略的 `output/wan/`；不恢复任何已删除的测试目录。

在退役之前，该应用以两房间上限安装在 Azure 上。合并立希与乐奈的更新（网络协议 7）后，前端/媒体检查、Scala 编译/格式化、常规构建、Pages 构建、打包启动与代理准入检查均已通过。已发布的 GitHub Pages 站点在 `/mygo-fighter/` 下检查过，没有试用服务器链接。可选的 HTTPS 链接用仅用于测试的构建单独验证过；Pages 的 `PUBLIC_GAME_URL` 仍未设置。

**2026-10-26 的公网验收运行通过**：**四个相互隔离的 WebSocket 客户端同时进入两个房间，持续 900 秒**，包含更新后的立希/乐奈 1v1 对局与 3v3 替补推进。客户端通过公网 HTTPS/WSS 直接连接，无需 SSH 转发或绕过证书。每个客户端收到约 54,000 个快照，没有意外断线、协议错误或服务器重启。房间隔离、移动、伤害、暂停、重开与重连均通过。第三个房间被明确拒绝，两分钟废弃会话吊销与房间容量回收检查也通过。

全部 **279 个原始运行时媒体文件（93,738,918 字节）**也通过可信的公网 HTTPS 与本地原始文件逐字节一致，覆盖图片、音频与视频资源。

进一步的公网检查也已通过：权威的祥子与薇欧拉大招、刷新恢复、无效房间码、过期会话、不兼容客户端、同源强制与带重试消息的准入限制。故意让发布启动失败后的自动还原，以及手动回滚到上一发布版本再回滚回来，也都通过。最终的 Azure 试用应用是协议 7，位于 `/srv/mygo-fighter/releases/20261026-wan-protocol7`，由提交 `09c9a2a` 构建。

| 测量项             | 观察到的公网试用结果                                               |
| ------------------ | ------------------------------------------------------------------ |
| 游戏服务内存峰值   | 在 512 MiB 上限内为 313.2 MiB                                      |
| Caddy 内存峰值     | 45.6 MiB                                                           |
| 游戏平均 CPU       | 在对局运行 870 秒的 29 次采样中为 0.416 个 CPU 核                  |
| Caddy 平均 CPU     | 同一区间为 0.021 个 CPU 核                                         |
| p95 服务器更新工作 | 四个客户端下为 1.18–1.21 ms                                        |
| p95 公网往返时间   | 四个客户端下为 123.8–124.8 ms                                      |
| p95 快照投递间隔   | 四个客户端下为 59.1–59.3 ms                                        |
| 公网连接建立       | 五次连接尝试中，打开 WSS 用 85–255 ms；收到已认证房间用 167–343 ms |
| VPN 可用性         | 18 分钟内全部 36 次检查均为活跃；每次 SSH 探测都完成               |
| VPN 命令探测时间   | p95 1.25 秒，最大 1.31 秒，包含 SSH 握手与命令执行                 |

这些测量支持**这台虚拟机上两房间 / 四玩家的测试目标**。它们描述的是一个客户端网络与一次短时试用，而不是持续的生产容量或各个地区的延迟。VPN 可用性与命令响应性是抽样得到的；VPN 吞吐量没有做基准测试。没有做虚拟机扩容或有偿资源升级。验收结果已在上文概述；临时工具与原始测量不属于仓库内容。

**退役前的历史结果：公网 HTTPS 与 WSS 已上线。** Caddy 为该主机名获取了公开受信的 Let's Encrypt 证书。HTTP 会重定向到 HTTPS，常规的证书/主机名校验与公网 `/api/health` 检查均已通过。两个相互隔离的浏览器通过 `wss://mygo-20-78-1-182.sslip.io/ws` 对战；键盘攻击把防守方血量降到 179，刷新/重连在恢复前保持了该血量。临时的仅回环验证代理已移除；公网 Caddy 服务随主机自动启动。
