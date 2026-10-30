# Services deployment — 2026-10-29

Historical preparation record. The [2026-10-30 deployment and gameplay audit](DEPLOYMENT_2026-10-30.md) records activation of protocol 25, revised resource budgets, the two-room ceiling and verified legacy rollback. The pending steps and initial budgets below describe the earlier preparation state.

This change splits the Scala backend into three deployed roles, `edge`, `lobby`
and `rooms`, still shipped as one `mygo-server-2.0.0.tgz` artifact selected by
`SERVICE_ROLE`. It also bumps the public protocol to **25** because room tokens
now carry the room code and clients connect to `/ws?room=CODE`. `edge`,
`lobby` and `rooms` replace the single `mygo-fighter.service` layout; Caddy is
unchanged and still proxies the public hostname to `127.0.0.1:8080`.

| Item                    | Value                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| Change date             | 2026-10-29                                                                                     |
| Application commit      | `ca01050` (protocol 25 services split)                                                         |
| Release ID              | `20261029-ca01050-protocol25` (public host not activated yet)                                  |
| Archive SHA-256         | `0aff77bc74caa49bb88e1943d784452b0e9ce353bb92ce1774b61aaeaa61d87e` (local build, not uploaded) |
| WebSocket protocol      | `25`                                                                                           |
| Services                | `edge` public 8080, `lobby` internal 8079, `rooms` internal 8091 (8092 for instance `b`)       |
| Public default          | One rooms instance, global and per-instance `MAX_ROOMS=4`                                      |
| LAN default             | Three local processes (`npm run lan`), `MAX_ROOMS=20`                                          |
| Service memory ceilings | edge 192 MiB, lobby 128 MiB, each rooms instance 512 MiB                                       |
| Public proxy            | Caddy unchanged; TLS/WSS to `127.0.0.1:8080`                                                   |

The public AliCloud host still runs the protocol-22 single-unit release until the
steps below are executed. GitHub Pages is unaffected.

## What changed

- `backend/src/main/scala/services/system/api/Main.scala` dispatches
  `SERVICE_ROLE=edge|lobby|rooms`; `all` remains the single-JVM local debugging
  composition.
- New `services/edge/` owns public admission, static files, API forwarding, the
  bounded room-owner cache and WebSocket proxying.
- New `services/lobby/` owns the instance registry, global `MAX_ROOMS`,
  placement and reservations, and the room-code directory rebuilt from
  heartbeats.
- `services/rooms/` keeps room execution and gained its internal routes,
  `LobbyClient` heartbeat/registration and per-instance configuration.
- Cross-process payload types moved to `services/system/objects/internal/`;
  `InternalGuard` enforces loopback plus `X-Mygo-Internal`.
- Protocol 25: token `<six uppercase hex code>.<48 hex secret>` and socket
  `/ws?room=CODE`; protocol 24 and earlier clients are rejected.
- Deployment files: three systemd units, four env examples plus the retained
  legacy `server.env.example`, and rewritten `install.sh`, `activate.sh` and
  `rollback.sh`.
- Documentation: new `docs/SERVICES.md`; updated `docs/ARCHITECTURE.md`,
  `docs/COURSE_GUIDANCE.md`, `docs/WAN.md`, `README.md` and one
  `AGENTS.md` development rule.

## Local verification status

Verified for this change:

- `bash -n deploy/install.sh deploy/activate.sh deploy/rollback.sh` passes.
- `install.sh`, `activate.sh` and `rollback.sh` were exercised in a local
  harness with temporary `/etc` and `/srv` trees and stubbed `systemctl`,
  `apt-get`, `useradd`, `caddy`, `curl`, `flock` and `mv` commands (the
  workstation has no systemd, no root and no `flock`/`mv -T`). The harness
  covered: idempotent install with a preserved env file and a single generated
  `INTERNAL_SECRET`; enabling a new rooms instance after changing
  `ROOMS_INSTANCES`; migration-note output with a legacy unit present; activation
  stop/start order, symlink switch, health probing, `deployment.json` parsing and
  `previous` retention; multi-instance activation with ports 8091 and 8092;
  automatic restoration after a failed health check; rollback success, failure
  restoration and the no-previous error path.
