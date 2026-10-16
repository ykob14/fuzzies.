/**
 * The 150 world levels of Fuzzy Crossing (10 worlds × 15), built deterministically from a hand-written layout per level
 * (one token per row, bottom → top) and the world's mechanic builders. Same level = same crossing every time.
 * DOM-free: the game, the Worlds screen and the fairness solver (tools/crossing/levels-check.ts) all use it.
 *
 * Every level is proven crossable for its goal, with a human reaction margin, by `bash tools/crossing/run.sh levels-check.ts`.
 * When the check finds a level that is too tight, it bumps that level's entry in VARIANT (a different seed for the same design).
 */
import { COLS, OFFSCREEN, rng, type LevelDef, type Milestone, type ObjKind, type ObjSpec, type RowSpec, type Coin, type Teleport } from './sim';
import { WORLDS, LEVELS_PER_WORLD } from './worlds';

const CAR = ['#e63946', '#f4a300', '#1f6fd1', '#17a589', '#e84393', '#f2f2f2', '#2b2d42', '#8a9199', '#ff7a1a'];
const NEON = ['#ff3d81', '#39e6ff', '#b6ff3d', '#ffd23f', '#ff7a1a'];
const BUS = ['#f2b705', '#e63946', '#1d6fd8', '#2a9d8f'];

