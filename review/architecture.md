# 리뷰 준비: 아키텍처·기술 흐름

11/20 강사님 전체 리뷰(요구사항·스펙·ERD·아키텍처·API) 중 **아키텍처·기술 흐름** 파트 준비 문서입니다. 모든 답은 11/20 각 레포 develop 코드와 gitops `compose/docker-compose.yml`로 다시 확인했고, 근거 파일을 함께 적었습니다.

- 지금 구성 그림: [../figures/trace-system-architecture.png](../figures/trace-system-architecture.png), 글로 된 구성: [../architecture.md](../architecture.md)
- 서비스별 표·이벤트 표: [../mvp/02-services.md](../mvp/02-services.md), 배포: [../cicd.md](../cicd.md)

## 0. 30초 요약 (첫 질문 "구조 설명해 보세요"에)

> 입구는 gakdo.site 하나입니다. 강사님 nginx가 TLS를 끝내고 학교 서버의 web nginx로 넘기면, 화면은 nginx가 바로 주고 `/api/`는 Spring Cloud Gateway로 갑니다. gateway가 JWT 서명과 역할×경로 규칙을 확인한 뒤 업무 서버 5개(auth·rental·capture·diagnostics·report) 중 하나로 보냅니다. 서버끼리는 서로 API를 부르지 않고 RabbitMQ 이벤트 7종으로만 이어지며, DB는 PostgreSQL 하나에 서버마다 스키마를 나눠 외래 키 없이 ID 값만 들고 있습니다. 사진은 서버를 거치지 않고 사전 서명 URL로 MinIO에 바로 올라가고, 흠집 탐지는 부스 Jetson이 TensorRT로 현장에서 합니다. 시점마다 등급이 나오면 report-server가 렌탈별 해시 체인에 잇고 Ed25519로 서명하며, 그 지문을 고객 메일로도 보내 업체도 몰래 고칠 수 없게 했습니다.

숫자로: 앱 컨테이너 9개(web·gateway·서버 5개·inspect-worker·chat-server) + ollama + 인프라 4개, 밖으로 열린 포트 1개(8315, 밖에서는 443만), 이벤트 7종, 스키마 7개·테이블 37개, 부스 12장 탐지 2.53초(Jetson Orin Nano, TensorRT FP16).

## 1. 세 시점 데이터 흐름

시점 상태는 `OPEN → CAPTURED → GRADED → SEALED`(codes.yaml `checkpoint_status`), 시점 종류는 `OUT → RCV → RET` 순서입니다. 체인은 렌탈마다 따로이며 앞 시점이 봉인돼야 다음 시점을 봉인합니다(`SealService.previousSealed`).

### 1-1. 출고(OUT): 부스

1. 관리자(web `/admin`)가 기기를 고르고 렌탈을 열면 rental-server가 OUT 시점을 OPEN으로 만들고 `trace.checkpoint.started`를 냅니다.
2. Jetson booth 앱은 client id·secret으로 BOOTH JWT(1시간)를 받고, 관리자가 준 6자리 부스 코드를 `booth-codes/redeem`으로 바꿔 렌탈·시점 ID를 얻습니다.
3. 카메라 2대 × 조명 3개 × 바닥·윗면 = 12장을 찍고, 사진 해시를 담아 세트를 만들면 capture-server가 사전 서명 PUT URL 12개를 줍니다. Jetson이 MinIO에 바로 올리고 `complete`를 부르면 capture-server가 해시를 확인하고 `trace.capture.uploaded`를 냅니다.
4. Jetson이 YOLO11m-seg(v004, TensorRT FP16)로 탐지해 부스 화면에 폴리곤과 "문제 있음/없음"을 바로 보여 주고, 결과를 capture-server에 올립니다. 올리기가 실패하면 로컬 저장소에 두고 30초마다 다시 보냅니다(booth `quick_upload.py`).
5. 관리자가 AI 후보를 확정·기각하고 놓친 흠집을 더하면(사람 검수, 11/8) capture-server가 카메라 사이 같은 흠집을 묶어 `grade-rules-v1`로 A~D를 매기고 `trace.checkpoint.graded`를 냅니다.
6. report-server가 이를 받아(진단이 있으면 최대 1분 기다림) 사진 해시·진단 해시·등급·규칙 버전을 정렬된 JSON으로 묶어 SHA-256을 내고, 앞 기록 해시와 이어 Ed25519로 서명한 뒤 `trace.record.sealed`를 냅니다. rental-server는 시점을 SEALED로, auth-server는 고객에게 봉인 영수증 메일을, diagnostics-server는 그 시점의 재진단을 막습니다.

