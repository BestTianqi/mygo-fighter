# AliCloud deployment and gameplay audit — 2026-10-30

The current frontend, Scala backend and shared TypeScript combat kernel are deployed together as protocol 25. The service split preserves the in-process combat clock: edge proxies public traffic, lobby places rooms, and one rooms JVM owns live matches.

| Item               | Value                                                              |
| ------------------ | ------------------------------------------------------------------ |
| Host               | AliCloud Beijing, 2 vCPUs, 1,613 MiB RAM, Ubuntu 24.04             |
| Public URL         | https://mygo-123-57-149-254.sslip.io/                              |
| Application commit | `2ed585d12fb29603c5e59c10d586bfe4f6be5cec`                         |
| Release            | `20261030-2ed585d-protocol25`                                      |
| Archive SHA-256    | `19598e8112def3e180a4fa2de9c79320ed9a5834b2be2bff02b7ed1dc470924c` |
| Initial activation | 2026-10-30 08:00:10 UTC (16:00:10 China time)                      |
| Runtime            | Ubuntu OpenJDK 21.0.12.1                                           |
| Services           | edge :8080, lobby :8079, rooms instance a :8091, all loopback      |
| Room ceiling       | 2 globally and 2 on instance a                                     |
| Memory ceilings    | edge 256 MiB, lobby 192 MiB, rooms 512 MiB; no swap                |
| Previous release   | `20261028-8051ba8-protocol22`, retained for rollback               |

## Dominant problems and selected changes

1. **The initial lobby budget could not start reliably.** With the proposed 128 MiB cgroup limit, Linux killed the new lobby during startup. The production limit is now 192 MiB; edge also receives 256 MiB instead of 192 MiB, based on its observed working set. These limits include native JVM memory and are distinct from the unchanged 48/80 MiB maximum Java heaps.
2. **Four active rooms overloaded the two-vCPU host.** A 60-second four-room trial, after 45 seconds of warmup, failed even with clients running on the server over loopback: minimum delivery 12.46 Hz, worst delivery-gap p95 293.45 ms, update-work p95 19.31 ms and delayed ping replies. Measured role CPU totaled 1.76 logical cores; the load clients and operating system used additional CPU. `vmstat` showed zero idle time. There was no cgroup CPU quota, memory-limit event or hypervisor steal in the diagnostic samples. An earlier tunnel-based trial also failed, but the loopback run establishes that an Internet path was not necessary to reproduce the overload.
3. **Cold initialization exceeded the ordinary proxy timeout.** The final `loadedroom` acknowledgement creates the GraalJS context. The old 10-second proxy limit returned HTTP 504 even when the room subsequently entered combat. Only that operation now receives at least 60 seconds upstream and 65 seconds in the browser. Other APIs retain their existing timeouts. This fixes the false failure; it does not claim to eliminate initialization cost.
4. **Cold JVM work and garbage collection caused pauses.** The room JVM log recorded full collections for metadata and code-cache thresholds, including pauses above 100 ms. The room starts with a 128 MiB heap rather than 64 MiB and reserves a 128 MiB compiler cache rather than 64 MiB, while retaining the 256 MiB heap maximum and 512 MiB cgroup limit. All roles use a 96 MiB initial metadata GC threshold; this is not a metadata memory ceiling or an eagerly allocated 96 MiB buffer. Startup now waits for each role's health before starting the next role, avoiding three simultaneous cold JVMs.
5. **Legacy recovery was incompatible with the new service layout.** Activation and rollback now recognize the retained single-unit release, stop conflicting units, restore its `mygo-fighter` unit when needed, and restore the correct boot enablement. `install.sh --prepare-only` keeps the old public service available while preparing the new units. Keep the disabled legacy unit and `/etc/mygo-fighter.env` while the legacy rollback target is retained.

The selected configuration uses one rooms instance and a two-room ceiling. Adding another rooms JVM would consume more of this host's limited memory and does not add CPU capacity. Three rooms were not screened, so two is the selected quality budget, not a proven maximum. No paid resource upgrade, cadence reduction, combat-rule change, media removal or GraalVM runtime migration was made.

## Controlled gameplay measurement

All workloads ran serially. The current kernel was held constant. Clients sent unified movement/action input at 20 Hz, with terrain enabled, 2,000 HP, infinite time/energy and normal cooldowns; two peers shared each three-character team match. The JVM tuning and room-count changes are evaluated together, so their individual CPU benefits are not isolated.

