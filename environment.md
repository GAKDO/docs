# 개발·운영 환경

학교 서버, 공유 인프라, 외부 서비스를 어떻게 쓰는지 정리합니다. **비밀번호·토큰·학번은 이 레포에 적지 않습니다.** 비밀 값은 Rancher Secret과 GitHub Secret에만 둡니다.

## 학교 서버와 포트

| 항목 | 값 |
|---|---|
| 실습 서버 | `s2.java21.net` (SSH 8822, 계정은 각자 학번) |
| 개인 포트 범위 | 8300~8499를 학생마다 10개씩. 컨테이너·서비스는 자기 범위 안의 포트만 쓴다 |
| TRACE가 쓰는 포트 | A 계정 범위 8310~8319 중 **8314 gateway, 8315 web, 8316 label-studio** (NodePort). 8318은 지난 프로젝트가 사용 중, 나머지는 예비 |
| 클러스터 | 학교 Rancher 클러스터, 네임스페이스 `trace`, 배포는 학교 Argo CD |

## 공유 인프라

| 인프라 | 우리 자원 | 접속 주소 | 비고 |
|---|---|---|---|
| PostgreSQL | DB `trace`(스키마 7), `labelstudio` | 클러스터 안 `postgres:5432` | 예외로 클러스터에 직접 설치(리뷰 결정 14), 매일 MinIO 백업 |
| MinIO | `trace-captures`·`trace-derived`·`trace-raw`·`trace-labels`·`trace-datasets`·`trace-models`·`trace-backups` | `https://storage.java21.net` | 사진은 사전 서명 URL로 직접 업로드 |
| RabbitMQ | vhost `/trace` | `s4.java21.net:5672` (관리 화면 15672) | 이벤트 5종, 집 PC 워커도 접속 |
| Redis | DB 2번(학번 끝자리 규칙), 키 접두사 `trace:` | 학교 Redis 6379 | 클러스터는 내부망 주소(gitops `infra.env`), 집 PC는 외부 주소 |
| InfluxDB | 버킷 `trace-pilot` | `http://influx.java21.net` | Grafana는 로컬 Docker(11/2) |
| Elasticsearch (선택) | 인덱스 `trace-records-*` | `s4.java21.net:9200` (Kibana 5601) | 11/10에 여유가 없으면 제외 |
| SonarQube | 프로젝트 `trace-<레포>` | `http://s4.java21.net:9000` | CI에서 분석 |
| Gmail SMTP | 팀 Google 계정 하나 | `smtp.gmail.com:587` | 앱 비밀번호는 Rancher Secret. 이메일 인증·재설정·봉인 영수증 3개가 여기에 달림 |

## 학교 MinIO 한 번 확인 (CA1, 11/2)

CI와 세션은 MinIO 이미지를 받을 수 없어 moto로 시험하는데, moto는 `x-amz-checksum-sha256`이 틀린 파일도 받습니다. 그래서 "다른 파일은 저장소가 거절한다"는 학교 MinIO에서 한 번 직접 확인합니다. 키는 trace-secrets의 `MINIO_ACCESS_KEY`·`MINIO_SECRET_KEY`를 터미널 환경 변수로만 넣고 파일·커밋에 적지 않습니다.

1. 버킷이 있는지 본다: `mc alias set school https://storage.java21.net "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY"` → `mc ls school/trace-captures`. 없으면 `mc mb school/trace-captures`.
2. 브라우저(폰 웹앱)에서 올릴 수 있게 CORS가 `PUT`과 헤더 `Content-Type`·`x-amz-checksum-sha256`을 허용하는지 본다. web 주소로 사전 요청을 보내 `Access-Control-Allow-Headers`에 두 헤더가 있으면 된다.
   ```
   curl -si -X OPTIONS https://storage.java21.net/trace-captures/check.jpg \
     -H "Origin: https://gakdo.site:8315" -H "Access-Control-Request-Method: PUT" \
     -H "Access-Control-Request-Headers: content-type,x-amz-checksum-sha256"
   ```
   허용하지 않으면 학교 MinIO 관리자에게 이 오리진·헤더를 요청한다(공용 MinIO라 우리가 바꿀 수 없을 수 있음).
3. capture_server의 통합 시험을 학교 MinIO에 대고 돌린다. 로컬에 Docker가 있어야 한다(PostgreSQL·RabbitMQ 컨테이너).
   ```
   S3_TEST_ENDPOINT=https://storage.java21.net S3_TEST_VERIFIES_CHECKSUM=true \
   S3_TEST_ACCESS_KEY="$MINIO_ACCESS_KEY" S3_TEST_SECRET_KEY="$MINIO_SECRET_KEY" \
   ./mvnw test -Dtest=CaptureIntegrationTest
   ```
   통과하면 사전 서명 PUT·완료·이벤트·해시 대조가 실제 MinIO에서 맞고, 알린 해시와 다른 파일 PUT이 4xx로 거절된 것이다. 시험은 `trace-captures/captures/<새 세트 ID>/`와 `captures/plain/`에 작은 파일을 남기므로 끝나면 `mc rm --recursive --force school/trace-captures/captures/plain/`처럼 지운다.
4. 결과를 `team/board.md` CA1 비고와 그날 스탠드업에 적는다. 거절되지 않으면(200) 계약을 바꾸지 말고 바로 알린다(서버의 complete 해시 대조가 마지막 방어선이라 데이터는 안전).

## 도메인과 HTTPS (11/2)

1. 가비아에서 도메인을 산다.
2. DNS 인증(TXT 레코드)으로 인증서를 받는다.
3. 인증서를 Rancher Secret에 넣고 web·gateway가 직접 TLS를 처리한다: `https://<도메인>:8315`(웹), `https://<도메인>:8314`(API).
4. gateway CORS에 web 주소만 허용한다.

폰 웹앱은 카메라를 써서 HTTPS가 아니면 동작하지 않습니다.

## Crowfoot (ERD)

- 워크스페이스: **TRACE** (`https://crowfoot.java21.net`), ERD 문서 "TRACE MVP ERD"
- Claude에서 쓰려면 워크스페이스 **MCP 탭**에서 액세스 토큰을 발급받아 연결합니다. 토큰이 곧 어느 워크스페이스에 붙을지를 정합니다.
  - claude.ai 커스텀 커넥터: URL `https://crowfoot-mcp.java21.net/mcp`, 인증 **로그인 없음**, 요청 헤더 `Authorization` = `Bearer <토큰>`. OAuth("지금 로그인")로 연결하면 등록 오류가 나거나 다른 워크스페이스로 붙습니다.
  - Claude Code: MCP 탭의 "Claude Code 등록 명령"을 작업 폴더에서 실행합니다.
- 토큰은 각자 발급받아 쓰고 채팅·레포에 붙여 넣지 않습니다.

## GitHub

- 조직: GAKDO. 레포 12개 + 이 문서 레포.
- Claude가 레포에서 작업하려면 조직에 Claude GitHub 앱을 설치해야 합니다(https://github.com/apps/claude).
- CI/CD에 필요한 조직 Secret·변수는 [cicd.md](cicd.md)의 "처음 한 번 설정할 것"에 있습니다.
