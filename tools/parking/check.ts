/**
 * Validate every level in src/land/parking/levels.json: it parses (straight vehicles, 2–3 cells, a target, exits on the target's own
 * line), nothing overlaps, the solver solves it in exactly the stored number of moves, no two levels are the same, the difficulty
 * bands climb, and the special levels have their limits. node --experimental-strip-types tools/parking/check.ts
 */
import { readFileSync } from 'node:fs';
import { parse, solve, grid, moves, apply, solved, transform, OUT, type LevelData } from './.lib/engine.ts';
const data = JSON.parse(readFileSync(new URL('../../src/land/parking/levels.json', import.meta.url), 'utf8')) as { levels: LevelData[]; endless: LevelData[]; challenge: LevelData[]; timed: LevelData[]; season: LevelData[] };
let pass = 0, fail = 0; const bad: string[] = [];
const ok = (c: boolean, m: string) => { if (c) pass++; else { fail++; bad.push(m); } };
const seen = new Set<string>();
const all = [...data.levels.map((l, k) => ({ l, name: `level ${k + 1}` })), ...data.endless.map((l, k) => ({ l, name: `endless ${k + 1}` })), ...data.challenge.map((l, k) => ({ l, name: `challenge ${k + 1}` })), ...data.timed.map((l, k) => ({ l, name: `timed ${k + 1}` })), ...data.season.map((l, k) => ({ l, name: `holiday ${k + 1}` }))];
// the same layout turned or mirrored counts as a repeat
const canon = (l: LevelData) => { const ks: string[] = []; for (let t = 0; t < (l.w === l.h ? 8 : 1); t++) { const q = transform(l, t); ks.push(q.b.replace(/[A-Z]/g, (c) => (c === 'A' || c === 'B' ? c : 'x')) + q.x); } return ks.sort()[0]; };
const t0 = Date.now();
for (const { l, name } of all) {
  let p; try { p = parse(l); } catch (e) { ok(false, `${name}: ${(e as Error).message}`); continue; }
  const g = grid(p, p.start); let cells = 0; for (const c of p.cars) cells += c.len;
  ok([...g].filter((v) => v >= 0).length === cells, `${name}: vehicles overlap`);
  ok(!solved(p, p.start) && p.cars.filter((c) => c.exit).length === (l.t === 'd' ? 2 : 1), `${name}: targets`);
  const sol = solve(p, p.start, 2_000_000);
  ok(!!sol && sol.length === l.o, `${name}: solver says ${sol?.length ?? 'unsolvable'}, stored ${l.o}`);
  if (sol) { let s = p.start; for (const m of sol) { ok(moves(p, s).some((x) => x.car === m.car && x.to === m.to), `${name}: illegal move in solution`); s = apply(s, m); } ok(solved(p, s), `${name}: solution doesn't finish`); }
  const k = canon(l); ok(!seen.has(k), `${name}: repeats another layout`); seen.add(k);
  if (l.t === 't' || l.t === 'm' || l.lim) ok(!!l.lim && l.lim > (l.t === 't' ? l.o * 3 : l.o), `${name}: limit ${l.lim}`);
}
const L = data.levels;
ok(L.length === 500, `500 levels (${L.length})`);
const band = (a: number, b: number) => L.slice(a - 1, b).filter((l) => l.t !== 's').reduce((s, l) => s + l.o, 0) / L.slice(a - 1, b).filter((l) => l.t !== 's').length;
const bands = [[1, 20], [21, 75], [76, 150], [151, 250], [251, 350], [351, 450], [451, 500]].map(([a, b]) => band(a, b));
ok(bands.every((v, i) => i === 0 || v > bands[i - 1]), `difficulty climbs band by band: ${bands.map((v) => v.toFixed(1)).join(' → ')}`);
ok(L[0].o >= 2 && L[0].o <= 4 && L.slice(0, 12).every((l) => l.t === 'n') && L.slice(0, 29).every((l) => l.t === 'n' || l.t === 's'), 'level 1 is a short warm-up (2–4 moves); no specials before 13, no timers / limits / double escapes before 30');
// the opening ramp (ramp.ts): real thinking from the start, climbing without a dip into levels 101+
const avgO = (a: number, b: number) => { const xs = L.slice(a - 1, b).filter((l) => l.t !== 's'); return xs.reduce((s2, l) => s2 + l.o, 0) / xs.length; };
ok(avgO(1, 10) >= 5 && avgO(11, 20) >= 8 && avgO(21, 50) >= 10 && avgO(51, 100) >= 12.5 && avgO(51, 100) <= avgO(101, 150), `opening ramp: 1–10 ${avgO(1, 10).toFixed(1)}, 11–20 ${avgO(11, 20).toFixed(1)}, 21–50 ${avgO(21, 50).toFixed(1)}, 51–100 ${avgO(51, 100).toFixed(1)}, 101–150 ${avgO(101, 150).toFixed(1)}`);
const counts = L.reduce((m, l) => ({ ...m, [l.t]: (m[l.t] ?? 0) + 1 }), {} as Record<string, number>);
ok(counts.n > 350, `most levels are plain (no timer): ${JSON.stringify(counts)}`);
ok(L.slice(250).some((l) => l.b.includes('#')) && L.slice(0, 250).every((l) => !l.b.includes('#')), 'bollards from level 251');
// every 5th level is a step up from the four before it (plain levels), every 25th a bigger, fuller lot than the levels around it
const cars = (l: LevelData) => new Set([...l.b].filter((c) => c !== '.' && c !== '#')).size;
for (let k = 10; k <= 495; k += 5) { if (k % 25 === 0 || L[k - 1].t !== 'n') continue; const run = [k - 4, k - 3, k - 2, k - 1].filter((i) => L[i - 1].t === 'n'); ok(run.every((i) => L[k - 1].o >= L[i - 1].o), `level ${k} is the hardest of its five`); }
for (let k = 25; k < 500; k += 25) { const near = L.slice(k - 25, k - 1).filter((l) => l.t === 'n'); const avg = near.reduce((a, l) => a + l.o, 0) / near.length; ok(L[k - 1].o > avg && cars(L[k - 1]) >= 12 && L[k - 1].w >= 7, `milestone ${k}: ${L[k - 1].w}×${L[k - 1].h}, ${cars(L[k - 1])} vehicles, ${L[k - 1].o} moves vs ${avg.toFixed(1)} around it`); }
// the ladders: 50 each, climbing; Challenge = big crowded lots with a move goal, Timed = a countdown on every lot
for (const [nm, set, t] of [['challenge', data.challenge, 'n'], ['timed', data.timed, 't']] as const) {
  ok(set.length === 50, `${nm}: 50 lots`);
  ok(set.every((l, k) => k === 0 || l.o >= set[k - 1].o - 1), `${nm}: difficulty climbs`);
  ok(set.every((l) => l.t === t && !!l.lim), `${nm}: type and limit on every lot`);
}
ok(data.challenge.every((l) => l.w >= 7 && cars(l) >= 13), 'challenge lots are 7×7+ with 13+ vehicles');
ok(data.season.length >= 10, 'holiday pool');
// transforms keep a puzzle the same puzzle
const T = L[40]; for (let t = 0; t < 8; t++) { const q = transform(T, t); const p = parse(q); ok(solve(p, p.start)!.length === T.o, `transform ${t} keeps the solution length`); }
console.log(`${pass} passed, ${fail} failed (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
console.log('bands (average optimal moves):', bands.map((v) => v.toFixed(1)).join(' → '), '| types', JSON.stringify(counts), '| max', Math.max(...L.map((l) => l.o)));
for (const b of bad.slice(0, 20)) console.log('  ✗', b);
process.exit(fail ? 1 : 0);
