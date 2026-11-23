"""TRACE 논리 ERD(SVG)를 그린다.

논리 모델은 업무 엔터티·속성·관계만 한글로 보인다. 내부 ID·생성/수정 시각·멱등 키·해시 같은
구현 칼럼과, 다른 서버 값을 받아 둔 사본 표(시점 읽기 모델 등)는 물리 ERD(ddl.md)에만 있다.
서버 사이 참조(FK 없음)도 논리 관계로 보이되, 다른 영역을 가리키는 속성은 '→ 대상'으로 적는다.

실행: python scripts/erd/render_logical.py  →  design/erd-logical.svg
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from erd_svg import Attr, Entity, render

OUT = Path(__file__).resolve().parents[2] / "design" / "erd-logical.svg"


def A(name: str, key: str = "", ref: str = "", opt: bool = False) -> Attr:
    return Attr(name, key, ref, opt)


E = Entity
ENTITIES = [
    # 렌탈·기기
    E("model", "기종", "rental", "rental.device_model", [
        A("기종 코드", "PK"), A("이름"), A("제조사", opt=True), A("형태"), A("기준 사양", opt=True),
        A("가로·세로(mm)"), A("본체·덮개 두께(mm)")]),
    E("device", "기기", "rental", "rental.device", [
        A("기기 ID", "PK"), A("일련번호", "UK"), A("기종", "FK", "model"), A("운영체제"),
        A("색상", opt=True), A("자산 번호", opt=True), A("상태"), A("폐기 시각", opt=True)]),
    E("rental", "렌탈", "rental", "rental.rental", [
        A("렌탈 ID", "PK"), A("기기", "FK", "device"), A("대여자 참조 번호"), A("상태"),
        A("시작·종료 시각", opt=True), A("고객 이름", opt=True), A("반납 예정일", opt=True),
        A("메모", opt=True)]),
    E("pilot", "파일럿 참여자", "rental", "rental.pilot_participant", [
        A("참여자 ID", "PK"), A("별칭", "UK"), A("기기", "FK", "device"), A("동의 시각")]),
    E("checkpoint", "검사 시점", "rental", "rental.checkpoint", [
        A("시점 ID", "PK"), A("렌탈", "FK", "rental"), A("시점 종류(출고·수령·반납)"),
        A("상태"), A("발생 시각", opt=True), A("등급(사본)", opt=True)]),
    E("boothcode", "부스 일회용 코드", "rental", "rental.booth_code", [
        A("코드", "PK"), A("검사 시점", "FK", "checkpoint"), A("만료 시각"), A("사용 시각", opt=True)]),
    # 회원·인증
    E("account", "계정", "auth", "auth.account", [
        A("계정 ID", "PK"), A("이메일", "UK", opt=True), A("이름", opt=True), A("역할"), A("상태"),
        A("비밀번호", opt=True), A("이메일 인증 시각", opt=True), A("개인정보 동의 시각", opt=True),
        A("탈퇴 시각", opt=True)]),
    E("access", "고객 렌탈 연결", "auth", "auth.rental_access", [
        A("계정", "PK·FK", "account"), A("렌탈", "PK·FK", "rental"), A("연결 시각")]),
    E("social", "소셜 로그인 연결", "auth", "auth.social_identity", [
        A("제공자", "PK"), A("제공자 사용자 ID", "PK"), A("계정", "FK", "account"),
        A("제공자 이메일", opt=True)]),
    E("emailtoken", "메일 인증 코드", "auth", "auth.email_token", [
        A("코드", "PK"), A("계정", "FK", "account"), A("용도"), A("시도 횟수"), A("만료 시각"),
        A("사용 시각", opt=True)]),
    E("receipt", "봉인 영수증", "auth", "auth.seal_receipt", [
        A("검사 시점", "PK·FK", "checkpoint"), A("봉인 지문"), A("봉인 시각"), A("발송 시각", opt=True)]),
    E("link", "폰 촬영 링크", "auth", "auth.capture_link", [
        A("토큰", "PK"), A("검사 시점", "FK", "checkpoint"), A("만료 시각"), A("사용 시각", opt=True)]),
    E("pairing", "에이전트 페어링 코드", "auth", "auth.pairing_code", [
        A("코드", "PK"), A("검사 시점", "FK", "checkpoint"), A("기기 일련번호"), A("만료 시각"),
        A("사용 시각", opt=True)]),
    E("client", "부스 클라이언트 자격", "auth", "auth.client_credential", [
        A("클라이언트 ID", "PK"), A("비밀"), A("부스 종류(출고·반납)"), A("사용 중")]),
    # 촬영·검사
    E("set", "촬영 세트", "capture", "capture.capture_set", [
        A("세트 ID", "PK"), A("검사 시점", "FK", "checkpoint"), A("출처(부스·폰)"), A("부스 ID", opt=True),
        A("검사 방식(FULL·QUICK)"), A("상태"), A("품질 판정", opt=True), A("건너뛴 면", opt=True),
        A("기종·치수 스냅샷"), A("탐지 모델 버전", opt=True), A("검수 완료 시각", opt=True)]),
    E("photo", "사진", "capture", "capture.photo", [
        A("사진 ID", "PK"), A("촬영 세트", "FK", "set"), A("면"), A("조명"), A("카메라"),
        A("저장소 키·해시"), A("품질 통과", opt=True), A("촬영 시각", opt=True)]),
    E("texture", "면 텍스처", "capture", "inspection.face_texture", [
        A("촬영 세트", "PK·FK", "set"), A("면", "PK"), A("저장소 키")]),
    E("grade", "등급 결과", "capture", "inspection.grade_result", [
        A("검사 시점", "PK·FK", "checkpoint"), A("촬영 세트", "FK", "set"), A("등급(A~D)"),
        A("판정 사유"), A("판정 불가 면", opt=True), A("규칙 버전")]),
    E("align", "면 정합", "capture", "inspection.face_alignment", [
        A("사진", "PK·FK", "photo"), A("정합 방법"), A("호모그래피 행렬"), A("정합 오차(px)"),
        A("펼친 이미지", opt=True)]),
    E("defect", "흠집", "capture", "inspection.defect", [
        A("흠집 ID", "PK"), A("사진", "FK", "photo"), A("흠집 종류"), A("사진 좌표 다각형"),
        A("표준 좌표 다각형", opt=True), A("길이·넓이(mm)", opt=True), A("신뢰도"), A("탐지 출처"),
        A("검수 상태"), A("검수자·시각", opt=True)]),
    E("match", "흠집 대조", "capture", "inspection.defect_match", [
        A("흠집", "PK·FK", "defect"), A("이전 흠집", "FK", "defect", opt=True),
        A("대조 결과(신규·기존)"), A("거리(mm)", opt=True), A("규칙 버전")]),
    # 진단
    E("run", "진단 실행", "diag", "diagnostics.diagnostic_run", [
        A("진단 ID", "PK"), A("검사 시점", "FK", "checkpoint"), A("기기 일련번호"), A("운영체제"),
        A("에이전트 버전"), A("측정 조건"), A("보안 상태 확인", opt=True), A("원본 JSON"),
        A("측정 완료 시각"), A("동의 시각"), A("대체된 시각", opt=True)]),
    E("component", "하드웨어 부품", "diag", "diagnostics.hardware_component", [
        A("진단 실행", "PK·FK", "run"), A("부품 종류", "PK"), A("식별자"), A("세부 내용", opt=True)]),
    E("battery", "배터리 측정", "diag", "diagnostics.battery_reading", [
        A("진단 실행", "PK·FK", "run"), A("충전 횟수", opt=True), A("설계·완충 용량", opt=True),
        A("최대 용량(%)", opt=True), A("배터리 상태", opt=True), A("생략 사유", opt=True)]),
    E("ssd", "SSD 상태", "diag", "diagnostics.ssd_health", [
        A("진단 실행", "PK·FK", "run"), A("수명 사용률(%)", opt=True), A("예비 영역(%)", opt=True),
        A("치명 경고", opt=True), A("사용 시간(h)", opt=True), A("생략 사유", opt=True)]),
    E("bench", "벤치마크 결과", "diag", "diagnostics.benchmark_result", [
        A("진단 실행", "PK·FK", "run"), A("측정 항목", "PK"), A("3회 측정값"), A("중앙값")]),
    E("flag", "점검 플래그", "diag", "diagnostics.inspection_flag", [
        A("진단 실행", "PK·FK", "run"), A("플래그 종류", "PK"), A("비교 기준 진단", "FK", "run"),
        A("근거")]),
    # 기록·리포트
    E("chain", "기록 해시 체인", "report", "report.record_chain", [
        A("검사 시점", "PK·FK", "checkpoint"), A("순번"), A("서명 원문·해시"), A("이전 줄 해시", opt=True),
        A("이 줄 해시"), A("서명"), A("수동 봉인 여부"), A("서명 시각")]),
    E("report", "리포트", "report", "report.report", [
        A("렌탈", "PK·FK", "rental"), A("검증 토큰", "UK"), A("기기·기종(사본)")]),
    E("manual", "수동 봉인 기록", "report", "report.manual_seal_log", [
        A("체인 줄", "PK·FK", "chain"), A("사유"), A("봉인한 관리자", "FK", "account")]),
    # 학습 데이터
    E("dsversion", "데이터셋 버전", "ml", "ml.dataset_version", [
        A("버전", "PK"), A("목록 파일"), A("빌더 커밋"), A("개수"), A("만든 시각")]),
    E("dsdevice", "데이터셋 기기", "ml", "ml.dataset_device", [
        A("기기 코드", "PK"), A("기종 이름"), A("색상", opt=True), A("학습·검증 분할")]),
    E("train", "학습 실행", "ml", "ml.training_run", [
        A("학습 ID", "PK"), A("데이터셋 버전", "FK", "dsversion"), A("시작 가중치"), A("성능 지표"),
        A("모델 파일", opt=True)]),
]

# 같은 영역 안의 관계만 선으로 긋는다: (부모, 자식, 자식 속성 이름, 자식 쪽 최대가 하나인가)
LINES = [
    ("model", "device", "기종", False), ("device", "rental", "기기", False),
    ("device", "pilot", "기기", False), ("rental", "checkpoint", "렌탈", False),
    ("checkpoint", "boothcode", "검사 시점", False),
    ("account", "access", "계정", False), ("account", "social", "계정", False),
    ("account", "emailtoken", "계정", False),
    ("set", "photo", "촬영 세트", False), ("set", "texture", "촬영 세트", False),
    ("set", "grade", "촬영 세트", True), ("photo", "align", "사진", True),
    ("photo", "defect", "사진", False), ("defect", "match", "흠집", True),
    ("defect", "match", "이전 흠집", False),
    ("run", "component", "진단 실행", False), ("run", "battery", "진단 실행", True),
    ("run", "ssd", "진단 실행", True), ("run", "bench", "진단 실행", False),
    ("run", "flag", "진단 실행", False),
    ("chain", "manual", "체인 줄", True),
    ("dsversion", "train", "데이터셋 버전", False),
]

# 영역 배치: 줄마다 [칸], 칸은 영역 하나 또는 위아래로 쌓은 영역 목록. 영역은 (영역, [열마다 엔터티 키])
LAYOUT = [
    [("rental", [["model"], ["device"], ["rental", "pilot"], ["checkpoint"], ["boothcode"]]),
     ("auth", [["account", "client"], ["access", "social", "emailtoken"], ["receipt", "link", "pairing"]])],
    [("capture", [["set"], ["photo", "texture", "grade"], ["align", "defect"], ["match"]]),
     ("diag", [["run"], ["component", "battery", "ssd", "bench", "flag"]]),
     [("report", [["chain", "report"], ["manual"]]),
      ("ml", [["dsversion", "dsdevice"], ["train"]])]],
]

LEGEND = [
    '<tspan fill="#fbbf24" font-weight="700">PK</tspan> 식별자 · <tspan font-weight="700" fill="#71717a">FK</tspan> 다른 엔터티를 가리킴 · <tspan font-weight="700" fill="#71717a">UK</tspan> 대체 식별자 · ◦ 선택 속성',
    "선: 같은 영역 안 관계(‖ 하나 · ○ 없을 수 있음 · 까마귀발 여럿)",
    "“FK → 검사 시점”: 다른 영역(서버)의 엔터티를 공개 ID 값으로 가리킴(DB FK 없음)",
]
HEAD = (
    '<text x="48" y="62" fill="#ff5a5f" font-size="16" font-weight="700" letter-spacing="2">ERD · 논리 모델</text>'
    f'<text x="48" y="100" fill="#fff" font-size="32" font-weight="800" letter-spacing="-1">업무 엔터티 {len(ENTITIES)}개와 관계</text>'
    '<text x="48" y="130" fill="#a1a1aa" font-size="16">모든 기록은 “검사 시점”(출고·수령·반납)에 매달립니다 · '
    "구현 칼럼(내부 ID·생성 시각·멱등 키)과 사본 표는 물리 모델에만 있습니다 · 2026-11-23 스키마 기준</text>"
)

if __name__ == "__main__":
    render(ENTITIES, LINES, LAYOUT, HEAD, LEGEND, OUT, "TRACE 논리 ERD")
