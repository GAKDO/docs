# API 리뷰 준비 (11/20)

강사님 리뷰의 "API" 파트입니다. 실제 코드(서버 5개·gateway develop)와 계약(contracts develop `42ac468`)을 처음부터 다시 맞춰 보고, 고칠 수 있는 것은 고치고, 물어보실 만한 것을 답과 함께 적었습니다. 스펙 버전·계약 체계 자체는 스펙 파트가 맡고, 여기서는 엔드포인트 수준을 다룹니다.

## 1. 한 줄 요약

- 모든 요청은 **gateway 한 곳**으로 들어오고, 경로 앞부분으로 서버 6개(auth·rental·capture·diagnostics·report·chat)에 나눕니다.
- **계약이 먼저**입니다. 서버별 OpenAPI 3.1(작업 74개)이 원본이고, gateway의 권한 표(`access-policy.yaml`)와 web의 API 타입은 계약에서 **생성**합니다. 손으로 옮기지 않습니다.
- 11/20 다시 맞춘 결과: **계약에만 있거나 서버에만 있는 경로 0개**, 서버의 오류 코드 전부가 `codes.yaml`에 있고 HTTP 상태도 계약과 같습니다. 어긋난 곳 두 개를 찾아 고쳤습니다(4장).

## 2. 요청 하나가 지나가는 길 (기술 흐름)

```
브라우저·부스 Jetson·진단 에이전트
  → 학교 nginx(gakdo.site, HTTPS) → web nginx `/api/` → gateway(Spring Cloud Gateway, WebFlux)
       ① CORS: web 출처만
       ② JWT 검증: auth-server JWKS(RS256, kid로 키 교체 대응) + iss 확인
       ③ 권한: access-policy.yaml(계약의 x-trace-access에서 생성) → 역할 × 경로, 없는 경로·메서드는 404
       ④ 요청 제한: IP당 고정 창(Redis, 키 접두사 trace:) → 429 + Retry-After
       ⑤ 신원 헤더: 밖에서 온 X-User-Id·X-Role·X-Scope는 지우고 토큰 값으로만 채움
       ⑥ 라우팅: /auth → auth, /rentals·/devices·/device-models·/pilot·/catalog → rental, /captures → capture,
                 /diagnostics → diagnostics, /reports·/verify → report, /chat → chat
       ⑦ 재시도: 연결 자체가 안 될 때만(요청이 안 나갔으니 POST도 안전). 서버가 낸 5xx·시간 초과는 다시 보내지 않음
  → 각 서버(Spring Boot 3.5, Java 21)
       ⑧ JWT를 한 번 더 검증(OAuth2 리소스 서버, 심층 방어)
       ⑨ 본인 범위(OWN_RENTAL·CHECKPOINT·BOOTH)는 서비스 코드가 DB 값과 비교 → 403 OUT_OF_SCOPE
       ⑩ 오류는 @RestControllerAdvice 한 곳에서 application/problem+json + code
       ⑪ 상태가 바뀌면 RabbitMQ(trace.events)로 이벤트 → 다른 서버가 읽기 모델을 갱신
```

사진은 API로 올리지 않습니다. capture-server가 MinIO **사전 서명 URL**을 주고 부스·폰이 MinIO에 바로 올린 뒤, `complete`에서 SHA-256을 맞춰 봅니다(다르면 409 `CAPTURE_HASH_MISMATCH`). API 서버가 큰 파일을 중계하지 않게 하려는 설계입니다.

## 3. 항목별 점검 결과

