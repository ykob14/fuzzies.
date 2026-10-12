/**
 * Fuzzies Land: a Township-style town where the Fuzzies live. RULES ONLY (no drawing) — the 3D view is
 * land/view3d.ts and the screen is ui/screens/land.ts.
 *
 * Build houses for Fuzzies to move in, plant crops on fields, turn them into goods in workshops, fill
 * the Fuzzies' orders for coins and XP, level up to unlock more, and earn real Fuzzies tokens on the way.
 * All timers are wall-clock timestamps, so crops keep growing while the app is closed.
 */

export type Kind = 'house' | 'field' | 'factory' | 'decor' | 'special';
export type Rot = 0 | 1 | 2 | 3;

export interface ItemDef {
  id: string; name: string; kind: Kind; w: number; d: number;
  cost: number; currency: 'coins' | 'fuzzies'; level: number; xp: number;
  pop?: number; recipes?: string[]; blurb: string; emoji: string;
  /** How many you may own at a level (fields and workshops are limited). */
  max?: (level: number) => number;
  /** Seconds of construction before it's ready (keeps going while you're away). */
  build?: number;
  sellable?: boolean;
  /** Has water in it (pond, fountain): keeps a strip of grass between it and any road. */
  water?: boolean;
}

export interface Good {
  id: string; name: string; emoji: string; time: number; xp: number; sell: number; level: number;
  at: 'field' | string; inputs?: Record<string, number>; seed?: number; yield?: number;
}

export interface Placed {
  /** Which way it faces: 0 = front towards +z (the default), then quarter turns. Odd turns swap width and depth. */
  id: number; item: string; x: number; z: number; rot: Rot;
  /** fields: what's growing and when it was planted */
  crop?: { good: string; at: number };
  /** workshops: goods being made, in order; each has its own finish time */
  queue?: { good: string; end: number }[];
  builtAt: number;
  /** Under construction until this time (ms); removed once you finish it. */
  doneAt?: number;
}

export interface Order { id: number; who: string; items: Record<string, number>; coins: number; xp: number; fuzzies: number }

export interface LandState {
  v: 1;
  level: number; xp: number; coins: number;
  size: number; // side of the buildable square, centred on the map
  buildings: Placed[];
  barn: Record<string, number>;
  orders: Order[];
  nextId: number;
  stats: { harvests: number; made: number; orders: number; built: number };
  savedAt: number;
  /** Starter-town layout version (2 = the compact streets). Older towns are tidied up once by migrateLand(). */
  layout?: number;
  /** First-time tutorial progress (land/tutorial.ts); missing = decide from whether the town was played. */
  tutorial?: { status: 'active' | 'done' | 'skipped' | 'off'; step: number; got: string[]; paid: string[] };
}

export const MAP = 30; // the whole island is MAP × MAP tiles; the buildable square grows with expansions
export const SIZES = [14, 18, 22, 26];
export const EXPANSION = [{ cost: 600, level: 3 }, { cost: 2500, level: 6 }, { cost: 8000, level: 10 }];
export const SLOTS = 3; // workshop queue length

