/**
 * Fuzzy Crossing seasonal events — THE DATA. Nothing here runs; events.ts reads it, the Events screen draws it, cosmetics.ts adds the
 * keepsakes to the Locker. Dates live in shopData.ts (`eventWindowIn`).
 *
 * To add a new YEAR of an event: add one entry to YEAR_SETS (below) — its keepsakes. The challenges, the pickup item, the look and the
 * event's own Fuzzy stay the same; a year with no entry simply has no keepsakes (everything else still works).
 * To add a new EVENT: add its id to `EventId` (characters.ts), its window to shopData.ts, an entry in EVENTS and a Fuzzy that unlocks with
 * `season('<id>')`.
 *
 * No imports at run time (cosmetics.ts imports this file), only types.
 */
import type { EventId } from './characters';
import type { CosmeticDef, CosmeticSlot } from './cosmetics';

/** what the player does: every challenge counts ONE of these (a plain adding-up counter, so two devices merge correctly) */
export type Metric = 'items' | 'rows' | 'nests' | 'pickups' | 'gold' | 'flawless' | 'levels' | 'runs' | 'scoreRuns';

/** the look of an event: the game board, the weather layer and the pickup. `decor` lists props a view may add. */
export interface EventTheme {
  /** page / card accent colours: [main, deep, light] */
  palette: [string, string, string];
  /** a soft colour wash around the edges of the board (CSS colour) */
  tint: string;
  weather: 'bats' | 'leaves' | 'snow' | 'lights' | 'lanterns' | 'petals' | 'bubbles' | 'confetti';
  decor: string[];
  /** the event pickup that sometimes appears on the board: emoji, a plain word for it and the Fuzzy colours it is drawn with */
  item: { emoji: string; name: string; plural: string; colors: [string, string] };
  /** a big emoji for the hero */
  icon: string;
  blurb: string;
}

export interface ChallengeSpec { id: string; metric: Metric; /** base target (scaled by the event's `scale`) */ base: number; /** scoreRuns: the score a game needs */ min?: number; coins: number; xp: number; tokens?: number }
export interface EventDef {
  id: EventId;
  theme: EventTheme;
  /** 1 = the standard amounts; longer events ask a bit more, shorter ones a bit less */
  scale: number;
  challenges: ChallengeSpec[];
  /** coins + Pass XP for the last challenge ("finish them all"), which also opens the event's own Fuzzy */
  finale: { coins: number; xp: number };
}

const c = (id: string, metric: Metric, base: number, coins: number, xp: number, extra: Partial<ChallengeSpec> = {}): ChallengeSpec => ({ id, metric, base, coins, xp, ...extra });
const items = (base = 14) => c('items', 'items', base, 60, 100, { tokens: 1 });
const rows = (base = 150) => c('rows', 'rows', base, 70, 100, { tokens: 1 });
const nests = (base = 12) => c('nests', 'nests', base, 80, 110, { tokens: 1 });
const pickups = (base = 40) => c('pickups', 'pickups', base, 70, 100, { tokens: 1 });
const gold = (base = 6) => c('gold', 'gold', base, 90, 120, { tokens: 1 });
const flawless = (base = 2) => c('flawless', 'flawless', base, 110, 140, { tokens: 1 });
const levels = (base = 4) => c('levels', 'levels', base, 100, 130, { tokens: 1 });
const runs = (base = 6) => c('runs', 'runs', base, 60, 90, { tokens: 1 });
const score = (min = 1200) => c('score', 'scoreRuns', 1, 120, 150, { min, tokens: 1 });

const T = (palette: [string, string, string], tint: string, weather: EventTheme['weather'], decor: string[], item: EventTheme['item'], icon: string, blurb: string): EventTheme => ({ palette, tint, weather, decor, item, icon, blurb });

