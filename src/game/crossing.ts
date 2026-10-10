/**
 * Fuzzy Crossing — a Frogger-style break game. Hop across the road and the river, fill the five
 * nests at the top, and grab Fuzzies along the way (they go straight to your account balance).
 *
 * This file is the game itself (rules, timing, collisions). Drawing is done by a View:
 * view3d.ts (realistic 3D) or view2d.ts (classic 2D, also the fallback without WebGL).
 */
import { sfx } from './sound';

export const COLS = 11;
export const ROWS = 13;
export const GOAL = 0, MEDIAN = 6, START = 12;
export const HOMES = [1, 3, 5, 7, 9];
/** Objects keep driving/floating this far past the board edges before wrapping round. */
export const OFFSCREEN = 12;
const LIFE_TIME = 32;

export interface Skin { id: string; name: string; cost: number; colors: [string, string] }
export const SKINS: Skin[] = [
  { id: 'classic', name: 'Classic', cost: 0, colors: ['#ff86bb', '#b8235f'] },
  { id: 'mint', name: 'Minty', cost: 15, colors: ['#7dffcf', '#22b5a0'] },
  { id: 'sunny', name: 'Sunny', cost: 15, colors: ['#ffe066', '#ff8c42'] },
  { id: 'ocean', name: 'Ocean', cost: 20, colors: ['#7ad7ff', '#3a5bff'] },
  { id: 'berry', name: 'Berry', cost: 25, colors: ['#ff6b8b', '#b0004f'] },
  { id: 'galaxy', name: 'Galaxy', cost: 40, colors: ['#c77dff', '#240046'] },
  { id: 'gold', name: 'Golden', cost: 80, colors: ['#fff3b0', '#e0a100'] },
];

export type Dir = 'up' | 'down' | 'left' | 'right';
export interface Obj { id: number; x: number; len: number; kind: 'log' | 'pad' | 'car' | 'truck' | 'bus'; color: string; sink?: number }
export interface Lane { row: number; type: 'road' | 'river'; speed: number; span: number; objs: Obj[] }
export interface Token { id: number; row: number; x: number; gold: boolean; obj?: Obj; off?: number; age: number; life: number }
export type DeathKind = 'splash' | 'crash' | 'bonk' | 'time';

export interface Hud { score: number; level: number; lives: number; fuzzies: number; time: number; best: number }
export interface Result { score: number; level: number; fuzzies: number; homes: number }

/** Something happened that a view may want to show (particles, pop-up text, camera shake…). */
export type Fx =
  | { kind: 'hop'; x: number; row: number }
  | { kind: 'collect'; x: number; row: number; gold: boolean; amount: number }
  | { kind: 'death'; x: number; row: number; how: DeathKind }
  | { kind: 'home'; x: number; row: number; amount: number }
  | { kind: 'level'; level: number; amount: number };

export interface View {
  resize(): void;
  render(game: Crossing, dt: number): void;
  fx(e: Fx, game: Crossing): void;
  /** Lanes were rebuilt (new level): drop any per-object visuals. */
  reset(game: Crossing): void;
  destroy(): void;
  /** Optional cute start: zoom in on the Fuzzy, it winks, zoom out to the game. Calls done() when finished. */
  playIntro?(game: Crossing, done: () => void): void;
  skipIntro?(): void;
}

const CAR_COLORS = ['#c8102e', '#f4a300', '#1f6fd1', '#5b3fd6', '#17a589', '#e84393', '#f2f2f2', '#1c1c22', '#8a9199'];

let nextId = 1;

export class Crossing {
  lanes: Lane[] = [];
  tokens: Token[] = [];
  homes = [false, false, false, false, false];
  px = 5; py = START; // logical position (column of the left edge, row)
  hop: { fx: number; fy: number; tx: number; ty: number; t: number } | null = null;
  facing: Dir = 'up';
  dying: { t: number; kind: DeathKind } | null = null;
  clock = 0;
  timer = LIFE_TIME;
  score = 0; level = 1; lives = 3; fuzzies = 0; homesFilled = 0;
  paused = false;
  over = false;
  started = false;
  private queued: Dir | null = null;
  private furthest = START;
  private spawnIn = 1.5;
  private raf = 0;
  private last = 0;
  private running = false;

