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
# 화면(build-docs)은 Redoc 2: 주소가 #operation/<id> 해시라 Pages에서 깨지지 않는다(redoc-theme.yaml 참고)
REDOC_DOCS="${REDOC_DOCS:-npx --yes @redocly/cli@1.34.23}"
THEME="$HERE/redoc-theme.yaml"
OPENAPI="$(cd "$CONTRACTS/openapi" && pwd)"
COMMIT="$(git -C "$CONTRACTS" rev-parse --short HEAD 2>/dev/null || echo unknown)"

mkdir -p "$OUT/api" "$HERE/_build"
OUT="$(cd "$OUT" && pwd)"

# 1) MVP 통합: auth·rental·capture를 합친 뒤 MVP 경로만 남긴다
$REDOCLY join "$OPENAPI/auth-server.yaml" "$OPENAPI/rental-server.yaml" "$OPENAPI/capture-server.yaml" \
  --prefix-tags-with-info-prop title -o "$HERE/_build/joined.yaml"
(cd "$HERE" && $REDOCLY bundle mvp -o _build/mvp.yaml && $REDOCLY bundle mvp --ext json -o _build/mvp.json)
# 처음 보는 사람용 설명(누가 부르나·언제·어느 기능)을 붙인다. 글의 원본은 guide/data.mjs
node "$HERE/enrich.mjs" "$HERE/_build/mvp.json" "$HERE/_build/mvp-guide.json"
$REDOC_DOCS build-docs "$HERE/_build/mvp-guide.json" --config "$THEME" --disableGoogleFont -o "$OUT/api/mvp.html" --title "TRACE MVP API · 쉬운 설명판 (contracts $COMMIT)"
# 안내서와 같은 글꼴(Pretendard)
sed -i 's#</head>#<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"></head>#' "$OUT/api/mvp.html"
cp "$HERE/_build/mvp.yaml" "$OUT/api/mvp.yaml"

# 2) MVP 서버 3개 전체 경로
for f in auth-server rental-server capture-server; do
  $REDOC_DOCS build-docs "$OPENAPI/$f.yaml" --config "$THEME" --disableGoogleFont -o "$OUT/api/$f.html" --title "TRACE $f API (contracts $COMMIT)"
done

# 3) 안내서(그림·서비스별·기능별 흐름)
mkdir -p "$OUT/guide"
cp "$HERE/../guide/"*.html "$HERE/../guide/"*.css "$HERE/../guide/"*.mjs "$HERE/../guide/"*.png "$OUT/guide/"

# 4) 첫 화면
sed "s/__CONTRACTS_COMMIT__/$COMMIT/g; s/__BUILT_AT__/$(date -u +%Y-%m-%dT%H:%MZ)/g" "$HERE/index.html" > "$OUT/index.html"
echo "만듦: $OUT (contracts $COMMIT)"
