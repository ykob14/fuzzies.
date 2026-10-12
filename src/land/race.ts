/**
 * Fuzzies Boat Race — the RULES and physics only (no DOM, no Three.js): the course around Palm Island (a smooth loop with
 * checkpoint gates), boats with throttle/steering/drift/collisions, computer racers with different skill, lap validation
 * (every gate in order), live positions and the finishing order. The 3D scene (land/raceView.ts) only draws what this says.
 * Checked without a browser by `adv/race-check.ts`.
 */
export interface Vec { x: number; z: number }
export const LAPS = 3;
export const ISLAND_R = 11; // the island in the middle (an obstacle)
export const OUTER_R = 40; // the reef: boats can't leave the lagoon
export const GATE_W = 5.5; // half-width of a checkpoint gate
const MAX_SPEED = 13.5, ACCEL = 7.5, BRAKE = 12, DRAG = 0.045, TURN = 1.9, GRIP = 3.2;

export interface Gate { at: Vec; dir: Vec; n: Vec; i: number }
export interface Course { samples: Vec[]; tangents: Vec[]; gates: Gate[]; length: number }

const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, z: a.z - b.z });
const len = (a: Vec): number => Math.hypot(a.x, a.z);
const norm = (a: Vec): Vec => { const l = len(a) || 1; return { x: a.x / l, z: a.z / l }; };
const dot = (a: Vec, b: Vec): number => a.x * b.x + a.z * b.z;
export const wrapAngle = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** A closed Catmull-Rom loop through control points. */
function spline(ctrl: Vec[], per = 24): Vec[] {
  const out: Vec[] = [];
  const n = ctrl.length;
  for (let i = 0; i < n; i++) {
    const p0 = ctrl[(i - 1 + n) % n], p1 = ctrl[i], p2 = ctrl[(i + 1) % n], p3 = ctrl[(i + 2) % n];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        z: 0.5 * (2 * p1.z + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3),
      });
    }
  }
  return out;
}

/** The lagoon loop: a rounded course around the island with two wider sweeps and a tight bend, 8 gates (gate 0 = start/finish). */
export function makeCourse(): Course {
  const ctrl: Vec[] = [];
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    // vary the radius so the course has character: a long straight, a wide sweep and a pinch
    const r = 22 + 5 * Math.sin(a * 2 + 0.6) + 2.5 * Math.cos(a * 3 + 1.1);
    ctrl.push({ x: Math.cos(a) * r, z: Math.sin(a) * r });
  }
  const samples = spline(ctrl, 24);
  const tangents = samples.map((p, i) => norm(sub(samples[(i + 1) % samples.length], samples[(i - 1 + samples.length) % samples.length])));
  let length = 0;
  for (let i = 0; i < samples.length; i++) length += len(sub(samples[(i + 1) % samples.length], samples[i]));
  const gates: Gate[] = [];
  const G = 8;
  for (let g = 0; g < G; g++) {
    const i = Math.round((g / G) * samples.length) % samples.length;
    const dir = tangents[i];
    gates.push({ at: samples[i], dir, n: { x: -dir.z, z: dir.x }, i });
  }
  return { samples, tangents, gates, length };
}

export interface Boat {
  id: number; name: string; you: boolean;
  pos: Vec; vel: Vec; heading: number; speed: number; throttle: number; steer: number;
  lap: number; next: number; finished: boolean; finishTime: number; place: number;
  /** how far along the course (for positions): laps × gates + gates passed + fraction to the next gate */
  progress: number; nearest: number;
  bump: number; wrongWay: number;
  ai: { skill: number; noise: number; t: number; look: number; line: number; want: number } | null;
}

export interface Input { throttle: number; brake: number; steer: number; assist: boolean }

export class RaceSim {
  readonly course = makeCourse();
  readonly boats: Boat[] = [];
  state: 'countdown' | 'racing' | 'finished' = 'countdown';
  countdown = 3.6;
  time = 0;
  /** things that happened this step for the view (sounds, splashes) */
  events: { kind: 'gate' | 'lap' | 'bump' | 'finish' | 'go'; boat: number }[] = [];
  private finishedCount = 0;

