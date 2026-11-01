# Spec Kit으로 구현하기

TRACE는 남은 구현을 [GitHub Spec Kit](https://github.com/github/spec-kit)(specify-cli 1.2.5)의 명세 주도 개발로 진행합니다. 팀원은 Claude 프로젝트(베타)에서 레포마다 세션을 열고, 기능 하나를 명세 → 계획 → 작업 → 구현 순서로 끝냅니다. 2026-11-01 기준.

| 문서 | 내용 |
| --- | --- |
| [constitution.md](constitution.md) | TRACE 헌법: 모든 기능이 지킬 원칙 6가지, 기술·형식, 개발 흐름 |
| [backlog.md](backlog.md) | 기능 27개의 순서·마감·담당과 `/speckit-specify`에 붙여 넣을 설명 |

## 각 레포에 들어간 것

| 경로 | 내용 |
| --- | --- |
| `.claude/skills/speckit-*` | Claude Code에서 쓰는 Spec Kit 명령 (`/speckit-specify` 등) |
| `.specify/` | 템플릿·스크립트·git 확장. 브랜치는 `feature/<번호>-<이름>`으로 만들어짐 |
| `.specify/memory/constitution.md` | 위 헌법의 사본 |
| `CLAUDE.md` | 레포 소개, 명령, Spec Kit 순서, `/speckit-plan`에 줄 기술 설명, 꼭 지킬 것 |

## 시작 전에 꼭 할 것

1. **Claude GitHub 앱을 GAKDO 조직에 설치**한다(https://claude.ai/connect-github). 없으면 세션이 GAKDO 레포에 푸시하지 못한다. 팀원도 각자 GitHub를 연결한다.
2. **main·develop 보호 규칙**을 건다: PR 필수, CI 통과 필수. Spec Kit 브랜치는 PR로만 합친다.
3. **CI용 조직 Secret·변수**를 넣는다([cicd.md](../cicd.md)의 "처음 한 번 설정할 것").
4. 세션에서 학교 인프라(`*.java21.net`)에 닿아야 하면 클라우드 환경의 네트워크 허용 목록에 더한다. 코드 작성과 단위 테스트에는 필요 없다.

## 세션 하나에서 기능 하나

- 세션은 **레포 하나·기능 하나**로 연다. 첫 메시지 예: `CLAUDE.md를 읽고 backlog의 RE1을 Spec Kit 순서대로 진행해 줘. develop에서 시작해.`
- 순서: `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement` → `/speckit-converge`. 단계마다 결과를 읽고 넘어간다.
- 클라우드 세션에는 Docker가 없다. Testcontainers 테스트는 세션에서 건너뛰고 GitHub Actions에서 돈다(서버 CLAUDE.md의 기술 설명에 들어 있음).
- PR은 `develop`으로, 본문에 요구사항 ID. `specs/<번호>-<이름>/` 문서도 같은 PR에 넣는다.

## 첫날 순서 (11/2)

| 누가 | 할 일 |
| --- | --- |
| A | contracts C1·C2·C3 (11/3 계약 고정). C1 초안이 나오면 B·C에게 리뷰 요청 |
| B | 부스 제작·맥북 촬영([booth/README.md](../booth/README.md)), 촬영 뒤 booth BO1·ml ML3 명세 시작 |
| C | web WE1 명세·계획. 서버가 없어도 C1 초안 + MSW 목으로 화면부터 |

계약(C1~C3)이 머지되기 전에는 서버 기능의 `/speckit-implement`를 시작하지 않는다(헌법 I).

## Spec Kit을 바꿀 때

버전은 1.2.5로 맞춘다. 올릴 때는 A가 한 레포에서 `uv tool install specify-cli==<버전>` 후 `specify init --here --force --non-interactive --integration claude --extension git`으로 다시 깔고, 헌법과 `branch_prefix: "feature"`를 되돌린 뒤 모든 레포에 같은 파일을 반영한다.
