/**
 * Ice Skating — RULES only (no DOM, no Three.js): a real rink (a rounded rectangle with boards all round). You glide forward
 * at a steady speed all the time and only STEER: lean left / right and the skater turns, the way a boat or a kart does — no
 * sliding, no spinning out. Lean TOWARDS the lit gate and the skater locks on and carves through it by itself; lean away
 * and you steer freely. The boards bounce you gently back in (no crash, no stuck), a snowman only costs a little speed and
 * 20 points, and the lit gate is four metres wide. Glide through it (30; 45 when you pass near the middle with no crash
 * since the last gate), the next one lights up, round and round. SPIN once between gates for 15 style points (you keep
 * steering, just a bit slower). 70 seconds. Checked by `adv/skate-check.ts`.
 */
import { Clock, seeded, tierPlace, type Vec2 } from '../arcade';
const wrapAngle = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

export interface Gate { id: number; x: number; z: number; nx: number; nz: number; dir: Vec2 }
export interface Snowman { id: number; x: number; z: number; r: number }
export interface SkateEvent { kind: 'gate' | 'clean' | 'missed' | 'spin' | 'spinDone' | 'crash' | 'boards' | 'lap' | 'warn' | 'timeup'; gate?: Gate; value?: number; n?: number }

export const SCORING = {
  gate: 30, clean: 45, spin: 15, crash: 20,
  tiers: [2300, 1250, 600] as [number, number, number],
  tierNames: ['Ice princess', 'Smooth skater', 'Wobbly wonder', 'Penguin'],
};
export const LIMIT = 70;
/** the rink: half width / half depth and the radius of its rounded corners (metres) */
export const RINK = { hw: 13, hd: 8, r: 5.2 };
/** half the width of a gate (they are 2 × this wide) and the half width that still counts as "clean" */
export const GATE_HW = 2;
export const CLEAN_R = 1;
export const SKATE = { speed: 5, accel: 5, turn: 2.6, helm: 9, turnSmooth: 12, crashSpeed: 0.4, assist: 4, assistMax: 2.8 };
export const SPIN = { time: 0.75, minSpeed: 2.5, steerK: 0.6 };
export const SNOWMEN = 5;

/** signed distance to the rink's edge (negative = on the ice) and the outward normal there */
export function edge(x: number, z: number, inset = 0): { d: number; nx: number; nz: number } {
  const bx = RINK.hw - inset, bz = RINK.hd - inset, r = Math.max(0.01, RINK.r - inset);
  const px = Math.abs(x), pz = Math.abs(z), qx = px - (bx - r), qz = pz - (bz - r);
  const sx = x < 0 ? -1 : 1, sz = z < 0 ? -1 : 1;
  if (qx > 0 && qz > 0) { const l = Math.hypot(qx, qz) || 1e-6; return { d: l - r, nx: (qx / l) * sx, nz: (qz / l) * sz }; }
  if (qx > qz) return { d: qx - r, nx: sx, nz: 0 };
  return { d: qz - r, nx: 0, nz: sz };
}