/** layouts, bottom row (11) → top row (1). See `B` for what each token builds. */
const LAYOUTS: string[][] = [
  // 1 Sunny Meadows — the basics, slow traffic, friendly rivers, coin trails
  [
    'g r g g r gc l g l g g',
    'r gc r g g l l g g p g',
    'r r g gc r g p l g l g',
    'rt r g r gc g l p l g g',
    'r r rb g gc l p g l l g',
    'r rt r gc g ps l g l p g',
    'r rb r r g gc l ps l g l',
    'rt r r gc r g l l ps l g',
    'r r rt r g gc ps l p l l',
    'r gc r gc rt g gc l ps l g',
    'r rt r rb r g l ps l p l',
    'rb r r rt r gc ps l ps l l',
    'r r rt r r g l ps L ps l',
    'rt r rb r r gc ps l ps L l',
    'rt r rb r rt g ps L ps l ps',
  ],
  // 2 Busy Fuzzy City — traffic lights, sports cars, ambulances, buses, rush hour
  [
    'g rl g r g gc rl g g r g',
    'r rl g rs g gc rl r g g g',
    'rl r g rs r g gc rl rb g g',
    'r rl rs g ra g r rl g gc g',
    'rl r rs g rl rb g r rs g g',
    'rb rl r gc rs r g b b g g',
    'r rh r g rs ra g rl r gc g',
    'rl rs rb g r rh g b l b g',
    'rs r rl rb g ra r g rh r g',
    'r rl gc rs rl g rb r g rl g',
    'rh rs r rl g ra rb g b l b',
    'rs rl rh r g rb rs ra g rl g',
    'rh r rs rl ra g rl rb rs r g',
    'rs rh rb rl r g ra rs rh rl g',
    'rh rs rl ra rb g rh rs rl ra g',
  ],
  // 3 Forest Adventure — herds, rabbits, diving turtles, fallen-log bridges, trees in the way
  [
    'g deer g gb g gc l fb l g g',
    'deer g gb bun g gc t l g gb g',
    'gb deer bun gb g gc t fb t g gb',
    'deer gb bun deer g gc l t l fb g',
    'bun deer gb bun g t l t fb g gb',
    'deer bun gb deer bun g t fb t l g',
    'gb deer bun deer g gc t l t t g',
    'bun deer bun gb deer g l t fb t gb',
    'deer gb bun deer bun g t t l t g',
    'gc deer bun gc deer g gc t fb t g',
    'bun deer bun deer gb g t l t fb t',
    'deer bun deer bun deer gb t t l t g',
    'bun deer gb bun deer g t fb t t l',
    'deer bun deer bun gb deer t t l t t',
    'bun deer bun deer bun g t t fb t t',
  ],
  // 4 Railway Rush — trains with lights + bell, handcars, level crossings
  [
    'g r g rail g gc g rail g g g',
    'r g rail g hc g gc rail g l g',
    'rail g r rail g gc hc g rail l g',
    'r rail hc g rail g l l rail g g',
    'rail r rail g hc rail g l rail l g',
    'r rail r rail g hc rail g l p g',
    'rail hc rail g r rail gc rail l l g',
    'rt rail r rail g rail hc rail l p l',
    'rail r rail hc rail g rail l rail l g',
    'rail g rail hc g rail gc rail l g g',
    'r rail rt rail hc g rail rail l p l',
    'rail rail r hc rail g rail l rail l l',
    'rail r rail rail hc g rail rail l ps l',
    'rt rail rail r rail hc rail rail l l ps',
    'rail rail r rail rail g rail rail l rail l',
  ],
  // 5 Stormy Valley — lightning rings, wind on the river, the river rising over the banks
  [
    'g r g z g gc w g l g g',
    'r g z g r gc w l g fl g',
    'z r g r z gc w fl l g g',
    'r z r fl g z w l w g g',
    'z r z r g fl w w l z g',
    'r z rt z g fl w l w fl g',
    'z r z r fl gc w w l w z',
    'rt z r z r fl w fl w l g',
    'z r z rt z g w w fl w l',
    'gc z r gc z fl gc w l w g',
    'r z rt z r fl w l w fl w',
    'z rt z r z g w fl w w l',
    'r z r z rt fl w w fl w w',
    'z rt z r z fl w w l fl w',
    'z r z rt z fl w fl w w fl',
  ],
  // 6 Snowy Mountain — slippery ice, snowmen to stop on, sleds, ice floes
  [
    'g r g ice g gc g raft g raft g',
    'r g ice ice g gc sled g raft raft g',
    'ice r g sled ice gc g raft raft g g',
    'r ice sled g r gc ice raft raft raft g',
    'sled g ice ice r g raft raft g raft g',
    'r sled ice g sled g raft l raft raft g',
    'ice sled r g ice sled gc raft raft l g',
    'sled r ice ice sled g raft raft raft l g',
    'r sled ice r sled g ice raft l raft raft',
    'gc sled ice gc r sled gc raft raft g g',
    'sled ice sled r ice sled g raft l raft raft',
    'r sled ice sled r ice g raft raft l raft',
    'sled ice sled ice r sled g raft raft raft l',
    'ice sled r sled ice sled g raft l raft raft',
    'sled ice sled r sled ice sled raft raft l raft',
  ],
  // 7 Haunted Crossing — ghost cars, swamp pads that sink, bats, tombstones
  [
    'g gh g gb g gc sw g l g g',
    'gh g bat gb g gc sw l g sw g',
    'gb gh bat g gh gc sw sw l g g',
    'gh bat gb gh g gc l sw sw g gb',
    'bat gh gb gh bat g sw l sw sw g',
    'gh bat gh gb gh g sw sw l sw g',
    'gb gh bat gh bat gc sw l sw sw g',
    'gh bat gh bat gh g sw sw sw l g',
    'bat gh gb bat gh g l sw sw sw sw',
    'gc gh bat gc gh g gc sw l sw g',
    'gh bat gh bat gh gb sw sw l sw sw',
    'bat gh bat gh bat g sw l sw sw sw',
    'gh bat gh gb bat gh sw sw sw l sw',
    'bat gh bat gh bat gb sw sw l sw sw',
    'gh bat gh bat gh bat sw sw sw sw l',
  ],
  // 8 Tropical Island — boats, drawbridges, crabs, the tide
  [
    'g crab g g r gc b g dw g g',
    'crab g tide g r gc b dw g b g',
    'r crab g tide crab gc dw b b g g',
    'crab tide crab g r gc b dw b dw g',
    'tide crab r crab g dw b b dw g g',
    'crab r tide crab g b dw b b dw g',
    'r crab tide crab r gc dw b dw b g',
    'crab tide r crab tide g b dw b dw b',
    'tide crab r tide crab g dw b dw b b',
    'gc crab tide gc crab g gc b dw b g',
    'r crab tide crab r tide b dw b dw b',
    'crab tide crab r crab g dw b b dw b',
    'tide crab r crab tide g b dw b dw dw',
    'crab tide crab r tide crab dw b dw b b',
    'crab r tide crab tide crab b dw b dw b',
  ],
  // 9 Neon City — laser gates, teleport pads, hover lanes, glowing traffic
  [
    'g hov g las g gc cv g las g g',
    'hov g las g cv gc las hov g g g',
    'ta hov las g hov tb cv las g las g',
    'las hov cv g las gc hov cv las g g',
    'hov las hov g cv las g hov las cv g',
    'ta las hov hov las tb cv las cv hov g',
    'las hov las cv g gc las hov cv las g',
    'hov las cv hov las g cv las hov las g',
    'ta hov las hov cv tb las cv las hov las',
    'gc las hov gc las g gc cv las hov g',
    'las hov las cv hov g las cv hov las cv',
    'ta las hov las hov tb cv las cv hov las',
    'hov las cv las hov g las hov cv las las',
    'las hov las hov cv g las cv las hov cv',
    'ta las hov cv las tb las hov las cv las',
  ],
  // 10 Legendary Fuzzy World — everything together; level 15 is the Titan Crossing
  [
    'r rail g rl gc g l t g ps g',
    'rs rail z g gh gc ps w t l g',
    'ice sled g rail rl gc t dw w b g',
    'rail rs z gh g gc b dw t l g',
    'rh rail z sled gh g w t l ps g',
    'rail rs gh z rail g t b dw w g',
    'sled ice rail rh las gc ps l t w g',
    'rail rh z gh rail g w dw b t l',
    'rs rail las z gh g t ps w dw b',
    'gc rail rh gc z g gc t w ps g',
    'rail rs gh z rail g t b dw w ps',
    'rh rail las gh z g w t ps dw b',
    'rail rs z rail gh g b w t dw ps',
    'rh rail gh las rail g t dw w ps b',
    'stomp rail stomp rh stomp g stomp t stomp w g',
  ],
];

/** per-level seed variant (the fairness check bumps an entry when a design needs another seed) */
const VARIANT: number[][] = Array.from({ length: 10 }, () => Array(15).fill(0));

