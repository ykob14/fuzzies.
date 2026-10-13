/**
 * Forest Challenge — RULES only (no DOM, no Three.js): a clearing full of trees, some of them marked with glowing rings.
 * The Fuzzy walks (shared Mover), gets close to a marked tree and chops with timing: a marker swings along a meter and a
 * tap in the sweet spot is a strong hit. Small / medium / large trees take 2 / 4 / 7 "perfect" points of damage and are worth
 * more the bigger they are; some hide a bonus. A felled tree throws out wood pieces that are collected by walking over them.
 * Perfect hits in a row chain into a multiplier. When few marked trees are left, a new wave is marked further away (bigger ones
 * as the challenge goes on). Two minutes; the score becomes a tier that pays through the adventure's `coins[]`.
 * Only marked trees can ever be cut — the others are obstacles — and nothing here touches the player's saved town.
 * Checked without a browser by `adv/forest-check.ts`.
 */
import { Clock, Combo, Mover, seeded, tierPlace, type Obstacle, type Vec2 } from './arcade';

export type Size = 'small' | 'medium' | 'large';
export interface Tree { id: number; x: number; z: number; seed: number; scale: number; size: Size; marked: boolean; bonus: boolean; hp: number; maxHp: number; felled: boolean; chops: number; wave: number }
export interface Wood { id: number; x: number; z: number; vx: number; vz: number; vy: number; y: number; value: number; gold: boolean; state: 'flying' | 'ground' | 'got'; age: number }
export type Hit = 'perfect' | 'good' | 'weak';
export interface ForestEvent { kind: 'chop' | 'felled' | 'pick' | 'wave' | 'warn' | 'timeup' | 'combo' | 'comboEnd' | 'bump' | 'target'; tree?: Tree; hit?: Hit; wood?: Wood; value?: number; mult?: number; n?: number }

export const SCORING = {
  points: { small: 20, medium: 45, large: 90 } as Record<Size, number>,
  hp: { small: 2, medium: 4, large: 7 } as Record<Size, number>,
  woodPieces: { small: 2, medium: 4, large: 7 } as Record<Size, number>,
  woodPoint: 5, bonusPoints: 60,
  ladder: [{ at: 0, mult: 1 }, { at: 3, mult: 1.5 }, { at: 6, mult: 2 }, { at: 10, mult: 3 }], window: 4,
  tiers: [1500, 950, 480] as [number, number, number],
  tierNames: ['Master lumberjack', 'Sharp axe', 'Steady chopper', 'Sawdust'],
};
export const LIMIT = 120;
export const SWEET = { lo: 0.68, hi: 0.9 }; // the meter's sweet spot (perfect), 'good' is just outside it
export const CHOP_RANGE = 2.3;
export const ARENA = { hw: 21, hd: 14 };
const PICK_RANGE = 0.95;

export class ForestSim {
  readonly trees: Tree[] = [];
  readonly woods: Wood[] = [];
  readonly you: Mover;
  readonly clock = new Clock(LIMIT);
  readonly combo = new Combo(SCORING.window, SCORING.ladder);
  readonly variant: 'classic' | 'deep';
  state: 'ready' | 'playing' | 'done' = 'ready';
  score = 0; wood = 0; perfect = 0; cleared = 0; wave = 1;
  /** the marked tree in reach (the meter runs while there is one) */
  target: number | null = null;
  meter = { value: 0, dir: 1, speed: 1.15 };
  events: ForestEvent[] = [];
  private obstacles: Obstacle[] = [];
  private rnd: () => number;
  private woodId = 0;

