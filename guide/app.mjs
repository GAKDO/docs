// TRACE MVP 안내서 화면. 글과 그림 좌표는 data.mjs에 있고, 여기서는 그리기만 한다.
import { NODES, ZONES, EDGES, STORY, SERVICES, FEATURES, STATES, GLOSSARY, OPS, API_URL } from "./data.mjs";

const W = 1400, H = 860;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// API 문서는 같은 사이트의 ../api/mvp.html (로컬에서 열면 배포본으로)
const apiBase = location.protocol === "file:" ? API_URL : "../api/mvp.html";
const apiLink = (op) => `${apiBase}#operation/${op}`;

// 경로 표시용 (원본은 contracts OpenAPI)
const PATHS = {
  authPing: "GET /api/v1/auth/ping", rentalPing: "GET /api/v1/rentals/ping", capturePing: "GET /api/v1/captures/ping",
  login: "POST /api/v1/auth/login", refreshToken: "POST /api/v1/auth/refresh", logout: "POST /api/v1/auth/logout", getMe: "GET /api/v1/auth/me",
  issueBoothToken: "POST /api/v1/auth/booth/token",
  listDeviceModels: "GET /api/v1/device-models", getDeviceModel: "GET /api/v1/device-models/{modelCode}", upsertDeviceModel: "PUT /api/v1/device-models/{modelCode}",
  createDevice: "POST /api/v1/devices", listDevices: "GET /api/v1/devices", updateDevice: "PATCH /api/v1/devices/{deviceId}",
  createRental: "POST /api/v1/rentals", listRentals: "GET /api/v1/rentals", getRental: "GET /api/v1/rentals/{rentalId}", startCheckpoint: "POST /api/v1/rentals/{rentalId}/checkpoints",
  createCaptureSet: "POST /api/v1/captures/sets", reissueUploadUrls: "POST /api/v1/captures/sets/{setId}/uploads", completeCaptureSet: "POST /api/v1/captures/sets/{setId}/complete",
  saveBoothDetections: "POST /api/v1/captures/sets/{setId}/detections", getCaptureSet: "GET /api/v1/captures/sets/{setId}",
  getCheckpointMedia: "GET /api/v1/captures/checkpoints/{checkpointId}/media", getCheckpointInspection: "GET /api/v1/captures/checkpoints/{checkpointId}/inspection",
};