const NAMES: string[][] = [
  ['First Hops', 'Coin Trail', 'Lily Lane', 'Truck Stop', 'Morning Dash', 'Sinking Pads', 'Bus Route', 'Meadow Run', 'Duck Pond', 'Golden Meadow', 'Busy Bridge', 'Picnic Rush', 'River Bend', 'Sunset Fields', 'Meadow Marathon'],
  ['Red Means Go', 'Zoom Zoom', 'Corner Shop', 'Siren Song', 'Lunch Rush', 'Canal Street', 'Rush Hour', 'Harbour Lights', 'Crosswalk Hero', 'Careful Commute', 'Downtown Ferry', 'Neon Avenue', 'Gridlock', 'Night Traffic', 'Fuzzy City Gauntlet'],
  ['Deer Crossing', 'Bunny Hop', 'Turtle Bay', 'Mossy Path', 'Forest Sprint', 'Fallen Oak', 'Fern Gully', 'Hedge Maze', 'Diving Turtles', 'Acorn Hunt', 'Mushroom Ring', 'Stampede', 'Old Growth', 'Twilight Woods', 'Heart of the Forest'],
  ['Level Crossing', 'Handcar Hill', 'Signal Box', 'Freight Yard', 'Departure Board', 'Double Track', 'Junction', 'Steam Valley', 'Express Lane', 'Last Train', 'Sidings', 'Midnight Mail', 'Triple Track', 'Rail Rodeo', 'The Grand Express'],
  ['First Drops', 'Thunder Clap', 'Windy Ford', 'Flash Flood', 'Storm Chase', 'Gale Force', 'Rising River', 'Rolling Thunder', 'Eye of the Storm', 'Silver Lining', 'Cloudburst', 'Hailstone Hop', 'Lightning Field', 'Tempest', 'The Great Storm'],
  ['Fresh Powder', 'Snowman Stop', 'Ice Rink', 'Sled Run', 'Frosty Sprint', 'Frozen Falls', 'Slippery Slope', 'Glacier Bay', 'Avalanche Pass', 'Snowflake Hunt', 'Blizzard', 'Ice Palace', 'Peak Path', 'Polar Night', 'Summit Crossing'],
  ['Spooky Lane', 'Bat Flight', 'Bog Hop', 'Graveyard Shift', 'Midnight Dash', 'Will-o-Wisp', 'Hollow Road', 'Phantom Traffic', 'Creepy Crossing', 'Candy Hunt', 'Witching Hour', 'Moonlit Marsh', 'Ghost Town', 'Full Moon', 'The Haunted Highway'],
  ['Beach Day', 'Crab Walk', 'Drawbridge', 'Tide Pools', 'Island Sprint', 'Harbour Hop', 'Coconut Grove', 'Low Tide', 'Lagoon Loop', 'Shell Seeker', 'High Tide', 'Reef Run', 'Sunset Sail', 'Monsoon', 'Paradise Passage'],
  ['Laser Lights', 'Hover Lane', 'Jump Pads', 'Glow Street', 'Synth Sprint', 'Teleport Tango', 'Arcade Alley', 'Pixel Park', 'Quantum Leap', 'Neon Coins', 'Bassline', 'Warp Zone', 'Light Speed', 'Midnight Mainframe', 'Neon Overdrive'],
  ['The Legend Begins', 'Echoes', 'Frozen Rails', 'Ghost Train', 'Storm Express', 'Haunted Harbour', 'Ice and Lasers', 'All Aboard', 'The Gauntlet', 'Legendary Hoard', 'Fuzzy Odyssey', 'Starlight Run', 'Grand Tour', 'Final Approach', 'Titan Crossing'],
];

/** milestone challenge for a level number */
export function milestoneOf(w: number, l: number): Milestone | undefined {
  if (l === 5) return 'timeAttack';
  if (l === 10) return w % 2 === 1 ? 'coinRush' : 'noMiss';
  if (l === 15) return 'boss';
  return undefined;
}
export const MILESTONE_NAME: Record<Milestone, string> = { timeAttack: 'Time Attack', coinRush: 'Coin Rush', noMiss: 'No-Miss', boss: 'Boss Crossing' };
export const MILESTONE_ICON: Record<Milestone, string> = { timeAttack: '⏱', coinRush: '🪙', noMiss: '💗', boss: '👑' };

// ---------- row builders ----------
interface Ctx { r: () => number; d: number; W: number; w: number }
type Pick = () => { kind: ObjKind; len: number; color: string };
const between = (r: () => number, a: number, b: number) => a + r() * (b - a);
const pickOf = <T,>(r: () => number, xs: T[]): T => xs[Math.floor(r() * xs.length)];

/** speed factor for the level: later worlds and later levels are quicker */
const pace = (c: Ctx) => 1 + 0.5 * c.W + 0.32 * c.d;
/** gaps get tighter */
const tight = (c: Ctx) => Math.max(0.6, 1 - 0.22 * c.d - 0.2 * c.W);
/** static river spans (fallen trees, drawbridges): one-cell gaps only on even columns, so every nest column stays reachable */
function spans(c: Ctx): [number, number][] {
  const evens = [0, 2, 4, 6, 8, 10];
  const gaps: number[] = [];
  const n = 2 + Math.floor(c.r() * 2);
  for (let tries = 0; gaps.length < n && tries < 50; tries++) { const g = pickOf(c.r, evens); if (gaps.every((x) => Math.abs(x - g) >= 3)) gaps.push(g); }
  gaps.sort((a, b) => a - b);
  const out: [number, number][] = [];
  let x = -1;
  for (const g of gaps) { if (g - x >= 2) out.push([x, g - x]); x = g + 1; }
  out.push([x, COLS + 1 - x]);
  return out;
}

