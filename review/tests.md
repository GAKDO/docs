# 레포별 테스트 실행 방법

레포마다 테스트를 어떻게 돌리는지 한 장에 모은 표입니다. 숫자는 11/24에 Docker가 없는 클라우드 컨테이너에서 각 레포 `develop`(docs는 `main`)을 받아 직접 돌린 결과입니다.

- 설치·검사 명령은 각 레포 `CLAUDE.md`의 "명령"과 같습니다.
- 환경 변수는 **이름만** 적었습니다. 값(주소·계정·비밀번호)은 gitops `secret.env.example`의 이름으로 각자 받아 씁니다.
- "건너뜀"은 실패가 아니라, 필요한 것(Docker·DB·운영체제)이 없을 때 테스트가 스스로 빠지는 것입니다. CI에서는 대부분 다 돕니다.

## 한눈에 보기

| 레포 | 설치 | 실행 | 11/24 결과 | 빠지는 것 (Docker 없을 때) | CI 관문 |
| --- | --- | --- | --- | --- | --- |
| web | `npm ci` | `npm run typecheck && npm test`, 빌드 `npm run build` | 파일 82 · **584 통과**, 건너뜀 0 | 없음 (API는 MSW 목) | frontend-ci: 타입 검사·테스트·빌드 |
| booth | `python -m pip install -e ".[dev]"` | `ruff check . && pytest -q` | **264 통과**, 1 건너뜀 | 화면 테스트(playwright) | 커버리지 70%, Jetson용 Python 3.10 작업, 화면 하네스 |
| agent | 같음 | 같음 | **106 통과**, 1 건너뜀 | 운영체제별 테스트, MCP 도구 테스트 | ubuntu·macos·windows 세 곳, 커버리지 70% |
| ml | 같음 | 같음 | **233 통과**, 4 건너뜀 | PostgreSQL·RabbitMQ 연동, 계약 스키마 대조 | postgres:16·rabbitmq:3.13 서비스로 전부, 커버리지 70% |
| chat-server | 같음 | 같음 | **48 통과** | 없음 (Gemini·Ollama는 MockTransport) | python-ci: 커버리지 70% |
| capture_server | (JDK 21) | `./mvnw verify` | 162 중 **156 통과**, 6 건너뜀 | Testcontainers 통합 테스트 | backend-ci: JaCoCo 40% |
| auth_server | 같음 | 같음 | 87 중 **76 통과**, 11 건너뜀 | Testcontainers 통합 테스트 | 같음 |
| diagnostics_server | 같음 | 같음 | 85 중 **78 통과**, 7 건너뜀 | Testcontainers 통합 테스트 | 같음 |
| rental_server | 같음 | 같음 | 116 중 **104 통과**, 12 건너뜀 | Testcontainers 통합 테스트 | 같음 |
| report_server | 같음 | 같음 | 40 중 **39 통과**, 1 건너뜀 | Testcontainers 통합 테스트 | 같음 |
| gateway | 같음 | 같음 | **504 통과**, 건너뜀 0 | 없음 (가짜 백엔드 + 메모리 요청 제한) | 같음 |
| contracts | (도구 설치) | 아래 "계약·매니페스트 검사" | 테스트 대신 검사 | — | contracts-ci |
| gitops | kustomize·kubeconform | 아래 "계약·매니페스트 검사" | 테스트 대신 검사 | — | validate |

- gateway의 504개에는 역할 × 경로 권한 조합을 하나씩 도는 매개변수 테스트가 들어 있습니다(리뷰 총정리의 "451개 조합").
- 모든 레포에는 비밀값 검사(gitleaks) 워크플로 `security.yml`도 따로 돕니다.

## 건너뛴 테스트 켜는 법

### 파이썬

