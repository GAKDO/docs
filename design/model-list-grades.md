# 기종·기기 목록에 진단 등급·벤치마크 보이기 (설계 메모, 11/10 이후)

11/4 민서 요청의 3번째 항목. 1·2번(기준 사양에 GPU, 기종 목록에 기준 사양 열·검색·정렬)은 이미 반영했다
(contracts #24, rental_server #12, web #52). 이 메모는 diagnostics-server(2단계, 지금 꺼 둠)를 다시 켤 때 할 일이다.

## 목표

- 관리자와 사용자가 **목록에서 바로** 진단 등급과 벤치마크를 보고, 정렬·검색으로 원하는 기기를 찾는다.
- 기종 목록: 기종별 기준 사양 + "이 기종 기기들의 평균·최저 진단 등급", 기종 기준 벤치마크.
- 기기 목록: 기기마다 최근 진단 등급·배터리 최대 용량·벤치마크 점수, 기준 사양 대비 차이 표시.

## 어디에 무엇을 둘까

| 값 | 원본 | 목록에 싣는 방법 |
|---|---|---|
| 기준 사양(CPU·메모리·저장 공간·GPU) | rental-server `device_model.spec` | 이미 `DeviceModelSummary.spec` |
| 최근 진단 등급·요약 | diagnostics-server | 이벤트 `trace.diagnostics.recorded`를 rental-server가 소비해 기기 행에 **요약 사본**(등급·배터리·측정 시각)을 둠 |
| 벤치마크 점수 | diagnostics-server(에이전트 측정) | 같은 이벤트에 선택 필드로 실어 같은 요약 사본에 둠 |

목록 API가 다른 서버를 부르지 않게(목록 하나 = 서버 하나) rental-server에 요약 사본을 두는 쪽을 권한다.
화면이 diagnostics-server를 기기마다 부르면 N+1 호출이 된다.

## 계약 추가(깨지지 않는 변경만, contracts #23과 함께 검토)

- `Device`(기기 목록 항목)에 선택 필드 `diagnostics`: `{ grade, batteryMaxCapacityPct, benchmarkScore, measuredAt }` 또는 null
- `DeviceModelSummary`에 선택 필드 `diagnosticsStats`: `{ deviceCount, gradeCounts, benchmarkMedian }` 또는 null
- 이벤트 `trace.diagnostics.recorded`에 선택 필드 `benchmark`(점수·측정 도구·버전) — 이벤트 schemaVersion 1.2
- 기기 목록 `GET /devices`에 선택 쿼리 `sort`(`createdAt`·`grade`·`benchmark`, 기본 지금과 같음). 기기는 커서 목록이라
  정렬은 서버에서 해야 한다(기종 목록은 기종 수가 적어 화면 정렬로 충분)

## 화면(web)

- 기종 목록: 이미 있는 열 뒤에 "등급 분포"·"벤치마크" 열, 정렬 키 추가(`src/features/models/lib/modelList.ts`)
- 기기 목록: "진단 등급"·"벤치마크" 열과 정렬 선택, 기준 사양보다 낮으면(메모리·저장 공간 부족 등) 표시
- 사용자(CUSTOMER) 화면: 자기 렌탈 기기만, 같은 요약 값

## 순서

1. diagnostics-server 재도입 결정(11/10 이후)
2. contracts: 위 선택 필드·쿼리 추가(#23 검토와 묶음)
3. rental-server: 이벤트 소비 → 요약 사본 저장(Flyway 새 파일), 목록 응답·정렬
4. web: 열·정렬 추가(C)
