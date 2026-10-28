# Public online hosting

The complete game can run on one Linux server. A Scala JVM process owns independent two-player rooms and executes the same TypeScript battle kernel used by local play. Caddy serves HTTPS and forwards HTTP and WebSockets to that process. Players open one shared game URL; no player hosts a public port or installs a backend.

The **AliCloud Beijing** deployment runs on the `alicloud` SSH host (`123.57.149.254`, Ubuntu 24.04, x86-64, two vCPUs and approximately 1.6 GiB RAM). Play at [mygo-123-57-149-254.sslip.io](https://mygo-123-57-149-254.sslip.io/). The matching frontend, Scala backend and shared combat kernel are application commit `8051ba8`, protocol **22**, release `20261028-8051ba8-protocol22`. GitHub Pages does not link to the server.

Production allows **four rooms / eight players** (`MAX_ROOMS=4`). The [2026-10-28 deployment record](DEPLOYMENT_2026-10-28.md) records the current release and verification; the [2026-10-27 capacity record](DEPLOYMENT_CAPACITY_2026-10-27.md) explains the inherited room limit. Capacity has not been re-established for the newer custom rules or 8v8 teams. `deployment.json` in the active release records the application commit, archive checksum and runtime configuration. OpenJDK 21 and the existing 512 MiB service memory ceiling remain in use.

The preceding protocol-20 release, the `previous` link and the uploaded package were removed on 2026-10-28 at the user's request. Only the current protocol-22 release remains, with no old release available for rollback. Three earlier AliCloud releases and their uploaded packages had already been deleted on 2026-10-27. The **Azure game trial is retired**: its service, all three releases and uploaded packages were removed, and its game-specific Caddy configuration was replaced with the original configuration. The Azure VPN remains active. The Azure installation and acceptance details below are historical.

The [runtime evaluation](RUNTIME_OPTIMIZATION_2026-10-27.md), [protocol-12 audit](DEPLOYMENT_PERFORMANCE_2026-10-26.md) and [original AliCloud deployment](DEPLOYMENT_ALICLOUD_2026-10-26.md) remain historical records, including their measurements and limitations. Their release directories no longer exist.

## Build and install

Run the normal checks, then `npm run package:server` on the development machine. The resulting `backend/target/universal/mygo-server-2.0.0.tgz` contains the JVM dependency jars, startup scripts, frontend and original runtime media, plus the matching embedded combat kernel and terrain catalog. The source artwork is retained in Git and does not need to be uploaded. The target host needs Java 21, not Node or sbt.

The root-level `deploy/` folder contains operating-system installation and service files. These are deployment infrastructure rather than backend business code, so they are kept outside Scala's `services/` tree.

On the provisioned AliCloud host, activation and rollback scripts are installed persistently in `/opt/mygo-fighter/`. To deploy a new application release:

```sh
scp backend/target/universal/mygo-server-2.0.0.tgz alicloud:/tmp/mygo-server-2.0.0.tgz
ssh alicloud 'sha256sum /tmp/mygo-server-2.0.0.tgz'
ssh alicloud 'sudo bash /opt/mygo-fighter/activate.sh /tmp/mygo-server-2.0.0.tgz RELEASE_ID'
```

Compare the uploaded checksum with the local archive before activation. The same `install.sh` provisions a fresh dedicated AliCloud host using its public hostname. AliCloud's instance firewall already permits TCP 80/443; the application binds only to `127.0.0.1:8080`. Caddy manages the public certificate and WebSocket forwarding. Check services with `ssh alicloud 'systemctl status mygo-fighter caddy --no-pager'`; a future activation can retain its predecessor for rollback with `ssh alicloud 'sudo bash /opt/mygo-fighter/rollback.sh'`. No predecessor is retained after the explicit 2026-10-28 cleanup.

Historical provisioning procedure for the Azure SSH alias (the game trial is now removed):

```sh
tar -czf output/wan/hosting.tar.gz deploy
scp output/wan/hosting.tar.gz azure:/tmp/mygo-hosting.tar.gz
ssh azure 'mkdir -p /tmp/mygo-hosting && tar -xzf /tmp/mygo-hosting.tar.gz -C /tmp/mygo-hosting'
ssh azure 'sudo bash /tmp/mygo-hosting/deploy/install.sh mygo-20-78-1-182.sslip.io'
scp backend/target/universal/mygo-server-2.0.0.tgz azure:/tmp/mygo-server-2.0.0.tgz
ssh azure 'sudo bash /tmp/mygo-hosting/deploy/activate.sh /tmp/mygo-server-2.0.0.tgz RELEASE_ID'
```

Use a new, descriptive `RELEASE_ID` containing only letters, numbers, dots, hyphens and underscores. The installer uses Ubuntu's Java and Caddy packages, creates a dedicated `mygo` account and installs system services. It refuses to replace an unrelated existing Caddy installation. It backs up the initial Caddy configuration and preserves an existing game environment file.

Permit inbound **TCP 80 and 443** in the VM's Azure network security group. Do not open 8080 or change the existing UDP 443 VPN rule. HTTP/3 is disabled in the supplied Caddy configuration so it does not claim the VPN's UDP port. The proxy preserves Host and handles WebSocket upgrades. Its ACME certificate data remains under Caddy's persistent service storage.

The trial uses `MyGO-Web-TCP-80-443` at priority 330 in `azure-vm-nsg`, attached only to this VM's network interface. The existing `Hysteria2-UDP-443` rule at priority 320 is unchanged. Caddy owns TCP 80/443; the JVM remains bound to loopback port 8080 and Hysteria retains UDP 443.

## Historical trial configuration and shared behavior

`/etc/mygo-fighter.env` holds runtime settings:

| Setting             | Trial value                     | Meaning                                                            |
| ------------------- | ------------------------------- | ------------------------------------------------------------------ |
| `HOST`              | `127.0.0.1`                     | Backend is reachable only through the local proxy/SSH              |
| `PORT`              | `8080`                          | Private backend port                                               |
| `WEB_ROOT`          | `/srv/mygo-fighter/current/web` | Frontend belonging to the active release                           |
| `MAX_ROOMS`         | `2`                             | Positive room limit; ordinary LAN default remains 20               |
| `TRUST_LOCAL_PROXY` | `true`                          | Accept the last forwarded client address only from a loopback peer |

The service starts with a 64 MB minimum / 256 MB maximum Java heap, a 64 MB reserved code cache and a 512 MB service memory ceiling, with no service swap allowance. These settings reserve room for Ubuntu, Caddy and the existing VPN; they are a trial budget, not a capacity guarantee. There is no automatic VM resize.

The service unit gives the embedded GraalJS runtime a dedicated cache at `/var/cache/mygo-fighter` using `CacheDirectory` and `XDG_CACHE_HOME`. This allows native runtime resources to be unpacked while application releases and the service home remain read-only. Without this cache, GraalJS reports a misleading missing-`truffleattach` warning caused by an access-denied error under `/srv/mygo-fighter/.cache`. Existing installations need the updated service unit followed by `systemctl daemon-reload` and a game service restart. See [GraalVM's internal resource documentation](https://www.graalvm.org/latest/reference-manual/embed-languages/#managing-internal-resources).

Room creation and joining share a limit of 20 attempts per client address per minute. Socket handshakes have a separate limit of 60 per minute. Counters expire and the address/category map is capped at 4,096 entries. Rejection uses HTTP 429, a JSON retry message and `Retry-After: 60`. Established sockets retain their existing 300-message-per-second and 8 KiB message limits. Browser requests retain same-origin checks; sessions are resolved before player commands and never appear in socket URLs. Caddy ignores untrusted incoming forwarding claims; only enable `TRUST_LOCAL_PROXY` behind a trusted loopback proxy.

The server accepts two human players per room and preserves host-only rule changes, 1v1 and 3v3 team relay, authoritative combat and the reconnect loading barrier. A disconnect pauses the match. After all sockets have been absent for two minutes, room cleanup stops its clock, closes the simulation, revokes its sessions and frees its capacity. Thirty-minute inactivity expiry and immediate cleanup after everyone explicitly leaves remain in place. Server restarts discard temporary rooms.

## Historical Azure operations and general rollback behavior

```sh
ssh azure 'systemctl status mygo-fighter caddy hysteria-server --no-pager'
ssh azure 'sudo journalctl -u mygo-fighter -u caddy --no-pager -n 100'
ssh azure 'systemctl show mygo-fighter -p MemoryCurrent -p MemoryPeak -p CPUUsageNSec -p NRestarts'
ssh azure 'sudo systemctl restart mygo-fighter'
curl --fail https://mygo-20-78-1-182.sslip.io/api/health
```

The release installer extracts to `/srv/mygo-fighter/releases/RELEASE_ID`, stops the game, atomically switches `current`, starts the matching JVM and checks backend health. Stopping before switching prevents the previous JVM from serving a newer frontend. A failed switch, start or health check restores the preceding release when one exists. Successful activation records it as `previous`; run `sudo bash /tmp/mygo-hosting/deploy/rollback.sh` on the host to restore it. Deployment and rollback are serialized with a host-local lock. Both switching and restarting end current temporary matches. Normally retain the active and previous directories when pruning releases. The explicit 2026-10-28 request to delete the old version overrides that default for this deployment; only the active AliCloud directory remains.

To retire the trial, stop and disable `mygo-fighter`, remove only the trial's Azure TCP 80/443 inbound rule, then stop Caddy if it still serves only this game. Restore `/etc/caddy/Caddyfile.before-mygo` if retaining Caddy for other use. The game release directories, its service unit, `/etc/mygo-fighter.env` and dedicated `mygo` account can then be removed after any desired backups. Leave the VPN service, its certificates and UDP 443 rule intact.

## Historical Azure trial verification

Required acceptance includes normal frontend/media/build and Scala checks; a static Pages check under `/mygo-fighter/` with no trial link; HTTPS and WebSocket access without certificate bypass; original image/audio/video loading; four isolated clients in two simultaneous matches for at least 15 minutes; damage, supers, reserve progression, pause, restart and reconnect; full/invalid rooms, invalid sessions, incompatible protocol, origin and admission checks; and abandoned-room expiry. Record memory, CPU, snapshot timing and VPN responsiveness. All temporary harnesses and measurements belong under ignored `output/wan/`; no removed test directory is restored.

Before its retirement, the application was installed on Azure with a two-room limit. Frontend/media checks, Scala compilation/formatting, the normal build, Pages build, packaged startup and proxy admission checks passed after merging the Taki and Rana updates (network protocol 7). The published GitHub Pages site was checked under `/mygo-fighter/` and has no trial-server link. The optional HTTPS link was separately verified with a test-only build; `PUBLIC_GAME_URL` remains unset for Pages.

The **2026-10-26 public acceptance run passed** with **four isolated WebSocket clients in two simultaneous rooms for 900 seconds**, including the updated Taki/Rana 1v1 matchup and 3v3 reserve progression. Clients connected directly over public HTTPS/WSS without SSH forwarding or certificate bypass. Each received approximately 54,000 snapshots, with no unexpected disconnects, protocol errors or server restarts. Room isolation, movement, damage, pause, restart and reconnect passed. A third room was clearly rejected, and the two-minute abandoned-session revocation and room-capacity recovery checks passed.

All **279 original runtime media files (93,738,918 bytes)** also matched the local originals byte for byte over trusted public HTTPS, covering the image, audio and video assets.

Further public checks passed for authoritative Sakiko and Viola supers, refresh recovery, invalid room codes, expired sessions, incompatible clients, same-origin enforcement and admission limits with retry messages. Automatic restoration after an intentionally failed release startup and manual rollback to the previous release and back also passed. The final Azure trial application was protocol 7 in `/srv/mygo-fighter/releases/20261026-wan-protocol7`, built from commit `09c9a2a`.

| Measurement                | Observed public trial result                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| Peak game service memory   | 313.2 MiB within the 512 MiB ceiling                                                               |
| Peak Caddy memory          | 45.6 MiB                                                                                           |
| Average game CPU           | 0.416 CPU core during 29 samples spanning 870 seconds of the match run                             |
| Average Caddy CPU          | 0.021 CPU core over the same interval                                                              |
| p95 server update work     | 1.18–1.21 ms across four clients                                                                   |
| p95 public round-trip time | 123.8–124.8 ms across four clients                                                                 |
| p95 snapshot delivery gap  | 59.1–59.3 ms across four clients                                                                   |
| Public connection setup    | 85–255 ms to open WSS; 167–343 ms to receive the authenticated room, over five connection attempts |
| VPN availability           | Active in all 36 checks over 18 minutes; every SSH probe completed                                 |
| VPN command probe time     | p95 1.25 seconds, maximum 1.31 seconds, including SSH handshake and command work                   |

These measurements support the **two-room / four-player test target on this VM**. They describe one client network and a short trial, not sustained production capacity or latency from every region. VPN availability and command responsiveness were sampled; VPN throughput was not benchmarked. No VM resize or paid resource upgrade was made. Acceptance results are summarized above; temporary harnesses and raw measurements are not part of the repository.

**Historical result before retirement: public HTTPS and WSS were live.** Caddy obtained a publicly trusted Let's Encrypt certificate for the hostname. HTTP redirects to HTTPS, and normal certificate/hostname validation and public `/api/health` checks passed. Two isolated browsers played through `wss://mygo-20-78-1-182.sslip.io/ws`; keyboard attacks reduced the defender's health to 179, and refreshing/reconnecting preserved that health before resuming. The temporary loopback-only validation proxy has been removed; the public Caddy service starts automatically with the host.
