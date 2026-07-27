/* 정답표 파싱 · 단원 자동 추천
 * 시험지 한 회차를 통째로 넣을 때 손이 제일 많이 가는 두 가지를 자동화한다.
 */

/* ---------------- 정답표 파싱 ----------------
 * 정답표는 형식이 제각각이라 여러 전략을 돌려 보고
 * "번호가 1부터 촘촘하게 이어지는" 결과를 채택한다.
 *
 * 지원 예시
 *   1 ③ 2 ⑤ 3 ①
 *   1. ③  2. ⑤
 *   1번 3번 2번 5번
 *   1  3
 *   2  5
 *   1)3 2)5
 *   21 12   (단답형: 정답이 두 자리 이상)
 */
const AnswerKey = (() => {
  const CIRCLE = { "①": 1, "②": 2, "③": 3, "④": 4, "⑤": 5 };
  const circleRe = /[①②③④⑤]/;

  const score = list => {
    if (!list.length) return -1;
    const nos = list.map(x => x.no);
    if (new Set(nos).size !== nos.length) return -1;      // 번호 중복이면 실패
    const sorted = [...nos].sort((a, b) => a - b);
    if (sorted[0] !== 1) return list.length * 0.5;         // 1번부터 아니면 감점
    let gaps = 0;
    for (let i = 1; i < sorted.length; i++) if (sorted[i] !== sorted[i - 1] + 1) gaps++;
    return list.length - gaps * 3;
  };

  /* 전략 A: 동그라미 숫자가 있으면 그 앞의 번호와 짝짓는다 */
  function byCircle(text) {
    const out = [];
    const re = /(\d{1,2})\s*(?:번|[.)\]:-])?\s*([①②③④⑤])/g;
    let m;
    while ((m = re.exec(text))) out.push({ no: +m[1], answer: CIRCLE[m[2]], type: "객관식" });
    return out;
  }

  /* 전략 A2: "번호 구분자 정답" 이 한 줄에 여러 개 (1)3 2)5 …) */
  function byInline(text) {
    const out = [];
    const re = /(\d{1,2})\s*(?:번)?\s*[.):\-]\s*([①②③④⑤]|\d{1,4})/g;
    let m;
    while ((m = re.exec(text))) {
      const raw = m[2];
      out.push(CIRCLE[raw] != null
        ? { no: +m[1], answer: CIRCLE[raw], type: "객관식" }
        : /^[1-5]$/.test(raw)
          ? { no: +m[1], answer: Number(raw), type: "객관식" }
          : { no: +m[1], answer: raw, type: "단답형" });
    }
    return out;
  }

  /* 전략 B: "번호 [구분자] 정답" 이 한 줄에 하나씩 (구분자는 공백만이어도 된다) */
  function byLine(text) {
    const out = [];
    text.split(/\r?\n/).forEach(line => {
      const m = line.match(/^\s*(\d{1,2})\s*(?:번)?\s*(?:[.):\-,|]\s*)?(\S.*?)\s*$/);
      if (!m) return;
      const raw = m[2].trim();
      if (CIRCLE[raw]) out.push({ no: +m[1], answer: CIRCLE[raw], type: "객관식" });
      else if (/^[1-5]$/.test(raw)) out.push({ no: +m[1], answer: +raw, type: "객관식" });
      else out.push({ no: +m[1], answer: raw, type: "단답형" });
    });
    return out;
  }

  /* 전략 C: 숫자만 죽 나열된 경우 — 번호·정답이 번갈아 나온다고 본다 */
  function byPairs(text) {
    const toks = text.split(/[\s,|\t]+/).map(t => t.replace(/[.)\]번]/g, "")).filter(Boolean);
    if (toks.length < 4 || toks.length % 2) return [];
    const out = [];
    for (let i = 0; i < toks.length; i += 2) {
      const no = Number(toks[i]);
      const raw = toks[i + 1];
      if (!Number.isInteger(no)) return [];
      if (CIRCLE[raw]) out.push({ no, answer: CIRCLE[raw], type: "객관식" });
      else if (/^[1-5]$/.test(raw)) out.push({ no, answer: Number(raw), type: "객관식" });
      else if (/^\d+$/.test(raw)) out.push({ no, answer: raw, type: "단답형" });
      else out.push({ no, answer: raw, type: "단답형" });
    }
    return out;
  }

  /* 전략 D: 동그라미 정답만 순서대로 나열된 경우 — 1번부터 차례로 붙인다.
   * 숫자만 나열된 것은 "번호 정답" 쌍과 구별할 수 없어 일부러 처리하지 않는다.
   * 정답표를 잘못 읽는 쪽이 못 읽는 쪽보다 훨씬 나쁘다. */
  function byAnswersOnly(text) {
    const t = text.trim();
    if (!/^[①②③④⑤][①②③④⑤\s,|]*$/.test(t)) return [];
    return t.replace(/[\s,|]/g, "").split("")
      .map((c, i) => ({ no: i + 1, answer: CIRCLE[c], type: "객관식" }));
  }

  function parse(text) {
    if (!text || !text.trim()) return [];
    const t = text.trim();
    const cands = [byLine(t), byCircle(t), byInline(t), byPairs(t), byAnswersOnly(t)];
    let best = [], bestScore = -1;
    cands.forEach(c => { const s = score(c); if (s > bestScore) { bestScore = s; best = c; } });
    return best.sort((a, b) => a.no - b.no);
  }

  return { parse, CIRCLE };
})();

