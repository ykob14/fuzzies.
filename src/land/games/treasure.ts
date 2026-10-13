/**
 * Island Treasure Hunt — RULES only (no DOM, no Three.js): five chests and six gems are buried on a seeded beach among palms,
 * rocks and a stranded boat; shells lie on the sand. The treasure meter warms as you walk towards buried treasure (hot = dig
 * here), a dig takes a moment and finds whatever is buried within reach — or just makes a hole (time lost, not points). Every
 * chest found ends the hunt with the seconds left as a bonus. Checked without a browser by `adv/treasure-check.ts`.
 */
import { Clock, Mover, seeded, tierPlace, freeSpot, type Obstacle, type Vec2 } from '../arcade';

export const SCORING = {
  chest: 100, gem: 30, shell: 10, timeLeft: 1,
  tiers: [560, 360, 180] as [number, number, number],
  tierNames: ['Treasure legend', 'Map reader', 'Beachcomber', 'Sandy paws'],
};
export const LIMIT = 120;
export const BEACH = { hw: 16, hd: 11 };
export const CHESTS = 5;
export const GEMS = 6;
export const SHELLS = 10;
export const DIG_TIME = 1.2;
export const DIG_R = 1.15;
export const PICK = 0.75;
/** how far the meter feels a chest / a gem */
export const SENSE = { chest: 3.0, gem: 2.0 };
/** the meter reads "warm" from here (the HUD colour); "hot" means a dig here will find something */
export const WARM = 0.5;
export const MOVE = { accel: 30, max: 4.6, friction: 6, turn: 10, radius: 0.34 };

export type Buried = { id: number; kind: 'chest' | 'gem'; x: number; z: number; found: boolean };
export type Shell = { id: number; x: number; z: number; got: boolean };
export type Hole = { x: number; z: number; found: boolean };
export interface TreasureEvent { kind: 'dig' | 'find' | 'miss' | 'shell' | 'done' | 'warn' | 'timeup' | 'hot' | 'bump'; item?: Buried; shell?: Shell; value?: number; n?: number }

export class TreasureSim {
  readonly clock = new Clock(LIMIT);
  readonly obstacles: Obstacle[] = [];
  readonly you: Mover;
  readonly buried: Buried[] = [];
  readonly shells: Shell[] = [];
  readonly holes: Hole[] = [];
  state: 'ready' | 'playing' | 'done' = 'ready';
  score = 0; chests = 0; gems = 0; shellsGot = 0; digs = 0; misses = 0; bonus = 0; allFound = false;
  /** the treasure meter 0–1 and whether it's warming or cooling */
  heat = 0; trend = 0;
  /** seconds left in the current dig (0 = not digging) */
  digging = 0;
  private digAt: Vec2 = { x: 0, z: 0 };
  events: TreasureEvent[] = [];
  private rnd: () => number;
  private wasHot = false; private bumpCool = 0;

  constructor(_variant: string | null | undefined, seed = 7) {
    this.rnd = seeded(seed);
    // the beach furniture: palms, rocks, a boat
    const start = { x: 0, z: BEACH.hd - 1.5 };
    const furniture = (r: number, inset: number) => { for (let tries = 0; tries < 40; tries++) { const x = (this.rnd() - 0.5) * 2 * (BEACH.hw - inset), z = (this.rnd() - 0.5) * 2 * (BEACH.hd - inset); if (Math.hypot(x - start.x, z - start.z) < 2.5 + r) continue; if (this.obstacles.some((o) => o.kind === 'circle' && Math.hypot(o.x - x, o.z - z) < o.r + r + 1.2)) continue; this.obstacles.push({ kind: 'circle', x, z, r }); return; } };
    for (let i = 0; i < 12; i++) furniture(0.5, 1.5);
    for (let i = 0; i < 9; i++) furniture(0.45 + this.rnd() * 0.5, 1);
    this.obstacles.push({ kind: 'box', x: -BEACH.hw + 3, z: BEACH.hd - 2, hw: 1.6, hd: 0.8 });
    this.you = new Mover({ ...MOVE, bounds: BEACH }, this.obstacles);
    this.you.pos = { ...start };
    // buried treasure: spread out, clear of furniture and of the start
    const taken: Vec2[] = [this.you.pos];
    const spot = (minGap: number): Vec2 => {
      for (let tries = 0; tries < 400; tries++) {
        const p = { x: (this.rnd() - 0.5) * 2 * (BEACH.hw - 1.2), z: (this.rnd() - 0.5) * 2 * (BEACH.hd - 1.2) };
        if (!freeSpot(p, this.obstacles, 0.9)) continue;
        if (taken.some((t) => Math.hypot(t.x - p.x, t.z - p.z) < minGap)) continue;
        taken.push(p); return p;
      }
      const p = { x: 0, z: 0 }; taken.push(p); return p;
    };
    for (let i = 0; i < CHESTS; i++) { const p = spot(5); this.buried.push({ id: this.buried.length, kind: 'chest', x: p.x, z: p.z, found: false }); }
    for (let i = 0; i < GEMS; i++) { const p = spot(3); this.buried.push({ id: this.buried.length, kind: 'gem', x: p.x, z: p.z, found: false }); }
    for (let i = 0; i < SHELLS; i++) { const p = spot(1.5); this.shells.push({ id: i, x: p.x, z: p.z, got: false }); }
  }

