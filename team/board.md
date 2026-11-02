# 작업 보드 (남은 작업)

기능 27개와 운영 할 일의 상태입니다. 각자의 Claude가 `/trace-standup`으로 자기 행만 고칩니다. 상태: `대기` → `진행` → `리뷰` → `완료`, 막히면 `막힘`.

## 기능

| ID | 레포 | 기능 | 담당 | 마감 | 상태 | 브랜치·PR | 막힌 점 | 갱신 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C1 | contracts | OpenAPI 5개 | A (B·C 리뷰) | 11/3 | 완료 | [PR #1](https://github.com/GAKDO/contracts/pull/1) 머지, ID→PublicId [PR #6](https://github.com/GAKDO/contracts/pull/6) 머지 |  | 11/02 |
| C2 | contracts | 진단 결과 JSON Schema v1 | A (B 리뷰) | 11/3 | 완료 | [PR #3](https://github.com/GAKDO/contracts/pull/3) 머지 |  | 11/02 |
| C3 | contracts | 이벤트 스키마 5종 | A | 11/3 | 완료 | [PR #2](https://github.com/GAKDO/contracts/pull/2) 머지, ID→PublicId [PR #6](https://github.com/GAKDO/contracts/pull/6) 머지 |  | 11/02 |
| BO1 | booth | 촬영 도구·부스 촬영 | B | 11/4 | 진행 | 머지 [#2](https://github.com/GAKDO/booth/pull/2)·[#3](https://github.com/GAKDO/booth/pull/3)·[#4](https://github.com/GAKDO/booth/pull/4)·[#5](https://github.com/GAKDO/booth/pull/5)(업로드)·[#6](https://github.com/GAKDO/booth/pull/6)(capture/README)·[#7](https://github.com/GAKDO/booth/pull/7)(publicId), 남은 것: Jetson 실기·출고·반납 모드 |  | 11/02 |
| ML3 | ml | Label Studio 연동 | B | 11/4 | 진행 | 머지 [#1](https://github.com/GAKDO/ml/pull/1)(setup·sync 명령), 남은 것: 클러스터 Label Studio에서 실제 확인(A 배포 뒤) |  | 11/02 |
| AU1 | auth_server | 로그인·JWT·자격 교환 | A | 11/5 | 진행 | `claude/project-thread-tht1mn` (specs/001-login-jwt-credentials) |  | 11/02 |
| GW1 | gateway | JWT 검증·역할×경로 | A | 11/5 | 완료 | [PR #1](https://github.com/GAKDO/gateway/pull/1) 머지, 남은 것: 클러스터 라우팅 확인·TRACE_WEB_ORIGIN 값 |  | 11/02 |
| RE1 | rental_server | 렌탈·기기·기종·시점 | A | 11/5 | 리뷰 | [PR #1](https://github.com/GAKDO/rental_server/pull/1) CI 대기 |  | 11/02 |
| CA1 | capture_server | 촬영 세트·사전 서명 URL | A | 11/6 | 대기 |  |  | 11/01 |
| WE1 | web | 로그인·출고·반납·기기 관리 | C | 11/6 | 대기 |  |  | 11/01 |
| ML1 | ml | 데이터셋 빌더·학습 기록 | A | 11/6 | 대기 |  |  | 11/01 |
| BO2 | booth | Jetson 흠집 탐지 | B | 11/6 | 진행 | [PR #8](https://github.com/GAKDO/booth/pull/8)(타일 추론·중복 제거) 리뷰 중, 남은 것: Jetson 엔진 빌드·30초 실측, 결과 올리기 | 결과 올리기: detections에 camera 없음·좌표 기준 A에게 질문 | 11/02 |
| AG1 | agent | macOS 진단 에이전트 | B | 11/9 | 진행 | 머지 [#1](https://github.com/GAKDO/agent/pull/1)(수집·검증), [#2](https://github.com/GAKDO/agent/pull/2)(벤치마크·업로드), 남은 것: 팀 노트북 3대 실행·DI1 뒤 저장 확인 |  | 11/02 |
| DI1 | diagnostics_server | 진단 수신·저장 | A | 11/7 | 대기 |  |  | 11/01 |
| RP1 | report_server | 타임라인·해시 체인·검증 API | A | 11/7 | 대기 |  |  | 11/01 |
| G1 | gitops | 로컬 Compose 폴백 | A | 11/7 | 대기 |  |  | 11/01 |
| AU2 | auth_server | 회원가입·인증·재설정·탈퇴 | A | 11/8 | 대기 |  |  | 11/01 |
| RE2 | rental_server | 파일럿 등록 | A | 11/8 | 대기 |  |  | 11/01 |
| RP2 | report_server | 검사 진행률 SSE | A | 11/8 | 대기 |  |  | 11/01 |
| WE2 | web | 폰 수령 촬영 | C | 11/8 | 대기 |  |  | 11/01 |
| AU3 | auth_server | 수령 QR·렌탈 연결·봉인 영수증 | A | 11/9 | 대기 |  |  | 11/01 |
| CA2 | capture_server | 검사 결과·시점 비교·등급 | A·C | 11/9 | 대기 |  |  | 11/01 |
| DI2 | diagnostics_server | 점검 플래그·추이 | A | 11/9 | 대기 |  |  | 11/01 |
| ML2 | ml | inspect-worker | A | 11/9 | 대기 |  |  | 11/01 |
| AG2 | agent | Windows 진단 에이전트 | B | 11/10 | 대기 |  |  | 11/01 |
| WE3 | web | 고객 화면·3D 리포트 | C | 11/10 | 대기 |  |  | 11/01 |
| WE4 | web | 검증 페이지·파일럿 대시보드 | C | 11/10 | 대기 |  |  | 11/01 |

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
| 코드 이름 확인 (L1~L4, CAM1·CAM2) | B | 11/3 | 대기 | 촬영 도구·폰 페이지 |
| 대여 관리자에게 사진 보관·삭제 문구 전달 | A | 11/2 | 대기 | |