// 선 굵은 아이콘(24 격자)
const ICONS = {
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  tablet: '<rect x="5" y="2.5" width="14" height="19" rx="2.5"/><path d="M11 18h2"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 9h6v6H9zM9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  door: '<path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17M3 21h18"/><circle cx="15" cy="12" r="1"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
  book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 21.5A2.5 2.5 0 0 1 6.5 19H20M8 7h8M8 11h6"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  gauge: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-6"/>',
  db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  box: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3h0V4zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3h0V4z"/>',
};
const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ""}</svg>`;
const kindOf = (id) => (NODES[id] ? NODES[id].kind : "server");
const nodeName = (id) => (NODES[id] ? NODES[id].title.replace(" · Jetson", "") : id);

// 둥근 모서리 꺾은선
function roundedPath(pts, r = 12) {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i];
    if (i < pts.length - 1) {
      const [px, py] = pts[i - 1], [nx, ny] = pts[i + 1];
      const l1 = Math.hypot(x - px, y - py), l2 = Math.hypot(nx - x, ny - y), rr = Math.min(r, l1 / 2, l2 / 2);
      d += ` L${x - ((x - px) / l1) * rr},${y - ((y - py) / l1) * rr} Q${x},${y} ${x + ((nx - x) / l2) * rr},${y + ((ny - y) / l2) * rr}`;
    } else d += ` L${x},${y}`;
  }
  return d;
}

function previewHtml() {
  const row = (face, bad) => `<div class="pv-row"><b>${face}</b>${[0, 1, 2, 3, 4, 5].map((i) => `<i class="${bad.includes(i) ? "d" : ""}"></i>`).join("")}</div>`;
  return `<div class="nh"><span class="ico" style="background:var(--outside-soft);color:var(--outside)">${icon("camera")}</span><div><div class="nt">검사 결과 화면</div><div class="nn">면마다 카메라 2 × 조명 3</div></div></div>
    ${row("BOT", [])}${row("TOP", [1, 4])}
    <div class="pv-grade"><b>B</b><span>긁힘 2곳 · 문제 있음<br>A면 문제 없음</span></div>`;
}

// 구성도 하나 그리기. focus = 강조할 상자·선(작은 그림)
function drawArch(host, focus) {
  const nodes = focus ? new Set(focus.nodes) : null;
  const edges = focus ? new Set(focus.edges) : null;
  const zones = ZONES.map((z) => `<div class="zone z-${z.kind}" style="left:${z.x}px;top:${z.y}px;width:${z.w}px;height:${z.h}px"><div class="zt">${esc(z.title)}</div>${z.sub ? `<div class="zs">${esc(z.sub)}</div>` : ""}</div>`).join("");
  const boxes = Object.entries(NODES).map(([id, n]) => {
    const on = nodes && nodes.has(id) ? " on" : "";
    const style = `left:${n.x}px;top:${n.y}px;width:${n.w}px;height:${n.h}px`;
    const badge = n.step ? `<span class="nstep">${n.step}</span>` : "";
    if (n.kind === "preview") return `<div class="node k-preview${on}" data-id="${id}" style="${style}">${badge}${previewHtml()}</div>`;
    return `<div class="node k-${n.kind}${on}" data-id="${id}" style="${style}">${badge}
      <div class="nh"><span class="ico">${icon(n.icon)}</span><div><div class="nt">${esc(n.title)}</div><div class="nn">${esc(n.nick)}</div></div></div>
      ${n.tech ? `<div class="tech">${esc(n.tech)}</div>` : ""}
      ${n.chips ? `<div class="nchips">${n.chips.map((c) => `<span>${esc(c)}</span>`).join("")}</div>` : ""}</div>`;
  }).join("");
  const color = (k) => `var(--${k === "preview" ? "outside" : k})`;
  const markers = ["booth", "server", "infra", "outside", "learn"].map((k) =>
    `<marker id="ar-${k}-${host.id}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${color(k)}"/></marker>`).join("");
  const lines = Object.entries(EDGES).map(([id, e]) => {
    const on = edges && edges.has(id) ? " on" : "";
    const c = color(e.kind), m = `url(#ar-${e.kind}-${host.id})`;
    let s = `<g class="e${on}"><path class="e-path" d="${roundedPath(e.pts)}" stroke="${c}" ${e.dash ? 'stroke-dasharray="6 6"' : ""} marker-end="${m}" ${e.both ? `marker-start="${m}"` : ""}/>`;
    if (e.label) {
      const w = [...e.label].reduce((a, ch) => a + (ch.charCodeAt(0) > 255 ? 12.5 : 7.2), 0) + 16;
      const x = e.rot ? e.lx - w / 2 : e.lx, y = e.ly;
      const rot = e.rot ? ` transform="rotate(-90 ${e.lx} ${e.ly})"` : "";
      s += `<g class="e-label"${rot}><rect x="${x}" y="${y - 11}" width="${w}" height="22" rx="11"/><text x="${x + w / 2}" y="${y + 4}" text-anchor="middle">${esc(e.label)}</text></g>`;
    }
    s += "</g>";
    if (e.step) {
      const [x0, y0] = e.pts[0], [x1, y1] = e.pts[1];
      const t = e.stepAt ?? 0.5, cx = x0 + (x1 - x0) * t, cy = y0 + (y1 - y0) * t;
      s += `<g class="e-step"><circle cx="${cx}" cy="${cy}" r="14" fill="${c}"/><text x="${cx}" y="${cy + 4.5}" text-anchor="middle">${e.step}</text></g>`;
    }
    return s;
  }).join("");
  host.innerHTML = `<div class="arch${focus ? " focus" : ""}">${zones}<svg class="edges" viewBox="0 0 ${W} ${H}"><defs>${markers}</defs>${lines}</svg>${boxes}</div>`;
  fit(host);
}

