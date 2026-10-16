/**
 * Fuzzy Crossing cosmetics — things that make ANY Fuzzy look and feel special without changing the game:
 *  - trail: what drifts behind you as you hop
 *  - jump: the little effect where you land
 *  - celebration: what you do when you fill a nest / win a level
 *  - extra: an outfit piece you can add to any Fuzzy (scarf, shades, cape…)
 * DATA ONLY. Drawn by character3d.ts / the game view.
 */
import type { EventId, Rarity } from './characters';

export type CosmeticSlot = 'trail' | 'jump' | 'celebration' | 'extra';
export const SLOTS: CosmeticSlot[] = ['trail', 'jump', 'celebration', 'extra'];
export const SLOT_NAME: Record<CosmeticSlot, string> = { trail: 'Trail', jump: 'Jump effect', celebration: 'Celebration', extra: 'Outfit piece' };

export type CosmeticUnlock =
  | { kind: 'free' }
  | { kind: 'pass'; level: number }
  | { kind: 'shop'; slot: 'permanent' | 'daily' | 'weekly'; price: number }
  | { kind: 'season'; event: EventId; price: number }
  | { kind: 'weekly'; top: number }
  | { kind: 'achievement'; id: string };

export interface CosmeticDef { id: string; slot: CosmeticSlot; name: string; rarity: Rarity; icon: string; blurb: string; unlock: CosmeticUnlock }

const c = (slot: CosmeticSlot, id: string, name: string, rarity: Rarity, icon: string, blurb: string, unlock: CosmeticUnlock): CosmeticDef => ({ id, slot, name, rarity, icon, blurb, unlock });
const shop = (price: number, slot: 'permanent' | 'daily' | 'weekly' = 'permanent'): CosmeticUnlock => ({ kind: 'shop', slot, price });
const pass = (level: number): CosmeticUnlock => ({ kind: 'pass', level });
const season = (event: EventId, price: number): CosmeticUnlock => ({ kind: 'season', event, price });

export const COSMETICS: CosmeticDef[] = [
  // trails (10)
  c('trail', 'trail-none', 'No trail', 'common', '·', 'Clean and simple.', { kind: 'free' }),
  c('trail', 'trail-sparkle', 'Sparkle trail', 'common', '✨', 'Little stars follow every hop.', pass(2)),
  c('trail', 'trail-hearts', 'Heart trail', 'common', '💖', 'Spreads the love.', shop(200)),
  c('trail', 'trail-leaves', 'Leaf trail', 'common', '🍃', 'A breeze of green.', shop(200)),
  c('trail', 'trail-bubbles', 'Bubble trail', 'rare', '🫧', 'Pop pop pop!', pass(14)),
  c('trail', 'trail-petals', 'Petal trail', 'rare', '🌸', 'Soft pink petals.', season('easter', 350)),
  c('trail', 'trail-snow', 'Snowflake trail', 'rare', '❄️', 'Winter wherever you hop.', season('winter', 350)),
  c('trail', 'trail-rainbow', 'Rainbow trail', 'epic', '🌈', 'A ribbon of colour.', shop(900, 'weekly')),
  c('trail', 'trail-fire', 'Ember trail', 'epic', '🔥', 'Warm embers dance behind you.', pass(38)),
  c('trail', 'trail-neon', 'Neon trail', 'legendary', '💠', 'Glowing light lines.', { kind: 'weekly', top: 25 }),
  // landing effects (8)
  c('jump', 'jump-puff', 'Cloud puff', 'common', '☁️', 'A soft puff on landing.', { kind: 'free' }),
  c('jump', 'jump-pop', 'Sparkle pop', 'common', '🎇', 'Sparkles on every landing.', pass(4)),
  c('jump', 'jump-ripple', 'Ripple', 'rare', '💧', 'Rings spread from your feet.', shop(300)),
  c('jump', 'jump-star', 'Star landing', 'rare', '⭐', 'Land like a star.', pass(18)),
  c('jump', 'jump-petal', 'Petal burst', 'rare', '🌼', 'A burst of petals.', season('summer', 400)),
  c('jump', 'jump-shock', 'Shockwave', 'epic', '💥', 'A ring of energy.', shop(1100, 'weekly')),
  c('jump', 'jump-glow', 'Glow landing', 'epic', '🌟', 'Lights up the road.', pass(32)),
  c('jump', 'jump-bolt', 'Lightning strike', 'legendary', '⚡', 'Thunder on every landing.', { kind: 'achievement', id: 'gold-250' }),
  // celebrations (8)
  c('celebration', 'cele-spin', 'Happy spin', 'common', '🌀', 'A joyful twirl.', { kind: 'free' }),
  c('celebration', 'cele-dance', 'Little dance', 'common', '💃', 'Shake those fluffy hips.', pass(6)),
  c('celebration', 'cele-heart', 'Heart pop', 'rare', '💕', 'Hearts burst out!', shop(450)),
  c('celebration', 'cele-flip', 'Backflip', 'rare', '🤸', 'A perfect backflip.', pass(20)),
  c('celebration', 'cele-confetti', 'Confetti cannon', 'rare', '🎉', 'Party time!', season('winter', 500)),
  c('celebration', 'cele-fireworks', 'Fireworks', 'epic', '🎆', 'Fireworks overhead.', shop(1400, 'weekly')),
  c('celebration', 'cele-moon', 'Moonwalk', 'epic', '🌙', 'Smooth as can be.', pass(44)),
  c('celebration', 'cele-champion', 'Champion pose', 'legendary', '🏆', 'For the very best.', { kind: 'weekly', top: 10 }),
  // outfit pieces that fit any Fuzzy (8)
  c('extra', 'extra-none', 'No extra', 'common', '·', 'Just the Fuzzy.', { kind: 'free' }),
  c('extra', 'extra-bowtie', 'Bow tie', 'common', '🎀', 'Dapper.', shop(150)),
  c('extra', 'extra-shades', 'Cool shades', 'common', '😎', 'Too cool for traffic.', shop(200)),
  c('extra', 'extra-scarf', 'Cosy scarf', 'common', '🧣', 'A warm striped scarf.', pass(9)),
  c('extra', 'extra-flower', 'Flower', 'rare', '🌺', 'A pretty flower behind the ear.', season('easter', 300)),
  c('extra', 'extra-backpack', 'Tiny backpack', 'rare', '🎒', 'For adventures.', pass(26)),
  c('extra', 'extra-cape', 'Hero cape', 'epic', '🦸', 'Flaps in the wind.', shop(1000, 'weekly')),
  c('extra', 'extra-wings', 'Angel wings', 'epic', '🪽', 'Little feathered wings.', pass(47)),
];

export const COSMETIC_BY_ID: Record<string, CosmeticDef> = Object.fromEntries(COSMETICS.map((x) => [x.id, x]));
export const DEFAULT_COSMETIC: Record<CosmeticSlot, string> = { trail: 'trail-none', jump: 'jump-puff', celebration: 'cele-spin', extra: 'extra-none' };
export const cosmeticsOf = (slot: CosmeticSlot): CosmeticDef[] => COSMETICS.filter((x) => x.slot === slot);
