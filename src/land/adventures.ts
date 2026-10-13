/**
 * Fuzzies Adventures — RULES only (no DOM, no Three.js): who the Fuzzies are (names, personalities, what they say),
 * the mission sets (THREE different missions at a time, each hosted by its own Fuzzy; a new set FIVE HOURS after the last one
 * was issued, and only once all three are done — an unfinished mission is never lost, sets never stack), progress and rewards
 * (one reward per mission per set), saved inside the town (`LandState.adventures`). For accounts the SERVER issues the sets with
 * its own clock (`api/data.ts` → `adventure.set`), so a device clock can't hurry them; guests use the device clock.
 * New mini-games register in `ADVENTURES`; the screen finds the scene by `id`. Checked without a browser by `adv/sets-check.ts`.
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
/** A twist on an adventure for some days of the rotation (a rougher race, denser woods, more golden hairballs…). */
export interface Variant { key: string; name: string; note: string }
export interface Adventure {
  id: string; name: string; short: string; emoji: string;
  /** which personalities host it (the first present resident with one of these roles offers it) */
  hosts: Role[];
  /** what the host says when offering it */
  pitch: string;
  objective: string;
  /** town coins by finishing place / tier (1st, 2nd, 3rd…); other places get the last entry */
  coins: number[];
  xp: number;
  /** false = designed and listed as "coming soon", not playable yet */
  playable: boolean;
  /** `race` = a finishing place against others; `score` = points in a time limit, turned into a tier (1st…4th) */
  kind: 'race' | 'score';
  /** the time limit in seconds (shown on the mission card) */
  limit?: number;
  variants?: Record<string, Variant>;
  /** how to play, in 3 very short steps (the mission card, the Adventures sheet and the game's own intro show these) */
  howTo: string[];
  /** the controls, in plain words, per device */
  controls: { desktop: string; mobile: string };
  /** one line on how the score / place works */
  scoring: string;
  /** a tip from the host */
  tip: string;
}

