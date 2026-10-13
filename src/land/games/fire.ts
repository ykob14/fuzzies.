/**
 * Firefighter Fuzzy — RULES only (no DOM, no Three.js): a campsite by a pond with four cottages. Flames grow and spread (and
 * towards the cottages); walk up to a fire and HOLD SPRAY until it's out (small 20, big 50). A cottage that catches fire
 * burns down in 25 s (−50) unless you put its flames out (+100 the first time it's saved). The tank empties as you spray —
 * refill at the pond. The embers keep flaring up for the first 38 s; after that, every fire out = the seconds left as a
 * bonus. 100 seconds. Checked by `adv/fire-check.ts`.
 */
import { Clock, Mover, seeded, tierPlace, freeSpot, type Obstacle, type Vec2 } from '../arcade';

export interface Flame { id: number; x: number; z: number; size: number; peak: number; cottage: number; state: 'burning' | 'out' }
export interface Cottage { id: number; x: number; z: number; hw: number; hd: number; burn: number; state: 'fine' | 'burning' | 'saved' | 'lost' }
export interface FireEvent { kind: 'spray' | 'out' | 'spread' | 'flare' | 'catch' | 'saved' | 'lost' | 'empty' | 'refill' | 'refilled' | 'allout' | 'warn' | 'timeup' | 'bump'; flame?: Flame; cottage?: Cottage; value?: number; big?: boolean; n?: number }

export const SCORING = {
  small: 20, big: 50, saved: 100, lost: 50, timeLeft: 1,
  tiers: [490, 330, 120] as [number, number, number],
  tierNames: ['Fire chief', 'Brave firefighter', 'Bucket helper', 'Still looking for the hose'],
};
export const LIMIT = 100;
export const CAMP = { hw: 11, hd: 8 };
export const POND: Vec2 = { x: -CAMP.hw + 3.2, z: CAMP.hd - 3 };
export const POND_R = 2.2;
export const CAMPFIRE: Vec2 = { x: -1, z: -0.5 };
/** the embers keep flaring up until this many seconds have passed; only after that can the fire be truly out */
export const EMBERS = 38;
export const TANK = 100;
export const SPRAY = { use: 16, rate: 0.5, range: 2.6, cone: 0.55 };
export const REFILL = 50;
export const GROW = 0.07;
export const BIG = 0.6;
export const SPREAD = { every: [3.2, 4.6] as [number, number], from: 0.55, dist: [1.6, 2.6] as [number, number], max: 14 };
export const CATCH_R = 1.7;
export const BURN_TIME = 25;
export const MOVE = { accel: 32, max: 4.8, friction: 6, turn: 10, radius: 0.34 };

export class FireSim {
  readonly clock = new Clock(LIMIT);
  readonly cottages: Cottage[] = [];
  readonly obstacles: Obstacle[] = [];
  readonly you: Mover;
  flames: Flame[] = [];
  state: 'ready' | 'playing' | 'done' = 'ready';
  score = 0; out = 0; bigOut = 0; saved = 0; lostCottages = 0; refills = 0; bonus = 0; allOut = false;
  tank = TANK;
  /** spraying right now (the action is held and water is left) and the flame being hit */
  spraying = false; target: Flame | null = null;
  events: FireEvent[] = [];
  private rnd: () => number;
  private nextId = 0; private spreadT = 3.5; private wasEmpty = false; private refilling = false; private bumpCool = 0;

  constructor(_variant: string | null | undefined, seed = 7) {
    this.rnd = seeded(seed);
    const spots: [number, number][] = [[-6, -5], [3, -5.5], [8, 0.5], [5, 5.5]];
    spots.forEach(([x, z], i) => { this.cottages.push({ id: i, x, z, hw: 1.5, hd: 1.2, burn: 0, state: 'fine' }); this.obstacles.push({ kind: 'box', x, z, hw: 1.5, hd: 1.2 }); });
    this.obstacles.push({ kind: 'circle', x: POND.x, z: POND.z, r: POND_R - 0.4 });
    for (let i = 0; i < 6; i++) { const p = { x: (this.rnd() - 0.5) * 2 * (CAMP.hw - 1.5), z: (this.rnd() - 0.5) * 2 * (CAMP.hd - 1.5) }; if (freeSpot(p, this.obstacles, 1.2) && Math.hypot(p.x - POND.x, p.z - POND.z) > POND_R + 1.5) this.obstacles.push({ kind: 'circle', x: p.x, z: p.z, r: 0.45 }); }
    this.you = new Mover({ ...MOVE, bounds: CAMP }, this.obstacles);
    this.you.pos = { x: -1, z: CAMP.hd - 1.3 };
    // the campfire got away: four flames around it in the middle of the camp
    this.flare(4, 0.25);
    this.events.length = 0;
  }

