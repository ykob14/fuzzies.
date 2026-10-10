/**
 * Soft background music for Fuzzies Land, made live with Web Audio (no music files):
 * warm pad chords, a gentle bass and a music-box melody that wanders over a slow, happy
 * progression, through a little reverb. Quiet on purpose — it sits behind the game.
 */
import { ctx } from './sound';
import { accounts } from '../core/account';

const BPM = 68;
const BEAT = 60 / BPM;
// F major-ish: Fmaj7 – Dm7 – Bbmaj7 – C(add9), as MIDI notes
const CHORDS = [[53, 57, 60, 64], [50, 53, 57, 60], [46, 50, 53, 57], [48, 52, 55, 62]];
const SCALE = [65, 67, 69, 72, 74, 77, 79, 81]; // F pentatonic-ish, upper register
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

let out: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | undefined;
let nextBar = 0;
let bar = 0;
let lastNote = 3;

function impulse(a: AudioContext, secs = 2.6): AudioBuffer {
  const len = Math.floor(a.sampleRate * secs);
  const buf = a.createBuffer(2, len, a.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  return buf;
}

function pad(a: AudioContext, dest: AudioNode, note: number, t: number, len: number): void {
  for (const det of [-6, 6]) {
    const o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter();
    o.type = 'triangle';
    o.frequency.value = hz(note);
    o.detune.value = det;
    f.type = 'lowpass'; f.frequency.value = 900;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.012, t + 1.4);
    g.gain.setValueAtTime(0.012, t + len - 1.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.8);
    o.connect(f).connect(g).connect(dest);
    o.start(t); o.stop(t + len + 0.9);
  }
}

function bass(a: AudioContext, dest: AudioNode, note: number, t: number): void {
  const o = a.createOscillator(), g = a.createGain();
  o.type = 'sine';
  o.frequency.value = hz(note - 12);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.045, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + BEAT * 1.8);
  o.connect(g).connect(dest);
  o.start(t); o.stop(t + BEAT * 2);
}

/** A music-box "ting": a sine with a soft overtone and a quick, bell-like fade. */
function bell(a: AudioContext, dest: AudioNode, note: number, t: number, vol = 0.03): void {
  for (const [mult, v] of [[1, vol], [2, vol * 0.25], [3.01, vol * 0.08]] as [number, number][]) {
    const o = a.createOscillator(), g = a.createGain();
    o.type = 'sine';
    o.frequency.value = hz(note) * mult;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6 / mult);
    o.connect(g).connect(dest);
    o.start(t); o.stop(t + 1.7);
  }
}

/** Schedule one bar (4 beats) starting at time t. */
function scheduleBar(a: AudioContext, dest: AudioNode, t: number): void {
  const chord = CHORDS[bar % CHORDS.length];
  for (const n of chord) pad(a, dest, n, t, BEAT * 4);
  bass(a, dest, chord[0], t);
  bass(a, dest, chord[0] + 7, t + BEAT * 2);
  // the melody wanders in small steps, resting now and then
  for (let half = 0; half < 8; half++) {
    if (Math.random() > (half % 2 ? 0.28 : 0.55)) continue;
    lastNote = Math.max(0, Math.min(SCALE.length - 1, lastNote + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]));
    bell(a, dest, SCALE[lastNote], t + half * BEAT / 2 + (Math.random() - 0.5) * 0.02, half === 0 ? 0.032 : 0.024);
  }
  bar++;
}

export const music = {
  get playing(): boolean { return !!timer; },

  /** Fade the music in (only if sound and music are on, and the browser has allowed audio). */
  start(): void {
    if (timer) return;
    const s = accounts.current?.settings;
    if (s && (s.music === false || s.sound === false)) return;
    const a = ctx();
    if (!a || a.state !== 'running') return;
    out = a.createGain();
    out.gain.setValueAtTime(0.0001, a.currentTime);
    out.gain.exponentialRampToValueAtTime(0.55, a.currentTime + 3);
    const verb = a.createConvolver();
    verb.buffer = impulse(a);
    const wet = a.createGain(); wet.gain.value = 0.35;
    out.connect(a.destination);
    out.connect(verb).connect(wet).connect(a.destination);
    nextBar = a.currentTime + 0.1;
    bar = 0;
    const dest = out;
    timer = setInterval(() => {
      // keep about one bar scheduled ahead
      while (nextBar < a.currentTime + BEAT * 4 + 0.5) { scheduleBar(a, dest, nextBar); nextBar += BEAT * 4; }
    }, 250);
  },

  /** Fade out and stop. */
  stop(): void {
    if (!timer) return;
    clearInterval(timer);
    timer = undefined;
    const g = out, a = ctx();
    out = null;
    if (g && a) {
      g.gain.cancelScheduledValues(a.currentTime);
      g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 1.2);
      setTimeout(() => g.disconnect(), 1500);
    } else g?.disconnect();
  },
};
