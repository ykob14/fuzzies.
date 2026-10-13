/**
 * Hairball Vacuum Challenge — RULES only (no DOM, no Three.js): a garden full of fluffy hairballs, a Fuzzy pushing a
 * cartoon vacuum, two minutes. Hairballs inside the nozzle's reach are pulled in by real distance (no random scoring);
 * small / large / golden ones are worth different points (see `SCORING`), chains of quick pick-ups multiply, the canister
 * fills and empties with a bonus, new hairballs keep appearing. The score becomes a tier (1st–4th) that pays through the
 * adventure's `coins[]`. Shared infrastructure (clock, combo, mover, seeded random) comes from land/arcade.ts.
 * Checked without a browser by `adv/vacuum-check.ts`.
 */
import { Clock, Combo, Mover, seeded, freeSpot, tierPlace, type Obstacle, type Vec2 } from './arcade';

export type Kind = 'small' | 'large' | 'gold';
export interface Hairball { id: number; x: number; z: number; kind: Kind; r: number; value: number; state: 'idle' | 'pulled' | 'got'; pull: number; bob: number; hue: number; vx: number; vz: number }
export interface VacuumEvent { kind: 'collect' | 'combo' | 'comboEnd' | 'spawn' | 'warn' | 'timeup' | 'full' | 'bump'; ball?: Hairball; value?: number; mult?: number; n?: number }

/** Everything that tunes the challenge, in one place. */
export const SCORING = {
  small: 10, large: 25, gold: 100,
  /** the chain multiplier ladder (chain length → multiplier) and how long a chain stays alive between pick-ups */
  ladder: [{ at: 0, mult: 1 }, { at: 5, mult: 1.5 }, { at: 10, mult: 2 }, { at: 20, mult: 3 }], window: 1.8,
  /** canister: how many hairballs fill it, and the bonus when it empties itself */
  capacity: 40, fullBonus: 60,
  /** score → tier thresholds (1st, 2nd, 3rd) */
  tiers: [2400, 1500, 750] as [number, number, number],
  tierNames: ['Legendary cleaner', 'Super sucker', 'Tidy Fuzzy', 'Dust bunny'],
};
export const LIMIT = 120;
export const ARENA = { hw: 16, hd: 11 };
/** the nozzle's reach: distance ahead of the Fuzzy and the half-angle of the cone; a short all-round reach right at the mouth */
export const SUCTION = { range: 2.6, cone: 1.0, mouth: 0.75, ahead: 0.95 };

/** Garden furniture that blocks the way (the view draws the same list): fountain, flower beds, benches, bushes, lamp posts. */
export function makeObstacles(): Obstacle[] {
  const o: Obstacle[] = [{ kind: 'circle', x: 0, z: 0, r: 2.3 }];
  for (const [x, z] of [[-9, -5.5], [9, -5.5], [-9, 5.5], [9, 5.5]]) o.push({ kind: 'box', x, z, hw: 1.7, hd: 0.9 });
  for (const [x, z] of [[-4.5, -8.6], [4.5, -8.6]]) o.push({ kind: 'box', x, z, hw: 0.9, hd: 0.32 });
  for (const [x, z, r] of [[-13.2, 2.2, 0.9], [13.2, -2.2, 0.9], [-6.2, 8.6, 0.8], [6.2, 8.6, 0.8], [-13.4, -7.8, 0.7], [13.4, 7.8, 0.7]]) o.push({ kind: 'circle', x, z, r });
  for (const [x, z] of [[-11.5, 0], [11.5, 0]]) o.push({ kind: 'circle', x, z, r: 0.22 });
  return o;
}

export class VacuumSim {
  readonly obstacles = makeObstacles();
  readonly you: Mover;
  readonly balls: Hairball[] = [];
  readonly clock = new Clock(LIMIT);
  readonly combo = new Combo(SCORING.window, SCORING.ladder);
  state: 'ready' | 'playing' | 'done' = 'ready';
  score = 0;
  collected = 0;
  count: Record<Kind, number> = { small: 0, large: 0, gold: 0 };
  /** canister fill 0–1 and how many times it emptied itself */
  fill = 0; emptied = 0;
  events: VacuumEvent[] = [];
  private nextId = 0;
  private spawnT = 0; private largeT = 0; private goldT = 0;
  private rnd: () => number;
  readonly variant: 'classic' | 'golden';

  constructor(variant: 'classic' | 'golden' = 'classic', seed = 7) {
    this.variant = variant;
    this.rnd = seeded(seed);
    this.you = new Mover({ accel: 17, max: 6.4, friction: 3.6, turn: 9, radius: 0.55, bounds: ARENA }, this.obstacles);
    this.you.pos = { x: 0, z: 6.5 };
    this.you.heading = Math.PI; // facing the camera-near side… the view turns it
    // the opening scatter: a garden full of fluff, some tucked behind the beds and bushes where it's harder to reach
    for (let i = 0; i < 34; i++) this.spawn('small');
    for (let i = 0; i < 8; i++) this.spawn('large');
    for (let i = 0; i < (variant === 'golden' ? 7 : 3); i++) this.spawn('gold', true);
  }

  get left(): number { return this.clock.left; }
  get live(): Hairball[] { return this.balls.filter((b) => b.state !== 'got'); }

  start(): void { if (this.state === 'ready') this.state = 'playing'; }