  start(): void { if (this.state === 'ready') this.state = 'playing'; }
  /** embers from the campfire flare up: n new flames near it */
  private flare(n: number, size: number): number { let lit = 0; for (let tries = 0; tries < 40 && lit < n; tries++) { const an = this.rnd() * Math.PI * 2, d = 0.8 + this.rnd() * 2.6; if (this.light(CAMPFIRE.x + Math.sin(an) * d, CAMPFIRE.z + Math.cos(an) * d, size + this.rnd() * 0.2)) lit++; } return lit; }
  get burning(): Flame[] { return this.flames.filter((f) => f.state === 'burning'); }
  private light(x: number, z: number, size: number, cottage = -1): Flame | null {
    const p = { x: Math.max(-CAMP.hw + 0.6, Math.min(CAMP.hw - 0.6, x)), z: Math.max(-CAMP.hd + 0.6, Math.min(CAMP.hd - 0.6, z)) };
    if (cottage < 0) { if (Math.hypot(p.x - POND.x, p.z - POND.z) < POND_R + 0.3) return null; if (!freeSpot(p, this.obstacles, 0.5)) return null; if (this.burning.some((f) => Math.hypot(f.x - p.x, f.z - p.z) < 1.1)) return null; }
    const f: Flame = { id: this.nextId++, x: p.x, z: p.z, size, peak: size, cottage, state: 'burning' };
    this.flames.push(f); return f;
  }
  /** the flame in front of you within spraying range (closest in the cone, else the closest in range) */
  inFront(): Flame | null {
    const fx = Math.sin(this.you.heading), fz = Math.cos(this.you.heading);
    let best: Flame | null = null, bd = Infinity;
    for (const f of this.burning) { const dx = f.x - this.you.pos.x, dz = f.z - this.you.pos.z, d = Math.hypot(dx, dz); if (d > SPRAY.range) continue; const dot = (dx * fx + dz * fz) / (d || 1); const score = d - (dot > SPRAY.cone ? 1.5 : 0); if (score < bd) { bd = score; best = f; } }
    return best;
  }
  get atPond(): boolean { return Math.hypot(POND.x - this.you.pos.x, POND.z - this.you.pos.z) < POND_R + 1.1; }

