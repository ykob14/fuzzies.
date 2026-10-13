/**
 * Fuzzy Obstacle Run — RULES only (no DOM, no Three.js): a three-lane dash. The course scrolls towards you faster and faster
 * (seeded patterns, new things introduced one at a time): logs and fallen branches to jump, rocks, rolling boulders and carts to
 * dodge, vines to duck under, puddles / buckets / sprinklers that splash you, mud that slows you, mushrooms that bounce you up to
 * high stars, bridges (stay in the middle), hills and STAR RUSH bonus stretches. Power-ups: a shield (one free bump), a star magnet
 * and a speed boost that smashes through everything. Stars in a row grow a multiplier; a bump costs 40, breaks the chain and slows
 * you for a moment; every 100 m pays 20. 70 seconds. Every row of the course leaves a way through (a free lane, a jump or a duck),
 * spaced so a lane change fits — checked without a browser by `adv/obstacle-check.ts`.
 */
import { Clock, Combo, seeded, tierPlace, type Vec2 } from '../arcade';

export type ObKind = 'log' | 'rock' | 'puddle' | 'mud' | 'bucket' | 'branch' | 'bar' | 'sprinkler' | 'boulder' | 'cart' | 'mushroom'
  | 'star' | 'gold' | 'super' | 'shield' | 'magnet' | 'boost';
export type Power = 'shield' | 'magnet' | 'boost';
export type SectionKind = 'bridge' | 'hill' | 'rush';
export interface Section { kind: SectionKind; d0: number; d1: number; told?: boolean; on?: boolean }
/** `x` = sideways position (carts move it), `t` = a timer/flag for movers, `to` = a cart's target lane, `phase` = a sprinkler's offset */
export interface Thing { id: number; kind: ObKind; lane: number; d: number; y: number; state: 'ahead' | 'hit' | 'got' | 'passed'; x: number; t: number; to: number; phase: number }
export interface RunEvent {
  kind: 'star' | 'bump' | 'splash' | 'mud' | 'bounce' | 'power' | 'powerEnd' | 'shieldPop' | 'smash' | 'duck' | 'fall' | 'roll' | 'cart' | 'crack'
    | 'section' | 'rush' | 'rushEnd' | 'newThing' | 'stars' | 'combo' | 'comboEnd' | 'milestone' | 'jump' | 'land' | 'speedup' | 'warn' | 'timeup';
  item?: Thing; value?: number; mult?: number; n?: number; what?: string; pulled?: boolean;
}

export const SCORING = {
  star: 10, gold: 50, super: 150, power: 25, hundred: 20, bump: 40, fall: 20, smash: 15, starMile: 25,
  ladder: [{ at: 0, mult: 1 }, { at: 5, mult: 1.5 }, { at: 12, mult: 2 }, { at: 24, mult: 3 }, { at: 40, mult: 4 }],
  window: 2.0,
  tiers: [4650, 3250, 1950] as [number, number, number],
  tierNames: ['Speed legend', 'Star sprinter', 'Trail runner', 'Warming up'],
};
export const LIMIT = 70;
export const LANES = [-2.2, 0, 2.2];
export const SPEED: [number, number] = [7.5, 13];
export const JUMP = { v0: 6.4, g: 18.5, bounce: 10.2, drop: -11 };
export const LOG_H = 0.55;
export const STAR_Y = { ground: 0.5, arc: 1.45, high: 2.5 };
export const BUMP = { slow: 0.35, time: 1.4, safe: 1.6 };
export const SPLASH = { slow: 0.7, time: 0.6 };
export const MUD = { slow: 0.5, time: 1.1 };
export const WET = 2.2; // seconds the Fuzzy looks wet / muddy
export const DUCK = { time: 0.6 };
export const POWER: Record<Power, number> = { shield: 10, magnet: 8, boost: 4 };
export const BOOST_K = 1.45;
export const MAGNET = { reach: 2.9, ahead: 7 };
export const BOULDER = { v: 6, at: 28 };
export const CART = { v: 1.5, at: 24 }; // lanes per second
export const BRANCH = { at: 16, fall: 0.45, y0: 3.2 };
export const LANE_RATE = 11;
/** when each new thing may first appear (seconds into the run, judged when you'll reach it) */
export const UNLOCK = { mushroom: 8, bucket: 12, mud: 15, branch: 19, bar: 23, sprinkler: 27, boulder: 31, bridge: 35, rush: 39, cart: 43, hill: 49 };
/** sprinklers spray 1.2 s on, 1.2 s off */
export function sprayOn(time: number, phase: number): boolean { return ((time + phase) % 2.4 + 2.4) % 2.4 < 1.2; }
/** ground height at distance d (hills) */
export function groundH(sections: Section[], d: number): number {
  for (const s of sections) if (s.kind === 'hill' && d > s.d0 && d < s.d1) return 1.5 * Math.sin(Math.PI * (d - s.d0) / (s.d1 - s.d0)) ** 2;
  return 0;
}
export const SOLID: ObKind[] = ['log', 'rock', 'bucket', 'branch', 'bar', 'boulder', 'cart'];
const TEACH: ObKind[] = ['mushroom', 'mud', 'bucket', 'branch', 'bar', 'sprinkler', 'boulder', 'cart', 'shield', 'magnet', 'boost', 'super'];

