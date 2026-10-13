/**
 * Mining Adventure — RULES only (no DOM, no Three.js): the old mine floor is dotted with sparkling rock piles. Walk up to one
 * and DIG (each pile takes 2–4 swings) and the gem inside pops into your bag: quartz 10, emerald 25, ruby 40, diamond 80 (the
 * sparkle's colour hints at it). Every so often the ceiling rumbles over a spot and a rock drops a moment later — step away
 * or it knocks your helmet (−20, a short daze). New piles keep sparkling up. Two minutes. Checked by `adv/mining-check.ts`.
 */
import { Clock, Mover, seeded, tierPlace, freeSpot, type Obstacle, type Vec2 } from '../arcade';

export type Gem = 'quartz' | 'emerald' | 'ruby' | 'diamond';
export interface Pile { id: number; x: number; z: number; gem: Gem; hp: number; hits: number; state: 'up' | 'open' }
export interface Rock { id: number; x: number; z: number; t: number; state: 'rumble' | 'falling' | 'landed' }
export interface MiningEvent { kind: 'swing' | 'crack' | 'gem' | 'rumble' | 'fall' | 'knock' | 'sparkle' | 'warn' | 'timeup' | 'bump'; pile?: Pile; rock?: Rock; value?: number; n?: number }

export const SCORING = {
  points: { quartz: 10, emerald: 25, ruby: 40, diamond: 80 } as Record<Gem, number>,
  knock: 20,
  tiers: [1000, 600, 250] as [number, number, number],
  tierNames: ['Diamond digger', 'Gem hunter', 'Rock hound', 'Helmet on backwards'],
};
export const LIMIT = 120;
export const MINE = { hw: 10, hd: 7 };
export const HP: Record<Gem, number> = { quartz: 2, emerald: 3, ruby: 3, diamond: 4 };
export const SWING = 0.4;
export const REACH = 1.2;
export const PILES = 7;
export const RUMBLE = 1.3;
export const FALL = 0.5;
export const ROCK_R = 1.1;
export const ROCK_EVERY: [number, number] = [4, 7];
export const DAZE = 0.8;
export const MOVE = { accel: 32, max: 4.6, friction: 6, turn: 10, radius: 0.32 };

export class MiningSim {
  readonly clock = new Clock(LIMIT);
  readonly obstacles: Obstacle[] = [];
  readonly you: Mover;
  piles: Pile[] = [];
  rocks: Rock[] = [];
  state: 'ready' | 'playing' | 'done' = 'ready';
  score = 0; gems = 0; knocks = 0; swings = 0; dug = 0;
  count: Record<Gem, number> = { quartz: 0, emerald: 0, ruby: 0, diamond: 0 };
  /** seconds left in the current swing; the pile being hit */
  swinging = 0; target: Pile | null = null; daze = 0;
  events: MiningEvent[] = [];
  private rnd: () => number;
  private nextId = 0; private rockT = 3.5; private bumpCool = 0;

  constructor(_variant: string | null | undefined, seed = 7) {
    this.rnd = seeded(seed);
    // mine props: support posts, a minecart, boulders
    for (const [x, z] of [[-6, -4], [6, -4], [-6, 4], [6, 4]]) this.obstacles.push({ kind: 'circle', x, z, r: 0.25 });
    this.obstacles.push({ kind: 'box', x: -MINE.hw + 1.6, z: 0, hw: 1, hd: 0.6 });
    for (let i = 0; i < 4; i++) this.obstacles.push({ kind: 'circle', x: (this.rnd() - 0.5) * 2 * (MINE.hw - 2), z: (this.rnd() - 0.5) * 2 * (MINE.hd - 2), r: 0.5 + this.rnd() * 0.4 });
    this.you = new Mover({ ...MOVE, bounds: MINE }, this.obstacles);
    this.you.pos = { x: 0, z: MINE.hd - 1.2 };
    for (let i = 0; i < PILES; i++) this.sparkle(true);
    this.events.length = 0;
  }

