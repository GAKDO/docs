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
| MinIO | 버킷 7개 `trace-captures`·`trace-derived`·`trace-raw`·`trace-labels`·`trace-datasets`·`trace-models`·`trace-backups` (11/2 생성, `trace-raw`만 버전 관리, 모두 공개 안 함) | S3 API `http://storage.java21.net:8000` (**HTTP만**), 콘솔 `https://storage.java21.net` | 앱·기기는 아래 역할별 키만 쓴다. 사진은 사전 서명 URL로 직접 업로드 |
| RabbitMQ | vhost `/trace` | `s4.java21.net:5672` (관리 화면 15672) | 이벤트 5종, 집 PC 워커도 접속 |
| Redis | DB 2번(학번 끝자리 규칙), 키 접두사 `trace:` | 학교 Redis 6379 | 클러스터는 내부망 주소(gitops `infra.env`), 집 PC는 외부 주소 |
| InfluxDB | 버킷 `trace-pilot` | 내부망 전용 `http://10.116.64.13:8086` (학교 밖에서는 방화벽 차단 페이지) | 노트북은 로컬 Docker Influx(가짜 데이터)로 개발(web `grafana/`) |
| Grafana | 파일럿 대시보드(데이터 소스 `trace-pilot`) | 우리 클러스터, `https://gakdo.site/grafana/` | 학교 Grafana 대신 우리 클러스터에 둠(NFR-05 예외, decisions.md 11/2). 익명은 보기만, 편집은 관리자 |
| Elasticsearch (선택) | 인덱스 `trace-records-*` | `s4.java21.net:9200` (Kibana 5601) | 11/10에 여유가 없으면 제외 |
| SonarQube | 프로젝트 `trace-<레포>` | `http://s4.java21.net:9000` | CI에서 분석 |
| Gmail SMTP | 팀 Google 계정 하나 | `smtp.gmail.com:587` | 앱 비밀번호는 Rancher Secret. 이메일 인증·재설정·봉인 영수증 3개가 여기에 달림 |

## 학교 서버 Compose (11/2 첫 기동)

클러스터 작업을 멈춘 동안의 시연 경로입니다. 실습 서버(`s2.java21.net`, 내부망 `10.116.64.12`)의 A 계정에서 gitops `compose/`를 띄웁니다.

