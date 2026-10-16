/** Extra synthesised sounds for the Fuzzy Crossing world levels (trains, lightning, lasers, teleports, ice). Uses the game's audio context. */
import { ctx } from './sound';

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.12, slide = 0, delay = 0): void {
  const a = ctx();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}
function noise(dur: number, from: number, to: number, vol: number, delay = 0, type: BiquadFilterType = 'bandpass'): void {
  const a = ctx();
  if (!a) return;
  const t = a.currentTime + delay;
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = type;
  f.Q.value = 0.9;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.05, dur * 0.2));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
}
/** a little throttle so a row of warnings doesn't stack up */
const last: Record<string, number> = {};
const once = (k: string, gap: number) => { const n = performance.now(); if ((last[k] ?? 0) + gap > n) return false; last[k] = n; return true; };

export const wsfx = {
  /** level-crossing bell: ding-ding */
  bell: () => { if (!once('bell', 380)) return; tone(1320, 0.18, 'triangle', 0.06); tone(1760, 0.12, 'sine', 0.04, 0, 0.01); },
  /** the train horn (also when a train gets you) */
  horn: () => { if (!once('horn', 900)) return; tone(311, 0.7, 'sawtooth', 0.035); tone(370, 0.7, 'sawtooth', 0.03); noise(0.6, 300, 120, 0.05); },
  /** a train rumbling past */
  rumble: () => { if (!once('rumble', 1200)) return; noise(1.1, 180, 60, 0.07, 0, 'lowpass'); },
  zap: () => { tone(1800, 0.18, 'square', 0.05, -1500); noise(0.25, 4000, 900, 0.06); },
  thunder: () => { if (!once('thunder', 500)) return; noise(1.4, 400, 50, 0.12, 0, 'lowpass'); noise(0.12, 3000, 800, 0.05); },
  crackle: () => { if (!once('crackle', 300)) return; noise(0.15, 5000, 2500, 0.03); },
  laser: () => { if (!once('laser', 250)) return; tone(880, 0.12, 'sawtooth', 0.025, 220); },
  teleport: () => { [523, 784, 1047, 1568].forEach((f, i) => tone(f, 0.1, 'sine', 0.06, 200, i * 0.04)); },
  slide: () => { if (!once('slide', 120)) return; noise(0.16, 2400, 1200, 0.025, 0, 'highpass'); },
  bump: () => tone(180, 0.09, 'sine', 0.09, -60),
  unlock: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.14, 'triangle', 0.07, 0, i * 0.07)); },
  siren: () => { if (!once('siren', 1400)) return; for (let i = 0; i < 2; i++) { tone(960, 0.3, 'triangle', 0.025, 240, i * 0.6); tone(1200, 0.3, 'triangle', 0.025, -240, i * 0.6 + 0.3); } },
  splashSoft: () => { if (!once('wave', 600)) return; noise(0.5, 1200, 300, 0.03); },
  win: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'triangle', 0.08, 0, i * 0.09)); },
  star: (i: number) => { tone(988 + i * 220, 0.2, 'triangle', 0.07); tone(1976 + i * 440, 0.18, 'sine', 0.03, 0, 0.02); },
};
