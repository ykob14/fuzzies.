/**
 * Garden Cleanup — RULES only (no DOM, no Three.js): a walled garden with flower beds and paths. Weeds (small and big) have
 * taken over; walk up to one and HOLD PULL until it comes out (letting go lets it dig back in). Every bed has flower buds
 * that bloom once the weeds around them are gone — walk up to a bloom to pick it (rare golden blooms are worth most).
 * Stepping into a bed tramples it (costs points and your chain). New weeds keep sprouting. Weeds 10, flowers 40, rare 90.
 * Checked without a browser by `adv/garden-check.ts`.
 */
import { Clock, Combo, Mover, seeded, tierPlace, type Obstacle, type Vec2 } from '../arcade';

export type WeedKind = 'small' | 'big';
export interface Weed { id: number; kind: WeedKind; x: number; z: number; need: number; progress: number; state: 'up' | 'pulled' }
export interface Bud { id: number; bed: number; x: number; z: number; rare: boolean; state: 'bud' | 'bloom' | 'picked'; t: number }
export interface Bed { id: number; x: number; z: number; hw: number; hd: number }
export interface GardenEvent { kind: 'pull' | 'pulling' | 'letgo' | 'bloom' | 'flower' | 'trample' | 'sprout' | 'combo' | 'comboEnd' | 'warn' | 'timeup' | 'bump'; weed?: Weed; bud?: Bud; value?: number; mult?: number; n?: number }

export const SCORING = {
  weed: 10, flower: 40, rare: 90, trample: 15,
  ladder: [{ at: 0, mult: 1 }, { at: 3, mult: 1.5 }, { at: 7, mult: 2 }],
  window: 4,
  tiers: [920, 540, 210] as [number, number, number],
  tierNames: ['Garden angel', 'Green fingers', 'Weekend weeder', 'Still in the shed'],
};
export const LIMIT = 100;
export const GARDEN = { hw: 10, hd: 7 };
export const PULL: Record<WeedKind, number> = { small: 1.2, big: 2.2 };
export const REACH = 1.1;
export const PICK = 0.7;
export const LINK = 2.4;
export const BLOOM_DELAY = 1;
export const SPROUT: [number, number] = [4, 7];
export const MAX_WEEDS = 36;
export const MOVE = { accel: 32, max: 4.8, friction: 6, turn: 10, radius: 0.32 };
/** buds sit this far inside the bed edge; stepping deeper than that into a bed is trampling */
export const EDGE = 0.3;

export class GardenSim {
  readonly clock = new Clock(LIMIT);
  readonly combo = new Combo(SCORING.window, SCORING.ladder);
  readonly beds: Bed[] = [];
  readonly obstacles: Obstacle[] = [];
  readonly you: Mover;
  weeds: Weed[] = [];
  readonly buds: Bud[] = [];
  state: 'ready' | 'playing' | 'done' = 'ready';
  score = 0; pulled = 0; flowers = 0; rares = 0; tramples = 0; sprouted = 0;
  /** the weed you're pulling right now (hold the action) */
  pulling: Weed | null = null;
  inBed = -1;
  events: GardenEvent[] = [];
  private rnd: () => number;
  private nextId = 0; private sproutT = 5; private trampleCool = 0; private bumpCool = 0;