### 1-2. 수령(RCV): 고객 폰

1. 관리자가 수령 QR(`capture-links`, 30분)을 띄우면 고객이 폰으로 찍고 로그인합니다(이메일 또는 구글·깃허브).
2. QR 토큰을 `capture-links/exchange`로 바꾸면 그 시점에만 쓰는 CUSTOMER 촬영 JWT(30분)가 나오고, 렌탈이 고객 계정에 연결됩니다(`auth.rental_access`).
3. 폰이 가이드대로 7면(키보드 빼고, 화면 흰색은 선택)을 찍어(HTTPS 필수, getUserMedia) 같은 사전 서명 URL로 올리고, 진행률은 SSE로 봅니다.
4. inspect-worker(학교 서버, CPU ONNX)가 `uploaded`를 받아 면별 표준 좌표로 정합·탐지·3D 텍스처를 만들고 `trace.inspect.completed`를 냅니다. 그 뒤는 출고와 같이 등급 → 봉인입니다. 진행률은 Redis 채널 → report-server → SSE.

### 1-3. 반납(RET): 부스 + 비교 + 정산

1. 출고와 같은 부스 촬영입니다.
2. capture-server가 지금 흠집마다 같은 면의 앞 시점 흠집 중 표준 좌표(mm)로 가장 가까운 것을 찾아 5 mm 안이면 EXISTING, 아니면 NEW로 판정합니다(`view-match-v1`). 억울한 "신규" 판정이 놓친 신규보다 나쁘다고 보고 너그럽게 잡았습니다.
3. NEW 흠집 묶음을 공개 규칙표에 넣어 차감액을 계산합니다(반납 정산, `SettlementService`). 등급과 같은 근거로 정산하므로 검수가 끝나면 정산도 끝납니다.
4. 진단 에이전트는 시점마다 페어링 코드(5분) → AGENT JWT(10분)로 진단 JSON 1건을 올리고, diagnostics-server가 JSON Schema로 검증한 뒤 앞 진단과 비교해 부품 교체·용량 감소·벤치 하락 등 점검 플래그를 붙입니다.

## 2. 예상 질문과 답

### 구조 선택

**Q1. 팀 3명인데 왜 MSA로 나눴나요? 모놀리스가 더 낫지 않나요?**
솔직히 3명·한 달이면 모놀리스가 더 빠릅니다. 나눈 이유는 세 가지입니다. (1) **바뀌는 속도와 책임이 다릅니다.** 인증(auth)은 보안 정책, 사진(capture)은 AI 모델과 함께 자주 바뀌고, 해시 체인(report)은 한번 정하면 바뀌면 안 됩니다. 체인 코드를 사진 코드와 같이 배포하면 무관한 수정이 체인을 깰 위험이 있습니다. (2) **신뢰 경계**: report-server는 다른 서버의 DB를 못 읽고 이벤트로 받은 값만 봉인합니다. 봉인 재료가 어디서 왔는지 이벤트 계약으로 고정됩니다. (3) **장애 격리**: 챗봇이나 진단이 죽어도 부스 촬영·봉인은 계속됩니다. 대신 비용(서버 5벌의 보일러플레이트, 분산 디버깅)은 contracts 레포 하나에 OpenAPI·이벤트 스키마·codes.yaml을 모으고, 공통 컨벤션(패키지 구조·ProblemDetail·NanoID)으로 줄였습니다. "서비스 경계를 먼저 그어 둔 모듈러 구조"이고, 규모가 작을 때는 한 서버에 합쳐도 이벤트 계약이 같아 다시 나누기 쉽습니다.

**Q2. 서비스는 어떤 기준으로 나눴나요?**
데이터 소유와 바뀌는 이유 기준입니다. 렌탈·기기·시점 상태는 rental, 사진·탐지·검수·등급은 capture(시점 비교·등급은 같은 사진 데이터를 쓰므로 스키마 `inspection`만 따로, 리뷰 결정 3), 진단은 diagnostics, 봉인·검증은 report, 회원·토큰은 auth. 한 요청이 한 서버에서 끝나도록 나눴고, 그래서 서버끼리 동기 호출이 없습니다.

