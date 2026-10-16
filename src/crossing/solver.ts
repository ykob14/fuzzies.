/**
 * Fairness solver for Fuzzy Crossing world levels. A time-discretised breadth-first search over (tick, row, x) that uses the
 * very same rule functions as the game (src/crossing/sim.ts), with a "human" player model:
 *   - one tick = 0.035 s, a hop = 4 ticks (0.14 s, exactly the game's hop time),
 *   - after every landing the Fuzzy must stay put for REST ticks (≥ 0.2 s reaction delay) and survive it,
 *   - every hop must also survive when pressed one tick late (timing tolerance),
 *   - hit boxes are grown by MARGIN cells (+ half a tick of travel for moving hazards), riding spots are shrunk by MARGIN,
 *   - during a vertical hop, the middle sample is checked against BOTH rows.
 * If this player can do it, a person can.
 */
import {
  COLS, START_ROW, START_COL, HOP_TIME, carries, needsRide, disp, easeHop, hazardAt, rideAt, rowOf, hopTarget, slideNext, teleportFrom,
  type Dir, type LevelDef, type RowSpec,
} from './sim';

export const DT = HOP_TIME / 4;
export const HOP_TICKS = 4;
export interface Human { rest: number; margin: number; tolerance: boolean }
export const HUMAN: Human = { rest: 6, margin: 0.08, tolerance: true };
/** a perfect robot (for metrics: how much slack the human has) */
export const ROBOT: Human = { rest: 0, margin: 0, tolerance: false };

export interface HopRef { dir: Dir; k: number; prev: HopRef | null }
export interface Found { k: number; row: number; x: number; hops: HopRef | null; states: number }
type Target = (row: number, x: number) => boolean;

const DIRS: Dir[] = ['up', 'left', 'right', 'down'];

export class Solver {
  readonly rows: (RowSpec | undefined)[] = [];
  private mL: number[] = [];
  constructor(readonly def: LevelDef, readonly human: Human = HUMAN, readonly filled: boolean[] = []) {
    for (let r = 0; r <= START_ROW; r++) this.rows[r] = rowOf(def, r);
    for (let r = 0; r <= START_ROW; r++) { const L = this.rows[r]; this.mL[r] = human.margin + (L && L.surface !== 'river' ? Math.abs(L.speed) * DT * 0.5 : 0); }
  }
  /** safe to be at (row, x) at tick k (hazards only) */
  safe(row: number, x: number, k: number): boolean {
    const L = this.rows[row];
    if (!L) return true;
    return hazardAt(L, x, k * DT, this.mL[row]) === null;
  }
  /** one tick standing still: returns the new x, or null when the Fuzzy is lost */
  stand(row: number, x: number, k: number): number | null {
    const L = this.rows[row];
    const t1 = (k + 1) * DT;
    if (L && carries(L)) {
      if (needsRide(L) && !rideAt(L, x, t1, this.human.margin)) return null;
      x += disp(L, t1) - disp(L, k * DT);
      if (needsRide(L)) { if (x < -0.45 || x > COLS - 0.55) return null; }
      else x = Math.max(0, Math.min(COLS - 1, x));
    }
    return this.safe(row, x, k + 1) ? x : null;
  }
  /** a hop (plus any ice slides) starting at tick k; null = lost on the way */
  hop(row: number, x: number, k: number, dir: Dir): { k: number; row: number; x: number; nest?: number } | null {
    let tg = hopTarget(this.def, row, x, dir);
    if (!tg) return null;
    let fx = x, fy = row, tx = tg.tx, ty = tg.ty;
    for (let guard = 0; guard < 12; guard++) {
      for (let j = 1; j <= HOP_TICKS; j++) {
        const kk = k + j;
        const L = this.rows[fy];
        if (fy === ty && L && carries(L)) { const dd = disp(L, kk * DT) - disp(L, (kk - 1) * DT); fx += dd; tx += dd; }
        if (j < HOP_TICKS) {
          const e = easeHop(j / HOP_TICKS);
          const vx = fx + (tx - fx) * e;
          if (fy === ty) { if (!this.safe(fy, vx, kk)) return null; }
          else if (j === 1) { if (!this.safe(fy, vx, kk)) return null; }
          else if (j === 2) { if (!this.safe(fy, vx, kk) || !this.safe(ty, vx, kk)) return null; }
          else if (!this.safe(ty, vx, kk)) return null;
        }
      }
      k += HOP_TICKS;
      // landing (the game's land())
      let px = tx, py = ty;
      if (py === 0) {
        const col = Math.round(px);
        const i = this.def.nests.indexOf(col);
        if (i < 0 || this.filled[i]) return null;
        return { k, row: 0, x: col, nest: i };
      }
      let jumped = false;
      if (!carries(this.rows[py])) {
        const tp = teleportFrom(this.def, py, Math.round(px));
        if (tp) { py = tp.to[0]; px = tp.to[1]; jumped = true; }
      }
      const sl = jumped || carries(this.rows[py]) ? null : slideNext(this.def, py, Math.round(px), dir);
      if (sl) {
        if (!this.safe(py, px, k)) return null;
        fx = px; fy = py; tx = sl.tx; ty = sl.ty;
        continue;
      }
      if (needsRide(this.rows[py]) && !rideAt(this.rows[py]!, px, k * DT, this.human.margin)) return null;
      if (!this.safe(py, px, k)) return null;
      return { k, row: py, x: px };
    }
    return null;
  }

