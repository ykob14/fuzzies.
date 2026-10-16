/**
 * The Fuzzy Shop's catalogue and rotation. DOM-free: pure functions of a date, so everybody sees the same shop on the same day and
 * nothing can be re-rolled. Prices always come from the data (`unlock.price` in characters.ts / cosmetics.ts) — never invented here.
 *
 *  - Permanent shelf: shop items with slot 'permanent'.
 *  - Daily: 1 Fuzzy (common / rare, from the rotating pool) + 3 daily cosmetics. New picks at local midnight.
 *  - Weekly: 1 epic Fuzzy (rotating pool) + 2 weekly cosmetics. New picks every local Monday 00:00.
 *  - Seasonal: cosmetics tied to an event are for sale ONLY while that event's window is open; event Fuzzies are never for sale.
 *  - Legendary and mythic items are never for sale.
 * Rotations walk through a shuffled copy of each pool ("draw"), so every item shows up once per cycle instead of by luck.
 */
import { CHARACTERS, CHARACTER_BY_ID, EVENT_NAME, type EventId, type Rarity } from './characters';
import { COSMETICS, COSMETIC_BY_ID } from './cosmetics';

export type ShelfName = 'permanent' | 'daily' | 'weekly' | 'season';
export interface ShopItem { id: string; type: 'character' | 'cosmetic'; price: number; shelf: ShelfName; event?: EventId }
export interface EventShelf { event: EventId; name: string; /** local midnight after the last day */ endsAt: number; items: ShopItem[]; /** event Fuzzies: earned in the event, not sold */ eventFuzzies: string[] }

export const DAY = 86_400_000;
const NEVER_FOR_SALE: Rarity[] = ['legendary', 'mythic'];

// ───────────────────────── dates (everything is the device's local calendar) ─────────────────────────
/** the clock the shop reads (in a dev build a test can set `fz.dev.now`) */
export function now(): number {
  try {
    if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV && typeof localStorage !== 'undefined') {
      const v = Number(localStorage.getItem('fz.dev.now'));
      if (v) return v;
    }
  } catch { /* storage blocked */ }
  return Date.now();
}
/** whole local days since 1970-01-01 for a moment in time */
export function dayNumber(ms: number): number { const d = new Date(ms); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY); }
/** local midnight (as a timestamp) at the start of a day number */
export function dayStart(n: number): number { const u = new Date(n * DAY); return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate()).getTime(); }
const dayOf = (y: number, m: number, d: number): number => Math.floor(Date.UTC(y, m - 1, d) / DAY);
/** Monday-based week number (the same for every day of one local week) */
export const weekNumber = (ms: number): number => Math.floor((dayNumber(ms) + 3) / 7);
export const dayKeyOf = (ms: number): string => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
/** next local midnight */
export const nextDailyReset = (ms: number): number => dayStart(dayNumber(ms) + 1);
/** next local Monday 00:00 */
export const nextWeeklyReset = (ms: number): number => { const n = dayNumber(ms); const dow = (n + 4) % 7; /* 0 = Sunday */ return dayStart(n + (((1 - dow + 7) % 7) || 7)); };

