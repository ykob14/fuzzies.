/**
 * Package Delivery — RULES only (no DOM, no Three.js): a town square with six coloured houses round the edge and the depot at
 * the bottom. Pull the little cart (it has momentum — it slides and swings) to the depot to load up to three parcels, then
 * to each parcel's house (the door glows). A delivery is 40, a fast one (within 14 s of loading) 60. Bumping into things
 * knocks a parcel off the cart — walk over it to pick it up again. New orders keep arriving. Two minutes.
 * Checked without a browser by `adv/delivery-check.ts`.
 */
import { Clock, Mover, seeded, tierPlace, type Obstacle, type Vec2 } from '../arcade';

export interface House { id: number; x: number; z: number; door: Vec2; color: number; hw: number; hd: number }
export interface Parcel { id: number; house: number; loadedAt: number; droppedAt: number; state: 'waiting' | 'cart' | 'ground' | 'done'; x: number; z: number }
export interface DeliveryEvent { kind: 'load' | 'deliver' | 'drop' | 'pickup' | 'order' | 'bump' | 'warn' | 'timeup'; parcel?: Parcel; house?: House; value?: number; fast?: boolean; n?: number }

export const SCORING = {
  delivery: 40, fast: 60, fastWithin: 14,
  tiers: [1300, 900, 400] as [number, number, number],
  tierNames: ['Express legend', 'Reliable courier', 'Part-time postie', 'Lost the map'],
};
export const LIMIT = 120;
export const SQUARE = { hw: 12, hd: 9 };
export const CART = { accel: 18, max: 5.6, friction: 2.0, turn: 5.5, radius: 0.5 };
export const CAPACITY = 3;
export const REACH = 1.3;
export const DEPOT: Vec2 = { x: 0, z: SQUARE.hd - 1.6 };
export const WAITING = 3;
export const BUMP = { speed: 2.6, stun: 0.5, cool: 0.8 };
export const COLORS = 6;

export class DeliverySim {
  readonly clock = new Clock(LIMIT);
  readonly houses: House[] = [];
  readonly obstacles: Obstacle[] = [];
  readonly you: Mover;
  parcels: Parcel[] = [];
  state: 'ready' | 'playing' | 'done' = 'ready';
  score = 0; delivered = 0; fastOnes = 0; drops = 0; bumps = 0; loaded = 0;
  stun = 0;
  events: DeliveryEvent[] = [];
  private rnd: () => number;
  private nextId = 0; private bumpCool = 0;

  constructor(_variant: string | null | undefined, seed = 7) {
    this.rnd = seeded(seed);
    // six houses: three along the top, one on each side, one more on the left bottom; doors face the square
    const spots: [number, number, number][] = [[-7.5, -SQUARE.hd + 1.4, 0], [0, -SQUARE.hd + 1.4, 0], [7.5, -SQUARE.hd + 1.4, 0], [-SQUARE.hw + 1.4, -1.5, 1], [SQUARE.hw - 1.4, -1.5, -1], [-SQUARE.hw + 1.4, 4.5, 1]];
    spots.forEach(([x, z, side], i) => {
      const hw = side === 0 ? 1.6 : 1.1, hd = side === 0 ? 1.1 : 1.6;
      const door = side === 0 ? { x, z: z + hd + 0.9 } : { x: x + side * (hw + 0.9), z };
      this.houses.push({ id: i, x, z, door, color: i % COLORS, hw, hd });
      this.obstacles.push({ kind: 'box', x, z, hw, hd });
    });
    // the depot counter, a small flower bed in the middle, four lamp posts
    this.obstacles.push({ kind: 'box', x: DEPOT.x, z: SQUARE.hd - 0.5, hw: 1.8, hd: 0.5 });
    this.obstacles.push({ kind: 'circle', x: 0.5, z: -0.5, r: 0.8 });
    for (const [x, z] of [[-4.5, 2.5], [4.5, 2.5], [-4.5, -4], [4.5, -4]]) this.obstacles.push({ kind: 'circle', x, z, r: 0.18 });
    this.you = new Mover({ ...CART, bounds: SQUARE }, this.obstacles);
    this.you.pos = { x: DEPOT.x - 2.5, z: DEPOT.z };
    for (let i = 0; i < WAITING; i++) this.order();
    this.events.length = 0;
  }