export const GOODS: Good[] = [
  // crops (grown on fields)
  { id: 'wheat', name: 'Sunwheat', emoji: '🌾', time: 60, xp: 1, sell: 2, level: 1, at: 'field', seed: 1, yield: 2 },
  { id: 'corn', name: 'Puffcorn', emoji: '🌽', time: 180, xp: 2, sell: 4, level: 2, at: 'field', seed: 3, yield: 2 },
  { id: 'carrot', name: 'Carrots', emoji: '🥕', time: 360, xp: 3, sell: 6, level: 3, at: 'field', seed: 5, yield: 2 },
  { id: 'candy', name: 'Candy cane', emoji: '🍬', time: 600, xp: 4, sell: 9, level: 5, at: 'field', seed: 8, yield: 2 },
  { id: 'cotton', name: 'Fluff cotton', emoji: '☁️', time: 900, xp: 5, sell: 12, level: 7, at: 'field', seed: 10, yield: 2 },
  // bakery
  { id: 'bread', name: 'Bread', emoji: '🍞', time: 120, xp: 4, sell: 12, level: 2, at: 'bakery', inputs: { wheat: 2 } },
  { id: 'cake', name: 'Carrot cake', emoji: '🍰', time: 360, xp: 9, sell: 30, level: 4, at: 'bakery', inputs: { wheat: 1, carrot: 2 } },
  { id: 'cookies', name: 'Cookies', emoji: '🍪', time: 480, xp: 12, sell: 42, level: 6, at: 'bakery', inputs: { wheat: 2, candy: 1 } },
  // popcorn stand
  { id: 'popcorn', name: 'Popcorn', emoji: '🍿', time: 180, xp: 5, sell: 16, level: 3, at: 'popcorn', inputs: { corn: 2 } },
  { id: 'caramel', name: 'Caramel corn', emoji: '🍯', time: 420, xp: 11, sell: 38, level: 5, at: 'popcorn', inputs: { corn: 2, candy: 1 } },
  // weaver
  { id: 'yarn', name: 'Fluff yarn', emoji: '🧶', time: 480, xp: 12, sell: 40, level: 7, at: 'weaver', inputs: { cotton: 2 } },
  { id: 'scarf', name: 'Cozy scarf', emoji: '🧣', time: 720, xp: 20, sell: 90, level: 8, at: 'weaver', inputs: { yarn: 2 } },
];
export const good = (id: string): Good => GOODS.find((g) => g.id === id)!;

export const ITEMS: ItemDef[] = [
  { id: 'gate', name: 'Crossing Gate', kind: 'special', w: 2, d: 2, cost: 0, currency: 'coins', level: 1, xp: 0, emoji: '🌀', blurb: 'Hop over to Fuzzy Crossing', max: () => 1, water: true },
  { id: 'hall', name: 'Town Hall', kind: 'special', w: 3, d: 3, cost: 0, currency: 'coins', level: 1, xp: 0, emoji: '🏛️', blurb: 'The heart of Fuzzies Land', max: () => 1 },
  { id: 'cottage', name: 'Fuzzy Cottage', kind: 'house', w: 2, d: 2, cost: 40, currency: 'coins', level: 1, xp: 6, pop: 6, emoji: '🏠', blurb: '6 Fuzzies move in', build: 30 },
  { id: 'mushroom', name: 'Mushroom House', kind: 'house', w: 2, d: 2, cost: 140, currency: 'coins', level: 3, xp: 14, pop: 10, emoji: '🍄', blurb: '10 Fuzzies move in', build: 120 },
  { id: 'treehouse', name: 'Treehouse', kind: 'house', w: 2, d: 2, cost: 360, currency: 'coins', level: 5, xp: 28, pop: 16, emoji: '🌳', blurb: '16 Fuzzies move in', build: 300 },
  { id: 'villa', name: 'Cloud Villa', kind: 'house', w: 3, d: 3, cost: 900, currency: 'coins', level: 8, xp: 60, pop: 30, emoji: '🏰', blurb: '30 Fuzzies move in', build: 900 },
  { id: 'field', name: 'Field', kind: 'field', w: 1, d: 1, cost: 10, currency: 'coins', level: 1, xp: 1, emoji: '🟫', blurb: 'Grow crops', max: (l) => 6 + l * 2, sellable: true },
  { id: 'bakery', name: 'Bakery', kind: 'factory', w: 2, d: 2, cost: 120, currency: 'coins', level: 2, xp: 15, emoji: '🥖', blurb: 'Bread, cakes & cookies', max: () => 1, recipes: ['bread', 'cake', 'cookies'], build: 60 },
  { id: 'popcorn', name: 'Popcorn Stand', kind: 'factory', w: 2, d: 2, cost: 260, currency: 'coins', level: 3, xp: 20, emoji: '🍿', blurb: 'Popcorn & caramel corn', max: () => 1, recipes: ['popcorn', 'caramel'], build: 180 },
  { id: 'weaver', name: 'Weaver', kind: 'factory', w: 2, d: 2, cost: 700, currency: 'coins', level: 7, xp: 40, emoji: '🧶', blurb: 'Yarn & cozy scarves', max: () => 1, recipes: ['yarn', 'scarf'], build: 480 },
  { id: 'tree', name: 'Fluffy Tree', kind: 'decor', w: 1, d: 1, cost: 15, currency: 'coins', level: 1, xp: 1, emoji: '🌳', blurb: 'Shade for napping', sellable: true },
  { id: 'flowers', name: 'Flower Bed', kind: 'decor', w: 1, d: 1, cost: 25, currency: 'coins', level: 1, xp: 2, emoji: '🌷', blurb: 'Smells like spring', sellable: true },
  { id: 'road', name: 'Road', kind: 'decor', w: 1, d: 1, cost: 5, currency: 'coins', level: 1, xp: 0, emoji: '🛣️', blurb: 'Neat streets for your town', sellable: true },
  { id: 'path', name: 'Stone Path', kind: 'decor', w: 1, d: 1, cost: 4, currency: 'coins', level: 1, xp: 0, emoji: '🪨', blurb: 'Pretty paths', sellable: true },
  { id: 'bench', name: 'Bench', kind: 'decor', w: 1, d: 1, cost: 40, currency: 'coins', level: 2, xp: 3, emoji: '🪑', blurb: 'Sit and chat', sellable: true },
  { id: 'lamp', name: 'Lamp Post', kind: 'decor', w: 1, d: 1, cost: 50, currency: 'coins', level: 3, xp: 3, emoji: '💡', blurb: 'Glows at night', sellable: true },
  { id: 'fountain', name: 'Fountain', kind: 'decor', w: 2, d: 2, cost: 300, currency: 'coins', level: 4, xp: 20, emoji: '⛲', blurb: 'Splishy splashy', sellable: true, build: 90, water: true },
  { id: 'statue', name: 'Golden Fuzzy', kind: 'decor', w: 1, d: 1, cost: 25, currency: 'fuzzies', level: 2, xp: 30, emoji: '🏆', blurb: 'A shiny statue — paid in Fuzzies', sellable: false },
  { id: 'rainbow', name: 'Rainbow Arch', kind: 'decor', w: 2, d: 1, cost: 40, currency: 'fuzzies', level: 4, xp: 50, emoji: '🌈', blurb: 'Magical — paid in Fuzzies', sellable: false },
];
export const item = (id: string): ItemDef => ITEMS.find((i) => i.id === id)!;

