# 모두의 문제집 📚

수학뿐 아니라 여러 과목을 풀 수 있는 가벼운 학습용 웹앱입니다.
**과목 선택 → 단원 선택 → 문제 풀이 → 결과 → 복습** 흐름만 깔끔하게 담았습니다.

별도 서버 없이 **GitHub Pages**에 그대로 올려서 동작합니다.

## 구조

```
index.html          # 앱 (화면/로직 전부)
data/
  subjects.json     # 과목 목록  ← 과목을 추가하려면 여기에
  math.json         # 과목별 문제 데이터  ← 문제를 채워넣는 곳
  korean.json
  english.json
  science.json
  social.json
  history.json
```

- **문제 데이터** = `data/*.json` (직접 편집 후 commit/push 하면 곧 반영)
- **학습 기록**(푼 문제·정답률·복습 목록) = 브라우저 `localStorage`에 자동 저장

## 문제 추가 방법

해당 과목 JSON의 `questions` 배열에 항목을 추가합니다.

```jsonc
{
  "id": "m4",                      // 과목 내에서 고유한 값
  "topic": "항등식",               // units 안의 topic 이름과 일치
  "difficulty": "중",              // 상/중/하 (자유)
  "tags": ["기출"],                // 표시용 태그 (없으면 [])
  "type": "short",                 // "short"(주관식) 또는 "choice"(객관식)
  "question": "문제 내용...",       // 줄바꿈은 \n
  "choices": ["보기1", "보기2"],   // type이 "choice"일 때만
  "answer": "정답",                // 채점 기준 (공백/대소문자 무시 비교)
  "explanation": "해설..."         // 선택
}
```

새 과목은 `data/subjects.json`에 한 줄 추가하고 같은 형식의 JSON 파일을 만들면 됩니다.

## 로컬에서 보기

`file://` 로 직접 열면 JSON 로딩(fetch)이 막힙니다. 간단한 서버로 여세요:

```bash
python3 -m http.server 8000   # http://localhost:8000
```

## 배포 (GitHub Pages)

저장소 **Settings → Pages → Branch** 를 이 브랜치로 지정하면 끝.
