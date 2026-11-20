# ERD 정규화 점검 (2026-11-20)

각 서버의 실제 스키마(Flyway 마이그레이션을 모두 적용한 결과)와 [ddl.md](ddl.md)의 ERD를 1NF~3NF·BCNF 기준으로 점검한 결과입니다. 스키마 7개, 테이블 37개를 봤습니다(chat-server는 DB가 없습니다).

## 결론

- **기본 구조는 정규화가 잘 돼 있습니다.** 모든 표에 대리 키(`id`)와 업무 키(UNIQUE)가 있고, 한 표가 한 가지 사실만 담으며, 부분 종속(2NF 위반)은 없습니다.
- **같은 서버 안에서 같은 사실을 두 번 저장하는 곳이 8건** 있었습니다. 3NF 이행 종속 3건, 다른 표와 겹치는 값 1건, 계산값·상태 중복 2건, 쓰지 않는 칸·표 2건입니다. 모두 고쳤거나(1단계) 삭제를 예약했습니다(2단계).
- **서버 사이에 값을 복사해 둔 곳**은 위반이 아니라 의도된 비정규화입니다. 서버 사이에는 FK를 두지 않고 `public_id` 값만 들기로 했기 때문입니다(11/2 결정, 헌법 ID 전략). 근거와 함께 아래에 따로 정리했습니다.

## 판단 기준

| 구분 | 기준 | 처리 |
| --- | --- | --- |
| 위반 | **같은 서버(같은 스키마 소유자) 안에서** 한 사실이 두 곳에 저장되고, 둘이 어긋나는 것을 DB가 막지 못함 | 칸을 빼거나, 뺄 수 없으면 제약으로 묶음 |
| 의도된 비정규화 | **다른 서버의 사실**을 이벤트·토큰으로 받아 값으로 들고 있음(FK 불가) | 유지. 원본이 어느 서버인지 적어 둠 |
| 증거 보관 | 원문·해시·서명처럼 **위변조를 가리려고 일부러 겹쳐 둔 값** | 유지 |
| 문서 칸(jsonb) | 앱이 통째로 읽고 쓰는 값. SQL이 안쪽을 조건으로 쓰지 않음 | 유지. 안쪽을 조건으로 쓰게 되면 표로 뺌 |

## 고친 것 (같은 서버 안의 중복 8건)

| # | 표·칸 | 무엇이 문제였나 | 어떻게 고쳤나 | PR |
| --- | --- | --- | --- | --- |
| 1 | `rental.booth_code.rental_id` | 3NF 이행 종속. 시점이 렌탈을 정하는데(`checkpoint_id → checkpoint.rental_id`) 렌탈을 또 적음 | 코드가 시점에서 렌탈을 따라감. 칸은 NULL 허용(2단계에서 삭제) | rental_server #31 |
| 2 | `diagnostics.inspection_flag.checkpoint_id` | 3NF 이행 종속. 진단 실행이 시점을 정하는데(`run_id → diagnostic_run.checkpoint_id`) 시점을 또 적음. 읽는 곳도 없었음 | 코드가 채우지 않음. 칸은 NULL 허용(2단계에서 삭제) | diagnostics_server #22 |
| 3 | `diagnostics.battery_reading.max_capacity_pct` | 계산값 저장(완충 ÷ 설계 × 100). 두 용량과 어긋난 값이 들어가도 막지 못함 | 조회·비교·이벤트에 쓰여 칸은 유지. CHECK `ck_battery_max_capacity_pct`가 같은 식인지 확인 | diagnostics_server #22 |
| 4 | `diagnostics.diagnostic_run.raw_object_key` | V2부터 채우지 않는 죽은 칸(원본은 `raw_body`) | 코드 매핑을 뺌(2단계에서 삭제) | diagnostics_server #22 |
| 5 | `inspection.grade_result.checkpoint_id` + `capture_set_id` | 3NF 이행 종속. 세트가 시점을 정하는데(`capture_set_id → capture_set.checkpoint_id`) 등급에도 시점이 있음 | "시점당 등급 하나"(UNIQUE) 때문에 뺄 수 없어 합성 FK `(capture_set_id, checkpoint_id) → capture_set(id, checkpoint_id)`로 묶음 | capture_server #33 |
| 6 | `inspection.defect_match.status` + `prev_defect_id` | 상태 중복. EXISTING이면 앞 흠집이 있고 NEW면 없어 한 칸이 다른 칸을 정함 | `status`는 계약 값이라 유지. CHECK `(status = 'EXISTING') = (prev_defect_id IS NOT NULL)` | capture_server #33 |
| 7 | `report.manual_seal_log`의 `rental_id`·`checkpoint_type`·`grade`·`seq` | 같은 시점의 `record_chain` 줄과 같은 값을 한 트랜잭션에서 두 번 저장 | 기록은 사유·누가만 듦. 나머지는 체인에서 읽고 `checkpoint_id`를 `record_chain` FK로 묶음. 네 칸은 NULL 허용(2단계에서 삭제) | report_server #16 |
| 8 | `report.report_view` | RP1부터 쓰지 않는 죽은 표(`checkpoint_view`로 바뀜) | 코드가 건드리지 않게 함(2단계에서 표 삭제) | report_server #16 |

