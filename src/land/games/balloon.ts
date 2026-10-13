/**
 * Balloon Pop — RULES only (no DOM, no Three.js): balloons rise from the town square and drift away over the rooftops; tap them
 * before they're gone. Plain balloons 10, big slow ones 20, shiny fast ones 50; a spiky one breaks your chain. Quick pops in a
 * row grow a multiplier; the square gets busier as the 70 seconds go by (never more than `MAX_LIVE` at once), with a party burst at the end. The view does the
 * picking (what's under a finger) and calls `pop(id)`. Checked without a browser by `adv/balloon-check.ts`.
 */
import { Clock, Combo, seeded, tierPlace } from '../arcade';

export type BalloonKind = 'plain' | 'big' | 'shiny' | 'spiky';
export interface Balloon { id: number; kind: BalloonKind; x: number; y: number; z: number; vy: number; sway: number; phase: number; r: number; color: number; state: 'up' | 'popped' | 'gone' }
export interface BalloonEvent { kind: 'spawn' | 'pop' | 'spiky' | 'gone' | 'combo' | 'comboEnd' | 'burst' | 'warn' | 'timeup'; item?: Balloon; value?: number; mult?: number; n?: number }

export const SCORING = {
  points: { plain: 10, big: 20, shiny: 50, spiky: 0 } as Record<BalloonKind, number>,
  ladder: [{ at: 0, mult: 1 }, { at: 5, mult: 1.5 }, { at: 10, mult: 2 }, { at: 20, mult: 3 }],
  window: 2.5,
  tiers: [2200, 1300, 700] as [number, number, number],
  tierNames: ['Party legend', 'Pop star', 'Party helper', 'Still inflating'],
};
export const LIMIT = 70;
export const SQUARE = { hw: 6.5, hd: 4 };
export const TOP = 8.5;
export const RADIUS: Record<BalloonKind, number> = { plain: 0.42, big: 0.62, shiny: 0.4, spiky: 0.44 };
export const RISE: Record<BalloonKind, [number, number]> = { plain: [1.0, 1.5], big: [0.7, 1.0], shiny: [1.9, 2.4], spiky: [1.1, 1.5] };
export const COLORS = 5;
export const MAX_LIVE = { wide: 9, narrow: 7 };

export class BalloonSim {
  readonly clock = new Clock(LIMIT);
  readonly combo = new Combo(SCORING.window, SCORING.ladder);
  state: 'ready' | 'playing' | 'done' = 'ready';
  score = 0; popped = 0; gone = 0; spikes = 0;
  count: Record<BalloonKind, number> = { plain: 0, big: 0, shiny: 0, spiky: 0 };
  items: Balloon[] = [];
  events: BalloonEvent[] = [];
  private rnd: () => number;
  private nextId = 0;
  private spawnT = 0.5;
  private burstDone = false;

  /** how wide the square is for this screen (phones in portrait see a narrower slice) */
  readonly hw: number;
  /** at most this many balloons in the air at once (fewer on a narrow portrait screen) */
  readonly maxLive: number;
  constructor(_variant: string | null | undefined, seed = 7, hw = SQUARE.hw) { this.rnd = seeded(seed); this.hw = Math.min(SQUARE.hw, hw); this.maxLive = this.hw < 5 ? MAX_LIVE.narrow : MAX_LIVE.wide; }

  start(): void { if (this.state === 'ready') this.state = 'playing'; }
  get k(): number { return this.clock.k; }
  get live(): Balloon[] { return this.items.filter((b) => b.state === 'up'); }

  private spawn(kind?: BalloonKind): Balloon {
    const roll = this.rnd();
    const k: BalloonKind = kind ?? (roll < 0.06 ? 'shiny' : roll < 0.06 + 0.1 + this.k * 0.08 ? 'spiky' : roll < 0.45 ? 'big' : 'plain');
    const [a, b] = RISE[k];
    const item: Balloon = {
      id: this.nextId++, kind: k, x: (this.rnd() - 0.5) * 2 * (this.hw - 0.6), y: -0.3, z: (this.rnd() - 0.5) * 2 * (SQUARE.hd - 0.5),
      vy: a + this.rnd() * (b - a), sway: 0.25 + this.rnd() * 0.45, phase: this.rnd() * 6.28, r: RADIUS[k], color: Math.floor(this.rnd() * COLORS), state: 'up',
    };
    this.items.push(item);
    this.events.push({ kind: 'spawn', item });
    return item;
  }