**Q3. 서버끼리 FK를 왜 안 거나요? 정합성은 어떻게 맞추나요?**
FK를 걸려면 같은 DB·같은 스키마를 보아야 하고, 그러면 한 서버의 마이그레이션이 다른 서버를 깨뜨립니다(예: rental이 시점 테이블을 바꾸면 capture도 같이 배포). 그래서 다른 서버의 ID는 21자 NanoID 값으로만 들고, 정합성은 (1) **ID 발급 쪽이 유일한 원본**(시점은 rental만 만든다), (2) **이벤트로 받은 상태를 자기 스키마에 작은 사본으로 둔다**(report `checkpoint_view`, diagnostics `sealed_checkpoint`), (3) **받는 쪽이 짝을 검사한다**(rental-server는 렌탈·시점 짝이 안 맞는 이벤트를 DLQ로 보내 사람이 본다)로 맞춥니다. 같은 서버 안에서는 FK를 겁니다(11/20 정규화로 `grade_result` 합성 FK, `manual_seal_log → record_chain` FK 추가). 시험 데이터 지우기는 `trace.checkpoint.purged` 이벤트로 각 서버가 자기 것을 지웁니다.

**Q4. 처음엔 쿠버네티스(Rancher·Argo CD)였는데 왜 Docker Compose로 바꿨나요?**
11/3에 학교 클러스터 권한·NodePort·공유 인프라 접속이 늦어져 시연 일정(11/10 기능 완성)을 못 맞출 위험이 컸습니다. 학교 서버 한 대 + Compose로 바꾸고 인프라 4종도 같은 Compose에 넣어 외부 의존을 없앴습니다. 쿠버네티스 매니페스트(`overlays/school`)는 지우지 않고 CI(kustomize build + kubeconform)로 계속 검증하므로, 앱 이미지·환경 변수 이름이 같아 클러스터로 되돌아가기 쉽습니다. Argo CD의 장점(서버가 끌어오는 방식, 자동 되돌리기)은 `autodeploy.sh`로 옮겼습니다(Q14).

**Q5. 동기와 비동기는 어떻게 나눴나요?**
사람이 화면에서 기다리는 것은 동기 REST(gateway → 서버 1곳), 다른 서버가 이어 받는 것은 비동기 이벤트입니다. 예를 들어 부스가 촬영 완료를 알리면 응답은 capture-server가 바로 하고, 시점 상태 이동(rental)·진행률(report)·정합(inspect-worker)은 이벤트로 각자 처리합니다. 그래서 inspect-worker가 꺼져 있어도 촬영 API는 성공하고, 켜지면 큐에 쌓인 세트를 처리합니다. 진행률처럼 잃어도 되는 값은 이벤트로 남기지 않고 Redis Pub/Sub → SSE로 보냅니다.

**Q6. API Gateway는 왜 두었고 무엇을 하나요?**
입구 하나에서 (1) JWT 서명·만료 확인(auth-server JWKS, kid는 공개키 RFC 7638 지문이라 키를 바꾸면 자동으로 새 키를 받음), (2) 역할×경로 규칙(contracts OpenAPI의 `x-trace-access`에서 만든 `access-policy.yaml`, **규칙 없는 경로는 404**로 숨김), (3) 로그인·가입·페어링·재설정은 IP당 분당 10회, 공개 목록은 300회 요청 제한(Redis 고정 창), (4) 클라이언트가 보낸 `X-User-Id`·`X-Role`·`X-Scope`를 지우고 토큰 값으로 다시 채움, (5) 뒤쪽 서버 연결 실패만 다시 보내기(무중단 배포용, POST 중복 없음)를 합니다. 근거: gateway `application.yml`, `TraceHeadersGlobalFilter`.

**Q7. 그럼 업무 서버는 gateway만 믿나요?**
아닙니다. Compose에는 쿠버네티스 NetworkPolicy가 없으므로 서버 5개도 각자 Spring Security 리소스 서버로 같은 JWKS를 읽어 JWT를 다시 검증합니다(각 서버 `common/infra/SecurityConfig`). gateway가 뚫리거나 Compose 망 안에서 직접 불려도 토큰 없이는 못 씁니다. 범위(scope) 확인, 예를 들어 "이 AGENT 토큰은 이 시점 1건만"은 서버가 합니다.