function lane(c: Ctx, row: number, surface: RowSpec['surface'], speed: number, pick: Pick, gap: [number, number], extra: Partial<RowSpec> = {}): RowSpec {
  const objs: ObjSpec[] = [];
  let maxLen = 1;
  const minSpan = COLS + 2 * OFFSCREEN + 4;
  let x = c.r() * gap[1];
  while (x < minSpan) {
    const p = pick();
    maxLen = Math.max(maxLen, p.len);
    objs.push({ x, len: p.len, kind: p.kind, color: p.color, phase: c.r(), sinks: undefined });
    x += p.len + between(c.r, gap[0], gap[1]);
  }
  const span = Math.max(x, COLS + 2 * OFFSCREEN + maxLen + 1);
  const start = speed > 0 ? COLS + OFFSCREEN - span : -OFFSCREEN - maxLen;
  for (const o of objs) o.x += start;
  return { row, surface, speed, objs, span, start, ...extra };
}

const dirOf = (row: number, w: number) => ((row + w) % 2 === 0 ? 1 : -1);
const car = (c: Ctx, kinds: ObjKind[] = ['car']): Pick => () => ({ kind: pickOf(c.r, kinds), len: 1, color: pickOf(c.r, CAR) });

type Builder = (c: Ctx, row: number) => RowSpec;
const B: Record<string, Builder> = {
  // ----- safe ground -----
  g: (_c, row) => ({ row, surface: 'grass', speed: 0, objs: [], span: 1, start: 0 }),
  gc: (_c, row) => ({ row, surface: 'grass', speed: 0, objs: [], span: 1, start: 0 }),
  gb: (c, row) => { const n = 2 + Math.floor(c.r() * 2 + c.d); const cols = new Set<number>(); while (cols.size < n) { const k = Math.floor(c.r() * COLS); if (k !== 5 && !(row === 1 && k % 2 === 1)) cols.add(k); } return { row, surface: 'grass', speed: 0, objs: [], span: 1, start: 0, blocks: [...cols].sort((a, b) => a - b), blockKind: 'tree' }; },
  ta: (_c, row) => ({ row, surface: 'grass', speed: 0, objs: [], span: 1, start: 0 }),
  tb: (_c, row) => ({ row, surface: 'grass', speed: 0, objs: [], span: 1, start: 0 }),
  // ----- roads -----
  r: (c, row) => lane(c, row, 'road', dirOf(row, c.w) * between(c.r, 1.1, 2.1) * pace(c), car(c, ['car', 'car', 'taxi']), [3 * tight(c), 4.6 * tight(c)]),
  rt: (c, row) => lane(c, row, 'road', dirOf(row, c.w) * between(c.r, 0.9, 1.5) * pace(c), () => ({ kind: 'truck', len: 2, color: pickOf(c.r, CAR) }), [3.2 * tight(c), 4.6 * tight(c)]),
  rb: (c, row) => lane(c, row, 'road', dirOf(row, c.w) * between(c.r, 0.8, 1.2) * pace(c), () => ({ kind: 'bus', len: 1.5, color: pickOf(c.r, BUS) }), [2.8 * tight(c), 3.8 * tight(c)]),
  rs: (c, row) => lane(c, row, 'road', dirOf(row, c.w) * between(c.r, 3.0, 3.8) * pace(c), () => ({ kind: 'sports', len: 1, color: pickOf(c.r, ['#e63946', '#ffd23f', '#1f6fd1', '#f2f2f2']) }), [5.5 * tight(c), 7.5 * tight(c)]),
  ra: (c, row) => lane(c, row, 'road', dirOf(row, c.w) * between(c.r, 4.4, 5.2) * pace(c), () => ({ kind: 'ambulance', len: 1.5, color: '#f4f4f4' }), [10, 13]),
  rl: (c, row) => lane(c, row, 'road', dirOf(row, c.w) * between(c.r, 1.8, 2.5) * pace(c), car(c, ['car', 'taxi', 'car']), [2.2 * tight(c), 3.1 * tight(c)],
    { signal: { go: between(c.r, 3.2, 4.2) - c.d * 0.6, stop: between(c.r, 2.4, 2.9) - c.d * 0.3, ramp: 0.6, phase: c.r() * 6 } }),
  rh: (c, row) => lane(c, row, 'road', dirOf(row, c.w) * between(c.r, 1.6, 2.2) * pace(c), () => (c.r() < 0.3 ? { kind: 'bus', len: 1.5, color: pickOf(c.r, BUS) } : { kind: 'car', len: 1, color: pickOf(c.r, CAR) }), [1.8 * tight(c), 2.6 * tight(c)],
    { signal: { go: between(c.r, 3.4, 4.2) - c.d * 0.5, stop: between(c.r, 2.5, 3), ramp: 0.6, phase: c.r() * 6 } }),
  hov: (c, row) => lane(c, row, 'road', dirOf(row, c.w) * between(c.r, 2.6, 3.4) * pace(c), () => ({ kind: 'hover', len: 1, color: pickOf(c.r, NEON) }), [4 * tight(c), 6 * tight(c)]),
  // ----- rivers -----
  l: (c, row) => lane(c, row, 'river', dirOf(row, c.w) * between(c.r, 1.0, 1.6) * pace(c), () => ({ kind: 'log', len: c.r() < 0.35 + c.d * 0.3 ? 2.5 : 3, color: '#8b5a2b' }), [1.8 + 0.4 * c.d, 2.5 + 0.5 * c.d]),
  L: (c, row) => lane(c, row, 'river', dirOf(row, c.w) * between(c.r, 1.6, 2.0) * pace(c), () => ({ kind: 'log', len: 4, color: '#7a4e26' }), [2.4, 3.2]),
  p: (c, row) => lane(c, row, 'river', dirOf(row, c.w) * between(c.r, 0.9, 1.4) * pace(c), () => ({ kind: 'pad', len: 2, color: '#4caf50' }), [1.4, 2.0]),
  ps: (c, row) => { const L = lane(c, row, 'river', dirOf(row, c.w) * between(c.r, 0.9, 1.4) * pace(c), () => ({ kind: 'pad', len: 2, color: '#43a047' }), [1.3, 1.9], { sink: { period: 7.5, down: 1.6 + c.d * 0.5, warn: 1.3 } }); L.objs.forEach((o, i) => { o.sinks = i % 2 === 0; }); return L; },
  t: (c, row) => { const L = lane(c, row, 'river', dirOf(row, c.w) * between(c.r, 0.8, 1.2) * pace(c), () => ({ kind: 'turtle', len: c.r() < 0.5 ? 2 : 3, color: '#3f8f5a' }), [1.4, 2.0], { sink: { period: 7, down: 1.6 + c.d * 0.6, warn: 1.3 } }); L.objs.forEach((o, i) => { o.sinks = i % 3 !== 1; }); return L; },
  fb: (c, row) => { // fallen trees across the river: they don't move; hop along them to reach the gap you want
    const objs: ObjSpec[] = spans(c).map(([x, len]) => ({ x, len, kind: 'log', color: '#6b4524' }));
    return { row, surface: 'river', speed: 0, objs, span: 1, start: 0 };
  },
  w: (c, row) => lane(c, row, 'river', dirOf(row, c.w) * between(c.r, 1.0, 1.4) * pace(c), () => ({ kind: 'log', len: c.r() < 0.4 ? 2.5 : 3, color: '#7d5530' }), [1.8 + 0.3 * c.d, 2.4 + 0.4 * c.d], { wind: { amp: 0.45 + 0.2 * c.d, period: between(c.r, 4.5, 6.5) } }),
  b: (c, row) => lane(c, row, 'river', dirOf(row, c.w) * between(c.r, 0.9, 1.3) * pace(c), () => ({ kind: 'boat', len: 3, color: pickOf(c.r, ['#ffffff', '#ffd23f', '#e63946', '#1f6fd1']) }), [2.2 + 0.4 * c.d, 3 + 0.5 * c.d]),
  raft: (c, row) => lane(c, row, 'river', dirOf(row, c.w) * between(c.r, 0.9, 1.4) * pace(c), () => ({ kind: 'raft', len: c.r() < 0.5 ? 2 : 3, color: '#e8f6ff' }), [1.6 + 0.3 * c.d, 2.3 + 0.4 * c.d]),
  sw: (c, row) => { const L = lane(c, row, 'river', dirOf(row, c.w) * between(c.r, 0.8, 1.2) * pace(c), () => ({ kind: 'pad', len: 2, color: '#5d7a3a' }), [1.3, 1.9], { sink: { period: 6.5, down: 1.7 + c.d * 0.5, warn: 1.3 } }); L.objs.forEach((o, i) => { o.sinks = i % 2 === 1; }); return L; },
  dw: (c, row) => { // drawbridges: fixed spans that lift up (lights flash first)
    const objs: ObjSpec[] = spans(c).map(([x, len], i) => ({ x, len, kind: 'bridge', color: '#b07a45', phase: (i * 0.5 + c.r() * 0.15) % 1, sinks: true }));
    return { row, surface: 'river', speed: 0, objs, span: 1, start: 0, sink: { period: 8, down: 2.2 + c.d * 0.6, warn: 1.5 } };
  },
  // ----- rails -----
  rail: (c, row) => {
    const v = dirOf(row, c.w) * between(c.r, 13, 16) * (1 + 0.1 * c.W);
    const len = 8 + Math.floor(c.r() * 3);
    const period = between(c.r, 6.2, 8.2) - c.d * 1.2;
    const span = Math.abs(v) * period;
    const start = v > 0 ? COLS + OFFSCREEN - span : -OFFSCREEN - len;
    const o: ObjSpec = { x: start + c.r() * (span - len), len, kind: 'train', color: pickOf(c.r, ['#c8553d', '#2b6cb0', '#2f855a', '#d69e2e']) };
    return { row, surface: 'rail', speed: v, objs: [o], span, start, train: { warn: 1.7 - 0.3 * c.d } };
  },
  hc: (c, row) => lane(c, row, 'rail', dirOf(row, c.w) * between(c.r, 1.4, 2.0) * pace(c), () => ({ kind: 'handcar', len: 1, color: '#c8553d' }), [4 * tight(c), 6 * tight(c)]),
  // ----- wildlife (on grass) -----
  deer: (c, row) => lane(c, row, 'grass', dirOf(row, c.w) * between(c.r, 0.55, 0.85) * pace(c), () => ({ kind: 'deer', len: c.r() < 0.5 ? 2 : 3, color: '#b07a45' }), [3.4 * tight(c), 5 * tight(c)]),
  bun: (c, row) => lane(c, row, 'grass', dirOf(row, c.w) * between(c.r, 2.0, 2.6) * pace(c), () => ({ kind: 'rabbit', len: 1, color: '#f2efe8' }), [3.2 * tight(c), 5 * tight(c)]),
  bat: (c, row) => lane(c, row, 'grass', dirOf(row, c.w) * between(c.r, 2.2, 2.8) * pace(c), () => ({ kind: 'bat', len: 1, color: '#3a2f4a' }), [3.4 * tight(c), 5 * tight(c)]),
  crab: (c, row) => lane(c, row, 'grass', dirOf(row, c.w) * between(c.r, 0.25, 0.45), () => ({ kind: 'crab', len: 1, color: '#ff6b4a' }), [3.4 * tight(c), 4.6 * tight(c)], { osc: { amp: 0.9 + 0.3 * c.d, period: between(c.r, 2.2, 2.8) } }),
  // ----- weather -----
  z: (c, row) => {
    const cols: number[] = [];
    let last = -9;
    for (let i = 0; i < 16; i++) { let k = Math.floor(c.r() * COLS); if (Math.abs(k - last) < 2) k = (k + 4) % COLS; cols.push(k); last = k; }
    const period = between(c.r, 1.5, 2.0) - 0.35 * c.d;
    return { row, surface: 'grass', speed: 0, objs: [], span: 1, start: 0, strikes: { period, phase: 1.2 + c.r() * period, cols, width: 1, warn: 1.2 - 0.15 * c.d, dur: 0.35 } };
  },
  fl: (c, row) => ({ row, surface: 'grass', speed: 0, objs: [], span: 1, start: 0, flood: { period: between(c.r, 8, 10), wet: 2.2 + 0.8 * c.d, phase: c.r() * 8, warn: 1.6 } }),
  tide: (c, row) => ({ row, surface: 'grass', speed: 0, objs: [], span: 1, start: 0, flood: { period: between(c.r, 8.5, 10.5), wet: 2.4 + 0.8 * c.d, phase: c.r() * 8, warn: 1.8 } }),
  // ----- snow -----
  ice: (c, row) => { const n = 2 + Math.floor(c.r() * 2); const cols = new Set<number>(); while (cols.size < n) cols.add(1 + Math.floor(c.r() * (COLS - 2))); return { row, surface: 'ice', speed: 0, objs: [], span: 1, start: 0, blocks: [...cols].sort((a, b) => a - b), blockKind: 'snowman' }; },
  sled: (c, row) => lane(c, row, 'ice', dirOf(row, c.w) * between(c.r, 2.2, 3.0) * pace(c), () => ({ kind: 'sled', len: 1, color: pickOf(c.r, ['#e63946', '#1f6fd1', '#2f855a']) }), [4.2 * tight(c), 6.4 * tight(c)]),
  // ----- haunted -----
  gh: (c, row) => lane(c, row, 'road', dirOf(row, c.w) * between(c.r, 1.5, 2.1) * pace(c), () => ({ kind: 'ghost', len: 1, color: '#bfe8ff' }), [2.2 * tight(c), 3.2 * tight(c)], { ghost: { period: between(c.r, 4.2, 5.2), solid: 2.0 + 0.4 * c.d, fade: 1.0 } }),
  // ----- neon -----
  las: (c, row) => ({ row, surface: 'grass', speed: 0, objs: [], span: 1, start: 0, lasers: { cols: Array.from({ length: COLS }, (_, i) => i), period: between(c.r, 2.6, 3.2) - 0.2 * c.d, on: 1.0 + 0.25 * c.d, phase: c.r() * 3, warn: 0.9 } }),
  cv: (c, row) => ({ row, surface: 'conveyor', speed: dirOf(row, c.w) * between(c.r, 1.2, 1.8) * pace(c), objs: [], span: 1, start: 0 }),
  // ----- the Titan -----
  stomp: (c, row) => {
    const cols: number[] = [];
    for (let i = 0; i < 12; i++) cols.push([1, 5, 9, 3, 7][(i + row) % 5]);
    return { row, surface: 'grass', speed: 0, objs: [], span: 1, start: 0, strikes: { period: 2.1, phase: 1.3 + (row % 3) * 0.7, cols, width: 3, warn: 1.25, dur: 0.4 } };
  },
};
export const TOKENS = Object.keys(B);

