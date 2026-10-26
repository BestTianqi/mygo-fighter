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

| Message            | POST endpoint      | Identity                                      |
| ------------------ | ------------------ | --------------------------------------------- |
| CreateRoomMessage  | `/api/createroom`  | Creates session                               |
| JoinRoomMessage    | `/api/joinroom`    | Creates session                               |
| ChooseRoomMessage  | `/api/chooseroom`  | Trusted session; host controls stage          |
| ReadyRoomMessage   | `/api/readyroom`   | Trusted session                               |
| LoadedRoomMessage  | `/api/loadedroom`  | Trusted session, generation and attached peer |
| PauseRoomMessage   | `/api/pauseroom`   | Trusted session; resume requires both peers   |
| RestartRoomMessage | `/api/restartroom` | Host                                          |
| LobbyRoomMessage   | `/api/lobbyroom`   | Trusted session                               |
| LeaveRoomMessage   | `/api/leaveroom`   | Revokes session                               |

`GET /api/health` identifies the server and timing targets. HTTP bodies are limited to 8 KiB. Cross-origin browser requests are rejected. Tokens never appear in WebSocket URLs.

## Socket messages

Connect to `/ws`, then send `{"type":"authenticate","token":"...","protocol":9}`. Both ends reject incompatible versions with a reload message; deploy the UI and server together. Authentication resolves a trusted session before attaching the socket. A socket has five seconds to authenticate. Subsequent input packets are checked against the currently attached peer, so a replaced socket cannot continue controlling a player.

Client messages are `authenticate`, `input` and `ping`. Server messages are `room`, `prepare`, `state`, `pong` and `error`. Input has an increasing safe-integer `seq` and an `input` object. Known actions, boolean directions and bounded press counters are normalized at the Scala boundary. Extra identity, health and action fields have no effect.

Both ready players receive a `prepare` message containing configuration and a generation. Each prepare message also carries the currently attached `peerId`. Both must acknowledge that generation and their own peer ID after preloading images, including a resume after reconnect. The server then creates the authoritative match. Late loading acknowledgements cannot start an outdated match.

A state message includes `protocol`, room `generation`, reconciliation `epoch`, monotonic simulation `tick`, server monotonic `time` in milliseconds, authoritative `state`, `acks` (applied sequences), `received` sequences, `inputs`, and the latched `inputState` needed for deterministic replay. Unlike `inputTick`, the simulation tick advances during hit freeze and ready/round transitions, and does not reset on restart. Epoch changes invalidate local prediction history within a generation. `serverUpdateMs` measures room update work through snapshot serialization; it excludes transport delivery.

Presentation events carry `{id, at, event}` and remain in snapshots for at most two seconds. Clients deduplicate within each epoch and skip expired events, including old snapshots arriving after a TCP stall. State remains latest-only; this recovers cues skipped by snapshot coalescing without an unbounded event queue. The kernel serializes once; Scala adds transport metadata without reparsing the state.

## Failure behavior

Closing a socket releases inputs and pauses the match. The server considers a silent peer disconnected after three seconds without traffic. The browser independently reconnects after four seconds without any server message, or six seconds without server traffic while opening/authenticating. It detaches the old socket immediately rather than waiting for a failed close handshake. Retries back off from 250 ms to 3 seconds. Healthy heartbeat responses keep idle rooms connected.

Reconnection replaces the peer, clears that side's loaded flag, pauses the existing simulation even when the old socket has not yet closed, and sends its current configuration. An acknowledgement from a replaced peer cannot complete the new peer's loading. The resume acknowledgement is idempotent and never creates a new match. Continue and restart require both current peers to be connected and loaded; the UI shows the waiting state and disables Continue until then. Players explicitly resume the retained match once both are ready. The browser stores the session in tab-scoped session storage so a refresh can reconnect. Explicit leave removes it and cancels pending preparation/retry work; a late HTTP error cannot reopen the abandoned lobby.

Protocol 4 adds the current-peer loading barrier. After updating, the host must restart the backend and both browsers must refresh. Incompatible clients/servers, including an older backend's version error, display that instruction rather than silently disagreeing about resume readiness.

Protocol 5 adds Viola as character 15, expanding the roster to 16 characters. Room selection, team validation and the shared simulation all accept her. Older clients lack her move definitions and artwork, so the version check rejects mixed installations before play; restart the host and refresh both clients after updating.

Protocol 6 carries Taki's revised drum kit, including `rikiEightBoost` and the four-pulse super timing. An older client cannot animate that enhanced attack or predict its damage correctly; update the host and both browsers together.

Protocol 7 carries Rana's two-hit cat step, revised parfait trajectory, cheaper four-note solo and faster three-hit super. Older clients predict different timings and projectile paths; restart the host and refresh both browsers after updating.

Protocol 8 adds the server-owned ban/pick lobby. `RoomView.draft` is null in ordinary 1v1/3v3, or contains `bans`, `phase` (`ban`, `pick`, `complete`) and `turn` (0, 1 or null). The host enables it with `ChooseRoomMessage` fields `format: "3v3", draft: true`. Both teams are cleared; player 1 bans once, player 2 bans once, then they alternate six picks. Bans apply to both players and each picked character is exclusive across both teams. Each `ban` or `pick` command contains one character ID and cannot also change a team or room settings. The server validates the current turn, stage, both connections, character IDs and availability under the room lock. Ordinary modes retain mirrored opposing lineups.

