# Deployment and room capacity — 2026-10-27

The latest matching frontend, Scala backend and shared TypeScript combat kernel are live at <https://mygo-123-57-149-254.sslip.io/>. Production is configured for **four simultaneous rooms / eight players** in `/etc/mygo-fighter.env` (`MAX_ROOMS=4`). Four was the highest count to pass warmed screening and remain stable through the observed confirmation from a restarted production process. The user ended that confirmation after approximately ten measured minutes; the planned fifteen-minute window was not completed.

## Release

| Item               | Value                                                                        |
| ------------------ | ---------------------------------------------------------------------------- |
| Application commit | `1fbfdc0da1bed3ee5e784da734ee0f966c2c9858`                                   |
| Release            | `20261027-1fbfdc0-protocol20`                                                |
| WebSocket protocol | `20`                                                                         |
| Archive SHA-256    | `866ccbddec0fbfd8eacade1aee0058b3bc3e10031b4e9f08cee7edc5c76025ef`           |
| Runtime            | OpenJDK 21                                                                   |
| Host               | AliCloud Beijing, Ubuntu 24.04, x86-64, two vCPUs, approximately 1.6 GiB RAM |
| JVM/service limits | 64/256 MiB heap, 64 MiB code cache, 512 MiB service memory, no service swap  |
| Public proxy       | Caddy HTTPS/WSS; backend listens on `127.0.0.1:8080`                         |

Fetched and reviewed `origin/main`, then fast-forwarded the clean checkout before building. The archive checksum matched after upload. This release includes finish-presentation acknowledgement, Soyo wave damage, Miyako yokan sweep and Mortis blood fist/lifesteal; Poppin'Party files remain unregistered design drafts. The application artifact was unchanged by the later documentation update. `deployment.json` in the active release records its identity, configuration and the interrupted confirmation status.

## Capacity screening

The deciding screening used the production HTTPS/WSS endpoint, temporarily configured to admit up to 40 rooms while the requested batches were tested. Clients ran on the separate Azure Japan East VM so they did not consume AliCloud CPU. AliCloud resource samples were recorded independently every five seconds. JVM flags, memory ceiling, task limit and application artifact were unchanged.

Every room was an active 3v3 relay with two authenticated clients. Teams covered all 16 characters across multiple stages, with flat terrain so clients could continuously approach and attack. Clients sent movement, normal attacks, skills, transformations, jumps and supers, at up to 30 input messages per second per player, acknowledged finish presentations and restarted completed matches.

Each deciding stage used 60 seconds of active warm-up and at least 60 seconds of measurement. Passing required every client to receive at least 50 snapshots/second, snapshot-gap p95 at most 50 ms, server-update p95 at most 16.67 ms, RTT p95 at most 250 ms on the Japan East–Beijing path, no unexpected disconnects or protocol errors, observed damage, matching event IDs between peers and a live backend within the existing memory ceiling. These are workload-specific acceptance criteria relative to nominal 60 Hz snapshots, not a universal hardware maximum.

| Rooms | Warmed screening | Minimum snapshots/s | Worst gap p95, ms | Worst RTT p95, ms | Mean CPU cores | Maximum sampled memory, MiB |
| ----- | ---------------- | ------------------: | ----------------: | ----------------: | -------------: | --------------------------: |
| 4     | Pass             |               59.39 |             25.42 |            140.13 |           1.37 |                       316.8 |
| 6     | Fail             |               31.82 |             96.97 |            316.45 |           1.69 |                       316.9 |
| 5     | Pass             |               51.84 |             44.75 |            206.74 |           1.63 |                       317.8 |

Five rooms passed short warmed screening but failed the subsequent confirmation from a restarted production process during startup: one socket closed unexpectedly, another reported a WebSocket error, and input-rate rejection errors occurred. Five was therefore rejected for production. Six failed sustained delivery even after warm-up. Four remains the selected limit, and a fifth room was explicitly rejected while the four test rooms were occupied.

