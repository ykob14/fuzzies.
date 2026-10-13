/**
 * Fuzzy Obstacle Run — RULES only (no DOM, no Three.js): a three-lane dash. The course scrolls towards you faster and faster
 * (seeded patterns): logs to jump, rocks to dodge by changing lane, puddles that slow you unless you jump, lines and arcs of
 * stars (golden ones rare). Stars in a row grow a multiplier; a bump costs 40, breaks the chain and slows you for a moment;
 * every 100 m pays 20. 90 seconds. Checked without a browser by `adv/obstacle-check.ts`.
 */
import { Clock, Combo, seeded, tierPlace, type Vec2 } from '../arcade';

export type ObKind = 'log' | 'rock' | 'puddle' | 'star' | 'gold';
export interface Thing { id: number; kind: ObKind; lane: number; d: number; y: number; state: 'ahead' | 'hit' | 'got' | 'passed' }
export interface RunEvent { kind: 'star' | 'bump' | 'splash' | 'combo' | 'comboEnd' | 'milestone' | 'jump' | 'land' | 'speedup' | 'warn' | 'timeup'; item?: Thing; value?: number; mult?: number; n?: number }

export const SCORING = {
  star: 10, gold: 50, hundred: 20, bump: 40,
  ladder: [{ at: 0, mult: 1 }, { at: 4, mult: 1.5 }, { at: 9, mult: 2 }, { at: 16, mult: 3 }],
  window: 1.6,
  tiers: [2300, 1500, 1000] as [number, number, number],
  tierNames: ['Speed legend', 'Star sprinter', 'Trail runner', 'Warming up'],
};
export const LIMIT = 90;
export const LANES = [-2.2, 0, 2.2];
export const SPEED: [number, number] = [7, 12.5];
export const JUMP = { v0: 6.4, g: 18.5 };
export const LOG_H = 0.55;
export const STAR_Y = { ground: 0.5, arc: 1.45 };
export const BUMP = { slow: 0.35, time: 1.4, safe: 1.6 };
export const SPLASH = { slow: 0.7, time: 0.6 };
export const LANE_RATE = 11;

export class RunSim {
  readonly clock = new Clock(LIMIT);
  readonly combo = new Combo(SCORING.window, SCORING.ladder);
  state: 'ready' | 'playing' | 'done' = 'ready';
  dist = 0; lane = 1; x = 0; y = 0; vy = 0; speed = SPEED[0];
  score = 0; stars = 0; golden = 0; bumps = 0; splashes = 0; jumps = 0; hundreds = 0;
  /** seconds of slow-down / invulnerability left */
  slow = 0; slowK = 1; safe = 0;
  things: Thing[] = [];
  events: RunEvent[] = [];
  private rnd: () => number;
  private nextId = 0;
  private nextD = 14;
  private heldX = false; private heldJump = false; private lastSpeedup = 0;

  constructor(_variant: string | null | undefined, seed = 7) { this.rnd = seeded(seed); while (this.nextD < 60) this.pattern(); }

  start(): void { if (this.state === 'ready') this.state = 'playing'; }
  get k(): number { return this.clock.k; }
  get airborne(): boolean { return this.y > 0.02; }
  get ahead(): Thing[] { return this.things.filter((t) => t.state === 'ahead'); }
  private put(kind: ObKind, lane: number, d: number, y = 0): Thing { const t: Thing = { id: this.nextId++, kind, lane, d, y, state: 'ahead' }; this.things.push(t); return t; }
  /** lay the next pattern of things on the course */
  private pattern(): void {
    const r = this.rnd(); const d = this.nextD; const k = this.k;
    const lane = Math.floor(this.rnd() * 3);
    const other = (lane + 1 + Math.floor(this.rnd() * 2)) % 3;
    if (r < 0.26) { // a log with an arc of stars over it
      this.put('log', lane, d);
      for (let i = -1; i <= 1; i++) this.put('star', lane, d + i * 1.3, i === 0 ? STAR_Y.arc : STAR_Y.ground + 0.4);
      if (k > 0.5 && this.rnd() < 0.5) this.put('rock', other, d);
    } else if (r < 0.5) { // rocks in one or two lanes, stars down a free lane
      this.put('rock', lane, d);
      const two = k > 0.3 && this.rnd() < 0.45 + k * 0.3;
      if (two) this.put('rock', other, d);
      const free = [0, 1, 2].find((l) => l !== lane && (!two || l !== other))!;
      for (let i = 0; i < 4; i++) this.put('star', free, d - 1.5 + i * 1.6, STAR_Y.ground);
    } else if (r < 0.66) { // a wide puddle (two lanes) — jump it or walk round
      const dry = Math.floor(this.rnd() * 3);
      for (let l = 0; l < 3; l++) if (l !== dry) this.put('puddle', l, d);
      this.put('star', dry, d, STAR_Y.ground);
    } else if (r < 0.9) { // a line of stars, now and then a golden one
      const n = 4 + Math.floor(this.rnd() * 3);
      for (let i = 0; i < n; i++) this.put('star', lane, d + i * 1.5, STAR_Y.ground);
      if (this.rnd() < 0.3) this.put('gold', other, d + 2, STAR_Y.ground);
    } else { // a breather with one golden star to reach for
      this.put('gold', lane, d + 1, this.rnd() < 0.5 ? STAR_Y.arc : STAR_Y.ground);
    }
    this.nextD = d + (12 - k * 5) + this.rnd() * 3;
  }
  /** jump (ignored in the air) */
  jump(): boolean { if (this.state !== 'playing' || this.airborne) return false; this.vy = JUMP.v0; this.y = 0.03; this.jumps++; this.events.push({ kind: 'jump' }); return true; }
  /** change lane by −1 / +1 */
  shift(dir: number): boolean { const l = Math.max(0, Math.min(2, this.lane + (dir < 0 ? -1 : 1))); if (l === this.lane) return false; this.lane = l; return true; }

