/**
 * Build the levels: node --experimental-strip-types tools/parking/generate.ts <part> <parts> [endless]   (tools/parking/build.sh runs
 * four parts in parallel). Each part appends finished levels to tools/parking/out/part-<part>.jsonl and skips what's already there,
 * so a stopped run picks up where it left off. merge.ts turns the parts into src/land/parking/levels.json.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { climb, rng } from './.lib/generator.ts';
import { plan, endlessPlan, type PlanLine } from './plan.ts';

const [part, parts] = [Number(process.argv[2] ?? 0), Number(process.argv[3] ?? 1)];
const ENDLESS = Number(process.argv[4] ?? 0);
const dir = new URL('./out/', import.meta.url).pathname; mkdirSync(dir, { recursive: true });
const file = `${dir}part-${part}.jsonl`;
const done = new Set<number>(existsSync(file) ? readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l).i) : []);
const lines: PlanLine[] = [];
for (let i = 1; i <= 500; i++) if ((i - 1) % parts === part) lines.push(plan(i));
for (let k = 0; k < ENDLESS; k++) if (k % parts === part) lines.push(endlessPlan(k));
const seen = new Set<string>();
for (const pl of lines) {
  if (done.has(pl.i)) continue;
  const r = rng(pl.i * 7919 + 17);
  let lo = pl.lo, tries = 0; const t0 = Date.now();
  for (;;) {
    const f = climb(pl.spec, lo, pl.hi, r, pl.lo <= 8 ? 120 : 700);
    tries++;
    if (f && f.opt >= lo && f.opt <= pl.hi && !seen.has(f.board)) {
      seen.add(f.board);
      appendFileSync(file, JSON.stringify({ i: pl.i, b: f.board, w: pl.spec.w, h: pl.spec.h, x: pl.spec.double ? 'A>Bv' : 'A>', o: f.opt, t: pl.type, states: f.states }) + '\n');
      console.log(`level ${pl.i}: ${f.opt} moves (${pl.lo}–${pl.hi}), ${pl.spec.w}×${pl.spec.h}, ${tries} climbs, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
      break;
    }
    if (tries % 6 === 0 && lo > 1) lo--; // very rarely a target is out of reach: ease it one move at a time
  }
}
