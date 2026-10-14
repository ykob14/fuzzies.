/**
 * Fuzzies Parking Escape — the puzzle ENGINE (no DOM, no Three.js, no imports, so Node can run it for the level generator and the
 * checks). A level is a W×H parking lot: vehicles 2 or 3 cells long slide only along their own direction, walls (bollards, planters)
 * never move, and one or two target vehicles must drive out through the exit at the end of their own row/column. Sliding a vehicle
 * any distance is ONE move; driving a target out (from wherever its way to the edge is clear) is one move too.
 *
 * Level format (levels.json): { b: board string (row-major, w×h chars: '.' empty, '#' wall, a letter per vehicle repeated over its
 * cells; 'A' and 'B' are the targets), w, h, x: exits ("A>" / "A<" / "Av" / "A^", two for a double escape: "A>Bv"), o: optimal moves
 * (checked by the solver), t: 'n' normal | 't' timed | 'm' limited moves | 'd' double escape | 's' special challenge, lim?: seconds or
 * moves }.
 */

export type Dir = 'h' | 'v';
export interface Vehicle {
  /** index in the puzzle */ i: number; letter: string; len: number; dir: Dir;
  /** the row (dir h) or column (dir v) it lives on */ line: number;
  /** a target: +1 = exits towards the right / bottom, −1 = left / top */ exit: 0 | 1 | -1;
}
export interface Puzzle { w: number; h: number; walls: Uint8Array; cars: Vehicle[]; start: Uint8Array }
export interface LevelData { b: string; w: number; h: number; x: string; o: number; t: 'n' | 't' | 'm' | 'd' | 's'; lim?: number }
/** a slide: vehicle `car` to position `to` (OUT = drove out through the exit) */
export interface Move { car: number; to: number }
/** position of a vehicle that has left the lot */
export const OUT = 255;

export function parse(l: LevelData): Puzzle {
  const { w, h, b } = l;
  if (b.length !== w * h) throw new Error(`board is ${b.length} cells, expected ${w * h}`);
  const walls = new Uint8Array(w * h);
  const cells = new Map<string, number[]>();
  for (let k = 0; k < b.length; k++) {
    const ch = b[k];
    if (ch === '#') walls[k] = 1;
    else if (ch !== '.') { const list = cells.get(ch) ?? []; list.push(k); cells.set(ch, list); }
  }
  const letters = [...cells.keys()].sort((p, q) => (p === 'A' ? -1 : q === 'A' ? 1 : p === 'B' ? -1 : q === 'B' ? 1 : p < q ? -1 : 1));
  const exits = new Map<string, 1 | -1>();
  for (let k = 0; k + 1 < l.x.length; k += 2) exits.set(l.x[k], l.x[k + 1] === '>' || l.x[k + 1] === 'v' ? 1 : -1);
  const cars: Vehicle[] = []; const start: number[] = [];
  for (const letter of letters) {
    const ks = cells.get(letter)!.sort((p, q) => p - q);
    if (ks.length < 2 || ks.length > 3) throw new Error(`vehicle ${letter} is ${ks.length} cells long`);
    const r0 = Math.floor(ks[0] / w), c0 = ks[0] % w;
    const horiz = ks.every((k, j) => k === ks[0] + j && Math.floor(k / w) === r0);
    const vert = ks.every((k, j) => k === ks[0] + j * w);
    if (!horiz && !vert) throw new Error(`vehicle ${letter} is not straight`);
    const dir: Dir = horiz ? 'h' : 'v';
    const exit = exits.get(letter) ?? 0;
    const sym = l.x[l.x.indexOf(letter) + 1];
    if (exit && ((dir === 'h') !== (sym === '>' || sym === '<'))) throw new Error(`exit of ${letter} doesn't match its direction`);
    cars.push({ i: cars.length, letter, len: ks.length, dir, line: horiz ? r0 : c0, exit });
    start.push(horiz ? c0 : r0);
  }
  if (!cars.some((c) => c.exit)) throw new Error('no target vehicle');
  return { w, h, walls, cars, start: Uint8Array.from(start) };
}

/** who's where: −1 empty, −2 wall, else the vehicle index */
export function grid(p: Puzzle, s: Uint8Array): Int16Array {
  const g = new Int16Array(p.w * p.h);
  for (let k = 0; k < g.length; k++) g[k] = p.walls[k] ? -2 : -1;
  for (const c of p.cars) {
    const pos = s[c.i]; if (pos === OUT) continue;
    for (let j = 0; j < c.len; j++) g[c.dir === 'h' ? c.line * p.w + pos + j : (pos + j) * p.w + c.line] = c.i;
  }
  return g;
}
const cellAt = (p: Puzzle, c: Vehicle, along: number) => (c.dir === 'h' ? c.line * p.w + along : along * p.w + c.line);
const span = (p: Puzzle, c: Vehicle) => (c.dir === 'h' ? p.w : p.h);

