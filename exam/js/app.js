/* 단원별 기출 트레이너 - 화면/로직 */

/* 배포된 파일이 최신인지 확인할 수 있게 버전을 노출한다.
   기능이 바뀔 때마다 올린다. */
const APP_VERSION = "2026.07.27-5";

/* ---------------- 유틸 ---------------- */
const view = () => document.getElementById("view");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uniq = a => [...new Set(a)];
const pct = v => (v == null ? "–" : Math.round(v * 100) + "%");
const fmtSec = s => { s = Math.max(0, Math.round(s)); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
const accClass = v => (v == null ? "b" : v >= 0.8 ? "g" : v >= 0.6 ? "y" : "r");
const norm = s => String(s ?? "").trim().replace(/\s+/g, "").toLowerCase();
const CIRCLE = ["①", "②", "③", "④", "⑤", "⑥", "⑦"];
const SEP = "›";

const ICON = {
  home: `<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>`,
  list: `<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h10"/>`,
  chart: `<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>`,
  note: `<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H20v15H7.5A2.5 2.5 0 0 0 5 20.5z"/><path d="M9 8h7"/><path d="M9 12h5"/>`,
  bank: `<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h10"/><circle cx="19" cy="17" r="2.5"/>`,
  clock: `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`,
  close: `<path d="M18 6 6 18M6 6l12 12"/>`,
  menu: `<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>`,
  pencil: `<path d="M4 20h4l10-10-4-4L4 16z"/><path d="M14 6l4 4"/>`,
  next: `<path d="M9 5l7 7-7 7"/>`,
  chevron: `<path d="M9 5l7 7-7 7"/>`,
  down: `<path d="M6 9l6 6 6-6"/>`,
  bookmark: `<path d="M6 4h12v17l-6-4.5L6 21z"/>`,
  check: `<path d="M4 12.5 9.5 18 20 6.5"/>`,
  target: `<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>`,
  refresh: `<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/>`,
  search: `<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>`,
  plus: `<path d="M12 5v14M5 12h14"/>`,
  moon: `<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>`,
  sun: `<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>`
};
const svg = (name, cls = "") => `<svg class="${cls}" viewBox="0 0 24 24">${ICON[name]}</svg>`;

function toast(msg) {
  document.querySelectorAll(".toast").forEach(t => t.remove());
  const d = document.createElement("div");
  d.className = "toast"; d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 2000);
}

function sheet(title, html) {
  closeSheet();
  const bg = document.createElement("div");
  bg.className = "sheet-bg";
  bg.innerHTML = `<div class="sheet">
    <div class="sheet-title spread"><span>${esc(title)}</span>
      <button class="icon-btn muted" data-act="close-sheet">${svg("close")}</button>
    </div>${html}</div>`;
  bg.addEventListener("click", e => { if (e.target === bg) closeSheet(); });
  document.body.appendChild(bg);
  hydrateImages(bg);
}
const closeSheet = () => document.querySelectorAll(".sheet-bg").forEach(s => s.remove());

/* 오래 걸리는 작업용 — 사라지지 않고 문구만 바뀌는 토스트 */
function progressToast(msg) {
  document.querySelectorAll(".toast").forEach(t => t.remove());
  const d = document.createElement("div");
  d.className = "toast"; d.textContent = msg;
  document.body.appendChild(d);
  return {
    set: t => { d.textContent = t; },
    done: () => d.remove()
  };
}

/* ---------------- 상태 ---------------- */
let route = "home";
let session = null;
let reviewTab = "wrong";
let statSubject = null;
let bankQuery = "";
let draft = null;
let pickMode = "manual";       // manual | weak
let showMore = false;
const expanded = new Set();    // 트리에서 펼친 노드 경로

const F = {
  subject: null, track: null,
  sel: new Set(),              // 선택한 단원 경로 (대단원›중단원›소단원)
  grade: null, years: [], exams: [],
  status: "all",               // all | unsolved | wrong | bookmark | due
  limit: 10, order: "random"
};

/* ---------------- 단원 경로 ---------------- */
const pathOf = p => [p.unit, p.topic, p.sub].filter(Boolean).join(SEP);

function pathMatches(path, sel) {
  if (!sel.size) return true;
  for (const s of sel) {
    if (s === path) return true;
    if (path.startsWith(s + SEP)) return true;   // 선택한 쪽이 상위 단원
    if (s.startsWith(path + SEP)) return true;   // 선택한 쪽이 하위 단원
  }
  return false;
}

/* 교육과정 + 실제 문제 데이터를 합친 트리 */
function buildTree(subject, track) {
  const tree = [];
  const findUnit = n => tree.find(u => u.unit === n);
  Curriculum.tree(subject, track).forEach(u => {
    tree.push({ unit: u.unit, topics: u.topics.map(t => ({ topic: t.topic, subs: t.subs.slice() })) });
  });
  // 교육과정에 없는 단원이 문제 데이터에 있으면 뒤에 붙인다
  Store.allProblems()
    .filter(p => p.subject === subject && (!track || (p.track || "") === track))
    .forEach(p => {
      if (!p.unit) return;
      let u = findUnit(p.unit);
      if (!u) { u = { unit: p.unit, topics: [] }; tree.push(u); }
      if (!p.topic) return;
      let t = u.topics.find(x => x.topic === p.topic);
      if (!t) { t = { topic: p.topic, subs: [] }; u.topics.push(t); }
      if (p.sub && !t.subs.includes(p.sub)) t.subs.push(p.sub);
    });
  return tree;
}

/* 노드 아래의 말단 경로들 */
function leavesOf(node, level, base) {
  if (level === 1) {
    if (!node.topics.length) return [node.unit];
    return node.topics.flatMap(t => leavesOf(t, 2, node.unit));
  }
  if (level === 2) {
    const p = base + SEP + node.topic;
    return node.subs.length ? node.subs.map(s => p + SEP + s) : [p];
  }
  return [base];
}

/* ---------------- 필터 ---------------- */
function matches(p) {
  if (F.subject && p.subject !== F.subject) return false;
  if (F.track && (p.track || "") !== F.track) return false;
  if (F.grade && p.grade !== F.grade) return false;
  if (F.years.length && !F.years.includes(String(p.year))) return false;
  if (F.exams.length && !F.exams.includes(p.exam)) return false;
  if (!pathMatches(pathOf(p), F.sel)) return false;
  switch (F.status) {
    case "unsolved": if (Store.isSolved(p.id)) return false; break;
    case "wrong": if (!Store.isWrong(p.id)) return false; break;
    case "bookmark": if (!Store.isBookmarked(p.id)) return false; break;
    case "due": if (!Store.reviewDue(p.id)) return false; break;
  }
  return true;
}
const filtered = () => Store.allProblems().filter(matches);

/* 해당 단원 경로에 걸리는 문항 수 (단원 선택은 무시) */
function countAt(path) {
  const backup = F.sel;
  F.sel = new Set([path]);
  const n = filtered().length;
  F.sel = backup;
  return n;
}

/* ---------------- 세션 ---------------- */
function shuffle(a) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[r[i], r[j]] = [r[j], r[i]]; }
  return r;
}

function orderList(list) {
  if (F.order === "random") return shuffle(list);
  if (F.order === "number") return list.slice().sort((a, b) => (a.no || 0) - (b.no || 0));
  return list.slice().sort((a, b) => (b.year || 0) - (a.year || 0) || (a.no || 0) - (b.no || 0));
}

function startSession(list, label) {
  if (!list.length) return toast("조건에 맞는 문제가 없습니다.");
  session = {
    list, idx: 0, records: [], label: label || "연습",
    startedAt: Date.now(), answered: false, chosen: null
  };
  route = "solve";
  render();
}

/* 약점 집중: 취약 소단원 + 오답/미풀이 가중 추출
 * scoped=true 면 지금 고른 과목 안에서만 뽑는다(문제 선택 화면).
 * 홈에서는 과목을 가리지 않고 전체에서 뽑는다. */
function weakPool(scoped = false) {
  const all = Store.allProblems().filter(p =>
    (!scoped || !F.subject || p.subject === F.subject) && (!F.grade || p.grade === F.grade));
  const acc = new Map();
  Store.groupStats(all, p => `${p.subject}|${pathOf(p)}`)
    .forEach(g => { if (g.solved > 0) acc.set(g.key, g.accuracy); });

  return all.map(p => {
    const a = acc.get(`${p.subject}|${pathOf(p)}`);
    let s = 1;
    if (a != null) s += (1 - a) * 4;             // 취약 단원 가중
    if (Store.isWrong(p.id)) s += 3;              // 최근 오답
    else if (!Store.isSolved(p.id)) s += 1.5;     // 아직 안 푼 문제
    if (Store.reviewDue(p.id)) s += 1;            // 복습 시점 도래
    return { p, s: s * (0.75 + Math.random() * 0.5) };
  }).sort((a, b) => b.s - a.s).map(x => x.p);
}

/* ---------------- 조각 렌더 ---------------- */
function chipRow(key, values, counts) {
  return `<div class="chips scroll">` + values.map(v => {
    const on = F[key] === v;
    const n = counts ? counts(v) : null;
    return `<button class="chip${on ? " on" : ""}" data-act="pick" data-key="${esc(key)}" data-val="${esc(v)}">${esc(v)}${
      n == null ? "" : `<span class="n">${n}</span>`}</button>`;
  }).join("") + `</div>`;
}

function bar(name, value, right, cls) {
  const w = value == null ? 0 : Math.round(value * 100);
  return `<div class="bar-row">
    <div class="bar-head"><span class="bar-name">${esc(name)}</span><span class="bar-val">${esc(right)}</span></div>
    <div class="bar"><div class="bar-fill ${cls || accClass(value)}" style="width:${w}%"></div></div>
  </div>`;
}

/* 이미지 태그 — IndexedDB 에 있는 이미지는 렌더 후 비동기로 채운다 */
function imgTag(src, id, cls = "q-img", style = "") {
  if (!src) return "";
  const st = style ? ` style="${style}"` : "";
  return src === IMG_REF
    ? `<img class="${cls}" data-img="${esc(id)}" alt="문제 이미지"${st}>`
    : `<img class="${cls}" src="${esc(src)}" alt="문제 이미지"${st}>`;
}

function hydrateImages(root = document) {
  root.querySelectorAll("img[data-img]").forEach(el => {
    if (el.dataset.loaded) return;
    el.dataset.loaded = "1";
    ImgStore.get(el.dataset.img).then(v => { if (v) el.src = v; }).catch(() => {});
  });
}

