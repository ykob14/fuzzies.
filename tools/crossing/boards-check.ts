// DOM-free checks for the weekly boards: week maths, run validation (anti-cheat plausibility rules), the reward table.
// Run: bash tools/crossing/run.sh boards-check.ts
import { weekKey, weekStart, weekRange, prevWeek, weeksAgo, weekLabel, tierOf, rewardFor, trophyId, parseTrophy, trophyName, TIER_DEFS, TIERS, BOARD_IDS, formatValue, formatLeft, DAY_MS, WEEK_MS } from '../../src/crossing/rewards-weekly';
import { parseResult, validateRun, scoreCeiling, boardValues, LIMITS, RULES, type RunResult } from '../../api/_lib/crossing-rules';
import { CHARACTER_BY_ID } from '../../src/crossing/characters';
import { COSMETIC_BY_ID } from '../../src/crossing/cosmetics';
import { CHARACTERS } from '../../src/crossing/characters';

let pass = 0, fail = 0;
const ok = (c: unknown, m: string) => { if (c) pass++; else { fail++; console.log('  ✗', m); } };
const eq = (a: unknown, b: unknown, m: string) => ok(a === b, `${m} (got ${JSON.stringify(a)}, wanted ${JSON.stringify(b)})`);
const utc = (y: number, m: number, d: number, h = 0, mi = 0) => Date.UTC(y, m - 1, d, h, mi);