- Environment variable names, defaults and validation rules in the units and
  examples were cross-checked against `EdgeConfig`, `LobbyConfig` and
  `RoomsConfig`. Internal paths, status codes, payload types and role health
  bodies were cross-checked against `LobbyInternalRoutes`, `RoomInternalRoutes`,
  `InternalGuard`, the `services/system/objects/internal/` types, `LobbyClient`,
  `EdgeApiRoutes`, `EdgeHealthRoute`, `EdgeSocketRoutes` and `SocketProxy` in the
  working tree.
- The static service checks pass in the working tree at the time of writing:
  `node scripts/check-services.mjs` (service folders, forbidden imports, the
  in-process rooms tick path, the `SERVICE_ROLE` dispatch and the three deploy
  units), `node scripts/check-api.mjs` (registered room API names against the
  frontend callers) and `node scripts/check-protocol.mjs` (protocol `25`).

Not run by this change (the task wrote files only): the full `npm run check` and
typecheck suite, `sbt` compilation, packaging, the three-process LAN launcher,
`npm run check:e2e`, a real systemd install, fresh host provisioning and any
public deployment. Those are integration steps below.

The integration pass on this checkout also ran and passed:

- `npm run check` (typecheck plus the kernel, rules, snapshot and asset suites,
  protocol `25`, the 10 room API names and the service-boundary checks).
- `npm run check:backend` (`build-simulation.mjs`, `sbt compile`,
  `scalafmtCheckAll`).
- `npm run build` and `npm run build:pages`.
- `npm run package:server`: produced
  `backend/target/universal/mygo-server-2.0.0.tgz` (156 MB, 51 runtime jars,
  `bin/mygo-server`, `web/index.html`). The extracted `bin/mygo-server` started
  the `lobby` role and answered `GET /internal/health` with
  `{"role":"lobby","ok":true,...}`, so the role selector works from the packaged
  launcher, not only from sbt.
- `npm run check:e2e`: three real JVM processes (`rooms` 18091, `lobby` 18079,
  `edge` 18080) passed both health gates and the full two-room flow —
  `createroom` through edge/lobby placement, `joinroom`, protocol-25
  authenticate over the proxied socket, `chooseroom`, `ready`, `prepare`,
  `loadedroom`, authoritative `state` frames, 20 input frames, further state
  frames per side and no error frames. Both parallel rooms stayed isolated and
  produced distinct codes. Report:
  `output/services-e2e/report.json`.
- `node scripts/start.mjs` (the `npm start` launcher, run on an isolated port):
  started rooms, lobby and edge from the staged artifact, wrote
  `output/run/services.json`, and `/api/health` reported
  `{"app":"mygo-scala","ok":true,...,"services":{"edge":"ok","lobby":"ok","rooms":"ok"}}`.
  `SIGINT` stopped all three processes and removed the pid file.
- `SERVICE_ROLE=all` (the single-JVM debugging composition) served
  `/api/health` with all three roles healthy and answered an immediate
  `createroom` with a protocol-25 token
  (`<six uppercase hex>.<48 hex>`), so the loopback topology and the room token
  format work without separate processes.

Still not run: a real systemd install on the target host, the public AliCloud
activation, desktop/mobile browser acceptance, and capacity measurements of the
split roles. Those are the public-host steps below.

## Pending public-host steps

1. The integration pass was completed on commit `ca01050` (see Local
   verification status). Re-run `npm run check`, `npm run check:backend`,
   `npm run build`, `npm run package:server` and `npm run check:e2e` on the
   release commit before upload, and confirm the packaged artifact embeds
   protocol 25 and the matching frontend.
2. Application commit, release ID and the local archive SHA-256 are recorded in
   the table above. Confirm the uploaded archive's checksum against it and
   record the activation time in the deployment record.