function metaLine(p) {
  const bits = [];
  if (p.level) bits.push(`난이도 ${Curriculum.levelLabel(p.level)}`);
  if (p.points) bits.push(`${p.points}점`);
  const right = [p.year, p.exam].filter(Boolean).join(" ");
  return `<div class="q-meta">${esc(bits.join(" · "))}${
    right ? `<span class="sep">|</span>${esc(right)}` : ""}${
    p.no ? `<span class="sep">|</span>${p.no}번` : ""}</div>`;
}

function problemItem(p) {
  const last = Store.lastAttempt(p.id);
  const cls = !last ? "" : last.correct ? "ok" : "bad";
  const mark = !last ? (p.no || "–") : last.correct ? "O" : "X";
  const sub = [p.unit, p.topic, p.sub].filter(Boolean).join(" › ");
  const head = [p.track, p.year && `${p.year} ${p.exam || ""}`.trim()].filter(Boolean).join(" · ");
  return `<div class="pitem" data-act="peek" data-id="${esc(p.id)}">
    <div class="pitem-no ${cls}">${esc(mark)}</div>
    <div class="pitem-body">
      <div class="pitem-t">${esc(sub || (p.text || "").slice(0, 30) || "문제")}</div>
      <div class="pitem-s">${esc(head)}${p.no ? ` · ${p.no}번` : ""}${Store.isBookmarked(p.id) ? " · ★" : ""}</div>
    </div>
  </div>`;
}

/* ---------------- 홈 ---------------- */
function renderHome() {
  const all = Store.allProblems();
  const st = Store.statFor(all);
  const due = all.filter(p => Store.reviewDue(p.id)).length;
  const wrong = all.filter(p => Store.isWrong(p.id)).length;
  const weak = Store.weakGroups(all, p => [p.unit, p.topic].filter(Boolean).join(" › "), 2).slice(0, 4);
  const days = Store.recentDays(14);
  const max = Math.max(1, ...days.map(d => d.count));
  const dark = Store.db.settings.theme === "dark";

  const quick = [
    ["기출 풀기", "list", "go-filter"], ["약점 집중", "target", "weak"],
    ["오답노트", "note", "go-review"], ["복습", "refresh", "quick-due"],
    ["분석", "chart", "go-stats"], ["문제 추가", "plus", "go-bank"]
  ];

  return `<div class="page-head spread">
      <button class="grade-btn" data-act="grade-pick">${esc(Store.db.settings.grade || "전체")} ${svg("down")}</button>
      <button class="icon-btn muted" data-act="theme">${svg(dark ? "sun" : "moon")}</button>
    </div>
    <div class="wrap">
      <div class="today">
        <div class="today-t">오늘의 학습</div>
        <div class="today-d">약한 단원부터 골라서 ${st.total ? "" : "— 먼저 문제를 넣어 주세요"}</div>
        <button class="btn primary block lg" data-act="weak">문제 풀기</button>
      </div>

      <div class="quick">${quick.map(([label, ico, act]) =>
        `<button class="quick-item" data-act="${act}">
          <span class="quick-ico">${svg(ico)}</span><span class="quick-l">${label}</span>
        </button>`).join("")}</div>

      <div class="sec-title">내 보드</div>

      <div class="tiles" style="margin-bottom:12px">
        <div class="tile"><div class="tile-v">${st.solved}</div><div class="tile-l">푼 문항</div></div>
        <div class="tile"><div class="tile-v">${pct(st.accuracy)}</div><div class="tile-l">정답률</div></div>
        <div class="tile"><div class="tile-v">${Store.streakDays()}일</div><div class="tile-l">연속 학습</div></div>
      </div>

      <div class="card">
        <div class="card-title">밀린 학습</div>
        <div class="btn-row">
          <button class="btn" data-act="quick-due">복습 ${due}</button>
          <button class="btn" data-act="quick" data-status="wrong">오답 ${wrong}</button>
          <button class="btn" data-act="quick" data-status="unsolved">새 문제 ${st.total - st.solved}</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">최근 14일</div>
        <div class="heat">${days.map(d => `
          <div class="heat-col" title="${d.date.getMonth() + 1}/${d.date.getDate()} ${d.count}문항">
            <div class="heat-bar ${d.count ? "" : "zero"}" style="height:${d.count ? Math.max(6, (d.count / max) * 52) : 3}px"></div>
          </div>`).join("")}</div>
        <div class="spread" style="margin-top:6px">
          <span class="heat-lbl">${days[0].date.getMonth() + 1}/${days[0].date.getDate()}</span>
          <span class="heat-lbl">오늘</span>
        </div>
      </div>

      <div class="card">
        <div class="card-title">취약 단원 <button class="btn sm ghost" data-act="go-stats">전체 보기</button></div>
        ${weak.length
          ? weak.map(g => bar(g.key, g.accuracy, `${g.correct}/${g.solved} · ${pct(g.accuracy)}`)).join("")
          : `<div class="empty">아직 데이터가 부족합니다.<br>단원별로 2문제 이상 풀면 표시됩니다.</div>`}
      </div>
    </div>`;
}

/* ---------------- 문제 선택 ---------------- */
function renderFilter() {
  const all = Store.allProblems();
  const subjects = uniq(all.map(p => p.subject)).filter(Boolean);
  if (!F.subject || !subjects.includes(F.subject)) F.subject = subjects[0] || null;

  const subjectPool = all.filter(p => p.subject === F.subject);
  const tracks = uniq(subjectPool.map(p => p.track || "")).filter(Boolean);
  if (F.track && !tracks.includes(F.track)) F.track = null;

  const list = filtered();
  const n = F.limit === 0 ? list.length : Math.min(list.length, F.limit);

  if (!all.length) {
    return `<div class="page-head"><div class="page-title">문제 선택</div></div>
      <div class="wrap"><div class="card"><div class="empty">등록된 문제가 없습니다.<br><br>
        <button class="btn primary" data-act="go-bank">문제 추가하러 가기</button></div></div></div>`;
  }

  const statusChips = [["all", "전체"], ["unsolved", "안 푼 문제"], ["wrong", "틀린 문제"],
    ["bookmark", "북마크"], ["due", "복습 대상"]].map(([k, label]) => {
    const b = F.status; F.status = k; const c = filtered().length; F.status = b;
    return `<button class="chip${F.status === k ? " on" : ""}" data-act="status" data-val="${k}">${label}<span class="n">${c}</span></button>`;
  }).join("");

  const years = uniq(subjectPool.map(p => String(p.year))).filter(y => y && y !== "undefined").sort((a, b) => b - a);
  const exams = uniq(subjectPool.map(p => p.exam)).filter(Boolean);

  return `<div class="page-head"><div class="page-title">문제 선택</div></div>
    <div class="wrap pad-cta">
      <div class="pickers">
        <button class="picker ${pickMode === "manual" ? "on" : "off"}" data-act="mode" data-val="manual">
          <div class="picker-ico">📝</div>
          <div class="picker-t">직접 선택</div>
          <div class="picker-d">단원을 골라서</div>
        </button>
        <button class="picker ${pickMode === "weak" ? "on" : "off"}" data-act="mode" data-val="weak">
          <div class="picker-ico">✨</div>
          <div class="picker-t">약점 추천 <span class="picker-badge">맞춤</span></div>
          <div class="picker-d">틀린 단원 위주로</div>
        </button>
      </div>

      ${pickMode === "weak" ? renderWeakPanel() : renderManualPanel(subjects, tracks, statusChips, years, exams)}
    </div>
    ${(() => {
      const weak = pickMode === "weak";
      const cnt = weak ? Math.min(weakPool(true).length, F.limit === 0 ? 999 : F.limit) : n;
      return `<div class="cta-bar"><div class="cta-inner">
        <button class="btn primary block lg" data-act="${weak ? "start-weak" : "start"}" ${cnt ? "" : "disabled"}>
          ${cnt ? `${cnt}문항 풀기` : "조건에 맞는 문제 없음"}</button>
      </div></div>`;
    })()}`;
}

function renderWeakPanel() {
  const pool = weakPool(true);
  const n = Math.min(pool.length, F.limit === 0 ? pool.length : F.limit);
  const preview = pool.slice(0, n);
  const groups = Store.groupStats(preview, p => [p.unit, p.topic].filter(Boolean).join(" › "));

  return `<div class="card" style="margin-top:12px">
      <div class="card-title">이렇게 뽑았어요</div>
      <div class="small muted" style="line-height:1.8">
        정답률이 낮은 단원 · 최근에 틀린 문제 · 아직 안 푼 문제 · 복습할 때가 된 문제를<br>
        함께 점수로 매겨 위에서부터 ${n}문항을 고릅니다.
      </div>
      <div class="hr"></div>
      <label class="field" style="margin:0"><span>문항 수</span>
        <select data-act="limit">
          ${[5, 10, 20, 30].map(v => `<option value="${v}"${F.limit === v ? " selected" : ""}>${v}문항</option>`).join("")}
        </select></label>
    </div>

    <div class="sec-title">포함된 단원</div>
    <div class="card">${groups.length
      ? groups.map(g => `<div class="spread" style="padding:7px 0">
          <span style="font-size:14px;font-weight:600">${esc(g.key)}</span>
          <span class="tcount">${g.total}문항</span></div>`).join("")
      : `<div class="empty">문제가 없습니다.</div>`}</div>`;
}

