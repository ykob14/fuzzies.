/**
 * Sounds for the Fuzzy Obstacle Run — all synthesised live with Web Audio (no audio files): a crunchy rock, a wooden knock,
 * a watery splash with droplets, a squelch of mud, star chimes that climb with your chain, a soft bounce, a little landing
 * thud, a mushroom boing, a branch crack, a rumbling boulder, a cart's clatter + bell, one sound per power-up and jingles for
 * milestones. Uses the shared audio context from sound.ts (so it respects Settings → Sound and the browser's "first tap"
 * rule); callers decide muting (the game's own mute button) by not calling.
 */
import { ctx } from './sound';

let noiseBuf: AudioBuffer | null = null;
const white = (a: AudioContext): AudioBuffer => {
  if (noiseBuf && noiseBuf.sampleRate === a.sampleRate) return noiseBuf;
  const b = a.createBuffer(1, Math.ceil(a.sampleRate * 1.5), a.sampleRate); const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return (noiseBuf = b);
};
const env = (a: AudioContext, g: GainNode, t: number, vol: number, attack: number, dur: number): void => {
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
};
/** an oscillator note with an optional pitch slide (to a frequency) */
export function note(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.12, to = 0, delay = 0, attack = 0.008): void {
  const a = ctx(); if (!a) return; const t = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(Math.max(30, to), t + dur);
  env(a, g, t, vol, attack, dur); o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.03);
}
/** filtered noise (band / low / high pass), the filter sweeping from → to */
export function hiss(dur: number, type: BiquadFilterType, from: number, to: number, vol: number, delay = 0, q = 1, attack = 0.01): void {
  const a = ctx(); if (!a) return; const t = a.currentTime + delay;
  const s = a.createBufferSource(); s.buffer = white(a); const off = Math.random() * 0.4;
  const f = a.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, to), t + dur);
  const g = a.createGain(); env(a, g, t, vol, attack, dur);
  s.connect(f).connect(g).connect(a.destination); s.start(t, off, dur + 0.05);
}
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]; // a major pentatonic, two octaves
const pitch = (base: number, step: number) => base * 2 ** (SCALE[Math.min(SCALE.length - 1, step)] / 12);

