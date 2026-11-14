#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then npm ci; fi
MYGO_OPEN_BROWSER=1 exec npm run lan