function fit(host) {
  const a = host.querySelector(".arch");
  const s = host.clientWidth / W;
  a.style.transform = `scale(${s})`;
  host.style.height = `${H * s}px`;
}
const hosts = [];
let mini = 0;
function archInto(el, focus) {
  const host = document.createElement("div");
  host.className = "arch-wrap";
  host.id = `a${mini++}`;
  el.appendChild(host);
  drawArch(host, focus);
  hosts.push(host);
}
new ResizeObserver(() => hosts.forEach(fit)).observe(document.body);

// 범례
$("legend").innerHTML = [
  ["booth", "부스 사진 (부스 · 촬영 · 검사)"], ["server", "사진과 무관한 서버"], ["infra", "공통 인프라"], ["outside", "밖 (브라우저 · 정문)"], ["learn", "학습 경로 (점선)", true],
].map(([k, t, d]) => `<span><i class="${d ? "dash" : ""}" style="border-color:var(--${k});background:var(--${k}-soft)"></i>${t}</span>`).join("") + "<span>① ~ ⑥ = 이야기 순서</span>";

// 큰 구성도
const main = $("archMain");
main.id = "archMainHost";
drawArch(main, null);
hosts.push(main);

const fchip = (f) => {
  const ft = FEATURES.find((x) => x.id === f);
  return `<a class="chip ${["F5", "F6", "F7", "F8", "F9"].includes(f) ? "k-booth" : f === "F11" ? "k-learn" : "k-server"}" href="#${f.toLowerCase()}">${f}${ft ? " " + esc(ft.title) : ""}</a>`;
};

// 이야기
$("storyList").innerHTML = STORY.map((s) => `<div class="card ${[2, 3, 4, 5].includes(s.n) ? "b" : ""}"><span class="num">${s.n}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p><div class="chips">${s.features.map(fchip).join("")}</div></div>`).join("");

// 서비스
const svcList = $("svcList");
SERVICES.forEach((s) => {
  const k = NODES[s.node].kind;
  const el = document.createElement("article");
  el.className = `svc k-${k}`;
  el.id = `svc-${s.id}`;
  el.innerHTML = `<div class="sh"><div><h3>${esc(s.name)}</h3><div class="nick">${esc(s.nick)}</div></div><span class="owner">담당 ${esc(s.owner)}</span></div>
    <p>${esc(s.plain)}</p>
    <ul>${s.does.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>
    <dl class="meta"><dt>어디서</dt><dd>${esc(s.where)}</dd><dt>저장소</dt><dd>${esc(s.store)}</dd><dt>레포</dt><dd><a href="https://github.com/${s.repo}">${esc(s.repo)}</a></dd>${s.screens ? `<dt>화면</dt><dd class="mono">${s.screens.map(esc).join(" · ")}</dd>` : ""}</dl>
    <div><div style="font-size:13px;color:var(--muted);margin-bottom:6px">쓰이는 기능</div><div class="chips">${s.features.map(fchip).join("")}</div></div>
    <div class="mini"></div>`;
  svcList.appendChild(el);
  const touch = Object.entries(EDGES).filter(([, e]) => s.highlight.includes(nearest(e.pts[0])) && s.highlight.includes(nearest(e.pts[e.pts.length - 1]))).map(([id]) => id);
  archInto(el.querySelector(".mini"), { nodes: s.highlight, edges: touch });
});

// 선의 끝점이 어느 상자에 붙어 있는지
function nearest([x, y]) {
  let best = null, bd = 1e9;
  for (const [id, n] of Object.entries(NODES)) {
    const dx = Math.max(n.x - x, 0, x - (n.x + n.w)), dy = Math.max(n.y - y, 0, y - (n.y + n.h));
    const d = Math.hypot(dx, dy);
    if (d < bd) { bd = d; best = id; }
  }
  return best;
}

