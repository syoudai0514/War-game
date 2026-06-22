// ============================================================
//  render.js — 群衆シューターの描画(状態は game.js が持つ)
// ============================================================

import * as C from './config.js';

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function render(ctx, g) {
  ctx.clearRect(0, 0, g.W, g.H);
  ctx.save();
  if (g.shake > 0) ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);

  drawRoad(ctx, g);
  drawObstacles(ctx, g);
  drawBullets(ctx, g);
  drawSquad(ctx, g);
  drawParticles(ctx, g);
  drawFloaters(ctx, g);
  drawBanner(ctx, g);

  ctx.restore();
}

function drawRoad(ctx, g) {
  const L = g.lane;
  // 背景
  const grad = ctx.createLinearGradient(0, 0, 0, g.H);
  grad.addColorStop(0, '#0a1322');
  grad.addColorStop(1, '#0d1a2e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, g.W, g.H);
  // 走路
  ctx.fillStyle = '#16233b';
  ctx.fillRect(L.x, 0, L.w, g.H);
  // サイドレール
  ctx.fillStyle = '#0e1830';
  ctx.fillRect(L.x - 5, 0, 5, g.H);
  ctx.fillRect(L.x + L.w, 0, 5, g.H);
  // スクロールする横ライン(前進感)
  ctx.strokeStyle = 'rgba(120,160,210,0.10)';
  ctx.lineWidth = 2;
  const off = (g.distance % 60);
  for (let y = off - 60; y < g.H; y += 60) {
    ctx.beginPath(); ctx.moveTo(L.x, y); ctx.lineTo(L.x + L.w, y); ctx.stroke();
  }
}

function drawObstacles(ctx, g) {
  for (const o of g.obstacles) {
    if (o.type === 'gate') drawGate(ctx, g, o);
    else if (o.type === 'barrier') drawBarrier(ctx, o);
    else if (o.type === 'coin') drawCoin(ctx, o);
  }
}

function drawGate(ctx, g, o) {
  const top = o.y - o.h / 2;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const h of o.halves) {
    const good = h.op.good;
    const col = h.op.weapon ? '56,189,248' : good ? '34,197,94' : '239,68,68';
    ctx.fillStyle = `rgba(${col},0.22)`;
    ctx.fillRect(h.x0, top, h.x1 - h.x0, o.h);
    ctx.fillStyle = `rgba(${col},0.9)`;
    ctx.fillRect(h.x0, top, h.x1 - h.x0, 4);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.shadowColor = `rgba(${col},1)`; ctx.shadowBlur = 8;
    ctx.fillText(h.op.label, (h.x0 + h.x1) / 2, o.y + 2);
    ctx.shadowBlur = 0;
  }
  // 中央の仕切り
  const mid = (o.halves[0].x1);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.setLineDash([5, 5]); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(mid, top); ctx.lineTo(mid, top + o.h); ctx.stroke();
  ctx.setLineDash([]);
}

function drawBarrier(ctx, o) {
  const x = o.x - o.w / 2, y = o.y - o.h / 2;
  ctx.fillStyle = o.boss ? '#7c1d1d' : '#5b2330';
  ctx.strokeStyle = o.boss ? '#fbbf24' : '#ef4444';
  ctx.lineWidth = o.boss ? 3 : 2;
  if (o.boss) { ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 16; }
  roundRect(ctx, x, y, o.w, o.h, 8); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  // HP バー
  const ratio = Math.max(0, o.hp / o.maxHp);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(x + 4, y + o.h - 8, o.w - 8, 4);
  ctx.fillStyle = ratio > 0.5 ? '#f87171' : '#fca5a5';
  ctx.fillRect(x + 4, y + o.h - 8, (o.w - 8) * ratio, 4);
  // 残り HP 数字
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `bold ${o.boss ? 28 : 20}px system-ui, sans-serif`;
  ctx.fillText((o.boss ? '👑 ' : '') + Math.ceil(o.hp), o.x, o.y - 2);
}

function drawCoin(ctx, o) {
  ctx.fillStyle = '#fbbf24';
  ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(o.x, o.y, 9, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#92400e';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('¥', o.x, o.y + 1);
}

function drawBullets(ctx, g) {
  for (const b of g.bullets) {
    ctx.fillStyle = b.color;
    ctx.shadowColor = b.color; ctx.shadowBlur = 6;
    roundRect(ctx, b.x - 2, b.y - 6, 4, 10, 2); ctx.fill();
  }
  ctx.shadowBlur = 0;
}

function drawSquad(ctx, g) {
  if (g.count <= 0) return;
  // 隊列(手前ほど後に描く)
  const list = [];
  for (let i = 0; i < g.shown; i++) {
    const o = g.offset(i);
    list.push({ x: g.x + o.dx, y: g.squadY + o.dy });
  }
  list.sort((a, b) => a.y - b.y);
  for (const p of list) drawSoldier(ctx, p.x, p.y);

  // 人数(大きく表示)
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  const cy = g.squadY - g.clusterRadius * 0.6 - 14;
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText(g.count, g.x + 1, cy + 1);
  ctx.fillStyle = '#fff';
  ctx.fillText(g.count, g.x, cy);
}

function drawSoldier(ctx, x, y) {
  // 体
  ctx.fillStyle = '#2563eb';
  roundRect(ctx, x - 4, y - 4, 8, 11, 3); ctx.fill();
  // 頭
  ctx.fillStyle = '#fcd9b6';
  ctx.beginPath(); ctx.arc(x, y - 6, 3.2, 0, Math.PI * 2); ctx.fill();
  // 銃(前方=上に向く)
  ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y - 2); ctx.lineTo(x + 3, y - 9); ctx.stroke();
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
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText(f.text, f.x + 1, f.y + 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function drawBanner(ctx, g) {
  if (!g.banner) return;
  const b = g.banner;
  ctx.globalAlpha = Math.min(1, b.life * 1.6);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.shadowColor = '#000'; ctx.shadowBlur = 10;
  ctx.fillText(b.text, g.W / 2, g.H * 0.34);
  if (b.sub) {
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(b.sub, g.W / 2, g.H * 0.34 + 28);
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}
