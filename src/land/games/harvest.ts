/**
 * Farm Harvest Rush — RULES only (no DOM, no Three.js): a fenced field of 4 rows × 6 plants. Plants ripen in waves (mostly along
 * a row), glow while ripe, and wilt if nobody picks them in time. Walk up to a glowing plant and PICK: a fresh pick (first
 * seconds of ripeness) is 25, a ripe one 15, a green one is refused and costs a moment, a wilted one is lost. Picked and
 * wilted plants grow back. 100 seconds. Checked without a browser by `adv/harvest-check.ts`.
 */
import { Clock, Mover, seeded, tierPlace, type Obstacle, type Vec2 } from '../arcade';

export type PlantState = 'green' | 'ripe' | 'wilted' | 'picked';
export type Crop = 'carrot' | 'tomato' | 'pumpkin' | 'corn';
export interface Plant { id: number; row: number; col: number; x: number; z: number; crop: Crop; state: PlantState; t: number; ripeFor: number }
export interface HarvestEvent { kind: 'ripe' | 'wave' | 'pick' | 'early' | 'wilt' | 'regrow' | 'warn' | 'timeup' | 'bump'; plant?: Plant; value?: number; fresh?: boolean; n?: number }

export const SCORING = {
  ripe: 15, fresh: 25,
  tiers: [1250, 750, 250] as [number, number, number],
  tierNames: ['Harvest hero', 'Green paws', 'Field hand', 'Still sowing'],
};
export const LIMIT = 100;
export const ROWS = 4; export const COLS = 6;
export const ROW_GAP = 2.6; export const COL_GAP = 1.9;
export const FIELD = { hw: (COLS * COL_GAP) / 2 + 2.2, hd: (ROWS * ROW_GAP) / 2 + 2.6 };
export const PICK_R = 1.15;
export const PICK_TIME = 0.45;
export const FRESH = 3;
export const RIPE_TIME = 9;
export const REGROW: [number, number] = [10, 16];
export const WILT_REST = 8;
export const WAVE: [number, number] = [6.5, 9];
export const MOVE = { accel: 32, max: 4.8, friction: 6, turn: 10, radius: 0.32 };
const CROPS: Crop[] = ['carrot', 'tomato', 'pumpkin', 'corn'];

export class HarvestSim {
  readonly clock = new Clock(LIMIT);
  readonly plants: Plant[] = [];
  readonly obstacles: Obstacle[] = [];
  readonly you: Mover;
  state: 'ready' | 'playing' | 'done' = 'ready';
  score = 0; picked = 0; freshPicks = 0; wilted = 0; early = 0; waves = 0;
  /** seconds left in the current pick (0 = free) and the plant being picked */
  picking = 0; target: Plant | null = null;
  /** tap-to-walk: where you're heading, and the plant you tapped (picked on arrival if it's ripe) */
  goal: Vec2 | null = null; goalPlant: Plant | null = null;
  private stuck = 0;
  events: HarvestEvent[] = [];
  private rnd: () => number;
  private waveT = 1.5; private bumpCool = 0;

