/**
 * Fuzzy Crossing — the 50 collectible Fuzzies. DATA ONLY (no DOM, no three.js): ids, names, rarities, personalities and how each one
 * is unlocked. How they LOOK is described here too (`look`), and drawn by `character3d.ts` — always the owner's round fur ball
 * (never a new body: no arms, feet or eyebrows) dressed with accessories (`parts`) and a fur finish (`fx`).
 *
 * Distribution (checked by tools/crossing/check.ts):  15 common · 12 rare · 10 epic · 8 legendary · 5 mythic.
 * Ways in: start 1 · free Pass 10 · permanent shop 8 · rotating shop 5 · seasonal events 8 · achievements 5 + collection 1 ·
 * world clears 5 · endless 3 · weekly boards 2 · flawless-world challenge 1 · secret 1.  Only 13 of 50 can be bought.
 */
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
export const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'mythic'];
export const RARITY_NAME: Record<Rarity, string> = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary', mythic: 'Mythic' };
/** One colour per rarity (frames, glows, ribbons). */
export const RARITY_COLOR: Record<Rarity, string> = { common: '#8fa3b8', rare: '#3d8bfd', epic: '#a855f7', legendary: '#f59e0b', mythic: '#ff3d81' };

export type EventId = 'halloween' | 'christmas' | 'hanukkah' | 'lunar' | 'easter' | 'summer' | 'thanksgiving' | 'winter';

export type Unlock =
  | { kind: 'start' }
  | { kind: 'pass'; level: number }
  | { kind: 'shop'; slot: 'permanent' | 'rotating'; price: number }
  | { kind: 'season'; event: EventId }
  | { kind: 'achievement'; id: string }
  | { kind: 'world'; world: number }
  | { kind: 'endless'; score: number }
  | { kind: 'weekly'; top: number }
  | { kind: 'challenge'; id: string }
  | { kind: 'secret' };

/** Fur finish applied to the owner's fur texture (see character3d.ts). */
export type FurFx = 'plain' | 'gold' | 'ghost' | 'galaxy' | 'rainbow' | 'neon' | 'frost' | 'fire' | 'prism' | 'cosmic' | 'aurora' | 'eclipse' | 'bone' | 'robot' | 'storm' | 'stripes';
export type JumpStyle = 'bounce' | 'hop' | 'spring' | 'glide' | 'twirl' | 'bunny' | 'stomp' | 'float' | 'zoom';
export type CelebrateStyle = 'spin' | 'backflip' | 'dance' | 'cheer' | 'salute' | 'bow' | 'flex' | 'giggle' | 'magic' | 'roar';
export type Mood = 'happy' | 'cool' | 'sleepy' | 'proud' | 'silly' | 'fierce' | 'calm';

export interface CharacterDef {
  id: string;
  name: string;
  rarity: Rarity;
  /** one line shown on cards */
  tagline: string;
  /** a few words about who they are (showroom) */
  personality: string;
  /** fur colours (light, dark) — hue/saturation/lightness shift of the owner's pink model */
  color: [string, string];
  fx: FurFx;
  /** accessory builders (character3d / accessories.ts), in draw order */
  parts: string[];
  jump: JumpStyle;
  celebrate: CelebrateStyle;
  mood: Mood;
  /** voice pitch multiplier for hops/giggles (0.7 deep … 1.6 tiny) */
  voice: number;
  unlock: Unlock;
  /** one of the owner's 40 Fuzzy Friends pictures used as the card portrait until the 3D picture is ready (optional) */
  friend?: string;
  /** legacy Fuzzy Crossing skin id this character replaces (old saves keep what they unlocked) */
  legacy?: string;
}

const u = {
  start: { kind: 'start' } as Unlock,
  pass: (level: number): Unlock => ({ kind: 'pass', level }),
  shop: (price: number, slot: 'permanent' | 'rotating' = 'permanent'): Unlock => ({ kind: 'shop', slot, price }),
  season: (event: EventId): Unlock => ({ kind: 'season', event }),
  ach: (id: string): Unlock => ({ kind: 'achievement', id }),
  world: (world: number): Unlock => ({ kind: 'world', world }),
  endless: (score: number): Unlock => ({ kind: 'endless', score }),
  weekly: (top: number): Unlock => ({ kind: 'weekly', top }),
  challenge: (id: string): Unlock => ({ kind: 'challenge', id }),
  secret: { kind: 'secret' } as Unlock,
};