  constructor(variant: 'classic' | 'deep' = 'classic', seed = 7) {
    this.variant = variant;
    this.rnd = seeded(seed);
    const deep = variant === 'deep';
    // the woods: a jittered grid of trees across the clearing, a free patch in the middle where you start
    const cols = deep ? 10 : 9, rows = deep ? 7 : 6;
    let id = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = -ARENA.hw + 2.5 + (c + 0.5) * ((ARENA.hw * 2 - 5) / cols) + (this.rnd() - 0.5) * 1.8;
      const z = -ARENA.hd + 2 + (r + 0.5) * ((ARENA.hd * 2 - 4) / rows) + (this.rnd() - 0.5) * 1.6;
      if (Math.hypot(x, z - 6) < 3.2) continue; // the start patch stays open
      const roll = this.rnd();
      const size: Size = roll < (deep ? 0.3 : 0.42) ? 'small' : roll < (deep ? 0.68 : 0.8) ? 'medium' : 'large';
      const scale = size === 'small' ? 0.95 + this.rnd() * 0.2 : size === 'medium' ? 1.3 + this.rnd() * 0.25 : 1.75 + this.rnd() * 0.3;
      this.trees.push({ id: id++, x, z, seed: 11 + id * 7 + Math.floor(this.rnd() * 3), scale, size, marked: false, bonus: false, hp: SCORING.hp[size], maxHp: SCORING.hp[size], felled: false, chops: 0, wave: 0 });
    }
    this.you = new Mover({ accel: 16, max: 5.8, friction: 3.4, turn: 10, radius: 0.5, bounds: ARENA }, this.obstacles);
    this.you.pos = { x: 0, z: 6 };
    this.rebuildObstacles();
    this.markWave(deep ? 9 : 8, true);
  }

  private rebuildObstacles(): void {
    this.obstacles.length = 0;
    for (const t of this.trees) if (!t.felled) this.obstacles.push({ kind: 'circle', x: t.x, z: t.z, r: 0.3 * t.scale + 0.15 });
  }

  /** Mark `n` more trees: spread out, preferring unmarked ones further from the Fuzzy; later waves favour bigger trees. */
  private markWave(n: number, first = false): void {
    const pool = this.trees.filter((t) => !t.felled && !t.marked);
    const want: Size[] = first ? ['small', 'small', 'medium', 'small', 'medium', 'large', 'medium', 'small', 'large'] : this.wave === 2 ? ['medium', 'small', 'large', 'medium', 'large'] : ['large', 'medium', 'large', 'large', 'medium'];
    const picked: Tree[] = [];
    for (let i = 0; i < n && pool.length; i++) {
      const sizeWant = want[i % want.length];
      // score each candidate: right size, far from the player, not next to another pick
      let best: Tree | null = null, bs = -Infinity;
      for (const t of pool) {
        if (picked.includes(t)) continue;
        const dp = Math.hypot(t.x - this.you.pos.x, t.z - this.you.pos.z);
        const near = picked.reduce((m, p) => Math.min(m, Math.hypot(t.x - p.x, t.z - p.z)), 99);
        const sc = (t.size === sizeWant ? 6 : 0) + Math.min(dp, 18) * (first ? 0.25 : 0.5) + Math.min(near, 8) * 0.8 + this.rnd() * 2;
        if (sc > bs) { bs = sc; best = t; }
      }
      if (!best) break;
      picked.push(best);
    }
    for (const t of picked) { t.marked = true; t.wave = this.wave; t.bonus = this.rnd() < (this.variant === 'deep' ? 0.3 : 0.2) || (t.size === 'large' && this.rnd() < 0.3); }
    if (!first) this.events.push({ kind: 'wave', n: this.wave });
  }

  get remaining(): number { return this.trees.filter((t) => t.marked && !t.felled).length; }
  get markedTotal(): number { return this.trees.filter((t) => t.marked).length; }
  tree(id: number): Tree | undefined { return this.trees[id]; }

  start(): void { if (this.state === 'ready') this.state = 'playing'; }

  step(dt: number, input: Vec2): void {
    this.events.length = 0;
    if (this.state !== 'playing') return;
    const w = this.clock.step(dt);
    if (w === 'timeup') { this.state = 'done'; this.target = null; this.events.push({ kind: 'timeup' }); return; }
    if (typeof w === 'number') this.events.push({ kind: 'warn', n: w });
    const wasBlocked = this.you.blocked;
    this.you.step(dt, input);
    if (this.you.blocked && !wasBlocked && this.you.speed > 2) this.events.push({ kind: 'bump' });
    if (this.combo.step(dt)) this.events.push({ kind: 'comboEnd' });
    // the nearest marked tree in reach becomes the target; the meter swings while there is one
    let best: Tree | null = null, bd = CHOP_RANGE;
    for (const t of this.trees) { if (!t.marked || t.felled) continue; const d = Math.hypot(t.x - this.you.pos.x, t.z - this.you.pos.z) - 0.3 * t.scale; if (d < bd) { bd = d; best = t; } }
    const id = best ? best.id : null;
    if (id !== this.target) { this.target = id; this.meter = { value: 0, dir: 1, speed: 1.15 }; this.events.push({ kind: 'target', tree: best ?? undefined }); }
    if (this.target !== null) {
      const m = this.meter;
      m.value += m.dir * (m.speed + this.clock.k * 0.3) * dt;
      if (m.value >= 1) { m.value = 1; m.dir = -1; } else if (m.value <= 0) { m.value = 0; m.dir = 1; }
    }
    // wood pieces fly out, land, and are picked up by walking over them
    for (const p of this.woods) {
      if (p.state === 'got') continue;
      p.age += dt;
      if (p.state === 'flying') {
        p.vy -= 12 * dt; p.y += p.vy * dt; p.x += p.vx * dt; p.z += p.vz * dt;
        if (p.y <= 0) { p.y = 0; p.state = 'ground'; p.vx = p.vz = 0; p.x = Math.max(-ARENA.hw + 0.5, Math.min(ARENA.hw - 0.5, p.x)); p.z = Math.max(-ARENA.hd + 0.5, Math.min(ARENA.hd - 0.5, p.z)); }
      } else if (Math.hypot(p.x - this.you.pos.x, p.z - this.you.pos.z) < PICK_RANGE) {
        p.state = 'got';
        this.wood++;
        this.score += p.value;
        this.events.push({ kind: 'pick', wood: p, value: p.value });
      }
    }
  }

  /** Swing the axe at the tree in reach. Timing decides the hit: perfect (sweet spot), good (near it) or weak. */
  chop(): { hit: Hit; damage: number; felled: boolean; tree: Tree } | null {
    if (this.state !== 'playing' || this.target === null) return null;
    const t = this.trees[this.target];
    if (!t || t.felled) return null;
    const v = this.meter.value;
    const hit: Hit = v >= SWEET.lo && v <= SWEET.hi ? 'perfect' : v >= SWEET.lo - 0.2 && v <= Math.min(1, SWEET.hi + 0.08) ? 'good' : 'weak';
    const damage = hit === 'perfect' ? 2 : hit === 'good' ? 1.4 : 0.6;
    t.hp = Math.max(0, t.hp - damage);
    t.chops++;
    let mult = this.combo.mult;
    if (hit === 'perfect') { this.perfect++; mult = this.combo.hit(); if (this.combo.chain === this.combo.ladder.find((l) => l.mult === mult && l.at > 0)?.at) this.events.push({ kind: 'combo', mult, n: this.combo.chain }); }
    else if (hit === 'weak' && this.combo.chain > 0) { this.combo.reset(); this.events.push({ kind: 'comboEnd' }); mult = 1; }
    this.events.push({ kind: 'chop', tree: t, hit });
    let felled = false;
    if (t.hp <= 0) {
      felled = true; t.felled = true; this.cleared++;
      const points = Math.round(SCORING.points[t.size] * mult) + (t.bonus ? SCORING.bonusPoints : 0);
      this.score += points;
      this.events.push({ kind: 'felled', tree: t, value: points, mult });
      // wood flies out around the stump (a golden piece for a bonus tree)
      const n = SCORING.woodPieces[t.size];
      for (let i = 0; i < n + (t.bonus ? 1 : 0); i++) {
        const a = this.rnd() * Math.PI * 2, sp = 2 + this.rnd() * 2.5, gold = t.bonus && i === n;
        this.woods.push({ id: this.woodId++, x: t.x, z: t.z, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: 3.5 + this.rnd() * 2, y: 0.8, value: gold ? SCORING.woodPoint * 4 : SCORING.woodPoint, gold, state: 'flying', age: 0 });
      }
      this.rebuildObstacles();
      this.target = null;
      if (this.remaining <= 2) { this.wave++; this.markWave(this.variant === 'deep' ? 5 : 4); }
    }
    // the marker restarts from the bottom so every swing is a fresh judgement
    this.meter.value = 0; this.meter.dir = 1;
    return { hit, damage, felled, tree: t };
  }

  place(): number { return tierPlace(this.score, SCORING.tiers); }
  result(): { place: number; score: number; timeMs: number; wood: number; cleared: number; total: number; perfect: number; bestCombo: number; tier: string } {
    const place = this.place();
    return { place, score: this.score, timeMs: Math.round(this.clock.time * 1000), wood: this.wood, cleared: this.cleared, total: this.markedTotal, perfect: this.perfect, bestCombo: this.combo.best, tier: SCORING.tierNames[place - 1] };
  }
}