export const ADVENTURES: Adventure[] = [
  { id: 'boatrace', name: 'Fuzzies Boat Race', short: 'Boat Race', emoji: '⛵', hosts: ['adventurous', 'fisher'], kind: 'race',
    pitch: 'I’m planning an exciting boat race around the island today! Three laps, three boats, one winner. Wanna join me?',
    objective: 'Three laps around the island — finish first', coins: [100, 60, 30], xp: 25, playable: true,
    variants: { wild: { key: 'wild', name: 'Wild Water', note: 'Barrels, boost pads and rolling waves from the very first lap' } },
    howTo: ['Follow the gold arrow', 'Go through every gate, in order', 'Missed one? Turn back for it'],
    controls: { desktop: '← → steer · W go · S brake', mobile: 'Hold left or right to steer' },
    scoring: 'Three gates skipped = no lap. Later laps add barrels, boost rings, currents and waves. 1st 100 coins, 2nd 60, 3rd 30, once a day.',
    tip: 'Ride the gold boost rings and brake a touch before the tight bend!' },
  { id: 'forest', name: 'Forest Challenge', short: 'Forest Challenge', emoji: '🪓', hosts: ['nature', 'builder'], kind: 'race', limit: 120,
    pitch: 'Lumberjack contest! You, me and two more Fuzzies, two minutes, every tree on the hill is fair game — whoever scores the most points wins. Grab an axe!',
    objective: 'Cut the most trees — against 3 Fuzzies', coins: [100, 65, 35, 15], xp: 25, playable: true,
    variants: { deep: { key: 'deep', name: 'Deep Woods', note: 'Denser woods, bigger trees, sharper rivals' } },
    howTo: ['Tap any tree — you walk there', 'Tap CHOP in the green', 'Most points when the sun sets wins'],
    controls: { desktop: 'Click a tree or WASD · Space chops', mobile: 'Tap a tree or drag · tap CHOP' },
    scoring: 'Every tree counts: small / medium / large = 20 / 45 / 90 points, ringed trees ×1.5, sparkly bonus trees +60, wood pieces +5 each. Three town Fuzzies cut too — a tree someone is on is theirs. 1st 100 coins, 2nd 65, 3rd 35, 4th 15 (+25 XP), once a day.',
    tip: 'Tap a far tree and your Fuzzy walks there by itself — grab the big ringed ones before the others do!' },
  { id: 'vacuum', name: 'Hairball Vacuum Challenge', short: 'Hairball Vacuum', emoji: '🧹', hosts: ['creative', 'baker'], kind: 'score', limit: 120,
    pitch: 'It was Big Brushing Day and there are hairballs EVERYWHERE! Take my vacuum and clean up the garden — two minutes, suck up as many as you can!',
    objective: 'Vacuum up the hairballs', coins: [100, 65, 35, 15], xp: 25, playable: true,
    variants: { golden: { key: 'golden', name: 'Golden Day', note: 'Twice the golden hairballs — and they keep coming back' } },
    howTo: ['Walk into the fluff', 'Golden ones = 100 points', 'Pick up fast for combos'],
    controls: { desktop: 'WASD or arrows to walk', mobile: 'Drag to walk' },
    scoring: 'Points for every hairball × your chain multiplier. Top tier 100 coins, then 65, 35, 15 (+25 XP), once a day.',
    tip: 'Golden hairballs hide in the corners and behind the flower beds!' },
  { id: 'fishing', name: 'Fishing Contest', short: 'Fishing', emoji: '🎣', hosts: ['fisher'], pitch: 'The big one is out there. Fancy a fishing contest?', objective: 'Catch the most fish in three minutes', coins: [80, 50, 30], xp: 20, playable: false, kind: 'score', howTo: [], controls: { desktop: '', mobile: '' }, scoring: '', tip: '' },
  { id: 'treasure', name: 'Island Treasure Hunt', short: 'Treasure Hunt', emoji: '🗺️', hosts: ['explorer'], pitch: 'My map has an X on it. Shall we find out why?', objective: 'Follow the clues to the hidden chest', coins: [90, 60, 30], xp: 20, playable: false, kind: 'score', howTo: [], controls: { desktop: '', mobile: '' }, scoring: '', tip: '' },
  { id: 'harvest', name: 'Harvest Rush', short: 'Harvest Rush', emoji: '🌾', hosts: ['farmer'], pitch: 'The crops are all ready at once! Help me bring them in?', objective: 'Harvest the fields before the timer runs out', coins: [70, 45, 25], xp: 15, playable: false, kind: 'score', howTo: [], controls: { desktop: '', mobile: '' }, scoring: '', tip: '' },
  { id: 'delivery', name: 'Delivery Dash', short: 'Delivery', emoji: '📦', hosts: ['baker'], pitch: 'Fresh buns, hungry Fuzzies, one little cart. Help me deliver?', objective: 'Deliver every parcel while it’s warm', coins: [70, 45, 25], xp: 15, playable: false, kind: 'score', howTo: [], controls: { desktop: '', mobile: '' }, scoring: '', tip: '' },
  { id: 'garden', name: 'Garden Contest', short: 'Garden Contest', emoji: '🌷', hosts: ['creative'], pitch: 'A decorating contest! Make the prettiest garden on the island.', objective: 'Decorate the garden plot to win the judges over', coins: [70, 45, 25], xp: 15, playable: false, kind: 'score', howTo: [], controls: { desktop: '', mobile: '' }, scoring: '', tip: '' },
];
export const adventure = (id: string): Adventure | undefined => ADVENTURES.find((a) => a.id === id);
export const playable = (): Adventure[] => ADVENTURES.filter((a) => a.playable);

// ---------- mission sets ----------
export const SET_SIZE = 3;
/** a new set this long after the previous one was issued (and once it's finished) */
export const CYCLE_MS = 5 * 60 * 60 * 1000;

export interface SetEntry { id: string; variant: string | null }
export interface MissionSet { key: string; issuedAt: number; seed: number; n: number; list: SetEntry[] }
export interface DoneEntry { place: number; coins: number; xp: number; at: number; score?: number }
export interface AdvState {
  /** the current set of missions (null until the first visit issues one) */
  set: MissionSet | null;
  /** rewards collected in the current set: adventure id → result */
  done: Record<string, DoneEntry>;
  /** how many whole sets have been finished */
  setsDone: number;
  /** total plays per adventure (all time) */
  plays: Record<string, number>;
  /** best finishing place / tier per adventure (1 = won), best times (ms) and best scores */
  best: Record<string, number>;
  bestTime: Record<string, number>;
  bestScore: Record<string, number>;
  /** wood from the forest adventure (kept for the expansion mission) */
  wood: number;
  /** rewards the server hasn't confirmed yet (cloud accounts, offline at the time): setKey:id:place[:score] */
  pending: string[];
  /** recent results, newest last (kept short) */
  log: { day: string; id: string; place: number; coins: number }[];
  /** the old one-a-day field, kept so older saves read cleanly */
  day: string;
}

export const freshAdventures = (now = Date.now()): AdvState => ({ set: null, done: {}, setsDone: 0, plays: {}, best: {}, bestTime: {}, bestScore: {}, wood: 0, pending: [], log: [], day: dayKey(now) });

/** The local calendar day (for the log). */
export function dayKey(now = Date.now()): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function countdown(ms: number): string {
  const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : m > 0 ? `${m} min` : 'less than a minute';
}

/** The adventures state (created on the first look; nothing else is touched). */
export function adventures(s: LandState, _now = Date.now()): AdvState {
  return (s.adventures ??= freshAdventures(_now));
}

