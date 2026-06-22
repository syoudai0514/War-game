// ============================================================
//  config.js — 群衆シューターのチューニング(武器・ゲート・敵・経済)
//  ここの数値をいじるだけでバランス調整できる。
// ============================================================

// ── レイアウト ──
export const LANE_MARGIN = 18;        // 走路の左右余白
export const SQUAD_Y_RATIO = 0.80;    // 部隊の画面内Y位置(下寄り)
export const BASE_SCROLL = 165;       // 前進スピード(px/秒, 下方向スクロール)
export const SCROLL_PER_LEVEL = 2.2;  // 障害物を越えるごとの加速

// ── 武器(レベルが上がるほど高火力・速射)──
//   dmg     : 弾1発のダメージ
//   interval: 連射間隔(秒)
//   spread  : 一度に出る弾の本数(ショットガン用)
export const WEAPONS = [
  { icon: '🔫', name: 'ピストル',     dmg: 1,  interval: 0.42, spread: 1 },
  { icon: '🔫', name: 'サブマシンガン', dmg: 1,  interval: 0.26, spread: 1 },
  { icon: '🪖', name: 'ライフル',     dmg: 2,  interval: 0.24, spread: 1 },
  { icon: '💥', name: 'ショットガン', dmg: 2,  interval: 0.34, spread: 3 },
  { icon: '🦾', name: 'ミニガン',     dmg: 3,  interval: 0.11, spread: 1 },
  { icon: '🚀', name: 'バズーカ',     dmg: 8,  interval: 0.30, spread: 1 },
  { icon: '🛸', name: 'レーザー',     dmg: 6,  interval: 0.09, spread: 1 },
];
export const MAX_WEAPON = WEAPONS.length - 1;
export const weaponAt = (lv) => WEAPONS[Math.max(0, Math.min(lv, MAX_WEAPON))];

// 同時に飛ばす弾の最大本数(大群でも処理を軽く保つ。火力は本数で表現)
export const MAX_VOLLEY = 16;

// ── ゲートの演算 ──
//   kind: 'add' | 'mul' | 'sub' | 'div' | 'weapon'
export const GATE_OPS = {
  good: [
    { kind: 'add', min: 4, max: 16 },
    { kind: 'add', min: 8, max: 24 },
    { kind: 'mul', val: 2 },
  ],
  bad: [
    { kind: 'sub', min: 5, max: 20 },
    { kind: 'div', val: 2 },
  ],
};

// ── 敵(数字バリア)の強さを「障害物レベル」から計算 ──
export function barrierHp(level) {
  return Math.round(10 * Math.pow(1.16, level));
}
export function barrierReward(level) {
  return Math.round(5 + level * 1.5);
}

// ボス(一定距離ごと)
export function bossHp(level) {
  return barrierHp(level) * 5;
}
export function bossReward(level) {
  return barrierReward(level) * 10;
}

// ── 経済(永続強化)──
export const START_GOLD = 0;
// 強化レベルから効果を出すヘルパー
export const startCount = (lv) => 4 + lv * 2;          // 開始兵士数
export const dmgMult    = (lv) => 1 + lv * 0.25;       // 火力倍率
export const fireMult   = (lv) => 1 + lv * 0.15;       // 連射倍率
export const startWeapon = (lv) => lv;                 // 開始武器レベル

// 強化コスト(レベルが上がるほど高い)
export const upgradeCost = (lv) => 40 + lv * 60;

// 強化メニュー定義(storage の upgrades キーと対応)
export const UPGRADES = [
  { key: 'start',  icon: '👥', name: '開始兵士',  desc: '+2人' },
  { key: 'power',  icon: '💪', name: '火力',      desc: 'ダメージ+25%' },
  { key: 'rate',   icon: '⚡', name: '連射',      desc: '発射速度+15%' },
  { key: 'weapon', icon: '🔫', name: '開始武器',  desc: '初期武器を強化' },
];
