// ============================================================
//  config.js — ゲームのチューニング(数値・兵種・敵)を 1 か所に集約
//  ここの数字をいじるだけでバランス調整できるようにしてある。
// ============================================================

// ── 兵種ティア(0 が最弱、合体するたびに 1 つ上へ進化していく)──
//   icon : 盤面に描く絵文字
//   name : 表示名(日本語)
//   color: そのティアの色(盤面のコマ・弾の色に使う)
//   dmg  : 1 発のダメージ(ティアが上がるほど指数的に強くなる)
//   cd   : 連射間隔(秒)。小さいほど速射
export const TIERS = [
  { icon: '🔫', name: 'ライフル兵',   color: '#9ca3af', dmg: 3,    cd: 0.85 },
  { icon: '🪖', name: '重機関銃',     color: '#84cc16', dmg: 6,    cd: 0.55 },
  { icon: '💣', name: '擲弾兵',       color: '#22c55e', dmg: 12,   cd: 0.80 },
  { icon: '🚙', name: '装甲車',       color: '#06b6d4', dmg: 24,   cd: 0.70 },
  { icon: '🛡️', name: '戦車',         color: '#3b82f6', dmg: 48,   cd: 0.65 },
  { icon: '🚀', name: 'ロケット砲',   color: '#8b5cf6', dmg: 95,   cd: 0.75 },
  { icon: '🦾', name: 'ガトリング',   color: '#d946ef', dmg: 150,  cd: 0.30 },
  { icon: '✈️', name: '戦闘機',       color: '#f43f5e', dmg: 380,  cd: 0.55 },
  { icon: '🛸', name: 'レーザー砲',   color: '#f59e0b', dmg: 820,  cd: 0.45 },
  { icon: '☄️', name: '軌道砲',       color: '#fbbf24', dmg: 2200, cd: 0.60 },
];

export const MAX_TIER = TIERS.length - 1;

// ── 盤面(マージ用グリッド)──
export const COLS = 4;
export const ROWS = 4;
export const CELLS = COLS * ROWS;

// ── 経済 ──
export const START_GOLD = 60;
export const BASE_PRODUCE_COST = 8;     // 生産の基本コスト
export const PRODUCE_COST_STEP = 1;     // 生産するたびに少し高くなる量
export const MERGE_BONUS = 2;           // 合体するともらえるご褒美ゴールド

// ── ベース(自陣)耐久 ──
export const BASE_HP = 100;

// ── 敵 1 体ぶんの強さをウェーブ番号から計算するヘルパー ──
//   ウェーブが進むほど HP・速度・報酬が伸びていく。
export function enemyStats(wave) {
  return {
    hp: Math.round(14 * Math.pow(1.28, wave - 1)),
    speed: 26 + wave * 1.1,             // px/秒(下方向へ進む)
    reward: Math.round(3 + wave * 0.8),
    damage: 8,                          // ベースに到達したとき与えるダメージ
  };
}

// ボスウェーブ(5 の倍数)で出るボスの強さ
export function bossStats(wave) {
  const e = enemyStats(wave);
  return {
    hp: e.hp * 14,
    speed: e.speed * 0.55,
    reward: e.reward * 12,
    damage: 40,
    boss: true,
  };
}

// そのウェーブで出てくる雑魚の数
export function waveCount(wave) {
  return 5 + Math.floor(wave * 1.6);
}

export const isBossWave = (wave) => wave % 5 === 0;

// 生産コスト(これまでに作った数で少しずつ上がる)
export function produceCost(produced) {
  return BASE_PRODUCE_COST + Math.floor(produced / 3) * PRODUCE_COST_STEP;
}
