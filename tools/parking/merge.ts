/**
 * Merge the generator's parts into src/land/parking/levels.json: levels 1–500 in order (turned / mirrored for variety from level
 * 11 on — the same puzzle with its exit on another side), the time or move limits of the special levels, and the endless pool.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { transform, type LevelData } from './.lib/engine.ts';
import { limitFor } from './limits.ts';

const dir = new URL('./out/', import.meta.url).pathname;
const rows = readdirSync(dir).filter((f) => f.startsWith('part-')).flatMap((f) => readFileSync(dir + f, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)));
const by = new Map<number, { i: number; b: string; w: number; h: number; x: string; o: number; t: LevelData['t'] }>(rows.map((r) => [r.i, r]));
const hash = (i: number) => { let h = i * 2654435761 >>> 0; h ^= h >>> 15; return h; };
const levels: LevelData[] = [];
for (let i = 1; i <= 500; i++) {
  let r = by.get(i);
  if (!r) { if (!process.argv.includes('--partial')) throw new Error(`level ${i} is missing — run the generator to the end`); r = [...by.values()].filter((x) => x.i < 10_000)[i % by.size]; } // dev only: fill gaps
  const base: LevelData = { b: r.b, w: r.w, h: r.h, x: r.x, o: r.o, t: r.t };
  const lim = limitFor(r.t, r.o); if (lim) base.lim = lim;
  levels.push(i <= 10 ? base : transform(base, hash(i) % 8));
}
const endless: LevelData[] = [...by.values()].filter((r) => r.i >= 10_000).sort((a, b) => a.i - b.i).map((r) => ({ b: r.b, w: r.w, h: r.h, x: r.x, o: r.o, t: 'n' }));
writeFileSync(new URL('../../src/land/parking/levels.json', import.meta.url), JSON.stringify({ v: 1, levels, endless }));
console.log(`levels.json: ${levels.length} levels + ${endless.length} endless puzzles`);
