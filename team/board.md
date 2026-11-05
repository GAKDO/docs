# 작업 보드 (남은 작업)

기능 27개와 운영 할 일의 상태입니다. 각자의 Claude가 `/trace-standup`으로 자기 행만 고칩니다. 상태: `대기` → `진행` → `리뷰` → `완료`, 막히면 `막힘`.

## 11/3 MVP 재조정 (강사님 리뷰, 민서 승인)

11/9까지 https://gakdo.site(강사님 nginx → 학교 서버 8315)에 최소 MVP를 띄운다. 흐름: 부스 태블릿에서 검사 기다리는 기기 탭 → BOT·TOP × L1·L2·L3 × CAM1·CAM2 = 12장 → Jetson YOLO11-seg 판정 → capture-server 빠른 검사(QUICK) 등급 → web /admin 결과. 계획: 민서의 계획 페이지(비공개), 팀원 메시지 `notices/2026-11-03-mvp-rescope-team-message.md`, 아키텍처·포트 `notices/2026-11-03-architecture-ports.md`(프로젝트 파일).

| 단계 | 기능 |
| --- | --- |
| MVP(11/9) | BO1·BO2(빠른 검사 모드 11/5, B), CA1·CA2(QUICK 세트 [capture_server #10](https://github.com/GAKDO/capture_server/pull/10) 머지), C 계약 추가 [contracts #20](https://github.com/GAKDO/contracts/pull/20)(profile·photoDefects·analyzedPhotos·graded 1.2 compared), AU1·GW1·RE1, WE1 + /admin 결과 화면(C), ML1·ML3(집 PC 학습만), G1(Compose 앱 5개 [gitops #14](https://github.com/GAKDO/gitops/pull/14)) |
| 2단계(11/10~12) | RP1·RP2 해시 체인 재도입 → 반납 비교, WE2 폰 촬영, WE3·WE4, ML2(집 PC 상시 워커 대신 Jetson·학교 서버) |
| 3단계 | DI1·AG1·Grafana·9면 전체 세트 |
| 중단 | 클러스터(Rancher·Argo CD·Cloudflare·trace-secrets), AU2 서버·AU3·RE2·DI2·AG2 |

- MVP는 렌탈 하나에 출고 검사 1번(민서 11/3 결정). 봉인(RP1)이 없으면 다음 시점이 409라 반납 비교는 2단계.
- 조명(11/4 도착): L1 VIJIM VL49(앞 기둥 위, 손으로 켜고 끔), L2·L3 USB LED 바(왼쪽·뒤쪽, 스위치 허브). 놓는 법은 booth capture/README.
- 기기 선택은 목록 탭(빌린 노트북이라 스티커·QR 안 붙임). QR 카드는 2단계 선택.

## 기능

| ID | 레포 | 기능 | 담당 | 마감 | 상태 | 브랜치·PR | 막힌 점 | 갱신 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C1 | contracts | OpenAPI 5개 | A (B·C 리뷰) | 11/3 | 완료 | [PR #1](https://github.com/GAKDO/contracts/pull/1) 머지, ID→PublicId [PR #6](https://github.com/GAKDO/contracts/pull/6) 머지, **1.0.0 고정** [#16](https://github.com/GAKDO/contracts/pull/16) main·태그 v1.0.0 |  | 11/03 |
| C2 | contracts | 진단 결과 JSON Schema v1 | A (B 리뷰) | 11/3 | 완료 | [PR #3](https://github.com/GAKDO/contracts/pull/3) 머지, **1.0.0 고정** [#16](https://github.com/GAKDO/contracts/pull/16) main·태그 v1.0.0 |  | 11/03 |
| C3 | contracts | 이벤트 스키마 5종 | A | 11/3 | 완료 | [PR #2](https://github.com/GAKDO/contracts/pull/2) 머지, ID→PublicId [PR #6](https://github.com/GAKDO/contracts/pull/6) 머지, **1.0.0 고정** [#16](https://github.com/GAKDO/contracts/pull/16) main·태그 v1.0.0 |  | 11/03 |
| BO1 | booth | 촬영 도구·부스 촬영 | B | 11/4 | 진행 | 머지 #2~#7·#9~#11·[#14](https://github.com/GAKDO/booth/pull/14)(URL 다시 받기·계약 0.6.0)·#13·#15·#16(Jetson 설치·MinIO 문서), jetson2 설치·trace-raw 접속·C920 두 대 확인. 남은 것: 거치대 장착 뒤 앞·뒤 매핑·카메라 고정값, REG01 시험 촬영, CA1 실제 연결. #17~#20(실시간 보기·카메라 값 확인·조명별 프리셋, CAM1=usb 2.3·CAM2=2.4)·#21(MVP 12장 목록)·#22(11/4 조명 안내) 머지(11/03). 빠른 검사 모드 [#23](https://github.com/GAKDO/booth/pull/23)·[#24](https://github.com/GAKDO/booth/pull/24) 머지(11/03), 남은 것: 11/4 조명 도착 뒤 MVP 학습 촬영, 11/4 배포 뒤 실서버 목록·올리기 확인 11/04: jetson2 env 넣고 로그인·기다리는 기기 목록·빠른 검사 시작 확인, [#32](https://github.com/GAKDO/booth/pull/32)(부스 코드 입력, A) 리뷰. 남은 것: 조명 놓고 MVP 학습 촬영, 실서버 12장 올리기 11/05: MVP 학습 촬영 진행 중, 카메라를 USB 2.1·2.2로 옮김(어제 2.3·2.4), 실서버 첫 QUICK 세트 오늘 |  | 11/05 |
| ML3 | ml | Label Studio 연동 | B | 11/4 | 진행 | 머지 [#1](https://github.com/GAKDO/ml/pull/1)(setup·sync 명령)·[#6](https://github.com/GAKDO/ml/pull/6)·[#7](https://github.com/GAKDO/ml/pull/7)(스토리지 설정값·trace-labelstudio 키)·[#14](https://github.com/GAKDO/ml/pull/14)(640 타일 학습·Jetson용 ONNX·model.json·집 PC 안내서), 남은 것: 11/4~5 집 PC 로컬 Label Studio에서 실제 라벨 → v001 빌드·학습 11/04: 학습 기기 분할 정함(TRAIN MBA M2·그램, VAL Dell) |  | 11/04 |
| AU1 | auth_server | 로그인·JWT·자격 교환 | A | 11/5 | 완료 | [PR #1](https://github.com/GAKDO/auth_server/pull/1) 머지(QR 발급·렌탈 연결 포함), 설정 키 [gitops #1](https://github.com/GAKDO/gitops/pull/1) |  | 11/02 |
| GW1 | gateway | JWT 검증·역할×경로 | A | 11/5 | 완료 | [PR #1](https://github.com/GAKDO/gateway/pull/1) 머지, 11/3 [#7](https://github.com/GAKDO/gateway/pull/7)(부스 렌탈 목록 허용) 머지. 학교 서버(Compose)에서 TRACE_WEB_ORIGIN=https://gakdo.site |  | 11/03 |
| RE1 | rental_server | 렌탈·기기·기종·시점 | A | 11/5 | 완료 | [PR #1](https://github.com/GAKDO/rental_server/pull/1) 머지, 11/3 [#6](https://github.com/GAKDO/rental_server/pull/6)(치수 상한)·[#7](https://github.com/GAKDO/rental_server/pull/7)(상세 시리얼·목록 지금 시점)·[#8](https://github.com/GAKDO/rental_server/pull/8)(부스 렌탈 목록, OPEN만)·[#9](https://github.com/GAKDO/rental_server/pull/9) 머지 |  | 11/03 |
| CA1 | capture_server | 촬영 세트·사전 서명 URL | A | 11/6 | 완료 | [PR #1](https://github.com/GAKDO/capture_server/pull/1) 머지, 이벤트 설명 [contracts #7](https://github.com/GAKDO/contracts/pull/7). 남은 것: 학교 MinIO 체크섬 거절·CORS 한 번 확인(environment.md) |  | 11/02 |
| WE1 | web | 로그인·출고·반납·기기 관리 | C | 11/6 | 완료 | web #1·#2·#3·#4·#6·#17 머지(목 서버 기준) | 기종 등록 화면 11/6 뒤(기종 시드 A 11/4), 실서버 확인 대기 | 11/02 |
| ML1 | ml | 데이터셋 빌더·학습 기록 | A | 11/6 | 리뷰 | 머지 [#2](https://github.com/GAKDO/ml/pull/2)(설정·저장소·기록부)·[#3](https://github.com/GAKDO/ml/pull/3)(빌더)·[#4](https://github.com/GAKDO/ml/pull/4)(학습 기록), 집 PC 준비 끝(11/2 밤): D:\trace\ml, CUDA torch(4070 Ti), trace-trainer 키 버킷 접근, 로컬 PostgreSQL `db init` 표 3개, [#11](https://github.com/GAKDO/ml/pull/11)·[#12](https://github.com/GAKDO/ml/pull/12). 남은 것: 11/5 로컬 Label Studio 라벨링 → v001 빌드·학습 |  | 11/03 |
| BO2 | booth | Jetson 흠집 탐지 | B | 11/6 | 진행 | 머지 [#8](https://github.com/GAKDO/booth/pull/8)·[#12](https://github.com/GAKDO/booth/pull/12)·[#14](https://github.com/GAKDO/booth/pull/14)(결과 올리기, camera 필수·원본 px)·[#25](https://github.com/GAKDO/booth/pull/25)(torch 없이 TensorRT 직접 추론, build-engine·bench). 남은 것: v001 ONNX로 jetson2 엔진 빌드·버튼→판정 실측(목표 15초, 기준 30초) 11/6. 11/04: 시험 엔진(yolo11n-seg) 빌드 약 6분, bench 장당 0.13초 | 학습된 가중치(v001) 필요 | 11/04 |
| AG1 | agent | macOS 진단 에이전트 | B | 11/9 | 진행 | 머지 [#1](https://github.com/GAKDO/agent/pull/1)(수집·검증), [#2](https://github.com/GAKDO/agent/pull/2)(벤치마크·업로드), [#3](https://github.com/GAKDO/agent/pull/3)(벤치마크 수정, A 요청). 11/3 재조정으로 3단계 보관 |  | 11/03 |
| DI1 | diagnostics_server | 진단 수신·저장 | A | 11/7 | 완료 | `claude/project-thread-png5yk` | 머지 [#1](https://github.com/GAKDO/diagnostics_server/pull/1)(업로드·리포트용 배터리·SSD 조회), [#2](https://github.com/GAKDO/diagnostics_server/pull/2)(AGENT 토큰 deviceSerial 대조·배터리 생략 사유, [contracts #13](https://github.com/GAKDO/contracts/pull/13)·[auth_server #5](https://github.com/GAKDO/auth_server/pull/5)), 남은 것: AG1 실기 업로드 확인·웹 페어링 화면 시리얼 | 11/02 |
| RP1 | report_server | 타임라인·해시 체인·검증 API | A | 11/7 | 완료 | [report_server #1](https://github.com/GAKDO/report_server/pull/1) 머지(타임라인·체인 Ed25519·자동/수동 봉인·공개/상세 검증·사진 재해시), [contracts #11](https://github.com/GAKDO/contracts/pull/11)(수동 봉인 API·codes 0.7.0), [gateway #6](https://github.com/GAKDO/gateway/pull/6) 머지. 11/2 이벤트 1.1(핀·기종·maxCapacityPct): [contracts #14](https://github.com/GAKDO/contracts/pull/14)·[capture_server #8](https://github.com/GAKDO/capture_server/pull/8)·[rental_server #5](https://github.com/GAKDO/rental_server/pull/5)·[diagnostics_server #3](https://github.com/GAKDO/diagnostics_server/pull/3)·[report_server #2](https://github.com/GAKDO/report_server/pull/2) 머지 | trace-secrets CHAIN_SIGNING_KEY(민서) | 11/02 |
| G1 | gitops | 로컬 Compose 폴백 | A | 11/7 | 리뷰 | 머지 [gitops #11](https://github.com/GAKDO/gitops/pull/11)(compose), [web #37](https://github.com/GAKDO/web/pull/37)(nginx /api·MinIO), [capture_server #5](https://github.com/GAKDO/capture_server/pull/5)(MINIO_PUBLIC_BASE). 학교 서버 첫 기동 11/2 밤: 11개 서비스 Up·web 8315 200, [gitops #13](https://github.com/GAKDO/gitops/pull/13)(호스트 포트 변수·`init-env.sh`, MinIO 19000). 기본 기동 MVP 앱 5개 [gitops #14](https://github.com/GAKDO/gitops/pull/14), 공개 주소 gakdo.site [gitops #15](https://github.com/GAKDO/gitops/pull/15). **11/3 학교 서버 재배포 + https://gakdo.site 개통**(강사님 nginx·Let's Encrypt, web 4352458·rental 509c0c9·capture af290e9, 관리자 로그인 확인). 남은 것: 부스 끝에서 끝(출고 시점 → 12장 → /admin) | GHCR 비공개라 서버에서 `docker login ghcr.io` 함 | 11/03 |
| AU2 | auth_server | 회원가입·인증·재설정·탈퇴 | A | 11/8 | 대기 |  |  | 11/01 |
| RE2 | rental_server | 파일럿 등록 | A | 11/8 | 대기 |  |  | 11/01 |
| RP2 | report_server | 검사 진행률 SSE | A | 11/8 | 대기 |  |  | 11/01 |
| WE2 | web | 폰 수령 촬영 | C | 11/8 | 진행 | web #9·#11·#14·#19·#20·#23·#24(가입·메일 인증)·#27(페어링 코드·URL 다시 받기)·#28 머지 | 폰 해상도 요청(ideal 3840×2160·takePhoto, 축소 없이 4:3 자르기·EXIF 회전·최종 파일 해시), 업로드 nginx 경유 주소 반영 확인, 11/5 실서버 폰 시험 | 11/02 |
| AU3 | auth_server | 수령 QR·렌탈 연결·봉인 영수증 | A | 11/9 | 대기 |  |  | 11/01 |
| CA2 | capture_server | 검사 결과·시점 비교·등급 | A·C | 11/9 | 완료 | C 비교 모듈 #2·#4, A 부분 [#6](https://github.com/GAKDO/capture_server/pull/6) 머지, 후속 [#7](https://github.com/GAKDO/capture_server/pull/7)(/media) 머지 |  | 11/02 |
| DI2 | diagnostics_server | 점검 플래그·추이 | A | 11/9 | 대기 |  |  | 11/01 |
| ML2 | ml | inspect-worker | A | 11/9 | 리뷰 | 간소화: 정합 [#8](https://github.com/GAKDO/ml/pull/8) 머지, 워커 [#9](https://github.com/GAKDO/ml/pull/9) 머지, 기종별 치수·폰 탐지(A 담당, 부스와 같은 모델) [#10](https://github.com/GAKDO/ml/pull/10) 머지. 집 PC: SSH 키·터널 준비(학교 서버 Compose 5672·19000). 남은 것: worker.env·손으로 띄우기·자동 시작, 실제 부스·폰 사진 `align pair` 실측, 학습 가중치로 폰 탐지 확인 | `claude/project-thread-gnyohx` | 11/03 |
| AG2 | agent | Windows 진단 에이전트 | B | 11/10 | 완료 | 머지 [#4](https://github.com/GAKDO/agent/pull/4)(Windows 수집기·배터리 리포트 대체·smartctl 없는 SSD), MacBook Air·갤럭시 북·ASUS ROG 실행 확인. 3단계 보관(배포 안 함) |  | 11/04 |
| WE3 | web | 고객 화면·3D 리포트 | C | 11/10 | 진행 | web #10·#12·#13·#15·#16·#18(진행률 SSE)·#25(faces.md 방향)·#26(재설정·탈퇴) 머지 | 실서버(11/5 배포 뒤) 확인 | 11/02 |
| WE4 | web | 검증 페이지·파일럿 대시보드 | C | 11/10 | 진행 | web #7·#22·#30·#31(Grafana Docker Compose) 대시보드, #8 검증 페이지 머지(목 서버 기준) | 검증 페이지 실서버 확인(RP1 11/7 뒤), InfluxDB 버킷·토큰(A 확인 중) | 11/02 |

먼저 끝나야 할 것(의존 관계)은 [../speckit/backlog.md](../speckit/backlog.md)의 순서 표에 있습니다.

## 운영·설정 할 일

| 할 일 | 담당 | 마감 | 상태 | 메모 |
| --- | --- | --- | --- | --- |
| Claude GitHub 앱을 GAKDO 조직에 설치 | A | 11/2 | 완료 | 없으면 세션이 GAKDO 레포에 푸시하지 못함 |
| main·develop 보호 규칙 (PR·CI 필수) | A | 11/2 | 대기 | docs 레포는 스탠드업 때문에 직접 푸시 허용 |
| 조직 Secret·변수 (GITOPS_TOKEN, SONAR, 알림) | A | 11/3 | 대기 | cicd.md "처음 한 번 설정할 것" |
| SonarQube 프로젝트 `trace-<레포>`와 토큰 | A | 11/3 | 진행 | 11/3 SonarQube FAIL 리팩터링 별도 스레드에서 진행 중 |
| 도메인 구매·HTTPS 인증서 | A | 11/2 | 완료 | 11/3 gakdo.site → 강사님 nginx(Let's Encrypt), Cloudflare는 DNS만. 폰 촬영(WE2)의 전제 |
| Argo CD 등록, 클러스터 비밀 생성 | A | 11/4 | 대기 | gitops README |
| GHCR 패키지 공개 | A | 첫 이미지 뒤 | 대기 | |
| 연기 시험 변수 SMOKE_API_URL·SMOKE_WEB_URL | A | 클러스터 뜬 뒤 | 대기 | |
| Crowfoot TRACE 워크스페이스에 B·C 초대 | A | 11/3 | 대기 | 토큰은 각자 발급 |
| 코드 이름 확인 (L1~L4, CAM1·CAM2) | B | 11/3 | 완료 | codes.yaml 0.5.0·booth/README·ddl·booth·ml 값 일치(11/02), 폰 페이지는 코드 생기면 다시 |
| 대여 관리자에게 사진 보관·삭제 문구 전달 | A | 11/2 | 대기 | |
| IT Festival 경진대회 제출(신청서·과제설명서·동의서·통장 사본·5분 영상) | 전원 | 11/16 16:00 | 진행 | [contest/checklist.md](../contest/checklist.md), 증거는 [contest/evidence.md](../contest/evidence.md) |
