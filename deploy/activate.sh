#!/usr/bin/env bash
set -euo pipefail
archive=${1:?Usage: sudo bash activate.sh ARCHIVE RELEASE_ID [COMMIT]}
release=${2:?Usage: sudo bash activate.sh ARCHIVE RELEASE_ID [COMMIT]}
commit=${3:-}
[[ $(id -u) == 0 ]] || { echo 'Run this installer as root' >&2; exit 1; }
[[ "$release" =~ ^[a-zA-Z0-9][a-zA-Z0-9._-]+$ ]] || { echo 'Invalid release ID' >&2; exit 1; }
if test -n "$commit"; then
  [[ "$commit" =~ ^[a-zA-Z0-9][a-zA-Z0-9._-]*$ ]] || { echo 'Invalid commit ID' >&2; exit 1; }
fi
test -f "$archive" || { echo "Archive not found: $archive" >&2; exit 1; }
root=/srv/mygo-fighter
config_dir=/etc/mygo-fighter
test -f "$config_dir/base.env" || {
  echo 'This host is not installed for the three-service layout: /etc/mygo-fighter/base.env is missing.' >&2
  echo 'Run deploy/install.sh first. The legacy single-unit environment file is no longer read.' >&2
  exit 1
}
for unit in mygo-edge mygo-lobby mygo-rooms@; do
  test -f "/etc/systemd/system/$unit.service" || {
    echo "Missing /etc/systemd/system/$unit.service. Run deploy/install.sh first." >&2
    exit 1
  }
done
exec 9>/run/lock/mygo-fighter-deploy.lock
flock -n 9 || { echo 'Another deployment is running' >&2; exit 1; }
next="$root/.current-$$"
trap 'rm -f "$next"' EXIT

