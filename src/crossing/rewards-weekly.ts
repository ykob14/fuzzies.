/**
 * Fuzzy Crossing weekly boards — the parts the app and the server share (DOM-free, no imports from the app):
 * the week maths (ISO weeks, UTC, Monday 00:00 — the SERVER decides which week it is), the three boards and the reward table.
 *
 * Boards (one best result per player per board per week, Classic runs only):
 *   score   — highest score of a single run
 *   fastest — fastest time to fill all 5 nests on level 1 without losing a life ("fastest crossing")
 *   streak  — most nests filled in a row without losing a life, in one run ("longest survival streak")
 */
import { CHARACTER_BY_ID } from './characters';
import { COSMETIC_BY_ID } from './cosmetics';

export type Board = 'score' | 'fastest' | 'streak';
export const BOARD_IDS: Board[] = ['score', 'fastest', 'streak'];
export const isBoard = (v: unknown): v is Board => typeof v === 'string' && (BOARD_IDS as string[]).includes(v);
export interface BoardMeta { id: Board; title: string; short: string; blurb: string; /** which end of the scale wins */ better: 'high' | 'low' }
export const BOARDS: Record<Board, BoardMeta> = {
  score: { id: 'score', title: 'Highest score', short: 'Score', blurb: 'The best score of a single run.', better: 'high' },
  fastest: { id: 'fastest', title: 'Fastest crossing', short: 'Fastest', blurb: 'Fill all 5 nests of level 1 without losing a life — the quickest time wins.', better: 'low' },
  streak: { id: 'streak', title: 'Survival streak', short: 'Streak', blurb: 'Most nests filled in a row without losing a life.', better: 'high' },
};

// ---------- weeks (ISO 8601, in UTC — no daylight saving to worry about) ----------
export const DAY_MS = 86_400_000;
export const WEEK_MS = 7 * DAY_MS;
/** Monday 00:00 UTC of the week that contains `ms` */
export function weekStart(ms: number): number {
  const d = new Date(ms);
  const sinceMonday = (d.getUTCDay() + 6) % 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - sinceMonday);
}
/** "2026-W42": the ISO week-year is the year of the week's Thursday (so Dec 29 2025 is already 2026-W01) */
export function weekKey(ms: number): string {
  const thu = weekStart(ms) + 3 * DAY_MS;
  const y = new Date(thu).getUTCFullYear();
  const n = Math.floor((thu - Date.UTC(y, 0, 1)) / WEEK_MS) + 1;
  return `${y}-W${String(n).padStart(2, '0')}`;
}
/** [start, end) of a week key in ms, or null when the key isn't a real ISO week */
export function weekRange(key: string): { start: number; end: number } | null {
  const m = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!m) return null;
  const y = Number(m[1]), w = Number(m[2]);
  if (w < 1 || w > 53) return null;
  const start = weekStart(Date.UTC(y, 0, 4)) + (w - 1) * WEEK_MS; // Jan 4th is always in week 1
  return weekKey(start) === key ? { start, end: start + WEEK_MS } : null;
}
export const prevWeek = (key: string): string | null => { const r = weekRange(key); return r ? weekKey(r.start - WEEK_MS) : null; };
/** How many whole weeks `key` is before `now`'s week (0 = this week, 1 = last week …), or null for a bad / future key */
export function weeksAgo(key: string, now: number): number | null {
  const r = weekRange(key);
  if (!r || r.start > weekStart(now)) return null;
  return Math.round((weekStart(now) - r.start) / WEEK_MS);
}
/** "Oct 12 – 18" for a week key */
export function weekLabel(key: string): string {
  const r = weekRange(key);
  if (!r) return key;
  const a = new Date(r.start), b = new Date(r.end - DAY_MS);
  const mon = (d: Date) => d.toLocaleString('en', { month: 'short', timeZone: 'UTC' });
  return a.getUTCMonth() === b.getUTCMonth() ? `${mon(a)} ${a.getUTCDate()} – ${b.getUTCDate()}` : `${mon(a)} ${a.getUTCDate()} – ${mon(b)} ${b.getUTCDate()}`;
}

