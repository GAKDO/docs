# 결정 기록

팀이 정한 것과 그 이유를 날짜순으로 적습니다. 리뷰 결정 1~14번의 선택지와 팀 제안 전문은 [design/mvp-design.md](design/mvp-design.md) 맨 아래 "리뷰에서 정할 것" 표에 있습니다.

## 리뷰 결정 1~14 (모두 확정)

| # | 정할 것 | 결정 |
|---|---|---|
| 1 | SSD·벤치마크를 MVP 필수로 둘지 | 필수. 권한이 없으면 SSD는 생략하고 사유를 남기며, 벤치마크가 흔들리면 참고값으로 표시 |
| 2 | 3D 방식 | 3D 트윈 필수, 3DGS는 실험으로 결과를 보고 판정 |
| 3 | 시점 비교·등급의 위치 | capture-server 안에 두고 스키마(inspection)만 분리 |
| 4 | 부스와 폰의 탐지 기준 | 같은 가중치를 Jetson(TensorRT)과 집 PC(PyTorch)에 배포하고 결과마다 modelVersion 기록 |
| 5 | 인증 범위 | 고객 회원가입 포함(이메일·비밀번호). 관리자는 초기 데이터로 생성 |
| 6 | 웹 프레임워크 | React + React Three Fiber |
| 7 | 진단 에이전트 첫 OS | 파일럿 노트북 조사에서 많은 쪽 먼저 |
| 8 | Elasticsearch 검색 | 선택 기능으로 두고, 11/10에 여유가 없으면 제외 |
| 9 | 해시 체인 서명 | 서버 Ed25519 서명 포함. 키는 Rancher Secret |
| 10 | 인증 방식 | 자체 발급 JWT(RS256). auth-server가 발급하고 gateway가 검증 |
| 11 | 이메일 인증·비밀번호 재설정 | MVP에 포함. 6자리 메일 코드(10분 만료), 팀 Gmail SMTP |
| 12 | 해시 체인 검증 QR | 유지. QR 공개 페이지는 등급·시점·해시 일치만, 상세는 로그인 |
| 13 | 봉인 영수증 메일 | 넣기. 봉인 때 지문을 고객 메일로 보내 업체도 몰래 고치지 못하게 함 |
| 14 | PostgreSQL 위치 | 클러스터에 직접 설치(StatefulSet + 영구 볼륨, 매일 MinIO 백업). 학교 PostgreSQL 접속 정보·권한을 받지 못해 PostgreSQL만 예외 |

## 10/30

**담당 재분배.** A에게 일이 몰려 독립된 덩어리 두 개를 넘겼습니다. 진단 에이전트(FR-DIA-01~05, NFR-02)는 B, 검증 QR 페이지(FR-INT-02)는 C. 서버·해시 체인·집 PC·인프라 같은 핵심은 A에 남겼습니다. 규칙: 화면은 C, 서버 API는 A(회원 화면도 C).

**진단 결과 JSON v0 원칙** (다른 서비스 조사 결과, [design/diagnostics-json-v0.md](design/diagnostics-json-v0.md))
- 배터리 용량은 값과 단위를 함께 보낸다. macOS는 mAh, Windows는 mWh라 환산하지 않는다.
- 읽지 못한 항목은 0이 아니라 null + "생략" 사유.
- 벤치마크는 3회 중앙값과 측정 조건. 전원이 연결되지 않으면 돌리지 않는다.
- 컴퓨터 이름·사용자 이름 같은 개인정보는 보내기 전에 지운다.
- 어느 시점의 진단인지는 본문이 아니라 페어링 토큰에서 서버가 정한다.

**macOS 실제 출력 확인** (MacBook Air M2). `system_profiler -json`에는 배터리 mAh와 SSD 수명 값이 없어 `ioreg`·`smartctl`로 따로 읽어야 합니다. 맥·Windows의 남은 키 확인은 에이전트 담당 B가 11/6 착수 때 합니다(키 이름은 에이전트 내부 구현이라 11/3 JSON 형식 고정에는 영향 없음).

**강사님 리뷰: 확장성.** 기기 관리에 빈 곳이 있어 보강했습니다.
- 관리 화면이 쓸 기기 목록 API가 없었음 → 기기 목록·검색, 기기 수정, 기종 목록 API 추가.
- 기기 상태가 없었음 → 사용 가능·수리 중·폐기(FR-RNT-05). 수리 중·폐기 기기로 렌탈을 만들면 409, 폐기해도 행은 남김.
- 기종 정보가 치수뿐 → 제조사·형태·기준 사양 추가.
- 누가 바꿨는지 → `updated_by`.
- 진단 기록은 `checkpoint_id`로 이미 기기에 이어져 칸을 늘리지 않고, 대신 시리얼은 등록 뒤 바꾸지 못하게 함.