export const NAMES = ['Pom', 'Mochi', 'Bun', 'Tuft', 'Fizz', 'Nimbus', 'Puff', 'Lulu', 'Pip', 'Biscuit', 'Wren', 'Toffee', 'Clover', 'Sprout', 'Maple', 'Juno'];

/** XP needed to go from `level` to the next one. */
export const xpFor = (level: number): number => Math.round(20 + level * 22 + level * level * 6);
/** Fuzzies tokens (the app currency) you get for reaching a level. */
export const levelFuzzies = (level: number): number => 4 + level;
export const barnCap = (level: number): number => 60 + level * 15;

export function population(s: LandState): number {
  return s.buildings.reduce((n, b) => n + (b.doneAt ? 0 : item(b.item).pop ?? 0), 0);
}
/** Still being built? */
export const building = (p: Placed): boolean => !!p.doneAt;
export const buildProgress = (p: Placed, now = Date.now()): number => {
  if (!p.doneAt) return 1;
  const total = (item(p.item).build ?? 1) * 1000;
  return Math.min(1, Math.max(0, 1 - (p.doneAt - now) / total));
};
/** Tiles people can walk on. */
export const walkway = (id: string): boolean => id === 'path' || id === 'road';
export const barnUsed = (s: LandState): number => Object.values(s.barn).reduce((a, b) => a + b, 0);
export const count = (s: LandState, id: string): number => s.buildings.filter((b) => b.item === id).length;