export class RunSim {
  readonly clock = new Clock(LIMIT);
  readonly combo = new Combo(SCORING.window, SCORING.ladder);
  state: 'ready' | 'playing' | 'done' = 'ready';
  dist = 0; lane = 1; x = 0; y = 0; vy = 0; speed = SPEED[0];
  score = 0; stars = 0; golden = 0; bumps = 0; splashes = 0; jumps = 0; hundreds = 0; smashes = 0; falls = 0; ducks = 0; bounces = 0;
  /** seconds of slow-down / invulnerability / ducking left */
  slow = 0; slowK = 1; safe = 0; duck = 0;
  /** seconds left of looking wet / muddy (for the view) */
  wet = 0; muddy = 0;
  /** power-ups: seconds left */
  power: Record<Power, number> = { shield: 0, magnet: 0, boost: 0 };
  things: Thing[] = [];
  sections: Section[] = [];
  events: RunEvent[] = [];
  /** what you hit last (the view picks a reaction) */
  lastHit: ObKind | null = null;
  private rnd: () => number;
  private nextId = 0;
  private nextD = 14;
  private heldX = false; private heldJump = false; private heldDuck = false; private duckAfter = false; private lastSpeedup = 0;
  private lastSection = 0; private lastPower = 0; private lastPat = ''; private nextStarMile = 25;
  private seen = new Set<string>();
  /** patterns / sections already shown once (each new one is introduced on its own when it unlocks) */
  private introduced = new Set<string>(['mushroom']);
  private script: ((d: number) => number)[];

  constructor(_variant: string | null | undefined, seed = 7) {
    this.rnd = seeded(seed);
    this.script = this.opening();
    while (this.nextD < 80) this.pattern();
  }

  start(): void { if (this.state === 'ready') this.state = 'playing'; }
  get k(): number { return this.clock.k; }
  get airborne(): boolean { return this.y > 0.02; }
  get ducking(): boolean { return this.duck > 0; }
  get ahead(): Thing[] { return this.things.filter((t) => t.state === 'ahead'); }
  /** the speed you're running at right now */
  get pace(): number { return this.speed * (this.power.boost > 0 ? BOOST_K : this.slow > 0 ? this.slowK : 1); }
  section(d = this.dist): Section | undefined { return this.sections.find((s) => d >= s.d0 && d <= s.d1); }

