/**
 * Endless Crossing — the stretch generator (DOM-free).
 *
 * An endless run is an infinite chain of STRETCHES. A stretch is one full screen of the board (rows 1–11 between the start row and
 * the nests), exactly the kind of thing the engine already plays: a `LevelDef` with one goal — reach a nest. Clearing it carries you
 * on to the next stretch with a quick transition (the engine plays one screen at a time; see `ui/screens/play.ts`). Distance is counted
 * in ROWS (12 per stretch: 11 lanes + the nest row).
 *
 *  - Everything is a pure function of (run seed, stretch number): the same seed always gives the same endless road, so the DAILY run
 *    is the same for everyone that (UTC) day.
 *  - Difficulty ramps with the stretch number (`rampOf`): faster lanes, tighter gaps, fewer safe rows, fewer open nests. New mechanics
 *    arrive one at a time (`FAMILIES` — each token has the stretch it first appears in) and the stretch that brings a new one is a
 *    little gentler and always contains it.
 *  - EVERY stretch is verified with the same fairness solver as the 150 world levels (`solver.ts`, a human reaction pause, a safety
 *    margin and a one-tick-late tolerance), from several start times — because after losing a life you start again at an arbitrary
 *    moment of the lanes' cycle. A layout the solver can't cross is thrown away and the next variant is tried; the variant is part of
 *    the deterministic chain, so every device ends up with the same stretch.
 */
import { COLS, rng, type Coin, type LevelDef, type RowSpec } from './sim';
import { rowFromToken, tokenTip } from './levels';
import { DT, Solver } from './solver';
import { crossFast, WORK_LIMIT } from './pathfind';
import { CHARACTERS } from './characters';

export const ROWS_PER_STRETCH = 12;
export const MAX_LIVES = 3;
/** a spare life every N stretches (never above MAX_LIVES) */
export const LIFE_EVERY = 5;
/** stretches until everything is at full speed (the road keeps getting the full mix after that) */
export const RAMP = 36;
export const STRETCH_TIMER = 30;
/** a stretch must be crossable by the solver's human within this many seconds (the lives' timer is 30 s, so a person has twice that) */
export const CROSS_LIMIT = 15;

/** the knobs of the difficulty curve */
export const TUNE = { pMax: 0.7, /** every Nth stretch is a breather */ breatherEvery: 4, breather: 0.18, /** the safe rows at the top end */ safeLate: 3 };
/** difficulty 0..1 of stretch n: climbs to TUNE.pMax by stretch RAMP, with a breather every few stretches so the road has a rhythm */
export const rampOf = (n: number): number => {
  const base = Math.min(1, n / RAMP) * TUNE.pMax;
  return Math.max(0, n >= 3 && n % TUNE.breatherEvery === TUNE.breatherEvery - 1 ? base - TUNE.breather : base);
};
/** distance in rows after `cleared` finished stretches and `progress` rows (0–12) in the current one */
export const distanceOf = (cleared: number, progress: number): number => cleared * ROWS_PER_STRETCH + Math.max(0, Math.min(ROWS_PER_STRETCH, progress));
/** lives after finishing stretch `n` (0-based): the lives you kept + a spare one every LIFE_EVERY stretches */
export const livesAfter = (kept: number, n: number): number => Math.min(MAX_LIVES, kept + ((n + 1) % LIFE_EVERY === 0 ? 1 : 0));

