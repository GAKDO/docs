# TRACE MVP 설계서 — 요구사항·ERD·아키텍처·기술 매핑

Oct 30, 2026 · @민서

## MVP 정의와 범위

TRACE MVP는 노트북 렌탈의 출고·수령·반납 세 시점에 외관(흠집 + 3D 트윈)과 내부 상태(배터리·부품·SSD·벤치마크)를 같은 기준으로 기록합니다. 그리고 무엇이 언제 달라졌는지 리포트로 보여 주는 것까지가 범위입니다. 완료 기준은 "노트북 한 대가 세 시점을 끝까지 통과한다"입니다.

| 구분 | 항목 |
| --- | --- |
| MVP 필수 | 렌탈·시점 관리, 부스 촬영(출고·반납), 폰 가이드 촬영(수령), 흠집 탐지 4종, 면 정합과 신규 흠집 판정, A\~D 등급, 진단 에이전트와 점검 플래그, 3D 트윈 타임라인 리포트, 해시 체인과 검증 QR·봉인 영수증 메일, 학습 데이터 파이프라인, 파일럿 대시보드, 고객 회원가입(이메일 인증·비밀번호 재설정)·내 렌탈 |
| 실험 | 3DGS 실물 스캔(교차편광 촬영, W06 결과로 포함 여부 판정) |
| 선택 (11/10 이후 여유 시) | 기록 검색(Elasticsearch), 사람이 탐지 결과를 고치는 화면, 키보드·화면 테스트 페이지, 로컬 LLM 설명 초안 |
| 제외 | 청구·결제, 수리 견적, 정품 판별, 마켓 기능, 사용자 파일 수집, 이메일·이름 외 개인정보 수집 |

MVP 완료 기준 (11/10 기능 완성 게이트)

1. 출고 부스 → 수령 폰 → 반납 부스의 세 시점이 렌탈 건 하나에 쌓인다.
2. 반납 때 새로 생긴 흠집이 3D 트윈 위 핀으로 표시되고 등급이 다시 매겨진다.
3. 진단 전후 비교표와 점검 플래그가 같은 리포트에 나온다.
4. 검증 QR로 기록이 바뀌지 않았음을 확인한다.
5. 파일럿 노트북의 두 번 측정값이 Grafana에 나온다.

## 최소 요구사항

MVP 필수 요구사항은 기능 44개, 비기능 6개입니다. 집 PC(RTX 4070 Ti)에서 돌아가는 요구사항은 그 PC를 다룰 수 있는 A가 모두 맡습니다. A는 서버·인프라·집 PC 작업·회원(30개), B는 부스·촬영 도구·라벨링·진단 에이전트(12개), C는 웹·3D 화면·시점 비교·검증 페이지(8개)입니다. 화면은 C가, 서버 API는 A가 만듭니다(회원 가입·로그인 화면도 C). 진단 결과 JSON 형식은 A가 11/3까지 contracts 레포에 확정하고, B는 라벨링이 끝난 11/6부터 에이전트를 만듭니다. 3DGS 실험(recon-worker)도 A가 맡습니다.

