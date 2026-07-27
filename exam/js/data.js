/* 기본 내장 문제 (샘플)
 *
 * 실제 평가원/교육청 기출 지문·문항은 저작권이 있어 이 저장소에 담지 않는다.
 * 아래 문제들은 앱 동작 확인용으로 직접 만든 연습 문항이며(source: "샘플"),
 * 실제 기출은 [문제 관리] 화면에서 JSON/CSV로 불러오거나 직접 추가한다.
 *
 * 문제 객체 스키마
 *  id        고유 ID (문자열)
 *  year      시행 연도 (숫자)
 *  exam      시행 ("3월"|"4월"|"6월"|"7월"|"9월"|"10월"|"수능" 등)
 *  org       주관 ("평가원"|"교육청")
 *  grade     학년 ("고1"|"고2"|"고3"|"N수")
 *  subject   과목 ("수학"|"국어"|"영어" ...)
 *  track     선택과목 ("공통"|"미적분"|"확률과 통계" ...)
 *  unit      대단원
 *  topic     중단원
 *  no        문항 번호
 *  points    배점
 *  type      "객관식" | "단답형"
 *  choices   객관식 선택지 문자열 배열 (없으면 ①~⑤ 번호만 표시)
 *  answer    객관식이면 1~5, 단답형이면 정답 문자열/숫자
 *  text      문제 본문 (선택)
 *  img       문제 이미지 URL 또는 dataURL (선택)
 *  solution  해설 텍스트 (선택)
 *  solutionImg 해설 이미지 (선택)
 *  level     체감 난이도 1~5 (선택)
 *  source    출처 메모 (선택)
 */