// ---------- seeds ----------
const mix = (a: number, b: number): number => {
  let h = (a ^ Math.imul(b + 0x9e3779b9, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
};
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
/** today's date in UTC ("2026-10-16") — the daily road is the same for everyone on that date, whatever their time zone */
export const utcDay = (now = Date.now()): string => new Date(now).toISOString().slice(0, 10);
export const dailySeed = (day = utcDay()): number => hashString(`fuzzy-endless:${day}`);
/** milliseconds until the next daily road (UTC midnight) */
export const msToNextDaily = (now = Date.now()): number => { const d = new Date(now); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - now; };
export const freshSeed = (): number => (Math.floor(Math.random() * 0xffffffff) ^ (Date.now() & 0xffff)) >>> 0 || 1;

// ---------- what can appear, and when ----------
type Mood = LevelDef['mood'];
type Weather = LevelDef['weather'];
interface Family {
  id: string;
  /** the world whose look (sky, ground, props) this stretch wears */
  world: number;
  label: string;
  /** [token, first stretch it can appear in] */
  land: [string, number][];
  water: [string, number][];
  /** safe rows with something to look at */
  rest: [string, number][];
  moods: Mood[];
  weather: Weather;
}
export const FAMILIES: Family[] = [
  { id: 'meadow', world: 1, label: 'Sunny Meadows', land: [['r', 0], ['rt', 2], ['rb', 4]], water: [['l', 0], ['p', 1], ['ps', 5]], rest: [], moods: ['day', 'day', 'golden'], weather: 'petals' },
  { id: 'city', world: 2, label: 'Busy Fuzzy City', land: [['rl', 3], ['r', 3], ['rb', 3], ['rs', 5], ['rh', 8], ['ra', 11]], water: [['l', 3], ['p', 3]], rest: [], moods: ['day', 'golden', 'dusk'], weather: 'none' },
  { id: 'forest', world: 3, label: 'Forest Adventure', land: [['bun', 6], ['deer', 7]], water: [['l', 6], ['t', 8], ['fb', 9]], rest: [['gb', 6]], moods: ['day', 'golden', 'fog'], weather: 'leaves' },
  { id: 'rail', world: 4, label: 'Railway Rush', land: [['rail', 10], ['r', 10], ['hc', 12]], water: [['l', 10], ['p', 10]], rest: [], moods: ['day', 'golden'], weather: 'none' },
  { id: 'snow', world: 6, label: 'Snowy Mountain', land: [['ice', 13], ['sled', 14], ['r', 13]], water: [['l', 13], ['raft', 15]], rest: [], moods: ['snow'], weather: 'snow' },
  { id: 'storm', world: 5, label: 'Stormy Valley', land: [['z', 16], ['r', 16], ['rt', 16], ['fl', 19]], water: [['l', 16], ['w', 17]], rest: [], moods: ['storm'], weather: 'rain' },
  { id: 'haunted', world: 7, label: 'Haunted Crossing', land: [['gh', 20], ['bat', 21]], water: [['l', 20], ['sw', 22]], rest: [['gb', 20]], moods: ['night', 'fog'], weather: 'mist' },
  { id: 'tropical', world: 8, label: 'Tropical Island', land: [['crab', 23], ['r', 23], ['tide', 26]], water: [['b', 24], ['dw', 25]], rest: [], moods: ['day', 'golden'], weather: 'none' },
  { id: 'neon', world: 9, label: 'Neon City', land: [['hov', 28], ['las', 29], ['cv', 30]], water: [], rest: [], moods: ['neon'], weather: 'none' },
];
/** from this stretch on, half the stretches mix everything the road has shown you */
export const LEGEND_FROM = 31;
const LEGEND: Family = { id: 'legend', world: 10, label: 'Legendary Fuzzy World', land: [], water: [], rest: [['gb', 6]], moods: ['golden', 'dusk', 'night', 'neon', 'snow', 'fog'], weather: 'embers' };
// the legend mix uses every token of every family
for (const f of FAMILIES) { LEGEND.land.push(...f.land); LEGEND.water.push(...f.water); }

/** the first stretch each token appears in */
export const TOKEN_FIRST: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  for (const f of FAMILIES) for (const [t, n] of [...f.land, ...f.water, ...f.rest]) m[t] = Math.min(m[t] ?? 99, n);
  return m;
})();
/** the mechanics introduced at stretch n (a token is "new" at the stretch its first row can appear in), for the UI's "NEW" line */
export const newTokensAt = (n: number): string[] => Object.entries(TOKEN_FIRST).filter(([, f]) => f === n).map(([t]) => t);

const avail = (xs: [string, number][], n: number): string[] => [...new Set(xs.filter(([, f]) => f <= n).map(([t]) => t))];

// ---------- one stretch ----------
export interface StretchPlan {
  n: number;
  family: Family;
  /** tokens bottom → top (row 11 … row 1) */
  tokens: string[];
  d: number; W: number;
  /** tokens that are new in this stretch */
  fresh: string[];
  variant: number;
}

