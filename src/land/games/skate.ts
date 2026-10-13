/**
 * Ice Skating — RULES only (no DOM, no Three.js): the frozen pond is an oval rink with boards round the edge. You glide
 * forward all the time; LEAN left / right turns you, but the ice slides — the skates follow your heading only slowly. Glide
 * through the lit gate (30; 45 when you take it cleanly near the middle without a crash since the last one), the next one
 * lights up, round and round. SPIN once between gates for 15 style points (you can't steer while spinning). Snowmen stand on the
 * ice: a crash costs 20 and your speed. 70 seconds. Checked by `adv/skate-check.ts`.
 */
import { Clock, seeded, tierPlace, type Vec2 } from '../arcade';
const wrapAngle = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

export interface Gate { id: number; x: number; z: number; nx: number; nz: number; dir: Vec2 }
export interface Snowman { id: number; x: number; z: number; r: number }
export interface SkateEvent { kind: 'gate' | 'clean' | 'missed' | 'spin' | 'spinDone' | 'crash' | 'boards' | 'lap' | 'warn' | 'timeup'; gate?: Gate; value?: number; n?: number }

export const SCORING = {
  gate: 30, clean: 45, spin: 15, crash: 20,
  tiers: [1400, 880, 290] as [number, number, number],
  tierNames: ['Ice princess', 'Smooth skater', 'Wobbly wonder', 'Penguin'],
};
export const LIMIT = 70;
export const RINK = { hw: 12, hd: 7.5 };
export const GATE_HW = 1.4;
export const CLEAN_R = 0.55;
export const SKATE = { speed: 5.6, accel: 2.2, turn: 2.2, slip: 2.4, crashSpeed: 1.2 };
export const SPIN = { time: 0.9, minSpeed: 3 };
export const SNOWMEN = 5;

export class SkateSim {
  readonly clock = new Clock(LIMIT);
  readonly gates: Gate[] = [];
  readonly snowmen: Snowman[] = [];
  state: 'ready' | 'playing' | 'done' = 'ready';
  pos: Vec2 = { x: 0, z: RINK.hd - 1.5 };
  vel: Vec2 = { x: 0, z: 0 };
  heading = -Math.PI / 2; // facing −x: anticlockwise round the rink
  speed = 0;
  next = 0; lap = 0;
  score = 0; gatesTaken = 0; cleanGates = 0; missed = 0; spins = 0; crashes = 0;
  spinning = 0; clean = true;
  /** one spin pays per gate — spin again after the next one */
  spun = false;
  /** the sideways slide right now (−1 … 1, for the view's lean / spray) */
  drift = 0;
  events: SkateEvent[] = [];
  private rnd: () => number;
  private crashCool = 0; private boardsCool = 0; private lastGateSide = 0;

  constructor(_variant: string | null | undefined, seed = 7) {
    this.rnd = seeded(seed);
    // eight gates round the oval, each facing the way round: start at the bottom (z > 0) and go round with x increasing first
    for (let i = 0; i < 8; i++) {
      const an = Math.PI / 2 + (i / 8) * Math.PI * 2;
      const rx = RINK.hw - 2.4, rz = RINK.hd - 2;
      const x = Math.cos(an) * rx, z = Math.sin(an) * rz;
      const tx = -Math.sin(an) * rx, tz = Math.cos(an) * rz; const tl = Math.hypot(tx, tz) || 1;
      const dir = { x: tx / tl, z: tz / tl };
      this.gates.push({ id: i, x, z, nx: -dir.z, nz: dir.x, dir });
    }
    for (let i = 0; i < SNOWMEN; i++) {
      for (let tries = 0; tries < 30; tries++) {
        const x = (this.rnd() - 0.5) * 2 * (RINK.hw - 2), z = (this.rnd() - 0.5) * 2 * (RINK.hd - 2);
        if (this.gates.some((g) => Math.hypot(g.x - x, g.z - z) < 2.6) || Math.hypot(x - this.pos.x, z - this.pos.z) < 3 || this.snowmen.some((s) => Math.hypot(s.x - x, s.z - z) < 2.5)) continue;
        this.snowmen.push({ id: i, x, z, r: 0.6 }); break;
      }
    }
    const g0 = this.gates[0]; this.pos = { x: g0.x - g0.dir.x * 3.5, z: g0.z - g0.dir.z * 3.5 }; this.heading = Math.atan2(g0.dir.x, g0.dir.z);
    this.lastGateSide = this.sideOf(this.gates[0]);
  }

  start(): void { if (this.state === 'ready') this.state = 'playing'; }
  get gate(): Gate { return this.gates[this.next]; }
  /** which side of a gate's line you are on (sign of the distance along its direction) */
  sideOf(g: Gate): number { return Math.sign((this.pos.x - g.x) * g.dir.x + (this.pos.z - g.z) * g.dir.z) || 1; }
  /** inside the oval? */
  inside(x: number, z: number): boolean { return (x * x) / (RINK.hw * RINK.hw) + (z * z) / (RINK.hd * RINK.hd) <= 1; }
  /** SPIN: a style move between gates (needs some speed; you can't steer while spinning) */
  spin(): boolean { if (this.state !== 'playing' || this.spinning > 0 || this.spun || this.speed < SPIN.minSpeed) return false; this.spinning = SPIN.time; this.spun = true; this.events.push({ kind: 'spin' }); return true; }

