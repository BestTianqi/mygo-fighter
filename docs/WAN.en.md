[简体中文](WAN.md) | **English** | [日本語](WAN.ja.md)

# Deploy on your own public server

Deploy the complete game on a personal VPS or a reachable home server. Players share one HTTPS URL; Caddy forwards HTTP and WebSocket traffic to edge, lobby tracks rooms and capacity, and rooms runs the authoritative shared combat kernel. All roles use the same server archive. The examples are placeholders, not a description of a live host.

## 1. Prepare the host and network

Use Ubuntu 24.04 LTS with systemd, an SSH account with sudo, and a domain you control. Start with a small workload and measure capacity on your hardware; the three default unit ceilings are edge 256 MiB, lobby 192 MiB and each rooms JVM 512 MiB, plus operating-system/proxy memory. A 2-vCPU/2-GiB host is an initial evaluation budget, not a capacity guarantee.

Point the domain A record at the public IPv4; publish AAAA only when IPv6 works. For a home server, forward TCP 80/443 to its fixed LAN address. CGNAT or a campus network without inbound forwarding needs a separate reachable entry first. Allow public TCP 80/443 at both the provider firewall and host firewall; keep 8080 (edge), 8079 (lobby), and 8091 (rooms a) on loopback. The supplied proxy does not need UDP 443.

On the build machine, add an SSH alias in `~/.ssh/config`; replace the example IP, user and key:

```sshconfig
Host game-server
    HostName 203.0.113.10
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519
```

At the repository root on your **build machine**, set these variables and keep using the same shell. Replace the hostname with your domain; it must not include a URL scheme, path or port.

```sh
MYGO_SSH=game-server
MYGO_HOSTNAME=game.example.com
ssh "$MYGO_SSH" 'id; uname -m; free -h; df -h /srv'
```

In a **server SSH session**, use the following UFW example only after allowing your actual SSH port and preserving rules needed by other services. Replace 22 if SSH uses another port, keep the current session open, and do not reset an existing firewall. Check DNS using `nslookup game.example.com` and inspect which process owns ports 80/443.

```sh
sudo apt-get update
sudo apt-get install -y ca-certificates curl openssl tar util-linux ufw
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
sudo ss -ltnp
```

## 2. Build on your computer