// ───────────────────────── seeded shuffles ─────────────────────────
function hash(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 16; return h >>> 0; }
function rng(seed: number): () => number { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffled<T>(xs: T[], salt: string): T[] { const r = rng(hash(salt)); const a = xs.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
/**
 * k items for rotation step `index`: each cycle is its own shuffle of the pool, cut into slices of k, so nothing repeats inside a cycle
 * and nothing is twice in one slice. (A pool smaller than k just gives everything.)
 */
export function draw<T>(pool: T[], k: number, index: number, salt: string): T[] {
  const n = Math.floor(pool.length / k) * k;
  if (n === 0) return pool.slice();
  const per = n / k;
  const epoch = Math.floor(index / per);
  const slot = ((index % per) + per) % per;
  return shuffled(pool, `${salt}:${epoch}`).slice(0, n).slice(slot * k, slot * k + k);
}

// ───────────────────────── events ─────────────────────────
const HANUKKAH: Record<number, [number, number, number]> = { 2026: [2026, 12, 4], 2027: [2027, 12, 24], 2028: [2028, 12, 12], 2029: [2029, 12, 1], 2030: [2030, 12, 20], 2031: [2031, 12, 9], 2032: [2032, 11, 27] };
const LUNAR: Record<number, [number, number, number]> = { 2027: [2027, 2, 6], 2028: [2028, 1, 26], 2029: [2029, 2, 13], 2030: [2030, 2, 3], 2031: [2031, 1, 23], 2032: [2032, 2, 11] };
/** Western (Gregorian) Easter Sunday as [year, month, day] */
export function easterSunday(y: number): [number, number, number] {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const hh = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - hh - k) % 7, m = Math.floor((a + 11 * hh + 22 * l) / 451);
  const month = Math.floor((hh + l - 7 * m + 114) / 31), day = ((hh + l - 7 * m + 114) % 31) + 1;
  return [y, month, day];
}
export const EVENT_ORDER: EventId[] = ['halloween', 'thanksgiving', 'christmas', 'hanukkah', 'winter', 'lunar', 'easter', 'summer'];
/** the window (inclusive day numbers) of an event that STARTS in calendar year `y`, or null when we have no dates for that year */
export function eventWindowIn(id: EventId, y: number): [number, number] | null {
  switch (id) {
    case 'halloween': return [dayOf(y, 10, 15), dayOf(y, 11, 2)];
    case 'thanksgiving': return [dayOf(y, 11, 15), dayOf(y, 12, 1)];
    case 'christmas': return [dayOf(y, 12, 10), dayOf(y + 1, 1, 2)];
    case 'winter': return [dayOf(y, 1, 5), dayOf(y, 2, 10)];
    case 'summer': return [dayOf(y, 6, 15), dayOf(y, 8, 31)];
    case 'easter': { const [ey, em, ed] = easterSunday(y); const e = dayOf(ey, em, ed); return [e - 14, e + 3]; }
    case 'hanukkah': { const t = HANUKKAH[y]; if (!t) return null; const s = dayOf(...t); return [s - 2, s + 9]; }
    case 'lunar': { const t = LUNAR[y]; if (!t) return null; const s = dayOf(...t); return [s - 5, s + 15]; }
  }
}
/** the event ids whose window includes the given moment (soonest to end first) */
export function activeEvents(ms: number = now()): EventId[] {
  const today = dayNumber(ms), y = new Date(ms).getFullYear();
  const out: { id: EventId; end: number }[] = [];
  for (const id of EVENT_ORDER) {
    for (const yy of [y - 1, y]) { const w = eventWindowIn(id, yy); if (w && today >= w[0] && today <= w[1]) { out.push({ id, end: w[1] }); break; } }
  }
  return out.sort((a, b) => a.end - b.end).map((x) => x.id);
}
/** when the event that is on now ends (local midnight after its last day), or null when it isn't on */
export function eventEnds(id: EventId, ms: number): number | null {
  const today = dayNumber(ms), y = new Date(ms).getFullYear();
  for (const yy of [y - 1, y]) { const w = eventWindowIn(id, yy); if (w && today >= w[0] && today <= w[1]) return dayStart(w[1] + 1); }
  return null;
}
/** the start (local midnight) of the next time the event opens, strictly after today; null when we have no dates that far ahead */
export function nextEventStart(id: EventId, ms: number): number | null {
  const today = dayNumber(ms), y = new Date(ms).getFullYear();
  let best: number | null = null;
  for (let yy = y; yy <= y + 9; yy++) { const w = eventWindowIn(id, yy); if (w && w[0] > today && (best === null || w[0] < best)) best = w[0]; }
  return best === null ? null : dayStart(best);
}

// ───────────────────────── the catalogue ─────────────────────────
const sellable = (r: Rarity): boolean => !NEVER_FOR_SALE.includes(r);
const charItem = (id: string, shelf: ShelfName): ShopItem | null => {
  const d = CHARACTER_BY_ID[id];
  return d && d.unlock.kind === 'shop' && sellable(d.rarity) ? { id, type: 'character', price: d.unlock.price, shelf } : null;
};
const cosItem = (id: string, shelf: ShelfName, event?: EventId): ShopItem | null => {
  const d = COSMETIC_BY_ID[id];
  if (!d || !sellable(d.rarity)) return null;
  if (d.unlock.kind === 'shop') return { id, type: 'cosmetic', price: d.unlock.price, shelf };
  if (d.unlock.kind === 'season') return { id, type: 'cosmetic', price: d.unlock.price, shelf, event };
  return null;
};
const nn = (xs: (ShopItem | null)[]): ShopItem[] => xs.filter((x): x is ShopItem => !!x);

const POOL = {
  /** Fuzzies that rotate through the daily slot (common / rare) and the weekly slot (epic) */
  dailyFuzzies: CHARACTERS.filter((c) => c.unlock.kind === 'shop' && c.unlock.slot === 'rotating' && (c.rarity === 'common' || c.rarity === 'rare')).map((c) => c.id),
  weeklyFuzzies: CHARACTERS.filter((c) => c.unlock.kind === 'shop' && c.unlock.slot === 'rotating' && c.rarity === 'epic').map((c) => c.id),
  dailyStyles: COSMETICS.filter((c) => c.unlock.kind === 'shop' && c.unlock.slot === 'daily').map((c) => c.id),
  weeklyStyles: COSMETICS.filter((c) => c.unlock.kind === 'shop' && c.unlock.slot === 'weekly').map((c) => c.id),
};

/** everything that is always on the shelf */
export function permanentItems(): ShopItem[] {
  return nn([
    ...CHARACTERS.filter((c) => c.unlock.kind === 'shop' && c.unlock.slot === 'permanent').map((c) => charItem(c.id, 'permanent')),
    ...COSMETICS.filter((c) => c.unlock.kind === 'shop' && c.unlock.slot === 'permanent').map((c) => cosItem(c.id, 'permanent')),
  ]);
}
/** today's picks: 1 Fuzzy + 3 styles */
export function dailyItems(ms: number = now()): ShopItem[] {
  const n = dayNumber(ms);
  return nn([
    ...draw(POOL.dailyFuzzies, 1, n, 'daily-fuzzy').map((id) => charItem(id, 'daily')),
    ...draw(POOL.dailyStyles, 3, n, 'daily-style').map((id) => cosItem(id, 'daily')),
  ]);
}
/** this week's picks: 1 epic Fuzzy + 2 styles */
export function weeklyItems(ms: number = now()): ShopItem[] {
  const w = weekNumber(ms);
  return nn([
    ...draw(POOL.weeklyFuzzies, 1, w, 'weekly-fuzzy').map((id) => charItem(id, 'weekly')),
    ...draw(POOL.weeklyStyles, 2, w, 'weekly-style').map((id) => cosItem(id, 'weekly')),
  ]);
}
/** one shelf per event that is on now */
export function seasonalShelves(ms: number = now()): EventShelf[] {
  return activeEvents(ms).map((event) => ({
    event, name: EVENT_NAME[event], endsAt: eventEnds(event, ms) ?? nextDailyReset(ms),
    items: nn(COSMETICS.filter((c) => c.unlock.kind === 'season' && c.unlock.event === event).map((c) => cosItem(c.id, 'season', event))),
    eventFuzzies: CHARACTERS.filter((c) => c.unlock.kind === 'season' && c.unlock.event === event).map((c) => c.id),
  }));
}
/** every listing that can be bought at this moment */
export function allListings(ms: number = now()): ShopItem[] {
  return [...permanentItems(), ...dailyItems(ms), ...weeklyItems(ms), ...seasonalShelves(ms).flatMap((s) => s.items)];
}
/** the listing for an item right now, or null when it isn't for sale (not in today's shop, event over, or never sold) */
export function listingFor(id: string, ms: number = now()): ShopItem | null { return allListings(ms).find((x) => x.id === id) ?? null; }
/** the price printed in the data for something that can ever be sold, else null */
export function priceOf(id: string): number | null {
  const c = CHARACTER_BY_ID[id]; if (c) return c.unlock.kind === 'shop' && sellable(c.rarity) ? c.unlock.price : null;
  const x = COSMETIC_BY_ID[id]; if (x) return (x.unlock.kind === 'shop' || x.unlock.kind === 'season') && sellable(x.rarity) ? x.unlock.price : null;
  return null;
}
/** which shelf an item belongs to (for "where do I find it"), or null when the shop never sells it */
export function shelfOf(id: string): ShelfName | null {
  const c = CHARACTER_BY_ID[id];
  if (c) { if (priceOf(id) === null || c.unlock.kind !== 'shop') return null; return c.unlock.slot === 'permanent' ? 'permanent' : c.rarity === 'epic' ? 'weekly' : 'daily'; }
  const x = COSMETIC_BY_ID[id];
  if (x && priceOf(id) !== null) return x.unlock.kind === 'season' ? 'season' : x.unlock.kind === 'shop' ? x.unlock.slot === 'permanent' ? 'permanent' : x.unlock.slot : null;
  return null;
}
export interface Appearance { at: number; shelf: ShelfName; event?: EventId }
/** when an item next appears in the shop (looks forward day by day, `horizonDays` at most; events look further) — null if never */
export function nextAppearance(id: string, ms: number = now(), horizonDays = 60): Appearance | null {
  const shelf = shelfOf(id);
  if (!shelf) return null;
  if (shelf === 'permanent') return { at: dayStart(dayNumber(ms)), shelf };
  if (shelf === 'season') {
    const ev = (COSMETIC_BY_ID[id].unlock as { event: EventId }).event;
    const at = nextEventStart(ev, ms);
    return at === null ? null : { at, shelf, event: ev };
  }
  const n = dayNumber(ms);
  for (let i = 1; i <= horizonDays; i++) {
    const t = dayStart(n + i);
    const l = shelf === 'daily' ? dailyItems(t) : weeklyItems(t);
    if (l.some((x) => x.id === id)) return { at: t, shelf };
  }
  return null;
}

// ───────────────────────── words ─────────────────────────
/** "5h 12m", "2d 4h", "9 min" … for countdowns */
export function countdown(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d >= 1) return `${d}d ${h}h`;
  if (h >= 1) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${Math.max(1, m)} min`;
}
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "Sat 24 Oct" */
export function dateWords(ms: number): string { const d = new Date(ms); return `${WEEKDAY[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}`; }
/** "in 12 days" / "tomorrow" */
export function inDays(from: number, to: number): string {
  const n = dayNumber(to) - dayNumber(from);
  return n <= 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`;
}
