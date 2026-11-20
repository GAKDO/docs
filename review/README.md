# 리뷰 준비 총정리 (2026-11-20)

강사님 전체 리뷰(요구사항·스펙·ERD·아키텍처·API·개발 과정)를 한 장으로 묶은 문서입니다. 자세한 답과 근거는 파트 문서에 있고, 여기서는 **처음 1분에 할 말, 파트마다 꼭 외울 답, 파트를 가로지르는 질문, 먼저 인정할 약점**만 모았습니다.

| 파트 | 문서 | 한 줄 |
| --- | --- | --- |
| 요구사항 | [requirements.md](requirements.md) | 50개 중 44개 수용 기준 확인, 11/3에 지우지 않고 순서만 바꿈 |
| 스펙(계약) | [spec.md](spec.md) | contract-first, 1.0.0 고정 뒤 깨지는 변경 0건, 1.1.0 릴리스 + CI 검사 |
| ERD | [erd.md](erd.md) | DB 하나·서버별 스키마 7개·테이블 37개, bigint + NanoID, 서버 사이 FK 없음 |
| 아키텍처 | [architecture.md](architecture.md) | gateway 하나 + 업무 서버 5개, 서버끼리는 이벤트 7종으로만 |
| API | [api.md](api.md) | 경로 74개가 계약과 1:1, RFC 9457 오류, 커서 페이징, 멱등 키 |
| 개발 과정 | [process.md](process.md) | 계약 고정 → MVP 먼저 → 하나씩 다시 넣기, 운영은 develop 이미지 |

숫자는 모두 11/20 각 레포 develop(docs는 main) 기준입니다. 자바 커버리지는 Docker 없는 곳에서 잰 값이라 Testcontainers 테스트가 빠져 있습니다.

---

## 0. 처음 1분 (그대로 말하기)

> **TRACE는 노트북 렌탈의 출고·수령·반납 세 시점에 같은 기준으로 사진·AI 검사·진단을 기록하고, 그 기록을 해시 체인으로 봉인해 "이 흠집이 언제 생겼나" 분쟁을 증거로 끝내는 시스템입니다.**
>
> 출고 때는 부스 Jetson이 카메라 2대 × 조명 3개로 12장을 찍어 현장에서 TensorRT로 흠집을 찾고, 사진은 사전 서명 URL로 MinIO에 바로 올립니다. 관리자가 AI 후보를 확정하면 capture-server가 등급을 매기고, report-server가 렌탈별 해시 체인에 잇고 Ed25519로 서명한 뒤, 그 지문을 고객 메일로도 보냅니다. 수령은 고객이 폰으로 QR을 찍어 같은 경로로 올리고, 반납은 다시 부스에서 찍어 앞 시점 흠집과 5 mm 기준으로 비교해 새 흠집만 정산합니다. 진단 에이전트는 시점마다 노트북 부품·배터리·SSD 상태를 올립니다.
>
> 구조는 gateway 하나 뒤에 업무 서버 5개, 서버끼리는 API 호출 없이 RabbitMQ 이벤트 7종으로만 잇고, DB는 PostgreSQL 하나를 서버별 스키마로 나눴습니다. 레포끼리의 약속은 contracts 레포 하나(OpenAPI·이벤트 스키마·codes.yaml)에 먼저 고정하고 코드가 따라가는 방식입니다.

### 기술 흐름 한 장

```
[출고 OUT]  관리자 렌탈 생성(rental) ─checkpoint.started─▶ report
            부스 Jetson: BOOTH JWT + 6자리 부스 코드 → 12장 촬영
              → capture-server 세트 생성(사진 해시) → 사전 서명 PUT 12개 → MinIO 직접 업로드
              → complete(해시 대조) ─capture.uploaded─▶ rental(CAPTURED)·report(진행률)
              → Jetson TensorRT 탐지(12장 2.53초) → 결과 REST 업로드(실패 시 로컬 큐 30초 재시도)
            관리자 사람 검수(확정·기각·추가) → 등급 A~D(grade-rules-v1) ─checkpoint.graded─▶ report·rental
            report: 사진 해시·진단 해시·등급 → 정렬 JSON → SHA-256 → 앞 줄 해시와 연결 → Ed25519 서명
              ─record.sealed─▶ rental(SEALED) · auth(봉인 영수증 메일) · diagnostics(다시 하기 잠금)

[수령 RCV]  관리자 QR(30분) → 고객 폰 로그인 → 촬영 JWT(그 시점만) → 7면 촬영(HTTPS·getUserMedia)
              → 같은 사전 서명 업로드 ─capture.uploaded─▶ inspect-worker(학교 서버, ONNX CPU)
              → 정합·탐지 ─inspect.completed─▶ capture → 등급 → 봉인(위와 같음), 진행률은 Redis → SSE

[반납 RET]  부스 촬영(출고와 같은 방식만 허용) → 앞 시점 흠집과 표준 좌표(mm) 5 mm 비교(view-match-v1)
              → NEW 흠집만 공개 규칙표로 정산 → 등급 → 봉인 → 렌탈 RETURNED

[진단]      페어링 코드(5분) → AGENT JWT(10분, 시점 하나) → 결과를 먼저 보여 주고 동의하면 업로드
              → diagnostics: JSON Schema 검증 → 앞 진단과 비교 → 점검 플래그 ─diagnostics.recorded─▶ report
```

