// MVP API 문서에 "쉬운 설명 · 누가 부르나 · 어느 기능"을 붙인다.
//   사용: node api-docs/enrich.mjs <입력 bundle.json> <출력.json>
// - 계약(경로·필드·응답)은 건드리지 않고, 문서용 summary·description·tags·x-tagGroups만 바꾼다.
// - 설명 글의 원본은 guide/data.mjs (안내서와 같은 데이터).
import { readFileSync, writeFileSync } from "node:fs";
import { FEATURES, F0, OPS, API_GROUPS, GUIDE_URL } from "../guide/data.mjs";

const [, , input, output] = process.argv;
if (!input || !output) {
  console.error("사용: node api-docs/enrich.mjs <입력.json> <출력.json>");
  process.exit(2);
}
const doc = JSON.parse(readFileSync(input, "utf8"));
const feats = Object.fromEntries([F0, ...FEATURES].map((f) => [f.id, f]));
const tagName = (id) => `${id} ${feats[id].title}`;
const guide = (id) => `${GUIDE_URL}#${id.toLowerCase()}`;

// 1) API마다 설명 붙이기
const seen = new Set();
for (const [path, item] of Object.entries(doc.paths)) {
  for (const [method, op] of Object.entries(item)) {
    if (!["get", "post", "put", "patch", "delete"].includes(method)) continue;
    const g = OPS[op.operationId];
    if (!g) throw new Error(`guide/data.mjs OPS에 설명이 없음: ${op.operationId} (${method.toUpperCase()} ${path})`);
    seen.add(op.operationId);
    const original = op.description ? `\n\n---\n\n#### 계약 원문 설명\n\n${op.description}` : "";
    const featLinks = g.features.map((f) => `[${tagName(f)}](${guide(f)})`).join(", ");
    op.description = [
      `> **${g.plain}**`,
      "",
      "| | |",
      "|---|---|",
      `| 누가 부르나 | ${g.caller} |`,
      `| 언제 | ${g.when} |`,
      `| 쓰이는 기능 | ${featLinks} |`,
      `| 필요한 출입증 | ${g.auth} |`,
      g.next ? `| 다음 단계 | ${g.next} |` : null,
      `| 원래 이름 | \`${op.operationId}\` · ${op.summary || ""} |`,
    ].filter((x) => x !== null).join("\n") + original;
    op.summary = g.name;
    op.tags = g.features.map(tagName);
  }
}
const missing = Object.keys(OPS).filter((id) => !seen.has(id));
if (missing.length) throw new Error(`문서에 없는 API 설명: ${missing.join(", ")} (redocly.yaml filter-in 목록 확인)`);

// 2) 기능 = 왼쪽 메뉴 묶음
const used = new Set(Object.values(OPS).flatMap((o) => o.features));
doc.tags = [F0, ...FEATURES].filter((f) => used.has(f.id)).map((f) => {
  const steps = (f.steps || []).map((s, i) => `${i + 1}. ${s.text}${s.api ? ` → \`${s.api}\`` : ""}`).join("\n");
  return {
    name: tagName(f.id),
    "x-displayName": tagName(f.id),
    description: [`**${f.goal}**`, "", f.plain, steps ? `\n**흐름**\n\n${steps}` : "", `\n[안내서에서 그림으로 보기 →](${guide(f.id)})`].join("\n"),
  };
});
doc["x-tagGroups"] = API_GROUPS.map((g) => ({ name: g.name, tags: g.features.filter((f) => used.has(f)).map(tagName) }));

// 3) 첫 화면 설명
doc.info.title = "TRACE MVP API";
doc.info.description = `TRACE 최소 MVP(11/9)에서 실제로 쓰는 API ${seen.size}개입니다. 처음 보는 분은 [안내서](${GUIDE_URL})의 그림을 먼저 보면 쉽습니다.

## 이 문서 읽는 법

- **왼쪽 메뉴는 기능 순서**입니다. ① 관리자 화면(web)이 부르는 API, ② 부스(Jetson의 booth 앱)가 부르는 API, ③ 배포 확인으로 나눴습니다.
- API마다 맨 위에 **누가 부르나 · 언제 · 쓰이는 기능 · 필요한 출입증**을 적었습니다. 한 API를 여러 기능이 쓰면 그 기능 메뉴마다 보입니다.
- 주소는 \`https://gakdo.site\` + 경로입니다. 예: \`POST https://gakdo.site/api/v1/auth/login\`.
- 출입증(JWT)은 \`Authorization: Bearer <토큰>\` 헤더로 보냅니다. 관리자는 로그인(15분), 부스는 부스 출입증(1시간)으로 받습니다.
- 오류는 RFC 9457 Problem Details(\`application/problem+json\`)이고, \`code\` 값으로 무슨 오류인지 압니다.
- 부스 태블릿이 Jetson에 보내는 로컬 API(\`http://Jetson:8320/api/...\`)는 서버 API가 아니라서 여기에 없습니다. [안내서 F5~F8](${guide("F5")})에 있습니다.

## 검사 한 건의 순서

| 순서 | 기능 | 부르는 곳 | API |
|---|---|---|---|
| 1 | F1 관리자 로그인 | 관리자 화면 | \`login\` → \`getMe\` |
| 2 | F2·F3 기종·기기 등록 | 관리자 화면 | \`upsertDeviceModel\`, \`createDevice\` |
| 3 | F4 렌탈 열기·출고 검사 시작 | 관리자 화면 | \`createRental\` → \`startCheckpoint\` |
| 4 | F5 검사 기다리는 기기 | 부스 | \`issueBoothToken\` → \`listRentals\` |
| 5 | F7 사진 업로드·완료 | 부스 | \`createCaptureSet\` → (사진 PUT) → \`completeCaptureSet\` |
| 6 | F9 탐지 저장·등급 | 부스 | \`saveBoothDetections\` |
| 7 | F10 결과 보기 | 관리자 화면 | \`getRental\` → \`getCheckpointMedia\` · \`getCheckpointInspection\` |

계약 원본은 [GAKDO/contracts](https://github.com/GAKDO/contracts)(develop)이고, 이 쪽은 매일 자동으로 다시 만듭니다.`;
doc.servers = [{ url: "https://gakdo.site", description: "실제 서버 (강사님 nginx → web nginx → gateway)" }];

writeFileSync(output, JSON.stringify(doc, null, 2));
console.log(`설명 붙임: API ${seen.size}개, 기능 메뉴 ${doc.tags.length}개 → ${output}`);