| 항목 | 지금 상태 | 판단 |
| --- | --- | --- |
| 버전 | 경로에 `/api/v1`. 11/3 계약 고정 뒤로는 **더하는 변경만**(필드·값·경로 삭제나 이름 변경 금지), CHANGELOG에 "깨지지 않음" 표시 | 좋음 |
| 자원 이름 | 복수 명사 + `{publicId}`(NanoID 21자, DB bigint는 안 내보냄). 상태 전이는 동사 하위 경로(아래 표) | 대체로 일관. 예외 2곳은 질문 대비(6장 Q3·Q4) |
| 메서드 | 조회 GET, 생성 POST, 일부 수정 PATCH(보낸 칸만, null은 비우기), 기종 사양은 자연 키로 PUT(있으면 바꾸고 없으면 만듦, 멱등), 시험 데이터만 DELETE | 좋음 |
| 상태 코드 | 생성 201, 비동기 접수 202(촬영 완료 → 검사 대기), 본문 없는 성공 204, 형식 400, 인증 401, 권한·범위 403, 없음 404, 상태 충돌 409, 만료된 코드·링크 410, 의미 검증 실패 422, 제한 429 | 좋음. 409와 422의 구분은 Q6 |
| 오류 형식 | RFC 9457 ProblemDetail + `code`(codes.yaml `error_code` 45개 중 하나) + 필드 오류는 `errors[{field, message}]`. gateway가 직접 내는 401·403·404·429도 같은 형식 | **11/20에 빈틈 하나 고침**(뒤쪽 서버가 내려갔을 때) |
| 페이징 | 커서(키셋) 방식: `?limit=1~100(기본 20)&cursor=` → `{items, nextCursor}`, 마지막이면 `nextCursor: null`. 커서는 마지막 항목의 `(createdAt, publicId)`를 base64url로 감싼 불투명 문자열. 관리자 목록 두 개는 `totalCount`도 줌 | 좋음. 왜 오프셋이 아닌지는 Q8 |
| 멱등성 | `Idempotency-Key` 헤더 필수: 촬영 완료, 검수 완료, 진단 업로드. 같은 키는 첫 응답을 그대로, 같은 키에 다른 본문은 422 `IDEMPOTENCY_KEY_CONFLICT`. 나머지 POST는 업무 규칙이 중복을 막음(진행 중 렌탈 하나 409, 봉인은 한 번 409, 탐지 결과는 통째로 바꾸기) | 좋음 |
| 동시성 | 같은 시점·같은 렌탈 쓰기는 `SELECT … FOR UPDATE`나 PostgreSQL advisory lock으로 줄 세움, 이벤트 소비는 `processed_event`(ON CONFLICT DO NOTHING)로 한 번만 | 좋음. `@Version`(낙관적 잠금)은 없음 → Q14 |
| 인증·권한 | JWT RS256, 역할 5개(ADMIN·CUSTOMER·촬영·BOOTH·AGENT)마다 수명과 범위가 다름. gateway 권한 표는 계약에서 생성, 역할 × 경로 451개 조합을 테스트 | 좋음 |
| 요청 제한 | gateway: 로그인·페어링 교환·가입·이메일 확인·재발송·비밀번호 재설정 요청·재설정 IP당 분당 10회, 소셜 로그인 30회, 공개 목록 4개 합산 300회. 서버: 재발송 60초 1번, 틀린 부스 코드 1분 30번 넘으면 1분 막음, 챗봇 분당 20개 | **11/20에 계약 빈틈 하나 고침**(재설정 두 경로의 429) |
| 계약 ↔ 코드 동기화 | 경로 74개 1:1, gateway 권한 표는 생성 스크립트 `--check`로 비교, web 타입은 openapi-typescript | 응답 본문을 스키마로 자동 검사하는 테스트는 없음 → 5장 |

동사 하위 경로를 쓴 곳과 이유

