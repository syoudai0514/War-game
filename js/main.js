// ============================================================
//  main.js — 起動・ゲームループ・操作・HUD・強化ショップ連携
// ============================================================

import { Game } from './game.js';
import { render } from './render.js';
import { unlock, toggleMute, isMuted } from './audio.js';
import * as C from './config.js';

const canvas = document.getElementById('view');
const ctx = canvas.getContext('2d');
const game = new Game();

const el = (id) => document.getElementById(id);

// ── 解像度対応 ──
function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  game.setSize(rect.width, rect.height);
}
window.addEventListener('resize', resize);

// ── 操作: ドラッグで部隊を左右に動かす(Pointer Events で統一)──
function posX(e) { return e.clientX - canvas.getBoundingClientRect().left; }
let steering = false;
canvas.addEventListener('pointerdown', (e) => {
  unlock();
  canvas.setPointerCapture?.(e.pointerId);
  steering = true;
  game.steer(posX(e));
});
canvas.addEventListener('pointermove', (e) => { if (steering) game.steer(posX(e)); });
canvas.addEventListener('pointerup', () => { steering = false; });
canvas.addEventListener('pointercancel', () => { steering = false; });

// ── ミュート ──
el('mute').addEventListener('click', (e) => {
  e.stopPropagation();
  unlock();
  el('mute').textContent = toggleMute() ? '🔇' : '🔊';
});

// ── スタートゲート ──
el('start-gate').addEventListener('click', () => {
  unlock();
  el('start-gate').classList.add('hidden');
});

// ── 強化ショップ(ゲームオーバー画面)──
const shop = el('shop');
function buildShop() {
  shop.innerHTML = '';
  for (const up of C.UPGRADES) {
    const lv = game.persist.upgrades[up.key] || 0;
    const maxed = up.key === 'weapon' && lv >= C.MAX_WEAPON;
    const cost = C.upgradeCost(lv);
    const btn = document.createElement('button');
    btn.className = 'shop-item';
    btn.innerHTML =
      `<span class="si-ic">${up.icon}</span>` +
      `<span class="si-main"><b>${up.name}</b><small>Lv.${lv} ・ ${up.desc}</small></span>` +
      `<span class="si-cost">${maxed ? 'MAX' : '🪙' + cost}</span>`;
    const afford = !maxed && game.persist.coins >= cost;
    btn.classList.toggle('locked', !afford);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (game.buyUpgrade(up.key)) { buildShop(); refreshResult(); }
    });
    shop.appendChild(btn);
  }
}
function refreshResult() {
  el('ov-coins').textContent = game.persist.coins;
}

let wasOver = false;
function showOverlay() {
  el('ov-dist').textContent = game.distanceM;
  el('ov-best').textContent = game.persist.bestDistance;
  el('ov-coins').textContent = game.persist.coins;
  el('ov-earned').textContent = game.coinsRun;
  buildShop();
  el('overlay').classList.remove('hidden');
}

el('restart').addEventListener('click', (e) => {
  e.stopPropagation();
  el('overlay').classList.add('hidden');
  game.reset();
});

// ── HUD 更新 ──
function updateHud() {
  el('dist').textContent = game.distanceM;
  el('coins').textContent = game.persist.coins + game.coinsRun;
  const w = C.weaponAt(game.weaponLevel);
  el('wpn-ic').textContent = w.icon;
  el('wpn-name').textContent = w.name;
}

// ── メインループ ──
let last = performance.now();
function loop(now) {
  const dt = (now - last) / 1000;
  last = now;
  game.update(dt);
  render(ctx, game);
  updateHud();

  if (game.state === 'over' && !wasOver) { wasOver = true; showOverlay(); }
  if (game.state === 'play' && wasOver) wasOver = false;

  // 操作ヒントは最初だけ
  if (game.distance > 120) el('hint').classList.add('hidden');

  requestAnimationFrame(loop);
}

resize();
el('mute').textContent = isMuted() ? '🔇' : '🔊';
requestAnimationFrame(loop);