const MOODS: LevelDef['mood'][][] = [
  ['day', 'day', 'day', 'day', 'golden', 'day', 'day', 'day', 'golden', 'golden', 'day', 'day', 'golden', 'dusk', 'golden'],
  ['day', 'day', 'day', 'golden', 'day', 'day', 'golden', 'dusk', 'day', 'golden', 'dusk', 'neon', 'golden', 'dusk', 'dusk'],
  ['day', 'day', 'day', 'golden', 'day', 'day', 'fog', 'day', 'golden', 'golden', 'fog', 'day', 'golden', 'dusk', 'golden'],
  ['day', 'golden', 'day', 'day', 'golden', 'day', 'golden', 'day', 'golden', 'dusk', 'day', 'dusk', 'golden', 'day', 'dusk'],
  ['storm', 'storm', 'storm', 'storm', 'storm', 'storm', 'storm', 'storm', 'storm', 'storm', 'storm', 'storm', 'storm', 'storm', 'storm'],
  ['snow', 'snow', 'snow', 'snow', 'snow', 'snow', 'snow', 'snow', 'snow', 'snow', 'snow', 'snow', 'snow', 'dusk', 'snow'],
  ['night', 'night', 'fog', 'night', 'night', 'fog', 'night', 'night', 'fog', 'night', 'night', 'fog', 'night', 'night', 'night'],
  ['day', 'day', 'day', 'golden', 'day', 'day', 'golden', 'day', 'day', 'golden', 'day', 'day', 'golden', 'storm', 'golden'],
  ['neon', 'neon', 'neon', 'neon', 'neon', 'neon', 'neon', 'neon', 'neon', 'neon', 'neon', 'neon', 'neon', 'neon', 'neon'],
  ['golden', 'day', 'snow', 'fog', 'storm', 'night', 'neon', 'day', 'golden', 'golden', 'dusk', 'night', 'golden', 'dusk', 'dusk'],
];
const WEATHER: LevelDef['weather'][] = ['petals', 'none', 'leaves', 'none', 'rain', 'snow', 'mist', 'none', 'none', 'embers'];