### 데이터 일관성·메시징

**Q8. DB 트랜잭션과 메시지 발행이 둘 다 성공한다는 보장은?**
RabbitTemplate을 채널 트랜잭션(`setChannelTransacted(true)`)으로 두어 DB 트랜잭션이 커밋될 때 메시지도 함께 커밋되게 했습니다(DB 롤백이면 메시지도 안 나감). 다만 이것은 2단계 커밋이 아니라 "DB 커밋 직후 브로커 커밋"이라, 그 사이 프로세스가 죽으면 메시지를 잃을 수 있는 아주 작은 창이 남습니다. 정석은 **트랜잭셔널 아웃박스**(같은 트랜잭션에 outbox 표로 쓰고 별도 발행기가 보냄)이고, 다음 단계 개선 1순위입니다. 지금 보완: 관리자 수동 봉인(`sealCheckpointManually`, 기록 남음)과 등급 다시 매기기로 멈춘 시점을 살릴 수 있습니다.

**Q9. 같은 메시지가 두 번 오거나 순서가 바뀌면?**
받는 쪽을 멱등하게 만들었습니다. rental-server는 시점 상태가 **앞으로만** 움직여(`Checkpoint.advanceTo`, 순서 비교) 늦게 온 CAPTURED는 무시됩니다. report-server는 `processed_event` 표로 이벤트 ID를 한 번만 처리하고, 이미 봉인된 시점은 `RECORD_ALREADY_SEALED`로 막습니다. diagnostics-server는 같은 봉인을 두 번 받아도 한 줄만 남깁니다. 진단 업로드는 `Idempotency-Key` 헤더로 같은 요청을 한 번만 저장합니다. 메시지에는 `messageId`=eventId를 넣습니다.

**Q10. 처리하지 못한 메시지는?**
`trace.dlx` → 큐마다 `<큐>.dlq`로 갑니다. 형식이 깨졌거나 짝이 안 맞는 메시지는 다시 넣어도 소용없어 바로 DLQ로 보내고(`AmqpRejectAndDontRequeueException`), 사람이 RabbitMQ 관리 화면(127.0.0.1만)에서 봅니다. 소비자는 봉투(rentalId·checkpointId·occurredAt)만 필수로 읽고 모르는 필드는 무시하는 너그러운 소비자라, 이벤트에 필드를 더해도 옛 소비자가 깨지지 않습니다. 이벤트마다 `schemaVersion`이 있습니다.

**Q11. 동시에 같은 시점을 두 번 등급 매기거나 봉인하면?**
capture-server는 세트 행을 잠근 트랜잭션 안에서 등급을 매겨, 부스 탐지 POST와 정합 이벤트가 동시에 와도 한 번만 매깁니다. report-server는 렌탈 행을 `PESSIMISTIC_WRITE`로 잠근 뒤 체인을 읽고 이어, 두 봉인이 같은 `prevHash`를 쓰는 갈림이 생기지 않습니다(`RentalReportRepository.lockByRentalId`).

### 해시 체인·위변조

**Q12. 해시 체인은 정확히 무엇을 증명하나요? DB 관리자가 고치면요?**
렌탈마다 출고·수령·반납 3줄 체인입니다. 줄마다 재료(사진 ID·SHA-256 목록, 진단 JSON 해시, 등급, 등급 규칙 버전, 수동이면 관리자 ID·사유, 개인정보 없음)를 정렬된 JSON으로 만들어 `payloadHash`를 내고, `recordHash = H(seq, rentalId, checkpointId, type, payloadHash, prevHash, signedAt)`를 Ed25519로 서명합니다. 검증은 체인을 다시 계산하고 서명을 확인하며 MinIO의 봉인된 사진이 그대로인지 다시 해시합니다. DB 권한자가 줄을 통째로 다시 만들 수는 있으므로, **봉인 때 지문을 고객 메일로 보내** 업체가 고칠 수 없는 곳에 사본을 남깁니다(리뷰 결정 13). 공개 검증 페이지(`/verify/{token}`)의 지문과 메일의 지문을 비교하면 봉인 뒤 변경이 드러납니다. 서명 키(`CHAIN_SIGNING_KEY`)는 학교 서버 `.env`에만 있고 한 번 정하면 바꾸지 않습니다.

