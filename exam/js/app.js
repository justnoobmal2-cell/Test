/* 단원별 기출 트레이너 - 화면/로직 */

/* ---------------- 유틸 ---------------- */
const view = () => document.getElementById("view");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uniq = a => [...new Set(a)];
const pct = v => (v == null ? "–" : Math.round(v * 100) + "%");
const fmtSec = s => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const accClass = v => (v == null ? "b" : v >= 0.8 ? "g" : v >= 0.6 ? "y" : "r");
const norm = s => String(s ?? "").trim().replace(/\s+/g, "").toLowerCase();
const CIRCLE = ["①", "②", "③", "④", "⑤", "⑥", "⑦"];

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
      <button class="icon-btn" data-act="close-sheet">
        <svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
    </div>${html}</div>`;
  bg.addEventListener("click", e => { if (e.target === bg) closeSheet(); });
  document.body.appendChild(bg);
}
const closeSheet = () => document.querySelectorAll(".sheet-bg").forEach(s => s.remove());

/* ---------------- 상태 ---------------- */
let route = "home";
let session = null;
let reviewTab = "wrong";
let statSubject = null;
let bankQuery = "";
let draft = null;

const F = {
  subject: null, tracks: [], units: [], topics: [],
  years: [], exams: [], grades: [],
  status: "all",   // all | unsolved | wrong | bookmark | due
  limit: 10, order: "random"
};

/* ---------------- 필터 ---------------- */
function trackOf(p) { return p.track || "공통"; }

function matches(p) {
  if (F.subject && p.subject !== F.subject) return false;
  if (F.tracks.length && !F.tracks.includes(trackOf(p))) return false;
  if (F.units.length && !F.units.includes(p.unit)) return false;
  if (F.topics.length && !F.topics.includes(p.topic)) return false;
  if (F.years.length && !F.years.includes(String(p.year))) return false;
  if (F.exams.length && !F.exams.includes(p.exam)) return false;
  if (F.grades.length && !F.grades.includes(p.grade)) return false;
  switch (F.status) {
    case "unsolved": if (Store.isSolved(p.id)) return false; break;
    case "wrong": if (!Store.isWrong(p.id)) return false; break;
    case "bookmark": if (!Store.isBookmarked(p.id)) return false; break;
    case "due": if (!Store.reviewDue(p.id)) return false; break;
  }
  return true;
}

const filtered = () => Store.allProblems().filter(matches);

/* 필터 중 특정 항목만 무시하고 계산 — 칩 옆 개수 표시용 */
function countIf(key, value) {
  const backup = F[key];
  F[key] = Array.isArray(backup) ? [value] : value;
  const n = filtered().length;
  F[key] = backup;
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

/* 약점 집중: 취약 중단원 + 오답/미풀이 가중 추출 */
function weakSession(limit = 10) {
  const all = Store.allProblems();
  if (!all.length) return toast("문제를 먼저 추가해 주세요.");
  const accByTopic = new Map();
  Store.groupStats(all, p => `${p.subject}|${p.unit}|${p.topic}`)
    .forEach(g => { if (g.solved > 0) accByTopic.set(g.key, g.accuracy); });

  const scored = all.map(p => {
    const acc = accByTopic.get(`${p.subject}|${p.unit}|${p.topic}`);
    let s = 1;
    if (acc != null) s += (1 - acc) * 4;          // 취약 단원 가중
    if (Store.isWrong(p.id)) s += 3;               // 최근 오답
    else if (!Store.isSolved(p.id)) s += 1.5;      // 아직 안 푼 문제
    if (Store.reviewDue(p.id)) s += 1;             // 복습 시점 도래
    return { p, s: s * (0.75 + Math.random() * 0.5) };
  }).sort((a, b) => b.s - a.s);

  startSession(scored.slice(0, limit).map(x => x.p), "약점 집중");
}

/* ---------------- 조각 렌더 ---------------- */
function chips(key, values, { counts = false, single = false } = {}) {
  if (!values.length) return `<div class="small muted">해당 항목 없음</div>`;
  return `<div class="chips">` + values.map(v => {
    const on = single ? F[key] === v : F[key].includes(v);
    const c = counts ? ` data-count="${countIf(key, v)}"` : "";
    return `<button class="chip${on ? " on" : ""}${counts ? " count" : ""}"${c}
      data-act="chip" data-key="${esc(key)}" data-val="${esc(v)}" data-single="${single ? 1 : 0}">${esc(v)}</button>`;
  }).join("") + `</div>`;
}

function bar(name, value, right, cls) {
  const w = value == null ? 0 : Math.round(value * 100);
  return `<div class="bar-row">
    <div class="bar-head"><span class="bar-name">${esc(name)}</span><span class="bar-val">${esc(right)}</span></div>
    <div class="bar"><div class="bar-fill ${cls || accClass(value)}" style="width:${w}%"></div></div>
  </div>`;
}

function problemTags(p) {
  const t = [];
  if (p.year) t.push(`${p.year}`);
  if (p.exam) t.push(p.exam);
  if (p.org && p.org !== "샘플") t.push(p.org);
  if (p.subject) t.push(p.subject);
  if (p.track && p.track !== "공통") t.push(p.track);
  if (p.unit) t.push(p.unit);
  if (p.topic) t.push(p.topic);
  if (p.no) t.push(`${p.no}번`);
  if (p.points) t.push(`${p.points}점`);
  return t;
}

function problemItem(p) {
  const last = Store.lastAttempt(p.id);
  const cls = !last ? "" : last.correct ? "ok" : "bad";
  const mark = !last ? (p.no || "?") : last.correct ? "O" : "X";
  const head = [p.year, p.exam, p.subject].filter(Boolean).join(" · ");
  const sub = [p.unit, p.topic].filter(Boolean).join(" › ");
  return `<div class="pitem" data-act="peek" data-id="${esc(p.id)}">
    <div class="pitem-no ${cls}">${esc(mark)}</div>
    <div class="pitem-body">
      <div class="pitem-t">${esc(sub || p.text?.slice(0, 30) || "문제")}</div>
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
  // 홈에서는 대단원 단위로 본다(중단원은 표본이 적어 잘 안 잡힌다)
  const weak = Store.weakGroups(all, p => `${p.subject} · ${p.unit}`, 2).slice(0, 5);
  const days = Store.recentDays(14);
  const max = Math.max(1, ...days.map(d => d.count));

  return `<div class="page-head">
      <div class="page-title">단원별 기출 트레이너</div>
      <div class="page-sub">약한 단원만 골라서, 반복해서</div>
    </div>
    <div class="wrap">
      <div class="tiles">
        <div class="tile"><div class="tile-v">${st.total}</div><div class="tile-l">전체 문항</div></div>
        <div class="tile"><div class="tile-v">${st.solved}</div><div class="tile-l">푼 문항</div></div>
        <div class="tile"><div class="tile-v">${pct(st.accuracy)}</div><div class="tile-l">정답률</div></div>
      </div>

      <div class="card" style="margin-top:12px">
        <div class="card-title">오늘 뭐 풀까?</div>
        <div class="btn-row" style="margin-bottom:8px">
          <button class="btn primary" data-act="weak">약점 집중 10문항</button>
        </div>
        <div class="btn-row">
          <button class="btn" data-act="quick" data-status="due">복습 ${due}</button>
          <button class="btn" data-act="quick" data-status="wrong">오답 ${wrong}</button>
          <button class="btn" data-act="quick" data-status="unsolved">새 문제 ${st.total - st.solved}</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">최근 14일 <span class="small muted">연속 ${Store.streakDays()}일</span></div>
        <div class="heat">${days.map(d => `
          <div class="heat-col" title="${d.date.getMonth() + 1}/${d.date.getDate()} ${d.count}문항">
            <div class="heat-bar ${d.count ? "" : "zero"}" style="height:${d.count ? Math.max(6, (d.count / max) * 52) : 3}px"></div>
          </div>`).join("")}</div>
        <div class="row" style="justify-content:space-between;margin-top:4px">
          <span class="heat-lbl">${days[0].date.getMonth() + 1}/${days[0].date.getDate()}</span>
          <span class="heat-lbl">오늘</span>
        </div>
      </div>

      <div class="sec-title">취약 단원</div>
      ${weak.length ? `<div class="card">${weak.map(g =>
        bar(g.key, g.accuracy, `${g.correct}/${g.solved} · ${pct(g.accuracy)}`)).join("")}
        <button class="btn block sm" data-act="go" data-r="stats">전체 분석 보기</button>
      </div>`
      : `<div class="card"><div class="empty">아직 데이터가 부족합니다.<br>단원별로 2문제 이상 풀면 취약 단원이 표시됩니다.</div></div>`}

      ${Store.db.sessions.length ? `<div class="sec-title">최근 학습</div>
      <div class="card">${Store.db.sessions.slice(0, 5).map(s => `
        <div class="spread" style="padding:7px 0;border-bottom:1px solid var(--line)">
          <div><div style="font-size:13.5px;font-weight:600">${esc(s.label)}</div>
          <div class="small muted">${new Date(s.at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div></div>
          <div style="font-weight:800">${s.correct}/${s.total}</div>
        </div>`).join("")}</div>` : ""}
    </div>`;
}

