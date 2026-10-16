/**
 * Fuzzy Crossing — a Frogger-style break game. Hop across the road and the river, fill the five
 * nests at the top, and grab Fuzzies along the way (they go straight to your account balance).
 *
 * This file is the game itself (rules, timing, collisions). Drawing is done by a View:
 * view3d.ts (realistic 3D) or view2d.ts (classic 2D, also the fallback without WebGL).
 */
import { sfx } from './sound';
import { wsfx } from './worldSounds';
import type { CharacterDef } from '../crossing/characters';
import * as S from '../crossing/sim';
import type { LevelDef, RowSpec, ObjSpec } from '../crossing/sim';

export const COLS = 11;
export const ROWS = 13;
export const GOAL = 0, MEDIAN = 6, START = 12;
export const HOMES = [1, 3, 5, 7, 9];
/** Objects keep driving/floating this far past the board edges before wrapping round. */
export const OFFSCREEN = 12;
const LIFE_TIME = 32;

export interface Skin { id: string; name: string; cost: number; colors: [string, string]; /** the collectible Fuzzy this look belongs to (outfit, fur finish, jump style…) */ character?: CharacterDef }
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
/** `kind`: Classic uses log / pad / car / truck / bus; world levels add the rest (see crossing/sim.ts). `spec` = the world level's object */
export interface Obj { id: number; x: number; len: number; kind: S.ObjKind; color: string; sink?: number; spec?: ObjSpec }
/** `type`: Classic rows are road / river; world levels use every surface. `spec` = the world level's row */
export interface Lane { row: number; type: S.Surface; speed: number; span: number; objs: Obj[]; spec?: RowSpec }
/** a seasonal pickup the screen asks the game to drop now and then during an event (cosmetic: no coins, no Fuzzies; the screen counts it) */
export interface EventItem { event: string; emoji: string; colors: [string, string] }
export interface Token { id: number; row: number; x: number; gold: boolean; obj?: Obj; off?: number; age: number; life: number; ev?: EventItem }
export type DeathKind = 'splash' | 'crash' | 'bonk' | 'time' | 'train' | 'zap';

export interface Hud { score: number; level: number; lives: number; fuzzies: number; time: number; best: number;
  /** world levels: what's left to do */
  goal?: { nests: number; nestsNeed: number; coins?: number; coinsNeed?: number; timeLeft?: number; maxLives: number } }
export interface Result { score: number; level: number; fuzzies: number; homes: number }
/** how a world level ended */
export interface LevelResult { cleared: boolean; stars: number; livesLost: number; score: number; coins: number; nests: number; time: number; reason?: 'lives' | 'time' }
export interface GameOpts { mode: 'classic' | 'world'; level?: LevelDef }

