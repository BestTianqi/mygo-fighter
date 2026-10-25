#!/usr/bin/env bash
set -euo pipefail
archive=${1:?Usage: sudo bash activate.sh ARCHIVE RELEASE_ID}
release=${2:?Usage: sudo bash activate.sh ARCHIVE RELEASE_ID}
[[ $(id -u) == 0 ]] || { echo 'Run this installer as root' >&2; exit 1; }
[[ "$release" =~ ^[a-zA-Z0-9][a-zA-Z0-9._-]+$ ]] || { echo 'Invalid release ID' >&2; exit 1; }
root=/srv/mygo-fighter
exec 9>/run/lock/mygo-fighter-deploy.lock
flock -n 9 || { echo 'Another deployment is running' >&2; exit 1; }
next="$root/.current-$$"
trap 'rm -f "$next"' EXIT
directory="$root/releases/$release"
test ! -e "$directory" || { echo 'Release already exists; use a new release ID' >&2; exit 1; }
install -d -o root -g mygo -m 0750 "$directory"
tar -xzf "$archive" --strip-components=1 -C "$directory"
test -x "$directory/bin/mygo-server"
test -f "$directory/web/index.html"
chown -R root:mygo "$directory"
previous=$(readlink "$root/current" || true)
switch_to() {
  ln -sfn "$1" "$next" && mv -Tf "$next" "$root/current"
}
restore_previous() {
  systemctl stop mygo-fighter
  if test -n "$previous"; then
    switch_to "$previous"
    systemctl start mygo-fighter
  fi
}
# Stop before changing the shared web root so an old JVM cannot serve a newer UI.
systemctl stop mygo-fighter
if ! switch_to "$directory" || ! systemctl start mygo-fighter; then
  restore_previous
  exit 1
fi
for attempt in $(seq 1 60); do
  if curl -fsS --max-time 2 http://127.0.0.1:8080/api/health | grep -q '"app":"mygo-scala"'; then
    if test -n "$previous"; then
      ln -sfn "$previous" "$root/previous"
    fi
    echo "Active release: $release"
    exit 0
  fi
  sleep 1
done
echo 'Release health check failed; restoring the previous release.' >&2
restore_previous
exit 1
