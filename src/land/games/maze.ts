/**
 * Fuzzy Maze — RULES only (no DOM, no Three.js): a hedge maze grown from the day's seed (recursive backtracker on an N×N grid),
 * three keys hidden in dead ends, stars along the way, and a gate on the far side that opens once every key is found. The Fuzzy
 * walks with the stick / keys, or taps a spot and walks there by itself along the corridors (BFS). Score: keys, stars, the exit
 * and ×2 for every second left. Checked without a browser by `adv/games-check.ts`.
 */
import { Clock, Mover, seeded, tierPlace, type Obstacle, type Vec2 } from '../arcade';

export const SCORING = {
  exit: 200, key: 40, star: 15, timeLeft: 3,
  tiers: [360, 240, 120] as [number, number, number],
  tierNames: ['Maze master', 'Pathfinder', 'Wanderer', 'Lost in the hedges'],
};
export const LIMIT = 70;
export const N = 9;
export const CELL = 2.6;
export const WALL = 0.36;
export const KEYS = 3;
export const STARS = 12;
export const PICK = 0.8;
export const MOVE = { accel: 38, max: 7.0, friction: 6, turn: 11, radius: 0.32 };

export type Side = 'n' | 's' | 'e' | 'w';
export interface Pickup { id: number; kind: 'key' | 'star'; x: number; z: number; got: boolean; cell: number }
export interface MazeEvent { kind: 'key' | 'star' | 'unlock' | 'exit' | 'locked' | 'warn' | 'timeup' | 'bump'; item?: Pickup; value?: number; n?: number }

export const cellOf = (r: number, c: number): number => r * N + c;
export const centre = (i: number): Vec2 => ({ x: ((i % N) - (N - 1) / 2) * CELL, z: (Math.floor(i / N) - (N - 1) / 2) * CELL });
export const HALF = (N * CELL) / 2;

export class MazeSim {
  readonly clock = new Clock(LIMIT);
  /** north[i] = hedge on the north (−z) side of cell i; west[i] = hedge on its west (−x) side. The outer ring is always hedged. */
  readonly north: boolean[] = new Array(N * N).fill(true);
  readonly west: boolean[] = new Array(N * N).fill(true);
  /** the hedges as boxes (the gate is the last one while locked) */
  readonly walls: Obstacle[] = [];
  readonly gate: Obstacle;
  readonly you: Mover;
  readonly startCell: number;
  readonly exit: number;
  readonly exitSide: Side;
  /** the middle of the opening in the outer hedge */
  readonly gatePos: Vec2;
  readonly items: Pickup[] = [];
  readonly visited: boolean[] = new Array(N * N).fill(false);
  /** BFS distance from the start for every cell (the view's minimap and the bots use it) */
  readonly dist: number[];
  state: 'ready' | 'playing' | 'done' = 'ready';
  score = 0; keys = 0; stars = 0; escaped = false; bonus = 0;
  /** auto-walk: the tapped spot and the corridor waypoints to it */
  goal: Vec2 | null = null; path: Vec2[] = [];
  events: MazeEvent[] = [];
  private rnd: () => number;
  private stuck = 0; private bumpCool = 0; private lockCool = 0;