function renderManualPanel(subjects, tracks, statusChips, years, exams) {
  const tree = buildTree(F.subject, F.track);
  return `<div class="sec-head">
      <div class="sec-title">단원</div>
      <button class="btn sm ghost" data-act="reset-sel">${svg("refresh", "")} 초기화</button>
    </div>

    ${subjects.length > 1 ? chipRow("subject", subjects) : ""}
    ${tracks.length ? `<div style="margin-top:8px">${chipRow("track", tracks, v => {
      const b = F.track; F.track = v; const c = Store.allProblems().filter(p => p.subject === F.subject && (p.track || "") === v).length; F.track = b; return c;
    })}</div>` : ""}

    <div class="tree">${renderTree(tree)}</div>

    <div class="sec-title">조건</div>
    <div class="chips">${statusChips}</div>

    <div style="margin-top:14px">
      <button class="btn sm ghost" data-act="more">상세 조건 ${showMore ? "접기" : "펼치기"}</button>
    </div>
    ${showMore ? `<div class="card" style="margin-top:10px">
      <div class="card-title">학년</div>
      <div class="chips">${["고1", "고2", "고3"].map(g =>
        `<button class="chip${F.grade === g ? " on" : ""}" data-act="pick" data-key="grade" data-val="${g}">${g}</button>`).join("")}</div>
      <div class="card-title" style="margin-top:16px">연도</div>
      <div class="chips">${years.map(y =>
        `<button class="chip${F.years.includes(y) ? " on" : ""}" data-act="multi" data-key="years" data-val="${esc(y)}">${esc(y)}</button>`).join("") || `<span class="small muted">없음</span>`}</div>
      <div class="card-title" style="margin-top:16px">시행</div>
      <div class="chips">${exams.map(e =>
        `<button class="chip${F.exams.includes(e) ? " on" : ""}" data-act="multi" data-key="exams" data-val="${esc(e)}">${esc(e)}</button>`).join("") || `<span class="small muted">없음</span>`}</div>
      <div class="grid2" style="margin-top:16px">
        <label class="field" style="margin:0"><span>문항 수</span>
          <select data-act="limit">
            ${[5, 10, 20, 30, 50, 0].map(v => `<option value="${v}"${F.limit === v ? " selected" : ""}>${v === 0 ? "전체" : v + "문항"}</option>`).join("")}
          </select></label>
        <label class="field" style="margin:0"><span>순서</span>
          <select data-act="order">
            <option value="random"${F.order === "random" ? " selected" : ""}>랜덤</option>
            <option value="number"${F.order === "number" ? " selected" : ""}>문항 번호순</option>
            <option value="recent"${F.order === "recent" ? " selected" : ""}>최신 연도순</option>
          </select></label>
      </div>
    </div>` : ""}`;
}

function checkState(leaves) {
  const on = leaves.filter(l => F.sel.has(l)).length;
  return on === 0 ? "" : on === leaves.length ? "on" : "part";
}

function boxHtml(state) {
  return `<span class="tbox ${state}" style="position:relative">${svg("check")}</span>`;
}

function nodeRow(level, path, name, leaves, count, hasKids, open) {
  const state = checkState(leaves);
  return `<div class="tnode lv${level}" data-act="toggle-node" data-path="${esc(path)}">
    ${hasKids
      ? `<button class="tarrow ${open ? "open" : ""}" data-act="expand" data-path="${esc(path)}">${svg("chevron")}</button>`
      : `<span class="tarrow hidden"></span>`}
    ${boxHtml(state)}
    <span class="tname">${esc(name)}</span>
    <span class="tcount ${count ? "" : "zero"}">${count}개</span>
  </div>`;
}

function renderTree(tree) {
  if (!tree.length) return `<div class="empty">단원 정보가 없습니다.</div>`;
  let html = "";
  tree.forEach(u => {
    const uLeaves = leavesOf(u, 1);
    const uOpen = expanded.has(u.unit);
    html += nodeRow(1, u.unit, u.unit, uLeaves, countAt(u.unit), u.topics.length > 0, uOpen);
    if (!uOpen) return;
    u.topics.forEach(t => {
      const tPath = u.unit + SEP + t.topic;
      const tLeaves = leavesOf(t, 2, u.unit);
      const tOpen = expanded.has(tPath);
      html += nodeRow(2, tPath, t.topic, tLeaves, countAt(tPath), t.subs.length > 0, tOpen);
      if (!tOpen) return;
      t.subs.forEach(s => {
        const sPath = tPath + SEP + s;
        html += nodeRow(3, sPath, s, [sPath], countAt(sPath), false, false);
      });
    });
  });
  return html;
}

/* ---------------- 풀이 ---------------- */
let qTimer = { start: 0, id: null };
function startTimer() {
  clearInterval(qTimer.id);
  qTimer.start = Date.now();
  qTimer.id = setInterval(() => {
    const t = document.getElementById("timer");
    if (t) t.textContent = fmtSec((Date.now() - qTimer.start) / 1000);
  }, 500);
}
const elapsed = () => (Date.now() - qTimer.start) / 1000;

function renderSolve() {
  const s = session;
  if (!s) { route = "home"; return renderHome(); }
  const p = s.list[s.idx];
  const isMC = p.type !== "단답형";
  const correctAns = isMC ? Number(p.answer) : p.answer;
  const done = s.answered;
  const rec = done ? s.records[s.records.length - 1] : null;

  let body = "";
  if (isMC) {
    const items = (p.choices && p.choices.length ? p.choices : ["", "", "", "", ""]);
    body = `<div class="choices">` + items.map((c, i) => {
      const n = i + 1;
      let cls = "";
      if (done) {
        if (n === correctAns) cls = " correct";
        else if (n === s.chosen) cls = " wrong";
      } else if (n === s.chosen) cls = " sel";
      return `<button class="choice${cls}" data-act="choose" data-n="${n}" ${done ? "disabled" : ""}>
        <span class="choice-n">${CIRCLE[i]}</span><span>${esc(c)}</span></button>`;
    }).join("") + `</div>`;
  }

  const verdict = done ? `<div class="verdict ${rec.correct ? "ok" : "bad"}">
      <div class="verdict-h">${rec.correct ? "정답입니다" : "오답입니다"}</div>
      <div>정답 <b>${esc(isMC ? (CIRCLE[correctAns - 1] || correctAns) : correctAns)}</b>${
        !rec.correct && s.chosen != null && s.chosen !== "" ? ` · 내 답 ${esc(isMC ? (CIRCLE[s.chosen - 1] || s.chosen) : s.chosen)}` : ""}
        · ${fmtSec(rec.sec)}</div>
      ${p.solution ? `<div class="hr"></div><div style="white-space:pre-wrap">${esc(p.solution)}</div>` : ""}
      ${p.solutionImg ? imgTag(p.solutionImg, p.id + ":sol") : ""}
    </div>` : "";

  /* 하단 답 입력 바 */
  const barField = isMC
    ? `<div class="answer-field">${s.chosen ? `${CIRCLE[s.chosen - 1]} 선택함` : "답을 고르세요"}</div>`
    : `<input class="answer-field" id="short-input" type="text" autocomplete="off" enterkeyhint="done"
        value="${esc(done ? (s.chosen ?? "") : "")}" ${done ? "disabled" : ""} placeholder="답 입력">`;

  const bar = done
    ? `<button class="btn primary block lg" data-act="next">${s.idx + 1 >= s.list.length ? "결과 보기" : "다음 문제"}</button>`
    : `<div class="answer-inner">
        <button class="round-btn" data-act="skip" title="모르겠음">${svg("pencil")}</button>
        ${barField}
        <button class="round-btn primary" data-act="submit">${svg("next")}</button>
      </div>`;

  return `<div class="solve-bar">
      <button class="icon-btn muted" data-act="peek" data-id="${esc(p.id)}">${svg("menu")}</button>
      <span class="solve-title">문제 ${s.idx + 1}</span>
      <span class="timer" id="timer-wrap">${svg("clock")}<span id="timer">00:00</span></span>
      <button class="icon-btn ${Store.isBookmarked(p.id) ? "on" : "muted"}" data-act="bookmark" data-id="${esc(p.id)}">${svg("bookmark")}</button>
      <button class="icon-btn" data-act="exit">${svg("close")}</button>
    </div>
    <div class="solve-progress"><div style="width:${((s.idx + (done ? 1 : 0)) / s.list.length) * 100}%"></div></div>
    <div class="wrap">
      ${metaLine(p)}
      ${p.text ? `<div class="q-text">${esc(p.text)}</div>` : ""}
      ${p.box ? `<div class="q-box">${esc(p.box)}</div>` : ""}
      ${imgTag(p.img, p.id)}
      ${!p.text && !p.img ? `<div class="empty">문제 본문이 등록되어 있지 않습니다.<br>답만 체크하려면 아래에서 고르세요.</div>` : ""}
      ${body}
      ${verdict}
      <div class="solve-pad"></div>
    </div>
    <div class="answer-bar"><div class="cta-inner">${bar}</div></div>`;
}

function gradeCurrent(chosenRaw) {
  const s = session, p = s.list[s.idx];
  const isMC = p.type !== "단답형";
  let chosen = chosenRaw;
  if (isMC) chosen = chosen == null ? null : Number(chosen);
  const correct = isMC
    ? Number(p.answer) === chosen
    : chosen != null && norm(chosen) !== "" && norm(chosen) === norm(p.answer);
  const sec = elapsed();
  s.chosen = chosen;
  s.answered = true;
  s.records.push({ id: p.id, correct, chosen, sec });
  Store.recordAttempt(p.id, { correct, chosen, sec });
  clearInterval(qTimer.id);
  render();
}

function finishSession() {
  const s = session;
  Store.pushSession({
    at: Date.now(), label: s.label, total: s.list.length,
    correct: s.records.filter(r => r.correct).length,
    sec: Math.round((Date.now() - s.startedAt) / 1000)
  });
  route = "result";
  render();
}

/* ---------------- 결과 ---------------- */
function renderResult() {
  const s = session;
  if (!s || !s.records.length) { route = "home"; return renderHome(); }
  const correct = s.records.filter(r => r.correct).length;
  const total = s.records.length;
  const sec = Math.round((Date.now() - s.startedAt) / 1000);
  const byId = new Map(s.list.map(p => [p.id, p]));

  const groups = new Map();
  s.records.forEach(r => {
    const p = byId.get(r.id); if (!p) return;
    const k = [p.unit, p.topic].filter(Boolean).join(" › ");
    if (!groups.has(k)) groups.set(k, { n: 0, c: 0 });
    const g = groups.get(k); g.n++; if (r.correct) g.c++;
  });
  const rows = [...groups.entries()].sort((a, b) => a[1].c / a[1].n - b[1].c / b[1].n);
  const wrongN = s.records.filter(r => !r.correct).length;

  return `<div class="page-head"><div class="page-title">채점 결과</div>
      <div class="page-sub">${esc(s.label)} · ${fmtSec(sec)} 소요</div></div>
    <div class="wrap">
      <div class="score-ring">
        <div class="score-v">${correct}/${total}</div>
        <div class="score-l">${pct(correct / total)}</div>
      </div>

      <div class="card">
        <div class="card-title">단원별</div>
        ${rows.map(([k, g]) => bar(k, g.c / g.n, `${g.c}/${g.n}`)).join("")}
      </div>

      <div class="btn-row" style="margin-bottom:12px">
        ${wrongN ? `<button class="btn primary" data-act="retry-wrong">틀린 ${wrongN}문항 다시</button>` : ""}
        <button class="btn outline" data-act="go-home">홈으로</button>
      </div>

      <div class="sec-title">문항별</div>
      <div class="plist">${s.records.map((r, i) => {
        const p = byId.get(r.id);
        return `<div class="pitem" data-act="peek" data-id="${esc(r.id)}">
          <div class="pitem-no ${r.correct ? "ok" : "bad"}">${r.correct ? "O" : "X"}</div>
          <div class="pitem-body">
            <div class="pitem-t">${i + 1}. ${esc([p.topic, p.sub].filter(Boolean).join(" › ") || p.unit)}</div>
            <div class="pitem-s">${esc([p.year, p.exam].filter(Boolean).join(" "))}${p.no ? ` ${p.no}번` : ""} · ${fmtSec(r.sec)}</div>
          </div>
        </div>`;
      }).join("")}</div>
    </div>`;
}

