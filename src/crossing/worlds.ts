/**
 * The 10 Fuzzy Crossing worlds: names, looks, what each one teaches, and the unlock rules (DOM-free).
 * World n opens when world n−1 has at least 10 levels cleared (world 1 is always open);
 * level l opens when level l−1 of the same world is cleared.
 */
import { WORLD_NAME } from './characters';

export const WORLD_COUNT = 10;
export const LEVELS_PER_WORLD = 15;
/** levels of the previous world you need to clear to open a world */
export const OPEN_AFTER = 10;

export interface WorldTheme {
  /** look of each surface */
  grass: string; grass2: string; road: string; river: string; riverDeep: string; rail: string; ice: string; conveyor: string;
  /** far bank / horizon */
  sky: string; fog: string;
  /** what grows on the verge */
  props: 'meadow' | 'city' | 'forest' | 'rail' | 'storm' | 'snow' | 'haunted' | 'tropical' | 'neon' | 'legend';
}

export interface WorldDef {
  n: number;
  name: string;
  emoji: string;
  tagline: string;
  /** one short line per mechanic this world introduces (shown on the world card) */
  teaches: string[];
  /** card colour (UI) */
  color: string;
  theme: WorldTheme;
}

const t = (x: Partial<WorldTheme> & Pick<WorldTheme, 'props'>): WorldTheme => ({
  grass: '#79c25a', grass2: '#5ea845', road: '#3b3c44', river: '#2f86d6', riverDeep: '#215fa8', rail: '#6b5a4a', ice: '#d9f1ff', conveyor: '#2a2f45',
  sky: '#a9d4f5', fog: '#cfdbe4', ...x,
});

export const WORLDS: WorldDef[] = [
  { n: 1, name: WORLD_NAME[0], emoji: '🌼', tagline: 'Sunny fields, gentle traffic and friendly rivers.', color: '#6cbf4a',
    teaches: ['Hop across roads and rivers', 'Ride the logs and lily pads', 'Follow the coin trails'],
    theme: t({ props: 'meadow' }) },
  { n: 2, name: WORLD_NAME[1], emoji: '🏙️', tagline: 'Rush hour! Traffic lights, sports cars and sirens.', color: '#e0a21b',
    teaches: ['Traffic lights stop a lane — cross on red', 'Sports cars are fast and small', 'Ambulances race by with sirens'],
    theme: t({ props: 'city', grass: '#b9bcc4', grass2: '#a6a9b2', road: '#34353d', river: '#3a7fbf', sky: '#b9d6ef', fog: '#d5dde6' }) },
  { n: 3, name: WORLD_NAME[2], emoji: '🌲', tagline: 'Deer herds, diving turtles and fallen-log bridges.', color: '#2f9e5b',
    teaches: ['Wildlife crosses in herds', 'Turtles dive — watch them sink', 'Trees and hedges block your way'],
    theme: t({ props: 'forest', grass: '#5fa443', grass2: '#4a8a35', river: '#2a7a8e', riverDeep: '#1d5866', sky: '#bcd9c2', fog: '#c6d9cc' }) },
  { n: 4, name: WORLD_NAME[3], emoji: '🚂', tagline: 'Bells ring, lights flash — then the express roars past.', color: '#c8553d',
    teaches: ['Flashing lights + a bell = a train is coming', 'Handcars roll along the rails', 'Wait at the barrier, then dash'],
    theme: t({ props: 'rail', grass: '#9fbf63', grass2: '#86a84f', sky: '#f2d3a6', fog: '#ead7bd' }) },
  { n: 5, name: WORLD_NAME[4], emoji: '⛈️', tagline: 'Rain, wind and lightning — watch the glowing rings.', color: '#5b6f91',
    teaches: ['Lightning hits where the ring glows', 'Wind pushes the logs faster and slower', 'The river rises over the banks'],
    theme: t({ props: 'storm', grass: '#5f8f4e', grass2: '#4f7b41', river: '#3e6b86', riverDeep: '#2a4c63', road: '#2e3037', sky: '#7d8a9e', fog: '#8a96a8' }) },
  { n: 6, name: WORLD_NAME[5], emoji: '🏔️', tagline: 'Slippery ice, snowmen and speeding sleds.', color: '#4aa3d8',
    teaches: ['On ice you slide until something stops you', 'Snowmen block the way — use them to stop', 'Sleds zoom down the ice lanes'],
    theme: t({ props: 'snow', grass: '#eef4f8', grass2: '#dbe7ee', road: '#4a4f5a', river: '#5aa5cf', riverDeep: '#3c7ea8', sky: '#d6e8f5', fog: '#e4eef5' }) },
  { n: 7, name: WORLD_NAME[6], emoji: '👻', tagline: 'Ghost cars fade in and out of the fog.', color: '#6d5a8a',
    teaches: ['Ghost cars only hurt while solid', 'Swamp pads sink into the bog', 'Bats swoop low over the graves'],
    theme: t({ props: 'haunted', grass: '#4d6146', grass2: '#3e503a', road: '#2a2a33', river: '#3b5a46', riverDeep: '#253b2e', sky: '#3a3b55', fog: '#4b4d66' }) },
  { n: 8, name: WORLD_NAME[7], emoji: '🏝️', tagline: 'Boats, drawbridges, crabs and the tide.', color: '#18a8a0',
    teaches: ['Boats are big and steady', 'Drawbridges lift — get off when the lights flash', 'Crabs scuttle sideways; the tide comes in'],
    theme: t({ props: 'tropical', grass: '#f0d79a', grass2: '#e5c57c', river: '#1fb3c7', riverDeep: '#11819a', sky: '#9fe0f2', fog: '#c9eef4' }) },
  { n: 9, name: WORLD_NAME[8], emoji: '🌃', tagline: 'Lasers, teleport pads and hover lanes.', color: '#d6336c',
    teaches: ['Laser gates switch on and off to a beat', 'Teleport pads jump you ahead', 'Hover lanes carry you sideways'],
    theme: t({ props: 'neon', grass: '#2a2d44', grass2: '#23263b', road: '#16172a', river: '#2a3c8f', riverDeep: '#1a2766', conveyor: '#3a1f4d', sky: '#141530', fog: '#1d1f3d' }) },
  { n: 10, name: WORLD_NAME[9], emoji: '👑', tagline: 'Every challenge at once — and the Titan waits at the end.', color: '#d99a00',
    teaches: ['Everything you have learned, together', 'Level 15: the Titan Crossing'],
    theme: t({ props: 'legend', grass: '#86c46a', grass2: '#6aab52', river: '#3d7fd0', sky: '#f4d9a0', fog: '#efdcb5' }) },
];
export const WORLD_BY_N = (n: number): WorldDef => WORLDS[Math.max(0, Math.min(WORLD_COUNT, n) - 1)];

