/* 단일 HTML 통합본 만들기
 *
 *   node tools/bundle.mjs 출력.html [문제데이터.json ...]
 *
 * exam/index.html 이 참조하는 css·js 를 전부 한 파일 안에 넣는다.
 * 문제 데이터(JSON 배열)를 함께 주면 내장 문제로 구워 넣어,
 * 가져오기 없이 파일만 열면 바로 풀 수 있는 파일이 나온다.
 *
 * 이미지가 HTML 안에 들어가므로 브라우저 저장 공간을 쓰지 않는다.
 * 풀이 기록·오답노트는 그대로 localStorage 에 남는다.
 */
import fs from "fs";
import path from "path";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const out = process.argv[2];
const dataFiles = process.argv.slice(3);

if (!out) {
  console.error("사용법: node tools/bundle.mjs 출력.html [문제데이터.json ...]");
  process.exit(1);
}

let html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

/* css 인라인 */
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) => {
  const css = fs.readFileSync(path.join(ROOT, href), "utf8");
  return `<style>\n${css}\n</style>`;
});

/* js 인라인 — 순서 유지, 문제 데이터는 data.js 다음에 끼워 넣는다 */
const problems = [];
dataFiles.forEach(f => {
  const j = JSON.parse(fs.readFileSync(f, "utf8"));
  problems.push(...(Array.isArray(j) ? j : j.problems || []));
});

html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => {
  const js = fs.readFileSync(path.join(ROOT, src), "utf8");
  let block = `<script>\n${js}\n</script>`;
  if (src.endsWith("data.js") && problems.length) {
    // 내장 샘플을 실제 문제로 교체한다
    block += `\n<script>\nconst BUNDLED_LABEL = "내장 기출 표시";\n` +
      `SEED_PROBLEMS.length = 0;\n` +
      `SEED_PROBLEMS.push(...${JSON.stringify(problems)});\n</script>`;
  }
  return block;
});

fs.writeFileSync(out, html);
const mb = (fs.statSync(out).size / 1048576).toFixed(2);
console.log(`${out}  ${mb}MB  내장 문제 ${problems.length}개`);