**우선순위.** 요구사항 50개를 모두 필수로 두고 일정이 밀려도 빼지 않습니다. 가장 큰 위험은 팀 Gmail 발송에 기대는 3개(이메일 인증·비밀번호 재설정·봉인 영수증)라 Gmail 계정을 먼저 준비합니다.

**포트와 노출.** 학교 서버의 개인 포트 범위에서 NodePort로 엽니다(지난 블로그 프로젝트에서 같은 방식 확인). gateway 8314, web 8315, label-studio 8316.

**HTTPS가 필수.** 폰 웹앱은 카메라를 쓰고, 브라우저는 HTTP에서 카메라를 막습니다. 11/2에 도메인을 사서 DNS 인증으로 인증서를 받습니다. 도메인은 편의가 아니라 수령 촬영의 전제 조건입니다.

**PostgreSQL을 클러스터에.** 학교 PostgreSQL 접속 정보와 스키마 생성 권한을 받지 못했고, Crowfoot이 내어 주는 DB는 발급 한 번에 스키마 하나라 서비스별 스키마 7개 구조와 맞지 않아 클러스터에 직접 설치하기로 했습니다(리뷰 결정 14). 강사님이 처음에 "클러스터 안에 인프라 이미지를 띄우지 말라"고 하셨기 때문에 이유를 남겨 둡니다. 데이터는 매일 MinIO로 백업하고, 밖으로 열지 않습니다.

## 10/31

**Crowfoot ERD v1.** 새 워크스페이스 TRACE에 ERD를 만들었습니다(테이블 30개, 관계 18개). Crowfoot 문서에는 PostgreSQL 스키마 개념이 없어 서비스별 스키마 7개를 그룹으로 표현했습니다. 요구사항 55개(설계서 50개 + 공통 규칙 5개)를 등록해 46개를 테이블에 연결했고, 테이블이 원래 없는 9개(FR-DAT-02·03, FR-OPS-01, NFR-01~06)는 반영 대기로 남습니다.

**레포 구성: 서버마다 레포.** 처음에는 서버 6개를 한 레포(Gradle 멀티 모듈)로 묶자고 제안했지만, MSA답게 서버마다 레포를 두기로 했습니다. 레포는 모두 12개이고, 팀 조직 안이라 이름에 `trace-` 접두사를 붙이지 않습니다. 레포가 나뉘어 생기는 중복은 공통 라이브러리 없이 줄입니다.
- 요청·응답 타입은 `contracts`의 OpenAPI로 생성한다.
- 오류 응답은 Spring 기본 ProblemDetail을 쓴다.
- JWT 검증은 각 서버가 Spring Security 리소스 서버 설정으로 auth-server의 JWKS를 읽는다.

**빌드와 CI/CD: 블로그 것을 가져온다.** 블로그(AIGJ-01-002-blog/devlog)에서 쓰던 CI/CD를 TRACE 레포 전부에 옮겼습니다. 블로그 `backend-ci`(Maven·JaCoCo 40%·SonarQube)를 그대로 쓰려고 서버 빌드 도구는 Maven으로 정했습니다. 버전은 Java 21, Spring Boot 3.5.7, gateway는 Spring Cloud 2025.0.3입니다. 배포만 블로그와 다릅니다. 블로그는 GitHub Actions가 SSH 터널로 학교 서버의 k3d에 직접 배포했지만, TRACE는 강사님 지시대로 학교에 이미 설치된 Rancher 클러스터와 Argo CD를 씁니다. Actions는 이미지와 gitops 태그까지만 만들고, 실제 반영은 Argo CD가 합니다. 자세한 내용은 [cicd.md](cicd.md)에 있습니다.

**서버 레포 이름은 `_server`.** 레포를 만든 뒤 서버 5개의 레포 이름을 `auth-server` → `auth_server`처럼 바꿨습니다. 쿠버네티스 리소스 이름에는 밑줄을 쓸 수 없어서, 클러스터 안 서비스·이미지(`ghcr.io/gakdo/auth-server`)·gitops 이름은 하이픈 그대로 둡니다. 배포 워크플로가 레포 이름의 `_`를 `-`로 바꿔 gitops 이미지 태그를 갱신합니다.