  start(): void { if (this.state === 'ready') this.state = 'playing'; }
  get up(): Pile[] { return this.piles.filter((p) => p.state === 'up'); }
  private spot(minGap: number): Vec2 | null {
    for (let t = 0; t < 60; t++) {
      const p = { x: (this.rnd() - 0.5) * 2 * (MINE.hw - 1.2), z: (this.rnd() - 0.5) * 2 * (MINE.hd - 1.2) };
      if (!freeSpot(p, this.obstacles, 0.9)) continue;
      if (Math.hypot(p.x - this.you.pos.x, p.z - this.you.pos.z) < 1.5) continue;
      if (this.up.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < minGap)) continue;
      return p;
    }
    return null;
  }
  private sparkle(silent = false): Pile | null {
    const p = this.spot(2.2); if (!p) return null;
    const r = this.rnd(); const gem: Gem = r < 0.06 ? 'diamond' : r < 0.22 ? 'ruby' : r < 0.5 ? 'emerald' : 'quartz';
    const pile: Pile = { id: this.nextId++, x: p.x, z: p.z, gem, hp: HP[gem], hits: 0, state: 'up' };
    this.piles.push(pile); if (!silent) this.events.push({ kind: 'sparkle', pile });
    return pile;
  }
  /** the pile in reach (closest) */
  reachable(): Pile | null { let best: Pile | null = null, bd = REACH; for (const p of this.piles) { if (p.state !== 'up') continue; const d = Math.hypot(p.x - this.you.pos.x, p.z - this.you.pos.z); if (d < bd) { bd = d; best = p; } } return best; }
  /** a rock rumbling or falling over you? */
  get danger(): Rock | null { return this.rocks.find((r) => r.state !== 'landed' && Math.hypot(r.x - this.you.pos.x, r.z - this.you.pos.z) < ROCK_R + 0.4) ?? null; }
  /** DIG: one swing at the pile in reach */
  dig(): boolean {
    if (this.state !== 'playing' || this.swinging > 0 || this.daze > 0) return false;
    const p = this.reachable(); if (!p) return false;
    this.swinging = SWING; this.target = p; this.swings++;
    this.events.push({ kind: 'swing', pile: p });
    return true;
  }

  step(dt: number, input: Vec2): void {
    this.events.length = 0;
    if (this.state !== 'playing') return;
    const w = this.clock.step(dt);
    if (w === 'timeup') { this.state = 'done'; this.events.push({ kind: 'timeup' }); return; }
    if (typeof w === 'number') this.events.push({ kind: 'warn', n: w });
    this.daze = Math.max(0, this.daze - dt);
    if (this.swinging > 0) {
      this.swinging -= dt; this.you.step(dt, { x: 0, z: 0 });
      if (this.swinging <= 0) {
        this.swinging = 0; const p = this.target; this.target = null;
        if (p && p.state === 'up' && Math.hypot(p.x - this.you.pos.x, p.z - this.you.pos.z) < REACH + 0.3) {
          p.hits++;
          if (p.hits >= p.hp) { p.state = 'open'; const value = SCORING.points[p.gem]; this.score += value; this.gems++; this.count[p.gem]++; this.dug++; this.events.push({ kind: 'gem', pile: p, value }); this.sparkle(); }
          else this.events.push({ kind: 'crack', pile: p, n: p.hp - p.hits });
        }
      }
    } else this.you.step(dt, this.daze > 0 ? { x: 0, z: 0 } : { x: input.x || 0, z: input.z || 0 });
    this.bumpCool -= dt;
    if (this.you.blocked && this.you.speed > 2.2 && this.bumpCool <= 0) { this.bumpCool = 0.6; this.events.push({ kind: 'bump' }); }
    // the ceiling: rumble over a spot near you (or over the pile you're working), then the rock drops
    this.rockT -= dt;
    if (this.rockT <= 0) {
      this.rockT = ROCK_EVERY[0] + this.rnd() * (ROCK_EVERY[1] - ROCK_EVERY[0]) - this.clock.k * 1.5;
      const aimAtMe = this.rnd() < 0.6; const base = aimAtMe ? this.you.pos : (this.up[Math.floor(this.rnd() * this.up.length)] ?? this.you.pos);
      const r: Rock = { id: this.nextId++, x: Math.max(-MINE.hw + 0.5, Math.min(MINE.hw - 0.5, base.x + (this.rnd() - 0.5) * 1.2)), z: Math.max(-MINE.hd + 0.5, Math.min(MINE.hd - 0.5, base.z + (this.rnd() - 0.5) * 1.2)), t: 0, state: 'rumble' };
      this.rocks.push(r); this.events.push({ kind: 'rumble', rock: r });
    }
    for (const r of this.rocks) {
      if (r.state === 'landed') continue;
      r.t += dt;
      if (r.state === 'rumble' && r.t >= RUMBLE) { r.state = 'falling'; r.t = 0; }
      else if (r.state === 'falling' && r.t >= FALL) {
        r.state = 'landed';
        const hit = Math.hypot(r.x - this.you.pos.x, r.z - this.you.pos.z) < ROCK_R;
        if (hit) { this.knocks++; this.score = Math.max(0, this.score - SCORING.knock); this.daze = DAZE; this.swinging = 0; this.target = null; this.events.push({ kind: 'knock', rock: r, value: SCORING.knock }); }
        this.events.push({ kind: 'fall', rock: r, n: hit ? 1 : 0 });
      }
    }
    if (this.rocks.length > 30) this.rocks = this.rocks.filter((r) => r.state !== 'landed').concat(this.rocks.filter((r) => r.state === 'landed').slice(-8));
    if (this.piles.length > 60) this.piles = this.piles.filter((p) => p.state === 'up').concat(this.piles.filter((p) => p.state !== 'up').slice(-10));
  }

  place(): number { return tierPlace(this.score, SCORING.tiers); }
  result(): { place: number; score: number; timeMs: number; tier: string; stats: { label: string; value: string }[] } {
    const place = this.place();
    return { place, score: this.score, timeMs: Math.round(this.clock.time * 1000), tier: SCORING.tierNames[place - 1], stats: [{ label: 'Gems', value: String(this.gems) }, { label: 'Diamonds', value: String(this.count.diamond) }, { label: 'Rubies', value: String(this.count.ruby) }, { label: 'Helmet knocks', value: String(this.knocks) }] };
  }
}
