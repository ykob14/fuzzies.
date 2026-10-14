/**
 * THE OPENING RAMP (owner, 2026-10-14: a play-tester found levels 1–14 "way too easy … it starts off really too slow").
 * Run AFTER expand.ts (expand rebuilds levels.json from out/base-levels.json and would undo this):
 *   bash tools/parking/lib.sh && node --experimental-strip-types tools/parking/expand.ts && node --experimental-strip-types tools/parking/ramp.ts
 * Levels 1–100 get new puzzles on a steeper curve — 3 moves at level 1 (was 1), 7 by level 10 (was 4), 9 by 20, 12 by 50, 14 by 100 —
 * so the start has real thinking in it and the climb meets levels 101+ (≈15 moves) without a dip. Same level numbers, same types
 * (special / timed / limited / double escape), same rewards; saved stars and paid rewards don't move. Every 5th level stays the
 * hardest of its five, the x13 specials stay a step up, the milestones 25 / 50 / 75 / 100 stay big crowded lots about a third harder
 * than the levels around them. Nothing outside levels 1–100 changes (the ladders, holiday lots and levels 101–500 are left as they are).
 * Seeded, so running it again gives the same levels.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { climb, rng, type Spec } from './.lib/generator.ts';
import { parse, explore, decode, board, solve, transform, type LevelData } from './.lib/engine.ts';
import { limitFor } from './limits.ts';

const END = 100;
const file = new URL('../../src/land/parking/levels.json', import.meta.url);
const data = JSON.parse(readFileSync(file, 'utf8')) as { v: number; levels: LevelData[]; endless: LevelData[]; challenge: LevelData[]; timed: LevelData[]; season: LevelData[] };
const L = data.levels;
const dir = new URL('./out/', import.meta.url).pathname;
const hash = (i: number) => { let h = i * 2654435761 >>> 0; h ^= h >>> 15; return h; };
const cars = (b: string) => new Set([...b].filter((c) => c !== '.' && c !== '#')).size;
const key = (l: { b: string; x: string; w: number; h: number }) => { const ks: string[] = []; for (let t = 0; t < (l.w === l.h ? 8 : 1); t++) { const q = transform({ ...l, o: 0, t: 'n' } as LevelData, t); ks.push(q.b.replace(/[A-Z]/g, (c) => (c === 'A' || c === 'B' ? c : 'x')) + q.x); } return ks.sort()[0]; };
// every layout outside levels 1–100 stays taken
const used = new Set<string>([...L.slice(END), ...data.endless, ...data.challenge, ...data.timed, ...data.season].map(key));

/** the new curve (plain levels): 3 → 5 → 7 → 9 → 10 → 12 → 13 → 14 */
const KNOTS: [number, number][] = [[1, 3], [5, 5], [10, 7], [20, 9], [30, 10], [50, 12], [75, 13], [100, 14]];
function base(i: number): number {
  for (let k = 1; k < KNOTS.length; k++) {
    const [a, va] = KNOTS[k - 1], [b, vb] = KNOTS[k];
    if (i <= b) return va + (vb - va) * (i - a) / (b - a);
  }
  return KNOTS[KNOTS.length - 1][1];
}
const milestone = (i: number) => i % 25 === 0;
function target(i: number): number {
  const t = L[i - 1].t, b = base(i);
  if (t === 's') return Math.round(b) + 3; // the x13 special challenges: a step up
  if (i % 5 === 0 && t === 'n') return Math.round(b) + 1; // the 5th of each run: a little spike
  return Math.round(b);
}
/** board size and how crowded: a handful of cars at level 1, a full lot by level 40 */
function spec(i: number, double: boolean): Spec {
  const lo = Math.min(9, 4 + Math.floor(i / 8)), hi = Math.min(12, lo + 3);
  return { w: 6, h: 6, cars: [lo, hi], trucks: i <= 6 ? 0.2 : 0.3, walls: 0, double, cap: 150_000 };
}

