/**
 * Fuzzies Boat Race — the RULES and physics only (no DOM, no Three.js): the course around Palm Island (a smooth loop with
 * checkpoint gates), boats with throttle/steering/drift/collisions, computer racers with different skill, lap validation
 * (every gate in order, missed gates must be gone back for), the racing boundary, hazards/currents/boost pads that switch on
 * lap by lap, the swell, live positions and the finishing order. The 3D scene (land/raceView.ts) only draws what this says.
 * Checked without a browser by `adv/race-check.ts`.
 *
 * Steering convention everywhere in this file: **positive = turn RIGHT** (from the boat's own point of view). The heading is
 * measured so that `forward = (sin h, cos h)` and the boat's LEFT is `(cos h, -sin h)`, so a right turn *decreases* the heading.
 */
export interface Vec { x: number; z: number }
export const LAPS = 3;
export const ISLAND_R = 11; // the island in the middle (an obstacle)
export const OUTER_R = 40; // the reef: boats can't leave the lagoon
export const EDGE_R = 35; // the racing boundary (buoys + rope): past it the water slows you and nudges you back
export const GATE_W = 5.5; // half-width of a checkpoint gate
const MAX_SPEED = 13.5, ACCEL = 7.5, BRAKE = 12, DRAG = 0.045, TURN = 1.9, GRIP = 3.2;
const BOOST_SPEED = 17.5, BOOST_TIME = 1.4;
const STEER_RATE = 10; // how fast the player's steering follows the input (smooth, not twitchy)

export interface Gate { at: Vec; dir: Vec; n: Vec; i: number }
export interface Course { samples: Vec[]; tangents: Vec[]; gates: Gate[]; length: number }
/** A floating obstacle: slalom buoys make a narrow section, barrels and logs drift in on later laps. */
export interface Hazard { kind: 'buoy' | 'barrel' | 'log'; pos: Vec; r: number; fromLap: number; yaw: number }
/** A boost pad on the water: cross it (in the course direction) for a burst of speed. */
export interface Boost { pos: Vec; dir: Vec; r: number; fromLap: number; cool: number[] }
/** A patch of moving water that pushes boats sideways (or back). */
export interface Current { pos: Vec; r: number; dir: Vec; strength: number; fromLap: number }

const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, z: a.z - b.z });
const len = (a: Vec): number => Math.hypot(a.x, a.z);
const norm = (a: Vec): Vec => { const l = len(a) || 1; return { x: a.x / l, z: a.z / l }; };
const dot = (a: Vec, b: Vec): number => a.x * b.x + a.z * b.z;
const clamp1 = (v: number): number => Math.max(-1, Math.min(1, v));
export const wrapAngle = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * The swell: the same wave the water shader draws (keep the two in step). `swell` 0–1 scales it (calm → lively).
 * Returns the height; `waveGrad` the slope (so boats pitch/roll with it and get pushed by it).
 */
export function waveHeight(x: number, z: number, t: number, swell: number): number {
  return swell * (0.22 * Math.sin(x * 0.21 + t * 0.95) + 0.14 * Math.sin(z * 0.17 - t * 0.7 + x * 0.05) + 0.08 * Math.sin((x - z) * 0.3 + t * 1.3));
}
export function waveGrad(x: number, z: number, t: number, swell: number): Vec {
  return {
    x: swell * (0.22 * 0.21 * Math.cos(x * 0.21 + t * 0.95) + 0.14 * 0.05 * Math.cos(z * 0.17 - t * 0.7 + x * 0.05) + 0.08 * 0.3 * Math.cos((x - z) * 0.3 + t * 1.3)),
    z: swell * (0.14 * 0.17 * Math.cos(z * 0.17 - t * 0.7 + x * 0.05) - 0.08 * 0.3 * Math.cos((x - z) * 0.3 + t * 1.3)),
  };
}
/** How lively the sea is on each lap (lap 1 calm, lap 2 rolling, lap 3 proper waves). */
export const SWELL_BY_STAGE = [0.25, 0.6, 1];

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

/** A point beside the course: sample `i`, `side` metres to the left (negative = right). */
function beside(c: Course, i: number, side: number): Vec {
  const p = c.samples[i % c.samples.length], t = c.tangents[i % c.samples.length];
  return { x: p.x + t.z * side, z: p.z - t.x * side };
}

