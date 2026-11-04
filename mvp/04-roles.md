# 4. MVP에서 A·B·C가 맡은 부분

원칙은 하나입니다. **서버·인프라·계약·학습은 A, 부스(Jetson) 안에서 도는 것은 B, 브라우저 관리자 화면은 C.** 한 기능이 두 사람에 걸치면 "서버 = A, 서버를 부르는 쪽 = B 또는 C"로 나눕니다.

## 사람별

| 역할 | 사람 | 맡은 것 (레포) | MVP에서 끝낼 것 |
|---|---|---|---|
| **A** | 김민서 | gateway, auth_server, rental_server, capture_server, contracts, gitops, ml(학습) | 서버 4개를 gakdo.site에 띄움(학교 서버 Compose·강사님 nginx), 부스 빠른 검사(QUICK) 세트·등급, YOLO11-seg 학습 → model.onnx |
| **B** | 부스 담당 | booth (부스 화면 :8320 · 촬영 · Jetson 탐지), Label Studio 연동 | 부스 빠른 검사(기기 탭 → 12장 → 판정 → 업로드), 조명·카메라 고정값, 학습 사진 촬영, TensorRT 엔진·속도 실측, 그램·델 치수 실측 |
| **C** | 화면 담당 | web (`/admin`) | 로그인·기종·기기·렌탈·출고 시작 화면, 검사 결과 화면(사진 12장 격자 + 흠집 폴리곤 + 등급), 375px·1280px |

## 기능별 (R = 만든다, C = 같이 확인)

기능 번호는 [3. 기능별 흐름](03-features.md)과 같습니다.

| 기능 | A | B | C |
|---|---|---|---|
| F1 관리자 로그인 | R auth-server `login`·`refresh`·`logout`·`me`, gateway JWT 검증 | — | R 로그인 화면, 토큰 메모리 보관 |
| F2 기종 등록 | R rental-server 기종 API, MBA13-M2 시드 | C 그램·델 치수 실측 | R 기종 화면 |
| F3 기기 등록·검색 | R rental-server 기기 API | — | R 기기 화면 |
| F4 렌탈 열기·출고 시작 | R rental-server 렌탈·시점 API | — | R 렌탈 화면(출고 검사 시작 버튼) |
| F5 부스 로그인·기기 목록 | R 부스 토큰, BOOTH용 렌탈 목록 | R 부스 화면 "검사 기다리는 기기", 토큰 갱신 | — |
| F6 부스 촬영 12장 | — | R 촬영 순서·조명·카메라 고정값 | — |
| F7 사진 업로드·완료 | R 세트 생성·사전 서명 URL·완료 확인, MinIO, 시점 CAPTURED | R 업로드·재시도 큐 | — |
| F8 Jetson 탐지·판정 표시 | C 모델 제공 | R TensorRT 탐지, 부스 결과 화면 | — |
| F9 탐지 저장·등급 | R 탐지 저장, QUICK 등급, 시점 GRADED | R 탐지 업로드(12장 분석 목록) | — |
| F10 검사 결과 보기 | R `media`·`inspection` API | — | R 결과 화면(격자·폴리곤·등급) |
| F11 모델 학습·반영 | R 집 PC 학습 → ONNX | R 학습 사진 촬영·라벨링 연동·엔진 빌드 | — |
| 배포 | R 학교 서버 Compose, 강사님 nginx, DNS | R Jetson 환경 변수 | C web 머지 뒤 A에게 이미지 갱신 요청 |
| 계약 | R contracts (값 추가만) | C 리뷰 | C 리뷰 |

## MVP 일정

| 날짜 | A | B | C |
|---|---|---|---|
| 11/4 | 학교 서버 MVP 기동, gakdo.site nginx | 조명 설치·카메라 고정값, 학습 사진 | 검사 결과 화면 착수 |
| 11/5 | 라벨링·학습 시작 | 부스 빠른 검사 모드 | 결과 화면(격자·폴리곤) |
| 11/6 | v001 ONNX 전달 | Jetson 엔진 빌드, 버튼→판정 시간(목표 15초) | gakdo.site에서 로그인·결과 화면 확인 |
| 11/7 | 끝에서 끝 연결 (관리자 → 부스 → 서버 → 관리자) | 같이 | 같이 |
| 11/9 | **MVP 완성** | | |

## 헷갈리기 쉬운 경계

| 질문 | 답 |
|---|---|
| 부스 화면은 누가 만드나? | **B.** web 레포가 아니라 booth 레포의 `trace-booth serve`(Jetson :8320)가 화면과 로컬 API를 같이 띄웁니다. → [2-6](02-services.md#2-6-booth-앱-jetson-안의-부스-운영-웹-서버--b--부스-사진) |
| 관리자 결과 화면은? | **C.** 데이터는 capture-server의 `media`·`inspection`(A) |
| 등급은 누가 정하나? | **A.** capture-server가 부스 탐지로 A~D. 부스 화면의 "문제 있음/없음"은 같은 탐지로 B가 바로 보여 주는 값 |
| 모델은? | 학습(ONNX)은 **A**, Jetson 엔진 빌드·속도 실측은 **B** |
| API 필드가 더 필요하면? | contracts에 추가 PR(A). 코드에서 먼저 바꾸지 않음 |
