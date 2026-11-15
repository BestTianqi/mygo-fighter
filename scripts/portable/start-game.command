#!/bin/bash
cd -- "$(dirname -- "$0")" || exit 1
/bin/bash ./start-game.sh "$@"
status=$?
if [ "$status" -ne 0 ] && [ "$status" -ne 130 ] && [ -t 0 ] && [ "${MYGO_NO_PAUSE:-}" != 1 ]; then
  read -r -p 'Press Return to close this window. '
fi
exit "$status"
