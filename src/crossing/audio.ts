/**
 * Fuzzy Crossing character sounds: every Fuzzy has its own little voice (pitch from `CharacterDef.voice`: 0.6 deep … 1.6 tiny).
 * Live Web Audio synthesis (no recordings), on the game's shared AudioContext — so it follows Settings → Sound and only plays after
 * a tap (browser rule). Hop chirps, landings, giggles, cheers, roars, magic chimes, salutes, and the unlock fanfare (longer and
 * richer for rarer Fuzzies).
 */
import { ctx } from '../game/sound';
import type { CelebrateStyle, CharacterDef, JumpStyle, Rarity } from './characters';

type Vowel = 'ee' | 'ah' | 'oh' | 'oo' | 'eh';
const FORMANTS: Record<Vowel, [number, number][]> = {
  ee: [[390, 1], [2700, 0.55], [3500, 0.25]],
  ah: [[950, 1], [1500, 0.7], [3000, 0.2]],
  oh: [[560, 1], [950, 0.6], [2700, 0.15]],
  oo: [[400, 1], [850, 0.45], [2600, 0.12]],
  eh: [[620, 1], [2150, 0.55], [3000, 0.2]],
};
let master: GainNode | null = null;
function out(a: AudioContext): AudioNode {
  if (master && master.context === a) return master;
  master = a.createGain(); master.gain.value = 0.7;
  const comp = a.createDynamicsCompressor();
  master.connect(comp).connect(a.destination);
  return master;
}
/** a sung syllable: air puff + a buzzy voice shaped by the vowel, pitch gliding from f0·k0 to f0·k1 */
function syl(a: AudioContext, t: number, f0: number, v: Vowel, len: number, vol: number, k0 = 1.12, k1 = 0.88, onset: 'h' | 't' | 'none' = 'h'): void {
  const o = out(a);
  if (onset !== 'none') {
    const nlen = onset === 't' ? 0.018 : 0.045;
    const buf = a.createBuffer(1, Math.ceil(a.sampleRate * nlen), a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const air = a.createBufferSource(); air.buffer = buf;
    const f = a.createBiquadFilter(); f.type = onset === 't' ? 'highpass' : 'bandpass'; f.frequency.value = onset === 't' ? 4200 : FORMANTS[v][1][0]; f.Q.value = 0.8;
    const g = a.createGain(); g.gain.value = vol * 0.4;
    air.connect(f).connect(g).connect(o); air.start(t);
  }
  const v0 = t + 0.025;
  const src = a.createOscillator(); src.type = 'sawtooth';
  src.frequency.setValueAtTime(f0 * k0, v0); src.frequency.exponentialRampToValueAtTime(Math.max(40, f0 * k1), v0 + len);
  const lfo = a.createOscillator(), dep = a.createGain(); lfo.frequency.value = 10 + Math.random() * 4; dep.gain.value = f0 * 0.03; lfo.connect(dep).connect(src.frequency);
  const env = a.createGain();
  env.gain.setValueAtTime(0.0001, v0); env.gain.exponentialRampToValueAtTime(vol, v0 + 0.02);
  env.gain.setValueAtTime(vol * 0.85, v0 + len * 0.6); env.gain.exponentialRampToValueAtTime(0.0001, v0 + len);
  for (const [freq, amp] of FORMANTS[v]) { const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 7; const g = a.createGain(); g.gain.value = amp * 2.4; src.connect(bp).connect(g).connect(env); }
  env.connect(o);
  src.start(v0); lfo.start(v0); src.stop(v0 + len + 0.03); lfo.stop(v0 + len + 0.03);
}
function tone(a: AudioContext, t: number, f: number, len: number, type: OscillatorType = 'sine', vol = 0.08, slide = 0): void {
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + len);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g).connect(out(a)); o.start(t); o.stop(t + len + 0.02);
}
function noise(a: AudioContext, t: number, len: number, from: number, to: number, vol: number, type: BiquadFilterType = 'bandpass'): void {
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * len), a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = a.createBufferSource(); s.buffer = buf;
  const f = a.createBiquadFilter(); f.type = type; f.Q.value = 1.1; f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + len);
  const g = a.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + len * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  s.connect(f).connect(g).connect(out(a)); s.start(t);
}
const BELLS = [1568, 1760, 2093, 2349, 2637, 3136, 3520];
function bell(a: AudioContext, t: number, f: number, vol = 0.05, len = 0.7): void {
  for (const [m, v] of [[1, vol], [2.01, vol * 0.35], [3.02, vol * 0.15]] as [number, number][]) tone(a, t, f * m, len / m, 'sine', v);
}