/* ---------------- 분석 ---------------- */
function renderStats() {
  const all = Store.allProblems();
  const subjects = uniq(all.map(p => p.subject)).filter(Boolean);
  if (!statSubject || !subjects.includes(statSubject)) {
    const score = s => {
      const list = all.filter(p => p.subject === s);
      return [list.filter(p => Store.isSolved(p.id)).length, list.length];
    };
    statSubject = subjects.slice().sort((a, b) => {
      const [sa, ta] = score(a), [sb, tb] = score(b);
      return sb - sa || tb - ta;
    })[0] || null;
  }
  const pool = all.filter(p => p.subject === statSubject);
  const st = Store.statFor(pool);

  const g1 = Store.groupStats(pool, p => p.unit).filter(g => g.solved > 0).sort((a, b) => a.accuracy - b.accuracy);
  const g2 = Store.groupStats(pool, p => [p.unit, p.topic].filter(Boolean).join(" › ")).filter(g => g.solved > 0).sort((a, b) => a.accuracy - b.accuracy);
  const g3 = Store.groupStats(pool, p => `${p.year} ${p.exam}`).filter(g => g.solved > 0).sort((a, b) => b.key.localeCompare(a.key, "ko"));
  const untouched = Store.groupStats(pool, p => [p.unit, p.topic].filter(Boolean).join(" › ")).filter(g => g.solved === 0);

  return `<div class="page-head"><div class="page-title">분석</div>
      <div class="page-sub">정답률이 낮은 순으로 정렬됩니다</div></div>
    <div class="wrap">
      ${subjects.length > 1 ? `<div class="chips scroll" style="margin-bottom:16px">${subjects.map(s =>
        `<button class="chip${s === statSubject ? " on" : ""}" data-act="stat-subject" data-val="${esc(s)}">${esc(s)}</button>`).join("")}</div>` : ""}

      ${!pool.length ? `<div class="card"><div class="empty">문제가 없습니다.</div></div>` : `
      <div class="tiles" style="margin-bottom:12px">
        <div class="tile"><div class="tile-v">${st.solved}/${st.total}</div><div class="tile-l">진도</div></div>
        <div class="tile"><div class="tile-v">${pct(st.accuracy)}</div><div class="tile-l">정답률</div></div>
        <div class="tile"><div class="tile-v">${fmtSec(st.avgSec)}</div><div class="tile-l">평균 풀이시간</div></div>
      </div>

      <div class="card">
        <div class="card-title">대단원별</div>
        ${g1.length ? g1.map(g => bar(g.key, g.accuracy, `${g.correct}/${g.solved} · ${pct(g.accuracy)}`)).join("")
          : `<div class="empty">아직 푼 문제가 없습니다.</div>`}
      </div>

      <div class="card">
        <div class="card-title">중단원별</div>
        ${g2.length ? g2.map(g => `<div data-act="drill" data-key="${esc(g.key)}">${
          bar(g.key, g.accuracy, `${g.correct}/${g.solved} · ${pct(g.accuracy)}`)}</div>`).join("")
          : `<div class="empty">아직 푼 문제가 없습니다.</div>`}
        ${g2.length ? `<div class="small muted center">막대를 누르면 그 단원만 바로 풀 수 있어요</div>` : ""}
      </div>

      <div class="card">
        <div class="card-title">시행별</div>
        ${g3.length ? g3.map(g => bar(g.key, g.accuracy, `${g.correct}/${g.solved} · ${pct(g.accuracy)}`)).join("")
          : `<div class="empty">기록 없음</div>`}
      </div>

      ${untouched.length ? `<div class="card">
        <div class="card-title">아직 안 푼 단원</div>
        <div class="chips">${untouched.map(g =>
          `<button class="chip" data-act="drill" data-key="${esc(g.key)}">${esc(g.key)}<span class="n">${g.total}</span></button>`).join("")}</div>
      </div>` : ""}`}
    </div>`;
}

/* ---------------- 오답노트 ---------------- */
function renderReview() {
  const all = Store.allProblems();
  const sets = {
    wrong: all.filter(p => Store.isWrong(p.id)),
    due: all.filter(p => Store.reviewDue(p.id)),
    bookmark: all.filter(p => Store.isBookmarked(p.id))
  };
  const list = sets[reviewTab] || [];

  return `<div class="page-head"><div class="page-title">오답노트</div>
      <div class="page-sub">틀린 문제는 1·3·7·14·30일 간격으로 다시 나옵니다</div></div>
    <div class="wrap ${list.length ? "pad-cta" : ""}">
      <div class="chips" style="margin-bottom:16px">${[["wrong", "틀린 문제"], ["due", "복습 대상"], ["bookmark", "북마크"]].map(([k, l]) =>
        `<button class="chip${reviewTab === k ? " on" : ""}" data-act="review-tab" data-val="${k}">${l}<span class="n">${sets[k].length}</span></button>`).join("")}</div>

      ${list.length ? `<div class="plist">${list.map(problemItem).join("")}</div>`
        : `<div class="card"><div class="empty">${
            reviewTab === "wrong" ? "틀린 문제가 없습니다." :
            reviewTab === "due" ? "지금 복습할 문제가 없습니다." : "북마크한 문제가 없습니다."}</div></div>`}
    </div>
    ${list.length ? `<div class="cta-bar"><div class="cta-inner">
      <button class="btn primary block lg" data-act="review-start">${list.length}문항 다시 풀기</button>
    </div></div>` : ""}`;
}

/* ---------------- 문제 관리 ---------------- */
function renderBank() {
  const all = Store.allProblems();
  const mine = Store.db.problems.length;
  const subjects = uniq(all.map(p => p.subject)).filter(Boolean);
  const q = bankQuery.trim().toLowerCase();
  const list = q
    ? all.filter(p => [p.subject, p.track, p.unit, p.topic, p.sub, p.text, p.exam, String(p.year), String(p.no)]
        .filter(Boolean).join(" ").toLowerCase().includes(q))
    : all;

  return `<div class="page-head"><div class="page-title">문제 관리</div>
      <div class="page-sub">기출을 분류해 넣어두면 단원별로 뽑아 풀 수 있습니다</div></div>
    <div class="wrap">
      <div class="tiles" style="margin-bottom:12px">
        <div class="tile"><div class="tile-v">${all.length}</div><div class="tile-l">전체</div></div>
        <div class="tile"><div class="tile-v">${mine}</div><div class="tile-l">내가 추가</div></div>
        <div class="tile"><div class="tile-v">${subjects.length}</div><div class="tile-l">과목</div></div>
      </div>

      <div class="card">
        <div class="card-title">추가하기</div>
        <button class="btn primary block" style="margin-bottom:8px" data-act="bulk-open">
          시험지 통째로 넣기</button>
        <div class="btn-row" style="margin-bottom:8px">
          <button class="btn outline" data-act="new-problem">직접 입력</button>
          <button class="btn outline" data-act="import-file">파일 불러오기</button>
        </div>
        <div class="btn-row">
          <button class="btn outline" data-act="import-text">JSON 붙여넣기</button>
          <button class="btn outline" data-act="format-help">입력 형식</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">백업</div>
        <div class="btn-row">
          <button class="btn outline" data-act="export">내보내기(JSON)</button>
          <button class="btn danger" data-act="reset">전체 초기화</button>
        </div>
        <div class="small muted" style="margin-top:12px;line-height:1.6">
          데이터는 이 브라우저에만 저장됩니다. 기기를 바꾸기 전에 꼭 내보내세요.<br>
          문항 이미지 <span id="img-usage">계산 중…</span>
        </div>
      </div>

      <div class="card">
        <div class="card-title">설정</div>
        <label class="spread" style="padding:4px 0">
          <span style="font-size:14px">${typeof BUNDLED_LABEL !== "undefined" ? BUNDLED_LABEL : "샘플 문제 표시"}</span>
          <input type="checkbox" data-act="toggle-seed" style="width:auto" ${Store.db.settings.seedEnabled ? "checked" : ""}>
        </label>
        <label class="spread" style="padding:4px 0">
          <span style="font-size:14px">어두운 화면</span>
          <input type="checkbox" data-act="toggle-theme" style="width:auto" ${Store.db.settings.theme === "dark" ? "checked" : ""}>
        </label>
      </div>

      <div class="card">
        <div class="card-title">앱 정보</div>
        <div class="small muted" style="line-height:1.9">
          버전 <b>${APP_VERSION}</b><br>
          이미지 저장소 <b>${typeof ImgStore !== "undefined" && ImgStore.supported() ? "IndexedDB 사용 가능" : "사용 불가 — 구버전이거나 브라우저 제한"}</b>
        </div>
        <div class="small muted" style="margin-top:10px;line-height:1.6">
          문제가 안 보이면 이 버전을 확인하세요. 낮으면 새로고침(캐시 삭제)이 필요합니다.
        </div>
      </div>

      <div class="sec-title">문제 목록</div>
      <input type="text" placeholder="단원·연도·본문 검색" value="${esc(bankQuery)}" data-act="bank-search" style="margin-bottom:10px">
      <div class="plist">${list.slice(0, 100).map(problemItem).join("") || `<div class="empty">결과 없음</div>`}</div>
      ${list.length > 100 ? `<div class="empty small">외 ${list.length - 100}문항</div>` : ""}
    </div>`;
}

/* ---------------- 일괄 가져오기 ----------------
 * 시험지 한 회차를 통째로 넣는 화면.
 * 1) 시험지 정보 + 정답표(+본문) 붙여넣기 → 문항 자동 생성
 * 2) 번호 범위로 단원 지정 + 사진 일괄 첨부 → 저장
 */