export const CHARACTERS: CharacterDef[] = [
  // ───────── Common (15) ─────────
  { id: 'classic', name: 'Classic Fuzzy', rarity: 'common', tagline: 'The original. Never goes out of style.', personality: 'Cheerful, curious, always ready to hop', color: ['#ff86bb', '#b8235f'], fx: 'plain', parts: [], jump: 'bounce', celebrate: 'cheer', mood: 'happy', voice: 1, unlock: u.start, legacy: 'classic', friend: 'f01' },
  { id: 'mint', name: 'Minty', rarity: 'common', tagline: 'Cool as a cucumber, fresh as a leaf.', personality: 'Calm and breezy', color: ['#7dffcf', '#22b5a0'], fx: 'plain', parts: ['mintLeaf'], jump: 'hop', celebrate: 'dance', mood: 'calm', voice: 1.1, unlock: u.shop(250), legacy: 'mint', friend: 'f06' },
  { id: 'sunny', name: 'Sunny', rarity: 'common', tagline: 'Brings the sunshine wherever it lands.', personality: 'Sunny side up, always', color: ['#ffe066', '#ff8c42'], fx: 'plain', parts: ['sunRays'], jump: 'bounce', celebrate: 'cheer', mood: 'happy', voice: 1.15, unlock: u.shop(250), legacy: 'sunny', friend: 'f04' },
  { id: 'ocean', name: 'Ocean', rarity: 'common', tagline: 'Splashes are practically a hobby.', personality: 'Laid-back wave rider', color: ['#7ad7ff', '#3a5bff'], fx: 'plain', parts: ['waveCrest'], jump: 'glide', celebrate: 'dance', mood: 'cool', voice: 0.95, unlock: u.shop(250), legacy: 'ocean', friend: 'f06' },
  { id: 'berry', name: 'Berry', rarity: 'common', tagline: 'Sweet, juicy and a little bit cheeky.', personality: 'Cheeky and sweet', color: ['#ff6b8b', '#b0004f'], fx: 'plain', parts: ['berryStem'], jump: 'bounce', celebrate: 'giggle', mood: 'silly', voice: 1.25, unlock: u.shop(250), legacy: 'berry', friend: 'f02' },
  { id: 'bee', name: 'Bee Fuzzy', rarity: 'common', tagline: 'Buzzes over the road without a worry.', personality: 'Busy, buzzy, friendly', color: ['#ffd23f', '#e09900'], fx: 'stripes', parts: ['beeAntennae', 'beeWings'], jump: 'float', celebrate: 'dance', mood: 'happy', voice: 1.5, unlock: u.pass(3), friend: 'f20' },
  { id: 'sprout', name: 'Sprout', rarity: 'common', tagline: 'Growing on you since level one.', personality: 'Gentle and hopeful', color: ['#9be564', '#3f9b2f'], fx: 'plain', parts: ['sproutLeaves'], jump: 'spring', celebrate: 'cheer', mood: 'calm', voice: 1.3, unlock: u.pass(5), friend: 'f14' },
  { id: 'chef', name: 'Chef Fuzzy', rarity: 'common', tagline: 'Cooks up the perfect crossing.', personality: 'Fussy, passionate, tasty', color: ['#ff7a6b', '#c43d2e'], fx: 'plain', parts: ['chefHat', 'moustache'], jump: 'hop', celebrate: 'bow', mood: 'proud', voice: 0.9, unlock: u.pass(8), friend: 'f37' },
  { id: 'cowboy', name: 'Cowboy Fuzzy', rarity: 'common', tagline: 'Yeehaw! This road ain\'t big enough.', personality: 'Easygoing, bold, a bit dusty', color: ['#ffa24d', '#b4540a'], fx: 'plain', parts: ['cowboyHat', 'bandana'], jump: 'stomp', celebrate: 'salute', mood: 'cool', voice: 0.8, unlock: u.shop(300, 'rotating'), friend: 'f32' },
  { id: 'dj', name: 'DJ Fuzzy', rarity: 'common', tagline: 'Every hop is a beat.', personality: 'Chill, rhythmic, loud on purpose', color: ['#ff5c6a', '#a3122a'], fx: 'plain', parts: ['headphones'], jump: 'bounce', celebrate: 'dance', mood: 'cool', voice: 1, unlock: u.shop(400, 'rotating'), friend: 'f18' },
  { id: 'scholar', name: 'Scholar', rarity: 'common', tagline: 'Has calculated the exact gap between buses.', personality: 'Bookish and brave', color: ['#b794f6', '#6b46c1'], fx: 'plain', parts: ['scholarGlasses', 'mortarboard'], jump: 'hop', celebrate: 'bow', mood: 'proud', voice: 1.05, unlock: u.shop(300), friend: 'f35' },
  { id: 'bunny', name: 'Bunny Fuzzy', rarity: 'common', tagline: 'Born to hop. Literally.', personality: 'Bouncy and sweet', color: ['#ffc2dd', '#d9689a'], fx: 'plain', parts: ['bunnyEars', 'bunnyTail'], jump: 'bunny', celebrate: 'giggle', mood: 'happy', voice: 1.4, unlock: u.season('easter'), friend: 'f17' },
  { id: 'pumpkin', name: 'Pumpkin Fuzzy', rarity: 'common', tagline: 'Spooky on the outside, sweet inside.', personality: 'Mischievous but kind', color: ['#ff9a3d', '#c4560a'], fx: 'plain', parts: ['pumpkinStem', 'pumpkinGrin'], jump: 'bounce', celebrate: 'giggle', mood: 'silly', voice: 1.1, unlock: u.season('halloween'), friend: 'f19' },
  { id: 'snowy', name: 'Snowy', rarity: 'common', tagline: 'Wears a scarf and a carrot nose. Respect.', personality: 'Cosy and cheerful', color: ['#f4fbff', '#a9cbe0'], fx: 'frost', parts: ['scarf', 'carrotNose', 'earmuffs'], jump: 'hop', celebrate: 'dance', mood: 'happy', voice: 1.2, unlock: u.season('winter'), friend: 'f27' },
  { id: 'harvest', name: 'Harvest Fuzzy', rarity: 'common', tagline: 'Brings a basket of thanks to the crossing.', personality: 'Warm and grateful', color: ['#e8a33d', '#8a4b0f'], fx: 'plain', parts: ['wheatCrown', 'leafScarf'], jump: 'hop', celebrate: 'bow', mood: 'calm', voice: 0.95, unlock: u.season('thanksgiving') },

  // ───────── Rare (12) ─────────
  { id: 'galaxy', name: 'Galaxy Fuzzy', rarity: 'rare', tagline: 'Fur full of tiny stars.', personality: 'Dreamy and a little mysterious', color: ['#c77dff', '#240046'], fx: 'galaxy', parts: ['starHalo'], jump: 'float', celebrate: 'magic', mood: 'calm', voice: 1.1, unlock: u.shop(700), legacy: 'galaxy', friend: 'f08' },
  { id: 'pirate', name: 'Pirate Fuzzy', rarity: 'rare', tagline: 'Arrr! No river can stop this crew.', personality: 'Swashbuckling and loud', color: ['#e8574a', '#7a1a14'], fx: 'plain', parts: ['pirateHat', 'eyePatch'], jump: 'stomp', celebrate: 'roar', mood: 'fierce', voice: 0.75, unlock: u.shop(800), friend: 'f02' },
  { id: 'ninja', name: 'Ninja Fuzzy', rarity: 'rare', tagline: 'Dodges traffic without a sound.', personality: 'Silent, swift, secretly silly', color: ['#4b5563', '#111827'], fx: 'plain', parts: ['ninjaHeadband', 'ninjaMask'], jump: 'glide', celebrate: 'flex', mood: 'fierce', voice: 1.2, unlock: u.pass(30) },
  { id: 'viking', name: 'Viking Fuzzy', rarity: 'rare', tagline: 'Rows across rivers for fun.', personality: 'Booming, brave, big-hearted', color: ['#d68a4a', '#7a3e12'], fx: 'plain', parts: ['vikingHelmet', 'beard'], jump: 'stomp', celebrate: 'roar', mood: 'proud', voice: 0.7, unlock: u.shop(900, 'rotating') },
  { id: 'detective', name: 'Detective Fuzzy', rarity: 'rare', tagline: 'Elementary, my dear Fuzzy.', personality: 'Observant and dramatic', color: ['#a38b6d', '#5c4630'], fx: 'plain', parts: ['detectiveHat', 'magnifier'], jump: 'hop', celebrate: 'bow', mood: 'proud', voice: 0.95, unlock: u.shop(800) },
  { id: 'kitty', name: 'Kitty Fuzzy', rarity: 'rare', tagline: 'Always lands on its feet. Paws.', personality: 'Playful and independent', color: ['#ffb78a', '#c06a2b'], fx: 'stripes', parts: ['catEars', 'whiskers', 'catTail'], jump: 'spring', celebrate: 'giggle', mood: 'silly', voice: 1.35, unlock: u.pass(11) },
  { id: 'reindeer', name: 'Reindeer Fuzzy', rarity: 'rare', tagline: 'Its red nose lights the way home.', personality: 'Sparkly and swift', color: ['#b87a4a', '#6b3d16'], fx: 'plain', parts: ['antlers', 'redNose', 'jingleBells'], jump: 'spring', celebrate: 'cheer', mood: 'happy', voice: 1.15, unlock: u.season('christmas'), friend: 'f26' },
  { id: 'lights', name: 'Festival of Lights Fuzzy', rarity: 'rare', tagline: 'Carries a little warm glow.', personality: 'Warm, joyful, glowing', color: ['#8ec5ff', '#2f5fb8'], fx: 'frost', parts: ['lightsCrown'], jump: 'float', celebrate: 'dance', mood: 'calm', voice: 1.1, unlock: u.season('hanukkah') },
  { id: 'surfer', name: 'Surfer Fuzzy', rarity: 'rare', tagline: 'Catches every wave and every gap.', personality: 'Totally relaxed', color: ['#ffd166', '#06a3c7'], fx: 'plain', parts: ['sunnies', 'flowerLei'], jump: 'glide', celebrate: 'dance', mood: 'cool', voice: 1, unlock: u.season('summer'), friend: 'f13' },
  { id: 'wizard', name: 'Wizard Fuzzy', rarity: 'rare', tagline: 'A tiny bit of magic in every hop.', personality: 'Wise, wobbly, wonderful', color: ['#7c5cff', '#2c1a8a'], fx: 'plain', parts: ['wizardHat', 'longBeard'], jump: 'float', celebrate: 'magic', mood: 'proud', voice: 0.85, unlock: u.pass(22), friend: 'f24' },
  { id: 'knight', name: 'Knight Fuzzy', rarity: 'rare', tagline: 'Defender of the nests.', personality: 'Honourable and polite', color: ['#b8c2cc', '#5b6672'], fx: 'robot', parts: ['knightHelmet', 'plume'], jump: 'stomp', celebrate: 'salute', mood: 'proud', voice: 0.8, unlock: u.ach('nests-100') },
  { id: 'pilot', name: 'Pilot Fuzzy', rarity: 'rare', tagline: 'Cleared for take-off, then hop.', personality: 'Confident and calm', color: ['#7fe0ff', '#1f7fa8'], fx: 'plain', parts: ['aviatorCap', 'goggles'], jump: 'glide', celebrate: 'salute', mood: 'cool', voice: 1, unlock: u.pass(15), friend: 'f22' },

  // ───────── Epic (10) ─────────
  { id: 'astronaut', name: 'Astronaut Fuzzy', rarity: 'epic', tagline: 'One small hop for Fuzzy…', personality: 'Brave explorer of busy roads', color: ['#e8eef5', '#9aa8b8'], fx: 'plain', parts: ['spaceHelmet', 'jetPack'], jump: 'float', celebrate: 'flex', mood: 'proud', voice: 0.95, unlock: u.pass(35) },
  { id: 'robot', name: 'Robot Fuzzy', rarity: 'epic', tagline: 'BEEP BOOP. Hop sequence engaged.', personality: 'Logical… mostly', color: ['#9fb4c7', '#4b5d70'], fx: 'robot', parts: ['robotAntenna', 'robotEars', 'chestLight'], jump: 'zoom', celebrate: 'dance', mood: 'cool', voice: 0.85, unlock: u.shop(2200, 'rotating') },
  { id: 'royal', name: 'Royal Fuzzy', rarity: 'epic', tagline: 'All hail the Fuzzy of the crossing.', personality: 'Graceful, gracious, glamorous', color: ['#d4a6ff', '#7b2cbf'], fx: 'plain', parts: ['crown', 'royalCape'], jump: 'glide', celebrate: 'bow', mood: 'proud', voice: 1, unlock: u.shop(2500, 'rotating'), friend: 'f28' },
  { id: 'unicorn', name: 'Unicorn Fuzzy', rarity: 'epic', tagline: 'Sparkles. Rainbows. Speed.', personality: 'Magical and full of joy', color: ['#ffd1f0', '#e06bc2'], fx: 'rainbow', parts: ['unicornHorn', 'unicornMane'], jump: 'float', celebrate: 'magic', mood: 'happy', voice: 1.3, unlock: u.pass(42), friend: 'f29' },
  { id: 'skeleton', name: 'Skeleton Fuzzy', rarity: 'epic', tagline: 'Has been squashed more than once. Totally fine.', personality: 'Dry humour, bone-deep loyalty', color: ['#f1efe6', '#aaa79a'], fx: 'bone', parts: ['ribsMark', 'skullMask'], jump: 'spring', celebrate: 'giggle', mood: 'silly', voice: 0.9, unlock: u.ach('lives-100'), friend: 'f31' },
  { id: 'rockstar', name: 'Rockstar Fuzzy', rarity: 'epic', tagline: 'Plays every crossing like the final encore.', personality: 'Loud, glittery, unstoppable', color: ['#ff4d8f', '#8c1148'], fx: 'neon', parts: ['mohawk', 'starShades'], jump: 'stomp', celebrate: 'roar', mood: 'cool', voice: 1.05, unlock: u.ach('games-100') },
  { id: 'samurai', name: 'Samurai Fuzzy', rarity: 'epic', tagline: 'Walks the long road with perfect balance.', personality: 'Disciplined and quietly kind', color: ['#c0392b', '#4a0f0a'], fx: 'plain', parts: ['samuraiHelmet', 'samuraiMask'], jump: 'glide', celebrate: 'salute', mood: 'fierce', voice: 0.85, unlock: u.endless(100) },
  { id: 'neon', name: 'Neon Fuzzy', rarity: 'epic', tagline: 'Glows brighter than the traffic lights.', personality: 'Electric and fast', color: ['#46ffe7', '#0b5cff'], fx: 'neon', parts: ['neonHalo', 'neonVisor'], jump: 'zoom', celebrate: 'dance', mood: 'cool', voice: 1.2, unlock: u.world(9) },
  { id: 'lion', name: 'Lion Dance Fuzzy', rarity: 'epic', tagline: 'Brings good luck to every crossing.', personality: 'Festive, bold and bright', color: ['#ff3b30', '#ffcc00'], fx: 'plain', parts: ['lionMane', 'lionBrows'], jump: 'spring', celebrate: 'dance', mood: 'proud', voice: 0.95, unlock: u.season('lunar') },
  { id: 'mermaid', name: 'Coral Fuzzy', rarity: 'epic', tagline: 'Is more at home in the water than on the road.', personality: 'Dreamy island spirit', color: ['#6ef3d6', '#0e8f9e'], fx: 'rainbow', parts: ['shellCrown', 'seaPearls'], jump: 'glide', celebrate: 'dance', mood: 'calm', voice: 1.2, unlock: u.world(8) },

  // ───────── Legendary (8) ─────────
  { id: 'golden', name: 'Golden Fuzzy', rarity: 'legendary', tagline: 'Pure gold. Earned, never bought.', personality: 'Shiny, serene, a little smug', color: ['#fff3b0', '#e0a100'], fx: 'gold', parts: ['goldHalo'], jump: 'float', celebrate: 'flex', mood: 'proud', voice: 1, unlock: u.ach('coins-10000'), legacy: 'gold' },
  { id: 'ghost', name: 'Ghost Fuzzy', rarity: 'legendary', tagline: 'Passes through the haunted road like a whisper.', personality: 'Playful, floaty, boo-tiful', color: ['#e8f6ff', '#9ec8e8'], fx: 'ghost', parts: ['ghostWisp'], jump: 'float', celebrate: 'giggle', mood: 'silly', voice: 1.3, unlock: u.world(7) },
  { id: 'dragon', name: 'Dragon Fuzzy', rarity: 'legendary', tagline: 'Breathes tiny sparks. Roars loudly.', personality: 'Fierce but cuddly', color: ['#6fe36a', '#1d7a2a'], fx: 'fire', parts: ['dragonHorns', 'dragonWings', 'dragonTail'], jump: 'stomp', celebrate: 'roar', mood: 'fierce', voice: 0.7, unlock: u.endless(500) },
  { id: 'rainbow', name: 'Rainbow Fuzzy', rarity: 'legendary', tagline: 'Every colour at once.', personality: 'Joyful chaos', color: ['#ff8fb4', '#4d7cff'], fx: 'rainbow', parts: ['rainbowArc', 'starShades'], jump: 'bounce', celebrate: 'dance', mood: 'happy', voice: 1.25, unlock: u.weekly(10), friend: 'f30' },
  { id: 'phoenix', name: 'Phoenix Fuzzy', rarity: 'legendary', tagline: 'Rises, hops, rises again.', personality: 'Radiant and unstoppable', color: ['#ffb347', '#e63900'], fx: 'fire', parts: ['phoenixCrest', 'phoenixWings'], jump: 'glide', celebrate: 'roar', mood: 'fierce', voice: 1, unlock: u.pass(50) },
  { id: 'frost', name: 'Frost Fuzzy', rarity: 'legendary', tagline: 'Ice-cool under any pressure.', personality: 'Serene and sparkling', color: ['#d9f4ff', '#5fb4e8'], fx: 'frost', parts: ['iceCrown', 'iceCape'], jump: 'glide', celebrate: 'magic', mood: 'calm', voice: 1.15, unlock: u.world(6) },
  { id: 'thunder', name: 'Thunder Fuzzy', rarity: 'legendary', tagline: 'A storm in a ball of fluff.', personality: 'Crackling and cheerful', color: ['#ffe94d', '#4b3fd6'], fx: 'storm', parts: ['boltCrest', 'cloudCape'], jump: 'zoom', celebrate: 'flex', mood: 'fierce', voice: 0.9, unlock: u.ach('gold-250') },
  { id: 'titan', name: 'Titan Fuzzy', rarity: 'legendary', tagline: 'Guardian of the Legendary Fuzzy World.', personality: 'Ancient, mighty, gentle', color: ['#ffcf6b', '#7a4be8'], fx: 'gold', parts: ['titanCrown', 'titanShoulders'], jump: 'stomp', celebrate: 'roar', mood: 'proud', voice: 0.65, unlock: u.world(10) },

  // ───────── Mythic (5) ─────────
  { id: 'nebula', name: 'Nebula Fuzzy', rarity: 'mythic', tagline: 'Born from a weekly #1.', personality: 'Cosmic and calm', color: ['#7c3aed', '#0b1026'], fx: 'cosmic', parts: ['nebulaRing', 'orbitStars'], jump: 'float', celebrate: 'magic', mood: 'calm', voice: 0.9, unlock: u.weekly(1) },
  { id: 'aurora', name: 'Aurora Fuzzy', rarity: 'mythic', tagline: 'Dances where the sky meets the road.', personality: 'Graceful, glowing, far-travelled', color: ['#7dffb5', '#5b6cff'], fx: 'aurora', parts: ['auroraVeil', 'orbitStars'], jump: 'float', celebrate: 'dance', mood: 'calm', voice: 1.1, unlock: u.endless(800) },
  { id: 'eclipse', name: 'Eclipse Fuzzy', rarity: 'mythic', tagline: 'Awarded to those who found them all.', personality: 'Shadowy and sun-crowned', color: ['#1a1030', '#ffb347'], fx: 'eclipse', parts: ['eclipseCorona'], jump: 'glide', celebrate: 'flex', mood: 'proud', voice: 0.8, unlock: u.ach('collection-45') },
  { id: 'prism', name: 'Prism Fuzzy', rarity: 'mythic', tagline: 'For the flawless. Cleared a whole world without a single mistake.', personality: 'Perfect, glittering, humble', color: ['#d8f1ff', '#9ad7ff'], fx: 'prism', parts: ['prismCrystals'], jump: 'twirl', celebrate: 'magic', mood: 'proud', voice: 1.2, unlock: u.challenge('flawless-world') },
  { id: 'omega', name: 'Omega Fuzzy', rarity: 'mythic', tagline: '???', personality: 'Nobody knows. Nobody has the courage to ask.', color: ['#ff2e63', '#1a1a2e'], fx: 'eclipse', parts: ['omegaSigil', 'orbitStars'], jump: 'twirl', celebrate: 'roar', mood: 'fierce', voice: 0.6, unlock: u.secret },
];

