// TRACE MVP 안내서 데이터 (한 곳에서 관리)
// - guide/index.html(안내서 화면)과 api-docs/enrich.mjs(API 문서 설명 붙이기)가 같이 읽는다.
// - 계약(필드·경로)의 원본은 GAKDO/contracts. 여기에는 "쉬운 설명·누가 부르나·어느 기능"만 둔다.
// - 기능 번호(F1~F11)는 mvp/03-features.md와 같다.

export const GUIDE_URL = "https://gakdo.github.io/docs/guide/";
export const API_URL = "https://gakdo.github.io/docs/api/mvp.html";

// 그림의 상자. kind: booth(부스 사진) · server(사진 무관 서버) · infra(공통 인프라) · outside(밖) · learn(학습)
export const NODES = {
  admin:   { x: 1140, y: 196, w: 220, h: 104, kind: "outside", icon: "monitor", title: "관리자 브라우저", nick: "관리자가 쓰는 웹 화면", tech: "gakdo.site/admin" },
  preview: { x: 1140, y: 330, w: 220, h: 196, kind: "preview", step: 6, title: "검사 결과 화면", nick: "사진 12장 + 흠집 + 등급" },
  tablet:  { x: 50,  y: 190, w: 300, h: 86,  kind: "outside", icon: "tablet", title: "부스 태블릿", nick: "운영자가 누르는 화면", tech: "http://Jetson:8320" },
  booth:   { x: 50,  y: 336, w: 300, h: 180, kind: "booth", step: 4, icon: "cpu", title: "booth 앱 · Jetson", nick: "부스의 두뇌: 촬영 · AI 판정", tech: "trace-booth serve :8320", chips: ["카메라 C920 × 2", "조명 L1·L2·L3", "YOLO11-seg (TensorRT)", "업로드 재시도 큐"] },
  nginx:   { x: 450, y: 40,  w: 610, h: 72,  kind: "outside", icon: "globe", title: "gakdo.site 정문", nick: "인터넷에서 들어오는 유일한 길", tech: "강사님 nginx · HTTPS 443" },
  web:     { x: 440, y: 196, w: 630, h: 78,  kind: "server", icon: "door", title: "web nginx", nick: "학교 서버의 문 · 관리자 화면 파일", tech: ":8315 · /admin · /api/ · /trace-captures/" },
  gateway: { x: 440, y: 316, w: 630, h: 78,  kind: "server", icon: "shield", title: "gateway", nick: "경비실: 출입증(JWT) 확인 · 길 안내", tech: ":8080 · Spring Cloud Gateway" },
  auth:    { x: 440, y: 446, w: 196, h: 100, kind: "server", icon: "key", title: "auth-server", nick: "출입증 발급소", tech: "로그인 · 부스 토큰" },
  rental:  { x: 657, y: 446, w: 196, h: 100, kind: "server", icon: "book", title: "rental-server", nick: "기기 · 렌탈 장부", tech: "기종 · 기기 · 렌탈 · 시점" },
  capture: { x: 874, y: 446, w: 196, h: 100, kind: "booth", icon: "camera", title: "capture-server", nick: "사진 · 검사 결과 담당", tech: "업로드 주소 · 탐지 · 등급" },
  redis:   { x: 440, y: 640, w: 148, h: 86,  kind: "infra", icon: "gauge", title: "Redis", nick: "요청 횟수 세기" },
  pg:      { x: 601, y: 640, w: 148, h: 86,  kind: "infra", icon: "db", title: "PostgreSQL", nick: "데이터 장부 (DB)" },
  mq:      { x: 762, y: 640, w: 148, h: 86,  kind: "infra", icon: "mail", title: "RabbitMQ", nick: "알림 우체통 (이벤트)" },
  minio:   { x: 922, y: 640, w: 148, h: 86,  kind: "infra", icon: "box", title: "MinIO", nick: "사진 창고" },
  smin:    { x: 50,  y: 640, w: 300, h: 70,  kind: "learn", icon: "box", title: "학교 MinIO", nick: "학습용 사진 보관 (서비스와 따로)" },
  homepc:  { x: 50,  y: 744, w: 300, h: 82,  kind: "learn", icon: "brain", title: "집 PC · 학습만", nick: "라벨링 → YOLO11-seg 학습 → model.onnx" },
};

// 구역(배경 상자)
export const ZONES = [
  { id: "zBooth", x: 24, y: 132, w: 352, h: 408, title: "부스 (실습실)", sub: "부스 공유기 와이파이", kind: "booth" },
  { id: "zSchool", x: 414, y: 132, w: 682, h: 616, title: "학교 서버 · Docker Compose", sub: "10.116.64.12 · 밖으로 열린 문은 8315 하나", kind: "server" },
  { id: "zAdmin", x: 1120, y: 132, w: 260, h: 418, title: "관리자", sub: "PC · 휴대폰 브라우저", kind: "outside" },
  { id: "zLearn", x: 24, y: 576, w: 352, h: 270, title: "학습 (서비스 밖)", sub: "모델을 만들 때만", kind: "learn" },
  { id: "zInfra", x: 428, y: 612, w: 654, h: 124, title: "공통 인프라", sub: "", kind: "infra", inner: true },
];