| 경로 | 왜 PATCH `status`가 아닌가 |
| --- | --- |
| `POST /rentals/{id}/close` | 닫기는 "반납 시점이 봉인돼 RETURNED인가"를 확인하고(아니면 409 `RENTAL_NOT_CLOSABLE`) 이벤트를 냄. 상태 값만 바꾸는 게 아님 |
| `POST /rentals/{id}/checkpoints` | 출고→수령→반납 순서 강제(어기면 409 `CHECKPOINT_ORDER_VIOLATION`). 시점은 렌탈 아래 자원 |
| `POST /captures/sets/{id}/complete` | 올린 사진 해시 확인 + 검사 요청 이벤트, 비동기라 202 |
| `POST /captures/checkpoints/{id}/reviews/complete` | 사람 검수 끝 → 등급 계산 → graded 이벤트 |
| `POST /diagnostics/checkpoints/{id}/redo` | 봉인 전에만 이전 진단으로 돌림 |
| `POST /reports/rentals/{r}/checkpoints/{c}/seal` | 해시 체인에 서명된 한 줄을 더함(되돌릴 수 없음) |
| `POST /auth/capture-links/exchange`, `/pairing-codes/exchange`, `/rentals/booth-codes/redeem` | 일회용 코드를 토큰·대상으로 바꾸는 교환(코드는 한 번 쓰면 끝) |

## 4. 이번에 고친 것

| PR | 무엇을 | 운영 영향 |
| --- | --- | --- |
| gateway #27 (develop 머지됨) | 뒤쪽 서버가 끝내 연결을 받지 않으면 Spring 기본 처리기가 **500 + `{timestamp, path, status, error}`** 를 냈음(테스트로 확인). `ErrorWebExceptionHandler`를 더해 연결 실패 503, 시간 초과 504, 나머지 500을 모두 Problem + `code: INTERNAL_ERROR`로 답함. 새 테스트 1개, 전체 504개 통과 | 오류 응답의 모양만 바뀜(정상 응답·재시도 규칙은 그대로). 서버 재배포 중 잠깐 실패하는 요청이 500이 아니라 503으로 보임 |
| contracts #53 (develop 머지됨, 계약 1.1.0 다음 `[Unreleased]`) | gateway가 11/8부터 막고 있던 비밀번호 재설정 요청·재설정 두 경로에 429(`TooManyRequests`, Retry-After)를 계약에 적음 | 없음(문서만 실제와 맞춤) |
| docs (이 PR) | `design/rest-api-v0.md`에 빠졌던 진단 다시 하기(`redo`) 줄, 요청 제한 설명 보강, 11/20 대조 결과 | 없음 |

## 5. 남은 약점 (솔직하게 말할 것)

| 약점 | 왜 그렇게 뒀나 | 다음에 한다면 |
| --- | --- | --- |
| 응답 본문을 OpenAPI 스키마로 자동 검사하는 테스트가 없음 | 경로·권한·오류 코드는 스크립트와 테스트로 맞추지만, 응답 필드 모양은 사람이 리뷰 | 서버 통합 테스트에서 응답을 계약 스키마로 검증(예: swagger-request-validator), 또는 계약에서 DTO 생성 |
| 201에 `Location` 헤더는 렌탈 생성만 | 다른 생성(세트·기기)은 응답 본문에 ID가 있어 화면에서 쓰지 않았음 | `POST /devices`, `POST /captures/sets`에 `Location` 더하기(계약에 더하는 변경) |
| 다른 고객 렌탈을 부르면 404가 아니라 403 `OUT_OF_SCOPE` | 21자 NanoID라 추측이 사실상 불가능하고, 화면이 "권한 없음"을 구분해 보여 주려고 | 존재를 숨겨야 하는 자원은 404로 통일 |
| 리프레시 토큰은 한 번 쓰면 폐기(회전)하지만, 이미 쓴 토큰이 다시 오면 그 묶음 전체를 끊지는 않음 | MVP 범위 | 재사용 감지 시 그 계정의 리프레시 전부 폐기 |
| gateway에 응답 시간 상한이 없음 | 진행률 SSE가 길게 열려 있어야 해서 일괄 상한을 두지 않음 | 라우트별로 일반 API 30초, SSE 라우트만 제외 |
| 요청 제한이 고정 창(분 경계에서 최대 2배 통과 가능), Redis가 죽으면 제한이 꺼짐(fail-open) | 시연 규모에서 단순함·가용성 우선(로그인이 막히는 것보다 낫다고 판단) | 슬라이딩 윈도·토큰 버킷(Spring의 RequestRateLimiter), 로그인은 계정 단위 제한도 |
| 405 대신 404 | gateway가 계약에 없는 경로·메서드를 "없는 자원"으로 보고 막음(기본 거부) | RFC대로 405 + `Allow`를 원하면 권한 표에서 "경로는 있고 메서드만 없음"을 구분 |

