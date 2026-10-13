/**
 * Fuzzie Brawl Arena — RULES only (no DOM, no Three.js): a top-down 3v3 battle. Your Fuzzy and two town Fuzzies (blue) against
 * three (pink) in a hedged meadow arena with rocks, low walls, destructible crates and bushes to hide in. Everyone shoots
 * aimed bolts (three charges that reload), fills a special by landing hits (Energy Burst, Bubble Shield, Zoom Dash, Bloom Heal),
 * gets knocked out at 0 HP and pops back at their own gate 3 s later. Points: a knockout = 1, holding the Sunflower ring in the
 * middle alone for 6 s = 1. First to 20 or the higher score when the 2 min 10 s run out wins (a tie → 20 s of sudden overtime,
 * then a draw). The computer Fuzzies path round cover (A* on a 1 m grid), chase, back off to heal, strafe, dodge bolts, hide
 * behind cover to reload, go for the ring and use their specials. Checked without a browser by `adv/brawl-check.ts`.
 */
import { Clock, seeded, type Vec2 } from '../arcade';

export type Role = 'burst' | 'guard' | 'zip' | 'bloom';
export type Team = 0 | 1;
export interface Box { id: number; x: number; z: number; hw: number; hd: number; kind: 'wall' | 'rock' | 'crate' | 'bush'; hp: number }
export interface Fighter {
  id: number; team: Team; role: Role; name: string; skin: [string, string]; you: boolean;
  x: number; z: number; vx: number; vz: number; face: number; hp: number; maxHp: number; ammo: number; cool: number; charge: number;
  alive: boolean; respawn: number; shield: number; dash: number; dashX: number; dashZ: number; hurtAt: number; shotAt: number; hidden: boolean;
  kos: number; deaths: number; dmg: number; healed: number; specials: number; skill: number;
  ai: { goalX: number; goalZ: number; path: { x: number; z: number }[]; replan: number; think: number; strafe: number; strafeT: number; target: number; mode: 'fight' | 'zone' | 'retreat' | 'cover'; aimErr: number; stuck: number; lx: number; lz: number };
}
export interface Shot { id: number; team: Team; by: number; x: number; z: number; dx: number; dz: number; speed: number; left: number; dmg: number; role: Role; alive: boolean }
export interface Pickup { id: number; x: number; z: number; alive: boolean }
export interface BrawlEvent {
  kind: 'shot' | 'hit' | 'ko' | 'respawn' | 'special' | 'blocked' | 'crate' | 'crateBreak' | 'heart' | 'heal' | 'zone' | 'zoneTick' | 'contest' | 'lead' | 'warn' | 'overtime' | 'timeup' | 'win' | 'wall' | 'dodge';
  f?: Fighter; by?: Fighter; shot?: Shot; box?: Box; pickup?: Pickup; team?: Team; dmg?: number; x?: number; z?: number; n?: number; what?: Role; amount?: number;
}
export interface Control { move: Vec2; aim: Vec2 | null; fire: boolean; special: boolean }

export const ARENA = { hw: 11, hd: 15 };
export const LIMIT = 130, OVERTIME = 20, WIN_AT = 20;
export const ZONE = { r: 2.6, hold: 6 };
export const RADIUS = 0.42, RESPAWN = 3, REGEN = { wait: 3, rate: 14 };
export const BUSH_SEE = 2.4; // you see into a bush from this close (or when someone in it just fired)
export interface RoleStats { hp: number; speed: number; dmg: number; range: number; boltSpeed: number; reload: number; pellets: number; spread: number; cool: number; hitsToCharge: number; special: string }
export const ROLES: Record<Role, RoleStats> = {
  burst: { hp: 140, speed: 4.4, dmg: 24, range: 9, boltSpeed: 15, reload: 1.15, pellets: 1, spread: 0, cool: 0.32, hitsToCharge: 4, special: 'Energy Burst' },
  guard: { hp: 190, speed: 4.0, dmg: 12, range: 6, boltSpeed: 13, reload: 1.35, pellets: 3, spread: 0.22, cool: 0.4, hitsToCharge: 9, special: 'Bubble Shield' },
  zip: { hp: 115, speed: 5.2, dmg: 14, range: 8.5, boltSpeed: 17, reload: 0.9, pellets: 2, spread: 0.06, cool: 0.3, hitsToCharge: 7, special: 'Zoom Dash' },
  bloom: { hp: 130, speed: 4.4, dmg: 18, range: 8, boltSpeed: 14, reload: 1.1, pellets: 1, spread: 0, cool: 0.32, hitsToCharge: 4, special: 'Bloom Heal' },
};
export const SPECIAL = { burst: { r: 3.3, dmg: 48, push: 3 }, shield: { time: 3.2, k: 0.3 }, dash: { dist: 5, time: 0.22 }, heal: { r: 4.2, amount: 50 } };
export const SCORING = { win: 600, draw: 250, ko: 120, dmgK: 1, healK: 1, zone: 60, tierNames: ['Victory', 'Draw', 'Close fight', 'Defeat'] };
export const AMMO = 3;