// 그림의 선. pts = 꺾이는 점들, step = 이야기 순서 번호(있으면 동그라미)
export const EDGES = {
  eAdminNginx: { pts: [[1250, 196], [1250, 76], [1060, 76]], label: "HTTPS", lx: 1150, ly: 66, kind: "server", step: 1 },
  eBoothNginx: { pts: [[350, 400], [392, 400], [392, 76], [450, 76]], label: "HTTPS · API · 사진", lx: 300, ly: 128, kind: "booth", step: 3 },
  eTabletBooth: { pts: [[200, 276], [200, 336]], label: "와이파이 :8320", lx: 212, ly: 312, kind: "booth", both: true, step: 2 },
  eNginxWeb: { pts: [[755, 112], [755, 196]], label: "→ 10.116.64.12:8315", lx: 768, ly: 160, kind: "server" },
  eWebGw: { pts: [[755, 274], [755, 316]], label: "/api/", lx: 768, ly: 300, kind: "server" },
  eWebMinio: { pts: [[1070, 236], [1086, 236], [1086, 683], [1070, 683]], label: "/trace-captures/ 사진", lx: 1086, ly: 470, kind: "booth", rot: true },
  eGwAuth: { pts: [[538, 394], [538, 446]], kind: "server" },
  eGwRental: { pts: [[755, 394], [755, 446]], kind: "server" },
  eGwCapture: { pts: [[972, 394], [972, 446]], kind: "server" },
  eGwRedis: { pts: [[440, 355], [426, 355], [426, 683], [440, 683]], kind: "infra", label: "요청 제한", lx: 426, ly: 590, rot: true },
  eCapMinio: { pts: [[1010, 546], [1010, 640]], label: "해시 확인", lx: 1018, ly: 596, kind: "booth" },
  eCapMq: { pts: [[890, 546], [890, 640]], label: "알림", lx: 898, ly: 596, kind: "booth", step: 5, stepAt: 0.32 },
  eMqRental: { pts: [[790, 640], [790, 546]], label: "상태", lx: 798, ly: 596, kind: "server" },
  eSvcPg: { pts: [[675, 546], [675, 640]], label: "", lx: 0, ly: 0, kind: "infra" },
  eBoothSmin: { pts: [[200, 516], [200, 640]], label: "학습 사진", lx: 212, ly: 558, kind: "learn", dash: true },
  eSminHome: { pts: [[200, 710], [200, 744]], kind: "learn", dash: true },
  eHomeBooth: { pts: [[50, 785], [36, 785], [36, 450], [50, 450]], label: "model.onnx", lx: 36, ly: 500, kind: "learn", dash: true, rot: true },
};

// 이야기 순서(구성도의 동그라미 번호와 같다)
export const STORY = [
  { n: 1, title: "관리자가 기기를 등록하고 출고 검사를 연다", text: "웹 화면에서 노트북 시리얼을 등록하고 '출고 검사 시작'을 누릅니다.", features: ["F1", "F2", "F3", "F4"] },
  { n: 2, title: "부스 태블릿에서 그 노트북을 고른다", text: "부스 화면에 '검사 기다리는 기기'가 뜨고, 운영자가 탭합니다.", features: ["F5"] },
  { n: 3, title: "12장을 찍어 서버에 올린다", text: "아래·위 2면 × 조명 3개 × 카메라 2대 = 12장. 사진은 서버를 거치지 않고 사진 창고로 바로 갑니다.", features: ["F6", "F7"] },
  { n: 4, title: "Jetson의 AI가 흠집을 찾는다", text: "부스 안 컴퓨터(Jetson)가 바로 흠집 모양을 그리고 '문제 있음/없음'을 띄웁니다.", features: ["F8"] },
  { n: 5, title: "서버가 등급 A~D를 매긴다", text: "같은 탐지 결과로 capture-server가 등급을 저장하고, 렌탈 장부의 상태를 바꿉니다.", features: ["F9"] },
  { n: 6, title: "관리자가 결과를 본다", text: "웹에서 사진 12장과 흠집 위치, 등급을 확인합니다.", features: ["F10"] },
];