## 6. 강사님이 물어보실 만한 질문과 답

**설계 원칙**

Q1. API는 어떤 순서로 만들었나요?
A. 요구사항 → REST API 표(docs `design/rest-api-v0.md`) → 11/3 OpenAPI 3.1로 계약 고정 → 서버 구현 순서입니다. 계약에서 gateway 권한 표와 web 타입을 생성해서, 손으로 옮기다 생기는 불일치를 막았습니다. 고정 뒤로는 더하는 변경만 하고 CHANGELOG에 남깁니다.

Q2. 왜 서버를 6개로 나눴고, 경로는 어떻게 나눴나요?
A. 데이터 주인 기준입니다(회원·렌탈·촬영·진단·기록·챗봇). 서버마다 DB 스키마가 따로이고 서버끼리 외래 키나 직접 호출 없이 이벤트로만 맞춥니다. 경로 앞부분(`/auth`, `/rentals`, `/captures` …)이 곧 서버라서 gateway 라우팅이 단순합니다.

Q3. `/captures/checkpoints/{id}/inspection`처럼 렌탈 아래가 아니라 서버 이름 아래에 시점이 있는 이유는요?
A. 검사 결과의 주인은 capture-server이고, 경로 앞부분으로 서버를 고르기 때문입니다. `/rentals/{r}/checkpoints/{c}/inspection`으로 하면 rental-server가 받아서 capture-server를 불러야 해 서버 간 동기 호출이 생깁니다. 시점 ID는 전역에서 유일해서 렌탈 ID 없이도 찾을 수 있습니다.

Q4. 그런데 봉인은 `/reports/rentals/{r}/checkpoints/{c}/seal`로 렌탈 ID가 들어가 있네요?
A. 해시 체인이 렌탈마다 하나라서 "어느 체인에 줄을 더하나"가 렌탈이고, 시점이 그 렌탈 것인지 서버가 확인합니다(아니면 404). 일관성만 보면 아쉬운 곳이라 다음 버전이면 시점 ID만 받겠습니다.

Q5. 상태 전이를 PATCH가 아니라 `POST …/close` 같은 동사 경로로 한 이유는요?
A. 3장 표처럼 선행 조건 확인·이벤트 발행·되돌릴 수 없음이 붙은 "명령"이라서입니다. PATCH `{status: CLOSED}`로 두면 클라이언트가 아무 상태로나 바꾸려 할 수 있고, 서버는 결국 상태 기계를 따로 검사해야 합니다.

**상태 코드·오류**

Q6. 409와 422는 어떻게 나누나요?
A. 409는 "요청은 맞는데 지금 자원 상태와 충돌"(이미 진행 중 렌탈, 이미 봉인, 순서 위반)이고, 422는 "본문 형식은 맞는데 의미가 틀림"(진단 JSON이 스키마 위반, 기기 시리얼이 렌탈 기기와 다름, 같은 Idempotency-Key에 다른 본문)입니다. 400은 형식·필수값 같은 기본 검증입니다.

Q7. 오류 응답 형식은 통일돼 있나요?
A. 서버 5개 모두 `@RestControllerAdvice` 한 곳에서 RFC 9457 ProblemDetail + `code`를 냅니다. Spring Security의 401·403도 진입점을 바꿔 같은 형식이고, gateway가 직접 내는 401·403·404·429도 같습니다. 11/20 점검에서 뒤쪽 서버가 내려갔을 때만 Spring 기본 JSON 500이 나가는 걸 찾아 503 Problem으로 고쳤습니다. 비밀번호가 섞일 수 있어 필드 오류에는 값을 싣지 않고 필드 이름과 이유만 줍니다.

**목록·성능**

