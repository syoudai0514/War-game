// ============================================================
//  storage.js — コイン・ベスト記録・永続強化を localStorage に保存
// ============================================================

const KEY = 'mergewar.save.v2';

const DEFAULT = {
  coins: 0,
  bestDistance: 0,
  upgrades: { start: 0, power: 0, rate: 0, weapon: 0 },
};

export function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (!d) return { ...DEFAULT, upgrades: { ...DEFAULT.upgrades } };
    return {
      coins: d.coins || 0,
      bestDistance: d.bestDistance || 0,
      upgrades: { ...DEFAULT.upgrades, ...(d.upgrades || {}) },
    };
  } catch {
    return { ...DEFAULT, upgrades: { ...DEFAULT.upgrades } };
  }
}

export function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* プライベートモード等で書けなくても無視 */
  }
}
