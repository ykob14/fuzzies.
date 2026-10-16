// Seasonal events: windows, challenges, claims, the event Fuzzies, keepsakes, saves and merging. Run: bash tools/crossing/run.sh events-check.ts
import { memory as mem } from './stub';
import { accounts } from '../../src/core/account';
import { merge3 } from '../../src/core/merge';
import { CHARACTERS, CHARACTER_BY_ID, EVENT_NAME, type EventId } from '../../src/crossing/characters';
import { COSMETICS, COSMETIC_BY_ID } from '../../src/crossing/cosmetics';
import { freshCrossing, migrateCrossing } from '../../src/crossing/save';
import { eventWindowIn, EVENT_ORDER, listingFor, dayStart, dayNumber } from '../../src/crossing/shopData';
import { EVENTS, EVENT_IDS, YEAR_SETS, keepsakeCosmetics, keepsakeId } from '../../src/crossing/eventData';
import {
  activeOccurrences, applyEvent, atmosphere, challengesOf, challengeStates, claimable, claimableCount, claimInSave, earnedKeepsakes, eventFuzzy, eventItems,
  fuzzyStatus, isClaimed, keepsakeStates, missingGrants, newTracker, nextOccurrence, occurrenceAt, occurrenceOf, parseKey, phaseOf, progressOf, tokensOf, setOf,
} from '../../src/crossing/events';
import * as store from '../../src/crossing/store';
import { claimChallenge, evaluateEvents, initEvents } from '../../src/crossing/eventsLive';

let pass = 0, fail = 0;
const ok = (c: unknown, m: string) => { if (c) pass++; else { fail++; console.log('  ✗', m); } };
const at = (y: number, m: number, d: number, hh = 12): number => new Date(y, m - 1, d, hh, 0, 0).getTime();
const act = (ms: number): EventId[] => activeOccurrences(ms).map((o) => o.id);
const fromDay = (n: number): number => new Date(dayStart(n)).getTime() + 12 * 3600_000;

// ───────── data: 8 events, each complete ─────────
ok(EVENT_IDS.length === 8 && EVENT_ORDER.length === 8 && EVENT_ORDER.every((e) => EVENT_IDS.includes(e)), 'eight events with data');
for (const id of EVENT_IDS) {
  const ch = challengesOf(id), regular = ch.filter((c) => !c.finale);
  ok(regular.length >= 6 && regular.length <= 8 && ch.length === regular.length + 1 && ch[ch.length - 1].finale, `${id}: ${regular.length} challenges + a finale`);
  ok(new Set(ch.map((c) => c.id)).size === ch.length, `${id}: unique challenge ids`);
  ok(regular.every((c) => c.target >= 1 && c.target <= 400 && c.coins >= 40 && c.coins <= 150 && c.xp >= 60 && c.xp <= 200 && c.text.length > 8), `${id}: sensible targets, rewards and words`);
  ok(regular.some((c) => c.metric === 'items') && regular.some((c) => c.metric === 'flawless' || c.metric === 'levels' || c.metric === 'scoreRuns'), `${id}: item, and a skill challenge`);
  const total = ch.reduce((a, c) => a + c.coins, 0);
  ok(total >= 400 && total <= 1200, `${id}: ${total} coins in total (a few days of play, nothing huge)`);
  const f = eventFuzzy(id);
  ok(!!f && f.unlock.kind === 'season' && f.unlock.event === id, `${id}: its own Fuzzy (${f?.name})`);
  const th = EVENTS[id].theme;
  ok(th.item.emoji && th.palette.length === 3 && th.weather && th.decor.length >= 2 && th.blurb.length > 10, `${id}: a full theme`);
  ok(EVENT_NAME[id].length > 3, `${id}: has a display name`);
}
const seasonFuzzies = CHARACTERS.filter((c) => c.unlock.kind === 'season');
ok(seasonFuzzies.length === 8 && new Set(seasonFuzzies.map((c) => (c.unlock as { event: EventId }).event)).size === 8, '8 season Fuzzies, one per event');
ok(CHARACTERS.length === 50, 'still 50 Fuzzies');
// keepsakes
for (const [key, list] of Object.entries(YEAR_SETS)) {
  const p = parseKey(key);
  ok(!!p && list.length >= 3, `${key}: valid key with ${list.length} keepsakes`);
  if (!p) continue;
  const w = eventWindowIn(p.id, p.year);
  ok(!!w, `${key}: we have dates for that run`);
  ok(list.some((k) => 'finale' in k.how) && list.every((k) => k.rarity === 'rare' || k.rarity === 'epic'), `${key}: one for the finale, all rare/epic`);
  ok(new Set(list.map((k) => k.key)).size === list.length, `${key}: unique keys`);
  for (const k of list) { const id = keepsakeId(p.id, p.year, k.key); const c = COSMETIC_BY_ID[id]; ok(!!c && c.unlock.kind === 'event' && (c.unlock as { year: number }).year === p.year && c.name && c.icon && c.blurb, `${id} is a cosmetic in the Locker data`); ok(listingFor(id, at(p.year, 10, 20)) === null, `${id} is never in the Shop`); }
}
ok(new Set(COSMETICS.map((c) => c.id)).size === COSMETICS.length, 'cosmetic ids still unique');
ok(keepsakeCosmetics().length === Object.values(YEAR_SETS).reduce((a, l) => a + l.length, 0), 'every keepsake becomes a cosmetic');
ok(new Set(keepsakeCosmetics().map((c) => c.id)).size === keepsakeCosmetics().length, 'keepsake ids are unique across years');
ok(keepsakeId('halloween', 2026, 'glow') !== keepsakeId('halloween', 2027, 'glow'), 'ids are year-keyed');