  step(dt: number, input: Vec2): void {
    this.events.length = 0;
    if (this.state !== 'playing') return;
    const w = this.clock.step(dt);
    if (w === 'timeup') { this.state = 'done'; this.events.push({ kind: 'timeup' }); return; }
    if (typeof w === 'number') this.events.push({ kind: 'warn', n: w });
    if (this.combo.step(dt)) this.events.push({ kind: 'comboEnd' });
    // controls: a push sideways = one lane; a push up (or jump()) = a jump; both need a release in between
    const ix = input.x || 0, iz = input.z || 0;
    if (Math.abs(ix) > 0.5) { if (!this.heldX) { this.heldX = true; this.shift(ix); } } else if (Math.abs(ix) < 0.3) this.heldX = false;
    if (iz < -0.6) { if (!this.heldJump) { this.heldJump = true; this.jump(); } } else if (iz > -0.3) this.heldJump = false;
    // running
    this.speed = SPEED[0] + (SPEED[1] - SPEED[0]) * this.k;
    const stage = Math.floor(this.clock.time / 30);
    if (stage > this.lastSpeedup) { this.lastSpeedup = stage; this.events.push({ kind: 'speedup', n: stage }); }
    this.slow = Math.max(0, this.slow - dt); this.safe = Math.max(0, this.safe - dt);
    const v = this.speed * (this.slow > 0 ? this.slowK : 1);
    const d0 = this.dist; this.dist += v * dt;
    if (Math.floor(this.dist / 100) > Math.floor(d0 / 100)) { this.hundreds++; this.score += SCORING.hundred; this.events.push({ kind: 'milestone', n: Math.floor(this.dist / 100) * 100, value: SCORING.hundred }); }
    // sideways + the jump arc
    const tx = LANES[this.lane]; const dx = tx - this.x; const stepX = LANE_RATE * dt; this.x = Math.abs(dx) <= stepX ? tx : this.x + Math.sign(dx) * stepX;
    if (this.airborne || this.vy > 0) { this.vy -= JUMP.g * dt; this.y += this.vy * dt; if (this.y <= 0) { this.y = 0; this.vy = 0; this.events.push({ kind: 'land' }); } }
    // things that crossed the line under your feet this step
    for (const t of this.things) {
      if (t.state !== 'ahead') continue;
      if (t.d > this.dist) continue; // still ahead
      if (t.d < d0 - 0.01) { t.state = 'passed'; continue; } // crossed earlier (shouldn't happen)
      const sameLane = Math.abs(LANES[t.lane] - this.x) < 1.0;
      if (!sameLane) { t.state = 'passed'; continue; }
      if (t.kind === 'star' || t.kind === 'gold') {
        if (Math.abs(this.y - t.y) < 0.75) {
          t.state = 'got'; const mult = this.combo.hit(); const value = Math.round((t.kind === 'gold' ? SCORING.gold : SCORING.star) * mult);
          this.score += value; if (t.kind === 'gold') this.golden++; else this.stars++;
          this.events.push({ kind: 'star', item: t, value, mult });
          if (this.combo.chain === this.combo.ladder.find((l) => l.mult === mult && l.at > 0)?.at) this.events.push({ kind: 'combo', mult, n: this.combo.chain });
        } else t.state = 'passed';
      } else if (t.kind === 'log') {
        if (this.y >= LOG_H) t.state = 'passed'; else this.bump(t);
      } else if (t.kind === 'rock') {
        this.bump(t);
      } else if (t.kind === 'puddle') {
        if (this.airborne) t.state = 'passed'; else { t.state = 'hit'; this.splashes++; this.slow = SPLASH.time; this.slowK = SPLASH.slow; this.events.push({ kind: 'splash', item: t }); }
      }
    }
    while (this.nextD < this.dist + 70) this.pattern();
    if (this.things.length > 160) this.things = this.things.filter((t) => t.state === 'ahead' || t.d > this.dist - 8);
  }
  private bump(t: Thing): void {
    if (this.safe > 0) { t.state = 'passed'; return; }
    t.state = 'hit'; this.bumps++; this.slow = BUMP.time; this.slowK = BUMP.slow; this.safe = BUMP.safe; this.score = Math.max(0, this.score - SCORING.bump);
    if (this.combo.chain > 0) { this.combo.reset(); this.events.push({ kind: 'comboEnd' }); }
    this.events.push({ kind: 'bump', item: t });
  }

  place(): number { return tierPlace(this.score, SCORING.tiers); }
  result(): { place: number; score: number; timeMs: number; tier: string; stats: { label: string; value: string }[] } {
    const place = this.place();
    return { place, score: this.score, timeMs: Math.round(this.clock.time * 1000), tier: SCORING.tierNames[place - 1], stats: [{ label: 'Distance', value: `${Math.round(this.dist)} m` }, { label: 'Stars', value: String(this.stars) }, { label: 'Golden', value: String(this.golden) }, { label: 'Bumps', value: String(this.bumps) }] };
  }
}