  start(): void { if (this.state === 'ready') this.state = 'playing'; }
  get waiting(): Parcel[] { return this.parcels.filter((p) => p.state === 'waiting'); }
  get cart(): Parcel[] { return this.parcels.filter((p) => p.state === 'cart'); }
  get ground(): Parcel[] { return this.parcels.filter((p) => p.state === 'ground'); }
  private order(): Parcel {
    // spread the orders over the houses: never the same house as the last two waiting
    const recent = this.waiting.slice(-2).map((p) => p.house);
    let h = Math.floor(this.rnd() * this.houses.length); let tries = 0;
    while (recent.includes(h) && tries++ < 6) h = Math.floor(this.rnd() * this.houses.length);
    const p: Parcel = { id: this.nextId++, house: h, loadedAt: 0, droppedAt: -9, state: 'waiting', x: DEPOT.x, z: DEPOT.z };
    this.parcels.push(p); this.events.push({ kind: 'order', parcel: p });
    return p;
  }
  near(p: Vec2, r = REACH): boolean { return Math.hypot(p.x - this.you.pos.x, p.z - this.you.pos.z) < r; }

  step(dt: number, input: Vec2): void {
    this.events.length = 0;
    if (this.state !== 'playing') return;
    const w = this.clock.step(dt);
    if (w === 'timeup') { this.state = 'done'; this.events.push({ kind: 'timeup' }); return; }
    if (typeof w === 'number') this.events.push({ kind: 'warn', n: w });
    this.stun = Math.max(0, this.stun - dt); this.bumpCool -= dt;
    const vx0 = this.you.vel.x, vz0 = this.you.vel.z;
    this.you.step(dt, this.stun > 0 ? { x: 0, z: 0 } : { x: input.x || 0, z: input.z || 0 });
    // a hard bump (a sudden loss of speed against something — sliding along a wall is fine) knocks a parcel off
    const lost = Math.hypot(this.you.vel.x - vx0, this.you.vel.z - vz0);
    if (this.you.blocked && lost > BUMP.speed && this.bumpCool <= 0) {
      this.bumpCool = BUMP.cool; this.bumps++; this.stun = BUMP.stun;
      const onCart = this.cart;
      if (onCart.length) { // it tumbles off the back of the cart and can be picked up again in a moment (no longer a fast delivery)
        const p = onCart[onCart.length - 1]; const h = this.you.heading; p.state = 'ground'; p.droppedAt = this.clock.time; p.loadedAt = -99;
        p.x = Math.max(-SQUARE.hw + 0.5, Math.min(SQUARE.hw - 0.5, this.you.pos.x - Math.sin(h) * 1.5 + (this.rnd() - 0.5) * 0.8)); p.z = Math.max(-SQUARE.hd + 0.5, Math.min(SQUARE.hd - 0.5, this.you.pos.z - Math.cos(h) * 1.5 + (this.rnd() - 0.5) * 0.8));
        this.drops++; this.events.push({ kind: 'drop', parcel: p });
      }
      this.events.push({ kind: 'bump' });
    }
    // the depot: load whatever is waiting while there's room
    if (this.near(DEPOT, REACH + 0.4)) {
      let n = 0;
      for (const p of this.waiting) { if (this.cart.length >= CAPACITY) break; p.state = 'cart'; p.loadedAt = this.clock.time; this.loaded++; n++; }
      if (n) { this.events.push({ kind: 'load', n }); while (this.waiting.length < WAITING) this.order(); }
    }
    // dropped parcels: walk over to pick up (if there's room)
    for (const p of this.ground) if (this.cart.length < CAPACITY && this.clock.time - p.droppedAt > 1.2 && this.near(p, 0.9)) { p.state = 'cart'; this.events.push({ kind: 'pickup', parcel: p }); }
    // houses: deliver what's theirs
    for (const h of this.houses) {
      if (!this.near(h.door)) continue;
      for (const p of this.cart) if (p.house === h.id) {
        p.state = 'done'; const fast = this.clock.time - p.loadedAt <= SCORING.fastWithin; const value = fast ? SCORING.fast : SCORING.delivery;
        this.score += value; this.delivered++; if (fast) this.fastOnes++;
        this.events.push({ kind: 'deliver', parcel: p, house: h, value, fast });
      }
    }
    if (this.parcels.length > 60) this.parcels = this.parcels.filter((p) => p.state !== 'done').concat(this.parcels.filter((p) => p.state === 'done').slice(-10));
  }

  place(): number { return tierPlace(this.score, SCORING.tiers); }
  result(): { place: number; score: number; timeMs: number; tier: string; stats: { label: string; value: string }[] } {
    const place = this.place();
    return { place, score: this.score, timeMs: Math.round(this.clock.time * 1000), tier: SCORING.tierNames[place - 1], stats: [{ label: 'Delivered', value: String(this.delivered) }, { label: 'Fast', value: String(this.fastOnes) }, { label: 'Dropped', value: String(this.drops) }, { label: 'Bumps', value: String(this.bumps) }] };
  }
}
