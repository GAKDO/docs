# REST API 명세 v0

모든 요청은 gateway 한 곳으로 들어오고, gateway가 JWT를 검증한 뒤 경로 앞부분으로 서버를 고릅니다. 화면은 C가, 서버 API는 A가 만들고, 진단 에이전트(B)는 페어링 교환과 진단 업로드만 부릅니다. 11/3 계약 고정 때 이 표를 서버별 OpenAPI 3.1 파일로 옮겨 `contracts/openapi/`에 넣습니다.

## 공통 규칙

- **주소:** `https://<gateway>/api/v1/...`. 경로 앞부분으로 서버를 나눕니다: `/auth` auth-server, `/rentals`·`/devices`·`/device-models`·`/pilot` rental-server, `/captures` capture-server, `/diagnostics` diagnostics-server, `/reports`·`/verify` report-server.
- **인증:** `Authorization: Bearer <액세스 JWT>`. 리프레시 토큰은 HttpOnly 쿠키이고 `/api/v1/auth/refresh`에만 실려 갑니다.
- **형식:** JSON camelCase, 시각은 ISO 8601 + 오프셋, ID는 UUIDv7.
- **오류:** RFC 9457 Problem Details(`application/problem+json`)에 `code`를 더합니다. Spring Boot 3의 ProblemDetail을 그대로 씁니다.
- **목록:** `?limit=20&cursor=...` → `{ "items": [], "nextCursor": "..." }`
- **요청 제한:** 가입·로그인·코드 확인·페어링 교환은 gateway가 Redis로 IP당 분당 10회까지 받고, 넘으면 429.
- **중복 요청:** 촬영 완료와 진단 업로드는 `Idempotency-Key` 헤더로 한 번만 처리합니다.
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
| POST | /auth/pairing-codes | ADMIN | 에이전트 페어링 코드 발급(checkpointId) | 201 `{code, expiresAt}` | FR-AUTH-02 |
| POST | /auth/pairing-codes/exchange | PUBLIC | 코드 → AGENT JWT | 200 · 400 · 410 | FR-AUTH-02 |
| GET | /.well-known/jwks.json | gateway(내부) | 공개키 | 200 | FR-AUTH-03 |

## rental-server — /api/v1

| 메서드 | 경로 | 역할 | 하는 일 | 주요 응답 | 요구사항 |
| --- | --- | --- | --- | --- | --- |
| POST | /rentals | ADMIN | 렌탈 생성(deviceId, renterRef) | 201 · 409 진행 중 렌탈 있음 또는 기기가 ACTIVE 아님 | FR-RNT-01 |
| GET | /rentals | ADMIN·CUSTOMER | 목록. CUSTOMER는 내 렌탈만 | 200 | FR-USR-03 |
| GET | /rentals/{rentalId} | ADMIN·CUSTOMER(본인) | 렌탈과 세 시점 상태 | 200 · 403 | FR-RNT-02 |
| POST | /rentals/{rentalId}/checkpoints | ADMIN | 시점 시작(type OUT·RCV·RET) | 201 · 409 순서 위반 | FR-RNT-02 |
| POST | /rentals/{rentalId}/close | ADMIN | 반납 후 종료 | 204 · 409 | FR-RNT-02 |
| POST | /devices | ADMIN | 기기 등록(serial, modelCode) | 201 · 409 | FR-RNT-01 |
| GET | /devices?modelCode=&status=&q=&page= | ADMIN | 기기 목록·검색(q는 시리얼·자산번호 일부) | 200 | FR-RNT-05 |
| PATCH | /devices/{deviceId} | ADMIN | 색상·자산번호·OS·상태 수정. 시리얼·기종은 못 바꿈 | 200 · 404 · 409 진행 중 렌탈이 있는데 수리 중·폐기로 바꿈 | FR-RNT-05 |
| GET | /device-models | ADMIN | 기종 목록(기기 등록 화면의 선택 목록) | 200 | FR-RNT-03 |
| GET | /device-models/{modelCode} | ADMIN·CUSTOMER | 3D 트윈 치수 | 200 · 404 | FR-RNT-03 |
| PUT | /device-models/{modelCode} | ADMIN | 기종 등록·수정(치수·제조사·형태·기준 사양) | 200 | FR-RNT-03 |
| POST | /pilot/participants | ADMIN | 파일럿 별칭 등록(alias, deviceId, consentAt) | 201 | FR-PIL-01 |

