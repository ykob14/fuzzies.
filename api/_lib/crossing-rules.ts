/**
 * Fuzzy Crossing weekly boards — what the server believes about a finished run. DOM-free and database-free so it can be unit-tested
 * (tools/crossing/boards-check.ts).
 *
 * The rules of the game run in the player's browser, so the server can only check that a result is PLAUSIBLE, never that it is real.
 * Every bound below is derived from the game's own rules (src/game/crossing.ts) — keep the two in step:
 *   hop = 0.14 s · board 11×13, 12 rows from the start row to the nest row · +10 per new furthest row per attempt (an attempt = one life
 *   or one nest) · nest = 50 + round(timer×2), timer ≤ 32 s · pickup +25 · golden +100 · level up +200 · 5 nests per level · 3 lives ·
 *   a Fuzzy token is spawned at most every 1.6 s.
 */
import { CHARACTER_BY_ID } from '../../src/crossing/characters.js';

export const RULES = {
  hopMs: 140,
  rowsPerAttempt: 12,
  rowPoints: 10,
  nestBase: 50,
  nestTimeMax: 64, // round(32 × 2): the most the timer can add (a nest takes 12 hops, so really ≤ 61)
  levelBonus: 200,
  pickup: 25,
  gold: 100,
  nestsPerLevel: 5,
  lives: 3,
  deathMs: 1000, // the death animation (1.1 s in the game) — a life can't end faster than this
  tokenEveryMs: 1600,
} as const;

export const LIMITS = {
  /** a run is open this long at most (the server refuses a finish after it) */
  runExpireMs: 45 * 60_000,
  /** how much longer than the server's own stopwatch a client may claim (network, rounding, clock jitter) */
  toleranceMs: 3000,
  /** the hardest check on "fastest": 5 nests = 60 hops = 8.4 s of pure hopping; with traffic and logs nobody gets near it */
  minFastestMs: 14_000,
  /** between minFastestMs and this a time is accepted but flagged for a look */
  flagFastestMs: 20_000,
  maxNests: 400,
  maxScore: 500_000,
  maxHops: 20_000,
  maxTimeMs: 45 * 60_000 + 3000,
  maxJson: 700,
  /** a score above this per second of play is flagged (a perfect run is ~40–70) */
  flagScorePerSec: 80,
} as const;

export interface RunResult {
  score: number; level: number; nests: number; pickups: number; goldPickups: number; hops: number; deaths: number;
  timeMs: number; firstFiveNestsMs: number | null; bestStreak: number; characterId: string;
}
export type Verdict = { ok: true; flags: string[] } | { ok: false; reason: string };

const REASONS: Record<string, string> = {
  shape: 'That result looked broken.',
  expired: 'That run took too long to finish.',
};
/** One calm sentence for the player whatever the reason (the exact code is only logged — no hints for someone probing). */
export const friendlyReason = (reason: string): string => REASONS[reason] ?? 'That run couldn’t be verified, so it isn’t on the boards. Your coins and rewards are safe.';

const isInt = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/** Shape check: exactly the numbers we expect, integers in sane ranges, a known Fuzzy. Anything else → a reason code. */
export function parseResult(raw: unknown): RunResult | string {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'shape';
  let size = 0;
  try { size = JSON.stringify(raw).length; } catch { return 'shape'; }
  if (size > LIMITS.maxJson) return 'shape';
  const r = raw as Record<string, unknown>;
  const f = (k: string, max: number, min = 0) => (isInt(r[k], min, max) ? (r[k] as number) : null);
  const score = f('score', LIMITS.maxScore), level = f('level', LIMITS.maxNests / 5 + 1, 1), nests = f('nests', LIMITS.maxNests), pickups = f('pickups', 5000);
  const goldPickups = f('goldPickups', 5000), hops = f('hops', LIMITS.maxHops), deaths = f('deaths', RULES.lives), timeMs = f('timeMs', LIMITS.maxTimeMs), bestStreak = f('bestStreak', LIMITS.maxNests);
  if ([score, level, nests, pickups, goldPickups, hops, deaths, timeMs, bestStreak].some((x) => x === null)) return 'shape';
  const ff = r.firstFiveNestsMs;
  if (ff !== null && !isInt(ff, 0, LIMITS.maxTimeMs)) return 'shape';
  const ch = r.characterId;
  if (typeof ch !== 'string' || ch.length > 40 || !Object.hasOwn(CHARACTER_BY_ID, ch)) return 'character';
  return { score: score!, level: level!, nests: nests!, pickups: pickups!, goldPickups: goldPickups!, hops: hops!, deaths: deaths!, timeMs: timeMs!, firstFiveNestsMs: ff as number | null, bestStreak: bestStreak!, characterId: ch };
}

