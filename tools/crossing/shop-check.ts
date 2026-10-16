// Checks for the Fuzzy Shop catalogue and rotation (DOM-free). Run: bash tools/crossing/run.sh shop-check.ts
import { CHARACTERS, CHARACTER_BY_ID, type EventId } from '../../src/crossing/characters';
import { COSMETICS, COSMETIC_BY_ID } from '../../src/crossing/cosmetics';
import {
  activeEvents, allListings, dailyItems, weeklyItems, permanentItems, seasonalShelves, listingFor, priceOf, shelfOf, nextAppearance,
  easterSunday, eventWindowIn, dayNumber, nextDailyReset, nextWeeklyReset, nextEventStart, weekNumber, draw, countdown, EVENT_ORDER,
} from '../../src/crossing/shopData';

let pass = 0, fail = 0;
const ok = (c: unknown, m: string) => { if (c) pass++; else { fail++; console.log('  ✗', m); } };
/** local noon of a date (months 1-based) */
const at = (y: number, m: number, d: number, hh = 12): number => new Date(y, m - 1, d, hh, 0, 0).getTime();
const ids = (xs: { id: string }[]) => xs.map((x) => x.id).join(',');

// ---- Easter against known dates ----
const EASTER: Record<number, [number, number]> = { 2024: [3, 31], 2025: [4, 20], 2026: [4, 5], 2027: [3, 28], 2028: [4, 16], 2029: [4, 1], 2030: [4, 21], 2031: [4, 13], 2032: [3, 28] };
for (const [y, [m, d]] of Object.entries(EASTER)) { const e = easterSunday(Number(y)); ok(e[1] === m && e[2] === d, `Easter ${y} is ${m}/${d} (got ${e[1]}/${e[2]})`); }

// ---- event windows ----
const act = (y: number, m: number, d: number): EventId[] => activeEvents(at(y, m, d));
ok(act(2026, 10, 14).length === 0, 'Oct 14 2026: no event yet');
ok(act(2026, 10, 15).includes('halloween') && act(2026, 11, 2).includes('halloween') && !act(2026, 11, 3).includes('halloween'), 'Halloween Oct 15 – Nov 2');
ok(act(2026, 11, 15).includes('thanksgiving') && act(2026, 12, 1).includes('thanksgiving') && !act(2026, 12, 2).includes('thanksgiving') && !act(2026, 11, 14).includes('thanksgiving'), 'Thanksgiving Nov 15 – Dec 1');
ok(act(2026, 12, 10).includes('christmas') && act(2027, 1, 2).includes('christmas') && !act(2027, 1, 3).includes('christmas') && !act(2026, 12, 9).includes('christmas'), 'Christmas Dec 10 – Jan 2 (across the new year)');
ok(act(2026, 12, 2).includes('hanukkah') && act(2026, 12, 13).includes('hanukkah') && !act(2026, 12, 1).includes('hanukkah') && !act(2026, 12, 14).includes('hanukkah'), 'Hanukkah 2026: Dec 2 – Dec 13 (start − 2 … start + 9)');
ok(act(2027, 12, 22).includes('hanukkah') && act(2028, 1, 2).includes('hanukkah') && !act(2028, 1, 3).includes('hanukkah'), 'Hanukkah 2027 runs into January 2028');
ok(act(2026, 11, 25).includes('hanukkah') === false, 'Hanukkah not in late Nov 2026');
ok(act(2032, 11, 25).includes('hanukkah'), 'Hanukkah 2032 starts Nov 25');
ok(!act(2033, 12, 10).includes('hanukkah'), 'Hanukkah: no dates after 2032, so no event (not a wrong one)');
ok(act(2027, 2, 1).includes('lunar') && act(2027, 2, 21).includes('lunar') && !act(2027, 1, 31).includes('lunar') && !act(2027, 2, 22).includes('lunar'), 'Lunar New Year 2027 (Feb 6): Feb 1 – Feb 21');
ok(!act(2026, 2, 1).includes('lunar'), 'no Lunar New Year window for 2026 (not in the table)');
ok(act(2026, 1, 5).includes('winter') && act(2026, 2, 10).includes('winter') && !act(2026, 2, 11).includes('winter'), 'Winter Festival Jan 5 – Feb 10');
ok(act(2026, 3, 22).includes('easter') && act(2026, 4, 8).includes('easter') && !act(2026, 3, 21).includes('easter') && !act(2026, 4, 9).includes('easter'), 'Easter 2026: Mar 22 – Apr 8 (−14 … +3)');
ok(act(2026, 6, 15).includes('summer') && act(2026, 8, 31).includes('summer') && !act(2026, 9, 1).includes('summer'), 'Summer Jun 15 – Aug 31');
ok(act(2026, 12, 20).includes('christmas') && !act(2026, 12, 20).includes('hanukkah'), 'Dec 20 2026: Christmas only');
ok(act(2027, 12, 30).includes('christmas') && act(2027, 12, 30).includes('hanukkah'), 'Dec 30 2027: Christmas and Hanukkah overlap');
for (let y = 2026; y <= 2032; y++) for (const e of EVENT_ORDER) { const w = eventWindowIn(e, y); if (w) ok(w[1] - w[0] >= 10 && w[1] - w[0] <= 90, `${e} ${y} window length sensible`); }
for (let y = 2026; y <= 2032; y++) ok(eventWindowIn('hanukkah', y) !== null, `Hanukkah table has ${y}`);
for (let y = 2027; y <= 2032; y++) ok(eventWindowIn('lunar', y) !== null, `Lunar table has ${y}`);