const SEED_PROBLEMS = [
  {
    id: "sample-math-001", year: 2025, exam: "샘플", org: "샘플", grade: "고3",
    subject: "수학", track: "공통", unit: "수학Ⅰ", topic: "지수와 로그",
    no: 1, points: 2, type: "객관식", level: 1, source: "샘플",
    text: "log₂ 8 + log₃ 9 의 값은?",
    choices: ["3", "4", "5", "6", "7"], answer: 3,
    solution: "log₂8 = 3, log₃9 = 2 이므로 합은 5."
  },
  {
    id: "sample-math-002", year: 2025, exam: "샘플", org: "샘플", grade: "고3",
    subject: "수학", track: "공통", unit: "수학Ⅰ", topic: "등차수열과 등비수열",
    no: 2, points: 3, type: "단답형", level: 1, source: "샘플",
    text: "첫째항이 3이고 공차가 4인 등차수열 {aₙ} 에 대하여 a₁₀ 의 값을 구하시오.",
    answer: "39",
    solution: "a₁₀ = 3 + (10-1)×4 = 3 + 36 = 39."
  },
  {
    id: "sample-math-003", year: 2025, exam: "샘플", org: "샘플", grade: "고3",
    subject: "수학", track: "공통", unit: "수학Ⅰ", topic: "삼각함수",
    no: 3, points: 3, type: "객관식", level: 2, source: "샘플",
    text: "θ가 제2사분면의 각이고 sin θ = 3/5 일 때, tan θ 의 값은?",
    choices: ["-4/3", "-3/4", "3/4", "4/3", "5/4"], answer: 2,
    solution: "제2사분면이므로 cos θ = -4/5. tan θ = sin θ / cos θ = (3/5)/(-4/5) = -3/4."
  },
  {
    id: "sample-math-004", year: 2025, exam: "샘플", org: "샘플", grade: "고3",
    subject: "수학", track: "공통", unit: "수학Ⅰ", topic: "수열의 합",
    no: 4, points: 3, type: "단답형", level: 2, source: "샘플",
    text: "∑(k=1 부터 10까지) (2k − 1) 의 값을 구하시오.",
    answer: "100",
    solution: "2·(10·11/2) − 10 = 110 − 10 = 100. (홀수 10개의 합 = 10² = 100)"
  },
  {
    id: "sample-math-005", year: 2025, exam: "샘플", org: "샘플", grade: "고3",
    subject: "수학", track: "공통", unit: "수학Ⅱ", topic: "함수의 극한",
    no: 5, points: 2, type: "객관식", level: 1, source: "샘플",
    text: "lim(x→2) (x² − 4)/(x − 2) 의 값은?",
    choices: ["1", "2", "3", "4", "5"], answer: 4,
    solution: "(x²−4)/(x−2) = x+2 (x≠2) 이므로 극한값은 4."
  },
  {
    id: "sample-math-006", year: 2025, exam: "샘플", org: "샘플", grade: "고3",
    subject: "수학", track: "공통", unit: "수학Ⅱ", topic: "미분계수와 도함수",
    no: 6, points: 3, type: "단답형", level: 2, source: "샘플",
    text: "f(x) = x³ − 3x² + 2 일 때, f′(3) 의 값을 구하시오.",
    answer: "9",
    solution: "f′(x) = 3x² − 6x 이므로 f′(3) = 27 − 18 = 9."
  },
  {
    id: "sample-math-007", year: 2025, exam: "샘플", org: "샘플", grade: "고3",
    subject: "수학", track: "공통", unit: "수학Ⅱ", topic: "정적분",
    no: 7, points: 3, type: "단답형", level: 2, source: "샘플",
    text: "∫(0부터 2까지) 3x² dx 의 값을 구하시오.",
    answer: "8",
    solution: "[x³] (0→2) = 8."
  },
  {
    id: "sample-math-008", year: 2025, exam: "샘플", org: "샘플", grade: "고3",
    subject: "수학", track: "확률과 통계", unit: "확률과 통계", topic: "순열과 조합",
    no: 8, points: 2, type: "객관식", level: 1, source: "샘플",
    text: "서로 다른 5명 중에서 3명을 뽑는 경우의 수는?",
    choices: ["5", "10", "15", "20", "25"], answer: 2,
    solution: "₅C₃ = 10."
  },
  {
    id: "sample-math-009", year: 2025, exam: "샘플", org: "샘플", grade: "고3",
    subject: "수학", track: "확률과 통계", unit: "확률과 통계", topic: "확률의 뜻과 활용",
    no: 9, points: 3, type: "객관식", level: 2, source: "샘플",
    text: "서로 다른 두 개의 주사위를 던질 때, 나온 두 눈의 수의 합이 5일 확률은?",
    choices: ["1/12", "1/9", "1/6", "2/9", "1/4"], answer: 2,
    solution: "합이 5인 경우는 (1,4)(2,3)(3,2)(4,1) 4가지. 4/36 = 1/9."
  },
  {
    id: "sample-math-010", year: 2025, exam: "샘플", org: "샘플", grade: "고3",
    subject: "수학", track: "확률과 통계", unit: "확률과 통계", topic: "조건부확률",
    no: 10, points: 3, type: "객관식", level: 2, source: "샘플",
    text: "두 사건 A, B 에 대하여 P(A) = 0.5, P(A∩B) = 0.2 일 때, P(B|A) 의 값은?",
    choices: ["0.1", "0.2", "0.3", "0.4", "0.5"], answer: 4,
    solution: "P(B|A) = P(A∩B)/P(A) = 0.2/0.5 = 0.4."
  },
  {
    id: "sample-math-011", year: 2025, exam: "샘플", org: "샘플", grade: "고3",
    subject: "수학", track: "미적분", unit: "미적분", topic: "수열의 극한",
    no: 11, points: 3, type: "단답형", level: 2, source: "샘플",
    text: "lim(n→∞) (2n² + 3n)/(n² + 1) 의 값을 구하시오.",
    answer: "2",
    solution: "분자·분모를 n² 으로 나누면 (2 + 3/n)/(1 + 1/n²) → 2."
  },
  {
    id: "sample-math-012", year: 2025, exam: "샘플", org: "샘플", grade: "고3",
    subject: "수학", track: "미적분", unit: "미적분", topic: "급수",
    no: 12, points: 3, type: "단답형", level: 2, source: "샘플",
    text: "∑(n=1 부터 ∞까지) (1/2)ⁿ 의 값을 구하시오.",
    answer: "1",
    solution: "첫째항 1/2, 공비 1/2 인 등비급수이므로 (1/2)/(1 − 1/2) = 1."
  },
  {
    id: "sample-math-013", year: 2025, exam: "샘플", org: "샘플", grade: "고3",
    subject: "수학", track: "기하", unit: "기하", topic: "이차곡선",
    no: 13, points: 3, type: "객관식", level: 2, source: "샘플",
    text: "포물선 y² = 8x 의 초점의 좌표는?",
    choices: ["(1, 0)", "(2, 0)", "(4, 0)", "(0, 2)", "(0, 4)"], answer: 2,
    solution: "y² = 4px 에서 4p = 8, p = 2 이므로 초점은 (2, 0)."
  },
  {
    id: "sample-math-014", year: 2025, exam: "샘플", org: "샘플", grade: "고3",
    subject: "수학", track: "기하", unit: "기하", topic: "이차곡선",
    no: 14, points: 4, type: "단답형", level: 3, source: "샘플",
    text: "타원 x²/25 + y²/9 = 1 의 두 초점 사이의 거리를 구하시오.",
    answer: "8",
    solution: "c² = 25 − 9 = 16, c = 4 이므로 두 초점 사이의 거리는 2c = 8."
  },
  {
    id: "sample-kor-001", year: 2025, exam: "샘플", org: "샘플", grade: "고3",
    subject: "국어", track: "언어와 매체", unit: "언어와 매체", topic: "음운",
    no: 35, points: 2, type: "객관식", level: 2, source: "샘플",
    text: "'국물'이 [궁물]로 발음될 때 일어나는 음운 변동의 유형으로 옳은 것은?",
    choices: ["교체", "탈락", "첨가", "축약", "탈락과 첨가"], answer: 1,
    solution: "'ㄱ'이 뒤의 비음 'ㅁ'의 영향으로 'ㅇ'으로 바뀌는 비음화로, 음운의 교체에 해당한다."
  },
  {
    id: "sample-eng-001", year: 2025, exam: "샘플", org: "샘플", grade: "고3",
    subject: "영어", track: "공통", unit: "읽기", topic: "어법",
    no: 29, points: 3, type: "객관식", level: 2, source: "샘플",
    text: "다음 빈칸에 들어갈 말로 가장 적절한 것은?\n\nThe number of students who applied for the program ______ increasing every year.",
    choices: ["is", "are", "were", "have been", "being"], answer: 1,
    solution: "'the number of + 복수명사'는 단수 취급하므로 단수 동사 is 가 적절하다."
  }
];