// ---------- week maths ----------
eq(weekKey(utc(2026, 10, 16)), '2026-W42', 'Fri 16 Oct 2026 is 2026-W42');
eq(weekKey(utc(2026, 10, 12, 0, 0)), '2026-W42', 'Monday 00:00 starts W42');
eq(weekKey(utc(2026, 10, 11, 23, 59)), '2026-W41', 'Sunday 23:59 is still W41');
eq(weekKey(utc(2026, 10, 18, 23, 59)), '2026-W42', 'Sunday 23:59 ends W42');
eq(weekKey(utc(2026, 10, 19)), '2026-W43', 'next Monday is W43');
// year ends (ISO weeks belong to the year of their Thursday)
eq(weekKey(utc(2025, 12, 29)), '2026-W01', '29 Dec 2025 (Mon) is already 2026-W01');
eq(weekKey(utc(2026, 1, 1)), '2026-W01', '1 Jan 2026 (Thu) is 2026-W01');
eq(weekKey(utc(2026, 1, 4, 23, 59)), '2026-W01', '4 Jan 2026 (Sun) still W01');
eq(weekKey(utc(2026, 1, 5)), '2026-W02', '5 Jan 2026 is W02');
eq(weekKey(utc(2026, 12, 31)), '2026-W53', '31 Dec 2026 (Thu) is 2026-W53 (2026 has 53 weeks)');
eq(weekKey(utc(2027, 1, 3, 23, 59)), '2026-W53', '3 Jan 2027 (Sun) ends 2026-W53');
eq(weekKey(utc(2027, 1, 4)), '2027-W01', '4 Jan 2027 (Mon) is 2027-W01');
eq(weekKey(utc(2024, 12, 30)), '2025-W01', '30 Dec 2024 is 2025-W01');
eq(weekKey(utc(2021, 1, 3)), '2020-W53', '3 Jan 2021 is 2020-W53');
eq(weekKey(utc(2020, 12, 31)), '2020-W53', '31 Dec 2020 is 2020-W53');
// week start is always a Monday 00:00 UTC, 7 days apart, for 12 years of days
let allMondays = true, monotonic = true, lastKey = '', lastStart = 0;
for (let t = utc(2018, 1, 1); t < utc(2030, 1, 1); t += 6 * 3600_000) {
  const s = weekStart(t);
  if (new Date(s).getUTCDay() !== 1 || s % DAY_MS !== 0 || s > t || t - s >= WEEK_MS) allMondays = false;
  const k = weekKey(t);
  if (k !== lastKey) { if (lastKey && !(s - lastStart === WEEK_MS)) monotonic = false; lastKey = k; lastStart = s; }
  const r = weekRange(k);
  if (!r || t < r.start || t >= r.end || weekKey(r.start) !== k || weekKey(r.end - 1) !== k || weekKey(r.end) === k) { allMondays = false; }
}
ok(allMondays, 'every sampled moment is inside its own week range [Monday 00:00, next Monday)');
ok(monotonic, 'consecutive weeks are exactly 7 days apart');
// no daylight-saving effect: UTC, 24h days
eq(weekKey(utc(2026, 3, 29, 1, 30)), '2026-W13', 'a European DST Sunday is still W13');
eq(weekKey(utc(2026, 11, 1, 6, 30)), '2026-W44', 'a US DST Sunday is still W44');
// ranges / validation
ok(weekRange('2026-W53') !== null && weekRange('2025-W53') === null, 'W53 exists in 2026 but not in 2025');
ok(weekRange('2026-W00') === null && weekRange('2026-W54') === null && weekRange('abc') === null && weekRange('2026-w42') === null && weekRange('') === null, 'bad week keys are refused');
eq(weekRange('2026-W42')!.start, utc(2026, 10, 12), 'W42 starts 12 Oct');
eq(weekRange('2026-W42')!.end, utc(2026, 10, 19), 'W42 ends 19 Oct');
eq(prevWeek('2026-W42'), '2026-W41', 'previous of W42');
eq(prevWeek('2026-W01'), '2025-W52', 'previous of 2026-W01 is 2025-W52');
eq(prevWeek('2027-W01'), '2026-W53', 'previous of 2027-W01 is 2026-W53');
eq(prevWeek('nope'), null, 'previous of junk');
eq(weeksAgo('2026-W41', utc(2026, 10, 16)), 1, 'W41 is 1 week ago');
eq(weeksAgo('2026-W42', utc(2026, 10, 16)), 0, 'this week is 0 weeks ago');
eq(weeksAgo('2026-W43', utc(2026, 10, 16)), null, 'a future week is refused');
eq(weekLabel('2026-W42'), 'Oct 12 – 18', 'label in one month');
eq(weekLabel('2026-W44'), 'Oct 26 – Nov 1', 'label over a month end');
eq(formatLeft(2 * DAY_MS + 4 * 3600_000 + 59_000), '2d 4h', 'countdown days');
eq(formatLeft(3 * 3600_000 + 7 * 60_000), '3h 7m', 'countdown hours');
eq(formatLeft(-5), '0m', 'countdown never negative');
eq(formatValue('fastest', 18420), '18.42 s', 'fastest formatting');
eq(formatValue('streak', 1), '1 nest', 'streak singular');
eq(formatValue('streak', 7), '7 nests', 'streak plural');
eq(formatValue('score', 12345), '12,345', 'score formatting');