let bulk = null;

function newBulk() {
  const g = Store.db.settings.grade || "고1";
  const subject = Curriculum.subjects(g)[0] || Curriculum.subjects()[0];
  return {
    step: 1,
    meta: {
      year: new Date().getFullYear(), exam: "1학기 중간", grade: g,
      subject, track: Curriculum.tracks(subject)[0] || ""
    },
    keyText: "", bodyText: "",
    items: [], sel: new Set()
  };
}

function bulkBuild() {
  const b = bulk;
  const keys = AnswerKey.parse(b.keyText);
  const bodies = AutoTag.split(b.bodyText);
  const bodyByNo = new Map(bodies.map(x => [x.no, x.text]));

  let base = keys;
  if (!base.length && bodies.length) base = bodies.map(x => ({ no: x.no, answer: "", type: "객관식" }));
  if (!base.length) return toast("정답표나 본문 중 하나는 붙여넣어야 합니다.");

  b.items = base.map(k => {
    const text = bodyByNo.get(k.no) || "";
    const guess = text ? AutoTag.suggest(text, b.meta.subject, b.meta.track, 1)[0] : null;
    return {
      no: k.no, answer: k.answer, type: k.type,
      unit: guess ? guess.unit : "", topic: guess ? guess.topic : "", sub: guess ? guess.sub : "",
      auto: !!guess, text, img: "", points: "", level: 3
    };
  });
  b.sel = new Set();
  b.step = 2;
  render();
  const tagged = b.items.filter(i => i.unit).length;
  toast(`${b.items.length}문항 생성${tagged ? ` · ${tagged}개 단원 자동 추천` : ""}`);
}

function renderBulk() {
  const b = bulk;
  if (!b) { route = "bank"; return renderBank(); }
  return b.step === 1 ? bulkStep1() : bulkStep2();
}

function bulkStep1() {
  const m = bulk.meta;
  const subjects = uniq(Curriculum.subjects().concat(Store.allProblems().map(p => p.subject))).filter(Boolean);
  const tracks = Curriculum.tracks(m.subject);
  const sel = (key, values) => `<select data-act="bulk-meta" data-key="${key}">
      ${values.map(v => `<option value="${esc(v)}"${String(m[key]) === String(v) ? " selected" : ""}>${esc(v)}</option>`).join("")}
    </select>`;

  return `<div class="page-head spread">
      <div><div class="page-title">시험지 통째로 넣기</div>
      <div class="page-sub">정답표만 붙여넣어도 문항이 만들어집니다</div></div>
      <button class="icon-btn muted" data-act="bulk-exit">${svg("close")}</button>
    </div>
    <div class="wrap pad-cta">
      <div class="card">
        <div class="card-title">시험지 정보</div>
        <div class="grid3">
          <label class="field"><span>연도</span><input type="number" data-act="bulk-meta" data-key="year" value="${esc(m.year)}"></label>
          <label class="field"><span>시행</span>${sel("exam", EXAMS.map(e => e.key))}</label>
          <label class="field"><span>학년</span>${sel("grade", GRADES)}</label>
        </div>
        <div class="grid2">
          <label class="field" style="margin:0"><span>과목</span>${sel("subject", subjects)}</label>
          <label class="field" style="margin:0"><span>세부 과목</span>${sel("track", tracks.length ? tracks : [""])}</label>
        </div>
      </div>

      <div class="card">
        <div class="card-title">정답표</div>
        <div class="small muted" style="margin-bottom:10px;line-height:1.7">
          시험지 뒤의 정답표를 그대로 붙여넣으세요.<br>
          <code class="mono">1 ③ 2 ⑤ 3 ①</code> · <code class="mono">1. 3</code> 줄바꿈 · <code class="mono">③⑤①②④</code> 나열 모두 됩니다.
        </div>
        <textarea data-act="bulk-key" style="min-height:110px" placeholder="1 ③  2 ⑤  3 ①  4 ②  5 ④">${esc(bulk.keyText)}</textarea>
      </div>

      <div class="card">
        <div class="card-title">문제 본문 <span class="small muted">선택</span></div>
        <div class="small muted" style="margin-bottom:10px;line-height:1.7">
          시험지 PDF에서 글자를 긁어 붙여넣으면 문항별로 잘라서 넣고,
          <b>단원까지 자동으로 추천</b>합니다. 없으면 비워 두세요.
        </div>
        <textarea data-act="bulk-body" style="min-height:130px" placeholder="1. 다음 중 국제단위계(SI)의 기본량이 아닌 것은?&#10;...&#10;2. ...">${esc(bulk.bodyText)}</textarea>
      </div>
    </div>
    <div class="cta-bar"><div class="cta-inner">
      <button class="btn primary block lg" data-act="bulk-build">문항 만들기</button>
    </div></div>`;
}

function bulkStep2() {
  const b = bulk;
  const tagged = b.items.filter(i => i.unit).length;
  const withImg = b.items.filter(i => i.img).length;
  const n = b.sel.size;

  return `<div class="page-head spread">
      <div><div class="page-title">${b.items.length}문항</div>
      <div class="page-sub">${esc(`${b.meta.year} ${b.meta.exam} · ${b.meta.track || b.meta.subject}`)}</div></div>
      <button class="icon-btn muted" data-act="bulk-exit">${svg("close")}</button>
    </div>
    <div class="wrap pad-cta">
      <div class="tiles" style="margin-bottom:12px">
        <div class="tile"><div class="tile-v">${tagged}/${b.items.length}</div><div class="tile-l">단원 지정됨</div></div>
        <div class="tile"><div class="tile-v">${withImg}</div><div class="tile-l">사진 첨부</div></div>
        <div class="tile"><div class="tile-v">${b.items.filter(i => i.answer !== "" && i.answer != null).length}</div><div class="tile-l">정답 있음</div></div>
      </div>

      <div class="btn-row" style="margin-bottom:12px">
        <button class="btn outline" data-act="bulk-photos">사진 일괄 첨부</button>
        <button class="btn outline" data-act="bulk-all">${n ? "선택 해제" : "전체 선택"}</button>
      </div>
      <div class="small muted" style="margin-bottom:12px;line-height:1.7">
        시험지는 보통 단원 순서대로 나오니, <b>여러 문항을 골라 한 번에 단원을 지정</b>하면 빠릅니다.
      </div>

      <div class="plist">${b.items.map((it, i) => {
        const on = b.sel.has(i);
        const leaf = it.sub || it.topic || it.unit;          // 제일 구체적인 단원을 앞에
        const parent = [it.unit, it.sub ? it.topic : ""].filter(Boolean).join(" › ");
        const ans = it.answer === "" || it.answer == null ? "–"
          : esc(it.type === "객관식" ? (CIRCLE[Number(it.answer) - 1] || it.answer) : it.answer);
        return `<div class="pitem" data-act="bulk-pick" data-i="${i}" style="${on ? "border-color:var(--accent);background:var(--accent-weak)" : ""}">
          <div class="pitem-no ${it.unit ? "ok" : ""}">${it.no}</div>
          <div class="pitem-body">
            <div class="pitem-t">${leaf ? esc(leaf) : `<span class="muted">단원 미지정</span>`}${
              it.auto && leaf ? ` <span class="tag hi">자동</span>` : ""}</div>
            <div class="pitem-s">정답 ${ans}${parent ? ` · ${esc(parent)}` : ""}${
              it.img ? " · 사진" : ""}${it.text ? " · 본문" : ""}</div>
          </div>
        </div>`;
      }).join("")}</div>
    </div>
    <div class="cta-bar"><div class="cta-inner">
      ${n ? `<button class="btn primary block lg" data-act="bulk-assign">선택한 ${n}문항에 단원 지정</button>`
          : `<button class="btn primary block lg" data-act="bulk-save">${b.items.length}문항 저장</button>`}
    </div></div>`;
}

/* 단원 고르기 시트 — 소단원 목록을 검색으로 좁혀 고른다 */
let unitQuery = "";
function unitPicker(onPickAct) {
  const b = bulk;
  const list = [];
  Curriculum.tree(b.meta.subject, b.meta.track).forEach(u => {
    u.topics.forEach(t => {
      if (t.subs.length) t.subs.forEach(s => list.push({ unit: u.unit, topic: t.topic, sub: s }));
      else list.push({ unit: u.unit, topic: t.topic, sub: "" });
    });
  });
  const q = unitQuery.trim();
  const shown = q ? list.filter(x => [x.unit, x.topic, x.sub].join(" ").includes(q)) : list;

  sheet(`단원 지정 (${b.sel.size}문항)`, `
    <input type="text" data-act="unit-search" value="${esc(unitQuery)}" placeholder="단원 검색" style="margin-bottom:12px">
    <div class="plist" style="max-height:52vh;overflow-y:auto">${shown.map(x =>
      `<div class="pitem" data-act="${onPickAct}" data-unit="${esc(x.unit)}" data-topic="${esc(x.topic)}" data-sub="${esc(x.sub)}">
        <div class="pitem-body">
          <div class="pitem-t">${esc(x.sub || x.topic)}</div>
          <div class="pitem-s">${esc(x.unit)}${x.sub ? ` › ${esc(x.topic)}` : ""}</div>
        </div>
      </div>`).join("") || `<div class="empty">검색 결과 없음</div>`}</div>`);
}

