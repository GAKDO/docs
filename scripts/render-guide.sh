#!/usr/bin/env bash
# 안내서 구성도 PNG 다시 뽑기. guide/data.mjs의 좌표·글을 고친 뒤 실행한다.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 -m http.server 8765 >/dev/null 2>&1 &
PID=$!
trap 'kill $PID' EXIT
sleep 1
node scripts/render-guide.mjs
