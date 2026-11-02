# 코드 컨벤션

팀원 모두 Claude로 개발하므로, 사람이 쓰든 Claude가 쓰든 이 규칙을 따릅니다. 헌법([../speckit/constitution.md](../speckit/constitution.md))이 원칙이고, 이 문서는 코드를 쓰는 방법입니다. contracts가 정한 형식이 있으면 그쪽이 우선입니다.

## 공통

- **언어:** 식별자는 영어, 주석·문서·커밋·PR·테스트 설명은 한국어.
- **형식:** JSON은 camelCase, 시각은 ISO 8601 + 오프셋(저장은 UTC, 화면은 KST), ID는 밖에 보이는 `publicId`(NanoID 21자: Java jnanoid, Python nanoid, TS nanoid)만 쓰고 DB 기본 키(bigint `id`)는 내보내지 않음, 오류는 RFC 9457 Problem Details.
- **코드 값:** 면·조명·카메라·클래스·등급·시점 값은 `contracts/codes.yaml`만 쓴다. 문자열을 코드에 흩뿌리지 않고 상수나 enum 하나로 모은다.
- **설정:** 주소·비밀은 환경 변수. 기본값은 로컬 개발용만 두고, 비밀 기본값은 두지 않는다.
- **로그:** 이메일·이름·토큰·비밀번호·사진 URL 서명은 로그에 남기지 않는다. 요청마다 `traceId`를 싣는다.
- **테스트 이름:** 명세의 수용 기준 문장을 그대로 쓴다. 예: `수리 중 기기로 렌탈을 만들면 409`.
- **작게:** 함수는 한 가지 일, 파일은 300줄 안팎. 쓰지 않는 코드·주석 처리한 코드는 남기지 않는다.

## Java·Spring (gateway, *_server)

- **패키지:** `com.gakdo.trace.<서비스>.<기능>` 아래 `api`(컨트롤러·DTO), `application`(서비스), `domain`(엔티티·리포지토리·도메인 예외), `infra`(외부 클라이언트·이벤트 발행).
- **DTO:** `record`로 쓰고 이름은 `XxxRequest`·`XxxResponse`. 엔티티를 API로 그대로 내보내지 않는다.
- **주입:** 생성자 주입만. `@Transactional`은 application 계층에만.
- **오류:** 도메인 예외를 던지고 `@RestControllerAdvice` 한 곳에서 Problem Details로 바꾼다. 상태 코드는 REST API v0 표를 따른다(중복 409, 권한 403 등).
- **DB:** 테이블·컬럼은 snake_case, 자기 스키마만. Flyway 파일은 `V<번호>__<설명>.sql`이고 머지된 마이그레이션은 고치지 않고 새 파일을 더한다.
- **이벤트:** 라우팅 키는 설계서의 `trace.<도메인>.<과거형>`. 메시지에 `schemaVersion`, `eventId`, `occurredAt`.
- **테스트:** 단위 테스트(도메인·서비스)와 슬라이스·통합 테스트(`@WebMvcTest`, Testcontainers). Testcontainers 테스트는 `@Testcontainers(disabledWithoutDocker = true)`.
- **형식:** 들여쓰기 4칸, 한 줄 120자, import에 `*` 쓰지 않음.

## React·TypeScript (web)

- **폴더:** `src/features/<기능>/`(components·api·hooks), 여러 기능이 쓰는 것은 `src/shared/`.
- **이름:** 컴포넌트 파일은 PascalCase(`DeviceList.tsx`), 훅은 `useXxx`, 상수는 UPPER_SNAKE.
- **타입:** `strict`, `any` 금지. API 타입은 contracts OpenAPI에서 만든 것만 쓰고 손으로 다시 쓰지 않는다.
- **데이터:** API 호출은 fetch 래퍼 한 곳, 서버 상태는 TanStack Query. 토큰은 메모리에만 두고 localStorage에 넣지 않는다.
- **화면:** 375px와 1280px에서 확인. 버튼·입력에 레이블, 오류 문장은 무엇이 잘못됐고 어떻게 고치는지.
- **테스트:** Vitest + Testing Library, API는 MSW로 흉내 낸다.

## Python (agent, booth, ml)

- **버전:** 3.12 기준, booth는 Jetson 때문에 3.10에서도 돌아야 한다(3.11 이후 문법 금지).
- **구조:** `src/<패키지>/`, 테스트는 `tests/`. 외부 명령·장치·네트워크는 함수 하나로 감싸 테스트에서 바꿔 끼운다.
- **형식:** ruff 통과, 타입 힌트 필수, 데이터는 `dataclass`(또는 pydantic) 모델.
- **오류:** 읽지 못한 값은 `None` + 사유. 예외를 삼키지 않는다.

## Git·PR

- **브랜치:** `feature/<명세 번호>-<이름>`(Spec Kit이 만듦) → PR은 `develop`, squash 머지.
- **커밋:** `<종류>(<범위>): <내용>` — feat·fix·refactor·test·docs·chore·ci. 예: `feat(device): 기기 목록 API (FR-RNT-05)`.
- **PR 하나 = 백로그 기능 하나.** 코드 변경이 400줄을 넘으면 나눈다(`specs/`와 생성 코드는 빼고 셈).
- **PR 본문:** 백로그 ID(예: RE1), 요구사항 ID, 테스트한 방법, 화면이면 스크린샷.
- **리뷰·머지:** 시간이 없어 승인은 받지 않습니다(11/2). PR을 올리고 **필수 검사(CI)가 통과하면 올린 사람이 직접 머지**합니다. 머지 전에 CodeRabbit 리뷰를 읽고 심각한 지적(보안·데이터 손실·계약 위반)은 고칩니다. contracts PR은 B·C에게 알린 뒤 머지합니다. CI가 빨간 PR은 머지하지 않습니다. A는 [scripts/merge-prs.sh](../scripts/merge-prs.sh)로 남은 초록 PR을 한 번에 정리할 수 있습니다.
