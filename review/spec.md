# 리뷰 준비: 스펙 정의 (계약)

11/20 강사님 전체 리뷰 중 **스펙 정의** 파트 준비 문서입니다. 여기서 스펙은 "레포끼리 지키는 약속", 곧 [GAKDO/contracts](https://github.com/GAKDO/contracts)의 OpenAPI·이벤트 JSON Schema·진단 JSON Schema·`codes.yaml`과 그것을 정하는 규칙([헌법](../speckit/constitution.md), Spec Kit)입니다. 요구사항은 [requirements.md](requirements.md), 키·정규화는 [erd.md](erd.md), 경로 하나하나는 API 파트 문서에서 다룹니다.

숫자는 모두 2026-11-20 contracts develop과 각 서버 develop 코드를 직접 대조한 값입니다.

## 30초 요약 (먼저 말할 것)

- **계약이 먼저, 코드는 그다음.** 서버·화면·부스·에이전트가 서로 부르기 전에 contracts 레포에 PR을 먼저 머지하고, 그 버전을 쓰는 PR을 각 레포에 냅니다(헌법 원칙 I).
- **네 가지 계약, 한 곳.** REST는 서버별 OpenAPI 3.1 6개(operation 74개), 비동기는 RabbitMQ 이벤트 7종 JSON Schema 2020-12, 진단 결과는 `diag.v1` JSON Schema, 코드 값은 `codes.yaml` 하나(값 47종 목록). 코드 값은 손으로 복사하지 않고 생성 스크립트로 OpenAPI enum과 JSON Schema `$defs`를 만들며 CI가 일치를 검사합니다.
- **11/3에 1.0.0으로 고정, 그 뒤는 더하는 변경만.** 17일 동안 operation 49 → 74개, 이벤트 5 → 7종으로 늘었지만 **깨지는 변경은 0건**입니다. 11/20부터는 이것을 CI(`scripts/check_breaking.py`)가 마지막 릴리스 태그와 비교해 막습니다. 더한 것들은 1.1.0으로 묶었습니다(contracts #52).
- **규약 세 가지:** 오류는 RFC 9457 Problem Details + `code`(codes.yaml `error_code` 45개), ID는 밖에 보이는 NanoID 21자 `publicId`와 안에서만 쓰는 bigint 키, 서버 간 외래 키 없이 ID를 값으로 들고 이벤트로 정합성을 맞춤.
- **스펙과 구현을 기계로 대조했습니다:** codes.yaml 값 22종 목록 ↔ DB CHECK 제약 전부 일치, 서버 오류 코드 enum ↔ codes.yaml 전부 포함, gateway 접근 정책 ↔ OpenAPI `x-trace-access` 규칙 같음(순서만 다름), 이벤트 `schemaVersion` ↔ 발행 코드 같음.

## 1. 스펙이 만들어진 흐름

```
설계서(Claude 문서) 요구사항 50개 · REST 표 v0 · 진단 JSON v0 · 이벤트 표        10/30~10/31
  → 헌법 1.0.0 (모든 명세·계획·구현의 기준, 레포 12곳에 같은 사본)                  11/1
  → contracts Spec Kit 명세 3개: 001 OpenAPI · 002 진단 JSON · 003 이벤트            11/1~11/2
      /speckit-specify → clarify → plan → tasks → analyze → implement → converge
  → 팀 질문 8개를 정하고 1.0.0 고정 (깨지는 변경은 고정 전에 모두 끝냄)             11/3
  → 더하는 변경만: 선택 필드 · 새 경로 · 새 코드 값 · 새 이벤트 (CHANGELOG에 날짜·요청자)
  → 1.1.0 릴리스 + 깨지는 변경 검사 CI                                            11/20
```

- Spec Kit 명세 폴더는 레포 12곳에 **36개**입니다(`specs/<번호>-<이름>/spec.md·plan.md·tasks.md`). contracts에는 6개.
- 헌법 사본(`.specify/memory/constitution.md`)은 11/20에 레포 12곳 모두 원본과 글자까지 같습니다.
- 11/6 이후 리뷰·시연 요청으로 생긴 작은 추가(20건 남짓)는 Spec Kit 명세를 새로 쓰지 않고 **CHANGELOG 한 줄 + decisions.md + PR 본문**으로 추적했습니다. 일정 때문에 택한 방식이고, 약점으로 먼저 말할 거리입니다(맨 아래).

## 2. 예상 질문과 답

### 2-1. 계약과 버전 관리

**Q. 왜 contracts를 따로 레포로 뒀나요? 서버 코드에서 springdoc으로 뽑으면 되지 않나요?**
코드에서 뽑는 방식(code-first)은 서버가 다 만들어진 뒤에야 계약이 나옵니다. 우리는 서버 5개·웹·부스·에이전트를 세 명이 동시에 만들어야 해서, 계약을 먼저 고정하고(contract-first) 각자 목(MSW, 가짜 카메라, 고정 출력 파일)으로 개발했습니다. 그리고 이벤트·진단 JSON·코드 값은 springdoc이 만들어 주지 않습니다. 한 레포에 모아 두면 리뷰도 한 곳에서 하고, 버전도 하나로 셉니다.

**Q. 버전은 어떻게 매기나요?**
두 층입니다.
- **계약 전체:** SemVer. 1.0.0(11/3 고정) → 1.1.0(11/20, 더한 것 묶음). 더하는 변경은 부 버전, 깨지는 변경은 주 버전인데 고정 뒤에는 깨지는 변경을 하지 않기로 했습니다.
- **이벤트마다:** `schemaVersion` `<주>.<부>`. 필드를 더하면 그 이벤트의 부 버전만 올립니다. 지금 `trace.checkpoint.graded` 1.3, `trace.diagnostics.recorded`·`trace.checkpoint.started` 1.1, 나머지 1.0이고, 발행 코드의 상수와 같습니다. 깨지는 변경이 꼭 필요하면 주 버전을 올리고 **새 라우팅 키**로 내서 옛 소비자가 계속 옛 메시지를 받게 합니다(봉투 스키마가 주 버전을 1로 묶어 둠).

**Q. "깨지지 않는 변경"을 어떻게 보장하나요? 말로만 지킨 거 아닌가요?**
11/19까지는 사람 리뷰(PR 템플릿 체크 항목)였고, 리뷰 준비로 v1.0.0과 지금을 스크립트로 비교해 보니 operation·스키마·속성 삭제, 새 required, enum·코드 값 삭제가 **0건**이었습니다. 그래서 같은 비교를 `scripts/check_breaking.py`로 CI에 넣었습니다(마지막 `v*` 태그 기준). 등급 D를 지우거나 경로 하나 이름을 바꾸면 CI가 빨개지는 것을 확인했습니다.

**Q. 필드를 더하면 옛 서버·클라이언트는 안 깨지나요?**
"닫힌 스키마, 너그러운 소비자" 규칙입니다.
- 스키마는 모르는 필드를 막습니다(`unevaluatedProperties: false`). **발행하는 쪽**의 오타를 잡으려는 것입니다.
- **소비하는 쪽**은 모르는 필드를 무시합니다(Jackson `FAIL_ON_UNKNOWN_PROPERTIES` 끔 또는 `readTree`로 필요한 키만, inspect-worker는 `1.`로 시작하는 버전이면 받음).
- 새 필드는 요청에서는 선택, 응답에서는 "서버는 항상 보냄"으로 적습니다.
- 예외 하나: 진단 JSON `checks`처럼 **받는 쪽이 검증하는 업로드**는 서버가 모르는 키를 거부하므로, 서버(새 스키마 사본)를 먼저 배포하고 새 칸을 보내는 에이전트를 그 뒤에 씁니다. CHANGELOG에 "배포 순서"로 적어 뒀습니다.

**Q. 1.0.0 이후 20건 넘게 바뀌었는데 계약을 고정했다고 할 수 있나요?**
고정한 것은 "기존 것을 바꾸지 않는다"입니다. 더한 것은 모두 선택 필드·새 경로·새 값이라, 1.0.0 기준으로 만든 웹·부스·에이전트가 지금 서버와도 그대로 동작합니다. 바뀐 것마다 날짜·요청한 사람·이유가 CHANGELOG에 있고, 11/20에 1.1.0으로 묶어 버전도 맞췄습니다.

### 2-2. 이벤트 계약

**Q. 왜 REST 호출 대신 이벤트인가요?**
서버마다 자기 DB 스키마만 쓰고(서비스 경계), 서로 REST를 부르지 않기로 했습니다. inspect-worker(학교 서버 Compose, ONNX CPU)는 CPU로 정합·탐지를 해 시간이 걸리고 재배포·재시작 중일 때도 있어서, 동기 호출이면 촬영 업로드가 그만큼 기다리거나 실패합니다. 큐에 쌓아 두고 prefetch 1로 하나씩 처리합니다. 예외는 부스 탐지 결과 하나로, 부스가 gateway를 거쳐 REST로 올립니다.

**Q. 이벤트 7종의 흐름을 설명해 주세요.**

```
rental-server ──checkpoint.started──▶ report
capture-server ──capture.uploaded──▶ inspect-worker · rental(CAPTURED) · report(진행률)
inspect-worker ──inspect.completed──▶ capture · report(진행률)
capture-server ──checkpoint.graded──▶ report(봉인) · rental(GRADED)
diagnostics-server ──diagnostics.recorded──▶ report
report-server ──record.sealed──▶ auth(영수증 메일) · diagnostics(다시 하기 잠금) · rental(SEALED, 반납이면 RETURNED)
rental-server ──checkpoint.purged──▶ capture · report · diagnostics (시험 렌탈 지우기)
```

모든 이벤트에 봉투 `schemaVersion`·`eventId`·`occurredAt`·`rentalId`·`checkpointId`가 있고, topic exchange `trace.events` 하나에 라우팅 키로 나눕니다. 11/20에 계약의 소비자 표기를 서버 코드의 큐 바인딩과 대조해, 빠져 있던 rental·report 소비를 계약에 더했습니다(contracts #52).

**Q. 같은 메시지가 두 번 오면요? (at-least-once)**
RabbitMQ는 처리 뒤 ack라 다시 올 수 있습니다. 소비자마다 멱등을 맞췄습니다.

| 방식 | 어디 |
| --- | --- |
| 처리한 이벤트 표 `processed_event(event_id UNIQUE)` | report-server |
| 자연 키 UNIQUE | auth-server 영수증 `seal_receipt.checkpoint_id`, diagnostics-server 봉인 기록 |
| 상태는 앞으로만(OPEN→CAPTURED→GRADED→SEALED) | rental-server 시점 상태. 중복·늦게 온 이벤트는 바뀌는 게 없음 |
| 같은 입력이면 같은 ID(`stable_id`) | inspect-worker의 `defectId`·결과 `eventId`. capture-server는 이미 결과를 받은 세트면 건너뜀 |

AMQP `message_id`는 `eventId`와 같게 둡니다. 계속 실패하는 메시지는 `trace.dlx` → `<큐>.dlq`, 형식이 깨진 메시지는 다시 넣어도 소용없어 바로 DLQ로 보냅니다.

**Q. DB에 저장했는데 이벤트 발행이 실패하면? (이중 쓰기)**
발행하는 서버 4곳은 `RabbitTemplate.setChannelTransacted(true)`라 메시지가 DB 트랜잭션 **커밋 직후** 함께 커밋됩니다. DB가 롤백되면 메시지도 나가지 않습니다. 남는 틈은 "DB 커밋 직후 브로커가 죽는 순간"이고, **트랜잭션 아웃박스는 없습니다.** 시연 규모에서는 관리자 수동 봉인과 진단 다시 하기가 되살리는 길이고, 운영으로 가면 서버마다 `outbox` 표 + 발행기(또는 CDC)로 바꾸는 것이 다음 단계라고 답합니다. 모른 척하지 말고 먼저 말할 것.

**Q. 순서가 바뀌어 오면요?**
순서를 보장하지 않는다고 가정했습니다. rental-server 시점 상태는 앞으로만 가서 GRADED 뒤에 늦게 온 CAPTURED는 무시되고, report-server 봉인은 필요한 이벤트(graded)가 왔을 때만 일어나며 해시 체인 `seq`·`prevHash`는 report-server 한 곳에서 매깁니다.

**Q. 이벤트 스키마 버전을 소비자가 검증하나요?**
봉투 스키마는 `^1\.\d+$`만 봅니다(이벤트별 정확한 값은 고정하지 않음). 부 버전이 올라도 옛 소비자가 받게 하려는 의도입니다. 발행 쪽 검증은 diagnostics-server가 contracts 스키마 사본으로 발행 이벤트를 검증하는 테스트가 있고, 다른 발행 서버는 필드 단위 단위 테스트만 있습니다(약점).

### 2-3. 오류 규약

**Q. 오류 응답 형식은?**
RFC 9457 Problem Details(`application/problem+json`)에 `code` 하나를 더했습니다. `title`·`status`·`detail`·`instance` + `code`(codes.yaml `error_code`, 45개), 400 `VALIDATION_FAILED`면 `errors[]{field, message}`, 6자리 코드 오류면 `remainingAttempts`. Spring Boot 3의 `ProblemDetail`을 `@RestControllerAdvice` 한 곳에서 만듭니다.

**Q. HTTP 상태 코드만으로 부족한가요? 왜 `code`를 따로 두나요?**
409 하나에도 뜻이 여럿입니다(렌탈 생성 409 = `RENTAL_OPEN_EXISTS` 또는 `DEVICE_NOT_ACTIVE`). 화면이 문장을 고르려면 기계가 읽는 값이 필요하고, 그 값을 codes.yaml에서 enum으로 고정해 화면이 미리 문장을 준비합니다(web `errorMessages.ts`). 각 operation의 오류 응답에 `x-trace-error-codes`로 그 응답이 낼 수 있는 code를 적었습니다.

**Q. 서버가 계약에 없는 오류 코드를 내면요?**
11/20 대조: 서버 5곳의 `ErrorCode` enum(71개, 겹침 포함)이 모두 codes.yaml에 있습니다. diagnostics-server는 이것을 테스트(`ErrorCodeTest`)로도 확인합니다.

**Q. 400과 422는 어떻게 나누나요?**
진단 업로드 기준: JSON을 못 읽으면 400, JSON Schema 위반이면 422, 서버 규칙 위반(시리얼이 토큰과 다름 등)도 422, 같은 시점 중복은 409입니다. 일반 요청 본문 검증(Bean Validation)은 400 `VALIDATION_FAILED`입니다.

### 2-4. ID 규칙

**Q. publicId를 왜 NanoID 21자로 했나요? UUID는 왜 안 쓰나요?**
11/2 강사님 피드백에서 시작했습니다(처음엔 모든 ID가 UUIDv7). 지금 규칙:
- **DB 기본 키는 bigint IDENTITY**: 8바이트라 인덱스가 작고 순서대로 쌓여 B-tree 삽입이 싸고, JOIN이 빠릅니다. 밖으로 내보내지 않습니다.
- **밖에 보이는 ID는 `public_id varchar(21) UNIQUE`(NanoID)**: 순번을 내보내면 다음 렌탈 ID를 추측할 수 있어(IDOR, 건수 노출) 무작위 값을 씁니다. 64글자 × 21자리 = 126비트로 UUIDv4(122비트)와 같은 수준의 충돌 확률인데 36자 → 21자로 짧고 URL에 그대로 씁니다(QR 링크, 검증 페이지).
- 생성은 `SecureRandom` 21바이트를 64글자 표에 마스크(`& 63`)로 고릅니다. 64가 2의 거듭제곱이라 치우침이 없습니다(서버 4곳 `PublicIds.java`).
- 계약에서는 `PublicId` 스키마(`^[A-Za-z0-9_-]{21}$`) 하나를 OpenAPI·이벤트 봉투가 함께 씁니다.
- UUID가 남은 곳은 엔터티 ID가 아니라 `Idempotency-Key`(클라이언트가 만드는 불투명 값, 8~128자)와 더미 비밀번호 해시 입력뿐입니다.

**Q. UUID가 더 표준인데 NanoID의 단점은요?**
DB 기본 타입이 아니라 문자열 컬럼 + UNIQUE 인덱스 하나가 더 듭니다(publicId 인덱스). 시각 순서가 없어 publicId로는 정렬하지 않고 bigint `id`나 `created_at`으로 정렬합니다. 목록 커서도 내부 순서 값으로 만듭니다.

**Q. 서버 간 외래 키를 왜 안 거나요? 정합성은요?**
서버마다 자기 스키마만 읽고 쓰는 것이 서비스 경계(헌법 II)입니다. 외래 키를 걸면 배포·마이그레이션·장애가 서로 묶입니다. 그래서 다른 서버의 ID는 `rental_id varchar(21)` 같은 **값**으로만 듭니다. 11/20 대조: 마이그레이션의 `REFERENCES`는 모두 자기 서버 스키마 안(capture-server는 자기 것인 capture·inspection 두 스키마)입니다. 대신 이벤트로 맞추고, 지울 때는 `trace.checkpoint.purged`로 각 서버가 자기 데이터를 지웁니다. 받은 ID가 실제로 있는지는 gateway가 JWT 클레임(`rentals`, `scope`)으로 범위를 먼저 막고, 서버가 다시 봅니다. 자세한 것은 [erd.md](erd.md) 2·4절.

### 2-5. 스펙과 구현이 어긋나지 않게

**Q. 계약을 바꿨는데 서버나 화면이 안 따라오면 어떻게 알죠?**

| 장치 | 무엇을 막나 | 11/20 상태 |
| --- | --- | --- |
| codes.yaml → `codes.gen.yaml`·`codes.gen.schema.json` 생성 + CI 일치 검사 | 코드 값 손 복사 | 최신 |
| codes.yaml ↔ 서버 DB CHECK 제약 | DB에 없는 값 저장 | 22종 목록 모두 일치(스크립트 대조) |
| `x-trace-access` → gateway `access-policy.yaml` 생성(`gen_access_policy.py --check`) | 역할 × 경로 인가 누락 | 규칙 같음(순서만 다름) |
| OpenAPI → web 타입(openapi-typescript) | 화면이 없는 필드·경로 호출 | 생성 타입은 최신, web의 계약 사본 폴더(`web/contracts/`)는 11/13 일부 문구가 늦음(아래) |
| diagnostics-server 스키마 사본 + 테스트 | 진단 JSON·이벤트 모양 | contracts와 글자까지 같음 |
| 이벤트 `schemaVersion` 상수 | 버전 표기 | 발행 코드 4곳 모두 계약과 같음 |
| `check_events.py` | 라우팅 키·발행자·소비 큐·예시 114건 | 통과 |
| `check_breaking.py`(11/20 새로) | 깨지는 변경 | 0건 |

**Q. OpenAPI와 실제 컨트롤러가 다르면요?**
런타임 응답을 OpenAPI로 검증하는 테스트(예: 응답 스키마 검증 필터)는 없습니다. 대신 경로·역할은 gateway 정책 생성으로, 값은 codes.yaml로, 모양은 서버 테스트의 고정 예시로 맞췄습니다. 소비자 주도 계약 테스트(Pact 같은 것)도 없습니다. 다음 단계로 말할 것.

### 2-6. 자주 받을 만한 세부 질문

- **시각:** ISO 8601 + 오프셋 필수(`...Z` 또는 `+09:00`). 저장은 UTC(`timestamptz`), 화면은 KST. 반납 예정일 `dueAt`만 날짜(한국 시간 기준).
- **목록:** 모두 커서(`limit`·`cursor` → `{items, nextCursor}`). 처음엔 기기 목록만 page였던 것을 11/2에 맞췄습니다. 오프셋은 데이터가 늘면 느리고 중간 삽입에 중복·누락이 생깁니다.
- **멱등 키:** 촬영 완료(`sets/{id}/complete`)·검수 완료·진단 업로드는 `Idempotency-Key`(세트 생성은 재촬영도 새 세트라 받지 않음). 같은 키 다른 본문이면 422 `IDEMPOTENCY_KEY_CONFLICT`. 부스 탐지는 같은 세트에 다시 보내면 통째로 바꿈(모델을 바꿔 다시 돌린 결과가 겹치지 않게).
- **큰 파일:** 사진은 서버를 거치지 않고 MinIO 사전 서명 PUT URL로. URL에 `Content-Type`과 `x-amz-checksum-sha256`을 서명해 넣어 다른 파일을 올리면 저장소가 거절하고, 완료 때 서버가 다시 대조합니다.
- **읽지 못한 값:** 0이 아니라 `null` + 사유(`skippedReason`). 배터리 용량은 단위와 함께(macOS mAh, Windows mWh, 환산하지 않음).
- **요구사항 추적:** operation 74개 중 67개에 `x-trace-requirements`(요구사항 ID). 없는 7개는 ping 5개와 요구사항 밖 챗봇 2개입니다.
- **인가 표기:** operation마다 `x-trace-access{roles, scope, captureToken}`. scope는 `OWN_RENTAL`(CUSTOMER는 `rentals` 클레임의 렌탈만)·`CHECKPOINT`·`BOOTH`, 범위 밖은 403 `OUT_OF_SCOPE`.

## 3. 11/20 리뷰 준비로 고친 것

| 무엇 | 어디 |
| --- | --- |
| 계약 1.1.0: 11/3 뒤 추가분을 한 버전으로(값 변경 없음) | contracts #52 |
| 깨지는 변경 검사 CI(`check_breaking.py`, 마지막 태그와 비교) | contracts #52 |
| 이벤트 문서의 지금 버전 1.2 → 1.3(코드는 이미 1.3), 1.3 절, 멱등·전달 구현 대조 표 | contracts #52 |
| 이벤트 소비자 표기를 코드의 큐 바인딩과 맞춤(rental·report 소비 4건 누락) | contracts #52 |
| OpenAPI `servers`에 운영 주소, 빠진 `x-trace-requirements` 4개, README 경로 수 | contracts #52 |
| 설계서 이벤트 표에 record.sealed의 diagnostics 소비 | 이 PR(`design/mvp-design.md`) |

## 약점으로 먼저 말해 둘 것

1. **아웃박스 없음.** 채널 트랜잭션으로 대부분은 막지만 DB 커밋 직후 브로커 장애 틈이 남습니다. 운영이면 아웃박스.
2. **1.0.0 뒤 추가분을 11/20에야 릴리스.** 그동안 CHANGELOG `[Unreleased]`에 쌓여 있었고 `info.version`은 1.0.0이었습니다. 지금은 1.1.0 + CI 검사.
3. **후반 변경은 Spec Kit 명세 없이.** 11/6 이후 추가 20건 남짓은 CHANGELOG·decisions·PR로만 추적했습니다. 명세 → 계획 → 작업 문서가 없어서 "왜 이 필드인가"는 decisions.md와 PR 본문을 봐야 합니다.
4. **헌법 문구가 늦은 곳.** 헌법(1.1.0, 11/2)에는 "이벤트 5종", "MVP 요구사항 50개만 만든다"가 남아 있습니다. 실제는 이벤트 7종, 표 밖 기능 12개를 계약 추가로 넣었습니다. 헌법을 고치면 레포 12곳 사본을 함께 바꿔야 해서 대회 뒤로 미뤘습니다.
5. **문서 계약 사본이 늦는 곳.** `design/rest-api-v0.md` 요약 표에 11/10 뒤 경로 11개가 없고(원본은 contracts, API 파트에서 정리), web의 계약 사본 폴더(`web/contracts/`)는 일부 설명 문구가 contracts보다 늦습니다(생성 타입은 최신). 발행 이벤트를 계약 스키마로 검증하는 테스트는 diagnostics-server에만 있습니다.
6. **계약 테스트가 생성·대조 위주.** 응답을 OpenAPI로 검증하는 테스트나 소비자 주도 계약 테스트는 없습니다.

## 근거 파일

- 계약: contracts `CHANGELOG.md`, `CONTRIBUTING.md` 2번, `events/README.md`, `openapi/README.md`, `codes.yaml`, `scripts/check_breaking.py`·`check_events.py`·`gen_*_codes.py`
- 결정: [../decisions.md](../decisions.md) 11/2(오류 code·커서, 이벤트 봉투, ID는 bigint + NanoID, gateway 정책 생성), 11/8(사람 검수 → 이벤트 1.3)
- 헌법: [../speckit/constitution.md](../speckit/constitution.md) 원칙 I·II·III, "기술과 형식"
