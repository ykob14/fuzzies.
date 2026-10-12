/**
 * Forest Expansion — RULES only (no DOM, no Three.js): a clearing at the forest edge with some trees marked for clearing.
 * Pick a marked tree, then chop with timing: a marker swings along a meter and a tap in the sweet spot is a strong hit
 * (perfect hits give extra wood). Only marked trees can be felled; the others always stay. This is its own little scene —
 * it never touches the trees of the player's saved town. Finish before sunset; faster = a better place.
 */
export interface Tree { id: number; x: number; z: number; seed: number; scale: number; marked: boolean; hp: number; felled: boolean; chops: number }
export type Hit = 'perfect' | 'good' | 'weak';
export interface ChopResult { hit: Hit; damage: number; felled: boolean; wood: number }

export const TREE_HP = 4;
export const LIMIT = 90; // seconds until sunset
export const SWEET = { lo: 0.68, hi: 0.9 }; // the meter's sweet spot (perfect), 'good' is just outside it

export class ForestSim {
  readonly trees: Tree[] = [];
  readonly marked: number;
  state: 'ready' | 'playing' | 'done' = 'ready';
  time = 0;
  wood = 0;
  perfect = 0;
  cleared = 0;
  selected: number | null = null;
  /** the swinging marker (0..1) while a marked tree is selected */
  meter = { value: 0, dir: 1, speed: 1.15 };
  /** things that happened this step for the view */
  events: { kind: 'chop' | 'felled' | 'keep' | 'select' | 'done' | 'timeup'; tree: number; hit?: Hit; wood?: number }[] = [];

  constructor(rnd: () => number = Math.random, total = 16, marked = 6) {
    // trees on a loose grid across a 16 × 11 clearing, a few of them marked (spread out, not all in one corner)
    const cols = 6, rows = 3;
    let id = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (id >= total) break;
      const x = -7.5 + c * 3 + (rnd() - 0.5) * 1.4, z = -4 + r * 4 + (rnd() - 0.5) * 1.6;
      this.trees.push({ id, x, z, seed: 11 + id * 7 + Math.floor(rnd() * 3), scale: 1.25 + rnd() * 0.5, marked: false, hp: TREE_HP, felled: false, chops: 0 });
      id++;
    }
    const order = this.trees.map((t) => t.id);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    for (const t of order.slice(0, marked)) this.trees[t].marked = true;
    this.marked = marked;
  }

  tree(id: number): Tree | undefined { return this.trees[id]; }
  get remaining(): number { return this.marked - this.cleared; }

  start(): void { if (this.state === 'ready') this.state = 'playing'; }

  step(dt: number): void {
    this.events.length = 0;
    if (this.state !== 'playing') return;
    this.time += dt;
    if (this.selected !== null) {
      // the marker swings back and forth, a touch faster as the day goes on
      const m = this.meter;
      m.value += m.dir * (m.speed + this.time / LIMIT * 0.25) * dt;
      if (m.value >= 1) { m.value = 1; m.dir = -1; } else if (m.value <= 0) { m.value = 0; m.dir = 1; }
    }
    if (this.time >= LIMIT) { this.time = LIMIT; this.state = 'done'; this.events.push({ kind: 'timeup', tree: -1 }); }
  }

  /** Tap a tree: a marked one becomes the target; an unmarked one is kept (and says so). */
  select(id: number): 'ok' | 'keep' | 'felled' | 'none' {
    const t = this.trees[id];
    if (!t || this.state !== 'playing') return 'none';
    if (t.felled) return 'felled';
    if (!t.marked) { this.events.push({ kind: 'keep', tree: id }); return 'keep'; }
    if (this.selected !== id) { this.selected = id; this.meter = { value: 0, dir: 1, speed: 1.15 }; this.events.push({ kind: 'select', tree: id }); }
    return 'ok';
  }

  /** Swing the axe at the selected tree. Timing decides the hit: perfect (sweet spot), good (near it) or weak. */
  chop(): ChopResult | null {
    if (this.state !== 'playing' || this.selected === null) return null;
    const t = this.trees[this.selected];
    if (!t || t.felled) return null;
    const v = this.meter.value;
    const hit: Hit = v >= SWEET.lo && v <= SWEET.hi ? 'perfect' : v >= SWEET.lo - 0.2 && v <= Math.min(1, SWEET.hi + 0.08) ? 'good' : 'weak';
    const damage = hit === 'perfect' ? 2 : hit === 'good' ? 1.4 : 0.6;
    t.hp = Math.max(0, t.hp - damage);
    t.chops++;
    if (hit === 'perfect') this.perfect++;
    let wood = hit === 'perfect' ? 1 : 0;
    let felled = false;
    if (t.hp <= 0) {
      felled = true; t.felled = true; this.cleared++;
      wood += 3;
      this.selected = null;
    }
    this.wood += wood;
    this.events.push({ kind: 'chop', tree: t.id, hit, wood });
    if (felled) this.events.push({ kind: 'felled', tree: t.id, wood });
    // the marker restarts from the bottom so every swing is a fresh judgement
    this.meter.value = 0; this.meter.dir = 1;
    if (this.cleared >= this.marked) { this.state = 'done'; this.events.push({ kind: 'done', tree: t.id }); }
    return { hit, damage, felled, wood };
  }

  /** Finishing place by time: quick = 1st, steady = 2nd, before sunset = 3rd, sunset first = 4th. */
  place(): number { return this.cleared < this.marked ? 4 : this.time <= 45 ? 1 : this.time <= 70 ? 2 : 3; }
  result(): { place: number; timeMs: number; wood: number; cleared: number; total: number; perfect: number } {
    return { place: this.place(), timeMs: Math.round(this.time * 1000), wood: this.wood, cleared: this.cleared, total: this.marked, perfect: this.perfect };
  }
}