| 레포 | 빠지는 테스트 | 켜는 법 |
| --- | --- | --- |
| booth | `tests/test_ui.py` (브라우저로 부스 화면 확인) | `pip install -e ".[dev,ui]"` 뒤 `TRACE_UI_TESTS=1 pytest -q` (Chromium 필요) |
| booth | 옆면 카메라 회전 | numpy·OpenCV가 설치돼 있으면 돕니다 |
| agent | `tests/test_install.py` 일부 | 한 줄 설치 스크립트 테스트는 리눅스(sh 있음)에서, smartctl 받기는 macOS에서만 돕니다. 전체는 CI 세 운영체제를 합쳐서 확인 |
| agent | `test_mcp` 도구 테스트 | `pip install -e ".[dev,mcp]"` (CI에서도 빠짐) |
| ml | DB 저장 테스트 | `TRACE_ML_TEST_DB`에 테스트용 PostgreSQL 주소 |
| ml | 이벤트 발행 테스트 | `TRACE_ML_TEST_AMQP`에 테스트용 RabbitMQ 주소 |
| ml | 계약 스키마 대조 | `TRACE_CONTRACTS_DIR`에 contracts 레포 경로 |
| ml | 배포 스크립트 테스트 | bash·sha256sum이 있는 환경 |

### 자바 서버 (Testcontainers)

통합 테스트는 `@Testcontainers(disabledWithoutDocker = true)`라서 Docker가 없으면 빠지고, GitHub Actions에서는 PostgreSQL·RabbitMQ 컨테이너를 띄워 전부 돕니다. 도메인 로직은 Docker 없이 도는 단위 테스트로도 덮었습니다.

| 레포 | 빠지는 통합 테스트 | Docker 없이 돌리는 법 |
| --- | --- | --- |
| capture_server | 촬영 세트, 검사 흐름, 검수 흐름 IT | Docker 필요 |
| auth_server | 로그인 흐름, 계정, 데모 고객, 봉인 영수증 IT | `TRACE_IT_LOCAL=1` + 로컬 PostgreSQL(`trace_it` DB) + Redis DB 15 |
| diagnostics_server | 진단 IT, 이벤트 IT | `TRACE_IT_LOCAL=1`이면 진단 IT만 돎. 이벤트 IT는 Docker 필요 |
| rental_server | 렌탈 중복 방지, 세 시점 흐름, 기기 상태 IT | Docker 필요 (로컬 모드 없음) |
| report_server | 봉인·해시 체인·공개 검증 IT | Docker 필요 |

- `./mvnw verify`는 테스트 뒤 JaCoCo 줄 커버리지 40% 관문까지 확인합니다. 테스트만 빨리 보려면 `./mvnw test`.
- gateway는 `junit-platform.properties`로 테스트 이름을 공백이 들어간 문장으로 보여 줍니다.

## 계약·매니페스트 검사

| 레포 | 검사 | CI에서 하는 일 |
| --- | --- | --- |
| contracts | `yamllint` (relaxed, 한 줄 160자) | YAML 문법·들여쓰기 |
| contracts | `check-jsonschema` | 진단·이벤트 JSON Schema와 예시가 맞는지 |
| contracts | `python scripts/check_breaking.py` | 직전 릴리스와 비교해 깨지는 변경이 없는지 |
| contracts | `python scripts/check_events.py` | 이벤트 스키마·예시 대조 |
| contracts | `scripts/check_diagnostics_examples.sh` | 진단 예시 검증 |
| contracts | `redocly lint` | OpenAPI 6개 문법·규칙 |
| gitops | `kustomize build overlays/school \| kubeconform -strict -ignore-missing-schemas` | 쿠버네티스 매니페스트 검증 |
| gitops | `scripts/check-no-secrets.sh` | 비밀값이 커밋되지 않았는지 |

## 전체 숫자

| 묶음 | 11/24 실행 | 비고 |
| --- | --- | --- |
| 웹 | 584 | 건너뜀 없음 |
| 파이썬 4곳 | 651 통과 + 6 건너뜀 | booth 264 · agent 106 · ml 233 · chat-server 48 |
| 자바 6곳 | 994 (건너뜀 37 포함) | gateway 504는 권한 조합 매개변수 테스트 포함 |

리뷰 총정리([README.md](README.md))의 "약 1,780개"는 11/20에 센 숫자입니다. 이 표는 11/24에 테스트 도구가 보고한 수(매개변수 테스트는 경우마다 1개)를 그대로 적어서 더 큽니다.