/* ---------------- 문제 풀기(필터) ---------------- */
function renderFilter() {
  const all = Store.allProblems();
  const pool = F.subject ? all.filter(p => p.subject === F.subject) : all;
  const subjects = uniq(all.map(p => p.subject)).filter(Boolean).sort();
  const tracks = uniq(pool.map(trackOf)).sort();
  const unitPool = pool.filter(p => !F.tracks.length || F.tracks.includes(trackOf(p)));
  const units = uniq(unitPool.map(p => p.unit)).filter(Boolean).sort();
  const topicPool = unitPool.filter(p => !F.units.length || F.units.includes(p.unit));
  const topics = uniq(topicPool.map(p => p.topic)).filter(Boolean).sort();
  const years = uniq(pool.map(p => String(p.year))).filter(y => y && y !== "undefined").sort((a, b) => b - a);
  const exams = uniq(pool.map(p => p.exam)).filter(Boolean);
  const grades = uniq(pool.map(p => p.grade)).filter(Boolean).sort();

  const list = filtered();
  const st = Store.statFor(list);
  const n = Math.min(list.length, F.limit === 0 ? list.length : F.limit);

  const statusChips = [
    ["all", "전체"], ["unsolved", "안 푼 문제"], ["wrong", "틀린 문제"],
    ["bookmark", "북마크"], ["due", "복습 대상"]
  ].map(([k, label]) => {
    const b = F.status; F.status = k; const c = filtered().length; F.status = b;
    return `<button class="chip count${F.status === k ? " on" : ""}" data-count="${c}"
      data-act="status" data-val="${k}">${label}</button>`;
  }).join("");

  return `<div class="page-head">
      <div class="page-title">문제 풀기</div>
      <div class="page-sub">단원을 골라 나만의 문제 세트를 만드세요</div>
    </div>
    <div class="wrap">
      ${all.length ? "" : `<div class="card"><div class="empty">등록된 문제가 없습니다.<br><br>
        <button class="btn primary" data-act="go" data-r="bank">문제 추가하러 가기</button></div></div>`}

      <div class="card">
        <div class="card-title">과목</div>
        ${chips("subject", subjects, { counts: true, single: true })}
      </div>

      ${tracks.length > 1 ? `<div class="card">
        <div class="card-title">선택과목 <button class="btn sm ghost" data-act="clear" data-key="tracks">해제</button></div>
        ${chips("tracks", tracks, { counts: true })}
      </div>` : ""}

      <div class="card">
        <div class="card-title">대단원 <button class="btn sm ghost" data-act="clear" data-key="units">해제</button></div>
        ${chips("units", units, { counts: true })}
      </div>

      <div class="card">
        <div class="card-title">중단원 <button class="btn sm ghost" data-act="clear" data-key="topics">해제</button></div>
        ${chips("topics", topics, { counts: true })}
      </div>

      <div class="card">
        <div class="card-title">시행</div>
        <div class="small muted" style="margin-bottom:6px">연도</div>
        ${chips("years", years)}
        <div class="small muted" style="margin:12px 0 6px">시험</div>
        ${chips("exams", exams)}
        ${grades.length > 1 ? `<div class="small muted" style="margin:12px 0 6px">학년</div>${chips("grades", grades)}` : ""}
      </div>

      <div class="card">
        <div class="card-title">상태</div>
        <div class="chips">${statusChips}</div>
      </div>

      <div class="card">
        <div class="card-title">출제 방식</div>
        <div class="grid2">
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
      </div>

      <div class="card">
        <div class="spread">
          <div><div style="font-size:15px;font-weight:700">${list.length}문항 선택됨</div>
          <div class="small muted">푼 문제 ${st.solved} · 정답률 ${pct(st.accuracy)}</div></div>
          <button class="btn ghost sm" data-act="reset-filter">필터 초기화</button>
        </div>
        <button class="btn primary block" style="margin-top:12px" data-act="start" ${n ? "" : "disabled"}>
          ${n}문항 풀기</button>
      </div>

      ${list.length ? `<div class="sec-title">미리보기</div>
      <div class="plist">${list.slice(0, 30).map(problemItem).join("")}</div>
      ${list.length > 30 ? `<div class="empty small">외 ${list.length - 30}문항</div>` : ""}` : ""}
    </div>`;
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

  let body;
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
  } else {
    body = `<div style="margin-top:20px">
      <label class="field"><span>정답 입력</span>
        <input id="short-input" type="text" inputmode="text" autocomplete="off"
          value="${esc(done ? (s.chosen ?? "") : "")}" ${done ? "disabled" : ""} placeholder="답을 입력하세요"></label>
    </div>`;
  }

  const verdict = done ? `<div class="verdict ${rec.correct ? "ok" : "bad"}">
      <div class="verdict-h">${rec.correct ? "정답입니다" : "오답입니다"}</div>
      <div>정답: <b>${esc(isMC ? CIRCLE[correctAns - 1] || correctAns : correctAns)}</b>${
        !rec.correct && s.chosen != null && s.chosen !== "" ? ` · 내 답: ${esc(isMC ? CIRCLE[s.chosen - 1] || s.chosen : s.chosen)}` : ""}
        · ${fmtSec(rec.sec)}</div>
      ${p.solution ? `<div class="hr"></div><div style="white-space:pre-wrap">${esc(p.solution)}</div>` : ""}
      ${p.solutionImg ? `<img class="q-img" src="${esc(p.solutionImg)}" alt="해설">` : ""}
    </div>` : "";

  return `<div class="solve-bar">
      <button class="icon-btn" data-act="exit"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
      <div class="solve-progress"><div style="width:${((s.idx + (done ? 1 : 0)) / s.list.length) * 100}%"></div></div>
      <span class="small muted" style="font-variant-numeric:tabular-nums">${s.idx + 1}/${s.list.length}</span>
      <span class="timer" id="timer">0:00</span>
      <button class="icon-btn ${Store.isBookmarked(p.id) ? "on" : ""}" data-act="bookmark" data-id="${esc(p.id)}">
        <svg viewBox="0 0 24 24"><path d="M6 4h12v17l-6-4.5L6 21z"/></svg></button>
    </div>
    <div class="wrap">
      <div class="q-meta">${problemTags(p).map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>
      ${p.text ? `<div class="q-text">${esc(p.text)}</div>` : ""}
      ${p.img ? `<img class="q-img" src="${esc(p.img)}" alt="문제 이미지">` : ""}
      ${!p.text && !p.img ? `<div class="empty">문제 본문이 등록되어 있지 않습니다.<br>답만 체크하려면 아래에서 선택하세요.</div>` : ""}
      ${body}
      ${verdict}
    </div>
    <div class="solve-foot">
      ${done
        ? `<button class="btn primary block" data-act="next">${s.idx + 1 >= s.list.length ? "결과 보기" : "다음 문제"}</button>`
        : `<div class="btn-row">
            <button class="btn" data-act="skip">모르겠음</button>
            <button class="btn primary" data-act="submit" style="flex:2">채점하기</button>
          </div>`}
    </div>`;
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
  const correct = s.records.filter(r => r.correct).length;
  Store.pushSession({
    at: Date.now(), label: s.label, total: s.list.length,
    correct, sec: Math.round((Date.now() - s.startedAt) / 1000)
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
    const k = `${p.unit} › ${p.topic}`;
    if (!groups.has(k)) groups.set(k, { n: 0, c: 0 });
    const g = groups.get(k); g.n++; if (r.correct) g.c++;
  });
  const rows = [...groups.entries()].sort((a, b) => a[1].c / a[1].n - b[1].c / b[1].n);
  const wrongIds = s.records.filter(r => !r.correct).map(r => r.id);

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
        ${wrongIds.length ? `<button class="btn primary" data-act="retry-wrong">틀린 ${wrongIds.length}문항 다시</button>` : ""}
        <button class="btn" data-act="go" data-r="home">홈으로</button>
      </div>

      <div class="sec-title">문항별</div>
      <div class="plist">${s.records.map((r, i) => {
        const p = byId.get(r.id);
        return `<div class="pitem" data-act="peek" data-id="${esc(r.id)}">
          <div class="pitem-no ${r.correct ? "ok" : "bad"}">${r.correct ? "O" : "X"}</div>
          <div class="pitem-body">
            <div class="pitem-t">${i + 1}. ${esc([p.unit, p.topic].filter(Boolean).join(" › "))}</div>
            <div class="pitem-s">${esc([p.year, p.exam].filter(Boolean).join(" "))}${p.no ? ` ${p.no}번` : ""} · ${fmtSec(r.sec)}</div>
          </div>
        </div>`;
      }).join("")}</div>
    </div>`;
}

/* ---------------- 분석 ---------------- */
function renderStats() {
  const all = Store.allProblems();
  const subjects = uniq(all.map(p => p.subject)).filter(Boolean).sort();
  if (!statSubject || !subjects.includes(statSubject)) {
    // 기본값은 가장 많이 푼 과목 (없으면 문항이 가장 많은 과목)
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

  const units = Store.groupStats(pool, p => p.unit).filter(g => g.solved > 0)
    .sort((a, b) => a.accuracy - b.accuracy);
  const topics = Store.groupStats(pool, p => `${p.unit} › ${p.topic}`).filter(g => g.solved > 0)
    .sort((a, b) => a.accuracy - b.accuracy);
  const exams = Store.groupStats(pool, p => `${p.year} ${p.exam}`).filter(g => g.solved > 0)
    .sort((a, b) => b.key.localeCompare(a.key, "ko"));
  const untouched = Store.groupStats(pool, p => `${p.unit} › ${p.topic}`).filter(g => g.solved === 0);

  return `<div class="page-head"><div class="page-title">분석</div>
      <div class="page-sub">정답률이 낮은 순으로 정렬됩니다</div></div>
    <div class="wrap">
      ${subjects.length ? `<div class="chips" style="margin-bottom:14px">${subjects.map(s =>
        `<button class="chip${s === statSubject ? " on" : ""}" data-act="stat-subject" data-val="${esc(s)}">${esc(s)}</button>`).join("")}</div>` : ""}

      ${!pool.length ? `<div class="card"><div class="empty">문제가 없습니다.</div></div>` : `
      <div class="tiles" style="margin-bottom:12px">
        <div class="tile"><div class="tile-v">${st.solved}/${st.total}</div><div class="tile-l">진도</div></div>
        <div class="tile"><div class="tile-v">${pct(st.accuracy)}</div><div class="tile-l">정답률</div></div>
        <div class="tile"><div class="tile-v">${fmtSec(st.avgSec)}</div><div class="tile-l">평균 풀이시간</div></div>
      </div>

      <div class="card">
        <div class="card-title">대단원별</div>
        ${units.length ? units.map(g => bar(g.key, g.accuracy, `${g.correct}/${g.solved} · ${pct(g.accuracy)}`)).join("")
          : `<div class="empty small">아직 푼 문제가 없습니다.</div>`}
      </div>

      <div class="card">
        <div class="card-title">중단원별</div>
        ${topics.length ? topics.map(g => `<div data-act="drill" data-key="${esc(g.key)}">${
          bar(g.key, g.accuracy, `${g.correct}/${g.solved} · ${pct(g.accuracy)}`)}</div>`).join("")
          : `<div class="empty small">아직 푼 문제가 없습니다.</div>`}
        ${topics.length ? `<div class="small muted center">막대를 누르면 그 단원만 바로 풀 수 있어요</div>` : ""}
      </div>

      <div class="card">
        <div class="card-title">시행별</div>
        ${exams.length ? exams.map(g => bar(g.key, g.accuracy, `${g.correct}/${g.solved} · ${pct(g.accuracy)}`)).join("")
          : `<div class="empty small">기록 없음</div>`}
      </div>

      ${untouched.length ? `<div class="card">
        <div class="card-title">아직 안 푼 단원</div>
        <div class="chips">${untouched.map(g =>
          `<button class="chip" data-act="drill" data-key="${esc(g.key)}">${esc(g.key)} <span class="muted">${g.total}</span></button>`).join("")}</div>
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
  const tabs = [["wrong", "틀린 문제"], ["due", "복습 대상"], ["bookmark", "북마크"]];

  return `<div class="page-head"><div class="page-title">오답노트</div>
      <div class="page-sub">틀린 문제는 1·3·7·14·30일 간격으로 다시 나옵니다</div></div>
    <div class="wrap">
      <div class="chips" style="margin-bottom:14px">${tabs.map(([k, l]) =>
        `<button class="chip count${reviewTab === k ? " on" : ""}" data-count="${sets[k].length}"
          data-act="review-tab" data-val="${k}">${l}</button>`).join("")}</div>

      ${list.length ? `
        <button class="btn primary block" style="margin-bottom:12px" data-act="review-start">${list.length}문항 다시 풀기</button>
        <div class="plist">${list.map(problemItem).join("")}</div>`
        : `<div class="card"><div class="empty">${
            reviewTab === "wrong" ? "틀린 문제가 없습니다." :
            reviewTab === "due" ? "지금 복습할 문제가 없습니다." : "북마크한 문제가 없습니다."}</div></div>`}
    </div>`;
}