**Q13. 블록체인은 왜 안 썼나요?**
증명할 상대가 "업체와 고객" 둘이고, 필요한 것은 위변조 탐지이지 합의가 아닙니다. 해시 체인 + 서버 서명 + 고객 메일(외부 앵커)로 같은 목적을 운영 비용 없이 이룹니다. 더 강하게 하려면 체인 머리 해시를 주기적으로 공개 타임스탬프(RFC 3161 등)에 올리면 됩니다.

### 운영·장애·배포

**Q14. 배포는 어떻게 하고, 잘못된 배포는 어떻게 되돌리나요?**
develop 머지 → GitHub Actions가 테스트(JaCoCo 40%·SonarQube·gitleaks) 뒤 GHCR에 `:커밋SHA`·`:develop` 이미지를 올립니다. 학교 서버의 `autodeploy.sh`(cron 3분)가 서비스별로 새 이미지를 받아 **새 컨테이너를 옆에 띄우고** ① 죽지 않는지 ② ping 응답 ③ 응답의 커밋 SHA가 새 이미지인지 180초 안에 확인한 뒤 옛 컨테이너를 내립니다. 실패하면 새 컨테이너만 지우고 그 이미지를 '실패'로 기록해 다시 시도하지 않으며 Discord로 알립니다. GitHub에 서버 접속 키를 두지 않는 끌어오기 방식이라 Actions가 털려도 서버에 못 들어옵니다. 시연 전에는 `pause`로 멈춥니다.

**Q15. 단일 장애점(SPOF)은 어디인가요?**
솔직히 많습니다. (1) **학교 서버 한 대**(모든 컨테이너), (2) PostgreSQL·RabbitMQ·Redis·MinIO 각 1개, (3) 앞단 강사님 nginx, (4) 부스 Jetson. 지금 대응은 `restart: unless-stopped`, 헬스체크 기반 기동 순서, 2분 상태 감시·30분 바깥 점검 알림, 매일 DB 전체 덤프(14일)·MinIO(3일) 백업입니다. 이 규모(시연·파일럿)에서는 복제보다 **빨리 알고 빨리 복구**가 맞다고 봤습니다. 넓힐 순서는 Q18.

**Q16. 각 구성 요소가 죽으면 어떻게 되나요?**

| 죽은 것 | 사용자에게 보이는 것 | 이유·근거 |
|---|---|---|
| inspect-worker | 폰 수령 등급이 늦어짐, 부스 출고·반납은 계속 | durable 큐에 쌓였다가 켜지면 처리 |
| report-server | 봉인·리포트만 멈춤, 촬영·등급은 계속 | 등급 이벤트가 큐 `trace.report.updates`에 쌓임 |
| RabbitMQ | API는 대부분 되지만 이벤트를 내는 요청(촬영 완료·등급)이 실패 → 재시도 | 채널 트랜잭션이라 DB도 함께 롤백, 부스는 로컬 큐에서 30초마다 다시 |
| Redis | 요청 제한이 꺼지고(로그를 남기고 통과, fail-open) 진행률 SSE·로그인 갱신이 안 됨 | 요청 제한보다 서비스 유지를 택함. 리프레시 토큰이 Redis에 있음 |
| 학교 서버 인터넷 | 부스는 촬영·탐지·화면 판정까지 계속, 업로드는 로컬에 두고 재시도 | 탐지가 Jetson 안에서 돌기 때문 |
| Gemini 한도 | 챗봇이 ollama qwen2.5:3b로 답함(느림) | chat-server 대체 경로 |
| gateway | 전체 API 중단(가장 치명적) | 입구 하나. 무중단 교체·자동 재시작으로 줄임 |

**Q17. 로그·모니터링은?**
컨테이너 로그(`docker compose logs`), 서버마다 ping(`commit` 포함), `health.sh` 상태 변화 알림, Actions `운영 점검`(30분, 공개 주소·인증서), CI 결과 Discord 알림입니다. 분산 추적(OpenTelemetry)과 지표 대시보드는 없습니다. Grafana·InfluxDB는 11/3에 멈췄고 진단 추이는 관리자 '성능' 화면이 PostgreSQL에서 읽습니다. 다음 단계로 요청마다 trace ID를 gateway에서 붙여 이벤트 봉투까지 전하는 것을 꼽습니다.

### 확장성

