#!/usr/bin/env bash
# mvp/*.md 안의 ```mermaid 블록을 mvp/figures/<문서>-<번호>.svg(·.png)로 뽑는다.
#   사용: scripts/render-mvp-figures.sh [--png] [출력 폴더(기본 mvp/figures)]
#   CI는 출력 폴더를 _site/figures로 줘서 문법 검사 겸 Pages에 올린다.
# 필요: Node 20+ (npx로 @mermaid-js/mermaid-cli를 받는다). 크롬 경로는 PUPPETEER_EXECUTABLE_PATH로 바꿀 수 있다.
set -euo pipefail

PNG=0
if [ "${1:-}" = "--png" ]; then PNG=1; shift; fi
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/mvp/figures}"
MMDC="${MMDC:-npx --yes -p @mermaid-js/mermaid-cli@12.2.0 mmdc}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT"
printf '{"args":["--no-sandbox"]}\n' > "$TMP/puppeteer.json"

count=0
for md in "$ROOT"/mvp/*.md; do
  name="$(basename "$md" .md)"
  # 블록마다 <문서>-<번호>.mmd로 나눈다
  awk -v dir="$TMP" -v name="$name" '
    /^```mermaid[[:space:]]*$/ { n++; f = sprintf("%s/%s-%d.mmd", dir, name, n); inblk = 1; next }
    inblk && /^```[[:space:]]*$/ { inblk = 0; close(f); next }
    inblk { print > f }
  ' "$md"
done
for mmd in "$TMP"/*.mmd; do
  [ -e "$mmd" ] || continue
  base="$(basename "$mmd" .mmd)"
  $MMDC -q -p "$TMP/puppeteer.json" -b white -i "$mmd" -o "$OUT/$base.svg"
  if [ "$PNG" = 1 ]; then
    $MMDC -q -p "$TMP/puppeteer.json" -b white -s 2 -i "$mmd" -o "$OUT/$base.png"
  fi
  count=$((count + 1))
done
echo "그림 ${count}개 → $OUT"
