// Fuzzy Shop purchases against the REAL store with an in-memory localStorage. Run: bash tools/crossing/run.sh purchase-check.ts
import { memory as mem } from './stub';
import { accounts } from '../../src/core/account';
import * as store from '../../src/crossing/store';
import { buy, stateOf, equipItem, isEquipped, owns, hooks } from '../../src/crossing/purchases';
import { dailyItems, weeklyItems, permanentItems, seasonalShelves, listingFor } from '../../src/crossing/shopData';

let pass = 0, fail = 0;
const ok = (c: unknown, m: string) => { if (c) pass++; else { fail++; console.log('  ✗', m); } };
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();
const T = at(2026, 10, 16); // inside Halloween

accounts.guest();
const give = (n: number) => store.mutate((c) => { c.coins += n; });
ok(store.coins() === 0, 'fresh account has 0 coins');

// not enough coins
let r = buy('mint', T);
ok(!r.ok && r.code === 'poor' && r.short === 250, 'cannot afford Minty (needs 250 more) — calm message, nothing changes');
ok(store.coins() === 0 && !store.hasCharacter('mint') && store.save().pending.length === 0, 'a refused purchase changes nothing');

// buy a permanent Fuzzy
give(1000);
r = buy('mint', T);
ok(r.ok && r.price === 250 && r.balance === 750, 'bought Minty for 250: balance 750');
ok(store.hasCharacter('mint') && store.save().owned.includes('mint'), 'Minty is in the Locker (owned)');
ok(store.save().pending.includes('char:mint'), 'unlock celebration queued');
ok(typeof store.save().bought.mint === 'number', 'purchase logged');
ok(store.save().stats.coinsSpent === 250, 'coins spent counted');
ok(store.save().coinsEarned === 0, 'spending is not earning');
// no double buy
r = buy('mint', T);
ok(!r.ok && r.code === 'owned' && store.coins() === 750, "can't buy twice, no charge");
ok(stateOf({ id: 'mint', type: 'character', price: 250, shelf: 'permanent' }) === 'owned', 'state: owned');
ok(equipItem({ id: 'mint', type: 'character' }) && isEquipped({ id: 'mint', type: 'character' }) && store.save().equipped.character === 'mint', 'equip after buy');
ok(stateOf({ id: 'mint', type: 'character', price: 250, shelf: 'permanent' }) === 'equipped', 'state: equipped');

// cosmetics
r = buy('trail-hearts', T);
ok(r.ok && store.hasCosmetic('trail-hearts') && store.coins() === 550, 'bought a cosmetic (200)');
ok(equipItem({ id: 'trail-hearts', type: 'cosmetic' }) && store.save().equipped.trail === 'trail-hearts', 'cosmetic equips into its slot');
ok(stateOf({ id: 'trail-rainbow', type: 'cosmetic', price: 900, shelf: 'weekly' }) === 'poor', 'state: poor (900 > 550)');

// things that are not for sale
r = buy('golden', T); ok(!r.ok && r.code === 'not-for-sale', 'a legendary is never for sale');
r = buy('nebula', T); ok(!r.ok && r.code === 'not-for-sale', 'a mythic is never for sale');
r = buy('pumpkin', T); ok(!r.ok && r.code === 'not-for-sale', 'event Fuzzies are earned, not bought');
r = buy('bee', T); ok(!r.ok && r.code === 'not-for-sale', 'Pass Fuzzies are not sold');
r = buy('nope', T); ok(!r.ok && r.code === 'unknown', 'unknown id');
r = buy('trail-neon', T); ok(!r.ok && r.code === 'not-for-sale', 'leaderboard prize is not sold');
ok(store.coins() === 550, 'none of those charged anything');