/* ---------------- 문제 관리 ---------------- */
function renderBank() {
  const all = Store.allProblems();
  const mine = Store.db.problems.length;
  const bySubject = Store.groupStats(all, p => p.subject);
  const q = bankQuery.trim().toLowerCase();
  const list = q
    ? all.filter(p => [p.subject, p.unit, p.topic, p.text, p.exam, String(p.year), String(p.no)]
        .filter(Boolean).join(" ").toLowerCase().includes(q))
    : all;

  return `<div class="page-head"><div class="page-title">문제 관리</div>
      <div class="page-sub">기출을 분류해서 넣어두면 단원별로 뽑아 풀 수 있습니다</div></div>
    <div class="wrap">
      <div class="tiles" style="margin-bottom:12px">
        <div class="tile"><div class="tile-v">${all.length}</div><div class="tile-l">전체</div></div>
        <div class="tile"><div class="tile-v">${mine}</div><div class="tile-l">내가 추가</div></div>
        <div class="tile"><div class="tile-v">${bySubject.length}</div><div class="tile-l">과목</div></div>
      </div>

      <div class="card">
        <div class="card-title">추가하기</div>
        <div class="btn-row" style="margin-bottom:8px">
          <button class="btn primary" data-act="new-problem">직접 입력</button>
          <button class="btn" data-act="import-file">파일 불러오기</button>
        </div>
        <div class="btn-row">
          <button class="btn" data-act="import-text">JSON 붙여넣기</button>
          <button class="btn" data-act="format-help">입력 형식</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">백업</div>
        <div class="btn-row">
          <button class="btn" data-act="export">내보내기(JSON)</button>
          <button class="btn danger" data-act="reset">전체 초기화</button>
        </div>
        <div class="small muted" style="margin-top:10px">
          데이터는 이 브라우저에만 저장됩니다. 기기를 바꾸기 전에 꼭 내보내세요.
        </div>
      </div>

      <div class="card">
        <div class="card-title">설정</div>
        <label class="row" style="justify-content:space-between">
          <span class="small">샘플 문제 표시</span>
          <input type="checkbox" data-act="toggle-seed" style="width:auto" ${Store.db.settings.seedEnabled ? "checked" : ""}>
        </label>
      </div>

      <div class="sec-title">문제 목록</div>
      <input type="text" placeholder="단원·연도·본문 검색" value="${esc(bankQuery)}" data-act="bank-search" style="margin-bottom:10px">
      <div class="plist">${list.slice(0, 100).map(problemItem).join("") || `<div class="empty">결과 없음</div>`}</div>
      ${list.length > 100 ? `<div class="empty small">외 ${list.length - 100}문항</div>` : ""}
    </div>`;
}