// ---------- the starting town ----------
type Spot = [item: string, x: number, z: number];
const O = (MAP - SIZES[0]) / 2; // first buildable tile (8)
/**
 * A tidy starter town (layout 2): a main street with a short side street up to the Town Hall (a T junction,
 * not a giant crossroads), cottages with front gardens facing the street, the Crossing Gate on a stone path,
 * a little farm across the road and a free corner to build on.
 */
const STARTER: Spot[] = [
  ['hall', O + 5, O], ['gate', O + 1, O + 2], ['cottage', O + 8, O + 4], ['cottage', O + 10, O + 4],
  ['field', O + 2, O + 9], ['field', O + 3, O + 9], ['field', O + 2, O + 10], ['field', O + 3, O + 10],
  ['flowers', O + 4, O + 9], ['flowers', O + 7, O + 5],
  ['tree', O, O], ['tree', O + 2, O], ['tree', O + 12, O], ['tree', O + 9, O + 1], ['tree', O, O + 12], ['tree', O + 13, O + 13],
];
const STARTER_ROADS: [number, number][] = [
  ...Array.from({ length: 12 }, (_, i) => [O + 1 + i, O + 7] as [number, number]), // main street
  [O + 6, O + 3], [O + 6, O + 4], [O + 6, O + 5], [O + 6, O + 6],                    // up to the Town Hall
];
const STARTER_PATHS: [number, number][] = [[O + 1, O + 4], [O + 1, O + 5], [O + 1, O + 6], [O + 2, O + 4], [O + 2, O + 5], [O + 2, O + 6]];
/** Where the first version of the starter town put things (for tidying up old towns). */
const OLD_STARTER: Spot[] = [
  ['hall', O + 3, O + 3], ['gate', O, O + 4], ['cottage', O + 7, O + 4], ['cottage', O + 9, O + 4],
  ['field', O + 2, O + 8], ['field', O + 3, O + 8], ['field', O + 2, O + 9], ['field', O + 3, O + 9],
  ['flowers', O + 4, O + 8], ['flowers', O + 7, O + 7],
];
const OLD_ROADS: [number, number][] = [...Array.from({ length: 14 }, (_, k) => [O + k, O + 6] as [number, number]), ...Array.from({ length: 14 }, (_, k) => [O + 6, O + k] as [number, number]).filter(([, z]) => z !== O + 6)];

export function freshLand(now = Date.now()): LandState {
  const s: LandState = {
    v: 1, level: 1, xp: 0, coins: 150, size: SIZES[0], buildings: [], barn: { wheat: 4 }, orders: [], nextId: 1,
    stats: { harvests: 0, made: 0, orders: 0, built: 0 }, savedAt: now, layout: 2,
  };
  const add = (it: string, x: number, z: number, extra: Partial<Placed> = {}) => s.buildings.push({ id: s.nextId++, item: it, x, z, rot: 0, builtAt: 0, ...extra });
  STARTER.forEach(([it, x, z], i) => add(it, x, z, i === 4 ? { crop: { good: 'wheat', at: now - 50_000 } } : {}));
  for (const [x, z] of STARTER_ROADS) add('road', x, z);
  for (const [x, z] of STARTER_PATHS) add('path', x, z);
  refillOrders(s, now);
  return s;
}

/**
 * Towns made with the first starter layout had two long streets crossing the whole land, with the pond
 * touching the road. If those streets are still exactly as they were, swap them for the new compact streets
 * and move the starter buildings that were never moved; everything the player built stays put.
 */
