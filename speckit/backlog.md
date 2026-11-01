# Spec Kit 기능 목록 (백로그)

설계서의 요구사항 50개를 레포별 기능 27개로 나눴습니다. 각 기능은 해당 레포의 세션에서 `/speckit-specify` 뒤에 아래 설명을 그대로 붙여 넣어 시작합니다. 2026-11-01 기준.

## 순서와 마감

| 순서 | 레포 | 기능 | 요구사항 | 담당 | 마감 | 먼저 끝나야 할 것 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | contracts | C1 OpenAPI 5개 | FR 전체의 API | A (B·C 리뷰) | 11/3 | — |
| 1 | contracts | C2 진단 결과 JSON Schema v1 | FR-DIA-01~05 | A (B 리뷰) | 11/3 | — |
| 1 | contracts | C3 이벤트 스키마 5종 | FR-CAP-05, FR-INS, FR-INT-01 | A | 11/3 | — |
| 1 | booth | BO1 촬영 도구·부스 촬영 | FR-CAP-01·02, FR-DAT-01·02 | B | 11/4 | 11/2 촬영 결과 |
| 1 | ml | ML3 Label Studio 연동 | FR-DAT-03 | B | 11/4 | BO1 |
| 2 | auth_server | AU1 로그인·JWT·자격 교환 | FR-AUTH-01·02 | A | 11/5 | C1 |
| 2 | gateway | GW1 JWT 검증·역할×경로 | FR-AUTH-03 | A | 11/5 | AU1 |
| 2 | rental_server | RE1 렌탈·기기·기종·시점 | FR-RNT-01·02·03·05 | A | 11/5 | C1 |
| 2 | capture_server | CA1 촬영 세트·사전 서명 URL | FR-CAP-02·05 | A | 11/6 | C1, C3 |
| 2 | web | WE1 로그인·출고·반납·기기 관리 | FR-AUTH-01, FR-RNT-05 화면 | C | 11/6 | C1 |
| 2 | ml | ML1 데이터셋 빌더·학습 기록 | FR-DAT-04·05 | A | 11/6 | ML3 |
| 2 | booth | BO2 Jetson 흠집 탐지 | FR-INS-01(부스), NFR-01 | B | 11/6 | ML1 |
| 2 | agent | AG1 macOS 진단 에이전트 | FR-DIA-01~05, NFR-02 | B | 11/9 | C2 |
| 3 | diagnostics_server | DI1 진단 수신·저장 | FR-DIA-01~05(서버) | A | 11/7 | C2, AU1 |
| 3 | report_server | RP1 타임라인·해시 체인·검증 API | FR-INT-01·02 | A | 11/7 | C3 |
| 3 | gitops | G1 로컬 Compose 폴백 | NFR-05·06 | A | 11/7 | RE1 |
| 3 | auth_server | AU2 회원가입·인증·재설정·탈퇴 | FR-USR-01·04·05·06 | A | 11/8 | AU1 |
| 3 | rental_server | RE2 파일럿 등록 | FR-PIL-01 | A | 11/8 | RE1 |
| 3 | report_server | RP2 검사 진행률 SSE | FR-RPT-04 | A | 11/8 | RP1 |
| 3 | web | WE2 폰 수령 촬영 | FR-CAP-03·04 | C | 11/8 | CA1 |
| 4 | auth_server | AU3 수령 QR·렌탈 연결·봉인 영수증 | FR-RNT-04, FR-USR-02, FR-INT-03 | A | 11/9 | AU2, RP1 |
| 4 | capture_server | CA2 검사 결과·시점 비교·등급 | FR-INS-03·04, FR-CAP-04 | A·C | 11/9 | CA1 |
| 4 | diagnostics_server | DI2 점검 플래그·추이 | FR-DIA-06, FR-PIL-02(데이터) | A | 11/9 | DI1 |
| 4 | ml | ML2 inspect-worker | FR-INS-01·02, FR-OPS-01, FR-RPT-01(텍스처) | A | 11/9 | ML1, CA1 |
| 4 | agent | AG2 Windows 진단 에이전트 | FR-DIA-01~05 | B | 11/10 | AG1 |
| 4 | web | WE3 고객 화면·3D 리포트 | FR-USR-03, FR-RPT-01·02·03 | C | 11/10 | RP1, ML2 |
| 4 | web | WE4 검증 페이지·파일럿 대시보드 | FR-INT-02, FR-PIL-02 | C | 11/10 | RP1, DI2 |

