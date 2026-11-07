**简体中文** | [English](DEPLOYMENT_ALICLOUD_2026-10-26.en.md) | [日本語](DEPLOYMENT_ALICLOUD_2026-10-26.ja.md)

# 阿里云部署 — 2026-10-26

历史部署记录。[当前部署与容量记录](DEPLOYMENT_CAPACITY_2026-10-27.md) 已替代下文的活动版本与回滚信息；更早的服务器版本均已删除。

这是历史协议 10 部署记录。后续协议 12 的发布与验证见[协议 12 部署与性能审计](DEPLOYMENT_PERFORMANCE_2026-10-26.md)。

最新应用后端与配套前端已在阿里云北京主机上线。游戏服务与 HTTPS 代理开机自启。负载检查在用户要求下于约九分钟后结束，部署保持运行。

## 发布与访问

| 项目           | 值                                                |
| -------------- | ------------------------------------------------- |
| 游戏地址       | <https://mygo-123-57-149-254.sslip.io/>           |
| 健康检查地址   | <https://mygo-123-57-149-254.sslip.io/api/health> |
| SSH 别名       | `alicloud`（`123.57.149.254`）                    |
| 主机           | Ubuntu 24.04，x86-64，约 1.6 GiB 内存             |
| 应用提交       | `6d3d1363e3602ce694928261426da1bc4aa573b0`        |
| 发布 ID        | `20261026-6d3d136-protocol10`                     |
| WebSocket 协议 | `10`                                              |
| 容量设置       | 两个房间 / 四名玩家                               |
| Java           | OpenJDK 21                                        |
| 服务           | `mygo-fighter.service`                            |
| HTTPS 代理     | `caddy.service`，使用公开的 Let's Encrypt 证书    |

上传的 `mygo-server-2.0.0.tgz` 在启用前已与本地 SHA-256 校验一致：

```text
d3c663e373a39f9be0c79a0cf884483d9f45f05c680e5f37a54b156f1431844e
```

## 部署配置

发布位于 `/srv/mygo-fighter/releases/20261026-6d3d136-protocol10`。`/srv/mygo-fighter/current` 链接指向活动发布。该发布中的 `deployment.json` 记录应用提交、归档校验和、协议与托管服务校验和。

运行时设置位于 `/etc/mygo-fighter.env`：

| 设置                | 值                              |
| ------------------- | ------------------------------- |
| `HOST`              | `127.0.0.1`                     |
| `PORT`              | `8080`                          |
| `WEB_ROOT`          | `/srv/mygo-fighter/current/web` |
| `MAX_ROOMS`         | `2`                             |
| `TRUST_LOCAL_PROXY` | `true`                          |

Caddy 提供公网 TCP 80/443 服务，将 HTTP 重定向到 HTTPS，并把 HTTP/WebSocket 转发到回环后端。阿里云实例防火墙已放行这些公网 Web 端口。JVM 使用 64 MiB 初始堆、256 MiB 最大堆与 512 MiB 服务内存上限。

首次使用验证发现 GraalJS 在受限服务账号下无法创建 `/srv/mygo-fighter/.cache`。服务现使用 `CacheDirectory=mygo-fighter` 与 `XDG_CACHE_HOME=/var/cache/mygo-fighter`。原生资源缓存可写，而应用发布与服务主目录保持只读。应用该配置后，误导性的缺少 `truffleattach` 警告消失。

## 已完成的验证

- TypeScript、媒体、战斗内核与协议检查均通过 `npm run check`；普通构建与 Pages 构建均通过。Pages 构建在浏览器中以 `/mygo-fighter/` 路径加载。
- 此前已验证的 Scala/JVM 发行包在阿里云上成功启动。公网 HTTPS 健康检查标识为 `mygo-scala`，模拟 120 Hz、快照 60 Hz。
- 两个隔离浏览器创建/加入房间，加载对局、移动、造成伤害，页面刷新后重连并保留生命值继续。浏览器控制台无错误或警告。
- 全部 279 个运行时媒体路径经公网 HTTPS 与本地对应内容核对一致，素材清单也一致。
- 四个 WebSocket 客户端压测两个同时进行的房间：立希/乐奈 1v1 与独立的 3v3 接力。观察到房间隔离、仅房主可执行的操作、无效/满员房间、无效会话、旧协议拒绝、暂停/恢复、重连、伤害与候补推进。
- 来源拒绝、HTTP 请求体上限、房间/握手限流、转发地址处理以及限流窗口后的恢复均通过。

最终验证窗口为 **18:37:10–18:46:26（Asia/Shanghai）**（约 **9 分 16 秒**，含初始化与重连检查）。用户要求在此结束测试。

| 观察结果                     | 值                   |
| ---------------------------- | -------------------- |
| 每个客户端收到的快照         | 32,981–33,109        |
| 意外的客户端断开             | 0                    |
| 客户端协议/传输错误          | 0                    |
| 服务自动重启                 | 0                    |
| 最终健康检查时的服务峰值内存 | 约 321 MiB / 512 MiB |
| 客户端 RTT p95               | 51.4–54.1 ms         |
| 服务端更新耗时 p95           | 2.87–3.38 ms         |

这些时序数值描述的是本次从开发机发起的运行，而非容量保证。完整的 15 分钟目标与随后的两分钟废弃房间过期检查尚未完成。检查器记录了人为中断，并非应用故障。四个验证会话均显式离开房间，两个房间码均确认被移除。此后服务保持健康。

临时日志、报告与截图位于忽略目录 `output/alicloud/`。

## 运维与后续部署

```sh
ssh alicloud 'systemctl status mygo-fighter caddy --no-pager'
ssh alicloud 'sudo journalctl -u mygo-fighter -u caddy --no-pager -n 100'
curl --fail https://mygo-123-57-149-254.sslip.io/api/health
```

更新时，构建配套发行包，比对上传归档校验和，并用新的发布 ID 启用：

```sh
npm run check
npm run check:backend
npm run package:server
scp backend/target/universal/mygo-server-2.0.0.tgz alicloud:/tmp/mygo-server-2.0.0.tgz
ssh alicloud 'sha256sum /tmp/mygo-server-2.0.0.tgz'
ssh alicloud 'sudo bash /opt/mygo-fighter/activate.sh /tmp/mygo-server-2.0.0.tgz RELEASE_ID'
```

启用与回滚脚本持久安装在 `/opt/mygo-fighter/`。后续成功启用会保留前一版本，供 `sudo bash /opt/mygo-fighter/rollback.sh` 使用。这是该主机上的首次游戏安装，因此目前没有可回退的前一应用版本。切换或重启服务会结束临时对局。
