/**
 * Forest Challenge — RULES only (no DOM, no Three.js): a clearing full of trees and FOUR lumberjacks — you and three town
 * Fuzzies — with two minutes to score the most points. EVERY standing tree can be cut: walk up to one (or tap it and the Fuzzy
 * walks there by itself) and chop with timing: a marker swings along a meter and a tap in the sweet spot is a strong hit.
 * Small / medium / large trees take 2 / 4 / 7 "perfect" points of damage and are worth more the bigger they are; trees with a
 * glowing ring pay ×1.5 and sparkly ones hide a bonus (new rings appear as the ringed ones fall). A felled tree throws out wood
 * pieces that you collect by walking over them; perfect hits in a row chain into a multiplier. The rivals pick trees, walk, chop
 * at their own skill and claim the tree they're cutting (nobody can chop a tree someone else is already on). When the sun sets
 * the standings decide the place (1st–4th), which pays through the adventure's `coins[]`. Nothing here touches the saved town.
 * Checked without a browser by `adv/forest-check.ts`.
 */
import { Clock, Combo, Mover, seeded, tierPlace, type Obstacle, type Vec2 } from './arcade';

export type Size = 'small' | 'medium' | 'large';
export interface Tree { id: number; x: number; z: number; seed: number; scale: number; size: Size; marked: boolean; bonus: boolean; hp: number; maxHp: number; felled: boolean; chops: number; wave: number; /** who is chopping it right now (0 = you, 1… = rivals) */ by: number | null; felledBy: number | null }
export interface Wood { id: number; x: number; z: number; vx: number; vz: number; vy: number; y: number; value: number; gold: boolean; state: 'flying' | 'ground' | 'got'; age: number }
export type Hit = 'perfect' | 'good' | 'weak';
export interface ForestEvent { kind: 'chop' | 'felled' | 'pick' | 'wave' | 'warn' | 'timeup' | 'combo' | 'comboEnd' | 'bump' | 'target' | 'rivalChop' | 'rivalFell' | 'lead' | 'taken' | 'goal'; tree?: Tree; hit?: Hit; wood?: Wood; value?: number; mult?: number; n?: number; who?: Jack; at?: Vec2 }
export interface RivalSetup { name: string; skin: [string, string]; skill: number }
/** A lumberjack in the contest: you (id 0) or a town Fuzzy. */
export interface Jack { id: number; name: string; skin: [string, string]; skill: number; you: boolean; mover: Mover; score: number; wood: number; cleared: number; target: number | null; chopT: number; pause: number; stuck: number; avoid: number | null }
export interface Standing { id: number; name: string; score: number; cleared: number; wood: number; you: boolean; place: number }

export const SCORING = {
  points: { small: 20, medium: 45, large: 90 } as Record<Size, number>,
  hp: { small: 2, medium: 4, large: 7 } as Record<Size, number>,
  woodPieces: { small: 2, medium: 4, large: 7 } as Record<Size, number>,
  woodPoint: 5, bonusPoints: 60,
  /** a ringed tree pays this much more */
  ringMult: 1.5,
  ladder: [{ at: 0, mult: 1 }, { at: 3, mult: 1.5 }, { at: 6, mult: 2 }, { at: 10, mult: 3 }], window: 4,
  /** score → tier when there are no rivals (solo practice / tests); with rivals the standings decide the place */
  tiers: [1500, 950, 480] as [number, number, number],
  tierNames: ['Champion lumberjack', 'Sharp axe', 'Steady chopper', 'Sawdust'],
  /** the rivals: a chop every `interval` seconds, each doing `damage` (skill 0–1 scales both), and a breather after a tree */
  rival: { interval: (skill: number) => 1.75 - skill * 0.75, damage: (skill: number) => 0.85 + skill * 0.9, pause: (skill: number) => 2.2 - skill * 1.2, speed: (skill: number) => 3.9 + skill * 1.5 },
};
export const LIMIT = 120;
export const SWEET = { lo: 0.68, hi: 0.9 }; // the meter's sweet spot (perfect), 'good' is just outside it
export const CHOP_RANGE = 2.3;
export const ARENA = { hw: 21, hd: 14 };
const PICK_RANGE = 0.95;

