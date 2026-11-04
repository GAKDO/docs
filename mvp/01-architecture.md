# 1. 전체 아키텍처 (11/3 최소 MVP 기준)

기준일 2026-11-04. 근거는 gitops `compose/docker-compose.yml`(develop), contracts develop(1.0.0 + 11/3 추가분), booth·web develop 코드입니다.
메인 주소는 **https://gakdo.site** 입니다.

## 그림 규칙

| 그룹 | 색 | 선 | 들어가는 것 |
|---|---|---|---|
| ① 부스 사진 (MVP) | 초록 | 실선 | booth 앱(Jetson 안 부스 운영 웹 서버 :8320 + 촬영·탐지), capture-server, MinIO `trace-captures` |
| ② 폰 사진 (2단계) | 주황 | 점선 | web 폰 화면 `/capture`, inspect-worker |
| ③ 사진 무관 | 파랑 | MVP 실선, 2·3단계 점선 | web 관리자 `/admin`, gateway, auth-server, rental-server / report-server(2단계), diagnostics-server·agent(3단계) |
| 공통 인프라 | 회색 | 실선 | PostgreSQL, RabbitMQ, MinIO, Redis (학교 서버 10.116.64.12, Docker Compose) |
| 밖 | 흰색 | 실선 | 관리자 브라우저, 강사님 nginx(s2-nginx), 집 PC(학습만), 학교 MinIO(학습 데이터) |

뺀 것: Rancher, Argo CD, Cloudflare Tunnel(DNS만 씀), Grafana, InfluxDB, 집 PC 상시 워커.

## 1-1. 전체 구성도

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 320, "curve": "basis"}}}%%
flowchart TB
  classDef booth fill:#e3f6ea,stroke:#2f9e5b,stroke-width:2px,color:#123
  classDef phone fill:#fff1e0,stroke:#d9822b,stroke-width:2px,stroke-dasharray:6 4,color:#321
  classDef nophoto fill:#e6efff,stroke:#3b6fd8,stroke-width:2px,color:#123
  classDef later fill:#f3f6fc,stroke:#3b6fd8,stroke-width:1px,stroke-dasharray:6 4,color:#456
  classDef infra fill:#eef0f3,stroke:#6b7480,stroke-width:1.5px,color:#222
  classDef outside fill:#ffffff,stroke:#333,stroke-width:1px,color:#111

  adminBrowser["관리자 브라우저<br/>https://gakdo.site/admin"]:::outside
  ngx["강사님 nginx (s2-nginx)<br/>gakdo.site :443 · Let's Encrypt<br/>→ 10.116.64.12:8315"]:::outside

  subgraph G1["① 부스 사진 — MVP"]
    tablet["부스 태블릿 브라우저<br/>(부스 공유기 와이파이)"]:::outside
    boothApp["booth 앱 (GAKDO/booth, B)<br/>Jetson Orin Nano · trace-booth serve :8320<br/>부스 운영 웹 서버 + 로컬 API<br/>C920 ×2 · 조명 L1·L2·L3<br/>YOLO11-seg TensorRT FP16"]:::booth
    capture["capture-server :8080<br/>세트·사전 서명 URL·탐지·등급<br/>DB 스키마 capture·inspection"]:::booth
  end

  subgraph G2["② 폰 사진 — 2단계 (11/10~)"]
    phoneUi["web 폰 화면 /capture<br/>getUserMedia(HTTPS)"]:::phone
    inspectWorker["inspect-worker (GAKDO/ml)<br/>정합·폰 사진 흠집 탐지"]:::phone
  end

  subgraph G3["③ 사진 무관"]
    web["web nginx :8315 (유일한 입구)<br/>/admin 화면 · /api/ → gateway<br/>/trace-captures/ → MinIO"]:::nophoto
    gateway["gateway :8080<br/>JWT(JWKS) · 역할×경로 · 요청 제한"]:::nophoto
    auth["auth-server :8080<br/>관리자 로그인 · 부스 토큰 · JWKS<br/>DB 스키마 auth"]:::nophoto
    rental["rental-server :8080<br/>기기·기종·렌탈·시점<br/>DB 스키마 rental"]:::nophoto
    report["report-server (2단계)<br/>타임라인·해시 체인·SSE"]:::later
    diag["diagnostics-server + agent (3단계)<br/>배터리·SSD·부품"]:::later
  end

  subgraph INF["공통 인프라 — 학교 서버 10.116.64.12 · Docker Compose"]
    pg[("PostgreSQL 16 :5432<br/>스키마 auth·rental·capture·inspection")]:::infra
    mq["RabbitMQ :5672<br/>exchange trace.events"]:::infra
    minio[("MinIO :9000 (호스트 19000)<br/>버킷 trace-captures")]:::infra
    redis[("Redis :6379<br/>요청 제한·페어링 한도")]:::infra
  end

  homePc["집 PC RTX 4070 Ti — 학습만<br/>Label Studio · YOLO11-seg 학습<br/>→ model.onnx"]:::outside
  schoolMinio[("학교 MinIO storage.java21.net:8000<br/>trace-raw · labels · models")]:::outside

  style G1 fill:#f4fbf6,stroke:#2f9e5b,stroke-width:2px
  style G2 fill:#fff8ef,stroke:#d9822b,stroke-width:2px,stroke-dasharray:6 4
  style G3 fill:#f4f8ff,stroke:#3b6fd8,stroke-width:2px
  style INF fill:#f6f7f9,stroke:#6b7480,stroke-width:1.5px

  adminBrowser -->|HTTPS 443| ngx
  tablet -->|"HTTP :8320 로컬 API (부스 공유기 안)"| boothApp
  boothApp -->|"HTTPS 443 /api/v1 (부스 토큰·렌탈 목록·세트·탐지)"| ngx
  boothApp -->|"HTTPS 443 사진 PUT /trace-captures/ (사전 서명 URL)"| ngx
  ngx -->|HTTP 8315| web
  web -->|"/api/ → :8080"| gateway
  web -->|"/trace-captures/ → :9000"| minio
  gateway --> auth
  gateway --> rental
  gateway --> capture
  gateway -.->|JWKS 공개키| auth
  gateway --- redis
  auth --> pg
  rental --> pg
  capture --> pg
  capture -->|사전 서명 URL 발급| minio
  capture -->|"trace.capture.uploaded · trace.checkpoint.graded"| mq
  mq -->|시점 상태 갱신| rental
  auth --- redis

  boothApp -.->|"학습 사진 (TRAINING 모드)"| schoolMinio
  schoolMinio -.-> homePc
  homePc -->|"model.onnx → Jetson에서 엔진 빌드"| boothApp

  phoneUi -.-> ngx
  inspectWorker -.-> mq
  gateway -.-> report
  gateway -.-> diag