/** How far a vehicle can slide: [min, max] positions, and whether a target's way out is clear. */
export function range(p: Puzzle, s: Uint8Array, i: number, g = grid(p, s)): { min: number; max: number; out: boolean } {
  const c = p.cars[i], pos = s[i];
  if (pos === OUT) return { min: pos, max: pos, out: false };
  let min = pos, max = pos;
  while (min > 0 && g[cellAt(p, c, min - 1)] === -1) min--;
  while (max + c.len < span(p, c) && g[cellAt(p, c, max + c.len)] === -1) max++;
  const out = c.exit === 1 ? max + c.len === span(p, c) : c.exit === -1 ? min === 0 : false;
  return { min, max, out };
}

/** every legal move from a state */
export function moves(p: Puzzle, s: Uint8Array): Move[] {
  const g = grid(p, s), out: Move[] = [];
  for (const c of p.cars) {
    if (s[c.i] === OUT) continue;
    const r = range(p, s, c.i, g);
    for (let to = r.min; to <= r.max; to++) if (to !== s[c.i]) out.push({ car: c.i, to });
    if (r.out) out.push({ car: c.i, to: OUT });
  }
  return out;
}
export function apply(s: Uint8Array, m: Move): Uint8Array { const n = s.slice(); n[m.car] = m.to; return n; }
export const solved = (p: Puzzle, s: Uint8Array): boolean => p.cars.every((c) => !c.exit || s[c.i] === OUT);
export const legal = (p: Puzzle, s: Uint8Array, m: Move): boolean => moves(p, s).some((x) => x.car === m.car && x.to === m.to);
export const key = (s: Uint8Array): string => String.fromCharCode(...s);
export const unkey = (k: string): Uint8Array => Uint8Array.from(k, (ch) => ch.charCodeAt(0));

/**
 * Shortest solution from a state (breadth-first: every slide counts as one move). `cap` limits the states looked at (null when
 * it runs out). Pass `yieldEvery` + await the returned promise version (`solveAsync`) to keep a page responsive.
 */
export function solve(p: Puzzle, s: Uint8Array, cap = 400_000): Move[] | null {
  const it = search(p, s, cap); let r = it.next();
  while (!r.done) r = it.next();
  return r.value;
}
/** the same search, a slice at a time so a phone stays smooth (used for hints and the endless generator) */
export async function solveAsync(p: Puzzle, s: Uint8Array, cap = 400_000): Promise<Move[] | null> {
  const it = search(p, s, cap); let r = it.next();
  while (!r.done) { await new Promise((res) => setTimeout(res, 0)); r = it.next(); }
  return r.value;
}
/** breadth-first search on numeric states; yields every few thousand states */
function* search(p: Puzzle, s: Uint8Array, cap: number): Generator<void, Move[] | null, void> {
  if (solved(p, s)) return [];
  const nc = p.cars.length, pow = Array.from({ length: nc }, (_, i) => 8 ** i);
  const c0 = code(s);
  const prev = new Map<number, number>([[c0, -1]]); // state → previous state
  let frontier = [c0], n = 0;
  const st = new Uint8Array(nc);
  while (frontier.length) {
    const next: number[] = [];
    for (const c of frontier) {
      if (++n % 3000 === 0) yield;
      decode(c, nc, st);
      for (const m of moves(p, st)) {
        const nc2 = c + ((m.to === OUT ? 7 : m.to) - st[m.car]) * pow[m.car];
        if (prev.has(nc2)) continue;
        prev.set(nc2, c);
        const ns = decode(nc2, nc);
        if (solved(p, ns)) {
          const path: Move[] = []; let cur = nc2;
          while (cur !== c0) {
            const pc = prev.get(cur)!; const a = decode(pc, nc), b = decode(cur, nc);
            const car = a.findIndex((v, i) => v !== b[i]); path.unshift({ car, to: b[car] }); cur = pc;
          }
          return path;
        }
        if (prev.size > cap) return null;
        next.push(nc2);
      }
    }
    frontier = next;
  }
  return null;
}

/** a state as one number (3 bits per vehicle, OUT = 7) — fast keys for the big searches; boards up to 8×8, up to 17 vehicles */
export function code(s: Uint8Array): number { let n = 0; for (let i = s.length - 1; i >= 0; i--) n = n * 8 + (s[i] === OUT ? 7 : s[i]); return n; }
export function decode(n: number, len: number, into = new Uint8Array(len)): Uint8Array { for (let i = 0; i < len; i++) { const v = n % 8; into[i] = v === 7 ? OUT : v; n = (n - v) / 8; } return into; }

/**
 * The whole puzzle graph from a state (every state you can reach, exits included) with each state's distance to the goal — the
 * generator picks its puzzles from here (the farthest state is the hardest puzzle of this set of vehicles). Null past `cap`.
 */
