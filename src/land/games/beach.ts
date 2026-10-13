/**
 * Beach Cleanup — RULES only (no DOM, no Three.js): the tide left litter all over the sand and keeps washing more up. Walk
 * over litter to bag it (a piece 10, a bottle 20; the bag holds 6), empty a full bag in the bin for +60. The tide rolls in
 * and out: litter left in the wet sand for a few seconds is washed away. Crabs scuttle along the water line — brush one and
 * it pinches: two pieces fall out of your bag. HOP (the action) jumps you forward out of their way. 70 seconds.
 * Checked by `adv/beach-check.ts`.
 */
import { Clock, Mover, seeded, tierPlace, freeSpot, type Obstacle, type Vec2 } from '../arcade';

export type LitterKind = 'can' | 'bag' | 'bottle' | 'wrapper';
export interface Litter { id: number; kind: LitterKind; x: number; z: number; wet: number; state: 'sand' | 'bagged' | 'washed'; /** already paid for once (a piece a crab knocked out pays nothing the second time) */ paid: boolean }
export interface Crab { id: number; x: number; z: number; vx: number; pause: number }
export interface BeachEvent { kind: 'pick' | 'full' | 'empty' | 'washed' | 'washup' | 'pinch' | 'hop' | 'tide' | 'warn' | 'timeup' | 'bump'; litter?: Litter; crab?: Crab; value?: number; n?: number }

export const SCORING = {
  points: { can: 10, bag: 10, bottle: 20, wrapper: 10 } as Record<LitterKind, number>,
  binBonus: 60,
  tiers: [590, 350, 150] as [number, number, number],
  tierNames: ['Beach guardian', 'Tide tamer', 'Sand sweeper', 'Sunbather'],
};
export const LIMIT = 70;
export const BEACH = { hw: 12, hd: 7 };
export const BIN: Vec2 = { x: BEACH.hw - 1.6, z: BEACH.hd - 1.4 };
export const BAG = 6;
export const PICK = 0.75;
export const TIDE = { period: 22, reach: 3.6, washAfter: 2.5 };
export const CRABS = 3;
export const CRAB = { r: 0.65, speed: 1.4, drop: 2, stun: 1.0 };
export const HOP = { time: 0.45, dist: 1.6 };
export const WASHUP: [number, number] = [2.4, 3.8];
export const MOVE = { accel: 32, max: 4.8, friction: 6, turn: 10, radius: 0.32 };

export class BeachSim {
  readonly clock = new Clock(LIMIT);
  readonly obstacles: Obstacle[] = [];
  readonly you: Mover;
  litter: Litter[] = [];
  crabs: Crab[] = [];
  state: 'ready' | 'playing' | 'done' = 'ready';
  score = 0; picked = 0; emptied = 0; fullBags = 0; washed = 0; pinches = 0; hops = 0;
  bag: Litter[] = [];
  /** seconds left in a hop (crabs can't pinch, you glide forward) and a pinch daze */
  hopping = 0; daze = 0;
  events: BeachEvent[] = [];
  private rnd: () => number;
  private nextId = 0; private washT = 3; private bumpCool = 0; private pinchCool = 0; private wasHigh = false;