NFR-03(비밀값)·NFR-04(trace 접두사)는 헌법 V로 모든 기능에 적용합니다. 11/10 기능 완성, 11/13 코드 프리즈입니다.

## 세션 하나에서 기능 하나를 끝내는 순서

1. 세션을 그 레포로 열고 `develop`으로 바꾼다: `git switch develop && git pull`
2. `/speckit-specify` + 아래 설명 → `feature/<번호>-<이름>` 브랜치와 `specs/<번호>-<이름>/spec.md`가 생긴다
3. `/speckit-clarify` → 모호한 곳 질문에 답한다 (최대 5개)
4. `/speckit-plan` + 레포 `CLAUDE.md`의 "계획에 줄 기술 설명" → `plan.md`, `data-model.md`, `contracts/`
5. `/speckit-tasks` → `tasks.md`
6. `/speckit-analyze` → 명세·계획·작업이 서로 맞는지 확인
7. `/speckit-implement` → 테스트와 코드
8. `/speckit-converge` → 남은 일을 작업으로 덧붙임. `Converged`가 나올 때까지 7·8 반복
9. 로컬 검사(서버 `./mvnw verify`, 화면 `npm run typecheck && npm test`, 파이썬 `ruff check . && pytest`)가 통과하면 PR을 `develop`으로 연다. 본문에 요구사항 ID를 적는다

## 붙여 넣을 설명

### contracts

**C1 OpenAPI 5개**
```
auth, rental, capture, diagnostics, report 서버의 REST API를 OpenAPI 3.1 파일 5개(openapi/<서버>.yaml)로 고정한다. 원본은 GAKDO/docs design/rest-api-v0.md의 경로·역할 표와 요청·응답 예시다. 모든 오류는 RFC 9457 Problem Details, JSON 필드는 camelCase, ID는 UUIDv7, 시각은 ISO 8601 + 오프셋이다. 각 경로에 필요한 역할(ADMIN, CUSTOMER, BOOTH, AGENT)과 범위를 적고, /api/v1/<경로>/ping은 인증 없음으로 둔다. 코드 값은 codes.yaml을 참조한다. 수용 기준: redocly lint가 통과하고, rest-api-v0.md의 모든 경로가 빠짐없이 있으며, 화면(C)·에이전트(B) 담당이 리뷰에서 승인한다.
```

**C2 진단 결과 JSON Schema v1**
```
진단 에이전트가 서버로 보내는 결과를 JSON Schema(diagnostics/result.schema.json)로 고정한다. 원본은 GAKDO/docs design/diagnostics-json-v0.md다. 배터리 용량은 값과 단위(mAh 또는 mWh)를 함께 보내고, 읽지 못한 항목은 null과 생략 사유를 보낸다. 벤치마크는 3회 중앙값과 측정 조건, 전원 연결 여부를 보낸다. 컴퓨터 이름·사용자 이름은 없다. 수용 기준: macOS 예시, Windows 예시, SSD 생략 예시 3개가 스키마를 통과하고, 잘못된 예시 2개가 실패한다(check-jsonschema).
```

**C3 이벤트 스키마 5종**
```
RabbitMQ trace.events로 오가는 이벤트 5종의 JSON Schema(events/*.schema.json)를 만든다. 원본은 GAKDO/docs design/mvp-design.md의 "이벤트 계약" 표다. 모든 이벤트는 schemaVersion, eventId(UUIDv7), occurredAt, rentalId, checkpointId 봉투를 가진다. 수용 기준: 이벤트마다 예시 1개가 스키마를 통과하고, 라우팅 키가 설계서 표와 같다.
```

