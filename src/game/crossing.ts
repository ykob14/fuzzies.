/**
 * Fuzzy Crossing — a Frogger-style break game. Hop across the road and the river, fill the five
 * nests at the top, and grab Fuzzies along the way (they go straight to your account balance).
 */
import { sfx } from './sound';

export const COLS = 11;
export const ROWS = 13;
const GOAL = 0, MEDIAN = 6, START = 12;
const HOMES = [1, 3, 5, 7, 9];
const LIFE_TIME = 32;

export interface Skin { id: string; name: string; cost: number; colors: [string, string] }
export const SKINS: Skin[] = [
  { id: 'classic', name: 'Classic', cost: 0, colors: ['#ff7ac2', '#8b5cff'] },
  { id: 'mint', name: 'Minty', cost: 15, colors: ['#7dffcf', '#22b5a0'] },
  { id: 'sunny', name: 'Sunny', cost: 15, colors: ['#ffe066', '#ff8c42'] },
  { id: 'ocean', name: 'Ocean', cost: 20, colors: ['#7ad7ff', '#3a5bff'] },
  { id: 'berry', name: 'Berry', cost: 25, colors: ['#ff6b8b', '#b0004f'] },
  { id: 'galaxy', name: 'Galaxy', cost: 40, colors: ['#c77dff', '#240046'] },
  { id: 'gold', name: 'Golden', cost: 80, colors: ['#fff3b0', '#e0a100'] },
];

type Dir = 'up' | 'down' | 'left' | 'right';
interface Obj { x: number; len: number; kind: 'log' | 'pad' | 'car' | 'truck' | 'bus'; color: string; sink?: number }
interface Lane { row: number; type: 'road' | 'river'; speed: number; objs: Obj[] }
interface Token { row: number; x: number; gold: boolean; obj?: Obj; off?: number; age: number; life: number }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; text?: string; size: number }

export interface Hud { score: number; level: number; lives: number; fuzzies: number; time: number; best: number }
export interface Result { score: number; level: number; fuzzies: number; homes: number }

const CAR_COLORS = ['#ff5d5d', '#ffb03a', '#4cc9f0', '#7c4dff', '#2ec4b6', '#ff4f9a', '#f8f9fa'];

export class Crossing {
  private ctx: CanvasRenderingContext2D;
  private lanes: Lane[] = [];
  private tokens: Token[] = [];
  private parts: Particle[] = [];
  private homes = [false, false, false, false, false];
  private px = 5; private py = START; // logical position
  private hop: { fx: number; fy: number; tx: number; ty: number; t: number } | null = null;
  private queued: Dir | null = null;
  private facing: Dir = 'up';
  private dying: { t: number; kind: 'splash' | 'crash' | 'bonk' | 'time' } | null = null;
  private furthest = START;
  private timer = LIFE_TIME;
  private spawnIn = 1.5;
  private raf = 0;
  private last = 0;
  private clock = 0;
  private cell = 40;
  private dpr = 1;
  private running = false;
  paused = false;
  private over = false;
  score = 0; level = 1; lives = 3; fuzzies = 0; homesFilled = 0;

  constructor(private canvas: HTMLCanvasElement, private skin: Skin, private best: number, private hooks: {
    hud: (h: Hud) => void;
    fuzzy: (amount: number) => void;
    over: (r: Result) => void;
  }) {
    this.ctx = canvas.getContext('2d')!;
    this.buildLanes();
    this.resize();
    this.drawFrame();
  }