/* ---------------- 문제 상세 ---------------- */
function peek(id) {
  const p = Store.getProblem(id);
  if (!p) return;
  const isMC = p.type !== "단답형";
  const atts = Store.attemptsOf(id);
  const ansTxt = isMC ? (CIRCLE[Number(p.answer) - 1] || p.answer) : p.answer;
  const path = [p.subject, p.track, p.unit, p.topic, p.sub].filter(Boolean).join(" › ");

  sheet("문제 보기", `
    <div class="small muted" style="margin-bottom:10px">${esc(path)}</div>
    ${metaLine(p)}
    ${p.text ? `<div class="q-text" style="font-size:15.5px">${esc(p.text)}</div>` : ""}
    ${imgTag(p.img, p.id)}
    ${isMC && p.choices?.length ? `<div style="margin-top:14px">${p.choices.map((c, i) =>
      `<div style="padding:4px 0;font-size:14px;${Number(p.answer) === i + 1 ? "color:var(--ok);font-weight:700" : ""}">${CIRCLE[i]} ${esc(c)}</div>`).join("")}</div>` : ""}
    <div class="verdict ok" style="margin-top:16px">
      <div class="verdict-h">정답 ${esc(ansTxt)}</div>
      ${p.solution ? `<div style="white-space:pre-wrap">${esc(p.solution)}</div>` : `<div class="muted small">해설 없음</div>`}
    </div>
    ${p.solutionImg ? imgTag(p.solutionImg, p.id + ":sol") : ""}

    <div class="hr"></div>
    <div class="small muted">시도 ${atts.length}회${atts.length ? ` · 최근 ${atts[atts.length - 1].correct ? "정답" : "오답"}` : ""}</div>
    <label class="field" style="margin-top:14px"><span>메모</span>
      <textarea data-act="memo" data-id="${esc(id)}" placeholder="왜 틀렸는지 적어두면 복습할 때 좋아요">${esc(Store.getMemo(id))}</textarea></label>
    <div class="btn-row">
      <button class="btn outline" data-act="bookmark" data-id="${esc(id)}">${Store.isBookmarked(id) ? "북마크 해제" : "북마크"}</button>
      <button class="btn primary" data-act="solve-one" data-id="${esc(id)}">이 문제 풀기</button>
    </div>
    <div class="btn-row" style="margin-top:8px">
      <button class="btn ghost sm" data-act="edit-problem" data-id="${esc(id)}">수정</button>
      <button class="btn ghost sm" data-act="del-problem" data-id="${esc(id)}">삭제</button>
    </div>`);
}

/* ---------------- 문제 입력 폼 ---------------- */
function blankDraft() {
  const g = Store.db.settings.grade || "고1";
  const subject = Curriculum.subjects(g)[0] || "통합과학";
  return {
    id: "", year: new Date().getFullYear(), exam: "1학기 중간", org: "내신", grade: g,
    subject, track: Curriculum.tracks(subject)[0] || "", unit: "", topic: "", sub: "",
    no: "", points: 3, type: "객관식", choices: ["", "", "", "", ""], answer: "",
    level: 3, text: "", img: "", solution: "", solutionImg: ""
  };
}

function openForm(p) {
  draft = p ? JSON.parse(JSON.stringify(p)) : blankDraft();
  if (!draft.choices) draft.choices = ["", "", "", "", ""];
  renderForm();
}

function renderForm() {
  const d = draft;
  const dataOf = fn => uniq(Store.allProblems().map(fn)).filter(Boolean);
  const subjects = uniq(Curriculum.subjects().concat(dataOf(p => p.subject)));
  const tracks = uniq(Curriculum.tracks(d.subject).concat(
    Store.allProblems().filter(p => p.subject === d.subject).map(p => p.track)).filter(Boolean));
  const units = uniq(Curriculum.units(d.subject, d.track).concat(
    Store.allProblems().filter(p => p.subject === d.subject && (p.track || "") === d.track).map(p => p.unit)).filter(Boolean));
  const topics = uniq(Curriculum.topics(d.subject, d.unit).concat(
    Store.allProblems().filter(p => p.unit === d.unit).map(p => p.topic)).filter(Boolean));
  const subs = uniq(Curriculum.subs(d.subject, d.unit, d.topic).concat(
    Store.allProblems().filter(p => p.unit === d.unit && p.topic === d.topic).map(p => p.sub)).filter(Boolean));

  const sel = (key, values) => `<select data-act="draft" data-key="${key}">
      <option value=""${d[key] ? "" : " selected"}>선택</option>
      ${values.map(v => `<option value="${esc(v)}"${String(d[key]) === String(v) ? " selected" : ""}>${esc(v)}</option>`).join("")}
    </select>`;

  sheet(d.id ? "문제 수정" : "문제 추가", `
    <div class="grid3">
      <label class="field"><span>연도</span><input type="number" data-act="draft" data-key="year" value="${esc(d.year)}"></label>
      <label class="field"><span>시행</span>${sel("exam", EXAMS.map(e => e.key))}</label>
      <label class="field"><span>학년</span>${sel("grade", GRADES)}</label>
    </div>
    <div class="grid2">
      <label class="field"><span>과목</span>${sel("subject", subjects)}</label>
      <label class="field"><span>세부 과목</span>${sel("track", tracks)}</label>
    </div>
    <label class="field"><span>대단원</span>${sel("unit", units)}</label>
    <div class="grid2">
      <label class="field"><span>중단원</span>${sel("topic", topics)}</label>
      <label class="field"><span>소단원</span>${sel("sub", subs)}</label>
    </div>
    <div class="small muted" style="margin:-6px 0 14px">
      목록에 없으면 <button class="btn sm ghost" data-act="custom-unit">직접 입력</button>
    </div>
    <div class="grid3">
      <label class="field"><span>번호</span><input type="number" data-act="draft" data-key="no" value="${esc(d.no)}"></label>
      <label class="field"><span>배점</span><input type="number" data-act="draft" data-key="points" value="${esc(d.points)}"></label>
      <label class="field"><span>난이도</span>
        <select data-act="draft" data-key="level">
          ${LEVELS.map(l => `<option value="${l.v}"${String(d.level) === String(l.v) ? " selected" : ""}>${l.label}</option>`).join("")}
        </select></label>
    </div>
    <label class="field"><span>유형</span>
      <select data-act="draft" data-key="type">
        <option value="객관식"${d.type === "객관식" ? " selected" : ""}>객관식</option>
        <option value="단답형"${d.type === "단답형" ? " selected" : ""}>단답형</option>
      </select></label>
    <label class="field"><span>문제 본문 (선택)</span>
      <textarea data-act="draft" data-key="text" placeholder="이미지만 쓸 거면 비워도 됩니다">${esc(d.text)}</textarea></label>
    <label class="field"><span>&lt;보기&gt; 상자 (선택)</span>
      <textarea data-act="draft" data-key="box" placeholder="(가) ...&#10;(나) ...">${esc(d.box || "")}</textarea></label>
    <label class="field"><span>문제 이미지 URL (선택)</span>
      <input type="text" data-act="draft" data-key="img" value="${esc(d.img)}" placeholder="https://..."></label>
    <div class="btn-row" style="margin-bottom:14px">
      <button class="btn outline sm" data-act="pick-img" data-key="img">이미지 파일 선택</button>
      ${d.img ? `<button class="btn ghost sm" data-act="draft-clear" data-key="img">이미지 지우기</button>` : ""}
    </div>
    ${imgTag(d.img, d.id, "q-img", "margin-bottom:14px")}

    ${d.type === "객관식" ? `
      <div class="small muted" style="margin-bottom:8px">선택지 (비워두면 ①~⑤ 번호만 표시)</div>
      ${d.choices.map((c, i) => `<label class="field"><span>${CIRCLE[i]}</span>
        <input type="text" data-act="draft-choice" data-i="${i}" value="${esc(c)}"></label>`).join("")}
      <label class="field"><span>정답</span>
        <select data-act="draft" data-key="answer">
          <option value="">선택</option>
          ${[1, 2, 3, 4, 5].map(n => `<option value="${n}"${String(d.answer) === String(n) ? " selected" : ""}>${CIRCLE[n - 1]}</option>`).join("")}
        </select></label>`
    : `<label class="field"><span>정답</span>
        <input type="text" data-act="draft" data-key="answer" value="${esc(d.answer)}"></label>`}

    <label class="field"><span>해설 (선택)</span>
      <textarea data-act="draft" data-key="solution">${esc(d.solution)}</textarea></label>

    <div class="btn-row">
      <button class="btn ghost" data-act="close-sheet">취소</button>
      <button class="btn primary" data-act="save-problem">저장</button>
    </div>`);
}

/* ---------------- 가져오기 / 내보내기 ---------------- */
const CSV_HEADERS = ["id", "year", "exam", "org", "grade", "subject", "track", "unit", "topic", "sub",
  "no", "points", "type", "choices", "answer", "level", "img", "text", "solution"];

function parseCSV(text) {
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else if (c !== "\r") cur += c;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim() !== ""));
}

function csvToProblems(text) {
  const rows = parseCSV(text);
  if (!rows.length) return [];
  const head = rows[0].map(h => h.trim());
  return rows.slice(1).map((r, idx) => {
    const o = {};
    head.forEach((h, i) => { o[h] = (r[i] ?? "").trim(); });
    const p = {
      id: o.id || `csv-${Date.now()}-${idx}`,
      year: Number(o.year) || undefined,
      exam: o.exam || "", org: o.org || Curriculum.orgOf(o.exam) || "",
      grade: o.grade || "", subject: o.subject || "", track: o.track || "",
      unit: o.unit || "", topic: o.topic || "", sub: o.sub || "",
      no: Number(o.no) || undefined, points: Number(o.points) || undefined,
      type: o.type === "단답형" ? "단답형" : "객관식",
      answer: o.answer, level: Number(o.level) || undefined,
      img: o.img || "", text: o.text || "", solution: o.solution || ""
    };
    if (o.choices) p.choices = o.choices.split("|").map(s => s.trim());
    if (p.type === "객관식") p.answer = Number(p.answer);
    return p;
  }).filter(p => p.subject || p.unit || p.text || p.img);
}

