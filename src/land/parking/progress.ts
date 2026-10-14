/**
 * Fuzzies Parking Escape — PROGRESS & REWARDS (no DOM, no imports: the server's api/data.ts uses the same reward table).
 * Progress lives in the town (`LandState.parking`, saved and synced with it): the level you're on, the highest unlocked, stars,
 * best moves and times per level, which rewards were paid, the endless mode and the sound settings. Coins go into the town's
 * own balance once per level / milestone (for cloud accounts the server records each claim, so nothing pays twice).
 */
export const LEVELS = 500;
/** Coins (town coins) per reward — configurable. */
export const REWARDS = { normal: 20, challenging: 35, hard: 50, special: 75, milestone: 250, final: 2000, endless: 15, challenge: 60, timed: 45, ladderMilestone: 300, season: 40 };
/** the two extra ladders (Challenge: big crowded lots with an optional move limit; Timed Escape: a countdown on every lot) */
export const LADDER = 50;
/** a holiday's set of parking puzzles (the seasonal events of Fuzzies Land) */
export const SEASON_SET = 10;
export type LType = 'n' | 't' | 'm' | 'd' | 's';
export const TYPE_NAMES: Record<LType, string> = { n: 'Parking puzzle', t: 'Timed Escape', m: 'Limited Moves', d: 'Double Escape', s: 'Special Challenge' };

/** The level schedule (the generator builds each level to fit it): timed every 15 from 30, limited moves every 15 from 40, a double
 *  escape every 20 from 60, a special challenge at x13 and a milestone at every 25th level. Everything else has no timer. */
export function typeOf(i: number): LType {
  if (i % 25 === 0 || i % 25 === 13) return i >= 13 ? 's' : 'n';
  if (i >= 60 && i % 20 === 14) return 'd';
  if (i >= 30 && i % 15 === 7) return 't';
  if (i >= 40 && i % 15 === 11) return 'm';
  return 'n';
}
export const isMilestone = (i: number): boolean => i % 25 === 0 && i >= 25 && i <= LEVELS;
export const bandOf = (i: number): 'normal' | 'challenging' | 'hard' => (i <= 75 ? 'normal' : i <= 250 ? 'challenging' : 'hard');
export const BAND_NAMES = { normal: 'Normal', challenging: 'Challenging', hard: 'Hard' };
export const coinsForLevel = (i: number): number => (typeOf(i) !== 'n' ? REWARDS.special : REWARDS[bandOf(i)]);

/**
 * Reward keys: L<n> a level, M<n> the bonus at every 25th level, F500 the finale, E<n> an endless puzzle, C<n> / T<n> a Challenge /
 * Timed Escape lot (1–50), K<n> / U<n> the ladder bonus at their 25th and 50th, H<code> a holiday puzzle (see seasonKey). Null = no
 * such reward. Every key pays once per account, ever.
 */
export function coinsForKey(key: string): number | null {
  const m = /^([LMEFCTKUH])([1-9]\d{0,6})$/.exec(key); if (!m) return null;
  const n = Number(m[2]);
  switch (m[1]) {
    case 'L': return n <= LEVELS ? coinsForLevel(n) : null;
    case 'M': return isMilestone(n) ? REWARDS.milestone : null;
    case 'F': return n === LEVELS ? REWARDS.final : null;
    case 'C': return n <= LADDER ? REWARDS.challenge : null;
    case 'T': return n <= LADDER ? REWARDS.timed : null;
    case 'K': case 'U': return n === 25 || n === LADDER ? REWARDS.ladderMilestone : null;
    case 'H': return seasonOfKey(n) ? REWARDS.season : null;
    default: return REWARDS.endless;
  }
}
/** a holiday puzzle's key number: (year − 2000) · 10 000 + holiday index · 100 + puzzle (1–10) — e.g. 260305 */
export const seasonKey = (year: number, holiday: number, k: number): number => (year - 2000) * 10_000 + holiday * 100 + k;
export function seasonOfKey(n: number): { year: number; holiday: number; k: number } | null {
  const year = 2000 + Math.floor(n / 10_000), holiday = Math.floor((n % 10_000) / 100), k = n % 100;
  return year >= 2026 && year <= 2099 && holiday < 60 && k >= 1 && k <= SEASON_SET ? { year, holiday, k } : null;
}

