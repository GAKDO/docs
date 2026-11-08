# 요구사항 구현 현황 (11/8 감사)

[mvp-design.md](mvp-design.md) "최소 요구사항" 표의 요구사항 50개(FR 44 + NFR 6)와, 그 표에는 없고 "기능 요소별 매핑"에만 나오는 FR-RPT-05·06을 각 레포 develop(docs는 main) 코드와 대조했습니다. 기준일 2026-11-08. 구현 위치는 레포 이름부터 적은 경로입니다.

표시: ✅ 구현됨 · ◐ 일부만 · ⏸ 코드는 있지만 지금 배포(gakdo.site)에서 숨김·꺼짐 · ✗ 코드 없음

## 한눈에 보기

| 상태 | 개수 | 요구사항 |
| --- | --- | --- |
| ✗ 코드 없음 | 2 | FR-RPT-05(기록 검색, 선택), FR-RPT-06(3DGS, 실험) — 둘 다 최소 요구사항 표 밖 |
| ◐ 일부만 | 7 | FR-CAP-01, FR-INS-02, FR-INT-02, FR-PIL-02, FR-AUTH-03(요청 제한), NFR-01(실측 대기), NFR-05(클러스터 중단) |
| ⏸ 숨김·꺼짐 | 1 | FR-PIL-01(API는 있고 web 파일럿 화면만 숨김) |
| ✅ 구현됨 | 42 | 아래 표 (FR-CAP-03·04, FR-RNT-04 폰 수령 촬영은 11/8 web #85로 다시 켬) |

문서에만 있는 것: FR-RPT-05는 contracts `GET /api/v1/reports/search`와 gateway 규칙까지 있고, report-server 컨트롤러는 report_server #9(11/8)에서 추가합니다(Elasticsearch는 없음). FR-RPT-06(recon-worker, `trace.recon.*` 이벤트)은 계약·코드 모두 없습니다. InfluxDB `trace-pilot` 기록(DI2 "추이", 설계서 "추이는 InfluxDB에도")과 Elasticsearch 색인도 코드가 없습니다(11/3 중단).

## 요구사항별

| ID | 요구사항 (줄임) | 상태 | 구현 위치 | 메모 |
| --- | --- | --- | --- | --- |
| FR-RNT-01 | 렌탈 생성·기기 연결, 진행 중 렌탈 하나 | ✅ | rental_server `rental/rental/api/RentalController.java`, V1 `ux_rental_open_device` | |
| FR-RNT-02 | 출고·수령·반납 순서 | ✅ | rental_server `rental/rental/` (시점 시작 409), 부스 코드 `rental/boothcode/`, 시험 지우기 | |
| FR-RNT-03 | 기종·치수 관리 | ✅ | rental_server `rental/devicemodel/`, V2 시드 MBA13-M2 | |
| FR-RNT-04 | 수령 QR 1회용 링크 | ✅ | auth_server `auth/capture/`, web `features/rentals/components/CaptureLinkPanel.tsx` | 11/8 web #85로 `phoneCapture`를 다시 켜 QR → 렌탈 연결 → 폰 촬영까지 이어짐 |
| FR-RNT-05 | 기기 목록·상태 | ✅ | rental_server `rental/device/`, web `features/devices/` | |
| FR-AUTH-01 | 로그인·JWT 15분·리프레시 7일 | ✅ | auth_server `auth/account/api/AuthController.java`, `auth/token/` | |
| FR-AUTH-02 | 부스·고객·에이전트 자격 교환 | ✅ | auth_server `auth/booth/`, `auth/capture/`, `auth/pairing/` | |
| FR-AUTH-03 | gateway JWT 검증·역할×경로 | ◐ | gateway `access/` + `resources/access-policy.yaml`(계약에서 생성), 테스트 `RoleRouteMatrixIntegrationTest` | 역할×경로는 계약과 일치. 계약의 429(IP 분당 10회) 중 가입·이메일 코드 확인은 gateway에 제한 없음 |
| FR-USR-01 | 가입·동의 | ✅ | auth_server `auth/account/api/AccountController.java`, web `features/signup/` | |
| FR-USR-02 | QR로 렌탈 계정 연결 | ✅ | auth_server `auth/capture/` exchange → `rental_access` | |
| FR-USR-03 | 내 렌탈·리포트 | ✅ | rental_server `listRentals`(rentals 클레임), web `features/report/components/MyRentalsPage.tsx`·`ReportPage.tsx` | |
| FR-USR-04 | 탈퇴·익명화 | ✅ | auth_server `AccountController` `DELETE /me`, web `features/account/` | |
| FR-USR-05 | 이메일 6자리 인증 | ✅ | auth_server `auth/account/application/SignupService.java` | |
| FR-USR-06 | 비밀번호 재설정 | ✅ | auth_server `AccountController` password/* | |
| FR-CAP-01 | 부스 세트 한 번에 촬영(8면) | ◐ | booth `src/trace_booth/`, capture_server `capture/captureset/` | MVP 부스는 QUICK(TOP·BOT 12장)만. 8면 FULL 부스 세트는 서버만 받음 |
| FR-CAP-02 | 면·조명·카메라·SHA-256 | ✅ | capture_server `capture/captureset/` (완료 때 해시 확인), booth 업로드 | |
| FR-CAP-03 | 폰 가이드·블러·반사 검사 | ✅ | web `features/capture/quality.ts`·`FaceShooter.tsx` | 11/8 web #85: `VITE_ARCHIVED_FEATURES` 기본값이 `pilot`만 남아 다시 보임 |
| FR-CAP-04 | 품질 미달 면 판정 불가 | ✅ | capture_server `captureset/domain/Quality.java`, `grade_result.unjudgeable_faces` | 11/8 폰 수령 촬영을 다시 켜(web #85) 폰 경로에서 쓰임 |
| FR-CAP-05 | 사전 서명 URL 직접 업로드 | ✅ | capture_server `capture/captureset/` (S3 Presigner), web nginx `/trace-captures/` | |
| FR-INS-01 | 흠집 4종 폴리곤 탐지·mAP 기록 | ✅ | booth 탐지(TensorRT), ml `inspect/yolo_detect.py`, capture_server `inspection/`, `GET /captures/benchmarks` | M3 실측 [../contest/metrics/M3.md](../contest/metrics/M3.md) |
| FR-INS-02 | 면 펼치기(윤곽 4점 + 특징점 보정) | ◐ | ml `src/trace_ml/inspect/align.py` (CONTOUR) | SuperPoint·LightGlue 보정(`LIGHTGLUE`) 코드 없음. QUICK은 정합 안 함 |
| FR-INS-03 | 이전 시점과 신규·기존 판정 | ✅ | capture_server `capture/comparison/`, `inspection/application/GradingService.java` | |
| FR-INS-04 | A~D 등급·규칙 버전 | ✅ | capture_server `inspection/domain/GradeRules.java` (grade-rules-v1) | |
| FR-DIA-01~04 | 식별·배터리·SSD·벤치마크 | ✅ | agent `src/trace_agent/`, diagnostics_server `diagnostics/run/` | |
| FR-DIA-05 | 보여 주고 동의하면 올림 | ✅ | agent `src/trace_agent/report.py`, diagnostics_server `consented_at` | |
| FR-DIA-06 | 점검 플래그 | ✅ | diagnostics_server `run/domain/FlagRules.java` (11/7 상태 플래그 3종 포함) | |
| FR-RPT-01 | 3D 모델에 9면 사진 | ✅ | web `features/report/components/TwinViewer.tsx`, capture_server `media` | 텍스처는 inspect-worker 결과(`trace-derived`)가 있어야 채워짐 |
| FR-RPT-02 | 3D 핀·시점 슬라이더 | ✅ | web `features/report/components/PinList.tsx`·`CheckpointSlider.tsx` | |
| FR-RPT-03 | 타임라인 리포트·비교표 | ✅ | report_server `record/api/ReportController.java`, web `CompareTable.tsx` | |
| FR-RPT-04 | 진행률 SSE | ✅ | report_server `progress/`, ml `inspect/runner.py`(Redis 발행) | |
| FR-RPT-05 | 기록 검색(선택) | ✗ | contracts `report-server.yaml`, gateway `access-policy.yaml` | report-server 컨트롤러는 report_server #9(11/8)에서 추가(ADMIN). Elasticsearch 없음 |
| FR-RPT-06 | 3DGS 실물 스캔(실험) | ✗ | 없음 | recon-worker 없음 |
| FR-INT-01 | 해시 체인 | ✅ | report_server `record/` (Ed25519, `record_chain`) | |
| FR-INT-02 | 리포트에 검증 QR | ◐ | web `features/verify/`, `ReportPage.tsx`의 검증 링크 버튼 | 리포트에 QR 그림은 없고 링크만 |
| FR-INT-03 | 봉인 영수증 메일 | ✅ | auth_server `auth/receipt/` (`trace.auth.receipts`) | |
| FR-PIL-01 | 파일럿 별칭 등록 | ⏸ | rental_server `rental/pilot/` | API는 구현됨. web 파일럿 화면은 `VITE_ARCHIVED_FEATURES=pilot`으로 숨김 |
| FR-PIL-02 | 배터리·벤치 추이 대시보드 | ◐ | web `features/benchmark/` (`/admin/benchmark`, 기기별 렌탈 전·후 비교) | InfluxDB·Grafana 중단(11/3·11/6). 별칭(파일럿) 단위가 아니라 기기 단위 |
| FR-DAT-01 | 촬영 목록 안내·파일명 | ✅ | booth `src/trace_booth/naming.py` | |
| FR-DAT-02 | 즉시 업로드·실패 재시도 | ✅ | booth 로컬 큐(`trace-booth retry`) | |
| FR-DAT-03 | Label Studio 연동 | ✅ | ml `src/trace_ml/labelstudio/` (집 PC 로컬 Label Studio) | |
| FR-DAT-04 | 데이터셋 버전(기기 단위 분할) | ✅ | ml `src/trace_ml/dataset/` | |
| FR-DAT-05 | 학습 결과 기록 | ✅ | ml `src/trace_ml/training/record.py`, `ml.training_run` | |
| FR-OPS-01 | 워커 자동 시작·큐 처리 | ✅ | ml `src/trace_ml/inspect/runner.py`(durable 큐 `trace.inspect.requested`), `deploy/inspect-worker/start-worker.ps1` | |
| NFR-01 | Jetson 세트 추론 30초 | ◐ | booth 탐지 | 실측 M1 대기([../contest/evidence.md](../contest/evidence.md)) |
| NFR-02 | 에이전트 읽는 경로 고정 | ✅ | agent `src/trace_agent/commands.py` `ALLOWED` | |
| NFR-03 | 비밀값 Git에 없음 | ✅ | 레포 12개 GitHub Actions gitleaks | |
| NFR-04 | trace 접두사 | ✅ | Redis `trace:`, MinIO `trace-*`, RabbitMQ vhost `/trace` | |
| NFR-05 | 클러스터 자가 복구 | ◐ | gitops `base/`·`overlays/school` (보관) | 11/3 클러스터 중단. 지금은 Compose `restart: unless-stopped`와 볼륨으로 대신 |
| NFR-06 | 로컬 Compose 폴백 | ✅ | gitops `compose/docker-compose.yml` | 폴백이 아니라 지금 실제 배포 |
