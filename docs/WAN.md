# Public online hosting

The complete game can run on one Linux server. The Scala backend runs as independent `edge`, `lobby` and `rooms` roles: rooms execute authoritative two- and three-player matches with the same TypeScript battle kernel used by local play, the lobby tracks instance and room capacity, and the edge accepts public traffic. Caddy serves HTTPS and forwards HTTP and WebSockets to the edge on `127.0.0.1:8080`. Players open one shared game URL; no player hosts a public port or installs a backend.

The **AliCloud Beijing** deployment runs on the `alicloud` SSH host (`123.57.149.254`, Ubuntu 24.04, x86-64, two vCPUs and approximately 1.6 GiB RAM). Play at [mygo-123-57-149-254.sslip.io](https://mygo-123-57-149-254.sslip.io/). The matching frontend, Scala backend and shared combat kernel are application commit `2ed585d`, protocol **25**, release `20261030-2ed585d-protocol25`. Clients with older pages must refresh. GitHub Pages does not link to the server.

The public host runs separate edge, lobby and rooms JVMs, with one rooms instance. Production uses a **two-room ceiling** in both the lobby and rooms configuration. Four rooms saturated this host during the current gameplay audit; two rooms passed the initial controlled test. See the [2026-10-30 deployment and gameplay audit](DEPLOYMENT_2026-10-30.md) for the measured workloads and their limits. This setting does not establish capacity for every possible custom-rule combination. `deployment.json` records the application commit, archive checksum and verification. OpenJDK 21 remains in use.

The protocol-22 release is retained as `previous`, together with its disabled legacy unit and environment file, for rollback. The recovery path was exercised on the public host in both directions. Older releases remain deleted. The **Azure game trial is retired**; the Azure deployment details below are historical.

The [runtime evaluation](RUNTIME_OPTIMIZATION_2026-10-27.md), [protocol-12 audit](DEPLOYMENT_PERFORMANCE_2026-10-26.md) and [original AliCloud deployment](DEPLOYMENT_ALICLOUD_2026-10-26.md) remain historical records, including their measurements and limitations. Their release directories no longer exist.

## Build and install

Run the normal checks, then `npm run package:server` on the development machine. The resulting `backend/target/universal/mygo-server-2.0.0.tgz` contains the JVM dependency jars, startup scripts, frontend and original runtime media, plus the matching embedded combat kernel and terrain catalog. The source artwork is retained in Git and does not need to be uploaded. The target host needs Java 21, not Node or sbt.

The root-level `deploy/` folder contains operating-system installation and service files. These are deployment infrastructure rather than backend business code, so they are kept outside Scala's `services/` tree. [Backend services](SERVICES.md) documents the runtime topology, internal endpoints and full configuration matrix.

## Three-service layout

One release artifact serves all three roles; each systemd unit sets `SERVICE_ROLE` and reads shared plus role-specific environment files. Caddy is unchanged: it still proxies `PUBLIC_HOSTNAME` to `127.0.0.1:8080`, where only the edge listens.

| Unit                      | Role    | Listener                                                 | Environment files                                                    |
| ------------------------- | ------- | -------------------------------------------------------- | -------------------------------------------------------------------- |
| `mygo-edge.service`       | `edge`  | public `127.0.0.1:8080`                                  | `/etc/mygo-fighter/base.env`, `/etc/mygo-fighter/edge.env`           |
| `mygo-lobby.service`      | `lobby` | internal `127.0.0.1:8079`                                | `/etc/mygo-fighter/base.env`, `/etc/mygo-fighter/lobby.env`          |
| `mygo-rooms@<id>.service` | `rooms` | internal `127.0.0.1:8091` (instance `a`; `8092` for `b`) | `/etc/mygo-fighter/base.env`, `rooms.env`, optional `rooms-<id>.env` |

`base.env` holds the installer-generated `INTERNAL_SECRET` and the
`ROOMS_INSTANCES` list that activation uses. The initial deployed budget is one
rooms instance with global and per-instance `MAX_ROOMS=2`, `edge` capped at
256 MiB, `lobby` at 192 MiB and `rooms` at 512 MiB, split from the previous
single 512 MiB service ceiling. Confirm the observed memory before raising room
counts; these limits are configuration, not a capacity claim.

First installation on a fresh dedicated host:

```sh
tar -czf output/wan/hosting.tar.gz deploy
scp output/wan/hosting.tar.gz alicloud:/tmp/mygo-hosting.tar.gz
ssh alicloud 'mkdir -p /tmp/mygo-hosting && tar -xzf /tmp/mygo-hosting.tar.gz -C /tmp/mygo-hosting'
ssh alicloud 'sudo bash /tmp/mygo-hosting/deploy/install.sh PUBLIC_HOSTNAME'
```

`install.sh` creates the `mygo` account and release directories, installs the
three units plus `activate.sh`/`rollback.sh` under `/opt/mygo-fighter`, creates
`/etc/mygo-fighter/{base,edge,lobby,rooms}.env` only when missing, appends a
generated `INTERNAL_SECRET` when absent, and enables Caddy plus every unit in
`ROOMS_INSTANCES` (default `a`). It preserves the Caddy safety check and is
idempotent. On a host that still runs the old single unit, use `--prepare-only` to install
the new layout while the old service stays available. Activation stops it before
switching the release. Without that option the installer disables and stops
`mygo-fighter` immediately. It keeps
`/etc/mygo-fighter.env` for comparison, and prints the migration steps.
Migration values map as follows: `HOST`, `PORT`, `WEB_ROOT` and
`TRUST_LOCAL_PROXY` to `edge.env`; the old `MAX_ROOMS` to `lobby.env` (global)
and `rooms.env` (per instance). Re-running `install.sh` after editing
`ROOMS_INSTANCES` enables the added instance units.

To deploy a new application release:

```sh
scp backend/target/universal/mygo-server-2.0.0.tgz alicloud:/tmp/mygo-server-2.0.0.tgz
ssh alicloud 'sha256sum /tmp/mygo-server-2.0.0.tgz'
ssh alicloud 'sudo bash /opt/mygo-fighter/activate.sh /tmp/mygo-server-2.0.0.tgz RELEASE_ID COMMIT'
```

Compare the uploaded checksum with the local archive before activation. The
optional third argument records the application commit in `deployment.json`.
Activation stops the edge, then the lobby, then every rooms instance, switches
`/srv/mygo-fighter/current` to the extracted release, starts rooms instances,
then the lobby, then the edge, and waits for each internal `/internal/health` and
for the edge `/api/health` to report `"app":"mygo-scala"`. It then writes
`deployment.json` with the release ID, optional commit, archive SHA-256,
activation time and the role/instance ports, and retains the replaced release as
`previous`. A failed start or health check restores the previous release and
restarts the full set. The first migration retains the protocol-22 directory. Failure restoration and
rollback recognize its single-unit layout and start `mygo-fighter` instead of
running the old artifact as three roles. Keep the legacy unit and environment
while that rollback target is retained.

Use a new, descriptive `RELEASE_ID` containing only letters, numbers, dots,
hyphens and underscores. The installer uses Ubuntu's Java and Caddy packages and
creates a dedicated `mygo` account. It refuses to replace an unrelated existing
Caddy installation, backs up the initial Caddy configuration and preserves any
existing game environment file. The roles stop during activation, so a release
switch ends temporary rooms and clients must refresh; protocol 24 and earlier
clients are rejected by the protocol-25 release.

```sh
ssh alicloud 'systemctl status mygo-edge mygo-lobby caddy --no-pager'
ssh alicloud 'systemctl list-units "mygo-rooms@*" --all --no-pager'
ssh alicloud 'sudo journalctl -u mygo-edge -u mygo-lobby -n 100 --no-pager'
ssh alicloud 'sudo systemctl show mygo-edge mygo-lobby "mygo-rooms@a" -p MemoryCurrent -p MemoryPeak -p NRestarts'
ssh alicloud 'sudo cat /srv/mygo-fighter/current/deployment.json'
ssh alicloud 'sudo bash /opt/mygo-fighter/rollback.sh'
```

Add one `journalctl -u mygo-rooms@<id>` and one instance to the memory check per
rooms instance. `rollback.sh` reverses the whole set with the same stop, start
and health-check sequence; if the rollback itself fails it restarts the active
release and leaves the links unchanged. For an internal health check, the
generated secret can be read from `base.env`:

```sh
ssh alicloud 'sudo bash -c ". /etc/mygo-fighter/base.env; curl -fsS -H \"X-Mygo-Internal: \$INTERNAL_SECRET\" http://127.0.0.1:8079/internal/health"'
```

Historical provisioning procedure for the Azure SSH alias (the game trial is now removed):

```sh
tar -czf output/wan/hosting.tar.gz deploy
scp output/wan/hosting.tar.gz azure:/tmp/mygo-hosting.tar.gz
ssh azure 'mkdir -p /tmp/mygo-hosting && tar -xzf /tmp/mygo-hosting.tar.gz -C /tmp/mygo-hosting'
ssh azure 'sudo bash /tmp/mygo-hosting/deploy/install.sh mygo-20-78-1-182.sslip.io'
scp backend/target/universal/mygo-server-2.0.0.tgz azure:/tmp/mygo-server-2.0.0.tgz
ssh azure 'sudo bash /tmp/mygo-hosting/deploy/activate.sh /tmp/mygo-server-2.0.0.tgz RELEASE_ID'
```

The Azure commands above describe the retired trial that used the single unit;
the current `install.sh` installs the three-service layout instead. Permit
inbound **TCP 80 and 443** in the VM's Azure network security group. Do not open
8080 or change the existing UDP 443 VPN rule. HTTP/3 is disabled in the supplied
Caddy configuration so it does not claim the VPN's UDP port. The proxy preserves
Host and handles WebSocket upgrades. Its ACME certificate data remains under
Caddy's persistent service storage.

The trial uses `MyGO-Web-TCP-80-443` at priority 330 in `azure-vm-nsg`, attached only to this VM's network interface. The existing `Hysteria2-UDP-443` rule at priority 320 is unchanged. Caddy owns TCP 80/443; the JVM remains bound to loopback port 8080 and Hysteria retains UDP 443.

## Historical single-unit configuration and shared behavior

`/etc/mygo-fighter.env` held runtime settings for the retired single-unit layout. It is preserved on migrated hosts but **no longer read** by the edge/lobby/rooms units; the three-service equivalents live in `/etc/mygo-fighter/{base,edge,lobby,rooms}.env` as described above.

| Setting             | Trial value                     | Meaning                                                            |
| ------------------- | ------------------------------- | ------------------------------------------------------------------ |
| `HOST`              | `127.0.0.1`                     | Backend is reachable only through the local proxy/SSH              |
| `PORT`              | `8080`                          | Private backend port                                               |
| `WEB_ROOT`          | `/srv/mygo-fighter/current/web` | Frontend belonging to the active release                           |
| `MAX_ROOMS`         | `2`                             | Positive room limit; ordinary LAN default remains 20               |
| `TRUST_LOCAL_PROXY` | `true`                          | Accept the last forwarded client address only from a loopback peer |

The single unit started with a 64 MB minimum / 256 MB maximum Java heap, a 64 MB reserved code cache and a 512 MB service memory ceiling, with no service swap allowance. The three-service layout instead caps the edge at 256 MB, the lobby at 192 MB and each rooms instance at 512 MB; this reserves room for Ubuntu, Caddy and the existing VPN. These settings are a trial budget, not a capacity guarantee. There is no automatic VM resize.

Every rooms unit gives the embedded GraalJS runtime a dedicated per-instance cache at `/var/cache/mygo-fighter/rooms-<id>` using `CacheDirectory` and `XDG_CACHE_HOME`. This allows native runtime resources to be unpacked while application releases and the service home remain read-only. Without this cache, GraalJS reports a misleading missing-`truffleattach` warning caused by an access-denied error under `/srv/mygo-fighter/.cache`. Existing installations need the updated units followed by `systemctl daemon-reload` and a service restart. See [GraalVM's internal resource documentation](https://www.graalvm.org/latest/reference-manual/embed-languages/#managing-internal-resources).

The edge keeps the same admission behavior: room creation and joining share a limit of 20 attempts per client address per minute, socket handshakes have a separate limit of 60 per minute, counters expire, and the address/category map is capped at 4,096 entries. Rejection uses HTTP 429, a JSON retry message and `Retry-After: 60`. Established sockets retain their existing 300-message-per-second and 8 KiB message limits. The edge enforces same-origin browser requests; the rooms process resolves the session token before player commands. The room code appears in the WebSocket URL (`/ws?room=CODE`) but the token never does. Caddy ignores untrusted incoming forwarding claims; only enable `TRUST_LOCAL_PROXY` behind a trusted loopback proxy.

The server accepts two human players per room and preserves host-only rule changes, 1v1 and 3v3 team relay, authoritative combat and the reconnect loading barrier. A disconnect pauses the match. After all sockets have been absent for two minutes, room cleanup stops its clock, closes the simulation, revokes its sessions and frees its capacity. Thirty-minute inactivity expiry and immediate cleanup after everyone explicitly leaves remain in place. Server restarts discard temporary rooms.

## Historical Azure operations and general rollback behavior

The Azure commands below are kept for the retired single-unit trial. For the
current AliCloud host, use the three-service commands in
[Three-service layout](#three-service-layout) instead.

```sh
ssh azure 'systemctl status mygo-fighter caddy hysteria-server --no-pager'
ssh azure 'sudo journalctl -u mygo-fighter -u caddy --no-pager -n 100'
ssh azure 'systemctl show mygo-fighter -p MemoryCurrent -p MemoryPeak -p CPUUsageNSec -p NRestarts'
ssh azure 'sudo systemctl restart mygo-fighter'
curl --fail https://mygo-20-78-1-182.sslip.io/api/health
```

The release installer extracts to `/srv/mygo-fighter/releases/RELEASE_ID`, stops
the role units, atomically switches `current`, starts them in dependency order
and checks internal and public health. Stopping before switching prevents the
previous JVM from serving a newer frontend. A failed switch, start or health
check restores the preceding release when one exists and restarts the full set.
Successful activation records it as `previous`; run
`sudo bash /opt/mygo-fighter/rollback.sh` on the host to restore it. Deployment
and rollback are serialized with a host-local lock. Both switching and restarting
end current temporary matches. Normally retain the active and previous
directories when pruning releases. The explicit 2026-10-28 request to delete the
old version overrides that default for this deployment; only the active AliCloud
directory remains.

To retire the trial, stop and disable the role units (the historical single unit
was `mygo-fighter`; the current layout uses `mygo-edge`, `mygo-lobby` and
`mygo-rooms@<id>`), remove only the trial's Azure TCP 80/443 inbound rule, then
stop Caddy if it still serves only this game. Restore
`/etc/caddy/Caddyfile.before-mygo` if retaining Caddy for other use. The game
release directories, its service units, `/etc/mygo-fighter*` configuration and
dedicated `mygo` account can then be removed after any desired backups. Leave the
VPN service, its certificates and UDP 443 rule intact.

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