let lastHop = 0;
/** A Fuzzy's voice. Everything is safe to call any time: it does nothing while sound is off. */
export function characterVoice(def: Pick<CharacterDef, 'voice' | 'jump' | 'celebrate'>) {
  const p = Math.max(0.5, Math.min(1.8, def.voice || 1));
  const f0 = 520 * p;
  return {
    /** the little chirp as it jumps (its own style) */
    hop(style: JumpStyle = def.jump): void {
      const a = ctx(); if (!a) return;
      const now = a.currentTime; if (now - lastHop < 0.06) return; lastHop = now;
      const t = now + 0.005;
      switch (style) {
        case 'spring': tone(a, t, 300 * p, 0.22, 'sine', 0.09, 700 * p); break;
        case 'stomp': syl(a, t, f0 * 0.6, 'oh', 0.11, 0.18, 1.05, 0.8); break;
        case 'float': case 'glide': tone(a, t, 900 * p, 0.3, 'sine', 0.05, 400 * p); bell(a, t + 0.05, BELLS[(Math.random() * 3) | 0], 0.025, 0.5); break;
        case 'zoom': noise(a, t, 0.22, 600, 3800, 0.08); tone(a, t, 500 * p, 0.14, 'triangle', 0.05, 900 * p); break;
        case 'twirl': tone(a, t, 700 * p, 0.25, 'sine', 0.06, 600 * p); bell(a, t + 0.1, BELLS[4], 0.03, 0.5); break;
        case 'bunny': syl(a, t, f0 * 1.2, 'ee', 0.06, 0.16, 1.2, 1.0, 't'); syl(a, t + 0.16, f0 * 1.3, 'ee', 0.06, 0.14, 1.2, 1.0, 't'); break;
        default: syl(a, t, f0, Math.random() < 0.5 ? 'ee' : 'eh', 0.075, 0.2, 0.95, 1.25, 't');
      }
    },
    /** landing: a soft puff (a heavy thump for stompers) */
    land(style: JumpStyle = def.jump): void {
      const a = ctx(); if (!a) return;
      const t = a.currentTime + 0.003;
      if (style === 'stomp') { tone(a, t, 110, 0.25, 'sine', 0.22, -50); noise(a, t, 0.18, 400, 120, 0.1, 'lowpass'); }
      else if (style === 'spring') tone(a, t, 220 * p, 0.3, 'sine', 0.08, 260);
      else noise(a, t, 0.09, 900, 300, 0.05, 'lowpass');
    },
    giggle(): void {
      const a = ctx(); if (!a) return;
      const t0 = a.currentTime + 0.01, beat = 0.11 + Math.random() * 0.02;
      const seq: [Vowel, number][] = [['ee', 0], ['ee', 1], ['ee', 2], ['ah', 3.5], ['ah', 4.5]];
      seq.forEach(([v, at], i) => syl(a, t0 + at * beat, f0 * 1.15 * (v === 'ah' ? 0.86 : 1) * (1 - i * 0.025), v, v === 'ah' ? 0.1 : 0.075, 0.24, 1.12, 0.88, i ? 'h' : 't'));
    },
    yay(): void {
      const a = ctx(); if (!a) return;
      const t = a.currentTime + 0.01;
      syl(a, t, f0, 'eh', 0.09, 0.22, 0.9, 1.15, 'none'); syl(a, t + 0.1, f0 * 1.25, 'ah', 0.22, 0.24, 1.1, 1.3, 'none');
    },
    roar(): void {
      const a = ctx(); if (!a) return;
      const t = a.currentTime + 0.01;
      // a small, brave "rawr" — growly but cute
      syl(a, t, f0 * 0.55, 'ah', 0.42, 0.3, 0.9, 0.7, 'h');
      noise(a, t, 0.45, 300, 900, 0.07, 'bandpass');
      tone(a, t, 90 * p, 0.4, 'sawtooth', 0.04, -20);
    },
    hum(): void {
      const a = ctx(); if (!a) return;
      const t = a.currentTime + 0.01;
      syl(a, t, f0 * 0.9, 'oo', 0.18, 0.13, 1.0, 1.1, 'none'); syl(a, t + 0.2, f0 * 1.05, 'oo', 0.22, 0.12, 1.1, 0.95, 'none');
    },
    surprised(): void { const a = ctx(); if (!a) return; syl(a, a.currentTime + 0.01, f0 * 1.1, 'oh', 0.14, 0.22, 0.9, 1.35, 'none'); },
    sleepy(): void { const a = ctx(); if (!a) return; syl(a, a.currentTime + 0.01, f0 * 0.75, 'ah', 0.5, 0.12, 1.1, 0.7, 'h'); },
    /** the celebration that matches the Fuzzy's own celebration style */
    celebrate(style: CelebrateStyle = def.celebrate): void {
      const a = ctx(); if (!a) return;
      const t = a.currentTime + 0.02;
      switch (style) {
        case 'roar': this.roar(); break;
        case 'giggle': this.giggle(); break;
        case 'magic': [0, 2, 4, 5, 6, 4].forEach((n, i) => bell(a, t + i * 0.07, BELLS[n], 0.04, 0.6)); break;
        case 'salute': [523, 659, 784].forEach((f, i) => tone(a, t + i * 0.11, f * p ** 0.3, 0.16, 'square', 0.035)); tone(a, t + 0.36, 1047 * p ** 0.3, 0.32, 'square', 0.04); break;
        case 'bow': syl(a, t, f0, 'oh', 0.12, 0.18, 1.1, 0.9, 'none'); bell(a, t + 0.3, BELLS[2], 0.04); break;
        case 'flex': syl(a, t, f0 * 0.8, 'oh', 0.3, 0.22, 0.9, 1.2, 'h'); tone(a, t + 0.3, 900, 0.3, 'triangle', 0.05, 600); break;
        case 'dance': [0, 0.18, 0.36, 0.54].forEach((d, i) => { tone(a, t + d, [523, 659, 587, 784][i] * p ** 0.4, 0.12, 'triangle', 0.06); noise(a, t + d, 0.05, 6000, 8000, 0.03, 'highpass'); }); break;
        case 'backflip': case 'spin': tone(a, t, 400 * p, 0.45, 'sine', 0.07, 900 * p); this.yay(); break;
        default: this.yay(); bell(a, t + 0.25, BELLS[4], 0.035);
      }
    },
  };
}

