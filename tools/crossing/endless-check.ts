// Endless Crossing checks. Run: bash tools/crossing/run.sh endless-check.ts [--quick] [--stretches=N] [--seeds=N]
//   determinism per seed, every generated stretch proven crossable (and re-proven from other start times), difficulty rising,
//   rewards/unlock thresholds, coins + XP through the store, records merging between devices.
import './shim';
import {
  planStretch, buildStretch, stretch, stretchSteps, proveStretch, rampOf, dailySeed, utcDay, hashString, distanceOf, livesAfter, newTokensAt, endlessRewards,
  OFFSETS, CROSS_LIMIT, ROWS_PER_STRETCH, MAX_LIVES, LIFE_EVERY, TOKEN_FIRST, FAMILIES, TUNE, msToNextDaily, type Stretch,
} from '../../src/crossing/endless';
import { MIN_WARN, type LevelDef } from '../../src/crossing/sim';
import { Solver, DT } from './solver';
import { merge3 } from '../../src/core/merge';
import { freshCrossing, migrateCrossing } from '../../src/crossing/save';
import { accounts } from '../../src/core/account';
import * as S from '../../src/crossing/store';

const args = process.argv.slice(2);
const QUICK = args.includes('--quick');
const arg = (name: string, d: number) => { const a = args.find((x) => x.startsWith(`--${name}=`)); return a ? Number(a.split('=')[1]) : d; };
const N = arg('stretches', QUICK ? 120 : 500);
const SEEDS = arg('seeds', QUICK ? 2 : 3);
let pass = 0, fail = 0;
const ok = (c: unknown, m: string) => { if (c) pass++; else { fail++; console.log('  ✗', m); } };
const t0 = Date.now();

// ---------- seeds ----------
console.log('seeds');
ok(dailySeed('2026-10-16') === dailySeed('2026-10-16'), 'daily seed is a pure function of the date');
ok(dailySeed('2026-10-16') !== dailySeed('2026-10-17'), 'a different day has a different seed');
ok(utcDay(Date.UTC(2026, 9, 16, 23, 59)) === '2026-10-16' && utcDay(Date.UTC(2026, 9, 17, 0, 0)) === '2026-10-17', 'the day changes at UTC midnight');
ok(msToNextDaily(Date.UTC(2026, 9, 16, 23, 0)) === 3600000, 'countdown to the next daily road');
ok(hashString('a') !== hashString('b'), 'hash differs');

// ---------- determinism ----------
console.log('determinism');
const seedList = [dailySeed('2026-10-16'), 12345, 987654321].slice(0, Math.max(SEEDS, 1));
const sig = (d: LevelDef) => JSON.stringify([d.id, d.world, d.mood, d.weather, d.nests, d.coins, d.rows.map((r) => [r.token, r.speed, r.span, r.start, r.objs.map((o) => [o.x, o.len, o.kind, o.sinks, o.phase])])]);
for (const seed of seedList) {
  for (const n of [0, 1, 5, 12, 25, 40]) {
    const a = buildStretch(seed, planStretch(seed, n, 0)), b = buildStretch(seed, planStretch(seed, n, 0));
    ok(sig(a) === sig(b), `seed ${seed} stretch ${n}: planning twice gives the same road`);
  }
  // the proven stretch (including its rejected variants) is the same wherever and whenever it is computed
  for (const n of [0, 7, 22, 33]) {
    const it = stretchSteps(seed, n); let r = it.next(); while (!r.done) r = it.next();
    const s2 = stretch(seed, n);
    ok(sig(r.value.def) === sig(s2.def) && r.value.rejected === s2.rejected, `seed ${seed} stretch ${n}: proving twice picks the same variant (${s2.rejected} thrown away)`);
  }
}
ok(sig(buildStretch(1, planStretch(1, 3, 0))) !== sig(buildStretch(2, planStretch(2, 3, 0))), 'different seeds give different roads');
ok(distanceOf(0, 5) === 5 && distanceOf(3, 12) === 48 && distanceOf(2, 99) === 36, 'distance counts rows (12 per stretch, 0–12 in the current one)');
ok(livesAfter(1, 3) === 1 && livesAfter(1, LIFE_EVERY - 1) === 2 && livesAfter(MAX_LIVES, LIFE_EVERY - 1) === MAX_LIVES, 'a spare life every ' + LIFE_EVERY + ' stretches, never above ' + MAX_LIVES);

