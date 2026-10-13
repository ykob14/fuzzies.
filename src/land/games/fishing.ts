/**
 * Fishing Frenzy — RULES only (no DOM, no Three.js): a timing game from the jetty. Cast (aim at a shoal's ripples for a bigger
 * fish), wait, the float dips → hook it inside the bite window (a quick hook is "perfect", ×1.5), then reel: hold while the fish
 * is calm, let go while it thrashes or the line tension climbs and snaps. Minnow 10, perch 20, trout 35, golden carp 80. Two
 * minutes. Checked without a browser by `adv/fishing-check.ts`.
 */
import { Clock, seeded, tierPlace, type Vec2 } from '../arcade';

export type FishKind = 'minnow' | 'perch' | 'trout' | 'carp';
export type Phase = 'idle' | 'casting' | 'waiting' | 'bite' | 'reeling' | 'landed' | 'lost';
export interface Shoal { id: number; x: number; z: number; kind: FishKind; until: number }
export interface FishingEvent { kind: 'cast' | 'ripple' | 'bite' | 'hook' | 'spooked' | 'escaped' | 'snapped' | 'catch' | 'tension' | 'shoal' | 'warn' | 'timeup'; fish?: FishKind; value?: number; perfect?: boolean; shoal?: Shoal; n?: number }

export const SCORING = {
  points: { minnow: 10, perch: 20, trout: 35, carp: 80 } as Record<FishKind, number>,
  perfect: 1.5,
  tiers: [500, 300, 150] as [number, number, number],
  tierNames: ['Fishing legend', 'Keen angler', 'Jetty regular', 'Just the bait'],
};
export const LIMIT = 120;
/** the water: x across, z from the jetty (z = 0) out to `far` (negative z) */
export const LAKE = { hw: 9, near: 2.5, far: 11 };
export const CAST_TIME = 0.7;
export const WAIT: [number, number] = [1.2, 3.4];
export const RIPPLE_LEAD = 0.9;
export const BITE_WINDOW = 0.6;
export const PERFECT = 0.22;
export const SHOAL_R = 1.7;
export const SHOW = 0.8;
/** the fight: seconds of calm reeling needed, calm / thrash phase lengths */
export const FIGHT: Record<FishKind, { energy: number; calm: number; thrash: number }> = {
  minnow: { energy: 1.0, calm: 1.8, thrash: 0.4 }, perch: { energy: 1.7, calm: 1.6, thrash: 0.5 },
  trout: { energy: 2.5, calm: 1.4, thrash: 0.7 }, carp: { energy: 3.4, calm: 1.3, thrash: 0.9 },
};
export const TENSION = { up: 1.35, down: 1.1 };

export class FishingSim {
  readonly clock = new Clock(LIMIT);
  state: 'ready' | 'playing' | 'done' = 'ready';
  phase: Phase = 'idle';
  /** seconds into / left in the current phase (see step) */
  phaseT = 0;
  float: Vec2 = { x: 0, z: -6 };
  fish: FishKind | null = null;
  /** 0 → 1 in the moments before the bite (the float trembles, rings spread) */
  ripple = 0;
  progress = 0; tension = 0; calm = true; perfect = false;
  score = 0; caught = 0; lost = 0; spooked = 0; casts = 0; bestFish: FishKind | null = null;
  count: Record<FishKind, number> = { minnow: 0, perch: 0, trout: 0, carp: 0 };
  shoals: Shoal[] = [];
  events: FishingEvent[] = [];
  private rnd: () => number;
  private waitT = 0; private cycleT = 0; private tensionWarned = false; private nextShoal = 0; private rippled = false;

