/* 2022 개정 교육과정 단원 트리
 *
 * subject(과목) → track(세부 과목) → unit(대단원) → topic(중단원) → sub(소단원)
 *
 * 문제 데이터에 여기 없는 단원 이름이 들어와도 앱은 그대로 인식한다(자유 입력 허용).
 * 교과서 출판사마다 중단원·소단원 이름이 조금씩 다르므로, 학교 진도와 다르면
 * [문제 관리]에서 직접 입력해 쓰면 된다.
 */
const CURRICULUM = {
  "통합사회": {
    grades: ["고1"],
    tracks: {
      "통합사회1": [
        { unit: "통합적 관점", topics: [
          { topic: "인간, 사회, 환경을 바라보는 시각", subs: ["시간적 관점", "공간적 관점", "사회적 관점", "윤리적 관점"] },
          { topic: "통합적 관점의 필요성", subs: ["통합적 관점의 의미", "통합적 관점의 적용"] }
        ]},
        { unit: "행복", topics: [
          { topic: "행복의 의미와 기준", subs: ["행복의 기준", "동서양의 행복론"] },
          { topic: "행복한 삶의 조건", subs: ["질 높은 정주 환경", "경제적 안정", "민주주의의 발전", "도덕적 실천과 성찰"] }
        ]},
        { unit: "자연환경과 인간", topics: [
          { topic: "자연환경과 인간 생활", subs: ["기후와 생활", "지형과 생활"] },
          { topic: "자연에 대한 다양한 관점", subs: ["인간 중심주의", "생태 중심주의", "인간과 자연의 공존"] },
          { topic: "환경 문제와 해결 노력", subs: ["환경 문제의 양상", "정부·기업·시민의 노력"] },
          { topic: "안전한 삶과 시민의 권리", subs: ["자연재해와 안전", "안전을 위한 제도"] }
        ]},
        { unit: "문화와 다양성", topics: [
          { topic: "세계의 다양한 문화권", subs: ["문화권의 형성 요인", "세계의 문화권 구분"] },
          { topic: "문화 변동과 전통문화", subs: ["문화 변동의 요인과 양상", "전통문화의 창조적 계승"] },
          { topic: "문화 상대주의와 보편 윤리", subs: ["자문화 중심주의와 문화 사대주의", "문화 상대주의", "보편 윤리와 그 한계"] },
          { topic: "다문화 사회와 문화적 다양성", subs: ["다문화 사회의 갈등", "다문화 정책과 공존"] }
        ]},
        { unit: "생활공간과 사회", topics: [
          { topic: "산업화와 도시화", subs: ["산업화·도시화에 따른 변화", "도시 문제와 해결"] },
          { topic: "교통·통신의 발달과 정보화", subs: ["교통·통신 발달의 영향", "정보화에 따른 변화와 문제"] },
          { topic: "지역의 공간 변화", subs: ["지역 조사", "지역 변화에 따른 문제와 해결"] }
        ]}
      ],
      "통합사회2": [
        { unit: "인권 보장과 헌법", topics: [
          { topic: "인권의 의미와 변화", subs: ["인권의 의미와 특징", "인권 보장의 역사"] },
          { topic: "헌법의 역할과 시민 참여", subs: ["헌법의 기본권", "인권 보장을 위한 제도", "준법의식과 시민 참여"] },
          { topic: "인권 문제의 양상과 해결", subs: ["국내 인권 문제", "세계 인권 문제"] }
        ]},
        { unit: "사회정의와 불평등", topics: [
          { topic: "정의의 의미와 기준", subs: ["정의의 의미", "분배적 정의의 기준"] },
          { topic: "자유주의와 공동체주의", subs: ["자유주의적 정의관", "공동체주의적 정의관"] },
          { topic: "불평등의 해결과 정의의 실현", subs: ["공간 불평등", "사회 계층의 양극화", "사회적 약자 보호"] }
        ]},
        { unit: "시장경제와 지속 가능 발전", topics: [
          { topic: "자본주의와 합리적 선택", subs: ["자본주의의 전개", "합리적 선택과 기회비용"] },
          { topic: "시장 참여자의 역할", subs: ["시장 실패와 정부의 역할", "기업가 정신과 노동자의 권리", "소비자 주권"] },
          { topic: "국제 무역과 국제 분업", subs: ["국제 분업과 무역의 확대", "무역이 국내 경제에 미치는 영향"] },
          { topic: "자산 관리와 금융 생활", subs: ["자산 관리의 원칙", "생애 주기와 금융 설계"] }
        ]},
        { unit: "세계화와 평화", topics: [
          { topic: "세계화와 지역화", subs: ["세계화의 양상과 문제", "지역화 전략"] },
          { topic: "국제 사회의 갈등과 협력", subs: ["국제 사회의 행위 주체", "국제 갈등과 해결 노력"] },
          { topic: "남북 분단과 동아시아의 평화", subs: ["남북 분단과 통일의 필요성", "동아시아의 역사 갈등"] }
        ]},
        { unit: "미래와 지속가능한 삶", topics: [
          { topic: "세계의 인구와 인구 문제", subs: ["인구 분포와 인구 이동", "저출산·고령화"] },
          { topic: "세계의 자원과 지속 가능한 발전", subs: ["자원의 분포와 자원 갈등", "지속 가능한 발전"] },
          { topic: "미래 지구촌과 나의 삶", subs: ["미래 사회의 변화", "세계 시민으로서의 삶"] }
        ]}
      ]
    }
  },

  "통합과학": {
    grades: ["고1"],
    tracks: {
      "통합과학1": [
        { unit: "과학의 기초", topics: [
          { topic: "과학의 기본량", subs: ["시간과 공간", "기본량과 단위"] },
          { topic: "측정 표준과 정보", subs: ["측정과 측정 표준", "신호와 정보"] }
        ]},
        { unit: "물질과 규칙성", topics: [
          { topic: "자연의 구성 원소", subs: ["우주의 시작과 원소의 생성", "지구와 생명체를 구성하는 원소의 생성"] },
          { topic: "물질의 규칙성과 성질", subs: ["원소의 주기성", "화학 결합과 물질의 성질", "지각과 생명체 구성 물질의 규칙성", "물질의 전기적 성질"] }
        ]},
        { unit: "시스템과 상호작용", topics: [
          { topic: "지구 시스템", subs: ["지구 시스템의 구성과 상호작용", "지권의 변화와 영향"] },
          { topic: "역학 시스템", subs: ["중력을 받는 물체의 운동", "운동과 충돌"] },
          { topic: "생명 시스템", subs: ["생명 시스템과 화학 반응", "생명 시스템에서 정보의 흐름"] }
        ]}
      ],
      "통합과학2": [
        { unit: "변화와 다양성", topics: [
          { topic: "지구 환경 변화와 생물다양성", subs: ["지질 시대와 화석", "진화와 생물다양성", "생물다양성의 보전"] },
          { topic: "화학 변화", subs: ["산화와 환원", "산과 염기", "중화 반응"] }
        ]},
        { unit: "환경과 에너지", topics: [
          { topic: "생태계와 환경 변화", subs: ["생태계의 구성과 평형", "기후 변화와 지구 환경 변화"] },
          { topic: "에너지 전환과 활용", subs: ["에너지 전환과 보존", "전기 에너지의 생산과 수송", "발전과 신재생 에너지"] }
        ]},
        { unit: "과학과 미래 사회", topics: [
          { topic: "과학 기술의 활용", subs: ["감염병과 병원체", "과학 탐구와 인공지능"] },
          { topic: "과학 기술의 발전과 쟁점", subs: ["로봇과 미래 사회", "과학 기술과 윤리"] }
        ]}
      ]
    }
  },

  "수학": {
    grades: ["고1", "고2", "고3"],
    tracks: {
      "공통수학1": [
        { unit: "다항식", topics: [
          { topic: "다항식의 연산", subs: ["다항식의 사칙연산"] },
          { topic: "나머지정리", subs: ["항등식", "나머지정리와 그 활용"] },
          { topic: "인수분해", subs: ["인수분해 공식", "인수분해의 활용"] }
        ]},
        { unit: "방정식과 부등식", topics: [
          { topic: "복소수", subs: ["복소수와 그 연산", "켤레복소수", "i의 거듭제곱"] },
          { topic: "이차방정식", subs: ["판별식", "근과 계수의 관계"] },
          { topic: "이차방정식과 이차함수", subs: ["이차함수의 그래프와 직선", "이차함수의 최대·최소"] },
          { topic: "여러 가지 방정식", subs: ["삼차·사차방정식", "연립이차방정식"] },
          { topic: "여러 가지 부등식", subs: ["연립일차부등식", "이차부등식", "연립이차부등식"] }
        ]},
        { unit: "경우의 수", topics: [
          { topic: "순열과 조합", subs: ["합의 법칙과 곱의 법칙", "순열", "조합"] }
        ]},
        { unit: "행렬", topics: [
          { topic: "행렬과 그 연산", subs: ["행렬의 뜻과 덧셈·뺄셈", "행렬의 곱셈"] }
        ]}
      ],
      "공통수학2": [
        { unit: "도형의 방정식", topics: [
          { topic: "평면좌표", subs: ["두 점 사이의 거리", "내분점과 외분점"] },
          { topic: "직선의 방정식", subs: ["직선의 방정식", "두 직선의 위치 관계", "점과 직선 사이의 거리"] },
          { topic: "원의 방정식", subs: ["원의 방정식", "원과 직선의 위치 관계"] },
          { topic: "도형의 이동", subs: ["평행이동", "대칭이동"] }
        ]},
        { unit: "집합과 명제", topics: [
          { topic: "집합", subs: ["집합의 뜻과 표현", "집합의 연산"] },
          { topic: "명제", subs: ["명제와 조건", "충분조건과 필요조건", "절대부등식"] }
        ]},
        { unit: "함수와 그래프", topics: [
          { topic: "함수", subs: ["함수의 뜻", "합성함수", "역함수"] },
          { topic: "유리함수와 무리함수", subs: ["유리함수", "무리함수"] }
        ]}
      ],
      "대수": [
        { unit: "지수함수와 로그함수", topics: [
          { topic: "지수와 로그", subs: ["거듭제곱근", "지수법칙", "로그의 뜻과 성질", "상용로그"] },
          { topic: "지수함수와 로그함수", subs: ["지수함수의 그래프", "로그함수의 그래프", "지수·로그 방정식과 부등식"] }
        ]},
        { unit: "삼각함수", topics: [
          { topic: "삼각함수의 뜻", subs: ["호도법", "삼각함수의 정의와 성질"] },
          { topic: "삼각함수의 그래프", subs: ["삼각함수의 그래프", "삼각방정식과 삼각부등식"] },
          { topic: "삼각함수의 활용", subs: ["사인법칙", "코사인법칙", "삼각형의 넓이"] }
        ]},
        { unit: "수열", topics: [
          { topic: "등차수열과 등비수열", subs: ["등차수열", "등비수열"] },
          { topic: "수열의 합", subs: ["시그마의 성질", "여러 가지 수열의 합"] },
          { topic: "수학적 귀납법", subs: ["귀납적 정의", "수학적 귀납법"] }
        ]}
      ],
      "미적분Ⅰ": [
        { unit: "함수의 극한과 연속", topics: [
          { topic: "함수의 극한", subs: ["극한의 뜻", "극한값의 계산"] },
          { topic: "함수의 연속", subs: ["연속의 뜻", "최대·최소 정리와 사잇값 정리"] }
        ]},
        { unit: "미분", topics: [
          { topic: "미분계수와 도함수", subs: ["미분계수", "도함수", "미분법"] },
          { topic: "도함수의 활용", subs: ["접선의 방정식", "함수의 증가와 감소", "극대·극소와 그래프", "방정식과 부등식에의 활용", "속도와 가속도"] }
        ]},
        { unit: "적분", topics: [
          { topic: "부정적분과 정적분", subs: ["부정적분", "정적분", "정적분으로 정의된 함수"] },
          { topic: "정적분의 활용", subs: ["넓이", "속도와 거리"] }
        ]}
      ],
      "확률과 통계": [
        { unit: "경우의 수", topics: [
          { topic: "여러 가지 순열", subs: ["원순열", "중복순열", "같은 것이 있는 순열"] },
          { topic: "중복조합과 이항정리", subs: ["중복조합", "이항정리"] }
        ]},
        { unit: "확률", topics: [
          { topic: "확률의 뜻과 활용", subs: ["시행과 사건", "확률의 덧셈정리", "여사건의 확률"] },
          { topic: "조건부확률", subs: ["조건부확률", "확률의 곱셈정리", "사건의 독립과 종속", "독립시행의 확률"] }
        ]},
        { unit: "통계", topics: [
          { topic: "확률분포", subs: ["이산확률분포", "이항분포", "정규분포"] },
          { topic: "통계적 추정", subs: ["표본평균의 분포", "모평균의 추정"] }
        ]}
      ]
    }
  },

  "국어": {
    grades: ["고1", "고2", "고3"],
    tracks: {
      "공통국어": [
        { unit: "독서", topics: [
          { topic: "독서의 방법", subs: ["사실적 읽기", "추론적 읽기", "비판적 읽기"] },
          { topic: "분야별 독서", subs: ["인문·예술", "사회·문화", "과학·기술", "주제 통합"] }
        ]},
        { unit: "문학", topics: [
          { topic: "현대 문학", subs: ["현대시", "현대소설", "극·수필"] },
          { topic: "고전 문학", subs: ["고전시가", "고전산문"] },
          { topic: "갈래 복합", subs: ["갈래 복합"] }
        ]},
        { unit: "화법과 언어", topics: [
          { topic: "화법", subs: ["대화와 토론", "발표와 연설"] },
          { topic: "문법", subs: ["음운", "단어", "문장", "담화", "국어사"] }
        ]},
        { unit: "작문과 매체", topics: [
          { topic: "작문", subs: ["작문의 과정", "글의 유형별 쓰기"] },
          { topic: "매체", subs: ["매체 언어의 특성", "매체 자료의 수용과 생산"] }
        ]}
      ]
    }
  },

  "영어": {
    grades: ["고1", "고2", "고3"],
    tracks: {
      "공통영어": [
        { unit: "읽기", topics: [
          { topic: "대의 파악", subs: ["목적", "심경·분위기", "주장", "요지", "주제", "제목", "함축 의미"] },
          { topic: "세부 정보", subs: ["내용 일치", "도표", "실용문"] },
          { topic: "간접 쓰기", subs: ["무관한 문장", "글의 순서", "문장 삽입", "요약문"] },
          { topic: "추론", subs: ["빈칸 추론"] },
          { topic: "어법·어휘", subs: ["어법", "어휘"] },
          { topic: "장문 독해", subs: ["1지문 2문항", "1지문 3문항"] }
        ]},
        { unit: "듣기", topics: [
          { topic: "듣기", subs: ["짧은 대화", "담화 목적·주제", "세부 정보", "복합 문항"] }
        ]}
      ]
    }
  }
};