function pickFamily(seed: number, n: number): { fam: Family; fresh: string[] } {
  const fresh = newTokensAt(n).filter((t) => t !== 'gb' || n === 6);
  // a new mechanic: go to the family that owns it
  if (fresh.length) {
    const own = FAMILIES.find((f) => [...f.land, ...f.water, ...f.rest].some(([t, first]) => first === n && fresh.includes(t)));
    if (own) return { fam: own, fresh };
  }
  const eligible = FAMILIES.filter((f) => [...f.land, ...f.water].some(([, first]) => first <= n));
  const draw = (nn: number, salt: number): Family => {
    const r = rng(mix(mix(seed, nn), 0xfa17 + salt));
    if (nn >= LEGEND_FROM && r() < 0.5) return LEGEND;
    const el = FAMILIES.filter((f) => [...f.land, ...f.water].some(([, first]) => first <= nn));
    // newer families a little more often
    const w = el.map((f, i) => 1 + i * 0.25);
    let x = r() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < el.length; i++) { x -= w[i]; if (x <= 0) return el[i]; }
    return el[el.length - 1];
  };
  let fam = draw(n, 0);
  // not the same look twice in a row when there's a choice (compares only raw draws, so it never depends on earlier stretches' results)
  if (n > 0 && eligible.length > 1 && fam === draw(n - 1, 0)) fam = draw(n, 1);
  return { fam, fresh: [] };
}

/** the design of stretch n of a run: which lanes, in which order */
export function planStretch(seed: number, n: number, variant = 0): StretchPlan {
  const { fam, fresh } = pickFamily(seed, n);
  // gentler when it teaches something new, and gentler after a layout the solver rejected a few times
  let p = rampOf(n);
  if (fresh.length) p = Math.max(0, p - 0.12);
  p = Math.max(0, p - 0.1 * Math.floor(variant / 4));
  const r = rng(mix(mix(seed, n), 0x1000 + variant));
  const land = avail(fam.land, n), water = avail(fam.water, n), rest = avail(fam.rest, n);
  const freshLand = fresh.filter((t) => land.includes(t) && !rest.includes(t) && !water.includes(t));
  const freshWater = fresh.filter((t) => water.includes(t));
  const freshRest = fresh.filter((t) => rest.includes(t) && !land.includes(t));
  const hasWater = water.length > 0 && (freshWater.length > 0 || (land.length === 0 ? true : r() < (n < 2 ? 0.8 : 0.6)));
  // safe rows get rarer as the road gets harder
  const S = p < 0.15 ? 4 : p < 0.55 ? 3 : TUNE.safeLate;
  const H = 11 - S;
  let nWater = 0;
  if (hasWater) nWater = land.length ? Math.max(2, Math.min(6, Math.round(H * (0.35 + 0.2 * r())))) : H;
  const nLand = H - nWater;
  // arrange: land block at the bottom, the median, water block on top, then sprinkle the other safe rows between
  const kinds: ('L' | 'W' | 'S')[] = [];
  for (let i = 0; i < nLand; i++) kinds.push('L');
  if (nLand > 0 && nWater > 0) kinds.push('S');
  for (let i = 0; i < nWater; i++) kinds.push('W');
  let extra = S - (nLand > 0 && nWater > 0 ? 1 : 0);
  let guard = 0;
  while (extra > 0 && guard++ < 60) {
    const at = Math.floor(r() * (kinds.length + 1));
    if (kinds[at] === 'S' || kinds[at - 1] === 'S') continue; // no two safe rows together
    kinds.splice(at, 0, 'S');
    extra--;
  }
  while (kinds.length < 11) kinds.splice(Math.floor(r() * (kinds.length + 1)), 0, 'S');
  // tokens: no long runs of the same lane and no pile-up of the timing-heavy ones (lasers, lightning, floods, trains…)
  const HEAVY = new Set(['las', 'z', 'fl', 'tide', 'rail', 'gh', 'cv', 'hov', 'ra']);
  const used: Record<string, number> = {};
  const pickFrom = (xs: string[], at: number, prev: string | undefined, prev2: string | undefined) => {
    let t = xs[Math.floor(r() * xs.length)];
    for (let tries = 0; tries < 8; tries++) {
      const heavyFull = HEAVY.has(t) && (used[t] ?? 0) >= 3;
      const run = t === prev && t === prev2;
      if (!heavyFull && !run && (xs.length === 1 || (used[t] ?? 0) < 5)) break;
      t = xs[Math.floor(r() * xs.length)];
    }
    void at;
    used[t] = (used[t] ?? 0) + 1;
    return t;
  };
  const tokens: string[] = [];
  kinds.forEach((k, i) => tokens.push(k === 'L' ? pickFrom(land, i, tokens[i - 1], tokens[i - 2]) : k === 'W' ? pickFrom(water, i, tokens[i - 1], tokens[i - 2]) : 'g'));
  // no run of more than four lanes without a safe row to stand on
  let run = 0;
  for (let i = 0; i < 11; i++) {
    if (kinds[i] === 'S') { run = 0; continue; }
    if (++run > 4) { kinds[i] = 'S'; tokens[i] = 'g'; run = 0; }
  }
  const pick = (xs: string[]) => xs[Math.floor(r() * xs.length)];
  // the new mechanic always shows up
  const force = (list: string[], kind: 'L' | 'W' | 'S') => {
    for (const t of list) {
      if (tokens.includes(t)) continue;
      const slots = kinds.map((k, i) => (k === kind ? i : -1)).filter((i) => i >= 0);
      if (slots.length) tokens[slots[Math.floor(r() * slots.length)]] = t;
    }
  };
  force(freshLand, 'L'); force(freshWater, 'W'); force(freshRest, 'S');
  // safe rows: coin trails and the odd grove (never two grove rows in a row)
  let coinRows = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (kinds[i] !== 'S' || tokens[i] !== 'g') continue;
    if (rest.length && r() < 0.3 && tokens[i - 1] !== 'gb' && i > 0) tokens[i] = pick(rest);
    else if (coinRows < 2 && r() < 0.6) { tokens[i] = 'gc'; coinRows++; }
  }
  return { n, family: fam, tokens, d: p, W: p, fresh, variant };
}

