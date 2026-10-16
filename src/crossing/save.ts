/** Fuzzy Crossing's saved data: the shape, the starting values and the migration of older saves. No imports from the app (account.ts uses it). */
import { CHARACTERS, CHARACTER_BY_ID, START_CHARACTER } from './characters';
import { COSMETIC_BY_ID, DEFAULT_COSMETIC, SLOTS, type CosmeticSlot } from './cosmetics';
import { PASS_LEVELS } from './pass';

export interface CrossingStats {
  games: number; crossings: number; pickups: number; goldPickups: number; nests: number; levelsCleared: number;
  lives: number; splashes: number; crashes: number; coinsSpent: number; distinctPlayed: string[]; trainsSurvived: number; noDeathLevels: number; missionsDone: number; rows: number;
}
export interface CrossingSave {
  v: 1;
  coins: number; coinsEarned: number; xp: number;
  owned: string[]; ownedCosmetics: string[];
  equipped: { character: string } & Record<CosmeticSlot, string>;
  passClaimed: number[];
  /** ids the player has looked at (the Locker/Shop show a NEW dot until then) */
  seen: string[];
  /** unlock celebrations waiting to be shown: 'char:<id>' | 'cos:<id>' */
  pending: string[];
  stats: CrossingStats;
  achievements: string[];
  /** `${world}-${level}` → best stars (1–3) */
  worlds: Record<string, number>;
  flawlessWorlds: number[];
  endless: { best: number; runs: number; bestCoins: number };
  /** best weekly leaderboard placement ever (0 = never placed; smaller is better) */
  weeklyBest: number;
  /** daily/weekly missions (see missions.ts) */
  missions: { day: string; ids: string[]; progress: Record<string, number>; claimed: string[]; week: string; weekIds: string[]; weekProgress: Record<string, number>; weekClaimed: string[] };
  /** shop purchases: item id → when */
  bought: Record<string, number>;
  /** seasonal events: `${event}-${year}` → { progress per challenge, claimed } */
  events: Record<string, { progress: Record<string, number>; claimed: string[] }>;
  trophies: string[];
}

export function freshCrossing(): CrossingSave {
  return {
    v: 1, coins: 0, coinsEarned: 0, xp: 0,
    owned: [START_CHARACTER], ownedCosmetics: SLOTS.map((s) => DEFAULT_COSMETIC[s]),
    equipped: { character: START_CHARACTER, ...DEFAULT_COSMETIC },
    passClaimed: [], seen: [], pending: [],
    stats: { games: 0, crossings: 0, pickups: 0, goldPickups: 0, nests: 0, levelsCleared: 0, lives: 0, splashes: 0, crashes: 0, coinsSpent: 0, distinctPlayed: [], trainsSurvived: 0, noDeathLevels: 0, missionsDone: 0, rows: 0 },
    achievements: [], worlds: {}, flawlessWorlds: [], endless: { best: 0, runs: 0, bestCoins: 0 }, weeklyBest: 0,
    missions: { day: '', ids: [], progress: {}, claimed: [], week: '', weekIds: [], weekProgress: {}, weekClaimed: [] },
    bought: {}, events: {}, trophies: [],
  };
}

/** Fill in anything missing in a saved copy; the old Fuzzy Crossing skins a player already unlocked become characters they own. */
export function migrateCrossing(raw: Partial<CrossingSave> | undefined, unlocked: string[] = [], oldSkin = 'classic'): CrossingSave {
  const f = freshCrossing();
  const s: CrossingSave = { ...f, ...(raw ?? {}), stats: { ...f.stats, ...(raw?.stats ?? {}) }, equipped: { ...f.equipped, ...(raw?.equipped ?? {}) }, endless: { ...f.endless, ...(raw?.endless ?? {}) }, missions: { ...f.missions, ...(raw?.missions ?? {}) } };
  const uniq = (xs: string[]) => [...new Set(xs)];
  s.owned = uniq([START_CHARACTER, ...s.owned.filter((id) => CHARACTER_BY_ID[id])]);
  if (!raw) for (const c of CHARACTERS) if (c.legacy && c.legacy !== 'classic' && unlocked.includes(`skin-${c.legacy}`)) s.owned.push(c.id);
  s.owned = uniq(s.owned);
  s.ownedCosmetics = uniq([...SLOTS.map((x) => DEFAULT_COSMETIC[x]), ...s.ownedCosmetics.filter((id) => COSMETIC_BY_ID[id])]);
  if (!raw) { const c = CHARACTERS.find((x) => x.legacy === oldSkin); if (c && s.owned.includes(c.id)) s.equipped.character = c.id; }
  if (!s.owned.includes(s.equipped.character)) s.equipped.character = START_CHARACTER;
  for (const slot of SLOTS) if (!s.ownedCosmetics.includes(s.equipped[slot])) s.equipped[slot] = DEFAULT_COSMETIC[slot];
  s.coins = Math.max(0, Math.floor(s.coins)); s.xp = Math.max(0, Math.floor(s.xp));
  s.passClaimed = uniq(s.passClaimed.map(String)).map(Number).filter((n) => n >= 1 && n <= PASS_LEVELS);
  return s;
}

