# 진단 결과 JSON v0 (초안)

진단 에이전트(B)가 올리고 diagnostics-server(A)가 검증·저장하는 JSON 형식입니다. 10/31에 A가 실제 노트북 출력으로 키 이름을 확인하고 JSON Schema로 옮겨 11/3까지 `contracts`에 고정합니다. B는 11/6부터 이 형식에 맞춰 에이전트를 만듭니다.

## 다른 서비스는 어떻게 재나

| 서비스·도구 | 무엇을 보나 | 어떻게 재나 | TRACE에 가져올 것 |
| --- | --- | --- | --- |
| Back Market (리퍼 노트북 마켓) | 배터리 건강도 | 설계 대비 현재 용량 %. 노트북은 85% 이상 보장, 기업 채널은 85% 초과 + 충전 사이클 500회 미만 | 용량 %와 사이클 수를 함께 저장 |
| Apple macOS | 배터리 상태 | 1,000사이클에서 80% 유지가 설계 기준. OS가 "정상" 또는 "서비스 권장"으로 판정하고, 판정에는 용량 말고 다른 고장도 반영됨 | 수치와 OS 판정을 둘 다 저장 |
| Windows 배터리 리포트 | 설계 용량·완충 용량·사이클 | `powercfg /batteryreport /xml`, 용량 단위는 mWh | XML로 받아 파싱, 단위 mWh 그대로 |
| osquery (Fleet·Kolide 기기 관리) | 배터리 테이블 | macOS는 mAh, Windows는 mWh를 12V로 나눠 mAh로 환산. 사이클이 0으로 나오는 기기가 있음 | 환산하지 않고 값과 단위로 저장, 0이나 없음은 null |
| smartmontools (Proxmox 등) | SSD 수명 | `smartctl -j`의 NVMe 건강 로그. percentage\_used는 제조사가 추정한 수명 사용률(100을 넘을 수 있음), 고장 신호는 경고 바이트와 미디어 오류 | 사용률·예비 블록·경고·오류·가동 시간을 따로 저장 |
| 다나와 인증 중고 | 고객 표시 | 배터리 효율 %와 실사용 시간 | 고객 화면에는 "배터리 효율 %" 하나로 단순하게 |
| Geekbench 6 | 성능 점수 | CLI에 JSON 내보내기가 있지만 자동 수집은 유료(Pro), 기본은 결과를 외부에 업로드 | 자체 고정 벤치마크를 쓰고 측정 조건을 함께 기록 |
| Blancco (기기 진단·인증) | 진단 리포트 | 리포트를 디지털 서명해 위변조를 막음 | TRACE는 원본 JSON 해시를 해시 체인에 넣음(설계 반영됨) |

## 조사에서 정한 원칙

1. **값과 단위를 같이 둔다.** 용량은 macOS가 mAh, Windows가 mWh입니다. 환산하지 않고 `{value, unit}`으로 보내고, 효율 %는 서버가 계산합니다.
2. **모르는 값은 null, 못 읽은 항목은 SKIPPED + 사유.** 0을 "모름" 대신 쓰지 않습니다(FR-DIA-03).
3. **OS 판정도 저장한다.** macOS 배터리 상태(정상·서비스 권장)는 수치만으로 알 수 없는 고장을 알려 줍니다.
4. **SSD는 사용률 하나로 판단하지 않는다.** 사용률, 예비 블록, 경고, 미디어 오류, 가동 시간을 따로 둡니다.
5. **벤치마크는 3회 + 중앙값 + 측정 조건.** 전원 연결, 배터리 잔량, 발열 상태, 실행 중인 프로세스 수를 같이 보냅니다. 전원이 연결되지 않으면 벤치마크를 돌리지 않습니다.
6. **개인정보는 보내기 전에 지운다.** 읽는 명령을 고정 목록으로 두고(NFR-02), 컴퓨터 이름·사용자 이름이 들어가는 필드는 버립니다. 무엇을 읽었는지는 `sources`에 남깁니다.
7. **시점 ID는 본문에 넣지 않는다.** checkpointId는 페어링 코드로 받은 AGENT 토큰에서 서버가 꺼냅니다. 에이전트가 다른 시점에 올릴 수 없게 하려는 것입니다.

## 예시 (macOS)