  constructor(_variant: string | null | undefined, seed = 7) {
    this.rnd = seeded(seed);
    for (let i = 0; i < 3; i++) this.addShoal();
  }
  start(): void { if (this.state === 'ready') this.state = 'playing'; }
  private addShoal(): Shoal {
    const roll = this.rnd();
    const kind: FishKind = roll < 0.08 ? 'carp' : roll < 0.4 ? 'trout' : roll < 0.8 ? 'perch' : 'minnow';
    const s: Shoal = { id: this.nextShoal++, x: (this.rnd() - 0.5) * 2 * (LAKE.hw - 1.5), z: -(LAKE.near + 1 + this.rnd() * (LAKE.far - LAKE.near - 2)), kind, until: this.clock.time + 7 + this.rnd() * 6 };
    this.shoals.push(s); this.events.push({ kind: 'shoal', shoal: s });
    return s;
  }
  /** the shoal a cast would land in, if any */
  shoalAt(x: number, z: number): Shoal | null { let best: Shoal | null = null, bd = SHOAL_R; for (const s of this.shoals) { const d = Math.hypot(s.x - x, s.z - z); if (d < bd) { bd = d; best = s; } } return best; }
  /** cast towards a spot on the water (clamped to the lake) */
  cast(x: number, z: number): boolean {
    if (this.state !== 'playing' || this.phase !== 'idle') return false;
    const tx = Math.max(-LAKE.hw, Math.min(LAKE.hw, x)), tz = Math.max(-LAKE.far, Math.min(-LAKE.near, z));
    this.float = { x: tx, z: tz };
    const shoal = this.shoalAt(tx, tz);
    if (shoal) { this.fish = shoal.kind; this.shoals = this.shoals.filter((s) => s !== shoal); }
    else { const r = this.rnd(); this.fish = r < 0.03 ? 'carp' : r < 0.15 ? 'trout' : r < 0.45 ? 'perch' : 'minnow'; }
    this.casts++;
    this.phase = 'casting'; this.phaseT = CAST_TIME; this.waitT = WAIT[0] + this.rnd() * (WAIT[1] - WAIT[0]);
    this.ripple = 0; this.progress = 0; this.tension = 0; this.calm = true; this.perfect = false; this.cycleT = 0; this.tensionWarned = false; this.rippled = false;
    this.events.push({ kind: 'cast', shoal: shoal ?? undefined });
    return true;
  }
  /** cast without aiming: the nearest shoal, or the middle of the lake */
  castAuto(): boolean { const s = [...this.shoals].sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z))[0]; return s ? this.cast(s.x, s.z) : this.cast(0, -(LAKE.near + LAKE.far) / 2); }
  /** the action press: hook during a bite (too early spooks the fish) */
  press(): boolean {
    if (this.state !== 'playing') return false;
    if (this.phase === 'bite') { this.perfect = this.phaseT <= PERFECT; this.phase = 'reeling'; this.phaseT = 0; this.cycleT = 0; this.calm = true; this.events.push({ kind: 'hook', fish: this.fish!, perfect: this.perfect }); return true; }
    if (this.phase === 'waiting') { this.spooked++; this.phase = 'lost'; this.phaseT = SHOW; this.events.push({ kind: 'spooked', fish: this.fish! }); this.fish = null; return true; }
    return false;
  }

  step(dt: number, hold: boolean): void {
    this.events.length = 0;
    if (this.state !== 'playing') return;
    const w = this.clock.step(dt);
    if (w === 'timeup') { this.state = 'done'; this.events.push({ kind: 'timeup' }); return; }
    if (typeof w === 'number') this.events.push({ kind: 'warn', n: w });
    // shoals come and go
    this.shoals = this.shoals.filter((s) => s.until > this.clock.time);
    while (this.shoals.length < 2 + (this.clock.k > 0.5 ? 1 : 0)) this.addShoal();
    switch (this.phase) {
      case 'casting': this.phaseT -= dt; if (this.phaseT <= 0) { this.phase = 'waiting'; this.phaseT = 0; } break;
      case 'waiting':
        this.waitT -= dt; this.phaseT += dt;
        this.ripple = Math.max(0, Math.min(1, 1 - this.waitT / RIPPLE_LEAD));
        if (this.ripple > 0 && !this.rippled) { this.rippled = true; this.events.push({ kind: 'ripple' }); }
        if (this.waitT <= 0) { this.phase = 'bite'; this.phaseT = 0; this.ripple = 1; this.events.push({ kind: 'bite', fish: this.fish! }); }
        break;
      case 'bite': this.phaseT += dt; if (this.phaseT > BITE_WINDOW) { this.lost++; this.phase = 'lost'; this.phaseT = SHOW; this.events.push({ kind: 'escaped', fish: this.fish! }); this.fish = null; } break;
      case 'reeling': {
        const f = FIGHT[this.fish!];
        this.phaseT += dt; this.cycleT += dt;
        const period = f.calm + f.thrash; const inCycle = this.cycleT % period; this.calm = inCycle < f.calm;
        if (hold) { if (this.calm) { this.progress += dt / f.energy; this.tension = Math.max(0, this.tension - TENSION.down * dt); } else this.tension = Math.min(1, this.tension + TENSION.up * dt); }
        else this.tension = Math.max(0, this.tension - TENSION.down * dt);
        if (this.tension > 0.7 && !this.tensionWarned) { this.tensionWarned = true; this.events.push({ kind: 'tension' }); }
        if (this.tension >= 1) { this.lost++; this.phase = 'lost'; this.phaseT = SHOW; this.events.push({ kind: 'snapped', fish: this.fish! }); this.fish = null; }
        else if (this.progress >= 1) {
          const value = Math.round(SCORING.points[this.fish!] * (this.perfect ? SCORING.perfect : 1));
          this.score += value; this.caught++; this.count[this.fish!]++;
          if (!this.bestFish || SCORING.points[this.fish!] > SCORING.points[this.bestFish]) this.bestFish = this.fish;
          this.events.push({ kind: 'catch', fish: this.fish!, value, perfect: this.perfect });
          this.phase = 'landed'; this.phaseT = SHOW;
        }
        break;
      }
      case 'landed': case 'lost': this.phaseT -= dt; if (this.phaseT <= 0) { this.phase = 'idle'; this.fish = null; this.ripple = 0; this.progress = 0; this.tension = 0; } break;
      default: break;
    }
  }

  place(): number { return tierPlace(this.score, SCORING.tiers); }
  result(): { place: number; score: number; timeMs: number; tier: string; stats: { label: string; value: string }[] } {
    const place = this.place();
    const names: Record<FishKind, string> = { minnow: 'Minnow', perch: 'Perch', trout: 'Trout', carp: 'Golden carp' };
    return { place, score: this.score, timeMs: Math.round(this.clock.time * 1000), tier: SCORING.tierNames[place - 1], stats: [{ label: 'Caught', value: String(this.caught) }, { label: 'Biggest', value: this.bestFish ? names[this.bestFish] : '—' }, { label: 'Got away', value: String(this.lost + this.spooked) }, { label: 'Golden carp', value: String(this.count.carp) }] };
  }
}