  constructor(_variant: string | null | undefined, seed = 7) {
    this.rnd = seeded(seed);
    // carve the maze (iterative backtracker)
    const seen = new Array(N * N).fill(false); const stack: number[] = [];
    this.startCell = cellOf(N - 1, 0); seen[this.startCell] = true; stack.push(this.startCell);
    while (stack.length) {
      const i = stack[stack.length - 1]; const r = Math.floor(i / N), c = i % N;
      const opts: [number, Side][] = [];
      if (r > 0 && !seen[i - N]) opts.push([i - N, 'n']);
      if (r < N - 1 && !seen[i + N]) opts.push([i + N, 's']);
      if (c > 0 && !seen[i - 1]) opts.push([i - 1, 'w']);
      if (c < N - 1 && !seen[i + 1]) opts.push([i + 1, 'e']);
      if (!opts.length) { stack.pop(); continue; }
      const [j, side] = opts[Math.floor(this.rnd() * opts.length)];
      if (side === 'n') this.north[i] = false; else if (side === 's') this.north[j] = false; else if (side === 'w') this.west[i] = false; else this.west[j] = false;
      seen[j] = true; stack.push(j);
    }
    // a few extra openings so there is more than one way round (and the wall-follower isn't the only trick)
    for (let k = 0; k < 6; k++) { const i = Math.floor(this.rnd() * N * N); const r = Math.floor(i / N), c = i % N; if (this.rnd() < 0.5) { if (r > 0) this.north[i] = false; } else if (c > 0) this.west[i] = false; }
    this.dist = this.bfs(this.startCell);
    // the exit: the farthest cell on the outer ring
    let best = -1, bd = -1;
    for (let i = 0; i < N * N; i++) { const r = Math.floor(i / N), c = i % N; if ((r === 0 || r === N - 1 || c === 0 || c === N - 1) && i !== this.startCell && this.dist[i] > bd) { bd = this.dist[i]; best = i; } }
    this.exit = best;
    const er = Math.floor(best / N), ec = best % N;
    this.exitSide = er === 0 ? 'n' : ec === N - 1 ? 'e' : er === N - 1 ? 's' : 'w';
    const ecen = centre(best);
    this.gatePos = this.exitSide === 'n' ? { x: ecen.x, z: ecen.z - CELL / 2 } : this.exitSide === 's' ? { x: ecen.x, z: ecen.z + CELL / 2 } : this.exitSide === 'e' ? { x: ecen.x + CELL / 2, z: ecen.z } : { x: ecen.x - CELL / 2, z: ecen.z };
    // hedges → boxes
    const hw = CELL / 2 + WALL / 2, t = WALL / 2;
    for (let i = 0; i < N * N; i++) {
      const r = Math.floor(i / N), c = i % N, p = centre(i);
      const skipN = i === best && this.exitSide === 'n', skipW = i === best && this.exitSide === 'w';
      if (this.north[i] && !skipN) this.walls.push({ kind: 'box', x: p.x, z: p.z - CELL / 2, hw, hd: t });
      if (this.west[i] && !skipW) this.walls.push({ kind: 'box', x: p.x - CELL / 2, z: p.z, hw: t, hd: hw });
      if (r === N - 1 && !(i === best && this.exitSide === 's')) this.walls.push({ kind: 'box', x: p.x, z: p.z + CELL / 2, hw, hd: t });
      if (c === N - 1 && !(i === best && this.exitSide === 'e')) this.walls.push({ kind: 'box', x: p.x + CELL / 2, z: p.z, hw: t, hd: hw });
    }
    this.gate = this.exitSide === 'n' || this.exitSide === 's' ? { kind: 'box', x: this.gatePos.x, z: this.gatePos.z, hw, hd: t } : { kind: 'box', x: this.gatePos.x, z: this.gatePos.z, hw: t, hd: hw };
    const obstacles = [...this.walls, this.gate];
    this.you = new Mover({ ...MOVE, bounds: { hw: HALF + 3, hd: HALF + 3 } }, obstacles);
    const s0 = centre(this.startCell); this.you.pos = { ...s0 }; this.you.heading = 0;
    this.visited[this.startCell] = true;
    // keys in dead ends, spread along the way; stars elsewhere
    const deadEnds = [...Array(N * N).keys()].filter((i) => i !== this.startCell && i !== best && this.wallCount(i) === 3).sort((a, b) => this.dist[a] - this.dist[b]);
    const pool = deadEnds.length >= KEYS ? deadEnds : [...Array(N * N).keys()].filter((i) => i !== this.startCell && i !== best).sort((a, b) => this.dist[a] - this.dist[b]);
    const used = new Set<number>();
    for (let k = 0; k < KEYS; k++) {
      const q = (k + 0.6) / (KEYS + 0.2); let idx = Math.min(pool.length - 1, Math.floor(q * pool.length + (this.rnd() - 0.5) * 2));
      while (idx < pool.length && used.has(pool[idx])) idx++; if (idx >= pool.length) { idx = pool.findIndex((i) => !used.has(i)); }
      const cell = pool[idx]; used.add(cell); const p = centre(cell);
      this.items.push({ id: this.items.length, kind: 'key', x: p.x, z: p.z, got: false, cell });
    }
    const starCells = [...Array(N * N).keys()].filter((i) => i !== this.startCell && i !== best && !used.has(i));
    for (let k = 0; k < STARS && starCells.length; k++) {
      const idx = Math.floor(this.rnd() * starCells.length); const cell = starCells.splice(idx, 1)[0]; const p = centre(cell);
      this.items.push({ id: this.items.length, kind: 'star', x: p.x + (this.rnd() - 0.5) * 0.8, z: p.z + (this.rnd() - 0.5) * 0.8, got: false, cell });
    }
  }