시점 상태 `OPEN → CAPTURED → GRADED → SEALED`, 시점 순서 `OUT → RCV → RET`. 앞 시점이 봉인돼야 다음 시점을 봉인합니다.

### 핵심 숫자 (물으면 바로)

| 항목 | 값 |
| --- | --- |
| 요구사항 | 50개(기능 44 + 비기능 6) → **44 ✅ · 5 ◐ · 1 ⏸**, 기능 27개로 나눔 |
| 레포 | 15개, Spec Kit 명세 폴더 **36개**(레포 12곳), 머지 PR 513건(11/16) |
| 계약 | OpenAPI 3.1 6개 · **operation 74개** · 이벤트 **7종** · `error_code` 45개 · 1.0.0(11/3) → **1.1.0(11/20)**, 깨지는 변경 0건 |
| DB | PostgreSQL 1개 · 서버별 **스키마 7개 · 테이블 37개** · 서버 사이 FK 0개 |
| 구성 | 앱 컨테이너 9개(web·gateway·업무 서버 5·inspect-worker·chat-server) + ollama + 인프라 4(PostgreSQL·RabbitMQ·Redis·MinIO), 밖으로는 443 하나 |
| 성능 | 부스 12장 탐지 **2.53초**(Jetson Orin Nano, TensorRT FP16), 목표 30초·한도 60초 |
| 모델 | v004: 흠집 있는 면 **4/4**, 사진 정밀도 **0.71**, 사진 재현율 **0.60**(같은 검증셋에서 v002 증강 0.50·0.77) |
| 테스트 | 약 1,780개(자바 547 · 파이썬 650 · 웹 584), 줄 커버리지 서버 60~98% · 웹 89% · 파이썬 82~92% |
| 권한 | 역할 5개(ADMIN·CUSTOMER·촬영·BOOTH·AGENT), gateway 역할 × 경로 451개 조합 테스트 |
| 일정 | 10/30 설계 → 11/3 계약 고정 → 11/9 MVP·세 시점 완주 → 11/13 프리즈 → 11/16 제출 → 11/19 본선 |

"서버 6개"는 문서마다 뜻이 다릅니다. 말할 때는 **업무 서버 5개(auth·rental·capture·diagnostics·report) + gateway + chat-server**로 풀어서 말합니다.

---

## 1. 파트별 핵심과 꼭 외울 답

### 1-1. 요구사항 → [requirements.md](requirements.md)

- 출발점은 렌탈 분쟁 시나리오. 도메인 11개, 요구사항마다 **측정 가능한 수용 기준**과 담당을 적었습니다.
- 11/3 강사님 리뷰로 **지우지 않고 순서만 바꿈**: "부스 12장 → Jetson 판정 → 관리자 화면"을 먼저 끝까지 돌리고 해시 체인(11/4)·진단(11/6)·폰 수령(11/8)을 다시 얹어 11/9에 세 시점 완주.
- 남은 6개: FR-INS-02(실사진 정합 오차 측정 없음), FR-PIL-01(API만)·02(Grafana 대신 성능 화면), NFR-01(탐지만 2.53초, 촬영~저장 10회 미측정), NFR-03(서비스별 계정 분리 미룸), NFR-05(클러스터 대신 Compose).
- 표 밖 기능 12개(사람 검수, 반납 정산, 소셜 로그인, 챗봇 등)는 임시 번호 X-01~X-12. 계약은 추가만.

> **외울 답 — "시트는 다 TRUE인데 왜 44/50?"** 단위가 다릅니다. 시트는 "그 세부 기능이 돌아가나", 문서는 "요구사항의 수용 기준을 확인했나"입니다.
>
> **외울 답 — "우선순위가 다 필수면 의미 없지 않나?"** 맞습니다. 실제 우선순위는 11/3 단계표가 대신했고, 다시 하면 MoSCoW로 "세 시점 한 바퀴"에 꼭 필요한 것만 Must로 두겠습니다.