| Server-local workload                    |  Four rooms | Selected two rooms |
| ---------------------------------------- | ----------: | -----------------: |
| Warmup                                   |        45 s |               45 s |
| Measured time                            |     60.02 s |            90.01 s |
| Minimum snapshots/client/second          |       12.46 |              53.88 |
| Worst snapshot-gap p95                   |   293.45 ms |           32.90 ms |
| Worst server-update p95                  |    19.31 ms |           15.93 ms |
| Worst ping RTT p95                       | 9,440.38 ms |          101.67 ms |
| Total role CPU, logical cores            |        1.76 |               1.27 |
| Maximum sampled sum of role memory       |  630.32 MiB |         640.00 MiB |
| Matching reliable event sets             |          No |                Yes |
| Unexpected disconnects / protocol errors |       0 / 0 |              0 / 0 |

The event mismatch in the overloaded run describes observations at the measurement boundary after a 500 ms drain; it does not establish permanent event loss. The two-room run passed the delivery, gap, update, event consistency and service-health gates. Its local RTT and temporary client CPU are not WAN latency measurements. The old public service remained idle during these isolated trials and was stopped during migration.

## Deployment verification

- `npm run check`, `npm run check:backend`, `npm run package:server` (including the production build) and `npm run build:pages` passed. The final three-process `npm run check:e2e` passed both simultaneous room flows.
- Shell syntax checks passed. A Linux harness exercised legacy-to-services activation, rollback in both directions, failed services activation restoration and failed legacy migration restoration.
- The uploaded archive checksum matched the local package. Host unit validation passed for the game units; it also reported pre-existing vendor cloud-monitor warnings unrelated to the game.
- The actual public host rolled back to protocol 22 and then returned to protocol 25. Symlinks, health endpoints and unit boot enablement matched both layouts. The accepted release remains active and its legacy predecessor remains available.
- Public HTTPS/WSS functional checks passed protocol 25, pause/resume, reconnect, host-only restart, invalid-session rejection, foreign-origin rejection, old-protocol rejection, third-room rejection at the two-room ceiling and fighter reset after restart.

## Public gameplay soak

Five clients completed 300.01 measured seconds after 45 seconds of warmup, following 18.76 seconds of setup. The workload ran an 8v8 team match and a three-player match concurrently, with terrain, 350 HP, infinite time/energy, standard cooldowns and alternating movement/attacks. All five clients received damage and reserve progression. The two team-match peers received the same 1,266 reliable event IDs, and the three-player peers received the same 2,017 IDs. There were no unexpected closes, protocol/API errors, automatic restarts or memory-limit events. Sampled role memory peaked at 638.38 MiB in total; role CPU averaged 1.37 logical cores. Minimum delivery was 53.89 snapshots/client/second, worst gap p95 40.34 ms, and worst server-update p95 16.38 ms. The delivery and consistency gates passed. Browser acceptance during the early part of the window is included in these service-load numbers.

The network latency remained materially worse: worst ping p95 738.33 ms and combat input-to-application p95 775.07 ms. These results must not be described as low-latency gameplay. A client lookup resolved the hostname to `198.18.0.196`, a local synthetic address on the client's routed network path. A normal HTTPS health request took 1.034 s; a same-hostname HTTPS request pinned to the real server address `123.57.149.254`, with normal TLS verification, took 55.82 ms. This identifies the client route as an additional delay source. The per-process direct-route comparison below does not alter system DNS, VPN configuration or other connections.

This is a finite gameplay workload, not coverage of every custom-rule combination. Cold first-use compilation and occasional long-tail update stalls remain; widening the initialization timeout does not remove them.

## Direct-route comparison

A following warmed five-client run repeated the same mixed formats for 120.03 measured seconds after 15 seconds of warmup. Only this verification process pinned the hostname's DNS lookup to `123.57.149.254`; the HTTPS/WSS hostname, certificate validation, server release and gameplay cadence stayed the same. Server socket inspection confirmed the direct client path.

- Minimum delivery: 57.71 snapshots/client/second.
- Worst snapshot-gap p95: 28.91 ms; worst server-update p95: 10.60 ms.
- Worst ping RTT p95: 74.29 ms; worst combat input-to-application p95: 122.13 ms.
- Mean role CPU: 1.30 logical cores; maximum sampled total role memory: 646.62 MiB.
- Event sets matched in both rooms; no unexpected disconnects or client errors occurred.

This was a subsequent warmed run, not a randomized before/after experiment. The separate paired HTTPS probes establish the routing difference without conflating it with a backend code change. The public five-minute run above still includes the client's ordinary routed path and its high latency.

Public mobile browser acceptance also loaded the deployed game, entered local combat and verified circular controls in portrait and landscape with no console errors. The Pages build loaded under `/mygo-fighter/` with no console errors.

Raw logs, temporary verification scripts, reports and screenshots are retained only under ignored `output/deploy-20261030/`. Temporary server-side benchmark processes and runtimes are removed after verification; the installed production service requires only Java.
