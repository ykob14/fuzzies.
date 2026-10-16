/**
 * Daily + weekly missions — DOM-free and pure (they work on a CrossingSave), so they are easy to test. Three daily missions rotate
 * every day (one easy, one medium, one a bit harder — all doable in a short session), three weekly ones every week. Progress comes from
 * the same events the game reports (`CrossingEvent`). Rewards are coins + Fuzzy Pass XP; finishing all three dailies gives a bonus.
 */
import type { CrossingEvent } from './store';
import type { CrossingSave } from './save';
import { FEATURES } from './features';
import { XP } from './pass';

export type Metric = 'hops' | 'rows' | 'pickups' | 'gold' | 'nests' | 'levels' | 'flawless' | 'runs' | 'score' | 'deaths' | 'splashes' | 'crashes' | 'trains' | 'distinct' | 'endlessRows' | 'endlessRecord';
export interface MissionDef {
  id: string; kind: 'daily' | 'weekly'; tier: 'easy' | 'medium' | 'hard';
  text: string; metric: Metric; target: number; coins: number; icon: string;
  /** 'max' = best single value (e.g. score in one game); default adds up */
  agg?: 'sum' | 'max';
  needs?: keyof typeof FEATURES;
}
const d = (id: string, tier: MissionDef['tier'], text: string, metric: Metric, target: number, icon: string, extra: Partial<MissionDef> = {}): MissionDef => ({ id, kind: 'daily', tier, text, metric, target, icon, coins: tier === 'easy' ? 30 : tier === 'medium' ? 50 : 80, ...extra });
const w = (id: string, text: string, metric: Metric, target: number, icon: string, coins: number, extra: Partial<MissionDef> = {}): MissionDef => ({ id, kind: 'weekly', tier: coins >= 300 ? 'hard' : coins >= 200 ? 'medium' : 'easy', text, metric, target, icon, coins, ...extra });

export const DAILY_POOL: MissionDef[] = [
  d('d-rows-40', 'easy', 'Cross 40 lanes', 'rows', 40, '🛣️'),
  d('d-pickups-20', 'easy', 'Collect 20 coins', 'pickups', 20, '🪙'),
  d('d-nests-3', 'easy', 'Fill 3 nests', 'nests', 3, '🪺'),
  d('d-runs-3', 'easy', 'Play 3 games', 'runs', 3, '🎮'),
  d('d-hops-150', 'easy', 'Hop 150 times', 'hops', 150, '🐾'),
  d('d-rows-120', 'medium', 'Cross 120 lanes', 'rows', 120, '🛣️'),
  d('d-pickups-50', 'medium', 'Collect 50 coins', 'pickups', 50, '🪙'),
  d('d-nests-8', 'medium', 'Fill 8 nests', 'nests', 8, '🪺'),
  d('d-levels-3', 'medium', 'Clear 3 levels', 'levels', 3, '🏁'),
  d('d-score-800', 'medium', 'Score 800 in one game', 'score', 800, '⭐', { agg: 'max' }),
  d('d-distinct-3', 'medium', 'Play with 3 different Fuzzies', 'distinct', 3, '🎭', { agg: 'max' }),
  d('d-gold-3', 'medium', 'Collect 3 golden Fuzzies', 'gold', 3, '🌟'),
  d('d-nests-15', 'hard', 'Fill 15 nests', 'nests', 15, '🪺'),
  d('d-score-2000', 'hard', 'Score 2,000 in one game', 'score', 2000, '🏆', { agg: 'max' }),
  d('d-flawless-5', 'hard', 'Clear 5 levels without losing a life', 'flawless', 5, '💎', { needs: 'worlds' }),
  d('d-trains-10', 'hard', 'Survive 10 train crossings', 'trains', 10, '🚆', { needs: 'trains' }),
  d('d-endless-record', 'hard', 'Beat your Endless record', 'endlessRecord', 1, '♾️', { agg: 'max', needs: 'endless' }),
  d('d-endless-60', 'medium', 'Reach 60 in Endless Crossing', 'endlessRows', 60, '♾️', { agg: 'max', needs: 'endless' }),
];
export const WEEKLY_POOL: MissionDef[] = [
  w('w-nests-40', 'Fill 40 nests', 'nests', 40, '🪺', 150),
  w('w-rows-600', 'Cross 600 lanes', 'rows', 600, '🛣️', 150),
  w('w-pickups-300', 'Collect 300 coins', 'pickups', 300, '🪙', 200),
  w('w-runs-20', 'Play 20 games', 'runs', 20, '🎮', 150),
  w('w-levels-15', 'Clear 15 levels', 'levels', 15, '🏁', 200),
  w('w-score-4000', 'Score 4,000 in one game', 'score', 4000, '🏆', 300, { agg: 'max' }),
  w('w-gold-15', 'Collect 15 golden Fuzzies', 'gold', 15, '🌟', 250),
  w('w-flawless-10', 'Clear 10 levels without losing a life', 'flawless', 10, '💎', 300, { needs: 'worlds' }),
  w('w-trains-40', 'Survive 40 train crossings', 'trains', 40, '🚆', 300, { needs: 'trains' }),
  w('w-endless-150', 'Reach 150 in Endless Crossing', 'endlessRows', 150, '♾️', 300, { agg: 'max', needs: 'endless' }),
];
export const MISSION_BY_ID: Record<string, MissionDef> = Object.fromEntries([...DAILY_POOL, ...WEEKLY_POOL].map((m) => [m.id, m]));
export const ALL_DAILY_BONUS = 60;

