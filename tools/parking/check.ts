/**
 * Validate every level in src/land/parking/levels.json: it parses (straight vehicles, 2–3 cells, a target, exits on the target's own
 * line), nothing overlaps, the solver solves it in exactly the stored number of moves, no two levels are the same, the difficulty
 * bands climb, and the special levels have their limits. node --experimental-strip-types tools/parking/check.ts
 */
import { readFileSync } from 'node:fs';
import { parse, solve, grid, moves, apply, solved, transform, OUT, type LevelData } from './.lib/engine.ts';
const data = JSON.parse(readFileSync(new URL('../../src/land/parking/levels.json', import.meta.url), 'utf8')) as { levels: LevelData[]; endless: LevelData[] };
let pass = 0, fail = 0; const bad: string[] = [];
const ok = (c: boolean, m: string) => { if (c) pass++; else { fail++; bad.push(m); } };
const seen = new Set<string>();
const all = [...data.levels.map((l, k) => ({ l, name: `level ${k + 1}` })), ...data.endless.map((l, k) => ({ l, name: `endless ${k + 1}` }))];
const t0 = Date.now();
for (const { l, name } of all) {
  let p; try { p = parse(l); } catch (e) { ok(false, `${name}: ${(e as Error).message}`); continue; }
  const g = grid(p, p.start); let cells = 0; for (const c of p.cars) cells += c.len;
  ok([...g].filter((v) => v >= 0).length === cells, `${name}: vehicles overlap`);
  ok(!solved(p, p.start) && p.cars.filter((c) => c.exit).length === (l.t === 'd' ? 2 : 1), `${name}: targets`);
  const sol = solve(p, p.start, 2_000_000);
  ok(!!sol && sol.length === l.o, `${name}: solver says ${sol?.length ?? 'unsolvable'}, stored ${l.o}`);
  if (sol) { let s = p.start; for (const m of sol) { ok(moves(p, s).some((x) => x.car === m.car && x.to === m.to), `${name}: illegal move in solution`); s = apply(s, m); } ok(solved(p, s), `${name}: solution doesn't finish`); }
  const k = l.b + l.x; ok(!seen.has(k), `${name}: duplicate`); seen.add(k);
  if (l.t === 't' || l.t === 'm') ok(!!l.lim && l.lim > (l.t === 'm' ? l.o : l.o * 3), `${name}: limit ${l.lim}`);
}
const L = data.levels;
ok(L.length === 500, `500 levels (${L.length})`);
const band = (a: number, b: number) => L.slice(a - 1, b).filter((l) => l.t !== 's').reduce((s, l) => s + l.o, 0) / L.slice(a - 1, b).filter((l) => l.t !== 's').length;
const bands = [[1, 20], [21, 75], [76, 150], [151, 250], [251, 350], [351, 450], [451, 500]].map(([a, b]) => band(a, b));
ok(bands.every((v, i) => i === 0 || v > bands[i - 1]), `difficulty climbs band by band: ${bands.map((v) => v.toFixed(1)).join(' → ')}`);
ok(L[0].o === 1 && L.slice(0, 12).every((l) => l.t === 'n') && L.slice(0, 29).every((l) => l.t === 'n' || l.t === 's'), 'level 1 is one move; no specials before 13, no timers / limits / double escapes before 30');
const counts = L.reduce((m, l) => ({ ...m, [l.t]: (m[l.t] ?? 0) + 1 }), {} as Record<string, number>);
ok(counts.n > 350, `most levels are plain (no timer): ${JSON.stringify(counts)}`);
ok(L.slice(250).some((l) => l.b.includes('#')) && L.slice(0, 250).every((l) => !l.b.includes('#')), 'bollards from level 251');
// transforms keep a puzzle the same puzzle
const T = L[40]; for (let t = 0; t < 8; t++) { const q = transform(T, t); const p = parse(q); ok(solve(p, p.start)!.length === T.o, `transform ${t} keeps the solution length`); }
console.log(`${pass} passed, ${fail} failed (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
console.log('bands (average optimal moves):', bands.map((v) => v.toFixed(1)).join(' → '), '| types', JSON.stringify(counts), '| max', Math.max(...L.map((l) => l.o)));
for (const b of bad.slice(0, 20)) console.log('  ✗', b);
process.exit(fail ? 1 : 0);
