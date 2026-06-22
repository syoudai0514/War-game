// ============================================================
//  game.js — 群衆シューター本体
//  指で部隊を左右に動かし、+/×ゲートで仲間を増やし、全員で撃って
//  敵(数字バリア/ボス)を撃破しながら前進し続ける。
//  描画は render.js、効果音は audio.js。
// ============================================================

import * as C from './config.js';
import { sfx } from './audio.js';
import { load, save } from './storage.js';

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Game {
  constructor() {
    this.W = 360;
    this.H = 640;
    this.hudH = 56;
    this.persist = load();        // { coins, bestDistance, upgrades }
    this.reset();
  }

  reset() {
    const u = this.persist.upgrades;
    this.count = C.startCount(u.start);
    this.weaponLevel = C.startWeapon(u.weapon);
    this.dmgMult = C.dmgMult(u.power);
    this.fireMult = C.fireMult(u.rate);

    this.x = this.W / 2;
    this.targetX = this.W / 2;
    this.fireCd = 0;

    this.obstacles = [];          // ゲート・バリア・ボス・コイン
    this.bullets = [];
    this.particles = [];
    this.floaters = [];

    this.distance = 0;
    this.coinsRun = 0;
    this.level = 1;
    this.spawnIndex = 0;
    this.distSinceSpawn = 0;
    this.state = 'play';          // 'play' | 'over'
    this.shake = 0;
    this.time = 0;
    this.banner = { text: 'GO!', sub: '', life: 1.2, max: 1.2 };
    this.layout();
  }

  setSize(w, h) { this.W = w; this.H = h; this.layout(); }

  layout() {
    this.lane = { x: C.LANE_MARGIN, w: this.W - C.LANE_MARGIN * 2 };
    this.squadY = this.H * C.SQUAD_Y_RATIO;
  }

  // ── 見た目の隊列(向日葵配置)とクラスタ半径 ──
  get shown() { return Math.min(this.count, 40); }
  get clusterRadius() { return 9 * Math.sqrt(this.shown) + 10; }
  offset(i) {
    const a = i * 2.39996323;
    const r = 9 * Math.sqrt(i);
    return { dx: Math.cos(a) * r, dy: Math.sin(a) * r * 0.5 };
  }

  // ───────── 入力(部隊の左右移動)─────────
  steer(x) {
    if (this.state !== 'play') return;
    const r = this.clusterRadius;
    this.targetX = clamp(x, this.lane.x + r * 0.4, this.lane.x + this.lane.w - r * 0.4);
  }

  // ───────── 演算ゲートの生成 ─────────
  makeOp(good) {
    if (good) {
      const s = pick(C.GATE_OPS.good);
      if (s.kind === 'mul') return { kind: 'mul', val: s.val, label: `×${s.val}`, good: true };
      const v = randInt(s.min, s.max) + Math.floor(this.level * 0.6);
      return { kind: 'add', val: v, label: `+${v}`, good: true };
    } else {
      const s = pick(C.GATE_OPS.bad);
      if (s.kind === 'div') return { kind: 'div', val: s.val, label: `÷${s.val}`, good: false };
      const v = randInt(s.min, s.max);
      return { kind: 'sub', val: v, label: `−${v}`, good: false };
    }
  }

  spawnGate() {
    const mid = this.lane.x + this.lane.w / 2;
    let left, right;
    const roll = this.spawnIndex <= 2 ? 0.99 : Math.random(); // 最初の2回は両方プラス
    if (roll < 0.18) {
      // 武器アップゲート(片方が武器UP、もう片方は弱い罠)
      const wpn = { kind: 'weapon', label: '武器UP', good: true, weapon: true };
      const trap = this.makeOp(false);
      if (Math.random() < 0.5) { left = wpn; right = trap; } else { left = trap; right = wpn; }
    } else if (roll < 0.5) {
      left = this.makeOp(true); right = this.makeOp(false);     // 良 vs 悪
      if (Math.random() < 0.5) [left, right] = [right, left];
    } else {
      left = this.makeOp(true); right = this.makeOp(true);       // 良 vs 良(大きい方を狙う)
    }
    this.obstacles.push({
      type: 'gate', y: -60, h: 56,
      halves: [
        { op: left, x0: this.lane.x, x1: mid },
        { op: right, x0: mid, x1: this.lane.x + this.lane.w },
      ],
      applied: false,
    });
  }

  spawnBarrier() {
    const w = this.lane.w * rand(0.34, 0.46);
    const x = rand(this.lane.x + w / 2, this.lane.x + this.lane.w - w / 2);
    const hp = C.barrierHp(this.level);
    this.obstacles.push({ type: 'barrier', y: -50, h: 40, x, w, hp, maxHp: hp, reward: C.barrierReward(this.level), passed: false });
  }

  spawnBoss() {
    const hp = C.bossHp(this.level);
    this.obstacles.push({
      type: 'barrier', boss: true, y: -180, h: 70, speedMul: 0.62,
      x: this.lane.x + this.lane.w / 2, w: this.lane.w,
      hp, maxHp: hp, reward: C.bossReward(this.level), passed: false,
    });
    this.banner = { text: '⚠ BOSS', sub: '撃ち尽くせ!', life: 1.6, max: 1.6 };
    sfx.boss();
  }

  spawnCoins() {
    const n = randInt(3, 5);
    const cx = rand(this.lane.x + 30, this.lane.x + this.lane.w - 30);
    for (let i = 0; i < n; i++) {
      this.obstacles.push({ type: 'coin', y: -20 - i * 26, x: cx, value: 2 });
    }
  }

  director() {
    this.spawnIndex++;
    // 序盤は必ずゲート(まず軍を増やしてから戦わせる)
    if (this.spawnIndex <= 4) { this.spawnGate(); this.level++; return; }
    if (this.spawnIndex % 14 === 0) { this.spawnBoss(); this.level++; return; }
    const r = Math.random();
    if (r < 0.55) this.spawnGate();
    else if (r < 0.85) this.spawnBarrier();
    else this.spawnCoins();
    this.level++;
  }

  // ───────── 毎フレーム更新 ─────────
  update(dt) {
    dt = Math.min(dt, 0.05);
    this.time += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
    if (this.banner) { this.banner.life -= dt; if (this.banner.life <= 0) this.banner = null; }
    this.updateEffects(dt);

    if (this.state !== 'play') return;

    const scroll = Math.min(420, C.BASE_SCROLL + this.level * C.SCROLL_PER_LEVEL);
    this.distance += scroll * dt;

    // 操舵(なめらかに追従)
    this.x += (this.targetX - this.x) * Math.min(1, dt * 14);

    // 障害物スポーン(距離ベースで等間隔)
    this.distSinceSpawn += scroll * dt;
    if (this.distSinceSpawn >= 250) { this.distSinceSpawn = 0; this.director(); }

    this.updateObstacles(dt, scroll);
    this.updateFiring(dt);
    this.updateBullets(dt);
  }

  updateObstacles(dt, scroll) {
    const r = this.clusterRadius;
    for (let k = this.obstacles.length - 1; k >= 0; k--) {
      const o = this.obstacles[k];
      o.y += scroll * (o.speedMul || 1) * dt;

      if (o.type === 'gate') {
        if (!o.applied && o.y >= this.squadY) {
          o.applied = true;
          const half = this.x < o.halves[0].x1 ? o.halves[0] : o.halves[1];
          this.applyOp(half.op);
        }
        if (o.y > this.H + 60) this.obstacles.splice(k, 1);

      } else if (o.type === 'barrier') {
        if (!o.passed && o.y >= this.squadY) {
          o.passed = true;
          const overlap = Math.abs(o.x - this.x) < o.w / 2 + r * 0.7;
          if (o.hp > 0 && (overlap || o.boss)) {
            const lost = Math.min(this.count, o.hp);
            this.count -= lost;
            this.shake = Math.min(16, this.shake + (o.boss ? 14 : 6));
            this.burst(this.x, this.squadY, '#ef4444', 14);
            this.float(this.x, this.squadY - 20, `-${lost}`, '#ef4444', 1.0);
            sfx.boom();
            if (this.count <= 0) { this.count = 0; this.gameOver(); return; }
          }
        }
        if (o.y > this.H + 80) this.obstacles.splice(k, 1);

      } else if (o.type === 'coin') {
        if (o.y >= this.squadY - 6 && Math.abs(o.x - this.x) < r + 14) {
          this.coinsRun += o.value;
          this.float(o.x, o.y, `+${o.value}`, '#fbbf24', 0.7);
          sfx.coin();
          this.obstacles.splice(k, 1);
          continue;
        }
        if (o.y > this.H + 30) this.obstacles.splice(k, 1);
      }
    }
  }

  applyOp(op) {
    if (op.kind === 'weapon') {
      if (this.weaponLevel < C.MAX_WEAPON) {
        this.weaponLevel++;
        this.float(this.x, this.squadY - 30, `${C.weaponAt(this.weaponLevel).name}!`, '#38bdf8', 1.3);
      } else {
        this.coinsRun += 20;
        this.float(this.x, this.squadY - 30, '+20', '#fbbf24', 1.0);
      }
      sfx.weaponUp();
      this.burst(this.x, this.squadY, '#38bdf8', 16);
      return;
    }
    const before = this.count;
    if (op.kind === 'add') this.count += op.val;
    else if (op.kind === 'mul') this.count *= op.val;
    else if (op.kind === 'sub') this.count -= op.val;
    else if (op.kind === 'div') this.count = Math.floor(this.count / op.val);
    this.count = clamp(Math.round(this.count), 0, 99999);
    const diff = this.count - before;
    this.float(this.x, this.squadY - 30, (diff >= 0 ? '+' : '') + diff, op.good ? '#22c55e' : '#ef4444', 1.0);
    if (op.good) { this.burst(this.x, this.squadY, '#22c55e', 10); sfx.gateGood(); }
    else { this.shake = Math.min(12, this.shake + 4); sfx.gateBad(); }
    if (this.count <= 0) { this.count = 0; this.gameOver(); }
  }

  updateFiring(dt) {
    this.fireCd -= dt;
    if (this.fireCd > 0 || this.count <= 0) return;
    const w = C.weaponAt(this.weaponLevel);
    this.fireCd = w.interval / this.fireMult;
    const shooters = Math.min(this.count, C.MAX_VOLLEY);
    // 弾の本数は見た目用に上限。火力は人数に比例させる(大群=高DPS)ため、
    // 1発のダメージを (人数/本数) 倍してボレー合計 = 人数×武器ダメージ にする。
    const dmg = w.dmg * this.dmgMult * (this.count / shooters);
    for (let i = 0; i < shooters; i++) {
      const o = this.offset((Math.random() * this.shown) | 0);
      const bx = this.x + o.dx;
      const by = this.squadY + o.dy - 6;
      for (let s = 0; s < w.spread; s++) {
        const vx = w.spread > 1 ? (s - (w.spread - 1) / 2) * 150 : 0;
        this.bullets.push({ x: bx, y: by, vx, vy: -920, dmg, color: w.spread > 1 ? '#f59e0b' : '#fde047' });
      }
    }
    sfx.shoot();
  }

  updateBullets(dt) {
    for (let k = this.bullets.length - 1; k >= 0; k--) {
      const b = this.bullets[k];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y < -20) { this.bullets.splice(k, 1); continue; }
      // バリアへの命中判定
      let hit = false;
      for (const o of this.obstacles) {
        if (o.type !== 'barrier' || o.hp <= 0) continue;
        if (b.y <= o.y + o.h / 2 && b.y >= o.y - o.h / 2 &&
            b.x >= o.x - o.w / 2 && b.x <= o.x + o.w / 2) {
          o.hp -= b.dmg;
          this.burst(b.x, b.y, o.boss ? '#f59e0b' : '#fca5a5', 3);
          hit = true;
          if (o.hp <= 0) this.destroyBarrier(o);
          break;
        }
      }
      if (hit) this.bullets.splice(k, 1);
    }
  }

  destroyBarrier(o) {
    this.coinsRun += o.reward;
    this.burst(o.x, o.y, o.boss ? '#f59e0b' : '#fca5a5', o.boss ? 40 : 16);
    this.float(o.x, o.y, `+${o.reward}`, '#fbbf24', 0.9);
    if (o.boss) { this.shake = Math.min(16, this.shake + 10); this.banner = { text: 'BOSS撃破!', sub: '', life: 1.2, max: 1.2 }; }
    sfx.boom();
    o.hp = 0;
    const idx = this.obstacles.indexOf(o);
    if (idx >= 0) this.obstacles.splice(idx, 1);
  }

  gameOver() {
    this.state = 'over';
    this.persist.coins += this.coinsRun;
    if (this.distanceM > this.persist.bestDistance) this.persist.bestDistance = this.distanceM;
    save(this.persist);
    sfx.lose();
  }

  // ───────── 強化購入(ゲームオーバー画面から呼ぶ)─────────
  buyUpgrade(key) {
    const lv = this.persist.upgrades[key] || 0;
    if (key === 'weapon' && C.startWeapon(lv) >= C.MAX_WEAPON) { sfx.error(); return false; }
    const cost = C.upgradeCost(lv);
    if (this.persist.coins < cost) { sfx.error(); return false; }
    this.persist.coins -= cost;
    this.persist.upgrades[key] = lv + 1;
    save(this.persist);
    sfx.buy();
    return true;
  }

  get distanceM() { return Math.floor(this.distance / 20); }

  // ───────── エフェクト ─────────
  burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = rand(40, 220);
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.3, 0.6), max: 0.6, color, size: rand(2, 4) });
    }
  }
  float(x, y, text, color, life = 1.0) { this.floaters.push({ x, y, text, color, life, max: life }); }

  updateEffects(dt) {
    for (let k = this.particles.length - 1; k >= 0; k--) {
      const p = this.particles[k];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.vx *= 0.95;
      p.life -= dt; if (p.life <= 0) this.particles.splice(k, 1);
    }
    for (let k = this.floaters.length - 1; k >= 0; k--) {
      const f = this.floaters[k];
      f.y -= 36 * dt; f.life -= dt; if (f.life <= 0) this.floaters.splice(k, 1);
    }
  }
}