/** the town decorations Parking Escape gives (each once): the reward key that earns it → the Land item */
export const DECOR_FOR_KEY: Record<string, string> = { M100: 'parkstar', K25: 'parksign', U25: 'parkclock', K50: 'parkbus', U50: 'parkwatch', [`F${LEVELS}`]: 'parkchamp' };

/** the garage: star-car shapes (vehicles.ts STAR_STYLES) unlock one per neighbourhood; drivers three at the start, then one per 25 levels */
export const STYLE_NAMES = ['Convertible', 'Sports car', 'SUV', 'Van', 'Pickup', 'Taxi'];
export const styleUnlockedAt = (k: number): number => k * 50 + 1;
export const driverUnlockedAt = (d: number): number => { const order = [0, 6, 9, 3, 4, 1, 2, 5, 7, 8, 10, 13, 11, 12, 14]; const i = order.indexOf(d); return i < 3 ? 1 : (i - 2) * 25; };
export const styleOpen = (p: ParkState, k: number): boolean => p.top >= styleUnlockedAt(k);
export const driverOpen = (p: ParkState, d: number): boolean => p.top >= driverUnlockedAt(d) || doneCount(p) >= driverUnlockedAt(d);

export interface ParkState {
  v: 1;
  /** the level on screen last time, the highest unlocked level */
  cur: number; top: number;
  /** one character per level: '0' not done, '1'–'3' stars */
  stars: string;
  /** best move count and best time (seconds) per level, 0 = none */
  best: number[]; time: number[];
  /** reward keys already paid (levels, milestones, the finale, endless) */
  paid: string[];
  /** rewards earned offline, asked for again next time (cloud accounts) */
  pending: string[];
  audio: { music: number; sfx: number; mute: boolean };
  endless: { n: number; done: number };
  /** the exclusive decoration for finishing level 500 */
  champ: boolean;
  plays: number;
  /** Relaxed: no timers or move limits on the journey's special levels (standard rewards) */
  relaxed: boolean;
  /** the Challenge and Timed Escape ladders: highest unlocked + stars per lot ('0'–'3') */
  ch: { top: number; stars: string }; tm: { top: number; stars: string };
  /** the garage: the star car's shape (index into STAR_STYLES), its driver (0–14) and paint ('' = classic pink, or a holiday paint id) */
  garage: { style: number; driver: number; paint: string };
  /** holiday paints earned by finishing a holiday's parking set (`halloween-2026` …) */
  paints: string[];
  /** holiday puzzles solved, per event key (`halloween-2026`: how many) */
  season: Record<string, number>;
  /**
   * the player's settings: camera angle (standard 3/4 view or a steeper top-down one), calm motion (no confetti / fireworks / glides,
   * gentler bounces — also on when the app's Reduce motion is), the drivers' little voices, and flat pictures instead of the 3D drivers
   * (for older phones)
   */
  prefs: { camera: 'standard' | 'top'; calm: boolean; voices: boolean; flat: boolean };
}
export function freshPark(): ParkState {
  return { v: 1, cur: 1, top: 1, stars: '0'.repeat(LEVELS), best: new Array(LEVELS).fill(0), time: new Array(LEVELS).fill(0), paid: [], pending: [], audio: { music: 0.55, sfx: 0.8, mute: false }, endless: { n: 1, done: 0 }, champ: false, plays: 0,
    relaxed: true, ch: { top: 1, stars: '0'.repeat(LADDER) }, tm: { top: 1, stars: '0'.repeat(LADDER) }, garage: { style: 0, driver: 0, paint: '' }, paints: [], season: {}, prefs: { camera: 'standard', calm: false, voices: true, flat: false } };
}
export function migratePark(p: Partial<ParkState> | undefined): ParkState {
  const f = freshPark();
  if (!p || typeof p !== 'object') return f;
  const arr = (a: unknown) => (Array.isArray(a) ? Array.from({ length: LEVELS }, (_, i) => (Number.isFinite(a[i]) ? Math.max(0, Math.round(a[i] as number)) : 0)) : new Array(LEVELS).fill(0));
  const stars = typeof p.stars === 'string' ? (p.stars.replace(/[^0-3]/g, '0') + f.stars).slice(0, LEVELS) : f.stars;
  const top = Math.max(1, Math.min(LEVELS, Math.round(Number(p.top) || 1)));
  return {
    v: 1, cur: Math.max(1, Math.min(top, Math.round(Number(p.cur) || 1))), top, stars, best: arr(p.best), time: arr(p.time),
    paid: Array.isArray(p.paid) ? [...new Set(p.paid.filter((k) => typeof k === 'string' && coinsForKey(k) !== null))] : [],
    pending: Array.isArray(p.pending) ? p.pending.filter((k) => typeof k === 'string' && coinsForKey(k) !== null) : [],
    audio: { music: clamp01(p.audio?.music, f.audio.music), sfx: clamp01(p.audio?.sfx, f.audio.sfx), mute: !!p.audio?.mute },
    endless: { n: Math.max(1, Math.round(Number(p.endless?.n) || 1)), done: Math.max(0, Math.round(Number(p.endless?.done) || 0)) },
    champ: !!p.champ, plays: Math.max(0, Math.round(Number(p.plays) || 0)),
    relaxed: typeof p.relaxed === 'boolean' ? p.relaxed : true,
    ch: ladderOf(p.ch), tm: ladderOf(p.tm),
    garage: { style: int(p.garage?.style, 0, 5), driver: int(p.garage?.driver, 0, 14), paint: typeof p.garage?.paint === 'string' && /^[a-z-]{0,24}\d{0,4}$/.test(p.garage.paint) ? p.garage.paint : '' },
    paints: Array.isArray(p.paints) ? [...new Set(p.paints.filter((x) => typeof x === 'string' && /^[a-z-]{1,24}\d{4}$/.test(x)))].slice(0, 200) : [],
    season: p.season && typeof p.season === 'object' ? Object.fromEntries(Object.entries(p.season).filter(([k, v]) => /^[a-z-]{1,24}\d{4}$/.test(k) && Number.isFinite(v)).slice(0, 200).map(([k, v]) => [k, int(v, 0, SEASON_SET)])) : {},
    prefs: { camera: p.prefs?.camera === 'top' ? 'top' : 'standard', calm: p.prefs?.calm === true, voices: p.prefs?.voices !== false, flat: p.prefs?.flat === true },
  };
}
const int = (v: unknown, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
const ladderOf = (l: { top?: number; stars?: string } | undefined) => ({ top: int(l?.top ?? 1, 1, LADDER), stars: typeof l?.stars === 'string' ? (l.stars.replace(/[^0-3]/g, '0') + '0'.repeat(LADDER)).slice(0, LADDER) : '0'.repeat(LADDER) });
const clamp01 = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : d);

