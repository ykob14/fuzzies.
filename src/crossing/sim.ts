/**
 * Fuzzy Crossing — the exact rules of a WORLD level (DOM-free, no imports from the app).
 *
 * Everything that moves or switches on in a world level is a pure function of the level's clock `t` (seconds since the
 * level started). The game engine (`game/crossing.ts`) and the fairness solver (`tools/crossing/levels-check.ts`) both call
 * these functions, so what the solver proves is what the player gets.
 *
 * Board: 11 columns × 13 rows. Row 0 = nests, row 12 = start, rows 1–11 = one RowSpec each.
 * Player body (left edge `x`): [x + 0.22, x + 0.78]. Riding uses the centre `x + 0.5`.
 */

export const COLS = 11;
export const ROWS = 13;
export const START_ROW = 12;
export const START_COL = 5;
/** objects keep moving this far past the board edges before they wrap round (same as Classic) */
export const OFFSCREEN = 12;
/** one hop takes this long (seconds) */
export const HOP_TIME = 0.14;
/** every telegraphed hazard warns at least this long before it can hurt (checked by the solver) */
export const MIN_WARN = 0.8;

export type Surface = 'grass' | 'road' | 'river' | 'rail' | 'ice' | 'conveyor';
/** riders (on river rows) and hazards (everywhere else) */
export type ObjKind =
  | 'log' | 'pad' | 'turtle' | 'boat' | 'bridge' | 'raft'
  | 'car' | 'truck' | 'bus' | 'sports' | 'ambulance' | 'taxi' | 'train' | 'handcar'
  | 'deer' | 'rabbit' | 'duck' | 'sled' | 'ghost' | 'bat' | 'crab' | 'hover' | 'boulder';
export type Hazard = 'crash' | 'train' | 'zap' | 'splash';

export interface ObjSpec {
  /** position at t = 0 (left edge, in cells) */
  x: number;
  len: number;
  kind: ObjKind;
  color: string;
  /** 0..1 phase for sinking / ghost fading / sideways scuttle */
  phase?: number;
  /** this rider sinks/dives on the row's `sink` schedule */
  sinks?: boolean;
}

export interface RowSpec {
  row: number;
  surface: Surface;
  /** cells per second; the sign is the direction (0 = the objects don't travel) */
  speed: number;
  objs: ObjSpec[];
  /** the length of one wrap-around loop of the lane (≥ board + both off-screen stretches) */
  span: number;
  /** wrap window starts here */
  start: number;
  /** gusts of wind: speed × (1 + amp·sin(2πt/period)) */
  wind?: { amp: number; period: number };
  /** traffic light: lane runs `go` s, slows over `ramp` s, stands still `stop` s, speeds up over `ramp` s; `phase` shifts it (s) */
  signal?: { go: number; stop: number; ramp: number; phase: number };
  /** sideways scuttle around each object's travelling position (crabs) */
  osc?: { amp: number; period: number };
  /** riders with `sinks` dive: warning `warn` s (going down, still safe), under `down` s, then up again; per-object `phase` */
  sink?: { period: number; down: number; warn: number };
  /** ghost vehicles: fade in `fade` s, solid `solid` s, fade out, gone; only solid while solid; per-object `phase` */
  ghost?: { period: number; solid: number; fade: number };
  /** a train (the row's only object): warning lights + bell `warn` s before it reaches the board */
  train?: { warn: number };
  /** lightning: strike i hits column cols[i % n] (± width) at phase + i·period, telegraphed `warn` s before, lasts `dur` s */
  strikes?: { period: number; phase: number; cols: number[]; width: number; warn: number; dur: number };
  /** laser gates on these columns: on for `on` s every `period` s (flicker `warn` s before) */
  lasers?: { cols: number[]; period: number; on: number; phase: number; warn: number };
  /** the river rises over this row: water rises `warn` s, covers it `wet` s (deadly), then drains */
  flood?: { period: number; wet: number; phase: number; warn: number };
  /** static obstacles (trees, rocks, snowmen…): you can't hop onto these columns */
  blocks?: number[];
  /** what the blocks look like (the view picks the model) */
  blockKind?: string;
  /** the design token this row was built from (levels.ts) */
  token?: string;
}