/** how open the nests are: all five early on, fewer as the road gets harder */
const nestsFor = (p: number, r: () => number): number[] => {
  const all = [1, 3, 5, 7, 9];
  const keep = p < 0.3 ? 5 : p < 0.65 ? 3 : 2;
  const pool = [...all];
  const out: number[] = [];
  while (out.length < keep) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return out.sort((a, b) => a - b);
};

export const stretchId = (seed: number, n: number): string => `e${seed.toString(36)}-${n}`;

/** build the LevelDef of a plan (not yet verified) */
export function buildStretch(seed: number, plan: StretchPlan): LevelDef {
  const { n, family, tokens, d, W } = plan;
  const r = rng(mix(mix(seed, n), 0x2000 + plan.variant));
  const rows: RowSpec[] = [];
  for (let i = 0; i < 11; i++) {
    const row = 11 - i;
    // lanes run the other way round from one stretch to the next so the road doesn't repeat itself
    rows[row - 1] = rowFromToken(tokens[i], row, r, d, W, family.world + n);
  }
  // collectibles along the way: a trail on each coin row and a few brave ones in the traffic
  const coins: Coin[] = [];
  tokens.forEach((t, i) => {
    if (t !== 'gc') return;
    const k = 3, c0 = Math.floor(r() * (COLS - k));
    for (let j = 0; j < k; j++) coins.push({ row: 11 - i, col: c0 + j, gold: j === 1 && r() < 0.3 });
  });
  const brave = rows.filter((x) => (x.surface === 'road' || x.surface === 'rail') && !x.signal && !x.train).map((x) => x.row);
  for (let k = 0; k < (d > 0.5 ? 2 : 1) && brave.length; k++) coins.push({ row: brave[Math.floor(r() * brave.length)], col: Math.floor(r() * COLS), gold: true });
  if (!coins.length) { // a stretch without a coin row or traffic still has a small trail on a safe row
    const safe = tokens.map((t, i) => ({ t, row: 11 - i })).filter((x) => x.t === 'g' || x.t === 'gb').map((x) => x.row);
    const row = safe.length ? safe[Math.floor(r() * safe.length)] : 6;
    const c0 = 1 + Math.floor(r() * (COLS - 5));
    for (let j = 0; j < 3; j++) { const blocked = rows[row - 1]?.blocks?.includes(c0 + j); if (!blocked) coins.push({ row, col: c0 + j, gold: j === 1 }); }
    if (!coins.length) coins.push({ row: 12 - 1, col: 5, gold: false });
  }
  const seen = new Set<string>();
  const uniq = coins.filter((c) => { const s = `${c.row}:${c.col}`; if (seen.has(s)) return false; seen.add(s); return true; });
  const mood = family.moods[Math.floor(r() * family.moods.length)];
  const tip = plan.fresh.map(tokenTip).find(Boolean) ?? `${family.label}: keep going!`;
  return {
    id: stretchId(seed, n), world: family.world, level: n + 1, name: `Stretch ${n + 1}`, tip, seed: mix(seed, n),
    rows, nests: nestsFor(d, r), goal: { nests: 1 }, lives: MAX_LIVES, timer: STRETCH_TIMER,
    coins: uniq, teleports: [], mood, weather: family.id === 'storm' && n >= 24 ? 'storm' : family.weather,
  };
}