/* 시행 — 고1은 내신(중간·기말)과 학력평가가 주력이라 함께 둔다 */
const EXAMS = [
  { key: "1학기 중간", org: "내신" },
  { key: "1학기 기말", org: "내신" },
  { key: "2학기 중간", org: "내신" },
  { key: "2학기 기말", org: "내신" },
  { key: "3월", org: "교육청" },
  { key: "5월", org: "교육청" },
  { key: "6월", org: "평가원" },
  { key: "7월", org: "교육청" },
  { key: "9월", org: "평가원" },
  { key: "10월", org: "교육청" },
  { key: "11월", org: "교육청" },
  { key: "수능", org: "평가원" }
];

const GRADES = ["고1", "고2", "고3"];
const LEVELS = [{ v: 1, label: "하" }, { v: 2, label: "중하" }, { v: 3, label: "중" }, { v: 4, label: "중상" }, { v: 5, label: "상" }];

const Curriculum = {
  subjects(grade) {
    const all = Object.keys(CURRICULUM);
    if (!grade) return all;
    return all.filter(s => (CURRICULUM[s].grades || []).includes(grade));
  },
  tracks(subject) {
    const s = CURRICULUM[subject];
    return s ? Object.keys(s.tracks) : [];
  },
  /* [{unit, topics:[{topic, subs:[]}]}] */
  tree(subject, track) {
    const s = CURRICULUM[subject];
    if (!s) return [];
    if (track) return s.tracks[track] || [];
    return Object.values(s.tracks).flat();
  },
  units(subject, track) {
    return this.tree(subject, track).map(u => u.unit);
  },
  topics(subject, unit) {
    for (const s of Object.values(CURRICULUM)) {
      if (subject && CURRICULUM[subject] !== s) continue;
      for (const list of Object.values(s.tracks)) {
        const u = list.find(x => x.unit === unit);
        if (u) return u.topics.map(t => t.topic);
      }
    }
    return [];
  },
  subs(subject, unit, topic) {
    for (const s of Object.values(CURRICULUM)) {
      if (subject && CURRICULUM[subject] !== s) continue;
      for (const list of Object.values(s.tracks)) {
        const u = list.find(x => x.unit === unit);
        const t = u && u.topics.find(x => x.topic === topic);
        if (t) return t.subs.slice();
      }
    }
    return [];
  },
  trackOfUnit(subject, unit) {
    const s = CURRICULUM[subject];
    if (!s) return "";
    for (const [track, list] of Object.entries(s.tracks)) {
      if (list.some(u => u.unit === unit)) return track;
    }
    return "";
  },
  orgOf(examKey) {
    const e = EXAMS.find(e => e.key === examKey);
    return e ? e.org : "";
  },
  levelLabel(v) {
    const l = LEVELS.find(l => l.v === Number(v));
    return l ? l.label : "";
  }
};