export const starsOf = (p: ParkState, i: number): number => Number(p.stars[i - 1] ?? '0');
export const doneCount = (p: ParkState): number => [...p.stars].filter((c) => c !== '0').length;
export const totalStars = (p: ParkState): number => [...p.stars].reduce((n, c) => n + Number(c), 0);
export const unlocked = (p: ParkState, i: number): boolean => i >= 1 && i <= p.top;
export const endlessOpen = (p: ParkState): boolean => starsOf(p, LEVELS) > 0;

/**
 * Stars for a finished level: moves close to the best possible (the solver's count) = 3, a fair number = 2, any finish = 1. Timed
 * levels also need time to spare; limited-move levels measure against their own limit.
 */
export function starsFor(opt: number, moves: number, type: LType, lim?: number, timeLeft?: number): number {
  let s = moves <= opt + Math.max(1, Math.ceil(opt * 0.25)) ? 3 : moves <= opt * 2 + 2 ? 2 : 1;
  if (type === 'm' && lim) s = moves <= opt + Math.max(1, Math.ceil(opt * 0.25)) ? 3 : moves <= Math.ceil((opt + lim) / 2) ? 2 : 1;
  if (type === 't' && lim && timeLeft !== undefined) s = Math.min(s, timeLeft >= lim * 0.4 ? 3 : timeLeft >= lim * 0.15 ? 2 : 1);
  return s;
}

