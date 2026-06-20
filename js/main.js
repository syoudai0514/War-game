// ============================================================
//  main.js — 起動・ゲームループ・入力・HUD 連携
// ============================================================

import { Game } from './game.js';
import { render } from './render.js';
import { unlock, toggleMute, isMuted } from './audio.js';
import * as C from './config.js';

const canvas = document.getElementById('view');
const ctx = canvas.getContext('2d');
const game = new Game();

// HUD 要素
const el = (id) => document.getElementById(id);
const goldEl = el('gold');
const waveEl = el('wave');
const bestEl = el('best');
const hpFill = el('hp-fill');
const hpText = el('hp-text');
const produceBtn = el('produce');
const produceCost = el('produce-cost');
const restartBtn = el('restart');
const muteBtn = el('mute');

// ── 解像度対応(Retina 対策に devicePixelRatio でスケール)──
function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  game.setSize(rect.width, rect.height);
}
window.addEventListener('resize', resize);

// ── ポインタ座標をキャンバスのローカル座標へ変換 ──
function pos(e) {
  const r = canvas.getBoundingClientRect();
  const t = e.touches ? e.touches[0] : e;
  return { x: t.clientX - r.left, y: t.clientY - r.top };
}

function down(e) { e.preventDefault(); unlock(); const p = pos(e); game.pointerDown(p.x, p.y); }
function move(e) { if (!game.drag) return; e.preventDefault(); const p = pos(e); game.pointerMove(p.x, p.y); }
function up(e)   { e.preventDefault(); const p = pos(e.changedTouches ? { touches: e.changedTouches } : e); game.pointerUp(p.x, p.y); }

canvas.addEventListener('mousedown', down);
canvas.addEventListener('mousemove', move);
window.addEventListener('mouseup', up);
canvas.addEventListener('touchstart', down, { passive: false });
canvas.addEventListener('touchmove', move, { passive: false });
window.addEventListener('touchend', up, { passive: false });

// ── ボタン ──
produceBtn.addEventListener('click', () => { unlock(); game.produce(); });
restartBtn.addEventListener('click', () => { game.reset(); });
muteBtn.addEventListener('click', () => { unlock(); muteBtn.textContent = toggleMute() ? '🔇' : '🔊'; });

// 連打しやすいよう、生産は長押し中も一定間隔で発火
let holdTimer = null;
produceBtn.addEventListener('pointerdown', () => {
  holdTimer = setInterval(() => game.produce(), 220);
});
const stopHold = () => { if (holdTimer) { clearInterval(holdTimer); holdTimer = null; } };
produceBtn.addEventListener('pointerup', stopHold);
produceBtn.addEventListener('pointerleave', stopHold);

// ── HUD 更新 ──
function updateHud() {
  goldEl.textContent = game.gold;
  waveEl.textContent = game.wave || 1;
  bestEl.textContent = game.bestWave;
  const ratio = Math.max(0, game.baseHP / game.baseMaxHP);
  hpFill.style.width = (ratio * 100) + '%';
  hpFill.style.background = ratio > 0.5 ? '#22c55e' : ratio > 0.25 ? '#f59e0b' : '#ef4444';
  hpText.textContent = `${game.baseHP}/${game.baseMaxHP}`;
  produceCost.textContent = game.produceCost;
  const afford = game.gold >= game.produceCost && game.state === 'play';
  produceBtn.classList.toggle('disabled', !afford);
  restartBtn.style.display = game.state === 'over' ? 'block' : 'none';
}

// ── メインループ ──
let last = performance.now();
function loop(now) {
  const dt = (now - last) / 1000;
  last = now;
  game.update(dt);
  render(ctx, game);
  updateHud();
  requestAnimationFrame(loop);
}

// ── スタートゲート(最初の 1 タップで音を有効化)──
el('start-gate').addEventListener('click', () => {
  unlock();
  el('start-gate').classList.add('hidden');
});

resize();
muteBtn.textContent = isMuted() ? '🔇' : '🔊';
requestAnimationFrame(loop);
