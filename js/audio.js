// ============================================================
//  audio.js — WebAudio で軽い効果音(音声ファイル不要)
//  最初のユーザー操作で unlock() を必ず呼ぶこと。
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

function noise(dur, gain = 0.12, cutoff = 1200) {
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
  filt.frequency.value = cutoff;
  src.connect(filt).connect(g).connect(ctx.destination);
  src.start(t0);
  src.stop(t0 + dur);
}

// 連射音は鳴らしすぎると重い/うるさいので間引く
let lastShot = 0;
export const sfx = {
  shoot() {
    const now = ctx ? ctx.currentTime : 0;
    if (now - lastShot < 0.05) return;
    lastShot = now;
    tone(720 + Math.random() * 120, 0.04, 'square', 0.018, -240);
  },
  gateGood() { tone(523, 0.07, 'triangle', 0.09); setTimeout(() => tone(784, 0.1, 'triangle', 0.09), 60); },
  gateBad()  { tone(200, 0.18, 'sawtooth', 0.09, -90); },
  weaponUp() { tone(660, 0.08, 'square', 0.08); setTimeout(() => tone(990, 0.1, 'square', 0.08), 70); setTimeout(() => tone(1320, 0.12, 'square', 0.08), 150); },
  hit()      { noise(0.06, 0.04, 2000); },
  boom()     { noise(0.22, 0.14, 900); tone(120, 0.25, 'sawtooth', 0.1, -60); },
  coin()     { tone(880, 0.05, 'triangle', 0.05); setTimeout(() => tone(1320, 0.06, 'triangle', 0.05), 40); },
  boss()     { tone(90, 0.6, 'sawtooth', 0.13, -30); },
  lose()     { tone(440, 0.2, 'sawtooth', 0.1, -200); setTimeout(() => tone(220, 0.45, 'sawtooth', 0.1, -120), 180); },
  buy()      { tone(587, 0.06, 'square', 0.07); setTimeout(() => tone(880, 0.08, 'square', 0.07), 55); },
  error()    { tone(170, 0.12, 'square', 0.06); },
};
