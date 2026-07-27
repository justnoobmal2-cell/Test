/* 문제 이미지 저장소 (IndexedDB)
 *
 * 문항 이미지는 한 장에 30~100KB라 localStorage(약 5MB)에 넣으면 몇 회차 만에 꽉 찬다.
 * 이미지는 IndexedDB에, 나머지 문제 정보는 localStorage에 둔다.
 *
 * 문제의 img 값이 "idb" 면 이미지가 IndexedDB에 문제 id 를 키로 들어 있다는 뜻이다.
 */
const IMG_REF = "idb";

const ImgStore = (() => {
  const DB_NAME = "kice-trainer-img", STORE = "img", VERSION = 1;
  let dbp = null;

  const supported = () => typeof indexedDB !== "undefined" && !!indexedDB;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!supported()) return rej(new Error("IndexedDB 미지원"));
      const r = indexedDB.open(DB_NAME, VERSION);
      r.onupgradeneeded = () => {
        if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE);
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }

  function run(mode, fn) {
    return open().then(db => new Promise((res, rej) => {
      const t = db.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      t.oncomplete = () => res(req ? req.result : undefined);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    }));
  }

  return {
    supported,
    put: (id, dataURL) => run("readwrite", s => s.put(dataURL, id)),
    get: id => run("readonly", s => s.get(id)),
    del: id => run("readwrite", s => s.delete(id)),
    keys: () => run("readonly", s => s.getAllKeys()),
    clear: () => run("readwrite", s => s.clear()),

    /* 저장된 이미지 총 용량(대략) */
    async bytes() {
      const all = await run("readonly", s => s.getAll());
      return (all || []).reduce((a, v) => a + (typeof v === "string" ? v.length : 0), 0);
    },

    /* 문제 목록에서 dataURL 이미지를 IndexedDB 로 옮기고 img 를 "idb" 로 바꾼다.
       onProgress(완료, 전체) 로 진행 상황을 알린다. 실패 건수도 함께 돌려준다. */
    async absorb(list, onProgress) {
      const targets = list.filter(p => typeof p.img === "string" && p.img.startsWith("data:"));
      if (!supported() || !targets.length) return { moved: 0, failed: 0, total: targets.length };
      let moved = 0, failed = 0;
      for (const p of targets) {
        try { await this.put(p.id, p.img); p.img = IMG_REF; moved++; }
        catch (e) { failed++; console.warn("이미지 저장 실패", p.id, e); }
        if (onProgress) onProgress(moved + failed, targets.length);
      }
      return { moved, failed, total: targets.length };
    },

    /* 백업용 — 문제 id 별 이미지를 객체로 뽑는다 */
    async dump(ids) {
      const out = {};
      for (const id of ids) {
        const v = await this.get(id).catch(() => null);
        if (v) out[id] = v;
      }
      return out;
    },

    /* 백업 복원 */
    async restore(map) {
      let n = 0;
      for (const [id, v] of Object.entries(map || {})) {
        try { await this.put(id, v); n++; } catch (e) { /* 개별 실패는 건너뛴다 */ }
      }
      return n;
    }
  };
})();