/** `${world}-${level}` → stars */
export type StarMap = Record<string, number>;
export const levelKey = (w: number, l: number): string => `${w}-${l}`;
export const starsOf = (m: StarMap, w: number, l: number): number => m[levelKey(w, l)] ?? 0;
export function clearedIn(m: StarMap, w: number): number { let n = 0; for (let l = 1; l <= LEVELS_PER_WORLD; l++) if (starsOf(m, w, l) > 0) n++; return n; }
export function starsIn(m: StarMap, w: number): number { let n = 0; for (let l = 1; l <= LEVELS_PER_WORLD; l++) n += starsOf(m, w, l); return n; }
export const worldOpen = (m: StarMap, w: number): boolean => w <= 1 || (w <= WORLD_COUNT && clearedIn(m, w - 1) >= OPEN_AFTER);
export const levelOpen = (m: StarMap, w: number, l: number): boolean => worldOpen(m, w) && (l <= 1 || starsOf(m, w, l - 1) > 0);
/** all 15 levels with 3 stars */
export function worldFlawless(m: StarMap, w: number): boolean { for (let l = 1; l <= LEVELS_PER_WORLD; l++) if (starsOf(m, w, l) < 3) return false; return true; }
/** the next level to play in a world (first not cleared, else the first without 3 stars, else 1) */
export function nextLevel(m: StarMap, w: number): number {
  for (let l = 1; l <= LEVELS_PER_WORLD; l++) if (!starsOf(m, w, l)) return l;
  for (let l = 1; l <= LEVELS_PER_WORLD; l++) if (starsOf(m, w, l) < 3) return l;
  return 1;
}

/** extra Crossing Coins on top of the store's per-clear coins: first clear, first 3 stars, milestones */
export const WORLD_BONUS = { firstClear: 15, firstThreeStars: 10, milestone: 25, worldComplete: 150 } as const;