let changed = 0;
const out: LevelData[] = L.slice(0, END).map((l) => ({ ...l }));
for (let i = 1; i <= END; i++) {
  if (milestone(i)) continue; // done below, from the big lots
  const old = L[i - 1], want = target(i), double = old.t === 'd';
  const r = rng(i * 104729 + 31);
  let lo = want, tries = 0, got: LevelData | null = null;
  const t0 = Date.now();
  while (!got) {
    const f = climb(spec(i, double), lo, want, r, want <= 8 ? 200 : 700);
    tries++;
    if (f && f.opt >= lo && f.opt <= want) {
      const lvl: LevelData = { b: f.board, w: 6, h: 6, x: double ? 'A>Bv' : 'A>', o: f.opt, t: old.t };
      const q = i <= 10 ? lvl : transform(lvl, hash(i) % 8);
      const k = key(q);
      if (!used.has(k)) { used.add(k); got = q; }
    }
    if (tries % 8 === 0 && lo > want - 1) lo--; // very rarely out of reach: allow one move less
  }
  const lim = limitFor(got.t, got.o); if (lim) got.lim = lim; else delete got.lim;
  out[i - 1] = got; changed++;
  console.log(`level ${i}${old.t !== 'n' ? ` (${old.t})` : ''}: ${old.o} → ${got.o} moves, ${cars(got.b)} vehicles (${tries} climbs, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}

// ---- the 5th of each run of five is its hardest plain level (swap inside the run if the generator landed a move short) ----
for (let k = 5; k <= END; k += 5) {
  if (milestone(k) || out[k - 1].t !== 'n') continue;
  const run = [k - 4, k - 3, k - 2, k - 1, k].filter((i) => out[i - 1].t === 'n' && !milestone(i));
  const hardest = run.reduce((m, i) => (out[i - 1].o > out[m - 1].o ? i : m), run[0]);
  if (hardest !== k && out[hardest - 1].o > out[k - 1].o) {
    [out[k - 1], out[hardest - 1]] = [out[hardest - 1], out[k - 1]];
  }
}

// ---- milestones 25 / 50 / 75 / 100: big crowded lots about a third harder than the levels around them ----
interface Comp { b: string; w: number; h: number; x: string; o: number; double?: boolean; walls?: number }
const pool: Comp[] = readdirSync(dir).filter((f) => /^(big|mine)-\d+\.jsonl$/.test(f))
  .flatMap((f) => readFileSync(dir + f, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l) as Comp))
  .filter((c) => !c.double && c.w >= 7 && cars(c.b) >= 12);
function at(c: Comp, want: number): LevelData | null {
  const lvl: LevelData = { b: c.b.replace(/#/g, '.'), w: c.w, h: c.h, x: c.x, o: c.o, t: 'n' };
  const p = parse(lvl); const g = explore(p, p.start, 6_000_000); if (!g) return null;
  let best = -1, bestD = -1; const st = new Uint8Array(p.cars.length);
  for (let a = 0; a < g.codes.length; a++) {
    if (!g.present[a] || g.dist[a] < 0 || g.dist[a] > want) continue;
    if (g.dist[a] > bestD || (g.dist[a] === bestD && (a * 2654435761 >>> 0) % 7 === 0)) { bestD = g.dist[a]; best = a; }
  }
  if (best < 0 || bestD !== want) return null;
  decode(g.codes[best], p.cars.length, st);
  const q: LevelData = { b: board(p, st), w: c.w, h: c.h, x: c.x, o: bestD, t: 'n' };
  const sol = solve(parse(q), parse(q).start, 4_000_000);
  return sol && sol.length === bestD ? q : null;
}
for (let i = 25; i <= END; i += 25) {
  const near = out.slice(i - 25, i - 1).filter((l) => l.t === 'n');
  const avg = near.reduce((s, l) => s + l.o, 0) / near.length;
  const want = Math.round(avg * 1.35);
  const old = L[i - 1];
  if (old.o >= want && old.o <= want + 3) { console.log(`milestone ${i}: keeps its ${old.o}-move lot (around it ${avg.toFixed(1)})`); continue; }
  let got: LevelData | null = null;
  for (const c of pool.filter((c) => c.o >= want).sort((a, b) => cars(b.b) - cars(a.b) || a.o - b.o)) {
    const q0 = at(c, want); if (!q0) continue;
    const q = transform({ ...q0, t: 's' }, hash(i) % 8);
    const k = key(q); if (used.has(k)) continue;
    used.add(k); got = q; break;
  }
  if (!got) throw new Error(`no big lot at ${want} moves for milestone ${i} — mine more`);
  out[i - 1] = got; changed++;
  console.log(`milestone ${i}: ${old.o} → ${got.o} moves, ${got.w}×${got.h}, ${cars(got.b)} vehicles (around it ${avg.toFixed(1)})`);
}

data.levels = [...out, ...L.slice(END)];
writeFileSync(file, JSON.stringify(data));
const avg = (a: number, b: number) => { const xs = data.levels.slice(a - 1, b).filter((l) => l.t !== 's'); return (xs.reduce((s, l) => s + l.o, 0) / xs.length).toFixed(1); };
console.log(`${changed} levels changed. Averages: 1–10 ${avg(1, 10)} · 11–20 ${avg(11, 20)} · 21–50 ${avg(21, 50)} · 51–100 ${avg(51, 100)} · 101–150 ${avg(101, 150)}`);
