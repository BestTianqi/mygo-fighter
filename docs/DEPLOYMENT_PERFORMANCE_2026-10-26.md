# AliCloud update and performance audit — 2026-10-26

Historical deployment record. The [current deployment and capacity record](DEPLOYMENT_CAPACITY_2026-10-27.md) supersedes the active-release and rollback information below; all older server releases have been deleted.

This is the historical `b82ae8c` audit. See the [2026-10-27 runtime evaluation](RUNTIME_OPTIMIZATION_2026-10-27.md) for the subsequent protocol-12 release and permanent TCP_NODELAY setting.

## Application deployed

The AliCloud Beijing game server was updated from application commit `6d3d1363e3602ce694928261426da1bc4aa573b0` (protocol 10) to `b82ae8c3ec08ec5d351a18f6b4c861acc0a38c1d` (protocol 12). A second fetch during deployment found this newer merge, which includes both the transport/rendering optimizations and the terrain/combat changes.

- Public game: <https://mygo-123-57-149-254.sslip.io/>
- Active release: `/srv/mygo-fighter/releases/20261026-b82ae8c-protocol12`.
- Previous release retained: `/srv/mygo-fighter/releases/20261026-6d3d136-protocol10`.
- Archive SHA-256: `3e54678a60359b9dec891f3fe1f0ea24d918a576b583265206785a4315b3c465`, matched locally and after upload.
- Matching frontend, shared kernel, Scala backend and stage catalog were packaged together. Both players need to refresh for protocol 12.
- Existing two-room limit, service memory budget and reverse proxy configuration were retained.

`deployment.json` in the active release records the application commit, checksum and protocol. A later documentation-only commit does not change the application artifact.

## Verification and measurement method

Passed `npm run check`, `npm run check:backend`, `npm run package:server` (including `npm run build`) and `npm run build:pages`. The Pages build was opened under `/mygo-fighter/`; its menu and images loaded with no failed resource responses. Public health checks report `mygo-scala`, 120 Hz simulation and 60 Hz snapshots. All 279 public runtime media paths passed content and cache-header checks against the current local manifest.

Two isolated real browser contexts exercised room creation/joining, character selection, gameplay/damage, pause/resume and refresh/reconnect. The guest's health reached 128, and refreshing preserved its session. No JavaScript page exceptions occurred. One browser transport-console error occurred during intentional session cleanup; it was not an unexplained gameplay disconnect.

The old release was measured for 120 seconds with four public WebSocket clients in simultaneous 1v1 and 3v3 rooms. The new release uses the same client workload. These clients verify authoritative state and transport without the cost of browser rendering. Rendering was measured separately in hardware-accelerated Chrome on an Apple M4 Pro at DPR 1, 960 × 540 backing resolution, for approximately 18 seconds per version.

Raw measurements, scripts, packet summaries, screenshots and a JVM recording are kept under ignored `output/deployment-performance/` and `output/playwright/`. No test suite was restored.

### Important limits

The old 120-second run overlapped an archive upload after its first part. The new long run includes cold-room warm-up, a 30-second JFR profile and a temporary five-second socket experiment. The profiling interval coincided with substantial CPU contention and multi-second outliers, so its aggregate tail latency is not a clean release comparison. A separate warmed, unprofiled socket comparison measures normal timing and the proposed transport setting.

The new commit also changes combat ranges and terrain. Packet-size and processing differences cannot be attributed solely to the transport optimization. Input-to-applied samples across READY, round transitions and hit freeze include intentional game pauses; they are not raw network latency. Client-observed acknowledgement includes the return trip and snapshot scheduling, and is not a one-way timing measurement.

## What the measurements establish

Local rendering was already close to 60 fps on this machine and remained there: frame p95 changed from 16.8 ms to 16.7 ms, with zero long tasks in both samples. JavaScript callback p95 was 0.6 ms before and 0.7 ms after. This hardware sample does not establish a large rendering-speed improvement; the constrained-device measurements in [the earlier performance report](PERFORMANCE.md) address a different workload.

The old four-client workload produced state-packet p95 of 5,841–6,157 bytes, server-update p95 of 4.10–5.36 ms and client RTT p95 of 62.7–64.5 ms. Its early, less-contended sample had RTT p95 around 52–53 ms. The new combat run produced state-packet p95 of 4,007–4,127 bytes, about 31–33% smaller. Median RTT still stayed near 50 ms. Smaller packets alone do not remove the transport stalls below.

## Dominant problems and next optimizations

### 1. Backend TCP buffering adds avoidable latency

The live JVM's accepted TCP sockets had `TCP_NODELAY=0`. Packet traces on loopback showed a WebSocket header being sent separately from its payload, with some payloads held for approximately 40 ms. This delay exists between the Scala backend and Caddy, before public network delivery; a low `serverUpdateMs` does not include it.

A scoped experiment changed only one active verification connection for five seconds, then restored its original option:

| Header-to-payload delay | Original socket | Temporary TCP_NODELAY |
| ----------------------- | --------------: | --------------------: |
| Samples                 |             169 |                   307 |
| p50                     |        0.781 ms |              0.136 ms |
| p95                     |       40.956 ms |              0.560 ms |
| Maximum                 |       41.907 ms |              4.008 ms |
| Samples above 30 ms     |              31 |                     0 |