// ───────── windows: each event is on exactly in its window, 2026–2032 ─────────
let windows = 0;
for (const id of EVENT_ORDER) for (let y = 2026; y <= 2032; y++) {
  const w = eventWindowIn(id, y);
  if (!w) continue;
  windows++;
  ok(act(fromDay(w[0])).includes(id) && act(fromDay(w[1])).includes(id), `${id} ${y}: on at both ends`);
  ok(!act(fromDay(w[0] - 1)).includes(id) && !act(fromDay(w[1] + 1)).includes(id), `${id} ${y}: off the day before and after`);
  const mid = Math.floor((w[0] + w[1]) / 2);
  const o = occurrenceAt(id, fromDay(mid));
  ok(!!o && o.year === y && o.key === `${id}-${y}`, `${id} ${y}: occurrence key is the start year`);
  ok(phaseOf(o!, fromDay(w[0] - 3)) === 'upcoming' && phaseOf(o!, fromDay(mid)) === 'live' && phaseOf(o!, fromDay(w[1] + 3)) === 'over', `${id} ${y}: phases`);
  ok(occurrenceOf(id, y)!.endsAt === dayStart(w[1] + 1), `${id} ${y}: ends at the midnight after the last day`);
}
ok(windows >= 40, `${windows} event windows checked`);
ok(act(at(2026, 10, 14)).length === 0 && act(at(2026, 10, 15)).join() === 'halloween' && act(at(2026, 11, 2)).join() === 'halloween' && act(at(2026, 11, 3)).length === 0, 'Halloween 15 Oct – 2 Nov 2026, nothing else around it');
ok(act(at(2027, 1, 1)).includes('christmas') && occurrenceAt('christmas', at(2027, 1, 1))!.key === 'christmas-2026', 'Christmas in January 2027 is still the 2026 run');
ok(act(at(2027, 12, 30)).includes('christmas') && act(at(2027, 12, 30)).includes('hanukkah'), 'Christmas and Hanukkah overlap at the end of 2027');
ok(act(at(2026, 9, 1)).length === 0, 'early September 2026: no event');
ok(nextOccurrence('halloween', at(2026, 10, 20))!.key === 'halloween-2027', 'next Halloween after this one is 2027');
ok(nextOccurrence('easter', at(2026, 10, 20))!.key === 'easter-2027' && nextOccurrence('lunar', at(2026, 10, 20))!.key === 'lunar-2027', 'next Easter / Lunar New Year is 2027');
ok(nextOccurrence('hanukkah', at(2032, 12, 20)) === null, 'no Hanukkah dates after 2032: no next run (not a wrong one)');
ok(atmosphere(at(2026, 10, 20))?.id === 'halloween' && atmosphere(at(2026, 9, 1)) === null, 'weather layer: Halloween on, nothing outside');
ok(eventItems(at(2026, 10, 20)).length === 1 && eventItems(at(2027, 12, 30)).length === 2 && eventItems(at(2026, 9, 1)).length === 0, 'event items: one per event that is on; none outside');