// 기능
$("fnav").innerHTML = FEATURES.map((f) => `<a href="#${f.id.toLowerCase()}"><b>${f.id}</b>${esc(f.title)}</a>`).join("");
const featList = $("featList");
FEATURES.forEach((f) => {
  const cls = ["F5", "F6", "F7", "F8", "F9"].includes(f.id) ? "b" : f.id === "F11" ? "l" : "";
  const el = document.createElement("article");
  el.className = `feat ${cls}`;
  el.id = f.id.toLowerCase();
  const apis = [...new Set(f.steps.filter((s) => s.api).map((s) => s.api))];
  const steps = f.steps.map((s, i) => {
    const route = s.from === s.to
      ? `<span class="chip k-${kindOf(s.from)}">${esc(nodeName(s.from))}</span><span class="arrow">안에서</span>`
      : `<span class="chip k-${kindOf(s.from)}">${esc(nodeName(s.from))}</span><span class="arrow">→</span><span class="chip k-${kindOf(s.to)}">${esc(nodeName(s.to))}</span>`;
    let api = "";
    if (s.api) {
      const [m, p] = PATHS[s.api].split(" ");
      api = `<div class="api"><a href="${apiLink(s.api)}" title="${esc(OPS[s.api].name)}"><span class="m ${m}">${m}</span>${esc(p)}</a><span style="color:var(--muted)">${esc(OPS[s.api].name)}</span></div>`;
    } else if (s.local) {
      const [m, p] = s.local.split(" ");
      api = `<div class="api"><span class="local"><span class="m LOCAL">Jetson ${m}</span>${esc(p)}</span><span style="color:var(--muted)">부스 로컬 API (서버로 안 감)</span></div>`;
    }
    return `<li><span class="sn">${i + 1}</span><div class="route">${route}</div><p class="st">${esc(s.text)}</p>${api}</li>`;
  }).join("");
  el.innerHTML = `<div class="fh"><span class="fid">${f.id}</span><h3>${esc(f.title)}</h3><div class="fwho"><span class="chip">쓰는 사람 · ${esc(f.who)}</span>${f.screen && f.screen !== "—" ? `<span class="chip">${esc(f.screen)}</span>` : ""}<span class="chip">담당 · ${esc(f.owner)}</span></div></div>
    <p class="fgoal">${esc(f.goal)}</p><p class="fplain">${esc(f.plain)}</p>${f.before ? `<p class="fbefore">시작 조건: ${esc(f.before)}</p>` : ""}
    <div class="fbody"><ol class="steps">${steps}</ol>
      <div class="side"><div class="mini"></div>
        ${f.changes.length ? `<div class="box"><h4>바뀌는 상태</h4><div class="chips">${f.changes.map((c) => `<span class="chip k-booth">${esc(c)}</span>`).join("")}</div></div>` : ""}
        ${apis.length ? `<div class="box"><h4>이 기능의 서버 API</h4><ul>${apis.map((a) => `<li><a href="${apiLink(a)}">${esc(OPS[a].name)}</a> <span class="mono" style="color:var(--muted)">${esc(a)}</span></li>`).join("")}</ul></div>` : `<div class="box"><h4>서버 API</h4><ul><li>없음. Jetson 안에서만 일어납니다.</li></ul></div>`}
        <div class="box warn"><h4>잘 안 될 때 · 알아 둘 것</h4><ul>${f.fails.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
      </div></div>`;
  featList.appendChild(el);
  archInto(el.querySelector(".mini"), { nodes: f.highlight, edges: f.edges });
});

// 상태
$("stateList").innerHTML = STATES.map((s) => `<div class="srow"><b>${esc(s.where)}</b><div class="schain">${s.seq.map((v, i) => `${i ? `<span class="sarrow">${esc(s.by[i])}</span>` : `<span class="sarrow">${esc(s.by[0])}</span>`}<span class="spill ${i === s.seq.length - 1 ? "last" : ""}">${esc(v)}</span>`).join("")}</div></div>`).join("");

// 낱말
$("wordList").innerHTML = GLOSSARY.map(([t, d]) => `<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join("");

if (new URLSearchParams(location.search).get("only") === "arch") document.body.classList.add("only-arch");
const theme = new URLSearchParams(location.search).get("theme");
if (theme) document.documentElement.dataset.theme = theme;
hosts.forEach(fit);
document.documentElement.dataset.ready = "1";
