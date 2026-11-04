# TRACE MVP 문서

11/3 강사님 리뷰로 줄인 **MVP(11/9 완성)만** 정리한 문서입니다. 기준일 2026-11-04, 메인 주소 **https://gakdo.site**.

> 관리자가 웹에서 기기를 등록하고 출고 검사를 시작하면, 부스(Jetson)가 노트북 아래·위 2면을 조명 3개 × 카메라 2대 = 12장 찍고, Jetson의 YOLO11-seg가 흠집 폴리곤을 찾아 바로 "문제 있음/없음"을 띄운 뒤, capture-server가 등급(A~D)을 저장하고 관리자가 웹에서 결과를 본다.

| 문서 | 내용 |
|---|---|
| **[MVP 안내서 (그림판)](https://gakdo.github.io/docs/guide/)** | 처음 보는 사람용. 전체 구조 그림, 서비스별 설명, 기능 F1~F11 흐름을 그림과 함께. 원본 [guide/](../guide/) |
| [1. MVP 아키텍처](01-architecture.md) | 구성도(색 구분·포트), 검사 한 건 요약 흐름, 포트 목록 |
| [2. 서비스별 아키텍처](02-services.md) | web · gateway · auth-server · rental-server · capture-server · booth 앱 · 학습마다 레포·포트·저장소·API·이벤트·담당과 그림 |
| [3. 기능별 흐름](03-features.md) | 기능 F1~F11을 일어나는 순서대로: 목적·담당·단계·API·상태 변화·실패하면 |
| [4. A·B·C 담당](04-roles.md) | 사람별·기능별 담당, MVP 일정, 헷갈리는 경계 |
| [API 문서 (자동 생성)](https://gakdo.github.io/docs/api/mvp.html) | contracts OpenAPI에서 MVP API 25개만 뽑고, API마다 하는 일 · 누가 부르나 · 언제 · 어느 기능을 붙인 Redoc 쪽. 만드는 법은 [api-docs/](../api-docs/README.md) |
| [그림 파일](figures/) | 위 문서의 Mermaid 그림 SVG·PNG(발표용). [Codex 이미지 프롬프트](codex-prompts.md) |

## 11/4 현재 상태 (강사님 리뷰용)

| 항목 | 상태 |
|---|---|
| 학교 서버 배포 | https://gakdo.site 개통. web `0e58744`, auth `9079927`, rental `b002d94`, capture `a97fe3b` (모두 develop 최신, ping ok) |
| 관리자 화면 | https://gakdo.site/admin 로그인 · 기기 등록 · 렌탈 열기 · 결과 조회. 시험 렌탈 TEST-0001이 출고 촬영 대기 |
| 부스 | booth develop에 빠른 검사(기기 탭 → 12장 → 판정 → 업로드) · 오염만이면 문제 없음(#28). 맥에서 부스 화면과 대기 기기 목록 확인 |
| 시연 사진 | 카메라·조명 설치 전이라 **가짜 카메라 사진**으로 흐름만 보여 줌 |

**아직 없는 것 (MVP 밖·남은 일)**

- 고객이 직접 렌탈을 여는 화면: 없음. 렌탈은 관리자가 /admin에서 엽니다(사용자·폰 화면은 2단계).
- report-server(해시 체인·리포트)·diagnostics-server(진단): 배포에서 꺼 둠. 반납 비교는 11/10 재도입 때.
- 기종: MBA13-M2만 시드. LG 그램·델은 부스 완성 뒤 실측해 추가.
- 실제 부스 사진·학습 모델: 조명·카메라 설치 뒤 촬영 → 집 PC 학습 → Jetson 엔진.

## 원본과 고치는 법

- API·이벤트·코드 값의 원본은 [GAKDO/contracts](https://github.com/GAKDO/contracts)(develop). 이 문서와 다르면 계약이 맞습니다.
- 포트·컨테이너의 원본은 gitops `compose/docker-compose.yml`, 부스 로컬 API의 원본은 booth `specs/001-booth-capture-tool/contracts/operator-web-api.md`.
- 안내서 그림·글은 `guide/data.mjs`가 원본이고(API 문서의 쉬운 설명도 여기서 붙음), 바꾼 뒤 `scripts/render-guide.sh`로 PNG를 다시 뽑습니다. 그 밖의 Markdown 그림은 Mermaid가 원본입니다. Mermaid를 고친 뒤 `scripts/render-mvp-figures.sh --png`로 `figures/`를 다시 뽑습니다(CI가 문법을 검사).
- 10/31 클러스터 기준 원래 설계는 [../architecture.md](../architecture.md)에 있습니다. 지금 배포와 다릅니다.
