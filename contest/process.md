# 개발 과정 기록 (2026.10.30 ~ 2026.11.16)

TRACE를 18일 동안 어떤 순서로 만들었는지 날짜순으로 남깁니다. 날마다의 자세한 기록은 [team/standup/](../team/standup/), 결정과 이유는 [decisions.md](../decisions.md), 기능별 상태는 [team/board.md](../team/board.md)에 있습니다. 제출한 발표 영상과 PPT는 [presentation/](presentation/README.md)에 있습니다.

## 한눈에 보기

| 기간 | 단계 | 끝난 것 |
|---|---|---|
| 10/30 ~ 11/1 | 설계 | 요구사항 50개, 기능 27개, 레포·담당 나누기, 부스 설계 |
| 11/2 ~ 11/3 | 계약 고정과 첫 배포 | 계약 1.0.0, 서버 뼈대, 부스 1호기, https://gakdo.site 개통 |
| 11/4 ~ 11/6 | 데이터와 기능 채우기 | 노트북 15대 촬영, 라벨링, 회원·진단·봉인 영수증 |
| 11/7 ~ 11/9 | 모델과 사람 검수 | v001 → v004, AI 후보를 사람이 확정하는 방식, MVP 마감 |
| 11/10 ~ 11/12 | 완성도 | 새 부스, 자동 배포, 다시 학습하는 흐름, 보안 점검, 현장 설문 |
| 11/13 ~ 11/16 | 촬영과 제출 | 코드 프리즈, 시연 촬영, 발표 PPT·영상, 제출 |

## 날짜별 기록

### 10/30 ~ 11/1 설계

- 요구사항 50개를 정하고 기능 27개로 나눴습니다. 담당은 A 서버·인프라·AI 학습, B 부스·진단 에이전트, C 웹 화면입니다([design/mvp-design.md](../design/mvp-design.md), [speckit/backlog.md](../speckit/backlog.md)).
- 강사님 리뷰에서 기기 관리의 빈 곳(기기 목록·상태·기종 정보)을 지적받아 설계에 넣었습니다([decisions.md](../decisions.md) 10/30).
- 계약(API·이벤트·진단 JSON·코드 값)을 contracts 레포 한 곳에 두고, 레포마다 Spec Kit으로 명세 → 계획 → 작업 → 구현 순서를 지키기로 했습니다.
- 폰 웹앱이 카메라를 쓰려면 HTTPS가 필요해서 도메인을 먼저 준비했습니다.

### 11/2 ~ 11/3 계약 고정과 첫 배포

