/** Tiny Web Audio synth for the game's blips. */
import { accounts } from '../core/account';

let ac: AudioContext | null = null;
function ctx(): AudioContext | null {
  if (!accounts.current?.settings.sound) return null;
  try {
    ac ??= new AudioContext();
    if (ac.state === 'suspended') void ac.resume();
    return ac;
  } catch { return null; }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.15, slide = 0, delay = 0): void {
  const a = ctx();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  hop: () => tone(520, 0.08, 'triangle', 0.08, 220),
  collect: () => { tone(880, 0.09, 'sine', 0.12); tone(1320, 0.12, 'sine', 0.1, 0, 0.07); },
  gold: () => { [660, 880, 1100, 1320].forEach((f, i) => tone(f, 0.12, 'triangle', 0.1, 0, i * 0.06)); },
  splash: () => tone(300, 0.35, 'sawtooth', 0.06, -220),
  crash: () => { tone(160, 0.3, 'square', 0.08, -100); tone(90, 0.3, 'sawtooth', 0.06, -40, 0.03); },
  home: () => { [523, 659, 784].forEach((f, i) => tone(f, 0.16, 'triangle', 0.11, 0, i * 0.08)); },
  level: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'square', 0.06, 0, i * 0.1)); },
  over: () => { [392, 330, 262].forEach((f, i) => tone(f, 0.25, 'triangle', 0.1, 0, i * 0.18)); },
};
