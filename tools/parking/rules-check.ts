/**
 * Parking Escape rules checks (no browser): moves never overlap or pass walls, exits only when the way is clear, undo/transform
 * keep puzzles intact, stars, rewards pay once (levels, milestones, the finale, endless), saved data survives bad input, and every
 * town gets its parking lot. node --experimental-strip-types tools/parking/rules-check.ts (after tools/parking/lib.sh)
 */
import { parse, moves, apply, range, grid, solved, solve, transform, OUT, type LevelData } from './.lib/engine.ts';
import * as P from './.lib/progress.ts';
import * as L from './.lib/rules.ts';
let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };

// a hand-made lot: the star car A in row 2 blocked by a truck C, a car D, a wall
const L1: LevelData = { w: 6, h: 6, x: 'A>', o: 0, t: 'n', b:
  '......' +
  '...C..' +
  'AA.C..' +
  '...C..' +
  '.DD..#' +
  '......' };
const p = parse(L1);
ok(p.cars.length === 3 && p.cars[0].letter === 'A' && p.cars[0].exit === 1 && p.cars[1].len === 3 && p.cars[1].dir === 'v', 'parse: star car, a 3-long truck, a car; walls');
ok(p.walls.filter(Boolean).length === 1, 'parse: one bollard');
{ const r = range(p, p.start, 0); ok(r.min === 0 && r.max === 1 && !r.out, 'the star car slides up to the truck and no further; no exit yet'); }
{ const r = range(p, p.start, 2); ok(r.min === 0 && r.max === 3, 'car D slides along its row, stopping at the bollard'); }
// every legal move from every reachable state keeps vehicles apart and inside the lot
{
  const seen = new Set<string>(); const q = [p.start]; let bad = 0, n = 0;
  while (q.length && n < 5000) {
    const s = q.pop()!; const k = s.join(','); if (seen.has(k)) continue; seen.add(k); n++;
    for (const m of moves(p, s)) {
      const t = apply(s, m);
      if (m.to !== OUT) { const g = grid(p, t); let cells = 0; for (const c of p.cars) if (t[c.i] !== OUT) cells += c.len; if ([...g].filter((v) => v >= 0).length !== cells) bad++; }
      q.push(t);
    }
  }
  ok(bad === 0 && n > 10, `${n} reachable states: no move ever overlaps two vehicles or a bollard`);
}
ok(moves(p, p.start).every((m) => m.to !== OUT), 'the star car can’t leave while the truck is in the way');
{ const s = apply(p.start, { car: 1, to: 3 }); ok(moves(p, s).some((m) => m.car === 0 && m.to === OUT), 'truck moved down → the star car can drive out'); ok(solved(p, apply(s, { car: 0, to: OUT })), 'out = solved'); }
{ const sol = solve(p, p.start)!; ok(sol.length === 2, `the solver finds the 2-move solution (${sol.map((m) => `${m.car}→${m.to}`).join(', ')})`); }
// transforms
for (let t = 0; t < 8; t++) { const q = parse(transform(L1, t)); ok(solve(q, q.start)!.length === 2 && q.walls.filter(Boolean).length === 1, `turn/mirror ${t}: same puzzle, exit ${transform(L1, t).x}`); }
// bad levels are refused
let threw = 0;
for (const b of ['AAA.AA' + '.'.repeat(30), 'A.A...' + '.'.repeat(30), '......'.repeat(6)]) { try { parse({ ...L1, b }); } catch { threw++; } }
ok(threw === 3, 'broken levels are refused (split vehicle, bent vehicle, no star car)');