| ID | 도메인 | 요구사항 | 수용 기준 | 담당 | 우선순위 |
| --- | --- | --- | --- | --- | --- |
| FR-RNT-01 | 렌탈·기기 | 렌탈 건을 만들고 기기(시리얼)를 연결한다 | 같은 시리얼로 진행 중인 렌탈이 2건 생기지 않는다 | A | 필수 |
| FR-RNT-02 | 렌탈·기기 | 렌탈 건은 출고·수령·반납 세 시점을 순서대로 가진다 | 출고 전에 수령 기록을 만들면 거부된다 | A | 필수 |
| FR-RNT-03 | 렌탈·기기 | 기종 정보(치수 포함)를 관리한다 | 모델명으로 3D 트윈 치수를 조회한다 | A | 필수 |
| FR-RNT-04 | 렌탈·기기 | 고객 수령 촬영용 1회용 링크(QR)를 발급한다 | 만료된 링크로는 업로드되지 않는다 | A | 필수 |
| FR-RNT-05 | 렌탈·기기 | 관리자는 기기 목록을 기종·상태로 찾아 보고, 상태(사용 가능·수리 중·폐기)를 바꾼다 | 수리 중·폐기 기기로 렌탈을 만들면 409로 거부되고, 폐기해도 기기 기록은 지워지지 않는다 | A | 필수 |
| FR-AUTH-01 | 인증 | 관리자와 고객은 이메일·비밀번호로 로그인해 JWT(15분)와 리프레시 토큰(7일)을 받는다 | 만료된 액세스 토큰은 401, 리프레시로 다시 발급된다 | A | 필수 |
| FR-AUTH-02 | 인증 | 부스·고객·에이전트는 각자의 자격(클라이언트 비밀·QR 토큰·페어링 코드)을 범위가 좁은 JWT로 바꾼다 | 고객 JWT로 다른 시점에 접근하면 403 | A | 필수 |
| FR-AUTH-03 | 인증 | gateway가 모든 요청의 JWT를 검증하고 역할별로 경로를 막는다 | 역할 × 경로 표의 모든 칸이 테스트로 확인된다 | A | 필수 |
| FR-USR-01 | 회원 | 고객은 이메일·비밀번호·이름으로 가입하고 개인정보 수집 동의를 남긴다 | 동의 없이는 가입되지 않고, 같은 이메일로 두 번 가입되지 않는다 | A | 필수 |
| FR-USR-02 | 회원 | 고객이 수령 QR을 찍고 로그인하면 그 렌탈이 자기 계정에 연결된다 | 이미 다른 계정에 연결된 렌탈은 연결되지 않는다(409) | A | 필수 |
| FR-USR-03 | 회원 | 고객은 내 렌탈 목록과 시점별 리포트를 본다 | 다른 고객의 렌탈을 열면 403 | C | 필수 |
| FR-USR-04 | 회원 | 고객은 탈퇴할 수 있고, 탈퇴하면 이메일·이름을 지우고 렌탈 기록은 익명으로 남긴다 | 탈퇴 후 DB에 이메일·이름이 남지 않는다 | A | 필수 |
| FR-USR-05 | 회원 | 가입하면 이메일로 6자리 인증 코드가 가고, 코드를 넣어야 계정이 활성화된다 | 인증 전 로그인은 403, 코드는 10분 뒤 만료되고 5번 틀리면 새로 받아야 한다 | A | 필수 |
| FR-USR-06 | 회원 | 비밀번호를 잊은 고객은 이메일로 받은 코드로 새 비밀번호를 정한다 | 없는 이메일도 같은 응답을 받고, 재설정하면 그 계정의 리프레시 토큰이 모두 지워진다 | A | 필수 |
| FR-CAP-01 | 촬영 | 부스는 자세별 면·조명 세트를 버튼 한 번에 찍어 올린다 | 한 세트에서 빠진 면이 0개다 | B | 필수 |
| FR-CAP-02 | 촬영 | 모든 사진에 면·조명·카메라 코드와 SHA-256을 남긴다 | 내려받은 파일 해시와 저장된 해시가 같다 | B | 필수 |
| FR-CAP-03 | 촬영 | 폰 웹앱은 면마다 윤곽 가이드를 띄우고 블러·반사를 검사한다 | 불량 사진은 재촬영 전까지 제출되지 않는다 | C | 필수 |
| FR-CAP-04 | 촬영 | 품질 미달 면은 "판정 불가"로 두고 비교에서 뺀다 | 판정 불가 면은 등급 계산에 쓰이지 않는다 | C | 필수 |
| FR-CAP-05 | 촬영 | 사진은 게이트웨이를 거치지 않고 저장소에 직접 올린다(사전 서명 URL) | 게이트웨이 트래픽에 사진 본문이 없다 | A | 필수 |
| FR-INS-01 | 검사 | 흠집 4종(긁힘·찍힘·균열·오염)을 폴리곤으로 탐지한다 | 테스트 맥북 2대의 mAP를 기록한다 | A | 필수 |
| FR-INS-02 | 검사 | 면을 표준 좌표로 펼친다(윤곽 4점 + 특징점 보정) | 폰과 부스 사이 정합 오차를 기록한다 | A | 필수 |
| FR-INS-03 | 검사 | 이전 시점 흠집과 비교해 신규·기존을 판정한다 | 테스트 흠집의 판정 정확도를 기록한다 | C | 필수 |
| FR-INS-04 | 검사 | 외관으로 A\~D 등급을 매긴다(오염 제외) | 결과에 등급 규칙 버전이 남는다 | A | 필수 |
| FR-DIA-01 | 내부 진단 | 기기 식별·부품 구성을 읽는다(macOS·Windows) | 팀 노트북 3대의 JSON이 저장된다 | B | 필수 |
| FR-DIA-02 | 내부 진단 | 배터리 사이클·설계 용량·완충 용량·최대 용량을 읽는다 | OS 배터리 리포트 값과 같다 | B | 필수 |
| FR-DIA-03 | 내부 진단 | SSD 상태를 읽는다(권한이 없으면 생략) | 생략하면 사유가 결과에 남는다 | B | 필수 |
| FR-DIA-04 | 내부 진단 | 고정 벤치마크를 3회 돌려 중앙값과 측정 조건을 남긴다 | 같은 기기 3회 측정 편차를 기록한다 | B | 필수 |
| FR-DIA-05 | 내부 진단 | 결과를 먼저 보여 주고 동의하면 올린다 | 동의 없이는 전송되지 않는다 | B | 필수 |
| FR-DIA-06 | 내부 진단 | 시점 간 비교로 점검 플래그(부품 변경·용량 급감·벤치 하락)를 붙인다 | 임계값은 파일럿 1차 측정 편차로 정한다 | A | 필수 |
| FR-RPT-01 | 리포트·3D | 기종 3D 모델에 9면 사진을 입혀 웹에서 돌려 본다 | 팀 노트북이 웹에서 3D로 돈다 | A | 필수 |
| FR-RPT-02 | 리포트·3D | 흠집을 3D 핀으로 찍고 시점 슬라이더로 바꿔 본다 | 슬라이더를 옮기면 신규 핀이 구분돼 보인다 | C | 필수 |
| FR-RPT-03 | 리포트·3D | 타임라인 리포트에 핀·크롭·등급·내부 상태 비교표를 보여 준다 | 팀 밖 3명이 설명 없이 신규 흠집과 배터리 변화를 말한다 | C | 필수 |
| FR-RPT-04 | 리포트·3D | 검사 진행률을 실시간으로 보여 준다(SSE) | 새로고침 없이 진행률이 바뀐다 | A | 필수 |
| FR-INT-01 | 무결성 | 사진·진단 JSON 해시를 이전 기록 해시에 잇는다(해시 체인) | 사진 한 장을 바꾸면 검증이 실패한다 | A | 필수 |
| FR-INT-02 | 무결성 | 리포트에 검증 QR을 붙인다 | QR로 검증 결과 페이지가 열린다 | C | 필수 |
| FR-INT-03 | 무결성 | 시점이 봉인되면 그 기록의 지문(해시)을 고객 메일로 보낸다(봉인 영수증) | 메일 속 지문이 검증 페이지의 지문과 같고, 출고 영수증은 수령 때 렌탈이 계정에 연결되면 보내진다 | A | 필수 |
| FR-PIL-01 | 파일럿 | 참여자 동의와 기기를 별칭으로 등록한다 | 실명과 측정값이 같은 테이블에 없다 | A | 필수 |
| FR-PIL-02 | 파일럿 | 대당 배터리·벤치마크 추이를 대시보드로 본다 | 두 번 측정한 값이 한 화면에 나온다 | C | 필수 |
| FR-DAT-01 | 학습 데이터 | 촬영 도구는 촬영 목록 순서를 안내하고 파일명을 자동으로 만든다 | 파일명 규칙 위반 0건, 장수가 목록과 같다 | B | 필수 |
| FR-DAT-02 | 학습 데이터 | 촬영 즉시 저장소에 올리고, 실패하면 로컬에 두었다가 재시도한다 | 네트워크가 끊겼다 돌아와도 누락 0건 | B | 필수 |
| FR-DAT-03 | 학습 데이터 | Label Studio는 저장소 원본을 작업으로 가져오고 주석을 저장소에 쓴다 | 새 사진이 동기화 한 번에 작업으로 뜬다 | B | 필수 |
| FR-DAT-04 | 학습 데이터 | 빌더는 제출된 주석만으로, 기기 단위로 나눠 데이터셋 버전을 만든다 | 한 기기가 두 분할에 동시에 없고, 같은 버전은 덮어쓸 수 없다 | A | 필수 |
| FR-DAT-05 | 학습 데이터 | 학습 결과(가중치·ONNX·지표)를 데이터셋 버전과 함께 저장한다 | 모델마다 학습 데이터 버전을 추적할 수 있다 | A | 필수 |
| FR-OPS-01 | 집 PC 운영 | inspect-worker는 집 PC가 켜지면 자동으로 떠서, 꺼져 있는 동안 큐에 쌓인 작업을 처리한다 | 워커를 끈 채 사진 3장을 올리고, 켜면 3장이 모두 처리된다 | A | 필수 |
| NFR-01 | 비기능 | 부스 한 세트 추론을 Jetson에서 30초 안에 끝낸다 | 11/6 Jetson 실측 30초 이내, 첫 면 결과는 SSE로 먼저 표시 | B | 필수 |
| NFR-02 | 비기능 | 진단 에이전트는 사용자 파일·브라우저 기록을 읽지 않는다 | 읽는 경로 목록을 고정하고 리뷰한다 | B | 필수 |
| NFR-03 | 비기능 | 공유 인프라 계정은 팀 전용·최소 권한이고, 비밀 값은 Git에 없다 | gitleaks 통과, 역할별 키 분리 | A | 필수 |
| NFR-04 | 비기능 | 공유 인프라의 우리 자원은 모두 trace 접두사로 격리한다 | 다른 팀 자원을 읽거나 쓰지 않는다 | A | 필수 |
| NFR-05 | 비기능 | 클러스터에는 앱과 PostgreSQL만 배포하고(나머지 인프라는 학교 것), 파드가 죽으면 스스로 복구된다 | 파드를 지워도 자동으로 다시 뜨고, PostgreSQL 파드를 지워도 데이터가 남는다 | A | 필수 |
| NFR-06 | 비기능 | 학교 서버에 못 닿으면 로컬 Compose로 데모한다 | 폴백으로 세 시점 흐름이 동작한다 | A | 필수 |

