# Gameplay performance and protocol 11

The current protocol is 15. It retains the performance/transport changes below and the subsequent combat/map changes. Update and restart the host with matching clients. The [backend room scaling audit](BACKEND_SCALING_2026-10-27.md) covers idle-room scheduling, shared frames and allocation reduction without a wire-schema change.

## Implemented optimizations

### Canvas rendering

- The logical scene remains 960 × 540. Backing resolution is capped by device pixel ratio and adapts through 1, 1.25, 1.5 and 2. Sustained draw cost above 12 ms or frame cadence above 24 ms lowers quality; recovery requires 240 healthy frames below both 4 ms draw cost and 20 ms frame cadence. Frame-pressure feedback is necessary because cached canvases can defer native raster work beyond the JavaScript draw call.
- Fighter atlas frames are lazily pre-rasterized near their final device-pixel size. The LRU is limited to 64 entries and 8 Mi pixels (about 32 MiB of RGBA-equivalent pixels). Current frame anchors, animation and logical scale are preserved on every hit. Fighter, heavy-motion, dash and blink paths accept both native images and cached canvases.
- Image decoding remains limited to two concurrent loads during battle preparation. After preparation, inactive decoded images are trimmed to a 384 MiB budget when possible; art required by current fighters and reserves is never evicted.

### Online transport and reconciliation

- Protocol 11 removes the repeated two-second event history and duplicate top-level input counters from 60 Hz state packets. `inputState` is the canonical replay metadata.
- Nonempty event batches use the existing ordered, bounded control lane. State remains latest-only. Control overflow closes the socket to force the established pause/reconnect recovery instead of silently dropping presentation cues.
- The client holds event batches until generation, epoch and server time match a state, then consumes each event ID once. Prepare, lobby and reconnect transitions clear pending batches.
- Prediction retains its required pre-replay clone. The second authoritative clone in `GameRuntime` was removed.
- With `?diagnostics=1`, packet sizes are exact UTF-8 wire sizes, including attached event frames. Normal play performs no UTF-8 scanning or JSON re-serialization. `inputReceivedMs` and `inputAppliedMs` measure client send to authoritative receipt/application as observed in returned states; hit freeze can legitimately delay application. `serverUpdateMs` covers room/kernel processing and still excludes final socket write/arrival; an immutable frame cannot contain its own later write-completion time.

### Audio

- Unlocking audio no longer fetches and decodes all 112 clips. After critical images load, only cues reachable by selected fighters and reserves are warmed. Other cues load on first use.
- At most four clips load concurrently. Decoded PCM uses a 64 MiB LRU; active source nodes safely retain an evicted buffer. Pending loads obey existing stop, mute, pause, round and dispose cancellation behavior.

## Local measurements — 2026-10-26

Measurements use the production build and the same Playwright scenarios as the earlier audit. Raw reports are under the ignored `output/performance-audit/` and `output/optimization-validation/` directories.

| Scenario                              | Before                                                               | After                                                                            |
| ------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| SwiftShader DPR2, 10 s combat         | 1920 × 1080; callback mean 12.61 ms, p95 14.9 ms; frame p95 16.7 ms  | 1920 × 1080; callback mean 0.32 ms, p95 0.5 ms; frame p95 16.7 ms; no long tasks |
| SwiftShader DPR2 with 4× CPU throttle | 1920 × 1080; frame mean 59.7 ms, p95 66.7 ms; 175 long tasks in 10 s | adaptive 960 × 540; frame mean 19.8 ms, p95 33.4 ms; no long tasks in 12 s       |
| Two-client local online               | packet p50/p95 4,441/5,175 B; server update p95 0.842 ms             | packet p50/p95 3,612/3,650 B (−18.7%/−29.5%); server update p95 0.691 ms         |
| New authoritative input timing        | not measured                                                         | local send→received p95 17.3 ms; send→applied p95 23.8 ms                        |
| Selected two-character audio          | all 112 clips fetched/decoded on unlock                              | 12 clips fetched/decoded; peak concurrency 4; combat voices played               |
| Healthy hardware DPR2                 | full quality                                                         | full 1920 × 1080 retained; no long tasks                                         |

The software callback reduction is **not** presented as an equivalent total-CPU reduction. CPU profiles show native work moving from instrumented `restore`/`drawImage` spans into `(program)`; native raster remains substantial. The throttled frame-cadence result is the stronger end-to-end evidence that adaptive resolution improves playability under sustained pressure. The two online profiles also observed different display cadences, so local motion/correction timings are not claimed as protocol wins. These local results do not establish an Internet RTT improvement. The later protocol-12 AliCloud measurements are linked below.

## Verification

- `npm run check`
- `npm run build`
- `npm run check:backend`
- `npm run build:pages` and a project-subpath browser check
- Local 3v3 combat, pause/resume/restart
- Two-client combat, matching unique event IDs on both peers, no per-state event history, forced socket reconnect and continued events after resume
- Lazy-audio request/decode/concurrency checks with no browser page errors

## Deployed AliCloud audit

The [2026-10-26 deployment audit](DEPLOYMENT_PERFORMANCE_2026-10-26.md) covers the newer protocol-12 application, public timing, browser checks, an isolated TCP_NODELAY experiment and the interpreter-runtime bottleneck. Its measured socket-frame delays and client-observed round-trip timings are separate metrics.

## Permanent TCP_NODELAY and runtime evaluation

Application `9207f12` makes TCP_NODELAY permanent, shares the engine/source cache while retaining per-room contexts, and updates Polyglot libraries. The [2026-10-27 runtime evaluation](RUNTIME_OPTIMIZATION_2026-10-27.md) records the GraalVM comparison and why OpenJDK 21 remains selected on the 512 MiB service budget.
