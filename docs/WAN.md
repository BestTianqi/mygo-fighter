# Public online hosting

The complete game can run on one Linux server. A Scala JVM process owns independent two-player rooms and executes the same TypeScript battle kernel used by local play. Caddy serves HTTPS and forwards HTTP and WebSockets to that process. Players open one shared game URL; no player hosts a public port or installs a backend.

The Azure deployment is a **trial**, targeting **two rooms / four players** on the existing Japan East ARM64 VM (2 cores, approximately 1 GB RAM). Its intended address is `https://mygo-20-78-1-182.sslip.io`. GitHub Pages does not link to the trial. Verification results are recorded below; the address is usable only after the public network and certificate checks pass.

## Build and install

Run the normal checks, then `npm run package:server` on the development machine. The resulting `backend/target/universal/mygo-server-2.0.0.tgz` contains the JVM dependency jars, startup scripts, frontend and original runtime media, plus the matching embedded combat kernel and terrain catalog. The source artwork is retained in Git and does not need to be uploaded. The target host needs Java 21, not Node or sbt.

The root-level `deploy/` folder contains operating-system installation and service files. These are deployment infrastructure rather than backend business code, so they are kept outside Scala's `services/` tree.

For the existing SSH alias:

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

## Configuration and behavior

`/etc/mygo-fighter.env` holds runtime settings:

| Setting             | Trial value                     | Meaning                                                            |
| ------------------- | ------------------------------- | ------------------------------------------------------------------ |
| `HOST`              | `127.0.0.1`                     | Backend is reachable only through the local proxy/SSH              |
| `PORT`              | `8080`                          | Private backend port                                               |
| `WEB_ROOT`          | `/srv/mygo-fighter/current/web` | Frontend belonging to the active release                           |
| `MAX_ROOMS`         | `2`                             | Positive room limit; ordinary LAN default remains 20               |
| `TRUST_LOCAL_PROXY` | `true`                          | Accept the last forwarded client address only from a loopback peer |

The service starts with a 64 MB minimum / 256 MB maximum Java heap, a 64 MB reserved code cache and a 512 MB service memory ceiling, with no service swap allowance. These settings reserve room for Ubuntu, Caddy and the existing VPN; they are a trial budget, not a capacity guarantee. There is no automatic VM resize.

Room creation and joining share a limit of 20 attempts per client address per minute. Socket handshakes have a separate limit of 60 per minute. Counters expire and the address/category map is capped at 4,096 entries. Rejection uses HTTP 429, a JSON retry message and `Retry-After: 60`. Established sockets retain their existing 300-message-per-second and 8 KiB message limits. Browser requests retain same-origin checks; sessions are resolved before player commands and never appear in socket URLs. Caddy ignores untrusted incoming forwarding claims; only enable `TRUST_LOCAL_PROXY` behind a trusted loopback proxy.

The server accepts two human players per room and preserves host-only rule changes, 1v1 and 3v3 team relay, authoritative combat and the reconnect loading barrier. A disconnect pauses the match. After all sockets have been absent for two minutes, room cleanup stops its clock, closes the simulation, revokes its sessions and frees its capacity. Thirty-minute inactivity expiry and immediate cleanup after everyone explicitly leaves remain in place. Server restarts discard temporary rooms.

## Operations and rollback

```sh
ssh azure 'systemctl status mygo-fighter caddy hysteria-server --no-pager'
ssh azure 'sudo journalctl -u mygo-fighter -u caddy --no-pager -n 100'
ssh azure 'systemctl show mygo-fighter -p MemoryCurrent -p MemoryPeak -p CPUUsageNSec -p NRestarts'
ssh azure 'sudo systemctl restart mygo-fighter'
curl --fail https://mygo-20-78-1-182.sslip.io/api/health
```

The release installer extracts to `/srv/mygo-fighter/releases/RELEASE_ID`, stops the game, atomically switches `current`, starts the matching JVM and checks backend health. Stopping before switching prevents the previous JVM from serving a newer frontend. A failed switch, start or health check restores the preceding release when one exists. Successful activation records it as `previous`; run `sudo bash /tmp/mygo-hosting/deploy/rollback.sh` on the host to restore it. Deployment and rollback are serialized with a host-local lock. Both switching and restarting end current temporary matches. Preserve at least the active and previous directories when removing older release artifacts.

To retire the trial, stop and disable `mygo-fighter`, remove only the trial's Azure TCP 80/443 inbound rule, then stop Caddy if it still serves only this game. Restore `/etc/caddy/Caddyfile.before-mygo` if retaining Caddy for other use. The game release directories, its service unit, `/etc/mygo-fighter.env` and dedicated `mygo` account can then be removed after any desired backups. Leave the VPN service, its certificates and UDP 443 rule intact.

## Verification status

Required acceptance includes normal frontend/media/build and Scala checks; a static Pages check under `/mygo-fighter/` with no trial link; HTTPS and WebSocket access without certificate bypass; original image/audio/video loading; four isolated clients in two simultaneous matches for at least 15 minutes; damage, supers, reserve progression, pause, restart and reconnect; full/invalid rooms, invalid sessions, incompatible protocol, origin and admission checks; and abandoned-room expiry. Record memory, CPU, snapshot timing and VPN responsiveness. All temporary harnesses and measurements belong under ignored `output/wan/`; no removed test directory is restored.

The application is installed on Azure with the two-room limit. The frontend/media checks, Scala compilation/formatting, normal build, Pages build, packaged startup and proxy admission checks have passed after merging the Taki and Rana updates (network protocol 7). The project-path Pages build has no trial-server link; the optional HTTPS link was separately verified with a test-only build. Two isolated browsers against the locally packaged server have also created/joined a room and completed the loading barrier, refresh and resume flow.

The 2026-10-26 protocol-7 acceptance run used **four isolated WebSocket clients in two simultaneous rooms for 900 seconds**, including the updated Taki/Rana 1v1 matchup and 3v3 reserve progression. Each client received approximately 54,000 snapshots. There were no unexpected disconnects, protocol errors or server restarts. Both the two-minute abandoned-session revocation and room-capacity recovery checks passed. All **279 runtime media files (93,738,918 bytes)** matched the local originals byte for byte through Caddy.

Further live checks passed for authoritative Sakiko and Viola supers through Caddy, automatic restoration after an intentionally failed release startup, and manual rollback to the previous release and back. The deployed application remains on protocol 7 after those recovery checks.

| Measurement               | Observed trial result                                      |
| ------------------------- | ---------------------------------------------------------- |
| Peak game service memory  | 342.7 MiB within the 512 MiB ceiling                       |
| Average game CPU          | 0.45 CPU core across the sampled interval                  |
| p95 server update work    | 1.21–1.33 ms across the four clients                       |
| p95 snapshot delivery gap | 62.8–72.6 ms over the test tunnel                          |
| VPN availability          | Active in all 30 sampled checks; every SSH probe completed |

These measurements use the real Azure JVM and Caddy through an encrypted SSH tunnel. They verify the small test workload and proxy behavior; they do not measure direct public HTTPS/WSS latency or establish production capacity. Temporary evidence is in ignored `output/wan/`, including `ACCEPTANCE.json`, the per-client soak report, media verification and resource samples.

**Public HTTPS is pending.** Azure control-plane authentication is still required to finish the inbound TCP 80/443 configuration. The public Caddy service is stopped to avoid repeated certificate-validation failures while those ports are unavailable. After configuring the rules, start it with `sudo systemctl start caddy` and verify a browser-trusted certificate, public HTTP health and WebSocket play. The temporary loopback-only proxy used for validation does not establish public availability.
