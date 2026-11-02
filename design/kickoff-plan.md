# TRACE 착수 준비 — 요구사항·ERD·아키텍처

Oct 30, 2026 · @민서

## 결론과 오늘 목표

오늘(10/30)은 요구사항 v1을 확정하고, 그 요구사항에서 ERD v1과 아키텍처 v1을 뽑는 날입니다. 코드는 계약이 정해지는 내일부터 씁니다.

- **인프라:** 학교 서버에 이미 떠 있는 PostgreSQL·MinIO·Redis·Elasticsearch·InfluxDB를 그대로 씁니다. 쿠버네티스에는 우리 앱만 올립니다(Rancher·Argo CD).
- **네트워크:** 학교 서버는 외부망에서 접근됩니다. 촬영 업로드와 집 PC 학습이 서버 저장소에 바로 붙습니다.
- **빠지는 일:** 이전 계획의 k3s 설치와 인프라 Helm 차트(W09)는 없어집니다. 그 자리에 승인된 공유 인프라 계정과 격리 규칙이 들어옵니다.
- **일정:** 다시 짰습니다. 주말에는 대여가 어려워, 본 촬영은 11/2(월) 오후 맥북, 11/4(수) 9\~15시 LG 그램입니다(예약 완료).
- **부스 (11/1 결정):** 출고·반납·데이터 촬영을 부스 1개로 합니다. 만드는 법과 11/2 진행 순서는 [booth/README.md](../booth/README.md)에 있습니다.

오늘 끝낼 산출물은 네 가지입니다: 요구사항표 v1, ERD v1, 아키텍처 구성도 v1, 인프라 관리자 요청서.

## 바뀐 전제 (10/30 강사님 피드백)

가장 큰 변화는 "인프라를 만드는 팀"에서 "있는 인프라에 붙는 팀"으로 바뀐 것입니다. 시간이 줄어드는 대신, 계정·격리·키 관리가 새로 중요해집니다.

