// ============================================================
//  game.js — ゲーム本体(状態・盤面マージ・戦闘・ウェーブ・経済)
//  描画は render.js、効果音は audio.js に分離してある。
// ============================================================

import * as C from './config.js';
import { sfx } from './audio.js';
import { getBestWave, setBestWave } from './storage.js';

const rand = (a, b) => a + Math.random() * (b - a);

export class Game {
  constructor() {
    this.W = 360;
    this.H = 640;
    // DOM オーバーレイ(HUD/ボタン)に譲るぶんの余白
    this.hudH = 58;     // 上(ゴールド・ウェーブ・耐久バー)
    this.ctrlH = 92;    // 下(生産ボタン)
    this.reset();
  }

  reset() {
    this.gold = C.START_GOLD;
    this.baseHP = C.BASE_HP;
    this.baseMaxHP = C.BASE_HP;
    this.wave = 0;
    this.produced = 0;
    this.bestWave = getBestWave();

    this.board = new Array(C.CELLS).fill(null);  // 各セル: null か { tier }
    this.cooldown = new Array(C.CELLS).fill(0);   // 各セルの発射クールタイム

    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.floaters = [];

    this.spawnQueue = 0;
    this.spawnTimer = 0;
    this.bossPending = false;
    this.intermission = 2.2;   // 開始前のカウントダウン
    this.banner = null;        // 画面中央に出す告知 { text, sub, life }
    this.showBanner('WAVE 1', 'マージして迎え撃て!');

    this.state = 'play';       // 'play' | 'over'
    this.shake = 0;
    this.drag = null;          // ドラッグ中の駒 { from, x, y, tier }
    this.flash = 0;            // ゴールド不足などの警告フラッシュ
    this.time = 0;
    this.layout();
  }

  // 画面サイズに合わせて盤面・レーンの矩形を計算
  setSize(w, h) { this.W = w; this.H = h; this.layout(); }

  layout() {
    const m = 12;
    const maxCell = (this.W - m * 2) / C.COLS;
    const cell = Math.min(maxCell, (this.H * 0.46) / C.ROWS);
    const boardW = cell * C.COLS;
    const boardH = cell * C.ROWS;
    const boardX = (this.W - boardW) / 2;
    const boardBottom = this.H - this.ctrlH - m;
    const boardTop = boardBottom - boardH;
    this.cell = cell;
    this.boardRect = { x: boardX, y: boardTop, w: boardW, h: boardH };
    this.laneRect = { x: m, y: this.hudH, w: this.W - m * 2, h: boardTop - this.hudH };
    this.baseLine = boardTop - 4;
  }

  cellCenter(i) {
    const col = i % C.COLS, row = Math.floor(i / C.COLS);
    return {
      x: this.boardRect.x + col * this.cell + this.cell / 2,
      y: this.boardRect.y + row * this.cell + this.cell / 2,
    };
  }

  cellAt(x, y) {
    const b = this.boardRect;
    if (x < b.x || x > b.x + b.w || y < b.y || y > b.y + b.h) return -1;
    const col = Math.floor((x - b.x) / this.cell);
    const row = Math.floor((y - b.y) / this.cell);
    return row * C.COLS + col;
  }

  // ───────── 生産(下のボタンから呼ぶ)─────────
  get produceCost() { return C.produceCost(this.produced); }

  produce() {
    if (this.state !== 'play') return;
    const cost = this.produceCost;
    const empties = [];
    for (let i = 0; i < C.CELLS; i++) if (!this.board[i]) empties.push(i);
    if (empties.length === 0) { this.warn(); this.showBanner('盤面が満杯!', '合体してスペースを空けよう', 1.1); return; }
    if (this.gold < cost) { this.warn(); return; }
    this.gold -= cost;
    this.produced++;
    const i = empties[(Math.random() * empties.length) | 0];
    this.board[i] = { tier: 0, pop: 1 };
    const c = this.cellCenter(i);
    this.burst(c.x, c.y, C.TIERS[0].color, 8);
    sfx.produce();
  }

  warn() { this.flash = 0.3; sfx.error(); }

