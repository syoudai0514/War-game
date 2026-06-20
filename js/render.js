// ============================================================
//  render.js — Canvas にゲーム画面を描く(状態は game.js が持つ)
// ============================================================

import * as C from './config.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function render(ctx, g) {
  const { W, H } = g;
  ctx.clearRect(0, 0, W, H);

  // 画面揺れ
  ctx.save();
  if (g.shake > 0) ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);

  drawBackground(ctx, g);
  drawLane(ctx, g);
  drawEnemies(ctx, g);
  drawProjectiles(ctx, g);
  drawBoard(ctx, g);
  drawParticles(ctx, g);
  drawFloaters(ctx, g);
  drawDrag(ctx, g);
  drawBanner(ctx, g);

  ctx.restore();

  // 警告フラッシュ(揺れの影響を受けない)
  if (g.flash > 0) {
    ctx.fillStyle = `rgba(239,68,68,${g.flash * 0.5})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (g.state === 'over') drawGameOver(ctx, g);
}

function drawBackground(ctx, g) {
  const grad = ctx.createLinearGradient(0, 0, 0, g.H);
  grad.addColorStop(0, '#0b1220');
  grad.addColorStop(0.55, '#111a2e');
  grad.addColorStop(1, '#0a1018');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, g.W, g.H);
}

function drawLane(ctx, g) {
  const L = g.laneRect;
  // 戦場の床
  ctx.fillStyle = 'rgba(120,140,170,0.05)';
  roundRect(ctx, L.x, L.y, L.w, L.h, 10); ctx.fill();
  // 細い格子(奥行き感)
  ctx.strokeStyle = 'rgba(120,160,200,0.06)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    const y = L.y + (L.h * i) / 6;
    ctx.beginPath(); ctx.moveTo(L.x, y); ctx.lineTo(L.x + L.w, y); ctx.stroke();
  }
  // ベース防衛ライン
  const by = g.baseLine;
  ctx.strokeStyle = 'rgba(96,165,250,0.55)';
  ctx.setLineDash([8, 6]);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(L.x, by); ctx.lineTo(L.x + L.w, by); ctx.stroke();
  ctx.setLineDash([]);
}

function drawEnemies(ctx, g) {
  for (const e of g.enemies) {
    ctx.save();
    ctx.translate(e.x, e.y);
    // 被弾フラッシュ
    const flash = e.hit > 0;
    // 体
    ctx.shadowColor = e.boss ? '#f59e0b' : '#ef4444';
    ctx.shadowBlur = e.boss ? 18 : 8;
    ctx.fillStyle = flash ? '#ffffff' : (e.boss ? '#7c2d12' : '#3b1d2a');
    ctx.beginPath(); ctx.arc(0, 0, e.r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = e.boss ? '#fbbf24' : '#ef4444';
    ctx.lineWidth = 2; ctx.stroke();
    // 顔(絵文字)
    ctx.font = `${e.r * 1.3}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(e.boss ? '👹' : '👾', 0, 1);
    ctx.restore();

    // HP バー
    const w = e.r * 2, h = 4, ratio = Math.max(0, e.hp / e.maxHp);
    const bx = e.x - w / 2, by = e.y - e.r - 9;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(bx, by, w, h);
    ctx.fillStyle = ratio > 0.5 ? '#22c55e' : ratio > 0.25 ? '#f59e0b' : '#ef4444';
    ctx.fillRect(bx, by, w * ratio, h);
  }
}

function drawProjectiles(ctx, g) {
  for (const p of g.projectiles) {
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.shadowBlur = 0;
}

function drawBoard(ctx, g) {
  const cell = g.cell;
  for (let i = 0; i < C.CELLS; i++) {
    const c = g.cellCenter(i);
    const x = c.x - cell / 2, y = c.y - cell / 2;
    // セル枠
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, x + 3, y + 3, cell - 6, cell - 6, 10);
    ctx.fill(); ctx.stroke();

    const u = g.board[i];
    if (!u) continue;
    if (g.drag && g.drag.from === i) continue; // ドラッグ中の駒は後で描く
    drawUnit(ctx, c.x, c.y, cell, u, g);
  }
}

function drawUnit(ctx, cx, cy, cell, u, g) {
  const t = C.TIERS[u.tier];
  const pop = u.pop > 0 ? 1 + u.pop * 0.25 : 1;
  const s = (cell - 12) * pop;
  ctx.save();
  ctx.translate(cx, cy);
  // 本体(ティア色のグラデ)
  const grad = ctx.createLinearGradient(0, -s / 2, 0, s / 2);
  grad.addColorStop(0, t.color);
  grad.addColorStop(1, shade(t.color, -0.35));
  ctx.fillStyle = grad;
  ctx.shadowColor = t.color; ctx.shadowBlur = u.tier >= 5 ? 16 : 6;
  roundRect(ctx, -s / 2, -s / 2, s, s, 12); ctx.fill();
  ctx.shadowBlur = 0;
  // アイコン
  ctx.font = `${s * 0.5}px serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(t.icon, 0, s * 0.02);
  // ティア番号バッジ
  const r = s * 0.18;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath(); ctx.arc(s / 2 - r - 2, -s / 2 + r + 2, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${r * 1.2}px system-ui, sans-serif`;
  ctx.fillText(u.tier + 1, s / 2 - r - 2, -s / 2 + r + 3);
  ctx.restore();
}

function drawDrag(ctx, g) {
  if (!g.drag) return;
  const d = g.drag;
  // 合体できる相手をハイライト
  const to = g.cellAt(d.x, d.y);
  if (to >= 0 && to !== d.from) {
    const b = g.board[to];
    const c = g.cellCenter(to);
    const ok = b && b.tier === d.tier && d.tier < C.MAX_TIER;
    ctx.strokeStyle = ok ? '#fbbf24' : 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 3;
    roundRect(ctx, c.x - g.cell / 2 + 3, c.y - g.cell / 2 + 3, g.cell - 6, g.cell - 6, 10);
    ctx.stroke();
  }
  drawUnit(ctx, d.x, d.y, g.cell * 1.05, g.board[d.from], g);
}

function drawParticles(ctx, g) {
  for (const p of g.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFloaters(ctx, g) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const f of g.floaters) {
    ctx.globalAlpha = Math.min(1, f.life / f.max + 0.2);
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText(f.text, f.x + 1, f.y + 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function drawBanner(ctx, g) {
  if (!g.banner || g.state === 'over') return;
  const b = g.banner;
  const a = Math.min(1, b.life * 1.5);
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.shadowColor = '#000'; ctx.shadowBlur = 8;
  ctx.fillText(b.text, g.W / 2, g.laneRect.y + g.laneRect.h * 0.4);
  if (b.sub) {
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(b.sub, g.W / 2, g.laneRect.y + g.laneRect.h * 0.4 + 30);
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function drawGameOver(ctx, g) {
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(0, 0, g.W, g.H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.fillText('GAME OVER', g.W / 2, g.H * 0.36);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(`到達ウェーブ ${g.wave}`, g.W / 2, g.H * 0.36 + 44);
  ctx.fillStyle = '#fbbf24';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText(`ベスト記録: WAVE ${g.bestWave}`, g.W / 2, g.H * 0.36 + 74);
}

// 色を明暗させる小ヘルパー(#rrggbb 前提)
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, r + r * amt));
  gg = Math.max(0, Math.min(255, gg + gg * amt));
  b = Math.max(0, Math.min(255, b + b * amt));
  return `rgb(${r | 0},${gg | 0},${b | 0})`;
}
