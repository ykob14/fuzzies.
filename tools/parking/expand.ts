/**
 * Difficulty pass + the two extra ladders, on top of the finished levels.json (owner feedback, 2026-10-14):
 *  - every 5th level is a spike: inside each run of five, the hardest plain puzzle moves to the 5th place (a permutation — the same
 *    500 puzzles, the band averages unchanged, nobody's saved stars or reward keys move);
 *  - every 25th level (25 … 475; 500 stays the finale) becomes a MAJOR challenge: a bigger, fuller lot (7×7 → 8×8, 13–17 vehicles)
 *    about a third harder than the levels around it — picked from the miners' big puzzle graphs at exactly the move count wanted;
 *  - Challenge ladder: 50 big crowded lots, 16 → 60+ moves (an optional move limit);
 *  - Timed Escape ladder: 50 lots, 6 → 28 moves, each with a countdown;
 *  - a holiday pool of 40 lots (8 → 22 moves) for the seasonal events.
 * No layout appears twice anywhere (any turn / mirror counts as the same). Every puzzle is re-solved by check.ts.
 * node --experimental-strip-types tools/parking/expand.ts   (after lib.sh)
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { parse, explore, decode, board, solve, transform, type LevelData } from './.lib/engine.ts';
import { limitFor } from './limits.ts';

interface Comp { b: string; w: number; h: number; x: string; o: number; double?: boolean; walls?: number; src: string }
const file = new URL('../../src/land/parking/levels.json', import.meta.url);
const data = JSON.parse(readFileSync(file, 'utf8')) as { v: number; levels: LevelData[]; endless: LevelData[] };
const dir = new URL('./out/', import.meta.url).pathname;
// always start from the untouched 500 (saved to out/base-levels.json on the first run, so this script can be run again)
if (!existsSync(dir + 'base-levels.json')) writeFileSync(dir + 'base-levels.json', JSON.stringify(data.levels));
const L: LevelData[] = (JSON.parse(readFileSync(dir + 'base-levels.json', 'utf8')) as LevelData[]).map((l) => ({ ...l }));
const read = (f: string) => readFileSync(dir + f, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const pool: Comp[] = readdirSync(dir).filter((f) => /^(big|mine)-\d+\.jsonl$/.test(f)).flatMap((f) => read(f).map((r: Comp) => ({ ...r, src: f })));
const cars = (b: string) => new Set([...b].filter((c) => c !== '.' && c !== '#')).size;
const hash = (i: number) => { let h = i * 2654435761 >>> 0; h ^= h >>> 15; return h; };

// ---- layouts already in use (all eight turns / mirrors) ----
const key = (l: { b: string; x: string; w: number; h: number }) => { const ks: string[] = []; for (let t = 0; t < (l.w === l.h ? 8 : 1); t++) { const q = transform({ ...l, o: 0, t: 'n' } as LevelData, t); ks.push(q.b.replace(/[A-Z]/g, (c) => (c === 'A' || c === 'B' ? c : 'x')) + q.x); } return ks.sort()[0]; };
const used = new Set<string>([...L, ...data.endless].map(key));
const usedComp = new Set<string>([...L, ...data.endless].map((l) => l.b)); // exact boards: a mined component's own start state

/** a state of this component at `target` moves from the goal (or the nearest below it), as a level; null if none */
function at(c: Comp, target: number, noWalls: boolean): LevelData | null {
  const lvl: LevelData = { b: noWalls ? c.b.replace(/#/g, '.') : c.b, w: c.w, h: c.h, x: c.x, o: c.o, t: 'n' };
  const p = parse(lvl);
  const g = explore(p, p.start, 6_000_000); if (!g) return null;
  let best = -1, bestD = -1;
  const st = new Uint8Array(p.cars.length);
  for (let a = 0; a < g.codes.length; a++) {
    if (!g.present[a] || g.dist[a] < 0 || g.dist[a] > target) continue;
    if (g.dist[a] > bestD || (g.dist[a] === bestD && (a * 2654435761 >>> 0) % 7 === 0)) { bestD = g.dist[a]; best = a; }
  }
  if (best < 0 || bestD < Math.max(2, target - 3)) return null;
  decode(g.codes[best], p.cars.length, st);
  const out: LevelData = { b: board(p, st), w: c.w, h: c.h, x: c.x, o: bestD, t: 'n' };
  const sol = solve(parse(out), parse(out).start, 4_000_000);
  if (!sol || sol.length !== bestD) return null;
  return out;
}
const taken = new Map<Comp, number>();
/**
 * The best component for a wish list, turned into a level at `target` moves. Fresh components first; when the deep ones run out a
 * component may give a second, different arrangement (another state of the same vehicles — never the same layout).
 */
function pick(target: number, ok: (c: Comp) => boolean, noWalls: boolean, prefer: (c: Comp) => number): LevelData {
  for (const reuse of [0, 1, 2]) {
    const cands = pool.filter((c) => (taken.get(c) ?? 0) === reuse && !c.double && ok(c) && c.o >= target).sort((a, b) => prefer(b) - prefer(a) || a.o - b.o);
    for (const c of cands) {
      const l = at(c, target, noWalls); if (!l) continue;
      const k = key(l); if (used.has(k)) continue;
      taken.set(c, reuse + 1); used.add(k); return l;
    }
  }
  throw new Error(`nothing for ${target} moves — mine more`);
}

// ---- 0. a level that repeats an earlier one (turned or mirrored) gets a fresh lot of the same difficulty ----
{
  const seenK = new Set<string>();
  for (let i = 1; i <= 500; i++) {
    const k = key(L[i - 1]);
    if (!seenK.has(k)) { seenK.add(k); continue; }
    const o = L[i - 1];
    const fresh = pick(o.o, (c) => c.w === o.w && (i >= 251 || !c.walls), i < 251, (c) => -Math.abs(cars(c.b) - cars(o.b)));
    if (fresh.o !== o.o) throw new Error(`no exact replacement for level ${i}`);
    L[i - 1] = { ...transform(fresh, hash(i) % 8), t: o.t, ...(o.lim ? { lim: o.lim } : {}) };
    seenK.add(key(L[i - 1]));
    console.log(`level ${i} repeated an earlier level — replaced with a fresh ${o.o}-move lot`);
  }
}
// ---- 1. spikes: the hardest plain puzzle of each run of five goes last ----
const special = (i: number) => L[i - 1].t !== 'n';
for (let k = 10; k < 500; k += 5) {
  const run = [k - 4, k - 3, k - 2, k - 1, k].filter((i) => !special(i));
  if (!run.includes(k) || run.length < 2) continue;
  const hardest = run.reduce((m, i) => (L[i - 1].o > L[m - 1].o ? i : m), run[0]);
  if (hardest !== k) [L[k - 1], L[hardest - 1]] = [L[hardest - 1], L[k - 1]];
}

// ---- 2. major challenges every 25 levels ----
const avg = (a: number, b: number) => { const xs = L.slice(a - 1, b).filter((l) => l.t === 'n').map((l) => l.o); return xs.reduce((s, v) => s + v, 0) / xs.length; };
for (let i = 25; i < 500; i += 25) {
  const target = Math.round(Math.max(L[i - 1].o + 2, avg(i - 24, i - 1) * 1.35));
  const big = i >= 300 ? 8 : 7;
  const lvl = pick(target, (c) => c.w >= (i >= 150 ? 7 : 7) && cars(c.b) >= (i < 100 ? 12 : 14), i < 251, (c) => (c.w === big ? 100 : 0) + cars(c.b));
  const t = transform({ ...lvl, t: 's' }, i <= 10 ? 0 : hash(i) % 8);
  L[i - 1] = t;
}

// ---- 3. Challenge ladder: big crowded lots, 16 → 62 moves ----
const challenge: LevelData[] = [];
for (let k = 0; k < 50; k++) {
  const target = Math.round(16 + (46 * k) / 49);
  const lvl = pick(target, (c) => c.w >= 7 && cars(c.b) >= 13, false, (c) => cars(c.b) + (c.w === 8 ? 3 : 0));
  const t = transform(lvl, hash(1000 + k) % 8);
  const lim = limitFor('m', t.o)!; challenge.push({ ...t, lim });
}
// ---- 4. Timed Escape ladder: 6 → 28 moves with a countdown ----
const timed: LevelData[] = [];
for (let k = 0; k < 50; k++) {
  const target = Math.round(6 + (22 * k) / 49);
  const lvl = pick(target, () => true, false, (c) => -Math.abs(cars(c.b) - 11));
  const t = transform({ ...lvl, t: 't' }, hash(2000 + k) % 8);
  timed.push({ ...t, lim: limitFor('t', t.o)! });
}

// ---- 5. the holiday pool: 40 lots, 8 → 22 moves (each holiday takes 10, turned differently each year) ----
const season: LevelData[] = [];
for (let k = 0; k < 40; k++) {
  const target = Math.round(8 + (14 * k) / 39);
  const lvl = pick(target, (c) => c.w <= 7, false, (c) => -Math.abs(cars(c.b) - 10));
  season.push(lvl);
}
writeFileSync(file, JSON.stringify({ v: 2, levels: L, endless: data.endless, challenge, timed, season }));
const m = L.filter((_, k) => (k + 1) % 25 === 0 && k + 1 < 500);
console.log(`spikes done; milestones ${m.map((l) => `${l.w}×${l.h}/${cars(l.b)}v/${l.o}`).join(' ')}`);
console.log(`challenge ${challenge[0].o}–${challenge[49].o} moves (${Math.min(...challenge.map((l) => cars(l.b)))}–${Math.max(...challenge.map((l) => cars(l.b)))} vehicles); timed ${timed[0].o}–${timed[49].o}`);