### auth_server

**AU1 로그인·JWT·자격 교환**
```
관리자와 고객이 이메일·비밀번호로 로그인해 액세스 토큰(JWT RS256, 15분)과 리프레시 토큰(7일)을 받고, 부스(client_id·secret)·고객(QR 1회용 토큰)·에이전트(페어링 코드)가 각자의 자격을 범위가 좁은 JWT로 바꾼다. JWKS를 공개한다(FR-AUTH-01, FR-AUTH-02). 수용 기준: 만료된 액세스 토큰은 401이고 리프레시로 다시 발급된다. 고객 JWT로 다른 시점에 접근하면 403이다. 페어링 코드는 5분 뒤 만료되고 SHA-256 해시만 저장한다. 관리자 계정은 초기 데이터로 만든다. 참고: design/mvp-design.md "인증", design/rest-api-v0.md auth 절.
```

**AU2 회원가입·이메일 인증·재설정·탈퇴**
```
고객이 이메일·비밀번호·이름과 개인정보 수집 동의로 가입하고, 메일로 받은 6자리 코드로 계정을 활성화한다. 비밀번호를 잊으면 메일 코드로 새 비밀번호를 정하고, 탈퇴하면 이메일·이름을 지우고 렌탈 기록은 익명으로 남긴다(FR-USR-01, 04, 05, 06). 수용 기준: 동의 없이 가입되지 않고 같은 이메일로 두 번 가입되지 않는다. 인증 전 로그인은 403, 코드는 10분 뒤 만료되고 5번 틀리면 새로 받아야 한다. 없는 이메일도 재설정에서 같은 응답을 받고, 재설정하면 그 계정의 리프레시 토큰이 모두 지워진다. 탈퇴 후 DB에 이메일·이름이 남지 않는다. 메일은 팀 Gmail SMTP다.
```

**AU3 수령 QR·렌탈 연결·봉인 영수증**
```
관리자가 고객 수령 촬영용 1회용 링크(QR)를 발급하고, 고객이 QR을 찍고 로그인하면 그 렌탈이 자기 계정에 연결된다. 시점이 봉인되면 그 기록의 지문(해시)을 고객 메일로 보낸다(FR-RNT-04, FR-USR-02, FR-INT-03). 수용 기준: 만료된 링크로는 업로드되지 않는다. 이미 다른 계정에 연결된 렌탈은 연결되지 않는다(409). 메일 속 지문이 검증 페이지의 지문과 같고, 출고 영수증은 수령 때 렌탈이 연결된 고객에게 간다. 봉인 이벤트는 report-server가 낸다.
```

### gateway

**GW1 JWT 검증·역할×경로**
```
gateway가 모든 요청의 JWT를 auth-server JWKS로 검증하고, design/rest-api-v0.md의 역할 × 경로 표대로 막는다. 로그인 시도와 페어링 코드 입력에는 요청 제한을 건다(FR-AUTH-03). /api/v1/*/ping과 로그인·가입·검증 공개 페이지는 인증 없이 통과한다. 수용 기준: 역할 × 경로 표의 모든 칸이 테스트로 확인되고, 같은 IP에서 로그인을 연속 실패하면 제한된다. CORS는 web 주소만 허용한다.
```

### rental_server

**RE1 렌탈·기기·기종·시점**
```
관리자가 기종(제조사·형태·치수·기준 사양)과 기기(시리얼·상태)를 관리하고, 렌탈 건을 만들어 기기를 연결한다. 렌탈은 출고·수령·반납 세 시점을 순서대로 가진다(FR-RNT-01, 02, 03, 05). 수용 기준: 같은 시리얼로 진행 중인 렌탈이 2건 생기지 않는다. 출고 전에 수령 기록을 만들면 거부된다. 모델명으로 3D 트윈 치수를 조회한다. 수리 중·폐기 기기로 렌탈을 만들면 409이고 폐기해도 행은 남는다. 시리얼은 등록 뒤 바꿀 수 없고 변경자(updated_by)를 남긴다. 기기 목록은 기종·상태로 찾는다. 스키마는 design/ddl.md의 rental 절이다.
```