export type Milestone = 'timeAttack' | 'coinRush' | 'noMiss' | 'boss';
export interface Coin { row: number; col: number; gold?: boolean }
export interface Teleport { from: [number, number]; to: [number, number] }

export interface LevelDef {
  /** "w-l" */
  id: string;
  world: number;
  level: number;
  name: string;
  /** what's new / the tip shown on the level card */
  tip: string;
  seed: number;
  /** rows 1–11 */
  rows: RowSpec[];
  /** nest columns that are open in this level (subset of 1,3,5,7,9) */
  nests: number[];
  goal: { nests: number; coins?: number; timeLimit?: number };
  lives: number;
  /** seconds per life to fill one nest */
  timer: number;
  milestone?: Milestone;
  coins: Coin[];
  teleports: Teleport[];
  /** look: time of day + weather */
  mood: 'day' | 'golden' | 'dusk' | 'night' | 'storm' | 'snow' | 'fog' | 'neon';
  weather: 'none' | 'rain' | 'storm' | 'snow' | 'leaves' | 'petals' | 'fireflies' | 'embers' | 'mist';
}

// ---------- small maths ----------
export const mod = (a: number, n: number): number => ((a % n) + n) % n;
const TAU = Math.PI * 2;
/** the hop curve used by the engine (ease in-out) */
export const easeHop = (k: number): number => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

/** seeded random numbers (mulberry32) */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- lane movement ----------
/** effective "running" time of a lane with a traffic light (integral of its speed factor) */
function signalTime(s: NonNullable<RowSpec['signal']>, t: number): number {
  const P = s.go + s.stop + 2 * s.ramp;
  const u0 = t + s.phase;
  const n = Math.floor(u0 / P);
  const u = u0 - n * P;
  const per = s.go + s.ramp; // running time in one cycle
  let part: number;
  if (u < s.go) part = u;
  else if (u < s.go + s.ramp) { const k = u - s.go; part = s.go + k - (k * k) / (2 * s.ramp); }
  else if (u < s.go + s.ramp + s.stop) part = s.go + s.ramp / 2;
  else { const k = u - s.go - s.ramp - s.stop; part = s.go + s.ramp / 2 + (k * k) / (2 * s.ramp); }
  return n * per + part;
}
/** speed factor 0..1 of a lane with a traffic light (for the view: brake lights, the signal colour) */
export function signalFactor(L: RowSpec, t: number): number {
  const s = L.signal;
  if (!s) return 1;
  const P = s.go + s.stop + 2 * s.ramp;
  const u = mod(t + s.phase, P);
  if (u < s.go) return 1;
  if (u < s.go + s.ramp) return 1 - (u - s.go) / s.ramp;
  if (u < s.go + s.ramp + s.stop) return 0;
  return (u - s.go - s.ramp - s.stop) / s.ramp;
}
/** the signal's light: 'go' (cars drive), 'amber' (about to stop… or to go again), 'stop' */
export function signalLight(L: RowSpec, t: number): 'go' | 'amber' | 'stop' {
  const s = L.signal!;
  const P = s.go + s.stop + 2 * s.ramp;
  const u = mod(t + s.phase, P);
  if (u < s.go - 1) return 'go';
  if (u < s.go + s.ramp) return 'amber';
  if (u < s.go + s.ramp + s.stop - 1) return 'stop';
  return 'amber';
}

/** how far the lane has travelled at time t (cells) */
export function disp(L: RowSpec, t: number): number {
  if (L.speed === 0) return 0;
  if (L.signal) return L.speed * signalTime(L.signal, t);
  if (L.wind) return L.speed * (t + (L.wind.amp * L.wind.period / TAU) * (1 - Math.cos((TAU * t) / L.wind.period)));
  return L.speed * t;
}

/** an object's left edge at time t */
export function objX(L: RowSpec, o: ObjSpec, t: number): number {
  let x = o.x + disp(L, t);
  if (L.speed !== 0) x = L.start + mod(x - L.start, L.span);
  if (L.osc) x += L.osc.amp * Math.sin((TAU * t) / L.osc.period + TAU * (o.phase ?? 0));
  return x;
}

