/**
 * Fuzzies Adventures — RULES only (no DOM, no Three.js): who the Fuzzies are (names, personalities, what they say),
 * the daily mission (one featured adventure a day, rotating through the playable ones, reset at local midnight),
 * progress and rewards (one reward per adventure per day — replays are practice), saved inside the town (`LandState.adventures`).
 * New mini-games register in `ADVENTURES`; the screen finds the scene by `id`. Checked without a browser by `adv/rules.ts`.
 */
import { NAMES, addXp, type LandState } from './rules';

export type Role = 'adventurous' | 'farmer' | 'builder' | 'explorer' | 'fisher' | 'creative' | 'nature' | 'baker';
export interface Character { index: number; name: string; role: Role; title: string; bio: string; hello: string[]; chat: string[]; emoji: string }

/** Personalities by resident number (the town's Fuzzies are numbered as they appear; names come from NAMES). */
const ROLES: Role[] = ['adventurous', 'farmer', 'builder', 'explorer', 'fisher', 'creative', 'nature', 'baker'];
const ROLE_INFO: Record<Role, { title: string; bio: string; hello: string[]; chat: string[]; emoji: string }> = {
  adventurous: { title: 'Adventurer', emoji: '⛵', bio: 'Lives for races and wild ideas. First to try anything, last to sit still.',
    hello: ['Hey! Perfect day for an adventure!', 'Ooh, you’re here! Ready for some speed?', 'Hi hi! I’ve been practising my boat turns!'],
    chat: ['One day I’ll race around the whole island twice!', 'Fast boats, warm sun — that’s the life.', 'Did you see my new paddle? Shiny!'] },
  farmer: { title: 'Farmer', emoji: '🌱', bio: 'Happiest with muddy feet. Knows every crop by name and hums while watering.',
    hello: ['Morning! The carrots say hi too.', 'Hi there! Smell that? Fresh soil!', 'Oh hello! Come see the fields later?'],
    chat: ['Wheat takes patience. Patience and snacks.', 'A field a day keeps the barn full.', 'The strawberries are nearly ready!'] },
  builder: { title: 'Builder', emoji: '🔨', bio: 'Measures twice, hops once. Dreams of a town with a hundred rooftops.',
    hello: ['Hey! Got any plans to build today?', 'Hi! I just fixed the mailbox. Again.', 'Hello! Need a hand with a house?'],
    chat: ['Roads first, then houses, then cake.', 'That roof could use a little more love.', 'I could build a bridge to the moon. Probably.'] },
  explorer: { title: 'Explorer', emoji: '🧭', bio: 'Keeps a map of every corner of the island — and a few corners that aren’t on it yet.',
    hello: ['Hi! I found a new path this morning!', 'Psst — want to see something hidden?', 'Hello, traveller!'],
    chat: ['The forest edge has the best echoes.', 'My map has a blank spot. I like blank spots.', 'Somewhere out there is treasure. I can feel it.'] },
  fisher: { title: 'Fisher', emoji: '🎣', bio: 'Calm as a pond, until the water gets exciting. Loves boats, waves and splashing.',
    hello: ['Ahoy! The water’s lovely today.', 'Hi! Caught three fish and one boot.', 'Hey you! Up for something on the water?'],
    chat: ['Waves are just the sea breathing.', 'A good boat is a friend with a hull.', 'Shh… the big one is near.'] },
  creative: { title: 'Decorator', emoji: '🎨', bio: 'Sees every empty spot as a canvas. Will move your bench. Twice.',
    hello: ['Hi! Your town looks SO cute today.', 'Ooh, hello! I have ideas. Many ideas.', 'Hey! That lamp post needs a ribbon.'],
    chat: ['More flowers. Always more flowers.', 'Symmetry is nice, surprise is nicer.', 'What if the fountain… glowed?'] },
  nature: { title: 'Nature keeper', emoji: '🍃', bio: 'Talks to the trees and swears they answer. Keeps the island green and tidy.',
    hello: ['Hello, friend of the forest!', 'Hi! The trees are chatty today.', 'Oh hey! Mind the butterflies.'],
    chat: ['Every tree remembers who planted it.', 'Clean streams make happy Fuzzies.', 'The wind brings news from the hills.'] },
  baker: { title: 'Baker', emoji: '🥐', bio: 'Flour on the nose, sugar in the heart. Celebrates every win with a cake.',
    hello: ['Hi! Something’s in the oven — can you smell it?', 'Hello hello! Cake later?', 'Hey! I saved you a bun.'],
    chat: ['Bread rises, and so do we.', 'A pinch of salt makes the sweet sweeter.', 'The popcorn stand and I have a rivalry. A tasty one.'] },
};