  step(dt: number, input: Vec2, hold: boolean): void {
    this.events.length = 0;
    if (this.state !== 'playing') return;
    const w = this.clock.step(dt);
    if (w === 'timeup') { this.state = 'done'; this.events.push({ kind: 'timeup' }); return; }
    if (typeof w === 'number') this.events.push({ kind: 'warn', n: w });
    // spraying roots you; the tank drains
    const f = hold && this.tank > 0 ? this.inFront() : null;
    if (hold && this.tank <= 0 && !this.wasEmpty) { this.wasEmpty = true; this.events.push({ kind: 'empty' }); }
    if (f) {
      if (!this.spraying || this.target !== f) this.events.push({ kind: 'spray', flame: f });
      this.spraying = true; this.target = f;
      this.tank = Math.max(0, this.tank - SPRAY.use * dt);
      f.size -= SPRAY.rate * dt;
      this.you.step(dt, { x: 0, z: 0 });
      if (f.size <= 0) {
        f.state = 'out'; const big = f.peak >= BIG; const value = big ? SCORING.big : SCORING.small; this.score += value; this.out++; if (big) this.bigOut++;
        this.events.push({ kind: 'out', flame: f, value, big });
        if (f.cottage >= 0) { const c = this.cottages[f.cottage]; if (c.state === 'burning' && !this.burning.some((g) => g.cottage === c.id)) { c.state = 'saved'; this.saved++; this.score += SCORING.saved; this.events.push({ kind: 'saved', cottage: c, value: SCORING.saved }); } }
        this.spraying = false; this.target = null;
      }
    } else {
      this.spraying = false; this.target = null;
      this.you.step(dt, { x: input.x || 0, z: input.z || 0 });
    }
    this.bumpCool -= dt;
    if (this.you.blocked && this.you.speed > 2.2 && this.bumpCool <= 0) { this.bumpCool = 0.6; this.events.push({ kind: 'bump' }); }
    // the pond refills the tank
    if (this.atPond && this.tank < TANK && !this.spraying) { if (!this.refilling) { this.refilling = true; this.events.push({ kind: 'refill' }); } this.tank = Math.min(TANK, this.tank + REFILL * dt); if (this.tank >= TANK) { this.refills++; this.wasEmpty = false; this.refilling = false; this.events.push({ kind: 'refilled' }); } }
    else if (!this.atPond) this.refilling = false;
    if (this.tank > 0) this.wasEmpty = false;
    // fires grow; cottages catch and burn
    for (const fl of this.burning) {
      if (fl !== this.target) fl.size = Math.min(1, fl.size + GROW * dt);
      fl.peak = Math.max(fl.peak, fl.size);
      if (fl.cottage < 0) for (const c of this.cottages) { if (c.state !== 'fine') continue; if (Math.abs(fl.x - c.x) < c.hw + CATCH_R && Math.abs(fl.z - c.z) < c.hd + CATCH_R && fl.size >= 0.5) { c.state = 'burning'; c.burn = 0; const side = fl.z < c.z ? -1 : 1; this.light(c.x + (this.rnd() - 0.5) * c.hw, c.z + side * (c.hd + 0.5), 0.5, c.id); this.events.push({ kind: 'catch', cottage: c }); } }
    }
    for (const c of this.cottages) if (c.state === 'burning') { c.burn += dt / BURN_TIME; if (c.burn >= 1) { c.state = 'lost'; this.lostCottages++; this.score = Math.max(0, this.score - SCORING.lost); for (const fl of this.burning) if (fl.cottage === c.id) fl.state = 'out'; this.events.push({ kind: 'lost', cottage: c, value: SCORING.lost }); } }
    // spreading
    this.spreadT -= dt;
    if (this.spreadT <= 0) {
      this.spreadT = SPREAD.every[0] + this.rnd() * (SPREAD.every[1] - SPREAD.every[0]) - this.clock.k * 1;
      const big = this.burning.filter((g) => g.size >= SPREAD.from && g.cottage < 0);
      if (big.length && this.burning.length < SPREAD.max) {
        const src = big[Math.floor(this.rnd() * big.length)];
        const fine = this.cottages.filter((c) => c.state === 'fine');
        let an = this.rnd() * Math.PI * 2;
        if (fine.length && this.rnd() < 0.5) { const c = fine[Math.floor(this.rnd() * fine.length)]; an = Math.atan2(c.x - src.x, c.z - src.z) + (this.rnd() - 0.5) * 0.8; }
        const d = SPREAD.dist[0] + this.rnd() * (SPREAD.dist[1] - SPREAD.dist[0]);
        const nf = this.light(src.x + Math.sin(an) * d, src.z + Math.cos(an) * d, 0.2);
        if (nf) this.events.push({ kind: 'spread', flame: nf });
      }
    }
    if (!this.burning.length) {
      if (this.clock.time < EMBERS) { const n = this.flare(2, 0.2); if (n) this.events.push({ kind: 'flare', n }); }
      else { this.allOut = true; this.bonus = Math.round(this.clock.left * SCORING.timeLeft); this.score += this.bonus; this.state = 'done'; this.events.push({ kind: 'allout', value: this.bonus }); }
    }
    if (this.flames.length > 80) this.flames = this.flames.filter((g) => g.state === 'burning').concat(this.flames.filter((g) => g.state !== 'burning').slice(-20));
  }

  place(): number { return tierPlace(this.score, SCORING.tiers); }
  result(): { place: number; score: number; timeMs: number; tier: string; stats: { label: string; value: string }[] } {
    const place = this.place();
    return { place, score: this.score, timeMs: Math.round(this.clock.time * 1000), tier: SCORING.tierNames[place - 1], stats: [{ label: 'Fires out', value: String(this.out) }, { label: 'Cottages saved', value: `${this.saved}/${this.cottages.length}` }, { label: 'Cottages lost', value: String(this.lostCottages) }, { label: this.allOut ? 'Time bonus' : 'Refills', value: this.allOut ? `+${this.bonus}` : String(this.refills) }] };
  }
}
