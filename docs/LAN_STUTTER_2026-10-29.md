# LAN combat stutter — 2026-10-29

Two-player LAN combat reproduced long browser pauses on both peers. The fix keeps decoded artwork available before combat, coalesces obsolete authority snapshots at the display boundary, and removes repeated target-array allocation from the shared kernel. Character art, animation, effects, input bindings, transport frequency and protocol 23 are preserved.

## Evidence and changes

The baseline was `cfb6700`. A production build served by an isolated Scala server on port 8082 drove two Edge browser contexts at 1280 × 800, DPR 1.5. Anon and Sakiko repeatedly moved and used J/K/U/O with terrain enabled, 2000 HP, unlimited time/energy and sound off. Each condition had six seconds of warmup and twelve seconds of measurement, first native speed and then 4× CPU throttling. No other combat benchmark ran concurrently.

The server's independent 30-second two-peer WebSocket check delivered approximately 57.8 snapshots/second/client; its final ten seconds had update p95 2.30 ms and p99 2.94 ms. Browser instrumentation located the long pauses inside native `drawImage`, rather than sprite-cache construction or normal snapshot replay. Bypassing the sprite cache and disabling image shadows did not remove the pauses. Retaining decoded `ImageBitmap` surfaces did, so removing effects or lowering source resolution was unnecessary.

- `CanvasRenderer` decodes images and creates retained bitmaps during battle preparation. Unsupported or rejecting bitmap creation falls back to the existing HTML image. The two-load concurrency limit remains; old unused images are trimmed against the existing 384 MiB target, with required current/reserve art protected. Eviction and disposal close bitmap resources, including loads completing after disposal.
- `PendingSimulationState` keeps the latest authority for the next display frame rather than cloning/replaying each old snapshot after a stall. Reliable events are merged, deduplicated and ordered; their existing two-second presentation window bounds background-tab storage. Epoch/generation and disconnect/lobby/start/dispose boundaries clear pending state. Arrival timestamps and acknowledgement/wire diagnostics stay at packet receipt, preserving stale detection. Authoritative HUD values remain separate from prediction. Healthy clients can defer applying a packet until the next display frame; local input prediction continues each frame.
- `Match.targetSide` directly selects the sole opponent in two-player modes and scans active opponents without allocating/sorting in three-player combat. In the Node microbenchmark, median 48,000-step time fell from 355.74 to 312.79 ms; 6,000 full simulation frames fell from 537.68 to 473.11 ms. These are kernel measurements, not browser FPS or JVM throughput claims. Exact state/event comparison covered 144,000 steps, 5,776 full-state checkpoints and all 16 characters in 24 seeded two-/three-player scenarios.

## Production-build comparison

Values show peer 0 / peer 1. Long tasks are browser tasks of at least 50 ms, counted only during the measurement window.

| Metric                   | Before             | After          |
| ------------------------ | ------------------ | -------------- |
| Native maximum draw      | 523.8 / 557.3 ms   | 7.0 / 11.3 ms  |
| Native long tasks / 12 s | 21 / 16            | 0 / 0          |
| Native maximum frame gap | 524.5 / 613.1 ms   | 72.8 / 72.8 ms |
| Native replay p95        | 0.4 / 0.5 ms       | 0.3 / 0.3 ms   |
| 4× CPU maximum draw      | 2078.7 / 2777.6 ms | 44.3 / 29.8 ms |
| 4× CPU frame-gap p95     | 137.6 / 2669.1 ms  | 24.1 / 18.3 ms |
| 4× CPU replay p95        | 7.3 / 11.8 ms      | 2.4 / 1.8 ms   |
| 4× CPU long tasks / 12 s | 6 / 6              | 1 / 0          |

After both conditions, both clients retained render scale 2 (1920 × 1080 backing surface); the baseline had degraded to scales 1 / 1.5 at native speed and 1 / 1 under throttling. No page errors occurred. The improvement therefore does not rely on reducing visual quality. Native local input-to-visible-motion p95 was 7.5 / 8.3 ms after versus 26.4 / 8.4 ms before; combat freezes and synthetic alternating actions make this a smoke measurement rather than an isolated network latency benchmark.

This is one controlled local browser trial, not a guarantee for every device or campus network. Bitmap retention trades a stable decoded working set for avoiding repeated decode stalls; it is not claimed as a memory reduction. The existing image budget and explicit release bound retained old art, while a selected team's required art can exceed that target. The test did not measure WAN RTT improvement or maximum room capacity. Sound/video decoding and long-session mobile behavior need separate measurements if those remain slow.

## Verification

`npm run check`, `npm run build` and `npm run build:pages` passed. A browser served under `/mygo-fighter/` loaded all requested resources, entered local combat, moved, attacked, paused and returned to the menu without page errors; its 21 canvas images were retained bitmaps.

Three real browser peers also passed preparation, third-player predicted movement with authoritative input acknowledgement, pause/resume, disconnect-induced pause, session restore and resume. A real J attack under the one-hit-KO test rule triggered a reserve after approximately five seconds. All three peers presented the same five attack/hit/fight/KO/respawn events without duplicates, with no page errors. This scenario used three mirrored `[0, 1, 2]` teams; its 26 retained images represented 204.43 MiB of decoded pixels per client, not a measurement for nine distinct characters.

Raw scripts and reports live under ignored `output/lan-stutter/`, `output/brawl/` and `output/performance-kernel/`. Permanent checks cover latest-state/event/lifecycle semantics and bitmap fallback/release, alongside the existing combat, three-player and protocol checks. Restart the host after updating so its shared simulation and the clients use the same build; refresh both browsers.