// ---------- riders ----------
/** 0 = floating, 1 = under water (for the view); not rideable while sunk() */
export function sinkAmount(L: RowSpec, o: ObjSpec, t: number): number {
  if (!o.sinks || !L.sink) return 0;
  const s = L.sink;
  const u = mod(t + (o.phase ?? 0) * s.period, s.period);
  if (u < s.warn) return (u / s.warn) * 0.55;
  if (u < s.warn + s.down) return 1;
  if (u < s.warn + s.down + 0.35) return 1 - (u - s.warn - s.down) / 0.35;
  return 0;
}
export function sunk(L: RowSpec, o: ObjSpec, t: number): boolean {
  if (!o.sinks || !L.sink) return false;
  const s = L.sink;
  const u = mod(t + (o.phase ?? 0) * s.period, s.period);
  return u >= s.warn && u < s.warn + s.down;
}
/** the rider under the centre of a Fuzzy whose left edge is at x (margin m shrinks the safe part — the solver uses it) */
export function rideAt(L: RowSpec, x: number, t: number, m = 0): ObjSpec | undefined {
  const c = x + 0.5;
  for (const o of L.objs) {
    const ox = objX(L, o, t);
    if (c > ox + 0.05 + m && c < ox + o.len - 0.05 - m && !sunk(L, o, t)) return o;
  }
  return undefined;
}

// ---------- hazards ----------
/** 0..1 how visible a ghost car is; solid only while fully there */
export function ghostAlpha(L: RowSpec, o: ObjSpec, t: number): number {
  const g = L.ghost;
  if (!g) return 1;
  const u = mod(t + (o.phase ?? 0) * g.period, g.period);
  if (u < g.fade) return (u / g.fade) * 0.55;
  if (u < g.fade + g.solid) return 1;
  if (u < g.fade + g.solid + 0.4) return 1 - (u - g.fade - g.solid) / 0.4;
  return 0;
}
export function solid(L: RowSpec, o: ObjSpec, t: number): boolean {
  const g = L.ghost;
  if (!g) return true;
  const u = mod(t + (o.phase ?? 0) * g.period, g.period);
  return u >= g.fade && u < g.fade + g.solid;
}
/** a train is on its way (warning lights + bell) or passing */
export function trainWarning(L: RowSpec, t: number): boolean {
  if (!L.train || !L.objs[0]) return false;
  const o = L.objs[0];
  const x = objX(L, o, t);
  const v = Math.abs(L.speed);
  if (x < COLS + 1 && x + o.len > -1) return true; // passing
  const eta = L.speed > 0 ? (-1 - (x + o.len)) / v : (x - (COLS + 1)) / v;
  return eta >= 0 && eta < L.train.warn;
}
export type StrikeState = { col: number; width: number; k: number; hit: boolean };
/** lightning strikes that are warning (k 0..1 = how close) or hitting now */
export function strikesAt(L: RowSpec, t: number): StrikeState[] {
  const s = L.strikes;
  if (!s) return [];
  const out: StrikeState[] = [];
  // strikes i ≥ 0 only (nothing during the pre-roll before the level starts)
  const iHi = Math.floor((t + s.warn - s.phase) / s.period);
  for (let i = Math.max(0, iHi - 2); i <= iHi; i++) {
    const T0 = s.phase + i * s.period;
    if (t >= T0 - s.warn && t < T0 + s.dur) out.push({ col: s.cols[i % s.cols.length], width: s.width, k: t < T0 ? 1 - (T0 - t) / s.warn : 1, hit: t >= T0 });
  }
  return out;
}
export function laserState(L: RowSpec, t: number): 'off' | 'warn' | 'on' {
  const l = L.lasers;
  if (!l) return 'off';
  const u = mod(t + l.phase, l.period);
  if (u < l.on) return 'on';
  if (u >= l.period - l.warn) return 'warn';
  return 'off';
}
/** 0..1 water level over a flooding row; wet = deadly */
export function floodLevel(L: RowSpec, t: number): number {
  const f = L.flood;
  if (!f) return 0;
  const u = mod(t + f.phase, f.period);
  if (u < f.wet) return 1;
  if (u < f.wet + 0.6) return 1 - (u - f.wet) / 0.6;
  if (u >= f.period - f.warn) return ((u - (f.period - f.warn)) / f.warn) * 0.7;
  return 0;
}
export const floodWet = (L: RowSpec, t: number): boolean => !!L.flood && mod(t + L.flood.phase, L.flood.period) < L.flood.wet;

