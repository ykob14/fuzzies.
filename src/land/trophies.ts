/**
 * Trophies — RULES only (no DOM, no Three.js): every playable mini-game has its own trophy, a decoration you earn the first
 * time you finish that game's mission and can place anywhere in your town (it moves, turns and stores like any decor, and
 * can't be sold). Its metal shows your best result in that game — gold (1st / gold tier), silver, bronze, or the raspberry
 * "finisher" cup — and upgrades by itself when you do better. Ownership lives in `land.owned` like the seasonal collectibles
 * (synced with the town); the metal comes from `adventures.best`, so there's nothing new to save. Models: trophyModel.ts.
 * Importing this module registers the trophy items in `ITEMS` (like events.ts does for collectibles).
 */
import { ITEMS, count, type ItemDef, type LandState } from './rules';
import { ADVENTURES, adventures, adventure } from './adventures';

export type Metal = 'gold' | 'silver' | 'bronze' | 'finisher';
export const METALS: Metal[] = ['gold', 'silver', 'bronze', 'finisher'];
export const METAL_NAMES: Record<Metal, string> = { gold: 'Gold', silver: 'Silver', bronze: 'Bronze', finisher: 'Finisher' };
export const COLLECTION = 'trophies';
const PREFIX = 'trophy-';

export const trophyId = (advId: string): string => PREFIX + advId;
export const isTrophy = (itemId: string): boolean => itemId.startsWith(PREFIX);
export const advOf = (itemId: string): string => itemId.slice(PREFIX.length);
/** best place (1 = won / gold tier … 4) → metal */
export const metalFor = (place: number | undefined): Metal => (place === 1 ? 'gold' : place === 2 ? 'silver' : place === 3 ? 'bronze' : 'finisher');

// register one trophy per playable mini-game
for (const a of ADVENTURES) {
  if (!a.playable || ITEMS.some((i) => i.id === trophyId(a.id))) continue;
  const def: ItemDef = {
    id: trophyId(a.id), name: `${a.name} Trophy`, kind: 'decor', w: 1, d: 1, cost: 0, currency: 'coins', level: 1, xp: 0, emoji: '🏆',
    blurb: `Earned by finishing ${a.name}. Its metal shows your best result — and gets shinier when you do better.`, sellable: false, collectible: COLLECTION,
  };
  ITEMS.push(def);
}
export const trophyItems = (): ItemDef[] => ITEMS.filter((i) => isTrophy(i.id));

/** The metal each trophy shows in the town that's open (the model builder reads it; set by `syncTrophies`). */
const shown: Record<string, Metal> = {};
export const trophyMetal = (itemId: string): Metal => shown[advOf(itemId)] ?? 'finisher';
/** Part of a model's cache key: a trophy's model changes when its metal does ('' for everything else). */
export const trophyLook = (itemId: string): string => (isTrophy(itemId) ? trophyMetal(itemId) : '');

export const hasTrophy = (s: LandState, advId: string): boolean => (s.owned?.[trophyId(advId)] ?? 0) > 0;
export const metalOf = (s: LandState, advId: string): Metal => metalFor(adventures(s).best[advId]);
/** How many of the owner's trophies are still waiting to be placed (not on the map, not in storage). */
export const spareTrophies = (s: LandState): number => trophyItems().reduce((n, i) => n + Math.max(0, (s.owned?.[i.id] ?? 0) - count(s, i.id)), 0);

/**
 * Bring the trophies in line with the town's records: every mini-game already played (towns from before trophies existed
 * included) gets its trophy, and every trophy shows the best metal. Returns the ids granted just now.
 */
export function syncTrophies(s: LandState): string[] {
  const a = adventures(s), got: string[] = [];
  for (const t of trophyItems()) {
    const id = advOf(t.id);
    shown[id] = metalFor(a.best[id]);
    if ((a.plays[id] ?? 0) > 0 && !hasTrophy(s, id)) { s.owned ??= {}; s.owned[t.id] = 1; got.push(t.id); }
  }
  return got;
}

export interface Award { id: string; name: string; metal: Metal; isNew: boolean; upgraded: boolean }
/**
 * A mini-game was just finished (call after `adventures.finish`, which keeps the best place): the trophy is yours the
 * first time, and it upgrades when this run beat your best metal.
 */
export function award(s: LandState, advId: string, metalBefore: Metal | null): Award | null {
  const adv = adventure(advId);
  if (!adv || !adv.playable || !ITEMS.some((i) => i.id === trophyId(advId))) return null;
  const isNew = !hasTrophy(s, advId);
  if (isNew) { s.owned ??= {}; s.owned[trophyId(advId)] = 1; }
  const metal = metalOf(s, advId);
  shown[advId] = metal;
  const upgraded = !isNew && metalBefore !== null && METALS.indexOf(metal) < METALS.indexOf(metalBefore);
  return { id: trophyId(advId), name: `${adv.name} Trophy`, metal, isNew, upgraded };
}