// 서비스(상자 하나 = 서비스 하나). nodes는 그림에서 강조할 상자
export const SERVICES = [
  {
    id: "web", node: "web", name: "web (관리자 화면)", owner: "C", repo: "GAKDO/web",
    nick: "학교 서버의 현관문이자 관리자 화면",
    plain: "관리자가 브라우저로 여는 화면 파일(React)을 내주고, 화면이 보내는 요청을 안쪽으로 넘겨 주는 문입니다. 밖에서 학교 서버로 들어오는 모든 요청은 이 문 하나(8315)를 지납니다.",
    does: ["관리자 화면(/admin) 파일 내려주기", "/api/ 로 온 요청을 gateway로 넘기기", "/trace-captures/ 로 온 사진 올리기·보기를 MinIO로 넘기기"],
    where: "학교 서버 Compose (컨테이너 8080 → 호스트 8315)", store: "없음",
    screens: ["/admin/login", "/admin/models", "/admin/devices", "/admin/rentals", "/admin/inspections"],
    features: ["F1", "F2", "F3", "F4", "F10"], highlight: ["nginx", "web", "admin", "preview", "gateway", "minio"],
  },
  {
    id: "gateway", node: "gateway", name: "gateway", owner: "A", repo: "GAKDO/gateway",
    nick: "건물 경비실",
    plain: "모든 API 요청이 반드시 거치는 곳입니다. 요청에 붙은 출입증(JWT)이 진짜인지 확인하고, 역할(관리자·부스)에 맞는 길인지 본 뒤, 알맞은 서버로 안내합니다. 로그인을 너무 자주 시도하면 잠깐 막습니다.",
    does: ["JWT 서명 확인 (auth-server 공개키)", "역할 × 경로 표로 막기 (403)", "경로별로 auth · rental · capture에 보내기", "로그인 요청 IP당 1분 10번 제한 (Redis)"],
    where: "학교 서버 Compose :8080 (밖에 안 열림)", store: "Redis (키 앞에 trace:)",
    features: ["F1", "F2", "F3", "F4", "F5", "F7", "F9", "F10"], highlight: ["gateway", "auth", "rental", "capture", "redis", "web"],
  },
  {
    id: "auth", node: "auth", name: "auth-server", owner: "A", repo: "GAKDO/auth_server",
    nick: "출입증 발급소",
    plain: "관리자가 이메일·비밀번호로 로그인하면 15분짜리 출입증(액세스 JWT)을 줍니다. 부스(Jetson)에는 부스용 비밀번호(client secret)를 받고 1시간짜리 부스 출입증을 줍니다.",
    does: ["관리자 로그인 · 토큰 재발급 · 로그아웃 · 내 정보", "부스 토큰 발급 (BOOTH JWT 1시간)", "JWT 공개키(JWKS)를 gateway에 제공 (안쪽 전용)"],
    where: "학교 서버 Compose :8080", store: "PostgreSQL auth 스키마",
    features: ["F1", "F5"], highlight: ["auth", "gateway", "pg"],
  },
  {
    id: "rental", node: "rental", name: "rental-server", owner: "A", repo: "GAKDO/rental_server",
    nick: "기기 · 렌탈 장부",
    plain: "어떤 노트북(기기)이 있고, 무슨 기종이며, 지금 누구에게 빌려주는 중(렌탈)인지 적는 장부입니다. '출고 검사'를 시작하면 시점(OUT)을 하나 만들고, 사진이 다 올라가거나 등급이 나오면 알림을 받아 상태를 바꿉니다.",
    does: ["기종 등록 (치수 mm)", "기기 등록 · 검색 · 수정", "렌탈 열기 · 출고(OUT) 시점 시작", "부스에는 진행 중(OPEN) 렌탈만 보여 주기", "알림 받아 시점 상태 OPEN → CAPTURED → GRADED"],
    where: "학교 서버 Compose :8080", store: "PostgreSQL rental 스키마",
    features: ["F2", "F3", "F4", "F5", "F7", "F9", "F10"], highlight: ["rental", "gateway", "pg", "mq"],
  },
  {
    id: "capture", node: "capture", name: "capture-server", owner: "A", repo: "GAKDO/capture_server",
    nick: "사진 · 검사 결과 담당",
    plain: "부스가 '사진 12장 올릴게요'라고 하면 사진마다 10분짜리 업로드 주소(사전 서명 URL)를 줍니다. 다 올라오면 사진이 맞는지 지문(SHA-256)으로 확인하고, 부스가 보낸 AI 탐지 결과로 등급 A~D를 매깁니다. 관리자 화면에는 사진 보기 주소와 흠집 위치를 줍니다.",
    does: ["촬영 세트 만들기 + 사진별 업로드 주소", "업로드 완료 확인 (12장 · 해시)", "부스 탐지 결과 저장 → 등급 A~D", "관리자용 사진 보기 주소 · 흠집 · 등급", "완료·등급 알림을 RabbitMQ로 보내기"],
    where: "학교 서버 Compose :8080", store: "PostgreSQL capture · inspection 스키마, MinIO trace-captures 버킷",
    features: ["F7", "F9", "F10"], highlight: ["capture", "gateway", "minio", "mq", "pg"],
  },
  {
    id: "booth", node: "booth", name: "booth 앱 (Jetson)", owner: "B", repo: "GAKDO/booth",
    nick: "부스의 두뇌",
    plain: "부스 안 작은 컴퓨터(Jetson Orin Nano)에서 도는 프로그램입니다. 태블릿이 여는 부스 화면도 이 프로그램이 직접 띄웁니다(작은 웹 서버, 8320). 카메라 2대와 조명 3개로 12장을 찍고, AI로 흠집을 찾아 화면에 보여 준 뒤, 사진과 결과를 서버에 올립니다. 서버와 이야기하는 것은 태블릿이 아니라 Jetson입니다.",
    does: ["부스 화면 + 로컬 API (:8320, 부스 와이파이 안에서만)", "검사 기다리는 기기 목록 받기", "BOT 6장 → 뒤집어 TOP 6장 촬영", "YOLO11-seg TensorRT로 흠집 폴리곤", "사진 · 탐지 업로드, 실패하면 큐에 두고 재시도"],
    where: "Jetson Orin Nano (부스)", store: "Jetson 로컬 저장 · 업로드 큐",
    features: ["F5", "F6", "F7", "F8", "F9", "F11"], highlight: ["booth", "tablet", "nginx"],
  },
  {
    id: "infra", node: "pg", name: "공통 인프라 4개", owner: "A", repo: "GAKDO/gitops",
    nick: "모두가 같이 쓰는 창고 · 우체통 · 장부",
    plain: "서버들이 같이 쓰는 기본 시설입니다. PostgreSQL은 장부(데이터베이스), MinIO는 사진 창고, RabbitMQ는 서버끼리 '다 됐어요'를 알리는 우체통, Redis는 요청 횟수를 세는 계수기입니다. 모두 학교 서버 안에만 있고 밖에서는 안 보입니다.",
    does: ["PostgreSQL 16 :5432 — 서버마다 자기 스키마", "MinIO :9000 — 버킷 trace-captures (부스 사진)", "RabbitMQ :5672 — exchange trace.events", "Redis :6379 — gateway 요청 제한"],
    where: "학교 서버 Compose", store: "—",
    features: ["F1", "F7", "F9", "F10"], highlight: ["pg", "minio", "mq", "redis"],
  },
  {
    id: "learn", node: "homepc", name: "학습 (집 PC)", owner: "A (라벨링 연동 B)", repo: "GAKDO/ml",
    nick: "AI 모델 공장 (서비스 아님)",
    plain: "부스에서 찍은 학습용 사진에 흠집 모양을 직접 그려(라벨링) AI에게 가르칩니다. 다 배우면 model.onnx 파일 하나가 나오고, 이걸 Jetson에 옮겨 빠르게 돌게 바꿉니다. 집 PC는 학습할 때만 켜고 서비스로 띄우지 않습니다.",
    does: ["Label Studio로 폴리곤 4종 라벨 (긁힘 · 찍힘 · 균열 · 오염)", "YOLO11-seg 학습 (RTX 4070 Ti)", "model.onnx → Jetson에서 TensorRT 엔진 빌드"],
    where: "집 PC · 학교 MinIO", store: "학교 MinIO trace-raw · models",
    features: ["F11"], highlight: ["homepc", "smin", "booth"],
  },
];

