/** Tiny Web Audio synth for the game's blips. */
import { accounts } from '../core/account';

let ac: AudioContext | null = null;
/** Sound is on unless the signed-in person turned it off (the welcome screen, before sign-in, has sound too). */
const soundAllowed = () => accounts.current ? accounts.current.settings.sound !== false : true;
/** The shared audio context (null when sound is off). Used by the background music too. */
export function ctx(): AudioContext | null {
  if (!soundAllowed()) return null;
  try {
    ac ??= new AudioContext();
    if (ac.state === 'suspended') void ac.resume();
    return ac;
  } catch { return null; }
}

/**
 * Browsers only allow sound after the first click/tap/key press on the page (moving the mouse
 * doesn't count). Wake the audio up on that first press so hover giggles work from then on.
 */
export const audioReady = (): boolean => ac?.state === 'running';
for (const ev of ['pointerdown', 'keydown', 'touchend']) {
  addEventListener(ev, () => { if (soundAllowed()) { try { ac ??= new AudioContext(); if (ac.state === 'suspended') void ac.resume(); } catch { /* no audio */ } } }, { capture: true, passive: true });
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

function noise(dur: number, from: number, to: number, vol: number, delay = 0): void {
  const a = ctx();
  if (!a) return;
  const t = a.currentTime + delay;
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 1.2;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
}

type Vowel = 'ee' | 'ah' | 'eh';
const FORMANTS: Record<Vowel, [number, number][]> = {
  // [frequency, loudness] of the resonances that make a voice sound like each vowel (a small, high voice)
  ee: [[390, 1], [2700, 0.55], [3500, 0.25]],
  ah: [[950, 1], [1500, 0.7], [3000, 0.2]],
  eh: [[620, 1], [2150, 0.55], [3000, 0.2]],
};

/** One sung syllable: a breathy "h" (or a "t" click), then a voiced vowel with a little wobble and a falling pitch. */
function syllable(a: AudioContext, out: AudioNode, t: number, f0: number, vowel: Vowel, len: number, vol: number, onset: 'h' | 't' = 'h'): void {
  // consonant: a short puff of air
  const nlen = onset === 't' ? 0.018 : 0.05;
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * nlen), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const air = a.createBufferSource();
  air.buffer = buf;
  const hp = a.createBiquadFilter();
  hp.type = onset === 't' ? 'highpass' : 'bandpass';
  hp.frequency.value = onset === 't' ? 4200 : FORMANTS[vowel][1][0];
  hp.Q.value = 0.8;
  const ag = a.createGain();
  ag.gain.value = vol * (onset === 't' ? 0.9 : 0.45);
  air.connect(hp).connect(ag).connect(out);
  air.start(t);
  // the voice: a buzzy source shaped by the vowel's resonances
  const v0 = t + nlen * 0.6;
  const src = a.createOscillator();
  src.type = 'sawtooth';
  src.frequency.setValueAtTime(f0 * 1.12, v0);
  src.frequency.exponentialRampToValueAtTime(f0 * 0.88, v0 + len);
  const lfo = a.createOscillator(), depth = a.createGain();
  lfo.frequency.value = 11 + Math.random() * 4;
  depth.gain.value = f0 * 0.035;
  lfo.connect(depth).connect(src.frequency);
  const env = a.createGain();
  env.gain.setValueAtTime(0.0001, v0);
  env.gain.exponentialRampToValueAtTime(vol, v0 + 0.018);
  env.gain.setValueAtTime(vol * 0.85, v0 + len * 0.55);
  env.gain.exponentialRampToValueAtTime(0.0001, v0 + len);
  for (const [freq, amp] of FORMANTS[vowel]) {
    const bp = a.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 7;
    const g = a.createGain();
    g.gain.value = amp * 2.4;
    src.connect(bp).connect(g).connect(env);
  }
  env.connect(out);
  src.start(v0); lfo.start(v0);
  src.stop(v0 + len + 0.02); lfo.stop(v0 + len + 0.02);
}

