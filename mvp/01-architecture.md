# 1. MVP 아키텍처

기준일 2026-11-04. **11/9 MVP에서 실제로 뜨는 것만** 그렸습니다. 근거는 gitops `compose/docker-compose.yml`(기본 기동), contracts develop, booth·web develop 코드입니다. 메인 주소는 **https://gakdo.site** 입니다.

MVP 한 줄: 관리자가 웹에서 기기를 등록하고 출고 검사를 시작하면, 부스(Jetson)가 노트북 아래(BOT)·위(TOP)를 조명 3개 × 카메라 2대 = **12장** 찍고, Jetson의 YOLO11-seg가 흠집 폴리곤을 찾아 바로 "문제 있음/없음"을 띄운 뒤, capture-server가 등급을 저장하고 관리자가 웹에서 결과를 봅니다.

## 1-1. 구성도

![TRACE MVP 아키텍처](../guide/trace-mvp-architecture.png)

> 위 그림은 [MVP 안내서](https://gakdo.github.io/docs/guide/)의 그림입니다(원본 `guide/data.mjs`, 어두운 배경판 [PNG](../guide/trace-mvp-architecture-dark.png)). 처음 보는 분은 안내서에서 서비스별 설명과 기능별 흐름을 그림과 함께 보면 쉽습니다. 아래 Mermaid 그림은 같은 내용의 글자판입니다.

<details>
<summary>Mermaid 글자판 열기</summary>

| 색 | 묶음 | 들어가는 것 |
|---|---|---|
| 초록 | 부스 사진 | 부스 태블릿, booth 앱(Jetson), capture-server |
| 파랑 | 사진 무관 | web nginx(관리자 화면), gateway, auth-server, rental-server |
| 회색 | 공통 인프라 (학교 서버 Compose) | PostgreSQL, RabbitMQ, MinIO, Redis |
| 흰색 | 밖 | 관리자 브라우저, 강사님 nginx, 집 PC(학습), 학교 MinIO(학습 사진) |

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 320}}}%%
flowchart TB
  classDef booth fill:#e3f6ea,stroke:#2f9e5b,stroke-width:2px,color:#123
  classDef nophoto fill:#e6efff,stroke:#3b6fd8,stroke-width:2px,color:#123
  classDef infra fill:#eef0f3,stroke:#6b7480,stroke-width:1.5px,color:#222
  classDef outside fill:#ffffff,stroke:#333,stroke-width:1px,color:#111

  adminBrowser["관리자 브라우저<br/>https://gakdo.site/admin"]:::outside
  ngx["강사님 nginx (s2-nginx)<br/>gakdo.site :443 · Let's Encrypt<br/>→ 10.116.64.12:8315"]:::outside

  subgraph BOOTH["부스 (부스 공유기 와이파이)"]
    tablet["부스 태블릿 브라우저"]:::outside
    boothApp["booth 앱 · Jetson Orin Nano<br/>trace-booth serve :8320<br/>부스 화면 + 로컬 API<br/>C920 ×2 · 조명 L1·L2·L3<br/>YOLO11-seg TensorRT FP16"]:::booth
  end

  subgraph SCHOOL["학교 서버 10.116.64.12 · Docker Compose"]
    web["web nginx :8315 (유일한 입구)<br/>/admin 화면 · /api/ → gateway<br/>/trace-captures/ → MinIO"]:::nophoto
    gateway["gateway :8080<br/>JWT 검증 · 역할×경로 · 요청 제한"]:::nophoto
    auth["auth-server :8080<br/>관리자 로그인 · 부스 토큰 · JWKS"]:::nophoto
    rental["rental-server :8080<br/>기종 · 기기 · 렌탈 · 시점"]:::nophoto
    capture["capture-server :8080<br/>촬영 세트 · 사전 서명 URL<br/>탐지 저장 · 등급"]:::booth
    pg[("PostgreSQL :5432<br/>스키마 auth · rental · capture · inspection")]:::infra
    mq["RabbitMQ :5672<br/>exchange trace.events"]:::infra
    minio[("MinIO :9000 (호스트 19000)<br/>버킷 trace-captures")]:::infra
    redis[("Redis :6379")]:::infra
  end

  homePc["집 PC RTX 4070 Ti (학습만)<br/>Label Studio · YOLO11-seg → model.onnx"]:::outside
  schoolMinio[("학교 MinIO storage.java21.net:8000<br/>trace-raw · models")]:::outside

  style BOOTH fill:#f4fbf6,stroke:#2f9e5b,stroke-width:2px
  style SCHOOL fill:#f6f7f9,stroke:#6b7480,stroke-width:1.5px

  adminBrowser -->|"① HTTPS 443"| ngx
  tablet -->|"HTTP :8320"| boothApp
  boothApp -->|"② HTTPS 443 /api/v1"| ngx
  boothApp -->|"③ HTTPS 443 사진 PUT /trace-captures/"| ngx
  ngx -->|"HTTP 8315"| web
  web -->|"/api/"| gateway
  web -->|"/trace-captures/"| minio
  gateway --> auth
  gateway --> rental
  gateway --> capture
  auth --> pg
  rental --> pg
  capture --> pg
  gateway --- redis
  capture -->|"사전 서명 URL · 해시 확인"| minio
  capture -->|"uploaded · graded 이벤트"| mq
  mq -->|"시점 상태 갱신"| rental
  boothApp -.->|"학습 사진"| schoolMinio
  schoolMinio -.-> homePc
  homePc -.->|"model.onnx"| boothApp