  start(): void { if (this.state === 'ready') this.state = 'playing'; }
  get unlocked(): boolean { return this.keys >= KEYS; }
  wallCount(i: number): number { const r = Math.floor(i / N), c = i % N; let n = 0; if (this.north[i]) n++; if (this.west[i]) n++; if (r === N - 1 || this.north[i + N]) n++; if (c === N - 1 || this.west[i + 1]) n++; return n; }
  /** open neighbours of a cell */
  neighbours(i: number): number[] {
    const r = Math.floor(i / N), c = i % N, out: number[] = [];
    if (r > 0 && !this.north[i]) out.push(i - N);
    if (r < N - 1 && !this.north[i + N]) out.push(i + N);
    if (c > 0 && !this.west[i]) out.push(i - 1);
    if (c < N - 1 && !this.west[i + 1]) out.push(i + 1);
    return out;
  }
  bfs(from: number): number[] { const d = new Array(N * N).fill(Infinity); d[from] = 0; const q = [from]; while (q.length) { const i = q.shift()!; for (const j of this.neighbours(i)) if (d[j] === Infinity) { d[j] = d[i] + 1; q.push(j); } } return d; }
  /** the cell under a point (clamped to the maze) */
  cellAt(x: number, z: number): number { const c = Math.max(0, Math.min(N - 1, Math.round(x / CELL + (N - 1) / 2))), r = Math.max(0, Math.min(N - 1, Math.round(z / CELL + (N - 1) / 2))); return cellOf(r, c); }
  get cell(): number { return this.cellAt(this.you.pos.x, this.you.pos.z); }
  /** shortest corridor route between two cells (cell indices, excluding `from`) */
  route(from: number, to: number): number[] {
    const prev = new Array(N * N).fill(-1); const seen = new Array(N * N).fill(false); seen[from] = true; const q = [from];
    while (q.length) { const i = q.shift()!; if (i === to) break; for (const j of this.neighbours(i)) if (!seen[j]) { seen[j] = true; prev[j] = i; q.push(j); } }
    if (!seen[to]) return [];
    const out: number[] = []; for (let i = to; i !== from; i = prev[i]) out.unshift(i); return out;
  }
  /** tap a spot: walk there along the corridors (outside the gate = leave through the exit) */
  goTo(x: number, z: number): boolean {
    if (this.state !== 'playing') return false;
    const outside = Math.abs(x) > HALF || Math.abs(z) > HALF;
    const target = outside ? this.exit : this.cellAt(x, z);
    const cells = this.route(this.cell, target);
    this.path = cells.map((i) => centre(i));
    if (outside) { this.path.push({ ...this.gatePos }); this.path.push({ x: this.gatePos.x + (this.exitSide === 'e' ? 1.5 : this.exitSide === 'w' ? -1.5 : 0), z: this.gatePos.z + (this.exitSide === 's' ? 1.5 : this.exitSide === 'n' ? -1.5 : 0) }); }
    else if (!this.path.length || Math.hypot(x - this.path[this.path.length - 1].x, z - this.path[this.path.length - 1].z) > 0.3) this.path.push({ x, z });
    this.goal = { x, z };
    this.stuck = 0;
    return true;
  }
  /** walk to a cell's centre (bots) */
  goToCell(i: number): boolean { const p = centre(i); return this.goTo(p.x, p.z); }