function tidyOldStarter(s: LandState): void {
  const key = (x: number, z: number) => `${x},${z}`;
  const roads = new Set(s.buildings.filter((b) => b.item === 'road').map((b) => key(b.x, b.z)));
  if (roads.size !== OLD_ROADS.length || !OLD_ROADS.every(([x, z]) => roads.has(key(x, z)))) return;
  s.buildings = s.buildings.filter((b) => b.item !== 'road');
  // lift out the starter buildings that are still where the old layout put them
  const lifted: { b: Placed; to: Spot }[] = [];
  OLD_STARTER.forEach(([it, x, z], i) => {
    const b = s.buildings.find((o) => o.item === it && o.x === x && o.z === z && o.rot === 0 && !lifted.some((l) => l.b === o));
    if (b) { lifted.push({ b, to: STARTER[i] }); s.buildings.splice(s.buildings.indexOf(b), 1); }
  });
  for (const { b, to } of lifted) {
    const spot = canPlace(s, b.item, to[1], to[2], 0) ? { x: to[1], z: to[2] } : nearestFree(s, b.item, to[1], to[2]) ?? { x: b.x, z: b.z };
    b.x = spot.x; b.z = spot.z;
    s.buildings.push(b);
  }
  const add = (it: string, x: number, z: number) => { if (canPlace(s, it, x, z, 0)) s.buildings.push({ id: s.nextId++, item: it, x, z, rot: 0, builtAt: 0 }); };
  for (const [x, z] of STARTER_ROADS) add('road', x, z);
  for (const [x, z] of STARTER_PATHS) add('path', x, z);
}

/** The closest spot (spiralling out) where an item fits, or null. */
export function nearestFree(s: LandState, itemId: string, x: number, z: number, rot: Rot = 0, ignore = -1): { x: number; z: number } | null {
  for (let r = 1; r < s.size; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
    if (canPlace(s, itemId, x + dx, z + dz, rot, ignore)) return { x: x + dx, z: z + dz };
  }
  return null;
}

// ---------- placement ----------
export const footprint = (it: ItemDef, rot: number) => (rot & 1 ? { w: it.d, d: it.w } : { w: it.w, d: it.d });
export const bounds = (s: LandState) => { const o = (MAP - s.size) / 2; return { x0: o, z0: o, x1: o + s.size, z1: o + s.size }; };

/** Why an item can't go here ('' = it can). Checks the land's edge, overlaps and the grass strip between water and roads. */
export function placeProblem(s: LandState, itemId: string, x: number, z: number, rot: number, ignore = -1): string {
  const it = item(itemId);
  const f = footprint(it, rot);
  const b = bounds(s);
  if (x < b.x0 || z < b.z0 || x + f.w > b.x1 || z + f.d > b.z1) return 'That’s outside your land.';
  const overlaps = (o: Placed, pad: number) => {
    const of = footprint(item(o.item), o.rot);
    return x < o.x + of.w + pad && x + f.w + pad > o.x && z < o.z + of.d + pad && z + f.d + pad > o.z;
  };
  if (s.buildings.some((o) => o.id !== ignore && overlaps(o, 0))) return 'Something is already there.';
  // a pond or fountain never sits right against a road (and a road never runs along one)
  if (it.water && s.buildings.some((o) => o.id !== ignore && o.item === 'road' && touches(o, x, z, f))) return 'Leave a strip of grass between water and the road.';
  if (itemId === 'road' && s.buildings.some((o) => o.id !== ignore && item(o.item).water && touches({ x, z, w: f.w, d: f.d }, o.x, o.z, footprint(item(o.item), o.rot)))) return 'Leave a strip of grass between the road and the water.';
  return '';
}
/** Do two footprints share an edge (side by side, not just a corner)? */
function touches(a: { x: number; z: number; rot?: number; item?: string; w?: number; d?: number }, x: number, z: number, f: { w: number; d: number }): boolean {
  const af = a.item ? footprint(item(a.item), a.rot ?? 0) : { w: a.w!, d: a.d! };
  const sx = a.x < x + f.w && a.x + af.w > x, sz = a.z < z + f.d && a.z + af.d > z;
  return (sx && (a.z + af.d === z || z + f.d === a.z)) || (sz && (a.x + af.w === x || x + f.w === a.x));
}

export function canPlace(s: LandState, itemId: string, x: number, z: number, rot: number, ignore = -1): boolean {
  return !placeProblem(s, itemId, x, z, rot, ignore);
}