// ───────── progress only while the event is on ─────────
const T0 = at(2026, 10, 20), OFF = at(2026, 9, 10);
const items = (n: number): { kind: 'eventItem'; event: EventId }[] => Array.from({ length: n }, () => ({ kind: 'eventItem', event: 'halloween' }));
{
  const s = freshCrossing(), t = newTracker();
  applyEvent(s, { kind: 'eventItem', event: 'halloween' }, OFF, t);
  applyEvent(s, { kind: 'advance' }, OFF, t);
  ok(Object.keys(s.events).length === 0, 'outside any event nothing is counted or created');
  for (const e of items(3)) applyEvent(s, e, T0, t);
  const ch = challengesOf('halloween');
  ok(progressOf(s, 'halloween-2026', ch[0], 'halloween') === 3, 'event items count while the event is on');
  applyEvent(s, { kind: 'eventItem', event: 'easter' }, T0, t);
  ok(progressOf(s, 'halloween-2026', ch[0], 'halloween') === 3, "another event's item does not count for Halloween");
  for (let i = 0; i < 200; i++) applyEvent(s, { kind: 'eventItem', event: 'halloween' }, T0, t);
  ok(progressOf(s, 'halloween-2026', ch[0], 'halloween') === ch[0].target, 'progress stops at the target');
  ok(s.events['halloween-2026'].progress.items <= ch[0].target, 'the saved counter stays at the target');
  // after the event
  const before = JSON.stringify(s.events);
  applyEvent(s, { kind: 'advance' }, at(2026, 11, 5), t);
  applyEvent(s, { kind: 'eventItem', event: 'halloween' }, at(2026, 11, 5), t);
  ok(JSON.stringify(s.events) === before, 'after the event ends the saved progress does not move');
}
{
  // each metric
  const s = freshCrossing(), t = newTracker();
  const ch = (id: string) => challengesOf('halloween').find((c) => c.id === id)!;
  const val = (id: string) => progressOf(s, 'halloween-2026', ch(id), 'halloween');
  applyEvent(s, { kind: 'advance' }, T0, t); applyEvent(s, { kind: 'advance' }, T0, t);
  ok(val('rows') === 2, 'lanes crossed count');
  applyEvent(s, { kind: 'nest' }, T0, t); ok(val('nests') === 1, 'nests count');
  applyEvent(s, { kind: 'pickup', gold: false }, T0, t); applyEvent(s, { kind: 'pickup', gold: true }, T0, t);
  ok(val('pickups') === 2, 'Fuzzies count (golden too)');
  // flawless: a level cleared after losing a life is not flawless; the next one is
  applyEvent(s, { kind: 'start' }, T0, t);
  applyEvent(s, { kind: 'levelClear' }, T0, t);
  ok(val('flawless') === 1, 'a level cleared without dying is flawless');
  applyEvent(s, { kind: 'death', how: 'crash' }, T0, t);
  applyEvent(s, { kind: 'levelClear' }, T0, t);
  ok(val('flawless') === 1, 'a level after losing a life is not flawless');
  applyEvent(s, { kind: 'levelClear' }, T0, t);
  ok(val('flawless') === 2, 'the next clean level is');
  applyEvent(s, { kind: 'death', how: 'splash' }, T0, t); applyEvent(s, { kind: 'start' }, T0, t); applyEvent(s, { kind: 'levelClear' }, T0, t);
  ok(val('flawless') === 3 || ch('flawless').target <= 2, 'a new game starts clean');
  applyEvent(s, { kind: 'levelClear', flawless: false }, T0, t);
  ok(val('flawless') === Math.min(3, ch('flawless').target), 'worlds can say a level was not flawless');
  // score in one game
  applyEvent(s, { kind: 'run', score: 600, level: 2, mode: 'classic' }, T0, t);
  ok(val('score') === 0, 'a low-scoring game does not count for the score challenge');
  applyEvent(s, { kind: 'run', score: ch('score').min! + 1, level: 4, mode: 'classic' }, T0, t);
  ok(val('score') === 1, 'a high-scoring game does');
}

