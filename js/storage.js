// ============================================================
//  storage.js — localStorage にベスト記録などを保存する薄いラッパー
// ============================================================

const KEY = 'mergewar.save.v1';

export function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* プライベートモード等で書けなくても無視 */
  }
}

export function getBestWave() {
  return load().bestWave || 0;
}

export function setBestWave(wave) {
  const data = load();
  if (wave > (data.bestWave || 0)) {
    data.bestWave = wave;
    save(data);
  }
}
