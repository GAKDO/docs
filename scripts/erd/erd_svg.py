"""ERD SVG 그리기(논리·물리 공통). render_logical.py·render_physical.py가 부른다."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from xml.sax.saxutils import escape

DOMAINS = {
    "rental": ("렌탈·기기", "#3b82f6", "rental-server"),
    "auth": ("회원·인증", "#22c55e", "auth-server"),
    "capture": ("촬영·검사", "#f59e0b", "capture-server"),
    "diag": ("진단", "#ef4444", "diagnostics-server"),
    "report": ("기록·리포트", "#a855f7", "report-server"),
    "ml": ("학습 데이터", "#14b8a6", "집 PC"),
}


@dataclass
class Attr:
    name: str
    key: str = ""  # PK, FK, PK·FK, UK
    ref: str = ""  # FK가 가리키는 엔터티 키
    optional: bool = False
    note: str = ""  # 오른쪽에 키 앞에 붙는 글자(물리 모델의 타입)


@dataclass
class Entity:
    key: str
    name: str
    domain: str
    physical: str
    attrs: list[Attr] = field(default_factory=list)


def A(name: str, key: str = "", ref: str = "", opt: bool = False) -> Attr:
    return Attr(name, key, ref, opt)


BOX_W, COL_GAP, ROW_H, HEAD_H, PAD = 268, 64, 19, 50, 10
GROUP_PAD, GROUP_GAP, BAND_GAP, TOP = 28, 36, 40, 168
BG, CARD, CARD_LINE, TEXT, MUTED, LINE = "#0b0b0f", "#17171c", "#2f2f37", "#d4d4d8", "#71717a", "#52525b"


def box_h(e: Entity) -> int:
    return HEAD_H + len(e.attrs) * ROW_H + PAD


def render(entities: list[Entity], lines_spec: list[tuple[str, str, str, bool]], layout: list,
           head: str, legend_rows: list[str], out: Path, label: str, mono: bool = False,
           box_w: int = 268) -> None:
    global BOX_W
    BOX_W = box_w
    BY_KEY = {e.key: e for e in entities}
    ENTITIES = entities
    LINES = lines_spec
    LAYOUT = layout
    pos: dict[str, tuple[float, float]] = {}
    parts: list[str] = []
    groups: list[str] = []
    y = TOP
    width = 0.0
    def place(dom: str, cols: list[list[str]], gx: float, gy: float) -> tuple[float, float]:
        cx = gx + GROUP_PAD
        col_h = 0.0
        for col in cols:
            cy = gy + 64
            for key in col:
                pos[key] = (cx, cy)
                cy += box_h(BY_KEY[key]) + 24
            col_h = max(col_h, cy - gy)
            cx += BOX_W + COL_GAP
        gw = cx - COL_GAP + GROUP_PAD - gx
        gh = col_h + 4
        label, color, server = DOMAINS[dom]
        groups.append(
            f'<rect x="{gx}" y="{gy}" width="{gw}" height="{gh}" rx="16" fill="#101014" stroke="#24242b"/>'
            f'<rect x="{gx}" y="{gy}" width="6" height="{gh}" rx="3" fill="{color}"/>'
            f'<text x="{gx + 28}" y="{gy + 38}" fill="#fff" font-size="20" font-weight="800">{escape(label)}</text>'
            f'<text x="{gx + 28 + 22 * len(label) + 12}" y="{gy + 38}" fill="{MUTED}" font-size="14">{escape(server)}</text>'
        )
        return gw, gh

    for band in LAYOUT:
        x = 48.0
        band_h = 0.0
        for slot in band:
            stack = slot if isinstance(slot, list) else [slot]
            sy, sw = y, 0.0
            for dom, cols in stack:
                gw, gh = place(dom, cols, x, sy)
                sy += gh + GROUP_GAP
                sw = max(sw, gw)
            x += sw + GROUP_GAP
            band_h = max(band_h, sy - GROUP_GAP - y)
        width = max(width, x - GROUP_GAP + 48)
        y += band_h + BAND_GAP
    height = y - BAND_GAP + 72

    def row_y(key: str, attr_name: str) -> float:
        e = BY_KEY[key]
        i = next(i for i, a in enumerate(e.attrs) if a.name == attr_name)
        return pos[key][1] + HEAD_H + i * ROW_H + ROW_H / 2 + 2

    def pk_y(key: str) -> float:
        return pos[key][1] + HEAD_H + ROW_H / 2 + 2

    lines: list[str] = []
    fan: dict[str, int] = {}
    for parent, child, attr, one in LINES:
        px, _ = pos[parent]
        cx, _ = pos[child]
        y1, y2 = pk_y(parent), row_y(child, attr)
        k = fan.get(parent, 0)
        fan[parent] = k + 1
        if cx > px:  # 부모가 왼쪽 열
            x1, x2 = px + BOX_W, cx
            mid = x1 + 16 + 9 * k
            lines.append(f'<path d="M{x1} {y1} H{mid} V{y2} H{x2}" fill="none" stroke="{LINE}" stroke-width="1.6"/>')
            lines.append(f'<path d="M{x1 + 7} {y1 - 6} v12 M{x1 + 11} {y1 - 6} v12" stroke="{TEXT}" stroke-width="1.6"/>')
            end = x2
            sign = -1
        else:  # 같은 열(부모가 위): 왼쪽으로 돌아감
            x1 = px
            mid = x1 - 14 - 7 * k
            lines.append(f'<path d="M{x1} {y1} H{mid} V{y2} H{x1}" fill="none" stroke="{LINE}" stroke-width="1.6"/>')
            lines.append(f'<path d="M{x1 - 7} {y1 - 6} v12 M{x1 - 11} {y1 - 6} v12" stroke="{TEXT}" stroke-width="1.6"/>')
            end = x1
            sign = -1
        if one:  # 0..1: 원 + 막대
            lines.append(f'<circle cx="{end + sign * 16}" cy="{y2}" r="4.5" fill="{BG}" stroke="{TEXT}" stroke-width="1.6"/>'
                         f'<path d="M{end + sign * 7} {y2 - 6} v12" stroke="{TEXT}" stroke-width="1.6"/>')
        else:  # 0..N: 원 + 까마귀발
            lines.append(f'<path d="M{end + sign * 12} {y2} L{end} {y2 - 6} M{end + sign * 12} {y2} L{end} {y2 + 6}" stroke="{TEXT}" stroke-width="1.6" fill="none"/>'
                         f'<circle cx="{end + sign * 18}" cy="{y2}" r="4.5" fill="{BG}" stroke="{TEXT}" stroke-width="1.6"/>')

    for e in ENTITIES:
        x, y0 = pos[e.key]
        color = DOMAINS[e.domain][1]
        h = box_h(e)
        g = [f'<g transform="translate({x} {y0})">',
             f'<rect width="{BOX_W}" height="{h}" rx="10" fill="{CARD}" stroke="{CARD_LINE}"/>',
             f'<rect width="{BOX_W}" height="4" rx="2" fill="{color}"/>',
             f'<text x="14" y="24" fill="#fff" font-size="{14 if mono else 15}" font-weight="800"{' class="m"' if mono else ""}>{escape(e.name)}</text>',
             f'<text x="14" y="40" fill="{MUTED}" font-size="{11 if mono else 10.5}"{"" if mono else ' class="m"'}>{escape(e.physical)}</text>',
             f'<path d="M0 {HEAD_H - 4} H{BOX_W}" stroke="{CARD_LINE}"/>']
        for i, a in enumerate(e.attrs):
            ry = HEAD_H + i * ROW_H + ROW_H / 2 + 6
            weight = ' font-weight="700"' if "PK" in a.key else ""
            fill = "#fff" if "PK" in a.key else TEXT
            name = a.name + (" ◦" if a.optional else "")
            g.append(f'<text x="12" y="{ry}" fill="{fill}" font-size="{11.5 if mono else 12}"{weight}{' class="m"' if mono else ""}>{escape(name)}</text>')
            key = a.key
            rcolor = MUTED
            if a.ref and a.ref in BY_KEY and BY_KEY[a.ref].domain != e.domain:
                tgt = BY_KEY[a.ref]
                key = f"{a.key} → {tgt.name.split('.')[-1]}".strip()
                rcolor = DOMAINS[tgt.domain][1]
            kcolor = "#fbbf24" if a.key.startswith("PK") and rcolor == MUTED else rcolor
            spans = []
            if a.note:
                spans.append(f'<tspan fill="{MUTED}" font-weight="400" class="m">{escape(a.note)}</tspan>')
            if key:
                spans.append(f'<tspan fill="{kcolor}" font-weight="700">{" " if a.note else ""}{escape(key)}</tspan>')
            if spans:
                g.append(f'<text x="{BOX_W - 12}" y="{ry}" font-size="10.5" text-anchor="end">{"".join(spans)}</text>')
        g.append("</g>")
        parts.append("".join(g))

    legend_x = width - 48 - 640
    legend = (f'<g transform="translate({legend_x} 48)"><rect width="640" height="{20 + 24 * len(legend_rows)}" rx="12" fill="#121216" stroke="#2c2c33"/>'
              + "".join(f'<text x="18" y="{28 + 24 * i}" fill="{TEXT}" font-size="12.5">{r}</text>' for i, r in enumerate(legend_rows))
              + "</g>")
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width:.0f}" height="{height:.0f}" viewBox="0 0 {width:.0f} {height:.0f}" '
        f'role="img" aria-label="{escape(label)}">\n'
        '<style>.t{font-family:Pretendard,"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif}'
        '.m{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}</style>\n'
        f'<rect width="{width:.0f}" height="{height:.0f}" rx="24" fill="{BG}"/>\n<g class="t">\n'
        + head + legend + "\n" + "\n".join(groups) + "\n" + "\n".join(lines) + "\n" + "\n".join(parts) + "\n</g>\n</svg>\n"
    )
    out.write_text(svg, encoding="utf-8")
    print(f"{out} ({width:.0f}x{height:.0f}, {len(ENTITIES)}개)")