**RE2 파일럿 등록**
```
파일럿 참여자의 동의와 기기를 별칭으로 등록한다(FR-PIL-01). 수용 기준: 실명과 측정값이 같은 테이블에 없고, 별칭만으로 진단·추이를 조회한다. 참여 철회 시 실명 정보를 지운다.
```

### capture_server

**CA1 촬영 세트·사전 서명 URL**
```
부스와 폰이 한 시점의 촬영 세트를 만들고, 사진마다 사전 서명 URL을 받아 MinIO trace-captures에 직접 올린 뒤 면·조명·카메라 코드와 SHA-256을 등록한다. 세트가 다 올라오면 trace.capture.uploaded 이벤트를 낸다(FR-CAP-02, FR-CAP-05). 코드 값은 codes.yaml 0.2.0(조명 L1~L4, 카메라 CAM1·CAM2·PHONE)이다. 수용 기준: 게이트웨이 트래픽에 사진 본문이 없다. 내려받은 파일 해시와 저장된 해시가 같다. 빠진 면이 있으면 세트가 완료되지 않는다.
```

**CA2 검사 결과·시점 비교·등급**
```
부스(Jetson)와 inspect-worker가 낸 흠집 결과를 저장하고, 이전 시점 흠집과 비교해 신규·기존을 판정한 뒤 외관 A~D 등급을 매긴다. 품질 미달 면은 "판정 불가"로 두고 비교에서 뺀다(FR-INS-03, FR-INS-04, FR-CAP-04). 수용 기준: 결과마다 modelVersion과 등급 규칙 버전이 남는다. 판정 불가 면은 등급 계산에 쓰이지 않는다. 오염(stain)은 등급에서 뺀다. 테스트 흠집의 판정 정확도를 기록한다. 스키마는 design/ddl.md의 inspection 절이다.
```

### diagnostics_server

**DI1 진단 수신·저장**
```
에이전트가 페어링 JWT로 보낸 진단 결과를 contracts의 JSON Schema로 검증하고 시점에 붙여 저장한다(FR-DIA-01~05의 서버 쪽). 결과 해시를 남기고 trace 이벤트를 낸다. 수용 기준: 스키마에 맞지 않는 결과는 400 Problem Details로 거부된다. 생략 항목은 사유와 함께 저장된다. 같은 시점에 두 번 올리면 새 실행으로 쌓인다. 스키마는 design/ddl.md의 diagnostics 절이다.
```

**DI2 점검 플래그·추이**
```
시점 간 진단을 비교해 점검 플래그(부품 변경·용량 급감·벤치 하락)를 붙이고, 파일럿 기기의 배터리·벤치마크 추이를 InfluxDB trace-pilot에 기록한다(FR-DIA-06, FR-PIL-02 데이터). 수용 기준: 부품 식별자가 바뀌면 COMPONENT_CHANGED가 붙는다. 임계값은 설정으로 두고 파일럿 1차 측정 편차로 정한다. 두 번 측정한 값을 한 번의 조회로 돌려준다.
```

### report_server

**RP1 타임라인·해시 체인·검증 API**
```
렌탈의 세 시점 기록(사진·검사·진단)을 이벤트로 모아 타임라인 읽기 모델을 만들고, 기록 해시를 이전 해시에 잇는 해시 체인(서버 Ed25519 서명)을 만든다. 시점 봉인과 검증 API를 연다(FR-INT-01, FR-INT-02 서버). 수용 기준: 사진 한 장을 바꾸면 검증이 실패한다. 검증 공개 응답에는 등급·시점·해시 일치만 있고 상세는 로그인해야 본다. 봉인하면 trace 이벤트를 낸다.
```