**Q18. 사용자가 100배가 되면 어디부터 바꾸나요?**
병목 순서대로: (1) **사진 업로드·저장**은 이미 사전 서명 URL로 서버를 우회하므로 MinIO만 넓히면 됩니다. (2) **inspect-worker**는 같은 큐를 여러 개가 나눠 받으므로 컨테이너 수만 늘리면 됩니다(상태 없음, GPU 노드로 옮기기). (3) **Spring 서버**는 상태를 DB·Redis에 두고 세션이 없어(JWT) 여러 개 띄워 gateway 뒤에 두면 됩니다. 이미 무중단 교체에서 같은 서비스 2개가 잠깐 함께 떠도 문제없음을 확인했습니다. (4) **DB**는 스키마가 이미 서버별이라 서버마다 DB 인스턴스로 떼기 쉽고(접속 주소 환경 변수만 바꿈), 읽기가 많은 report는 읽기 복제본으로. (5) 운영은 보관해 둔 쿠버네티스 매니페스트로 옮겨 HPA·롤링 업데이트를 씁니다. 부스는 지점마다 Jetson을 늘리면 되고, 부스 자격이 `boothId`로 나뉘어 있습니다.

**Q19. 왜 탐지를 서버가 아니라 Jetson에서 하나요?**
(1) 심사 목표 30초 안(한계 60초)에 "문제 있음/없음"을 부스에서 바로 보여 줘야 했고, 12장 2.53초입니다. (2) 학교 서버에는 GPU가 없습니다. (3) 네트워크가 끊겨도 현장 판정은 됩니다. 같은 가중치를 Jetson(TensorRT FP16)과 서버(ONNX CPU)에 배포하고 결과마다 modelVersion을 남겨(리뷰 결정 4) 어느 모델이 낸 판정인지 추적합니다. AI는 후보만 내고 확정은 사람이 합니다(사람 검수).

### 인증·보안

**Q20. 인증 구조를 설명해 주세요. 왜 Keycloak을 안 썼나요?**
auth-server가 RS256 JWT를 발급하고 공개키를 JWKS로 내보냅니다. 주체별로 토큰을 나눴습니다: ADMIN·CUSTOMER(액세스 15분 + 리프레시 7일), 수령 촬영(시점 하나, 30분), BOOTH(client credentials, 1시간), AGENT(페어링 코드 5분 → 10분, 시점 하나). 토큰마다 수명·범위를 짧고 좁게 잡아 폐기 목록 없이 운영합니다. Keycloak은 인프라를 하나 더 띄우고 익히는 비용이 커서 쓰지 않았고, 대신 표준(JWKS·kid·OAuth2 리소스 서버)을 따라 나중에 바꿀 수 있게 했습니다.

**Q21. 토큰은 어디에 두나요? 리프레시 토큰 탈취는?**
웹은 액세스 토큰을 메모리에만, 리프레시 토큰은 `HttpOnly`·`Secure`·`SameSite=Strict` 쿠키에 둡니다(XSS로 못 읽고 CSRF로 못 보냄). 리프레시 토큰은 불투명 값이고 Redis에 SHA-256 해시로만 두며, **쓸 때마다 지우고 새로 줍니다(회전)**. 동시에 두 번 오면 한쪽만 받아들입니다. 로그아웃·비밀번호 변경·재설정 때 계정의 리프레시를 모두 지웁니다. 약점: 이미 쓴 토큰이 다시 오면 그 계정 전체를 끊는 "재사용 탐지"는 아직 없습니다.

**Q22. 소셜 로그인(OAuth)은 어떻게 했나요?**
구글·깃허브 Authorization Code 흐름입니다. 시작할 때 1회용 `state`를 Redis에 두고 같은 값을 쿠키에도 넣어, 콜백에서 둘이 같을 때만 받습니다(CSRF·로그인 바꿔치기 방지). 코드 교환은 서버(auth-server)에서만 하고 client secret은 서버 `.env`에만 있습니다. 콜백 성공 시 우리 리프레시 쿠키를 심고 web으로 보내면, web이 리프레시로 액세스 토큰을 받습니다. 제공자 토큰은 저장하지 않고 이메일·제공자 ID만 `social_identity`에 둡니다. 시작·콜백은 IP당 분당 30회 제한.