// 기능(F1~F11). steps[].from/to = NODES 키, api = operationId(서버 API) 또는 local(부스 로컬 API)
export const FEATURES = [
  {
    id: "F1", title: "관리자 로그인", who: "관리자", screen: "web /admin/login", owner: "화면 C · 서버 A",
    goal: "관리자만 기기와 렌탈을 다룰 수 있게 합니다.",
    plain: "이메일과 비밀번호를 넣으면 15분짜리 출입증을 받습니다. 출입증은 브라우저 메모리에만 두고, 시간이 지나면 쿠키로 조용히 새로 받습니다.",
    before: "서버가 처음 뜰 때 .env의 관리자 계정이 만들어져 있습니다 (가입 화면 없음).",
    highlight: ["admin", "nginx", "web", "gateway", "auth", "redis"], edges: ["eAdminNginx", "eNginxWeb", "eWebGw", "eGwAuth", "eGwRedis"],
    steps: [
      { from: "admin", to: "admin", text: "관리자가 이메일·비밀번호를 입력합니다." },
      { from: "admin", to: "gateway", text: "로그인 요청을 보내면 gateway가 너무 자주 시도하지 않았는지 확인합니다.", api: "login" },
      { from: "gateway", to: "auth", text: "auth-server가 비밀번호를 확인하고 15분짜리 출입증(JWT)과 7일짜리 재발급 쿠키를 줍니다.", api: "login" },
      { from: "admin", to: "auth", text: "화면이 '내 정보'를 물어 관리자 메뉴를 띄웁니다.", api: "getMe" },
      { from: "admin", to: "auth", text: "15분이 지나 거절(401)되면 쿠키로 새 출입증을 받습니다.", api: "refreshToken" },
      { from: "admin", to: "auth", text: "로그아웃하면 쿠키를 지웁니다.", api: "logout" },
    ],
    changes: [],
    fails: ["비밀번호가 틀리면 401", "너무 자주 시도하면 429 (1분에 10번)"],
  },
  {
    id: "F2", title: "기종 등록", who: "관리자", screen: "web /admin/models", owner: "화면 C · 서버 A · 치수 실측 B",
    goal: "기기를 등록할 때 고를 노트북 기종과 크기를 미리 둡니다.",
    plain: "'맥북 에어 M2 13인치'처럼 기종 코드와 가로·세로·두께(mm)를 적어 둡니다. MBA13-M2는 처음부터 들어 있고, LG 그램·델은 실측 뒤 넣습니다.",
    highlight: ["admin", "gateway", "rental", "pg"], edges: ["eAdminNginx", "eNginxWeb", "eWebGw", "eGwRental", "eSvcPg"],
    steps: [
      { from: "admin", to: "rental", text: "기종 목록을 불러옵니다.", api: "listDeviceModels" },
      { from: "admin", to: "admin", text: "새 기종 코드 · 제조사 · 치수를 입력합니다." },
      { from: "admin", to: "rental", text: "저장하면 없으면 새로 만들고, 있으면 고칩니다.", api: "upsertDeviceModel" },
      { from: "admin", to: "rental", text: "기종 하나를 자세히 봅니다.", api: "getDeviceModel" },
    ],
    changes: [],
    fails: ["가로·세로 1000 mm, 두께 100 mm를 넘으면 400"],
  },
  {
    id: "F3", title: "기기 등록 · 검색", who: "관리자", screen: "web /admin/devices", owner: "화면 C · 서버 A",
    goal: "빌려줄 노트북 한 대 한 대를 시리얼 번호로 등록합니다.",
    plain: "빌린 노트북이라 스티커나 QR을 붙이지 않고 시리얼 번호로 구분합니다. 등록한 기기는 검색하고 상태(사용 중 · 수리 중 · 폐기)를 바꿀 수 있습니다.",
    highlight: ["admin", "gateway", "rental", "pg"], edges: ["eAdminNginx", "eNginxWeb", "eWebGw", "eGwRental", "eSvcPg"],
    steps: [
      { from: "admin", to: "admin", text: "시리얼 · 기종 · OS (선택: 색상 · 자산번호)를 입력합니다." },
      { from: "admin", to: "rental", text: "기기를 등록합니다. 상태는 ACTIVE(사용 가능)로 시작합니다.", api: "createDevice" },
      { from: "admin", to: "rental", text: "목록을 보거나 시리얼 일부로 검색합니다.", api: "listDevices" },
      { from: "admin", to: "rental", text: "색상 · 자산번호 · OS · 상태를 고칩니다.", api: "updateDevice" },
    ],
    changes: ["device.status = ACTIVE"],
    fails: ["같은 시리얼이 있으면 409", "없는 기종이면 404", "빌려준 중인 기기는 수리 중·폐기로 못 바꿈 (409)"],
  },
  {
    id: "F4", title: "렌탈 열기 · 출고 검사 시작", who: "관리자", screen: "web /admin/rentals", owner: "화면 C · 서버 A",
    goal: "'이 노트북을 지금 출고 검사한다'를 서버에 알립니다. 이게 있어야 부스 목록에 기기가 나타납니다.",
    plain: "기기를 골라 렌탈을 열고, 렌탈 화면에서 '출고 검사 시작'을 누르면 출고(OUT) 시점이 생깁니다. MVP는 렌탈 하나에 출고 검사 1번입니다.",
    highlight: ["admin", "gateway", "rental", "pg"], edges: ["eAdminNginx", "eNginxWeb", "eWebGw", "eGwRental", "eSvcPg"],
    steps: [
      { from: "admin", to: "admin", text: "기기를 고르고 빌리는 사람 표시(renterRef)를 적습니다." },
      { from: "admin", to: "rental", text: "렌탈을 엽니다. 한 기기에 진행 중 렌탈은 하나만 됩니다.", api: "createRental" },
      { from: "admin", to: "rental", text: "렌탈 목록 · 상세를 봅니다.", api: "listRentals" },
      { from: "admin", to: "rental", text: "'출고 검사 시작'을 누르면 출고(OUT) 시점이 OPEN으로 생깁니다.", api: "startCheckpoint" },
    ],
    changes: ["rental = OPEN", "시점 OUT = OPEN"],
    fails: ["수리 중·폐기 기기면 409 DEVICE_NOT_ACTIVE", "같은 시점이 이미 있으면 409 CHECKPOINT_ORDER_VIOLATION"],
  },
  {
    id: "F5", title: "부스 로그인 · 검사 기다리는 기기 목록", who: "부스 운영자", screen: "부스 화면 (태블릿)", owner: "부스 B · 서버 A",
    goal: "부스에서 어떤 노트북을 찍을지 태블릿에서 고릅니다.",
    plain: "태블릿이 부스 화면을 열면 Jetson이 대신 서버에 로그인(부스 토큰)하고, 진행 중 렌탈 가운데 아직 안 찍은 것만 골라 보여 줍니다. 부스 비밀번호는 Jetson에만 있고 태블릿은 모릅니다.",
    before: "Jetson에서 trace-booth serve가 떠 있고, TRACE_API_URL · TRACE_BOOTH_CLIENT_ID · TRACE_BOOTH_CLIENT_SECRET이 들어 있습니다.",
    highlight: ["tablet", "booth", "nginx", "web", "gateway", "auth", "rental"], edges: ["eTabletBooth", "eBoothNginx", "eNginxWeb", "eWebGw", "eGwAuth", "eGwRental"],
    steps: [
      { from: "tablet", to: "booth", text: "부스 화면을 열면 '기다리는 기기'를 Jetson에 묻습니다.", local: "GET /api/rentals/waiting" },
      { from: "booth", to: "auth", text: "부스 출입증이 없거나 곧 끝나면 새로 받습니다 (1시간).", api: "issueBoothToken" },
      { from: "booth", to: "rental", text: "진행 중(OPEN) 렌탈 목록을 받습니다. 부스에게는 OPEN 렌탈만 보입니다.", api: "listRentals" },
      { from: "booth", to: "tablet", text: "그중 출고 시점이 아직 OPEN(안 찍음)인 기기만 태블릿에 보여 줍니다." },
      { from: "tablet", to: "booth", text: "운영자가 기기를 탭하면 Jetson이 촬영 세션을 하나 만듭니다.", local: "POST /api/sessions" },
    ],
    changes: [],
    fails: ["목록이 비면 F4의 '출고 검사 시작'을 안 한 것", "부스 비밀번호가 틀리면 401"],
  },
  {
    id: "F6", title: "부스 촬영 12장", who: "부스 운영자", screen: "부스 화면 (태블릿)", owner: "B (Jetson 안)",
    goal: "늘 같은 카메라 · 같은 조명으로 노트북 아래 · 위를 찍습니다.",
    plain: "노트북을 뒤집어 아래(BOT)를 조명 3개로 바꿔 가며 카메라 2대로 6장, 다시 바로 놓고 위(TOP)를 6장 찍습니다. 2면 × 조명 3 × 카메라 2 = 12장. 서버는 부르지 않고 Jetson 안에서만 일어납니다.",
    highlight: ["tablet", "booth"], edges: ["eTabletBooth"],
    steps: [
      { from: "tablet", to: "booth", text: "노트북을 뒤집어 놓고 카메라 미리보기를 봅니다.", local: "GET /api/live/{camera}" },
      { from: "tablet", to: "booth", text: "조명 L1 → L2 → L3을 켜며 찍기. 조명마다 CAM1 · CAM2 두 장, 아래면 6장. 사진마다 지문(SHA-256)을 계산합니다.", local: "POST /api/sessions/current/shoot" },
      { from: "tablet", to: "booth", text: "흔들린 사진은 그 장만 다시 찍습니다.", local: "POST /api/sessions/current/retake" },
      { from: "tablet", to: "booth", text: "노트북을 바로 놓고 다음 면으로. 위면 6장을 찍어 모두 12장.", local: "POST /api/sessions/current/next" },
      { from: "tablet", to: "booth", text: "촬영 끝을 누르면 F7 업로드가 시작됩니다.", local: "POST /api/sessions/current/complete" },
    ],
    changes: [],
    fails: ["카메라 값은 TRACE_BOOTH_PRESETS로 고정, 촬영 목록은 TRACE_BOOTH_SHOTLIST=mvp"],
  },
  {
    id: "F7", title: "사진 업로드 · 촬영 완료", who: "booth 앱 (자동)", screen: "—", owner: "부스 B · 서버 A",
    goal: "12장을 서버 사진 창고에 올리고, 제대로 다 올라갔는지 확인합니다.",
    plain: "Jetson이 capture-server에 '이런 12장을 올릴게요'라고 목록과 지문을 보내면, 사진마다 10분짜리 업로드 주소를 받습니다. 사진은 서버를 거치지 않고 그 주소로 사진 창고(MinIO)에 바로 올라갑니다. 다 올리고 '완료'를 보내면 서버가 지문을 맞춰 보고, 렌탈 장부에 '사진 다 찍었음(CAPTURED)'을 알립니다.",
    highlight: ["booth", "nginx", "web", "gateway", "capture", "minio", "mq", "rental"], edges: ["eBoothNginx", "eNginxWeb", "eWebGw", "eGwCapture", "eWebMinio", "eCapMinio", "eCapMq", "eMqRental"],
    steps: [
      { from: "booth", to: "capture", text: "촬영 세트를 만듭니다 (QUICK, 12장의 면 · 조명 · 카메라 · 지문). 사진별 업로드 주소 12개를 받습니다.", api: "createCaptureSet" },
      { from: "booth", to: "minio", text: "주소마다 사진을 올립니다 (web nginx가 /trace-captures/를 MinIO로 넘김)." },
      { from: "booth", to: "capture", text: "10분이 지나 주소가 끝났으면 안 올라간 사진만 새 주소를 받습니다.", api: "reissueUploadUrls" },
      { from: "booth", to: "capture", text: "'완료'를 보냅니다. 서버가 12장이 다 있는지, 지문이 맞는지 확인합니다.", api: "completeCaptureSet" },
      { from: "capture", to: "mq", text: "'사진 다 올라옴' 알림(trace.capture.uploaded)을 우체통에 넣습니다." },
      { from: "mq", to: "rental", text: "rental-server가 알림을 받아 출고 시점을 CAPTURED로 바꿉니다." },
    ],
    changes: ["세트 UPLOADING → UPLOADED", "시점 OUT OPEN → CAPTURED"],
    fails: ["네트워크가 끊기면 Jetson 큐에 두고 다시 시도 (trace-booth retry)", "지문이 다르면 완료가 400", "413이면 nginx 업로드 크기, 403 SignatureDoesNotMatch면 PUBLIC_BASE_URL 확인"],
  },
  {
    id: "F8", title: "Jetson 흠집 탐지 · 부스 판정 표시", who: "booth 앱 (자동)", screen: "부스 화면 (태블릿)", owner: "B (모델 학습은 A)",
    goal: "서버를 기다리지 않고 부스에서 바로 '문제 있음/없음'을 보여 줍니다.",
    plain: "Jetson이 12장을 작은 조각(640px)으로 나눠 AI(YOLO11-seg)에 넣으면, 흠집의 모양(폴리곤)과 종류(긁힘 · 찍힘 · 균열 · 오염)가 나옵니다. 태블릿 사진 위에 흠집을 그리고 판정을 띄웁니다. 목표는 버튼부터 판정까지 15초입니다.",
    highlight: ["tablet", "booth"], edges: ["eTabletBooth"],
    steps: [
      { from: "tablet", to: "booth", text: "판정 버튼을 누릅니다.", local: "POST /api/sessions/current/detect" },
      { from: "booth", to: "booth", text: "12장을 640px 조각으로 나눠 TensorRT 엔진에 넣고, 사진마다 흠집 폴리곤 · 종류 · 확신도를 얻습니다." },
      { from: "tablet", to: "booth", text: "결과를 받아 사진 위에 흠집을 그리고 '문제 있음/없음'을 띄웁니다.", local: "GET /api/sessions/current/result" },
    ],
    changes: [],
    fails: ["오염만 잡히면 폴리곤은 그리되 '문제 없음' (서버 등급 A와 같게, 11/4 결정)", "엔진 파일이 없으면 실패를 남기고 사진은 그대로 다시 돌릴 수 있음"],
  },
  {
    id: "F9", title: "탐지 결과 저장 · 등급", who: "booth 앱 (자동)", screen: "—", owner: "부스 B · 서버 A",
    goal: "AI 탐지 결과를 서버에 남기고, 정해진 규칙으로 등급을 매깁니다.",
    plain: "Jetson이 12장의 분석 결과를 한 번에 보냅니다. capture-server는 조명만 다르고 같은 자리에 있는 흠집을 하나로 묶은 뒤, 규칙에 따라 A~D를 매깁니다. A는 문제 없음, B~D는 문제 있음입니다. 그리고 렌탈 장부에 '등급 나옴(GRADED)'을 알립니다.",
    highlight: ["booth", "nginx", "web", "gateway", "capture", "pg", "mq", "rental"], edges: ["eBoothNginx", "eNginxWeb", "eWebGw", "eGwCapture", "eCapMq", "eMqRental"],
    steps: [
      { from: "booth", to: "capture", text: "12장 분석 결과를 한 번에 보냅니다 (흠집 없는 사진도 목록에 넣음).", api: "saveBoothDetections" },
      { from: "capture", to: "capture", text: "같은 면 · 같은 카메라에서 20px 안에 겹치는 흠집은 하나로 셉니다 (조명 3개에 같이 잡힌 흠집)." },
      { from: "capture", to: "capture", text: "등급 규칙(grade-rules-v1): 균열 1개↑ 또는 찍힘 3개↑ D · 찍힘 1~2 또는 긁힘 5개↑ C · 긁힘 1~4 B · 없음 A. 오염은 등급에 안 넣음." },
      { from: "capture", to: "mq", text: "'등급 나옴' 알림(trace.checkpoint.graded)을 보냅니다." },
      { from: "mq", to: "rental", text: "rental-server가 출고 시점을 GRADED로 바꿉니다." },
      { from: "booth", to: "capture", text: "필요하면 세트 상태를 확인합니다.", api: "getCaptureSet" },
    ],
    changes: ["세트 UPLOADED → GRADED", "등급 없음 → A·B·C·D", "시점 OUT CAPTURED → GRADED"],
    fails: ["12장이 다 없으면 400", "F7 완료보다 먼저 와도 저장해 두고, 둘 다 모이면 등급", "이미 등급이 나온 세트면 409 CAPTURE_SET_CLOSED"],
  },
  {
    id: "F10", title: "검사 결과 보기", who: "관리자", screen: "web /admin/inspections", owner: "화면 C · 서버 A",
    goal: "관리자가 사진 12장, 흠집 위치, 등급을 웹에서 확인합니다.",
    plain: "렌탈 목록에서 검사 하나를 누르면, 사진 12장을 면(아래 · 위)마다 카메라 2 × 조명 3 격자로 놓고 그 위에 흠집 모양을 겹쳐 보여 줍니다. 등급 A면 문제 없음, B~D면 문제 있음입니다.",
    highlight: ["admin", "preview", "nginx", "web", "gateway", "rental", "capture", "minio"], edges: ["eAdminNginx", "eNginxWeb", "eWebGw", "eGwRental", "eGwCapture", "eWebMinio"],
    steps: [
      { from: "admin", to: "rental", text: "목록 화면이 렌탈 목록을 주기적으로 불러 검사 상태(CAPTURED · GRADED)를 보여 줍니다.", api: "listRentals" },
      { from: "admin", to: "rental", text: "검사 하나를 누르면 기기 시리얼과 시점 번호를 받습니다.", api: "getRental" },
      { from: "admin", to: "capture", text: "사진 12장 보기 주소(10분)를 받습니다.", api: "getCheckpointMedia" },
      { from: "admin", to: "capture", text: "등급과 흠집 목록(면 · 조명 · 카메라 · 종류 · 폴리곤)을 받습니다. 아직이면 등급은 비어 있습니다.", api: "getCheckpointInspection" },
      { from: "admin", to: "minio", text: "브라우저가 보기 주소로 사진을 불러 격자에 놓고 흠집을 겹쳐 그립니다." },
    ],
    changes: [],
    fails: ["375px(휴대폰) · 1280px(PC) 두 폭에서 확인"],
  },
  {
    id: "F11", title: "탐지 모델 학습 · Jetson 반영", who: "A · B", screen: "부스 TRAINING 모드 · 집 PC", owner: "학습 A · 촬영 · 엔진 B",
    goal: "부스 조명 · 카메라로 찍은 사진으로 흠집 AI 모델을 만듭니다.",
    plain: "부스에서 학습용 사진을 찍어 학교 MinIO에 올리고, 집 PC에서 흠집 모양을 그려(라벨링) 학습시킵니다. 결과 파일 model.onnx를 Jetson에 옮겨 빠르게 도는 엔진으로 바꾸고 속도를 잽니다.",
    highlight: ["booth", "smin", "homepc"], edges: ["eBoothSmin", "eSminHome", "eHomeBooth"],
    steps: [
      { from: "booth", to: "smin", text: "부스 TRAINING 모드로 찍고 올립니다 (서비스 사진 창고와 다른 학교 MinIO trace-raw).", local: "POST /api/sessions/current/submit" },
      { from: "homepc", to: "homepc", text: "Label Studio에서 흠집 4종(긁힘 · 찍힘 · 균열 · 오염)을 폴리곤으로 그립니다." },
      { from: "homepc", to: "homepc", text: "데이터셋을 만들고 YOLO11-seg를 학습해 model.onnx를 만듭니다 (RTX 4070 Ti)." },
      { from: "homepc", to: "booth", text: "Jetson에서 trace-booth build-engine으로 TensorRT FP16 엔진을 만들고, trace-booth bench로 속도를 잽니다." },
    ],
    changes: [],
    fails: ["집 PC는 학습할 때만 켜고 서비스로 띄우지 않음"],
  },
];