Q8. 페이징을 왜 커서로 했나요?
A. 렌탈·촬영 기록은 계속 쌓이는 시간순 데이터라 `OFFSET`은 뒤로 갈수록 느리고, 넘기는 사이 새 행이 생기면 중복·누락이 납니다. `(createdAt, publicId)` 키셋은 인덱스를 타고 결과가 안정적입니다. 커서는 불투명 문자열이라 내부 ID를 드러내지 않고, 깨진 커서는 400입니다. 관리자 화면이 "전체 몇 건"을 보여 달라고 해서 렌탈·기기 목록만 `totalCount`를 더했습니다.

Q9. 목록 없이 한 번에 다 주는 곳(공개 목록, 기종)은 괜찮나요?
A. 기종은 몇 개뿐이고, 공개 보유 기기 목록은 폐기 제외 최대 200대로 상한을 걸었습니다. 대신 로그인 없이 열려 있어 IP당 분당 300회로 막습니다.

**멱등성·재시도**

Q10. 네트워크가 끊겨서 클라이언트가 같은 요청을 두 번 보내면요?
A. 결과가 두 번 생기면 안 되는 세 곳(촬영 완료, 검수 완료, 진단 업로드)은 `Idempotency-Key`가 필수이고, 같은 키면 첫 응답을 그대로 돌려줍니다. 다른 POST는 업무 규칙이 막습니다(진행 중 렌탈 하나, 봉인 한 번). 탐지 결과 올리기는 "세트의 자동 흠집을 통째로 바꾸기"라 여러 번 보내도 같은 결과입니다. 세트 생성은 재촬영도 새 세트라 중복이 해롭지 않고, 등급은 완료된 마지막 세트로 매깁니다.

Q11. gateway가 재시도를 하면 POST가 두 번 처리되지 않나요?
A. 재시도는 연결 자체가 실패했을 때(`ConnectException` 등)만 합니다. 요청이 서버에 닿지 않았으니 안전합니다. 서버가 낸 5xx나 응답 지연은 다시 보내지 않고, 이걸 테스트로 확인합니다(`UpstreamRetryIntegrationTest`). 무중단 배포 중 컨테이너가 바뀌는 순간을 넘기려는 장치입니다.

**인증·권한**

Q12. 토큰 구조와 수명은요?
A. auth-server가 RS256 JWT를 발급하고 공개키는 JWKS(클러스터 안에서만)로 줍니다. ADMIN·CUSTOMER 액세스 15분 + 리프레시 7일(HttpOnly·SameSite=Strict·Path=/api/v1/auth 쿠키, 쓸 때마다 새로 발급하고 옛 것은 폐기), 폰 촬영 30분(QR 교환, 그 시점만), 부스 1시간(client credentials, 그 부스만), 진단 에이전트 10분(6자리 페어링 코드 교환, 그 시점만)입니다. 쓰는 곳이 좁을수록 수명을 짧게 했습니다. 액세스 토큰은 메모리에만 두고 localStorage에 넣지 않습니다.

Q13. 권한 검사는 gateway에서 하나요, 서버에서 하나요?
A. 둘 다입니다. gateway는 "이 역할이 이 경로를 부를 수 있나"(계약에서 생성한 표, 451개 조합 테스트)를 보고, 서버는 JWT를 다시 검증한 뒤 "이 렌탈·시점이 정말 이 사람 것인가"를 DB 값으로 봅니다. 앞단을 우회해도 서버가 막습니다. 서버로 넘기는 신원 헤더는 gateway가 밖에서 온 것을 지우고 토큰 값으로만 채웁니다.

Q14. 관리자 두 명이 같은 걸 동시에 고치면요?
A. 상태가 바뀌는 쓰기(렌탈 생성·시점 시작·세트 생성·검수 완료·진단 업로드)는 행 잠금이나 advisory lock으로 줄을 세워 업무 규칙이 깨지지 않습니다. 다만 이름·메모 같은 단순 칸 수정은 나중에 저장한 쪽이 이깁니다(`@Version`·ETag 없음). 운영 규모가 커지면 `If-Match` + ETag로 412를 돌려주는 방식을 넣겠습니다.