The highest-priority code change is to configure `SocketOption.noDelay(true)` through `EmberServerBuilder.withAdditionalSocketOptions` in `backend/src/main/scala/services/system/api/Main.scala`. The deployed application remains the fetched commit; the diagnostic option changes are temporary and are restored before their test connections close. The pinned [http4s 0.23.32 builder](https://github.com/http4s/http4s/blob/v0.23.32/ember-server/shared/src/main/scala/org/http4s/ember/server/EmberServerBuilder.scala) exposes this option and otherwise defaults its additional options to an empty list.

This header/payload result is not itself an end-to-end gameplay latency result. The separate off/on/off experiment below tests client-observed timing.

### 2. GraalJS is running in interpreter fallback

A standalone probe using the deployed jars and runtime reported `Polyglot implementation: Interpreted`. Its warning says JVMCI is disabled. A second standalone probe enabling JVMCI still reported `Interpreted`, because Libgraal/the required compiler is unavailable. The production warning-suppression flag hides the warning; it does not enable optimization.

In the 30-second JVM recording, 1,584 of 2,100 sampled execution stacks (75.4%) involved GraalJS/Truffle; 359 (17.1%) involved Cats Effect without a Truffle frame. These are sampled stack categories, not complete wall-time shares or an exact allocation of CPU to individual combat functions. Stacks were truncated, so a precise simulation-versus-serialization split is unavailable.

There were 33 young-GC pauses totaling 127.8 ms, with a maximum of 12.75 ms. The 64 MiB code cache had room remaining and compilation was enabled. This evidence prioritizes runtime execution and scheduling ahead of simply enlarging the heap or code cache.

Benchmark a compatible optimizing GraalVM runtime in a separate environment, including cold-start cost, steady CPU, native memory and the existing 512 MiB service ceiling. Preserve the shared TypeScript kernel and isolated per-room contexts. Also evaluate reusing a system-owned `Engine` and cached `Source` across contexts, and warming a representative kernel before admitting matches. [GraalVM's embedding documentation](https://www.graalvm.org/jdk24/reference-manual/embed-languages/) describes the runtime-compilation requirements. No Java runtime or production JVM flag was changed by this audit.

### 3. Measure queueing and allocation before larger protocol changes

`serverUpdateMs` starts at the room tick and ends before the final socket write. It does not describe all timer lateness, command-lock wait or client arrival. Add separate measurements for scheduled-tick lateness, room-lock wait, kernel advance, snapshot serialization and socket flush. Keep acknowledgement metrics scoped to epoch and active combat when evaluating input responsiveness.

After removing the TCP stall and validating the runtime, measure whether 60 Hz full JSON snapshots still dominate CPU, allocation or egress. A compact snapshot/delta format with periodic full recovery snapshots is a possible next step. Preserve generation/epoch checks, latest-only states, reliable events and authoritative input counters. Do not lower snapshot frequency or rewrite the architecture without measuring the latency tradeoff.

## Final stability and socket comparison

The new release completed 900.03 seconds with four clients in two simultaneous rooms. Each client received 49,847–50,083 snapshots, with no unexpected socket closes or protocol errors. Damage, reserve progression and matching event IDs passed: the peers observed 3,188 matching unique events in the 1v1 room and 3,051 in the 3v3 room. Temporary rooms were explicitly left before starting the independent socket comparison.

The maximum sampled service memory was 314.8 MiB. Mean service CPU over this instrumented run was 0.815 cores. These figures include the profiling/warm-up interval. The run's aggregate RTT p95 was 183–251 ms and included multi-second profiling-period outliers; reporting only its approximately 50 ms median would conceal those stalls. Use the clean, warmed comparison below to assess the TCP setting.

A separate warmed test used the same four connections in two rooms, with a 35-second preparation/warm-up period followed by three 30-second phases. Players sent only alternating movement inputs, so this is a transport comparison rather than a combat-throughput benchmark. No profiler or archive transfer ran during it.

| Client-observed metric                               | Original setting | Temporary TCP_NODELAY | Original restored |
| ---------------------------------------------------- | ---------------: | --------------------: | ----------------: |
| RTT p50 across four clients                          |     48.8–50.8 ms |           8.4–10.0 ms |      48.3–50.5 ms |
| RTT p95                                              |     52.1–54.4 ms |          10.6–13.2 ms |      51.0–54.1 ms |
| Snapshot arrival gap p95                             |     57.6–58.2 ms |          18.4–18.6 ms |      57.7–58.0 ms |
| Input send → receipt observed in returned state, p95 |     64.6–65.9 ms |          26.6–28.3 ms |      63.7–64.7 ms |
| Server update work p95                               |     2.34–2.41 ms |          1.88–2.46 ms |      1.96–2.67 ms |

All four clients remained connected without protocol errors. Restoring the option restored the delay, while server processing stayed in a similar range. This reversal provides stronger evidence than comparing independent releases: the backend socket buffering accounts for approximately 40 ms of avoidable client-observed delay in this setup. It is the first optimization to implement and verify in application code.

These changes affected only the verification connections. The final phase restored their original setting, and all verification sessions explicitly left. The fetched application, listener defaults, service configuration and Java runtime remain unchanged. The server remains available for normal play.

## Rollback

Use `ssh alicloud 'sudo bash /opt/mygo-fighter/rollback.sh'` to restore the retained protocol-10 release. Switching releases ends temporary matches; both players must refresh to use the restored protocol.