**RP2 검사 진행률 SSE**
```
inspect-worker가 Redis에 올린 검사 진행률을 화면에 SSE로 흘려보낸다(FR-RPT-04). 수용 기준: 새로고침 없이 진행률이 바뀌고, 첫 면 결과가 나오면 먼저 보인다. 연결이 끊기면 다시 붙어 마지막 상태부터 받는다.
```

### web

**WE1 로그인·출고·반납·기기 관리**
```
관리자가 로그인해 기종·기기를 등록·검색하고 상태를 바꾸며, 렌탈을 만들어 출고·반납 시점을 진행하는 화면을 만든다(FR-AUTH-01 화면, FR-RNT-05 화면, FR-RNT-01·02 흐름). 수용 기준: 수리 중·폐기 기기로 렌탈을 만들면 서버의 409를 사람이 읽는 문장으로 보여 준다. 375px(폰)과 1280px에서 모두 쓸 수 있다. 토큰은 메모리에 두고 오래 저장하지 않는다.
```

**WE2 폰 수령 촬영**
```
고객이 수령 QR로 들어와 로그인한 뒤, 면마다 윤곽 가이드를 보며 폰으로 촬영하고 블러·반사를 검사해 통과한 사진만 사전 서명 URL로 올린다(FR-CAP-03, FR-CAP-04). 수용 기준: 불량 사진은 재촬영 전까지 제출되지 않는다. 카메라 권한을 거부하면 이유와 다시 허용하는 방법을 보여 준다. HTTPS에서만 동작한다.
```

**WE3 고객 화면·3D 리포트**
```
고객이 내 렌탈 목록과 시점별 리포트를 보고, 기종 3D 모델에 9면 사진을 입힌 트윈을 돌려 보며, 흠집 3D 핀과 시점 슬라이더로 변화를 확인한다. 타임라인 리포트에 핀·크롭·등급·내부 상태 비교표를 보여 준다(FR-USR-03, FR-RPT-01, 02, 03). 수용 기준: 다른 고객의 렌탈을 열면 403을 안내한다. 슬라이더를 옮기면 신규 핀이 구분돼 보인다. 팀 밖 3명이 설명 없이 신규 흠집과 배터리 변화를 말한다.
```

**WE4 검증 페이지·파일럿 대시보드**
```
리포트의 검증 QR로 여는 공개 검증 페이지(등급·시점·해시 일치)와, 파일럿 기기의 배터리·벤치마크 추이 대시보드를 만든다(FR-INT-02, FR-PIL-02). 수용 기준: QR로 검증 결과 페이지가 열리고, 기록이 바뀌었으면 불일치를 보여 준다. 두 번 측정한 값이 한 화면에 나온다.
```

### agent

**AG1 macOS 진단 에이전트**
```
렌탈 노트북에서 실행하는 진단 에이전트(macOS 먼저)가 기기 식별·부품 구성, 배터리(사이클·설계·완충·최대 용량), SSD 상태, 고정 벤치마크 3회를 읽고, 결과를 먼저 보여 준 뒤 동의하면 페어링 코드로 받은 JWT로 올린다(FR-DIA-01~05, NFR-02). 결과는 contracts의 진단 JSON Schema를 따른다. 수용 기준: 팀 노트북 3대의 JSON이 저장된다. 배터리 값이 OS 배터리 리포트와 같다. SSD를 못 읽으면 사유가 남는다. 전원이 연결되지 않으면 벤치마크를 돌리지 않는다. 동의 없이는 전송되지 않는다. 읽는 경로 목록이 고정되고 사용자 파일·브라우저 기록을 읽지 않는다. 참고: design/diagnostics-json-v0.md의 macOS 실제 키.
```

**AG2 Windows 진단 에이전트**
```
AG1과 같은 진단을 Windows에서 한다(FR-DIA-01~05, NFR-02). 배터리 용량은 mWh로 보내고 환산하지 않는다. SSD SMART는 관리자 권한이 없으면 생략 사유를 남긴다. 수용 기준은 AG1과 같고, LG 그램에서 확인한다.
```

