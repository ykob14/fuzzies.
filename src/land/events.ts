/**
 * Fuzzies Land seasonal events — RULES ONLY (no drawing, no DOM; the 3D models live in land/seasonal.ts).
 *
 * - The holiday calendar: fixed dates (Halloween, Christmas…), computed ones (Easter, Thanksgivings, Mother's / Father's
 *   Day) and tables for the moon-based ones (Hanukkah, Passover, Ramadan & Eid, Diwali, Lunar New Year). Each holiday has
 *   an event window around it; windows may overlap (Halloween + Canadian Thanksgiving in October).
 * - Collections: each holiday-year has its own set of collectible decorations (new artwork every year, nothing recoloured).
 *   A collection is only listed once its models exist in land/seasonal.ts — nothing is invented or published automatically.
 * - Ownership is permanent: `land.owned[id]` = copies owned, kept in the town (synced with the account), so Halloween 2026
 *   decorations still work in 2030. Placed copies are ordinary pieces (they move and store like anything else).
 * - Earning: holiday orders pay event tokens, harvests sometimes drop one, and challenges pay tokens or a decoration.
 */
import { ITEMS, count, item, type ItemDef, type LandState, type Order } from './rules';

// ---------- calendar ----------
export type Atmo = 'leaves' | 'snow' | 'petals' | 'hearts' | 'lanterns' | 'sparks' | 'fireflies' | 'none';
export interface Holiday {
  id: string; name: string;
  /** a short label for chips and badges */
  short: string;
  /** warm tint for the sky/sun during the event (hex), '' = none */
  tint: string;
  atmo: Atmo;
  /** The event window for a year as local dates [start, end] (end inclusive), or null when the date isn't known yet. */
  range: (year: number) => [Date, Date] | null;
  /** The collection a year's event sells (several events may share one, e.g. both Thanksgivings). */
  collection?: (year: number) => string;
}

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
const addDays = (x: Date, n: number) => { const r = new Date(x); r.setDate(r.getDate() + n); return r; };
/** The n-th weekday (0 = Sunday) of a month, e.g. nth(y, 10, 1, 2) = 2nd Monday of October. */
function nth(y: number, m: number, weekday: number, n: number): Date {
  const first = d(y, m, 1);
  const off = (weekday - first.getDay() + 7) % 7;
  return d(y, m, 1 + off + (n - 1) * 7);
}
/** Western Easter Sunday (Meeus / Jones / Butcher). */
export function easter(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, dd = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - dd - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return d(y, month, day);
}
/**
 * Moon-based holidays, as published (Jewish days begin the evening before; Islamic dates can shift a day with the moon
 * sighting). Years outside the tables show no event rather than a wrong one — extend them here.
 */
const TABLES: Record<string, Record<number, [number, number]>> = {
  // first day (15 Nisan) — the seder is the evening before
  passover: { 2026: [4, 2], 2027: [4, 22], 2028: [4, 11], 2029: [3, 31], 2030: [4, 18], 2031: [4, 8], 2032: [3, 27] },
  // first day of Hanukkah (25 Kislev) — first candle the evening before
  hanukkah: { 2026: [12, 5], 2027: [12, 25], 2028: [12, 13], 2029: [12, 2], 2030: [12, 21], 2031: [12, 10], 2032: [11, 28] },
  ramadan: { 2026: [2, 18], 2027: [2, 8], 2028: [1, 28], 2029: [1, 16], 2030: [1, 5], 2031: [12, 15], 2032: [12, 4] },
  eid: { 2026: [3, 20], 2027: [3, 9], 2028: [2, 26], 2029: [2, 14], 2030: [2, 4], 2031: [1, 24], 2032: [1, 14] },
  diwali: { 2026: [11, 8], 2027: [10, 29], 2028: [10, 17], 2029: [11, 5], 2030: [10, 26], 2031: [11, 14], 2032: [11, 2] },
  lunar: { 2026: [2, 17], 2027: [2, 6], 2028: [1, 26], 2029: [2, 13], 2030: [2, 3], 2031: [1, 23], 2032: [2, 11] },
};
const table = (k: string, y: number): Date | null => { const t = TABLES[k][y]; return t ? d(y, t[0], t[1]) : null; };
const around = (day: Date | null, before: number, after: number): [Date, Date] | null => (day ? [addDays(day, -before), addDays(day, after)] : null);