/** a point `s` metres along the rounded-rectangle track (inset from the boards), anticlockwise from the bottom middle, with its direction */
export function trackPoint(s: number, inset: number): { x: number; z: number; tx: number; tz: number } {
  const bx = RINK.hw - inset, bz = RINK.hd - inset, r = Math.max(0.01, RINK.r - inset);
  const sx = bx - r, sz = bz - r; // straight half lengths
  const arc = (Math.PI / 2) * r;
  // order: bottom edge (x from 0 to +sx... we go with increasing x first), corner, right edge, corner, top edge, corner, left edge, corner, back to the bottom
  const segs: { len: number; at: (u: number) => { x: number; z: number; tx: number; tz: number } }[] = [
    { len: sx, at: (u) => ({ x: u, z: bz, tx: 1, tz: 0 }) },
    { len: arc, at: (u) => { const a = Math.PI / 2 - u / r; return { x: sx + Math.cos(a) * r, z: sz + Math.sin(a) * r, tx: Math.sin(a), tz: -Math.cos(a) }; } },
    { len: 2 * sz, at: (u) => ({ x: bx, z: sz - u, tx: 0, tz: -1 }) },
    { len: arc, at: (u) => { const a = -u / r; return { x: sx + Math.cos(a) * r, z: -sz + Math.sin(a) * r, tx: Math.sin(a), tz: -Math.cos(a) }; } },
    { len: 2 * sx, at: (u) => ({ x: sx - u, z: -bz, tx: -1, tz: 0 }) },
    { len: arc, at: (u) => { const a = -Math.PI / 2 - u / r; return { x: -sx + Math.cos(a) * r, z: -sz + Math.sin(a) * r, tx: Math.sin(a), tz: -Math.cos(a) }; } },
    { len: 2 * sz, at: (u) => ({ x: -bx, z: -sz + u, tx: 0, tz: 1 }) },
    { len: arc, at: (u) => { const a = Math.PI - u / r; return { x: -sx + Math.cos(a) * r, z: sz + Math.sin(a) * r, tx: Math.sin(a), tz: -Math.cos(a) }; } },
    { len: sx, at: (u) => ({ x: -sx + u, z: bz, tx: 1, tz: 0 }) },
  ];
  const total = segs.reduce((a, b) => a + b.len, 0);
  let t = ((s % total) + total) % total;
  for (const sg of segs) { if (t <= sg.len) return sg.at(t); t -= sg.len; }
  return segs[0].at(0);
}
/** length of the track at an inset (metres) */
export function trackLength(inset: number): number { const r = Math.max(0.01, RINK.r - inset); return 2 * (2 * (RINK.hw - inset - r)) + 2 * (2 * (RINK.hd - inset - r)) + 2 * Math.PI * r; }

export class SkateSim {
  readonly clock = new Clock(LIMIT);
  readonly gates: Gate[] = [];
  readonly snowmen: Snowman[] = [];
  state: 'ready' | 'playing' | 'done' = 'ready';
  pos: Vec2 = { x: 0, z: RINK.hd - 1.5 };
  vel: Vec2 = { x: 0, z: 0 };
  /** the way you travel: forward = (sin heading, cos heading); a lean right turns it clockwise (heading decreases), like the boats */
  heading = -Math.PI / 2;
  speed = 0;
  next = 0; lap = 0;
  score = 0; gatesTaken = 0; cleanGates = 0; missed = 0; spins = 0; crashes = 0;
  /** seconds of spin left (0 = not spinning) — the skater keeps steering while it turns */
  spinning = 0;
  clean = true;
  /** one spin pays per gate — spin again after the next one */
  spun = false;
  /** how hard you are carving right now (−1 … 1, + = to the right) — the view leans and sprays with it */
  drift = 0;
  /** the smoothed steering (the helm follows your lean) */
  steer = 0;
  /** the heading change right now (rad/s, + = left) */
  turnRate = 0;
  events: SkateEvent[] = [];
  private rnd: () => number;
  private crashCool = 0; private boardsCool = 0; private lastGateSide = 0;

  constructor(_variant: string | null | undefined, seed = 7) {
    this.rnd = seeded(seed);
    // eight gates round the rink, weaving a little between an outer and an inner lane, each facing the way round
    const N = 8, lane = [2.8, 3.9];
    for (let i = 0; i < N; i++) {
      const inset = lane[i % 2];
      // spread by arc length on the middle lane so they sit evenly
      const s = (i / N) * trackLength(3.5) + 1.2;
      const p = trackPoint(s * (trackLength(inset) / trackLength(3.5)), inset);
      this.gates.push({ id: i, x: p.x, z: p.z, nx: -p.tz, nz: p.tx, dir: { x: p.tx, z: p.tz } });
    }
    for (let i = 0; i < SNOWMEN; i++) {
      for (let tries = 0; tries < 60; tries++) {
        const x = (this.rnd() - 0.5) * 2 * (RINK.hw - 3), z = (this.rnd() - 0.5) * 2 * (RINK.hd - 2.5);
        if (edge(x, z, 1.6).d > 0) continue;
        if (this.gates.some((g) => Math.hypot(g.x - x, g.z - z) < 3.2) || Math.hypot(x - this.pos.x, z - this.pos.z) < 3 || this.snowmen.some((s) => Math.hypot(s.x - x, s.z - z) < 3)) continue;
        this.snowmen.push({ id: i, x, z, r: 0.55 }); break;
      }
    }
    const g0 = this.gates[0]; this.pos = { x: g0.x - g0.dir.x * 4, z: g0.z - g0.dir.z * 4 }; this.heading = Math.atan2(g0.dir.x, g0.dir.z);
    this.lastGateSide = this.sideOf(this.gates[0]);
  }