// ---- selections are deterministic, differ, never repeat ----
const D0 = at(2026, 10, 16, 9), D0b = at(2026, 10, 16, 23);
ok(ids(dailyItems(D0)) === ids(dailyItems(D0b)), 'same day → same daily picks, whatever the hour');
ok(ids(weeklyItems(D0)) === ids(weeklyItems(at(2026, 10, 18, 22))), 'same week (Fri → Sun) → same weekly picks');
ok(dayNumber(D0) === dayNumber(D0b), 'day number is the local day');
let diffDays = 0; const seenDaily = new Set<string>();
for (let i = 0; i < 40; i++) {
  const t = at(2026, 10, 16 + i), t2 = at(2026, 10, 17 + i);
  if (ids(dailyItems(t)) !== ids(dailyItems(t2))) diffDays++;
  for (const x of dailyItems(t)) seenDaily.add(x.id);
  const d = dailyItems(t);
  ok(d.length === 4 && new Set(d.map((x) => x.id)).size === 4, `day +${i}: 4 different daily items`);
}
ok(diffDays >= 38, `consecutive days differ (${diffDays}/40)`);
const dailyPoolSize = COSMETICS.filter((c) => c.unlock.kind === 'shop' && c.unlock.slot === 'daily').length + CHARACTERS.filter((c) => c.unlock.kind === 'shop' && c.unlock.slot === 'rotating' && (c.rarity === 'common' || c.rarity === 'rare')).length;
ok(seenDaily.size === dailyPoolSize, `every daily-pool item shows up within 40 days (${seenDaily.size}/${dailyPoolSize})`);
let weekDiff = 0; const seenWeekly = new Set<string>();
for (let w = 0; w < 12; w++) {
  const t = at(2026, 10, 19 + 7 * w), t2 = at(2026, 10, 26 + 7 * w), wl = weeklyItems(t);
  if (ids(wl) !== ids(weeklyItems(t2))) weekDiff++;
  ok(wl.length === 3 && new Set(wl.map((x) => x.id)).size === 3, `week +${w}: 3 different weekly items`);
  ok(wl.filter((x) => x.type === 'character').length === 1 && CHARACTER_BY_ID[wl[0].id]?.rarity === 'epic', `week +${w}: one epic Fuzzy`);
  for (const x of wl) seenWeekly.add(x.id);
}
ok(weekDiff >= 11, `consecutive weeks differ (${weekDiff}/12)`);
const weeklyPool = COSMETICS.filter((c) => c.unlock.kind === 'shop' && c.unlock.slot === 'weekly').length + CHARACTERS.filter((c) => c.unlock.kind === 'shop' && c.unlock.slot === 'rotating' && c.rarity === 'epic').length;
ok(seenWeekly.size === weeklyPool, `every weekly-pool item shows up within 12 weeks (${seenWeekly.size}/${weeklyPool})`);
ok(weekNumber(at(2026, 10, 19)) === weekNumber(at(2026, 10, 25)) && weekNumber(at(2026, 10, 19)) === weekNumber(at(2026, 10, 18)) + 1, 'weeks start on Monday');