Ban/pick completion gates readiness and the existing loading barrier; the ordered teams enter the unchanged 3v3 relay kernel. Socket replacement or browser refresh preserves the draft. Explicit reselect, an explicit player leave or the host's **重新禁选** action starts fresh. Map/terrain changes preserve bans and picks but clear readiness. Only the host changes modes, shared rules or resets the draft. Local audio preferences remain separate and are preserved when entering a network match. The lobby and local selection share square roster cards, character/form previews and ordered team slots; confirmations prevent an accidental click from committing a ban.

Protocol 9 adds synchronized character entrances. The existing ready phase lasts 2750 ms: 2100 ms of character-specific presentation followed by 650 ms of READY. `entrySides` is serialized with `phaseMs`; renderers derive pose, movement and effects from this shared clock rather than replaying a local event. Pause freezes it and a replacement socket resumes its current progress. A 3v3 survivor keeps HP/resonance and skips the entrance; only new reserves perform. Actual fighter coordinates, resource values and attack/hitbox state remain untouched until combat begins. Reduced-motion renderers show a static pose and label. Restart the host and refresh both browsers together after updating.

Returning to the lobby closes the old simulation context and increments the generation. Room errors return that room to the lobby. Empty rooms are removed on leave; inactive rooms and their sessions expire after 30 minutes. Shutdown closes every simulation context.

The default LAN deployment uses plain HTTP. Public deployments use a same-origin HTTPS proxy and the limits described in [WAN hosting](WAN.md). Both deployments use temporary room sessions rather than accounts. Rooms with no connected peers expire after two minutes; a reconnect within that window restores the existing session. The existing 30-minute inactivity expiry also applies.

## Diagnostics and verification

Add `?diagnostics=1` to the game URL to display rolling p95 frame times, correction distance, snapshot gaps/bytes, server update time, input-to-simulation-step delay and input-to-visible-motion delay. The same samples are exposed as `window.mygoDiagnostics` for browser inspection. Diagnostics are off by default. Motion samples can include legitimate attack recovery, obstruction or hit freeze; the former browser acceptance check separately measured unobstructed movement before combat.

Before changing the LAN protocol, run `npm run check`, `npm run build` and `npm run check:backend`. With the Scala server running, verify two clients creating/joining a room, selecting teams, completing the loading barrier, moving, pausing, restarting and reconnecting. Use `?diagnostics=1` to inspect frame timing and corrections during play. The former automated test suites have been removed; save local verification artifacts under the ignored `output/` directory.

Historical measurements from the earlier regression harness follow. The deterministic prediction trace compares the old overwrite algorithm against reconciliation using identical inputs and network timing; it is not a second full build benchmark. The real-server `baseline` report was captured before these changes. On an Apple M4 Pro (14 cores), four-room p95 snapshot delivery gaps remained about 24 ms under injected jitter, similar to one room; p95 server update work was approximately 1.0–1.1 ms. Reconciliation reduced maximum correction distance in all three synthetic traces; p95 correction distance improved at 80 ms and was effectively unchanged at 20/150 ms. Retaining events and replay metadata increased typical combat snapshots from about 2.8 KB to 5.1 KB. This intentionally trades bandwidth for recovery of cues; it is not a bandwidth reduction claim or a guarantee for slower hosts.

## 3v3 relay

The host selects `format` (`1v1` or `3v3`) in the lobby. Each player submits an ordered `team` array through ChooseRoomMessage. Teams contain distinct character IDs (0–15), with one or three required before ready. Partial teams can be edited, but cannot ready. Any selection or rule change clears both ready flags and increments the generation. Only the host can change format, arena or terrain.

The prepare configuration includes both teams and the format; clients preload all six fighters and forms. The shared server simulation advances the defeated side after the finish animation, retains the surviving fighter’s HP and energy, and ends only when one team is exhausted. Snapshots carry team indices, reserves and the current fighters. Restart resets both teams; returning to the lobby preserves selections for editing and clears readiness. Reconnect restores the existing authoritative match and its team progression.

When reviewing relay changes, verify host-only rules, ordered teams, readiness, survivor HP/energy carry-over, match completion and reconnect restoration with two browsers against the same server.

## Recovery verification — 2026-10-25

This update reproduced two failures before editing: a socket with no incoming traffic never entered reconnect, and the server accepted Continue while a replacement browser had not acknowledged its assets. Verification covered eight deterministic client lifecycle cases, a real-server 3v3 match with an actual KO and reserve fighter, rejection of early Continue and stale-peer acknowledgements, idempotent resume acknowledgement, and retained teams/HP/resonance. Two isolated real browsers also exercised movement, pause/restart, incoming-message blackout, automatic reconnect, refresh and returning to the lobby. A delayed loading request verified the visible wait message and disabled Continue button. The temporary harnesses and screenshots were subsequently cleaned up. Frontend/asset/build and Scala compilation/format checks remain required; keep future temporary verification output in the ignored `output/` directory.