- 부스 1호기를 만들고 첫 촬영을 했습니다([booth/README.md](../booth/README.md)).
- 계약: OpenAPI 5개([contracts #1](https://github.com/GAKDO/contracts/pull/1)), 이벤트 스키마([#2](https://github.com/GAKDO/contracts/pull/2)), 진단 JSON Schema([#3](https://github.com/GAKDO/contracts/pull/3))를 올리고 11/3에 1.0.0으로 고정했습니다([#16](https://github.com/GAKDO/contracts/pull/16)).
- 서버: gateway([#1](https://github.com/GAKDO/gateway/pull/1)), auth-server([#1](https://github.com/GAKDO/auth_server/pull/1)), rental-server([#1](https://github.com/GAKDO/rental_server/pull/1)), capture-server([#1](https://github.com/GAKDO/capture_server/pull/1)), diagnostics-server([#1](https://github.com/GAKDO/diagnostics_server/pull/1)), report-server([#1](https://github.com/GAKDO/report_server/pull/1))의 첫 기능을 머지했습니다.
- 11/3 강사님 리뷰로 범위를 다시 잡았습니다. 먼저 "부스에서 12장 촬영 → Jetson 판정 → 관리자 화면"이 끝까지 도는 최소 MVP를 띄우고, 해시 체인·폰 수령·진단은 그다음 단계로 넣기로 했습니다([team/board.md](../team/board.md)).
- 쿠버네티스 클러스터 대신 학교 서버의 Docker Compose로 정하고([gitops #11](https://github.com/GAKDO/gitops/pull/11)·[#14](https://github.com/GAKDO/gitops/pull/14)), 11/3에 https://gakdo.site 를 열었습니다.

### 11/4 ~ 11/6 데이터와 기능 채우기

- 11/4 조명이 도착해 부스 조명 3단계(L1·L2·L3)를 정했습니다. 부스 화면을 단계형으로 바꾸고(booth #28~#31), SonarQube 지적을 정리했습니다.
- 11/5 빌린 MacBook Air M2 15대를 하루 동안 67회 촬영했습니다. 검증용 3대는 기기 통째로 따로 뒀습니다(학습 12대, 검증 3대).
- 11/6 키보드·옆면까지 촬영하고 Label Studio로 흠집 영역을 그리기 시작했습니다. 집 PC에서 AI Hub 데이터로 사전학습을 마쳤습니다.
- 11/6 회원 가입·메일 인증([auth_server #7](https://github.com/GAKDO/auth_server/pull/7)), 봉인 영수증 메일([#8](https://github.com/GAKDO/auth_server/pull/8)), 진단 점검 플래그·추이([diagnostics_server #7](https://github.com/GAKDO/diagnostics_server/pull/7))를 머지했습니다.
- 진단 에이전트: macOS([agent #1](https://github.com/GAKDO/agent/pull/1)·[#2](https://github.com/GAKDO/agent/pull/2))에 이어 Windows([#4](https://github.com/GAKDO/agent/pull/4))를 넣고, 실제 MacBook Air에서 페어링 코드 → 업로드 → 렌탈 상세 표시까지 확인했습니다.

### 11/7 ~ 11/9 모델과 사람 검수

- 11/7 첫 모델 v001을 학습했습니다. AI Hub 사전학습만으로는 깨끗한 면까지 흠집으로 봤고(기기 면 2/6), 부스 사진으로 미세조정하자 6/6이 됐습니다. 모델은 mAP가 아니라 "이 면에 흠집이 있나"로 고르기로 했습니다([metrics/M3.md](metrics/M3.md), [ml #21](https://github.com/GAKDO/ml/pull/21)).
- 11/8 증강을 넣은 모델은 흠집을 더 많이 찾았지만 먼지와 테이프 반사도 흠집으로 잡았습니다. 그래서 판정 방식을 "AI는 후보를 넓게, 사람이 확정한 것만 등급·봉인"으로 바꿨습니다([contracts #32](https://github.com/GAKDO/contracts/pull/32), [capture_server #19](https://github.com/GAKDO/capture_server/pull/19), [web #87](https://github.com/GAKDO/web/pull/87), [booth #48](https://github.com/GAKDO/booth/pull/48)).
- 11/8 고객 폰 사진을 검사하는 inspect-worker를 학교 서버로 옮기고([ml #25](https://github.com/GAKDO/ml/pull/25), [gitops #18](https://github.com/GAKDO/gitops/pull/18)), 레포 9곳의 보안 점검 결과를 고쳤습니다. 반납 리포트의 전후 비교를 3D로 바꾸고, 로그인 없이 보는 보유 노트북 목록을 넣었습니다.
- 11/9 라벨을 보완하고 건너뛴 사진 처리 오류를 고친 v004를 대회 모델로 정했습니다([ml #32](https://github.com/GAKDO/ml/pull/32)). 검증 사진에서 잘못 잡은 사진이 48장에서 15장으로 줄었습니다. 학교 서버와 부스 Jetson에 같은 버전을 올리고, 실서버에서 빠른 검사와 관리자 검수를 리허설했습니다.

| 모델 | 바꾼 것 | 결과 | 판단 |
|---|---|---|---|
| AI Hub 사전학습만 | 없음 | 기기 면 2/6, 깨끗한 면까지 흠집으로 봄 | 부스 사진으로 미세조정 필요 |
| v001 | 부스 사진으로 미세조정 | 기기 면 6/6 | 첫 대회 모델 |
| v002 증강 | 증강 6종 | 흠집은 더 찾지만 잘못 잡은 사진 48장 | 사람 검수를 넣는 계기 |
| v004 | 키보드·옆면 라벨, 오류 수정, 증강 | 흠집 있는 면 4/4, 잘못 잡은 사진 15장 | 지금 모델 |

측정 조건이 판마다 다른 곳이 있어 자세한 표는 [metrics/M3.md](metrics/M3.md)를 봐 주세요.

### 11/10 ~ 11/12 완성도

- 부스를 다시 설계해 새로 만들었습니다(폼보드와 암막, 위 카메라 2대와 옆 카메라 1대, 재료비 약 10만 원). 먼저 만든 부스는 예비로 둡니다.
- 부스 촬영 한 단계가 약 5초 걸리던 것을 카메라를 열어 두는 방식으로 0.3~0.5초로 줄였습니다([booth #61](https://github.com/GAKDO/booth/pull/61)).
- 검수 결과를 다음 학습 데이터로 돌려보내는 흐름을 만들었습니다(`trace-ml review export`, [ml #28](https://github.com/GAKDO/ml/pull/28)·[#36](https://github.com/GAKDO/ml/pull/36)·[#37](https://github.com/GAKDO/ml/pull/37)). 대회까지 모델은 v004로 유지했고, 지금까지의 개선은 사람이 라벨을 고쳐 다시 학습한 결과입니다.
- 서버 6개가 SonarQube 품질 게이트를 통과했습니다. 학교 서버에 자동 배포를 넣었고([gitops #27](https://github.com/GAKDO/gitops/pull/27), [gateway #21](https://github.com/GAKDO/gateway/pull/21)), 교체하는 동안 보낸 요청 564회에서 실패가 없었습니다. 백업과 장애 알림도 넣었습니다([gitops #25](https://github.com/GAKDO/gitops/pull/25)).
- 진단 에이전트를 한 줄 명령으로 설치하게 하고(agent #9~#12), 보안 프로그램 상태 점검을 더했습니다([contracts #46](https://github.com/GAKDO/contracts/pull/46), [agent #15](https://github.com/GAKDO/agent/pull/15)). 소셜 로그인과 사이트 챗봇, 사용자용 MCP([agent #13](https://github.com/GAKDO/agent/pull/13))도 이때 들어갔습니다.
- 11/12 같은 노트북을 부스(Jetson)와 서버에서 따로 판정해 사진 29장의 결과가 모두 같은지 확인했습니다([booth #66](https://github.com/GAKDO/booth/pull/66)).
- 11/12 교내 대여 담당자 다섯 분께 설문을 받았습니다. 다섯 분 모두 파손 시점이 애매했던 적이 있다고 답했고, 반납 때 대여 당시 기록과 비교한다는 분은 없었습니다.

### 11/13 ~ 11/16 촬영과 제출

- 11/13 코드 프리즈. 자동 배포를 멈추고 새 부스에서 출고 → 검수 → 수령 → 진단 → 반납 → 봉인 흐름을 촬영했습니다.
- 11/13 같은 노트북을 세 명이 따로 손으로 검수해 보니 찾은 흠집 수가 5~9개로 달랐습니다. 그래서 속도가 아니라 "같은 조건의 사진과 확정 기록이 남는다"를 강점으로 잡았습니다.
- 11/14 ~ 11/16 발표 PPT를 여러 번 고쳤습니다. 꾸민 느낌을 덜고 실제 사진·도면·화면 위주로 바꾸고, 순서를 왜 만들었나 → 시연 → 하드웨어 → 모델로 정리했습니다.
- 11/16 과제설명서, 발표 영상(4분 57초), 발표 PPT를 제출했습니다. 본선은 11/19입니다.

## 돌아보며

- **계약을 먼저 고정한 것이 가장 도움이 됐습니다.** 레포 13개를 세 명이 따로 만들면서도, 바꿀 것이 생기면 코드보다 contracts를 먼저 고쳐 서로 어긋나지 않았습니다.
- **범위를 일찍 줄였습니다.** 11/3에 최소 MVP부터 끝까지 돌게 만들고 그 위에 단계를 얹었습니다. 클러스터와 InfluxDB처럼 시연에 필요 없는 것은 뺐습니다.
- **모델 점수보다 판정 방식을 바꿨습니다.** 오탐을 모델만으로 없애려 하지 않고 사람 검수 단계를 넣어, AI 후보만으로는 등급에도 청구에도 반영되지 않게 했습니다.
- **남은 것:** 검수 결과로 다시 학습하는 흐름은 만들었지만 아직 그 흐름으로 모델을 바꾼 적은 없습니다. 지금은 같은 기종 한 가지로만 확인했고, 교내 노트북 대여에 먼저 적용하는 것이 다음 목표입니다.
