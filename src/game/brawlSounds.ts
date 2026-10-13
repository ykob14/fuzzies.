/**
 * Sounds for Fuzzie Brawl Arena — synthesised live (Web Audio, no files), built on runSounds' note/hiss helpers: a soft "pew"
 * per role, hits, your own hurt thump, knockout pops, respawn sparkle, each special, crates, hearts, the Sunflower ring and the
 * end jingles. Uses the shared audio context (Settings → Sound, the browser's first-tap rule); the game's 🔊 button mutes it.
 */
import { note, hiss } from './runSounds';
import type { Role } from '../land/games/brawl';

const PEW: Record<Role, [number, number, OscillatorType]> = { burst: [880, 420, 'square'], guard: [520, 260, 'sawtooth'], zip: [1300, 900, 'square'], bloom: [990, 620, 'triangle'] };
export const brawl = {
  shot(role: Role, mine: boolean): void { const [a, b, t] = PEW[role]; const v = mine ? 0.05 : 0.025; note(a, 0.09, t, v, b); hiss(0.06, 'highpass', 3000, 1800, v * 0.6); if (role === 'guard') hiss(0.12, 'bandpass', 900, 300, v); },
  hit(mine: boolean): void { hiss(0.08, 'bandpass', 1800, 700, mine ? 0.12 : 0.06, 0, 2, 0.003); note(mine ? 330 : 260, 0.08, 'triangle', mine ? 0.08 : 0.04, 180); },
  hurt(): void { note(150, 0.16, 'sine', 0.16, 80); hiss(0.1, 'lowpass', 900, 200, 0.1); },
  wall(): void { hiss(0.05, 'bandpass', 700, 400, 0.04, 0, 3, 0.002); },
  ko(mine: boolean): void { note(700, 0.35, 'sine', mine ? 0.1 : 0.06, 160); hiss(0.3, 'bandpass', 2600, 500, mine ? 0.12 : 0.07, 0.05); if (mine) [0, 4, 7].forEach((s, i) => note(784 * 2 ** (s / 12), 0.2, 'triangle', 0.05, 0, 0.12 + i * 0.06)); },
  youKO(): void { note(440, 0.6, 'triangle', 0.1, 140); note(330, 0.6, 'sine', 0.06, 110, 0.1); },
  respawn(): void { for (let i = 0; i < 5; i++) note(660 * 2 ** (i * 2 / 12), 0.14, 'sine', 0.045, 0, i * 0.04); },
  burst(): void { note(90, 0.5, 'sine', 0.25, 40); hiss(0.6, 'lowpass', 2400, 200, 0.22, 0, 0.8, 0.005); [0, 7, 12].forEach((s, i) => note(523 * 2 ** (s / 12), 0.4, 'triangle', 0.05, 0, 0.05 + i * 0.04)); },
  shield(): void { for (let i = 0; i < 3; i++) note(300 + i * 140, 0.25, 'sine', 0.06, 520 + i * 160, i * 0.05); hiss(0.3, 'bandpass', 600, 2400, 0.04); },
  dash(): void { hiss(0.28, 'bandpass', 600, 4000, 0.14, 0, 1.4, 0.01); note(300, 0.2, 'triangle', 0.05, 900); },
  heal(): void { [0, 4, 7, 12].forEach((s, i) => note(659 * 2 ** (s / 12), 0.45, 'sine', 0.05, 0, i * 0.07)); hiss(0.5, 'highpass', 5000, 9000, 0.03, 0.1); },
  crate(): void { note(200, 0.08, 'triangle', 0.08, 140); hiss(0.05, 'bandpass', 1100, 600, 0.05, 0, 3, 0.002); },
  crateBreak(): void { for (let i = 0; i < 4; i++) { note(220 - i * 25, 0.1, 'triangle', 0.08, 120, i * 0.04); hiss(0.07, 'bandpass', 1500 - i * 200, 500, 0.08, i * 0.04, 2.5, 0.002); } },
  heart(): void { note(988, 0.15, 'sine', 0.07); note(1318, 0.25, 'sine', 0.07, 0, 0.08); },
  zone(ours: boolean): void { if (ours) { note(1046, 0.18, 'triangle', 0.07); note(1568, 0.3, 'triangle', 0.07, 0, 0.1); } else { note(392, 0.25, 'triangle', 0.07, 330); } },
  contest(): void { for (let i = 0; i < 2; i++) note(740, 0.07, 'square', 0.03, 0, i * 0.12); },
  empty(): void { note(1200, 0.03, 'square', 0.02); },
  win(): void { [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => note(523 * 2 ** (s / 12), 0.26, i < 4 ? 'triangle' : 'sine', 0.07, 0, i * 0.11)); },
  lose(): void { [7, 5, 4, 0].forEach((s, i) => note(392 * 2 ** (s / 12), 0.35, 'triangle', 0.06, 0, i * 0.18)); },
  lead(ours: boolean): void { ours ? [0, 7].forEach((s, i) => note(784 * 2 ** (s / 12), 0.16, 'triangle', 0.05, 0, i * 0.08)) : note(330, 0.2, 'triangle', 0.05, 280); },
};