  constructor(_variant: string | null | undefined, seed = 7) {
    this.rnd = seeded(seed);
    // a lifeguard chair, a parasol, two rocks, the bin
    this.obstacles.push({ kind: 'box', x: -BEACH.hw + 2, z: BEACH.hd - 2, hw: 0.6, hd: 0.6 });
    this.obstacles.push({ kind: 'circle', x: 2, z: BEACH.hd - 2.2, r: 0.2 });
    this.obstacles.push({ kind: 'circle', x: -4, z: -1, r: 0.8 }); this.obstacles.push({ kind: 'circle', x: 6.5, z: 0.5, r: 0.6 });
    this.obstacles.push({ kind: 'box', x: BIN.x, z: BIN.z, hw: 0.45, hd: 0.45 });
    this.you = new Mover({ ...MOVE, bounds: BEACH }, this.obstacles);
    this.you.pos = { x: -2, z: BEACH.hd - 1.5 };
    for (let i = 0; i < 18; i++) this.drop((this.rnd() - 0.5) * 2 * (BEACH.hw - 1.5), -BEACH.hd + 1 + this.rnd() * (BEACH.hd * 2 - 3), true);
    for (let i = 0; i < CRABS; i++) this.crabs.push({ id: i, x: -BEACH.hw + 2 + i * (BEACH.hw * 2 - 4) / (CRABS - 1), z: -BEACH.hd + 1.2 + this.rnd() * 1.4, vx: (i % 2 ? 1 : -1) * CRAB.speed, pause: 0 });
    this.events.length = 0;
  }

  start(): void { if (this.state === 'ready') this.state = 'playing'; }
  get sand(): Litter[] { return this.litter.filter((l) => l.state === 'sand'); }
  /** 0 (out) → 1 (in): how far up the beach the water reaches right now */
  get tide(): number { return 0.5 - 0.5 * Math.cos((this.clock.time / TIDE.period) * Math.PI * 2); }
  /** the water's edge (z); sand north of it is under water */
  get waterZ(): number { return -BEACH.hd + 0.4 + this.tide * TIDE.reach; }
  get atBin(): boolean { return Math.hypot(BIN.x - this.you.pos.x, BIN.z - this.you.pos.z) < 1.4; }
  private drop(x: number, z: number, silent = false): Litter | null {
    const p = { x: Math.max(-BEACH.hw + 0.6, Math.min(BEACH.hw - 0.6, x)), z: Math.max(-BEACH.hd + 0.6, Math.min(BEACH.hd - 0.6, z)) };
    if (!freeSpot(p, this.obstacles, 0.5)) return null;
    const r = this.rnd(); const kind: LitterKind = r < 0.25 ? 'bottle' : r < 0.5 ? 'can' : r < 0.75 ? 'bag' : 'wrapper';
    const l: Litter = { id: this.nextId++, kind, x: p.x, z: p.z, wet: 0, state: 'sand', paid: false };
    this.litter.push(l); if (!silent) this.events.push({ kind: 'washup', litter: l });
    return l;
  }
  /** HOP: a little jump forward (crabs can't pinch you in the air) */
  hop(): boolean { if (this.state !== 'playing' || this.hopping > 0 || this.daze > 0) return false; this.hopping = HOP.time; this.hops++; this.events.push({ kind: 'hop' }); return true; }

