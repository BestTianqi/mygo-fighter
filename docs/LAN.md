# LAN protocol and performance

## Timing

- The combat rules advance in fixed **10 ms** steps.
- Each room owns a supervised **120 Hz** loop, passing monotonic elapsed time into the kernel. A slow room no longer holds up a global batch. Room removal signals its loop to stop; application shutdown cancels remaining loops. Expiry cleanup runs separately once per second. A stalled iteration catches up at most 50 ms, preventing an unbounded catch-up spiral.
- A room lock held by setup or a command skips that room's clock iteration instead of stalling other rooms.
- Authoritative snapshots target **60 Hz**. Scheduling retains the fractional interval rather than accumulating timer drift.
- Native key and touch events send input immediately on one persistent WebSocket. Unchanged input is refreshed every 250 ms. Input changes do not wait for an HTTP response.
- Local prediction restores authoritative snapshots and replays unconfirmed inputs through the same two-fighter kernel. Input receipt and application have separate acknowledgements. Pending quick taps survive hit freeze. Input history is bounded to two seconds / 600 entries; exhaustion resynchronizes from authority.
- Rendering uses `requestAnimationFrame`; routine HUD updates are limited to 30 Hz, with immediate lifecycle updates. Health and outcomes come from authority. Small corrections settle visually over 80 ms without moving collision boxes; corrections above 80 world units, teleports, knockouts and lifecycle boundaries snap.
- The prediction horizon is `clamp(smoothed RTT + 50 ms, 100 ms, 250 ms)`. Missing snapshots beyond it freeze prediction and show a warning. Pause, restart, new rounds and reconnection clear replay history.
- Only the latest unsent state is retained per peer. Control messages use a separate bounded queue. Large client-side socket buffers trigger reconnection rather than accumulating input lag.
- False buttons and zero counters are omitted from input packets. Images, audio and videos are served separately with immutable caching. Only selected battle atlases are loaded before a match.

TCP WebSockets can still delay later messages when a network packet is lost. Actual LAN latency depends on Wi-Fi contention, the host, device rendering and browser scheduling.

## HTTP operations

Public callers and Scala messages share these derived names:

| Message            | POST endpoint      | Identity                                    |
| ------------------ | ------------------ | ------------------------------------------- |
| CreateRoomMessage  | `/api/createroom`  | Creates session                             |
| JoinRoomMessage    | `/api/joinroom`    | Creates session                             |
| ChooseRoomMessage  | `/api/chooseroom`  | Trusted session; host controls stage        |
| ReadyRoomMessage   | `/api/readyroom`   | Trusted session                             |
| LoadedRoomMessage  | `/api/loadedroom`  | Trusted session and current generation      |
| PauseRoomMessage   | `/api/pauseroom`   | Trusted session; resume requires both peers |
| RestartRoomMessage | `/api/restartroom` | Host                                        |
| LobbyRoomMessage   | `/api/lobbyroom`   | Trusted session                             |
| LeaveRoomMessage   | `/api/leaveroom`   | Revokes session                             |

`GET /api/health` identifies the server and timing targets. HTTP bodies are limited to 8 KiB. Cross-origin browser requests are rejected. Tokens never appear in WebSocket URLs.

## Socket messages

Connect to `/ws`, then send `{"type":"authenticate","token":"...","protocol":3}`. Both ends reject incompatible versions with a reload message; deploy the UI and server together. Authentication resolves a trusted session before attaching the socket. A socket has five seconds to authenticate. Subsequent input packets are checked against the currently attached peer, so a replaced socket cannot continue controlling a player.

Client messages are `authenticate`, `input` and `ping`. Server messages are `room`, `prepare`, `state`, `pong` and `error`. Input has an increasing safe-integer `seq` and an `input` object. Known actions, boolean directions and bounded press counters are normalized at the Scala boundary. Extra identity, health and action fields have no effect.

Both ready players receive a `prepare` message containing configuration and a generation. Both must acknowledge that generation after preloading images. The server then creates the authoritative match. Late loading acknowledgements cannot start an outdated match.

A state message includes `protocol`, room `generation`, reconciliation `epoch`, monotonic simulation `tick`, server monotonic `time` in milliseconds, authoritative `state`, `acks` (applied sequences), `received` sequences, `inputs`, and the latched `inputState` needed for deterministic replay. Unlike `inputTick`, the simulation tick advances during hit freeze and ready/round transitions, and does not reset on restart. Epoch changes invalidate local prediction history within a generation. `serverUpdateMs` measures room update work through snapshot serialization; it excludes transport delivery.