export function character(index: number): Character {
  const role = ROLES[index % ROLES.length];
  return { index, name: NAMES[index % NAMES.length], role, ...ROLE_INFO[role] };
}
export const roleTitle = (r: Role): string => ROLE_INFO[r].title;

// ---------- the adventures (mini-games) ----------
export interface Adventure {
  id: string; name: string; short: string; emoji: string;
  /** which personalities host it (the first present resident with one of these roles offers it) */
  hosts: Role[];
  /** what the host says when offering it */
  pitch: string;
  objective: string;
  /** town coins by finishing place (1st, 2nd, 3rd…); other places get the last entry (the forest's 4th tier = sunset came first) */
  coins: number[];
  xp: number;
  /** false = designed and listed as "coming soon", not playable yet */
  playable: boolean;
}

export const ADVENTURES: Adventure[] = [
  { id: 'boatrace', name: 'Fuzzies Boat Race', short: 'Boat Race', emoji: '⛵', hosts: ['adventurous', 'fisher'],
    pitch: 'I’m planning an exciting boat race around the island today! Three laps, three boats, one winner. Wanna join me?',
    objective: 'Race three laps around Palm Island and finish first', coins: [100, 60, 30], xp: 25, playable: true },
  { id: 'forest', name: 'Forest Expansion', short: 'Forest Clearing', emoji: '🪓', hosts: ['nature', 'builder'],
    pitch: 'The town wants to grow! Help me clear the marked trees at the forest edge — we’ll keep the wood for building.',
    objective: 'Clear the six marked trees before the sun sets', coins: [80, 50, 30, 15], xp: 20, playable: true },
  { id: 'fishing', name: 'Fishing Contest', short: 'Fishing', emoji: '🎣', hosts: ['fisher'], pitch: 'The big one is out there. Fancy a fishing contest?', objective: 'Catch the most fish in three minutes', coins: [80, 50, 30], xp: 20, playable: false },
  { id: 'treasure', name: 'Island Treasure Hunt', short: 'Treasure Hunt', emoji: '🗺️', hosts: ['explorer'], pitch: 'My map has an X on it. Shall we find out why?', objective: 'Follow the clues to the hidden chest', coins: [90, 60, 30], xp: 20, playable: false },
  { id: 'harvest', name: 'Harvest Rush', short: 'Harvest Rush', emoji: '🌾', hosts: ['farmer'], pitch: 'The crops are all ready at once! Help me bring them in?', objective: 'Harvest the fields before the timer runs out', coins: [70, 45, 25], xp: 15, playable: false },
  { id: 'delivery', name: 'Delivery Dash', short: 'Delivery', emoji: '📦', hosts: ['baker'], pitch: 'Fresh buns, hungry Fuzzies, one little cart. Help me deliver?', objective: 'Deliver every parcel while it’s warm', coins: [70, 45, 25], xp: 15, playable: false },
  { id: 'garden', name: 'Garden Contest', short: 'Garden Contest', emoji: '🌷', hosts: ['creative'], pitch: 'A decorating contest! Make the prettiest garden on the island.', objective: 'Decorate the garden plot to win the judges over', coins: [70, 45, 25], xp: 15, playable: false },
];
export const adventure = (id: string): Adventure | undefined => ADVENTURES.find((a) => a.id === id);
export const playable = (): Adventure[] => ADVENTURES.filter((a) => a.playable);

// ---------- the daily mission ----------
export interface AdvState {
  day: string;
  /** rewards collected today: adventure id → result */
  done: Record<string, { place: number; coins: number; xp: number; at: number }>;
  /** total plays per adventure (all days) */
  plays: Record<string, number>;
  /** best finishing place per adventure (1 = won) and best times (ms) */
  best: Record<string, number>;
  bestTime: Record<string, number>;
  /** wood from the forest adventure (kept for the expansion mission) */
  wood: number;
  /** rewards the server hasn't confirmed yet (cloud accounts, offline at the time): day:id */
  pending: string[];
  /** recent results, newest last (kept short) */
  log: { day: string; id: string; place: number; coins: number }[];
}

export const freshAdventures = (now = Date.now()): AdvState => ({ day: dayKey(now), done: {}, plays: {}, best: {}, bestTime: {}, wood: 0, pending: [], log: [] });

/** The local calendar day (missions reset at the player's midnight, shown as a countdown). */
export function dayKey(now = Date.now()): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** Milliseconds until the next local midnight. */
export function untilReset(now = Date.now()): number {
  const d = new Date(now);
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0).getTime();
  return Math.max(0, next - now);
}
export function countdown(ms: number): string {
  const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : m > 0 ? `${m} min` : 'less than a minute';
}
const dayNumber = (key: string): number => { const [y, m, d] = key.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86_400_000); };

