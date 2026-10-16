/**
 * Fuzzy Shop purchases. One door: buy(id). Crossing Coins only — never the site's Fuzzies, never Land coins, never real money.
 * Atomic: coins are taken, the item is granted (which also queues its unlock celebration and puts it in the Locker), the purchase is
 * logged; if the grant fails the coins go straight back (and don't count as "earned").
 */
import { CHARACTER_BY_ID } from './characters';
import { COSMETIC_BY_ID } from './cosmetics';
import { coins, equipCharacter, equipCosmetic, grantCharacter, grantCosmetic, hasCharacter, hasCosmetic, mutate, save, spendCoins } from './store';
import { listingFor, now as shopNow, type ShopItem } from './shopData';

export type BuyFailure = 'unknown' | 'owned' | 'not-for-sale' | 'poor' | 'error';
export type BuyResult = { ok: true; id: string; type: 'character' | 'cosmetic'; price: number; balance: number } | { ok: false; code: BuyFailure; reason: string; short?: number };

export const owns = (it: { id: string; type: 'character' | 'cosmetic' }): boolean => (it.type === 'character' ? hasCharacter(it.id) : hasCosmetic(it.id));
export const isEquipped = (it: { id: string; type: 'character' | 'cosmetic' }): boolean => {
  const s = save();
  if (it.type === 'character') return s.equipped.character === it.id;
  const slot = COSMETIC_BY_ID[it.id]?.slot;
  return !!slot && s.equipped[slot] === it.id;
};

/** What a listing looks like to this player right now. */
export type ItemState = 'equipped' | 'owned' | 'buy' | 'poor';
export function stateOf(it: ShopItem): ItemState {
  if (owns(it)) return isEquipped(it) ? 'equipped' : 'owned';
  return coins() >= it.price ? 'buy' : 'poor';
}

/** the one place a purchase becomes an unlock (replaceable so tests can check the refund path) */
export const hooks = { grant: (type: 'character' | 'cosmetic', id: string): boolean => (type === 'character' ? grantCharacter(id, 'shop') : grantCosmetic(id, 'shop')) };

export function buy(id: string, at: number = shopNow()): BuyResult {
  const type = CHARACTER_BY_ID[id] ? 'character' : COSMETIC_BY_ID[id] ? 'cosmetic' : null;
  if (!type) return { ok: false, code: 'unknown', reason: "That item doesn't exist." };
  if (owns({ id, type })) return { ok: false, code: 'owned', reason: 'You already have this one.' };
  const listing = listingFor(id, at);
  if (!listing) return { ok: false, code: 'not-for-sale', reason: "It isn't in the shop right now." };
  if (coins() < listing.price) return { ok: false, code: 'poor', reason: `You need ${(listing.price - coins()).toLocaleString()} more coins.`, short: listing.price - coins() };
  if (!spendCoins(listing.price)) return { ok: false, code: 'poor', reason: 'Not enough coins.', short: listing.price - coins() };
  let granted = false;
  try { granted = hooks.grant(type, id); } catch (e) { console.error(e); }
  if (!granted) {
    // give the coins back (they were never "earned", so they don't count towards earning achievements)
    mutate((c) => { c.coins += listing.price; c.stats.coinsSpent = Math.max(0, c.stats.coinsSpent - listing.price); }, 'coins', { amount: listing.price });
    return { ok: false, code: 'error', reason: "That didn't work and your coins are safe. Please try again." };
  }
  mutate((c) => { c.bought[id] = Date.now(); }, 'bought', { id });
  return { ok: true, id, type, price: listing.price, balance: coins() };
}

/** wear it now (Fuzzies become your game Fuzzy; styles go into their slot) */
export function equipItem(it: { id: string; type: 'character' | 'cosmetic' }): boolean { return it.type === 'character' ? equipCharacter(it.id) : equipCosmetic(it.id); }