// ---- rotation helper ----
const pool = ['a', 'b', 'c', 'd', 'e', 'f'];
const cyc = new Set<string>(); for (let i = 0; i < 3; i++) draw(pool, 2, i, 'x').forEach((p) => cyc.add(p));
ok(cyc.size === 6, 'draw: a whole cycle shows every item exactly once');
ok(draw(['a'], 3, 5, 'x').length === 1, 'draw: a pool smaller than k just gives what it has');
ok(draw(pool, 2, -3, 'x').length === 2, 'draw: negative steps are fine');

// ---- never legendary / mythic; every listing priced from the data ----
let allOk = true, rarityOk = true, priceFromData = true, rangeOk = true;
for (let i = 0; i < 400; i++) {
  const t = at(2026, 1, 1) + i * 86_400_000;
  for (const l of allListings(t)) {
    const def = l.type === 'character' ? CHARACTER_BY_ID[l.id] : COSMETIC_BY_ID[l.id];
    if (!def) { allOk = false; continue; }
    if (def.rarity === 'legendary' || def.rarity === 'mythic') rarityOk = false;
    const u = def.unlock as { price?: number };
    if (u.price !== l.price || priceOf(l.id) !== l.price) priceFromData = false;
    if (!(l.price >= 1)) rangeOk = false;
  }
}
ok(allOk, 'every listing is a real item');
ok(rarityOk, 'no legendary or mythic item is ever for sale (400 days)');
ok(priceFromData, 'every listing price equals the price in the data');
ok(rangeOk, 'every price ≥ 1');
ok(CHARACTERS.filter((c) => c.rarity === 'legendary' || c.rarity === 'mythic').every((c) => priceOf(c.id) === null && shelfOf(c.id) === null), 'legendary/mythic Fuzzies have no price and no shelf');
ok(CHARACTERS.filter((c) => c.unlock.kind !== 'shop').every((c) => priceOf(c.id) === null), 'only shop Fuzzies have a price (event Fuzzies are earned)');
// fair price ranges
const P = (id: string) => priceOf(id)!;
ok(COSMETICS.filter((c) => priceOf(c.id) !== null && c.rarity === 'common').every((c) => P(c.id) >= 100 && P(c.id) <= 300), 'common cosmetics 100–300');
ok(COSMETICS.filter((c) => priceOf(c.id) !== null && c.rarity === 'rare').every((c) => P(c.id) >= 250 && P(c.id) <= 500), 'rare cosmetics 250–500');
ok(COSMETICS.filter((c) => priceOf(c.id) !== null && c.rarity === 'epic').every((c) => P(c.id) >= 800 && P(c.id) <= 1500), 'epic cosmetics 800–1500');
ok(CHARACTERS.filter((c) => priceOf(c.id) !== null && c.rarity === 'common').every((c) => P(c.id) <= 400), 'common Fuzzies ≤ 400');
ok(CHARACTERS.filter((c) => priceOf(c.id) !== null && c.rarity === 'rare').every((c) => P(c.id) >= 600 && P(c.id) <= 1000), 'rare Fuzzies 600–1000');
ok(CHARACTERS.filter((c) => priceOf(c.id) !== null && c.rarity === 'epic').every((c) => P(c.id) >= 2000 && P(c.id) <= 3000), 'epic Fuzzies 2000–3000');
ok(CHARACTERS.filter((c) => priceOf(c.id) !== null).length <= 13, 'at most 13 of the 50 Fuzzies can be bought');