/** The fixed furniture of the course (the same every race, so people can learn it): narrows, hazards, boost pads, currents. */
export function makeFeatures(c: Course): { hazards: Hazard[]; boosts: Boost[]; currents: Current[] } {
  const hazards: Hazard[] = [];
  const yawAt = (i: number) => { const t = c.tangents[i % c.samples.length]; return Math.atan2(t.x, t.z); };
  // lap 1: two narrow sections — pairs of slalom buoys that pinch the lane to about half a gate
  for (const i of [66, 162]) for (const s of [-3.3, 3.3]) hazards.push({ kind: 'buoy', pos: beside(c, i, s), r: 0.55, fromLap: 1, yaw: 0 });
  // lap 2: barrels drift into the lane
  for (const [i, s] of [[28, 1.6], [96, -1.9], [126, 0.4], [186, -1.3], [216, 1.9]] as const) hazards.push({ kind: 'barrel', pos: beside(c, i, s), r: 0.75, fromLap: 2, yaw: i });
  // lap 3: floating logs (long, lying across part of the lane)
  for (const [i, s] of [[52, -1.1], [140, 1.5], [230, 0.2]] as const) hazards.push({ kind: 'log', pos: beside(c, i, s), r: 1.05, fromLap: 3, yaw: yawAt(i) + 0.9 });
  const boosts: Boost[] = [[14, 0], [110, -0.6], [196, 0.6]].map(([i, s]) => { const t = c.tangents[i]; return { pos: beside(c, i, s), dir: { x: t.x, z: t.z }, r: 1.35, fromLap: 2, cool: [] }; });
  const currents: Current[] = [];
  for (const [i, s, across, k, from] of [[42, 0, 1, 1.5, 2], [150, 0, -1, 1.3, 2], [204, 0, 1, 1.9, 3]] as const) {
    const t = c.tangents[i];
    // sideways push (across = ±1 picks the side); the lap-3 one is stronger
    currents.push({ pos: beside(c, i, s), r: 7, dir: { x: t.z * across, z: -t.x * across }, strength: k, fromLap: from });
  }
  return { hazards, boosts, currents };
}

export interface Boat {
  id: number; name: string; you: boolean;
  pos: Vec; vel: Vec; heading: number; speed: number; throttle: number;
  /** current steering, positive = right (the player's follows the input smoothly; the view leans the hull and turns the wheel) */
  steer: number;
  lap: number; next: number; finished: boolean; finishTime: number; place: number;
  /** how far along the course (for positions): laps × gates + gates passed + fraction to the next gate */
  progress: number; nearest: number;
  bump: number; wrongWay: number;
  /** the next gate was driven past without going through it: go back and take it (seconds since) */
  missed: number;
  /** 0 inside the buoys → 1 at the reef */
  edge: number;
  /** seconds of boost left */
  boost: number;
  ai: { skill: number; noise: number; t: number; look: number; line: number; want: number } | null;
}

/** The player's input. `steer`: −1 = full left … +1 = full right. */
export interface Input { throttle: number; brake: number; steer: number; assist: boolean }

export class RaceSim {
  readonly course = makeCourse();
  readonly features = makeFeatures(this.course);
  readonly boats: Boat[] = [];
  state: 'countdown' | 'racing' | 'finished' = 'countdown';
  countdown = 3.6;
  time = 0;
  /** things that happened this step for the view (sounds, splashes) */
  events: { kind: 'gate' | 'lap' | 'bump' | 'finish' | 'go' | 'missed' | 'recovered' | 'boost' | 'edge'; boat: number }[] = [];
  private finishedCount = 0;

  constructor(racers: { name: string; you: boolean; skill?: number }[], rnd: () => number = Math.random) {
    const g0 = this.course.gates[0];
    // the grid is drawn by lot every race: no lane is a free win; everybody starts on the same line (up to 4 abreast)
    const slots = racers.map((_, i) => i);
    for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
    const perRow = Math.min(4, racers.length);
    racers.forEach((r, i) => {
      const slot = slots[i];
      const row = Math.floor(slot / perRow), col = slot % perRow;
      const lane = (col - (perRow - 1) / 2) * 2.6;
      const back = 3 + row * 3;
      const pos = { x: g0.at.x + g0.n.x * lane - g0.dir.x * back, z: g0.at.z + g0.n.z * lane - g0.dir.z * back };
      this.boats.push({
        id: i, name: r.name, you: r.you, pos, vel: { x: 0, z: 0 }, heading: Math.atan2(g0.dir.x, g0.dir.z), speed: 0, throttle: 0, steer: 0,
        lap: 0, next: 1, finished: false, finishTime: 0, place: 0, progress: 0, nearest: g0.i, bump: 0, wrongWay: 0, missed: 0, edge: 0, boost: 0,
        ai: r.you ? null : { skill: r.skill ?? 0.8, noise: 0, t: rnd() * 10, look: 10 + (r.skill ?? 0.8) * 8, line: (rnd() - 0.5) * 1.0, want: 0 },
      });
    });
    this.rank();
  }