요구사항 50개는 모두 필수이고, 일정이 밀려도 빼지 않습니다(10/30 결정). 일정 위험이 가장 큰 것은 팀 Gmail 발송에 기대는 3개(FR-USR-05·06, FR-INT-03)라, Gmail 계정을 먼저 준비합니다.

## 아키텍처

학교 클러스터의 `trace` 네임스페이스에는 앱 8개와 PostgreSQL 1개를 올리고, 나머지 데이터는 학교 서버의 공유 인프라에 둡니다. GPU가 필요한 일은 Jetson 2대(부스)와 집 PC 4070 Ti(워커·학습)가 나눠 맡습니다.

&#91;embedded content: TRACE 아키텍처 · 클러스터 앱 8개 + PostgreSQL, 집 PC 워커, 공유 인프라 5종\]

파란 상자 3개만 밖으로 열리고, 사진과 학습 데이터는 서버를 거치지 않고 MinIO로 바로 올라갑니다.

배포 단위

| 배포 단위 | 위치 | 역할 | 클러스터 안 주소 | 밖으로 열림 |
| --- | --- | --- | --- | --- |
| gateway | 클러스터 | 인증·라우팅, 외부 API 입구 | `gateway:8080` | NodePort 8314 (API) |
| web | 클러스터 | 리포트·3D 트윈·폰 촬영 웹앱·관리 화면 | `web:8080` | NodePort 8315 (웹) |
| label-studio | 클러스터 | 학습 데이터 라벨링 | `label-studio:8080` | NodePort 8316 |
| auth-server | 클러스터 | 회원가입·로그인·렌탈 연결, 부스 자격·고객 QR 링크·페어링 코드, JWT 발급·JWKS | `auth-server:8080` | 아니오 |
| rental-server | 클러스터 | 렌탈·기기·시점 관리, 파일럿 등록 | `rental-server:8080` | 아니오 |
| capture-server | 클러스터 | 촬영 세트, 사전 서명 URL, 검사 결과 저장, 시점 비교·등급 | `capture-server:8080` | 아니오 |
| diagnostics-server | 클러스터 | 진단 검증·전후 비교·점검 플래그 | `diagnostics-server:8080` | 아니오 |
| report-server | 클러스터 | 타임라인 읽기 모델, 해시 체인, 검증, SSE 진행률 | `report-server:8080` | 아니오 |
| postgres (예외) | 클러스터 | DB trace(스키마 7)·labelstudio. StatefulSet + 영구 볼륨, 매일 MinIO 백업 | `postgres:5432` | 아니오 (집 PC 빌더는 port-forward) |
| inspect-worker | 집 PC (4070 Ti) | 폰 사진 탐지, 9면 정합, 3D 텍스처 생성 | — | 아니오 (큐·MinIO·gateway에 밖에서 접속) |
| recon-worker (실험) | 집 PC (4070 Ti) | 3DGS 학습 | — | 아니오 (큐에 접속) |
| 학습·데이터셋 빌더 | 집 PC (4070 Ti) | 데이터셋 버전 생성, YOLO11-seg 파인튜닝 | — | 아니오 |
| 부스 × 2 | Jetson Orin Nano | 촬영 제어, 조명 전환, TensorRT 탐지 | — | 아니오 |
| 진단 에이전트 | 렌탈 노트북 | 배터리·부품·SSD·벤치마크 측정 | — | 아니오 |

- **포트:** 학교 서버는 8300\~8499를 학생마다 10개씩 나눠 줍니다. 클러스터 Service는 이 범위 안의 NodePort로 엽니다(지난 프로젝트에서 8318을 같은 방식으로 씀). A 계정 범위(8310\~8319)에서 비어 있는 8314\~8316을 쓰고, 8310\~8313·8317·8319는 예비로 둡니다(8318은 지난 프로젝트가 사용 중). 클러스터 안 앱은 모두 8080으로 받고, 같은 네임스페이스 안에서는 Service 이름으로 부릅니다.
- **HTTPS:** 폰 웹앱은 카메라를 쓰는데, 브라우저는 HTTP 페이지에서 카메라를 막습니다. 그래서 11/2에 도메인을 사면 DNS 인증으로 인증서를 받아 Rancher Secret에 넣고, web과 gateway가 직접 TLS를 처리합니다(`https://<도메인>:8315` 웹, `:8314` API).
- **출처:** web과 gateway는 포트가 달라 브라우저가 다른 출처로 봅니다. gateway는 web 주소만 CORS로 허용합니다.
- **PostgreSQL:** 학교 PostgreSQL 접속 정보·권한을 받지 못해, PostgreSQL만 예외로 클러스터 안에 둡니다(StatefulSet + 영구 볼륨). 밖으로 열지 않고, 매일 pg\_dump로 MinIO trace-backups에 백업합니다. 집 PC의 데이터셋 빌더는 필요할 때 kubectl port-forward로 붙습니다.

공유 인프라 자원 (10/30 모두 승인)

| 인프라 | 우리 자원 | 접속 주소 | 쓰는 곳 |
| --- | --- | --- | --- |
| PostgreSQL (클러스터 안, 예외) | DB `trace`(스키마 rental·capture·inspection·diagnostics·report·ml·auth), DB `labelstudio` | postgres:5432 (클러스터 안) | 서버 5개, 데이터 도구, Label Studio |
| MinIO | `trace-captures`·`trace-derived`(서비스), `trace-raw`·`trace-labels`·`trace-datasets`·`trace-models`(학습), trace-backups(DB 백업) | `https://storage.java21.net` | capture·report, 워커, 부스, 촬영 도구, Label Studio, Jetson |
| RabbitMQ | vhost `/trace` | `s4.java21.net:5672` (관리 화면 15672) | 기능 서버 4개, auth-server(영수증), 워커 2개 |
| Redis | DB 2번(학번 끝자리 규칙), 키 접두사 `trace:` | 학교 Redis `:6379` (클러스터는 내부망 주소, 집 PC는 외부 주소) | gateway(요청 제한), auth(리프레시 토큰), capture·report(진행률) |
| InfluxDB | 버킷 `trace-pilot` | `http://influx.java21.net` | diagnostics(쓰기), Grafana(읽기, 학교 공용) |
| Elasticsearch | 인덱스 `trace-records-*` | `s4.java21.net:9200` (Kibana 5601) | report (선택 기능) |
| Gmail SMTP (외부, 학교 인프라 아님) | 팀 Google 계정 하나, 앱 비밀번호는 Rancher Secret | `smtp.gmail.com:587` | auth-server (인증·재설정 코드 메일) |