export interface Clear { stars: number; before: number; improved: boolean; first: boolean; bestMoves: boolean; bestTime: boolean; unlockedNext: boolean; rewards: { key: string; coins: number; why: string }[] }
/** Record a finished level; returns what changed and the rewards still to pay (each key once, ever). */
export function clearLevel(p: ParkState, i: number, r: { opt: number; type: LType; lim?: number; moves: number; seconds: number; timeLeft?: number; hinted?: boolean }): Clear {
  // a hint helps: three stars wait for a run on your own
  const stars = Math.min(r.hinted ? 2 : 3, starsFor(r.opt, r.moves, r.type, r.lim, r.timeLeft));
  const before = starsOf(p, i);
  const first = before === 0;
  if (stars > before) p.stars = p.stars.slice(0, i - 1) + String(stars) + p.stars.slice(i);
  const bestMoves = !p.best[i - 1] || r.moves < p.best[i - 1]; if (bestMoves) p.best[i - 1] = r.moves;
  const secs = Math.max(1, Math.round(r.seconds)); const bestTime = !p.time[i - 1] || secs < p.time[i - 1]; if (bestTime) p.time[i - 1] = secs;
  let unlockedNext = false;
  if (i === p.top && i < LEVELS) { p.top = i + 1; unlockedNext = true; }
  p.plays++;
  const rewards: Clear['rewards'] = [];
  const want = (key: string, why: string) => { if (!p.paid.includes(key) && !p.pending.includes(key)) rewards.push({ key, coins: coinsForKey(key)!, why }); };
  want(`L${i}`, `Level ${i}`);
  if (isMilestone(i)) want(`M${i}`, `Milestone ${i} bonus`);
  if (i === LEVELS) want(`F${LEVELS}`, 'Level 500 — Parking Champion!');
  return { stars, before, improved: stars > before, first, bestMoves, bestTime, unlockedNext, rewards };
}
/** an endless puzzle solved: the next one, and its reward key */
export function clearEndless(p: ParkState): { key: string; coins: number } {
  const key = `E${p.endless.n}`; p.endless.n++; p.endless.done++; p.plays++;
  return { key, coins: p.paid.includes(key) ? 0 : REWARDS.endless };
}
/** a Challenge / Timed Escape lot finished: stars, the next one unlocked, the rewards still to pay */
export function clearLadder(p: ParkState, mode: 'ch' | 'tm', i: number, r: { opt: number; moves: number; lim?: number; timeLeft?: number; hinted?: boolean }): { stars: number; before: number; unlockedNext: boolean; rewards: { key: string; coins: number; why: string }[] } {
  const L = p[mode];
  const stars = Math.min(r.hinted ? 2 : 3, starsFor(r.opt, r.moves, mode === 'tm' ? 't' : 'm', r.lim, r.timeLeft));
  const before = Number(L.stars[i - 1] ?? '0');
  if (stars > before) L.stars = L.stars.slice(0, i - 1) + String(stars) + L.stars.slice(i);
  let unlockedNext = false; if (i === L.top && i < LADDER) { L.top = i + 1; unlockedNext = true; }
  p.plays++;
  const rewards: { key: string; coins: number; why: string }[] = [];
  const want = (key: string, why: string) => { if (!p.paid.includes(key) && !p.pending.includes(key)) rewards.push({ key, coins: coinsForKey(key)!, why }); };
  const name = mode === 'ch' ? 'Challenge' : 'Timed Escape';
  want(`${mode === 'ch' ? 'C' : 'T'}${i}`, `${name} ${i}`);
  if (i === 25 || i === LADDER) want(`${mode === 'ch' ? 'K' : 'U'}${i}`, `${name} ${i} bonus`);
  return { stars, before, unlockedNext, rewards };
}
/** a holiday puzzle solved: the reward (once) and whether the holiday paint was just earned */
export function clearSeason(p: ParkState, event: string, year: number, holiday: number, k: number): { rewards: { key: string; coins: number; why: string }[]; paint: boolean } {
  p.season[event] = Math.max(p.season[event] ?? 0, k); p.plays++;
  const key = `H${seasonKey(year, holiday, k)}`;
  const rewards = p.paid.includes(key) || p.pending.includes(key) ? [] : [{ key, coins: REWARDS.season, why: `Holiday lot ${k}` }];
  const paint = k >= SEASON_SET && !p.paints.includes(event); if (paint) p.paints.push(event);
  return { rewards, paint };
}
/** mark a reward paid (whatever the server answered, it's settled) */
export function settle(p: ParkState, key: string): void { if (!p.paid.includes(key)) p.paid.push(key); p.pending = p.pending.filter((k) => k !== key); if (key === `F${LEVELS}`) p.champ = true; }