  get player(): Boat { return this.boats.find((b) => b.you) ?? this.boats[0]; }
  get gates(): number { return this.course.gates.length; }
  /** Which lap the leader is on (0-based): the sea gets livelier and more furniture switches on as the race goes */
  get stage(): number { return Math.min(LAPS - 1, Math.max(0, ...this.boats.map((b) => (b.finished ? LAPS - 1 : b.lap)))); }
  get swell(): number { return SWELL_BY_STAGE[this.stage]; }
  active(f: { fromLap: number }): boolean { return f.fromLap <= this.stage + 1; }

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
        let want = clamp1(input.steer);
        // assisted steering (phones): a gentle hand on the helm — and a firm one back to a missed gate when the player lets go
        if (input.assist) want += this.assistSteer(b) * (1 - Math.abs(want)) * (b.missed > 0 ? 1 : 0.6);
        // smooth: the hull answers the helm over a few frames, so taps don't jerk and holding a button turns evenly
        b.steer += (clamp1(want) - b.steer) * Math.min(1, dt * STEER_RATE);
        this.move(b, dt, input.brake);
      }
      this.gates_(b);
      this.pads(b, dt);
    }
    this.collide();
    this.rank();
  }

  /** Steer (right-positive) that would point the boat at a spot on the course `ahead` samples on, `line` metres to the left. */
  private aimAt(b: Boat, ahead: number, line = 0): number {
    const s = this.course.samples, i = (b.nearest + ahead) % s.length;
    const t = s[i], tan = this.course.tangents[i];
    // `line` slides the aim point sideways across the lane (racing lines, overtaking)
    const tx = t.x + tan.z * line * 2.4, tz = t.z - tan.x * line * 2.4;
    return this.steerTo(b, { x: tx, z: tz });
  }
  /** Steer (right-positive) towards a point. */
  private steerTo(b: Boat, p: Vec): number {
    const want = Math.atan2(p.x - b.pos.x, p.z - b.pos.z);
    return -wrapAngle(want - b.heading); // the heading grows to the left, so "turn left" is negative steer
  }
  private assistSteer(b: Boat): number {
    if (b.missed > 0) return clamp1(this.recoverSteer(b) * 2.2);
    return clamp1(this.aimAt(b, Math.round(6 + b.speed * 0.35)) * 1.7);
  }
  /** Steer back to a missed gate: first to a spot behind it, then through it. */
  private recoverSteer(b: Boat): number {
    const g = this.course.gates[b.next];
    const across = dot(sub(b.pos, g.at), g.dir);
    const target = across > -2 ? { x: g.at.x - g.dir.x * 9, z: g.at.z - g.dir.z * 9 } : g.at;
    return this.steerTo(b, target);
  }

  private drive(b: Boat, dt: number): void {
    const ai = b.ai!;
    ai.t += dt;
    // a little wobble so every racer feels different; skilled ones hold a cleaner line and brake less
    ai.noise = Math.sin(ai.t * 1.1 + b.id * 2) * (1 - ai.skill) * 0.18;
    const fx = Math.sin(b.heading), fz = Math.cos(b.heading);
    let a: number, bend: number;
    if (b.missed > 0) {
      // computer racers obey the same rule: a missed gate means turning round and taking it
      a = this.recoverSteer(b) * 1.6; bend = 1;
    } else {
      // look further ahead the faster you go (a few boat lengths), never so far that the line cuts into the island
      const ahead = Math.round(4 + ai.look * 0.25 + b.speed * 0.35);
      // racing line: each racer prefers a side; a boat right ahead makes it pull out to the freer side to overtake
      let wantLine = ai.line;
      for (const o of this.boats) {
        if (o === b || o.finished) continue;
        const dx = o.pos.x - b.pos.x, dz = o.pos.z - b.pos.z, d = Math.hypot(dx, dz);
        if (d > 5 || d < 0.1) continue;
        const along = (dx * fx + dz * fz) / d;
        if (along < 0.75) continue; // not in front
        const side = dx * fz - dz * fx; // + = to our left
        wantLine = side >= 0 ? Math.max(-1, ai.line - 0.9) : Math.min(1, ai.line + 0.9);
      }
      // a boost pad just ahead on the line is worth a small detour (the better the racer, the keener)
      for (const p of this.features.boosts) {
        if (!this.active(p) || (p.cool[b.id] ?? 0) > 0) continue;
        const dx = p.pos.x - b.pos.x, dz = p.pos.z - b.pos.z, along = dx * fx + dz * fz, side = dx * fz - dz * fx;
        if (along > 1 && along < 12 && Math.abs(side) < 3) wantLine = clamp1(wantLine + (side / 2.4) * ai.skill * 0.8);
      }
      // a narrow section coming up: back to the middle of the lane
      for (const hz of this.features.hazards) {
        if (hz.kind !== 'buoy') continue;
        const dx = hz.pos.x - b.pos.x, dz = hz.pos.z - b.pos.z, along = dx * fx + dz * fz;
        if (along > 0 && along < 14 && Math.hypot(dx, dz) < 15) wantLine *= 0.15;
      }
      ai.want += (wantLine - ai.want) * Math.min(1, dt * 2.5);
      a = this.aimAt(b, ahead, ai.want) + ai.noise;
      // hazards ahead: ease away from them
      for (const hz of this.features.hazards) {
        if (!this.active(hz)) continue;
        const dx = hz.pos.x - b.pos.x, dz = hz.pos.z - b.pos.z, along = dx * fx + dz * fz;
        if (along < 0 || along > 7.5) continue;
        const side = dx * fz - dz * fx;
        if (Math.abs(side) > hz.r + 1.5) continue;
        a += (side >= 0 ? 1 : -1) * (1 - along / 7.5) * (1.6 - Math.abs(side) / (hz.r + 1.5));
      }
      bend = Math.abs(this.aimAt(b, ahead + 10));
    }
    const d = len(b.pos);
    if (d < ISLAND_R + 4) { const away = -wrapAngle(Math.atan2(b.pos.x, b.pos.z) - b.heading); a += away * (ISLAND_R + 4 - d) * 0.5; }
    b.steer = clamp1(a * 2.4);
    b.throttle = b.missed > 0 ? 0.6 : bend > 0.9 ? 0.5 + ai.skill * 0.3 : bend > 0.5 ? 0.78 + ai.skill * 0.2 : 1;
    // rubber band: a racer far behind the player presses a little harder, one far ahead eases off (races stay close but real)
    const gap = this.player.progress - b.progress;
    const band = gap > 2 ? 1.06 : gap < -2 ? 0.95 : 1;
    this.move(b, dt, 0, (0.78 + ai.skill * 0.22) * band);
  }

  private move(b: Boat, dt: number, brake: number, maxK = 1): void {
    b.boost = Math.max(0, b.boost - dt);
    const boosted = b.boost > 0;
    // past the buoys the water is heavy: top speed drops the further out you are
    const max = (boosted ? BOOST_SPEED : MAX_SPEED * maxK) * (1 - b.edge * 0.55);
    const accel = b.throttle * ACCEL * (boosted ? 1.8 : 1) - brake * BRAKE - DRAG * b.speed * b.speed - 0.6;
    b.speed = Math.max(0, Math.min(max, b.speed + accel * dt));
    // turning needs way; hard turns scrub a little speed
    const turnK = Math.min(1, Math.sqrt(b.speed / MAX_SPEED) * 1.15);
    b.heading -= b.steer * TURN * turnK * dt; // positive steer = right = heading decreases
    b.speed -= Math.abs(b.steer) * b.speed * 0.18 * dt;
    const fx = Math.sin(b.heading), fz = Math.cos(b.heading);
    // drift: the hull slides a moment before it follows the bow
    const k = Math.min(1, dt * GRIP);
    b.vel.x += (fx * b.speed - b.vel.x) * k;
    b.vel.z += (fz * b.speed - b.vel.z) * k;
    // the sea: the swell's slope pushes the hull downhill a little, currents carry it
    const gr = waveGrad(b.pos.x, b.pos.z, this.time, this.swell);
    let px = -gr.x * 3.2, pz = -gr.z * 3.2;
    for (const c of this.features.currents) {
      if (!this.active(c)) continue;
      const dd = len(sub(b.pos, c.pos));
      if (dd < c.r) { const w = (1 - dd / c.r) * c.strength * (this.stage === 2 ? 1 : 0.7); px += c.dir.x * w; pz += c.dir.z * w; }
    }
    b.pos.x += (b.vel.x + px) * dt;
    b.pos.z += (b.vel.z + pz) * dt;
    // the island, the boundary and the reef
    const d = len(b.pos);
    if (d < ISLAND_R + 1.2) { const n = norm(b.pos); const push = ISLAND_R + 1.2 - d; b.pos.x += n.x * push; b.pos.z += n.z * push; this.hit(b, n); }
    const edge = Math.max(0, Math.min(1, (d - EDGE_R) / (OUTER_R - EDGE_R)));
    if (edge > 0 && b.edge === 0 && b.you) this.events.push({ kind: 'edge', boat: b.id });
    b.edge = edge;
    if (edge > 0) { const n = norm(b.pos); b.vel.x -= n.x * edge * 6 * dt; b.vel.z -= n.z * edge * 6 * dt; } // a gentle nudge back in
    if (d > OUTER_R) { const n = norm(b.pos); b.pos.x = n.x * OUTER_R; b.pos.z = n.z * OUTER_R; this.hit(b, { x: -n.x, z: -n.z }); }
    // floating hazards
    for (const hz of this.features.hazards) {
      if (!this.active(hz)) continue;
      const rel = sub(b.pos, hz.pos), l = len(rel), R = hz.r + 0.8;
      if (l < R && l > 1e-4) { const n = { x: rel.x / l, z: rel.z / l }; b.pos.x += n.x * (R - l); b.pos.z += n.z * (R - l); this.hit(b, n, hz.kind === 'buoy' ? 0.7 : 0.5); }
    }
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
    // drove past the next gate without going through it? (the gate is now behind, within a third of a lap)
    const g = this.course.gates[b.next];
    const behind = (b.nearest - g.i + s.length) % s.length;
    if (b.missed === 0 && behind > 5 && behind < 90) { b.missed = 1e-6; this.events.push({ kind: 'missed', boat: b.id }); }
    if (b.missed > 0) b.missed += dt;
  }

  private hit(b: Boat, n: Vec, keep = 0.45): void {
    const into = -(b.vel.x * n.x + b.vel.z * n.z);
    if (into > 1.5 && b.bump <= 0) this.events.push({ kind: 'bump', boat: b.id });
    b.bump = 0.6;
    b.vel.x += n.x * Math.max(0, into) * 1.2; b.vel.z += n.z * Math.max(0, into) * 1.2;
    b.speed *= keep;
    b.boost = 0;
  }

  /** Boost pads: crossing one in the course direction gives a burst; it recharges for that boat after a few seconds. */
  private pads(b: Boat, dt: number): void {
    for (const p of this.features.boosts) {
      p.cool[b.id] = Math.max(0, (p.cool[b.id] ?? 0) - dt);
      if (!this.active(p) || p.cool[b.id] > 0) continue;
      if (len(sub(b.pos, p.pos)) < p.r && dot(b.vel, p.dir) > 2) {
        p.cool[b.id] = 4;
        b.boost = BOOST_TIME;
        b.speed = Math.min(BOOST_SPEED, b.speed + 4.5);
        this.events.push({ kind: 'boost', boat: b.id });
      }
    }
  }

  private coast(b: Boat, dt: number): void {
    // a victory lap at an easy pace, following the course so nobody parks in the way
    b.throttle = 0.35; b.steer = clamp1(this.aimAt(b, 8) * 2);
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

  /** Gates must be passed in order and in the course direction; a lap counts only when every gate was crossed. */
  private gates_(b: Boat): void {
    const g = this.course.gates[b.next];
    const rel = sub(b.pos, g.at);
    const across = dot(rel, g.dir), side = dot(rel, g.n);
    if (across >= 0 && across < 2.5 && Math.abs(side) <= GATE_W && dot(b.vel, g.dir) > 0) {
      if (b.missed > 0) { b.missed = 0; this.events.push({ kind: 'recovered', boat: b.id }); }
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
  /** Which gate is next for the player and where it is relative to the heading (for the HUD arrow; angle > 0 = to the left). */
  nextGate(): { gate: Gate; angle: number; dist: number } {
    const b = this.player, g = this.course.gates[b.next];
    const want = Math.atan2(g.at.x - b.pos.x, g.at.z - b.pos.z);
    return { gate: g, angle: wrapAngle(want - b.heading), dist: len(sub(g.at, b.pos)) };
  }
}
