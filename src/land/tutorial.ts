/**
 * Fuzzies Land first-time tutorial — the TutorialManager. Rules only: which step you're on, what counts as finishing it,
 * rewards and saving. No DOM here (the speech bubble, highlight and arrow live in ui/landTutorial.ts).
 *
 * Steps advance only on real gameplay events (`emit('placed', …)` from the Land screen), never on timers. The state lives in
 * the town (`LandState.tutorial`), so it is saved, synced and resumes after a restart. The player can skip a step or the whole
 * tutorial at any time, and nothing in the game is ever locked while it runs.
 */
import { ITEMS, type LandState } from './rules';

export type TutorialEvent =
  | 'continue' | 'pan' | 'zoom' | 'placed' | 'moved' | 'plant' | 'harvest' | 'collect' | 'order' | 'sell' | 'shopTab';
export interface EventData { item?: string; tab?: string }

export interface TutorialState {
  status: 'active' | 'done' | 'skipped' | 'off';
  step: number;
  /** progress inside a step (e.g. "panned" and "zoomed"), cleared when the step changes */
  got: string[];
  /** steps already rewarded (a replay never pays twice) */
  paid: string[];
}

export interface Reward { coins?: number; xp?: number; fuzzies?: number }
export interface StepDef {
  id: string;
  title: string;
  /** one or two short sentences */
  text: string;
  /** a small checklist for steps with more than one thing to do */
  checks?: { key: string; label: string }[];
  /** true when this event (with its data) counts towards the step; returns the check key it ticks */
  on: (e: TutorialEvent, d: EventData) => string | boolean;
  reward?: Reward;
  /** optional steps show "Skip this step" */
  optional?: boolean;
  /** the step is finished by tapping the bubble's button (welcome / finale only) */
  button?: string;
  /** coins the player needs to do it: topped up for free if short, so the tutorial can never get stuck */
  needsCoins?: number;
}

const kindOf = (id?: string) => ITEMS.find((i) => i.id === id)?.kind;

export const STEPS: StepDef[] = [
  { id: 'welcome', title: 'Welcome to Fuzzies Land!', text: 'Hi, I’m Pip! This is your very own island town. Let me show you around — it only takes a few minutes.', button: 'Let’s go!', on: (e) => e === 'continue' },
  { id: 'camera', title: 'Look around', text: 'Drag to move around the island, and pinch or scroll to zoom.', checks: [{ key: 'pan', label: 'Drag the map' }, { key: 'zoom', label: 'Zoom in or out' }],
    on: (e) => (e === 'pan' || e === 'zoom' ? e : false), reward: { coins: 10 } },
  { id: 'home', title: 'Build your first home', text: 'Tap Build, choose the Fuzzy Cottage and put it on the grass.', needsCoins: 40,
    on: (e, d) => e === 'placed' && kindOf(d.item) === 'house', reward: { coins: 30, xp: 5 } },
  { id: 'move', title: 'Move a building', text: 'Tap any building, then Move (or press and hold it). Drag it somewhere new and put it down.',
    on: (e) => e === 'moved', reward: { coins: 10 }, optional: true },
  { id: 'road', title: 'Make a road', text: 'In Build → Decor, pick a Road and drag across the grass to lay it.', needsCoins: 10,
    on: (e, d) => e === 'placed' && (d.item === 'road' || d.item === 'path'), reward: { coins: 15 }, optional: true },
  { id: 'crops', title: 'Plant and harvest', text: 'Tap a field and plant Sunwheat. When a field is golden, tap it to harvest.', needsCoins: 5,
    checks: [{ key: 'plant', label: 'Plant a crop' }, { key: 'harvest', label: 'Harvest a crop' }],
    on: (e) => (e === 'plant' || e === 'harvest' ? e : false), reward: { coins: 20, xp: 5 } },
  { id: 'collect', title: 'Collect what’s ready', text: 'When something is ready, tap it — or use the Collect button — to bring it in.',
    on: (e) => e === 'collect' || e === 'harvest', reward: { coins: 10 } },
  { id: 'order', title: 'Complete an order', text: 'Open Orders and deliver one. Fuzzies pay you coins and XP for the goods they need.',
    on: (e) => e === 'order', reward: { xp: 10 } },
  { id: 'coins', title: 'Earn coins', text: 'Coins are your town money. Open the Barn and sell something to earn a few more.',
    on: (e) => e === 'sell' || e === 'order', reward: { coins: 15 }, optional: true },
  { id: 'shop', title: 'Explore the shop', text: 'Open Build and peek at two different tabs to see what you can make.', checks: [{ key: 'tab1', label: 'Open the shop' }, { key: 'tab2', label: 'Try another tab' }],
    on: () => false, reward: { coins: 10 } },
  { id: 'decor', title: 'Decorate your town', text: 'Pick a tree or flowers in Build → Decor and place it somewhere pretty.', needsCoins: 25,
    on: (e, d) => e === 'placed' && kindOf(d.item) === 'decor' && d.item !== 'road' && d.item !== 'path', reward: { coins: 20, xp: 5 } },
  { id: 'next', title: 'You’re all set!', text: 'Next goal: reach level 2 to unlock the Bakery. Keep growing, delivering and building — have fun!', button: 'Start playing', on: (e) => e === 'continue', reward: { fuzzies: 10, coins: 50 } },
];