export const HOLIDAYS: Holiday[] = [
  { id: 'halloween', name: 'Halloween', short: 'Halloween', tint: '#ffb070', atmo: 'leaves', range: (y) => [d(y, 10, 15), d(y, 11, 2)], collection: (y) => `halloween-${y}` },
  { id: 'thanks-ca', name: 'Canadian Thanksgiving', short: 'Thanksgiving', tint: '#ffc890', atmo: 'leaves', range: (y) => around(nth(y, 10, 1, 2), 7, 1), collection: (y) => `thanks-${y}` },
  { id: 'thanks-us', name: 'Thanksgiving', short: 'Thanksgiving', tint: '#ffc890', atmo: 'leaves', range: (y) => around(nth(y, 11, 4, 4), 10, 1), collection: (y) => `thanks-${y}` },
  { id: 'hanukkah', name: 'Hanukkah', short: 'Hanukkah', tint: '#bcd8ff', atmo: 'lanterns', range: (y) => around(table('hanukkah', y), 3, 7), collection: (y) => `hanukkah-${y}` },
  { id: 'christmas', name: 'Christmas', short: 'Christmas', tint: '#cfe3ff', atmo: 'snow', range: (y) => [d(y, 12, 8), d(y, 12, 27)], collection: (y) => `christmas-${y}` },
  { id: 'newyear', name: 'New Year', short: 'New Year', tint: '#ffe9a8', atmo: 'sparks', range: (y) => [d(y, 12, 28), d(y + 1, 1, 3)] },
  { id: 'winter', name: 'Winter Wonderland', short: 'Winter', tint: '#dbe9ff', atmo: 'snow', range: (y) => [d(y, 1, 10), d(y, 2, 5)] },
  { id: 'lunar', name: 'Lunar New Year', short: 'Lunar New Year', tint: '#ffc4a0', atmo: 'lanterns', range: (y) => around(table('lunar', y), 5, 9) },
  { id: 'valentine', name: 'Valentine’s Day', short: 'Valentine’s', tint: '#ffc0d8', atmo: 'hearts', range: (y) => [d(y, 2, 7), d(y, 2, 15)] },
  { id: 'ramadan', name: 'Ramadan & Eid', short: 'Ramadan', tint: '#d7c8ff', atmo: 'lanterns', range: (y) => { const a = table('ramadan', y), b = table('eid', y); return a && b && b > a ? [a, addDays(b, 3)] : null; } },
  { id: 'stpatrick', name: 'St. Patrick’s Day', short: 'St. Patrick’s', tint: '#c8f0c0', atmo: 'petals', range: (y) => [d(y, 3, 12), d(y, 3, 18)] },
  { id: 'passover', name: 'Passover', short: 'Passover', tint: '#fff0c8', atmo: 'petals', range: (y) => around(table('passover', y), 3, 7) },
  { id: 'easter', name: 'Easter', short: 'Easter', tint: '#ffe6f0', atmo: 'petals', range: (y) => around(easter(y), 10, 2) },
  { id: 'mothers', name: 'Mother’s Day', short: 'Mother’s Day', tint: '#ffd6e4', atmo: 'petals', range: (y) => around(nth(y, 5, 0, 2), 6, 0) },
  { id: 'fathers', name: 'Father’s Day', short: 'Father’s Day', tint: '#d6ecff', atmo: 'none', range: (y) => around(nth(y, 6, 0, 3), 6, 0) },
  { id: 'canada', name: 'Canada Day', short: 'Canada Day', tint: '#ffd0d0', atmo: 'sparks', range: (y) => [d(y, 6, 26), d(y, 7, 2)] },
  { id: 'july4', name: 'Independence Day', short: 'July 4th', tint: '#ffe0e0', atmo: 'sparks', range: (y) => [d(y, 6, 30), d(y, 7, 5)] },
  { id: 'summer', name: 'Summer Festival', short: 'Summer', tint: '#fff3c0', atmo: 'fireflies', range: (y) => [d(y, 7, 15), d(y, 8, 15)] },
  { id: 'harvest', name: 'Autumn Harvest Festival', short: 'Harvest', tint: '#ffd9a8', atmo: 'leaves', range: (y) => [d(y, 9, 20), d(y, 10, 10)] },
  { id: 'diwali', name: 'Diwali', short: 'Diwali', tint: '#ffd27a', atmo: 'lanterns', range: (y) => around(table('diwali', y), 6, 3) },
];
export const holiday = (id: string): Holiday => HOLIDAYS.find((h) => h.id === id)!;