3. Upload the package and verify its checksum before activation:

   ```sh
   scp backend/target/universal/mygo-server-2.0.0.tgz alicloud:/tmp/mygo-server-2.0.0.tgz
   ssh alicloud 'sha256sum /tmp/mygo-server-2.0.0.tgz'
   ```

4. Install the new host layout. Copy `deploy/` to the host and run
   `sudo bash deploy/install.sh PUBLIC_HOSTNAME`. The installer enables
   `mygo-rooms@a`, disables the legacy `mygo-fighter.service`, creates
   `/etc/mygo-fighter/{base,edge,lobby,rooms}.env` if missing and appends a
   generated `INTERNAL_SECRET`. Before activation, compare the old
   `/etc/mygo-fighter.env` values with the new files: `HOST`, `PORT`, `WEB_ROOT`
   and `TRUST_LOCAL_PROXY` belong in `edge.env`; the four-room limit belongs in
   both `lobby.env` (global) and `rooms.env` (per instance). Confirm Caddy's
   existing configuration and certificate remain in place.
5. Activate atomically:

   ```sh
   ssh alicloud 'sudo bash /opt/mygo-fighter/activate.sh /tmp/mygo-server-2.0.0.tgz RELEASE_ID COMMIT'
   ```

   Expect `Active release: RELEASE_ID`, role ports and the instance list. Verify
   `sudo cat /srv/mygo-fighter/current/deployment.json` contains the release,
   commit, archive SHA-256 and role ports; each rooms and lobby
   `/internal/health` reports `"ok":true`; and public `/api/health` reports
   `"app":"mygo-scala"` with the expected `services` map. The replaced
   protocol-22 directory becomes `/srv/mygo-fighter/previous`.

6. Public acceptance with refreshed clients: HTTPS/WSS access without
   certificate bypass, room creation and joining through the edge, protocol-25
   rejection of a stale client, `/ws?room=CODE` in the browser network panel,
   ready/loading/state traffic in two simultaneous rooms, refresh/reconnect,
   pause/restart, room-full handling, invalid room codes, foreign-origin
   rejection, admission limits with `Retry-After: 60`, and both browsers free of
   console errors.
7. Observe the split memory and CPU with
   `systemctl show mygo-edge mygo-lobby mygo-rooms@a -p MemoryCurrent -p MemoryPeak -p NRestarts`
   during and after acceptance. The three ceilings are an initial budget; do not
   raise `MAX_ROOMS` without a capacity run comparable to the
   [2026-10-27 capacity record](DEPLOYMENT_CAPACITY_2026-10-27.md).
8. Test rollback once the new release is accepted: `sudo bash
/opt/mygo-fighter/rollback.sh` restores the protocol-22 release for both the
   services and the symlink. Both changes end temporary rooms, so clients must
   refresh on each switch. Re-activate the new release afterwards and leave the
   accepted release active.
9. After the new layout is stable, remove the disabled legacy unit and the old
   environment file:
   `rm /etc/systemd/system/mygo-fighter.service /etc/mygo-fighter.env` followed
   by `systemctl daemon-reload`. Retain the active and previous release
   directories for rollback.

## Notes and limitations

- Protocol 25 is incompatible with earlier clients and servers. Deploy the UI
  and the backend together; any open page must refresh before it can create or
  join a room.
- A release switch stops all role units, so temporary rooms and sessions are
  discarded, as with the previous single-unit activation.
- The first activation of this layout keeps the current protocol-22 release as
  `previous`; rolling back also restores protocol 22, so clients must refresh
  again.
- The memory ceilings and the one-instance/four-room public budget are planned
  configuration, not measured capacity on the current host. Capacity results for
  the split roles have not been established; the historical measurements in
  `docs/BACKEND_SCALING_2026-10-27.md` and `docs/DEPLOYMENT_CAPACITY_2026-10-27.md`
  describe the earlier single-process layout.
- Caddy requires no change. The public hostname still resolves to the same host;
  only the loopback processes behind it change from one unit to three.
- `docs/LAN.md` remains the reference for combat cadence and socket timing;
  `docs/SERVICES.md` is the reference for the service split.
