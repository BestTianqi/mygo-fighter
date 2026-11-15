#!/bin/bash
# macOS portable launcher: only the bundled Java runtime and system tools are used.
set -eo pipefail
cd -- "$(dirname -- "$0")"

lan=0
if [ "${1:-}" = "--lan" ]; then lan=1; shift; fi
if [ "$#" -ne 0 ]; then echo 'Usage: start-game.sh [--lan]' >&2; exit 1; fi

edge_port=${MYGO_PORT:-8080}
lobby_port=${MYGO_LOBBY_PORT:-8079}
rooms_port=${MYGO_ROOMS_PORT:-8091}
for port in "$edge_port" "$lobby_port" "$rooms_port"; do
  case "$port" in ''|*[!0-9]*) echo 'Ports must be integers.' >&2; exit 1;; esac
  if [ "$port" -lt 1 ] || [ "$port" -gt 65535 ]; then
    echo 'Ports must be between 1 and 65535.' >&2; exit 1
  fi
done
if [ "$edge_port" = "$lobby_port" ] || [ "$edge_port" = "$rooms_port" ] || [ "$lobby_port" = "$rooms_port" ]; then
  echo 'The three server ports must be different.' >&2; exit 1
fi

test_game() {
  local health
  health=$(/usr/bin/curl --noproxy '*' -fsS --max-time 2 "$1/api/health" 2>/dev/null) || return 1
  echo "$health" | /usr/bin/grep -Eq '"app"[[:space:]]*:[[:space:]]*"mygo-scala"' &&
    echo "$health" | /usr/bin/grep -Eq '"ok"[[:space:]]*:[[:space:]]*true'
}

ips=()
if [ "$lan" -eq 1 ]; then
  for interface in $(/sbin/ifconfig -l); do
    # Physical Wi-Fi/Ethernet interfaces, excluding VPNs and virtual bridges.
    case "$interface" in en[0-9]*) ;; *) continue;; esac
    ip=$(/usr/sbin/ipconfig getifaddr "$interface" 2>/dev/null || true)
    case "$ip" in ''|127.*|169.254.*|198.18.*|198.19.*) continue;; esac
    ips+=("$ip")
  done
fi

server=''
has_lock=0
lock="run/launcher-$edge_port.pid"
cleanup() {
  trap '' INT TERM HUP
  if [ -n "$server" ]; then
    kill "$server" 2>/dev/null || true
    # Active WebSockets can delay http4s shutdown. Always release our ports.
    for ((attempt=0; attempt<50; attempt++)); do
      if ! kill -0 "$server" 2>/dev/null; then break; fi
      sleep 0.1
    done
    if kill -0 "$server" 2>/dev/null; then kill -KILL "$server" 2>/dev/null || true; fi
    wait "$server" 2>/dev/null || true
  fi
  if [ "$has_lock" -eq 1 ]; then rm -f -- "$lock"; fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM HUP

base="http://127.0.0.1:$edge_port"
mkdir -p run
if ! test_game "$base" && /usr/bin/shlock -f "$lock" -p "$$"; then
  has_lock=1
  for port in "$edge_port" "$lobby_port" "$rooms_port"; do
    if /usr/sbin/lsof -nP -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
      echo "Port $port is busy. Close the old game window or choose another port." >&2
      exit 1
    fi
  done
  java="$PWD/runtime/Contents/Home/bin/java"
  if [ ! -x "$java" ]; then echo 'Extract the complete macOS game ZIP before starting.' >&2; exit 1; fi
  export SERVICE_ROLE=all HOST=127.0.0.1 LOBBY_HOST=127.0.0.1 ROOMS_HOST=127.0.0.1
  if [ "$lan" -eq 1 ]; then export HOST=0.0.0.0; fi
  export PORT="$edge_port" LOBBY_PORT="$lobby_port" ROOMS_PORT="$rooms_port" WEB_ROOT="$PWD/web"
  unset LOBBY_URL ROOMS_DIRECT_URL INSTANCE_URL INTERNAL_SECRET TRUST_LOCAL_PROXY
  # Do not inherit developer JVM flags or agents into the bundled runtime.
  unset JAVA_TOOL_OPTIONS JDK_JAVA_OPTIONS _JAVA_OPTIONS CLASSPATH
  echo 'Starting MyGO Fighter. The browser will open automatically.'
  "$java" -XX:+IgnoreUnrecognizedVMOptions -Dfile.encoding=UTF-8 \
    -Dpolyglot.engine.WarnInterpreterOnly=false \
    "-Djava.io.tmpdir=$PWD/run" "-Dpolyglot.engine.userResourceCache=$PWD/run" \
    -cp 'lib/*' services.system.api.Main &
  server=$!
fi

deadline=$((SECONDS + 60))
until test_game "$base"; do
  if { [ -n "$server" ] && ! kill -0 "$server" 2>/dev/null; } || [ "$SECONDS" -ge "$deadline" ]; then
    echo 'The game server did not become ready. Check the error above and the original game window.' >&2
    exit 1
  fi
  sleep 0.3
done

play_url="$base/"
if [ "$lan" -eq 1 ]; then
  play_url+='?online=1'
  reachable=0
  for ip in "${ips[@]}"; do
    if test_game "http://$ip:$edge_port"; then reachable=1; fi
    play_url+="&lan=$ip"
    echo "Friend's address: http://$ip:$edge_port/?online=1"
  done
  if [ -z "$server" ] && [ "${#ips[@]}" -gt 0 ] && [ "$reachable" -eq 0 ]; then
    echo 'The current game is running in local mode. Close its window, then open start-lan.command again.' >&2
    exit 1
  fi
  if [ "${#ips[@]}" -eq 0 ]; then echo 'Connect the host to Wi-Fi or Ethernet to invite another device.'; fi
fi
echo "Open in browser: $play_url"
echo 'Keep the original game window open while playing. Press Ctrl+C there to stop.'
if [ "${MYGO_NO_BROWSER:-}" != 1 ]; then
  /usr/bin/open "$play_url" || echo 'Copy the address above into your browser.'
fi
if [ -n "$server" ]; then wait "$server"; fi
