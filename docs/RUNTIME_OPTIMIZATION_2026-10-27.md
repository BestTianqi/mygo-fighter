# TCP_NODELAY deployment and GraalVM evaluation — 2026-10-27

## Selected application

Application commit `9207f12` makes TCP_NODELAY permanent and shares a cached Polyglot `Engine` and `Source` across rooms. Each room retains its own restricted `Context`, serialized access and independent match state. Contexts close on normal disposal and failed initialization; the shared engine closes with the application. Startup logs identify the actual runtime implementation.

Polyglot and community JavaScript libraries are updated from 24.2.2 to 25.0.5.0.2. They passed compilation and execution on OpenJDK 21, which remains the production runtime. No JVMCI or GraalVM tuning flags were added to the production service. The existing 512 MiB memory ceiling and two-room capacity remain unchanged.

The release includes the newer menu and character-selection changes from `cdf65b2`, fetched and merged before packaging. The shared battle rules and protocol remain version 12.

| Deployment item    | Value                                                              |
| ------------------ | ------------------------------------------------------------------ |
| Public game        | <https://mygo-123-57-149-254.sslip.io/>                            |
| Active release     | `20261027-9207f12-protocol12`                                      |
| Application commit | `9207f12`                                                          |
| Archive SHA-256    | `6baff854bdf5921199f06fbc273d42ae4377da8eb3399d52488b84abf974a8e3` |
| Production Java    | OpenJDK 21.0.12.1                                                  |
| Previous release   | `20261026-b82ae8c-protocol12`                                      |

The uploaded checksum matched before activation. The running process was verified to use `/usr/lib/jvm/java-21-openjdk-amd64/bin/java`. Reading the live accepted socket options after restart confirmed `TCP_NODELAY=1` on all 30 observed backend connections. This setting comes from the application builder, rather than a temporary socket modification.

## GraalVM comparison

The isolated benchmark used the same backend candidate for all three configurations on the AliCloud host. Separate temporary service units enforced the same 512 MiB memory ceiling, disabled service swap and limited tasks to 96. Four portable Node clients on that host exercised simultaneous 1v1 and 3v3 rooms through loopback port 8181. That port was never opened publicly. CPU and memory samples came from the backend service's cgroup; the checker ran outside it.

The original workstation-driven attempt was discarded after its connection was interrupted. The reported comparison uses server-side clients and no sampling profiler during its measurement windows. Each measured window lasted 120 seconds. OpenJDK and default GraalVM had a 60-second active warm-up; the bounded GraalVM case received 120 seconds. These are finite startup/load windows, rather than proof of asymptotic fully warmed JIT performance.

Oracle's official download endpoint returned GraalVM 25.0.4+7.1, with archive SHA-256 `76007c309f821aaf435bce63162ea0395587fc77350801c81643fe7feea37276`. That exact build was tested. With the old 24.2.2 Polyglot library, Java 25 fell back to interpretation because its version was incompatible. The updated library passed the runtime version checks without bypass flags and reported `Oracle GraalVM`.

| Measured result                   |   OpenJDK 21 |       Default GraalVM |                                Bounded GraalVM |
| --------------------------------- | -----------: | --------------------: | ---------------------------------------------: |
| Mean backend CPU, logical cores   |        0.744 |                 1.656 |                                          1.618 |
| Peak service memory               |    317.0 MiB | approximately 512 MiB |                                      507.8 MiB |
| Snapshots per client              |  7,144–7,158 |           3,843–4,955 |                                    7,151–7,161 |
| Server update work p95            | 3.56–3.69 ms |          6.89–8.32 ms |                                   3.06–3.46 ms |
| Unexpected closes in measured run |            0 |                     3 |                                              0 |
| Service outcome                   |       Passed | Delivery check failed | Memory-limit kill after the measurement window |

The default case used the existing 64/256 MiB Java heap and 64 MiB code-cache settings. The bounded case used:

```text
-Xms64m -Xmx160m -XX:ReservedCodeCacheSize=96m
-XX:-UseJVMCICompiler -XX:+EnableJVMCI
-Dlibgraal.Xmx=128m -Dpolyglot.engine.CompilerThreads=1
--enable-native-access=ALL-UNNAMED
```

The bounded case retained HotSpot's compiler for Java/Scala while allowing Graal compilation of guest JavaScript. It passed its short client delivery checks, but subsequent service monitoring caught an OOM kill at 06:44:49 Asia/Shanghai. The checker finishing successfully was therefore insufficient grounds to promote it.

The optimizing runtime was real: a separate diagnostic trace recorded 71 completed optimization events, including methods from `simulation.js`. Deterministic scenarios covered all 16 characters over 12,800 fixed simulation steps. Node, OpenJDK and GraalVM produced the same checkpoint/event digest:

