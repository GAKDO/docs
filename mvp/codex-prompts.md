# Codex(이미지)로 발표용 그림 다듬기

이 폴더의 그림 원본은 Markdown 안의 Mermaid이고, `figures/`에 SVG·PNG가 있습니다. 발표 슬라이드용으로 더 깔끔한 그림이 필요하면 아래 프롬프트를 Codex(ChatGPT 이미지)에 붙여 넣고, **`figures/01-architecture-1.png`를 함께 올립니다.** 이미지 모델은 글자를 틀리게 그리기 쉬우니, 결과의 서비스 이름·포트를 아래 표와 꼭 대조합니다.

## 프롬프트 1. 전체 아키텍처 (16:9 슬라이드 한 장)

```
첨부한 다이어그램을 발표 슬라이드용 시스템 아키텍처 그림(16:9, 1920×1080, 흰 배경, 플랫 디자인, 한국어)으로 다시 그려 줘.
내용(이름·포트·화살표)은 하나도 바꾸거나 빼지 말고, 추상적인 아이콘·구름·사람 그림으로 대체하지 마. 상자 안 글자는 아래 표기 그대로 써.

[그룹과 색]
- ① 부스 사진 (MVP) — 초록(#2f9e5b 테두리, #e3f6ea 채움), 실선: "booth 앱 · Jetson Orin Nano · 부스 운영 웹 서버 :8320", "capture-server :8080", "부스 태블릿 브라우저"
- ③ 사진 무관 — 파랑(#3b6fd8): "web nginx :8315 (유일한 입구)", "gateway :8080", "auth-server :8080", "rental-server :8080"
- 공통 인프라 (학교 서버 10.116.64.12 · Docker Compose) — 회색: "PostgreSQL :5432", "RabbitMQ :5672", "MinIO :9000 (trace-captures)", "Redis :6379"
- 밖 — 흰 상자 검은 테두리: "관리자 브라우저", "강사님 nginx gakdo.site :443", "집 PC RTX 4070 Ti — 학습만", "학교 MinIO storage.java21.net:8000"

[화살표 (라벨 그대로)]
관리자 브라우저 → 강사님 nginx "HTTPS 443"
부스 태블릿 → booth 앱 "HTTP :8320 (부스 공유기 안)"
booth 앱 → 강사님 nginx "HTTPS 443 /api/v1 · 사진 PUT /trace-captures/"
강사님 nginx → web nginx "HTTP 8315"
web nginx → gateway "/api/"
web nginx → MinIO "/trace-captures/"
gateway → auth-server, rental-server, capture-server
auth-server·rental-server·capture-server → PostgreSQL
capture-server → RabbitMQ "trace.capture.uploaded · trace.checkpoint.graded"
RabbitMQ → rental-server "시점 상태 갱신"
booth 앱 ⇢ 학교 MinIO "학습 사진" (점선)
학교 MinIO ⇢ 집 PC (점선), 집 PC → booth 앱 "model.onnx → TensorRT 엔진"

[배치] 왼쪽 위 밖(브라우저·nginx), 왼쪽 아래 ① 부스, 가운데·오른쪽 ③ 서버들, 아래 띠 공통 인프라, 왼쪽 아래 구석 집 PC·학교 MinIO.
MVP(11/9)에 실제로 뜨는 것만 그린다. 폰 촬영·report-server·diagnostics-server는 넣지 마. 범례: 실선 = 서비스 호출, 점선 = 학습 데이터 경로. 제목: "TRACE 최소 MVP 아키텍처 (https://gakdo.site)".
```

## 프롬프트 2. 포트 표 슬라이드

```
아래 표를 발표 슬라이드(16:9, 흰 배경, 한국어, 표 하나)로 깔끔하게 만들어 줘. 값은 그대로 쓰고, 열림 칸은 외부=빨강 점, 내부망=노랑 점, 127.0.0.1·Compose 안=회색 점으로 표시.
443 | gakdo.site | 강사님 nginx → 10.116.64.12:8315 | 외부
8315 | 학교 서버 | web nginx (/ 화면, /api/ → gateway, /trace-captures/ → MinIO) | 학교 내부망
8080 | Compose 안 | gateway · auth · rental · capture | 호스트에 안 엶
5432 | Compose 안 | PostgreSQL | 호스트에 안 엶
6379 | Compose 안 | Redis | 호스트에 안 엶
5672 / 15672 | 학교 서버 | RabbitMQ / 관리 화면 | 127.0.0.1만
19000 / 19001 | 학교 서버 | MinIO API / 콘솔 | 127.0.0.1만
8320 | Jetson | 부스 운영 화면 (trace-booth serve) | 부스 공유기만
8000 | storage.java21.net | 학교 MinIO (학습 데이터) | 학교
```

## 프롬프트 3. 임무 분담 슬라이드

```
3열 카드 슬라이드(16:9, 흰 배경, 한국어)를 만들어 줘. 카드 색: A 회색·파랑, B 초록, C 파랑.
A (서버·인프라·학습): gateway, auth-server, rental-server, capture-server, contracts, gitops(Compose 배포), 집 PC YOLO11-seg 학습 → ONNX
B (부스·Jetson): booth 앱(부스 운영 웹 서버 :8320, 촬영 12장, TensorRT 탐지), 학습 사진 촬영, Label Studio 연동, Jetson 엔진 빌드
C (관리자 화면): web /admin — 로그인, 기기·렌탈·출고 시점, 검사 결과(사진 12장 격자 + 흠집 폴리곤 + 등급)
아래 띠: "11/7 끝에서 끝 연결 · 11/9 MVP 완성 · 11/13 코드 프리즈 · 11/16 제출"
```

## 확인표 (결과 그림과 대조)

| 확인 | 맞는 값 |
|---|---|
| 서비스 이름 | web, gateway, auth-server, rental-server, capture-server, booth 앱 |
| 포트 | 443, 8315, 8080, 5432, 5672, 6379, 9000(호스트 19000), 8320, 8000 |
| 주소 | https://gakdo.site, 10.116.64.12, storage.java21.net:8000 |
| 없어야 할 것 | 폰 촬영·inspect-worker·report-server·diagnostics-server(MVP 밖), Rancher, Argo CD, Cloudflare Tunnel, Grafana, InfluxDB, trace.java21.net |