### 두 단계로 나눈 이유

헌법이 "DB 마이그레이션은 이전 버전 코드에서도 동작하게 나눈다(컬럼 추가 먼저, 삭제는 다음 배포)"고 정했습니다. 자동 롤백은 코드만 되돌리기 때문입니다.

- **1단계(위 PR 4개):** 코드가 중복 칸을 쓰지 않게 하고, 칸은 NULL 허용으로만 바꿉니다. 이전 코드가 돌아와도 동작합니다.
- **2단계(1단계가 main에 배포된 뒤):** 칸과 표를 지웁니다.
  - rental V7: `booth_code.rental_id` 삭제(V6은 리뷰 준비 때 더한 인덱스)
  - diagnostics V7: `inspection_flag.checkpoint_id`, `diagnostic_run.raw_object_key` 삭제
  - report V6: `manual_seal_log`의 네 칸 삭제, `report_view` 표 삭제

새 제약은 모두 `NOT VALID`로 더한 뒤 확인을 시도합니다. 운영 DB에 어긋난 옛 행이 있어도 서버는 뜨고(알림만 남김), 새로 넣거나 고치는 행은 늘 확인됩니다.

## 의도된 비정규화 (위반 아님)

서버 사이에는 FK를 두지 않습니다(11/2 강사 피드백, 헌법 ID 전략). 다른 서버의 행은 그 서버의 `public_id`(NanoID 21자)를 값으로만 들고, 화면·토큰에 바로 필요한 값은 이벤트나 발급 시점에 받아 사본으로 둡니다. 사본은 원본 서버를 다시 부르지 않기 위한 것이고, 원본은 늘 한 서버에만 있습니다.

| 표·칸 | 원본(어느 서버의 사실인가) | 왜 복사해 두나 |
| --- | --- | --- |
| `capture.capture_set.rental_id`·`checkpoint_id`, `diagnostics.diagnostic_run.rental_id`·`checkpoint_id` | rental-server | 이벤트 봉투(rentalId)와 조회 범위에 씀. 시점이 렌탈을 정하지만 그 관계는 rental-server 것이라 여기서는 확인할 수 없음 |
| `rental.checkpoint.grade` | capture-server `inspection.grade_result.grade` | `trace.checkpoint.graded`로 받은 사본. "문제 있는 검사만 보기"를 rental 안에서 거르려고 둠(V4) |
| `capture.capture_set.device` | rental-server 기종·치수 | 찍은 때의 기종·치수 스냅샷. inspect-worker가 이 값으로 표준 좌표 크기를 정함 |
| `report.report.device_id`·`serial`·`model_code`·`model_name` | rental-server | `trace.checkpoint.started`로 받은 사본. 리포트·공개 검증 화면에 씀 |
| `report.checkpoint_view` 전체 | capture·diagnostics·rental | 이벤트로 만드는 읽기 모델(조회 전용 사본) |
| `auth.pairing_code.rental_id`·`device_serial`, `auth.capture_link.rental_id` | rental-server | 발급 때 받아 AGENT·촬영 JWT 클레임에 넣음. 짧게 쓰는 일회용 행 |
| `auth.seal_receipt.rental_id`·`checkpoint_type`·`payload_hash`·`sealed_at` | report-server | `trace.record.sealed`를 받아 둔 영수증(메일 발송용) |
| `diagnostics.sealed_checkpoint` | report-server | 봉인된 시점 사본. 봉인 뒤 진단 다시 하기를 막음 |
| `auth.social_identity.email` | 소셜 제공자 | 연결할 때 제공자가 준 이메일. `account.email`과 다른 사실 |

## 그대로 둔 것과 근거

### 증거로 일부러 겹쳐 둔 값