  private put(kind: ObKind, lane: number, d: number, y = 0): Thing {
    const t: Thing = { id: this.nextId++, kind, lane, d, y, state: 'ahead', x: LANES[lane], t: 0, to: lane, phase: 0 };
    if (kind === 'branch') t.y = BRANCH.y0;
    this.things.push(t); return t;
  }
  private stars3(lane: number, d: number, n: number, gap = 1.6, y = STAR_Y.ground): void { for (let i = 0; i < n; i++) this.put('star', lane, d + i * gap, y); }
  private arc(lane: number, d: number, top: ObKind = 'star'): void { for (let i = -1; i <= 1; i++) this.put(i === 0 ? top : 'star', lane, d + i * 1.3, i === 0 ? STAR_Y.arc : STAR_Y.ground + 0.4); }
  private pick<T>(xs: T[]): T { return xs[Math.floor(this.rnd() * xs.length)]; }
  private timeAt(d: number): number { return this.clock.time + Math.max(0, d - this.dist) / Math.max(7, this.speed); }

  /** the first ~15 seconds: hand-laid so the run is fun straight away (stars at once, then a log, a rock, a puddle, a mushroom, a magnet) */
  private opening(): ((d: number) => number)[] {
    return [
      (d) => { this.stars3(1, d, 5); return 7; },
      (d) => { this.put('log', 1, d); this.arc(1, d); this.stars3(0, d - 2, 3); return 2; },
      (d) => { this.put('rock', 1, d); this.stars3(0, d - 1.5, 4); this.stars3(2, d - 1.5, 2); return 4; },
      (d) => { this.put('puddle', 1, d); this.put('puddle', 2, d); this.stars3(0, d - 2, 3); this.put('gold', 0, d + 3); return 3; },
      (d) => { this.put('mushroom', 1, d); this.highArc(1, d, 'super'); this.stars3(0, d, 3); this.stars3(2, d, 3); return 15; },
      (d) => { for (let i = 0; i < 6; i++) this.put('star', [0, 1, 2, 2, 1, 0][i], d + i * 2.4); return 13; },
      (d) => { this.put('magnet', 1, d, STAR_Y.ground); this.lastPower = d; for (let i = 0; i < 8; i++) this.put('star', i % 3, d + 4 + i * 1.6); return 17; },
    ];
  }
  /** a high arc of stars over a mushroom's bounce (a super star or a gold one at the top) */
  private highArc(lane: number, d: number, top: ObKind): void {
    const v = SPEED[0] + (SPEED[1] - SPEED[0]) * Math.min(1, this.timeAt(d) / LIMIT); // the speed you'll bounce at
    for (let i = 1; i <= 7; i++) { const tt = i * 0.15; const y = JUMP.bounce * tt - 0.5 * JUMP.g * tt * tt; this.put(i === 4 ? top : 'star', lane, d + v * tt, Math.max(STAR_Y.ground, y + 0.1)); }
  }