/** Something happened that a view may want to show (particles, pop-up text, camera shake…). */
export type Fx =
  | { kind: 'hop'; x: number; row: number }
  | { kind: 'collect'; x: number; row: number; gold: boolean; amount: number; /** set when it was a seasonal event item */ item?: EventItem }
  | { kind: 'death'; x: number; row: number; how: DeathKind }
  | { kind: 'home'; x: number; row: number; amount: number }
  | { kind: 'level'; level: number; amount: number }
  /** the Fuzzy reached a row it hadn't reached yet in this life */
  | { kind: 'advance'; row: number }
  /** a train passed along a rail row while the Fuzzy was alive on/crossing that row's lane (once per train per life) — emitted by the Worlds engine */
  | { kind: 'train-passed'; row: number }
  // world levels
  | { kind: 'bump'; x: number; row: number }
  | { kind: 'slide'; x: number; row: number }
  | { kind: 'teleport'; x: number; row: number; tx: number; trow: number }
  | { kind: 'unlock'; nests: number[] }
  | { kind: 'levelComplete'; stars: number }
  | { kind: 'levelFailed'; reason: 'lives' | 'time' };

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
  /** seasonal event pickups to drop now and then (empty = exactly the normal game); set by the screen when an event is on */
  eventItems: EventItem[] = [];
  paused = false;
  over = false;
  started = false;
  private queued: Dir | null = null;
  private furthest = START;
  private spawnIn = 1.5;
  private raf = 0;
  private last = 0;
  private running = false;
  // ---------- world levels ----------
  /** the world level being played (undefined = Classic) */
  readonly def?: LevelDef;
  /** the world level's clock: everything in the level is a function of it (0 = the moment you start) */
  wt = -6;
  /** which of the 5 nest spots are open in this level (Classic: all) */
  nestOpen = [true, true, true, true, true];
  /** Coin Rush: the nests stay shut until enough coins are collected */
  locked = false;
  coinsGot = 0;
  livesLost = 0;
  maxLives = 3;
  cleared = false;
  private hopDir: Dir = 'up';
  private rowSpec: (RowSpec | undefined)[] = [];

  constructor(private view: View, readonly skin: Skin, private best: number, private hooks: {
    hud: (h: Hud) => void;
    fuzzy: (amount: number) => void;
    over: (r: Result) => void;
    event?: (e: Fx) => void;
    /** world levels end here instead of `over` */
    levelEnd?: (r: LevelResult) => void;
  }, opts: GameOpts = { mode: 'classic' }) {
    if (opts.mode === 'world' && opts.level) {
      this.def = opts.level;
      this.setupWorld(opts.level);
    } else this.buildLanes();
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

  /** world level: rows, coins, nests and lives come from the LevelDef */
  private setupWorld(d: LevelDef): void {
    this.rowSpec = Array.from({ length: ROWS }, (_, r) => S.rowOf(d, r));
    this.lanes = d.rows.map((L) => ({
      row: L.row, type: L.surface, speed: L.speed, span: L.span, spec: L,
      objs: L.objs.map((o) => ({ id: nextId++, x: S.objX(L, o, this.wt), len: o.len, kind: o.kind, color: o.color, spec: o })),
    }));
    this.nestOpen = HOMES.map((c) => d.nests.includes(c));
    this.homes = HOMES.map(() => false);
    this.lives = this.maxLives = d.lives;
    this.timer = d.timer;
    this.locked = !!d.goal.coins;
    this.tokens = d.coins.map((c) => ({ id: nextId++, row: c.row, x: c.col, gold: !!c.gold, age: 0, life: Infinity }));
  }
  get world(): boolean { return !!this.def; }
  /** seconds per life */
  get lifeTime(): number { return this.def?.timer ?? LIFE_TIME; }
  /** world levels: set the level clock so the level is exactly at 0 when start() is called after `seconds` (intro / banner) */
  prime(seconds: number): void { if (this.def) this.wt = -Math.max(0, seconds); }
  /** the row's world-level spec (undefined in Classic or for rows 0 / 12) */
  spec(row: number): RowSpec | undefined { return this.rowSpec[row]; }

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
      if (!this.paused && !this.over) { if (this.def) this.updateWorld(dt, this.running); else this.update(dt, this.running); }
      this.view.render(this, this.paused ? 0 : dt);
    };
    this.raf = requestAnimationFrame(tick);
  }

  start(): void {
    if (this.running) return;
    this.running = this.started = true;
    if (this.def) { this.wt = 0; this.placeObjects(); }
    this.emitHud();
  }
  /** Dev/test hook: stop the animation loop and drive the game by hand with step(dt). */
  manual(): void { cancelAnimationFrame(this.raf); }
  step(dt: number, draw = true): void {
    if (!this.paused && !this.over) { if (this.def) this.updateWorld(dt, this.running); else this.update(dt, this.running); }
    if (draw) this.view.render(this, this.paused ? 0 : dt);
  }

  setPaused(p: boolean): void { this.paused = p; this.last = performance.now(); }
  /** Stops the game loop. The view belongs to the caller, so it can be reused for the next game. */
  destroy(): void { cancelAnimationFrame(this.raf); this.running = false; }

  input(d: Dir): void {
    if (!this.running || this.paused || this.over || this.dying) return;
    if (this.hop) { this.queued = d; return; }
    if (this.def) { this.inputWorld(d); return; }
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
  onRiver(row: number): boolean { return this.def ? S.needsRide(this.rowSpec[row]) : row >= 1 && row <= 5; }
  /** standing here moves you sideways (river riders, hover lanes) */
  carries(row: number): boolean { return this.def ? S.carries(this.rowSpec[row]) : row >= 1 && row <= 5; }
  laneAt(row: number): Lane | undefined { return this.lanes.find((l) => l.row === row); }
  /** 0 = floating, 1 = fully under water. Pads start sinking at 0.55 so players get a warning. */
  sinkAmount(o: Obj): number {
    if (o.spec) { const L = this.laneOf(o); return L?.spec ? S.sinkAmount(L.spec, o.spec, this.wt) : 0; }
    if (o.sink === undefined) return 0;
    const s = Math.sin(this.clock * 0.9 + o.sink);
    return Math.max(0, Math.min(1, (s - 0.55) / 0.27));
  }
  sunk(o: Obj): boolean {
    if (o.spec) { const L = this.laneOf(o); return !!L?.spec && S.sunk(L.spec, o.spec, this.wt); }
    return o.sink !== undefined && Math.sin(this.clock * 0.9 + o.sink) > 0.82;
  }
  private laneOf(o: Obj): Lane | undefined { return this.lanes.find((l) => l.objs.includes(o)); }

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
    if (this.py < this.furthest) { this.furthest = this.py; this.score += 10; this.emit({ kind: 'advance', row: this.py }); }
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
    const max = 3 + Math.min(4, Math.floor(this.level / 2)) + (this.eventItems.length ? 1 : 0);
    if (this.tokens.length >= max) return;
    const ev = this.eventItems.length && Math.random() < 0.22 && !this.tokens.some((t) => t.ev) ? this.eventItems[Math.floor(Math.random() * this.eventItems.length)] : undefined;
    const gold = !ev && Math.random() < 0.08 + this.level * 0.01;
    if (Math.random() < 0.55) {
      // on a road lane or the median, standing still
      const rows = [MEDIAN, 7, 8, 9, 10, 11];
      const row = rows[Math.floor(Math.random() * rows.length)];
      const x = Math.floor(Math.random() * COLS);
      if (this.tokens.some((t) => t.row === row && Math.abs(t.x - x) < 1)) return;
      this.tokens.push({ id: nextId++, row, x, gold, ev, age: 0, life: 9 + Math.random() * 4 });
    } else {
      // riding a log or lily pad
      const l = this.lanes.filter((x) => x.type === 'river')[Math.floor(Math.random() * 5)];
      const vis = l.objs.filter((o) => o.x > -1 && o.x < COLS - 1);
      const o = vis[Math.floor(Math.random() * vis.length)];
      if (!o) return;
      const off = Math.floor(Math.random() * o.len);
      this.tokens.push({ id: nextId++, row: l.row, x: o.x + off, gold, ev, obj: o, off, age: 0, life: 14 });
    }
  }

  private collectAt(x: number, row: number): void {
    for (const t of this.tokens) {
      if (t.row !== row || Math.abs(t.x - x) > 0.62) continue;
      t.age = t.life; // remove
      if (t.ev) { this.score += 25; this.emit({ kind: 'collect', x: t.x, row: t.row, gold: false, amount: 0, item: t.ev }); sfx.collect(); continue; }
      const n = t.gold ? 5 : 1;
      this.score += t.gold ? 100 : 25;
      this.give(n);
      this.emit({ kind: 'collect', x: t.x, row: t.row, gold: t.gold, amount: n });
      if (t.gold) sfx.gold(); else sfx.collect();
      if (this.def) {
        this.coinsGot++;
        if (this.locked && this.coinsGot >= (this.def.goal.coins ?? 0)) { this.locked = false; this.emit({ kind: 'unlock', nests: this.def.nests }); wsfx.unlock(); }
      }
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
    if (kind === 'splash') sfx.splash(); else if (kind === 'zap') wsfx.zap(); else if (kind === 'train') wsfx.horn(); else sfx.crash();
    this.emit({ kind: 'death', x: vx, row: this.py, how: kind });
  }

  private afterDeath(): void {
    this.dying = null;
    this.lives--;
    if (this.def) {
      this.livesLost++;
      this.trainNear = {};
      if (this.lives <= 0) { this.endLevel(false, 'lives'); return; }
      this.resetPlayer();
      return;
    }
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
    this.px = 5; this.py = START; this.furthest = START; this.timer = this.lifeTime; this.hop = null; this.facing = 'up';
    if (this.def) this.queued = null;
  }

  private emitHud(): void {
    const d = this.def;
    this.hooks.hud({ score: this.score, level: d ? d.level : this.level, lives: this.lives, fuzzies: this.fuzzies, time: Math.max(0, this.timer / this.lifeTime), best: Math.max(this.best, this.score),
      goal: d ? { nests: this.homesFilled, nestsNeed: d.goal.nests, coins: d.goal.coins ? this.coinsGot : undefined, coinsNeed: d.goal.coins, timeLeft: d.goal.timeLimit ? Math.max(0, d.goal.timeLimit - Math.max(0, this.wt)) : undefined, maxLives: this.maxLives } : undefined });
  }

  // ---------- world levels (the rules live in crossing/sim.ts, shared with the fairness solver) ----------
  private placeObjects(): void {
    for (const l of this.lanes) if (l.spec) for (const o of l.objs) o.x = S.objX(l.spec, o.spec!, this.wt);
  }

  private inputWorld(d: Dir): void {
    const tg = S.hopTarget(this.def!, this.py, this.px, d);
    this.facing = d;
    if (!tg) {
      // a tree / snowman / tombstone in the way: a little bump, no hop
      const ty = d === 'up' ? this.py - 1 : d === 'down' ? this.py + 1 : this.py;
      if (ty >= 0 && ty <= START) { this.emit({ kind: 'bump', x: this.px, row: this.py }); wsfx.bump(); }
      return;
    }
    this.hopDir = d;
    this.hop = { fx: this.px, fy: this.py, tx: tg.tx, ty: tg.ty, t: 0 };
    this.emit({ kind: 'hop', x: this.px, row: this.py });
    sfx.hop();
  }

  private updateWorld(dt: number, live: boolean): void {
    const t0 = this.wt;
    this.clock += dt;
    this.wt += dt;
    const t = this.wt;
    this.placeObjects();
    if (this.tokens.length) this.tokens = this.tokens.filter((tk) => tk.age < tk.life);
    if (!live) return;
    if (this.dying) {
      this.dying.t += dt;
      if (this.dying.t > 1.1) this.afterDeath();
      return;
    }
    const tl = this.def!.goal.timeLimit;
    if (tl && t >= tl) { this.endLevel(false, 'time'); return; }
    this.timer -= dt;
    if (this.timer <= 0) { this.die('time'); return; }

    if (this.hop) {
      this.hop.t += dt / S.HOP_TIME;
      const hp = this.hop;
      const L = this.rowSpec[hp.fy];
      if (hp.fy === hp.ty && S.carries(L)) { const dd = S.disp(L!, t) - S.disp(L!, t0); hp.fx += dd; hp.tx += dd; }
      if (hp.t >= 1 - 1e-9) {
        this.px = hp.tx; this.py = hp.ty;
        this.hop = null;
        this.landWorld();
        if (this.queued && !this.dying && !this.hop && !this.over) { const q = this.queued; this.queued = null; this.input(q); }
      }
    } else if (S.carries(this.rowSpec[this.py])) {
      const L = this.rowSpec[this.py]!;
      if (S.needsRide(L) && !S.rideAt(L, this.px, t)) { this.die('splash'); return; }
      this.px += S.disp(L, t) - S.disp(L, t0);
      if (S.needsRide(L)) { if (this.px < -0.45 || this.px > COLS - 0.55) { this.die('splash'); return; } }
      else this.px = Math.max(0, Math.min(COLS - 1, this.px));
    }
    if (this.dying || this.over) return;
    const [vx, vy] = this.visualPos();
    const row = Math.round(vy);
    const L = this.rowSpec[row];
    if (L) {
      const hz = S.hazardAt(L, vx, t);
      if (hz) { this.die(hz === 'splash' ? 'splash' : hz); return; }
    }
    this.collectAt(vx, row);
    this.trackTrains(t, row);
    this.emitHud();
  }

  /** "survived a train": a train went by on a rail row the Fuzzy was on or right next to, and the Fuzzy is still fine */
  private trainNear: Record<number, boolean> = {};
  private trackTrains(t: number, row: number): void {
    for (const l of this.lanes) {
      const L = l.spec;
      if (!L?.train) continue;
      const passing = S.trainWarning(L, t) && S.objX(L, L.objs[0], t) < COLS + 1 && S.objX(L, L.objs[0], t) + L.objs[0].len > -1;
      if (passing && Math.abs(row - L.row) <= 1) this.trainNear[L.row] = true;
      if (!passing && this.trainNear[L.row]) { this.trainNear[L.row] = false; this.emit({ kind: 'train-passed', row: L.row }); }
    }
  }

  private landWorld(): void {
    const d = this.def!;
    if (this.py < this.furthest) { this.furthest = this.py; this.score += 10; this.emit({ kind: 'advance', row: this.py }); }
    if (this.py === GOAL) {
      const col = Math.round(this.px);
      const hi = HOMES.indexOf(col);
      if (hi < 0 || !this.nestOpen[hi] || this.homes[hi] || this.locked) { this.die('bonk'); return; }
      this.homes[hi] = true;
      this.homesFilled++;
      this.score += 50 + Math.round(this.timer * 2);
      this.give(2);
      this.emit({ kind: 'home', x: col, row: GOAL, amount: 2 });
      sfx.home();
      if (this.homesFilled >= d.goal.nests) { this.endLevel(true); return; }
      this.resetPlayer();
      return;
    }
    const L = this.rowSpec[this.py];
    if (!S.carries(L)) {
      const tp = S.teleportFrom(d, this.py, Math.round(this.px));
      if (tp) {
        this.emit({ kind: 'teleport', x: this.px, row: this.py, tx: tp.to[1], trow: tp.to[0] });
        wsfx.teleport();
        this.px = tp.to[1]; this.py = tp.to[0];
        if (this.py < this.furthest) { this.furthest = this.py; this.score += 10; this.emit({ kind: 'advance', row: this.py }); }
        return;
      }
      const sl = S.slideNext(d, this.py, Math.round(this.px), this.hopDir);
      if (sl) { this.hop = { fx: this.px, fy: this.py, tx: sl.tx, ty: sl.ty, t: 0 }; this.emit({ kind: 'slide', x: this.px, row: this.py }); wsfx.slide(); return; }
    }
    if (S.needsRide(L) && !S.rideAt(L!, this.px, this.wt)) this.die('splash');
  }

  private endLevel(cleared: boolean, reason?: 'lives' | 'time'): void {
    if (this.over) return;
    this.over = true;
    this.cleared = cleared;
    this.hop = null;
    const stars = cleared ? S.starsFor(this.livesLost) : 0;
    if (cleared) { this.score += 200 + (this.maxLives - this.livesLost) * 50; wsfx.win(); this.emit({ kind: 'levelComplete', stars }); }
    else { sfx.over(); this.emit({ kind: 'levelFailed', reason: reason ?? 'lives' }); }
    this.emitHud();
    this.hooks.levelEnd?.({ cleared, stars, livesLost: this.livesLost, score: this.score, coins: this.coinsGot, nests: this.homesFilled, time: Math.max(0, this.wt), reason });
  }

  /** Where the fuzzy is drawn: [column, row, hop height 0..1]. */
  visualPos(): [number, number, number] {
    if (!this.hop) return [this.px, this.py, 0];
    const t = Math.min(1, this.hop.t);
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    return [this.hop.fx + (this.hop.tx - this.hop.fx) * e, this.hop.fy + (this.hop.ty - this.hop.fy) * e, Math.sin(t * Math.PI)];
  }
}