/* ---------------- 문제 상세 시트 ---------------- */
function peek(id) {
  const p = Store.getProblem(id);
  if (!p) return;
  const isMC = p.type !== "단답형";
  const atts = Store.attemptsOf(id);
  const memo = Store.getMemo(id);
  const ansTxt = isMC ? (CIRCLE[Number(p.answer) - 1] || p.answer) : p.answer;

  sheet("문제 보기", `
    <div class="q-meta">${problemTags(p).map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>
    ${p.text ? `<div class="q-text" style="font-size:15px">${esc(p.text)}</div>` : ""}
    ${p.img ? `<img class="q-img" src="${esc(p.img)}">` : ""}
    ${isMC && p.choices?.length ? `<div style="margin-top:12px">${p.choices.map((c, i) =>
      `<div class="small" style="padding:3px 0;${Number(p.answer) === i + 1 ? "color:var(--ok);font-weight:700" : ""}">${CIRCLE[i]} ${esc(c)}</div>`).join("")}</div>` : ""}
    <div class="verdict ok" style="margin-top:14px">
      <div class="verdict-h">정답 ${esc(ansTxt)}</div>
      ${p.solution ? `<div style="white-space:pre-wrap">${esc(p.solution)}</div>` : `<div class="muted small">해설 없음</div>`}
    </div>
    ${p.solutionImg ? `<img class="q-img" src="${esc(p.solutionImg)}">` : ""}

    <div class="hr"></div>
    <div class="small muted">시도 ${atts.length}회 ${atts.length ? `· 최근 ${atts[atts.length - 1].correct ? "정답" : "오답"}` : ""}</div>
    <label class="field" style="margin-top:12px"><span>메모</span>
      <textarea data-act="memo" data-id="${esc(id)}" placeholder="왜 틀렸는지 적어두면 복습할 때 좋아요">${esc(memo)}</textarea></label>
    <div class="btn-row">
      <button class="btn" data-act="bookmark" data-id="${esc(id)}">${Store.isBookmarked(id) ? "북마크 해제" : "북마크"}</button>
      <button class="btn" data-act="solve-one" data-id="${esc(id)}">이 문제 풀기</button>
    </div>
    <div class="btn-row" style="margin-top:8px">
      <button class="btn ghost sm" data-act="edit-problem" data-id="${esc(id)}">수정</button>
      <button class="btn danger sm" data-act="del-problem" data-id="${esc(id)}">삭제</button>
    </div>`);
}