  /** lay the next pattern of things on the course */
  private pattern(): void {
    const d = this.nextD; const tAt = this.timeAt(d); const k = Math.min(1, tAt / LIMIT);
    const v = SPEED[0] + (SPEED[1] - SPEED[0]) * k;
    const on = (w: keyof typeof UNLOCK) => tAt >= UNLOCK[w];
    let len: number;
    if (this.script.length) len = this.script.shift()!(d);
    else if (d - this.lastSection > 60 && (['bridge', 'rush', 'hill'] as const).some((x) => on(x) && !this.introduced.has(x))) len = this.sectionAt(d, k, on);
    else if (d - this.lastSection > 150 && (on('bridge') || on('rush') || on('hill')) && this.rnd() < 0.5) len = this.sectionAt(d, k, on);
    else if (d - this.lastPower > 110 && this.rnd() < 0.5) len = this.powerUp(d);
    else len = this.obstacles(d, k, v, on);
    this.nextD = d + len + Math.max(v * 0.9, 11 - k * 4) + this.rnd() * 3;
  }
  private sectionAt(d: number, k: number, on: (w: keyof typeof UNLOCK) => boolean): number {
    const fresh = (['bridge', 'rush', 'hill'] as const).find((x) => on(x) && !this.introduced.has(x));
    const kinds = (['bridge', 'rush', 'hill'] as const).filter((x) => on(x) && this.lastPat !== x);
    const kind = fresh ?? (kinds.length ? this.pick(kinds) : 'rush'); this.introduced.add(kind);
    this.lastSection = d; this.lastPat = kind;
    if (kind === 'bridge') { // stay in the middle: the side lanes are the stream
      const L = 26; this.sections.push({ kind, d0: d, d1: d + L });
      this.stars3(1, d + 1, 9, 2.4);
      if (k > 0.55) this.put('log', 1, d + L * 0.6); // a log on the bridge to hop
      this.put('gold', 1, d + L + 1.5);
      return L + 2;
    }
    if (kind === 'hill') {
      const L = 34; this.sections.push({ kind, d0: d, d1: d + L });
      for (let i = 0; i < 10; i++) this.put('star', [1, 1, 0, 0, 1, 2, 2, 1, 1, 1][i], d + 2 + i * 3);
      this.put('gold', 1, d + L / 2, STAR_Y.arc);
      if (k > 0.6) this.put('rock', this.pick([0, 2]), d + L * 0.3);
      return L;
    }
    const L = 44; this.sections.push({ kind: 'rush', d0: d, d1: d + L }); // STAR RUSH: stars everywhere, nothing in the way
    for (let i = 0; i < 22; i++) { const lane = [1, 1, 0, 0, 0, 1, 2, 2, 2, 1, 1, 0, 1, 2, 1, 0, 0, 1, 2, 2, 1, 1][i]; this.put(i % 7 === 6 ? 'gold' : 'star', lane, d + 1 + i * 2); }
    this.put('super', 1, d + L + 1); return L + 2;
  }
  private powerUp(d: number): number {
    const p = this.pick<Power>(['shield', 'magnet', 'boost']); const lane = Math.floor(this.rnd() * 3);
    this.lastPower = d; this.lastPat = 'power';
    this.put(p, lane, d, STAR_Y.ground);
    for (let l = 0; l < 3; l++) this.stars3(l, d + 4, 4, 2);
    return 11;
  }
  private obstacles(d: number, k: number, v: number, on: (w: keyof typeof UNLOCK) => boolean): number {
    const lane = Math.floor(this.rnd() * 3); const other = (lane + 1 + Math.floor(this.rnd() * 2)) % 3; const free = 3 - lane - other;
    const P: [string, number][] = [['logArc', 2], ['rocks', 2.2], ['puddles', 1.2], ['stars', 1.6], ['zigzag', 1], ['gold', 0.5]];
    const NEW: [string, keyof typeof UNLOCK][] = [['mushroom', 'mushroom'], ['buckets', 'bucket'], ['mud', 'mud'], ['branch', 'branch'], ['bar', 'bar'], ['sprinkler', 'sprinkler'], ['boulder', 'boulder'], ['cart', 'cart']];
    for (const [name, key] of NEW) if (on(key) && name !== 'mud') P.push([name, 1.3]);
    if (k > 0.45) P.push(['double', 1.2]);
    // a newly unlocked thing is shown on its own first
    let pat = NEW.find(([name, key]) => on(key) && !this.introduced.has(name))?.[0] ?? '';
    if (pat) this.introduced.add(pat);
    let forceMud = false; if (pat === 'mud') { pat = 'puddles'; forceMud = true; }
    for (let tries = 0; tries < 3 && (!pat || pat === this.lastPat); tries++) {
      const sum = P.reduce((s, p) => s + p[1], 0); let r = this.rnd() * sum; pat = P[P.length - 1][0];
      for (const [name, w] of P) { r -= w; if (r <= 0) { pat = name; break; } }
    }
    this.lastPat = pat;
    switch (pat) {
      case 'logArc': this.put('log', lane, d); this.arc(lane, d, this.rnd() < 0.15 ? 'gold' : 'star'); if (k > 0.4 && this.rnd() < 0.5) this.put('rock', other, d); return 2;
      case 'rocks': {
        this.put('rock', lane, d); const two = k > 0.25 && this.rnd() < 0.4 + k * 0.3; if (two) this.put('rock', other, d);
        const f = two ? free : this.pick([0, 1, 2].filter((l) => l !== lane)); this.stars3(f, d - 1.5, 4); return 4;
      }
      case 'puddles': {
        const dry = Math.floor(this.rnd() * 3); const kind: ObKind = forceMud || (on('mud') && this.rnd() < 0.5) ? 'mud' : 'puddle';
        for (let l = 0; l < 3; l++) if (l !== dry) this.put(kind, l, d); this.put('star', dry, d); this.put('star', dry, d + 1.6); return 2;
      }
      case 'stars': { const n = 4 + Math.floor(this.rnd() * 3); this.stars3(lane, d, n, 1.5); if (this.rnd() < 0.35) this.put('gold', other, d + 2); return n * 1.5; }
      case 'zigzag': { const dir = this.rnd() < 0.5 ? 1 : -1; const seq = dir > 0 ? [0, 1, 2, 1, 0] : [2, 1, 0, 1, 2]; seq.forEach((l, i) => this.put('star', l, d + i * Math.max(2.4, v * 0.2))); return seq.length * Math.max(2.4, v * 0.2); }
      case 'gold': this.put('gold', lane, d + 1, this.rnd() < 0.5 ? STAR_Y.arc : STAR_Y.ground); this.stars3(other, d, 3); return 3;
      case 'mushroom': this.put('mushroom', lane, d); this.highArc(lane, d, this.rnd() < 0.4 ? 'super' : 'gold'); this.stars3(other, d, 3); return 15;
      case 'buckets': { this.put('bucket', lane, d); this.arc(lane, d); if (this.rnd() < 0.5) this.put('bucket', other, d); return 2; }
      case 'branch': this.put('branch', lane, d); this.arc(lane, d); if (k > 0.5 && this.rnd() < 0.5) this.put('rock', other, d); else this.stars3(other, d - 1.5, 3); return 2;
      case 'bar': { // vines to duck under: 1–2 lanes at first, the whole trail later
        const all = k > 0.5 && this.rnd() < 0.5; const lanes = all ? [0, 1, 2] : this.rnd() < 0.5 ? [lane] : [lane, other];
        for (const l of lanes) { this.put('bar', l, d); this.put('star', l, d, 0.35); }
        if (!all) this.stars3(lanes.length === 1 ? other : free, d - 1.5, 3);
        return 2;
      }
      case 'sprinkler': {
        const s = this.put('sprinkler', lane, d); s.phase = this.rnd() * 2.4; this.stars3(lane, d - 5, 3);
        if (k > 0.6 && this.rnd() < 0.5) { const s2 = this.put('sprinkler', other, d + 0.5); s2.phase = s.phase + 1.2; } else this.stars3(other, d - 1.5, 3);
        return 2;
      }
      case 'boulder': { // it rolls towards you once you're close: it meets you about here
        const shift = BOULDER.v * BOULDER.at / (v + BOULDER.v); this.put('boulder', lane, d + shift); this.stars3(other, d - 1, 4); if (this.rnd() < 0.4) this.put('gold', free, d + 2); return shift + 1;
      }
      case 'cart': { // trundles to and fro between two lanes as you come
        const to = lane === 1 ? this.pick([0, 2]) : 1; const c = this.put('cart', lane, d); c.to = to; c.phase = to; this.stars3(3 - lane - to, d - 1.5, 4); return 2;
      }
      case 'double': { // two rows: the way through steps over by one lane
        const f1 = Math.floor(this.rnd() * 3); const f2 = f1 === 1 ? this.pick([0, 2]) : 1; const gap = Math.max(9, v * 0.85);
        for (let l = 0; l < 3; l++) if (l !== f1) this.put(l === f2 && this.rnd() < 0.5 ? 'log' : 'rock', l, d);
        for (let l = 0; l < 3; l++) if (l !== f2) this.put('rock', l, d + gap);
        this.stars3(f1, d - 1.5, 3); this.stars3(f2, d + gap - 1.5, 3); return gap + 1;
      }
    }
    return 2;
  }