```

</details>

읽는 법

- 밖에서 들어오는 길은 **443 하나**뿐입니다. 관리자 화면(①), 부스의 API 호출(②), 부스의 사진 업로드(③)가 모두 강사님 nginx → web nginx(8315)를 지나갑니다.
- **부스 화면은 Jetson 안의 작은 웹 서버**입니다(booth `trace-booth serve`, 8320). 태블릿은 부스 공유기 안에서 Jetson에만 붙고, gakdo.site와 통신하는 것은 Jetson뿐입니다.
- 서버 4개(gateway·auth·rental·capture)와 인프라 4개는 Compose 네트워크 안에서만 서로 부릅니다. 호스트 포트로 열린 것은 web 8315뿐입니다.
- 점선은 서비스가 아니라 **학습 데이터 경로**입니다. 부스가 학습 사진을 학교 MinIO에 올리고, 집 PC가 학습해 만든 model.onnx를 Jetson에 옮깁니다.

## 1-2. 검사 한 건의 흐름 (요약)

기능 하나하나의 자세한 설명은 [3. 기능별 흐름](03-features.md)에 있습니다.

```mermaid
sequenceDiagram
  autonumber
  actor Admin as 관리자 (web /admin)
  participant GW as gateway
  participant AU as auth-server
  participant RE as rental-server
  participant BO as booth 앱 (Jetson)
  participant CA as capture-server
  participant S3 as MinIO
  participant MQ as RabbitMQ

  Admin->>GW: 로그인
  GW->>AU: ADMIN JWT 발급
  Admin->>GW: 기종·기기 등록, 렌탈 열기, 출고(OUT) 시점 시작
  GW->>RE: 렌탈 OPEN, 시점 OUT OPEN
  BO->>GW: 부스 토큰 받기 → 검사 기다리는 기기 목록
  GW->>RE: OPEN 렌탈만
  Note over BO: 태블릿에서 기기 탭 → BOT 6장 → 뒤집어 TOP 6장
  BO->>GW: 세트 생성 (QUICK, 12장 해시)
  GW->>CA: 세트 저장 → 사전 서명 PUT URL 12개
  BO->>S3: 사진 12장 PUT
  BO->>GW: 촬영 완료
  CA->>MQ: trace.capture.uploaded
  MQ->>RE: 시점 CAPTURED
  Note over BO: Jetson 탐지 → 부스 화면에 폴리곤 · 문제 있음/없음
  BO->>GW: 탐지 결과 (12장 분석 목록)
  CA->>CA: 부스 탐지로 등급 A~D
  CA->>MQ: trace.checkpoint.graded
  MQ->>RE: 시점 GRADED
  Admin->>GW: 검사 결과 보기
  GW->>CA: 사진 12장 URL · 흠집 폴리곤 · 등급
```

## 1-3. 포트 목록

| 포트 | 어디 | 무엇 | 열림 |
|---|---|---|---|
| 443 | gakdo.site (s2-nginx) | 강사님 nginx → 10.116.64.12:8315 | 외부 |
| 8315 | 학교 서버 | web nginx(컨테이너 8080). `/` 화면, `/api/` → gateway, `/trace-captures/` → MinIO | 학교 내부망 (밖에서는 443으로만) |
| 8080 | Compose 안 | gateway · auth-server · rental-server · capture-server | 호스트에 안 엶 |
| 5432 | Compose 안 | PostgreSQL 16 | 호스트에 안 엶 |
| 6379 | Compose 안 | Redis | 호스트에 안 엶 |
| 5672 / 15672 | 학교 서버 | RabbitMQ / 관리 화면 | 127.0.0.1만 |
| 19000 / 19001 | 학교 서버 | MinIO API / 콘솔 | 127.0.0.1만 |
| 8320 | Jetson | 부스 화면 (`trace-booth serve`) | 부스 공유기만 |
| 8000 | storage.java21.net | 학교 MinIO (학습 사진·모델) | 학교 |
| 8822 | s2.java21.net | SSH (배포용) | 외부 |

contracts OpenAPI의 `servers`에 남은 `localhost:8314`는 예전 클러스터 시절 gateway 포트이고, 지금은 `https://gakdo.site`가 그 자리입니다.

## 1-4. MVP에 넣지 않은 것

그림을 깔끔하게 두려고 MVP 그림에서 뺐습니다. 코드는 develop에 남아 있고, Compose 기본 기동에서도 꺼져 있습니다.

폰 촬영, inspect-worker, report-server(해시 체인), diagnostics-server, agent, Grafana, InfluxDB, Rancher, Argo CD, Cloudflare Tunnel
