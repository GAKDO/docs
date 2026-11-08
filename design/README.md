# design/

팀이 함께 고친 Claude 문서를 Markdown으로 그대로 내보낸 사본입니다(2026-10-31). 원본은 Claude 문서이고, 원본을 고친 뒤 다시 내보내 커밋합니다.

| 파일 | 원본 탭 |
|---|---|
| `mvp-design.md` | MVP 설계서 › 설계서 (요구사항·아키텍처·인증·ERD 규칙·이벤트·확장성·리뷰 결정) |
| `ddl.md` | MVP 설계서 › 테이블 정의 (DDL) |
| `diagnostics-json-v0.md` | MVP 설계서 › 진단 JSON v0 |
| `rest-api-v0.md` | MVP 설계서 › REST API v0 |
| `kickoff-plan.md` | TRACE 착수 준비 |
| `requirements-status.md` | (docs에서 직접 씀) 요구사항 50개 + FR-RPT-05·06의 구현 위치·상태, 11/8 코드 감사 |

**내보내지 않은 것:** 문서 안의 그림(위젯) 8개는 Markdown으로 나오지 않아 자리 표시만 남았습니다. 아키텍처 구성도와 배포 흐름은 [../architecture.md](../architecture.md)에 Mermaid로 다시 그렸고, ERD v1은 [Crowfoot](https://crowfoot.java21.net/workspaces/68/models/688)에서, 지금 스키마(11/8, 테이블 35개)의 ERD는 [ddl.md](ddl.md)의 Mermaid 그림에서 봅니다. 선택 목록(우선순위·결정 상태)은 글자로 바뀌었습니다.

**11/8 코드 감사로 docs에서 직접 고친 것:** `ddl.md`(지금 스키마·ERD), `rest-api-v0.md`(계약 기준 표·구현 대조), `mvp-design.md`(이벤트 7종·현재 구성 안내). 원본 Claude 문서를 다시 내보낼 때 이 내용을 원본에도 옮겨야 덮어쓰이지 않습니다.