Q15. CSRF는요? 리프레시가 쿠키인데요.
A. 일반 API는 Bearer 헤더라 CSRF 대상이 아닙니다. 쿠키를 쓰는 건 `/auth/refresh`·`/auth/logout`뿐이고 SameSite=Strict·Path 한정이라 다른 사이트에서 실어 보낼 수 없습니다. CORS도 web 출처만 엽니다.

Q16. SSE 진행률은 어떻게 인증하나요?
A. 브라우저 기본 EventSource는 Authorization 헤더를 못 보내서, web은 fetch 기반 SSE로 Bearer를 붙입니다. 토큰을 쿼리 문자열에 넣지 않으려는 선택입니다.

**요청 제한**

Q17. 429는 어디서 어떻게 거나요?
A. 추측·폭탄 공격이 가능한 공개 경로는 gateway가 IP당 고정 창으로 셉니다(Redis, `trace:` 접두사). 넘으면 429 Problem `RATE_LIMITED` + `Retry-After` 초. 학교 클러스터는 프록시 뒤라 연결 주소 대신 프록시가 넣는 실제 IP 헤더를 쓰고, 클라이언트가 붙일 수 있는 X-Forwarded-For는 믿지 않습니다. 업무별 제한(재발송 60초, 틀린 부스 코드, 코드 입력 남은 횟수 `remainingAttempts`)은 서버가 겁니다.

Q18. Redis가 죽으면요?
A. 제한만 끄고 요청은 통과시킵니다(fail-open). 시연 중 로그인 전체가 막히는 것보다 낫다고 봤고, 비밀번호는 BCrypt, 코드는 시도 횟수 제한이 따로 있어 최소 방어는 남습니다. 5장에 적은 대로 고정 창의 한계도 압니다.

**검증·문서**

Q19. 계약과 코드가 어긋나지 않는다는 건 어떻게 보장하나요?
A. ① gateway 권한 표는 계약에서 생성하고 `--check`로 비교, ② web 타입은 openapi-typescript로 생성, ③ codes.yaml을 고치면 OpenAPI enum을 다시 생성하고 CI가 일치 검사, ④ 경로 대조 스크립트(`check_openapi_coverage.py`), ⑤ 11/20 전수 대조(경로 74개, 오류 코드 전부). 응답 필드 모양의 자동 검사는 아직 없어 5장의 다음 할 일로 둡니다.

Q20. API 문서는 어디서 보나요?
A. contracts의 OpenAPI로 Redoc을 만들어 https://gakdo.github.io/docs/ 에 올립니다(docs `api-docs/`). 각 작업에 역할(`x-trace-access`), 낼 수 있는 오류 코드(`x-trace-error-codes`), 요구사항 ID(`x-trace-requirements`)를 확장 필드로 적어 둬서 문서만 보고도 권한과 오류를 알 수 있습니다.

Q21. 배포가 됐는지는 어떻게 확인하나요?
A. 서버마다 `GET /api/v1/<서버>/ping`이 인증 없이 이미지에 구운 커밋 SHA를 돌려줍니다. 배포 뒤 이 값으로 새 이미지가 떴는지 봅니다.

## 7. 보여 줄 수 있는 것

- 계약 한 줄과 생성된 gateway 권한 표: contracts `openapi/rental-server.yaml`의 `x-trace-access` ↔ gateway `src/main/resources/access-policy.yaml`
- 역할 × 경로 테스트 451개: gateway `RoleRouteMatrixIntegrationTest`
- 오류 응답 예: `curl -s https://gakdo.site/api/v1/rentals` → 401 Problem `UNAUTHENTICATED`, 같은 IP로 로그인 11번 → 429 + Retry-After
- 멱등성 코드: capture-server `CaptureSetService.complete`, diagnostics-server `DiagnosticRunService.replayOrReject`
- 커서 코드: rental-server `common/infra/Cursor.java`
