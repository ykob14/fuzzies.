/**
 * Snowball Challenge — RULES only (no DOM, no Three.js): you stand at the yard fence; snowman-and-board targets pop up near,
 * far and sliding sideways, and duck again after a few seconds. Tap / click where to throw: the snowball flies in an arc
 * (further = longer in the air, so lead the sliding ones) and hits whatever is up where it lands. Near 10, far 25, moving
 * 40, a bullseye (dead centre) ×2. 90 seconds, busier as it goes. Checked by `adv/snowball-check.ts`.
 */
import { Clock, seeded, tierPlace, type Vec2 } from '../arcade';

export type TargetKind = 'near' | 'far' | 'moving';
export interface Target { id: number; kind: TargetKind; x: number; z: number; vx: number; up: number; life: number; state: 'rising' | 'up' | 'ducking' | 'down'; hit: boolean }
export interface Ball { id: number; from: Vec2; to: Vec2; t: number; time: number; state: 'air' | 'landed' }
export interface SnowEvent { kind: 'throw' | 'hit' | 'bullseye' | 'miss' | 'pop' | 'duck' | 'warn' | 'timeup'; target?: Target; ball?: Ball; value?: number; n?: number }

export const SCORING = {
  points: { near: 10, far: 25, moving: 40 } as Record<TargetKind, number>,
  bullseye: 2,
  tiers: [1600, 850, 350] as [number, number, number],
  tierNames: ['Snowball sniper', 'Sharp shot', 'Yard thrower', 'Snow angel'],
};
export const LIMIT = 90;
export const YARD = { hw: 7.5, near: 3.5, far: 13 };
export const YOU: Vec2 = { x: 0, z: 0 };
export const TARGET_R = 0.85;
export const BULLSEYE_R = 0.32;
export const RISE = 0.35;
export const UP: [number, number] = [2.6, 4];
export const COOLDOWN = 0.45;
export const FLIGHT = (d: number): number => 0.45 + d * 0.065;
export const SLIDE = 2.2;

export class SnowballSim {
  readonly clock = new Clock(LIMIT);
  state: 'ready' | 'playing' | 'done' = 'ready';
  targets: Target[] = [];
  balls: Ball[] = [];
  score = 0; throws = 0; hits = 0; bullseyes = 0; misses = 0; popped = 0;
  cooldown = 0;
  events: SnowEvent[] = [];
  private rnd: () => number;
  private nextId = 0; private popT = 0.6;

  constructor(_variant: string | null | undefined, seed = 7) { this.rnd = seeded(seed); }

  start(): void { if (this.state === 'ready') this.state = 'playing'; }
  get k(): number { return this.clock.k; }
  get live(): Target[] { return this.targets.filter((t) => t.state === 'up' || t.state === 'rising'); }
  private pop(): Target | null {
    const roll = this.rnd(); const k = this.k;
    const kind: TargetKind = roll < 0.18 + k * 0.17 ? 'moving' : roll < 0.55 + k * 0.1 ? 'far' : 'near';
    const z = kind === 'near' ? -(YARD.near + this.rnd() * 3) : -(YARD.near + 4 + this.rnd() * (YARD.far - YARD.near - 4));
    const x = kind === 'moving' ? (this.rnd() < 0.5 ? -YARD.hw + 0.5 : YARD.hw - 0.5) : (this.rnd() - 0.5) * 2 * (YARD.hw - 1);
    if (this.live.some((t) => Math.abs(t.z - z) < 1.5 && Math.abs(t.x - x) < 2.2)) return null;
    const vx = kind === 'moving' ? (x < 0 ? 1 : -1) * SLIDE * (0.8 + k * 0.5) : 0;
    const t: Target = { id: this.nextId++, kind, x, z, vx, up: 0, life: UP[0] + this.rnd() * (UP[1] - UP[0]) + (kind === 'moving' ? 2 : 0), state: 'rising', hit: false };
    this.targets.push(t); this.popped++; this.events.push({ kind: 'pop', target: t });
    return t;
  }
  /** throw at a spot on the yard (clamped); the ball lands a moment later */
  throwAt(x: number, z: number): Ball | null {
    if (this.state !== 'playing' || this.cooldown > 0) return null;
    const to = { x: Math.max(-YARD.hw - 1, Math.min(YARD.hw + 1, x)), z: Math.max(-YARD.far - 1, Math.min(-1.5, z)) };
    const d = Math.hypot(to.x - YOU.x, to.z - YOU.z);
    const b: Ball = { id: this.nextId++, from: { ...YOU }, to, t: 0, time: FLIGHT(d), state: 'air' };
    this.balls.push(b); this.throws++; this.cooldown = COOLDOWN;
    this.events.push({ kind: 'throw', ball: b });
    return b;
  }
  /** where a sliding target will be in `dt` seconds (for leading a throw) */
  predict(t: Target, dt: number): Vec2 { let x = t.x + t.vx * dt; if (Math.abs(x) > YARD.hw - 0.5) x = Math.sign(x) * (YARD.hw - 0.5); return { x, z: t.z }; }