/* ---------------- 단원 자동 추천 ----------------
 * 문제 본문에서 단원 이름과 대표 키워드를 찾아 점수를 매긴다.
 * OCR 없이도, 문항 본문을 붙여넣거나 직접 친 경우에 바로 쓸 수 있다.
 */
const AutoTag = (() => {
  /* 단원 이름만으로는 안 잡히는 것들에 대표어를 더한다 */
  const HINTS = {
    /* 통합과학1 */
    "기본량과 단위": ["국제단위계", "SI", "기본량", "단위", "유도량"],
    "시간과 공간": ["시간", "공간", "우주의 규모", "거리"],
    "측정과 측정 표준": ["측정", "표준", "오차", "어림"],
    "신호와 정보": ["신호", "정보", "디지털", "아날로그", "센서"],
    "우주의 시작과 원소의 생성": ["빅뱅", "우주", "수소", "헬륨", "핵융합", "스펙트럼"],
    "지구와 생명체를 구성하는 원소의 생성": ["초신성", "별", "무거운 원소", "철"],
    "원소의 주기성": ["주기율표", "주기", "족", "원자가 전자", "알칼리 금속", "할로젠"],
    "화학 결합과 물질의 성질": ["이온 결합", "공유 결합", "금속 결합", "염화 나트륨", "전기 전도"],
    "지각과 생명체 구성 물질의 규칙성": ["규산염", "사면체", "단백질", "아미노산", "핵산", "규소"],
    "물질의 전기적 성질": ["도체", "부도체", "반도체", "다이오드", "신소재", "초전도"],
    "지구 시스템의 구성과 상호작용": ["지권", "수권", "기권", "생물권", "외권", "상호작용", "탄소 순환"],
    "지권의 변화와 영향": ["판", "지진", "화산", "맨틀", "대류"],
    "중력을 받는 물체의 운동": ["자유 낙하", "중력", "중력가속도", "포물선", "역학적 에너지"],
    "운동과 충돌": ["운동량", "충격량", "충돌", "관성", "가속도", "뉴턴"],
    "생명 시스템과 화학 반응": ["세포", "효소", "물질대사", "동화", "이화"],
    "생명 시스템에서 정보의 흐름": ["DNA", "RNA", "전사", "번역", "유전자", "단백질 합성", "중심 원리"],
    /* 통합과학2 */
    "지질 시대와 화석": ["지질 시대", "화석", "표준 화석", "시상 화석", "고생대", "중생대", "신생대"],
    "진화와 생물다양성": ["진화", "자연 선택", "변이", "종 다양성", "유전적 다양성"],
    "생물다양성의 보전": ["생물다양성", "멸종", "서식지", "보전"],
    "산화와 환원": ["산화", "환원", "전자를 잃", "전자를 얻", "연소", "부식", "광합성"],
    "산과 염기": ["산", "염기", "pH", "지시약", "리트머스", "수소 이온"],
    "중화 반응": ["중화", "중화점", "알짜 이온", "염산", "수산화 나트륨"],
    "생태계의 구성과 평형": ["생태계", "생산자", "소비자", "분해자", "먹이 사슬", "개체군", "평형"],
    "기후 변화와 지구 환경 변화": ["기후 변화", "온실", "지구 온난화", "사막화", "엘니뇨", "해수면"],
    "에너지 전환과 보존": ["에너지 전환", "에너지 보존", "열효율"],
    "전기 에너지의 생산과 수송": ["발전기", "전자기 유도", "변압기", "송전"],
    "발전과 신재생 에너지": ["태양광", "풍력", "수력", "화력", "원자력", "신재생", "연료 전지"],
    "감염병과 병원체": ["감염병", "병원체", "바이러스", "세균", "백신", "항생제"],
    "과학 탐구와 인공지능": ["인공지능", "빅데이터", "AI", "데이터"],
    "로봇과 미래 사회": ["로봇", "자동화", "미래 사회"],
    "과학 기술과 윤리": ["윤리", "과학 기술의 책임", "생명 윤리"],
    /* 통합사회 */
    "시간적 관점": ["시간적 관점", "역사적 배경", "변화 과정"],
    "공간적 관점": ["공간적 관점", "위치", "지역", "분포"],
    "사회적 관점": ["사회적 관점", "제도", "사회 구조"],
    "윤리적 관점": ["윤리적 관점", "가치", "도덕"],
    "행복의 기준": ["행복", "행복의 기준", "삶의 질"],
    "질 높은 정주 환경": ["정주 환경", "주거", "녹지", "기반 시설"],
    "경제적 안정": ["경제적 안정", "소득", "일자리", "고용"],
    "민주주의의 발전": ["민주주의", "참여", "시민 참여"],
    "인간 중심주의": ["인간 중심주의", "도구적 자연관", "베이컨", "데카르트"],
    "생태 중심주의": ["생태 중심주의", "레오폴드", "대지 윤리", "전일론"],
    "문화 상대주의": ["문화 상대주의", "맥락", "문화의 다양성"],
    "자문화 중심주의와 문화 사대주의": ["자문화 중심주의", "문화 사대주의", "국수주의"],
    "다문화 사회의 갈등": ["다문화", "이주민", "샐러드 볼", "용광로"],
    "산업화·도시화에 따른 변화": ["산업화", "도시화", "이촌 향도", "인구 집중"],
    "정보화에 따른 변화와 문제": ["정보화", "사생활 침해", "정보 격차", "가상 공간"],
    "헌법의 기본권": ["기본권", "자유권", "평등권", "사회권", "참정권", "청구권", "인간다운 생활"],
    "인권 보장의 역사": ["인권", "마그나 카르타", "권리 장전", "세계 인권 선언"],
    "분배적 정의의 기준": ["분배", "정의", "업적", "능력", "필요"],
    "자유주의적 정의관": ["자유주의", "노직", "롤스", "개인의 자유"],
    "공동체주의적 정의관": ["공동체주의", "매킨타이어", "샌델", "연대"],
    "공간 불평등": ["공간 불평등", "지역 격차", "수도권"],
    "사회 계층의 양극화": ["양극화", "계층", "빈곤", "소득 불평등"],
    "합리적 선택과 기회비용": ["기회비용", "합리적 선택", "편익", "매몰 비용", "암묵적 비용"],
    "시장 실패와 정부의 역할": ["시장 실패", "독과점", "외부 효과", "공공재"],
    "국제 분업과 무역의 확대": ["무역", "비교 우위", "국제 분업", "자유 무역"],
    "자산 관리의 원칙": ["자산 관리", "안전성", "수익성", "유동성", "예금", "주식", "채권"],
    "생애 주기와 금융 설계": ["생애 주기", "금융 설계", "재무"],
    "세계화의 양상과 문제": ["세계화", "다국적 기업", "문화 획일화"],
    "지역화 전략": ["지역화", "장소 마케팅", "지리적 표시제", "지역 브랜드"],
    "국제 사회의 행위 주체": ["국제기구", "국제 사회", "국가", "NGO"],
    "남북 분단과 통일의 필요성": ["분단", "통일", "남북"],
    "저출산·고령화": ["저출산", "고령화", "인구", "출산율"],
    "자원의 분포와 자원 갈등": ["자원", "석유", "자원 갈등", "에너지 자원"],
    "지속 가능한 발전": ["지속 가능", "SDGs", "환경과 개발"],
    /* 수학 */
    "켤레복소수": ["켤레복소수", "복소수"],
    "복소수와 그 연산": ["복소수", "허수", "i"],
    "나머지정리와 그 활용": ["나머지정리", "나눈 나머지", "인수정리"],
    "판별식": ["판별식", "실근", "허근", "중근"],
    "근과 계수의 관계": ["근과 계수", "두 근의 합", "두 근의 곱"]
  };

  const tokenize = s => String(s).replace(/[^가-힣a-zA-Z0-9]+/g, " ").split(" ").filter(t => t.length > 1);

  /* 후보: 해당 과목/세부과목의 모든 소단원(없으면 중단원) */
  function candidates(subject, track) {
    const out = [];
    Curriculum.tree(subject, track).forEach(u => {
      u.topics.forEach(t => {
        if (t.subs.length) t.subs.forEach(s => out.push({ unit: u.unit, topic: t.topic, sub: s, name: s }));
        else out.push({ unit: u.unit, topic: t.topic, sub: "", name: t.topic });
      });
    });
    return out;
  }

  /* 본문에서 단원을 추정해 점수 높은 순으로 돌려준다 */
  function suggest(text, subject, track, limit = 3) {
    const body = String(text || "");
    if (!body.trim()) return [];
    const scored = candidates(subject, track).map(c => {
      let s = 0;
      if (body.includes(c.name)) s += 10;                    // 단원 이름 그대로 등장
      tokenize(c.name).forEach(t => { if (body.includes(t)) s += 2; });
      (HINTS[c.name] || []).forEach(h => { if (body.includes(h)) s += 4; });
      if (body.includes(c.topic)) s += 3;
      return { ...c, score: s };
    }).filter(c => c.score > 0).sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  /* 시험지 본문을 통째로 붙여넣었을 때 문항 번호로 잘라 낸다.
   * 번호가 1부터 순서대로 이어지는 줄만 문항 시작으로 본다. */
  function split(text) {
    const items = [];
    let cur = null;
    String(text || "").split(/\r?\n/).forEach(line => {
      const m = line.match(/^\s*(\d{1,2})\s*[.)]\s*(.*)$/);
      const no = m ? Number(m[1]) : 0;
      const expected = cur ? cur.no + 1 : 1;
      if (m && (no === expected || (!cur && no === 1))) {
        cur = { no, text: m[2] };
        items.push(cur);
      } else if (cur) {
        cur.text += "\n" + line;
      }
    });
    items.forEach(i => { i.text = i.text.trim(); });
    return items;
  }

  return { suggest, split, HINTS };
})();
