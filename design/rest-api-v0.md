# REST API 명세 v0

모든 요청은 gateway 한 곳으로 들어오고, gateway가 JWT를 검증한 뒤 경로 앞부분으로 서버를 고릅니다. 화면은 C가, 서버 API는 A가 만들고, 진단 에이전트(B)는 페어링 교환과 진단 업로드만, 부스 Jetson(B)은 부스 토큰·렌탈 목록·부스 코드·촬영 세트·탐지만 부릅니다.

> **원본은 contracts입니다.** 11/3 계약 고정 때 이 표를 서버별 OpenAPI 3.1 파일 5개(`contracts/openapi/*.yaml`)로 옮겼고, 지금은 계약이 원본이고 이 문서는 요약입니다. 아래 표는 **2026-11-08 contracts develop(`3c94134`)** 의 경로·`x-trace-access`(역할·범위)와 맞췄습니다. 둘이 다르면 계약이 맞습니다. 서버 코드·gateway 규칙과의 대조는 맨 아래 [구현 대조](#구현-대조-118)에 있습니다.

## 공통 규칙

- **주소:** `https://gakdo.site/api/v1/...`(강사님 nginx → web nginx `/api/` → gateway, 11/3부터). 계약 `servers`에 남은 `localhost:8314`는 예전 클러스터 시절 gateway 포트입니다. 경로 앞부분으로 서버를 나눕니다: `/auth` auth-server, `/rentals`·`/devices`·`/device-models`·`/pilot` rental-server, `/captures` capture-server, `/diagnostics` diagnostics-server, `/reports`·`/verify` report-server.
- **인증:** `Authorization: Bearer <액세스 JWT>`. 리프레시 토큰은 HttpOnly 쿠키이고 `/api/v1/auth/refresh`에만 실려 갑니다.
- **형식:** JSON camelCase, 시각은 ISO 8601 + 오프셋, ID는 `publicId`(NanoID 21자, 예: `IPv6mcQOlTkKj6mOecAQt`)이고 DB 기본 키(bigint)는 내보내지 않습니다.
- **오류:** RFC 9457 Problem Details(`application/problem+json`)에 `code`를 더합니다. Spring Boot 3의 ProblemDetail을 그대로 씁니다.
- **목록:** `?limit=20&cursor=...` → `{ "items": [], "nextCursor": "..." }`
- **요청 제한:** 계약은 가입·이메일 코드 확인·재발송·로그인·페어링 교환에 429(IP당 분당 10회, `RATE_LIMITED`)를 둡니다. 지금 gateway(Redis, 키 `trace:`)가 실제로 세는 것은 **로그인과 페어링 교환 두 경로뿐**이고, 재발송은 auth-server가 60초에 1번(`RESEND_TOO_SOON`), 부스 코드 교환은 rental-server가 모든 부스 합쳐 틀린 코드 1분 30번을 넘으면 1분 동안 429를 냅니다. 가입·코드 확인의 IP 제한은 아직 없습니다(구현 대조 참고).
- **중복 요청:** 촬영 완료와 진단 업로드는 `Idempotency-Key` 헤더로 한 번만 처리합니다.
- **배포 확인:** 서버마다 `GET /api/v1/<auth|rentals|captures|diagnostics|reports>/ping`이 인증 없이 `commit`을 돌려줍니다.
- **서버로 넘기는 헤더:** `X-User-Id`·`X-Role`·`X-Scope`는 gateway만 넣고, 밖에서 온 같은 이름의 헤더는 지웁니다.
- **진행률(SSE):** 브라우저 기본 EventSource는 Authorization 헤더를 못 보내서, web은 fetch 기반 SSE(`@microsoft/fetch-event-source`)로 붙습니다.

오류 예시

```json
{
  "title": "진행 중인 렌탈이 있습니다",
  "status": 409,
  "code": "RENTAL_OPEN_EXISTS",
  "detail": "같은 기기로 진행 중인 렌탈은 하나만 만들 수 있습니다.",
  "instance": "/api/v1/rentals"
}
```

## 역할

| 역할 | 받는 법 | 수명 |
| --- | --- | --- |
| PUBLIC | 토큰 없음 |  |
| ADMIN | 이메일·비밀번호 로그인 | 15분 + 리프레시 7일 |
| CUSTOMER | 가입·이메일 인증 후 로그인, `rentals` 클레임 | 15분 + 리프레시 7일 |
| 촬영 (CUSTOMER 범위) | 로그인한 고객이 QR 토큰을 교환, `checkpointId` 범위 | 30분 |
| BOOTH | client\_id·secret 교환, `boothId` 범위 | 1시간 |

관리자 화면의 부스 태블릿 화면(`/booth`, 11/6)은 BOOTH 토큰이 아니라 ADMIN 로그인으로 엽니다(BOOTH는 검사 결과를 읽을 수 없고 비밀값을 브라우저에 둘 수 없어서).
| AGENT | 페어링 코드 교환, `checkpointId` 범위 | 10분 |

## auth-server — /api/v1/auth

| 메서드 | 경로 | 역할 | 하는 일 | 주요 응답 | 요구사항 |
| --- | --- | --- | --- | --- | --- |
| POST | /auth/signup | PUBLIC | 가입(이메일·비밀번호·이름·동의), 인증 코드 메일 | 201 PENDING · 400 동의 없음 · 409 이메일 중복 | FR-USR-01·05 |
| POST | /auth/email/verify | PUBLIC | 6자리 코드 확인 → ACTIVE | 204 · 400 틀림(남은 횟수) · 410 만료 | FR-USR-05 |
| POST | /auth/email/resend | PUBLIC | 코드 재발송 | 202 · 429 60초 안 | FR-USR-05 |
| POST | /auth/login | PUBLIC | 액세스 JWT + 리프레시 쿠키 | 200 · 401 · 403 인증 전 | FR-AUTH-01 |
| POST | /auth/refresh | 쿠키 | 액세스 재발급, 리프레시 교체 | 200 · 401 | FR-AUTH-01 |
| POST | /auth/logout | ADMIN·CUSTOMER | 리프레시 폐기 | 204 | FR-AUTH-01 |
| POST | /auth/password/reset-request | PUBLIC | 재설정 코드 메일 | 항상 202 | FR-USR-06 |
| POST | /auth/password/reset | PUBLIC | 코드 + 새 비밀번호, 리프레시 전부 폐기 | 204 · 400 · 410 | FR-USR-06 |
| GET | /auth/me | ADMIN·CUSTOMER | 내 정보와 연결된 렌탈 ID | 200 | FR-USR-03 |
| DELETE | /auth/me | CUSTOMER | 탈퇴(비밀번호 확인) | 204 · 401 | FR-USR-04 |
| POST | /auth/capture-links | ADMIN | 수령 QR 링크 발급(rentalId, checkpointId) | 201 `{url, expiresAt}` | FR-RNT-04 |
| POST | /auth/capture-links/exchange | CUSTOMER | QR 토큰 → 촬영 JWT, 렌탈을 내 계정에 연결 | 200 · 409 다른 계정에 연결됨 · 410 만료·사용됨 | FR-AUTH-02, FR-USR-02 |
| POST | /auth/booth/token | PUBLIC(클라이언트 비밀) | 부스 JWT | 200 · 401 | FR-AUTH-02 |
| POST | /auth/pairing-codes | ADMIN | 에이전트 페어링 코드 발급(rentalId, checkpointId, deviceSerial — 기기 목록에서 고른 등록 시리얼) | 201 `{code, expiresAt}` | FR-AUTH-02 |
| POST | /auth/pairing-codes/exchange | PUBLIC | 코드 → AGENT JWT(rentalId·deviceSerial 클레임 포함) | 200 · 400 · 410 · 429 | FR-AUTH-02 |
| GET | /.well-known/jwks.json | gateway(내부) | 공개키 | 200 | FR-AUTH-03 |

## rental-server — /api/v1

| 메서드 | 경로 | 역할 | 하는 일 | 주요 응답 | 요구사항 |
| --- | --- | --- | --- | --- | --- |
| POST | /rentals | ADMIN | 렌탈 생성(deviceId, renterRef) | 201 · 404 · 409 진행 중 렌탈 있음 또는 기기가 ACTIVE 아님 | FR-RNT-01 |
| GET | /rentals?status=&deviceId=&limit=&cursor= | ADMIN·CUSTOMER·BOOTH | 목록. CUSTOMER는 rentals 클레임의 내 렌탈만, BOOTH는 진행 중(OPEN) 렌탈만(11/3) | 200 | FR-USR-03, FR-CAP-01 |
| GET | /rentals/{rentalId} | ADMIN·CUSTOMER(본인) | 렌탈과 세 시점 상태 | 200 · 403 · 404 | FR-RNT-02 |
| DELETE | /rentals/{rentalId} | ADMIN | 시험 렌탈 지우기(11/4). 기기 시리얼이 `TEST-`로 시작하는 렌탈만, 시점마다 `trace.checkpoint.purged` 발행 | 204 · 404 · 409 `NOT_TEST_DATA` | FR-RNT-02 |
| POST | /rentals/{rentalId}/checkpoints | ADMIN | 시점 시작(type OUT·RCV·RET) | 201 · 409 순서 위반 | FR-RNT-02 |
| POST | /rentals/{rentalId}/booth-code | ADMIN | 부스 6자리 코드 발급(11/4). 지금 시점(OPEN)에 묶임, 10분 1회용 | 201 `{code, expiresAt, checkpointId, checkpointType}` · 409 | FR-RNT-02 |
| POST | /rentals/booth-codes/redeem | BOOTH | 코드 → 기기·렌탈·시점 ID | 200 · 400 `BOOTH_CODE_INVALID` · 410 `BOOTH_CODE_EXPIRED` · 429 | FR-RNT-02 |
| POST | /rentals/{rentalId}/close | ADMIN | 반납 후 종료 | 204 · 409 | FR-RNT-02 |
| POST | /devices | ADMIN | 기기 등록(serial, modelCode, os, color·assetNo 선택) | 201 · 404 기종 없음 · 409 | FR-RNT-01 |
| GET | /devices?modelCode=&status=&q=&limit=&cursor= | ADMIN | 기기 목록·검색(q는 시리얼·자산번호 일부) | 200 | FR-RNT-05 |
| GET | /devices/{deviceId} | ADMIN | 기기 상세(기기별 렌탈 이력 화면) | 200 · 404 | FR-RNT-05 |
| PATCH | /devices/{deviceId} | ADMIN | 색상·자산번호·OS·상태 수정. 시리얼·기종은 못 바꿈 | 200 · 404 · 409 진행 중 렌탈이 있는데 수리 중·폐기로 바꿈 | FR-RNT-05 |
| GET | /device-models | ADMIN | 기종 목록(기기 등록 화면의 선택 목록) | 200 | FR-RNT-03 |
| GET | /device-models/{modelCode} | ADMIN·CUSTOMER | 3D 트윈 치수 | 200 · 404 | FR-RNT-03 |
| PUT | /device-models/{modelCode} | ADMIN | 기종 등록·수정(치수·제조사·형태·기준 사양) | 200 | FR-RNT-03 |
| POST | /pilot/participants | ADMIN | 파일럿 별칭 등록(alias, deviceId, consentAt) | 201 · 409 | FR-PIL-01 |

## capture-server — /api/v1/captures

| 메서드 | 경로 | 역할 | 하는 일 | 주요 응답 | 요구사항 |
| --- | --- | --- | --- | --- | --- |
| POST | /captures/sets | BOOTH(자기 부스)·촬영 | 촬영 세트 생성(rentalId·checkpointId·source, 선택 device·profile) + 사진별 업로드 URL(PUT, 10분). 응답 uploads는 사진마다 face·light·camera를 돌려줌. device(modelCode·dimensions)를 빼면 inspect-worker가 기본 기종 치수로 표준 좌표를 만들므로, 여러 기종을 쓰면 렌탈 기종·치수를 꼭 보냄 | 201 · 403 범위 밖 시점 | FR-CAP-01·05 |
| POST | /captures/sets/{setId}/uploads | BOOTH·촬영 | 아직 안 올라간 사진의 업로드 URL 다시 받기(10분). 본문 photos를 빼면 남은 사진 전부 | 200 · 404 · 409 완료된 세트 | FR-CAP-05 |
| POST | /captures/sets/{setId}/complete | BOOTH·촬영 | 해시 확인 후 capture.uploaded 발행(`Idempotency-Key`). 본문 skippedFaces {면: 사유}는 선택 면(SCR1)만 | 202 · 409 필수 면 빠짐·해시 불일치(`CAPTURE_HASH_MISMATCH`)·완료된 세트 · 422 같은 `Idempotency-Key`에 다른 본문 | FR-CAP-01·02 |
| POST | /captures/sets/{setId}/detections | BOOTH(자기 부스) | Jetson 탐지 결과 저장. 탐지마다 face·light·camera, 좌표는 원본 사진 px. 선택 inferenceMs·boothTotalMs(11/6). QUICK 세트는 `analyzedPhotos`에 TOP·BOT 사진을 흠집 없는 사진까지 모두 담아야 함(빠지면 400) | 201 · 400 · 404 · 409 | FR-INS-01 |
| GET | /captures/sets/{setId} | ADMIN·촬영 | 세트 상태 | 200 · 404 | FR-CAP-01 |
| GET | /captures/checkpoints/{checkpointId}/inspection | ADMIN·CUSTOMER(본인) | 흠집·신규 판정·등급 | 200 · 404 | FR-INS-03·04 |
| GET | /captures/checkpoints/{checkpointId}/media | ADMIN·CUSTOMER(본인) | 사진·텍스처·크롭 보기 URL(GET, 10분) | 200 · 404 | FR-RPT-01 |
| GET | /captures/benchmarks?source=&limit= | ADMIN | 세트별 처리 시간(탐지·완료→등급·부스 전체)과 모델별 mAP(11/6, 성능 그래프) | 200 | FR-INS-01 |
| GET | /captures/reviews?status=PENDING&limit=20 | ADMIN | 사람 검수 대기(PENDING)·끝난(CONFIRMED) 시점 목록. 시점마다 후보 수·남은 수 | 200 · 400 status=DISMISSED | FR-INS-03 |
| POST | /captures/checkpoints/{checkpointId}/reviews | ADMIN | AI 후보 결정 저장. items[]{defectId, decision CONFIRMED·DISMISSED·PENDING, reason(DISMISSED만)} | 200 검사 결과 · 409 REVIEW_CLOSED | FR-INS-03 |
| POST | /captures/checkpoints/{checkpointId}/reviews/complete | ADMIN | 검수 완료 → 확정분만으로 등급. 200은 등급이 매겨졌다는 뜻이고, 봉인은 report-server가 판정 이벤트를 받은 뒤(진단을 기다릴 수 있음) 따로 하므로 다음 시점 전에는 리포트의 봉인 상태를 확인. Idempotency-Key 필수 | 200 · 409 REVIEW_PENDING_REMAINS(pending)·REVIEW_NOT_READY·REVIEW_CLOSED | FR-INS-03·04 |

필수 면은 세트 출처와 범위로 정합니다: FULL은 codes.yaml `capture.face_required`(부스 8면·폰 7면, SCR1 선택), QUICK(11/3 MVP 부스 빠른 검사)은 `capture.face_required_quick.BOOTH` = TOP·BOT(조명 3 × 카메라 2 = 12장)이고 정합 없이 부스 탐지로 등급을 매깁니다.

## diagnostics-server — /api/v1/diagnostics

| 메서드 | 경로 | 역할 | 하는 일 | 주요 응답 | 요구사항 |
| --- | --- | --- | --- | --- | --- |
| POST | /diagnostics/runs | AGENT | 진단 JSON v0 업로드(checkpointId는 토큰에서) | 201 `{runId, flags}` · 409 이미 올림 · 422 형식·시리얼 불일치 | FR-DIA-05·06 |
| GET | /diagnostics/checkpoints/{checkpointId} | ADMIN·CUSTOMER(본인) | 진단 요약·이전 시점 비교·플래그 | 200 | FR-DIA-06 |

## report-server — /api/v1/reports, /api/v1/verify

| 메서드 | 경로 | 역할 | 하는 일 | 주요 응답 | 요구사항 |
| --- | --- | --- | --- | --- | --- |
| GET | /reports/rentals/{rentalId} | ADMIN·CUSTOMER(본인) | 타임라인(시점별 등급·핀·진단 비교·체인 상태) | 200 | FR-RPT-03 |
| GET | /reports/rentals/{rentalId}/stream | ADMIN·CUSTOMER(본인)·촬영 | 진행률 SSE(이벤트 progress·done·error) | 200 `text/event-stream` | FR-RPT-04 |
| GET | /reports/rentals/{rentalId}/chain | ADMIN | 해시 체인 전체 | 200 | FR-INT-01 |
| GET | /verify/{verifyToken} | PUBLIC | 체인 정상 여부, 시점별 등급·지문·서명 시각 | 200 · 404 | FR-INT-02·03 |
| POST | /reports/rentals/{rentalId}/checkpoints/{checkpointId}/seal | ADMIN | 관리자 수동 봉인(시연 우회로, 사유 5~300자, 사용 기록 남김) | 201 · 400 · 404 · 409 `RECORD_ALREADY_SEALED`·`CHECKPOINT_ORDER_VIOLATION` | FR-INT-01 |
| GET | /reports/manual-seals | ADMIN | 수동 봉인 사용 기록(커서) | 200 | FR-INT-01 |
| GET | /reports/search?q=&limit=&cursor= | ADMIN | 기록 검색(선택). **계약·gateway에만 있고 report-server에 없음**(지금 호출하면 404) | 200 | FR-RPT-05 |

## 역할 × 경로 표

FR-AUTH-03의 수용 기준입니다. gateway는 이 표를 손으로 옮기지 않고 contracts의 `x-trace-access`에서 `access-policy.yaml`을 만들어 씁니다(gateway `scripts/gen_access_policy.py`). ✓ 허용, ✗ 403(PUBLIC은 401), "본인"은 rentals 클레임에 있는 렌탈만.

| 경로 묶음 | PUBLIC | ADMIN | CUSTOMER | 촬영 | BOOTH | AGENT |
| --- | --- | --- | --- | --- | --- | --- |
| 가입·인증·로그인·재설정·부스 토큰·페어링 교환 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 내 정보·로그아웃 | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ |
| 탈퇴 | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| QR 링크·페어링 코드 발급 | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| QR 교환 | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| 기기·기종 목록, 기기 상세, 렌탈·기기·기종 쓰기, 시험 렌탈 지우기, 부스 코드 발급, 파일럿 | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| 부스 코드 교환 | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| 렌탈 목록 | ✗ | ✓ | 본인 | ✗ | 진행 중만(11/3) | ✗ |
| 렌탈 상세, 기종 치수 읽기 | ✗ | ✓ | 본인 | ✗ | ✗ | ✗ |
| 촬영 세트 생성·완료 | ✗ | ✗ | ✗ | 그 시점만 | 자기 부스 | ✗ |
| 촬영 세트 상태 읽기 | ✗ | ✓ | ✗ | 그 시점만 | ✗ | ✗ |
| 탐지 결과 올리기 | ✗ | ✗ | ✗ | ✗ | 자기 부스 | ✗ |
| 검사 결과·사진 URL 읽기 | ✗ | ✓ | 본인 | ✗ | ✗ | ✗ |
| 흠집 후보 검수(대기 목록·결정·완료) | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| 진단 올리기 | ✗ | ✗ | ✗ | ✗ | ✗ | 그 시점만 |
| 진단 결과 읽기 | ✗ | ✓ | 본인 | ✗ | ✗ | ✗ |
| 리포트·진행률 | ✗ | ✓ | 본인 | 진행률만 | ✗ | ✗ |
| 체인 전체·검색, 성능 기록(benchmarks) | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| 수동 봉인·사용 기록 | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| 검증 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## 화면별로 부르는 API (C)

| 화면 | 부르는 순서 |
| --- | --- |
| 고객 가입 | signup → email/verify (필요하면 email/resend) |
| 로그인·비밀번호 재설정 | login · refresh / password/reset-request → password/reset |
| 수령 촬영 (고객 폰) | QR 열기 → login → capture-links/exchange → captures/sets → MinIO에 PUT 9번 → sets/{id}/complete → reports/rentals/{id}/stream |
| 내 렌탈 | auth/me → rentals → reports/rentals/{id} → captures/checkpoints/{id}/media · device-models/{code} |
| 탈퇴 | DELETE auth/me |
| 관리자 렌탈 관리 | rentals(목록·생성·시험 렌탈 지우기) · devices(목록·상세·등록·수정) · device-models(목록·등록) · rentals/{id}/checkpoints · rentals/{id}/booth-code · capture-links(QR 표시) · pairing-codes |
| 관리자 검사 결과 (MVP) | captures/checkpoints/{id}/inspection · /media |
| 관리자 성능 (`/admin/benchmark`, 11/6 Grafana 대신) | devices · rentals?deviceId= · diagnostics/checkpoints/{id} (기기별 렌탈 전·후 진단 비교). captures/benchmarks는 11/6 그래프에서 썼다가 web #76부터 부르지 않음 |
| 부스 태블릿 (`/booth`, ADMIN 로그인) | rentals(OPEN) · device-models · rentals/{id}/booth-code · captures/checkpoints/{id}/inspection |
| 관리자 리포트 | reports/rentals/{id} · /chain · captures/checkpoints/{id}/inspection · diagnostics/checkpoints/{id} |
| 관리자 사람 검수 | captures/reviews(대기 목록) → captures/checkpoints/{id}/inspection(후보) → captures/checkpoints/{id}/media(사진 URL) → /reviews(결정 저장) → /reviews/complete |
| 검증 페이지 (공개) | verify/{token} |

## 핵심 요청·응답 예시

촬영 세트 만들기 `POST /api/v1/captures/sets`

```json
{
  "rentalId": "Ws0HLv6QRbDILPWOcz5I2",
  "checkpointId": "IPv6mcQOlTkKj6mOecAQt",
  "source": "PHONE",
  "device": { "modelCode": "MBA13-M2", "dimensions": { "widthMm": 304.1, "depthMm": 215.0, "baseHMm": 7.0, "lidHMm": 4.0 } },
  "photos": [
    { "face": "TOP", "light": "ROOM", "camera": "PHONE", "sha256": "9f2c…", "contentType": "image/jpeg", "takenAt": "2026-11-12T13:05:00+09:00" }
  ]
}
```

응답 201

```json
{
  "captureSetId": "RxWs4wfLjxC2Rjla92Xe1",
  "uploads": [
    { "face": "TOP", "light": "ROOM", "camera": "PHONE", "method": "PUT", "url": "https://<minio>/trace-captures/…", "expiresAt": "2026-11-12T10:20:00+09:00" }
  ]
}
```

`uploads`는 요청 `photos`와 같은 순서로 face·light·camera를 그대로 돌려줍니다. 부스는 같은 면·조명을 CAM1·CAM2로 두 장 올리므로 camera로 구분합니다. 부스 빠른 검사는 `"source": "BOOTH", "profile": "QUICK"`에 TOP·BOT × L1·L2·L3 × CAM1·CAM2 12장을 보냅니다(profile을 빼면 FULL). 완료(`/complete`)는 필수 면이 빠지면 409이고, 선택 면 SCR1을 건너뛸 때는 본문 `skippedFaces`에 사유를 넣습니다.

검증 `GET /api/v1/verify/{verifyToken}` 응답 200

```json
{
  "valid": true,
  "modelName": "MacBook Air (M2, 2022)",
  "records": [
    { "seq": 1, "checkpointType": "OUT", "grade": "A", "payloadHash": "7f3a…e21b", "signedAt": "2026-11-12T09:00:00+09:00" },
    { "seq": 2, "checkpointType": "RCV", "grade": "A", "payloadHash": "c41d…9a07", "signedAt": "2026-11-12T13:10:00+09:00" }
  ],
  "checkedAt": "2026-11-18T15:00:00+09:00"
}
```

검증 응답에는 사진·진단 상세와 개인정보를 넣지 않습니다(리뷰 12번).

## 11/3까지 (지난 할 일)

- [x] 서버별 OpenAPI 3.1 파일 5개를 `contracts/openapi/`에 커밋 (A) — contracts PR #1
- [x] 역할 × 경로 표를 gateway 규칙으로 옮기기 (A) — gateway `access-policy.yaml`(계약에서 생성)
- [ ] C가 화면별 API 표를 보고 빠진 API 요청 (C)
- [ ] B가 페어링 교환·진단 업로드 두 개를 확인 (B)

## 구현 대조 (11/8)

contracts develop(`3c94134`)의 경로 54개(ping 5개, 내부 JWKS 포함)를 서버 5개 develop의 `@*Mapping`, gateway develop의 `access-policy.yaml`(contracts `dc682b8`에서 생성, 그 뒤 계약 변경은 스키마만이라 경로·역할은 같음)·라우트와 비교했습니다.

| 구분 | 경로 | 계약 | 서버 | gateway | 메모 |
| --- | --- | --- | --- | --- | --- |
| 계약에 있는데 서버에 없음 | GET /api/v1/reports/search | ✓ (ADMIN, FR-RPT-05 선택) | ◐ report_server #9(11/8)에서 컨트롤러 추가(ADMIN) | ✓ 규칙·라우트 있음 | #9가 배포되기 전에는 gateway 통과 뒤 404. Elasticsearch 연동은 없음. web도 부르지 않음 |
| 서버에 있는데 계약에 없음 | — | | | | 없음(서버 경로 53개가 모두 계약에 있음) |
| gateway 규칙 없음 | GET /.well-known/jwks.json | ✓ `x-trace-internal` | ✓ auth-server | 라우트·규칙 없음 | 의도대로(gateway가 안에서만 읽음) |
| 역할 차이 | POST /api/v1/auth/refresh | ADMIN·CUSTOMER(리프레시 쿠키) | ✓ | 공개(토큰 검사 없음) | 의도대로(액세스 토큰이 만료된 뒤 부르므로 쿠키를 auth-server가 확인) |
| 요청 제한 누락 | POST /auth/signup · /auth/email/verify · /auth/email/resend | 429 `RATE_LIMITED`(IP당 분당 10회) | resend만 60초 1회 | login·pairing-codes/exchange에만 `IpRateLimit` | 가입·코드 확인은 IP 제한이 없음 |
| 계약·서버에 있는데 화면이 안 씀 | GET /api/v1/captures/benchmarks | ✓ | ✓ | ✓ ADMIN | web #76에서 성능 화면을 진단 비교로 바꾼 뒤 호출 없음 |

라우트(gateway `application.yml`): `/api/v1/auth/**` → auth-server, `/rentals/**`·`/devices/**`·`/device-models/**`·`/pilot/**` → rental-server, `/captures/**` → capture-server, `/diagnostics/**` → diagnostics-server, `/reports/**`·`/verify/**` → report-server. 규칙이 없는 경로·메서드는 gateway가 서버로 넘기지 않고 404로 돌려줍니다(`AccessDecision.NOT_FOUND`).