// ---------- every stretch proven ----------
console.log(`proof: ${SEEDS} seeds × ${N} stretches`);
interface Row { n: number; s: Stretch; avgSpeed: number; safe: number; open: number; objs: number }
const all: Row[][] = [];
let maxRej = 0, totalRej = 0, maxMs = 0, totalMs = 0;
const offGrid: number[] = []; for (let o = 0.7; o < 64; o += 1.7) offGrid.push(Math.round(o * 10) / 10);
let offGridLost = 0, offGridTotal = 0, bfsChecked = 0, bfsAgree = 0, bfsSum = 0;
for (let si = 0; si < SEEDS; si++) {
  const seed = seedList[si] ?? 1000 + si;
  const rows: Row[] = [];
  for (let n = 0; n < N; n++) {
    const t = Date.now();
    const s = stretch(seed, n);
    const ms = Date.now() - t; totalMs += ms; maxMs = Math.max(maxMs, ms);
    maxRej = Math.max(maxRej, s.rejected); totalRej += s.rejected;
    const d = s.def;
    // the grid it was proven on
    ok(proveStretch(d).ok, `seed ${seed} #${n}: crossable from all ${OFFSETS.length} start times`);
    // and from start times in between (not used while generating)
    const p2 = proveStretch(d, offGrid, false, d.timer * 0.75, 400000); offGridTotal += offGrid.length; offGridLost += p2.lost;
    if (n % 10 === 0) { // the slow breadth-first solver of the level checker agrees (and gives the true fastest crossing)
      const k0 = Math.round(7.5 / DT); const f = new Solver(d).cross(k0, CROSS_LIMIT);
      bfsChecked++; if (f) { bfsAgree++; bfsSum += (f.k - k0) * DT; }
    }
    // shape of the stretch
    ok(d.rows.length === 11 && d.nests.length >= 2 && d.goal.nests === 1 && d.lives === MAX_LIVES && d.teleports.length === 0, `seed ${seed} #${n}: shape`);
    ok(d.rows.every((r, i) => r.row === i + 1), `seed ${seed} #${n}: rows numbered`);
    ok(d.id.includes('-') && d.id === `e${seed.toString(36)}-${n}`, `seed ${seed} #${n}: id`);
    for (const L of d.rows) {
      if (L.train && L.train.warn < MIN_WARN) ok(false, `#${n} train warn`);
      if (L.strikes && (L.strikes.warn < MIN_WARN || L.strikes.phase < L.strikes.warn)) ok(false, `#${n} strike warn`);
      if (L.lasers && L.lasers.warn < MIN_WARN) ok(false, `#${n} laser warn`);
      if (L.flood && L.flood.warn < MIN_WARN) ok(false, `#${n} flood warn`);
      if (L.ghost && L.ghost.fade < MIN_WARN) ok(false, `#${n} ghost fade`);
      if (L.sink && L.sink.warn < MIN_WARN) ok(false, `#${n} sink warn`);
    }
    const moving = d.rows.filter((r) => r.speed !== 0 && r.surface !== 'rail');
    rows.push({ n, s, avgSpeed: moving.length ? moving.reduce((a, r) => a + Math.abs(r.speed), 0) / moving.length : 0, safe: s.plan.tokens.filter((t) => t === 'g' || t === 'gc' || t === 'gb').length, open: d.nests.length, objs: d.rows.reduce((a, r) => a + r.objs.length, 0) });
  }
  all.push(rows);
  console.log(`  seed ${seed}: ${N} stretches proven, ${rows.reduce((a, r) => a + r.s.rejected, 0)} layouts thrown away, worst crossing ${Math.max(...rows.map((r) => r.s.proof.worst)).toFixed(1)} s (limit ${CROSS_LIMIT} s)`);
}
console.log(`  prove time: avg ${(totalMs / (SEEDS * N)).toFixed(0)} ms, max ${maxMs} ms per stretch (the game does this in a worker, 2 stretches ahead); thrown away ≤ ${maxRej} per stretch, ${(totalRej / (SEEDS * N)).toFixed(2)} on average`);
console.log(`  from ${offGridTotal} start times not used while generating: ${offGridLost} unwinnable (${((100 * offGridLost) / offGridTotal).toFixed(2)} %)`);
ok(offGridLost === 0, 'every stretch is crossable from start times in between, too (waiting at the start is allowed; limit = the lives\' timer × 0.75)');
console.log(`  breadth-first cross-check on ${bfsChecked} stretches: ${bfsAgree} found a route; the fastest takes ${(bfsSum / Math.max(1, bfsAgree)).toFixed(1)} s on average`);
ok(bfsAgree === bfsChecked, 'the level checker\'s breadth-first solver finds a route in every stretch it was asked about');
ok(maxRej < 40, 'no stretch needed all 40 variants');