  // ───────── ドラッグ操作(マージ)─────────
  pointerDown(x, y) {
    if (this.state !== 'play') return;
    const i = this.cellAt(x, y);
    if (i >= 0 && this.board[i]) this.drag = { from: i, x, y, tier: this.board[i].tier };
  }

  pointerMove(x, y) {
    if (this.drag) { this.drag.x = x; this.drag.y = y; }
  }

  pointerUp(x, y) {
    if (!this.drag) return;
    const from = this.drag.from;
    const to = this.cellAt(x, y);
    this.drag = null;
    if (to < 0 || to === from || !this.board[from]) return;

    const a = this.board[from], b = this.board[to];
    if (!b) {
      // 空きセルへ移動
      this.board[to] = a; this.board[from] = null;
    } else if (a.tier === b.tier && a.tier < C.MAX_TIER) {
      // 合体 → 進化!
      this.board[to] = { tier: a.tier + 1, pop: 1 };
      this.board[from] = null;
      this.cooldown[to] = 0;
      this.gold += C.MERGE_BONUS;
      const c = this.cellCenter(to);
      const col = C.TIERS[a.tier + 1].color;
      this.burst(c.x, c.y, col, 16 + a.tier * 2);
      this.float(c.x, c.y - this.cell * 0.3, '進化!', col);
      this.float(c.x, c.y + 6, `+${C.MERGE_BONUS}`, '#fbbf24', 0.9);
      if (a.tier + 1 >= 5) this.shake = Math.min(10, this.shake + 5);
      sfx.merge();
    } else {
      // 違う兵種 → 入れ替え
      this.board[to] = a; this.board[from] = b;
    }
  }

  // ───────── ウェーブ管理 ─────────
  startWave(wave) {
    this.wave = wave;
    this.spawnQueue = C.waveCount(wave);
    this.spawnTimer = 0.3;
    this.bossPending = C.isBossWave(wave);
    sfx.wave();
    this.showBanner(`WAVE ${wave}`, C.isBossWave(wave) ? '⚠ ボス出現!' : '');
    if (C.isBossWave(wave)) sfx.boss();
  }

  spawnEnemy(boss = false) {
    const s = boss ? C.bossStats(this.wave) : C.enemyStats(this.wave);
    const r = boss ? this.cell * 0.55 : this.cell * 0.28;
    this.enemies.push({
      x: rand(this.laneRect.x + r, this.laneRect.x + this.laneRect.w - r),
      y: this.laneRect.y + r,
      hp: s.hp, maxHp: s.hp,
      speed: s.speed, reward: s.reward, damage: s.damage,
      r, boss, hit: 0,
    });
  }