# Read one KEY=value line without executing the file as a shell script.
read_env() {
  local key=$1 file=$2 value=
  if test -f "$file"; then
    value=$(sed -n "s/^[[:space:]]*$key[[:space:]]*=[[:space:]]*//p" "$file" | tail -n 1)
    value=${value%$'\r'}
    value=${value%\"}; value=${value#\"}
    value=${value%\'}; value=${value#\'}
  fi
  printf '%s' "$value"
}

internal_secret=$(read_env INTERNAL_SECRET "$config_dir/base.env")
instances=$(read_env ROOMS_INSTANCES "$config_dir/base.env")
instances=${instances:-a}
instance_list=()
for instance in ${instances//,/ }; do
  [[ "$instance" =~ ^[a-z0-9][a-z0-9-]*$ ]] || { echo "Invalid ROOMS_INSTANCES entry: $instance" >&2; exit 1; }
  instance_list+=("$instance")
done
test ${#instance_list[@]} -gt 0 || { echo 'ROOMS_INSTANCES lists no instances' >&2; exit 1; }
edge_host=$(read_env HOST "$config_dir/edge.env"); edge_host=${edge_host:-127.0.0.1}
edge_port=$(read_env PORT "$config_dir/edge.env"); edge_port=${edge_port:-8080}
lobby_host=$(read_env LOBBY_HOST "$config_dir/lobby.env"); lobby_host=${lobby_host:-127.0.0.1}
lobby_port=$(read_env LOBBY_PORT "$config_dir/lobby.env"); lobby_port=${lobby_port:-8079}
rooms_host=$(read_env ROOMS_HOST "$config_dir/rooms.env"); rooms_host=${rooms_host:-127.0.0.1}
rooms_default_port=$(read_env ROOMS_PORT "$config_dir/rooms.env"); rooms_default_port=${rooms_default_port:-8091}

instance_value() {
  local instance=$1 key=$2 default=$3 value=
  value=$(read_env "$key" "$config_dir/rooms-$instance.env")
  printf '%s' "${value:-$default}"
}
instance_port() { instance_value "$1" ROOMS_PORT "$rooms_default_port"; }
instance_host() { instance_value "$1" ROOMS_HOST "$rooms_host"; }
probe_host() {
  case $1 in
    0.0.0.0|::) printf '127.0.0.1' ;;
    *) printf '%s' "$1" ;;
  esac
}
internal_curl() {
  if test -n "$internal_secret"; then
    curl -fsS --max-time 2 -H "X-Mygo-Internal: $internal_secret" "$1"
  else
    curl -fsS --max-time 2 "$1"
  fi
}
probe_rooms() { internal_curl "http://127.0.0.1:$1/internal/health"; }
probe_lobby() { internal_curl "http://127.0.0.1:$1/internal/health"; }
probe_edge() { curl -fsS --max-time 2 "http://$1:$2/api/health"; }
wait_healthy() {
  local label=$1 pattern=$2 attempt output
  shift 2
  for attempt in $(seq 1 90); do
    output=$("$@" 2>/dev/null) || output=
    if printf '%s' "$output" | grep -q -- "$pattern"; then
      return 0
    fi
    sleep 1
  done
  echo "Health check failed: $label" >&2
  return 1
}
stop_role_set() {
  local instance
  # Stop the public entry first, then the directory, then room execution.
  systemctl stop mygo-edge 2>/dev/null || true
  systemctl stop mygo-lobby 2>/dev/null || true
  for instance in "${instance_list[@]}"; do
    systemctl stop "mygo-rooms@$instance" 2>/dev/null || true
  done
}
start_role_set() {
  local instance
  # Room execution first, then the directory, then the public entry.
  for instance in "${instance_list[@]}"; do
    systemctl start "mygo-rooms@$instance" || return 1
  done
  systemctl start mygo-lobby || return 1
  systemctl start mygo-edge || return 1
}
health_all() {
  local instance
  for instance in "${instance_list[@]}"; do
    wait_healthy "rooms@$instance" '"ok":true' probe_rooms "$(instance_port "$instance")" || return 1
  done
  wait_healthy 'lobby' '"ok":true' probe_lobby "$lobby_port" || return 1
  wait_healthy 'edge' '"app":"mygo-scala"' probe_edge "$(probe_host "$edge_host")" "$edge_port" || return 1
}
switch_to() {
  ln -sfn "$1" "$next" && mv -Tf "$next" "$root/current"
}
previous=$(readlink "$root/current" || true)
restore_previous() {
  stop_role_set
  if test -z "$previous"; then
    echo 'No previous release to restore; the role units are stopped.' >&2
    return 0
  fi
  echo "Restoring previous release: $previous" >&2
  switch_to "$previous" || return 1
  start_role_set || return 1
  health_all || return 1
}

directory="$root/releases/$release"
test ! -e "$directory" || { echo 'Release already exists; use a new release ID' >&2; exit 1; }
install -d -o root -g mygo -m 0750 "$directory"
tar -xzf "$archive" --strip-components=1 -C "$directory"
test -x "$directory/bin/mygo-server"
test -f "$directory/web/index.html"
checksum=$(sha256sum "$archive" | awk '{print $1}')
chown -R root:mygo "$directory"
if ! stop_role_set; then
  echo 'Cannot stop the current roles; no files were switched.' >&2
  exit 1
fi
# Stop before changing the shared web root so an old JVM cannot serve a newer UI.
if ! switch_to "$directory"; then
  echo 'Cannot switch the current symlink; restoring the previous layout.' >&2
  restore_previous || echo 'Previous release did not become healthy; inspect systemctl status.' >&2
  exit 1
fi
if ! start_role_set; then
  echo 'Cannot start the new roles; restoring the previous layout.' >&2
  restore_previous || echo 'Previous release did not become healthy; inspect systemctl status.' >&2
  exit 1
fi
if ! health_all; then
  echo 'Health check failed; restoring the previous layout.' >&2
  restore_previous || echo 'Previous release did not become healthy; inspect systemctl status.' >&2
  exit 1
fi

activated_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
rooms_json=
for instance in "${instance_list[@]}"; do
  rooms_json="${rooms_json}${rooms_json:+,}{\"instance\":\"$instance\",\"host\":\"$(instance_host "$instance")\",\"port\":$(instance_port "$instance")}"
done
{
  printf '{\n'
  printf '  "schema": 2,\n'
  printf '  "layout": "edge-lobby-rooms",\n'
  printf '  "release": "%s",\n' "$release"
  if test -n "$commit"; then printf '  "commit": "%s",\n' "$commit"; fi
  printf '  "archiveSha256": "%s",\n' "$checksum"
  printf '  "activatedAt": "%s",\n' "$activated_at"
  printf '  "roles": {\n'
  printf '    "edge": {"host": "%s", "port": %s},\n' "$edge_host" "$edge_port"
  printf '    "lobby": {"host": "%s", "port": %s},\n' "$lobby_host" "$lobby_port"
  printf '    "rooms": [%s]\n' "$rooms_json"
  printf '  }\n}\n'
} > "$directory/deployment.json"
chown root:mygo "$directory/deployment.json"
chmod 0640 "$directory/deployment.json"
if test -n "$previous"; then
  ln -sfn "$previous" "$root/previous"
fi
echo "Active release: $release"
echo "Roles: edge :$edge_port, lobby :$lobby_port, rooms instance(s): ${instance_list[*]}."