  step(dt: number): void {
    this.events.length = 0;
    if (this.state !== 'playing') return;
    const w = this.clock.step(dt);
    if (w === 'timeup') { this.state = 'done'; this.events.push({ kind: 'timeup' }); return; }
    if (typeof w === 'number') this.events.push({ kind: 'warn', n: w });
    this.cooldown = Math.max(0, this.cooldown - dt);
    for (const t of this.targets) {
      if (t.state === 'down') continue;
      if (t.state === 'rising') { t.up += dt / RISE; if (t.up >= 1) { t.up = 1; t.state = 'up'; } }
      else if (t.state === 'up') { t.life -= dt; if (t.vx) { t.x += t.vx * dt; if (Math.abs(t.x) > YARD.hw - 0.5) { t.x = Math.sign(t.x) * (YARD.hw - 0.5); t.vx = -t.vx; } } if (t.life <= 0) { t.state = 'ducking'; this.events.push({ kind: 'duck', target: t }); } }
      else if (t.state === 'ducking') { t.up -= dt / RISE; if (t.up <= 0) { t.up = 0; t.state = 'down'; } }
    }
    for (const b of this.balls) {
      if (b.state !== 'air') continue;
      b.t += dt;
      if (b.t >= b.time) {
        b.state = 'landed';
        let best: Target | null = null, bd = TARGET_R;
        for (const t of this.targets) { if (t.state !== 'up' && t.state !== 'rising') continue; const d = Math.hypot(t.x - b.to.x, t.z - b.to.z); if (d < bd) { bd = d; best = t; } }
        if (best) {
          const bull = bd <= BULLSEYE_R; const value = SCORING.points[best.kind] * (bull ? SCORING.bullseye : 1);
          best.hit = true; best.state = 'ducking'; this.score += value; this.hits++; if (bull) this.bullseyes++;
          this.events.push({ kind: bull ? 'bullseye' : 'hit', target: best, ball: b, value });
        } else { this.misses++; this.events.push({ kind: 'miss', ball: b }); }
      }
    }
    // targets pop up faster as time goes, up to three at once
    this.popT -= dt;
    if (this.popT <= 0) { if (this.live.length < 3) this.pop(); this.popT = 1.4 - this.k * 0.7 + this.rnd() * 0.5; }
    if (this.targets.length > 40) this.targets = this.targets.filter((t) => t.state !== 'down').concat(this.targets.filter((t) => t.state === 'down').slice(-8));
    if (this.balls.length > 30) this.balls = this.balls.filter((b) => b.state === 'air').concat(this.balls.filter((b) => b.state !== 'air').slice(-8));
  }

  place(): number { return tierPlace(this.score, SCORING.tiers); }
  result(): { place: number; score: number; timeMs: number; tier: string; stats: { label: string; value: string }[] } {
    const place = this.place();
    return { place, score: this.score, timeMs: Math.round(this.clock.time * 1000), tier: SCORING.tierNames[place - 1], stats: [{ label: 'Hits', value: `${this.hits}/${this.throws}` }, { label: 'Bullseyes', value: String(this.bullseyes) }, { label: 'Moving targets', value: String(this.targets.filter((t) => t.hit && t.kind === 'moving').length) }, { label: 'Missed', value: String(this.misses) }] };
  }
}