  // ───────── 毎フレーム更新 ─────────
  update(dt) {
    dt = Math.min(dt, 0.05); // タブ復帰時の巨大 dt を抑制
    this.time += dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
    if (this.banner) { this.banner.life -= dt; if (this.banner.life <= 0) this.banner = null; }
    for (const b of this.board) if (b && b.pop > 0) b.pop = Math.max(0, b.pop - dt * 4);

    this.updateParticles(dt);

    if (this.state !== 'play') return;

    // ウェーブ進行
    if (this.intermission > 0) {
      this.intermission -= dt;
      if (this.intermission <= 0) this.startWave(this.wave + 1);
    } else {
      if (this.bossPending && this.spawnQueue <= C.waveCount(this.wave) - 1) {
        // ボスはウェーブ序盤に 1 体だけ
        this.spawnEnemy(true);
        this.bossPending = false;
      }
      if (this.spawnQueue > 0) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
          this.spawnEnemy(false);
          this.spawnQueue--;
          this.spawnTimer = Math.max(0.35, 1.1 - this.wave * 0.03);
        }
      } else if (this.enemies.length === 0) {
        // ウェーブクリア → 報酬 → 次へ
        const bonus = 6 + this.wave * 2;
        this.gold += bonus;
        this.float(this.W / 2, this.laneRect.y + this.laneRect.h / 2, `WAVE CLEAR +${bonus}`, '#fbbf24', 1.4);
        this.intermission = 2.4;
        sfx.coin();
      }
    }

    this.updateEnemies(dt);
    this.updateGuns(dt);
    this.updateProjectiles(dt);
  }

  updateEnemies(dt) {
    for (let k = this.enemies.length - 1; k >= 0; k--) {
      const e = this.enemies[k];
      e.y += e.speed * dt;
      if (e.hit > 0) e.hit -= dt;
      if (e.y + e.r >= this.baseLine) {
        // ベースに到達 → ダメージ
        this.baseHP -= e.damage;
        this.shake = Math.min(14, this.shake + (e.boss ? 12 : 4));
        this.burst(e.x, this.baseLine, '#ef4444', e.boss ? 24 : 10);
        this.enemies.splice(k, 1);
        sfx.hitBase();
        if (this.baseHP <= 0) { this.baseHP = 0; this.gameOver(); return; }
      }
    }
  }

  updateGuns(dt) {
    // 一番ベースに近い敵(y が最大)を狙う
    let target = null;
    for (const e of this.enemies) if (!target || e.y > target.y) target = e;
    for (let i = 0; i < C.CELLS; i++) {
      const u = this.board[i];
      if (!u) continue;
      this.cooldown[i] -= dt;
      if (this.cooldown[i] <= 0 && target) {
        const t = C.TIERS[u.tier];
        const c = this.cellCenter(i);
        this.projectiles.push({
          x: c.x, y: c.y - this.cell * 0.3,
          target, dmg: t.dmg, color: t.color, r: 3 + u.tier * 0.6,
        });
        this.cooldown[i] = t.cd;
        if (u.tier >= 6 && Math.random() < 0.3) sfx.shoot();
        else if (u.tier < 6) sfx.shoot();
      }
    }
  }

  updateProjectiles(dt) {
    const SPEED = 760;
    for (let k = this.projectiles.length - 1; k >= 0; k--) {
      const p = this.projectiles[k];
      const e = p.target;
      if (!e || e.hp <= 0 || this.enemies.indexOf(e) === -1) { this.projectiles.splice(k, 1); continue; }
      const dx = e.x - p.x, dy = e.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const step = SPEED * dt;
      if (d <= step + e.r) {
        // 命中
        e.hp -= p.dmg; e.hit = 0.12;
        this.burst(e.x, e.y, p.color, 4);
        this.projectiles.splice(k, 1);
        if (e.hp <= 0) this.killEnemy(e);
      } else {
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
      }
    }
  }

  killEnemy(e) {
    const idx = this.enemies.indexOf(e);
    if (idx === -1) return;
    this.enemies.splice(idx, 1);
    this.gold += e.reward;
    this.burst(e.x, e.y, e.boss ? '#f59e0b' : '#fca5a5', e.boss ? 30 : 12);
    this.float(e.x, e.y, `+${e.reward}`, '#fbbf24', 0.8);
    sfx.kill();
    if (e.boss) { sfx.coin(); this.shake = Math.min(14, this.shake + 8); }
  }

  gameOver() {
    this.state = 'over';
    setBestWave(this.wave);
    this.bestWave = getBestWave();
    this.showBanner('GAME OVER', `到達ウェーブ ${this.wave}`, 9999);
    sfx.gameover();
    // Android 版のみ: たまに全画面広告(Web では未定義なので無視される)
    window.MergeWarAds?.maybeShowInterstitial?.();
  }

  // ───────── エフェクト ─────────
  burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = rand(40, 220);
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.3, 0.7), max: 0.7, color, size: rand(2, 5) });
    }
  }

  float(x, y, text, color, life = 1.0) {
    this.floaters.push({ x, y, text, color, life, max: life });
  }

  showBanner(text, sub, life = 1.6) { this.banner = { text, sub, life, max: life }; }

  updateParticles(dt) {
    for (let k = this.particles.length - 1; k >= 0; k--) {
      const p = this.particles[k];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 220 * dt; p.vx *= 0.96;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(k, 1);
    }
    for (let k = this.floaters.length - 1; k >= 0; k--) {
      const f = this.floaters[k];
      f.y -= 30 * dt; f.life -= dt;
      if (f.life <= 0) this.floaters.splice(k, 1);
    }
  }
}
