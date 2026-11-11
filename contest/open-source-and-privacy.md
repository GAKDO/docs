# 오픈소스 출처·라이선스와 개인정보 원칙

공고문은 "쓴 오픈소스·모델은 출처를 밝히고 우리가 만든 부분과 구분"하라고 요구합니다(허위 기재·표절이면 선정 취소). 과제설명서와 org 프로필에 이 문서를 줄여 넣습니다.

## 1. 우리가 만든 것과 가져다 쓴 것

| 우리가 만든 것 | 가져다 쓴 것(그대로 사용) |
|---|---|
| 세 시점(출고·수령·반납) 기록 흐름, 시점 비교·새 흠집 판정, A~D 등급 규칙, 반납 정산표 | 웹·서버 프레임워크(Spring Boot, React 등) |
| 부스(카메라 2대 × 조명 3단, 촬영 목록, 조명 확인 도구)와 부스 앱 | 탐지 모델 구조와 학습 도구(Ultralytics YOLO11-seg) |
| 부스 사진 라벨링(v001~v004)과 미세조정한 흠집 탐지 가중치, 재학습 파이프라인(검수 → 데이터셋 → 학습 → 평가 → 승격) | 사전학습 데이터(AI Hub) |
| 9면 정합(1 px = 0.25 mm)과 시점 간 흠집 대응 | 특징점 정합 모델(SuperPoint·LightGlue, 쓰는 경우) |
| 해시 체인 봉인과 공개 검증 페이지, 3D 리포트 | 암호 라이브러리(Ed25519 서명, JWT) |
| 진단 에이전트(macOS·Windows)와 trace-mcp, 사이트 챗봇 | 챗봇 모델(Google Gemini API, Ollama + qwen2.5:3b) |
| 계약(OpenAPI·JSON Schema·codes.yaml)과 서버 6개 + gateway | 인프라(PostgreSQL, RabbitMQ, MinIO, Redis) |

## 2. 라이선스 목록

상용화 때 조건이 붙는 것을 위에 둡니다.

| 이름 | 쓰는 곳 | 라이선스 | 상용화 때 할 일 |
|---|---|---|---|
| Ultralytics YOLO11-seg | 흠집 탐지(ml 학습, 학교 서버 inspect-worker, 부스 Jetson 엔진) | AGPL-3.0(또는 Ultralytics Enterprise) | 소스 공개 유지, 유료 라이선스, 또는 다른 모델로 교체 |
| MinIO | 사진 저장소 | AGPL-3.0 | 수정 없이 사용, 또는 S3 호환 저장소로 교체 |
| qwen2.5:3b | 챗봇 폴백(Ollama) | Qwen Research License(비상업) | 상용판에서는 다른 모델로 교체 |
| SuperPoint 가중치 | 정합(모델 파일이 있을 때만, 기본은 윤곽선 방식) | Magic Leap 비상업 라이선스 | 상용판에서는 쓰지 않음 |
| AI Hub 데이터 | 탐지 사전학습 | AI Hub 이용 약관 | 상용 전 약관 재확인 |
| Redis 7.4 | 요청 제한·진행률 | RSALv2 / SSPLv1 | Redis 자체를 서비스로 팔지 않으면 사용 가능 |
| Google Gemini API | 챗봇 | Google API 약관 | 유료 등급 전환 시 데이터 처리 조건 확인 |
| LightGlue, LightGlue-ONNX | 정합 | Apache-2.0 | 고지만 |
| OpenCV | 정합·영상 처리 | Apache-2.0 | 고지만 |
| Spring Boot·Spring Cloud Gateway, Nimbus JOSE | 서버 | Apache-2.0 | 고지만 |
| React, Vite, three.js / React Three Fiber, TanStack Query | 웹 | MIT | 고지만 |
| PostgreSQL | DB | PostgreSQL License | 고지만 |
| RabbitMQ | 이벤트 | MPL-2.0 | 고지만 |
| Ollama | 로컬 LLM 실행 | MIT | 고지만 |
| Label Studio | 라벨링 | Apache-2.0 | 고지만 |

우리 레포에는 아직 LICENSE 파일이 없습니다(비교한 다른 세 팀도 모두 없음). 대회 기간에는 그대로 두고, 공개 배포를 정할 때 YOLO11의 AGPL을 고려해 정합니다.

## 3. 개인정보 원칙 (세 줄)

1. **모으는 것은 회원 정보(이메일·이름·비밀번호 해시)와 렌탈 기록뿐이고, 사진은 기기 외관만 찍습니다.** 부스 카메라는 노트북 면만 비추고, 폰 수령 촬영도 기기 면 가이드 안만 씁니다. 공개 검증 페이지에는 해시·시각·등급만 있고 사람 정보는 없습니다.
2. **밖으로 나가는 것은 정해 두었습니다.** 메일(Gmail)과 챗봇(Gemini) 두 곳뿐입니다. 챗봇은 로그인한 사용자가 렌탈을 물을 때만 내 렌탈·검사 결과를 보내고, **기기 일련번호는 뒤 4자리만** 보냅니다. 테스트가 "모델이 받은 요청에 전체 일련번호 0건"을 확인합니다(chat-server #5). 대화는 서버에 저장하지 않습니다.
3. **AI는 읽기만 합니다.** 챗봇과 trace-mcp는 사용자 본인 토큰으로 조회(GET)만 하고, 기록을 바꾸는 API는 부르지 않습니다. 봉인된 기록은 운영자도 고칠 수 없습니다.

보관과 파기는 [개인정보처리방침](https://gakdo.site/privacy) 3절을 따릅니다. 회원 정보는 탈퇴 때 지우고, 프로젝트가 끝나면 서비스 데이터 전체를 지웁니다. 서버 백업은 DB 14일, 사진 저장소 3일만 둡니다(gitops #25).

## 4. 과제설명서에 붙여 넣을 문단

> 본 작품은 흠집 탐지에 Ultralytics YOLO11-seg(AGPL-3.0)를, 사전학습에 AI Hub 공개 데이터를, 정합에 OpenCV·LightGlue(Apache-2.0)를 사용하였다. 부스 촬영 데이터 수집·라벨링, 미세조정 가중치, 세 시점 비교·등급·정산 규칙, 해시 체인 봉인과 검증 페이지, 서버·웹·에이전트 코드는 팀이 직접 설계·구현하였다. 개인정보는 회원 정보(이메일, 이름, 비밀번호 해시, 소셜 로그인 식별자)와 기기 외관 사진·렌탈 기록만 다루며, 외부 AI(Gemini)로는 기기 일련번호를 가린 렌탈 요약만 보낸다. 상용화 시 AGPL 구성 요소는 유료 라이선스 또는 대체 모델로 전환한다.