// 상태 변화 (검사 한 건)
export const STATES = [
  { where: "렌탈", seq: ["OPEN"], by: ["F4"] },
  { where: "출고 시점 (OUT)", seq: ["OPEN", "CAPTURED", "GRADED"], by: ["F4", "F7", "F9"] },
  { where: "촬영 세트", seq: ["UPLOADING", "UPLOADED", "GRADED"], by: ["F7", "F7", "F9"] },
  { where: "등급", seq: ["없음", "A · B · C · D"], by: ["", "F9"] },
];

// 처음 보는 사람을 위한 낱말 풀이
export const GLOSSARY = [
  ["API", "프로그램끼리 주고받는 약속된 주문서. 예: POST /api/v1/auth/login = '로그인해 주세요'."],
  ["JWT (출입증)", "로그인하면 받는 디지털 출입증. 요청마다 Authorization: Bearer <JWT>로 붙이고, gateway가 진짜인지 확인합니다. 관리자용 15분, 부스용 1시간."],
  ["역할 (ADMIN · BOOTH)", "출입증에 적힌 신분. 관리자는 ADMIN, 부스 Jetson은 BOOTH. 역할마다 갈 수 있는 길이 다릅니다."],
  ["렌탈 · 시점", "렌탈 = 노트북 한 대를 빌려주는 한 건. 시점 = 그 렌탈에서 검사하는 때. MVP는 출고(OUT) 시점 하나만 씁니다."],
  ["촬영 세트", "한 번 검사에서 찍은 사진 12장 묶음. capture-server가 관리합니다."],
  ["QUICK", "MVP의 빠른 검사 방식. 아래 · 위 2면만 찍고, 부스 AI 탐지만으로 등급을 매깁니다."],
  ["사전 서명 URL", "10분 동안만 쓸 수 있는 '사진 하나 올리기 전용' 주소. 사진이 서버를 거치지 않고 창고(MinIO)로 바로 갑니다."],
  ["SHA-256 (지문)", "사진 파일의 지문. 올린 사진이 찍은 사진과 같은지 서버가 이 값으로 확인합니다."],
  ["이벤트 · RabbitMQ", "서버끼리 '다 됐어요'를 알리는 쪽지와 우체통. capture-server가 넣고 rental-server가 꺼내 상태를 바꿉니다."],
  ["폴리곤", "흠집 테두리를 점으로 이은 모양. 사각형보다 정확하게 흠집 자리를 보여 줍니다."],
  ["YOLO11-seg · TensorRT", "흠집 모양을 찾는 AI 모델과, 그 모델을 Jetson에서 빠르게 돌리는 변환 엔진."],
  ["Jetson", "부스 안에 있는 손바닥만 한 AI 컴퓨터 (NVIDIA Jetson Orin Nano)."],
  ["등급 A~D", "A = 문제 없음, B = 긁힘 조금, C = 찍힘이나 긁힘 많음, D = 균열이나 찍힘 많음."],
  ["Problem Details", "오류가 나면 돌려주는 정해진 모양의 설명 (RFC 9457). code 값으로 무슨 오류인지 압니다."],
];