export const freshTutorial = (status: TutorialState['status'] = 'active'): TutorialState => ({ status, step: 0, got: [], paid: [] });

/**
 * Has this town been played yet? New towns get the tutorial automatically; towns from before the tutorial existed keep
 * playing undisturbed (it can be started any time from Settings → Help).
 */
export function tutorialFor(s: LandState): TutorialState {
  if (s.tutorial && typeof s.tutorial.step === 'number') {
    const t = s.tutorial;
    return { status: t.status, step: Math.max(0, Math.min(STEPS.length - 1, t.step | 0)), got: Array.isArray(t.got) ? t.got : [], paid: Array.isArray(t.paid) ? t.paid : [] };
  }
  const played = s.stats.built > 0 || s.stats.harvests > 0 || s.stats.orders > 0 || s.level > 1;
  return freshTutorial(played ? 'off' : 'active');
}

type Listener = (ev: { type: 'step' | 'progress' | 'complete' | 'finished' | 'skipped'; step: StepDef; reward?: Reward }) => void;

export class TutorialManager {
  state: TutorialState;
  private listeners = new Set<Listener>();
  private tabs = new Set<string>();

  /** `save` is called whenever progress changes (the Land screen saves the town). */
  constructor(land: LandState, private grant: (r: Reward, why: string) => void, private save: () => void) {
    this.state = tutorialFor(land);
    land.tutorial = this.state;
  }

  get active(): boolean { return this.state.status === 'active'; }
  get step(): StepDef { return STEPS[this.state.step]; }
  get index(): number { return this.state.step; }
  get total(): number { return STEPS.length; }
  has(key: string): boolean { return this.state.got.includes(key); }

  on(fn: Listener): () => void { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private fire(type: Parameters<Listener>[0]['type'], reward?: Reward): void { for (const f of this.listeners) f({ type, step: this.step, reward }); }

  /** A real gameplay event happened. Advances only when it completes the current step. */
  emit(e: TutorialEvent, d: EventData = {}): void {
    if (!this.active) return;
    const st = this.step;
    let hit: string | boolean;
    if (st.id === 'shop') {
      if (e !== 'shopTab' || !d.tab) return;
      this.tabs.add(d.tab);
      hit = this.tabs.size >= 2 ? 'tab2' : 'tab1';
      if (hit === 'tab2' && !this.has('tab1')) this.state.got.push('tab1');
    } else hit = st.on(e, d);
    if (!hit) return;
    if (typeof hit === 'string' && st.checks) {
      if (this.has(hit)) return;
      this.state.got.push(hit);
      if (!st.checks.every((c) => this.has(c.key))) { this.save(); this.fire('progress'); return; }
    }
    this.complete();
  }

  private complete(): void {
    const st = this.step;
    let reward: Reward | undefined;
    if (st.reward && !this.state.paid.includes(st.id)) { reward = st.reward; this.state.paid.push(st.id); this.grant(st.reward, `Tutorial: ${st.title}`); }
    this.fire('complete', reward);
    this.advance();
  }

  private advance(): void {
    this.tabs.clear();
    this.state.got = [];
    if (this.state.step >= STEPS.length - 1) { this.state.status = 'done'; this.save(); this.fire('finished'); return; }
    this.state.step++;
    this.save();
    this.fire('step');
  }

  /** Skip just this step (optional steps), without its reward. */
  skipStep(): void { if (this.active) { this.fire('skipped'); this.advance(); } }
  /** Stop the tutorial (it can be replayed from Settings → Help). */
  skipAll(): void { if (!this.active) return; this.state.status = 'skipped'; this.save(); this.fire('finished'); }
  /** Start again from the beginning (rewards already earned aren't paid twice). */
  restart(): void { this.state.status = 'active'; this.state.step = 0; this.state.got = []; this.tabs.clear(); this.save(); this.fire('step'); }
  /** Coins the current step needs that the player doesn't have (given for free so nobody gets stuck). */
  coinsShort(coins: number): number { const need = this.step.needsCoins ?? 0; return this.active && coins < need ? need - coins : 0; }
}
