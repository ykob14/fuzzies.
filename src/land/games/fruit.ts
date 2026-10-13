/**
 * Fruit Catcher — RULES only (no DOM, no Three.js): an orchard drops fruit from the trees above; the Fuzzy runs left and right
 * along the orchard path with a basket and catches what falls. Apples, pears and strawberries are worth more in that order, a
 * golden fruit is rare and worth a lot, and pinecones must be dodged (they knock the basket and break the chain). Catches in a
 * row grow a multiplier. The orchard speeds up as the 70 seconds go by (shorter gaps, faster falls). Score → gold / silver /
 * bronze tier. Checked without a browser by `adv/games-check.ts`.
 */
import { Clock, Combo, seeded, tierPlace } from '../arcade';

export type FruitKind = 'apple' | 'pear' | 'berry' | 'gold' | 'cone';
export interface Falling { id: number; kind: FruitKind; x: number; y: number; vy: number; spin: number; r: number; state: 'air' | 'caught' | 'ground' }
export interface FruitEvent { kind: 'spawn' | 'catch' | 'miss' | 'cone' | 'combo' | 'comboEnd' | 'warn' | 'timeup' | 'wave'; item?: Falling; value?: number; mult?: number; n?: number }

export const SCORING = {
  points: { apple: 10, pear: 15, berry: 20, gold: 50, cone: -20 } as Record<FruitKind, number>,
  ladder: [{ at: 0, mult: 1 }, { at: 5, mult: 1.5 }, { at: 10, mult: 2 }, { at: 20, mult: 3 }],
  tiers: [1000, 520, 380] as [number, number, number],
  tierNames: ['Gold basket', 'Silver basket', 'Bronze basket', 'Keep practising'],
};
export const LIMIT = 70;
export const ARENA = { hw: 7 };
export const BASKET = { hw: 1.05, y: 0.9, accel: 34, max: 9.5, friction: 7 };
export const DROP_Y = 6.4;

export class FruitSim {
  readonly clock = new Clock(LIMIT);
  readonly combo = new Combo(6, SCORING.ladder);
  readonly variant: 'classic' | 'golden';
  state: 'ready' | 'playing' | 'done' = 'ready';
  x = 0; vx = 0; facing = 1;
  score = 0; caught = 0; missed = 0; cones = 0;
  count: Record<FruitKind, number> = { apple: 0, pear: 0, berry: 0, gold: 0, cone: 0 };
  items: Falling[] = [];
  events: FruitEvent[] = [];
  /** the basket's wobble after a pinecone (seconds left) */
  stun = 0;
  private rnd: () => number;
  private nextId = 0;
  private spawnT = 0.6;
  private wave = 0;

  /** half the width of the orchard lane (portrait phones get a narrower lane so every drop stays on screen) */
  readonly hw: number;
  constructor(variant: 'classic' | 'golden' = 'classic', seed = 7, hw = ARENA.hw) {
    this.variant = variant;
    this.rnd = seeded(seed);
    this.hw = Math.min(ARENA.hw, Math.max(3, hw));
  }

  start(): void { if (this.state === 'ready') this.state = 'playing'; }
  /** 0 → 1 over the challenge: the orchard speeds up with it */
  get k(): number { return this.clock.k; }
  get live(): Falling[] { return this.items.filter((i) => i.state === 'air'); }

  private spawn(): Falling {
    const roll = this.rnd();
    const goldChance = this.variant === 'golden' ? 0.1 : 0.04;
    const coneChance = 0.1 + this.k * 0.1;
    const kind: FruitKind = roll < goldChance ? 'gold' : roll < goldChance + coneChance ? 'cone' : roll < 0.62 ? 'apple' : roll < 0.84 ? 'pear' : 'berry';
    // never two in the very same spot; spread across the path
    const x = (this.rnd() - 0.5) * 2 * (this.hw - 0.6);
    const item: Falling = { id: this.nextId++, kind, x, y: DROP_Y, vy: 0, spin: (this.rnd() - 0.5) * 6, r: kind === 'gold' ? 0.3 : kind === 'cone' ? 0.26 : 0.28, state: 'air' };
    this.items.push(item);
    this.events.push({ kind: 'spawn', item });
    return item;
  }