  step(dt: number, input: Vec2): void {
    this.events.length = 0;
    if (this.state !== 'playing') return;
    const w = this.clock.step(dt);
    if (w === 'timeup') { this.state = 'done'; this.events.push({ kind: 'timeup' }); return; }
    if (typeof w === 'number') this.events.push({ kind: 'warn', n: w });
    let inp = { x: input.x || 0, z: input.z || 0 };
    if (Math.hypot(inp.x, inp.z) > 0.05) { this.goal = null; this.path = []; }
    else if (this.path.length) {
      const wp = this.path[0]; const dx = wp.x - this.you.pos.x, dz = wp.z - this.you.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.3) { this.path.shift(); if (!this.path.length) this.goal = null; }
      else { const slow = this.path.length === 1 ? Math.min(1, d / 1.2 + 0.25) : 1; inp = { x: (dx / d) * slow, z: (dz / d) * slow }; }
    }
    this.you.step(dt, inp);
    if (this.path.length) { if (this.you.speed < 0.3) { this.stuck += dt; if (this.stuck > 1.2) { this.path = []; this.goal = null; this.stuck = 0; } } else this.stuck = 0; }
    this.bumpCool -= dt; this.lockCool -= dt;
    if (this.you.blocked && this.you.speed > 2.2 && this.bumpCool <= 0) { this.bumpCool = 0.6; this.events.push({ kind: 'bump' }); }
    this.visited[this.cell] = true;
    for (const it of this.items) {
      if (it.got) continue;
      if (Math.hypot(it.x - this.you.pos.x, it.z - this.you.pos.z) < PICK) {
        it.got = true;
        if (it.kind === 'key') { this.keys++; this.score += SCORING.key; this.events.push({ kind: 'key', item: it, value: SCORING.key, n: this.keys }); if (this.unlocked) { const gi = this.you.obstacles.indexOf(this.gate); if (gi >= 0) this.you.obstacles.splice(gi, 1); this.events.push({ kind: 'unlock' }); } }
        else { this.stars++; this.score += SCORING.star; this.events.push({ kind: 'star', item: it, value: SCORING.star }); }
      }
    }
    const dg = Math.hypot(this.gatePos.x - this.you.pos.x, this.gatePos.z - this.you.pos.z);
    if (this.unlocked && dg < 0.9) {
      this.escaped = true; this.bonus = Math.round(this.clock.left * SCORING.timeLeft); this.score += SCORING.exit + this.bonus; this.state = 'done';
      this.events.push({ kind: 'exit', value: SCORING.exit + this.bonus });
    } else if (!this.unlocked && dg < 1.4 && this.lockCool <= 0) { this.lockCool = 2.5; this.events.push({ kind: 'locked', n: KEYS - this.keys }); }
  }

  place(): number { return tierPlace(this.score, SCORING.tiers); }
  result(): { place: number; score: number; timeMs: number; tier: string; stats: { label: string; value: string }[] } {
    const place = this.place(); const t = Math.round(this.clock.time);
    return { place, score: this.score, timeMs: Math.round(this.clock.time * 1000), tier: SCORING.tierNames[place - 1], stats: [{ label: 'Keys', value: `${this.keys}/${KEYS}` }, { label: 'Stars', value: `${this.stars}/${STARS}` }, { label: this.escaped ? 'Out in' : 'Exit', value: this.escaped ? `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` : 'not reached' }, { label: 'Time bonus', value: `+${this.bonus}` }] };
  }
}