### 1-2. 스펙(계약) → [spec.md](spec.md)

- **contract-first**: contracts 레포에 먼저 머지하고 그 버전을 쓰는 PR을 각 레포에 냅니다. 세 명이 서버·웹·부스·에이전트를 동시에 만들려고, 각자 목(MSW·가짜 카메라·고정 출력)으로 개발했습니다.
- 계약 네 가지: OpenAPI(REST), 이벤트 JSON Schema 2020-12, 진단 JSON Schema(`diag.v1`), `codes.yaml`(코드 값의 유일한 원본, 생성 스크립트로 enum을 만듦).
- 버전 두 층: 계약 전체 SemVer(1.0.0 → 1.1.0), 이벤트마다 `schemaVersion`(graded 1.3 등). 깨지는 변경이 꼭 필요하면 새 라우팅 키로.
- 11/20 기계 대조: codes.yaml ↔ DB CHECK 22종 일치, 서버 ErrorCode ⊂ codes.yaml, gateway 접근 정책 ↔ `x-trace-access` 규칙 같음, `schemaVersion` 상수 = 계약.

> **외울 답 — "깨지지 않는다는 걸 어떻게 보장하나?"** 11/19까지는 PR 템플릿과 사람 리뷰였습니다. 11/20에 v1.0.0과 지금을 스크립트로 비교해 삭제·새 required·enum 삭제가 0건임을 확인했고, 같은 비교를 `check_breaking.py`로 CI에 넣어 이제는 기계가 막습니다.
>
> **외울 답 — "필드를 더하면 옛 소비자는?"** 닫힌 스키마(`unevaluatedProperties: false`)로 발행 쪽 오타를 잡고, 소비 쪽은 모르는 필드를 무시합니다. 예외는 서버가 검증하는 진단 업로드라 서버를 먼저 배포합니다.

### 1-3. ERD → [erd.md](erd.md)

- PostgreSQL 인스턴스 하나, **서버마다 스키마**(논리적 Database per Service). 다른 스키마를 조인하지 않고 FK도 걸지 않습니다.
- 키: **bigint IDENTITY**(안), **`public_id` NanoID 21자**(밖, 9개 표). 순번 노출(IDOR) 방지 + UUID보다 짧음. 업무 키마다 UNIQUE를 따로.
- 같은 서버 안은 3NF. 11/20 점검으로 중복 8건을 고쳤고, 서버 사이 사본(예: `rental.checkpoint.grade`)은 원본 서버를 적은 의도된 비정규화.
- "기기당 진행 중 렌탈 하나"는 앱이 아니라 **부분 유니크 인덱스** `ux_rental_open_device`가 막습니다.
- 코드 값은 PostgreSQL enum이 아니라 `varchar + CHECK`(값 원본은 codes.yaml, 바꾸기 쉬움).

> **외울 답 — "MSA인데 DB가 하나?"** 학교 서버의 인스턴스 하나를 받아 써서 물리적으로는 하나지만 스키마로 나눠 논리적으로는 서비스별입니다. 스키마를 다른 인스턴스로 옮겨도 접속 주소만 바뀝니다. 다만 **DB 계정을 나누지 않아 권한으로는 막지 못합니다**(먼저 인정).
>
> **외울 답 — "스키마 변경과 롤백은?"** Flyway로 자기 스키마만, 새 파일만 더합니다. 자동 되돌리기는 코드만 되돌리므로 "칸 추가 먼저, 삭제는 다음 배포". 그래서 정규화도 1단계(안 쓰기·NULL 허용·NOT VALID 제약, 11/20 운영 반영)와 2단계(삭제, 1단계 확인 뒤)로 나눴습니다.

### 1-4. 아키텍처 → [architecture.md](architecture.md)

- 입구 gakdo.site 하나 → 강사님 nginx(TLS) → web nginx → `/api/`는 Spring Cloud Gateway → 업무 서버 5개.
- 서버끼리는 REST 호출 없음(예외: JWKS 조회, chat-server → gateway GET). 사람이 기다리는 것은 동기 REST, 다른 서버가 이어 받는 것은 이벤트, 잃어도 되는 진행률은 Redis Pub/Sub → SSE.
- 탐지는 Jetson(현장 판정·학교 서버 GPU 없음·네트워크 끊겨도 동작), 폰 사진은 학교 서버 inspect-worker(ONNX CPU). **두 곳은 늘 같은 모델 버전**.
- 11/3에 쿠버네티스(Rancher·Argo CD) → 학교 서버 Compose. 매니페스트는 CI로 계속 검증해 되돌아가기 쉽게 둠.

