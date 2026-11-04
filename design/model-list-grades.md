# 기종·기기 목록에 진단 등급·벤치마크 보이기 (설계 메모, 11/10 이후)

11/4 민서 요청의 3번째 항목. 1·2번(기준 사양에 GPU, 기종 목록에 기준 사양 열·검색·정렬)은 이미 반영했다
(contracts #24, rental_server #12, web #52). 이 메모는 diagnostics-server(2단계, 지금 꺼 둠)를 다시 켤 때 할 일이다.

## 목표

- 관리자와 사용자가 **목록에서 바로** 진단 등급과 벤치마크를 보고, 정렬·검색으로 원하는 기기를 찾는다.
- 기종 목록: 기종별 기준 사양 + 이 기종 기기들의 진단 판정 분포·최저 판정, 벤치마크 중앙값.
- 기기 목록: 기기마다 최근 진단 판정·배터리 최대 용량·벤치마크 점수, 기준 사양 대비 차이 표시.

## 먼저 정할 것: "진단 판정"의 출처

지금 `trace.diagnostics.recorded`에는 등급이 없다(flags·maxCapacityPct만). 외관 등급(`trace.checkpoint.graded`의 grade)과는 다른 값이다.
두 안 중 하나를 #23 검토 때 정한다.

- **안 A(권장)**: diagnostics-server가 판정을 계산해 이벤트에 선택 필드 `verdict`(codes.yaml 새 코드 `diagnostics.verdict`: OK·CHECK·FAIL, 순서 OK < CHECK < FAIL)와 `verdictRuleVersion`을 싣는다. rental-server는 계산하지 않고 그대로 저장한다.
- 안 B: rental-server가 flags로 판정을 계산(규칙 버전을 함께 저장). 규칙이 두 서버에 흩어지므로 권하지 않는다.

"최저 판정"은 위 순서에서 가장 나쁜 값이다. 평균은 순서형 값이라 두지 않고 분포(`verdictCounts`)로 보여 준다.

## 어디에 무엇을 둘까

| 값 | 원본 | 목록에 싣는 방법 |
|---|---|---|
| 기준 사양(CPU·메모리·저장 공간·GPU) | rental-server `device_model.spec` | 이미 `DeviceModelSummary.spec` |
| 최근 진단 판정·요약 | diagnostics-server | 이벤트 `trace.diagnostics.recorded`를 rental-server가 소비해 기기 행에 **요약 사본**(판정·배터리·측정 시각)을 둠 |
| 벤치마크 점수 | diagnostics-server(에이전트 측정) | 같은 이벤트에 선택 필드로 실어 같은 요약 사본에 둠 |

목록 API가 다른 서버를 부르지 않게(목록 하나 = 서버 하나) rental-server에 요약 사본을 두는 쪽을 권한다.
화면이 diagnostics-server를 기기마다 부르면 N+1 호출이 된다.

### rental-server 소비 규칙(기존 `trace.rental.checkpoints` 소비와 같은 틀)

- 큐 `trace.rental.diagnostics`, 바인딩 `trace.diagnostics.recorded`, DLX `trace.dlx`(dead-letter 키 `<큐>.dead`). report-server의 기존 소비는 그대로 둔다.
- 멱등: `eventId`를 이미 처리했으면 무시.
- 순서: 이벤트 봉투의 `occurredAt`을 기준으로, 저장된 사본보다 새롭지 않은 이벤트는 무시(늦게 온 옛 진단이 최신을 덮지 않게).
- 벤치마크는 `tool`·`toolVersion`을 점수와 함께 저장한다. 기종 중앙값은 **같은 tool·toolVersion끼리만** 계산하고, 응답에 그 tool·toolVersion을 함께 싣는다(다른 도구 점수를 섞지 않음).

## 계약 추가(깨지지 않는 변경만, contracts #23과 함께 검토)

- `Device`(기기 목록 항목)에 선택 필드 `diagnostics`: `{ verdict, batteryMaxCapacityPct, benchmark: { score, tool, toolVersion } | null, measuredAt }` 또는 null
- `DeviceModelSummary`에 선택 필드 `diagnosticsStats`: `{ deviceCount, verdictCounts, worstVerdict, benchmarkMedian: { score, tool, toolVersion } | null }` 또는 null
- 이벤트 `trace.diagnostics.recorded`에 선택 필드 `verdict`·`verdictRuleVersion`(안 A)과 `benchmark`(score·tool·toolVersion) — 이벤트 schemaVersion 1.2
- 기기 목록 `GET /devices`에 선택 쿼리 `sort`. 기기는 커서 목록이라 정렬은 서버에서 한다(기종 목록은 기종 수가 적어 화면 정렬로 충분)
  - `createdAt`(기본, 지금과 같음): 최신 먼저
  - `verdict`: 나쁜 판정 먼저(FAIL → CHECK → OK), 진단 없음은 맨 뒤
  - `benchmark`: 점수 높은 순, 점수 없음은 맨 뒤
  - 동점은 내부 id로 깨고, 커서는 (정렬 값, id)를 담는다. 정렬 값이 null인 구간은 null 표시와 id로 이어 간다
  - 페이지를 넘기는 사이 새 진단으로 정렬 값이 바뀐 기기는 한 번 더 보이거나 빠질 수 있다(스냅샷 없음). 관리자 목록 용도로 받아들이고 계약 설명에 적는다

## 화면(web)

- 기종 목록: 이미 있는 열 뒤에 "판정 분포·최저 판정"·"벤치마크 중앙값(도구)" 열, 정렬 키 추가(`src/features/models/lib/modelList.ts`)
- 기기 목록(ADMIN만): "진단 판정"·"벤치마크" 열과 정렬 선택, 기준 사양보다 낮으면(메모리·저장 공간 부족 등) 표시
- 사용자(CUSTOMER) 화면: `GET /devices`는 지금처럼 ADMIN만 둔다. 고객은 이미 본인 범위로 막힌 `GET /rentals/{rentalId}`·`GET /diagnostics/checkpoints/{checkpointId}`로 자기 렌탈 기기의 같은 요약 값을 본다. 고객용 기기 목록이 필요해지면 역할 표를 먼저 바꾸고 `rentals` 클레임 거르기와 다른 렌탈 403 시험을 더한다

## 순서

1. diagnostics-server 재도입 결정(11/10 이후), 판정 출처 안 A·B 결정
2. contracts: 위 선택 필드·쿼리 추가(#23 검토와 묶음)
3. rental-server: 이벤트 소비 → 요약 사본 저장(Flyway 새 파일), 목록 응답·정렬
4. web: 열·정렬 추가(C)