```json
{
  "schemaVersion": "diag.v0",
  "agentVersion": "0.1.0",
  "collectedAt": "2026-11-06T14:03:22+09:00",
  "consentedAt": "2026-11-06T14:04:10+09:00",
  "os": { "type": "MACOS", "version": "15.1", "arch": "arm64" },
  "device": {
    "serial": "C02TEST00001",
    "manufacturer": "Apple",
    "model": "Mac14,2",
    "modelName": "MacBook Air (M2, 2022)"
  },
  "conditions": {
    "acPower": true,
    "batteryPercent": 92,
    "thermalState": "NOMINAL",
    "processCount": 312,
    "uptimeSec": 5400
  },
  "components": [
    { "kind": "CPU", "identifier": "Apple M2", "detail": { "cores": 8 } },
    { "kind": "RAM", "identifier": "8 GB", "detail": { "totalBytes": 8589934592 } },
    { "kind": "SSD", "identifier": "APPLE SSD AP0256Z", "detail": { "serial": "SSDTEST01", "capacityBytes": 251000193024 } },
    { "kind": "BATTERY", "identifier": "bq40z651", "detail": { "serial": "BATTEST01" } },
    { "kind": "DISPLAY", "identifier": "Built-in Liquid Retina", "detail": { "resolution": "2560x1664" } }
  ],
  "battery": {
    "status": "OK",
    "cycleCount": 214,
    "designCapacity": { "value": 4382, "unit": "mAh" },
    "fullChargeCapacity": { "value": 3901, "unit": "mAh" },
    "osMaxCapacityPercent": 89,
    "osCondition": "NORMAL"
  },
  "storage": {
    "status": "OK",
    "skippedReason": null,
    "protocol": "NVME",
    "percentageUsed": 3,
    "availableSpare": 100,
    "criticalWarning": 0,
    "mediaErrors": 0,
    "powerOnHours": 812
  },
  "benchmarks": [
    { "metric": "CPU_SINGLE", "unit": "ops/s", "trials": [1021.3, 1018.9, 1025.0], "median": 1021.3 },
    { "metric": "CPU_MULTI", "unit": "ops/s", "trials": [6120.4, 6088.1, 6131.7], "median": 6120.4 },
    { "metric": "MEM_COPY", "unit": "MB/s", "trials": [41200, 40950, 41380], "median": 41200 },
    { "metric": "DISK_READ", "unit": "MB/s", "trials": [2810, 2795, 2830], "median": 2810 },
    { "metric": "DISK_WRITE", "unit": "MB/s", "trials": [2105, 2090, 2118], "median": 2105 }
  ],
  "sources": [
    "system_profiler SPHardwareDataType",
    "system_profiler SPPowerDataType",
    "ioreg AppleSmartBattery",
    "smartctl -j -a disk0",
    "trace-bench 0.1.0"
  ]
}
```

Windows에서는 이렇게 달라집니다.

```json
"battery": {
  "status": "OK",
  "cycleCount": null,
  "designCapacity": { "value": 57000, "unit": "mWh" },
  "fullChargeCapacity": { "value": 51230, "unit": "mWh" },
  "osMaxCapacityPercent": null,
  "osCondition": null
},
"storage": {
  "status": "SKIPPED",
  "skippedReason": "NO_PERMISSION"
}
```

## 필드 정의

| 필드 | 필수 | 값 | 저장 위치 (DDL) |
| --- | --- | --- | --- |
| `schemaVersion` | 예 | `diag.v0` | 원본 JSON (MinIO) |
| `agentVersion` | 예 | 에이전트 버전 | `diagnostic_run.agent_version` |
| `collectedAt` · `consentedAt` | 예 | ISO 8601 + 오프셋. 동의 시각은 사용자가 결과를 본 뒤 누른 시각(FR-DIA-05) | `diagnostic_run.consented_at` |
| `os` | 예 | `type` MACOS·WINDOWS, `version`, `arch` | `diagnostic_run.os` |
| `device` | 예 | `serial`은 렌탈 기기 시리얼과 대조해 다르면 422 | `diagnostic_run.device_serial` |
| `conditions` | 예 | `acPower`, `batteryPercent`, `thermalState`(NOMINAL·FAIR·SERIOUS·CRITICAL, Windows는 null), `processCount`, `uptimeSec` | `diagnostic_run.conditions` |
| `components[]` | 예 | `kind` CPU·RAM·SSD·BATTERY·DISPLAY·OTHER, `identifier`, `detail` | `hardware_component` |
| `battery` | 예 | `status` OK·SKIPPED·NO\_BATTERY, `cycleCount`, `designCapacity`, `fullChargeCapacity`, `osMaxCapacityPercent`, `osCondition` NORMAL·SERVICE\_RECOMMENDED | `battery_reading` |
| `storage` | 예 | `status` OK·SKIPPED, `skippedReason` NO\_PERMISSION·UNSUPPORTED·TOOL\_ERROR, `protocol` NVME·ATA, `percentageUsed`, `availableSpare`, `criticalWarning`, `mediaErrors`, `powerOnHours` | `ssd_health` |
| `benchmarks[]` | 예 | `metric` CPU\_SINGLE·CPU\_MULTI·MEM\_COPY·DISK\_READ·DISK\_WRITE, `unit`, `trials`(3개), `median` | `benchmark_result` |
| `sources[]` | 예 | 실행한 명령 목록 | 원본 JSON에만 |

서버는 받은 JSON의 SHA-256을 계산해 원본과 함께 MinIO에 두고, 효율 %(`fullChargeCapacity ÷ designCapacity × 100`)를 계산해 `battery_reading.max_capacity_pct`에 넣습니다.

## OS별로 읽는 곳

