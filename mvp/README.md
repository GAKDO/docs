# TRACE MVP 문서

11/3 강사님 리뷰로 줄인 **MVP(11/9 완성)만** 정리한 문서입니다. 기준일 2026-11-04, 메인 주소 **https://gakdo.site**.

> 관리자가 웹에서 기기를 등록하고 출고 검사를 시작하면, 부스(Jetson)가 노트북 아래·위 2면을 조명 3개 × 카메라 2대 = 12장 찍고, Jetson의 YOLO11-seg가 흠집 폴리곤을 찾아 바로 "문제 있음/없음"을 띄운 뒤, capture-server가 등급(A~D)을 저장하고 관리자가 웹에서 결과를 본다.

| 문서 | 내용 |
|---|---|
| **[MVP 안내서 (그림판)](https://gakdo.github.io/docs/guide/)** | 처음 보는 사람용. 전체 구조 그림, 서비스별 설명, 기능 F1~F11 흐름을 그림과 함께. 원본 [guide/](../guide/) |
| [1. MVP 아키텍처](01-architecture.md) | 구성도(색 구분·포트), 검사 한 건 요약 흐름, 포트 목록 |
| [2. 서비스별 아키텍처](02-services.md) | web · gateway · auth-server · rental-server · capture-server · booth 앱 · 학습 · diagnostics-server · report-server · 진단 에이전트마다 레포·포트·저장소·API·이벤트·담당과 그림, 코드 기준 이벤트 흐름(11/8) |
| [3. 기능별 흐름](03-features.md) | 기능 F1~F11을 일어나는 순서대로: 목적·담당·단계·API·상태 변화·실패하면 |
| [4. A·B·C 담당](04-roles.md) | 사람별·기능별 담당, MVP 일정, 헷갈리는 경계 |
| [API 문서 (자동 생성)](https://gakdo.github.io/docs/api/mvp.html) | contracts OpenAPI에서 MVP API 25개만 뽑고, API마다 하는 일 · 누가 부르나 · 언제 · 어느 기능을 붙인 Redoc 쪽. 만드는 법은 [api-docs/](../api-docs/README.md) |
| [그림 파일](figures/) | 위 문서의 Mermaid 그림 SVG·PNG(발표용). [Codex 이미지 프롬프트](codex-prompts.md) |

## 11/4 현재 상태 (강사님 리뷰용)

> 11/4 기록입니다. 그 뒤 바뀐 것(11/8 확인): diagnostics-server는 11/6부터 Compose 기본 기동(진단 에이전트 페어링·업로드 시연), Grafana 대신 관리자 '성능' 화면(`/admin/benchmark`), 부스 태블릿 화면 `/booth`, web `VITE_ARCHIVED_FEATURES`는 `phoneCapture,pilot`만 남음(수령·반납 버튼 `laterCheckpoints`·고객 계정 `account`·리포트 `report`는 다시 보임). 지금 구성은 [1. MVP 아키텍처](01-architecture.md)를 보세요.

리뷰 날짜는 아직 정해지지 않았습니다(11/4 또는 11/5). 진행 순서·명령은 레포 밖 TRACE 프로젝트 공유 폴더(Claude 프로젝트 파일)의 `notices/2026-11-04-mvp-review-runbook.md`에 있습니다(GitHub에는 없음). 기준 시각 11/4 17시 40분(KST).

| 항목 | 상태 |
|---|---|
| 학교 서버 배포 | https://gakdo.site 개통. web·gateway·auth·rental·capture는 develop 이미지. 11/4 **report-server 다시 켬**(출고 시점이 봉인 SEALED까지 가게). 11/6 diagnostics-server, 11/8 report-server·inspect-worker(폰 사진 CPU 검사) 기본 기동 |
| 관리자 화면 | https://gakdo.site/admin 로그인 · 기기 등록 · 렌탈 열기 · 결과 조회. 기종 목록에 기준 사양 열·검색·정렬, 기종 등록에 GPU(선택)([web #52](https://github.com/GAKDO/web/pull/52), [contracts #24](https://github.com/GAKDO/contracts/pull/24), [rental_server #12](https://github.com/GAKDO/rental_server/pull/12)·[#13](https://github.com/GAKDO/rental_server/pull/13)). 렌탈 상세에 '부스에 넣을 ID'와 복사 버튼([web #53](https://github.com/GAKDO/web/pull/53)) |
| 부스 | 빠른 검사(기기 탭 → 12장 → 판정 → 업로드), 오염만이면 문제 없음([booth #28](https://github.com/GAKDO/booth/pull/28)). 화면을 단계형으로 다시 짬(기기 고르기 → 시리얼 확인 → 바닥면 → 뒤집기 → 상판 → 판정, [#29](https://github.com/GAKDO/booth/pull/29)), 판정 사진 큰 화면·실시간 캠 크기·gakdo.site 스타일([#30](https://github.com/GAKDO/booth/pull/30)). Playwright 화면 하네스가 CI에서 돎 |
| 시험 데이터 | 시험 렌탈 지우기 API와 `trace.checkpoint.purged`([contracts #25](https://github.com/GAKDO/contracts/pull/25), [rental_server #14](https://github.com/GAKDO/rental_server/pull/14)), 받는 쪽 [capture_server #14](https://github.com/GAKDO/capture_server/pull/14)·[report_server #6](https://github.com/GAKDO/report_server/pull/6)·[diagnostics_server #6](https://github.com/GAKDO/diagnostics_server/pull/6). 카메라 없이 촬영 완료·판정 상태를 만드는 TEST-0002 스크립트(같은 프로젝트 공유 폴더의 `booth-ui/make_test_0002.py`, GitHub에는 없음) |
| 시연 사진 | 카메라·조명 설치 전이라 **가짜 카메라 사진**으로 흐름만 보여 줌 |

**11/4 17시 이후 반영 (모두 머지)**

- 이벤트 역직렬화 버그: 다른 서버가 붙인 `__TypeId__` 헤더 때문에 리스너가 시점 이벤트를 버리던 문제를 고침([rental_server #16](https://github.com/GAKDO/rental_server/pull/16)·[capture_server #15](https://github.com/GAKDO/capture_server/pull/15)·[report_server #7](https://github.com/GAKDO/report_server/pull/7)). 학교 서버에서 TEST-0002를 다시 만들어 **출고 시점 봉인(SEALED)까지 확인**
- 부스 1회용 6자리 코드: 관리자가 렌탈 상세에서 발급([web #54](https://github.com/GAKDO/web/pull/54)) → 부스 출고 탭에 넣으면 기기·렌탈·시점 ID가 채워짐([booth #32](https://github.com/GAKDO/booth/pull/32)). 계약 [contracts #26](https://github.com/GAKDO/contracts/pull/26), 서버 [rental_server #15](https://github.com/GAKDO/rental_server/pull/15), 접근 규칙 [gateway #8](https://github.com/GAKDO/gateway/pull/8)(시험 렌탈 지우기 경로 포함)
- 부스 출고·반납 칸 ID 안내, 반납은 아직 못 쓴다는 안내: [booth #31](https://github.com/GAKDO/booth/pull/31)
- web은 C 담당이라 앞으로 web PR은 머지 전에 C에게 먼저 알립니다

**수령·반납은 왜 안 보이나**

- 서버에는 구현돼 있습니다. rental은 출고 → 수령 → 반납 순서로만 열고 앞 시점이 SEALED가 아니면 409, report는 해시 체인 순서대로만 봉인합니다.
- 관리자 화면에서만 숨겨 둔 상태입니다. web `Dockerfile`의 `VITE_ARCHIVED_FEATURES`에 `laterCheckpoints`(수령·반납 시작·렌탈 종료 버튼)와 `phoneCapture`(수령 QR)가 들어 있습니다.
- 숨김만 풀어도 수령은 바로 끝까지 가지 않습니다. capture가 촬영 출처로 시점 종류를 정해서 수령은 폰 촬영(전체 검사, 워커 정합 필요) 경로에 묶여 있고, 워커는 지금 학교 서버에서 돌지 않습니다. 세 시점 시연은 폰 수령 경로를 다시 켜는 11/10 이후 일입니다.

**아직 없는 것 (MVP 밖·남은 일)**

- 고객이 직접 렌탈을 여는 화면: 없음. 렌탈은 관리자가 /admin에서 엽니다(사용자·폰 화면은 2단계).
- report-server는 봉인용으로만 켰고 리포트·해시 체인 화면은 2단계. diagnostics-server(진단)는 꺼 둠. 반납 비교는 11/10 재도입 때.
- 기종 목록의 진단 등급·벤치마크 열: 11/10 이후 diagnostics 재도입 때([design/model-list-grades.md](../design/model-list-grades.md), docs #8).
- 기종: MBA13-M2만 시드. LG 그램·델은 부스 완성 뒤 실측해 추가.
- 실제 부스 사진·학습 모델: 조명·카메라 설치 뒤 촬영 → 집 PC 학습 → Jetson 엔진.

## 원본과 고치는 법

- API·이벤트·코드 값의 원본은 [GAKDO/contracts](https://github.com/GAKDO/contracts)(develop). 이 문서와 다르면 계약이 맞습니다.
- 포트·컨테이너의 원본은 gitops `compose/docker-compose.yml`, 부스 로컬 API의 원본은 booth `specs/001-booth-capture-tool/contracts/operator-web-api.md`.
- 안내서 그림·글은 `guide/data.mjs`가 원본이고(API 문서의 쉬운 설명도 여기서 붙음), 바꾼 뒤 `scripts/render-guide.sh`로 PNG를 다시 뽑습니다. 그 밖의 Markdown 그림은 Mermaid가 원본입니다. Mermaid를 고친 뒤 `scripts/render-mvp-figures.sh --png`로 `figures/`를 다시 뽑습니다(CI가 문법을 검사).
- 10/31 클러스터 기준 원래 설계는 [../architecture.md](../architecture.md)에 있습니다. 지금 배포와 다릅니다.