| 표·칸 | 근거 |
| --- | --- |
| `diagnostics.diagnostic_run.raw_body` + `sha256` + 풀어 둔 자식 표(배터리·SSD·벤치마크·부품) | `raw_body`는 올린 원문 그대로이고 `sha256`은 그 해시로 해시 체인 재료입니다. 자식 표는 비교·조회용으로 원문을 풀어 둔 것입니다. 진단은 한 번 넣으면 고치지 않습니다 |
| `report.record_chain.payload` + `payload_hash` + `record_hash` + `prev_hash` + `signature` | 해시 체인은 겹쳐 두는 것이 목적입니다. 다시 계산해 저장된 값과 다르면 변조로 봅니다 |
| `report.record_chain.checkpoint_type` + `seq` | 출고 1 → 수령 2 → 반납 3 순서만 받으므로 종류가 순번을 정합니다(BCNF로는 중복). 하지만 둘 다 서명하는 줄 형식 `trace-chain-1`에 들어가 있어 빼면 이미 봉인한 기록을 검증할 수 없습니다 |
| `report.record_chain.manual` | 수동 봉인 기록이 있는지와 같은 값이지만 체인 줄만으로 수동 여부를 알 수 있게 둡니다 |
| `capture.photo.sha256`, `capture_set.completion_request_sha256` | 저장소 파일·요청 본문을 확인하는 해시입니다 |

### 계산값이지만 둔 것

| 표·칸 | 근거 |
| --- | --- |
| `diagnostics.benchmark_result.median` | `trial_values`(3회)의 가운데 값. 에이전트가 보내고 서버가 받을 때 같은지 확인합니다(`UploadRules`). 진단은 고치지 않는 행이라 어긋날 길이 없습니다 |
| `inspection.defect.length_mm`·`area_mm2` | 다각형과 정합 결과로 잰 측정값입니다. 다각형과 같은 때에 함께 채웁니다 |
| `inspection.defect.model_version`과 `capture_set.detection_model_version` | 부스 탐지는 두 값이 같지만, 흠집은 부스·inspect-worker·사람이 각각 만들 수 있고 세트의 값은 흠집이 0개여도 성능 그래프에 필요합니다. 서로 다른 사실입니다 |

### jsonb 칸과 1NF

jsonb 칸은 앱이 통째로 읽고 쓰는 값으로 다뤄 원자값으로 봅니다. 다각형·호모그래피(`polygon`, `homography`), 계약 조각 그대로(`conditions`, `checks`, `spec`, `device`, `detail`), 서명 원문(`payload`), 읽기 모델(`checkpoint_view`의 배열들), 목록(`reasons`, `unjudgeable_faces`, `trial_values`, `counts`, `metrics`)이 여기에 듭니다.

엄격한 1NF로 보면 목록 칸은 반복 그룹입니다. 지금은 SQL이 안쪽을 조건으로 쓰는 곳이 `capture_set.skipped_faces` 한 군데뿐입니다(검수 대기 목록의 `jsonb_exists`). 안쪽 값을 조건·조인으로 더 쓰게 되면 그 칸부터 자식 표로 빼는 것이 맞습니다.

## 권장 (이번에 하지 않은 것)

| 항목 | 내용 | 미룬 이유 |
| --- | --- | --- |
| `auth.account.status`와 `withdrawn_at` | 탈퇴면 `withdrawn_at`이 있다는 규칙을 코드만 지킵니다. rental.device의 `status`·`retired_at`처럼 CHECK로 묶을 수 있습니다 | 로그인 서버라 급하지 않은 마이그레이션을 넣지 않았습니다 |
| `auth.pairing_code.rental_id`·`device_serial` | "컬럼 추가 먼저"로 NULL 허용이 됐고 새 코드는 늘 채웁니다. NOT NULL로 조일 수 있습니다 | 5분짜리 행이라 실익이 작습니다 |
| `rental.device.os` | 기종이 OS를 정한다면 `device_model`로 옮길 수 있습니다 | 계약 `Device.os` 변경이 필요합니다(계약 담당 A와 상의) |
| `rental_access.linked_at`·`social_identity.linked_at` | `created_at`과 같은 시각입니다 | 뜻이 다른 이름이라(연결 시각) 두었습니다 |
| Crowfoot ERD | Crowfoot의 ERD v1(10/31, 30개)은 지금 스키마(37개)와 다릅니다 | [ddl.md](ddl.md)의 그림이 기준입니다 |

## 확인 방법

- 서버 5개의 마이그레이션(이번 PR 포함)을 로컬 PostgreSQL 16의 빈 DB에 차례로 적용했습니다.
- [ddl.md](ddl.md)의 SQL을 다른 빈 DB에 적용해, 두 DB의 컬럼(타입·NULL·기본값)·제약·인덱스 638줄이 같은 것을 확인했습니다.
- 새 제약마다 맞는 행은 들어가고 어긋난 행은 막히는 것을 직접 넣어 확인했습니다.
- 서버 단위 테스트는 로컬에서 통과했고, Testcontainers 통합 테스트는 GitHub Actions에서 돕니다.