// rotating items: only when in today's selection
give(10000);
const notToday = ['cowboy', 'dj', 'viking'].find((id) => !dailyItems(T).some((x) => x.id === id))!;
r = buy(notToday, T);
ok(!r.ok && r.code === 'not-for-sale', `${notToday} is not in today's shop → refused`);
const todayChar = dailyItems(T).find((x) => x.type === 'character')!;
const before = store.coins();
r = buy(todayChar.id, T);
ok(r.ok && store.coins() === before - todayChar.price && store.hasCharacter(todayChar.id), `today's daily Fuzzy (${todayChar.id}) can be bought`);
const wk = weeklyItems(T);
const wkCos = wk.find((x) => x.type === 'cosmetic')!;
ok(buy(wkCos.id, T).ok && store.hasCosmetic(wkCos.id), `weekly style ${wkCos.id} can be bought`);
const otherWeek = at(2026, 10, 30);
const wkNext = weeklyItems(otherWeek).find((x) => !wk.some((y) => y.id === x.id))!;
r = buy(wkNext.id, T); ok(!r.ok && r.code === 'not-for-sale', "next week's item can't be bought this week");
// seasonal window
ok(seasonalShelves(T)[0].event === 'halloween', 'Halloween is on');
r = buy('trail-bats', T); ok(r.ok && store.hasCosmetic('trail-bats'), 'Halloween style bought during Halloween');
r = buy('extra-witchhat', at(2026, 11, 20)); ok(!r.ok && r.code === 'not-for-sale', 'Halloween style refused after the event');
r = buy('extra-santahat', at(2026, 12, 15)); ok(r.ok && store.hasCosmetic('extra-santahat'), 'Holiday hat bought during Christmas');
ok(listingFor('extra-witchhat', at(2026, 11, 20)) === null, 'and it is no longer listed');
// all permanent items buyable and priced from the data
let paid = 0;
for (const it of permanentItems()) { if (owns(it)) continue; const b = store.coins(); const x = buy(it.id, T); if (x.ok) paid += b - store.coins(); else console.log('   failed', it.id, x.reason); }
ok(paid > 0, `bought the rest of the permanent shelf (${paid} coins)`);
ok(permanentItems().every((it) => owns(it)), 'everything on the permanent shelf is now owned');
// persists: the account JSON on the device has everything
const id = accounts.current!.id;
const raw = JSON.parse(mem.get('fz.accounts')!)[id];
ok(raw.crossing.owned.includes('mint') && raw.crossing.ownedCosmetics.includes('trail-hearts') && raw.crossing.equipped.character === 'mint' && raw.crossing.equipped.trail === 'trail-hearts', 'purchases, equipped items and balance are saved in the account JSON');
ok(Object.keys(raw.crossing.bought).length >= 5 && raw.crossing.coins === store.coins(), 'purchase log + balance saved');
// reload from storage (a new page load)
accounts.restore();
ok(store.hasCharacter('mint') && store.hasCosmetic('trail-hearts') && store.save().equipped.trail === 'trail-hearts', 'still there after a reload');
// grant fails → coins come straight back
{
  store.mutate((c) => { c.coins = 1000; c.coinsEarned = 0; c.stats.coinsSpent = 0; });
  const real = hooks.grant; hooks.grant = () => false;
  const target = dailyItems(T).find((x) => x.type === 'cosmetic' && !owns(x))!;
  const r2 = buy(target.id, T);
  ok(!r2.ok && r2.code === 'error' && store.coins() === 1000 && !store.hasCosmetic(target.id) && store.save().stats.coinsSpent === 0 && store.save().coinsEarned === 0, 'grant fails → full refund, nothing owned, not counted as earned or spent');
  hooks.grant = () => { throw new Error('boom'); };
  const ce = console.error; console.error = () => {};
  const r3 = buy(target.id, T);
  console.error = ce;
  ok(!r3.ok && store.coins() === 1000, 'grant throws → full refund');
  hooks.grant = real;
  ok(buy(target.id, T).ok, 'and the next try works');
}
// buying exactly with the coins you have
{
  store.mutate((c) => { c.coins = 0; });
  const t = dailyItems(T).find((x) => x.type === 'cosmetic' && !owns(x))!;
  store.mutate((c) => { c.coins = t.price; });
  const r4 = buy(t.id, T);
  ok(r4.ok && store.coins() === 0, 'exact balance buys it and leaves 0');
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