## capture-server — /api/v1/captures

| 메서드 | 경로 | 역할 | 하는 일 | 주요 응답 | 요구사항 |
| --- | --- | --- | --- | --- | --- |
| POST | /captures/sets | BOOTH·촬영 | 촬영 세트 생성 + 사진별 업로드 URL(PUT, 10분). 응답 uploads는 사진마다 face·light·camera를 돌려줌 | 201 · 403 범위 밖 시점 | FR-CAP-01·05 |
| POST | /captures/sets/{setId}/complete | BOOTH·촬영 | 해시 확인 후 capture.uploaded 발행. 본문 skippedFaces {면: 사유}는 선택 면(SCR1)만 | 202 · 409 출처별 필수 면 빠짐(부스 8면, SCR1 선택) | FR-CAP-01·02 |
| POST | /captures/sets/{setId}/detections | BOOTH | Jetson 탐지 결과 저장 | 201 | FR-INS-01 |
| GET | /captures/sets/{setId} | ADMIN·촬영 | 세트 상태 | 200 | FR-CAP-01 |
| GET | /captures/checkpoints/{checkpointId}/inspection | ADMIN·CUSTOMER(본인) | 흠집·신규 판정·등급 | 200 | FR-INS-03·04 |
| GET | /captures/checkpoints/{checkpointId}/media | ADMIN·CUSTOMER(본인) | 텍스처·크롭 보기 URL(GET, 10분) | 200 | FR-RPT-01 |

## diagnostics-server — /api/v1/diagnostics

| 메서드 | 경로 | 역할 | 하는 일 | 주요 응답 | 요구사항 |
| --- | --- | --- | --- | --- | --- |
| POST | /diagnostics/runs | AGENT | 진단 JSON v0 업로드(checkpointId는 토큰에서) | 201 `{runId, flags}` · 409 이미 올림 · 422 형식·시리얼 불일치 | FR-DIA-05·06 |
| GET | /diagnostics/checkpoints/{checkpointId} | ADMIN·CUSTOMER(본인) | 진단 요약·이전 시점 비교·플래그 | 200 | FR-DIA-06 |

## report-server — /api/v1/reports, /api/v1/verify

| 메서드 | 경로 | 역할 | 하는 일 | 주요 응답 | 요구사항 |
| --- | --- | --- | --- | --- | --- |
| GET | /reports/rentals/{rentalId} | ADMIN·CUSTOMER(본인) | 타임라인(시점별 등급·핀·진단 비교·체인 상태) | 200 | FR-RPT-03 |
| GET | /reports/rentals/{rentalId}/stream | ADMIN·CUSTOMER(본인)·촬영 | 진행률 SSE | 200 `text/event-stream` | FR-RPT-04 |
| GET | /reports/rentals/{rentalId}/chain | ADMIN | 해시 체인 전체 | 200 | FR-INT-01 |
| GET | /verify/{verifyToken} | PUBLIC | 체인 정상 여부, 시점별 등급·지문·서명 시각 | 200 · 404 | FR-INT-02·03 |
| GET | /reports/search?q= | ADMIN | 기록 검색(선택) | 200 | FR-RPT-05 |

## 역할 × 경로 표

FR-AUTH-03의 수용 기준입니다. 칸마다 gateway 통합 테스트를 하나씩 둡니다. ✓ 허용, ✗ 403(PUBLIC은 401), "본인"은 rentals 클레임에 있는 렌탈만.