// ---------- difficulty ----------
console.log('difficulty');
const flat = all.flat();
const band = (a: number, b: number, f: (r: Row) => number, skipBreather = true) => {
  const xs = flat.filter((r) => r.n >= a && r.n < b && !(skipBreather && r.n >= 3 && r.n % TUNE.breatherEvery === TUNE.breatherEvery - 1)).map(f);
  return xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);
};
const bands: [number, number][] = [[0, 4], [4, 10], [10, 18], [18, 28], [28, 40], [40, N]];
const speeds = bands.map(([a, b]) => band(a, b, (r) => r.avgSpeed));
const safes = bands.map(([a, b]) => band(a, b, (r) => r.safe));
const opens = bands.map(([a, b]) => band(a, b, (r) => r.open));
console.log('  rows        ', bands.map(([a, b]) => `${a * ROWS_PER_STRETCH}-${(b - 1) * ROWS_PER_STRETCH}`).join('  '));
console.log('  lane speed  ', speeds.map((x) => x.toFixed(2)).join('  '));
console.log('  safe rows   ', safes.map((x) => x.toFixed(1)).join('  '));
console.log('  open nests  ', opens.map((x) => x.toFixed(1)).join('  '));
for (let i = 1; i < speeds.length; i++) if (bands[i][0] < 40) ok(speeds[i] >= speeds[i - 1] * 0.97, `lane speed rises (band ${i}: ${speeds[i].toFixed(2)} vs ${speeds[i - 1].toFixed(2)})`);
const lastBand = bands.map(([a, b]) => flat.filter((r) => r.n >= a && r.n < b).length).reduce((m, c, i) => (c >= 6 ? i : m), 0);
ok(speeds[lastBand] > speeds[0] * 1.3, `the far road is faster than the start (${speeds[lastBand].toFixed(2)} vs ${speeds[0].toFixed(2)})`);
ok(safes[0] > safes[lastBand] && opens[0] > opens[lastBand], 'fewer safe rows and fewer open nests far down the road');
const ramp = Array.from({ length: 80 }, (_, n) => rampOf(n));
ok(ramp.every((x) => x >= 0 && x <= 1), 'difficulty stays in 0..1');
ok(ramp[0] === 0 && ramp[35] > ramp[10] && ramp[60] >= ramp[36] - TUNE.breather, 'difficulty climbs, then holds');
ok(ramp.filter((x, n) => n >= 3 && n % TUNE.breatherEvery === TUNE.breatherEvery - 1).length > 0 && ramp[7] < ramp[6], 'every ' + TUNE.breatherEvery + 'th stretch is a breather');
// new mechanics arrive gradually: no stretch before a token's first stretch uses it
let early = 0, seenNew = 0;
for (const rows of all) for (const r of rows) {
  for (const t of r.s.plan.tokens) { const first = t === 'g' || t === 'gc' ? 0 : TOKEN_FIRST[t]; if (first !== undefined && r.n < first) early++; }
  for (const t of newTokensAt(r.n)) if (t !== 'gb' || r.n === 6) if (r.s.plan.tokens.includes(t)) seenNew++;
}
ok(early === 0, 'no lane shows up before its stretch (' + early + ' too early)');
const newCount = new Set(Object.values(TOKEN_FIRST)).size;
ok(seenNew >= newCount * SEEDS * 0.9, `each new lane type appears in the stretch that introduces it (${seenNew} of ${newCount * SEEDS})`);
const distinct = (a: number, b: number) => new Set(flat.filter((r) => r.n >= a && r.n < b).flatMap((r) => r.s.plan.tokens)).size;
ok(distinct(0, 4) <= 8 && (N < 36 || distinct(0, 36) >= 24) && (N < 60 || distinct(36, N) >= 28), `variety grows: ${distinct(0, 4)} lane types in the first 4 stretches, ${distinct(0, 36)} by stretch 36, ${distinct(36, N)} after`);
ok(FAMILIES.length === 9, 'nine looks plus the legend mix');
console.log('  coins per stretch', (flat.reduce((a, r) => a + r.s.def.coins.length, 0) / flat.length).toFixed(1));
ok(flat.every((r) => r.s.def.coins.length >= 1), 'every stretch has something to collect');
ok(flat.every((r) => r.s.def.coins.every((c) => c.row >= 1 && c.row <= 11 && c.col >= 0 && c.col < 11)), 'coins are on the board');