배포는 GitHub Actions가 이미지를 GHCR에 올리고, Argo CD가 gitops 레포의 `overlays/school`(Kustomize)을 Rancher 클러스터에 맞춥니다. 앱은 인프라를 `postgres.trace.svc` 같은 고정 Service 이름으로 찾고, 비밀번호·키는 Rancher Secret에서 읽습니다.

**레포 구성 (12개, 10/31 결정)**: 서버마다 레포를 따로 두고, 팀 조직 안이라 이름에 trace 접두사를 붙이지 않습니다. 서버 레포 이름은 `_server`(예: `auth_server`)입니다. 쿠버네티스 이름에는 밑줄을 쓸 수 없어서 클러스터 안 서비스·이미지 이름은 `auth-server`처럼 하이픈으로 남고, 배포 워크플로가 `_`를 `-`로 바꿔 씁니다.

| 레포 | 내용 | 담당 | 기술 |
| --- | --- | --- | --- |
| `gateway` | JWT 검증·라우팅·요청 제한 | A | Spring Cloud Gateway |
| `auth_server` | 회원·로그인·자격·QR 링크·페어링·JWKS·봉인 영수증 메일 | A | Spring Boot 3 |
| `rental_server` | 렌탈·기기·기종·시점·파일럿 | A | Spring Boot 3 |
| `capture_server` | 촬영 세트·사전 서명 URL·검사 결과·등급 | A | Spring Boot 3 |
| `diagnostics_server` | 진단 검증·비교·점검 플래그·추이 | A | Spring Boot 3 |
| `report_server` | 타임라인·해시 체인·검증·SSE | A | Spring Boot 3 |
| `web` | 관리자 화면·폰 촬영·3D 리포트·검증 페이지 | C | React·TS·Vite·three.js |
| `contracts` | OpenAPI 5개·진단 JSON Schema·이벤트 스키마·codes.yaml | A (B·C 리뷰) | YAML·JSON |
| `gitops` | Kustomize overlays/school·Argo CD Application·PostgreSQL·Label Studio | A | YAML |
| `agent` | 진단 에이전트(macOS·Windows) | B | Python |
| `booth` | 부스 Jetson 앱·학습 데이터 촬영 도구 | B | Python |
| `ml` | inspect-worker·recon-worker·데이터셋 빌더·학습 | A | Python·PyTorch |

