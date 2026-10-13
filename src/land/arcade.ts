/**
 * Fuzzies Adventures — the SHARED mini-game infrastructure (no DOM, no Three.js), used by every timed challenge
 * (the Hairball Vacuum, the Forest Challenge, and whatever comes next):
 *  - `Clock`: a countdown with warning ticks (30 s, 10 s, 3-2-1) and "time up";
 *  - `Combo`: chained collections with a configurable multiplier ladder;
 *  - `tierPlace()`: a score → finishing place (1st…4th) from thresholds, so every game pays through the same `coins[]` table;
 *  - `Mover`: a top-down character that accelerates, turns to face its motion and slides round obstacles (circles and
 *    boxes) inside an arena — the same feel in every challenge;
 *  - `seeded()`: a small deterministic random source, so a day's layout is the same on every device.
 * The boat race keeps its own physics (land/race.ts); it shares only the mission bookkeeping in land/adventures.ts.
 */
export interface Vec2 { x: number; z: number }

/** A deterministic random source (mulberry32) — give it the day number and everybody gets the same layout. */
export function seeded(seed: number): () => number {
  let a = (seed >>> 0) || 1;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** A countdown. `step()` returns the warning that fired this step (if any), so the view can beep and flash once. */
export class Clock {
  time = 0;
  done = false;
  private fired = new Set<number>();
  readonly limit: number; readonly warnAt: number[];
  constructor(limit: number, warnAt: number[] = [30, 10, 3, 2, 1]) { this.limit = limit; this.warnAt = warnAt; }
  get left(): number { return Math.max(0, this.limit - this.time); }
  /** 0 → 1 over the whole challenge */
  get k(): number { return Math.min(1, this.time / this.limit); }
  step(dt: number): number | 'timeup' | null {
    if (this.done) return null;
    this.time += dt;
    if (this.time >= this.limit) { this.time = this.limit; this.done = true; return 'timeup'; }
    for (const w of this.warnAt) if (!this.fired.has(w) && this.left <= w) { this.fired.add(w); return w; }
    return null;
  }
}

/** Chained scoring: collections within `window` seconds of each other grow the chain; the multiplier climbs a ladder. */
export class Combo {
  chain = 0;
  best = 0;
  private since = Infinity;
  readonly window: number; readonly ladder: { at: number; mult: number }[];
  constructor(window = 1.6, ladder: { at: number; mult: number }[] = [{ at: 0, mult: 1 }, { at: 5, mult: 1.5 }, { at: 10, mult: 2 }, { at: 20, mult: 3 }]) { this.window = window; this.ladder = ladder; }
  get mult(): number { let m = 1; for (const l of this.ladder) if (this.chain >= l.at) m = l.mult; return m; }
  /** the next ladder step (for a "3 more for ×2" hint), or null at the top */
  get next(): { at: number; mult: number } | null { return this.ladder.find((l) => l.at > this.chain) ?? null; }
  step(dt: number): boolean { this.since += dt; if (this.chain > 0 && this.since > this.window) { this.chain = 0; return true; } return false; }
  /** a collection: returns the multiplier that applies to it */
  hit(): number { this.chain++; this.since = 0; this.best = Math.max(this.best, this.chain); return this.mult; }
  reset(): void { this.chain = 0; this.since = Infinity; }
}

/** Score → place: thresholds for 1st, 2nd, 3rd (descending); below the last is 4th. */
export function tierPlace(score: number, thresholds: [number, number, number]): number {
  return score >= thresholds[0] ? 1 : score >= thresholds[1] ? 2 : score >= thresholds[2] ? 3 : 4;
}

export type Obstacle = { kind: 'circle'; x: number; z: number; r: number } | { kind: 'box'; x: number; z: number; hw: number; hd: number };

export interface MoverOpts { accel: number; max: number; friction: number; turn: number; radius: number; bounds: { hw: number; hd: number } }
/** A top-down character: push it with an input vector (−1…1 each axis); it speeds up, slows down, faces where it goes and slides round obstacles. */
export class Mover {
  pos: Vec2 = { x: 0, z: 0 };
  vel: Vec2 = { x: 0, z: 0 };
  /** facing angle: forward = (sin, cos), like the boats and the town's Fuzzies */
  heading = 0;
  speed = 0;
  /** true on the steps where an obstacle or the fence stopped the motion (for a little "oof") */
  blocked = false;
  readonly o: MoverOpts; readonly obstacles: Obstacle[];
  constructor(o: MoverOpts, obstacles: Obstacle[] = []) { this.o = o; this.obstacles = obstacles; }
  step(dt: number, input: Vec2): void {
    const il = Math.hypot(input.x, input.z);
    const ix = il > 1 ? input.x / il : input.x, iz = il > 1 ? input.z / il : input.z;
    const push = Math.min(1, il);
    this.vel.x += ix * this.o.accel * dt;
    this.vel.z += iz * this.o.accel * dt;
    // friction (stronger when the stick is released, so the Fuzzy stops where you want)
    const f = Math.exp(-this.o.friction * (push > 0.05 ? 1 : 2.4) * dt);
    this.vel.x *= f; this.vel.z *= f;
    const v = Math.hypot(this.vel.x, this.vel.z);
    if (v > this.o.max) { this.vel.x *= this.o.max / v; this.vel.z *= this.o.max / v; }
    this.speed = Math.min(v, this.o.max);
    if (push > 0.05) this.heading = turnTowards(this.heading, Math.atan2(ix, iz), this.o.turn * dt);
    else if (this.speed > 0.4) this.heading = turnTowards(this.heading, Math.atan2(this.vel.x, this.vel.z), this.o.turn * 0.5 * dt);
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.blocked = false;
    this.resolve();
  }
  /** push out of obstacles and the fence */
  private resolve(): void {
    const r = this.o.radius;
    const { hw, hd } = this.o.bounds;
    if (Math.abs(this.pos.x) > hw - r) { this.pos.x = Math.sign(this.pos.x) * (hw - r); this.vel.x *= -0.1; this.blocked = true; }
    if (Math.abs(this.pos.z) > hd - r) { this.pos.z = Math.sign(this.pos.z) * (hd - r); this.vel.z *= -0.1; this.blocked = true; }
    for (const ob of this.obstacles) {
      if (ob.kind === 'circle') {
        const dx = this.pos.x - ob.x, dz = this.pos.z - ob.z, d = Math.hypot(dx, dz), min = ob.r + r;
        if (d < min && d > 1e-6) {
          const k = (min - d) / d; this.pos.x += dx * k; this.pos.z += dz * k;
          const n = { x: dx / d, z: dz / d }; const into = this.vel.x * n.x + this.vel.z * n.z;
          if (into < 0) {
            this.vel.x -= n.x * into; this.vel.z -= n.z * into;
            // heading straight at a trunk: slip round it instead of sticking (whichever side the motion already leans to)
            const tx = -n.z, tz = n.x; const along = this.vel.x * tx + this.vel.z * tz;
            const side = Math.abs(along) > 0.3 ? Math.sign(along) : (Math.sin(this.heading * 3 + ob.x + ob.z) >= 0 ? 1 : -1);
            this.vel.x += tx * side * 1.6; this.vel.z += tz * side * 1.6;
          }
          this.blocked = true;
        }
      } else {
        // the nearest point of the box; push along the shallowest axis
        const cx = Math.max(ob.x - ob.hw, Math.min(ob.x + ob.hw, this.pos.x)), cz = Math.max(ob.z - ob.hd, Math.min(ob.z + ob.hd, this.pos.z));
        const dx = this.pos.x - cx, dz = this.pos.z - cz, d = Math.hypot(dx, dz);
        if (d < r) {
          if (d > 1e-6) { const k = (r - d) / d; this.pos.x += dx * k; this.pos.z += dz * k; const n = { x: dx / d, z: dz / d }; const into = this.vel.x * n.x + this.vel.z * n.z; if (into < 0) { this.vel.x -= n.x * into; this.vel.z -= n.z * into; } }
          else { // centre inside the box: leave by the nearest face
            const px = ob.hw - Math.abs(this.pos.x - ob.x), pz = ob.hd - Math.abs(this.pos.z - ob.z);
            if (px < pz) { this.pos.x = ob.x + Math.sign(this.pos.x - ob.x || 1) * (ob.hw + r); this.vel.x = 0; } else { this.pos.z = ob.z + Math.sign(this.pos.z - ob.z || 1) * (ob.hd + r); this.vel.z = 0; }
          }
          this.blocked = true;
        }
      }
    }
  }
}

export function turnTowards(a: number, b: number, maxStep: number): number {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + Math.max(-maxStep, Math.min(maxStep, d));
}

/** Is a point free of obstacles (with a margin)? Used when scattering things to collect. */
export function freeSpot(p: Vec2, obstacles: Obstacle[], margin: number): boolean {
  for (const ob of obstacles) {
    if (ob.kind === 'circle') { if (Math.hypot(p.x - ob.x, p.z - ob.z) < ob.r + margin) return false; }
    else if (Math.abs(p.x - ob.x) < ob.hw + margin && Math.abs(p.z - ob.z) < ob.hd + margin) return false;
  }
  return true;
}