// API 25개: 쉬운 설명 · 누가 부르나 · 어느 기능 (api-docs/enrich.mjs가 Redoc 문서에 붙인다)
const W = "관리자 화면 (web, C)";
const B = "booth 앱 · Jetson (B)";
export const OPS = {
  authPing: { name: "auth-server 살아 있나 확인", plain: "로그인 없이 서비스 이름과 버전을 돌려줍니다. 배포가 됐는지 볼 때 씁니다.", caller: "배포 담당 (curl)", when: "배포 직후", features: ["F0"], auth: "없음" },
  rentalPing: { name: "rental-server 살아 있나 확인", plain: "로그인 없이 서비스 이름과 버전을 돌려줍니다.", caller: "배포 담당 (curl)", when: "배포 직후", features: ["F0"], auth: "없음" },
  capturePing: { name: "capture-server 살아 있나 확인", plain: "로그인 없이 서비스 이름과 버전을 돌려줍니다.", caller: "배포 담당 (curl)", when: "배포 직후", features: ["F0"], auth: "없음" },
  login: { name: "관리자 로그인", plain: "이메일 · 비밀번호를 확인하고 15분짜리 출입증(액세스 JWT)과 7일짜리 재발급 쿠키를 줍니다.", caller: `${W} /admin/login`, when: "로그인 버튼을 누를 때", features: ["F1"], auth: "없음 (IP당 1분 10번 제한)", next: "getMe로 내 정보를 받아 관리자 메뉴를 띄웁니다." },
  refreshToken: { name: "출입증 새로 받기", plain: "15분이 지나 출입증이 끝나면, 쿠키에 든 재발급 토큰으로 새 출입증을 받습니다.", caller: `${W} (자동)`, when: "API가 401을 돌려줄 때", features: ["F1"], auth: "재발급 쿠키" },
  logout: { name: "로그아웃", plain: "재발급 쿠키를 지워 더는 새 출입증을 못 받게 합니다.", caller: `${W}`, when: "로그아웃 버튼", features: ["F1"], auth: "ADMIN JWT" },
  getMe: { name: "내 정보", plain: "지금 로그인한 사람의 이메일 · 역할을 돌려줍니다. 화면이 관리자 메뉴를 띄울지 정합니다.", caller: `${W}`, when: "로그인 직후 · 새로고침", features: ["F1"], auth: "ADMIN JWT" },
  issueBoothToken: { name: "부스 출입증 받기", plain: "Jetson이 부스용 아이디 · 비밀(client_id · secret)을 보내고 1시간짜리 BOOTH JWT를 받습니다. 태블릿은 이 비밀을 모릅니다.", caller: `${B}`, when: "부스 화면을 열 때 · 토큰이 곧 끝날 때", features: ["F5"], auth: "없음 (client 자격)", next: "listRentals로 검사 기다리는 기기를 받습니다." },
  listDeviceModels: { name: "기종 목록", plain: "등록된 노트북 기종 전부(코드 · 제조사 · 치수)를 돌려줍니다.", caller: `${W} /admin/models · /admin/devices`, when: "기종 화면 · 기기 등록 폼", features: ["F2", "F3"], auth: "ADMIN JWT" },
  getDeviceModel: { name: "기종 하나 보기", plain: "기종 코드 하나의 치수 정보를 돌려줍니다.", caller: `${W} /admin/models`, when: "기종 상세", features: ["F2"], auth: "ADMIN JWT" },
  upsertDeviceModel: { name: "기종 등록 · 수정", plain: "기종 코드로 저장합니다. 없으면 만들고 있으면 고칩니다.", caller: `${W} /admin/models`, when: "기종 저장 버튼", features: ["F2"], auth: "ADMIN JWT" },
  createDevice: { name: "기기 등록", plain: "노트북 한 대를 시리얼 · 기종 · OS로 등록합니다. 상태는 ACTIVE로 시작합니다.", caller: `${W} /admin/devices`, when: "기기 등록 버튼", features: ["F3"], auth: "ADMIN JWT", next: "createRental로 렌탈을 엽니다." },
  listDevices: { name: "기기 목록 · 검색", plain: "등록된 기기를 최근 순으로 돌려주고, 기종 · 상태 · 시리얼 일부로 거를 수 있습니다.", caller: `${W} /admin/devices · /admin/rentals`, when: "기기 화면 · 렌탈 열 때 기기 고르기", features: ["F3", "F4"], auth: "ADMIN JWT" },
  updateDevice: { name: "기기 수정", plain: "색상 · 자산번호 · OS · 상태만 바꿉니다. 빌려준 중이면 수리 중 · 폐기로 못 바꿉니다.", caller: `${W} /admin/devices`, when: "기기 수정", features: ["F3"], auth: "ADMIN JWT" },
  createRental: { name: "렌탈 열기", plain: "기기 하나를 빌려주는 렌탈을 OPEN으로 만듭니다. 한 기기에 진행 중 렌탈은 하나뿐입니다.", caller: `${W} /admin/rentals`, when: "렌탈 열기 버튼", features: ["F4"], auth: "ADMIN JWT", next: "startCheckpoint로 출고 검사를 시작합니다." },
  listRentals: { name: "렌탈 목록", plain: "렌탈과 지금 시점 상태를 돌려줍니다. 관리자는 전부, 부스(BOOTH)는 진행 중(OPEN) 렌탈만 받습니다. 부스는 이걸로 '검사 기다리는 기기'를 만들고, 관리자 화면은 검사 상태를 보여 줍니다.", caller: `${W} /admin/rentals · /admin/inspections, ${B}`, when: "렌탈 · 결과 목록 화면, 부스 화면을 열 때", features: ["F4", "F5", "F10"], auth: "ADMIN 또는 BOOTH JWT" },
  getRental: { name: "렌탈 하나 보기", plain: "렌탈 하나와 그 시점들(번호 · 상태)을 돌려줍니다. 결과 화면이 시점 번호를 얻을 때 씁니다.", caller: `${W} /admin/rentals/:id · /admin/inspections`, when: "렌탈 · 검사 하나를 누를 때", features: ["F4", "F10"], auth: "ADMIN JWT" },
  startCheckpoint: { name: "출고 검사 시작 (시점 만들기)", plain: "렌탈에 출고(OUT) 시점을 OPEN으로 만듭니다. 이게 있어야 부스 목록에 기기가 뜹니다.", caller: `${W} /admin/rentals/:id`, when: "'출고 검사 시작' 버튼", features: ["F4"], auth: "ADMIN JWT", next: "부스가 listRentals로 이 기기를 봅니다 (F5)." },
  createCaptureSet: { name: "촬영 세트 만들기 + 업로드 주소 받기", plain: "Jetson이 12장의 면 · 조명 · 카메라 · 지문(SHA-256)을 보내면, 세트를 UPLOADING으로 만들고 사진마다 10분짜리 업로드 주소(사전 서명 URL)를 줍니다. profile은 QUICK.", caller: `${B}`, when: "부스 촬영 끝 직후", features: ["F7"], auth: "BOOTH JWT", next: "받은 주소로 사진을 PUT한 뒤 completeCaptureSet." },
  reissueUploadUrls: { name: "업로드 주소 다시 받기", plain: "10분이 지나 주소가 끝났으면, 아직 안 올라간 사진만 새 주소를 받습니다.", caller: `${B} (재시도 큐)`, when: "업로드가 늦어졌을 때", features: ["F7"], auth: "BOOTH JWT" },
  completeCaptureSet: { name: "촬영 완료 알리기", plain: "다 올렸다고 알리면 서버가 12장이 모두 있는지, 지문이 맞는지 확인합니다. 맞으면 세트 UPLOADED가 되고 rental-server에 'CAPTURED' 알림이 갑니다.", caller: `${B}`, when: "사진 12장 업로드 뒤", features: ["F7"], auth: "BOOTH JWT (Idempotency-Key)", next: "Jetson 탐지 뒤 saveBoothDetections." },
  saveBoothDetections: { name: "AI 탐지 결과 저장 → 등급", plain: "Jetson이 12장 분석 결과(흠집 폴리곤 · 종류 · 확신도)를 한 번에 보냅니다. 서버는 같은 흠집을 묶어 등급 A~D를 매기고 'GRADED' 알림을 보냅니다.", caller: `${B}`, when: "부스 판정이 끝난 뒤", features: ["F9"], auth: "BOOTH JWT" },
  getCaptureSet: { name: "촬영 세트 상태 보기", plain: "세트가 UPLOADING · UPLOADED · GRADED 가운데 어디인지와 사진 목록을 돌려줍니다.", caller: `${W} (관리자 확인용)`, when: "업로드가 끝났는지 볼 때", features: ["F9"], auth: "ADMIN JWT" },
  getCheckpointMedia: { name: "사진 보기 주소", plain: "검사 하나의 사진 12장을 면 · 조명 · 카메라와 함께 10분짜리 보기 주소로 돌려줍니다.", caller: `${W} /admin/inspections/:rentalId/:checkpointId`, when: "검사 결과 화면을 열 때", features: ["F10"], auth: "ADMIN JWT" },
  getCheckpointInspection: { name: "검사 결과 (등급 · 흠집)", plain: "등급(아직이면 비어 있음)과 사진별 흠집(면 · 조명 · 카메라 · 종류 · 폴리곤 · 확신도)을 돌려줍니다. 화면은 같은 사진 위에 폴리곤을 겹쳐 그립니다.", caller: `${W} /admin/inspections/:rentalId/:checkpointId`, when: "검사 결과 화면을 열 때", features: ["F10"], auth: "ADMIN JWT" },
};

// API 문서 왼쪽 메뉴 묶음 (기능 순서)
export const API_GROUPS = [
  { name: "① 관리자 화면에서 부르는 API (web)", features: ["F1", "F2", "F3", "F4", "F10"] },
  { name: "② 부스에서 부르는 API (booth 앱 · Jetson)", features: ["F5", "F7", "F9"] },
  { name: "③ 배포 확인", features: ["F0"] },
];
export const F0 = { id: "F0", title: "배포 확인 (로그인 없음)", goal: "서버가 떠 있는지 로그인 없이 확인합니다.", plain: "curl https://gakdo.site/api/v1/auth/ping 처럼 부르면 서비스 이름과 버전이 나옵니다." };