// ───────── claiming: once, only when finished ─────────
{
  const s = freshCrossing(), t = newTracker();
  const key = 'halloween-2026';
  ok(claimInSave(s, key, 'items') === null, 'cannot claim before it is finished');
  for (const e of items(40)) applyEvent(s, e, T0, t);
  ok(claimable(s, key).join() === 'items', 'finished challenge shows as claimable');
  const r = claimInSave(s, key, 'items');
  ok(!!r && r.coins === challengesOf('halloween')[0].coins && r.tokens === 1 && !r.finale, 'claim gives its reward and 1 token');
  ok(claimInSave(s, key, 'items') === null && tokensOf(s, key) === 1, 'second claim pays nothing, no extra token');
  ok(claimInSave(s, key, 'nope') === null && claimInSave(s, 'junk', 'items') === null && claimInSave(s, 'halloween-1999', 'items') === null, 'unknown challenge / key refused');
  ok(claimInSave(s, key, 'finale') === null, 'the finale needs every challenge claimed');
  // can be claimed after the event ended (it was earned)
  const s2 = freshCrossing();
  for (const e of items(40)) applyEvent(s2, e, T0, t);
  ok(claimInSave(s2, key, 'items') !== null, 'a finished challenge can be claimed after the event is over');
  ok(claimableCount(s) === 0 && claimableCount(s2) === 0, 'nothing left to claim');
}

// ───────── the finale: the event Fuzzy and the keepsakes (pure) ─────────
for (const id of EVENT_IDS) {
  const w = [2026, 2027, 2028, 2029].map((y) => eventWindowIn(id, y)).find(Boolean)!;
  const y = [2026, 2027, 2028, 2029].find((yy) => eventWindowIn(id, yy))!;
  const ms = fromDay(Math.floor((w[0] + w[1]) / 2)), key = `${id}-${y}`;
  const s = freshCrossing();
  s.events[key] = { progress: {}, claimed: [] };
  for (const c of challengesOf(id)) if (!c.finale) s.events[key].progress[c.id] = c.target;
  ok(missingGrants(s).characters.length === 0, `${id}: no Fuzzy before the finale is claimed`);
  for (const c of challengesOf(id)) if (!c.finale) ok(!!claimInSave(s, key, c.id), `${id}: claim ${c.id}`);
  ok(tokensOf(s, key) === challengesOf(id).filter((c) => !c.finale).reduce((a, c) => a + c.tokens, 0), `${id}: tokens add up`);
  ok(challengeStates(s, id, y).find((c) => c.def.finale)!.done, `${id}: finale is ready`);
  ok(missingGrants(s).characters.length === 0, `${id}: still no Fuzzy before the finale itself`);
  ok(!!claimInSave(s, key, 'finale'), `${id}: finale claimed`);
  ok(missingGrants(s).characters.join() === eventFuzzy(id)!.id, `${id}: now ${eventFuzzy(id)!.name} is earned`);
  if (YEAR_SETS[key]) ok(earnedKeepsakes(s, key).length === YEAR_SETS[key].length && missingGrants(s).cosmetics.length === YEAR_SETS[key].length, `${id}: all ${YEAR_SETS[key].length} keepsakes are earned by the end`);
  void ms;
}