/** The adventures state for today (yesterday's rewards are cleared, totals are kept). */
export function adventures(s: LandState, now = Date.now()): AdvState {
  const a = (s.adventures ??= freshAdventures(now));
  const today = dayKey(now);
  if (a.day !== today) { a.day = today; a.done = {}; }
  return a;
}

/** Today's featured adventure: rotates through the playable ones, one per day. */
export function featured(now = Date.now()): Adventure {
  const list = playable();
  return list[dayNumber(dayKey(now)) % list.length];
}

export interface Mission { adventure: Adventure; day: string; done: AdvState['done'][string] | null; resetsIn: number; plays: number; best: number | null; bestTime: number | null }
export function mission(s: LandState, now = Date.now()): Mission {
  const a = adventures(s, now);
  const adv = featured(now);
  return { adventure: adv, day: a.day, done: a.done[adv.id] ?? null, resetsIn: untilReset(now), plays: a.plays[adv.id] ?? 0, best: a.best[adv.id] ?? null, bestTime: a.bestTime[adv.id] ?? null };
}

/** Which present resident offers today's mission (the first with a fitting personality, else the first Fuzzy). */
export function hostIndex(adv: Adventure, residents: number): number {
  for (let i = 0; i < residents; i++) if (adv.hosts.includes(character(i).role)) return i;
  return 0;
}

/** Can a reward still be collected for this adventure today? */
export const rewardLeft = (s: LandState, id: string, now = Date.now()): boolean => !adventures(s, now).done[id];

export interface Result { id: string; place: number; timeMs?: number }
export interface Payout { coins: number; xp: number; first: boolean; levelUps: number[]; practice: boolean }

/**
 * A finished run: counts the play and the best, and pays the reward ONCE per adventure per day (later runs are practice).
 * `pay` = false records the run without paying (the screen pays after the server confirms, for cloud accounts).
 */
export function finish(s: LandState, r: Result, now = Date.now(), pay = true): Payout {
  const adv = adventure(r.id);
  if (!adv) throw new Error('That adventure doesn’t exist.');
  if (!Number.isInteger(r.place) || r.place < 1) throw new Error('Bad finishing place.');
  const a = adventures(s, now);
  a.plays[r.id] = (a.plays[r.id] ?? 0) + 1;
  if (a.best[r.id] === undefined || r.place < a.best[r.id]) a.best[r.id] = r.place;
  if (r.timeMs && (a.bestTime[r.id] === undefined || r.timeMs < a.bestTime[r.id])) a.bestTime[r.id] = r.timeMs;
  const practice = !!a.done[r.id] || adv.id !== featured(now).id;
  const coins = practice ? 0 : adv.coins[Math.min(r.place, adv.coins.length) - 1];
  const xp = practice ? 0 : adv.xp;
  a.log = [...a.log, { day: a.day, id: r.id, place: r.place, coins }].slice(-30);
  if (practice) return { coins: 0, xp: 0, first: false, levelUps: [], practice: true };
  a.done[r.id] = { place: r.place, coins, xp, at: now };
  if (!pay) return { coins, xp, first: true, levelUps: [], practice: false };
  return { ...payout(s, coins, xp), coins, xp, first: true, practice: false };
}

/** Add a confirmed reward to the town. */
export function payout(s: LandState, coins: number, xp: number): { levelUps: number[] } {
  s.coins += coins;
  return { levelUps: xp ? addXp(s, xp) : [] };
}

/** Finishing-place words. */
export const placeWord = (p: number): string => (p === 1 ? '1st' : p === 2 ? '2nd' : p === 3 ? '3rd' : `${p}th`);
export const medal = (p: number): string => (p === 1 ? '🥇' : p === 2 ? '🥈' : p === 3 ? '🥉' : '🏁');

export const migrateAdventures = (a: Partial<AdvState> | undefined, now = Date.now()): AdvState => {
  const f = freshAdventures(now);
  if (!a || typeof a !== 'object') return f;
  return { ...f, ...a, done: { ...(a.done ?? {}) }, plays: { ...(a.plays ?? {}) }, best: { ...(a.best ?? {}) }, bestTime: { ...(a.bestTime ?? {}) }, pending: [...(a.pending ?? [])], log: [...(a.log ?? [])].slice(-30), wood: Number(a.wood) || 0, day: typeof a.day === 'string' ? a.day : f.day };
};