  constructor(_variant: string | null | undefined, seed = 7) {
    this.rnd = seeded(seed);
    // four beds in the corners-ish, a fountain in the middle, a bench
    const B = [[-5.5, -3.2, 2.2, 1.3], [5.5, -3.2, 2.2, 1.3], [-5.5, 3.4, 2.2, 1.3], [5.5, 3.4, 2.2, 1.3]];
    B.forEach(([x, z, hw, hd], i) => this.beds.push({ id: i, x, z, hw, hd }));
    this.obstacles.push({ kind: 'circle', x: 0, z: 0, r: 1.3 });
    this.obstacles.push({ kind: 'box', x: 0, z: -GARDEN.hd + 1, hw: 1, hd: 0.35 });
    this.you = new Mover({ ...MOVE, bounds: GARDEN }, this.obstacles);
    this.you.pos = { x: 0, z: GARDEN.hd - 1.2 };
    // buds along both long edges of each bed (reachable from the path without stepping in)
    for (const b of this.beds) for (let i = 0; i < 5; i++) this.buds.push({ id: this.buds.length, bed: b.id, x: b.x - b.hw + 0.4 + i * ((b.hw * 2 - 0.8) / 4), z: b.z + (i % 2 ? 1 : -1) * (b.hd - EDGE), rare: this.rnd() < 0.18, state: 'bud', t: 0 });
    // weeds: a ring round each bed + some on the paths, and at least one close to every bud
    for (const b of this.beds) for (let i = 0; i < 5; i++) { const an = this.rnd() * 6.28; const r = b.hw + 0.9 + this.rnd() * 0.8; this.sprout(b.x + Math.cos(an) * r, b.z + Math.sin(an) * Math.min(r, b.hd + 1.1), this.rnd() < 0.35 ? 'big' : 'small', true); }
    for (let i = 0; i < 8; i++) this.sprout((this.rnd() - 0.5) * 2 * (GARDEN.hw - 1), (this.rnd() - 0.5) * 2 * (GARDEN.hd - 1), this.rnd() < 0.3 ? 'big' : 'small', true);
    for (const bud of this.buds) if (this.weedsNear(bud) === 0) { const b = this.beds[bud.bed]; const side = Math.sign(bud.z - b.z) || 1; this.sprout(bud.x + (this.rnd() - 0.5) * 0.8, b.z + side * (b.hd + 0.8 + this.rnd() * 0.5), 'small', true); }
    this.events.length = 0;
  }

  start(): void { if (this.state === 'ready') this.state = 'playing'; }
  get up(): Weed[] { return this.weeds.filter((w) => w.state === 'up'); }
  bedAt(p: Vec2, margin = 0): number { return this.beds.findIndex((b) => Math.abs(p.x - b.x) < b.hw - margin && Math.abs(p.z - b.z) < b.hd - margin); }
  private free(x: number, z: number): boolean {
    if (Math.abs(x) > GARDEN.hw - 0.6 || Math.abs(z) > GARDEN.hd - 0.6) return false;
    if (this.bedAt({ x, z }) >= 0) return false;
    if (Math.hypot(x, z) < 1.9) return false;
    if (Math.hypot(x - this.you.pos.x, z - this.you.pos.z) < 1.2) return false;
    return !this.weeds.some((w) => w.state === 'up' && Math.hypot(w.x - x, w.z - z) < 0.8);
  }
  private sprout(x: number, z: number, kind: WeedKind, silent = false): Weed | null {
    if (!this.free(x, z)) { for (let t = 0; t < 20 && !this.free(x, z); t++) { x = (this.rnd() - 0.5) * 2 * (GARDEN.hw - 1); z = (this.rnd() - 0.5) * 2 * (GARDEN.hd - 1); } if (!this.free(x, z)) return null; }
    const w: Weed = { id: this.nextId++, kind, x, z, need: PULL[kind], progress: 0, state: 'up' };
    this.weeds.push(w); if (!silent) { this.sprouted++; this.events.push({ kind: 'sprout', weed: w }); }
    return w;
  }
  /** the weed in reach (closest) */
  reachable(): Weed | null { let best: Weed | null = null, bd = REACH; for (const w of this.weeds) { if (w.state !== 'up') continue; const d = Math.hypot(w.x - this.you.pos.x, w.z - this.you.pos.z); if (d < bd) { bd = d; best = w; } } return best; }
  /** weeds still standing near a bud (they keep it from blooming) */
  weedsNear(b: Bud): number { return this.weeds.filter((w) => w.state === 'up' && Math.hypot(w.x - b.x, w.z - b.z) < LINK).length; }