// ---------- rewards ----------
eq(tierOf(1), 1, 'rank 1 → tier 1'); eq(tierOf(2), 3, 'rank 2 → tier 3'); eq(tierOf(3), 3, 'rank 3 → tier 3'); eq(tierOf(4), 10, 'rank 4 → tier 10');
eq(tierOf(10), 10, 'rank 10 → tier 10'); eq(tierOf(11), 25, 'rank 11 → tier 25'); eq(tierOf(25), 25, 'rank 25 → tier 25'); eq(tierOf(26), 100, 'rank 26 → tier 100');
eq(tierOf(100), 100, 'rank 100 → tier 100'); eq(tierOf(101), null, 'rank 101 → nothing'); eq(tierOf(0), null, 'rank 0 → nothing'); eq(tierOf(1.5), null, 'fractional rank → nothing'); eq(tierOf(-3), null, 'negative rank → nothing');
const r1 = rewardFor('2026-W41', 'score', 1)!, r3 = rewardFor('2026-W41', 'fastest', 3)!, r10 = rewardFor('2026-W41', 'streak', 10)!, r25 = rewardFor('2026-W41', 'score', 25)!, r100 = rewardFor('2026-W41', 'score', 100)!;
eq(r1.trophy, 'week-2026-W41-score-1', 'trophy id for #1');
ok(r1.characters.includes('nebula') && r1.characters.includes('rainbow') && r1.cosmetics.includes('trail-neon') && r1.cosmetics.includes('cele-champion'), '#1 gets Nebula, Rainbow, Neon trail, Champion pose');
ok(!r3.characters.includes('nebula') && r3.characters.includes('rainbow') && r3.cosmetics.includes('trail-neon') && r3.cosmetics.includes('cele-champion'), 'top 3: trophy + trail + champion (+ the top-10 Rainbow)');
ok(r10.characters.includes('rainbow') && r10.cosmetics.includes('cele-champion') && !r10.characters.includes('nebula'), 'top 10: Rainbow + Champion pose');
ok(r25.characters.length === 0 && r25.cosmetics.join() === 'trail-neon', 'top 25: Neon trail only');
ok(r100.characters.length === 0 && r100.cosmetics.length === 0 && r100.coins === 200, 'top 100: participant trophy + 200 coins');
eq(rewardFor('2026-W41', 'score', 101), null, 'no reward outside the top 100');
// the reward table matches how the Fuzzies/cosmetics unlock rules are written (weekly top N)
for (const c of CHARACTERS) if (c.unlock.kind === 'weekly') {
  const top = c.unlock.top;
  for (const rank of [1, 2, 3, 5, 10, 11, 25, 26, 100]) {
    const r = rewardFor('2026-W41', 'score', rank);
    ok((r?.characters.includes(c.id) ?? false) === (rank <= top), `${c.id} (weekly top ${top}) is granted at rank ${rank} ⇔ rank ≤ ${top}`);
  }
}
for (const x of Object.values(COSMETIC_BY_ID)) if (x.unlock.kind === 'weekly') {
  for (const rank of [1, 3, 10, 11, 25, 26, 100]) {
    const r = rewardFor('2026-W41', 'score', rank);
    ok((r?.cosmetics.includes(x.id) ?? false) === (rank <= (x.unlock as { top: number }).top), `${x.id} (weekly top ${(x.unlock as { top: number }).top}) at rank ${rank}`);
  }
}
for (const t of TIERS) { const d = TIER_DEFS[t]; ok(d.characters.every((id) => CHARACTER_BY_ID[id]) && d.cosmetics.every((id) => COSMETIC_BY_ID[id]), `tier ${t} names real Fuzzies and cosmetics`); ok(d.coins > 0, `tier ${t} pays coins`); }
ok(TIERS.every((t, i) => i === 0 || TIER_DEFS[t].coins <= TIER_DEFS[TIERS[i - 1]].coins), 'coins never go up with a worse tier');
ok(TIERS.every((t, i) => i === 0 || TIER_DEFS[t].cosmetics.every((c) => TIER_DEFS[TIERS[i - 1]].cosmetics.includes(c)) && TIER_DEFS[t].characters.every((c) => TIER_DEFS[TIERS[i - 1]].characters.includes(c))), 'a better tier includes everything a worse tier gives');
for (const w of ['2026-W41', '2026-W53', '2027-W01']) for (const b of BOARD_IDS) for (const t of TIERS) {
  const id = trophyId(w, b, t);
  const p = parseTrophy(id);
  ok(!!p && p.week === w && p.board === b && p.tier === t, `trophy id round-trips ${id}`);
}
eq(parseTrophy('week-2026-W41-score-7'), null, 'tier 7 is not a trophy'); eq(parseTrophy('week-2026-W99-score-1'), null, 'bad week in a trophy id'); eq(parseTrophy('pass-3'), null, 'other trophy ids are ignored');
ok(trophyName('week-2026-W42-fastest-3').includes('Fastest crossing') && trophyName('week-2026-W42-fastest-3').includes('Oct 12'), 'trophy names are readable');