export const EVENTS: Record<EventId, EventDef> = {
  halloween: {
    id: 'halloween', scale: 1, finale: { coins: 250, xp: 300 },
    theme: T(['#ff7a1a', '#7a2d00', '#ffd9b3'], '#ff7a1a', 'bats', ['pumpkins', 'cobwebs', 'moon'], { emoji: '🎃', name: 'pumpkin', plural: 'pumpkins', colors: ['#ffb066', '#e0570b'] }, '🎃', 'The crossing goes spooky: pumpkins pop up on the board and friendly bats flutter by.'),
    challenges: [items(), rows(), nests(), pickups(), flawless(), score()],
  },
  thanksgiving: {
    id: 'thanksgiving', scale: 0.9, finale: { coins: 250, xp: 300 },
    theme: T(['#d98a1f', '#6b3d0a', '#ffe3b0'], '#e8a33d', 'leaves', ['hay', 'scarecrow', 'baskets'], { emoji: '🌰', name: 'acorn', plural: 'acorns', colors: ['#e3b27a', '#9b5a20'] }, '🦃', 'Golden leaves drift over the crossing. Gather acorns and say thanks.'),
    challenges: [items(), nests(), runs(), gold(), levels(), score()],
  },
  christmas: {
    id: 'christmas', scale: 1.1, finale: { coins: 300, xp: 350 },
    theme: T(['#d8344a', '#0f6b46', '#ffe0e0'], '#d8344a', 'snow', ['lights', 'tree', 'gifts'], { emoji: '🎁', name: 'present', plural: 'presents', colors: ['#ff8c98', '#c21d35'] }, '🎄', 'Snow falls on the crossing and presents sparkle between the cars.'),
    challenges: [items(), rows(), nests(), gold(), flawless(), runs()],
  },
  hanukkah: {
    id: 'hanukkah', scale: 0.8, finale: { coins: 250, xp: 300 },
    theme: T(['#3d7de0', '#17356e', '#dcebff'], '#3d7de0', 'lights', ['candles', 'dreidels', 'stars'], { emoji: '🕯️', name: 'candle', plural: 'candles', colors: ['#cfe3ff', '#3a6fd0'] }, '🕎', 'Eight nights of warm light. Little flames drift up over the crossing.'),
    challenges: [items(), rows(), pickups(), nests(), levels(), flawless()],
  },
  winter: {
    id: 'winter', scale: 1.2, finale: { coins: 250, xp: 300 },
    theme: T(['#4ba3d9', '#1b4f78', '#e1f2fc'], '#7cc4ee', 'snow', ['snowmen', 'icicles', 'sleds'], { emoji: '❄️', name: 'snowflake', plural: 'snowflakes', colors: ['#f4fbff', '#8fc4e6'] }, '⛄', 'A frosty crossing: snowflakes swirl and the pickups turn icy.'),
    challenges: [items(), rows(), runs(), pickups(), gold(), score()],
  },
  lunar: {
    id: 'lunar', scale: 1.1, finale: { coins: 300, xp: 350 },
    theme: T(['#e02424', '#7a0f0f', '#ffd9d0'], '#e02424', 'lanterns', ['lanterns', 'blossoms', 'dragon'], { emoji: '🏮', name: 'lantern', plural: 'lanterns', colors: ['#ff8a7a', '#c4180f'] }, '🐉', 'Red lanterns glow and rise over the crossing. Good luck to every hop!'),
    challenges: [items(), nests(), gold(), levels(), flawless(), pickups()],
  },
  easter: {
    id: 'easter', scale: 1, finale: { coins: 250, xp: 300 },
    theme: T(['#e2699f', '#7d2f58', '#ffe4f0'], '#f2a6c8', 'petals', ['eggs', 'flowers', 'bunnies'], { emoji: '🥚', name: 'egg', plural: 'eggs', colors: ['#ffe0f0', '#e2699f'] }, '🐰', 'Petals float over the crossing and painted eggs hide between the lanes.'),
    challenges: [items(), rows(), nests(), levels(), runs(), gold()],
  },
  summer: {
    id: 'summer', scale: 1.5, finale: { coins: 300, xp: 350 },
    theme: T(['#10a5c4', '#07586b', '#d6f4fa'], '#ffd166', 'bubbles', ['umbrellas', 'waves', 'shells'], { emoji: '🐚', name: 'shell', plural: 'shells', colors: ['#fff0c9', '#f0a35e'] }, '🏖️', 'Sunny days: bubbles float up and shells wash onto the crossing.'),
    challenges: [items(), rows(), pickups(), nests(), score(1500), flawless()],
  },
};
export const EVENT_IDS = Object.keys(EVENTS) as EventId[];

/** ───────────────────────── keepsakes: new ones every year ───────────────────────── */
/** how a keepsake is earned: reaching a number of event tokens, finishing one challenge, or finishing them all */
export type How = { tokens: number } | { challenge: string } | { finale: true };
export interface Keepsake { key: string; slot: CosmeticSlot; name: string; icon: string; blurb: string; rarity: 'rare' | 'epic'; how: How }
/** the id of a keepsake as a cosmetic (year-keyed, so every year's set has its own ids) */
export const keepsakeId = (event: EventId, year: number, key: string): string => `ev-${event}-${year}-${key}`;
const k = (key: string, slot: CosmeticSlot, name: string, icon: string, blurb: string, rarity: Keepsake['rarity'], how: How): Keepsake => ({ key, slot, name, icon, blurb, rarity, how });