**Q23. 11/8 보안 점검에서 무엇을 고쳤나요?**
레포 9곳 PR로 바로 고칠 것만 고쳤습니다: 부스 화면 접속 비밀(`TRACE_BOOTH_UI_TOKEN`, `hmac.compare_digest`로 비교), 부스 API의 JSON만 받기 + Origin 확인(다른 사이트가 부스 API를 못 부름), 재설정·가입 요청 제한, 재설정 코드 계정당 24시간 5개, web nginx가 앞단 프록시만 믿고 실제 IP를 넘기게(`TRUSTED_PROXIES`), 신원 헤더 덮어쓰기. 미룬 것(시연 흐름을 깨서): 서비스별 DB 역할·MinIO 키·RabbitMQ 계정 분리, 부스 HTTPS, 페어링 IP별 차단, 봉인 뒤 재촬영 막기(진단은 11/13에 막음). 근거: [../decisions.md](../decisions.md) 11/8.

**Q24. 진단 에이전트가 남의 노트북 정보를 마음대로 가져가지 않나요?**
읽는 명령을 코드 상수로 고정했고(`commands.py`의 `ALLOWED`), 결과를 화면에 먼저 보여 준 뒤 동의해야 올립니다. 토큰은 시점 하나에 10분만 쓰고, 서버는 contracts JSON Schema로 다시 검증합니다(networknt).

## 3. 약점과 솔직한 답 (먼저 말하면 점수가 됨)

| 약점 | 지금 | 다음 단계 |
|---|---|---|
| DB 계정 하나를 서버 5개가 같이 씀 | 스키마로 나뉘어 있지만 권한으로는 남의 스키마를 읽을 수 있음 | 서버마다 DB 역할을 두고 자기 스키마에만 권한(11/8 미룬 항목) |
| 이벤트 발행이 아웃박스가 아님 | 채널 트랜잭션 + 멱등 소비자 + DLQ + 수동 봉인 | 트랜잭셔널 아웃박스 |
| 서버 한 대 | 자동 재시작·감시·야간 백업 | 클러스터 매니페스트로 이전, DB 복제 |
| 분산 추적 없음 | 로그·ping·알림 | gateway trace ID → 이벤트 봉투 |
| web nginx에 보안 헤더(CSP·HSTS·X-Frame-Options) 없음 | 앞단 nginx가 TLS만 맡음 | web `nginx.conf`에 헤더 추가(운영 설정이라 확인 뒤) |
| 리프레시 재사용 탐지 없음 | 회전·해시 저장·로그아웃 시 전체 폐기 | 토큰 묶음(family) 단위 폐기 |
| 요청 제한이 Redis 장애 시 꺼짐 | fail-open(서비스 유지 우선) | 로그인만 fail-closed 검토 |

## 4. 이번(11/20)에 문서에서 고친 것

- `architecture.md`: 위 그림과 아래 본문이 서로 달랐던 것(본문은 10/31 클러스터)을 지금 Compose 구성·통신 방식·배포 흐름·포트로 다시 쓰고, 클러스터 설계는 맨 아래에 접어 보관.
- `cicd.md`: 맨 앞에 지금 배포(develop → `:develop` → `autodeploy.sh`)를 기준으로 두고, Argo CD 절은 "클러스터용"으로 표시.
- `mvp/02-services.md`: inspect-worker·chat-server·ollama를 표와 절에 추가, 이벤트 표에 `trace.record.sealed → trace.diagnostics.seals`(11/13) 반영.
- `mvp/01-architecture.md`: 서버 간 REST 예외(JWKS·chat-server)와 11/8 뒤 더한 서비스, 포트 표.
- `design/mvp-design.md` 인증: "NetworkPolicy로 gateway만"은 클러스터 설계이고 지금은 서버마다 JWT를 다시 검증한다는 주석.

## 5. 리뷰 때 바로 열 근거

| 질문 | 열 파일 |
|---|---|
| 구성 | gitops `compose/docker-compose.yml`, `figures/trace-system-architecture.png` |
| 라우팅·권한 | gateway `src/main/resources/application.yml`, `access-policy.yaml` |
| 이벤트 계약 | contracts `events/*.schema.json` |
| 해시 체인 | report_server `record/application/SealService.java`, `SealPayload` |
| 등급·비교 규칙 | capture_server `inspection/domain/GradeRules.java`, `comparison/domain/MatchRule.java` |
| 배포·되돌리기 | gitops `compose/ops/autodeploy.sh` |
| 토큰 | auth_server `token/infra/RedisRefreshTokenStore.java`, `application.yml` 수명 |
