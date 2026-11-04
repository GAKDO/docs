# 4. A/B/C 임무 분담 (MVP ~11/9)

원칙: **서버 API·인프라·계약·학습은 A, 부스(Jetson) 안의 모든 것은 B, 브라우저 관리자 화면은 C.** 한 기능이 두 사람에 걸치면 "서버 = A, 부르는 쪽 = B 또는 C"로 나눕니다. 계약(API·이벤트·코드 값)을 바꿔야 하면 코드를 고치지 말고 A에게 알립니다(contracts는 1.0.0 고정, 추가만).

## 사람별

| 역할 | 사람 | 맡은 서비스·레포 | MVP 결과물 |
|---|---|---|---|
| **A** | 김민서 | gateway, auth_server, rental_server, capture_server, (2단계) report_server, (3단계) diagnostics_server, contracts, gitops, ml(학습) | 서버 4개 + Compose 배포(gakdo.site), QUICK 세트 등급, YOLO11-seg 학습 → ONNX |
| **B** | 부스 담당 | booth (부스 운영 웹 서버 :8320 · 촬영 · Jetson 탐지), ML3 Label Studio 연동, (3단계) agent | 부스 빠른 검사(12장 → 판정 → 업로드), 학습 사진 촬영, TensorRT 엔진 |
| **C** | 화면 담당 | web (`/admin`, 2단계 `/capture`·리포트·검증) | 로그인·기기·렌탈·출고 시점 화면, 검사 결과 화면(사진 12장 격자 + 폴리곤 + 등급) |

## 기능 × 담당 (RACI: R = 만든다, C = 함께 본다)

| 기능 (3. API 명세의 F번호) | A (서버·인프라) | B (부스) | C (web) |
|---|---|---|---|
| F1 관리자 로그인 | R auth-server `login`·`refresh`·`me` | — | R 로그인 화면 |
| F2 기종·기기 등록 | R rental-server 기기·기종 API, 기종 시드(MBA13-M2) | C 그램·델 치수 실측 | R 기기·기종 화면 |
| F3 렌탈·출고 시점 | R rental-server `createRental`·`startCheckpoint` | — | R 렌탈 화면(출고 시작 버튼) |
| F4 부스 토큰·기기 목록 | R `issueBoothToken`, `listRentals`(BOOTH) | R 부스 화면 "검사 기다리는 기기" | — |
| F5 세트·사진 업로드 | R capture-server 세트·사전 서명 URL·완료, MinIO | R 촬영 12장·PUT·재시도 큐 | — |
| F6 탐지·등급 | R `saveBoothDetections`, QUICK 등급 | R TensorRT 탐지·부스 결과 화면 | — |
| F7 결과 보기 | R `inspection`·`media` | — | R 결과 화면(격자·폴리곤·등급), 375px·1280px |
| 탐지 모델 | R 집 PC 학습 → model.onnx | R 학습 사진 촬영·라벨링 연동, Jetson 엔진 빌드·속도 실측 | — |
| 배포 | R 학교 서버 Compose, 강사님 nginx·DNS | R Jetson 환경 변수 | C web 머지 후 이미지 갱신 요청 |
| 계약 | R contracts (추가만) | C 리뷰 | C 리뷰 |
| 문서·그림 | R 이 폴더(mvp/), contest 그림 | C | C 발표 그림 |

## 일정

| 날짜 | A | B | C |
|---|---|---|---|
| 11/4 | 학교 서버 MVP 5개로 재기동, gakdo.site nginx | 조명 설치·프리셋, MVP 학습 사진 | 검사 결과 화면 착수 |
| 11/5 | 라벨링·학습 시작 | 부스 "빠른 검사" 모드 | 결과 화면(격자·폴리곤) |
| 11/6 | v001 ONNX 전달 | Jetson 엔진 빌드, 버튼→판정 시간(목표 15초, 기준 30초) | gakdo.site 실서버 연결 확인 |
| 11/7 | 끝에서 끝 연결 (부스 → 서버 → 관리자 화면) | 같이 | 같이 |
| 11/9 | MVP 완성 | | |
| 11/10~12 | report-server 재도입(해시 체인), 반납 비교 | 같은 기기 두 번째 검사 | 폰 수령 촬영(WE2) |
| 11/13 | 코드 프리즈 | | |
| 11/16 16:00 | 경진대회 제출 | | |

## 경계에서 자주 헷갈리는 것

| 질문 | 답 |
|---|---|
| 부스 화면은 누가? | **B.** web 레포가 아니라 booth 레포의 `trace-booth serve`(Jetson :8320)가 화면과 로컬 API를 같이 띄웁니다. 태블릿은 Jetson에만 붙고, 서버(gakdo.site)와 통신하는 건 Jetson입니다. → [2-6](02-services.md#2-6-booth-앱-jetson-안의-부스-운영-웹-서버--b--부스-사진) |
| 관리자 결과 화면은? | **C.** web `/admin`. 데이터는 capture-server `inspection`·`media`(A) |
| 흠집 판정 기준(등급)은? | **A.** capture-server가 부스 탐지로 등급. 부스 화면의 "문제 있음/없음"은 같은 탐지로 B가 바로 보여 주는 값 |
| 모델 학습과 엔진은? | 학습(ONNX)은 **A**(집 PC), Jetson 엔진 빌드·속도는 **B** |
| API 필드를 더하고 싶으면? | contracts에 추가 PR(A). 코드에서 먼저 바꾸지 않음 |