export const run = {
  /** a star: a bright chime that climbs up the scale as the chain grows */
  star(chain: number): void { const f = pitch(1046, chain % 11); note(f, 0.22, 'sine', 0.09); note(f * 2, 0.12, 'triangle', 0.025, 0, 0.01); },
  gold(): void { [0, 4, 7, 12].forEach((s, i) => note(784 * 2 ** (s / 12), 0.28, 'triangle', 0.08, 0, i * 0.055)); hiss(0.35, 'highpass', 6000, 9000, 0.03, 0.05); },
  super(): void { for (let i = 0; i < 9; i++) note(pitch(880, i), 0.3, i % 2 ? 'triangle' : 'sine', 0.07, 0, i * 0.045); hiss(0.6, 'highpass', 5000, 10000, 0.04, 0.1); },
  /** a soft bounce when you jump */
  jump(): void { note(260, 0.14, 'sine', 0.08, 560); note(520, 0.08, 'triangle', 0.02, 900, 0.02); },
  /** a little thud when you land */
  land(): void { note(120, 0.09, 'sine', 0.09, 60); hiss(0.07, 'lowpass', 900, 300, 0.035); },
  duck(): void { hiss(0.18, 'bandpass', 2200, 600, 0.06, 0, 1.4); },
  /** crunchy rock: gritty bursts over a low thump */
  rock(): void { note(95, 0.18, 'sine', 0.2, 50); for (let i = 0; i < 4; i++) hiss(0.06 + i * 0.01, 'bandpass', 2200 - i * 300, 500, 0.16 - i * 0.025, i * 0.035, 2.5, 0.003); },
  /** wooden collision: two hollow knocks */
  wood(): void { note(210, 0.12, 'triangle', 0.18, 140); note(330, 0.06, 'square', 0.03, 200); hiss(0.08, 'bandpass', 900, 500, 0.08, 0, 3, 0.003); note(170, 0.1, 'triangle', 0.1, 120, 0.09); },
  /** a boulder: a big thump and a rumble */
  boulder(): void { note(70, 0.35, 'sine', 0.24, 40); hiss(0.4, 'lowpass', 500, 120, 0.18, 0, 1, 0.005); },
  rumble(): void { hiss(1.3, 'lowpass', 160, 90, 0.12, 0, 1, 0.25); note(48, 1.2, 'sine', 0.06, 40, 0, 0.3); },
  /** a cart: wooden clatter and a little bell */
  cart(): void { for (let i = 0; i < 6; i++) hiss(0.04, 'bandpass', 1400 + (i % 2) * 400, 900, 0.05, i * 0.07, 4, 0.002); note(1568, 0.5, 'sine', 0.05, 0, 0.05); note(2093, 0.4, 'sine', 0.03, 0, 0.05); },
  cartHit(): void { this.wood(); note(1568, 0.6, 'sine', 0.07, 1400, 0.05); },
  /** vines: a leafy swish and a boing of the vine */
  vine(): void { hiss(0.25, 'bandpass', 3000, 900, 0.1, 0, 1); note(180, 0.3, 'triangle', 0.08, 120, 0.03); },
  /** water: a splash with droplets */
  splash(big = false): void {
    hiss(big ? 0.55 : 0.4, 'bandpass', 2600, 400, big ? 0.22 : 0.16, 0, 0.8, 0.005); hiss(0.25, 'highpass', 4000, 2500, 0.05, 0.02);
    for (let i = 0; i < (big ? 7 : 5); i++) { const f = 900 + Math.random() * 1100; note(f, 0.07, 'sine', 0.04, f * 1.6, 0.06 + i * 0.05 + Math.random() * 0.03); }
    if (big) note(140, 0.25, 'sine', 0.12, 70);
  },
  /** a bucket tipping over: a clunk, then the splash */
  bucket(): void { note(240, 0.1, 'triangle', 0.12, 180); hiss(0.05, 'bandpass', 1200, 700, 0.06, 0, 4, 0.002); this.splash(); },
  /** mud: a squelch */
  mud(): void { hiss(0.35, 'lowpass', 600, 150, 0.2, 0, 2, 0.02); note(130, 0.3, 'sine', 0.1, 70); note(90, 0.18, 'triangle', 0.05, 160, 0.12); },
  /** a sprinkler hissing as you pass */
  spray(): void { hiss(0.5, 'highpass', 3500, 5000, 0.06, 0, 0.8, 0.05); },
  /** the mushroom: a springy boing */
  boing(): void { note(180, 0.38, 'sine', 0.13, 720); note(360, 0.3, 'triangle', 0.04, 1100, 0.02); },
  /** a branch cracks and falls */
  crack(): void { hiss(0.05, 'highpass', 3000, 2000, 0.14, 0, 1, 0.002); hiss(0.05, 'highpass', 2600, 1800, 0.1, 0.06, 1, 0.002); hiss(0.25, 'bandpass', 1200, 300, 0.05, 0.1); },
  /** off the bridge: plop into the stream */
  fall(): void { note(600, 0.15, 'sine', 0.1, 150); this.splash(true); },
  shield(): void { hiss(0.4, 'bandpass', 500, 3000, 0.06); [0, 4, 7, 12].forEach((s, i) => note(523 * 2 ** (s / 12), 0.5, 'triangle', 0.05, 0, i * 0.04)); },
  magnet(): void { note(220, 0.5, 'sawtooth', 0.025, 440); note(440, 0.5, 'sine', 0.06, 880, 0.02); note(660, 0.3, 'sine', 0.04, 1320, 0.15); },
  boost(): void { hiss(0.6, 'bandpass', 300, 3000, 0.12, 0, 1.2, 0.05); note(200, 0.55, 'triangle', 0.08, 1200); note(400, 0.4, 'sine', 0.05, 1600, 0.12); },
  powerEnd(): void { note(880, 0.15, 'sine', 0.06, 660); note(660, 0.2, 'sine', 0.05, 440, 0.12); },
  shieldPop(): void { note(1800, 0.25, 'sine', 0.08, 900); hiss(0.2, 'highpass', 5000, 3000, 0.08); note(110, 0.15, 'sine', 0.1, 70); },
  /** smashed through something on a boost */
  smash(): void { this.rock(); note(1318, 0.2, 'triangle', 0.06, 0, 0.05); },
  combo(mult: number): void { const top = Math.min(5, Math.round(mult * 2)); for (let i = 0; i <= top; i++) note(pitch(659, i + 2), 0.18, 'triangle', 0.06, 0, i * 0.05); },
  milestone(): void { [0, 4, 7, 12, 7, 12].forEach((s, i) => note(659 * 2 ** (s / 12), 0.2, i < 4 ? 'triangle' : 'sine', 0.06, 0, i * 0.08)); },
  rush(): void { [0, 4, 7, 12, 16].forEach((s, i) => note(523 * 2 ** (s / 12), 0.35, 'triangle', 0.07, 0, i * 0.07)); hiss(0.8, 'highpass', 4000, 9000, 0.04, 0.2); },
  rushEnd(): void { note(784, 0.25, 'sine', 0.05, 523); },
  /** the generic "oof" bump */
  oof(): void { note(300, 0.16, 'triangle', 0.08, 140); },
};