| 경로 묶음 | PUBLIC | ADMIN | CUSTOMER | 촬영 | BOOTH | AGENT |
| --- | --- | --- | --- | --- | --- | --- |
| 가입·인증·로그인·재설정·부스 토큰·페어링 교환 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 내 정보·로그아웃 | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ |
| 탈퇴 | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| QR 링크·페어링 코드 발급 | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| QR 교환 | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| 기기·기종 목록, 렌탈·기기·기종 쓰기, 파일럿 | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| 렌탈 읽기, 기종 치수 읽기 | ✗ | ✓ | 본인 | ✗ | ✗ | ✗ |
| 촬영 세트 생성·완료 | ✗ | ✗ | ✗ | 그 시점만 | 자기 부스 | ✗ |
| 탐지 결과 올리기 | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| 검사 결과·사진 URL 읽기 | ✗ | ✓ | 본인 | ✗ | ✗ | ✗ |
| 진단 올리기 | ✗ | ✗ | ✗ | ✗ | ✗ | 그 시점만 |
| 진단 결과 읽기 | ✗ | ✓ | 본인 | ✗ | ✗ | ✗ |
| 리포트·진행률 | ✗ | ✓ | 본인 | 진행률만 | ✗ | ✗ |
| 체인 전체·검색 | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| 검증 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## 화면별로 부르는 API (C)

| 화면 | 부르는 순서 |
| --- | --- |
| 고객 가입 | signup → email/verify (필요하면 email/resend) |
| 로그인·비밀번호 재설정 | login · refresh / password/reset-request → password/reset |
| 수령 촬영 (고객 폰) | QR 열기 → login → capture-links/exchange → captures/sets → MinIO에 PUT 9번 → sets/{id}/complete → reports/rentals/{id}/stream |
| 내 렌탈 | auth/me → rentals → reports/rentals/{id} → captures/checkpoints/{id}/media · device-models/{code} |
| 탈퇴 | DELETE auth/me |
| 관리자 렌탈 관리 | rentals(목록·생성) · devices(목록·등록·수정) · device-models(목록) · rentals/{id}/checkpoints · capture-links(QR 표시) · pairing-codes |
| 관리자 리포트 | reports/rentals/{id} · /chain · captures/checkpoints/{id}/inspection · diagnostics/checkpoints/{id} |
| 검증 페이지 (공개) | verify/{token} |

## 핵심 요청·응답 예시

촬영 세트 만들기 `POST /api/v1/captures/sets`

```json
{
  "checkpointId": "0193a1c2-0000-7000-8000-000000000001",
  "source": "PHONE",
  "photos": [
    { "face": "TOP", "light": "ROOM", "camera": "PHONE", "sha256": "9f2c…", "contentType": "image/jpeg" }
  ]
}
```

응답 201

```json
{
  "captureSetId": "0193a1c2-0000-7000-8000-0000000000aa",
  "uploads": [
    { "face": "TOP", "light": "ROOM", "camera": "PHONE", "method": "PUT", "url": "https://<minio>/trace-captures/…", "expiresAt": "2026-11-12T10:20:00+09:00" }
  ]
}
```

`uploads`는 요청 `photos`와 같은 순서로 face·light·camera를 그대로 돌려줍니다. 부스는 같은 면·조명을 CAM1·CAM2로 두 장 올리므로 camera로 구분합니다. 완료(`/complete`)는 세트 출처의 필수 면(codes.yaml `face_required`, 부스 8면)이 빠지면 409이고, 선택 면 SCR1을 건너뛸 때는 본문 `skippedFaces`에 사유를 넣습니다.

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

## 11/3까지

- [x] 서버별 OpenAPI 3.1 파일 5개를 `contracts/openapi/`에 커밋 (A) — contracts PR #1
- [ ] 역할 × 경로 표를 gateway 통합 테스트 목록으로 옮기기 (A)
- [ ] C가 화면별 API 표를 보고 빠진 API 요청 (C)
- [ ] B가 페어링 교환·진단 업로드 두 개를 확인 (B)