export function explore(p: Puzzle, s: Uint8Array, cap = 150_000): { codes: number[]; dist: Int32Array; present: Uint8Array } | null {
  const nc = p.cars.length, W = p.w, H = p.h;
  const index = new Map<number, number>(); const codes: number[] = [];
  let adj = new Int32Array(1 << 20), adjN = 0; const start: number[] = [];
  const st = new Uint8Array(nc), g = new Int16Array(W * H);
  const pow = Array.from({ length: nc }, (_, i) => 8 ** i);
  const id = (c: number) => { let i = index.get(c); if (i === undefined) { i = codes.length; index.set(c, i); codes.push(c); } return i; };
  const push = (v: number) => { if (adjN === adj.length) { const n = new Int32Array(adj.length * 2); n.set(adj); adj = n; } adj[adjN++] = v; };
  id(code(s));
  for (let q = 0; q < codes.length; q++) {
    if (codes.length > cap) return null;
    start.push(adjN);
    const c0 = codes[q]; decode(c0, nc, st);
    for (let k = 0; k < g.length; k++) g[k] = p.walls[k] ? -2 : -1;
    for (const c of p.cars) { const pos = st[c.i]; if (pos === OUT) continue; for (let j = 0; j < c.len; j++) g[c.dir === 'h' ? c.line * W + pos + j : (pos + j) * W + c.line] = c.i; }
    for (const c of p.cars) {
      const pos = st[c.i]; if (pos === OUT) continue;
      const sp = c.dir === 'h' ? W : H, at = (a: number) => (c.dir === 'h' ? c.line * W + a : a * W + c.line);
      const base = c0 - pos * pow[c.i];
      let m = pos; while (m > 0 && g[at(m - 1)] === -1) { m--; push(id(base + m * pow[c.i])); }
      let x = pos; while (x + c.len < sp && g[at(x + c.len)] === -1) { x++; push(id(base + x * pow[c.i])); }
      if ((c.exit === 1 && x + c.len === sp) || (c.exit === -1 && m === 0)) push(id(base + 7 * pow[c.i]));
    }
  }
  start.push(adjN);
  const n = codes.length;
  // reverse edges (CSR), then breadth-first from the solved states
  const deg = new Int32Array(n + 1);
  for (let a = 0; a < n; a++) for (let e = start[a]; e < start[a + 1]; e++) deg[adj[e] + 1]++;
  for (let a = 0; a < n; a++) deg[a + 1] += deg[a];
  const fill = deg.slice(), rev = new Int32Array(adjN);
  for (let a = 0; a < n; a++) for (let e = start[a]; e < start[a + 1]; e++) rev[fill[adj[e]]++] = a;
  const dist = new Int32Array(n).fill(-1), present = new Uint8Array(n);
  let frontier: number[] = [];
  const targets = p.cars.filter((c) => c.exit);
  for (let a = 0; a < n; a++) {
    decode(codes[a], nc, st);
    let all = true, none = true; for (const c of targets) { if (st[c.i] === OUT) none = false; else all = false; }
    present[a] = none ? 1 : 0;
    if (all) { dist[a] = 0; frontier.push(a); }
  }
  while (frontier.length) {
    const next: number[] = [];
    for (const a of frontier) for (let e = deg[a]; e < deg[a + 1]; e++) { const b = rev[e]; if (dist[b] < 0) { dist[b] = dist[a] + 1; next.push(b); } }
    frontier = next;
  }
  return { codes, dist, present };
}

/** a board string for a state (the generator writes levels with it) */
export function board(p: Puzzle, s: Uint8Array): string {
  const g = grid(p, s); let out = '';
  for (let k = 0; k < g.length; k++) out += g[k] === -2 ? '#' : g[k] === -1 ? '.' : p.cars[g[k]].letter;
  return out;
}
/** how many different vehicles a solution moves (a second measure of how tangled a lot is) */
export const carsMoved = (sol: Move[]): number => new Set(sol.map((m) => m.car)).size;

/** Turn / mirror a square level (t = 0–7: four quarter turns, then the same mirrored) — the same puzzle with its exit on another side. */
export function transform(l: LevelData, t: number): LevelData {
  if (l.w !== l.h || !(t & 7)) return l;
  const n = l.w, rot = t & 3, flip = (t & 4) !== 0;
  const cell = (r: number, c: number): [number, number] => { if (flip) c = n - 1 - c; for (let k = 0; k < rot; k++) [r, c] = [c, n - 1 - r]; return [r, c]; };
  const vec = (dr: number, dc: number): [number, number] => { if (flip) dc = -dc; for (let k = 0; k < rot; k++) [dr, dc] = [dc, -dr]; return [dr, dc]; };
  const out = new Array<string>(n * n);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const [rr, cc] = cell(r, c); out[rr * n + cc] = l.b[r * n + c]; }
  const SYM: Record<string, [number, number]> = { '>': [0, 1], '<': [0, -1], v: [1, 0], '^': [-1, 0] };
  let x = '';
  for (let k = 0; k + 1 < l.x.length; k += 2) { const [dr, dc] = vec(...SYM[l.x[k + 1]]); x += l.x[k] + (dc === 1 ? '>' : dc === -1 ? '<' : dr === 1 ? 'v' : '^'); }
  return { ...l, b: out.join(''), x };
}