  constructor(racers: { name: string; you: boolean; skill?: number }[], rnd: () => number = Math.random) {
    const g0 = this.course.gates[0];
    // the grid is drawn by lot every race: no lane is a free win
    const slots = racers.map((_, i) => i);
    for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
    racers.forEach((r, i) => {
      // a staggered grid just behind the start line, side by side across the gate
      const slot = slots[i];
      const lane = ((slot % 3) - 1) * 2.6;
      const back = 3 + Math.floor(slot / 3) * 3;
      const pos = { x: g0.at.x + g0.n.x * lane - g0.dir.x * back, z: g0.at.z + g0.n.z * lane - g0.dir.z * back };
      this.boats.push({
        id: i, name: r.name, you: r.you, pos, vel: { x: 0, z: 0 }, heading: Math.atan2(g0.dir.x, g0.dir.z), speed: 0, throttle: 0, steer: 0,
        lap: 0, next: 1, finished: false, finishTime: 0, place: 0, progress: 0, nearest: g0.i, bump: 0, wrongWay: 0,
        ai: r.you ? null : { skill: r.skill ?? 0.8, noise: 0, t: rnd() * 10, look: 10 + (r.skill ?? 0.8) * 8, line: (rnd() - 0.5) * 1.2, want: 0 },
      });
    });
    this.rank();
  }

  get player(): Boat { return this.boats.find((b) => b.you) ?? this.boats[0]; }
  get gates(): number { return this.course.gates.length; }

  /** Advance the race by `dt` seconds with the player's input. */
  step(dt: number, input: Input): void {
    this.events.length = 0;
    if (this.state === 'countdown') {
      this.countdown -= dt;
      if (this.countdown <= 0) { this.state = 'racing'; this.events.push({ kind: 'go', boat: -1 }); }
      // engines rev but nobody moves
      for (const b of this.boats) { b.throttle = b.you ? input.throttle : 1; }
      return;
    }
    if (this.state === 'finished') return;
    this.time += dt;
    for (const b of this.boats) {
      if (b.finished) { this.coast(b, dt); continue; }
      if (b.ai) this.drive(b, dt);
      else {
        b.throttle = input.throttle;
        let steer = input.steer;
        if (input.assist) steer += this.assistSteer(b) * (1 - Math.abs(input.steer)) * 0.6;
        b.steer = Math.max(-1, Math.min(1, steer));
        this.move(b, dt, input.brake);
      }
      this.gates_(b);
    }
    this.collide();
    this.rank();
  }

  /** Steering that keeps a boat roughly on the course (help on touch screens, and the computer racers' brains). */
  private aimAt(b: Boat, ahead: number, line = 0): number {
    const s = this.course.samples, i = (b.nearest + ahead) % s.length;
    const t = s[i], tan = this.course.tangents[i];
    // `line` slides the aim point sideways across the lane (racing lines, overtaking)
    const tx = t.x - tan.z * line * 2.4, tz = t.z + tan.x * line * 2.4;
    const want = Math.atan2(tx - b.pos.x, tz - b.pos.z);
    return wrapAngle(want - b.heading);
  }
  private assistSteer(b: Boat): number { return Math.max(-1, Math.min(1, this.aimAt(b, Math.round(6 + b.speed * 0.35)) * 1.7)); }