| 항목 | macOS | Windows |
| --- | --- | --- |
| 기기·CPU·RAM | `system_profiler SPHardwareDataType -json` | WMI `Win32_ComputerSystem`·`Win32_Processor`·`Win32_PhysicalMemory`·`Win32_BIOS`(시리얼) |
| 배터리 | `system_profiler SPPowerDataType -json`(사이클·최대 용량·상태), `ioreg -r -c AppleSmartBattery`(mAh 원값) | `powercfg /batteryreport /xml`(DesignCapacity·FullChargeCapacity·CycleCount) |
| SSD | `smartctl -j -a disk0` (에이전트에 함께 넣음) | `smartctl -j -a` (관리자 권한이 없으면 SKIPPED) |
| 디스플레이 | `system_profiler SPDisplaysDataType -json` | WMI `WmiMonitorID` |
| 벤치마크 | 자체 60초 (`trace-bench`) | 같음 |

### macOS 실제 출력으로 확인한 키 (10/30, MacBook Air M2)

`system_profiler -json`의 키 이름은 아래와 같습니다. 출력에 없는 배터리 mAh와 SSD 수명 값은 B가 에이전트 착수 때 확인합니다.

| 값 | 실제 키 | 출력 형태 | 에이전트에서 할 일 |
| --- | --- | --- | --- |
| 충전 횟수 | `SPPowerDataType` › `sppower_battery_health_info` › `sppower_battery_cycle_count` | 숫자 (298) | 그대로 보냄 |
| 최대 용량 % | 같은 곳 › `sppower_battery_health_maximum_capacity` | 글자 ("85%") | 숫자로 바꿈 |
| OS 판정 | 같은 곳 › `sppower_battery_health` | 글자 ("Good") | 원문 그대로 보냄 |
| 충전기 연결 | `SPPowerDataType` › `sppower_battery_charger_connected` | 글자 ("TRUE"/"FALSE") | 참/거짓으로 바꿈 |
| 칩·모델·메모리 | `SPHardwareDataType` › `chip_type`·`machine_model`·`physical_memory` | 글자 ("Apple M2", "Mac14,2", "16 GB") | 메모리는 숫자(GB)로 바꿈 |
| SSD | `SPNVMeDataType` › `device_model`·`size_in_bytes`·`smart_status` | `smart_status`는 "Verified" 한 단어 | 수명 값은 `smartctl`로 읽음 |

- **출력에 없는 값:** 배터리 설계·현재 용량(mAh), SSD 수명 사용률·예비 공간
- **보내기 전에 지울 값:** `serial_number`, `platform_UUID` 등 기기 고유 번호가 출력에 함께 나옵니다

## 10/31 할 일 (A)

- [x] 팀 MacBook에서 `system_profiler -json` 출력으로 키 이름 확인 (10/30 완료, 위 표)
- [ ] 이 초안을 JSON Schema(draft 2020-12)로 옮겨 `contracts/diagnostics/diag.v0.schema.json`에 커밋
- [ ] macOS·Windows 예시 JSON 2개를 계약 테스트 픽스처로 추가
- [ ] B에게 공유하고 11/6 착수 확인

## 에이전트 착수 때 확인할 것 (B, 11/6)

- [ ] 맥 배터리 mAh: `ioreg -rn AppleSmartBattery`에서 `DesignCapacity`·`AppleRawMaxCapacity`·`NominalChargeCapacity` 키가 나오는지 확인
- [ ] 맥 SSD 수명: `brew install smartmontools` 후 `smartctl -j -a disk0`에서 수명 사용률·예비 공간 값이 나오는지 확인. 안 나오면 macOS는 `smart_status`만 보내고, 나머지는 "생략"과 그 사유로 남김
- [ ] 팀 Windows 노트북에서 `powercfg /batteryreport /xml`과 `smartctl -j` 출력 확인(관리자 권한 필요 여부 포함)

## 출처

- [Back Market: 노트북 품질 기준](https://www.backmarket.co.uk/en-gb/quality/laptops) · [Back Market Pro: 등급 기준](https://pro.backmarket.com/pages/grading)
- [Tom's Guide: MacBook 배터리 상태 확인(Apple 1,000사이클 80% 기준)](https://www.tomsguide.com/how-to/how-to-check-macbook-battery-health)
- [Microsoft: PwrTest 배터리 시나리오(CycleCount·FullChargeCapacity 정의)](https://learn.microsoft.com/nb-no/windows-hardware/drivers/devtest/pwrtest-battery-scenario)
- [Fleet: osquery battery 테이블](https://fleetdm.com/tables/battery)
- [Netdata: smartctl NVMe Percentage Used](https://www.netdata.cloud/guides/smartctl-disk-monitoring/smartctl-nvme-percentage-used/) · [Proxmox: smartctl JSON 파싱](https://lists.proxmox.com/pipermail/pve-devel/2021-April/047468.html)
- [Geekbench CLI 사용 예](https://oneuptime.com/blog/post/2026-03-02-use-geekbench-ubuntu/view) · [다나와 인증 중고](https://plan.danawa.com/mobile/info/index.php?nPlanSeq=9875)
