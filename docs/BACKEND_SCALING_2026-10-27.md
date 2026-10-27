# Backend room scaling — 2026-10-27

This update reduces server work per battle and removes most paused/lobby clock work. It preserves the Scala server, per-room restricted GraalJS contexts, shared TypeScript combat rules, all assets and protocol 15. The server still targets 100 fixed combat steps and 60 active snapshots per second.

## Changes

- Active room scheduling retains a monotonic 120 Hz deadline. Missed deadlines are skipped rather than accumulated into an unbounded timer backlog; kernel catch-up remains capped at 50 ms.
- Lobby, paused and fully settled matches use a 250 ms idle interval. A bounded wake queue interrupts idle sleep on room/control changes. Busy room locks retry at active cadence, and control changes force the next state publication. The complete final KO/countdown runs before sleeping.
- Active ticks use ordinary sleeps, not a pair of newly raced fibers every tick. Idle waits alone race their wake queue.
- Disconnected rooms skip snapshot serialization. Returning to the lobby closes the private context and clears each peer's retained state frame. Existing two-minute abandoned-room cleanup and explicit-leave cleanup remain intact.
- A room constructs each immutable WebSocket state/event frame once and shares it between peers. Latest-only states, bounded reliable events, room ownership and reconnect barriers remain intact.
- Each simulation resolves its immutable Polyglot call targets once. Skill resolution builds a form's skill scheme only when a skill button is actually pressed; movement and normal-attack steps avoid that allocation.
- Client prediction understands the lower paused/result snapshot cadence. It still uses the original short horizon during combat, stops extrapolating a settled match, and continues to detect missing idle traffic and socket disconnection.

## Same-machine comparison

Baseline: application `c184e45`. Windows, Intel Core Ultra 9 185H (16 cores / 22 logical processors), Microsoft OpenJDK 21.0.12.1, interpreted GraalJS. Both runs use the existing development JVM settings (`-Xms256m -Xmx2g`). Each starts a fresh backend on the isolated port 8181, with eight rooms / sixteen WebSocket clients, 30 seconds of combat warm-up, 30 seconds measured combat, 10 seconds paused, then 10 seconds in the lobby. Clients alternate movement and attacks at 20 inputs/second; peers receive identical event ID sequences. This is a short loopback workload, not an Internet or production-host capacity guarantee.

| Metric | Baseline | Updated |
| --- | ---: | ---: |
| Mean battle CPU, logical cores | 1.302 | 1.045 |
| Mean paused CPU, logical cores | 0.668 | 0.078 |
| Mean lobby CPU, logical cores | 0.375 | 0.147 |
| Paused snapshot traffic over 10 s, all clients | 27,260,286 B | 2,101,758 B |
| Battle server update work p95 | 1.84 ms | 1.74 ms |
| Battle snapshot arrival gap p95 | 27.08 ms | 29.37 ms |
| Input send → receipt observed in returned state p95 | 23.67 ms | 29.16 ms |
| Battle peak process working set | 434.9 MiB | 482.9 MiB |
| Protocol errors / divergent peer event sequences | 0 / 0 | 0 / 0 |

The observed CPU reductions were approximately 20% active, 88% paused and 61% lobby; paused snapshot traffic fell approximately 92%. The full-process working set did **not** decrease in the selected run, and input/snapshot delivery p95 was higher. These measurements do not establish lower end-to-end latency or lower resident memory. The changes reduce CPU/temporary allocation pressure; GC, scheduling, workload and runtime warm-up still affect process memory and delivery timing. No claim is made that the reduced server-update time is an equivalent Internet ping improvement.

## Allocation measurement

A separate single-thread JVM probe runs the old and new bundled kernels with identical characters, inputs and 6,000 fixed steps / 3,000 snapshots per pass. Each fresh JVM uses `-Xms64m -Xmx256m`; pass zero warms the runtime, and `ThreadMXBean.getThreadAllocatedBytes` measures passes one and two. Serialized output character counts match.

| Warm pass | Baseline elapsed / allocated | Updated elapsed / allocated |
| --- | ---: | ---: |
| 1 | 957.44 ms / 506.77 MiB | 867.95 ms / 460.72 MiB |
| 2 | 971.18 ms / 506.76 MiB | 861.33 ms / 460.70 MiB |

This is about 9% less temporary allocation in this kernel workload. Allocated bytes are cumulative allocations, not live heap or resident memory saved. These figures isolate skill-resolution work and do not include the WebSocket shared-frame savings or idle-room savings.

## Capacity and lifecycle checks

A further short run used sixteen simultaneous rooms / thirty-two clients, with the same 30-second measured combat window. It received 57,844 battle snapshots with zero protocol errors and matching peer event IDs in all sixteen rooms. Battle update work p95 was 1.96 ms, arrival gap p95 28.56 ms, and input receipt p95 26.19 ms. Mean battle CPU was 3.54 logical cores and peak working set 493.2 MiB. Setup respected existing admission limits; it did not bypass them. This workstation result does not validate sixteen rooms on a two-vCPU/512 MiB public service.

Additional checks passed:

- 17,600 exact serialized state/event checkpoints across all sixteen characters against the baseline kernel, including pause/restart.
- Full 1v1 and 3v3 final KO/countdown completion, idle result state and restart; 132 directional skill cases and 88 three-hit combo cases.
- Real JVM 3v3 through all three defeated reserves, matching final results, twenty pause/resume cycles, reconnect with retained fighters, and silent-peer timeout. Pause publication p95 was 45.6 ms and resume 33.6 ms in that separate local lifecycle run.
- Two real browser clients complete bans/picks, enter 3v3, pause without false connection warnings and resume.
- Production build under `/mygo-fighter/`, all fifteen stages, movement and no browser/resource errors.
- `npm run check`, `npm run build`, `npm run check:backend`, `npm run build:pages`.

Temporary harnesses, raw reports and screenshots are under ignored `output/server-performance/`; no removed test directory was restored.

## Rollout and room limits

Update/restart the backend and refresh clients to obtain both scheduling and idle-prediction changes. The ordinary LAN default remains `MAX_ROOMS=20`; this is an admission ceiling, not a promise of twenty simultaneous battles. CPU saturation and memory should be measured on the actual host before increasing its configured limit. The previously documented public services use an explicit two-room/512 MiB budget; this code change does not alter or deploy those services, their limits or their JVM configuration.
