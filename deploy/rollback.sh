#!/usr/bin/env bash
set -euo pipefail
[[ $(id -u) == 0 ]] || { echo 'Run as root' >&2; exit 1; }
root=/srv/mygo-fighter
exec 9>/run/lock/mygo-fighter-deploy.lock
flock -n 9 || { echo 'Another deployment is running' >&2; exit 1; }
next="$root/.current-$$"
trap 'rm -f "$next"' EXIT
previous=$(readlink "$root/previous")
test -x "$previous/bin/mygo-server"
current=$(readlink "$root/current")
switch_to() {
  ln -sfn "$1" "$next" && mv -Tf "$next" "$root/current"
}
systemctl stop mygo-fighter
if ! switch_to "$previous" || ! systemctl start mygo-fighter || ! curl --retry 20 --retry-delay 1 --retry-connrefused --fail --silent --show-error --max-time 2 http://127.0.0.1:8080/api/health; then
  systemctl stop mygo-fighter
  switch_to "$current"
  systemctl start mygo-fighter
  exit 1
fi
ln -sfn "$current" "$root/previous"