> **외울 답 — "3명인데 왜 MSA?"** 솔직히 3명·한 달이면 모놀리스가 빠릅니다. 나눈 이유는 ① 바뀌는 속도가 다름(해시 체인은 한번 정하면 바뀌면 안 되는데 사진·AI 코드는 매일 바뀜), ② 신뢰 경계(report는 다른 서버 DB를 못 읽고 이벤트로 받은 값만 봉인), ③ 장애 격리(챗봇·진단이 죽어도 촬영·봉인은 계속). 비용은 contracts 레포와 공통 컨벤션으로 줄였습니다.
>
> **외울 답 — "단일 장애점은?"** 많습니다. 학교 서버 한 대, 인프라 각 1개, 앞단 nginx, gateway. 이 규모에서는 복제보다 **빨리 알고 빨리 복구**(재시작 정책, 상태 감시·바깥 점검 알림, 야간 백업)를 택했습니다.

### 1-5. API → [api.md](api.md)

- 경로 앞부분 = 서버(`/auth`, `/rentals`, `/captures`, `/diagnostics`, `/reports`·`/verify`, `/chat`). 그래서 `/captures/checkpoints/{id}/inspection`처럼 주인 서버 이름 아래에 둡니다(서버 간 동기 호출을 안 만들려고).
- 상태 전이는 PATCH가 아니라 **명령형 하위 경로**(`POST …/close`, `…/complete`, `…/seal`): 선행 조건 확인·이벤트 발행·되돌릴 수 없음이 붙어서.
- 오류는 RFC 9457 Problem + `code`. 409(지금 상태와 충돌) / 422(형식은 맞는데 의미가 틀림) / 400(기본 검증).
- 목록은 커서(키셋 `(createdAt, publicId)`), `Idempotency-Key` 필수는 **촬영 완료·검수 완료·진단 업로드** 세 곳.
- 11/20 고침: gateway가 뒤쪽 서버 연결 실패 때 Spring 기본 500 JSON을 내던 것을 503 Problem으로(gateway #27), 재설정 두 경로의 429를 계약에(contracts #53).

> **외울 답 — "권한은 gateway에서? 서버에서?"** 둘 다입니다. gateway는 계약에서 생성한 역할 × 경로 표(451개 조합 테스트), 서버는 JWT를 다시 검증하고 "이 렌탈·시점이 정말 이 사람 것인가"를 DB 값으로 봅니다. 밖에서 온 `X-User-Id` 같은 헤더는 gateway가 지우고 토큰 값으로만 채웁니다.
>
> **외울 답 — "gateway가 재시도하면 POST가 두 번?"** 연결 자체가 안 됐을 때만 재시도합니다. 요청이 서버에 닿지 않았으니 안전하고, 서버가 낸 5xx나 지연은 다시 보내지 않습니다(`UpstreamRetryIntegrationTest`).

### 1-6. 개발 과정 → [process.md](process.md)

- 설계 3일 → 11/3 계약 고정 → 끝까지 도는 MVP 먼저 → 하나씩 다시 넣기. 레포마다 Spec Kit(`specify → clarify → plan → tasks → analyze → implement → converge`).
- PR 하나 = 기능 하나, **필수 검사가 초록일 때만 머지**(사람 승인 0명 대신 테스트·커버리지·gitleaks·계약 린트·CodeRabbit). 액션은 커밋 SHA로 고정.
- 배포는 **끌어오기 방식**: 학교 서버 `autodeploy.sh`(3분)가 `:develop` 이미지를 받아 옆에 띄우고 ping·커밋 SHA 확인 뒤 교체, 실패하면 새 것만 지우고 그 이미지를 다시 시도하지 않음. GitHub에 서버 접속 키가 없음.
- 모델은 mAP가 아니라 **"이 면에 흠집이 있나" 판정**으로 골랐고, 검증은 **기기 단위**로 뗐습니다(학습 12대 / 검증 3대, 사진이 섞이면 같은 흠집을 외운 걸 성능으로 착각).
- AI(Claude Code)로 개발했고, 사람의 역할은 "원칙(헌법·CLAUDE.md)·결정(decisions.md)·실기 확인". 계약을 바꿔야 하면 AI가 멈추고 사람에게 묻게 했습니다.

> **외울 답 — "Git Flow라면서 develop이 운영에 나간다?"** 맞습니다. 처음엔 main = 클러스터 배포였는데, 11/3 Compose로 바꾸며 서버가 `:develop`을 받게 됐고 main은 릴리스 태그·CHANGELOG 기록만 남았습니다. 하루에도 여러 번 실서버 확인이 필요해 택했고, 커밋 SHA 확인·자동 되돌리기·시연 전 `pause`로 보완했습니다. 다시 하면 develop → 스테이징, main → 운영으로 나누겠습니다.
>
> **외울 답 — "재현율이 0.77 → 0.60으로 떨어졌는데 왜 v004?"** 같은 검증셋·같은 conf 0.25 비교이고, 흠집 있는 면은 v004도 4/4를 다 잡았습니다(v002 증강은 3/4). 그 위에서 관리자가 지울 오탐 사진이 48 → 15장으로 줄었습니다. 사진 단위 숫자라 크기별 놓침은 재지 않았습니다.

---

## 2. 파트를 가로지르는 질문 TOP 10 (기술 흐름·스펙 중심)

강사님이 한 파트에서 시작해 다른 파트로 이어 물으실 만한 것들입니다. 답의 뼈대만 적었고, 괄호는 자세한 답이 있는 곳입니다.

**Q1. 고객 폰에서 사진 한 장이 봉인될 때까지 어떤 컴포넌트를 거치나요?**
QR → auth `capture-links/exchange`(그 시점만 쓰는 촬영 JWT 30분) → capture-server 세트 생성(사진 SHA-256 포함) → 사전 서명 PUT URL(`Content-Type`·`x-amz-checksum-sha256`를 서명에 넣음) → 폰이 MinIO에 직접 PUT → `complete`에서 저장소 해시 대조(다르면 409) → `capture.uploaded` → inspect-worker 정합·탐지 → `inspect.completed` → 사람 검수 → 등급 → `checkpoint.graded` → report-server가 정렬 JSON → SHA-256 → 앞 줄 해시와 연결 → Ed25519 서명 → `record.sealed` → 고객 메일로 지문. 요청은 gateway(JWT·역할·요청 제한) → 서버(JWT 재검증·범위 확인) 두 번 검사됩니다. (architecture 1장, api 2장)

**Q2. 계약을 먼저 고정했다는데, 코드가 계약과 어긋나지 않는다는 근거는요?**
생성으로 막는 것: codes.yaml → OpenAPI enum·JSON Schema, `x-trace-access` → gateway `access-policy.yaml`(`--check`), OpenAPI → web 타입. 대조로 확인한 것(11/20): 경로 74개 1:1, ErrorCode ⊂ codes.yaml, DB CHECK 22종 일치, `schemaVersion` 상수. CI로 막는 것: `check_breaking.py`·`check_events.py`. **없는 것: 응답 본문을 OpenAPI로 검증하는 테스트, 소비자 주도 계약 테스트**(먼저 말할 것). (spec 2-5, api 3장)

**Q3. 서버 사이 FK가 없으면 정합성은 어떻게 맞추나요?**
① ID 원본은 한 서버(시점은 rental만 만듦), ② 다른 서버는 ID를 값으로 들고 이벤트로 받은 상태를 작은 사본으로(report `checkpoint_view`, diagnostics `sealed_checkpoint`), ③ 받는 쪽이 짝을 검사(rental은 모르는 시점·렌탈 불일치 이벤트를 DLQ로), ④ 토큰 클레임의 `rentalId`·`checkpointId`와 요청 값이 다르면 거절, ⑤ 지울 때는 `checkpoint.purged`로 각자 지움. 약점: auth가 토큰을 발급할 때 rental에 시점이 있는지 다시 묻지 않습니다. (erd 4장, architecture Q3)

**Q4. DB 커밋과 이벤트 발행이 원자적인가요?**
아닙니다. `RabbitTemplate.setChannelTransacted(true)`라 DB가 롤백되면 메시지도 안 나가지만, **DB 커밋 직후 브로커 커밋 전에 죽으면 이벤트를 잃는 작은 창**이 남습니다. 트랜잭셔널 아웃박스(같은 트랜잭션에 outbox 표, 별도 발행기)가 정석이고 다음 단계 1순위입니다. 지금 되살리는 길은 관리자 수동 봉인(기록 남음)·등급 다시 매기기·진단 다시 하기입니다. **파트 문서 네 곳에 같은 답이 있으니 먼저 꺼냅니다.** (spec 2-2, erd 4장, architecture Q8)

**Q5. 같은 이벤트가 두 번 오거나 순서가 바뀌면요?**
at-least-once를 전제로 소비자를 멱등하게: report `processed_event(event_id UNIQUE)`, rental 시점 상태는 앞으로만(`advanceTo`, 늦게 온 CAPTURED 무시), auth 영수증·diagnostics 봉인은 자연 키 UNIQUE, inspect-worker는 같은 입력이면 같은 ID. AMQP `message_id` = `eventId`, 계속 실패하면 `trace.dlx` → `<큐>.dlq`, 형식이 깨진 건 바로 DLQ. HTTP 쪽은 `Idempotency-Key`(같은 키 다른 본문이면 422). (spec 2-2, architecture Q9·Q10)

**Q6. 해시 체인은 정확히 무엇을 증명하고, DB 관리자가 체인을 통째로 다시 만들면요?**
렌탈마다 출고·수령·반납 3줄. 줄마다 사진 ID·해시, 진단 해시, 등급, 규칙 버전을 정렬 JSON → `payloadHash`, `recordHash = H(seq, rentalId, checkpointId, type, payloadHash, prevHash, signedAt)`를 Ed25519로 서명. 검증 때 MinIO 사진도 다시 해시합니다. 통째로 다시 만드는 것은 서명 키를 가진 업체라면 가능하므로 **봉인 순간 지문을 고객 메일로 보내 업체가 못 고치는 곳에 사본**을 남깁니다(검증 페이지 지문 ≠ 메일 지문이면 조작). 블록체인은 합의가 필요 없는 2자 관계라 안 썼고, 더 강하게 하려면 RFC 3161 타임스탬프. 동시 봉인은 렌탈 행 `PESSIMISTIC_WRITE`로 갈림을 막습니다. (architecture Q11~Q13, requirements Q12)

**Q7. 인증·인가 구조와 토큰 종류는요?**
auth-server가 RS256 JWT 발급 + JWKS(kid = 공개키 지문). 주체별로 수명·범위를 좁게: ADMIN·CUSTOMER 액세스 15분 + 리프레시 7일(불투명 값, Redis에 해시, 쓸 때마다 회전, HttpOnly·Secure·SameSite=Strict 쿠키), 수령 촬영 30분(시점 하나), BOOTH 1시간(client credentials), AGENT 10분(페어링 코드 5분, 시점 하나). gateway가 1차(서명·역할 × 경로, 규칙 없는 경로는 404), 서버가 2차(JWT 재검증 + 범위, Compose엔 NetworkPolicy가 없어서). 액세스 토큰은 메모리에만. 약점: 리프레시 재사용 탐지 없음. (architecture Q20~Q22, api Q12~Q16)

**Q8. AI가 오탐하면 고객이 억울하게 청구되지 않나요? 모델은 어떻게 골랐나요?**
AI 혼자 청구까지 가는 경로가 없습니다. 11/8부터 AI는 후보를 넓게(conf 0.25) 잡고 **사람이 확정한 것만 등급·정산에 씀**, 놓친 흠집은 관리자가 그려 넣음(source = HUMAN), 확정·기각은 다음 학습의 양성·음성 예시. 모델은 mAP 대신 "면에 흠집이 있나"를 세는 평가기(`trace-ml evaluate`)로, 기기 단위로 뗀 검증 3대에서 골랐습니다. v004 = 흠집 면 4/4, 정밀도 0.71, 재현율 0.60. 반납 비교는 "억울한 신규"가 더 나쁘다고 보고 5 mm로 너그럽게. 학습 데이터는 한 기종·찍힘·긁힘 2종에 치우침(먼저 인정). (requirements Q10·Q11, process 7장)

**Q9. 배포와 DB 마이그레이션은 어떻게 안전하게 하나요?**
develop 머지 → Actions(테스트·JaCoCo·gitleaks) → GHCR `:SHA`·`:develop` → 학교 서버 `autodeploy.sh`(cron 3분)가 새 컨테이너를 옆에 띄워 180초 안에 ① 살아 있음 ② ping ③ ping의 커밋 SHA = 새 이미지를 확인한 뒤 교체, 실패하면 새 것만 지우고 Discord 알림. **develop 머지 = 운영 반영**이고 스테이징이 없어서, 마이그레이션은 "추가 먼저, 삭제는 다음 배포" + 새 제약은 `NOT VALID` 뒤 확인. 시연 전엔 `pause`. (process 2장·4장, erd 7장)

**Q10. 사용자가 100배가 되면 어디부터 바꾸나요?**
사진은 이미 사전 서명으로 서버를 우회하므로 MinIO만 넓힘 → inspect-worker는 상태가 없어 같은 큐에 여러 개(GPU 노드) → Spring 서버는 무상태(JWT)라 여러 개 → DB는 스키마가 이미 서버별이라 인스턴스로 떼기 쉬움, report는 읽기 복제본 → 보관한 쿠버네티스 매니페스트로 HPA. 그 전에 할 일은 아웃박스, 서버별 DB 계정, 분산 추적(gateway trace ID → 이벤트 봉투). 처리량 요구사항(하루 N대, 동시 접속)을 정하지 않은 것도 인정. (architecture Q18, requirements Q17)

---

## 3. 먼저 인정할 약점과 다음 단계

물어보기 전에 "알고 있고, 이렇게 보완했고, 다음엔 이렇게 하겠다"로 말하면 점수가 되는 것들입니다. 위 두 줄이 강사님이 가장 먼저 짚을 만한 공통 약점입니다.

| # | 약점 | 지금 보완 | 다음 단계 | 파트 |
| --- | --- | --- | --- | --- |
| 1 | **트랜잭셔널 아웃박스 없음** | 채널 트랜잭션 + 멱등 소비 + DLQ + 수동 봉인 | 서버마다 outbox 표 + 발행기(또는 CDC) | 스펙·ERD·아키텍처 |
| 2 | **DB 계정 하나를 서버 5개가 공유** | 스키마 분리 + 규칙·리뷰 | 서버별 DB 역할(자기 스키마만), MinIO 키·RabbitMQ 계정도 분리(NFR-03) | ERD·아키텍처·요구사항 |
| 3 | develop = 운영, 스테이징 없음. 레포 `CONTRIBUTING.md`는 아직 옛 Git Flow(main = 배포) | SHA 확인·자동 되돌리기·`pause`, docs·gitops 문서는 지금 구성으로 고침 | develop → 스테이징, main → 운영 (또는 trunk 방식으로 이름 정리) | 개발 과정 |
| 4 | 응답 본문을 OpenAPI로 검증하는 테스트·소비자 주도 계약 테스트 없음. 발행 이벤트 스키마 검증 테스트는 diagnostics만 | 생성·대조 스크립트, 고정 예시 | 통합 테스트에서 응답을 계약 스키마로 검증 | 스펙·API |
| 5 | 11/6 뒤 추가 20건 남짓은 Spec Kit 명세 없이 CHANGELOG·decisions·PR로만. 헌법 문구("이벤트 5종", "요구사항 50개만")가 늦음 | X-01~X-12 임시 번호, 1.1.0으로 묶음 | 추가 기능도 명세 → 헌법 개정(사본 12곳) | 요구사항·스펙 |
| 6 | 사람 승인 0명 | 필수 검사 + CodeRabbit(11/20 현재 자동 리뷰는 꺼짐) | 계약·보안·마이그레이션 PR은 1명 승인 | 개발 과정 |
| 7 | 서버 한 대·인프라 각 1개(SPOF), 분산 추적 없음 | 재시작 정책, 상태 감시·바깥 점검, 야간 백업 | 클러스터 이전·DB 복제, trace ID 전파 | 아키텍처 |
| 8 | 리프레시 재사용 탐지 없음, 요청 제한이 고정 창 + Redis 장애 시 fail-open, web nginx 보안 헤더(CSP·HSTS) 없음 | 회전·해시 저장·로그아웃 시 전체 폐기 | family 단위 폐기, 토큰 버킷·로그인 fail-closed, 헤더 추가 | 아키텍처·API |
| 9 | 측정이 남은 수용 기준: NFR-01 촬영~저장 10회, FR-INS-02 실사진 정합 오차 | 탐지 2.53초, 합성 사진 정합 | 실측 후 문서 갱신 | 요구사항 |
| 10 | 학습 데이터 한 기종·한 색, 찍힘·긁힘 2종. 평가가 사진 단위 | 시연 기종에 맞춤, 면 단위 판정 | 기종·흠집 종류 추가, 인스턴스·크기별 재현율 | 요구사항·개발 과정 |
| 11 | 정규화 2단계(칸·표 삭제) 남음 | 1단계 운영 반영(쓰지 않고 NULL 허용) | 1단계 확인 뒤 rental V7·diagnostics V7·report V6 | ERD |
| 12 | 에이전트 설치 스크립트가 받는 소스에 체크섬·서명 없음 | 고정 태그 + 받는 파이썬·smartctl SHA 고정 | 릴리스 체크섬·서명 | 개발 과정 |

---

## 4. 오늘(11/20) 고친 PR

모두 머지됨. 서버·게이트웨이·계약은 develop에 머지돼 **3분 안에 운영에 반영**됐고(docs는 main), 계약은 1.1.0 태그가 생겼습니다.

| 분야 | PR | 내용 |
| --- | --- | --- |
| ERD 정규화 1단계 | [rental_server #31](https://github.com/GAKDO/rental_server/pull/31) | 부스 코드의 렌탈을 시점에서 따라가게(이행 종속 제거 1단계) |
| | [rental_server #32](https://github.com/GAKDO/rental_server/pull/32) | `rental.device_id` 전체 인덱스(V6) |
| | [capture_server #33](https://github.com/GAKDO/capture_server/pull/33) | 등급·흠집 비교 중복 칸을 합성 FK·CHECK로 묶음 |
| | [diagnostics_server #22](https://github.com/GAKDO/diagnostics_server/pull/22) | 플래그의 시점 중복 칸 안 쓰기, 배터리 계산값 CHECK |
| | [report_server #16](https://github.com/GAKDO/report_server/pull/16) | 수동 봉인 기록이 체인 줄과 겹치는 값을 다시 들지 않게 |
| 계약 | [contracts #52](https://github.com/GAKDO/contracts/pull/52) | 깨지는 변경 검사 CI, 이벤트 소비자 표기를 큐 바인딩과 맞춤, 1.1.0 |
| | [contracts #54](https://github.com/GAKDO/contracts/pull/54) · [#55](https://github.com/GAKDO/contracts/pull/55) | 1.1.0 릴리스(main, 태그 v1.1.0), main을 develop에 합침 |
| | [contracts #53](https://github.com/GAKDO/contracts/pull/53) | 비밀번호 재설정 두 경로에 429 |
| API | [gateway #27](https://github.com/GAKDO/gateway/pull/27) | 뒤쪽 서버 연결 실패·시간 초과도 Problem + `code`(503·504) |
| 테스트 관문 | [booth #71](https://github.com/GAKDO/booth/pull/71) | 커버리지 70% + Jetson과 같은 Python 3.10 잡 |
| | [agent #18](https://github.com/GAKDO/agent/pull/18) · [ml #40](https://github.com/GAKDO/ml/pull/40) · [chat-server #10](https://github.com/GAKDO/chat-server/pull/10) | 커버리지 70% |
| 문서 | [docs #37](https://github.com/GAKDO/docs/pull/37)~[#46](https://github.com/GAKDO/docs/pull/46) | ERD 정규화 점검·ddl.md 최신화, 파트별 리뷰 문서 6개, 요구사항 재감사, 아키텍처·배포 문서를 지금 Compose 구성으로 |
| | 이 PR | 이 총정리, 파트 문서끼리 어긋난 사실 맞춤(아래) |

### 이 PR에서 맞춘 사실

| 어긋났던 것 | 맞는 사실 (11/20 코드로 확인) | 고친 곳 |
| --- | --- | --- |
| Spec Kit 명세 40개 vs 36개 | **36개**(레포 12곳 `specs/` 폴더 수) | process.md |
| inspect-worker가 "집 PC" | **학교 서버 Compose**(ONNX CPU) | spec.md |
| `Idempotency-Key`가 "세트 생성·진단 업로드" | **촬영 완료·검수 완료·진단 업로드**(세트 생성은 받지 않음) | spec.md, erd.md |
| 프리즈 뒤 "기능 코드는 바꾸지 않음" | 11/20 리뷰 준비로 gateway 오류 응답 형식(#27)은 바뀜(정상 응답·재시도 규칙은 그대로) | process.md |
| 에이전트 고정 태그 "v0.3.0" | macOS `agent.sh` **v0.3.0**, Windows `agent.ps1` **v0.2.0**(web nginx) | process.md |
| JWKS·실제 IP를 "클러스터"로 설명 | JWKS는 **Compose 내부망에서만**(gateway 라우트 없음), 실제 IP는 강사님 nginx가 넣는 헤더 | api.md |
| environment.md가 클러스터·Argo CD 운영처럼 읽힘 | 11/3부터 학교 서버 Compose, `:develop` 자동 배포. 표는 11/2 계획 기록 | environment.md |

---

## 5. 리뷰 당일 체크리스트

- [ ] 학교 서버에서 `bash ~/gitops/compose/ops/autodeploy.sh status`로 오늘 머지가 모두 배포됐는지 확인(서버 ping의 `commit`이 develop 최신인지).
- [ ] 바로 열 화면: 구성 그림 [../figures/trace-system-architecture.png](../figures/trace-system-architecture.png), API 문서 https://gakdo.github.io/docs/, 계약 `contracts/openapi/*.yaml`·`events/*.schema.json`·`codes.yaml`, 스키마 [../design/ddl.md](../design/ddl.md).
- [ ] 보여 줄 증거: `curl -s https://gakdo.site/api/v1/rentals` → 401 Problem, gateway `RoleRouteMatrixIntegrationTest`, report_server `SealService`, gitops `compose/ops/autodeploy.sh`.
- [ ] 숫자는 이 문서 0장 표만 씁니다. 커버리지를 말할 땐 "11/20, 로컬, Testcontainers 제외"를 붙입니다.
- [ ] 약점 1·2(아웃박스, DB 계정)는 질문이 오기 전에 먼저 꺼냅니다.