```

읽는 법

- **부스 화면은 Jetson 안의 작은 웹 서버**(booth 레포 `trace-booth serve`, 8320, B 담당)입니다. 태블릿은 부스 공유기 안에서 Jetson에만 붙고, gakdo.site와 통신하는 것은 Jetson뿐입니다. 자세히는 [2-6](02-services.md#2-6-booth-앱-jetson-안의-부스-운영-웹-서버--b--부스-사진).
- 밖에서 들어오는 길은 **443 하나**입니다. 강사님 nginx → 학교 서버 web nginx(8315) → gateway(8080) 순서이고, 사진 PUT도 같은 길로 MinIO에 갑니다.
- gateway·서버·인프라 포트는 Compose 네트워크 안에서만 열립니다(호스트에 안 엶).
- 학습 사진만 다른 길(학교 MinIO 8000)로 갑니다. 서비스용 MinIO와 다른 저장소입니다.

## 1-2. MVP 한 건의 흐름 (출고 검사 1번)

```mermaid
sequenceDiagram
  autonumber
  actor Admin as 관리자 (web /admin)
  participant GW as gateway
  participant RE as rental-server
  participant AU as auth-server
  participant BO as booth 앱 (Jetson)
  participant CA as capture-server
  participant S3 as MinIO trace-captures
  participant MQ as RabbitMQ trace.events

  Admin->>GW: POST /api/v1/auth/login
  GW->>AU: 로그인 → 액세스 JWT(ADMIN)
  Admin->>GW: POST /api/v1/devices · POST /api/v1/rentals
  Admin->>GW: POST /api/v1/rentals/{rentalId}/checkpoints (OUT 시작)
  GW->>RE: 렌탈 OPEN · 시점 OUT OPEN
  BO->>GW: POST /api/v1/auth/booth/token (client_id·secret)
  GW->>AU: 부스 JWT(BOOTH, 1시간)
  BO->>GW: GET /api/v1/rentals (검사 기다리는 기기)
  GW->>RE: OPEN 렌탈만
  Note over BO: 태블릿에서 기기 탭 → BOT 6장 → 뒤집어 TOP 6장<br/>(2면 × L1·L2·L3 × CAM1·CAM2 = 12장)
  BO->>GW: POST /api/v1/captures/sets (profile QUICK, 사진 12장 SHA-256)
  GW->>CA: 세트 생성
  CA-->>BO: 사진별 사전 서명 PUT URL (10분)
  BO->>S3: PUT 사진 12장 (https://gakdo.site/trace-captures/…)
  BO->>GW: POST /api/v1/captures/sets/{setId}/complete
  CA->>MQ: trace.capture.uploaded
  MQ->>RE: 시점 UPLOADED
  Note over BO: Jetson TensorRT 탐지 → 부스 화면에 폴리곤·문제 있음/없음
  BO->>GW: POST /api/v1/captures/sets/{setId}/detections (12장 analyzedPhotos)
  CA->>CA: 정합 없이 부스 탐지로 등급 (A = 문제 없음)
  CA->>MQ: trace.checkpoint.graded (compared=false)
  MQ->>RE: 시점 GRADED
  Admin->>GW: GET /api/v1/captures/checkpoints/{id}/inspection · /media
  GW->>CA: 사진 12장 URL · photoDefects 폴리곤 · 등급
```

## 1-3. 포트 목록

| 포트 | 어디 | 무엇 | 열림 |
|---|---|---|---|
| 443 | gakdo.site (s2-nginx) | 강사님 nginx → 10.116.64.12:8315 | 외부 |
| 8315 | 학교 서버 | web nginx(컨테이너 8080). `/` 화면, `/api/` → gateway, `/trace-captures/`·`/trace-derived/` → MinIO | 학교 내부망(밖에서는 443으로만) |
| 8080 | Compose 안 | gateway·auth-server·rental-server·capture-server (report·diagnostics는 `--profile full`일 때만) | 호스트에 안 엶 |
| 5432 | Compose 안 | PostgreSQL 16 | 호스트에 안 엶 |
| 6379 | Compose 안 | Redis | 호스트에 안 엶 |
| 5672 / 15672 | 학교 서버 | RabbitMQ / 관리 화면 | 127.0.0.1만 |
| 19000 / 19001 | 학교 서버 | MinIO API / 콘솔 (학교 MinIO 9000과 겹쳐서 옮김) | 127.0.0.1만 |
| 8320 | Jetson | 부스 운영 화면(`trace-booth serve`) | 부스 공유기만 |
| 8000 | storage.java21.net | 학교 MinIO, 학습 데이터 전용(trace-raw·labels·models) | 학교 |
| 8822 | s2.java21.net | SSH(배포용) | 외부 |

contracts OpenAPI의 `servers`에 남은 `localhost:8314`는 클러스터 시절 gateway 포트입니다. 지금 배포에서는 `https://gakdo.site`가 그 자리입니다.

## 1-4. 단계별로 켜지는 것

| 단계 | 기간 | 켜지는 컨테이너·앱 | 그림에서 |
|---|---|---|---|
| MVP | ~11/9 | web·gateway·auth-server·rental-server·capture-server + PostgreSQL·RabbitMQ·MinIO·Redis, booth 앱 | 실선 |
| 2단계 | 11/10~12 | report-server(해시 체인·SSE), web 폰 화면·3D 리포트·검증 페이지, inspect-worker, 수령 QR 링크, 반납 시점 비교 | 점선 |
| 3단계 | 시간 남으면 | diagnostics-server + agent, Grafana, 9면 × 4조명 전체 세트 | 점선 |

2·3단계 코드는 develop에 그대로 있고, Compose 기본 기동과 그림에서만 뺐습니다(`docker compose --profile full up -d`로 켬).