const GIGGLES: [Vowel, 'h' | 't', number][][] = [
  // "tee hee hee hee — ha ha ha"
  [['ee', 't', 0], ['ee', 'h', 1], ['ee', 'h', 2], ['ee', 'h', 3], ['ah', 'h', 4.6], ['ah', 'h', 5.6], ['ah', 'h', 6.6]],
  // "hee hee hee hee hee"
  [['ee', 'h', 0], ['ee', 'h', 0.9], ['ee', 'h', 1.8], ['ee', 'h', 2.7], ['ee', 'h', 3.6]],
  // "ha ha ha — hee hee"
  [['ah', 'h', 0], ['ah', 'h', 1], ['ah', 'h', 2], ['ee', 'h', 3.5], ['ee', 'h', 4.4]],
  // "teehee! hehehe"
  [['ee', 't', 0], ['ee', 'h', 0.8], ['eh', 'h', 2.2], ['eh', 'h', 2.9], ['eh', 'h', 3.6]],
];

/** A cute giggle phrase like "tee hee hee hee, ha ha ha". Returns how long it lasts (seconds). */
function giggle(): number {
  const a = ctx();
  if (!a) return 0;
  const out = a.createGain();
  out.gain.value = 0.55;
  const comp = a.createDynamicsCompressor();
  out.connect(comp).connect(a.destination);
  const phrase = GIGGLES[Math.floor(Math.random() * GIGGLES.length)];
  const beat = 0.115 + Math.random() * 0.02;
  const base = 600 + Math.random() * 90; // a small, high voice
  const t0 = a.currentTime + 0.01;
  let end = 0;
  phrase.forEach(([vowel, onset, at], i) => {
    const t = t0 + at * beat + (Math.random() - 0.5) * 0.012;
    const f0 = base * (vowel === 'ah' ? 0.86 : 1) * (1 - i * 0.025) * (1 + (i % 2) * 0.04);
    const len = vowel === 'ah' ? 0.1 : 0.075;
    syllable(a, out, t, f0, vowel, len, i === 0 ? 0.32 : 0.26, onset);
    end = Math.max(end, t + len + 0.06 - a.currentTime);
  });
  return end;
}

const PENTA = [1568, 1760, 2093, 2349, 2637, 3136, 3520];
/** A soft sparkle "ting" (one bell note from a happy scale). */
function twinkle(): void {
  const a = ctx();
  if (!a) return;
  const f = PENTA[Math.floor(Math.random() * PENTA.length)];
  const t = a.currentTime;
  for (const [mult, vol] of [[1, 0.05], [2.01, 0.018], [3.02, 0.008]] as [number, number][]) {
    const o = a.createOscillator(), g = a.createGain();
    o.type = 'sine';
    o.frequency.value = f * mult;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7 / mult);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + 0.75);
  }
}

/** A quick magical shimmer (a burst of sparkles): a rising run of bell notes. */
function shimmer(): void {
  const a = ctx();
  if (!a) return;
  [0, 2, 4, 5, 6].forEach((n, i) => {
    const t = a.currentTime + i * 0.045;
    const o = a.createOscillator(), g = a.createGain();
    o.type = 'sine';
    o.frequency.value = PENTA[n];
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.035, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + 0.5);
  });
}

/** Boat-race sounds: countdown beeps, the GO, gates, laps, bumps, splashes and the finish fanfare. */
export const race = {
  count: () => tone(660, 0.12, 'square', 0.07),
  go: () => { tone(880, 0.18, 'square', 0.09); tone(1320, 0.42, 'square', 0.07, 0, 0.12); },
  gate: () => { tone(1040, 0.1, 'sine', 0.09, 260); tone(1560, 0.14, 'sine', 0.06, 0, 0.06); },
  lap: () => { [660, 880, 1100].forEach((f, i) => tone(f, 0.15, 'triangle', 0.1, 0, i * 0.08)); },
  bump: () => { noise(0.22, 320, 900, 0.14); tone(140, 0.16, 'triangle', 0.08, -60); },
  splash: () => noise(0.5, 1400, 260, 0.12),
  finish: () => { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.28, 'triangle', 0.12, 0, i * 0.09)); },
  wrong: () => tone(220, 0.2, 'square', 0.05, -40),
  missed: () => { tone(330, 0.16, 'square', 0.07, -30); tone(262, 0.26, 'square', 0.07, -30, 0.16); },
  recovered: () => { tone(784, 0.1, 'triangle', 0.09); tone(1175, 0.18, 'triangle', 0.08, 0, 0.09); },
  boost: () => { tone(420, 0.35, 'sawtooth', 0.06, 900); noise(0.3, 600, 2400, 0.08); },
  edge: () => tone(300, 0.14, 'triangle', 0.06, 40),
  wave: () => noise(0.35, 900, 300, 0.08),
  splashBig: () => noise(0.7, 1800, 200, 0.14),
  cheer: () => { [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.22, 'triangle', 0.1, 0, i * 0.07)); },
};