Install Git, [Node.js](https://nodejs.org/en/download) (at least 22.12; Node 24 matches the project workflow), [JDK 21](https://adoptium.net/installation/) and [sbt](https://www.scala-sbt.org/1.x/docs/Installing-sbt-on-Linux.html). Use Bash on macOS/Linux or WSL. Sync and review remote changes before building while preserving local edits. Run this at the repository root:

```sh
node --version
java -version
sbt --version
npm ci
npm run check
npm run check:backend
VITE_PUBLIC_GAME_URL="https://$MYGO_HOSTNAME" npm run package:server

MYGO_VERSION=$(node -p "require('./package.json').version")
MYGO_COMMIT=$(git rev-parse HEAD)
MYGO_RELEASE="$(date -u +%Y%m%dT%H%M%SZ)-$(git rev-parse --short HEAD)"
MYGO_ARCHIVE="backend/target/universal/mygo-server-$MYGO_VERSION.tgz"
test -f "$MYGO_ARCHIVE"
mkdir -p output/wan
tar -czf output/wan/hosting.tar.gz deploy
shasum -a 256 "$MYGO_ARCHIVE"
```

The archive version comes from `package.json` (currently 2.0.1). Use `sha256sum` if `shasum` is unavailable. `package:server` includes the frontend, runtime media, JVM dependencies, launch scripts and embedded combat kernel. Upload this `.tgz`, not a desktop ZIP or a Pages-only build. The server installer supplies Java 21; the host does not need Node or sbt.

## 3. Install the services

On your **build machine**, upload the deployment files and install on a fresh dedicated host:

```sh
scp output/wan/hosting.tar.gz "$MYGO_SSH:/tmp/mygo-hosting.tar.gz"
ssh "$MYGO_SSH" 'mkdir -p /tmp/mygo-hosting && tar -xzf /tmp/mygo-hosting.tar.gz -C /tmp/mygo-hosting'
ssh -t "$MYGO_SSH" "sudo bash /tmp/mygo-hosting/deploy/install.sh '$MYGO_HOSTNAME'"
```

The installer creates the mygo account, environment files, release directories and systemd units; installs Java and Caddy; enables startup; and generates a shared internal secret if missing. Existing environment files are kept. Caddy may return 502 until the application is activated.

An unrelated existing Caddy installation is deliberately rejected. Do not manufacture the backup marker to bypass that check: back up and merge sites/global options manually, then install the account, environment files and units according to `deploy/install.sh`. Existing Nginx/Apache also requires manual proxy integration; the automatic route assumes Caddy owns TCP 80/443.

On the **server**, inspect the defaults:

```sh
sudoedit /etc/mygo-fighter/base.env
sudoedit /etc/mygo-fighter/edge.env
sudoedit /etc/mygo-fighter/lobby.env
sudoedit /etc/mygo-fighter/rooms.env
```

Keep `ROOMS_INSTANCES="a"` in base.env, the generated `INTERNAL_SECRET` shared by every role, edge on `127.0.0.1:8080` with `WEB_ROOT=/srv/mygo-fighter/current/web`, lobby on `127.0.0.1:8079`, and rooms on `127.0.0.1:8091`. Edge and rooms use `LOBBY_URL=http://127.0.0.1:8079`. Start with `MAX_ROOMS=2` in lobby.env and rooms.env and `ROOMS_PER_INSTANCE=2` in lobby.env.

Keep the secret out of Git and browsers; files are root:mygo, mode 0640. Use plain KEY=value settings, without shell commands or export. Enable `TRUST_LOCAL_PROXY=true` only behind the trusted loopback proxy. See [service configuration](SERVICES.en.md) for the full matrix.

## 4. Upload and activate

On the **build machine**, upload the archive and compare both SHA-256 values:

```sh
scp "$MYGO_ARCHIVE" "$MYGO_SSH:/tmp/mygo-server.tgz"
shasum -a 256 "$MYGO_ARCHIVE"
ssh "$MYGO_SSH" 'sha256sum /tmp/mygo-server.tgz'
```

Only after the two checksums match, activate:

```sh
ssh -t "$MYGO_SSH" "sudo bash /opt/mygo-fighter/activate.sh /tmp/mygo-server.tgz '$MYGO_RELEASE' '$MYGO_COMMIT'"
ssh "$MYGO_SSH" 'sudo cat /srv/mygo-fighter/current/deployment.json'
```

Use a unique release ID, at least two characters, starting with a letter/digit and containing only letters, digits, dots, underscores or hyphens. Activation checks the package, stops the roles, switches current, starts rooms → lobby → edge, checks health and writes deployment.json. It retains the replaced release as previous. Failed startup attempts restore the prior release; a first install has no prior release to restore. Switching releases ends temporary rooms, so notify players first.

## 5. Verify HTTPS and real matches

From a network **outside the server**, check:

```sh
curl -I "http://$MYGO_HOSTNAME/"
curl -fsS "https://$MYGO_HOSTNAME/api/health"
```

HTTP should redirect to HTTPS. Health should contain `"app":"mygo-scala"`, `"ok":true` and healthy roles. Do not bypass certificate validation. On the **server**, inspect:

```sh
sudo systemctl status mygo-edge mygo-lobby mygo-rooms@a caddy --no-pager
sudo systemctl is-enabled mygo-edge mygo-lobby mygo-rooms@a caddy
sudo journalctl -u mygo-edge -u mygo-lobby -u mygo-rooms@a -u caddy -n 100 --no-pager
sudo ss -ltnp
curl -fsS http://127.0.0.1:8080/api/health
```

Then use two devices on different networks to open the same HTTPS domain, create/share/join a room, select characters, ready up and play. Test movement, damage, supers, disconnect pause and same-tab reload/reconnect; test three devices for brawl. Browser Network → WS should show `wss://game.example.com/ws?room=...` and continuing frames. A bare unauthenticated /ws request being rejected is expected. Health alone does not prove gameplay. The supplied deployment serves the domain root, not a custom subpath.

## 6. Updates, rollback and capacity

Repeat the build/upload/checksum/activation sequence with a fresh commit and release ID for every update. Always deploy a complete matching archive. Rerun the installer when deployment units change, after reviewing its Caddy configuration rewrite. To roll back from the **build machine**:

```sh
ssh "$MYGO_SSH" 'sudo readlink /srv/mygo-fighter/current; sudo readlink /srv/mygo-fighter/previous'
ssh -t "$MYGO_SSH" 'sudo bash /opt/mygo-fighter/rollback.sh'
curl -fsS "https://$MYGO_HOSTNAME/api/health"
```

Retain both current and previous release directories. Rollback changes application files, not environment files, systemd overrides or Caddy settings; back up and check configuration compatibility separately. First installations have no previous target. Both rollback and restart end temporary rooms.

On the **server**, inspect resources:

```sh
sudo systemctl show mygo-edge mygo-lobby mygo-rooms@a -p MemoryCurrent -p MemoryPeak -p NRestarts
sudo journalctl -u mygo-rooms@a -n 100 --no-pager
```

Only add instance b after measuring capacity and confirming port 8092 is free. On the **server**:

```sh
sudo install -o root -g mygo -m 0640 /dev/null /etc/mygo-fighter/rooms-b.env
printf 'ROOMS_PORT=8092\n' | sudo tee /etc/mygo-fighter/rooms-b.env >/dev/null
sudoedit /etc/mygo-fighter/base.env
sudoedit /etc/mygo-fighter/lobby.env
```

Set `ROOMS_INSTANCES="a b"` in base.env. For two rooms per instance, set lobby `MAX_ROOMS=4` and `ROOMS_PER_INSTANCE=2`, leaving rooms `MAX_ROOMS=2`. Rerun the retained installer to enable the new unit, then activate the full archive under a new release ID. Check mygo-rooms@b and its authenticated internal health on port 8092. Each JVM needs memory; more instances do not guarantee linear scaling. After unit edits run daemon-reload and restart; secret changes require coordinated restarts of all roles.

## 7. Optional Pages link and troubleshooting

For your own repository fork, set the Actions repository variable `PUBLIC_GAME_URL=https://game.example.com`, then rerun the Pages workflow. Locally:

```sh
VITE_PUBLIC_GAME_URL="https://$MYGO_HOSTNAME" npm run build:pages
```

The variable is read at build time. Static Pages opens the configured HTTPS game server; it does not provide the backend or use cross-origin room APIs. Without the override, the code uses its default public server. Recheck the /mygo-fighter/ project subpath after publishing.

For certificate/timeouts check DNS A/AAAA, TCP 80/443, NAT and Caddy logs. For 502 check edge and current/web. For room failures check the role units, shared secret, room limits, protocol freshness and WSS proxying. For repeated restarts inspect CPU, MemoryCurrent, MemoryPeak and NRestarts. A Graal cache permission problem should be fixed through the rooms unit cache directory, not by making application releases writable.

[The Chinese guide](WAN.md) includes detailed configuration tables, authenticated internal-health commands, existing-proxy notes and a troubleshooting table. Keep temporary logs and screenshots under output/wan/.

[Caddy HTTPS](https://caddyserver.com/docs/automatic-https) · [WebSocket proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy) · [Ubuntu UFW](https://ubuntu.com/server/docs/how-to/security/firewalls/)