### booth

**BO1 촬영 도구·부스 촬영**
```
부스 1개(출고·반납·학습 데이터 촬영 공용)에서 위 카메라 2대(CAM1 앞 반, CAM2 뒤 반)로 자세별 면·조명 세트를 버튼 한 번에 찍고, 촬영 목록 순서를 안내하며 파일명을 자동으로 만든다. 학습 데이터 모드는 MinIO trace-raw에, 출고·반납 모드는 capture-server가 준 사전 서명 URL로 올린다. 업로드가 실패하면 로컬에 두고 재시도한다(FR-CAP-01, 02, FR-DAT-01, 02). 조명은 L1(확산)·L2(왼쪽)·L3(뒤)·L4(앞, KB)이고 손으로 바꾸므로 화면이 "L2만 켜세요"처럼 안내한다. 수용 기준: 한 세트에서 빠진 면이 0개, 파일명 규칙 위반 0건, 네트워크가 끊겼다 돌아와도 누락 0건, 모든 사진에 SHA-256. 참고: GAKDO/docs booth/README.md(11/2 실행 가이드).
```

**BO2 Jetson 흠집 탐지**
```
부스 Jetson Orin Nano에서 YOLO11-seg TensorRT FP16 엔진으로 흠집 4종을 고해상 타일 추론하고, 결과를 gateway를 거쳐 capture-server에 올린다(FR-INS-01 부스 쪽, NFR-01). 엔진은 Jetson에서 직접 빌드한다. 수용 기준: 부스 한 세트 추론이 30초 안에 끝나고(11/6 실측), 결과마다 modelVersion이 남는다.
```

### ml

**ML1 데이터셋 빌더·학습 기록**
```
Label Studio에 제출된 주석만으로 기기 단위로 나눈 데이터셋 버전을 만들고, 학습 결과(가중치·ONNX·지표)를 데이터셋 버전과 함께 MinIO에 저장한다(FR-DAT-04, 05). 수용 기준: 한 기기가 두 분할에 동시에 없고, 같은 버전은 덮어쓸 수 없다. 모델마다 학습 데이터 버전을 추적할 수 있다.
```

**ML2 inspect-worker**
```
집 PC(RTX 4070 Ti)의 inspect-worker가 trace.inspect.requested를 받아 폰 사진 흠집을 탐지하고, 면을 표준 좌표로 펼치며(윤곽 4점 + 특징점 보정), 3D 텍스처를 만든다. 집 PC가 켜지면 자동으로 떠서 꺼져 있던 동안 쌓인 작업을 처리한다(FR-INS-01, 02, FR-OPS-01, FR-RPT-01 텍스처). 진행률은 Redis에 올린다. 수용 기준: 폰과 부스 사이 정합 오차를 기록한다. 워커를 끈 채 사진 3장을 올리고 켜면 3장이 모두 처리된다. 테스트 맥북 2대의 mAP를 기록한다.
```

**ML3 Label Studio 연동**
```
Label Studio가 MinIO trace-raw 원본을 작업으로 가져오고(프록시 모드), 주석(폴리곤 4클래스)을 trace-labels에 쓴다(FR-DAT-03). 수용 기준: 새 사진이 동기화 한 번에 작업으로 뜬다. 원본 사진은 바뀌지 않는다.
```

### gitops

**G1 로컬 Compose 폴백**
```
학교 서버에 못 닿을 때 팀 노트북에서 앱 8개와 인프라(PostgreSQL·RabbitMQ·MinIO·Redis)를 Docker Compose로 띄워 세 시점 흐름을 데모한다(NFR-06). 클러스터와 같은 이미지와 같은 환경 변수 이름을 쓴다. 수용 기준: compose up 한 번으로 세 시점 흐름이 동작하고, 앱 파드를 지워도 자동으로 다시 뜬다(NFR-05는 클러스터에서 확인).
```