function ingest(text) {
  const t = String(text).trim();
  let list;
  try {
    if (t.startsWith("{") || t.startsWith("[")) {
      const data = JSON.parse(t);
      if (Array.isArray(data)) list = data;
      else { Store.importAll(data); toast("불러오기 완료"); closeSheet(); render(); return; }
    } else list = csvToProblems(t);
  } catch (e) {
    return toast("형식을 읽지 못했습니다: " + e.message);
  }
  if (!list || !list.length) return toast("불러올 문제가 없습니다.");
  list.forEach(p => { if (!p.id) p.id = `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; });
  const heavy = list.filter(p => typeof p.img === "string" && p.img.startsWith("data:")).length;
  const pt = heavy ? progressToast(`이미지 저장 중… 0/${heavy}`) : null;

  ImgStore.absorb(list, (done, total) => { if (pt) pt.set(`이미지 저장 중… ${done}/${total}`); })
    .catch(() => ({ moved: 0, failed: heavy, total: heavy }))
    .then(res => {
      const r = Store.addProblems(list, { replace: true });
      if (pt) pt.done();
      const bits = [`${r.added}문항 추가`];
      if (r.updated) bits.push(`${r.updated}문항 갱신`);
      if (res && res.moved) bits.push(`이미지 ${res.moved}장`);
      if (res && res.failed) bits.push(`이미지 ${res.failed}장 실패`);
      toast(bits.join(" · "));
      closeSheet(); render();
    });
}

function pickFile(accept, cb) {
  const inp = document.createElement("input");
  inp.type = "file"; inp.accept = accept;
  inp.onchange = () => { if (inp.files[0]) cb(inp.files[0]); };
  inp.click();
}

function fileToDataURL(file, maxW = 1400) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = rej;
      img.src = fr.result;
    };
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

function download(name, text) {
  const b = new Blob([text], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b); a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function formatHelp() {
  sheet("입력 형식", `
    <div class="small muted" style="margin-bottom:12px">JSON 배열 또는 CSV를 붙여넣거나 파일로 불러올 수 있습니다.</div>
    <div class="card-title">JSON</div>
    <pre class="mono">[
  {
    "year": 2026, "exam": "1학기 중간", "org": "내신", "grade": "고1",
    "subject": "통합과학", "track": "통합과학1",
    "unit": "물질과 규칙성",
    "topic": "물질의 규칙성과 성질",
    "sub": "원소의 주기성",
    "no": 7, "points": 3, "type": "객관식",
    "choices": ["1","2","3","4","5"],
    "answer": 2, "level": 3,
    "img": "https://.../q7.png",
    "text": "문제 본문(선택)",
    "solution": "해설(선택)"
  }
]</pre>
    <div class="card-title" style="margin-top:18px">CSV</div>
    <pre class="mono">${CSV_HEADERS.join(",")}
,2026,1학기 중간,내신,고1,통합과학,통합과학1,물질과 규칙성,물질의 규칙성과 성질,원소의 주기성,7,3,객관식,"1|2|3|4|5",2,3,,,</pre>
    <div class="small muted" style="margin-top:12px;line-height:1.8">
      · <code class="mono">choices</code> 는 <code class="mono">|</code> 로 구분합니다.<br>
      · 단답형이면 <code class="mono">type</code> 을 <code class="mono">단답형</code>, <code class="mono">answer</code> 에 답을 그대로 씁니다.<br>
      · <code class="mono">id</code> 를 비우면 자동 생성되고, 같은 id 로 다시 넣으면 덮어씁니다.<br>
      · 단원 이름은 교육과정에 없는 것도 그대로 쓸 수 있습니다.<br>
      · 이미지는 URL 을 권장합니다(파일로 넣으면 저장 공간을 많이 씁니다).
    </div>
    <button class="btn outline block" style="margin-top:16px" data-act="close-sheet">닫기</button>`);
}

/* ---------------- 액션 ---------------- */
function applyTheme() {
  document.documentElement.setAttribute("data-theme", Store.db.settings.theme === "dark" ? "dark" : "light");
}

const ACT = {
  "go-home": () => { session = null; route = "home"; render(); },
  "go-filter": () => { route = "filter"; render(); },
  "go-stats": () => { route = "stats"; render(); },
  "go-review": () => { route = "review"; render(); },
  "go-bank": () => { route = "bank"; render(); },
  "close-sheet": () => closeSheet(),

  theme: () => {
    Store.db.settings.theme = Store.db.settings.theme === "dark" ? "light" : "dark";
    Store.save(); applyTheme(); render();
  },
  "grade-pick": () => sheet("학년", `<div class="chips">${
    ["전체", ...GRADES].map(g => {
      const cur = Store.db.settings.grade || "전체";
      return `<button class="chip${cur === g ? " on" : ""}" data-act="set-grade" data-val="${g}">${g}</button>`;
    }).join("")}</div>
    <div class="small muted" style="margin-top:14px">선택한 학년의 문제만 골라 출제합니다.</div>`),
  "set-grade": d => {
    Store.db.settings.grade = d.val === "전체" ? "" : d.val;
    F.grade = Store.db.settings.grade || null;
    Store.save(); closeSheet(); render();
  },

  /* 필터 */
  mode: d => { pickMode = d.val; render(); },
  pick: d => {
    const cur = F[d.key];
    F[d.key] = cur === d.val ? null : d.val;
    if (d.key === "subject") { F.track = null; F.sel.clear(); expanded.clear(); }
    if (d.key === "track") { F.sel.clear(); expanded.clear(); }
    render();
  },
  multi: d => {
    const arr = F[d.key];
    const i = arr.indexOf(d.val);
    if (i >= 0) arr.splice(i, 1); else arr.push(d.val);
    render();
  },
  status: d => { F.status = d.val; render(); },
  more: () => { showMore = !showMore; render(); },
  "reset-sel": () => { F.sel.clear(); F.status = "all"; F.years = []; F.exams = []; render(); },

  expand: (d, el) => {
    if (expanded.has(d.path)) expanded.delete(d.path); else expanded.add(d.path);
    render();
  },
  "toggle-node": d => {
    const parts = d.path.split(SEP);
    const tree = buildTree(F.subject, F.track);
    let leaves = [];
    const u = tree.find(x => x.unit === parts[0]);
    if (!u) return;
    if (parts.length === 1) leaves = leavesOf(u, 1);
    else {
      const t = u.topics.find(x => x.topic === parts[1]);
      if (!t) return;
      leaves = parts.length === 2 ? leavesOf(t, 2, u.unit) : [d.path];
    }
    const allOn = leaves.every(l => F.sel.has(l));
    leaves.forEach(l => { if (allOn) F.sel.delete(l); else F.sel.add(l); });
    render();
  },

  start: () => {
    const list = orderList(filtered());
    const n = F.limit === 0 ? list.length : F.limit;
    const label = F.sel.size
      ? [...F.sel].map(s => s.split(SEP).pop()).slice(0, 2).join(", ") + (F.sel.size > 2 ? ` 외 ${F.sel.size - 2}` : "")
      : (F.track || F.subject || "전체");
    startSession(list.slice(0, n), label);
  },
  "start-weak": () => {
    const n = F.limit === 0 ? 10 : F.limit;
    startSession(weakPool(true).slice(0, n), "약점 추천");
  },
  weak: () => {
    const n = F.limit === 0 ? 10 : F.limit;
    const pool = weakPool();
    if (!pool.length) { route = "bank"; render(); return toast("먼저 문제를 추가해 주세요."); }
    startSession(pool.slice(0, n), "약점 추천");
  },
  quick: d => {
    F.status = d.status; F.sel.clear();
    const list = orderList(filtered()).slice(0, 20);
    startSession(list, { wrong: "오답 다시풀기", unsolved: "새 문제" }[d.status] || "연습");
  },
  "quick-due": () => {
    F.status = "due"; F.sel.clear();
    startSession(orderList(filtered()).slice(0, 20), "복습");
  },
  drill: d => {
    const [unit, topic] = d.key.split(" › ");
    F.subject = statSubject; F.track = null;
    F.sel = new Set([topic ? unit + SEP + topic : unit]);
    F.status = "all"; pickMode = "manual";
    expanded.add(unit);
    route = "filter"; render();
  },
  "stat-subject": d => { statSubject = d.val; render(); },
  "review-tab": d => { reviewTab = d.val; render(); },
  "review-start": () => {
    const all = Store.allProblems();
    const list = reviewTab === "wrong" ? all.filter(p => Store.isWrong(p.id))
      : reviewTab === "due" ? all.filter(p => Store.reviewDue(p.id))
      : all.filter(p => Store.isBookmarked(p.id));
    startSession(shuffle(list), { wrong: "오답노트", due: "복습", bookmark: "북마크" }[reviewTab]);
  },

  /* 풀이 */
  choose: d => { if (!session.answered) { session.chosen = Number(d.n); render(); } },
  submit: () => {
    const p = session.list[session.idx];
    if (p.type === "단답형") {
      const v = document.getElementById("short-input").value;
      if (!v.trim()) return toast("답을 입력하세요.");
      gradeCurrent(v);
    } else {
      if (session.chosen == null) return toast("답을 고르세요.");
      gradeCurrent(session.chosen);
    }
  },
  skip: () => gradeCurrent(null),
  next: () => {
    const s = session;
    if (s.idx + 1 >= s.list.length) return finishSession();
    s.idx++; s.answered = false; s.chosen = null;
    render();
  },
  exit: () => {
    if (session.records.length && confirm("지금까지 푼 결과를 볼까요?")) return finishSession();
    session = null; route = "filter"; render();
  },
  bookmark: d => {
    const on = Store.toggleBookmark(d.id);
    toast(on ? "북마크에 추가" : "북마크 해제");
    if (document.querySelector(".sheet-bg")) peek(d.id); else render();
  },
  "retry-wrong": () => {
    const ids = session.records.filter(r => !r.correct).map(r => r.id);
    startSession(session.list.filter(p => ids.includes(p.id)), "오답 다시풀기");
  },
  peek: d => peek(d.id),
  "solve-one": d => { closeSheet(); const p = Store.getProblem(d.id); if (p) startSession([p], "단일 문제"); },

  /* 문제 관리 */
  "new-problem": () => openForm(null),
  "edit-problem": d => openForm(Store.getProblem(d.id)),
  "del-problem": d => {
    if (!confirm("이 문제를 삭제할까요? (풀이 기록은 남습니다)")) return;
    Store.removeProblem(d.id);
    ImgStore.del(d.id).catch(() => {});
    closeSheet(); toast("삭제했습니다"); render();
  },
  "custom-unit": () => {
    const unit = prompt("대단원", draft.unit || "");
    if (unit == null) return;
    draft.unit = unit.trim();
    const topic = prompt("중단원", draft.topic || "");
    if (topic != null) draft.topic = topic.trim();
    const sub = prompt("소단원 (없으면 비워두세요)", draft.sub || "");
    if (sub != null) draft.sub = sub.trim();
    renderForm();
  },
  "draft-clear": d => { draft[d.key] = ""; renderForm(); },
  "pick-img": d => pickFile("image/*", async f => {
    try { draft[d.key] = await fileToDataURL(f); renderForm(); }
    catch { toast("이미지를 읽지 못했습니다."); }
  }),
  "save-problem": () => {
    const d = draft;
    if (!d.subject || !d.unit) return toast("과목과 대단원은 필수입니다.");
    if (d.answer === "" || d.answer == null) return toast("정답을 입력하세요.");
    const p = Object.assign({}, d);
    ["year", "no", "points", "level"].forEach(k => { p[k] = Number(p[k]) || undefined; });
    p.org = p.org || Curriculum.orgOf(p.exam);
    if (p.type === "객관식") {
      p.answer = Number(p.answer);
      if (p.choices.every(c => !c.trim())) delete p.choices;
    } else delete p.choices;
    if (!p.id) p.id = `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    ImgStore.absorb([p]).catch(() => 0).then(() => {
      Store.addProblems([p], { replace: true });
      closeSheet(); toast("저장했습니다"); render();
    });
  },
  /* 일괄 가져오기 */
  "bulk-open": () => { bulk = newBulk(); unitQuery = ""; route = "bulk"; render(); },
  "bulk-exit": () => {
    if (bulk && bulk.step === 2 && bulk.items.length && !confirm("저장하지 않고 나갈까요?")) return;
    bulk = null; route = "bank"; render();
  },
  "bulk-build": () => bulkBuild(),
  "bulk-pick": d => {
    const i = Number(d.i);
    if (bulk.sel.has(i)) bulk.sel.delete(i); else bulk.sel.add(i);
    render();
  },
  "bulk-all": () => {
    if (bulk.sel.size) bulk.sel.clear();
    else bulk.items.forEach((_, i) => bulk.sel.add(i));
    render();
  },
  "bulk-assign": () => { unitQuery = ""; unitPicker("bulk-set-unit"); },
  "bulk-set-unit": d => {
    bulk.sel.forEach(i => {
      const it = bulk.items[i];
      it.unit = d.unit; it.topic = d.topic; it.sub = d.sub; it.auto = false;
    });
    toast(`${bulk.sel.size}문항에 지정했습니다`);
    bulk.sel.clear();
    closeSheet(); render();
  },
  "bulk-photos": () => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = "image/*"; inp.multiple = true;
    inp.onchange = async () => {
      const files = [...inp.files];
      if (!files.length) return;
      const targets = bulk.sel.size ? [...bulk.sel].sort((a, b) => a - b) : bulk.items.map((_, i) => i);
      toast(`사진 ${files.length}장 처리 중…`);
      for (let k = 0; k < files.length && k < targets.length; k++) {
        try { bulk.items[targets[k]].img = await fileToDataURL(files[k]); }
        catch { /* 개별 실패는 건너뛴다 */ }
      }
      toast(`${Math.min(files.length, targets.length)}문항에 사진을 넣었습니다`);
      render();
    };
    inp.click();
  },
  "bulk-save": () => {
    const b = bulk;
    const missing = b.items.filter(i => !i.unit).length;
    if (missing && !confirm(`단원이 없는 ${missing}문항이 있습니다. 그대로 저장할까요?`)) return;
    const stamp = Date.now();
    const list = b.items.map(it => ({
      id: `${b.meta.year}-${b.meta.exam}-${b.meta.subject}-${b.meta.track}-${it.no}`.replace(/\s+/g, ""),
      year: Number(b.meta.year) || undefined, exam: b.meta.exam,
      org: Curriculum.orgOf(b.meta.exam), grade: b.meta.grade,
      subject: b.meta.subject, track: b.meta.track,
      unit: it.unit, topic: it.topic, sub: it.sub,
      no: it.no, points: Number(it.points) || undefined,
      type: it.type, answer: it.answer, level: Number(it.level) || undefined,
      text: it.text || "", img: it.img || "",
      source: `일괄 입력 ${new Date(stamp).toLocaleDateString("ko-KR")}`
    }));
    const r = Store.addProblems(list, { replace: true });
    bulk = null; route = "bank"; render();
    toast(`${r.added}문항 추가${r.updated ? `, ${r.updated}문항 갱신` : ""}`);
  },

  "import-text": () => sheet("붙여넣기", `
    <div class="small muted" style="margin-bottom:10px">JSON 배열, 백업 JSON, CSV 모두 가능합니다.</div>
    <textarea id="import-area" style="min-height:220px" placeholder='[{"subject":"통합과학", ...}]'></textarea>
    <div class="btn-row" style="margin-top:12px">
      <button class="btn ghost" data-act="close-sheet">취소</button>
      <button class="btn primary" data-act="do-import">불러오기</button>
    </div>`),
  "do-import": () => ingest(document.getElementById("import-area").value),
  "import-file": () => pickFile(".json,.csv,.txt", f => {
    const fr = new FileReader();
    fr.onload = () => ingest(fr.result);
    fr.readAsText(f, "utf-8");
  }),
  "format-help": () => formatHelp(),
  export: () => sheet("백업 내보내기", `
    <div class="small muted" style="margin-bottom:14px;line-height:1.8">
      문제·풀이 기록·단원 분류는 항상 들어갑니다.<br>
      문항 이미지는 용량이 커서 따로 고를 수 있습니다.
    </div>
    <div class="btn-row">
      <button class="btn outline" data-act="do-export">이미지 빼고</button>
      <button class="btn primary" data-act="do-export" data-img="1">이미지 포함</button>
    </div>`),
  "do-export": d => {
    const withImg = d.img === "1";
    const day = new Date().toISOString().slice(0, 10);
    if (!withImg) {
      download(`기출트레이너-백업-${day}.json`, Store.exportAll());
      closeSheet(); return toast("백업 파일을 저장했습니다");
    }
    toast("이미지를 모으는 중…");
    const ids = Store.allProblems().filter(p => p.img === IMG_REF).map(p => p.id);
    ImgStore.dump(ids).then(images => {
      const data = JSON.parse(Store.exportAll());
      data.images = images;
      download(`기출트레이너-백업-이미지포함-${day}.json`, JSON.stringify(data));
      closeSheet(); toast(`이미지 ${Object.keys(images).length}장 포함해 저장했습니다`);
    });
  },
  reset: () => {
    if (!confirm("모든 문제와 풀이 기록을 지웁니다. 계속할까요?")) return;
    if (!confirm("정말 초기화할까요? 되돌릴 수 없습니다.")) return;
    Store.resetAll();
    ImgStore.clear().catch(() => {});
    applyTheme(); toast("초기화했습니다"); render();
  }
};