// ---------- the proof ----------
/**
 * Moments (seconds into a stretch) a life may start at: the first life starts at 0, later ones whenever the last one ended (a life lasts at
 * most 30 s + the 1 s fall, and a stretch has at most 3 lives, so no life starts later than ~63 s). The grid is 3 s apart. Because a player
 * can also simply wait at the start, "crossable within 15 s from every grid point" means "crossable within 18 s from ANY moment in between".
 */
export const OFFSETS = [0, 1.5, 4.5, 7.5, 10.5, 13.5, 16.5, 19.5, 22.5, 25.5, 28.5, 31.5, 34.5, 37.5, 40.5, 43.5, 46.5, 49.5, 52.5, 55.5, 58.5, 61.5, 64.5];
export interface Proof { ok: boolean; lost: number; worst: number; mean: number }
/** can the human model of the solver get across, with its margin, from every one of these start times? (`bfs` = the slower breadth-first search of the level checker, for cross-checks) */
export function proveStretch(def: LevelDef, offsets: number[] = OFFSETS, bfs = false, limit = CROSS_LIMIT, work = WORK_LIMIT): Proof {
  let lost = 0, worst = 0, sum = 0, n = 0;
  for (const o of offsets) {
    const k0 = Math.round(o / DT);
    const s = new Solver(def);
    const f = bfs ? s.cross(k0, limit) : crossFast(s, k0, limit, true, work);
    if (!f) { lost++; continue; }
    const secs = (f.k - k0) * DT;
    worst = Math.max(worst, secs); sum += secs; n++;
  }
  return { ok: lost === 0, lost, worst, mean: n ? sum / n : 0 };
}

export interface Stretch { def: LevelDef; plan: StretchPlan; proof: Proof; /** layouts thrown away before this one worked */ rejected: number }
const MAX_VARIANTS = 40;

/** the verified stretch n of a run, one solver pass per step so a phone can interleave it with playing */
export function* stretchSteps(seed: number, n: number, offsets: number[] = OFFSETS): Generator<void, Stretch, void> {
  for (let variant = 0; variant < MAX_VARIANTS; variant++) {
    const plan = planStretch(seed, n, variant);
    const def = buildStretch(seed, plan);
    let lost = 0, worst = 0, sum = 0, cnt = 0;
    for (const o of offsets) {
      const k0 = Math.round(o / DT);
      const f = crossFast(new Solver(def), k0, CROSS_LIMIT);
      if (!f) { lost++; break; }
      const secs = (f.k - k0) * DT;
      worst = Math.max(worst, secs); sum += secs; cnt++;
      yield;
    }
    if (!lost) return { def, plan, proof: { ok: true, lost: 0, worst, mean: cnt ? sum / cnt : 0 }, rejected: variant };
  }
  throw new Error(`endless: no crossable layout for stretch ${n}`);
}
const cache = new Map<string, Stretch>();
const keyOf = (seed: number, n: number) => `${seed}:${n}`;
/** the verified stretch n (cached) */
export function stretch(seed: number, n: number): Stretch {
  const hit = cache.get(keyOf(seed, n));
  if (hit) return hit;
  const it = stretchSteps(seed, n);
  let r = it.next();
  while (!r.done) r = it.next();
  rememberStretch(seed, n, r.value);
  return r.value;
}
export function rememberStretch(seed: number, n: number, s: Stretch): void {
  if (cache.size > 64) cache.delete(cache.keys().next().value as string);
  cache.set(keyOf(seed, n), s);
}
export const cachedStretch = (seed: number, n: number): Stretch | undefined => cache.get(keyOf(seed, n));
/** the same stretch with the lives you actually have left */
export const withLives = (def: LevelDef, lives: number): LevelDef => (def.lives === lives ? def : { ...def, lives });

// ---------- the Fuzzies that Endless opens ----------
export interface EndlessReward { id: string; name: string; rows: number }
/** the Fuzzies won by distance, nearest first (from the collection's own data, so the two can never disagree) */
export const endlessRewards = (): EndlessReward[] =>
  CHARACTERS.filter((c) => c.unlock.kind === 'endless').map((c) => ({ id: c.id, name: c.name, rows: (c.unlock as { score: number }).score })).sort((a, b) => a.rows - b.rows);
