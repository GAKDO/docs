# TRACE 문서

TRACE는 노트북 렌탈의 **출고·수령·반납 세 시점**에 외관(흠집 + 3D 트윈)과 내부 상태(배터리·부품·SSD·벤치마크)를 같은 기준으로 기록하고, 무엇이 언제 달라졌는지 해시 체인으로 증명하는 서비스입니다. AI응용프로젝트 최종 프로젝트 3팀.

이 레포는 팀이 정한 요구사항·설계·결정·운영 방법을 한곳에 모은 기록입니다. 10/31에 처음 쓰고 11/16에 지금 상태로 고쳤습니다.

## 지금 상태 (11/16)

- **서비스**: https://gakdo.site · [API 명세서](https://gakdo.github.io/docs/api/mvp.html) · [처음 보는 분을 위한 안내서](https://gakdo.github.io/docs/guide/) · [조직 소개](https://github.com/GAKDO)
- **MVP 흐름(11/3 방향 전환)**: 부스 12장 촬영 → 부스 Jetson YOLO11-seg(대회 모델 **v004**, TensorRT FP16, 12장 2.53초) → capture-server → 관리자가 AI 후보를 확정·기각(사람 검수) → 등급 A~D → 해시 체인 봉인과 공개 검증
- **11/8 이후 더한 것**: 사람 검수와 놓친 흠집 직접 추가, 공개 보유 노트북 3D, 반납 정산, 구글·깃허브 소셜 로그인과 탈퇴, 사이트 도우미 챗봇(Gemini → Ollama, GAKDO/chat-server), 사용자용 MCP 서버 `trace-mcp`, 진단 에이전트 한 줄 설치(`gakdo.site/agent.sh`)와 보안 상태 점검
- **운영**: 학교 서버 Docker Compose 하나로 돌고, develop에 머지하면 3분 안에 자동 배포됩니다(gitops `compose/ops/autodeploy.sh`). 쿠버네티스·Argo CD 구성은 클러스터용으로 남겨 두고 쓰지 않습니다
- **일정**: 11/13 코드 프리즈, 11/16 제출, **11/19 본선**. 요구사항별 구현 상태는 [design/requirements-status.md](design/requirements-status.md), 경진대회 준비는 [contest/](contest/README.md)

## 문서 지도

