#!/bin/bash
cd -- "$(dirname -- "$0")" || exit 1
exec /bin/bash ./start-game.command --lan "$@"