  step(dt: number, input: Vec2): void {
    this.events.length = 0;
    if (this.state !== 'playing') return;
    const w = this.clock.step(dt);
    if (w === 'timeup') { this.state = 'done'; this.events.push({ kind: 'timeup' }); return; }
    if (typeof w === 'number') this.events.push({ kind: 'warn', n: w });
    this.crashCool -= dt; this.boardsCool -= dt;
    // leaning turns you; spinning spins you
    const lean = Math.max(-1, Math.min(1, input.x || 0));
    if (this.spinning > 0) { this.spinning -= dt; this.heading += (Math.PI * 2 / SPIN.time) * dt; if (this.spinning <= 0) { this.spinning = 0; this.spins++; this.score += SCORING.spin; this.events.push({ kind: 'spinDone', value: SCORING.spin }); } }
    else this.heading -= lean * SKATE.turn * dt; // right-positive: a lean right turns clockwise (heading decreases), like the boats
    this.heading = wrapAngle(this.heading);
    // you always push forward; the skates slide, so the velocity only slowly follows the heading
    this.speed = Math.min(SKATE.speed, this.speed + SKATE.accel * dt);
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    const k = Math.min(1, SKATE.slip * dt);
    this.vel.x += (fx * this.speed - this.vel.x) * k; this.vel.z += (fz * this.speed - this.vel.z) * k;
    this.drift = (this.vel.x * fz - this.vel.z * fx) / Math.max(1, this.speed);
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    // the boards
    if (!this.inside(this.pos.x, this.pos.z)) {
      const an = Math.atan2(this.pos.z / RINK.hd, this.pos.x / RINK.hw); this.pos.x = Math.cos(an) * (RINK.hw - 0.05); this.pos.z = Math.sin(an) * (RINK.hd - 0.05);
      const nx = this.pos.x / (RINK.hw * RINK.hw), nz = this.pos.z / (RINK.hd * RINK.hd); const nl = Math.hypot(nx, nz) || 1; const into = (this.vel.x * nx + this.vel.z * nz) / nl;
      if (into > 0) { this.vel.x -= (nx / nl) * into * 1.3; this.vel.z -= (nz / nl) * into * 1.3; }
      if (this.boardsCool <= 0) { this.boardsCool = 0.8; this.speed *= 0.6; this.events.push({ kind: 'boards' }); }
    }
    // snowmen
    for (const s of this.snowmen) {
      const dx = this.pos.x - s.x, dz = this.pos.z - s.z, d = Math.hypot(dx, dz), min = s.r + 0.35;
      if (d < min && d > 1e-6) {
        this.pos.x = s.x + (dx / d) * min; this.pos.z = s.z + (dz / d) * min;
        const into = (this.vel.x * dx + this.vel.z * dz) / d; if (into < 0) { this.vel.x -= (dx / d) * into * 1.2; this.vel.z -= (dz / d) * into * 1.2; }
        if (this.crashCool <= 0) { this.crashCool = 1; this.crashes++; this.speed = SKATE.crashSpeed; this.clean = false; this.spinning = 0; this.score = Math.max(0, this.score - SCORING.crash); this.events.push({ kind: 'crash', value: SCORING.crash }); }
      }
    }
    // the lit gate: crossing its line the right way between the flags counts; crossing it wide = missed (the next lights up anyway)
    const g = this.gate; const side = this.sideOf(g);
    if (this.lastGateSide < 0 && side > 0) {
      const across = Math.abs((this.pos.x - g.x) * g.nx + (this.pos.z - g.z) * g.nz);
      if (across <= GATE_HW) {
        const cleanNow = this.clean && across <= CLEAN_R && this.spinning === 0;
        const value = cleanNow ? SCORING.clean : SCORING.gate; this.score += value; this.gatesTaken++; if (cleanNow) this.cleanGates++;
        this.events.push({ kind: cleanNow ? 'clean' : 'gate', gate: g, value, n: this.next });
      } else { this.missed++; this.events.push({ kind: 'missed', gate: g, n: this.next }); }
      this.clean = true; this.spun = false;
      this.next = (this.next + 1) % this.gates.length;
      if (this.next === 0) { this.lap++; this.events.push({ kind: 'lap', n: this.lap }); }
      this.lastGateSide = this.sideOf(this.gate);
    } else this.lastGateSide = side;
  }

  place(): number { return tierPlace(this.score, SCORING.tiers); }
  result(): { place: number; score: number; timeMs: number; tier: string; stats: { label: string; value: string }[] } {
    const place = this.place();
    return { place, score: this.score, timeMs: Math.round(this.clock.time * 1000), tier: SCORING.tierNames[place - 1], stats: [{ label: 'Gates', value: String(this.gatesTaken) }, { label: 'Clean gates', value: String(this.cleanGates) }, { label: 'Spins', value: String(this.spins) }, { label: 'Crashes', value: String(this.crashes) }] };
  }
}
