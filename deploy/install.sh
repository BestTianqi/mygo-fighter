#!/usr/bin/env bash
set -euo pipefail
hostname=${1:?Usage: sudo bash install.sh PUBLIC_HOSTNAME}
[[ "$hostname" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]+$ ]] || { echo 'Invalid hostname' >&2; exit 1; }
[[ $(id -u) == 0 ]] || { echo 'Run this installer as root' >&2; exit 1; }
script_dir=$(cd -- "$(dirname -- "$0")" && pwd)
# This installer owns the Caddy configuration on a dedicated test host. Refuse
# to replace an existing unrelated Caddy deployment.
if command -v caddy >/dev/null && ! test -f /etc/caddy/Caddyfile.before-mygo; then
  echo 'Caddy already exists. Integrate deploy/Caddyfile manually before installing.' >&2
  exit 1
fi
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends openjdk-21-jre-headless caddy curl
id mygo >/dev/null 2>&1 || useradd --system --user-group --home-dir /srv/mygo-fighter --no-create-home --shell /usr/sbin/nologin mygo
install -d -o root -g mygo -m 0750 /srv/mygo-fighter /srv/mygo-fighter/releases
if ! test -f /etc/mygo-fighter.env; then
  install -o root -g mygo -m 0640 "$script_dir/server.env.example" /etc/mygo-fighter.env
fi
install -o root -g root -m 0644 "$script_dir/mygo-fighter.service" /etc/systemd/system/mygo-fighter.service
if ! test -f /etc/caddy/Caddyfile.before-mygo; then
  cp -a /etc/caddy/Caddyfile /etc/caddy/Caddyfile.before-mygo
fi
# Render a single explicit hostname. No on-demand certificates or wildcard host matching.
sed "s/{\$GAME_HOSTNAME}/$hostname/" "$script_dir/Caddyfile" > /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
systemctl daemon-reload
systemctl enable caddy mygo-fighter
systemctl restart caddy
echo 'Host installed. Upload a packaged release and run deploy/activate.sh.'