/* ---------------- 문제 입력 폼 ---------------- */
function blankDraft() {
  return {
    id: "", year: new Date().getFullYear(), exam: "6월", org: "평가원", grade: "고3",
    subject: "수학", track: "공통", unit: "", topic: "", no: "", points: 3,
    type: "객관식", choices: ["", "", "", "", ""], answer: "", level: 3,
    text: "", img: "", solution: "", solutionImg: ""
  };
}

function openForm(p) {
  draft = p ? JSON.parse(JSON.stringify(p)) : blankDraft();
  if (!draft.choices) draft.choices = ["", "", "", "", ""];
  renderForm();
}

function renderForm() {
  const d = draft;
  const subjects = uniq(Curriculum.subjects().concat(Store.allProblems().map(p => p.subject))).filter(Boolean);
  const tracks = uniq(Curriculum.tracks(d.subject).concat(
    Store.allProblems().filter(p => p.subject === d.subject).map(trackOf))).filter(Boolean);
  const units = uniq(Curriculum.units(d.subject, d.track).concat(
    Store.allProblems().filter(p => p.subject === d.subject && trackOf(p) === d.track).map(p => p.unit))).filter(Boolean);
  const topics = uniq(Curriculum.topics(d.subject, d.unit).concat(
    Store.allProblems().filter(p => p.unit === d.unit).map(p => p.topic))).filter(Boolean);

  const sel = (key, values, extra = "") => `<select data-act="draft" data-key="${key}">
      <option value=""${d[key] ? "" : " selected"}>선택</option>
      ${values.map(v => `<option value="${esc(v)}"${String(d[key]) === String(v) ? " selected" : ""}>${esc(v)}</option>`).join("")}
      ${extra}</select>`;

  sheet(d.id ? "문제 수정" : "문제 추가", `
    <div class="grid3">
      <label class="field"><span>연도</span><input type="number" data-act="draft" data-key="year" value="${esc(d.year)}"></label>
      <label class="field"><span>시행</span>${sel("exam", EXAMS.map(e => e.key).concat("샘플"))}</label>
      <label class="field"><span>학년</span>${sel("grade", GRADES)}</label>
    </div>
    <div class="grid2">
      <label class="field"><span>과목</span>${sel("subject", subjects)}</label>
      <label class="field"><span>선택과목</span>${sel("track", tracks)}</label>
    </div>
    <div class="grid2">
      <label class="field"><span>대단원</span>${sel("unit", units)}</label>
      <label class="field"><span>중단원</span>${sel("topic", topics)}</label>
    </div>
    <div class="small muted" style="margin:-4px 0 12px">
      목록에 없는 단원은 <button class="btn sm ghost" data-act="custom-unit">직접 입력</button>
    </div>
    <div class="grid3">
      <label class="field"><span>번호</span><input type="number" data-act="draft" data-key="no" value="${esc(d.no)}"></label>
      <label class="field"><span>배점</span><input type="number" data-act="draft" data-key="points" value="${esc(d.points)}"></label>
      <label class="field"><span>난이도</span>${sel("level", [1, 2, 3, 4, 5])}</label>
    </div>
    <label class="field"><span>유형</span>
      <select data-act="draft" data-key="type">
        <option value="객관식"${d.type === "객관식" ? " selected" : ""}>객관식</option>
        <option value="단답형"${d.type === "단답형" ? " selected" : ""}>단답형</option>
      </select></label>
    <label class="field"><span>문제 본문 (선택)</span>
      <textarea data-act="draft" data-key="text" placeholder="이미지만 쓸 거면 비워도 됩니다">${esc(d.text)}</textarea></label>
    <label class="field"><span>문제 이미지 URL (선택)</span>
      <input type="text" data-act="draft" data-key="img" value="${esc(d.img)}" placeholder="https://..."></label>
    <div class="btn-row" style="margin-bottom:14px">
      <button class="btn sm" data-act="pick-img" data-key="img">이미지 파일 선택</button>
      ${d.img ? `<button class="btn sm ghost" data-act="draft-clear" data-key="img">이미지 지우기</button>` : ""}
    </div>
    ${d.img ? `<img class="q-img" src="${esc(d.img)}" style="margin-bottom:14px">` : ""}

    ${d.type === "객관식" ? `
      <div class="small muted" style="margin-bottom:6px">선택지 (비워두면 ①~⑤ 번호만 표시)</div>
      ${d.choices.map((c, i) => `<label class="field"><span>${CIRCLE[i]}</span>
        <input type="text" data-act="draft-choice" data-i="${i}" value="${esc(c)}"></label>`).join("")}
      <label class="field"><span>정답 (1~5)</span>
        <select data-act="draft" data-key="answer">
          <option value="">선택</option>
          ${[1, 2, 3, 4, 5].map(n => `<option value="${n}"${String(d.answer) === String(n) ? " selected" : ""}>${CIRCLE[n - 1]} ${n}</option>`).join("")}
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
const CSV_HEADERS = ["id", "year", "exam", "org", "grade", "subject", "track", "unit", "topic",
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
      grade: o.grade || "", subject: o.subject || "", track: o.track || "공통",
      unit: o.unit || "", topic: o.topic || "",
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

function ingest(text, name = "") {
  const t = text.trim();
  let list;
  try {
    if (t.startsWith("{") || t.startsWith("[")) {
      const data = JSON.parse(t);
      if (Array.isArray(data)) list = data;
      else { Store.importAll(data); toast("불러오기 완료"); closeSheet(); render(); return; }
    } else {
      list = csvToProblems(t);
    }
  } catch (e) {
    return toast("형식을 읽지 못했습니다: " + e.message);
  }
  if (!list || !list.length) return toast("불러올 문제가 없습니다.");
  const r = Store.addProblems(list, { replace: true });
  toast(`${r.added}개 추가${r.updated ? `, ${r.updated}개 갱신` : ""}`);
  closeSheet(); render();
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
    <div class="small muted" style="margin-bottom:10px">JSON 배열 또는 CSV를 그대로 붙여넣거나 파일로 불러올 수 있습니다.</div>
    <div class="card-title">JSON</div>
    <pre class="mono">[
  {
    "year": 2025, "exam": "9월", "org": "평가원", "grade": "고3",
    "subject": "수학", "track": "공통",
    "unit": "수학Ⅰ", "topic": "삼각함수",
    "no": 9, "points": 4, "type": "객관식",
    "choices": ["1","2","3","4","5"],
    "answer": 3, "level": 3,
    "img": "https://.../q9.png",
    "text": "문제 본문(선택)",
    "solution": "해설(선택)"
  }
]</pre>
    <div class="card-title" style="margin-top:16px">CSV</div>
    <pre class="mono">${CSV_HEADERS.join(",")}
,2025,9월,평가원,고3,수학,공통,수학Ⅰ,삼각함수,9,4,객관식,"1|2|3|4|5",3,3,,,</pre>
    <div class="small muted" style="margin-top:10px">
      · <code class="mono">choices</code> 는 <code class="mono">|</code> 로 구분합니다.<br>
      · 단답형이면 <code class="mono">type</code> 을 <code class="mono">단답형</code>, <code class="mono">answer</code> 에 답을 그대로 씁니다.<br>
      · <code class="mono">id</code> 를 비우면 자동 생성되고, 같은 id 로 다시 넣으면 덮어씁니다.<br>
      · 본문 이미지는 URL 을 권장합니다(파일로 넣으면 저장 공간을 많이 씁니다).
    </div>
    <div class="btn-row" style="margin-top:14px">
      <button class="btn" data-act="close-sheet">닫기</button>
    </div>`);
}

/* ---------------- 액션 ---------------- */
const ACT = {
  go: d => { route = d.r; render(); },
  "close-sheet": () => closeSheet(),

  chip: d => {
    const single = d.single === "1";
    if (single) {
      F[d.key] = F[d.key] === d.val ? null : d.val;
      if (d.key === "subject") { F.tracks = []; F.units = []; F.topics = []; }
    } else {
      const arr = F[d.key];
      const i = arr.indexOf(d.val);
      if (i >= 0) arr.splice(i, 1); else arr.push(d.val);
      if (d.key === "tracks") { F.units = []; F.topics = []; }
      if (d.key === "units") F.topics = [];
    }
    render();
  },
  clear: d => { F[d.key] = []; render(); },
  status: d => { F.status = d.val; render(); },
  "reset-filter": () => {
    Object.assign(F, { subject: F.subject, tracks: [], units: [], topics: [], years: [], exams: [], grades: [], status: "all", limit: 10, order: "random" });
    render();
  },
  start: () => {
    const list = orderList(filtered());
    const n = F.limit === 0 ? list.length : F.limit;
    const label = [F.subject, ...F.units, ...F.topics].filter(Boolean).join(" · ") || "전체";
    startSession(list.slice(0, n), label);
  },
  weak: () => weakSession(10),
  quick: d => {
    F.status = d.status; F.subject = null; F.tracks = []; F.units = []; F.topics = [];
    const list = orderList(filtered()).slice(0, 20);
    const names = { due: "복습", wrong: "오답 다시풀기", unsolved: "새 문제" };
    startSession(list, names[d.status] || "연습");
  },
  drill: d => {
    const [unit, topic] = d.key.split(" › ");
    F.subject = statSubject; F.tracks = []; F.units = [unit]; F.topics = topic ? [topic] : [];
    F.status = "all";
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
      if (session.chosen == null) return toast("답을 선택하세요.");
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
    Store.removeProblem(d.id); closeSheet(); toast("삭제했습니다"); render();
  },
  "custom-unit": () => {
    const unit = prompt("대단원 이름", draft.unit || "");
    if (unit == null) return;
    const topic = prompt("중단원 이름", draft.topic || "");
    draft.unit = unit.trim();
    if (topic != null) draft.topic = topic.trim();
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
    p.year = Number(p.year) || undefined;
    p.no = Number(p.no) || undefined;
    p.points = Number(p.points) || undefined;
    p.level = Number(p.level) || undefined;
    p.org = p.org || Curriculum.orgOf(p.exam);
    if (p.type === "객관식") {
      p.answer = Number(p.answer);
      if (p.choices.every(c => !c.trim())) delete p.choices;
    } else delete p.choices;
    if (!p.id) p.id = `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    Store.addProblems([p], { replace: true });
    closeSheet(); toast("저장했습니다"); render();
  },
  "import-text": () => sheet("붙여넣기", `
    <div class="small muted" style="margin-bottom:8px">JSON 배열, 백업 JSON, CSV 모두 가능합니다.</div>
    <textarea id="import-area" style="min-height:200px" placeholder='[{"subject":"수학", ...}]'></textarea>
    <div class="btn-row" style="margin-top:12px">
      <button class="btn ghost" data-act="close-sheet">취소</button>
      <button class="btn primary" data-act="do-import">불러오기</button>
    </div>`),
  "do-import": () => ingest(document.getElementById("import-area").value),
  "import-file": () => pickFile(".json,.csv,.txt", f => {
    const fr = new FileReader();
    fr.onload = () => ingest(fr.result, f.name);
    fr.readAsText(f, "utf-8");
  }),
  "format-help": () => formatHelp(),
  export: () => {
    download(`기출트레이너-백업-${new Date().toISOString().slice(0, 10)}.json`, Store.exportAll());
    toast("백업 파일을 저장했습니다");
  },
  reset: () => {
    if (!confirm("모든 문제와 풀이 기록을 지웁니다. 계속할까요?")) return;
    if (!confirm("정말 초기화할까요? 되돌릴 수 없습니다.")) return;
    Store.resetAll(); toast("초기화했습니다"); render();
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
  const t = e.target;
  const act = t.dataset.act;
  if (act === "limit") { F.limit = Number(t.value); render(); }
  else if (act === "order") { F.order = t.value; render(); }
  else if (act === "toggle-seed") { Store.db.settings.seedEnabled = t.checked; Store.save(); render(); }
  else if (act === "draft") {
    draft[t.dataset.key] = t.value;
    if (["subject", "track", "unit", "type"].includes(t.dataset.key)) {
      if (t.dataset.key === "subject") { draft.track = Curriculum.tracks(t.value)[0] || "공통"; draft.unit = ""; draft.topic = ""; }
      if (t.dataset.key === "track") { draft.unit = ""; draft.topic = ""; }
      if (t.dataset.key === "unit") draft.topic = "";
      renderForm();
    }
  }
  else if (act === "draft-choice") draft.choices[Number(t.dataset.i)] = t.value;
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
  result: renderResult, stats: renderStats, review: renderReview, bank: renderBank
};

function render() {
  const v = view();
  const keepScroll = route === "filter" || route === "bank";
  const top = keepScroll ? v.scrollTop : 0;
  v.innerHTML = (RENDER[route] || renderHome)();
  v.scrollTop = top;
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("on", b.dataset.go === route));
  document.getElementById("nav").style.display = route === "solve" ? "none" : "flex";
  if (route === "solve" && session && !session.answered) startTimer();
}

Store.load();
render();