/** The most a run with these statistics can possibly have scored under the game's rules (a hard upper bound). */
export function scoreCeiling(r: Pick<RunResult, 'nests' | 'deaths' | 'level' | 'pickups' | 'goldPickups' | 'hops'>): number {
  // an attempt (one life, or one nest) can add at most 12 rows × 10; the attempt still running when the run ends counts too (a quit)
  const attempts = r.nests + r.deaths + (r.deaths < RULES.lives ? 1 : 0);
  const rows = Math.min(r.hops, RULES.rowsPerAttempt * attempts);
  return rows * RULES.rowPoints + r.nests * (RULES.nestBase + RULES.nestTimeMax) + (r.level - 1) * RULES.levelBonus + (r.pickups - r.goldPickups) * RULES.pickup + r.goldPickups * RULES.gold;
}

/**
 * Is this finished run believable? `elapsedMs` is the SERVER's stopwatch between run.start and run.finish.
 * Hard failures reject the run; softer oddities only add a flag (kept with the score so the owner can look).
 */
export function validateRun(r: RunResult, elapsedMs: number): Verdict {
  const no = (reason: string): Verdict => ({ ok: false, reason });
  if (elapsedMs < 0 || elapsedMs > LIMITS.runExpireMs) return no('expired');
  // the level is exactly what the nests say, and a run can't have more lives lost than it has
  if (r.level !== 1 + Math.floor(r.nests / RULES.nestsPerLevel)) return no('level');
  if (r.goldPickups > r.pickups) return no('gold');
  // time: the player can't have played longer than the server watched (pausing makes it shorter, never longer)
  if (r.timeMs > elapsedMs + LIMITS.toleranceMs) return no('time_server');
  // hopping: every hop takes 0.14 s, every nest needs 12 hops up, every death takes a second
  if (r.hops * RULES.hopMs > r.timeMs + 2 * RULES.hopMs) return no('hop_rate');
  if (r.hops < r.nests * RULES.rowsPerAttempt) return no('hops_min');
  if (r.hops * RULES.hopMs + r.deaths * RULES.deathMs > r.timeMs + 2 * RULES.hopMs + 500) return no('time_floor');
  // tokens appear at most once every 1.6 s
  if (r.pickups > Math.floor(r.timeMs / RULES.tokenEveryMs) + 2) return no('pickup_rate');
  // the score can't exceed what these statistics allow
  if (r.score > scoreCeiling(r)) return no('score');
  // streaks: a streak is a run of nests with no death between; deaths cut the nests into at most deaths+1 streaks
  if (r.bestStreak > r.nests) return no('streak');
  if (r.bestStreak * (r.deaths + 1) < r.nests) return no('streak');
  if (r.deaths === 0 && r.bestStreak !== r.nests) return no('streak');
  // fastest crossing: five nests on level 1 with no life lost
  if (r.firstFiveNestsMs !== null) {
    if (r.nests < RULES.nestsPerLevel || r.bestStreak < RULES.nestsPerLevel) return no('fastest_nests');
    if (r.firstFiveNestsMs > r.timeMs) return no('fastest_time');
    if (r.firstFiveNestsMs > elapsedMs + LIMITS.toleranceMs) return no('fastest_server');
    if (r.firstFiveNestsMs < LIMITS.minFastestMs) return no('fastest_min');
    if (r.hops < RULES.nestsPerLevel * RULES.rowsPerAttempt || (r.hops - 1) * RULES.hopMs > r.timeMs + 2 * RULES.hopMs) return no('fastest_hops');
  }
  const flags: string[] = [];
  if (r.firstFiveNestsMs !== null && r.firstFiveNestsMs < LIMITS.flagFastestMs) flags.push('fast_nests');
  if (r.timeMs > 0 && r.score / (r.timeMs / 1000) > LIMITS.flagScorePerSec) flags.push('score_rate');
  if (r.pickups >= 10 && r.goldPickups / r.pickups > 0.5) flags.push('gold_ratio');
  if (r.timeMs + LIMITS.toleranceMs < elapsedMs - 20 * 60_000) flags.push('long_pause'); // paused for 20+ minutes: odd but harmless
  return { ok: true, flags };
}

/** The value each board records for a run (null = this run doesn't count on that board). */
export function boardValues(r: RunResult): { score: number | null; fastest: number | null; streak: number | null } {
  return {
    score: r.score > 0 ? r.score : null,
    fastest: r.firstFiveNestsMs,
    streak: r.bestStreak >= 1 ? r.bestStreak : null,
  };
}