| 항목 | 이전 계획 | 바뀐 것 | 영향 |
| --- | --- | --- | --- |
| 인프라 | k3s에 Helm으로 인프라 6종 직접 설치 | 학교 서버의 기존 인프라 사용, 클러스터 안에 인프라 이미지 금지 | W09 삭제. 계정·접속 정보 요청으로 대체 |
| 클러스터 | 학교 서버에 k3s 직접 설치 | Rancher·Argo CD로 배포, 팀 포트 사용 | 네임스페이스·Argo CD·포트 모두 승인됨 (10/30) |
| 네트워크 | 학교망 밖에서 접근 불가 가정 | 외부망 접근 가능 | Tailscale 불필요. 대신 키가 밖에 노출되므로 역할별 최소 권한·TLS 확인 |
| 데이터 흐름 | 팀 드라이브에 올렸다가 나중에 MinIO | 촬영 즉시 MinIO, 집 PC가 꺼내 학습 | 촬영 도구가 업로드까지 맡음 |
| 라벨링 도구 | Roboflow | Label Studio (DB는 공유 PostgreSQL, 파일은 공유 MinIO) | Roboflow 무료 플랜은 데이터가 공개됨 ([가격 정책](https://roboflow.com/pricing)) |
| MinIO 이미지 | 공식 이미지 배포 중단 문제 | 서버에 이미 떠 있어 해당 없음 | 코드는 S3 API만 쓴다는 규칙은 유지 |
| 일정 | 다른 세션이 짠 임의 일정 | 주말을 반영해 재작성 | 아래 수정 일정 참고 |
| 발표장 폴백 | 앱만 Compose로 | 인프라까지 로컬 Compose 필요 | 발표장에서 학교 서버에 못 닿을 때를 대비 |

공유 인프라는 다른 팀과 함께 쓴다고 보고, 우리 자원에는 모두 `trace` 접두사를 붙입니다.

## 오늘 진행 순서

요구사항 → ERD → 아키텍처 순서를 지킵니다. 요구사항 없이 그린 테이블은 기능과 연결이 없어서, 나중에 거의 다 바뀝니다. 시간은 제안이고, 세 명이 같이 합니다.

1. **요구사항 v1 (약 2시간):** 아래 초안 v0를 읽고 빼기·더하기·우선순위를 정합니다. 항목마다 수용 기준을 한 줄 넣습니다.
   - 완료 기준: MVP "포함" 항목이 전부 요구사항 하나 이상에 대응한다.
2. **ERD v1 (약 2시간):** 서비스별 스키마 경계를 먼저 정하고, 테이블은 그다음에 그립니다. 테이블마다 근거 요구사항 ID를 달아요.
   - 완료 기준: 모든 테이블이 요구사항에 연결되고, 서비스 사이에 FK가 없다.
   - Crowfoot에 요구사항을 도메인별로 올리면, 테이블과 요구사항이 바로 이어집니다.
3. **아키텍처 v1 (약 1시간 30분):** 배포 구성도, 서비스 간 호출·이벤트, 공유 인프라 연결표, 네임스페이스·포트를 정합니다.
   - 완료 기준: 배포 단위마다 무엇을 읽고 쓰는지 표 한 장으로 나온다.
4. **접속 정보 받기:** 인프라는 모두 승인됐습니다. 연결표의 자원 이름대로 접속 정보를 받아 Rancher Secret에 넣습니다.
5. **강사님 확인:** 요구사항·ERD·아키텍처를 보여 드리고 확정받습니다.
6. **남는 시간:** 이벤트 5종·진단 JSON·코드 사전 계약 초안을 시작합니다 (마감 10/31).

## 요구사항 초안 v0

초안은 41개(필수 38 · 실험 1 · 선택 2)입니다. 기존 MVP의 "포함" 항목과 학습 데이터 파이프라인을 요구사항으로 옮긴 것이라, 오늘 회의에서 빼고 더하는 출발점으로 씁니다.

| ID | 도메인 | 요구사항 | 수용 기준 | 우선 |
| --- | --- | --- | --- | --- |
| FR-RNT-01 | 렌탈·기기 | 렌탈 건을 만들고 기기(시리얼)를 연결한다 | 같은 시리얼로 진행 중인 렌탈이 2건 생기지 않는다 | 필수 |
| FR-RNT-02 | 렌탈·기기 | 렌탈 건은 출고·수령·반납 세 시점을 순서대로 가진다 | 출고 전에 수령 기록을 만들면 거부된다 | 필수 |
| FR-RNT-03 | 렌탈·기기 | 기종 정보(치수 포함)를 관리한다 | 모델명으로 3D 트윈 치수를 조회한다 | 필수 |
| FR-RNT-04 | 렌탈·기기 | 고객 수령 촬영용 1회용 링크(QR)를 발급한다 | 만료된 링크로는 업로드되지 않는다 | 필수 |
| FR-CAP-01 | 촬영 | 부스는 자세별 면·조명 세트를 버튼 한 번에 찍어 올린다 | 한 세트에서 필수 8면 중 빠진 면이 0개다(SCR1은 선택, 건너뛰면 사유) | 필수 |
| FR-CAP-02 | 촬영 | 모든 사진에 면·조명·카메라 코드와 SHA-256을 남긴다 | 내려받은 파일 해시와 저장된 해시가 같다 | 필수 |
| FR-CAP-03 | 촬영 | 폰 웹앱은 면마다 윤곽 가이드를 띄우고 블러·반사를 검사한다 | 불량 사진은 재촬영 전까지 제출되지 않는다 | 필수 |
| FR-CAP-04 | 촬영 | 품질 미달 면은 "판정 불가"로 두고 비교에서 뺀다 | 판정 불가 면은 등급 계산에 쓰이지 않는다 | 필수 |
| FR-CAP-05 | 촬영 | 사진은 게이트웨이를 거치지 않고 저장소에 직접 올린다(사전 서명 URL) | 게이트웨이 트래픽에 사진 본문이 없다 | 필수 |
| FR-INS-01 | 검사 | 흠집 4종(긁힘·찍힘·균열·오염)을 폴리곤으로 탐지한다 | 테스트 맥북 2대의 mAP를 기록한다 | 필수 |
| FR-INS-02 | 검사 | 면을 표준 좌표로 펼친다(윤곽 4점 + 특징점 보정) | 폰과 부스 사이 정합 오차를 기록한다 | 필수 |
| FR-INS-03 | 검사 | 이전 시점 흠집과 비교해 신규·기존을 판정한다 | 테스트 흠집의 판정 정확도를 기록한다 | 필수 |
| FR-INS-04 | 검사 | 외관으로 A\~D 등급을 매긴다(오염 제외) | 결과에 등급 규칙 버전이 남는다 | 필수 |
| FR-INS-05 | 검사 | 사람이 탐지 결과를 고치거나 핀을 추가한다 | 수정한 사람과 시각이 남는다 | 선택 |
| FR-DIA-01 | 내부 진단 | 기기 식별·부품 구성을 읽는다(macOS·Windows) | 팀 노트북 3대의 JSON이 저장된다 | 필수 |
| FR-DIA-02 | 내부 진단 | 배터리 사이클·설계 용량·완충 용량·최대 용량을 읽는다 | OS 배터리 리포트 값과 같다 | 필수 |
| FR-DIA-03 | 내부 진단 | SSD 상태를 읽는다(권한이 없으면 생략) | 생략하면 사유가 결과에 남는다 | 필수 |
| FR-DIA-04 | 내부 진단 | 고정 벤치마크를 3회 돌려 중앙값과 측정 조건을 남긴다 | 같은 기기 3회 측정 편차를 기록한다 | 필수 |
| FR-DIA-05 | 내부 진단 | 결과를 먼저 보여 주고 동의하면 올린다 | 동의 없이는 전송되지 않는다 | 필수 |
| FR-DIA-06 | 내부 진단 | 시점 간 비교로 점검 플래그(부품 변경·용량 급감·벤치 하락)를 붙인다 | 임계값은 파일럿 1차 측정 편차로 정한다 | 필수 |
| FR-RPT-01 | 리포트·3D | 기종 3D 모델에 9면 사진을 입혀 웹에서 돌려 본다 | 팀 노트북이 웹에서 3D로 돈다 | 필수 |
| FR-RPT-02 | 리포트·3D | 흠집을 3D 핀으로 찍고 시점 슬라이더로 바꿔 본다 | 슬라이더를 옮기면 신규 핀이 구분돼 보인다 | 필수 |
| FR-RPT-03 | 리포트·3D | 타임라인 리포트에 핀·크롭·등급·내부 상태 비교표를 보여 준다 | 팀 밖 3명이 설명 없이 신규 흠집과 배터리 변화를 말한다 | 필수 |
| FR-RPT-04 | 리포트·3D | 검사 진행률을 실시간으로 보여 준다(SSE) | 새로고침 없이 진행률이 바뀐다 | 필수 |
| FR-RPT-05 | 리포트·3D | 시리얼·흠집 종류·플래그로 기록을 검색한다(Elasticsearch) | 검색 결과가 DB 원본과 같다 | 선택 |
| FR-RPT-06 | 리포트·3D | 3DGS 실물 스캔을 출고 기록에 붙인다 | W06 실험을 통과했을 때만 만든다 | 실험 |
| FR-INT-01 | 무결성 | 사진·진단 JSON 해시를 이전 기록 해시에 잇는다(해시 체인) | 사진 한 장을 바꾸면 검증이 실패한다 | 필수 |
| FR-INT-02 | 무결성 | 리포트에 검증 QR을 붙인다 | QR로 검증 결과 페이지가 열린다 | 필수 |
| FR-PIL-01 | 파일럿 | 참여자 동의와 기기를 별칭으로 등록한다 | 실명과 측정값이 같은 테이블에 없다 | 필수 |
| FR-PIL-02 | 파일럿 | 대당 배터리·벤치마크 추이를 대시보드로 본다(InfluxDB·Grafana) | 두 번 측정한 값이 한 화면에 나온다 | 필수 |
| FR-DAT-01 | 학습 데이터 | 촬영 도구는 촬영 목록 순서를 안내하고 파일명을 자동으로 만든다 | 파일명 규칙 위반 0건, 장수가 목록과 같다 | 필수 |
| FR-DAT-02 | 학습 데이터 | 촬영 즉시 저장소에 올리고, 실패하면 로컬에 두었다가 재시도한다 | 네트워크가 끊겼다 돌아와도 누락 0건 | 필수 |
| FR-DAT-03 | 학습 데이터 | Label Studio는 저장소 원본을 작업으로 가져오고 주석을 저장소에 쓴다 | 새 사진이 동기화 한 번에 작업으로 뜬다 | 필수 |
| FR-DAT-04 | 학습 데이터 | 빌더는 제출된 주석만으로, 기기 단위로 나눠 데이터셋 버전을 만든다 | 한 기기가 두 분할에 동시에 없고, 같은 버전은 덮어쓸 수 없다 | 필수 |
| FR-DAT-05 | 학습 데이터 | 학습 결과(가중치·ONNX·지표)를 데이터셋 버전과 함께 저장한다 | 모델마다 학습 데이터 버전을 추적할 수 있다 | 필수 |
| NFR-01 | 비기능 | 부스 한 세트 추론을 Jetson에서 \[N\]초 안에 끝낸다 | Jetson 실측값을 기록한다 | 필수 |
| NFR-02 | 비기능 | 진단 에이전트는 사용자 파일·브라우저 기록을 읽지 않는다 | 읽는 경로 목록을 고정하고 리뷰한다 | 필수 |
| NFR-03 | 비기능 | 공유 인프라 계정은 팀 전용·최소 권한이고, 비밀 값은 Git에 없다 | gitleaks 통과, 역할별 키 분리 | 필수 |
| NFR-04 | 비기능 | 공유 인프라의 우리 자원은 모두 trace 접두사로 격리한다 | 다른 팀 자원을 읽거나 쓰지 않는다 | 필수 |
| NFR-05 | 비기능 | 클러스터에는 앱만 배포하고, 파드가 죽으면 스스로 복구된다 | 파드를 지워도 자동으로 다시 뜬다 | 필수 |
| NFR-06 | 비기능 | 학교 서버에 못 닿으면 로컬 Compose로 데모한다 | 폴백으로 세 시점 흐름이 동작한다 | 필수 |

우선 열은 드롭다운이라 회의 중에 바로 바꿀 수 있습니다. 확정되면 같은 도메인 이름으로 Crowfoot에 올립니다.

## ERD 설계 입력

공유 PostgreSQL에 `trace` DB 하나를 두고, 서비스마다 스키마 하나를 가집니다. 테이블 24개 초안이고, 회의에서 요구사항이 확정되면 여기서 더하고 뺅니다.

| 스키마 (소유) | 테이블 | 핵심 컬럼 | 관계 | 근거 |
| --- | --- | --- | --- | --- |
| rental (rental-service) | device\_model | model\_code, name, width\_mm, depth\_mm, base\_h\_mm, lid\_h\_mm | 1:N device | FR-RNT-03 |
| rental | device | serial, model\_code, os, color, asset\_no | N:1 device\_model | FR-RNT-01 |
| rental | rental | device\_id, renter\_ref, status, started\_at, ended\_at | N:1 device | FR-RNT-01 |
| rental | checkpoint | rental\_id, type(OUT·RCV·RET), status, occurred\_at | N:1 rental, (rental\_id, type) 유일 | FR-RNT-02 |
| rental | capture\_link | checkpoint\_id, token, expires\_at, used\_at | N:1 checkpoint | FR-RNT-04 |
| rental | pilot\_participant | alias, consent\_at, device\_id | N:1 device, 실명은 별도 보관 | FR-PIL-01 |
| capture (capture-service) | capture\_set | checkpoint\_id, source(BOOTH·PHONE), booth\_id, status, quality(OK·UNJUDGEABLE) | 1:N photo | FR-CAP-01, 04 |
| capture | photo | capture\_set\_id, face, light, camera, object\_key, sha256, blur\_score, taken\_at | N:1 capture\_set | FR-CAP-02, 03 |
| inspection (capture-service) | face\_alignment | photo\_id, method(CONTOUR·LIGHTGLUE), homography, error\_px, rectified\_key | 1:1 photo | FR-INS-02 |
| inspection | defect | photo\_id, class, polygon(표준 좌표), length\_mm, area\_mm2, confidence, model\_version, source(AUTO·HUMAN) | N:1 photo | FR-INS-01, 05 |
| inspection | defect\_match | defect\_id, prev\_defect\_id(없으면 신규), status(NEW·EXISTING), distance\_mm | N:1 defect, 자기 참조 | FR-INS-03 |
| inspection | grade\_result | checkpoint\_id, grade(A\~D), rule\_version, reasons | checkpoint당 1 | FR-INS-04 |
| diagnostics (diagnostics-service) | diagnostic\_run | checkpoint\_id, device\_serial, os, agent\_version, conditions, raw\_object\_key, sha256, consented\_at | 1:N 아래 4개 | FR-DIA-05 |
| diagnostics | hardware\_component | run\_id, kind(CPU·RAM·SSD·BATTERY …), identifier, detail | N:1 diagnostic\_run | FR-DIA-01 |
| diagnostics | battery\_reading | run\_id, cycle\_count, design\_mah, full\_charge\_mah, max\_capacity\_pct, condition | 1:1 diagnostic\_run | FR-DIA-02 |
| diagnostics | ssd\_health | run\_id, percent\_used, power\_on\_hours, media\_errors, skipped\_reason | 1:1 diagnostic\_run | FR-DIA-03 |
| diagnostics | benchmark\_result | run\_id, metric, trial\_values, median | N:1 diagnostic\_run | FR-DIA-04 |
| diagnostics | inspection\_flag | checkpoint\_id, kind(COMPONENT\_CHANGED·CAPACITY\_DROP·BENCH\_DROP), detail | checkpoint당 N | FR-DIA-06 |
| report (report-service) | record\_chain | checkpoint\_id, seq, payload\_hash, prev\_hash, signed\_at, signature | 자기 참조(prev\_hash) | FR-INT-01 |
| report | report | rental\_id, verify\_token, created\_at | rental당 1 | FR-INT-02, FR-RPT-03 |
| report | report\_view | rental\_id, timeline(JSON), updated\_at | 이벤트로 만드는 읽기 모델 | FR-RPT-03 |
| ml (데이터 도구) | dataset\_device | device\_code(G01 …), model\_name, color, split(TRAIN·VAL·TEST) | 기기 단위 분할 고정 | FR-DAT-04 |
| ml | dataset\_version | version, manifest\_key, built\_at, builder\_commit, counts | 1:N training\_run | FR-DAT-04 |
| ml | training\_run | dataset\_version, base\_weights, metrics, model\_key, onnx\_key | N:1 dataset\_version | FR-DAT-05 |

설계 규칙

- **서비스 간 FK 금지:** capture\_set.checkpoint\_id는 rental의 ID를 값으로만 들고, 정합성은 이벤트로 맞춥니다. FK는 같은 스키마 안에서만 씁니다.
- **공통 컬럼:** 모든 테이블에 id(UUIDv7)·created\_at·updated\_at를 둡니다. Crowfoot에는 문서 전체 공통 요구사항으로 올립니다.
- **파일은 키만:** 사진·3D 텍스처·진단 원본 JSON은 MinIO에 두고, DB에는 object\_key와 sha256만 남깁니다.
- **추이는 InfluxDB에도:** 배터리·벤치마크 원본은 PostgreSQL이고, 대시보드용 시계열은 InfluxDB `trace-pilot` 버킷에 따로 씁니다.
- **검색은 복사본:** Elasticsearch 인덱스는 report-service가 이벤트로 채우는 복사본이고, 원본은 항상 PostgreSQL입니다.
- **Label Studio는 설계 대상 밖:** 자기 DB(`labelstudio`)를 쓰고, 우리는 그 결과를 MinIO에서만 읽습니다.

## 아키텍처: 공유 인프라 위에 앱만 올리기

클러스터의 `trace` 네임스페이스에는 앱 7개만 올라가고, 데이터는 전부 학교 서버의 공유 인프라에 둡니다. 밖으로 여는 포트는 게이트웨이·웹·Label Studio 3개뿐입니다.

&#91;embedded content: TRACE 배포 구성 · 클러스터 앱 7개, 공유 인프라 6종\]

왼쪽 기기들은 API 요청을 gateway로, 사진·데이터셋은 MinIO로 바로 보냅니다. 클러스터 안 앱은 고정 Service 이름으로만 공유 인프라에 붙고, 집 PC의 inspect-worker·recon-worker는 RabbitMQ와 MinIO에 직접 붙습니다.

배포 단위

| 배포 단위 | 위치 | 하는 일 | 쓰는 인프라 |
| --- | --- | --- | --- |
| gateway | 클러스터 (외부 포트) | 인증·라우팅 | Redis |
| rental-service | 클러스터 | 렌탈·기기·시점·수령 링크 | PostgreSQL rental |
| capture-service | 클러스터 | 촬영 세트, 사전 서명 URL 발급, 검사 결과 저장 | PostgreSQL capture·inspection, MinIO, Redis |
| diagnostics-service | 클러스터 | 진단 검증·전후 비교·점검 플래그 | PostgreSQL diagnostics, InfluxDB |
| report-service | 클러스터 | 타임라인·해시 체인·검증 QR·SSE | PostgreSQL report, Redis, Elasticsearch |
| inspect-worker | 집 PC (4070 Ti) | 폰 사진 탐지, 면 정합, 3D 텍스처 | MinIO, 메시지 큐 |
| web | 클러스터 (외부 포트) | 리포트·3D 트윈·폰 웹앱 | 없음 |
| label-studio | 클러스터 (외부 포트) | 학습 데이터 라벨링 | PostgreSQL labelstudio, MinIO |
| recon-worker | 집 PC (4070 Ti) | 3DGS 학습 | MinIO, 메시지 큐 |
| 부스 × 1 | Jetson | 촬영 제어·조명 전환·TensorRT 탐지 | gateway, MinIO(사전 서명 URL) |
| 진단 에이전트 | 렌탈 노트북 | 배터리·부품·SSD·벤치마크 측정 | gateway |

공유 인프라 연결표 (10/30 모두 승인)

| 인프라 | 우리 자원 | 쓰는 곳 | 승인된 것 |
| --- | --- | --- | --- |
| PostgreSQL | DB `trace`(스키마 rental·capture·inspection·diagnostics·report·ml), DB `labelstudio` | 서비스 4개, 데이터 도구, Label Studio | DB 2개와 소유자 계정 1개. 스키마별 사용자를 만들 권한(안 되면 서비스별 계정) |
| MinIO | 서비스용 `trace-captures`·`trace-derived`, 학습용 `trace-raw`·`trace-labels`·`trace-datasets`·`trace-models` | capture·inspect·report, 촬영 도구, Label Studio, 집 PC, Jetson | 버킷 6개(또는 생성 권한), 역할별 키를 만들 권한, HTTPS 여부 |
| Redis | 키 접두사 `trace:` (가능하면 전용 DB 번호) | gateway, capture, report | ACL 계정 또는 DB 번호 |
| Elasticsearch | 인덱스 `trace-records-*` | report | 인덱스 접두사 권한 계정 (선택 기능) |
| InfluxDB | 버킷 `trace-pilot` | diagnostics(쓰기), Grafana(읽기) | 버킷, 쓰기 토큰과 읽기 토큰 |
| 메시지 큐 | RabbitMQ vhost `/trace` | 서비스 4개, 워커 2개 | vhost 발급 |

배포 규칙

- **고정 이름으로 붙기:** 네임스페이스에 인프라마다 셀렉터 없는 Service를 둡니다(도메인이면 ExternalName, IP면 EndpointSlice). 앱은 `postgres.trace.svc` 같은 이름만 알고, 폴백 Compose로 옮겨도 코드가 그대로입니다.
- **비밀은 Git 밖:** 접속 주소는 ConfigMap, 비밀번호·키는 Rancher에서 만든 Secret에 둡니다. 매니페스트에는 Secret 이름만 들어갑니다.
- **인프라 매니페스트 금지:** `deploy/`에 DB·저장소·캐시의 Deployment나 StatefulSet을 넣지 않습니다.
- **Argo CD 앱 하나:** Application 하나가 gitops 레포의 `overlays/school`(Kustomize)을 바라봅니다. 인프라 차트가 없으니 Helm보다 Kustomize가 단순합니다.
- **이미지:** GitHub Actions가 GHCR에 올립니다. 비공개 레포면 클러스터에 imagePullSecret이 필요합니다.
- **큰 파일은 직접 업로드:** capture-service가 사전 서명 URL을 주고, 부스·폰·촬영 도구는 MinIO에 바로 올립니다.

## 학습 데이터 파이프라인 (강사님 안)

촬영 도구가 찍는 즉시 학교 MinIO에 올리고, Label Studio가 그 사진을 작업으로 가져옵니다. 집 PC는 버전이 매겨진 데이터셋만 꺼내 학습하므로, 사람이 사진 파일을 옮기는 단계가 없습니다.

&#91;embedded content: 학습 데이터 흐름 · 도구 5개, MinIO 버킷 4개\]

왼쪽으로 도는 화살표는 2차 라벨링 때 1차 모델이 Label Studio에서 흠집을 미리 표시하는 경로입니다.

단계별 규칙

- **촬영 도구 = 부스 촬영 스크립트 v0:** W11을 앞당겨 같은 코드로 만듭니다. 촬영 목록 순서 안내, 블러·노출 검사, 파일명 `{기기ID}_{면}_{조명}_{카메라}_{번호}.jpg` 자동 생성, SHA-256, 실패 시 로컬 보관 후 재시도까지 맡습니다.
- **폰 9장:** 같은 도구의 가져오기 명령으로 같은 규칙을 적용합니다. 폰 웹앱(W12)이 되면 그걸로 바꿉니다.
- **Label Studio:** S3 소스는 `trace-raw`, 타깃은 `trace-labels`입니다. "Use pre-signed URLs"를 끄면 Label Studio가 이미지를 대신 전달해 CORS 문제가 없습니다 ([1.19 릴리스 노트](https://labelstud.io/blog/label-studio-1-19-majorcloud-storage-updates-coco-yolo-exports-and-more-community-driven-fixes)).
- **클러스터 전에도 됨:** Label Studio는 노트북 Docker로 먼저 띄워도 됩니다. 상태가 공유 PostgreSQL·MinIO에 있어서, 나중에 클러스터로 옮겨도 그대로 이어집니다.
- **음성 샘플:** "흠집 없음"을 체크하고 제출한 사진만 음성입니다. 체크도 폴리곤도 없는 제출은 빌더가 오류로 막습니다.
- **SAM 주의:** SAM 연동 결과는 브러시(RLE)로 저장돼 COCO·YOLO로 내보내지지 않습니다 ([커뮤니티 답변](https://community.labelstud.io/t/export-in-yolo-format-after-sam-annotation/426)). 쓰려면 빌더에 마스크를 폴리곤으로 바꾸는 단계를 넣고, 11/1 드라이런에서 10장씩 둘 다 해 보고 정합니다.
- **분할:** 기기 단위 분할은 `ml.dataset_device`에 고정합니다. 테스트 기기는 라벨 기준이 정해진 뒤 손대지 않습니다.
- **데이터셋 버전:** v001, v002는 덮어쓰지 않고, manifest에 파일 해시·클래스 수·빌더 커밋을 남깁니다.
- **엔진은 Jetson에서:** TensorRT 엔진은 만든 장치에서만 돌아갑니다 ([Ultralytics](https://academy.ultralytics.com/courses/train-your-first-yolo/export-for-deployment)). 집 PC는 `.pt`·`.onnx`까지 올리고, Jetson이 받아 직접 빌드합니다.

역할별 키 (외부망에 열려 있어서, 기기마다 자기 키만 둡니다)

| 키 | 쓰기 | 읽기 | 두는 곳 |
| --- | --- | --- | --- |
| capture | `trace-raw` (삭제 권한 없음) | 없음 | 촬영 노트북·Jetson |
| labelstudio | `trace-labels` | `trace-raw` | Label Studio |
| trainer | `trace-datasets`, `trace-models` | `trace-raw`, `trace-labels` | 집 PC (빌더 격용) |
| jetson | 없음 | `trace-models` | Jetson × 1 (부스) |

`trace-raw`는 버전 관리를 켜서, 실수로 덮어써도 원본이 남게 합니다.

## 팀 규칙

규칙은 문서가 아니라 설정 파일과 CI가 강제합니다. 세 명의 클로드 세션이 같은 코드를 내려면, 사람이 읽는 규칙과 기계가 검사하는 규칙이 같아야 합니다.

| 영역 | 규칙 |
| --- | --- |
| 포맷·린트 | Java는 Spotless + google-java-format, Python은 uv + ruff(format·check), Web은 ESLint + Prettier. 공통 .editorconfig와 pre-commit |
| 계약 | JSON 필드는 camelCase(Python은 Pydantic 별칭), 시간은 ISO 8601 + 오프셋, ID는 UUIDv7, REST 오류는 RFC 9457 Problem Details, 메시지마다 schemaVersion |
| 코드 사전 | 면·조명·카메라·클래스·등급·시점 코드는 `contracts/codes.yaml` 한 곳에서만 정의 |
| 인프라 접근 | 저장소는 S3 API(boto3·AWS SDK)로만, 인프라 주소는 환경 변수로만 |
| Git | main 보호, squash merge, 브랜치 `feat/W21-face-rectify`, Conventional Commits, `contracts/` 변경은 CODEOWNERS로 3명 승인 |
| 비밀 값 | `.env.example`만 커밋, gitleaks, 실제 값은 Rancher Secret |
| 완료 정의 | 완료 조건을 재현하는 명령을 PR에 적고, 테스트·SonarQube·계약 테스트를 통과하고, 리뷰 1명 |
| 작업 보드 | 작업을 GitHub Issues + Projects로 관리, 라벨은 작업 묶음, 담당은 A·B·C |

루트 `CLAUDE.md` 뼈대입니다. 같은 내용을 Spec Kit constitution에도 넣어, spec·plan 단계부터 적용되게 합니다.

```markdown
# TRACE 공통 작업 규칙

## 먼저 읽을 것
- contracts/codes.yaml: 코드 사전. 여기 없는 값을 새로 만들지 않는다
- contracts/events/, contracts/diagnostics.schema.json: 서비스 간 계약
- docs/adr/: 이미 내린 결정. 뒤집지 않는다

## 금지
- deploy/에 PostgreSQL·MinIO·Redis·Elasticsearch·InfluxDB 같은 인프라의 Deployment·StatefulSet을 추가하지 않는다. 인프라는 학교 서버 공유 자원이다
- contracts/를 고쳐야 하면 코드를 고치지 말고 멈춘 뒤 사람에게 알린다
- 비밀 값·실제 사진·자산 번호를 코드나 테스트 데이터에 넣지 않는다

## 범위
- 이 세션은 자기 모듈 폴더만 고친다
- 저장소는 S3 API로만, 인프라 주소는 환경 변수로만 쓴다

## 명령
- Java: ./gradlew spotlessApply test
- Python: uv run ruff format && uv run ruff check && uv run pytest
- Web: pnpm lint && pnpm test
```

## 확인·요청할 것

인프라 관리자 항목 5개는 10/30에 모두 승인됐습니다. 남은 것은 강사님·대여·외부 데이터·파일럿·대회 쪽 확인입니다.

| 대상 | 무엇 | 왜 | 기한 | 상태 |
| --- | --- | --- | --- | --- |
| 인프라 관리자 | 인프라별 접속 주소·포트·TLS 여부 | 집 PC와 촬영 도구가 외부에서 붙음 | 10/30 | 완료 |
| 인프라 관리자 | 팀 계정: 아키텍처 연결표의 자원 그대로 | 서비스가 공유 인프라에 붙음 | 10/30 | 완료 |
| 인프라 관리자 | 메시지 큐(RabbitMQ)·Grafana·SonarQube | 이벤트·대시보드·코드 품질 게이트 | 10/30 | 완료 |
| 인프라 관리자 | Rancher에서 `trace` 네임스페이스에 직접 배포할 권한, 우리 팀이 쓸 수 있는 CPU·메모리 한도(쿼터), GPU가 달린 서버(GPU 노드) | 흠집 탐지 모델을 돌리는 inspect-worker 위치 → 집 PC로 결정 | 10/31 | 완료 |
| 인프라 관리자 | Argo CD에 우리 레포 등록, 팀 포트 범위·Ingress·도메인 | 외부 포트 3개 | 10/31 | 완료 |
| 강사님 | 요구사항·ERD·아키텍처 v1, 3D 방식, 내부 진단 항목, Label Studio 전환 | 오늘 목표 확인 | 10/30 | 확인 필요 |
| NHN 사업단·학교 관리자 | 예약 완료(맥북 11/2 월 오후, LG 그램 11/4 수 9\~15시). 남은 것: "사진은 팀 서버에 비공개로 보관하고 대회 후 \[N\]일 안에 삭제" 문구 추가 | 주말 대여는 어려움 | 10/30 | 확인 필요 |
| AI Hub | 선박 도장 품질 데이터 다운로드 신청 | 승인 대기 시간 | 10/30 | 확인 필요 |
| 파일럿 17명·과정 운영팀 | 동의서(수집하는 것·안 하는 것·보관·삭제), 기종·OS 조사 | 진단 에이전트를 어느 OS부터 만들지 | 10/31 | 확인 필요 |
| 대회 운영 | 1차 서류 마감·양식 | 아직 일정에 없음 | 10/30 | 확인 필요 |

## 수정 일정

본 촬영을 예약한 날(맥북 11/2 오후, 그램 11/4 9\~15시)로 옮기고, 주말 이틀은 계약·레포·드라이런에 씁니다. 코드 프리즈 11/13과 발표 준비 일주일은 그대로 둡니다.

&#91;embedded content: 수정 일정 · 10/30\~11/19, 항목 13개\]

점선이 기능 완성 게이트(11/10)이고, 그 뒤로는 안정화와 발표 준비만 합니다.

게이트 기준

- **11/1 드라이런:** 팀 노트북 1대가 촬영 도구 → MinIO → Label Studio 10장 → 빌더 → 집 PC 1 epoch → ONNX → Jetson 엔진까지 갑니다. 같은 날 서비스 하나가 Argo CD로 배포돼 공유 PostgreSQL에 붙습니다.
- **11/3 관통:** 부스·폰 촬영 1세트와 진단 JSON 1건이 클러스터 서비스를 거쳐 공유 DB·MinIO에 기록되고 리포트에 뜹니다.
- **11/5 데이터셋 v001:** 라벨링을 마감하고 기기 단위로 나눈 첫 버전을 만듭니다.
- **11/10 기능 완성:** 세 시점이 3D 트윈과 타임라인에 나타나고 신규 흠집·내부 변화가 표시됩니다. 이후 새 기능은 금지합니다.
- **11/13 코드 프리즈:** 장애 테스트·폴백·데모 영상·수치표를 끝냅니다.

이전 일정에서 바뀐 것: W09(k3s·Helm) 삭제, W03은 공유 인프라 요청으로 변경, 본 촬영 10/31 → 11/2(맥북)·11/4(그램), 라벨링 마감 11/3 → 11/5, 관통 11/1 → 11/3, 기능 완성 11/9 → 11/10. 1차 서류 마감은 아직 모릅니다.

## 리스크와 컷 라인

인프라 계정·메시지 큐·쿼터·GPU는 10/30에 모두 승인돼 리스크에서 뢼습니다. 반사·정합·데이터 부족 같은 기존 리스크는 이전 계획 문서의 컷 라인을 그대로 씁니다.

| 리스크 | 판단일 | 대응·컷 라인 |
| --- | --- | --- |
| 외부망에 열린 키가 새어 나간다 | 상시 | 역할별 키, Git에 비밀 없음, gitleaks. 노출되면 그 키만 폐기 |
| 집 PC가 꺼지거나 학습 중이라 폰 사진 검사가 밀린다 | 11/3 | 작업은 RabbitMQ 지속 큐에 쌓였다가 켜지면 처리. 학습은 밤에 돌리고, 데모·파일럿 날에는 집 PC를 켜 둠 |
| 다른 팀과 자원 이름이 겹친다 | 10/31 | 모든 자원에 trace 접두사 |
| 맥북 10대를 오후 반나절에 다 못 찍는다 | 11/2 | 부스 1개에서 촬영 1명·다음 기기 준비 1명으로 나눠 찍음(1대 20분 목표). 남으면 테스트용 맥북 2대부터 찍고 나머지는 2차 대여로 |
| 라벨링이 11/5까지 안 끝난다 | 11/4 | 흠집 있는 사진부터. 안 되면 클래스를 긁힘·찍힘 2개로 축소 |
| 발표장에서 학교 서버에 못 닿는다 | 11/12 | 인프라까지 들어간 로컬 Compose + 데모 영상 |

11/10에 끝나지 않은 기능은 3DGS → 키보드·화면 테스트 → Elasticsearch 검색 → Grafana 순서로 덜어냅니다. 3D 트윈과 내부 상태 전후 비교는 어떤 컷에서도 남깁니다.

## 오늘 체크리스트

대여 → AI Hub 순서로 먼저 보내 두고, 회의는 요구사항 표부터 시작합니다.

- [ ] 승인된 인프라 접속 정보를 Rancher Secret으로 등록
- [ ] 대여 관리자에게 보관·삭제 문구 전달 (예약 완료: 맥북 11/2 오후, 그램 11/4 9\~15시)
- [ ] AI Hub 선박 도장 데이터 신청
- [x] 요구사항 v1 확정: 초안 41개에서 빼기·더하기·우선순위
- [x] Crowfoot에 요구사항 등록 → ERD v1 (테이블마다 근거 요구사항 연결)
- [x] 아키텍처 v1 확정: 구성도, 연결표, 네임스페이스·포트
- [x] 강사님께 세 산출물 확인받기
- [ ] B·C 역할 배정 (나민서·강성찬)
- [ ] 계약 초안 착수: 이벤트 5종·진단 JSON·코드 사전 (마감 10/31)
- [ ] 진단 결과 JSON v0 확정 (A, 10/31): JSON Schema로 옮겨 contracts 레포에 커밋. 초안과 다른 서비스 조사는 MVP 설계서의 "진단 JSON v0" 탭. B가 11/6에 바로 에이전트를 시작하려면 이게 먼저입니다.
- [ ] 실제 기기 출력으로 키 이름 확인 (B, 11/6 에이전트 착수 때): 맥은 ioreg·smartctl, Windows는 powercfg·smartctl. 할 일은 MVP 설계서의 "진단 JSON v0" 탭.

### 출처

- [Roboflow 가격 정책 (무료 플랜 데이터 공개)](https://roboflow.com/pricing)
- [Label Studio — S3 스토리지 연결](https://labelstud.io/guide/storage_s3)
- [Label Studio 1.19 — 프록시 모드](https://labelstud.io/blog/label-studio-1-19-majorcloud-storage-updates-coco-yolo-exports-and-more-community-driven-fixes)
- [Label Studio 커뮤니티 — SAM 결과의 YOLO 내보내기](https://community.labelstud.io/t/export-in-yolo-format-after-sam-annotation/426)
- [Ultralytics Academy — 대상 장치에서 엔진 만들기](https://academy.ultralytics.com/courses/train-your-first-yolo/export-for-deployment)