// ---------- deterministic choice ----------
function hash(str: string): number { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed: number): () => number { let a = seed || 1; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const available = (m: MissionDef): boolean => !m.needs || FEATURES[m.needs];

/** today's three: one easy, one medium, and a third that alternates between easy-plus and hard so the day never feels like a chore */
export function pickDaily(day: string): string[] {
  const r = rng(hash('daily:' + day));
  const of = (tier: MissionDef['tier'], not: string[]) => { const pool = DAILY_POOL.filter((m) => m.tier === tier && available(m) && !not.includes(m.metric)); return pool[Math.floor(r() * pool.length)]; };
  const a = of('easy', []);
  const b = of('medium', [a.metric]);
  const c = of(r() < 0.5 ? 'hard' : 'medium', [a.metric, b.metric]) ?? of('medium', [a.metric, b.metric]);
  return [a, b, c].filter(Boolean).map((m) => m.id);
}
export function pickWeekly(week: string): string[] {
  const r = rng(hash('weekly:' + week));
  const pool = WEEKLY_POOL.filter(available), out: MissionDef[] = [];
  while (out.length < 3 && pool.length) { const i = Math.floor(r() * pool.length); const m = pool.splice(i, 1)[0]; if (!out.some((x) => x.metric === m.metric)) out.push(m); }
  return out.map((m) => m.id);
}
/** ISO week key like 2026-W42 for a date (local time) */
export function weekKey(date = new Date()): string {
  const t = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dow = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dow);
  const y = t.getUTCFullYear();
  const week = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${String(week).padStart(2, '0')}`;
}

// ---------- state ----------
/** Roll the day/week over (new missions, progress reset). Returns true when something changed. */
export function rollMissions(s: CrossingSave, day: string, week: string): boolean {
  const m = s.missions;
  let changed = false;
  if (m.day !== day || m.ids.length === 0) { m.day = day; m.ids = pickDaily(day); m.progress = {}; m.claimed = []; changed = true; }
  if (m.week !== week || m.weekIds.length === 0) { m.week = week; m.weekIds = pickWeekly(week); m.weekProgress = {}; m.weekClaimed = []; changed = true; }
  return changed;
}

/** what an event adds to which metrics: [metric, amount] */
export function metricsOf(e: CrossingEvent): [Metric, number][] {
  switch (e.kind) {
    case 'hop': return [['hops', 1]];
    case 'advance': return [['rows', 1]];
    case 'pickup': return e.gold ? [['pickups', 1], ['gold', 1]] : [['pickups', 1]];
    case 'nest': return [['nests', 1]];
    case 'death': return [['deaths', 1], ...(e.how === 'splash' ? [['splashes', 1] as [Metric, number]] : []), ...(e.how === 'crash' ? [['crashes', 1] as [Metric, number]] : [])];
    case 'levelClear': return [['levels', 1], ...(e.flawless ? [['flawless', 1] as [Metric, number]] : [])];
    case 'trainPassed': return [['trains', 1]];
    case 'run': return [['runs', 1], ['score', e.score], ...(e.mode === 'endless' ? [['endlessRows', e.rows ?? e.score] as [Metric, number], ['endlessRecord', e.record ? 1 : 0] as [Metric, number]] : [])];
    default: return [];
  }
}
/** apply an event to today's and this week's progress; `distinctToday` is the number of different Fuzzies used today (kept by the caller via progress keys) */
export function applyEvent(s: CrossingSave, e: CrossingEvent): void {
  const bump = (ids: string[], progress: Record<string, number>, claimed: string[]) => {
    for (const id of ids) {
      const def = MISSION_BY_ID[id];
      if (!def || claimed.includes(id)) continue;
      for (const [metric, amount] of metricsOf(e)) {
        if (metric !== def.metric) continue;
        progress[id] = def.agg === 'max' ? Math.max(progress[id] ?? 0, amount) : (progress[id] ?? 0) + amount;
      }
    }
  };
  bump(s.missions.ids, s.missions.progress, s.missions.claimed);
  bump(s.missions.weekIds, s.missions.weekProgress, s.missions.weekClaimed);
}
/** "play with N different Fuzzies": remember who played (as `_f:<id>` keys) and set the count */
export function noteFuzzy(s: CrossingSave, characterId: string): void {
  for (const [ids, progress, claimed] of [[s.missions.ids, s.missions.progress, s.missions.claimed], [s.missions.weekIds, s.missions.weekProgress, s.missions.weekClaimed]] as const) {
    progress[`_f:${characterId}`] = 1;
    const n = Object.keys(progress).filter((k) => k.startsWith('_f:')).length;
    for (const id of ids) if (MISSION_BY_ID[id]?.metric === 'distinct' && !claimed.includes(id)) progress[id] = Math.max(progress[id] ?? 0, n);
  }
}

export interface MissionView { def: MissionDef; progress: number; done: boolean; claimed: boolean }
export function viewMissions(s: CrossingSave, which: 'daily' | 'weekly'): MissionView[] {
  const ids = which === 'daily' ? s.missions.ids : s.missions.weekIds, prog = which === 'daily' ? s.missions.progress : s.missions.weekProgress, cl = which === 'daily' ? s.missions.claimed : s.missions.weekClaimed;
  return ids.map((id) => MISSION_BY_ID[id]).filter(Boolean).map((def) => ({ def, progress: Math.min(def.target, prog[def.id] ?? 0), done: (prog[def.id] ?? 0) >= def.target, claimed: cl.includes(def.id) }));
}
export const claimable = (s: CrossingSave): string[] => [...viewMissions(s, 'daily'), ...viewMissions(s, 'weekly')].filter((v) => v.done && !v.claimed).map((v) => v.def.id);

/** Claim one finished mission. Returns what it paid, or null if it can't be claimed. The all-three-daily bonus is included when this was the last. */
export function claimMission(s: CrossingSave, id: string): { coins: number; xp: number; bonus: number } | null {
  const def = MISSION_BY_ID[id];
  if (!def) return null;
  const weekly = def.kind === 'weekly';
  const ids = weekly ? s.missions.weekIds : s.missions.ids, prog = weekly ? s.missions.weekProgress : s.missions.progress, cl = weekly ? s.missions.weekClaimed : s.missions.claimed;
  if (!ids.includes(id) || cl.includes(id) || (prog[id] ?? 0) < def.target) return null;
  cl.push(id);
  s.stats.missionsDone++;
  let bonus = 0;
  if (!weekly && s.missions.ids.length === 3 && s.missions.ids.every((x) => s.missions.claimed.includes(x))) bonus = ALL_DAILY_BONUS;
  return { coins: def.coins + bonus, xp: weekly ? XP.weeklyMission : XP.mission, bonus };
}