export interface ActiveEvent { holiday: Holiday; year: number; start: Date; end: Date; daysLeft: number; key: string; collection: Collection | null }
const dayStart = (x: Date) => { const r = new Date(x); r.setHours(0, 0, 0, 0); return r; };
/** Every event whose window includes `now` (several may overlap), soonest to end first. */
export function activeEvents(now: number | Date = Date.now()): ActiveEvent[] {
  const t = new Date(now);
  const today = dayStart(t);
  const out: ActiveEvent[] = [];
  for (const h of HOLIDAYS) {
    for (const y of [t.getFullYear() - 1, t.getFullYear()]) {
      const r = h.range(y);
      if (!r) continue;
      const [start, end] = [dayStart(r[0]), dayStart(r[1])];
      if (today < start || today > end) continue;
      const daysLeft = Math.round((end.getTime() - today.getTime()) / 86_400_000) + 1;
      const ck = h.collection?.(y) ?? '';
      out.push({ holiday: h, year: y, start, end, daysLeft, key: `${h.id}-${y}`, collection: COLLECTIONS.find((c) => c.key === ck) ?? null });
    }
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}
/** The next event to start after `now` (for "coming up" hints). */
export function nextEvent(now: number | Date = Date.now()): { holiday: Holiday; start: Date } | null {
  const t = dayStart(new Date(now));
  let best: { holiday: Holiday; start: Date } | null = null;
  for (const h of HOLIDAYS) for (const y of [t.getFullYear(), t.getFullYear() + 1]) {
    const r = h.range(y);
    if (!r) continue;
    const s = dayStart(r[0]);
    if (s > t && (!best || s < best.start)) best = { holiday: h, start: s };
  }
  return best;
}

// ---------- collections ----------
export type Rarity = 'regular' | 'rare' | 'limited' | 'premium';
export interface Collectible {
  id: string; name: string; blurb: string; w: number; d: number;
  /** what it costs in the event shop; `tokens` = event tokens earned by playing */
  price: { coins?: number; fuzzies?: number; tokens?: number };
  rarity: Rarity;
  animated?: boolean;
  /** copies you may own (default 1 for unique pieces; e.g. 6 for small decorations) */
  max?: number;
  /** earned, not sold: the challenge that gives it */
  earn?: string;
}
export interface Challenge { id: string; name: string; kind: 'orders' | 'harvests' | 'place' | 'tokens'; goal: number; reward: { tokens?: number; item?: string; coins?: number } }
export interface Collection { key: string; holiday: string; year: number; name: string; items: Collectible[]; challenges: Challenge[] }

export const COLLECTIONS: Collection[] = [
  { key: 'halloween-2026', holiday: 'halloween', year: 2026, name: 'Halloween 2026', items: [
    { id: 'hw26-jack', name: 'Glowing Jack-o’-Lantern', blurb: 'Carved and candle-lit — it flickers at night', w: 1, d: 1, price: { coins: 120 }, rarity: 'regular', animated: true, max: 8 },
    { id: 'hw26-cauldron', name: 'Witch’s Cauldron', blurb: 'Bubbles and glows a spooky green', w: 1, d: 1, price: { coins: 260 }, rarity: 'regular', animated: true, max: 4 },
    { id: 'hw26-ghosttree', name: 'Friendly Ghost Tree', blurb: 'A bare old tree with a shy little ghost', w: 1, d: 1, price: { tokens: 12 }, rarity: 'rare', animated: true, max: 4 },
    { id: 'hw26-fountain', name: 'Spooky Fountain', blurb: 'Glowing green water, bats on the rim', w: 2, d: 2, price: { coins: 900 }, rarity: 'rare', animated: true },
    { id: 'hw26-carriage', name: 'Pumpkin Carriage', blurb: 'Golden wheels, lantern glow — ready for the ball', w: 2, d: 1, price: { fuzzies: 30 }, rarity: 'premium', animated: true },
    { id: 'hw26-house', name: 'Haunted Pumpkin House', blurb: 'A giant pumpkin cottage with crooked windows', w: 2, d: 2, price: { tokens: 40 }, rarity: 'limited', animated: true, earn: 'hw26-c3' },
  ], challenges: [
    { id: 'hw26-c1', name: 'Deliver 5 orders', kind: 'orders', goal: 5, reward: { tokens: 6 } },
    { id: 'hw26-c2', name: 'Harvest 15 crops', kind: 'harvests', goal: 15, reward: { tokens: 6 } },
    { id: 'hw26-c3', name: 'Place 4 Halloween decorations', kind: 'place', goal: 4, reward: { item: 'hw26-house' } },
    { id: 'hw26-c4', name: 'Collect 30 event tokens', kind: 'tokens', goal: 30, reward: { coins: 400 } },
  ] },
  { key: 'thanks-2026', holiday: 'thanks-ca', year: 2026, name: 'Thanksgiving 2026', items: [
    { id: 'tg26-hay', name: 'Hay Bale Stack', blurb: 'Golden bales with a pumpkin on top', w: 1, d: 1, price: { coins: 90 }, rarity: 'regular', max: 8 },
    { id: 'tg26-scarecrow', name: 'Cheerful Scarecrow', blurb: 'Waves at the crows instead of scaring them', w: 1, d: 1, price: { coins: 220 }, rarity: 'regular', animated: true, max: 4 },
    { id: 'tg26-cornucopia', name: 'Harvest Cornucopia', blurb: 'A horn of plenty spilling pumpkins and apples', w: 1, d: 1, price: { tokens: 10 }, rarity: 'rare', max: 2 },
    { id: 'tg26-stall', name: 'Harvest Market Stall', blurb: 'Striped awning, pies and cider', w: 2, d: 1, price: { coins: 700 }, rarity: 'rare', max: 2 },
  ], challenges: [
    { id: 'tg26-c1', name: 'Harvest 10 crops', kind: 'harvests', goal: 10, reward: { tokens: 5 } },
    { id: 'tg26-c2', name: 'Deliver 3 orders', kind: 'orders', goal: 3, reward: { tokens: 5 } },
    { id: 'tg26-c3', name: 'Place 2 harvest decorations', kind: 'place', goal: 2, reward: { coins: 250 } },
  ] },
  { key: 'hanukkah-2026', holiday: 'hanukkah', year: 2026, name: 'Hanukkah 2026', items: [
    { id: 'hk26-lantern', name: 'Blue & White Lantern', blurb: 'A glowing lantern on a silver post', w: 1, d: 1, price: { coins: 110 }, rarity: 'regular', animated: true, max: 8 },
    { id: 'hk26-dreidel', name: 'Spinning Dreidel', blurb: 'A giant wooden dreidel that spins — נ ג ה ש', w: 1, d: 1, price: { tokens: 10 }, rarity: 'rare', animated: true, max: 4 },
    { id: 'hk26-hanukkiah', name: 'Grand Hanukkiah', blurb: 'Eight lights in a row and a raised shamash', w: 2, d: 1, price: { coins: 800 }, rarity: 'limited', animated: true },
  ], challenges: [
    { id: 'hk26-c1', name: 'Deliver 4 orders', kind: 'orders', goal: 4, reward: { tokens: 6 } },
    { id: 'hk26-c2', name: 'Harvest 12 crops', kind: 'harvests', goal: 12, reward: { tokens: 6 } },
    { id: 'hk26-c3', name: 'Place 3 Hanukkah decorations', kind: 'place', goal: 3, reward: { coins: 300 } },
  ] },
  { key: 'christmas-2026', holiday: 'christmas', year: 2026, name: 'Christmas 2026', items: [
    { id: 'xm26-snowman', name: 'Jolly Snowman', blurb: 'Carrot nose, cosy scarf, button smile', w: 1, d: 1, price: { coins: 120 }, rarity: 'regular', max: 6 },
    { id: 'xm26-candylamp', name: 'Candy-Cane Lamp', blurb: 'A striped lamp post with a warm glow', w: 1, d: 1, price: { coins: 150 }, rarity: 'regular', animated: true, max: 8 },
    { id: 'xm26-gifts', name: 'Gift Pile', blurb: 'Wrapped presents with big bows', w: 1, d: 1, price: { tokens: 8 }, rarity: 'regular', max: 6 },
    { id: 'xm26-tree', name: 'Twinkling Holiday Tree', blurb: 'A tall fir with twinkling lights and a star', w: 2, d: 2, price: { coins: 950 }, rarity: 'rare', animated: true },
    { id: 'xm26-gingerbread', name: 'Gingerbread House', blurb: 'Icing roof, candy buttons, peppermint door', w: 2, d: 2, price: { tokens: 40 }, rarity: 'limited', animated: true, earn: 'xm26-c3' },
    { id: 'xm26-icefountain', name: 'Ice Fountain', blurb: 'Frozen mid-splash, sparkling in the sun', w: 2, d: 2, price: { fuzzies: 35 }, rarity: 'premium', animated: true },
  ], challenges: [
    { id: 'xm26-c1', name: 'Deliver 6 orders', kind: 'orders', goal: 6, reward: { tokens: 8 } },
    { id: 'xm26-c2', name: 'Harvest 20 crops', kind: 'harvests', goal: 20, reward: { tokens: 8 } },
    { id: 'xm26-c3', name: 'Place 5 Christmas decorations', kind: 'place', goal: 5, reward: { item: 'xm26-gingerbread' } },
    { id: 'xm26-c4', name: 'Collect 40 event tokens', kind: 'tokens', goal: 40, reward: { coins: 500 } },
  ] },
];
export const collection = (key: string): Collection | undefined => COLLECTIONS.find((c) => c.key === key);
export const collectible = (id: string): Collectible | undefined => { for (const c of COLLECTIONS) { const it = c.items.find((x) => x.id === id); if (it) return it; } return undefined; };
export const collectionOf = (id: string): Collection | undefined => COLLECTIONS.find((c) => c.items.some((x) => x.id === id));

/** Collectibles are ordinary decor items for placing, moving and storage (registered once, at load). */
function register(): void {
  for (const c of COLLECTIONS) for (const x of c.items) {
    if (ITEMS.some((i) => i.id === x.id)) continue;
    const def: ItemDef = { id: x.id, name: x.name, kind: 'decor', w: x.w, d: x.d, cost: 0, currency: 'coins', level: 1, xp: 0, emoji: '🎁', blurb: x.blurb, sellable: false, collectible: c.key, water: x.id.endsWith('fountain') };
    ITEMS.push(def);
  }
}
register();

// ---------- ownership & the event shop ----------
export const owned = (s: LandState, id: string): number => s.owned?.[id] ?? 0;
/** Copies of a collectible not yet on the map or in storage (placeable right now). */
export const spare = (s: LandState, id: string): number => Math.max(0, owned(s, id) - count(s, id));
export const RARITY: Record<Rarity, string> = { regular: 'Seasonal', rare: 'Rare', limited: 'Limited edition', premium: 'Premium' };

/** Why you can't buy this now ('' = you can). `fuzzies` is the app-wide token balance. */
export function cantBuyCollectible(s: LandState, id: string, fuzzies: number, now: number | Date = Date.now()): string {
  const x = collectible(id);
  if (!x) return 'Unknown decoration.';
  const col = collectionOf(id)!;
  if (!activeEvents(now).some((e) => e.collection?.key === col.key)) return 'This event is over — it comes back next year with new pieces.';
  if (owned(s, id) >= (x.max ?? 1)) return x.max && x.max > 1 ? `You own all ${x.max}` : 'Already in your collection';
  if (x.earn && !x.price.tokens && !x.price.coins && !x.price.fuzzies) return 'Earned by a challenge';
  const ev = activeEvents(now).find((e) => e.collection?.key === col.key)!;
  if (x.price.coins && s.coins < x.price.coins) return 'Not enough coins';
  if (x.price.fuzzies && fuzzies < x.price.fuzzies) return 'Not enough Fuzzies';
  if (x.price.tokens && tokens(s, ev.key) < x.price.tokens) return `Need ${x.price.tokens} event tokens`;
  return '';
}
/**
 * Buy one copy. Coins and tokens are taken here; Fuzzies are returned for the caller to spend through the account (the
 * server guards that balance). Never charges for a unique piece you already own.
 */
export function buyCollectible(s: LandState, id: string, fuzzies: number, now: number | Date = Date.now()): { fuzzies: number } {
  const why = cantBuyCollectible(s, id, fuzzies, now);
  if (why) throw new Error(why);
  const x = collectible(id)!;
  const ev = activeEvents(now).find((e) => e.collection?.key === collectionOf(id)!.key)!;
  if (x.price.coins) s.coins -= x.price.coins;
  if (x.price.tokens) addTokens(s, ev.key, -x.price.tokens);
  grant(s, id);
  return { fuzzies: x.price.fuzzies ?? 0 };
}
/** Add a copy to the collection (a purchase or a reward). */
export function grant(s: LandState, id: string, n = 1): void {
  s.owned ??= {};
  s.owned[id] = (s.owned[id] ?? 0) + n;
}

// ---------- tokens, challenges & progress ----------
const ev = (s: LandState) => (s.events ??= { tokens: {}, progress: {}, claimed: [] });
export const tokens = (s: LandState, key: string): number => s.events?.tokens[key] ?? 0;
export function addTokens(s: LandState, key: string, n: number): void {
  const e = ev(s);
  e.tokens[key] = Math.max(0, (e.tokens[key] ?? 0) + n);
  if (n > 0) e.progress[key] = { ...(e.progress[key] ?? {}), tokens: (e.progress[key]?.tokens ?? 0) + n };
}
export const progress = (s: LandState, key: string, kind: Challenge['kind']): number => s.events?.progress[key]?.[kind] ?? 0;
/** Something happened in the game that events count (an order delivered, a crop harvested, a decoration placed). */
export function note(s: LandState, kind: 'orders' | 'harvests' | 'place', n = 1, itemId?: string, now: number | Date = Date.now()): void {
  for (const e of activeEvents(now)) {
    if (!e.collection) continue;
    if (kind === 'place' && (!itemId || collectionOf(itemId)?.key !== e.collection.key)) continue;
    const p = ev(s).progress;
    p[e.key] = { ...(p[e.key] ?? {}), [kind]: (p[e.key]?.[kind] ?? 0) + n };
  }
}
export const claimed = (s: LandState, challengeId: string): boolean => !!s.events?.claimed.includes(challengeId);
export const canClaim = (s: LandState, e: ActiveEvent, c: Challenge): boolean => !claimed(s, c.id) && progress(s, e.key, c.kind) >= c.goal;
/** Take a finished challenge's reward (once). */
export function claim(s: LandState, e: ActiveEvent, c: Challenge): Challenge['reward'] {
  if (claimed(s, c.id)) throw new Error('Already claimed.');
  if (progress(s, e.key, c.kind) < c.goal) throw new Error('Not finished yet.');
  ev(s).claimed.push(c.id);
  if (c.reward.tokens) addTokens(s, e.key, c.reward.tokens);
  if (c.reward.coins) s.coins += c.reward.coins;
  if (c.reward.item) grant(s, c.reward.item);
  return c.reward;
}
/** Finished challenges waiting to be claimed, across every active event (the dock badge). */
export function claimable(s: LandState, now: number | Date = Date.now()): number {
  let n = 0;
  for (const e of activeEvents(now)) for (const c of e.collection?.challenges ?? []) if (canClaim(s, e, c)) n++;
  return n;
}

/** Orders made during an event become holiday orders: they also pay 1–2 event tokens. Deterministic per order. */
export function decorateOrders(s: LandState, now: number | Date = Date.now()): void {
  const live = activeEvents(now).filter((e) => e.collection);
  if (!live.length) return;
  for (const o of s.orders as (Order & { event?: string; tokens?: number })[]) {
    if (o.event !== undefined) continue;
    const e = live[o.id % live.length];
    o.event = e.key;
    o.tokens = 1 + (o.id % 3 === 0 ? 1 : 0);
  }
}
/** After an order is delivered: its event tokens (and progress). Returns the tokens paid. */
export function orderDelivered(s: LandState, o: Order & { event?: string; tokens?: number }, now: number | Date = Date.now()): number {
  note(s, 'orders', 1, undefined, now);
  if (!o.event || !o.tokens || !activeEvents(now).some((e) => e.key === o.event)) return 0;
  addTokens(s, o.event, o.tokens);
  return o.tokens;
}
/** After a harvest: progress, and now and then a token drops (about one in five, during an event). */
export function harvested(s: LandState, n = 1, now: number | Date = Date.now(), roll = Math.random()): { event: ActiveEvent; tokens: number } | null {
  note(s, 'harvests', n, undefined, now);
  const live = activeEvents(now).filter((e) => e.collection);
  if (!live.length || roll > 0.2) return null;
  const e = live[Math.floor(roll * 50) % live.length];
  addTokens(s, e.key, 1);
  return { event: e, tokens: 1 };
}

/** Collections grouped for "My collection": every year's set, owned counts first. */
export function myCollections(s: LandState): { col: Collection; ownedCount: number; total: number }[] {
  return COLLECTIONS.map((col) => ({ col, ownedCount: col.items.filter((x) => owned(s, x.id) > 0).length, total: col.items.length }))
    .sort((a, b) => (b.ownedCount > 0 ? 1 : 0) - (a.ownedCount > 0 ? 1 : 0) || b.col.year - a.col.year);
}
/** The item defs of a collection (for the Decor tab: owned ones only). */
export const collectibleItems = (): ItemDef[] => ITEMS.filter((i) => !!i.collectible);
export const itemOf = (id: string): ItemDef => item(id);