  /**
   * Earliest tick (≤ maxK) at which the human reaches a target, starting at (row, x) at tick k0.
   * `restFirst` = the player needs a reaction pause before the first hop (start of a life).
   */
  search(k0: number, row0: number, x0: number, maxK: number, target: Target, nestGoal: boolean, restFirst = true): Found | null {
    const H = this.human;
    type Node = { row: number; x: number; hops: HopRef | null };
    const buckets = new Map<number, Map<number, Node>>();
    const keyOf = (row: number, x: number) => row * 1000 + Math.round((x + 1) * 40);
    const put = (k: number, n: Node) => {
      if (k > maxK) return;
      let b = buckets.get(k);
      if (!b) { b = new Map(); buckets.set(k, b); }
      const key = keyOf(n.row, n.x);
      if (!b.has(key)) b.set(key, n);
    };
    // the start pause
    let x = x0;
    let k = k0;
    if (restFirst) {
      for (let i = 0; i < H.rest; i++) { const nx = this.stand(row0, x, k); if (nx === null) return null; x = nx; k++; }
    }
    put(k, { row: row0, x, hops: null });
    let states = 0;
    for (let kk = k; kk <= maxK; kk++) {
      const b = buckets.get(kk);
      if (!b) continue;
      buckets.delete(kk);
      for (const n of b.values()) {
        states++;
        // wait a tick
        const w = this.stand(n.row, n.x, kk);
        if (w !== null) put(kk + 1, { row: n.row, x: w, hops: n.hops });
        // hop
        for (const dir of DIRS) {
          const h = this.hop(n.row, n.x, kk, dir);
          if (!h) continue;
          if (H.tolerance) {
            // pressed one tick late: still fine?
            if (w === null) continue;
            const late = this.hop(n.row, w, kk + 1, dir);
            if (!late) continue;
          }
          const ref: HopRef = { dir, k: kk, prev: n.hops };
          if (h.nest !== undefined) { if (nestGoal) return { k: h.k, row: 0, x: h.x, hops: ref, states }; continue; }
          if (target(h.row, h.x)) return { k: h.k, row: h.row, x: h.x, hops: ref, states };
          // reaction pause after landing
          let px = h.x, ok = true, kr = h.k;
          for (let i = 0; i < H.rest; i++) { const nx = this.stand(h.row, px, kr); if (nx === null) { ok = false; break; } px = nx; kr++; }
          if (!ok) continue;
          if (target(h.row, px)) return { k: kr, row: h.row, x: px, hops: ref, states };
          put(kr, { row: h.row, x: px, hops: ref });
        }
      }
    }
    return null;
  }

  /** one crossing from the start row to any open, empty nest */
  cross(k0: number, maxSeconds: number, restFirst = true): Found | null {
    return this.search(k0, START_ROW, START_COL, k0 + Math.floor(maxSeconds / DT), () => false, true, restFirst);
  }
}

export const hopsList = (h: HopRef | null): { dir: Dir; k: number }[] => { const out: { dir: Dir; k: number }[] = []; for (let p = h; p; p = p.prev) out.push({ dir: p.dir, k: p.k }); return out.reverse(); };

export interface Plan {
  ok: boolean;
  reason?: string;
  /** every hop of the whole level, with its tick */
  hops: { dir: Dir; k: number }[];
  /** tick each nest was reached / each coin was collected */
  marks: { k: number; what: string }[];
  totalK: number;
  states: number;
}

/** play the whole level as the human: coins first (Coin Rush), then every nest. Lives are never used. */
export function planLevel(def: LevelDef, human: Human = HUMAN, k0 = 0): Plan {
  const filled = def.nests.map(() => false);
  const s = new Solver(def, human, filled);
  const lifeMax = def.timer * 0.75;
  const hops: Plan['hops'] = [];
  const marks: Plan['marks'] = [];
  let k = k0, states = 0;
  let row = START_ROW, x = START_COL as number, fresh = true, lifeStart = k;
  const need = def.goal.coins ?? 0;
  const got = new Set<string>();
  while (got.size < need) {
    const left = def.coins.filter((c) => !got.has(`${c.row}:${c.col}`));
    const f = s.search(k, row, x, lifeStart + Math.floor(lifeMax / DT), (r, xx) => left.some((c) => c.row === r && c.col === Math.round(xx) && Math.abs(xx - c.col) < 0.3), false, fresh);
    if (!f) return { ok: false, reason: `coin ${got.size + 1}/${need} not reachable`, hops, marks, totalK: k, states };
    states += f.states;
    hops.push(...hopsList(f.hops));
    const c = left.find((cc) => cc.row === f.row && cc.col === Math.round(f.x))!;
    got.add(`${c.row}:${c.col}`);
    marks.push({ k: f.k, what: `coin ${c.row}:${c.col}` });
    k = f.k; row = f.row; x = f.x; fresh = false;
  }
  for (let n = 0; n < def.nests.length; n++) {
    const f = s.search(k, row, x, lifeStart + Math.floor(lifeMax / DT), () => false, true, fresh);
    if (!f) return { ok: false, reason: `nest ${n + 1}/${def.nests.length} not reachable within ${lifeMax.toFixed(0)} s (from t=${(k * DT).toFixed(1)})`, hops, marks, totalK: k, states };
    states += f.states;
    hops.push(...hopsList(f.hops));
    filled[def.nests.indexOf(f.x)] = true;
    marks.push({ k: f.k, what: `nest ${f.x}` });
    k = f.k; row = START_ROW; x = START_COL; fresh = true; lifeStart = k;
  }
  return { ok: true, hops, marks, totalK: k - k0, states };
}