export const CHARACTER_BY_ID: Record<string, CharacterDef> = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));
export const character = (id: string): CharacterDef => CHARACTER_BY_ID[id] ?? CHARACTERS[0];
export const START_CHARACTER = 'classic';

/** Plain-language "how do I get this" (the Locker's How to Unlock panel; the screens add the direct link). */
export function unlockText(c: CharacterDef): string {
  const k = c.unlock;
  switch (k.kind) {
    case 'start': return 'You start with this Fuzzy.';
    case 'pass': return `Reach Fuzzy Pass level ${k.level}.`;
    case 'shop': return k.slot === 'permanent' ? `Buy in the Fuzzy Shop for ${k.price} coins.` : `Appears in the Fuzzy Shop's rotating selection for ${k.price} coins — check back daily and weekly.`;
    case 'season': return `Complete the ${EVENT_NAME[k.event]} event challenge. It comes back every year, and what you earn is yours forever.`;
    case 'achievement': return `Achievement: ${ACHIEVEMENT_HINT[k.id] ?? 'complete the achievement'}.`;
    case 'world': return `Clear all 15 levels of ${WORLD_NAME[k.world - 1]} (world ${k.world}).`;
    case 'endless': return `Reach ${k.score} in Endless Crossing.`;
    case 'weekly': return k.top === 1 ? 'Finish #1 on a weekly leaderboard.' : `Finish in the top ${k.top} of any weekly leaderboard.`;
    case 'challenge': return CHALLENGE_HINT[k.id] ?? 'Complete the special challenge.';
    case 'secret': return 'A secret. Keep playing and exploring…';
  }
}

export const EVENT_NAME: Record<EventId, string> = { halloween: 'Halloween', christmas: 'Christmas', hanukkah: 'Hanukkah', lunar: 'Lunar New Year', easter: 'Easter', summer: 'Summer Festival', thanksgiving: 'Thanksgiving', winter: 'Winter Festival' };
export const WORLD_NAME = ['Sunny Meadows', 'Busy Fuzzy City', 'Forest Adventure', 'Railway Rush', 'Stormy Valley', 'Snowy Mountain', 'Haunted Crossing', 'Tropical Island', 'Neon City', 'Legendary Fuzzy World'];
/** achievements that award a character (the full achievement list lives in achievements.ts) */
export const ACHIEVEMENT_HINT: Record<string, string> = {
  'nests-100': 'fill 100 nests', 'lives-100': 'lose 100 lives (it happens to the best of us)', 'games-100': 'play 100 games',
  'coins-10000': 'earn 10,000 coins in total', 'gold-250': 'collect 250 golden Fuzzies', 'collection-45': 'collect 45 of the 50 Fuzzies',
};
export const CHALLENGE_HINT: Record<string, string> = { 'flawless-world': 'Clear all 15 levels of any world without losing a single life.' };