  private drive(b: Boat, dt: number): void {
    const ai = b.ai!;
    ai.t += dt;
    // a little wobble so every racer feels different; skilled ones hold a cleaner line and brake less
    ai.noise = Math.sin(ai.t * 1.1 + b.id * 2) * (1 - ai.skill) * 0.18;
    // look further ahead the faster you go (a few boat lengths), never so far that the line cuts into the island
    const ahead = Math.round(4 + ai.look * 0.25 + b.speed * 0.35);
    // racing line: each racer prefers a side; a boat right ahead makes it pull out to the freer side to overtake
    let wantLine = ai.line;
    const fx = Math.sin(b.heading), fz = Math.cos(b.heading);
    for (const o of this.boats) {
      if (o === b || o.finished) continue;
      const dx = o.pos.x - b.pos.x, dz = o.pos.z - b.pos.z, d = Math.hypot(dx, dz);
      if (d > 5 || d < 0.1) continue;
      const along = (dx * fx + dz * fz) / d;
      if (along < 0.75) continue; // not in front
      const side = dx * fz - dz * fx; // + = to our left
      wantLine = side >= 0 ? Math.min(1, ai.line + 0.9) : Math.max(-1, ai.line - 0.9);
    }
    ai.want += (wantLine - ai.want) * Math.min(1, dt * 2.5);
    let a = this.aimAt(b, ahead, ai.want) + ai.noise;
    const d = len(b.pos);
    if (d < ISLAND_R + 4) { const away = wrapAngle(Math.atan2(b.pos.x, b.pos.z) - b.heading); a += away * (ISLAND_R + 4 - d) * 0.5; }
    b.steer = Math.max(-1, Math.min(1, a * 2.4));
    const bend = Math.abs(this.aimAt(b, ahead + 10));
    b.throttle = bend > 0.9 ? 0.5 + ai.skill * 0.3 : bend > 0.5 ? 0.78 + ai.skill * 0.2 : 1;
    // rubber band: a racer far behind the player presses a little harder, one far ahead eases off (races stay close but real)
    const gap = this.player.progress - b.progress;
    const band = gap > 2 ? 1.06 : gap < -2 ? 0.95 : 1;
    this.move(b, dt, 0, (0.78 + ai.skill * 0.22) * band);
  }

  private move(b: Boat, dt: number, brake: number, maxK = 1): void {
    const max = MAX_SPEED * maxK;
    const accel = b.throttle * ACCEL - brake * BRAKE - DRAG * b.speed * b.speed - 0.6;
    b.speed = Math.max(0, Math.min(max, b.speed + accel * dt));
    // turning needs way; hard turns scrub a little speed
    const turnK = Math.min(1, Math.sqrt(b.speed / MAX_SPEED) * 1.15);
    b.heading += b.steer * TURN * turnK * dt;
    b.speed -= Math.abs(b.steer) * b.speed * 0.18 * dt;
    const fx = Math.sin(b.heading), fz = Math.cos(b.heading);
    // drift: the hull slides a moment before it follows the bow
    const k = Math.min(1, dt * GRIP);
    b.vel.x += (fx * b.speed - b.vel.x) * k;
    b.vel.z += (fz * b.speed - b.vel.z) * k;
    b.pos.x += b.vel.x * dt;
    b.pos.z += b.vel.z * dt;
    // the island and the reef
    const d = len(b.pos);
    if (d < ISLAND_R + 1.2) { const n = norm(b.pos); const push = ISLAND_R + 1.2 - d; b.pos.x += n.x * push; b.pos.z += n.z * push; this.hit(b, n); }
    if (d > OUTER_R) { const n = norm(b.pos); b.pos.x = n.x * OUTER_R; b.pos.z = n.z * OUTER_R; this.hit(b, { x: -n.x, z: -n.z }); }
    b.bump = Math.max(0, b.bump - dt);
    // nearest course sample (search near the last one; the course is a loop)
    const s = this.course.samples;
    let best = b.nearest, bd = Infinity;
    for (let o = -6; o <= 14; o++) { const i = (b.nearest + o + s.length) % s.length; const dd = len(sub(s[i], b.pos)); if (dd < bd) { bd = dd; best = i; } }
    b.nearest = best;
    // going the wrong way?
    const tan = this.course.tangents[b.nearest];
    const along = dot({ x: fx, z: fz }, tan);
    b.wrongWay = along < -0.25 && b.speed > 2 ? b.wrongWay + dt : 0;
  }

  private hit(b: Boat, n: Vec): void {
    const into = -(b.vel.x * n.x + b.vel.z * n.z);
    if (into > 1.5 && b.bump <= 0) this.events.push({ kind: 'bump', boat: b.id });
    b.bump = 0.6;
    b.vel.x += n.x * Math.max(0, into) * 1.2; b.vel.z += n.z * Math.max(0, into) * 1.2;
    b.speed *= 0.45;
  }

