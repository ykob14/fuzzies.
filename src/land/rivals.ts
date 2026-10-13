/**
 * Town rivals for the score mini-games — RULES only (no DOM, no Three.js). Three of your own town's Fuzzies play the same
 * round at the same time: each runs its own copy of the game's rules on the same layout (same seed), driven by a bot for
 * that game (games/bots.ts) at a skill level. By default two play at a medium level and one is really easy (`LINEUP`).
 * The live standings and the final place (1st–4th) come from here; the screen turns the place into coins and the trophy
 * metal like any other result. Checked without a browser by `adv/rivals-check.ts`.
 */
import { seeded } from './arcade';

export type Skill = 'easy' | 'medium';
/** how a skill plays: `think` = seconds between decisions, `miss` = chance a decision is skipped or wrong, `speed` = how hard
 *  it pushes the stick (0–1), `noise` = how far off its aim / steering is (0–1), `react` = extra delay before reacting */
export interface SkillCfg { think: number; miss: number; speed: number; noise: number; react: number }
export const SKILLS: Record<Skill, SkillCfg> = {
  medium: { think: 0.32, miss: 0.16, speed: 0.86, noise: 0.22, react: 0.35 },
  easy: { think: 0.8, miss: 0.42, speed: 0.6, noise: 0.5, react: 0.9 },
};
/** two medium Fuzzies and one really easy one */
export const LINEUP: Skill[] = ['medium', 'medium', 'easy'];

export interface RivalInfo { name: string; skin: [string, string]; index?: number }
/** what a bot can say for one step: a stick direction and / or a held action button */
export interface BotOut { x?: number; z?: number; hold?: boolean }
/** a bot's private state (targets, timers) plus the skill and a seeded random */
export interface BotCtx { skill: SkillCfg; rnd: () => number; t: number; mem: Record<string, unknown> }
export type Bot<S> = (sim: S, ctx: BotCtx, dt: number) => BotOut | void;
/** how the game's `step` takes the bot's output (games differ: a stick, a held button, both, or nothing) */
export type StepKind = 'input' | 'hold' | 'inputHold' | 'none';
export interface Playable { state: string; score: number; start(): void }
/** a game's bot: how it plays, how the game's `step` takes its output, and how often each skill stops to look around
 *  (`lazy` = the share of the round spent idle, in short pauses — the main knob that sets a game's difficulty) */
export interface RivalBot<S> { play: Bot<S>; kind: StepKind; lazy?: Partial<Record<Skill, number>> }

export interface Racer { id: number; name: string; skin: [string, string]; skill: Skill | 'you'; score: number; you: boolean; place: number; index?: number }

export class RivalField<S extends Playable> {
  readonly rivals: { info: RivalInfo; skill: Skill; sim: S; ctx: BotCtx; last: BotOut; lazy: number; idle: number; roll: number }[] = [];
  started = false;
  private readonly bot: Bot<S>;
  private readonly kind: StepKind;
  constructor(infos: RivalInfo[], make: () => S, bot: RivalBot<S>, seed: number, lineup: Skill[] = LINEUP) {
    this.bot = bot.play; this.kind = bot.kind;
    infos.slice(0, lineup.length).forEach((info, i) => {
      const skill = lineup[i];
      this.rivals.push({ info, skill, sim: make(), ctx: { skill: SKILLS[skill], rnd: seeded(seed * 31 + i * 977 + 5), t: 0, mem: {} }, last: {}, lazy: bot.lazy?.[skill] ?? 0, idle: 0, roll: 1.5 + i * 0.7 });
    });
  }
  start(): void { if (this.started) return; this.started = true; for (const r of this.rivals) r.sim.start(); }
  /** one fixed step for every rival (call it right after the player's own step) */
  step(dt: number): void {
    if (!this.started) return;
    for (const r of this.rivals) {
      if (r.sim.state !== 'playing') continue;
      r.ctx.t += dt;
      // little pauses to look around: in each 2–3 s stretch it stands idle for about `lazy` of it
      if (r.ctx.t >= r.roll) { const p = 2 + r.ctx.rnd(); r.roll = r.ctx.t + p; r.idle = r.lazy * p * (0.6 + r.ctx.rnd() * 0.8); }
      let out: BotOut;
      if (r.idle > 0) { r.idle -= dt; out = {}; } else { out = this.bot(r.sim, r.ctx, dt) ?? r.last; r.last = out; }
      const sim = r.sim as unknown as { step: (...a: unknown[]) => void };
      const input = { x: (out.x ?? 0) * r.ctx.skill.speed, z: (out.z ?? 0) * r.ctx.skill.speed };
      if (this.kind === 'input') sim.step(dt, input);
      else if (this.kind === 'hold') sim.step(dt, !!out.hold);
      else if (this.kind === 'inputHold') sim.step(dt, input, !!out.hold);
      else sim.step(dt);
    }
  }
  /** everyone sorted by score (ties: you first, so a tie never costs you a place) */
  standings(you: { score: number; name?: string; skin?: [string, string] }): Racer[] {
    const all: Racer[] = [{ id: 0, name: you.name ?? 'You', skin: you.skin ?? ['#ff9cc0', '#d6336c'], skill: 'you', score: you.score, you: true, place: 0 }];
    this.rivals.forEach((r, i) => all.push({ id: i + 1, name: r.info.name, skin: r.info.skin, skill: r.skill, score: r.sim.score, you: false, place: 0, index: r.info.index }));
    all.sort((a, b) => b.score - a.score || Number(b.you) - Number(a.you));
    all.forEach((r, i) => { r.place = i + 1; });
    return all;
  }
  place(score: number): number { return this.standings({ score }).find((r) => r.you)!.place; }
}