/**
 * What hurts a Fuzzy whose left edge is at x on this row at time t (null = safe).
 * `m` grows the hit boxes (the solver checks with a safety margin; the game uses 0).
 */
export function hazardAt(L: RowSpec, x: number, t: number, m = 0): Hazard | null {
  if (L.flood && floodWet(L, t)) return 'splash';
  const b0 = x + 0.22 - m, b1 = x + 0.78 + m;
  if (L.surface !== 'river') {
    for (const o of L.objs) {
      if (!solid(L, o, t)) continue;
      const ox = objX(L, o, t);
      if (b1 > ox + 0.06 && b0 < ox + o.len - 0.06) return o.kind === 'train' ? 'train' : 'crash';
    }
  }
  if (L.lasers && laserState(L, t) === 'on') for (const c of L.lasers.cols) if (b1 > c + 0.1 && b0 < c + 0.9) return 'zap';
  if (L.strikes) for (const s of strikesAt(L, t)) if (s.hit) { const z0 = s.col - (s.width - 1) / 2 + 0.05, z1 = s.col + (s.width + 1) / 2 - 0.05; if (b1 > z0 && b0 < z1) return 'zap'; }
  return null;
}

// ---------- the board ----------
export const carries = (L: RowSpec | undefined): boolean => !!L && (L.surface === 'river' || L.surface === 'conveyor');
export const needsRide = (L: RowSpec | undefined): boolean => !!L && L.surface === 'river';
export const isBlocked = (L: RowSpec | undefined, col: number): boolean => !!L?.blocks?.includes(col);
export const teleportFrom = (d: LevelDef, row: number, col: number): Teleport | undefined => d.teleports.find((p) => p.from[0] === row && p.from[1] === col);
export const rowOf = (d: LevelDef, row: number): RowSpec | undefined => d.rows[row - 1];

/** stars for a cleared level: 3 = no life lost, 2 = one, 1 = more */
export const starsFor = (livesLost: number): number => (livesLost <= 0 ? 3 : livesLost === 1 ? 2 : 1);

// ---------- moving the Fuzzy (shared by the engine and the solver) ----------
export type Dir = 'up' | 'down' | 'left' | 'right';
/** where a hop in direction d from (row, x) lands, or null when it isn't allowed (edge of the board, a tree in the way…) */
export function hopTarget(d: LevelDef, row: number, x: number, dir: Dir): { tx: number; ty: number } | null {
  const here = rowOf(d, row);
  const base = carries(here) ? x : Math.round(x);
  const tx = dir === 'left' ? base - 1 : dir === 'right' ? base + 1 : base;
  const ty = dir === 'up' ? row - 1 : dir === 'down' ? row + 1 : row;
  if (ty > START_ROW || ty < 0 || tx < -0.4 || tx > COLS - 0.6) return null;
  const dest = rowOf(d, ty);
  // hopping off a log snaps to the nearest column so lining up with nests is fair
  const sx = ty !== row && !carries(dest) ? Math.round(tx) : tx;
  if (!carries(dest) && isBlocked(dest, Math.round(sx))) return null;
  return { tx: sx, ty };
}
/** on ice you keep sliding the way you hopped until a snowman, the edge of the ice or the edge of the board stops you */
export function slideNext(d: LevelDef, row: number, col: number, dir: Dir): { tx: number; ty: number } | null {
  const here = rowOf(d, row);
  if (here?.surface !== 'ice') return null;
  if (dir === 'left' || dir === 'right') {
    const nx = col + (dir === 'left' ? -1 : 1);
    if (nx < 0 || nx > COLS - 1 || isBlocked(here, nx)) return null;
    return { tx: nx, ty: row };
  }
  const ny = row + (dir === 'up' ? -1 : 1);
  const next = rowOf(d, ny);
  if (ny < 1 || ny > 11 || next?.surface !== 'ice' || isBlocked(next, col)) return null;
  return { tx: col, ty: ny };
}
/** the rows a Fuzzy can be hit on during a hop at progress k (the solver checks both rows around the middle) */
export const visualRow = (fy: number, ty: number, k: number): number => Math.round(fy + (ty - fy) * easeHop(k));
