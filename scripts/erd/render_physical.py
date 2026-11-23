"""TRACE 물리 ERD(SVG)를 design/ddl.md에서 그린다.

물리 모델은 실제 PostgreSQL 표·칼럼·타입·키를 그대로 보인다. ddl.md의 CREATE TABLE을 읽으므로
마이그레이션으로 ddl.md를 고치면 이 스크립트만 다시 돌리면 된다. 표 아래 작은 글씨는 논리명(names.py)이다.

실행: python scripts/erd/render_physical.py  →  design/erd-physical.svg
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from erd_svg import Attr, Entity, render
from names import TABLES, column_name

ROOT = Path(__file__).resolve().parents[2]
DDL = ROOT / "design" / "ddl.md"
OUT = ROOT / "design" / "erd-physical.svg"

DOMAIN_OF = {"rental": "rental", "auth": "auth", "capture": "capture", "inspection": "capture",
             "diagnostics": "diag", "report": "report", "ml": "ml"}
# 다른 서버의 행을 public_id 값으로 가리키는 칼럼(FK 없음)
VALUE_REFS = {"rental_id": "rental.rental", "checkpoint_id": "rental.checkpoint"}

LAYOUT = [
    [("rental", [["rental.device_model"], ["rental.device"], ["rental.rental", "rental.pilot_participant"],
                 ["rental.checkpoint"], ["rental.booth_code"]]),
     ("auth", [["auth.account", "auth.client_credential"],
               ["auth.rental_access", "auth.social_identity", "auth.email_token"],
               ["auth.seal_receipt", "auth.capture_link", "auth.pairing_code"]])],
    [("capture", [["capture.capture_set"],
                  ["capture.photo", "inspection.face_texture", "inspection.grade_result"],
                  ["inspection.face_alignment", "inspection.defect"], ["inspection.defect_match"]]),
     ("diag", [["diagnostics.diagnostic_run", "diagnostics.sealed_checkpoint"],
               ["diagnostics.hardware_component", "diagnostics.battery_reading", "diagnostics.ssd_health",
                "diagnostics.benchmark_result", "diagnostics.inspection_flag"]]),
     [("report", [["report.record_chain", "report.report", "report.processed_event"],
                  ["report.manual_seal_log", "report.checkpoint_view", "report.report_view"]]),
      ("ml", [["ml.dataset_version", "ml.dataset_device"], ["ml.training_run"]])]],
]


def short_type(t: str) -> str:
    t = t.lower().rstrip(",")
    t = t.replace("character varying", "varchar").replace("double precision", "float8")
    t = re.sub(r"numeric\(.*\)", "numeric", t)
    return t


def parse() -> tuple[list[Entity], list[tuple[str, str, str, bool]]]:
    text = DDL.read_text(encoding="utf-8")
    entities: list[Entity] = []
    lines: list[tuple[str, str, str, bool]] = []
    for m in re.finditer(r"CREATE TABLE (\S+) \((.*?)\n\);", text, re.DOTALL):
        table, body = m.group(1), m.group(2)
        schema = table.split(".")[0]
        attrs: list[Attr] = []
        seen: set[str] = set()
        for raw in body.split("\n"):
            line = raw.split("--")[0].strip()
            if not line:
                continue
            cont = re.match(r"CONSTRAINT \w+ REFERENCES (\S+?)\(", line)
            if cont and attrs:  # 앞 칼럼에 이어 쓴 외래 키(수동 봉인 → 체인 줄)
                prev = attrs[-1]
                prev.key = "·".join(k for k in ("FK", *prev.key.split("·")) if k)
                prev.ref = cont.group(1)
                lines.append((cont.group(1), table, prev.name, "UK" in prev.key))
                continue
            word = line.split()[0]
            if word in ("CONSTRAINT", "UNIQUE", "PRIMARY", "CHECK") or not re.fullmatch(r"[a-z_0-9]+", word):
                continue
            if word in seen:
                continue
            seen.add(word)
            rest = line[len(word):].strip()
            typ = re.match(r"(\w+(?: \w+)?(?:\([^)]*\))?)", rest).group(1)
            typ = short_type(typ.replace(" NOT", "").replace(" GENERATED", "").replace(" REFERENCES", "")
                             .replace(" UNIQUE", "").replace(" PRIMARY", "").replace(" DEFAULT", "")
                             .replace(" CHECK", "").replace(" CONSTRAINT", ""))
            keys = []
            if "PRIMARY KEY" in rest:
                keys.append("PK")
            ref = re.search(r"REFERENCES (\S+?)\(", rest)
            if ref:
                keys.append("FK")
            if "UNIQUE" in rest:
                keys.append("UK")
            ref_key = ""
            if ref:
                ref_key = ref.group(1)
                lines.append((ref_key, table, word, "UNIQUE" in rest))
            elif word in VALUE_REFS and "varchar(21)" in typ and VALUE_REFS[word] != table \
                    and DOMAIN_OF[VALUE_REFS[word].split(".")[0]] != DOMAIN_OF[schema]:
                ref_key = VALUE_REFS[word]
            note = typ + (" NN" if "NOT NULL" in rest or "PRIMARY KEY" in rest else "")
            attrs.append(Attr(word, "·".join(keys), ref_key, False, note))
        if table == "diagnostics.sealed_checkpoint":  # checkpoint_id가 기본 키
            attrs[0].key = "PK"
        entities.append(Entity(table, table, DOMAIN_OF[schema], TABLES[table], attrs))
    return entities, lines


def main() -> None:
    entities, lines = parse()
    for e in entities:  # 용어 사전이 스키마를 따라오는지 확인
        for a in e.attrs:
            column_name(e.key, a.name)
    placed = {k for band in LAYOUT for slot in band for _, cols in (slot if isinstance(slot, list) else [slot])
              for col in cols for k in col}
    missing = {e.key for e in entities} - placed
    if missing:
        raise SystemExit(f"LAYOUT에 없는 표: {sorted(missing)}")
    legend = [
        ('<tspan fill="#fbbf24" font-weight="700">PK</tspan> 기본 키 · <tspan font-weight="700" fill="#71717a">FK</tspan> 외래 키 · '
         '<tspan font-weight="700" fill="#71717a">UK</tspan> 유니크 · NN NOT NULL'),
        "선: 같은 서버 안 외래 키(‖ 하나 · ○ 없을 수 있음 · 까마귀발 여럿)",
        "“→ checkpoint”: 다른 서버 행의 public_id(varchar 21)를 값으로만 둠 · 외래 키 없음",
    ]
    head = (
        '<text x="48" y="62" fill="#ff5a5f" font-size="16" font-weight="700" letter-spacing="2">ERD · 물리 모델</text>'
        f'<text x="48" y="100" fill="#fff" font-size="32" font-weight="800" letter-spacing="-1">PostgreSQL 스키마 7개, 테이블 {len(entities)}개</text>'
        '<text x="48" y="130" fill="#a1a1aa" font-size="16">서버마다 자기 스키마만 씁니다 · 기본 키는 bigint, 밖에는 public_id(NanoID 21자) · '
        "design/ddl.md(Flyway 마이그레이션을 모두 적용한 결과)에서 그림 · 2026-11-23 기준</text>"
    )
    render(entities, lines, LAYOUT, head, legend, OUT, "TRACE 물리 ERD", mono=True, box_w=300)


if __name__ == "__main__":
    main()