// ───────── the real store: end to end for all 8 Fuzzies ─────────
const realNow = Date.now;
accounts.guest();
const live = (ms: number) => { Date.now = () => ms; };
initEvents();
{
  // a game played during Halloween through store.report
  live(at(2026, 10, 20));
  const c0 = store.coins();
  store.report({ kind: 'start', mode: 'classic' });
  for (let i = 0; i < 4; i++) store.report({ kind: 'eventItem', event: 'halloween' });
  const ev = store.save().events['halloween-2026'];
  ok(!!ev && ev.progress.items === 4, 'report(eventItem) counts for the running event');
  ok(store.coins() === c0, 'event items pay no coins');
  ok(store.save().stats.pickups === 0, 'event items are not Fuzzy pickups');
  for (let i = 0; i < 20; i++) store.report({ kind: 'advance' });
  ok(store.save().events['halloween-2026'].progress.rows === 20, 'lanes through report()');
  live(at(2026, 9, 10));
  store.report({ kind: 'advance' });
  ok(store.save().events['halloween-2026'].progress.rows === 20 && !store.save().events['easter-2026'], 'outside the window report() leaves the event alone');
}
const FIX: Record<string, number> = {};
for (const id of EVENT_ORDER) {
  const y = [2026, 2027, 2028, 2029].find((yy) => eventWindowIn(id, yy))!;
  const w = eventWindowIn(id, y)!;
  FIX[id] = fromDay(Math.floor((w[0] + w[1]) / 2));
}
for (const id of EVENT_ORDER) {
  live(FIX[id]);
  const y = occurrenceAt(id, FIX[id])!.year, key = `${id}-${y}`, f = eventFuzzy(id)!;
  ok(!store.hasCharacter(f.id), `${id}: ${f.name} not owned at first`);
  ok(fuzzyStatus(store.save(), id, FIX[id]).state === 'now', `${id}: panel says earnable now`);
  store.mutate((c) => { const e = c.events[key] ?? (c.events[key] = { progress: {}, claimed: [] }); for (const ch of challengesOf(id)) if (!ch.finale) e.progress[ch.id] = ch.target; });
  const coins0 = store.coins(), xp0 = store.save().xp;
  for (const ch of challengesOf(id)) {
    if (ch.finale) continue;
    const r1 = claimChallenge(key, ch.id), r2 = claimChallenge(key, ch.id);
    ok(!!r1 && r2 === null, `${id}: ${ch.id} pays once`);
  }
  ok(!store.hasCharacter(f.id), `${id}: not yet before the finale`);
  ok(!!claimChallenge(key, 'finale') && claimChallenge(key, 'finale') === null, `${id}: finale pays once`);
  ok(store.hasCharacter(f.id), `${id}: ${f.name} is in the Locker`);
  ok(store.save().pending.includes(`char:${f.id}`), `${id}: the unlock celebration is queued`);
  const expectCoins = challengesOf(id).reduce((a, c) => a + c.coins, 0), expectXp = challengesOf(id).reduce((a, c) => a + c.xp, 0);
  ok(store.coins() - coins0 === expectCoins && store.save().xp - xp0 === expectXp, `${id}: exactly ${expectCoins} coins and ${expectXp} XP paid in total`);
  for (const k of setOf(key)) ok(store.hasCosmetic(keepsakeId(id, y, k.key)), `${id}: keepsake ${k.name} owned`);
  const owned = store.save().owned.filter((x) => x === f.id).length;
  evaluateEvents(); evaluateEvents(); store.evaluate();
  ok(store.save().owned.filter((x) => x === f.id).length === owned && store.save().pending.filter((p) => p === `char:${f.id}`).length === 1, `${id}: running the evaluator again changes nothing`);
  // the event is over: the Fuzzy stays, the words say so
  const after = dayStart(eventWindowIn(id, y)![1] + 3);
  const st = fuzzyStatus(store.save(), id, after);
  ok(st.state === 'owned' && /forever/.test(st.text), `${id}: after the event the Fuzzy is still yours`);
}
// events not played: honest words
{
  live(at(2026, 9, 10));
  const s = freshCrossing();
  for (const id of EVENT_IDS) {
    const st = fuzzyStatus(s, id, at(2026, 9, 10));
    ok(st.state === 'later' && /Available again next/.test(st.text) && st.startsAt! > at(2026, 9, 10), `${id}: "available again next ${EVENT_NAME[id]}" with a start date`);
  }
  const hk = fuzzyStatus(s, 'hanukkah', at(2032, 12, 20));
  ok(hk.state === 'later' && !hk.startsAt && /aren't published/.test(hk.text), 'no future dates: says so instead of inventing one');
  const h = fuzzyStatus(s, 'halloween', at(2026, 10, 20));
  ok(h.state === 'now' && !!h.endsAt, 'Halloween is earnable on Oct 20');
}
Date.now = realNow;

// ───────── repair: progress says finale claimed but the grant was lost ─────────
{
  live(at(2026, 10, 20));
  accounts.guest();
  store.mutate((c) => { c.events['halloween-2026'] = { progress: {}, claimed: ['items', 'rows', 'nests', 'pickups', 'flawless', 'score', 'finale'] }; });
  ok(!store.hasCharacter('pumpkin'), 'lost grant: not owned yet');
  evaluateEvents();
  ok(store.hasCharacter('pumpkin') && store.hasCosmetic('ev-halloween-2026-cape') && store.hasCosmetic('ev-halloween-2026-glow') && store.hasCosmetic('ev-halloween-2026-candy'), 'the evaluator hands out what the saved progress earned');
  Date.now = realNow;
}

// ───────── old saves ─────────
{
  const old = migrateCrossing({ v: 1, coins: 50, xp: 120 } as never);
  ok(Object.keys(old.events).length === 0 && old.coins === 50, 'a save from before events migrates with empty events');
  const junk = migrateCrossing({ events: {
    'halloween-2026': { progress: { items: 5, rows: -3, bad: 'x', tokens: 2.9, constructor: 4, '__proto__': 7, x: 1 }, claimed: ['items', 5, 'items', 'constructor', 'rows'] },
    'not a key': { progress: { items: 1 }, claimed: [] }, '__proto__': { progress: {}, claimed: [] }, 'summer-2027': 'oops', 'easter-2027': { progress: null, claimed: 'no' },
  } } as never);
  ok(Object.keys(junk.events).sort().join() === 'easter-2027,halloween-2026', 'junk keys and values are dropped');
  const h = junk.events['halloween-2026'];
  ok(h.progress.items === 5 && h.progress.tokens === 2 && !Object.hasOwn(h.progress, 'rows') && !Object.hasOwn(h.progress, 'bad') && !Object.hasOwn(h.progress, 'constructor') && Object.keys(h.progress).length === 2, 'counters are cleaned (whole, non-negative, plain names)');
  ok(h.claimed.join() === 'items,rows', 'claimed is a list of unique challenge ids');
  ok(junk.events['easter-2027'].claimed.length === 0, 'a broken entry becomes an empty one');
  ok(JSON.stringify(migrateCrossing(junk as never).events) === JSON.stringify(junk.events), 'migration is idempotent');
  ok(!({} as Record<string, unknown>).polluted, 'no prototype pollution');
}

// ───────── two devices merge ─────────
{
  const base = { crossing: { events: { 'halloween-2026': { progress: { items: 2, rows: 10 }, claimed: [] as string[] } } } };
  const a = JSON.parse(JSON.stringify(base)), b = JSON.parse(JSON.stringify(base));
  a.crossing.events['halloween-2026'].progress.items = 6; a.crossing.events['halloween-2026'].progress.rows = 30; a.crossing.events['halloween-2026'].claimed.push('items'); 
  b.crossing.events['halloween-2026'].progress.items = 5; b.crossing.events['halloween-2026'].claimed.push('nests'); 
  b.crossing.events['easter-2027'] = { progress: { items: 2 }, claimed: [] };
  const m = merge3(base, a, b).crossing.events;
  ok(m['halloween-2026'].progress.items === 2 + 4 + 3, 'items from both devices add up');
  ok(m['halloween-2026'].progress.rows === 30, 'a side that did not change takes the other side');
  ok(m['halloween-2026'].claimed.slice().sort().join() === 'items,nests', 'claimed lists are combined');
  const mm = { events: m, owned: [], ownedCosmetics: [] } as never;
  ok(tokensOf(mm, 'halloween-2026') === 2, 'tokens from two different claims add up (worked out from the claimed list)');
  ok(m['easter-2027'].progress.items === 2, 'an event that only one device knows is kept');
  // a brand-new entry made in step on two devices starts with explicit zeros, so the first progress on both sides still adds up
  const fresh = freshCrossing(), t2 = newTracker();
  applyEvent(fresh, { kind: 'eventItem', event: 'halloween' }, at(2026, 10, 20), t2);
  ok(fresh.events['halloween-2026'].progress.rows === 0, 'a new entry has explicit zero counters');
  const zeroBase = { crossing: { events: { 'halloween-2026': JSON.parse(JSON.stringify({ progress: { items: 0, rows: 0, nests: 0, pickups: 0, flawless: 0, score: 0 }, claimed: [] })) } } };
  const p1 = JSON.parse(JSON.stringify(zeroBase)), p2 = JSON.parse(JSON.stringify(zeroBase));
  p1.crossing.events['halloween-2026'].progress.rows = 12; p2.crossing.events['halloween-2026'].progress.rows = 9;
  ok(merge3(zeroBase, p1, p2).crossing.events['halloween-2026'].progress.rows === 21, 'rows played on two devices from a shared start add up');
}

// ───────── new year = data only ─────────
{
  const before = Object.keys(YEAR_SETS).length;
  ok(Object.keys(YEAR_SETS).every((k) => /^[a-z]+-\d{4}$/.test(k)), 'year sets are keyed event-year');
  (YEAR_SETS as Record<string, unknown>)['halloween-2027'] = [{ key: 'zz', slot: 'trail', name: 'Test', icon: 'x', blurb: 'y', rarity: 'rare', how: { finale: true } }];
  ok(keepsakeCosmetics().some((c) => c.id === 'ev-halloween-2027-zz'), 'adding a year set to the data makes new cosmetics (a rebuild registers them)');
  ok(keepsakeStates(freshCrossing(), 'halloween', 2026).length === 3, '2026 keepsakes untouched by 2027 data');
  delete (YEAR_SETS as Record<string, unknown>)['halloween-2027'];
  ok(Object.keys(YEAR_SETS).length === before, 'cleaned up');
  // a year with no set still has challenges + the Fuzzy
  ok(setOf('halloween-2031').length === 0 && challengesOf('halloween').length === 7, 'a year without keepsakes still has the challenges and the Fuzzy');
}
// no pay-to-win
ok(CHARACTERS.filter((c) => c.unlock.kind === 'season').every((c) => c.rarity !== 'legendary' && c.rarity !== 'mythic' && listingFor(c.id, at(2026, 10, 20)) === null), 'event Fuzzies are never sold');
ok(COSMETICS.filter((c) => c.unlock.kind === 'event').every((c) => listingFor(c.id, at(2026, 10, 20)) === null && listingFor(c.id, at(2027, 12, 30)) === null), 'keepsakes are never sold');
void CHARACTER_BY_ID; void dayNumber; void mem; void isClaimed;

console.log(`events-check: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
