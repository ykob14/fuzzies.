/**
 * Mine hard puzzles: hill-climb vehicle sets until their puzzle graph is deep (≥ `lo` moves), then keep up to three different starting
 * layouts from that graph (the hardest, and a couple a few moves easier). Used for the expert/master levels and the endless pool, where
 * one-puzzle-per-climb is too slow. node --experimental-strip-types tools/parking/mine.ts <worker> <lo> <minutes>  → out/mine-<worker>.jsonl
 */
import { appendFileSync, mkdirSync } from 'node:fs';
import { explore, decode, board, OUT } from './.lib/engine.ts';
import { randomSetup, mutate, evaluate, toPuzzle, rng, type Spec } from './.lib/generator.ts';

const [worker, lo, minutes] = [Number(process.argv[2] ?? 0), Number(process.argv[3] ?? 34), Number(process.argv[4] ?? 20)];
const dir = new URL('./out/', import.meta.url).pathname; mkdirSync(dir, { recursive: true });
const file = `${dir}mine-${worker}.jsonl`;
const SPECS: Spec[] = [
  { w: 6, h: 6, cars: [11, 14], trucks: 0.3, walls: 0, double: false, cap: 150_000 },
  { w: 6, h: 6, cars: [10, 13], trucks: 0.3, walls: 1, double: false, cap: 150_000 },
  { w: 6, h: 6, cars: [10, 13], trucks: 0.3, walls: 2, double: false, cap: 150_000 },
  { w: 7, h: 7, cars: [13, 17], trucks: 0.35, walls: 1, double: false, cap: 120_000 },
  { w: 6, h: 6, cars: [9, 13], trucks: 0.3, walls: 0, double: true, cap: 150_000 },
];
const r = rng(worker * 7777 + 13 + Date.now() % 1000);
const end = Date.now() + minutes * 60_000; let comps = 0;
while (Date.now() < end) {
  const spec = SPECS[Math.floor(r() * SPECS.length)];
  let su = randomSetup(spec, r); let cur = evaluate(spec, su);
  for (let t = 0; t < 8 && !cur; t++) { su = randomSetup(spec, r); cur = evaluate(spec, su); }
  if (!cur) continue;
  let best = cur;
  for (let k = 0; k < 900 && best.maxDist < lo + 8 && Date.now() < end; k++) {
    const n = mutate(spec, cur.setup, r); const e = evaluate(spec, n);
    if (e && (e.maxDist >= cur.maxDist || r() < Math.exp((e.maxDist - cur.maxDist) / Math.max(0.3, 2 * (1 - k / 900))))) cur = e;
    if (cur.maxDist > best.maxDist) best = cur;
    if (k > 300 && best.maxDist < lo - 6) break; // a dead end: start over
  }
  if (best.maxDist < lo) continue;
  // keep a few starting layouts from this graph
  const p = toPuzzle(spec, best.setup); const g = explore(p, p.start, spec.cap)!;
  comps++;
  const wants = [best.maxDist, best.maxDist - 2, best.maxDist - 5].filter((d) => d >= lo);
  for (const d of wants) {
    const idx: number[] = []; for (let a = 0; a < g.codes.length; a++) if (g.present[a] && g.dist[a] === d) idx.push(a);
    if (!idx.length) continue;
    const st = decode(g.codes[idx[Math.floor(r() * idx.length)]], p.cars.length);
    if ([...st].some((v) => v === OUT)) continue;
    appendFileSync(file, JSON.stringify({ comp: `${worker}-${comps}`, b: board(p, st), w: spec.w, h: spec.h, x: spec.double ? 'A>Bv' : 'A>', o: d, double: spec.double, walls: spec.walls }) + '\n');
  }
  console.log(`component ${comps}: ${best.maxDist} moves (${spec.w}×${spec.h}${spec.double ? ' double' : ''}, walls ${spec.walls})`);
}
