# LAN protocol and performance

## Timing

- The combat rules advance in fixed **10 ms** steps.
- The Scala scheduler wakes at a target **120 Hz**, passing monotonic elapsed time into the kernel. A stalled iteration catches up at most 50 ms, preventing an unbounded catch-up spiral.
- A room lock held by setup or a command skips that room's clock iteration instead of stalling other rooms.
- Authoritative snapshots target **60 Hz**. Scheduling retains the fractional interval rather than accumulating timer drift.
- Native key and touch events send input immediately on one persistent WebSocket. Unchanged input is refreshed every 250 ms. Input changes do not wait for an HTTP response.
- Local prediction renders between snapshots. Rendering uses `requestAnimationFrame`, independently of React's HUD updates. Prediction stops after 100 ms without a fresh snapshot.
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

Connect to `/ws`, then send `{"type":"authenticate","token":"..."}`. Authentication resolves a trusted session before attaching the socket. A socket has five seconds to authenticate. Subsequent input packets are checked against the currently attached peer, so a replaced socket cannot continue controlling a player.

Client messages are `authenticate`, `input` and `ping`. Server messages are `room`, `prepare`, `state`, `pong` and `error`. Input has an increasing safe-integer `seq` and an `input` object. Known actions, boolean directions and bounded press counters are normalized at the Scala boundary. Extra identity, health and action fields have no effect.

Both ready players receive a `prepare` message containing configuration and a generation. Both must acknowledge that generation after preloading images. The server then creates the authoritative match. Late loading acknowledgements cannot start an outdated match.

A state message includes the generation, authoritative state, events, acknowledged input sequences and remote inputs for prediction. Events are presentation cues; state is authoritative. Slow clients may miss a presentation cue when stale snapshots are replaced, while the next state still contains the current battle outcome.

## Failure behavior

Closing a socket releases inputs and pauses the match. A silent peer is considered disconnected after three seconds without traffic. Reconnection replaces the peer, sends its current configuration and retains the paused match. The browser stores the session in tab-scoped session storage so a refresh can reconnect. Explicit leave removes it.

Returning to the lobby closes the old simulation context and increments the generation. Room errors return that room to the lobby. Empty rooms are removed on leave; inactive rooms and their sessions expire after 30 minutes. Shutdown closes every simulation context.

The server is intended for a trusted local network. It has temporary room sessions rather than an account system, and plain HTTP on the default LAN deployment.

## 3v3 relay

The host selects `format` (`1v1` or `3v3`) in the lobby. Each player submits an ordered `team` array through ChooseRoomMessage. Teams contain distinct character IDs (0–14), with one or three required before ready. Partial teams can be edited, but cannot ready. Any selection or rule change clears both ready flags and increments the generation. Only the host can change format, arena or terrain.

The prepare configuration includes both teams and the format; clients preload all six fighters and forms. The shared server simulation advances the defeated side after the finish animation, retains the surviving fighter’s HP and energy, and ends only when one team is exhausted. Snapshots carry team indices, reserves and the current fighters. Restart resets both teams; returning to the lobby preserves selections for editing and clears readiness. Reconnect restores the existing authoritative match and its team progression.

Run `node tests/lan-relay.mjs` for combat carry-over/relay packet checks. After `node scripts/build-simulation.mjs`, run `sbt "Test / runMain services.rooms.RelayRoomCheck"` from `backend/` to exercise Scala room authorization, readiness, ordered teams, the loading barrier and GraalJS creation.

For the two-browser smoke test, start the normal local build with `npm run lan`, install Python Playwright with `python -m pip install playwright`, then run `python tests/lan_browser.py` from the repository root. Windows uses installed Microsoft Edge; on other systems first run `python -m playwright install chromium`. The test defaults to `http://localhost:8080`; set `MYGO_TEST_URL` to test another running server. It checks creation/joining, host-only rules, ordered teams, shared movement, pause/restart, reconnect and returning to the lobby, and saves both browser screenshots under `output/`.
