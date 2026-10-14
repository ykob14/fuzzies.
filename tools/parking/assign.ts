/**
 * Fill the levels the climbing generator didn't finish (the expert / master end) and the endless pool from the miners' output
 * (out/mine-*.jsonl): expert gaps get the mined puzzle closest to their planned move count, levels 451–500 get the hardest unused ones in
 * rising order (so the last levels really are the hardest), double-escape levels get mined double escapes, and what's left (24+ moves)
 * becomes the endless pool. Writes out/part-mine.jsonl; then run merge.ts. node --experimental-strip-types tools/parking/assign.ts
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { plan } from './plan.ts';

interface Mined { comp: string; b: string; w: number; h: number; x: string; o: number; double: boolean; walls: number }
const dir = new URL('./out/', import.meta.url).pathname;
const read = (f: string) => readFileSync(dir + f, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const have = new Set<number>(readdirSync(dir).filter((f) => /^part-\d+\.jsonl$/.test(f)).flatMap(read).map((r) => r.i));
const seenBoards = new Set<string>(readdirSync(dir).filter((f) => /^part-\d+\.jsonl$/.test(f)).flatMap(read).map((r) => r.b));
let pool: Mined[] = readdirSync(dir).filter((f) => f.startsWith('mine-') && f.endsWith('.jsonl')).flatMap(read).filter((m: Mined) => !seenBoards.has(m.b));
pool = pool.filter((m, k) => pool.findIndex((x) => x.b === m.b) === k);
const out: string[] = [];
const take = (m: Mined) => { pool = pool.filter((x) => x !== m); };
let lastComp = '';
const missing = Array.from({ length: 500 }, (_, k) => k + 1).filter((i) => !have.has(i));
// expert gaps (below 451): closest to the plan, a different vehicle set from the level before
for (const i of missing.filter((i) => i < 451)) {
  const pl = plan(i), want = (pl.lo + pl.hi) / 2, dbl = pl.type === 'd';
  const cands = pool.filter((m) => m.double === dbl && (i >= 251 || !m.walls)).sort((a, b) => Math.abs(a.o - want) - Math.abs(b.o - want) || Number(a.comp === lastComp) - Number(b.comp === lastComp));
  const m = cands[0]; if (!m) throw new Error(`nothing mined for level ${i}`);
  take(m); lastComp = m.comp;
  out.push(JSON.stringify({ i, b: m.b, w: m.w, h: m.h, x: m.x, o: m.o, t: pl.type, src: 'mine' }));
}
// the master band: the hardest 50 that are left, easiest first; double-escape levels take the hardest doubles
const master = missing.filter((i) => i >= 451);
const dblLevels = master.filter((i) => plan(i).type === 'd');
const doubles = pool.filter((m) => m.double).sort((a, b) => b.o - a.o).slice(0, dblLevels.length).sort((a, b) => a.o - b.o);
doubles.forEach(take);
const singles = pool.filter((m) => !m.double).sort((a, b) => b.o - a.o);
// at most two from one vehicle set among the master levels
const picked: Mined[] = []; const per = new Map<string, number>();
for (const m of singles) { if (picked.length >= master.length - dblLevels.length) break; const n = per.get(m.comp) ?? 0; if (n >= 2) continue; per.set(m.comp, n + 1); picked.push(m); }
picked.forEach(take);
picked.sort((a, b) => a.o - b.o);
let si = 0, di = 0;
for (const i of master) {
  const pl = plan(i);
  const m = pl.type === 'd' ? doubles[di++] : picked[si++];
  if (!m) throw new Error(`not enough mined puzzles for level ${i} — mine longer`);
  out.push(JSON.stringify({ i, b: m.b, w: m.w, h: m.h, x: m.x, o: m.o, t: pl.type, src: 'mine' }));
}
// endless pool: everything else that's single-target and 24+ moves
const endless = pool.filter((m) => !m.double && m.o >= 24).sort((a, b) => a.o - b.o).slice(0, 120);
endless.forEach((m, k) => out.push(JSON.stringify({ i: 10_000 + k, b: m.b, w: m.w, h: m.h, x: m.x, o: m.o, t: 'n', src: 'mine' })));
writeFileSync(dir + 'part-mine.jsonl', out.join('\n') + '\n');
const ms = out.map((l) => JSON.parse(l)).filter((r) => r.i >= 451 && r.i <= 500).map((r) => r.o);
console.log(`filled ${missing.length} levels (master band ${Math.min(...ms)}–${Math.max(...ms)} moves), endless pool ${endless.length}; ${pool.length - endless.length} mined puzzles left over`);
