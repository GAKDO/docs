# 작업 보드 (남은 작업)

기능 27개와 운영 할 일의 상태입니다. 각자의 Claude가 `/trace-standup`으로 자기 행만 고칩니다. 상태: `대기` → `진행` → `리뷰` → `완료`, 막히면 `막힘`.

## 기능

| ID | 레포 | 기능 | 담당 | 마감 | 상태 | 브랜치·PR | 막힌 점 | 갱신 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C1 | contracts | OpenAPI 5개 | A (B·C 리뷰) | 11/3 | 완료 | [PR #1](https://github.com/GAKDO/contracts/pull/1) 머지, ID→PublicId [PR #6](https://github.com/GAKDO/contracts/pull/6) 머지 |  | 11/02 |
| C2 | contracts | 진단 결과 JSON Schema v1 | A (B 리뷰) | 11/3 | 완료 | [PR #3](https://github.com/GAKDO/contracts/pull/3) 머지 |  | 11/02 |
| C3 | contracts | 이벤트 스키마 5종 | A | 11/3 | 완료 | [PR #2](https://github.com/GAKDO/contracts/pull/2) 머지, ID→PublicId [PR #6](https://github.com/GAKDO/contracts/pull/6) 머지 |  | 11/02 |
| BO1 | booth | 촬영 도구·부스 촬영 | B | 11/4 | 진행 | 머지 #2~#7·#9~#11·[#14](https://github.com/GAKDO/booth/pull/14)(URL 다시 받기·계약 0.6.0)·#13·#15·#16(Jetson 설치·MinIO 문서), jetson2 설치·trace-raw 접속·C920 두 대 확인. 남은 것: 거치대 장착 뒤 앞·뒤 매핑·카메라 고정값, REG01 시험 촬영, CA1 실제 연결 |  | 11/02 |
| ML3 | ml | Label Studio 연동 | B | 11/4 | 진행 | 머지 [#1](https://github.com/GAKDO/ml/pull/1)(setup·sync 명령)·[#6](https://github.com/GAKDO/ml/pull/6)·[#7](https://github.com/GAKDO/ml/pull/7)(스토리지 설정값·trace-labelstudio 키), 남은 것: 클러스터 Label Studio에서 실제 확인 |  | 11/02 |
| AU1 | auth_server | 로그인·JWT·자격 교환 | A | 11/5 | 완료 | [PR #1](https://github.com/GAKDO/auth_server/pull/1) 머지(QR 발급·렌탈 연결 포함), 설정 키 [gitops #1](https://github.com/GAKDO/gitops/pull/1) |  | 11/02 |
| GW1 | gateway | JWT 검증·역할×경로 | A | 11/5 | 완료 | [PR #1](https://github.com/GAKDO/gateway/pull/1) 머지, 남은 것: 클러스터 라우팅 확인·TRACE_WEB_ORIGIN 값 |  | 11/02 |
| RE1 | rental_server | 렌탈·기기·기종·시점 | A | 11/5 | 완료 | [PR #1](https://github.com/GAKDO/rental_server/pull/1) 머지 |  | 11/02 |
| CA1 | capture_server | 촬영 세트·사전 서명 URL | A | 11/6 | 완료 | [PR #1](https://github.com/GAKDO/capture_server/pull/1) 머지, 이벤트 설명 [contracts #7](https://github.com/GAKDO/contracts/pull/7). 남은 것: 학교 MinIO 체크섬 거절·CORS 한 번 확인(environment.md) |  | 11/02 |
| WE1 | web | 로그인·출고·반납·기기 관리 | C | 11/6 | 완료 | web #1·#2·#3·#4·#6·#17 머지(목 서버 기준) | 기종 등록 화면 11/6 뒤(기종 시드 A 11/4), 실서버 확인 대기 | 11/02 |
| ML1 | ml | 데이터셋 빌더·학습 기록 | A | 11/6 | 리뷰 | 머지 [#2](https://github.com/GAKDO/ml/pull/2)(설정·저장소·기록부)·[#3](https://github.com/GAKDO/ml/pull/3)(빌더)·[#4](https://github.com/GAKDO/ml/pull/4)(학습 기록), 남은 것: 집 PC에서 db init·v001 빌드(11/5 라벨링 뒤)·실제 학습 |  | 11/02 |
| BO2 | booth | Jetson 흠집 탐지 | B | 11/6 | 진행 | 머지 [#8](https://github.com/GAKDO/booth/pull/8)·[#12](https://github.com/GAKDO/booth/pull/12)·[#14](https://github.com/GAKDO/booth/pull/14)(결과 올리기, camera 필수·원본 px). 남은 것: Jetson 엔진 빌드·30초 실측 | 엔진 빌드에 pypi 되는 망·학습된 가중치 필요 | 11/02 |
| AG1 | agent | macOS 진단 에이전트 | B | 11/9 | 진행 | 머지 [#1](https://github.com/GAKDO/agent/pull/1)(수집·검증), [#2](https://github.com/GAKDO/agent/pull/2)(벤치마크·업로드), 남은 것: 팀 노트북 3대 실행·DI1 뒤 저장 확인 |  | 11/02 |
| DI1 | diagnostics_server | 진단 수신·저장 | A | 11/7 | 완료 | `claude/project-thread-png5yk` | 머지 [#1](https://github.com/GAKDO/diagnostics_server/pull/1)(업로드·리포트용 배터리·SSD 조회), 남은 것: AG1 실기 업로드 확인·deviceSerial 클레임 결정 | 11/02 |
| RP1 | report_server | 타임라인·해시 체인·검증 API | A | 11/7 | 완료 | [report_server #1](https://github.com/GAKDO/report_server/pull/1) 머지(타임라인·체인 Ed25519·자동/수동 봉인·공개/상세 검증·사진 재해시), [contracts #11](https://github.com/GAKDO/contracts/pull/11)(수동 봉인 API·codes 0.7.0), [gateway #6](https://github.com/GAKDO/gateway/pull/6) 머지. 남은 것: 핀·기종·maxCapacityPct는 계약 빈칸 결정 뒤(T013) | trace-secrets CHAIN_SIGNING_KEY(민서) | 11/02 |
| G1 | gitops | 로컬 Compose 폴백 | A | 11/7 | 리뷰 | 머지 [gitops #11](https://github.com/GAKDO/gitops/pull/11)(compose), [web #37](https://github.com/GAKDO/web/pull/37)(nginx /api·MinIO), [capture_server #5](https://github.com/GAKDO/capture_server/pull/5)(MINIO_PUBLIC_BASE). 남은 것: Docker 있는 기기에서 첫 `compose up`·세 시점 흐름 확인 | 세션에 Docker 없음(실기동 미확인), GHCR 비공개면 `docker login ghcr.io` 필요 | 11/02 |
| AU2 | auth_server | 회원가입·인증·재설정·탈퇴 | A | 11/8 | 대기 |  |  | 11/01 |
| RE2 | rental_server | 파일럿 등록 | A | 11/8 | 대기 |  |  | 11/01 |
| RP2 | report_server | 검사 진행률 SSE | A | 11/8 | 대기 |  |  | 11/01 |
| WE2 | web | 폰 수령 촬영 | C | 11/8 | 진행 | web #9·#11·#14·#19·#20·#23·#24(가입·메일 인증)·#27(페어링 코드·URL 다시 받기)·#28 머지 | 폰 해상도 요청(ideal 3840×2160·takePhoto, 축소 없이 4:3 자르기·EXIF 회전·최종 파일 해시), 업로드 nginx 경유 주소 반영 확인, 11/5 실서버 폰 시험 | 11/02 |
| AU3 | auth_server | 수령 QR·렌탈 연결·봉인 영수증 | A | 11/9 | 대기 |  |  | 11/01 |
| CA2 | capture_server | 검사 결과·시점 비교·등급 | A·C | 11/9 | 리뷰 | C 비교 모듈 #2·#4, A 부분 [#6](https://github.com/GAKDO/capture_server/pull/6) 머지, 후속 [#7](https://github.com/GAKDO/capture_server/pull/7)(/media) |  | 11/02 |
| DI2 | diagnostics_server | 점검 플래그·추이 | A | 11/9 | 대기 |  |  | 11/01 |
| ML2 | ml | inspect-worker | A | 11/9 | 리뷰 | 간소화: 정합 [#8](https://github.com/GAKDO/ml/pull/8) 머지, 워커 [#9](https://github.com/GAKDO/ml/pull/9). 남은 것: 집 PC 설치·자동 시작, 실제 부스·폰 사진 `align pair` 실측, 폰 탐지 모델(B 답 대기) | `claude/project-thread-gnyohx` | 11/02 |
| AG2 | agent | Windows 진단 에이전트 | B | 11/10 | 대기 |  |  | 11/01 |
| WE3 | web | 고객 화면·3D 리포트 | C | 11/10 | 진행 | web #10·#12·#13·#15·#16·#18(진행률 SSE)·#25(faces.md 방향)·#26(재설정·탈퇴) 머지 | 실서버(11/5 배포 뒤) 확인 | 11/02 |
| WE4 | web | 검증 페이지·파일럿 대시보드 | C | 11/10 | 진행 | web #7·#22·#30·#31(Grafana Docker Compose) 대시보드, #8 검증 페이지 머지(목 서버 기준) | 검증 페이지 실서버 확인(RP1 11/7 뒤), InfluxDB 버킷·토큰(A 확인 중) | 11/02 |

먼저 끝나야 할 것(의존 관계)은 [../speckit/backlog.md](../speckit/backlog.md)의 순서 표에 있습니다.

## 운영·설정 할 일

| 할 일 | 담당 | 마감 | 상태 | 메모 |
| --- | --- | --- | --- | --- |
| Claude GitHub 앱을 GAKDO 조직에 설치 | A | 11/2 | 완료 | 없으면 세션이 GAKDO 레포에 푸시하지 못함 |
| main·develop 보호 규칙 (PR·CI 필수) | A | 11/2 | 대기 | docs 레포는 스탠드업 때문에 직접 푸시 허용 |
| 조직 Secret·변수 (GITOPS_TOKEN, SONAR, 알림) | A | 11/3 | 대기 | cicd.md "처음 한 번 설정할 것" |
| SonarQube 프로젝트 `trace-<레포>`와 토큰 | A | 11/3 | 대기 | |
| 도메인 구매·HTTPS 인증서 | A | 11/2 | 대기 | 폰 촬영(WE2)의 전제 |
| Argo CD 등록, 클러스터 비밀 생성 | A | 11/4 | 대기 | gitops README |
| GHCR 패키지 공개 | A | 첫 이미지 뒤 | 대기 | |
| 연기 시험 변수 SMOKE_API_URL·SMOKE_WEB_URL | A | 클러스터 뜬 뒤 | 대기 | |
| Crowfoot TRACE 워크스페이스에 B·C 초대 | A | 11/3 | 대기 | 토큰은 각자 발급 |
| 코드 이름 확인 (L1~L4, CAM1·CAM2) | B | 11/3 | 완료 | codes.yaml 0.5.0·booth/README·ddl·booth·ml 값 일치(11/02), 폰 페이지는 코드 생기면 다시 |
| 대여 관리자에게 사진 보관·삭제 문구 전달 | A | 11/2 | 대기 | |
| IT Festival 경진대회 제출(신청서·과제설명서·동의서·통장 사본·5분 영상) | 전원 | 11/16 16:00 | 진행 | [contest/checklist.md](../contest/checklist.md), 증거는 [contest/evidence.md](../contest/evidence.md) |
