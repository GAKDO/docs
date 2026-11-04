# 2. 서비스 단위 아키텍처

> 그림으로 쉽게 보기: [MVP 안내서 · 서비스별](https://gakdo.github.io/docs/guide/#services)

MVP에서 뜨는 서비스마다 요약 표에는 **레포 · 어디서 · 포트 · 저장소 · 담당**을, 서비스별 절에는 그림과 함께 하는 일 · 받는 API · 이벤트 · 환경 변수를 적었습니다. 그림 색은 [1. MVP 아키텍처](01-architecture.md)와 같습니다(초록 = 부스 사진, 파랑 = 사진 무관, 회색 = 인프라).

기능마다 어떤 순서로 이 서비스들을 거치는지는 [3. 기능별 흐름](03-features.md)에, 필드 단위 원본은 contracts OpenAPI와 [자동 생성 API 문서](https://gakdo.github.io/docs/)에 있습니다.

## 한눈에 보기

| 서비스 | 레포 | 어디서 | 포트 | 저장소 | 담당 |
|---|---|---|---|---|---|
| web (nginx + React 관리자 화면) | GAKDO/web | 학교 서버 Compose | 8080 → 호스트 8315 | 없음 | C |
| gateway | GAKDO/gateway | 학교 서버 Compose | 8080 | Redis (키 접두사 `trace:`) | A |
| auth-server | GAKDO/auth_server | 학교 서버 Compose | 8080 | PostgreSQL `auth` | A |
| rental-server | GAKDO/rental_server | 학교 서버 Compose | 8080 | PostgreSQL `rental` | A |
| capture-server | GAKDO/capture_server | 학교 서버 Compose | 8080 | PostgreSQL `capture`·`inspection`, MinIO `trace-captures` | A |
| booth 앱 (부스 화면 + 촬영 + 탐지) | GAKDO/booth | Jetson Orin Nano | 8320 (부스 공유기만) | Jetson 로컬 저장·큐 | B |
| 학습 | GAKDO/ml | 집 PC | 없음 | 학교 MinIO `trace-raw`·`models` | A (라벨링 연동은 B) |
| 인프라 4개 | GAKDO/gitops | 학교 서버 Compose | 5432 · 5672 · 9000 · 6379 | — | A |
| 계약 | GAKDO/contracts | — | — | OpenAPI · 이벤트 스키마 · codes.yaml | A (B·C 리뷰) |

공통 규칙: Spring 서버는 모두 Java 21 · Spring Boot 3.5.7, RFC 9457 Problem Details 오류, 이벤트는 RabbitMQ topic exchange `trace.events`, 외부 ID는 NanoID 21자(`PublicId`). 비밀은 학교 서버 `compose/.env`에만 있고 이름만 적습니다.

---

## 2-1. web (관리자 화면) — C

```mermaid
flowchart LR
  classDef nophoto fill:#e6efff,stroke:#3b6fd8,stroke-width:2px,color:#123
  classDef infra fill:#eef0f3,stroke:#6b7480,color:#222
  classDef outside fill:#fff,stroke:#333,color:#111
  b["관리자 브라우저"]:::outside -->|443 → 8315| n["web nginx :8080<br/>React 18 + Vite 정적 파일<br/>/admin · /version.txt"]:::nophoto
  n -->|"/api/ → API_UPSTREAM=gateway:8080"| g["gateway"]:::nophoto
  n -->|"/trace-captures/ · /trace-derived/ → MINIO_UPSTREAM=minio:9000"| m[("MinIO")]:::infra
```

| 항목 | 값 |
|---|---|
| 하는 일 | 관리자 로그인, 기기·기종 등록, 렌탈 열기·출고 시점 시작, 검사 결과(사진 12장 격자 + 흠집 폴리곤 + 등급) 보기 |
| 기능 ID | WE1 |
| 화면 | `/admin/login`, `/admin/models`, `/admin/devices`, `/admin/rentals`, `/admin/rentals/:rentalId`, `/admin/inspections`, `/admin/inspections/:rentalId/:checkpointId` |
| 부르는 API | auth `login`·`refresh`·`logout`·`me`, rental 기기·기종·렌탈·시점, capture `inspection`·`media` |
| 토큰 | 액세스 JWT는 메모리에만, 리프레시는 HttpOnly 쿠키 |
| 환경 변수 | `API_UPSTREAM`, `MINIO_UPSTREAM` |

## 2-2. gateway — A

```mermaid
flowchart LR
  classDef nophoto fill:#e6efff,stroke:#3b6fd8,stroke-width:2px,color:#123
  classDef infra fill:#eef0f3,stroke:#6b7480,color:#222
  w["web nginx /api/"]:::nophoto --> gw["gateway :8080<br/>Spring Cloud Gateway (WebFlux)<br/>JWT 검증 · 역할×경로 · 요청 제한"]:::nophoto
  gw -->|"/api/v1/auth/**"| a["auth-server :8080"]:::nophoto
  gw -->|"/api/v1/rentals/** · /devices/** · /device-models/** · /pilot/**"| r["rental-server :8080"]:::nophoto
  gw -->|"/api/v1/captures/**"| c["capture-server :8080"]:::nophoto
  gw -->|"JWKS /.well-known/jwks.json"| a
  gw --- redis[("Redis :6379<br/>키 접두사 trace:")]:::infra
```

| 항목 | 값 |
|---|---|
| 하는 일 | 모든 `/api/v1/**`의 유일한 입구. auth-server JWKS로 JWT 서명 검증, 역할(MVP는 ADMIN·BOOTH) × 경로 표로 막기, 로그인(`POST /api/v1/auth/login`)은 Redis로 IP당 1분 10번 요청 제한 |
| 기능 ID | GW1 |
| 받는 API | 자체 API 없음(라우팅). JWKS는 밖으로 열지 않음 |
| 환경 변수 | `AUTH_SERVER_URL`, `RENTAL_SERVER_URL`, `CAPTURE_SERVER_URL`, `REDIS_PASSWORD` |

## 2-3. auth-server — A

```mermaid
flowchart LR
  classDef nophoto fill:#e6efff,stroke:#3b6fd8,stroke-width:2px,color:#123
  classDef infra fill:#eef0f3,stroke:#6b7480,color:#222
  gw["gateway"]:::nophoto --> a["auth-server :8080<br/>로그인 · 부스 토큰 · JWKS<br/>JWT RS256 (Nimbus)"]:::nophoto
  a --> pg[("PostgreSQL 스키마 auth<br/>account · client_credential")]:::infra
```

| 항목 | 값 |
|---|---|
| 하는 일 | 관리자 로그인(액세스 JWT 15분 + 리프레시 쿠키 7일), 부스 client_id·secret → BOOTH JWT(1시간), JWT 공개키(JWKS) |
| 기능 ID | AU1 |
| MVP API | `login`, `refreshToken`, `logout`, `getMe`, `issueBoothToken`, `getJwks`(내부) |
| 환경 변수 | `JWT_PRIVATE_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`(처음 뜰 때 관리자 계정 생성), `BOOTH_CLIENT_ID`, `BOOTH_CLIENT_SECRET`, `DB_USERNAME`, `DB_PASSWORD` |

## 2-4. rental-server — A

```mermaid
flowchart LR
  classDef nophoto fill:#e6efff,stroke:#3b6fd8,stroke-width:2px,color:#123
  classDef infra fill:#eef0f3,stroke:#6b7480,color:#222
  gw["gateway"]:::nophoto --> r["rental-server :8080<br/>기기 · 기종 · 렌탈 · 시점"]:::nophoto
  r --> pg[("PostgreSQL 스키마 rental<br/>device_model · device · rental · checkpoint")]:::infra
  mq["RabbitMQ trace.events"]:::infra -->|"구독 trace.capture.uploaded · trace.checkpoint.graded<br/>큐 trace.rental.checkpoints (DLQ 있음)"| r
```

| 항목 | 값 |
|---|---|
| 하는 일 | 기기 등록·검색, 기종(치수) 관리, 렌탈 열기, MVP는 렌탈당 출고(OUT) 시점 하나(수령 RCV·반납 RET는 MVP 밖), 이벤트로 시점 상태(OPEN → CAPTURED → GRADED) 갱신. 렌탈·시점 짝이 맞지 않는 이벤트는 DLQ |
| 기능 ID | RE1 |
| MVP API | `listRentals`(ADMIN 전체 · BOOTH는 OPEN만), `createRental`, `getRental`, `startCheckpoint`, `createDevice`, `listDevices`, `updateDevice`, `listDeviceModels`, `getDeviceModel`, `upsertDeviceModel` |
| 시드 | 기종 `MBA13-M2`(V2). 그램·델은 실측 뒤 추가 |

## 2-5. capture-server — A (① 부스 사진)

```mermaid
flowchart LR
  classDef booth fill:#e3f6ea,stroke:#2f9e5b,stroke-width:2px,color:#123
  classDef nophoto fill:#e6efff,stroke:#3b6fd8,stroke-width:2px,color:#123
  classDef infra fill:#eef0f3,stroke:#6b7480,color:#222
  gw["gateway"]:::nophoto --> c["capture-server :8080<br/>촬영 세트 · 사전 서명 URL<br/>부스 탐지 저장 · 등급"]:::booth
  c --> pg[("PostgreSQL 스키마 capture · inspection<br/>capture_set · photo · defect · grade_result")]:::infra
  c -->|"AWS SDK v2 S3 Presigner<br/>PUT 10분 · GET 10분"| s3[("MinIO 버킷 trace-captures")]:::infra
  c -->|"발행 trace.capture.uploaded · trace.checkpoint.graded"| mq["RabbitMQ trace.events"]:::infra
```

| 항목 | 값 |
|---|---|
| 하는 일 | 사진마다 면·조명·카메라·SHA-256을 받아 사전 서명 PUT URL 발급, 완료 때 해시 확인, 부스 탐지(원본 사진 px 폴리곤) 저장, **QUICK 세트는 정합 없이 부스 탐지로 등급**(A = 문제 없음, B~D = 문제 있음), 관리자 화면용 사진 보기 URL |
| 기능 ID | CA1 세트·URL, CA2 검사 결과·등급(QUICK) |
| 등급 규칙 | grade-rules-v1: 균열 1개 이상 또는 찍힘 3개 이상 D, 찍힘 1~2개 또는 긁힘 5개 이상 C, 긁힘 1~4개 B, 흠집 없음 A. 같은 면·같은 카메라에서 조명만 다른 사진의 흠집은 20 px 안이면 하나로 셈 |
| MVP API | `createCaptureSet`, `reissueUploadUrls`, `completeCaptureSet`, `saveBoothDetections`, `getCaptureSet`, `getCheckpointInspection`, `getCheckpointMedia` |
| 코드 값 | `capture.profile` = FULL·QUICK, `capture.face_required_quick.BOOTH` = TOP·BOT (contracts #20) |
| 환경 변수 | `MINIO_PUBLIC_BASE`(= `PUBLIC_BASE_URL` = `https://gakdo.site`), `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` |

## 2-6. booth 앱 (Jetson 안의 부스 운영 웹 서버) — B (① 부스 사진)

**부스 화면은 web 레포가 아니라 booth 레포가 만듭니다.** Jetson에서 `trace-booth serve`를 실행하면 Python 표준 라이브러리(`http.server.ThreadingHTTPServer`)로 만든 **작은 웹 서버**가 `0.0.0.0:8320`에 뜨고, 같은 부스 공유기(와이파이)에 붙은 태블릿 브라우저가 `http://<Jetson IP>:8320`으로 엽니다. 화면 파일은 `src/trace_booth/static/index.html` 하나이고, 화면이 부르는 `/api/...`는 **Jetson 안에서 처리되는 로컬 API**입니다(서버 API가 아님).

태블릿은 gakdo.site에 직접 붙지 않습니다. **서버와 통신하는 것은 Jetson의 booth 앱뿐**이고, 부스 비밀(client_id·secret)과 부스 JWT도 Jetson에만 있습니다.

```mermaid
flowchart LR
  classDef booth fill:#e3f6ea,stroke:#2f9e5b,stroke-width:2px,color:#123
  classDef outside fill:#fff,stroke:#333,color:#111
  classDef nophoto fill:#e6efff,stroke:#3b6fd8,stroke-width:2px,color:#123
  subgraph LAN["부스 공유기 (같은 와이파이, 밖에서 안 열림)"]
    t["부스 태블릿 브라우저<br/>http://Jetson-IP:8320"]:::outside
    subgraph J["Jetson Orin Nano (jetson2) · Python 3.10"]
      web["trace-booth serve :8320<br/>운영 화면 index.html + 로컬 API /api/..."]:::booth
      cam["카메라 C920 ×2<br/>CAM1 앞 반 · CAM2 뒤 반<br/>OpenCV + v4l2-ctl 고정값"]:::booth
      trt["YOLO11-seg TensorRT FP16<br/>640px 타일 · 흠집 폴리곤"]:::booth
      q["로컬 저장·큐<br/>실패분 재시도 (trace-booth retry)"]:::booth
    end
  end
  style LAN fill:#ffffff,stroke:#333,stroke-dasharray:4 3
  style J fill:#f4fbf6,stroke:#2f9e5b,stroke-width:2px
  t -->|"HTTP :8320 로컬 API"| web
  web --> cam
  web --> trt
  web --> q
  web -->|"HTTPS 443 https://gakdo.site/api/v1<br/>부스 토큰 · 렌탈 목록 · 세트 · 완료 · 탐지"| gw["강사님 nginx → web nginx → gateway"]:::nophoto
  web -->|"HTTPS 443 사진 PUT<br/>https://gakdo.site/trace-captures/… (사전 서명 URL)"| gw
```

| 항목 | 값 |
|---|---|
| 담당 | **B** (화면·로컬 API·카메라·탐지 모두 booth 레포). 서버 쪽 API(auth·rental·capture)는 A, 관리자 결과 화면은 C |
| 하는 일 | 검사 기다리는 기기 목록 → 탭 → BOT 6장 → 뒤집어 TOP 6장(L1·L2·L3 × CAM1·CAM2) → Jetson 탐지 → 화면에 폴리곤과 "문제 있음/없음" → 세트·사진·탐지 업로드 |
| 기능 ID | BO1 촬영(학습 사진 TRAINING 모드 포함), BO2 Jetson 탐지 |
| 실행 | `trace-booth serve [--host 0.0.0.0] [--port 8320]`. 엔진 빌드는 `trace-booth build-engine --onnx model.onnx` |
| 열림 | 8320은 부스 공유기 안에서만. 로그인 없음(부스 공유기에 붙은 기기만 쓴다는 전제) → 공유기를 외부에 포트포워딩하지 않음 |
| 환경 변수 | `TRACE_API_URL`(= `https://gakdo.site`), `TRACE_BOOTH_CLIENT_ID`, `TRACE_BOOTH_CLIENT_SECRET`, `TRACE_BOOTH_SHOTLIST`(= `mvp`, 12장), `TRACE_BOOTH_PRESETS`, `TRACE_BOOTH_ENGINE` |

부스 화면 로컬 API (Jetson :8320, booth `src/trace_booth/web.py`)

| 메서드·경로 | 화면 동작 | 안에서 하는 일 |
|---|---|---|
| `GET /api/rentals/waiting` | 검사 기다리는 기기 목록 | 서버 `GET /api/v1/rentals`(부스 토큰) → 지금 시점이 OPEN인 렌탈만 |
| `POST /api/sessions` | 기기 탭 → 세션 시작 | 로컬 세션 만들기(렌탈·시점 ID 기억) |
| `GET /api/live/{camera}` | 카메라 미리보기 | C920 프레임 |
| `POST /api/sessions/current/shoot` · `retake` · `next` | 찍기 · 다시 찍기 · 다음 면(뒤집기) | 조명 순서대로 저장, 해시 계산 |
| `POST /api/sessions/current/complete` | 촬영 끝 | 서버 `POST /captures/sets`(QUICK) → 사진 PUT → `POST …/complete` |
| `POST /api/sessions/current/detect` | 판정 | TensorRT 탐지 → 서버 `POST …/detections`(12장 analyzedPhotos) |
| `GET /api/sessions/current/result` | 결과 화면 | 폴리곤·문제 있음/없음 |
| `POST /api/sessions/current/submit` | 학습 사진 올리기(TRAINING) | 학교 MinIO `trace-raw`로 직접 |
| `GET /api/queue` · `GET /api/shots/{id}/thumbnail` | 업로드 상태 · 썸네일 | 로컬 큐 조회 |

로컬 API는 계약(contracts) 밖이라 booth `specs/001-booth-capture-tool/contracts/operator-web-api.md`가 원본입니다.

## 2-7. 학습 (집 PC, GAKDO/ml) — A

```mermaid
flowchart LR
  classDef outside fill:#fff,stroke:#333,color:#111
  classDef booth fill:#e3f6ea,stroke:#2f9e5b,stroke-width:2px,color:#123
  raw[("학교 MinIO :8000<br/>trace-raw")]:::outside --> ls["Label Studio (집 PC 로컬)<br/>폴리곤 4클래스"]:::outside
  ls --> ds["데이터셋 빌더<br/>labels 버전"]:::outside --> tr["YOLO11-seg 학습<br/>RTX 4070 Ti"]:::outside
  tr -->|"model.onnx → models 버킷"| j["Jetson: TensorRT FP16 엔진 빌드"]:::booth
```

| 항목 | 값 |
|---|---|
| 하는 일 | 부스 학습 사진 라벨링 → 데이터셋 → 학습 → ONNX. 집 PC는 학습만 하고 상시 서비스를 띄우지 않음 |
| 기능 ID | ML1 데이터셋·학습 기록(A), ML3 Label Studio 연동(B) |