  step(dt: number, input: { x: number; z: number }): void {
    this.events.length = 0;
    if (this.state !== 'playing') return;
    const w = this.clock.step(dt);
    if (w === 'timeup') { this.state = 'done'; this.events.push({ kind: 'timeup' }); return; }
    if (typeof w === 'number') this.events.push({ kind: 'warn', n: w });
    // waves: a speed-up at 25 s and 50 s
    const wave = Math.floor(this.clock.time / 25);
    if (wave > this.wave) { this.wave = wave; this.events.push({ kind: 'wave', n: wave }); }
    if (this.combo.step(dt)) this.events.push({ kind: 'comboEnd' });
    // the basket: run left / right
    this.stun = Math.max(0, this.stun - dt);
    const push = this.stun > 0 ? 0 : Math.max(-1, Math.min(1, input.x || 0));
    this.vx += push * BASKET.accel * dt;
    this.vx *= Math.exp(-BASKET.friction * (Math.abs(push) > 0.05 ? 0.35 : 1) * dt);
    this.vx = Math.max(-BASKET.max, Math.min(BASKET.max, this.vx));
    this.x += this.vx * dt;
    if (this.x < -this.hw) { this.x = -this.hw; this.vx = 0; } else if (this.x > this.hw) { this.x = this.hw; this.vx = 0; }
    if (Math.abs(push) > 0.05) this.facing = push > 0 ? 1 : -1;
    // fruit falls faster as time goes by
    const g = 7 + this.k * 6;
    const maxFall = 4.5 + this.k * 4;
    for (const it of this.items) {
      if (it.state !== 'air') continue;
      it.vy = Math.min(maxFall, it.vy + g * dt);
      it.y -= it.vy * dt;
      if (it.y <= BASKET.y + it.r && it.y > BASKET.y - 0.5 && Math.abs(it.x - this.x) < BASKET.hw + it.r * 0.6) {
        if (it.kind === 'cone') { it.state = 'caught'; this.cones++; this.count.cone++; this.score = Math.max(0, this.score + SCORING.points.cone); this.stun = 0.6; if (this.combo.chain > 0) { this.combo.reset(); this.events.push({ kind: 'comboEnd' }); } this.events.push({ kind: 'cone', item: it, value: SCORING.points.cone }); }
        else {
          it.state = 'caught'; this.caught++; this.count[it.kind]++;
          const mult = this.combo.hit();
          const value = Math.round(SCORING.points[it.kind] * mult);
          this.score += value;
          this.events.push({ kind: 'catch', item: it, value, mult });
          if (this.combo.chain === this.combo.ladder.find((l) => l.mult === mult && l.at > 0)?.at) this.events.push({ kind: 'combo', mult, n: this.combo.chain });
        }
      } else if (it.y <= it.r * 0.5) {
        it.state = 'ground'; it.y = it.r * 0.5;
        if (it.kind !== 'cone') { this.missed++; if (this.combo.chain > 0) { this.combo.reset(); this.events.push({ kind: 'comboEnd' }); } this.events.push({ kind: 'miss', item: it }); }
      }
    }
    // the next drop: gaps shrink from 1.1 s to 0.45 s; two at once near the end
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawn();
      if (this.k > 0.6 && this.rnd() < 0.35) this.spawn();
      this.spawnT = 1.1 - this.k * 0.65 + (this.rnd() - 0.5) * 0.2;
    }
    // tidy what's long gone
    if (this.items.length > 80) this.items = this.items.filter((i) => i.state === 'air').concat(this.items.filter((i) => i.state !== 'air').slice(-20));
  }

  place(): number { return tierPlace(this.score, SCORING.tiers); }
  result(): { place: number; score: number; timeMs: number; tier: string; stats: { label: string; value: string }[] } {
    const place = this.place();
    return { place, score: this.score, timeMs: Math.round(this.clock.time * 1000), tier: SCORING.tierNames[place - 1], stats: [{ label: 'Caught', value: String(this.caught) }, { label: 'Golden', value: String(this.count.gold) }, { label: 'Missed', value: String(this.missed) }, { label: 'Best chain', value: `×${this.combo.best}` }] };
  }
}
