#!/usr/bin/env bash
set -euo pipefail
[[ $(id -u) == 0 ]] || { echo 'Run as root' >&2; exit 1; }
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
restore_current() {
  stop_role_set
  echo "Restoring current release: $current" >&2
  switch_to "$current" || return 1
  start_role_set || return 1
  health_all || return 1
}

previous=$(readlink "$root/previous" || true)
test -n "$previous" || { echo 'No previous release is retained; nothing to roll back to.' >&2; exit 1; }
test -x "$previous/bin/mygo-server" && test -f "$previous/web/index.html" || {
  echo "Previous release is incomplete: $previous" >&2
  exit 1
}
current=$(readlink "$root/current" || true)
test -n "$current" || { echo 'No active release is retained; nothing to restore on failure.' >&2; exit 1; }
test -x "$current/bin/mygo-server" || { echo "Current release is incomplete: $current" >&2; exit 1; }
stop_role_set
if ! switch_to "$previous"; then
  echo 'Cannot switch the current symlink; restarting the current release.' >&2
  restore_current || echo 'Current release did not become healthy; inspect systemctl status.' >&2
  exit 1
fi
if ! start_role_set; then
  echo 'Cannot start the previous release; restarting the current release.' >&2
  restore_current || echo 'Current release did not become healthy; inspect systemctl status.' >&2
  exit 1
fi
if ! health_all; then
  echo 'Previous release failed its health check; restarting the current release.' >&2
  restore_current || echo 'Current release did not become healthy; inspect systemctl status.' >&2
  exit 1
fi
ln -sfn "$current" "$root/previous"
echo "Rolled back to release: $previous"