  step(dt: number, input: Vec2, hold: boolean): void {
    this.events.length = 0;
    if (this.state !== 'playing') return;
    const w = this.clock.step(dt);
    if (w === 'timeup') { this.state = 'done'; this.events.push({ kind: 'timeup' }); return; }
    if (typeof w === 'number') this.events.push({ kind: 'warn', n: w });
    if (this.combo.step(dt)) this.events.push({ kind: 'comboEnd' });
    // pulling: hold near a weed; it roots you; let go and it digs back in
    if (hold) {
      if (!this.pulling) { const r = this.reachable(); if (r) { this.pulling = r; this.events.push({ kind: 'pulling', weed: r }); } }
      if (this.pulling) {
        this.pulling.progress += dt;
        this.you.step(dt, { x: 0, z: 0 });
        if (this.pulling.progress >= this.pulling.need) {
          const wd = this.pulling; wd.state = 'pulled'; this.pulling = null; this.pulled++;
          const mult = this.combo.hit(); const value = Math.round(SCORING.weed * mult); this.score += value;
          this.events.push({ kind: 'pull', weed: wd, value, mult });
          if (this.combo.chain === this.combo.ladder.find((l) => l.mult === mult && l.at > 0)?.at) this.events.push({ kind: 'combo', mult, n: this.combo.chain });
        }
      } else this.you.step(dt, { x: input.x || 0, z: input.z || 0 });
    } else {
      if (this.pulling) { this.events.push({ kind: 'letgo', weed: this.pulling }); this.pulling = null; }
      this.you.step(dt, { x: input.x || 0, z: input.z || 0 });
    }
    for (const wd of this.weeds) if (wd.state === 'up' && wd !== this.pulling && wd.progress > 0) wd.progress = Math.max(0, wd.progress - dt * 0.8);
    this.bumpCool -= dt; this.trampleCool -= dt;
    if (this.you.blocked && this.you.speed > 2.2 && this.bumpCool <= 0) { this.bumpCool = 0.6; this.events.push({ kind: 'bump' }); }
    // flower beds: stepping in tramples
    const bed = this.bedAt(this.you.pos, EDGE + 0.05);
    if (bed >= 0 && this.inBed !== bed && this.trampleCool <= 0) { this.trampleCool = 1.5; this.tramples++; this.score = Math.max(0, this.score - SCORING.trample); if (this.combo.chain > 0) { this.combo.reset(); this.events.push({ kind: 'comboEnd' }); } this.events.push({ kind: 'trample', n: bed, value: SCORING.trample }); }
    this.inBed = bed;
    // buds bloom once their weeds are gone; blooms are picked by walking over them
    for (const b of this.buds) {
      if (b.state === 'bud') { if (this.weedsNear(b) === 0) { b.t += dt; if (b.t >= BLOOM_DELAY) { b.state = 'bloom'; b.t = 0; this.events.push({ kind: 'bloom', bud: b }); } } else b.t = 0; }
      else if (b.state === 'bloom' && Math.hypot(b.x - this.you.pos.x, b.z - this.you.pos.z) < PICK) {
        b.state = 'picked'; const value = b.rare ? SCORING.rare : SCORING.flower; this.score += value; this.flowers++; if (b.rare) this.rares++;
        this.events.push({ kind: 'flower', bud: b, value });
      }
    }
    // new weeds sprout
    this.sproutT -= dt;
    if (this.sproutT <= 0) { this.sproutT = SPROUT[0] + this.rnd() * (SPROUT[1] - SPROUT[0]) - this.clock.k * 1.5; if (this.up.length < MAX_WEEDS) { const bedI = Math.floor(this.rnd() * this.beds.length); const b = this.beds[bedI]; const an = this.rnd() * 6.28; this.sprout(b.x + Math.cos(an) * (b.hw + 1), b.z + Math.sin(an) * (b.hd + 1), this.rnd() < 0.4 ? 'big' : 'small'); } }
    if (this.weeds.length > 90) this.weeds = this.weeds.filter((w) => w.state === 'up').concat(this.weeds.filter((w) => w.state !== 'up').slice(-20));
  }

  place(): number { return tierPlace(this.score, SCORING.tiers); }
  result(): { place: number; score: number; timeMs: number; tier: string; stats: { label: string; value: string }[] } {
    const place = this.place();
    return { place, score: this.score, timeMs: Math.round(this.clock.time * 1000), tier: SCORING.tierNames[place - 1], stats: [{ label: 'Weeds pulled', value: String(this.pulled) }, { label: 'Flowers', value: String(this.flowers) }, { label: 'Rare blooms', value: String(this.rares) }, { label: 'Trampled', value: String(this.tramples) }] };
  }
}