| 문서 | 내용 | 먼저 볼 사람 |
|---|---|---|
| [mvp/](mvp/README.md) | **11/3 최소 MVP 기준(지금 배포)**: 전체·서비스 단위 아키텍처, 기능별 API 명세, A/B/C 임무 분담, [자동 생성 API 문서](https://gakdo.github.io/docs/) | 전원 |
| [architecture.md](architecture.md) | 한눈에 보는 구성도, 배포 흐름, 포트, 레포 12개 | 전원 |
| [decisions.md](decisions.md) | 10/30부터 정한 것과 그 이유(강사님 리뷰, 11/6 InfluxDB 제외 등 날짜별) | 전원 |
| [cicd.md](cicd.md) | 블로그에서 가져온 CI/CD, 레포별 워크플로, 처음 설정할 Secret·변수 | A |
| [environment.md](environment.md) | 학교 서버·공유 인프라 주소, 포트 범위, Crowfoot·도메인·Gmail 준비 | A |
| [design/mvp-design.md](design/mvp-design.md) | **MVP 설계서**: 요구사항 50개, 아키텍처, 인증, ERD 규칙, 이벤트 계약, 확장성, 리뷰 결정 14건 | 전원 |
| [design/requirements-status.md](design/requirements-status.md) | 요구사항별 구현 위치·상태 (11/8 코드 감사) | 전원 |
| [design/ddl.md](design/ddl.md) · [db/V1__init.sql](db/V1__init.sql) | 지금 테이블 정의(스키마 7개·테이블 35개, 서버 마이그레이션 V2 이후 포함)·Mermaid ERD와, 처음 스키마 V1(31개) SQL | A |
| [design/rest-api-v0.md](design/rest-api-v0.md) | REST API 요약(원본은 contracts), 역할 × 경로 표, 화면별로 부르는 API, 계약·서버·gateway 대조 | A·C |
| [design/diagnostics-json-v0.md](design/diagnostics-json-v0.md) | 진단 결과 JSON v0, 다른 서비스 조사, macOS 실제 키 | A·B |
| [design/kickoff-plan.md](design/kickoff-plan.md) | 착수 준비: 일정, 공유 인프라 자원, 체크리스트 | 전원 |
| [speckit/README.md](speckit/README.md) | **Spec Kit으로 구현하기**: 헌법, 기능 27개 목록과 붙여 넣을 설명, 세션 진행 순서 | 전원 |
| [team/README.md](team/README.md) | **팀 운영**: 코드 컨벤션, 작업 보드(남은 작업), 날짜별 스탠드업 | 전원 |
| `guide/`·`api-docs/` | GitHub Pages로 내보내는 [안내서](https://gakdo.github.io/docs/guide/)와 [API 문서(Redoc)](https://gakdo.github.io/docs/api/mvp.html) 원본 | 전원 |
| [booth/README.md](booth/README.md) | **11/2 부스 제작·촬영 실행 가이드**: 시간표, 준비물, 만드는 순서, 촬영 순서, 막힐 때, 도면 그림 | 전원 |
| [contest/README.md](contest/README.md) | **경진대회(IT Festival 캡스톤) 준비**: 제출 11/16 16:00, 본선 11/19, 제출물·심사 기준, 체크리스트, 증거 목록, 지표(metrics/), 오픈소스·개인정보 | 전원 |
| [contest/presentation/](contest/presentation/README.md) · [contest/process.md](contest/process.md) | **제출한 발표 영상·PPT**와 날짜순 **개발 과정 기록**(10/30~11/16) | 전원 |

`design/`의 5개 파일은 팀이 함께 고친 Claude 문서를 Markdown으로 그대로 내보낸 것입니다. 그림(위젯)은 내보내지지 않아 자리 표시만 남았고, 같은 내용을 [architecture.md](architecture.md)에 Mermaid로 다시 그렸습니다.

## 원본과 도구

- MVP 설계서(Claude 문서, 원본): https://claude.ai/artifact/N4cytmEdkbFuN9nSomf4jb
- 착수 준비 문서(Claude 문서, 원본): https://claude.ai/artifact/Bt6De2e2K8PXoTAmHkP9NG
- 11/2 부스 실행 가이드(Claude 문서, 원본): https://claude.ai/artifact/BM3Q7r17FJpSY9tRDhhnn9
- 부스 도면: https://claude.ai/artifact/4i5UxWH21dzm3pcAqk2ThL
- Crowfoot ERD v1: https://crowfoot.java21.net/workspaces/68/models/688 (워크스페이스 TRACE)

설계가 바뀌면 원본(Claude 문서·Crowfoot)을 먼저 고치고, 이 레포의 `design/`을 다시 내보내 커밋합니다.

## 팀과 담당

| 역할 | 맡은 일 | 요구사항 |
|---|---|---|
| A | 서버 6개·인프라·배포·집 PC 작업(검사 워커·학습)·회원 | 30개 |
| B | 부스(Jetson)·학습 데이터 촬영 도구·라벨링·진단 에이전트 | 12개 |
| C | 웹·3D 화면·시점 비교·검증 페이지·회원 화면 | 8개 |

화면은 C가, 서버 API는 A가 만듭니다. 계약(API·이벤트·진단 JSON·코드 값)은 `contracts` 레포가 원본입니다.

## 레포 14개

| 레포 | 내용 | 담당 |
|---|---|---|
| `gateway` | JWT 검증·라우팅·요청 제한 (Spring Cloud Gateway) | A |
| `auth_server` | 회원·로그인·자격·QR 링크·페어링·JWKS·봉인 영수증 메일 | A |
| `rental_server` | 렌탈·기기·기종·시점·파일럿 | A |
| `capture_server` | 촬영 세트·사전 서명 URL·검사 결과·등급 | A |
| `diagnostics_server` | 진단 검증·비교·점검 플래그·추이 | A |
| `report_server` | 타임라인·해시 체인·검증·SSE | A |
| `web` | 관리자 화면·폰 촬영·3D 리포트·검증 페이지 | C |
| `contracts` | OpenAPI·진단 JSON Schema·이벤트 스키마·codes.yaml | A (B·C 리뷰) |
| `gitops` | 학교 서버 Compose·자동 배포·백업(지금 운영), Kustomize overlays/school·Argo CD(클러스터용) | A |
| `agent` | 진단 에이전트 (macOS·Windows, 한 줄 설치)·사용자용 MCP 서버 `trace-mcp` | B |
| `booth` | 부스 Jetson 앱(빠른 검사, TensorRT 탐지)·학습 데이터 촬영 도구 | B |
| `ml` | inspect-worker·recon-worker·데이터셋 빌더·학습 (집 PC) | A |
| `chat-server` | 사이트 도우미 챗봇 (Gemini 무료 API, 한도를 넘으면 Ollama qwen2.5) | B |
| `.github` | 조직 첫 화면 소개(https://github.com/GAKDO) | A |

서버 레포 이름은 `_server`를 씁니다(예: `auth_server`). 쿠버네티스 이름에는 밑줄을 쓸 수 없어서, 클러스터 안 서비스와 이미지 이름은 `auth-server`처럼 하이픈으로 남습니다. 배포 워크플로가 레포 이름의 `_`를 `-`로 바꿔 씁니다.

## 주요 일정

| 날짜 | 할 일 |
|---|---|
| 11/2 | 도메인 구매(가비아) → HTTPS 인증서, 맥북 대여(오후) |
| 11/3 | 계약 고정: OpenAPI 5개·진단 JSON Schema·codes.yaml을 `contracts`에. MVP 방향 전환(부스 12장 → Jetson 탐지 → capture-server → 관리자 화면) |
| 11/4 | 그램 대여(9~15시) |
| 11/6 | B 진단 에이전트 착수(맥·Windows 실제 키 확인 포함), Jetson 30초 실측 |
| 11/10 | 기능 완성 점검: 팀 노트북 3대로 세 시점 흐름 |
| 11/13 | 코드 프리즈, 시연 영상 촬영 |
| 11/16 | 서류·영상 제출(16:00) |
| 11/19 | 본선(09:20~12:00, IT융합대학 이벤트존) |