  constructor(_variant: string | null | undefined, seed = 7) {
    this.rnd = seeded(seed);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const x = (c - (COLS - 1) / 2) * COL_GAP, z = (r - (ROWS - 1) / 2) * ROW_GAP;
      this.plants.push({ id: r * COLS + c, row: r, col: c, x, z, crop: CROPS[r], state: 'green', t: 0, ripeFor: 0 });
      this.obstacles.push({ kind: 'circle', x, z, r: 0.42 });
    }
    // a water trough and a scarecrow to walk round
    this.obstacles.push({ kind: 'box', x: FIELD.hw - 1.4, z: 0, hw: 0.5, hd: 1.1 });
    this.obstacles.push({ kind: 'circle', x: -FIELD.hw + 1.3, z: -FIELD.hd + 1.6, r: 0.35 });
    this.you = new Mover({ ...MOVE, bounds: FIELD }, this.obstacles);
    this.you.pos = { x: 0, z: FIELD.hd - 1 };
    // the first wave is already up when you arrive
    this.ripen(5);
  }

  start(): void { if (this.state === 'ready') this.state = 'playing'; }
  get ripe(): Plant[] { return this.plants.filter((p) => p.state === 'ripe'); }
  /** the ripe plant within reach of a point (closest) */
  reachable(from: Vec2 = this.you.pos): Plant | null {
    let best: Plant | null = null, bd = PICK_R;
    for (const p of this.plants) { if (p.state !== 'ripe') continue; const d = Math.hypot(p.x - from.x, p.z - from.z); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  /** the closest plant of any state within reach (for "not ripe yet" feedback) */
  nearestAny(from: Vec2 = this.you.pos): Plant | null {
    let best: Plant | null = null, bd = PICK_R;
    for (const p of this.plants) { const d = Math.hypot(p.x - from.x, p.z - from.z); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  private ripen(n: number): void {
    // a wave: a run of neighbours along one row (crops ripen in rows), topped up at random
    const green = this.plants.filter((p) => p.state === 'green');
    if (!green.length) return;
    const seedPlant = green[Math.floor(this.rnd() * green.length)];
    const picks: Plant[] = [];
    const row = this.plants.filter((p) => p.row === seedPlant.row && p.state === 'green').sort((a, b) => Math.abs(a.col - seedPlant.col) - Math.abs(b.col - seedPlant.col));
    for (const p of row) { if (picks.length >= n) break; picks.push(p); }
    for (const p of green) { if (picks.length >= n) break; if (!picks.includes(p) && this.rnd() < 0.5) picks.push(p); }
    for (const p of picks) { p.state = 'ripe'; p.t = 0; p.ripeFor = RIPE_TIME + (this.rnd() - 0.5) * 2; this.events.push({ kind: 'ripe', plant: p }); }
    this.waves++; this.events.push({ kind: 'wave', n: picks.length });
  }
  /** the plant under a tap (within 0.9 m of its stem) */
  plantAt(x: number, z: number): Plant | null { let best: Plant | null = null, bd = 0.9; for (const p of this.plants) { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = p; } } return best; }
  /** tap a spot: walk there (a tapped plant = stand in front of it and pick it when ripe) */
  goTo(x: number, z: number): boolean {
    if (this.state !== 'playing') return false;
    const p = this.plantAt(x, z);
    this.goalPlant = p;
    this.goal = p ? { x: p.x, z: p.z + 0.8 } : { x: Math.max(-FIELD.hw + 0.4, Math.min(FIELD.hw - 0.4, x)), z: Math.max(-FIELD.hd + 0.4, Math.min(FIELD.hd - 0.4, z)) };
    this.stuck = 0;
    return true;
  }
  /** PICK: start picking the ripe plant in reach; a green one is refused */
  pick(): boolean {
    if (this.state !== 'playing' || this.picking > 0) return false;
    const p = this.reachable();
    if (!p) { const any = this.nearestAny(); if (any && any.state === 'green') { this.early++; this.picking = PICK_TIME * 0.7; this.target = null; this.events.push({ kind: 'early', plant: any }); } return false; }
    this.picking = PICK_TIME; this.target = p;
    return true;
  }

  step(dt: number, input: Vec2): void {
    this.events.length = 0;
    if (this.state !== 'playing') return;
    const w = this.clock.step(dt);
    if (w === 'timeup') { this.state = 'done'; this.events.push({ kind: 'timeup' }); return; }
    if (typeof w === 'number') this.events.push({ kind: 'warn', n: w });
    // picking roots you
    if (this.picking > 0) {
      this.picking -= dt; this.you.step(dt, { x: 0, z: 0 });
      if (this.picking <= 0) {
        this.picking = 0;
        const p = this.target; this.target = null;
        if (p && p.state === 'ripe') {
          const fresh = p.t <= FRESH; const value = fresh ? SCORING.fresh : SCORING.ripe;
          p.state = 'picked'; p.t = 0; this.picked++; if (fresh) this.freshPicks++; this.score += value;
          this.events.push({ kind: 'pick', plant: p, value, fresh });
        }
      }
    } else {
      let inp = { x: input.x || 0, z: input.z || 0 };
      if (Math.hypot(inp.x, inp.z) > 0.05) { this.goal = null; this.goalPlant = null; }
      else if (this.goal) {
        const dx = this.goal.x - this.you.pos.x, dz = this.goal.z - this.you.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.3) { const gp = this.goalPlant; this.goal = null; this.goalPlant = null; if (gp && gp.state === 'ripe' && this.reachable() === gp) this.pick(); }
        else { const slow = Math.min(1, d / 1.2 + 0.25); inp = { x: (dx / d) * slow, z: (dz / d) * slow }; }
      }
      this.you.step(dt, inp);
      if (this.goal) { if (this.you.speed < 0.3) { this.stuck += dt; if (this.stuck > 1.2) { this.goal = null; this.goalPlant = null; this.stuck = 0; } } else this.stuck = 0; }
      // arrived next to the tapped plant another way: pick it
      if (this.goalPlant && this.goalPlant.state === 'ripe' && this.reachable() === this.goalPlant && Math.hypot(this.goal!.x - this.you.pos.x, this.goal!.z - this.you.pos.z) < 0.6) { this.goal = null; const gp = this.goalPlant; this.goalPlant = null; if (gp) this.pick(); }
    }
    this.bumpCool -= dt;
    if (this.you.blocked && this.you.speed > 2.2 && this.bumpCool <= 0) { this.bumpCool = 0.6; this.events.push({ kind: 'bump' }); }
    // the plants
    for (const p of this.plants) {
      p.t += dt;
      if (p.state === 'ripe' && p.t > p.ripeFor) { p.state = 'wilted'; p.t = 0; this.wilted++; if (this.target === p) { this.target = null; this.picking = 0; } this.events.push({ kind: 'wilt', plant: p }); }
      else if (p.state === 'picked' && p.t > REGROW[0] + (p.id % 7) / 7 * (REGROW[1] - REGROW[0])) { p.state = 'green'; p.t = 0; this.events.push({ kind: 'regrow', plant: p }); }
      else if (p.state === 'wilted' && p.t > WILT_REST) { p.state = 'green'; p.t = 0; this.events.push({ kind: 'regrow', plant: p }); }
    }
    // waves of ripening, a little quicker and bigger as time goes
    this.waveT -= dt;
    if (this.waveT <= 0) { const k = this.clock.k; this.ripen(4 + Math.floor(k * 2.5) + (this.rnd() < 0.5 ? 1 : 0)); this.waveT = WAVE[0] + this.rnd() * (WAVE[1] - WAVE[0]) - k * 2; }
  }

  place(): number { return tierPlace(this.score, SCORING.tiers); }
  result(): { place: number; score: number; timeMs: number; tier: string; stats: { label: string; value: string }[] } {
    const place = this.place();
    return { place, score: this.score, timeMs: Math.round(this.clock.time * 1000), tier: SCORING.tierNames[place - 1], stats: [{ label: 'Picked', value: String(this.picked) }, { label: 'Fresh picks', value: String(this.freshPicks) }, { label: 'Wilted', value: String(this.wilted) }, { label: 'Too early', value: String(this.early) }] };
  }
}