/** Why you can't buy this right now ('' = you can). `fuzzies` is the app-wide token balance. */
export function cantBuy(s: LandState, itemId: string, fuzzies: number): string {
  const it = item(itemId);
  if (s.level < it.level) return `Unlocks at level ${it.level}`;
  if (it.max && count(s, itemId) >= it.max(s.level)) return it.kind === 'field' ? `Max ${it.max(s.level)} fields at this level` : 'You already have one';
  if (it.currency === 'coins' ? s.coins < it.cost : fuzzies < it.cost) return it.currency === 'coins' ? 'Not enough coins' : 'Not enough Fuzzies';
  return '';
}

export interface Gain { xp?: number; coins?: number; levelUps?: number[]; fuzzies?: number }

/** Add XP and handle level-ups. Returns the levels reached (each pays Fuzzies tokens). */
export function addXp(s: LandState, xp: number): number[] {
  s.xp += xp;
  const ups: number[] = [];
  while (s.xp >= xpFor(s.level)) { s.xp -= xpFor(s.level); s.level++; s.coins += 50 + s.level * 10; ups.push(s.level); }
  return ups;
}

export function place(s: LandState, itemId: string, x: number, z: number, rot: Rot, now = Date.now()): Gain {
  const it = item(itemId);
  const why = placeProblem(s, itemId, x, z, rot);
  if (why) throw new Error(why);
  if (it.currency === 'coins') s.coins -= it.cost;
  s.buildings.push({ id: s.nextId++, item: itemId, x, z, rot, builtAt: now, ...(it.kind === 'factory' ? { queue: [] } : {}), ...(it.build ? { doneAt: now + it.build * 1000 } : {}) });
  s.stats.built++;
  // things that take time to build give their XP when you finish them
  return it.build ? {} : { xp: it.xp, levelUps: addXp(s, it.xp) };
}

/** Open a finished construction site: the building is ready to use. */
export function finishBuild(s: LandState, id: number, now = Date.now()): Gain {
  const b = s.buildings.find((o) => o.id === id)!;
  if (!b.doneAt) throw new Error('Already built.');
  if (b.doneAt > now) throw new Error('Still being built.');
  delete b.doneAt;
  b.builtAt = now;
  const it = item(b.item);
  return { xp: it.xp, levelUps: addXp(s, it.xp) };
}

export function move(s: LandState, id: number, x: number, z: number, rot: Rot): void {
  const b = s.buildings.find((o) => o.id === id);
  if (!b) throw new Error('That’s gone.');
  const why = placeProblem(s, b.item, x, z, rot, id);
  if (why) throw new Error(why);
  b.x = x; b.z = z; b.rot = rot;
}

export function sell(s: LandState, id: number): number {
  const i = s.buildings.findIndex((o) => o.id === id);
  const it = item(s.buildings[i].item);
  if (!it.sellable) throw new Error('This one can’t be sold.');
  s.buildings.splice(i, 1);
  const back = it.currency === 'coins' ? Math.floor(it.cost / 2) : 0;
  s.coins += back;
  return back;
}

// ---------- fields ----------
export const cropProgress = (p: Placed, now = Date.now()): number => (p.crop ? Math.min(1, (now - p.crop.at) / (good(p.crop.good).time * 1000)) : 0);

export function plant(s: LandState, id: number, goodId: string, now = Date.now()): void {
  const f = s.buildings.find((o) => o.id === id)!;
  const g = good(goodId);
  if (f.crop) throw new Error('Something is already growing here.');
  if (s.level < g.level) throw new Error(`${g.name} unlocks at level ${g.level}.`);
  if (s.coins < (g.seed ?? 0)) throw new Error('Not enough coins for seeds.');
  s.coins -= g.seed ?? 0;
  f.crop = { good: goodId, at: now };
}

export function harvest(s: LandState, id: number, now = Date.now()): Gain & { good: string; n: number } {
  const f = s.buildings.find((o) => o.id === id)!;
  if (!f.crop || cropProgress(f, now) < 1) throw new Error('Not ready yet.');
  const g = good(f.crop.good);
  const n = g.yield ?? 2;
  if (barnUsed(s) + n > barnCap(s.level)) throw new Error('Your barn is full — fill some orders first.');
  s.barn[g.id] = (s.barn[g.id] ?? 0) + n;
  f.crop = undefined;
  s.stats.harvests++;
  return { good: g.id, n, xp: g.xp, levelUps: addXp(s, g.xp) };
}