export class ForestSim {
  readonly trees: Tree[] = [];
  readonly woods: Wood[] = [];
  /** everyone in the contest; `jacks[0]` is you */
  readonly jacks: Jack[] = [];
  readonly you: Mover;
  readonly clock = new Clock(LIMIT);
  readonly combo = new Combo(SCORING.window, SCORING.ladder);
  readonly variant: 'classic' | 'deep';
  state: 'ready' | 'playing' | 'done' = 'ready';
  score = 0; wood = 0; perfect = 0; cleared = 0; wave = 1;
  /** the tree in reach that you'd chop (the meter runs while there is one) */
  target: number | null = null;
  /** a tapped tree is preferred as the target once in reach */
  want: number | null = null;
  /** where the Fuzzy is walking by itself (a tapped spot or tree); any stick/key input cancels it */
  goal: { x: number; z: number; tree: number | null } | null = null;
  meter = { value: 0, dir: 1, speed: 1.15 };
  events: ForestEvent[] = [];
  private obstacles: Obstacle[] = [];
  private rnd: () => number;
  private woodId = 0;
  private leader = -1;
  private stillFor = 0;

  constructor(variant: 'classic' | 'deep' = 'classic', seed = 7, rivals: RivalSetup[] = []) {
    this.variant = variant;
    this.rnd = seeded(seed);
    const deep = variant === 'deep';
    // the woods: a jittered grid of trees across the clearing, a free patch in the middle where everyone starts
    const cols = deep ? 10 : 9, rows = deep ? 7 : 6;
    let id = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = -ARENA.hw + 2.5 + (c + 0.5) * ((ARENA.hw * 2 - 5) / cols) + (this.rnd() - 0.5) * 1.8;
      const z = -ARENA.hd + 2 + (r + 0.5) * ((ARENA.hd * 2 - 4) / rows) + (this.rnd() - 0.5) * 1.6;
      if (Math.hypot(x, z - 6) < 3.2) continue; // the start patch stays open
      const roll = this.rnd();
      const size: Size = roll < (deep ? 0.3 : 0.42) ? 'small' : roll < (deep ? 0.68 : 0.8) ? 'medium' : 'large';
      const scale = size === 'small' ? 0.95 + this.rnd() * 0.2 : size === 'medium' ? 1.3 + this.rnd() * 0.25 : 1.75 + this.rnd() * 0.3;
      this.trees.push({ id: id++, x, z, seed: 11 + id * 7 + Math.floor(this.rnd() * 3), scale, size, marked: false, bonus: false, hp: SCORING.hp[size], maxHp: SCORING.hp[size], felled: false, chops: 0, wave: 0, by: null, felledBy: null });
    }
    const mk = (id: number, name: string, skin: [string, string], skill: number, you: boolean, max: number): Jack => {
      const mover = new Mover({ accel: you ? 16 : 14, max, friction: 3.4, turn: you ? 10 : 8, radius: 0.5, bounds: ARENA }, this.obstacles);
      return { id, name, skin, skill, you, mover, score: 0, wood: 0, cleared: 0, target: null, chopT: 0, pause: 0, stuck: 0, avoid: null };
    };
    this.jacks.push(mk(0, 'You', ['#ff86bb', '#b8235f'], 1, true, 5.8));
    rivals.slice(0, 3).forEach((r, i) => this.jacks.push(mk(i + 1, r.name, r.skin, Math.max(0.2, Math.min(1, r.skill)), false, SCORING.rival.speed(r.skill))));
    this.you = this.jacks[0].mover;
    // everyone starts on the open patch, spread out a little
    const spots: Vec2[] = [{ x: 0, z: 6 }, { x: -1.6, z: 7.2 }, { x: 1.6, z: 7.2 }, { x: 0, z: 8.2 }];
    this.jacks.forEach((j, i) => { j.mover.pos = { ...spots[i] }; j.mover.heading = Math.PI; });
    this.rebuildObstacles();
    this.markWave(deep ? 9 : 8, true);
  }

  get rivals(): Jack[] { return this.jacks.slice(1); }
  get me(): Jack { return this.jacks[0]; }

  private rebuildObstacles(): void {
    this.obstacles.length = 0;
    for (const t of this.trees) if (!t.felled) this.obstacles.push({ kind: 'circle', x: t.x, z: t.z, r: 0.3 * t.scale + 0.15 });
  }

  /** Put rings on `n` more trees: spread out, further from the start; later waves favour bigger trees. */
  private markWave(n: number, first = false): void {
    const pool = this.trees.filter((t) => !t.felled && !t.marked);
    const want: Size[] = first ? ['small', 'small', 'medium', 'small', 'medium', 'large', 'medium', 'small', 'large'] : this.wave === 2 ? ['medium', 'small', 'large', 'medium', 'large'] : ['large', 'medium', 'large', 'large', 'medium'];
    const picked: Tree[] = [];
    for (let i = 0; i < n && pool.length; i++) {
      const sizeWant = want[i % want.length];
      let best: Tree | null = null, bs = -Infinity;
      for (const t of pool) {
        if (picked.includes(t)) continue;
        const dp = Math.hypot(t.x - this.you.pos.x, t.z - this.you.pos.z);
        const near = picked.reduce((m, p) => Math.min(m, Math.hypot(t.x - p.x, t.z - p.z)), 99);
        const sc = (t.size === sizeWant ? 6 : 0) + Math.min(dp, 18) * (first ? 0.25 : 0.5) + Math.min(near, 8) * 0.8 + this.rnd() * 2;
        if (sc > bs) { bs = sc; best = t; }
      }
      if (!best) break;
      picked.push(best);
    }
    for (const t of picked) { t.marked = true; t.wave = this.wave; t.bonus = this.rnd() < (this.variant === 'deep' ? 0.3 : 0.2) || (t.size === 'large' && this.rnd() < 0.3); }
    if (!first) this.events.push({ kind: 'wave', n: this.wave });
  }

  /** ringed trees still standing */
  get remaining(): number { return this.trees.filter((t) => t.marked && !t.felled).length; }
  get markedTotal(): number { return this.trees.filter((t) => t.marked).length; }
  get standing(): number { return this.trees.filter((t) => !t.felled).length; }
  tree(id: number): Tree | undefined { return this.trees[id]; }

  start(): void { if (this.state === 'ready') this.state = 'playing'; }

  /** Tap a tree: the Fuzzy walks there by itself and it becomes the target once in reach. */
  goToTree(id: number): boolean {
    const t = this.trees[id];
    if (!t || t.felled || this.state !== 'playing') return false;
    this.goal = { x: t.x, z: t.z, tree: id };
    this.want = id;
    this.stillFor = 0;
    this.events.push({ kind: 'goal', tree: t, at: { x: t.x, z: t.z } });
    return true;
  }
  /** Tap the ground: walk to that spot. */
  goTo(x: number, z: number): void {
    if (this.state !== 'playing') return;
    const r = this.you.o.radius;
    this.goal = { x: Math.max(-ARENA.hw + r, Math.min(ARENA.hw - r, x)), z: Math.max(-ARENA.hd + r, Math.min(ARENA.hd - r, z)), tree: null };
    this.want = null;
    this.stillFor = 0;
    this.events.push({ kind: 'goal', at: { x: this.goal.x, z: this.goal.z } });
  }
  /** The tree a tap at (x, z) means, if any (a generous radius round the trunk). */
  treeAt(x: number, z: number): Tree | null {
    let best: Tree | null = null, bd = Infinity;
    for (const t of this.trees) { if (t.felled) continue; const d = Math.hypot(t.x - x, t.z - z); if (d < 0.55 * t.scale + 0.5 && d < bd) { bd = d; best = t; } }
    return best;
  }

  private points(t: Tree, mult: number): number { return Math.round(SCORING.points[t.size] * (t.marked ? SCORING.ringMult : 1) * mult) + (t.bonus ? SCORING.bonusPoints : 0); }

  step(dt: number, input: Vec2): void {
    this.events.length = 0;
    if (this.state !== 'playing') return;
    const w = this.clock.step(dt);
    if (w === 'timeup') { this.state = 'done'; this.target = null; this.goal = null; this.events.push({ kind: 'timeup' }); return; }
    if (typeof w === 'number') this.events.push({ kind: 'warn', n: w });
    // ---- you: the stick/keys, or the spot you tapped ----
    let inp = input;
    if (Math.hypot(input.x, input.z) > 0.08) this.goal = null;
    else if (this.goal) {
      const g = this.goal;
      const dx = g.x - this.you.pos.x, dz = g.z - this.you.pos.z, d = Math.hypot(dx, dz);
      const tree = g.tree !== null ? this.trees[g.tree] : null;
      const reach = tree ? d - 0.3 * tree.scale : d;
      if ((tree && (tree.felled || reach < CHOP_RANGE * 0.8)) || (!tree && d < 0.35)) { this.goal = null; if (tree && tree.by !== null && tree.by !== 0) this.events.push({ kind: 'taken', tree, who: this.jacks[tree.by] }); }
      else {
        inp = { x: (dx / d) * Math.min(1, d / 0.8), z: (dz / d) * Math.min(1, d / 0.8) };
        this.stillFor = this.you.speed < 0.35 ? this.stillFor + dt : 0;
        if (this.stillFor > 1.2) this.goal = null; // stuck behind something: give up rather than push forever
      }
    }
    const wasBlocked = this.you.blocked;
    this.you.step(dt, inp);
    if (this.you.blocked && !wasBlocked && this.you.speed > 2) this.events.push({ kind: 'bump' });
    if (this.combo.step(dt)) this.events.push({ kind: 'comboEnd' });
    // the nearest free standing tree in reach becomes the target (a tapped tree first); the meter swings while there is one
    // while walking to a tapped tree, only that tree can become the target (trees you pass don't flash the gold ring or get claimed)
    let best: Tree | null = null, bd = CHOP_RANGE;
    const heading = this.goal && this.goal.tree !== null ? this.goal.tree : null;
    for (const t of this.trees) {
      if (t.felled || (t.by !== null && t.by !== 0)) continue;
      if (heading !== null && t.id !== heading) continue;
      const d = Math.hypot(t.x - this.you.pos.x, t.z - this.you.pos.z) - 0.3 * t.scale;
      if (d < CHOP_RANGE && t.id === this.want) { best = t; break; }
      if (d < bd) { bd = d; best = t; }
    }
    const id = best ? best.id : null;
    if (id !== this.target) {
      if (this.target !== null && this.trees[this.target].by === 0) this.trees[this.target].by = null;
      this.target = id;
      if (best) best.by = 0;
      this.meter = { value: 0, dir: 1, speed: 1.15 };
      this.events.push({ kind: 'target', tree: best ?? undefined });
    }
    // the tapped tree is in reach: stop walking, it's time to chop
    if (this.goal && this.goal.tree !== null && this.goal.tree === this.target) this.goal = null;
    if (this.target !== null) {
      const m = this.meter;
      m.value += m.dir * (m.speed + this.clock.k * 0.3) * dt;
      if (m.value >= 1) { m.value = 1; m.dir = -1; } else if (m.value <= 0) { m.value = 0; m.dir = 1; }
    }
    // ---- the rivals ----
    for (const r of this.rivals) this.stepRival(r, dt);
    // ---- wood pieces fly out, land, and are picked up by walking over them ----
    for (const p of this.woods) {
      if (p.state === 'got') continue;
      p.age += dt;
      if (p.state === 'flying') {
        p.vy -= 12 * dt; p.y += p.vy * dt; p.x += p.vx * dt; p.z += p.vz * dt;
        if (p.y <= 0) { p.y = 0; p.state = 'ground'; p.vx = p.vz = 0; p.x = Math.max(-ARENA.hw + 0.5, Math.min(ARENA.hw - 0.5, p.x)); p.z = Math.max(-ARENA.hd + 0.5, Math.min(ARENA.hd - 0.5, p.z)); }
      } else if (Math.hypot(p.x - this.you.pos.x, p.z - this.you.pos.z) < PICK_RANGE) {
        p.state = 'got';
        this.wood++; this.me.wood++;
        this.score += p.value; this.me.score = this.score;
        this.events.push({ kind: 'pick', wood: p, value: p.value });
        this.checkLead();
      }
    }
  }

  /** A rival: pick a free tree, walk there, claim it, chop at its own pace, take a breath, repeat. */
  private stepRival(r: Jack, dt: number): void {
    r.pause = Math.max(0, r.pause - dt);
    let t = r.target !== null ? this.trees[r.target] : null;
    if (t && (t.felled || (t.by !== null && t.by !== r.id))) { t = null; r.target = null; }
    if (!t) {
      if (r.pause > 0) { r.mover.step(dt, { x: 0, z: 0 }); return; }
      t = this.pickFor(r);
      r.target = t ? t.id : null;
      r.stuck = 0;
      if (!t) { r.mover.step(dt, { x: 0, z: 0 }); return; }
    }
    const dx = t.x - r.mover.pos.x, dz = t.z - r.mover.pos.z, d = Math.hypot(dx, dz);
    if (d - 0.3 * t.scale < CHOP_RANGE * 0.85) {
      // in reach: claim it (unless you got there first) and chop on a steady rhythm
      if (t.by === null) t.by = r.id;
      if (t.by !== r.id) { r.target = null; r.avoid = t.id; r.pause = 0.3; return; }
      r.mover.step(dt, { x: 0, z: 0 });
      r.mover.heading = Math.atan2(dx, dz);
      r.chopT += dt;
      if (r.chopT >= SCORING.rival.interval(r.skill)) {
        r.chopT = 0;
        t.hp = Math.max(0, t.hp - SCORING.rival.damage(r.skill));
        t.chops++;
        this.events.push({ kind: 'rivalChop', who: r, tree: t });
        if (t.hp <= 0) {
          t.felled = true; t.felledBy = r.id; t.by = null;
          r.cleared++;
          // the rival's wood is counted straight in (no pieces to chase for it)
          const value = this.points(t, 1) + SCORING.woodPieces[t.size] * SCORING.woodPoint;
          r.score += value; r.wood += SCORING.woodPieces[t.size];
          this.events.push({ kind: 'rivalFell', who: r, tree: t, value });
          this.rebuildObstacles();
          r.target = null; r.pause = SCORING.rival.pause(r.skill);
          if (this.target === t.id) this.target = null;
          if (this.remaining <= 2) { this.wave++; this.markWave(this.variant === 'deep' ? 5 : 4); }
          this.checkLead();
        }
      }
      return;
    }
    r.mover.step(dt, { x: dx / d, z: dz / d });
    // stuck behind trunks: try another tree
    r.stuck = r.mover.speed < 0.35 ? r.stuck + dt : 0;
    if (r.stuck > 1.5) { r.avoid = t.id; r.target = null; r.stuck = 0; }
  }

  /** Which tree a rival goes for: near, big (the skilled ones like big and ringed trees), free, not the one it just gave up on. */
  private pickFor(r: Jack): Tree | null {
    let best: Tree | null = null, bs = -Infinity;
    for (const t of this.trees) {
      if (t.felled || t.by !== null || t.id === r.avoid) continue;
      if (this.rivals.some((o) => o !== r && o.target === t.id)) continue; // somebody is already heading there
      const d = Math.hypot(t.x - r.mover.pos.x, t.z - r.mover.pos.z);
      const sizeK = t.size === 'large' ? 2.6 : t.size === 'medium' ? 1.6 : 1;
      const sc = -d * (1.1 - r.skill * 0.5) + sizeK * (1.5 + r.skill * 2.5) + (t.marked ? 2 + r.skill * 2 : 0) + (t.bonus ? 1.5 : 0) + this.rnd() * 2.5;
      if (sc > bs) { bs = sc; best = t; }
    }
    return best;
  }

  /** Swing the axe at the tree in reach. Timing decides the hit: perfect (sweet spot), good (near it) or weak. */
  chop(): { hit: Hit; damage: number; felled: boolean; tree: Tree } | null {
    if (this.state !== 'playing' || this.target === null) return null;
    const t = this.trees[this.target];
    if (!t || t.felled) return null;
    const v = this.meter.value;
    const hit: Hit = v >= SWEET.lo && v <= SWEET.hi ? 'perfect' : v >= SWEET.lo - 0.2 && v <= Math.min(1, SWEET.hi + 0.08) ? 'good' : 'weak';
    const damage = hit === 'perfect' ? 2 : hit === 'good' ? 1.4 : 0.6;
    t.hp = Math.max(0, t.hp - damage);
    t.chops++;
    let mult = this.combo.mult;
    if (hit === 'perfect') { this.perfect++; mult = this.combo.hit(); if (this.combo.chain === this.combo.ladder.find((l) => l.mult === mult && l.at > 0)?.at) this.events.push({ kind: 'combo', mult, n: this.combo.chain }); }
    else if (hit === 'weak' && this.combo.chain > 0) { this.combo.reset(); this.events.push({ kind: 'comboEnd' }); mult = 1; }
    this.events.push({ kind: 'chop', tree: t, hit });
    let felled = false;
    if (t.hp <= 0) {
      felled = true; t.felled = true; t.felledBy = 0; t.by = null; this.cleared++; this.me.cleared++;
      const points = this.points(t, mult);
      this.score += points; this.me.score = this.score;
      this.events.push({ kind: 'felled', tree: t, value: points, mult });
      // wood flies out around the stump (a golden piece for a bonus tree)
      const n = SCORING.woodPieces[t.size];
      for (let i = 0; i < n + (t.bonus ? 1 : 0); i++) {
        const a = this.rnd() * Math.PI * 2, sp = 2 + this.rnd() * 2.5, gold = t.bonus && i === n;
        this.woods.push({ id: this.woodId++, x: t.x, z: t.z, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: 3.5 + this.rnd() * 2, y: 0.8, value: gold ? SCORING.woodPoint * 4 : SCORING.woodPoint, gold, state: 'flying', age: 0 });
      }
      this.rebuildObstacles();
      this.target = null;
      if (this.want === t.id) this.want = null;
      if (this.remaining <= 2) { this.wave++; this.markWave(this.variant === 'deep' ? 5 : 4); }
      this.checkLead();
    }
    // the marker restarts from the bottom so every swing is a fresh judgement
    this.meter.value = 0; this.meter.dir = 1;
    return { hit, damage, felled, tree: t };
  }

  private checkLead(): void {
    if (!this.rivals.length) return;
    const lead = this.standings()[0];
    if (lead.id !== this.leader && lead.score > 0) { this.leader = lead.id; this.events.push({ kind: 'lead', who: this.jacks[lead.id] }); }
  }

  /** Everyone, best first (ties: more trees, then you). */
  standings(): Standing[] {
    const list = this.jacks.map((j) => ({ id: j.id, name: j.name, score: j.score, cleared: j.cleared, wood: j.wood, you: j.you, place: 0 }));
    list.sort((a, b) => b.score - a.score || b.cleared - a.cleared || a.id - b.id);
    list.forEach((x, i) => { x.place = i + 1; });
    return list;
  }

  place(): number { return this.rivals.length ? this.standings().find((x) => x.you)!.place : tierPlace(this.score, SCORING.tiers); }
  result(): { place: number; score: number; timeMs: number; wood: number; cleared: number; total: number; perfect: number; bestCombo: number; tier: string; standings: Standing[] } {
    const place = this.place();
    return { place, score: this.score, timeMs: Math.round(this.clock.time * 1000), wood: this.wood, cleared: this.cleared, total: this.trees.length, perfect: this.perfect, bestCombo: this.combo.best, tier: SCORING.tierNames[Math.min(place, 4) - 1], standings: this.standings() };
  }
}