- 위치: A 계정 `~/gitops/compose`. `.env`는 `./init-env.sh`로 만들었습니다. 빈 계정·비밀 값을 무작위로 채우고, 이미 있는 값은 바꾸지 않습니다. `.env`는 서버에만 있습니다.
- 앱 이미지는 GHCR 비공개라 `docker login ghcr.io`를 한 번 했습니다. `read:packages` 토큰을 쓰고, 30일 이상 유효하게 둡니다.
- 포트: web `8315`(0.0.0.0, 유일한 입구), RabbitMQ `127.0.0.1:5672`, TRACE MinIO `127.0.0.1:19000`(콘솔 19001). 이 서버의 9000·9001은 학교 MinIO(`storage.java21.net:8000`)와 다른 MinIO가 쓰고 있어서 `MINIO_HOST_PORT=19000`으로 옮겼습니다(gitops #13).
- `PUBLIC_BASE_URL`은 `https://gakdo.site`입니다(11/3 민서 결정. trace.java21.net은 DNS에 없어 쓰지 않음). 강사님 nginx(s2-nginx)가 gakdo.site(Cloudflare DNS 전용 A 레코드)를 받아 10.116.64.12:8315로 넘깁니다. 값을 바꾸면 `docker compose up -d`를 다시 실행합니다.
- 집 PC inspect-worker는 SSH 터널로 붙습니다. 포트는 열지 않습니다: `ssh -N -p 8822 -L 5672:127.0.0.1:5672 -L 9000:127.0.0.1:19000 <계정>@s2.java21.net`. 집 PC에서는 `localhost:5672`·`localhost:9000`이 됩니다.
- 갱신: `git pull && docker compose pull && docker compose up -d`. 모든 서비스가 `restart: unless-stopped`입니다.

## 학교 MinIO (11/2)

- **주소:** S3 API는 `http://storage.java21.net:8000`(HTTP만, HTTPS 없음), 웹 콘솔은 `https://storage.java21.net`. 콘솔 주소는 S3 API가 아니므로 `MINIO_ENDPOINT`·`mc alias`·SDK에는 8000 주소를 쓴다.
- **버킷:** `trace-` 버킷 7개를 11/2에 만들었다. `trace-raw`(학습용 원본 사진)는 버전 관리를 켜 실수로 덮어써도 원본이 남고, 7개 모두 익명 공개를 하지 않는다.
- **키:** 공용 계정은 설정 확인용으로만 쓰고, 앱·기기에는 역할별 키만 넣는다(decisions.md 11/2). 키 6개는 모두 우리 버킷만, 필요한 최소 권한만 가진다. **키 값은 Git·문서·채팅에 두지 않는다.**

| 키 | 쓰는 곳 | 용도 |
|---|---|---|
| `trace-server` | 클러스터 앱(capture·report·diagnostics)·매일 DB 백업(pg-backup) | 서비스 사진 사전 서명·확인(`trace-captures`), 리포트·원본 JSON(`trace-derived`), DB 백업(`trace-backups`). trace-secrets `MINIO_ACCESS_KEY`·`MINIO_SECRET_KEY` |
| `trace-worker` | 집 PC inspect-worker·recon-worker | 서비스 사진 읽기, 탐지·텍스처 결과 쓰기(`trace-derived`) |
| `trace-capture` | 학습 데이터 촬영 도구(노트북·Jetson) | `trace-raw` 쓰기(삭제 권한 없음) |
| `trace-labelstudio` | Label Studio | `trace-raw` 읽기, `trace-labels` 쓰기 |
| `trace-trainer` | 집 PC 빌더·학습 | `trace-raw`·`trace-labels` 읽기, `trace-datasets`·`trace-models` 쓰기(ml `deploy/minio/`) |
| `trace-jetson` | 부스 Jetson | `trace-models` 읽기 |

키는 각 기기의 환경 변수나 Rancher Secret에만 둔다. 클러스터 밖 기기(집 PC·Jetson·노트북)는 trace-secrets에 넣지 않는다.

### 한 번 확인 (CA1)

CI와 세션은 MinIO 이미지를 받을 수 없어 moto로 시험하는데, moto는 `x-amz-checksum-sha256`이 틀린 파일도 받습니다. 그래서 "다른 파일은 저장소가 거절한다"와 CORS는 학교 MinIO에서 한 번 직접 확인합니다. 키는 터미널 환경 변수로만 넣고 파일·커밋에 적지 않습니다.

1. **설정 확인(공용 계정):** 공용 계정은 이 단계에서만 쓴다. `mc alias set school-admin http://storage.java21.net:8000 "$MINIO_ADMIN_USER" "$MINIO_ADMIN_PASSWORD"` → `mc ls school-admin | grep trace-`로 버킷 7개, `mc version info school-admin/trace-raw`가 `versioning is enabled`, `mc anonymous get school-admin/trace-raw`(다른 버킷도)가 `private`인지 본다. 끝나면 `mc alias rm school-admin`.
2. **앱 키로 접근 확인:** `mc alias set school http://storage.java21.net:8000 "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY"`(trace-server 키) → `mc ls school/trace-captures`는 되고, `mc ls school/trace-raw`는 거절되면 최소 권한이 맞다.
3. **폰 업로드 경로:** S3 API가 HTTP뿐이라 HTTPS 웹앱에서 `http://` 사전 서명 URL로 PUT·GET하면 브라우저가 혼합 콘텐츠로 막는다. 그래서 web nginx가 `/trace-captures/`·`/trace-derived/`를 MinIO로 넘기고, capture-server는 사전 서명 URL 앞부분을 web 주소(`MINIO_PUBLIC_BASE`)로 바꿔 돌려준다(11/2 A 결정, 블로그 `/blog-images` 방식). 같은 주소라 MinIO CORS는 필요 없다. 배포 뒤 폰에서 세트 하나를 올려 PUT이 200이고 개발자 도구에 혼합 콘텐츠·CORS 오류가 없는지 본다. nginx가 `Host`를 바꾸면 서명이 깨지므로(403 SignatureDoesNotMatch) 그때는 프록시의 `Host` 헤더 설정부터 본다.
4. **해시 거절:** capture_server의 통합 시험을 학교 MinIO에 대고 돌린다. 로컬에 Docker가 있어야 한다(PostgreSQL·RabbitMQ 컨테이너).
   ```
   S3_TEST_ENDPOINT=http://storage.java21.net:8000 S3_TEST_VERIFIES_CHECKSUM=true \
   S3_TEST_ACCESS_KEY="$MINIO_ACCESS_KEY" S3_TEST_SECRET_KEY="$MINIO_SECRET_KEY" \
   ./mvnw test -Dtest=CaptureIntegrationTest
   ```
   통과하면 사전 서명 PUT·완료·이벤트·해시 대조가 실제 MinIO에서 맞고, 알린 해시와 다른 파일 PUT이 4xx로 거절된 것이다. 시험은 `trace-captures/captures/<새 세트 ID>/`와 `captures/plain/`에 작은 파일을 남기므로 끝나면 `mc rm --recursive --force school/trace-captures/captures/plain/`처럼 지운다.
5. 결과를 `team/board.md` CA1 비고와 그날 스탠드업에 적는다. 거절되지 않으면(200) 계약을 바꾸지 말고 바로 알린다(서버의 complete 해시 대조가 마지막 방어선이라 데이터는 안전).

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