  start(): void { if (this.state === 'ready') this.state = 'playing'; }
  get gate(): Gate { return this.gates[this.next]; }
  /** which side of a gate's line you are on (sign of the distance along its direction) */
  sideOf(g: Gate): number { return Math.sign((this.pos.x - g.x) * g.dir.x + (this.pos.z - g.z) * g.dir.z) || 1; }
  /** on the ice? */
  inside(x: number, z: number): boolean { return edge(x, z).d <= 0; }
  /** where the steering assist aims: through the lit gate, or — if you are already past its line — back in front of it */
  aim(): Vec2 {
    const g = this.gate;
    const t = this.sideOf(g) > 0 ? { x: g.x - g.dir.x * 3.2, z: g.z - g.dir.z * 3.2 } : { x: g.x + g.dir.x * 1.6, z: g.z + g.dir.z * 1.6 };
    // a snowman on the way: aim round it instead of through it
    const dx = t.x - this.pos.x, dz = t.z - this.pos.z, len = Math.hypot(dx, dz) || 1, ux = dx / len, uz = dz / len;
    let best: Snowman | null = null, bu = Infinity;
    for (const s of this.snowmen) {
      const ax = s.x - this.pos.x, az = s.z - this.pos.z, u = ax * ux + az * uz, v = ax * uz - az * ux;
      if (u > 0.4 && u < len - 0.3 && Math.abs(v) < s.r + 1.1 && u < bu) { best = s; bu = u; }
    }
    if (!best) return t;
    const v = (best.x - this.pos.x) * uz - (best.z - this.pos.z) * ux; const off = -(v >= 0 ? 1 : -1) * (best.r + 1.4);
    return { x: best.x + uz * off, z: best.z - ux * off };
  }
  /** SPIN: a style move between gates (needs some speed; you keep steering, a little slower) */
  spin(): boolean { if (this.state !== 'playing' || this.spinning > 0 || this.spun || this.speed < SPIN.minSpeed) return false; this.spinning = SPIN.time; this.spun = true; this.events.push({ kind: 'spin' }); return true; }