  constructor(private view: View, readonly skin: Skin, private best: number, private hooks: {
    hud: (h: Hud) => void;
    fuzzy: (amount: number) => void;
    over: (r: Result) => void;
    event?: (e: Fx) => void;
  }) {
    this.buildLanes();
    view.reset(this);
    // Render even before the player presses start, so the board is visible behind the menu.
    this.loop();
  }

  // ---------- setup ----------
  private buildLanes(): void {
    const k = 1 + (this.level - 1) * 0.13;
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const car = () => CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
    const sinking = this.level >= 3;
    /** Fill the lane (including the off-screen stretch) with evenly random gaps. */
    const lane = (row: number, type: Lane['type'], speed: number, kind: Obj['kind'], len: number, gap: [number, number], color: () => string, sink = false): Lane => {
      const start = -OFFSCREEN;
      const objs: Obj[] = [];
      let x = start + rnd(0, gap[1]);
      let i = 0;
      while (x + len < COLS + OFFSCREEN) {
        objs.push({ id: nextId++, x, len, kind, color: color(), sink: sink && i % 2 === 0 ? rnd(0, 6) : undefined });
        x += len + rnd(gap[0], gap[1]);
        i++;
      }
      return { row, type, speed: speed * k, span: x - start, objs };
    };
    this.lanes = [
      lane(1, 'river', 1.1, 'log', 3, [2, 2.6], () => '#8b5a2b'),
      lane(2, 'river', -1.5, 'pad', 2, [1.6, 2.2], () => '#4caf50', sinking),
      lane(3, 'river', 1.9, 'log', 4, [2.4, 3.2], () => '#7a4e26'),
      lane(4, 'river', -1.0, 'pad', 2, [1.4, 2], () => '#43a047', sinking),
      lane(5, 'river', 1.4, 'log', 3, [1.8, 2.4], () => '#8f5d30'),
      lane(7, 'road', -1.6, 'truck', 2, [3, 4.5], car),
      lane(8, 'road', 2.2, 'car', 1, [3, 4.5], car),
      lane(9, 'road', -1.2, 'car', 1, [2.4, 3.5], car),
      lane(10, 'road', 2.8, 'car', 1, [5, 6.5], car),
      lane(11, 'road', -0.9, 'bus', 1.5, [2.6, 3.6], car),
    ];
  }

  resize(): void { this.view.resize(); }

  private emit(e: Fx): void {
    this.view.fx(e, this);
    this.hooks.event?.(e);
  }

