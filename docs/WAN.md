**简体中文** | [English](WAN.en.md) | [日本語](WAN.ja.md)

# 个人服务器公网部署教程

本教程把完整游戏部署到你自己的 Linux 服务器，适用于个人 VPS、云主机或具备公网接入条件的家用服务器。玩家只需打开同一个 HTTPS 地址，通过浏览器创建和加入房间；接力对战支持两名玩家，三人混战支持三名玩家。

部署使用仓库现有的 `deploy/` 脚本：Caddy 接收公网 HTTPS/WSS，edge 提供网页、API 与 WebSocket 入口，lobby 管理房间目录与容量，rooms 运行权威战斗内核。同一份发行包提供三个角色，前端与服务端内核一起更新。详细边界见[后端服务](SERVICES.md)。本教程中的地址和账号均为占位示例，不对应任何已部署主机。

## 1. 准备服务器、域名和构建机

- **服务器**：以下命令以 Ubuntu 24.04 LTS、systemd、可使用 `sudo` 的 SSH 账号为前提。安装器使用 `apt-get`；其他发行版需自行适配包管理与服务配置。可从 2 vCPU、2 GiB 内存的小规模配置开始评估；这是起步预算，房间容量必须在自己的机器上测量。
- **公网入口**：服务器需要可从玩家网络访问的地址。云主机在控制台配置安全组；家用服务器需要路由器把 TCP 80/443 转发到服务器，并固定内网地址。如果处于运营商 CGNAT 或校园网且无法做入站转发，这套直连步骤不能单独解决公网接入，需先取得可入站的地址或使用支持 WebSocket 的转发入口。
- **域名**：把你控制的 `game.example.com` 的 A 记录指向服务器公网 IPv4。只有 IPv6 确实能访问时才添加 AAAA；错误的 AAAA 会造成部分客户端或证书校验失败。先使用直接 DNS 解析完成验收，再考虑额外的 CDN。
- **构建机**：安装 Git、[Node.js](https://nodejs.org/en/download)（仓库要求至少 22.12，可使用 Node 24）、[JDK 21](https://adoptium.net/installation/) 和 [sbt](https://www.scala-sbt.org/1.x/docs/Installing-sbt-on-Linux.html)。服务端运行机器只需 Java 21，安装器会安装，无需 Node.js 或 sbt。

下面的本机命令使用 macOS/Linux 的 Bash；Windows 可使用 WSL，在同一环境中完成构建和上传。如果尚未取得源码，先执行：

```sh
git clone https://github.com/BestTianqi/mygo-fighter.git
cd mygo-fighter
```

已有仓库则直接使用原检出。给 `~/.ssh/config` 添加别名，替换示例 IP、登录用户及密钥路径；`203.0.113.10` 和 `game.example.com` 都必须换成你自己的值：

```sshconfig
Host game-server
    HostName 203.0.113.10
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519
```

在**构建机的仓库根目录**设置变量。后续标为本机的命令在同一个终端执行；新开终端后需要重新设置变量。

```sh
MYGO_SSH=game-server
MYGO_HOSTNAME=game.example.com
ssh "$MYGO_SSH" 'id; uname -m; free -h; df -h /srv'
```

用 `nslookup game.example.com` 检查解析，确认得到你服务器的地址。自定义 SSH 端口可在 SSH 配置中添加 `Port`。

## 2. 放行网络并检查端口

云平台安全组与服务器防火墙必须同时允许流量。SSH 端口按你的管理需求放行，可进一步限制为管理 IP；TCP 80/443 向玩家网络开放。默认布局的端口如下：

| 端口                     | 使用者                         | 访问范围                  |
| ------------------------ | ------------------------------ | ------------------------- |
| TCP 22 或自定义 SSH 端口 | SSH 管理                       | 管理访问（可限制来源 IP） |
| TCP 80/443               | Caddy 的 HTTP 跳转、HTTPS、WSS | 公网                      |
| TCP 8080                 | edge                           | `127.0.0.1`，不开放公网   |
| TCP 8079                 | lobby                          | `127.0.0.1`，不开放公网   |
| TCP 8091                 | rooms 实例 a                   | `127.0.0.1`，不开放公网   |

在**服务器 SSH 会话**中执行以下示例。启用 UFW 前先放行实际 SSH 端口，保留当前会话，并确认其他正在使用的服务已有对应规则；若不是 22，请先修改示例中的 22。已有防火墙时只补充规则，不要重置现有配置。[Ubuntu 防火墙说明](https://ubuntu.com/server/docs/how-to/security/firewalls/)介绍了 UFW 的配置。

```sh
sudo apt-get update
sudo apt-get install -y ca-certificates curl openssl tar util-linux ufw
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
sudo ss -ltnp
```

如果 Nginx、Apache 或其他程序已占用 TCP 80/443，应先确定由谁负责 HTTPS，不能让两个代理争抢同一端口。默认 Caddy 配置只启用 HTTP/1.1 与 HTTP/2，游戏不要求开放 UDP 443。

## 3. 在本机构建完整发行包

在干净的检出上先同步并审阅远端更新，再构建。已有修改时保留它们，先处理合并，不要覆盖工作区。以下命令在仓库根目录执行；`MYGO_HOSTNAME` 只填域名，不含协议、路径或端口。

```sh
node --version
java -version
sbt --version
npm ci
npm run check
npm run check:backend
VITE_PUBLIC_GAME_URL="https://$MYGO_HOSTNAME" npm run package:server

MYGO_VERSION=$(node -p "require('./package.json').version")
MYGO_COMMIT=$(git rev-parse HEAD)
MYGO_RELEASE="$(date -u +%Y%m%dT%H%M%SZ)-$(git rev-parse --short HEAD)"
MYGO_ARCHIVE="backend/target/universal/mygo-server-$MYGO_VERSION.tgz"
test -f "$MYGO_ARCHIVE"
mkdir -p output/wan
tar -czf output/wan/hosting.tar.gz deploy
shasum -a 256 "$MYGO_ARCHIVE"
```

当前版本为 2.0.1，对应 `backend/target/universal/mygo-server-2.0.1.tgz`；命令从 `package.json` 取版本，因此升级时不用照抄旧文件名。Linux 缺少 `shasum` 时可用 `sha256sum` 替代。

`package:server` 包含常规生产前端、运行时媒体、JVM 依赖、启动脚本，以及生成后的共享战斗内核。应上传这个 `.tgz`，不要用桌面免安装 ZIP 或单独的 `build:pages` 替代。无需上传 `assets/` 源素材或 `node_modules/`。生成的文件和验证记录放在忽略的 `output/` 下。

## 4. 首次安装系统服务

在**构建机**上传部署文件并运行安装器：

```sh
scp output/wan/hosting.tar.gz "$MYGO_SSH:/tmp/mygo-hosting.tar.gz"
ssh "$MYGO_SSH" 'mkdir -p /tmp/mygo-hosting && tar -xzf /tmp/mygo-hosting.tar.gz -C /tmp/mygo-hosting'
ssh -t "$MYGO_SSH" "sudo bash /tmp/mygo-hosting/deploy/install.sh '$MYGO_HOSTNAME'"
```

这一步适用于全新的专用主机。安装器会安装 Java 21 和 Caddy，创建 `mygo` 系统账号、发布目录、环境文件与三个 systemd unit，并启用开机启动。`base.env` 中缺少 `INTERNAL_SECRET` 时会自动生成；重复安装会保留现有环境文件。Caddy 会启动，但应用在下一步激活前尚未运行，这时暂时出现 502 属于预期。

如果主机已安装且配置了其他用途的 Caddy，安装器会拒绝覆盖。不要为绕过检查而伪造备份标记。应先备份原配置，在维护窗口人工合并站点和全局选项，再按 `deploy/install.sh` 安装账号、环境文件及 unit，保留其他站点。如果已经有 Nginx 等代理，也应人工接入同一个 edge 地址；下面的自动安装流程以由 Caddy 独占 Web 端口的新主机为前提。

安装器把配置写到以下位置。在**服务器**上检查它们：

```sh
sudoedit /etc/mygo-fighter/base.env
sudoedit /etc/mygo-fighter/edge.env
sudoedit /etc/mygo-fighter/lobby.env
sudoedit /etc/mygo-fighter/rooms.env
```

| 文件        | 首次部署的重要值                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `base.env`  | 自动生成的 `INTERNAL_SECRET`；`ROOMS_INSTANCES="a"`                                                                                  |
| `edge.env`  | `HOST=127.0.0.1`、`PORT=8080`、`WEB_ROOT=/srv/mygo-fighter/current/web`、`LOBBY_URL=http://127.0.0.1:8079`、`TRUST_LOCAL_PROXY=true` |
| `lobby.env` | `LOBBY_HOST=127.0.0.1`、`LOBBY_PORT=8079`、`MAX_ROOMS=2`、`ROOMS_PER_INSTANCE=2`                                                     |
| `rooms.env` | `ROOMS_HOST=127.0.0.1`、`ROOMS_PORT=8091`、`MAX_ROOMS=2`、`LOBBY_URL=http://127.0.0.1:8079`                                          |

三个角色必须使用同一个内部密钥。不要把它提交到仓库、放进网页或分享给玩家；配置文件默认是 `root:mygo`、0640。默认环境不需要修改即可启动。只在可信的本机反向代理后启用 `TRUST_LOCAL_PROXY`。环境文件使用普通 `KEY=value`，不写 `export` 或命令替换。

systemd 默认分别限制 edge 256 MiB、lobby 192 MiB、每个 rooms 实例 512 MiB；这些是各进程的限制，不能把 512 MiB 当作整个部署的内存预算。还需为操作系统和 Caddy 留出内存。rooms 的 GraalJS 缓存由 unit 放在 `/var/cache/mygo-fighter/rooms-a`。

## 5. 上传、核对校验和并激活

回到**构建机的原终端**：

```sh
scp "$MYGO_ARCHIVE" "$MYGO_SSH:/tmp/mygo-server.tgz"
shasum -a 256 "$MYGO_ARCHIVE"
ssh "$MYGO_SSH" 'sha256sum /tmp/mygo-server.tgz'
```

先核对本地与远端输出的 64 位 SHA-256 完全一致，匹配后再执行激活：

```sh
ssh -t "$MYGO_SSH" "sudo bash /opt/mygo-fighter/activate.sh /tmp/mygo-server.tgz '$MYGO_RELEASE' '$MYGO_COMMIT'"
ssh "$MYGO_SSH" 'sudo cat /srv/mygo-fighter/current/deployment.json'
```

`MYGO_RELEASE` 是时间与提交组成的唯一发布 ID；手动命名时以字母或数字开头，至少两个字符，其余只用字母、数字、点、下划线或连字符，不得复用已有 ID。

激活器解压归档，检查启动脚本与网页，停止旧角色，切换 `/srv/mygo-fighter/current`，再按 rooms → lobby → edge 顺序启动并检查健康。成功后写入 `deployment.json`，记录提交、归档 SHA-256、角色端口与激活时间；被替换的发布保留为 `previous`。更新会结束当前临时房间，应提前通知玩家。新发布失败时会尝试恢复上一发布；首次安装没有上一发布时只能停止角色并排查，不能宣称已回滚。

## 6. 验证 HTTPS、WebSocket 和实际对战

在**服务器外的本机网络**执行：

```sh
curl -I "http://$MYGO_HOSTNAME/"
curl -fsS "https://$MYGO_HOSTNAME/api/health"
```

HTTP 应返回 HTTPS 跳转；HTTPS 健康检查应包含 `"app":"mygo-scala"`、`"ok":true`，并且三个角色健康。不要用 `curl -k` 掩盖证书问题。Caddy 自动获取和续期证书需要域名解析正确、TCP 80/443 可达、端口可绑定、证书存储可写且持久；见 [Caddy 自动 HTTPS 文档](https://caddyserver.com/docs/automatic-https)。

在**服务器**确认开机启动、日志与监听地址：

```sh
sudo systemctl status mygo-edge mygo-lobby mygo-rooms@a caddy --no-pager
sudo systemctl is-enabled mygo-edge mygo-lobby mygo-rooms@a caddy
sudo journalctl -u mygo-edge -u mygo-lobby -u mygo-rooms@a -u caddy -n 100 --no-pager
sudo ss -ltnp
curl -fsS http://127.0.0.1:8080/api/health
```

8080、8079 和 8091 应只监听回环地址；公网 Web 端口由 Caddy 持有。内部健康接口需要共享密钥。以下命令只在服务器内使用密钥，不将它打印到终端；示例对应安装器生成的单行十六进制格式：

```sh
sudo bash <<'HEALTH'
set -eu
secret=$(sed -n 's/^INTERNAL_SECRET=//p' /etc/mygo-fighter/base.env | tail -n 1)
for port in 8079 8091; do
  curl -fsS -H "X-Mygo-Internal: $secret" "http://127.0.0.1:$port/internal/health"
  printf '\n'
done
HEALTH
```

最后做浏览器验收，健康接口成功不能代替真实联机：

1. 用电脑打开 `https://game.example.com/`，确认主菜单、角色、关卡、音频和视频加载正常。
2. 点击「联机对战」→「创建房间」→「复制邀请链接」。另一台设备通过手机流量或其他外网打开链接并加入同一房间。
3. 双方选人并准备，确认加载完成后进入战斗，移动、攻击和大招能同步，生命与回合结果一致。需要混战时，用三台设备验证三人加载与开局。
4. 在浏览器开发者工具的 Network → WS 中确认连接是 `wss://game.example.com/ws?room=...`，并有持续帧流。没有房间和认证的裸 `/ws` 请求被拒绝，不等于代理故障。
5. 检查断线暂停、同标签页刷新重连，以及满房时的提示。更新或重启会丢弃内存房间，这不属于会话持久化功能。

随附的 [Caddy 反向代理](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy) 会转发 WebSocket 升级，不需要另开游戏公网端口。默认站点位于域名根路径；不要直接把 `/game/` 等子路径套用到这套配置。

## 7. 更新与回滚

更新时重复本机同步、检查、`package:server`、生成新的 `MYGO_COMMIT`/`MYGO_RELEASE`、上传与校验，再调用 `activate.sh`。每次都部署整包，使网页与共享内核保持一致。单纯发布新代码通常不用重跑 `install.sh`；修改了 unit 或安装脚本时才重新审阅并安装部署文件，注意安装器会重写它负责的 Caddy 配置。

回滚在**构建机**执行：

```sh
ssh "$MYGO_SSH" 'sudo readlink /srv/mygo-fighter/current; sudo readlink /srv/mygo-fighter/previous'
ssh -t "$MYGO_SSH" 'sudo bash /opt/mygo-fighter/rollback.sh'
curl -fsS "https://$MYGO_HOSTNAME/api/health"
```

首次发布没有 `previous`；保留正在使用和上一发布的目录。回滚只切换应用，不恢复 `/etc/mygo-fighter/*.env`、systemd 覆盖配置或 Caddy 配置，因此调整配置前需单独备份，回滚时检查与旧包是否兼容。回滚成功后，再次执行会切回刚刚被替换的版本。

日常可在**服务器**查看资源与重启次数：

```sh
sudo systemctl show mygo-edge mygo-lobby mygo-rooms@a -p MemoryCurrent -p MemoryPeak -p NRestarts
sudo journalctl -u mygo-rooms@a -n 100 --no-pager
```

环境值改变后，在维护窗口重启对应角色；更改内部密钥时必须协调重启全部角色。unit 文件改变后先执行 `sudo systemctl daemon-reload` 再重启。重启 rooms 会结束该实例中的对局。

## 8. 容量与增加 rooms 实例

默认只有实例 a、两个房间的全局上限。`lobby.env` 的 `MAX_ROOMS` 控制全局，`ROOMS_PER_INSTANCE` 控制放置预算，`rooms.env` 的 `MAX_ROOMS` 控制单实例。只改其中一处不会自动扩大整套容量。先在自己的机器上测试 CPU、内存、快照间隔与玩家 RTT；大队伍、三人混战和自定义规则可能改变负载，旧机器的测量值不能当作你的保证。

如果确实需要实例 b，在**服务器**先确认 8092 空闲，然后准备覆盖文件：

```sh
sudo install -o root -g mygo -m 0640 /dev/null /etc/mygo-fighter/rooms-b.env
printf 'ROOMS_PORT=8092\n' | sudo tee /etc/mygo-fighter/rooms-b.env >/dev/null
sudoedit /etc/mygo-fighter/base.env
sudoedit /etc/mygo-fighter/lobby.env
```

把 `base.env` 改为 `ROOMS_INSTANCES="a b"`。若仍是每实例两个房间，在 `lobby.env` 设置 `MAX_ROOMS=4`、`ROOMS_PER_INSTANCE=2`，而 `rooms.env` 保持 `MAX_ROOMS=2`。从保留的部署文件重新运行 `install.sh` 以启用新 unit，再用一个新的发布 ID 激活完整归档；激活器会读取实例列表。每个实例都必须有独立端口，仍只监听回环；核对 `mygo-rooms@b` 的状态、内部 8092 健康与资源占用。新增实例会增加 JVM 内存预算，不保证在同机线性扩容。更多配置见 [SERVICES.md](SERVICES.md)。

## 9. 可选：让自己的 GitHub Pages 链接到此服务器

直接打开个人服务器地址即可联机。若你使用自己的仓库副本发布静态 Pages，可在 GitHub 仓库 Settings → Secrets and variables → Actions → Variables 添加 `PUBLIC_GAME_URL=https://game.example.com`，再重新运行 Pages 工作流。它会在构建时传给 `VITE_PUBLIC_GAME_URL`。本机构建示例：

```sh
VITE_PUBLIC_GAME_URL="https://$MYGO_HOSTNAME" npm run build:pages
```

静态页面只负责打开你指定的 HTTPS 游戏地址；API、WebSocket 与房间仍由个人服务器提供，不是跨域把 Pages 当作游戏服务端。变量在构建时读取，修改后需要重新构建发布，并检查 `/mygo-fighter/` 项目子路径。未设置变量时会使用代码中的默认公共服务器，不会自动发现你的机器。

## 10. 常见问题

| 现象                              | 优先检查                                                                                                                |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| SSH 连不上                        | SSH 地址、用户、密钥、实际端口，以及安全组和 UFW 是否允许管理来源                                                       |
| HTTPS 超时或证书申请失败          | A/AAAA 解析、TCP 80/443 的安全组/防火墙/NAT、端口占用和 `journalctl -u caddy`                                           |
| HTTPS 正常但 502                  | edge 是否监听 8080，`current` 是否存在，`WEB_ROOT` 和发布权限是否正确                                                   |
| 健康检查中 lobby/rooms 异常       | 三角色 unit、回环端口、`LOBBY_URL`、共享密钥与 rooms 心跳注册                                                           |
| 能开网页但无法加入或持续重连      | WSS 升级是否通过代理，玩家是否在同一域名/同一服务器，是否满房或使用旧页面                                               |
| 更新后提示客户端不兼容            | 刷新两个客户端，确认代理没有缓存旧 HTML，确保前端和内核来自同一个完整包                                                 |
| `truffleattach` 或缓存权限错误    | Java 版本/架构、rooms unit 的 `XDG_CACHE_HOME` 与 `/var/cache/mygo-fighter/rooms-<id>` 权限；不要把发布目录整体改成可写 |
| 服务反复重启或延迟升高            | `NRestarts`、内存上限、CPU 饱和、当前房间数与规则；降低容量并测量后再调整                                               |
| `Release already exists`          | 使用新的发布 ID，不覆盖正在运行或用于回滚的目录                                                                         |
| `No previous release is retained` | 首次发布或没有保留回滚目标；修复配置后部署一个新的完整包                                                                |

部署前后的临时日志、截图和测量放在 `output/wan/`，不要提交账号密钥或生成产物。