```text
e316a8c505dcfb71267ebcb5ae25fb8a71889312fc42d9d34c4ea298254e14b0
```

GraalVM was not promoted. In the tested workload it consumed more than twice the CPU, left inadequate memory headroom and, in the bounded case, was eventually killed by the service memory limit. The small reduction in update-work p95 did not justify those costs. This result concerns these configurations on this two-vCPU host; it does not establish that every GraalVM configuration or a larger host would perform the same way. See [GraalVM's embedding documentation](https://www.graalvm.org/latest/reference-manual/embed-languages/) for runtime compilation and engine/source sharing, and [the official downloads page](https://www.graalvm.org/downloads/) for distributions and checksums.

## Cold-start investigation

Cold browser checks still exposed substantial first-match JVM warm-up even after the TCP stall was removed. A prototype ran deterministic, isolated combat warm-up across the roster before binding HTTP. It completed in 21.3 seconds and stayed within memory limits, but its first 30-second four-client check delivered only 751–884 snapshots per client, with server-update p95 around 15.6–16.2 ms. It failed the delivery criterion and was removed before the selected release was finalized. No warm-up API or startup delay from that prototype is deployed.

Cold first-match behavior remains a limitation. Do not infer that TCP_NODELAY fixes compilation/scheduling stalls, or confuse READY, round-transition and hit-freeze delays with transport latency. Further work should isolate cold compilation and scheduler pressure before introducing another warm-up policy or changing runtime/memory budgets.

## Verification

Passed `npm run check`, `npm run check:backend`, `npm run package:server` (including `npm run build`) and `npm run build:pages`. The Pages build loaded and played under `/mygo-fighter/`, with no failed resource responses or browser console errors. All 279 public runtime media paths passed manifest, content-range and cache-header checks.

Two isolated public browser contexts created/joined a room, selected characters, dealt damage, paused/resumed, refreshed the guest and resumed the retained session. The guest reached 110 HP and its session survived refresh. No JavaScript page exceptions or browser console errors were observed. These cold functional checks are not presented as clean latency benchmarks.

The selected production release completed 900.68 seconds with four clients in two simultaneous rooms through public HTTPS/WSS, following 60 seconds of active warm-up. The checker ran on the AliCloud host and reached the public hostname with normal certificate validation. Its RTT is therefore not used as a measurement of the development machine's WAN path.

Each client received 53,900–53,940 snapshots. There were no unexpected disconnects, protocol errors or service restarts. Damage, 3v3 reserve progression and matching event IDs passed: peers observed 3,541 matching unique events in the 1v1 room and 3,328 in the 3v3 room. Mean backend CPU was 0.687 logical cores, peak service memory was 290.5 MiB, and server-update work p95 was 2.45–2.87 ms.

All four verification sessions explicitly left their rooms afterward. A separate 60.07-second four-client combat measurement from the development machine then passed, with no unexpected closes or protocol errors:

| Client-observed WAN metric                           | Earlier original-setting control | Deployed `9207f12` |
| ---------------------------------------------------- | -------------------------------: | -----------------: |
| RTT p50                                              |                     48.8–50.8 ms |         8.9–9.6 ms |
| RTT p95                                              |                     52.1–54.4 ms |       16.4–20.0 ms |
| Snapshot arrival gap p95                             |                     57.6–58.2 ms |       19.1–19.6 ms |
| Input send → receipt observed in returned state, p95 |                     64.6–65.9 ms |       29.5–32.0 ms |
| Server update work p95                               |                     2.34–2.41 ms |       3.64–3.75 ms |

The earlier control used alternating movement, while the deployed run used combat and occurred later. These are observed operating results, not a claim that every difference comes from one code change. The preceding same-connection off/on/off experiment in [the earlier audit](DEPLOYMENT_PERFORMANCE_2026-10-26.md) supplies the stronger causal evidence for removing the approximately 40 ms transport stall.

The WAN sample received 3,674–3,676 snapshots per client. Its sessions also explicitly left, freeing both rooms. Cold-start measurements and intentional gameplay freezes are excluded from any claim about improved warmed transport latency.

Raw scripts, reports and compiler traces are under ignored `output/runtime-optimization/`; screenshots are under `output/playwright/`. No removed test suite was restored. Runtime comparison units were temporary; production continues to use the original Java/service memory configuration.

## Operations

`deployment.json` in the active release records the application commit, archive checksum, selected runtime and verification state. Health remains available at `/api/health`. Restore the previous application with:

```sh
ssh alicloud 'sudo bash /opt/mygo-fighter/rollback.sh'
```

Switching versions ends temporary matches. A later documentation-only commit does not change the application artifact or its recorded application commit.