  private loop(): void {
    cancelAnimationFrame(this.raf);
    this.last = performance.now();
    const tick = (t: number) => {
      this.raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, Math.max(0, (t - this.last) / 1000)); // never step backwards in time
      this.last = t;
      // Before start the world keeps moving gently behind the menu; the player is frozen.
      if (!this.paused && !this.over) this.update(dt, this.running);
      this.view.render(this, this.paused ? 0 : dt);
    };
    this.raf = requestAnimationFrame(tick);
  }

  start(): void {
    if (this.running) return;
    this.running = this.started = true;
    this.emitHud();
  }

  setPaused(p: boolean): void { this.paused = p; this.last = performance.now(); }
  /** Stops the game loop. The view belongs to the caller, so it can be reused for the next game. */
  destroy(): void { cancelAnimationFrame(this.raf); this.running = false; }

  input(d: Dir): void {
    if (!this.running || this.paused || this.over || this.dying) return;
    if (this.hop) { this.queued = d; return; }
    this.facing = d;
    const river = this.onRiver(this.py);
    const base = river ? this.px : Math.round(this.px);
    const tx = d === 'left' ? base - 1 : d === 'right' ? base + 1 : base;
    const ty = d === 'up' ? this.py - 1 : d === 'down' ? this.py + 1 : this.py;
    if (ty > START || ty < GOAL || tx < -0.4 || tx > COLS - 0.6) return;
    // Hopping off a log snaps to the nearest column so lining up with nests is fair.
    const sx = ty !== this.py && !this.onRiver(ty) ? Math.round(tx) : tx;
    this.hop = { fx: this.px, fy: this.py, tx: sx, ty, t: 0 };
    this.emit({ kind: 'hop', x: this.px, row: this.py });
    sfx.hop();
  }

  // ---------- simulation ----------
  onRiver(row: number): boolean { return row >= 1 && row <= 5; }
  laneAt(row: number): Lane | undefined { return this.lanes.find((l) => l.row === row); }
  /** 0 = floating, 1 = fully under water. Pads start sinking at 0.55 so players get a warning. */
  sinkAmount(o: Obj): number {
    if (o.sink === undefined) return 0;
    const s = Math.sin(this.clock * 0.9 + o.sink);
    return Math.max(0, Math.min(1, (s - 0.55) / 0.27));
  }
  sunk(o: Obj): boolean { return o.sink !== undefined && Math.sin(this.clock * 0.9 + o.sink) > 0.82; }

  private update(dt: number, live: boolean): void {
    this.clock += dt;
    for (const l of this.lanes) for (const o of l.objs) {
      o.x += l.speed * dt;
      if (l.speed > 0 && o.x > COLS + OFFSCREEN) o.x -= l.span;
      if (l.speed < 0 && o.x + o.len < -OFFSCREEN) o.x += l.span;
    }
    for (const t of this.tokens) { if (t.obj) t.x = t.obj.x + t.off!; t.age += dt; }
    this.tokens = this.tokens.filter((t) => t.age < t.life && t.x > -1.5 && t.x < COLS + 0.5);
    if (!live) return;

    if (this.dying) {
      this.dying.t += dt;
      if (this.dying.t > 1.1) this.afterDeath();
      return;
    }

    this.timer -= dt;
    if (this.timer <= 0) { this.die('time'); return; }

    // spawn Fuzzies
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) { this.spawnToken(); this.spawnIn = 1.6 + Math.random() * 2.2; }

    if (this.hop) {
      this.hop.t += dt / 0.14;
      const hp = this.hop;
      // Riding a log keeps moving you while you hop sideways along it.
      if (this.onRiver(hp.fy) && hp.fy === hp.ty) { const l = this.laneAt(hp.fy)!; hp.fx += l.speed * dt; hp.tx += l.speed * dt; }
      if (hp.t >= 1) {
        this.px = hp.tx; this.py = hp.ty;
        this.hop = null;
        this.land();
        if (this.queued && !this.dying) { const q = this.queued; this.queued = null; this.input(q); }
      }
    } else if (this.onRiver(this.py)) {
      const l = this.laneAt(this.py)!;
      if (!this.riding(l)) { this.die('splash'); return; }
      this.px += l.speed * dt;
      if (this.px < -0.45 || this.px > COLS - 0.55) { this.die('splash'); return; }
    }

    // traffic collisions (checked continuously, using where the fuzzy appears)
    const [vx, vy] = this.visualPos();
    const row = Math.round(vy);
    const lane = this.laneAt(row);
    if (lane?.type === 'road') {
      for (const o of lane.objs) if (vx + 0.78 > o.x + 0.06 && vx + 0.22 < o.x + o.len - 0.06) { this.die('crash'); return; }
    }
    this.collectAt(vx, row);
    this.emitHud();
  }

  riding(l: Lane): Obj | undefined {
    const c = this.px + 0.5;
    return l.objs.find((o) => c > o.x + 0.05 && c < o.x + o.len - 0.05 && !(o.kind === 'pad' && this.sunk(o)));
  }

  private land(): void {
    if (this.py < this.furthest) { this.furthest = this.py; this.score += 10; }
    if (this.py === GOAL) {
      const col = Math.round(this.px);
      const hi = HOMES.indexOf(col);
      if (hi < 0 || this.homes[hi]) { this.die('bonk'); return; }
      this.homes[hi] = true;
      this.homesFilled++;
      this.score += 50 + Math.round(this.timer * 2);
      this.give(2);
      this.emit({ kind: 'home', x: col, row: GOAL, amount: 2 });
      sfx.home();
      if (this.homes.every(Boolean)) this.levelUp();
      this.resetPlayer();
      return;
    }
    if (this.onRiver(this.py) && !this.riding(this.laneAt(this.py)!)) this.die('splash');
  }

  private levelUp(): void {
    this.level++;
    this.score += 200;
    this.give(5);
    this.homes = this.homes.map(() => false);
    sfx.level();
    this.buildLanes();
    this.tokens = [];
    this.view.reset(this);
    this.emit({ kind: 'level', level: this.level, amount: 5 });
  }

  private spawnToken(): void {
    const max = 3 + Math.min(4, Math.floor(this.level / 2));
    if (this.tokens.length >= max) return;
    const gold = Math.random() < 0.08 + this.level * 0.01;
    if (Math.random() < 0.55) {
      // on a road lane or the median, standing still
      const rows = [MEDIAN, 7, 8, 9, 10, 11];
      const row = rows[Math.floor(Math.random() * rows.length)];
      const x = Math.floor(Math.random() * COLS);
      if (this.tokens.some((t) => t.row === row && Math.abs(t.x - x) < 1)) return;
      this.tokens.push({ id: nextId++, row, x, gold, age: 0, life: 9 + Math.random() * 4 });
    } else {
      // riding a log or lily pad
      const l = this.lanes.filter((x) => x.type === 'river')[Math.floor(Math.random() * 5)];
      const vis = l.objs.filter((o) => o.x > -1 && o.x < COLS - 1);
      const o = vis[Math.floor(Math.random() * vis.length)];
      if (!o) return;
      const off = Math.floor(Math.random() * o.len);
      this.tokens.push({ id: nextId++, row: l.row, x: o.x + off, gold, obj: o, off, age: 0, life: 14 });
    }
  }

  private collectAt(x: number, row: number): void {
    for (const t of this.tokens) {
      if (t.row !== row || Math.abs(t.x - x) > 0.62) continue;
      t.age = t.life; // remove
      const n = t.gold ? 5 : 1;
      this.score += t.gold ? 100 : 25;
      this.give(n);
      this.emit({ kind: 'collect', x: t.x, row: t.row, gold: t.gold, amount: n });
      if (t.gold) sfx.gold(); else sfx.collect();
    }
  }

  private give(n: number): void {
    this.fuzzies += n;
    this.hooks.fuzzy(n);
  }

  private die(kind: DeathKind): void {
    if (this.dying) return;
    const [vx, vy] = this.visualPos();
    this.dying = { t: 0, kind };
    this.hop = null;
    this.queued = null;
    this.px = vx; this.py = Math.round(vy);
    if (kind === 'splash') sfx.splash(); else sfx.crash();
    this.emit({ kind: 'death', x: vx, row: this.py, how: kind });
  }

  private afterDeath(): void {
    this.dying = null;
    this.lives--;
    if (this.lives <= 0) {
      this.over = true;
      sfx.over();
      this.emitHud();
      this.hooks.over({ score: this.score, level: this.level, fuzzies: this.fuzzies, homes: this.homesFilled });
      return;
    }
    this.resetPlayer();
  }

  private resetPlayer(): void {
    this.px = 5; this.py = START; this.furthest = START; this.timer = LIFE_TIME; this.hop = null; this.facing = 'up';
  }

  private emitHud(): void {
    this.hooks.hud({ score: this.score, level: this.level, lives: this.lives, fuzzies: this.fuzzies, time: Math.max(0, this.timer / LIFE_TIME), best: Math.max(this.best, this.score) });
  }

  /** Where the fuzzy is drawn: [column, row, hop height 0..1]. */
  visualPos(): [number, number, number] {
    if (!this.hop) return [this.px, this.py, 0];
    const t = Math.min(1, this.hop.t);
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    return [this.hop.fx + (this.hop.tx - this.hop.fx) * e, this.hop.fy + (this.hop.ty - this.hop.fy) * e, Math.sin(t * Math.PI)];
  }
}
