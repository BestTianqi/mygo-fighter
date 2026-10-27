# LAN protocol and performance

## Timing

- The combat rules advance in fixed **10 ms** steps.
- Each actively playing room owns a supervised **120 Hz** loop, passing monotonic elapsed time into the kernel. Lobby, paused and fully settled result rooms check at **4 Hz**; load/resume/restart wakes them immediately. Final KO presentation completes before sleeping. A slow room does not hold up a global batch. Room removal signals its loop to stop; application shutdown cancels remaining loops. Expiry cleanup runs separately once per second. A stalled iteration catches up at most 50 ms, preventing an unbounded catch-up spiral.
- A room lock held by setup or a command skips that room's clock iteration instead of stalling other rooms.
- Active authoritative snapshots target **60 Hz**. Scheduling retains the fractional interval rather than accumulating timer drift. Paused and settled matches publish at **4 Hz**, with immediate control/final-state publication. Rooms with no connected peers do not serialize snapshots.
- Native key and touch events send input immediately on one persistent WebSocket. Unchanged input is refreshed every 250 ms. Input changes do not wait for an HTTP response.
- Local prediction restores authoritative snapshots and replays unconfirmed inputs through the same two-fighter kernel. Input receipt and application have separate acknowledgements. Pending quick taps survive hit freeze. Input history is bounded to two seconds / 600 entries; exhaustion resynchronizes from authority.
- Rendering uses `requestAnimationFrame`; routine HUD updates are limited to 30 Hz, with immediate lifecycle updates. Health and outcomes come from authority. Small corrections settle visually over 80 ms without moving collision boxes; corrections above 80 world units, teleports, knockouts and lifecycle boundaries snap.
- The active prediction horizon is `clamp(smoothed RTT + 50 ms, 100 ms, 250 ms)`. Missing active snapshots beyond it freeze prediction and show a warning. Paused/settled matches do not extrapolate and allow 1 second between snapshots before showing a stale-state warning. Socket heartbeats and reconnect checks remain active. Pause, restart, new rounds and reconnection clear replay history.
- Only the latest unsent state is retained per peer. Each state/event frame is encoded once and shared immutably between both peers; returning to the lobby clears retained state frames. Control messages use a separate bounded queue. Large client-side socket buffers trigger reconnection rather than accumulating input lag.
- False buttons and zero counters are omitted from input packets. Images, audio and videos are served separately with immutable caching. Only selected battle atlases are loaded before a match.

TCP WebSockets can still delay later messages when a network packet is lost. Actual LAN latency depends on Wi-Fi contention, the host, device rendering and browser scheduling.

## Local runtime cache

`npm start`, `npm run lan` and `sbt run` use the writable project directory `output/polyglot-cache/` for Graal's extracted native resources. This fixes Windows profiles where creating `%LOCALAPPDATA%/org.graalvm.polyglot` is denied and the runtime misleadingly reports a missing `truffleattach` resource. The cache is generated, ignored by Git and recreated when needed. Restart the local backend after updating. Do not suppress the warning with `polyglotimpl.AttachLibraryFailureAction=ignore`; it hides the failed resource extraction. The existing public-service cache settings in [WAN.md](WAN.md) remain separate. A successful extraction alone does not establish that the JVM provides an optimizing JavaScript compiler.

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

Connect to `/ws`, then send `{"type":"authenticate","token":"...","protocol":15}`. Both ends reject incompatible versions with a reload message; deploy the UI and server together. Authentication resolves a trusted session before attaching the socket. A socket has five seconds to authenticate. Subsequent input packets are checked against the currently attached peer, so a replaced socket cannot continue controlling a player.

Client messages are `authenticate`, `input` and `ping`. Server messages are `room`, `prepare`, `state`, `events`, `pong` and `error`. Input has an increasing safe-integer `seq` and an `input` object. Known actions, boolean directions and bounded press counters are normalized at the Scala boundary. Extra identity, health and action fields have no effect.