// ---------- workshops ----------
export function startMaking(s: LandState, id: number, goodId: string, now = Date.now()): void {
  const w = s.buildings.find((o) => o.id === id)!;
  const g = good(goodId);
  if (w.doneAt) throw new Error('This workshop is still being built.');
  w.queue ??= [];
  if (w.queue.length >= SLOTS) throw new Error('All slots are busy.');
  if (s.level < g.level) throw new Error(`${g.name} unlocks at level ${g.level}.`);
  for (const [k, n] of Object.entries(g.inputs ?? {})) if ((s.barn[k] ?? 0) < n) throw new Error(`You need ${n} × ${good(k).name}.`);
  for (const [k, n] of Object.entries(g.inputs ?? {})) s.barn[k] -= n;
  const last = w.queue.length ? w.queue[w.queue.length - 1].end : now;
  w.queue.push({ good: goodId, end: Math.max(now, last) + g.time * 1000 });
}

export const finished = (w: Placed, now = Date.now()) => (w.queue ?? []).filter((q) => q.end <= now);

export function collect(s: LandState, id: number, now = Date.now()): Gain & { goods: string[] } {
  const w = s.buildings.find((o) => o.id === id)!;
  const done = finished(w, now);
  if (!done.length) throw new Error('Nothing ready yet.');
  const room = barnCap(s.level) - barnUsed(s);
  if (room <= 0) throw new Error('Your barn is full — fill some orders first.');
  const take = done.slice(0, room);
  let xp = 0;
  for (const q of take) { s.barn[q.good] = (s.barn[q.good] ?? 0) + 1; xp += good(q.good).xp; }
  w.queue = w.queue!.filter((q) => !take.includes(q));
  s.stats.made += take.length;
  return { goods: take.map((q) => q.good), xp, levelUps: addXp(s, xp) };
}

// ---------- speed-ups (paid with Fuzzies tokens) ----------
export function rushCost(p: Placed, now = Date.now()): number {
  const left = p.doneAt ? p.doneAt - now : p.crop ? good(p.crop.good).time * 1000 - (now - p.crop.at) : p.queue?.length ? p.queue[0].end - now : 0;
  return left <= 0 ? 0 : Math.max(1, Math.ceil(left / 300_000));
}
export function rush(p: Placed, now = Date.now()): void {
  if (p.doneAt) p.doneAt = now;
  else if (p.crop) p.crop.at = now - good(p.crop.good).time * 1000;
  else if (p.queue?.length) {
    const shift = p.queue[0].end - now;
    for (const q of p.queue) q.end -= shift;
  }
}

