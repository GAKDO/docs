# 요구사항 구현 현황 (11/20 갱신)

[mvp-design.md](mvp-design.md) "최소 요구사항" 표의 요구사항 50개(FR 44 + NFR 6)와, 그 표에는 없고 "기능 요소별 매핑"에만 나오는 FR-RPT-05·06을 각 레포 develop(docs는 main) 코드와 대조했습니다. 처음 감사는 11/8이고, 11/20에 11/8 이후 머지된 PR(약 300개 커밋)을 다시 대조해 고쳤습니다. 구현 위치는 레포 이름부터 적은 경로입니다.

표시: ✅ 구현됨 · ◐ 일부만 · ⏸ 코드는 있지만 지금 배포(gakdo.site)에서 숨김·꺼짐 · ✗ 코드 없음

판정 기준은 "코드가 있다"가 아니라 **수용 기준을 확인했는가**입니다. 코드는 다 있어도 수용 기준의 측정을 하지 않았으면 ◐로 둡니다.

## 한눈에 보기 (11/20)

| 상태 | 개수 | 요구사항 |
| --- | --- | --- |
| ✅ 구현됨 | 44 / 50 | 아래 표 |
| ◐ 일부만 | 5 | FR-INS-02(실사진 정합 오차 기록 없음), FR-PIL-02(파일럿 별칭 대신 기기 단위 '성능' 화면), NFR-01(탐지만 실측, 촬영~저장 10회 측정 없음), NFR-03(gitleaks는 통과, 서비스별 계정 분리는 미룸), NFR-05(클러스터 중단, Compose로 대체) |
| ⏸ 숨김·꺼짐 | 1 | FR-PIL-01(등록 API만 있고 web 등록 화면 없음) |
| 표 밖 | 2 | FR-RPT-05 ◐(검색 API만, 화면·Elasticsearch 없음), FR-RPT-06 ✗(3DGS 실험, 코드 없음) |

11/8 감사 뒤 바뀐 것:

- **FR-CAP-01 ◐ → ✅**: 부스에 전체 검사(FULL, 28장, 필수 8면 + SCR1 선택) 범위가 생겼습니다(booth #47, 11/8). 평소 운영은 빠른 검사(QUICK, TOP·BOT 12장)이고, 수령·반납은 출고와 같은 검사 방식만 받습니다(contracts #49, capture_server #30, booth #68, 11/13).
- **FR-INT-02 ◐ → ✅**: 11/8 감사가 놓친 것입니다. 리포트에 공개 검증 QR 그림이 이미 들어가 있었습니다(web `features/report/components/VerifyQr.tsx`, web #86, 11/8).
- **NFR-03 ✅ → ◐ (바로잡음)**: 수용 기준은 "gitleaks 통과, **역할별 키 분리**"입니다. 지금 학교 서버 Compose는 서버들이 DB 계정·MinIO 키·RabbitMQ 계정을 하나씩 같이 씁니다(gitops `compose/docker-compose.yml`의 `DB_USERNAME`·`MINIO_ACCESS_KEY`·`RABBITMQ_USERNAME`). 11/8 보안 점검에서 "서비스별 DB 역할·MinIO 키·RabbitMQ 계정 분리"를 대회 뒤로 미뤘습니다([decisions.md](../decisions.md) 11/8). MinIO 역할별 키 6개는 학교 MinIO용으로 만들어 두었지만 지금 배포는 Compose 안 MinIO를 씁니다.
- **FR-INS-02**: SuperPoint + LightGlue(ONNX) 보정이 들어갔습니다(ml #27, `TRACE_ALIGN=features`, 모델 파일이 없으면 OpenCV ORB). 코드는 다 됐지만 수용 기준 "폰과 부스 사이 정합 오차를 기록한다"는 합성 사진 수치([../contest/ml2-alignment.md](../contest/ml2-alignment.md))만 있어 ◐로 둡니다.
- **FR-USR-04**: 비밀번호를 정한 적 없는 소셜 가입자도 로그인 10분 안이면 탈퇴할 수 있게 했습니다(contracts #45, auth_server #15, web #132, 11/12).
- **FR-DIA-06**: 보안 상태 플래그 2종(`SECURITY_PROTECTION_OFF`·`THREAT_DETECTED`)을 더했습니다(contracts #46, diagnostics_server #16, agent #15, web #137).
- **FR-RNT-02**: 11/9 학교 서버에서 노트북 한 대로 출고 → 수령 → 반납을 끝까지 돌려 봉인 영수증 메일 3통을 받았습니다(MVP 완료 기준 1).
- **FR-OPS-01**: 검사 워커가 집 PC가 아니라 학교 서버 CPU ONNX 컨테이너로 옮겨 갔습니다(ml #25, gitops #18). 큐는 durable(`trace.inspect.requested`)이라 워커가 꺼진 동안 쌓인 작업을 켜지면 처리합니다.

## 11/3 방향 전환과 요구사항

11/3 강사님 리뷰에서 "50개를 한꺼번에 만들지 말고, 끝까지 도는 최소 흐름부터 띄우라"는 지적을 받고 범위를 단계로 나눴습니다. 요구사항을 지우지 않고 **순서만** 바꿨습니다(10/30 "50개 모두 필수" 결정 유지). 자세한 이유는 [decisions.md](../decisions.md) 11/3.

| 11/3 단계 | 기능(백로그) | 그 뒤 실제 |
| --- | --- | --- |
| MVP(11/9) | BO1·BO2(빠른 검사), CA1·CA2(QUICK 세트), AU1·GW1·RE1, WE1 + 관리자 결과 화면, ML1·ML3, G1 | 11/3 gakdo.site 개통, 11/4 출고 시점 봉인까지 확인 |
| 2단계(11/10~12) | RP1·RP2 해시 체인, WE2 폰 촬영, WE3·WE4, ML2 | 11/4 report-server 다시 켬, 11/8 폰 수령 촬영·리포트·검증 다시 켬(web #85), 11/9 세 시점 완주 |
| 3단계 | DI1·AG1·Grafana·9면 전체 세트 | DI1·AG1 11/6 재도입(진단 업로드 실기), 전체 세트 11/8(booth #47). **Grafana는 하지 않음** |
| 중단 | 클러스터, AU2 서버·AU3·RE2·DI2·AG2 | AU2·AU3·RE2·DI2는 11/8까지 완료, AG2는 11/10 Windows 실기. **클러스터만 끝까지 중단** |

끝까지 하지 않은 것과 이유:

| 항목 | 요구사항 | 이유 | 대신 한 것 |
| --- | --- | --- | --- |
| 쿠버네티스 클러스터·Argo CD | NFR-05 | 11/3 재조정에서 중단. 클러스터 비밀·Argo CD·터널을 갖추기 전에, 학교 서버 Compose + 강사님 nginx(HTTPS)로 바로 띄워 흐름부터 확인하는 쪽을 택함 | 학교 서버 Docker Compose(`restart: unless-stopped`, 볼륨), 자동 배포·무중단 교체·자동 되돌리기(gitops `compose/ops/autodeploy.sh`), 야간 백업(gitops #25). 매니페스트는 gitops `base/`·`overlays/school`에 남김 |
| InfluxDB·Grafana | FR-PIL-02, MVP 완료 기준 5 | InfluxDB가 학교 내부망 전용이고, 추이는 진단 테이블만으로 그릴 수 있음(11/6, 11/8 재확인) | 관리자 '성능' 화면 `/admin/benchmark`(기기별 렌탈 전·후), 날짜별 진단 추이(web #80) |
| 파일럿 등록 화면 | FR-PIL-01 | 11/3 재조정에서 RE2 중단. 11/8 API만 완성하고 화면은 대회 범위 밖으로 둠(team/board.md RE2) | 등록 API(rental_server #17)만 |
| Elasticsearch 검색 | FR-RPT-05(선택) | 리뷰 결정 8 "11/10에 여유 없으면 제외" | PostgreSQL 검색 API(report_server #9), 화면 없음 |
| 3DGS 실물 스캔 | FR-RPT-06(실험) | 실험 항목, W06 판정 전에 범위를 줄임 | 기종 치수 상자 3D 트윈 + 면 사진 텍스처 |

## 요구사항별

| ID | 요구사항 (줄임) | 상태 | 구현 위치 | 수용 기준 근거·메모 |
| --- | --- | --- | --- | --- |
| FR-RNT-01 | 렌탈 생성·기기 연결, 진행 중 렌탈 하나 | ✅ | rental_server `rental/rental/api/RentalController.java`, V1 `ux_rental_open_device` | 부분 유니크 인덱스, 동시 생성 10건 중 1건만 성공(통합 테스트) |
| FR-RNT-02 | 출고·수령·반납 순서 | ✅ | rental_server `rental/rental/` (앞 시점 SEALED 아니면 409), 부스 코드 `rental/boothcode/` | 11/9 실서버 세 시점 완주. 11/13 수령·반납은 출고와 같은 검사 방식만(contracts #49) |
| FR-RNT-03 | 기종·치수 관리 | ✅ | rental_server `rental/devicemodel/`, V2 시드 MBA13-M2 | 11/7 결정: 대회까지 기종은 MBA13-M2 하나 |
| FR-RNT-04 | 수령 QR 1회용 링크 | ✅ | auth_server `auth/capture/`, web `features/rentals/components/CaptureLinkPanel.tsx` | 만료·사용된 토큰 410(테스트). QR 하나로 로그인 순간 렌탈 연결(web #91) |
| FR-RNT-05 | 기기 목록·상태 | ✅ | rental_server `rental/device/`, web `features/devices/` | 수리 중·폐기 기기 렌탈 409, 폐기해도 행 유지. 기기별 렌탈 이력(11/6 강사님 피드백, contracts #28) |
| FR-AUTH-01 | 로그인·JWT 15분·리프레시 7일 | ✅ | auth_server `auth/account/api/AuthController.java`, `auth/token/` | 11/10 소셜 로그인(Google·GitHub, 카카오·네이버는 키만) 추가 — 아래 "표 밖 추가 기능" |
| FR-AUTH-02 | 부스·고객·에이전트 자격 교환 | ✅ | auth_server `auth/booth/`, `auth/capture/`, `auth/pairing/` | 페어링 코드는 SHA-256만 저장, 5분·1회용 |
| FR-AUTH-03 | gateway JWT 검증·역할×경로 | ✅ | gateway `access/` + `resources/access-policy.yaml`(계약 `x-trace-access`에서 생성), 테스트 `RoleRouteMatrixIntegrationTest` | 역할×경로 표 전체 칸을 테스트. 가입·인증·재설정 IP 분당 10회, 공개 catalog IP당 300회 |
| FR-USR-01 | 가입·동의 | ✅ | auth_server `auth/account/api/AccountController.java`, web `features/signup/` | |
| FR-USR-02 | QR로 렌탈 계정 연결 | ✅ | auth_server `auth/capture/` exchange → `rental_access` | 다른 계정에 연결된 렌탈 409 |
| FR-USR-03 | 내 렌탈·리포트 | ✅ | rental_server `listRentals`(rentals 클레임), web `features/report/components/MyRentalsPage.tsx`·`ReportPage.tsx` | |
| FR-USR-04 | 탈퇴·익명화 | ✅ | auth_server `AccountController` `DELETE /me`, web `features/account/` | 11/12 소셜 가입자 비밀번호 없는 탈퇴(로그인 10분 안, `REAUTH_REQUIRED`) |
| FR-USR-05 | 이메일 6자리 인증 | ✅ | auth_server `auth/account/application/SignupService.java` | 11/6 실서버 메일 수신 |
| FR-USR-06 | 비밀번호 재설정 | ✅ | auth_server `AccountController` password/* | 계정당 하루 5회(auth_server #10) |
| FR-CAP-01 | 부스 세트 한 번에 촬영(8면) | ✅ | booth `src/trace_booth/`(FULL 28장 booth #47, QUICK 12장), capture_server `capture/captureset/` | 필수 면이 빠지면 409 `CAPTURE_FACES_MISSING`. 운영 기본은 QUICK |
| FR-CAP-02 | 면·조명·카메라·SHA-256 | ✅ | capture_server `capture/captureset/` (완료 때 해시 확인), booth 업로드 | 11/6 jetson2 926장 `shots --verify` 전부 일치 |
| FR-CAP-03 | 폰 가이드·블러·반사 검사 | ✅ | web `features/capture/quality.ts`·`FaceShooter.tsx` | 11/8 web #85로 다시 켬 |
| FR-CAP-04 | 품질 미달 면 판정 불가 | ✅ | capture_server `captureset/domain/Quality.java`, `grade_result.unjudgeable_faces` | |
| FR-CAP-05 | 사전 서명 URL 직접 업로드 | ✅ | capture_server `capture/captureset/` (S3 Presigner), web nginx `/trace-captures/` | gateway를 거치지 않고 web nginx → MinIO |
| FR-INS-01 | 흠집 4종 폴리곤 탐지·mAP 기록 | ✅ | booth 탐지(TensorRT), ml `inspect/yolo_detect.py`, capture_server `inspection/` | 대회 모델 v004 mask mAP50 0.216, 흠집 면 4/4([../contest/metrics/M3.md](../contest/metrics/M3.md)). 실제 데이터에 균열·오염 라벨이 거의 없어 학습은 사실상 dent·scratch |
| FR-INS-02 | 면 펼치기(윤곽 4점 + 특징점 보정) | ◐ | ml `src/trace_ml/inspect/align.py`(CONTOUR), `features.py`(SuperPoint+LightGlue ONNX, 없으면 ORB) | 코드 완료. 실사진 폰↔부스 정합 오차 기록 없음(합성만). QUICK은 정합 안 함 |
| FR-INS-03 | 이전 시점과 신규·기존 판정 | ✅ | capture_server `capture/comparison/`, `inspection/application/GradingService.java` | 표준 좌표 5mm 규칙 `view-match-v1`. 정확도는 가짜 흠집으로 기록(capture_server `specs/002-view-comparison/accuracy.md`) |
| FR-INS-04 | A~D 등급·규칙 버전 | ✅ | capture_server `inspection/domain/GradeRules.java` (grade-rules-v1) | 11/8부터 사람 검수로 확정한 흠집만 등급에 씀 |
| FR-DIA-01~04 | 식별·배터리·SSD·벤치마크 | ✅ | agent `src/trace_agent/`, diagnostics_server `diagnostics/run/` | MacBook Air·갤럭시 북·ASUS ROG 실행, 11/10 Windows 한 줄 설치 실기 |
| FR-DIA-05 | 보여 주고 동의하면 올림 | ✅ | agent `src/trace_agent/report.py`, diagnostics_server `consented_at` | 11/6 실서버 업로드 |
| FR-DIA-06 | 점검 플래그 | ✅ | diagnostics_server `run/domain/FlagRules.java` | 부품 변경·용량 급감·벤치 하락 + 상태 3종 + 보안 2종 |
| FR-RPT-01 | 3D 모델에 9면 사진 | ✅ | web `features/report/components/TwinViewer.tsx`, capture_server `media` | 텍스처는 폰 세트 워커 결과(`trace-derived`)가 있어야 채워짐 |
| FR-RPT-02 | 3D 핀·시점 슬라이더 | ✅ | web `features/report/components/PinList.tsx`·`CheckpointSlider.tsx` | |
| FR-RPT-03 | 타임라인 리포트·비교표 | ✅ | report_server `record/api/ReportController.java`, web `CompareTable.tsx` | 수용 기준 "팀 밖 3명 설명 없이"는 측정 기록 없음 |
| FR-RPT-04 | 진행률 SSE | ✅ | report_server `progress/`, ml `inspect/runner.py`(Redis 발행) | |
| FR-RPT-05 | 기록 검색(선택) | ◐ | contracts `report-server.yaml`, report_server #9 | ADMIN 검색 API(PostgreSQL). Elasticsearch·web 화면 없음 |
| FR-RPT-06 | 3DGS 실물 스캔(실험) | ✗ | 없음 | recon-worker 없음 |
| FR-INT-01 | 해시 체인 | ✅ | report_server `record/` (Ed25519, `record_chain`) | 사진 한 장 바꾸면 검증 실패(변조 탐지 테스트) |
| FR-INT-02 | 리포트에 검증 QR | ✅ | web `features/report/components/VerifyQr.tsx`(web #86), `features/verify/` | 11/8 감사에서 ◐로 잘못 적었던 것 |
| FR-INT-03 | 봉인 영수증 메일 | ✅ | auth_server `auth/receipt/` (`trace.auth.receipts`) | 11/9 실서버 3통 수신 |
| FR-PIL-01 | 파일럿 별칭 등록 | ⏸ | rental_server `rental/pilot/` | API만. web 등록 화면 없음 |
| FR-PIL-02 | 배터리·벤치 추이 대시보드 | ◐ | web `features/benchmark/` (`/admin/benchmark`) | InfluxDB·Grafana 대신 PostgreSQL. 별칭(파일럿) 단위가 아니라 기기 단위 |
| FR-DAT-01 | 촬영 목록 안내·파일명 | ✅ | booth `src/trace_booth/naming.py` | 11/5~6 MacBook Air 15대 학습 촬영에서 사용 |
| FR-DAT-02 | 즉시 업로드·실패 재시도 | ✅ | booth 로컬 큐(`trace-booth retry`) | 11/6 1,047장 전부 UPLOADED, 끊김 재시도 실기 |
| FR-DAT-03 | Label Studio 연동 | ✅ | ml `src/trace_ml/labelstudio/` | 클러스터 대신 집 PC 로컬 Label Studio |
| FR-DAT-04 | 데이터셋 버전(기기 단위 분할) | ✅ | ml `src/trace_ml/dataset/` | 학습 12대·검증 3대(MB04·MB13·MB16) |
| FR-DAT-05 | 학습 결과 기록 | ✅ | ml `src/trace_ml/training/record.py`, `ml.training_run` | |
| FR-OPS-01 | 워커 자동 시작·큐 처리 | ✅ | ml `src/trace_ml/inspect/runner.py`(durable 큐), gitops `compose/`(inspect-worker) | 위치가 집 PC → 학교 서버 CPU 컨테이너로 바뀜 |
| NFR-01 | Jetson 세트 추론 30초 | ◐ | booth 탐지 | 탐지만 실측: v004 FP16 12장 2.53초. 목표 30초·한도 60초(11/5). 촬영~결과 저장 10회 평균·최대는 기록 없음 |
| NFR-02 | 에이전트 읽는 경로 고정 | ✅ | agent `src/trace_agent/commands.py` `ALLOWED` | |
| NFR-03 | 비밀값 Git에 없음·역할별 키 | ◐ | 레포 GitHub Actions gitleaks | gitleaks 통과. 서비스별 계정 분리는 대회 뒤(위 설명) |
| NFR-04 | trace 접두사 | ✅ | Redis `trace:`, MinIO `trace-*`, RabbitMQ vhost `/trace` | |
| NFR-05 | 클러스터 자가 복구 | ◐ | gitops `base/`·`overlays/school` (보관) | 11/3 클러스터 중단. Compose 재시작·자동 되돌리기로 대신 |
| NFR-06 | 로컬 Compose 폴백 | ✅ | gitops `compose/docker-compose.yml` | 폴백이 아니라 지금 실제 배포 |

## 표 밖 추가 기능 (11/6 이후)

요구사항 표(10/30 고정)에 없던 기능입니다. 리뷰·시연 준비 중에 생겨 Spec Kit 명세 없이 PR 본문과 [decisions.md](../decisions.md)에만 남았습니다. 아래 X 번호는 추적용 임시 번호입니다(설계서 원본에는 없음).

| 번호 | 기능 | 왜 넣었나 | 가까운 요구사항 | PR |
| --- | --- | --- | --- | --- |
| X-01 | AI 흠집 후보 사람 검수(확정·기각, 놓친 흠집 직접 추가) | 증강 모델이 먼지·테이프 반사를 흠집으로 잡음 → AI 단독 청구를 막음(11/8) | FR-INS-04 | contracts #32·#36, capture_server #19·#24, gateway #12·#15, web #87 |
| X-02 | CAM1·CAM2에 같이 찍힌 흠집 하나로 세기 | 같은 흠집이 두 번 세어져 등급이 올라감(11/9) | FR-INS-04 | capture_server #25, contracts #37 |
| X-03 | 검수 결과 재학습 파이프라인(누적 → 게이트 → 레지스트리 → 서버·Jetson 동시 교체) | 11/9 강사님 요청 | FR-DAT-04·05 | ml #28·#33·#36·#37 |
| X-04 | 공개 보유 노트북 목록·3D 흠집 상세(로그인 없음) | 고객이 빌리기 전에 상태를 봄(11/8 민서) | FR-RNT-05, FR-DIA-06 | contracts #33, rental_server #19, capture_server #22, diagnostics_server #12, gateway #14, web #95 |
| X-05 | 반납 정산서 | 반납 때 신규 흠집으로 무엇을 청구할지 근거(11/10) | FR-INS-03·04 | contracts #41, capture_server #26, gateway #18, web #120 |
| X-06 | 소셜 로그인과 소셜 가입자 탈퇴 | 가입 장벽 낮추기(11/10 민서) | FR-AUTH-01, FR-USR-01·04 | contracts #38·#45, auth_server #11·#12·#15, gateway #16, web #110·#132, gitops #21 |
| X-07 | 사이트 도우미 챗봇(Gemini → 한도 넘으면 Ollama) | 처음 온 사람 안내(11/10) | — | chat-server #1~#5, contracts #39, gateway #17, gitops #22~#24, web #115·#116 |
| X-08 | 사용자용 읽기 전용 MCP 서버 `trace-mcp` | AI 도구에서 내 렌탈 조회(11/10) | FR-USR-03 | agent #13 |
| X-09 | 진단 에이전트 한 줄 설치·보안 상태 점검 | 파이썬 없는 맥에서도 실행(11/9), 보안 프로그램 상태(11/12) | FR-DIA-01~06 | agent #8~#12·#14·#15·#17, web #100·#125·#145, contracts #46, diagnostics_server #16 |
| X-10 | 봉인 전 시점의 진단 다시 하기 | 충전기 없이 찍힌 진단을 다시(11/13) | FR-DIA-05 | contracts #48, diagnostics_server #18, gateway #22, web #146 |
| X-11 | 관리자 기능(문제 검사만 보기·고객 이름·반납 예정일·메모, 시험 데이터 지우기) | C 요청·시연 정리(11/4·11/10) | FR-RNT-01·05 | contracts #23·#25·#40·#43, rental_server #14·#20·#24, web #117·#121·#123 |
| X-12 | 학교 서버 자동 배포·무중단 교체·자동 되돌리기·야간 백업 | 클러스터 없이 NFR-05의 뜻(스스로 복구)을 살림(11/10~12) | NFR-05·06 | gitops #25·#27 |

## 기능(백로그 27개) ↔ 요구사항 ↔ 명세

설계서 요구사항 → [../speckit/backlog.md](../speckit/backlog.md) 기능 → 레포 `specs/<번호>-<이름>/`(spec·plan·tasks) → PR 순서로 이어집니다. 기능별 상태·PR은 [../team/board.md](../team/board.md).

| 기능 | 요구사항 | 명세 폴더 |
| --- | --- | --- |
| C1·C2·C3 | API 전체, FR-DIA-01~05, 이벤트 | contracts `specs/001-openapi-contracts`·`002-diagnostics-json-schema`·`003-event-schemas` (+004~006 추가분) |
| AU1·AU2·AU3 | FR-AUTH-01·02, FR-USR-01·04·05·06, FR-RNT-04, FR-USR-02, FR-INT-03 | auth_server `specs/001-login-jwt-credentials`·`002-account-signup`·`003-seal-receipt` |
| GW1 | FR-AUTH-03 | gateway `specs/001-gw1-jwt-access` |
| RE1·RE2 | FR-RNT-01·02·03·05, FR-PIL-01 | rental_server `specs/001-rental-device-checkpoint`(+002)·`003-pilot-participant` |
| CA1·CA2 | FR-CAP-02·05, FR-INS-03·04, FR-CAP-04 | capture_server `specs/001-capture-sets`·`002-view-comparison`·`003-inspection-grading` (+004 QUICK·005 벤치마크) |
| DI1·DI2 | FR-DIA-01~06, FR-PIL-02(데이터) | diagnostics_server `specs/001-diagnostics-upload`·`003-inspection-flags` |
| RP1·RP2 | FR-INT-01·02, FR-RPT-04 | report_server `specs/001-timeline-seal-chain` (RP2 SSE는 따로 명세 없음, report_server #3 PR 본문) |
| WE1~WE4 | 화면 전체 | web `specs/001-admin-rental-screens`·`002-phone-receipt-capture`·`003-customer-report`·`003-pilot-trend-dashboard`·`004-public-verify-page`·`006-admin-inspection-results` |
| BO1·BO2 | FR-CAP-01·02, FR-DAT-01·02, FR-INS-01, NFR-01 | booth `specs/001-booth-capture-tool`·`002-jetson-detection`·`003-quick-inspection` |
| AG1·AG2 | FR-DIA-01~05, NFR-02 | agent `specs/001-macos-diagnostics`·`002-windows-diagnostics` |
| ML1·ML2·ML3 | FR-DAT-03·04·05, FR-INS-01·02, FR-OPS-01 | ml `specs/001-labelstudio-sync`·`002-dataset-builder`·`003-inspect-worker` |
| G1 | NFR-05·06 | gitops `specs/001-local-compose` |

추적에서 빈 곳(리뷰 때 먼저 말할 것):

- 명세 번호가 비거나 겹침: web `003-*` 두 개, web `005` 없음, diagnostics_server `002` 없음. 기능 하나에 명세를 여러 번 만들다 생긴 것으로 내용 누락은 아닙니다.
- 11/8 이후 추가 기능(X-01~X-12)은 Spec Kit 명세가 없습니다. 근거는 PR 본문·decisions.md·계약 변경입니다.
- 구현현황 시트(Google 시트)는 거의 모든 행이 TRUE입니다. 이 문서와 다른 행: 'Web 파일럿 추이 대시보드'(시트 TRUE, Grafana는 하지 않았으므로 이 문서는 FR-PIL-02 ◐), '클러스터 비밀·PostgreSQL StatefulSet'(시트 FALSE '제외', 이 문서는 NFR-03·05 ◐). 시트는 "그 세부 기능이 돌아가는가", 이 문서는 "요구사항의 수용 기준을 확인했는가"를 봅니다.
