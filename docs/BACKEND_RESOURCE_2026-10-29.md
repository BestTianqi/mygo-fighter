# Backend resource allocation — 2026-10-29

Baseline: `cc9a1dc`, protocol 24. The Scala service continues to run the same restricted, private GraalJS simulation per room. This change reduces temporary allocation in the bundled server kernel; it does not change room limits, combat timing or the wire protocol.

## Changes

- Snapshot serialization constructs its 31 fields directly rather than enumerating/copying the Match instance with object rest. The field list is checked against `Snapshot`. A permanent check compares every serialized own Match field with emitted snapshots, covering every character, two/three players, pause and restart.
- Input processing remains the baseline implementation after the input-reuse experiment was withdrawn.

## Isolated JVM measurements

The probes use the installed portable JDK 21, application GraalJS classpath, a private context and caller-thread `ThreadMXBean.getThreadAllocatedBytes`. Benchmarks ran serially, without concurrent service load. Allocation is cumulative temporary allocation, not retained heap or resident memory.

| Probe                                                         |     Before |      After |
| ------------------------------------------------------------- | ---------: | ---------: |
| Snapshot only, 12,000 packets                                 | 217.53 MiB | 179.99 MiB |
| Snapshot change alone, integrated 6,000 steps / 3,000 packets | 531.07 MiB | 523.03 MiB |
| Input experiment (withdrawn), integrated warm mean            | 531.19 MiB | 528.79 MiB |

The isolated snapshot path allocated 17.26% less, approximately 3,280 bytes saved per packet in this JVM. Snapshot-only warm elapsed runs were 292/296/276 ms before and 267/259/244 ms after. Integrated snapshot allocation dropped 1.51%; input-only integrated allocation dropped 0.45%. These separate percentages are not added or presented as a whole-service CPU or memory reduction. Input timing showed warm-up/order effects, so it is not used as a CPU improvement claim. The input change is not shipped.

Rejected alternatives included a generic key loop, which increased integrated allocation, and getters, which provided no benefit. A reusable mutable snapshot envelope saved only slightly more than the typed literal and was discarded in favor of the simpler implementation.

## Correctness evidence

- Snapshot transformation: 70,656 exact serialized packet/event checkpoints across all 16 characters and four formats, including actual KO, reserve entry, result, pause, restart and settled matches.
- Permanent `check-server-snapshots.mjs` runs in `npm run check` and verifies 1,280 complete snapshot states.
- Full check, production build, backend compile/format checks and Pages build passed. A browser served at `/mygo-fighter/` loaded resources, entered local combat, moved, attacked, paused and returned to the menu without errors.

## Service measurements and selection

Windows, portable JDK 21, interpreted GraalJS, `-Xms256m -Xmx2g`, port 8181. Each comparison used a fresh JVM and loopback clients with the existing admission limits, 2000 HP and unlimited time. Snapshots remain 60 Hz; simulation remains at its existing cadence. Other benchmark processes were withheld. Two peers per room alternated movement and attacks at 20 inputs/second; all paired reliable event ID sequences matched and no protocol errors occurred.

An initial single-room then eight-room trial tested both optimizations together (10/30 seconds warmup and combat, then paused/lobby phases). In the eight-room combat window mean CPU was 1.101 -> 1.282 logical cores and peak working set 437.4 -> 507.1 MiB. Despite lower isolated allocation, these results did not support shipping the combined variant. The input-reuse change and its allocation-specific tests were withdrawn.

A second matched pair started fresh JVMs directly with eight rooms, twenty seconds warmup and twenty seconds measured combat, followed by five-second paused/lobby phases. It compared baseline against **only the snapshot literal**, which is the final implementation:

| Eight-room combat metric                     |   Baseline | Final snapshot-only |
| -------------------------------------------- | ---------: | ------------------: |
| Mean CPU, logical cores                      |    1.23685 |             1.16590 |
| Peak working set                             | 449.73 MiB |          454.54 MiB |
| Server update work p95                       |  1.7908 ms |           1.7722 ms |
| Snapshot arrival gap p95                     | 25.1590 ms |          26.2999 ms |
| Input send-to-receipt p95                    | 21.6117 ms |          23.1623 ms |
| Combat packets received, all peers           |     19,254 |              19,284 |
| Protocol errors / mismatched event sequences |      0 / 0 |               0 / 0 |

This pair observed about 5.7% less active CPU. Resident memory was about 1.1% higher, so no retained-memory reduction is claimed. The delivery p95 increased by roughly 1-1.6 ms in this loopback run; this is not a network-latency improvement claim or a capacity guarantee. Short-run GC/warmup and workload variation affect these service numbers; the isolated allocation measurement is the more reproducible benefit. Initial harness phases called `empty` also include room setup and must not be used as idle measurements. A separate post-cleanup baseline sample reported 0 CPU at one-second sampling with no rooms left.

Raw probes, JVM logs and service measurements are in ignored `output/backend-reduce/`. The probes establish behavior and allocation for the tested workload; actual server resident memory remains affected by GC, runtime warm-up and room working sets.