// ---------- rewards ----------
/** A finished week pays by final rank. Each tier includes what the tiers below it give (ranks inside the top 10 are also in the top 25 …). */
export const TIERS = [1, 3, 10, 25, 100] as const;
export type Tier = (typeof TIERS)[number];
export const tierOf = (rank: number): Tier | null => (Number.isInteger(rank) && rank >= 1 ? TIERS.find((t) => rank <= t) ?? null : null);

export interface WeeklyReward { tier: Tier; trophy: string; characters: string[]; cosmetics: string[]; coins: number }
interface TierDef { characters: string[]; cosmetics: string[]; coins: number; name: string; blurb: string }
// Fuzzies by weekly placing: rainbow = weekly top 10, nebula = weekly #1; trail-neon = top 25, cele-champion = top 10 (characters.ts / cosmetics.ts).
export const TIER_DEFS: Record<Tier, TierDef> = {
  1: { characters: ['nebula', 'rainbow'], cosmetics: ['trail-neon', 'cele-champion'], coins: 1000, name: 'Champion', blurb: 'Weekly #1' },
  3: { characters: ['rainbow'], cosmetics: ['trail-neon', 'cele-champion'], coins: 600, name: 'Podium', blurb: 'Top 3' },
  10: { characters: ['rainbow'], cosmetics: ['trail-neon', 'cele-champion'], coins: 400, name: 'Top 10', blurb: 'Top 10' },
  25: { characters: [], cosmetics: ['trail-neon'], coins: 300, name: 'Top 25', blurb: 'Top 25' },
  100: { characters: [], cosmetics: [], coins: 200, name: 'Participant', blurb: 'Top 100' },
};
export const trophyId = (week: string, board: Board, tier: Tier): string => `week-${week}-${board}-${tier}`;
export function parseTrophy(id: string): { week: string; board: Board; tier: Tier } | null {
  const m = /^week-(\d{4}-W\d{2})-(score|fastest|streak)-(\d+)$/.exec(id);
  if (!m || !weekRange(m[1])) return null;
  const tier = Number(m[3]) as Tier;
  return TIERS.includes(tier) ? { week: m[1], board: m[2] as Board, tier } : null;
}
export function trophyName(id: string): string {
  const t = parseTrophy(id);
  return t ? `${TIER_DEFS[t.tier].name} · ${BOARDS[t.board].title} · ${weekLabel(t.week)}` : id;
}
/** what a final rank earns on one board of one finished week (null = outside the top 100) */
export function rewardFor(week: string, board: Board, rank: number): WeeklyReward | null {
  const tier = tierOf(rank);
  if (!tier) return null;
  const d = TIER_DEFS[tier];
  return { tier, trophy: trophyId(week, board, tier), characters: [...d.characters], cosmetics: [...d.cosmetics], coins: d.coins };
}
/** a short sentence for the rewards panel */
export function tierText(tier: Tier): string {
  const d = TIER_DEFS[tier];
  const bits = [`A ${d.name.toLowerCase()} trophy`, ...d.characters.map((id) => CHARACTER_BY_ID[id]?.name ?? id), ...d.cosmetics.map((id) => COSMETIC_BY_ID[id]?.name ?? id), `${d.coins} coins`];
  return bits.join(' · ');
}

// ---------- formatting ----------
export function formatValue(board: Board, v: number): string {
  if (board === 'fastest') return `${(v / 1000).toFixed(2)} s`;
  if (board === 'streak') return `${v} nest${v === 1 ? '' : 's'}`;
  return v.toLocaleString('en');
}
export function formatLeft(ms: number): string {
  const m = Math.max(0, Math.floor(ms / 60_000));
  const d = Math.floor(m / 1440), hh = Math.floor((m % 1440) / 60), mm = m % 60;
  return d > 0 ? `${d}d ${hh}h` : hh > 0 ? `${hh}h ${mm}m` : `${mm}m`;
}