  step(dt: number, input: Vec2): void {
    this.events.length = 0;
    if (this.state !== 'playing') return;
    const w = this.clock.step(dt);
    if (w === 'timeup') { this.state = 'done'; this.events.push({ kind: 'timeup' }); return; }
    if (typeof w === 'number') this.events.push({ kind: 'warn', n: w });
    this.crashCool -= dt; this.boardsCool -= dt;
    const lean = clamp(input.x || 0, -1, 1);
    // the helm follows your lean smoothly
    this.steer += (lean - this.steer) * Math.min(1, SKATE.helm * dt);
    // steering: your own turn (left = heading up) …
    let dh = -this.steer * SKATE.turn * (this.spinning > 0 ? SPIN.steerK : 1);
    // … plus the assist: lean TOWARDS the lit gate (even a little) and the skater carves through it by itself
    const a = this.aim();
    const err = wrapAngle(Math.atan2(a.x - this.pos.x, a.z - this.pos.z) - this.heading);
    const assisted = Math.abs(lean) > 0.12 && Math.sign(-lean) === Math.sign(err);
    if (assisted) dh = clamp(err * SKATE.assist, -SKATE.assistMax, SKATE.assistMax) * (this.spinning > 0 ? 0.8 : 1);
    // snowmen right ahead and boards you are running into nudge you away (only when you aren't steering hard yourself)
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    let push = 0;
    for (const s of this.snowmen) {
      const dx = s.x - this.pos.x, dz = s.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d > 3 || d < 1e-6) continue;
      const along = (dx * fx + dz * fz) / d; if (along < 0.7) continue; // only the ones in front
      const side = (fx * dz - fz * dx) / d; // + = it is to your right, so turn left
      push += Math.sign(side || 1) * (1 - d / 3) * 2.2 * along;
    }
    const e = edge(this.pos.x, this.pos.z);
    if (e.d > -1.1) { const into = fx * e.nx + fz * e.nz; if (into > 0.05) { const side = fx * e.nz - fz * e.nx; push += Math.sign(side || 1) * 1.8 * into * Math.min(1, (e.d + 1.1) / 1.1); } }
    if (!assisted && Math.abs(lean) > 0.1) dh += push; // dodging only helps while you are steering — no lean, no help
    this.turnRate += (dh - this.turnRate) * Math.min(1, SKATE.turnSmooth * dt);
    this.heading = wrapAngle(this.heading + this.turnRate * dt);
    this.drift = clamp(-this.turnRate / SKATE.turn, -1, 1);
    if (this.spinning > 0) { this.spinning -= dt; if (this.spinning <= 0) { this.spinning = 0; this.spins++; this.score += SCORING.spin; this.events.push({ kind: 'spinDone', value: SCORING.spin }); } }
    // you always push forward at a steady speed (carving costs a little; crashes cost more and you pick it up again quickly)
    const target = SKATE.speed * (1 - 0.1 * Math.abs(this.drift));
    this.speed += clamp(target - this.speed, -SKATE.accel * dt, SKATE.accel * dt);
    const nfx = Math.sin(this.heading), nfz = Math.cos(this.heading);
    this.pos.x += nfx * this.speed * dt; this.pos.z += nfz * this.speed * dt;
    // the boards: a soft bounce — you are put back on the ice and turned along the wall, no stop, no stuck
    const e2 = edge(this.pos.x, this.pos.z, 0.25);
    if (e2.d > 0) {
      this.pos.x -= e2.nx * e2.d; this.pos.z -= e2.nz * e2.d;
      const vx = Math.sin(this.heading), vz = Math.cos(this.heading); const into = vx * e2.nx + vz * e2.nz;
      if (into > 0) { const rx = vx - 1.7 * into * e2.nx, rz = vz - 1.7 * into * e2.nz; this.heading = Math.atan2(rx, rz); }
      if (this.boardsCool <= 0) { this.boardsCool = 0.7; this.speed *= 0.88; this.events.push({ kind: 'boards' }); }
    }
    // snowmen: a bump and 20 points (the bump turns you away a little)
    for (const s of this.snowmen) {
      const dx = this.pos.x - s.x, dz = this.pos.z - s.z, d = Math.hypot(dx, dz), min = s.r + 0.32;
      if (d < min && d > 1e-6) {
        this.pos.x = s.x + (dx / d) * min; this.pos.z = s.z + (dz / d) * min;
        const vx = Math.sin(this.heading), vz = Math.cos(this.heading); const into = -(vx * dx + vz * dz) / d;
        if (into > 0) { const rx = vx + 1.5 * into * (dx / d), rz = vz + 1.5 * into * (dz / d); this.heading = Math.atan2(rx, rz); }
        if (this.crashCool <= 0) { this.crashCool = 1; this.crashes++; this.speed = SKATE.speed * SKATE.crashSpeed; this.clean = false; this.score = Math.max(0, this.score - SCORING.crash); this.events.push({ kind: 'crash', value: SCORING.crash }); }
      }
    }
    this.vel.x = Math.sin(this.heading) * this.speed; this.vel.z = Math.cos(this.heading) * this.speed;
    // the lit gate: crossing its line the right way between the poles counts; crossing it wide = missed (the next lights up anyway)
    const g = this.gate; const side = this.sideOf(g);
    if (this.lastGateSide < 0 && side > 0) {
      const across = Math.abs((this.pos.x - g.x) * g.nx + (this.pos.z - g.z) * g.nz);
      const through = Math.sin(this.heading) * g.dir.x + Math.cos(this.heading) * g.dir.z; // facing the way through
      if (across <= GATE_HW + 0.15 && through > 0.35) {
        const cleanNow = this.clean && across <= CLEAN_R;
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
