/**
 * Fuzzy Crossing's own save + economy. Lives in `account.crossing` (so it saves on this device, syncs to the cloud account and merges
 * between devices like everything else) and is completely separate from Fuzzies Land and from the site's Fuzzies balance:
 *   coins  — "Crossing Coins", earned only in Fuzzy Crossing, spent only in the Fuzzy Shop
 *   xp     — Fuzzy Pass progress
 * Every unlock goes through grantCharacter()/grantCosmetic(), which also queues the celebration (`pending`) so the Locker, the Pass,
 * the Shop and the game over screen all agree. All functions are plain and synchronous; the UI listens for the `fz:crossing` event.
 */
import { accounts } from '../core/account';
import { todayKey } from '../core/util';
import { CHARACTERS, CHARACTER_BY_ID, type CharacterDef } from './characters';
import { COSMETIC_BY_ID } from './cosmetics';
import { PASS_TRACK, passLevel, XP } from './pass';

import type { CrossingSave } from './save';
export type { CrossingSave, CrossingStats } from './save';
export { freshCrossing, migrateCrossing } from './save';

// ---------- access ----------
const acct = () => accounts.current!;
export const save = (): CrossingSave => acct().crossing;
const emit = (kind: string, detail: Record<string, unknown> = {}) => { try { dispatchEvent(new CustomEvent('fz:crossing', { detail: { kind, ...detail } })); } catch { /* no window */ } };
function mutate(fn: (c: CrossingSave) => void, kind = 'change', detail: Record<string, unknown> = {}): void {
  accounts.update((a) => { fn(a.crossing); if (a.crossing.equipped.character) a.settings.skin = legacySkinOf(a.crossing.equipped.character); });
  emit(kind, detail);
}
/** the legacy `settings.skin` id the old game code reads (kept in step with the equipped character) */
const legacySkinOf = (id: string): string => CHARACTER_BY_ID[id]?.legacy ?? 'classic';

export const hasCharacter = (id: string): boolean => save().owned.includes(id);
export const hasCosmetic = (id: string): boolean => save().ownedCosmetics.includes(id);
export const coins = (): number => save().coins;
export const passInfo = () => passLevel(save().xp);
export const ownedCount = (): number => save().owned.length;

// ---------- economy ----------
export function addCoins(n: number): void {
  n = Math.floor(n);
  if (n <= 0) return;
  mutate((c) => { c.coins += n; c.coinsEarned += n; }, 'coins', { amount: n });
  evaluate();
}
/** false (and nothing changes) when there isn't enough */
export function spendCoins(n: number): boolean {
  n = Math.floor(n);
  if (n < 0 || coins() < n) return false;
  mutate((c) => { c.coins -= n; c.stats.coinsSpent += n; }, 'coins', { amount: -n });
  return true;
}
/** adds XP; returns how many pass levels it just reached (rewards still have to be claimed) */
export function addXp(n: number): number {
  n = Math.floor(n);
  if (n <= 0) return 0;
  const before = passInfo().level;
  mutate((c) => { c.xp += n; }, 'xp', { amount: n });
  const gained = passInfo().level - before;
  if (gained > 0) emit('passLevel', { level: passInfo().level, gained });
  return gained;
}

// ---------- unlocking (one door for the Pass, the Shop, achievements, worlds, events…) ----------
export function grantCharacter(id: string, source: string): boolean {
  if (!CHARACTER_BY_ID[id] || hasCharacter(id)) return false;
  mutate((c) => { c.owned.push(id); c.pending.push(`char:${id}`); }, 'unlock', { id, type: 'character', source });
  evaluate(); // the 45-Fuzzy collection achievement may just have been completed
  return true;
}
export function grantCosmetic(id: string, source: string): boolean {
  if (!COSMETIC_BY_ID[id] || hasCosmetic(id)) return false;
  mutate((c) => { c.ownedCosmetics.push(id); c.pending.push(`cos:${id}`); }, 'unlock', { id, type: 'cosmetic', source });
  return true;
}
/** the next celebration to show (and remove it from the queue) */
export function takePending(): { type: 'character' | 'cosmetic'; id: string } | null {
  const p = save().pending[0];
  if (!p) return null;
  mutate((c) => { c.pending.shift(); }, 'pending');
  const [t, id] = p.split(':');
  return { type: t === 'char' ? 'character' : 'cosmetic', id };
}
export const pendingCount = (): number => save().pending.length;
export function markSeen(id: string): void { if (!save().seen.includes(id)) mutate((c) => { c.seen.push(id); }, 'seen'); }
export const isNew = (id: string): boolean => !save().seen.includes(id);

export function equipCharacter(id: string): boolean {
  if (!hasCharacter(id)) return false;
  mutate((c) => { c.equipped.character = id; if (!c.stats.distinctPlayed.includes(id)) c.stats.distinctPlayed.push(id); }, 'equip', { id });
  return true;
}
export function equipCosmetic(id: string): boolean {
  const d = COSMETIC_BY_ID[id];
  if (!d || !hasCosmetic(id)) return false;
  mutate((c) => { c.equipped[d.slot] = id; }, 'equip', { id });
  return true;
}
export const equippedCharacter = (): CharacterDef => CHARACTER_BY_ID[save().equipped.character] ?? CHARACTERS[0];