/** what's new in a level (short tip on the level card); first appearance of a token in the world says so */
const TOKEN_TIP: Record<string, string> = {
  r: 'Cars drive by — hop into the gaps.', rt: 'Trucks are long: wait for the whole thing to pass.', rb: 'Buses are slow but wide.',
  rs: 'Sports cars are tiny and fast — look before you hop.', ra: 'Ambulances race through with sirens.', rl: 'Traffic lights: when the lane stops, cross!',
  rh: 'Rush hour: a packed lane that stops at the light.', hov: 'Hover cars glide fast and glow.',
  l: 'Ride the logs across the river.', L: 'Long logs, quick current.', p: 'Lily pads are safe to stand on.', ps: 'Some lily pads sink — watch them dip.',
  t: 'Turtles dive: get off when they start to sink.', fb: 'Fallen trees bridge the river — hop along them.', w: 'Wind gusts speed the logs up and slow them down.',
  b: 'Boats are big and steady.', raft: 'Ice floes drift down the river.', sw: 'Swamp pads sink into the bog.', dw: 'Drawbridges lift — get off when the lights flash.',
  rail: 'Flashing lights and a bell: a train is coming!', hc: 'Handcars roll along the rails.', deer: 'A deer herd crosses slowly.', bun: 'Rabbits dash across.',
  bat: 'Bats swoop low over the path.', crab: 'Crabs scuttle back and forth.', z: 'Lightning strikes where the ring glows.', fl: 'The river floods this bank now and then.',
  tide: 'The tide washes over the sand.', ice: 'On ice you slide until something stops you.', sled: 'Sleds race down the ice.', gh: 'Ghost cars only hurt while solid.',
  las: 'Laser gates switch on and off to a beat.', cv: 'Hover lanes carry you sideways.', ta: 'Teleport pads jump you ahead.', gb: 'Trees block some squares.',
  stomp: 'The Titan stomps — stay out of the glowing rings!', gc: 'Follow the coin trail!',
};