  /** Drop a new hairball somewhere free (not on the Fuzzy, not inside furniture). `nook` prefers awkward corners. */
  private spawn(kind: Kind, nook = false): Hairball | null {
    const r = kind === 'small' ? 0.26 : kind === 'large' ? 0.42 : 0.3;
    for (let tries = 0; tries < 40; tries++) {
      let x: number, z: number;
      if (nook && this.rnd() < 0.7) {
        // behind a flower bed or in a corner
        const corners: Vec2[] = [{ x: -14.6, z: -9.6 }, { x: 14.6, z: -9.6 }, { x: -14.6, z: 9.6 }, { x: 14.6, z: 9.6 }, { x: -9, z: -7.4 }, { x: 9, z: -7.4 }, { x: -9, z: 7.4 }, { x: 9, z: 7.4 }];
        const c = corners[Math.floor(this.rnd() * corners.length)];
        x = c.x + (this.rnd() - 0.5) * 1.2; z = c.z + (this.rnd() - 0.5) * 1.2;
      } else { x = (this.rnd() - 0.5) * 2 * (ARENA.hw - 1); z = (this.rnd() - 0.5) * 2 * (ARENA.hd - 1); }
      const p = { x, z };
      if (!freeSpot(p, this.obstacles, r + 0.25)) continue;
      if (Math.hypot(x - this.you.pos.x, z - this.you.pos.z) < (this.state === 'ready' ? 4.2 : 3)) continue; // never right under the nozzle
      if (this.live.some((b) => Math.hypot(b.x - x, b.z - z) < b.r + r + 0.15)) continue;
      const ball: Hairball = { id: this.nextId++, x, z, kind, r, value: SCORING[kind], state: 'idle', pull: 0, bob: this.rnd() * 6.28, hue: this.rnd(), vx: 0, vz: 0 };
      this.balls.push(ball);
      return ball;
    }
    return null;
  }

  step(dt: number, input: Vec2): void {
    this.events.length = 0;
    if (this.state !== 'playing') return;
    const w = this.clock.step(dt);
    if (w === 'timeup') { this.state = 'done'; this.events.push({ kind: 'timeup' }); return; }
    if (typeof w === 'number') this.events.push({ kind: 'warn', n: w });
    const wasBlocked = this.you.blocked;
    this.you.step(dt, input);
    if (this.you.blocked && !wasBlocked && this.you.speed > 2) this.events.push({ kind: 'bump' });
    if (this.combo.step(dt)) this.events.push({ kind: 'comboEnd' });
    // the nozzle: a little ahead of the Fuzzy, in its facing direction
    const fx = Math.sin(this.you.heading), fz = Math.cos(this.you.heading);
    const nx = this.you.pos.x + fx * SUCTION.ahead, nz = this.you.pos.z + fz * SUCTION.ahead;
    for (const b of this.balls) {
      if (b.state === 'got') continue;
      const dx = nx - b.x, dz = nz - b.z, d = Math.hypot(dx, dz);
      const ang = Math.abs(Math.atan2(Math.sin(Math.atan2(b.x - this.you.pos.x, b.z - this.you.pos.z) - this.you.heading), Math.cos(Math.atan2(b.x - this.you.pos.x, b.z - this.you.pos.z) - this.you.heading)));
      const inReach = d < SUCTION.mouth || (d < SUCTION.range && ang < SUCTION.cone);
      if (inReach) {
        b.state = 'pulled';
        // heavier ones come slower; the closer, the faster (the air rushes in)
        const heavy = b.kind === 'large' ? 0.62 : b.kind === 'gold' ? 0.8 : 1;
        const sp = (3.2 + 7 * (1 - d / SUCTION.range)) * heavy;
        const k = Math.min(1, (sp * dt) / Math.max(d, 1e-6));
        b.vx = dx * k / dt; b.vz = dz * k / dt;
        b.x += dx * k; b.z += dz * k;
        b.pull += dt;
        if (d < (b.kind === 'small' ? 0.32 : 0.42)) this.collect(b);
      } else if (b.state === 'pulled') { b.state = 'idle'; b.pull = 0; b.vx = b.vz = 0; }
    }
    // more fluff keeps turning up (a garden is never clean for long)
    this.spawnT += dt; this.largeT += dt; this.goldT += dt;
    const liveN = this.live.length;
    if (this.spawnT > 3 && liveN < 52) { this.spawnT = 0; for (let i = 0; i < (liveN < 30 ? 2 : 1); i++) { const b = this.spawn('small'); if (b) this.events.push({ kind: 'spawn', ball: b }); } }
    if (this.largeT > 11 && liveN < 52) { this.largeT = 0; const b = this.spawn('large'); if (b) this.events.push({ kind: 'spawn', ball: b }); }
    const goldEvery = this.variant === 'golden' ? 14 : 30;
    if (this.goldT > goldEvery && liveN < 54) { this.goldT = 0; const b = this.spawn('gold', true); if (b) this.events.push({ kind: 'spawn', ball: b }); }
  }

  private collect(b: Hairball): void {
    b.state = 'got';
    const mult = this.combo.hit();
    const value = Math.round(b.value * mult);
    this.score += value;
    this.collected++;
    this.count[b.kind]++;
    this.events.push({ kind: 'collect', ball: b, value, mult });
    if (this.combo.chain === this.combo.ladder.find((l) => l.mult === mult && l.at > 0)?.at) this.events.push({ kind: 'combo', mult, n: this.combo.chain });
    this.fill = Math.min(1, this.fill + 1 / SCORING.capacity);
    if (this.fill >= 1) { this.fill = 0; this.emptied++; this.score += SCORING.fullBonus; this.events.push({ kind: 'full', value: SCORING.fullBonus }); }
  }

  place(): number { return tierPlace(this.score, SCORING.tiers); }
  result(): { place: number; score: number; collected: number; count: Record<Kind, number>; bestCombo: number; tier: string; timeMs: number } {
    const place = this.place();
    return { place, score: this.score, collected: this.collected, count: { ...this.count }, bestCombo: this.combo.best, tier: SCORING.tierNames[place - 1], timeMs: Math.round(this.clock.time * 1000) };
  }
}