  // ---------- setup ----------
  private buildLanes(): void {
    const k = 1 + (this.level - 1) * 0.13;
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const lane = (row: number, type: Lane['type'], speed: number, make: () => Obj[]): Lane => ({ row, type, speed: speed * k, objs: make() });
    const spaced = (count: number, len: () => number, gap: () => number, kind: Obj['kind'], color: () => string, sink = false): Obj[] => {
      const out: Obj[] = [];
      let x = rnd(-2, 1);
      for (let i = 0; i < count; i++) {
        const l = len();
        out.push({ x, len: l, kind, color: color(), sink: sink && i % 2 === 0 ? rnd(0, 6) : undefined });
        x += l + gap();
      }
      return out;
    };
    const car = () => CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
    const sinking = this.level >= 3;
    this.lanes = [
      lane(1, 'river', 1.1, () => spaced(4, () => 3, () => rnd(2, 2.6), 'log', () => '#a0673a')),
      lane(2, 'river', -1.5, () => spaced(5, () => 2, () => rnd(1.6, 2.2), 'pad', () => '#5cc96b', sinking)),
      lane(3, 'river', 1.9, () => spaced(3, () => 4, () => rnd(2.4, 3.2), 'log', () => '#8b5a2b')),
      lane(4, 'river', -1.0, () => spaced(5, () => 2, () => rnd(1.4, 2), 'pad', () => '#4fbf62', sinking)),
      lane(5, 'river', 1.4, () => spaced(4, () => 3, () => rnd(1.8, 2.4), 'log', () => '#9c6236')),
      lane(7, 'road', -1.6, () => spaced(3, () => 2, () => rnd(3, 4.5), 'truck', car)),
      lane(8, 'road', 2.2, () => spaced(3, () => 1, () => rnd(3, 4.5), 'car', car)),
      lane(9, 'road', -1.2, () => spaced(4, () => 1, () => rnd(2.4, 3.5), 'car', car)),
      lane(10, 'road', 2.8, () => spaced(2, () => 1, () => rnd(5, 6.5), 'car', car)),
      lane(11, 'road', -0.9, () => spaced(3, () => 1.5, () => rnd(2.6, 3.6), 'bus', car)),
    ];
  }