**배포 방식: SSH 직접 배포를 쓰지 않는 이유.** 블로그는 Actions가 SSH 터널로 우리가 만든 k3d에 kubectl로 배포했지만, TRACE는 강사님 조건대로 학교 Rancher 클러스터와 Argo CD를 씁니다. 둘을 같이 두면 Argo CD 자동 동기화(selfHeal)가 Actions의 변경을 되돌려 서로 덮어쓰고, SSH 방식은 서버 비밀번호를 GitHub에 둬야 합니다. 블로그 배포의 연기 시험·자동 롤백은 Argo CD 방식으로 옮겼습니다(아래).

**연기 시험·자동 롤백을 Argo CD 방식으로.** 블로그의 `smoke.sh`·`kubectl rollout undo`를 그대로 쓰면 Argo CD selfHeal과 부딪혀서, 이미지에 커밋 SHA를 넣고(`/ping`의 `commit`, web `/version.txt`) gitops 커밋 뒤 바깥 주소에서 그 SHA가 보이는지 최대 12분 확인합니다. 안 보이면 방금 올린 gitops 커밋을 `git revert`해 Argo CD가 직전 버전으로 돌리게 합니다. 조직 변수 `SMOKE_API_URL`·`SMOKE_WEB_URL`을 넣어야 켜집니다. 자세한 내용은 [cicd.md](cicd.md#연기-시험과-자동-롤백).

**문서는 이 레포에.** 팀이 나눈 내용을 GAKDO/docs에 모읍니다. 설계 원본은 Claude 문서와 Crowfoot이고, 이 레포는 그 사본과 결정 기록입니다.

## 11/1

**부스는 1개.** 출고·반납 부스와 학습 데이터 촬영을 부스 하나로 합니다. 학습 사진과 운영 사진이 같은 카메라·조명에서 나와 조건이 맞습니다. 폼보드 2장으로 기둥 2개와 빔을 만들고 C920 2대를 빔에 매다는 설계이고, 조명 전환과 노트북 회전은 손으로 합니다. 설계서의 "부스 × 2", 릴레이, 턴테이블 항목은 이 결정으로 바뀝니다.

**코드 값 추가.** 부스 설계에 맞춰 조명 L4(앞쪽 스침광, 키보드 촬영)를 더하고, 부스 카메라를 CAM1(앞 반)·CAM2(뒤 반)로 나눴습니다. `contracts/codes.yaml` 0.2.0과 [db/V1__init.sql](db/V1__init.sql)의 CHECK 제약을 함께 고쳤습니다. 11/3 계약 고정 전에 바꾼 것입니다.

**구현은 Spec Kit으로.** 남은 구현은 GitHub Spec Kit(specify-cli 1.2.5)으로 명세 → 계획 → 작업 → 구현 순서로 진행합니다. 팀원은 Claude 프로젝트(베타)에서 레포마다 세션을 열고 기능 하나씩 끝냅니다. 모든 레포에 같은 헌법([speckit/constitution.md](speckit/constitution.md))을 두고, 요구사항 50개를 기능 27개로 나눈 목록은 [speckit/backlog.md](speckit/backlog.md)에 있습니다. 클라우드 세션에는 Docker가 없어 Testcontainers 테스트는 GitHub Actions에서만 돕니다. 부스 Jetson이 Python 3.10이라 booth 레포의 설치 조건을 3.10으로 낮췄습니다.

**스탠드업은 docs에, Claude가 읽고 쓴다.** 팀원 모두 Claude로 개발하므로 코드 컨벤션([team/conventions.md](team/conventions.md)), 작업 보드([team/board.md](team/board.md)), 날짜별 스탠드업(team/standup/)을 docs에 두고, 모든 레포의 `/trace-standup` 스킬이 세션 시작·끝에 읽고 자기 칸만 고칩니다. 스탠드업은 자주 바뀌어서 docs 레포는 PR 없이 main에 바로 올립니다.

**구현현황은 Google 시트로, Claude가 end 때 체크한다.** 지난 프로젝트처럼 기능별 작동 여부와 구현율을 한눈에 보도록 Google 시트를 둡니다. 작업 상태의 원본은 [team/board.md](team/board.md)이고, 시트는 실제로 동작을 확인한 기능만 체크하는 요약판입니다. 편집 권한은 팀원 계정에만 주고 공개 레포에는 링크를 적지 않습니다. 각자 Google Drive·Sheets 커넥터를 연결하면 `/trace-standup`이 시트를 제목으로 찾아 읽고, 확인받은 뒤 체크합니다.

## 11/2

**API 계약은 서버별 OpenAPI 5개 + 공통 파일.** C1에서 rest-api-v0의 경로 41개와 ping 5개를 `contracts/openapi/<서버>-server.yaml`로 옮기고, Problem Details·커서 목록·인증 방식은 `openapi/components/common.yaml` 한 곳에 둡니다. 코드 값은 codes.yaml이 원본이고 OpenAPI용 enum(`codes.gen.yaml`)은 스크립트로 만들며, CI가 둘이 어긋나지 않는지 검사합니다. 역할·범위는 operation마다 `x-trace-access`로 적어 gateway 테스트가 그대로 읽습니다.

**오류 code는 codes.yaml에, 목록은 모두 커서.** 화면이 오류 문장을 미리 정할 수 있도록 Problem Details의 `code` 값을 codes.yaml `error_code`로 고정했습니다(예: 렌탈 생성 409를 `RENTAL_OPEN_EXISTS`와 `DEVICE_NOT_ACTIVE`로 구분). rest-api-v0에서 `GET /devices`만 `page`였던 것을 다른 목록처럼 커서로 맞췄습니다. codes.yaml은 0.3.0(값 추가만)입니다.

**촬영 세트의 필수 면은 출처별로, 빠진 선택 면은 사유와 함께.** 세트 완료(`/captures/sets/{setId}/complete`)는 codes.yaml `capture.face_required`의 면이 모두 있어야 받고, 빠지면 409 `CAPTURE_FACES_MISSING`(빠진 면 목록 포함)입니다. 부스는 8면(SCR1 화면 흰색은 선택)이고, 폰은 TOP·BOT·SF·SB·SL·SR·SCR0 7면입니다(KB는 찍지 않고 SCR1은 선택, 11/2 민서 확정·C 확인, contracts codes.yaml 0.5.0 PR #5). 폰으로 SCR1을 찍을 때의 조명 코드(ROOM 또는 OFF)는 C가 WE2 명세에서 정합니다. 찍지 못한 선택 면은 완료 요청의 `skippedFaces`에 면 → 사유로 적습니다. 세트 생성 응답의 업로드 URL 목록에는 `camera`를 넣고 요청 사진과 같은 순서로 돌려줍니다. 두 가지 모두 B가 촬영 프로그램(BO1) 설계 중 짚었습니다. 부스는 같은 면·조명을 CAM1·CAM2로 두 장 올려 주소를 구분할 수 없었고, 9면을 모두 요구하면 SCR1을 건너뛴 정상 세트가 거절됐습니다.

**패스 2 조명은 면마다 L1·L2 한 장씩.** 패스 2는 CAM1을 노트북 앞 책상에 세우고 찍을 면을 늘 카메라 쪽으로 돌립니다. 왼쪽 L2는 그 면을 옆에서 스치듯 비춰 긁힘·찍힘을 드러내고, L1은 고르게 비춰 오염·변색을 드러냅니다. L3는 노트북 뒤에서 카메라 쪽으로 빛이 들어와(역광) 뺍니다. 조명 셋을 모두 쓰면 한 대에 15장이 넘어 20분 목표를 지키기 어렵습니다. B의 촬영 프로그램(BO1) 설계 중 질문으로 정했습니다.

**SCR0은 화면 꺼짐, SCR1은 화면 흰색이고 SCR1은 선택.** SCR0은 화면을 끈 채 유리·베젤의 긁힘·얼룩을, SCR1은 화면을 켜 전체를 흰색으로 띄워 불량 화소·빛샘·얼룩을 봅니다. SCR1은 조명을 모두 끄고(OFF) 찍습니다. 빌린 노트북은 로그인 없이 흰 화면을 띄우기 어려울 수 있어 SCR1을 선택 면으로 두고, 건너뛰면 사유를 남깁니다. 세트 완료 검사는 필수 8면만 봅니다. `contracts/codes.yaml` 0.3.0에 출처별 필수 면 `face_required`(부스 8면)를 더했습니다. DB에는 건너뛴 면과 사유를 담는 `capture.capture_set.skipped_faces`(jsonb)를 더하고, 위 카메라 2대가 같은 면·조명을 찍으므로 `capture.photo`의 고유 키를 (세트, 면, 조명, 카메라)로 고쳤습니다(설계서 DDL 탭, Crowfoot, db/V1__init.sql, design/ddl.md).

**기둥 간격은 빔에 맞춘다.** 도면대로 기둥을 노트북 가운데에서 앞뒤 45cm에 세우면 90cm 빔이 홈에 반밖에 걸리지 않습니다. 빔을 두 홈에 먼저 끼운 채 기둥 간격을 맞춥니다(기둥 안쪽 면 사이 약 88cm).

**진단 결과 JSON은 `diag.v1` 한 파일, 생략해도 키는 남긴다.** C2에서 [design/diagnostics-json-v0.md](design/diagnostics-json-v0.md) 초안을 `contracts/diagnostics/result.schema.json`으로 고정했습니다. 배터리·SSD를 읽지 못하면 키를 빼지 않고 값은 null, `status: SKIPPED`와 `skippedReason`(NO_PERMISSION·UNSUPPORTED·TOOL_ERROR)을 둡니다. 받는 쪽이 늘 같은 형태를 보게 하려는 것입니다. 전원이 연결되지 않으면 벤치마크는 빈 배열과 `benchmarkSkippedReason: NO_AC_POWER`입니다. macOS 배터리 판정은 원문("Good") 대신 NORMAL·SERVICE_RECOMMENDED로 바꿔 보냅니다. 정해진 필드 밖의 키는 모두 거부해 컴퓨터 이름·사용자 이름이 섞여 들어오지 못하게 했고, 업로드 API(`DiagnosticUpload`)는 이 스키마를 그대로 참조합니다. codes.yaml은 0.4.0(진단 값 추가만)입니다.

**이벤트는 이벤트 5종, 봉투는 모두 같다.** C3에서 `trace.events`의 이벤트 5종을 `contracts/events/trace.*.schema.json`으로 고정했습니다. 모든 이벤트에 `schemaVersion`("1.0")·`eventId`(UUIDv7)·`occurredAt`·`rentalId`·`checkpointId`가 들어갑니다. 스키마는 모르는 필드를 거부해 발행하는 쪽의 오타를 막고, 받는 쪽은 모르는 필드를 무시해 필드가 늘어나도(부 버전) 깨지지 않게 합니다. 서비스끼리는 REST를 부르지 않으므로, 받는 쪽이 일하는 데 필요한 필드는 설계서 표보다 더 넣었습니다. 예를 들어 `trace.checkpoint.graded`에 사진 해시 목록을 넣어 report-server가 해시 체인을 만들 수 있게 했습니다. 이렇게 더한 필드는 `events/README.md`에 적었습니다.

**봉투의 rentalId는 요청과 토큰으로 받는다.** 부스 토큰은 부스 단위이고 AGENT 토큰에는 시점만 들어 있어, capture-server와 diagnostics-server가 이벤트에 넣을 rentalId를 얻을 곳이 없었습니다. 그래서 `POST /captures/sets` 요청 본문에 `rentalId`를 넣었습니다. 촬영 JWT로 올릴 때는 토큰의 rentalId와 같아야 합니다. `POST /auth/pairing-codes`도 렌탈과 시점을 함께 받고, AGENT JWT에 rentalId 클레임을 넣습니다. 이벤트를 하나 더 만드는 방법(시점 열림 이벤트)도 있었지만 이벤트 5종 규칙을 지키려고 택하지 않았습니다. 11/3 계약 고정 전에 민서가 정했습니다.

**ID는 내부 bigint, 밖에는 NanoID.** 강사님(marco) 피드백입니다. 모든 ID를 UUID로 두지 말고 기본은 정수 id를 쓰고, 밖에 보여야 하는 곳만 NanoID를 쓰라고 하셨습니다. 그래서 테이블 30개의 기본 키를 `bigint GENERATED BY DEFAULT AS IDENTITY`로 바꿨습니다. 인덱스가 작고(8바이트, UUID는 16바이트) 순서대로 쌓여 삽입이 빠르며, 디버깅 때 읽기 쉽습니다. 대신 순번은 +1로 넘겨짚을 수 있어 밖에 내보내지 않습니다. API 경로·응답, 이벤트, JWT `sub`, URL에 나가는 9개 테이블(기기·렌탈·시점·파일럿 참여자·촬영 세트·사진·흠집·진단 실행·계정)에는 `public_id varchar(21) UNIQUE`(NanoID, URL에 안전한 글자 21자, 앱에서 생성)를 둡니다. 다른 서버의 행은 FK 없이 그 `public_id`를 값으로 둡니다. 이벤트 `eventId`도 NanoID입니다. 계약(OpenAPI·이벤트 스키마)의 `Uuid`는 `PublicId`(`^[A-Za-z0-9_-]{21}$`)로 바꿨고([contracts PR #6](https://github.com/GAKDO/contracts/pull/6)), 헌법은 1.1.0입니다. 부스 `boothId`·`clientId`는 사람이 읽는 코드라 그대로 둡니다. 실제 PostgreSQL 16에서 V1 스키마가 그대로 만들어지는 것을 확인했습니다.

**gateway는 역할과 경로의 렌탈 ID까지만 막고, 시점·부스 범위는 서버가 다시 본다.** GW1에서 gateway는 contracts `x-trace-access`를 생성 스크립트로 `access-policy.yaml`에 옮겨 그대로 씁니다(손으로 고치지 않음). 촬영 JWT는 role CUSTOMER에 `scope`(checkpointId) 클레임이 있는 토큰으로 가르고, `captureToken: false` 경로에서는 403입니다. 경로에 `{rentalId}`가 있으면 `rentals`(촬영 JWT는 `rentalId`) 클레임과 비교해 403 `OUT_OF_SCOPE`를 냅니다. `{checkpointId}`·`{setId}`·본문의 checkpointId·부스 범위는 서버끼리 묻지 않는다는 규칙 때문에 gateway가 알 수 없어, 각 서버(CA1·DI1·RP1)가 토큰으로 다시 확인합니다. 로그인과 페어링 코드 교환은 IP당 분당 10회(Redis `trace:gw:rl:*`)이고, 실패만 세지 않고 시도를 셉니다. Redis가 죽으면 제한만 꺼지고 로그인은 됩니다. 기본 RequestRateLimiter는 429 본문이 비고 키 접두사를 못 바꿔 작은 필터로 대신했습니다. CORS는 `TRACE_WEB_ORIGIN`만 허용합니다(gateway PR #1).

**AU1이 토큰을 만드는 경로를 모두 맡는다.** QR 교환(FR-AUTH-02)은 발급 없이 시험할 수 없어 QR 링크 발급(FR-RNT-04)과 렌탈 연결(FR-USR-02)까지 AU1에서 만들었습니다. AU3에는 봉인 영수증 메일만 남습니다. 함께 정한 것: 리프레시 토큰은 Redis `trace:auth:refresh:{원문의 SHA-256}`에 계정 publicId(7일)와 계정별 집합, 쓰면 교체합니다. `JWT_PRIVATE_KEY`는 PKCS#8 PEM을 base64 한 줄로 넣고 kid는 RFC 7638 지문입니다. 관리자·부스는 trace-secrets의 `ADMIN_EMAIL`·`ADMIN_PASSWORD`, `BOOTH_CLIENT_ID`·`BOOTH_CLIENT_SECRET`로 없을 때만 만듭니다. 페어링 코드에는 publicId가 없어 AGENT JWT의 `sub`는 checkpointId입니다. 촬영 JWT(CUSTOMER + scope)는 일반 고객 경로(/me·로그아웃·QR 교환)를 쓰지 못합니다. auth_server V2로 `pairing_code.rental_id`를 더했습니다(auth_server PR #1, 11/2 민서 "묻지 말고 진행" 지시로 추천안 채택).

**시점 상태는 rental-server가 이벤트로 받는다.** RE1에서 시점 순서(앞 시점이 SEALED여야 다음 시점 시작)와 종료(반납 봉인 뒤)를 지키려면 rental-server가 시점 상태를 알아야 하는데, 설계서 이벤트 표에 rental-server 소비자가 없었습니다. 이벤트를 새로 만들지 않고 rental-server가 `trace.events`에 자기 큐 `trace.rental.checkpoints`를 붙여 `trace.capture.uploaded`(→CAPTURED, occurredAt)·`trace.checkpoint.graded`(→GRADED)·`trace.record.sealed`(→SEALED, 반납이면 렌탈 RETURNED)를 받습니다. 스키마·라우팅 키는 그대로라 계약 변경이 아니고, 상태는 앞으로만 바뀌어 같은 이벤트가 다시 와도 결과가 같습니다. 렌탈은 반납이 봉인되면 RETURNED, 관리자가 종료하면 CLOSED이고, RETURNED는 진행 중이 아니므로 그 기기로 새 렌탈을 만들 수 있습니다. 계속 실패한 메시지는 `trace.dlx`(topic)에 dead-letter 키 `<큐>.dead`로 보내 각자 DLQ에 모읍니다. 다른 서버도 `trace.dlx`를 topic으로 선언해 주세요(타입이 다르면 선언이 실패). 민서가 묻지 말고 진행하라고 해 추천안으로 정했습니다(RE1, 11/2).

**데이터셋 버전은 사진을 복사하지 않고, 기기 분할은 DB 한 곳에서 고정한다.** ML1에서 `trace-datasets/<버전>/`에는 YOLO 라벨·`data.yaml`·`manifest.json`만 두고 사진은 `trace-raw` 키와 SHA-256으로 가리킵니다. 학습 때 받으면서 해시를 대조해 원본이 바뀌었으면 멈춥니다(버킷 용량 절약, 원본은 ML3에서 읽기 전용). 기기 분할은 `ml.dataset_device`가 원본이고, 사람이 `trace-ml dataset device add <기기> --split TEST`로 먼저 정하며, 정하지 않은 기기는 빌드 때 기기 수 기준 70/15/15에서 가장 모자란 쪽으로 배정됩니다. 버전에 한 번 쓰인 기기의 분할은 바꿀 수 없습니다. 같은 버전은 DB 고유 제약·버킷 접두사 확인·`If-None-Match` 조건부 쓰기로 덮어쓰지 못합니다. 빈 제출과 "흠집 없음 + 폴리곤" 제출은 빌드를 멈춥니다. 학습 결과는 `trace-models/<버전>/<실행>/`(best.pt·best.onnx·metrics.json·run.json)와 `ml.training_run`에 남고, 객체 메타데이터에도 데이터셋 버전을 적습니다. 집 PC는 `kubectl port-forward`로 DB에 붙습니다(ml PR #2·#3·#4).

**촬영 세트 해시는 저장소가 막고 서버가 다시 본다.** CA1에서 사전 서명 PUT URL에 `Content-Type`과 `x-amz-checksum-sha256`(알린 SHA-256의 base64)을 서명해 넣어, 응답 `headers`를 그대로 실어 올리지 않거나 다른 파일을 올리면 MinIO가 거절합니다. 완료(`/complete`) 때는 HeadObject 체크섬으로 다시 대조하고, 체크섬이 없으면 내려받아 계산합니다(서버는 사진 본문을 받지 않음). 필수 면은 그 면으로 알린 사진(부스 조명·카메라 조합)이 모두 올라가야 있는 것으로 보고, 알렸지만 올리지 않은 선택 면은 `skippedFaces` 사유가 없으면 400입니다. 완료는 `Idempotency-Key`를 세트 행에 저장해 한 번만 처리하고, 이벤트는 채널 트랜잭션으로 DB 커밋과 함께 보냅니다. 이벤트 봉투 rentalId를 위해 `capture.capture_set.rental_id`, 멱등을 위해 `completion_key`·`completion_request_sha256`·`completion_response`, 업로드 확인을 위해 `capture.photo.uploaded`를 더했습니다(design/ddl.md, db/V1__init.sql, capture_server PR #1). 민서의 "묻지 말고 진행" 지시로 추천안을 택했습니다(CA1, 11/2).

**컨테이너 이미지는 사라진 Docker Hub 저장소에 기대지 않는다.** `minio/minio`는 Docker Hub에서 받을 수 없게 돼(pull access denied) capture_server CI가 실패했습니다. 시험용 S3는 `mirror.gcr.io/motoserver/moto:5.1.16`(Google 미러)으로 바꿨고, moto가 체크섬 거절을 하지 않는 부분은 학교 MinIO에서 한 번 확인합니다([environment.md](environment.md) "학교 MinIO 한 번 확인"). G1 로컬 Compose의 MinIO는 `quay.io/minio/minio`의 고정 RELEASE 태그를 쓰고, 받지 못하면 gitops pg-backup의 `pgsty/mc`와 같은 곳의 `pgsty/minio`로 바꿉니다. 다른 이미지도 `latest` 대신 고정 태그를 씁니다. 두 레지스트리에서 실제로 받히는지는 세션에서 확인할 수 없어 G1 첫 `compose up`에서 확인합니다. contracts 이벤트 `trace.capture.uploaded`의 objectKey 설명 "trace-raw"는 문구 오류라 trace-captures로 고쳤습니다(contracts PR #7, 문구만). 민서가 "전부 추천대로"로 정했습니다(11/2).

**CI/CD를 블로그와 같게 켰고, 머지는 PR + CI + 승인.** 블로그 CI/CD를 옮길 때 워크플로 파일만 넣고 조직 설정이 비어 있었습니다. 그래서 CodeRabbit은 리뷰하지 않았고, SonarQube는 CI가 초록인 채로 분석을 건너뛰고 있었습니다(점검 스크립트로 확인). 11/2에 CodeRabbit을 GAKDO에 설치하고, SonarQube User Token(이슈·핫스팟 조회까지 되게)과 GITOPS_TOKEN(gitops 쓰기만)을 조직 Secret에 넣어 서버 6개 첫 분석이 성공했습니다. 12개 레포 main·develop에 PR 필수 + 필수 검사 + 승인 1명(contracts 2명)을 걸었고, 관리자(민서)는 규칙에서 뺐습니다. 필수 검사가 문서만 바뀐 PR에서 '대기'로 멈추지 않도록 PR CI의 문서 경로 필터를 뺐습니다(push는 그대로). 자세한 것은 [cicd.md](cicd.md).

**팀 질문 8개는 11/3 계약 고정 전에 정했다.** B·C가 A에게 물은 것을 하나씩 정했고, 계약에 걸리는 것은 contracts PR 하나로 묶었습니다(Detection.camera, URL 다시 받기, 폐기 되돌리기 오류 코드, 면 방향 문서, Influx 이름, 세트 문구). 이미 해결돼 있던 것: gateway CORS credentials는 켜져 있고(GW1), ID는 PublicId로 바뀌었고(contracts PR #6), 학교 Grafana 사용은 10/30 승인 범위입니다.

**부스 탐지는 원본 px + 카메라로 보내고, 펼치기는 워커 한 곳에서.** 부스는 CAM1·CAM2가 같은 면·조명을 찍어 탐지 결과가 어느 사진 것인지 알 수 없었고, 표준 좌표로 보내려면 Jetson도 정합을 해야 했습니다. Detection에 camera(필수)를 넣고 좌표는 원본 사진 px로 받습니다. inspect-worker가 trace.inspect.completed로 사진별 호모그래피를 주면 capture-server가 표준 좌표로 바꿉니다(defect.photo_polygon → polygon). 정합 코드가 두 벌이면 시점 사이 좌표가 어긋나 기존 흠집이 신규로 잡힐 수 있어서입니다.

**업로드 URL은 세트째 다시 만들지 않고 남은 것만 다시 받는다.** 세트는 다 찍은 뒤 SHA-256과 함께 만들어지므로 10분은 업로드 시간인데, 끊겼다 다시 올리기가 10분을 넘으면 세트를 새로 만들어 전부 다시 올리고 옛 세트가 남았습니다. POST /captures/sets/{setId}/uploads가 아직 안 올라간 사진의 URL만 새로 줍니다(부스·폰 공통).

**폐기한 기기는 수리 중으로만 되돌린다.** 폐기 기기가 점검 없이 다시 렌탈로 나가지 않게, RETIRED → ACTIVE는 409 DEVICE_STATUS_TRANSITION_INVALID입니다(codes.yaml 0.6.0). 화면(WE1)은 이미 이렇게 만들었고, rental-server에 규칙을 더합니다.

**면 방향은 계약 문서로 고정한다.** 펼친 이미지의 위·왼쪽이 정해지지 않아 3D에서 뒤집히거나 시점 비교가 어긋날 수 있었습니다. contracts/capture/faces.md에 면별 방향(바깥에서 본 모습, 원점 왼쪽 위)과 배율(1 px = 0.25 mm)을 적었습니다. BOT은 앞 모서리를 들어 뒤로 넘기는 한 방향으로만 뒤집습니다.

**회원 화면은 C, 데모 계정은 A.** 회원가입·이메일 인증 화면은 WE2(QR → 가입·인증 → 촬영 흐름), 비밀번호 재설정·탈퇴 화면은 WE3에 넣습니다. 50개 요구사항은 모두 필수라 빼지 않고, 시연이 메일 발송에 매달리지 않게 인증 완료된 데모 고객 계정을 환경 변수로 만듭니다(AU1 후속). 폰 SCR1 조명은 C가 WE2 명세에서 ROOM으로 정했습니다.

**기종 시드는 마이그레이션으로, CA2는 나눠서.** 기종 등록 화면이 11/6 뒤라 맥북·그램 기종을 rental-server V2 마이그레이션으로 넣습니다(치수 4개, 본체·상판 두께는 B 실측). CA2는 C가 시점 비교 모듈, A가 저장·판정 불가 면·등급과 연결을 맡습니다.

**InfluxDB 이름은 C 제안을 확정, 별칭은 뺀다.** contracts/diagnostics/influx.md(trace_battery, trace_benchmark). 서비스끼리 REST를 부르지 않으므로 alias 태그는 쓰지 않고, 별칭은 Grafana 값 매핑으로 보여 줍니다.