  /** jump (ignored in the air); cancels a duck */
  jump(): boolean { if (this.state !== 'playing' || this.airborne) return false; this.duck = 0; this.duckAfter = false; this.vy = JUMP.v0; this.y = 0.03; this.jumps++; this.events.push({ kind: 'jump' }); return true; }
  /** duck / slide (in the air: drop fast, then duck on landing) */
  slide(): boolean {
    if (this.state !== 'playing') return false;
    if (this.airborne) { this.vy = Math.min(this.vy, JUMP.drop); this.duckAfter = true; return true; }
    if (this.duck > 0.2) return false;
    this.duck = DUCK.time; this.ducks++; this.events.push({ kind: 'duck' }); return true;
  }
  /** change lane by −1 / +1 (on a bridge you can only step towards the middle) */
  shift(dir: number): boolean {
    const l = Math.max(0, Math.min(2, this.lane + (dir < 0 ? -1 : 1))); if (l === this.lane) return false;
    if (this.section()?.kind === 'bridge' && Math.abs(l - 1) > Math.abs(this.lane - 1)) return false;
    this.lane = l; return true;
  }

  step(dt: number, input: Vec2): void {
    this.events.length = 0;
    if (this.state !== 'playing') return;
    const w = this.clock.step(dt);
    if (w === 'timeup') { this.state = 'done'; this.events.push({ kind: 'timeup' }); return; }
    if (typeof w === 'number') this.events.push({ kind: 'warn', n: w });
    if (this.combo.step(dt)) this.events.push({ kind: 'comboEnd' });
    // controls: a push sideways = one lane; up = jump; down = duck; each needs a release in between
    const ix = input.x || 0, iz = input.z || 0;
    if (Math.abs(ix) > 0.5) { if (!this.heldX) { this.heldX = true; this.shift(ix); } } else if (Math.abs(ix) < 0.3) this.heldX = false;
    if (iz < -0.6) { if (!this.heldJump) { this.heldJump = true; this.jump(); } } else if (iz > -0.3) this.heldJump = false;
    if (iz > 0.6) { if (!this.heldDuck) { this.heldDuck = true; this.slide(); } } else if (iz < 0.3) this.heldDuck = false;
    // running
    this.speed = SPEED[0] + (SPEED[1] - SPEED[0]) * this.k;
    const stage = Math.floor(this.clock.time / 30);
    if (stage > this.lastSpeedup) { this.lastSpeedup = stage; this.events.push({ kind: 'speedup', n: stage }); }
    this.slow = Math.max(0, this.slow - dt); this.safe = Math.max(0, this.safe - dt); this.duck = Math.max(0, this.duck - dt);
    this.wet = Math.max(0, this.wet - dt); this.muddy = Math.max(0, this.muddy - dt);
    for (const p of ['shield', 'magnet', 'boost'] as Power[]) if (this.power[p] > 0) { this.power[p] = Math.max(0, this.power[p] - dt); if (this.power[p] === 0) this.events.push({ kind: 'powerEnd', what: p }); }
    const v = this.pace;
    const d0 = this.dist; this.dist += v * dt;
    if (Math.floor(this.dist / 100) > Math.floor(d0 / 100)) { this.hundreds++; this.score += SCORING.hundred; this.events.push({ kind: 'milestone', n: Math.floor(this.dist / 100) * 100, value: SCORING.hundred }); }
    // sideways + the jump arc
    const tx = LANES[this.lane]; const dx = tx - this.x; const stepX = LANE_RATE * dt; this.x = Math.abs(dx) <= stepX ? tx : this.x + Math.sign(dx) * stepX;
    if (this.y > 0 || this.vy > 0) { // (y > 0, not airborne: a fast fall can stop just above the 2 cm line)
      this.vy -= JUMP.g * dt; this.y += this.vy * dt;
      if (this.y <= 0) { this.y = 0; this.vy = 0; this.events.push({ kind: 'land' }); if (this.duckAfter) { this.duckAfter = false; this.duck = DUCK.time; this.ducks++; this.events.push({ kind: 'duck' }); } }
    }
    // sections: announce, enter, leave; off the bridge's middle = into the stream
    for (const s of this.sections) {
      if (!s.told && s.d0 - this.dist < 40) { s.told = true; this.events.push({ kind: 'section', what: s.kind }); }
      const inside = this.dist >= s.d0 && this.dist <= s.d1;
      if (inside && !s.on) { s.on = true; if (s.kind === 'rush') this.events.push({ kind: 'rush' }); }
      if (!inside && s.on && this.dist > s.d1) { s.on = false; if (s.kind === 'rush') this.events.push({ kind: 'rushEnd' }); }
      if (s.kind === 'bridge' && inside && !this.airborne && this.lane !== 1 && Math.abs(this.x) > 1.4) this.fall();
    }
    // movers, and first sightings (for the one-time tips)
    for (const t of this.things) {
      if (t.state !== 'ahead') continue;
      const rel = t.d - this.dist;
      if (rel < 45 && TEACH.includes(t.kind) && !this.seen.has(t.kind)) { this.seen.add(t.kind); this.events.push({ kind: 'newThing', what: t.kind, item: t }); }
      if (t.kind === 'boulder' && rel < BOULDER.at) { if (!t.t) { t.t = 1; this.events.push({ kind: 'roll', item: t }); } t.d -= BOULDER.v * dt; }
      else if (t.kind === 'cart' && rel < CART.at) { if (!t.t) { t.t = 1; this.events.push({ kind: 'cart', item: t }); } const gx = LANES[t.to]; const s = CART.v * 2.2 * dt; if (Math.abs(gx - t.x) <= s) { t.x = gx; t.to = t.to === t.lane ? t.phase : t.lane; } else t.x += Math.sign(gx - t.x) * s; }
      else if (t.kind === 'branch' && rel < BRANCH.at && t.y > 0) { if (!t.t) this.events.push({ kind: 'crack', item: t }); t.t += dt; t.y = Math.max(0, BRANCH.y0 * (1 - (t.t / BRANCH.fall) ** 2)); }
    }
    // the magnet pulls in stars near you
    if (this.power.magnet > 0) for (const t of this.things) {
      if (t.state !== 'ahead' || !(t.kind === 'star' || t.kind === 'gold' || t.kind === 'super')) continue;
      const rel = t.d - this.dist; if (rel > 0 && rel < MAGNET.ahead && Math.abs(t.x - this.x) < MAGNET.reach && t.y - this.y < 2.2) this.collect(t, true);
    }
    // things that crossed the line under your feet this step
    for (const t of this.things) {
      if (t.state !== 'ahead' || t.d > this.dist) continue;
      const near = Math.abs(t.x - this.x) < (t.kind === 'cart' ? 1.15 : 1.0);
      if (!near) { t.state = 'passed'; continue; }
      this.cross(t);
    }
    if (this.stars >= this.nextStarMile) { this.score += SCORING.starMile; this.events.push({ kind: 'stars', n: this.nextStarMile, value: SCORING.starMile }); this.nextStarMile = this.nextStarMile < 50 ? 50 : this.nextStarMile + 50; }
    while (this.nextD < this.dist + 75) this.pattern();
    if (this.things.length > 160) this.things = this.things.filter((t) => t.state === 'ahead' || t.d > this.dist - 8);
    if (this.sections.length > 6) this.sections = this.sections.filter((s) => s.d1 > this.dist - 10);
  }
  private collect(t: Thing, pulled = false): void {
    t.state = 'got'; const mult = this.combo.hit();
    const base = t.kind === 'super' ? SCORING.super : t.kind === 'gold' ? SCORING.gold : SCORING.star; const value = Math.round(base * mult);
    this.score += value; if (t.kind === 'star') this.stars++; else this.golden++;
    this.events.push({ kind: 'star', item: t, value, mult, pulled });
    if (this.combo.chain === this.combo.ladder.find((l) => l.mult === mult && l.at > 0)?.at) this.events.push({ kind: 'combo', mult, n: this.combo.chain });
  }
  private cross(t: Thing): void {
    const boost = this.power.boost > 0;
    switch (t.kind) {
      case 'star': case 'gold': case 'super': if (Math.abs(this.y - t.y) < 0.75) this.collect(t); else t.state = 'passed'; return;
      case 'shield': case 'magnet': case 'boost':
        if (Math.abs(this.y - t.y) < 0.9) { t.state = 'got'; this.power[t.kind] = POWER[t.kind]; this.score += SCORING.power; this.events.push({ kind: 'power', what: t.kind, item: t, value: SCORING.power }); } else t.state = 'passed';
        return;
      case 'mushroom':
        if (this.y < 0.3) { t.state = 'hit'; this.duck = 0; this.vy = JUMP.bounce; this.y = Math.max(this.y, 0.03); this.bounces++; this.events.push({ kind: 'bounce', item: t }); } else t.state = 'passed';
        return;
      case 'puddle': case 'mud':
        if (this.airborne || boost) { t.state = 'passed'; return; }
        t.state = 'hit';
        if (t.kind === 'mud') { this.slowDown(MUD.slow, MUD.time); this.muddy = WET; this.events.push({ kind: 'mud', item: t }); }
        else { this.splashes++; this.slowDown(SPLASH.slow, SPLASH.time); this.wet = WET; this.events.push({ kind: 'splash', item: t }); }
        return;
      case 'sprinkler':
        t.state = 'passed';
        if (!boost && this.y < 1.0 && sprayOn(this.clock.time, t.phase)) { this.splashes++; this.slowDown(SPLASH.slow, SPLASH.time); this.wet = WET; this.events.push({ kind: 'splash', item: t }); }
        return;
    }
    // the solid things
    const clear = (t.kind === 'log' && this.y >= LOG_H) || (t.kind === 'branch' && (this.y >= LOG_H || t.y > 1.2)) || (t.kind === 'bucket' && this.y >= 0.5) || (t.kind === 'bar' && this.duck > 0);
    if (clear) { t.state = 'passed'; return; }
    if (boost) { t.state = 'hit'; this.smashes++; this.score += SCORING.smash; this.events.push({ kind: 'smash', item: t, value: SCORING.smash }); return; }
    if (t.kind === 'bucket') { t.state = 'hit'; this.splashes++; this.lastHit = 'bucket'; this.slowDown(SPLASH.slow, SPLASH.time); this.wet = WET; this.events.push({ kind: 'splash', item: t }); return; }
    this.bump(t);
  }
  private slowDown(k: number, time: number): void { if (this.slow > 0) { this.slowK = Math.min(this.slowK, k); this.slow = Math.max(this.slow, time); } else { this.slowK = k; this.slow = time; } }
  private bump(t: Thing): void {
    if (this.safe > 0) { t.state = 'passed'; return; }
    t.state = 'hit'; this.lastHit = t.kind;
    if (this.power.shield > 0) { this.power.shield = 0; this.safe = 1; this.events.push({ kind: 'shieldPop', item: t }); return; }
    this.bumps++; this.slowDown(BUMP.slow, BUMP.time); this.safe = BUMP.safe; this.duck = 0; this.score = Math.max(0, this.score - SCORING.bump);
    if (this.combo.chain > 0) { this.combo.reset(); this.events.push({ kind: 'comboEnd' }); }
    this.events.push({ kind: 'bump', item: t });
  }
  private fall(): void {
    this.lane = 1; this.x = 0; this.falls++; this.wet = WET + 1; this.slowDown(SPLASH.slow, 0.9); this.lastHit = null;
    this.score = Math.max(0, this.score - SCORING.fall);
    if (this.combo.chain > 0) { this.combo.reset(); this.events.push({ kind: 'comboEnd' }); }
    this.events.push({ kind: 'fall', value: SCORING.fall });
  }

  place(): number { return tierPlace(this.score, SCORING.tiers); }
  result(): { place: number; score: number; timeMs: number; tier: string; stats: { label: string; value: string }[] } {
    const place = this.place();
    return { place, score: this.score, timeMs: Math.round(this.clock.time * 1000), tier: SCORING.tierNames[place - 1], stats: [
      { label: 'Distance', value: `${Math.round(this.dist)} m` }, { label: 'Stars', value: String(this.stars) }, { label: 'Golden', value: String(this.golden) },
      { label: 'Best chain', value: String(this.combo.best) }, { label: 'Bumps', value: String(this.bumps) }] };
  }
}