// ---------- the Fuzzy Pass ----------
export const passClaimable = (): number[] => { const lv = passInfo().level; return PASS_TRACK.filter((r) => r.level <= lv && !save().passClaimed.includes(r.level)).map((r) => r.level); };
export function claimPass(level: number): boolean {
  const r = PASS_TRACK[level - 1];
  if (!r || level > passInfo().level || save().passClaimed.includes(level)) return false;
  mutate((c) => { c.passClaimed.push(level); }, 'passClaim', { level });
  if (r.coins) addCoins(r.coins);
  if (r.character) grantCharacter(r.character, `pass-${level}`);
  if (r.cosmetic) grantCosmetic(r.cosmetic, `pass-${level}`);
  return true;
}
export function claimAllPass(): number { let n = 0; for (const l of passClaimable()) if (claimPass(l)) n++; return n; }

// ---------- what happened in a game (the game, Endless and the worlds all call report) ----------
export type CrossingEvent =
  | { kind: 'start'; mode?: 'classic' | 'world' | 'endless' }
  | { kind: 'pickup'; gold: boolean }
  | { kind: 'nest' }
  | { kind: 'hop' }
  | { kind: 'death'; how: 'splash' | 'crash' | 'bonk' | 'time' | 'train' | 'other' }
  | { kind: 'levelClear'; world?: number; level?: number; stars?: number; flawless?: boolean }
  | { kind: 'run'; score: number; level: number; rows?: number; mode?: 'classic' | 'world' | 'endless' };
export const COIN = { pickup: 1, gold: 5, nest: 3, level: 10, runBonusPer100: 2 } as const;
/** coins / XP a single event is worth (the game uses these too to show the running total) */
export function coinsFor(e: CrossingEvent): number {
  switch (e.kind) {
    case 'pickup': return e.gold ? COIN.gold : COIN.pickup;
    case 'nest': return COIN.nest;
    case 'levelClear': return COIN.level;
    case 'run': return Math.floor((e.score / 100) * COIN.runBonusPer100);
    default: return 0;
  }
}
export function xpFor(e: CrossingEvent): number {
  switch (e.kind) {
    case 'pickup': return e.gold ? XP.gold : XP.pickup;
    case 'nest': return XP.nest;
    case 'levelClear': return XP.level;
    case 'run': return Math.floor((e.score / 100) * XP.perHundredScore) + (e.mode === 'endless' ? Math.floor(((e.rows ?? 0) / 10) * XP.endlessPer10Rows) : 0);
    default: return 0;
  }
}
const subscribers = new Set<(e: CrossingEvent) => void>();
/** Missions, achievements and events listen here. */
export const onReport = (fn: (e: CrossingEvent) => void): (() => void) => { subscribers.add(fn); return () => subscribers.delete(fn); };

export function report(e: CrossingEvent): void {
  switch (e.kind) {
    case 'start': mutate((c) => { c.stats.games++; if (!c.stats.distinctPlayed.includes(c.equipped.character)) c.stats.distinctPlayed.push(c.equipped.character); }); break;
    case 'pickup': mutate((c) => { c.stats.pickups++; if (e.gold) c.stats.goldPickups++; }); break;
    case 'nest': mutate((c) => { c.stats.nests++; }); break;
    case 'hop': mutate((c) => { c.stats.crossings++; }); break;
    case 'death': mutate((c) => { c.stats.lives++; if (e.how === 'splash') c.stats.splashes++; if (e.how === 'crash') c.stats.crashes++; }); break;
    case 'levelClear': mutate((c) => {
      c.stats.levelsCleared++;
      if (e.flawless) c.stats.noDeathLevels++;
      if (e.world && e.level) { const k = `${e.world}-${e.level}`; c.worlds[k] = Math.max(c.worlds[k] ?? 0, e.stars ?? 1); }
    }); break;
    case 'run': mutate((c) => { if (e.mode === 'endless') { c.endless.runs++; c.endless.best = Math.max(c.endless.best, e.rows ?? e.score); } }); break;
  }
  const co = coinsFor(e), xp = xpFor(e);
  if (co) addCoins(co);
  if (xp) addXp(xp);
  for (const fn of subscribers) { try { fn(e); } catch (err) { console.error(err); } }
  evaluate();
}

// ---------- achievements that open characters (the full list: achievements.ts) ----------
export const CHARACTER_ACHIEVEMENTS: Record<string, (c: CrossingSave) => boolean> = {
  'nests-100': (c) => c.stats.nests >= 100,
  'lives-100': (c) => c.stats.lives >= 100,
  'games-100': (c) => c.stats.games >= 100,
  'coins-10000': (c) => c.coinsEarned >= 10000,
  'gold-250': (c) => c.stats.goldPickups >= 250,
  'collection-45': (c) => c.owned.length >= 45,
};
export const worldCleared = (c: CrossingSave, w: number): boolean => { for (let l = 1; l <= 15; l++) if (!c.worlds[`${w}-${l}`]) return false; return true; };
let evaluating = false;
/** Grant every character whose requirement is now met (achievements, world clears, endless records, weekly placings, challenges). */
export function evaluate(): void {
  if (evaluating || !accounts.current) return;
  evaluating = true;
  try {
    const c = save();
    for (const def of CHARACTERS) {
      if (c.owned.includes(def.id)) continue;
      const k = def.unlock;
      let ok = false;
      if (k.kind === 'achievement') ok = !!CHARACTER_ACHIEVEMENTS[k.id]?.(c);
      else if (k.kind === 'world') ok = worldCleared(c, k.world);
      else if (k.kind === 'endless') ok = c.endless.best >= k.score;
      else if (k.kind === 'weekly') ok = c.weeklyBest > 0 && c.weeklyBest <= k.top;
      else if (k.kind === 'challenge') ok = k.id === 'flawless-world' && c.flawlessWorlds.length > 0;
      if (ok) grantCharacter(def.id, `unlock-${k.kind}`);
    }
  } finally { evaluating = false; }
}

/** Today's key (daily rotations use the local day, like the rest of the app). */
export const dayKey = (): string => todayKey();