/** the arena: one half, mirrored through the middle so both teams get the same map */
const HALF: [number, number, number, number, Box['kind']][] = [
  [-5.6, 10.6, 1.6, 0.45, 'wall'], [5.6, 10.6, 1.6, 0.45, 'wall'], [0, 7.2, 2.4, 0.45, 'wall'], [-8.6, 4.4, 0.45, 2.0, 'wall'], [8.6, 4.4, 0.45, 2.0, 'wall'],
  [-3.4, 3.4, 0.75, 0.75, 'rock'], [3.6, 2.6, 0.7, 0.7, 'rock'], [-9.6, 11.8, 0.6, 0.6, 'rock'],
  [-1.6, 10.2, 0.5, 0.5, 'crate'], [1.6, 10.2, 0.5, 0.5, 'crate'], [-6.4, 6.6, 0.5, 0.5, 'crate'], [6.4, 7.0, 0.5, 0.5, 'crate'], [-0.6, 4.4, 0.5, 0.5, 'crate'],
  [-8.4, 9, 1.4, 1.2, 'bush'], [8.8, 0.8, 1.1, 1.9, 'bush'], [-5.6, 0.6, 1.3, 1.0, 'bush'], [3.6, 9.4, 1.3, 0.9, 'bush'],
];
export const SPAWN: Record<Team, { x: number; z: number }[]> = {
  0: [{ x: 0, z: 13.2 }, { x: -2.6, z: 12.8 }, { x: 2.6, z: 12.8 }],
  1: [{ x: 0, z: -13.2 }, { x: 2.6, z: -12.8 }, { x: -2.6, z: -12.8 }],
};
const CELL = 0.5, GW = Math.round((ARENA.hw * 2) / CELL), GD = Math.round((ARENA.hd * 2) / CELL);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export interface Roster { name: string; skin: [string, string]; role: Role; skill?: number; you?: boolean }

export class BrawlSim {
  readonly clock = new Clock(LIMIT, [60, 30, 10, 3, 2, 1]);
  state: 'ready' | 'playing' | 'done' = 'ready';
  boxes: Box[] = [];
  fighters: Fighter[] = [];
  shots: Shot[] = [];
  pickups: Pickup[] = [];
  events: BrawlEvent[] = [];
  score: [number, number] = [0, 0];
  zone = { team: -1 as Team | -1, held: 0, contested: false, progress: [0, 0] as [number, number] };
  overtime = false; overT = 0; winner: Team | -1 | null = null;
  time = 0;
  /** tests / demo: the player's Fuzzy is driven by the computer too */
  autopilot = false;
  private flip = false;
  private rnd: () => number;
  private nid = 0;
  private grid = new Uint8Array(GW * GD);
  private lead: Team | -1 = -1;

  constructor(blue: Roster[], pink: Roster[], seed = 7) {
    this.rnd = seeded(seed);
    for (const [x, z, hw, hd, kind] of HALF) for (const s of [1, -1]) this.boxes.push({ id: this.nid++, x: x * s, z: z * s, hw, hd, kind, hp: kind === 'crate' ? 70 : 0 });
    const add = (r: Roster, team: Team, i: number) => {
      const st = ROLES[r.role]; const sp = SPAWN[team][i % 3];
      this.fighters.push({ id: this.fighters.length, team, role: r.role, name: r.name, skin: r.skin, you: !!r.you, x: sp.x, z: sp.z, vx: 0, vz: 0, face: team === 0 ? Math.PI : 0,
        hp: st.hp, maxHp: st.hp, ammo: AMMO, cool: 0, charge: 0, alive: true, respawn: 0, shield: 0, dash: 0, dashX: 0, dashZ: 0, hurtAt: -9, shotAt: -9, hidden: false,
        kos: 0, deaths: 0, dmg: 0, healed: 0, specials: 0, skill: r.skill ?? 0.7,
        ai: { goalX: sp.x, goalZ: sp.z, path: [], replan: 0, think: 0, strafe: 1, strafeT: 0, target: -1, mode: 'zone', aimErr: 0, stuck: 0, lx: sp.x, lz: sp.z } });
    };
    blue.forEach((r, i) => add(r, 0, i)); pink.forEach((r, i) => add(r, 1, i));
    this.buildGrid();
  }
  start(): void { if (this.state === 'ready') this.state = 'playing'; }
  get you(): Fighter | undefined { return this.fighters.find((f) => f.you); }
  get k(): number { return this.clock.k; }
  get left(): number { return this.overtime ? Math.max(0, OVERTIME - this.overT) : this.clock.left; }