const cache = new Map<string, LevelDef>();

/** the level definition for world w (1–10), level l (1–15) */
export function getLevel(w: number, l: number, variant?: number): LevelDef {
  const key = `${w}-${l}-${variant ?? ''}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const def = buildLevel(w, l, variant ?? VARIANT[w - 1][l - 1]);
  cache.set(key, def);
  return def;
}

export function buildLevel(w: number, l: number, variant = 0): LevelDef {
  const tokens = LAYOUTS[w - 1][l - 1].split(/\s+/);
  if (tokens.length !== 11) throw new Error(`level ${w}-${l} has ${tokens.length} rows`);
  const seed = (w * 7919 + l * 104729 + variant * 15485863) >>> 0;
  const r = rng(seed);
  const milestone = milestoneOf(w, l);
  // difficulty inside the world (0..1) and the world tier (0..1); milestones push a little harder, No-Miss a little gentler
  let d = (l - 1) / (LEVELS_PER_WORLD - 1);
  if (milestone === 'timeAttack' || milestone === 'boss') d = Math.min(1, d + 0.08);
  if (milestone === 'noMiss') d = Math.max(0, d - 0.15);
  const c: Ctx = { r, d, W: (w - 1) / 9, w };
  const rows: RowSpec[] = [];
  for (let i = 0; i < 11; i++) {
    const row = 11 - i;
    const tok = tokens[i];
    const b = B[tok];
    if (!b) throw new Error(`unknown token ${tok} in ${w}-${l}`);
    rows[row - 1] = { ...b(c, row), token: tok };
  }
  // coins: trails on the coin rows, a few brave ones on the road
  const coins: Coin[] = [];
  const coinRows = tokens.map((t, i) => ({ t, row: 11 - i })).filter((x) => x.t === 'gc');
  for (const { row } of coinRows) {
    const n = milestone === 'coinRush' ? 4 : 3;
    const c0 = Math.floor(r() * (COLS - n));
    for (let k = 0; k < n; k++) coins.push({ row, col: c0 + k, gold: k === Math.floor(n / 2) && r() < 0.35 });
  }
  const roadRows = rows.filter((x) => x.surface === 'road' && !x.signal).map((x) => x.row);
  const brave = milestone === 'coinRush' ? 3 : 1;
  for (let k = 0; k < brave && roadRows.length; k++) coins.push({ row: pickOf(r, roadRows), col: Math.floor(r() * COLS), gold: true });
  const seen = new Set<string>();
  const uniqCoins = coins.filter((x) => { const s = `${x.row}:${x.col}`; if (seen.has(s)) return false; seen.add(s); return true; });
  // teleport pads: each 'ta' row jumps to the next 'tb' row above it, from two columns
  const teleports: Teleport[] = [];
  const ta = tokens.map((t, i) => ({ t, row: 11 - i })).filter((x) => x.t === 'ta').map((x) => x.row);
  const tb = tokens.map((t, i) => ({ t, row: 11 - i })).filter((x) => x.t === 'tb').map((x) => x.row);
  ta.forEach((from, i) => { const to = tb[i]; if (to === undefined) return; const a = 1 + Math.floor(r() * 3), b = COLS - 2 - Math.floor(r() * 3); teleports.push({ from: [from, a], to: [to, a] }, { from: [from, b], to: [to, b] }); });
  // nests
  let nests = [1, 3, 5, 7, 9];
  if (milestone === 'coinRush') nests = [3, 7];
  else if (milestone === 'timeAttack' || milestone === 'noMiss') nests = [1, 5, 9];
  else if (milestone === 'boss') nests = [1, 3, 5, 7, 9];
  else if (l === 1) nests = [3, 7];
  else if (l <= 4) nests = [1, 5, 9];
  else if (l <= 9) nests = [1, 3, 7, 9];
  const lives = milestone === 'noMiss' ? 1 : 3;
  const timer = milestone === 'boss' ? 34 : 32;
  const goal: LevelDef['goal'] = { nests: nests.length };
  if (milestone === 'coinRush') goal.coins = Math.min(uniqCoins.length - 2, 8);
  if (milestone === 'timeAttack') goal.timeLimit = w <= 4 ? 45 : 40;
  // what's new: the first level in this world that uses a token says so
  const firstUse = (tok: string) => { for (let k = 1; k < l; k++) if (LAYOUTS[w - 1][k - 1].split(/\s+/).includes(tok)) return false; return true; };
  const newTok = [...new Set(tokens)].filter((t) => t !== 'g' && t !== 'tb' && firstUse(t));
  const tip = milestone === 'timeAttack' ? `Time Attack: fill ${nests.length} nests in ${goal.timeLimit} seconds!`
    : milestone === 'coinRush' ? `Coin Rush: grab ${goal.coins} coins to open the nests.`
    : milestone === 'noMiss' ? 'No-Miss: one life only. Take your time!'
    : milestone === 'boss' ? (w === 10 ? 'The Titan stomps the ground — stay out of the glowing rings!' : `The ${WORLDS[w - 1].name} finale: everything at once.`)
    : TOKEN_TIP[newTok.find((t) => TOKEN_TIP[t]) ?? tokens.find((t) => t !== 'g' && TOKEN_TIP[t]) ?? 'r'];
  return {
    id: `${w}-${l}`, world: w, level: l, name: NAMES[w - 1][l - 1], tip, seed, rows, nests, goal, lives, timer, milestone,
    coins: uniqCoins, teleports, mood: MOODS[w - 1][l - 1], weather: w === 5 && (milestone === 'boss' || l >= 7) ? 'storm' : WEATHER[w - 1],
  };
}

/** the layout string of a level (for the uniqueness check) */
export const layoutOf = (w: number, l: number): string => LAYOUTS[w - 1][l - 1];
export const setVariant = (w: number, l: number, v: number): void => { VARIANT[w - 1][l - 1] = v; cache.clear(); };

// ---------- for Endless Crossing (crossing/endless.ts builds its stretches from the same row builders) ----------
/** one row built from a design token with the same builders as the 150 levels. `d` = difficulty in the world (0..1), `W` = world tier (0..1), `w` = world number (travel direction parity) */
export function rowFromToken(token: string, row: number, r: () => number, d: number, W: number, w: number): RowSpec {
  const b = B[token];
  if (!b) throw new Error(`unknown token ${token}`);
  return { ...b(({ r, d, W, w }), row), token };
}
/** the short "what's new" line of a token */
export const tokenTip = (token: string): string | undefined => TOKEN_TIP[token];
