# F3 해시 체인·검증 구조 (원본)

RP1(report-server) 구현 기준. 발표용 PNG는 이 mermaid를 그려서 만든다. 개인 정보 없음.

```mermaid
flowchart LR
  subgraph 봉인["봉인 (checkpoint.graded 받을 때)"]
    P1["payload<br/>시점·등급·규칙 버전<br/>사진 photoId·sha256<br/>진단 runId·sha256"] --> H1["payloadHash<br/>SHA-256(정규화 JSON)"]
    H1 --> R1["recordHash<br/>SHA-256(trace-chain-1 한 줄)"]
    R1 --> S1["Ed25519 서명<br/>(CHAIN_SIGNING_KEY)"]
  end
  OUT["1 출고 OUT"] -->|prevHash| RCV["2 수령 RCV"] -->|prevHash| RET["3 반납 RET"]
  subgraph 검증["공개 검증 /verify/{token}"]
    V1["서명 확인"] --> V2["prevHash 연결 확인"] --> V3["MinIO 사진 다시 해시"]
    V3 --> OK["변조 없음"]
    V3 --> NG["변조 의심 (깨진 seq 표시)"]
  end
  RET -.-> V1
```

## 시연에서 보여 줄 점

- 사진 한 장을 바꾸면 검증이 `valid=false`, 깨진 seq를 돌려준다(report_server `ReportIntegrationTest`가 같은 흐름을 매번 확인).
- 검증 페이지는 로그인 없이 열리고, 서명·사진 주소·렌탈 ID는 보이지 않는다(등급·시점·지문·서명 시각만).
- 파이프라인이 멈춰도 관리자 수동 봉인(사유 필수, 사용 기록)으로 체인을 이어 갈 수 있다.
