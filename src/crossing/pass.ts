/**
 * The Fuzzy Pass — a free 50-level reward track. XP comes from playing (pickups, nests, levels, runs, daily missions);
 * every level pays something, every few levels something exciting, and milestones give whole new Fuzzies.
 * No purchases of any kind. DATA + pure functions only.
 */
import { CHARACTERS } from './characters';
import { COSMETICS } from './cosmetics';

export const PASS_LEVELS = 50;
/** XP needed to go from level n to n+1 (grows gently: 100 … 245). */
export const xpForLevel = (n: number): number => 100 + Math.floor((n - 1) / 5) * 15;
/** total XP needed to REACH level n (level 1 = 0 XP) */
export function xpToReach(n: number): number { let t = 0; for (let i = 1; i < n; i++) t += xpForLevel(i); return t; }
export const MAX_PASS_XP = xpToReach(PASS_LEVELS);
/** level (1..50) and progress inside it for a total XP amount */
export function passLevel(xp: number): { level: number; into: number; need: number; maxed: boolean } {
  let level = 1, left = Math.max(0, Math.floor(xp));
  while (level < PASS_LEVELS && left >= xpForLevel(level)) { left -= xpForLevel(level); level++; }
  return level >= PASS_LEVELS && xp >= MAX_PASS_XP ? { level: PASS_LEVELS, into: 0, need: 0, maxed: true } : { level, into: left, need: xpForLevel(level), maxed: false };
}

export interface PassReward { level: number; coins?: number; character?: string; cosmetic?: string; headline?: string }

/** Built from the characters/cosmetics that say "pass level N", plus coins on the levels in between. */
export function passTrack(): PassReward[] {
  const out: PassReward[] = [];
  for (let l = 1; l <= PASS_LEVELS; l++) {
    const character = CHARACTERS.find((c) => c.unlock.kind === 'pass' && c.unlock.level === l)?.id;
    const cosmetic = COSMETICS.find((c) => c.unlock.kind === 'pass' && c.unlock.level === l)?.id;
    // coins: small on most levels, bigger every 5th/10th; levels that already give a character or cosmetic still pay a little
    const coins = l % 10 === 0 ? 300 : l % 5 === 0 ? 150 : character || cosmetic ? 40 : 60 + Math.floor(l / 10) * 10;
    out.push({ level: l, coins, character, cosmetic, headline: character ? 'New Fuzzy!' : cosmetic ? 'New style!' : undefined });
  }
  return out;
}
export const PASS_TRACK = passTrack();
/** Total coins the whole free track pays (used by the economy checks). */
export const PASS_COINS = PASS_TRACK.reduce((a, r) => a + (r.coins ?? 0), 0);

/** XP values for things that happen in a game (one place, easy to balance). */
export const XP = { pickup: 2, gold: 8, nest: 15, level: 50, perHundredScore: 6, mission: 100, weeklyMission: 250, endlessPer10Rows: 4 } as const;
