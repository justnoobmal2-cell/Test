/* 저장소 - localStorage 기반 상태 관리 */
const Store = (() => {
  const KEY = "kice-trainer-v1";

  const empty = () => ({
    problems: [],      // 사용자가 추가/불러온 문제
    hiddenSeeds: [],   // 숨긴 내장 샘플 문제 id
    attempts: {},      // { problemId: [{ts, correct, chosen, sec}] }
    bookmarks: [],     // problemId[]
    memos: {},         // { problemId: "메모" }
    sessions: [],      // 최근 학습 세션 기록
    settings: { seedEnabled: true, theme: "light", grade: "고1" }
  });

  let db = empty();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) db = Object.assign(empty(), JSON.parse(raw));
      if (!db.settings) db.settings = empty().settings;
    } catch (e) {
      console.warn("저장 데이터를 읽지 못했습니다.", e);
      db = empty();
    }
    return db;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
      return true;
    } catch (e) {
      alert("저장 공간이 부족합니다. 이미지가 큰 문제를 줄이거나 데이터를 내보낸 뒤 정리해 주세요.");
      return false;
    }
  }

  /* ---------- 문제 ---------- */
  function allProblems() {
    const seeds = db.settings.seedEnabled
      ? SEED_PROBLEMS.filter(p => !db.hiddenSeeds.includes(p.id))
      : [];
    return seeds.concat(db.problems);
  }

  function getProblem(id) {
    return allProblems().find(p => p.id === id) || null;
  }

  function addProblems(list, { replace = false } = {}) {
    let added = 0, updated = 0;
    list.forEach(p => {
      if (!p.id) p.id = "p-" + Math.random().toString(36).slice(2, 10);
      const i = db.problems.findIndex(x => x.id === p.id);
      if (i >= 0) {
        if (replace) { db.problems[i] = p; updated++; }
      } else {
        db.problems.push(p); added++;
      }
    });
    save();
    return { added, updated };
  }

  function removeProblem(id) {
    const i = db.problems.findIndex(p => p.id === id);
    if (i >= 0) db.problems.splice(i, 1);
    else if (SEED_PROBLEMS.some(p => p.id === id) && !db.hiddenSeeds.includes(id)) {
      db.hiddenSeeds.push(id);
    }
    save();
  }

  /* ---------- 풀이 기록 ---------- */
  function recordAttempt(problemId, { correct, chosen, sec }) {
    if (!db.attempts[problemId]) db.attempts[problemId] = [];
    db.attempts[problemId].push({
      ts: Date.now(), correct: !!correct, chosen: chosen ?? null, sec: sec || 0
    });
    save();
  }

  const attemptsOf = id => db.attempts[id] || [];
  const lastAttempt = id => { const a = attemptsOf(id); return a.length ? a[a.length - 1] : null; };
  const isSolved = id => attemptsOf(id).length > 0;
  const isWrong = id => { const l = lastAttempt(id); return !!l && !l.correct; };

  function clearAttempts(problemId) {
    if (problemId) delete db.attempts[problemId];
    else db.attempts = {};
    save();
  }

  /* ---------- 북마크 / 메모 ---------- */
  function toggleBookmark(id) {
    const i = db.bookmarks.indexOf(id);
    if (i >= 0) db.bookmarks.splice(i, 1); else db.bookmarks.push(id);
    save();
    return db.bookmarks.includes(id);
  }
  const isBookmarked = id => db.bookmarks.includes(id);

  function setMemo(id, text) {
    if (text && text.trim()) db.memos[id] = text.trim();
    else delete db.memos[id];
    save();
  }
  const getMemo = id => db.memos[id] || "";

  /* ---------- 복습 스케줄 (간격 반복) ---------- */
  // 마지막으로 틀린 뒤 연속으로 맞힌 횟수에 따라 다음 복습일이 밀린다.
  const INTERVALS = [1, 3, 7, 14, 30]; // 일 단위

  function reviewDue(id, now = Date.now()) {
    const a = attemptsOf(id);
    if (!a.length) return false;
    const last = a[a.length - 1];
    if (!last.correct) return true; // 최근에 틀렸으면 항상 복습 대상

    let streak = 0;
    for (let i = a.length - 1; i >= 0 && a[i].correct; i--) streak++;
    const days = INTERVALS[Math.min(streak - 1, INTERVALS.length - 1)];
    if (streak > INTERVALS.length) return false; // 충분히 익힘
    return now - last.ts >= days * 864e5;
  }

  /* ---------- 통계 ---------- */
  function statFor(problems) {
    let solved = 0, correct = 0, sec = 0, attempts = 0;
    problems.forEach(p => {
      const a = attemptsOf(p.id);
      if (!a.length) return;
      solved++;
      attempts += a.length;
      a.forEach(x => { sec += x.sec || 0; });
      if (a[a.length - 1].correct) correct++;
    });
    return {
      total: problems.length, solved, correct,
      wrong: solved - correct,
      accuracy: solved ? correct / solved : null,
      avgSec: attempts ? Math.round(sec / attempts) : 0
    };
  }

  // 단원(또는 중단원)별 집계
  function groupStats(problems, keyFn) {
    const map = new Map();
    problems.forEach(p => {
      const k = keyFn(p);
      if (!k) return;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(p);
    });
    return [...map.entries()]
      .map(([key, list]) => Object.assign({ key, problems: list }, statFor(list)))
      .sort((a, b) => a.key.localeCompare(b.key, "ko"));
  }

  // 약점 순위: 시도 기록이 있는 그룹만, 정답률 낮은 순
  function weakGroups(problems, keyFn, minSolved = 3) {
    return groupStats(problems, keyFn)
      .filter(g => g.solved >= minSolved)
      .sort((a, b) => a.accuracy - b.accuracy || b.solved - a.solved);
  }

  function recentDays(n = 14) {
    const out = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const counts = new Map();
    Object.values(db.attempts).flat().forEach(a => {
      const d = new Date(a.ts); d.setHours(0, 0, 0, 0);
      const k = d.getTime();
      if (!counts.has(k)) counts.set(k, { n: 0, c: 0 });
      const v = counts.get(k); v.n++; if (a.correct) v.c++;
    });
    for (let i = n - 1; i >= 0; i--) {
      const t = today.getTime() - i * 864e5;
      const v = counts.get(t) || { n: 0, c: 0 };
      out.push({ date: new Date(t), count: v.n, correct: v.c });
    }
    return out;
  }

  function streakDays() {
    const days = new Set();
    Object.values(db.attempts).flat().forEach(a => {
      const d = new Date(a.ts); d.setHours(0, 0, 0, 0);
      days.add(d.getTime());
    });
    let s = 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let t = today.getTime();
    if (!days.has(t)) t -= 864e5; // 오늘 아직 안 풀었으면 어제부터 센다
    while (days.has(t)) { s++; t -= 864e5; }
    return s;
  }

  /* ---------- 세션 기록 ---------- */
  function pushSession(s) {
    db.sessions.unshift(s);
    db.sessions = db.sessions.slice(0, 50);
    save();
  }

  /* ---------- 내보내기 / 가져오기 ---------- */
  function exportAll() {
    return JSON.stringify({
      version: 1, exportedAt: new Date().toISOString(),
      problems: db.problems, hiddenSeeds: db.hiddenSeeds,
      attempts: db.attempts, bookmarks: db.bookmarks, memos: db.memos,
      sessions: db.sessions, settings: db.settings
    }, null, 2);
  }

  function importAll(json, { merge = true } = {}) {
    const data = typeof json === "string" ? JSON.parse(json) : json;
    if (Array.isArray(data)) return addProblems(data, { replace: true }); // 문제 배열만 들어온 경우
    if (!merge) db = empty();
    if (data.problems) addProblems(data.problems, { replace: true });
    if (data.hiddenSeeds) db.hiddenSeeds = [...new Set(db.hiddenSeeds.concat(data.hiddenSeeds))];
    if (data.attempts) {
      Object.entries(data.attempts).forEach(([k, v]) => {
        db.attempts[k] = merge ? (db.attempts[k] || []).concat(v) : v;
      });
    }
    if (data.bookmarks) db.bookmarks = [...new Set(db.bookmarks.concat(data.bookmarks))];
    if (data.memos) Object.assign(db.memos, data.memos);
    if (data.sessions) db.sessions = data.sessions.concat(db.sessions).slice(0, 50);
    if (data.settings) Object.assign(db.settings, data.settings);
    save();
    return { ok: true };
  }

  function resetAll() { db = empty(); save(); }

  return {
    load, save, get db() { return db; },
    allProblems, getProblem, addProblems, removeProblem,
    recordAttempt, attemptsOf, lastAttempt, isSolved, isWrong, clearAttempts,
    toggleBookmark, isBookmarked, setMemo, getMemo,
    reviewDue, statFor, groupStats, weakGroups, recentDays, streakDays,
    pushSession, exportAll, importAll, resetAll
  };
})();