- **공통 코드:** 서버 레포끼리 공유 라이브러리를 두지 않습니다. 요청·응답 타입은 contracts의 OpenAPI로 생성하고, 오류 응답은 Spring 기본 ProblemDetail, JWT 검증은 Spring Security 리소스 서버 설정으로 auth-server의 JWKS를 읽습니다.
- **배포 흐름:** 각 레포의 GitHub Actions가 이미지를 GHCR(`ghcr.io/<조직>/<서비스>`)에 올리고 gitops 레포의 이미지 태그를 바꾸면, Argo CD가 클러스터에 맞춥니다. 그 뒤 연기 시험이 바깥 주소에서 새 커밋이 응답하는지 최대 12분 확인하고, 실패하면 gitops 커밋을 되돌려 직전 버전으로 자동 롤백합니다(블로그의 smoke·롤백을 Argo CD 방식으로 옮김).
- **문서:** 결정 기록·CI/CD·환경 설정은 [GAKDO/docs](https://github.com/GAKDO/docs)에 모읍니다. 이 설계서가 원본이고, docs의 `design/`은 내보낸 사본입니다.

## 서버 구성과 연결

서버는 모두 10개입니다. 우리가 만드는 서버가 9개(클러스터 7개 + 집 PC 워커 2개, 그중 recon-worker는 실험)이고, Label Studio 1개는 가져다 씁니다. 인증·인가는 지난 프로젝트처럼 auth-server로 분리했습니다. 부스 Jetson·진단 에이전트·촬영 도구·학습 스크립트는 서버가 아니라 클라이언트와 도구입니다.

| # | 서버 | 위치 | 기술 | 맡은 기능 |
| --- | --- | --- | --- | --- |
| 1 | web | 클러스터 | React, TypeScript, Vite, three.js | 관리자 화면, 고객 폰 촬영, 3D 트윈 리포트, 검증 페이지 |
| 2 | gateway | 클러스터 | Spring Cloud Gateway, Spring Security | JWT 검증, 경로 라우팅, 요청 제한 |
| 3 | auth-server | 클러스터 | Spring Boot 3, Spring Security, Nimbus JOSE | 회원가입·이메일 인증·로그인·비밀번호 재설정·탈퇴(관리자·고객), 고객↔렌탈 연결, 부스 자격, 고객 QR 링크, 에이전트 페어링 코드, JWT 발급·JWKS |
| 4 | rental-server | 클러스터 | Spring Boot 3 | 렌탈·기기·시점 관리, 기종 치수, 파일럿 등록 |
| 5 | capture-server | 클러스터 | Spring Boot 3 | 촬영 세트, 사전 서명 URL, 검사 결과 저장, 시점 비교·등급 |
| 6 | diagnostics-server | 클러스터 | Spring Boot 3 | 진단 검증, 전후 비교, 점검 플래그, 추이 기록 |
| 7 | report-server | 클러스터 | Spring Boot 3 | 타임라인 읽기 모델, 해시 체인·검증, SSE 알림 |
| 8 | inspect-worker | 집 PC | Python, PyTorch, Ultralytics, LightGlue | 폰 사진 탐지, 9면 정합, 3D 텍스처 |
| 9 | recon-worker (실험) | 집 PC | Python, gsplat | 3DGS 실물 스캔 |
| 10 | label-studio (가져다 씀) | 클러스터 | Label Studio | 학습 데이터 라벨링. 코드 레포는 없고 배포 설정만 gitops 레포에 둠 |

&#91;embedded content: 서버 연결 구조 · 서버 10개, 클라이언트 4종\]

서비스끼리는 서로 REST로 부르지 않고 RabbitMQ 이벤트로만 주고받습니다. 예외는 gateway가 auth-server에서 JWT 공개키(JWKS)를 받아 오는 것 하나입니다.

&#91;embedded content: 서버별 인프라 · 서버 10개 × 인프라 6종\]

web은 인프라에 직접 붙지 않고, Grafana는 학교 서버에 있는 것을 쓰므로 우리 서버에 넣지 않았습니다.

## 인증·인가

JWT로 합니다. 지난 프로젝트처럼 인증·인가는 auth-server로 분리해 업무 서버와 나눴습니다. auth-server가 회원가입·로그인(관리자·고객), 부스 자격, 고객 QR 링크, 에이전트 페어링 코드를 맡아 RS256 JWT를 발급하고, gateway가 공개키로 검증한 뒤 역할에 따라 경로를 막습니다. Keycloak은 새 인프라를 띄우는 것이라 쓰지 않습니다.

| 주체 | 받는 방법 | 토큰 | 수명 | 할 수 있는 일 |
| --- | --- | --- | --- | --- |
| 관리자(검수 담당) | 이메일·비밀번호 로그인 (계정은 초기 데이터로 생성) | 액세스 JWT(role ADMIN) + 리프레시 토큰 | 15분 · 7일 | 렌탈·시점·기기 관리, 모든 리포트 |
| 고객 | 회원가입·이메일 인증 후 이메일·비밀번호 로그인 | 액세스 JWT(role CUSTOMER, rentals 클레임) + 리프레시 토큰 | 15분 · 7일 | 내 렌탈 목록과 리포트 보기 |
| 고객(수령 촬영 중) | 로그인한 뒤 QR의 1회용 토큰 교환 | JWT(role CUSTOMER, checkpointId) | 30분 | 그 시점의 수령 촬영 |
| 부스(Jetson) | client\_id·secret 교환 | JWT(role BOOTH, boothId) | 1시간, 만료 전 재발급 | 자기 부스의 촬영 세트·탐지 결과 올리기 |
| 진단 에이전트 | 화면의 6자리 페어링 코드 교환 | JWT(role AGENT, checkpointId) | 10분 | 그 시점의 진단 JSON 1건 올리기 |
| 검증 페이지 | 없음(공개) | 없음 | 없음 | verify\_token으로 검증 결과만 읽기 |

설계 규칙

- **서명 키:** RS256 키 쌍을 씁니다. 개인키는 auth-server만 Rancher Secret으로 갖고, 공개키는 `/.well-known/jwks.json`으로 내보내 gateway가 캐시합니다. `kid`로 키를 교체할 수 있습니다.
- **검증 위치:** gateway(Spring Cloud Gateway + Spring Security OAuth2 Resource Server)가 서명·만료·역할을 확인하고, 서비스에는 `X-User-Id`·`X-Role`·`X-Scope` 헤더로 넘깁니다. 서비스는 NetworkPolicy로 gateway에서 오는 요청만 받습니다.
- **클레임:** `iss`(trace), `sub`, `role`, `scope`(checkpointId 또는 boothId), `iat`, `exp`, `jti`. scope 밖의 시점을 요청하면 403입니다.
- **폐기:** 리프레시 토큰은 Redis `trace:auth:refresh:{jti}`에 두고 로그아웃·비밀번호 변경·재설정 때 지웁니다. 재설정 때 한 번에 지우려고 계정별 jti 집합도 함께 둡니다. 액세스 토큰은 15분으로 짧게 두어 폐기 목록 없이 운영합니다.
- **브라우저 보관:** 액세스 토큰은 메모리에만, 리프레시 토큰은 HttpOnly·Secure·SameSite=Strict 쿠키에 둡니다.
- **비밀 저장:** 비밀번호와 client secret은 BCrypt, QR 토큰과 페어링 코드는 SHA-256 해시만 DB에 둡니다. 페어링 코드는 5분 뒤 만료되고, gateway가 시도 횟수를 제한합니다.
- **범위 밖:** Label Studio와 Grafana는 각자 계정을 쓰고 JWT와 묶지 않습니다.

회원가입 규칙

- **받는 정보:** 이메일·비밀번호·이름과 개인정보 수집 동의만 받습니다. 전화번호·주소는 받지 않습니다.
- **계정 테이블 하나:** 관리자와 고객을 `auth.account` 하나에 두고 role(ADMIN·CUSTOMER)로 나눕니다. 관리자는 가입 화면이 아니라 초기 데이터로 만듭니다. 고객 계정은 PENDING으로 만들어지고 이메일 인증을 마치면 ACTIVE가 됩니다.
- **렌탈 연결:** 고객이 QR을 찍고 로그인하면 auth-server가 그 렌탈을 `auth.rental_access`에 기록하고, JWT `rentals` 클레임에 넣습니다. 다른 서버는 이 클레임만 보고 접근을 판단하므로 서버끼리 묻지 않습니다.
- **탈퇴:** 이메일·이름·비밀번호를 지우고 계정은 WITHDRAWN으로 남깁니다. 렌탈 기록과 해시 체인에는 개인정보가 없어 그대로 둡니다.
- **이메일 인증·비밀번호 재설정:** 가입 직후와 비밀번호 재설정 때 6자리 코드를 메일로 보냅니다. 코드는 SHA-256 해시만 auth.email\_token에 두고, 10분 뒤 만료·5번 틀리면 폐기·재발송은 60초에 1번(Redis)입니다. 비밀번호 재설정 요청은 가입 여부와 상관없이 같은 응답을 돌려줍니다. 메일은 Spring Mail로 팀 Gmail SMTP(앱 비밀번호는 Rancher Secret)에서 보내고, NetworkPolicy는 auth-server만 587 포트로 나가게 엽니다.
- **봉인 영수증 메일:** auth-server가 `trace.record.sealed`를 받아 그 렌탈에 연결된 고객에게 기록 지문을 메일로 보냅니다. 고객 메일함은 업체가 고칠 수 없어서, 검증 페이지의 지문과 비교하면 봉인 뒤 변경을 잡을 수 있습니다. 고객 연결 전에 봉인된 출고 기록은 `auth.seal_receipt`에 남겨 두었다가 수령 때 렌탈이 연결되면 보내고, 같은 시점은 한 번만 보냅니다.

## 기능 요소별 인프라·기술 매핑

기능 요소 24개를 어디서, 어떤 기술로, 어떤 인프라를 써서 만드는지 정리했습니다. 서버는 Java·Spring Boot, GPU를 쓰는 일은 Python, 화면은 React·three.js로 나눴습니다.

| 기능 요소 | 실행 위치 | 기술 | 인프라 | 요구사항 |
| --- | --- | --- | --- | --- |
| 렌탈·기기·시점 관리 | rental-server | Java 21, Spring Boot 3, Spring Data JPA, Flyway | PostgreSQL `rental` | FR-RNT-01\~03 |
| 수령 링크·QR 발급 | auth-server, web | 랜덤 토큰 + 만료 시각, QR은 web에서 생성 | PostgreSQL `auth` | FR-RNT-04 |
| 파일럿 등록 | rental-server | 별칭으로 등록, 실명은 따로 보관 | PostgreSQL `rental` | FR-PIL-01 |
| 부스 촬영 제어 | Jetson × 2 | Python 3.10(JetPack 6), OpenCV, v4l2-ctl 고정 설정, Jetson.GPIO 릴레이(조명 L1·L2·L3), 턴테이블 | gateway API, MinIO `trace-captures` | FR-CAP-01, 02 |
| 부스 흠집 탐지 | Jetson × 2 | YOLO11-seg → ONNX → TensorRT FP16(Jetson에서 빌드), 고해상 타일 추론 | 결과는 gateway를 거쳐 capture-server로 | FR-INS-01, NFR-01 |
| 폰 가이드 촬영 | web (고객 폰 브라우저) | React + TypeScript(Vite), getUserMedia, 면 윤곽 오버레이, OpenCV.js 블러·반사 검사 | MinIO `trace-captures` | FR-CAP-03, 04 |
| 촬영 세트·사전 서명 URL | capture-server | Spring Boot 3, AWS SDK v2 S3Presigner, Spring AMQP | PostgreSQL `capture`, MinIO, RabbitMQ | FR-CAP-01\~05 |
| 폰 사진 탐지·9면 정합·텍스처 | inspect-worker (집 PC) | Python 3.11, PyTorch, Ultralytics YOLO11-seg, SuperPoint + LightGlue, OpenCV 호모그래피, pika | RabbitMQ, MinIO `trace-derived` | FR-INS-01, 02 |
| 시점 비교·신규 판정·등급 | capture-server | 표준 좌표 거리 매칭, 버전이 있는 등급 규칙 | PostgreSQL `inspection` | FR-INS-03, 04 |
| 진단 에이전트 | 렌탈 노트북 | Python → PyInstaller 단일 실행 파일, macOS system\_profiler, Windows powercfg·WMI, smartctl, 자체 60초 벤치마크 | gateway | FR-DIA-01\~05 |
| 진단 검증·비교·플래그 | diagnostics-server | Spring Boot 3, JSON Schema 검증, 비교 규칙, InfluxDB Java 클라이언트 | PostgreSQL `diagnostics`, MinIO(원본 JSON), InfluxDB `trace-pilot` | FR-DIA-05, 06 |
| 해시 체인·검증 QR | report-server, web | SHA-256, Ed25519 서버 서명, 검증 페이지, 봉인 영수증 메일(auth-server, Spring Mail) | PostgreSQL `report`, RabbitMQ, Gmail SMTP | FR-INT-01\~03 |
| 타임라인 리포트·진행률 | report-server, web | 이벤트로 만드는 읽기 모델, Spring SseEmitter, Redis Pub/Sub | PostgreSQL `report`, Redis | FR-RPT-03, 04 |
| 3D 트윈 뷰어 | web | three.js(React Three Fiber), 기종 치수 모델 + 9면 텍스처 + 핀, 시점 슬라이더 | MinIO `trace-derived` | FR-RPT-01, 02 |
| 인증·인가 | auth-server(발급), gateway(검증) | Spring Security, Nimbus JOSE(RS256 JWT), BCrypt, Spring Cloud Gateway 요청 제한 | PostgreSQL `auth`, Redis(리프레시 토큰) | FR-AUTH-01\~03, NFR-03 |
| 회원가입·내 렌탈 | auth-server, web | Spring Security, BCrypt, Bean Validation, Spring Mail(인증·재설정 코드), JWT rentals 클레임, React 가입·로그인·내 렌탈 화면 | PostgreSQL auth, Redis(재발송 제한), Gmail SMTP | FR-USR-01\~06 |
| 파일럿 대시보드 | Grafana (학교 서버) | Flux 쿼리 패널 | InfluxDB `trace-pilot` | FR-PIL-02 |
| 학습 데이터 촬영 도구 | 노트북·Jetson | 부스 스크립트 v0 공유, boto3, 로컬 보관 후 재시도 | MinIO `trace-raw` | FR-DAT-01, 02 |
| 라벨링 | label-studio | Label Studio, S3 소스·타깃(프록시 모드), 폴리곤 4클래스 | PostgreSQL `labelstudio`, MinIO `trace-raw`·`trace-labels` | FR-DAT-03 |
| 데이터셋 빌드·학습 | 집 PC | Python, Ultralytics 학습, manifest(SHA-256), ONNX 내보내기 | MinIO `trace-datasets`·`trace-models`, PostgreSQL `ml` | FR-DAT-04, 05 |
| 배포·코드 품질 | GitHub Actions → GHCR → Argo CD → Rancher | Docker, Kustomize, SonarQube, gitleaks | 클러스터 `trace` | NFR-03, 05 |
| 발표장 폴백 | 팀 노트북 | Docker Compose(앱 + 인프라) | 로컬 | NFR-06 |
| 3DGS 실물 스캔 (실험) | recon-worker (집 PC) | gsplat, 교차편광 촬영 | RabbitMQ, MinIO `trace-derived` | FR-RPT-06 |
| 기록 검색 (선택) | report-server | Elasticsearch Java 클라이언트 | Elasticsearch `trace-records-*` | FR-RPT-05 |

## 핵심 흐름

고객 수령 촬영 한 건이 리포트에 신규 흠집으로 뜨기까지 13단계입니다. 사진은 서버를 거치지 않고 MinIO로 바로 가고, 무거운 검사는 RabbitMQ를 거쳐 집 PC가 맡습니다.

&#91;embedded content: 수령 촬영 한 건의 처리 순서 · 13단계\]

⑤\~⑧은 집 PC가 꺼져 있으면 큐에서 기다렸다가, 켜지면 이어서 처리됩니다.

진행률은 inspect-worker가 Redis에 올리고 report-server가 SSE로 화면에 흘려보냅니다. 출고·반납 부스는 Jetson이 탐지를 직접 해서, inspect-worker는 정합과 텍스처만 맡습니다.

## ERD

PostgreSQL `trace` DB에 서비스별 스키마 7개, 테이블 30개를 둡니다. 실선은 같은 스키마 안의 FK이고, 점선은 서비스 사이를 ID 값으로만 잇는 참조입니다. 컬럼 정의는 테이블 정의 탭의 DDL에 있습니다.

&#91;embedded content: TRACE ERD · 스키마 7개, 테이블 30개\]

rental의 checkpoint가 모든 기록의 기준점이고, 다른 서비스는 그 ID를 값으로만 들고 있습니다.

설계 규칙

- **서비스 간 FK 금지:** 다른 스키마의 ID는 값으로만 들고, 정합성은 이벤트로 맞춥니다. 서비스를 따로 배포하고 DB 계정도 나눌 수 있게 하려는 것입니다.
- **공통 컨럼:** 모든 테이블에 `id`(UUIDv7, PK)·`created_at`·`updated_at`(timestamptz)를 둡니다.
- **파일은 키만:** 사진·텍스처·진단 원본 JSON은 MinIO에 두고, DB에는 `object_key`와 `sha256`만 남깁니다.
- **코드 값은 한 곳에서:** 면·조명·클래스·등급·시점 값은 `contracts/codes.yaml`을 따르고, DB에는 CHECK 제약으로 넣습니다.
- **추이는 InfluxDB에도:** 배터리·벤치마크 원본은 PostgreSQL이고, 대시보드용 시계열은 InfluxDB `trace-pilot`에 따로 씁니다.
- **검색은 복사본:** Elasticsearch 인덱스는 report-server가 이벤트로 채우는 복사본입니다. 원본은 항상 PostgreSQL입니다.
- **Label Studio는 범위 밖:** Label Studio는 자기 DB(`labelstudio`)를 쓰고, 우리는 그 결과를 MinIO에서만 읽습니다.

컬럼·제약 전체: 테이블 정의 (DDL)

Crowfoot ERD v1(10/31): [TRACE MVP ERD](https://crowfoot.java21.net/workspaces/68/models/688). 테이블 30개·관계 18개를 서비스 그룹 7개로 묶고, 모든 테이블에 근거 요구사항을 연결했습니다. 테이블이 없는 요구사항 9개(FR-DAT-02·03, FR-OPS-01, NFR-01\~06)는 반영 대기로 남습니다.

## 이벤트 계약

서비스와 워커는 RabbitMQ topic exchange `trace.events` 하나로 이벤트 5종을 주고받습니다. 부스의 탐지 결과만 예외로, Jetson이 gateway를 거쳐 capture-server에 REST로 올립니다.

| 라우팅 키 | 발행 | 소비 (큐) | 언제 | 핵심 필드 |
| --- | --- | --- | --- | --- |
| `trace.capture.uploaded` | capture-server | inspect-worker (`trace.inspect.requested`) | 촬영 세트 9면 업로드 완료 | captureSetId, source(BOOTH·PHONE), needDetection, photos\[photoId, face, light, objectKey, sha256\] |
| `trace.inspect.completed` | inspect-worker | capture-server (`trace.capture.inspected`) | 정합·탐지·텍스처 완료 | captureSetId, alignments\[photoId, homography, errorPx\], defects\[photoId, class, polygon, confidence\], textureKeys, modelVersion |
| `trace.checkpoint.graded` | capture-server | report-server (`trace.report.updates`) | 이전 시점과 비교·등급 완료 | grade, ruleVersion, newDefectIds, unjudgeableFaces |
| `trace.diagnostics.recorded` | diagnostics-server | report-server (`trace.report.updates`) | 진단 저장·비교 완료 | runId, sha256, flags\[kind, detail\] |
| `trace.record.sealed` | report-server | web(SSE), auth-server 영수증 메일(trace.auth.receipts), 검색 색인(선택) | 해시 체인 봉인 | seq, checkpointType, grade, payloadHash, prevHash, signedAt |

공통 규칙

- **봉투:** 모든 이벤트에 `schemaVersion`, `eventId`(UUIDv7), `occurredAt`(ISO 8601 + 오프셋), `rentalId`, `checkpointId`를 넣습니다. JSON 필드는 camelCase입니다.
- **유실 방지:** 큐는 durable, 메시지는 persistent입니다. 발행하는 쪽도 시작할 때 큐를 선언합니다. 소비는 처리가 끝난 뒤 ack하고, 계속 실패하는 메시지는 `trace.dlx`로 보냅니다.
- **중복 안전:** 같은 `eventId`가 두 번 와도 결과가 같게 만듭니다(멱등). 집 PC가 처리 도중 꺼지면 같은 작업이 다시 오기 때문입니다.
- **집 PC 워커:** 꺼져 있는 동안 작업은 큐에 쌓이고, 켜지면 prefetch 1로 하나씩 처리합니다.
- **3DGS(실험):** `trace.recon.requested`·`trace.recon.completed`를 따로 둡니다. 30분을 넘길 수 있어서, 작업을 받자마자 ack하고 진행 상태는 DB에 기록합니다.

## 기술 스택과 선택 이유

언어는 세 개(Java·Python·TypeScript)로 나눠 각자 가장 강한 자리에 둡니다. 인프라는 학교 서버에 이미 있는 것만 씁니다.

| 영역 | 선택 | 이유 | 대안 |
| --- | --- | --- | --- |
| 백엔드 서버 | Java 21, Spring Boot 3, Spring Data JPA, Flyway | 팀이 가장 익숙하고, 게이트웨이·AMQP·JPA 생태계가 갖춰짐 | Kotlin |
| 게이트웨이 | Spring Cloud Gateway | 서비스와 같은 언어, JWT 필터·요청 제한을 직접 단 | Ingress만 사용 |
| AI 워커·학습 | Python 3.11, PyTorch, Ultralytics | YOLO·LightGlue·gsplat이 전부 Python | 없음 |
| 흠집 모델 | YOLO11-seg (폴리곤) | 길이·면적을 재서 등급과 3D 핀에 바로 씀, Jetson TensorRT 지원 | YOLO11 탐지(상자) |
| 면 정합 | 윤곽 4점 원근 보정 + SuperPoint·LightGlue | 노트북 면은 평면이라 호모그래피 하나로 맞음 | ORB(무늬 없는 상판에 약함) |
| 엣지 추론 | Jetson Orin Nano, TensorRT FP16 | 부스 현장에서 수 초 안에 판정 | 집 PC 원격 추론 |
| 웹 | React, TypeScript, Vite, React Three Fiber | 3D 트윈과 폰 카메라 화면을 한 앱에서 | Vue + TresJS |
| 메시지 | RabbitMQ | ack·재전달·DLX가 있는 작업 큐가 집 PC 워커에 맞음 | Redis Streams |
| 저장 | PostgreSQL, MinIO, Redis, InfluxDB, Elasticsearch | 학교 서버에서 이미 운영 중이고, 우리는 연결만 함 | 없음 |
| 배포 | Rancher(k8s), Argo CD, GitHub Actions, GHCR, Kustomize | 학교 표준이고, 커밋하면 자동 배포 | Docker Compose(폴백) |
| 품질 | SonarQube, gitleaks, pre-commit, Spec Kit | 세 명의 클로드 세션 코드를 같은 기준으로 맞춤 | 없음 |
| 진단 에이전트 | Python + PyInstaller | 설치 없는 단일 파일, OS 명령 호출이 쉬움 | Go(단일 바이너리, 학습 비용) |
| 라벨링 | Label Studio (직접 운영) | MinIO 직접 연동, 데이터 비공개 | Roboflow(무료는 데이터 공개) |

## 확장성

10/30 강사님 리뷰에서 확장성 이야기가 나와, 기기 관리를 보강하고 확장 지점을 정리했습니다. 서비스 분리와 버전 기록은 이미 열어 두었고, MVP 이후로 미룬 것은 바꿀 곳을 정해 두었습니다.

**리뷰 뒤 보강한 것 (기기 관리)**

- **기기 상태:** 사용 가능·수리 중·폐기. 폐기해도 행을 지우지 않아 이력이 남고, 수리 중·폐기 기기는 렌탈로 나가지 않습니다(FR-RNT-05).
- **기종 정보:** 치수에 제조사·형태(`form_factor`)·기준 사양(`spec`)을 더했습니다. 새 형태를 넣을 자리가 생겼습니다.
- **관리 API:** 기기 목록·검색, 기기 수정, 기종 목록. 시리얼은 기기 신원이라 등록 뒤 바꾸지 않습니다.
- **변경자:** 기기·기종을 누가 고쳤는지 `updated_by`에 남깁니다.

**이미 열어 둔 확장 지점**

| 늘어날 것 | 지금 설계 | 늘어날 때 하는 일 |
| --- | --- | --- |
| 서비스·소비자 | 서비스별 스키마, 서비스 간 FK 금지, 이벤트 `schemaVersion`·멱등 `eventId` | 새 서비스는 이벤트를 구독만 하면 됩니다 |
| API | `/api/v1`, gateway 경로 라우팅 | v2를 v1 옆에 둡니다 |
| 진단 항목 | 원본 JSON 보관, `agent_version`, 용량 단위 칸, 부품 `OTHER` + `detail` | 원본으로 다시 계산합니다 |
| 탐지 모델·등급 규칙 | `model_version`, `rule_version`, 데이터셋 버전 | 바꿔도 예전 결과가 어느 기준이었는지 남습니다 |
| 코드 값 | `codes.yaml` 한 곳 + DB CHECK 제약 | `codes.yaml`에 추가하고 마이그레이션 1개를 넣습니다 |

**MVP 이후로 미룬 것**

| 늘어날 것 | 지금 막히는 곳 | 바꿀 곳 |
| --- | --- | --- |
| 시점 종류(중간 점검·교환) | `checkpoint.type` 3종, 렌탈마다 종류별 1건 | 종류에 MID를 더하고, 고유 제약에 순번을 넣습니다 |
| 지점 | 지점 개념이 없고 부스 ID는 문자열 | 지점 테이블을 두고 기기·부스 자격에 지점 ID를 넣습니다 |
| 역할 | ADMIN·CUSTOMER 2개 | 역할을 권한 묶음으로 바꾸고 gateway 규칙을 권한 기준으로 바꿉니다 |
| 기기 형태(2-in-1·태블릿) | 촬영 면 9개와 3D 치수 4개가 노트북 기준 | `form_factor`별 촬영 면 목록과 3D 모델 파일을 둡니다 |
| OS 추가 | `os` CHECK가 rental·diagnostics 두 스키마에 있음 | 두 CHECK를 함께 바꾸고 에이전트에 수집기를 더합니다 |

## 리뷰에서 정할 것

1\~14번 모두 확정했습니다(5번은 회원가입 포함, 11번은 이메일 인증 포함으로 변경, 12번은 검증 QR 유지, 13번은 봉인 영수증 메일 추가). 강사님 리뷰에서 바뀌는 항목이 있으면 결정 열만 다시 바꿉니다.

| # | 정할 것 | 선택지 | 팀 제안 | 결정 |
| --- | --- | --- | --- | --- |
| 1 | SSD·벤치마크를 MVP 필수로 둘지 | 필수 / 배터리·스펙만 필수 | 필수. 권한이 없으면 SSD는 생략하고, 벤치마크가 흔들리면 참고값으로만 표시 | 확정 |
| 2 | 3D 방식 | 3D 트윈 필수 + 3DGS 실험 / 3D 트윈만 | 3D 트윈 필수, 3DGS는 W06 실험 결과로 판정 | 확정 |
| 3 | 시점 비교·등급을 어느 서비스에 둘지 | capture-server 안 / 별도 inspection-server | capture-server 안에 두고 스키마만 분리. 기능 서버 4개를 유지 | 확정 |
| 4 | 부스와 폰의 탐지 기준을 어떻게 맞출지 | 같은 학습 실행의 가중치만 배포 / 모델 분리 | 같은 가중치를 Jetson(TensorRT)과 집 PC(PyTorch)에 배포하고, 결과마다 modelVersion 기록 | 확정 |
| 5 | 인증 범위 | 관리자 계정 + 수령 토큰 / 회원가입까지 | 고객 회원가입 포함(이메일·비밀번호). 관리자는 초기 데이터로 생성 | 확정 |
| 6 | 웹 프레임워크 | React / Vue | React + React Three Fiber | 확정 |
| 7 | 진단 에이전트 첫 OS | macOS / Windows | 파일럿 17대의 기종·OS 조사 결과에서 많은 쪽 먼저 | 확정 |
| 8 | Elasticsearch 검색 | 선택 기능 유지 / MVP에서 제외 | 선택으로 두고, 11/10에 여유가 없으면 제외 | 확정 |
| 9 | 해시 체인 서명 | 서버 Ed25519 서명 포함 / 해시만 | 서명 포함. 키는 Rancher Secret에 보관 | 확정 |
| 10 | 인증 방식 | 자체 발급 JWT / 인증 서버(Keycloak) | 자체 발급 JWT(RS256). auth-server가 발급하고 gateway가 검증. 인증 서버는 새 인프라라 제외 | 확정  |
| 11 | 이메일 인증·비밀번호 재설정 | MVP에 포함(SMTP 연결) / 선택 기능으로 미룸 | MVP에 포함. 6자리 메일 코드(10분 만료), 팀 Gmail SMTP로 발송 | 확정 |
| 12 | 해시 체인 검증 QR | 회원가입이 생겼으니 빼기 / 유지 | 유지. 로그인은 누가 볼지를 정하고, 해시 체인은 업체도 기록을 못 고친다는 증명. QR 공개 페이지는 등급·시점·해시 일치만, 상세는 로그인 | 확정 |
| 13 | 봉인 영수증 메일 | 넣기 / 빼기 | 넣기. 봉인 때 지문을 고객 메일로 보내 업체도 몰래 못 고치게 함 | 확정 |
| 14 | PostgreSQL 위치 | 학교 공유 인프라 / Crowfoot 발급 스키마 / 클러스터에 직접 설치 | 클러스터에 직접 설치(StatefulSet + 영구 볼륨, 매일 MinIO 백업). 학교 PostgreSQL 접속 정보·권한을 받지 못해 PostgreSQL만 예외로 둠 | 확정 |
