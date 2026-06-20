// ============================================================
//  audio.js — WebAudio で軽い効果音を鳴らす(音声ファイル不要)
//  ブラウザ/スマホは最初のタップまで音を出せないので、unlock() を
//  最初のユーザー操作で必ず呼ぶこと。
// ============================================================

let ctx = null;
let muted = false;

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

export function setMuted(v) { muted = v; }
export function isMuted() { return muted; }
export function toggleMute() { muted = !muted; return muted; }

// 単純なトーンを鳴らす内部ヘルパー
function tone(freq, dur, type = 'square', gain = 0.08, slide = 0) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur);
}

// ノイズ(爆発用)
function noise(dur, gain = 0.12) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = 1200;
  src.connect(filt).connect(g).connect(ctx.destination);
  src.start(t0);
  src.stop(t0 + dur);
}

export const sfx = {
  shoot()    { tone(620 + Math.random() * 80, 0.05, 'square', 0.025, -180); },
  merge()    { tone(440, 0.08, 'triangle', 0.1); setTimeout(() => tone(660, 0.1, 'triangle', 0.1), 70); },
  produce()  { tone(330, 0.06, 'square', 0.06, 120); },
  coin()     { tone(880, 0.05, 'triangle', 0.05); setTimeout(() => tone(1320, 0.06, 'triangle', 0.05), 40); },
  kill()     { noise(0.12, 0.06); },
  boss()     { tone(110, 0.5, 'sawtooth', 0.12, -40); },
  hitBase()  { tone(160, 0.18, 'sawtooth', 0.12, -80); },
  wave()     { tone(523, 0.12, 'triangle', 0.08); setTimeout(() => tone(784, 0.16, 'triangle', 0.08), 110); },
  gameover() { tone(440, 0.2, 'sawtooth', 0.1, -200); setTimeout(() => tone(220, 0.4, 'sawtooth', 0.1, -120), 180); },
  error()    { tone(180, 0.12, 'square', 0.06); },
};