  resize(): void {
    const r = this.canvas.parentElement!.getBoundingClientRect();
    this.dpr = Math.min(2.5, devicePixelRatio || 1);
    this.cell = Math.max(16, Math.floor(Math.min(r.width / COLS, r.height / ROWS)));
    const w = this.cell * COLS, hh = this.cell * ROWS;
    this.canvas.width = w * this.dpr; this.canvas.height = hh * this.dpr;
    this.canvas.style.width = `${w}px`; this.canvas.style.height = `${hh}px`;
    if (!this.running) this.drawFrame();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.emitHud();
    const loop = (t: number) => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (t - this.last) / 1000);
      this.last = t;
      if (!this.paused && !this.over) this.update(dt);
      this.drawFrame();
    };
    this.raf = requestAnimationFrame(loop);
  }

  setPaused(p: boolean): void { this.paused = p; this.last = performance.now(); }
  destroy(): void { cancelAnimationFrame(this.raf); this.running = false; }

  input(d: Dir): void {
    if (this.paused || this.over || this.dying) return;
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
    sfx.hop();
  }

  // ---------- simulation ----------
  private onRiver(row: number): boolean { return row >= 1 && row <= 5; }
  private laneAt(row: number): Lane | undefined { return this.lanes.find((l) => l.row === row); }
  private sunk(o: Obj): boolean { return o.sink !== undefined && Math.sin(this.clock * 0.9 + o.sink) > 0.82; }

  private update(dt: number): void {
    this.clock += dt;
    const span = COLS + 8;
    for (const l of this.lanes) for (const o of l.objs) {
      o.x += l.speed * dt;
      if (l.speed > 0 && o.x > COLS + 4) o.x -= span;
      if (l.speed < 0 && o.x + o.len < -4) o.x += span;
    }
    for (const t of this.tokens) { if (t.obj) t.x = t.obj.x + t.off!; t.age += dt; }
    this.tokens = this.tokens.filter((t) => t.age < t.life && t.x > -1.5 && t.x < COLS + 0.5);
    this.parts = this.parts.filter((p) => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 6 * dt; return p.life > 0; });

    if (this.dying) {
      this.dying.t += dt;
      if (this.dying.t > 0.9) this.afterDeath();
      return;
    }

    this.timer -= dt;
    if (this.timer <= 0) { this.die('time'); return; }

    // spawn Fuzzies
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) { this.spawnToken(); this.spawnIn = 1.6 + Math.random() * 2.2; }

    if (this.hop) {
      this.hop.t += dt / 0.13;
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
      const on = this.riding(l);
      if (!on) { this.die('splash'); return; }
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

  private riding(l: Lane): Obj | undefined {
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
      const bonus = Math.round(this.timer * 2);
      this.score += 50 + bonus;
      this.give(2, col, GOAL, false);
      this.burst(col + 0.5, 0.5, '#ffd23f', 18);
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
    this.give(5, 5, 6, true);
    this.homes = this.homes.map(() => false);
    sfx.level();
    this.parts.push({ x: COLS / 2, y: ROWS / 2, vx: 0, vy: -0.6, life: 2, max: 2, color: '#fff', text: `LEVEL ${this.level}!`, size: 1.1 });
    this.buildLanes();
    this.tokens = [];
  }

  private spawnToken(): void {
    const max = 3 + Math.min(4, Math.floor(this.level / 2));
    if (this.tokens.length >= max) return;
    const gold = Math.random() < 0.08 + this.level * 0.01;
    const choice = Math.random();
    if (choice < 0.55) {
      // on a road lane or the median, standing still
      const rows = [MEDIAN, 7, 8, 9, 10, 11];
      const row = rows[Math.floor(Math.random() * rows.length)];
      const x = Math.floor(Math.random() * COLS);
      if (this.tokens.some((t) => t.row === row && Math.abs(t.x - x) < 1)) return;
      this.tokens.push({ row, x, gold, age: 0, life: 9 + Math.random() * 4 });
    } else {
      // riding a log or lily pad
      const l = this.lanes.filter((x) => x.type === 'river')[Math.floor(Math.random() * 5)];
      const vis = l.objs.filter((o) => o.x > -1 && o.x < COLS - 1);
      const o = vis[Math.floor(Math.random() * vis.length)];
      if (!o) return;
      const off = Math.floor(Math.random() * o.len);
      this.tokens.push({ row: l.row, x: o.x + off, gold, obj: o, off, age: 0, life: 14 });
    }
  }

  private collectAt(x: number, row: number): void {
    for (const t of this.tokens) {
      if (t.row !== row || Math.abs(t.x - x) > 0.62) continue;
      t.age = t.life; // remove
      const n = t.gold ? 5 : 1;
      this.score += t.gold ? 100 : 25;
      this.give(n, t.x, t.row, t.gold);
      if (t.gold) sfx.gold(); else sfx.collect();
    }
  }

  private give(n: number, x: number, row: number, gold: boolean): void {
    this.fuzzies += n;
    this.hooks.fuzzy(n);
    this.parts.push({ x: x + 0.5, y: row + 0.2, vx: 0, vy: -1.2, life: 1, max: 1, color: gold ? '#ffd23f' : '#ffffff', text: `+${n}`, size: 0.55 });
    this.burst(x + 0.5, row + 0.5, gold ? '#ffd23f' : '#ff7ac2', gold ? 16 : 8);
  }

  private burst(x: number, y: number, color: string, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 3;
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.5, life: 0.6 + Math.random() * 0.4, max: 1, color, size: 0.08 + Math.random() * 0.08 });
    }
  }

  private die(kind: 'splash' | 'crash' | 'bonk' | 'time'): void {
    if (this.dying) return;
    this.dying = { t: 0, kind };
    this.hop = null;
    this.queued = null;
    if (kind === 'splash') { sfx.splash(); this.burst(this.px + 0.5, this.py + 0.5, '#9be7ff', 14); }
    else { sfx.crash(); this.burst(this.px + 0.5, this.py + 0.5, this.skin.colors[0], 14); }
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

  private visualPos(): [number, number, number] {
    if (!this.hop) return [this.px, this.py, 0];
    const t = Math.min(1, this.hop.t);
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    return [this.hop.fx + (this.hop.tx - this.hop.fx) * e, this.hop.fy + (this.hop.ty - this.hop.fy) * e, Math.sin(t * Math.PI)];
  }

  // ---------- drawing ----------
  private drawFrame(): void {
    const c = this.ctx, s = this.cell, W = COLS * s;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const t = this.clock;

    // ground rows
    for (let r = 0; r < ROWS; r++) {
      const y = r * s;
      if (r === GOAL) {
        c.fillStyle = '#2d6a4f'; c.fillRect(0, y, W, s);
        for (let i = 0; i < COLS; i++) { c.fillStyle = i % 2 ? '#40916c' : '#52b788'; c.beginPath(); c.arc(i * s + s / 2, y + s * 0.55, s * 0.42, 0, Math.PI * 2); c.fill(); }
      } else if (this.onRiver(r)) {
        const g = c.createLinearGradient(0, y, 0, y + s);
        g.addColorStop(0, '#2b7fd4'); g.addColorStop(1, '#2370c2');
        c.fillStyle = g; c.fillRect(0, y, W, s);
        c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = Math.max(1, s * 0.04);
        for (let i = 0; i < 4; i++) {
          const wx = ((i * 3.1 + t * (r % 2 ? 0.6 : -0.5) * 1.3) % (COLS + 2) + COLS + 2) % (COLS + 2) - 1;
          c.beginPath(); c.moveTo(wx * s, y + s * (0.3 + (i % 2) * 0.35)); c.quadraticCurveTo((wx + 0.3) * s, y + s * (0.2 + (i % 2) * 0.35), (wx + 0.6) * s, y + s * (0.3 + (i % 2) * 0.35)); c.stroke();
        }
      } else if (r === MEDIAN || r === START) {
        c.fillStyle = r === START ? '#7ccf6b' : '#8bd47a'; c.fillRect(0, y, W, s);
        c.fillStyle = 'rgba(255,255,255,0.5)';
        for (let i = 0; i < COLS; i++) if ((i * 7 + r) % 3 === 0) { c.beginPath(); c.arc(i * s + s * 0.3, y + s * 0.3, s * 0.05, 0, Math.PI * 2); c.fill(); }
        c.fillStyle = 'rgba(255,214,90,0.8)';
        for (let i = 0; i < COLS; i++) if ((i * 5 + r) % 4 === 1) { c.beginPath(); c.arc(i * s + s * 0.7, y + s * 0.72, s * 0.05, 0, Math.PI * 2); c.fill(); }
      } else {
        c.fillStyle = '#3b3b4f'; c.fillRect(0, y, W, s);
        if (r < 11) { c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = Math.max(1, s * 0.05); c.setLineDash([s * 0.4, s * 0.35]); c.beginPath(); c.moveTo(0, y + s); c.lineTo(W, y + s); c.stroke(); c.setLineDash([]); }
      }
    }
    // nests
    HOMES.forEach((col, i) => {
      const x = col * s, y = GOAL * s;
      c.fillStyle = '#2b7fd4';
      c.beginPath(); c.roundRect(x + s * 0.06, y + s * 0.12, s * 0.88, s * 0.88, s * 0.3); c.fill();
      c.fillStyle = '#5cc96b';
      c.beginPath(); c.arc(x + s / 2, y + s * 0.58, s * 0.34, 0.3, Math.PI * 2 - 0.3); c.lineTo(x + s / 2, y + s * 0.58); c.fill();
      if (this.homes[i]) this.drawFuzzy(x + s / 2, y + s * 0.55, s * 0.36, this.skin.colors, 'up', 0, true);
    });

    // lane objects
    for (const l of this.lanes) {
      const y = l.row * s;
      for (const o of l.objs) {
        const x = o.x * s, w = o.len * s;
        if (x > W + s || x + w < -s) continue;
        if (o.kind === 'log') {
          c.fillStyle = '#6b4226'; c.beginPath(); c.roundRect(x + 2, y + s * 0.16, w - 4, s * 0.72, s * 0.3); c.fill();
          c.fillStyle = o.color; c.beginPath(); c.roundRect(x + 2, y + s * 0.12, w - 4, s * 0.68, s * 0.3); c.fill();
          c.strokeStyle = 'rgba(70,40,20,0.45)'; c.lineWidth = Math.max(1, s * 0.04);
          for (let i = 1; i < o.len * 2; i++) { c.beginPath(); c.moveTo(x + i * s * 0.5, y + s * 0.3); c.lineTo(x + i * s * 0.5 + s * 0.2, y + s * 0.3); c.stroke(); }
          c.fillStyle = '#d9a066'; c.beginPath(); c.ellipse(x + w - s * 0.2, y + s * 0.46, s * 0.12, s * 0.28, 0, 0, Math.PI * 2); c.fill();
        } else if (o.kind === 'pad') {
          const sunk = this.sunk(o);
          const warn = o.sink !== undefined && Math.sin(this.clock * 0.9 + o.sink) > 0.55;
          c.globalAlpha = sunk ? 0.18 : warn ? 0.6 + Math.sin(this.clock * 30) * 0.2 : 1;
          for (let i = 0; i < o.len; i++) {
            const cx = x + i * s + s / 2, cy = y + s / 2;
            c.fillStyle = '#2f9e44'; c.beginPath(); c.arc(cx, cy + s * 0.04, s * 0.42, 0.35, Math.PI * 2 - 0.35); c.lineTo(cx, cy); c.fill();
            c.fillStyle = o.color; c.beginPath(); c.arc(cx, cy, s * 0.4, 0.35, Math.PI * 2 - 0.35); c.lineTo(cx, cy); c.fill();
            if (i === 0) { c.fillStyle = '#ffafcc'; c.beginPath(); c.arc(cx - s * 0.12, cy - s * 0.1, s * 0.09, 0, Math.PI * 2); c.fill(); }
          }
          c.globalAlpha = 1;
        } else this.drawVehicle(o, x, y, w, l.speed > 0);
      }
    }

    // tokens
    for (const tk of this.tokens) {
      const fade = tk.life - tk.age < 2 ? 0.4 + 0.6 * Math.abs(Math.sin(tk.age * 10)) : 1;
      c.globalAlpha = fade;
      const bob = Math.sin(t * 5 + tk.x) * s * 0.06;
      this.drawFuzzy(tk.x * s + s / 2, tk.row * s + s / 2 + bob, s * 0.22, tk.gold ? ['#fff3b0', '#e0a100'] : ['#ffb3e0', '#ff4f9a'], 'down', 0, false, tk.gold);
      c.globalAlpha = 1;
    }

    // player
    const [vx, vy, lift] = this.visualPos();
    const d = this.dying;
    if (!d || d.t < 0.45) {
      const cx = vx * s + s / 2, cy = vy * s + s / 2;
      c.fillStyle = 'rgba(0,0,0,0.22)';
      c.beginPath(); c.ellipse(cx, cy + s * 0.32, s * 0.3 * (1 - lift * 0.3), s * 0.1, 0, 0, Math.PI * 2); c.fill();
      const sq = d ? (d.kind === 'splash' ? 1 - d.t * 2 : 1) : 1;
      c.save();
      c.translate(cx, cy - lift * s * 0.35);
      if (d?.kind === 'crash' || d?.kind === 'bonk') c.scale(1 + d.t * 1.2, Math.max(0.15, 1 - d.t * 1.8));
      else c.scale(sq * (1 + lift * 0.08), sq * (1 - lift * 0.08 + (this.hop ? 0.05 : 0)));
      this.drawFuzzy(0, 0, s * 0.4, this.skin.colors, this.facing, t, true);
      c.restore();
    }
    if (d?.kind === 'splash') {
      c.strokeStyle = `rgba(255,255,255,${1 - d.t})`; c.lineWidth = 2;
      for (let i = 0; i < 2; i++) { c.beginPath(); c.arc(this.px * s + s / 2, this.py * s + s / 2, s * (0.2 + d.t * (0.5 + i * 0.3)), 0, Math.PI * 2); c.stroke(); }
    }

    // particles
    for (const p of this.parts) {
      c.globalAlpha = Math.max(0, p.life / p.max);
      if (p.text) {
        c.font = `800 ${Math.round(s * p.size)}px "Fredoka", "Poppins", system-ui, sans-serif`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.lineWidth = Math.max(2, s * 0.08); c.strokeStyle = 'rgba(28,24,48,0.75)';
        c.strokeText(p.text, p.x * s, p.y * s);
        c.fillStyle = p.color; c.fillText(p.text, p.x * s, p.y * s);
      } else { c.fillStyle = p.color; c.beginPath(); c.arc(p.x * s, p.y * s, p.size * s, 0, Math.PI * 2); c.fill(); }
    }
    c.globalAlpha = 1;
  }

  private drawVehicle(o: Obj, x: number, y: number, w: number, right: boolean): void {
    const c = this.ctx, s = this.cell;
    const top = y + s * 0.14, hh = s * 0.72;
    c.fillStyle = '#111';
    for (const wx of o.kind === 'car' ? [0.22, 0.78] : [0.15, 0.5, 0.85]) {
      c.beginPath(); c.roundRect(x + w * wx - s * 0.12, top - s * 0.04, s * 0.24, hh + s * 0.08, s * 0.05); c.fill();
    }
    c.fillStyle = o.color;
    c.beginPath(); c.roundRect(x + s * 0.05, top, w - s * 0.1, hh, s * 0.2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.18)';
    c.beginPath(); c.roundRect(x + s * 0.1, top + s * 0.06, w - s * 0.2, hh * 0.3, s * 0.12); c.fill();
    // windshield toward the direction of travel
    c.fillStyle = 'rgba(30,40,70,0.75)';
    const wsx = right ? x + w - s * 0.42 : x + s * 0.18;
    c.beginPath(); c.roundRect(wsx, top + hh * 0.18, s * 0.24, hh * 0.64, s * 0.06); c.fill();
    if (o.kind !== 'car') {
      c.fillStyle = 'rgba(30,40,70,0.45)';
      for (let i = 0; i < Math.floor(o.len * 2) - 1; i++) { const wx2 = right ? x + s * 0.2 + i * s * 0.42 : x + w - s * 0.44 - i * s * 0.42; if ((right && wx2 < wsx - s * 0.3) || (!right && wx2 > wsx + s * 0.3)) { c.beginPath(); c.roundRect(wx2, top + hh * 0.22, s * 0.24, hh * 0.56, s * 0.05); c.fill(); } }
    }
    c.fillStyle = '#fff6b0';
    const hx = right ? x + w - s * 0.1 : x + s * 0.04;
    c.fillRect(hx, top + hh * 0.12, s * 0.06, hh * 0.18);
    c.fillRect(hx, top + hh * 0.7, s * 0.06, hh * 0.18);
  }

  private drawFuzzy(cx: number, cy: number, r: number, colors: [string, string], facing: Dir, t: number, face: boolean, sparkle = false): void {
    const c = this.ctx;
    const g = c.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, colors[0]); g.addColorStop(1, colors[1]);
    c.fillStyle = g;
    c.beginPath();
    const n = 22;
    for (let i = 0; i <= n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2;
      const rr = i % 2 ? r * (1.12 + Math.sin(t * 8 + i) * 0.03) : r * 0.94;
      const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
      if (i) c.lineTo(px, py); else c.moveTo(px, py);
    }
    c.fill();
    if (sparkle) {
      c.fillStyle = '#fff';
      const a = t * 3 + cx;
      for (let i = 0; i < 2; i++) { c.beginPath(); c.arc(cx + Math.cos(a + i * 3) * r * 1.3, cy + Math.sin(a + i * 3) * r * 1.3, r * 0.13, 0, Math.PI * 2); c.fill(); }
    }
    const lx = facing === 'left' ? -0.12 : facing === 'right' ? 0.12 : 0;
    const ly = facing === 'up' ? -0.1 : facing === 'down' ? 0.08 : 0;
    const er = r * (face ? 0.24 : 0.28);
    for (const sx of [-0.33, 0.33]) {
      c.fillStyle = '#fff';
      c.beginPath(); c.ellipse(cx + sx * r + lx * r, cy - r * 0.1 + ly * r, er, er * 1.15, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#1c1830';
      c.beginPath(); c.arc(cx + sx * r + lx * r * 1.8, cy - r * 0.06 + ly * r * 1.6, er * 0.55, 0, Math.PI * 2); c.fill();
    }
    if (face) {
      c.strokeStyle = '#1c1830'; c.lineWidth = Math.max(1, r * 0.1); c.lineCap = 'round';
      c.beginPath(); c.arc(cx + lx * r, cy + r * 0.28 + ly * r, r * 0.18, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.35)';
      for (const sx of [-0.6, 0.6]) { c.beginPath(); c.arc(cx + sx * r, cy + r * 0.3, r * 0.12, 0, Math.PI * 2); c.fill(); }
    }
  }
}
