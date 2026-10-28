# Deployment — 2026-10-28

The matching frontend, Scala backend and shared combat kernel are deployed at <https://mygo-123-57-149-254.sslip.io/>. This release adds custom battle rules, teams up to 8v8, infinite time and arcade play, sharper character rendering, and the Baidu browser background-video fix. The roster remains 16 playable characters; Poppin'Party assets remain design material.

| Item               | Value                                                              |
| ------------------ | ------------------------------------------------------------------ |
| Application commit | `8051ba8298201addf9ec042fc996b09b068d4ba1`                         |
| Release            | `20261028-8051ba8-protocol22`                                      |
| WebSocket protocol | `22`                                                               |
| Archive SHA-256    | `04fec740d38581bd61ba42b48f7e0f5c7a1c6fa5983a189abef550358bfd08e0` |
| Runtime            | OpenJDK 21                                                         |
| Room limit         | Four rooms / eight connected players                               |
| Memory ceiling     | 512 MiB; existing JVM flags retained                               |

Fetched and reviewed `origin/main` before building and checked it again before activation. The upload checksum matched the local package. The existing activation script stopped the old process before switching the complete release, then passed its backend health check. The running JVM's working directory resolves to the new release.

## Verification

Passed `npm run check`, `npm run check:backend`, `npm run build:pages` and `npm run package:server`, which includes `npm run build`. The Pages build loaded and entered practice under `/mygo-fighter/`. The deployed HTML matched the production build; all 334 media paths and the asset manifest matched local content or byte ranges. HTTPS certificate validation, HTTP-to-HTTPS redirect, HTML `no-cache` and immutable media caching passed.

Public protocol-22 checks passed pause/resume, reconnect, host-only restart, invalid sessions, foreign-origin rejection, previous-protocol rejection and fighter reset. Two isolated browsers completed a public online match: keyboard attacks reduced the defender to 183 HP, and refreshing preserved that state before resuming. Both browsers reported no console errors.

An online 8v8 check formed two teams covering all 16 characters. Both peers received the same custom rules, the server applied 350 HP and 80 starting energy, infinite time held the clock at 90 seconds, and guest rule changes were rejected. Full-room and fifth-room rejection, abandoned-session revocation after two minutes, capacity recovery and admission limits with `Retry-After: 60` also passed.

Four authenticated clients completed 900.00 measured seconds in simultaneous 1v1 and 3v3 matches through public HTTPS/WSS. Each received 52,116–52,154 snapshots, at least 57.91 snapshots/second across the complete window, with damage in both rooms and reserve progression in 3v3. There were no unexpected socket closes, protocol mismatches, automatic backend restarts or memory-limit events. Peak service memory was 270.3 MiB. These measurements include other functional checks during the initial part of the window and are not a capacity benchmark.

**The strict soak harness did not pass its no-error assertion.** One client recorded one asynchronous HTTP acknowledgement timeout at its 20-second deadline. The harness did not label whether that request acknowledged loading or a finish presentation. It remained the only recorded client error; both matches continued. A separate follow-up made 60 finish-acknowledgement requests successfully (maximum 42.1 ms), but did not establish the original timeout's cause. The harness skipped its later event-pair assertions after the error check, so exact event-ID equality is not claimed for this run.

The workstation's proxy DNS initially returned an unusable synthetic address. Public verification used a temporary, hostname-specific DNS override to the server's known IP while retaining the hostname, SNI and normal certificate validation; no system DNS configuration or certificate checks were changed.

The four-room limit is inherited from the [protocol-20 capacity audit](DEPLOYMENT_CAPACITY_2026-10-27.md). The current checks do not establish four-room capacity for 8v8 or every combination of custom rules. Cold JVM startup remains a limitation; startup logs included CPU-starvation warnings during initial match loading.

## Previous-version removal

After live verification, deleted `20261027-1fbfdc0-protocol20`, the `previous` symlink and the uploaded archive from the server at the user's request. Verified that `/srv/mygo-fighter/releases/` contains only `20261028-8051ba8-protocol22`, the running process still uses that directory, and health remains successful with no restart. No previous release is retained for rollback. Shared service configuration and caches remain in place.

Temporary browser sessions and the local preview server were closed. Verification scripts, reports and screenshots remain under ignored `output/deploy-20261028/` and `output/playwright/deploy-20261028/`; no removed test directory was restored. `deployment.json` in the active release records the package identity and verification results.