/** The unlock fanfare: a bright arpeggio — longer, fuller and with a shimmer tail the rarer the Fuzzy. */
export function unlockFanfare(r: Rarity): void {
  const a = ctx(); if (!a) return;
  const t = a.currentTime + 0.05;
  const steps = { common: [523, 659, 784], rare: [523, 659, 784, 1047], epic: [392, 523, 659, 784, 1047], legendary: [392, 523, 659, 784, 1047, 1319], mythic: [330, 392, 523, 659, 784, 1047, 1319, 1568] }[r];
  steps.forEach((f, i) => { tone(a, t + i * 0.09, f, 0.35, 'triangle', 0.07); tone(a, t + i * 0.09, f * 2, 0.25, 'sine', 0.025); });
  const end = t + steps.length * 0.09;
  // the held chord
  for (const f of r === 'common' ? [784, 1047] : [523, 659, 784, 1047]) tone(a, end, f, r === 'mythic' ? 1.6 : 1.0, 'sine', 0.045);
  if (r !== 'common') BELLS.forEach((f, i) => bell(a, end + 0.08 + i * 0.05, f, 0.025, 0.8));
  if (r === 'legendary' || r === 'mythic') { noise(a, t, 0.8, 300, 4000, 0.05); tone(a, t, 65, 1.2, 'sine', 0.12, 30); }
}
/** a whoosh for camera swoops and reveals */
export function whoosh(): void { const a = ctx(); if (!a) return; noise(a, a.currentTime + 0.01, 0.7, 300, 2800, 0.07); }
/** a soft sparkle ting */
export function sparkle(): void { const a = ctx(); if (!a) return; bell(a, a.currentTime + 0.01, BELLS[(Math.random() * BELLS.length) | 0], 0.03, 0.6); }
/** equip "click": a tiny two-note confirm */
export function equipSound(): void { const a = ctx(); if (!a) return; const t = a.currentTime + 0.01; tone(a, t, 784, 0.1, 'triangle', 0.07); tone(a, t + 0.08, 1175, 0.18, 'triangle', 0.07); }
/** a soft "locked" bonk */
export function lockedSound(): void { const a = ctx(); if (!a) return; tone(a, a.currentTime + 0.01, 220, 0.18, 'sine', 0.08, -60); }
