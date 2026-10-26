# AliCloud deployment — 2026-10-26

The latest application backend and matching frontend are live on the AliCloud Beijing host. The game service and HTTPS proxy are enabled at boot. The load check ended at the user's request after approximately nine minutes; the deployment remains active.

## Release and access

| Item               | Value                                                    |
| ------------------ | -------------------------------------------------------- |
| Game URL           | <https://mygo-123-57-149-254.sslip.io/>                  |
| Health URL         | <https://mygo-123-57-149-254.sslip.io/api/health>        |
| SSH alias          | `alicloud` (`123.57.149.254`)                            |
| Host               | Ubuntu 24.04, x86-64, approximately 1.6 GiB RAM          |
| Application commit | `6d3d1363e3602ce694928261426da1bc4aa573b0`               |
| Release ID         | `20261026-6d3d136-protocol10`                            |
| WebSocket protocol | `10`                                                     |
| Capacity setting   | Two rooms / four players                                 |
| Java               | OpenJDK 21                                               |
| Service            | `mygo-fighter.service`                                   |
| HTTPS proxy        | `caddy.service`, with a public Let's Encrypt certificate |

The uploaded `mygo-server-2.0.0.tgz` was verified against its local SHA-256 before activation:

```text
d3c663e373a39f9be0c79a0cf884483d9f45f05c680e5f37a54b156f1431844e
```

## Deployment configuration

The release lives in `/srv/mygo-fighter/releases/20261026-6d3d136-protocol10`. The `/srv/mygo-fighter/current` link selects the active release. A `deployment.json` file in that release records the application commit, archive checksum, protocol and hosting service checksum.

Runtime settings are in `/etc/mygo-fighter.env`:

| Setting             | Value                           |
| ------------------- | ------------------------------- |
| `HOST`              | `127.0.0.1`                     |
| `PORT`              | `8080`                          |
| `WEB_ROOT`          | `/srv/mygo-fighter/current/web` |
| `MAX_ROOMS`         | `2`                             |
| `TRUST_LOCAL_PROXY` | `true`                          |

Caddy serves public TCP 80/443, redirects HTTP to HTTPS and forwards HTTP/WebSockets to the loopback backend. The AliCloud instance firewall already allowed these public web ports. The JVM uses a 64 MiB initial heap, a 256 MiB maximum heap and a 512 MiB service memory limit.

First-use verification found that GraalJS could not create `/srv/mygo-fighter/.cache` under the restricted service account. The service now uses `CacheDirectory=mygo-fighter` and `XDG_CACHE_HOME=/var/cache/mygo-fighter`. The native resource cache is writable, while the application release and service home remain read-only. The misleading missing-`truffleattach` warning disappeared after applying this configuration.

## Verification completed

- TypeScript, media, combat kernel and protocol checks passed with `npm run check`; normal and Pages builds passed. The Pages build loaded under `/mygo-fighter/` in a browser.
- The previously validated Scala/JVM distribution started successfully on AliCloud. Public HTTPS health checks identify `mygo-scala`, with 120 Hz simulation and 60 Hz snapshots.
- Two isolated browsers created/joined a room, loaded the match, moved, applied damage, reconnected after a page refresh and resumed with health preserved. Browser consoles had no errors or warnings.
- All 279 runtime media paths were checked over public HTTPS against the matching local content. The asset manifest also matched.
- Four WebSocket clients exercised two simultaneous rooms: Taki/Rana 1v1 and a separate 3v3 relay. Room isolation, host-only actions, invalid/full rooms, invalid sessions, old-protocol rejection, pause/resume, reconnect, damage and reserve progression were observed.
- Origin rejection, the HTTP body limit, room/handshake rate limits, forwarded-address handling and recovery after the rate-limit window passed.

The final verification window was **18:37:10–18:46:26 Asia/Shanghai** (approximately **9 minutes 16 seconds**, including setup and reconnect checks). The user requested that the test end at that point.

| Observed result                           | Value                            |
| ----------------------------------------- | -------------------------------- |
| Snapshots received per client             | 32,981–33,109                    |
| Unexpected client disconnects             | 0                                |
| Client protocol/transport errors          | 0                                |
| Automatic service restarts                | 0                                |
| Service peak memory at final health check | Approximately 321 MiB of 512 MiB |
| Client RTT p95                            | 51.4–54.1 ms                     |
| Server update work p95                    | 2.87–3.38 ms                     |

These timing values describe this run from the development machine, rather than a capacity guarantee. The full 15-minute target and the subsequent two-minute abandoned-room expiry check were not completed. The checker recorded an intentional interruption; it was not an application failure. All four verification sessions explicitly left their rooms, and both room codes were confirmed removed. The service remained healthy afterward.

Temporary logs, reports and screenshots are in the ignored `output/alicloud/` directory.

## Operations and future deployments

```sh
ssh alicloud 'systemctl status mygo-fighter caddy --no-pager'
ssh alicloud 'sudo journalctl -u mygo-fighter -u caddy --no-pager -n 100'
curl --fail https://mygo-123-57-149-254.sslip.io/api/health
```

To update, build a matching distribution, compare the uploaded archive checksum, and activate it with a new release ID:

```sh
npm run check
npm run check:backend
npm run package:server
scp backend/target/universal/mygo-server-2.0.0.tgz alicloud:/tmp/mygo-server-2.0.0.tgz
ssh alicloud 'sha256sum /tmp/mygo-server-2.0.0.tgz'
ssh alicloud 'sudo bash /opt/mygo-fighter/activate.sh /tmp/mygo-server-2.0.0.tgz RELEASE_ID'
```

Activation and rollback scripts are installed persistently in `/opt/mygo-fighter/`. Successful future activation retains the preceding release for `sudo bash /opt/mygo-fighter/rollback.sh`. This was the first game installation on the host, so no preceding application release is available yet. Switching or restarting the service ends temporary matches.