/* ---------------- 이벤트 ---------------- */
document.addEventListener("click", e => {
  const nav = e.target.closest(".nav-btn");
  if (nav) { session = null; route = nav.dataset.go; render(); return; }
  const a = e.target.closest("[data-act]");
  if (!a) return;
  const fn = ACT[a.dataset.act];
  if (fn) { e.preventDefault(); fn(a.dataset, a); }
});

document.addEventListener("change", e => {
  const t = e.target, act = t.dataset.act;
  if (act === "limit") { F.limit = Number(t.value); render(); }
  else if (act === "order") { F.order = t.value; render(); }
  else if (act === "toggle-seed") { Store.db.settings.seedEnabled = t.checked; Store.save(); render(); }
  else if (act === "toggle-theme") {
    Store.db.settings.theme = t.checked ? "dark" : "light";
    Store.save(); applyTheme(); render();
  }
  else if (act === "draft") {
    draft[t.dataset.key] = t.value;
    if (["subject", "track", "unit", "topic", "type"].includes(t.dataset.key)) {
      if (t.dataset.key === "subject") { draft.track = Curriculum.tracks(t.value)[0] || ""; draft.unit = ""; draft.topic = ""; draft.sub = ""; }
      if (t.dataset.key === "track") { draft.unit = ""; draft.topic = ""; draft.sub = ""; }
      if (t.dataset.key === "unit") { draft.topic = ""; draft.sub = ""; }
      if (t.dataset.key === "topic") draft.sub = "";
      renderForm();
    }
  }
  else if (act === "draft-choice") draft.choices[Number(t.dataset.i)] = t.value;
  else if (act === "bulk-meta") {
    bulk.meta[t.dataset.key] = t.value;
    if (t.dataset.key === "subject") bulk.meta.track = Curriculum.tracks(t.value)[0] || "";
    render();
  }
});

document.addEventListener("input", e => {
  const t = e.target;
  if (t.dataset.act === "bank-search") {
    bankQuery = t.value;
    clearTimeout(t._d);
    t._d = setTimeout(() => {
      const pos = t.selectionStart; render();
      const n = document.querySelector('[data-act="bank-search"]');
      if (n) { n.focus(); n.setSelectionRange(pos, pos); }
    }, 250);
  }
  else if (t.dataset.act === "memo") Store.setMemo(t.dataset.id, t.value);
  else if (t.dataset.act === "draft") draft[t.dataset.key] = t.value;
  else if (t.dataset.act === "draft-choice") draft.choices[Number(t.dataset.i)] = t.value;
  else if (t.dataset.act === "bulk-key") bulk.keyText = t.value;
  else if (t.dataset.act === "bulk-body") bulk.bodyText = t.value;
  else if (t.dataset.act === "unit-search") {
    unitQuery = t.value;
    clearTimeout(t._d);
    t._d = setTimeout(() => {
      const pos = t.selectionStart;
      unitPicker("bulk-set-unit");
      const n = document.querySelector('[data-act="unit-search"]');
      if (n) { n.focus(); n.setSelectionRange(pos, pos); }
    }, 200);
  }
});

document.addEventListener("keydown", e => {
  if (route !== "solve" || !session) return;
  if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") {
    if (e.key === "Enter" && !session.answered) ACT.submit();
    return;
  }
  if (e.key >= "1" && e.key <= "5" && !session.answered) ACT.choose({ n: e.key });
  else if (e.key === "Enter") session.answered ? ACT.next() : ACT.submit();
});

/* ---------------- 렌더 ---------------- */
const RENDER = {
  home: renderHome, filter: renderFilter, solve: renderSolve,
  result: renderResult, stats: renderStats, review: renderReview, bank: renderBank,
  bulk: renderBulk
};

function render() {
  const v = view();
  const keep = route === "filter" || route === "bank";
  const top = keep ? v.scrollTop : 0;
  v.innerHTML = (RENDER[route] || renderHome)();
  v.scrollTop = top;
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("on", b.dataset.go === route));
  const navOff = route === "solve" || route === "bulk";
  document.getElementById("nav").style.display = navOff ? "none" : "flex";
  document.body.setAttribute("data-nav", navOff ? "off" : "on");
  if (route === "solve" && session && !session.answered) startTimer();
  hydrateImages(v);
  if (route === "bank") {
    const el = document.getElementById("img-usage");
    if (el) {
      const n = Store.allProblems().filter(p => p.img === IMG_REF).length;
      ImgStore.bytes()
        .then(b => { el.textContent = `${n}장 · ${(b / 1048576).toFixed(1)}MB (IndexedDB)`; })
        .catch(() => { el.textContent = "사용 안 함"; });
    }
  }
}

Store.load();
F.grade = Store.db.settings.grade || null;
applyTheme();
render();
