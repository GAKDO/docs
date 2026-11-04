#!/usr/bin/env bash
# contracts OpenAPI → Redoc HTML (GitHub Pages용 _site/).
#   사용: api-docs/build.sh <contracts 폴더> [출력 폴더]
#   예:   api-docs/build.sh ../contracts _site
# 필요: Node 20+ (npx로 @redocly/cli를 받는다)
set -euo pipefail

CONTRACTS="${1:?contracts 폴더 경로를 주세요}"
OUT="${2:-_site}"
HERE="$(cd "$(dirname "$0")" && pwd)"
REDOCLY="${REDOCLY:-npx --yes @redocly/cli@2.73.0}"
OPENAPI="$(cd "$CONTRACTS/openapi" && pwd)"
COMMIT="$(git -C "$CONTRACTS" rev-parse --short HEAD 2>/dev/null || echo unknown)"

mkdir -p "$OUT/api" "$HERE/_build"
OUT="$(cd "$OUT" && pwd)"

# 1) MVP 통합: auth·rental·capture를 합친 뒤 MVP 경로만 남긴다
$REDOCLY join "$OPENAPI/auth-server.yaml" "$OPENAPI/rental-server.yaml" "$OPENAPI/capture-server.yaml" \
  --prefix-tags-with-info-prop title -o "$HERE/_build/joined.yaml"
(cd "$HERE" && $REDOCLY bundle mvp -o _build/mvp.yaml)
$REDOCLY build-docs "$HERE/_build/mvp.yaml" -o "$OUT/api/mvp.html" --title "TRACE MVP API (contracts $COMMIT)"
cp "$HERE/_build/mvp.yaml" "$OUT/api/mvp.yaml"

# 2) 서버별 전체 (2·3단계 경로 포함)
for f in auth-server rental-server capture-server report-server diagnostics-server; do
  $REDOCLY build-docs "$OPENAPI/$f.yaml" -o "$OUT/api/$f.html" --title "TRACE $f API (contracts $COMMIT)"
done

# 3) 첫 화면
sed "s/__CONTRACTS_COMMIT__/$COMMIT/g; s/__BUILT_AT__/$(date -u +%Y-%m-%dT%H:%MZ)/g" "$HERE/index.html" > "$OUT/index.html"
echo "만듦: $OUT (contracts $COMMIT)"