/** `${event}-${year}` → the keepsakes of that occurrence (the year is the one the window STARTS in: Christmas 2026 runs into January 2027) */
export const YEAR_SETS: Record<string, Keepsake[]> = {
  'halloween-2026': [
    k('glow', 'trail', 'Spooky glow trail', '👻', 'A friendly green glow follows every hop.', 'rare', { tokens: 3 }),
    k('candy', 'jump', 'Candy corn bounce', '🍬', 'Candy corn pops out where you land.', 'rare', { tokens: 6 }),
    k('cape', 'extra', 'Midnight cape', '🦇', 'A little cape for the bravest Fuzzy in town.', 'epic', { finale: true }),
  ],
  'thanksgiving-2026': [
    k('acorn', 'trail', 'Acorn trail', '🌰', 'Little acorns tumble behind you.', 'rare', { tokens: 3 }),
    k('feast', 'celebration', 'Harvest feast cheer', '🥧', 'A pie and a happy dance for every nest.', 'rare', { tokens: 6 }),
    k('wreath', 'extra', 'Autumn wreath', '🍁', 'A wreath of golden leaves for your head.', 'epic', { finale: true }),
  ],
  'christmas-2026': [
    k('stars', 'trail', 'Twinkle-light trail', '💫', 'A string of warm lights follows you.', 'rare', { tokens: 3 }),
    k('cocoa', 'celebration', 'Hot cocoa cheers', '☕', 'Cocoa mugs raised for every nest.', 'rare', { tokens: 6 }),
    k('mittens', 'extra', 'Holly mittens', '🧤', 'Cosy red mittens with a sprig of holly.', 'epic', { finale: true }),
  ],
  'hanukkah-2026': [
    k('flame', 'trail', 'Little flame trail', '🕯️', 'Tiny flames glow along your path.', 'rare', { tokens: 3 }),
    k('spin', 'jump', 'Dreidel spin', '🪀', 'A dreidel spins where you land.', 'rare', { tokens: 6 }),
    k('gelt', 'celebration', 'Golden gelt shower', '🪙', 'Gold coins rain down on every win.', 'epic', { finale: true }),
  ],
  'winter-2027': [
    k('frost', 'jump', 'Frost burst', '🧊', 'A ring of frost where you land.', 'rare', { tokens: 3 }),
    k('mittens', 'extra', 'Woolly earmuffs', '🧣', 'Soft earmuffs, very important in January.', 'rare', { tokens: 6 }),
    k('aurora', 'trail', 'Aurora trail', '🌌', 'Northern lights swirl behind you.', 'epic', { finale: true }),
  ],
  'lunar-2027': [
    k('blossom', 'trail', 'Blossom trail', '🌸', 'Plum blossoms drift behind you.', 'rare', { tokens: 3 }),
    k('firecracker', 'jump', 'Firecracker pop', '🧨', 'A cheerful pop of red sparks.', 'rare', { tokens: 6 }),
    k('envelope', 'celebration', 'Lucky envelope shower', '🧧', 'Red envelopes fall for every nest.', 'epic', { finale: true }),
  ],
  'easter-2027': [
    k('eggs', 'trail', 'Painted egg trail', '🥚', 'Painted eggs roll behind you.', 'rare', { tokens: 3 }),
    k('spring', 'jump', 'Spring flower pop', '🌷', 'Tulips bloom where you land.', 'rare', { tokens: 6 }),
    k('basket', 'extra', 'Spring basket', '🧺', 'A little basket full of flowers.', 'epic', { finale: true }),
  ],
  'summer-2027': [
    k('bubbles', 'trail', 'Sea bubble trail', '🫧', 'Bubbles float up behind you.', 'rare', { tokens: 3 }),
    k('splash', 'jump', 'Cannonball splash', '💦', 'A big happy splash where you land.', 'rare', { tokens: 6 }),
    k('shades', 'extra', 'Sunset shades', '🕶️', 'Very cool. Very summer.', 'epic', { finale: true }),
  ],
};

/** every keepsake as a cosmetic definition (cosmetics.ts adds these to the Locker's data) */
export function keepsakeCosmetics(): CosmeticDef[] {
  const out: CosmeticDef[] = [];
  for (const [setKey, list] of Object.entries(YEAR_SETS)) {
    const m = /^([a-z]+)-(\d{4})$/.exec(setKey);
    if (!m) continue;
    const event = m[1] as EventId, year = Number(m[2]);
    for (const x of list) out.push({ id: keepsakeId(event, year, x.key), slot: x.slot, name: x.name, rarity: x.rarity, icon: x.icon, blurb: x.blurb, unlock: { kind: 'event', event, year } });
  }
  return out;
}