  start(): void { if (this.state === 'ready') this.state = 'playing'; }
  get left(): Buried[] { return this.buried.filter((b) => !b.found); }
  /** the meter at a point: the warmest buried thing nearby */
  heatAt(x: number, z: number): number {
    let h = 0;
    for (const b of this.buried) { if (b.found) continue; const d = Math.hypot(b.x - x, b.z - z); const s = SENSE[b.kind]; h = Math.max(h, Math.exp(-(d * d) / (s * s))); }
    return h;
  }
  /** true when a dig right here finds something (the meter glows) */
  get hot(): boolean { const r = DIG_R * 0.9; return this.buried.some((b) => !b.found && Math.hypot(b.x - this.you.pos.x, b.z - this.you.pos.z) < r); }
  get warm(): boolean { return this.heat >= WARM; }
  /** start a dig where you stand (ignored while already digging) */
  dig(): boolean {
    if (this.state !== 'playing' || this.digging > 0) return false;
    this.digging = DIG_TIME; this.digAt = { ...this.you.pos }; this.digs++;
    this.events.push({ kind: 'dig' });
    return true;
  }

  step(dt: number, input: Vec2): void {
    this.events.length = 0;
    if (this.state !== 'playing') return;
    const w = this.clock.step(dt);
    if (w === 'timeup') { this.state = 'done'; this.events.push({ kind: 'timeup' }); return; }
    if (typeof w === 'number') this.events.push({ kind: 'warn', n: w });
    // digging roots you to the spot
    if (this.digging > 0) {
      this.digging -= dt; this.you.step(dt, { x: 0, z: 0 });
      if (this.digging <= 0) {
        this.digging = 0;
        let best: Buried | null = null, bd = DIG_R;
        for (const b of this.buried) { if (b.found) continue; const d = Math.hypot(b.x - this.digAt.x, b.z - this.digAt.z); if (d < bd) { bd = d; best = b; } }
        if (best) {
          best.found = true;
          const value = best.kind === 'chest' ? SCORING.chest : SCORING.gem; this.score += value;
          if (best.kind === 'chest') this.chests++; else this.gems++;
          this.holes.push({ x: this.digAt.x, z: this.digAt.z, found: true });
          this.events.push({ kind: 'find', item: best, value, n: this.chests });
          if (this.chests >= CHESTS) { this.allFound = true; this.bonus = Math.round(this.clock.left * SCORING.timeLeft); this.score += this.bonus; this.state = 'done'; this.events.push({ kind: 'done', value: this.bonus }); return; }
        } else { this.misses++; this.holes.push({ x: this.digAt.x, z: this.digAt.z, found: false }); this.events.push({ kind: 'miss' }); }
      }
    } else {
      this.you.step(dt, { x: input.x || 0, z: input.z || 0 });
    }
    this.bumpCool -= dt;
    if (this.you.blocked && this.you.speed > 2.2 && this.bumpCool <= 0) { this.bumpCool = 0.6; this.events.push({ kind: 'bump' }); }
    // the meter
    const h = this.heatAt(this.you.pos.x, this.you.pos.z);
    this.trend = h - this.heat; this.heat = h;
    const hotNow = this.hot;
    if (hotNow && !this.wasHot) this.events.push({ kind: 'hot' });
    this.wasHot = hotNow;
    // shells on the sand
    for (const s of this.shells) {
      if (s.got) continue;
      if (Math.hypot(s.x - this.you.pos.x, s.z - this.you.pos.z) < PICK) { s.got = true; this.shellsGot++; this.score += SCORING.shell; this.events.push({ kind: 'shell', shell: s, value: SCORING.shell }); }
    }
  }

  place(): number { return tierPlace(this.score, SCORING.tiers); }
  result(): { place: number; score: number; timeMs: number; tier: string; stats: { label: string; value: string }[] } {
    const place = this.place();
    return { place, score: this.score, timeMs: Math.round(this.clock.time * 1000), tier: SCORING.tierNames[place - 1], stats: [{ label: 'Chests', value: `${this.chests}/${CHESTS}` }, { label: 'Gems', value: `${this.gems}/${GEMS}` }, { label: 'Shells', value: `${this.shellsGot}/${SHELLS}` }, { label: this.allFound ? 'Time bonus' : 'Empty holes', value: this.allFound ? `+${this.bonus}` : String(this.misses) }] };
  }
}
