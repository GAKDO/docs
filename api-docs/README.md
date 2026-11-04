# API 문서 자동 생성 (Redoc → GitHub Pages)

[GAKDO/contracts](https://github.com/GAKDO/contracts) develop의 OpenAPI로 Redoc HTML을 만들어 **https://gakdo.github.io/docs/** 에 올립니다. 계약은 여기서 고치지 않습니다.

| 파일 | 하는 일 |
|---|---|
| `build.sh` | `redocly join`(auth·rental·capture) → `bundle mvp`(MVP 경로만) → `build-docs`. MVP 서버 3개(auth·rental·capture)의 전체 경로 쪽도 만듦 |
| `redocly.yaml` | MVP에 넣을 operationId 목록(`filter-in` 데코레이터). `mvp/03-features.md`와 같게 유지 |
| `index.html` | Pages 첫 화면 |
| `../.github/workflows/mvp-docs.yml` | PR: 빌드·그림 문법 검사만 / main 푸시·매일 09:00 KST·수동: 빌드 후 Pages 배포 |

로컬에서 보기

```bash
git clone https://github.com/GAKDO/contracts ../contracts -b develop
api-docs/build.sh ../contracts _site && python3 -m http.server -d _site 8000
```

MVP 경로를 더하거나 빼면 `redocly.yaml`의 목록과 `mvp/03-features.md`를 같이 고칩니다.

처음 한 번(레포 관리자): Settings → Pages → Source를 **GitHub Actions**로.
