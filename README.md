# TRACE 문서

TRACE는 노트북 렌탈의 **출고·수령·반납 세 시점**에 외관(흠집 + 3D 트윈)과 내부 상태(배터리·부품·SSD·벤치마크)를 같은 기준으로 기록하고, 무엇이 언제 달라졌는지 해시 체인으로 증명하는 서비스입니다. AI응용프로젝트 최종 프로젝트 3팀.

이 레포는 팀이 정한 요구사항·설계·결정·운영 방법을 한곳에 모은 기록입니다. 2026-10-31 기준입니다.

## 문서 지도

| 문서 | 내용 | 먼저 볼 사람 |
|---|---|---|
| [architecture.md](architecture.md) | 한눈에 보는 구성도, 배포 흐름, 포트, 레포 12개 | 전원 |
| [decisions.md](decisions.md) | 10/30~10/31에 정한 것과 그 이유 (강사님 리뷰 포함) | 전원 |
| [cicd.md](cicd.md) | 블로그에서 가져온 CI/CD, 레포별 워크플로, 처음 설정할 Secret·변수 | A |
| [environment.md](environment.md) | 학교 서버·공유 인프라 주소, 포트 범위, Crowfoot·도메인·Gmail 준비 | A |
| [design/mvp-design.md](design/mvp-design.md) | **MVP 설계서**: 요구사항 50개, 아키텍처, 인증, ERD 규칙, 이벤트 계약, 확장성, 리뷰 결정 14건 | 전원 |
| [design/ddl.md](design/ddl.md) · [db/V1__init.sql](db/V1__init.sql) | 테이블 정의(스키마 7개·테이블 30개)와 실행 가능한 SQL | A |
| [design/rest-api-v0.md](design/rest-api-v0.md) | REST API v0, 역할 × 경로 표, 화면별로 부르는 API | A·C |
| [design/diagnostics-json-v0.md](design/diagnostics-json-v0.md) | 진단 결과 JSON v0, 다른 서비스 조사, macOS 실제 키 | A·B |
| [design/kickoff-plan.md](design/kickoff-plan.md) | 착수 준비: 일정, 공유 인프라 자원, 체크리스트 | 전원 |
| [speckit/README.md](speckit/README.md) | **Spec Kit으로 구현하기**: 헌법, 기능 26개 목록과 붙여 넣을 설명, 세션 진행 순서 | 전원 |
| [booth/README.md](booth/README.md) | **11/2 부스 제작·촬영 실행 가이드**: 시간표, 준비물, 만드는 순서, 촬영 순서, 막힐 때, 도면 그림 | 전원 |

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

## 레포 12개

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
| `gitops` | Kustomize overlays/school·Argo CD·PostgreSQL·Label Studio | A |
| `agent` | 진단 에이전트 (macOS·Windows) | B |
| `booth` | 부스 Jetson 앱·학습 데이터 촬영 도구 | B |
| `ml` | inspect-worker·recon-worker·데이터셋 빌더·학습 (집 PC) | A |

서버 레포 이름은 `_server`를 씁니다(예: `auth_server`). 쿠버네티스 이름에는 밑줄을 쓸 수 없어서, 클러스터 안 서비스와 이미지 이름은 `auth-server`처럼 하이픈으로 남습니다. 배포 워크플로가 레포 이름의 `_`를 `-`로 바꿔 씁니다.

## 주요 일정

| 날짜 | 할 일 |
|---|---|
| 11/2 | 도메인 구매(가비아) → HTTPS 인증서, 맥북 대여(오후) |
| 11/3 | 계약 고정: OpenAPI 5개·진단 JSON Schema·codes.yaml을 `contracts`에 |
| 11/4 | 그램 대여(9~15시) |
| 11/6 | B 진단 에이전트 착수(맥·Windows 실제 키 확인 포함), Jetson 30초 실측 |
| 11/10 | 기능 완성 점검: 팀 노트북 3대로 세 시점 흐름 |
| 11/13 | 코드 프리즈 |