Both ready players receive a `prepare` message containing configuration and a generation. Each prepare message also carries the currently attached `peerId`. Both must acknowledge that generation and their own peer ID after preloading images, including a resume after reconnect. The server then creates the authoritative match. Late loading acknowledgements cannot start an outdated match.

A state message includes `protocol`, room `generation`, reconciliation `epoch`, monotonic simulation `tick`, server monotonic `time` in milliseconds, authoritative `state`, and the latched `inputState` needed for deterministic replay. Applied/received sequence numbers and input values live in `inputState`; they are not repeated as top-level fields. Unlike `inputTick`, the simulation tick advances during hit freeze and ready/round transitions, and does not reset on restart. Epoch changes invalidate local prediction history within a generation. `serverUpdateMs` measures room update work through snapshot serialization; it excludes transport delivery.

Presentation events carry `{id, at, event}` in separate reliable `events` batches with generation/epoch metadata. RoomConnection merges batches into client-facing packets; clients deduplicate within each epoch and skip events older than two seconds, including a TCP backlog after a stall. State remains latest-only and contains no repeated event history. Bounded event queues reconnect on overflow instead of silently losing cues. The kernel serializes each state/batch once; Scala adds transport metadata without reparsing it.

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

Protocol 10 restores Mujica and MewType standing J chains through the shared command resolver. Repeated J selects the existing opener, Jab2 and Jab3 for the current character/form; touch repeat uses the same path. MyGO and Penguin retain their existing three-hit mapping. Recovery, damage, resonance, crouching/air normals and K heavy attacks keep their authored rules. Clients and the host must update together so prediction follows the same attack names.

Protocol 11 separates reliable presentation-event batches from latest-only state snapshots. `events` frames contain generation/epoch metadata and are merged into client-facing packets by RoomConnection; acknowledgements and latched controls live in `inputState`. See [performance notes](PERFORMANCE.md).

Protocol 12 introduces the revised two-tier terrain and uniform normal hitboxes while retaining protocol 11's transport. All three J stages and crouching/air normals share 200 forward reach and 240 height tolerance. K uses 1.2 times those dimensions. Mujica stage normals multiply the current J/K dimensions by 1.1. Every map now has long platforms at heights 144/288 and ground terraces accessible on foot from both sides. Stage source, browser manifest and server terrain agree; restart the rebuilt host and refresh both clients together after updating.

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

## Skill completion, protocol 13

Protocol 13 adds recovery waves to uncontested counter stances and a damaging impact to normal Uika I. After a counter window ends, its stance releases one existing counter projectile at half base damage, 180 ms stun and half push. A successful parry still emits the full original response and ends the stance; an interrupted stance emits no recovery wave. The existing hit flag and projectile impact fields are serialized for deterministic prediction. The new `counterRelease` presentation event uses the reliable event lane. Deploy UI and server together, restart LAN hosts and refresh both clients after updating. Protocol 12 clients are rejected rather than predicting the old combat rules.

## Backward skill commands, protocol 14

Every character/form now explicitly maps backward U/I/O to a quick wave, a heavy wave and a lobbed projectile. These 66 moves use the existing serializable projectile velocity/gravity/impact fields, and captured press directions remain authoritative for resolving the command. Forward O retains the universal close throw. Protocol 14 prevents clients using the earlier backward-throw or base-skill mappings from joining the updated kernel. Update the host and both clients together, then restart the host and refresh both browsers.

## Wider stages, protocol 15

The world now spans -900 to 1860 (2760 units, 15% wider) with 180 extra units at each side. All 15 source/browser/server ground endpoints match the new bounds. Existing interior steps, platform heights and platform lengths are retained. Camera fitting, movement, blinking, summons and world-spanning tracking waves derive their bounds from the shared world data. Protocol 15 keeps earlier clients from predicting the old edge positions; restart the updated LAN host and refresh both clients.