  /** the view found a balloon under the tap */
  pop(id: number): boolean {
    if (this.state !== 'playing') return false;
    const b = this.items.find((i) => i.id === id);
    if (!b || b.state !== 'up') return false;
    b.state = 'popped';
    if (b.kind === 'spiky') {
      this.spikes++; this.count.spiky++;
      if (this.combo.chain > 0) { this.combo.reset(); this.events.push({ kind: 'comboEnd' }); }
      this.events.push({ kind: 'spiky', item: b });
      return true;
    }
    this.popped++; this.count[b.kind]++;
    const mult = this.combo.hit();
    const value = Math.round(SCORING.points[b.kind] * mult);
    this.score += value;
    this.events.push({ kind: 'pop', item: b, value, mult });
    if (this.combo.chain === this.combo.ladder.find((l) => l.mult === mult && l.at > 0)?.at) this.events.push({ kind: 'combo', mult, n: this.combo.chain });
    return true;
  }
  /** the nearest live balloon within `slop` of a point (helps fat fingers; the view uses it after its own ray test) */
  nearest(x: number, y: number, z: number, slop = 0.9): Balloon | null {
    let best: Balloon | null = null, bd = Infinity;
    for (const b of this.items) { if (b.state !== 'up') continue; const d = Math.hypot(b.x - x, b.y - y, b.z - z) - b.r; if (d < slop && d < bd) { bd = d; best = b; } }
    return best;
  }

  step(dt: number): void {
    this.events.length = 0;
    if (this.state !== 'playing') return;
    const w = this.clock.step(dt);
    if (w === 'timeup') { this.state = 'done'; this.events.push({ kind: 'timeup' }); return; }
    if (typeof w === 'number') this.events.push({ kind: 'warn', n: w });
    if (this.combo.step(dt)) this.events.push({ kind: 'comboEnd' });
    // balloons rise and sway; past the rooftops they're gone
    for (const b of this.items) {
      if (b.state !== 'up') continue;
      b.y += b.vy * dt;
      b.x += Math.sin(this.clock.time * 1.3 + b.phase) * b.sway * dt;
      if (b.y > TOP) { b.state = 'gone'; if (b.kind !== 'spiky') { this.gone++; this.events.push({ kind: 'gone', item: b }); } }
    }
    // the square gets busier: gaps 1.3 s → 0.75 s, but never more than `maxLive` in the air (a phone screen stays readable);
    // a party burst at 45 s may go up to four over
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      const room = this.maxLive - this.live.length;
      if (room <= 0) this.spawnT = 0.2;
      else {
        this.spawn();
        if (room > 1 && this.k > 0.5 && this.rnd() < 0.25) this.spawn();
        this.spawnT = 1.3 - this.k * 0.55 + (this.rnd() - 0.5) * 0.3;
      }
    }
    if (!this.burstDone && this.clock.time >= 45) { this.burstDone = true; const n = Math.min(6, Math.max(3, this.maxLive + 4 - this.live.length)); for (let i = 0; i < n; i++) this.spawn(i === 0 ? 'shiny' : 'plain'); this.events.push({ kind: 'burst' }); }
    if (this.items.length > 90) this.items = this.items.filter((i) => i.state === 'up').concat(this.items.filter((i) => i.state !== 'up').slice(-20));
  }

  place(): number { return tierPlace(this.score, SCORING.tiers); }
  result(): { place: number; score: number; timeMs: number; tier: string; stats: { label: string; value: string }[] } {
    const place = this.place();
    return { place, score: this.score, timeMs: Math.round(this.clock.time * 1000), tier: SCORING.tierNames[place - 1], stats: [{ label: 'Popped', value: String(this.popped) }, { label: 'Shiny', value: String(this.count.shiny) }, { label: 'Floated away', value: String(this.gone) }, { label: 'Best chain', value: `×${this.combo.best}` }] };
  }
}