  // ---------------------------------------------------------------- geometry
  private solid(b: Box): boolean { return b.kind !== 'bush' && (b.kind !== 'crate' || b.hp > 0); }
  /** inside a box grown by r */
  private inBox(b: Box, x: number, z: number, r = 0): boolean { return Math.abs(x - b.x) <= b.hw + r && Math.abs(z - b.z) <= b.hd + r; }
  blockedAt(x: number, z: number, r = 0): boolean { if (Math.abs(x) > ARENA.hw - r || Math.abs(z) > ARENA.hd - r) return true; return this.boxes.some((b) => this.solid(b) && this.inBox(b, x, z, r)); }
  bushAt(x: number, z: number): Box | undefined { return this.boxes.find((b) => b.kind === 'bush' && this.inBox(b, x, z, -0.1)); }
  /** the first solid box a segment hits (slab test), and where */
  rayBox(x0: number, z0: number, x1: number, z1: number): { box: Box; t: number } | null {
    let best: { box: Box; t: number } | null = null; const dx = x1 - x0, dz = z1 - z0;
    for (const b of this.boxes) {
      if (!this.solid(b)) continue;
      let t0 = 0, t1 = 1;
      for (const [p, d, lo, hi] of [[x0, dx, b.x - b.hw, b.x + b.hw], [z0, dz, b.z - b.hd, b.z + b.hd]] as [number, number, number, number][]) {
        if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) { t0 = 2; break; } continue; }
        let a = (lo - p) / d, c = (hi - p) / d; if (a > c) [a, c] = [c, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, c); if (t0 > t1) break;
      }
      if (t0 <= t1 && t0 <= 1 && (!best || t0 < best.t)) best = { box: b, t: t0 };
    }
    return best;
  }
  los(a: { x: number; z: number }, b: { x: number; z: number }): boolean { return !this.rayBox(a.x, a.z, b.x, b.z); }
  /** can `a` see `b` (line of sight, and bushes hide unless close or b just fired) */
  sees(a: Fighter, b: Fighter): boolean {
    if (!b.alive) return false;
    const d = Math.hypot(a.x - b.x, a.z - b.z);
    if (b.hidden && d > BUSH_SEE && this.time - b.shotAt > 1) return false;
    return this.los(a, b);
  }
  private buildGrid(): void {
    for (let gz = 0; gz < GD; gz++) for (let gx = 0; gx < GW; gx++) { const x = -ARENA.hw + (gx + 0.5) * CELL, z = -ARENA.hd + (gz + 0.5) * CELL; this.grid[gz * GW + gx] = this.blockedAt(x, z, RADIUS + 0.05) ? 1 : 0; }
  }
  private cellOf(x: number, z: number): [number, number] { return [clamp(Math.floor((x + ARENA.hw) / CELL), 0, GW - 1), clamp(Math.floor((z + ARENA.hd) / CELL), 0, GD - 1)]; }
  /** A* on the half-metre grid, 8 directions, no corner cutting; the path is smoothed by line of sight */
  path(x0: number, z0: number, x1: number, z1: number): { x: number; z: number }[] {
    const [sx, sz] = this.cellOf(x0, z0); let [tx, tz] = this.cellOf(x1, z1);
    if (this.grid[tz * GW + tx]) { // the goal is inside something: nearest open cell
      let bd = 1e9, bx = tx, bz = tz; for (let r = 1; r < 6 && bd === 1e9; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { const cx = tx + dx, cz = tz + dz; if (cx < 0 || cz < 0 || cx >= GW || cz >= GD || this.grid[cz * GW + cx]) continue; const d = dx * dx + dz * dz; if (d < bd) { bd = d; bx = cx; bz = cz; } }
      tx = bx; tz = bz;
    }
    const N = GW * GD, g = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const open: number[] = []; const start = sz * GW + sx, goal = tz * GW + tx; g[start] = 0; open.push(start);
    const h = (i: number) => { const cx = i % GW, cz = (i / GW) | 0; const ax = Math.abs(cx - tx), az = Math.abs(cz - tz); return Math.max(ax, az) + 0.414 * Math.min(ax, az); };
    let iter = 0;
    while (open.length && iter++ < 4000) {
      let bi = 0, bf = 1e9; for (let i = 0; i < open.length; i++) { const f = g[open[i]] + h(open[i]); if (f < bf) { bf = f; bi = i; } }
      const cur = open[bi]; open[bi] = open[open.length - 1]; open.pop(); if (cur === goal) break; if (closed[cur]) continue; closed[cur] = 1;
      const cx = cur % GW, cz = (cur / GW) | 0;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue; const nx = cx + dx, nz = cz + dz; if (nx < 0 || nz < 0 || nx >= GW || nz >= GD) continue;
        const ni = nz * GW + nx; if (this.grid[ni] || closed[ni]) continue;
        if (dx && dz && (this.grid[cz * GW + nx] || this.grid[nz * GW + cx])) continue;
        const ng = g[cur] + (dx && dz ? 1.414 : 1); if (ng < g[ni]) { g[ni] = ng; from[ni] = cur; open.push(ni); }
      }
    }
    if (from[goal] < 0 && goal !== start) return [{ x: x1, z: z1 }];
    const cells: { x: number; z: number }[] = []; for (let c = goal; c !== start && c >= 0; c = from[c]) cells.push({ x: -ARENA.hw + ((c % GW) + 0.5) * CELL, z: -ARENA.hd + (((c / GW) | 0) + 0.5) * CELL });
    cells.reverse();
    // smooth: skip to the furthest waypoint we can walk to straight
    const out: { x: number; z: number }[] = []; let px = x0, pz = z0, i = 0;
    while (i < cells.length) { let j = cells.length - 1; while (j > i && !this.clearWalk(px, pz, cells[j].x, cells[j].z)) j--; out.push(cells[j]); px = cells[j].x; pz = cells[j].z; i = j + 1; }
    if (out.length && !this.grid[this.cellOf(x1, z1)[1] * GW + this.cellOf(x1, z1)[0]]) out[out.length - 1] = { x: x1, z: z1 };
    return out;
  }
  private clearWalk(x0: number, z0: number, x1: number, z1: number): boolean {
    const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.25);
    for (let i = 1; i <= n; i++) { const t = i / n; if (this.blockedAt(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, RADIUS)) return false; }
    return true;
  }

  // ---------------------------------------------------------------- actions
  /** fire along (dx, dz); false when out of charges / cooling down */
  fire(f: Fighter, dx: number, dz: number): boolean {
    if (!f.alive || f.ammo < 1 || f.cool > 0 || f.dash > 0 || this.state !== 'playing') return false;
    const st = ROLES[f.role]; const len = Math.hypot(dx, dz) || 1; const base = Math.atan2(dx / len, dz / len);
    f.ammo -= 1; f.cool = st.cool; f.face = base; f.shotAt = this.time;
    for (let i = 0; i < st.pellets; i++) {
      const off = st.pellets > 1 ? (i - (st.pellets - 1) / 2) * st.spread : 0; const an = base + off;
      const s: Shot = { id: this.nid++, team: f.team, by: f.id, x: f.x + Math.sin(an) * 0.5, z: f.z + Math.cos(an) * 0.5, dx: Math.sin(an), dz: Math.cos(an), speed: st.boltSpeed, left: st.range - 0.5, dmg: st.dmg, role: f.role, alive: true };
      // zip's two bolts go one after the other
      if (f.role === 'zip' && i === 1) { s.x -= s.dx * 0.7; s.z -= s.dz * 0.7; s.left += 0.7; }
      this.shots.push(s); if (i === 0) this.events.push({ kind: 'shot', f, shot: s });
    }
    return true;
  }
  /** the special: burst / shield / dash (towards dx, dz) / heal — needs a full charge */
  special(f: Fighter, dx = 0, dz = 0): boolean {
    if (!f.alive || f.charge < 1 || this.state !== 'playing') return false;
    f.charge = 0; f.specials++; this.events.push({ kind: 'special', f, what: f.role });
    if (f.role === 'burst') {
      for (const e of this.fighters) if (e.team !== f.team && e.alive) { const d = Math.hypot(e.x - f.x, e.z - f.z); if (d < SPECIAL.burst.r) { this.damage(e, f, SPECIAL.burst.dmg, false); if (e.alive && d > 0.01) { this.moveBy(e, (e.x - f.x) / d * SPECIAL.burst.push, (e.z - f.z) / d * SPECIAL.burst.push); } } }
      for (const b of this.boxes) if (b.kind === 'crate' && b.hp > 0 && Math.hypot(b.x - f.x, b.z - f.z) < SPECIAL.burst.r + 0.4) this.hitCrate(b, 999);
    } else if (f.role === 'guard') { f.shield = SPECIAL.shield.time; this.heal(f, f, 20); }
    else if (f.role === 'zip') { const l = Math.hypot(dx, dz); const ax = l > 0.1 ? dx / l : Math.sin(f.face), az = l > 0.1 ? dz / l : Math.cos(f.face); f.dash = SPECIAL.dash.time; f.dashX = ax * SPECIAL.dash.dist / SPECIAL.dash.time; f.dashZ = az * SPECIAL.dash.dist / SPECIAL.dash.time; f.face = Math.atan2(ax, az); f.ammo = Math.min(AMMO, f.ammo + 1); }
    else { for (const a of this.fighters) if (a.team === f.team && a.alive && Math.hypot(a.x - f.x, a.z - f.z) < SPECIAL.heal.r) this.heal(a, f, SPECIAL.heal.amount); }
    return true;
  }
  private heal(a: Fighter, by: Fighter, n: number): void { const before = a.hp; a.hp = Math.min(a.maxHp, a.hp + n); if (a.hp > before) { by.healed += a.hp - before; this.events.push({ kind: 'heal', f: a, by, amount: Math.round(a.hp - before) }); } }
  private damage(t: Fighter, by: Fighter, dmg: number, charges = true): void {
    if (!t.alive || t.dash > 0) return;
    const real = Math.round(dmg * (t.shield > 0 ? SPECIAL.shield.k : 1));
    t.hp -= real; t.hurtAt = this.time; by.dmg += real;
    if (charges) by.charge = Math.min(1, by.charge + 1 / ROLES[by.role].hitsToCharge);
    this.events.push({ kind: 'hit', f: t, by, dmg: real, x: t.x, z: t.z });
    if (t.hp <= 0) {
      t.hp = 0; t.alive = false; t.respawn = RESPAWN; t.deaths++; by.kos++; t.shield = 0; t.ai.path = [];
      this.score[by.team]++; this.events.push({ kind: 'ko', f: t, by, x: t.x, z: t.z });
      this.checkLead();
    }
  }
  private hitCrate(b: Box, dmg: number): void {
    b.hp -= dmg; this.events.push({ kind: 'crate', box: b });
    if (b.hp <= 0) { b.hp = 0; this.events.push({ kind: 'crateBreak', box: b }); this.buildGrid(); if (this.rnd() < 0.55) { const p = { id: this.nid++, x: b.x, z: b.z, alive: true }; this.pickups.push(p); this.events.push({ kind: 'heart', pickup: p }); } }
  }
  private moveBy(f: Fighter, dx: number, dz: number): void {
    const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.2));
    for (let i = 0; i < n; i++) { const nx = f.x + dx / n, nz = f.z + dz / n; if (!this.blockedAt(nx, f.z, RADIUS)) f.x = nx; if (!this.blockedAt(f.x, nz, RADIUS)) f.z = nz; }
  }
  private checkLead(): void { const l: Team | -1 = this.score[0] > this.score[1] ? 0 : this.score[1] > this.score[0] ? 1 : -1; if (l !== this.lead) { this.lead = l; if (l !== -1) this.events.push({ kind: 'lead', team: l }); } }

  // ---------------------------------------------------------------- the step
  /** one fixed step; `you` = the player's controls (ignored when there is no player) */
  step(dt: number, you?: Control): void {
    this.events.length = 0;
    if (this.state !== 'playing') return;
    this.time += dt;
    if (!this.overtime) {
      const w = this.clock.step(dt);
      if (typeof w === 'number') this.events.push({ kind: 'warn', n: w });
      if (w === 'timeup') {
        if (this.score[0] === this.score[1]) { this.overtime = true; this.overT = 0; this.events.push({ kind: 'overtime' }); }
        else return this.end(this.score[0] > this.score[1] ? 0 : 1);
      }
    } else { this.overT += dt; if (this.overT >= OVERTIME) return this.end(-1); }
    // everyone: timers, respawn, regen, bushes
    for (const f of this.fighters) {
      f.cool = Math.max(0, f.cool - dt); f.shield = Math.max(0, f.shield - dt);
      if (!f.alive) { f.respawn -= dt; if (f.respawn <= 0) this.respawn(f); continue; }
      f.ammo = Math.min(AMMO, f.ammo + dt / ROLES[f.role].reload);
      if (this.time - f.hurtAt > REGEN.wait && this.time - f.shotAt > REGEN.wait * 0.7 && f.hp < f.maxHp) f.hp = Math.min(f.maxHp, f.hp + REGEN.rate * dt);
      f.hidden = !!this.bushAt(f.x, f.z);
    }
    // control: you, then the computer Fuzzies (the order flips every step so neither team always acts first)
    this.flip = !this.flip; const order = this.flip ? this.fighters : [...this.fighters].reverse();
    for (const f of order) {
      if (!f.alive) continue;
      let move: Vec2 = { x: 0, z: 0 };
      if (f.you && !this.autopilot) { if (you) { move = you.move; if (you.fire && you.aim) this.fire(f, you.aim.x, you.aim.z); if (you.special) this.special(f, you.aim?.x ?? Math.sin(f.face), you.aim?.z ?? Math.cos(f.face)); } }
      else move = this.think(f, dt);
      this.walk(f, move, dt);
    }
    // keep fighters from stacking
    for (let i = 0; i < this.fighters.length; i++) for (let j = i + 1; j < this.fighters.length; j++) {
      const a = this.fighters[i], b = this.fighters[j]; if (!a.alive || !b.alive) continue;
      const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), m = RADIUS * 2;
      if (d < m && d > 1e-6) { const p = (m - d) / 2; this.moveBy(a, -dx / d * p, -dz / d * p); this.moveBy(b, dx / d * p, dz / d * p); }
    }
    this.moveShots(dt);
    // hearts
    for (const p of this.pickups) if (p.alive) for (const f of this.fighters) if (f.alive && Math.hypot(f.x - p.x, f.z - p.z) < 0.8 && f.hp < f.maxHp) { p.alive = false; this.heal(f, f, 35); this.events.push({ kind: 'heart', pickup: p, f }); break; }
    this.pickups = this.pickups.filter((p) => p.alive);
    this.zoneStep(dt);
    if (this.score[0] >= WIN_AT || this.score[1] >= WIN_AT) return this.end(this.score[0] >= WIN_AT ? 0 : 1);
    if (this.overtime && this.score[0] !== this.score[1]) return this.end(this.score[0] > this.score[1] ? 0 : 1);
  }
  private end(w: Team | -1): void { this.winner = w; this.state = 'done'; this.events.push({ kind: 'timeup' }, { kind: 'win', team: w === -1 ? undefined : w }); }
  private respawn(f: Fighter): void {
    const sp = SPAWN[f.team][f.id % 3]; f.x = sp.x; f.z = sp.z; f.hp = f.maxHp; f.alive = true; f.ammo = AMMO; f.respawn = 0; f.shield = 1.2; f.dash = 0; f.ai.path = []; f.ai.mode = 'zone'; f.ai.stuck = 0;
    this.events.push({ kind: 'respawn', f });
  }
  private walk(f: Fighter, move: Vec2, dt: number): void {
    if (f.dash > 0) { const t = Math.min(dt, f.dash); f.dash -= dt; this.moveBy(f, f.dashX * t, f.dashZ * t); const k = f.dash > 0 ? 1 : 0.12; f.vx = f.dashX * k; f.vz = f.dashZ * k; return; }
    let mx = move.x || 0, mz = move.z || 0; const l = Math.hypot(mx, mz); if (l > 1) { mx /= l; mz /= l; }
    const sp = ROLES[f.role].speed; const tx = mx * sp, tz = mz * sp; const k = Math.min(1, dt * 14);
    f.vx += (tx - f.vx) * k; f.vz += (tz - f.vz) * k;
    const x0 = f.x, z0 = f.z; this.moveBy(f, f.vx * dt, f.vz * dt);
    if (Math.abs(f.x - x0) < 1e-4 && Math.abs(f.vx) > 0.5) f.vx *= 0.5; if (Math.abs(f.z - z0) < 1e-4 && Math.abs(f.vz) > 0.5) f.vz *= 0.5;
    if (l > 0.2 && this.time - f.shotAt > 0.4) f.face = Math.atan2(mx, mz);
  }
  private moveShots(dt: number): void {
    for (const s of this.shots) {
      if (!s.alive) continue;
      const step = Math.min(s.left, s.speed * dt); const nx = s.x + s.dx * step, nz = s.z + s.dz * step;
      // fighters first (closest along the segment)
      let hitF: Fighter | null = null, hitT = 2;
      for (const f of this.fighters) {
        if (f.team === s.team || !f.alive || f.dash > 0) continue;
        const ex = f.x - s.x, ez = f.z - s.z; const t = clamp((ex * s.dx + ez * s.dz) / Math.max(1e-6, step), 0, 1);
        const px = s.x + s.dx * step * t, pz = s.z + s.dz * step * t; if (Math.hypot(f.x - px, f.z - pz) < RADIUS + 0.12 && t < hitT) { hitT = t; hitF = f; }
      }
      const wall = this.rayBox(s.x, s.z, nx, nz);
      if (wall && (!hitF || wall.t < hitT)) {
        s.alive = false; const wx = s.x + (nx - s.x) * wall.t, wz = s.z + (nz - s.z) * wall.t;
        if (wall.box.kind === 'crate') this.hitCrate(wall.box, s.dmg); else this.events.push({ kind: 'wall', shot: s, x: wx, z: wz, box: wall.box });
        continue;
      }
      if (hitF) { s.alive = false; const by = this.fighters[s.by]; this.damage(hitF, by, s.dmg); continue; }
      s.x = nx; s.z = nz; s.left -= step; if (s.left <= 0.01) s.alive = false;
    }
    this.shots = this.shots.filter((s) => s.alive);
  }
  private zoneStep(dt: number): void {
    const inside = [0, 0]; for (const f of this.fighters) if (f.alive && Math.hypot(f.x, f.z) < ZONE.r) inside[f.team]++;
    const contested = inside[0] > 0 && inside[1] > 0; if (contested && !this.zone.contested) this.events.push({ kind: 'contest' }); this.zone.contested = contested;
    const t: Team | -1 = contested ? -1 : inside[0] ? 0 : inside[1] ? 1 : -1;
    if (t !== this.zone.team && t !== -1) { this.zone.team = t; this.events.push({ kind: 'zone', team: t }); }
    if (t === -1) { if (!contested) this.zone.team = -1; return; }
    this.zone.progress[t] += dt; this.zone.progress[t === 0 ? 1 : 0] = Math.max(0, this.zone.progress[t === 0 ? 1 : 0] - dt * 2);
    if (this.zone.progress[t] >= ZONE.hold) { this.zone.progress[t] = 0; this.score[t]++; this.events.push({ kind: 'zoneTick', team: t }); for (const f of this.fighters) if (f.alive && f.team === t && Math.hypot(f.x, f.z) < ZONE.r) f.charge = Math.min(1, f.charge + 0.25); this.checkLead(); }
  }

  // ---------------------------------------------------------------- the computer Fuzzies
  private enemiesOf(f: Fighter): Fighter[] { return this.fighters.filter((e) => e.team !== f.team && e.alive); }
  private think(f: Fighter, dt: number): Vec2 {
    const ai = f.ai; const st = ROLES[f.role];
    ai.think -= dt; ai.replan -= dt; ai.strafeT -= dt;
    // stuck watch: no progress while trying to move → plan again
    const moved = Math.hypot(f.x - ai.lx, f.z - ai.lz); ai.lx = f.x; ai.lz = f.z; ai.stuck = moved < 0.01 && ai.path.length ? ai.stuck + dt : 0; if (ai.stuck > 0.6) { ai.path = []; ai.replan = 0; ai.stuck = 0; ai.strafe = -ai.strafe; }
    const foes = this.enemiesOf(f).filter((e) => this.sees(f, e));
    const tgt = ai.target >= 0 ? this.fighters[ai.target] : undefined;
    if (ai.think <= 0) {
      ai.think = 0.18 + (1 - f.skill) * 0.25 + this.rnd() * 0.08;
      // pick a target: the closest seen, weakest breaks ties
      let best: Fighter | undefined, bs = 1e9;
      for (const e of foes) { const d = Math.hypot(e.x - f.x, e.z - f.z); const s = d + e.hp / e.maxHp * 2.5 - (e.id === ai.target ? 1.5 : 0); if (d < 12 && s < bs) { bs = s; best = e; } }
      ai.target = best ? best.id : -1;
      const hpK = f.hp / f.maxHp;
      if (ai.mode === 'retreat') { if (hpK > 0.85) ai.mode = 'zone'; }
      else if (hpK < 0.32 && (this.time - f.hurtAt < 2)) ai.mode = 'retreat';
      if (ai.mode !== 'retreat') ai.mode = best ? (f.ammo < 0.6 && Math.hypot(best.x - f.x, best.z - f.z) < st.range ? 'cover' : 'fight') : 'zone';
      ai.aimErr = (this.rnd() - 0.5) * (1 - f.skill) * 0.55;
      // specials
      if (f.charge >= 1) this.aiSpecial(f, foes);
    }
    const target = ai.target >= 0 ? this.fighters[ai.target] : tgt;
    // shoot: aim with lead, a little error by skill
    if (target && target.alive && this.sees(f, target)) {
      const d = Math.hypot(target.x - f.x, target.z - f.z);
      if (d < st.range * 0.98 && f.ammo >= 1 && f.cool <= 0 && (ai.mode !== 'retreat' || d < st.range * 0.6) && this.rnd() < 0.35 + f.skill * 0.6) {
        const tt = d / st.boltSpeed * (0.4 + f.skill * 0.6); const px = target.x + target.vx * tt, pz = target.z + target.vz * tt;
        const an = Math.atan2(px - f.x, pz - f.z) + ai.aimErr; if (this.los(f, { x: px, z: pz }) || this.los(f, target)) this.fire(f, Math.sin(an), Math.cos(an));
      }
    }
    // dodge: a bolt about to hit → step sideways
    if (f.skill > 0.3) for (const s of this.shots) {
      if (s.team === f.team) continue; const ex = f.x - s.x, ez = f.z - s.z; const along = ex * s.dx + ez * s.dz; if (along < 0 || along > 4.5) continue;
      const side = ex * s.dz - ez * s.dx; if (Math.abs(side) < 0.75 && this.rnd() < f.skill * 0.12) { const dir = side >= 0 ? 1 : -1; this.events.push({ kind: 'dodge', f }); return { x: s.dz * dir, z: -s.dx * dir }; }
    }
    // where to go
    let gx = ai.goalX, gz = ai.goalZ;
    const home = SPAWN[f.team][f.id % 3];
    if (ai.mode === 'retreat') { gx = home.x; gz = home.z + (f.team === 0 ? -1.5 : 1.5); }
    else if (ai.mode === 'cover' && target) { const c = this.coverFrom(f, target); gx = c.x; gz = c.z; }
    else if (ai.mode === 'fight' && target) {
      const dx = target.x - f.x, dz = target.z - f.z, d = Math.hypot(dx, dz) || 1; const want = st.range * (f.role === 'guard' ? 0.55 : 0.72);
      if (ai.strafeT <= 0) { ai.strafeT = 0.7 + this.rnd() * 1.2; if (this.rnd() < 0.5) ai.strafe = -ai.strafe; }
      const back = d - want; const sx = -dz / d * ai.strafe, sz = dx / d * ai.strafe;
      if (this.los(f, target)) { // in sight: hold range and strafe, straight steering (no path needed)
        let mx = dx / d * clamp(back, -1, 1) * 0.9 + sx * 0.75, mz = dz / d * clamp(back, -1, 1) * 0.9 + sz * 0.75;
        if (this.blockedAt(f.x + mx * 0.6, f.z + mz * 0.6, RADIUS)) { ai.strafe = -ai.strafe; mx = dx / d * clamp(back, -1, 1); mz = dz / d * clamp(back, -1, 1); }
        ai.path = []; return { x: mx, z: mz };
      }
      gx = target.x; gz = target.z;
    } else { // the ring (each Fuzzy has its own spot in it)
      const an = f.id * 2.1 + (f.team ? Math.PI : 0); gx = Math.sin(an) * 1.2; gz = Math.cos(an) * 1.2;
    }
    if (ai.replan <= 0 || Math.hypot(gx - ai.goalX, gz - ai.goalZ) > 1.5 || !ai.path.length) { ai.goalX = gx; ai.goalZ = gz; ai.path = this.path(f.x, f.z, gx, gz); ai.replan = 0.6 + this.rnd() * 0.3; }
    while (ai.path.length && Math.hypot(ai.path[0].x - f.x, ai.path[0].z - f.z) < 0.35) ai.path.shift();
    const w = ai.path[0]; if (!w) return { x: 0, z: 0 };
    const dx = w.x - f.x, dz = w.z - f.z, d = Math.hypot(dx, dz) || 1; const slow = ai.mode === 'zone' && !ai.path[1] && d < 0.6 ? d / 0.6 : 1;
    return { x: dx / d * slow, z: dz / d * slow };
  }
  /** a spot behind the solid box nearest to me, on the far side from the threat */
  private coverFrom(f: Fighter, t: Fighter): { x: number; z: number } {
    let best = { x: f.x, z: f.z }, bd = 1e9;
    for (const b of this.boxes) {
      if (!this.solid(b)) continue; const dx = b.x - t.x, dz = b.z - t.z, d = Math.hypot(dx, dz) || 1;
      const cx = b.x + dx / d * (Math.max(b.hw, b.hd) + 0.9), cz = b.z + dz / d * (Math.max(b.hw, b.hd) + 0.9);
      if (this.blockedAt(cx, cz, RADIUS)) continue; const c = Math.hypot(cx - f.x, cz - f.z); if (c < bd && c < 7) { bd = c; best = { x: cx, z: cz }; }
    }
    return best;
  }
  private aiSpecial(f: Fighter, foes: Fighter[]): void {
    const near = (r: number) => foes.filter((e) => Math.hypot(e.x - f.x, e.z - f.z) < r);
    if (f.role === 'burst') { const n = near(SPECIAL.burst.r - 0.3); if (n.length >= 2 || (n.length === 1 && n[0].hp < SPECIAL.burst.dmg * 1.2)) this.special(f); }
    else if (f.role === 'guard') { if (this.time - f.hurtAt < 0.6 && f.hp < f.maxHp * 0.65) this.special(f); }
    else if (f.role === 'zip') {
      const t = f.ai.target >= 0 ? this.fighters[f.ai.target] : undefined;
      if (f.ai.mode === 'retreat') { const h = SPAWN[f.team][0]; this.special(f, h.x - f.x, h.z - f.z); }
      else if (t && t.hp < t.maxHp * 0.5) { const d = Math.hypot(t.x - f.x, t.z - f.z); if (d > 3 && d < 7) this.special(f, t.x - f.x, t.z - f.z); }
    } else { const hurt = this.fighters.filter((a) => a.team === f.team && a.alive && Math.hypot(a.x - f.x, a.z - f.z) < SPECIAL.heal.r && a.hp < a.maxHp * 0.55); if (hurt.length) this.special(f); }
  }

  // ---------------------------------------------------------------- the end
  place(): number {
    const y = this.you; if (this.winner === null) return 4; if (this.winner === -1) return 2; if (y && this.winner === y.team) return 1;
    const diff = Math.abs(this.score[0] - this.score[1]); return (y && y.kos >= 3) || diff <= 2 ? 3 : 4;
  }
  points(): number {
    const y = this.you; if (!y) return 0; const w = this.winner;
    return Math.round((w === y.team ? SCORING.win : w === -1 ? SCORING.draw : 0) + y.kos * SCORING.ko + y.dmg * SCORING.dmgK + y.healed * SCORING.healK);
  }
  result(): { place: number; score: number; timeMs: number; tier: string; title: string; stats: { label: string; value: string }[]; standings: { name: string; score: number; you: boolean; place: number }[] } {
    const place = this.place(); const y = this.you!;
    const ranked = [...this.fighters].sort((a, b) => (b.kos * 3 + b.dmg / 60 + b.healed / 80) - (a.kos * 3 + a.dmg / 60 + a.healed / 80));
    const mvp = ranked[0];
    return {
      place, score: this.points(), timeMs: Math.round((this.clock.time + this.overT) * 1000), tier: SCORING.tierNames[place - 1],
      title: this.winner === -1 ? 'Draw!' : this.winner === y.team ? 'Victory!' : 'Defeat',
      stats: [{ label: 'Score', value: `${this.score[0]} – ${this.score[1]}` }, { label: 'Knockouts', value: String(y.kos) }, { label: 'Damage', value: String(Math.round(y.dmg)) }, { label: 'Times KO’d', value: String(y.deaths) }, { label: 'MVP', value: mvp.you ? 'You!' : mvp.name }],
      standings: [],
    };
  }
}