/** A small deterministic random source for picking sets (the same seed → the same set on every device). */
const rng = (seed: number) => { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

/**
 * Pick a set of `SET_SIZE` DIFFERENT playable adventures from a seed. `prev` (the previous set's ids) are avoided where the
 * library is big enough, so two sets in a row never look the same; now and then an adventure comes with its twist.
 */
export function pickSet(seed: number, prev: string[] = [], pool: Adventure[] = playable()): SetEntry[] {
  const r = rng(seed);
  const size = Math.min(SET_SIZE, pool.length);
  // avoid last time's picks when there is room to (keep at least `size` candidates)
  let cands = pool.filter((a) => !prev.includes(a.id));
  if (cands.length < size) cands = pool.slice();
  const out: SetEntry[] = [];
  while (out.length < size && cands.length) {
    const i = Math.floor(r() * cands.length);
    const a = cands.splice(i, 1)[0];
    const keys = a.variants ? Object.keys(a.variants) : [];
    const variant = keys.length && r() < 0.3 ? keys[Math.floor(r() * keys.length)] : null;
    out.push({ id: a.id, variant });
  }
  return out;
}

const seedFrom = (now: number, n: number): number => ((Math.floor(now / 1000) * 2654435761) ^ (n * 40503) ^ 0x5bd1e995) >>> 0;

/** Issue a new set now (local accounts; the server does the same for cloud accounts). */
export function issueSet(s: LandState, now = Date.now(), force?: SetEntry[]): MissionSet {
  const a = adventures(s, now);
  const n = (a.set?.n ?? 0) + 1;
  const seed = seedFrom(now, n);
  const list = force && force.length ? force : pickSet(seed, a.set?.list.map((e) => e.id) ?? []);
  a.set = { key: String(now), issuedAt: now, seed, n, list };
  a.done = {};
  return a.set;
}

export const allDone = (a: AdvState): boolean => !!a.set && a.set.list.every((e) => !!a.done[e.id]);

/** The set to play now: the current one, or a fresh one when the last is finished and the five hours are up. */
export function currentSet(s: LandState, now = Date.now(), force?: SetEntry[]): MissionSet {
  const a = adventures(s, now);
  if (!a.set) return issueSet(s, now, force);
  if (allDone(a) && now >= a.set.issuedAt + CYCLE_MS) { a.setsDone++; return issueSet(s, now, force); }
  return a.set;
}

export interface SetStatus { set: MissionSet; doneCount: number; total: number; allDone: boolean; nextAt: number; unlockIn: number; ready: boolean }
/** Where the player is in the current set and when the next one comes. */
export function setStatus(s: LandState, now = Date.now()): SetStatus {
  const set = currentSet(s, now);
  const a = adventures(s, now);
  const doneCount = set.list.filter((e) => !!a.done[e.id]).length;
  const all = doneCount >= set.list.length;
  const nextAt = set.issuedAt + CYCLE_MS;
  return { set, doneCount, total: set.list.length, allDone: all, nextAt, unlockIn: Math.max(0, nextAt - now), ready: all && now >= nextAt };
}

/** Adopt the set the server issued (cloud accounts): its list, clock and what's already done on other devices. */
export function adoptSet(s: LandState, r: { set: MissionSet; done: Record<string, DoneEntry> }, now = Date.now()): void {
  const a = adventures(s, now);
  if (a.set && a.set.key !== r.set.key && allDone(a)) a.setsDone++;
  a.set = { key: String(r.set.key), issuedAt: Number(r.set.issuedAt), seed: Number(r.set.seed), n: Number(r.set.n) || 1, list: r.set.list.map((e) => ({ id: String(e.id), variant: e.variant ? String(e.variant) : null })) };
  a.done = { ...(r.done ?? {}) };
}

export interface TodaysAdventure { adventure: Adventure; variant: Variant | null }
export interface Today { day: string; special: boolean; title: string; list: TodaysAdventure[] }
/** The current set in the shape the screens use (the name stayed from the one-a-day days). */
export function today(s: LandState, now = Date.now()): Today {
  const set = currentSet(s, now);
  const list = set.list.map((e) => { const adventure = ADVENTURES.find((a) => a.id === e.id)!; return { adventure, variant: e.variant ? adventure.variants?.[e.variant] ?? null : null }; }).filter((x) => !!x.adventure);
  return { day: set.key, special: false, title: 'Your missions', list };
}
/** The headline mission (the first one not yet done, else the first). */
export function featured(s: LandState, now = Date.now()): Adventure { const t = today(s, now); const a = adventures(s, now); return (t.list.find((x) => !a.done[x.adventure.id]) ?? t.list[0]).adventure; }
/** Is this adventure part of the current set (so a run pays)? */
export const inSet = (s: LandState, id: string, now = Date.now()): boolean => currentSet(s, now).list.some((e) => e.id === id);
export const variantOf = (s: LandState, id: string, now = Date.now()): Variant | null => { const e = currentSet(s, now).list.find((x) => x.id === id); const adv = e && adventure(e.id); return e && adv && e.variant ? adv.variants?.[e.variant] ?? null : null; };
/** The layout seed for a mission in this set (every device sees the same garden / forest). */
export const setSeed = (s: LandState, id: string, now = Date.now()): number => { const set = currentSet(s, now); const i = Math.max(0, set.list.findIndex((e) => e.id === id)); return (set.seed + i * 7919 + 13) >>> 0; };

export interface Mission { adventure: Adventure; variant: Variant | null; special: boolean; day: string; done: DoneEntry | null; resetsIn: number; plays: number; best: number | null; bestTime: number | null; bestScore: number | null }
/** The mission card data for an adventure (the headline one by default). `resetsIn` = time to the next set. */
export function mission(s: LandState, now = Date.now(), id?: string): Mission {
  const st = setStatus(s, now);
  const a = adventures(s, now);
  const adv = (id && adventure(id)) || featured(s, now);
  return { adventure: adv, variant: variantOf(s, adv.id, now), special: false, day: st.set.key, done: a.done[adv.id] ?? null, resetsIn: st.unlockIn, plays: a.plays[adv.id] ?? 0, best: a.best[adv.id] ?? null, bestTime: a.bestTime[adv.id] ?? null, bestScore: a.bestScore[adv.id] ?? null };
}

/** Which present resident offers an adventure (the first with a fitting personality, else the first free Fuzzy). */
export function hostIndex(adv: Adventure, residents: number, taken: number[] = []): number {
  for (let i = 0; i < residents; i++) if (adv.hosts.includes(character(i).role) && !taken.includes(i)) return i;
  for (let i = 0; i < residents; i++) if (!taken.includes(i)) return i;
  return 0;
}
/** The set's hosts: adventure id → resident index, a different Fuzzy for each mission where the town has enough of them. */
export function hosts(s: LandState, residents: number, now = Date.now()): Record<string, number> {
  const out: Record<string, number> = {};
  const taken: number[] = [];
  for (const { adventure: adv } of today(s, now).list) { const i = hostIndex(adv, residents, taken); out[adv.id] = i; taken.push(i); }
  return out;
}
/** The adventure a resident offers right now (null = none, they just chat). */
export function hostedBy(s: LandState, index: number, residents: number, now = Date.now()): Adventure | null {
  const h = hosts(s, residents, now);
  for (const id in h) if (h[id] === index) return adventure(id) ?? null;
  return null;
}

export interface Result { id: string; place: number; timeMs?: number; score?: number }
export interface Payout { coins: number; xp: number; first: boolean; levelUps: number[]; practice: boolean }

/**
 * A finished run: counts the play and the records, and pays the reward ONCE per mission per set (a run of something that
 * isn't in the set, or is already done, is practice and pays nothing — the screens don't offer those any more).
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
  if (r.score !== undefined && (a.bestScore[r.id] === undefined || r.score > a.bestScore[r.id])) a.bestScore[r.id] = r.score;
  const practice = !!a.done[r.id] || !inSet(s, r.id, now);
  const coins = practice ? 0 : adv.coins[Math.min(r.place, adv.coins.length) - 1];
  const xp = practice ? 0 : adv.xp;
  a.log = [...a.log, { day: dayKey(now), id: r.id, place: r.place, coins }].slice(-30);
  if (practice) return { coins: 0, xp: 0, first: false, levelUps: [], practice: true };
  a.done[r.id] = { place: r.place, coins, xp, at: now, ...(r.score !== undefined ? { score: r.score } : {}) };
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
  const raw = a as Partial<AdvState> & { set?: unknown };
  const set = raw.set && typeof raw.set === 'object' && Array.isArray((raw.set as MissionSet).list) && (raw.set as MissionSet).list.length ? raw.set as MissionSet : null;
  return { ...f, ...a, set, done: set ? { ...(a.done ?? {}) } : {}, setsDone: Number(a.setsDone) || 0, plays: { ...(a.plays ?? {}) }, best: { ...(a.best ?? {}) }, bestTime: { ...(a.bestTime ?? {}) }, bestScore: { ...(a.bestScore ?? {}) }, pending: [...(a.pending ?? [])].filter((k) => typeof k === 'string' && k.split(':').length >= 3 && !/^\d{4}-\d{2}-\d{2}$/.test(k.split(':')[0])), log: [...(a.log ?? [])].slice(-30), wood: Number(a.wood) || 0, day: typeof a.day === 'string' ? a.day : f.day };
};