  step(dt: number, input: Vec2): void {
    this.events.length = 0;
    if (this.state !== 'playing') return;
    const w = this.clock.step(dt);
    if (w === 'timeup') { this.state = 'done'; this.events.push({ kind: 'timeup' }); return; }
    if (typeof w === 'number') this.events.push({ kind: 'warn', n: w });
    this.daze = Math.max(0, this.daze - dt); this.bumpCool -= dt; this.pinchCool -= dt;
    if (this.hopping > 0) { this.hopping -= dt; const fx = Math.sin(this.you.heading), fz = Math.cos(this.you.heading); this.you.step(dt, { x: fx * 1.3, z: fz * 1.3 }); }
    else this.you.step(dt, this.daze > 0 ? { x: 0, z: 0 } : { x: input.x || 0, z: input.z || 0 });
    if (this.you.blocked && this.you.speed > 2.2 && this.bumpCool <= 0) { this.bumpCool = 0.6; this.events.push({ kind: 'bump' }); }
    // picking up litter
    for (const l of this.sand) {
      if (this.bag.length >= BAG) break;
      if (Math.hypot(l.x - this.you.pos.x, l.z - this.you.pos.z) < PICK) {
        l.state = 'bagged'; this.bag.push(l); const value = l.paid ? 0 : SCORING.points[l.kind]; if (!l.paid) this.picked++; l.paid = true; this.score += value;
        this.events.push({ kind: 'pick', litter: l, value });
        if (this.bag.length >= BAG) this.events.push({ kind: 'full' });
      }
    }
    // the bin
    if (this.atBin && this.bag.length) { const full = this.bag.length >= BAG; const n = this.bag.length; this.bag = []; this.emptied++; if (full) { this.fullBags++; this.score += SCORING.binBonus; } this.events.push({ kind: 'empty', n, value: full ? SCORING.binBonus : 0 }); }
    // the tide: wet litter washes away; turning tides are announced
    const wz = this.waterZ; const high = this.tide > 0.5;
    if (high !== this.wasHigh) { this.wasHigh = high; this.events.push({ kind: 'tide', n: high ? 1 : 0 }); }
    for (const l of this.sand) { if (l.z < wz) { l.wet += dt; if (l.wet >= TIDE.washAfter) { l.state = 'washed'; this.washed++; this.events.push({ kind: 'washed', litter: l }); } } else l.wet = Math.max(0, l.wet - dt); }
    // more washes up along the water line
    this.washT -= dt;
    if (this.washT <= 0) { this.washT = WASHUP[0] + this.rnd() * (WASHUP[1] - WASHUP[0]) - this.clock.k * 0.8; if (this.sand.length < 30) this.drop((this.rnd() - 0.5) * 2 * (BEACH.hw - 1.5), wz + 0.3 + this.rnd() * 1.2); }
    // crabs scuttle along the water line and pinch
    for (const c of this.crabs) {
      c.pause -= dt;
      if (c.pause <= 0) { c.x += c.vx * dt; if (Math.abs(c.x) > BEACH.hw - 1) { c.x = Math.sign(c.x) * (BEACH.hw - 1); c.vx = -c.vx; } if (this.rnd() < dt * 0.15) c.pause = 0.6 + this.rnd(); if (this.rnd() < dt * 0.1) c.vx = -c.vx; }
      c.z = Math.max(-BEACH.hd + 0.8, Math.min(wz + 1.6, c.z + (wz + 0.9 - c.z) * dt * 0.5));
      if (this.hopping <= 0 && this.pinchCool <= 0 && Math.hypot(c.x - this.you.pos.x, c.z - this.you.pos.z) < CRAB.r) {
        this.pinchCool = 1.2; this.pinches++; this.daze = CRAB.stun;
        const dropped = this.bag.splice(Math.max(0, this.bag.length - CRAB.drop), CRAB.drop);
        for (const l of dropped) { l.state = 'sand'; l.wet = 0; l.x = Math.max(-BEACH.hw + 0.6, Math.min(BEACH.hw - 0.6, this.you.pos.x + (this.rnd() - 0.5) * 2)); l.z = Math.max(-BEACH.hd + 0.6, Math.min(BEACH.hd - 0.6, this.you.pos.z + 0.6 + this.rnd() * 1.2)); }
        this.events.push({ kind: 'pinch', crab: c, n: dropped.length });
      }
    }
    if (this.litter.length > 90) this.litter = this.litter.filter((l) => l.state !== 'washed').concat(this.litter.filter((l) => l.state === 'washed').slice(-10));
  }

  place(): number { return tierPlace(this.score, SCORING.tiers); }
  result(): { place: number; score: number; timeMs: number; tier: string; stats: { label: string; value: string }[] } {
    const place = this.place();
    return { place, score: this.score, timeMs: Math.round(this.clock.time * 1000), tier: SCORING.tierNames[place - 1], stats: [{ label: 'Litter bagged', value: String(this.picked) }, { label: 'Full bags binned', value: String(this.fullBags) }, { label: 'Washed away', value: String(this.washed) }, { label: 'Crab pinches', value: String(this.pinches) }] };
  }
}