Initial cold attempts exposed substantial first-match startup stalls. A workstation-driven attempt was also invalidated by a simultaneous SSH/browser connection interruption; backend PIDs and restart counters stayed unchanged. A preliminary isolated backend on loopback port 8181 helped diagnose startup, but co-located test clients competed for CPU. Those preliminary capacity results were superseded by the external-client screening above. Cold first-match warm-up remains a limitation; the selected cap does not eliminate it.

## Confirmation stopped at the user's request

Production was restarted with `MAX_ROOMS=4`. Eight external clients exercised four simultaneous 3v3 matches through public HTTPS/WSS with normal certificate and hostname validation. The startup period completed without client errors; measurement began after 180 seconds of active warm-up.

The user asked to end the test, and the load clients were stopped at **23:43:02 Asia/Shanghai**. The final saved sample covers **600.02 measured seconds**, following the three-minute warm-up. It is a partial confirmation, not a completed fifteen-minute acceptance run. The test-client unit's exit status 143 records this intentional stop, not a game service failure.

| Observed result at the final sample     |              Value |
| --------------------------------------- | -----------------: |
| Snapshots per client                    |      35,164–35,243 |
| Minimum snapshots per client per second |              58.60 |
| Unexpected socket closes                |                  0 |
| Protocol/client errors                  |                  0 |
| Automatic backend restarts              |                  0 |
| Memory-limit kills                      |                  0 |
| Mean backend CPU                        | 1.41 logical cores |
| Maximum sampled backend memory          |          255.1 MiB |

All clients observed 3v3 reserve progression and damage. Samples confirmed one unchanged production PID throughout the measured interval. The interrupted harness did not save final latency percentiles or a final event-pair comparison; those are not claimed for this partial run. The warmed screening above did verify matching peer event IDs. Test clients were stopped immediately; abandoned test rooms use the existing two-minute automatic cleanup.

The 512 MiB limit is a conservative systemd service setting inherited from the original small-VM deployment, not the VM's physical RAM limit. It includes the JVM heap, JavaScript runtime, threads and other native overhead and leaves memory for Ubuntu, Caddy and other processes. None of these room-count failures reached that ceiling, so memory was not the observed limit. No VM resize, runtime change or network-rule change was made.

## Other verification

Passed `npm run check`, `npm run check:backend`, `npm run build:pages` and `npm run package:server` (including `npm run build`). Checks covered 334 runtime media files, 16 characters and 15 stages. The Pages build loaded and entered a practice battle under `/mygo-fighter/`, with no console errors or failed resource responses. All 334 public media paths matched local content/ranges, the public manifest matched and immutable media caching passed. HTTP redirects to HTTPS; the HTML uses `no-cache`.

Public functional checks passed protocol-20 authentication, pause/resume, reconnect, host-only restart, invalid sessions, foreign-origin rejection, previous-protocol rejection and fighter reset. The browser displayed the expected room-full message when another room was requested at capacity. No removed test directory was restored.

## Previous-version removal and operations

At the user's explicit request, deleted all three preceding AliCloud releases (`20261026-6d3d136-protocol10`, `20261026-b82ae8c-protocol12`, `20261027-9207f12-protocol12`), their uploaded packages and metadata, and the `previous` symlink. Only `20261027-1fbfdc0-protocol20` remains under `/srv/mygo-fighter/releases/`. Generic activation/rollback scripts remain deployment infrastructure, but rollback has no previous release to target.

Removed the already disabled Azure game trial: all three release directories, uploaded archives, its service unit, environment file, dedicated cache and temporary hosting files. The game-specific Caddy configuration was replaced with its original configuration; Caddy remained disabled. The Azure VPN remained active/enabled, with its networking and credentials preserved.

Temporary capacity services, clients, portable Node runtimes and their files on both hosts were removed after collecting reports. The active game continues running. Local reports and temporary scripts are under ignored `output/deploy-20261027/`; browser artifacts are under ignored `output/playwright/`.

```sh
ssh alicloud 'systemctl status mygo-fighter caddy --no-pager'
ssh alicloud 'sudo cat /srv/mygo-fighter/current/deployment.json'
curl --fail https://mygo-123-57-149-254.sslip.io/api/health
```