// ---- shelves ----
ok(permanentItems().length === 14, `permanent shelf: 8 Fuzzies + 6 styles (${permanentItems().length})`);
ok(permanentItems().filter((x) => x.type === 'character').length === 8, 'permanent shelf has 8 Fuzzies');
ok(permanentItems().every((x) => x.shelf === 'permanent' && listingFor(x.id, D0)?.shelf === 'permanent'), 'permanent items are for sale every day');
// ---- seasonal: only in-window ----
let seasonOk = true;
for (let i = 0; i < 2600; i += 3) {
  const t = at(2026, 1, 1) + i * 86_400_000, on = activeEvents(t);
  for (const l of allListings(t)) if (l.shelf === 'season' && !on.includes(l.event!)) seasonOk = false;
  for (const s of seasonalShelves(t)) if (!on.includes(s.event) || s.items.some((x) => x.event !== s.event)) seasonOk = false;
}
ok(seasonOk, 'season items are listed only while their event is on (2026–2033)');
const oct = seasonalShelves(at(2026, 10, 20));
ok(oct.length === 1 && oct[0].event === 'halloween' && oct[0].items.length === 2 && oct[0].eventFuzzies.includes('pumpkin'), 'Oct 20 2026: Halloween shelf with 2 styles and the pumpkin event Fuzzy');
ok(!allListings(at(2026, 10, 20)).some((x) => x.id === 'pumpkin'), 'event Fuzzies are never sold');
ok(listingFor('trail-bats', at(2026, 10, 20)) !== null && listingFor('trail-bats', at(2026, 11, 20)) === null, 'Bat trail: for sale in Halloween only');
ok(listingFor('trail-snow', at(2027, 1, 20)) !== null && listingFor('trail-snow', at(2026, 10, 20)) === null, 'Snowflake trail: Winter Festival only');
ok(listingFor('trail-petals', at(2026, 4, 1)) !== null && listingFor('trail-petals', at(2026, 6, 1)) === null, 'Petal trail: Easter only');
for (const e of EVENT_ORDER) ok(COSMETICS.some((c) => c.unlock.kind === 'season' && c.unlock.event === e), `event ${e} has at least one seasonal style`);
// ---- next appearance ----
const now0 = at(2026, 10, 16, 10);
for (const c of CHARACTERS.filter((c) => c.unlock.kind === 'shop' && c.unlock.slot === 'rotating')) {
  const a = nextAppearance(c.id, now0, 60);
  ok(!!a && a.at > now0 && !!listingFor(c.id, a.at + 3600_000) && a.at - now0 <= 60 * 86_400_000, `${c.id} comes back within 60 days (${a ? new Date(a.at).toDateString() : 'never'})`);
  if (a) { const before = a.at - 86_400_000; ok(before <= now0 || !listingFor(c.id, before + 3600_000), `${c.id}: next date is the first one`); }
}
ok(nextAppearance('mint', now0)?.shelf === 'permanent', 'permanent items are always there');
ok(nextAppearance('golden', now0) === null && nextAppearance('classic', now0) === null, 'never-sold Fuzzies have no appearance');
{ const a = nextAppearance('extra-santahat', now0); ok(!!a && a.shelf === 'season' && a.at === new Date(2026, 11, 10).getTime(), 'Holiday hat next appears Dec 10 2026'); }
ok(nextEventStart('halloween', at(2026, 10, 20)) === new Date(2027, 9, 15).getTime(), 'next Halloween after this one is Oct 15 2027');
// ---- resets ----
{
  const t = at(2026, 10, 16, 15); const r = nextDailyReset(t);
  ok(r === new Date(2026, 9, 17).getTime(), 'daily reset = next local midnight');
  const w = nextWeeklyReset(t); ok(w === new Date(2026, 9, 19).getTime() && new Date(w).getDay() === 1, 'weekly reset from a Friday = next Monday 00:00');
  const mon = nextWeeklyReset(at(2026, 10, 19, 0)); ok(mon === new Date(2026, 9, 26).getTime(), 'weekly reset on a Monday = the following Monday');
  const sun = nextWeeklyReset(at(2026, 10, 18, 23)); ok(sun === new Date(2026, 9, 19).getTime(), 'weekly reset on Sunday night = tomorrow');
  ok(nextDailyReset(at(2026, 12, 31)) === new Date(2027, 0, 1).getTime(), 'daily reset across New Year');
}
ok(countdown(5 * 3600_000 + 12 * 60_000) === '5h 12m' && countdown(2 * 86400_000 + 4 * 3600_000) === '2d 4h' && countdown(30_000) === '1 min', 'countdown words');
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