/** A running boat engine: a soft purr that rises with speed. Call `set()` every frame and `stop()` when the race ends. */
export function engine(): { set(speed: number, throttle: number): void; stop(): void } {
  const a = ctx();
  if (!a) return { set() { /* no audio */ }, stop() { /* no audio */ } };
  const g = a.createGain();
  g.gain.value = 0;
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.7;
  const o1 = a.createOscillator(), o2 = a.createOscillator();
  o1.type = 'sawtooth'; o2.type = 'triangle';
  o1.frequency.value = 70; o2.frequency.value = 35;
  const g2 = a.createGain(); g2.gain.value = 0.5;
  o1.connect(lp); o2.connect(g2).connect(lp); lp.connect(g).connect(a.destination);
  o1.start(); o2.start();
  let stopped = false;
  return {
    set(speed, throttle) {
      if (stopped) return;
      const t = a.currentTime;
      const f = 62 + speed * 8.5 + throttle * 12;
      o1.frequency.setTargetAtTime(f, t, 0.08);
      o2.frequency.setTargetAtTime(f / 2, t, 0.08);
      lp.frequency.setTargetAtTime(380 + speed * 60, t, 0.1);
      g.gain.setTargetAtTime(0.02 + throttle * 0.035 + Math.min(1, speed / 14) * 0.03, t, 0.1);
    },
    stop() {
      if (stopped) return;
      stopped = true;
      const t = a.currentTime;
      g.gain.setTargetAtTime(0.0001, t, 0.15);
      setTimeout(() => { try { o1.stop(); o2.stop(); o1.disconnect(); o2.disconnect(); g.disconnect(); } catch { /* already gone */ } }, 600);
    },
  };
}

export const sfx = {
  giggle,
  twinkle,
  shimmer,
  wink: () => { tone(1568, 0.09, 'sine', 0.09); tone(2093, 0.16, 'sine', 0.08, 0, 0.08); tone(2637, 0.22, 'triangle', 0.05, 0, 0.15); },
  boing: () => tone(260, 0.28, 'sine', 0.13, 420),
  whoosh: () => noise(0.9, 400, 2600, 0.12),
  hop: () => tone(520, 0.08, 'triangle', 0.08, 220),
  collect: () => { tone(880, 0.09, 'sine', 0.12); tone(1320, 0.12, 'sine', 0.1, 0, 0.07); },
  gold: () => { [660, 880, 1100, 1320].forEach((f, i) => tone(f, 0.12, 'triangle', 0.1, 0, i * 0.06)); },
  splash: () => tone(300, 0.35, 'sawtooth', 0.06, -220),
  crash: () => { tone(160, 0.3, 'square', 0.08, -100); tone(90, 0.3, 'sawtooth', 0.06, -40, 0.03); },
  home: () => { [523, 659, 784].forEach((f, i) => tone(f, 0.16, 'triangle', 0.11, 0, i * 0.08)); },
  level: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'square', 0.06, 0, i * 0.1)); },
  build: () => { noise(0.25, 900, 200, 0.1); [523, 784, 1047].forEach((f, i) => tone(f, 0.14, 'triangle', 0.09, 0, 0.12 + i * 0.07)); },
  plant: () => { tone(320, 0.1, 'sine', 0.12, -120); tone(640, 0.08, 'sine', 0.06, 0, 0.05); },
  coins: () => { [1319, 1568, 2093].forEach((f, i) => tone(f, 0.1, 'square', 0.04, 0, i * 0.05)); },
  over: () => { [392, 330, 262].forEach((f, i) => tone(f, 0.25, 'triangle', 0.1, 0, i * 0.18)); },
};