// ---------- orders ----------
function rand(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function makeOrder(s: LandState, seed: number): Order {
  const r = rand(seed);
  const avail = GOODS.filter((g) => g.level <= s.level && (g.at === 'field' || s.buildings.some((b) => b.item === g.at && !b.doneAt)));
  const kinds = Math.min(avail.length, 1 + Math.floor(r() * Math.min(3, 1 + s.level / 3)));
  const pool = [...avail];
  const items: Record<string, number> = {};
  let value = 0, xp = 0;
  for (let i = 0; i < kinds; i++) {
    const g = pool.splice(Math.floor(r() * pool.length), 1)[0];
    const n = g.at === 'field' ? 2 + Math.floor(r() * (2 + s.level)) : 1 + Math.floor(r() * 2);
    items[g.id] = n;
    value += g.sell * n;
    xp += g.xp * n;
  }
  return {
    id: s.nextId++, who: NAMES[Math.floor(r() * NAMES.length)], items,
    coins: Math.round(value * 1.6 + 5), xp: Math.round(xp * 1.5 + 2), fuzzies: r() < 0.3 ? 1 + Math.floor(r() * 2) : 0,
  };
}

export function refillOrders(s: LandState, now = Date.now()): void {
  while (s.orders.length < 3) s.orders.push(makeOrder(s, now + s.nextId * 7919));
}

export const canFill = (s: LandState, o: Order): boolean => Object.entries(o.items).every(([k, n]) => (s.barn[k] ?? 0) >= n);

export function fill(s: LandState, orderId: number, now = Date.now()): Gain {
  const o = s.orders.find((x) => x.id === orderId)!;
  if (!canFill(s, o)) throw new Error('You don’t have everything yet.');
  for (const [k, n] of Object.entries(o.items)) s.barn[k] -= n;
  s.coins += o.coins;
  s.orders = s.orders.filter((x) => x.id !== orderId);
  s.stats.orders++;
  refillOrders(s, now);
  return { coins: o.coins, xp: o.xp, fuzzies: o.fuzzies, levelUps: addXp(s, o.xp) };
}

export function skip(s: LandState, orderId: number, now = Date.now()): void {
  s.orders = s.orders.filter((x) => x.id !== orderId);
  refillOrders(s, now);
}

export function sellGood(s: LandState, goodId: string, n: number): number {
  const have = s.barn[goodId] ?? 0;
  const k = Math.min(have, n);
  s.barn[goodId] = have - k;
  const coins = k * good(goodId).sell;
  s.coins += coins;
  return coins;
}

export function expand(s: LandState): void {
  const i = SIZES.indexOf(s.size);
  const e = EXPANSION[i];
  if (!e) throw new Error('Your land is as big as it gets!');
  if (s.level < e.level) throw new Error(`Expanding unlocks at level ${e.level}.`);
  if (s.coins < e.cost) throw new Error('Not enough coins.');
  s.coins -= e.cost;
  s.size = SIZES[i + 1];
}

/** Fill in anything added to the game after a town was first saved. */
export function migrateLand(s: Partial<LandState> | undefined): LandState {
  if (!s || s.v !== 1 || !Array.isArray(s.buildings)) return freshLand();
  const f = freshLand();
  const out = { ...f, ...s, stats: { ...f.stats, ...s.stats }, barn: { ...s.barn }, buildings: s.buildings.map((b) => ({ ...b, rot: ((b.rot ?? 0) & 3) as Rot })) } as LandState;
  if (!s.layout) { out.layout = undefined; tidyOldStarter(out); out.layout = 2; }
  return out;
}

// ---------- coming back ----------
export interface Away { crops: number; goods: number; built: number }
/** What finished while you were away (ready to collect). */
export function awaySummary(s: LandState, now = Date.now()): Away {
  return {
    crops: s.buildings.filter((b) => b.crop && cropProgress(b, now) >= 1).length,
    goods: s.buildings.reduce((n, b) => n + finished(b, now).length, 0),
    built: s.buildings.filter((b) => b.doneAt && b.doneAt <= now).length,
  };
}

/** Harvest every ripe field, collect every workshop and open every finished building (as far as the barn allows). */
export function collectAll(s: LandState, now = Date.now()): Gain & { got: Record<string, number>; built: string[]; full: boolean } {
  const got: Record<string, number> = {};
  const built: string[] = [];
  let xp = 0, full = false;
  const ups: number[] = [];
  for (const b of s.buildings) {
    try {
      if (b.doneAt && b.doneAt <= now) { const g = finishBuild(s, b.id, now); xp += g.xp ?? 0; ups.push(...(g.levelUps ?? [])); built.push(b.item); }
      if (b.crop && cropProgress(b, now) >= 1) { const g = harvest(s, b.id, now); got[g.good] = (got[g.good] ?? 0) + g.n; xp += g.xp ?? 0; ups.push(...(g.levelUps ?? [])); }
      if (finished(b, now).length) { const g = collect(s, b.id, now); for (const k of g.goods) got[k] = (got[k] ?? 0) + 1; xp += g.xp ?? 0; ups.push(...(g.levelUps ?? [])); }
    } catch { full = true; }
  }
  return { got, built, xp, levelUps: ups, full };
}