Presentation events carry `{id, at, event}` and remain in snapshots for at most two seconds. Clients deduplicate within each epoch and skip expired events, including old snapshots arriving after a TCP stall. State remains latest-only; this recovers cues skipped by snapshot coalescing without an unbounded event queue. The kernel serializes once; Scala adds transport metadata without reparsing the state.

## Failure behavior

Closing a socket releases inputs and pauses the match. A silent peer is considered disconnected after three seconds without traffic. Reconnection replaces the peer, sends its current configuration and retains the paused match. The browser stores the session in tab-scoped session storage so a refresh can reconnect. Explicit leave removes it.

Returning to the lobby closes the old simulation context and increments the generation. Room errors return that room to the lobby. Empty rooms are removed on leave; inactive rooms and their sessions expire after 30 minutes. Shutdown closes every simulation context.

The server is intended for a trusted local network. It has temporary room sessions rather than an account system, and plain HTTP on the default LAN deployment.

## Diagnostics and repeatable checks

Add `?diagnostics=1` to the game URL to display rolling p95 frame times, correction distance, snapshot gaps/bytes, server update time, input-to-simulation-step delay and input-to-visible-motion delay. The same samples are exposed as `window.mygoDiagnostics` for the browser harness. Diagnostics are off by default. Motion samples can include legitimate attack recovery, obstruction or hit freeze; the browser acceptance check separately measures unobstructed movement before combat.

With the normal build and Scala server running:

```sh
node tests/lan_prediction.mjs
node tests/lan_protocol.mjs
node tests/lan_load.mjs optimized
python tests/lan_smooth_browser.py
```

The browser check needs Python Playwright and Chromium. Set `LAN_URL` to use a different server. Load tests run 1, 2 and 4 rooms at 20, 80 and 150 ms simulated RTT, with deterministic jitter and 250 ms FIFO stalls. `LAN_SAMPLE_MS` overrides the default six-second sample after warmup. Browser tests use two separate browser instances, exercise keyboard/touch, pause, restart and reconnect, and verify unobstructed movement within two display frames. Results and screenshots are ignored under `output/lan-check/`. These are application-level delay simulations, not measurements of real internet packet loss or public-hosting capacity.

The deterministic prediction trace compares the old overwrite algorithm against reconciliation using identical inputs and network timing; it is not a second full build benchmark. The real-server `baseline` report was captured before these changes. On an Apple M4 Pro (14 cores), four-room p95 snapshot delivery gaps remained about 24 ms under injected jitter, similar to one room; p95 server update work was approximately 1.0–1.1 ms. Reconciliation reduced maximum correction distance in all three synthetic traces; p95 correction distance improved at 80 ms and was effectively unchanged at 20/150 ms. Retaining events and replay metadata increased typical combat snapshots from about 2.8 KB to 5.1 KB. This intentionally trades bandwidth for recovery of cues; it is not a bandwidth reduction claim or a guarantee for slower hosts.

## 3v3 relay

The host selects `format` (`1v1` or `3v3`) in the lobby. Each player submits an ordered `team` array through ChooseRoomMessage. Teams contain distinct character IDs (0–14), with one or three required before ready. Partial teams can be edited, but cannot ready. Any selection or rule change clears both ready flags and increments the generation. Only the host can change format, arena or terrain.

The prepare configuration includes both teams and the format; clients preload all six fighters and forms. The shared server simulation advances the defeated side after the finish animation, retains the surviving fighter’s HP and energy, and ends only when one team is exhausted. Snapshots carry team indices, reserves and the current fighters. Restart resets both teams; returning to the lobby preserves selections for editing and clears readiness. Reconnect restores the existing authoritative match and its team progression.

Run `node tests/lan-relay.mjs` for combat carry-over/relay packet checks. After `node scripts/build-simulation.mjs`, run `sbt "Test / runMain services.rooms.RelayRoomCheck"` from `backend/` to exercise Scala room authorization, readiness, ordered teams, the loading barrier and GraalJS creation.

For the two-browser smoke test, start the normal local build with `npm run lan`, install Python Playwright with `python -m pip install playwright`, then run `python tests/lan_browser.py` from the repository root. Windows uses installed Microsoft Edge; on other systems first run `python -m playwright install chromium`. The test defaults to `http://localhost:8080`; set `MYGO_TEST_URL` to test another running server. It checks creation/joining, host-only rules, ordered teams, shared movement, pause/restart, reconnect and returning to the lobby, and saves both browser screenshots under `output/`.