// ---------- rewards, coins, XP, records (through the real store) ----------
console.log('rewards and records');
const rw = endlessRewards();
ok(rw.map((r) => r.id).join() === 'samurai,dragon,aurora' && rw.map((r) => r.rows).join() === '100,500,800', 'the endless Fuzzies are Samurai 100, Dragon 500, Aurora 800 rows');
for (const r of rw) { const need = Math.ceil(r.rows / ROWS_PER_STRETCH); ok(need <= N + 40 || r.rows <= N * ROWS_PER_STRETCH, `${r.id}: ${need} stretches is reachable on the generated road`); }
accounts.guest();
const sv = () => S.save();
const c0 = sv().coinsEarned, x0 = sv().xp;
S.report({ kind: 'run', score: 1000, level: 9, rows: 99, mode: 'endless' });
ok(!S.hasCharacter('samurai') && sv().endless.best === 99 && sv().endless.runs === 1, '99 rows: no Samurai yet');
ok(sv().coinsEarned - c0 === S.coinsFor({ kind: 'run', score: 1000, level: 9, rows: 99, mode: 'endless' }) && sv().coinsEarned - c0 === 20, 'run coins follow the store (score/100 × 2)');
ok(sv().xp - x0 === S.xpFor({ kind: 'run', score: 1000, level: 9, rows: 99, mode: 'endless' }) && sv().xp - x0 === 60 + 39, `run XP follows the store (score + rows/10 × 4): +${sv().xp - x0}`);
S.report({ kind: 'run', score: 1200, level: 10, rows: 100, mode: 'endless' });
ok(S.hasCharacter('samurai') && sv().pending.includes('char:samurai'), '100 rows unlocks Samurai Fuzzy (and queues its celebration)');
ok(!S.hasCharacter('dragon') && !S.hasCharacter('aurora'), 'Dragon and Aurora still locked');
S.report({ kind: 'run', score: 100, level: 3, rows: 30, mode: 'endless' });
ok(sv().endless.best === 100 && sv().endless.runs === 3, 'a shorter run does not lower the record but counts as a run');
S.report({ kind: 'run', score: 9000, level: 42, rows: 500, mode: 'endless' });
ok(S.hasCharacter('dragon') && !S.hasCharacter('aurora'), '500 rows unlocks Dragon Fuzzy');
S.report({ kind: 'run', score: 14000, level: 67, rows: 800, mode: 'endless' });
ok(S.hasCharacter('aurora') && sv().endless.best === 800, '800 rows unlocks Aurora Fuzzy');
const before = sv().coinsEarned; S.report({ kind: 'run', score: 500, level: 4, rows: 40, mode: 'classic' });
ok(sv().endless.runs === 5 && sv().coinsEarned > before, 'a Classic run does not touch the Endless records');
// saves: old saves get the new field, and two devices merge sensibly
const old = migrateCrossing({ ...freshCrossing(), endless: { best: 50, runs: 2, bestCoins: 30 } } as never);
ok(old.endless.today.day === '' && old.endless.best === 50, 'an older save gets today\'s record filled in');
const base = freshCrossing(); base.endless = { best: 100, runs: 4, bestCoins: 40, today: { day: '2026-10-16', best: 60, runs: 2 } };
const A = structuredClone(base), B = structuredClone(base);
A.endless.best = 160; A.endless.runs = 5; A.endless.bestCoins = 70; A.endless.today = { day: '2026-10-16', best: 100, runs: 3 };
B.endless.best = 130; B.endless.runs = 6; B.endless.bestCoins = 55; B.endless.today = { day: '2026-10-17', best: 12, runs: 1 };
const M = merge3(base, A, B);
ok(M.endless.best === 160 && M.endless.bestCoins === 70, 'merge: records keep the higher value');
ok(M.endless.runs === 7, 'merge: runs add up (' + M.endless.runs + ')');
ok(M.endless.today.day === '2026-10-17' && M.endless.today.best === 12, 'merge: the later day wins as a whole');

console.log(`\n${pass} passed, ${fail} failed  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
process.exit(fail ? 1 : 0);