// ---------- run validation ----------
/** a believable run: 2 levels, 1 death, ~2 minutes */
const good = (over: Partial<RunResult> = {}): RunResult => ({ score: 1500, level: 2, nests: 7, pickups: 12, goldPickups: 2, hops: 190, deaths: 3, timeMs: 150_000, firstFiveNestsMs: 38_000, bestStreak: 5, characterId: 'classic', ...over });
const elapsed = 156_000;
const v = (r: RunResult, e = elapsed) => validateRun(r, e);
const reason = (r: RunResult, e = elapsed) => { const x = v(r, e); return x.ok ? 'OK' : x.reason; };
{
  const r = good();
  ok(r.score <= scoreCeiling(r), `the sample run's score ${r.score} is under its ceiling ${scoreCeiling(r)}`);
  eq(reason(r), 'OK', 'a believable run passes');
  eq(reason(good({ deaths: 1, bestStreak: 6, nests: 7 })), 'OK', 'one death, long streak, passes');
  eq(reason(good({ nests: 0, level: 1, deaths: 3, bestStreak: 0, firstFiveNestsMs: null, score: 90, hops: 40, pickups: 1, goldPickups: 0 })), 'OK', 'a run with no nests passes');
  eq(reason(good({ deaths: 1, nests: 5, level: 2, bestStreak: 5, firstFiveNestsMs: 40_000, hops: 100, score: 1000 })), 'OK', 'a level-clear with a death after passes');
}
// shape
eq(typeof parseResult(null), 'string', 'null result refused'); eq(typeof parseResult([]), 'string', 'array result refused'); eq(typeof parseResult('x'), 'string', 'string result refused');
for (const k of ['score', 'level', 'nests', 'pickups', 'goldPickups', 'hops', 'deaths', 'timeMs', 'bestStreak']) {
  eq(typeof parseResult({ ...good(), [k]: 1.5 }), 'string', `${k} must be an integer`);
  eq(typeof parseResult({ ...good(), [k]: -1 }), 'string', `${k} must not be negative`);
  eq(typeof parseResult({ ...good(), [k]: '5' }), 'string', `${k} must be a number, not text`);
  eq(typeof parseResult({ ...good(), [k]: NaN }), 'string', `${k} NaN refused`);
  eq(typeof parseResult({ ...good(), [k]: 1e12 }), 'string', `${k} huge refused`);
  const copy: Record<string, unknown> = { ...good() }; delete copy[k];
  eq(typeof parseResult(copy), 'string', `${k} missing refused`);
}
eq(typeof parseResult({ ...good(), level: 0 }), 'string', 'level 0 refused');
eq(typeof parseResult({ ...good(), deaths: 4 }), 'string', 'more than 3 deaths refused');
eq(typeof parseResult({ ...good(), firstFiveNestsMs: -3 }), 'string', 'negative firstFive refused');
eq(typeof parseResult({ ...good(), firstFiveNestsMs: 'x' }), 'string', 'text firstFive refused');
eq(typeof parseResult({ ...good(), firstFiveNestsMs: undefined }), 'string', 'undefined firstFive refused (must be null)');
ok(typeof parseResult({ ...good(), firstFiveNestsMs: null }) === 'object', 'null firstFive accepted');
eq(parseResult({ ...good(), characterId: 'no-such-fuzzy' }), 'character', 'unknown character refused');
eq(parseResult({ ...good(), characterId: '__proto__' }), 'character', '__proto__ is not a character');
eq(parseResult({ ...good(), characterId: 'constructor' }), 'character', 'constructor is not a character');
eq(parseResult({ ...good(), characterId: 5 }), 'character', 'numeric character refused');
eq(parseResult({ ...good(), characterId: 'x'.repeat(5000) }), 'shape', 'oversized json refused');
for (const c of CHARACTERS) if (typeof parseResult({ ...good(), characterId: c.id }) !== 'object') ok(false, `character ${c.id} should be accepted`);
ok(true, 'all 50 characters accepted');
// time
eq(reason(good({ timeMs: elapsed + LIMITS.toleranceMs + 1 })), 'time_server', 'claiming more time than the server saw');
eq(reason(good({ timeMs: elapsed + LIMITS.toleranceMs, hops: 190 })), 'OK', 'time within tolerance');
eq(reason(good(), -5), 'expired', 'finish before start is refused');
eq(reason(good(), LIMITS.runExpireMs + 1), 'expired', 'finishing after 45 minutes is refused');
eq(reason(good({ timeMs: 90_000 }), 90_000), 'OK', 'the run clock can be shorter than the server clock (pausing)');
// level / nests
eq(reason(good({ level: 3 })), 'level', 'level that does not match nests');
eq(reason(good({ nests: 12, level: 2, hops: 200 })), 'level', '12 nests is level 3');
eq(reason(good({ nests: 4, level: 2, bestStreak: 4, firstFiveNestsMs: null })), 'level', '4 nests can not be level 2');
eq(reason(good({ goldPickups: 13, pickups: 12 })), 'gold', 'more gold than pickups');
// hops
eq(reason(good({ hops: 5000, timeMs: 150_000 })), 'hop_rate', 'impossible hop rate (5000 hops in 150 s)');
eq(reason(good({ hops: 200, timeMs: 20_000 }), 22_000), 'hop_rate', '200 hops in 20 s');
eq(reason(good({ hops: 83 })), 'hops_min', 'fewer hops than 12 per nest (7 nests → 84)');
eq(reason(good({ hops: 84 })), 'OK', 'exactly 12 hops per nest passes');
// hop floor at exactly 0.14 s per hop
{ const t = 1000 * 0.14 * 100; eq(reason(good({ hops: 100, nests: 5, level: 2, bestStreak: 5, deaths: 3, firstFiveNestsMs: null, score: 600, pickups: 0, goldPickups: 0, timeMs: t + 3000 }), 200_000), 'OK', '100 hops over 17 s is allowed'); eq(reason(good({ hops: 400, nests: 5, level: 2, bestStreak: 5, deaths: 3, firstFiveNestsMs: null, score: 600, pickups: 0, goldPickups: 0, timeMs: 20_000 }), 200_000), 'hop_rate', '400 hops in 20 s is not'); }
// score
{
  const base = good();
  const ceil = scoreCeiling(base);
  eq(reason(good({ score: ceil })), 'OK', 'a score exactly at the ceiling passes');
  eq(reason(good({ score: ceil + 1 })), 'score', 'one point over the ceiling is refused');
  eq(reason(good({ score: 400_000 })), 'score', 'a big score the stats can not support is refused by the ceiling');
  ok(typeof parseResult({ ...good(), score: 9_999_999 }) === 'string', 'absurd score refused by parse limits');
  // the ceiling really is above anything the rules can produce: a perfect player (12 rows + nest bonus every 3 s) never exceeds it
  let worst = 0;
  for (let nests = 0; nests <= 60; nests += 5) {
    const level = 1 + Math.floor(nests / 5), hops = nests * 12 + 12;
    const perfect = nests * (12 * 10 + 50 + 60) + (level - 1) * 200 + Math.floor((hops * 0.14) / 1.6) * 100;
    const c = scoreCeiling({ nests, deaths: 0, level, pickups: Math.floor((hops * 0.14) / 1.6), goldPickups: Math.floor((hops * 0.14) / 1.6), hops });
    worst = Math.max(worst, perfect - c);
  }
  ok(worst <= 0, `a perfect player with all-gold pickups is under the ceiling (max overshoot ${worst})`);
}
eq(RULES.rowsPerAttempt, 12, 'rules constant: 12 rows'); eq(RULES.hopMs, 140, 'rules constant: hop 140 ms');
// streaks
eq(reason(good({ bestStreak: 8, nests: 7 })), 'streak', 'streak longer than the nests');
eq(reason(good({ deaths: 0, nests: 7, bestStreak: 5 })), 'streak', 'no deaths but streak ≠ nests');
eq(reason(good({ deaths: 1, nests: 7, bestStreak: 3 })), 'streak', '7 nests with one death needs a streak of 4+');
eq(reason(good({ deaths: 1, nests: 7, bestStreak: 4, firstFiveNestsMs: null })), 'OK', 'streak 4 of 7 nests with one death passes');
eq(reason(good({ deaths: 2, nests: 7, bestStreak: 3, firstFiveNestsMs: null })), 'OK', 'streak 3 with two deaths passes');
eq(reason(good({ deaths: 0, nests: 5, level: 2, bestStreak: 5, firstFiveNestsMs: 40_000, hops: 70, score: 900 })), 'OK', 'a flawless level 1 passes');
// fastest
eq(reason(good({ firstFiveNestsMs: 13_999 })), 'fastest_min', 'faster than the physical minimum');
eq(reason(good({ firstFiveNestsMs: 8_400 })), 'fastest_min', '8.4 s (pure hopping) refused');
eq(reason(good({ firstFiveNestsMs: 0 })), 'fastest_min', '0 ms refused');
eq(reason(good({ firstFiveNestsMs: 14_000 })), 'OK', '14 s passes the minimum');
{ const x = v(good({ firstFiveNestsMs: 18_000 })); ok(x.ok && x.flags.includes('fast_nests'), '18 s passes but is flagged'); const y = v(good({ firstFiveNestsMs: 38_000 })); ok(y.ok && !y.flags.includes('fast_nests'), '38 s is not flagged'); }
eq(reason(good({ firstFiveNestsMs: 160_000 })), 'fastest_time', 'five-nest time longer than the whole run');
eq(reason(good({ nests: 3, level: 1, bestStreak: 3, deaths: 3, firstFiveNestsMs: 30_000, hops: 40, score: 400 })), 'fastest_nests', 'a fastest time without five nests');
{ const r = v(good({ bestStreak: 4, firstFiveNestsMs: 30_000 })); ok(!r.ok && r.reason === 'fastest_nests', 'five-nest time without a streak of five is refused'); }
// flags
{ const x = v(good({ score: 2200, nests: 8, level: 2, hops: 110, pickups: 0, goldPickups: 0, bestStreak: 5, deaths: 3, timeMs: 25_000, firstFiveNestsMs: null }), 26_000); ok(x.ok && x.flags.includes('score_rate'), 'a score of 100 points a second is flagged'); }
{ const x = v(good({ pickups: 20, goldPickups: 15 })); ok(x.ok && x.flags.includes('gold_ratio'), 'mostly-gold pickups are flagged'); }
{ const x = v(good({ pickups: 200, goldPickups: 0, timeMs: 150_000 })); eq(x.ok ? 'OK' : x.reason, 'pickup_rate', 'more pickups than tokens that can spawn'); }
// board values
{
  const bv = boardValues(good());
  eq(bv.score, 1500, 'score board value'); eq(bv.fastest, 38_000, 'fastest board value'); eq(bv.streak, 5, 'streak board value');
  const none = boardValues(good({ score: 0, firstFiveNestsMs: null, bestStreak: 0 }));
  ok(none.score === null && none.fastest === null && none.streak === null, 'a zero run is on no board');
}
// the hard rules of the whole system hold together
ok(LIMITS.minFastestMs > RULES.nestsPerLevel * RULES.rowsPerAttempt * RULES.hopMs, 'the fastest-time floor is above the pure-hopping minimum (8.4 s)');
ok(LIMITS.runExpireMs === 45 * 60_000, 'runs expire after 45 minutes');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