  private coast(b: Boat, dt: number): void {
    // a victory lap at an easy pace, following the course so nobody parks in the way
    b.throttle = 0.35; b.steer = Math.max(-1, Math.min(1, this.aimAt(b, 8) * 2));
    this.move(b, dt, 0, 0.45);
  }

  private collide(): void {
    const R = 1.6;
    for (let i = 0; i < this.boats.length; i++) for (let j = i + 1; j < this.boats.length; j++) {
      const a = this.boats[i], c = this.boats[j];
      if (a.finished || c.finished) continue; // boats that have finished drift out of the way
      const d = sub(c.pos, a.pos), l = len(d);
      if (l >= R || l < 1e-4) continue;
      const n = { x: d.x / l, z: d.z / l }, push = (R - l) / 2 + 0.05;
      a.pos.x -= n.x * push; a.pos.z -= n.z * push; c.pos.x += n.x * push; c.pos.z += n.z * push;
      // a nudge apart; the knock costs speed once, not every frame they touch (that used to glue boats together)
      if (a.bump <= 0 && c.bump <= 0) {
        a.vel.x -= n.x * 1.5; a.vel.z -= n.z * 1.5; c.vel.x += n.x * 1.5; c.vel.z += n.z * 1.5;
        a.speed *= 0.85; c.speed *= 0.85;
        this.events.push({ kind: 'bump', boat: a.you || c.you ? this.player.id : a.id });
        a.bump = c.bump = 0.5;
      }
    }
  }

  /** Gates must be passed in order; a lap counts only when every gate was crossed. */
  private gates_(b: Boat): void {
    const g = this.course.gates[b.next];
    const rel = sub(b.pos, g.at);
    const across = dot(rel, g.dir), side = dot(rel, g.n);
    if (across >= 0 && across < 2.5 && Math.abs(side) <= GATE_W && dot(b.vel, g.dir) > 0) {
      if (b.next === 0) {
        b.lap++;
        if (b.lap >= LAPS) { b.finished = true; b.finishTime = this.time; b.place = ++this.finishedCount; this.events.push({ kind: 'finish', boat: b.id }); }
        else this.events.push({ kind: 'lap', boat: b.id });
      } else this.events.push({ kind: 'gate', boat: b.id });
      b.next = (b.next + 1) % this.course.gates.length;
    }
  }

  /** Live positions: laps, then gates passed, then how close the next gate is. */
  private rank(): void {
    const G = this.course.gates.length;
    for (const b of this.boats) {
      if (b.finished) { b.progress = 1000 - b.place; continue; }
      const passed = (b.next + G - 1) % G; // gates crossed this lap
      const g = this.course.gates[b.next];
      const toGate = len(sub(g.at, b.pos));
      b.progress = b.lap * G + passed + Math.max(0, 1 - toGate / 40);
    }
    const order = [...this.boats].sort((a, b) => b.progress - a.progress);
    order.forEach((b, i) => { if (!b.finished) b.place = i + 1; });
    const you = this.player;
    if (you.finished && this.state === 'racing') {
      // the player is done: the others' places are their live positions behind the ones who already finished
      this.state = 'finished';
      const done = this.boats.filter((b) => b.finished).sort((a, b) => a.finishTime - b.finishTime);
      const rest = this.boats.filter((b) => !b.finished).sort((a, b) => b.progress - a.progress);
      [...done, ...rest].forEach((b, i) => { b.place = i + 1; });
    }
  }

  /** The finishing order once the race is over (or the live order). */
  order(): Boat[] { return [...this.boats].sort((a, b) => a.place - b.place); }
  /** Which gate is next for the player and where it is relative to the heading (for the HUD arrow). */
  nextGate(): { gate: Gate; angle: number; dist: number } {
    const b = this.player, g = this.course.gates[b.next];
    const want = Math.atan2(g.at.x - b.pos.x, g.at.z - b.pos.z);
    return { gate: g, angle: wrapAngle(want - b.heading), dist: len(sub(g.at, b.pos)) };
  }
}