// ---------- stars, rewards, saving ----------
ok(P.starsFor(10, 10, 'n') === 3 && P.starsFor(10, 13, 'n') === 3 && P.starsFor(10, 14, 'n') === 2 && P.starsFor(10, 23, 'n') === 1, 'stars: best or close = 3, fair = 2, any finish = 1');
ok(P.starsFor(10, 10, 't', 70, 15) === 2 && P.starsFor(10, 10, 't', 70, 5) === 1 && P.starsFor(10, 10, 't', 70, 40) === 3, 'timed levels need time to spare for 3 stars');
ok(P.coinsForLevel(1) === 20 && P.coinsForLevel(102) === 35 && P.coinsForLevel(260) === 50 && P.coinsForLevel(37) === 75 && P.coinsForLevel(25) === 75, 'coins: normal 20 / challenging 35 / hard 50 / special 75');
ok(P.coinsForKey('M25') === 250 && P.coinsForKey('M26') === null && P.coinsForKey('F500') === 2000 && P.coinsForKey('L501') === null && P.coinsForKey('E7') === 25 && P.coinsForKey('L0') === null && P.coinsForKey('X1') === null && P.coinsForKey('L1;drop') === null, 'reward keys: milestones every 25, the finale, endless; nonsense refused');
{
  const st = P.freshPark();
  const c1 = P.clearLevel(st, 1, { opt: 1, type: 'n', moves: 1, seconds: 4 });
  ok(c1.first && c1.stars === 3 && c1.unlockedNext && st.top === 2 && c1.rewards.length === 1 && c1.rewards[0].key === 'L1', 'first clear: 3 stars, next level opens, one reward');
  for (const r of c1.rewards) P.settle(st, r.key);
  const again = P.clearLevel(st, 1, { opt: 1, type: 'n', moves: 3, seconds: 9 });
  ok(!again.rewards.length && P.starsOf(st, 1) === 3 && st.best[0] === 1, 'a replay pays nothing and never lowers stars or bests');
  const h = P.clearLevel(st, 2, { opt: 4, type: 'n', moves: 4, seconds: 9, hinted: true });
  ok(h.stars === 2, 'with a hint: up to 2 stars');
  st.top = 25; const m = P.clearLevel(st, 25, { opt: 10, type: 's', moves: 12, seconds: 60 });
  ok(m.rewards.map((r) => r.key).join() === 'L25,M25' && m.rewards[1].coins === 250, 'level 25: its own reward + the 250 milestone bonus');
  st.top = 500; const f = P.clearLevel(st, 500, { opt: 40, type: 's', moves: 60, seconds: 900 });
  ok(f.rewards.map((r) => r.key).join() === 'L500,M500,F500' && st.top === 500, 'level 500: level + milestone + the 2,000 finale (and no level 501)');
  for (const r of f.rewards) P.settle(st, r.key);
  ok(st.champ && P.endlessOpen(st), 'the finale gives the champion trophy and opens Endless Parking');
  const e1 = P.clearEndless(st), e2 = P.clearEndless(st);
  ok(e1.key === 'E1' && e2.key === 'E2' && e1.coins === 25 && st.endless.n === 3, 'endless puzzles pay 25 each, numbered');
  // pending rewards aren't asked for twice
  const st2 = P.freshPark(); st2.pending.push('L1'); ok(P.clearLevel(st2, 1, { opt: 1, type: 'n', moves: 1, seconds: 2 }).rewards.length === 0, 'a reward waiting to be confirmed isn’t claimed again');
}
{
  const bad = P.migratePark({ cur: 999, top: -5, stars: 'xyz', best: [1, 'a', -3], paid: ['L1', 'L1', 'hack', 'M7'], audio: { music: 7, sfx: -1, mute: 1 } } as unknown as P.ParkState);
  ok(bad.top === 1 && bad.cur === 1 && bad.stars.length === 500 && bad.stars.startsWith('000') && bad.best.length === 500 && bad.best[1] === 0 && bad.best[2] === 0, 'saved data: numbers clamped, stars cleaned');
  ok(bad.paid.join() === 'L1' && bad.audio.music === 1 && bad.audio.sfx === 0 && bad.audio.mute === true, 'saved data: duplicate/unknown rewards dropped, volumes 0–1');
  ok(JSON.stringify(P.migratePark(JSON.parse(JSON.stringify(P.freshPark())))) === JSON.stringify(P.freshPark()), 'a fresh save survives a round trip');
}
// ---------- the town ----------
{
  const s = L.freshLand(); const before = s.buildings.length;
  ok(L.ensureParking(s) === 'placed' && s.buildings.length === before + 1 && L.count(s, 'parking') === 1, 'a new town gets the parking lot on the map');
  const lot = s.buildings.find((b) => b.item === 'parking')!;
  ok(L.placeProblem(s, 'parking', lot.x, lot.z, 0, lot.id) === '', 'it sits on a free, legal spot');
  ok(L.ensureParking(s) === null && L.count(s, 'parking') === 1, 'and only once');
  const st = L.store(s, [lot.id]); ok(st.stored.length === 1 && L.ensureParking(s) === null, 'it can go into Storage (and isn’t added again)');
  // a town with no room: the lot waits in Storage
  const full = L.freshLand(); for (let x = 0; x < 30; x++) for (let z = 0; z < 30; z++) if (L.canPlace(full, 'tree', x, z, 0)) full.buildings.push({ id: full.nextId++, item: 'tree', x, z, rot: 0, builtAt: 0 });
  ok(L.ensureParking(full) === 'stored' && L.storage(full).some((b) => b.item === 'parking'), 'no room in town → it waits in Storage');
  const m = L.migrateLand(JSON.parse(JSON.stringify({ ...s, parking: { top: 7, stars: '33', paid: ['L1'] } })));
  ok(m.parking!.top === 7 && m.parking!.stars.length === 500 && m.parking!.audio.music > 0, 'town saves keep parking progress (filled in by migrate)');
  ok(L.item('parkchamp').collectible === 'parking' && L.item('parkchamp').sellable === false, 'the Golden Parking Trophy is a keep-forever decoration');
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
